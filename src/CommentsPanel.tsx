import {useState} from 'react';
import {MessageSquarePlus,Check,Trash2,MapPin,X} from 'lucide-react';
import type {ProjectComment} from './storage';

/** Commentaires d'équipe accrochés à un endroit d'un panorama : on ajoute depuis la vue en cours, un clic ramène à l'endroit. */
export function CommentsPanel({comments,scenes,currentSceneId,onAdd,onGo,onToggle,onDelete,onClose}:{
  comments:ProjectComment[];scenes:{id:string;name:string}[];currentSceneId:string;
  onAdd:(text:string)=>void;onGo:(c:ProjectComment)=>void;onToggle:(id:string)=>void;onDelete:(id:string)=>void;onClose:()=>void;
}){
  const [text,setText]=useState('');
  const [showDone,setShowDone]=useState(false);
  const sceneName=(id:string)=>scenes.find(s=>s.id===id)?.name||'panorama supprimé';
  const list=comments.filter(c=>showDone||!c.done).sort((a,b)=>b.at-a.at);
  const doneCount=comments.filter(c=>c.done).length;
  return <div className="overlay nv-comments-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section className="nv-comments" role="dialog" aria-modal="true" aria-label="Commentaires d’équipe">
      <header><strong><MessageSquarePlus size={18}/> Commentaires</strong><button type="button" onClick={onClose} aria-label="Fermer les commentaires"><X size={20}/></button></header>
      <p className="nv-comments-tip">Le commentaire est accroché à l’endroit exact que tu regardes dans « {sceneName(currentSceneId)} ». Ils ne sont jamais publiés dans la visite.</p>
      <div className="nv-comments-add">
        <textarea rows={2} maxLength={600} value={text} onChange={e=>setText(e.target.value)} placeholder="Ex. : refaire cette photo, ajouter un panneau ici…"
          onKeyDown={e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)&&text.trim()){onAdd(text.trim());setText('');}}}/>
        <button type="button" disabled={!text.trim()||!currentSceneId} onClick={()=>{onAdd(text.trim());setText('');}}><MapPin size={16}/> Accrocher ici</button>
      </div>
      <div className="nv-comments-list">
        {!list.length&&<p className="nv-comments-empty">Aucun commentaire{doneCount&&!showDone?' en attente':''}.</p>}
        {list.map(c=><article key={c.id} className={'nv-comment'+(c.done?' is-done':'')}>
          <button type="button" className="nv-comment-main" onClick={()=>onGo(c)} title="Aller à cet endroit du panorama">
            <small><MapPin size={12}/> {sceneName(c.sceneId)} · {c.author}{c.issueId&&<span className="nv-comment-tag">à corriger</span>} · {new Date(c.at).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})}</small>
            <span>{c.text}</span>
          </button>
          <button type="button" className="nv-comment-btn" onClick={()=>onToggle(c.id)} aria-label={c.done?'Rouvrir':'Marquer comme résolu'} title={c.done?'Rouvrir':'Marquer comme résolu'}><Check size={16}/></button>
          <button type="button" className="nv-comment-btn" onClick={()=>onDelete(c.id)} aria-label="Supprimer le commentaire"><Trash2 size={16}/></button>
        </article>)}
      </div>
      {doneCount>0&&<button type="button" className="nv-comments-toggle" onClick={()=>setShowDone(v=>!v)}>{showDone?'Masquer':'Afficher'} les {doneCount} résolu{doneCount>1?'s':''}</button>}
    </section>
  </div>;
}
