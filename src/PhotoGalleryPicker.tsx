import {useState} from 'react';
import {Images} from 'lucide-react';
import {PlanModal} from './FloorPlan';
import type {MediaLinkItem} from './storage';
import {resolveLink} from './mediaLinks';

/** Large preview alongside the selectable photo/video library. */
export function PhotoGalleryPicker({library,selected,onChange}:{library:MediaLinkItem[];selected:MediaLinkItem[];onChange:(items:MediaLinkItem[])=>void}){
  const [open,setOpen]=useState(false),[activeId,setActiveId]=useState('');
  const active=library.find(item=>item.id===activeId)??library[0];
  const media=active?resolveLink(active):null;
  const chosen=new Set(selected.map(item=>item.id));
  return <><button type="button" disabled={!library.length} onClick={()=>setOpen(true)}>Agrandir la galerie avec les aperçus</button>
    {open&&<PlanModal wide icon={<Images size={22}/>} title="Configurer la galerie de photos" onClose={()=>setOpen(false)}>
      <div className="nv-media-picker-workspace">
        <section className="nv-media-large-preview" aria-label="Aperçu de la photo sélectionnée">
          <h3>{active?.name}</h3><div className="nv-media-large-view" key={active?.id}>
            {media?.image?<img src={media.image} alt={active?.name} referrerPolicy="no-referrer"/>:media?.video?<video src={media.video} controls preload="metadata"/>:media?.embed?<iframe src={media.embed} title={active?.name} allowFullScreen/>:<p>{media?.problem||'Sélectionne une photo.'}</p>}
          </div>
        </section>
        <div className="nv-media-picker-list nv-photo-picker-list" role="group" aria-label="Photos de la galerie">
          <strong>{chosen.size} média(s) sélectionné(s)</strong>
          {library.map(item=>{const resolved=resolveLink(item);return <div className="nv-photo-picker-row" key={item.id}>
            <input type="checkbox" aria-label={'Inclure '+item.name} checked={chosen.has(item.id)} onChange={e=>{const ids=new Set(chosen);if(e.target.checked)ids.add(item.id);else ids.delete(item.id);onChange(library.filter(item=>ids.has(item.id)));}}/>
            <button type="button" aria-pressed={active?.id===item.id} onClick={()=>setActiveId(item.id)}>
              {resolved.thumb?<img src={resolved.thumb} alt="" loading="lazy" referrerPolicy="no-referrer"/>:<span>▶</span>}<strong>{item.name}</strong>
            </button>
          </div>;})}
        </div>
      </div>
    </PlanModal>}
  </>;
}
