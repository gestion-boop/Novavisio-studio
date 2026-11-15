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
