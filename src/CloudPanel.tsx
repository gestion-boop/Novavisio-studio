import './publicationState.css';
import {confirmAsk} from './confirmDialog';
import {useEffect,useState} from 'react';
import {overlayClose} from './overlayClose';
import {cloudConfigured,supabase,signOut,listCloudProjects,listOwnedProjectRecipients,saveToCloud,openCloudProject,openCloudRevision,listCloudRevisions,listCloudSpaces,listActivePublicationIds,sameProjectName,deleteCloudProject,readLink,writeLink,type CloudProject,type CloudLink,type CloudRevision,type CloudSpace} from './cloud';
import type {StudioProject} from './storage';
import {LoginBox} from './LoginBox';
import {PasswordBox} from './PasswordBox';
import {XMark} from './XMark';
import {checkMigrations,migrationSql,type MigrationItem} from './migrationCheck';

type Props={
  project:StudioProject;
  onClose:()=>void;
  onOpenClients?:()=>void;
  hasUnsavedChanges:boolean;
  onOpen:(project:StudioProject,link:CloudLink,spaceId?:string,intent?:'share'|'export')=>void;
  onStatus:(message:string)=>void;
  autoEnabled:boolean;
  onAutoChange:(on:boolean)=>void;
  autoLabel:string;
  manualMode?:boolean;
};
export function CloudPanel({project,onClose,onOpenClients,hasUnsavedChanges,onOpen,onStatus,autoEnabled,onAutoChange,autoLabel,manualMode=false}:Props){
  const [userEmail,setUserEmail]=useState<string|null>(null);
  const [showPw,setShowPw]=useState(false);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [items,setItems]=useState<CloudProject[]>([]);
  const [recipients,setRecipients]=useState<Record<string,string[]>>({});
  const [historyFor,setHistoryFor]=useState<string|null>(null);
  const [revisions,setRevisions]=useState<CloudRevision[]>([]);
  const [link,setLink]=useState<CloudLink|null>(readLink());
  const [spaces,setSpaces]=useState<CloudSpace[]>([]);
  const [spaceMenu,setSpaceMenu]=useState<string|null>(null);
  const [toDelete,setToDelete]=useState<CloudProject|null>(null);
  const [migrations,setMigrations]=useState<MigrationItem[]|null>(null);
  const [copiedSql,setCopiedSql]=useState('');
  const [deleteWord,setDeleteWord]=useState('');
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState<'all'|'mine'|'shared'|'public'>('all');
  const [sort,setSort]=useState<'recent'|'name'|'panos'>('recent');
  const [grouped,setGrouped]=useState(true);
  const [openGroups,setOpenGroups]=useState<Set<string>>(new Set());
  const [published,setPublished]=useState<Set<string>>(new Set());
  const [showInstall,setShowInstall]=useState(false);

  async function refresh(){
    try{
      const projects=await listCloudProjects();
      setItems(projects);
      const ownedIds=projects.filter(item=>!item.shared).map(item=>item.id);
      setRecipients(await listOwnedProjectRecipients(ownedIds));
      setError('');setSpaces(await listCloudSpaces().catch(()=>[]));
      setPublished(await listActivePublicationIds().catch(()=>new Set<string>()));
    }
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
  const open=(item:CloudProject,spaceId?:string,intent?:'share'|'export')=>run('Ouverture…',async()=>{
    if(hasUnsavedChanges&&!await confirmAsk('Des modifications du projet actuel ne sont pas encore enregistrées. Ouvrir « '+item.name+' » sans sauvegarder ces modifications ?\n\nClique sur Annuler pour utiliser la disquette avant de changer de projet.'))return;
    const loaded=await openCloudProject(item.id,setBusy);
    writeLink(loaded.link);setLink(loaded.link);
    onOpen(loaded.project,loaded.link,spaceId,intent);
    onStatus('Visite cloud ouverte (révision '+loaded.link.revision+')');
    onClose();
  });

  const confirmDelete=()=>{
    const item=toDelete;
    if(!item||deleteWord.trim().toLowerCase()!=='supprimer')return;
    void run('Suppression de « '+item.name+' »…',async()=>{
      await deleteCloudProject(item.id);
      if(readLink()?.projectId===item.id){writeLink(null);setLink(null);}
      setToDelete(null);setDeleteWord('');
      onStatus('Visite « '+item.name+' » supprimée du cloud');
      await refresh();
    });
  };
  const verifyInstall=()=>run('Vérification de l’installation Supabase…',async()=>{setMigrations(await checkMigrations());});
  const copySql=async(file:string)=>{
    try{await navigator.clipboard.writeText(await migrationSql(file));setCopiedSql(file);setTimeout(()=>setCopiedSql(''),2500);}
    catch(e){setError('Copie impossible : '+(e instanceof Error?e.message:String(e)));}
  };
  const showHistory=(item:CloudProject)=>run('Chargement des sauvegardes…',async()=>{
    if(historyFor===item.id){setHistoryFor(null);setRevisions([]);return;}
    setRevisions(await listCloudRevisions(item.id));setHistoryFor(item.id);
  });
  const openRevision=(item:CloudProject,revision:number)=>run('Récupération de la sauvegarde…',async()=>{
    if(hasUnsavedChanges&&!await confirmAsk('Les modifications non enregistrées du projet affiché seront perdues. Ouvrir la révision '+revision+' de « '+item.name+' » ?'))return;
    const loaded=await openCloudRevision(item.id,revision,setBusy);
    writeLink(loaded.link);setLink(loaded.link);
    onOpen(loaded.project,loaded.link);
    onStatus('Sauvegarde historique ouverte : révision '+revision+'. Pour conserver des changements, crée une nouvelle visite cloud.');
    onClose();
  });

  /** Copie une ancienne révision dans une NOUVELLE visite cloud, sans toucher au projet affiché dans l'éditeur ni à l'ancienne visite. */
  const copyRevision=(item:CloudProject,revision:number)=>run('Copie de la révision '+revision+'…',async()=>{
    if(!await confirmAsk('Créer une nouvelle visite cloud à partir de la révision '+revision+' de « '+item.name+' » ?\n\nL’ancienne visite et le projet affiché dans l’éditeur ne sont pas modifiés.'))return;
    const loaded=await openCloudRevision(item.id,revision,setBusy);
    const next=await saveToCloud(loaded.project,null,setBusy);
    onStatus('Nouvelle visite cloud créée : « '+loaded.project.name+' » ('+loaded.project.scenes.length+' panoramas, '+(loaded.project.spaces?.length??0)+' espaces)');
    setHistoryFor(null);setRevisions([]);
    await refresh();
    void next;
  });
  // ---- Liste affichée : recherche, filtre, tri, regroupement par client (début du nom avant « - ») ----
  const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const counts={all:items.length,mine:items.filter(i=>!i.shared).length,shared:items.filter(i=>i.shared).length,public:items.filter(i=>published.has(i.id)).length};
  const visible=items.filter(i=>(filter==='all'||(filter==='mine'&&!i.shared)||(filter==='shared'&&i.shared)||(filter==='public'&&published.has(i.id)))&&(!query.trim()||norm(i.name).includes(norm(query.trim()))))
    .sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,'fr')||(Date.parse(b.updated_at)||0)-(Date.parse(a.updated_at)||0)
      :sort==='panos'?(b.scenes??-1)-(a.scenes??-1)||(Date.parse(b.updated_at)||0)-(Date.parse(a.updated_at)||0)
      :(Date.parse(b.updated_at)||0)-(Date.parse(a.updated_at)||0)||a.name.localeCompare(b.name,'fr'));
  const clientOf=(name:string)=>name.split(/\s+[-–]\s+/)[0].trim()||name;
  type Group={key:string;items:CloudProject[]};
  const groups:Group[]=[];
  if(grouped){
    const byKey=new Map<string,Group>();
    for(const it of visible){const k=clientOf(it.name);let g=byKey.get(k);if(!g){g={key:k,items:[]};byKey.set(k,g);groups.push(g);}g.items.push(it);}
  }else for(const it of visible)groups.push({key:it.id,items:[it]});
  const linked=link?items.find(i=>i.id===link.projectId):undefined;
  const mismatch=!!linked&&!!project.name&&!sameProjectName(linked.name,project.name);
  const dateFr=(d:string)=>new Date(d).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  const projectRow=(item:CloudProject,child:boolean)=><div key={item.id} className={'nv-cloud2-item'+(child?' is-child':'')}>
    <div className="nv-cloud2-row">
      <div className="nv-cloud2-name"><b>{item.name}</b>
        {item.shared?<small className="shared-tag">👥 Partagé avec moi</small>
          :(recipients[item.id]?.length??0)>0&&<small className="shared-tag" title={recipients[item.id].join(' · ')}>👥 Partagé avec {recipients[item.id].map(email=>email.split('@')[0]).join(', ')}</small>}
        {link?.projectId===item.id&&<small className="nv-cloud2-linked">● Projet ouvert dans l’éditeur</small>}
      </div>
      <div className="nv-cloud2-num">{typeof item.scenes==='number'?<><b>{item.scenes}</b></>:<span className="nv-cloud2-dash">—</span>}</div>
      <div className="nv-cloud2-num">{typeof item.spaces==='number'&&item.spaces>0?<b>{item.spaces}</b>:<span className="nv-cloud2-dash">–</span>}</div>
      <div className="nv-cloud2-date">{dateFr(item.updated_at)}<small>{item.autosave?'sauvegarde auto':'rév. '+item.revision}</small></div>
      <div className="nv-cloud2-tags">{published.has(item.id)?<span className="nv-tag t-pub">Lien public</span>:<span className="nv-tag t-priv">Privé</span>}{item.shared&&<span className="nv-tag t-share">Partagé</span>}</div>
      <div className="nv-cloud2-actions">
        <button className="is-open" disabled={!!busy||(!item.revision&&!item.autosave)} onClick={()=>void open(item)}>Ouvrir</button>
        {item.revision>0&&<button disabled={!!busy} onClick={()=>void showHistory(item)}>{historyFor===item.id?'Masquer':'Sauvegardes'}</button>}
        {!item.shared&&<button type="button" className="nv-cloud-delete" disabled={!!busy} title={'Supprimer « '+item.name+' » du cloud'} aria-label={'Supprimer '+item.name} onClick={()=>{setDeleteWord('');setToDelete(item);}}>✕</button>}
      </div>
    </div>
    {spaces.filter(sp=>sp.project_id===item.id).length>0&&<div className="nv-cloud-spaces">
      {spaces.filter(sp=>sp.project_id===item.id).map(sp=>{
        const key=item.id+':'+sp.space_id,isOpen=spaceMenu===key;
        return <span key={sp.space_id} className="nv-cloud-space-chip">
          <button type="button" className={'quiet'+(isOpen?' is-picked':'')} disabled={!!busy} aria-expanded={isOpen} onClick={()=>setSpaceMenu(isOpen?null:key)}>
            ▦ {sp.name} <small>({sp.panorama_count} panoramas)</small>
          </button>
          {isOpen&&<span className="nv-cloud-space-menu" role="menu">
            <button type="button" role="menuitem" disabled={!!busy} onClick={()=>void open(item,sp.space_id)}>Ouvrir cet espace</button>
            <button type="button" role="menuitem" disabled={!!busy} onClick={()=>void open(item,sp.space_id,'share')} title="Publie un lien public qui contient uniquement cet espace : les flèches vers les autres espaces sont retirées">🔗 Lien public de l’espace</button>
            <button type="button" role="menuitem" disabled={!!busy} onClick={()=>void open(item,sp.space_id,'export')} title="Télécharge le dossier (ZIP) de cet espace seul : les flèches vers les autres espaces sont retirées">📦 Exporter l’espace</button>
          </span>}
        </span>;})}
    </div>}
    {historyFor===item.id&&<div className="nv-cloud-history">
      {revisions.map(rev=><div key={rev.revision} className="nv-cloud-rev">
        <button type="button" disabled={!!busy} onClick={()=>void openRevision(item,rev.revision)}>
          Révision {rev.revision} · {new Date(rev.created_at).toLocaleString('fr-FR')}{typeof rev.scenes==='number'&&<> · <b>{rev.scenes} panoramas{typeof rev.spaces==='number'&&rev.spaces>0?' · '+rev.spaces+' espaces':''}</b></>} · Restaurer
        </button>
        {!item.shared&&<button type="button" className="nv-cloud-rev-copy" disabled={!!busy} title="Crée une nouvelle visite cloud à partir de cette révision, sans rien écraser" onClick={()=>void copyRevision(item,rev.revision)}>Copier en nouvelle visite</button>}
      </div>)}
      {!revisions.length&&<small>Aucune révision disponible.</small>}
    </div>}
  </div>;
  const filterBtn=(key:typeof filter,label:string,n:number)=><button type="button" className={'nv-cloud2-nav'+(filter===key?' is-on':'')} aria-pressed={filter===key} onClick={()=>setFilter(key)}>{label}<b>{n}</b></button>;
  const sortBtn=(key:typeof sort,label:string)=><button type="button" className={'nv-cloud2-nav'+(sort===key?' is-on':'')} aria-pressed={sort===key} onClick={()=>setSort(key)}>{label}</button>;
  return <div className="overlay nv-cloud-overlay" {...overlayClose(onClose)}><div className="modal cloud-panel nv-cloud2" onClick={e=>e.stopPropagation()}>
    <button className="close" onClick={onClose} aria-label="Fermer"><XMark/></button>
    <header className="nv-cloud2-head">
      <div><h2>Mes projets Cloud{userEmail&&<span className="nv-cloud2-chip">{userEmail}</span>}</h2>
        <small>{counts.all} visite{counts.all>1?'s':''}{counts.shared>0?' · '+counts.shared+' partagée'+(counts.shared>1?'s':'')+' avec toi':''} · le nombre de panoramas et d’espaces est affiché pour chaque projet</small></div>
      <div className="nv-cloud2-head-actions">
        <button type="button" disabled={!!busy||!userEmail} onClick={()=>void refresh()}>↻ Actualiser</button>
        {userEmail&&<button type="button" className="is-primary" disabled={!!busy||!project.scenes.length} title={project.scenes.length?undefined:'Ajoute d’abord au moins un panorama : un projet vide ne peut pas être envoyé.'} onClick={()=>void send(true)}>＋ Envoyer comme nouvelle visite</button>}
        {userEmail&&!project.scenes.length&&<small className="nv-cloud2-empty-hint">Ajoute d’abord un panorama pour l’envoyer.</small>}
      </div>
    </header>
    <aside className="nv-cloud2-side">
      <h4>Afficher</h4>{filterBtn('all','Tout',counts.all)}{filterBtn('mine','Mes visites',counts.mine)}{filterBtn('shared','Partagées avec moi',counts.shared)}{filterBtn('public','Liens publics actifs',counts.public)}
      <h4>Trier par</h4>{sortBtn('recent','Dernière modification')}{sortBtn('name','Nom')}{sortBtn('panos','Nombre de panoramas')}
      <h4>Outils</h4>
      {onOpenClients&&<button type="button" className="nv-cloud2-nav" onClick={onOpenClients}>👥 Clients &amp; logos</button>}
      {userEmail&&<button type="button" className={'nv-cloud2-nav'+(showInstall?' is-on':'')} onClick={()=>{setShowInstall(v=>{if(!v&&!migrations)void verifyInstall();return !v;});}}>🛠 Installation Supabase{migrations?(migrations.some(m=>m.state==='missing')?' ⚠':' ✓'):''}</button>}
      {userEmail&&<button type="button" className={'nv-cloud2-nav'+(showPw?' is-on':'')} onClick={()=>setShowPw(v=>!v)}>🔑 Mon mot de passe</button>}
      {userEmail&&<button type="button" className="nv-cloud2-nav" onClick={()=>void signOut()}>⎋ Se déconnecter</button>}
    </aside>
    <main className="nv-cloud2-main">
    {!cloudConfigured?<>
      <p className="warning">Supabase n’est pas configuré. Définis <code>NEXT_PUBLIC_SUPABASE_URL</code> et <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> (clé <b>publishable</b> uniquement) dans les variables d’environnement du déploiement, puis redéploie.</p>
    </>:!userEmail?<LoginBox intro="Connecte-toi pour sauvegarder tes visites dans Supabase, ou pour ouvrir une visite à laquelle on t’a invité."/>
    :<>
      {showPw&&<PasswordBox intro="Définis (ou change) le mot de passe de ton compte : tu pourras te connecter avec ton e-mail et ce mot de passe, en plus du lien magique."/>}
      {mismatch&&linked&&<div className="nv-cloud2-warn" role="alert">⚠ <div><b>Projet ouvert dans l’éditeur : « {project.name} »</b> — lié au Cloud « {linked.name} ». Les noms ne correspondent pas : à l’enregistrement, une confirmation te sera demandée. Pour garder deux projets séparés, utilise « Envoyer comme nouvelle visite ».</div></div>}
      {showInstall&&<div className="nv-install-check nv-cloud2-install">
        <p className="hint-inline">Vérifie que toutes les mises à jour de la base sont installées. Pour une mise à jour manquante : copie son SQL, ouvre l’éditeur SQL de ton projet Supabase, colle, puis exécute.</p>
        <button type="button" className="quiet" disabled={!!busy} onClick={()=>void verifyInstall()}>↻ Revérifier</button>
        {migrations&&<ul className="nv-install-list">{migrations.map(m=><li key={m.file} className={'is-'+m.state}>
          <span className="nv-install-dot">{m.state==='ok'?'✓':m.state==='missing'?'⚠':'?'}</span>
          <span><b>{m.title}</b><small>{m.state==='missing'?'À installer — '+m.why:m.state==='unknown'?'Vérification impossible : '+(m.detail??''):'Installée'}</small></span>
          {m.state==='missing'&&<button type="button" className="quiet" onClick={()=>void copySql(m.file)}>{copiedSql===m.file?'Copié ✓':'Copier le SQL'}</button>}
        </li>)}</ul>}
      </div>}
      {!manualMode&&<label className="toggle-row cloud-auto"><input type="checkbox" checked={autoEnabled} onChange={e=>onAutoChange(e.target.checked)}/> <span><b>Sauvegarde instantanée dans Supabase</b><small>{autoLabel}</small></span></label>}
      <div className="nv-cloud2-tools">
        <input className="nv-cloud2-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="🔍 Rechercher un projet, un client, un espace…" aria-label="Rechercher un projet"/>
        <button type="button" className={'nv-cloud2-chip'+(grouped?' is-on':'')} aria-pressed={grouped} onClick={()=>setGrouped(true)}>Regrouper par client</button>
        <button type="button" className={'nv-cloud2-chip'+(!grouped?' is-on':'')} aria-pressed={!grouped} onClick={()=>setGrouped(false)}>Liste simple</button>
        {link&&<button type="button" className="nv-cloud2-chip" disabled={!!busy||!project.scenes.length} onClick={()=>void send(false)}>Nouvelle révision (visite liée, rév. {link.revision})</button>}
      </div>
      <div className="nv-cloud2-cols" aria-hidden="true"><span>Projet</span><span>Panoramas</span><span>Espaces</span><span>Dernière sauvegarde</span><span>État</span><span/></div>
      {!visible.length&&<p className="hint-inline">{items.length?'Aucun projet ne correspond à ta recherche ou à ce filtre.':'Aucune visite cloud pour l’instant.'}</p>}
      <div className="nv-cloud-scroll nv-cloud2-list" role="region" aria-label="Liste des projets Cloud" tabIndex={0}>
        {groups.map(g=>{
          if(g.items.length===1)return projectRow(g.items[0],false);
          const open=openGroups.has(g.key)||g.items.length<=3||!!query.trim()||g.items.some(i=>i.id===link?.projectId);
          const total=g.items.reduce((n,i)=>n+(i.scenes??0),0);
          const best=g.items.reduce((a,i)=>(i.scenes??0)>(a.scenes??0)?i:a,g.items[0]);
          return <section key={g.key} className="nv-cloud2-group">
            <button type="button" className="nv-cloud2-group-head" aria-expanded={open} onClick={()=>setOpenGroups(prev=>{const n=new Set(prev);if(n.has(g.key))n.delete(g.key);else n.add(g.key);return n;})}>
              <span>{open?'▾':'▸'} <b>{g.key}</b> <small>{g.items.length} projets</small></span>
              <small>plus grande visite : {best.scenes??'?'} panoramas{total>0?' · '+total+' au total (copies comprises)':''}</small>
            </button>
            {open&&g.items.map(i=>projectRow(i,true))}
          </section>;})}
      </div>
    </>}
    </main>
    {toDelete&&<div className="overlay nv-cloud-delete-overlay" onClick={e=>{e.stopPropagation();}}>
      <section className="modal nv-cloud-delete-dialog" role="alertdialog" aria-modal="true" aria-label="Supprimer la visite" onClick={e=>e.stopPropagation()}>
        <h2>Supprimer « {toDelete.name} » ?</h2>
        <p>La visite et toutes ses sauvegardes seront <b>définitivement supprimées du cloud</b>. Cette action est irréversible.</p>
        <label>Tape <b>supprimer</b> pour confirmer
          <input value={deleteWord} onChange={e=>setDeleteWord(e.target.value)} autoComplete="off" autoFocus placeholder="supprimer"
            onKeyDown={e=>{if(e.key==='Enter')confirmDelete();if(e.key==='Escape'){setToDelete(null);}}}/></label>
        <div className="nv-banner-actions">
          <button type="button" className="quiet" onClick={()=>{setToDelete(null);setDeleteWord('');}}>Annuler</button>
          <button type="button" className="nv-cloud-delete-go" disabled={!!busy||deleteWord.trim().toLowerCase()!=='supprimer'} onClick={confirmDelete}>Supprimer définitivement</button>
        </div>
      </section>
    </div>}
    {busy&&<p className="status-adding">{busy}</p>}
    {error&&<p className="warning">{error}</p>}
  </div></div>;
}
