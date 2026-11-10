import {useEffect,useState} from 'react';
import {cloudConfigured,supabase,signInWithEmail,signOut,listCloudProjects,saveToCloud,openCloudProject,readLink,writeLink,type CloudProject,type CloudLink} from './cloud';
import type {StudioProject} from './storage';

type Props={
  project:StudioProject;
  onClose:()=>void;
  onBackup:()=>void;
  onOpen:(project:StudioProject,link:CloudLink)=>void;
  onStatus:(message:string)=>void;
  autoEnabled:boolean;
  onAutoChange:(on:boolean)=>void;
  autoLabel:string;
};
export function CloudPanel({project,onClose,onBackup,onOpen,onStatus,autoEnabled,onAutoChange,autoLabel}:Props){
  const [email,setEmail]=useState('');
  const [userEmail,setUserEmail]=useState<string|null>(null);
  const [sent,setSent]=useState(false);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [items,setItems]=useState<CloudProject[]>([]);
  const [link,setLink]=useState<CloudLink|null>(readLink());

  async function refresh(){
    try{setItems(await listCloudProjects());setError('');}
    catch(e){setError(e instanceof Error?e.message:String(e));}
  }
  useEffect(()=>{
    if(!cloudConfigured)return;
    const db=supabase();
    void db.auth.getSession().then(({data})=>{
      setUserEmail(data.session?.user.email??null);
      if(data.session)void refresh();
    });
    const {data:sub}=db.auth.onAuthStateChange((_e,session)=>{
      setUserEmail(session?.user.email??null);
      if(session)void refresh();else setItems([]);
    });
    return ()=>sub.subscription.unsubscribe();
  },[]);

  async function run(label:string,task:()=>Promise<void>){
    setBusy(label);setError('');
    try{await task();}catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setBusy('');}
  }
  const send=(asNew:boolean)=>run('Envoi…',async()=>{
    const next=await saveToCloud(project,asNew?null:link,setBusy);
    writeLink(next);setLink(next);
    onStatus('Visite enregistrée dans le cloud (révision '+next.revision+')');
    await refresh();
  });
  const open=(item:CloudProject)=>run('Ouverture…',async()=>{
    if(!window.confirm('Ouvrir « '+item.name+' » (révision '+item.revision+') à la place du projet affiché ? Une sauvegarde .nvstudio.json du projet actuel va d’abord être téléchargée.'))return;
    const loaded=await openCloudProject(item.id,setBusy);
    if(project.scenes.length)onBackup();
    writeLink(loaded.link);setLink(loaded.link);
    onOpen(loaded.project,loaded.link);
    onStatus('Visite cloud ouverte (révision '+loaded.link.revision+')');
    onClose();
  });

  return <div className="overlay" onClick={onClose}><div className="modal cloud-panel" onClick={e=>e.stopPropagation()}>
    <button className="close" onClick={onClose}>✕</button>
    <h2>Cloud Supabase</h2>
    {!cloudConfigured?<>
      <p className="warning">Supabase n’est pas configuré. Définis <code>NEXT_PUBLIC_SUPABASE_URL</code> et <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> (clé <b>publishable</b> uniquement) dans les variables d’environnement du déploiement, puis redéploie.</p>
    </>:!userEmail?<>
      <p>Connecte-toi par lien magique (aucun mot de passe). Rien n’est envoyé au cloud sans ton action.</p>
      {sent?<p>Lien envoyé à <b>{email}</b>. Ouvre-le sur cet appareil, puis reviens ici.</p>:<>
        <input type="email" placeholder="ton@email.fr" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/>
        <button className="primary" disabled={!email.includes('@')||!!busy} onClick={()=>void run('Envoi du lien…',async()=>{await signInWithEmail(email.trim());setSent(true);})}>Recevoir le lien de connexion</button>
      </>}
    </>:<>
      <p>Connecté : <b>{userEmail}</b> · <button className="quiet" onClick={()=>void signOut()}>Se déconnecter</button></p>
      <label className="toggle-row cloud-auto"><input type="checkbox" checked={autoEnabled} onChange={e=>onAutoChange(e.target.checked)}/> <span><b>Sauvegarde instantanée dans Supabase</b><small>{autoLabel}</small></span></label>
      <p className="hint-inline">Chaque enregistrement manuel ci-dessous ajoute une <b>nouvelle révision</b> : rien n’est jamais remplacé ni supprimé dans le cloud.</p>
      <div className="cloud-actions">
        <button className="primary" disabled={!!busy||!project.scenes.length} onClick={()=>void send(true)}>Envoyer comme nouvelle visite</button>
        {link&&<button className="quiet" disabled={!!busy||!project.scenes.length} onClick={()=>void send(false)}>Nouvelle révision (visite liée, rév. {link.revision})</button>}
      </div>
      <h3>Visites dans le cloud</h3>
      {!items.length&&<p className="hint-inline">Aucune visite cloud pour l’instant.</p>}
      <ul className="cloud-list">{items.map(item=><li key={item.id}>
        <span><b>{item.name}</b><small>{item.autosave?'sauvegarde auto':'rév. '+item.revision} · {new Date(item.updated_at).toLocaleString('fr-FR')}</small></span>
        <button className="quiet" disabled={!!busy||(!item.revision&&!item.autosave)} onClick={()=>void open(item)}>Ouvrir</button>
      </li>)}</ul>
    </>}
    {busy&&<p className="status-adding">{busy}</p>}
    {error&&<p className="warning">{error}</p>}
  </div></div>;
}
