import {useEffect,useMemo,useState} from 'react';
import {Building2,Check,ChevronRight,Cloud,Database,FolderOpen,Image as ImageIcon,LoaderCircle,RefreshCw,Search,Users,X} from 'lucide-react';
import {listCloudProjects,type CloudProject} from './cloud';
import {loadClientDirectory,requestDirectory,type RemoteClient} from './clientDirectory';
import type {BarStyle,ClientProfile} from './storage';
import {NovaGenVideos} from './NovaGenVideos';
import {InfoRow} from './InfoRow';
import {DiscoveryDetail,DiscoveryList,useWebDiscovery} from './ClientDiscovery';
import type {ImportedClientVideo} from './novagenVideos';

type Group={key:string;name:string;city:string;projects:CloudProject[];records:RemoteClient[];logoUrl:string;current:boolean};
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
 .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const safeRemoteUrl=(s:string)=>{
 try{const u=new URL(s);return u.protocol==='https:'&&u.username===''&&u.password===''?u.href:'';}
 catch{return '';}
};
const blankProfile:ClientProfile={novagenId:'',name:'',category:'',address:'',city:'',phone:'',email:'',website:'',facebook:'',instagram:'',otherLinks:'',description:''};

export function ClientsDirectory({currentProjectName,currentProfile,onClose,onAssociate,onOpenCloud,canPlaceVideo,onPlaceVideo,onSaveDiscovered,onCreateVisit}:{
 currentHasProject?:boolean;onSaveDiscovered:(profile:ClientProfile,style?:Partial<BarStyle>)=>void;onCreateVisit:(profile:ClientProfile,style?:Partial<BarStyle>)=>void;
 currentProjectName:string;currentProfile?:ClientProfile;
 canPlaceVideo:boolean;onPlaceVideo:(video:ImportedClientVideo)=>void;
 onClose:()=>void;onAssociate:(profile:ClientProfile)=>void;onOpenCloud:()=>void
}){
 const [studio,setStudio]=useState<CloudProject[]>([]);
 const [remote,setRemote]=useState<RemoteClient[]>([]);
 const [search,setSearch]=useState('');
 const [selectedKey,setSelectedKey]=useState('');
 const [recordId,setRecordId]=useState('');
 const [loading,setLoading]=useState(true);
 const [moreLoading,setMoreLoading]=useState(false);
 const [errorStudio,setErrorStudio]=useState('');
 const [errorNovaGen,setErrorNovaGen]=useState('');
 const [totalNovaGen,setTotalNovaGen]=useState<number|null>(null);
 const [truncated,setTruncated]=useState(false);
 const [refresh,setRefresh]=useState(0);
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
   for(const p of studio)make(p.name,'').projects.push(p);
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
 const discovery=useWebDiscovery(search,visible.length===0);
 const selected=groups.find(g=>g.key===selectedKey)||visible[0]||groups[0];
 const selectedRecord=selected?.records.find(r=>r.id===recordId)||selected?.records[0];
 const profile=selectedRecord?.profile||
   (selected?.current&&currentProfile?currentProfile:blankProfile);
 const associated=!!currentProfile?.novagenId&&currentProfile.novagenId===profile.novagenId&&!!profile.novagenId;
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
 const pair=(key:string)=>{
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
     !window.confirm('La visite est actuellement associée à « '+currentProfile.name+' ». Associer plutôt « '+src.name+' » ?'))return;
   if(norm(currentProjectName)!==norm(src.name)&&
      !window.confirm('Tu es dans le projet « '+currentProjectName+' ». Associer les coordonnées de « '+src.name+' » à ce projet ?'))return;
   onAssociate(target);setSelectedKey(key);onClose();
 };
 const detailRow=(name:string,value:string|undefined,link?:string)=><InfoRow key={name} label={name} value={value} href={link}/>;
 return <div className="nv-directory-overlay" role="presentation" onClick={onClose}>
  <section className="nv-directory-shell" role="dialog" aria-modal="true" aria-label="Répertoire central Clients"
    onClick={e=>e.stopPropagation()}>
    <header className="nv-directory-head">
      <div className="nv-directory-heading"><div className="nv-directory-head-icon"><Users size={22}/></div>
        <div><h2>Clients</h2><p>NovaGen + NovaStudio · Répertoire des établissements</p></div>
      </div>
      <div className="nv-directory-head-actions">
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
          {visible.map(g=><button key={g.key} type="button" onClick={()=>{setSelectedKey(g.key);setRecordId('');}}
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
          <DiscoveryList d={discovery}/>
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
        {discovery.candidate?<DiscoveryDetail d={discovery} onClose={discovery.close}
          onSave={(profile,style)=>{
            if(currentProfile?.name&&norm(currentProfile.name)!==norm(profile.name)&&!window.confirm('La visite est actuellement associée à « '+currentProfile.name+' ». Associer plutôt « '+profile.name+' » ?'))return;
            if(norm(currentProjectName)!==norm(profile.name)&&!window.confirm('Tu es dans le projet « '+currentProjectName+' ». Enregistrer les informations de « '+profile.name+' » dans ce projet ?'))return;
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
              {!selectedRecord&&!selected.current&&<p className="nv-directory-muted">Ce projet n'a pas encore de fiche NovaGen associée.</p>}
            </section>
            <section>
              <div className="nv-directory-section-head"><FolderOpen size={16}/> Projets NovaStudio ({selected.projects.length})</div>
              {selected.projects.map(pr=><div className="nv-directory-project" key={pr.id}>
                <div><strong>{pr.name}</strong>
                  <small>Dernière activité : {new Date(pr.updated_at).toLocaleDateString('fr-FR')}</small></div>
                {pr.autosave&&<span>Sauvegardé</span>}
              </div>)}
              {!selected.projects.length&&<p className="nv-directory-muted">Aucun projet Studio portant exactement ce nom.</p>}
              <button className="nv-directory-secondary-action" type="button" onClick={onOpenCloud}>
                <Cloud size={15}/> Ouvrir les projets dans le Cloud
              </button>
            </section>
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
          {selectedRecord&&!selectedRecord.unavailable&&<div className="nv-directory-bottom-actions">
            <button type="button" className="nv-directory-associate" disabled={associated||!!selectedRecord.summaryOnly} onClick={()=>pair(selected.key)}>
              {associated?<><Check size={16}/> Déjà associé</>:<><Check size={16}/> Associer à la visite en cours</>}
            </button>
            <small>Les données de l'établissement sont copiées dans la fiche du projet ; ses photos et son logo restent dans NovaGen.</small>
          </div>}
        </div>:<div className="nv-directory-empty"><Building2 size={30}/> Aucun client disponible.</div>}
      </main>
    </div>
    {(errorStudio||errorNovaGen)&&<div className="nv-directory-status">
      {errorStudio&&<p><Cloud size={14}/> Projets Studio : {errorStudio}
         <button type="button" onClick={onOpenCloud} className="nv-directory-status-action">Ouvrir le Cloud</button></p>}
      {errorNovaGen&&<p><Database size={14}/> Données NovaGen : {errorNovaGen}
         {errorNovaGen.toLowerCase().includes('connecte')&&<button type="button" className="nv-directory-status-action" onClick={onOpenCloud}>Se connecter</button>}</p>}
    </div>}
    {truncated&&<div className="nv-directory-status">NovaGen a atteint la limite de son index (1 000 fiches). Une récupération par lots sera nécessaire pour le reste.</div>}
    <footer className="nv-directory-foot"><span>Lecture seule · Aucune fiche d'origine modifiée · recherche web via NovaGen</span>
      <span>{loading?<><LoaderCircle size={13}/> Connexion aux deux sources…</>:
           moreLoading?<><LoaderCircle size={13}/> Chargement des clients : {remote.length} / {totalNovaGen??'…'} fiches NovaGen</>:
           'Sources : NovaStudio Cloud et NovaGen'}</span></footer>
  </section>
 </div>;
}
