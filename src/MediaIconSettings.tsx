import {useState} from 'react';
import {Image,Play} from 'lucide-react';
import {IconStateVisual} from './media';
import {buildIconSets} from './IconLibrary';
import type {DefaultNavigationIcon,StudioProject} from './storage';
import type {Dispatch,SetStateAction} from 'react';
const KIND_NAME={image:/photo|image|picto|galerie|gallery|camera|appareil|diapo/i,video:/vid[eé]o|film|play|lecture|cin[eé]ma|clip/i};
/** Choix visuel de l'icône d'un popup : uniquement des icônes du bon type (photo ou vidéo), sans les variantes survol / pressé. */
export function MediaIconSelector({project,value,onChange,label,kind}:{project:StudioProject;value?:Partial<DefaultNavigationIcon>;onChange:(value:Partial<DefaultNavigationIcon>)=>void;label:string;kind:'image'|'video'}){
 const [open,setOpen]=useState(false);
 const match=KIND_NAME[kind];
 // Toutes les icônes de la bibliothèque, regroupées en jeux (normal / survol / pressé reconnus d'après le nom du fichier) : une icône ajoutée apparaît tout de suite ici.
 const libSets=buildIconSets(project.icons).map(g=>{const main=g.normal??g.hover??g.pressed;return main?{id:'lib:'+g.key,name:g.name,iconId:main.id,hoverIconId:g.hover?.id,pressedIconId:g.pressed?.id,iconSize:42}:null;}).filter((x):x is NonNullable<typeof x>=>!!x);
 const saved=(project.buttonSets??[]).filter(set=>project.icons.some(i=>i.id===set.iconId));
 const merged=[...saved,...libSets.filter(l=>!saved.some(sv=>sv.iconId===l.iconId))];
 const allSets=[...merged].sort((x,y)=>(match.test(y.name)?1:0)-(match.test(x.name)?1:0));
 const set=allSets.find(set=>set.iconId===value?.iconId&&set.hoverIconId===value?.hoverIconId&&set.pressedIconId===value?.pressedIconId);
 const current=set?set.name:value?.iconId?project.icons.find(i=>i.id===value.iconId)?.name??'Icône personnalisée':'Icône '+(kind==='image'?'Photo':'Vidéo')+' standard';
 const pick=(next:Partial<DefaultNavigationIcon>)=>{onChange({...next,iconSize:value?.iconSize??next.iconSize});setOpen(false);};
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
    {allSets.map(item=><button type="button" role="option" key={'s'+item.id} aria-selected={set?.id===item.id} className={'nv-icon-tile'+(set?.id===item.id?' is-selected':'')} title={item.name}
      onClick={()=>pick({iconId:item.iconId,hoverIconId:item.hoverIconId,pressedIconId:item.pressedIconId,iconSize:item.iconSize})}>
      <span><img alt="" src={thumb(item.iconId)}/></span><small>{item.name}</small></button>)}
   </div>
  </div>}
 </div>;
}
export function MediaIconDefaults({project,setProject}:{project:StudioProject;setProject:Dispatch<SetStateAction<StudioProject>>}){
 return <fieldset className="nv-media-display-control"><legend>Icônes des popups par défaut</legend><p>Ces icônes seront appliquées automatiquement aux prochaines photos et vidéos.</p>{(['image','video'] as const).map(kind=>{const key=kind==='image'?'defaultPhotoIcon':'defaultVideoIcon';return <MediaIconSelector key={kind} project={project} kind={kind} value={project[key]} label={kind==='image'?'Icône Photo par défaut':'Icône Vidéo par défaut'} onChange={value=>setProject(p=>({...p,[key]:value.iconId?value:undefined}))}/>})}</fieldset>;
}
