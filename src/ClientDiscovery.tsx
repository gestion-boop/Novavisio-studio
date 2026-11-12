import {useEffect,useRef,useState} from 'react';
import {Check,Globe,Image as ImageIcon,LoaderCircle,RefreshCw,Search,X} from 'lucide-react';
import {askNovaGen,type ScrapeResult,type Suggestion,type SuggestResult} from './ClientPanel';
import type {ClientProfile} from './storage';

/**
 * Recherche d'un NOUVEL établissement depuis le répertoire Clients, comme dans NovaGen :
 * saisie du nom → suggestions → fiche détaillée (coordonnées, logo, photos) → association à la visite en cours.
 * Rien n'est écrit dans NovaGen ; la recherche passe par le serveur NovaStudio (/api/novagen, réservé à l'administrateur).
 */
export function useWebDiscovery(query:string,autoSearch:boolean){
  const [suggestions,setSuggestions]=useState<Suggestion[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [searched,setSearched]=useState('');
  const [candidate,setCandidate]=useState<ScrapeResult|null>(null);
  const [scraping,setScraping]=useState('');
  const requestId=useRef(0);
  const q=query.trim();

  const run=async(mode:'suggest'|'suggest_web')=>{
    if(q.length<3)return;
    const id=++requestId.current;
    setLoading(true);setError('');
    try{
      const result=await askNovaGen<SuggestResult>({mode,q,ville:''});
      if(id!==requestId.current)return;
      setSuggestions(result.resultats||[]);setSearched(q);
    }catch(e){if(id===requestId.current)setError(e instanceof Error?e.message:String(e));}
    finally{if(id===requestId.current)setLoading(false);}
  };
  // Même confort que NovaGen : s'il n'y a aucun client correspondant, la recherche web se lance toute seule.
  useEffect(()=>{
    if(q.length<3){requestId.current++;setSuggestions([]);setSearched('');setError('');setLoading(false);return;}
    if(!autoSearch)return;
    const timer=window.setTimeout(()=>void run('suggest'),800);
    return ()=>window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[q,autoSearch]);

  const open=async(place:Suggestion)=>{
    setScraping(place.nom||place.adresse);setError('');setCandidate(null);
    try{
      const result=await askNovaGen<ScrapeResult>({
        mode:'search',nom:place.nom,ville:place.ville,type:place.type,adresse:place.adresse,
        tel:place.tel,site:place.site,facebook:place.facebook,instagram:place.instagram
      });
      if(!result.fiche||(!result.fiche.nom&&!result.fiche.site))throw Error('Aucune fiche exploitable pour cet établissement.');
      setCandidate(result);
    }catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setScraping('');}
  };
  return {suggestions,loading,error,searched,candidate,scraping,run,open,close:()=>setCandidate(null),query:q};
}

export function profileFromScrape(r:ScrapeResult):ClientProfile{
  const f=r.fiche;
  return {
    novagenId:'',name:f.nom,category:f.type,address:f.adresse,city:f.ville,phone:f.tel,email:f.email,
    website:f.site,facebook:f.facebook,instagram:f.instagram,otherLinks:'',description:f.description,
    bookingUrl:f.booking,openingHours:(f.horaires||[]).filter(Boolean).join(' · '),
    services:(f.services||[]).filter(Boolean).join(', '),
    logoUrl:r.logos[0]||'',photoUrls:r.photos.slice(0,24),sourceNotes:r.notes.slice(0,12)
  };
}

type Discovery=ReturnType<typeof useWebDiscovery>;
export function DiscoveryList({d}:{d:Discovery}){
  if(d.query.length<3)return null;
  return <div className="nv-discovery-list">
    <div className="nv-discovery-head"><Globe size={15}/> Nouvel établissement ? <small>recherche web NovaGen</small></div>
    <div className="nv-discovery-actions">
      <button type="button" disabled={d.loading} onClick={()=>void d.run('suggest')}><Search size={14}/> Chercher « {d.query} »</button>
      <button type="button" disabled={d.loading} className="is-secondary" onClick={()=>void d.run('suggest_web')} title="Élargir la recherche au web"><RefreshCw size={13}/> Plus de résultats</button>
    </div>
    {d.loading&&<small className="nv-discovery-status"><LoaderCircle size={13}/> Recherche en cours…</small>}
    {d.scraping&&<small className="nv-discovery-status"><LoaderCircle size={13}/> Analyse de « {d.scraping} »…</small>}
    {d.error&&<p role="alert" className="nv-discovery-error">{d.error}</p>}
    {!d.loading&&!d.error&&d.searched===d.query&&!d.suggestions.length&&<small className="nv-discovery-status">Aucun établissement trouvé. Précisez avec la ville (ex. « Camping Figurotta Bizanet ») ou cliquez sur « Plus de résultats ».</small>}
    {d.suggestions.map((place,i)=><button type="button" key={place.nom+i} className="nv-discovery-item" disabled={!!d.scraping} onClick={()=>void d.open(place)}>
      <strong>{place.nom||place.adresse}</strong>
      <small>{[place.type,place.adresse,place.ville].filter(Boolean).join(' · ')}</small>
    </button>)}
  </div>;
}

export function DiscoveryDetail({d,onAssociate,onClose}:{d:Discovery;onAssociate:(p:ClientProfile)=>void;onClose:()=>void}){
  const r=d.candidate;
  if(!r)return null;
  const f=r.fiche;
  const row=(label:string,value?:string)=>value?<div className="nv-dir-info-row" key={label}><span>{label}</span><strong>{value}</strong></div>:null;
  return <div className="nv-directory-detail-inner nv-discovery-detail">
    <div className="nv-directory-title-row">
      <div className="nv-directory-feature-logo">{r.logos[0]?<img src={r.logos[0]} alt={'Logo '+f.nom}/>:<Globe size={30}/>}</div>
      <div><small className="nv-directory-eyebrow">RÉSULTAT DE LA RECHERCHE WEB · NON ENREGISTRÉ</small>
        <h3>{f.nom}</h3><p>{[f.adresse,f.ville].filter(Boolean).join(' · ')||'Établissement trouvé sur le web'}</p></div>
      <button type="button" className="nv-discovery-close" onClick={onClose} aria-label="Fermer ce résultat"><X size={18}/></button>
    </div>
    <div className="nv-directory-sections"><section>
      {row('Activité',f.type)}{row('Adresse',f.adresse)}{row('Ville',f.ville)}{row('Téléphone',f.tel)}{row('E-mail',f.email)}
      {row('Site internet',f.site)}{row('Facebook',f.facebook)}{row('Instagram',f.instagram)}{row('Réservation',f.booking)}
      {row('Horaires',(f.horaires||[]).filter(Boolean).join(' · '))}{row('Services',(f.services||[]).filter(Boolean).join(', '))}
      {f.description&&<p className="nv-directory-description">{f.description}</p>}
    </section>
    {(r.photos.length>0||r.logos.length>0)&&<section>
      <div className="nv-directory-section-head"><ImageIcon size={16}/> Photos et logo repérés ({r.photos.length+r.logos.length})</div>
      <div className="nv-directory-photo-strip">
        {r.logos.slice(0,2).map((src,i)=><img key={'l'+i} src={src} alt="Logo trouvé" loading="lazy"/>)}
        {r.photos.slice(0,10).map((src,i)=><img key={src+i} src={src} alt={'Photo trouvée '+(i+1)} loading="lazy"/>)}
      </div>
      <p className="nv-directory-muted">Aperçus depuis les sites publics de l'établissement : conservés comme références, pas copiés.</p>
    </section>}
    {r.notes.length>0&&<details className="nv-directory-muted"><summary>{r.notes.length} information(s) à vérifier</summary>{r.notes.map((n,i)=><p key={i}>{n}</p>)}</details>}
    </div>
    <div className="nv-directory-bottom-actions">
      <button type="button" className="nv-directory-associate" onClick={()=>onAssociate(profileFromScrape(r))}><Check size={16}/> Associer à la visite en cours</button>
      <small>Les informations sont copiées dans la fiche client du projet (à enregistrer avec la disquette). Rien n'est créé dans NovaGen.</small>
    </div>
  </div>;
}
