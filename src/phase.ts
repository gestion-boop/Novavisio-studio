/** Moment de la journée où un point (photo, lien, information, vidéo, flèche) est affiché : jour, nuit ou les deux. */
export type HotspotPhase='day'|'night'|'both';
export const PHASES:readonly HotspotPhase[]=['day','night','both'];
/** Sans réglage, un point reste visible le jour seulement (comportement historique : tout disparaissait la nuit). */
export const phaseOf=(h:{phase?:HotspotPhase}):HotspotPhase=>h.phase??'day';
export const inPhase=(h:{phase?:HotspotPhase},night:boolean):boolean=>{const p=phaseOf(h);return p==='both'||(night?p==='night':p==='day');};
