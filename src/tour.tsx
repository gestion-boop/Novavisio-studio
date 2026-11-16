import {FloorPlanDialog} from './FloorPlan';
import {getFloorPlans} from './storage';
import {EmbeddedPage} from './EmbeddedPage';
import {informationFont} from './InformationEditor';
import {projectForSpaceExport} from './spaces';
import {isPopupMedia,popupMediaMarkerHtml} from './mediaDisplay';
import {framedPhotoSource} from './photoFrame';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {ui,pick} from './i18n';
import {Viewer} from '@photo-sphere-viewer/core';
import {PANORAMA_MIN_FOV,PANORAMA_MAX_FOV,panoramaArrivalZoom} from './panoramaLens';
import {MarkersPlugin,type MarkerConfig} from '@photo-sphere-viewer/markers-plugin';
import {frameWorldCorners,haloMarkers,straightenFrames,frameIdsOf,visibleVideoFrames} from './sphericalFrame';
import {syncMarkers,resetMarkers,crossfadeMarkers} from './markerSync';
import {attachSphereLayer} from './sphereLayer';
import {startPosterBounce} from './posterBounce';
import {PanoramaGallery,galleryEntries,galleryBackgroundSrc} from './gallery';
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';
import {Maximize,Minimize,X,ArrowRight,Globe,Home,Phone,CalendarDays,Info,Images,LayoutGrid,Utensils,MapPin,Menu,Star,Settings} from 'lucide-react';
import {barIconSize,barHeightFor,defaultBarStyle,defaultFrameCorners,STUDIO_LANGUAGES,type StudioProject,type Scene,type Hotspot,type BottomBarItem,type WindowAnimation,type CustomIcon} from './storage';
import {imageMarkerHtml,responsiveFrameSize} from './imageFrame';
import {iconStateHtml,IconStateVisual,videoMarkerHtml,VideoPopup,ZoomImage,type ZoomOrigin} from './media';
import {ContinuousMusic} from './continuousMusic';
import {PhotoGallery} from './PhotoGallery';
import {settingsButtonStyle,settingsSize} from './settingsButton';
import {useVisitorPrefs,setSound,setLang,effectiveLang} from './visitorPrefs';
import {startVr,vrSupported} from './vr';
import './visitor.css';
import './windowAnim.css';
import {attachSunFlare} from './sunFlare';
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
function publicMarker(h:Hotspot,icons:CustomIcon[],height:number,zoom:number,lang:string='fr'):MarkerConfig {
  if(h.type==='image'&&h.imageDataUrl&&!isPopupMedia(h)){
    return {id:h.id,imageLayer:framedPhotoSource(h),position:frameWorldCorners(h),hoverScale:false};
  }
  const source=h.videoDataUrl||h.videoUrl;
  if(h.type==='video'&&source&&!isPopupMedia(h)){
    return {id:h.id,videoLayer:source,position:frameWorldCorners(h),
      autoplay:h.videoAutoplay!==false,hoverScale:false};
  }
  const isMedia=(h.type==='image'||h.type==='video')&&!isPopupMedia(h);
  const size=isMedia?responsiveFrameSize(h,height,zoom):null;
  const isSphere=h.type==='navigation'&&!!h.sphere&&!!h.target;
  const w=isSphere?Math.max(40,Math.min(120,h.iconSize??90)):size?.width??(isPopupMedia(h)?Math.min(80,Math.max(16,h.iconSize??42)):Math.min(80,Math.max(16,h.iconSize??28)));
  const hh=size?.height??w;
  const custom=icons.find(icon=>icon.id===h.iconId);
  const html=isPopupMedia(h)?popupMediaMarkerHtml(h,icons):h.type==='image'?imageMarkerHtml(undefined,h.frameCorners??defaultFrameCorners(),w,hh,pick(h.title,h.titleTranslations,lang)):
    h.type==='video'?videoMarkerHtml(h,w,hh):
    isSphere?'<span class="nv-sphere-hit"></span>':
    custom?iconStateHtml(icons,h.iconId,h.hoverIconId,h.pressedIconId,'tour-marker'):
    '<span class="tour-marker">'+(h.type==='navigation'?'➜':h.type==='lien'?'↗':'i')+'</span>';
  return {id:h.id,position:{yaw:h.yaw,pitch:h.pitch},size:{width:w,height:hh},
    anchor:'center center',html,tooltip:pick(h.title,h.titleTranslations,lang),
    ...(isSphere?{data:{nvSphere:{size:w,target:h.target,rim:h.sphereRimColor,glow:h.sphereRimIntensity}}}:{})};
}
type ViewerProps={
  sphereImage:(sceneId:string)=>string|undefined;
  scene:Scene;
  icons:CustomIcon[];
  night:boolean;
  nightTexture?:string;
  navigate:(id:string,via?:Hotspot)=>void;
  arrival?:{sceneId:string;yaw:number;pitch:number;zoom:number}|null;
  info:(h:Hotspot)=>void;
  linked:(title:string,url:string,mode?:'embed'|'tab')=>void;
  image:(h:Hotspot,from?:ZoomOrigin|null)=>void;
  video:(h:Hotspot,from?:ZoomOrigin|null)=>void;
  onReady:(sceneId:string)=>void;
};
function Pano({sphereImage,scene,icons,night,nightTexture,arrival,navigate,info,linked,image,video,onReady,lang='fr'}:ViewerProps&{lang?:string}){
  const langRef=useRef(lang);langRef.current=lang;
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
  const currentTexture=useRef(scene.dataUrl);
  const handlers=useRef({sphereImage,scene,icons,arrival,navigate,info,linked,image,video,onReady});
  handlers.current={sphereImage,scene,icons,arrival,navigate,info,linked,image,video,onReady};
  useEffect(()=>{
    if(!container.current)return;
    const instance=new Viewer({
      container:container.current,
      panorama:night&&nightTexture?nightTexture:scene.dataUrl,
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
    const detachSpheres=attachSphereLayer(instance,id=>handlers.current.sphereImage(id));
    instance.addEventListener('before-render',()=>{
      const ids=frameIdsOf(handlers.current.scene.hotspots);
      if(ids.length)straightenFrames(plugin,ids);
    });
    plugin.addEventListener('select-marker',({marker})=>{
      const a=handlers.current;
      const h=a.scene.hotspots.find(x=>x.id===marker.id);
      if(!h)return;
      if(h.type==='navigation'){if(h.target)a.navigate(h.target,h);}
      else if(h.type==='image'||(h.type==='information'&&h.imageDataUrl))a.image(h,lastPointer.current);
      else if(h.type==='video' && (isPopupMedia(h)||h.videoOpenFullscreen!==false))a.video(h,lastPointer.current);
      else if(h.url && checkedLink(h.url))a.linked(h.title,h.url,h.linkMode);
      else if(h.type==='information')a.info(h);
    });
    const refreshMarkers=()=>{
      const viewHeight=container.current?.clientHeight||550;
      const current=handlers.current;
      if(loadedScene.current!==current.scene.id)return;
      syncMarkers(instance,visibleVideoFrames(current.scene.hotspots).flatMap(h=>[
        publicMarker(h,current.icons,viewHeight,instance.getZoomLevel(),langRef.current),...(haloMarkers(h) as unknown as MarkerConfig[])]));
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
    return ()=>{detachSpheres();stopBounce();if(pending)cancelAnimationFrame(pending);observer.disconnect();viewer.current=null;loadedScene.current=null;instance.destroy();};
  },[]);
  useEffect(()=>{
    const instance=viewer.current;
    if(!instance)return;
    return attachSunFlare(instance,scene.sunFlare);
  },[scene.id,scene.sunFlare?.yaw,scene.sunFlare?.pitch,scene.sunFlare?.intensity,scene.sunFlare?.length,scene.sunFlare?.orientation,scene.sunFlare?.rays]);
  useEffect(()=>{
    const instance=viewer.current;
    if(!instance||loadedScene.current===scene.id)return;
    const next=scene;
    const pendingArrival=handlers.current.arrival;
    const arrivalFor=pendingArrival&&pendingArrival.sceneId===next.id?pendingArrival:null;
    let disposed=false;
    // Fondu enchaîné des marqueurs, déclenché au moment exact où le fondu de l'image commence.
    let fade:Promise<void>|null=null;
    const markersNow=()=>visibleVideoFrames(next.hotspots).flatMap(h=>[publicMarker(h,handlers.current.icons,container.current?.clientHeight||550,instance.getZoomLevel(),langRef.current),...(haloMarkers(h) as unknown as MarkerConfig[])]);
    const onLoaded=()=>{instance.removeEventListener('panorama-loaded',onLoaded);fade=crossfadeMarkers(instance,markersNow(),600);};
    instance.addEventListener('panorama-loaded',onLoaded);
    const nextTexture=night&&nightTexture?nightTexture:next.dataUrl;
    void instance.setPanorama(nextTexture,{
      showLoader:false,transition:{effect:'fade',rotation:false,speed:600},
      // La flèche utilisée a sa propre vue d'arrivée ; sinon, celle par défaut du panorama.
      position:{yaw:arrivalFor?.yaw??next.arrivalYaw??0,pitch:arrivalFor?.pitch??next.arrivalPitch??0},
      zoom:arrivalFor?.zoom??panoramaArrivalZoom(next)
    }).then(async success=>{
      if(disposed||!success)return;
      if(fade)await fade;else resetMarkers(instance,markersNow());
      if(disposed)return;
      loadedScene.current=next.id;
      currentTexture.current=nextTexture;
      syncMarkers(instance,markersNow());
    }).catch(()=>{/* Keep previous panorama if the new photo cannot load. */});
    return ()=>{disposed=true;instance.removeEventListener('panorama-loaded',onLoaded);};
  },[scene.id,scene.dataUrl]);
  useEffect(()=>{
    const instance=viewer.current;
    if(!instance||loadedScene.current!==scene.id)return;
    const texture=night&&nightTexture?nightTexture:scene.dataUrl;
    if(currentTexture.current===texture)return;
    let disposed=false;
    const position=instance.getPosition(),zoom=instance.getZoomLevel();
    void instance.setPanorama(texture,{showLoader:false,transition:{effect:'fade',rotation:false,speed:750},position,zoom})
      .then(success=>{if(success&&!disposed)currentTexture.current=texture;})
      .catch(()=>{/* Conserve la version précédente si la photo de nuit ne charge pas. */});
    return ()=>{disposed=true;};
  },[scene.id,night,nightTexture,scene.dataUrl]);
  useEffect(()=>{
    const instance=viewer.current;
    if(!instance||loadedScene.current!==scene.id)return;
    // Images, icon files and screen videos may arrive after the main panorama.
    syncMarkers(instance,visibleVideoFrames(scene.hotspots).flatMap(h=>[
      publicMarker(h,icons,container.current?.clientHeight||550,instance.getZoomLevel(),langRef.current),...(haloMarkers(h) as unknown as MarkerConfig[])]));
  },[scene.id,scene.hotspots,icons,lang]);
  return <div className="tour-panorama" ref={container}/>;
}
/**
 * Lecteur de visite. Deux usages :
 *  - visite exportée : le projet est lu dans <script id="nv-project-data"> ;
 *  - lien public : le projet est fourni en propriété (et peut se compléter progressivement : `onNeedScene` demande
 *    le chargement d'un panorama pas encore téléchargé).
 */
export function Tour({project:given,onNeedScene}:{project?:StudioProject;onNeedScene?:(id:string)=>void}){
  // Mode casque : dérivé de l'URL sans toucher au projet ni à sa publication.
  const vrEntry=new URLSearchParams(window.location.search).get('vr')==='1';
  const [vrPromptDismissed,setVrPromptDismissed]=useState(false);
  const [fromPage]=useState<StudioProject|null>(()=>{
    try{const el=document.getElementById('nv-project-data');return el?JSON.parse(el.textContent??'null'):null;}catch{return null;}
  });
  const sourceProject=given??fromPage;
  const [gallerySpace,setGallerySpace]=useState<string|null>(null);
  const chosenSpace=sourceProject?.spaces?.find(space=>space.id===gallerySpace);
  const project=sourceProject&&chosenSpace?projectForSpaceExport(sourceProject,chosenSpace):sourceProject;
  const vrAllowed=project?.vrEnabled!==false; // Compatibilité des projets publiés avant l'option VR
  const [sceneId,setSceneId]=useState(()=>project?.scenes[0]?.id??'');
  const [nightSceneId,setNightSceneId]=useState<string|null>(null);
  const prefs=useVisitorPrefs();
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [floorPlanOpen,setFloorPlanOpen]=useState(false);
  const [modal,setModal]=useState<{title:string;url?:string;text?:string;fontFamily?:string}|null>(null);
  const [photo,setPhoto]=useState<Hotspot|null>(null);
  const [zoomFrom,setZoomFrom]=useState<ZoomOrigin|null>(null);
  const [galleryId,setGalleryId]=useState<string|null>(null);
  const [photosId,setPhotosId]=useState<string|null>(null);
  const [arrival,setArrival]=useState<{sceneId:string;yaw:number;pitch:number;zoom:number}|null>(null);
  const [video,setVideo]=useState<Hotspot|null>(null);
  const [showIntro,setShowIntro]=useState(()=>Boolean(
    project?.introEnabled && project.introUrl?.startsWith('https://') &&
    // A generated Scaleway wrapper already starts the intro at HTML first paint.
    !(window.parent!==window && new URLSearchParams(window.location.search).get('external_intro')==='1')
  ));
  const [introEnding,setIntroEnding]=useState(false);
  const [introFrameReady,setIntroFrameReady]=useState(false);
  const [firstPanoramaReady,setFirstPanoramaReady]=useState(false);
  const introInitialised=useRef(Boolean(project));
  const [fullscreen,setFullscreen]=useState(false);
  const [mobileExpanded,setMobileExpanded]=useState(false);
  // Étape 1 du pilote Quest 3 : détection WebXR explicite et non bloquante.
  // Une visite 360° classique reste utilisable si le navigateur refuse immersive-vr.
  const [vrCapability,setVrCapability]=useState<'checking'|'available'|'unavailable'>('checking');
  const vrAvailable=vrCapability==='available';
  const [vrActive,setVrActive]=useState(false);
  // Mode d'essai temporaire, jamais sauvegardé dans le projet ni activé par défaut.
  const [vrError,setVrError]=useState('');
  const [vrSceneId,setVrSceneId]=useState<string|null>(null);
  const projectRef=useRef<StudioProject|null>(null);
  projectRef.current=project;
  const needSceneRef=useRef(onNeedScene);needSceneRef.current=onNeedScene;
  const vrStop=useRef<null|(()=>void)>(null);
  useEffect(()=>{
    let alive=true;
    void vrSupported().then(ok=>{if(alive)setVrCapability(ok?'available':'unavailable');})
      .catch(()=>{if(alive)setVrCapability('unavailable');});
    return ()=>{alive=false;vrStop.current?.();};
  },[]);
  const firstSceneId=project?.scenes[0]?.id??'';
  // Le projet public peut arriver après le premier rendu (chargement cloud).
  // L'introduction doit alors tout de même se lancer une seule fois.
  useEffect(()=>{
    if(introInitialised.current||!project)return;
    introInitialised.current=true;
    if(!vrEntry&&project.introEnabled&&project.introUrl?.startsWith('https://')&&
       !(window.parent!==window&&new URLSearchParams(window.location.search).get('external_intro')==='1')){
      setShowIntro(true);
    }
  },[project]);
  useEffect(()=>{
    if(!showIntro||!introFrameReady||!project?.introEnabled||!project.introUrl)return;
    // Durée stricte : le panorama se prépare derrière l'intro, mais son
    // chargement ne bloque jamais sa disparition. Une vidéo externe ne peut
    // ni raccourcir ni prolonger la durée choisie.
    setIntroEnding(false);
    const duration=Math.max(2,Math.min(60,project.introDuration??6))*1000;
    const fadeMs=Math.min(350,duration/4);
    const fade=window.setTimeout(()=>setIntroEnding(true),duration-fadeMs);
    const finish=window.setTimeout(()=>setShowIntro(false),duration);
    return ()=>{window.clearTimeout(fade);window.clearTimeout(finish);};
  },[showIntro,introFrameReady,project?.introEnabled,project?.introUrl,project?.introDuration]);
  const reportPanoramaReady=(id:string)=>{
    if(id!==firstSceneId)return;
    setFirstPanoramaReady(true);
    // The external wrapper can use this to know the viewer is ready;
    // the intro timer itself does not depend on this event.
    if(window.parent!==window)window.parent.postMessage({type:'novavisio:tour-ready'},'*');
  };
  const wrap=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const sync=()=>setFullscreen(document.fullscreenElement===wrap.current);
    document.addEventListener('fullscreenchange',sync);
    return ()=>document.removeEventListener('fullscreenchange',sync);
  },[]);
  useEffect(()=>{
    // iOS Safari may not expose Element.requestFullscreen. In that case a
    // fixed viewport mode expands to the usable screen (the browser chrome
    // is still controlled by Safari). Keep scroll position intact on exit.
    if(!mobileExpanded)return;
    const before=document.body.style.overflow;
    document.body.style.overflow='hidden';
    document.documentElement.classList.add('nv-tour-mobile-expanded');
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setMobileExpanded(false);};
    document.addEventListener('keydown',escape);
    return ()=>{
      document.body.style.overflow=before;
      document.documentElement.classList.remove('nv-tour-mobile-expanded');
      document.removeEventListener('keydown',escape);
    };
  },[mobileExpanded]);
  const theme=project?.barStyle??defaultBarStyle();
  const popupCloseIcon=project?.icons?.find(icon=>icon.id===project?.closeIconId);
  const popupCloseHoverIcon=project?.icons?.find(icon=>icon.id===project?.closeIconHoverId);
  const popupClosePressedIcon=project?.icons?.find(icon=>icon.id===project?.closeIconPressedId);
  const cssVars={
    '--nv-close-icon-image':popupCloseIcon?`url("${popupCloseIcon.dataUrl}")`:'none',
    '--nv-close-icon-hover-image':popupCloseHoverIcon?`url("${popupCloseHoverIcon.dataUrl}")`:'none',
    '--nv-close-icon-pressed-image':popupClosePressedIcon?`url("${popupClosePressedIcon.dataUrl}")`:'none',
    '--nv-bar-bg':theme.background,
    '--nv-bar-outline':theme.outline,
    '--nv-button-bg':theme.button,
    '--nv-button-outline':theme.buttonOutline,
    '--nv-icon-color':theme.icon,
    '--nv-bar-border-width':theme.outlineWidth+'px',
    '--nv-button-border-width':theme.buttonOutlineWidth+'px',
    '--nv-bar-roundness':theme.roundness+'px',
    '--nv-bar-width':theme.width?theme.width+'px':'max-content',
    '--nv-bar-height':Math.max(theme.height??82,project?.bottomBar?.length?barHeightFor(project.bottomBar):0)+'px'
  } as CSSProperties;
  // Animation d'ouverture des fenêtres : posée sur <html> pour toutes les fenêtres (info, photo, vidéo, galeries, plan).
  useEffect(()=>{document.documentElement.dataset.windowAnim=project?.windowAnimation??'fade';document.documentElement.style.setProperty('--nv-win-dur',(project?.windowAnimationMs??700)+'ms');},[project?.windowAnimation,project?.windowAnimationMs]);
  if(!project || !Array.isArray(project.scenes)||!project.scenes.length)return <main className="tour-empty">Cette visite ne contient aucun panorama.</main>;
  const activeLanguages=project.languages??(project.name.toLowerCase().includes('figurotta')?STUDIO_LANGUAGES.map(lang=>lang.code):['fr']);
  const lang=effectiveLang(prefs,activeLanguages);
  const settingsIcon=project.settingsIconId??project.settingsHoverIconId??project.settingsPressedIconId;
  const hasSettingsIcon=!!project.icons?.find(i=>i.id===settingsIcon&&i.dataUrl);
  const current=project.scenes.find(s=>s.id===sceneId)??project.scenes[0];
  const nightSource=project.scenes.find(sc=>sc.id===current.nightSourceSceneId);
  const nightTexture=current.nightDataUrl??nightSource?.dataUrl;
  const nightActive=nightSceneId===current.id&&!!nightTexture;
  const move=(id:string,via?:Hotspot)=>{if(project.scenes.some(s=>s.id===id)){onNeedScene?.(id);
    setArrival(via&&via.arrivalCustom&&via.arrivalYaw!==undefined?{sceneId:id,yaw:via.arrivalYaw,pitch:via.arrivalPitch??0,zoom:panoramaArrivalZoom(via)}:null);
    setSceneId(id);setModal(null);setPhoto(null);setVideo(null);}};
  const openLink=(title:string,url:string,mode?:'embed'|'tab')=>{
    const checked=checkedLink(url);
    if(!checked)return;
    if(mode==='tab'&&/^https?:/.test(checked)){window.open(checked,'_blank','noopener,noreferrer');return;}
    if(/^https?:\/\//.test(checked)){
      const parsed=new URL(checked);
      if(parsed.hostname.endsWith('.vercel.app')){parsed.searchParams.set('langs',activeLanguages.join(','));parsed.searchParams.set('lang',lang);}
      setModal({title,url:parsed.toString()});
    }
    else window.location.href=checked;
  };
  /** Style d'ouverture de la fenêtre qui s'ouvre : propre au bouton ou au point, sinon réglage général. */
  const openWith=(own?:WindowAnimation)=>{document.documentElement.dataset.windowAnim=own??project.windowAnimation??'fade';};
  const information=(h:Hotspot)=>{openWith(h.openAnimation);setModal({title:pick(h.title,h.titleTranslations,lang),text:lang==='fr'?h.text:(h.translations?.[lang]||h.text),fontFamily:h.fontFamily});};
  const act=(item:BottomBarItem)=>{
    openWith(item.openAnimation);
    if(item.type==='plan'){setFloorPlanOpen(true);return;}
    if(item.type==='gallery'){setGalleryId(item.id);return;}
    if(item.type==='photos'){setPhotosId(item.id);return;}
    if(item.type==='navigation'){
      move(item.target||project.scenes[0].id);
    }else if(item.url && checkedLink(item.url)){
      openLink(item.title,item.url,item.linkMode);
    }else if(item.type==='information'){
      setModal({title:pick(item.title,item.titleTranslations,lang),text:lang==='fr'?item.text:(item.translations?.[lang]||item.text),fontFamily:item.fontFamily});
    }
  };
  const enterVr=async()=>{
    if(vrActive||!projectRef.current||projectRef.current.vrEnabled===false)return;
    setVrError('');
    try{
      vrStop.current=await startVr({
        getProject:()=>projectRef.current as StudioProject,
        startSceneId:current.id,
        ensureScene:id=>needSceneRef.current?.(id),
        onSceneChange:id=>setVrSceneId(id),
        onOpenEmbedded:(title,url)=>{
          // Iframe de la visite classique, positionnée en absolu dans
          // .tour-overlay ; aucun nouvel onglet pour le navigateur Quest.
          setModal({title,url});
        },
        onEnd:last=>{vrStop.current=null;setVrActive(false);setVrSceneId(null);if(projectRef.current?.scenes.some(s=>s.id===last))setSceneId(last);}
      });
      setVrActive(true);
    }catch(error){setVrError(error instanceof Error?error.message:'Impossible de démarrer la VR.');}
  };
  const toggleFull=async()=>{
    if(mobileExpanded){setMobileExpanded(false);return;}
    if(document.fullscreenElement){
      try{await document.exitFullscreen();}catch{/* Browser-specific rejection */}
      return;
    }
    const root=wrap.current;
    if(!root)return;
    // Prefer native fullscreen (Android Chrome / supporting iOS browsers).
    // This call is made directly from a visitor click.
    if(typeof root.requestFullscreen==='function'){
      try{await root.requestFullscreen();return;}catch{/* Switch to mobile viewport fallback */}
    }
    setMobileExpanded(true);
  };
  return <main className={'tour-app'+(popupCloseIcon?' nv-custom-close':'')+(mobileExpanded?' nv-tour-viewport-expanded':'')} ref={wrap} style={cssVars} data-scene={vrSceneId||current.id}>
    {!showIntro&&firstPanoramaReady&&<div className="nv-tour-room-heading" aria-label="Pièce actuellement visitée">
      <strong title={pick(current.name,current.nameTranslations,lang)}>{pick(current.name,current.nameTranslations,lang)}</strong>
      {current.surfaceM2!==undefined&&<span>{current.surfaceM2.toLocaleString('fr-FR',{maximumFractionDigits:2})} m²</span>}
    </div>}
    {current.dataUrl?<Pano lang={lang} sphereImage={id=>project.scenes.find(x=>x.id===id)?.dataUrl} scene={current} icons={project.icons??[]} night={nightActive} nightTexture={nightTexture} arrival={arrival} navigate={move} info={information} linked={openLink} image={(h,from)=>{openWith(h.openAnimation);setZoomFrom(from??null);setPhoto(h);}} video={(h,from)=>{openWith(h.openAnimation);setZoomFrom(from??null);setVideo(h);}} onReady={reportPanoramaReady}/>:<div className="tour-loading">Chargement du panorama…</div>}
    {nightTexture&&<div className="nv-daynight-switch" role="group" aria-label="Mode jour et nuit">
      <button type="button" className={!nightActive?'is-active':''} aria-pressed={!nightActive} onClick={()=>setNightSceneId(null)}>☀ <span>Jour</span></button>
      <button type="button" className={nightActive?'is-active':''} aria-pressed={nightActive} onClick={()=>setNightSceneId(current.id)}>☾ <span>Nuit</span></button>
    </div>}
    {vrAllowed&&vrAvailable&&!vrEntry&&<button type="button" className="tour-vr" onClick={()=>void enterVr()} disabled={vrActive} aria-label="Passer de la visite 360° à l'immersion dans le casque">{vrActive?'VR en cours…':'🥽 Mode immersif VR'}</button>}
    {vrAllowed&&vrEntry&&!vrPromptDismissed&&!vrActive&&<div role="dialog" aria-label="Mode casque Immosphera360 VR" style={{position:'absolute',inset:0,zIndex:120,background:'rgba(4,19,28,.88)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{maxWidth:470,width:'100%',background:'#102f3d',border:'1px solid #79aab5',borderRadius:22,padding:28,textAlign:'center',color:'#f5fbfc',boxShadow:'0 16px 70px #0009'}}>
        <div style={{fontSize:44}}>🥽</div>
        <h2 style={{margin:'6px 0 14px',fontSize:26}}>Immosphera360 VR</h2>
        <p style={{lineHeight:1.5,color:'#bdd7dd'}}>Votre visite NovaStudio reste accessible en mode classique, avec sa barre et ses points interactifs. Le casque peut également ouvrir l'immersion WebXR.</p>
        {vrCapability==='checking'&&<p role="status" style={{color:'#f5d394'}}>Détection du mode immersif du casque…</p>}
        {vrCapability==='available'&&<div>
          <p role="status" style={{color:'#9ee8cb',fontWeight:700}}>✓ Mode immersif WebXR disponible</p>
          <button type="button" onClick={()=>void enterVr()} style={{background:'#e6c17c',color:'#182833',padding:'14px 22px',border:'none',borderRadius:12,fontWeight:750,cursor:'pointer'}}>🥽 Entrer en immersion 360°</button>
        </div>}
        {vrCapability==='unavailable'&&<p role="status" style={{color:'#f6d6a5'}}>Ce navigateur ne propose pas actuellement le mode immersif WebXR. La visite 360° classique reste disponible.</p>}
        <div><button type="button" onClick={()=>setVrPromptDismissed(true)} style={{marginTop:18,border:0,background:'transparent',color:'#d2e7e9',padding:10,cursor:'pointer'}}>Voir la visite classique avec sa barre NovaStudio</button></div>
        {vrError&&<p role="alert" style={{color:'#ffc1b8'}}>{vrError}</p>}
      </div>
    </div>}

    {vrError&&<div className="tour-vr-error" role="alert" onClick={()=>setVrError('')}>{vrError}</div>}
    {project.bottomBar?.length>0&&<nav className="tour-bottom-bar" style={cssVars} aria-label="Navigation de la visite">
      {project.bottomBar.map(item=>{
        const icon=project.icons?.find(i=>i.id===item.iconId);
        return <button type="button" style={{'--nv-bar-btn':(barIconSize(item)+(icon?0:10))+'px'} as CSSProperties} className={'tour-bar-button '+(icon?'has-custom-png':'')} key={item.id} onClick={()=>act(item)} aria-label={pick(item.title,item.titleTranslations,lang)} title={pick(item.title,item.titleTranslations,lang)}>
          <span className="tour-bar-icon">{icon?<IconStateVisual icons={project.icons??[]} normal={item.iconId} hover={item.hoverIconId} pressed={item.pressedIconId} size={barIconSize(item)} zoom={(item.iconZoom??100)/100} trim={project.barIconTrim!==false}/>:<Symbol name={item.builtinIcon??'info'}/>}</span>
        </button>;
      })}
    </nav>}
    {!showIntro&&firstPanoramaReady&&<div className="nv-visitor-settings">
      <button type="button" style={settingsButtonStyle(project)} className={'nv-visitor-settings-btn'+(hasSettingsIcon?' has-custom-png':'')} aria-label={ui('settings',lang)} aria-expanded={settingsOpen} title={ui('settingsTitle',lang)} onClick={()=>setSettingsOpen(o=>!o)}>
        {hasSettingsIcon?<IconStateVisual icons={project.icons??[]} normal={settingsIcon} hover={project.settingsHoverIconId} pressed={project.settingsPressedIconId} size={settingsSize(project)}/>:<Settings size={Math.round(settingsSize(project)*0.42)}/>}
      </button>
      {settingsOpen&&<div className="nv-visitor-settings-panel" role="dialog" aria-label={ui('settings',lang)}>
        <button type="button" className="nv-vs-fullscreen" onClick={()=>void toggleFull()} aria-label={(fullscreen||mobileExpanded)?'Réduire la visite':'Agrandir la visite'}>
          {(fullscreen||mobileExpanded)?<Minimize size={18}/>:<Maximize size={18}/>} {(fullscreen||mobileExpanded)?'Réduire la visite':'Plein écran'}
        </button>
        <strong>{ui('sound',lang)}</strong><div className="nv-vs-row">
          <button type="button" className={prefs.sound==='on'?'is-on':''} onClick={()=>setSound('on')}>🔊 {ui('soundOn',lang)}</button>
          <button type="button" className={prefs.sound==='off'?'is-on':''} onClick={()=>setSound('off')}>🔇 {ui('soundOff',lang)}</button>
        </div>
        {activeLanguages.length>1&&<><strong>{ui('language',lang)}</strong><div className="nv-vs-row nv-vs-flags">{STUDIO_LANGUAGES.filter(l=>activeLanguages.includes(l.code)).map(l=><button type="button" key={l.code} title={l.name} aria-label={l.name} aria-pressed={lang===l.code} className={lang===l.code?'is-on':''} onClick={()=>setLang(l.code)}>{l.flag}</button>)}</div></>}
      </div>}
    </div>}
    <ContinuousMusic project={project} scene={(vrSceneId&&project.scenes.find(x=>x.id===vrSceneId))||current} paused={showIntro||!firstPanoramaReady||(!!video&&video.videoMasterSound!==false)} showToggle={false}/>
    {video&&<VideoPopup hotspot={video} origin={zoomFrom} onClose={()=>setVideo(null)}/>}
    {modal&&<div className="tour-overlay" onClick={()=>setModal(null)}>
      <section className="tour-dialog" onClick={e=>e.stopPropagation()} aria-label={modal.title}>
        <header><h2>{modal.title}</h2><button type="button" aria-label={ui('close',lang)} onClick={()=>setModal(null)}><X/></button></header>
        {modal.url?<EmbeddedPage url={modal.url} title={modal.title}/>:<p className="tour-dialog-text" style={{fontFamily:informationFont(modal.fontFamily)+', Arial, sans-serif'}}>{modal.text||ui('noInfo',lang)}</p>}

      </section>
    </div>}
    {gallerySpace&&<button type="button" className="nv-return-project" onClick={()=>{setGallerySpace(null);setSceneId(sourceProject?.scenes[0]?.id??'');}}>← Projet complet</button>}
    {floorPlanOpen&&<FloorPlanDialog lang={lang} plans={getFloorPlans(project)} scenes={project.scenes} currentId={current.id} onClose={()=>setFloorPlanOpen(false)} onPick={id=>{move(id);setFloorPlanOpen(false);}}/>}
    {photosId&&(()=>{
      const item=project.bottomBar?.find(b=>b.id===photosId&&b.type==='photos');
      return item?<PhotoGallery title={pick(item.title,item.titleTranslations,lang)||ui('photos',lang)} items={item.photos??[]} onClose={()=>setPhotosId(null)}/>:null;
    })()}
    {galleryId&&(()=>{
      const item=project.bottomBar?.find(b=>b.id===galleryId&&b.type==='gallery');
      if(!item)return null;
      return <PanoramaGallery title={item.galleryTitle||pick(item.title,item.titleTranslations,lang)||ui('panoramas',lang)} currentId={current.id} viewSource={id=>{const sc=project.scenes.find(x=>x.id===id);return sc?{dataUrl:sc.dataUrl,yaw:sc.arrivalYaw,pitch:sc.arrivalPitch}:undefined;}} background={galleryBackgroundSrc(item,project.scenes,project.spaces)}
        entries={galleryEntries(item,project.scenes,project.spaces).map(e=>{const sc=project.scenes.find(x=>x.id===e.sceneId);return {sceneId:e.sceneId,spaceId:e.spaceId,label:sc&&sc.name===e.label?pick(sc.name,sc.nameTranslations,lang):e.label,thumb:e.coverDataUrl??(project.scenes.find(s=>s.id===e.sceneId)?.dataUrl||undefined)};})}
        onPick={(id,spaceId)=>{if(spaceId){setGallerySpace(spaceId);setSceneId(id);}else move(id);setGalleryId(null);}} onClose={()=>setGalleryId(null)}/>;
    })()}
    {(photo?.imageDataUrl||photo?.imageUrl)&&<ZoomImage variant="tour" frameStyle={photo.imageFrameStyle} src={(photo.imageDataUrl||photo.imageUrl)!} alt={photo.title} origin={zoomFrom} animate={photo.fadeOnClick!==false} onClose={()=>setPhoto(null)}/>}
    {!showIntro&&!firstPanoramaReady&&<div className="nv-tour-startup-mask" role="status" aria-live="polite">
      <div className="nv-tour-startup-spinner" aria-hidden="true"/>
      <span>Préparation de votre visite immersive…</span>
    </div>}
    {showIntro&&project.introUrl&&<div className={"tour-intro"+(introEnding?" is-ending":"")}>
      <iframe title={'Introduction de '+project.name} src={project.introUrl}
        onLoad={()=>setIntroFrameReady(true)}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        referrerPolicy="strict-origin-when-cross-origin"/>
      {!introFrameReady&&<div className="nv-intro-loading-mask" role="status" aria-live="polite">
        <div className="nv-tour-startup-spinner" aria-hidden="true"/>
        <span>Votre expérience immersive se prépare…</span>
      </div>}
    </div>}
  </main>;
}
