import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {createRoot} from 'react-dom/client';
import {CornerEditor,imageMarkerHtml,responsiveFrameSize} from './imageFrame';
import {exportStaticTour} from './exportTour';
import {IconStateVisual,iconStateHtml,videoMarkerHtml,VideoPopup} from './media';
import {ContinuousMusic} from './continuousMusic';
import {CloudPanel} from './CloudPanel';
import {Utensils,Images,LayoutGrid,Phone,Info,Home,CalendarDays,MapPin,Globe,ArrowRight,Menu,Star,Maximize,Minimize,Eye,Edit3,Trash2,Plus,ChevronRight,Sparkles,Download,Cloud} from 'lucide-react';
import {Viewer} from '@photo-sphere-viewer/core';
import {MarkersPlugin,type MarkerConfig} from '@photo-sphere-viewer/markers-plugin';
import {syncMarkers,resetMarkers} from './markerSync';
import {frameWorldCorners,editingFrameControls,cornerMarkerId,centerMarkerId,FRAME_KEYS,type SphericalPoint} from './sphericalFrame';
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';
import {loadProject,newProject,readImage,readPanorama,saveProject,barIconSize,uid,validateProject,defaultBar,isSafeIconDataUrl,type Hotspot,type CustomIcon,type BottomBarItem,type Scene,type StudioProject,type BarStyle,defaultBarStyle,defaultFrameCorners,isSafeFrameImage,isSafeVideoData,isSafeAudioData,isSafeMediaUrl,type FrameSphericalCorners} from './storage';
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
  onNavigate: (id:string)=>void;
  onInfo: (hotspot:Hotspot)=>void;
  onLink: (title:string,url:string)=>void;
  onImage: (h:Hotspot)=>void;
  onVideo: (h:Hotspot)=>void;
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
function Panorama({scene,icons,mode,preview,onCreate,onPick,onNavigate,onInfo,onLink,onImage,onVideo,selectedId,onWorldFrameChange,onMarkerMove,onAssetDrop,onCameraChange}:PanoramaProps) {
  const box = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer|null>(null);
  const loadedSceneRef=useRef<string|null>(null);
  const actions = useRef({scene,icons,mode,preview,onCreate,onPick,onNavigate,onInfo,onLink,onImage,onVideo,selectedId,onWorldFrameChange,onMarkerMove,onAssetDrop,onCameraChange});
  actions.current = {scene,icons,mode,preview,onCreate,onPick,onNavigate,onInfo,onLink,onImage,onVideo,selectedId,onWorldFrameChange,onMarkerMove,onAssetDrop,onCameraChange};

  useEffect(()=>{
    if (!box.current) return;
    const viewer = new Viewer({
      container:box.current, panorama:scene.dataUrl,
      // Le bouton plein écran natif n'agrandit que le lecteur 360° et cache les éléments personnalisés.
      // La vue complète (lecteur + barre) est désormais gérée par App.
      navbar:[],mousemove:true,mousewheel:true,touchmoveTwoFingers:false,
      moveSpeed:1,defaultZoomLvl:scene.arrivalZoom??60,
      defaultYaw:scene.arrivalYaw??0,defaultPitch:scene.arrivalPitch??0,
      minFov:35,maxFov:75,fisheye:false,loadingTxt:'',
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
        if(h.type==='navigation' && h.target) a.onNavigate(h.target);
        else if(h.type==='information') {
          if (h.url && safeLink(h.url)) a.onLink(h.title,h.url);
          else a.onInfo(h);
        }
        else if(h.type==='lien' && h.url) a.onLink(h.title,h.url);
        else if(h.type==='image') a.onImage(h);
        else if(h.type==='video' && h.videoOpenFullscreen!==false) a.onVideo(h);
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
    return ()=>{if(zoomFrame)cancelAnimationFrame(zoomFrame);viewerRef.current=null;loadedSceneRef.current=null;viewer.destroy();};
  },[]);
  useEffect(()=>{
    const viewer=viewerRef.current;
    if(!viewer||loadedSceneRef.current===scene.id)return;
    let disposed=false;
    const next=scene;
    void viewer.setPanorama(next.dataUrl,{
      showLoader:false,transition:{effect:'fade',rotation:false,speed:260},
      position:{yaw:next.arrivalYaw??0,pitch:next.arrivalPitch??0},
      zoom:next.arrivalZoom??60
    }).then(success=>{
      if(disposed||!success)return;
      loadedSceneRef.current=next.id;
      const height=box.current?.clientHeight||550;
      resetMarkers(viewer,markersForScene(next,actions.current.icons,height,actions.current.selectedId,actions.current.preview,viewer.getZoomLevel()));
    }).catch(()=>{/* Keep the previous panorama if the image fails to load. */});
    return ()=>{disposed=true;};
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

function App(){
  const [project,setProject]=useState<StudioProject>(newProject());
  const [ready,setReady]=useState(false);
  const [activeId,setActiveId]=useState('');
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
  const [videoZoom,setVideoZoom]=useState<Hotspot|null>(null);
  const [introVisible,setIntroVisible]=useState(false);
  const [exporting,setExporting]=useState(false);
  const [cloudOpen,setCloudOpen]=useState(false);
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
  const [dragScene,setDragScene]=useState<string|null>(null);
  const [dropAt,setDropAt]=useState<number|null>(null);
  const viewAreaRef=useRef<HTMLDivElement>(null);
  const cameraRef=useRef({sceneId:'',yaw:0,pitch:0,zoom:60});
  const savedRef=useRef<StudioProject|null>(null);
  const [isFullscreen,setIsFullscreen]=useState(false);
  useEffect(()=>{
    const update=()=>setIsFullscreen(document.fullscreenElement===viewAreaRef.current);
    document.addEventListener('fullscreenchange',update);
    return ()=>document.removeEventListener('fullscreenchange',update);
  },[]);
  async function toggleFullscreen(){
    const node=viewAreaRef.current;
    if(!node)return;
    try {
      if(document.fullscreenElement){
        await document.exitFullscreen();
      }else{
        setPreview(true);
        if(project.introEnabled && project.introUrl.startsWith('https://'))setIntroVisible(true);
        setMode(null);
        setSelectedId('');
        await node.requestFullscreen();
      }
    }catch{
      setStatus('Le plein écran n’est pas disponible sur ce navigateur');
    }
  }

  useEffect(()=>{
    loadProject().then(p=>{
      if (p) {
        const upgraded=ensureFrameReferences(validateProject(p),viewAreaRef.current?.clientHeight||550);
        savedRef.current=upgraded;
        setProject(upgraded);setActiveId(upgraded.scenes[0]?.id ?? '');
      }
      setReady(true);setStatus('Prêt');
    }).catch(()=>{setReady(true);setStatus('Stockage indisponible');});
  },[]);
  useEffect(()=>{
    // Ne réécrit pas toute la base (panoramas en base64) juste après le chargement ou sans modification.
    if(!ready||project===savedRef.current)return;
    const t=setTimeout(()=>{
      setStatus('Sauvegarde…');
      const snapshot=project;
      saveProject({...snapshot,updatedAt:new Date().toISOString()})
        .then(()=>{savedRef.current=snapshot;setStatus('Sauvegardé localement');})
        .catch(()=>setStatus('Erreur de sauvegarde : exporte ton projet'));
    },1500);
    return ()=>clearTimeout(t);
  },[project,ready]);

  const active=project.scenes.find(s=>s.id===activeId) ?? null;
  const selected=active?.hotspots.find(h=>h.id===selectedId) ?? null;
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
    if(!project.scenes.length){setStatus('Importe au moins un panorama avant de publier');return;}
    setExporting(true);
    setStatus('Préparation du dossier HTML…');
    try {
      await exportStaticTour(project);
      setStatus('Dossier HTML prêt — archive ZIP téléchargée');
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
  function saveArrivalView(){
    if(!active)return;
    const view=cameraRef.current;
    if(view.sceneId!==active.id){setStatus('Oriente d’abord le panorama puis réessaie');return;}
    patchScene(sc=>({...sc,arrivalYaw:view.yaw,arrivalPitch:view.pitch,arrivalZoom:view.zoom}));
    setStatus('Vue d’arrivée sauvegardée pour '+active.name);
  }
  function moveHotspot(id:string,yaw:number,pitch:number){
    patchScene(sc=>({...sc,hotspots:sc.hotspots.map(h=>h.id===id?{...h,yaw,pitch}:h)}));
  }
  function dropIcon(iconId:string,yaw:number,pitch:number){
    const icon=project.icons.find(i=>i.id===iconId);
    if(!active||!icon)return;
    const h:Hotspot={id:uid(),type:'information',title:icon.name,text:'',target:'',yaw,pitch,iconId};
    patchScene(sc=>({...sc,hotspots:[...sc.hotspots,h]}));
    setPanel('points');setSelectedId(h.id);setMode(null);
    setStatus('Icône positionnée : déplace-la dans le panorama pour l’ajuster');
  }
  function patchScene(patch:(s:Scene)=>Scene){
    setProject(p=>({...p,scenes:p.scenes.map(s=>s.id===activeId?patch(s):s)}));
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
  function triggerBar(item:BottomBarItem){
    if(!preview){setSelectedBarId(item.id);setPanel('bar');setSelectedId('');return;}
    if(item.type==='navigation'){
      const dest=item.target || project.scenes[0]?.id;
      if(dest && project.scenes.some(s=>s.id===dest))setActiveId(dest);
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
      setProject(p=>({...p,scenes:[...p.scenes,...next]}));
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
  }
  function removeScene(){
    if(!active||!window.confirm('Supprimer le panorama « '+active.name+' » ?'))return;
    const remaining=project.scenes.filter(s=>s.id!==active.id).map(s=>({...s,hotspots:s.hotspots.filter(h=>h.target!==active.id)}));
    setProject(p=>({...p,scenes:remaining,bottomBar:p.bottomBar.map(b=>b.target===active.id?{...b,target:''}:b)}));setActiveId(remaining[0]?.id??'');setSelectedId('');
  }
  function download(){
    const blob=new Blob([JSON.stringify(project)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;link.download=(project.name.replace(/[^a-zA-Z0-9-]/g,'_')||'visite')+'.nvstudio.json';
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  async function openProject(file?:File){
    if(!file)return;
    try {
      if(file.size>250*1024*1024)throw new Error('Fichier trop volumineux');
      const imported=ensureFrameReferences(validateProject(JSON.parse(await file.text())),viewAreaRef.current?.clientHeight||550);
      if(!window.confirm('Remplacer le projet actuellement ouvert par ce fichier ?'))return;
      setProject(imported);setActiveId(imported.scenes[0]?.id??'');setSelectedId('');setMode(null);setPreview(false);
      setStatus('Projet importé');
    }catch(e){window.alert('Impossible d’ouvrir ce projet : '+String(e));}
    finally {if(projectInput.current)projectInput.current.value='';}
  }
  function startFresh(){
    if(project.scenes.length && !window.confirm('Créer un nouveau projet ? Pense à exporter celui-ci avant.'))return;
    setProject(newProject());setActiveId('');setSelectedId('');setMode(null);setPreview(false);
  }
  return <div className="app">
    <header className="topbar">
      <div className="brand">
        <div className="brand-logo">◉</div>
        <div>
          <strong>NovaVisio <span>Studio</span></strong>
          <small>ÉDITEUR DE VISITES 360°</small>
        </div>
      </div>
      <div className="project-name">
        <div className="project-name-wrapper">
          <Edit3 size={13} className="project-edit-icon" />
          <input aria-label="Nom du projet" value={project.name} onChange={e=>setProject(p=>({...p,name:e.target.value}))}/>
        </div>
        <span className="save-chip">{status}</span>
      </div>
      <div className="top-actions">
        <div className="mode-switch-group">
          <button type="button" className={'mode-btn ' + (!preview ? 'is-active' : '')} onClick={() => { if(preview) { setPreview(false); setIntroVisible(false); } }}>
            <Edit3 size={13}/> Mode Édition
          </button>
          <button type="button" className={'mode-btn ' + (preview ? 'is-active' : '')} onClick={() => {
            if(!preview) {
              if (project.introEnabled && project.introUrl.startsWith('https://')) setIntroVisible(true);
              else setIntroVisible(false);
              setPreview(true); setMode(null); setSelectedId('');
            }
          }}>
            <Eye size={13}/> Aperçu
          </button>
        </div>
        <button className="quiet" onClick={startFresh} title="Nouveau projet">Nouveau</button>
        <button className="quiet" onClick={()=>projectInput.current?.click()} title="Ouvrir un projet .nvstudio.json">Ouvrir</button>
        <button className="quiet" onClick={download} title="Sauvegarder le projet localement">
          <Download size={13} style={{marginRight:4,verticalAlign:'-1px'}}/> Sauvegarder
        </button>
        <button className="quiet" onClick={()=>setCloudOpen(true)} title="Synchroniser avec Supabase">
          <Cloud size={13} style={{marginRight:4,verticalAlign:'-1px'}}/> Cloud
        </button>
        <button className="primary" disabled={exporting} onClick={()=>void exportTour()}>
          <Sparkles size={14} style={{marginRight:5,verticalAlign:'-2px'}}/>
          {exporting?'Export…':'Exporter HTML / ZIP'}
        </button>
      </div>
    </header>
    <div className="workspace">
      <aside className="left panel">
        <div className="section-title">
          <span>PANORAMAS</span>
          <span className="counter">{project.scenes.length}</span>
        </div>
        <button className="import" onClick={()=>upload.current?.click()}>
          <Plus size={14} style={{marginRight:5,verticalAlign:'-2px'}}/> Importer des panoramas 360°
        </button>
        <div className="scenes" onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setDropAt(null);}}>{project.scenes.map((s,i)=><div key={s.id}
          className={'scene-slot'+(dragScene===s.id?' is-dragging':'')+(dropAt===i?' drop-before':'')+(dropAt===i+1&&i===project.scenes.length-1?' drop-after':'')}
          draggable
          onDragStart={e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('application/x-nv-scene',s.id);e.dataTransfer.setData('text/plain',s.name);setDragScene(s.id);}}
          onDragEnd={()=>{setDragScene(null);setDropAt(null);}}
          onDragOver={e=>{
            if(!dragScene)return;
            e.preventDefault();e.dataTransfer.dropEffect='move';
            const r=e.currentTarget.getBoundingClientRect();
            setDropAt(e.clientY<r.top+r.height/2?i:i+1);
          }}
          onDrop={e=>{
            e.preventDefault();
            const id=dragScene,at=dropAt;
            setDragScene(null);setDropAt(null);
            if(id!==null&&at!==null)moveScene(id,at);
          }}>
          <button className={'scene '+(s.id===activeId?'active':'')} title="Glisse pour changer l’ordre (ou Alt + ↑ / ↓)"
            onKeyDown={e=>{
              if(!e.altKey||(e.key!=='ArrowUp'&&e.key!=='ArrowDown'))return;
              e.preventDefault();
              moveScene(s.id,e.key==='ArrowUp'?i-1:i+2);
            }}
            onClick={()=>{setActiveId(s.id);setSelectedId('');setMode(null);}}>
            <img src={s.dataUrl} alt="Miniature du panorama" draggable={false}/>
            <span>
              <strong>{s.name}</strong>
              <small>Scène {i+1}{i===0?' · accueil':''} · {s.hotspots.length} point(s)</small>
            </span>
          </button>
        </div>)}</div>
        <div className="helper">
          <strong>✦ Guide rapide</strong>
          <p>Clique sur un point dans le 360° pour modifier directement ses propriétés à droite.</p>
          <button className="help" onClick={()=>setHelp(true)}>Guide de démarrage →</button>
        </div>
      </aside>
      <main className="editor">
        <div className="editor-top">
          <span>PROJET / <strong>{active?.name??'Nouvelle visite'}</strong></span>
          <b className={preview ? 'status-preview' : mode ? 'status-adding' : 'status-edit'}>
            {preview ? '👁️ APERÇU INTERACTIF' : mode ? '📍 CLIQUEZ DANS LE PANORAMA POUR PLACER LE POINT' : '✏️ MODE ÉDITION'}
          </b>
        </div>
        <div className="view-area" ref={viewAreaRef}>
          {active?<Panorama scene={active} icons={project.icons} mode={mode} preview={preview} onCreate={newPoint} onPick={id=>{setSelectedId(id);setSelectedBarId('');setPanel('points');}} onNavigate={id=>{if(project.scenes.some(s=>s.id===id))setActiveId(id);}} onInfo={h=>{setFrame(null);setInfo(h);}} onLink={openLinkInTour} onImage={h=>{setImageZoom(h);setInfo(null);setFrame(null);}} onVideo={h=>{setVideoZoom(h);setInfo(null);setFrame(null);}} selectedId={selectedId}
            onWorldFrameChange={(id,corners,center)=>patchScene(sc=>({...sc,hotspots:sc.hotspots.map(h=>h.id===id?
              {...h,frameSphericalCorners:corners,yaw:center?.yaw??h.yaw,pitch:center?.pitch??h.pitch}:h)}))}
            onMarkerMove={moveHotspot} onAssetDrop={dropIcon}
            onCameraChange={(yaw,pitch,zoom)=>{cameraRef.current={sceneId:activeId,yaw,pitch,zoom};}}/>:<div className="empty">
            <div className="empty-icon">◎</div><h1>Ta première visite commence ici</h1>
            <p>Importe des photos équirectangulaires 360° pour commencer à créer ta visite interactive.</p>
            <button className="primary" onClick={()=>upload.current?.click()}>＋ Importer mes photos 360°</button><small>JPG, PNG ou WebP · rapport 2:1 recommandé</small>
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
          {active && <button type="button" className="view-fullscreen-button" onClick={()=>void toggleFullscreen()} title={isFullscreen?'Quitter le plein écran':'Passer en plein écran'} aria-label={isFullscreen?'Quitter le plein écran':'Passer en plein écran'}>
            {isFullscreen?<Minimize size={20} strokeWidth={2.1}/>:<Maximize size={20} strokeWidth={2.1}/>}
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
          {videoZoom && <VideoPopup hotspot={videoZoom} onClose={()=>setVideoZoom(null)}/>}
          {active && <ContinuousMusic project={project} scene={active} paused={!preview||!!videoZoom||introVisible}/>}
          {imageZoom?.imageDataUrl && <div className={'image-lightbox '+(imageZoom.fadeOnClick!==false?'with-fade':'')} onClick={()=>setImageZoom(null)}>
            <button type="button" aria-label="Fermer l'image" className="lightbox-close" onClick={()=>setImageZoom(null)}>✕</button>
            <img src={imageZoom.imageDataUrl} alt={imageZoom.title} onClick={e=>e.stopPropagation()}/>
          </div>}
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
          <div className="grow"/><button className="tool danger" onClick={removeScene} title="Supprimer la scène active">
            <Trash2 size={13} style={{marginRight:4,verticalAlign:'-2px'}}/> Supprimer scène
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
                <label>Scène de destination
                  <select value={selected.target} onChange={e=>patchPoint({target:e.target.value})}>
                    <option value="">Sélectionner une scène…</option>
                    {project.scenes.filter(sc=>sc.id!==activeId).map(sc=><option key={sc.id} value={sc.id}>{sc.name}</option>)}
                  </select>
                </label>
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

              <div className="arrival-view-card">
                <div className="section-title">VUE D’ARRIVÉE DU PANORAMA</div>
                <p>Oriente la visite dans la direction souhaitée et choisis le zoom, puis enregistre ce cadrage.</p>
                <button type="button" onClick={saveArrivalView}>◎ Définir la vue actuelle comme arrivée</button>
                {active.arrivalYaw!==undefined&&<small className="arrival-saved">✓ Enregistrée · angle {Math.round(active.arrivalYaw*180/Math.PI)}° · zoom {Math.round(active.arrivalZoom??60)}%</small>}
              </div>

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
            <span>{item.title}</span><small>{item.type==='navigation'?'Scène':item.type==='information'?'Info':'Lien'}</small>
          </button>)}</div>
          <button className="import" onClick={()=>addBar('information')}>＋ Ajouter un bouton</button>
          <button className="preset-button" onClick={()=>{if(window.confirm('Remplacer la barre actuelle par le modèle bordeaux à 5 icônes ? Les icônes importées resteront disponibles.')){setProject(p=>({...p,bottomBar:defaultBar()}));setSelectedBarId('');}}}>↻ Appliquer le modèle 5 icônes</button>
          {selectedBar && <>
            <hr/>
            <div className="section-title">CONFIGURER LE BOUTON</div>
            <label>Libellé<input value={selectedBar.title} onChange={e=>patchBar({title:e.target.value})}/></label>
            <label>Action<select value={selectedBar.type} onChange={e=>patchBar({type:e.target.value as BottomBarItem['type']})}>
              <option value="navigation">Aller vers un panorama</option><option value="information">Afficher des informations</option><option value="lien">Ouvrir un lien / réserver / appeler</option>
            </select></label>
            {selectedBar.type==='navigation'?<label>Scène de destination<select value={selectedBar.target} onChange={e=>patchBar({target:e.target.value})}><option value="">Première scène (accueil)</option>{project.scenes.map(sc=><option key={sc.id} value={sc.id}>{sc.name}</option>)}</select></label>
            : selectedBar.type==='information'?<><label>Contenu du panneau<textarea rows={5} value={selectedBar.text} onChange={e=>patchBar({text:e.target.value})} placeholder="Horaires, description, informations utiles…"/></label>
              <label>Page intégrée (optionnel)<input type="text" value={selectedBar.url} placeholder="https://… menu, photos, réservations" onChange={e=>patchBar({url:e.target.value})}/></label>
              <small className="hint-inline">Si tu renseignes une URL, elle remplacera le texte par une fenêtre intégrée.</small></>
            :<label>Lien de destination<input type="text" value={selectedBar.url} placeholder="https://… ou tel:+33…" onChange={e=>patchBar({url:e.target.value})}/>{selectedBar.url && !safeLink(selectedBar.url)&&<small className="warning-inline">Adresse invalide : https://, mailto: ou tel: requis</small>}</label>}
            <div className="section-title">MES PNG — NORMAL, SURVOL, CLIC</div>
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
    <footer><span>NovaVisio Studio · Prototype v0.6</span><span>{project.scenes.length} panoramas · {totalPoints} points</span><span>Stockage local sur cet appareil</span></footer>
    <input ref={upload} hidden type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>void addImages(e.target.files)}/>
    <input ref={stateIconInput} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>void importStateIcon(e.target.files?.[0])}/>
    <input ref={projectInput} hidden type="file" accept=".json,.nvstudio.json,application/json" onChange={e=>void openProject(e.target.files?.[0])}/>
    <input ref={iconInput} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={e=>void addIconFiles(e.target.files)}/>
    <input ref={replaceIconInput} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>void replaceIconEverywhere(e.target.files?.[0])}/>
    <input ref={videoInput} hidden type="file" accept="video/mp4,video/webm" onChange={e=>void addVideo(e.target.files?.[0])}/>
    <input ref={audioInput} hidden type="file" accept="audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/x-wav,audio/webm,audio/mp4" onChange={e=>void addAudio(e.target.files?.[0])}/>
    {cloudOpen&&<CloudPanel project={project} onClose={()=>setCloudOpen(false)} onBackup={download} onStatus={setStatus}
      onOpen={p=>{const up=ensureFrameReferences(p,viewAreaRef.current?.clientHeight||550);setProject(up);setActiveId(up.scenes[0]?.id??'');setSelectedId('');setMode(null);setPreview(false);}}/>}
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
