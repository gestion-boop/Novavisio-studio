import {useCallback,useEffect,useState} from 'react';
import {Lock,Users,Trash2,X} from 'lucide-react';
import {cloudConfigured,readLink,supabase} from './cloud';

/**
 * Notes du projet : attachées à UN projet, privées (seul l'auteur les voit) ou partagées avec l'équipe du projet.
 * Elles sont stockées à part (table nvstudio_notes, protégée par Supabase) : elles ne font jamais partie de la visite publiée ni des exports.
 * Sans connexion Cloud, les notes restent sur cet ordinateur (privées uniquement).
 */
type Note={id:string;body:string;shared:boolean;authorEmail:string;mine:boolean;createdAt:string};
type Mode={kind:'cloud';projectId:string;userId:string;email:string}|{kind:'local';key:string;reason:string};
const MISSING=/nvstudio_notes|schema cache|does not exist|Could not find the table/i;
const NOT_ACTIVE='Le partage des notes n’est pas encore activé sur ton Cloud (une mise à jour de la base est à lancer une fois) : en attendant, tes notes restent sur cet ordinateur.';
const who=(email:string)=>email?email.split('@')[0]:'Quelqu’un';
const when=(iso:string)=>{try{return new Date(iso).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}catch{return '';}};

function localRead(key:string):Note[]{
  try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v.filter(n=>n&&typeof n.id==='string'&&typeof n.body==='string'):[];}catch{return [];}
}
function localWrite(key:string,notes:Note[]){try{localStorage.setItem(key,JSON.stringify(notes));}catch{/* stockage indisponible */}}

export function NotesPanel({projectName,onClose}:{projectName:string;onClose:()=>void}){
  const [mode,setMode]=useState<Mode|null>(null);
  const [notes,setNotes]=useState<Note[]>([]);
  const [draft,setDraft]=useState('');
  const [shared,setShared]=useState(false);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);

  // Cloud si le projet est lié au Cloud et qu'on est connecté ; sinon notes locales.
  useEffect(()=>{
    let dead=false;
    (async()=>{
      const link=readLink();
      const localKey='nvstudio-notes-local:'+(projectName||'projet');
      if(!link||!cloudConfigured){if(!dead)setMode({kind:'local',key:localKey,reason:'Ouvre le projet depuis le Cloud pour pouvoir partager une note avec ton équipe : en attendant, tes notes restent sur cet ordinateur.'});return;}
      try{
        const {data}=await supabase().auth.getSession();
        const user=data.session?.user;
        if(!user){if(!dead)setMode({kind:'local',key:localKey,reason:'Connecte-toi au Cloud pour partager une note : en attendant, tes notes restent sur cet ordinateur.'});return;}
        if(!dead)setMode({kind:'cloud',projectId:link.projectId,userId:user.id,email:(user.email??'').toLowerCase()});
      }catch{if(!dead)setMode({kind:'local',key:localKey,reason:'Cloud indisponible : tes notes restent sur cet ordinateur.'});}
    })();
    return ()=>{dead=true;};
  },[projectName]);

  const refresh=useCallback(async()=>{
    if(!mode)return;
    if(mode.kind==='local'){setNotes(localRead(mode.key));return;}
    const {data,error:err}=await supabase().from('nvstudio_notes').select('id,body,shared,author_id,author_email,created_at')
      .eq('project_id',mode.projectId).order('created_at',{ascending:false}).limit(300);
    if(err){
      if(MISSING.test(err.message)){setMode({kind:'local',key:'nvstudio-notes-local:'+(projectName||'projet'),reason:NOT_ACTIVE});return;}
      setError('Lecture des notes impossible : '+err.message);
      return;
    }
    setError('');
    setNotes((data??[]).map(r=>({id:r.id as string,body:r.body as string,shared:!!r.shared,authorEmail:(r.author_email as string)||'',mine:r.author_id===mode.userId,createdAt:r.created_at as string})));
  },[mode,projectName]);
  useEffect(()=>{
    void refresh();
    if(mode?.kind!=='cloud')return;
    const t=window.setInterval(()=>void refresh(),15000);
    return ()=>window.clearInterval(t);
  },[mode,refresh]);

  async function add(){
    const body=draft.trim();
    if(!body||!mode||busy)return;
    setBusy(true);
    try{
      if(mode.kind==='local'){
        const note:Note={id:Math.random().toString(36).slice(2),body,shared:false,authorEmail:'',mine:true,createdAt:new Date().toISOString()};
        const next=[note,...localRead(mode.key)];localWrite(mode.key,next);setNotes(next);
      }else{
        const {error:err}=await supabase().from('nvstudio_notes').insert({project_id:mode.projectId,body,shared});
        if(err){
          if(MISSING.test(err.message)){
            // Table pas encore créée : la note n'est pas perdue, elle reste sur cet ordinateur.
            const key='nvstudio-notes-local:'+(projectName||'projet');
            const note:Note={id:Math.random().toString(36).slice(2),body,shared:false,authorEmail:'',mine:true,createdAt:new Date().toISOString()};
            const next=[note,...localRead(key)];localWrite(key,next);
            setMode({kind:'local',key,reason:NOT_ACTIVE});setNotes(next);setDraft('');setShared(false);return;
          }
          throw new Error(err.message);
        }
        await refresh();
      }
      setDraft('');
    }catch(e){setError('Note non enregistrée : '+(e instanceof Error?e.message:String(e)));}
    finally{setBusy(false);}
  }
  async function toggle(note:Note){
    if(!mode||mode.kind!=='cloud')return;
    const {error:err}=await supabase().from('nvstudio_notes').update({shared:!note.shared,updated_at:new Date().toISOString()}).eq('id',note.id);
    if(err)setError('Changement impossible : '+err.message);else await refresh();
  }
  async function remove(note:Note){
    if(!mode||!window.confirm('Supprimer cette note ?'))return;
    if(mode.kind==='local'){const next=localRead(mode.key).filter(n=>n.id!==note.id);localWrite(mode.key,next);setNotes(next);return;}
    const {error:err}=await supabase().from('nvstudio_notes').delete().eq('id',note.id);
    if(err)setError('Suppression impossible : '+err.message);else await refresh();
  }

  return <div className="overlay nv-notes-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section className="nv-notes" role="dialog" aria-modal="true" aria-label="Notes du projet">
      <header><div><strong>Notes</strong><small>{projectName||'Projet'} · attachées à ce projet</small></div>
        <button type="button" onClick={onClose} aria-label="Fermer les notes"><X size={20}/></button></header>
      {mode?.kind==='local'&&<p className="nv-notes-info">{mode.reason}</p>}
      <div className="nv-notes-composer">
        <textarea value={draft} maxLength={4000} rows={3} placeholder="Écris une note pour ce projet…" aria-label="Nouvelle note"
          onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter')void add();}}/>
        <div className="nv-notes-composer-row">
          <label className={'nv-notes-share'+(mode?.kind!=='cloud'?' is-disabled':'')}>
            <input type="checkbox" checked={shared&&mode?.kind==='cloud'} disabled={mode?.kind!=='cloud'} onChange={e=>setShared(e.target.checked)}/>
            <span><Users size={15}/> Partager avec l’équipe du projet</span>
          </label>
          <button type="button" className="nv-notes-add" disabled={!draft.trim()||busy||!mode} onClick={()=>void add()}>Ajouter</button>
        </div>
        <small>{shared&&mode?.kind==='cloud'?'Les personnes invitées sur ce projet verront cette note.':'Note privée : toi seul(e) la vois.'}</small>
      </div>
      {error&&<p className="nv-notes-error" role="alert">{error}</p>}
      <ul className="nv-notes-list">
        {notes.length===0&&<li className="nv-notes-empty">Aucune note pour l’instant.</li>}
        {notes.map(n=><li key={n.id} className={'nv-note'+(n.shared?' is-shared':'')}>
          <div className="nv-note-meta">
            <span className="nv-note-badge">{n.shared?<><Users size={13}/> Partagée</>:<><Lock size={13}/> Privée</>}</span>
            <span>{n.mine?'Moi':who(n.authorEmail)} · {when(n.createdAt)}</span>
            <span className="nv-note-actions">
              {n.mine&&mode?.kind==='cloud'&&<button type="button" onClick={()=>void toggle(n)}>{n.shared?'Rendre privée':'Partager'}</button>}
              {n.mine&&<button type="button" aria-label="Supprimer la note" onClick={()=>void remove(n)}><Trash2 size={14}/></button>}
            </span>
          </div>
          <p>{n.body}</p>
        </li>)}
      </ul>
    </section>
  </div>;
}
