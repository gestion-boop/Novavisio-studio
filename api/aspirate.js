/* Aspirateur de site Internet : lit le site d'un établissement (accueil + quelques pages utiles) et renvoie
 * coordonnées, réseaux sociaux, horaires, photos et logos, au même format que /api/novagen (mode « search »).
 * Réservé au compte administrateur NovaStudio ; adresses privées refusées ; pages ≤ 1,5 Mo ; 6 pages au plus.
 * Accepte aussi les pages sociales publiques et les fichiers HTML fournis par l’utilisateur.
 */
import {verifyAdmin,safeFetch} from './_net.js';
import {crawlSite} from './_aspirate.js';
import {analyzeSiteBrand,collectStylesheetUrls} from '../shared/siteBrandCore.js';
const MAX_CSS_BYTES=300*1024;
export const config={maxDuration:60};
const MAX_BYTES=1.5*1024*1024;

const normalizeSite=(raw)=>{
  let v=String(raw||'').trim().slice(0,2048);
  if(!v)return '';
  if(!/^https?:\/\//i.test(v))v='https://'+v;
  try{const u=new URL(v);return u.hostname.includes('.')?u.href:'';}catch{return '';}
};

async function fetchPage(url,sink){
  const {response,finalUrl}=await safeFetch(url,{accept:'text/html,application/xhtml+xml',timeout:9000,allowHttp:true});
  if(!response.ok)throw new Error('HTTP '+response.status);
  const type=(response.headers.get('content-type')||'').toLowerCase();
  if(type&&!/text\/html|application\/xhtml/.test(type))throw new Error('pas une page web');
  if(Number(response.headers.get('content-length')||0)>MAX_BYTES)throw new Error('page trop volumineuse');
  const buffer=Buffer.from(await response.arrayBuffer());
  if(buffer.length>MAX_BYTES)throw new Error('page trop volumineuse');
  const html=buffer.toString('utf8');
  sink.push(html);
  return {html,finalUrl};
}

/* Identité graphique : feuilles de style des premières pages (300 Ko au plus chacune, 3 au plus). Échecs ignorés. */
async function fetchStylesheets(html,baseUrl){
  let css='';
  for(const href of collectStylesheetUrls(html,baseUrl,3)){
    try{
      const {response}=await safeFetch(href,{accept:'text/css,*/*;q=0.1',timeout:6000,allowHttp:true});
      if(!response.ok)continue;
      const buf=Buffer.from(await response.arrayBuffer());
      if(buf.length<=MAX_CSS_BYTES)css+='\n'+buf.toString('utf8');
    }catch{/* feuille illisible : on continue */}
  }
  return css;
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée.'});
  try{
    if(!await verifyAdmin(req))return res.status(403).json({error:'L’aspirateur est réservé au compte administrateur NovaStudio.'});
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
    const site=normalizeSite(body?.site);
    const uploaded=typeof body?.html==='string'?body.html:null;
    if(uploaded!==null&&(!uploaded.trim()||Buffer.byteLength(uploaded)>MAX_BYTES)){
      return res.status(400).json({error:'Choisis un fichier HTML non vide de 1,5 Mo maximum.'});
    }
    if(!site&&uploaded===null)return res.status(400).json({error:'Renseigne l’adresse du site Internet de l’établissement.'});
    const pageHtml=[];
    if(body?.site&&!site)return res.status(400).json({error:'Adresse web invalide.'});
    const social=site&&/(^|\.)(facebook\.com|fb\.com|instagram\.com)$/.test(new URL(site).hostname);
    const result=await crawlSite(site,async (url)=>{
      if(uploaded===null)return fetchPage(url,pageHtml);
      pageHtml.push(uploaded);
      return {html:uploaded,finalUrl:url};
    },{maxPages:social||uploaded!==null?1:6,maxPhotos:60,followLinks:!social&&uploaded===null});
    if(!result.ok)return res.status(502).json({error:'Site inaccessible : '+(result.notes[0]||'aucune réponse')+'.'});
    if(social&&uploaded===null&&!result.photos.length&&!result.logos.length&&!result.videos.length){
      return res.status(422).json({error:'Cette page sociale ne fournit aucun média public accessible. Essaie le site du client ou un fichier HTML.'});
    }
    let brand=null;
    try{
      const css=pageHtml[0]&&site&&!social?await fetchStylesheets(pageHtml[0],result.pages[0]||site):'';
      if(!social||uploaded!==null)brand=analyzeSiteBrand(pageHtml.join('\n'),css);
    }catch{brand=null;}
    return res.status(200).json({fiche:result.fiche,photos:result.photos,logos:result.logos,videos:result.videos,notes:result.notes,pages:result.pages,brand});
  }catch(err){
    const timeout=err?.name==='TimeoutError'||err?.name==='AbortError';
    return res.status(timeout?504:500).json({error:timeout?'Le site met trop de temps à répondre.':'Erreur de lecture du site : '+String(err?.message||'inconnue').slice(0,200)});
  }
}
