/* Lecture d'un plan d'étage par IA : pièces avec le nom et la superficie imprimés sur le plan, et leur position (en %).
 * Réservé aux comptes connectés NovaStudio. La clé ANTHROPIC_API_KEY reste côté serveur (variable d'environnement Vercel).
 * Ne devine rien : une superficie absente du plan reste vide.
 */
export const config={maxDuration:60};
const SB_URL=(process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/+$/,'');
const SB_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
const MODEL=process.env.PLAN_READ_MODEL||'claude-sonnet-5-5';
const MAX_BASE64=7*1024*1024;
const TYPES=new Set(['image/png','image/jpeg','image/webp','image/gif']);

async function verifyUser(req){
  const match=/^Bearer\s+(\S+)$/i.exec(String(req.headers.authorization||'').slice(0,5000));
  if(!match||!SB_URL||!SB_KEY)return false;
  const r=await fetch(SB_URL+'/auth/v1/user',{headers:{Authorization:'Bearer '+match[1],apikey:SB_KEY,accept:'application/json'},signal:AbortSignal.timeout(9000)});
  if(!r.ok)return false;
  const u=await r.json().catch(()=>null);
  return !!u?.id;
}

const PROMPT=`Tu lis un plan d'étage (appartement, maison ou local). Réponds UNIQUEMENT par un objet JSON, sans texte autour :
{"rooms":[{"label":"Séjour","surfaceM2":24.5,"x":42,"y":55}],"entrance":{"x":50,"y":90}}
Règles :
- "rooms" : chaque pièce dont le NOM est écrit sur le plan (séjour, cuisine, chambre 1, SDB, WC, terrasse…), tel qu'écrit.
- "surfaceM2" : la superficie en m² SEULEMENT si elle est imprimée sur le plan pour cette pièce ; sinon null. Ne calcule jamais, n'estime jamais.
- "x" et "y" : centre de la pièce, en pourcentage de la largeur et de la hauteur de l'image (0 à 100).
- "entrance" : emplacement de la porte d'entrée si elle est identifiable, sinon null.
- Si le plan ne contient aucune pièce lisible, renvoie {"rooms":[],"entrance":null}.`;

const num=(v,lo,hi)=>{const n=Number(v);return Number.isFinite(n)&&n>=lo&&n<=hi?n:null;};

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée.'});
  try{
    if(!process.env.ANTHROPIC_API_KEY)return res.status(503).json({error:'Clé ANTHROPIC_API_KEY absente : à ajouter dans les variables d’environnement Vercel.'});
    if(!await verifyUser(req))return res.status(403).json({error:'Connecte-toi au cloud NovaStudio pour utiliser la lecture du plan.'});
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
    const m=/^data:(image\/[a-z+]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(body?.image||''));
    if(!m||!TYPES.has(m[1]))return res.status(400).json({error:'Image du plan invalide (PNG, JPEG ou WebP).'});
    if(m[2].length>MAX_BASE64)return res.status(413).json({error:'Image du plan trop volumineuse.'});
    const r=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'content-type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({model:MODEL,max_tokens:2000,messages:[{role:'user',content:[
        {type:'image',source:{type:'base64',media_type:m[1],data:m[2]}},{type:'text',text:PROMPT}]}]}),
      signal:AbortSignal.timeout(55000),
    });
    if(!r.ok)return res.status(502).json({error:'Lecture du plan indisponible ('+r.status+').'});
    const data=await r.json();
    const text=(data?.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
    const json=/\{[\s\S]*\}/.exec(text);
    const parsed=json?JSON.parse(json[0]):{};
    const rooms=(Array.isArray(parsed.rooms)?parsed.rooms:[]).slice(0,60).map(o=>({
      label:String(o?.label||'').trim().slice(0,80),
      surfaceM2:num(o?.surfaceM2,0.5,100000),
      x:num(o?.x,0,100),y:num(o?.y,0,100),
    })).filter(o=>o.label&&o.x!==null&&o.y!==null);
    const e=parsed.entrance;
    const entrance=e&&num(e.x,0,100)!==null&&num(e.y,0,100)!==null?{x:num(e.x,0,100),y:num(e.y,0,100)}:null;
    return res.status(200).json({rooms,entrance});
  }catch{
    return res.status(500).json({error:'Lecture du plan impossible. Réessaie avec une image plus nette.'});
  }
}
