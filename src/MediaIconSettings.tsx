import {Image,Play} from 'lucide-react';
import {IconStateVisual} from './media';
import type {DefaultNavigationIcon,StudioProject} from './storage';
import type {Dispatch,SetStateAction} from 'react';
export function MediaIconSelector({project,value,onChange,label,kind}:{project:StudioProject;value?:Partial<DefaultNavigationIcon>;onChange:(value:Partial<DefaultNavigationIcon>)=>void;label:string;kind:'image'|'video'}){
 const set=project.buttonSets?.find(set=>set.iconId===value?.iconId&&set.hoverIconId===value?.hoverIconId&&set.pressedIconId===value?.pressedIconId);
 const chosen=set?'set:'+set.id:value?.iconId?'icon:'+value.iconId:'';
 return <div className="nv-media-icon-selector"><div className="nv-media-icon-preview">{value?.iconId?<IconStateVisual icons={project.icons} normal={value.iconId} hover={value.hoverIconId} pressed={value.pressedIconId} size={40}/>:kind==='image'?<Image size={29}/>:<Play size={29}/>}</div>
 <label>{label}<select aria-label={label} value={chosen} onChange={e=>{const val=e.target.value;if(!val){onChange({iconId:undefined,hoverIconId:undefined,pressedIconId:undefined,iconSize:42});return}const pack=project.buttonSets?.find(set=>'set:'+set.id===val);onChange(pack?{iconId:pack.iconId,hoverIconId:pack.hoverIconId,pressedIconId:pack.pressedIconId,iconSize:pack.iconSize}:{iconId:val.slice(5),hoverIconId:undefined,pressedIconId:undefined,iconSize:42})}}><option value="">Icône {kind==='image'?'Photo':'Vidéo'} standard</option>{project.buttonSets?.map(set=><option key={set.id} value={'set:'+set.id}>Bouton : {set.name}</option>)}{project.icons.map(icon=><option key={icon.id} value={'icon:'+icon.id}>{icon.name}</option>)}</select></label></div>;
}
export function MediaIconDefaults({project,setProject}:{project:StudioProject;setProject:Dispatch<SetStateAction<StudioProject>>}){
 return <fieldset className="nv-media-display-control"><legend>Icônes des popups par défaut</legend><p>Ces icônes seront appliquées automatiquement aux prochaines photos et vidéos.</p>{(['image','video'] as const).map(kind=>{const key=kind==='image'?'defaultPhotoIcon':'defaultVideoIcon';return <MediaIconSelector key={kind} project={project} kind={kind} value={project[key]} label={kind==='image'?'Icône Photo par défaut':'Icône Vidéo par défaut'} onChange={value=>setProject(p=>({...p,[key]:value.iconId?value:undefined}))}/>})}</fieldset>;
}
