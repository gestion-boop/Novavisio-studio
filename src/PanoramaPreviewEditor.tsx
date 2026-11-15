import {createPortal} from 'react-dom';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {X,Save,Trash2} from 'lucide-react';
import type {Scene} from './storage';
import './panoramaPreviewEditor.css';

export function PanoramaPreviewEditor({scene,children,onClose,onSave,onDelete}:{onDelete:()=>void;scene:Scene;children:ReactNode;onClose:()=>void;onSave:(name:string)=>Promise<boolean>}){
  const [name,setName]=useState(scene.name),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
  const host=useRef<HTMLElement>(null);
  useEffect(()=>{host.current?.focus({preventScroll:true});},[]);
  const save=async()=>{if(saving||!name.trim())return;setSaving(true);setMessage('');try{const ok=await onSave(name.trim());setMessage(ok?'Nom enregistré.':'Enregistrement non terminé. Réessaie.');}catch{setMessage('Impossible d’enregistrer. Réessaie.');}finally{setSaving(false);}};
  return createPortal(<section ref={host} tabIndex={-1} className="nv-panorama-preview-editor" role="dialog" aria-label="Aperçu et nom du panorama" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose();}}}>
    <header><strong>{scene.name}</strong><button type="button" aria-label="Fermer l’aperçu du panorama" onClick={onClose}><X size={20}/></button></header>
    <div className="nv-panorama-preview-editor-view">{children}</div>
    <small>Glisse pour regarder à 360°.</small>
    <form onSubmit={e=>{e.preventDefault();void save();}}>
      <label>Nom du panorama<input aria-label="Nom du panorama dans l’aperçu" maxLength={150} value={name} disabled={saving} onChange={e=>{setName(e.target.value);setMessage('');}}/></label>
      <button type="submit" disabled={saving||!name.trim()}><Save size={17}/>{saving?'Enregistrement…':'Enregistrer'}</button>
      <button type="button" title="Supprimer ce panorama" aria-label="Supprimer ce panorama" disabled={saving} onClick={onDelete}><Trash2 size={17}/></button>
    </form>
    {message&&<p role="status">{message}</p>}
  </section>,document.fullscreenElement??document.body);
}
