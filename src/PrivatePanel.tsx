import {useEffect,useState} from 'react';
import {addMember,getWriteState,setWriteHolder,cloudConfigured,createCollaboratorAccount,listMembers,readLink,removeMember,saveToCloud,supabase,type Member} from './cloud';
import type {SyncState} from './cloudSync';
import {studioUrl} from './share';
import {LoginBox} from './LoginBox';
import type {StudioProject} from './storage';
import {readSpaceCloudLink,writeSpaceCloudLink,type StudioSpace} from './spaces';

const ALPHABET='abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generatePassword(length=14):string{
  const bytes=crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes,b=>ALPHABET[b%ALPHABET.length]).join('');
}
type Outcome={email:string;password:string;result:'created'|'confirm'|'exists'|'disabled'};
const fmt=(iso:string)=>new Date(iso).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});

/**
 * Lien privé : donner accès à la visite à une autre personne (e-mail + mot de passe) pour qu'elle travaille dessus.
 * Règle de sauvegarde : la dernière personne qui agit a la main (sa sauvegarde remplace la précédente, qui est archivée).
 */
export function PrivatePanel({project,space,onClose,onStatus,syncNow,syncState}:{project:StudioProject;space?:StudioSpace|null;onClose:()=>void;onStatus:(m:string)=>void;syncNow:()=>Promise<boolean>;syncState:SyncState}){
  const [userEmail,setUserEmail]=useState<string|null>(null);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState(()=>generatePassword());
  const [showPassword,setShowPassword]=useState(false);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [members,setMembers]=useState<Member[]>([]);
  const [outcome,setOutcome]=useState<Outcome|null>(null);
  const [copied,setCopied]=useState(false);
  const [includeSpaces,setIncludeSpaces]=useState(true);   // accès direct aux espaces dans le Cloud de la personne
  const [giveHand,setGiveHand]=useState(false);              // lui donner aussi la main pour enregistrer
  const [includePw,setIncludePw]=useState(false); // compte créé à la main dans Supabase : le mot de passe saisi ici est celui du compte
  const [projectId,setProjectId]=useState<string|null>((space?readSpaceCloudLink(space.id,'private'):readLink())?.projectId??null);

  async function refresh(id:string|null){
    if(!id){setMembers([]);return;}
    try{setMembers(await listMembers(id));}catch(e){setError(e instanceof Error?e.message:String(e));}
  }
  useEffect(()=>{
    if(!cloudConfigured)return;
    const db=supabase();
    void db.auth.getSession().then(({data})=>{setUserEmail(data.session?.user.email??null);if(data.session)void refresh(projectId);});
    const {data:sub}=db.auth.onAuthStateChange((_e,session)=>{setUserEmail(session?.user.email??null);if(session)void refresh((space?readSpaceCloudLink(space.id,'private'):readLink())?.projectId??null);else setMembers([]);});
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
    (o.result==='exists'||o.result==='disabled')&&!includePw?'   Mot de passe : celui de ton compte existant':'   Mot de passe : '+o.password,
    ...(o.result==='confirm'?['   (Tu vas d’abord recevoir un e-mail de confirmation : clique sur le lien qu’il contient.)']:[]),
    '3. Dans « Visites dans le cloud », clique sur « Ouvrir » à côté de « '+(project.name||'Visite')+' ».',
    '',
    'Pour enregistrer tes modifications, clique sur la disquette Enregistrer. Les versions précédentes restent consultables.'
  ].join('\n');

  async function invite(){
    setBusy('Préparation de la visite dans le cloud…');setError('');setOutcome(null);setCopied(false);setIncludePw(false);
    try{
      const clean=email.trim().toLowerCase();
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean))throw new Error('Adresse e-mail non valide.');
      if(password.length<8)throw new Error('Le mot de passe doit faire au moins 8 caractères.');
      if(!project.scenes.length)throw new Error('Importe au moins un panorama avant d’inviter quelqu’un.');
      // 1) la visite doit être ENTIÈREMENT dans le cloud, à jour : sinon la personne invitée ouvrirait une ancienne version.
      let link;
      if(space){
        setBusy('Préparation de l’espace privé isolé…');
        const saved=await saveToCloud(project,readSpaceCloudLink(space.id,'private'),setBusy);
        writeSpaceCloudLink(space.id,'private',saved);
        link=saved;
      }else{
        if(syncState.kind==='setup')throw new Error(syncState.message);
        setBusy('Envoi de ta visite dans le cloud (la personne doit recevoir la version actuelle)…');
        const done=await syncNow();
        link=readLink();
        if(!done||!link)throw new Error('Ta visite n’est pas encore entièrement enregistrée dans le cloud'+(syncState.kind==='error'?' ('+syncState.message+')':'')+'. Vérifie les détails dans Cloud, puis réessaie l’envoi.');
      }
      setProjectId(link.projectId);
      // 2) autoriser l'adresse, puis créer le compte (e-mail + mot de passe)
      setBusy('Création de l’accès…');
      await addMember(link.projectId,clean,includeSpaces);
      const result=await createCollaboratorAccount(clean,password);
      if(giveHand&&!space){
        setBusy('Transmission de la main pour enregistrer…');
        const state=await getWriteState(link.projectId);
        if(state)await setWriteHolder(link.projectId,clean,state.revision);
      }
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
    <h2>Lien privé{space?' · '+space.name:''}</h2>
    {space&&<p className="hint-inline"><b>Accès limité à l’espace : {space.name}</b> · {project.scenes.length} panoramas. Les autres espaces ne sont pas inclus. L’invité travaille sur une copie cloud indépendante.</p>}
    {!cloudConfigured?<p className="warning">Supabase n’est pas configuré sur ce déploiement : le travail à plusieurs est indisponible.</p>
    :!userEmail?<LoginBox intro="Connecte-toi d’abord : c’est ton compte qui est propriétaire de la visite et qui donne les accès."/>
    :<>
      <p className="hint-inline">Donne accès à une autre personne pour qu’elle <b>travaille sur la visite avec toi</b>. Elle se connecte au Studio avec l’e-mail et le mot de passe ci-dessous.</p>
      <div className={'private-sync is-'+syncState.kind}>{syncState.kind==='saved'?'☁ Ta visite est à jour dans le cloud ('+new Date(syncState.at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})+'). La personne recevra cette version.'
        :syncState.kind==='setup'?'☁ '+syncState.message
        :syncState.kind==='saving'||syncState.kind==='pending'?'☁ Envoi de ta visite dans le cloud en cours…'
        :syncState.kind==='error'?'☁ Envoi impossible pour le moment : '+syncState.message
        :'☁ Ta visite sera envoyée dans le cloud au moment de créer l’accès.'}</div>
      <div className="private-rule"><b>Qui sauvegarde ?</b> Une seule personne à la fois a « la main » pour enregistrer (indicateur « La main » en haut) : le propriétaire la transmet ou la reprend d’un clic. L’autre peut regarder et travailler, et reçoit un message s’il essaie d’enregistrer. L’historique des versions est conservé.</div>
      <form className="login-form" onSubmit={e=>{e.preventDefault();void invite();}}>
        <label>Adresse e-mail de la personne<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="prenom@exemple.fr" autoComplete="off" required/></label>
        <label>Mot de passe à lui donner (8 caractères minimum)
          <span className="pw-row">
            <input type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" minLength={8} required/>
            <button type="button" className="quiet" onClick={()=>setShowPassword(v=>!v)}>{showPassword?'Masquer':'Afficher'}</button>
            <button type="button" className="quiet" onClick={()=>{setPassword(generatePassword());setShowPassword(true);}}>Générer</button>
          </span>
        </label>
        {!space&&<label className="toggle-row"><input type="checkbox" checked={includeSpaces} onChange={e=>setIncludeSpaces(e.target.checked)}/> Partager aussi tous les espaces liés au projet (accès directs dans son Cloud)</label>}
        {!space&&<label className="toggle-row"><input type="checkbox" checked={giveHand} onChange={e=>setGiveHand(e.target.checked)}/> Donner aussi la main pour enregistrer (vous ne pourrez plus enregistrer tant que vous ne l'avez pas reprise)</label>}
        <button className="primary" type="submit" disabled={!!busy||!email.includes('@')||password.length<8}>Créer l’accès privé</button>
      </form>
      {outcome&&<div className="share-result">
        <div className="icon-state-label">ACCÈS CRÉÉ POUR {outcome.email.toUpperCase()}</div>
        <small className="hint-inline">{outcome.result==='created'?'Le compte est actif : la personne peut se connecter tout de suite.'
          :outcome.result==='confirm'?'Supabase envoie à la personne un e-mail de confirmation : elle doit cliquer sur le lien avant de pouvoir se connecter.'
          :outcome.result==='disabled'?'Les inscriptions sont fermées dans Supabase : l’adresse est bien autorisée sur la visite, mais le compte n’a pas été créé. Crée-le dans Supabase : Authentication → Users → Add user → Create new user (e-mail + mot de passe, case « Auto Confirm User » cochée).'
          :'Cette adresse a déjà un compte : elle est autorisée sur la visite. Son mot de passe actuel reste valable (celui saisi ici n’a pas été appliqué).'}</small>
        {(outcome.result==='exists'||outcome.result==='disabled')&&<label className="toggle-row"><input type="checkbox" checked={includePw} onChange={e=>setIncludePw(e.target.checked)}/> Le mot de passe que je viens de saisir est celui du compte (créé dans Supabase) : l’inclure dans le message</label>}
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
