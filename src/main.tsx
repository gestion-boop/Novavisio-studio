import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {flushSync} from 'react-dom';
import {createRoot} from 'react-dom/client';
import {CornerEditor,imageMarkerHtml,responsiveFrameSize} from './imageFrame';
import {exportStaticTour} from './exportTour';
import {scenesInSpace,projectForSpaceExport,safeSpaceName,type StudioSpace} from './spaces';
import {IconStateVisual,iconStateHtml,videoMarkerHtml,VideoPopup,ZoomImage,type ZoomOrigin} from './media';
import {ContinuousMusic} from './continuousMusic';
import {PANORAMA_MIN_FOV,PANORAMA_MAX_FOV,panoramaArrivalZoom} from './panoramaLens';
import {CloudPanel} from './CloudPanel';
import {useCloudSync,type SyncState} from './cloudSync';
import {confirmEmailLink,type CloudLink} from './cloud';
import {SharePanel} from './SharePanel';
import {PrivatePanel} from './PrivatePanel';
import {PanoramaGallery,galleryEntries} from './gallery';
import {useSceneThumbs} from './thumbs';
import {Utensils,Images,LayoutGrid,Phone,Info,Home,CalendarDays,MapPin,Globe,ArrowRight,Menu,Star,Eye,Edit3,Trash2,Plus,ChevronLeft,ChevronRight,Sparkles,Download,Cloud,Link2,Lock,Maximize2,Minimize2,ChevronDown,Search,PanelLeftClose,PanelRightClose,Save} from 'lucide-react';
import {Viewer} from '@photo-sphere-viewer/core';
import {MarkersPlugin,type MarkerConfig} from '@photo-sphere-viewer/markers-plugin';
import {syncMarkers,resetMarkers,crossfadeMarkers} from './markerSync';
import {startPosterBounce} from './posterBounce';
import {frameWorldCorners,editingFrameControls,cornerMarkerId,centerMarkerId,FRAME_KEYS,type SphericalPoint} from './sphericalFrame';
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';
import {loadProject,newProject,readImage,readPanorama,saveProject,projectJsonParts,readProjectFile,SaveConflictError,barIconSize,uid,validateProject,defaultBar,isSafeIconDataUrl,type Hotspot,type CustomIcon,type BottomBarItem,type Scene,type StudioProject,type BarStyle,type GalleryItem,defaultBarStyle,defaultFrameCorners,isSafeFrameImage,isSafeVideoData,isSafeAudioData,isSafeMediaUrl,type FrameSphericalCorners} from './storage';
import './style.css';
import './media.css';

type EditMode = Hotspot['type'] | null;
type PanelTab = 'points' | 'bar' | 'icons' | 'intro' | 'elements' | 'music';
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
  scene: Scene; icons: CustomIcon[]; mode: EditMode; preview: boolean;
  onCreate: (yaw:number,pitch:number)=>void;
  onPick: (id:string)=>void;
  onNavigate: (id:string,via?:Hotspot)=>void;
  arrival?:{sceneId:string;yaw:number;pitch:number;zoom:number}|null; // vue d'arrivée propre à la flèche utilisée
  onInfo: (hotspot:Hotspot)=>void;
  onLink: (title:string,url:string)=>void;
  onImage: (h:Hotspot,from?:ZoomOrigin|null)=>void;
  onVideo: (h:Hotspot,from?:ZoomOrigin|null)=>void;
  selectedId:string;
  onWorldFrameChange:(id:string,corners:FrameSphericalCorners,center?:SphericalPoint)=>void;
  onMarkerMove:(id:string,yaw:number,pitch:number)=>void;
  onAssetDrop:(iconId:string,yaw:number,pitch:number)=>void;
  onCameraChange:(yaw:number,pitch:number,zoom:number)=>void;
};
function markerFor(h:Hotspot,icons:CustomIcon[],viewerHeight:number,selectedId:string,preview:boolean,zoom=60):MarkerConfig {
  // Image and video layers are rendered ON the sphere, not as HTML billboards.
  // Every pixel stays anchored to its four world-coordinate corners at any zoom or yaw.
  if(h.type==='image'&&h.imageDataUrl){
    return {id:h.id,imageLayer:h.imageDataUrl,position:frameWorldCorners(h),hoverScale:false};
  }
  const videoSource=h.videoDataUrl||h.videoUrl;
  if(h.type==='video'&&videoSource){
    return {id:h.id,videoLayer:videoSource,position:frameWorldCorners(h),
      autoplay:h.videoAutoplay!==false,hoverScale:false};
  }
  const isMedia=h.type==='image'||h.type==='video';
  const sz=Math.max(16,Math.min(80,h.iconSize??28));
  const scaled=isMedia?responsiveFrameSize(h,viewerHeight,zoom):null;
  const width=scaled?.width??sz;
  const height=scaled?.height??sz;
  const symbol=h.type==='navigation'?'➜':h.type==='lien'?'↗':'i';
  const iconHtml=iconStateHtml(icons,h.iconId,h.hoverIconId,h.pressedIconId);
  const content=h.type==='image'?imageMarkerHtml(undefined,h.frameCorners??defaultFrameCorners(),width,height,h.title):
    h.type==='video'?videoMarkerHtml(h,width,height):
    iconHtml||'<span class="nv-marker" style="width:100%;height:100%" aria-label="Point interactif">'+symbol+'</span>';
  const editing=!preview&&selectedId===h.id;
  return {id:h.id,position:{yaw:h.yaw,pitch:h.pitch},
    html:editing?'<span class="nv-drag-target" data-nv-marker-id="'+h.id+'">'+content+
      '<button type="button" class="nv-marker-move-grip" aria-label="Déplacer ce point" title="Glisser pour déplacer ce point">✥</button></span>':content,
    size:{width,height},anchor:'center center',tooltip:h.title};
}
function markersForScene(scene:Scene,icons:CustomIcon[],height:number,selectedId:string,preview:boolean,zoom=60):MarkerConfig[]{
  const all:MarkerConfig[]=[];
  for(const h of scene.hotspots){
    all.push(markerFor(h,icons,height,selectedId,preview,zoom));
    const hasMedia=h.type==='image'?!!h.imageDataUrl:
      h.type==='video'?!!(h.videoDataUrl||h.videoUrl):false;
    if(!preview&&selectedId===h.id&&hasMedia){
      all.push(...editingFrameControls(h));
    }
  }
  return all;
}
/** Lightweight, read-only spherical preview for a hovered gallery entry.
 * Only one instance exists, and it never changes the editor's active scene.
 */
function FullscreenGalleryHoverPreview({scene,thumb}:{scene:Scene;thumb?:string}){
  const host=useRef<HTMLDivElement>(null);
  const [ready,setReady]=useState(false);
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
      instance.addEventListener('ready',()=>{if(alive)setReady(true);});
    }catch{/* A thumbnail fallback stays visible if WebGL cannot load. */}
    return ()=>{alive=false;instance?.destroy();};
  },[scene.id,scene.dataUrl,scene.arrivalYaw,scene.arrivalPitch,scene.arrivalZoom,scene.arrivalZoomModel]);
  return <div className="nv-hover-preview-media">
    {thumb&&<img className={'nv-hover-preview-thumb'+(ready?' is-loaded':'')} src={thumb} alt="" draggable={false}/>}
    <div ref={host} className="nv-hover-preview-viewer" aria-label={'Vue 360° de '+scene.name}/>
    {!ready&&<span className="nv-hover-preview-loading">Aperçu 360°</span>}
  </div>;
}

function Panorama({scene,icons,mode,preview,arrival,onCreate,onPick,onNavigate,onInfo,onLink,onImage,onVideo,selectedId,onWorldFrameChange,onMarkerMove,onAssetDrop,onCameraChange}:PanoramaProps) {
  const box = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer|null>(null);
  const loadedSceneRef=useRef<string|null>(null);
  const lastPointer=useRef<ZoomOrigin|null>(null); // dernier clic dans le panorama : point de départ du zoom photo/vidéo
  const actions = useRef({scene,icons,mode,preview,arrival,onCreate,onPick,onNavigate,onInfo,onLink,onImage,onVideo,selectedId,onWorldFrameChange,onMarkerMove,onAssetDrop,onCameraChange});
  actions.current = {scene,icons,mode,preview,arrival,onCreate,onPick,onNavigate,onInfo,onLink,onImage,onVideo,selectedId,onWorldFrameChange,onMarkerMove,onAssetDrop,onCameraChange};

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
      container:box.current, panorama:scene.dataUrl,
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
        syncMarkers(viewer,markersForScene(a.scene,a.icons,box.current!.clientHeight||550,a.selectedId,a.preview,viewer.getZoomLevel()));
      });
    };
    viewer.addEventListener('zoom-updated',onZoom);
    const markers = viewer.getPlugin(MarkersPlugin) as MarkersPlugin;
    markers.addEventListener('select-marker',({marker})=>{
      const a=actions.current;
      const h=a.scene.hotspots.find(item=>item.id===marker.id);
      if (!h) return;
      if (a.preview) {
        if(h.type==='navigation' && h.target) a.onNavigate(h.target,h);
        else if(h.type==='information') {
          if (h.url && safeLink(h.url)) a.onLink(h.title,h.url);
          else a.onInfo(h);
        }
        else if(h.type==='lien' && h.url) a.onLink(h.title,h.url);
        else if(h.type==='image') a.onImage(h,lastPointer.current);
        else if(h.type==='video' && h.videoOpenFullscreen!==false) a.onVideo(h,lastPointer.current);
      } else if (h.type==='navigation' && h.target && !a.mode) {
        // En édition, une flèche déjà configurée est directement navigable.
        // Les autres points restent sélectionnables pour être modifiés.
        a.onNavigate(h.target,h);
      } else {
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
    resetMarkers(viewer,markersForScene(scene,icons,height,selectedId,preview,viewer.getZoomLevel()));
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
    const markersNow=()=>markersForScene(next,actions.current.icons,box.current?.clientHeight||550,actions.current.selectedId,actions.current.preview,viewer.getZoomLevel());
    const onLoaded=()=>{viewer.removeEventListener('panorama-loaded',onLoaded);fade=crossfadeMarkers(viewer,markersNow(),260);};
    viewer.addEventListener('panorama-loaded',onLoaded);
    void viewer.setPanorama(next.dataUrl,{
      showLoader:false,transition:{effect:'fade',rotation:false,speed:260},
      // La flèche utilisée a sa propre vue d'arrivée ; sinon, celle par défaut du panorama.
      position:{yaw:arrivalFor?.yaw??next.arrivalYaw??0,pitch:arrivalFor?.pitch??next.arrivalPitch??0},
      zoom:arrivalFor?.zoom??panoramaArrivalZoom(next)
    }).then(async success=>{
      if(disposed||!success)return;
      if(fade)await fade;else resetMarkers(viewer,markersNow());
      if(disposed)return;
      loadedSceneRef.current=next.id;
      syncMarkers(viewer,markersNow()); // met à jour d'éventuelles modifications survenues pendant la transition
    }).catch(()=>{/* Keep the previous panorama if the image fails to load. */});
    return ()=>{disposed=true;viewer.removeEventListener('panorama-loaded',onLoaded);};
  },[scene.id,scene.dataUrl]);
  useEffect(()=>{
    const refresh=()=>{
      const element=box.current;
      const v=viewerRef.current;
      if(!element||!v)return;
      const a=actions.current;
      if(loadedSceneRef.current!==a.scene.id)return;
      const height=element.clientHeight||550;
      syncMarkers(v,markersForScene(a.scene,a.icons,height,a.selectedId,a.preview,v.getZoomLevel()));
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
    syncMarkers(v,markersForScene(scene,icons,element.clientHeight||550,selectedId,preview,v.getZoomLevel()));
  },[scene.id,scene.hotspots,icons,selectedId,preview]);
  useEffect(()=>{
    const root=box.current;
    if(!root)return;
    const down=(event:PointerEvent)=>{
      const target=event.target;
      if(!(target instanceof HTMLElement))return;
      const button=target.closest<HTMLButtonElement>('.nv-sphere-handle,.nv-sphere-center');
      const a=actions.current;
      if(!button||a.preview||!a.selectedId||a.mode)return;
      const id=button.dataset.frameId;
      if(id!==a.selectedId)return;
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
      // Only the small grab handle can move a marker. Normal dragging over
      // the icon or panorama always goes to Photo Sphere Viewer for rotation.
      const grip=t.closest<HTMLElement>('.nv-marker-move-grip');
      if(!grip)return;
      const item=grip.closest<HTMLElement>('.nv-drag-target');
      const a=actions.current;
      if(!item||a.preview||a.mode||item.dataset.nvMarkerId!==a.selectedId)return;
      const viewer=viewerRef.current,id=item.dataset.nvMarkerId;
      if(!viewer||!id)return;
      e.preventDefault();e.stopImmediatePropagation();
      let final:{yaw:number;pitch:number}|null=null;
      const move=(p:PointerEvent)=>{
        if(p.pointerId!==e.pointerId)return;
        p.preventDefault();p.stopImmediatePropagation();
        const rect=root.getBoundingClientRect();
        const at=viewer.dataHelper.viewerCoordsToSphericalCoords({x:p.clientX-rect.left,y:p.clientY-rect.top});
        if(!at)return;
        final=at;
        try{(viewer.getPlugin(MarkersPlugin) as MarkersPlugin).updateMarker({id,position:at});}catch{}
      };
      const clear=()=>{document.removeEventListener('pointermove',move,true);document.removeEventListener('pointerup',up,true);document.removeEventListener('pointercancel',cancel,true);};
      const up=(p:PointerEvent)=>{if(p.pointerId!==e.pointerId)return;move(p);clear();if(final)actions.current.onMarkerMove(id,final.yaw,final.pitch);};
      const cancel=(p:PointerEvent)=>{if(p.pointerId===e.pointerId)clear();};
      document.addEventListener('pointermove',move,true);document.addEventListener('pointerup',up,true);document.addEventListener('pointercancel',cancel,true);
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
    const raw=window.localStorage.getItem('nvstudio-ui-layout-v1');
    if(raw){const value=JSON.parse(raw) as Record<string,unknown>;return {
      leftHidden:value.leftHidden===true,rightHidden:value.rightHidden===true,
      density:value.density==='compact'?'compact' as const:'comfortable' as const
    };}
  }catch{/* Private browsing or storage disabled. */}
  return {leftHidden:false,rightHidden:false,density:'comfortable' as const};
}
function App(){
  const studioRef=useRef<HTMLDivElement>(null);
  const topMenusRef=useRef<HTMLDivElement>(null);
  const [openTopMenu,setOpenTopMenu]=useState<HeaderMenu>(null);
  const [studioFullscreen,setStudioFullscreen]=useState(false);
  const [studioFallback,setStudioFallback]=useState(false);
  const [leftHidden,setLeftHidden]=useState(()=>readStudioLayout().leftHidden);
  const [rightHidden,setRightHidden]=useState(()=>readStudioLayout().rightHidden);
  const [sceneDensity,setSceneDensity]=useState<'compact'|'comfortable'>(()=>readStudioLayout().density);
  const [sceneSearch,setSceneSearch]=useState('');
  const [sceneFilter,setSceneFilter]=useState<SceneFilter>('all');
  useEffect(()=>{
    try{window.localStorage.setItem('nvstudio-ui-layout-v1',JSON.stringify({leftHidden,rightHidden,density:sceneDensity}));}
    catch{/* Viewing and editing still work if local preferences cannot be saved. */}
  },[leftHidden,rightHidden,sceneDensity]);
  useEffect(()=>{
    const outside=(event:PointerEvent)=>{
      if(!topMenusRef.current?.contains(event.target as Node))setOpenTopMenu(null);
    };
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){
        setOpenTopMenu(null);
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
  const [project,setProject]=useState<StudioProject>(newProject());
  const [ready,setReady]=useState(false);
  const [savingManually,setSavingManually]=useState(false);
  const [activeId,setActiveId]=useState('');
  const [activeSpaceId,setActiveSpaceId]=useState<string|null>(null);
  const [spaceManagerOpen,setSpaceManagerOpen]=useState(false);
  const [editingSpaceId,setEditingSpaceId]=useState<string|null>(null);
  const [editingSpaceName,setEditingSpaceName]=useState('');
  const cancelSpaceEditRef=useRef(false);
  const [selectedId,setSelectedId]=useState('');
  const [selectedBarId,setSelectedBarId]=useState('');
  const [panel,setPanel]=useState<PanelTab>('points');
  const [mode,setMode]=useState<EditMode>(null);
  const [preview,setPreview]=useState(false);
  const [status,setStatus]=useState('Initialisation…');
  const [help,setHelp]=useState(false);
  const [info,setInfo]=useState<Hotspot|null>(null);
  const [frame,setFrame]=useState<EmbedFrame|null>(null);
  const [imageZoom,setImageZoom]=useState<Hotspot|null>(null);
  const [zoomFrom,setZoomFrom]=useState<ZoomOrigin|null>(null);
  const [videoZoom,setVideoZoom]=useState<Hotspot|null>(null);
  const [introVisible,setIntroVisible]=useState(false);
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
  const [privateOpen,setPrivateOpen]=useState(false);
  const [photoFeedback,setPhotoFeedback]=useState('');
  const videoInput=useRef<HTMLInputElement>(null);
  const audioInput=useRef<HTMLInputElement>(null);
  const upload=useRef<HTMLInputElement>(null);
  const projectInput=useRef<HTMLInputElement>(null);
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
  useEffect(()=>{if(!fullscreenGalleryOpen)setHoveredGallerySceneId(null);},[fullscreenGalleryOpen]);
  const [fullscreenToolsOpen,setFullscreenToolsOpen]=useState(false);
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
  lockRef.current=lock;
  function adopt(p:StudioProject,stamp:string|null){
    setActiveSpaceId(null);setSpaceManagerOpen(false);
    const upgraded=ensureFrameReferences(validateProject(p),viewAreaRef.current?.clientHeight||550);
    savedRef.current=upgraded;baseRef.current=stamp;
    setProject(upgraded);setActiveId(upgraded.scenes[0]?.id ?? '');setSelectedId('');setMode(null);
  }
  useEffect(()=>{
    loadProject().then(p=>{
      if (p) {
        rawStoredRef.current=p;
        try{adopt(p,p.updatedAt??null);rawStoredRef.current=null;}
        catch(e){
          // Projet enregistré illisible : on ne touche à RIEN (aucun enregistrement automatique) pour ne pas l'écraser.
          setLock({kind:'unreadable',reason:e instanceof Error?e.message:String(e)});
          setReady(true);setStatus('Projet illisible — enregistrement suspendu');return;
        }
      }
      setReady(true);setStatus('Prêt');
    }).catch(e=>{
      setLock({kind:'unreadable',reason:'Stockage du navigateur indisponible ('+(e instanceof Error?e.message:String(e))+')'});
      setReady(true);setStatus('Stockage indisponible — enregistrement suspendu');
    });
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
      if((ready&&projectRef.current!==savedRef.current)||savingRef.current){
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
    setProject(up);
    setActiveId(id=>up.scenes.some(sc=>sc.id===id)?id:up.scenes[0]?.id??'');
    setStatus('Projet cloud ouvert : '+(by??'version distante'));
    return up;
  },true);
  async function manualSave(){
    if(!ready||savingManually||savingRef.current)return;
    if(lock?.kind==='unreadable'||lock?.kind==='conflict'){
      setStatus('Enregistrement bloqué : vérifie le conflit ou récupère le projet');
      return;
    }
    const snapshot=projectRef.current;
    setSavingManually(true);
    try{
      const locallySaved=await persist(snapshot);
      if(!locallySaved)return;
      if(cloud.signedIn){
        setStatus('Sauvegarde dans Supabase…');
        const synced=await cloud.syncNow(snapshot);
        setStatus(synced?'Enregistré sur cet appareil et dans Supabase':
          'Enregistré sur cet appareil · Cloud non synchronisé');
      }else{
        setStatus('Enregistré sur cet appareil · Cloud non connecté');
      }
    }finally{setSavingManually(false);}
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
    if(!creationFullscreen){setFullscreenGalleryOpen(false);setFullscreenToolsOpen(false);}
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
    const close=()=>{setIntroVisible(false);setActiveId(project.scenes[0]?.id??'');};
    const timeout=window.setTimeout(close,(project.introDuration??6)*1000);
    const finished=(event:MessageEvent)=>{
      try{
        if(event.origin!==new URL(project.introUrl).origin)return;
        const type=typeof event.data==='string'?event.data:event.data?.type;
        if(['intro:done','intro-finished','novavisio:intro-finished'].includes(type))close();
      }catch{}
    };
    window.addEventListener('message',finished);
    return ()=>{window.clearTimeout(timeout);window.removeEventListener('message',finished);};
  },[introVisible,project.introEnabled,project.introUrl,project.introDuration,project.scenes]);
  const totalPoints=project.scenes.reduce((n,s)=>n+s.hotspots.length,0);
  const selectedBar=project.bottomBar.find(b=>b.id===selectedBarId) ?? null;
  const barCss = {
    '--nv-bar-bg':project.barStyle.background,
    '--nv-bar-outline':project.barStyle.outline,
    '--nv-button-bg':project.barStyle.button,
    '--nv-button-outline':project.barStyle.buttonOutline,
    '--nv-icon-color':project.barStyle.icon,
    '--nv-bar-border-width':project.barStyle.outlineWidth+'px',
    '--nv-button-border-width':project.barStyle.buttonOutlineWidth+'px',
    '--nv-bar-roundness':project.barStyle.roundness+'px'
  } as CSSProperties;
  function changeBarStyle(update:Partial<BarStyle>) {
    setProject(p=>({...p,barStyle:{...p.barStyle,...update}}));
  }
  function openLinkInTour(title:string,raw:string) {
    const link=safeLink(raw);
    if (!link) {setStatus('Lien invalide : utilise https://, tel: ou mailto:');return;}
    setInfo(null);
    if (/^https?:\/\//i.test(link)) setFrame({title,url:link});
    else launchLink(link);
  }
  async function exportTour(){
    if(!visibleScenes.length){setStatus('Cet espace ne contient aucun panorama à exporter');return;}
    setExporting(true);
    setStatus('Préparation du dossier HTML…');
    try {
      await exportStaticTour(projectForSpaceExport(project,currentSpace));
      setStatus(currentSpace?'Espace « '+currentSpace.name+' » exporté en ZIP':'Dossier HTML prêt — archive ZIP téléchargée');
    }catch(err){setStatus('Échec de l’export : '+(err instanceof Error?err.message:String(err)));}
    finally{setExporting(false);}
  }
  async function addVideo(file?:File){
    if(!file||!selectedId)return;
    if(!['video/mp4','video/webm'].includes(file.type)||file.size>22*1024*1024){
      setStatus('Vidéo : MP4/WebM, 22 Mo maximum pour ce prototype');return;
    }
    try{
      const data=await readImage(file);
      if(!isSafeVideoData(data))throw Error('Fichier vidéo incompatible');
      patchPoint({videoDataUrl:data,videoUrl:''});
      setStatus('Vidéo ajoutée à l’écran');
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
  function removeTrack(trackId:string){
    if(!window.confirm('Supprimer cette musique et ses affectations aux panoramas ?'))return;
    setProject(p=>({...p,
      audioTracks:p.audioTracks.filter(track=>track.id!==trackId),
      scenes:p.scenes.map(sc=>sc.musicTrackId===trackId?{...sc,musicTrackId:undefined}:sc)
    }));
  }
  async function addFrameImage(file?:File){
    if(!file)return;
    const sceneId=activeId,hotspotId=selectedId;
    if(!sceneId||!hotspotId){setPhotoFeedback('Sélectionne un cadre photo avant d’importer une image.');return;}
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
        ...sc,hotspots:sc.hotspots.map(h=>h.id===hotspotId?{...h,imageDataUrl:data}:h)
      })}));
      setPhotoFeedback('Photo intégrée dans le cadre.');
      setStatus('Photo ajoutée au panorama');
    }catch(e){
      const message=e instanceof Error?e.message:'Impossible de lire cette photo.';
      setPhotoFeedback(message);
      setStatus('Import photo : '+message);
    }
  }
  function selectScene(id:string){
    if(currentSpace&&!visibleIds.has(id)){setStatus('Ce panorama n’appartient pas à l’espace sélectionné');return;}
    // Navigation directe : toujours revenir à la vue d'arrivée par défaut du panorama.
    // Une arrivée personnalisée PAR FLÈCHE ne s'applique qu'au clic sur cette flèche.
    setArrivedVia(null);nextArrivalRef.current=null;setActiveId(id);
    setSelectedId('');setMode(null);
  }
  function chooseFullscreenScene(id:string){
    if(!visibleIds.has(id))return;
    selectScene(id);
    setFullscreenGalleryOpen(false);
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
  function saveArrivalView(){
    if(!active)return;
    const view=cameraRef.current;
    if(view.sceneId!==active.id){setStatus('Oriente d’abord le panorama puis réessaie');return;}
    patchScene(sc=>({...sc,arrivalYaw:view.yaw,arrivalPitch:view.pitch,arrivalZoom:view.zoom,arrivalZoomModel:'wide'}));
    setStatus('Vue d’arrivée sauvegardée pour '+active.name);
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
  // Éditeur de la galerie de panoramas d'un bouton de la barre.
  function galleryPanel(item:BottomBarItem){
    const list=galleryEntries(item,project.scenes);
    const used=new Set(list.map(e=>e.sceneId));
    const others=project.scenes.filter(sc=>!used.has(sc.id));
    const raw:GalleryItem[]=list.map(e=>({sceneId:e.sceneId,label:e.custom}));
    const save=(next:GalleryItem[])=>patchBar({gallery:next});
    const move=(i:number,d:number)=>{const next=[...raw];const j=i+d;if(j<0||j>=next.length)return;[next[i],next[j]]=[next[j],next[i]];save(next);};
    const thumb=(id:string)=><span className="gallery-thumb">{sceneThumbs[id]?<img src={sceneThumbs[id]} alt="" draggable={false}/>:null}</span>;
    return <div className="gallery-editor">
      <label>Titre de la galerie<input value={item.galleryTitle??''} placeholder={item.title||'Panoramas'} onChange={e=>patchBar({galleryTitle:e.target.value})}/></label>
      <small className="hint-inline">Dans la visite, ce bouton ouvre une galerie : un clic sur une vignette emmène directement au panorama (raccourci). Les noms ci-dessous sont ceux affichés dans la galerie ; laisse vide pour garder le nom du panorama.</small>
      <div className="section-title">PANORAMAS DANS LA GALERIE <span className="counter">{list.length}</span></div>
      {!list.length&&<small className="hint-inline">Aucun panorama sélectionné : ajoute-en ci-dessous.</small>}
      <ul className="gallery-rows">{list.map((e,i)=><li key={e.sceneId}>
        {thumb(e.sceneId)}
        <input value={e.custom} placeholder={e.sceneName} aria-label={'Nom affiché dans la galerie pour '+e.sceneName} onChange={ev=>save(raw.map((r,k)=>k===i?{...r,label:ev.target.value}:r))}/>
        <button type="button" title="Monter" aria-label="Monter" disabled={i===0} onClick={()=>move(i,-1)}>↑</button>
        <button type="button" title="Descendre" aria-label="Descendre" disabled={i===list.length-1} onClick={()=>move(i,1)}>↓</button>
        <button type="button" title="Retirer de la galerie" aria-label="Retirer de la galerie" className="is-remove" onClick={()=>save(raw.filter((_,k)=>k!==i))}>✕</button>
      </li>)}</ul>
      {others.length>0&&<>
        <div className="section-title">AUTRES PANORAMAS</div>
        <ul className="gallery-rows is-others">{others.map(sc=><li key={sc.id}>
          {thumb(sc.id)}<span className="gallery-name">{sc.name}</span>
          <button type="button" className="gallery-add" onClick={()=>save([...raw,{sceneId:sc.id,label:''}])}>＋ Ajouter</button>
        </li>)}</ul>
      </>}
      <div className="gallery-bulk">
        {others.length>0&&<button type="button" onClick={()=>save([...raw,...others.map(sc=>({sceneId:sc.id,label:''}))])}>Tout ajouter</button>}
        {list.length>0&&<button type="button" onClick={()=>save([])}>Tout retirer</button>}
      </div>
    </div>;
  }
  function triggerBar(item:BottomBarItem){
    if(!preview){
      setSelectedBarId(item.id);setPanel('bar');setSelectedId('');
      if(creationFullscreen){setFullscreenToolsTab('bar');setFullscreenToolsOpen(true);setFullscreenGalleryOpen(false);}
      return;
    }
    if(item.type==='gallery'){setGalleryOpen(item.id);return;}
    if(item.type==='navigation'){
      const dest=item.target && visibleIds.has(item.target)?item.target:visibleScenes[0]?.id;
      if(dest)selectScene(dest);
    }else if(item.type==='information') {
      if (item.url && safeLink(item.url)) openLinkInTour(item.title,item.url);
      else {setFrame(null);setInfo({id:item.id,type:'information',title:item.title,text:item.text,target:'',yaw:0,pitch:0});}
    }
    else if(item.url)openLinkInTour(item.title,item.url);
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
  function deleteIcon(id:string){
    if(!window.confirm('Supprimer cette icône de la bibliothèque et de ses utilisations ?'))return;
    setProject(p=>({...p,
      icons:p.icons.filter(i=>i.id!==id),
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
    project.bottomBar.forEach(b=>add('Barre : '+b.title,barIconSize(b),b.iconId,b.hoverIconId,b.pressedIconId));
    project.scenes.forEach(sc=>sc.hotspots.forEach(h=>{
      if(h.type!=='image'&&h.type!=='video')add(sc.name+' : '+h.title,h.iconSize??28,h.iconId,h.hoverIconId,h.pressedIconId);
    }));
    return [...map.values()];
  }
  // Jeux visibles : ceux que l'utilisateur n'a pas retirés de la liste.
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
        <button type="button" className="icon-set-hide" title="Retirer ce jeu de la liste (aucun bouton ni point n'est modifié)" aria-label="Retirer ce jeu de la liste" onClick={()=>hideIconSet(set.key)}>✕</button>
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
          <button type="button" className="icon-delete" title={'Supprimer « '+i.name+' » de la bibliothèque'} aria-label={'Supprimer '+i.name} onClick={()=>deleteIcon(i.id)}>✕</button>
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
  function patchPoint(update:Partial<Hotspot>){
    patchScene(s=>({...s,hotspots:s.hotspots.map(h=>h.id===selectedId?{...h,...update}:h)}));
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
      setProject(p=>({...p,scenes:[...p.scenes,...next],
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
    const h:Hotspot={
      id:uid(),type:mode,title:mode==='navigation'?'Aller vers…':mode==='lien'?'Ouvrir un lien':mode==='image'?'Cadre photo':mode==='video'?'Écran vidéo':'Informations',
      text:'',target:'',yaw,pitch,
      ...(['image','video'].includes(mode)?{frameWidth:320,frameHeight:200,frameReferenceHeight:Math.max(100,viewAreaRef.current?.clientHeight||550),frameReferenceZoom:cameraRef.current.zoom,frameCorners:defaultFrameCorners(),fadeOnClick:true}:{}),
      ...(mode==='video'?{videoAutoplay:true,videoLoop:true,videoOpenFullscreen:true}:{})
    };
    patchScene(s=>({...s,hotspots:[...s.hotspots,h]}));
    setSelectedId(h.id);setPanel('points');setMode(null);
    if(creationFullscreen){setFullscreenToolsTab('point');setFullscreenToolsOpen(true);setFullscreenGalleryOpen(false);}
  }
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
      if(name)renameSpace(spaceId,name);
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
  function deleteSpace(spaceId:string){
    const space=(project.spaces??[]).find(item=>item.id===spaceId);
    if(!space||!window.confirm('Supprimer uniquement l’espace « '+space.name+' » ? Les panoramas originaux seront conservés.'))return;
    setProject(p=>({...p,spaces:(p.spaces??[]).filter(item=>item.id!==spaceId)}));
    setActiveSpaceId(null);setActiveId(project.scenes[0]?.id??'');
    setSelectedId('');setPreview(false);setMode(null);setSpaceManagerOpen(false);
    setStatus('Espace supprimé. Tous les panoramas du projet principal sont conservés.');
  }
  function removeScene(){
    if(!active)return;
    if(currentSpace){
      removeSceneFromSpace(currentSpace.id,active.id);return;
    }
    if(!window.confirm('Supprimer définitivement le panorama « '+active.name+' » du projet COMPLET et de tous les espaces ?'))return;
    const remaining=project.scenes.filter(s=>s.id!==active.id).map(s=>({...s,hotspots:s.hotspots.filter(h=>h.target!==active.id)}));
    setProject(p=>({...p,scenes:remaining,spaces:(p.spaces??[]).map(space=>({...space,sceneIds:space.sceneIds.filter(id=>id!==active.id)})),bottomBar:p.bottomBar.map(b=>({...b,target:b.target===active.id?'':b.target,...(b.gallery?{gallery:b.gallery.filter(g=>g.sceneId!==active.id)}:{})}))}));setActiveId(remaining[0]?.id??'');setSelectedId('');
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
      setStatus('Projet importé');
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
    setProject(fresh);setActiveId('');setSelectedId('');setLock(null);
    void persist(fresh,true);
  }
  function startFresh(){
    if(project.scenes.length && !window.confirm('Créer un nouveau projet ? Pense à exporter celui-ci avant.'))return;
    setActiveSpaceId(null);setSpaceManagerOpen(false);setProject(newProject());setActiveId('');setSelectedId('');setMode(null);setPreview(false);
    cloud.unlink();
  }
  return <div ref={studioRef} className={
    'app nv-studio-pro'+
    (studioFallback?' nv-studio-fullscreen-fallback':'')+
    (leftHidden?' nv-studio-hide-left':'')+
    (rightHidden?' nv-studio-hide-right':'')+
    (sceneDensity==='compact'?' nv-scenes-compact':'')
  }>
    <header className="topbar">
      <div className="nv-top-left">
        <div className="brand">
          <div className="brand-logo">
            <img src="/brand/novavisio-logo.png" alt="Logo NovaVisio" draggable={false}/>
          </div>
          <div className="nv-brand-text">
            <strong>NovaVisio <span>Studio</span></strong>
            <small>ÉDITEUR DE VISITES 360°</small>
          </div>
        </div>
        <div className="nv-header-menu-list" ref={topMenusRef}>
          <div className="nv-menu-root">
            <button type="button" className={'nv-menu-trigger '+(openTopMenu==='file'?'is-open':'')}
              aria-haspopup="menu" aria-expanded={openTopMenu==='file'}
              onClick={()=>setOpenTopMenu(m=>m==='file'?null:'file')}>
              Fichier <ChevronDown size={13}/>
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
              Partager <ChevronDown size={13}/>
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
              Affichage <ChevronDown size={13}/>
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
              onClick={()=>{setOpenTopMenu(null);setCloudOpen(true);}}>
              <Cloud size={16}/> Cloud
            </button>
          </div>
        </div>
      </div>
      <div className="nv-top-center">
        <div className="project-name">
          <div className="project-name-wrapper">
            <Edit3 size={14} className="project-edit-icon"/>
            <input aria-label="Nom du projet" value={project.name}
              onChange={event=>setProject(current=>({...current,name:event.target.value}))}/>
          </div>
        </div>
        <div className="mode-switch-group" role="group" aria-label="Mode de l'éditeur">
          <button type="button" className={'mode-btn '+(!preview?'is-active':'')}
            aria-pressed={!preview}
            onClick={()=>{if(preview){setPreview(false);setIntroVisible(false);}}}>
            <Edit3 size={15}/> Éditer
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
      </div>
      <div className="top-actions">
        <button type="button" className="nv-header-save" disabled={!ready||savingManually||!!lock}
          title={!ready?'Chargement…':savingManually?'Enregistrement en cours…':
            project!==savedRef.current?'Modifications non enregistrées · Enregistrer (⌘S / Ctrl+S)':
            status.startsWith('Enregistré')?status:'Enregistrer (⌘S / Ctrl+S)'}
          onClick={()=>void manualSave()} aria-label="Enregistrer le projet maintenant">
          <Save size={18}/>
          <span>{savingManually?'Enregistrement…':'Enregistrer'}</span>
          {!savingManually&&project!==savedRef.current&&<i aria-hidden="true" className="nv-unsaved-dot"/>}
        </button>
        <button type="button" className="nv-header-icon-btn"
          title={studioFullscreen?'Quitter le plein écran':'Plein écran de tout NovaVisio Studio'}
          aria-label={studioFullscreen?'Quitter le plein écran du logiciel':'Plein écran du logiciel'}
          aria-pressed={studioFullscreen} onClick={()=>void toggleStudioFullscreen()}>
          {studioFullscreen?<Minimize2 size={18}/>:<Maximize2 size={18}/>}
        </button>
        <button type="button" className="primary nv-header-export" disabled={exporting||!visibleScenes.length}
          title={currentSpace?'Exporter uniquement cet espace':'Exporter la visite complète au format HTML / ZIP'}
          onClick={()=>void exportTour()}>
          <Download size={15}/>{exporting?'Export…':'Exporter'}
        </button>
      </div>
    </header>
    <section className="nv-space-strip" aria-label="Espaces de travail du projet">
      <div className="nv-space-strip-label"><LayoutGrid size={15}/><span>ESPACES</span></div>
      <div className="nv-space-tab-scroll" role="tablist" aria-label="Espaces du projet">
        <button type="button" role="tab" aria-selected={!currentSpace}
          className={'nv-space-tab'+(!currentSpace?' is-active':'')}
          onClick={()=>selectSpace(null)} title="Tous les panoramas originaux">
          <Home size={13}/> Projet complet <small>{project.scenes.length}</small>
        </button>
        {(project.spaces??[]).map(space=><div key={space.id}
          className={'nv-space-tab nv-space-tab-editable'+(activeSpaceId===space.id?' is-active':'')}>
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
    {spaceManagerOpen&&currentSpace&&<div className="overlay nv-space-overlay" onMouseDown={event=>{
      if(event.target===event.currentTarget)setSpaceManagerOpen(false);
    }}>
      <section className="nv-space-modal" role="dialog" aria-modal="true" aria-label="Gestion de l’espace">
        <div className="nv-space-modal-head">
          <div><small>PROJET : {project.name}</small><h2>Organiser cet espace</h2></div>
          <button type="button" className="nv-space-close" onClick={()=>setSpaceManagerOpen(false)} aria-label="Fermer">✕</button>
        </div>
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
            {sceneThumbs[scene.id]?<img src={sceneThumbs[scene.id]} alt="" draggable={false}/>:<span className="nv-space-no-thumb">◎</span>}
            <span>{scene.name}</span>
          </label>)}
        </div>
        <div className="nv-space-modal-footer">
          <button type="button" className="nv-space-delete" onClick={()=>deleteSpace(currentSpace.id)}>Supprimer cet espace seulement</button>
          <button type="button" className="primary" onClick={()=>setSpaceManagerOpen(false)}>Terminer</button>
        </div>
      </section>
    </div>}
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
      <aside className="left panel">
        <div className="section-title">
          <span>PANORAMAS</span>
          <span className="counter">{visibleScenes.length}</span>
        </div>
        {currentSpace&&<div className="nv-space-sidebar-context">
          <strong>{currentSpace.name}</strong>
          <small>Les originaux restent dans « Projet complet ».</small>
          <button type="button" onClick={()=>setSpaceManagerOpen(true)}>＋ / − Choisir les panoramas</button>
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
        <div className="scenes" ref={scenesRef}>{filteredScenes.map((s,i)=><div key={s.id} className="scene-slot"
          onPointerDown={e=>{if(sceneSortEnabled)startSceneDrag(e,i);}}
          onClickCapture={e=>{if(suppressClick.current){e.preventDefault();e.stopPropagation();}}}>
          <button className={'scene '+(s.id===activeId?'active':'')} title="Glisse pour changer l’ordre (ou Alt + ↑ / ↓)"
            onKeyDown={e=>{
              if(!sceneSortEnabled||!e.altKey||(e.key!=='ArrowUp'&&e.key!=='ArrowDown'))return;
              e.preventDefault();
              moveScene(s.id,e.key==='ArrowUp'?i-1:i+2);
            }}
            onClick={()=>{selectScene(s.id);setSelectedId('');setMode(null);}}>
            {sceneThumbs[s.id]?<img src={sceneThumbs[s.id]} alt="Miniature du panorama" draggable={false} decoding="async"/>:<span className="scene-thumb-ph" aria-hidden="true"/>}
            <span className="nv-scene-description">
              <strong title={s.name}>{s.name}</strong>
              <small>Scène {visibleScenes.findIndex(scene=>scene.id===s.id)+1}
                {s.id===visibleScenes[0]?.id?' · Accueil':''} · {s.hotspots.length} point{s.hotspots.length>1?'s':''}</small>
            </span>
          </button>
          {currentSpace?<button type="button" className="nv-space-exclude" title={'Retirer '+s.name+' de cet espace uniquement'}
             aria-label={'Retirer '+s.name+' de cet espace'}
             onClick={()=>removeSceneFromSpace(currentSpace.id,s.id)}>✕</button>:
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
        <div className="helper">
          <strong>✦ Guide rapide</strong>
          <p>Clique sur un point dans le 360° pour modifier directement ses propriétés à droite.</p>
          <button className="help" onClick={()=>setHelp(true)}>Guide de démarrage →</button>
        </div>
      </aside>
      <main className="editor">
        <div className="editor-top">
          <span>{currentSpace?currentSpace.name:'PROJET COMPLET'} / <strong>{active?.name??'Sélectionner un panorama'}</strong></span>
          <b className={preview ? 'status-preview' : mode ? 'status-adding' : 'status-edit'}>
            {preview ? '👁️ APERÇU INTERACTIF' : mode ? '📍 CLIQUEZ DANS LE PANORAMA POUR PLACER LE POINT' : '✏️ MODE ÉDITION'}
          </b>
        </div>
        <div className={'view-area'+(creationFullscreenFallback?' nv-creation-fullscreen-fallback':'')} ref={viewAreaRef}>
          {active?<Panorama scene={active} icons={project.icons} mode={mode} preview={preview} onCreate={newPoint} onPick={id=>{setSelectedId(id);setSelectedBarId('');setPanel('points');if(creationFullscreen){setFullscreenToolsTab('point');setFullscreenToolsOpen(true);setFullscreenGalleryOpen(false);}}} arrival={active&&nextArrivalRef.current?.sceneId===active.id?nextArrivalRef.current:null} onNavigate={(id,via)=>{if(!visibleIds.has(id))return;if(via&&active)goThroughArrow(via,active.id);else selectScene(id);}} onInfo={h=>{setFrame(null);setInfo(h);}} onLink={openLinkInTour} onImage={(h,from)=>{setZoomFrom(from??null);setImageZoom(h);setInfo(null);setFrame(null);}} onVideo={(h,from)=>{setZoomFrom(from??null);setVideoZoom(h);setInfo(null);setFrame(null);}} selectedId={selectedId}
            onWorldFrameChange={(id,corners,center)=>patchScene(sc=>({...sc,hotspots:sc.hotspots.map(h=>h.id===id?
              {...h,frameSphericalCorners:corners,yaw:center?.yaw??h.yaw,pitch:center?.pitch??h.pitch}:h)}))}
            onMarkerMove={moveHotspot} onAssetDrop={dropIcon}
            onCameraChange={(yaw,pitch,zoom)=>{cameraRef.current={sceneId:activeId,yaw,pitch,zoom};}}/>:<div className="empty">
            <div className="empty-icon">◎</div><h1>{currentSpace?'Cet espace est vide':'Ta première visite commence ici'}</h1>
            <p>{currentSpace?'Sélectionne les panoramas de la visite principale à inclure dans cet espace.':'Importe des photos équirectangulaires 360° pour commencer à créer ta visite interactive.'}</p>
            <button className="primary" onClick={()=>currentSpace?setSpaceManagerOpen(true):upload.current?.click()}>
              {currentSpace?'Choisir les panoramas':'＋ Importer mes photos 360°'}
            </button>{!currentSpace&&<small>JPG, PNG ou WebP · rapport 2:1 recommandé</small>}
          </div>}
          {active && !creationFullscreen && <button type="button" className="nv-creation-fullscreen-enter"
            onClick={()=>void toggleCreationFullscreen()} title="Agrandir uniquement la création 360°" aria-label="Plein écran de la création">
            <Maximize2 size={18}/> Plein écran création
          </button>}
          {active && creationFullscreen && <div className="nv-creation-fullscreen-controls" role="toolbar" aria-label="Commandes du plein écran de création">
            <span className="nv-fullscreen-scene-name" title={active.name}>{active.name}</span>
            <button type="button" className={'nv-fullscreen-gallery-toggle'+(fullscreenGalleryOpen?' is-active':'')}
              aria-expanded={fullscreenGalleryOpen} aria-controls="nv-fullscreen-gallery"
              onClick={()=>{setFullscreenGalleryOpen(open=>!open);setMode(null);}}
              title="Choisir un panorama dans la galerie">
              <Images size={16}/> Galerie <span className="nv-fullscreen-gallery-count">{visibleScenes.length}</span>
            </button>
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
              onClick={()=>{setFullscreenToolsOpen(v=>!v);setFullscreenGalleryOpen(false);}}>
              <PanelRightClose size={16}/> Outils
            </button>}
            <button type="button" className="nv-creation-fullscreen-exit"
              onClick={()=>void toggleCreationFullscreen()} title="Revenir à NovaVisio Studio" aria-label="Quitter le plein écran de création">
              <Minimize2 size={17}/> Quitter
            </button>
          </div>}
          {active&&creationFullscreen&&!preview&&fullscreenToolsOpen&&
            <aside id="nv-fullscreen-tools" className="nv-fullscreen-tools-panel" aria-label="Réglages en plein écran">
              <div className="nv-fullscreen-tools-head">
                <div><small>NOVAVISIO STUDIO</small><strong>Réglages rapides</strong></div>
                <button type="button" aria-label="Fermer les réglages" onClick={()=>setFullscreenToolsOpen(false)}>✕</button>
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
                      onClick={()=>{setSelectedId(h.id);setSelectedBarId('');setMode(null);}}>
                      <span>{h.type==='navigation'?'➜':h.type==='image'?'▣':h.type==='video'?'▶':h.type==='lien'?'↗':'ⓘ'}</span>
                      <strong>{h.title||'Sans titre'}</strong>
                    </button>)}
                    {!active.hotspots.length&&<p className="nv-quick-hint">Ajoute un élément depuis la barre supérieure, puis clique dans le panorama.</p>}
                  </div>
                  {selected?<div className="nv-quick-fields">
                    <label>Nom du point
                      <input value={selected.title} onChange={e=>patchPoint({title:e.target.value})}/>
                    </label>
                    {selected.type==='navigation'&&<>
                      <label>Aller vers
                        <select value={selected.target} onChange={e=>patchPoint({target:e.target.value,arrivalYaw:undefined,arrivalPitch:undefined,arrivalZoom:undefined,arrivalZoomModel:undefined})}>
                          <option value="">Choisir un panorama</option>
                          {visibleScenes.filter(sc=>sc.id!==activeId).map(sc=><option key={sc.id} value={sc.id}>{sc.name}</option>)}
                        </select>
                      </label>
                      <button type="button" className="tool" disabled={!selected.target||!visibleIds.has(selected.target)}
                        onClick={()=>{if(active&&selected.target)goThroughArrow(selected,active.id);}}>
                        ➜ Tester la navigation
                      </button>
                    </>}
                    {(selected.type==='lien'||selected.type==='information')&&<>
                      <label>Adresse / lien
                        <input type="url" placeholder="https://…" value={selected.url??''} onChange={e=>patchPoint({url:e.target.value})}/>
                      </label>
                      <label>Texte affiché
                        <textarea rows={3} value={selected.text} onChange={e=>patchPoint({text:e.target.value})}/>
                      </label>
                    </>}
                    {selected.type==='image'&&<>
                      <label className="nv-quick-upload">▣ {selected.imageDataUrl?'Remplacer la photo':'Ajouter une photo'}
                        <input type="file" accept="image/*,.heic,.heif"
                          onChange={e=>{void addFrameImage(e.target.files?.[0]);e.currentTarget.value='';}}/>
                      </label>
                      <label className="nv-quick-check"><input type="checkbox" checked={selected.fadeOnClick!==false}
                        onChange={e=>patchPoint({fadeOnClick:e.target.checked})}/> Agrandir en fondu au clic</label>
                      <p className="nv-quick-hint">Déplace les quatre petites poignées sur le panorama pour adapter la photo au cadre.</p>
                    </>}
                    {selected.type==='video'&&<>
                      <label>URL de la vidéo
                        <input type="url" placeholder="https://…/video.mp4" value={selected.videoUrl??''}
                          onChange={e=>patchPoint({videoUrl:e.target.value,videoDataUrl:undefined})}/>
                      </label>
                      <label className="nv-quick-upload">▶ Importer une vidéo
                        <input type="file" accept="video/mp4,video/webm" onChange={e=>{
                          void addVideo(e.target.files?.[0]);e.currentTarget.value='';
                        }}/>
                      </label>
                      <label className="nv-quick-check"><input type="checkbox" checked={selected.videoAutoplay!==false}
                        onChange={e=>patchPoint({videoAutoplay:e.target.checked})}/> Lecture automatique</label>
                      <label className="nv-quick-check"><input type="checkbox" checked={selected.videoLoop!==false}
                        onChange={e=>patchPoint({videoLoop:e.target.checked})}/> Boucle</label>
                      <label className="nv-quick-check"><input type="checkbox" checked={selected.videoOpenFullscreen!==false}
                        onChange={e=>patchPoint({videoOpenFullscreen:e.target.checked})}/> Agrandir au clic</label>
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
                  <button type="button" className="nv-quick-primary" onClick={saveArrivalView}>
                    <Eye size={15}/> Définir cette vue comme arrivée
                  </button>
                  <p className="nv-quick-hint">Oriente et zoome comme tu le souhaites, puis enregistre cette vue. Les orientations propres aux flèches restent prioritaires.</p>
                  <button type="button" className="nv-quick-primary" onClick={()=>{setFullscreenToolsOpen(false);setFullscreenGalleryOpen(true);}}>
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
          {active && creationFullscreen && fullscreenGalleryOpen && <aside id="nv-fullscreen-gallery"
            className="nv-fullscreen-gallery-panel" aria-label="Galerie des panoramas">
            <header className="nv-fullscreen-gallery-header">
              <div><small>{currentSpace?.name??project.name}</small><strong>Galerie des panoramas</strong></div>
              <button type="button" className="nv-fullscreen-gallery-close" onClick={()=>setFullscreenGalleryOpen(false)}
                aria-label="Fermer la galerie">✕</button>
            </header>
            <div className="nv-fullscreen-gallery-nav">
              <button type="button" onClick={()=>stepFullscreenScene(-1)} title="Panorama précédent">
                <ChevronLeft size={16}/> Précédent
              </button>
              <button type="button" onClick={()=>stepFullscreenScene(1)} title="Panorama suivant">
                Suivant <ChevronRight size={16}/>
              </button>
            </div>

            <div className="nv-fullscreen-gallery-list">
              {visibleScenes.map((scene,index)=><button type="button" key={scene.id}
                className={'nv-fullscreen-gallery-scene'+(scene.id===activeId?' is-active':'')}
                onMouseEnter={()=>scheduleGalleryHover(scene.id)}
                onMouseLeave={()=>dismissGalleryHover()}
                onFocus={()=>scheduleGalleryHover(scene.id)}
                onBlur={()=>dismissGalleryHover()}
                onClick={()=>chooseFullscreenScene(scene.id)} aria-current={scene.id===activeId?'true':undefined}>
                {sceneThumbs[scene.id]?<img alt="" draggable={false} src={sceneThumbs[scene.id]} decoding="async"/>:
                  <span className="nv-fullscreen-gallery-placeholder">◎</span>}
                <span className="nv-fullscreen-gallery-scene-details">
                  <strong>{scene.name}</strong>
                  <small>Panorama {index+1}{scene.id===activeId?' · En cours':''}</small>
                  {scene.arrivalYaw!==undefined&&<em>✓ Vue d'arrivée définie</em>}
                </span>
              </button>)}
            </div>
            <footer className="nv-fullscreen-gallery-footer">
              {visibleScenes.length} panorama{visibleScenes.length>1?'s':''} dans cet espace
            </footer>
          </aside>}
          {active&&creationFullscreen&&fullscreenGalleryOpen&&hoveredGallerySceneId&&
            visibleScenes.some(scene=>scene.id===hoveredGallerySceneId)&&
            <aside className={'nv-fullscreen-gallery-hover-preview'+(fullscreenToolsOpen?' with-tools':'')}
              aria-label="Grand aperçu du panorama survolé"
              onMouseEnter={()=>{
                if(galleryHoverTimer.current)clearTimeout(galleryHoverTimer.current);
              }}
              onMouseLeave={()=>dismissGalleryHover(100)}>
              {visibleScenes.filter(scene=>scene.id===hoveredGallerySceneId).map(scene=>
                <div className="nv-hover-preview-content" key={scene.id}>
                  <div className="nv-hover-preview-title">
                    <div><small>APERÇU DU PANORAMA</small><strong title={scene.name}>{scene.name}</strong></div>
                    <button type="button" onClick={()=>chooseFullscreenScene(scene.id)}>Ouvrir cette scène <ChevronRight size={15}/></button>
                  </div>
                  <FullscreenGalleryHoverPreview scene={scene} thumb={sceneThumbs[scene.id]}/>
                  <div className="nv-hover-preview-foot"><span>Vue d’arrivée · Fais glisser pour regarder autour</span>
                    <span>{visibleScenes.findIndex(sc=>sc.id===scene.id)+1} / {visibleScenes.length}</span>
                  </div>
                </div>)}
            </aside>}
          {active && creationFullscreen && !preview && <div className="nv-creation-fullscreen-palette" role="toolbar" aria-label="Ajouter des éléments dans la création">
            {([
              ['navigation','➜ Navigation'],
              ['information','ⓘ Information'],
              ['lien','↗ Lien'],
              ['image','▣ Photo'],
              ['video','▶ Vidéo']
            ] as const).map(([type,label])=>(
              <button key={type} type="button" className={'nv-fullscreen-tool'+(mode===type?' is-active':'')}
                onClick={()=>{setMode(mode===type?null:type);setSelectedId('');}}
                title={'Ajouter : '+label}>{label}</button>
            ))}
            {mode&&<button type="button" className="nv-fullscreen-tool nv-fullscreen-cancel" onClick={()=>setMode(null)}>Annuler</button>}
          </div>}
          {active && !preview && mode && (
            <div className="mode-active-pill">
              <span className="mode-active-dot" />
              <span>Cliquez dans le 360° pour placer : <strong>{mode==='navigation'?'Point Navigation':mode==='information'?'Point Information':mode==='lien'?'Lien web':mode==='image'?'Cadre photo':'Écran vidéo'}</strong></span>
              <button type="button" onClick={()=>setMode(null)}>✕ Annuler (Échap)</button>
            </div>
          )}
          {active && !preview && <button type="button" className="scene-elements-open" onClick={()=>{setPanel('elements');setMode(null);setSelectedId('');}}>
            <Info size={16}/> Éléments
          </button>}
          {/* BARRE DU BAS CONSERVÉE INTACTE */}
          {active && project.bottomBar.length>0 && <nav className="visitor-bottom-bar" aria-label="Barre interactive de la visite" style={barCss}>
            {project.bottomBar.map(item=>{
              const icon=project.icons.find(i=>i.id===item.iconId);
              const isUnavailable=preview && item.type==='lien' && !safeLink(item.url);
              return <button type="button" key={item.id} style={icon?{'--nv-bar-btn':barIconSize(item)+'px'} as CSSProperties:undefined} className={'visitor-bar-button '+(icon?'has-custom-png ':'')+(selectedBarId===item.id&&!preview?'is-selected':'')} onClick={()=>triggerBar(item)} disabled={isUnavailable} title={isUnavailable?'Lien à configurer':item.title} aria-label={item.title}>
                <span className="visitor-bar-icon">{icon?<IconStateVisual icons={project.icons} normal={item.iconId} hover={item.hoverIconId} pressed={item.pressedIconId} size={barIconSize(item)}/>:<BarGlyph name={item.builtinIcon??'info'}/>}</span>
                <span className="visitor-bar-label">{item.title}</span>
              </button>;
            })}
          </nav>}
          {introVisible && project.introEnabled && project.introUrl && <div className="intro-overlay">
            <iframe title="Introduction de la visite" src={project.introUrl} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" referrerPolicy="strict-origin-when-cross-origin"/>
          </div>}
          {videoZoom && <VideoPopup hotspot={videoZoom} origin={zoomFrom} onClose={()=>setVideoZoom(null)}/>}
          {active && <ContinuousMusic project={project} scene={active} paused={!preview||!!videoZoom||introVisible}/>}
          {preview&&galleryOpen&&(()=>{
            const item=project.bottomBar.find(b=>b.id===galleryOpen&&b.type==='gallery');
            if(!item)return null;
            return <PanoramaGallery title={item.galleryTitle||item.title||'Panoramas'} currentId={active?.id}
              entries={galleryEntries(item,visibleScenes).map(e=>({sceneId:e.sceneId,label:e.label,thumb:sceneThumbs[e.sceneId]}))}
              onPick={id=>{selectScene(id);setGalleryOpen(null);}} onClose={()=>setGalleryOpen(null)}/>;
          })()}
          {imageZoom?.imageDataUrl && <ZoomImage variant="studio" src={imageZoom.imageDataUrl} alt={imageZoom.title} origin={zoomFrom} animate={imageZoom.fadeOnClick!==false} onClose={()=>setImageZoom(null)}/>}
          {frame && <div className="embed-overlay" onClick={()=>setFrame(null)} role="presentation">
            <section className="embed-shell" aria-label={'Contenu intégré : '+frame.title} onClick={event=>event.stopPropagation()}>
              <div className="embed-header">
                <span className="embed-title">{frame.title}</span>
                <div className="embed-actions">
                  <button type="button" onClick={()=>setFrame(null)} aria-label="Fermer le contenu intégré">✕</button>
                </div>
              </div>
              <iframe key={frame.url} title={frame.title} src={frame.url}
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                referrerPolicy="strict-origin-when-cross-origin" allow="fullscreen" loading="lazy" />
              <p className="embed-hint">Certains sites externes n'autorisent pas leur affichage dans une iframe.</p>
            </section>
          </div>}
          {info && <div className="overlay info-in-view" onClick={()=>setInfo(null)}>
            <div className="modal" onClick={event=>event.stopPropagation()}>
              <button className="close" onClick={()=>setInfo(null)} aria-label="Fermer">✕</button>
              <h2>{info.title}</h2><p className="preserve">{info.text||'Aucune information renseignée.'}</p>
              <button className="primary" onClick={()=>setInfo(null)}>Fermer</button>
            </div>
          </div>}
        </div>
        {active && !preview && <div className="toolbar">
          <span className="toolbar-label">AJOUTER :</span>
          <button className={'tool '+(mode==='navigation'?'selected':'')} onClick={()=>setMode(mode==='navigation'?null:'navigation')} title="Lien de navigation vers un autre panorama">
            ➜ Navigation
          </button>
          <button className={'tool '+(mode==='information'?'selected':'')} onClick={()=>setMode(mode==='information'?null:'information')} title="Bulle d'information ou page intégrée">
            ⓘ Information
          </button>
          <button className={'tool '+(mode==='lien'?'selected':'')} onClick={()=>setMode(mode==='lien'?null:'lien')} title="Lien web, téléphone ou email">
            ↗ Lien web
          </button>
          <button className={'tool '+(mode==='image'?'selected':'')} onClick={()=>setMode(mode==='image'?null:'image')} title="Cadre photo incrusté en perspective">
            ▣ Cadre photo
          </button>
          <button className={'tool '+(mode==='video'?'selected':'')} onClick={()=>setMode(mode==='video'?null:'video')} title="Écran vidéo animé">
            ▶ Écran vidéo
          </button>
          <div className="toolbar-sep"/>
          <button className={'tool '+(panel==='bar'?'selected':'')} onClick={()=>{setPanel('bar');setMode(null);setSelectedId('');}}>
            ☷ Barre du bas
          </button>
          <div className="grow"/><button className="tool danger" onClick={removeScene} title={currentSpace?'Retirer de cet espace (original conservé)':'Supprimer définitivement le panorama'}>
            <Trash2 size={13} style={{marginRight:4,verticalAlign:'-2px'}}/> {currentSpace?'Retirer de l’espace':'Supprimer scène'}
          </button>
        </div>}
      </main>
      <aside className="right panel">
        <div className="side-tabs" role="tablist" aria-label="Options d'édition">
          <button role="tab" aria-selected={panel==='points'} className={panel==='points'?'active':''} onClick={()=>setPanel('points')}>
            {selectedId ? '◉ Inspecteur' : 'Scène & Points'}
          </button>
          <button role="tab" aria-selected={panel==='bar'} className={panel==='bar'?'active':''} onClick={()=>setPanel('bar')}>Barre du bas</button>
          <button role="tab" aria-selected={panel==='icons'} className={panel==='icons'?'active':''} onClick={()=>setPanel('icons')}>Mes icônes</button>
          <button role="tab" aria-selected={panel==='intro'} className={panel==='intro'?'active':''} onClick={()=>setPanel('intro')}>Intro</button>
          <button role="tab" aria-selected={panel==='elements'} className={panel==='elements'?'active':''} onClick={()=>setPanel('elements')}>Éléments</button>
          <button role="tab" aria-selected={panel==='music'} className={panel==='music'?'active':''} onClick={()=>setPanel('music')}>Musique</button>
        </div>
        {panel==='points' && <div className="properties">
          {!active?<div className="hint">Importe un panorama pour commencer à créer.</div>:selected ? (
            /* ============================================================== */
            /* DIRECT ELEMENT INSPECTOR (QUAND UN ÉLÉMENT DU 360° EST CLIQUÉ) */
            /* ============================================================== */
            <div className="element-inspector">
              <div className="element-inspector-header">
                <div className="element-inspector-badge">
                  <span className="badge-glyph">
                    {selected.type==='navigation'?'➜':selected.type==='lien'?'↗':selected.type==='image'?'▣':selected.type==='video'?'▶':'ⓘ'}
                  </span>
                  <div>
                    <strong>{selected.type==='navigation'?'Navigation':selected.type==='lien'?'Lien web':selected.type==='image'?'Cadre photo':selected.type==='video'?'Écran vidéo':'Information'}</strong>
                    <small>Paramètres de l’élément sélectionné</small>
                  </div>
                </div>
                <button type="button" className="element-close-btn" onClick={()=>setSelectedId('')} title="Désélectionner et revenir aux paramètres de la scène">
                  ← Vue d’ensemble
                </button>
              </div>

              {active.hotspots.length > 1 && (
                <div className="point-quick-switcher">
                  <label>Passer à un autre point :
                    <select value={selectedId} onChange={e=>setSelectedId(e.target.value)}>
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
                {selected.imageDataUrl && <p className="hint">💡 Cadrage : déplace directement les quatre poignées turquoise sur le cadre photo dans le 360° pour suivre la perspective.</p>}
                <label>Largeur : {selected.frameWidth??320} px
                  <input type="range" min="80" max="900" step="10" value={selected.frameWidth??320} onChange={e=>patchPoint({frameWidth:Number(e.target.value)})}/>
                </label>
                <label>Hauteur : {selected.frameHeight??200} px
                  <input type="range" min="60" max="700" step="10" value={selected.frameHeight??200} onChange={e=>patchPoint({frameHeight:Number(e.target.value)})}/>
                </label>
                <label className="toggle-row"><input type="checkbox" checked={selected.fadeOnClick??true} onChange={e=>patchPoint({fadeOnClick:e.target.checked})}/> Agrandir en fondu au clic</label>
                <button className="style-reset" type="button" onClick={()=>patchPoint({frameCorners:defaultFrameCorners()})}>Réinitialiser les 4 coins</button>
              </> : selected.type==='video' ? <>
                <button type="button" className="import" onClick={()=>videoInput.current?.click()}>{selected.videoDataUrl?'Remplacer la vidéo':'＋ Importer une vidéo MP4 / WebM'}</button>
                <small className="hint-inline">22 Mo max en local, ou renseigne une URL HTTPS directe :</small>
                <label>Ou URL HTTPS de la vidéo
                  <input type="url" placeholder="https://…/video.mp4" value={selected.videoUrl??''} onChange={e=>patchPoint({videoUrl:e.target.value,videoDataUrl:undefined})}/>
                </label>
                {selected.videoUrl && !isSafeMediaUrl(selected.videoUrl)&&<small className="warning-inline">Adresse HTTPS invalide.</small>}
                {(selected.videoDataUrl||selected.videoUrl)&&<video className="editor-video-preview" src={selected.videoDataUrl||selected.videoUrl} controls muted playsInline/>}
                <div className="section-title">ADAPTER L'ÉCRAN À LA PERSPECTIVE</div>
                <CornerEditor width={selected.frameWidth??320} height={selected.frameHeight??200} corners={selected.frameCorners??defaultFrameCorners()} onChange={v=>patchPoint({frameCorners:v})}/>
                <label>Largeur : {selected.frameWidth??320} px
                  <input type="range" min="80" max="900" step="10" value={selected.frameWidth??320} onChange={e=>patchPoint({frameWidth:Number(e.target.value)})}/>
                </label>
                <label>Hauteur : {selected.frameHeight??200} px
                  <input type="range" min="60" max="700" step="10" value={selected.frameHeight??200} onChange={e=>patchPoint({frameHeight:Number(e.target.value)})}/>
                </label>
                <label className="toggle-row"><input type="checkbox" checked={selected.videoAutoplay!==false} onChange={e=>patchPoint({videoAutoplay:e.target.checked})}/> Démarrer automatiquement (muet)</label>
                <label className="toggle-row"><input type="checkbox" checked={selected.videoLoop!==false} onChange={e=>patchPoint({videoLoop:e.target.checked})}/> Répéter la vidéo en boucle</label>
                <label className="toggle-row"><input type="checkbox" checked={selected.videoOpenFullscreen!==false} onChange={e=>patchPoint({videoOpenFullscreen:e.target.checked})}/> Agrandir au clic avec le son</label>
                <button className="style-reset" type="button" onClick={()=>patchPoint({frameCorners:defaultFrameCorners()})}>Réinitialiser les 4 coins</button>
              </> : selected.type==='navigation' ? (
                <>
                <label>Scène de destination
                  <select value={selected.target} onChange={e=>patchPoint({target:e.target.value,arrivalYaw:undefined,arrivalPitch:undefined,arrivalZoom:undefined})}>
                    <option value="">Sélectionner une scène…</option>
                    {visibleScenes.filter(sc=>sc.id!==activeId).map(sc=><option key={sc.id} value={sc.id}>{sc.name}</option>)}
                  </select>
                </label>
                <button type="button" className="tool" disabled={!selected.target||!visibleIds.has(selected.target)}
                  onClick={()=>{if(active&&selected.target)goThroughArrow(selected,active.id);}}>
                  ➜ Tester la navigation vers ce panorama
                </button>
                {selected.target&&<div className="arrival-view-card is-inspector">
                  <div className="section-title">VUE D’ARRIVÉE DE CETTE FLÈCHE</div>
                  {selected.arrivalYaw!==undefined?<small className="arrival-saved">✓ Enregistrée · angle {Math.round(selected.arrivalYaw*180/Math.PI)}° · zoom {Math.round(selected.arrivalZoom??60)}%</small>
                    :<small>Pas de vue propre : celle par défaut du panorama de destination est utilisée.</small>}
                  <button type="button" onClick={()=>goThroughArrow(selected,activeId)}>➜ Aller au panorama et régler la vue d’arrivée</button>
                  {selected.arrivalYaw!==undefined&&<button type="button" onClick={()=>{patchPoint({arrivalYaw:undefined,arrivalPitch:undefined,arrivalZoom:undefined});setStatus('Vue d’arrivée de la flèche réinitialisée');}}>Réinitialiser</button>}
                </div>}
                </>
              ) : selected.type==='lien' ? (
                <label>Adresse (https://, tel:, mailto:)
                  <input type="text" placeholder="https://exemple.fr" value={selected.url??''} onChange={e=>patchPoint({url:e.target.value})}/>
                </label>
              ) : (
                <>
                  <label>Texte affiché
                    <textarea rows={4} placeholder="Description ou informations..." value={selected.text} onChange={e=>patchPoint({text:e.target.value})}/>
                  </label>
                  <label>Page web intégrée (optionnel)
                    <input type="text" placeholder="https://… menu, réservations" value={selected.url??''} onChange={e=>patchPoint({url:e.target.value})}/>
                    <small className="hint-inline">Si renseignée, la page s'ouvre directement dans la visite à la place du texte.</small>
                  </label>
                </>
              )}

              {!['image','video'].includes(selected.type) && <>
                <div className="section-title">ICÔNE DU POINT</div>
                {iconSetPicker({...selected,size:selected.iconSize??28},set=>patchPoint({iconId:set.iconId,hoverIconId:set.hoverIconId,pressedIconId:set.pressedIconId,iconSize:Math.max(16,Math.min(80,set.size))}))}
                {iconStateEditor('pt-normal','Icône personnalisée',selected.iconId,id=>patchPoint({iconId:id}),'Icône par défaut')}
                {selected.iconId && <button type="button" className="style-reset" onClick={()=>requestReplaceIcon(selected.iconId!)}>Remplacer ce PNG partout</button>}
                {iconStateEditor('pt-hover','PNG au survol (optionnel)',selected.hoverIconId,id=>patchPoint({hoverIconId:id}),'Identique au normal')}
                {iconStateEditor('pt-pressed','PNG au clic (optionnel)',selected.pressedIconId,id=>patchPoint({pressedIconId:id}),'Identique au survol')}
                <label>Taille de l'icône : {selected.iconSize??28} px
                  <input type="range" min="16" max="80" step="2" value={selected.iconSize??28} onChange={e=>patchPoint({iconSize:Number(e.target.value)})}/>
                </label>
              </>}

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
              <div className="section-title">PARAMÈTRES DU PANORAMA</div>
              <label>Nom de la scène
                <input value={active.name} onChange={e=>patchScene(sc=>({...sc,name:e.target.value}))}/>
              </label>

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
                    <button key={h.id} type="button" className="point-item-btn" onClick={() => setSelectedId(h.id)}>
                      <span className="point-item-glyph">
                        {project.icons.find(i=>i.id===h.iconId)?<img className="point-icon-small" src={project.icons.find(i=>i.id===h.iconId)!.dataUrl} alt=""/>:h.type==='navigation'?'➜':h.type==='lien'?'↗':h.type==='image'?'▣':h.type==='video'?'▶':'ⓘ'}
                      </span>
                      <span className="point-item-info">
                        <strong>{h.title || '(Sans titre)'}</strong>
                        <small>{h.type==='navigation'?'Navigation':h.type==='lien'?'Lien web':h.type==='image'?'Cadre photo':h.type==='video'?'Écran vidéo':'Information'}</small>
                      </span>
                      <ChevronRight size={14} className="point-item-arrow"/>
                    </button>
                  ))}
                </div>
              )}

              <hr/>
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
            </div>
          )}
        </div>}
        {panel==='bar' && <div className="properties">
          <div className="section-title">BARRE DE NAVIGATION <span className="counter">{project.bottomBar.length}</span></div>
          <p className="hint">Ces icônes apparaissent en bas de la visite. Clique sur un bouton dans le panorama ou dans la liste pour le modifier.</p>
          <div className="style-settings">
            <div className="section-title">COULEURS ET CONTOURS</div>
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
          <div className="bar-items-list">{project.bottomBar.map(item=><button key={item.id} className={'bar-item-row '+(selectedBarId===item.id?'current':'')} onClick={()=>setSelectedBarId(item.id)}>
            <span className="bar-item-symbol">{project.icons.find(i=>i.id===item.iconId)?<img src={project.icons.find(i=>i.id===item.iconId)!.dataUrl} alt=""/>:<BarGlyph name={item.builtinIcon??'info'}/>}</span>
            <span>{item.title}</span><small>{item.type==='navigation'?'Scène':item.type==='information'?'Info':item.type==='gallery'?'Galerie':'Lien'}</small>
          </button>)}</div>
          <button className="import" onClick={()=>addBar('information')}>＋ Ajouter un bouton</button>
          <button className="preset-button" onClick={()=>{if(window.confirm('Remplacer la barre actuelle par le modèle bordeaux à 5 icônes ? Les icônes importées resteront disponibles.')){setProject(p=>({...p,bottomBar:defaultBar()}));setSelectedBarId('');}}}>↻ Appliquer le modèle 5 icônes</button>
          {selectedBar && <>
            <hr/>
            <div className="section-title">CONFIGURER LE BOUTON</div>
            <label>Libellé<input value={selectedBar.title} onChange={e=>patchBar({title:e.target.value})}/></label>
            <label>Action<select value={selectedBar.type} onChange={e=>{
              const t=e.target.value as BottomBarItem['type'];
              // Première fois en « galerie » : tous les panoramas sont proposés, à toi de retirer / renommer.
              if(t==='gallery'&&!selectedBar.gallery)patchBar({type:t,gallery:project.scenes.map(sc=>({sceneId:sc.id,label:''}))});
              else patchBar({type:t});
            }}>
              <option value="navigation">Aller vers un panorama</option><option value="gallery">Galerie de panoramas (raccourcis)</option><option value="information">Afficher des informations</option><option value="lien">Ouvrir un lien / réserver / appeler</option>
            </select></label>
            {selectedBar.type==='gallery'?galleryPanel(selectedBar):selectedBar.type==='navigation'?<label>Scène de destination<select value={selectedBar.target} onChange={e=>patchBar({target:e.target.value})}><option value="">Première scène (accueil)</option>{project.scenes.map(sc=><option key={sc.id} value={sc.id}>{sc.name}</option>)}</select></label>
            : selectedBar.type==='information'?<><label>Contenu du panneau<textarea rows={5} value={selectedBar.text} onChange={e=>patchBar({text:e.target.value})} placeholder="Horaires, description, informations utiles…"/></label>
              <label>Page intégrée (optionnel)<input type="text" value={selectedBar.url} placeholder="https://… menu, photos, réservations" onChange={e=>patchBar({url:e.target.value})}/></label>
              <small className="hint-inline">Si tu renseignes une URL, elle remplacera le texte par une fenêtre intégrée.</small></>
            :<label>Lien de destination<input type="text" value={selectedBar.url} placeholder="https://… ou tel:+33…" onChange={e=>patchBar({url:e.target.value})}/>{selectedBar.url && !safeLink(selectedBar.url)&&<small className="warning-inline">Adresse invalide : https://, mailto: ou tel: requis</small>}</label>}
            <div className="section-title">MES PNG — NORMAL, SURVOL, CLIC</div>
            {iconSetPicker({...selectedBar,size:barIconSize(selectedBar)},set=>patchBar({iconId:set.iconId,hoverIconId:set.hoverIconId,pressedIconId:set.pressedIconId,iconSize:set.size}))}
            {iconStateEditor('bar-normal','PNG normal',selectedBar.iconId,id=>patchBar({iconId:id}),'Icône par défaut')}
            {selectedBar.iconId && <button type="button" className="style-reset" onClick={()=>requestReplaceIcon(selectedBar.iconId!)}>Remplacer ce PNG dans toute la visite</button>}
            {iconStateEditor('bar-hover','PNG au survol',selectedBar.hoverIconId,id=>patchBar({hoverIconId:id}),'Identique au normal')}
            {iconStateEditor('bar-pressed','PNG au clic',selectedBar.pressedIconId,id=>patchBar({pressedIconId:id}),'Identique au survol')}
            {!selectedBar.iconId && <label>Icône de base<select value={selectedBar.builtinIcon??'info'} onChange={e=>patchBar({builtinIcon:e.target.value})}>
              {Object.keys(glyphs).map(key=><option value={key} key={key}>{key}</option>)}
            </select></label>}
            <label>Taille : {barIconSize(selectedBar)} px<input type="range" min="20" max="72" step="2" value={barIconSize(selectedBar)} onChange={e=>patchBar({iconSize:Number(e.target.value)})}/></label>
            <button type="button" className="style-reset" onClick={()=>{const size=barIconSize(selectedBar);setProject(p=>({...p,bottomBar:p.bottomBar.map(b=>({...b,iconSize:size}))}));setStatus('Taille '+size+' px appliquée à tous les boutons');}}>Appliquer cette taille à tous les boutons</button>
            <div className="reorder-row"><button className="tool" onClick={()=>moveBar(-1)}>← Déplacer</button><button className="tool" onClick={()=>moveBar(1)}>Déplacer →</button></div>
            <button className="delete" onClick={()=>{setProject(p=>({...p,bottomBar:p.bottomBar.filter(b=>b.id!==selectedBarId)}));setSelectedBarId('');}}>Supprimer ce bouton</button>
          </>}
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
          <div className="section-title">ICÔNES DISPONIBLES</div>
          <div className="elements-icon-grid">
            {project.icons.map(icon=><button type="button" key={icon.id} draggable
              onDragStart={e=>{e.dataTransfer.setData('application/x-nv-icon',icon.id);e.dataTransfer.effectAllowed='copy';}}
              onClick={()=>setStatus('Glisse « '+icon.name+' » dans le panorama pour créer un point')}
              title={'Faire glisser '+icon.name+' sur le panorama'}>
              <img src={icon.dataUrl} alt=""/><span>{icon.name}</span>
            </button>)}
          </div>
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
              <button type="button" className="icon-set-hide" title="Retirer ce jeu de la liste (aucun bouton ni point n'est modifié)" aria-label="Retirer ce jeu de la liste" onClick={()=>hideIconSet(set.key)}>✕</button>
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
          <small className="hint-inline">La transition est automatique à la fin de cette durée, ou dès que l’intro envoie l’événement intro:done.</small>
          <button type="button" className="import" onClick={()=>{if(project.introUrl.startsWith('https://')){setPreview(true);setIntroVisible(true);}else setStatus('Renseigne d’abord une URL HTTPS valide');}}>Tester l’introduction</button>
          <p className="hint">Dans le dossier HTML exporté, cette introduction sera présentée avant l’entrée dans la visite.</p>
        </div>}
        {panel==='music' && <div className="properties">
          <div className="section-title">BIBLIOTHÈQUE MUSICALE <span className="counter">{project.audioTracks?.length??0}</span></div>
          <p className="hint">Attribue une piste à plusieurs panoramas : elle joue en continu, en boucle, sans recommencer lors du passage d’une scène à l’autre. Choisis une autre piste là où tu souhaites changer d’ambiance.</p>
          <button type="button" className="import" onClick={()=>audioInput.current?.click()}>＋ Importer une piste MP3, WAV, OGG</button>
          {(project.audioTracks??[]).map(track=><div className="music-track-card" key={track.id}>
            <div className="music-track-title"><strong>{track.name}</strong><button type="button" onClick={()=>removeTrack(track.id)} title="Supprimer cette piste">✕</button></div>
            <label>Nom<input value={track.name} onChange={e=>setProject(p=>({...p,audioTracks:p.audioTracks.map(t=>t.id===track.id?{...t,name:e.target.value}:t)}))}/></label>
            <label>Volume : {track.volume} %
              <input type="range" min="0" max="100" value={track.volume} onChange={e=>setProject(p=>({...p,audioTracks:p.audioTracks.map(t=>t.id===track.id?{...t,volume:Number(e.target.value)}:t)}))}/>
            </label>
            <label className="toggle-row"><input type="checkbox" checked={track.loop} onChange={e=>setProject(p=>({...p,audioTracks:p.audioTracks.map(t=>t.id===track.id?{...t,loop:e.target.checked}:t)}))}/> Lecture en boucle</label>
            <div className="section-title">PANORAMAS À SONORISER</div>
            {project.scenes.map(sc=><label className="music-scene-check" key={sc.id}>
              <input type="checkbox" checked={sc.musicTrackId===track.id} onChange={e=>assignMusic(track.id,sc.id,e.target.checked)}/>
              <span>{sc.name}</span>
            </label>)}
          </div>)}
          {!project.audioTracks?.length&&<p className="hint">Aucune musique importée. Commence par ajouter un fichier audio.</p>}
        </div>}
        {panel==='icons' && <div className="properties">
          <div className="section-title">BIBLIOTHÈQUE D’ICÔNES <span className="counter">{project.icons.length}</span></div>
          <p className="hint">Ajoute tes propres icônes pour les points 360° et la barre inférieure. Elles sont conservées dans le fichier projet exporté.</p>
          <button className="import" onClick={()=>iconInput.current?.click()}>＋ Importer mes icônes</button>
          <small className="hint-inline">Formats : PNG (transparent), JPG, WebP, GIF animé · 1,5 Mo maximum par fichier.</small>
          <div className="asset-grid">{project.icons.map(icon=><div className="asset-card" key={icon.id}>
            <img src={icon.dataUrl} alt={icon.name}/><span title={icon.name}>{icon.name}</span>
            <button className="asset-delete" title={'Supprimer '+icon.name} onClick={()=>deleteIcon(icon.id)}>✕</button>
            <button className="asset-replace" type="button" onClick={()=>requestReplaceIcon(icon.id)}>Remplacer partout</button>
          </div>)}</div>
          <p className="hint">Le remplacement conserve l’icône liée à tous les boutons et tous les points 360°, sans les reconfigurer.</p>
          {!project.icons.length && <p className="hint">Ta bibliothèque est vide. Les icônes intégrées restent disponibles en attendant.</p>}
        </div>}
      </aside>
    </div>
    <footer><span>NovaVisio Studio · Éditeur professionnel</span><span>{project.scenes.length} panoramas · {totalPoints} points</span><span>Stockage local sur cet appareil</span></footer>
    <input ref={upload} hidden type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>void addImages(e.target.files)}/>
    <input ref={stateIconInput} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>void importStateIcon(e.target.files?.[0])}/>
    <input ref={projectInput} hidden type="file" accept=".json,.nvstudio.json,application/json" onChange={e=>void openProject(e.target.files?.[0])}/>
    <input ref={iconInput} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={e=>void addIconFiles(e.target.files)}/>
    <input ref={replaceIconInput} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>void replaceIconEverywhere(e.target.files?.[0])}/>
    <input ref={videoInput} hidden type="file" accept="video/mp4,video/webm" onChange={e=>void addVideo(e.target.files?.[0])}/>
    <input ref={audioInput} hidden type="file" accept="audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/x-wav,audio/webm,audio/mp4" onChange={e=>void addAudio(e.target.files?.[0])}/>
    {privateOpen&&<PrivatePanel project={project} onClose={()=>setPrivateOpen(false)} onStatus={setStatus} syncNow={cloud.syncNow} syncState={cloud.state}/>}
    {shareOpen&&<SharePanel project={project} onClose={()=>setShareOpen(false)} onStatus={setStatus}/>}
    {cloudOpen&&<CloudPanel project={project} onClose={()=>setCloudOpen(false)} onBackup={download} onStatus={setStatus}
      autoEnabled={cloud.enabled} onAutoChange={cloud.setEnabled} manualMode autoLabel={cloud.state.kind==='saved'?'Dernier envoi à '+new Date(cloud.state.at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):cloudLabel(cloud.state)}
      onOpen={(p:StudioProject,link:CloudLink)=>{const up=ensureFrameReferences(p,viewAreaRef.current?.clientHeight||550);setProject(up);setActiveId(up.scenes[0]?.id??'');setSelectedId('');setMode(null);setPreview(false);cloud.markSynced(up,link);}}/>}
    {help&&<div className="overlay" onClick={()=>setHelp(false)}><div className="modal" onClick={e=>e.stopPropagation()}>
      <button className="close" onClick={()=>setHelp(false)}>✕</button><h2>Guide NovaVisio Studio</h2>
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
