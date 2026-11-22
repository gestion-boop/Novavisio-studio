import {Image,Info,Link2,Navigation,PanelBottom,SlidersHorizontal,Sparkles,Video} from 'lucide-react';
import type {CSSProperties,ReactNode} from 'react';

type ToolDef={label:string;accent:string;icon:ReactNode;hint:string};
const definitions:Record<'navigation'|'information'|'lien'|'image'|'video'|'bar',ToolDef>={
  navigation:{label:'Naviguer',accent:'#38d8cd',icon:<Navigation size={21} strokeWidth={1.9}/>,hint:'Créer une flèche vers une autre pièce'},
  information:{label:'Info',accent:'#38bdf8',icon:<Info size={21} strokeWidth={1.9}/>,hint:'Ajouter un point d’information texte'},
  lien:{label:'Lien',accent:'#67c3f8',icon:<Link2 size={21} strokeWidth={1.9}/>,hint:'Ajouter un bouton vers un site web'},
  image:{label:'Photo',accent:'#38d8cd',icon:<Image size={21} strokeWidth={1.9}/>,hint:'Placer un cadre photo dans la vue 360°'},
  video:{label:'Vidéo',accent:'#38d8cd',icon:<Video size={21} strokeWidth={1.9}/>,hint:'Placer une vidéo ou un écran dans la vue'},
  bar:{label:'Barre',accent:'#38d8cd',icon:<PanelBottom size={21} strokeWidth={1.9}/>,hint:'Configurer les boutons de la barre du bas'},
};
export type CreationTool=keyof typeof definitions;
const defaults:CreationTool[]=['navigation','information','lien','image','video','bar'];

export function CreationToolbar({selected,auto,onTool,onAuto,onSettings}:{selected:CreationTool|null;auto:boolean;onTool:(tool:CreationTool)=>void;onAuto:()=>void;onSettings:(tool:CreationTool)=>void}){
  const activeSettingsTarget:CreationTool=selected??'navigation';
  return <div className="toolbar nv-compact-actions nv-sortable-toolbar nv-orb-dock" role="toolbar" aria-label="Outils de création">
    <div className="nv-toolbar-center">
      {defaults.map(key=>{
        const def=definitions[key];
        const isSel=selected===key&&!auto;
        return <div key={key} className="nv-creation-tool">
          <button type="button"
            style={{'--nv-tool-accent':def.accent} as CSSProperties}
            className={'tool nv-tool-pill nv-tool-orb'+(isSel?' selected':'')}
            aria-pressed={isSel}
            title={def.hint+' · Clic droit pour les réglages'}
            onContextMenu={e=>{e.preventDefault();onSettings(key);}}
            onClick={()=>onTool(key)}>
            <span className="nv-orb-circle" aria-hidden="true">{def.icon}</span>
            <span className="nv-orb-lbl">{def.label}</span>
          </button>
        </div>;
      })}
      <button type="button"
        style={{'--nv-tool-accent':'#f3bb37'} as CSSProperties}
        className={'tool nv-auto-navigation nv-auto-toolbar nv-tool-pill nv-tool-orb'+(auto?' is-active selected':'')}
        aria-pressed={auto}
        title="Assistant Auto · Clic droit pour réglages des flèches"
        onContextMenu={e=>{e.preventDefault();onSettings('navigation');}}
        onClick={onAuto}>
        <span className="nv-orb-circle" aria-hidden="true"><Sparkles size={21} strokeWidth={1.9}/></span>
        <span className="nv-orb-lbl">{auto?'Terminer':'Auto'}</span>
      </button>
      <button type="button"
        className="tool nv-tool-settings-btn nv-tool-orb is-utility"
        onClick={()=>onSettings(activeSettingsTarget)}
        aria-label={'Réglages : '+definitions[activeSettingsTarget].label}
        title={'Réglages avancés de « '+definitions[activeSettingsTarget].label+' »'}>
        <span className="nv-orb-circle" aria-hidden="true"><SlidersHorizontal size={19} strokeWidth={1.9}/></span>
        <span className="nv-orb-lbl">Réglages</span>
      </button>
    </div>
  </div>;
}
