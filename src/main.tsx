import {MediaIconSelector} from './MediaIconSettings';
import {InformationEditor,informationFont} from './InformationEditor';
import {EmbeddedPage} from './EmbeddedPage';
import {SpaceCover} from './SpaceCover';
import {BarGalleryEditor,type BarGalleryTab} from './BarGalleryEditor';
import './workflow.css';
import {CreationToolbar} from './CreationToolbar';
import {reorderItems,useGripSort} from './gripSort';
import {useHorizontalSort} from './hSort';
import {isPopupMedia,popupMediaMarkerHtml,MediaDisplayControl} from './mediaDisplay';
import './creation.css';
import {ProjectPreparation} from './ProjectPreparation';
import {SkinLibrary} from './SkinLibrary';
import {BarDimensions,InspectorSection} from './PreparationControls';
import './preparation.css';
import {PhotoFramePicker,framedPhotoSource} from './photoFrame';
declare const __NV_BUILD_TIME__:string;

import {useCallback, useEffect, useMemo, useRef, useState, type CSSProperties,type ReactNode} from 'react';
import {flushSync} from 'react-dom';
import {createRoot} from 'react-dom/client';
import {CornerEditor,imageMarkerHtml,responsiveFrameSize} from './imageFrame';
import {exportStaticTour} from './exportTour';
import {useLiveSession,LiveOverlay,useLiveInvites,sendLiveInvite,sendLiveShot} from './liveSession';
import {LiveShareDialog} from './LiveShareDialog';
import {WriteHand} from './WriteHand';
import {scenesInSpace,projectForSpaceExport,safeSpaceName,type StudioSpace} from './spaces';
import {IconStateVisual,iconStateHtml,videoMarkerHtml,VideoPopup,ZoomImage,type ZoomOrigin} from './media';
import {ContinuousMusic} from './continuousMusic';
import {PANORAMA_MIN_FOV,PANORAMA_MAX_FOV,panoramaArrivalZoom} from './panoramaLens';
import {CloudPanel} from './CloudPanel';
import {ClientPanel,type ClientLink} from './ClientPanel';
import {ClientsDirectory} from './ClientsDirectory';
import type {ImportedClientVideo} from './novagenVideos';
import {useCloudSync,type SyncState} from './cloudSync';
import {cloudConfigured,confirmEmailLink,readLink,writeLink,type CloudLink} from './cloud';
import {refreshActivePublication,publishPermanent,getPublication,publicationActive,shareUrl,wrapperHtml} from './share';
import {readSpaceCloudLink,writeSpaceCloudLink} from './spaces';
import {SharePanel} from './SharePanel';
import {PrivatePanel} from './PrivatePanel';
import {PanoramaGallery,galleryEntries,galleryBackgroundSrc} from './gallery';
import {useSceneThumbs} from './thumbs';
import {Undo2,Redo2,MessageSquarePlus,Bell,Users,Utensils,Images,LayoutGrid,Phone,Info,Home,CalendarDays,MapPin,Globe,ArrowRight,Menu,Star,Eye,Edit3,Trash2,Plus,ChevronLeft,ChevronRight,Sparkles,Download,Cloud,Link2,Layers,Lock,Maximize2,Minimize2,ChevronDown,Search,PanelLeftClose,PanelRightClose,Save,RefreshCw,X,Music,StickyNote,Play,PanelBottom,Smile,MapPin as PinIcon,Upload,Pencil,Moon,Palette,Ruler,Camera,Share2} from 'lucide-react';
import {checkProject,type CheckIssue} from './projectCheck';
import {IssueCallout,IssueBanner,type IssueFocus} from './IssueCallout';
import {ProjectCheckPanel} from './ProjectCheckPanel';
import {CommentsPanel} from './CommentsPanel';
import {captureScreen,ShotEditor} from './ScreenshotTool';
import {SectionHub} from './SectionHub';
import {MediaPicker} from './MediaPicker';
import {SpacesActions} from './SpacesActions';
import {mergeImportedSpaces} from './spaceTransfer';
import {rememberMedia} from './mediaLibrary';
import {IconLibrary} from './IconLibrary';
import {NotesPanel} from './NotesPanel';
import {Viewer} from '@photo-sphere-viewer/core';
import {MarkersPlugin,type MarkerConfig} from '@photo-sphere-viewer/markers-plugin';
import {syncMarkers,resetMarkers,crossfadeMarkers} from './markerSync';
import {startPosterBounce} from './posterBounce';
import {SVG_ICON_PRESETS,svgIconPreview,svgIconMarkup,pngFromSvg,recolorIconPng,paletteFromLogo,type SvgIconDesign} from './svgIcons';
import {frameWorldCorners,editingFrameControls,cornerMarkerId,centerMarkerId,FRAME_KEYS,type SphericalPoint} from './sphericalFrame';
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';
import {loadProject,newProject,readImage,readPanorama,saveProject,projectJsonParts,readProjectFile,SaveConflictError,barIconSize,uid,validateProject,defaultBar,isSafeIconDataUrl,type Hotspot,type CustomIcon,type BottomBarItem,type Scene,type StudioProject,type ProjectComment,type StudioLanguage,STUDIO_LANGUAGES,type BarStyle,defaultBarStyle,defaultFrameCorners,isSafeFrameImage,isSafeVideoData,isSafeAudioData,isSafeMediaUrl,type FrameSphericalCorners,VIDEO_MAX_BYTES} from './storage';
import './style.css';
import './media.css';
import {XMark} from './XMark';

type EditMode = Hotspot['type'] | null;
type PanelTab = 'points' | 'panoramas' | 'bar' | 'icons' | 'intro' | 'elements' | 'music' | 'client';
type EmbedFrame = { title:string; url:string };
function ensureFrameReferences(project:StudioProject,height:number):StudioProject {
  const baseline=Math.max(100,Math.min(3000,height||550));
  return {...project,scenes:project.scenes.map(s=>({...s,hotspots:s.hotspots.map(h=>
    (h.type==='image'||h.type==='video')&&!h.frameReferenceHeight?{...h,frameReferenceHeight:baseline}:h
  )}))};
}

const barColorFields:Array<{key:'background'|'outline'|'button'|'buttonOutline'|'icon';label:string}> = [
  {key:'background',label:'Fond de la barre'},
  {key:'outline',label:'Contour de la barre'},
  {key:'button',label:'Fond des boutons'},
  {key:'buttonOutline',label:'Contour des boutons'},
  {key:'icon',label:'Couleur des pictogrammes'}
];
const glyphs = {home:Home,info:Info,calendar:CalendarDays,map:MapPin,phone:Phone,web:Globe,arrow:ArrowRight,menu:Menu,star:Star,utensils:Utensils,images:Images,grid:LayoutGrid};
type GlyphKey = keyof typeof glyphs;
function BarGlyph({name}:{name:string}) {
  const Glyph = glyphs[name as GlyphKey] ?? Info;
  return <Glyph size={29} strokeWidth={1.9} aria-hidden="true" />;
}
function safeLink(raw:string):string|null {
  const link = raw.trim();
  if (!/^(https?:\/\/|mailto:|tel:)/i.test(link)) return null;
  try { const url=new URL(link); return ['https:','http:','mailto:','tel:'].includes(url.protocol)?link:null; }
  catch { return null; }
}
function launchLink(link:string) {
  const verified=safeLink(link);
  if (!verified) return false;
  if (/^https?:/i.test(verified)) window.open(verified,'_blank','noopener,noreferrer');
  else window.location.href=verified;
  return true;
}
type PanoramaProps = {
  scene: Scene; icons: CustomIcon[]; mode: EditMode; preview: boolean; autoNavigation:boolean; night:boolean; nightTexture?:string;
  onCreate: (yaw:number,pitch:number)=>void;
  onPick: (id:string)=>void;
  onRemoveNavigation:(id:string)=>void;
  onNavigate: (id:string,via?:Hotspot)=>void;
  arrival?:{sceneId:string;yaw:number;pitch:number;zoom:number}|null; // vue d'arrivée propre à la flèche utilisée
  onInfo: (hotspot:Hotspot)=>void;
  onLink: (title:string,url:string,mode?:'embed'|'tab')=>void;
  onImage: (h:Hotspot,from?:ZoomOrigin|null)=>void;
  onVideo: (h:Hotspot,from?:ZoomOrigin|null)=>void;
  selectedId:string;
  onWorldFrameChange:(id:string,corners:FrameSphericalCorners,center?:SphericalPoint)=>void;
  onMarkerMove:(id:string,yaw:number,pitch:number)=>void;
  onAssetDrop:(iconId:string,yaw:number,pitch:number)=>void;
  onCameraChange:(yaw:number,pitch:number,zoom:number)=>void;
  turn?:{n:number;yaw:number;pitch:number;zoom?:number;fast?:boolean}|null; // demande de rotation de la vue (parcours guidé)
};
function markerFor(h:Hotspot,icons:CustomIcon[],viewerHeight:number,selectedId:string,preview:boolean,zoom=60,autoNavigation=false):MarkerConfig {
  // Image and video layers are rendered ON the sphere, not as HTML billboards.
  // Every pixel stays anchored to its four world-coordinate corners at any zoom or yaw.
  if(h.type==='image'&&h.imageDataUrl&&!isPopupMedia(h)){
    return {id:h.id,imageLayer:framedPhotoSource(h),position:frameWorldCorners(h),hoverScale:false};
  }
  const videoSource=h.videoDataUrl||h.videoUrl;
  if(h.type==='video'&&videoSource&&!isPopupMedia(h)){
    return {id:h.id,videoLayer:videoSource,position:frameWorldCorners(h),
      autoplay:h.videoAutoplay!==false,hoverScale:false};
  }
  const isMedia=(h.type==='image'||h.type==='video')&&!isPopupMedia(h);
  const sz=isPopupMedia(h)?Math.min(80,Math.max(16,h.iconSize??42)):Math.max(16,Math.min(80,h.iconSize??28));
  const scaled=isMedia?responsiveFrameSize(h,viewerHeight,zoom):null;
  const width=scaled?.width??sz;
  const height=scaled?.height??sz;
  const symbol=h.type==='navigation'?'➜':h.type==='lien'?'↗':'i';
  const iconHtml=iconStateHtml(icons,h.iconId,h.hoverIconId,h.pressedIconId);
  const content=isPopupMedia(h)?popupMediaMarkerHtml(h,icons):h.type==='image'?imageMarkerHtml(undefined,h.frameCorners??defaultFrameCorners(),width,height,h.title):
    h.type==='video'?videoMarkerHtml(h,width,height):
    iconHtml||'<span class="nv-marker" style="width:100%;height:100%" aria-label="Point interactif">'+symbol+'</span>';
  const editing=!preview&&selectedId===h.id;
  const autoArrow=!preview&&autoNavigation&&h.type==='navigation';
  const redCross='<button type="button" class="nv-marker-remove-auto" aria-label="Supprimer cet élément" title="Supprimer cet élément"><XMark/></button>';
  const html=autoArrow?'<span class="nv-drag-target nv-nav-auto-marker" data-nv-marker-id="'+h.id+'">'+content+redCross+'</span>':
    editing?'<span class="nv-drag-target" data-nv-marker-id="'+h.id+'">'+content+
      '<button type="button" class="nv-marker-move-grip" aria-label="Déplacer ce point" title="Glisser pour déplacer ce point">✥</button>'+redCross+'</span>':content;
  return {id:h.id,position:{yaw:h.yaw,pitch:h.pitch},
    html,
    size:{width,height},anchor:'center center',tooltip:h.title};
}
function markersForScene(scene:Scene,icons:CustomIcon[],height:number,selectedId:string,preview:boolean,zoom=60,autoNavigation=false):MarkerConfig[]{
  const all:MarkerConfig[]=[];
  for(const h of scene.hotspots){
    all.push(markerFor(h,icons,height,selectedId,preview,zoom,autoNavigation));
    const hasMedia=h.type==='image'?!!h.imageDataUrl:
      h.type==='video'?!!(h.videoDataUrl||h.videoUrl):false;
    if(!preview&&selectedId===h.id&&hasMedia&&!isPopupMedia(h)){
      all.push(...editingFrameControls(h));
    }
  }
  return all;
}
/** Lightweight, read-only spherical preview for a hovered gallery entry.
 * Only one instance exists, and it never changes the editor's active scene.
 */
function FullscreenGalleryHoverPreview({scene,thumb,onOrientation}:{scene:Scene;thumb?:string;onOrientation?:(view:{yaw:number;pitch:number;zoom:number})=>void}){
  const host=useRef<HTMLDivElement>(null);
  const [ready,setReady]=useState(false);
  const orientationRef=useRef(onOrientation);orientationRef.current=onOrientation;
  useEffect(()=>{
    setReady(false);
    const el=host.current;
    if(!el||!scene.dataUrl)return;
    let instance:Viewer|null=null;
    let alive=true;
    try{
      instance=new Viewer({
        container:el,
        panorama:scene.dataUrl,
        navbar:[],
        mousemove:true,mousewheel:true,touchmoveTwoFingers:false,
        defaultYaw:scene.arrivalYaw??0,
        defaultPitch:scene.arrivalPitch??0,
        defaultZoomLvl:panoramaArrivalZoom(scene),
        minFov:PANORAMA_MIN_FOV,maxFov:PANORAMA_MAX_FOV,
        fisheye:false,loadingTxt:'',
      });
      const report=()=>{if(alive&&instance)orientationRef.current?.({yaw:instance.getPosition().yaw,pitch:instance.getPosition().pitch,zoom:instance.getZoomLevel()});};
      instance.addEventListener('ready',()=>{if(alive){setReady(true);report();}});
      instance.addEventListener('position-updated',report);
      instance.addEventListener('zoom-updated',report);
    }catch{/* A thumbnail fallback stays visible if WebGL cannot load. */}
    return ()=>{alive=false;instance?.destroy();};
  },[scene.id,scene.dataUrl,scene.arrivalYaw,scene.arrivalPitch,scene.arrivalZoom,scene.arrivalZoomModel]);
  return <div className="nv-hover-preview-media">
    {thumb&&<img className={'nv-hover-preview-thumb'+(ready?' is-loaded':'')} src={thumb} alt="" draggable={false}/>}
    <div ref={host} className="nv-hover-preview-viewer" aria-label={'Vue 360° de '+scene.name}/>
    {!ready&&<span className="nv-hover-preview-loading">Aperçu 360°</span>}
  </div>;
}

function Panorama({scene,icons,mode,preview,autoNavigation,night,nightTexture,arrival,onCreate,onPick,onRemoveNavigation,onNavigate,onInfo,onLink,onImage,onVideo,selectedId,onWorldFrameChange,onMarkerMove,onAssetDrop,onCameraChange,turn}:PanoramaProps) {
  const box = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer|null>(null);
  const loadedSceneRef=useRef<string|null>(null);
  const currentTextureRef=useRef(scene.dataUrl);
  const lastPointer=useRef<ZoomOrigin|null>(null);
  const suppressMarkerClick=useRef<string|null>(null); // Suppress only the click belonging to a removed or dragged marker.
  const actions = useRef({scene,icons,mode,preview,autoNavigation,arrival,onCreate,onPick,onRemoveNavigation,onNavigate,onInfo,onLink,onImage,onVideo,selectedId,onWorldFrameChange,onMarkerMove,onAssetDrop,onCameraChange});
  actions.current = {scene,icons,mode,preview,autoNavigation,arrival,onCreate,onPick,onRemoveNavigation,onNavigate,onInfo,onLink,onImage,onVideo,selectedId,onWorldFrameChange,onMarkerMove,onAssetDrop,onCameraChange};

  useEffect(()=>{
    const root=box.current;
    if(!root)return;
    const remember=(e:PointerEvent)=>{lastPointer.current={x:e.clientX,y:e.clientY};};
    root.addEventListener('pointerdown',remember,true);
    return ()=>root.removeEventListener('pointerdown',remember,true);
  },[]);
  useEffect(()=>{
    if (!box.current) return;
    const viewer = new Viewer({
      container:box.current, panorama:night&&nightTexture?nightTexture:scene.dataUrl,
      // Le bouton plein écran natif n'agrandit que le lecteur 360° et cache les éléments personnalisés.
      // La vue complète (lecteur + barre) est désormais gérée par App.
      navbar:[],mousemove:true,mousewheel:true,touchmoveTwoFingers:false,
      moveSpeed:1,defaultZoomLvl:panoramaArrivalZoom(scene),
      defaultYaw:scene.arrivalYaw??0,defaultPitch:scene.arrivalPitch??0,
      minFov:PANORAMA_MIN_FOV,maxFov:PANORAMA_MAX_FOV,fisheye:false,loadingTxt:'',
      defaultTransition:{speed:260,rotation:false,effect:'fade'},
      plugins:[MarkersPlugin]
    });
    viewerRef.current = viewer;
    loadedSceneRef.current=scene.id;
    const reportCamera=()=>{
      const camera=viewer.getPosition();
      actions.current.onCameraChange(camera.yaw,camera.pitch,viewer.getZoomLevel());
    };
    viewer.addEventListener('ready',reportCamera);
    viewer.addEventListener('position-updated',reportCamera);
    let zoomFrame=0;
    const onZoom=()=>{
      reportCamera();
      if(zoomFrame)cancelAnimationFrame(zoomFrame);
      zoomFrame=requestAnimationFrame(()=>{
        const a=actions.current;
        if(!box.current||loadedSceneRef.current!==a.scene.id||!a.scene.hotspots.some(h=>
          (h.type==='image'&&!h.imageDataUrl)||
          (h.type==='video'&&!h.videoDataUrl&&!h.videoUrl)))return;
        syncMarkers(viewer,markersForScene(a.scene,a.icons,box.current!.clientHeight||550,a.selectedId,a.preview,viewer.getZoomLevel(),a.autoNavigation));
      });
    };
    viewer.addEventListener('zoom-updated',onZoom);
    const markers = viewer.getPlugin(MarkersPlugin) as MarkersPlugin;
    markers.addEventListener('select-marker',({marker})=>{
      const a=actions.current;
      const h=a.scene.hotspots.find(item=>item.id===marker.id);
      if (!h) return;
      if(suppressMarkerClick.current===marker.id){suppressMarkerClick.current=null;return;}
      if (a.preview) {
        if(h.type==='navigation' && h.target) a.onNavigate(h.target,h);
        else if(h.type==='information') {
          if (h.imageDataUrl) a.onImage(h,lastPointer.current);
          else if (h.url && safeLink(h.url)) a.onLink(h.title,h.url,h.linkMode);
          else a.onInfo(h);
        }
        else if(h.type==='lien' && h.url) a.onLink(h.title,h.url,h.linkMode);
        else if(h.type==='image') a.onImage(h,lastPointer.current);
        else if(h.type==='video' && (isPopupMedia(h)||h.videoOpenFullscreen!==false)) a.onVideo(h,lastPointer.current);
      } else {
        // En mode Éditer, un clic sélectionne TOUJOURS le point pour modifier ses réglages.
        // Pour tester les liens / photos sans perdre la sélection, utiliser les boutons de test
        // dans l'inspecteur, ou passer en mode Aperçu.
        a.onPick(h.id);
      }
    });
    viewer.addEventListener('click',event=>{
      const a=actions.current;
      if(!a.preview && a.mode && typeof event.data.yaw==='number' && typeof event.data.pitch==='number') {
        a.onCreate(event.data.yaw,event.data.pitch);
      }
    });
    const height=box.current?.clientHeight||550;
    resetMarkers(viewer,markersForScene(scene,icons,height,selectedId,preview,viewer.getZoomLevel(),actions.current.autoNavigation));
    // Aperçu seulement : léger rebond des affiches (photos / vidéos) pour montrer qu'elles sont cliquables.
    const stopBounce=startPosterBounce(viewer,()=>actions.current.scene,()=>actions.current.preview&&loadedSceneRef.current===actions.current.scene.id);
    return ()=>{stopBounce();if(zoomFrame)cancelAnimationFrame(zoomFrame);viewerRef.current=null;loadedSceneRef.current=null;viewer.destroy();};
  },[]);
  useEffect(()=>{
    const viewer=viewerRef.current;
    if(!viewer||loadedSceneRef.current===scene.id)return;
    let disposed=false;
    const next=scene;
    const pending=actions.current.arrival;
    const arrivalFor=pending&&pending.sceneId===next.id?pending:null;
    // Fondu enchaîné des marqueurs, déclenché au moment exact où le fondu de l'image commence.
    let fade:Promise<void>|null=null;
    const markersNow=()=>markersForScene(next,actions.current.icons,box.current?.clientHeight||550,actions.current.selectedId,actions.current.preview,viewer.getZoomLevel(),actions.current.autoNavigation);
    const onLoaded=()=>{viewer.removeEventListener('panorama-loaded',onLoaded);fade=crossfadeMarkers(viewer,markersNow(),260);};
    viewer.addEventListener('panorama-loaded',onLoaded);
    const nextTexture=night&&nightTexture?nightTexture:next.dataUrl;
    void viewer.setPanorama(nextTexture,{
      showLoader:false,transition:{effect:'fade',rotation:false,speed:260},
      // La flèche utilisée a sa propre vue d'arrivée ; sinon, celle par défaut du panorama.
      position:{yaw:arrivalFor?.yaw??next.arrivalYaw??0,pitch:arrivalFor?.pitch??next.arrivalPitch??0},
      zoom:arrivalFor?.zoom??panoramaArrivalZoom(next)
    }).then(async success=>{
      if(disposed||!success)return;
      if(fade)await fade;else resetMarkers(viewer,markersNow());
      if(disposed)return;
      loadedSceneRef.current=next.id;
      currentTextureRef.current=nextTexture;
      syncMarkers(viewer,markersNow()); // met à jour d'éventuelles modifications survenues pendant la transition
    }).catch(()=>{/* Keep the previous panorama if the image fails to load. */});
    return ()=>{disposed=true;viewer.removeEventListener('panorama-loaded',onLoaded);};
  },[scene.id,scene.dataUrl]);
  useEffect(()=>{
    // Parcours guidé : tourne la vue (ex. demi-tour pour placer le retour) sans changer de panorama.
    const viewer=viewerRef.current;
    if(!viewer||!turn||loadedSceneRef.current!==scene.id)return;
    void viewer.animate({yaw:turn.yaw,pitch:turn.pitch,...(turn.zoom!==undefined?{zoom:turn.zoom}:{}),speed:turn.fast?120:'40rpm'});
  },[turn?.n]);
  useEffect(()=>{
    // Jour/Nuit : on change seulement la texture, sans toucher à la caméra ni aux points.
    const viewer=viewerRef.current;
    if(!viewer||loadedSceneRef.current!==scene.id)return;
    const texture=night&&nightTexture?nightTexture:scene.dataUrl;
    if(currentTextureRef.current===texture)return;
    let disposed=false;
    const position=viewer.getPosition(),zoom=viewer.getZoomLevel();
    void viewer.setPanorama(texture,{
      showLoader:false,transition:{effect:'fade',rotation:false,speed:750},position,zoom
    }).then(success=>{if(success&&!disposed)currentTextureRef.current=texture;})
      .catch(()=>{/* Garde la photo précédente si la variante ne charge pas. */});
    return ()=>{disposed=true;};
  },[scene.id,night,nightTexture,scene.dataUrl]);
  useEffect(()=>{
    const refresh=()=>{
      const element=box.current;
      const v=viewerRef.current;
      if(!element||!v)return;
      const a=actions.current;
      if(loadedSceneRef.current!==a.scene.id)return;
      const height=element.clientHeight||550;
      syncMarkers(v,markersForScene(a.scene,a.icons,height,a.selectedId,a.preview,v.getZoomLevel(),a.autoNavigation));
    };
    refresh();
    if(!box.current)return;
    // ResizeObserver fires when the panorama enters or exits fullscreen.
    const observer=new ResizeObserver(refresh);
    observer.observe(box.current);
    return ()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const element=box.current;
    const v=viewerRef.current;
    if(!element||!v||loadedSceneRef.current!==scene.id)return;
    syncMarkers(v,markersForScene(scene,icons,element.clientHeight||550,selectedId,preview,v.getZoomLevel(),autoNavigation));
  },[scene.id,scene.hotspots,icons,selectedId,preview,autoNavigation]);
  useEffect(()=>{
    const root=box.current;
    if(!root)return;
    const down=(event:PointerEvent)=>{
      const target=event.target;
      if(!(target instanceof HTMLElement))return;
      const button=target.closest<HTMLButtonElement>('.nv-sphere-handle,.nv-sphere-center,.nv-sphere-remove');
      const a=actions.current;
      if(!button||a.preview||!a.selectedId)return;
      const id=button.dataset.frameId;
      if(id!==a.selectedId)return;
      if(button.classList.contains('nv-sphere-remove')){
        event.preventDefault();event.stopImmediatePropagation();
        suppressMarkerClick.current=id;
        a.onRemoveNavigation(id);
        window.setTimeout(()=>{if(suppressMarkerClick.current===id)suppressMarkerClick.current=null;},350);
        return;
      }
      if(a.mode)return;
      const h=a.scene.hotspots.find(h=>h.id===id);
      const viewer=viewerRef.current;
      if(!viewer||!h||!id||!(h.imageDataUrl||h.videoDataUrl||h.videoUrl))return;
      const key=button.dataset.corner as typeof FRAME_KEYS[number]|undefined;
      const movingCenter=button.classList.contains('nv-sphere-center');
      if(!movingCenter&&!FRAME_KEYS.includes(key!))return;
      const plugin=viewer.getPlugin(MarkersPlugin) as MarkersPlugin;
      event.preventDefault();
      event.stopImmediatePropagation();
      let coords=frameWorldCorners(h);
      let center={yaw:h.yaw,pitch:h.pitch};
      let touched=false;
      const update=(pointer:PointerEvent)=>{
        if(pointer.pointerId!==event.pointerId)return;
        pointer.preventDefault();
        pointer.stopImmediatePropagation();
        const rect=root.getBoundingClientRect();
        if(!rect.width||!rect.height)return;
        const point=viewer.dataHelper.viewerCoordsToSphericalCoords({
          x:pointer.clientX-rect.left,y:pointer.clientY-rect.top
        });
        if(!point)return;
        if(movingCenter){
          // Translate the entire frame without recomputing corner geometry.
          const deltaYaw=point.yaw-center.yaw,deltaPitch=point.pitch-center.pitch;
          coords=coords.map(p=>({
            yaw:p.yaw+deltaYaw,
            pitch:Math.max(-Math.PI/2+0.005,Math.min(Math.PI/2-0.005,p.pitch+deltaPitch))
          })) as FrameSphericalCorners;
          center={yaw:point.yaw,pitch:point.pitch};
        }else if(key){
          coords=coords.map((p,i)=>i===FRAME_KEYS.indexOf(key)?{yaw:point.yaw,pitch:point.pitch}:p) as FrameSphericalCorners;
        }
        touched=true;
        try {
          plugin.updateMarker({id:h.id,position:coords},false);
          FRAME_KEYS.forEach((corner,i)=>{
            plugin.updateMarker({id:cornerMarkerId(h.id,corner),position:coords[i]},false);
          });
          plugin.updateMarker({id:centerMarkerId(h.id),position:center},false);
          plugin.renderMarkers();
          viewer.needsUpdate(); // repaint the WebGL photo/video layer while dragging
        }catch{
          // If the frame was deleted during a drag, the edit will simply stop.
        }
      };
      const cleanup=()=>{
        document.removeEventListener('pointermove',update,true);
        document.removeEventListener('pointerup',finish,true);
        document.removeEventListener('pointercancel',cancel,true);
      };
      const finish=(pointer:PointerEvent)=>{
        if(pointer.pointerId!==event.pointerId)return;
        update(pointer);cleanup();
        if(touched)actions.current.onWorldFrameChange(h.id,coords,movingCenter?center:undefined);
      };
      const cancel=(pointer:PointerEvent)=>{
        if(pointer.pointerId===event.pointerId)cleanup();
      };
      document.addEventListener('pointermove',update,true);
      document.addEventListener('pointerup',finish,true);
      document.addEventListener('pointercancel',cancel,true);
    };
    root.addEventListener('pointerdown',down,true);
    return ()=>root.removeEventListener('pointerdown',down,true);
  },[]);
  useEffect(()=>{
    const root=box.current;
    if(!root)return;
    const onDown=(e:PointerEvent)=>{
      const t=e.target;
      if(!(t instanceof HTMLElement)||t.closest('.nv-direct-corner'))return;
      const a=actions.current;
      const remove=t.closest<HTMLElement>('.nv-marker-remove-auto');
      if(remove){
        const id=remove.closest<HTMLElement>('.nv-drag-target')?.dataset.nvMarkerId;
        if(!a.preview&&id&&(a.autoNavigation||a.selectedId===id)){
          e.preventDefault();e.stopImmediatePropagation();
          suppressMarkerClick.current=id;
          a.onRemoveNavigation(id);
          setTimeout(()=>{if(suppressMarkerClick.current===id)suppressMarkerClick.current=null;},350);
        }
        return;
      }
      const grip=t.closest<HTMLElement>('.nv-marker-move-grip');
      const autoMarker=a.autoNavigation?t.closest<HTMLElement>('.nv-nav-auto-marker'):null;
      const item=(grip||autoMarker)?.closest<HTMLElement>('.nv-drag-target');
      if(!item||a.preview)return;
      const id=item.dataset.nvMarkerId;
      const autoDrag=!!autoMarker&&a.scene.hotspots.some(h=>h.id===id&&h.type==='navigation');
      if(!autoDrag&&(a.mode||id!==a.selectedId))return;
      const viewer=viewerRef.current;
      if(!viewer||!id)return;
      // En mode classique la poignée déplace directement. En Auto, appui maintenu
      // 320 ms sur la flèche : clic bref = navigation, maintien = déplacement.
      let dragging=!autoDrag;
      if(!autoDrag){e.preventDefault();e.stopImmediatePropagation();}
      let timer:ReturnType<typeof setTimeout>|null=autoDrag?setTimeout(()=>{
        dragging=true;suppressMarkerClick.current=id;
      },320):null;
      let final:{yaw:number;pitch:number}|null=null;
      const move=(p:PointerEvent)=>{
        if(p.pointerId!==e.pointerId||!dragging)return;
        p.preventDefault();p.stopImmediatePropagation();
        const rect=root.getBoundingClientRect();
        const at=viewer.dataHelper.viewerCoordsToSphericalCoords({x:p.clientX-rect.left,y:p.clientY-rect.top});
        if(!at)return;
        final=at;
        try{(viewer.getPlugin(MarkersPlugin) as MarkersPlugin).updateMarker({id,position:at});}catch{}
      };
      const clear=()=>{
        if(timer)clearTimeout(timer);
        document.removeEventListener('pointermove',move,true);
        document.removeEventListener('pointerup',up,true);
        document.removeEventListener('pointercancel',cancel,true);
      };
      const up=(p:PointerEvent)=>{
        if(p.pointerId!==e.pointerId)return;
        move(p);clear();
        if(final)actions.current.onMarkerMove(id,final.yaw,final.pitch);
        if(autoDrag&&dragging)setTimeout(()=>{if(suppressMarkerClick.current===id)suppressMarkerClick.current=null;},350);
      };
      const cancel=(p:PointerEvent)=>{if(p.pointerId===e.pointerId){clear();suppressMarkerClick.current=null;}};
      document.addEventListener('pointermove',move,true);
      document.addEventListener('pointerup',up,true);
      document.addEventListener('pointercancel',cancel,true);
    };
    const over=(e:DragEvent)=>{if(e.dataTransfer?.types.includes('application/x-nv-icon'))e.preventDefault();};
    const drop=(e:DragEvent)=>{
      const icon=e.dataTransfer?.getData('application/x-nv-icon');
      if(!icon||actions.current.preview)return;
      const viewer=viewerRef.current;if(!viewer)return;
      e.preventDefault();
      const rect=root.getBoundingClientRect();
      const pos=viewer.dataHelper.viewerCoordsToSphericalCoords({x:e.clientX-rect.left,y:e.clientY-rect.top});
      if(pos)actions.current.onAssetDrop(icon,pos.yaw,pos.pitch);
    };
    root.addEventListener('pointerdown',onDown,true);root.addEventListener('dragover',over);root.addEventListener('drop',drop);
    return ()=>{root.removeEventListener('pointerdown',onDown,true);root.removeEventListener('dragover',over);root.removeEventListener('drop',drop);};
  },[]);
  return <div ref={box} className="panorama" />;
}

type HeaderMenu='file'|'share'|'display'|null;
type SceneFilter='all'|'with'|'without';
function readStudioLayout(){
  try{
    const raw=window.localStorage.getItem('nvstudio-sheet-v1')?window.localStorage.getItem('nvstudio-ui-layout-v1'):null;
    if(raw){const value=JSON.parse(raw) as Record<string,unknown>;return {
      leftHidden:value.leftHidden===true,rightHidden:value.rightHidden===true,
      density:value.density==='compact'?'compact' as const:'comfortable' as const
    };}
  }catch{/* Private browsing or storage disabled. */}
  return {leftHidden:false,rightHidden:true,density:'comfortable' as const}; // les réglages s'ouvrent à la demande (icône en haut à droite)
}
function App(){
  const studioRef=useRef<HTMLDivElement>(null);
  const topMenusRef=useRef<HTMLDivElement>(null);
  const [openTopMenu,setOpenTopMenu]=useState<HeaderMenu>(null);
  const [navigationDrawerOpen,setNavigationDrawerOpen]=useState(false);
  const [spacesDrawerOpen,setSpacesDrawerOpen]=useState(false);
  const [spaceDelete,setSpaceDelete]=useState<{id:string;target:string}|null>(null);  // fenêtre « supprimer un espace »
  const [spaceTransferTo,setSpaceTransferTo]=useState('');
  // Écran partagé (présence en direct à deux sur le même projet Cloud)
  const [liveProjectId,setLiveProjectId]=useState<string|null>(null);
  const [liveLabel,setLiveLabel]=useState('');
  const [liveDialogOpen,setLiveDialogOpen]=useState(false);
  const [liveLeads,setLiveLeads]=useState(true); // celui qui lance le partage pilote ; celui qui rejoint suit
  // Identité (projet Cloud + e-mail) pour recevoir les invitations « partager l'écran ».
  const [inviteIdentity,setInviteIdentity]=useState<{projectId:string;email:string}|null>(null);
  useEffect(()=>{
    let dead=false;
    const read=async()=>{
      const link=readLink();
      if(!link||!cloudConfigured){if(!dead)setInviteIdentity(null);return;}
      try{
        const {supabase}=await import('./cloud');
        const {data}=await supabase().auth.getSession();
        const email=data.session?.user?.email?.toLowerCase();
        if(dead)return;
        setInviteIdentity(prev=>!email?null:prev&&prev.projectId===link.projectId&&prev.email===email?prev:{projectId:link.projectId,email});
      }catch{/* hors ligne : on réessaie */}
    };
    void read();
    const timer=window.setInterval(()=>void read(),30000);
    return ()=>{dead=true;window.clearInterval(timer);};
  },[]);
  const pendingClientSaveRef=useRef(false);
  useEffect(()=>{
    // Garder le tiroir monté pour l'animation, tout en excluant ses commandes
    // du clavier et du focus lorsqu'il est refermé.
    document.getElementById('nv-workspace-spaces')?.toggleAttribute('inert',!spacesDrawerOpen);
  },[spacesDrawerOpen]);
  const [studioFullscreen,setStudioFullscreen]=useState(false);
  const [studioFallback,setStudioFallback]=useState(false);
  const [leftHidden,setLeftHidden]=useState(()=>readStudioLayout().leftHidden);
  const [rightHidden,setRightHidden]=useState(()=>readStudioLayout().rightHidden);
  const [sceneDensity,setSceneDensity]=useState<'compact'|'comfortable'>(()=>readStudioLayout().density);
  const [sceneSearch,setSceneSearch]=useState('');
  const [sceneFilter,setSceneFilter]=useState<SceneFilter>('all');
  useEffect(()=>{
    try{window.localStorage.setItem('nvstudio-sheet-v1','1');window.localStorage.setItem('nvstudio-ui-layout-v1',JSON.stringify({leftHidden,rightHidden,density:sceneDensity}));}
    catch{/* Viewing and editing still work if local preferences cannot be saved. */}
  },[leftHidden,rightHidden,sceneDensity]);
  useEffect(()=>{
    const outside=(event:PointerEvent)=>{
      if(!topMenusRef.current?.contains(event.target as Node))setOpenTopMenu(null);
    };
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){
        setOpenTopMenu(null);
        setNavigationDrawerOpen(false);
        if(studioFallback){setStudioFallback(false);setStudioFullscreen(false);}
      }
    };
    const changed=()=>{if(document.fullscreenElement!==studioRef.current && !studioFallback)setStudioFullscreen(false);};
    document.addEventListener('pointerdown',outside);
    document.addEventListener('keydown',key);
    document.addEventListener('fullscreenchange',changed);
    return ()=>{
      document.removeEventListener('pointerdown',outside);
      document.removeEventListener('keydown',key);
      document.removeEventListener('fullscreenchange',changed);
    };
  },[studioFallback]);
  async function toggleStudioFullscreen(){
    const root=studioRef.current;
    if(!root)return;
    setOpenTopMenu(null);
    if(studioFullscreen){
      if(document.fullscreenElement===root){
        try{await document.exitFullscreen();}catch{setStatus('Impossible de quitter le plein écran du Studio');}
      }else{setStudioFallback(false);setStudioFullscreen(false);}
      return;
    }
    try{
      if(document.fullscreenElement)await document.exitFullscreen();
      if(!root.requestFullscreen)throw Error('Fullscreen API unavailable');
      await root.requestFullscreen();
      setStudioFallback(false);setStudioFullscreen(true);
    }catch{
      // iOS and other browsers that do not allow the Fullscreen API.
      setStudioFallback(true);setStudioFullscreen(true);
    }
  }
  const [project,setProjectRaw]=useState<StudioProject>(newProject());
  // Historique Annuler / Rétablir (Ctrl+Z · Ctrl+Maj+Z · Ctrl+Y) : des modifications rapprochées comptent pour une seule action.
  const histRef=useRef<{past:StudioProject[];future:StudioProject[];last:number}>({past:[],future:[],last:0});
  const [,setHistTick]=useState(0);
  const setProject=useCallback((update:React.SetStateAction<StudioProject>)=>{
    setProjectRaw(prev=>{
      const next=typeof update==='function'?(update as (p:StudioProject)=>StudioProject)(prev):update;
      if(next===prev)return prev;
      const h=histRef.current,now=Date.now();
      if(now-h.last>700||!h.past.length){h.past.push(prev);if(h.past.length>60)h.past.shift();}
      h.last=now;h.future=[];
      return next;
    });
    setHistTick(t=>t+1);
  },[]);
  /** Remplace tout le projet (ouverture, nouveau projet…) : l'historique repart de zéro. */
  const resetProject=useCallback((p:StudioProject)=>{histRef.current={past:[],future:[],last:0};setProjectRaw(p);setHistTick(t=>t+1);},[]);
  const [svgWorkshopOpen,setSvgWorkshopOpen]=useState(true);
  const [svgPreset,setSvgPreset]=useState<string>('info');
  const [svgDesign,setSvgDesign]=useState<SvgIconDesign>({
    primary:'#146d84',secondary:'#ffffff',accent:'#58dfd0',gradient:true,shape:'circle'
  });
  const [svgExistingIcon,setSvgExistingIcon]=useState('');
  const [svgGenerating,setSvgGenerating]=useState(false);
  const svgLogoInput=useRef<HTMLInputElement>(null);
  const [ready,setReady]=useState(false);
  const [preparationOpen,setPreparationOpen]=useState(false);
  const [skinsOpen,setSkinsOpen]=useState(false);
  const [informationEdit,setInformationEdit]=useState<{sceneId:string;pointId:string}|null>(null);
  const [publishConfirm,setPublishConfirm]=useState(false);
  useEffect(()=>{if(!publishConfirm)return;document.querySelector<HTMLButtonElement>('.nv-publish-warning button')?.focus();
    const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setPublishConfirm(false);
      if(event.key==='Tab'){const buttons=[...document.querySelectorAll<HTMLButtonElement>('.nv-publish-warning button')];const first=buttons[0],last=buttons[buttons.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}
    };document.addEventListener('keydown',close);return ()=>document.removeEventListener('keydown',close);
  },[publishConfirm]);
  const preparationPrompted=useRef(false);
  const [savingManually,setSavingManually]=useState(false);
  const [updateAvailable,setUpdateAvailable]=useState(false);
  const [updateSnoozeUntil,setUpdateSnoozeUntil]=useState(0);   // « Plus tard » : la bannière revient après quelques minutes
  const updateReloadApproved=useRef(false);
  // Ne jamais recharger automatiquement : les projets Cloud sont sauvegardés
  // volontairement à la disquette. La détection est uniquement informative.
  useEffect(()=>{
    let stopped=false;
    let checking=false;
    const checkUpdate=async()=>{
      if(stopped||checking||document.visibilityState==='hidden')return;
      checking=true;
      try{
        const response=await fetch('/version.json?check='+Date.now(),{
          cache:'no-store',headers:{Accept:'application/json'}
        });
        if(!response.ok)return;
        const payload:unknown=await response.json();
        if(!payload||typeof payload!=='object'||!('buildTime' in payload))return;
        const remote=(payload as {buildTime:unknown}).buildTime;
        if(typeof remote!=='string')return;
        const publishedAt=Date.parse(remote);
        const openedAt=Date.parse(__NV_BUILD_TIME__);
        if(!stopped&&Number.isFinite(publishedAt)&&Number.isFinite(openedAt)&&publishedAt>openedAt){
          setUpdateAvailable(true);
        }
      }catch{/* Hors ligne ou publication en cours : nouvel essai plus tard. */}
      finally{checking=false;}
    };
    void checkUpdate();
    const interval=window.setInterval(()=>void checkUpdate(),30_000);
    // Fichier de l'ancienne version supprimé après un déploiement : la mise à jour est alors nécessaire.
    const onPreloadError=()=>setUpdateAvailable(true);
    window.addEventListener('vite:preloadError',onPreloadError);
    const onFocus=()=>{void checkUpdate();};
    const onVisibility=()=>{if(document.visibilityState==='visible')void checkUpdate();};
    window.addEventListener('focus',onFocus);
    window.addEventListener('online',onFocus);
    document.addEventListener('visibilitychange',onVisibility);
    return ()=>{
      stopped=true;window.clearInterval(interval);
      window.removeEventListener('focus',onFocus);
      window.removeEventListener('online',onFocus);
      document.removeEventListener('visibilitychange',onVisibility);
      window.removeEventListener('vite:preloadError',onPreloadError);
    };
  },[]);
  function reloadToLatestVersion(){
    if(savingManually||savingRef.current){
      setStatus('Sauvegarde en cours : actualise NovaStudio une fois terminée.');
      return;
    }
    if(ready&&projectRef.current!==savedRef.current){
      const proceed=window.confirm(
        'Des modifications du projet ne sont pas enregistrées. Enregistre avec la disquette avant de mettre à jour. Actualiser quand même et perdre ces modifications ?'
      );
      if(!proceed)return;
    }
    updateReloadApproved.current=true;
    window.location.reload();
  }
  const [activeId,setActiveId]=useState('');
  const [nightSceneId,setNightSceneId]=useState<string|null>(null);
  const [infoLanguage,setInfoLanguage]=useState<StudioLanguage>('fr');
  const [activeSpaceId,setActiveSpaceId]=useState<string|null>(null);
  async function toggleLive(){
    if(liveProjectId){setLiveProjectId(null);return;}
    const link=readLink();
    if(!link){setStatus('Écran partagé : ouvre d’abord le projet depuis le Cloud (bouton Cloud), comme la personne avec qui tu travailles.');return;}
    try{
      const {supabase}=await import('./cloud');
      const {data:{session}}=await supabase().auth.getSession();
      const email=session?.user?.email??'';
      setLiveLabel((email.split('@')[0]||'Invité').slice(0,24));
      setLiveProjectId(link.projectId);
    }catch(e){setStatus('Écran partagé indisponible : '+(e instanceof Error?e.message:String(e)));}
  }
  /** Démarre l'écran partagé et invite les personnes choisies. */
  async function startLiveWith(emails:string[],asLeader=true){
    setLiveDialogOpen(false);
    const link=readLink();
    if(!link){setStatus('Écran partagé : ouvre d’abord le projet depuis le Cloud (bouton Cloud), comme la personne avec qui tu travailles.');return;}
    try{
      const {supabase}=await import('./cloud');
      const {data:{session}}=await supabase().auth.getSession();
      const email=(session?.user?.email??'').toLowerCase();
      const label=(email.split('@')[0]||'Invité').slice(0,24);
      setLiveLabel(label);setLiveLeads(asLeader);setLiveProjectId(link.projectId);
      if(emails.length){
        await sendLiveInvite(link.projectId,label,email,emails);
        setStatus('Invitation envoyée à '+emails.map(e=>e.split('@')[0]).join(', ')+' : elle apparaît dans son NovaStudio ouvert sur ce projet.');
      }
    }catch(e){setStatus('Écran partagé indisponible : '+(e instanceof Error?e.message:String(e)));}
  }
  const [spaceManagerOpen,setSpaceManagerOpen]=useState(false);
  const [editingSpaceId,setEditingSpaceId]=useState<string|null>(null);
  const [editingSpaceName,setEditingSpaceName]=useState('');
  const cancelSpaceEditRef=useRef(false);
  const [selectedId,setSelectedId]=useState('');
  const [selectedBarId,setSelectedBarId]=useState('');
  const [barGalleryTab,setBarGalleryTab]=useState<BarGalleryTab>('spaces');
  const [panel,setPanel]=useState<PanelTab>('points');
  // Préférence d'affichage propre à ce navigateur, jamais enregistrée dans les visites.
  const [galleryVerticalOffset,setGalleryVerticalOffset]=useState(()=>{
    try{return Math.max(0,Math.min(260,Number(localStorage.getItem('nvstudio-gallery-offset')||0)||0));}
    catch{return 0;}
  });
  const galleryDragStart=useRef<{y:number;offset:number}|null>(null);
  useEffect(()=>{
    try{localStorage.setItem('nvstudio-gallery-offset',String(galleryVerticalOffset));}catch{/* Préférence facultative */}
  },[galleryVerticalOffset]);
  function beginGalleryVerticalDrag(e:React.PointerEvent<HTMLButtonElement>){
    if(e.button!==0)return;
    galleryDragStart.current={y:e.clientY,offset:galleryVerticalOffset};
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function moveGalleryVerticalDrag(e:React.PointerEvent<HTMLButtonElement>){
    const start=galleryDragStart.current;
    if(!start)return;
    setGalleryVerticalOffset(Math.max(0,Math.min(260,Math.round(start.offset+e.clientY-start.y))));
  }
  function endGalleryVerticalDrag(){galleryDragStart.current=null;}
  const [mode,setMode]=useState<EditMode>(null);
  // Assistant de navigation en chaîne : état temporaire, aucun enregistrement automatique.
  const [autoNavigation,setAutoNavigation]=useState(false);
  // Parcours guidé (Auto) : suit l'ordre des panoramas. 'forward' = poser la flèche vers le suivant, 'back' = demi-tour puis valider le retour.
  const [guide,setGuide]=useState<{phase:'forward'|'back';prevId?:string;fwdYaw:number;fwdPitch:number}|null>(null);
  const [turnRequest,setTurnRequest]=useState<{n:number;yaw:number;pitch:number;zoom?:number;fast?:boolean}|null>(null);
  const [preview,setPreview]=useState(false);
  const [clientVideoPlacement,setClientVideoPlacement]=useState<(ImportedClientVideo&{sceneId:string})|null>(null);
  useEffect(()=>{
    if(mode!=='video'||preview||clientVideoPlacement?.sceneId!==activeId)setClientVideoPlacement(null);
  },[mode,preview,activeId,clientVideoPlacement?.sceneId]);
  const [status,setStatus]=useState('Initialisation…');
  const [help,setHelp]=useState(false);
  const [info,setInfo]=useState<Hotspot|null>(null);
  const [frame,setFrame]=useState<EmbedFrame|null>(null);
  const [imageZoom,setImageZoom]=useState<Hotspot|null>(null);
  const [zoomFrom,setZoomFrom]=useState<ZoomOrigin|null>(null);
  const [videoZoom,setVideoZoom]=useState<Hotspot|null>(null);
  const [introVisible,setIntroVisible]=useState(false);
  const [introEnding,setIntroEnding]=useState(false);
  const [exporting,setExporting]=useState(false);
  const [cloudOpen,setCloudOpen]=useState(false);
  const [authNotice,setAuthNotice]=useState<string|null>(null);
  // Lien de confirmation « à bouton » : ?token_hash=…&type=… (le jeton n'est consommé qu'au clic).
  const [emailLink,setEmailLink]=useState<{tokenHash:string;type:string;busy:boolean;error:string;done:boolean}|null>(()=>{
    const q=new URLSearchParams(window.location.search);
    const tokenHash=q.get('token_hash'),type=q.get('type');
    return tokenHash&&type?{tokenHash,type,busy:false,error:'',done:false}:null;
  });
  useEffect(()=>{
    // Retour d'un lien reçu par e-mail (connexion / confirmation) : Supabase ajoute l'erreur dans l'adresse.
    const params=new URLSearchParams(window.location.hash.replace(/^#/,''));
    const code=params.get('error_code')??params.get('error');
    if(!code)return;
    setAuthNotice(code==='otp_expired'?'Le lien reçu par e-mail a expiré ou a déjà été utilisé.':
      (params.get('error_description')??'La connexion par lien a échoué.').replace(/\+/g,' '));
    window.history.replaceState(null,'',window.location.pathname+window.location.search);
  },[]);
  const [shareOpen,setShareOpen]=useState(false);
  const [clientOpen,setClientOpen]=useState(false);
  const [privateOpen,setPrivateOpen]=useState(false);
  const [photoFeedback,setPhotoFeedback]=useState('');
  const videoInput=useRef<HTMLInputElement>(null);
  const audioInput=useRef<HTMLInputElement>(null);
  const nightInput=useRef<HTMLInputElement>(null);
  const upload=useRef<HTMLInputElement>(null);
  const projectInput=useRef<HTMLInputElement>(null);
  const placedMediaInput=useRef<HTMLInputElement>(null);
  const pendingMediaPlacement=useRef<{sceneId:string;hotspotId:string;type:'image'|'video'}|null>(null);
  // Choix d'un média : la bibliothèque (déjà utilisés) s'ouvre d'abord ; l'import depuis l'ordinateur reste facultatif.
  const [mediaPicker,setMediaPicker]=useState<{sceneId:string;hotspotId:string;type:'image'|'video';fresh:boolean}|null>(null);
  const [mediaVersion,setMediaVersion]=useState(0);
  useEffect(()=>{
    const input=placedMediaInput.current;if(!input)return;
    // Sélecteur du système annulé : on reste sur la bibliothèque, rien n'est supprimé.
    const cancel=()=>{pendingMediaPlacement.current=null;setStatus('Import annulé : choisis un média déjà utilisé, ou réessaie.');};
    input.addEventListener('cancel',cancel);return ()=>input.removeEventListener('cancel',cancel);
  },[]);

  const iconInput=useRef<HTMLInputElement>(null);
  const replaceIconInput=useRef<HTMLInputElement>(null);
  const replacingIconId=useRef<string|null>(null);
  const stateIconInput=useRef<HTMLInputElement>(null);
  const stateTarget=useRef<((id:string|undefined)=>void)|null>(null);
  const [libraryFor,setLibraryFor]=useState<string|null>(null);
  const [galleryOpen,setGalleryOpen]=useState<string|null>(null);
  const sceneThumbs=useSceneThumbs(project.scenes);
  const sortBusy=useRef(false);
  // Vue d'arrivée PAR FLÈCHE : on retient par quelle flèche on est arrivé dans le panorama affiché.
  const [arrivedVia,setArrivedVia]=useState<{sceneId:string;hotspotId:string;fromSceneId:string}|null>(null);
  const nextArrivalRef=useRef<{sceneId:string;yaw:number;pitch:number;zoom:number}|null>(null);
  const scenesRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(!preview)setGalleryOpen(null);},[preview]);
  const suppressClick=useRef(false);
  const viewAreaRef=useRef<HTMLDivElement>(null);
  const [creationFullscreen,setCreationFullscreen]=useState(false);
  const [fullscreenGalleryOpen,setFullscreenGalleryOpen]=useState(false);
  const [hoveredGallerySceneId,setHoveredGallerySceneId]=useState<string|null>(null);
  const [fullscreenSelectedDestinationId,setFullscreenSelectedDestinationId]=useState<string|null>(null);
  const galleryHoverTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const scheduleGalleryHover=(id:string)=>{
    if(galleryHoverTimer.current)clearTimeout(galleryHoverTimer.current);
    galleryHoverTimer.current=setTimeout(()=>setHoveredGallerySceneId(id),110);
  };
  const dismissGalleryHover=(delay=230)=>{
    if(galleryHoverTimer.current)clearTimeout(galleryHoverTimer.current);
    galleryHoverTimer.current=setTimeout(()=>setHoveredGallerySceneId(null),delay);
  };
  useEffect(()=>()=>{if(galleryHoverTimer.current)clearTimeout(galleryHoverTimer.current);},[]);
  useEffect(()=>{if(!fullscreenGalleryOpen){setHoveredGallerySceneId(null);setFullscreenSelectedDestinationId(null);}},[fullscreenGalleryOpen]);
  const [fullscreenToolsOpen,setFullscreenToolsOpen]=useState(false);
  const [navigationPickerOpen,setNavigationPickerOpen]=useState(false);
  const [navigationPickerHover,setNavigationPickerHover]=useState<string|null>(null);
  const [navigationPickerPreviewId,setNavigationPickerPreviewId]=useState<string|null>(null);
  const [navigationPickerSearch,setNavigationPickerSearch]=useState('');
  const [classicDestinationOpen,setClassicDestinationOpen]=useState(false);
  const [classicDestinationPreviewId,setClassicDestinationPreviewId]=useState<string|null>(null);
  const [galleryPreviewSceneId,setGalleryPreviewSceneId]=useState<string|null>(null);
  const [navigationDraft,setNavigationDraft]=useState<{
    sourceId:string;targetId:string;sourceYaw:number;sourcePitch:number;existingPointId?:string;
  }|null>(null);
  const [destinationEditId,setDestinationEditId]=useState<string|null>(null);
  const [galleryPreviewPinned,setGalleryPreviewPinned]=useState(false);
  const sidePreviewTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const hoverSidePreview=(id:string)=>{if(galleryPreviewPinned)return;if(sidePreviewTimer.current)clearTimeout(sidePreviewTimer.current);sidePreviewTimer.current=setTimeout(()=>setGalleryPreviewSceneId(id),180);};
  const leaveSidePreview=()=>{if(sidePreviewTimer.current)clearTimeout(sidePreviewTimer.current);if(!galleryPreviewPinned)sidePreviewTimer.current=setTimeout(()=>setGalleryPreviewSceneId(null),330);};
  useEffect(()=>()=>{if(sidePreviewTimer.current)clearTimeout(sidePreviewTimer.current);},[]);
  const [classicDestinationSearch,setClassicDestinationSearch]=useState('');
  const destinationListRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!classicDestinationOpen||!classicDestinationPreviewId)return;
    const list=destinationListRef.current;
    if(!list)return;
    const selected=Array.from(list.querySelectorAll<HTMLButtonElement>('[data-destination-scene]'))
      .find(button=>button.dataset.destinationScene===classicDestinationPreviewId);
    if(!selected)return;
    const viewport=list.getBoundingClientRect(),item=selected.getBoundingClientRect();
    if(item.top<viewport.top||item.bottom>viewport.bottom){
      list.scrollBy({top:item.top-viewport.top-(viewport.height-item.height)/2,behavior:'smooth'});
    }
  },[classicDestinationOpen,classicDestinationPreviewId,classicDestinationSearch]);
  const [fullscreenCommandDrawerOpen,setFullscreenCommandDrawerOpen]=useState(false);
  const [quickLinkMode,setQuickLinkMode]=useState(true);
  const [toolsMenuOpen,setToolsMenuOpen]=useState(false);
  // « Retour » : quand une fenêtre s'ouvre depuis le rideau d'outils ou le menu Partager, la croix ramène à ce rideau / menu.
  const returnTo=useRef<'tools'|'share'|null>(null);
  function backFrom(){const r=returnTo.current;returnTo.current=null;if(r==='tools')setToolsMenuOpen(true);else if(r==='share')setShareMenuOpen(true);}
  function leaveTools(){returnTo.current='tools';setToolsMenuOpen(false);}
  function leaveShare(){returnTo.current='share';setShareMenuOpen(false);}
  const [notesOpen,setNotesOpen]=useState(false);
  const [dragTool,setDragTool]=useState<string|null>(null);
  // Le rideau des outils descend TOUJOURS jusqu'à la ligne du haut de la barre du bas (ou du pied de page si elle est absente), quelle que soit la vue ou son contenu.
  useEffect(()=>{
    if(!toolsMenuOpen)return;
    const fit=()=>{
      const top=document.querySelector('.topbar')?.getBoundingClientRect().bottom??0;
      const bar=document.querySelector('.nv-sortable-toolbar');
      const barTop=bar&&bar.getClientRects().length?bar.getBoundingClientRect().top:null;
      const limit=barTop??document.querySelector('.nv-app-footer')?.getBoundingClientRect().top??window.innerHeight;
      document.documentElement.style.setProperty('--nv-curtain-max',Math.max(160,Math.floor(limit-top))+'px');
    };
    fit();const t=window.setTimeout(fit,450);window.addEventListener('resize',fit);
    return ()=>{window.clearTimeout(t);window.removeEventListener('resize',fit);};
  },[toolsMenuOpen]);
  const [hubOpen,setHubOpen]=useState<Record<string,string|null>>({});
  // Sélection multiple d'espaces : partager avec des membres, envoyer vers un autre projet
  const [spaceSelectMode,setSpaceSelectMode]=useState(false);
  const [spaceSelection,setSpaceSelection]=useState<Set<string>>(new Set());
  const [spaceAction,setSpaceAction]=useState<'share'|'transfer'|null>(null);
  const spaceImportInput=useRef<HTMLInputElement>(null);
  const [shareMenuOpen,setShareMenuOpen]=useState(false);
  const [bellOpen,setBellOpen]=useState(false);
  const bellRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!bellOpen)return;
    const outside=(e:PointerEvent)=>{if(!bellRef.current?.contains(e.target as Node))setBellOpen(false);};
    const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')setBellOpen(false);};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',esc);
    return ()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',esc);};
  },[bellOpen]);
  const shareMenuRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!shareMenuOpen)return;
    const outside=(e:PointerEvent)=>{if(!shareMenuRef.current?.contains(e.target as Node))setShareMenuOpen(false);};
    const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')setShareMenuOpen(false);};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',esc);
    return ()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',esc);};
  },[shareMenuOpen]);
  /** Choisir des espaces (affiche la barre des espaces avec les cases), puis lancer l'action voulue. */
  function startSpaceAction(action?:'share'|'transfer'){
    setShareMenuOpen(false);
    setSpacesDrawerOpen(true);setSpaceSelectMode(true);
    if(action&&spaceSelection.size>0){setSpaceAction(action);return;}
    setStatus(action?'Coche les espaces à '+(action==='share'?'partager':'envoyer')+', puis clique sur « '+(action==='share'?'Partager avec un membre…':'Envoyer vers un autre projet…')+' » dans la barre qui s’affiche.':'Coche les espaces voulus : les actions apparaissent dans la barre sous les espaces.');
  }
  const selectedSpaces=(project.spaces??[]).filter(space=>spaceSelection.has(space.id));
  const toggleSpacePick=(id:string)=>setSpaceSelection(cur=>{const n=new Set(cur);if(n.has(id))n.delete(id);else n.add(id);return n;});
  async function importSpacesFile(file?:File){
    if(!file)return;
    try{
      setStatus('Lecture du fichier d’espaces…');
      const raw=await readProjectFile(file,pct=>setStatus('Lecture du fichier d’espaces… '+pct+' %'));
      const result=mergeImportedSpaces(project,raw);
      setProject(result.project);
      setStatus(result.spaces+' espace'+(result.spaces>1?'s':'')+' importé'+(result.spaces>1?'s':'')+' ('+result.scenes+' nouveau'+(result.scenes>1?'x':'')+' panorama'+(result.scenes>1?'s':'')+'). Enregistre avec la disquette.');
    }catch(e){setStatus('Import des espaces impossible : '+(e instanceof Error?e.message:String(e)));}
    finally{if(spaceImportInput.current)spaceImportInput.current.value='';}
  }
  const [shotImage,setShotImage]=useState<{image:string;defaultTo?:string}|null>(null);
  /** Capture annotée : photo de l'écran à l'instant T, à entourer / commenter puis envoyer à un collègue. */
  async function takeShot(){
    setToolsMenuOpen(false);
    if(creationFullscreen)await toggleCreationFullscreen();
    try{
      await new Promise(resolve=>window.setTimeout(resolve,150));
      setShotImage({image:await captureScreen()});
    }catch(e){
      setStatus(e instanceof DOMException&&e.name==='NotAllowedError'?'Capture annulée.':'Capture impossible : '+(e instanceof Error?e.message:String(e)));
    }
  }
  async function sendShot(to:string[],comment:string,image:string){
    const link=readLink();
    if(!inviteIdentity||!link)throw new Error('ouvre le projet depuis le Cloud et connecte-toi.');
    await sendLiveShot(link.projectId,inviteIdentity.email.split('@')[0].slice(0,24),inviteIdentity.email,to,comment,image);
    setStatus('Capture envoyée à '+to.map(e=>e.split('@')[0]).join(', ')+'. Elle apparaît dans son NovaStudio s’il est ouvert sur ce projet.');
  }
  // Fenêtres et panneaux ouverts : envoyés à l'autre personne pour qu'elle voie les mêmes écrans s'ouvrir.
  const liveUi=JSON.stringify({
    pv:preview,g:galleryOpen,b:selectedBarId,s:selectedId,p:panel,
    tm:toolsMenuOpen,rh:rightHidden,sp:spacesDrawerOpen,nd:navigationDrawerOpen,hub:hubOpen,sk:skinsOpen,cl:clientOpen,
    i:info?.id??null,f:frame?{t:frame.title,u:frame.url}:null,im:imageZoom?.id??null,vi:videoZoom?.id??null
  });
  const liveInvite=useLiveInvites(inviteIdentity,true);
  // Historique des notifications (mémorisé sur cet ordinateur) : enregistrements, publications, échecs, notes et captures reçues.
  type NotifEntry={id:string;icon:string;text:string;at:number};
  const [notifHistory,setNotifHistory]=useState<NotifEntry[]>(()=>{try{const v=JSON.parse(localStorage.getItem('nvstudio-notif-history')||'[]');return Array.isArray(v)?v.slice(0,30):[];}catch{return [];}});
  const pushNotif=(icon:string,text:string,id=String(Date.now())+Math.random().toString(36).slice(2,6))=>setNotifHistory(list=>{
    if(list.some(x=>x.id===id)||(list[0]&&list[0].text===text&&Date.now()-list[0].at<3000))return list;
    const next=[{id,icon,text,at:Date.now()},...list].slice(0,30);
    try{localStorage.setItem('nvstudio-notif-history',JSON.stringify(next));}catch{/* stockage indisponible */}
    return next;
  });
  useEffect(()=>{
    if(!/^(Enregistré dans le Cloud|Sauvegardé|Publication|Échec|Cloud déconnecté)/.test(status))return;
    pushNotif(/^(Échec|Cloud déconnecté)/.test(status)?'⚠️':/^Publication/.test(status)?'🚀':'💾',status.slice(0,120));
  },[status]);
  useEffect(()=>{
    for(const n of liveInvite.notesIn)pushNotif('📝',n.fromLabel+' : '+n.body.slice(0,80),'note-'+n.id);
    for(const sh of liveInvite.shots)pushNotif('📷',sh.fromLabel+' a envoyé une capture','shot-'+sh.id);
  },[liveInvite.notesIn,liveInvite.shots]);
  // Commentaires d'équipe accrochés à un endroit du panorama
  const [commentsOpen,setCommentsOpen]=useState(false);
  function addComment(text:string){
    const cam=cameraRef.current,sceneId=cam.sceneId||activeId;if(!sceneId)return;
    const c:ProjectComment={id:uid(),sceneId,yaw:cam.yaw,pitch:cam.pitch,text,author:inviteIdentity?inviteIdentity.email.split('@')[0].slice(0,24):'Moi',at:Date.now()};
    setProject(p=>({...p,comments:[c,...(p.comments??[])].slice(0,500)}));
    pushNotif('💬','Commentaire ajouté sur « '+(project.scenes.find(sc=>sc.id===sceneId)?.name||'panorama')+' »');
    setStatus('Commentaire accroché à cet endroit · enregistre pour le partager avec l’équipe');
  }
  function goToComment(c:ProjectComment){
    if(!project.scenes.some(sc=>sc.id===c.sceneId)){setStatus('Ce panorama n’existe plus.');return;}
    setCommentsOpen(false);
    if(currentSpace&&!visibleIds.has(c.sceneId))setActiveSpaceId(null);
    setArrivedVia(null);nextArrivalRef.current=null;setActiveId(c.sceneId);setSelectedId('');setMode(null);
    window.setTimeout(()=>setTurnRequest({n:Date.now(),yaw:c.yaw,pitch:c.pitch}),900);
  }
  const toggleComment=(id:string)=>setProject(p=>({...p,comments:(p.comments??[]).map(c=>c.id===id?{...c,done:!c.done}:c)}));
  const deleteComment=(id:string)=>setProject(p=>({...p,comments:(p.comments??[]).filter(c=>c.id!==id)}));
  // Contrôle avant publication
  const [checkOpen,setCheckOpen]=useState(false);
  const projectIssues=useMemo(()=>ready?checkProject(project):[],[project,ready]);
  const publishIssues=projectIssues;
  const issueErrors=projectIssues.filter(i=>i.level==='error').length;
  // Correctifs notés « à faire » : un commentaire lié au problème, résolu tout seul dès que le problème disparaît.
  const notedIds=useMemo(()=>new Set((project.comments??[]).filter(c=>c.issueId&&!c.done).map(c=>c.issueId!)),[project.comments]);
  useEffect(()=>{
    if(!ready)return;
    const present=new Set(projectIssues.map(i=>i.id));
    const stale=(project.comments??[]).filter(c=>c.issueId&&!c.done&&!present.has(c.issueId));
    if(stale.length)setProject(p=>({...p,comments:(p.comments??[]).map(c=>c.issueId&&!c.done&&!present.has(c.issueId)?{...c,done:true}:c)}));
  },[projectIssues,ready]); // eslint-disable-line react-hooks/exhaustive-deps
  // Pastille 📝 sur les vignettes des panoramas qui ont un correctif « à faire » en attente.
  const todoByScene=useMemo(()=>{const m=new Map<string,number>();for(const c of project.comments??[])if(c.issueId&&!c.done)m.set(c.sceneId,(m.get(c.sceneId)??0)+1);return m;},[project.comments]);
  const todoPin=(sceneId:string)=>{const n=todoByScene.get(sceneId);return n?<span className="nv-todo-pin" title={n+' correctif'+(n>1?'s':'')+' à faire dans ce panorama'}>📝{n>1?<b>{n}</b>:null}</span>:null;};
  function noteIssueForLater(){
    if(!issueFocus?.id)return;
    const is=projectIssues.find(x=>x.id===issueFocus.id);
    const sceneId=issueFocus.sceneId??is?.sceneId;
    const mine=noteText.trim();
    if(sceneId&&(mine||!notedIds.has(issueFocus.id))){
      const hs=project.scenes.find(sc=>sc.id===sceneId)?.hotspots.find(h=>h.id===issueFocus.hotspotId);
      const cam=cameraRef.current;
      const c:ProjectComment={id:uid(),sceneId,yaw:hs?.yaw??cam.yaw,pitch:hs?.pitch??cam.pitch,
        text:mine?mine+'\n(à corriger : '+issueFocus.text+')':'À faire : '+issueFocus.text+(issueFocus.hint?' — '+issueFocus.hint:''),
        author:inviteIdentity?inviteIdentity.email.split('@')[0].slice(0,24):'Moi',at:Date.now(),issueId:issueFocus.id};
      setProject(p=>({...p,comments:[c,...(p.comments??[])].slice(0,500)}));
      pushNotif('📝',(mine?'Note : '+mine:'Noté « à faire » : '+issueFocus.text).slice(0,90));
      setStatus('Note enregistrée dans les commentaires du panorama · enregistre pour la partager');
    }
    setNoteText('');
    if(guided){nextGuided();return;}
    setIssueFocus(null);
    if(returnToCheck.current){returnToCheck.current=false;setCheckOpen(true);}
  }
  const notifCount=(liveInvite.invite?1:0)+liveInvite.notesIn.length+liveInvite.shots.length+(updateAvailable?1:0)+(issueErrors>0?1:0);
  const [issueFocus,setIssueFocus]=useState<IssueFocus|null>(null);
  // Flèche provisoire créée pour un panorama sans point : supprimée si on ferme la galerie sans choisir de destination.
  const orphanArrow=useRef<{sceneId:string;hotspotId:string;armed:boolean}|null>(null);
  useEffect(()=>{
    const o=orphanArrow.current;
    if(!o||!o.armed||classicDestinationOpen)return;
    orphanArrow.current=null;
    setProject(p=>({...p,scenes:p.scenes.map(sc=>sc.id!==o.sceneId?sc:{...sc,hotspots:sc.hotspots.filter(h=>!(h.id===o.hotspotId&&!h.target))})}));
    setSelectedId(cur=>cur===o.hotspotId?'':cur);
  },[classicDestinationOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  const returnToCheck=useRef(false);
  const [guided,setGuided]=useState<{queue:CheckIssue[];i:number}|null>(null);
  const fixingRef=useRef(false);
  const [fixError,setFixError]=useState('');
  const [noteText,setNoteText]=useState('');
  async function validateFix(){
    if(fixingRef.current)return;
    fixingRef.current=true;setFixError('');
    const guidedNow=guided;
    let ok:boolean|undefined;
    try{
      // On n'attend pas indéfiniment le Cloud : après 20 s l'enregistrement continue en arrière-plan et on passe à la suite.
      ok=await Promise.race([manualSave().catch(()=>false),new Promise<undefined>(resolve=>window.setTimeout(()=>resolve(undefined),20000))]);
    }finally{fixingRef.current=false;}
    if(ok===false){setFixError('L’enregistrement n’a pas abouti : la correction n’est pas sauvegardée. Lis le message en haut de l’écran, puis réessaie.');return;}
    if(guidedNow){nextGuided();return;}
    setIssueFocus(null);setGuided(null);
    if(returnToCheck.current){returnToCheck.current=false;setCheckOpen(true);}
  }
  function startGuided(){
    const queue=[...projectIssues.filter(i=>i.level==='error'&&!notedIds.has(i.id)),...projectIssues.filter(i=>i.level==='warn'&&!notedIds.has(i.id))];
    if(!queue.length)return;
    returnToCheck.current=true;setGuided({queue,i:0});goToIssue(queue[0]);
  }
  function nextGuided(){
    if(!guided)return;
    let j=guided.i+1;
    while(j<guided.queue.length&&(!projectIssues.some(x=>x.id===guided.queue[j].id)||notedIds.has(guided.queue[j].id)))j++;
    if(j>=guided.queue.length){setGuided(null);setIssueFocus(null);setStatus('Tous les problèmes ont été passés en revue 🎉');if(returnToCheck.current){returnToCheck.current=false;setCheckOpen(true);}return;}
    setGuided({queue:guided.queue,i:j});goToIssue(guided.queue[j]);
  }
  /** Numéro de scan d'un panorama (« …-PAN034 » → 34, « Entrée 1 » → 1) : les panoramas sont normalement numérotés dans l'ordre du scan. */
  function sceneNumber(name:string):number|null{
    const m=name.match(/PAN\s*0*(\d+)/i)??name.match(/(\d+)(?!.*\d)/);
    return m?parseInt(m[1],10):null;
  }
  /** Panoramas à proposer en premier comme destination : d'abord les voisins dans la numérotation (le 14 et le 16 pour le 15, en écartant celui déjà relié),
   *  puis ceux qui ont déjà une flèche vers ce panorama, puis les voisins dans l'ordre du projet. */
  function suggestDestinations(sceneId:string):{id:string;why:string}[]{
    const out:{id:string;why:string}[]=[];
    const add=(id:string,why:string)=>{if(id!==sceneId&&visibleIds.has(id)&&!out.some(o=>o.id===id))out.push({id,why});};
    const cur=project.scenes.find(sc=>sc.id===sceneId);
    const n=cur?sceneNumber(cur.name):null;
    if(cur&&n!==null){
      const linked=new Set(cur.hotspots.filter(h=>h.type==='navigation'&&h.target).map(h=>h.target));
      const numbered=project.scenes.filter(sc=>sc.id!==sceneId&&visibleIds.has(sc.id)).map(sc=>({sc,num:sceneNumber(sc.name)})).filter((x):x is {sc:Scene;num:number}=>x.num!==null);
      const next=numbered.filter(x=>x.num>n).sort((x,y)=>x.num-y.num)[0];
      const prev=numbered.filter(x=>x.num<n).sort((x,y)=>y.num-x.num)[0];
      for(const [cand,label] of [[next,'suivant'],[prev,'précédent']] as const)
        if(cand&&!linked.has(cand.sc.id))add(cand.sc.id,'⭐ Suggéré · n°'+cand.num+' ('+label+' dans la numérotation)');
    }
    for(const sc of project.scenes)if(sc.hotspots.some(h=>h.type==='navigation'&&h.target===sceneId))add(sc.id,'⭐ Suggéré · a déjà une flèche vers ce panorama');
    const i=project.scenes.findIndex(sc=>sc.id===sceneId);
    if(i>0)add(project.scenes[i-1].id,'⭐ Suggéré · juste avant dans la liste');
    if(i>=0&&i<project.scenes.length-1)add(project.scenes[i+1].id,'⭐ Suggéré · juste après dans la liste');
    return out;
  }
  function goToIssue(is:CheckIssue){
    setCheckOpen(false);setPublishConfirm(false);
    setFixError('');setNoteText('');setIssueFocus({id:is.id,position:is.sceneId?'Scène '+(project.scenes.findIndex(sc=>sc.id===is.sceneId)+1)+' / '+project.scenes.length:undefined,sceneId:is.sceneId,hotspotId:is.hotspotId,text:is.text,level:is.level,hint:is.hint,thumb:is.sceneId?sceneThumbs[is.sceneId]:undefined,sceneName:is.sceneId?project.scenes.find(sc=>sc.id===is.sceneId)?.name:undefined});
    // Le mode Auto crée / déplace des flèches et change de panorama après chaque validation : on le coupe pour que la correction ne touche que la flèche signalée.
    if(autoNavigation){setAutoNavigation(false);setGuide(null);setNavigationDraft(null);setDestinationEditId(null);}
    setClassicDestinationOpen(false);setPreview(false);
    if(is.kind==='comments'){setCommentsOpen(true);return;}
    if(is.kind==='bar-link'||is.kind==='bar-nav'){setPanel('bar');setSelectedBarId(is.barId??'');setSelectedId('');setRightHidden(false);return;}
    if(!is.sceneId){setPanel('panoramas');setRightHidden(false);return;}
    const sceneId=is.sceneId,hs=project.scenes.find(sc=>sc.id===sceneId)?.hotspots.find(h=>h.id===is.hotspotId);
    if(currentSpace&&!visibleIds.has(sceneId))setActiveSpaceId(null);
    setArrivedVia(null);nextArrivalRef.current=null;setActiveId(sceneId);setMode(null);
    setPanel('points');setRightHidden(['nav','photo','video','scene-empty'].includes(is.kind)); // la feuille de réglages ne s'ouvre que si on doit y écrire
    let spotId=is.hotspotId,kind=is.kind;
    if(kind==='scene-empty'){
      // Panorama sans point : on crée une flèche provisoire et on ouvre la galerie avec le viseur pour choisir le prochain panorama.
      const scene=project.scenes.find(sc=>sc.id===sceneId);
      if(scene){
        const fav=defaultNavigationIconSet(),id=uid();
        const point:Hotspot={id,type:'navigation',title:'Aller vers…',text:'',target:'',yaw:scene.arrivalYaw??0,pitch:scene.arrivalPitch??0,
          ...(fav?{iconId:fav.iconId,hoverIconId:fav.hoverIconId,pressedIconId:fav.pressedIconId,iconSize:fav.iconSize}:{})};
        orphanArrow.current={sceneId,hotspotId:id,armed:false};
        setProject(p=>({...p,scenes:p.scenes.map(sc=>sc.id===sceneId?{...sc,hotspots:[...sc.hotspots,point]}:sc)}));
        spotId=id;kind='nav';
      }
    }
    if(spotId){
      setSelectedId(spotId);
      if(kind==='nav'){
        setClassicDestinationSearch('');
        setClassicDestinationPreviewId(suggestDestinations(sceneId)[0]?.id??project.scenes.find(sc=>sc.id!==sceneId)?.id??null);
        window.setTimeout(()=>{setClassicDestinationOpen(true);if(orphanArrow.current)orphanArrow.current.armed=true;},350);
      }else if(is.kind==='photo'||is.kind==='video')setMediaPicker({sceneId,hotspotId:spotId,type:is.kind==='photo'?'image':'video',fresh:false});
      else window.setTimeout(()=>document.querySelector<HTMLElement>('aside.right input[type="url"],aside.right input[type="text"],aside.right textarea')?.focus(),500);
    }else{
      setSelectedId('');
      if(is.kind==='scene-name')setHubOpen(h=>({...h,scene:'name'}));
      else setHubOpen(h=>({...h,scene:null}));
    }
    if(hs)window.setTimeout(()=>setTurnRequest({n:Date.now(),yaw:hs.yaw,pitch:hs.pitch}),900);
  }
  // Carte « depuis ta dernière visite » (une fois par ouverture, seulement s'il y a quelque chose à dire)
  const [welcome,setWelcome]=useState<{since:number|null;notifs:number;comments:number;errors:number}|null>(null);
  const welcomeDone=useRef(false);
  useEffect(()=>{
    if(!ready||welcomeDone.current)return;
    welcomeDone.current=true;
    const key='nvstudio-lastvisit:'+(project.name||'projet');
    let since:number|null=null;try{since=Number(localStorage.getItem(key))||null;}catch{/* rien */}
    try{localStorage.setItem(key,String(Date.now()));}catch{/* rien */}
    const notifs=since?notifHistory.filter(h=>h.at>since!).length:0;
    const comments=(project.comments??[]).filter(c=>!c.done).length;
    const errors=checkProject(project).filter(i=>i.level==='error').length;
    if(notifs||comments||errors)setWelcome({since,notifs,comments,errors});
  },[ready]); // eslint-disable-line react-hooks/exhaustive-deps
  // Notes reçues en direct : on les garde dans les notes de ce projet (sur cet ordinateur), en plus de la carte affichée.
  const savedNoteIds=useRef(new Set<string>());
  useEffect(()=>{
    for(const n of liveInvite.notesIn){
      if(savedNoteIds.current.has(n.id))continue;
      savedNoteIds.current.add(n.id);
      try{
        const key='nvstudio-notes-local:'+(project.name||'projet');
        const list=JSON.parse(localStorage.getItem(key)||'[]');
        localStorage.setItem(key,JSON.stringify([{id:n.id,body:n.body,shared:true,authorEmail:n.fromEmail,mine:false,createdAt:new Date(n.at).toISOString()},...(Array.isArray(list)?list:[])].slice(0,300)));
      }catch{/* stockage indisponible */}
    }
  },[liveInvite.notesIn,project.name]);
  const live=useLiveSession({
    startAsLeader:liveLeads,projectId:liveProjectId,enabled:!!liveProjectId,label:liveLabel,
    state:{sceneId:activeId,spaceId:activeSpaceId},
    getView:()=>cameraRef.current.sceneId?cameraRef.current:null,
    ui:liveUi,
    onRemoteUi:raw=>applyRemoteUi(raw),
    onRemoteView:v=>{
      // Même panorama seulement : on reproduit l'orientation et le zoom de l'autre personne.
      if(cameraRef.current.sceneId!==v.sceneId)return;
      setTurnRequest({n:Date.now(),yaw:v.yaw,pitch:v.pitch,zoom:v.zoom,fast:true});
    },
    onRemoteState:remote=>{
      const current=projectRef.current;
      const space=remote.spaceId?(current.spaces??[]).find(sp=>sp.id===remote.spaceId):null;
      if(remote.spaceId&&!space)return;                 // espace pas (encore) présent dans ma copie
      if(!current.scenes.some(sc=>sc.id===remote.sceneId))return;
      setActiveSpaceId(space?.id??null);setActiveId(remote.sceneId);setSelectedId('');
    }
  });
  function applyRemoteUi(raw:string){
    let u:{tm?:boolean;rh?:boolean;sp?:boolean;nd?:boolean;hub?:Record<string,string|null>;sk?:boolean;cl?:boolean;pv?:boolean;g?:string|null;b?:string;s?:string;p?:PanelTab;i?:string|null;f?:{t:string;u:string}|null;im?:string|null;vi?:string|null};
    try{u=JSON.parse(raw);}catch{return;}
    const current=projectRef.current;
    const findHotspot=(id:string|null|undefined)=>id?current.scenes.flatMap(sc=>sc.hotspots).find(h=>h.id===id)??null:null;
    // Tout l'écran de l'autre : rideau des outils, feuille de réglages, rubriques ouvertes, menus…
    if(typeof u.tm==='boolean')setToolsMenuOpen(u.tm);
    if(typeof u.rh==='boolean')setRightHidden(u.rh);
    if(typeof u.sp==='boolean')setSpacesDrawerOpen(u.sp);
    if(typeof u.nd==='boolean')setNavigationDrawerOpen(u.nd);
    if(u.hub&&typeof u.hub==='object')setHubOpen(Object.fromEntries(Object.entries(u.hub).filter(([,v])=>v===null||typeof v==='string').map(([k,v])=>[k,v as string|null])));
    if(typeof u.sk==='boolean')setSkinsOpen(u.sk);
    if(typeof u.cl==='boolean')setClientOpen(u.cl);
    setPreview(!!u.pv);
    setGalleryOpen(u.pv&&u.g&&current.bottomBar.some(b=>b.id===u.g)?u.g:null);
    setSelectedBarId(u.b&&current.bottomBar.some(b=>b.id===u.b)?u.b:'');
    if(u.p&&['points','panoramas','bar','general'].includes(u.p as string))setPanel(u.p);
    // Fenêtre d'information : soit un bouton de la barre du bas, soit un point du panorama (toujours relus dans MA copie du projet).
    const bar=u.i?current.bottomBar.find(b=>b.id===u.i):null;
    if(bar)setInfo({id:bar.id,type:'information',title:bar.title,text:bar.text,translations:bar.translations,target:'',yaw:0,pitch:0});
    else setInfo(findHotspot(u.i));
    const safe=u.f?safeLink(u.f.u):null;
    setFrame(u.f&&safe&&/^https:\/\//i.test(safe)?{title:String(u.f.t).slice(0,120),url:safe}:null);
    setImageZoom(findHotspot(u.im));
    setVideoZoom(findHotspot(u.vi));
  }
  const toolsMenuRef=useRef<HTMLDivElement>(null);
  const fsToolsRef=useRef<HTMLDivElement>(null);
  const toolOptions:Array<{key:PanelTab;label:string}>=[
    {key:'panoramas',label:'Panoramas'},
    {key:'points',label:selectedId?'Inspecteur · Scène & Points':'Scène & Points'},
    {key:'bar',label:'Barre du bas'},
    {key:'icons',label:'Mes icônes'},
    {key:'intro',label:'Intro'},
    {key:'elements',label:'Éléments'},
    {key:'music',label:'Musique'},
    {key:'client',label:'Clients'}
  ];
  // Ordre des outils dans la fenêtre « quatre carrés » : réglable par glisser-déposer, mémorisé sur cet ordinateur.
  const TOOL_KEYS=['spaces','panoramas','points','bar','icons','intro','elements','music','client','notes','comments'];
  const [toolOrder,setToolOrder]=useState<string[]>(()=>{
    try{
      const saved=JSON.parse(localStorage.getItem('nvstudio-tools-order')||'[]') as unknown;
      const known=Array.isArray(saved)?saved.filter((k):k is string=>typeof k==='string'&&TOOL_KEYS.includes(k)):[];
      return [...new Set([...known,...TOOL_KEYS])];
    }catch{return TOOL_KEYS;}
  });
  const saveToolOrder=(order:string[])=>{try{localStorage.setItem('nvstudio-tools-order',JSON.stringify(order));}catch{/* ordre non mémorisé */}};
  // Glisser-déposer des tuiles (ordinateur uniquement : pas de déplacement sur mobile / écran tactile).
  const canDragTools=typeof window!=='undefined'&&!window.matchMedia('(max-width:820px),(pointer:coarse)').matches;
  function toolMeta(key:string):{label:string;icon:ReactNode;tone:string;active:boolean;badge?:number;run:()=>void}|null{
    const ic=22;
    if(key==='spaces')return {label:'Espaces',icon:<Layers size={ic}/>,tone:'#4f7cff',active:spacesDrawerOpen,badge:(project.spaces?.length??0)+1,
      run:()=>{leaveTools();setSpacesDrawerOpen(open=>!open);}};
    if(key==='notes')return {label:'Notes',icon:<StickyNote size={ic}/>,tone:'#e3b341',active:false,run:()=>{leaveTools();setRightHidden(true);setNotesOpen(true);}};
    if(key==='comments')return {label:'Commentaires',icon:<MessageSquarePlus size={ic}/>,tone:'#ff9f43',active:false,badge:(project.comments??[]).filter(c=>!c.done).length||undefined,run:()=>{leaveTools();setRightHidden(true);setCommentsOpen(true);}};
    const option=toolOptions.find(item=>item.key===key);
    if(!option)return null;
    const look:Record<string,{icon:ReactNode;tone:string}>={
      panoramas:{icon:<Images size={ic}/>,tone:'#ff8a3d'},points:{icon:<PinIcon size={ic}/>,tone:'#2fbf8f'},bar:{icon:<PanelBottom size={ic}/>,tone:'#a468f0'},
      icons:{icon:<Star size={ic}/>,tone:'#f0b429'},intro:{icon:<Play size={ic}/>,tone:'#ef5b7b'},elements:{icon:<Plus size={ic}/>,tone:'#2bb3d6'},
      music:{icon:<Music size={ic}/>,tone:'#ff6fa8'},client:{icon:<Smile size={ic}/>,tone:'#7f8cff'}
    };
    const l=look[key]??{icon:<Layers size={ic}/>,tone:'#4f7cff'};
    return {label:option.label,icon:l.icon,tone:l.tone,active:!rightHidden&&panel===key,run:()=>toggleToolPanel(key as PanelTab)};
  }
  // Éditer · tous les outils · Aperçu (en-tête, et en haut du plein écran de création)
  function modeSwitch(fs:boolean){
    return (
        <div className="mode-switch-group" role="group" aria-label="Mode de l'éditeur">
        <button type="button" className={'mode-btn '+(!preview?'is-active':'')}
          aria-pressed={!preview}
          onClick={()=>{if(preview){setPreview(false);setIntroVisible(false);}}}>
          <Edit3 size={15}/> Éditer
        </button>
        <button type="button" className={'mode-btn nv-v3-grid-btn'+(toolsMenuOpen?' is-open':'')}
          aria-label="Tous les outils : panoramas, scène, barre, icônes, enregistrer, exporter" title="Tous les outils · Enregistrer · Publier · Exporter"
          aria-haspopup="dialog" aria-expanded={toolsMenuOpen} aria-controls={fs?'nv-fs-tools-options':'nv-header-tools-options'}
          onClick={()=>setToolsMenuOpen(open=>!open)}>
          <LayoutGrid size={20}/>
          {project!==savedRef.current&&<i aria-hidden="true" className="nv-unsaved-dot"/>}
        </button>
        <button type="button" className={'mode-btn '+(preview?'is-active':'')}
          aria-pressed={preview}
          title="Visualiser la visite depuis la scène affichée"
          onClick={()=>{
            if(!preview){setIntroVisible(false);setPreview(true);setMode(null);setSelectedId('');}
          }}>
          <Eye size={15}/> Aperçu
        </button>
      </div>
    );
  }
  // Rideau des outils (tuiles) : sous l'en-tête, ou dans le plein écran de création.
  function toolsCurtain(fs:boolean){
    return (
        <div id={fs?'nv-fs-tools-options':'nv-header-tools-options'} className={'nv-tools-curtain'+(toolsMenuOpen?' is-open':'')+(fs?' nv-in-fullscreen':'')} role="dialog" aria-label="Tous les outils" aria-hidden={!toolsMenuOpen}>
          <div className="nv-tools-curtain-inner">
            <div className="nv-tiles-title">Tes outils<small>{canDragTools?'Glisse une tuile pour la ranger où tu veux':'Touche une tuile pour l’ouvrir'}</small></div>
            <div className="nv-tiles" role="list">
              {toolOrder.map(key=>{
                const meta=toolMeta(key);
                if(!meta)return null;
                return <div key={key} role="listitem" className={'nv-tile-wrap'+(dragTool===key?' is-dragging':'')} draggable={canDragTools}
                  onDragStart={e=>{setDragTool(key);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',key);}}
                  onDragOver={e=>{
                    if(!dragTool||dragTool===key)return;
                    e.preventDefault();
                    setToolOrder(order=>reorderItems(order,dragTool,key,k=>k));
                  }}
                  onDrop={e=>e.preventDefault()}
                  onDragEnd={()=>{setDragTool(null);setToolOrder(order=>{saveToolOrder(order);return order;});}}>
                  <button type="button" className={'nv-app-tile'+(meta.active?' is-active':'')} aria-pressed={meta.active} onClick={()=>fs?runFromFullscreen(key,meta.run):meta.run()} tabIndex={toolsMenuOpen?0:-1}
                    style={{'--tile-tone':meta.tone} as CSSProperties}>
                    <span className="nv-app-tile-icon">{meta.icon}</span>
                    <span className="nv-app-tile-label">{meta.label}</span>
                    {meta.badge!==undefined&&<small className="nv-app-tile-badge">{meta.badge}</small>}
                  </button>
                </div>;
              })}
            </div>
            {!fs&&<>
            <div className="nv-tiles-title nv-tiles-title-second">Fichier et équipe</div>
            <div className="nv-tiles">
              <div className="nv-tile-wrap"><button type="button" tabIndex={toolsMenuOpen?0:-1} className={'nv-app-tile nv-tile-save'+(project!==savedRef.current?' is-dirty':'')}
                disabled={!ready||savingManually||!!lock} onClick={()=>{setToolsMenuOpen(false);void manualSave();}} title="Enregistrer (⌘S / Ctrl+S)"
                style={{'--tile-tone':'#e8873a'} as CSSProperties}>
                <span className="nv-app-tile-icon"><Save size={22}/></span><span className="nv-app-tile-label">{savingManually?'Enregistrement…':'Enregistrer'}</span>
                {!savingManually&&project!==savedRef.current&&<i aria-hidden="true" className="nv-unsaved-dot"/>}
              </button></div>
              <div className="nv-tile-wrap"><button type="button" tabIndex={toolsMenuOpen?0:-1} className="nv-app-tile" disabled={savingManually||!ready||!!lock||!project.scenes.length}
                onClick={()=>{setToolsMenuOpen(false);setPublishConfirm(true);}} style={{'--tile-tone':'#e05d44'} as CSSProperties}>
                <span className="nv-app-tile-icon"><Upload size={22}/></span><span className="nv-app-tile-label">Publier</span></button></div>
              <div className="nv-tile-wrap"><button type="button" tabIndex={toolsMenuOpen?0:-1} className="nv-app-tile" disabled={exporting||!visibleScenes.length}
                title={currentSpace?'Exporter uniquement cet espace':'Exporter la visite complète au format HTML / ZIP'}
                onClick={()=>{setToolsMenuOpen(false);void exportTour();}} style={{'--tile-tone':'#3aa0d8'} as CSSProperties}>
                <span className="nv-app-tile-icon"><Download size={22}/></span><span className="nv-app-tile-label">{exporting?'Export…':'Exporter ZIP'}</span></button></div>
              <div className="nv-tile-wrap"><button type="button" tabIndex={toolsMenuOpen?0:-1} className="nv-app-tile" disabled={!ready}
                title="Télécharger uniquement le fichier HTML NovaVisio : il affiche toujours la dernière version publiée"
                onClick={()=>{setToolsMenuOpen(false);void exportNovaVisioHtml();}} style={{'--tile-tone':'#1fb5a8'} as CSSProperties}>
                <span className="nv-app-tile-icon"><Globe size={22}/></span><span className="nv-app-tile-label">HTML NovaVisio</span></button></div>
              <div className="nv-tile-wrap"><button type="button" tabIndex={toolsMenuOpen?0:-1} className={'nv-app-tile'+(liveProjectId?' is-active':'')}
                onClick={()=>{leaveTools();setRightHidden(true);if(liveProjectId)void toggleLive();else setLiveDialogOpen(true);}} style={{'--tile-tone':'#27ae60'} as CSSProperties}
                title="Travailler à deux sur le même projet : voir la souris de l’autre et se passer la main">
                <span className="nv-app-tile-icon"><Users size={22}/></span><span className="nv-app-tile-label">Écran partagé</span></button></div>
              <div className="nv-tile-wrap nv-tile-hand"><WriteHand onStatus={setStatus}/></div>
            </div>
            </>}
          </div>
        </div>
    );
  }
  // Dans le plein écran : Panoramas, Scène & Points et Barre du bas s'ouvrent sur place ; les autres outils sortent du plein écran.
  function runFromFullscreen(key:string,run:()=>void){
    setToolsMenuOpen(false);
    if(key==='panoramas'){setFullscreenToolsOpen(false);setFullscreenCommandDrawerOpen(true);setFullscreenGalleryOpen(true);return;}
    if(key==='points'){setFullscreenToolsTab('point');setFullscreenToolsOpen(true);setFullscreenGalleryOpen(false);return;}
    if(key==='bar'){setFullscreenToolsTab('bar');setFullscreenToolsOpen(true);setFullscreenGalleryOpen(false);return;}
    void toggleCreationFullscreen().then(()=>run());
  }
  function toggleToolPanel(next:PanelTab){
    leaveTools();
    if(!rightHidden&&panel===next){setRightHidden(true);return;}
    setPanel(next);
    setRightHidden(false);
    if(next==='panoramas'){setSelectedId('');setMode(null);}
  }
  useEffect(()=>{
    if(!toolsMenuOpen)return;
    const outside=(event:PointerEvent)=>{const t=event.target as Node;if(!toolsMenuRef.current?.contains(t)&&!fsToolsRef.current?.contains(t))setToolsMenuOpen(false);};
    const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setToolsMenuOpen(false);};
    document.addEventListener('pointerdown',outside);
    document.addEventListener('keydown',close);
    return ()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',close);};
  },[toolsMenuOpen]);
  const galleryOrientationRef=useRef<Record<string,{yaw:number;pitch:number;zoom:number}>>({});
  const [fullscreenGalleryLayout,setFullscreenGalleryLayout]=useState<'grid'|'list'>(()=>{try{return localStorage.getItem('nvstudio-gallery-layout')==='list'?'list':'grid';}catch{return 'grid';}});
  const [panoramasLayout,setPanoramasLayout]=useState<'grid'|'list'>(()=>{try{return localStorage.getItem('nvstudio-panorama-layout')==='grid'?'grid':'list';}catch{return 'list';}});
  const [showArrivalCrosshair,setShowArrivalCrosshair]=useState(false);
  useEffect(()=>{try{localStorage.setItem('nvstudio-gallery-layout',fullscreenGalleryLayout);}catch{}},[fullscreenGalleryLayout]);
  useEffect(()=>{try{localStorage.setItem('nvstudio-panorama-layout',panoramasLayout);}catch{}},[panoramasLayout]);
  useEffect(()=>{if(fullscreenToolsOpen&&fullscreenCommandDrawerOpen)setFullscreenCommandDrawerOpen(false);},[fullscreenToolsOpen,fullscreenCommandDrawerOpen]);
  useEffect(()=>{if(!creationFullscreen)setShowArrivalCrosshair(false);},[creationFullscreen]);
  const [fullscreenToolsTab,setFullscreenToolsTab]=useState<'point'|'bar'|'scene'>('point');
  const [creationFullscreenFallback,setCreationFullscreenFallback]=useState(false);
  const creationFallbackRef=useRef(false);
  useEffect(()=>{
    const syncFullscreen=()=>{
      if(document.fullscreenElement===viewAreaRef.current){
        setCreationFullscreen(true);
      } else if(!creationFallbackRef.current){
        // The user pressed Escape or used the browser's own fullscreen exit.
        setCreationFullscreen(false);
        setCreationFullscreenFallback(false);
      }
    };
    const exitFallbackOnEscape=(event:KeyboardEvent)=>{
      if(event.key==='Escape'&&creationFallbackRef.current){
        creationFallbackRef.current=false;
        setCreationFullscreen(false);
        setCreationFullscreenFallback(false);
      }
    };
    document.addEventListener('fullscreenchange',syncFullscreen);
    document.addEventListener('keydown',exitFallbackOnEscape);
    return ()=>{
      document.removeEventListener('fullscreenchange',syncFullscreen);
      document.removeEventListener('keydown',exitFallbackOnEscape);
    };
  },[]);
  async function toggleCreationFullscreen(){
    const node=viewAreaRef.current;
    if(!node)return;
    if(creationFullscreen){
      if(document.fullscreenElement===node){
        try{await document.exitFullscreen();}
        catch{setStatus('Impossible de quitter le plein écran');}
      }else{
        creationFallbackRef.current=false;
        setCreationFullscreenFallback(false);
        setCreationFullscreen(false);
      }
      return;
    }
    // Only the 360° creation is expanded: no Studio header, sidebars or footer.
    // Do not force preview mode: editing handles must remain usable.
    try{
      if(!node.requestFullscreen)throw Error('Fullscreen API unavailable');
      await node.requestFullscreen();
      creationFallbackRef.current=false;
      setCreationFullscreenFallback(false);
      setCreationFullscreen(true);
    }catch{
      // CSS fallback for browsers without the Fullscreen API (some mobile Safari).
      creationFallbackRef.current=true;
      setCreationFullscreenFallback(true);
      setCreationFullscreen(true);
    }
  }
  const cameraRef=useRef({sceneId:'',yaw:0,pitch:0,zoom:60});
  const savedRef=useRef<StudioProject|null>(null);
  const baseRef=useRef<string|null>(null);          // date de la version enregistrée que cet onglet connaît
  const projectRef=useRef<StudioProject>(project);  // dernier état du projet, sauvegardé uniquement sur demande
  const rawStoredRef=useRef<unknown>(null);          // projet enregistré tel quel, si illisible
  const savingRef=useRef(false);
  const lockRef=useRef<unknown>(null);
  const channelRef=useRef<BroadcastChannel|null>(null);
  const [lock,setLock]=useState<{kind:'unreadable';reason:string}|{kind:'conflict'}|{kind:'saveError';reason:string}|null>(null);
  projectRef.current=project;
  function applyHistory(target:StudioProject,label:string){
    setProjectRaw(target);setHistTick(t=>t+1);histRef.current.last=0;
    if(!target.scenes.some(sc=>sc.id===activeId))setActiveId(target.scenes[0]?.id??'');
    if(selectedId&&!target.scenes.some(sc=>sc.hotspots.some(h=>h.id===selectedId)))setSelectedId('');
    setStatus(label);
  }
  function undo(){const h=histRef.current,prev=h.past.pop();if(!prev)return;h.future.push(projectRef.current);applyHistory(prev,'Action annulée · Ctrl+Maj+Z pour la rétablir');}
  function redo(){const h=histRef.current,nxt=h.future.pop();if(!nxt)return;h.past.push(projectRef.current);applyHistory(nxt,'Action rétablie');}
  const undoRef=useRef(undo),redoRef=useRef(redo);undoRef.current=undo;redoRef.current=redo;
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if(!(e.ctrlKey||e.metaKey)||e.altKey)return;
      const t=e.target as HTMLElement|null;
      if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT'||t.isContentEditable))return;
      if(document.querySelector('.nv-shot-overlay'))return;
      const k=e.key.toLowerCase();
      if(k==='z'&&!e.shiftKey){e.preventDefault();undoRef.current();}
      else if((k==='z'&&e.shiftKey)||k==='y'){e.preventDefault();redoRef.current();}
    };
    window.addEventListener('keydown',onKey);return ()=>window.removeEventListener('keydown',onKey);
  },[]);
  lockRef.current=lock;
  function adopt(p:StudioProject,stamp:string|null){
    setPreparationOpen(false);
    setActiveSpaceId(null);setSpaceManagerOpen(false);
    const upgraded=ensureFrameReferences(validateProject(p),viewAreaRef.current?.clientHeight||550);
    savedRef.current=upgraded;baseRef.current=stamp;
    resetProject(upgraded);setActiveId(upgraded.scenes[0]?.id ?? '');setSelectedId('');setMode(null);
  }
  useEffect(()=>{
    let cancelled=false;
    const restore=async()=>{
      // A linked cloud project always takes precedence over the older "current"
      // IndexedDB project; otherwise refreshing reopens an unrelated customer.
      const link=readLink();
      if(link){
        setStatus('Réouverture du dernier projet Cloud…');
        try{
          const {supabase,openCloudProject,cloudConfigured}=await import('./cloud');
          if(!cloudConfigured)throw new Error('Cloud non configuré');
          const {data:{session},error}=await supabase().auth.getSession();
          if(cancelled)return;
          if(error)throw error;
          if(!session){
            setStatus('Connecte-toi au Cloud pour retrouver ton dernier projet · bouton Cloud.');
            setReady(true);
            return;
          }
          const loaded=await openCloudProject(link.projectId,message=>{if(!cancelled)setStatus(message);});
          if(cancelled)return;
          adopt(loaded.project,null);
          writeLink(loaded.link);
          setStatus('Projet Cloud restauré : '+loaded.project.name);
          setReady(true);
          return;
        }catch(e){
          if(cancelled)return;
          // Never silently switch to an unrelated locally stored project.
          setStatus('Impossible de rouvrir le dernier projet Cloud : '+(e instanceof Error?e.message:String(e))+' · Ouvre Cloud pour choisir une sauvegarde.');
          setReady(true);
          return;
        }
      }
      try{
        const p=await loadProject();
        if(cancelled)return;
        if(p){
          rawStoredRef.current=p;
          try{adopt(p,p.updatedAt??null);rawStoredRef.current=null;}
          catch(e){
            setLock({kind:'unreadable',reason:e instanceof Error?e.message:String(e)});
            setReady(true);setStatus('Projet local illisible — enregistrement suspendu');return;
          }
        }
        setReady(true);setStatus('Prêt');
      }catch(e){
        if(cancelled)return;
        setLock({kind:'unreadable',reason:'Stockage du navigateur indisponible ('+(e instanceof Error?e.message:String(e))+')'});
        setReady(true);setStatus('Stockage indisponible — enregistrement suspendu');
      }
    };
    void restore();
    return ()=>{cancelled=true;};
  },[]);
  // Enregistrement : jamais pendant un verrou, jamais en écrasant le travail d'un autre onglet.
  async function persist(snapshot:StudioProject,force=false):Promise<boolean>{
    if(savingRef.current)return false;
    savingRef.current=true;
    setStatus('Sauvegarde…');
    try{
      const stamp=await saveProject(snapshot,baseRef.current,force);
      baseRef.current=stamp;savedRef.current=snapshot;
      setStatus('Sauvegardé localement');
      setLock(l=>l&&l.kind!=='unreadable'?null:l);
      try{channelRef.current?.postMessage({type:'saved',stamp});}catch{/* ignoré */}
      // Une modification pendant l'écriture reste non enregistrée.
      // L'utilisateur décide du prochain enregistrement avec la disquette.
      return true;
    }catch(e){
      if(e instanceof SaveConflictError){setLock({kind:'conflict'});setStatus('Modifié dans une autre fenêtre');}
      else{setLock({kind:'saveError',reason:e instanceof Error?e.message:String(e)});setStatus('Erreur de sauvegarde');}
      return false;
    }finally{savingRef.current=false;}
  }
  // Sauvegarde volontaire : aucun timer, aucune écriture au changement d'onglet,
  // aucune écriture automatique dans IndexedDB. Avertir seulement si on quitte sans enregistrer.
  useEffect(()=>{
    const onBeforeUnload=(event:BeforeUnloadEvent)=>{
      if(!updateReloadApproved.current&&((ready&&projectRef.current!==savedRef.current)||savingRef.current)){
        event.preventDefault();
        event.returnValue='';
      }
    };
    window.addEventListener('beforeunload',onBeforeUnload);
    return ()=>window.removeEventListener('beforeunload',onBeforeUnload);
  },[ready]);
  // Plusieurs onglets : on est prévenu dès qu'un autre onglet enregistre.
  async function reloadFromStore(){
    try{
      const p=await loadProject();
      if(p){adopt(p,p.updatedAt??null);rawStoredRef.current=null;}
      setLock(null);setStatus('Projet rechargé depuis la version enregistrée');
    }catch(e){setLock({kind:'unreadable',reason:e instanceof Error?e.message:String(e)});}
  }
  useEffect(()=>{
    if(typeof BroadcastChannel==='undefined')return;
    const channel=new BroadcastChannel('novavisio-studio-project');
    channelRef.current=channel;
    channel.onmessage=ev=>{
      // Local changes belong to a different project while a Cloud project is open.
      if(readLink())return;
      if(ev.data?.type!=='saved'||ev.data.stamp===baseRef.current)return;
      if(projectRef.current===savedRef.current)void reloadFromStore(); // aucun travail en cours ici : on se met simplement à jour
      else setLock({kind:'conflict'});                                 // travail non enregistré ici ET modifs ailleurs : on demande
    };
    return ()=>{channel.close();channelRef.current=null;};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  // Cloud en mode manuel : aucun envoi au fil des modifications.
  const cloud=useCloudSync(project,ready&&!lock,(remote,by)=>{
    const up=ensureFrameReferences(remote,viewAreaRef.current?.clientHeight||550);
    resetProject(up);
    setActiveId(id=>up.scenes.some(sc=>sc.id===id)?id:up.scenes[0]?.id??'');
    setStatus('Projet cloud ouvert : '+(by??'version distante'));
    return up;
  },true);
  async function manualSave(publishing=false):Promise<boolean>{
    if(!ready||savingManually||savingRef.current)return false;
    if(lock?.kind==='unreadable'||lock?.kind==='conflict'){
      setStatus('Enregistrement bloqué : vérifie le conflit ou récupère le projet');
      return false;
    }
    const snapshot=projectRef.current;
    setSavingManually(true);
    try{
      if(cloud.signedIn){
        setStatus('Sauvegarde dans Supabase…');
        const synced=await cloud.syncNow(snapshot);
        if(!synced){
          setStatus('Échec de la sauvegarde Cloud : rien n’a été écrasé. Vérifie le panneau Cloud et réessaie.');
          return false;
        }
        savedRef.current=snapshot;
        if(publishing){
        // Publier actualise explicitement les liens publics actifs :
        // le projet complet et chacun des espaces possèdent leur propre
        // publication stable. Les partages temporaires restent immuables.
        let updated=0;
        const errors:string[]=[];
        const master=readLink();
        const targets=[
          {name:'Projet complet',space:null as StudioSpace|null,link:master},
          ...(snapshot.spaces??[]).map(space=>({
            name:space.name,space,link:readSpaceCloudLink(space.id,'public')
          }))
        ];
        for(const target of targets){
          if(!target.link&&target.space)continue;
          try{
            const scoped=projectForSpaceExport(snapshot,target.space,true);
            const result=await (target.space?refreshActivePublication:publishPermanent)(scoped,target.link,
              progress=>setStatus('Publication '+target.name+' · '+progress));
            if(!result)continue;
            if(target.space)writeSpaceCloudLink(target.space.id,'public',result.link);
            else writeLink(result.link);
            updated++;
          }catch(error){
            errors.push(target.name+' : '+(error instanceof Error?error.message:String(error)));
          }
        }
        if(errors.length){
          setStatus('Sauvegardé · Publication partielle/échouée : '+errors.join(' | '));
        }else{
          setStatus((synced?'Enregistré dans Supabase':'Enregistré localement · Cloud non synchronisé')+
            (updated?' · '+updated+' lien'+(updated>1?'s':'')+' public'+(updated>1?'s':'')+' actualisé'+(updated>1?'s':''):''));
        }
        }else setStatus('Enregistré dans le Cloud · Cliquez sur Publier pour actualiser la visite en ligne');
      }else{
        setStatus('Cloud déconnecté : connexion nécessaire pour enregistrer ou publier.');setCloudOpen(true);
        return false;
      }
      return true;
    }catch(error){setStatus('Échec : '+(error instanceof Error?error.message:String(error)));return false;}finally{setSavingManually(false);}
  }
  useEffect(()=>{
    const onSaveShortcut=(event:KeyboardEvent)=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='s'){
        event.preventDefault();
        void manualSave();
      }
    };
    window.addEventListener('keydown',onSaveShortcut);
    return ()=>window.removeEventListener('keydown',onSaveShortcut);
  });
  const cloudLabel=(st:SyncState):string=>
    st.kind==='off'?'':st.kind==='login'?'Non connecté':st.kind==='idle'?'Connecté':st.kind==='paused'?'En pause':
    st.kind==='pending'?'Envoi…':st.kind==='saving'?st.progress:st.kind==='saved'?'Enregistré':
    st.kind==='error'?'Échec — nouvel essai':'À installer';

  // Subspaces are non-destructive views over the master panorama library.
  useEffect(()=>{
    if(!creationFullscreen){setFullscreenGalleryOpen(false);setFullscreenToolsOpen(false);setFullscreenCommandDrawerOpen(false);setNavigationPickerOpen(false);}
  },[creationFullscreen]);
  const currentSpace:StudioSpace|null=(project.spaces??[]).find(sp=>sp.id===activeSpaceId)??null;
  const visibleScenes=scenesInSpace(project,currentSpace);
  const filteredScenes=visibleScenes.filter(scene=>{
    if(sceneSearch.trim()&&!scene.name.toLocaleLowerCase('fr').includes(sceneSearch.trim().toLocaleLowerCase('fr')))return false;
    if(sceneFilter==='with'&&!scene.hotspots.length)return false;
    if(sceneFilter==='without'&&scene.hotspots.length)return false;
    return true;
  });
  // Existing drag order works on the complete master list only.
  const sceneSortEnabled=!currentSpace&&!sceneSearch.trim()&&sceneFilter==='all';
  const visibleIds=new Set(visibleScenes.map(scene=>scene.id));
  const active=visibleScenes.find(s=>s.id===activeId) ?? null;
  useEffect(()=>{
    if(activeSpaceId && !(project.spaces??[]).some(sp=>sp.id===activeSpaceId)){
      setActiveSpaceId(null);setSpaceManagerOpen(false);return;
    }
    if(activeSpaceId && !visibleIds.has(activeId)){
      setActiveId(visibleScenes[0]?.id??'');setSelectedId('');
      setArrivedVia(null);nextArrivalRef.current=null;
    }
  },[activeSpaceId,project.spaces,project.scenes,activeId]);
  const selected=active?.hotspots.find(h=>h.id===selectedId) ?? null;
  const viaFrom=arrivedVia?project.scenes.find(sc=>sc.id===arrivedVia.fromSceneId):undefined;
  const viaHotspot=active&&arrivedVia&&arrivedVia.sceneId===active.id?
    viaFrom?.hotspots.find(h=>h.id===arrivedVia.hotspotId&&h.type==='navigation'&&h.target===active.id)??null:null;
  useEffect(()=>{
    if(!introVisible||!project.introEnabled||!project.introUrl)return;
    // Ne pas rediriger vers le premier panorama du projet complet :
    // l'espace et sa première scène ont déjà été choisis au lancement.
    setIntroEnding(false);
    const duration=Math.max(2,Math.min(60,project.introDuration??6))*1000;
    const fadeMs=Math.min(350,duration/4);
    const fade=window.setTimeout(()=>setIntroEnding(true),duration-fadeMs);
    const finish=window.setTimeout(()=>setIntroVisible(false),duration);
    return ()=>{window.clearTimeout(fade);window.clearTimeout(finish);};
  },[introVisible,project.introEnabled,project.introUrl,project.introDuration]);
  const totalPoints=project.scenes.reduce((n,s)=>n+s.hotspots.length,0);
  const nightSource=project.scenes.find(sc=>sc.id===active?.nightSourceSceneId);
  const nightTexture=active?.nightDataUrl??nightSource?.dataUrl;
  const nightActive=nightSceneId===activeId && !!nightTexture;
  const selectedBar=project.bottomBar.find(b=>b.id===selectedBarId) ?? null;
  useEffect(()=>{
    if(!selectedBarId||panel!=='bar')return;
    const frame=requestAnimationFrame(()=>document.getElementById('nv-bar-button-settings')?.scrollIntoView({block:'start'}));
    return ()=>cancelAnimationFrame(frame);
  },[selectedBarId,panel]);
  useEffect(()=>{
    if(!selectedId||panel!=='points')return;
    const frame=requestAnimationFrame(()=>document.getElementById('nv-selected-point')?.scrollIntoView({block:'start'}));
    return ()=>cancelAnimationFrame(frame);
  },[selectedId,panel]);
  const closeIcon=project.icons.find(icon=>icon.id===project.closeIconId);
  const popupThemeClass=closeIcon?' nv-custom-close':'';
  useEffect(()=>{
    if(ready&&!lock&&!preparationPrompted.current){
      preparationPrompted.current=true;
      if(!project.preparationComplete&&project.scenes.length===0&&!readLink())setPreparationOpen(true);
    }
  },[ready,lock,project.preparationComplete,project.scenes.length]);
  const barSort=useGripSort('visit-bar',project.bottomBar.map(item=>item.id),(from,to)=>setProject(p=>({...p,bottomBar:reorderItems(p.bottomBar,from,to,item=>item.id)})));
  const spaceSort=useHorizontalSort((project.spaces??[]).map(sp=>sp.id),(from,to)=>setProject(p=>({...p,spaces:reorderItems(p.spaces??[],from,to,sp=>sp.id)})));
  const barCss = {
    '--nv-close-icon-image':closeIcon?`url("${closeIcon.dataUrl}")`:'none',
    '--nv-bar-bg':project.barStyle.background,
    '--nv-daynight-color':project.barStyle.dayNightColor??'#2f72b4',
    '--nv-bar-outline':project.barStyle.outline,
    '--nv-button-bg':project.barStyle.button,
    '--nv-button-outline':project.barStyle.buttonOutline,
    '--nv-icon-color':project.barStyle.icon,
    '--nv-bar-border-width':project.barStyle.outlineWidth+'px',
    '--nv-button-border-width':project.barStyle.buttonOutlineWidth+'px',
    '--nv-bar-roundness':project.barStyle.roundness+'px',
    '--nv-bar-width':project.barStyle.width?project.barStyle.width+'px':'max-content',
    '--nv-bar-height':(project.barStyle.height??82)+'px'
  } as CSSProperties;
  function changeBarStyle(update:Partial<BarStyle>) {
    setProject(p=>({...p,barStyle:{...p.barStyle,...update}}));
  }
  function openLinkInTour(title:string,raw:string,mode?:'embed'|'tab') {
    const link=safeLink(raw);
    if (!link) {setStatus('Lien invalide : utilise https://, tel: ou mailto:');return;}
    setInfo(null);
    if(mode==='tab'){launchLink(link);return;}
    if (/^https?:\/\//i.test(link)){
      let url=link;
      // Les pages Figurotta prennent en charge ?langs=fr,es,de,en,nl.
      // La page intégrée affiche seulement les langues choisies dans le projet.
      try{
        const parsed=new URL(link);
        if(parsed.hostname==='campingfigurotta-infos.vercel.app'){
          const codes=project.languages??['fr','es','de','en','nl'];
          parsed.searchParams.set('langs',codes.join(','));
          url=parsed.toString();
        }
      }catch{/* Conserver le lien original si l'URL ne peut pas être analysée. */}
      setFrame({title,url});
    }else launchLink(link);
  }
  async function exportTour(){
    if(!visibleScenes.length){setStatus('Cet espace ne contient aucun panorama à exporter');return;}
    setExporting(true);
    setStatus('Préparation du dossier HTML…');
    try {
      await exportStaticTour(projectForSpaceExport(project,currentSpace,true));
      setStatus(currentSpace?'Espace « '+currentSpace.name+' » exporté en ZIP':'Dossier HTML prêt — archive ZIP téléchargée');
    }catch(err){setStatus('Échec de l’export : '+(err instanceof Error?err.message:String(err)));}
    finally{setExporting(false);}
  }
  async function addVideo(file?:File,placement?:{sceneId:string;hotspotId:string}){
    const sceneId=placement?.sceneId??activeId,hotspotId=placement?.hotspotId??selectedId;
    if(!file||!sceneId||!hotspotId)return;
    if(!['video/mp4','video/webm'].includes(file.type)||file.size>VIDEO_MAX_BYTES){
      setStatus('Vidéo : MP4/WebM, 45 Mo maximum');return;
    }
    try{
      const data=await readImage(file);
      if(!isSafeVideoData(data))throw Error('Fichier vidéo incompatible');
      setProject(p=>({...p,scenes:p.scenes.map(scene=>scene.id===sceneId?{...scene,hotspots:scene.hotspots.map(h=>h.id===hotspotId?{...h,videoDataUrl:data,videoUrl:'',...(placement?{title:file.name.replace(/\.[^.]+$/,'').slice(0,120)}:{})}:h)}:scene)}));
      setStatus('Vidéo ajoutée à l’écran');
      void rememberMedia('video',file.name.replace(/\.[^.]+$/,''),data).then(()=>setMediaVersion(v=>v+1));
      setMediaPicker(null);
    }catch{setStatus('Impossible de lire la vidéo');}
    if(videoInput.current)videoInput.current.value='';
  }
  async function addAudio(file?:File){
    if(!file)return;
    if(!['audio/mpeg','audio/mp3','audio/ogg','audio/wav','audio/x-wav','audio/webm','audio/mp4'].includes(file.type)||
      file.size>14*1024*1024){setStatus('Audio : MP3, WAV, OGG ou WebM · 14 Mo maximum');return;}
    try{
      const data=await readImage(file);
      if(!isSafeAudioData(data))throw Error('Fichier audio incompatible');
      const id=uid(),name=file.name.replace(/\\.[^.]+$/,'').slice(0,120);
      setProject(p=>({...p,
        audioTracks:[...(p.audioTracks??[]),{id,name,dataUrl:data,volume:65,loop:true}],
        scenes:p.scenes.map(sc=>sc.id===activeId?{...sc,musicTrackId:id}:sc)
      }));
      setPanel('music');
      setStatus('Musique ajoutée à la bibliothèque, assignée au panorama actuel');
    }catch{setStatus('Impossible de lire ce son');}
    if(audioInput.current)audioInput.current.value='';
  }
  function assignMusic(trackId:string,sceneId:string,checked:boolean){
    setProject(p=>({...p,scenes:p.scenes.map(sc=>sc.id===sceneId?
      {...sc,musicTrackId:checked?trackId:undefined,audioEnabled:checked?false:sc.audioEnabled}:sc)}));
  }
  /** Tout intégrer / tout retirer : applique (ou retire) cette piste sur tous les panoramas, sans toucher aux autres pistes. */
  function assignMusicAll(trackId:string,checked:boolean){
    setProject(p=>({...p,scenes:p.scenes.map(sc=>checked?{...sc,musicTrackId:trackId,audioEnabled:false}:
      (sc.musicTrackId===trackId?{...sc,musicTrackId:undefined}:sc))}));
    setStatus(checked?'Musique appliquée à tous les panoramas · Enregistre avec la disquette.':'Musique retirée de tous les panoramas.');
  }
  function removeTrack(trackId:string){
    if(!window.confirm('Supprimer cette musique et ses affectations aux panoramas ?'))return;
    setProject(p=>({...p,
      audioTracks:p.audioTracks.filter(track=>track.id!==trackId),
      defaultMusicTrackId:p.defaultMusicTrackId===trackId?undefined:p.defaultMusicTrackId,
      scenes:p.scenes.map(sc=>sc.musicTrackId===trackId?{...sc,musicTrackId:undefined}:sc)
    }));
  }
  async function addFrameImage(file?:File,placement?:{sceneId:string;hotspotId:string}){
    if(!file)return;
    const sceneId=placement?.sceneId??activeId,hotspotId=placement?.hotspotId??selectedId;
    if(!sceneId||!hotspotId){setPhotoFeedback('Sélectionne un cadre photo ou un point Information avant d’importer une image.');return;}
    setPhotoFeedback('Import de la photo…');
    if(file.size>40*1024*1024){
      setPhotoFeedback('Photo trop volumineuse (40 Mo maximum).');
      return;
    }
    try {
      // Utilise le décodage natif du navigateur : accepte aussi les HEIC/HEIF
      // lorsque le navigateur les décode. Limite la taille pour une sauvegarde fiable.
      const imageUrl=URL.createObjectURL(file);
      let img:HTMLImageElement;
      try {
        img=new Image();
        img.decoding='async';
        await new Promise<void>((resolve,reject)=>{
          img.onload=()=>resolve();
          img.onerror=()=>reject(new Error('Image incompatible avec ce navigateur. Utilise JPG, PNG ou WebP.'));
          img.src=imageUrl;
        });
      } finally {URL.revokeObjectURL(imageUrl);}
      if(!img.naturalWidth||!img.naturalHeight)throw Error('Dimensions d’image incorrectes');
      const scale=Math.min(1,2560/Math.max(img.naturalWidth,img.naturalHeight));
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
      canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
      const ctx=canvas.getContext('2d');
      if(!ctx)throw Error('Conversion de la photo non disponible');
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      // WebP préserve les transparences des PNG et réduit sensiblement le poids du projet.
      let data=canvas.toDataURL('image/webp',0.88);
      if(!isSafeFrameImage(data)||data.length>12_000_000){
        data=canvas.toDataURL('image/jpeg',0.78);
      }
      if(!isSafeFrameImage(data)||data.length>12_000_000)throw Error('Image trop lourde après conversion. Réduis sa résolution.');
      setProject(p=>({...p,scenes:p.scenes.map(sc=>sc.id!==sceneId?sc:{
        ...sc,hotspots:sc.hotspots.map(h=>h.id===hotspotId?{...h,imageDataUrl:data,...(placement?{title:file.name.replace(/\.[^.]+$/,'').slice(0,120)}:{})}:h)
      })}));
      setPhotoFeedback('Photo importée avec succès.');
      setStatus('Photo ajoutée au panorama');
      void rememberMedia('image',file.name.replace(/\.[^.]+$/,''),data).then(()=>setMediaVersion(v=>v+1));
      setMediaPicker(null);
    }catch(e){
      const message=e instanceof Error?e.message:'Impossible de lire cette photo.';
      setPhotoFeedback(message);
      setStatus('Import photo : '+message);
    }
  }
  function importFromPicker(){
    if(!mediaPicker)return;
    pendingMediaPlacement.current={sceneId:mediaPicker.sceneId,hotspotId:mediaPicker.hotspotId,type:mediaPicker.type};
    const input=placedMediaInput.current;
    if(input){input.accept=mediaPicker.type==='image'?'image/*,.heic,.heif':'video/mp4,video/webm';input.value='';input.click();}
  }
  function pickFromLibrary(item:{name:string;dataUrl?:string;url?:string}){
    const target=mediaPicker;if(!target)return;
    setProject(p=>({...p,scenes:p.scenes.map(sc=>sc.id!==target.sceneId?sc:{...sc,hotspots:sc.hotspots.map(h=>h.id!==target.hotspotId?h:{
      ...h,
      ...(target.type==='image'?{imageDataUrl:item.dataUrl}:item.dataUrl?{videoDataUrl:item.dataUrl,videoUrl:''}:{videoUrl:item.url??'',videoDataUrl:undefined}),
      ...(target.fresh?{title:item.name.slice(0,120)}:{})
    })})}));
    setMediaPicker(null);
    setStatus((target.type==='image'?'Photo':'Vidéo')+' « '+item.name+' » ajoutée depuis la bibliothèque.');
  }
  function closeMediaPicker(){
    const target=mediaPicker;setMediaPicker(null);
    if(!target)return;
    // Le point reste placé et sélectionné : on retrouve ses réglages (icône, taille…) et on pourra choisir le média plus tard.
    setSelectedId(target.hotspotId);setPanel('points');setMode(null);setRightHidden(false);
    setStatus((target.type==='image'?'Point photo':'Point vidéo')+' créé sans média : choisis-le avec « '+(target.type==='image'?'Choisir une photo déjà utilisée':'Choisir une vidéo déjà utilisée')+' », ou règle son icône et sa taille.');
  }
  function mediaPickerEl(){
    return mediaPicker?<MediaPicker kind={mediaPicker.type} project={project} version={mediaVersion} onPick={pickFromLibrary} onImport={importFromPicker} onClose={closeMediaPicker} banner={issueFocus?<IssueBanner focus={issueFocus}/>:undefined}/>:null;
  }
  function stopAutoNavigation(){
    setAutoNavigation(false);setGuide(null);setNavigationDraft(null);setDestinationEditId(null);
    setClassicDestinationOpen(false);setFullscreenGalleryOpen(false);
    setFullscreenCommandDrawerOpen(false);setGalleryPreviewSceneId(null);
    setGalleryPreviewPinned(false);setMode(null);setSelectedId('');
    setStatus('Mode Auto arrêté · Modifications non enregistrées à sauvegarder avec la disquette.');
  }
  function toggleAutoNavigation(){
    if(autoNavigation){stopAutoNavigation();return;}
    if(!active||preview)return;
    setAutoNavigation(true);setMode('navigation');setClassicDestinationOpen(false);
    setDestinationEditId(null);setNavigationDraft(null);
    setGuide({phase:'forward',fwdYaw:cameraRef.current.yaw,fwdPitch:cameraRef.current.pitch});
    setStatus('Parcours guidé · Vise avec la cible puis clique sur + : la flèche part vers le panorama suivant.');
  }
  function selectScene(id:string){
    if(currentSpace&&!visibleIds.has(id)){setStatus('Ce panorama n’appartient pas à l’espace sélectionné');return;}
    // Navigation directe : toujours revenir à la vue d'arrivée par défaut du panorama.
    // Une arrivée personnalisée PAR FLÈCHE ne s'applique qu'au clic sur cette flèche.
    setArrivedVia(null);nextArrivalRef.current=null;setActiveId(id);
    setSelectedId('');setMode(null);
  }
  // Réutiliser le jeu Navigation réellement employé par le projet.
  // Ainsi Figurotta reprend ses trois PNG et sa taille 50px.
  function defaultNavigationIconSet(){
    if(project.defaultNavigationIcon&&project.icons.some(icon=>icon.id===project.defaultNavigationIcon!.iconId))return project.defaultNavigationIcon;
    if(project.iconPackId==='classic')return null;
    const valid=new Set(project.icons.map(icon=>icon.id));
    const counts=new Map<string,{iconId:string;hoverIconId?:string;pressedIconId?:string;iconSize:number;count:number}>();
    for(const scene of project.scenes)for(const point of scene.hotspots){
      if(point.type!=='navigation'||!point.iconId||!valid.has(point.iconId))continue;
      const iconSize=point.iconSize??28;
      const hoverIconId=point.hoverIconId&&valid.has(point.hoverIconId)?point.hoverIconId:undefined;
      const pressedIconId=point.pressedIconId&&valid.has(point.pressedIconId)?point.pressedIconId:undefined;
      const key=[point.iconId,hoverIconId??'',pressedIconId??'',iconSize].join('|');
      const old=counts.get(key);
      counts.set(key,old?{...old,count:old.count+1}:{iconId:point.iconId,hoverIconId,pressedIconId,iconSize,count:1});
    }
    const favorite=project.favoriteNavigationIconSet;
    if(favorite&&counts.has(favorite))return counts.get(favorite)!;
    return [...counts.values()].sort((a,b)=>b.count-a.count)[0]??null;
  }
  // Une seule procédure pour l'éditeur et la création plein écran :
  // mémoriser la direction de départ, orienter le panorama d'arrivée, puis valider.
  function createNavigationFromGallery(targetId:string){
    const source=project.scenes.find(scene=>scene.id===activeId);
    const destination=visibleScenes.find(scene=>scene.id===targetId);
    if(!source||!destination||source.id===destination.id)return;
    const camera=cameraRef.current;
    setNavigationDraft({
      sourceId:source.id,targetId:destination.id,
      sourceYaw:camera.sceneId===source.id?camera.yaw:source.arrivalYaw??0,
      sourcePitch:camera.sceneId===source.id?camera.pitch:source.arrivalPitch??0,
      existingPointId:destinationEditId??undefined
    });
    setFullscreenGalleryOpen(false);setFullscreenCommandDrawerOpen(false);
    setFullscreenToolsOpen(false);setHoveredGallerySceneId(null);
    setGalleryPreviewSceneId(null);setGalleryPreviewPinned(false);
    setClassicDestinationOpen(false);
    setStatus('Oriente le panorama '+destination.name+' puis clique sur Valider la direction.');
  }
  function confirmNavigationDirection(draftOverride?:{
    sourceId:string;targetId:string;sourceYaw:number;sourcePitch:number;existingPointId?:string;
    arrivalOverride?:{yaw:number;pitch:number;zoom:number};
  }){
    const draft=draftOverride??navigationDraft;
    if(!draft)return;
    const source=project.scenes.find(scene=>scene.id===draft.sourceId);
    const destination=project.scenes.find(scene=>scene.id===draft.targetId);
    if(!source||!destination){setNavigationDraft(null);return;}
    const arrival=(draftOverride?.arrivalOverride)??galleryOrientationRef.current[destination.id]??{
      yaw:destination.arrivalYaw??0,pitch:destination.arrivalPitch??0,zoom:panoramaArrivalZoom(destination)
    };
    const favorite=defaultNavigationIconSet();
    const id=draft.existingPointId??uid();
    const point:Hotspot={
      id,type:'navigation',title:'Aller vers '+destination.name,text:'',
      target:destination.id,yaw:draft.sourceYaw,pitch:draft.sourcePitch,
      arrivalYaw:arrival.yaw,arrivalPitch:arrival.pitch,arrivalZoom:arrival.zoom,
      arrivalZoomModel:'wide',
      ...(favorite?{iconId:favorite.iconId,hoverIconId:favorite.hoverIconId,
        pressedIconId:favorite.pressedIconId,iconSize:favorite.iconSize}:{})
    };
    setProject(p=>({...p,scenes:p.scenes.map(sc=>sc.id!==source.id?sc:{
      ...sc,hotspots:draft.existingPointId?
        sc.hotspots.map(h=>h.id===draft.existingPointId?{
          ...h,target:destination.id,arrivalYaw:arrival.yaw,arrivalPitch:arrival.pitch,
          arrivalZoom:arrival.zoom,arrivalZoomModel:'wide' as const
        }:h):[...sc.hotspots,point]
    })}));
    // Arriver automatiquement au panorama de destination avec l'orientation choisie.
    nextArrivalRef.current={sceneId:destination.id,yaw:arrival.yaw,pitch:arrival.pitch,zoom:arrival.zoom};
    setArrivedVia({sceneId:destination.id,hotspotId:id,fromSceneId:source.id});
    setActiveId(destination.id);setSelectedId('');setSelectedBarId('');
    setMode(autoNavigation?'navigation':null);setPreview(false);setPanel('panoramas');
    setNavigationDraft(null);setDestinationEditId(null);
    setNavigationPickerOpen(false);setClassicDestinationOpen(false);
    setFullscreenGalleryOpen(false);setFullscreenCommandDrawerOpen(false);
    setGalleryPreviewSceneId(null);setGalleryPreviewPinned(false);
    setStatus('Flèche '+(draft.existingPointId?'mise à jour':'créée')+' vers '+destination.name+(autoNavigation?' · Auto : place la flèche suivante.':' · Enregistre avec la disquette.'));
  }
  // ── Parcours guidé ──────────────────────────────────────────────────────────
  // Aller : la flèche part vers le panorama SUIVANT dans l'ordre, on y arrive en regardant dans le même sens (on avance).
  // Retour : dans ce panorama on fait demi-tour (180°), on valide la vue, la flèche retour est posée, puis on repart en avant.
  function guidedForward(yaw:number,pitch:number){
    if(!active)return;
    const index=visibleScenes.findIndex(sc=>sc.id===active.id);
    const next=visibleScenes[index+1];
    if(!next){stopAutoNavigation();setStatus('Dernier panorama atteint · le parcours est terminé. Enregistre avec la disquette.');return;}
    const existing=active.hotspots.find(h=>h.type==='navigation'&&h.target===next.id);
    const prevId=active.id;
    const alreadyBack=next.hotspots.some(h=>h.type==='navigation'&&h.target===prevId);
    confirmNavigationDirection({
      sourceId:active.id,targetId:next.id,sourceYaw:existing?.yaw??yaw,sourcePitch:existing?.pitch??pitch,
      existingPointId:existing?.id,arrivalOverride:{yaw:existing?.yaw??yaw,pitch:0,zoom:panoramaArrivalZoom(next)}
    });
    const fwdYaw=existing?.yaw??yaw,fwdPitch=existing?.pitch??pitch;
    if(alreadyBack){setGuide({phase:'forward',fwdYaw,fwdPitch});return;}
    // On arrive déjà tourné à 180° : il ne reste qu'à valider la vue pour le retour.
    const half=(fwdYaw+Math.PI)%(2*Math.PI);
    nextArrivalRef.current={sceneId:next.id,yaw:half,pitch:0,zoom:panoramaArrivalZoom(next)};
    setGuide({phase:'back',prevId,fwdYaw,fwdPitch});
    setStatus('Retour · '+next.name+' : tourne la vue vers l’arrière (180°) puis clique sur « Valider le retour ».');
  }
  function guidedBack(){
    if(!active||!guide||guide.phase!=='back'||!guide.prevId)return;
    const origin=project.scenes.find(sc=>sc.id===guide.prevId);
    const camera=cameraRef.current;
    if(!origin||camera.sceneId!==active.id)return;
    const favorite=defaultNavigationIconSet();
    const point:Hotspot={
      id:uid(),type:'navigation',title:'Retour vers '+origin.name,text:'',target:origin.id,
      yaw:camera.yaw,pitch:camera.pitch,
      // En revenant, on regarde à l'opposé de l'aller : on remonte l'allée.
      arrivalYaw:(guide.fwdYaw+Math.PI)%(2*Math.PI),arrivalPitch:0,arrivalZoom:panoramaArrivalZoom(origin),arrivalZoomModel:'wide',
      ...(favorite?{iconId:favorite.iconId,hoverIconId:favorite.hoverIconId,pressedIconId:favorite.pressedIconId,iconSize:favorite.iconSize}:{})
    };
    patchScene(sc=>({...sc,hotspots:[...sc.hotspots,point]}));
    setTurnRequest({n:Date.now(),yaw:guide.fwdYaw,pitch:guide.fwdPitch});
    setGuide({phase:'forward',fwdYaw:guide.fwdYaw,fwdPitch:guide.fwdPitch});
    setStatus('Retour créé vers '+origin.name+' · Continue : vise la suite et clique sur +.');
  }
  function guidedSkipBack(){
    if(!guide||guide.phase!=='back')return;
    setTurnRequest({n:Date.now(),yaw:guide.fwdYaw,pitch:guide.fwdPitch});
    setGuide({phase:'forward',fwdYaw:guide.fwdYaw,fwdPitch:guide.fwdPitch});
    setStatus('Pas de retour ici · Continue : vise la suite et clique sur +.');
  }
  function validateFullscreenDestination(targetId:string){
    if(!active||targetId===active.id)return;
    // The source arrow position is preserved if a navigation marker was just placed.
    // Otherwise the crosshair on the source panorama is its current camera center.
    const existing=destinationEditId?active.hotspots.find(h=>h.id===destinationEditId&&h.type==='navigation'):undefined;
    const camera=cameraRef.current;
    const view=camera.sceneId===active.id?camera:{
      yaw:active.arrivalYaw??0,pitch:active.arrivalPitch??0
    };
    confirmNavigationDirection({
      sourceId:active.id,targetId,
      sourceYaw:existing?.yaw??view.yaw,
      sourcePitch:existing?.pitch??view.pitch,
      existingPointId:existing?.id
    });
    setFullscreenSelectedDestinationId(null);
  }
  function chooseFullscreenScene(id:string){
    if(!visibleIds.has(id))return;
    selectScene(id);
    setFullscreenGalleryOpen(true);
    setFullscreenCommandDrawerOpen(true);
  }
  function stepFullscreenScene(direction:-1|1){
    if(!visibleScenes.length)return;
    const idx=visibleScenes.findIndex(sc=>sc.id===activeId);
    const next=visibleScenes[(idx+direction+visibleScenes.length)%visibleScenes.length];
    if(next)chooseFullscreenScene(next.id);
  }
  function goThroughArrow(h:Hotspot,fromSceneId:string){
    if(!h.target||!visibleIds.has(h.target))return;
    nextArrivalRef.current=h.arrivalYaw!==undefined?{sceneId:h.target,yaw:h.arrivalYaw,pitch:h.arrivalPitch??0,zoom:panoramaArrivalZoom(h)}:null;
    setArrivedVia({sceneId:h.target,hotspotId:h.id,fromSceneId});
    setActiveId(h.target);setSelectedId('');setMode(null);
  }
  function setArrowArrival(fromSceneId:string,hotspotId:string,view:{yaw:number;pitch:number;zoom:number}|null){
    setProject(p=>({...p,scenes:p.scenes.map(sc=>sc.id!==fromSceneId?sc:{...sc,hotspots:sc.hotspots.map(h=>h.id!==hotspotId?h:
      view?{...h,arrivalYaw:view.yaw,arrivalPitch:view.pitch,arrivalZoom:view.zoom,arrivalZoomModel:'wide' as const}:{...h,arrivalYaw:undefined,arrivalPitch:undefined,arrivalZoom:undefined,arrivalZoomModel:undefined})})}));
  }
  function saveArrivalForArrow(){
    if(!active||!viaHotspot)return;
    const view=cameraRef.current;
    if(view.sceneId!==active.id){setStatus('Oriente d’abord le panorama puis réessaie');return;}
    setArrowArrival(arrivedVia!.fromSceneId,viaHotspot.id,{yaw:view.yaw,pitch:view.pitch,zoom:view.zoom});
    setStatus('Vue d’arrivée enregistrée pour cette flèche');
  }
  async function importNightPanorama(file?:File){
    if(!file||!activeId)return;
    const sceneId=activeId;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>40*1024*1024){
      setStatus('Panorama nuit : JPG, PNG ou WebP, 40 Mo maximum');return;
    }
    try{
      const data=await readPanorama(file);
      setProject(p=>({...p,scenes:p.scenes.map(sc=>sc.id===sceneId?{...sc,nightDataUrl:data,nightSourceSceneId:undefined}:sc)}));
      setStatus('Panorama de nuit associé à la scène. Clique sur Lune pour le visualiser.');
    }catch{
      setStatus('Impossible d’importer cette photo de nuit');
    }
    if(nightInput.current)nightInput.current.value='';
  }
  function nightSceneControls(scene:Scene,open=false){
    const source=project.scenes.find(other=>other.id===scene.nightSourceSceneId);
    const configured=!!(scene.nightDataUrl||source);
    return <InspectorSection title="Mode jour / nuit" initiallyOpen={open}><div className="nv-night-settings">
      <p className="hint">Associe un panorama de nuit au panorama actuel. Les deux vues gardent les mêmes points et un fondu assure la transition.</p>
      <div className="nv-night-dropzone" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void importNightPanorama(e.dataTransfer.files[0]);}}>
        <button type="button" className="import" onClick={()=>nightInput.current?.click()}>
          {scene.nightDataUrl?'🌙 Remplacer la photo de nuit':'🌙 Importer un nouveau panorama 360°'}
        </button>
        <small>Ou glisse une photo 360° ici (JPG, PNG, WebP).</small>
      </div>
      <label>Ou choisir un panorama déjà importé dans la galerie
        <select value={source?.id??''} onChange={e=>{
          const id=e.target.value||undefined;
          setProject(p=>({...p,scenes:p.scenes.map(sc=>sc.id===scene.id?{...sc,nightSourceSceneId:id,nightDataUrl:undefined}:sc)}));
          setNightSceneId(null);
          setStatus(id?'Panorama de la galerie associé comme vue de nuit':'Choix de la galerie retiré');
        }}>
          <option value="">Sélectionner dans la galerie…</option>
          {project.scenes.filter(other=>other.id!==scene.id).map(other=><option key={other.id} value={other.id}>{other.name}</option>)}
        </select>
      </label>
      {source&&<div className="nv-night-source-preview">
        <img src={source.dataUrl} alt="" />
        <span>Vue Nuit : {source.name}</span>
      </div>}
      {configured&&<>
        <label className="nv-night-color-picker">Couleur du bouton Nuit
          <input type="color" aria-label="Couleur du bouton Nuit" value={project.barStyle.dayNightColor??'#2f72b4'} onChange={e=>changeBarStyle({dayNightColor:e.target.value})}/>
        </label>
        <div className="nv-daynight-preview">
          <button type="button" className={nightSceneId===scene.id?'':'is-active'} onClick={()=>setNightSceneId(null)}>☀ Jour</button>
          <button type="button" className={nightSceneId===scene.id?'is-active':''} onClick={()=>setNightSceneId(scene.id)}>☾ Nuit</button>
        </div>
        <button type="button" className="style-reset" onClick={()=>{
          setProject(p=>({...p,scenes:p.scenes.map(sc=>sc.id===scene.id?{...sc,nightDataUrl:undefined,nightSourceSceneId:undefined}:sc)}));
          setNightSceneId(null);
        }}>Retirer la version nuit</button>
      </>}
      <small className="hint-inline">Pour un fondu parfaitement aligné, utilise deux photos prises depuis le même point et orientées de la même façon.</small>
    </div></InspectorSection>;
  }
  function saveArrivalView(){
    if(!active)return;
    const view=cameraRef.current;
    if(view.sceneId!==active.id){setStatus('Oriente d’abord le panorama puis réessaie');return;}
    patchScene(sc=>({...sc,arrivalYaw:view.yaw,arrivalPitch:view.pitch,arrivalZoom:view.zoom,arrivalZoomModel:'wide'}));
    setStatus('Vue d’arrivée sauvegardée pour '+active.name);
  }
  function removeAutoNavigationArrow(id:string){
    if(!active||!active.hotspots.some(h=>h.id===id))return;
    patchScene(sc=>({...sc,hotspots:sc.hotspots.filter(h=>h.id!==id)}));
    setSelectedId('');setDestinationEditId(null);setMode(null);
    setStatus('Élément supprimé du panorama · Enregistre avec la disquette.');
  }
  function moveHotspot(id:string,yaw:number,pitch:number){
    patchScene(sc=>({...sc,hotspots:sc.hotspots.map(h=>h.id===id?{...h,yaw,pitch}:h)}));
  }
  function dropIcon(payload:string,yaw:number,pitch:number){
    // `payload` = identifiant d'une icône seule, ou JSON d'un jeu complet (normal + survol + clic).
    let set:{iconId:string;hoverIconId?:string;pressedIconId?:string;size?:number}|null=null;
    if(payload.startsWith('{')){
      try{
        const v=JSON.parse(payload) as Record<string,unknown>;
        if(typeof v.iconId==='string')set={iconId:v.iconId,
          hoverIconId:typeof v.hoverIconId==='string'?v.hoverIconId:undefined,
          pressedIconId:typeof v.pressedIconId==='string'?v.pressedIconId:undefined,
          size:typeof v.size==='number'&&Number.isFinite(v.size)?Math.max(16,Math.min(80,v.size)):undefined};
      }catch{/* payload invalide : ignoré */}
    }else set={iconId:payload};
    const exists=(id?:string)=>!!id&&project.icons.some(i=>i.id===id);
    if(!active||!set||!exists(set.iconId))return;
    const icon=project.icons.find(i=>i.id===set!.iconId)!;
    const h:Hotspot={id:uid(),type:'information',title:icon.name,text:'',target:'',yaw,pitch,iconId:set.iconId,
      ...(exists(set.hoverIconId)?{hoverIconId:set.hoverIconId}:{}),
      ...(exists(set.pressedIconId)?{pressedIconId:set.pressedIconId}:{}),
      ...(set.size?{iconSize:set.size}:{})};
    patchScene(sc=>({...sc,hotspots:[...sc.hotspots,h]}));
    setPanel('points');setSelectedId(h.id);setMode(null);
    setStatus('Icône positionnée : déplace-la dans le panorama pour l’ajuster');
  }
  function patchScene(patch:(s:Scene)=>Scene){
    setProject(p=>({...p,scenes:p.scenes.map(s=>s.id===activeId?patch(s):s)}));
  }
  // Glisser-déposer des scènes : suit le pointeur en direct (transformations CSS, aucun rendu React pendant le glissement),
  // décale les autres scènes avec une animation, fait défiler la liste près des bords. Souris, stylet et tactile (via la poignée ⋮⋮).
  function startSceneDrag(e:React.PointerEvent<HTMLDivElement>,index:number){
    if(e.button!==0||sortBusy.current)return;
    if(e.pointerType==='touch'&&!(e.target as HTMLElement).closest('.scene-grip'))return;
    const container=scenesRef.current;
    if(!container)return;
    const slots=Array.from(container.querySelectorAll<HTMLElement>(':scope > .scene-slot'));
    const el=slots[index];
    const id=project.scenes[index]?.id;
    if(!el||!id)return;
    const pointerId=e.pointerId,startY=e.clientY,startScroll=container.scrollTop;
    const tops=slots.map(n=>n.offsetTop),heights=slots.map(n=>n.offsetHeight);
    const gap=parseFloat(getComputedStyle(container).rowGap)||8;
    const step=heights[index]+gap;
    const crect=container.getBoundingClientRect(); // la liste ne bouge pas pendant le glissement
    let started=false,to=index,lastY=startY,raf=0,zoneSince=0;
    const layout=()=>{
      const last=slots.length-1;
      const raw=lastY-startY+(container.scrollTop-startScroll);
      const dy=Math.max(tops[0]-tops[index],Math.min(tops[last]+heights[last]-tops[index]-heights[index],raw));
      el.style.transform='translateY('+dy+'px)';
      const center=tops[index]+heights[index]/2+dy;
      let target=index;
      slots.forEach((n,j)=>{
        if(j===index)return;
        const c=tops[j]+heights[j]/2;
        let shift=0;
        // 1 px de tolérance : une scène collée au bord haut/bas doit bien passer devant/derrière la dernière.
        if(j<index&&c>center-1){shift=step;target=Math.min(target,j);}
        else if(j>index&&c<center+1){shift=-step;target=Math.max(target,j);}
        n.style.transform=shift?'translateY('+shift+'px)':'';
      });
      to=target;
    };
    const tick=(now:number)=>{
      // Défilement doux : zone étroite, délai avant démarrage, vitesse progressive (jamais de saut brusque).
      const edge=30;
      const depth=lastY<crect.top+edge?crect.top+edge-lastY:lastY>crect.bottom-edge?lastY-(crect.bottom-edge):0;
      if(!depth)zoneSince=0;
      else{
        if(!zoneSince)zoneSince=now;
        if(now-zoneSince>140){
          const ratio=Math.min(1,depth/edge);
          const v=Math.max(1,Math.round(13*ratio*ratio))*(lastY<crect.top+edge?-1:1);
          container.scrollTop+=v;
          layout();
        }
      }
      raf=requestAnimationFrame(tick);
    };
    const move=(ev:PointerEvent)=>{
      if(ev.pointerId!==pointerId)return;
      lastY=ev.clientY;
      if(!started){
        if(Math.abs(ev.clientY-startY)<5)return;
        started=true;
        el.classList.add('is-dragging');
        container.classList.add('is-sorting');
        raf=requestAnimationFrame(tick);
      }
      ev.preventDefault();
      layout();
    };
    const finish=(commit:boolean)=>{
      document.removeEventListener('pointermove',move);
      document.removeEventListener('pointerup',up);
      document.removeEventListener('pointercancel',cancel);
      document.removeEventListener('keydown',key);
      cancelAnimationFrame(raf);
      if(!started)return;
      suppressClick.current=true;
      window.setTimeout(()=>{suppressClick.current=false;},0);
      sortBusy.current=true;
      // La scène glisse jusqu'à sa place (au lieu de sauter), puis l'ordre est appliqué sans aucun saut à l'écran.
      const apply=commit&&to!==index;
      const finalTop=to>index?tops[to]+heights[to]-heights[index]:tops[to];
      el.classList.add('is-settling');
      el.style.transform='translateY('+(apply?finalTop-tops[index]:0)+'px)';
      if(!apply)slots.forEach(n=>{if(n!==el)n.style.transform='';});
      window.setTimeout(()=>{
        if(apply)flushSync(()=>moveScene(id,to>index?to+1:to));
        slots.forEach(n=>{n.style.transition='none';n.style.transform='';n.classList.remove('is-dragging','is-settling');});
        container.classList.remove('is-sorting');
        requestAnimationFrame(()=>{slots.forEach(n=>{n.style.transition='';});sortBusy.current=false;});
      },160);
    };
    const up=(ev:PointerEvent)=>{if(ev.pointerId===pointerId)finish(true);};
    const cancel=(ev:PointerEvent)=>{if(ev.pointerId===pointerId)finish(false);};
    const key=(ev:KeyboardEvent)=>{if(ev.key==='Escape')finish(false);};
    document.addEventListener('pointermove',move,{passive:false});
    document.addEventListener('pointerup',up);
    document.addEventListener('pointercancel',cancel);
    document.addEventListener('keydown',key);
  }
  // Réordonne les scènes. `insertAt` = position d'insertion (0..n) dans l'ordre actuel.
  // Les liens de navigation utilisent les identifiants : aucun lien n'est cassé par le changement d'ordre.
  function moveScene(id:string,insertAt:number){
    setProject(p=>{
      const from=p.scenes.findIndex(sc=>sc.id===id);
      if(from<0)return p;
      const target=Math.max(0,Math.min(p.scenes.length,insertAt));
      const to=target>from?target-1:target;
      if(to===from)return p;
      const scenes=[...p.scenes];
      const [moved]=scenes.splice(from,1);
      scenes.splice(to,0,moved);
      return {...p,scenes};
    });
  }
  function patchBar(update:Partial<BottomBarItem>){
    setProject(p=>({...p,bottomBar:p.bottomBar.map(b=>b.id===selectedBarId?{...b,...update}:b)}));
  }
  function addBar(type:BottomBarItem['type']='information'){
    if(project.bottomBar.length>=20){setStatus('20 boutons maximum');return;}
    const newItem:BottomBarItem={id:uid(),title:type==='navigation'?'Nouvelle navigation':type==='lien'?'Nouveau lien':'Nouvelle information',type,target:'',text:'',url:'',builtinIcon:type==='navigation'?'arrow':type==='lien'?'web':'info'};
    setProject(p=>({...p,bottomBar:[...p.bottomBar,newItem]}));setSelectedBarId(newItem.id);setPanel('bar');
  }
  function moveBar(direction:number){
    if(!selectedBarId)return;
    setProject(p=>{
      const items=[...p.bottomBar];const i=items.findIndex(b=>b.id===selectedBarId);const j=i+direction;
      if(i<0||j<0||j>=items.length)return p;
      [items[i],items[j]]=[items[j],items[i]];
      return {...p,bottomBar:items};
    });
  }
  function chooseBarAction(type:BottomBarItem['type'],tab?:BarGalleryTab){
    if(tab)setBarGalleryTab(tab);
    // Keep existing selections and content when changing the button's action.
    patchBar(type==='gallery'?{type,gallery:selectedBar?.gallery??[]}:{type});
  }
  const activeLanguages:StudioLanguage[]=project.languages??(project.name.toLowerCase().includes('figurotta')?STUDIO_LANGUAGES.map(lang=>lang.code):['fr']);
  function triggerBar(item:BottomBarItem){
    if(!preview){
      setSelectedBarId(current=>current===item.id?'':item.id);setPanel('bar');setSelectedId('');
      if(creationFullscreen){setFullscreenToolsTab('bar');setFullscreenToolsOpen(true);setFullscreenGalleryOpen(false);}
      return;
    }
    if(item.type==='gallery'){setGalleryOpen(item.id);return;}
    if(item.type==='navigation'){
      const dest=item.target && visibleIds.has(item.target)?item.target:visibleScenes[0]?.id;
      if(dest)selectScene(dest);
    }else if(item.type==='information') {
      if (item.url && safeLink(item.url)) openLinkInTour(item.title,item.url,item.linkMode);
      else {setFrame(null);setInfoLanguage(activeLanguages[0]??'fr');setInfo({id:item.id,type:'information',title:item.title,text:item.text,translations:item.translations,target:'',yaw:0,pitch:0});}
    }
    else if(item.url)openLinkInTour(item.title,item.url,item.linkMode);
  }
  // Atelier SVG intégré : modèles vectoriels de confiance, convertis en PNG à
  // l'enregistrement pour rester compatibles avec les projets Cloud existants.
  async function addGeneratedSvgIcon(){
    if(svgGenerating)return;
    if(project.icons.length>=150){setStatus('Bibliothèque pleine (150 icônes maximum). Masque ou retire les icônes inutiles.');return;}
    setSvgGenerating(true);
    try{
      const dataUrl=await pngFromSvg(svgPreset,svgDesign);
      if(!isSafeIconDataUrl(dataUrl))throw Error('PNG non valide');
      const chosen=SVG_ICON_PRESETS.find(p=>p.id===svgPreset);
      const icon:CustomIcon={id:uid(),name:'SVG · '+(chosen?.name??'Icône')+(svgDesign.gradient?' · dégradé':''),dataUrl};
      setProject(p=>({...p,icons:[...p.icons,icon].slice(0,150)}));
      setStatus('Icône SVG personnalisée ajoutée à la bibliothèque. Elle est prête à être utilisée dans la visite.');
    }catch{setStatus('Création de l’icône impossible dans ce navigateur');}
    finally{setSvgGenerating(false);}
  }
  // Trois PNG independants : normal, survol et pressé, exploitables dans les champs existants.
  async function addIconStates(){
    if(svgGenerating)return;
    if(project.icons.length>147){setStatus('Il faut trois emplacements libres dans la bibliothèque.');return;}
    setSvgGenerating(true);
    try{
      const brighten=(color:string,scale:number)=>{
        const channels=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
        return '#'+channels.map(n=>Math.round(scale>0?n+(255-n)*scale:n*(1+scale)).toString(16).padStart(2,'0')).join('');
      };
      const variants=[
        {label:'Normal',design:svgDesign},
        {label:'Survol',design:{...svgDesign,primary:brighten(svgDesign.primary,.22),accent:brighten(svgDesign.accent,.16)}},
        {label:'Pressé',design:{...svgDesign,primary:brighten(svgDesign.primary,-.18),accent:brighten(svgDesign.accent,-.24)}}
      ];
      const data=await Promise.all(variants.map(v=>pngFromSvg(svgPreset,v.design)));
      if(data.some(item=>!isSafeIconDataUrl(item)))throw Error('Icônes invalides');
      const name=SVG_ICON_PRESETS.find(p=>p.id===svgPreset)?.name??'Icône';
      const icons:CustomIcon[]=data.map((dataUrl,i)=>({id:uid(),name:name+' · '+variants[i].label,dataUrl}));
      setProject(p=>({
        ...p,icons:[...p.icons,...icons],
        scenes:p.scenes.map(scene=>scene.id===activeId?{...scene,hotspots:scene.hotspots.map(h=>h.id===selectedId?
          {...h,iconId:icons[0].id,hoverIconId:icons[1].id,pressedIconId:icons[2].id}:h)}:scene),
        bottomBar:p.bottomBar.map(item=>item.id===selectedBarId?
          {...item,iconId:icons[0].id,hoverIconId:icons[1].id,pressedIconId:icons[2].id}:item)
      }));
      setSvgExistingIcon(icons[0].id);
      setStatus('Les états Normal, Survol et Pressé sont créés'+(selectedId||selectedBarId?' et attribués au bouton sélectionné.':'.')+' Enregistre avec la disquette.');
    }catch{setStatus('Impossible de créer les trois états.');}
    finally{setSvgGenerating(false);}
  }
  function applyLogoPalette(colors:{primary:string;accent:string}){
    setSvgDesign(d=>({...d,...colors,secondary:'#ffffff'}));
    // Associe la charte à la barre sans modifier les images originales.
    changeBarStyle({button:colors.primary,buttonOutline:colors.accent,outline:colors.accent,icon:'#ffffff'});
  }
  async function recolorExistingSvgIcon(replaceEverywhere=false){
    const icon=project.icons.find(item=>item.id===svgExistingIcon);
    if(!icon){setStatus('Choisis une icône dans la bibliothèque.');return;}
    if(!replaceEverywhere&&project.icons.length>=150){setStatus('Bibliothèque pleine (150 icônes).');return;}
    if(replaceEverywhere&&!window.confirm('Remplacer les couleurs de cette icône partout dans la visite ? Les utilisations de cette icône seront modifiées.'))return;
    setSvgGenerating(true);
    try{
      const dataUrl=await recolorIconPng(icon.dataUrl,svgDesign);
      if(!isSafeIconDataUrl(dataUrl))throw Error('PNG non valide');
      if(replaceEverywhere){
        setProject(p=>({...p,icons:p.icons.map(existing=>existing.id===icon.id?{...existing,dataUrl}:existing)}));
      }else{
        const variant:CustomIcon={id:uid(),name:(icon.name+' · couleur').slice(0,150),dataUrl};
        setProject(p=>({...p,icons:[...p.icons,variant].slice(0,150)}));
        setSvgExistingIcon(variant.id);
      }
      setStatus(replaceEverywhere?'Couleurs mises à jour partout · Enregistre avec la disquette.':'Variante recolorée créée sans modifier l’original.');
    }catch{setStatus('Impossible de recolorer cette icône.');}
    finally{setSvgGenerating(false);}
  }
  function downloadSvgSource(){
    const name=SVG_ICON_PRESETS.find(p=>p.id===svgPreset)?.name??'NovaVisio';
    const svg=svgIconMarkup(svgPreset,svgDesign);
    const href=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
    const element=document.createElement('a');
    element.href=href;element.download='novavisio-'+svgPreset+'.svg';
    document.body.appendChild(element);element.click();element.remove();
    window.setTimeout(()=>URL.revokeObjectURL(href),1000);
    setStatus('Fichier SVG vectoriel téléchargé : '+name);
  }
  async function applyColorsFromClientLogo(){
    const logo=project.clientProfile?.logoUrl?.trim();
    if(!logo){svgLogoInput.current?.click();return;}
    setSvgGenerating(true);
    try{
      const colors=await paletteFromLogo(logo);
      applyLogoPalette(colors);
      setStatus('Couleurs détectées dans le logo associé au client.');
    }catch{
      setStatus('Logo distant inaccessible : utilise « Choisir un fichier logo » pour appliquer ses couleurs.');
    }finally{setSvgGenerating(false);}
  }
  async function applyColorsFromLogoFile(file?:File){
    if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5_000_000){
      setStatus('Logo : PNG, JPG ou WebP, 5 Mo maximum.');return;
    }
    setSvgGenerating(true);
    try{
      const colors=await paletteFromLogo(await readImage(file));
      applyLogoPalette(colors);
      setStatus('Palette extraite du logo : tu peux maintenant générer tes icônes ou ajuster le dégradé.');
    }catch{setStatus('Impossible d’extraire les couleurs du logo. Essaie un PNG ou JPG.');}
    finally{setSvgGenerating(false);}
  }
  function svgIconWorkshop(){
    const preset=SVG_ICON_PRESETS.find(p=>p.id===svgPreset);
    return <div className="nv-svg-workshop">
      <button type="button" className="nv-svg-workshop-toggle" aria-expanded={svgWorkshopOpen}
        onClick={()=>setSvgWorkshopOpen(open=>!open)}>
        <span>✦ Banque SVG · Couleurs personnalisées</span><ChevronDown size={16} className={svgWorkshopOpen?'is-open':''}/>
      </button>
      {svgWorkshopOpen&&<div className="nv-svg-workshop-inner">
        <p className="nv-svg-intro">Crée des pictogrammes pour Informations, Navigation, Horaires, Services… Modifie leurs couleurs avant de les ajouter à la visite.</p>
        <div className="nv-svg-presets" role="group" aria-label="Modèles SVG">
          {SVG_ICON_PRESETS.map(icon=><button key={icon.id} type="button"
            className={'nv-svg-preset'+(svgPreset===icon.id?' is-selected':'')}
            aria-pressed={svgPreset===icon.id} title={icon.name}
            onClick={()=>setSvgPreset(icon.id)}>
            <img src={svgIconPreview(icon.id,svgDesign)} alt=""/>
            <span>{icon.name}</span>
          </button>)}
        </div>
        <div className="nv-svg-preview-panel">
          <img src={svgIconPreview(svgPreset,svgDesign)} alt={'Aperçu SVG '+(preset?.name??'')} />
          <div><strong>{preset?.name??'Informations'}</strong><small>Aperçu de l'icône en temps réel</small></div>
        </div>
        <div className="nv-svg-colors">
          <label>Fond <input type="color" value={svgDesign.primary} onChange={e=>setSvgDesign(d=>({...d,primary:e.target.value}))}/></label>
          <label>Symbole <input type="color" value={svgDesign.secondary} onChange={e=>setSvgDesign(d=>({...d,secondary:e.target.value}))}/></label>
          <label>2ᵉ couleur <input type="color" value={svgDesign.accent} onChange={e=>setSvgDesign(d=>({...d,accent:e.target.value}))}/></label>
        </div>
        <div className="nv-svg-options">
          <label><input type="checkbox" checked={svgDesign.gradient} onChange={e=>setSvgDesign(d=>({...d,gradient:e.target.checked}))}/> Dégradé</label>
          <label>Forme
            <select value={svgDesign.shape} onChange={e=>setSvgDesign(d=>({...d,shape:e.target.value as SvgIconDesign['shape']}))}>
              <option value="circle">Ronde</option><option value="rounded">Carrée arrondie</option>
            </select>
          </label>
        </div>
        <div className="nv-svg-logo-actions">
          <button type="button" disabled={svgGenerating} onClick={()=>void applyColorsFromClientLogo()}>🎨 Charte logo · Icônes et boutons</button>
          <button type="button" disabled={svgGenerating} onClick={()=>svgLogoInput.current?.click()}>Choisir un fichier logo</button>
        </div>
        <div className="nv-svg-create-actions">
          <button type="button" className="nv-svg-create" disabled={svgGenerating||project.icons.length>=150}
            onClick={()=>void addGeneratedSvgIcon()}>＋ Ajouter à mes icônes</button>
          <button type="button" className="nv-svg-create" disabled={svgGenerating||project.icons.length>147} onClick={()=>void addIconStates()}>＋ Créer Normal / Survol / Pressé</button>
          <button type="button" onClick={downloadSvgSource}>↓ Télécharger SVG</button>
        </div>
        {project.icons.length>0&&<div className="nv-svg-recolor">
          <strong>Recolorer une icône déjà importée</strong>
          <select value={svgExistingIcon} onChange={e=>setSvgExistingIcon(e.target.value)}>
            <option value="">Choisir une icône…</option>
            {project.icons.map(icon=><option key={icon.id} value={icon.id}>{icon.name}</option>)}
          </select>
          <div className="nv-svg-create-actions">
            <button type="button" disabled={!svgExistingIcon||svgGenerating||project.icons.length>=150}
              onClick={()=>void recolorExistingSvgIcon(false)}>Créer une variante</button>
            <button type="button" disabled={!svgExistingIcon||svgGenerating}
              onClick={()=>void recolorExistingSvgIcon(true)}>Appliquer partout</button>
          </div>
          <small>« Variante » conserve l'original ; « Partout » modifie les utilisations de cette icône. Les icônes importées avec un fond opaque seront colorisées entièrement.</small>
        </div>}
        <small className="hint-inline">Les modèles sont des SVG vectoriels. Dans le projet, ils sont enregistrés en PNG haute définition pour conserver la compatibilité des exports et du Cloud.</small>
      </div>}
    </div>;
  }

  async function addIconFiles(list:FileList|null){
    if(!list?.length)return;
    const incoming:CustomIcon[]=[];
    for(const file of Array.from(list)){
      if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)){setStatus('Format autorisé : PNG, JPG, WebP ou GIF');continue;}
      if(file.size > 1_500_000){setStatus('Icône trop lourde (1,5 Mo maximum)');continue;}
      try {
        const dataUrl=await readImage(file);
        if(!isSafeIconDataUrl(dataUrl))throw new Error('Format de fichier non reconnu');
        incoming.push({id:uid(),name:file.name.replace(/\\.[^/.]+$/,'').slice(0,100),dataUrl});
      }catch{setStatus('Icône non reconnue : '+file.name);}
    }
    if(incoming.length){
      setProject(p=>({...p,icons:[...p.icons,...incoming].slice(0,150)}));
      setStatus(incoming.length+' icône(s) ajoutée(s)');
      if(panel==='points' && selectedId)patchPoint({iconId:incoming[0].id});
      if(panel==='bar' && selectedBarId)patchBar({iconId:incoming[0].id});
    }
    if(iconInput.current)iconInput.current.value='';
  }
  function requestReplaceIcon(id:string){
    replacingIconId.current=id;
    replaceIconInput.current?.click();
  }
  async function replaceIconEverywhere(file?:File){
    const id=replacingIconId.current;
    if(!file||!id)return;
    replacingIconId.current=null;
    if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type) || file.size>1_500_000){
      setStatus('Icône incompatible (PNG, JPG, WebP, GIF ; maximum 1,5 Mo)');return;
    }
    try {
      const dataUrl=await readImage(file);
      if(!isSafeIconDataUrl(dataUrl))throw Error('Format invalide');
      setProject(p=>({...p,icons:p.icons.map(icon=>icon.id===id?{...icon,dataUrl}:icon)}));
      setStatus('Icône remplacée partout : barre et points de tous les panoramas');
    }catch{setStatus('Impossible de remplacer cette icône');}
    if(replaceIconInput.current)replaceIconInput.current.value='';
  }
  function deleteIcon(id:string,confirmed=false){
    if(!confirmed&&!window.confirm('Supprimer cette icône de la bibliothèque et de ses utilisations ?'))return;
    setProject(p=>({...p,
      icons:p.icons.filter(i=>i.id!==id),
      ...Object.fromEntries((['defaultPhotoIcon','defaultVideoIcon'] as const).map(key=>{const v=p[key];return [key,!v||v.iconId===id?undefined:{...v,hoverIconId:v.hoverIconId===id?undefined:v.hoverIconId,pressedIconId:v.pressedIconId===id?undefined:v.pressedIconId}]})),
      buttonSets:p.buttonSets?.filter(set=>set.iconId!==id).map(set=>({...set,hoverIconId:set.hoverIconId===id?undefined:set.hoverIconId,pressedIconId:set.pressedIconId===id?undefined:set.pressedIconId})),
      defaultNavigationIcon:p.defaultNavigationIcon?.iconId===id?undefined:p.defaultNavigationIcon?{...p.defaultNavigationIcon,hoverIconId:p.defaultNavigationIcon.hoverIconId===id?undefined:p.defaultNavigationIcon.hoverIconId,pressedIconId:p.defaultNavigationIcon.pressedIconId===id?undefined:p.defaultNavigationIcon.pressedIconId}:undefined,
      closeIconId:p.closeIconId===id?undefined:p.closeIconId,
      soundOnIconId:p.soundOnIconId===id?undefined:p.soundOnIconId,
      soundOnHoverIconId:p.soundOnHoverIconId===id?undefined:p.soundOnHoverIconId,
      soundOnPressedIconId:p.soundOnPressedIconId===id?undefined:p.soundOnPressedIconId,
      soundOffIconId:p.soundOffIconId===id?undefined:p.soundOffIconId,
      soundOffHoverIconId:p.soundOffHoverIconId===id?undefined:p.soundOffHoverIconId,
      soundOffPressedIconId:p.soundOffPressedIconId===id?undefined:p.soundOffPressedIconId,
      // Nettoie aussi les PNG de survol et de clic : une référence orpheline empêcherait de rouvrir le projet.
      scenes:p.scenes.map(s=>({...s,hotspots:s.hotspots.map(h=>({...h,
        iconId:h.iconId===id?undefined:h.iconId,
        hoverIconId:h.hoverIconId===id?undefined:h.hoverIconId,
        pressedIconId:h.pressedIconId===id?undefined:h.pressedIconId}))})),
      bottomBar:p.bottomBar.map(b=>({...b,
        iconId:b.iconId===id?undefined:b.iconId,
        hoverIconId:b.hoverIconId===id?undefined:b.hoverIconId,
        pressedIconId:b.pressedIconId===id?undefined:b.pressedIconId}))
    }));
  }
  // Jeux d'icônes déjà utilisés dans le projet (barre + points) : la même combinaison normal / survol / clic n'apparaît qu'une fois.
  type IconSet={key:string;iconId:string;hoverIconId?:string;pressedIconId?:string;size:number;users:string[]};
  function allIconSets():IconSet[]{
    const known=(id?:string)=>id&&project.icons.some(i=>i.id===id)?id:undefined;
    const map=new Map<string,IconSet>();
    const add=(user:string,size:number,i?:string,h?:string,pr?:string)=>{
      const iconId=known(i);
      if(!iconId)return;
      const hoverIconId=known(h),pressedIconId=known(pr);
      const key=iconId+'|'+(hoverIconId??'')+'|'+(pressedIconId??'')+'|'+size; // même PNG mais taille différente = jeu différent
      const entry=map.get(key)??{key,iconId,hoverIconId,pressedIconId,size,users:[]};
      if(entry.users.length<4&&!entry.users.includes(user))entry.users.push(user);
      map.set(key,entry);
    };
    project.buttonSets?.forEach(set=>add('Bouton : '+set.name,set.iconSize,set.iconId,set.hoverIconId,set.pressedIconId));
    project.bottomBar.forEach(b=>add('Barre : '+b.title,barIconSize(b),b.iconId,b.hoverIconId,b.pressedIconId));
    if(project.defaultNavigationIcon){const nav=project.defaultNavigationIcon;add('Flèche par défaut',nav.iconSize,nav.iconId,nav.hoverIconId,nav.pressedIconId);}
    add('Fermeture des popups',42,project.closeIconId);
    project.scenes.forEach(sc=>sc.hotspots.forEach(h=>{
      if(h.type!=='image'&&h.type!=='video')add(sc.name+' : '+h.title,h.iconSize??28,h.iconId,h.hoverIconId,h.pressedIconId);
    }));
    return [...map.values()];
  }
  // Jeux visibles : ceux que l'utilisateur n'a pas retirés de la liste.
  function setNavigationIconFavorite(key:string){
    const chosen=allIconSets().find(set=>set.key===key);
    setProject(p=>({...p,favoriteNavigationIconSet:p.favoriteNavigationIconSet===key?undefined:key,
      defaultNavigationIcon:p.favoriteNavigationIconSet===key||!chosen?undefined:{iconId:chosen.iconId,hoverIconId:chosen.hoverIconId,pressedIconId:chosen.pressedIconId,iconSize:Math.max(16,Math.min(80,chosen.size))}}));
  }
  function collectIconSets():IconSet[]{
    const hidden=new Set(project.hiddenIconSets??[]);
    return allIconSets().filter(set=>!hidden.has(set.key));
  }
  function hiddenIconSetCount():number{
    const hidden=new Set(project.hiddenIconSets??[]);
    return allIconSets().filter(set=>hidden.has(set.key)).length;
  }
  // Retirer un jeu de la liste ne modifie AUCUN bouton ni point : c'est seulement un rangement des suggestions.
  function hideIconSet(key:string){
    setProject(p=>({...p,hiddenIconSets:[...new Set([...(p.hiddenIconSets??[]),key])]}));
    setStatus('Jeu retiré de la liste (tes boutons et points ne changent pas)');
  }
  function showAllIconSets(){
    setProject(p=>({...p,hiddenIconSets:undefined}));
    setStatus('Tous les jeux d’icônes sont de nouveau affichés');
  }
  const restoreHiddenLink=()=>hiddenIconSetCount()>0&&<button type="button" className="icon-set-restore" onClick={showAllIconSets}>{hiddenIconSetCount()} jeu{hiddenIconSetCount()>1?'x':''} masqué{hiddenIconSetCount()>1?'s':''} · Tout réafficher</button>;
  function iconSetCells(set:IconSet){
    const src=(id?:string)=>project.icons.find(i=>i.id===id)?.dataUrl;
    const normal=src(set.iconId),hover=src(set.hoverIconId)??normal,pressed=src(set.pressedIconId)??hover;
    return [['Normal',normal],['Survol',hover],['Clic',pressed]] as const;
  }
  function iconSetPicker(current:{iconId?:string;hoverIconId?:string;pressedIconId?:string;size:number},apply:(set:{iconId:string;hoverIconId?:string;pressedIconId?:string;size:number})=>void){
    const sets=collectIconSets().filter(set=>!(set.iconId===current.iconId&&set.hoverIconId===current.hoverIconId&&set.pressedIconId===current.pressedIconId&&set.size===current.size));
    if(!sets.length)return hiddenIconSetCount()>0?<div className="icon-set-picker">{restoreHiddenLink()}</div>:null;
    return <div className="icon-set-picker">
      <div className="icon-state-label">RÉUTILISER UN JEU D’ICÔNES DÉJÀ CRÉÉ</div>
      <small className="hint-inline">Un clic applique d’un coup le PNG normal, survol, clic <b>et la taille</b> d’un autre bouton ou point. Tu peux ensuite modifier la taille. La croix ✕ retire un jeu de cette liste sans rien changer à tes boutons.</small>
      <div className="icon-set-grid">{sets.map(set=><div className="icon-set-wrap" key={set.key}>
        <button type="button" className="icon-set"
          title={'Utilisé par : '+set.users.join(', ')}
          onClick={()=>{apply(set);setStatus('Jeu d’icônes appliqué : normal, survol, clic et taille ('+set.size+' px)');}}>
          {iconSetCells(set).map(([label,url])=><span className="icon-set-cell" key={label}><img src={url} alt=""/><small>{label}</small></span>)}
          <span className="icon-set-size">{set.size} px</span>
        </button>
        <button type="button" className={'nv-icon-set-favorite'+(project.favoriteNavigationIconSet===set.key?' is-active':'')} title="Flèche favorite du projet" aria-pressed={project.favoriteNavigationIconSet===set.key} onClick={()=>setNavigationIconFavorite(set.key)}>{project.favoriteNavigationIconSet===set.key?'★':'☆'}</button>
        <button type="button" className="icon-set-hide" title="Retirer ce jeu de la liste (aucun bouton ni point n'est modifié)" aria-label="Retirer ce jeu de la liste" onClick={()=>hideIconSet(set.key)}><XMark/></button>
      </div>)}</div>
      {restoreHiddenLink()}
    </div>;
  }
  // Choix rapide d'un jeu complet, identique à l'inspecteur principal :
  // une sélection applique normal + survol + clic + taille en une seule opération.
  function fullscreenIconSetPicker(
    current:{iconId?:string;hoverIconId?:string;pressedIconId?:string;size:number},
    apply:(set:{iconId:string;hoverIconId?:string;pressedIconId?:string;size:number})=>void
  ){
    const sets=collectIconSets();
    return <div className="nv-quick-icon-pack">
      <div className="nv-quick-section-title">JEUX D’ICÔNES COMPLETS</div>
      <p className="nv-quick-hint">Choisis un groupe : les trois états (normal, survol, clic) et la taille sont appliqués ensemble.</p>
      {sets.length>0?<div className="nv-quick-icon-packs">
        {sets.map(set=>{
          const isCurrent=set.iconId===current.iconId&&
            set.hoverIconId===current.hoverIconId&&
            set.pressedIconId===current.pressedIconId&&set.size===current.size;
          return <button type="button" key={set.key}
            className={'nv-quick-icon-pack-choice'+(isCurrent?' is-active':'')}
            title={'Utilisé par : '+set.users.join(', ')}
            aria-pressed={isCurrent}
            onClick={()=>{apply(set);setStatus('Jeu appliqué : normal, survol, clic et taille ('+set.size+' px)');}}>
            <span className="nv-quick-icon-pack-icons">
              {iconSetCells(set).map(([label,url])=><span key={label} className="nv-quick-icon-pack-state">
                {url?<img src={url} alt={label}/>:<span className="nv-quick-icon-pack-empty">◎</span>}
                <small>{label}</small>
              </span>)}
            </span>
            <span className="nv-quick-icon-pack-caption">{set.size} px{isCurrent?' · Actuel':''}</span>
          </button>;
        })}
      </div>:<p className="nv-quick-hint">Aucun pack enregistré. Crée un jeu dans le panneau classique ; il apparaîtra automatiquement ici.</p>}
      {hiddenIconSetCount()>0&&<button type="button" className="nv-quick-icon-pack-restore" onClick={showAllIconSets}>
        Réafficher les {hiddenIconSetCount()} jeux masqués
      </button>}
    </div>;
  }
  // Un seul état à la fois : on voit l'icône de CE bouton, pas toute la bibliothèque.
  function iconStateEditor(key:string,label:string,iconId:string|undefined,apply:(value:string|undefined)=>void,fallback:string){
    const icon=project.icons.find(i=>i.id===iconId);
    const open=libraryFor===key;
    return <div className="icon-state">
      <div className="icon-state-label">{label}</div>
      <div className="icon-state-row">
        <div className="icon-state-preview" title={icon?.name??fallback}>{icon?<img src={icon.dataUrl} alt={icon.name}/>:<span>{fallback}</span>}</div>
        <div className="icon-state-actions">
          <button type="button" className="tool" onClick={()=>{stateTarget.current=apply;stateIconInput.current?.click();}}>{icon?'Remplacer par un fichier…':'Importer un fichier…'}</button>
          <button type="button" className="tool" onClick={()=>setLibraryFor(open?null:key)}>{open?'Fermer la bibliothèque':'Choisir dans ma bibliothèque'}</button>
          {icon&&<button type="button" className="tool" onClick={()=>apply(undefined)}>Retirer</button>}
        </div>
      </div>
      {open&&<div className="icon-choice-row">
        {project.icons.map(i=><span key={i.id} className="icon-choice-wrap">
          <button type="button" title={i.name} className={i.id===iconId?'icon-choice chosen':'icon-choice'} onClick={()=>{apply(i.id);setLibraryFor(null);}}>
            <img src={i.dataUrl} alt={i.name}/></button>
          <button type="button" className="icon-delete" title={'Supprimer « '+i.name+' » de la bibliothèque'} aria-label={'Supprimer '+i.name} onClick={()=>deleteIcon(i.id)}><XMark/></button>
        </span>)}
        <button type="button" className="icon-choice icon-upload" title="Ajouter un nouveau PNG" onClick={()=>{stateTarget.current=apply;stateIconInput.current?.click();}}>＋</button>
      </div>}
    </div>;
  }
  async function importStateIcon(file?:File){
    const apply=stateTarget.current;
    stateTarget.current=null;
    if(stateIconInput.current)stateIconInput.current.value='';
    if(!file||!apply)return;
    if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)||file.size>1_500_000){
      setStatus('Icône incompatible (PNG, JPG, WebP, GIF ; maximum 1,5 Mo)');return;
    }
    try{
      const dataUrl=await readImage(file);
      if(!isSafeIconDataUrl(dataUrl))throw Error('Format invalide');
      const created:CustomIcon={id:uid(),name:file.name.replace(/\.[^/.]+$/,'').slice(0,100),dataUrl};
      setProject(p=>({...p,icons:[...p.icons,created].slice(0,150)}));
      apply(created.id);
      setStatus('PNG appliqué à cet état du bouton uniquement');
    }catch{setStatus('Impossible de lire cette icône');}
  }
  // Upload directly within the native fullscreen element, so the user never
  // needs to leave the panorama or click a hidden input outside fullscreen.
  async function uploadFullscreenIcon(file:File|undefined,field:'iconId'|'hoverIconId'|'pressedIconId'){
    if(!file)return;
    if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)||file.size>1_500_000){
      setStatus('Icône invalide : PNG/JPG/WebP/GIF, 1,5 Mo max');return;
    }
    try{
      const url=await readImage(file);
      if(!isSafeIconDataUrl(url))throw Error('Format non pris en charge');
      const id=uid();
      const icon:CustomIcon={id,name:file.name.replace(/\.[^.]+$/,'').slice(0,100),dataUrl:url};
      const pointId=selectedId,barId=selectedBarId,sceneId=activeId,tab=fullscreenToolsTab;
      setProject(p=>({
        ...p,icons:[...p.icons,icon].slice(0,150),
        scenes:tab==='point'?p.scenes.map(sc=>sc.id!==sceneId?sc:{...sc,
          hotspots:sc.hotspots.map(h=>h.id===pointId?{...h,[field]:id}:h)}):p.scenes,
        bottomBar:tab==='bar'?p.bottomBar.map(b=>b.id===barId?{...b,[field]:id}:b):p.bottomBar
      }));
      setStatus('Icône importée et appliquée');
    }catch{setStatus('Erreur pendant l’import de l’icône');}
  }
  function selectPointForEditing(id:string){
    if(autoNavigation)stopAutoNavigation();
    setSelectedId(id);setSelectedBarId('');setPanel('points');setMode(null);setRightHidden(false);
    setDestinationEditId(null);setClassicDestinationOpen(false);setNavigationPickerOpen(false);
    setFullscreenGalleryOpen(false);setFullscreenCommandDrawerOpen(false);
    if(creationFullscreen){setFullscreenToolsTab('point');setFullscreenToolsOpen(true);}
    // Flèche sans destination : on ouvre directement la galerie 360° pour choisir le panorama d'arrivée.
    const hs=active?.hotspots.find(h=>h.id===id);
    if(!creationFullscreen&&!preview&&active&&hs?.type==='navigation'&&(!hs.target||!project.scenes.some(sc=>sc.id===hs.target))){
      setClassicDestinationSearch('');
      setClassicDestinationPreviewId(suggestDestinations(active.id)[0]?.id??project.scenes.find(sc=>sc.id!==active.id)?.id??null);
      setClassicDestinationOpen(true);
    }
  }
  function navigationEditor(){
    if(!selected||selected.type!=='navigation')return null;
    return <div className="nv-navigation-edit-card">
      <strong>Modifier cette flèche</strong>
      <label>Panorama d’arrivée
        <select aria-label="Panorama d’arrivée" value={selected.target} onChange={event=>setNavigationDestination(event.target.value)}>
          <option value="">Choisir un panorama…</option>
          {visibleScenes.filter(scene=>scene.id!==activeId).map(scene=><option key={scene.id} value={scene.id}>{scene.name}</option>)}
        </select>
      </label>
      <small>Glisse la poignée ✥ à côté de la flèche pour la déplacer. La croix rouge la supprime.</small>
      <button type="button" className="delete" onClick={()=>removeAutoNavigationArrow(selected.id)}>Supprimer la flèche</button>
    </div>;
  }
  function patchPoint(update:Partial<Hotspot>){
    patchScene(s=>({...s,hotspots:s.hotspots.map(h=>h.id===selectedId?{...h,...update}:h)}));
  }
  // Le choix d'une destination ne crée JAMAIS un point de retour implicitement.
  // L'utilisateur peut créer ce retour volontairement via reverseNavigation.
  function setNavigationDestination(targetId:string){
    if(!active||!selected||selected.type!=='navigation'||(targetId&&(!visibleIds.has(targetId)||targetId===active.id)))return;
    const fromId=active.id,pointId=selected.id;
    setProject(p=>({...p,scenes:p.scenes.map(sc=>sc.id===fromId?
      {...sc,hotspots:sc.hotspots.map(h=>h.id===pointId?
        {...h,target:targetId,arrivalYaw:galleryOrientationRef.current[targetId]?.yaw??(h.target===targetId?h.arrivalYaw:undefined),
          arrivalPitch:galleryOrientationRef.current[targetId]?.pitch??(h.target===targetId?h.arrivalPitch:undefined),
          arrivalZoom:galleryOrientationRef.current[targetId]?.zoom??(h.target===targetId?h.arrivalZoom:undefined),
          arrivalZoomModel:'wide' as const}:h)}:sc)}));
    setNavigationPickerOpen(false);
    setClassicDestinationOpen(false);
    setNavigationPickerHover(null);
    setNavigationPickerPreviewId(null);
    setStatus(targetId?'Destination sélectionnée · aucun retour créé automatiquement':'Destination retirée');
  }
  // Une connexion A → B peut créer sa flèche retour B → A en un seul clic.
  // Le point est placé devant la caméra à l'arrivée sur B ; ajustable ensuite.
  function reverseNavigation(h:Hotspot){
    if(!active||h.type!=='navigation'||!h.target||h.target===active.id)return;
    const originId=active.id,originName=active.name;
    const destination=project.scenes.find(sc=>sc.id===h.target);
    if(!destination){setStatus('Panorama de destination introuvable');return;}
    if(currentSpace&&!visibleIds.has(destination.id)){setStatus('Destination hors de cet espace');return;}
    const existing=destination.hotspots.find(point=>point.type==='navigation'&&point.target===originId);
    if(existing){
      setActiveId(destination.id);setSelectedId(existing.id);setPanel('points');setFullscreenToolsTab('point');
      setFullscreenToolsOpen(true);setMode(null);
      setStatus('Le retour existe déjà : point sélectionné dans '+destination.name);
      return;
    }
    const newId=uid();
    const reverse:Hotspot={
      id:newId,type:'navigation',title:'Retour vers '+originName,text:'',target:originId,
      yaw:(((h.arrivalYaw??destination.arrivalYaw??0)+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI),
      pitch:-0.12,
      ...(h.iconId?{iconId:h.iconId}:{}),
      ...(h.hoverIconId?{hoverIconId:h.hoverIconId}:{}),
      ...(h.pressedIconId?{pressedIconId:h.pressedIconId}:{}),
      ...(h.iconSize?{iconSize:h.iconSize}:{})
    };
    setProject(p=>({...p,scenes:p.scenes.map(sc=>sc.id===destination.id?
      {...sc,hotspots:sc.hotspots.some(point=>point.type==='navigation'&&point.target===originId)?
        sc.hotspots:[...sc.hotspots,reverse]}:sc)}));
    setActiveId(destination.id);setSelectedId(newId);setPanel('points');setFullscreenToolsTab('point');
    setFullscreenToolsOpen(true);setMode(null);
    setStatus('Retour créé dans '+destination.name+' : déplace la flèche si nécessaire puis enregistre.');
  }
  async function addImages(list:FileList|null){
    if(!list?.length)return;
    const next:Scene[]=[];
    for(const file of Array.from(list)){
      if(!['image/jpeg','image/png','image/webp'].includes(file.type))continue;
      if(file.size>40*1024*1024){setStatus('Image trop lourde (40 Mo maximum pour ce prototype)');continue;}
      try {
        next.push({id:uid(),name:file.name.replace(/\.[^.]+$/,'').slice(0,100),dataUrl:await readPanorama(file),hotspots:[]});
      } catch { setStatus('Erreur de lecture : '+file.name); }
    }
    if(next.length){
      setProject(p=>({...p,scenes:[...p.scenes,...next.map(scene=>({...scene,musicTrackId:p.defaultMusicTrackId}))],
        spaces:activeSpaceId?(p.spaces??[]).map(space=>space.id===activeSpaceId?{
          ...space,sceneIds:[...space.sceneIds,...next.map(scene=>scene.id)]
        }:space):p.spaces
      }));
      if(!activeId)setActiveId(next[0].id);
      setStatus(next.length+' panorama(s) importé(s)');
    }
    if(upload.current)upload.current.value='';
  }
  function newPoint(yaw:number,pitch:number){
    if(!active||!mode)return;
    const importedVideo=mode==='video'&&clientVideoPlacement?.sceneId===active.id?clientVideoPlacement:null;
    const favorite=mode==='navigation'?defaultNavigationIconSet():mode==='image'?project.defaultPhotoIcon:mode==='video'?project.defaultVideoIcon:null;
    const h:Hotspot={
      id:uid(),type:mode,title:mode==='navigation'?'Aller vers…':mode==='lien'?'Ouvrir un lien':mode==='image'?'Photo':mode==='video'?'Vidéo':'Informations',
      text:'',target:'',yaw,pitch,
      ...(favorite?{iconId:favorite.iconId,hoverIconId:favorite.hoverIconId,
        pressedIconId:favorite.pressedIconId,iconSize:favorite.iconSize}:{}),
      ...(['image','video'].includes(mode)?{mediaDisplay:'popup' as const,frameWidth:320,frameHeight:200,frameReferenceHeight:Math.max(100,viewAreaRef.current?.clientHeight||550),frameReferenceZoom:cameraRef.current.zoom,frameCorners:defaultFrameCorners(),fadeOnClick:true}:{}),
      ...(mode==='lien'?{linkMode:'embed' as const}:{}),
      ...(mode==='video'?{videoAutoplay:true,videoLoop:true,videoOpenFullscreen:true}:{}),
      ...(importedVideo?{videoDataUrl:importedVideo.dataUrl,title:importedVideo.name.replace(/\.[^.]+$/,'').slice(0,120)}:{})
    };
    patchScene(s=>({...s,hotspots:[...s.hotspots,h]}));
    setSelectedId(h.id);setPanel('points');setMode(null);
    if(mode==='information'){setRightHidden(false);setInformationEdit({sceneId:active.id,pointId:h.id});}
    if(mode==='lien')setRightHidden(false);
    if(importedVideo){setClientVideoPlacement(null);setRightHidden(false);setStatus('Vidéo NovaGen placée · Enregistre la visite pour conserver le fichier');}
    if(mode==='image'||(mode==='video'&&!importedVideo)){
      setRightHidden(false);
      setMediaPicker({sceneId:active.id,hotspotId:h.id,type:mode,fresh:true});
    }
    if(mode==='navigation'){
      const sceneIndex=visibleScenes.findIndex(sc=>sc.id===active.id);
      const suggestion=visibleScenes[(sceneIndex+1)%visibleScenes.length];
      setDestinationEditId(h.id);
      setClassicDestinationPreviewId(suggestion&&suggestion.id!==active.id?suggestion.id:null);
      setClassicDestinationSearch('');
      if(creationFullscreen){
        setFullscreenToolsOpen(false);setFullscreenCommandDrawerOpen(true);setFullscreenGalleryOpen(true);
      }else setClassicDestinationOpen(true);
    }else if(creationFullscreen){
      setFullscreenToolsTab('point');setFullscreenToolsOpen(true);setFullscreenGalleryOpen(false);
    }
  }
  // « Enregistrer » depuis le répertoire Clients : on attend que la fiche soit bien dans le projet, puis on enregistre.
  useEffect(()=>{
    if(!pendingClientSaveRef.current)return;
    pendingClientSaveRef.current=false;
    void manualSave();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[project.clientProfile]);
  function selectSpace(spaceId:string|null){
    const space=spaceId?(project.spaces??[]).find(item=>item.id===spaceId):null;
    if(spaceId&&!space)return;
    const first=space?scenesInSpace(project,space)[0]:project.scenes[0];
    setActiveSpaceId(space?.id??null);
    setActiveId(first?.id??'');
    setSelectedId('');setMode(null);setPreview(false);
    setArrivedVia(null);nextArrivalRef.current=null;
    setSpaceManagerOpen(false);
  }
  function createSpace(){
    if((project.spaces??[]).length>=80){setStatus('Limite de 80 espaces atteinte');return;}
    const id=uid(),count=(project.spaces??[]).length+1;
    const name='Espace '+count;
    // Start with the complete visit; the user deselects any unwanted panoramas.
    // The original master project remains untouched.
    setProject(p=>({...p,spaces:[...(p.spaces??[]),{
      id,name,sceneIds:p.scenes.map(scene=>scene.id)
    }]}));
    setActiveSpaceId(id);setSelectedId('');setPreview(false);setMode(null);
    setSpaceManagerOpen(true);
    setStatus('Espace créé sans dupliquer ni supprimer aucun panorama');
  }
  function startSpaceRename(spaceId:string,name:string){
    cancelSpaceEditRef.current=false;
    setEditingSpaceId(spaceId);
    setEditingSpaceName(name);
  }
  function finishSpaceRename(spaceId:string){
    if(!cancelSpaceEditRef.current){
      const name=safeSpaceName(editingSpaceName).trim();
      if(name&&spaceId==='__project__')setProject(p=>({...p,name:name.slice(0,150)}));
      else if(name)renameSpace(spaceId,name);
    }
    cancelSpaceEditRef.current=false;
    setEditingSpaceId(null);
  }
  function renameSpace(spaceId:string,name:string){
    if(!safeSpaceName(name).trim())return;
    setProject(p=>({...p,spaces:(p.spaces??[]).map(space=>
      space.id===spaceId?{...space,name:safeSpaceName(name)}:space)}));
  }
  function setSceneInSpace(spaceId:string,sceneId:string,include:boolean){
    if(!project.scenes.some(scene=>scene.id===sceneId))return;
    setProject(p=>({...p,spaces:(p.spaces??[]).map(space=>{
      if(space.id!==spaceId)return space;
      const ids=space.sceneIds.filter(id=>id!==sceneId);
      if(include)ids.push(sceneId);
      return {...space,sceneIds:ids};
    })}));
    if(!include&&activeId===sceneId){
      const alternative=visibleScenes.find(scene=>scene.id!==sceneId);
      setActiveId(alternative?.id??'');setSelectedId('');setMode(null);
    }
  }
  function removeSceneFromSpace(spaceId:string,sceneId:string){
    const sc=project.scenes.find(item=>item.id===sceneId);
    if(!sc)return;
    setSceneInSpace(spaceId,sceneId,false);
    setStatus('« '+sc.name+' » retiré de cet espace uniquement. Original conservé.');
  }
  /** Ajoute (copie) ou déplace tous les panoramas d'un espace vers un autre. Les panoramas originaux ne sont jamais touchés. */
  function transferSpaceScenes(fromId:string,toId:string,move:boolean){
    const from=(project.spaces??[]).find(item=>item.id===fromId),to=(project.spaces??[]).find(item=>item.id===toId);
    if(!from||!to||from.id===to.id)return;
    const moved=from.sceneIds.filter(id=>project.scenes.some(sc=>sc.id===id));
    const added=moved.filter(id=>!to.sceneIds.includes(id)).length;
    setProject(p=>({...p,spaces:(p.spaces??[]).map(sp=>{
      if(sp.id===toId)return {...sp,sceneIds:[...sp.sceneIds,...moved.filter(id=>!sp.sceneIds.includes(id))]};
      if(sp.id===fromId&&move)return {...sp,sceneIds:[]};
      return sp;
    })}));
    if(move){setActiveId('');setSelectedId('');}
    setStatus(added+' panorama(s) '+(move?'déplacé(s)':'ajouté(s)')+' vers « '+to.name+' ». Les originaux sont conservés.');
  }
  /** Supprime un espace ; ses panoramas peuvent d'abord être transférés vers un autre espace. */
  function deleteSpace(spaceId:string,transferTo?:string){
    const space=(project.spaces??[]).find(item=>item.id===spaceId);
    if(!space)return;
    const target=transferTo?(project.spaces??[]).find(item=>item.id===transferTo&&item.id!==spaceId):undefined;
    const moved=target?space.sceneIds.filter(id=>project.scenes.some(sc=>sc.id===id)):[];
    setProject(p=>({...p,spaces:(p.spaces??[]).filter(item=>item.id!==spaceId).map(sp=>
      target&&sp.id===target.id?{...sp,sceneIds:[...sp.sceneIds,...moved.filter(id=>!sp.sceneIds.includes(id))]}:sp)}));
    if(target){
      setActiveSpaceId(target.id);
      setActiveId(moved[0]??target.sceneIds[0]??'');
    }else{
      setActiveSpaceId(null);setActiveId(project.scenes[0]?.id??'');
    }
    setSelectedId('');setPreview(false);setMode(null);setSpaceManagerOpen(false);setSpaceDelete(null);
    setStatus(target?'Espace supprimé · panoramas transférés vers « '+target.name+' ». Rien n\'est perdu.':'Espace supprimé. Tous les panoramas du projet principal sont conservés.');
  }
  /** Fichier HTML « NovaVisio » : une seule page qui affiche toujours la dernière version publiée de LA visite affichée
   *  (le projet complet, ou uniquement l'espace sélectionné : jamais les autres espaces). */
  async function exportNovaVisioHtml(){
    const scopeName=currentSpace?currentSpace.name:project.name;
    const link=currentSpace?readSpaceCloudLink(currentSpace.id,'public'):readLink();
    if(!link){setStatus(currentSpace?'NovaVisio : l’espace « '+currentSpace.name+' » n’est pas encore publié. Ouvre Partager › Lien public avec cet espace sélectionné, ou clique sur Publier.':'NovaVisio : enregistre d’abord la visite dans le Cloud, puis clique sur Publier.');return;}
    try{
      const pub=await getPublication(link.projectId);
      if(!pub||!publicationActive(pub)){setStatus('NovaVisio : « '+scopeName+' » n’est pas encore publié. Clique d’abord sur Publier, puis sur HTML NovaVisio.');return;}
      const html=wrapperHtml(shareUrl(pub.token),scopeName||'Visite 360°',project.introEnabled?project.introUrl:'',project.introDuration??6);
      const url=URL.createObjectURL(new Blob([html],{type:'text/html'}));
      const a=document.createElement('a');a.href=url;a.download=((scopeName||'visite').replace(/[^a-zA-Z0-9-]/g,'_')||'visite')+'-novavisio.html';
      document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
      setStatus('Fichier HTML de « '+scopeName+' » téléchargé. Il affiche toujours la dernière version publiée de cette visite : après une mise à jour, clique simplement sur Publier.');
    }catch(e){setStatus('NovaVisio : '+(e instanceof Error?e.message:String(e)));}
  }
  function download(){
    const blob=new Blob(projectJsonParts(project),{type:'application/json'}); // par morceaux : pas de limite de ~512 Mo
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;link.download=(project.name.replace(/[^a-zA-Z0-9-]/g,'_')||'visite')+'.nvstudio.json';
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  async function openProject(file?:File){
    if(!file)return;
    try {
      setStatus('Lecture du fichier… 0 %');
      const raw=await readProjectFile(file,pct=>setStatus('Lecture du fichier… '+pct+' %'));
      const imported=ensureFrameReferences(validateProject(raw),viewAreaRef.current?.clientHeight||550);
      if(!window.confirm('Remplacer le projet actuellement ouvert par ce fichier ?'))return;
      setActiveSpaceId(null);setSpaceManagerOpen(false);setProject(imported);setActiveId(imported.scenes[0]?.id??'');setSelectedId('');setMode(null);setPreview(false);
      cloud.unlink(); // un autre projet : il aura sa propre visite dans le cloud (l'ancienne reste intacte)
      setStatus('Projet importé');setPreparationOpen(false);
    }catch(e){window.alert('Impossible d’ouvrir ce projet : '+String(e));}
    finally {if(projectInput.current)projectInput.current.value='';}
  }
  function downloadRawStored(){
    const raw=rawStoredRef.current;
    if(!raw){window.alert('Aucune donnée brute à télécharger.');return;}
    const url=URL.createObjectURL(new Blob(projectJsonParts(raw),{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='projet-enregistre-brut.json';
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function startEmptyOverUnreadable(){
    if(!window.confirm('Repartir d’un projet vide REMPLACE définitivement le projet enregistré dans ce navigateur. As-tu téléchargé les données brutes ?'))return;
    baseRef.current=(rawStoredRef.current as {updatedAt?:string}|null)?.updatedAt??null;
    const fresh=newProject();
    setProject(fresh);setActiveId('');setSelectedId('');setLock(null);setPreparationOpen(true);
    void persist(fresh,true);
  }
  function startFresh(){
    if(project.scenes.length && !window.confirm('Créer un nouveau projet ? Pense à exporter celui-ci avant.'))return;
    setActiveSpaceId(null);setSpaceManagerOpen(false);resetProject(newProject());setActiveId('');setSelectedId('');setMode(null);setPreview(false);setPreparationOpen(true);
    cloud.unlink();
  }
  function addClientLink(item:ClientLink){
    const next:BottomBarItem={id:uid(),title:item.label,type:item.kind==='info'?'information':'lien',target:'',text:'',url:item.url,builtinIcon:item.label==='Appeler'?'phone':item.label==='Itinéraire'?'grid':'info'};
    setProject(p=>({...p,bottomBar:[...p.bottomBar,next]}));
    setSelectedBarId(next.id);setPanel('bar');setStatus('Bouton « '+item.label+' » ajouté à la barre du bas · Enregistre la visite');
  }
  function placeClientVideo(video:ImportedClientVideo){
    if(!active)return;
    if(autoNavigation)stopAutoNavigation();
    setClientOpen(false);setPreview(false);setSelectedId('');setSelectedBarId('');
    setPanel('points');setMode('video');setRightHidden(false);
    setClientVideoPlacement({...video,sceneId:active.id});
    setStatus('Clique dans le panorama pour placer « '+video.name+' »');
  }
  const clientView=<ClientPanel value={project.clientProfile}
    onChange={clientProfile=>setProject(p=>({...p,clientProfile}))}
    onAddLink={addClientLink} canPlaceVideo={!!active} onPlaceVideo={placeClientVideo}/>;
  return <div ref={studioRef} className={
    'app nv-studio-pro'+
    (studioFallback?' nv-studio-fullscreen-fallback':'')+
    (leftHidden?' nv-studio-hide-left':'')+
    ' nv-studio-hide-right'+(!rightHidden?' nv-sheet-open':'')+(selectedId&&panel==='points'?' nv-sheet-side':'')+
    (sceneDensity==='compact'?' nv-scenes-compact':'')
  }>
    <header className="topbar nv-topbar-v3">
      <div className="nv-v3-left">
      <div className="nv-top-left">
        <button type="button" className={'nv-header-burger'+(navigationDrawerOpen?' is-open':'')}
          aria-label="Ouvrir le menu de navigation" aria-expanded={navigationDrawerOpen}
          aria-controls="nv-studio-navigation" onClick={()=>{setNavigationDrawerOpen(open=>!open);setOpenTopMenu(null);}}>
          <Menu size={22}/><span>Menu</span>
        </button>
        {navigationDrawerOpen&&<button type="button" className="nv-navigation-scrim"
          aria-label="Fermer le menu" onClick={()=>{setNavigationDrawerOpen(false);setOpenTopMenu(null);}}/>}
        <nav id="nv-studio-navigation" className={'nv-navigation-drawer'+(navigationDrawerOpen?' is-open':'')}
          aria-label="Navigation NovaStudio" aria-hidden={!navigationDrawerOpen}>
          <div className="nv-navigation-brand">
            <div className="brand">
              <div className="brand-logo">
                <img src="/brand/novavisio-logo.png" alt="Logo NovaVisio" draggable={false}/>
              </div>
              <div className="nv-brand-text">
                <strong>NovaVisio <span>Studio</span></strong>
                <small>ÉDITEUR DE VISITES 360°</small>
              </div>
            </div>
          </div>
          <div className="nv-navigation-drawer-header"><strong>Navigation</strong>
            <button type="button" onClick={()=>{setNavigationDrawerOpen(false);setOpenTopMenu(null);}} aria-label="Fermer le menu"><XMark/></button>
          </div>
          <button type="button" className="nv-client-top-btn" onClick={()=>{setSkinsOpen(true);setNavigationDrawerOpen(false);setOpenTopMenu(null);}}><span className="nv-drawer-item-label"><Layers size={17}/> Skins</span></button>
          <button type="button" className="nv-client-top-btn" onClick={()=>{setPreparationOpen(true);setNavigationDrawerOpen(false);setOpenTopMenu(null);}}><span className="nv-drawer-item-label"><Sparkles size={17}/> Préparer le projet</span></button>
          <button type="button" className="nv-client-top-btn" onClick={()=>{setClientOpen(true);setNavigationDrawerOpen(false);setOpenTopMenu(null);}}>
            <Users size={17}/><span className="nv-drawer-item-label">Clients</span>
          </button>
          <div className="nv-header-menu-list" ref={topMenusRef}>
          <div className="nv-menu-root">
            <button type="button" className={'nv-menu-trigger '+(openTopMenu==='file'?'is-open':'')}
              aria-haspopup="menu" aria-expanded={openTopMenu==='file'}
              onClick={()=>setOpenTopMenu(m=>m==='file'?null:'file')}>
              <span className="nv-drawer-item-label"><Plus size={17}/> Fichier</span><ChevronDown size={15}/>
            </button>
            {openTopMenu==='file'&&<div className="nv-menu-popover" role="menu" aria-label="Fichier">
              <button type="button" role="menuitem" onClick={()=>{setOpenTopMenu(null);startFresh();}}>
                <Plus size={16}/><span>Nouveau projet</span>
              </button>
              <button type="button" role="menuitem" onClick={()=>{setOpenTopMenu(null);projectInput.current?.click();}}>
                <Download size={16}/><span>Ouvrir un projet</span>
              </button>
              <div className="nv-menu-divider" role="separator"/>
              <button type="button" role="menuitem" disabled={!ready||savingManually||!!lock}
                onClick={()=>{setOpenTopMenu(null);void manualSave();}}>
                <Save size={16}/><span>Enregistrer maintenant</span><b>⌘ S</b>
              </button>
              <button type="button" role="menuitem" onClick={()=>{setOpenTopMenu(null);download();}}>
                <Download size={16}/><span>Télécharger une copie .nvstudio.json</span>
              </button>
              <button type="button" role="menuitem" disabled={exporting||!visibleScenes.length}
                onClick={()=>{setOpenTopMenu(null);void exportTour();}}>
                <Sparkles size={16}/><span>{currentSpace?'Exporter cet espace':'Exporter HTML / ZIP'}</span>
              </button>
            </div>}
          </div>
          <div className="nv-menu-root">
            <button type="button" className={'nv-menu-trigger '+(openTopMenu==='share'?'is-open':'')}
              aria-haspopup="menu" aria-expanded={openTopMenu==='share'}
              onClick={()=>setOpenTopMenu(m=>m==='share'?null:'share')}>
              <span className="nv-drawer-item-label"><Link2 size={17}/> Partager</span><ChevronDown size={15}/>
            </button>
            {openTopMenu==='share'&&<div className="nv-menu-popover" role="menu" aria-label="Partager">
              <button type="button" role="menuitem" onClick={()=>{setOpenTopMenu(null);setShareOpen(true);}}>
                <Link2 size={16}/><span>Lien public et publication</span>
              </button>
              <button type="button" role="menuitem" onClick={()=>{setOpenTopMenu(null);setPrivateOpen(true);}}>
                <Lock size={16}/><span>Invitations et lien privé</span>
              </button>
            </div>}
          </div>
          <div className="nv-menu-root">
            <button type="button" className={'nv-menu-trigger '+(openTopMenu==='display'?'is-open':'')}
              aria-haspopup="menu" aria-expanded={openTopMenu==='display'}
              onClick={()=>setOpenTopMenu(m=>m==='display'?null:'display')}>
              <span className="nv-drawer-item-label"><Eye size={17}/> Affichage</span><ChevronDown size={15}/>
            </button>
            {openTopMenu==='display'&&<div className="nv-menu-popover nv-display-popover"
              role="menu" aria-label="Affichage">
              <button type="button" role="menuitem" onClick={()=>void toggleStudioFullscreen()}>
                {studioFullscreen?<Minimize2 size={16}/>:<Maximize2 size={16}/>}
                <span>{studioFullscreen?'Quitter le plein écran':'Plein écran du logiciel'}</span>
              </button>
              <div className="nv-menu-divider" role="separator"/>
              <button type="button" role="menuitemcheckbox" aria-checked={!leftHidden}
                onClick={()=>setLeftHidden(value=>!value)}>
                <PanelLeftClose size={16}/><span>Colonne panoramas</span><b>{leftHidden?'Masquée':'Visible'}</b>
              </button>
              <button type="button" role="menuitemcheckbox" aria-checked={!rightHidden}
                onClick={()=>setRightHidden(value=>!value)}>
                <PanelRightClose size={16}/><span>Inspecteur</span><b>{rightHidden?'Masqué':'Visible'}</b>
              </button>
              <div className="nv-menu-divider" role="separator"/>
              <button type="button" role="menuitemradio" aria-checked={sceneDensity==='comfortable'}
                onClick={()=>setSceneDensity('comfortable')}>
                <Images size={16}/><span>Grandes miniatures</span><b>{sceneDensity==='comfortable'?'✓':''}</b>
              </button>
              <button type="button" role="menuitemradio" aria-checked={sceneDensity==='compact'}
                onClick={()=>setSceneDensity('compact')}>
                <LayoutGrid size={16}/><span>Liste compacte</span><b>{sceneDensity==='compact'?'✓':''}</b>
              </button>
              <div className="nv-menu-divider" role="separator"/>
              <button type="button" role="menuitem" onClick={()=>{
                setLeftHidden(false);setRightHidden(false);setSceneDensity('comfortable');setOpenTopMenu(null);
              }}>
                <Home size={16}/><span>Réinitialiser l’affichage</span>
              </button>
            </div>}
          </div>
          <div className="nv-menu-root">
            <button type="button" className="nv-menu-trigger" title="Sauvegardes et versions Supabase"
              onClick={()=>{setOpenTopMenu(null);setNavigationDrawerOpen(false);setCloudOpen(true);}}>
              <span className="nv-drawer-item-label"><Cloud size={17}/> Cloud</span>
            </button>
          </div>
          </div>
        </nav>
      </div>
      <label className="nv-v3-name" title="Nom du projet">
        <Edit3 size={14} aria-hidden="true"/>
        <input aria-label="Nom du projet" value={project.name}
          onChange={event=>setProject(current=>({...current,name:event.target.value}))}/>
      </label>
      </div>
      <div className="nv-v3-center" ref={toolsMenuRef}>
        {modeSwitch(false)}
        {toolsCurtain(false)}
      </div>
      <div className="nv-v3-right">
        {updateAvailable&&<button type="button" className="nv-header-update is-available"
          onClick={reloadToLatestVersion} disabled={savingManually}
          title="Une nouvelle version de NovaStudio est disponible : cliquer pour la charger (pensez à enregistrer avant)"
          aria-label="Nouvelle version de NovaStudio disponible : actualiser">
          <RefreshCw size={16} aria-hidden="true"/><span>Nouvelle version</span><i className="nv-header-update-dot" aria-hidden="true"/>
        </button>}
        <button type="button" className="nv-v3-icon-btn nv-v3-undo" onClick={undo} disabled={!histRef.current.past.length} aria-label="Annuler la dernière action" title="Annuler (Ctrl+Z)"><Undo2 size={20}/></button>
        <button type="button" className="nv-v3-icon-btn nv-v3-redo" onClick={redo} disabled={!histRef.current.future.length} aria-label="Rétablir l’action annulée" title="Rétablir (Ctrl+Maj+Z ou Ctrl+Y)"><Redo2 size={20}/></button>
        <div className="nv-share-wrap" ref={shareMenuRef}>
          <button type="button" className={'nv-v3-icon-btn nv-v3-share'+(shareMenuOpen?' is-open':'')} onClick={()=>setShareMenuOpen(open=>!open)}
            aria-haspopup="menu" aria-expanded={shareMenuOpen} aria-label="Partager" title="Partager : projet, espaces, autres projets">
            <Share2 size={21}/>
          </button>
          {shareMenuOpen&&<div className="nv-share-menu" role="menu" aria-label="Partager">
            <div className="nv-share-group">Le projet</div>
            <button type="button" role="menuitem" onClick={()=>{leaveShare();setShareOpen(true);}}>🔗 Lien public et publication</button>
            <button type="button" role="menuitem" onClick={()=>{leaveShare();setPrivateOpen(true);}}>🔒 Inviter un membre (lien privé)</button>
            <div className="nv-share-group">Les espaces</div>
            <button type="button" role="menuitem" onClick={()=>startSpaceAction()}>☑ Choisir plusieurs espaces</button>
            <button type="button" role="menuitem" onClick={()=>startSpaceAction('share')}>👥 Partager des espaces avec un membre</button>
            <button type="button" role="menuitem" onClick={()=>startSpaceAction('transfer')}>⭱ Envoyer des espaces vers un autre projet</button>
            <button type="button" role="menuitem" onClick={()=>{setShareMenuOpen(false);spaceImportInput.current?.click();}}>⭳ Importer des espaces d’un autre projet</button>
          </div>}
        </div>
        <button type="button" className="nv-v3-icon-btn nv-v3-camera" onClick={()=>void takeShot()}
          aria-label="Capture annotée" title="Capture d’écran : entourer, écrire, envoyer à un collègue">
          <Camera size={22}/>
        </button>
        <button type="button" className="nv-v3-icon-btn nv-v3-fullscreen" onClick={()=>void toggleCreationFullscreen()} disabled={!active}
          aria-label="Plein écran de la création" title="Plein écran : agrandir uniquement la création 360°">
          <Maximize2 size={21}/>
        </button>
        <div className="nv-share-wrap nv-bell-wrap" ref={bellRef}>
          <button type="button" className={'nv-v3-icon-btn nv-v3-bell'+(bellOpen?' is-open':'')+(notifCount?' has-new':'')} onClick={()=>setBellOpen(o=>!o)}
            aria-haspopup="menu" aria-expanded={bellOpen} aria-label={notifCount?'Notifications ('+notifCount+' nouvelles)':'Notifications'} title="Notifications : notes, captures, invitations, mises à jour">
            <Bell size={21}/>{notifCount>0&&<i className="nv-bell-badge" aria-hidden="true">{notifCount>9?'9+':notifCount}</i>}
          </button>
          {bellOpen&&<div className="nv-share-menu nv-bell-menu" role="menu" aria-label="Notifications">
            <button type="button" role="menuitem" onClick={()=>{setBellOpen(false);setCheckOpen(true);}}>{issueErrors?'⛔':projectIssues.length?'⚠️':'✅'} <span><b>Contrôle du projet</b><small>{projectIssues.length?issueErrors+' erreur'+(issueErrors>1?'s':'')+' · '+(projectIssues.length-issueErrors)+' avertissement'+(projectIssues.length-issueErrors>1?'s':'')+' · cliquer pour corriger':'Rien d’anormal détecté'}</small></span></button>
            {!notifCount&&!notifHistory.length&&<p className="nv-bell-empty">Rien de nouveau. Les notes, captures et invitations de tes collègues apparaîtront ici.</p>}
            {liveInvite.invite&&<button type="button" role="menuitem" onClick={()=>{setBellOpen(false);liveInvite.dismiss();void startLiveWith([],false);}}>🖥 <span><b>{liveInvite.invite.fromLabel}</b> t’invite à partager son écran<small>Cliquer pour rejoindre</small></span></button>}
            {liveInvite.notesIn.map(n=><button type="button" role="menuitem" key={n.id} onClick={()=>{setBellOpen(false);liveInvite.dismissNote(n.id);setToolsMenuOpen(false);setRightHidden(true);setNotesOpen(true);}}>📝 <span><b>{n.fromLabel}</b> : {n.body.slice(0,70)}{n.body.length>70?'…':''}<small>Note · cliquer pour ouvrir les notes</small></span></button>)}
            {liveInvite.shots.map(sh=><button type="button" role="menuitem" key={sh.id} onClick={()=>{setBellOpen(false);liveInvite.dismissShot(sh.id);setShotImage({image:sh.image,defaultTo:sh.fromEmail});}}>📷 <span><b>{sh.fromLabel}</b> t’envoie une capture{sh.comment?' : '+sh.comment.slice(0,60):''}<small>Cliquer pour la voir et répondre</small></span></button>)}
            {updateAvailable&&<button type="button" role="menuitem" onClick={reloadToLatestVersion}>🔄 <span><b>Nouvelle version de NovaStudio</b><small>Enregistre ton travail, puis clique pour actualiser</small></span></button>}
            {notifHistory.length>0&&<div className="nv-share-group">Récemment</div>}
            {notifHistory.slice(0,10).map(h=><div key={h.id} className="nv-bell-hist"><span>{h.icon}</span><span>{h.text}<small>{new Date(h.at).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</small></span></div>)}
            {notifHistory.length>0&&<button type="button" role="menuitem" className="nv-bell-clear" onClick={()=>{setNotifHistory([]);try{localStorage.removeItem('nvstudio-notif-history');}catch{/* rien */}}}>Effacer l’historique</button>}
            {(liveInvite.notesIn.length+liveInvite.shots.length>1)&&<button type="button" role="menuitem" className="nv-bell-clear" onClick={()=>{liveInvite.notesIn.forEach(n=>liveInvite.dismissNote(n.id));liveInvite.shots.forEach(sh=>liveInvite.dismissShot(sh.id));}}>Tout marquer comme lu</button>}
          </div>}
        </div>
      </div>
    </header>
    <section id="nv-workspace-spaces" className={"nv-space-strip nv-space-drawer"+(spacesDrawerOpen?" is-open":"")} aria-label="Espaces de travail du projet" aria-hidden={!spacesDrawerOpen}>

      <div className="nv-space-tab-scroll" role="tablist" aria-label="Espaces du projet" data-hsort="spaces">
        <div className={'nv-space-tab nv-space-tab-editable'+(!currentSpace?' is-active':'')}>
          {editingSpaceId==='__project__'?
            <input autoFocus className="nv-space-tab-rename" value={editingSpaceName} maxLength={150} aria-label="Nouveau nom du projet"
              onChange={e=>setEditingSpaceName(e.target.value)}
              onBlur={()=>finishSpaceRename('__project__')}
              onKeyDown={e=>{
                if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}
                if(e.key==='Escape'){e.preventDefault();cancelSpaceEditRef.current=true;e.currentTarget.blur();}
              }}/>:
            <>
              <button type="button" role="tab" aria-selected={!currentSpace} className="nv-space-tab-select"
                onClick={()=>selectSpace(null)} onDoubleClick={()=>startSpaceRename('__project__',project.name)}
                title={project.name+' · tous les panoramas originaux · double-clic pour renommer'}>
                <Home size={13}/><span>{project.name||'Projet complet'}</span><small>{project.scenes.length}</small>
              </button>
              <button type="button" className="nv-space-tab-rename-button" aria-label="Renommer le projet" title="Renommer le projet"
                onClick={()=>startSpaceRename('__project__',project.name)}><Edit3 size={13}/></button>
            </>}
        </div>
        {(project.spaces??[]).map(space=><div key={space.id} data-hsort-id={space.id}
          className={'nv-space-tab nv-space-tab-editable'+(activeSpaceId===space.id?' is-active':'')+(spaceSort.drag===space.id?' is-dragging':'')+(spaceSelection.has(space.id)?' is-picked':'')}>
          {spaceSelectMode&&<button type="button" className={'nv-space-pick'+(spaceSelection.has(space.id)?' is-on':'')} aria-pressed={spaceSelection.has(space.id)} aria-label={'Sélectionner '+space.name} onClick={()=>toggleSpacePick(space.id)}>{spaceSelection.has(space.id)?'✓':''}</button>}
          {editingSpaceId!==space.id&&spaceSort.grip(space.id,space.name)}
          {editingSpaceId===space.id?
            <input autoFocus className="nv-space-tab-rename" value={editingSpaceName}
              maxLength={100} aria-label={'Nouveau nom de '+space.name}
              onChange={e=>setEditingSpaceName(e.target.value)}
              onBlur={()=>finishSpaceRename(space.id)}
              onKeyDown={e=>{
                if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}
                if(e.key==='Escape'){e.preventDefault();cancelSpaceEditRef.current=true;e.currentTarget.blur();}
              }}/>:
            <>
              <button type="button" role="tab" aria-selected={activeSpaceId===space.id}
                className="nv-space-tab-select" title={space.name+' · double-clic pour renommer'}
                onClick={()=>selectSpace(space.id)}
                onDoubleClick={()=>startSpaceRename(space.id,space.name)}>
                <LayoutGrid size={13}/><span>{space.name}</span><small>{space.sceneIds.length}</small>
              </button>
              <button type="button" className="nv-space-tab-rename-button"
                aria-label={'Renommer '+space.name} title={'Renommer '+space.name}
                onClick={()=>startSpaceRename(space.id,space.name)}>
                <Edit3 size={13}/>
              </button>
              <button type="button" className="nv-space-tab-rename-button nv-space-tab-trash"
                aria-label={'Supprimer '+space.name} title={'Supprimer '+space.name+' (avec transfert possible)'}
                onClick={()=>{setSpaceDelete({id:space.id,target:''});}}>
                <Trash2 size={13}/>
              </button>
            </>}
        </div>)}
      </div>
      <button type="button" className="nv-space-create" onClick={createSpace}
        title="Créer une sous-visite à partir des panoramas existants">
        <Plus size={15}/> Ajouter un espace
      </button>

      {currentSpace&&<button type="button" className="nv-space-manage" onClick={()=>setSpaceManagerOpen(true)}>
        Gérer les panoramas
      </button>}
    </section>
    {spacesDrawerOpen&&spaceSelectMode&&<div className="nv-space-selbar" role="toolbar" aria-label="Actions sur les espaces choisis">
      <b>{spaceSelection.size} espace{spaceSelection.size>1?'s':''} choisi{spaceSelection.size>1?'s':''}</b>
      <button type="button" onClick={()=>setSpaceSelection(new Set((project.spaces??[]).map(space=>space.id)))}>Tout choisir</button>
      <button type="button" disabled={!spaceSelection.size} onClick={()=>setSpaceAction('share')}>👥 Partager avec un membre…</button>
      <button type="button" disabled={!spaceSelection.size} onClick={()=>setSpaceAction('transfer')}>⭱ Envoyer vers un autre projet…</button>
      <button type="button" onClick={()=>{setSpaceSelectMode(false);setSpaceSelection(new Set());}}>Terminer</button>
    </div>}
    <input ref={spaceImportInput} hidden type="file" accept=".json,.nvspaces.json,application/json" onChange={e=>void importSpacesFile(e.currentTarget.files?.[0])}/>
    {spaceManagerOpen&&currentSpace&&<div className="overlay nv-space-overlay" onMouseDown={event=>{
      if(event.target===event.currentTarget)setSpaceManagerOpen(false);
    }}>
      <section className="nv-space-modal" role="dialog" aria-modal="true" aria-label="Gestion de l’espace">
        <div className="nv-space-modal-head">
          <div><small>PROJET : {project.name}</small><h2>Organiser cet espace</h2></div>
          <button type="button" className="nv-space-close" onClick={()=>setSpaceManagerOpen(false)} aria-label="Fermer"><XMark/></button>
        </div>
        <SpaceCover name={currentSpace.name} value={currentSpace.coverDataUrl} onChange={coverDataUrl=>setProject(p=>({...p,spaces:p.spaces?.map(space=>space.id===currentSpace.id?{...space,coverDataUrl}:space)}))}/>
        <label className="nv-space-name-label">Nom de l’espace
          <input aria-label="Renommer cet espace" value={currentSpace.name}
            onChange={e=>renameSpace(currentSpace.id,e.target.value)} maxLength={100}/>
        </label>
        <p>Décoche les panoramas à exclure. Ils restent dans le projet complet et les autres espaces.</p>
        <div className="nv-space-select-actions">
          <span>{currentSpace.sceneIds.length} / {project.scenes.length} panoramas inclus</span>
          <button type="button" onClick={()=>setProject(p=>({...p,spaces:(p.spaces??[]).map(sp=>sp.id===currentSpace.id?{
            ...sp,sceneIds:p.scenes.map(sc=>sc.id)
          }:sp)}))}>Tout inclure</button>
          <button type="button" onClick={()=>{
            setProject(p=>({...p,spaces:(p.spaces??[]).map(sp=>sp.id===currentSpace.id?{...sp,sceneIds:[]}:sp)}));
            setActiveId('');setSelectedId('');
          }}>Tout retirer</button>
        </div>
        <div className="nv-space-scene-picker">
          {project.scenes.map(scene=><label key={scene.id} className="nv-space-scene-option">
            <input type="checkbox" checked={currentSpace.sceneIds.includes(scene.id)}
              onChange={e=>setSceneInSpace(currentSpace.id,scene.id,e.target.checked)}/>
            {sceneThumbs[scene.id]?<img src={sceneThumbs[scene.id]} alt="" draggable={false}/>:<span className="nv-space-no-thumb">◎</span>}{todoPin(scene.id)}
            <span>{scene.name}</span>
          </label>)}
        </div>
        {(project.spaces??[]).length>1&&<div className="nv-space-select-actions nv-space-transfer">
          <span>Transférer les {currentSpace.sceneIds.length} panoramas de cet espace vers :</span>
          <select aria-label="Espace de destination" value={spaceTransferTo} onChange={e=>setSpaceTransferTo(e.target.value)}>
            <option value="">Choisir un espace…</option>
            {(project.spaces??[]).filter(sp=>sp.id!==currentSpace.id).map(sp=><option key={sp.id} value={sp.id}>{sp.name}</option>)}
          </select>
          <button type="button" disabled={!spaceTransferTo} onClick={()=>transferSpaceScenes(currentSpace.id,spaceTransferTo,false)}>Ajouter (copier)</button>
          <button type="button" disabled={!spaceTransferTo} onClick={()=>transferSpaceScenes(currentSpace.id,spaceTransferTo,true)}>Déplacer</button>
        </div>}
        <div className="nv-space-modal-footer">
          <button type="button" className="nv-space-delete" onClick={()=>setSpaceDelete({id:currentSpace.id,target:''})}>Supprimer cet espace…</button>
          <button type="button" className="primary" onClick={()=>setSpaceManagerOpen(false)}>Terminer</button>
        </div>
      </section>
    </div>}
    {spaceAction&&selectedSpaces.length>0&&<SpacesActions mode={spaceAction} project={project} spaces={selectedSpaces} onClose={()=>setSpaceAction(null)} onStatus={setStatus}
      onMoved={ids=>{setProject(p=>({...p,spaces:(p.spaces??[]).filter(space=>!ids.includes(space.id))}));setSpaceSelection(new Set());if(activeSpaceId&&ids.includes(activeSpaceId)){setActiveSpaceId(null);}}}/>}
    {!creationFullscreen&&mediaPickerEl()}
    {shotImage&&<ShotEditor image={shotImage.image} defaultTo={shotImage.defaultTo} canSend={!!inviteIdentity} onSend={sendShot} onClose={()=>setShotImage(null)}/>}
    {updateAvailable&&Date.now()>=updateSnoozeUntil&&<div className="nv-update-banner" role="alert">
      <span className="nv-update-text"><b>Nouvelle version de NovaStudio disponible</b><small>{ready&&projectRef.current!==savedRef.current?'Enregistre ton travail avec la disquette, puis actualise.':'Actualise pour profiter des dernières nouveautés.'}</small></span>
      <button type="button" className="is-go" onClick={reloadToLatestVersion} disabled={savingManually}><RefreshCw size={16}/> Actualiser maintenant</button>
      <button type="button" onClick={()=>setUpdateSnoozeUntil(Date.now()+10*60_000)}>Plus tard</button>
    </div>}
    {liveDialogOpen&&<LiveShareDialog onStart={emails=>void startLiveWith(emails)} onClose={()=>{setLiveDialogOpen(false);backFrom();}}/>}
    {!liveProjectId&&liveInvite.invite&&<div className="nv-live-invite" role="alert"><span><b>{liveInvite.invite.fromLabel}</b> t’invite à partager son écran.</span><button type="button" className="is-join" onClick={()=>{liveInvite.dismiss();void startLiveWith([],false);}}>Rejoindre</button><button type="button" onClick={liveInvite.dismiss}>Plus tard</button></div>}
    {issueFocus&&!classicDestinationOpen&&!mediaPicker&&<IssueCallout docked={!rightHidden} noted={!!(issueFocus.id&&notedIds.has(issueFocus.id))} noteText={noteText} onNoteText={setNoteText} onNote={noteIssueForLater} media={(()=>{const sc=project.scenes.find(x=>x.id===issueFocus.sceneId);return sc?<FullscreenGalleryHoverPreview scene={sc} thumb={sceneThumbs[sc.id]}/>:undefined;})()} focus={issueFocus} stillPresent={projectIssues.some(i=>i.id===issueFocus.id)} saving={savingManually} error={fixError} onValidate={validateFix} onClose={()=>{setIssueFocus(null);setGuided(null);if(returnToCheck.current){returnToCheck.current=false;setCheckOpen(true);}}} step={guided?{i:guided.i+1,n:guided.queue.length}:undefined} onNext={guided?nextGuided:undefined} onOpen={()=>{setPanel('points');setRightHidden(false);}}/>}
    {checkOpen&&<ProjectCheckPanel noted={notedIds} issues={projectIssues} onGo={i=>{setGuided(null);returnToCheck.current=true;goToIssue(i);}} onGuided={startGuided} onClose={()=>setCheckOpen(false)}/>}
    {commentsOpen&&<CommentsPanel comments={project.comments??[]} scenes={project.scenes} currentSceneId={cameraRef.current.sceneId||activeId} onAdd={addComment} onGo={goToComment} onToggle={toggleComment} onDelete={deleteComment} onClose={()=>{setCommentsOpen(false);backFrom();}}/>}
    {welcome&&<aside className="nv-welcome" role="status" aria-label="Depuis ta dernière visite">
      <h3>👋 {welcome.since?'Depuis ta dernière visite ('+new Date(welcome.since).toLocaleDateString('fr-FR',{day:'2-digit',month:'long'})+')':'À savoir sur ce projet'}</h3>
      <ul>
        {welcome.notifs>0&&<li>{welcome.notifs} événement{welcome.notifs>1?'s':''} (enregistrements, notes, captures)</li>}
        {welcome.comments>0&&<li>{welcome.comments} commentaire{welcome.comments>1?'s':''} d’équipe en attente</li>}
        {welcome.errors>0&&<li>{welcome.errors} problème{welcome.errors>1?'s':''} à corriger avant de publier</li>}
      </ul>
      <div className="nv-welcome-actions">
        {welcome.notifs>0&&<button type="button" onClick={()=>{setWelcome(null);setBellOpen(true);}}>Voir l’historique</button>}
        {welcome.comments>0&&<button type="button" onClick={()=>{setWelcome(null);setCommentsOpen(true);}}>Voir les commentaires</button>}
        {welcome.errors>0&&<button type="button" onClick={()=>{setWelcome(null);setPublishConfirm(true);}}>Contrôler le projet</button>}
        <button type="button" onClick={()=>setWelcome(null)}>OK</button>
      </div>
    </aside>}
    {notesOpen&&<NotesPanel projectName={project.name} onClose={()=>{setNotesOpen(false);backFrom();}} onOpenCloud={()=>{returnTo.current=null;setToolsMenuOpen(false);setCloudOpen(true);}}/>}
    {liveProjectId&&<LiveOverlay live={live} onClose={()=>setLiveProjectId(null)}/>}
    {spaceDelete&&(()=>{
      const sp=(project.spaces??[]).find(item=>item.id===spaceDelete.id);
      if(!sp)return null;
      const others=(project.spaces??[]).filter(item=>item.id!==sp.id);
      return <div className="overlay nv-space-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)setSpaceDelete(null);}}>
        <section className="nv-space-modal" role="alertdialog" aria-modal="true" aria-label="Supprimer l’espace">
          <div className="nv-space-modal-head"><div><small>PROJET : {project.name}</small><h2>Supprimer « {sp.name} »</h2></div>
            <button type="button" className="nv-space-close" onClick={()=>setSpaceDelete(null)} aria-label="Fermer"><XMark/></button></div>
          <p>Seul l’espace est supprimé : les {sp.sceneIds.length} panoramas restent dans le projet complet. Vous pouvez aussi les ajouter à un autre espace.</p>
          <label className="nv-space-name-label">Transférer ses panoramas vers
            <select value={spaceDelete.target} onChange={e=>setSpaceDelete({id:sp.id,target:e.target.value})}>
              <option value="">Aucun transfert (supprimer l’espace seulement)</option>
              {others.map(o=><option key={o.id} value={o.id}>{o.name} ({o.sceneIds.length} panoramas)</option>)}
            </select>
          </label>
          <div className="nv-space-modal-footer">
            <button type="button" onClick={()=>setSpaceDelete(null)}>Annuler</button>
            <button type="button" className="nv-space-delete" onClick={()=>deleteSpace(sp.id,spaceDelete.target||undefined)}>{spaceDelete.target?'Transférer puis supprimer':'Supprimer l’espace'}</button>
          </div>
        </section>
      </div>;
    })()}
    {emailLink&&<div className="overlay"><div className="modal cloud-panel">
      <h2>{emailLink.done?'Adresse confirmée ✓':'Confirmer mon accès'}</h2>
      {emailLink.done?<>
        <p>Tu es connecté. Tu peux maintenant ouvrir la visite partagée : clique sur <b>Cloud</b> en haut, puis <b>Ouvrir</b> à côté de la visite.</p>
        <button className="primary" onClick={()=>{setEmailLink(null);setCloudOpen(true);}}>Ouvrir le panneau Cloud</button>
      </>:<>
        <p>Clique sur le bouton pour confirmer ton adresse e-mail et accéder à NovaVisio Studio.</p>
        <button className="primary" disabled={emailLink.busy} onClick={async()=>{
          setEmailLink(l=>l&&{...l,busy:true,error:''});
          try{
            await confirmEmailLink(emailLink.tokenHash,emailLink.type);
            window.history.replaceState(null,'',window.location.pathname);
            setEmailLink(l=>l&&{...l,busy:false,done:true});
          }catch(e){setEmailLink(l=>l&&{...l,busy:false,error:e instanceof Error?e.message:String(e)});}
        }}>{emailLink.busy?'Confirmation…':'Confirmer mon adresse'}</button>
        {emailLink.error&&<><p className="warning">{emailLink.error}</p>
          <p className="hint-inline">Demande à la personne qui t’a invité de recréer ton accès, ou utilise « Cloud » → « Lien magique » pour recevoir un nouveau lien.</p>
          <button className="quiet" onClick={()=>{window.history.replaceState(null,'',window.location.pathname);setEmailLink(null);setCloudOpen(true);}}>Aller à la connexion</button></>}
      </>}
    </div></div>}
    {authNotice&&<div className="nv-banner" role="alert">
      <p><b>{authNotice}</b> Un lien de connexion ne fonctionne qu’<b>une seule fois</b> et pendant environ 1 heure. Certaines messageries (Outlook, antivirus, filtres) l’ouvrent à l’avance et le rendent inutilisable. Demande-en un nouveau et clique dessus tout de suite, dans ce navigateur.</p>
      <div className="nv-banner-actions">
        <button className="primary" onClick={()=>{setAuthNotice(null);setCloudOpen(true);}}>Recevoir un nouveau lien / me connecter avec mon mot de passe</button>
        <button className="quiet" onClick={()=>setAuthNotice(null)}>Fermer</button>
      </div>
    </div>}
    {cloud.state.kind==='setup'&&<div className="nv-banner" role="alert">
      <p><b>La sauvegarde instantanée n’est pas encore installée dans Supabase.</b> Ton travail reste enregistré sur cet appareil. Pour l’activer : ouvre le SQL Editor de Supabase et exécute le fichier <code>20261110020000_nvstudio_autosave.sql</code> (et <code>20261110000000_nvstudio_init.sql</code> si ce n’est pas déjà fait).</p>
      <div className="nv-banner-actions">
        <a className="quiet share-open" href="https://github.com/gestion-boop/Novavisio-studio/blob/main/supabase/migrations/20261110020000_nvstudio_autosave.sql" target="_blank" rel="noopener">Voir le fichier SQL</a>
        <button className="primary" onClick={cloud.retryNow}>J’ai exécuté le SQL : réessayer</button>
        <button className="quiet" onClick={()=>cloud.setEnabled(false)}>Mettre en pause</button>
      </div>
    </div>}
    {lock&&<div className="nv-banner" role="alert">
      {lock.kind==='conflict'&&<>
        <p><b>Ce projet a été modifié dans une autre fenêtre.</b> Rien n’a été écrasé : l’enregistrement est suspendu dans celle-ci pour protéger ton travail.</p>
        <div className="nv-banner-actions">
          <button className="primary" onClick={()=>void reloadFromStore()}>Recharger la version enregistrée</button>
          <button className="quiet" onClick={download}>Télécharger ma version d’abord</button>
          <button className="quiet" onClick={()=>{if(window.confirm('Garder CETTE fenêtre remplace la version enregistrée par les autres fenêtres. Continuer ?'))void persist(project,true);}}>Garder cette fenêtre (remplace l’autre)</button>
        </div>
      </>}
      {lock.kind==='unreadable'&&<>
        <p><b>Le projet enregistré dans ce navigateur n’a pas pu être lu.</b> Il n’a pas été modifié ni écrasé, et l’enregistrement automatique est suspendu. Détail : {lock.reason}</p>
        <div className="nv-banner-actions">
          <button className="primary" onClick={downloadRawStored}>Télécharger les données brutes</button>
          <button className="quiet" onClick={()=>window.location.reload()}>Réessayer</button>
          <button className="quiet" onClick={startEmptyOverUnreadable}>Repartir d’un projet vide (remplace l’ancien)</button>
        </div>
      </>}
      {lock.kind==='saveError'&&<>
        <p><b>La sauvegarde manuelle a échoué :</b> {lock.reason}. Tes dernières modifications ne sont pas enregistrées.</p>
        <div className="nv-banner-actions">
          <button className="primary" onClick={download}>Télécharger ma sauvegarde (.nvstudio.json)</button>
          <button className="quiet" onClick={()=>setLock(null)}>Réessayer</button>
        </div>
      </>}
    </div>}
    <div className="workspace">
      {classicDestinationOpen&&!creationFullscreen&&!preview&&active&&selected?.type==='navigation'&&
        <section id="nv-classic-destination-picker" className="nv-classic-destination-overlay"
          aria-label="Choix visuel du panorama de destination">
          <div className="nv-classic-destination-heading">
            <div><small>{autoNavigation?'AUTO · ÉTAPE 2 / DESTINATION':'CHOISIR UNE DESTINATION'}</small><strong>Galerie 360°</strong></div>
            <button type="button" onClick={()=>autoNavigation?stopAutoNavigation():setClassicDestinationOpen(false)} aria-label={autoNavigation?"Quitter l'assistant Auto":"Fermer la galerie"} title={autoNavigation?"Quitter l'assistant Auto":"Fermer"}><XMark/></button>
          </div>
          {(issueFocus||(selected&&active&&!selected.target))&&<IssueBanner focus={issueFocus??{level:'warn' as const,text:'Cette flèche n’a pas encore de panorama de destination.',hint:'Choisis dans la liste le panorama vers lequel elle doit mener, règle le viseur, puis valide.',thumb:active?sceneThumbs[active.id]:undefined,sceneName:active?.name}}/>}
          <div className="nv-classic-destination-layout">
            <div className="nv-classic-destination-list-panel">
              <input type="search" value={classicDestinationSearch} placeholder="Rechercher un panorama…"
                aria-label="Rechercher un panorama" onChange={e=>setClassicDestinationSearch(e.target.value)}/>
              <div className="nv-classic-destination-list" ref={destinationListRef}>
                {(()=>{const sugg=issueFocus&&activeId?suggestDestinations(activeId):[];const curN=sceneNumber(project.scenes.find(x=>x.id===activeId)?.name??'');const rank=(id:string)=>{const k=sugg.findIndex(x=>x.id===id);if(k>=0)return k;const m=sceneNumber(project.scenes.find(x=>x.id===id)?.name??'');return 1000+(curN!==null&&m!==null?Math.abs(m-curN):5000);};return [...visibleScenes].filter(sc=>sc.id!==activeId&&sc.name.toLocaleLowerCase('fr').includes(classicDestinationSearch.toLocaleLowerCase('fr'))).sort((a,b)=>rank(a.id)-rank(b.id)).map(sc=>({sc,why:sugg.find(x=>x.id===sc.id)?.why}));})().map(({sc,why})=>
                  <button type="button" key={sc.id} data-destination-scene={sc.id} className={'nv-classic-destination-row'+(classicDestinationPreviewId===sc.id?' is-active':'')}
                    onClick={()=>setClassicDestinationPreviewId(sc.id)}
                    aria-pressed={classicDestinationPreviewId===sc.id}>
                    {sceneThumbs[sc.id]?<img src={sceneThumbs[sc.id]} alt="" draggable={false}/>:<span>◎</span>}{todoPin(sc.id)}
                    <span><strong>{sc.name}</strong><small>{sc.id===classicDestinationPreviewId?'✓ Sélectionné'+(why?' · '+why.replace('⭐ Suggéré · ','suggéré : '):' · vue affichée'):sc.id===selected.target?'✓ Destination actuelle':why??'Voir en 360°'}</small></span>
                    <ChevronRight size={15}/>
                  </button>)}
              </div>
            </div>
            <div className="nv-classic-destination-view-panel">
              {visibleScenes.filter(sc=>sc.id===classicDestinationPreviewId&&sc.id!==activeId).map(sc=>
                <div key={sc.id} className="nv-classic-destination-detail">
                  <div className="nv-classic-destination-title"><strong>{sc.name}</strong><span>Glisse pour explorer à 360°</span></div>
                  <div className="nv-classic-destination-viewer nv-targeted-preview">
                     <FullscreenGalleryHoverPreview scene={sc} thumb={sceneThumbs[sc.id]} onOrientation={view=>{galleryOrientationRef.current[sc.id]=view;}}/>
                     <div className="nv-target-center" aria-hidden="true"><span/><span/><i/></div>
                   </div>
                  <button type="button" className="nv-classic-destination-confirm" onClick={()=>{
                      if(!active||!selected||selected.type!=='navigation')return;
                      if(!autoNavigation)setNavigationDestination(sc.id);
                      else confirmNavigationDirection({
                        sourceId:active.id,targetId:sc.id,sourceYaw:selected.yaw,sourcePitch:selected.pitch,
                        existingPointId:selected.id
                      });
                    }}>
                    <Images size={16}/> ✓ Valider la direction
                  </button>
                </div>)}
              {!visibleScenes.some(sc=>sc.id===classicDestinationPreviewId&&sc.id!==activeId)&&
                <div className="nv-classic-destination-empty">Sélectionne un panorama dans la liste à gauche.</div>}
            </div>
          </div>
          <div className="nv-classic-destination-foot">
            <span>Choisis le prochain panorama, règle la direction avec le viseur, puis valide pour continuer de panorama en panorama.</span>
            <button type="button" onClick={()=>autoNavigation?stopAutoNavigation():setClassicDestinationOpen(false)}>{autoNavigation?'✕ Quitter Auto':'← Retour aux réglages'}</button>
          </div>
        </section>}
      <main className="editor">
        <div className={'view-area'+(creationFullscreenFallback?' nv-creation-fullscreen-fallback':'')+popupThemeClass} ref={viewAreaRef} style={barCss}>
          {active?<Panorama scene={active} icons={project.icons} mode={mode} preview={preview} autoNavigation={autoNavigation} night={nightActive} nightTexture={nightTexture} onCreate={autoNavigation&&mode==='navigation'?(y,p)=>{if(guide?.phase==='back')setStatus('Étape retour : tourne la vue puis clique sur « Valider le retour ».');else guidedForward(y,p);}:newPoint} turn={turnRequest} onPick={selectPointForEditing} arrival={active&&nextArrivalRef.current?.sceneId===active.id?nextArrivalRef.current:null} onNavigate={(id,via)=>{if(!visibleIds.has(id))return;if(via&&active)goThroughArrow(via,active.id);else selectScene(id);}} onInfo={h=>{setFrame(null);setInfoLanguage(activeLanguages[0]??'fr');setInfo(h);}} onLink={openLinkInTour} onImage={(h,from)=>{setZoomFrom(from??null);setImageZoom(h);setInfo(null);setFrame(null);}} onVideo={(h,from)=>{setZoomFrom(from??null);setVideoZoom(h);setInfo(null);setFrame(null);}} selectedId={selectedId}
            onWorldFrameChange={(id,corners,center)=>patchScene(sc=>({...sc,hotspots:sc.hotspots.map(h=>h.id===id?
              {...h,frameSphericalCorners:corners,yaw:center?.yaw??h.yaw,pitch:center?.pitch??h.pitch}:h)}))}
            onMarkerMove={moveHotspot} onRemoveNavigation={removeAutoNavigationArrow} onAssetDrop={dropIcon}
            onCameraChange={(yaw,pitch,zoom)=>{cameraRef.current={sceneId:activeId,yaw,pitch,zoom};}}/>:<div className="empty">
            <div className="empty-icon">◎</div><h1>{currentSpace?'Cet espace est vide':'Ta première visite commence ici'}</h1>
            <p>{currentSpace?'Sélectionne les panoramas de la visite principale à inclure dans cet espace.':'Importe des photos équirectangulaires 360° pour commencer à créer ta visite interactive.'}</p>
            <button className="primary" onClick={()=>currentSpace?setSpaceManagerOpen(true):upload.current?.click()}>
              {currentSpace?'Choisir les panoramas':'＋ Importer mes photos 360°'}
            </button>{!currentSpace&&<small>JPG, PNG ou WebP · rapport 2:1 recommandé</small>}
          </div>}
          {navigationDraft&&visibleScenes.some(sc=>sc.id===navigationDraft.targetId)&&
            <section className="nv-direction-preview" role="dialog" aria-modal="true" aria-label="Valider la direction de la destination">
              {visibleScenes.filter(sc=>sc.id===navigationDraft.targetId).map(sc=>
                <div className="nv-direction-preview-inner" key={sc.id}>
                  <div className="nv-direction-preview-head">
                    <div><small>DESTINATION 360°</small><strong>{sc.name}</strong></div>
                    <button type="button" onClick={()=>autoNavigation?stopAutoNavigation():(setNavigationDraft(null),setDestinationEditId(null))} aria-label={autoNavigation?"Quitter Auto":"Annuler la destination"} title={autoNavigation?"Quitter le mode Auto":"Annuler"}><XMark/></button>
                  </div>
                  <div className="nv-direction-preview-viewer nv-targeted-preview">
                    <FullscreenGalleryHoverPreview scene={sc} thumb={sceneThumbs[sc.id]}
                      onOrientation={view=>{galleryOrientationRef.current[sc.id]=view;}}/>
                    <div className="nv-target-center" aria-hidden="true"><span/><span/><i/></div>
                  </div>
                  <p>Oriente l'arrivée avec le viseur, puis valide. {autoNavigation?'Tu passeras directement au panorama suivant pour créer la prochaine flèche.':'La flèche garde sa position dans le panorama de départ.'}</p>
                  <div className="nv-direction-preview-actions">
                    <button type="button" className="nv-direction-confirm" onClick={()=>confirmNavigationDirection()}>✓ Valider la direction</button>
                    <button type="button" onClick={()=>autoNavigation?stopAutoNavigation():(setNavigationDraft(null),setDestinationEditId(null))}>{autoNavigation?'Quitter Auto':'Annuler'}</button>
                  </div>
                </div>)}
            </section>}
          {autoNavigation&&!preview&&guide?.phase==='back'&&<div className="nv-guide-banner" role="status">
            <span>↩ <b>Retour</b> · fais un demi-tour (180°), ajuste la vue si besoin, puis valide.</span>
            <button type="button" className="nv-guide-ok" onClick={guidedBack}>✓ Valider le retour</button>
            <button type="button" onClick={guidedSkipBack}>Passer</button>
          </div>}
          {autoNavigation&&!preview&&guide?.phase==='forward'&&<div className="nv-guide-banner is-forward" role="status">
            <span>➜ <b>Aller</b> · vise avec la cible puis clique sur + : la flèche part vers le panorama suivant.</span>
          </div>}
          {((autoNavigation&&!preview)||(creationFullscreen&&showArrivalCrosshair&&!preview))&&
            <div className={'nv-arrival-crosshair'+(autoNavigation?' nv-auto-crosshair':'')} aria-label="Cible centrale du panorama de départ">
              <span className="nv-cross-h"/><span className="nv-cross-v"/><span className="nv-cross-dot"/>
              {autoNavigation&&guide?.phase!=='back'&&!fullscreenGalleryOpen&&!classicDestinationOpen&&!navigationDraft&&mode==='navigation'&&
                <button type="button" className="nv-auto-crosshair-place" aria-label="Placer la flèche sur la cible au centre"
                  title="Placer la flèche ici"
                  onClick={e=>{e.stopPropagation();const v=cameraRef.current;if(active&&v.sceneId===active.id)guidedForward(v.yaw,v.pitch);}}>
                  <span aria-hidden="true">+</span>
                </button>}
            </div>}
          {creationFullscreen&&mediaPickerEl()}
          {creationFullscreen&&<div className="nv-fs-topbar" ref={fsToolsRef}>
            {modeSwitch(true)}
            <button type="button" className="nv-fs-exit" onClick={()=>void toggleCreationFullscreen()} aria-label="Quitter le plein écran" title="Revenir à l’écran classique"><Minimize2 size={20}/></button>
            {toolsCurtain(true)}
          </div>}
          {creationFullscreen&&<small className="nv-build-stamp" title="Date et heure de compilation de cette version">Build {new Date(__NV_BUILD_TIME__).toLocaleString('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</small>}
          {nightTexture&&<div className="nv-daynight-switch" role="group" aria-label="Mode jour et nuit">
            <button type="button" className={!nightActive?'is-active':''} aria-pressed={!nightActive} onClick={()=>setNightSceneId(null)}>☀ <span>Jour</span></button>
            <button type="button" className={nightActive?'is-active':''} aria-pressed={nightActive} onClick={()=>setNightSceneId(activeId)}>☾ <span>Nuit</span></button>
          </div>}
          {active && creationFullscreen && !fullscreenToolsOpen && <button type="button" className={'nv-command-drawer-handle'+(fullscreenCommandDrawerOpen?' is-open':'')}
            onClick={()=>{setFullscreenCommandDrawerOpen(open=>!open);setFullscreenToolsOpen(false);setFullscreenGalleryOpen(false);setHoveredGallerySceneId(null);}}
            aria-expanded={fullscreenCommandDrawerOpen} aria-controls="nv-fullscreen-command-drawer"
            aria-label={fullscreenCommandDrawerOpen?'Masquer les commandes':'Afficher les commandes'}>
            <PanelRightClose size={19}/> <span>{fullscreenCommandDrawerOpen?'Masquer':'Commandes'}</span>
          </button>}
          {active && creationFullscreen && fullscreenCommandDrawerOpen && !fullscreenToolsOpen && <div id="nv-fullscreen-command-drawer" className="nv-command-drawer" aria-label="Commandes de création">
            <div className="nv-command-drawer-heading"><strong>{fullscreenGalleryOpen?'Galerie':'Commandes'}</strong><button type="button" onClick={()=>setFullscreenCommandDrawerOpen(false)} aria-label="Fermer le tiroir"><XMark/></button></div>
            {fullscreenGalleryOpen?null:<><div className="nv-creation-fullscreen-controls" role="toolbar" aria-label="Commandes du plein écran de création">
            <span className="nv-fullscreen-scene-name" title={active.name}>{active.name}</span>
            <button type="button" className={'nv-fullscreen-gallery-toggle'+(fullscreenGalleryOpen?' is-active':'')}
              aria-expanded={fullscreenGalleryOpen} aria-controls="nv-fullscreen-gallery"
              onClick={()=>{setDestinationEditId(null);setFullscreenSelectedDestinationId(null);setFullscreenGalleryOpen(true);setHoveredGallerySceneId(null);setMode(null);setFullscreenToolsOpen(false);}}
              title="Choisir un panorama dans la galerie">
              <Images size={16}/> Galerie <span className="nv-fullscreen-gallery-count">{visibleScenes.length}</span>
            </button>
            {!preview&&<button type="button"
              className={'nv-fullscreen-auto'+(autoNavigation?' is-active':'')}
              aria-pressed={autoNavigation}
              title={autoNavigation?'Terminer le parcours Auto':'Lancer la création automatique panorama par panorama'}
              onClick={()=>{
                toggleAutoNavigation();
                setFullscreenCommandDrawerOpen(false);
                setFullscreenGalleryOpen(false);
                setFullscreenToolsOpen(false);
              }}>
              ↪ {autoNavigation?'Terminer Auto':'Auto'}
            </button>}
            <button type="button" className={!preview?'nv-fullscreen-mode is-active':'nv-fullscreen-mode'}
              onClick={()=>{setPreview(false);setIntroVisible(false);}} title="Retoucher les éléments 360°">
              <Edit3 size={16}/> Éditer
            </button>
            <button type="button" className={preview?'nv-fullscreen-mode is-active':'nv-fullscreen-mode'}
              onClick={()=>{setPreview(true);setMode(null);setSelectedId('');setIntroVisible(false);}}
              title="Voir la création sans poignées d'édition">
              <Eye size={16}/> Voir
            </button>
            <button type="button" className="nv-fullscreen-save" onClick={()=>void manualSave()}
              disabled={!ready||savingManually||!!lock} title="Enregistrer la visite sans quitter le plein écran">
              <Save size={16}/> {savingManually?'Sauvegarde…':'Enregistrer'}
            </button>
            {!preview&&<button type="button" className={'nv-fullscreen-tools-toggle'+(fullscreenToolsOpen?' is-active':'')}
              title="Ouvrir les réglages, la bibliothèque d’icônes et la barre du bas"
              aria-expanded={fullscreenToolsOpen} aria-controls="nv-fullscreen-tools"
              onClick={()=>{setFullscreenToolsOpen(v=>!v);setFullscreenCommandDrawerOpen(false);setFullscreenGalleryOpen(false);}}>
              <PanelRightClose size={16}/> Outils
            </button>}
            <button type="button" className="nv-creation-fullscreen-exit"
              onClick={()=>void toggleCreationFullscreen()} title="Revenir à NovaVisio Studio" aria-label="Quitter le plein écran de création">
              <Minimize2 size={17}/> Quitter
            </button>
          </div>
            {!preview&&<div className="nv-creation-fullscreen-palette" role="toolbar" aria-label="Ajouter des éléments dans la création">
              {([
                ['navigation','➜ Navigation'],['information','ⓘ Information'],['lien','↗ Lien'],
                ['image','▣ Photo'],['video','▶ Vidéo']
              ] as const).map(([type,label])=>(
                <button key={type} type="button" className={'nv-fullscreen-tool'+(mode===type?' is-active':'')}
                  onClick={()=>{setMode(mode===type?null:type);setSelectedId('');setFullscreenCommandDrawerOpen(false);}}
                  title={'Ajouter : '+label}>{label}</button>
              ))}
              {mode&&<button type="button" className="nv-fullscreen-tool nv-fullscreen-cancel" onClick={()=>setMode(null)}>Annuler</button>}
            </div>}</>}
            {fullscreenGalleryOpen&&<section id="nv-fullscreen-gallery" className="nv-drawer-gallery" aria-label="Galerie des panoramas">
            <header className="nv-fullscreen-gallery-header">
              <div><small>{currentSpace?.name??project.name}</small><strong>Galerie des panoramas</strong></div>
              <button type="button" className="nv-gallery-back" onClick={()=>{setFullscreenGalleryOpen(false);setHoveredGallerySceneId(null);setFullscreenSelectedDestinationId(null);}}
                aria-label="Retour au menu des commandes">← Retour</button>
            </header>
            <div className="nv-fullscreen-gallery-nav">
              <button type="button" onClick={()=>stepFullscreenScene(-1)} title="Panorama précédent">
                <ChevronLeft size={16}/> Précédent
              </button>
              <button type="button" onClick={()=>stepFullscreenScene(1)} title="Panorama suivant">
                Suivant <ChevronRight size={16}/>
              </button>
            </div>

            <div className="nv-quick-link-mode" hidden>
              <button type="button" className={quickLinkMode?'is-active':''} aria-pressed={quickLinkMode} onClick={()=>setQuickLinkMode(v=>!v)}>
                ➜ {quickLinkMode?'Création de flèches activée':'Activer création de flèches'}
              </button>
              <small>{quickLinkMode?'Choisis une destination, vise avec la croix, puis valide. Les icônes du projet seront utilisées.':'Choisis un panorama pour l’ouvrir sans créer de flèche.'}</small>
            </div>
            <div className="nv-gallery-layout-choice" role="group" aria-label="Affichage des panoramas"><button type="button" className={fullscreenGalleryLayout==='grid'?'is-active':''} onClick={()=>setFullscreenGalleryLayout('grid')}>▦ Grille</button><button type="button" className={fullscreenGalleryLayout==='list'?'is-active':''} onClick={()=>setFullscreenGalleryLayout('list')}>☷ Liste</button></div>
            <div className={'nv-fullscreen-gallery-list nv-gallery-layout-'+fullscreenGalleryLayout}>
              {visibleScenes.map((scene,index)=><button type="button" key={scene.id}
                className={'nv-fullscreen-gallery-scene'+(scene.id===activeId?' is-active':'')+(scene.id===fullscreenSelectedDestinationId?' is-selected-destination':'')}
                onMouseEnter={()=>scheduleGalleryHover(scene.id)}
                onMouseLeave={()=>dismissGalleryHover()}
                onFocus={()=>scheduleGalleryHover(scene.id)}
                onBlur={()=>dismissGalleryHover()}
                onClick={()=>{if(scene.id!==activeId){setFullscreenSelectedDestinationId(scene.id);setHoveredGallerySceneId(scene.id);}}}
                aria-pressed={scene.id===fullscreenSelectedDestinationId}
                aria-current={scene.id===activeId?'true':undefined}>
                {sceneThumbs[scene.id]?<img alt="" draggable={false} src={sceneThumbs[scene.id]} decoding="async"/>:
                  <span className="nv-fullscreen-gallery-placeholder">◎</span>}{todoPin(scene.id)}
                <span className="nv-fullscreen-gallery-scene-details">
                  <strong>{scene.name}</strong>
                  <small>Panorama {index+1}{scene.id===activeId?' · En cours':''}</small>
                  {scene.id===fullscreenSelectedDestinationId?<em>✓ Destination sélectionnée</em>:scene.id!==activeId?<em>⊕ Orienter la destination</em>:null}
                  {scene.arrivalYaw!==undefined&&<em>✓ Vue d'arrivée définie</em>}
                </span>
              </button>)}
            </div>
            <footer className="nv-fullscreen-gallery-footer">
              {visibleScenes.length} panorama{visibleScenes.length>1?'s':''} dans cet espace
            </footer>
            </section>}
            {!fullscreenGalleryOpen&&<div className="nv-drawer-arrival-action">
              <button type="button" className="nv-arrival-aim-toggle" onClick={()=>{setShowArrivalCrosshair(v=>!v);setFullscreenCommandDrawerOpen(false);}} aria-pressed={showArrivalCrosshair}>⊕ {showArrivalCrosshair?'Masquer le viseur':'Afficher le viseur'}</button>
              <button type="button" className="nv-drawer-arrival-save" onClick={()=>{saveArrivalView();setShowArrivalCrosshair(false);}}
                title="Définir l'orientation et le zoom d'arrivée de ce panorama">
                <Eye size={17}/> Définir la vue actuelle
              </button>
              {active.arrivalYaw!==undefined?
                <small className="nv-drawer-arrival-current">✓ Vue définie · {Math.round(active.arrivalYaw*180/Math.PI)}° · zoom {Math.round(active.arrivalZoom??60)} %</small>:
                <small className="nv-drawer-arrival-current">Oriente la vue et règle le zoom avant de cliquer.</small>}
              <small className="nv-drawer-arrival-note">Vue d'arrivée par défaut depuis la galerie et les flèches sans vue spécifique. Enregistre ensuite le projet avec la disquette.</small>
            </div>}

          </div>}
          {active&&creationFullscreen&&!preview&&fullscreenToolsOpen&&
            <aside id="nv-fullscreen-tools" className="nv-fullscreen-tools-panel" aria-label="Réglages en plein écran">
              <div className="nv-fullscreen-tools-head">
                <div><small>NOVAVISIO STUDIO</small><strong>Réglages rapides</strong></div>
                <button type="button" aria-label="Fermer les réglages" onClick={()=>setFullscreenToolsOpen(false)}><XMark/></button>
              </div>
              <div className="nv-fullscreen-tools-tabs" role="tablist">
                <button type="button" className={fullscreenToolsTab==='point'?'is-active':''}
                  onClick={()=>setFullscreenToolsTab('point')}>Points</button>
                <button type="button" className={fullscreenToolsTab==='bar'?'is-active':''}
                  onClick={()=>setFullscreenToolsTab('bar')}>Barre</button>
                <button type="button" className={fullscreenToolsTab==='scene'?'is-active':''}
                  onClick={()=>setFullscreenToolsTab('scene')}>Scène</button>
              </div>
              <div className="nv-fullscreen-tools-body">
                {fullscreenToolsTab==='point'&&<>
                  <div className="nv-quick-section-title">Points de ce panorama</div>
                  <div className="nv-quick-point-list">
                    {active.hotspots.map(h=><button type="button" key={h.id}
                      className={selectedId===h.id?'is-active':''}
                      onClick={()=>selectPointForEditing(h.id)}>
                      <span>{h.type==='navigation'?'➜':h.type==='image'?'▣':h.type==='video'?'▶':h.type==='lien'?'↗':'ⓘ'}</span>
                      <strong>{h.title||'Sans titre'}</strong>
                    </button>)}
                    {!active.hotspots.length&&<p className="nv-quick-hint">Ajoute un élément depuis la barre supérieure, puis clique dans le panorama.</p>}
                  </div>
                  {selected?<div className="nv-quick-fields">
                    {navigationEditor()}
                    <label>Nom du point
                      <input value={selected.title} onChange={e=>patchPoint({title:e.target.value})}/>
                    </label>
                    {selected.type==='navigation'&&<>
                      <label>Aller vers</label>
                      <button type="button" className="nv-quick-destination-picker" aria-expanded={navigationPickerOpen}
                        aria-controls="nv-navigation-gallery-picker"
                        onClick={()=>{setNavigationPickerOpen(v=>!v);setNavigationPickerHover(null);setNavigationPickerPreviewId(null);setFullscreenCommandDrawerOpen(false);setFullscreenGalleryOpen(false);}}>
                        <Images size={16}/>
                        <span>{project.scenes.find(sc=>sc.id===selected.target)?.name??'Choisir un panorama dans la galerie'}</span>
                        <ChevronRight size={16}/>
                      </button>
                      <small className="nv-quick-hint">Sélectionne la destination dans la galerie visuelle à gauche. La scène en cours reste ouverte.</small>
                      <button type="button" className="tool" disabled={!selected.target||!visibleIds.has(selected.target)}
                        onClick={()=>{if(active&&selected.target)goThroughArrow(selected,active.id);}}>
                        ➜ Tester la navigation
                      </button>
                      <button type="button" className="nv-quick-primary" disabled={!selected.target||!visibleIds.has(selected.target)}
                        onClick={()=>reverseNavigation(selected)}>
                        ↩ {project.scenes.find(sc=>sc.id===selected.target)?.hotspots.some(h=>h.type==='navigation'&&h.target===activeId)
                          ?'Ouvrir le retour existant':'Créer le retour (facultatif)'}
                      </button>
                      <small className="nv-quick-hint">Aucun retour n’est créé automatiquement. Clique ici uniquement si tu souhaites ajouter un retour.</small>
                    </>}
                    {(selected.type==='lien'||selected.type==='information')&&<>
                      <label>Adresse / lien
                        <input type="url" placeholder="https://…" value={selected.url??''} onChange={e=>patchPoint({url:e.target.value})}/>
                      </label>
                      <button type="button" className="import" onClick={()=>setInformationEdit({sceneId:activeId,pointId:selected.id})}>Rédiger le texte et choisir la police</button>
                  <label>Texte affiché
                        <textarea rows={3} value={selected.text} onChange={e=>patchPoint({text:e.target.value})}/>
                      </label>
                    </>}
                    {selected.type==='information'&&<>
                      <button type="button" onClick={()=>setInformationEdit({sceneId:activeId,pointId:selected.id})}>Rédiger l’information</button>
                      <label className="nv-quick-upload">▣ {selected.imageDataUrl?'Remplacer la photo du popup':'Importer une photo pour popup'}
                        <input type="file" accept="image/*,.heic,.heif"
                          onChange={e=>{void addFrameImage(e.target.files?.[0]);e.currentTarget.value='';}}/>
                      </label>
                      {selected.imageDataUrl&&<>
                        <PhotoFramePicker value={selected.imageFrameStyle} onChange={imageFrameStyle=>patchPoint({imageFrameStyle})}/>
                        <img className="photo-preview-uploaded" src={selected.imageDataUrl} alt="Photo du popup"/>
                        <label className="nv-quick-check"><input type="checkbox" checked={selected.fadeOnClick!==false}
                          onChange={e=>patchPoint({fadeOnClick:e.target.checked})}/> Animation de fondu au clic</label>
                        <button type="button" className="nv-quick-primary" onClick={()=>{setZoomFrom(null);setImageZoom(selected);}}>
                          <Eye size={15}/> Tester le popup photo
                        </button>
                        <button type="button" className="tool" onClick={()=>patchPoint({imageDataUrl:undefined})}>Retirer la photo</button>
                      </>}
                      <p className="nv-quick-hint">Dans la visite classique, un clic sur l’icône Information ouvre cette photo en grand.</p>
                    </>}
                    {selected.type==='image'&&<>
                      <MediaDisplayControl hotspot={selected} onChange={patchPoint}/>
                {isPopupMedia(selected)&&<MediaIconSelector project={project} value={selected} kind={selected.type} label="Icône du popup" onChange={patchPoint}/>}
                      <PhotoFramePicker value={selected.imageFrameStyle} onChange={imageFrameStyle=>patchPoint({imageFrameStyle})}/>
                      <label className="nv-quick-upload">▣ {selected.imageDataUrl?'Remplacer la photo':'Ajouter une photo'}
                        <input type="file" accept="image/*,.heic,.heif"
                          onChange={e=>{void addFrameImage(e.target.files?.[0]);e.currentTarget.value='';}}/>
                      </label>
                      <label className="nv-quick-check"><input type="checkbox" checked={selected.fadeOnClick!==false}
                        onChange={e=>patchPoint({fadeOnClick:e.target.checked})}/> Agrandir en fondu au clic</label>
                      {!isPopupMedia(selected)&&<label className="nv-quick-check"><input type="checkbox" checked={selected.imageBounce!==false}
                        onChange={e=>patchPoint({imageBounce:e.target.checked})}/> Rebond de cette image en aperçu</label>}
                      {selected.imageDataUrl&&<button type="button" className="nv-quick-primary"
                        onClick={()=>{setZoomFrom(null);setImageZoom(selected);}}>
                        <Eye size={15}/> Tester le popup photo
                      </button>}
                      {!isPopupMedia(selected)&&<p className="nv-quick-hint">Déplace les quatre petites poignées sur le panorama pour adapter la photo.</p>}
                    </>}
                    {selected.type==='video'&&<>
                      <MediaDisplayControl hotspot={selected} onChange={patchPoint}/>
                {isPopupMedia(selected)&&<MediaIconSelector project={project} value={selected} kind={selected.type} label="Icône du popup" onChange={patchPoint}/>}
                      <label>URL de la vidéo
                        <input type="url" placeholder="https://…/video.mp4" value={selected.videoUrl??''}
                          onChange={e=>patchPoint({videoUrl:e.target.value,videoDataUrl:undefined})}/>
                      </label>
                      <label className="nv-quick-upload">▶ Importer une vidéo
                        <input type="file" accept="video/mp4,video/webm" onChange={e=>{
                          void addVideo(e.target.files?.[0]);e.currentTarget.value='';
                        }}/>
                      </label>
                      {!isPopupMedia(selected)&&<label className="nv-quick-check"><input type="checkbox" checked={selected.videoAutoplay!==false}
                        onChange={e=>patchPoint({videoAutoplay:e.target.checked})}/> Lecture automatique</label>}
                      <label className="nv-quick-check"><input type="checkbox" checked={selected.videoLoop!==false}
                        onChange={e=>patchPoint({videoLoop:e.target.checked})}/> Boucle</label>
                      {!isPopupMedia(selected)&&<label className="nv-quick-check"><input type="checkbox" checked={selected.videoOpenFullscreen!==false}
                        onChange={e=>patchPoint({videoOpenFullscreen:e.target.checked})}/> Agrandir au clic</label>}
                    </>}
                    {selected.type!=='image'&&selected.type!=='video'&&fullscreenIconSetPicker(
                      {...selected,size:selected.iconSize??28},
                      set=>patchPoint({iconId:set.iconId,hoverIconId:set.hoverIconId,
                        pressedIconId:set.pressedIconId,iconSize:set.size})
                    )}
                    <details className="nv-quick-icon-advanced">
                      <summary>Personnaliser les PNG séparément</summary>
                    {(['iconId','hoverIconId','pressedIconId'] as const).map((field,index)=>
                      <div key={field} className="nv-quick-icon-field">
                        <strong>{['Normale','Survol','Clic'][index]}</strong>
                        <div className="nv-quick-icon-grid">
                          <button type="button" className={!selected[field]?'is-active':''}
                            title="Icône par défaut" onClick={()=>patchPoint({[field]:undefined})}>◎</button>
                          {project.icons.map(icon=><button type="button" key={icon.id}
                            className={selected[field]===icon.id?'is-active':''}
                            title={icon.name} onClick={()=>patchPoint({[field]:icon.id})}>
                            <img src={icon.dataUrl} alt={icon.name}/>
                          </button>)}
                        </div>
                        <label className="nv-quick-upload-small">＋ Importer un PNG
                          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif"
                            onChange={e=>{void uploadFullscreenIcon(e.target.files?.[0],field);e.currentTarget.value='';}}/>
                        </label>
                      </div>)}
                    </details>
                    <label>Taille de l’icône : {selected.iconSize??28} px
                      <input type="range" min="16" max="80" value={selected.iconSize??28}
                        onChange={e=>patchPoint({iconSize:Number(e.target.value)})}/>
                    </label>
                    <button type="button" className="nv-quick-delete" onClick={()=>{
                      if(!window.confirm('Supprimer ce point ?'))return;
                      patchScene(sc=>({...sc,hotspots:sc.hotspots.filter(h=>h.id!==selectedId)}));
                      setSelectedId('');
                    }}><Trash2 size={14}/> Supprimer ce point</button>
                  </div>:<p className="nv-quick-hint">Sélectionne un point dans la liste ou clique sur son icône dans le panorama pour modifier ses paramètres et ses PNG.</p>}
                  <div className="nv-fullscreen-gallery-arrival nv-quick-arrival">
                    <div className="nv-fullscreen-gallery-arrival-text">
                      <strong>Vue d’arrivée du panorama</strong>
                      <span>Oriente la caméra et règle le zoom, puis enregistre cette vue. Elle sera utilisée en arrivant ici depuis la galerie, une navigation normale ou l'export.</span>
                    </div>
                    <button type="button" onClick={saveArrivalView}>
                      <Eye size={15}/> Enregistrer la vue actuelle
                    </button>
                    {active.arrivalYaw!==undefined &&
                      <small className="nv-fullscreen-gallery-arrival-saved">
                        ✓ Vue définie · orientation {Math.round(active.arrivalYaw*180/Math.PI)}° · zoom {Math.round(active.arrivalZoom??60)} %
                      </small>}
                  </div>
                </>}
                {fullscreenToolsTab==='bar'&&<>
                  <div className="nv-quick-section-title">Boutons de la barre</div>
                  <div className="nv-quick-point-list">
                    {project.bottomBar.map(item=><button type="button" key={item.id}
                      className={selectedBarId===item.id?'is-active':''}
                      onClick={()=>{setSelectedBarId(item.id);setSelectedId('');setMode(null);}}>
                      <span>{project.icons.find(i=>i.id===item.iconId)?
                        <img src={project.icons.find(i=>i.id===item.iconId)!.dataUrl} alt=""/>:'◉'}</span>
                      <strong>{item.title}</strong>
                    </button>)}
                  </div>
                  {selectedBar&&<div className="nv-quick-fields">
                    <label>Libellé
                      <input value={selectedBar.title} onChange={e=>patchBar({title:e.target.value})}/>
                    </label>
                    {selectedBar.type==='navigation'&&<label>Panorama de destination
                      <select value={selectedBar.target} onChange={e=>patchBar({target:e.target.value})}>
                        <option value="">Sélectionner…</option>
                        {visibleScenes.map(sc=><option key={sc.id} value={sc.id}>{sc.name}</option>)}
                      </select>
                    </label>}
                    {(selectedBar.type==='lien'||selectedBar.type==='information')&&<label>Lien
                      <input value={selectedBar.url??''} placeholder="https://…" onChange={e=>patchBar({url:e.target.value})}/>
                    </label>}
                    {fullscreenIconSetPicker(
                      {...selectedBar,size:barIconSize(selectedBar)},
                      set=>patchBar({iconId:set.iconId,hoverIconId:set.hoverIconId,
                        pressedIconId:set.pressedIconId,iconSize:set.size})
                    )}
                    <details className="nv-quick-icon-advanced">
                      <summary>Personnaliser les PNG séparément</summary>
                    {(['iconId','hoverIconId','pressedIconId'] as const).map((field,index)=><div key={field} className="nv-quick-icon-field">
                      <strong>{['PNG normal','PNG survol','PNG clic'][index]}</strong>
                      <div className="nv-quick-icon-grid">
                        <button type="button" className={!selectedBar[field]?'is-active':''}
                          onClick={()=>patchBar({[field]:undefined})}>◎</button>
                        {project.icons.map(icon=><button type="button" key={icon.id} title={icon.name}
                          className={selectedBar[field]===icon.id?'is-active':''}
                          onClick={()=>patchBar({[field]:icon.id})}><img src={icon.dataUrl} alt={icon.name}/></button>)}
                      </div>
                      <label className="nv-quick-upload-small">＋ Importer un PNG
                        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif"
                          onChange={e=>{void uploadFullscreenIcon(e.target.files?.[0],field);e.currentTarget.value='';}}/>
                      </label>
                    </div>)}
                    </details>
                    <label>Taille du bouton : {barIconSize(selectedBar)} px
                      <input type="range" min="20" max="72" value={barIconSize(selectedBar)}
                        onChange={e=>patchBar({iconSize:Number(e.target.value)})}/>
                    </label>
                  </div>}
                  <InspectorSection title="Dimensions de la barre"><BarDimensions style={project.barStyle} onChange={changeBarStyle}/></InspectorSection>
                  <div className="nv-quick-section-title">Apparence de la barre</div>
                  <div className="nv-quick-colors">
                    {([
                      ['background','Fond'],
                      ['outline','Contour'],
                      ['button','Boutons'],
                      ['icon','Pictogrammes']
                    ] as const).map(([key,label])=><label key={key}>{label}
                      <input type="color" value={project.barStyle[key]} onChange={e=>changeBarStyle({[key]:e.target.value})}/>
                    </label>)}
                  </div>
                </>}
                {fullscreenToolsTab==='scene'&&<div className="nv-quick-fields">
                  <label>Nom du panorama
                    <input value={active.name} onChange={e=>patchScene(sc=>({...sc,name:e.target.value}))}/>
                  </label>
                  {nightSceneControls(active)}
                  <button type="button" className="nv-quick-primary" onClick={saveArrivalView}>
                    <Eye size={15}/> Définir cette vue comme arrivée
                  </button>
                  <p className="nv-quick-hint">Oriente et zoome comme tu le souhaites, puis enregistre cette vue. Les orientations propres aux flèches restent prioritaires.</p>
                  <button type="button" className="nv-quick-primary" onClick={()=>{setFullscreenToolsOpen(false);setFullscreenCommandDrawerOpen(true);setFullscreenGalleryOpen(true);}}>
                    <Images size={15}/> Choisir un autre panorama
                  </button>
                </div>}
              </div>
              <div className="nv-fullscreen-tools-foot">
                <button type="button" onClick={()=>{setFullscreenToolsOpen(false);}}>
                  <Eye size={14}/> Retour au panorama
                </button>
              </div>
            </aside>}
          {active&&creationFullscreen&&!preview&&fullscreenToolsOpen&&navigationPickerOpen&&selected?.type==='navigation'&&
            <aside id="nv-navigation-gallery-picker" className={"nv-navigation-gallery-picker"+(navigationPickerPreviewId?" is-preview":"")} aria-label="Choisir le panorama de destination">
              <header className="nv-navigation-gallery-header">
                <div><small>SÉLECTION DE DESTINATION</small><strong>Galerie des panoramas</strong></div>
                <button type="button" aria-label="Fermer la galerie de sélection" onClick={()=>{setNavigationPickerOpen(false);setNavigationPickerHover(null);setNavigationPickerPreviewId(null);}}><XMark/></button>
              </header>
              <p className="nv-navigation-gallery-tip">Clique sur un panorama pour l’examiner en 360°, puis confirme sa destination.</p>
              {navigationPickerPreviewId&&<div className="nv-navigation-inspect">
                <button type="button" className="nv-navigation-inspect-back" onClick={()=>{setNavigationPickerPreviewId(null);setNavigationPickerHover(null);}}>
                  <ChevronLeft size={16}/> Liste des panoramas
                </button>
                {visibleScenes.filter(sc=>sc.id===navigationPickerPreviewId).map(sc=><div key={sc.id} className="nv-navigation-inspect-scene">
                  <strong>{sc.name}</strong>
                  <div className="nv-navigation-inspect-360"><FullscreenGalleryHoverPreview scene={sc} thumb={sceneThumbs[sc.id]} onOrientation={view=>{galleryOrientationRef.current[sc.id]=view;}}/></div>
                  <small>Fais glisser l’image pour regarder autour avant de choisir.</small>
                  <button type="button" className="nv-navigation-inspect-select" onClick={()=>setNavigationDestination(sc.id)}>
                    <Images size={16}/> Utiliser {sc.name} comme destination
                  </button>
                </div>)}
              </div>}
              {!navigationPickerPreviewId&&<input className="nv-navigation-gallery-search" type="search" value={navigationPickerSearch}
                onChange={e=>setNavigationPickerSearch(e.target.value)} placeholder="Rechercher un panorama…" aria-label="Rechercher un panorama"/>}
              {!navigationPickerPreviewId&&<div className="nv-navigation-gallery-list">
                {visibleScenes.filter(sc=>sc.id!==activeId&&sc.name.toLocaleLowerCase('fr').includes(navigationPickerSearch.toLocaleLowerCase('fr'))).map(sc=>
                  <button type="button" key={sc.id} title={'Choisir '+sc.name}
                    className={'nv-fullscreen-gallery-scene'+(sc.id===selected.target?' is-active':'')}
                    onMouseEnter={()=>setNavigationPickerHover(sc.id)}
                    onMouseLeave={()=>setNavigationPickerHover(null)}
                    onFocus={()=>setNavigationPickerHover(sc.id)}
                    onClick={()=>{setNavigationPickerPreviewId(sc.id);setNavigationPickerHover(null);}}>
                    {sceneThumbs[sc.id]?<img src={sceneThumbs[sc.id]} draggable={false} alt=""/>:<span className="nv-fullscreen-gallery-placeholder">◎</span>}{todoPin(sc.id)}
                    <span className="nv-fullscreen-gallery-scene-details">
                      <strong>{sc.name}</strong><small>{sc.id===selected.target?'✓ Destination sélectionnée':'Choisir cette destination'}</small>
                    </span><ChevronRight size={15}/>
                  </button>)}
              </div>}
              <footer><button type="button" onClick={()=>{setNavigationPickerOpen(false);setNavigationPickerHover(null);setNavigationPickerPreviewId(null);}}>
                <ChevronLeft size={15}/> Retour aux réglages
              </button></footer>
            </aside>}
          {active&&creationFullscreen&&!preview&&fullscreenToolsOpen&&navigationPickerOpen&&!navigationPickerPreviewId&&navigationPickerHover&&
            visibleScenes.some(sc=>sc.id===navigationPickerHover)&&
            <aside className="nv-navigation-gallery-preview" aria-label="Aperçu du panorama avant sélection"
              onMouseEnter={()=>{}} onMouseLeave={()=>setNavigationPickerHover(null)}>
              {visibleScenes.filter(sc=>sc.id===navigationPickerHover).map(sc=><div key={sc.id} className="nv-hover-preview-content">
                <div className="nv-hover-preview-title"><div><small>APERÇU 360°</small><strong>{sc.name}</strong></div>
                  <button type="button" onClick={()=>setNavigationDestination(sc.id)}>Choisir cette destination <ChevronRight size={15}/></button>
                </div>
                <FullscreenGalleryHoverPreview scene={sc} thumb={sceneThumbs[sc.id]}/>
              </div>)}
            </aside>}
          {active&&creationFullscreen&&fullscreenCommandDrawerOpen&&fullscreenGalleryOpen&&
            (fullscreenSelectedDestinationId||hoveredGallerySceneId)&&
            visibleScenes.some(scene=>scene.id===(fullscreenSelectedDestinationId||hoveredGallerySceneId))&&
            <aside className="nv-fullscreen-gallery-hover-preview nv-drawer-gallery-hover-preview nv-pinned-destination-preview"
              aria-label="Aperçu de la destination avec viseur"
              onMouseEnter={()=>{if(galleryHoverTimer.current)clearTimeout(galleryHoverTimer.current);}}
              onMouseLeave={()=>{if(!fullscreenSelectedDestinationId)dismissGalleryHover(100);}}>
              {visibleScenes.filter(scene=>scene.id===(fullscreenSelectedDestinationId||hoveredGallerySceneId)).map(scene=>
                <div className="nv-hover-preview-content" key={scene.id}>
                  <div className="nv-hover-preview-title">
                    <div><small>ORIENTATION DE DESTINATION</small><strong title={scene.name}>{scene.name}</strong></div>
                  </div>
                  <div className="nv-targeted-preview nv-fullscreen-destination-viewer">
                    <FullscreenGalleryHoverPreview scene={scene} thumb={sceneThumbs[scene.id]}
                      onOrientation={view=>{galleryOrientationRef.current[scene.id]=view;}}/>
                    <div className="nv-target-center" aria-hidden="true"><span/><span/><i/></div>
                  </div>
                  <button type="button" className="nv-fullscreen-validate-destination"
                    disabled={scene.id===activeId}
                    onClick={()=>validateFullscreenDestination(scene.id)}>✓ Valider la destination</button>
                  <div className="nv-hover-preview-foot">
                    <span>Oriente la vue sur la cible, puis valide pour continuer</span>
                    <span>{visibleScenes.findIndex(sc=>sc.id===scene.id)+1} / {visibleScenes.length}</span>
                  </div>
                </div>)}
            </aside>}
          {active && !preview && mode && (
            <div className="mode-active-pill">
              <span className="mode-active-dot" />
              <span>Cliquez dans le 360° pour placer : <strong>{mode==='navigation'?'Point Navigation':mode==='information'?'Point Information':mode==='lien'?'Lien web':mode==='image'?'Photo':clientVideoPlacement?.name??'Vidéo'}</strong></span>
              <button type="button" className="nv-cancel-placement" onClick={()=>setMode(null)}>✕ Annuler la pose (Échap)</button>
            </div>
          )}
          {/* BARRE DU BAS CONSERVÉE INTACTE */}
          {active && !autoNavigation && project.bottomBar.length>0 && <nav className="visitor-bottom-bar" aria-label="Barre interactive de la visite" style={barCss}>
            {project.bottomBar.map(item=>{
              const icon=project.icons.find(i=>i.id===item.iconId);
              const isUnavailable=preview && item.type==='lien' && !safeLink(item.url);
              return <div key={item.id}><div className="nv-bar-sort-item"><button type="button" style={icon?{'--nv-bar-btn':barIconSize(item)+'px'} as CSSProperties:undefined} className={'visitor-bar-button '+(icon?'has-custom-png ':'')+(selectedBarId===item.id&&!preview?'is-selected':'')} onClick={()=>triggerBar(item)} disabled={isUnavailable} title={isUnavailable?'Lien à configurer':item.title} aria-label={item.title}>
                <span className="visitor-bar-icon">{icon?<IconStateVisual icons={project.icons} normal={item.iconId} hover={item.hoverIconId} pressed={item.pressedIconId} size={barIconSize(item)}/>:<BarGlyph name={item.builtinIcon??'info'}/>}</span>
                <span className="visitor-bar-label">{item.title}</span>
              </button></div></div>;
            })}
          </nav>}
          {introVisible && project.introEnabled && project.introUrl && <div className={"intro-overlay"+(introEnding?" is-ending":"")}>
            <iframe title="Introduction de la visite" src={project.introUrl} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" referrerPolicy="strict-origin-when-cross-origin"/>
          </div>}
          {videoZoom && <VideoPopup hotspot={videoZoom} origin={zoomFrom} onClose={()=>setVideoZoom(null)}/>}
          {active && <ContinuousMusic project={project} scene={active} paused={!preview||!!videoZoom||introVisible}/>}
          {preview&&galleryOpen&&(()=>{
            const item=project.bottomBar.find(b=>b.id===galleryOpen&&b.type==='gallery');
            if(!item)return null;
            return <PanoramaGallery title={item.galleryTitle||item.title||'Panoramas'} currentId={active?.id} background={galleryBackgroundSrc(item,project.scenes,project.spaces,sceneThumbs)}
              entries={galleryEntries(item,visibleScenes,project.spaces).map(e=>({sceneId:e.sceneId,spaceId:e.spaceId,label:e.label,thumb:e.coverDataUrl??sceneThumbs[e.sceneId]}))}
              onPick={(id,spaceId)=>{if(spaceId){selectSpace(spaceId);setPreview(true);}else selectScene(id);setGalleryOpen(null);}} onClose={()=>setGalleryOpen(null)}/>;
          })()}
          {imageZoom?.imageDataUrl && <ZoomImage variant="studio" frameStyle={imageZoom.imageFrameStyle} src={imageZoom.imageDataUrl} alt={imageZoom.title} origin={zoomFrom} animate={imageZoom.fadeOnClick!==false} onClose={()=>setImageZoom(null)}/>}
          {frame && <div className="embed-overlay" onClick={()=>setFrame(null)} role="presentation">
            <section className="embed-shell" aria-label={'Contenu intégré : '+frame.title} onClick={event=>event.stopPropagation()}>
              <div className="embed-header">
                <span className="embed-title">{frame.title}</span>
                <div className="embed-actions">
                  <button type="button" onClick={()=>setFrame(null)} aria-label="Fermer le contenu intégré"><XMark/></button>
                </div>
              </div>
              <EmbeddedPage url={frame.url} title={frame.title}/>
            </section>
          </div>}
          {info && <div className="overlay info-in-view" onClick={()=>setInfo(null)}>
            <div className="modal" onClick={event=>event.stopPropagation()}>
              <button className="close" onClick={()=>setInfo(null)} aria-label="Fermer"><XMark/></button>
              <h2>{info.title}</h2>
              <div className="nv-info-languages" role="group" aria-label="Langue de l'information">
                {STUDIO_LANGUAGES.filter(lang=>activeLanguages.includes(lang.code)).map(lang=><button type="button" key={lang.code} title={lang.name} aria-label={lang.name} aria-pressed={infoLanguage===lang.code} className={infoLanguage===lang.code?'is-active':''} onClick={()=>setInfoLanguage(lang.code)}>{lang.flag}</button>)}
              </div><p className="preserve" style={{fontFamily:informationFont(info.fontFamily)+', Arial, sans-serif'}}>{(infoLanguage==='fr'?info.text:info.translations?.[infoLanguage]||info.text)||'Aucune information renseignée.'}</p>
              <button className="primary" onClick={()=>setInfo(null)}>Fermer</button>
            </div>
          </div>}
        </div>
        {active && !preview && <CreationToolbar selected={mode??(panel==='bar'?'bar':null)} auto={autoNavigation} onAuto={toggleAutoNavigation}
          onTool={tool=>{
            if(autoNavigation)stopAutoNavigation();
            if(tool==='bar'){setPanel('bar');setMode(null);setSelectedId('');setRightHidden(false);}
            else setMode(current=>current===tool?null:tool);
          }}/>}

      </main>
      <aside className="right panel">
        <div className="nv-inspector-top"><button type="button" onClick={()=>{setRightHidden(true);backFrom();}} aria-label="Fermer les réglages" title="Fermer"><X size={20}/></button></div>
        {currentSpace&&<SpaceCover name={currentSpace.name} value={currentSpace.coverDataUrl} onChange={coverDataUrl=>setProject(p=>({...p,spaces:p.spaces?.map(space=>space.id===currentSpace.id?{...space,coverDataUrl}:space)}))}/>}
        {panel==='client'&&<div className="properties nv-right-client-panel">{clientView}</div>}
        {panel==='panoramas'&&<div className="properties nv-right-panorama-gallery">
        <div className="nv-gallery-heading">
          <div className="section-title"><span>PANORAMAS</span><span className="counter">{visibleScenes.length}</span></div>
          <div className="nv-gallery-heading-actions"><div className="nv-gallery-layout-choice" role="group" aria-label="Affichage des panoramas">
            <button type="button" className={panoramasLayout==='grid'?'is-active':''} onClick={()=>setPanoramasLayout('grid')}>▦</button>
            <button type="button" className={panoramasLayout==='list'?'is-active':''} onClick={()=>setPanoramasLayout('list')}>☷</button>
          </div><button type="button" className="nv-gallery-reset" onClick={()=>setGalleryVerticalOffset(0)} title="Remonter les panoramas en haut">↑ Remonter</button></div>
        </div>
        {currentSpace&&<div className="nv-space-sidebar-context">
          <strong>{currentSpace.name}</strong>
          <small>Les originaux restent dans « Projet complet ».</small>
          <button type="button" onClick={()=>setSpaceManagerOpen(true)}>＋ / − Choisir les panoramas</button>
        </div>}
        {!preview&&false&&<div className="nv-quick-link-mode nv-sidebar-quick-link">
          <button type="button" className={quickLinkMode?'is-active':''} aria-pressed={quickLinkMode}
            onClick={()=>setQuickLinkMode(v=>!v)}>
            ➜ {quickLinkMode?'Flèche automatique : activée':'Flèche automatique : désactivée'}
          </button>
          <small>{quickLinkMode?'Choisis une destination, oriente la cible, puis valide la flèche avec les icônes du projet.':'Clique sur un panorama pour l’ouvrir sans créer de flèche.'}</small>
        </div>}
        <button className="import" onClick={()=>upload.current?.click()}>
          <Plus size={15} style={{marginRight:6,verticalAlign:'-2px'}}/> Importer des panoramas
        </button>
        <div className="nv-scene-discovery">
          <label className="nv-scene-search">
            <Search size={16} aria-hidden="true"/>
            <input type="search" value={sceneSearch} aria-label="Rechercher un panorama"
              placeholder="Rechercher une scène…" onChange={event=>setSceneSearch(event.target.value)}/>
          </label>
          <select className="nv-scene-filter" aria-label="Filtrer les panoramas"
            value={sceneFilter} onChange={event=>setSceneFilter(event.target.value as SceneFilter)}>
            <option value="all">Toutes</option>
            <option value="with">Avec points</option>
            <option value="without">Sans points</option>
          </select>
        </div>
        <div className="nv-gallery-position" style={{marginTop:galleryVerticalOffset}}>
          <button type="button" className="nv-gallery-drag-handle" aria-label="Abaisser ou remonter la liste des panoramas" title="Glisser vers le bas ou le haut pour déplacer la liste"
            onPointerDown={beginGalleryVerticalDrag} onPointerMove={moveGalleryVerticalDrag} onPointerUp={endGalleryVerticalDrag} onPointerCancel={endGalleryVerticalDrag}>
            <span className="nv-gallery-drag-lines" aria-hidden="true">⠿</span> Déplacer la liste <span className="nv-gallery-drag-direction" aria-hidden="true">↕</span>
          </button>
        </div>
        <div className={'scenes nv-panorama-list-'+panoramasLayout} ref={scenesRef}>{filteredScenes.map((s,i)=><div key={s.id} className="scene-slot"
          onMouseEnter={()=>{if(autoNavigation)hoverSidePreview(s.id);}} onMouseLeave={leaveSidePreview}
           onPointerDown={e=>{if(sceneSortEnabled)startSceneDrag(e,i);}}
          onClickCapture={e=>{if(suppressClick.current){e.preventDefault();e.stopPropagation();}}}>
          <button className={'scene '+(s.id===activeId?'active':'')} title={'Ouvrir '+s.name+' directement dans la grande vue'}
            onKeyDown={e=>{
              if(!sceneSortEnabled||!e.altKey||(e.key!=='ArrowUp'&&e.key!=='ArrowDown'))return;
              e.preventDefault();
              moveScene(s.id,e.key==='ArrowUp'?i-1:i+2);
            }}
            onClick={()=>{
              selectScene(s.id);
              if(!autoNavigation){returnTo.current=null;setRightHidden(true);} // on va simplement au panorama choisi
              setMode(autoNavigation&&!preview?'navigation':null);
              setGalleryPreviewSceneId(null);
              setGalleryPreviewPinned(false);
              setClassicDestinationOpen(false);
              setNavigationDraft(null);
              setDestinationEditId(null);
              setStatus('Panorama '+s.name+' ouvert dans la grande vue.');
            }}>
            {sceneThumbs[s.id]?<img src={sceneThumbs[s.id]} alt="Miniature du panorama" draggable={false} decoding="async"/>:<span className="scene-thumb-ph" aria-hidden="true"/>}{todoPin(s.id)}
            <span className="nv-scene-description">
              <strong title={s.name}>{s.name}</strong>
              <small>Scène {visibleScenes.findIndex(scene=>scene.id===s.id)+1}
                {s.id===visibleScenes[0]?.id?' · Accueil':''} · {s.hotspots.length} point{s.hotspots.length>1?'s':''}</small>
            </span>
          </button>
          {autoNavigation&&<button type="button" className="nv-scene-360-preview-btn" title={'Prévisualiser '+s.name+' en 360°'}
            onClick={()=>{setGalleryPreviewSceneId(s.id);setGalleryPreviewPinned(true);}}>360°</button>}
          {currentSpace?<button type="button" className="nv-space-exclude" title={'Retirer '+s.name+' de cet espace uniquement'}
             aria-label={'Retirer '+s.name+' de cet espace'}
             onClick={()=>removeSceneFromSpace(currentSpace.id,s.id)}><XMark/></button>:
            <span className="scene-grip" aria-hidden="true" title="Glisse pour changer l’ordre">⋮⋮</span>}
        </div>)}
        {currentSpace&&!visibleScenes.length&&<div className="nv-space-empty-list">
          <p>Aucun panorama dans cet espace.</p>
          <button type="button" onClick={()=>setSpaceManagerOpen(true)}>Choisir des panoramas</button>
        </div>}
        {visibleScenes.length>0&&!filteredScenes.length&&<div className="nv-space-empty-list">
          <p>Aucun panorama ne correspond à la recherche.</p>
          <button type="button" onClick={()=>{setSceneSearch('');setSceneFilter('all');}}>Effacer les filtres</button>
        </div>}</div>
        {galleryPreviewSceneId&&visibleScenes.some(sc=>sc.id===galleryPreviewSceneId)&&<div className="nv-side-panorama-preview nv-side-panorama-popup" onMouseEnter={()=>{if(sidePreviewTimer.current)clearTimeout(sidePreviewTimer.current);}} onMouseLeave={leaveSidePreview}>
          <div className="nv-side-preview-title"><strong>Aperçu 360°</strong>
            <button type="button" onClick={()=>{setGalleryPreviewSceneId(null);setGalleryPreviewPinned(false);}} aria-label="Fermer l'aperçu"><XMark/></button></div>
          {visibleScenes.filter(sc=>sc.id===galleryPreviewSceneId).map(sc=><div key={sc.id} className="nv-side-preview-content">
            <strong>{sc.name}</strong>
            <div className="nv-side-preview-viewer nv-targeted-preview"><FullscreenGalleryHoverPreview scene={sc} thumb={sceneThumbs[sc.id]} onOrientation={view=>{galleryOrientationRef.current[sc.id]=view;}}/>{autoNavigation&&!preview&&<div className="nv-target-center" aria-hidden="true"><span/><span/><i/></div>}</div>
            {autoNavigation&&!preview&&sc.id!==activeId?<button type="button" className="nv-quick-create-arrow" onClick={()=>createNavigationFromGallery(sc.id)}>✓ Valider la direction</button>:<button type="button" onClick={()=>{selectScene(sc.id);setGalleryPreviewSceneId(null);setGalleryPreviewPinned(false);setPanel('points');}}>Ouvrir le panorama</button>}
          </div>)}
        </div>}
        <div className="helper nv-gallery-help" hidden>
          <strong>✦ Guide rapide</strong>
          <p>Clique sur un point dans le 360° pour modifier directement ses propriétés à droite.</p>
          <button className="help" onClick={()=>setHelp(true)}>Guide de démarrage →</button>
        </div>
        </div>}
        {panel==='points' && <div className="properties">
          {!active?<div className="hint">Importe un panorama pour commencer à créer.</div>:selected ? (
            /* ============================================================== */
            /* DIRECT ELEMENT INSPECTOR (QUAND UN ÉLÉMENT DU 360° EST CLIQUÉ) */
            /* ============================================================== */
            <div id="nv-selected-point" className="element-inspector">
              <div className="element-inspector-header">
                <div className="element-inspector-badge">
                  <span className="badge-glyph">
                    {selected.type==='navigation'?'➜':selected.type==='lien'?'↗':selected.type==='image'?'▣':selected.type==='video'?'▶':'ⓘ'}
                  </span>
                  <div>
                    <strong>{selected.type==='navigation'?'Navigation':selected.type==='lien'?'Lien web':selected.type==='image'?'Photo':selected.type==='video'?'Vidéo':'Information'}</strong>
                    <small>Paramètres de l’élément sélectionné</small>
                  </div>
                </div>
                <button type="button" className="element-close-btn" onClick={()=>setSelectedId('')} title="Désélectionner et revenir aux paramètres de la scène">
                  ← Vue d’ensemble
                </button>
              </div>

              {navigationEditor()}
              {active.hotspots.length > 1 && (
                <div className="point-quick-switcher">
                  <label>Passer à un autre point :
                    <select value={selectedId} onChange={e=>selectPointForEditing(e.target.value)}>
                      {active.hotspots.map((h, idx) => (
                        <option key={h.id} value={h.id}>
                          {idx + 1}. {h.type==='navigation'?'➜ ':h.type==='lien'?'↗ ':h.type==='image'?'▣ ':h.type==='video'?'▶ ':'ⓘ '}
                          {h.title || 'Point sans titre'}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              <div className="field-group">
                <label>Titre / Libellé
                  <input value={selected.title} placeholder="Nom du point..." onChange={e=>patchPoint({title:e.target.value})}/>
                </label>
              </div>

              {selected.type==='image' ? <>
                <MediaDisplayControl hotspot={selected} onChange={patchPoint}/>
                {isPopupMedia(selected)&&<MediaIconSelector project={project} value={selected} kind={selected.type} label="Icône du popup" onChange={patchPoint}/>}
                <PhotoFramePicker value={selected.imageFrameStyle} onChange={imageFrameStyle=>patchPoint({imageFrameStyle})}/>
                <button type="button" className="import" onClick={()=>{setMediaPicker({sceneId:activeId,hotspotId:selectedId,type:'image',fresh:false});}}>🖼 Choisir une photo déjà utilisée</button>
                <label className="photo-upload-dropzone" onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add('drag-hover');}}
                  onDragLeave={e=>{e.currentTarget.classList.remove('drag-hover');}}
                  onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove('drag-hover');void addFrameImage(e.dataTransfer.files[0]);}}>
                  <span className="photo-upload-icon">＋</span>
                  <strong>{selected.imageDataUrl?'Changer la photo du cadre':'Choisir une photo'}</strong>
                  <span>Cliquer ici ou déposer une photo dans ce cadre</span>
                  <input type="file" accept="image/*,.heic,.heif" onChange={e=>{const file=e.currentTarget.files?.[0];if(file)void addFrameImage(file);e.currentTarget.value='';}}/>
                </label>
                <small className="hint-inline">JPG, PNG, WebP (HEIC selon navigateur) · 40 Mo max</small>
                {photoFeedback&&<div role="status" className="photo-feedback">{photoFeedback}</div>}
                {selected.imageDataUrl&&<img className="photo-preview-uploaded" src={selected.imageDataUrl} alt="Photo intégrée au cadre"/>}
                {!isPopupMedia(selected)&&<>
                {selected.imageDataUrl && <p className="hint">💡 Cadrage : déplace directement les quatre poignées turquoise sur le cadre photo dans le 360° pour suivre la perspective.</p>}
                <label>Largeur : {selected.frameWidth??320} px
                  <input type="range" min="80" max="900" step="10" value={selected.frameWidth??320} onChange={e=>patchPoint({frameWidth:Number(e.target.value)})}/>
                </label>
                <label>Hauteur : {selected.frameHeight??200} px
                  <input type="range" min="60" max="700" step="10" value={selected.frameHeight??200} onChange={e=>patchPoint({frameHeight:Number(e.target.value)})}/>
                </label>
                </>}
                <label className="toggle-row"><input type="checkbox" checked={selected.fadeOnClick??true} onChange={e=>patchPoint({fadeOnClick:e.target.checked})}/> Agrandir en fondu au clic</label>
                {!isPopupMedia(selected)&&<label className="toggle-row"><input type="checkbox" checked={selected.imageBounce!==false} onChange={e=>patchPoint({imageBounce:e.target.checked})}/> Rebond de cette image en aperçu</label>}
                {selected.imageDataUrl&&<button type="button" className="tool" onClick={()=>{setZoomFrom(null);setImageZoom(selected);}}>
                  <Eye size={15}/> Tester le popup photo
                </button>}
                {!isPopupMedia(selected)&&<button className="style-reset" type="button" onClick={()=>patchPoint({frameCorners:defaultFrameCorners(),frameSphericalCorners:undefined})}>Réinitialiser les 4 coins</button>}
              </> : selected.type==='video' ? <>
                <MediaDisplayControl hotspot={selected} onChange={patchPoint}/>
                {isPopupMedia(selected)&&<MediaIconSelector project={project} value={selected} kind={selected.type} label="Icône du popup" onChange={patchPoint}/>}
                <button type="button" className="import" onClick={()=>{setMediaPicker({sceneId:activeId,hotspotId:selectedId,type:'video',fresh:false});}}>🎞 Choisir une vidéo déjà utilisée</button>
                <button type="button" className="import" onClick={()=>videoInput.current?.click()}>{selected.videoDataUrl?'Remplacer la vidéo':'＋ Importer une vidéo MP4 / WebM'}</button>
                <small className="hint-inline">45 Mo max en local, ou renseigne une URL HTTPS directe :</small>
                <label>Ou URL HTTPS de la vidéo
                  <input type="url" placeholder="https://…/video.mp4" value={selected.videoUrl??''} onChange={e=>patchPoint({videoUrl:e.target.value,videoDataUrl:undefined})}/>
                </label>
                {selected.videoUrl && !isSafeMediaUrl(selected.videoUrl)&&<small className="warning-inline">Adresse HTTPS invalide.</small>}
                {(selected.videoDataUrl||selected.videoUrl)&&<video className="editor-video-preview" src={selected.videoDataUrl||selected.videoUrl} controls muted playsInline/>}
                {!isPopupMedia(selected)&&<>
                <div className="section-title">ADAPTER L'ÉCRAN À LA PERSPECTIVE</div>
                <CornerEditor width={selected.frameWidth??320} height={selected.frameHeight??200} corners={selected.frameCorners??defaultFrameCorners()} onChange={v=>patchPoint({frameCorners:v,frameSphericalCorners:undefined})}/>
                <label>Largeur : {selected.frameWidth??320} px
                  <input type="range" min="80" max="900" step="10" value={selected.frameWidth??320} onChange={e=>patchPoint({frameWidth:Number(e.target.value)})}/>
                </label>
                <label>Hauteur : {selected.frameHeight??200} px
                  <input type="range" min="60" max="700" step="10" value={selected.frameHeight??200} onChange={e=>patchPoint({frameHeight:Number(e.target.value)})}/>
                </label>
                </>}
                {!isPopupMedia(selected)&&<label className="toggle-row"><input type="checkbox" checked={selected.videoAutoplay!==false} onChange={e=>patchPoint({videoAutoplay:e.target.checked})}/> Démarrer automatiquement (muet)</label>}
                <label className="toggle-row"><input type="checkbox" checked={selected.videoLoop!==false} onChange={e=>patchPoint({videoLoop:e.target.checked})}/> Répéter la vidéo en boucle</label>
                {!isPopupMedia(selected)&&<label className="toggle-row"><input type="checkbox" checked={selected.videoOpenFullscreen!==false} onChange={e=>patchPoint({videoOpenFullscreen:e.target.checked})}/> Agrandir au clic avec le son</label>}
                {!isPopupMedia(selected)&&<button className="style-reset" type="button" onClick={()=>patchPoint({frameCorners:defaultFrameCorners(),frameSphericalCorners:undefined})}>Réinitialiser les 4 coins</button>}
              </> : selected.type==='navigation' ? (
                <>
                <label>Scène de destination</label>
                <button type="button" className="nv-classic-destination-trigger"
                  aria-expanded={classicDestinationOpen} aria-controls="nv-classic-destination-picker"
                  onClick={()=>{
                    setClassicDestinationOpen(open=>!open);
                    setClassicDestinationSearch('');
                    setClassicDestinationPreviewId(selected.target||visibleScenes.find(sc=>sc.id!==activeId)?.id||null);
                  }}>
                  <Images size={17}/>
                  <span>{visibleScenes.find(sc=>sc.id===selected.target)?.name??'Choisir et visualiser un panorama…'}</span>
                  <ChevronRight size={16}/>
                </button>
                <small className="hint-inline">Ouvre la galerie à gauche pour examiner la destination en 360° avant de confirmer.</small>
                <button type="button" className="tool" disabled={!selected.target||!visibleIds.has(selected.target)}
                  onClick={()=>{if(active&&selected.target)goThroughArrow(selected,active.id);}}>
                  ➜ Tester la navigation vers ce panorama
                </button>
                <button type="button" className="tool nv-reverse-navigation" disabled={!selected.target||!visibleIds.has(selected.target)}
                  onClick={()=>reverseNavigation(selected)}>
                  ↩ {project.scenes.find(sc=>sc.id===selected.target)?.hotspots.some(h=>h.type==='navigation'&&h.target===activeId)
                    ?'Ouvrir le retour existant':'Créer le retour vers ce panorama'}
                </button>
                <small className="hint-inline">Aucun retour n’est créé par défaut. Tu peux décider de le créer avec ce bouton.</small>
                {selected.target&&<div className="arrival-view-card is-inspector">
                  <div className="section-title">VUE D’ARRIVÉE DE CETTE FLÈCHE</div>
                  {selected.arrivalYaw!==undefined?<small className="arrival-saved">✓ Enregistrée · angle {Math.round(selected.arrivalYaw*180/Math.PI)}° · zoom {Math.round(selected.arrivalZoom??60)}%</small>
                    :<small>Pas de vue propre : celle par défaut du panorama de destination est utilisée.</small>}
                  <button type="button" onClick={()=>goThroughArrow(selected,activeId)}>➜ Aller au panorama et régler la vue d’arrivée</button>
                  {selected.arrivalYaw!==undefined&&<button type="button" onClick={()=>{patchPoint({arrivalYaw:undefined,arrivalPitch:undefined,arrivalZoom:undefined});setStatus('Vue d’arrivée de la flèche réinitialisée');}}>Réinitialiser</button>}
                </div>}
                </>
              ) : selected.type==='lien' ? (
                <><div className="nv-action-steps">1. Lien choisi → 2. Point placé → 3. Destination</div><label>Adresse (https://, tel:, mailto:)
                  <input type="text" placeholder="https://exemple.fr" value={selected.url??''} onChange={e=>patchPoint({url:e.target.value})}/>
                </label><label>Ouverture<select aria-label="Ouverture" value={selected.linkMode??'embed'} onChange={e=>patchPoint({linkMode:e.target.value as 'embed'|'tab'})}><option value="embed">Dans la visite (iframe prioritaire)</option><option value="tab">Nouvel onglet</option></select></label><button type="button" onClick={()=>selected.url&&openLinkInTour(selected.title,selected.url,selected.linkMode)}>Tester le lien</button></>
              ) : (
                <>
                  <button type="button" className="import" onClick={()=>setInformationEdit({sceneId:activeId,pointId:selected.id})}>Rédiger le texte et choisir la police</button>
                  <label>Texte affiché
                    <textarea rows={4} placeholder="Description ou informations..." value={selected.text} onChange={e=>patchPoint({text:e.target.value})}/>
                  </label>

                  <InspectorSection title="Contenus complémentaires : page web et photo">
                  <label>Page web intégrée (optionnel)
                    <input type="text" placeholder="https://… menu, réservations" value={selected.url??''} onChange={e=>patchPoint({url:e.target.value})}/>
                    <small className="hint-inline">Si renseignée, la page s'ouvre directement dans la visite à la place du texte.</small>
                  </label>
                  <button type="button" className="import" onClick={()=>{setMediaPicker({sceneId:activeId,hotspotId:selectedId,type:'image',fresh:false});}}>🖼 Choisir une photo déjà utilisée</button>
                <label className="photo-upload-dropzone" onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add('drag-hover');}}
                    onDragLeave={e=>e.currentTarget.classList.remove('drag-hover')}
                    onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove('drag-hover');void addFrameImage(e.dataTransfer.files[0]);}}>
                    <span className="photo-upload-icon">＋</span>
                    <strong>{selected.imageDataUrl?'Remplacer la photo du popup':'Importer une photo pour popup'}</strong>
                    <span>Cliquer ici ou déposer une photo · JPG, PNG, WebP</span>
                    <input type="file" accept="image/*,.heic,.heif" onChange={e=>{void addFrameImage(e.currentTarget.files?.[0]);e.currentTarget.value='';}}/>
                  </label>
                  {photoFeedback&&<div role="status" className="photo-feedback">{photoFeedback}</div>}
                  {selected.imageDataUrl&&<>
                    <PhotoFramePicker value={selected.imageFrameStyle} onChange={imageFrameStyle=>patchPoint({imageFrameStyle})}/>
                    <img className="photo-preview-uploaded" src={selected.imageDataUrl} alt="Photo du popup"/>
                    <label className="toggle-row"><input type="checkbox" checked={selected.fadeOnClick!==false} onChange={e=>patchPoint({fadeOnClick:e.target.checked})}/> Popup avec fondu au clic</label>
                    <button type="button" className="tool" onClick={()=>{setZoomFrom(null);setImageZoom(selected);}}><Eye size={15}/> Tester le popup photo</button>
                    <button type="button" className="style-reset" onClick={()=>patchPoint({imageDataUrl:undefined})}>Supprimer la photo du popup</button>
                  </>}
                  <small className="hint-inline">Si une photo est importée, elle s’ouvre au clic sur l’icône Information dans la visite classique, avant la page web ou le texte.</small>
                  </InspectorSection>
                </>
              )}

              {!['image','video'].includes(selected.type) && <InspectorSection title="Icône et apparence">
                <div className="section-title">ICÔNE DU POINT</div>
                {iconSetPicker({...selected,size:selected.iconSize??28},set=>patchPoint({iconId:set.iconId,hoverIconId:set.hoverIconId,pressedIconId:set.pressedIconId,iconSize:Math.max(16,Math.min(80,set.size))}))}
                {iconStateEditor('pt-normal','Icône personnalisée',selected.iconId,id=>patchPoint({iconId:id}),'Icône par défaut')}
                {selected.iconId && <button type="button" className="style-reset" onClick={()=>requestReplaceIcon(selected.iconId!)}>Remplacer ce PNG partout</button>}
                {iconStateEditor('pt-hover','PNG au survol (optionnel)',selected.hoverIconId,id=>patchPoint({hoverIconId:id}),'Identique au normal')}
                {iconStateEditor('pt-pressed','PNG au clic (optionnel)',selected.pressedIconId,id=>patchPoint({pressedIconId:id}),'Identique au survol')}
                <label>Taille de l'icône : {selected.iconSize??28} px
                  <input type="range" min="16" max="80" step="2" value={selected.iconSize??28} onChange={e=>patchPoint({iconSize:Number(e.target.value)})}/>
                </label>
              </InspectorSection>}

              <div className="coords-card">
                <span>Position 360° : {selected.yaw.toFixed(2)} / {selected.pitch.toFixed(2)} rad</span>
                <small>💡 Astuce : tu peux glisser ce point directement dans le panorama pour ajuster sa position.</small>
              </div>

              <button type="button" className="delete" onClick={()=>{patchScene(sc=>({...sc,hotspots:sc.hotspots.filter(h=>h.id!==selectedId)}));setSelectedId('');}}>
                <Trash2 size={13} style={{marginRight:6,verticalAlign:'-2px'}}/> Supprimer ce point
              </button>
            </div>
          ) : (
            /* ============================================================== */
            /* SCENE OVERVIEW (AUCUN POINT SÉLECTIONNÉ)                        */
            /* ============================================================== */
            <div className="scene-overview">
              {currentSpace&&<div className="nv-action-rectangles"><button type="button" onClick={()=>setSpaceManagerOpen(true)}>▦ Modifier l’espace « {currentSpace.name} »</button></div>}
              <SectionHub id="scene" open={hubOpen.scene??null} onOpenChange={k=>setHubOpen(h=>({...h,scene:k}))}
                intro={currentSpace?<div className="nv-action-rectangles"><button type="button" onClick={()=>setSpaceManagerOpen(true)}>▦ Modifier l’espace « {currentSpace.name} »</button></div>:null}
                sections={[
                  {key:'name',title:'Nom du panorama',hint:active.name,icon:<Pencil size={26}/>,tone:'#4f7cff',content:<>
              <label>Nom de la scène
                <input value={active.name} onChange={e=>patchScene(sc=>({...sc,name:e.target.value}))}/>
              </label>
                  </>},
                  {key:'arrival',title:'Vue d’arrivée',hint:active.arrivalYaw!==undefined?'✓ Définie':'Par défaut',icon:<Eye size={26}/>,tone:'#2fbf8f',content:<>

              {viaHotspot&&viaFrom?<div className="arrival-view-card is-arrow">
                <div className="section-title">VUE D’ARRIVÉE · PAR CETTE FLÈCHE</div>
                <p>Tu es arrivé ici par la flèche <b>« {viaHotspot.title||'Navigation'} »</b> de <b>{viaFrom.name}</b>. Oriente la vue comme tu veux qu’elle apparaisse quand on clique sur <b>cette flèche</b>, puis enregistre. Chaque flèche qui mène à ce panorama a sa propre vue.</p>
                <button type="button" onClick={saveArrivalForArrow}>◎ Définir la vue actuelle comme arrivée pour cette flèche</button>
                {viaHotspot.arrivalYaw!==undefined?<small className="arrival-saved">✓ Enregistrée pour cette flèche · angle {Math.round(viaHotspot.arrivalYaw*180/Math.PI)}° · zoom {Math.round(viaHotspot.arrivalZoom??60)}%</small>
                  :<small>Pas encore de vue propre à cette flèche : la vue par défaut du panorama est utilisée.</small>}
                <div className="arrival-actions">
                  <button type="button" onClick={()=>selectScene(viaFrom.id)}>↩ Retour à « {viaFrom.name} » (autres flèches)</button>
                  {viaHotspot.arrivalYaw!==undefined&&<button type="button" onClick={()=>{setArrowArrival(viaFrom.id,viaHotspot.id,null);nextArrivalRef.current=null;setStatus('Vue d’arrivée de la flèche réinitialisée');}}>Réinitialiser cette flèche</button>}
                </div>
                <details className="arrival-default">
                  <summary>Vue par défaut du panorama</summary>
                  <p>Utilisée quand on arrive ici sans flèche (liste des scènes, barre du bas) ou par une flèche qui n’a pas sa propre vue.</p>
                  <button type="button" onClick={saveArrivalView}>◎ Définir la vue actuelle comme vue par défaut</button>
                  {active.arrivalYaw!==undefined&&<small className="arrival-saved">✓ Enregistrée · angle {Math.round(active.arrivalYaw*180/Math.PI)}° · zoom {Math.round(active.arrivalZoom??60)}%</small>}
                </details>
              </div>:<div className="arrival-view-card">
                <div className="section-title">VUE D’ARRIVÉE PAR DÉFAUT DU PANORAMA</div>
                <p>Oriente la visite dans la direction souhaitée et choisis le zoom, puis enregistre ce cadrage. <b>Astuce :</b> pour une vue différente selon la flèche utilisée, clique sur une flèche (en Aperçu) : tu arrives ici et l’enregistrement se fera pour cette flèche.</p>
                <button type="button" onClick={saveArrivalView}>◎ Définir la vue actuelle comme arrivée</button>
                {active.arrivalYaw!==undefined&&<small className="arrival-saved">✓ Enregistrée · angle {Math.round(active.arrivalYaw*180/Math.PI)}° · zoom {Math.round(active.arrivalZoom??60)}%</small>}
              </div>}


                  </>},
                  {key:'daynight',title:'Jour / nuit',hint:active.nightDataUrl||active.nightSourceSceneId?'✓ Configuré':'Non configuré',icon:<Moon size={26}/>,tone:'#7f8cff',content:nightSceneControls(active,true)},
                  {key:'points',title:'Points interactifs',badge:active.hotspots.length,hint:'Flèches, infos, photos…',icon:<PinIcon size={26}/>,tone:'#ff8a3d',content:<>
              <div className="section-title">
                <span>POINTS INTERACTIFS</span>
                <span className="counter">{active.hotspots.length}</span>
              </div>

              {active.hotspots.length === 0 ? (
                <div className="empty-points-card">
                  <p>Aucun point interactif dans cette scène.</p>
                  <small>Clique sur un des outils sous le panorama (Navigation, Information, Lien, Cadre, Vidéo) puis clique dans le 360° pour en placer un.</small>
                </div>
              ) : (
                <div className="points-list">
                  <p className="hint-small">Clique sur un point ci-dessous ou directement dans le panorama 360° pour le modifier :</p>
                  {active.hotspots.map(h => (
                    <button key={h.id} type="button" className="point-item-btn" onClick={() => selectPointForEditing(h.id)}>
                      <span className="point-item-glyph">
                        {project.icons.find(i=>i.id===h.iconId)?<img className="point-icon-small" src={project.icons.find(i=>i.id===h.iconId)!.dataUrl} alt=""/>:h.type==='navigation'?'➜':h.type==='lien'?'↗':h.type==='image'?'▣':h.type==='video'?'▶':'ⓘ'}
                      </span>
                      <span className="point-item-info">
                        <strong>{h.title || '(Sans titre)'}</strong>
                        <small>{h.type==='navigation'?'Navigation':h.type==='lien'?'Lien web':h.type==='image'?'Photo':h.type==='video'?'Vidéo':'Information'}</small>
                      </span>
                      <ChevronRight size={14} className="point-item-arrow"/>
                    </button>
                  ))}
                </div>
              )}


                  </>},
                  {key:'music',title:'Musique',hint:active.musicTrackId?(project.audioTracks??[]).find(t=>t.id===active.musicTrackId)?.name:'Aucune',icon:<Music size={26}/>,tone:'#ff6fa8',content:<>
              <div className="section-title">MUSIQUE DE CE PANORAMA</div>
              <label>Musique active
                <select value={active.musicTrackId??''} onChange={e=>{
                  const id=e.target.value;
                  patchScene(sc=>({...sc,musicTrackId:id||undefined,audioEnabled:id?false:sc.audioEnabled}));
                }}>
                  <option value="">Aucune musique de la bibliothèque</option>
                  {(project.audioTracks??[]).map(track=><option value={track.id} key={track.id}>{track.name}</option>)}
                </select>
              </label>
              <button type="button" className="import" onClick={()=>audioInput.current?.click()}>＋ Importer une musique</button>
              <button type="button" className="style-reset" onClick={()=>setPanel('music')}>Gérer la bibliothèque musicale</button>
                  </>}
                ]}/>
            </div>
          )}
        </div>}
        {panel==='bar' && <div className="properties">
          <div className="section-title">BARRE DE NAVIGATION <span className="counter">{project.bottomBar.length}</span></div>
          <p className="hint">Ces icônes apparaissent en bas de la visite. Clique sur un bouton dans le panorama ou dans la liste pour le modifier.</p>
          <SectionHub id="bar" open={hubOpen.bar??null} onOpenChange={k=>setHubOpen(h=>({...h,bar:k}))} forceOpen={selectedBarId?'buttons':null} sections={[
            {key:'buttons',title:'Boutons et actions',badge:project.bottomBar.length,hint:'Ajouter, modifier, ordonner',icon:<PanelBottom size={26}/>,tone:'#a468f0',content:<>

          <div className="bar-items-list" data-sort-scope="visit-bar">{project.bottomBar.map(item=><div key={item.id} {...barSort.itemProps(item.id)}><div className="nv-bar-list-sort">{barSort.grip(item.id,item.title)}<button className={'bar-item-row '+(selectedBarId===item.id?'current':'')} aria-expanded={selectedBarId===item.id} onClick={()=>setSelectedBarId(current=>current===item.id?'':item.id)}>
            <span className="bar-item-symbol">{project.icons.find(i=>i.id===item.iconId)?<img src={project.icons.find(i=>i.id===item.iconId)!.dataUrl} alt=""/>:<BarGlyph name={item.builtinIcon??'info'}/>}</span>
            <span>{item.title}</span><small>{item.type==='navigation'?'Scène':item.type==='information'?'Info':item.type==='gallery'?'Galerie':'Lien'}</small>
          </button></div></div>)}</div>
          <button className="import" onClick={()=>addBar('information')}>＋ Ajouter un bouton</button>
          <button className="preset-button" onClick={()=>{if(window.confirm('Remplacer la barre actuelle par le modèle bordeaux à 5 icônes ? Les icônes importées resteront disponibles.')){setProject(p=>({...p,bottomBar:defaultBar()}));setSelectedBarId('');}}}>↻ Appliquer le modèle 5 icônes</button>
          {selectedBar && <InspectorSection key={selectedBar.id} title={"Configurer : "+selectedBar.title} initiallyOpen>
            <hr/>
            <div id="nv-bar-button-settings" className="section-title">CONFIGURER LE BOUTON</div>
            <label>Libellé<input value={selectedBar.title} onChange={e=>patchBar({title:e.target.value})}/></label>
            <div className="section-title">ACTION DU BOUTON</div>
            <div className="nv-bar-action-choices" role="group" aria-label="Action du bouton">
              <button type="button" aria-pressed={selectedBar.type==='navigation'} onClick={()=>chooseBarAction('navigation')}>➜ Panorama</button>
              <button type="button" aria-pressed={selectedBar.type==='gallery'&&barGalleryTab==='panoramas'} onClick={()=>chooseBarAction('gallery','panoramas')}>▧ Panoramas</button>
              <button type="button" aria-pressed={selectedBar.type==='gallery'&&barGalleryTab==='spaces'} onClick={()=>chooseBarAction('gallery','spaces')}>▦ Espaces</button>
              <button type="button" aria-pressed={selectedBar.type==='information'} onClick={()=>chooseBarAction('information')}>ⓘ Information</button>
              <button type="button" aria-pressed={selectedBar.type==='lien'} onClick={()=>chooseBarAction('lien')}>↗ Lien</button>
            </div>
            {selectedBar.type==='gallery'?<BarGalleryEditor item={selectedBar} scenes={project.scenes} spaces={project.spaces??[]} thumbs={sceneThumbs} tab={barGalleryTab} onTabChange={setBarGalleryTab} onChange={patchBar} onPreview={()=>{setPreview(true);setMode(null);setSelectedId('');setIntroVisible(false);setGalleryOpen(selectedBar.id);}}/>:selectedBar.type==='navigation'?<label>Scène de destination<select value={selectedBar.target} onChange={e=>patchBar({target:e.target.value})}><option value="">Première scène (accueil)</option>{project.scenes.map(sc=><option key={sc.id} value={sc.id}>{sc.name}</option>)}</select></label>
            : selectedBar.type==='information'?<><label>Contenu du panneau<textarea rows={5} value={selectedBar.text} onChange={e=>patchBar({text:e.target.value})} placeholder="Horaires, description, informations utiles…"/></label>
              <label>Page intégrée (optionnel)<input type="text" value={selectedBar.url} placeholder="https://… menu, photos, réservations" onChange={e=>patchBar({url:e.target.value})}/></label>
              <small className="hint-inline">Si tu renseignes une URL, elle remplacera le texte par une fenêtre intégrée.</small></>
            :<label>Lien de destination<input type="text" value={selectedBar.url} placeholder="https://… ou tel:+33…" onChange={e=>patchBar({url:e.target.value})}/>{selectedBar.url && !safeLink(selectedBar.url)&&<small className="warning-inline">Adresse invalide : https://, mailto: ou tel: requis</small>}</label>}
            <InspectorSection title="Icônes : normal, survol, clic">
            {iconSetPicker({...selectedBar,size:barIconSize(selectedBar)},set=>patchBar({iconId:set.iconId,hoverIconId:set.hoverIconId,pressedIconId:set.pressedIconId,iconSize:set.size}))}
            {iconStateEditor('bar-normal','PNG normal',selectedBar.iconId,id=>patchBar({iconId:id}),'Icône par défaut')}
            {selectedBar.iconId && <button type="button" className="style-reset" onClick={()=>requestReplaceIcon(selectedBar.iconId!)}>Remplacer ce PNG dans toute la visite</button>}
            {iconStateEditor('bar-hover','PNG au survol',selectedBar.hoverIconId,id=>patchBar({hoverIconId:id}),'Identique au normal')}
            {iconStateEditor('bar-pressed','PNG au clic',selectedBar.pressedIconId,id=>patchBar({pressedIconId:id}),'Identique au survol')}
            {!selectedBar.iconId && <label>Icône de base<select value={selectedBar.builtinIcon??'info'} onChange={e=>patchBar({builtinIcon:e.target.value})}>
              {Object.keys(glyphs).map(key=><option value={key} key={key}>{key}</option>)}
            </select></label>}
            </InspectorSection>
            <InspectorSection title="Taille et position">
            <label>Taille : {barIconSize(selectedBar)} px<input type="range" min="20" max="72" step="2" value={barIconSize(selectedBar)} onChange={e=>patchBar({iconSize:Number(e.target.value)})}/></label>
            <button type="button" className="style-reset" onClick={()=>{const size=barIconSize(selectedBar);setProject(p=>({...p,bottomBar:p.bottomBar.map(b=>({...b,iconSize:size}))}));setStatus('Taille '+size+' px appliquée à tous les boutons');}}>Appliquer cette taille à tous les boutons</button>
            <div className="reorder-row"><button className="tool" onClick={()=>moveBar(-1)}>← Déplacer</button><button className="tool" onClick={()=>moveBar(1)}>Déplacer →</button></div>
            </InspectorSection>
            <button className="delete" onClick={()=>{setProject(p=>({...p,bottomBar:p.bottomBar.filter(b=>b.id!==selectedBarId)}));setSelectedBarId('');}}>Supprimer ce bouton</button>
          </InspectorSection>}

            </>},
            {key:'colors',title:'Couleurs et contours',hint:'Fond, boutons, pictogrammes',icon:<Palette size={26}/>,tone:'#ff8a3d',content:<><div className="style-settings">
            <button type="button" className="tool" onClick={()=>{setPanel('icons');setLibraryFor('global-close-icon');}}>✕ Configurer la croix de fermeture de tous les popups</button>
            <div className="style-colors">
              {barColorFields.map(field=><label className="style-color-field" key={field.key}>
                <span>{field.label}</span>
                <span className="style-picker"><input type="color" value={project.barStyle[field.key]} aria-label={field.label} onChange={e=>changeBarStyle({[field.key]:e.target.value})}/><small>{project.barStyle[field.key]}</small></span>
              </label>)}
            </div>
            <label>Épaisseur du contour de la barre : {project.barStyle.outlineWidth} px
              <input type="range" min="0" max="8" step="1" value={project.barStyle.outlineWidth} onChange={e=>changeBarStyle({outlineWidth:Number(e.target.value)})}/></label>
            <label>Épaisseur du contour des boutons : {project.barStyle.buttonOutlineWidth} px
              <input type="range" min="0" max="8" step="1" value={project.barStyle.buttonOutlineWidth} onChange={e=>changeBarStyle({buttonOutlineWidth:Number(e.target.value)})}/></label>
            <label>Arrondi de la barre : {project.barStyle.roundness} px
              <input type="range" min="0" max="60" step="1" value={project.barStyle.roundness} onChange={e=>changeBarStyle({roundness:Number(e.target.value)})}/></label>
            <button type="button" className="style-reset" onClick={()=>changeBarStyle(defaultBarStyle())}>Restaurer les couleurs bordeaux et argent</button>
          </div>
</>},
            {key:'size',title:'Dimensions de la barre',hint:project.barStyle.height?project.barStyle.height+' px':'Taille automatique',icon:<Ruler size={26}/>,tone:'#2bb3d6',content:<><BarDimensions style={project.barStyle} onChange={changeBarStyle}/></>},
            {key:'skins',title:'Skins',hint:'Enregistrer ou appliquer',icon:<Layers size={26}/>,tone:'#2fbf8f',onClick:()=>setSkinsOpen(true)}
          ]}/>
        </div>}
        {panel==='elements' && <div className="properties">
          <div className="section-title">ÉLÉMENTS DE CE PANORAMA</div>
          <p className="hint">Sélectionne un point pour afficher ses réglages, puis déplace-le directement dans le panorama. Pour ajouter une icône PNG, fais-la glisser depuis la bibliothèque ci-dessous.</p>
          {!active?<p className="hint">Aucun panorama ouvert.</p>:<>
            <div className="elements-list">{active.hotspots.map(h=><button type="button" key={h.id}
              className="elements-entry" onClick={()=>{setSelectedId(h.id);setPanel('points');setMode(null);}}>
              <span>{project.icons.find(i=>i.id===h.iconId)?<img src={project.icons.find(i=>i.id===h.iconId)!.dataUrl} alt=""/>:h.type==='video'?'▶':h.type==='image'?'▣':h.type==='navigation'?'➜':'ⓘ'}</span>
              <strong>{h.title}</strong><small>Modifier et déplacer</small>
            </button>)}</div>
            {!active.hotspots.length&&<p className="hint">Pas encore d’élément dans cette scène.</p>}
          </>}
          {svgIconWorkshop()}
          <div className="section-title">ICÔNES DISPONIBLES</div>
          <div className="elements-icon-grid">
            {project.icons.filter(icon=>!(project.hiddenAvailableIcons??[]).includes(icon.id)).map(icon=><div className="nv-element-icon-wrap" key={icon.id}><button type="button" draggable
              onDragStart={e=>{e.dataTransfer.setData('application/x-nv-icon',icon.id);e.dataTransfer.effectAllowed='copy';}}
              onClick={()=>setStatus('Glisse « '+icon.name+' » dans le panorama pour créer un point')}
              title={'Faire glisser '+icon.name+' sur le panorama'}>
              <img src={icon.dataUrl} alt=""/><span>{icon.name}</span>
            </button><button type="button" className="nv-element-icon-hide" aria-label={'Masquer '+icon.name} title="Masquer sans supprimer l'icône du projet" onClick={()=>setProject(p=>({...p,hiddenAvailableIcons:[...new Set([...(p.hiddenAvailableIcons??[]),icon.id])]}))}>−</button></div>)}
          </div>
          {!!project.hiddenAvailableIcons?.length&&<button type="button" className="quiet" onClick={()=>setProject(p=>({...p,hiddenAvailableIcons:[]}))}>Réafficher les icônes masquées ({project.hiddenAvailableIcons.length})</button>}
          {(collectIconSets().length>0||hiddenIconSetCount()>0)&&<>
            <div className="section-title">JEUX D’ICÔNES (NORMAL + SURVOL + CLIC)</div>
            <div className="icon-set-grid">{collectIconSets().map(set=><div className="icon-set-wrap" key={set.key}>
              <button type="button" className="icon-set" draggable
                onDragStart={e=>{e.dataTransfer.setData('application/x-nv-icon',JSON.stringify({iconId:set.iconId,hoverIconId:set.hoverIconId,pressedIconId:set.pressedIconId,size:set.size}));e.dataTransfer.effectAllowed='copy';}}
                onClick={()=>setStatus('Glisse ce jeu dans le panorama pour créer un point avec ses 3 états')}
                title={'Faire glisser sur le panorama · utilisé par : '+set.users.join(', ')}>
                {iconSetCells(set).map(([label,url])=><span className="icon-set-cell" key={label}><img src={url} alt=""/><small>{label}</small></span>)}
                <span className="icon-set-size">{set.size} px</span>
              </button>
              <button type="button" className={'nv-icon-set-favorite'+(project.favoriteNavigationIconSet===set.key?' is-active':'')} title="Flèche favorite du projet" aria-pressed={project.favoriteNavigationIconSet===set.key} onClick={()=>setNavigationIconFavorite(set.key)}>{project.favoriteNavigationIconSet===set.key?'★':'☆'}</button>
        <button type="button" className="icon-set-hide" title="Retirer ce jeu de la liste (aucun bouton ni point n'est modifié)" aria-label="Retirer ce jeu de la liste" onClick={()=>hideIconSet(set.key)}><XMark/></button>
            </div>)}</div>
            {restoreHiddenLink()}
          </>}
          <button className="import" type="button" onClick={()=>iconInput.current?.click()}>＋ Importer une icône PNG</button>
          <div className="section-title">ICÔNES DE LA BARRE DU BAS</div>
          {project.bottomBar.map(item=><button type="button" className="elements-entry" key={item.id}
            onClick={()=>{setSelectedBarId(item.id);setPanel('bar');}}>
            <span><BarGlyph name={item.builtinIcon??'info'}/></span><strong>{item.title}</strong><small>Personnaliser</small>
          </button>)}
        </div>}
        {panel==='intro' && <div className="properties">
          <div className="section-title">INTRODUCTION DE LA VISITE</div>
          <p className="hint">Chaque visite possède son URL d’introduction. L’introduction apparaît au lancement puis passe automatiquement au premier panorama, sans bouton supplémentaire.</p>
          <label className="toggle-row"><input type="checkbox" checked={project.introEnabled} onChange={e=>setProject(p=>({...p,introEnabled:e.target.checked}))}/> Activer l’introduction</label>
          <label>Adresse HTTPS de l'introduction
            <input type="url" value={project.introUrl} placeholder="https://intro-au-bureau-narbonne.vercel.app/" onChange={e=>setProject(p=>({...p,introUrl:e.target.value}))}/>
          </label>
          <small className="hint-inline">Exemple : intro-au-bureau-narbonne.vercel.app. Une URL différente par projet.</small>
          <label>Durée avant le premier panorama : {project.introDuration??6} secondes
            <input type="range" min="2" max="60" step="1" value={project.introDuration??6}
              onChange={e=>setProject(p=>({...p,introDuration:Number(e.target.value)}))}/>
          </label>
          <small className="hint-inline">La transition s'effectue automatiquement à la durée réglée, indépendamment de la durée de la vidéo et sans attendre de clic.</small>
          <button type="button" className="import" onClick={()=>{if(project.introUrl.startsWith('https://')){setActiveId(visibleScenes[0]?.id??'');setMode(null);setSelectedId('');setPreview(true);setIntroEnding(false);setIntroVisible(true);}else setStatus('Renseigne d’abord une URL HTTPS valide');}}>Tester l’introduction</button>
          <p className="hint">Dans le dossier HTML exporté, cette introduction sera présentée avant l’entrée dans la visite.</p>
        </div>}
        {panel==='music' && <div className="properties">
          <InspectorSection title="Boutons son de la visite">
          <p className="hint">À la fin de l’introduction, le visiteur choisit « Avec le son » ou « Sans le son ». Les mêmes boutons sont utilisés dans les liens publics, privés et les exports. Ils peuvent être personnalisés depuis ta bibliothèque d’icônes.</p>
          <div className="section-title">SON ACTIVÉ — 3 ICÔNES</div>
          {iconStateEditor('audio-on-normal','Son activé · Normal',project.soundOnIconId,
            id=>setProject(p=>({...p,soundOnIconId:id})),'🔊')}
          {iconStateEditor('audio-on-hover','Son activé · Survol',project.soundOnHoverIconId,
            id=>setProject(p=>({...p,soundOnHoverIconId:id})),'🔊')}
          {iconStateEditor('audio-on-pressed','Son activé · Clic',project.soundOnPressedIconId,
            id=>setProject(p=>({...p,soundOnPressedIconId:id})),'🔊')}
          <div className="section-title">SON COUPÉ — 3 ICÔNES</div>
          {iconStateEditor('audio-off-normal','Son coupé · Normal',project.soundOffIconId,
            id=>setProject(p=>({...p,soundOffIconId:id})),'🔇')}
          {iconStateEditor('audio-off-hover','Son coupé · Survol',project.soundOffHoverIconId,
            id=>setProject(p=>({...p,soundOffHoverIconId:id})),'🔇')}
          {iconStateEditor('audio-off-pressed','Son coupé · Clic',project.soundOffPressedIconId,
            id=>setProject(p=>({...p,soundOffPressedIconId:id})),'🔇')}
          </InspectorSection>
          <div className="section-title">BIBLIOTHÈQUE MUSICALE <span className="counter">{project.audioTracks?.length??0}</span></div>
          <p className="hint">Attribue une piste à plusieurs panoramas : elle joue en continu, en boucle, sans recommencer lors du passage d’une scène à l’autre. Choisis une autre piste là où tu souhaites changer d’ambiance.</p>
          <button type="button" className="import" onClick={()=>audioInput.current?.click()}>＋ Importer une piste MP3, WAV, OGG</button>
          {(project.audioTracks??[]).map(track=><InspectorSection title={track.name} key={track.id}>
            <div className="music-track-title"><strong>{track.name}</strong><button type="button" onClick={()=>removeTrack(track.id)} title="Supprimer cette piste"><XMark/></button></div>
            <label>Nom<input value={track.name} onChange={e=>setProject(p=>({...p,audioTracks:p.audioTracks.map(t=>t.id===track.id?{...t,name:e.target.value}:t)}))}/></label>
            <label>Volume : {track.volume} %
              <input type="range" min="0" max="100" value={track.volume} onChange={e=>setProject(p=>({...p,audioTracks:p.audioTracks.map(t=>t.id===track.id?{...t,volume:Number(e.target.value)}:t)}))}/>
            </label>
            <label className="toggle-row"><input type="checkbox" checked={track.loop} onChange={e=>setProject(p=>({...p,audioTracks:p.audioTracks.map(t=>t.id===track.id?{...t,loop:e.target.checked}:t)}))}/> Lecture en boucle</label>
            <div className="section-title">PANORAMAS À SONORISER <span className="counter">{project.scenes.filter(sc=>sc.musicTrackId===track.id).length} / {project.scenes.length}</span></div>
            <div className="nv-music-bulk">
              <button type="button" disabled={!project.scenes.length||project.scenes.every(sc=>sc.musicTrackId===track.id)} onClick={()=>assignMusicAll(track.id,true)}>✓ Tout intégrer</button>
              <button type="button" disabled={!project.scenes.some(sc=>sc.musicTrackId===track.id)} onClick={()=>assignMusicAll(track.id,false)}>✕ Tout retirer</button>
            </div>
            {project.scenes.map(sc=><label className="music-scene-check" key={sc.id}>
              <input type="checkbox" checked={sc.musicTrackId===track.id} onChange={e=>assignMusic(track.id,sc.id,e.target.checked)}/>
              <span>{sc.name}</span>
            </label>)}
          </InspectorSection>)}
          {!project.audioTracks?.length&&<p className="hint">Aucune musique importée. Commence par ajouter un fichier audio.</p>}
        </div>}
        {panel==='icons' && <div className="properties nv-icons-panel">
          <IconLibrary icons={project.icons} onImport={()=>iconInput.current?.click()}
            onDeleteSet={(ids,name)=>{if(!window.confirm('Supprimer le jeu « '+name+' » ('+ids.length+' icône'+(ids.length>1?'s':'')+') de la bibliothèque et de ses utilisations ?'))return;ids.forEach(id=>deleteIcon(id,true));}}
            applyLabel={selectedBar?'bouton « '+selectedBar.title+' »':selected?'point « '+(selected.title||'sans titre')+' »':undefined}
            onApply={selectedBar||selected?set=>{
              const patch={iconId:(set.normal??set.hover??set.pressed)?.id,hoverIconId:set.hover?.id,pressedIconId:set.pressed?.id};
              if(selectedBar){patchBar(patch);setStatus('Jeu « '+set.name+' » appliqué au bouton.');}
              else{patchPoint(patch);setStatus('Jeu « '+set.name+' » appliqué au point.');}
            }:undefined}/>
          <details className="nv-icons-advanced">
            <summary>Autres réglages : croix de fermeture, créateur d’icônes</summary>
          <InspectorSection title="Croix de fermeture des fenêtres">
          <p className="hint">Une seule icône pour fermer les photos, vidéos, informations et popups de tous les panoramas. Le changement s’applique à l’ensemble de cette visite, y compris à l’export.</p>
          <div className="nv-close-current">
            <span className="nv-close-current-preview">{closeIcon?<img src={closeIcon.dataUrl} alt="Croix choisie"/>:'✕'}</span>
            <div><strong>{closeIcon?.name??'Croix classique'}</strong><small>Actuellement appliquée partout</small></div>
          </div>
          {iconStateEditor('global-close-icon','Icône de fermeture (toutes les fenêtres)',project.closeIconId,
            id=>setProject(p=>({...p,closeIconId:id})),'✕')}
          {closeIcon&&<button type="button" className="tool" onClick={()=>requestReplaceIcon(closeIcon.id)}>Remplacer ce PNG dans toute la bibliothèque</button>}
          <p className="hint">Après avoir choisi la croix, clique sur « Enregistrer » en haut de NovaStudio. Les autres icônes de navigation ne sont pas modifiées.</p>
          </InspectorSection>
            {svgIconWorkshop()}
          </details>
        </div>}
      </aside>
    </div>
    {clientOpen&&<ClientsDirectory
      currentProjectName={project.name}
      currentProfile={project.clientProfile}
      canPlaceVideo={!!active} onPlaceVideo={placeClientVideo}
      onClose={()=>{setClientOpen(false);backFrom();}}
      onOpenCloud={()=>{setClientOpen(false);setCloudOpen(true);}}
      currentStyle={project.barStyle}
      onUpdateCurrent={(profile,style)=>setProject(p=>({...p,...(profile?{clientProfile:profile}:{}),...(style?{barStyle:{...p.barStyle,...style}}:{})}))}
      onSaveDiscovered={(clientProfile,style)=>{
        setProject(p=>({...p,clientProfile,...(style?{barStyle:{...p.barStyle,...style}}:{})}));
        setPanel('client');pendingClientSaveRef.current=true;
        setStatus('Client « '+clientProfile.name+' » enregistré dans la visite…');
      }}
      onCreateVisit={(clientProfile,style)=>{
        if((project.scenes.length||projectRef.current!==savedRef.current)&&!window.confirm('Créer une nouvelle visite pour « '+clientProfile.name+' » ? Pense à enregistrer ou exporter le projet actuel avant.'))return;
        setActiveSpaceId(null);setSpaceManagerOpen(false);
        const fresh={...newProject(),name:clientProfile.name||'Nouvelle visite',clientProfile,barStyle:{...defaultBarStyle(),...(style??{})}};
        setProject(fresh);setActiveId('');setSelectedId('');setMode(null);setPreview(false);setPreparationOpen(true);
        cloud.unlink();setStatus('Nouvelle visite créée pour « '+clientProfile.name+' » : ajoute maintenant tes panoramas.');
      }}
      onAssociate={clientProfile=>{
        setProject(p=>({...p,clientProfile}));
        setPanel('client');
        setStatus('Client « '+clientProfile.name+' » associé à la visite · Clique sur Enregistrer pour conserver ce lien.');
      }}
    />}
    <footer className="nv-app-footer"><span>NovaVisio Studio · Éditeur professionnel</span><span>{project.scenes.length} panoramas · {totalPoints} points</span><span className="nv-footer-build">Build {new Date(__NV_BUILD_TIME__).toLocaleString('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})} · Projets Cloud Supabase <button type="button" className="nv-footer-refresh" onClick={reloadToLatestVersion} disabled={savingManually} title="Recharger NovaStudio pour obtenir la dernière version">↻ Actualiser</button></span></footer>
    {/^(Enregistré dans le Cloud|Échec|Sauvegardé|Publication|Cloud déconnecté)/.test(status)&&<div className="nv-workflow-status" role="status"><span>{status}</span><button type="button" aria-label="Masquer le message" onClick={()=>setStatus('Prêt')}><XMark/></button></div>}
    {informationEdit&&(()=>{const point=project.scenes.find(scene=>scene.id===informationEdit.sceneId)?.hotspots.find(h=>h.id===informationEdit.pointId);return point?<InformationEditor point={point} onClose={()=>setInformationEdit(null)} onSave={patch=>setProject(p=>({...p,scenes:p.scenes.map(scene=>scene.id===informationEdit.sceneId?{...scene,hotspots:scene.hotspots.map(h=>h.id===informationEdit.pointId?{...h,...patch}:h)}:scene)}))}/>:null;})()}
    {publishConfirm&&<div className="nv-publish-overlay"><section role="alertdialog" aria-modal="true" aria-label="Publier sur NovaVisio" className="nv-publish-warning"><h2>⚠ Attention : publication sur NovaVisio</h2><p>La mise à jour va s’appliquer sur NovaVisio. Le projet et les espaces déjà publiés seront actualisés pour les visiteurs. Les liens publics restent identiques.</p><p>Enregistrer seul ne publie plus les modifications.</p>
      {publishIssues.length===0?<p className="nv-publish-ok">✓ Contrôle automatique : rien d’anormal détecté.</p>:<>
        <p><b>Contrôle automatique : {publishIssues.length} point{publishIssues.length>1?'s':''} à vérifier</b></p>
        <ul className="nv-publish-check">{publishIssues.slice(0,40).map((is,i)=><li key={i} className={'is-'+is.level}><span>{is.level==='error'?'⛔':'⚠️'}</span><span>{is.text}</span>
          {is.sceneId&&<button type="button" onClick={()=>goToIssue(is)}>Corriger</button>}</li>)}</ul></>}
      <div><button type="button" onClick={()=>setPublishConfirm(false)}>Annuler</button><button type="button" onClick={()=>{setPublishConfirm(false);void manualSave(true)}}>{publishIssues.some(i=>i.level==='error')?'Publier quand même':'Confirmer la publication'}</button></div></section></div>}
    {preparationOpen&&<ProjectPreparation project={project} setProject={setProject} onImportPanoramas={addImages}
      onClose={()=>setPreparationOpen(false)} onFinish={()=>{setProject(p=>({...p,preparationComplete:true}));setPreparationOpen(false);setStatus('Projet préparé · Enregistre pour conserver tes réglages');}}/>}
    {skinsOpen&&<SkinLibrary project={project} setProject={setProject} onClose={()=>setSkinsOpen(false)}/>}
    <input ref={placedMediaInput} hidden type="file" aria-label="Importer le média placé" onChange={e=>{
      const file=e.currentTarget.files?.[0],placement=pendingMediaPlacement.current;
      if(!file){e.currentTarget.dispatchEvent(new Event('cancel'));return;}
      pendingMediaPlacement.current=null;e.currentTarget.value='';if(!placement)return;
      if(placement.type==='image')void addFrameImage(file,placement);else void addVideo(file,placement);
    }}/>
    <input ref={upload} hidden type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>void addImages(e.target.files)}/>
    <input ref={stateIconInput} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>void importStateIcon(e.target.files?.[0])}/>
    <input ref={projectInput} hidden type="file" accept=".json,.nvstudio.json,application/json" onChange={e=>void openProject(e.target.files?.[0])}/>
    <input ref={iconInput} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={e=>void addIconFiles(e.target.files)}/>
    <input ref={svgLogoInput} hidden type="file" accept="image/png,image/jpeg,image/webp"
      onChange={e=>{const file=e.target.files?.[0];void applyColorsFromLogoFile(file);e.target.value='';}}/>
    <input ref={replaceIconInput} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>void replaceIconEverywhere(e.target.files?.[0])}/>
    <input ref={videoInput} hidden type="file" accept="video/mp4,video/webm" onChange={e=>void addVideo(e.target.files?.[0])}/>
    <input ref={nightInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void importNightPanorama(e.target.files?.[0])}/>
    <input ref={audioInput} hidden type="file" accept="audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/x-wav,audio/webm,audio/mp4" onChange={e=>void addAudio(e.target.files?.[0])}/>
    {privateOpen&&<PrivatePanel project={projectForSpaceExport({...project,clientProfile:undefined,comments:undefined},currentSpace)} space={currentSpace} onClose={()=>{setPrivateOpen(false);backFrom();}} onStatus={setStatus} syncNow={cloud.syncNow} syncState={cloud.state}/>}
    {shareOpen&&<SharePanel project={projectForSpaceExport(project,currentSpace,true)} space={currentSpace} onClose={()=>{setShareOpen(false);backFrom();}} onStatus={setStatus}/>}
    {cloudOpen&&<CloudPanel project={project} onClose={()=>setCloudOpen(false)} hasUnsavedChanges={projectRef.current!==savedRef.current} onStatus={setStatus}
      autoEnabled={cloud.enabled} onAutoChange={cloud.setEnabled} manualMode autoLabel={cloud.state.kind==='saved'?'Dernier envoi à '+new Date(cloud.state.at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):cloudLabel(cloud.state)}
      onOpen={(p:StudioProject,link:CloudLink,spaceId?:string)=>{const up=ensureFrameReferences(p,viewAreaRef.current?.clientHeight||550);resetProject(up);setPreparationOpen(false);const openSpace=spaceId?(up.spaces??[]).find(sp=>sp.id===spaceId):undefined;setActiveSpaceId(openSpace?.id??null);setActiveId(openSpace?(scenesInSpace(up,openSpace)[0]?.id??''):(up.scenes[0]?.id??''));setSelectedId('');setMode(null);setPreview(false);savedRef.current=up;cloud.markSynced(up,link);}}/>}
    {help&&<div className="overlay" onClick={()=>setHelp(false)}><div className="modal" onClick={e=>e.stopPropagation()}>
      <button className="close" onClick={()=>setHelp(false)}><XMark/></button><h2>Guide NovaVisio Studio</h2>
      <p><b>1.</b> Importe des panoramas 360° au format équirectangulaire.</p>
      <p><b>2.</b> Choisis « Navigation » ou « Information », puis clique sur l’image pour placer le point.</p>
      <p><b>3.</b> Dans « Barre du bas », ajoute des boutons et choisis leur action. Dans « Mes icônes », importe tes PNG, WebP ou GIF.</p><p><b>4.</b> Paramètre les points et boutons dans la colonne de droite, puis teste en mode « Prévisualiser ».</p>
      <p><b>5.</b> Tes modifications sont sauvegardées dans ce navigateur. Exporte ton projet pour conserver une copie.</p>
      <p className="warning">Prototype : l’export HTML autonome n’est pas encore disponible. N’efface pas les données du navigateur sans exporter ton projet.</p>
      <button className="primary" onClick={()=>setHelp(false)}>Compris</button>
    </div></div>}
  </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
