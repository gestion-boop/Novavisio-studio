import type {CSSProperties} from 'react';
import type {StudioProject} from './storage';

/** Réglages du bouton Paramètres (taille, zoom de l'icône, couleurs du bouton par défaut), partagés par le Studio et le lecteur public. */
export const SETTINGS_SIZE_DEFAULT=56;
export const settingsSize=(p:Pick<StudioProject,'settingsIconSize'>)=>Math.max(32,Math.min(120,p.settingsIconSize??SETTINGS_SIZE_DEFAULT));
export const settingsZoom=(p:Pick<StudioProject,'settingsIconZoom'>)=>Math.max(100,Math.min(300,p.settingsIconZoom??100));
export function settingsButtonStyle(p:Pick<StudioProject,'settingsIconSize'|'settingsIconZoom'|'settingsColor'|'settingsIconColor'>):CSSProperties{
  const s:Record<string,string>={'--nv-set-size':settingsSize(p)+'px','--nv-set-zoom':String(settingsZoom(p)/100)};
  if(p.settingsColor)s['--nv-set-bg']=p.settingsColor;
  if(p.settingsIconColor)s['--nv-set-fg']=p.settingsIconColor;
  return s as CSSProperties;
}

/** Bouton Paramètres aux couleurs de la barre du bas : fond = couleur des boutons de la barre, icône = couleur des icônes.
 *  Une couleur personnalisée du bouton (settingsColor / settingsIconColor) reste prioritaire. */
export function settingsButtonBarStyle(p:Pick<StudioProject,'settingsIconSize'|'settingsIconZoom'|'settingsColor'|'settingsIconColor'>,bar:{button:string;icon:string}):CSSProperties{
  const s=settingsButtonStyle(p) as Record<string,string>;
  if(!p.settingsColor&&bar.button)s['--nv-set-bg']=bar.button;
  if(!p.settingsIconColor&&bar.icon)s['--nv-set-fg']=bar.icon;
  return s as CSSProperties;
}
