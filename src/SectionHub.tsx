import {useEffect,type CSSProperties,type ReactNode} from 'react';
import {ChevronLeft} from 'lucide-react';

/**
 * Menu en grandes tuiles pour un panneau de réglages : on choisit une rubrique (tuile), son contenu s'affiche en grand,
 * et « Retour » ramène aux tuiles. Évite les longues colonnes de réglages empilés.
 */
export type HubSection={
  key:string;title:string;hint?:string;icon:ReactNode;tone:string;badge?:string|number;
  content?:ReactNode;          // contenu affiché quand on ouvre la tuile
  onClick?:()=>void;           // ou action directe (ex. ouvrir une fenêtre)
};
export function SectionHub({sections,intro,forceOpen,open,onOpenChange}:{id:string;sections:HubSection[];intro?:ReactNode;forceOpen?:string|null;open:string|null;onOpenChange:(key:string|null)=>void}){
  const setOpen=onOpenChange;
  useEffect(()=>{if(forceOpen)onOpenChange(forceOpen);},[forceOpen]);
  const current=open?sections.find(section=>section.key===open&&section.content!==undefined):undefined;
  if(current){
    return <div className="nv-hub-detail">
      <div className="nv-hub-detail-head">
        <button type="button" className="nv-hub-back" onClick={()=>setOpen(null)}><ChevronLeft size={18}/> Retour</button>
        <strong>{current.title}</strong>
      </div>
      <div className="nv-hub-detail-body">{current.content}</div>
    </div>;
  }
  return <>
    {intro}
    <div className="nv-hub-tiles">
      {sections.map(section=><button type="button" key={section.key} className="nv-app-tile nv-hub-tile" style={{'--tile-tone':section.tone} as CSSProperties}
        onClick={()=>section.onClick?section.onClick():setOpen(section.key)}>
        <span className="nv-app-tile-icon">{section.icon}</span>
        <span className="nv-app-tile-label">{section.title}</span>
        {section.hint&&<small className="nv-hub-hint">{section.hint}</small>}
        {section.badge!==undefined&&<small className="nv-app-tile-badge">{section.badge}</small>}
      </button>)}
    </div>
  </>;
}
