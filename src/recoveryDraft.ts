import type {CloudLink} from './cloud';
import {openLocalProjectDb,type StudioProject} from './storage';

export type DraftContext={owner:string|null;link:CloudLink|null;base:string|null};
export type DraftSummary=DraftContext&{id:string;scope:string;name:string;at:number;stamp:string};
export type RecoveryDraft=DraftSummary&{project:StudioProject};

export function recoveryScope(owner:string|null,link:CloudLink|null):string|null{
  if(!link)return 'local';
  return owner?'cloud:'+encodeURIComponent(owner)+':'+encodeURIComponent(link.projectId):null;
}

const prefix=(scope:string)=>'recovery-index:v1:'+scope+'/';
const metaKey=({scope,id}:DraftSummary)=>prefix(scope)+id;
const projectKey=({scope,id}:DraftSummary)=>'recovery-project:v1:'+scope+'/'+id;

async function transact<T>(mode:IDBTransactionMode,run:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
  const db=await openLocalProjectDb();
  try{
    return await new Promise<T>((resolve,reject)=>{
      const tx=db.transaction('projects',mode);
      tx.onabort=()=>reject(tx.error??new Error('Brouillon non enregistré'));
      const request=run(tx.objectStore('projects'));
      tx.oncomplete=()=>resolve(request.result);
    });
  }finally{db.close();}
}

export async function writeDraft(summary:DraftSummary,project:StudioProject):Promise<void>{
  await transact('readwrite',store=>{
    store.put({...summary,project},projectKey(summary));
    return store.put(summary,metaKey(summary));
  });
}

export async function listDrafts(scope:string):Promise<DraftSummary[]>{
  const start=prefix(scope);
  const rows:DraftSummary[]=await transact('readonly',store=>store.getAll(IDBKeyRange.bound(start,start+'\uffff')));
  return rows.sort((a,b)=>b.at-a.at);
}

export async function readDraft(summary:DraftSummary):Promise<RecoveryDraft|null>{
  const draft:RecoveryDraft|undefined=await transact('readonly',store=>store.get(projectKey(summary)));
  return draft??null;
}

/** The payload and manifest must always disappear together. */
export async function removeDraft(summary:DraftSummary):Promise<void>{
  await transact('readwrite',store=>{
    const request=store.get(metaKey(summary));
    request.onsuccess=()=>{
      if(request.result?.stamp!==summary.stamp)return;
      store.delete(projectKey(summary));
      store.delete(metaKey(summary));
    };
    return request;
  });
}
