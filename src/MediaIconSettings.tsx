import {useState} from 'react';
import {Image,Play} from 'lucide-react';
import {IconStateVisual} from './media';
import type {DefaultNavigationIcon,StudioProject} from './storage';
import type {Dispatch,SetStateAction} from 'react';
const STATE_NAME=/(?:[_\s-])(survol|presse|pressé|press|hover|pressed|active)\b/i;
const KIND_NAME={image:/photo|image|picto|galerie|gallery|camera|appareil|diapo/i,video:/vid[eé]o|film|play|lecture|cin[eé]ma|clip/i};
/** Choix visuel de l'icône d'un popup : uniquement des icônes du bon type (photo ou vidéo), sans les variantes survol / pressé. */
export function MediaIconSelector({project,value,onChange,label,kind}:{project:StudioProject;value?:Partial<DefaultNavigationIcon>;onChange:(value:Partial<DefaultNavigationIcon>)=>void;label:string;kind:'image'|'video'}){
 const [open,setOpen]=useState(false);
 const [all,setAll]=useState(false);
 const match=KIND_NAME[kind];
 const sets=(project.buttonSets??[]).filter(set=>project.icons.some(i=>i.id===set.iconId));
 const singles=project.icons.filter(icon=>!STATE_NAME.test(icon.name));
 const relevantSets=sets.filter(set=>match.test(set.name));
 const relevantSingles=singles.filter(icon=>match.test(icon.name));
 const nothingRelevant=relevantSets.length+relevantSingles.length===0;
 const showSets=all||nothingRelevant?sets:relevantSets;
 const showSingles=all||nothingRelevant?singles:relevantSingles;
 const set=project.buttonSets?.find(set=>set.iconId===value?.iconId&&set.hoverIconId===value?.hoverIconId&&set.pressedIconId===value?.pressedIconId);
 const current=set?set.name:value?.iconId?project.icons.find(i=>i.id===value.iconId)?.name??'Icône personnalisée':'Icône '+(kind==='image'?'Photo':'Vidéo')+' standard';
 const pick=(next:Partial<DefaultNavigationIcon>)=>{onChange(next);setOpen(false);};
 const thumb=(id?:string)=>project.icons.find(i=>i.id===id)?.dataUrl;
 return <div className="nv-media-icon-selector nv-icon-picker">
  <span className="nv-icon-picker-label">{label}</span>
  <button type="button" className={'nv-icon-picker-current'+(open?' is-open':'')} aria-expanded={open} onClick={()=>setOpen(o=>!o)}>
   <span className="nv-media-icon-preview">{value?.iconId?<IconStateVisual icons={project.icons} normal={value.iconId} hover={value.hoverIconId} pressed={value.pressedIconId} size={40}/>:kind==='image'?<Image size={29}/>:<Play size={29}/>}</span>
   <span className="nv-icon-picker-name">{current}</span><span aria-hidden="true">{open?'▴':'▾'}</span>
  </button>
  {open&&<div className="nv-icon-picker-panel" role="listbox" aria-label={label}>
   <div className="nv-icon-picker-grid">
    <button type="button" role="option" aria-selected={!value?.iconId} className={'nv-icon-tile'+(!value?.iconId?' is-selected':'')} onClick={()=>pick({iconId:undefined,hoverIconId:undefined,pressedIconId:undefined,iconSize:42})}>
     <span>{kind==='image'?<Image size={30}/>:<Play size={30}/>}</span><small>Standard</small>
    </button>
    {showSets.map(item=><button type="button" role="option" key={'s'+item.id} aria-selected={set?.id===item.id} className={'nv-icon-tile'+(set?.id===item.id?' is-selected':'')} title={item.name}
      onClick={()=>pick({iconId:item.iconId,hoverIconId:item.hoverIconId,pressedIconId:item.pressedIconId,iconSize:item.iconSize})}>
      <span><img alt="" src={thumb(item.iconId)}/></span><small>{item.name}</small></button>)}
    {showSingles.map(icon=><button type="button" role="option" key={icon.id} aria-selected={!set&&value?.iconId===icon.id} className={'nv-icon-tile'+(!set&&value?.iconId===icon.id?' is-selected':'')} title={icon.name}
      onClick={()=>pick({iconId:icon.id,hoverIconId:undefined,pressedIconId:undefined,iconSize:42})}>
      <span><img alt="" src={icon.dataUrl}/></span><small>{icon.name.replace(/\.(png|webp|svg|jpe?g)$/i,'').replace(/[_-]normal$/i,'')}</small></button>)}
   </div>
   {nothingRelevant&&<p className="nv-icon-picker-note">Aucune icône de {kind==='image'?'photo':'vidéo'} trouvée dans ta bibliothèque : voici toutes les icônes.</p>}
   {!nothingRelevant&&<button type="button" className="nv-icon-picker-all" onClick={()=>setAll(v=>!v)}>{all?'Seulement les icônes de '+(kind==='image'?'photo':'vidéo'):'Afficher toutes les icônes'}</button>}
  </div>}
 </div>;
}
export function MediaIconDefaults({project,setProject}:{project:StudioProject;setProject:Dispatch<SetStateAction<StudioProject>>}){
 return <fieldset className="nv-media-display-control"><legend>Icônes des popups par défaut</legend><p>Ces icônes seront appliquées automatiquement aux prochaines photos et vidéos.</p>{(['image','video'] as const).map(kind=>{const key=kind==='image'?'defaultPhotoIcon':'defaultVideoIcon';return <MediaIconSelector key={kind} project={project} kind={kind} value={project[key]} label={kind==='image'?'Icône Photo par défaut':'Icône Vidéo par défaut'} onChange={value=>setProject(p=>({...p,[key]:value.iconId?value:undefined}))}/>})}</fieldset>;
}
