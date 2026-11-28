import {useCallback,useEffect,useRef,useState} from 'react';
import {cloudConfigured,getWriteState,readLink,removeMember,setMemberRole,supabase,type WriteState} from './cloud';
import {confirmAsk} from './confirmDialog';

/**
 * « Utilisateurs de cette visite » (Paramètres de la visite) : liste des personnes qui ont accès à la visite dans le Cloud.
 * Le propriétaire et les administrateurs peuvent donner / retirer l'accès admin et supprimer un utilisateur ;
 * les autres voient seulement la liste. Les contrôles réels sont faits côté Supabase (fonctions nvstudio_*).
 */
const roleLabel=(p:{owner:boolean;role?:'admin'|'collaborator'})=>p.owner?'Propriétaire':p.role==='admin'?'Admin':'Collaborateur';

export function ProjectUsers({onStatus,onInvite}:{onStatus:(m:string)=>void;onInvite:()=>void}){
  const [projectId,setProjectId]=useState<string|null>(()=>readLink()?.projectId??null);
  const [state,setState]=useState<WriteState|null>(null);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const alive=useRef(true);
  useEffect(()=>{alive.current=true;return ()=>{alive.current=false;};},[]);

  const refresh=useCallback(async()=>{
    const id=readLink()?.projectId??null;
    setProjectId(id);
    if(!id||!cloudConfigured){setState(null);return;}
    try{
      const {data}=await supabase().auth.getSession();
      if(!data.session){setState(null);return;}
      const next=await getWriteState(id);
      if(alive.current&&readLink()?.projectId===id)setState(next);
    }catch(e){if(alive.current)setError(e instanceof Error?e.message:String(e));}
  },[]);
  useEffect(()=>{
    void refresh();
    const onFocus=()=>void refresh();
    window.addEventListener('focus',onFocus);
    return ()=>window.removeEventListener('focus',onFocus);
  },[refresh]);

  if(!cloudConfigured)return <p className="hint">Le Cloud n’est pas activé : aucun utilisateur à gérer.</p>;
  if(!projectId)return <p className="hint">Cette visite n’est pas encore enregistrée dans le Cloud. Enregistre-la d’abord : les utilisateurs apparaîtront ici.</p>;
  if(!state)return <p className="hint">Chargement des utilisateurs… (connecte-toi au Cloud si besoin)</p>;

  const canManage=state.isAdmin??state.isOwner;
  async function toggleAdmin(email:string,makeAdmin:boolean){
    if(!projectId)return;
    if(!await confirmAsk(makeAdmin
      ?'Donner l’accès administrateur à '+email+' ?\n\nUn administrateur choisit qui enregistre, gère les droits et peut retirer des utilisateurs.'
      :'Retirer l’accès administrateur de '+email+' ?\n\nLa personne reste collaboratrice de la visite.'))return;
    setBusy(email);setError('');
    try{
      const next=await setMemberRole(projectId,email,makeAdmin?'admin':'collaborator');
      setState(next);onStatus(email+(makeAdmin?' est maintenant administrateur.':' est maintenant collaborateur.'));
    }catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setBusy('');}
  }
  async function remove(email:string){
    if(!projectId)return;
    if(!await confirmAsk('Supprimer l’accès de '+email+' à cette visite ?\n\nLa personne ne pourra plus l’ouvrir ni l’enregistrer. Ses éventuelles sauvegardes déjà faites restent dans l’historique.'))return;
    setBusy(email);setError('');
    try{await removeMember(projectId,email);onStatus('Accès retiré pour '+email);await refresh();}
    catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setBusy('');}
  }

  return <div className="nv-users">
    <p className="hint">Compte connecté : <strong>{state.myEmail}</strong> — {state.isOwner?'propriétaire':canManage?'administrateur':'collaborateur'}. {canManage?'Tu peux donner l’accès admin ou supprimer un utilisateur.':'Seuls le propriétaire et les administrateurs gèrent les utilisateurs.'}</p>
    <ul className="nv-users-list">
      {state.participants.map(p=>{
        const isMe=p.email===state.myEmail;
        const holder=p.email===state.holderEmail;
        return <li key={p.email}>
          <span className="nv-users-who"><b>{p.email.split('@')[0]}{isMe?' (moi)':''}</b><small>{p.email}{holder?' · a la main':''}</small></span>
          <em className={'nv-role nv-role-'+(p.owner||p.role==='admin'?'admin':'collab')}>{roleLabel(p)}</em>
          {canManage&&!p.owner&&!isMe&&<span className="nv-users-actions">
            <button type="button" disabled={!!busy} onClick={()=>void toggleAdmin(p.email,p.role!=='admin')}>{p.role==='admin'?'Retirer admin':'Donner admin'}</button>
            <button type="button" className="danger" disabled={!!busy} onClick={()=>void remove(p.email)}>Supprimer</button>
          </span>}
        </li>;
      })}
    </ul>
    {canManage&&<button type="button" className="import" onClick={onInvite}>＋ Inviter un utilisateur</button>}
    {error&&<p className="warning">{error}</p>}
  </div>;
}
