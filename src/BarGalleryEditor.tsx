import {useState} from 'react';
import {galleryEntries} from './gallery';
import type {BottomBarItem,GalleryItem,Scene,StudioProject} from './storage';

export type BarGalleryTab='panoramas'|'spaces';

/** A button can open one panel containing both panorama and space shortcuts. */
export function BarGalleryEditor({item,scenes,spaces,thumbs,tab,onTabChange,onChange,onPreview}:{
  item:BottomBarItem;scenes:Scene[];spaces:NonNullable<StudioProject['spaces']>;
  thumbs:Record<string,string>;tab:BarGalleryTab;onTabChange:(tab:BarGalleryTab)=>void;
  onChange:(patch:Partial<BottomBarItem>)=>void;onPreview:()=>void;
}){
  const [error,setError]=useState('');
  const list=galleryEntries(item,scenes);
  const used=new Set(list.map(entry=>entry.sceneId));
  const others=scenes.filter(scene=>!used.has(scene.id));
  const raw:GalleryItem[]=list.map(entry=>({sceneId:entry.sceneId,label:entry.custom}));
  const entries=galleryEntries(item,scenes,spaces);
  const availableSpaces=spaces.filter(space=>scenes.some(scene=>space.sceneIds.includes(scene.id)));
  const selectedSpaces=availableSpaces.filter(space=>item.gallerySpaceIds?.includes(space.id));
  const save=(gallery:GalleryItem[])=>onChange({gallery});
  const move=(index:number,direction:number)=>{
    const next=[...raw],to=index+direction;
    if(to<0||to>=next.length)return;
    [next[index],next[to]]=[next[to],next[index]];save(next);
  };
  const thumb=(id:string)=><span className="gallery-thumb">{thumbs[id]&&<img src={thumbs[id]} alt="" draggable={false}/>}</span>;
  return <div className="gallery-editor">
    <label>Titre du panneau<input value={item.galleryTitle??''} placeholder={item.title||'Espaces et panoramas'} onChange={event=>onChange({galleryTitle:event.target.value})}/></label>
    <div className="nv-gallery-bg-picker">
      <div className="section-title">PHOTO DE FOND DU PANNEAU</div>
      <div className="nv-gallery-bg-current">
        <span className="nv-gallery-bg-preview">{item.galleryBackgroundImage?<img src={item.galleryBackgroundImage} alt="Photo de fond choisie" draggable={false}/>:<em>Aucune photo</em>}</span>
        <div className="nv-gallery-bg-actions">
          <label className="nv-gallery-bg-import">{item.galleryBackgroundImage?'Changer la photo':'＋ Choisir une photo'}
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={async event=>{
              const file=event.target.files?.[0];event.target.value='';
              if(!file)return;
              try{onChange({galleryBackgroundImage:await compressBackground(file),galleryBackground:undefined});setError('');}
              catch(e){setError(e instanceof Error?e.message:String(e));}
            }}/></label>
          {!!(item.galleryBackgroundImage||item.galleryBackground)&&<button type="button" onClick={()=>onChange({galleryBackgroundImage:undefined,galleryBackground:undefined})}>Retirer la photo</button>}
        </div>
      </div>
      {error&&<small role="alert" className="nv-gallery-bg-error">{error}</small>}
      {spaces.some(space=>space.coverDataUrl)&&<><small className="hint-inline">Ou reprendre l’image d’un espace :</small>
        <div className="nv-gallery-bg-options" role="radiogroup" aria-label="Image d’un espace">
          {spaces.filter(space=>space.coverDataUrl).map(space=><button type="button" role="radio" key={'space:'+space.id} aria-checked={!item.galleryBackgroundImage&&item.galleryBackground==='space:'+space.id} title={'Couverture de '+space.name} className={!item.galleryBackgroundImage&&item.galleryBackground==='space:'+space.id?'is-selected':''} onClick={()=>onChange({galleryBackground:'space:'+space.id,galleryBackgroundImage:undefined})}><img src={space.coverDataUrl} alt="" draggable={false}/><small>{space.name}</small></button>)}
        </div></>}
    </div>
    <p className="hint-inline">Coche les espaces à proposer dans le popup. Chaque carte ouvre la visite de cet espace. Tu peux aussi ajouter des panoramas dans le même panneau.</p>
    <div className="nv-gallery-content-tabs" role="group" aria-label="Contenu du panneau">
      <button type="button" aria-pressed={tab==='spaces'} onClick={()=>onTabChange('spaces')}>Espaces ({selectedSpaces.length})</button>
      <button type="button" aria-pressed={tab==='panoramas'} onClick={()=>onTabChange('panoramas')}>Panoramas ({list.length})</button>
    </div>
    {tab==='spaces'?<>
      <p className="hint-inline">L’image définie dans les réglages de l’espace sera affichée sur sa carte.</p>
      {!spaces.length&&<p className="nv-gallery-empty">Aucun espace créé. Utilise « Espaces → Ajouter un espace » en haut pour en créer un.</p>}
      <div className="nv-gallery-space-options">{spaces.map(space=>{
        const members=scenes.filter(scene=>space.sceneIds.includes(scene.id));
        const checked=item.gallerySpaceIds?.includes(space.id)??false;
        const cover=space.coverDataUrl??thumbs[members[0]?.id];
        return <label key={space.id} className={'nv-gallery-space-option'+(checked?' is-selected':'')+(!members.length?' is-empty':'')}>
          <input type="checkbox" checked={checked} disabled={!members.length} onChange={event=>onChange({gallerySpaceIds:event.target.checked?[...new Set([...(item.gallerySpaceIds??[]),space.id])]:(item.gallerySpaceIds??[]).filter(id=>id!==space.id)})}/>
          <span className="nv-gallery-space-cover">{cover?<img src={cover} alt="" loading="lazy" draggable={false}/>:<span aria-hidden="true">▦</span>}</span>
          <span><strong>{space.name}</strong><small>{members.length?members.length+' panorama'+(members.length>1?'s':''):'Ajoute un panorama à cet espace'}</small></span>
        </label>;
      })}</div>
      {availableSpaces.length>0&&<div className="gallery-bulk">
        <button type="button" onClick={()=>onChange({gallerySpaceIds:availableSpaces.map(space=>space.id)})}>Tous les espaces</button>
        <button type="button" disabled={!selectedSpaces.length} onClick={()=>onChange({gallerySpaceIds:[]})}>Retirer les espaces</button>
      </div>}
    </>:<>
      <div className="section-title">PANORAMAS DANS LE PANNEAU <span className="counter">{list.length}</span></div>
      {!list.length&&<small className="hint-inline">Aucun panorama sélectionné. Tes espaces restent dans le panneau.</small>}
      <ul className="gallery-rows">{list.map((entry,index)=><li key={entry.sceneId}>
        {thumb(entry.sceneId)}
        <input value={entry.custom} placeholder={entry.sceneName} aria-label={'Nom affiché dans la galerie pour '+entry.sceneName} onChange={event=>save(raw.map((row,i)=>i===index?{...row,label:event.target.value}:row))}/>
        <button type="button" aria-label="Monter" disabled={index===0} onClick={()=>move(index,-1)}>↑</button>
        <button type="button" aria-label="Descendre" disabled={index===list.length-1} onClick={()=>move(index,1)}>↓</button>
        <button type="button" aria-label="Retirer de la galerie" className="is-remove" onClick={()=>save(raw.filter((_,i)=>i!==index))}>✕</button>
      </li>)}</ul>
      {!!others.length&&<><div className="section-title">AUTRES PANORAMAS</div>
        <ul className="gallery-rows is-others">{others.map(scene=><li key={scene.id}>
          {thumb(scene.id)}<span className="gallery-name">{scene.name}</span>
          <button type="button" className="gallery-add" onClick={()=>save([...raw,{sceneId:scene.id,label:''}])}>＋ Ajouter</button>
        </li>)}</ul></>}
      <div className="gallery-bulk">
        {!!others.length&&<button type="button" onClick={()=>save([...raw,...others.map(scene=>({sceneId:scene.id,label:''}))])}>Tout ajouter</button>}
        {!!list.length&&<button type="button" onClick={()=>save([])}>Retirer les panoramas</button>}
      </div>
    </>}
    <button type="button" className="import" disabled={!entries.length} onClick={onPreview}>Voir le panneau ({entries.length} carte{entries.length>1?'s':''})</button>
    <small className="hint-inline">Enregistre le projet dans le Cloud pour conserver ce réglage.</small>
  </div>;
}

/** Réduit la photo choisie (1600 px max, JPEG) pour qu'elle reste légère dans le projet et dans le Cloud. */
async function compressBackground(file:File):Promise<string>{
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choisis une image JPG, PNG ou WebP.');
  if(file.size>25_000_000)throw new Error('Image trop lourde (25 Mo maximum).');
  const bitmap=await createImageBitmap(file);
  const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Image illisible.');
  ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  for(const quality of [.84,.72,.6]){
    const url=canvas.toDataURL('image/jpeg',quality);
    if(url.length<2_500_000)return url;
  }
  throw new Error('Image trop détaillée : choisis une image plus petite.');
}
