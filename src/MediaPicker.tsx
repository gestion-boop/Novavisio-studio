import {useEffect,useMemo,useState,type ReactNode} from 'react';
import {Image as ImageIcon,Upload,Video,X,Trash2} from 'lucide-react';
import {forgetMedia,listMedia,mediaKey,type MediaItem,type MediaKind} from './mediaLibrary';
import type {StudioProject} from './storage';

/**
 * Choisir un média : on voit d'abord les photos / vidéos déjà utilisées (projet + mémoire du logiciel).
 * « Importer depuis l'ordinateur » ouvre le sélecteur du système ; l'annuler laisse cette fenêtre ouverte.
 */
export function MediaPicker({kind,project,version,onPick,onImport,onClose,onDeleteLibrary,banner}:{
  kind:MediaKind;project:StudioProject;version:number;onDeleteLibrary?:(id:string)=>void;
  onPick:(item:{name:string;dataUrl?:string;url?:string})=>void;onImport:()=>void;onClose:()=>void;banner?:ReactNode;
}){
  const [stored,setStored]=useState<MediaItem[]|null>(null);
  const [removed,setRemoved]=useState<Set<string>>(new Set());
  const [showMemory,setShowMemory]=useState(false);
  useEffect(()=>{let dead=false;listMedia().then(l=>{if(!dead)setStored(l);}).catch(()=>{if(!dead)setStored([]);});return ()=>{dead=true;};},[version]);
  const items=useMemo(()=>{
    const map=new Map<string,{key:string;id?:string;libId?:string;name:string;dataUrl?:string;url?:string;origin:'memoire'|'projet'|'bibliotheque'}>();
    // 1) Bibliothèque « Photos & Vidéos de cette visite » : ce que l'on voit dans le panneau de droite.
    for(const m of project.mediaLibrary??[]){
      if(m.kind!==(kind==='image'?'photo':'video'))continue;
      if(m.data){const key=mediaKey(m.data);map.set(key,{key,libId:m.id,name:m.name,dataUrl:m.data,origin:'bibliotheque'});}
      else if(kind==='video'&&m.url){const key='u:'+m.url;map.set(key,{key,libId:m.id,name:m.name,url:m.url,origin:'bibliotheque'});}
    }
    // 2) Mémoire du logiciel (photos d'autres visites) : seulement si on le demande, ou si la visite n'a rien.
    const libCount=map.size;
    if(showMemory||libCount===0)for(const item of stored??[])if(item.kind===kind){const k=mediaKey(item.dataUrl);if(!map.has(k))map.set(mediaKey(item.dataUrl),{key:mediaKey(item.dataUrl),id:item.id,name:item.name,dataUrl:item.dataUrl,origin:'memoire'});}
    // Médias déjà présents dans le projet (même si la mémoire du logiciel a été vidée).
    for(const scene of project.scenes)for(const h of scene.hotspots){
      const data=kind==='image'?h.imageDataUrl:h.videoDataUrl;
      if(data){const key=mediaKey(data);if(!map.has(key))map.set(key,{key,name:h.title||scene.name,dataUrl:data,origin:'projet'});}
      else if(kind==='video'&&h.videoUrl){const key='u:'+h.videoUrl;if(!map.has(key))map.set(key,{key,name:h.title||'Vidéo en ligne',url:h.videoUrl,origin:'projet'});}
    }
    return [...map.values()].filter(i=>!removed.has(i.key));
  },[stored,project,kind,removed,showMemory]);
  const memoryCount=useMemo(()=>(stored??[]).filter(i=>i.kind===kind&&!(project.mediaLibrary??[]).some(m=>m.data&&mediaKey(m.data)===mediaKey(i.dataUrl))).length,[stored,kind,project.mediaLibrary]);
  const label=kind==='image'?'photo':'vidéo';
  return <div className="overlay nv-mediapicker-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section className="nv-mediapicker" role="dialog" aria-modal="true" aria-label={'Choisir une '+label}>
      <header><div><strong>{kind==='image'?<ImageIcon size={18}/>:<Video size={18}/>} Choisir une {label}</strong>
        <small>Reprends un média déjà utilisé, ou importe-en un nouveau depuis ton ordinateur.</small></div>
        <button type="button" onClick={onClose} aria-label="Fermer"><X size={20}/></button></header>
      {banner}
      <button type="button" className="nv-mediapicker-import" onClick={onImport}><Upload size={18}/> Importer {kind==='image'?'une photo':'une vidéo'} depuis l’ordinateur</button>
      {stored===null&&<p className="nv-mediapicker-info">Chargement…</p>}
      {stored!==null&&items.length===0&&<p className="nv-mediapicker-info">Aucune {label} pour l’instant. Celles que tu importes ici seront gardées pour les réutiliser.</p>}
      {memoryCount>0&&(project.mediaLibrary??[]).some(m=>m.kind===(kind==='image'?'photo':'video'))&&<button type="button" className="nv-mediapicker-memory" onClick={()=>setShowMemory(v=>!v)}>{showMemory?'Masquer':'Afficher aussi'} les {memoryCount} {label}{memoryCount>1?'s':''} en mémoire du logiciel (autres visites)</button>}
      <div className="nv-mediapicker-grid">
        {items.map(item=><div className="nv-media-tile" key={item.key}>
          <button type="button" className="nv-media-tile-main" onClick={()=>onPick({name:item.name,dataUrl:item.dataUrl,url:item.url})} title={item.name}>
            <span className="nv-media-thumb">{kind==='image'
              ?<img src={item.dataUrl} alt="" loading="lazy" draggable={false}/>
              :<video src={(item.dataUrl??item.url??'')+'#t=0.3'} preload="metadata" muted playsInline/>}</span>
            <strong>{item.name}</strong><small>{item.origin==='bibliotheque'?'Bibliothèque de la visite':item.origin==='projet'?'Dans ce projet':'En mémoire (autres visites)'}</small>
          </button>
          {item.libId&&onDeleteLibrary&&<button type="button" className="nv-media-tile-del" aria-label={'Supprimer '+item.name+' de la bibliothèque'} title="Supprimer de la bibliothèque de cette visite"
            onClick={()=>{if(window.confirm('Supprimer « '+item.name+' » de la bibliothèque de cette visite ? (Les cadres qui l’utilisent déjà la gardent.)')){onDeleteLibrary(item.libId!);setRemoved(s=>new Set(s).add(item.key));}}}><Trash2 size={15}/></button>}
          {item.id&&<button type="button" className="nv-media-tile-del" aria-label={'Retirer '+item.name+' de la mémoire'} title="Retirer de la mémoire du logiciel"
            onClick={()=>{if(window.confirm('Retirer « '+item.name+' » de la mémoire du logiciel ? (Les cadres qui l’utilisent la gardent.)')){void forgetMedia(item.id!).then(()=>setRemoved(s=>new Set(s).add(item.key)));}}}><Trash2 size={14}/></button>}
        </div>)}
      </div>
    </section>
  </div>;
}
