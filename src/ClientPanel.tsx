import {useEffect,useRef,useState} from 'react';
import {ExternalLink,FileJson,Link2,PlusCircle,Search,RefreshCw,Sparkles,Check,Image as ImageIcon} from 'lucide-react';
import {emptyClientProfile,type ClientProfile} from './storage';
import {cloudConfigured,supabase} from './cloud';
import {NovaGenVideos} from './NovaGenVideos';
import type {ImportedClientVideo} from './novagenVideos';

type Field='name'|'category'|'address'|'city'|'phone'|'email'|'website'|'facebook'|'instagram'|'otherLinks'|'description'|'bookingUrl'|'openingHours'|'services';
const fields:Array<{key:Field;label:string;placeholder?:string}>=[
  {key:'name',label:'Établissement'},{key:'category',label:'Activité'},
  {key:'address',label:'Adresse'},{key:'city',label:'Ville'},
  {key:'phone',label:'Téléphone'},{key:'email',label:'E-mail'},
  {key:'website',label:'Site internet',placeholder:'https://…'},
  {key:'facebook',label:'Facebook',placeholder:'https://…'},
  {key:'instagram',label:'Instagram',placeholder:'https://…'},
  {key:'bookingUrl',label:'Réservation / Booking',placeholder:'https://…'},
  {key:'otherLinks',label:'Autres liens'},
  {key:'openingHours',label:'Horaires'},
  {key:'services',label:'Services'},
  {key:'description',label:'Description'}
];
type Suggestion={
  nom:string;adresse:string;ville:string;type:string;site:string;tel:string;facebook:string;instagram:string
};
type ScrapeResult={
  fiche:{
    nom:string;type:string;adresse:string;ville:string;tel:string;email:string;
    site:string;facebook:string;instagram:string;booking:string;description:string;
    horaires:string[];services:string[]
  };
  photos:string[];logos:string[];notes:string[]
};
type SuggestResult={resultats:Suggestion[]};
export type ClientLink={label:string;url:string;kind:'link'|'info'};
export function profileLinks(p:ClientProfile):ClientLink[]{
  const result:ClientLink[]=[];
  const web=(value:string|undefined)=>{try{const url=new URL(value||'');return url.protocol==='https:'?url.href:'';}catch{return '';}};
  if(p.phone.trim()&&/^\+?[0-9 ()\-.]{6,30}$/.test(p.phone.trim()))
    result.push({label:'Appeler',url:'tel:'+p.phone.replace(/[^+\d]/g,''),kind:'link'});
  if(p.email&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))
    result.push({label:'E-mail',url:'mailto:'+p.email,kind:'link'});
  for(const [label,value] of [['Site internet',p.website],['Facebook',p.facebook],['Instagram',p.instagram],['Réservation',p.bookingUrl]] as const){
    const url=web(value);if(url)result.push({label,url,kind:'link'});
  }
  if(p.address||p.city)result.push({label:'Itinéraire',url:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([p.address,p.city].filter(Boolean).join(', ')),kind:'link'});
  return result;
}

async function askNovaGen<T>(payload:Record<string,unknown>,signal?:AbortSignal):Promise<T>{
  if(!cloudConfigured)throw new Error('Le Cloud NovaStudio doit être configuré pour utiliser l’aspirateur.');
  const {data,error}=await supabase().auth.getSession();
  if(error||!data.session?.access_token)
    throw new Error('Connecte-toi au Cloud NovaStudio avant de lancer une recherche NovaGen.');
  const response=await fetch('/api/novagen',{
    method:'POST',
    headers:{'content-type':'application/json',authorization:'Bearer '+data.session.access_token},
    body:JSON.stringify(payload),signal,cache:'no-store'
  });
  const raw=await response.text();
  let parsed:Record<string,unknown>={};
  try{parsed=JSON.parse(raw) as Record<string,unknown>;}catch{
    throw new Error('Le service NovaGen n’est pas disponible sur cette version de NovaStudio.');
  }
  if(!response.ok)throw new Error(String(parsed.error||'Erreur NovaGen '+response.status));
  return parsed as T;
}

export function ClientPanel({value,onChange,onAddLink,onPlaceVideo,canPlaceVideo,compact=false}:{
  value:ClientProfile|undefined;
  onChange:(p:ClientProfile)=>void;
  onAddLink:(link:ClientLink)=>void;
  compact?:boolean;
  canPlaceVideo:boolean;onPlaceVideo:(video:ImportedClientVideo)=>void;
}){
  const p=value??emptyClientProfile();
  const input=useRef<HTMLInputElement>(null);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [query,setQuery]=useState('');
  const [city,setCity]=useState('');
  const [suggestions,setSuggestions]=useState<Suggestion[]>([]);
  const [chosen,setChosen]=useState<Suggestion|null>(null);
  const [suggestLoading,setSuggestLoading]=useState(false);
  const [scraping,setScraping]=useState(false);
  const [webLoading,setWebLoading]=useState(false);
  const [candidate,setCandidate]=useState<ScrapeResult|null>(null);
  const [replaceExisting,setReplaceExisting]=useState(false);
  const requestId=useRef(0);
  const patch=(field:Field,v:string)=>{onChange({...p,[field]:v.slice(0,4000)});setNotice('');};

  useEffect(()=>{
    const q=query.trim();
    if(q.length<3||chosen?.nom===q){setSuggestions([]);setSuggestLoading(false);return;}
    const id=++requestId.current;
    const abort=new AbortController();
    const timer=window.setTimeout(()=>{
      setSuggestLoading(true);
      void askNovaGen<SuggestResult>({mode:'suggest',q:city.trim()?q+', '+city.trim():q,ville:city.trim()},abort.signal)
        .then(result=>{if(id===requestId.current){setSuggestions(result.resultats||[]);setError('');}})
        .catch(err=>{if(id===requestId.current&&err?.name!=='AbortError')setError(err instanceof Error?err.message:String(err));})
        .finally(()=>{if(id===requestId.current)setSuggestLoading(false);});
    },700);
    return ()=>{window.clearTimeout(timer);abort.abort();};
  },[query,city,chosen?.nom]);

  const webSuggest=async()=>{
    if(query.trim().length<3)return;
    requestId.current++;
    setWebLoading(true);setError('');
    try{
      const result=await askNovaGen<SuggestResult>({
        mode:'suggest_web',q:query.trim()+(city.trim()?', '+city.trim():''),ville:city.trim()
      });
      setSuggestions(result.resultats||[]);
      if(!result.resultats?.length)setNotice('Aucun établissement trouvé. Tu peux lancer l’aspiration à partir d’un site connu.');
    }catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setWebLoading(false);}
  };
  const scrape=async(source?:Suggestion)=>{
    const target=source||chosen;
    const name=(target?.nom||query.trim()||p.name).trim();
    const sameClient=!target&&name===p.name;
    const website=target?.site||(/^https?:\/\//i.test(name)?name:(sameClient?p.website:''));
    if(!name&&!website){setError('Saisis un établissement ou une adresse de site.');return;}
    setSuggestions([]);setCandidate(null);setScraping(true);setError('');setNotice('');
    if(target){setChosen(target);setQuery(target.nom);setCity(target.ville||city);}
    try{
      const result=await askNovaGen<ScrapeResult>({
        mode:'search',nom:target?.nom||name,ville:target?.ville||city||(sameClient?p.city:''),
        type:target?.type||(sameClient?p.category:''),adresse:target?.adresse||(sameClient?p.address:''),
        tel:target?.tel||(sameClient?p.phone:''),site:website,
        facebook:target?.facebook||(sameClient?p.facebook:''),
        instagram:target?.instagram||(sameClient?p.instagram:'')
      });
      if(!result.fiche||(!result.fiche.nom&&!result.fiche.site))
        throw Error('Aucune fiche exploitable renvoyée par NovaGen.');
      setCandidate(result);
      setNotice('Informations récupérées. Vérifie le résultat puis valide son intégration.');
    }catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setScraping(false);}
  };
  const applyCandidate=()=>{
    if(!candidate)return;
    const f=candidate.fiche;
    const next:ClientProfile={...p};
    const fieldsFromNovaGen:Partial<Record<Field,string>>={
      name:f.nom,category:f.type,address:f.adresse,city:f.ville,phone:f.tel,
      email:f.email,website:f.site,facebook:f.facebook,instagram:f.instagram,
      bookingUrl:f.booking,description:f.description,
      openingHours:(f.horaires||[]).filter(Boolean).join(' · '),
      services:(f.services||[]).filter(Boolean).join(', ')
    };
    for(const [key,value] of Object.entries(fieldsFromNovaGen) as [Field,string][]){
      if(value&&(replaceExisting||!next[key]))Object.assign(next,{[key]:value.slice(0,4000)});
    }
    if(candidate.logos.length&&(replaceExisting||!next.logoUrl))next.logoUrl=candidate.logos[0];
    if(candidate.photos.length&&(replaceExisting||!next.photoUrls?.length))next.photoUrls=candidate.photos.slice(0,24);
    if(candidate.notes.length)next.sourceNotes=candidate.notes.slice(0,12);
    onChange(next);setCandidate(null);
    setNotice('Fiche NovaGen intégrée au projet. Clique sur la disquette pour enregistrer.');
  };

  const importNovaGen=async(file?:File)=>{
    if(!file)return;
    try{
      if(file.size>2_000_000)throw Error('Le fichier JSON doit faire moins de 2 Mo (sans les photos).');
      const parsed:unknown=JSON.parse(await file.text());
      if(!parsed||typeof parsed!=='object')throw Error('Le fichier n’est pas un objet JSON.');
      const obj=parsed as Record<string,unknown>;
      const src=(obj.data&&typeof obj.data==='object'?obj.data:obj) as Record<string,unknown>;
      const fiche=(src.fiche&&typeof src.fiche==='object'?src.fiche:{}) as Record<string,unknown>;
      const links=(src.links&&typeof src.links==='object'?src.links:{}) as Record<string,unknown>;
      const str=(...values:unknown[])=>String(values.find(x=>typeof x==='string'&&x.trim())??'').slice(0,4000);
      const desc=fiche.description;
      const result:ClientProfile={
        ...p,
        novagenId:str(src.id,obj.id),name:str(fiche.nom,links.nom,p.name),
        category:str(fiche.type,links.type,p.category),address:str(fiche.adresse,links.adresse,p.address),
        city:str(fiche.ville,links.ville,p.city),phone:str(fiche.tel,links.tel,p.phone),
        email:str(fiche.email,p.email),website:str(fiche.site,links.site,p.website),
        facebook:str(fiche.facebook,links.facebook,p.facebook),
        instagram:str(fiche.instagram,links.instagram,p.instagram),
        otherLinks:str(links.autres,p.otherLinks),
        bookingUrl:str(fiche.booking,p.bookingUrl),
        openingHours:Array.isArray(fiche.horaires)?fiche.horaires.join(' · ').slice(0,4000):p.openingHours,
        services:Array.isArray(fiche.services)?fiche.services.map(x=>typeof x==='string'?x:(x as Record<string,unknown>)?.fr||'').join(', ').slice(0,4000):p.services,
        description:str(typeof desc==='string'?desc:(desc&&typeof desc==='object'?(desc as Record<string,unknown>).fr:''),p.description)
      };
      if(!result.name&&!result.website&&!result.phone)throw Error('Aucune fiche NovaGen reconnue dans ce JSON.');
      onChange(result);setNotice('Fiche importée. Vérifie les informations avant utilisation.');setError('');
    }catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{if(input.current)input.current.value='';}
  };
  return <section className={'nv-client-content'+(compact?' is-compact':'')}>
    <div className="nv-client-panel-title">
      <div><strong>Informations client</strong><small>NovaGen → NovaStudio · fiche de l’établissement</small></div>
      <button type="button" className="nv-client-import" onClick={()=>input.current?.click()}>
        <FileJson size={15}/> Importer un JSON
      </button>
      <input ref={input} hidden type="file" accept=".json,application/json" onChange={e=>void importNovaGen(e.target.files?.[0])}/>
    </div>
    <section className="nv-client-aspirator">
      <div className="nv-client-aspirator-heading"><Sparkles size={17}/> <strong>Aspirateur NovaGen</strong></div>
      <p>Recherche un établissement par son nom, sa ville ou son site. NovaGen récupère sa fiche et propose les photos et le logo.</p>
      <div className="nv-client-query-row">
        <label>Nom ou site internet
          <input autoComplete="off" value={query} placeholder="Ex. Camping Figurotta" onChange={e=>{setQuery(e.target.value);setChosen(null);setCandidate(null);}}/>
        </label>
        <label>Ville <input value={city} placeholder="Narbonne" onChange={e=>{setCity(e.target.value);setChosen(null);}}/></label>
      </div>
      <div className="nv-client-search-actions">
        <button type="button" disabled={scraping||!query.trim()} onClick={()=>void scrape()}><Search size={15}/> Aspirer les informations</button>
        <button type="button" disabled={webLoading||scraping||query.trim().length<3}
          className="nv-client-secondary" onClick={()=>void webSuggest()}>
          <RefreshCw size={14}/> {webLoading?'Recherche web…':'Plus de résultats'}
        </button>
      </div>
      {suggestLoading&&<small className="nv-client-fetching">Recherche de l’établissement…</small>}
      {!!suggestions.length&&<div className="nv-client-suggestions" aria-label="Suggestions d’établissements">
        {suggestions.map((place,i)=><button type="button" key={place.nom+'-'+i}
          onClick={()=>void scrape(place)}>
          <strong>{place.nom||place.adresse}</strong>
          <small>{[place.adresse,place.ville].filter(Boolean).join(' · ')}</small>
        </button>)}
      </div>}
      {scraping&&<div className="nv-client-fetching"><RefreshCw size={16}/> Analyse du site, des réseaux et des sources publiques par NovaGen…</div>}
      {candidate&&<div className="nv-client-candidate">
        <div className="nv-client-candidate-head">
          <strong><Check size={15}/> Résultat de l’aspiration</strong>
          <span>{candidate.photos.length} photos · {candidate.logos.length} logos proposés</span>
        </div>
        <strong>{candidate.fiche.nom}</strong>
        <small>{[candidate.fiche.adresse,candidate.fiche.ville].filter(Boolean).join(' · ')}</small>
        <div className="nv-client-candidate-facts">
          {candidate.fiche.tel&&<span>☎ {candidate.fiche.tel}</span>}
          {candidate.fiche.site&&<span>{candidate.fiche.site}</span>}
          {candidate.fiche.description&&<p>{candidate.fiche.description.slice(0,280)}{candidate.fiche.description.length>280?'…':''}</p>}
        </div>
        {(candidate.photos.length>0||candidate.logos.length>0)&&
          <div className="nv-client-found-media">
            {candidate.logos[0]&&<img src={candidate.logos[0]} alt="Logo trouvé" loading="lazy"/>}
            {candidate.photos.slice(0,7).map((src,i)=><img key={src+i} src={src} alt={'Photo trouvée '+(i+1)} loading="lazy"/>)}
          </div>}
        {!!candidate.notes.length&&<details><summary>{candidate.notes.length} information(s) à vérifier</summary>
          {candidate.notes.map((n,i)=><p key={i}>{n}</p>)}
        </details>}
        <label className="nv-client-replace-check">
          <input type="checkbox" checked={replaceExisting} onChange={e=>setReplaceExisting(e.target.checked)}/>
          Remplacer aussi les champs déjà renseignés
        </label>
        <div className="nv-client-candidate-actions">
          <button type="button" onClick={applyCandidate}><Check size={15}/> Intégrer les informations</button>
          <button type="button" className="nv-client-secondary" onClick={()=>setCandidate(null)}>Annuler</button>
        </div>
        <small className="nv-client-note"><ImageIcon size={13}/> Les photos et logos détectés sont conservés comme références dans la fiche. Leur import définitif dans la photothèque sera ajouté dans une étape ultérieure.</small>
      </div>}
    </section>
    {error&&<p role="alert" className="nv-client-error">{error}</p>}
    {notice&&<p className="nv-client-ok">{notice}</p>}
    <div className="nv-client-fields">
      {fields.map(f=><label key={f.key} className={['description','services','openingHours'].includes(f.key)?'nv-client-wide':''}>
        <span>{f.label}</span>
        {['description','services','openingHours'].includes(f.key)?
          <textarea rows={f.key==='description'?3:2} value={p[f.key]??''} onChange={e=>patch(f.key,e.target.value)}/>:
          <input value={p[f.key]??''} placeholder={f.placeholder??''} onChange={e=>patch(f.key,e.target.value)}/>}
      </label>)}
    </div>
    {!!p.photoUrls?.length&&<div className="nv-client-saved-photos">
      <strong>Photos repérées par NovaGen ({p.photoUrls.length})</strong>
      <div>{p.photoUrls.slice(0,12).map((url,i)=><img src={url} alt={'Photo repérée '+(i+1)} key={url+i} loading="lazy"/>)}</div>
      <small>Références externes uniquement, pas encore importées dans le stockage média NovaStudio.</small>
    </div>}
    <div className="nv-client-reuse">
      <strong><Link2 size={15}/> Réutiliser dans la visite</strong>
      <small>Ajoute un bouton à la barre inférieure depuis les coordonnées validées.</small>
      <div className="nv-client-actions">
        {profileLinks(p).map(link=><button key={link.label} type="button"
          onClick={()=>{onAddLink(link);setNotice('Bouton « '+link.label+' » ajouté à la barre.');}}>
          <PlusCircle size={14}/> {link.label}
        </button>)}
        {!profileLinks(p).length&&<small>Renseigne un téléphone, un e-mail ou un site pour créer des boutons.</small>}
      </div>
    </div>
    {p.novagenId&&<NovaGenVideos key={p.novagenId} clientId={p.novagenId} canPlace={canPlaceVideo} onPlace={onPlaceVideo}/>}
    <p className="nv-client-footnote"><ExternalLink size={13}/> L’aspirateur nécessite une session Cloud. Les données client ne sont pas publiées dans les visites. Enregistre le projet avec la disquette.</p>
  </section>;
}
