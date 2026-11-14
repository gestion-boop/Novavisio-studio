import {useState} from 'react';
import {ShieldCheck,X} from 'lucide-react';
import type {CheckIssue} from './projectCheck';

/** Contrôle du projet, toujours consultable depuis la cloche : chaque ligne mène directement à l'endroit à corriger. */
export function ProjectCheckPanel({issues,onGo,onClose,onGuided,noted}:{issues:CheckIssue[];noted:Set<string>;onGo:(i:CheckIssue)=>void;onClose:()=>void;onGuided:()=>void}){
  const [only,setOnly]=useState<'all'|'error'|'todo'>('all');
  const errors=issues.filter(i=>i.level==='error').length;
  const todo=issues.filter(i=>noted.has(i.id)).length;
  const list=issues.filter(i=>only==='all'||(only==='error'?i.level==='error':noted.has(i.id)));
  return <div className="overlay nv-comments-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section className="nv-comments nv-check-panel" role="dialog" aria-modal="true" aria-label="Contrôle du projet">
      <header><strong><ShieldCheck size={18}/> Contrôle du projet</strong><button type="button" onClick={onClose} aria-label="Fermer le contrôle"><X size={20}/></button></header>
      {!issues.length?<p className="nv-publish-ok">✓ Rien d’anormal détecté : le projet est prêt à être publié.</p>:<>
        <p className="nv-comments-tip">{errors} erreur{errors>1?'s':''} · {issues.length-errors} avertissement{issues.length-errors>1?'s':''}. Clique sur « Corriger » pour aller droit au point concerné ; la liste se met à jour toute seule.</p>
        <button type="button" className="nv-check-guided" onClick={onGuided}>▶ Corriger pas à pas ({issues.length-todo})</button>
        <div className="nv-check-filter">
          <button type="button" className={only==='all'?'is-on':''} onClick={()=>setOnly('all')}>Tout ({issues.length})</button>
          <button type="button" className={only==='error'?'is-on':''} onClick={()=>setOnly('error')}>Erreurs ({errors})</button>
          <button type="button" className={only==='todo'?'is-on':''} onClick={()=>setOnly('todo')}>📝 À faire ({todo})</button>
        </div>
        <ul className="nv-publish-check nv-check-list">{list.map((is,i)=><li key={i} className={'is-'+is.level}><span className="nv-check-ic">{is.level==='error'?'⛔':'⚠️'}</span><span className="nv-check-tx">{is.text}{noted.has(is.id)&&<> <em className="nv-check-note">noté « à faire »</em></>}</span>
          {is.sceneId&&<button type="button" onClick={()=>onGo(is)}>Corriger</button>}</li>)}</ul></>}
    </section>
  </div>;
}
