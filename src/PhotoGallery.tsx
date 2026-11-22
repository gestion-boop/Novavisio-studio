import {useEffect,useMemo,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import type {MediaLinkItem} from './storage';
import {resolveLink} from './mediaLinks';
import {XMark} from './XMark';

/** Nom affichable : les noms techniques (codes appareil, extensions) ne sont jamais montrés au visiteur. */
export function displayName(name:string):string{
  const n=name.replace(/\.(jpe?g|png|webp|heic|gif|mp4|mov|webm)$/i,'').trim();
  if(!n)return '';
  if(/^(CAM\d|IMG[_-]?\d|DSC|DJI|PXL|GOPR|P\d{6,}|\d{6,})/i.test(n))return '';
  if(/\d{4,}/.test(n)&&!/\s/.test(n))return '';
  return n;
}
const pad=(n:number)=>String(n).padStart(2,'0');

/** Galerie de photos / vidéos ouverte par un bouton de la barre : mosaïque éditoriale aux couleurs du skin,
 *  puis visionneuse plein écran (flèches, clavier, balayage, bandeau de vignettes). */
export function PhotoGallery({title,items,onClose}:{title:string;items:MediaLinkItem[];onClose:()=>void}){
  const [index,setIndex]=useState<number|null>(null);
  const touch=useRef<number|null>(null);
  const strip=useRef<HTMLDivElement>(null);
  const resolved=useMemo(()=>items.map(item=>({item,r:resolveLink(item),label:displayName(item.name)})),[items]);
  const count=resolved.length;
  const go=(d:number)=>setIndex(i=>i===null||!count?i:(i+d+count)%count);
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(index!==null)setIndex(null);else onClose();}
      else if(index!==null&&e.key==='ArrowRight')go(1);
      else if(index!==null&&e.key==='ArrowLeft')go(-1);
    };
    window.addEventListener('keydown',key,true);return ()=>window.removeEventListener('keydown',key,true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[index,count]);
  useEffect(()=>{
    if(index===null)return;
    strip.current?.querySelector<HTMLElement>('[aria-current="true"]')?.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'});
  },[index]);
  const current=index!==null?resolved[index]:null;
  // Toucher le fond (hors des photos) ferme la galerie, y compris sur téléphone.
  const closeOnBackdrop=(e:React.MouseEvent<HTMLElement>)=>{if(index===null&&e.target===e.currentTarget)onClose();};
  return <div className="nv-photo-gallery nv-pg-lux" role="dialog" aria-modal="true" aria-label={title} onClick={closeOnBackdrop}>
    <header>
      <div className="nv-pg-heading">
        <small>Galerie</small>
        <strong>{title}</strong>
      </div>
      <span className="nv-pg-count">{pad(count)} {count>1?'photos':'photo'}</span>
      <button type="button" className="nv-pg-exit" onClick={onClose} aria-label="Fermer la galerie"><XMark/></button>
    </header>
    {count===0?<p className="nv-pg-empty">Aucune photo dans cette galerie.</p>:
      <div className="nv-pg-grid" onClick={closeOnBackdrop}>{resolved.map(({item,r,label},i)=>{
        const src=r.thumb??r.image;
        return <button type="button" key={item.id} className="nv-pg-tile" style={{animationDelay:Math.min(i,14)*45+'ms'}} onClick={()=>setIndex(i)} aria-label={label||('Photo '+(i+1))}>
          {item.kind==='photo'?(src?<img src={src} alt={label} loading="lazy" referrerPolicy="no-referrer"/>:<span className="nv-pg-wait">…</span>):<span className="nv-pg-video">▶</span>}
          <span className="nv-pg-index">{pad(i+1)}</span>
          {label&&<em>{label}</em>}
        </button>;})}</div>}
    {current&&<div className="nv-pg-viewer" onClick={()=>setIndex(null)}
      onTouchStart={e=>{touch.current=e.touches[0].clientX;}}
      onTouchEnd={e=>{if(touch.current===null)return;const dx=e.changedTouches[0].clientX-touch.current;touch.current=null;if(Math.abs(dx)>50)go(dx<0?1:-1);}}>
      <div className="nv-pg-viewer-top" onClick={e=>e.stopPropagation()}>
        <span className="nv-pg-counter"><b>{pad((index??0)+1)}</b> / {pad(count)}</span>
        {current.label&&<span className="nv-pg-caption">{current.label}</span>}
      </div>
      <button type="button" className="nv-pg-close" onClick={e=>{e.stopPropagation();setIndex(null);}} aria-label="Retour à la galerie"><XMark/></button>
      <div className="nv-pg-stage">
        {count>1&&<button type="button" className="nv-pg-nav is-prev" onClick={e=>{e.stopPropagation();go(-1);}} aria-label="Précédent"><ChevronLeft size={30} strokeWidth={1.5}/></button>}
        <figure key={current.item.id} onClick={e=>e.stopPropagation()}>
          {current.item.kind==='photo'
            ?(current.r.image?<img src={current.r.image} alt={current.label} referrerPolicy="no-referrer"/>:<span className="nv-pg-wait">Chargement…</span>)
            :current.r.video?<video src={current.r.video} controls autoPlay playsInline/>
            :current.r.embed?<iframe src={current.r.embed} title={current.label||'Vidéo'} allow="autoplay; fullscreen" allowFullScreen/>:<span className="nv-pg-wait">Vidéo indisponible</span>}
        </figure>
        {count>1&&<button type="button" className="nv-pg-nav is-next" onClick={e=>{e.stopPropagation();go(1);}} aria-label="Suivant"><ChevronRight size={30} strokeWidth={1.5}/></button>}
      </div>
      {count>1&&<div className="nv-pg-strip" ref={strip} onClick={e=>e.stopPropagation()}>
        {resolved.map(({item,r,label},i)=>{const src=r.thumb??r.image;return <button type="button" key={item.id} aria-current={i===index?'true':undefined} aria-label={label||('Photo '+(i+1))} onClick={()=>setIndex(i)}>
          {item.kind==='photo'&&src?<img src={src} alt="" loading="lazy" referrerPolicy="no-referrer"/>:<span>▶</span>}
        </button>;})}
      </div>}
    </div>}
  </div>;
}
