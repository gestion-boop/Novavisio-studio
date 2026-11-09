import {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Viewer} from '@photo-sphere-viewer/core';
import {MarkersPlugin} from '@photo-sphere-viewer/markers-plugin';
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';
import {loadProject,newProject,readImage,saveProject,uid,validateProject,type Hotspot,type Scene,type StudioProject} from './storage';
import './style.css';

type EditMode = Hotspot['type'] | null;
type PanoramaProps = {
  scene: Scene; mode: EditMode; preview: boolean;
  onCreate: (yaw:number,pitch:number)=>void;
  onPick: (id:string)=>void;
  onNavigate: (id:string)=>void;
  onInfo: (hotspot:Hotspot)=>void;
};
function markerFor(h:Hotspot) {
  return {
    id:h.id,position:{yaw:h.yaw,pitch:h.pitch},
    html:'<span class="nv-marker" aria-label="Point interactif">' + (h.type==='navigation'?'➜':'i') + '</span>',
    size:{width:46,height:46},anchor:'center center' as const,tooltip:h.title
  };
}
function Panorama({scene,mode,preview,onCreate,onPick,onNavigate,onInfo}:PanoramaProps) {
  const box = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer|null>(null);
  const actions = useRef({scene,mode,preview,onCreate,onPick,onNavigate,onInfo});
  actions.current = {scene,mode,preview,onCreate,onPick,onNavigate,onInfo};

  useEffect(()=>{
    if (!box.current) return;
    const viewer = new Viewer({
      container:box.current, panorama:scene.dataUrl,
      navbar:['zoom','move','fullscreen'], defaultZoomLvl:25,
      plugins:[MarkersPlugin]
    });
    viewerRef.current = viewer;
    const markers = viewer.getPlugin(MarkersPlugin) as MarkersPlugin;
    markers.addEventListener('select-marker',({marker})=>{
      const a=actions.current;
      const h=a.scene.hotspots.find(item=>item.id===marker.id);
      if (!h) return;
      if (a.preview) {
        if(h.type==='navigation' && h.target) a.onNavigate(h.target);
        else if(h.type==='information') a.onInfo(h);
      } else {
        a.onPick(h.id);
      }
    });
    viewer.addEventListener('click',event=>{
      const a=actions.current;
      if(!a.preview && a.mode && typeof event.data.yaw==='number' && typeof event.data.pitch==='number') {
        a.onCreate(event.data.yaw,event.data.pitch);
      }
    });
    markers.setMarkers(scene.hotspots.map(markerFor));
    return ()=>{viewerRef.current=null; viewer.destroy();};
  },[scene.id,scene.dataUrl]);
  useEffect(()=>{
    (viewerRef.current?.getPlugin(MarkersPlugin) as MarkersPlugin | undefined)?.setMarkers(scene.hotspots.map(markerFor));
  },[scene.hotspots]);
  return <div ref={box} className="panorama" />;
}

function App(){
  const [project,setProject]=useState<StudioProject>(newProject());
  const [ready,setReady]=useState(false);
  const [activeId,setActiveId]=useState('');
  const [selectedId,setSelectedId]=useState('');
  const [mode,setMode]=useState<EditMode>(null);
  const [preview,setPreview]=useState(false);
  const [status,setStatus]=useState('Initialisation…');
  const [help,setHelp]=useState(false);
  const [info,setInfo]=useState<Hotspot|null>(null);
  const upload=useRef<HTMLInputElement>(null);
  const projectInput=useRef<HTMLInputElement>(null);

  useEffect(()=>{
    loadProject().then(p=>{
      if (p) { setProject(validateProject(p)); setActiveId(p.scenes[0]?.id ?? ''); }
      setReady(true);setStatus('Prêt');
    }).catch(()=>{setReady(true);setStatus('Stockage indisponible');});
  },[]);
  useEffect(()=>{
    if(!ready)return;
    setStatus('Sauvegarde…');
    const t=setTimeout(()=>{
      saveProject({...project,updatedAt:new Date().toISOString()})
        .then(()=>setStatus('Sauvegardé localement'))
        .catch(()=>setStatus('Erreur de sauvegarde : exporte ton projet'));
    },750);
    return ()=>clearTimeout(t);
  },[project,ready]);

  const active=project.scenes.find(s=>s.id===activeId) ?? null;
  const selected=active?.hotspots.find(h=>h.id===selectedId) ?? null;
  const totalPoints=project.scenes.reduce((n,s)=>n+s.hotspots.length,0);
  function patchScene(patch:(s:Scene)=>Scene){
    setProject(p=>({...p,scenes:p.scenes.map(s=>s.id===activeId?patch(s):s)}));
  }
  function patchPoint(update:Partial<Hotspot>){
    patchScene(s=>({...s,hotspots:s.hotspots.map(h=>h.id===selectedId?{...h,...update}:h)}));
  }
  async function addImages(list:FileList|null){
    if(!list?.length)return;
    const next:Scene[]=[];
    for(const file of Array.from(list)){
      if(!['image/jpeg','image/png','image/webp'].includes(file.type))continue;
      if(file.size>40*1024*1024){setStatus('Image trop lourde (40 Mo maximum pour ce prototype)');continue;}
      try {
        next.push({id:uid(),name:file.name.replace(/\.[^.]+$/,'').slice(0,100),dataUrl:await readImage(file),hotspots:[]});
      } catch { setStatus('Erreur de lecture : '+file.name); }
    }
    if(next.length){
      setProject(p=>({...p,scenes:[...p.scenes,...next]}));
      if(!activeId)setActiveId(next[0].id);
      setStatus(next.length+' panorama(s) importé(s)');
    }
    if(upload.current)upload.current.value='';
  }
  function newPoint(yaw:number,pitch:number){
    if(!active||!mode)return;
    const h:Hotspot={id:uid(),type:mode,title:mode==='navigation'?'Aller vers…':'Informations',text:'',target:'',yaw,pitch};
    patchScene(s=>({...s,hotspots:[...s.hotspots,h]}));
    setSelectedId(h.id);setMode(null);
  }
  function removeScene(){
    if(!active||!window.confirm('Supprimer le panorama « '+active.name+' » ?'))return;
    const remaining=project.scenes.filter(s=>s.id!==active.id).map(s=>({...s,hotspots:s.hotspots.filter(h=>h.target!==active.id)}));
    setProject(p=>({...p,scenes:remaining}));setActiveId(remaining[0]?.id??'');setSelectedId('');
  }
  function download(){
    const blob=new Blob([JSON.stringify(project)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;link.download=(project.name.replace(/[^a-zA-Z0-9-]/g,'_')||'visite')+'.nvstudio.json';
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  async function openProject(file?:File){
    if(!file)return;
    try {
      if(file.size>250*1024*1024)throw new Error('Fichier trop volumineux');
      const imported=validateProject(JSON.parse(await file.text()));
      if(!window.confirm('Remplacer le projet actuellement ouvert par ce fichier ?'))return;
      setProject(imported);setActiveId(imported.scenes[0]?.id??'');setSelectedId('');setMode(null);setPreview(false);
      setStatus('Projet importé');
    }catch(e){window.alert('Impossible d’ouvrir ce projet : '+String(e));}
    finally {if(projectInput.current)projectInput.current.value='';}
  }
  function startFresh(){
    if(project.scenes.length && !window.confirm('Créer un nouveau projet ? Pense à exporter celui-ci avant.'))return;
    setProject(newProject());setActiveId('');setSelectedId('');setMode(null);setPreview(false);
  }
  return <div className="app">
    <header className="topbar">
      <div className="brand"><div className="brand-logo">◉</div><div><strong>NovaVisio <span>Studio</span></strong><small>ÉDITEUR DE VISITES 360°</small></div></div>
      <div className="project-name"><input aria-label="Nom du projet" value={project.name} onChange={e=>setProject(p=>({...p,name:e.target.value}))}/><small className="save">{status}</small></div>
      <div className="top-actions">
        <button className="quiet" onClick={startFresh}>Nouveau</button>
        <button className="quiet" onClick={()=>projectInput.current?.click()}>Ouvrir</button>
        <button className="quiet" onClick={download}>Exporter le projet</button>
        <button className={preview?'primary':'outline'} onClick={()=>{setPreview(p=>!p);setMode(null);setSelectedId('');}}>{preview?'Quitter l’aperçu':'Prévisualiser'}</button>
      </div>
    </header>
    <div className="workspace">
      <aside className="left panel">
        <div className="section-title">PANORAMAS <span className="counter">{project.scenes.length}</span></div>
        <button className="import" onClick={()=>upload.current?.click()}>＋ Importer des panoramas</button>
        <div className="scenes">{project.scenes.map((s,i)=><button key={s.id} className={'scene '+(s.id===activeId?'active':'')} onClick={()=>{setActiveId(s.id);setSelectedId('');setMode(null);}}>
          <img src={s.dataUrl} alt="Miniature du panorama"/><span><strong>{s.name}</strong><small>Scène {i+1} · {s.hotspots.length} point(s)</small></span>
        </button>)}</div>
        <div className="helper"><strong>✦ Ton studio 360°</strong><p>Importe tes panoramas, relie les scènes et ajoute des points interactifs.</p><button className="help" onClick={()=>setHelp(true)}>Guide de démarrage →</button></div>
      </aside>
      <main className="editor">
        <div className="editor-top"><span>PROJET / {active?.name??'Nouvelle visite'}</span><b>{preview?'APERÇU INTERACTIF':mode?'CLIQUE DANS LE PANORAMA':'MODE ÉDITION'}</b></div>
        <div className="view-area">{active?<Panorama key={active.id} scene={active} mode={mode} preview={preview} onCreate={newPoint} onPick={setSelectedId} onNavigate={id=>{if(project.scenes.some(s=>s.id===id))setActiveId(id);}} onInfo={setInfo}/>:<div className="empty">
          <div className="empty-icon">◎</div><h1>Ta première visite commence ici</h1>
          <p>Importe des photos équirectangulaires 360° pour commencer à créer ta visite interactive.</p>
          <button className="primary" onClick={()=>upload.current?.click()}>＋ Importer mes photos 360°</button><small>JPG, PNG ou WebP · rapport 2:1 recommandé</small>
        </div>}</div>
        {active && !preview && <div className="toolbar">
          <span>OUTILS</span>
          <button className={'tool '+(mode==='navigation'?'selected':'')} onClick={()=>setMode(mode==='navigation'?null:'navigation')}>➜ Navigation</button>
          <button className={'tool '+(mode==='information'?'selected':'')} onClick={()=>setMode(mode==='information'?null:'information')}>ⓘ Information</button>
          <div className="grow"/><button className="tool danger" onClick={removeScene}>⌫ Supprimer scène</button>
        </div>}
      </main>
      <aside className="right panel">
        <div className="section-title">PROPRIÉTÉS</div>
        {!active?<div className="hint">Sélectionne un panorama pour afficher ses propriétés.</div>:<div className="properties">
          <label>Nom du panorama<input value={active.name} onChange={e=>patchScene(s=>({...s,name:e.target.value}))}/></label>
          <hr/><div className="section-title">POINTS INTERACTIFS <span className="counter">{active.hotspots.length}</span></div>
          {!selected?<><div className="hint">{mode?'Clique à l’endroit voulu sur le panorama pour créer le point.':'Choisis un point existant ou utilise les outils sous le panorama.'}</div>
            {active.hotspots.map(h=><button className="point-row" key={h.id} onClick={()=>setSelectedId(h.id)}><span>{h.type==='navigation'?'➜':'ⓘ'}</span>{h.title}</button>)}
          </>:<><button className="back" onClick={()=>setSelectedId('')}>← Tous les points</button>
            <div className="tag">{selected.type==='navigation'?'➜ Navigation':'ⓘ Information'}</div>
            <label>Titre du point<input value={selected.title} onChange={e=>patchPoint({title:e.target.value})}/></label>
            {selected.type==='navigation'?<label>Scène de destination<select value={selected.target} onChange={e=>patchPoint({target:e.target.value})}>
              <option value="">Sélectionner…</option>{project.scenes.filter(s=>s.id!==activeId).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
            :<label>Texte affiché<textarea rows={6} value={selected.text} onChange={e=>patchPoint({text:e.target.value})}/></label>}
            <small className="coords">Position : {selected.yaw.toFixed(2)} / {selected.pitch.toFixed(2)} rad</small>
            <button className="delete" onClick={()=>{patchScene(s=>({...s,hotspots:s.hotspots.filter(h=>h.id!==selectedId)}));setSelectedId('');}}>Supprimer ce point</button>
          </>}
        </div>}
      </aside>
    </div>
    <footer><span>NovaVisio Studio · Prototype v0.1</span><span>{project.scenes.length} panoramas · {totalPoints} points</span><span>Stockage local sur cet appareil</span></footer>
    <input ref={upload} hidden type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>void addImages(e.target.files)}/>
    <input ref={projectInput} hidden type="file" accept=".json,.nvstudio.json,application/json" onChange={e=>void openProject(e.target.files?.[0])}/>
    {help&&<div className="overlay" onClick={()=>setHelp(false)}><div className="modal" onClick={e=>e.stopPropagation()}>
      <button className="close" onClick={()=>setHelp(false)}>✕</button><h2>Guide NovaVisio Studio</h2>
      <p><b>1.</b> Importe des panoramas 360° au format équirectangulaire.</p>
      <p><b>2.</b> Choisis « Navigation » ou « Information », puis clique sur l’image pour placer le point.</p>
      <p><b>3.</b> Paramètre son contenu à droite et teste en mode « Prévisualiser ».</p>
      <p><b>4.</b> Tes modifications sont sauvegardées dans ce navigateur. Exporte ton projet pour conserver une copie.</p>
      <p className="warning">Prototype : l’export HTML autonome n’est pas encore disponible. N’efface pas les données du navigateur sans exporter ton projet.</p>
      <button className="primary" onClick={()=>setHelp(false)}>Compris</button>
    </div></div>}
    {info&&<div className="overlay" onClick={()=>setInfo(null)}><div className="modal" onClick={e=>e.stopPropagation()}>
      <button className="close" onClick={()=>setInfo(null)}>✕</button><h2>{info.title}</h2><p className="preserve">{info.text||'Aucun texte renseigné.'}</p>
      <button className="primary" onClick={()=>setInfo(null)}>Fermer</button>
    </div></div>}
  </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
