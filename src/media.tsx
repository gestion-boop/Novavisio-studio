import {useEffect,useLayoutEffect,useRef,useState,type RefObject,type ReactNode} from 'react';
import {Play,Volume2,VolumeX,X,ZoomIn,ZoomOut,RotateCcw} from 'lucide-react';
import {perspectiveMatrix,escapeAttribute} from './imageFrame';
import {defaultFrameCorners,type CustomIcon,type Hotspot,type ImageFrameStyle,type Scene} from './storage';
import {XMark} from './XMark';
import {getPrefs} from './visitorPrefs';
import {trimIcon} from './iconFit';

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

/** Source d'icône recadrée sur son contenu visible (si `enabled`) ; en attendant le recadrage, l'image d'origine est utilisée. */
function useTrimmed(src:string|undefined,enabled:boolean){
  const [out,setOut]=useState<{from:string;to:string}|null>(null);
  useEffect(()=>{
    if(!enabled||!src)return;
    let live=true;
    void trimIcon(src).then(to=>{if(live)setOut({from:src,to});});
    return ()=>{live=false;};
  },[src,enabled]);
  return enabled&&src&&out?.from===src?out.to:src;
}
export function IconStateVisual({icons,normal,hover,pressed,size,zoom=1,trim=false}:{icons:CustomIcon[];normal?:string;hover?:string;pressed?:string;size:number;zoom?:number;trim?:boolean}) {
  const rawMain=iconById(icons,normal),rawHover=iconById(icons,hover),rawPress=iconById(icons,pressed);
  const main=useTrimmed(rawMain,trim),hov=useTrimmed(rawHover,trim),prs=useTrimmed(rawPress,trim);
  if(!main)return null;
  return <span className="nv-icon-states nv-bar-png" style={{width:size,height:size,...(zoom!==1?{transform:'scale('+zoom+')'}:{})}}>
    <img alt="" draggable={false} className="nv-state-normal" src={main}/>
    <img alt="" draggable={false} className="nv-state-hover" src={hov??main}/>
    <img alt="" draggable={false} className="nv-state-press" src={prs??hov??main}/>
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
    el.volume=(scene.audioVolume??50)/100;
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
/** `animation` : effet choisi par l'auteur (réglage général ou du point). « fade » / absent = zoom depuis l'icône (historique). */
export function useZoomTransition(origin:ZoomOrigin|null|undefined,enabled:boolean,onClose:()=>void,animation?:string){
  const custom=!!animation&&animation!=='fade';
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
    bodyClass:enabled?(closing?' nv-zoom-out':(custom?'':' nv-zoom-in')):'',
    anim:custom?animation:undefined};
}

const LOUPE_MAX=8;
/**
 * Loupe : zoom et déplacement dans une image agrandie (cartes, plans, affiches…).
 * Boutons + / − / retour, molette (centrée sur le curseur), glisser pour se déplacer, pincement à deux doigts, double-clic.
 */
function ImageLoupe({src,alt,frameStyle}:{src:string;alt:string;frameStyle:ImageFrameStyle}){
  const [t,setT]=useState({s:1,x:0,y:0});
  const view=useRef<HTMLDivElement>(null);
  const tRef=useRef(t);tRef.current=t;
  const pointers=useRef(new Map<number,{x:number;y:number}>());
  const drag=useRef<{x:number;y:number;tx:number;ty:number}|null>(null);
  const pinch=useRef<{d:number;s:number}|null>(null);
  const limit=(s:number,x:number,y:number)=>{
    const el=view.current;const w=el?.clientWidth??0,h=el?.clientHeight??0;
    const mx=Math.max(0,(s-1)*w/2),my=Math.max(0,(s-1)*h/2);
    return {s,x:Math.max(-mx,Math.min(mx,x)),y:Math.max(-my,Math.min(my,y))};
  };
  /** Zoom d'un facteur, autour du point (px, py) mesuré depuis le centre de l'image. */
  const zoomBy=(factor:number,px=0,py=0)=>setT(cur=>{
    const s=Math.max(1,Math.min(LOUPE_MAX,cur.s*factor));
    if(s===1)return {s:1,x:0,y:0};
    const k=s/cur.s;
    return limit(s,px-(px-cur.x)*k,py-(py-cur.y)*k);
  });
  const fromCenter=(clientX:number,clientY:number)=>{
    const r=view.current!.getBoundingClientRect();
    return {x:clientX-(r.left+r.width/2),y:clientY-(r.top+r.height/2)};
  };
  useEffect(()=>{
    const el=view.current;if(!el)return;
    const onWheel=(e:WheelEvent)=>{e.preventDefault();const p=fromCenter(e.clientX,e.clientY);zoomBy(e.deltaY<0?1.2:1/1.2,p.x,p.y);};
    el.addEventListener('wheel',onWheel,{passive:false});
    return ()=>el.removeEventListener('wheel',onWheel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  const down=(e:React.PointerEvent)=>{
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.current.size===2){
      const [a,b]=[...pointers.current.values()];
      pinch.current={d:Math.hypot(a.x-b.x,a.y-b.y)||1,s:tRef.current.s};drag.current=null;
    }else drag.current={x:e.clientX,y:e.clientY,tx:tRef.current.x,ty:tRef.current.y};
  };
  const move=(e:React.PointerEvent)=>{
    if(!pointers.current.has(e.pointerId))return;
    pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.current.size>=2&&pinch.current){
      const [a,b]=[...pointers.current.values()];
      const d=Math.hypot(a.x-b.x,a.y-b.y)||1;
      const p=fromCenter((a.x+b.x)/2,(a.y+b.y)/2);
      const target=Math.max(1,Math.min(LOUPE_MAX,pinch.current.s*d/pinch.current.d));
      zoomBy(target/tRef.current.s,p.x,p.y);
    }else if(drag.current&&tRef.current.s>1){
      const dx=e.clientX-drag.current.x,dy=e.clientY-drag.current.y;
      setT(cur=>limit(cur.s,drag.current!.tx+dx,drag.current!.ty+dy));
    }
  };
  const up=(e:React.PointerEvent)=>{pointers.current.delete(e.pointerId);if(pointers.current.size<2)pinch.current=null;if(!pointers.current.size)drag.current=null;};
  const dbl=(e:React.MouseEvent)=>{const p=fromCenter(e.clientX,e.clientY);if(tRef.current.s>1)setT({s:1,x:0,y:0});else zoomBy(2.5,p.x,p.y);};
  const zoomed=t.s>1;
  return <>
    <div ref={view} className={'nv-zoom-view'+(zoomed?' is-zoomed':'')} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onDoubleClick={dbl}>
      <img className={('nv-photo-frame nv-photo-frame-'+frameStyle).trim()} src={src} alt={alt} draggable={false} style={{transform:'translate('+t.x.toFixed(1)+'px,'+t.y.toFixed(1)+'px) scale('+t.s.toFixed(3)+')'}}/>
    </div>
    <div className="nv-loupe-tools" role="group" aria-label="Loupe">
      <button type="button" className="nv-loupe-btn" aria-label="Agrandir" title="Agrandir (ou molette, ou double-clic)" disabled={t.s>=LOUPE_MAX} onClick={()=>zoomBy(1.6)}><ZoomIn size={22}/></button>
      <button type="button" className="nv-loupe-btn" aria-label="Réduire" title="Réduire" disabled={!zoomed} onClick={()=>zoomBy(1/1.6)}><ZoomOut size={22}/></button>
      <button type="button" className="nv-loupe-btn" aria-label="Taille d’origine" title="Revenir à la taille d’origine" disabled={!zoomed} onClick={()=>setT({s:1,x:0,y:0})}><RotateCcw size={20}/></button>
      {zoomed&&<span className="nv-loupe-level" aria-live="polite">×{t.s.toFixed(1).replace('.',',')}</span>}
    </div>
  </>;
}

export function ZoomImage({src,alt,origin,animate,variant,frameStyle='none',animation,onClose}:{animation?:string;frameStyle?:ImageFrameStyle;src:string;alt:string;origin?:ZoomOrigin|null;animate:boolean;variant:'studio'|'tour';onClose:()=>void}) {
  const z=useZoomTransition(origin,animate,onClose,animation);
  // La croix est collée au coin supérieur droit de l'image (et suit son animation), pas au coin de l'écran.
  const wrap=(close:ReactNode)=><div ref={z.body as never} data-win-anim={z.anim} className={('nv-zoom-wrap'+z.bodyClass).trim()} onClick={e=>e.stopPropagation()}>
    <ImageLoupe src={src} alt={alt} frameStyle={frameStyle}/>
    {close}
  </div>;
  if(variant==='tour')return <div ref={z.overlay} className={'tour-image-viewer'+z.overlayClass} onClick={z.requestClose}>
    {wrap(<button className="tour-close-image" onClick={z.requestClose} type="button" aria-label="Fermer"><X/></button>)}
  </div>;
  return <div ref={z.overlay} className={'image-lightbox'+z.overlayClass} onClick={z.requestClose}>
    {wrap(<button type="button" aria-label="Fermer l'image" className="lightbox-close" onClick={z.requestClose}><XMark/></button>)}
  </div>;
}

export function VideoPopup({hotspot,onClose,origin,animation}:{animation?:string;hotspot:Hotspot;onClose:()=>void;origin?:ZoomOrigin|null}) {
  const ref=useRef<HTMLVideoElement>(null);
  const z=useZoomTransition(origin,hotspot.fadeOnClick!==false,onClose,animation);
  const [blocked,setBlocked]=useState(false);
  const url=hotspot.videoDataUrl||hotspot.videoUrl;
  const embed=!url?hotspot.videoEmbed:undefined;
  useEffect(()=>{
    const el=ref.current;
    if(!el)return;
    let live=true;
    const vol=Math.max(0,Math.min(100,hotspot.videoVolume??100));
    el.volume=vol/100;
    el.muted=getPrefs().sound==='off'||vol===0;
    el.play().then(()=>{if(live)setBlocked(false);}).catch(()=>{if(live)setBlocked(true);});
    return ()=>{live=false;el.pause();};
  },[url,hotspot.videoVolume]);
  if(!url&&!embed)return null;
  return <div ref={z.overlay} className={'nv-video-overlay'+z.overlayClass} onClick={z.requestClose} role="presentation">
    <section ref={z.body} data-win-anim={z.anim} className={'nv-video-dialog'+z.bodyClass} onClick={e=>e.stopPropagation()} aria-label={'Vidéo : '+hotspot.title}>
      <button type="button" onClick={z.requestClose} className="nv-video-close" aria-label="Fermer la vidéo"><X size={24}/></button>
      {embed?<><iframe className="nv-video-embed" src={embed} title={hotspot.title} allow="autoplay; fullscreen; encrypted-media" allowFullScreen referrerPolicy="no-referrer"/><a className="nv-video-open" href={embed} target="_blank" rel="noopener noreferrer">Ouvrir dans un nouvel onglet</a></>
        :<video ref={ref} src={url} controls playsInline loop={hotspot.videoLoop!==false} preload="metadata"/>}
      {blocked&&<button type="button" className="nv-video-start" onClick={()=>{
        const el=ref.current;if(!el)return;
        el.muted=(hotspot.videoVolume??100)===0;
        el.play().then(()=>setBlocked(false)).catch(()=>setBlocked(true));
      }}><Play size={20}/> Lancer la vidéo avec le son</button>}
      <div className="nv-video-caption">{hotspot.title}</div>
    </section>
  </div>;
}
