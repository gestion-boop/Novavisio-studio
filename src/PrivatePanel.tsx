import {useEffect,useState} from 'react';
import {addMember,cloudConfigured,createCollaboratorAccount,listMembers,readLink,removeMember,supabase,type Member} from './cloud';
import type {SyncState} from './cloudSync';
import {studioUrl} from './share';
import {LoginBox} from './LoginBox';
import type {StudioProject} from './storage';

const ALPHABET='abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generatePassword(length=14):string{
  const bytes=crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes,b=>ALPHABET[b%ALPHABET.length]).join('');
}
type Outcome={email:string;password:string;result:'created'|'confirm'|'exists'};
const fmt=(iso:string)=>new Date(iso).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});

/**
 * Lien privé : donner accès à la visite à une autre personne (e-mail + mot de passe) pour qu'elle travaille dessus.
 * Règle de sauvegarde : la dernière personne qui agit a la main (sa sauvegarde remplace la précédente, qui est archivée).
 */
export function PrivatePanel({project,onClose,onStatus,syncNow,syncState,autoEnabled}:{project:StudioProject;onClose:()=>void;onStatus:(m:string)=>void;syncNow:()=>Promise<boolean>;syncState:SyncState;autoEnabled:boolean}){
  const [userEmail,setUserEmail]=useState<string|null>(null);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState(()=>generatePassword());
  const [showPassword,setShowPassword]=useState(false);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [members,setMembers]=useState<Member[]>([]);
  const [outcome,setOutcome]=useState<Outcome|null>(null);
  const [copied,setCopied]=useState(false);
  const [projectId,setProjectId]=useState<string|null>(readLink()?.projectId??null);

  async function refresh(id:string|null){
    if(!id){setMembers([]);return;}
    try{setMembers(await listMembers(id));}catch(e){setError(e instanceof Error?e.message:String(e));}
  }
  useEffect(()=>{
    if(!cloudConfigured)return;
    const db=supabase();
    void db.auth.getSession().then(({data})=>{setUserEmail(data.session?.user.email??null);if(data.session)void refresh(projectId);});
    const {data:sub}=db.auth.onAuthStateChange((_e,session)=>{setUserEmail(session?.user.email??null);if(session)void refresh(readLink()?.projectId??null);else setMembers([]);});
    return ()=>sub.subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  async function copy(text:string){
    try{await navigator.clipboard.writeText(text);return true;}
    catch{
      try{const a=document.createElement('textarea');a.value=text;a.style.position='fixed';a.style.opacity='0';document.body.append(a);a.select();const ok=document.execCommand('copy');a.remove();return ok;}
      catch{return false;}
    }
  }
  const message=(o:Outcome)=>[
    'Bonjour, tu peux travailler avec moi sur la visite « '+(project.name||'Visite')+' » dans NovaVisio Studio.',
    '',
    '1. Ouvre '+studioUrl(),
    '2. Clique sur « Cloud » en haut, puis connecte-toi avec :',
    '   E-mail : '+o.email,
    o.result==='exists'?'   Mot de passe : celui de ton compte NovaVisio / Supabase existant':'   Mot de passe : '+o.password,
    ...(o.result==='confirm'?['   (Tu vas d’abord recevoir un e-mail de confirmation : clique sur le lien qu’il contient.)']:[]),
    '3. Dans « Visites dans le cloud », clique sur « Ouvrir » à côté de « '+(project.name||'Visite')+' ».',
    '',
    'Tes modifications s’enregistrent automatiquement. Si nous modifions en même temps, la dernière personne qui agit garde la main.'
  ].join('\n');

  async function invite(){
    setBusy('Préparation de la visite dans le cloud…');setError('');setOutcome(null);setCopied(false);
    try{
      const clean=email.trim().toLowerCase();
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean))throw new Error('Adresse e-mail non valide.');
      if(password.length<8)throw new Error('Le mot de passe doit faire au moins 8 caractères.');
      if(!project.scenes.length)throw new Error('Importe au moins un panorama avant d’inviter quelqu’un.');
      // 1) la visite doit être ENTIÈREMENT dans le cloud, à jour : sinon la personne invitée ouvrirait une ancienne version.
      if(syncState.kind==='setup')throw new Error(syncState.message);
      if(!autoEnabled)throw new Error('La sauvegarde instantanée est en pause : active-la (bouton « Cloud ») pour que la personne reçoive ta version actuelle.');
      setBusy('Envoi de ta visite dans le cloud (la personne doit recevoir la version actuelle)…');
      const done=await syncNow();
      const link=readLink();
      if(!done||!link)throw new Error('Ta visite n’est pas encore entièrement enregistrée dans le cloud'+(syncState.kind==='error'?' ('+syncState.message+')':'')+'. Attends que la pastille « ☁ Enregistré » apparaisse en haut, puis recommence.');
      setProjectId(link.projectId);
      // 2) autoriser l'adresse, puis créer le compte (e-mail + mot de passe)
      setBusy('Création de l’accès…');
      await addMember(link.projectId,clean);
      const result=await createCollaboratorAccount(clean,password);
      setOutcome({email:clean,password,result});
      onStatus('Accès privé créé pour '+clean);
      setEmail('');setPassword(generatePassword());
      await refresh(link.projectId);
    }catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setBusy('');}
  }
  async function revoke(m:Member){
    if(!projectId||!window.confirm('Retirer l’accès de '+m.email+' ? Elle ne pourra plus ouvrir ni modifier cette visite (son compte n’est pas supprimé).'))return;
    setBusy('Retrait de l’accès…');setError('');
    try{await removeMember(projectId,m.email);onStatus('Accès retiré pour '+m.email);await refresh(projectId);}
    catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setBusy('');}
  }

  return <div className="overlay" onClick={onClose}><div className="modal cloud-panel private-panel" onClick={e=>e.stopPropagation()}>
    <button className="close" onClick={onClose}>✕</button>
    <h2>Lien privé</h2>
    {!cloudConfigured?<p className="warning">Supabase n’est pas configuré sur ce déploiement : le travail à plusieurs est indisponible.</p>
    :!userEmail?<LoginBox intro="Connecte-toi d’abord : c’est ton compte qui est propriétaire de la visite et qui donne les accès."/>
    :<>
      <p className="hint-inline">Donne accès à une autre personne pour qu’elle <b>travaille sur la visite avec toi</b>. Elle se connecte au Studio avec l’e-mail et le mot de passe ci-dessous.</p>
      <div className={'private-sync is-'+syncState.kind}>{syncState.kind==='saved'?'☁ Ta visite est à jour dans le cloud ('+new Date(syncState.at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})+'). La personne recevra cette version.'
        :syncState.kind==='setup'?'☁ '+syncState.message
        :syncState.kind==='saving'||syncState.kind==='pending'?'☁ Envoi de ta visite dans le cloud en cours…'
        :syncState.kind==='error'?'☁ Envoi impossible pour le moment : '+syncState.message
        :'☁ Ta visite sera envoyée dans le cloud au moment de créer l’accès.'}</div>
      <div className="private-rule"><b>Qui sauvegarde ?</b> La dernière personne qui fait une action a la main : sa sauvegarde remplace la précédente (l’ancienne version est archivée). Si l’autre personne modifie pendant que tu ne fais rien, ta fenêtre se met à jour toute seule. Évitez de modifier le même panorama en même temps.</div>
      <form className="login-form" onSubmit={e=>{e.preventDefault();void invite();}}>
        <label>Adresse e-mail de la personne<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="prenom@exemple.fr" autoComplete="off" required/></label>
        <label>Mot de passe à lui donner (8 caractères minimum)
          <span className="pw-row">
            <input type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" minLength={8} required/>
            <button type="button" className="quiet" onClick={()=>setShowPassword(v=>!v)}>{showPassword?'Masquer':'Afficher'}</button>
            <button type="button" className="quiet" onClick={()=>{setPassword(generatePassword());setShowPassword(true);}}>Générer</button>
          </span>
        </label>
        <button className="primary" type="submit" disabled={!!busy||!email.includes('@')||password.length<8}>Créer l’accès privé</button>
      </form>
      {outcome&&<div className="share-result">
        <div className="icon-state-label">ACCÈS CRÉÉ POUR {outcome.email.toUpperCase()}</div>
        <small className="hint-inline">{outcome.result==='created'?'Le compte est actif : la personne peut se connecter tout de suite.'
          :outcome.result==='confirm'?'Supabase envoie à la personne un e-mail de confirmation : elle doit cliquer sur le lien avant de pouvoir se connecter.'
          :'Cette adresse a déjà un compte : elle est autorisée sur la visite, mais son mot de passe actuel reste valable (celui saisi ici n’a pas été appliqué).'}</small>
        <button className="primary" onClick={()=>void copy(message(outcome)).then(setCopied)}>{copied?'Message copié ✓':'Copier le message d’invitation'}</button>
        <small className="hint-inline">Le message contient le mot de passe : envoie-le par un canal sûr (message privé).</small>
      </div>}
      {members.length>0&&<>
        <h3>Personnes ayant accès à cette visite</h3>
        <ul className="cloud-list">{members.map(m=><li key={m.email}>
          <span><b>{m.email}</b><small>accès donné le {fmt(m.created_at)}</small></span>
          <button className="quiet" disabled={!!busy} onClick={()=>void revoke(m)}>Retirer l’accès</button>
        </li>)}</ul>
      </>}
    </>}
    {busy&&<p className="status-adding">{busy}</p>}
    {error&&<p className="warning">{error}</p>}
  </div></div>;
}
