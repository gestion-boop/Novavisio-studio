import {useEffect,useLayoutEffect,useRef,useState,type RefObject,type ReactNode} from 'react';
import {Play,Volume2,VolumeX,X} from 'lucide-react';
import {perspectiveMatrix,escapeAttribute} from './imageFrame';
import {defaultFrameCorners,type CustomIcon,type Hotspot,type ImageFrameStyle,type Scene} from './storage';
import {XMark} from './XMark';

export const iconById=(icons:CustomIcon[],id?:string)=>icons.find(icon=>icon.id===id)?.dataUrl;

export function iconStateHtml(icons:CustomIcon[],normal?:string,hover?:string,pressed?:string,kind:'nv-marker'|'tour-marker'='nv-marker'):string {
  const src=iconById(icons,normal);
  if(!src)return '';
  const hoverSrc=iconById(icons,hover)??src;
  const pressedSrc=iconById(icons,pressed)??hoverSrc;
  return '<span class="'+kind+' '+kind+'-custom nv-icon-states">'+
    '<img class="nv-state-normal" src="'+escapeAttribute(src)+'" draggable="false" alt=""/>'+
    '<img class="nv-state-hover" src="'+escapeAttribute(hoverSrc)+'" draggable="false" alt=""/>'+
    '<img class="nv-state-press" src="'+escapeAttribute(pressedSrc)+'" draggable="false" alt=""/>'+
  '</span>';
}

export function IconStateVisual({icons,normal,hover,pressed,size}:{icons:CustomIcon[];normal?:string;hover?:string;pressed?:string;size:number}) {
  const main=iconById(icons,normal);
  if(!main)return null;
  return <span className="nv-icon-states nv-bar-png" style={{width:size,height:size}}>
    <img alt="" draggable={false} className="nv-state-normal" src={main}/>
    <img alt="" draggable={false} className="nv-state-hover" src={iconById(icons,hover)??main}/>
    <img alt="" draggable={false} className="nv-state-press" src={iconById(icons,pressed)??iconById(icons,hover)??main}/>
  </span>;
}

export function videoMarkerHtml(h:Hotspot,width:number,height:number):string {
  const source=h.videoDataUrl||h.videoUrl;
  const matrix=perspectiveMatrix(h.frameCorners??defaultFrameCorners(),width,height);
  if(!source)return '<span class="nv-frame-host nv-frame-placeholder">＋ Ajouter une vidéo</span>';
  const loop=h.videoLoop!==false?' loop':'';
  const autoplay=h.videoAutoplay!==false?' autoplay':'';
  return '<span class="nv-frame-host nv-tv-marker"><video class="nv-frame-video" src="'+escapeAttribute(source)+
    '" playsinline muted preload="metadata"'+loop+autoplay+' style="transform:'+matrix+'"></video>'+
    '<span class="nv-tv-play">▶</span></span>';
}

export function SceneAudio({scene,paused=false}:{scene:Scene;paused?:boolean}) {
  const audio=useRef<HTMLAudioElement>(null);
  const [needsGesture,setNeedsGesture]=useState(false);
  const [muted,setMuted]=useState(false);
  const src=scene.audioDataUrl||scene.audioUrl;
  useEffect(()=>{
    const el=audio.current;
    if(!el||!src||scene.audioEnabled===false)return;
    el.volume=(scene.audioVolume??65)/100;
    el.muted=muted;
    if(paused){el.pause();return;}
    let disposed=false;
    el.play().then(()=>{if(!disposed)setNeedsGesture(false);}).catch(()=>{if(!disposed)setNeedsGesture(true);});
    return ()=>{disposed=true;el.pause();};
  },[scene.id,src,scene.audioEnabled,scene.audioVolume,paused,muted]);
  if(!src || scene.audioEnabled===false)return null;
  return <div className="nv-audio-layer">
    <audio ref={audio} src={src} loop={scene.audioLoop!==false} preload="auto"/>
    {needsGesture?
      <button type="button" className="nv-audio-start" onClick={()=>{audio.current?.play().then(()=>setNeedsGesture(false)).catch(()=>setNeedsGesture(true));}}>
        <Volume2 size={16}/> Activer le son
      </button>:
      <button type="button" className="nv-audio-mute" title={muted?'Réactiver le son':'Couper le son'} onClick={()=>{
        setMuted(value=>!value);
      }}>{muted?<VolumeX size={16}/>:<Volume2 size={16}/>}</button>}
  </div>;
}


/** Point (écran) où l'on a cliqué pour ouvrir la photo / vidéo : l'image « vient » de là vers le plein écran. */
export type ZoomOrigin={x:number;y:number};
/**
 * Animation d'ouverture/fermeture : la photo ou la vidéo part de l'endroit cliqué, grossit progressivement
 * jusqu'au plein écran avec un fondu, et refait le trajet inverse à la fermeture.
 * Désactivée si `enabled` est faux (option « fondu » du cadre décochée).
 */
export function useZoomTransition(origin:ZoomOrigin|null|undefined,enabled:boolean,onClose:()=>void){
  const overlay=useRef<HTMLDivElement>(null);
  const body=useRef<HTMLElement>(null);
  const [closing,setClosing]=useState(false);
  useLayoutEffect(()=>{
    const o=overlay.current,b=body.current;
    if(!o||!b)return;
    const r=o.getBoundingClientRect();
    const dx=origin?origin.x-(r.left+r.width/2):0;
    const dy=origin?origin.y-(r.top+r.height/2):0;
    b.style.setProperty('--zx',Math.round(dx)+'px');
    b.style.setProperty('--zy',Math.round(dy)+'px');
    b.style.setProperty('--zs',origin?'.14':'.6');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  const requestClose=()=>{
    if(!enabled){onClose();return;}
    if(closing)return;
    setClosing(true);
    window.setTimeout(onClose,320);
  };
  return {overlay,body:body as RefObject<never>,requestClose,
    overlayClass:enabled?(closing?' nv-backdrop-out':' nv-backdrop-in'):'',
    bodyClass:enabled?(closing?' nv-zoom-out':' nv-zoom-in'):''};
}

export function ZoomImage({src,alt,origin,animate,variant,frameStyle='none',onClose}:{frameStyle?:ImageFrameStyle;src:string;alt:string;origin?:ZoomOrigin|null;animate:boolean;variant:'studio'|'tour';onClose:()=>void}){
  const z=useZoomTransition(origin,animate,onClose);
  // La croix est collée au coin supérieur droit de l'image (et suit son animation), pas au coin de l'écran.
  const wrap=(close:ReactNode)=><div ref={z.body as never} className={('nv-zoom-wrap'+z.bodyClass).trim()} onClick={e=>e.stopPropagation()}>
    <img className={('nv-photo-frame nv-photo-frame-'+frameStyle).trim()} src={src} alt={alt}/>
    {close}
  </div>;
  if(variant==='tour')return <div ref={z.overlay} className={'tour-image-viewer'+z.overlayClass} onClick={z.requestClose}>
    {wrap(<button className="tour-close-image" onClick={z.requestClose} type="button" aria-label="Fermer"><X/></button>)}
  </div>;
  return <div ref={z.overlay} className={'image-lightbox'+z.overlayClass} onClick={z.requestClose}>
    {wrap(<button type="button" aria-label="Fermer l'image" className="lightbox-close" onClick={z.requestClose}><XMark/></button>)}
  </div>;
}

export function VideoPopup({hotspot,onClose,origin}:{hotspot:Hotspot;onClose:()=>void;origin?:ZoomOrigin|null}) {
  const ref=useRef<HTMLVideoElement>(null);
  const z=useZoomTransition(origin,hotspot.fadeOnClick!==false,onClose);
  const [blocked,setBlocked]=useState(false);
  const url=hotspot.videoDataUrl||hotspot.videoUrl;
  useEffect(()=>{
    const el=ref.current;
    if(!el)return;
    let live=true;
    el.muted=false;
    el.play().then(()=>{if(live)setBlocked(false);}).catch(()=>{if(live)setBlocked(true);});
    return ()=>{live=false;el.pause();};
  },[url]);
  if(!url)return null;
  return <div ref={z.overlay} className={'nv-video-overlay'+z.overlayClass} onClick={z.requestClose} role="presentation">
    <section ref={z.body} className={'nv-video-dialog'+z.bodyClass} onClick={e=>e.stopPropagation()} aria-label={'Vidéo : '+hotspot.title}>
      <button type="button" onClick={z.requestClose} className="nv-video-close" aria-label="Fermer la vidéo"><X size={24}/></button>
      <video ref={ref} src={url} controls playsInline loop={hotspot.videoLoop!==false} preload="metadata"/>
      {blocked&&<button type="button" className="nv-video-start" onClick={()=>{
        const el=ref.current;if(!el)return;
        el.muted=false;
        el.play().then(()=>setBlocked(false)).catch(()=>setBlocked(true));
      }}><Play size={20}/> Lancer la vidéo avec le son</button>}
      <div className="nv-video-caption">{hotspot.title}</div>
    </section>
  </div>;
}
