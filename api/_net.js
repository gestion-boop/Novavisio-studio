/* Aides communes aux fonctions /api/novagen-* : vérification du compte administrateur et protection contre les adresses privées (SSRF). */
import {lookup} from 'node:dns/promises';
import net from 'node:net';
const SB_URL=(process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/+$/,'');
const SB_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
const AUTHORIZED_OWNER=process.env.NOVAGEN_DIRECTORY_OWNER_ID||'';

export async function verifyAdmin(req){
  const match=/^Bearer\s+(\S+)$/i.exec(String(req.headers.authorization||'').slice(0,5000));
  if(!match||!SB_URL||!SB_KEY||!AUTHORIZED_OWNER)return false;
  const result=await fetch(SB_URL+'/auth/v1/user',{headers:{Authorization:'Bearer '+match[1],apikey:SB_KEY,accept:'application/json'},signal:AbortSignal.timeout(9000)});
  if(!result.ok)return false;
  const u=await result.json().catch(()=>null);
  return !!u?.id&&u.id===AUTHORIZED_OWNER;
}
export const privateIp=(ip)=>{
  if(net.isIPv6(ip)){const v=ip.toLowerCase();return v==='::1'||v==='::'||v.startsWith('fc')||v.startsWith('fd')||v.startsWith('fe80')||v.startsWith('::ffff:');}
  const p=ip.split('.').map(Number);
  return p[0]===10||p[0]===127||p[0]===0||(p[0]===169&&p[1]===254)||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168)||(p[0]===100&&p[1]>=64&&p[1]<=127)||p[0]>=224;
};
export async function assertPublic(raw){
  const u=new URL(raw);
  if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443'))throw new Error('Adresse refusée');
  const host=u.hostname.toLowerCase().replace(/\.$/,'');
  if(!host.includes('.')||host==='localhost'||host.endsWith('.local')||host.endsWith('.internal')||net.isIP(host))throw new Error('Adresse refusée');
  const addresses=await lookup(host,{all:true});
  if(!addresses.length||addresses.some(a=>privateIp(a.address)))throw new Error('Adresse refusée');
  return u;
}
/** GET suivant au plus 3 redirections, chacune revérifiée. */
export async function safeFetch(url,{accept,timeout=12000}={}){
  let current=url,response;
  for(let hop=0;hop<4;hop++){
    const target=await assertPublic(current);
    response=await fetch(target.href,{redirect:'manual',headers:{accept:accept||'*/*','user-agent':'NovaStudio/1.0 (aperçu de lien)'},signal:AbortSignal.timeout(timeout)});
    if(response.status>=300&&response.status<400&&response.headers.get('location')){current=new URL(response.headers.get('location'),target).href;continue;}
    return {response,finalUrl:target.href};
  }
  throw new Error('Trop de redirections');
}
