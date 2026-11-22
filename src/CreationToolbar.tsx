import {Image as ImageIcon, Info, Link2, Navigation, PanelBottom, SlidersHorizontal, Sparkles, Video, type LucideIcon} from 'lucide-react';

/** Outils de création : même identifiants qu'avant (le reste de l'éditeur ne change pas). */
const definitions:Record<'navigation'|'information'|'lien'|'image'|'video'|'bar',{label:string;Icon:LucideIcon}>={
  navigation:{label:'Naviguer',Icon:Navigation},
  information:{label:'Info',Icon:Info},
  lien:{label:'Lien',Icon:Link2},
  image:{label:'Photo',Icon:ImageIcon},
  video:{label:'Vidéo',Icon:Video},
  bar:{label:'Barre',Icon:PanelBottom},
};
export type CreationTool=keyof typeof definitions;
const defaults:CreationTool[]=['navigation','information','lien','image','video','bar'];

/**
 * Barre du bas de l'éditeur : pastilles à icône colorée (Naviguer, Info, Lien, Auto, Photo, Vidéo, Barre) et un seul
 * bouton « Réglages » à droite, qui ouvre les réglages de l'outil choisi.
 */
export function CreationToolbar({selected,auto,onTool,onAuto,onPanoramaSettings,settingsOpen}:{selected:CreationTool|null;auto:boolean;onTool:(tool:CreationTool)=>void;onAuto:()=>void;onPanoramaSettings:()=>void;settingsOpen:boolean}){
  const render=(key:CreationTool)=>{
    const {label,Icon}=definitions[key];
    const on=selected===key;
    return <button key={key} type="button" className={'nv-dock-btn nv-dock-'+key+(on?' is-active':'')} aria-pressed={on} onClick={()=>onTool(key)}>
      <span className="nv-dock-icon"><Icon size={17} strokeWidth={2.2}/></span><span className="nv-dock-label">{label}</span>
    </button>;
  };
  const [first,second,third,...rest]=defaults;
  return <div className="toolbar nv-dock" role="toolbar" aria-label="Outils de création">
    <div className="nv-dock-row">
      {render(first)}{render(second)}{render(third)}
      <button type="button" className={'nv-dock-btn nv-dock-auto'+(auto?' is-active':'')} aria-pressed={auto} title="Création automatique panorama par panorama" onClick={onAuto}>
        <span className="nv-dock-icon"><Sparkles size={17} strokeWidth={2.2}/></span><span className="nv-dock-label">{auto?'Terminer':'Auto'}</span>
      </button>
      {rest.map(render)}
      <button type="button" className={'nv-dock-btn nv-dock-settings'+(settingsOpen?' is-active':'')} aria-expanded={settingsOpen} aria-controls="nv-panorama-inspector" onClick={onPanoramaSettings} title="Réglages du panorama : vue d’arrivée, nom, jour/nuit et musique">
        <span className="nv-dock-icon"><SlidersHorizontal size={17} strokeWidth={2.2}/></span><span className="nv-dock-label">Réglages</span>
      </button>
    </div>
  </div>;
}
