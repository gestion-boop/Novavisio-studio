/* Proxy authentifié : les traductions sont réalisées par le service NovaGen existant. */
export const config={maxDuration:60};
const LANGS=new Set(['en','es','de','nl']);
const SB=(process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/$/,'');
const KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée.'});
 try{
  const bearer=/^Bearer\s+(\S+)$/i.exec(req.headers.authorization||'');
  if(!bearer||!SB||!KEY)return res.status(401).json({error:'Connectez-vous au Cloud avant de traduire.'});
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(!body||!LANGS.has(body.lang)||typeof body.projectId!=='string'||!/^[0-9a-f-]{36}$/i.test(body.projectId)||!Array.isArray(body.items)||!body.items.length||body.items.length>20||body.items.some(x=>!x||typeof x.id!=='string'||x.id.length>150||typeof x.text!=='string'||!x.text.trim()||x.text.length>8000)||JSON.stringify(body).length>26000)return res.status(400).json({error:'Demande de traduction invalide.'});
  const auth={Authorization:'Bearer '+bearer[1],apikey:KEY};
  const [user,project]=await Promise.all([
   fetch(SB+'/auth/v1/user',{headers:auth,signal:AbortSignal.timeout(8000)}),
   fetch(SB+'/rest/v1/nvstudio_projects?id=eq.'+encodeURIComponent(body.projectId)+'&select=id',{headers:auth,signal:AbortSignal.timeout(8000)})
  ]);
  if(!user.ok)return res.status(401).json({error:'Session expirée : reconnectez-vous au Cloud.'});
  if(!project.ok||!(await project.json()).length)return res.status(403).json({error:'Ouvrez ce projet depuis votre Cloud pour le traduire.'});
  const upstream=await fetch('https://novagen-olive.vercel.app/api/studio-translate',{
   method:'POST',headers:{Authorization:'Bearer '+bearer[1],'x-novastudio-key':KEY,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(55000)
  });
  const data=await upstream.json().catch(()=>({}));
  if(!upstream.ok)return res.status(502).json({error:'Service de traduction momentanément indisponible. Réessayez plus tard.'});
  if(!Array.isArray(data.items)||data.items.length!==body.items.length)throw Error('invalid translation');
  const values=new Map(data.items.map(x=>[x?.id,x?.text]));
  if(values.size!==body.items.length||body.items.some(x=>typeof values.get(x.id)!=='string'||!values.get(x.id).trim()||values.get(x.id).length>8000))throw Error('invalid translation');
  return res.status(200).json({items:body.items.map(x=>({id:x.id,text:values.get(x.id)}))});
 }catch{return res.status(502).json({error:'Traduction indisponible. Vérifiez votre connexion et réessayez.'});}
}
