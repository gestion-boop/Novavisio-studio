import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {Viewer} from '@photo-sphere-viewer/core';
import {PANORAMA_MIN_FOV,PANORAMA_MAX_FOV,panoramaArrivalZoom} from './panoramaLens';
import {MarkersPlugin,type MarkerConfig} from '@photo-sphere-viewer/markers-plugin';
import {frameWorldCorners} from './sphericalFrame';
import {syncMarkers,resetMarkers,crossfadeMarkers} from './markerSync';
import {startPosterBounce} from './posterBounce';
import {PanoramaGallery,galleryEntries} from './gallery';
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';
import {Maximize,Minimize,X,ArrowRight,Globe,Home,Phone,CalendarDays,Info,Images,LayoutGrid,Utensils,MapPin,Menu,Star} from 'lucide-react';
import {barIconSize,defaultBarStyle,defaultFrameCorners,type StudioProject,type Scene,type Hotspot,type BottomBarItem,type CustomIcon} from './storage';
import {imageMarkerHtml,responsiveFrameSize} from './imageFrame';
import {iconStateHtml,IconStateVisual,videoMarkerHtml,VideoPopup,ZoomImage,type ZoomOrigin} from './media';
import {ContinuousMusic} from './continuousMusic';
import {startVr,vrSupported} from './vr';
import './visitor.css';
import './media.css';

const symbols={home:Home,info:Info,calendar:CalendarDays,map:MapPin,phone:Phone,web:Globe,arrow:ArrowRight,menu:Menu,star:Star,utensils:Utensils,images:Images,grid:LayoutGrid};
function Symbol({name}:{name:string}) {
  const Icon = symbols[name as keyof typeof symbols]??Info;
  return <Icon size={28} strokeWidth={2}/>;
}
function checkedLink(raw:string):string|null {
  try{
    const parsed=new URL(raw.trim());
    return ['https:','http:','tel:','mailto:'].includes(parsed.protocol)?parsed.href:null;
  }catch{return null;}
}
function publicMarker(h:Hotspot,icons:CustomIcon[],height:number,zoom:number):MarkerConfig {
  if(h.type==='image'&&h.imageDataUrl){
    return {id:h.id,imageLayer:h.imageDataUrl,position:frameWorldCorners(h),hoverScale:false};
  }
  const source=h.videoDataUrl||h.videoUrl;
  if(h.type==='video'&&source){
    return {id:h.id,videoLayer:source,position:frameWorldCorners(h),
      autoplay:h.videoAutoplay!==false,hoverScale:false};
  }
  const isMedia=h.type==='image'||h.type==='video';
  const size=isMedia?responsiveFrameSize(h,height,zoom):null;
  const w=size?.width??Math.min(80,Math.max(16,h.iconSize??28));
  const hh=size?.height??w;
  const custom=icons.find(icon=>icon.id===h.iconId);
  const html=h.type==='image'?imageMarkerHtml(undefined,h.frameCorners??defaultFrameCorners(),w,hh,h.title):
    h.type==='video'?videoMarkerHtml(h,w,hh):
    custom?iconStateHtml(icons,h.iconId,h.hoverIconId,h.pressedIconId,'tour-marker'):
    '<span class="tour-marker">'+(h.type==='navigation'?'➜':h.type==='lien'?'↗':'i')+'</span>';
  return {id:h.id,position:{yaw:h.yaw,pitch:h.pitch},size:{width:w,height:hh},
    anchor:'center center',html,tooltip:h.title};
}
type ViewerProps={
  scene:Scene;
  icons:CustomIcon[];
  navigate:(id:string,via?:Hotspot)=>void;
  arrival?:{sceneId:string;yaw:number;pitch:number;zoom:number}|null;
  info:(h:Hotspot)=>void;
  linked:(title:string,url:string)=>void;
  image:(h:Hotspot,from?:ZoomOrigin|null)=>void;
  video:(h:Hotspot,from?:ZoomOrigin|null)=>void;
  onReady:(sceneId:string)=>void;
};
function Pano({scene,icons,arrival,navigate,info,linked,image,video,onReady}:ViewerProps){
  const container=useRef<HTMLDivElement>(null);
  const lastPointer=useRef<ZoomOrigin|null>(null); // dernier clic : point de départ du zoom photo/vidéo
  useEffect(()=>{
    const root=container.current;
    if(!root)return;
    const remember=(e:PointerEvent)=>{lastPointer.current={x:e.clientX,y:e.clientY};};
    root.addEventListener('pointerdown',remember,true);
    return ()=>root.removeEventListener('pointerdown',remember,true);
  },[]);
  const viewer=useRef<Viewer|null>(null);
  const loadedScene=useRef<string|null>(null);
  const handlers=useRef({scene,icons,arrival,navigate,info,linked,image,video,onReady});
  handlers.current={scene,icons,arrival,navigate,info,linked,image,video,onReady};
  useEffect(()=>{
    if(!container.current)return;
    const instance=new Viewer({
      container:container.current,
      panorama:scene.dataUrl,
      navbar:[],defaultZoomLvl:panoramaArrivalZoom(scene),
      defaultYaw:scene.arrivalYaw??0,defaultPitch:scene.arrivalPitch??0,
      minFov:PANORAMA_MIN_FOV,maxFov:PANORAMA_MAX_FOV,fisheye:false,loadingTxt:'',
      defaultTransition:{effect:'fade',rotation:false,speed:260},
      plugins:[MarkersPlugin]
    });
    viewer.current=instance;
    loadedScene.current=scene.id;
    // Notify when the first 360° texture is decoded: only then dismiss the intro.
    instance.addEventListener('ready',()=>handlers.current.onReady(scene.id));
    const plugin=instance.getPlugin(MarkersPlugin) as MarkersPlugin;
    plugin.addEventListener('select-marker',({marker})=>{
      const a=handlers.current;
      const h=a.scene.hotspots.find(x=>x.id===marker.id);
      if(!h)return;
      if(h.type==='navigation'){if(h.target)a.navigate(h.target,h);}
      else if(h.type==='image'||(h.type==='information'&&h.imageDataUrl))a.image(h,lastPointer.current);
      else if(h.type==='video' && h.videoOpenFullscreen!==false)a.video(h,lastPointer.current);
      else if(h.url && checkedLink(h.url))a.linked(h.title,h.url);
      else if(h.type==='information')a.info(h);
    });
    const refreshMarkers=()=>{
      const viewHeight=container.current?.clientHeight||550;
      const current=handlers.current;
      if(loadedScene.current!==current.scene.id)return;
      syncMarkers(instance,current.scene.hotspots.map(h=>
        publicMarker(h,current.icons,viewHeight,instance.getZoomLevel())));
    };
    refreshMarkers();
    let pending=0;
    instance.addEventListener('zoom-updated',()=>{
      if(pending)cancelAnimationFrame(pending);
      pending=requestAnimationFrame(refreshMarkers);
    });
    // Fullscreen and mobile orientation changes both resize the panorama viewport.
    const observer=new ResizeObserver(refreshMarkers);
    if(container.current)observer.observe(container.current);
    // Léger rebond des affiches (photos / vidéos) pour montrer qu'elles sont cliquables.
    const stopBounce=startPosterBounce(instance,()=>handlers.current.scene,()=>loadedScene.current===handlers.current.scene.id);
    return ()=>{stopBounce();if(pending)cancelAnimationFrame(pending);observer.disconnect();viewer.current=null;loadedScene.current=null;instance.destroy();};
  },[]);
  useEffect(()=>{
    const instance=viewer.current;
    if(!instance||loadedScene.current===scene.id)return;
    const next=scene;
    const pendingArrival=handlers.current.arrival;
    const arrivalFor=pendingArrival&&pendingArrival.sceneId===next.id?pendingArrival:null;
    let disposed=false;
    // Fondu enchaîné des marqueurs, déclenché au moment exact où le fondu de l'image commence.
    let fade:Promise<void>|null=null;
    const markersNow=()=>next.hotspots.map(h=>publicMarker(h,handlers.current.icons,container.current?.clientHeight||550,instance.getZoomLevel()));
    const onLoaded=()=>{instance.removeEventListener('panorama-loaded',onLoaded);fade=crossfadeMarkers(instance,markersNow(),260);};
    instance.addEventListener('panorama-loaded',onLoaded);
    void instance.setPanorama(next.dataUrl,{
      showLoader:false,transition:{effect:'fade',rotation:false,speed:260},
      // La flèche utilisée a sa propre vue d'arrivée ; sinon, celle par défaut du panorama.
      position:{yaw:arrivalFor?.yaw??next.arrivalYaw??0,pitch:arrivalFor?.pitch??next.arrivalPitch??0},
      zoom:arrivalFor?.zoom??panoramaArrivalZoom(next)
    }).then(async success=>{
      if(disposed||!success)return;
      if(fade)await fade;else resetMarkers(instance,markersNow());
      if(disposed)return;
      loadedScene.current=next.id;
      syncMarkers(instance,markersNow());
    }).catch(()=>{/* Keep previous panorama if the new photo cannot load. */});
    return ()=>{disposed=true;instance.removeEventListener('panorama-loaded',onLoaded);};
  },[scene.id,scene.dataUrl]);
  useEffect(()=>{
    const instance=viewer.current;
    if(!instance||loadedScene.current!==scene.id)return;
    // Images, icon files and screen videos may arrive after the main panorama.
    syncMarkers(instance,scene.hotspots.map(h=>
      publicMarker(h,icons,container.current?.clientHeight||550,instance.getZoomLevel())));
  },[scene.id,scene.hotspots,icons]);
  return <div className="tour-panorama" ref={container}/>;
}
/**
 * Lecteur de visite. Deux usages :
 *  - visite exportée : le projet est lu dans <script id="nv-project-data"> ;
 *  - lien public : le projet est fourni en propriété (et peut se compléter progressivement : `onNeedScene` demande
 *    le chargement d'un panorama pas encore téléchargé).
 */
export function Tour({project:given,onNeedScene}:{project?:StudioProject;onNeedScene?:(id:string)=>void}){
  const [fromPage]=useState<StudioProject|null>(()=>{
    try{const el=document.getElementById('nv-project-data');return el?JSON.parse(el.textContent??'null'):null;}catch{return null;}
  });
  const project=given??fromPage;
  const [sceneId,setSceneId]=useState(()=>project?.scenes[0]?.id??'');
  const [modal,setModal]=useState<{title:string;url?:string;text?:string}|null>(null);
  const [photo,setPhoto]=useState<Hotspot|null>(null);
  const [zoomFrom,setZoomFrom]=useState<ZoomOrigin|null>(null);
  const [galleryId,setGalleryId]=useState<string|null>(null);
  const [arrival,setArrival]=useState<{sceneId:string;yaw:number;pitch:number;zoom:number}|null>(null);
  const [video,setVideo]=useState<Hotspot|null>(null);
  const [showIntro,setShowIntro]=useState(()=>Boolean(
    project?.introEnabled && project.introUrl?.startsWith('https://') &&
    // A generated Scaleway wrapper already starts the intro at HTML first paint.
    !(window.parent!==window && new URLSearchParams(window.location.search).get('external_intro')==='1')
  ));
  const [introCompleted,setIntroCompleted]=useState(false);
  const [firstPanoramaReady,setFirstPanoramaReady]=useState(false);
  const [fullscreen,setFullscreen]=useState(false);
  const [vrAvailable,setVrAvailable]=useState(false);
  const [vrActive,setVrActive]=useState(false);
  const [vrError,setVrError]=useState('');
  const [vrSceneId,setVrSceneId]=useState<string|null>(null);
  const projectRef=useRef<StudioProject|null>(null);
  projectRef.current=project;
  const needSceneRef=useRef(onNeedScene);needSceneRef.current=onNeedScene;
  const vrStop=useRef<null|(()=>void)>(null);
  useEffect(()=>{void vrSupported().then(setVrAvailable);return ()=>vrStop.current?.();},[]);
  const firstSceneId=project?.scenes[0]?.id??'';
  useEffect(()=>{
    if(!showIntro||!project?.introEnabled||!project.introUrl)return;
    // The intro starts before the media download. Its duration isn't restarted
    // when progressive media hydration triggers a new project object.
    const timer=window.setTimeout(()=>setIntroCompleted(true),(project.introDuration??6)*1000);
    const onMessage=(event:MessageEvent)=>{
      try{
        if(event.origin!==new URL(project.introUrl).origin)return;
        const kind=typeof event.data==='string'?event.data:event.data?.type;
        if(['intro:done','intro-finished','novavisio:intro-finished'].includes(kind))setIntroCompleted(true);
      }catch{}
    };
    window.addEventListener('message',onMessage);
    return ()=>{window.clearTimeout(timer);window.removeEventListener('message',onMessage);};
  },[showIntro,project?.introEnabled,project?.introUrl,project?.introDuration]);
  useEffect(()=>{
    // Never reveal a loading screen between the intro and the first panorama.
    if(showIntro&&introCompleted&&firstPanoramaReady)setShowIntro(false);
  },[showIntro,introCompleted,firstPanoramaReady]);
  const reportPanoramaReady=(id:string)=>{
    if(id!==firstSceneId)return;
    setFirstPanoramaReady(true);
    // The static Scala/WebCloud wrapper can reveal the live visit when its viewer is ready.
    if(window.parent!==window)window.parent.postMessage({type:'novavisio:tour-ready'},'*');
  };
  const wrap=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const sync=()=>setFullscreen(document.fullscreenElement===wrap.current);
    document.addEventListener('fullscreenchange',sync);
    return ()=>document.removeEventListener('fullscreenchange',sync);
  },[]);
  const theme=project?.barStyle??defaultBarStyle();
  const popupCloseIcon=project?.icons?.find(icon=>icon.id===project?.closeIconId);
  const cssVars={
    '--nv-close-icon-image':popupCloseIcon?`url("${popupCloseIcon.dataUrl}")`:'none',
    '--nv-bar-bg':theme.background,
    '--nv-bar-outline':theme.outline,
    '--nv-button-bg':theme.button,
    '--nv-button-outline':theme.buttonOutline,
    '--nv-icon-color':theme.icon,
    '--nv-bar-border-width':theme.outlineWidth+'px',
    '--nv-button-border-width':theme.buttonOutlineWidth+'px',
    '--nv-bar-roundness':theme.roundness+'px'
  } as CSSProperties;
  if(!project || !Array.isArray(project.scenes)||!project.scenes.length)return <main className="tour-empty">Cette visite ne contient aucun panorama.</main>;
  const current=project.scenes.find(s=>s.id===sceneId)??project.scenes[0];
  const move=(id:string,via?:Hotspot)=>{if(project.scenes.some(s=>s.id===id)){onNeedScene?.(id);
    setArrival(via&&via.arrivalYaw!==undefined?{sceneId:id,yaw:via.arrivalYaw,pitch:via.arrivalPitch??0,zoom:panoramaArrivalZoom(via)}:null);
    setSceneId(id);setModal(null);setPhoto(null);setVideo(null);}};
  const openLink=(title:string,url:string)=>{
    const checked=checkedLink(url);
    if(!checked)return;
    if(/^https?:\/\//.test(checked))setModal({title,url:checked});
    else window.location.href=checked;
  };
  const information=(h:Hotspot)=>setModal({title:h.title,text:h.text});
  const act=(item:BottomBarItem)=>{
    if(item.type==='gallery'){setGalleryId(item.id);return;}
    if(item.type==='navigation'){
      move(item.target||project.scenes[0].id);
    }else if(item.url && checkedLink(item.url)){
      openLink(item.title,item.url);
    }else if(item.type==='information'){
      setModal({title:item.title,text:item.text});
    }
  };
  const enterVr=async()=>{
    if(vrActive||!projectRef.current)return;
    setVrError('');
    try{
      vrStop.current=await startVr({
        getProject:()=>projectRef.current as StudioProject,
        startSceneId:current.id,
        ensureScene:id=>needSceneRef.current?.(id),
        onSceneChange:id=>setVrSceneId(id),
        onEnd:last=>{vrStop.current=null;setVrActive(false);setVrSceneId(null);if(projectRef.current?.scenes.some(s=>s.id===last))setSceneId(last);}
      });
      setVrActive(true);
    }catch(error){setVrError(error instanceof Error?error.message:'Impossible de démarrer la VR.');}
  };
  const toggleFull=async()=>{
    try{
      if(document.fullscreenElement)await document.exitFullscreen();
      else await wrap.current?.requestFullscreen();
    }catch{/* Le navigateur peut interdire le plein écran. */}
  };
  return <main className={'tour-app'+(popupCloseIcon?' nv-custom-close':'')} ref={wrap} style={cssVars} data-scene={vrSceneId||current.id}>
    {current.dataUrl?<Pano scene={current} icons={project.icons??[]} arrival={arrival} navigate={move} info={information} linked={openLink} image={(h,from)=>{setZoomFrom(from??null);setPhoto(h);}} video={(h,from)=>{setZoomFrom(from??null);setVideo(h);}} onReady={reportPanoramaReady}/>:<div className="tour-loading">Chargement du panorama…</div>}
    <button type="button" className="tour-fullscreen" onClick={()=>void toggleFull()} aria-label={fullscreen?'Quitter le plein écran':'Passer en plein écran'}>
      {fullscreen?<Minimize size={21}/>:<Maximize size={21}/>}
    </button>
    {vrAvailable&&<button type="button" className="tour-vr" onClick={()=>void enterVr()} disabled={vrActive} aria-label="Entrer en VR">{vrActive?'VR en cours…':'🥽 Entrer en VR'}</button>}
    {vrError&&<div className="tour-vr-error" role="alert" onClick={()=>setVrError('')}>{vrError}</div>}
    {project.bottomBar?.length>0&&<nav className="tour-bottom-bar" style={cssVars} aria-label="Navigation de la visite">
      {project.bottomBar.map(item=>{
        const icon=project.icons?.find(i=>i.id===item.iconId);
        return <button type="button" style={icon?{'--nv-bar-btn':barIconSize(item)+'px'} as CSSProperties:undefined} className={'tour-bar-button '+(icon?'has-custom-png':'')} key={item.id} onClick={()=>act(item)} aria-label={item.title} title={item.title}>
          <span className="tour-bar-icon">{icon?<IconStateVisual icons={project.icons??[]} normal={item.iconId} hover={item.hoverIconId} pressed={item.pressedIconId} size={barIconSize(item)}/>:<Symbol name={item.builtinIcon??'info'}/>}</span>
        </button>;
      })}
    </nav>}
    <ContinuousMusic project={project} scene={(vrSceneId&&project.scenes.find(x=>x.id===vrSceneId))||current} paused={showIntro||!!video}/>
    {video&&<VideoPopup hotspot={video} origin={zoomFrom} onClose={()=>setVideo(null)}/>}
    {modal&&<div className="tour-overlay" onClick={()=>setModal(null)}>
      <section className="tour-dialog" onClick={e=>e.stopPropagation()} aria-label={modal.title}>
        <header><h2>{modal.title}</h2><button type="button" aria-label="Fermer" onClick={()=>setModal(null)}><X/></button></header>
        {modal.url?<><iframe src={modal.url} title={modal.title} loading="lazy" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox" referrerPolicy="strict-origin-when-cross-origin" allow="fullscreen"/>
          <p className="tour-embed-note">Si ce contenu ne s'affiche pas, le site externe peut empêcher son intégration.</p></>:
          <p className="tour-dialog-text">{modal.text||'Aucune information renseignée.'}</p>}
      </section>
    </div>}
    {galleryId&&(()=>{
      const item=project.bottomBar?.find(b=>b.id===galleryId&&b.type==='gallery');
      if(!item)return null;
      return <PanoramaGallery title={item.galleryTitle||item.title||'Panoramas'} currentId={current.id}
        entries={galleryEntries(item,project.scenes).map(e=>({sceneId:e.sceneId,label:e.label,thumb:project.scenes.find(s=>s.id===e.sceneId)?.dataUrl||undefined}))}
        onPick={id=>{move(id);setGalleryId(null);}} onClose={()=>setGalleryId(null)}/>;
    })()}
    {photo?.imageDataUrl&&<ZoomImage variant="tour" src={photo.imageDataUrl} alt={photo.title} origin={zoomFrom} animate={photo.fadeOnClick!==false} onClose={()=>setPhoto(null)}/>}
    {showIntro&&project.introUrl&&<div className="tour-intro">
      <iframe title={'Introduction de '+project.name} src={project.introUrl} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" referrerPolicy="strict-origin-when-cross-origin"/>

    </div>}
  </main>;
}
