import {useEffect,useRef,useState} from 'react';
import {Play,Volume2,VolumeX,X} from 'lucide-react';
import {perspectiveMatrix,escapeAttribute} from './imageFrame';
import {defaultFrameCorners,type CustomIcon,type Hotspot,type Scene} from './storage';

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

export function VideoPopup({hotspot,onClose}:{hotspot:Hotspot;onClose:()=>void}) {
  const ref=useRef<HTMLVideoElement>(null);
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
  return <div className="nv-video-overlay" onClick={onClose} role="presentation">
    <section className="nv-video-dialog" onClick={e=>e.stopPropagation()} aria-label={'Vidéo : '+hotspot.title}>
      <button type="button" onClick={onClose} className="nv-video-close" aria-label="Fermer la vidéo"><X size={24}/></button>
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
