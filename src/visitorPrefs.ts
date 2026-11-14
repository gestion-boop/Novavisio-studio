import {useSyncExternalStore} from 'react';
import type {StudioLanguage} from './storage';

/**
 * Préférences du visiteur (bouton « Paramètres » à droite) : son et langue.
 * Un seul état partagé : la musique, les vidéos, les fenêtres d'information et les mini-sites intégrés le lisent.
 */
export type SoundChoice='undecided'|'on'|'off';
type Prefs={sound:SoundChoice;lang:StudioLanguage|null};
const KEY='nvstudio-visitor-lang';
let state:Prefs={sound:'undecided',lang:(()=>{try{return localStorage.getItem(KEY) as StudioLanguage|null;}catch{return null;}})()};
const listeners=new Set<()=>void>();
const emit=()=>listeners.forEach(l=>l());
export const getPrefs=()=>state;
export function setSound(sound:SoundChoice){if(state.sound===sound)return;state={...state,sound};emit();}
export function setLang(lang:StudioLanguage){
  state={...state,lang};try{localStorage.setItem(KEY,lang);}catch{/* stockage indisponible */}emit();
}
export function useVisitorPrefs():Prefs{
  return useSyncExternalStore(cb=>{listeners.add(cb);return ()=>{listeners.delete(cb);};},getPrefs,getPrefs);
}
/** Langue effective : celle du visiteur si le projet la propose, sinon la première langue du projet. */
export const effectiveLang=(prefs:Prefs,available:StudioLanguage[]):StudioLanguage=>
  prefs.lang&&available.includes(prefs.lang)?prefs.lang:(available[0]??'fr');
