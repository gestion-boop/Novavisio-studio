/* FreeLLMAPI → NovaStudio. Proxy serveur authentifié (compte administrateur uniquement).
 * La clé unifiée FreeLLMAPI reste côté serveur, jamais envoyée au navigateur.
 * Variables Vercel : FREELLM_BASE_URL (ex. https://llm.mondomaine.fr/v1), FREELLM_API_KEY, FREELLM_MODEL (défaut « auto »).
 */
import {verifyAdmin} from './_net.js';
export const config={maxDuration:60};
const BASE=(process.env.FREELLM_BASE_URL||'').replace(/\/+$/,'');
const KEY=process.env.FREELLM_API_KEY||'';
const MODEL=process.env.FREELLM_MODEL||'auto';
const LANGS={en:'anglais',es:'espagnol',de:'allemand',nl:'néerlandais'};
const trim=(s,max)=>typeof s==='string'?s.trim().slice(0,max):'';

function parseJson(raw){
  const text=String(raw||'').replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim();
  try{return JSON.parse(text);}catch{}
  const m=text.match(/\{[\s\S]*\}/);
  if(m){try{return JSON.parse(m[0]);}catch{}}
  return null;
}

async function chat(messages){
  const upstream=await fetch(BASE+'/chat/completions',{
    method:'POST',
    headers:{'content-type':'application/json',authorization:'Bearer '+KEY},
    body:JSON.stringify({model:MODEL,messages,temperature:0.2}),
    signal:AbortSignal.timeout(52000)
  });
  const payload=await upstream.json().catch(()=>({}));
  if(!upstream.ok)throw Object.assign(new Error(trim(payload?.error?.message||payload?.error||'Service momentanément indisponible.',300)),{upstream:true});
  return {content:payload?.choices?.[0]?.message?.content||'',provider:payload?.x_freellm_provider||payload?.provider||'',model:payload?.model||''};
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée.'});
  if(!BASE||!KEY)return res.status(503).json({error:'FreeLLMAPI n’est pas configuré (FREELLM_BASE_URL / FREELLM_API_KEY).'});
  try{
    if(!await verifyAdmin(req))return res.status(403).json({error:'L’IA est réservée au compte administrateur NovaStudio.'});
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
    if(!body||typeof body!=='object'||JSON.stringify(body).length>20000)return res.status(400).json({error:'Requête invalide.'});

    if(body.mode==='translate'){
      const max=Math.min(Math.max(Number(body.maxLength)||200,20),8000);
      const text=trim(body.text,max);
      if(!text)return res.status(400).json({error:'Écris d’abord le texte en français.'});
      const targets=(Array.isArray(body.langs)?body.langs:Object.keys(LANGS)).filter(l=>LANGS[l]);
      if(!targets.length)return res.status(400).json({error:'Aucune langue demandée.'});
      const shape='{'+targets.map(l=>`"${l}":"…"`).join(',')+'}';
      const {content,provider,model}=await chat([
        {role:'system',content:'Tu es traducteur professionnel pour des visites virtuelles 360° (tourisme, hébergement, commerce). Tu traduis fidèlement depuis le français, ton naturel et commercial, sans rien ajouter. Conserve les sauts de ligne, noms propres, adresses, numéros et URL. Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour.'},
        {role:'user',content:`Traduis ce texte en ${targets.map(l=>LANGS[l]).join(', ')}. Format exact : ${shape}\n\nTexte :\n${text}`}
      ]);
      const data=parseJson(content);
      if(!data||typeof data!=='object')return res.status(502).json({error:'Réponse de l’IA illisible. Réessaie.'});
      const translations={};
      for(const l of targets){const t=trim(data[l],max);if(t)translations[l]=t;}
      if(!Object.keys(translations).length)return res.status(502).json({error:'Aucune traduction reçue. Réessaie.'});
      return res.status(200).json({translations,provider,model});
    }

    return res.status(400).json({error:'Mode inconnu.'});
  }catch(err){
    const isTimeout=err?.name==='TimeoutError'||err?.name==='AbortError';
    return res.status(isTimeout?504:502).json({
      error:isTimeout?'FreeLLMAPI met trop de temps à répondre. Réessaie.':'FreeLLMAPI : '+trim(err?.message||'erreur inconnue',300)
    });
  }
}
