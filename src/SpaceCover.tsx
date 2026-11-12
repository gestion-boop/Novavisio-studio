import {useState} from 'react';
import {readImage,isSafeFrameImage} from './storage';
export function SpaceCover({name,value,onChange}:{name:string;value?:string;onChange:(value?:string)=>void}){
 const [error,setError]=useState('');
 async function upload(file?:File){if(!file)return;try{if(file.size>8*1024*1024)throw Error('Image : 8 Mo maximum');const src=await readImage(file);if(!isSafeFrameImage(src))throw Error('Choisis une image JPG, PNG ou WebP');const img=new Image();img.src=src;await img.decode();const c=document.createElement('canvas'),scale=Math.min(1,960/Math.max(img.width,img.height));c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d')!.drawImage(img,0,0,c.width,c.height);onChange(c.toDataURL('image/webp',.85));setError('')}catch(e){setError(String(e))}}
 return <div className="nv-space-cover"><strong>{name}</strong>{value&&<img src={value} alt={'Image de '+name}/>}
 <label className="import">{value?'Changer l’image de l’espace':'Importer l’image de l’espace'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{void upload(e.target.files?.[0]);e.target.value=''}}/></label>
 {value&&<button type="button" onClick={()=>onChange(undefined)}>Retirer l’image</button>}{error&&<small role="alert">{error}</small>}</div>;
}
