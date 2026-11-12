/* Images publiques d'une page (site, Facebook, Instagram…) : balises « aperçu de lien » (Open Graph / Twitter) et icônes.
 * C'est ce que lisent les messageries pour afficher un aperçu. Aucune connexion, aucun contournement :
 * si le réseau social exige une connexion, il ne renvoie simplement pas d'image.
 * Réservé au compte administrateur ; https uniquement ; adresses privées refusées.
 */
import {verifyAdmin,safeFetch} from './_net.js';
export const config={maxDuration:30};
const MAX_HTML=1_500_000;
const decode=(s)=>String(s||'').replace(/&amp;/g,'&').replace(/&#38;/g,'&').replace(/&quot;/g,'"').replace(/&#x2F;/g,'/').replace(/&#39;/g,"'").trim();
const attr=(tag,name)=>{const m=new RegExp('\\b'+name+'\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s>]+))','i').exec(tag);return m?decode(m[2]??m[3]??m[4]):'';};
const absolute=(raw,base)=>{try{const u=new URL(decode(raw),base);return u.protocol==='https:'&&u.href.length<=2048&&!u.username&&!u.password?u.href:'';}catch{return '';}};
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({error:'Méthode non autorisée.'});
  try{
    if(!await verifyAdmin(req))return res.status(403).json({error:'Réservé au compte administrateur NovaStudio.'});
    const url=String(req.query?.url||'');
    if(!url||url.length>2048)return res.status(400).json({error:'Adresse manquante.'});
    const {response,finalUrl}=await safeFetch(url,{accept:'text/html,application/xhtml+xml',timeout:12000});
    if(!response.ok)return res.status(200).json({images:[],note:'Page inaccessible ('+response.status+').'});
    const type=(response.headers.get('content-type')||'').toLowerCase();
    if(!type.includes('html'))return res.status(200).json({images:[],note:'La page n’est pas au format HTML.'});
    const html=(await response.text()).slice(0,MAX_HTML);
    const images=[];
    const add=(raw,kind)=>{const src=absolute(raw,finalUrl);if(src&&!/\.svg(\?|$)/i.test(src)&&!images.some(i=>i.url===src))images.push({url:src,kind});};
    for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){
      const key=(attr(tag,'property')||attr(tag,'name')).toLowerCase();
      if(['og:image','og:image:url','og:image:secure_url','twitter:image','twitter:image:src'].includes(key))add(attr(tag,'content'),'photo');
    }
    for(const tag of html.match(/<link\b[^>]*>/gi)||[]){
      const rel=attr(tag,'rel').toLowerCase();
      if(rel.includes('apple-touch-icon')||rel==='icon'||rel==='shortcut icon')add(attr(tag,'href'),'logo');
    }
    // Photos du site lui-même : quelques grandes images de la page (hors icônes, pixels de suivi et SVG).
    if(!/(facebook|instagram|fb)\./i.test(new URL(finalUrl).hostname)){
      let count=0;
      for(const tag of html.match(/<img\b[^>]*>/gi)||[]){
        if(count>=8)break;
        const src=attr(tag,'src')||attr(tag,'data-src');
        if(!src||/logo|icon|sprite|pixel|tracking|avatar|\.gif(\?|$)/i.test(src))continue;
        const w=Number(attr(tag,'width')||0),h=Number(attr(tag,'height')||0);
        if((w&&w<300)||(h&&h<200))continue;
        const before=images.length;add(src,'photo');if(images.length>before)count++;
      }
    }
    return res.status(200).json({images:images.slice(0,14),host:new URL(finalUrl).hostname,
      note:images.length?'':'Aucune image publique n’est accessible sur cette page (certains réseaux exigent une connexion).'});
  }catch{
    return res.status(200).json({images:[],note:'Page refusée ou inaccessible.'});
  }
}
