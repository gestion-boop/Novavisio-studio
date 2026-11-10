import {useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
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
  |{kind:'ok';snapshot:StudioProject;expiresAt:string};

const PLACEHOLDER:Record<MediaKind,string>={
  panorama:'data:image/jpeg;base64,AAAA',icon:'data:image/png;base64,AAAA',frame:'data:image/png;base64,AAAA',
  video:'data:video/mp4;base64,AAAA',audio:'data:audio/mpeg;base64,AAAA'
};
const isRef=(v?:string):v is string=>typeof v==='string'&&v.startsWith(MEDIA_PREFIX);

function sceneRefs(scene:StudioProject['scenes'][number]):string[]{
  const refs=[scene.dataUrl,scene.audioDataUrl,...scene.hotspots.flatMap(h=>[h.imageDataUrl,h.videoDataUrl])];
  return [...new Set(refs.filter(isRef))];
}
/** Copie du projet où seuls les médias déjà téléchargés sont remplacés par une adresse locale. Une scène n'apparaît que complète. */
function hydrate(snapshot:StudioProject,loaded:Map<string,string>):StudioProject{
  const p=structuredClone(snapshot);
  const swap=(v?:string)=>isRef(v)?loaded.get(v):v;
  p.icons.forEach(i=>{i.dataUrl=swap(i.dataUrl)??'';});
  p.audioTracks.forEach(t=>{t.dataUrl=swap(t.dataUrl);});
  p.scenes.forEach((scene,idx)=>{
    const ready=sceneRefs(snapshot.scenes[idx]).every(r=>loaded.has(r));
    if(!ready){scene.dataUrl='';scene.audioDataUrl=undefined;scene.hotspots.forEach(h=>{h.imageDataUrl=undefined;h.videoDataUrl=undefined;});return;}
    scene.dataUrl=swap(scene.dataUrl)??'';
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
  const pending=useRef(new Map<string,Promise<void>>());
  const alive=useRef(true);
  const snapshotRef=useRef<StudioProject|null>(null);

  const fetchRef=async(ref:string)=>{
    if(loaded.current.has(ref))return;
    const {data,error}=await supabase().storage.from(BUCKET).download(ref.slice(MEDIA_PREFIX.length));
    if(error||!data)throw new Error('Média indisponible');
    if(!alive.current)return;
    loaded.current.set(ref,URL.createObjectURL(data));
  };
  const ensureScene=(id:string):Promise<void>=>{
    const snap=snapshotRef.current;
    const scene=snap?.scenes.find(s=>s.id===id);
    if(!snap||!scene)return Promise.resolve();
    let job=pending.current.get(id);
    if(!job){
      job=(async()=>{
        for(const ref of sceneRefs(scene))await fetchRef(ref);
        if(alive.current)setVersion(v=>v+1);
      })().catch(()=>{pending.current.delete(id);});
      pending.current.set(id,job);
    }
    return job;
  };

  useEffect(()=>{
    alive.current=true;
    void (async()=>{
      try{
        const token=new URLSearchParams(window.location.search).get('t')?.trim()??'';
        if(!/^[a-f0-9]{64}$/.test(token)||!cloudConfigured){setPhase({kind:'invalid'});return;}
        const {data,error}=await supabase().rpc('nvstudio_get_share',{p_token:token});
        if(error)throw new Error('Service indisponible');
        const res=data as {status:string;snapshot?:StudioProject;expires_at?:string};
        if(res.status==='expired'){setPhase({kind:'expired'});return;}
        if(res.status!=='ok'||!res.snapshot||!res.expires_at){setPhase({kind:'invalid'});return;}
        // Vérifie la structure avec des médias factices du bon type (les vrais ne sont pas encore téléchargés).
        const probe=structuredClone(res.snapshot);
        mediaSlots(probe).forEach(s=>{if(isRef(s.get()))s.set(PLACEHOLDER[s.kind]);});
        validateProject(probe);
        const snap=res.snapshot;
        snapshotRef.current=snap;
        // Les icônes d'abord (légères), puis le 1er panorama : la visite s'ouvre aussitôt.
        for(const icon of snap.icons)if(isRef(icon.dataUrl))await fetchRef(icon.dataUrl);
        if(snap.scenes[0])await ensureScene(snap.scenes[0].id);
        if(!alive.current)return;
        setPhase({kind:'ok',snapshot:snap,expiresAt:res.expires_at});
        // Ensuite : la musique, puis les autres panoramas en arrière-plan.
        void (async()=>{
          for(const t of snap.audioTracks)if(isRef(t.dataUrl))await fetchRef(t.dataUrl).catch(()=>undefined);
          if(alive.current)setVersion(v=>v+1);
          for(const s of snap.scenes.slice(1)){if(!alive.current)return;await ensureScene(s.id);}
        })();
      }catch(e){
        if(alive.current)setPhase({kind:'error',message:e instanceof Error?e.message:'Impossible de charger la visite'});
      }
    })();
    return ()=>{
      alive.current=false;
      loaded.current.forEach(url=>URL.revokeObjectURL(url));
      loaded.current.clear();
    };
  },[]);

  // Une page laissée ouverte passe l'échéance : l'accès se ferme.
  useEffect(()=>{
    if(phase.kind!=='ok')return;
    const ms=new Date(phase.expiresAt).getTime()-Date.now();
    if(!Number.isFinite(ms))return;
    const timer=window.setTimeout(()=>setPhase({kind:'expired'}),Math.min(Math.max(ms,0),2_000_000_000));
    return ()=>window.clearTimeout(timer);
  },[phase]);

  const project=useMemo(()=>phase.kind==='ok'?hydrate(phase.snapshot,loaded.current):null,[phase,version]);

  if(phase.kind==='loading')return <Message title="Chargement de la visite…" text="Merci de patienter quelques instants."/>;
  if(phase.kind==='expired')return <Message title="Ce lien a expiré" text="La durée d’accès à cette visite est terminée. Demande un nouveau lien à la personne qui te l’a envoyé."/>;
  if(phase.kind==='invalid')return <Message title="Lien invalide" text="Ce lien n’existe pas ou est incomplet. Vérifie l’adresse reçue."/>;
  if(phase.kind==='error')return <Message title="Visite indisponible" text={phase.message+'. Réessaie dans un instant.'}/>;
  return <Tour project={project??undefined} onNeedScene={id=>{void ensureScene(id);}}/>;
}
createRoot(document.getElementById('share-root')!).render(<Share/>);
