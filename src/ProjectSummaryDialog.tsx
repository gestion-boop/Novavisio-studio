import {useMemo} from 'react';
import {summarizeProject} from './projectSummary';
import type {StudioProject} from './storage';
import {XMark} from './XMark';
import './projectSummary.css';

const ICON={ok:'✓',todo:'⚠',info:'·'} as const;
/** Synthèse avant application (module 10) : lecture seule, aucune action qui modifie le projet. */
export function ProjectSummaryDialog({project,onClose}:{project:StudioProject;onClose:()=>void}){
  const lines=useMemo(()=>summarizeProject(project),[project]);
  const todo=lines.filter(l=>l.state==='todo').length;
  return <div className="overlay nv-summary-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section className="modal nv-summary-dialog" role="dialog" aria-modal="true" aria-label="Synthèse du projet">
      <button className="close" onClick={onClose} aria-label="Fermer"><XMark/></button>
      <h2>Synthèse avant publication <small>NovaStudio AI</small></h2>
      <p className="hint">{todo?`${todo} point(s) à vérifier avant de publier.`:'Rien à vérifier : le projet est complet.'} Cette fenêtre ne modifie rien.</p>
      <ul className="nv-summary-list">
        {lines.map(l=><li key={l.id} className={'is-'+l.state}>
          <span className="nv-summary-ico" aria-hidden="true">{ICON[l.state]}</span>
          <span><b>{l.label}</b><small>{l.detail}</small></span>
        </li>)}
      </ul>
    </section>
  </div>;
}
