import {confirmAsk} from './confirmDialog';
import {useEffect,useMemo,useState} from 'react';
import {overlayClose} from './overlayClose';
import {Building2,Check,ChevronRight,Cloud,Database,FolderOpen,FolderPlus,Globe,Image as ImageIcon,LoaderCircle,Plus,RefreshCw,Search,Sparkles,Trash2,Users,X} from 'lucide-react';
import {deleteCloudProject,listCloudProjects,loadFromCloud,readCloudClientProfile,saveToCloud,type CloudProject} from './cloud';
import {mergeProfiles} from './aspirateMerge';
import {loadClientDirectory,requestDirectory,type RemoteClient} from './clientDirectory';
import {newProject,type BarStyle,type ClientProfile} from './storage';
import {NovaGenVideos} from './NovaGenVideos';
import {InfoRow} from './InfoRow';
import {ClientMediaEditor,type Palette} from './ClientMediaEditor';
import {DiscoveryDetail,DiscoveryList,useWebDiscovery} from './ClientDiscovery';
import type {ImportedClientVideo} from './novagenVideos';
import {ManualClientForm} from './ManualClientForm';
import {cloudListSkins} from './cloudSkins';
import {applySkin} from './skins';

type Group={key:string;name:string;city:string;projects:CloudProject[];records:RemoteClient[];logoUrl:string;current:boolean};
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
 .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const safeRemoteUrl=(s:string)=>{
 try{const u=new URL(s);return u.protocol==='https:'&&u.username===''&&u.password===''?u.href:'';}
 catch{return '';}
};
const blankProfile:ClientProfile={novagenId:'',name:'',category:'',address:'',city:'',phone:'',email:'',website:'',facebook:'',instagram:'',otherLinks:'',description:''};

export function ClientsDirectory({currentProjectName,currentProfile,onClose,onAssociate,onOpenCloud,canPlaceVideo,onPlaceVideo,onSaveDiscovered,onCreateVisit,currentStyle,onUpdateCurrent,onLaunchAiAssistant}:{
 currentStyle?:Palette;onUpdateCurrent?:(profile:ClientProfile|undefined,style?:Palette)=>void;
 currentHasProject?:boolean;onSaveDiscovered:(profile:ClientProfile,style?:Partial<BarStyle>)=>void;onCreateVisit:(profile:ClientProfile,style?:Partial<BarStyle>,visitName?:string)=>void;
 currentProjectName:string;currentProfile?:ClientProfile;
 canPlaceVideo:boolean;onPlaceVideo:(video:ImportedClientVideo)=>void;
 onClose:()=>void;onAssociate:(profile:ClientProfile)=>void;onOpenCloud:()=>void;
 onLaunchAiAssistant?:()=>void;
}){
 const [studio,setStudio]=useState<CloudProject[]>([]);
 const [remote,setRemote]=useState<RemoteClient[]>([]);
 const [search,setSearch]=useState('');
 const [manualOpen,setManualOpen]=useState(false);
 const [newPropertyName,setNewPropertyName]=useState('');
 const [cloudClient,setCloudClient]=useState<{id:string;profile:ClientProfile|null}|null>(null);
 const [cloudClientError,setCloudClientError]=useState('');
 const [cloudClientLoading,setCloudClientLoading]=useState(false);
 const [selectedKey,setSelectedKey]=useState('');
 const [recordId,setRecordId]=useState('');
 const [loading,setLoading]=useState(true);
 const [moreLoading,setMoreLoading]=useState(false);
 const [errorStudio,setErrorStudio]=useState('');
 const [errorNovaGen,setErrorNovaGen]=useState('');
 const [totalNovaGen,setTotalNovaGen]=useState<number|null>(null);
 const [truncated,setTruncated]=useState(false);
 const [refresh,setRefresh]=useState(0);
 const [savingClient,setSavingClient]=useState(false),[savedNotice,setSavedNotice]=useState('');
 /** Nom du client en cours de complétion par l'aspirateur (vide = recherche d'un nouvel établissement). */
 const [completingName,setCompletingName]=useState('');
 const [updatingClient,setUpdatingClient]=useState(false);
 const [deleteOpen,setDeleteOpen]=useState(false),[deleteWord,setDeleteWord]=useState(''),[deleting,setDeleting]=useState(false),[deleteError,setDeleteError]=useState('');
 const [detailLoading,setDetailLoading]=useState(false),[detailError,setDetailError]=useState('');
 const [detailRetry,setDetailRetry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  setLoading(true);setMoreLoading(true);setErrorStudio('');setErrorNovaGen('');
  // Independent sources: a slow Studio request must not delay NovaGen clients.
  void listCloudProjects().then(projects=>{if(!controller.signal.aborted)setStudio(projects);})
    .catch(e=>{if(!controller.signal.aborted)setErrorStudio(e instanceof Error?e.message:String(e));});
  void loadClientDirectory(controller.signal,page=>{
    if(controller.signal.aborted)return;
    setRemote(previous=>page.clients.map(client=>{const full=previous.find(row=>row.id===client.id&&!row.summaryOnly&&row.updatedAt===client.updatedAt);return full??client;}));setTotalNovaGen(page.total);setTruncated(page.truncated);setLoading(false);
  }).then(({failed})=>{
    if(!controller.signal.aborted&&failed)setErrorNovaGen(failed+' fiche(s) non chargée(s). Clique sur Actualiser pour reprendre.');
  }).catch(e=>{if(!controller.signal.aborted)setErrorNovaGen(e instanceof Error?e.message:String(e));})
    .finally(()=>{if(!controller.signal.aborted){setLoading(false);setMoreLoading(false);}});
  return ()=>controller.abort();
 },[refresh]);
 const groups=useMemo(()=>{
   const map=new Map<string,Group>();
   const make=(name:string,city:string)=>{
     const key=norm(name)||'sans nom';
     if(!map.has(key))map.set(key,{key,name,city,projects:[],records:[],logoUrl:'',current:false});
     return map.get(key)!;
   };
   for(const p of studio)make(p.clientName||p.name,'').projects.push(p);
   for(const r of remote){
     const g=make(r.profile.name||'Sans nom',r.profile.city||'');
     g.records.push(r);
     if(!g.logoUrl&&safeRemoteUrl(r.logoUrl))g.logoUrl=r.logoUrl;
     if(!g.city)g.city=r.profile.city||'';
   }
   // A blank or unsaved Studio project is not automatically an establishment.
   // Show it as a client only after the user has linked a real client profile.
   if(currentProfile?.name?.trim()){
     const local=make(currentProfile.name,currentProfile.city||'');
     local.current=true;
     if(!local.logoUrl&&safeRemoteUrl(currentProfile.logoUrl||''))local.logoUrl=currentProfile.logoUrl!;
   }
   return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'fr'));
 },[studio,remote,currentProjectName,currentProfile]);
 const visible=groups.filter(g=>norm([g.name,g.city,g.records.map(r=>r.profile.address+' '+r.profile.city).join(' ')].join(' ')).includes(norm(search)));
 const discovery=useWebDiscovery(search,visible.length===0&&!manualOpen);
 useEffect(()=>{if(!discovery.candidate&&!discovery.scraping)setCompletingName('');},[discovery.candidate,discovery.scraping]);
 useEffect(()=>setSavedNotice(''),[discovery.candidate]);
 const saveClient=async(profile:ClientProfile,style?:Partial<BarStyle>)=>{
   if(studio.some(p=>norm(p.clientName||p.name)===norm(profile.name))&&!await confirmAsk('Le client « '+profile.name+' » existe déjà dans votre Cloud. Créer une nouvelle fiche quand même ?'))return false;
   setSavingClient(true);setSavedNotice('');
   try{
     // La fiche client conserve son skin : il servira aussi pour les biens futurs.
     let base=newProject();
     if(profile.preferredSkinId){
       const skin=(await cloudListSkins()).find(item=>item.id===profile.preferredSkinId);
       if(!skin)throw Error('Le skin choisi n’est plus disponible dans ce compte Cloud.');
       base=applySkin({...base,bottomBar:[]},skin);
     }
     const record={...base,name:profile.name||'Nouveau client',clientProfile:profile,
       ...(style?{barStyle:{...base.barStyle,...style}}:{})};
     await saveToCloud(record,null,()=>{});
     setSavedNotice('✓ Client « '+profile.name+' » enregistré dans votre Cloud NovaStudio : il apparaît dans la liste (Studio).');
     setSelectedKey(norm(profile.name));setCloudClient(null);
     setRefresh(v=>v+1);
     return true;
   }catch(e){setSavedNotice('Enregistrement impossible : '+(e instanceof Error?e.message:String(e)));return false;}
   finally{setSavingClient(false);}
 };
 const searching=!!search.trim();
 const selected=visible.find(g=>g.key===selectedKey)||visible[0]||(searching?undefined:groups.find(g=>g.key===selectedKey)||groups[0]);
 const selectedRecord=selected?.records.find(r=>r.id===recordId)||selected?.records[0];
 const selectedCloudProject=selected?.projects.find(p=>norm(p.name)===norm(selected.name))||selected?.projects[0];
 const selectedCloudId=selectedCloudProject?.id;
 useEffect(()=>{
   if(!selectedCloudId){setCloudClient(null);setCloudClientLoading(false);setCloudClientError('');return;}
   let cancelled=false;
   setCloudClientLoading(true);setCloudClientError('');
   void readCloudClientProfile(selectedCloudId).then(profile=>{
     if(!cancelled)setCloudClient({id:selectedCloudId,profile});
   }).catch(e=>{
     if(!cancelled)setCloudClientError(e instanceof Error?e.message:String(e));
   }).finally(()=>{if(!cancelled)setCloudClientLoading(false);});
   return ()=>{cancelled=true;};
 },[selectedCloudId,refresh]);
 // Au premier rendu, selectedCloudId et cloudClient?.id sont tous deux undefined.
 // Il ne faut jamais interpréter "undefined === undefined" comme une fiche chargée
 // ni dereferencer cloudClient alors qu'il est encore null (écran noir React).
 const selectedCloudProfile=selectedCloudId&&cloudClient?.id===selectedCloudId
   ?cloudClient.profile
   :null;
 const profile=selectedRecord?.profile||
   (selected?.current&&currentProfile?currentProfile:selectedCloudProfile??blankProfile);
 const associated=!!currentProfile?.name&&norm(currentProfile.name)===norm(profile.name) &&
   (!profile.novagenId||currentProfile.novagenId===profile.novagenId);
 useEffect(()=>{
  const id=selectedRecord?.id;
  setDetailError('');setDetailLoading(false);
  if(!id||!selectedRecord.summaryOnly)return;
  const controller=new AbortController();setDetailLoading(true);
  void requestDirectory<{client:RemoteClient}>({mode:'detail',id},controller.signal)
    .then(({client})=>{if(!controller.signal.aborted)setRemote(rows=>rows.map(row=>row.id===id?client:row));})
    .catch(e=>{if(!controller.signal.aborted)setDetailError(e instanceof Error?e.message:String(e));})
    .finally(()=>{if(!controller.signal.aborted)setDetailLoading(false);});
  return ()=>controller.abort();
 },[selectedRecord?.id,selectedRecord?.summaryOnly,detailRetry]);
 const pair=async (key:string)=>{
   if(!selectedRecord||selectedRecord.summaryOnly||selectedRecord.unavailable)return;
   const src=selectedRecord.profile;
   const target:ClientProfile={
     ...blankProfile,novagenId:src.novagenId||selectedRecord.id,
     name:src.name,category:src.category,address:src.address,city:src.city,phone:src.phone,
     email:src.email,website:src.website,facebook:src.facebook,instagram:src.instagram,
     otherLinks:src.otherLinks,description:src.description,
     bookingUrl:src.bookingUrl||'',openingHours:src.openingHours||'',
     services:src.services||'',sourceNotes:selectedRecord.notes
   };
   if(currentProfile?.name&&norm(currentProfile.name)!==norm(src.name)&&
     !await confirmAsk('La visite est actuellement associée à « '+currentProfile.name+' ». Associer plutôt « '+src.name+' » ?'))return;
   if(norm(currentProjectName)!==norm(src.name)&&
      !await confirmAsk('Tu es dans le projet « '+currentProjectName+' ». Associer les coordonnées de « '+src.name+' » à ce projet ?'))return;
   onAssociate(target);setSelectedKey(key);onClose();
 };
 /** Lance l'aspirateur (site Internet + NovaGen) pour le client sélectionné : nom, ville et site déjà saisis. */
 const completeSelected=()=>{
   if(!selected)return;
   setCompletingName(selected.name);setSavedNotice('');
   void discovery.complete({...profile,name:profile.name||selected.name,city:profile.city||selected.city});
 };
 /** Met à jour la fiche EXISTANTE (même projet Cloud) : champs vides remplis, rien d'écrasé, aucun doublon. */
 const updateExisting=async(incoming:ClientProfile)=>{
   if(!selected)return;
   if(!selectedCloudProject){
     setSavedNotice('Cette fiche vient de NovaGen (lecture seule). Utilisez « Ajouter à la visite en cours » ou « Créer une visite virtuelle ».');return;
   }
   if(!await confirmAsk('Compléter la fiche « '+selected.name+' » avec ces informations ? Seuls les champs vides seront remplis : rien de ce qui est déjà saisi n’est écrasé.'))return;
   setUpdatingClient(true);setSavedNotice('');
   try{
     const {project,link}=await loadFromCloud(selectedCloudProject.id,()=>{});
     if(project.scenes.length)throw Error('Cette fiche appartient à une visite qui contient des panoramas : ouvrez cette visite, puis utilisez Clients › « Aspirer les informations » dans le panneau de la visite.');
     const {profile:merged,filled}=mergeProfiles(project.clientProfile??cloudClient?.profile??{...blankProfile,name:selected.name},incoming);
     if(!filled.length){setSavedNotice('Rien à ajouter : la fiche contenait déjà toutes ces informations.');return;}
     await saveToCloud({...project,clientProfile:merged},link,()=>{});
     setSavedNotice('✓ Fiche « '+selected.name+' » complétée : '+filled.join(', ')+'.');
     setCloudClient(null);setRefresh(v=>v+1);discovery.close();
   }catch(e){setSavedNotice('Mise à jour impossible : '+(e instanceof Error?e.message:String(e)));}
   finally{setUpdatingClient(false);}
 };
 const ownedProjects=selected?.projects.filter(p=>!p.shared)||[];
 const confirmDelete=async()=>{
   if(!selected||deleting||deleteWord.trim().toLowerCase()!=='supprimer')return;
   setDeleting(true);setDeleteError('');
   try{
     for(const pr of ownedProjects)await deleteCloudProject(pr.id);
     setSavedNotice('✓ Client « '+selected.name+' » supprimé ('+ownedProjects.length+' fiche'+(ownedProjects.length>1?'s':'')+' Studio).');
     setDeleteOpen(false);setDeleteWord('');setSelectedKey('');setCloudClient(null);setRefresh(v=>v+1);
   }catch(e){setDeleteError(e instanceof Error?e.message:String(e));setRefresh(v=>v+1);}
   finally{setDeleting(false);}
 };
 const detailRow=(name:string,value:string|undefined,link?:string)=><InfoRow key={name} label={name} value={value} href={link}/>;
 return <div className="nv-directory-overlay" role="presentation" {...overlayClose(onClose)}>
  <section className="nv-directory-shell" role="dialog" aria-modal="true" aria-label="Répertoire central Clients"
    onClick={e=>e.stopPropagation()}>
    <header className="nv-directory-head">
      <div className="nv-directory-heading"><div className="nv-directory-head-icon"><Users size={22}/></div>
        <div><h2>Clients</h2><p>NovaGen + NovaStudio · Répertoire des établissements</p></div>
      </div>
      <div className="nv-directory-head-actions">
        <button type="button" className="nv-directory-add-client" onClick={()=>{
          if(onLaunchAiAssistant){
            onLaunchAiAssistant();
          }else{
            setManualOpen(true);setSavedNotice('');setSearch('');discovery.close();
          }
        }} title="Créer un client avec l’assistant intelligent NovaStudio AI"><Sparkles size={16}/> Nouveau client (IA)</button>
        <button type="button" className="nv-directory-add-client" style={{background:'rgba(255,255,255,0.08)'}} onClick={()=>{
          setManualOpen(true);setSavedNotice('');setSearch('');discovery.close();
        }} title="Formulaire classique"><Plus size={16}/> Saisie manuelle</button>
        <button type="button" onClick={()=>setRefresh(v=>v+1)} title="Actualiser les clients"><RefreshCw size={16}/> Actualiser</button>
        <button type="button" onClick={onClose} title="Fermer le répertoire" aria-label="Fermer"><X size={20}/></button>
      </div>
    </header>
    <div className="nv-directory-layout">
      <aside className="nv-directory-list">
        <label className="nv-directory-search">
          <Search size={17}/>
          <input type="search" value={search} placeholder="Rechercher un client…" onChange={e=>setSearch(e.target.value)}/>
        </label>
        <div className="nv-directory-list-totals"><span>{groups.length} établissement{groups.length>1?'s':''}</span>
          <span>{loading?'Chargement…':totalNovaGen===null?'NovaGen à connecter':remote.length+' / '+totalNovaGen+' fiche(s) NovaGen'}</span>
        </div>
        <div className="nv-directory-list-scroller">
          {visible.map(g=><button key={g.key} type="button" onClick={()=>{setSelectedKey(g.key);setRecordId('');setManualOpen(false);setNewPropertyName('');}}
            className={'nv-directory-client'+(selected?.key===g.key?' selected':'')}>
            <span className="nv-directory-logo">
              {g.logoUrl?<img src={g.logoUrl} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display='none';}}/>:
                <Building2 size={20}/>}
            </span>
            <span className="nv-directory-client-text"><strong>{g.name}</strong>
              <small>{g.city||[g.projects.length+' visite(s)',g.records.length+' fiche(s)'].join(' · ')}</small>
              <span className="nv-directory-tags">
                {g.records.length>0&&<i>NovaGen</i>}
                {g.projects.length>0&&<i>Studio · {g.projects.length}</i>}
                {g.current&&<i className="is-active">En cours</i>}
              </span>
            </span><ChevronRight size={15} className="nv-dir-chevron"/>
          </button>)}
          {!manualOpen&&<DiscoveryList d={discovery}/>} 
          {!visible.length&&<div className="nv-directory-empty">
             <Building2 size={24}/>
             <span>{loading||moreLoading?'Chargement du répertoire…':'Aucun établissement visible dans cette recherche.'}</span>
             {!!errorStudio&&<button type="button" className="nv-directory-secondary-action" onClick={onOpenCloud}>
               <Cloud size={14}/> Se connecter au Cloud
             </button>}
          </div>}

        </div>
      </aside>
      <main className="nv-directory-detail">
        {manualOpen?<ManualClientForm
          saving={savingClient} notice={savedNotice}
          onSave={async profile=>{
            const ok=await saveClient(profile);
            if(ok){setManualOpen(false);setNewPropertyName('');}
            return ok;
          }}
          onCreateVisit={(profile,propertyName)=>{onCreateVisit(profile,undefined,propertyName);onClose();}}
          onCancel={()=>{setManualOpen(false);setSavedNotice('');}}
        />:discovery.candidate?<DiscoveryDetail d={discovery} onClose={discovery.close} onSaveClient={(p,st)=>void saveClient(p,st)} saving={savingClient} notice={savedNotice}
          completing={completingName?{name:completingName,busy:updatingClient,onApply:p=>void updateExisting(p)}:undefined}
          onSave={async (profile,style)=>{
            if(currentProfile?.name&&norm(currentProfile.name)!==norm(profile.name)&&!await confirmAsk('La visite est actuellement associée à « '+currentProfile.name+' ». Associer plutôt « '+profile.name+' » ?'))return;
            if(norm(currentProjectName)!==norm(profile.name)&&!await confirmAsk('Tu es dans le projet « '+currentProjectName+' ». Enregistrer les informations de « '+profile.name+' » dans ce projet ?'))return;
            onSaveDiscovered(profile,style);onClose();
          }}
          onCreateVisit={(profile,style)=>{onCreateVisit(profile,style);onClose();}}
        />:selected?<div className="nv-directory-detail-inner">
          <div className="nv-directory-title-row">
            <div className="nv-directory-feature-logo">
              {selected.logoUrl?<img src={selected.logoUrl} alt={'Logo '+selected.name}/>:
                <Building2 size={32}/>}
            </div>
            <div><small className="nv-directory-eyebrow">FICHE ÉTABLISSEMENT</small>
              <h3>{selected.name}</h3>
              <p>{selected.city||'Client à compléter'}</p>
              <button type="button" className="nv-directory-secondary-action nv-directory-complete" disabled={!!discovery.scraping||discovery.loading} data-busy={completingName===selected.name?'1':undefined} onClick={completeSelected}
                title="Lit le site Internet et NovaGen : photos, horaires, Facebook, Instagram, coordonnées">
                {discovery.scraping&&completingName===selected.name?<LoaderCircle size={15}/>:<Globe size={15}/>} {discovery.scraping&&completingName===selected.name?'Aspiration en cours…':'Compléter avec Internet'}</button>
              {ownedProjects.length>0&&<button type="button" className="nv-directory-secondary-action nv-directory-delete" onClick={()=>{setDeleteOpen(true);setDeleteWord('');setDeleteError('');}}>
                <Trash2 size={15}/> Supprimer le client</button>}
              {deleteOpen&&<div className="nv-directory-delete-box" role="alertdialog" aria-label="Confirmer la suppression">
                <p><strong>Suppression définitive</strong> de « {selected.name} » : {ownedProjects.length} fiche{ownedProjects.length>1?'s':''} / visite{ownedProjects.length>1?'s':''} Studio, leurs versions, partages et notes. Irréversible.</p>
                <label>Tapez <b>supprimer</b> pour confirmer
                  <input value={deleteWord} onChange={e=>setDeleteWord(e.target.value)} autoComplete="off" autoFocus placeholder="supprimer"/></label>
                {deleteError&&<p role="alert" className="nv-discovery-error">{deleteError}</p>}
                <div><button type="button" onClick={()=>setDeleteOpen(false)} disabled={deleting}>Annuler</button>
                  <button type="button" className="nv-directory-delete-go" disabled={deleting||deleteWord.trim().toLowerCase()!=='supprimer'} onClick={confirmDelete}>
                    {deleting?'Suppression…':'Supprimer définitivement'}</button></div>
              </div>}
              {discovery.error&&!discovery.candidate&&<p role="alert" className="nv-discovery-error">{discovery.error}</p>}
              <div className="nv-directory-tags">
                {selected.records.length>0&&<i>NovaGen</i>}
                {!!selectedRecord?.videoCount&&<i>{selectedRecord.videoCount} vidéo{selectedRecord.videoCount>1?'s':''}</i>}
                {selected.projects.length>0&&<i>NovaStudio</i>}
              </div>
            </div>
          </div>
          {selected.records.length>1&&<label className="nv-directory-record-picker">
            Fiches NovaGen correspondant à ce nom
            <select value={selectedRecord?.id||''} onChange={e=>setRecordId(e.target.value)}>
              {selected.records.map(r=><option value={r.id} key={r.id}>{r.profile.city||r.profile.address||r.id}</option>)}
            </select>
          </label>}
          <div className="nv-directory-sections">
            <section>
              <div className="nv-directory-section-head"><Database size={16}/> Informations</div>
              {detailLoading&&<p role="status">Chargement des détails du client…</p>}
              {detailError&&<p role="alert" className="nv-directory-warning">{detailError} <button type="button" onClick={()=>setDetailRetry(n=>n+1)}>Réessayer les détails</button></p>}
              {selectedRecord?.unavailable&&<p className="nv-directory-warning">Cette fiche NovaGen n'a pas pu être lue.</p>}
              {cloudClientLoading&&!selectedRecord&&!selected.current&&<p className="nv-directory-muted">Chargement de la fiche client Cloud…</p>}
              {cloudClientError&&!selectedRecord&&!selected.current&&<p className="nv-directory-warning">{cloudClientError}</p>}
              {detailRow('Activité',profile.category)}
              {detailRow('Adresse',profile.address)}
              {detailRow('Ville',profile.city)}
              {detailRow('Téléphone',profile.phone,profile.phone?'tel:'+profile.phone.replace(/[^+\d]/g,''):undefined)}
              {detailRow('E-mail',profile.email,profile.email?'mailto:'+profile.email:undefined)}
              {detailRow('Site internet',profile.website,safeRemoteUrl(profile.website))}
              {detailRow('Facebook',profile.facebook,safeRemoteUrl(profile.facebook))}
              {detailRow('Instagram',profile.instagram,safeRemoteUrl(profile.instagram))}
              {detailRow('Réservation',profile.bookingUrl,safeRemoteUrl(profile.bookingUrl||''))}
              {detailRow('Horaires',profile.openingHours)}
              {detailRow('Services',profile.services)}
              {profile.description&&<p className="nv-directory-description">{profile.description}</p>}
              {!selectedRecord&&!selected.current&&!selectedCloudProfile&&!cloudClientLoading&&
                <p className="nv-directory-muted">Aucune fiche client rattachée à ce projet. Les projets Studio existants restent accessibles.</p>}
            </section>
            <section>
              <div className="nv-directory-section-head"><FolderOpen size={16}/> Projets NovaStudio ({selected.projects.length})</div>
              {selected.projects.map(pr=><div className="nv-directory-project" key={pr.id}>
                <div><strong>{pr.name}</strong>
                  <small>Dernière activité : {new Date(pr.updated_at).toLocaleDateString('fr-FR')}</small></div>
                {pr.autosave&&<span>Sauvegardé</span>}
              </div>)}
              {!selected.projects.length&&<p className="nv-directory-muted">Aucun projet Studio enregistré pour ce client.</p>}
              <button className="nv-directory-secondary-action" type="button" onClick={onOpenCloud}>
                <Cloud size={15}/> Ouvrir les projets dans le Cloud
              </button>
              {(profile.name||selected.name)&&<div className="nv-directory-create-property">
                <label>Ajouter un bien ou une visite pour {selected.name}
                  <input value={newPropertyName} maxLength={200}
                    onChange={e=>setNewPropertyName(e.target.value)}
                    placeholder="Ex. Maison Narbonne-Plage"/>
                </label>
                <button type="button" className="nv-directory-associate" disabled={!newPropertyName.trim()||cloudClientLoading}
                  onClick={()=>{
                    const target=profile.name?profile:{...blankProfile,name:selected.name,city:selected.city};
                    onCreateVisit(target,undefined,newPropertyName.trim());
                    onClose();
                  }}>
                  <FolderPlus size={16}/> Créer le bien
                </button>
                <small>Un bien = un projet NovaStudio distinct, rattaché à ce client. Les projets déjà enregistrés sont conservés.</small>
              </div>}
            </section>
            {selected.current&&currentProfile&&onUpdateCurrent&&<section className="nv-directory-edit-section">
              <div className="nv-directory-section-head"><Database size={16}/> Modifier le logo, les photos et les couleurs</div>
              <ClientMediaEditor key={currentProfile.name} profile={currentProfile} onProfile={p=>onUpdateCurrent(p)} style={currentStyle} onStyle={st=>onUpdateCurrent(undefined,st)}/>
              <p className="nv-directory-muted">Les changements s'appliquent à la visite en cours. Cliquez ensuite sur « Enregistrer » (disquette) pour les conserver.</p>
            </section>}
            {!selected.current&&selected.projects.length>0&&<p className="nv-directory-muted">Pour modifier le logo, les photos ou les couleurs de ce client, ouvrez d'abord son projet depuis le Cloud.</p>}
            {(selected.logoUrl||!!selectedRecord?.photoUrls.length)&&<section>
              <div className="nv-directory-section-head"><ImageIcon size={16}/> Médias NovaGen</div>
              <div className="nv-directory-photo-strip">
                {selected.logoUrl&&<img src={selected.logoUrl} alt="Logo de l'établissement"/>}
                {selectedRecord?.photoUrls.map((url,i)=><img key={url+i} src={url} loading="lazy" alt={'Photo '+(i+1)}/>)}
              </div>
              <p className="nv-directory-muted">Aperçus temporaires depuis NovaGen. Les fichiers restent dans leur stockage d'origine.</p>
            </section>}
            {selectedRecord&&!selectedRecord.unavailable&&!selectedRecord.summaryOnly&&<NovaGenVideos key={selectedRecord.id} clientId={selectedRecord.id} canPlace={canPlaceVideo} onPlace={onPlaceVideo}/>}
          </div>
          {!selectedRecord&&!!selectedCloudProfile&&!selected.current&&<div className="nv-directory-bottom-actions">
            <button type="button" className="nv-directory-associate" disabled={associated} onClick={async ()=>{
              if(currentProfile?.name&&norm(currentProfile.name)!==norm(selectedCloudProfile.name)&&
                !await confirmAsk('Remplacer le client de la visite actuelle par « '+selectedCloudProfile.name+' » ?'))return;
              onAssociate(selectedCloudProfile);onClose();
            }}>
              <Check size={16}/> {associated?'Déjà associé':'Associer ce client à la visite en cours'}
            </button>
          </div>}
          {selectedRecord&&!selectedRecord.unavailable&&<div className="nv-directory-bottom-actions">
            <button type="button" className="nv-directory-associate" disabled={associated||!!selectedRecord.summaryOnly} onClick={()=>pair(selected.key)}>
              {associated?<><Check size={16}/> Déjà associé</>:<><Check size={16}/> Associer à la visite en cours</>}
            </button>
            <small>Les données de l'établissement sont copiées dans la fiche du projet ; ses photos et son logo restent dans NovaGen.</small>
          </div>}
        </div>:<div className="nv-directory-empty"><Building2 size={30}/> {searching?'Aucune fiche ne correspond à « '+search.trim()+' ». Utilisez « Chercher » à gauche pour le trouver sur le web.':'Aucun client disponible.'}</div>}
      </main>
    </div>
    {(errorStudio||errorNovaGen)&&<div className="nv-directory-status">
      {errorStudio&&<p><Cloud size={14}/> Projets Studio : {errorStudio}
         <button type="button" onClick={onOpenCloud} className="nv-directory-status-action">Ouvrir le Cloud</button></p>}
      {errorNovaGen&&<p><Database size={14}/> Données NovaGen : {errorNovaGen}
         {errorNovaGen.toLowerCase().includes('connecte')&&<button type="button" className="nv-directory-status-action" onClick={onOpenCloud}>Se connecter</button>}</p>}
    </div>}
    {truncated&&<div className="nv-directory-status">NovaGen a atteint la limite de son index (1 000 fiches). Une récupération par lots sera nécessaire pour le reste.</div>}
    <footer className="nv-directory-foot"><span>Création manuelle dans NovaStudio Cloud · NovaGen reste en lecture seule</span>
      <span>{loading?<><LoaderCircle size={13}/> Connexion aux deux sources…</>:
           moreLoading?<><LoaderCircle size={13}/> Chargement des clients : {remote.length} / {totalNovaGen??'…'} fiches NovaGen</>:
           'Sources : NovaStudio Cloud et NovaGen'}</span></footer>
  </section>
 </div>;
}
