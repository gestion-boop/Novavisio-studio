import {useCallback,useEffect,useRef,useState} from 'react';
import {listDrafts,recoveryScope,removeDraft,writeDraft,type DraftContext,type DraftSummary} from './recoveryDraft';
import type {StudioProject} from './storage';

type Input={project:StudioProject;documentId:string;enabled:boolean;dirty:boolean;context:()=>DraftContext;scope:string|null;cloudVersion?:number};
type Written={summary:DraftSummary;project:StudioProject};

export function useRecoveryDraft(input:Input){
  const latest=useRef(input);latest.current=input;
  const written=useRef<Written|null>(null);
  const origin=useRef<{documentId:string;summary:DraftSummary}|null>(null);
  const queue=useRef<Promise<unknown>>(Promise.resolve());
  const timer=useRef<number|undefined>(undefined);
  const [candidates,setCandidates]=useState<DraftSummary[]>([]);
  const [unavailable,setUnavailable]=useState(false);
  const enqueue=useCallback((task:()=>Promise<void>)=>{
    const run=queue.current.then(task);
    queue.current=run.catch(()=>{});
    return run;
  },[]);

  const checkpoint=useCallback(async()=>{
    const {project,documentId,enabled,dirty,context}=latest.current;
    if(!enabled||!dirty)return false;
    const base=context();
    const scope=recoveryScope(base.owner,base.link);
    if(!scope)return false;
    const summary:DraftSummary={...base,scope,id:documentId,name:project.name,at:Date.now(),stamp:crypto.randomUUID()};
    try{
      await enqueue(async()=>{
        const previous=written.current;
        if(previous?.project===project&&previous.summary.scope===scope&&
          previous.summary.link?.version===summary.link?.version&&previous.summary.base===summary.base)return;
        await writeDraft(summary,project);
        written.current={summary,project};
        // A cloud save can attach a formerly local project. Remove the older
        // checkpoint only after its replacement is durable.
        if(previous?.summary.id===documentId&&previous.summary.scope!==scope)await removeDraft(previous.summary);
      });
      setUnavailable(false);
      return true;
    }catch{setUnavailable(true);return false;}
  },[enqueue]);

  const confirmSaved=useCallback((project:StudioProject,documentId:string,clean:boolean)=>{
    void enqueue(async()=>{
      const current=written.current;
      if(current?.summary.id===documentId&&(clean||current.project===project)){
        await removeDraft(current.summary);
        written.current=null;
      }
      const restored=origin.current;
      if(restored?.documentId===documentId){
        await removeDraft(restored.summary);
        origin.current=null;
      }
    }).catch(()=>setUnavailable(true));
  },[enqueue]);

  useEffect(()=>{
    if(!input.enabled||!input.dirty)return;
    if(timer.current!==undefined)return;
    timer.current=window.setTimeout(()=>{timer.current=undefined;void checkpoint();},650);
  },[input.project,input.enabled,input.dirty,input.documentId,input.scope,input.cloudVersion,checkpoint]);

  useEffect(()=>{
    const flush=()=>{
      window.clearTimeout(timer.current);timer.current=undefined;
      void checkpoint();
    };
    const onVisibility=()=>{if(document.visibilityState==='hidden')flush();};
    window.addEventListener('pagehide',flush);
    document.addEventListener('visibilitychange',onVisibility);
    return ()=>{
      window.removeEventListener('pagehide',flush);
      document.removeEventListener('visibilitychange',onVisibility);
      window.clearTimeout(timer.current);timer.current=undefined;
    };
  },[checkpoint]);

  useEffect(()=>{
    let cancelled=false;
    setCandidates([]);
    if(input.scope)void listDrafts(input.scope).then(drafts=>{
      if(!cancelled)setCandidates(drafts.filter(draft=>draft.id!==input.documentId&&draft.id!==origin.current?.summary.id));
    }).catch(()=>{/* Writes independently report if recovery storage is unavailable. */});
    return ()=>{cancelled=true;};
  },[input.scope,input.documentId]);

  const adopt=useCallback((summary:DraftSummary,documentId:string)=>{
    origin.current={summary,documentId};
    setCandidates(drafts=>drafts.filter(draft=>draft.id!==summary.id));
  },[]);
  const hide=useCallback(()=>setCandidates([]),[]);
  const isProtected=(project:StudioProject,documentId:string)=>written.current?.project===project&&written.current.summary.id===documentId;
  return {checkpoint,confirmSaved,candidates,unavailable,adopt,hide,isProtected};
}
