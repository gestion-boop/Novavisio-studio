import {useState,type Dispatch,type SetStateAction} from 'react';
import {isSafeIconDataUrl,readImage,validateProject,type ImportedButtonSet,type StudioProject} from './storage';
import {IconStateVisual} from './media';

const states=[['normal','Normal'],['hover','Survol'],['pressed','Pressé']] as const;
type State=typeof states[number][0];
type Images=Partial<Record<State,string>>;
export function applyImportedButton(project:StudioProject,set:ImportedButtonSet,target:string):StudioProject {
  const {iconId,hoverIconId,pressedIconId,iconSize}=set;
  if(target==='navigation')return validateProject({...project,defaultNavigationIcon:{iconId,hoverIconId,pressedIconId,iconSize},favoriteNavigationIconSet:undefined,iconPackId:undefined});
  if(target==='library')return project;
  if(!project.bottomBar.some(item=>item.id===target))throw Error('Ce bouton de la barre n’existe plus. Choisis une autre utilisation.');
  return validateProject({...project,bottomBar:project.bottomBar.map(item=>item.id===target?{...item,iconId,hoverIconId,pressedIconId,iconSize}:item)});
}
export function ButtonImporter({project,setProject,onBusyChange,disabled=false}:{disabled?:boolean;project:StudioProject;setProject:Dispatch<SetStateAction<StudioProject>>;onBusyChange:(busy:boolean)=>void}){
  const [images,setImages]=useState<Images>({}),[name,setName]=useState('Mon bouton');
  const [target,setTarget]=useState('navigation'),[size,setSize]=useState(40),[loading,setLoading]=useState(false),[message,setMessage]=useState('');
  const blocked=loading||disabled;
  async function readState(state:State,file?:File){
    if(!file)return;setLoading(true);onBusyChange(true);setMessage('Lecture de l’image…');
    try{
      if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)||file.size>1.5*1024*1024)throw Error('Choisis une image PNG, JPG, WebP ou GIF de 1,5 Mo maximum.');
      const data=await readImage(file);if(!isSafeIconDataUrl(data))throw Error('Format d’image incompatible.');
      const image=new Image();image.src=data;
      await image.decode().catch(()=>{throw Error('Cette image est illisible. Choisis un autre fichier PNG, JPG, WebP ou GIF.');});
      setImages(current=>({...current,[state]:data}));setMessage('Image '+states.find(([key])=>key===state)?.[1]+' prête.');
    }catch(error){setMessage(error instanceof Error?error.message:String(error));}finally{setLoading(false);onBusyChange(false);}
  }
  function add(){
    try{
      if(!images.normal)throw Error('Importe au moins l’image Normal.');
      const icons=[...project.icons];
      const ids:Partial<Record<State,string>>={};
      for(const [state,label] of states){const dataUrl=images[state];if(!dataUrl)continue;const same=icons.find(icon=>icon.dataUrl===dataUrl);ids[state]=same?.id??crypto.randomUUID();if(!same)icons.push({id:ids[state]!,name:name.trim()+' · '+label,dataUrl});}
      const set:ImportedButtonSet={id:crypto.randomUUID(),name:name.trim(),iconId:ids.normal!,hoverIconId:ids.hover,pressedIconId:ids.pressed,iconSize:size};
      const next=validateProject({...project,icons,buttonSets:[...(project.buttonSets??[]),set]});
      setProject(applyImportedButton(next,set,target));setMessage('Bouton « '+set.name+' » ajouté et disponible dans tes skins.');
      setImages({});
    }catch(error){setMessage(error instanceof Error?error.message:String(error));}
  }
  return <details className="nv-button-importer"><summary>＋ Importer un bouton <small>Normal · Survol · Pressé</small></summary>
    <div className="nv-button-importer-body"><p>Importe les trois états du bouton. L’image Normal est obligatoire ; les autres sont facultatives.</p>
      <label>Nom du bouton<input aria-label="Nom du bouton importé" maxLength={100} value={name} onChange={e=>setName(e.target.value)} disabled={blocked}/></label>
      <div className="nv-button-state-files">{states.map(([state,label])=><div key={state}>
        <label className="nv-button-state-upload"><strong>{label}</strong>{images[state]?<img src={images[state]} alt={'Image '+label}/>:<span>＋ Choisir une image</span>}
          <input type="file" aria-label={'Importer '+label} accept="image/png,image/jpeg,image/webp,image/gif" disabled={blocked} onChange={e=>{void readState(state,e.target.files?.[0]);e.target.value='';}}/>
        </label>{images[state]&&<button type="button" disabled={blocked} onClick={()=>setImages(current=>({...current,[state]:undefined}))}>Retirer {label}</button>}
      </div>)}</div>
      <small>PNG transparent conseillé · 1,5 Mo maximum par image. Sans Survol ou Pressé, l’état précédent est repris.</small>
      {images.normal&&<div className="nv-button-import-demo"><button type="button" className="nv-button-import-preview" aria-label="Aperçu du bouton importé">
        <span className="nv-icon-states"><img className="nv-state-normal" src={images.normal} alt=""/><img className="nv-state-hover" src={images.hover??images.normal} alt=""/><img className="nv-state-press" src={images.pressed??images.hover??images.normal} alt=""/></span>
      </button><span>Survole le bouton et maintiens le clic pour tester les trois états.</span></div>}
      <label>Utiliser ce bouton pour<select aria-label="Utiliser ce bouton pour" value={target} disabled={blocked} onChange={e=>setTarget(e.target.value)}><option value="navigation">Les prochaines flèches de navigation</option><option value="library">La bibliothèque uniquement</option>{project.bottomBar.map(item=><option key={item.id} value={item.id}>Barre du bas — {item.title}</option>)}</select></label>
      <label>Taille du bouton : {size} px<input aria-label="Taille du bouton importé" type="range" min="20" max="72" step="2" value={size} disabled={blocked} onChange={e=>setSize(Number(e.target.value))}/></label>
      <button type="button" className="nv-setup-next" disabled={blocked||!images.normal||!name.trim()} onClick={add}>Ajouter le bouton</button>
      <p role="status" className="nv-setup-message">{message}</p>
      {!!project.buttonSets?.length&&<div className="nv-imported-button-list"><strong>Mes boutons importés</strong>{project.buttonSets.map(set=><div key={set.id}>
        <span className="nv-imported-button-thumb"><IconStateVisual icons={project.icons} normal={set.iconId} hover={set.hoverIconId} pressed={set.pressedIconId} size={40}/></span><span>{set.name}</span>
        <button type="button" disabled={blocked} onClick={()=>{try{setProject(applyImportedButton(project,set,target));setMessage('Bouton « '+set.name+' » sélectionné.');}catch(e){setMessage(String(e));}}}>Utiliser</button>
      </div>)}</div>}
    </div>
  </details>;
}
