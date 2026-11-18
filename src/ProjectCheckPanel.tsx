import {useState} from 'react';
import {ShieldCheck,X,RotateCcw} from 'lucide-react';
import type {CheckIssue} from './projectCheck';

/** Un contrôle masqué reste vérifié en arrière-plan pour la sécurité de publication. */
export function ProjectCheckPanel({issues,hidden,onGo,onClose,onGuided,noted,onIgnore,onRestore,onAutoFix,autoFixCount}:{
  issues:CheckIssue[];hidden:CheckIssue[];noted:Set<string>;
  onGo:(issue:CheckIssue)=>void;onClose:()=>void;onGuided:()=>void;
  onIgnore:(id:string)=>void;onRestore:(id:string)=>void;
  onAutoFix?:()=>void;autoFixCount?:number;
}){
  const [only,setOnly]=useState<'all'|'error'|'todo'>('all');
  const [showHidden,setShowHidden]=useState(false);
  const errors=issues.filter(issue=>issue.level==='error').length;
  const todo=issues.filter(issue=>noted.has(issue.id)).length;
  const list=issues.filter(issue=>only==='all'||(only==='error'?issue.level==='error':noted.has(issue.id)));
  return <div className="overlay nv-comments-overlay" role="presentation"
      onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
    <section className="nv-comments nv-check-panel" role="dialog" aria-modal="true" aria-label="Contrôle du projet">
      <header><strong><ShieldCheck size={18}/> Contrôle du projet</strong>
        <button type="button" onClick={onClose} aria-label="Fermer le contrôle"><X size={20}/></button></header>
      {!issues.length?<p className="nv-publish-ok">✓ Aucun contrôle actif à traiter.</p>:<>
        <p className="nv-comments-tip">{errors} erreur{errors>1?'s':''} · {issues.length-errors} avertissement{issues.length-errors>1?'s':''}.
          « Corriger » ouvre la zone concernée ; la croix masque définitivement cette suggestion pour ce projet.</p>
        {onAutoFix&&<button type="button" className="nv-check-guided" disabled={!autoFixCount} onClick={onAutoFix}>
          ✦ Corriger automatiquement ({autoFixCount}) : doublons, flèches cassées, flèches vers les voisins</button>}
        <button type="button" className="nv-check-guided" onClick={onGuided}>
          ▶ Corriger pas à pas ({issues.length-todo})</button>
        <div className="nv-check-filter">
          <button type="button" className={only==='all'?'is-on':''} onClick={()=>setOnly('all')}>Tout ({issues.length})</button>
          <button type="button" className={only==='error'?'is-on':''} onClick={()=>setOnly('error')}>Erreurs ({errors})</button>
          <button type="button" className={only==='todo'?'is-on':''} onClick={()=>setOnly('todo')}>📝 À faire ({todo})</button>
        </div>
        <ul className="nv-publish-check nv-check-list">{list.map(issue=><li key={issue.id} className={'is-'+issue.level}>
          <span className="nv-check-ic">{issue.level==='error'?'⛔':'⚠️'}</span>
          <span className="nv-check-tx">{issue.text}
            {noted.has(issue.id)&&<> <em className="nv-check-note">noté « à faire »</em></>}
          </span>
          {issue.sceneId&&<button type="button" onClick={()=>onGo(issue)}>Corriger</button>}
          <button type="button" className="nv-check-dismiss" title="Ne plus proposer ce contrôle"
            aria-label={'Ignorer ce contrôle : '+issue.text} onClick={()=>onIgnore(issue.id)}><X size={16}/></button>
        </li>)}</ul>
      </>}
      {hidden.length>0&&<div className="nv-check-ignored">
        <button type="button" onClick={()=>setShowHidden(value=>!value)}>
          {showHidden?'▾':'▸'} Contrôles masqués ({hidden.length}) · Restaurer si besoin
        </button>
        {showHidden&&<ul className="nv-publish-check nv-check-list">{hidden.map(issue=><li key={issue.id}>
          <span className="nv-check-tx">{issue.text}</span>
          <button type="button" onClick={()=>onRestore(issue.id)}><RotateCcw size={14}/> Restaurer</button>
        </li>)}</ul>}
      </div>}
      {hidden.some(issue=>issue.level==='error')&&<small className="nv-check-security">
        Les erreurs masquées restent signalées dans la vérification avant publication.</small>}
    </section>
  </div>;
}
