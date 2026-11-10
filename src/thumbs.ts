import {useEffect,useRef,useState} from 'react';
import type {Scene} from './storage';

/**
 * Petites miniatures (192×96) des panoramas pour la liste de gauche.
 * Avant, la liste affichait les panoramas complets réduits par le navigateur : chaque image géante
 * (plusieurs Mo, des dizaines de Mpx) devait rester décodée en mémoire. Les miniatures sont calculées
 * une fois, en arrière-plan, et ne sont jamais enregistrées dans le projet.
 */
const W=192,H=96;
async function makeThumb(dataUrl:string):Promise<string>{
  const blob=await (await fetch(dataUrl)).blob();
  let bitmap:ImageBitmap;
  try{bitmap=await createImageBitmap(blob,{resizeWidth:W,resizeHeight:H,resizeQuality:'medium'});}
  catch{bitmap=await createImageBitmap(blob);}
  try{
    const canvas=document.createElement('canvas');
    canvas.width=W;canvas.height=H;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('canvas');
    ctx.drawImage(bitmap,0,0,W,H);
    return canvas.toDataURL('image/jpeg',0.72);
  }finally{bitmap.close();}
}
const signature=(s:Scene)=>s.id+':'+s.dataUrl.length;

export function useSceneThumbs(scenes:Scene[]):Record<string,string>{
  const [thumbs,setThumbs]=useState<Record<string,string>>({});
  const done=useRef(new Map<string,string>()); // id -> signature déjà calculée
  useEffect(()=>{
    let cancelled=false;
    const todo=scenes.filter(s=>done.current.get(s.id)!==signature(s));
    if(!todo.length)return;
    void (async()=>{
      for(const scene of todo){
        if(cancelled)return;
        try{
          const url=await makeThumb(scene.dataUrl);
          if(cancelled)return;
          done.current.set(scene.id,signature(scene));
          setThumbs(t=>({...t,[scene.id]:url}));
        }catch{
          done.current.set(scene.id,signature(scene)); // image illisible : on n'insiste pas
        }
        await new Promise(r=>setTimeout(r,25)); // laisse respirer l'interface entre deux miniatures
      }
    })();
    return ()=>{cancelled=true;};
  },[scenes]);
  return thumbs;
}
