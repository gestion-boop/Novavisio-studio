import {useRef,useState} from 'react';
import {ExternalLink,Trash2,Copy} from 'lucide-react';
import {uid,readImage,VIDEO_MAX_BYTES,type Hotspot,type MediaLinkItem} from './storage';
import {detectProvider,providerLabel,resolveLink} from './mediaLinks';

/** Bibliothèque Photos et Vidéos d'UNE visite : des liens (Google Drive, kDrive…), sans stockage dans Supabase. */
/** Réduit une photo (max 2400 px, JPEG) pour garder le projet léger. */
async function shrinkPhoto(file:File):Promise<string>{
  const bmp=await createImageBitmap(file);
  const k=Math.min(1,2400/Math.max(bmp.width,bmp.height));
  const c=document.createElement('canvas');c.width=Math.max(1,Math.round(bmp.width*k));c.height=Math.max(1,Math.round(bmp.height*k));
  const x=c.getContext('2d')!;x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(bmp,0,0,c.width,c.height);bmp.close();
  return c.toDataURL('image/jpeg',0.88);
}
export function MediaLibraryPanel({items,onChange,selected,onApply}:{
  items:MediaLinkItem[];onChange:(items:MediaLinkItem[])=>void;
  selected:Hotspot|null;onApply:(item:MediaLinkItem)=>void;
}){
  const [kind,setKind]=useState<'photo'|'video'>('photo');
  const [name,setName]=useState('');
  const [url,setUrl]=useState('');
  const [error,setError]=useState('');
  const [filter,setFilter]=useState<'all'|'photo'|'video'>('all');
  const fileInput=useRef<HTMLInputElement>(null);
  const [busy,setBusy]=useState('');
  const targetKind=selected&&(selected.type==='image'||selected.type==='video')?(selected.type==='image'?'photo':'video'):null;
  const add=()=>{
    const link=url.trim();
    const provider=detectProvider(link);
    const draft:MediaLinkItem={id:uid(),kind,name:(name.trim()||'Sans titre').slice(0,200),url:link,provider};
    const r=resolveLink(draft);
    if(r.problem){setError(r.problem);return;}
    if(items.length>=300){setError('300 éléments maximum dans une bibliothèque.');return;}
    onChange([draft,...items]);setName('');setUrl('');setError('');
  };
  const importFiles=async(files:FileList|null)=>{
    if(!files||!files.length)return;
    const next:MediaLinkItem[]=[];const problems:string[]=[];
    let n=0;
    for(const file of Array.from(files)){
      n++;setBusy('Import '+n+'/'+files.length+'…');
      const base=file.name.replace(/\.[^.]+$/,'').slice(0,200)||'Sans titre';
      try{
        if(/^image\/(jpeg|png|webp|heic|heif|gif)$/.test(file.type)||/\.(jpe?g|png|webp)$/i.test(file.name)){
          next.push({id:uid(),kind:'photo',name:base,url:'',provider:'local',data:await shrinkPhoto(file)});
        }else if(['video/mp4','video/webm'].includes(file.type)){
          if(file.size>VIDEO_MAX_BYTES){problems.push(file.name+' : vidéo trop lourde (45 Mo maximum).');continue;}
          next.push({id:uid(),kind:'video',name:base,url:'',provider:'local',data:await readImage(file)});
        }else if(/video\/quicktime/.test(file.type)||/\.mov$/i.test(file.name)){
          problems.push(file.name+' : format MOV non pris en charge, exporte-le en MP4.');
        }else problems.push(file.name+' : format non pris en charge (photos JPG, PNG, WebP ; vidéos MP4, WebM).');
      }catch{problems.push(file.name+' : lecture impossible.');}
    }
    setBusy('');
    if(next.length){
      if(items.length+next.length>300)problems.push('300 éléments maximum : certains fichiers n’ont pas été ajoutés.');
      onChange([...next,...items].slice(0,300));
    }
    setError(problems.join(' '));
    if(fileInput.current)fileInput.current.value='';
  };
  const shown=items.filter(i=>filter==='all'||i.kind===filter);
  return <div className="nv-medialib">
    <p className="hint">Chaque visite a sa propre bibliothèque. Importe des photos et des vidéos depuis ton ordinateur, ou colle un lien (Google Drive…).</p>
    <button type="button" className="import" disabled={!!busy} onClick={()=>fileInput.current?.click()}>{busy||'⬆ Importer depuis mon ordinateur (photos, vidéos)'}</button>
    <input ref={fileInput} type="file" multiple hidden accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,.jpg,.jpeg,.png,.webp,.mp4,.webm" onChange={e=>void importFiles(e.target.files)}/>
    <small className="hint-inline">Photos : JPG, PNG, WebP (réduites à 2400 px). Vidéos : MP4 ou WebM, 45 Mo maximum.</small>
    <div className="nv-medialib-add">
      <div className="nv-vs-row">
        <button type="button" className={kind==='photo'?'is-on':''} onClick={()=>setKind('photo')}>▣ Photo</button>
        <button type="button" className={kind==='video'?'is-on':''} onClick={()=>setKind('video')}>▶ Vidéo</button>
      </div>
      <input placeholder="Nom (ex. Salon, Visite cuisine)" value={name} onChange={e=>setName(e.target.value)}/>
      <input placeholder="…ou lien Google Drive (https://…)" value={url} onChange={e=>{setUrl(e.target.value);setError('');}} onKeyDown={e=>{if(e.key==='Enter')add();}}/>
      {error&&<small className="warning-inline">{error}</small>}
      <button type="button" className="import" disabled={!url.trim()} onClick={add}>＋ Ajouter à la bibliothèque</button>
    </div>
    <div className="nv-vs-row nv-medialib-filter" role="group" aria-label="Filtrer">
      {(['all','photo','video'] as const).map(f=><button key={f} type="button" className={filter===f?'is-on':''} onClick={()=>setFilter(f)}>{f==='all'?'Tout ('+items.length+')':f==='photo'?'Photos':'Vidéos'}</button>)}
    </div>
    {shown.length===0&&<p className="hint-inline">Aucun élément pour le moment.</p>}
    <ul className="nv-medialib-list">
      {shown.map(item=>{
        const r=resolveLink(item);
        const canApply=targetKind===item.kind&&!r.problem;
        return <li key={item.id}>
          <div className="nv-medialib-thumb">{item.kind==='photo'&&r.thumb?<img src={r.thumb} alt="" loading="lazy" referrerPolicy="no-referrer"/>:<span>{item.kind==='photo'?'▣':'▶'}</span>}</div>
          <div className="nv-medialib-info">
            <input value={item.name} aria-label="Nom" onChange={e=>onChange(items.map(i=>i.id===item.id?{...i,name:e.target.value.slice(0,200)}:i))}/>
            <small>{providerLabel[item.provider]} · {item.kind==='photo'?'Photo':'Vidéo'}{r.embed?' · lecteur intégré':''}</small>
            {r.problem&&<small className="warning-inline">{r.problem}</small>}
          </div>
          <div className="nv-medialib-actions">
            {canApply&&<button type="button" className="is-primary" onClick={()=>onApply(item)} title="Utiliser dans le point sélectionné">Utiliser</button>}
            {item.provider!=='local'&&<><a href={item.url} target="_blank" rel="noopener noreferrer" aria-label="Ouvrir le lien" title="Ouvrir le lien"><ExternalLink size={15}/></a>
            <button type="button" aria-label="Copier le lien" title="Copier le lien" onClick={()=>void navigator.clipboard?.writeText(item.url)}><Copy size={15}/></button></>}
            <button type="button" aria-label="Retirer de la bibliothèque" title="Retirer de la bibliothèque" onClick={()=>{if(window.confirm('Retirer « '+item.name+' » de la bibliothèque ? Les points qui l’utilisent déjà ne changent pas.'))onChange(items.filter(i=>i.id!==item.id));}}><Trash2 size={15}/></button>
          </div>
        </li>;})}
    </ul>
    {targetKind?<small className="hint-inline">Point sélectionné : <b>{selected!.title||'(sans titre)'}</b> — touche « Utiliser » pour lui donner ce {targetKind==='photo'?'photo':'vidéo'}.</small>
      :<small className="hint-inline">Sélectionne un point Photo ou Vidéo dans le panorama pour y utiliser un élément de la bibliothèque.</small>}
  </div>;
}
