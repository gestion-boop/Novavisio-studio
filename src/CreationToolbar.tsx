const definitions={navigation:{label:'Navigation',symbol:'➜'},information:{label:'Information',symbol:'ⓘ'},lien:{label:'Lien web',symbol:'↗'},image:{label:'Photo',symbol:'▣'},video:{label:'Vidéo',symbol:'▶'},bar:{label:'Barre du bas',symbol:'☷'}};
export type CreationTool=keyof typeof definitions;
const defaults:CreationTool[]=['navigation','information','lien','image','video','bar'];
export function CreationToolbar({selected,auto,autoReturn,onTool,onAuto,onAutoReturn}:{selected:CreationTool|null;auto:boolean;autoReturn:boolean;onTool:(tool:CreationTool)=>void;onAuto:()=>void;onAutoReturn:()=>void}){
  const order=defaults;
  const render=(key:CreationTool)=><div key={key} className="nv-creation-tool">
    <button type="button" className={'tool '+(selected===key?'selected':'')} aria-pressed={selected===key} onClick={()=>onTool(key)}>{definitions[key].symbol} {definitions[key].label}</button>
  </div>;
  return <div className="toolbar nv-compact-actions nv-sortable-toolbar" role="toolbar" aria-label="Outils de création">
    <div className="nv-toolbar-center"><div className="nv-toolbar-group nv-toolbar-left">{order.slice(0,3).map(render)}</div>
      <button type="button" className={'tool nv-auto-navigation nv-auto-toolbar'+(auto?' is-active selected':'')} aria-pressed={auto} title="Auto reste au centre" onClick={onAuto}><span className="nv-auto-symbol">↪</span> {auto?'Terminer Auto':'Auto'}</button>
      <div className="nv-toolbar-group nv-toolbar-right">{order.slice(3).map(render)}
        <button type="button" className={'tool nv-return-toggle'+(autoReturn?' selected':'')} aria-pressed={autoReturn} title="Quand tu crées une flèche aller, NovaStudio crée aussitôt la flèche retour dans l'autre panorama (derrière toi)." onClick={onAutoReturn}>↩ Retour auto</button></div>
    </div>
  </div>;
}
