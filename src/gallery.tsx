import {useEffect} from 'react';
import {X} from 'lucide-react';
import type {BottomBarItem,Scene} from './storage';

/** Entrées d'une galerie de panoramas : seulement les panoramas qui existent encore, dans l'ordre choisi. */
export function galleryEntries(item:BottomBarItem,scenes:Scene[]):{sceneId:string;label:string;custom:string;sceneName:string}[]{
  const out:{sceneId:string;label:string;custom:string;sceneName:string}[]=[];
  const seen=new Set<string>();
  for(const g of item.gallery??[]){
    const scene=scenes.find(s=>s.id===g.sceneId);
    if(!scene||seen.has(scene.id))continue;
    seen.add(scene.id);
    out.push({sceneId:scene.id,label:g.label.trim()||scene.name,custom:g.label,sceneName:scene.name});
  }
  return out;
}

export type GalleryCard={sceneId:string;label:string;thumb?:string};
/** Galerie de raccourcis vers les panoramas : un clic sur une vignette emmène directement au panorama. */
export function PanoramaGallery({title,entries,currentId,onPick,onClose}:{title:string;entries:GalleryCard[];currentId?:string;onPick:(sceneId:string)=>void;onClose:()=>void}){
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};
    document.addEventListener('keydown',onKey);
    return ()=>document.removeEventListener('keydown',onKey);
  },[onClose]);
  return <div className="nv-gallery-overlay" onClick={onClose} role="presentation">
    <section className="nv-gallery" role="dialog" aria-label={title} onClick={e=>e.stopPropagation()}>
      <header><h2>{title}</h2><button type="button" className="nv-gallery-close" onClick={onClose} aria-label="Fermer la galerie"><X size={20}/></button></header>
      {entries.length?<div className="nv-gallery-grid">{entries.map(e=>
        <button type="button" key={e.sceneId} className={'nv-gallery-card'+(e.sceneId===currentId?' is-current':'')} onClick={()=>onPick(e.sceneId)}>
          <span className="nv-gallery-thumb">{e.thumb?<img src={e.thumb} alt="" loading="lazy" decoding="async" draggable={false}/>:<span className="nv-gallery-ph"/>}</span>
          <strong>{e.label}</strong>
        </button>)}</div>
      :<p className="nv-gallery-empty">Aucun panorama dans cette galerie.</p>}
    </section>
  </div>;
}
