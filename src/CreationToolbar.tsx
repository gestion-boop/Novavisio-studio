import {useEffect,useState} from 'react';
import {reorderItems,useGripSort} from './gripSort';

const definitions={navigation:{label:'Navigation',symbol:'➜'},information:{label:'Information',symbol:'ⓘ'},lien:{label:'Lien web',symbol:'↗'},image:{label:'Photo',symbol:'▣'},video:{label:'Vidéo',symbol:'▶'},bar:{label:'Barre du bas',symbol:'☷'}};
export type CreationTool=keyof typeof definitions;
const defaults:CreationTool[]=['navigation','information','lien','image','video','bar'];
function readOrder():CreationTool[]{
  try{const saved=JSON.parse(localStorage.getItem('nvstudio-tool-order-v1')??'null');if(Array.isArray(saved)&&saved.length===defaults.length&&new Set(saved).size===defaults.length&&saved.every(key=>defaults.includes(key)))return saved;}catch{/* Use the default arrangement. */}
  return defaults;
}
export function CreationToolbar({selected,auto,onTool,onAuto}:{selected:CreationTool|null;auto:boolean;onTool:(tool:CreationTool)=>void;onAuto:()=>void}){
  const [order,setOrder]=useState<CreationTool[]>(readOrder);
  useEffect(()=>{try{localStorage.setItem('nvstudio-tool-order-v1',JSON.stringify(order));}catch{/* Optional layout preference. */}},[order]);
  const sort=useGripSort('creation-tools',order,(from,to)=>setOrder(current=>reorderItems(current,from,to,key=>key)));
  const render=(key:CreationTool)=><div key={key} {...sort.itemProps(key)}>
    {sort.grip(key,'l’outil '+definitions[key].label)}
    <button type="button" className={'tool '+(selected===key?'selected':'')} aria-pressed={selected===key} onClick={()=>onTool(key)}>{definitions[key].symbol} {definitions[key].label}</button>
  </div>;
  return <div className="toolbar nv-compact-actions nv-sortable-toolbar" role="toolbar" aria-label="Outils de création" data-sort-scope="creation-tools">
    <div className="nv-toolbar-center"><div className="nv-toolbar-group nv-toolbar-left">{order.slice(0,3).map(render)}</div>
      <button type="button" className={'tool nv-auto-navigation nv-auto-toolbar'+(auto?' is-active selected':'')} aria-pressed={auto} title="Auto reste au centre" onClick={onAuto}><span className="nv-auto-symbol">↪</span> {auto?'Terminer Auto':'Auto'}</button>
      <div className="nv-toolbar-group nv-toolbar-right">{order.slice(3).map(render)}</div>
    </div>
  </div>;
}
