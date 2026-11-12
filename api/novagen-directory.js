/* Directory-only bridge between two independent applications.
 * Read-only. Requires a live NovaStudio Supabase session AND the exact
 * authorized owner ID configured on Vercel as NOVAGEN_DIRECTORY_OWNER_ID.
 * Never returns service keys. Does not update either database.
 */
export const config={maxDuration:60};
const STUDIO_URL=(process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/+$/,'');
const STUDIO_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
const OWNER_ID=process.env.NOVAGEN_DIRECTORY_OWNER_ID||'';
const STORE='https://novagen-olive.vercel.app/api/store';
const trim=(x,n=250)=>typeof x==='string'?x.trim().slice(0,n):'';
const itemString=(x)=>trim(typeof x==='string'?x:x&&typeof x==='object'?x.fr:'',1500);
const safeImg=(u)=>{try{const v=new URL(u);return v.protocol==='https:'&&v.username===''&&v.password===''?v.href:'';}catch{return '';}};
const okId=(s)=>typeof s==='string'&&/^[A-Za-z0-9_-]{3,60}$/.test(s);
const getBearer=(h)=>{const m=/^Bearer\s+(\S+)$/i.exec(h||'');return m?.[1]||'';};
async function verify(req){
  if(!OWNER_ID||!STUDIO_URL||!STUDIO_KEY)return false;
  const bearer=getBearer(req.headers.authorization);
  if(!bearer)return false;
  const u=await fetch(STUDIO_URL+'/auth/v1/user',{
    headers:{apikey:STUDIO_KEY,Authorization:'Bearer '+bearer},
    signal:AbortSignal.timeout(8500)
  });
  if(!u.ok)return false;
  const data=await u.json().catch(()=>({}));
  return data.id===OWNER_ID;
}
async function store(body){
  const r=await fetch(STORE,{
    method:'POST',headers:{
      'content-type':'application/json',
      ...(process.env.NOVAGEN_APP_PASSWORD?{'x-pass':process.env.NOVAGEN_APP_PASSWORD}:{})
    },body:JSON.stringify(body),signal:AbortSignal.timeout(22000)
  });
  const result=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(r.status===401?'Connexion NovaGen non autorisée.':
    trim(result.error||'Réponse du stockage NovaGen indisponible.',350));
  return result;
}
// NovaGen stores final client videos in adVids, with files under <client>/pv/.
// Playback URLs expire after one hour: they are generated only on demand.
function videoMetadata(row){
  const data=row.row?.data||{};
  return (Array.isArray(data.adVids)?data.adVids:[]).filter(v=>v&&okId(v.id)).slice(0,100).map(v=>({
    id:v.id,name:trim(v.name,160)||'Vidéo NovaGen',
    size:Number.isFinite(v.size)&&v.size>0?v.size:0,
    date:Number.isFinite(v.date)?v.date:0
  }));
}
function normal(row){
  const d=row.row?.data||{};
  const f=d.fiche&&typeof d.fiche==='object'?d.fiche:{};
  const links=d.links&&typeof d.links==='object'?d.links:{};
  const name=trim(f.nom||links.nom||d.name||'Établissement sans nom',200);
  const photos=Array.isArray(d.photos)?d.photos:[];
  const urls=row.urls||{};
  const str=(...v)=>trim(v.find(x=>typeof x==='string'&&x.trim()),4000);
  const profile={
    novagenId:trim(d.id||row.row.id,60),
    name,category:str(f.type,links.type),
    address:str(f.adresse,links.adresse),city:str(f.ville,links.ville),
    phone:str(f.tel,links.tel),email:str(f.email),
    website:str(f.site,links.site),facebook:str(f.facebook,links.facebook),
    instagram:str(f.instagram,links.instagram),otherLinks:str(links.autres),
    description:itemString(f.description),
    bookingUrl:str(f.booking,f.reservation_url),
    openingHours:Array.isArray(f.horaires)?f.horaires.map(x=>trim(x,160)).join(' · ').slice(0,4000):'',
    services:Array.isArray(f.services)?f.services.map(itemString).filter(Boolean).join(', ').slice(0,4000):'',
  };
  const logoUrl=safeImg(urls['logo.png']);
  const photoUrls=photos.slice(0,12).map(p=>safeImg(urls['p/'+p.id+'.jpg'])).filter(Boolean);
  const notes=Array.isArray(d.notes)?d.notes.slice(0,12).map(x=>trim(typeof x==='string'?x:x?.t,260)).filter(Boolean):[];
  return {id:row.row.id,profile,logoUrl,photoUrls,notes,
    photoCount:photos.length,hasLogo:!!d.logo,videoCount:videoMetadata(row).length,
    updatedAt:row.row.updated_at||'',source:'novagen'};
}
export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée.'});
  try{
    if(!await verify(req))return res.status(403).json({error:'Connecte-toi avec le compte administrateur NovaStudio pour voir le répertoire NovaGen.'});
    const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
    if(!['list','detail','videos'].includes(b.mode))return res.status(400).json({error:'Mode inconnu.'});
    if(b.mode==='detail'||b.mode==='videos'){
      if(!okId(b.id))return res.status(400).json({error:'Identifiant client incorrect.'});
      const result=await store({mode:'get',id:b.id});
      if(result.row?.deleted_at)return res.status(404).json({error:'Cette fiche NovaGen a été supprimée.'});
      if(b.mode==='videos'){
        const videos=videoMetadata(result);
        const signed=videos.length?await store({mode:'dl',id:b.id,names:videos.map(v=>'pv/'+v.id+'.mp4')}):{urls:{}};
        return res.status(200).json({videos:videos.map(v=>({...v,url:safeImg(signed.urls?.['pv/'+v.id+'.mp4'])}))});
      }
      return res.status(200).json({client:normal(result)});
    }
    const items=(await store({mode:'list'})).items||[];
    const live=items.filter(x=>!x.deleted_at&&okId(x.id));
    const offset=Math.min(1000,Math.max(0,Number(b.offset)||0));
    const limit=18;
    const chunk=live.slice(offset,offset+limit);
    let cursor=0;
    const results=Array(chunk.length).fill(null);
    await Promise.all(Array.from({length:Math.min(4,chunk.length)},async()=>{
      while(cursor<chunk.length){
        const pos=cursor++;
        try{results[pos]=normal(await store({mode:'get',id:chunk[pos].id}));}
        catch(e){results[pos]={id:chunk[pos].id,profile:{
          novagenId:chunk[pos].id,name:'Fiche indisponible',category:'',
          address:'',city:'',phone:'',email:'',website:'',facebook:'',
          instagram:'',otherLinks:'',description:''},
          logoUrl:'',photoUrls:[],notes:[trim(String(e.message),160)],
          photoCount:0,updatedAt:chunk[pos].updated_at,source:'novagen',unavailable:true};}
      }
    }));
    return res.status(200).json({
      clients:results.filter(Boolean),total:live.length,
      nextOffset:offset+chunk.length<live.length?offset+chunk.length:null,
      truncated:items.length>=1000
    });
  }catch(e){
    return res.status(e?.name==='TimeoutError'?504:502).json({
      error:'Répertoire NovaGen indisponible : '+trim(e?.message||'Erreur serveur.',300)
    });
  }
}
