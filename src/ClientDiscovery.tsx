import {useEffect,useRef,useState} from 'react';
import {Check,Globe,FilePlus2,Palette,Save,Image as ImageIcon,LoaderCircle,RefreshCw,Search,X} from 'lucide-react';
import {askNovaGen,type ScrapeResult,type Suggestion,type SuggestResult} from './ClientPanel';
import type {BarStyle,ClientProfile} from './storage';
import {proposalsFromImages,type SkinProposal} from './skinPalette';
import {InfoRow} from './InfoRow';

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
  const [proposals,setProposals]=useState<SkinProposal[]>([]);
  const [proposalError,setProposalError]=useState('');
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
      setProposals([]);setProposalError('');
      void proposalsFromImages([...result.logos,...result.photos.slice(0,2)]).then(setProposals).catch(e=>setProposalError(e instanceof Error?e.message:String(e)));
    }catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setScraping('');}
  };
  return {suggestions,loading,error,searched,candidate,scraping,proposals,proposalError,run,open,close:()=>setCandidate(null),query:q};
}

export function profileFromScrape(r:ScrapeResult,photos?:string[]):ClientProfile{
  const f=r.fiche;
  return {
    novagenId:'',name:f.nom,category:f.type,address:f.adresse,city:f.ville,phone:f.tel,email:f.email,
    website:f.site,facebook:f.facebook,instagram:f.instagram,otherLinks:'',description:f.description,
    bookingUrl:f.booking,openingHours:(f.horaires||[]).filter(Boolean).join(' · '),
    services:(f.services||[]).filter(Boolean).join(', '),
    logoUrl:r.logos[0]||'',photoUrls:(photos??r.photos).slice(0,24),sourceNotes:r.notes.slice(0,12)
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

export type DiscoveryActions={
  onSave:(profile:ClientProfile,style?:Partial<BarStyle>)=>void;
  onCreateVisit:(profile:ClientProfile,style?:Partial<BarStyle>)=>void;
};
function PalettePreview({style}:{style:SkinProposal['style']}){
  return <span className="nv-skin-preview" style={{background:style.background,borderColor:style.outline}}>
    {[0,1,2].map(i=><i key={i} style={{background:style.button,borderColor:style.buttonOutline}}><b style={{background:style.icon}}/></i>)}
  </span>;
}
export function DiscoveryDetail({d,onSave,onCreateVisit,onClose}:{d:Discovery;onClose:()=>void}&DiscoveryActions){
  const r=d.candidate;
  const [chosen,setChosen]=useState(0);
  const [photos,setPhotos]=useState<Set<string>>(new Set());
  useEffect(()=>{setChosen(0);setPhotos(new Set((r?.photos||[]).slice(0,12)));},[r]);
  if(!r)return null;
  const f=r.fiche;
  const web=(u?:string)=>{try{const x=new URL(u||'');return x.protocol==='https:'||x.protocol==='http:'?x.href:undefined;}catch{return undefined;}};
  const row=(label:string,value?:string)=>{
    const link=label==='Téléphone'&&value?'tel:'+value.replace(/[^+\d]/g,''):label==='E-mail'&&value?'mailto:'+value:['Site internet','Facebook','Instagram','Réservation'].includes(label)?web(value):undefined;
    return <InfoRow key={label} label={label} value={value} href={link}/>;
  };
  const style=d.proposals[chosen]?.style;
  const profile=()=>profileFromScrape(r,[...photos]);
  const togglePhoto=(src:string)=>setPhotos(prev=>{const next=new Set(prev);if(next.has(src))next.delete(src);else next.add(src);return next;});
  return <div className="nv-directory-detail-inner nv-discovery-detail">
    <div className="nv-directory-title-row">
      <div className="nv-directory-feature-logo">{r.logos[0]?<img src={r.logos[0]} alt={'Logo '+f.nom}/>:<Globe size={30}/>}</div>
      <div><small className="nv-directory-eyebrow">RÉSULTAT DE LA RECHERCHE WEB · NON ENREGISTRÉ</small>
        <h3>{f.nom}</h3><p>{[f.adresse,f.ville].filter(Boolean).join(' · ')||'Établissement trouvé sur le web'}</p></div>
      <button type="button" className="nv-discovery-close" onClick={onClose} aria-label="Fermer ce résultat"><X size={18}/></button>
    </div>
    <div className="nv-directory-sections">
      <section>
        {row('Activité',f.type)}{row('Adresse',f.adresse)}{row('Ville',f.ville)}{row('Téléphone',f.tel)}{row('E-mail',f.email)}
        {row('Site internet',f.site)}{row('Facebook',f.facebook)}{row('Instagram',f.instagram)}{row('Réservation',f.booking)}
        {row('Horaires',(f.horaires||[]).filter(Boolean).join(' · '))}{row('Services',(f.services||[]).filter(Boolean).join(', '))}
        {f.description&&<p className="nv-directory-description">{f.description}</p>}
      </section>
      <section>
        <div className="nv-directory-section-head"><Palette size={16}/> Couleurs proposées pour le skin de la barre</div>
        {!d.proposals.length&&!d.proposalError&&<p className="nv-directory-muted"><LoaderCircle size={13}/> Analyse des couleurs du logo…</p>}
        {d.proposalError&&<p className="nv-directory-muted">{d.proposalError} Les couleurs actuelles du projet seront conservées.</p>}
        {d.proposals.length>0&&<div className="nv-skin-choices" role="radiogroup" aria-label="Couleurs du skin">
          {d.proposals.map((p,i)=><button type="button" key={p.name} role="radio" aria-checked={chosen===i} className={chosen===i?'is-selected':''} onClick={()=>setChosen(i)}>
            <PalettePreview style={p.style}/><span>{p.name}</span>
            <span className="nv-skin-dots">{[p.style.button,p.style.buttonOutline,p.style.background].map((c,k)=><em key={k} style={{background:c}}/>)}</span>
          </button>)}
        </div>}
      </section>
      {(r.photos.length>0||r.logos.length>0)&&<section>
        <div className="nv-directory-section-head"><ImageIcon size={16}/> Photos trouvées ({photos.size} / {r.photos.length} retenues)</div>
        <div className="nv-discovery-photos">
          {r.logos.slice(0,2).map((src,i)=><img key={'l'+i} className="is-logo" src={src} alt="Logo trouvé" loading="lazy"/>)}
          {r.photos.slice(0,24).map((src,i)=><button type="button" key={src+i} className={photos.has(src)?'is-on':''} onClick={()=>togglePhoto(src)} aria-pressed={photos.has(src)} title={photos.has(src)?'Retirer cette photo':'Retenir cette photo'}>
            <img src={src} alt={'Photo trouvée '+(i+1)} loading="lazy"/><i>{photos.has(src)?<Check size={13}/>:null}</i>
          </button>)}
        </div>
        <p className="nv-directory-muted">Cliquez sur une photo pour la retenir ou l'écarter. Conservées comme références dans la fiche, pas copiées.</p>
      </section>}
      {r.notes.length>0&&<details className="nv-directory-muted"><summary>{r.notes.length} information(s) à vérifier</summary>{r.notes.map((n,i)=><p key={i}>{n}</p>)}</details>}
    </div>
    <div className="nv-directory-bottom-actions nv-discovery-actions-row">
      <button type="button" className="nv-directory-associate" onClick={()=>onSave(profile(),style)}><Save size={16}/> Enregistrer dans la visite en cours</button>
      <button type="button" className="nv-directory-associate is-create" onClick={()=>onCreateVisit(profile(),style)}><FilePlus2 size={16}/> Créer une visite virtuelle</button>
      <small>« Enregistrer » copie la fiche, les photos retenues et les couleurs choisies dans la visite ouverte, puis l'enregistre. « Créer une visite virtuelle » ouvre un nouveau projet déjà préparé avec ces informations. Rien n'est créé dans NovaGen.</small>
    </div>
  </div>;
}
