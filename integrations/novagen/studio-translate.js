/* Traduction NovaStudio : authentification Supabase et accès au projet vérifiés avant tout appel IA. */
const LANGS={en:'anglais',es:'espagnol',de:'allemand',nl:'néerlandais'};
const SB='https://osgookvqxxvpnasvtjhl.supabase.co';
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée.'});
 try{
  const match=/^Bearer\s+(\S+)$/i.exec(req.headers.authorization||'');
  const key=req.headers['x-novastudio-key'];
  if(!match||typeof key!=='string'||!key||key.length>1000||/^sb_secret_|service_role/i.test(key))return res.status(401).json({error:'Connexion au Cloud requise.'});
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(!body||!Object.hasOwn(LANGS,body.lang)||typeof body.projectId!=='string'||!/^[0-9a-f-]{36}$/i.test(body.projectId)||!Array.isArray(body.items)||!body.items.length||body.items.length>20||body.items.some(x=>!x||typeof x.id!=='string'||x.id.length>150||typeof x.text!=='string'||!x.text.trim()||x.text.length>8000)||JSON.stringify(body).length>26000)return res.status(400).json({error:'Demande de traduction invalide.'});
  const headers={Authorization:'Bearer '+match[1],apikey:key};
  const [user,project]=await Promise.all([
   fetch(SB+'/auth/v1/user',{headers,signal:AbortSignal.timeout(7000)}),
   fetch(SB+'/rest/v1/nvstudio_projects?id=eq.'+encodeURIComponent(body.projectId)+'&select=id',{headers,signal:AbortSignal.timeout(7000)})
  ]);
  if(!user.ok)return res.status(401).json({error:'Session expirée : reconnectez-vous au Cloud.'});
  if(!project.ok||!(await project.json()).length)return res.status(403).json({error:'Accès au projet refusé.'});
  if(!process.env.ANTHROPIC_API_KEY)return res.status(503).json({error:'Service de traduction non configuré.'});
  const upstream=await fetch('https://api.anthropic.com/v1/messages',{
   method:'POST',headers:{'x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01','content-type':'application/json'},signal:AbortSignal.timeout(40000),
   body:JSON.stringify({model:process.env.CLAUDE_MODEL||'claude-sonnet-5-5',max_tokens:8192,temperature:0.2,
    system:'Tu es traducteur professionnel de visites virtuelles. Traduis du français vers '+LANGS[body.lang]+'. Conserve les noms propres, marques, adresses, numéros, horaires, unités et URL exactement. Ne rajoute aucune information. Préserve la mise en forme et les retours à la ligne. Chaque élément est indépendant. Renvoie uniquement un objet JSON {"items":[{"id":"...","text":"..."}]} avec exactement les mêmes identifiants et aucun élément manquant.',
    messages:[{role:'user',content:JSON.stringify({items:body.items})}]})
  });
  if(!upstream.ok)return res.status(502).json({error:'Service de traduction momentanément indisponible.'});
  const data=await upstream.json();const content=(data.content??[]).filter(x=>x.type==='text').map(x=>x.text).join('\n');
  const start=content.indexOf('{'),end=content.lastIndexOf('}');if(start<0||end<0)throw Error('invalid translation');
  const parsed=JSON.parse(content.slice(start,end+1));
  if(!Array.isArray(parsed.items)||parsed.items.length!==body.items.length)throw Error('invalid translation');
  const map=new Map(parsed.items.map(x=>[x?.id,x?.text]));
  if(map.size!==body.items.length||body.items.some(x=>typeof map.get(x.id)!=='string'||!map.get(x.id).trim()||map.get(x.id).length>8000))throw Error('invalid translation');
  return res.status(200).json({items:body.items.map(x=>({id:x.id,text:map.get(x.id)}))});
 }catch{return res.status(502).json({error:'Traduction indisponible. Réessayez plus tard.'});}
};
