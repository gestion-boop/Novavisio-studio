import {useEffect,useRef,useState} from 'react';
import {Layers,UploadCloud} from 'lucide-react';
import {cloudListSkins,cloudSaveSkin,type CloudSkin} from './cloudSkins';
import {validateSkin} from './skins';

/** Choisir ou importer la charte graphique pendant l'enregistrement d'un client.
 * Import Cloud privé ; aucun média panoramique d'un autre client n'est copié. */
export function ClientSkinPicker({selected,onChange,onBusy}:{
  selected:CloudSkin|null;onChange:(skin:CloudSkin|null)=>void;onBusy?:(busy:boolean)=>void;
}){
  const [skins,setSkins]=useState<CloudSkin[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const fileInput=useRef<HTMLInputElement>(null);
  useEffect(()=>{
    let live=true;
    void cloudListSkins().then(items=>{
      if(live)setSkins(items);
    }).catch(e=>{
      if(live)setError('Bibliothèque Cloud indisponible : '+(e instanceof Error?e.message:String(e)));
    }).finally(()=>{if(live)setLoading(false)});
    return ()=>{live=false};
  },[]);
  const importFile=async(file:File)=>{
    if(file.size>40*1024*1024){setError('Skin trop volumineux : 40 Mo maximum.');return}
    setBusy(true);onBusy?.(true);setError('');
    try{
      const parsed=validateSkin(JSON.parse(await file.text()));
      const imported={...parsed,id:crypto.randomUUID(),updatedAt:new Date().toISOString()};
      await cloudSaveSkin(imported);
      const fresh=await cloudListSkins();
      setSkins(fresh);
      const saved=fresh.find(item=>item.id===imported.id);
      if(!saved)throw Error('Le skin importé est introuvable dans la bibliothèque Cloud.');
      onChange(saved);
    }catch(e){
      setError('Import impossible : '+(e instanceof Error?e.message:String(e)));
    }finally{setBusy(false);onBusy?.(false)}
  };
  return <section className="nv-manual-client-property nv-client-skin-picker">
    <strong><Layers size={17}/> Skin graphique du client (facultatif)</strong>
    <p>Importe ou choisis la charte une fois : ses icônes Normal / Survol / Pressé, sa barre et ses réglages VR pourront être repris pour tous les biens du client.</p>
    <label>Skin à appliquer aux nouvelles visites
      <select disabled={busy||loading} value={selected?.id??''}
        onChange={e=>onChange(skins.find(skin=>skin.id===e.target.value)??null)}>
        <option value="">Aucun skin particulier</option>
        {skins.map(skin=><option key={skin.id} value={skin.id}>{skin.name}{skin.isDefault?' ★':''}</option>)}
      </select>
    </label>
    <input ref={fileInput} type="file" accept=".json,.nvskin.json,application/json" hidden
      onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void importFile(file)}}/>
    <button type="button" className="nv-directory-secondary-action" disabled={busy}
      onClick={()=>fileInput.current?.click()}><UploadCloud size={16}/>{busy?'Importation…':'Importer un skin (.nvskin.json)'}</button>
    {selected&&<small className="nv-client-skin-selected">✓ Skin sélectionné : {selected.name} — il sera associé au client et appliqué à ses nouvelles visites.</small>}
    {error&&<small role="alert" className="nv-directory-warning">{error}</small>}
  </section>;
}
