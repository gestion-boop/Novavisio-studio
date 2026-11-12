import {useEffect} from 'react';
import {X} from 'lucide-react';
import type {BottomBarItem,Scene,StudioProject} from './storage';

/** Entrées d'une galerie de panoramas : seulement les panoramas qui existent encore, dans l'ordre choisi. */
export function galleryEntries(item:BottomBarItem,scenes:Scene[],spaces:StudioProject['spaces']=[]):{sceneId:string;label:string;custom:string;sceneName:string;spaceId?:string;coverDataUrl?:string}[]{
  const out:{sceneId:string;label:string;custom:string;sceneName:string;spaceId?:string;coverDataUrl?:string}[]=[];
  const seen=new Set<string>();
  for(const g of item.gallery??[]){
    const scene=scenes.find(s=>s.id===g.sceneId);
    if(!scene||seen.has(scene.id))continue;
    seen.add(scene.id);
    out.push({sceneId:scene.id,label:g.label.trim()||scene.name,custom:g.label,sceneName:scene.name});
  }
  for(const space of spaces??[]){if(!item.gallerySpaceIds?.includes(space.id))continue;const scene=scenes.find(s=>space.sceneIds.includes(s.id));if(scene)out.push({sceneId:scene.id,label:space.name,custom:'',sceneName:scene.name,spaceId:space.id,coverDataUrl:space.coverDataUrl} as typeof out[number]);}
  return out;
}

/** Image de fond d'un panneau : panorama (« scene:id ») ou couverture d'un espace (« space:id »). */
export function galleryBackgroundSrc(item:BottomBarItem,scenes:Scene[],spaces:StudioProject['spaces']=[],thumbs?:Record<string,string>):string|undefined{
  if(item.galleryBackgroundImage)return item.galleryBackgroundImage;
  const value=item.galleryBackground;
  if(!value)return undefined;
  const [kind,id]=[value.slice(0,value.indexOf(':')),value.slice(value.indexOf(':')+1)];
  if(kind==='scene'){const scene=scenes.find(s=>s.id===id);return scene?(thumbs?.[id]||scene.dataUrl||undefined):undefined;}
  if(kind==='space'){
    const space=(spaces??[]).find(sp=>sp.id===id);
    if(!space)return undefined;
    const first=scenes.find(s=>space.sceneIds.includes(s.id));
    return space.coverDataUrl||(first?(thumbs?.[first.id]||first.dataUrl||undefined):undefined);
  }
  return undefined;
}
export type GalleryCard={sceneId:string;label:string;thumb?:string;spaceId?:string};
/** Galerie de raccourcis vers les panoramas : un clic sur une vignette emmène directement au panorama. */
export function PanoramaGallery({title,entries,currentId,background,onPick,onClose}:{title:string;entries:GalleryCard[];currentId?:string;background?:string;onPick:(sceneId:string,spaceId?:string)=>void;onClose:()=>void}){
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};
    document.addEventListener('keydown',onKey);
    return ()=>document.removeEventListener('keydown',onKey);
  },[onClose]);
  return <div className="nv-gallery-overlay" onClick={onClose} role="presentation">
    <section className={'nv-gallery'+(background?' has-bg':'')} role="dialog" aria-label={title} onClick={e=>e.stopPropagation()}
      style={background?{backgroundImage:'linear-gradient(rgba(4,14,20,.58),rgba(4,14,20,.84)),url("'+background.replace(/"/g,'%22')+'")',backgroundSize:'cover',backgroundPosition:'center'}:undefined}>
      <header><h2>{title}</h2><button type="button" className="nv-gallery-close" onClick={onClose} aria-label="Fermer la galerie"><X size={20}/></button></header>
      {entries.length?<div className="nv-gallery-grid">{entries.map(e=>
        <button type="button" key={e.spaceId??e.sceneId} className={'nv-gallery-card'+(e.sceneId===currentId?' is-current':'')} onClick={()=>onPick(e.sceneId,e.spaceId)}>
          <span className="nv-gallery-thumb">{e.thumb?<img src={e.thumb} alt="" loading="lazy" decoding="async" draggable={false}/>:<span className="nv-gallery-ph"/>}</span>
          <strong>{e.label}</strong>
        </button>)}</div>
      :<p className="nv-gallery-empty">Aucun espace ni panorama dans ce panneau.</p>}
    </section>
  </div>;
}
