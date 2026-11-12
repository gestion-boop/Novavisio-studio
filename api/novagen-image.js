/* Proxy d'images pour la recherche d'établissements (logo / photos trouvés sur le web).
 * Sert à lire les pixels d'un logo (palette de couleurs) malgré l'absence de CORS chez le site d'origine.
 * Réservé au compte administrateur NovaStudio ; https uniquement ; adresses privées refusées ; images ≤ 5 Mo.
 */
import {verifyAdmin,safeFetch} from './_net.js';
export const config={maxDuration:30};
const MAX_BYTES=5*1024*1024;
const TYPES=new Set(['image/png','image/jpeg','image/webp','image/gif']);
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({error:'Méthode non autorisée.'});
  try{
    if(!await verifyAdmin(req))return res.status(403).json({error:'Réservé au compte administrateur NovaStudio.'});
    const url=String(req.query?.url||'');
    if(!url||url.length>2048)return res.status(400).json({error:'Adresse manquante.'});
    const {response}=await safeFetch(url,{accept:'image/*'});
    if(!response.ok)return res.status(502).json({error:'Image inaccessible.'});
    const type=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
    if(!TYPES.has(type))return res.status(415).json({error:'Format d’image non pris en charge.'});
    if(Number(response.headers.get('content-length')||0)>MAX_BYTES)return res.status(413).json({error:'Image trop volumineuse.'});
    const buffer=Buffer.from(await response.arrayBuffer());
    if(buffer.length>MAX_BYTES)return res.status(413).json({error:'Image trop volumineuse.'});
    res.setHeader('Content-Type',type);res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Cache-Control','private, max-age=3600');
    return res.status(200).send(buffer);
  }catch{
    return res.status(400).json({error:'Image refusée ou inaccessible.'});
  }
}
