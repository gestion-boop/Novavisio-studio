/* Aspirateur de site Internet : lit le site d'un établissement (accueil + quelques pages utiles) et renvoie
 * coordonnées, réseaux sociaux, horaires, photos et logos, au même format que /api/novagen (mode « search »).
 * Réservé au compte administrateur NovaStudio ; adresses privées refusées ; pages ≤ 1,5 Mo ; 6 pages au plus.
 * Ne lit jamais Facebook ni Instagram (pages privées) : leurs liens sont seulement repérés sur le site.
 */
import {verifyAdmin,safeFetch} from './_net.js';
import {crawlSite} from './_aspirate.js';
export const config={maxDuration:60};
const MAX_BYTES=1.5*1024*1024;

const normalizeSite=(raw)=>{
  let v=String(raw||'').trim().slice(0,2048);
  if(!v)return '';
  if(!/^https?:\/\//i.test(v))v='https://'+v;
  try{const u=new URL(v);return u.hostname.includes('.')?u.href:'';}catch{return '';}
};

async function fetchPage(url){
  const {response,finalUrl}=await safeFetch(url,{accept:'text/html,application/xhtml+xml',timeout:9000,allowHttp:true});
  if(!response.ok)throw new Error('HTTP '+response.status);
  const type=(response.headers.get('content-type')||'').toLowerCase();
  if(type&&!/text\/html|application\/xhtml/.test(type))throw new Error('pas une page web');
  if(Number(response.headers.get('content-length')||0)>MAX_BYTES)throw new Error('page trop volumineuse');
  const buffer=Buffer.from(await response.arrayBuffer());
  if(buffer.length>MAX_BYTES)throw new Error('page trop volumineuse');
  return {html:buffer.toString('utf8'),finalUrl};
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée.'});
  try{
    if(!await verifyAdmin(req))return res.status(403).json({error:'L’aspirateur est réservé au compte administrateur NovaStudio.'});
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
    const site=normalizeSite(body?.site);
    if(!site)return res.status(400).json({error:'Renseigne l’adresse du site Internet de l’établissement.'});
    const result=await crawlSite(site,fetchPage,{maxPages:6,maxPhotos:60});
    if(!result.ok)return res.status(502).json({error:'Site inaccessible : '+(result.notes[0]||'aucune réponse')+'.'});
    return res.status(200).json({fiche:result.fiche,photos:result.photos,logos:result.logos,notes:result.notes,pages:result.pages});
  }catch(err){
    const timeout=err?.name==='TimeoutError'||err?.name==='AbortError';
    return res.status(timeout?504:500).json({error:timeout?'Le site met trop de temps à répondre.':'Erreur de lecture du site : '+String(err?.message||'inconnue').slice(0,200)});
  }
}
