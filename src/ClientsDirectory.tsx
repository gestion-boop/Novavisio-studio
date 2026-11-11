import {useEffect,useMemo,useState} from 'react';
import {Building2,Check,ChevronRight,Cloud,Database,ExternalLink,FolderOpen,Image as ImageIcon,LoaderCircle,RefreshCw,Search,Users,X} from 'lucide-react';
import {cloudConfigured,listCloudProjects,supabase,type CloudProject} from './cloud';
import type {ClientProfile} from './storage';

type RemoteClient={
 id:string;profile:ClientProfile;logoUrl:string;photoUrls:string[];
 notes:string[];photoCount:number;hasLogo?:boolean;updatedAt:string;
 source:'novagen';unavailable?:boolean
};
type DirectoryResult={clients:RemoteClient[];total:number;nextOffset:number|null;truncated:boolean};
type Group={key:string;name:string;city:string;projects:CloudProject[];records:RemoteClient[];logoUrl:string;current:boolean};
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
 .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const safeRemoteUrl=(s:string)=>{
 try{const u=new URL(s);return u.protocol==='https:'&&u.username===''&&u.password===''?u.href:'';}
 catch{return '';}
};
const blankProfile:ClientProfile={novagenId:'',name:'',category:'',address:'',city:'',phone:'',email:'',website:'',facebook:'',instagram:'',otherLinks:'',description:''};

async function listNovaGen(offset:number):Promise<DirectoryResult>{
 if(!cloudConfigured)throw Error('Le Cloud NovaStudio doit être configuré.');
 const {data,error}=await supabase().auth.getSession();
 if(error||!data.session?.access_token)throw Error('Connecte-toi au Cloud NovaStudio pour consulter les clients NovaGen.');
 const res=await fetch('/api/novagen-directory',{
   method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+data.session.access_token},
   body:JSON.stringify({mode:'list',offset}),cache:'no-store'
 });
 let body:Record<string,unknown>;
 try{body=await res.json() as Record<string,unknown>;}catch{throw Error('Répertoire NovaGen non disponible sur cette version.');}
 if(!res.ok)throw Error(String(body.error||'Erreur de lecture du répertoire NovaGen.'));
 return body as DirectoryResult;
}

export function ClientsDirectory({currentProjectName,currentProfile,onClose,onAssociate,onOpenCloud}:{
 currentProjectName:string;currentProfile?:ClientProfile;
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
 const [nextOffset,setNextOffset]=useState<number|null>(null);
 const [truncated,setTruncated]=useState(false);
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{
  let cancelled=false;
  setLoading(true);setErrorStudio('');setErrorNovaGen('');setRemote([]);setTotalNovaGen(null);setNextOffset(null);
  const run=async()=>{
   try{
    const ps=await listCloudProjects();
    if(!cancelled)setStudio(ps);
   }catch(e){if(!cancelled){setStudio([]);setErrorStudio(e instanceof Error?e.message:String(e));}}
   // Progressively fetch every NovaGen page, not just the first 18 clients.
   // Keep each completed batch visible, without modifying either database.
   let offset:number|null=0;
   const visited=new Set<number>();
   let firstPage=true;
   try{
    while(offset!==null&&!cancelled){
     if(visited.has(offset))throw new Error('Pagination NovaGen incohérente.');
     visited.add(offset);
     if(!firstPage)setMoreLoading(true);
     const page=await listNovaGen(offset);
     if(cancelled)break;
     setRemote(old=>[...old,...page.clients.filter(x=>!old.some(y=>y.id===x.id))]);
     setTotalNovaGen(page.total);
     setTruncated(page.truncated);
     offset=page.nextOffset;
     setNextOffset(offset);
     if(firstPage){setLoading(false);firstPage=false;}
    }
   }catch(e){if(!cancelled)setErrorNovaGen(e instanceof Error?e.message:String(e));}
   if(!cancelled){setLoading(false);setMoreLoading(false);}
  };
  void run();
  return ()=>{cancelled=true;};
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
 const visible=groups.filter(g=>norm([g.name,g.city,g.records.map(r=>r.profile.address).join(' ')].join(' ')).includes(norm(search)));
 const selected=groups.find(g=>g.key===selectedKey)||visible[0]||groups[0];
 const selectedRecord=selected?.records.find(r=>r.id===recordId)||selected?.records[0];
 const profile=selectedRecord?.profile||
   (selected?.current&&currentProfile?currentProfile:blankProfile);
 const associated=!!currentProfile?.novagenId&&currentProfile.novagenId===profile.novagenId&&!!profile.novagenId;
 const next=async()=>{
   if(nextOffset===null||moreLoading)return;
   setMoreLoading(true);setErrorNovaGen('');
   try{const r=await listNovaGen(nextOffset);
    setRemote(old=>[...old,...r.clients.filter(x=>!old.some(y=>y.id===x.id))]);
    setTotalNovaGen(r.total);setNextOffset(r.nextOffset);setTruncated(r.truncated);
   }catch(e){setErrorNovaGen(e instanceof Error?e.message:String(e));}
   finally{setMoreLoading(false);}
 };
 const pair=(key:string)=>{
   if(!selectedRecord)return;
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
 const detailRow=(name:string,value:string|undefined,link?:string)=>{
  if(!value)return null;
  return <div className="nv-dir-info-row" key={name}>
    <span>{name}</span>
    {link?<a href={link} target="_blank" rel="noopener noreferrer">{value}<ExternalLink size={12}/></a>:<strong>{value}</strong>}
  </div>;
 };
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
          <span>{loading?'Chargement…':totalNovaGen===null?'NovaGen à connecter':totalNovaGen+' fiche(s) NovaGen'}</span>
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
          {!visible.length&&<div className="nv-directory-empty">
             <Building2 size={24}/>
             <span>{loading?'Chargement du répertoire…':'Aucun établissement visible dans cette recherche.'}</span>
             {!!errorStudio&&<button type="button" className="nv-directory-secondary-action" onClick={onOpenCloud}>
               <Cloud size={14}/> Se connecter au Cloud
             </button>}
          </div>}
          {nextOffset!==null&&<div className="nv-directory-pagination-status">
            {moreLoading?<><LoaderCircle size={14}/> Récupération automatique des autres fiches NovaGen…</>:
              <button type="button" className="nv-directory-more" onClick={()=>void next()}>Reprendre le chargement des fiches NovaGen</button>}
          </div>}
        </div>
      </aside>
      <main className="nv-directory-detail">
        {selected?<div className="nv-directory-detail-inner">
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
          </div>
          {selectedRecord&&!selectedRecord.unavailable&&<div className="nv-directory-bottom-actions">
            <button type="button" className="nv-directory-associate" disabled={associated} onClick={()=>pair(selected.key)}>
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
    <footer className="nv-directory-foot"><span>Lecture seule · Aucune fiche d'origine modifiée</span>
      <span>{loading?<><LoaderCircle size={13}/> Connexion aux deux sources…</>:
           moreLoading?<><LoaderCircle size={13}/> Import de toutes les fiches NovaGen en cours…</>:
           'Sources : NovaStudio Cloud et NovaGen'}</span></footer>
  </section>
 </div>;
}
