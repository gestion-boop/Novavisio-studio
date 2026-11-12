/* Proxy d'images pour la recherche d'établissements (logo / photos trouvés sur le web).
 * Sert à lire les pixels d'un logo (palette de couleurs) malgré l'absence de CORS chez le site d'origine.
 * Réservé au compte administrateur NovaStudio ; https uniquement ; adresses privées refusées ; images ≤ 5 Mo.
 */
import {lookup} from 'node:dns/promises';
import net from 'node:net';
export const config={maxDuration:30};
const SB_URL=(process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/+$/,'');
const SB_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
const AUTHORIZED_OWNER=process.env.NOVAGEN_DIRECTORY_OWNER_ID||'';
const MAX_BYTES=5*1024*1024;
const TYPES=new Set(['image/png','image/jpeg','image/webp','image/gif']);

async function verifyUser(token){
  if(!SB_URL||!SB_KEY||!AUTHORIZED_OWNER)return false;
  const result=await fetch(SB_URL+'/auth/v1/user',{headers:{Authorization:'Bearer '+token,apikey:SB_KEY,accept:'application/json'},signal:AbortSignal.timeout(9000)});
  if(!result.ok)return false;
  const u=await result.json().catch(()=>null);
  return !!u?.id&&u.id===AUTHORIZED_OWNER;
}
const privateIp=(ip)=>{
  if(net.isIPv6(ip)){const v=ip.toLowerCase();return v==='::1'||v==='::'||v.startsWith('fc')||v.startsWith('fd')||v.startsWith('fe80')||v.startsWith('::ffff:');}
  const p=ip.split('.').map(Number);
  return p[0]===10||p[0]===127||p[0]===0||(p[0]===169&&p[1]===254)||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168)||(p[0]===100&&p[1]>=64&&p[1]<=127)||p[0]>=224;
};
async function assertPublic(raw){
  const u=new URL(raw);
  if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443'))throw new Error('Adresse refusée');
  const host=u.hostname.toLowerCase().replace(/\.$/,'');
  if(!host.includes('.')||host==='localhost'||host.endsWith('.local')||host.endsWith('.internal')||net.isIP(host))throw new Error('Adresse refusée');
  const addresses=await lookup(host,{all:true});
  if(!addresses.length||addresses.some(a=>privateIp(a.address)))throw new Error('Adresse refusée');
  return u;
}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({error:'Méthode non autorisée.'});
  try{
    const match=/^Bearer\s+(\S+)$/i.exec(String(req.headers.authorization||'').slice(0,5000));
    if(!match||!await verifyUser(match[1]))return res.status(403).json({error:'Réservé au compte administrateur NovaStudio.'});
    let url=String(req.query?.url||'');
    if(!url||url.length>2048)return res.status(400).json({error:'Adresse manquante.'});
    let response;
    for(let hop=0;hop<4;hop++){
      const target=await assertPublic(url);
      response=await fetch(target.href,{redirect:'manual',headers:{accept:'image/*','user-agent':'NovaStudio/1.0'},signal:AbortSignal.timeout(12000)});
      if(response.status>=300&&response.status<400&&response.headers.get('location')){url=new URL(response.headers.get('location'),target).href;continue;}
      break;
    }
    if(!response||!response.ok)return res.status(502).json({error:'Image inaccessible.'});
    const type=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
    if(!TYPES.has(type))return res.status(415).json({error:'Format d’image non pris en charge.'});
    const declared=Number(response.headers.get('content-length')||0);
    if(declared>MAX_BYTES)return res.status(413).json({error:'Image trop volumineuse.'});
    const buffer=Buffer.from(await response.arrayBuffer());
    if(buffer.length>MAX_BYTES)return res.status(413).json({error:'Image trop volumineuse.'});
    res.setHeader('Content-Type',type);res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Cache-Control','private, max-age=3600');
    return res.status(200).send(buffer);
  }catch(e){
    return res.status(400).json({error:'Image refusée ou inaccessible.'});
  }
}
