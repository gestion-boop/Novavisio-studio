import {useMemo,useState} from 'react';
import {Check,ChevronDown,Library,Search} from 'lucide-react';
import {buildIconSets} from './IconLibrary';
import {GENERAL_ICONS} from './generalIconCatalog';
import {GeneralIconLibrary} from './GeneralIconLibrary';
import type {IconSetImages} from './IconSetCreator';
import type {StudioProject} from './storage';

/** Sélecteur commun : un clic réutilise les trois PNG déjà dans le projet ou en crée depuis la bibliothèque générale. */
export type IconPackChoice={
  key:string;name:string;iconId:string;hoverIconId:string;pressedIconId:string;
  normalSrc:string;hoverSrc:string;pressedSrc:string;
};
export function availableIconPacks(project:StudioProject):IconPackChoice[]{
  const byId=new Map(project.icons.map(icon=>[icon.id,icon]));
  const seen=new Set<string>();
  const packs:IconPackChoice[]=[];
  function add(name:string,iconId?:string,hoverIconId?:string,pressedIconId?:string){
    if(!iconId||!hoverIconId||!pressedIconId)return;
    const normal=byId.get(iconId),hover=byId.get(hoverIconId),pressed=byId.get(pressedIconId);
    if(!normal||!hover||!pressed)return;
    const key=[iconId,hoverIconId,pressedIconId].join('|');
    if(seen.has(key))return;
    seen.add(key);
    packs.push({key,name,iconId,hoverIconId,pressedIconId,normalSrc:normal.dataUrl,hoverSrc:hover.dataUrl,pressedSrc:pressed.dataUrl});
  }
  // Même source de données que la Bibliothèque d'icônes, pas une deuxième collection.
  for(const set of buildIconSets(project.icons)){
    add(set.name,set.normal?.id,set.hover?.id,set.pressed?.id);
  }
  // Compatibilité avec les jeux créés par l'ancien importeur de boutons.
  for(const set of project.buttonSets??[]){
    add(set.name,set.iconId,set.hoverIconId,set.pressedIconId);
  }
  return packs.sort((a,b)=>a.name.localeCompare(b.name,'fr',{sensitivity:'base'}));
}
const STATE_LABELS=['Normal','Survol','Pressé'] as const;

export function ExistingIconPackPicker({project,value,onSelect,onCreateGeneral,label='Choisir dans mes packs de 3',preferred}:{
  project:StudioProject;
  value?:{iconId?:string;hoverIconId?:string;pressedIconId?:string};
  onSelect:(pack:IconPackChoice)=>void;
  onCreateGeneral?:(label:string,images:IconSetImages,apply:boolean)=>Promise<void>;
  label?:string;
  preferred?:'image'|'video'|'close'|'settings'|'audio';
}){
  const [open,setOpen]=useState(false);
  const [tab,setTab]=useState<'packs'|'general'>('packs');
  const [search,setSearch]=useState('');
  const packs=useMemo(()=>availableIconPacks(project),[project.icons,project.buttonSets]);
  const preferredTerms:Record<NonNullable<typeof preferred>,RegExp>={
    image:/photo|image|galerie|gallery|camera|picto/i,
    video:/vid[eé]o|play|film|lecture/i,
    close:/croix|close|fermer|retour|quit/i,
    settings:/r[eé]glage|param[eè]tre|setting|engrenage/i,
    audio:/son|audio|volume|musique|sound/i
  };
  const shown=useMemo(()=>{
    const term=search.trim().toLocaleLowerCase('fr');
    const ordered=packs.filter(pack=>!term||pack.name.toLocaleLowerCase('fr').includes(term));
    if(preferred)ordered.sort((a,b)=>Number(preferredTerms[preferred].test(b.name))-Number(preferredTerms[preferred].test(a.name))||a.name.localeCompare(b.name,'fr'));
    return ordered;
  },[packs,preferred,search]);
  return <div className="nv-existing-pack-picker">
    <button type="button" className={'nv-existing-pack-toggle'+(open?' is-open':'')} aria-expanded={open}
      onClick={()=>setOpen(v=>!v)}>
      <Library size={18}/><span>{label}</span><b>{packs.length}</b><ChevronDown size={17}/>
    </button>
    {open&&<div className="nv-existing-pack-panel">
      {onCreateGeneral&&<div className="nv-general-tab-bar" role="tablist" aria-label="Source des icônes">
        <button type="button" role="tab" aria-selected={tab==='packs'} aria-pressed={tab==='packs'} className={tab==='packs'?'is-on':''} onClick={()=>setTab('packs')}>
          Mes packs de 3 ({packs.length})
        </button>
        <button type="button" role="tab" aria-selected={tab==='general'} aria-pressed={tab==='general'} className={tab==='general'?'is-on':''} onClick={()=>setTab('general')}>
          Bibliothèque générale ({GENERAL_ICONS.length})
        </button>
      </div>}
      {tab==='general'&&onCreateGeneral?<GeneralIconLibrary
        barTheme={project.barStyle}
        applyLabel="directement ici"
        onAdd={async(name,images,apply)=>{
          await onCreateGeneral(name,images,apply);
          if(apply)setOpen(false);
        }}
      />:<>
      <p className="nv-existing-pack-help">Sélectionne un pack : <strong>Normal + Survol + Pressé</strong> sont appliqués ensemble, sans nouvel import.</p>
      {packs.length>6&&<label className="nv-existing-pack-search">
        <Search size={16}/><input type="search" placeholder="Rechercher un pack…" aria-label="Rechercher un pack"
          value={search} onChange={e=>setSearch(e.target.value)}/>
      </label>}
      {packs.length===0?<p className="nv-existing-pack-empty">Aucun pack complet dans la bibliothèque de cette visite. {onCreateGeneral?'Clique sur l’onglet « Bibliothèque générale » ci-dessus pour choisir un pictogramme aux couleurs de la barre.':'Crée d’abord un pack de trois dans Réglages → Icônes.'}</p>:
      shown.length===0?<p className="nv-existing-pack-empty">Aucun pack pour cette recherche.</p>:
      <div className="nv-existing-pack-grid">
        {shown.map(pack=>{
          const isCurrent=pack.iconId===value?.iconId&&pack.hoverIconId===value?.hoverIconId&&pack.pressedIconId===value?.pressedIconId;
          return <button type="button" key={pack.key} className={'nv-existing-pack-card'+(isCurrent?' is-selected':'')}
            title={'Appliquer le pack « '+pack.name+' » avec ses trois états'} aria-pressed={isCurrent}
            onClick={()=>{onSelect(pack);setOpen(false);setSearch('');}}>
            <span className="nv-existing-pack-states">
              {([pack.normalSrc,pack.hoverSrc,pack.pressedSrc] as const).map((src,i)=>
                <span key={i}><img src={src} alt="" loading="lazy"/><small>{STATE_LABELS[i]}</small></span>)}
            </span>
            <span className="nv-existing-pack-name">{pack.name}</span>
            {isCurrent&&<Check size={15} className="nv-existing-pack-check"/>}
          </button>;
        })}
      </div>}
      <small className="nv-existing-pack-note">Les packs de la bibliothèque sont conservés : seul le choix de ce bouton est modifié. Enregistre ensuite la visite avec la disquette.</small>
      </>}
    </div>}
  </div>;
}
