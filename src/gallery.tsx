import {useEffect,useRef,useState,type ReactNode} from 'react';
import {X} from 'lucide-react';
import {renderViewThumb,type ViewSource} from './viewThumbs';
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
export function PanoramaGallery({title,entries,currentId,background,onPick,onClose,renderPreview,viewSource}:{title:string;entries:GalleryCard[];currentId?:string;background?:string;onPick:(sceneId:string,spaceId?:string)=>void;onClose:()=>void;renderPreview?:(sceneId:string)=>ReactNode;viewSource?:(sceneId:string)=>ViewSource|undefined}){
  const [views,setViews]=useState<Record<string,string>>({});
  const viewRef=useRef(viewSource),entriesRef=useRef(entries);viewRef.current=viewSource;entriesRef.current=entries;
  const entriesKey=entries.map(e=>e.sceneId).join(',');
  useEffect(()=>{
    if(!viewRef.current)return;
    let dead=false;
    void (async()=>{
      for(const e of entriesRef.current){
        if(dead)return;
        if(e.spaceId)continue;
        const src=viewRef.current?.(e.sceneId);if(!src||!src.dataUrl)continue;
        try{const url=await renderViewThumb(src);if(dead)return;setViews(v=>v[e.sceneId]?v:{...v,[e.sceneId]:url});}catch{/* on garde la vignette d'origine */}
        await new Promise(r=>setTimeout(r,20));
      }
    })();
    return ()=>{dead=true;};
  },[entriesKey]);
  const [look,setLook]=useState<GalleryCard|null>(null);
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'){if(look)setLook(null);else onClose();}};
    document.addEventListener('keydown',onKey);
    return ()=>document.removeEventListener('keydown',onKey);
  },[onClose,look]);
  return <div className="nv-gallery-overlay" onClick={onClose} role="presentation">
    <section className={'nv-gallery'+(background?' has-bg':'')} role="dialog" aria-label={title} onClick={e=>e.stopPropagation()}
      style={background?{backgroundImage:'linear-gradient(rgba(4,14,20,.58),rgba(4,14,20,.84)),url("'+background.replace(/"/g,'%22')+'")',backgroundSize:'cover',backgroundPosition:'center'}:undefined}>
      <header><h2>{title}</h2><button type="button" className="nv-gallery-close" onClick={onClose} aria-label="Fermer la galerie"><X size={20}/></button></header>
      {entries.length?<div className="nv-gallery-grid">{entries.map(e=><div className="nv-gallery-cell" key={e.spaceId??e.sceneId}>
        <button type="button" className={'nv-gallery-card'+(e.sceneId===currentId?' is-current':'')} onClick={()=>onPick(e.sceneId,e.spaceId)}>
          <span className="nv-gallery-thumb">{(views[e.sceneId]||e.thumb)?<img src={views[e.sceneId]||e.thumb} alt="" loading="lazy" decoding="async" draggable={false}/>:<span className="nv-gallery-ph"/>}</span>
          <strong>{e.label}</strong>
        </button>
        {renderPreview&&!e.spaceId&&<button type="button" className="nv-gallery-360" title="Voir ce panorama en 360° pour le reconnaître" aria-label={'Voir '+e.label+' en 360°'} onClick={ev=>{ev.stopPropagation();setLook(e);}}>360°</button>}
      </div>)}</div>
      :<p className="nv-gallery-empty">Aucun espace ni panorama dans ce panneau.</p>}
      {look&&renderPreview&&<div className="nv-gallery-look" role="dialog" aria-label={'Aperçu 360° de '+look.label}>
        <header><strong>{look.label}</strong><button type="button" onClick={()=>setLook(null)} aria-label="Fermer l’aperçu 360°"><X size={18}/></button></header>
        <div className="nv-gallery-look-view">{renderPreview(look.sceneId)}</div>
        <footer><span>Glisse pour tourner à 360°</span><button type="button" onClick={()=>{const l=look;setLook(null);onPick(l.sceneId,l.spaceId);}}>Aller dans ce panorama</button></footer>
      </div>}
    </section>
  </div>;
}
