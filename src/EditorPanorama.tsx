import {isReturnLink,displayPitch} from './returnLink';
import {isPopupMedia,popupMediaMarkerHtml} from './mediaDisplay';
import {framedPhotoSource} from './photoFrame';
import {useEffect,useRef,useState} from 'react';
import {imageMarkerHtml,responsiveFrameSize} from './imageFrame';
import {iconStateHtml,videoMarkerHtml,type ZoomOrigin} from './media';
import {attachSphereLayer} from './sphereLayer';
import {PANORAMA_MIN_FOV,PANORAMA_MAX_FOV,panoramaArrivalZoom} from './panoramaLens';
import {Info} from 'lucide-react';
import {Viewer} from '@photo-sphere-viewer/core';
import {MarkersPlugin,type MarkerConfig} from '@photo-sphere-viewer/markers-plugin';
import {syncMarkers,resetMarkers} from './markerSync';
import {attachSunFlare} from './sunFlare';
import {startPosterBounce} from './posterBounce';
import {isFrame,straightenFrames,frameIdsOf,haloMarkers,frameWorldCorners,visibleVideoFrames,editingFrameControls,cornerMarkerId,centerMarkerId,FRAME_KEYS,type SphericalPoint} from './sphericalFrame';
import {type Hotspot,type CustomIcon,type Scene,type StudioProject,defaultFrameCorners,type FrameSphericalCorners} from './storage';
import {getTransitionMs,warmPanoramas} from './transitionPrefs';
import {glyphs} from './glyphSet';
import {inPhase} from './phase';
import {occluderMarkers,maskDraftMarkers,needsOccluder} from './frameOcclusion';
import {installPhotoGrade,type GradeHandle,type PhotoGrade} from './photoGrade';

export type EditMode = Hotspot['type'] | null;
export type PanelTab = 'tool' | 'medialib' | 'points' | 'panoramas' | 'bar' | 'icons' | 'intro' | 'elements' | 'music' | 'settings' | 'client' | 'plan';
export type EmbedFrame = { title:string; url:string; full?:boolean };
export function ensureFrameReferences(project:StudioProject,height:number):StudioProject {
  const baseline=Math.max(100,Math.min(3000,height||550));
  return {...project,scenes:project.scenes.map(s=>({...s,hotspots:s.hotspots.map(h=>
    (h.type==='image'||h.type==='video')&&!h.frameReferenceHeight?{...h,frameReferenceHeight:baseline}:h
  )}))};
}

export const barColorFields:Array<{key:'background'|'outline'|'button'|'buttonOutline'|'icon';label:string}> = [
  {key:'background',label:'Fond de la barre'},
  {key:'outline',label:'Contour de la barre'},
  {key:'button',label:'Fond des boutons'},
  {key:'buttonOutline',label:'Contour des boutons'},
  {key:'icon',label:'Couleur des pictogrammes'}
];
/** Motifs de la visite (flèche, photo, vidéo…) : une icône glossy chacun, avec son pictogramme. */
export const VISIT_MOTIFS:ReadonlyArray<{key:keyof typeof glyphs;label:string}>=[
  {key:'arrow',label:'Flèche'},{key:'camera',label:'Photo'},{key:'video',label:'Vidéo'},{key:'map',label:'Localisation'},
  {key:'images',label:'Images'},{key:'plan',label:'Carte'},{key:'panorama',label:'Panorama'},{key:'utensils',label:'Restaurant'},
  {key:'soundOn',label:'Son activé'},{key:'soundOff',label:'Son coupé'},{key:'settings',label:'Paramètres'},
];
export type GlyphKey = keyof typeof glyphs;
export function BarGlyph({name}:{name:string}) {
  const Glyph = glyphs[name as GlyphKey] ?? Info;
  return <Glyph size={29} strokeWidth={1.9} aria-hidden="true" />;
}
export function safeLink(raw:string):string|null {
  const link = raw.trim();
  if (!/^(https?:\/\/|mailto:|tel:)/i.test(link)) return null;
  try { const url=new URL(link); return ['https:','http:','mailto:','tel:'].includes(url.protocol)?link:null; }
  catch { return null; }
}
export function launchLink(link:string) {
  const verified=safeLink(link);
  if (!verified) return false;
  if (/^https?:/i.test(verified)) window.open(verified,'_blank','noopener,noreferrer');
  else window.location.href=verified;
  return true;
}
export type PanoramaProps = {
  /** Détourage : points du contour en cours de tracé (yaw, pitch) et clic qui ajoute un point au lieu de créer un point interactif. */
  maskDraft?:[number,number][];onMaskClick?:(yaw:number,pitch:number)=>void;
  /** Retouche en direct de la photo du panorama (jamais des incrustations). */
  photoGrade?:PhotoGrade|null;
  sphereImage:(sceneId:string)=>string|undefined;
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
/** Panorama de départ : le premier qui est coché (un panorama décoché ne doit jamais servir de point d'entrée). */
export const startSceneId=(scenes:{id:string;excluded?:boolean}[])=>(scenes.find(sc=>!sc.excluded)??scenes[0])?.id??'';
export function markerFor(h:Hotspot,icons:CustomIcon[],viewerHeight:number,selectedId:string,preview:boolean,zoom=60,autoNavigation=false,all:readonly Hotspot[]=[]):MarkerConfig {
  // Image and video layers are rendered ON the sphere, not as HTML billboards.
  // Every pixel stays anchored to its four world-coordinate corners at any zoom or yaw.
  if(h.type==='image'&&h.imageDataUrl&&!isPopupMedia(h)){
    return {id:h.id,imageLayer:framedPhotoSource(h),position:frameWorldCorners(h),hoverScale:false,opacity:(!preview&&selectedId===h.id)?0.3:1};
  }
  const videoSource=h.videoDataUrl||h.videoUrl;
  if(h.type==='video'&&videoSource&&!isPopupMedia(h)){
    return {id:h.id,videoLayer:videoSource,position:frameWorldCorners(h),
      autoplay:h.videoAutoplay!==false,hoverScale:false,opacity:(!preview&&selectedId===h.id)?0.3:1};
  }
  const isMedia=(h.type==='image'||h.type==='video')&&!isPopupMedia(h);
  const isSphere=h.type==='navigation'&&!!h.sphere&&!!h.target;
  const back=isReturnLink(h);
  const sz=(back?.8:1)*(isSphere?Math.max(40,Math.min(120,h.iconSize??90)):isPopupMedia(h)?Math.min(80,Math.max(16,h.iconSize??42)):Math.max(16,Math.min(80,h.iconSize??28)));
  const scaled=isMedia?responsiveFrameSize(h,viewerHeight,zoom):null;
  const width=scaled?.width??sz;
  const height=scaled?.height??sz;
  const symbol=back?'↩':h.type==='navigation'?'➜':h.type==='lien'?'↗':'i';
  const iconHtml=iconStateHtml(icons,h.iconId,h.hoverIconId,h.pressedIconId);
  const content=isSphere?'<span class="nv-sphere-hit"></span>':isPopupMedia(h)?popupMediaMarkerHtml(h,icons):h.type==='image'?imageMarkerHtml(undefined,h.frameCorners??defaultFrameCorners(),width,height,h.title):
    h.type==='video'?videoMarkerHtml(h,width,height):
    iconHtml||'<span class="nv-marker" style="width:100%;height:100%" aria-label="Point interactif">'+symbol+'</span>';
  const editing=!preview&&selectedId===h.id;
  const autoArrow=!preview&&autoNavigation&&h.type==='navigation';
  const redCross='<button type="button" class="nv-marker-remove-auto" aria-label="Supprimer cet élément" title="Supprimer cet élément"><XMark/></button>';
  const html=autoArrow?'<span class="nv-drag-target nv-nav-auto-marker" data-nv-marker-id="'+h.id+'">'+content+redCross+'</span>':
    editing?'<span class="nv-drag-target" data-nv-marker-id="'+h.id+'">'+content+
      '<button type="button" class="nv-marker-move-grip" aria-label="Déplacer ce point" title="Glisser pour déplacer ce point">✥</button>'+redCross+'</span>':content;
  return {id:h.id,position:{yaw:h.yaw,pitch:displayPitch(h,all)},
    html,...(back?{className:'nv-return-marker'}:{}),
    size:{width,height},anchor:'center center',tooltip:h.title,
    ...(isSphere?{data:{nvSphere:{size:sz,target:h.target,rim:h.sphereRimColor,glow:h.sphereRimIntensity}}}:{})};
}
/** Contour de détourage en cours de tracé, mis à jour par le composant avant chaque synchronisation des marqueurs. */
let maskDraftNow:[number,number][]|undefined;
export function markersForScene(scene:Scene,icons:CustomIcon[],height:number,selectedId:string,preview:boolean,zoom=60,autoNavigation=false,night=false):MarkerConfig[]{
  const all:MarkerConfig[]=[];
  // Aperçu comme édition : seuls les points du moment choisi (jour / nuit) sont affichés.
  for(const h of (preview?visibleVideoFrames(scene.hotspots):scene.hotspots).filter(point=>inPhase(point,night))){
    all.push(markerFor(h,icons,height,selectedId,preview,zoom,autoNavigation,scene.hotspots));
    if(preview)all.push(...(haloMarkers(h) as unknown as MarkerConfig[]));
    const hasMedia=h.type==='image'?!!h.imageDataUrl:
      h.type==='video'?!!(h.videoDataUrl||h.videoUrl):false;
    // Pendant le tracé d'un détourage, les poignées du cadre sont masquées : elles intercepteraient les clics.
    if(!preview&&selectedId===h.id&&hasMedia&&!isPopupMedia(h)&&maskDraftNow===undefined){
      all.push(...editingFrameControls(h));
    }
    // Détourage : le calque qui reprend l'objet de premier plan passe par-dessus l'écran incrusté.
    if(!night&&isFrame(h)&&needsOccluder(h))all.push(...occluderMarkers(h,scene.dataUrl));
  }
  if(maskDraftNow?.length)all.push(...maskDraftMarkers(maskDraftNow));
  return all;
}
/** Lightweight, read-only spherical preview for a hovered gallery entry.
 * Only one instance exists, and it never changes the editor's active scene.
 */
export function FullscreenGalleryHoverPreview({scene,thumb,onOrientation}:{scene:Scene;thumb?:string;onOrientation?:(view:{yaw:number;pitch:number;zoom:number})=>void}){
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

export function Panorama({photoGrade,maskDraft,onMaskClick,sphereImage,scene,icons,mode,preview,autoNavigation,night,nightTexture,arrival,onCreate,onPick,onRemoveNavigation,onNavigate,onInfo,onLink,onImage,onVideo,selectedId,onWorldFrameChange,onMarkerMove,onAssetDrop,onCameraChange,turn}:PanoramaProps) {
  const box = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer|null>(null);
  const gradeRef=useRef<GradeHandle|null>(null);
  const loadedSceneRef=useRef<string|null>(null);
  const currentTextureRef=useRef(scene.dataUrl);
  const dayViewRef=useRef<{yaw:number;pitch:number;zoom:number}|null>(null);
  const lastPointer=useRef<ZoomOrigin|null>(null);
  const suppressMarkerClick=useRef<string|null>(null); // Suppress only the click belonging to a removed or dragged marker.
  maskDraftNow=maskDraft;
  const gradeNow=useRef<PhotoGrade|null|undefined>(photoGrade);gradeNow.current=photoGrade;
  const actions = useRef({onMaskClick,sphereImage,scene,icons,mode,preview,autoNavigation,night,arrival,onCreate,onPick,onRemoveNavigation,onNavigate,onInfo,onLink,onImage,onVideo,selectedId,onWorldFrameChange,onMarkerMove,onAssetDrop,onCameraChange});
  actions.current = {onMaskClick,sphereImage,scene,icons,mode,preview,autoNavigation,night,arrival,onCreate,onPick,onRemoveNavigation,onNavigate,onInfo,onLink,onImage,onVideo,selectedId,onWorldFrameChange,onMarkerMove,onAssetDrop,onCameraChange};

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
    const photoGradeHandle=installPhotoGrade(viewer);gradeRef.current=photoGradeHandle;photoGradeHandle.set(gradeNow.current??null);
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
        syncMarkers(viewer,markersForScene(a.scene,a.icons,box.current!.clientHeight||550,a.selectedId,a.preview,viewer.getZoomLevel(),a.autoNavigation,a.night));
      });
    };
    viewer.addEventListener('zoom-updated',onZoom);
    const markers = viewer.getPlugin(MarkersPlugin) as MarkersPlugin;
    const detachSpheres=attachSphereLayer(viewer,id=>actions.current.sphereImage(id));
    viewer.addEventListener('before-render',()=>{const ids=frameIdsOf(actions.current.scene.hotspots);if(ids.length)straightenFrames(markers,ids);});
    // La loupe de précision (panneau de droite) rend le cadre quasi invisible pendant qu'on règle un coin.
    const onDim=(e:Event)=>{const d=(e as CustomEvent<{id:string;opacity:number}>).detail;try{markers.updateMarker({id:d.id,opacity:d.opacity},false);markers.renderMarkers();viewer.needsUpdate();}catch{/* cadre supprimé */}};
    window.addEventListener('nv-frame-dim',onDim);
    markers.addEventListener('select-marker',({marker})=>{
      const a=actions.current;
      const h=a.scene.hotspots.find(item=>item.id===marker.id);
      if (!h) return;
      if(a.onMaskClick)return;   // détourage en cours : un clic sur l'écran sert à placer un point du contour
      if(suppressMarkerClick.current===marker.id){suppressMarkerClick.current=null;return;}
      if (a.preview) {
        if(h.type==='navigation' && h.target && !a.night) a.onNavigate(h.target,h);
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
      if(a.onMaskClick)return;   // tracé d'un détourage : géré par l'écouteur ci-dessous
      if(!a.preview && a.mode && typeof event.data.yaw==='number' && typeof event.data.pitch==='number') {
        a.onCreate(event.data.yaw,event.data.pitch);
      }
    });
    const height=box.current?.clientHeight||550;
    resetMarkers(viewer,markersForScene(scene,icons,height,selectedId,preview,viewer.getZoomLevel(),actions.current.autoNavigation,actions.current.night));
    // Aperçu seulement : léger rebond des affiches (photos / vidéos) pour montrer qu'elles sont cliquables.
    const stopBounce=startPosterBounce(viewer,()=>actions.current.scene,()=>actions.current.preview&&loadedSceneRef.current===actions.current.scene.id);
    return ()=>{detachSpheres();window.removeEventListener('nv-frame-dim',onDim);stopBounce();if(zoomFrame)cancelAnimationFrame(zoomFrame);viewerRef.current=null;loadedSceneRef.current=null;viewer.destroy();};
  },[]);
  useEffect(()=>{
    const viewer=viewerRef.current;
    if(!viewer||loadedSceneRef.current===scene.id)return;
    let disposed=false;
    const next=scene;
    const pending=actions.current.arrival;
    const arrivalFor=pending&&pending.sceneId===next.id?pending:null;
    // Fondu de l'ensemble du lecteur (panorama + cadres + photos) :
    // on évite que les images incrustées disparaissent seules au milieu du fondu.
    // Les coordonnées sauvegardées ne sont jamais modifiées.
    const host=box.current;
    let timer:ReturnType<typeof setTimeout>|undefined;
    const veil=document.createElement('div');
    veil.setAttribute('aria-hidden','true');
    Object.assign(veil.style,{
      position:'absolute',inset:'0',zIndex:'18',pointerEvents:'none',
      background:'#071925',opacity:'0',transition:'opacity '+Math.max(1,Math.round(getTransitionMs()/2))+'ms ease-in-out'
    });
    const half=Math.round(getTransitionMs()/2);
    // Précharge les panoramas atteignables depuis celui-ci (adresses réseau uniquement).
    warmPanoramas(next.hotspots.filter(h=>h.type==='navigation').map(h=>h.target?actions.current.sphereImage(h.target):undefined));
    if(host){
      if(getComputedStyle(host).position==='static')host.style.position='relative';
      host.appendChild(veil);
    }
    const finish=()=>{if(timer!==undefined)clearTimeout(timer);veil.remove();};
    const restore=()=>{
      const current=actions.current.scene;
      if(loadedSceneRef.current===current.id){
        syncMarkers(viewer,markersForScene(current,actions.current.icons,box.current?.clientHeight||550,actions.current.selectedId,actions.current.preview,viewer.getZoomLevel(),actions.current.autoNavigation,actions.current.night));
      }
      veil.style.opacity='0';
      timer=setTimeout(finish,half+10);
    };
    const arrivalPos={yaw:arrivalFor?.yaw??next.arrivalYaw??0,pitch:arrivalFor?.pitch??next.arrivalPitch??0};
    const arrivalZoom=arrivalFor?.zoom??panoramaArrivalZoom(next);
    const nextTexture=night&&nightTexture?nightTexture:next.dataUrl;
    // Première moitié du fondu : masquer l'ancienne scène et ses incrustations ensemble.
    requestAnimationFrame(()=>{if(!disposed)veil.style.opacity='1';});
    timer=setTimeout(()=>{
      if(disposed)return;
      resetMarkers(viewer,[]);
      void viewer.setPanorama(nextTexture,{
        showLoader:false,transition:{effect:'fade',rotation:false,speed:0},
        position:arrivalPos,zoom:arrivalZoom,
      }).then(success=>{
        if(disposed)return;
        if(!success){restore();return;}
        loadedSceneRef.current=next.id;
        currentTextureRef.current=nextTexture;
        const camera=viewer.getPosition();
        actions.current.onCameraChange(camera.yaw,camera.pitch,viewer.getZoomLevel());
        syncMarkers(viewer,markersForScene(next,actions.current.icons,box.current?.clientHeight||550,actions.current.selectedId,actions.current.preview,viewer.getZoomLevel(),actions.current.autoNavigation,actions.current.night));
        // Deuxième moitié : photo et cadre sont déjà ensemble sur le nouveau panorama.
        veil.style.opacity='0';
        timer=setTimeout(finish,half+10);
      }).catch(()=>{if(!disposed)restore();});
    },half+5);
    return ()=>{disposed=true;if(timer!==undefined)clearTimeout(timer);veil.remove();};
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
    const here=viewer.getPosition(),hereZoom=viewer.getZoomLevel();
    const goingNight=!!(night&&nightTexture);
    let position=here,zoom=hereZoom;
    if(goingNight){
      dayViewRef.current={yaw:here.yaw,pitch:here.pitch,zoom:hereZoom};
      if(scene.nightYaw!==undefined&&scene.nightPitch!==undefined){position={yaw:scene.nightYaw,pitch:scene.nightPitch};if(scene.nightZoom!==undefined)zoom=scene.nightZoom;}
    }else if(dayViewRef.current){position={yaw:dayViewRef.current.yaw,pitch:dayViewRef.current.pitch};zoom=dayViewRef.current.zoom;dayViewRef.current=null;}
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
      syncMarkers(v,markersForScene(a.scene,a.icons,height,a.selectedId,a.preview,v.getZoomLevel(),a.autoNavigation,a.night));
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
    syncMarkers(v,markersForScene(scene,icons,element.clientHeight||550,selectedId,preview,v.getZoomLevel(),autoNavigation,night));
  },[scene.id,scene.hotspots,icons,selectedId,preview,autoNavigation,night]);
  useEffect(()=>{
    const v=viewerRef.current;
    if(!v||loadedSceneRef.current!==scene.id)return;
    return attachSunFlare(v,scene.sunFlare);
  },[scene.id,scene.sunFlare?.yaw,scene.sunFlare?.pitch,scene.sunFlare?.intensity,scene.sunFlare?.length,scene.sunFlare?.orientation,scene.sunFlare?.rays]);
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
      const cornerLabel:Record<string,string>={tl:'Coin Haut-Gauche',tr:'Coin Haut-Droit',br:'Coin Bas-Droit',bl:'Coin Bas-Gauche'};
      const hudPrefix=movingCenter?'✥ Cadre entier':(key&&cornerLabel[key]?`✥ ${cornerLabel[key]}`:'✥ Coin');
      const startRect=root.getBoundingClientRect();
      const hudEl=document.createElement('div');
      hudEl.className='nv-pano-drag-hud';
      hudEl.textContent=hudPrefix;
      hudEl.style.left=`${event.clientX-startRect.left}px`;
      hudEl.style.top=`${Math.max(24,event.clientY-startRect.top-42)}px`;
      root.appendChild(hudEl);
      // Pendant le déplacement, la poignée devient un anneau transparent avec un réticule : on voit exactement où le coin se pose.
      const ghost=()=>{const el=root.querySelector<HTMLElement>(movingCenter?'.nv-sphere-center[data-frame-id="'+id+'"]':'[data-frame-id="'+id+'"][data-corner="'+key+'"]');el?.classList.add('is-dragging');};
      ghost();root.classList.add('nv-frame-dragging');
      // L'image / la vidéo devient quasi invisible pendant le geste : on voit le décor exact sous les pointillés.
      // Pendant le geste le contenu est masqué (contour et coins seulement) : la vidéo n'est plus décodée ni redessinée à chaque mouvement.
      const dimFrame=(o:number)=>{try{plugin.updateMarker({id:h.id,opacity:o,visible:o>.05},false);plugin.renderMarkers();viewer.needsUpdate();}catch{/* cadre supprimé */}};
      dimFrame(0);
      // Les mouvements de souris sont fusionnés : un seul calcul et une seule mise à jour par image écran (sinon l'application se fige).
      let pendingPointer:PointerEvent|null=null;let frameReq=0;
      const update=(pointer:PointerEvent)=>{
        if(pointer.pointerId!==event.pointerId)return;
        pointer.preventDefault();
        pointer.stopImmediatePropagation();
        pendingPointer=pointer;
        if(!frameReq)frameReq=requestAnimationFrame(()=>{frameReq=0;const p=pendingPointer;pendingPointer=null;if(p)applyUpdate(p);});
      };
      const applyUpdate=(pointer:PointerEvent)=>{
        if(pointer.pointerId!==event.pointerId)return;
        pointer.preventDefault();
        pointer.stopImmediatePropagation();
        const rect=root.getBoundingClientRect();
        if(!rect.width||!rect.height)return;
        const relX=pointer.clientX-rect.left;
        const relY=pointer.clientY-rect.top;
        const point=viewer.dataHelper.viewerCoordsToSphericalCoords({
          x:relX,y:relY
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
        const yawDeg=Math.round((point.yaw*180)/Math.PI);
        const pitchDeg=Math.round((point.pitch*180)/Math.PI);
        hudEl.textContent=`${hudPrefix} · ${yawDeg}° · ${pitchDeg>=0?'+':''}${pitchDeg}°`;
        hudEl.style.left=`${relX}px`;
        hudEl.style.top=`${Math.max(24,relY-42)}px`;
        try {
          plugin.updateMarker({id:h.id,position:coords},false);
          FRAME_KEYS.forEach((corner,i)=>{
            plugin.updateMarker({id:cornerMarkerId(h.id,corner),position:coords[i]},false);
          });
          plugin.updateMarker({id:centerMarkerId(h.id),position:center},false);
          plugin.renderMarkers();
          ghost();
          viewer.needsUpdate(); // repaint the WebGL photo/video layer while dragging
        }catch{
          // If the frame was deleted during a drag, the edit will simply stop.
        }
      };
      const cleanup=()=>{
        if(frameReq){cancelAnimationFrame(frameReq);frameReq=0;}
        pendingPointer=null;
        dimFrame(0.3);
        hudEl.remove();
        root.classList.remove('nv-frame-dragging');root.querySelectorAll('.is-dragging').forEach(el=>el.classList.remove('is-dragging'));
        document.removeEventListener('pointermove',update,true);
        document.removeEventListener('pointerup',finish,true);
        document.removeEventListener('pointercancel',cancel,true);
      };
      const finish=(pointer:PointerEvent)=>{
        if(pointer.pointerId!==event.pointerId)return;
        if(frameReq){cancelAnimationFrame(frameReq);frameReq=0;}
        pendingPointer=null;
        applyUpdate(pointer);
        const rect=root.getBoundingClientRect();
        const dropX=pointer.clientX-rect.left;
        const dropY=pointer.clientY-rect.top;
        cleanup();
        if(touched){
          const ripple=document.createElement('div');
          ripple.className='nv-pano-drop-ripple';
          ripple.style.left=`${dropX}px`;
          ripple.style.top=`${dropY}px`;
          root.appendChild(ripple);
          window.setTimeout(()=>ripple.remove(),700);
          actions.current.onWorldFrameChange(h.id,coords,movingCenter?center:undefined);
        }
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
    let reticleEl:HTMLDivElement|null=null;

    const removeReticle=()=>{
      root.classList.remove('is-icon-drag-over');
      if(reticleEl){reticleEl.remove();reticleEl=null;}
    };

    const spawnPanoRipple=(x:number,y:number)=>{
      const ripple=document.createElement('div');
      ripple.className='nv-pano-drop-ripple';
      ripple.style.left=`${x}px`;
      ripple.style.top=`${y}px`;
      root.appendChild(ripple);
      window.setTimeout(()=>ripple.remove(),700);
    };

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

      const startX=e.clientX;
      const startY=e.clientY;
      let hudEl:HTMLDivElement|null=null;

      const getMarkerNode=()=>root.querySelector<HTMLElement>(`.nv-drag-target[data-nv-marker-id="${CSS.escape(id)}"]`)??item;

      const activateDragVisuals=()=>{
        const node=getMarkerNode();
        node.classList.remove('is-hold-charging');
        node.classList.add('is-marker-dragging');
        root.classList.add('is-dragging-hotspot');
        if(!hudEl){
          hudEl=document.createElement('div');
          hudEl.className='nv-pano-drag-hud';
          hudEl.textContent='✥ Déplacement libre';
          const rect=root.getBoundingClientRect();
          hudEl.style.left=`${startX-rect.left}px`;
          hudEl.style.top=`${startY-rect.top-38}px`;
          root.appendChild(hudEl);
        }
      };

      // En mode classique la poignée déplace directement. En Auto, appui maintenu
      // 320 ms sur la flèche : clic bref = navigation, maintien = déplacement.
      let dragging=!autoDrag;
      if(!autoDrag){
        e.preventDefault();
        e.stopImmediatePropagation();
        activateDragVisuals();
      }else{
        item.classList.add('is-hold-charging');
      }

      let timer:ReturnType<typeof setTimeout>|null=autoDrag?setTimeout(()=>{
        dragging=true;
        suppressMarkerClick.current=id;
        activateDragVisuals();
      },320):null;

      let final:{yaw:number;pitch:number}|null=null;
      const move=(p:PointerEvent)=>{
        if(p.pointerId!==e.pointerId)return;
        if(!dragging){
          // Si l'utilisateur bouge la caméra avant la fin des 320 ms, on annule la charge
          if(Math.hypot(p.clientX-startX,p.clientY-startY)>10){
            clear();
          }
          return;
        }
        p.preventDefault();p.stopImmediatePropagation();
        const rect=root.getBoundingClientRect();
        const relX=p.clientX-rect.left;
        const relY=p.clientY-rect.top;
        const at=viewer.dataHelper.viewerCoordsToSphericalCoords({x:relX,y:relY});
        if(!at)return;
        final=at;
        try{(viewer.getPlugin(MarkersPlugin) as MarkersPlugin).updateMarker({id,position:at});}catch{}
        const node=getMarkerNode();
        node.classList.add('is-marker-dragging');
        if(hudEl){
          const yawDeg=Math.round((at.yaw*180)/Math.PI);
          const pitchDeg=Math.round((at.pitch*180)/Math.PI);
          hudEl.textContent=`✥ ${yawDeg}° · ${pitchDeg>=0?'+':''}${pitchDeg}°`;
          hudEl.style.left=`${relX}px`;
          hudEl.style.top=`${Math.max(24,relY-42)}px`;
        }
      };
      const clear=()=>{
        if(timer){clearTimeout(timer);timer=null;}
        const node=getMarkerNode();
        node.classList.remove('is-hold-charging','is-marker-dragging');
        item.classList.remove('is-hold-charging','is-marker-dragging');
        root.classList.remove('is-dragging-hotspot');
        if(hudEl){hudEl.remove();hudEl=null;}
        document.removeEventListener('pointermove',move,true);
        document.removeEventListener('pointerup',up,true);
        document.removeEventListener('pointercancel',cancel,true);
      };
      const up=(p:PointerEvent)=>{
        if(p.pointerId!==e.pointerId)return;
        if(dragging)move(p);
        const wasDragging=dragging&&!!final;
        const rect=root.getBoundingClientRect();
        const dropX=p.clientX-rect.left;
        const dropY=p.clientY-rect.top;
        clear();
        if(final){
          actions.current.onMarkerMove(id,final.yaw,final.pitch);
          if(wasDragging)spawnPanoRipple(dropX,dropY);
        }
        if(autoDrag&&dragging)setTimeout(()=>{if(suppressMarkerClick.current===id)suppressMarkerClick.current=null;},350);
      };
      const cancel=(p:PointerEvent)=>{if(p.pointerId===e.pointerId){clear();suppressMarkerClick.current=null;}};
      document.addEventListener('pointermove',move,true);
      document.addEventListener('pointerup',up,true);
      document.addEventListener('pointercancel',cancel,true);
    };
    const over=(e:DragEvent)=>{
      if(!e.dataTransfer?.types.includes('application/x-nv-icon')||actions.current.preview)return;
      e.preventDefault();
      e.dataTransfer.dropEffect='copy';
      root.classList.add('is-icon-drag-over');
      const rect=root.getBoundingClientRect();
      const x=e.clientX-rect.left;
      const y=e.clientY-rect.top;
      if(!reticleEl){
        reticleEl=document.createElement('div');
        reticleEl.className='nv-pano-reticle';
        reticleEl.innerHTML='<span class="nv-pano-reticle-ring"></span><span class="nv-pano-reticle-dot"></span><span class="nv-pano-reticle-label">Déposer dans le 360°</span>';
        root.appendChild(reticleEl);
      }
      reticleEl.style.left=`${x}px`;
      reticleEl.style.top=`${y}px`;
    };
    const leave=(e:DragEvent)=>{
      if(e.relatedTarget instanceof Node&&root.contains(e.relatedTarget))return;
      removeReticle();
    };
    const drop=(e:DragEvent)=>{
      const icon=e.dataTransfer?.getData('application/x-nv-icon');
      removeReticle();
      if(!icon||actions.current.preview)return;
      const viewer=viewerRef.current;if(!viewer)return;
      e.preventDefault();
      const rect=root.getBoundingClientRect();
      const x=e.clientX-rect.left;
      const y=e.clientY-rect.top;
      const pos=viewer.dataHelper.viewerCoordsToSphericalCoords({x,y});
      if(pos){
        spawnPanoRipple(x,y);
        actions.current.onAssetDrop(icon,pos.yaw,pos.pitch);
      }
    };
    root.addEventListener('pointerdown',onDown,true);
    root.addEventListener('dragover',over);
    root.addEventListener('dragleave',leave);
    root.addEventListener('drop',drop);
    return ()=>{
      removeReticle();
      root.removeEventListener('pointerdown',onDown,true);
      root.removeEventListener('dragover',over);
      root.removeEventListener('dragleave',leave);
      root.removeEventListener('drop',drop);
    };
  },[]);
  // Tracé d'un détourage : un clic SUR un calque incrusté (l'affiche elle-même) ne déclenche pas le clic « panorama » du lecteur,
  // donc on écoute directement le pointeur et on convertit la position en yaw / pitch sur la sphère.
  const tracing=!!onMaskClick;
  useEffect(()=>{
    const el=box.current,v=viewerRef.current;
    if(!tracing||!el||!v)return;
    let down:{x:number;y:number}|null=null;
    const pd=(e:PointerEvent)=>{down={x:e.clientX,y:e.clientY};};
    const pu=(e:PointerEvent)=>{
      if(!down||e.button!==0)return;
      const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y)>5;down=null;
      if(moved)return;
      const r=el.getBoundingClientRect();
      const pos=v.dataHelper.viewerCoordsToSphericalCoords({x:e.clientX-r.left,y:e.clientY-r.top});
      if(pos)actions.current.onMaskClick?.(pos.yaw,pos.pitch);
    };
    el.addEventListener('pointerdown',pd,true);el.addEventListener('pointerup',pu,true);
    return ()=>{el.removeEventListener('pointerdown',pd,true);el.removeEventListener('pointerup',pu,true);};
  },[tracing]);
  // Zoom d'arrivée réglé au curseur : le panorama affiché suit en direct (le cap n'est pas touché).
  const arrivalZoomNow=panoramaArrivalZoom(scene);
  const lastZoomSet=useRef<{id:string;z:number}|null>(null);
  useEffect(()=>{
    const v=viewerRef.current;
    if(!v||loadedSceneRef.current!==scene.id)return;
    const prev=lastZoomSet.current;lastZoomSet.current={id:scene.id,z:arrivalZoomNow};
    if(!prev||prev.id!==scene.id||prev.z===arrivalZoomNow)return;   // pas de saut au changement de panorama
    try{v.zoom(arrivalZoomNow);}catch{/* lecteur détruit */}
  },[arrivalZoomNow,scene.id]);
  // Retouche de la photo du panorama en direct (curseurs Exposition, Contraste, Couleur…) : ne touche pas aux incrustations.
  useEffect(()=>{gradeRef.current?.set(photoGrade??null);},[photoGrade,scene.id]);
  // Détourage : le contour en cours se redessine à chaque point ajouté ; un calque prêt est ajouté aux marqueurs.
  useEffect(()=>{
    const v=viewerRef.current;
    if(!v||loadedSceneRef.current!==scene.id)return;
    const a=actions.current;
    syncMarkers(v,markersForScene(a.scene,a.icons,box.current?.clientHeight||550,a.selectedId,a.preview,v.getZoomLevel(),a.autoNavigation,a.night));
  },[maskDraft]);
  useEffect(()=>{
    const on=()=>{
      const v=viewerRef.current;if(!v)return;
      const a=actions.current;
      if(loadedSceneRef.current!==a.scene.id)return;
      syncMarkers(v,markersForScene(a.scene,a.icons,box.current?.clientHeight||550,a.selectedId,a.preview,v.getZoomLevel(),a.autoNavigation,a.night));
    };
    window.addEventListener('nv-occluder-ready',on);
    return ()=>window.removeEventListener('nv-occluder-ready',on);
  },[]);
  return <div ref={box} className="panorama" />;
}

