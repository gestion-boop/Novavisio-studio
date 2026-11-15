import {useState} from 'react';
import {Check,Plus,X} from 'lucide-react';
import {isSafeIconDataUrl,readImage} from './storage';

export type IconSetImages=Record<'normal'|'hover'|'pressed',string>;
type State=keyof IconSetImages;
const STATES:ReadonlyArray<{id:State;label:string}>=[
  {id:'normal',label:'Normal'},
  {id:'hover',label:'Survol'},
  {id:'pressed',label:'Pressé'}
];
const MAX_FILE_BYTES=1_500_000;

async function loadIcon(file:File):Promise<string>{
  if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type) || file.size>MAX_FILE_BYTES){
    throw Error('Utilise des fichiers PNG, JPG, WebP ou GIF de 1,5 Mo maximum chacun.');
  }
  const dataUrl=await readImage(file);
  if(!isSafeIconDataUrl(dataUrl)||dataUrl.length>3_000_000)throw Error('Image invalide ou trop volumineuse.');
  const img=new Image();
  img.src=dataUrl;
  await img.decode().catch(()=>{throw Error('Impossible de lire « '+file.name+' ».');});
  return dataUrl;
}

function guessState(filename:string):State|undefined{
  const name=filename.replace(/\.[^.]+$/,'').toLowerCase();
  if(/(?:^|[_\-\s·])(survol|hover)(?:$|[_\-\s·])/.test(name))return 'hover';
  if(/(?:^|[_\-\s·])(press[eé]|pressed|press|clic|click|active)(?:$|[_\-\s·])/.test(name))return 'pressed';
  if(/(?:^|[_\-\s·])(normal|default)(?:$|[_\-\s·])/.test(name))return 'normal';
  return undefined;
}

export function IconSetCreator({onCreate}:{onCreate:(name:string,images:IconSetImages)=>Promise<void>}){
  const [open,setOpen]=useState(false);
  const [name,setName]=useState('');
  const [images,setImages]=useState<Partial<IconSetImages>>({});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  const ready=!!name.trim()&&STATES.every(state=>!!images[state.id]);

  async function loadOne(state:State,file?:File){
    if(!file)return;
    setBusy(true);setError('');setSuccess('');
    try{
      const dataUrl=await loadIcon(file);
      setImages(current=>({...current,[state]:dataUrl}));
    }catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setBusy(false);}
  }

  async function loadThree(list:FileList|null){
    if(!list)return;
    const files=Array.from(list);
    if(files.length!==3){setError('Sélectionne exactement trois images pour le pack.');return;}
    setBusy(true);setError('');setSuccess('');
    try{
      const detected=files.map(file=>guessState(file.name));
      const distinct=detected.every(Boolean)&&new Set(detected).size===3;
      const urls=await Promise.all(files.map(loadIcon));
      const next:Partial<IconSetImages>={};
      files.forEach((_,i)=>{next[distinct?detected[i]!:STATES[i].id]=urls[i];});
      setImages(next);
    }catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setBusy(false);}
  }

  async function save(){
    if(!ready||busy)return;
    setBusy(true);setError('');
    try{
      await onCreate(name.trim(),images as IconSetImages);
      setSuccess('Pack « '+name.trim()+' » créé avec ses trois états. Pense à sauvegarder le projet avec la disquette.');
      setName('');setImages({});setOpen(false);
    }catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setBusy(false);}
  }

  return <div className="nv-iconset-create">
    <button type="button" className="nv-iconset-create-toggle" onClick={()=>{setOpen(v=>!v);setError('');}} aria-expanded={open}>
      {open?<X size={17}/>:<Plus size={17}/>} {open?'Fermer la création':'Créer un pack de 3'}
    </button>
    {success&&<p className="nv-iconset-create-ok" role="status"><Check size={15}/>{success}</p>}
    {open&&<div className="nv-iconset-create-panel">
      <p>Un pack = trois fichiers indépendants : <strong>normal, survol et pressé</strong>. Ils seront associés automatiquement dans la bibliothèque.</p>
      <label className="nv-iconset-create-name">Nom du pack
        <input value={name} maxLength={100} placeholder="Ex. Réservation doré 3D" disabled={busy} onChange={e=>setName(e.target.value)}/>
      </label>
      <label className="nv-iconset-create-multi">Importer les 3 images d’un coup
        <input type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" disabled={busy}
          onChange={e=>{void loadThree(e.target.files);e.target.value='';}}/>
      </label>
      <small>Les noms contenant _normal, _survol et _presse sont reconnus. Sinon, l’ordre est normal → survol → pressé.</small>
      <div className="nv-iconset-create-states">
        {STATES.map(({id,label})=><div key={id} className="nv-iconset-create-state">
          <div className="nv-iconset-create-preview">{images[id]?<img src={images[id]} alt={'Aperçu '+label}/>:<span>+</span>}</div>
          <strong>{label}</strong>
          <label className="nv-iconset-create-file">{images[id]?'Remplacer':'Choisir le fichier'}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={busy}
              onChange={e=>{void loadOne(id,e.target.files?.[0]);e.target.value='';}}/>
          </label>
          {images[id]&&<button type="button" className="nv-iconset-create-clear" disabled={busy}
            onClick={()=>setImages(current=>({...current,[id]:undefined}))}>Retirer</button>}
        </div>)}
      </div>
      {error&&<p role="alert" className="nv-iconset-create-error">{error}</p>}
      <div className="nv-iconset-create-actions">
        <button type="button" disabled={busy} onClick={()=>setOpen(false)}>Annuler</button>
        <button type="button" className="nv-iconset-create-save" disabled={!ready||busy} onClick={()=>void save()}>
          {busy?'Traitement…':'Enregistrer le pack de 3'}
        </button>
      </div>
    </div>}
  </div>;
}
