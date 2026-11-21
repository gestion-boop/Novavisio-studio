import {useState} from 'react';
import {Image,Play} from 'lucide-react';
import {IconStateVisual} from './media';
import {buildIconSets} from './IconLibrary';
import {GeneralIconLibrary} from './GeneralIconLibrary';
import {ExistingIconPackPicker} from './ExistingIconPackPicker';
import type {IconSetImages} from './IconSetCreator';
import {uid,type CustomIcon,type DefaultNavigationIcon,type StudioProject} from './storage';
import type {Dispatch,SetStateAction} from 'react';
const KIND_NAME={image:/photo|image|picto|galerie|gallery|camera|appareil|diapo/i,video:/vid[eé]o|film|play|lecture|cin[eé]ma|clip/i};
/** Choix visuel de l'icône d'un popup : uniquement des icônes du bon type (photo ou vidéo), pack de 3 ou bibliothèque générale. */
export function MediaIconSelector({project,value,onChange,label,kind,onAddIcons,onCreateGeneral}:{
 project:StudioProject;value?:Partial<DefaultNavigationIcon>;
 onChange:(value:Partial<DefaultNavigationIcon>)=>void;
 label:string;kind:'image'|'video';onAddIcons?:(icons:CustomIcon[])=>void;
 onCreateGeneral?:(label:string,images:IconSetImages,apply:boolean)=>Promise<void>;
}){
 const [open,setOpen]=useState(false);
 const [mode,setMode]=useState<'standard'|'pack'|'general'>(value?.iconId?'pack':'standard');
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
 const handleGeneralAdd=async(packLabel:string,images:IconSetImages,apply:boolean)=>{
   if(onCreateGeneral){
     await onCreateGeneral(packLabel,images,apply);
     if(apply)setOpen(false);
     return;
   }
   if(onAddIcons){
     const existing=new Set(buildIconSets(project.icons).map(s=>s.name.toLocaleLowerCase('fr')));
     let base=packLabel.trim()||'Icône',n=2;
     while(existing.has(base.toLocaleLowerCase('fr')))base=`${packLabel.trim()||'Icône'} ${n++}`;
     const added:CustomIcon[]=[
       {id:uid(),name:base+' · Normal',dataUrl:images.normal},
       {id:uid(),name:base+' · Survol',dataUrl:images.hover},
       {id:uid(),name:base+' · Pressé',dataUrl:images.pressed},
     ];
     onAddIcons(added);
     if(apply)pick({iconId:added[0].id,hoverIconId:added[1].id,pressedIconId:added[2].id,iconSize:42});
   }
 };
 return <div className="nv-media-icon-selector nv-icon-picker">
  <span className="nv-icon-picker-label">{label}</span>
  <button type="button" className={'nv-icon-picker-current'+(open?' is-open':'')} aria-expanded={open} onClick={()=>setOpen(o=>!o)}>
   <span className="nv-media-icon-preview">{value?.iconId?<IconStateVisual icons={project.icons} normal={value.iconId} hover={value.hoverIconId} pressed={value.pressedIconId} size={40}/>:kind==='image'?<Image size={29}/>:<Play size={29}/>}</span>
   <span className="nv-icon-picker-name">{current}</span><span aria-hidden="true">{open?'▴':'▾'}</span>
  </button>
  {open&&<div className="nv-icon-picker-panel">
   <div className="nv-icon-mode nv-general-tab-bar" role="group" aria-label="Type d'icône">
    <button type="button" aria-pressed={mode==='standard'} className={'nv-icon-mode-btn'+(mode==='standard'?' is-on':'')} onClick={()=>{setMode('standard');pick({iconId:undefined,hoverIconId:undefined,pressedIconId:undefined});}}>Icône standard</button>
    <button type="button" aria-pressed={mode==='pack'} className={'nv-icon-mode-btn'+(mode==='pack'?' is-on':'')} onClick={()=>setMode('pack')}>Pack de 3</button>
    <button type="button" aria-pressed={mode==='general'} className={'nv-icon-mode-btn'+(mode==='general'?' is-on':'')} onClick={()=>setMode('general')}>Bibliothèque générale</button>
   </div>
   {mode==='general'?(
    <GeneralIconLibrary barTheme={project.barStyle} applyLabel="à ce popup" onAdd={handleGeneralAdd}/>
   ):<>
   <div className="nv-icon-picker-grid" role="listbox" aria-label={label}>
    <button type="button" role="option" aria-selected={!value?.iconId} className={'nv-icon-tile'+(!value?.iconId?' is-selected':'')} onClick={()=>pick({iconId:undefined,hoverIconId:undefined,pressedIconId:undefined,iconSize:42})}>
     <span>{kind==='image'?<Image size={30}/>:<Play size={30}/>}</span><small>Standard</small>
    </button>
    {allSets.map(item=><button type="button" role="option" key={'s'+item.id} aria-selected={set?.id===item.id} className={'nv-icon-tile'+(set?.id===item.id?' is-selected':'')} title={item.name}
      onClick={()=>pick({iconId:item.iconId,hoverIconId:item.hoverIconId,pressedIconId:item.pressedIconId,iconSize:item.iconSize})}>
      <span><img alt="" src={thumb(item.iconId)}/></span><small>{item.name}</small></button>)}
   </div>
   <div className="nv-media-icon-import">
     <ExistingIconPackPicker project={project} value={value} preferred={kind}
       label="Importer mon pack de 3 ici"
       onCreateGeneral={handleGeneralAdd}
       onSelect={pack=>pick({iconId:pack.iconId,hoverIconId:pack.hoverIconId,pressedIconId:pack.pressedIconId})}/>
     <small>Choisis parmi les packs de trois déjà créés ou ouvre l’onglet « Bibliothèque générale » pour créer un pictogramme aux couleurs de la barre.</small>
   </div>
   </>}
  </div>}
 </div>;
}
export function MediaIconDefaults({project,setProject}:{project:StudioProject;setProject:Dispatch<SetStateAction<StudioProject>>}){
 return <fieldset className="nv-media-display-control"><legend>Icônes des popups par défaut</legend><p>Ces icônes seront appliquées automatiquement aux prochaines photos et vidéos.</p>{(['image','video'] as const).map(kind=>{const key=kind==='image'?'defaultPhotoIcon':'defaultVideoIcon';return <MediaIconSelector key={kind} project={project} kind={kind} value={project[key]} label={kind==='image'?'Icône Photo par défaut':'Icône Vidéo par défaut'} onAddIcons={icons=>setProject(p=>({...p,icons:[...p.icons,...icons].slice(0,150)}))} onChange={value=>setProject(p=>({...p,[key]:value.iconId?value:undefined}))}/>})}</fieldset>;
}
