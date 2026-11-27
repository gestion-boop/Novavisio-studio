import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ErrorBoundary,installErrorLog} from './ErrorBoundary';
import {Tour} from './tour';
import {BUCKET,MEDIA_PREFIX,cloudConfigured,mediaSlots,supabase,type MediaKind} from './cloud';
import {validateProject,type StudioProject} from './storage';

/**
 * Page publique d'une visite partagée : share.html?t=<jeton>.
 * Le serveur ne renvoie la visite que si le lien est valide ; passé la date, il répond « expiré » et les médias
 * ne sont plus téléchargeables. Les panoramas sont chargés progressivement (le premier s'affiche tout de suite).
 */
type Phase=
  |{kind:'loading'}
  |{kind:'invalid'}
  |{kind:'expired'}
  |{kind:'error';message:string}
  |{kind:'ok';snapshot:StudioProject;expiresAt:string|null};

const PLACEHOLDER:Record<MediaKind,string>={
  panorama:'data:image/jpeg;base64,AAAA',icon:'data:image/png;base64,AAAA',frame:'data:image/png;base64,AAAA',
  video:'data:video/mp4;base64,AAAA',audio:'data:audio/mpeg;base64,AAAA'
};
const isRef=(v?:string):v is string=>typeof v==='string'&&v.startsWith(MEDIA_PREFIX);

function panoramaOrder(project:StudioProject,scene:StudioProject['scenes'][number]):string[]{
  const index=project.scenes.indexOf(scene);
  const ids=new Set([
    ...scene.hotspots.filter(h=>h.type==='navigation').map(h=>h.target),
    ...project.bottomBar.filter(item=>item.type==='navigation').map(item=>item.target),
    project.scenes[index+1]?.id,project.scenes[index-1]?.id,
  ]);
  ids.delete(scene.id);
  const byId=new Map(project.scenes.map(candidate=>[candidate.id,candidate.dataUrl]));
  return [
    ...[...ids].map(id=>id?byId.get(id):undefined),
    ...project.scenes.filter(candidate=>candidate!==scene&&!ids.has(candidate.id)).map(candidate=>candidate.dataUrl),
  ].filter(isRef);
}

function mediaOrder(project:StudioProject,scene:StudioProject['scenes'][number]):string[]{
  const visibleIconIds=new Set([
    ...scene.hotspots.flatMap(h=>[h.iconId,h.hoverIconId,h.pressedIconId]),
    ...project.bottomBar.flatMap(item=>[item.iconId,item.hoverIconId,item.pressedIconId]),
    project.settingsIconId,project.closeIconId,
  ]);
  return [
    ...scene.hotspots.map(h=>h.imageDataUrl),
    ...project.icons.filter(icon=>visibleIconIds.has(icon.id)).map(icon=>icon.dataUrl),
    ...project.audioTracks.filter(track=>track.id===scene.musicTrackId||track.id===project.defaultMusicTrackId).map(track=>track.dataUrl),
    scene.nightDataUrl,scene.audioDataUrl,
    ...scene.hotspots.map(h=>h.videoDataUrl),
    ...[project.floorPlan,...(project.floorPlans??[])].map(plan=>plan?.imageDataUrl),
    ...project.icons.map(icon=>icon.dataUrl),
    ...project.bottomBar.flatMap(item=>[item.galleryBackgroundImage,...(item.photos??[]).map(media=>media.data)]),
    ...project.audioTracks.map(track=>track.dataUrl),
  ].filter(isRef);
}

type BackgroundLane={queue:string[];attempted:Set<string>;running:boolean};
const createLane=():BackgroundLane=>({queue:[],attempted:new Set(),running:false});

/** Hydratation progressive : le panorama est visible dès qu'il est chargé, sans attendre les médias secondaires. */
function hydrate(snapshot:StudioProject,loaded:Map<string,string>):StudioProject{
  const p=structuredClone(snapshot);
  const swap=(v?:string)=>isRef(v)?loaded.get(v):v;
  // Tous les plans (floorPlan + floorPlans) : après copie, ce sont des objets distincts.
  [p.floorPlan,...(p.floorPlans??[])].forEach(plan=>{if(plan)plan.imageDataUrl=swap(plan.imageDataUrl)??'';});
  p.icons.forEach(i=>{i.dataUrl=swap(i.dataUrl)??'';});
  p.audioTracks.forEach(t=>{t.dataUrl=swap(t.dataUrl);});
  p.bottomBar?.forEach(item=>{
    item.galleryBackgroundImage=swap(item.galleryBackgroundImage);
    (item.photos??[]).forEach(media=>{media.data=swap(media.data);});
  });
  p.scenes.forEach(scene=>{
    // A 360° scene no longer waits for big framed images, videos or audio.
    scene.dataUrl=swap(scene.dataUrl)??'';
    // Photo de nuit : sans ce téléchargement, le bouton Nuit affichait « The panorama cannot be loaded » (référence non résolue).
    scene.nightDataUrl=swap(scene.nightDataUrl);
    scene.audioDataUrl=swap(scene.audioDataUrl);
    scene.hotspots.forEach(h=>{h.imageDataUrl=swap(h.imageDataUrl);h.videoDataUrl=swap(h.videoDataUrl);});
  });
  return p;
}

function Message({title,text}:{title:string;text:string}){
  return <main className="share-screen"><div className="share-card"><div className="share-logo">◉</div><h1>{title}</h1><p>{text}</p></div></main>;
}

function Share(){
  const [phase,setPhase]=useState<Phase>({kind:'loading'});
  const [version,setVersion]=useState(0);
  const loaded=useRef(new Map<string,string>());
  const pending=useRef(new Map<string,Promise<boolean>>());
  const alive=useRef(true);
  const snapshotRef=useRef<StudioProject|null>(null);
  const desiredScene=useRef('');
  const requestNumber=useRef(0);
  const loadingSelected=useRef(false);
  const panoramaLane=useRef(createLane());
  const mediaLane=useRef(createLane());

  const fetchRef=useCallback((ref:string):Promise<boolean>=>{
    if(!alive.current)return Promise.resolve(false);
    if(loaded.current.has(ref))return Promise.resolve(true);
    const existing=pending.current.get(ref);
    if(existing)return existing;
    const job=(async()=>{
      try{
        const {data,error}=await supabase().storage.from(BUCKET).download(ref.slice(MEDIA_PREFIX.length));
        if(error||!data||!alive.current)return false;
        loaded.current.set(ref,URL.createObjectURL(data));
        setVersion(previous=>previous+1);
        return true;
      }catch{return false;}
    })().finally(()=>{pending.current.delete(ref);});
    pending.current.set(ref,job);
    return job;
  },[]);

  const drain=useCallback(async(lane:BackgroundLane)=>{
    if(lane.running)return;
    lane.running=true;
    try{
      while(alive.current&&!loadingSelected.current){
        const ref=lane.queue.shift();
        if(!ref)return;
        if(lane.attempted.has(ref))continue;
        lane.attempted.add(ref);
        await fetchRef(ref);
      }
    }finally{lane.running=false;}
  },[fetchRef]);

  const ensureScene=useCallback(async(id:string)=>{
    const project=snapshotRef.current;
    const scene=project?.scenes.find(candidate=>candidate.id===id);
    if(!project||!scene||!alive.current)return;
    if(desiredScene.current===id&&(loadingSelected.current||!isRef(scene.dataUrl)||loaded.current.has(scene.dataUrl)))return;
    desiredScene.current=id;
    const request=++requestNumber.current;
    loadingSelected.current=true;
    const panorama=scene.dataUrl;
    let ready=!isRef(panorama);
    for(let attempt=0;!ready&&attempt<3&&alive.current&&request===requestNumber.current;attempt++){
      if(attempt>0)await new Promise(resolve=>setTimeout(resolve,500*attempt));
      if(!alive.current||request!==requestNumber.current)return;
      // A few rapid clicks may supersede a download that already started.
      // Reserve at most two extra requests beyond the background lanes.
      while(pending.current.size>=4&&!pending.current.has(panorama)&&alive.current&&request===requestNumber.current){
        await Promise.race(pending.current.values());
      }
      if(!alive.current||request!==requestNumber.current)return;
      ready=await fetchRef(panorama);
    }
    if(!alive.current||request!==requestNumber.current)return;
    loadingSelected.current=false;
    if(!ready&&scene===project.scenes[0]){
      setPhase({kind:'error',message:'Le premier panorama n’a pas pu être chargé'});
      return;
    }
    // Only the selected panorama may bypass the two background lanes. A heavy
    // video never blocks prefetching a panorama, or visiting a different scene.
    panoramaLane.current.queue=panoramaOrder(project,scene);
    mediaLane.current.attempted.clear();
    mediaLane.current.queue=mediaOrder(project,scene);
    void drain(panoramaLane.current);
    void drain(mediaLane.current);
  },[drain,fetchRef]);

  useEffect(()=>{
    alive.current=true;
    void (async()=>{
      try{
        const token=new URLSearchParams(window.location.search).get('t')?.trim()??'';
        if(!/^[a-f0-9]{64}$/.test(token)||!cloudConfigured){setPhase({kind:'invalid'});return;}
        const {data,error}=await supabase().rpc('nvstudio_get_share',{p_token:token});
        if(error)throw new Error('Service indisponible');
        const res=data as {status:string;snapshot?:StudioProject;expires_at?:string|null;permanent?:boolean};
        if(res.status==='expired'){setPhase({kind:'expired'});return;}
        if(res.status!=='ok'||!res.snapshot||(!res.expires_at&&!res.permanent)){setPhase({kind:'invalid'});return;}
        // Vérifie la structure avec des médias factices du bon type (les vrais ne sont pas encore téléchargés).
        const probe=structuredClone(res.snapshot);
        mediaSlots(probe).forEach(s=>{if(isRef(s.get()))s.set(PLACEHOLDER[s.kind]);});
        validateProject(probe);
        const snap=res.snapshot;
        snapshotRef.current=snap;
        // Show the intro NOW, before downloading the first panorama or its icons.
        // The viewer is preloaded under the intro; no intermediate loading screen.
        if(!alive.current)return;
        setPhase({kind:'ok',snapshot:snap,expiresAt:res.expires_at??null});
        const first=snap.scenes[0];
        if(first)void ensureScene(first.id);
      }catch(e){
        if(alive.current)setPhase({kind:'error',message:e instanceof Error?e.message:'Impossible de charger la visite'});
      }
    })();
    return ()=>{
      alive.current=false;
      loaded.current.forEach(url=>URL.revokeObjectURL(url));
      loaded.current.clear();
    };
  },[ensureScene]);

  // Une page laissée ouverte passe l'échéance : l'accès se ferme.
  useEffect(()=>{
    if(phase.kind!=='ok'||!phase.expiresAt)return; // lien permanent : pas d'échéance
    const ms=new Date(phase.expiresAt).getTime()-Date.now();
    if(!Number.isFinite(ms))return;
    const timer=window.setTimeout(()=>{
      alive.current=false;
      loaded.current.forEach(url=>URL.revokeObjectURL(url));
      loaded.current.clear();
      setPhase({kind:'expired'});
    },Math.min(Math.max(ms,0),2_000_000_000));
    return ()=>window.clearTimeout(timer);
  },[phase]);

  const project=useMemo(()=>phase.kind==='ok'?hydrate(phase.snapshot,loaded.current):null,[phase,version]);

  if(phase.kind==='loading')return <main className="nv-share-firstpaint" role="status" aria-live="polite">
    <div className="nv-tour-startup-spinner" aria-hidden="true"/>
    <span>Votre expérience immersive se prépare…</span>
  </main>;
  if(phase.kind==='expired')return <Message title="Ce lien a expiré" text="La durée d’accès à cette visite est terminée. Demande un nouveau lien à la personne qui te l’a envoyé."/>;
  if(phase.kind==='invalid')return <Message title="Lien invalide" text="Ce lien n’existe pas ou est incomplet. Vérifie l’adresse reçue."/>;
  if(phase.kind==='error')return <Message title="Visite indisponible" text={phase.message+'. Réessaie dans un instant.'}/>;
  return <Tour project={project??undefined} onNeedScene={ensureScene}/>;
}
installErrorLog();
createRoot(document.getElementById('share-root')!).render(<ErrorBoundary label="visite publique"><Share/></ErrorBoundary>);
