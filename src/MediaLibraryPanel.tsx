import {useState} from 'react';
import {ExternalLink,Trash2,Copy} from 'lucide-react';
import {uid,type Hotspot,type MediaLinkItem} from './storage';
import {detectProvider,providerLabel,resolveLink} from './mediaLinks';

/** Bibliothèque Photos et Vidéos d'UNE visite : des liens (Google Drive, kDrive…), sans stockage dans Supabase. */
export function MediaLibraryPanel({items,onChange,selected,onApply}:{
  items:MediaLinkItem[];onChange:(items:MediaLinkItem[])=>void;
  selected:Hotspot|null;onApply:(item:MediaLinkItem)=>void;
}){
  const [kind,setKind]=useState<'photo'|'video'>('photo');
  const [name,setName]=useState('');
  const [url,setUrl]=useState('');
  const [error,setError]=useState('');
  const [filter,setFilter]=useState<'all'|'photo'|'video'>('all');
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
  const shown=items.filter(i=>filter==='all'||i.kind===filter);
  return <div className="nv-medialib">
    <p className="hint">Les fichiers restent chez toi (Google Drive, kDrive…) : seul leur <b>lien</b> est enregistré, rien n’est envoyé dans Supabase. Chaque visite a sa propre bibliothèque. Les fichiers doivent être partagés avec « toute personne disposant du lien ».</p>
    <div className="nv-medialib-add">
      <div className="nv-vs-row">
        <button type="button" className={kind==='photo'?'is-on':''} onClick={()=>setKind('photo')}>▣ Photo</button>
        <button type="button" className={kind==='video'?'is-on':''} onClick={()=>setKind('video')}>▶ Vidéo</button>
      </div>
      <input placeholder="Nom (ex. Salon, Visite cuisine)" value={name} onChange={e=>setName(e.target.value)}/>
      <input placeholder="Lien de partage Google Drive / kDrive (https://…)" value={url} onChange={e=>{setUrl(e.target.value);setError('');}} onKeyDown={e=>{if(e.key==='Enter')add();}}/>
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
            <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label="Ouvrir le lien" title="Ouvrir le lien"><ExternalLink size={15}/></a>
            <button type="button" aria-label="Copier le lien" title="Copier le lien" onClick={()=>void navigator.clipboard?.writeText(item.url)}><Copy size={15}/></button>
            <button type="button" aria-label="Retirer de la bibliothèque" title="Retirer de la bibliothèque (le fichier reste chez toi)" onClick={()=>{if(window.confirm('Retirer « '+item.name+' » de la bibliothèque ? Le fichier reste dans ton Drive.'))onChange(items.filter(i=>i.id!==item.id));}}><Trash2 size={15}/></button>
          </div>
        </li>;})}
    </ul>
    {targetKind?<small className="hint-inline">Point sélectionné : <b>{selected!.title||'(sans titre)'}</b> — touche « Utiliser » pour lui donner ce {targetKind==='photo'?'photo':'vidéo'}.</small>
      :<small className="hint-inline">Sélectionne un point Photo ou Vidéo dans le panorama pour y utiliser un élément de la bibliothèque.</small>}
  </div>;
}
