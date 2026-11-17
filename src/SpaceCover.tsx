import {useState} from 'react';

export function SpaceCover({name,value,onChange}:{name:string;value?:string;onChange:(value?:string)=>void}){
 const [error,setError]=useState('');
 const [dragHover,setDragHover]=useState(false);
 async function upload(file?:File){
  if(!file)return;
  try{
    if(file.size>40*1024*1024)throw Error('Image de couverture : 40 Mo maximum par fichier.');
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)&&!/\.(jpe?g|png|webp)$/i.test(file.name))
      throw Error('Choisis une image JPG, PNG ou WebP.');
    // Décodage du fichier sans le conserver en base64, puis vignette légère.
    const image=await createImageBitmap(file);
    try{
      const scale=Math.min(1,960/Math.max(image.width,image.height));
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(image.width*scale));
      canvas.height=Math.max(1,Math.round(image.height*scale));
      const ctx=canvas.getContext('2d');
      if(!ctx)throw Error('Impossible de préparer la couverture.');
      ctx.drawImage(image,0,0,canvas.width,canvas.height);
      onChange(canvas.toDataURL('image/webp',0.82));
      setError('');
    }finally{image.close();}
  }catch(e){setError(e instanceof Error?e.message:'Import impossible.');}
 }
 return <div className={'nv-space-cover nv-pano-import-dropzone'+(dragHover?' drag-hover':'')}
  onDragOver={e=>{if(e.dataTransfer?.types.includes('Files')){e.preventDefault();setDragHover(true);}}}
  onDragLeave={()=>setDragHover(false)}
  onDrop={e=>{if(e.dataTransfer?.files?.[0]){e.preventDefault();setDragHover(false);void upload(e.dataTransfer.files[0]);}}}>
  <strong>Image de couverture — {name}</strong><small>Une seule image de présentation (40 Mo max). Pour ajouter plusieurs panoramas 360°, utilise « Importer plusieurs panoramas » ci-dessous.</small>{value&&<img src={value} alt={'Image de '+name}/>}
  <label className="import">{value?'Changer l’image de couverture':'Ajouter une image de couverture'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{void upload(e.target.files?.[0]);e.target.value=''}}/></label>
  {value&&<button type="button" onClick={()=>onChange(undefined)}>Retirer l’image</button>}{error&&<small role="alert">{error}</small>}</div>;
}
