import {useEffect,useState,type Dispatch,type SetStateAction} from 'react';
import type {StudioProject} from './storage';
import {applySkin,captureSkin,deleteSkin,exportSkin,listSkins,storeSkin,validateSkin,type Skin} from './skins';
import {PreparationDialog} from './PreparationControls';

type Props={project:StudioProject;setProject:Dispatch<SetStateAction<StudioProject>>;onApplied?:()=>void};
export function SkinChoices({project,setProject,onApplied}:Props){
  const [skins,setSkins]=useState<Skin[]>([]),[name,setName]=useState('Skin '+project.name.slice(0,65));
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const refresh=async()=>setSkins(await listSkins());
  useEffect(()=>{void refresh().catch(()=>setMessage('La bibliothèque locale est indisponible. Tu peux exporter ton skin en fichier.'));},[]);
  async function run(action:()=>Promise<void>,success:string){setBusy(true);setMessage('');try{await action();await refresh();setMessage(success);}catch(error){setMessage(error instanceof Error?error.message:'Action impossible');}finally{setBusy(false);}}
  const current=()=>captureSkin(project,name);
  return <div className="nv-skin-library">
    <p className="nv-setup-note">Un skin conserve les couleurs, les dimensions, les langues et les icônes. Les liens, les textes, les panoramas et la musique du projet restent en place.</p>
    <div className="nv-skin-create"><label>Nom du skin<input maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label>
      <button type="button" disabled={busy||!name.trim()} onClick={()=>void run(async()=>{await storeSkin(current());},'Skin enregistré dans ce navigateur.')}>Enregistrer ce skin</button>
      <button type="button" disabled={busy||!name.trim()} onClick={()=>{try{exportSkin(current());}catch(e){setMessage(String(e));}}}>Exporter le style actuel</button>
    </div>
    <div className="nv-skin-toolbar"><label className="nv-file-button">Importer un skin<input type="file" accept=".json,.nvskin.json,application/json" disabled={busy} onChange={e=>{
      const file=e.target.files?.[0];e.target.value='';if(!file)return;
      void run(async()=>{if(file.size>40*1024*1024)throw Error('Skin trop volumineux (40 Mo maximum).');const skin=validateSkin(JSON.parse(await file.text()));await storeSkin({...skin,id:crypto.randomUUID()});},'Skin importé. Choisis Appliquer pour l’utiliser.');
    }}/></label><small>Bibliothèque enregistrée sur cet appareil. Exporte un fichier pour la transférer.</small></div>
    <p role="status" className="nv-setup-message">{message}</p>
    {!skins.length&&<p className="nv-setup-empty">Aucun skin enregistré. Prépare ton apparence, puis enregistre-la ici.</p>}
    <div className="nv-skin-grid">{skins.map(skin=><SkinCard key={skin.id} skin={skin} busy={busy}
      onApply={()=>{try{setProject(applySkin(project,skin));setMessage('Skin « '+skin.name+' » appliqué.');onApplied?.();}catch(error){setMessage(String(error));}}}
      onRename={name=>void run(()=>storeSkin({...skin,name,updatedAt:new Date().toISOString()}),'Skin renommé.')}
      onUpdate={()=>{if(window.confirm('Remplacer l’apparence du skin « '+skin.name+' » par celle du projet actuel ?'))void run(()=>storeSkin(captureSkin(project,skin.name,skin.id)),'Skin mis à jour.');}}
      onDelete={()=>{if(window.confirm('Supprimer le skin « '+skin.name+' » de la bibliothèque ?'))void run(()=>deleteSkin(skin.id),'Skin supprimé.');}}/>)}</div>
  </div>;
}
function SkinCard({skin,busy,onApply,onRename,onUpdate,onDelete}:{skin:Skin;busy:boolean;onApply:()=>void;onRename:(name:string)=>void;onUpdate:()=>void;onDelete:()=>void}){
  const [name,setName]=useState(skin.name);
  return <article className="nv-skin-card"><div className="nv-skin-preview" style={{background:skin.appearance.barStyle.background,borderColor:skin.appearance.barStyle.outline}}>
    {skin.appearance.bottomBar.slice(0,5).map(item=><span key={item.id} style={{background:skin.appearance.barStyle.button,color:skin.appearance.barStyle.icon}}>
      {item.iconId?<img src={skin.appearance.icons.find(i=>i.id===item.iconId)?.dataUrl} alt=""/>:'✦'}
    </span>)}
  </div><label>Nom<input aria-label={'Renommer '+skin.name} maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label>
    <div className="nv-skin-card-actions"><button type="button" disabled={busy} onClick={onApply}>Appliquer</button>
      <button type="button" disabled={busy||!name.trim()||name===skin.name} onClick={()=>onRename(name)}>Renommer</button>
      <button type="button" disabled={busy} onClick={onUpdate}>Mettre à jour</button>
      <button type="button" disabled={busy} onClick={()=>exportSkin(skin)}>Exporter</button>
      <button type="button" disabled={busy} onClick={onDelete}>Supprimer</button></div>
  </article>;
}
export function SkinLibrary({onClose,...props}:Props&{onClose:()=>void}){
  return <PreparationDialog title="Mes skins" onClose={onClose}><div className="nv-preparation-content"><SkinChoices {...props}/></div></PreparationDialog>;
}
