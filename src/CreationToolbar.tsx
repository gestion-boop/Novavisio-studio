import {Image,Info,Link2,Navigation,PanelBottom,SlidersHorizontal,Sparkles,Video} from 'lucide-react';
import type {CSSProperties,ReactNode} from 'react';

type ToolDef={label:string;accent:string;icon:ReactNode;hint:string};
const definitions:Record<'navigation'|'information'|'lien'|'image'|'video'|'bar',ToolDef>={
  navigation:{label:'Naviguer',accent:'#2dd4bf',icon:<Navigation size={18} strokeWidth={2.2}/>,hint:'Créer une flèche vers une autre pièce'},
  information:{label:'Info',accent:'#38bdf8',icon:<Info size={18} strokeWidth={2.2}/>,hint:'Ajouter un point d’information texte'},
  lien:{label:'Lien',accent:'#818cf8',icon:<Link2 size={18} strokeWidth={2.2}/>,hint:'Ajouter un bouton vers un site web'},
  image:{label:'Photo',accent:'#f59e0b',icon:<Image size={18} strokeWidth={2.2}/>,hint:'Placer un cadre photo dans la vue 360°'},
  video:{label:'Vidéo',accent:'#f472b6',icon:<Video size={18} strokeWidth={2.2}/>,hint:'Placer une vidéo ou un écran dans la vue'},
  bar:{label:'Barre',accent:'#a78bfa',icon:<PanelBottom size={18} strokeWidth={2.2}/>,hint:'Configurer les boutons de la barre du bas'},
};
export type CreationTool=keyof typeof definitions;
const defaults:CreationTool[]=['navigation','information','lien','image','video','bar'];

export function CreationToolbar({selected,auto,onTool,onAuto,onSettings}:{selected:CreationTool|null;auto:boolean;onTool:(tool:CreationTool)=>void;onAuto:()=>void;onSettings:(tool:CreationTool)=>void}){
  const activeSettingsTarget:CreationTool=selected??'navigation';
  const render=(key:CreationTool)=>{
    const def=definitions[key];
    const isSel=selected===key;
    return <div key={key} className="nv-creation-tool">
      <button type="button"
        style={{'--nv-tool-accent':def.accent} as CSSProperties}
        className={'tool nv-tool-pill'+(isSel?' selected':'')}
        aria-pressed={isSel}
        title={def.hint+' · Clic droit pour les réglages'}
        onContextMenu={e=>{e.preventDefault();onSettings(key);}}
        onClick={()=>onTool(key)}>
        <span className="nv-tool-ico" aria-hidden="true">{def.icon}</span>
        <span className="nv-tool-lbl">{def.label}</span>
      </button>
    </div>;
  };
  return <div className="toolbar nv-compact-actions nv-sortable-toolbar" role="toolbar" aria-label="Outils de création">
    <div className="nv-toolbar-center">
      <div className="nv-toolbar-group nv-toolbar-left">{defaults.slice(0,3).map(render)}</div>
      <button type="button"
        style={{'--nv-tool-accent':'#f3bb37'} as CSSProperties}
        className={'tool nv-auto-navigation nv-auto-toolbar nv-tool-pill'+(auto?' is-active selected':'')}
        aria-pressed={auto}
        title="Assistant Auto · Clic droit pour réglages des flèches"
        onContextMenu={e=>{e.preventDefault();onSettings('navigation');}}
        onClick={onAuto}>
        <span className="nv-tool-ico" aria-hidden="true"><Sparkles size={18} strokeWidth={2.2}/></span>
        <span className="nv-tool-lbl">{auto?'Terminer':'Auto'}</span>
      </button>
      <div className="nv-toolbar-group nv-toolbar-right">{defaults.slice(3).map(render)}</div>
      <button type="button"
        className="tool nv-tool-settings-btn"
        onClick={()=>onSettings(activeSettingsTarget)}
        aria-label={'Réglages : '+definitions[activeSettingsTarget].label}
        title={'Réglages avancés de « '+definitions[activeSettingsTarget].label+' »'}>
        <SlidersHorizontal size={17} strokeWidth={2.2} aria-hidden="true"/>
        <span className="nv-tool-lbl">Réglages</span>
      </button>
    </div>
  </div>;
}
