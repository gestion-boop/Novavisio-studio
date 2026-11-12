import type {Hotspot} from './storage';
import {escapeAttribute} from './imageFrame';

export const isPopupMedia=(h:Hotspot)=>(h.type==='image'||h.type==='video')&&h.mediaDisplay==='popup';
export function popupMediaMarkerHtml(h:Hotspot){
  return '<span class="nv-media-popup-marker" aria-label="'+escapeAttribute(h.title)+'">'+(h.type==='video'?'▶':'▣')+'</span>';
}
export function MediaDisplayControl({hotspot,onChange}:{hotspot:Hotspot;onChange:(patch:Partial<Hotspot>)=>void}){
  return <fieldset className="nv-media-display-control"><legend>Affichage du média</legend><div>
    <button type="button" aria-pressed={isPopupMedia(hotspot)} onClick={()=>onChange({mediaDisplay:'popup',...(hotspot.type==='video'?{videoOpenFullscreen:true}:{})})}>Popup</button>
    <button type="button" aria-pressed={!isPopupMedia(hotspot)} onClick={()=>onChange({mediaDisplay:'inline'})}>Incrustation</button>
    </div><small>{isPopupMedia(hotspot)?'Un clic sur le repère ouvre le média en grand.':'Le média apparaît dans le panorama. Déplace les quatre poignées pour régler sa taille et sa perspective.'}</small>
  </fieldset>;
}
