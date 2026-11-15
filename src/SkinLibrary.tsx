import {useEffect,useState,type Dispatch,type SetStateAction} from 'react';
import type {StudioProject} from './storage';
import {applySkin,captureSkin,exportSkin,listSkins,validateSkin,type Skin} from './skins';
import {cloudListSkins,cloudSaveSkin,cloudDeleteSkin,cloudSetDefaultSkin,type CloudSkin} from './cloudSkins';
import {PreparationDialog} from './PreparationControls';
import {SkinCreator} from './SkinCreator';

type Props={project:StudioProject;setProject:Dispatch<SetStateAction<StudioProject>>;onApplied?:()=>void};
export function SkinChoices({project,setProject,onApplied}:Props){
  const [skins,setSkins]=useState<CloudSkin[]>([]),[name,setName]=useState('Skin '+project.name.slice(0,65));
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[creating,setCreating]=useState(false);
  const [selectedDefault,setSelectedDefault]=useState<string|null>(null);
  const refresh=async()=>{const remote=await cloudListSkins();setSkins(remote);setSelectedDefault(remote.find(s=>s.isDefault)?.id??null);};
  useEffect(()=>{void refresh().catch(e=>setMessage('Modèles Cloud indisponibles : '+String(e)+'. Connecte-toi à Supabase.'));},[]);
  async function run(action:()=>Promise<void>,success:string){setBusy(true);setMessage('');try{await action();await refresh();setMessage(success);}catch(error){setMessage(error instanceof Error?error.message:'Action impossible');}finally{setBusy(false);}}
  const current=()=>captureSkin(project,name);
  return <div className="nv-skin-library">
    <p className="nv-setup-note">Un modèle (skin) conserve ta charte, la barre, tous les packs de trois icônes et le choix VR. Les photos, vidéos, panoramas, coordonnées, liens et textes du client précédent ne sont jamais copiés. Un modèle peut être appliqué automatiquement aux nouvelles visites.</p>
    <button type="button" className="nv-skin-new" onClick={()=>setCreating(true)}>＋ Création de skin</button>
    {creating&&<SkinCreator project={project} onClose={()=>setCreating(false)} onSave={async skin=>{await cloudSaveSkin(skin);await refresh();setMessage('Skin « '+skin.name+' » créé : tu peux le choisir à la création de n’importe quel projet.');}}/>}
    <div className="nv-skin-create"><label>Nom du skin<input maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label>
      <button type="button" disabled={busy||!name.trim()} onClick={()=>void run(async()=>{await cloudSaveSkin(current());},'Modèle enregistré dans Supabase. Active « Par défaut » pour le réutiliser automatiquement.')}>Enregistrer ce skin</button>
      <button type="button" disabled={busy||!name.trim()} onClick={()=>{try{exportSkin(current());}catch(e){setMessage(String(e));}}}>Exporter le style actuel</button>
    </div>
    <div className="nv-skin-toolbar"><label className="nv-file-button">Importer un skin<input type="file" accept=".json,.nvskin.json,application/json" disabled={busy} onChange={e=>{
      const file=e.target.files?.[0];e.target.value='';if(!file)return;
      void run(async()=>{if(file.size>40*1024*1024)throw Error('Skin trop volumineux (40 Mo maximum).');const skin=validateSkin(JSON.parse(await file.text()));await cloudSaveSkin({...skin,id:crypto.randomUUID()});},'Skin importé. Choisis Appliquer pour l’utiliser.');
    }}/></label><small>Bibliothèque Supabase sécurisée : les modèles et leurs icônes sont disponibles depuis tous tes appareils connectés au même compte.</small></div>
    <button type="button" disabled={busy} onClick={()=>void run(async()=>{const local=await listSkins();if(!local.length)throw Error('Aucun ancien modèle local à importer.');const remote=await cloudListSkins();for(const skin of local){if(remote.some(other=>other.id===skin.id))continue;await cloudSaveSkin(skin);}},'Anciens modèles transférés depuis ce navigateur vers Supabase. Aucun modèle local effacé.')}>Importer mes anciens modèles locaux vers le Cloud</button>
    <p role="status" className="nv-setup-message">{message}</p>
    {!skins.length&&<p className="nv-setup-empty">Aucun skin enregistré. Prépare ton apparence, puis enregistre-la ici.</p>}
    <div className="nv-skin-grid">{skins.map(skin=><SkinCard key={skin.id} skin={skin} busy={busy}
      isDefault={selectedDefault===skin.id}
      onSetDefault={()=>{const id=selectedDefault===skin.id?null:skin.id;void run(()=>cloudSetDefaultSkin(id),id?'Modèle « '+skin.name+' » défini par défaut dans Supabase.':'Modèle par défaut désactivé dans Supabase.');}}
      onApply={()=>{try{setProject(applySkin(project,skin));setMessage('Skin « '+skin.name+' » appliqué.');onApplied?.();}catch(error){setMessage(String(error));}}}
      onRename={name=>void run(()=>cloudSaveSkin({...skin,name,updatedAt:new Date().toISOString()}),'Modèle renommé dans Supabase.')}
      onUpdate={()=>{if(window.confirm('Remplacer l’apparence du modèle « '+skin.name+' » par celle du projet actuel ?'))void run(()=>cloudSaveSkin(captureSkin(project,skin.name,skin.id)),'Modèle mis à jour dans Supabase.');}}
      onDelete={()=>{if(window.confirm('Supprimer le modèle « '+skin.name+' » du Cloud ?'))void run(()=>cloudDeleteSkin(skin.id),'Modèle supprimé du Cloud.');}}/>)}</div>
  </div>;
}
function SkinCard({skin,busy,isDefault,onSetDefault,onApply,onRename,onUpdate,onDelete}:{skin:Skin;busy:boolean;isDefault:boolean;onSetDefault:()=>void;onApply:()=>void;onRename:(name:string)=>void;onUpdate:()=>void;onDelete:()=>void}){
  const [name,setName]=useState(skin.name);
  return <article className="nv-skin-card"><div className="nv-skin-preview" style={{background:skin.appearance.barStyle.background,borderColor:skin.appearance.barStyle.outline}}>
    {skin.appearance.bottomBar.slice(0,5).map(item=><span key={item.id} style={{background:skin.appearance.barStyle.button,color:skin.appearance.barStyle.icon}}>
      {item.iconId?<img src={skin.appearance.icons.find(i=>i.id===item.iconId)?.dataUrl} alt=""/>:'✦'}
    </span>)}
  </div><label>Nom<input aria-label={'Renommer '+skin.name} maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label>
    <div className="nv-skin-card-actions"><button type="button" disabled={busy} onClick={onSetDefault} aria-pressed={isDefault}>{isDefault?'★ Modèle par défaut':'☆ Utiliser par défaut'}</button><button type="button" disabled={busy} onClick={onApply}>Appliquer</button>
      <button type="button" disabled={busy||!name.trim()||name===skin.name} onClick={()=>onRename(name)}>Renommer</button>
      <button type="button" disabled={busy} onClick={onUpdate}>Mettre à jour</button>
      <button type="button" disabled={busy} onClick={()=>exportSkin(skin)}>Exporter</button>
      <button type="button" disabled={busy} onClick={onDelete}>Supprimer</button></div>
  </article>;
}
export function SkinLibrary({onClose,...props}:Props&{onClose:()=>void}){
  return <PreparationDialog title="Mes skins" onClose={onClose}><div className="nv-preparation-content"><SkinChoices {...props}/></div></PreparationDialog>;
}
