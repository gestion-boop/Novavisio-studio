import {useEffect,useState,type Dispatch,type SetStateAction} from 'react';
import {Check,LoaderCircle} from 'lucide-react';
import type {BarStyle,BottomBarItem,StudioProject} from './storage';
import {profileLinks} from './ClientPanel';
import {InfoRow} from './InfoRow';
import {proposalsFromImages,type SkinProposal} from './skinPalette';

type SetProject=Dispatch<SetStateAction<StudioProject>>;
const https=(u?:string)=>{try{const x=new URL(u||'');return x.protocol==='https:'?x.href:'';}catch{return '';}};

/** Étape « Client » du parcours : la fiche trouvée, à vérifier, et les photos à retenir. */
export function ClientStep({project,setProject}:{project:StudioProject;setProject:SetProject}){
  const c=project.clientProfile;
  if(!c)return null;
  const logo=https(c.logoUrl);
  const photos=(c.photoUrls||[]).filter(https);
  const [kept,setKept]=useState<Set<string>>(()=>new Set(photos));
  const toggle=(src:string)=>{
    const next=new Set(kept);if(next.has(src))next.delete(src);else next.add(src);setKept(next);
    setProject(p=>p.clientProfile?{...p,clientProfile:{...p.clientProfile,photoUrls:photos.filter(x=>next.has(x))}}:p);
  };
  return <>
    <p>Voici la fiche de l'établissement trouvée pour cette visite. Vérifie-la : les boutons de la barre et les couleurs seront proposés à partir de ces informations.</p>
    <div className="nv-setup-client">
      <div className="nv-setup-client-head">{logo&&<img src={logo} alt={'Logo '+c.name}/>}<div><strong>{c.name}</strong><small>{[c.category,c.city].filter(Boolean).join(' · ')}</small></div></div>
      <InfoRow label="Adresse" value={c.address}/><InfoRow label="Téléphone" value={c.phone}/><InfoRow label="E-mail" value={c.email}/>
      <InfoRow label="Site internet" value={c.website} href={https(c.website)||undefined}/>
      <InfoRow label="Facebook" value={c.facebook} href={https(c.facebook)||undefined}/>
      <InfoRow label="Instagram" value={c.instagram} href={https(c.instagram)||undefined}/>
      <InfoRow label="Horaires" value={c.openingHours}/>
    </div>
    {photos.length>0&&<><h4>Photos retenues ({kept.size} / {photos.length})</h4>
      <div className="nv-discovery-photos">{photos.map((src,i)=><button type="button" key={src+i} className={kept.has(src)?'is-on':''} aria-pressed={kept.has(src)} onClick={()=>toggle(src)}>
        <img src={src} alt={'Photo '+(i+1)} loading="lazy"/><i>{kept.has(src)?<Check size={13}/>:null}</i></button>)}</div></>}
  </>;
}

/** Couleurs proposées d'après le logo du client, dans l'étape « Couleurs & barre ». */
export function ClientColorProposals({project,onPick}:{project:StudioProject;onPick:(style:Partial<BarStyle>)=>void}){
  const c=project.clientProfile;
  const sources=[c?.logoUrl,...(c?.photoUrls||[]).slice(0,2)].map(https).filter(Boolean);
  const [proposals,setProposals]=useState<SkinProposal[]>([]);
  const [error,setError]=useState('');
  const [picked,setPicked]=useState(-1);
  const key=sources.join('|');
  useEffect(()=>{
    setProposals([]);setError('');setPicked(-1);
    if(!sources.length)return;
    let alive=true;
    void proposalsFromImages(sources).then(list=>{if(alive)setProposals(list);}).catch(e=>{if(alive)setError(e instanceof Error?e.message:String(e));});
    return ()=>{alive=false;};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[key]);
  if(!c||!sources.length)return null;
  return <section className="nv-setup-proposals">
    <h4>Couleurs proposées d'après le logo de « {c.name} »</h4>
    {!proposals.length&&!error&&<p className="nv-directory-muted"><LoaderCircle size={13}/> Analyse du logo…</p>}
    {error&&<p className="nv-directory-muted">{error} Choisis une palette ci-dessous.</p>}
    {proposals.length>0&&<div className="nv-skin-choices">{proposals.map((p,i)=><button type="button" key={p.name} className={picked===i?'is-selected':''} onClick={()=>{setPicked(i);onPick(p.style);}}>
      <span className="nv-skin-preview" style={{background:p.style.background,borderColor:p.style.outline}}>{[0,1,2].map(k=><i key={k} style={{background:p.style.button,borderColor:p.style.buttonOutline}}><b style={{background:p.style.icon}}/></i>)}</span>
      <span>{p.name}</span></button>)}</div>}
  </section>;
}

type Suggestion={key:string;label:string;detail:string;item:BottomBarItem};
function suggestionsFor(project:StudioProject):Suggestion[]{
  const c=project.clientProfile;
  if(!c)return [];
  const glyph:Record<string,string>={'Appeler':'phone','E-mail':'info','Site internet':'web','Facebook':'web','Instagram':'images','Réservation':'calendar','Itinéraire':'map'};
  const out:Suggestion[]=profileLinks(c).map(link=>({
    key:link.url,label:link.label,detail:link.url.replace(/^mailto:|^tel:|^https?:\/\/(www\.)?/,'').slice(0,60),
    item:{id:crypto.randomUUID(),title:link.label,type:'lien',target:'',text:'',url:link.url,builtinIcon:glyph[link.label]??'info'}
  }));
  if(c.openingHours?.trim())out.push({key:'horaires',label:'Horaires',detail:c.openingHours.slice(0,60),
    item:{id:crypto.randomUUID(),title:'Horaires',type:'information',target:'',text:c.openingHours,url:'',builtinIcon:'calendar'}});
  return out;
}
/** Étape « Boutons de la barre » : propose des boutons à partir des coordonnées du client. */
export function ClientButtonsStep({project,setProject,onMessage}:{project:StudioProject;setProject:SetProject;onMessage:(m:string)=>void}){
  const list=suggestionsFor(project);
  const present=(s:Suggestion)=>project.bottomBar.some(b=>b.url===s.key||(s.key==='horaires'&&b.title==='Horaires'));
  const defaultOn=new Set(['Appeler','Site internet','Facebook','Instagram','Itinéraire','Horaires','Réservation']);
  const [chosen,setChosen]=useState<Set<string>>(()=>new Set(list.filter(s=>defaultOn.has(s.label)&&!present(s)).map(s=>s.key)));
  const toAdd=list.filter(s=>chosen.has(s.key)&&!present(s));
  const apply=()=>{
    if(!toAdd.length)return;
    setProject(p=>({...p,bottomBar:[...p.bottomBar,...toAdd.map(s=>s.item)]}));
    onMessage(toAdd.length+' bouton(s) ajouté(s) à la barre du bas.');
  };
  if(!list.length)return <p>Aucune coordonnée exploitable dans la fiche : tu pourras ajouter tes boutons dans « Barre du bas ».</p>;
  return <>
    <p>Coche les boutons à ajouter à la barre du bas, à partir des coordonnées de {project.clientProfile?.name}. Tu pourras changer leurs icônes et leur ordre ensuite.</p>
    <div className="nv-setup-button-list">{list.map(s=>{
      const already=present(s);
      return <label key={s.key} className={already?'is-done':''}>
        <input type="checkbox" disabled={already} checked={already||chosen.has(s.key)} onChange={e=>{const n=new Set(chosen);if(e.target.checked)n.add(s.key);else n.delete(s.key);setChosen(n);}}/>
        <span><strong>{s.label}</strong><small>{already?'Déjà dans la barre':s.detail}</small></span>
      </label>;})}</div>
    <button type="button" className="nv-setup-next" disabled={!toAdd.length} onClick={apply}>Ajouter {toAdd.length||''} bouton{toAdd.length>1?'s':''} à la barre</button>
  </>;
}
