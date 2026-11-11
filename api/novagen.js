/* NovaGen → NovaStudio. Same-origin, authenticated server proxy.
 * No Anthropic or NovaGen secret is ever sent to the browser.
 * Only approved discovery modes are exposed, never TTS/storage/deploy.
 */
export const config={maxDuration:60};
const BASE=(process.env.NOVAGEN_BACKEND_URL||'https://novagen-olive.vercel.app/api/fiche').replace(/\/+$/,'');
const SB_URL=(process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/+$/,'');
const SB_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
const allowed=new Set(['suggest','suggest_web','search']);
const trim=(s,max=180)=>typeof s==='string'?s.trim().slice(0,max):'';
const safePublicUrl=(raw)=>{
  if(!raw||typeof raw!=='string'||raw.length>2048)return '';
  try{
    const u=new URL(raw);
    if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return '';
    const host=u.hostname.toLowerCase().replace(/\.$/,'');
    if(!host.includes('.')||host==='localhost'||host.endsWith('.localhost')||
      host.endsWith('.local')||host.endsWith('.internal')||
      /^\d+\.\d+\.\d+\.\d+$/.test(host)||host.includes(':'))return '';
    return u.href;
  }catch{return '';}
};
const cleanSuggestions=(list)=>Array.isArray(list)?list.slice(0,10).map(item=>({
  nom:trim(item?.nom,160),adresse:trim(item?.adresse,300),ville:trim(item?.ville,100),
  type:trim(item?.type,40),site:safePublicUrl(item?.site),
  tel:trim(item?.tel,80),facebook:safePublicUrl(item?.facebook),
  instagram:safePublicUrl(item?.instagram)
})).filter(x=>x.nom||x.adresse):[];

async function verifyUser(token){
  if(!SB_URL||!SB_KEY)return false;
  const result=await fetch(SB_URL+'/auth/v1/user',{
    headers:{Authorization:'Bearer '+token,apikey:SB_KEY,accept:'application/json'},
    signal:AbortSignal.timeout(9000)
  });
  if(!result.ok)return false;
  const u=await result.json().catch(()=>null);
  return !!u?.id;
}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée.'});
  try{
    const auth=trim(req.headers.authorization||'',5000);
    const match=/^Bearer\s+(\S+)$/i.exec(auth);
    if(!match||!await verifyUser(match[1]))
      return res.status(401).json({error:'Connecte-toi au Cloud NovaStudio pour utiliser l’aspirateur NovaGen.'});
    let body=typeof req.body==='string'?JSON.parse(req.body):req.body;
    if(!body||typeof body!=='object'||JSON.stringify(body).length>14000||
       !allowed.has(body.mode))
      return res.status(400).json({error:'Requête NovaGen invalide.'});
    const mode=body.mode;
    const input=mode==='search'?{
      mode,nom:trim(body.nom,160),ville:trim(body.ville,100),
      type:trim(body.type,40),adresse:trim(body.adresse,300),tel:trim(body.tel,40),
      site:safePublicUrl(body.site),facebook:safePublicUrl(body.facebook),
      instagram:safePublicUrl(body.instagram),autres:'',
      pageText:'',pageImages:[]
    }:{
      mode,q:trim(body.q,200),ville:trim(body.ville,100)
    };
    if(mode==='search'&&!input.nom&&!input.site)
      return res.status(400).json({error:'Renseigne le nom ou le site de l’établissement.'});
    if(mode!=='search'&&input.q.length<3)
      return res.status(400).json({error:'Saisis au moins trois caractères.'});
    // The backend URL is server-owned; users cannot override it.
    const upstream=await fetch(BASE,{
      method:'POST',headers:{
        'content-type':'application/json',
        ...(process.env.NOVAGEN_APP_PASSWORD?{'x-pass':process.env.NOVAGEN_APP_PASSWORD}:{})
      },
      body:JSON.stringify(input),signal:AbortSignal.timeout(52000)
    });
    const payload=await upstream.json().catch(()=>({}));
    if(!upstream.ok)
      return res.status(upstream.status===401?502:502).json({
        error:'NovaGen : '+trim(payload?.error||'Service momentanément indisponible.',350)
      });
    if(mode!=='search')return res.status(200).json({resultats:cleanSuggestions(payload?.resultats)});
    const raw=payload?.fiche&&typeof payload.fiche==='object'?payload.fiche:{};
    const desc=raw.description;
    const asFrench=x=>trim(typeof x==='string'?x:(x&&typeof x==='object'?x.fr:''),4000);
    const fiche={
      nom:trim(raw.nom,160),type:trim(raw.type,40),adresse:trim(raw.adresse,300),
      ville:trim(raw.ville,100),tel:trim(raw.tel,80),email:trim(raw.email,200),
      site:safePublicUrl(raw.site),facebook:safePublicUrl(raw.facebook),
      instagram:safePublicUrl(raw.instagram),
      booking:safePublicUrl(raw.reservation_url||raw.booking),
      description:asFrench(desc),
      horaires:Array.isArray(raw.horaires)?raw.horaires.slice(0,7).map(x=>trim(x,180)):[],
      services:Array.isArray(raw.services)?raw.services.slice(0,30).map(asFrench).filter(Boolean):[]
    };
    const uniqueUrls=(urls,count)=>[...new Set((Array.isArray(urls)?urls:[]).map(safePublicUrl).filter(Boolean))].slice(0,count);
    return res.status(200).json({
      fiche,photos:uniqueUrls(payload?.photos,24),logos:uniqueUrls(payload?.logos,8),
      notes:(Array.isArray(raw.notes)?raw.notes:Array.isArray(payload?.notes)?payload.notes:[])
        .map(n=>trim(n,250)).filter(Boolean).slice(0,12)
    });
  }catch(err){
    const isTimeout=err?.name==='TimeoutError'||err?.name==='AbortError';
    return res.status(isTimeout?504:500).json({
      error:isTimeout?'NovaGen met trop de temps à répondre. Réessaie ou précise le site internet.':
        'Erreur de recherche NovaGen : '+trim(err?.message||'inconnue',260)
    });
  }
}
