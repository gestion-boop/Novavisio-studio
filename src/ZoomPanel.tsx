import {PANORAMA_DEFAULT_ZOOM,panoramaArrivalZoom} from './panoramaLens';
import type {Scene} from './storage';

/**
 * Zoom d'arrivée d'un panorama : 0 = vue la plus large (dézoomé), 100 = vue la plus serrée.
 * Le curseur agit en direct sur le panorama affiché ; deux boutons copient la valeur à un dossier ou à tous les panoramas.
 * La direction d'arrivée (cap) de chaque panorama n'est jamais modifiée.
 */
export function ZoomPanel({scene,onChange,onApplyTo,spaceCount,totalCount}:{
  scene:Scene;onChange:(zoom:number|undefined)=>void;onApplyTo:(scope:'space'|'project')=>void;spaceCount:number;totalCount:number;
}){
  const value=Math.round(panoramaArrivalZoom(scene));
  const custom=scene.arrivalZoom!==undefined;
  return <div className="nv-zoom-panel">
    <p className="hint">Règle le zoom avec lequel le visiteur arrive sur ce panorama. Tire vers la gauche pour dézoomer (voir plus large), vers la droite pour zoomer.</p>
    <label className="nv-grade-row">
      <span>Zoom à l’arrivée</span><b>{value}</b>
      <input type="range" min="0" max="100" step="1" value={value} aria-label="Zoom à l’arrivée" onChange={e=>onChange(Number(e.target.value))} onDoubleClick={()=>onChange(undefined)}/>
    </label>
    <div className="nv-zoom-scale" aria-hidden="true"><span>Large</span><span>Serré</span></div>
    <div className="nv-grade-actions">
      <button type="button" disabled={!custom} onClick={()=>onChange(undefined)}>Valeur par défaut ({PANORAMA_DEFAULT_ZOOM})</button>
    </div>
    <div className="nv-grade-actions">
      <button type="button" onClick={()=>onApplyTo('space')}>Appliquer à ce dossier ({spaceCount})</button>
      <button type="button" onClick={()=>onApplyTo('project')}>Appliquer à tous les panoramas ({totalCount})</button>
    </div>
    <small className="hint-inline">Double-clic sur le curseur : retour à la valeur par défaut. Le cap d’arrivée de chaque panorama ne change pas.</small>
  </div>;
}
