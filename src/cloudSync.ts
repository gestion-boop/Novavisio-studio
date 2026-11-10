import {useCallback,useEffect,useRef,useState} from 'react';
import {CloudConflictError,CloudSetupError,cloudConfigured,fetchWorkingMeta,openCloudProject,readLink,saveWorking,supabase,writeLink,type CloudLink} from './cloud';
import type {StudioProject} from './storage';

/**
 * Sauvegarde instantanée dans Supabase, y compris à plusieurs.
 *  - chaque modification est envoyée ~0,7 s plus tard (copie de travail mise à jour sur place) ;
 *  - le travail local (IndexedDB) reste la copie rapide : sans réseau, tout est conservé ici et repart au retour de la connexion ;
 *  - règle à plusieurs : LA DERNIÈRE PERSONNE QUI AGIT A LA MAIN. Si l'autre a enregistré entre-temps, ton action reprend la main
 *    (sa version est archivée côté serveur, rien n'est perdu définitivement). Si tu n'as rien en cours, c'est TA fenêtre qui se met
 *    à jour toute seule avec la version de l'autre personne.
 */
export type SyncState=
  |{kind:'off'}
  |{kind:'login'}
  |{kind:'idle'}
  |{kind:'paused'}
  |{kind:'pending'}
  |{kind:'saving';progress:string}
  |{kind:'saved';at:number;note?:string}
  |{kind:'error';message:string}
  |{kind:'setup';message:string};

const ENABLED_KEY='nvstudio-cloud-auto';
const FP_KEY='nvstudio-cloud-fp';
const DEBOUNCE_MS=700;
const POLL_MS=4000;

/** Empreinte légère du projet (les longs médias sont résumés) : sert à ne pas renvoyer un projet déjà synchronisé. */
export function fingerprint(project:StudioProject):string{
  const text=JSON.stringify(project,(k,v)=>k==='updatedAt'?undefined:typeof v==='string'&&v.length>200?'«'+v.length+':'+v.slice(0,24)+':'+v.slice(-24)+'»':v);
  let h=2166136261;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
  return (h>>>0).toString(36)+':'+text.length;
}
const readFp=():{projectId:string;version:number;fp:string}|null=>{try{return JSON.parse(localStorage.getItem(FP_KEY)||'null');}catch{return null;}};
const writeFp=(v:{projectId:string;version:number;fp:string}|null)=>{try{if(v)localStorage.setItem(FP_KEY,JSON.stringify(v));else localStorage.removeItem(FP_KEY);}catch{/* ignoré */}};
const plainLink=(l:CloudLink):CloudLink=>({projectId:l.projectId,revision:l.revision,...(l.version!==undefined?{version:l.version}:{})});

/** `onRemote` remplace le projet affiché par celui d'une autre personne et renvoie l'objet projet réellement affiché. */
export function useCloudSync(project:StudioProject,active:boolean,onRemote:(project:StudioProject,by:string|null)=>StudioProject){
  const [signedIn,setSignedIn]=useState(false);
  const [enabled,setEnabledState]=useState(()=>{try{return localStorage.getItem(ENABLED_KEY)!=='off';}catch{return true;}});
  const [state,setState]=useState<SyncState>(cloudConfigured?{kind:'login'}:{kind:'off'});
  const projectRef=useRef(project);projectRef.current=project;
  const onRemoteRef=useRef(onRemote);onRemoteRef.current=onRemote;
  const syncedRef=useRef<StudioProject|null>(null);
  const runningRef=useRef(false);
  const adoptingRef=useRef(false);
  const takeoverRef=useRef(false);
  const timerRef=useRef<number|undefined>(undefined);
  const blockedRef=useRef<'setup'|null>(null);
  const attemptRef=useRef(0);
  const canRunRef=useRef(false);
  const runRef=useRef<()=>Promise<void>>(async()=>{});
  const startedRef=useRef(false);

  useEffect(()=>{
    if(!cloudConfigured)return;
    const db=supabase();
    void db.auth.getSession().then(({data})=>setSignedIn(!!data.session));
    const {data:sub}=db.auth.onAuthStateChange((_e,session)=>setSignedIn(!!session));
    return ()=>sub.subscription.unsubscribe();
  },[]);

  const canRun=cloudConfigured&&signedIn&&enabled&&active;
  canRunRef.current=canRun;

  const schedule=useCallback((ms:number)=>{
    window.clearTimeout(timerRef.current);
    timerRef.current=window.setTimeout(()=>{void runRef.current();},ms);
  },[]);

  runRef.current=async()=>{
    if(runningRef.current||adoptingRef.current||blockedRef.current||!canRunRef.current)return;
    const target=projectRef.current;
    if(target===syncedRef.current||!target.scenes.length)return;
    runningRef.current=true;
    setState({kind:'saving',progress:'Envoi…'});
    let note:string|undefined;
    try{
      const link=await saveWorking(target,readLink(),progress=>setState({kind:'saving',progress}),takeoverRef.current);
      if(takeoverRef.current)note='Tu as repris la main (la version précédente est archivée)';
      takeoverRef.current=false;
      const saved=plainLink(link);
      writeLink(saved);
      writeFp({projectId:saved.projectId,version:saved.version??0,fp:fingerprint(target)});
      syncedRef.current=target;attemptRef.current=0;
      setState({kind:'saved',at:Date.now(),note});
    }catch(e){
      if(e instanceof CloudConflictError){
        // La dernière personne qui agit a la main : on reprend la main sur la version du cloud et on renvoie aussitôt.
        const link=readLink();
        if(link)writeLink({...link,version:e.cloudVersion});
        takeoverRef.current=true;
        attemptRef.current=0;
        schedule(0);
      }else if(e instanceof CloudSetupError){blockedRef.current='setup';setState({kind:'setup',message:e.message});}
      else{
        attemptRef.current++;
        setState({kind:'error',message:e instanceof Error?e.message:String(e)});
        schedule(Math.min(60000,2000*2**Math.min(attemptRef.current,5))); // nouvel essai automatique : 4 s, 8 s, 16 s… 60 s
      }
    }finally{
      runningRef.current=false;
      // Une modification est arrivée pendant l'envoi : on envoie aussi celle-là, tout de suite.
      if(!blockedRef.current&&attemptRef.current===0&&projectRef.current!==syncedRef.current&&canRunRef.current)schedule(150);
    }
  };

  // État affiché selon connexion / activation.
  useEffect(()=>{
    if(!cloudConfigured)return;
    if(!signedIn){setState({kind:'login'});return;}
    if(!enabled){setState({kind:'paused'});return;}
    setState(st=>st.kind==='login'||st.kind==='paused'?{kind:'idle'}:st);
  },[signedIn,enabled]);

  // Premier passage : si le projet affiché est exactement celui déjà synchronisé, on n'écrit rien.
  useEffect(()=>{
    if(!canRun||startedRef.current)return;
    startedRef.current=true;
    const link=readLink(),fp=readFp();
    if(link&&fp&&fp.projectId===link.projectId&&fp.version===(link.version??0)&&fp.fp===fingerprint(projectRef.current)){
      syncedRef.current=projectRef.current;
      setState({kind:'saved',at:Date.now()});
    }
  },[canRun]);

  // Chaque modification : envoi quasi immédiat.
  useEffect(()=>{
    if(!canRun||blockedRef.current)return;
    if(project===syncedRef.current||!project.scenes.length)return;
    setState(s=>s.kind==='saving'?s:{kind:'pending'});
    schedule(DEBOUNCE_MS);
    return ()=>window.clearTimeout(timerRef.current);
  },[project,canRun,schedule]);

  // Travail à plusieurs : si quelqu'un d'autre a enregistré et que tu n'as rien en cours, ta fenêtre se met à jour toute seule.
  useEffect(()=>{
    if(!canRun)return;
    let stopped=false;
    const tick=async()=>{
      if(stopped||document.hidden||runningRef.current||adoptingRef.current||blockedRef.current)return;
      const link=readLink();
      if(!link||link.version===undefined)return;
      try{
        const meta=await fetchWorkingMeta(link.projectId);
        const mine=readLink()?.version??0;
        if(meta.version<=mine||runningRef.current||stopped)return;
        if(projectRef.current!==syncedRef.current)return; // tu as des modifications en cours : elles reprendront la main au prochain envoi
        adoptingRef.current=true;
        const loaded=await openCloudProject(link.projectId,()=>{});
        // Pendant le téléchargement, tu as agi : c'est toi qui gardes la main.
        if(projectRef.current!==syncedRef.current||stopped)return;
        const shown=onRemoteRef.current(loaded.project,meta.updatedBy);
        const saved=plainLink(loaded.link);
        writeLink(saved);
        writeFp({projectId:saved.projectId,version:saved.version??0,fp:fingerprint(shown)});
        syncedRef.current=shown;
        setState({kind:'saved',at:Date.now(),note:'Mis à jour : modifié par '+(meta.updatedBy??'une autre personne')});
      }catch{/* réseau coupé ou pas encore installé : on réessaie au prochain passage */}
      finally{adoptingRef.current=false;}
    };
    const id=window.setInterval(()=>{void tick();},POLL_MS);
    return ()=>{stopped=true;window.clearInterval(id);};
  },[canRun]);

  // Envoi immédiat quand on quitte l'onglet ou quand le réseau revient.
  useEffect(()=>{
    const flush=()=>{if(canRunRef.current&&!blockedRef.current)void runRef.current();};
    const onHide=()=>{if(document.visibilityState==='hidden')flush();};
    document.addEventListener('visibilitychange',onHide);
    window.addEventListener('pagehide',flush);
    window.addEventListener('online',flush);
    return ()=>{
      document.removeEventListener('visibilitychange',onHide);
      window.removeEventListener('pagehide',flush);
      window.removeEventListener('online',flush);
    };
  },[]);

  const setEnabled=useCallback((on:boolean)=>{
    try{localStorage.setItem(ENABLED_KEY,on?'on':'off');}catch{/* ignoré */}
    setEnabledState(on);
  },[]);
  const retryNow=useCallback(()=>{attemptRef.current=0;blockedRef.current=null;schedule(0);},[schedule]);
  /** Le projet affiché vient du cloud (ou vient d'y être enregistré) : il est synchronisé, rien à renvoyer. */
  const markSynced=useCallback((synced:StudioProject,link:CloudLink)=>{
    syncedRef.current=synced;blockedRef.current=null;attemptRef.current=0;takeoverRef.current=false;
    const saved=plainLink(link);
    writeLink(saved);
    writeFp({projectId:saved.projectId,version:saved.version??0,fp:fingerprint(synced)});
    setState({kind:'saved',at:Date.now()});
  },[]);
  /** Un autre projet remplace celui-ci : on coupe le lien (le cloud existant reste intact, un nouveau sera créé si besoin). */
  const unlink=useCallback(()=>{
    writeLink(null);writeFp(null);
    syncedRef.current=null;blockedRef.current=null;attemptRef.current=0;takeoverRef.current=false;
    setState(!cloudConfigured?{kind:'off'}:signedIn?{kind:'idle'}:{kind:'login'});
  },[signedIn]);

  return {state,enabled,setEnabled,retryNow,markSynced,unlink,signedIn};
}
