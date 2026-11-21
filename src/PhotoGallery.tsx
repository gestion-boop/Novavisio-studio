import {useEffect,useMemo,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import type {MediaLinkItem} from './storage';
import {resolveLink} from './mediaLinks';
import {XMark} from './XMark';

/** Galerie de photos / vidéos ouverte par un bouton de la barre : vignettes, puis visionneuse plein écran (flèches, clavier, balayage). */
export function PhotoGallery({title,items,onClose}:{title:string;items:MediaLinkItem[];onClose:()=>void}){
  const [index,setIndex]=useState<number|null>(null);
  const touch=useRef<number|null>(null);
  const resolved=useMemo(()=>items.map(item=>({item,r:resolveLink(item)})),[items]);
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
  const current=index!==null?resolved[index]:null;
  // Toucher le fond (hors des photos) ferme la galerie : seul moyen de sortir sur téléphone, sans croix.
  const closeOnBackdrop=(e:React.MouseEvent<HTMLElement>)=>{if(index===null&&e.target===e.currentTarget)onClose();};
  return <div className="nv-photo-gallery" role="dialog" aria-modal="true" aria-label={title} onClick={closeOnBackdrop}>
    <header><strong>{title}</strong><span>{count} {count>1?'éléments':'élément'}</span>
</header>
    {count===0?<p className="nv-pg-empty">Aucune photo dans cette galerie.</p>:
      <div className="nv-pg-grid" onClick={closeOnBackdrop}>{resolved.map(({item,r},i)=>{
        const src=r.thumb??r.image;
        return <button type="button" key={item.id} className="nv-pg-tile" onClick={()=>setIndex(i)} aria-label={item.name}>
          {item.kind==='photo'?(src?<img src={src} alt={item.name} loading="lazy" referrerPolicy="no-referrer"/>:<span className="nv-pg-wait">…</span>):<span className="nv-pg-video">▶</span>}
          <em>{item.name}</em>
        </button>;})}</div>}
    {current&&<div className="nv-pg-viewer" onClick={()=>setIndex(null)}
      onTouchStart={e=>{touch.current=e.touches[0].clientX;}}
      onTouchEnd={e=>{if(touch.current===null)return;const dx=e.changedTouches[0].clientX-touch.current;touch.current=null;if(Math.abs(dx)>50)go(dx<0?1:-1);}}>
      <button type="button" className="nv-pg-close" onClick={e=>{e.stopPropagation();setIndex(null);}} aria-label="Retour à la galerie"><XMark/></button>
      {count>1&&<button type="button" className="nv-pg-nav is-prev" onClick={e=>{e.stopPropagation();go(-1);}} aria-label="Précédent"><ChevronLeft size={34}/></button>}
      <figure onClick={e=>e.stopPropagation()}>
        {current.item.kind==='photo'
          ?(current.r.image?<img src={current.r.image} alt={current.item.name} referrerPolicy="no-referrer"/>:<span className="nv-pg-wait">Chargement…</span>)
          :current.r.video?<video src={current.r.video} controls autoPlay playsInline/>
          :current.r.embed?<iframe src={current.r.embed} title={current.item.name} allow="autoplay; fullscreen" allowFullScreen/>:<span className="nv-pg-wait">Vidéo indisponible</span>}
        <figcaption>{current.item.name} · {(index??0)+1}/{count}</figcaption>
      </figure>
      {count>1&&<button type="button" className="nv-pg-nav is-next" onClick={e=>{e.stopPropagation();go(1);}} aria-label="Suivant"><ChevronRight size={34}/></button>}
    </div>}
  </div>;
}
