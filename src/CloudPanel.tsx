import {useEffect,useState} from 'react';
import {cloudConfigured,supabase,signOut,listCloudProjects,saveToCloud,openCloudProject,openCloudRevision,listCloudRevisions,readLink,writeLink,type CloudProject,type CloudLink,type CloudRevision} from './cloud';
import type {StudioProject} from './storage';
import {LoginBox} from './LoginBox';

type Props={
  project:StudioProject;
  onClose:()=>void;
  hasUnsavedChanges:boolean;
  onOpen:(project:StudioProject,link:CloudLink)=>void;
  onStatus:(message:string)=>void;
  autoEnabled:boolean;
  onAutoChange:(on:boolean)=>void;
  autoLabel:string;
  manualMode?:boolean;
};
export function CloudPanel({project,onClose,hasUnsavedChanges,onOpen,onStatus,autoEnabled,onAutoChange,autoLabel,manualMode=false}:Props){
  const [userEmail,setUserEmail]=useState<string|null>(null);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [items,setItems]=useState<CloudProject[]>([]);
  const [historyFor,setHistoryFor]=useState<string|null>(null);
  const [revisions,setRevisions]=useState<CloudRevision[]>([]);
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
    if(hasUnsavedChanges&&!window.confirm('Des modifications du projet actuel ne sont pas encore enregistrées. Ouvrir « '+item.name+' » sans sauvegarder ces modifications ?\n\nClique sur Annuler pour utiliser la disquette avant de changer de projet.'))return;
    const loaded=await openCloudProject(item.id,setBusy);
    writeLink(loaded.link);setLink(loaded.link);
    onOpen(loaded.project,loaded.link);
    onStatus('Visite cloud ouverte (révision '+loaded.link.revision+')');
    onClose();
  });

  const showHistory=(item:CloudProject)=>run('Chargement des sauvegardes…',async()=>{
    if(historyFor===item.id){setHistoryFor(null);setRevisions([]);return;}
    setRevisions(await listCloudRevisions(item.id));setHistoryFor(item.id);
  });
  const openRevision=(item:CloudProject,revision:number)=>run('Récupération de la sauvegarde…',async()=>{
    if(hasUnsavedChanges&&!window.confirm('Les modifications non enregistrées du projet affiché seront perdues. Ouvrir la révision '+revision+' de « '+item.name+' » ?'))return;
    const loaded=await openCloudRevision(item.id,revision,setBusy);
    writeLink(loaded.link);setLink(loaded.link);
    onOpen(loaded.project,loaded.link);
    onStatus('Sauvegarde historique ouverte : révision '+revision+'. Pour conserver des changements, crée une nouvelle visite cloud.');
    onClose();
  });

  return <div className="overlay" onClick={onClose}><div className="modal cloud-panel nv-cloud-compact" onClick={e=>e.stopPropagation()}>
    <button className="close" onClick={onClose}>✕</button>
    <div className="nv-cloud-heading"><h2>Mes projets Cloud</h2><button type="button" className="quiet" onClick={()=>void refresh()} disabled={!!busy||!userEmail}>↻ Actualiser</button></div>
    {!cloudConfigured?<>
      <p className="warning">Supabase n’est pas configuré. Définis <code>NEXT_PUBLIC_SUPABASE_URL</code> et <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> (clé <b>publishable</b> uniquement) dans les variables d’environnement du déploiement, puis redéploie.</p>
    </>:!userEmail?<LoginBox intro="Connecte-toi pour sauvegarder tes visites dans Supabase, ou pour ouvrir une visite à laquelle on t’a invité."/>
    :<>
      <p className="nv-cloud-account">Connecté : <b>{userEmail}</b> · <button className="quiet" onClick={()=>void signOut()}>Se déconnecter</button></p>
      {manualMode?
        <p className="hint-inline nv-cloud-hint">Ouvre une visite, travaille, puis sauvegarde avec la <b>disquette Enregistrer</b>.</p>:
        <label className="toggle-row cloud-auto"><input type="checkbox" checked={autoEnabled} onChange={e=>onAutoChange(e.target.checked)}/> <span><b>Sauvegarde instantanée dans Supabase</b><small>{autoLabel}</small></span></label>}
      <p className="hint-inline nv-cloud-hint">Chaque sauvegarde crée une nouvelle révision, sans supprimer les précédentes.</p>
      <div className="cloud-actions">
        <button className="primary" disabled={!!busy||!project.scenes.length} onClick={()=>void send(true)}>Envoyer comme nouvelle visite</button>
        {link&&<button className="quiet" disabled={!!busy||!project.scenes.length} onClick={()=>void send(false)}>Nouvelle révision (visite liée, rév. {link.revision})</button>}
      </div>
      <div className="nv-cloud-list-header"><h3>Visites dans le cloud ({items.length})</h3><small>Plus récent en premier · défiler pour voir la suite</small></div>
      {!items.length&&<p className="hint-inline">Aucune visite cloud pour l’instant.</p>}
      <div className="nv-cloud-scroll" role="region" aria-label="Liste défilante des sauvegardes Cloud" tabIndex={0}><ul className="cloud-list">{items.map(item=><li key={item.id}>
        <span><b>{item.name}{item.shared&&<em className="shared-tag"> · partagée avec toi</em>}</b><small>{item.autosave?'sauvegarde auto':'rév. '+item.revision} · {new Date(item.updated_at).toLocaleString('fr-FR')}</small></span>
        <div className="nv-cloud-recovery-actions">
          <button className="quiet" disabled={!!busy||(!item.revision&&!item.autosave)} onClick={()=>void open(item)}>Ouvrir</button>
          {item.revision>0&&<button className="quiet" disabled={!!busy} onClick={()=>void showHistory(item)}>{historyFor===item.id?'Masquer':'Sauvegardes'}</button>}
        </div>
        {historyFor===item.id&&<div className="nv-cloud-history">
          {revisions.map(rev=><button type="button" key={rev.revision} disabled={!!busy} onClick={()=>void openRevision(item,rev.revision)}>
            Révision {rev.revision} · {new Date(rev.created_at).toLocaleString('fr-FR')} · Restaurer
          </button>)}
          {!revisions.length&&<small>Aucune révision disponible.</small>}
        </div>}
      </li>)}</ul></div>
    </>}
    {busy&&<p className="status-adding">{busy}</p>}
    {error&&<p className="warning">{error}</p>}
  </div></div>;
}
