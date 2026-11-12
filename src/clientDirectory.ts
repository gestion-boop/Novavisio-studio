import {cloudConfigured,supabase} from './cloud';
import type {ClientProfile} from './storage';

export type RemoteClient={
  id:string;profile:ClientProfile;logoUrl:string;photoUrls:string[];notes:string[];
  photoCount:number;videoCount?:number;hasLogo?:boolean;updatedAt:string;
  source:'novagen';unavailable?:boolean;summaryOnly?:boolean;
};
type IndexItem={id:string;updatedAt:string};
type DirectoryPage={clients:RemoteClient[];total:number;truncated:boolean};
// Per-account, in-memory summaries survive closing the dialog. Never cache
// signed media URLs or share one account's client records with another account.
const summaries=new Map<string,Map<string,{stamp:string;client:RemoteClient}>>();

export async function requestDirectory<T>(body:Record<string,unknown>,signal?:AbortSignal):Promise<T>{
  if(!cloudConfigured)throw Error('Le Cloud NovaStudio doit être configuré.');
  const {data,error}=await supabase().auth.getSession();
  if(error||!data.session?.access_token)throw Error('Connecte-toi au Cloud NovaStudio pour consulter les clients NovaGen.');
  const response=await fetch('/api/novagen-directory',{
    method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+data.session.access_token},
    body:JSON.stringify(body),cache:'no-store',signal
  });
  const result=await response.json().catch(()=>({error:'Répertoire NovaGen indisponible.'}));
  if(!response.ok)throw Error(result.error||'Erreur de lecture du répertoire NovaGen.');
  return result;
}

export async function loadClientDirectory(signal:AbortSignal,onPage:(page:DirectoryPage)=>void){
  const {data}=await supabase().auth.getSession();
  const account=data.session?.user.id;
  if(!account)throw Error('Connecte-toi au Cloud NovaStudio pour consulter les clients NovaGen.');
  // Verify access and the current list before showing any cached names.
  const index=await requestDirectory<{items:IndexItem[];truncated:boolean}>({mode:'index'},signal);
  if(!Array.isArray(index.items))throw Error('Index des clients NovaGen invalide.');
  signal.throwIfAborted();
  const cache=summaries.get(account)??new Map();summaries.set(account,cache);
  const ids=new Set(index.items.map(item=>item.id));
  for(const id of cache.keys())if(!ids.has(id))cache.delete(id);
  const clients=new Map<string,RemoteClient>();
  const pending:IndexItem[]=[];
  for(const item of index.items){
    const cached=cache.get(item.id);
    if(cached?.stamp===item.updatedAt)clients.set(item.id,cached.client);
    else pending.push(item);
  }
  const notify=()=>onPage({clients:index.items.flatMap(item=>clients.has(item.id)?[clients.get(item.id)!]:[]),total:index.items.length,truncated:index.truncated});
  notify();
  let cursor=0,failed=0;
  await Promise.all(Array.from({length:Math.min(2,Math.ceil(pending.length/3))},async()=>{
    while(cursor<pending.length&&!signal.aborted){
      const batch=pending.slice(cursor,cursor+3);cursor+=3;
      try{
        const result=await requestDirectory<{clients:RemoteClient[]}>({mode:'summaries',ids:batch.map(item=>item.id)},signal);
        signal.throwIfAborted();
        for(const item of batch){
          const client=result.clients?.find(row=>row.id===item.id&&!row.unavailable&&row.profile);
          if(!client){failed++;continue;}
          clients.set(item.id,client);cache.set(item.id,{stamp:item.updatedAt,client});
        }
        notify();
      }catch(e){if(signal.aborted)throw e;failed+=batch.length;}
    }
  }));
  signal.throwIfAborted();
  return {failed};
}
