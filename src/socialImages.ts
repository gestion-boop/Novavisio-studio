import {cloudConfigured,supabase} from './cloud';

export type FoundImage={src:string;source:string;kind:'photo'|'logo'};
const web=(u?:string)=>{try{const x=new URL(u||'');return x.protocol==='https:'?x.href:'';}catch{return '';}};

/** Cherche des images publiques (aperçus de liens) sur le site, la page Facebook et le profil Instagram de l'établissement. */
export async function fetchSocialImages(targets:{label:string;url?:string}[]):Promise<{found:FoundImage[];notes:string[]}>{
  if(!cloudConfigured)throw Error('Cloud non configuré');
  const {data}=await supabase().auth.getSession();
  const token=data.session?.access_token;
  if(!token)throw Error('Connexion Cloud requise');
  const found:FoundImage[]=[],notes:string[]=[];
  await Promise.all(targets.map(async t=>{
    const url=web(t.url);
    if(!url)return;
    try{
      const r=await fetch('/api/novagen-og?url='+encodeURIComponent(url),{headers:{authorization:'Bearer '+token},cache:'no-store'});
      const body=await r.json().catch(()=>({})) as {images?:{url:string;kind:'photo'|'logo'}[];note?:string;error?:string};
      if(!r.ok)throw Error(body.error||'Erreur '+r.status);
      for(const i of body.images||[])if(!found.some(f=>f.src===i.url))found.push({src:i.url,source:t.label,kind:i.kind});
      if(!(body.images||[]).length)notes.push(t.label+' : '+(body.note||'aucune image trouvée'));
    }catch(e){notes.push(t.label+' : '+(e instanceof Error?e.message:String(e)));}
  }));
  return {found,notes};
}
