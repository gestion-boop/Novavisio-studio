import {Settings} from 'lucide-react';
const definitions={navigation:{label:'Navigation',symbol:'➜'},information:{label:'Information',symbol:'ⓘ'},lien:{label:'Lien web',symbol:'↗'},image:{label:'Photo',symbol:'▣'},video:{label:'Vidéo',symbol:'▶'},bar:{label:'Barre du bas',symbol:'☷'}};
export type CreationTool=keyof typeof definitions;
const defaults:CreationTool[]=['navigation','information','lien','image','video','bar'];
export function CreationToolbar({selected,auto,onTool,onAuto,onSettings}:{selected:CreationTool|null;auto:boolean;onTool:(tool:CreationTool)=>void;onAuto:()=>void;onSettings:(tool:CreationTool)=>void}){
  const order=defaults;
  const render=(key:CreationTool)=><div key={key} className="nv-creation-tool">
    <button type="button" className={'tool '+(selected===key?'selected':'')} aria-pressed={selected===key} onClick={()=>onTool(key)}>{definitions[key].symbol} {definitions[key].label}</button>
    <button type="button" className="nv-tool-gear" onClick={()=>onSettings(key)} aria-label={'Réglages : '+definitions[key].label} title={'Réglages : '+definitions[key].label}><Settings size={14}/></button>
  </div>;
  return <div className="toolbar nv-compact-actions nv-sortable-toolbar" role="toolbar" aria-label="Outils de création">
    <div className="nv-toolbar-center"><div className="nv-toolbar-group nv-toolbar-left">{order.slice(0,3).map(render)}</div>
      <button type="button" className={'tool nv-auto-navigation nv-auto-toolbar'+(auto?' is-active selected':'')} aria-pressed={auto} title="Auto reste au centre" onClick={onAuto}>{auto?'Terminer Auto':'Auto'}</button>
      <button type="button" className="nv-tool-gear" onClick={()=>onSettings('navigation')} aria-label="Réglages : Auto et flèches" title="Réglages : Auto et flèches"><Settings size={14}/></button>
      <div className="nv-toolbar-group nv-toolbar-right">{order.slice(3).map(render)}</div>
    </div>
  </div>;
}
