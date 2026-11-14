import {getVercelOidcToken} from '@vercel/oidc';
export const config={maxDuration:60};
const LANGS={en:'anglais',es:'espagnol',de:'allemand',nl:'néerlandais'};
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée.'});
  try{
    const bearer=/^Bearer\s+(\S+)$/i.exec(req.headers.authorization||'');
    const sb=(process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/$/,'');
    const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
    if(!bearer||!sb||!key)return res.status(401).json({error:'Connectez-vous au Cloud avant de traduire.'});
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
    if(!body||!LANGS[body.lang]||typeof body.projectId!=='string'||!/^[0-9a-f-]{36}$/i.test(body.projectId)||!Array.isArray(body.items)||!body.items.length||body.items.length>20||body.items.some(x=>!x||typeof x.id!=='string'||x.id.length>150||typeof x.text!=='string'||!x.text.trim()||x.text.length>8000)||JSON.stringify(body).length>26000)
      return res.status(400).json({error:'Demande de traduction invalide.'});
    const auth={Authorization:'Bearer '+bearer[1],apikey:key};
    const user=await fetch(sb+'/auth/v1/user',{headers:auth,signal:AbortSignal.timeout(10000)});
    if(!user.ok)return res.status(401).json({error:'Session expirée : reconnectez-vous au Cloud.'});
    const project=await fetch(sb+'/rest/v1/nvstudio_projects?id=eq.'+encodeURIComponent(body.projectId)+'&select=id',{headers:auth,signal:AbortSignal.timeout(10000)});
    if(!project.ok||!(await project.json()).length)return res.status(403).json({error:'Ouvrez ce projet depuis votre Cloud pour le traduire.'});
    const token=process.env.AI_GATEWAY_API_KEY||await getVercelOidcToken();
    const response=await fetch('https://ai-gateway.vercel.sh/v1/chat/completions',{
      method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},signal:AbortSignal.timeout(50000),
      body:JSON.stringify({model:'openai/gpt-4.1-mini',temperature:0.2,response_format:{type:'json_object'},messages:[
        {role:'system',content:'Tu es traducteur professionnel de visites virtuelles. Traduis du français vers '+LANGS[body.lang]+'. Conserve les noms propres, marques, adresses, numéros, horaires, unités et URL exactement. Ne rajoute aucune information. Préserve la mise en forme et les retours à la ligne. Chaque élément est indépendant. Renvoie uniquement un objet JSON {"items":[{"id":"...","text":"..."}]} avec exactement les mêmes identifiants et aucun élément manquant.'},
        {role:'user',content:JSON.stringify({items:body.items})}
      ]})
    });
    if(!response.ok){const err=await response.json().catch(()=>({}));const code=err?.error?.code||'';return res.status(502).json({error:/verification|payment|funds|quota/i.test(code)?'Le service de traduction doit être activé ou son crédit vérifié dans Vercel.':'Service de traduction indisponible. Réessayez plus tard.'});}
    const result=await response.json();const content=result?.choices?.[0]?.message?.content;
    const parsed=JSON.parse(typeof content==='string'?content:'');
    if(!Array.isArray(parsed.items)||parsed.items.length!==body.items.length)throw Error('invalid translation');
    const map=new Map(parsed.items.map(x=>[x?.id,x?.text]));
    if(map.size!==body.items.length||body.items.some(x=>typeof map.get(x.id)!=='string'||!map.get(x.id).trim()||map.get(x.id).length>8000))throw Error('invalid translation');
    return res.status(200).json({items:body.items.map(x=>({id:x.id,text:map.get(x.id)}))});
  }catch{return res.status(502).json({error:'Traduction indisponible. Vérifiez la configuration du service et réessayez.'});}
}
