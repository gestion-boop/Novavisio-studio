import {useEffect,useState} from 'react';
import {Trash2,UserRound} from 'lucide-react';
import {confirmAsk} from './confirmDialog';
import {XMark} from './XMark';
import type {ClientProfile} from './storage';
import {agentError,agentLabel,deleteAgent,emptyAgent,listAgents,saveAgent,type Agent} from './agents';

/** Paramètres > Agents immobiliers : annuaire des agents (nom, prénom, téléphone, lien Info, lien d'intro). */
export function AgentsDialog({onClose}:{onClose:()=>void}){
  const [agents,setAgents]=useState<Agent[]>([]);
  const [draft,setDraft]=useState<Agent|null>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const refresh=async()=>{setAgents(await listAgents());};
  useEffect(()=>{void refresh().catch(e=>setMessage(e instanceof Error?e.message:String(e)));},[]);
  const set=(patch:Partial<Agent>)=>setDraft(d=>d&&{...d,...patch});
  const save=async()=>{
    if(!draft)return;
    const err=agentError(draft);if(err){setMessage(err);return;}
    setBusy(true);setMessage('');
    try{await saveAgent(draft);await refresh();setDraft(null);setMessage('Agent enregistré.');}
    catch(e){setMessage(e instanceof Error?e.message:String(e));}
    finally{setBusy(false);}
  };
  const remove=async(a:Agent)=>{
    if(!await confirmAsk('Supprimer l’agent « '+agentLabel(a)+' » ?\n\nLes visites déjà créées avec cet agent ne changent pas.'))return;
    setBusy(true);setMessage('');
    try{await deleteAgent(a.id);await refresh();setDraft(d=>d?.id===a.id?null:d);}
    catch(e){setMessage(e instanceof Error?e.message:String(e));}
    finally{setBusy(false);}
  };
  return <div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section className="modal nv-agents" role="dialog" aria-modal="true" aria-label="Agents immobiliers" onClick={e=>e.stopPropagation()}>
      <button type="button" className="close" onClick={onClose} aria-label="Fermer"><XMark/></button>
      <h2><UserRound size={20}/> Agents immobiliers</h2>
      <p className="nv-agents-help">Saisis chaque agent une fois. Dans l’onglet Visite du projet, tu le choisis et tout est pré-rempli : son téléphone sur le bouton Appeler, son lien Info sur le bouton « i » et son intro.</p>
      {message&&<p className="nv-agents-msg" role="status">{message}</p>}
      {!draft&&<>
        <ul className="nv-agents-list">
          {agents.map(a=><li key={a.id}>
            <button type="button" className="nv-agents-pick" onClick={()=>{setDraft(a);setMessage('');}}>
              <b>{agentLabel(a)}</b><small>{[a.phone,a.infoUrl?'Info':'',a.introUrl?'Intro':''].filter(Boolean).join(' · ')||'Aucune coordonnée'}</small>
            </button>
            <button type="button" className="nv-agents-del" aria-label={'Supprimer '+agentLabel(a)} disabled={busy} onClick={()=>void remove(a)}><Trash2 size={16}/></button>
          </li>)}
          {!agents.length&&<li className="nv-agents-empty">Aucun agent pour l’instant.</li>}
        </ul>
        <button type="button" className="primary" onClick={()=>{setDraft(emptyAgent());setMessage('');}}>＋ Ajouter un agent</button>
      </>}
      {draft&&<form className="nv-agents-form" onSubmit={e=>{e.preventDefault();void save();}}>
        <label>Prénom<input value={draft.firstName} maxLength={80} onChange={e=>set({firstName:e.target.value})} autoFocus/></label>
        <label>Nom<input value={draft.lastName} maxLength={80} onChange={e=>set({lastName:e.target.value})}/></label>
        <label>Téléphone<input value={draft.phone} maxLength={40} inputMode="tel" placeholder="06 12 34 56 78" onChange={e=>set({phone:e.target.value})}/><small>Placé sur le bouton Appeler de la visite.</small></label>
        <label>Info (lien)<input value={draft.infoUrl} maxLength={2048} placeholder="https://…" onChange={e=>set({infoUrl:e.target.value})}/><small>Ouvert par le bouton « i » de la barre.</small></label>
        <label>Intro (lien)<input value={draft.introUrl} maxLength={2048} placeholder="https://…" onChange={e=>set({introUrl:e.target.value})}/><small>Utilisé comme intro de la visite.</small></label>
        <div className="nv-agents-actions">
          <button type="button" disabled={busy} onClick={()=>{setDraft(null);setMessage('');}}>Annuler</button>
          <button type="submit" className="primary" disabled={busy}>{busy?'Enregistrement…':'Enregistrer l’agent'}</button>
        </div>
      </form>}
    </section>
  </div>;
}

/** Sélecteur d'agent à la création d'une visite : applique toutes les informations en un clic. */
export function AgentPicker({value,profile,onPick}:{value?:string;profile?:ClientProfile;onPick:(agent:Agent|null)=>void}){
  const [agents,setAgents]=useState<Agent[]|null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{void listAgents().then(setAgents).catch(e=>{setAgents([]);setError(e instanceof Error?e.message:String(e));});},[]);
  if(agents===null)return null;
  const selected=value??profile?.agentId??agents.find(a=>a.firstName===profile?.agentFirstName&&a.lastName===profile?.agentLastName)?.id??'';
  return <label className="nv-agent-picker">Agent immobilier
    <select disabled={!!error} value={selected} onChange={e=>onPick(agents.find(a=>a.id===e.target.value)??null)}>
      <option value="">{agents.length?'— Aucun agent —':'Aucun agent enregistré (Paramètres > Agents immobiliers)'}</option>
      {selected&&!agents.some(a=>a.id===selected)&&<option value={selected}>{[profile?.agentFirstName,profile?.agentLastName].filter(Boolean).join(' ')||'Agent indisponible'}</option>}
      {agents.map(a=><option key={a.id} value={a.id}>{agentLabel(a)}{a.phone?' · '+a.phone:''}</option>)}
    </select>
    {error&&<small>{error}</small>}
    <small>Pré-remplit le téléphone (bouton Appeler), le lien Info (bouton « i ») et l’intro.</small>
  </label>;
}
