import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {createRoot} from 'react-dom/client';
import {Utensils,Images,LayoutGrid,Phone,Info,Home,CalendarDays,MapPin,Globe,ArrowRight,Menu,Star,Maximize,Minimize} from 'lucide-react';
import {Viewer} from '@photo-sphere-viewer/core';
import {MarkersPlugin} from '@photo-sphere-viewer/markers-plugin';
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';
import {loadProject,newProject,readImage,saveProject,uid,validateProject,defaultBar,isSafeIconDataUrl,type Hotspot,type CustomIcon,type BottomBarItem,type Scene,type StudioProject,type BarStyle,defaultBarStyle} from './storage';
import './style.css';

type EditMode = Hotspot['type'] | null;
type PanelTab = 'points' | 'bar' | 'icons';
type EmbedFrame = { title:string; url:string };
const barColorFields:Array<{key:'background'|'outline'|'button'|'buttonOutline'|'icon';label:string}> = [
  {key:'background',label:'Fond de la barre'},
  {key:'outline',label:'Contour de la barre'},
  {key:'button',label:'Fond des boutons'},
  {key:'buttonOutline',label:'Contour des boutons'},
  {key:'icon',label:'Couleur des pictogrammes'}
];
const glyphs = {home:Home,info:Info,calendar:CalendarDays,map:MapPin,phone:Phone,web:Globe,arrow:ArrowRight,menu:Menu,star:Star,utensils:Utensils,images:Images,grid:LayoutGrid};
type GlyphKey = keyof typeof glyphs;
function BarGlyph({name}:{name:string}) {
  const Glyph = glyphs[name as GlyphKey] ?? Info;
  return <Glyph size={29} strokeWidth={1.9} aria-hidden="true" />;
}
function safeLink(raw:string):string|null {
  const link = raw.trim();
  if (!/^(https?:\/\/|mailto:|tel:)/i.test(link)) return null;
  try { const url=new URL(link); return ['https:','http:','mailto:','tel:'].includes(url.protocol)?link:null; }
  catch { return null; }
}
function launchLink(link:string) {
  const verified=safeLink(link);
  if (!verified) return false;
  if (/^https?:/i.test(verified)) window.open(verified,'_blank','noopener,noreferrer');
  else window.location.href=verified;
  return true;
}
type PanoramaProps = {
  scene: Scene; icons: CustomIcon[]; mode: EditMode; preview: boolean;
  onCreate: (yaw:number,pitch:number)=>void;
  onPick: (id:string)=>void;
  onNavigate: (id:string)=>void;
  onInfo: (hotspot:Hotspot)=>void;
  onLink: (title:string,url:string)=>void;
};
function markerFor(h:Hotspot, icons:CustomIcon[]) {
  const icon=icons.find(i=>i.id===h.iconId);
  const sz=Math.max(24,Math.min(120,h.iconSize ?? 46));
  const symbol=h.type==='navigation'?'➜':h.type==='lien'?'↗':'i';
  return {
    id:h.id,position:{yaw:h.yaw,pitch:h.pitch},
    html:icon
      ? '<span class="nv-marker nv-custom"><img src="'+icon.dataUrl+'" alt="" draggable="false"/></span>'
      : '<span class="nv-marker" style="width:100%;height:100%" aria-label="Point interactif">'+symbol+'</span>',
    size:{width:sz,height:sz},anchor:'center center' as const,tooltip:h.title
  };
}
function Panorama({scene,icons,mode,preview,onCreate,onPick,onNavigate,onInfo,onLink}:PanoramaProps) {
  const box = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer|null>(null);
  const actions = useRef({scene,mode,preview,onCreate,onPick,onNavigate,onInfo,onLink});
  actions.current = {scene,mode,preview,onCreate,onPick,onNavigate,onInfo,onLink};

  useEffect(()=>{
    if (!box.current) return;
    const viewer = new Viewer({
      container:box.current, panorama:scene.dataUrl,
      // Le bouton plein écran natif n'agrandit que le lecteur 360° et cache les éléments personnalisés.
      // La vue complète (lecteur + barre) est désormais gérée par App.
      navbar:[], defaultZoomLvl:25,
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
        else if(h.type==='information') {
          if (h.url && safeLink(h.url)) a.onLink(h.title,h.url);
          else a.onInfo(h);
        }
        else if(h.type==='lien' && h.url) a.onLink(h.title,h.url);
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
    markers.setMarkers(scene.hotspots.map(h=>markerFor(h,icons)));
    return ()=>{viewerRef.current=null; viewer.destroy();};
  },[scene.id,scene.dataUrl]);
  useEffect(()=>{
    (viewerRef.current?.getPlugin(MarkersPlugin) as MarkersPlugin | undefined)?.setMarkers(scene.hotspots.map(h=>markerFor(h,icons)));
  },[scene.hotspots,icons]);
  return <div ref={box} className="panorama" />;
}

function App(){
  const [project,setProject]=useState<StudioProject>(newProject());
  const [ready,setReady]=useState(false);
  const [activeId,setActiveId]=useState('');
  const [selectedId,setSelectedId]=useState('');
  const [selectedBarId,setSelectedBarId]=useState('');
  const [panel,setPanel]=useState<PanelTab>('points');
  const [mode,setMode]=useState<EditMode>(null);
  const [preview,setPreview]=useState(false);
  const [status,setStatus]=useState('Initialisation…');
  const [help,setHelp]=useState(false);
  const [info,setInfo]=useState<Hotspot|null>(null);
  const [frame,setFrame]=useState<EmbedFrame|null>(null);
  const upload=useRef<HTMLInputElement>(null);
  const projectInput=useRef<HTMLInputElement>(null);
  const iconInput=useRef<HTMLInputElement>(null);
  const viewAreaRef=useRef<HTMLDivElement>(null);
  const [isFullscreen,setIsFullscreen]=useState(false);
  useEffect(()=>{
    const update=()=>setIsFullscreen(document.fullscreenElement===viewAreaRef.current);
    document.addEventListener('fullscreenchange',update);
    return ()=>document.removeEventListener('fullscreenchange',update);
  },[]);
  async function toggleFullscreen(){
    const node=viewAreaRef.current;
    if(!node)return;
    try {
      if(document.fullscreenElement){
        await document.exitFullscreen();
      }else{
        setPreview(true);
        setMode(null);
        setSelectedId('');
        await node.requestFullscreen();
      }
    }catch{
      setStatus('Le plein écran n’est pas disponible sur ce navigateur');
    }
  }

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
  const selectedBar=project.bottomBar.find(b=>b.id===selectedBarId) ?? null;
  const barCss = {
    '--nv-bar-bg':project.barStyle.background,
    '--nv-bar-outline':project.barStyle.outline,
    '--nv-button-bg':project.barStyle.button,
    '--nv-button-outline':project.barStyle.buttonOutline,
    '--nv-icon-color':project.barStyle.icon,
    '--nv-bar-border-width':project.barStyle.outlineWidth+'px',
    '--nv-button-border-width':project.barStyle.buttonOutlineWidth+'px',
    '--nv-bar-roundness':project.barStyle.roundness+'px'
  } as CSSProperties;
  function changeBarStyle(update:Partial<BarStyle>) {
    setProject(p=>({...p,barStyle:{...p.barStyle,...update}}));
  }
  function openLinkInTour(title:string,raw:string) {
    const link=safeLink(raw);
    if (!link) {setStatus('Lien invalide : utilise https://, tel: ou mailto:');return;}
    setInfo(null);
    if (/^https?:\/\//i.test(link)) setFrame({title,url:link});
    else launchLink(link);
  }
  function patchScene(patch:(s:Scene)=>Scene){
    setProject(p=>({...p,scenes:p.scenes.map(s=>s.id===activeId?patch(s):s)}));
  }
  function patchBar(update:Partial<BottomBarItem>){
    setProject(p=>({...p,bottomBar:p.bottomBar.map(b=>b.id===selectedBarId?{...b,...update}:b)}));
  }
  function addBar(type:BottomBarItem['type']='information'){
    if(project.bottomBar.length>=20){setStatus('20 boutons maximum');return;}
    const newItem:BottomBarItem={id:uid(),title:type==='navigation'?'Nouvelle navigation':type==='lien'?'Nouveau lien':'Nouvelle information',type,target:'',text:'',url:'',builtinIcon:type==='navigation'?'arrow':type==='lien'?'web':'info'};
    setProject(p=>({...p,bottomBar:[...p.bottomBar,newItem]}));setSelectedBarId(newItem.id);setPanel('bar');
  }
  function moveBar(direction:number){
    if(!selectedBarId)return;
    setProject(p=>{
      const items=[...p.bottomBar];const i=items.findIndex(b=>b.id===selectedBarId);const j=i+direction;
      if(i<0||j<0||j>=items.length)return p;
      [items[i],items[j]]=[items[j],items[i]];
      return {...p,bottomBar:items};
    });
  }
  function triggerBar(item:BottomBarItem){
    if(!preview){setSelectedBarId(item.id);setPanel('bar');setSelectedId('');return;}
    if(item.type==='navigation'){
      const dest=item.target || project.scenes[0]?.id;
      if(dest && project.scenes.some(s=>s.id===dest))setActiveId(dest);
    }else if(item.type==='information') {
      if (item.url && safeLink(item.url)) openLinkInTour(item.title,item.url);
      else {setFrame(null);setInfo({id:item.id,type:'information',title:item.title,text:item.text,target:'',yaw:0,pitch:0});}
    }
    else if(item.url)openLinkInTour(item.title,item.url);
  }
  async function addIconFiles(list:FileList|null){
    if(!list?.length)return;
    const incoming:CustomIcon[]=[];
    for(const file of Array.from(list)){
      if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)){setStatus('Format autorisé : PNG, JPG, WebP ou GIF');continue;}
      if(file.size > 1_500_000){setStatus('Icône trop lourde (1,5 Mo maximum)');continue;}
      try {
        const dataUrl=await readImage(file);
        if(!isSafeIconDataUrl(dataUrl))throw new Error('Format de fichier non reconnu');
        incoming.push({id:uid(),name:file.name.replace(/\\.[^/.]+$/,'').slice(0,100),dataUrl});
      }catch{setStatus('Icône non reconnue : '+file.name);}
    }
    if(incoming.length){
      setProject(p=>({...p,icons:[...p.icons,...incoming].slice(0,150)}));
      setStatus(incoming.length+' icône(s) ajoutée(s)');
      if(panel==='points' && selectedId)patchPoint({iconId:incoming[0].id});
      if(panel==='bar' && selectedBarId)patchBar({iconId:incoming[0].id});
    }
    if(iconInput.current)iconInput.current.value='';
  }
  function deleteIcon(id:string){
    if(!window.confirm('Supprimer cette icône de la bibliothèque et de ses utilisations ?'))return;
    setProject(p=>({...p,
      icons:p.icons.filter(i=>i.id!==id),
      scenes:p.scenes.map(s=>({...s,hotspots:s.hotspots.map(h=>h.iconId===id?{...h,iconId:undefined}:h)})),
      bottomBar:p.bottomBar.map(b=>b.iconId===id?{...b,iconId:undefined}:b)
    }));
  }
  function iconSelector(iconId:string|undefined,apply:(value:string|undefined)=>void){
    return <div className="icon-field">
      <div className="icon-choice-row">
        <button type="button" className={!iconId?'icon-choice chosen':'icon-choice'} title="Icône par défaut" onClick={()=>apply(undefined)}>◉</button>
        {project.icons.map(icon=><button key={icon.id} type="button" title={icon.name} className={icon.id===iconId?'icon-choice chosen':'icon-choice'} onClick={()=>apply(icon.id)}>
          <img src={icon.dataUrl} alt={icon.name}/></button>)}
        <button type="button" className="icon-choice icon-upload" title="Importer une icône" onClick={()=>iconInput.current?.click()}>＋</button>
      </div>
      <small className="hint-inline">PNG transparent recommandé · GIF animé accepté</small>
    </div>;
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
    const h:Hotspot={id:uid(),type:mode,title:mode==='navigation'?'Aller vers…':mode==='lien'?'Ouvrir un lien':'Informations',text:'',target:'',yaw,pitch};
    patchScene(s=>({...s,hotspots:[...s.hotspots,h]}));
    setSelectedId(h.id);setPanel('points');setMode(null);
  }
  function removeScene(){
    if(!active||!window.confirm('Supprimer le panorama « '+active.name+' » ?'))return;
    const remaining=project.scenes.filter(s=>s.id!==active.id).map(s=>({...s,hotspots:s.hotspots.filter(h=>h.target!==active.id)}));
    setProject(p=>({...p,scenes:remaining,bottomBar:p.bottomBar.map(b=>b.target===active.id?{...b,target:''}:b)}));setActiveId(remaining[0]?.id??'');setSelectedId('');
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
        <div className="view-area" ref={viewAreaRef}>{active?<Panorama key={active.id} scene={active} icons={project.icons} mode={mode} preview={preview} onCreate={newPoint} onPick={id=>{setSelectedId(id);setSelectedBarId('');setPanel('points');}} onNavigate={id=>{if(project.scenes.some(s=>s.id===id))setActiveId(id);}} onInfo={h=>{setFrame(null);setInfo(h);}} onLink={openLinkInTour}/>:<div className="empty">
          <div className="empty-icon">◎</div><h1>Ta première visite commence ici</h1>
          <p>Importe des photos équirectangulaires 360° pour commencer à créer ta visite interactive.</p>
          <button className="primary" onClick={()=>upload.current?.click()}>＋ Importer mes photos 360°</button><small>JPG, PNG ou WebP · rapport 2:1 recommandé</small>
        </div>}
          {active && <button type="button" className="view-fullscreen-button" onClick={()=>void toggleFullscreen()} title={isFullscreen?'Quitter le plein écran':'Passer en plein écran'} aria-label={isFullscreen?'Quitter le plein écran':'Passer en plein écran'}>
            {isFullscreen?<Minimize size={20} strokeWidth={2.1}/>:<Maximize size={20} strokeWidth={2.1}/>}
          </button>}
          {active && project.bottomBar.length>0 && <nav className="visitor-bottom-bar" aria-label="Barre interactive de la visite" style={barCss}>
            {project.bottomBar.map(item=>{
              const icon=project.icons.find(i=>i.id===item.iconId);
              const isUnavailable=preview && item.type==='lien' && !safeLink(item.url);
              return <button type="button" key={item.id} className={'visitor-bar-button '+(selectedBarId===item.id&&!preview?'is-selected':'')} onClick={()=>triggerBar(item)} disabled={isUnavailable} title={isUnavailable?'Lien à configurer':item.title} aria-label={item.title}>
                <span className="visitor-bar-icon">{icon?<img alt="" src={icon.dataUrl} style={{width:Math.min(item.iconSize??44,56),height:Math.min(item.iconSize??44,56)}}/>:<BarGlyph name={item.builtinIcon??'info'}/>}</span>
                <span className="visitor-bar-label">{item.title}</span>
              </button>;
            })}
          </nav>}
          {frame && <div className="embed-overlay" onClick={()=>setFrame(null)} role="presentation">
            <section className="embed-shell" aria-label={'Contenu intégré : '+frame.title} onClick={event=>event.stopPropagation()}>
              <div className="embed-header">
                <span className="embed-title">{frame.title}</span>
                <div className="embed-actions">
                  <a href={frame.url} target="_blank" rel="noopener noreferrer">Ouvrir à part ↗</a>
                  <button type="button" onClick={()=>setFrame(null)} aria-label="Fermer le contenu intégré">✕</button>
                </div>
              </div>
              <iframe key={frame.url} title={frame.title} src={frame.url}
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                referrerPolicy="strict-origin-when-cross-origin" allow="fullscreen" loading="lazy" />
              <p className="embed-hint">Si le site refuse l'intégration, utilise « Ouvrir à part ».</p>
            </section>
          </div>}
          {info && <div className="overlay info-in-view" onClick={()=>setInfo(null)}>
            <div className="modal" onClick={event=>event.stopPropagation()}>
              <button className="close" onClick={()=>setInfo(null)} aria-label="Fermer">✕</button>
              <h2>{info.title}</h2><p className="preserve">{info.text||'Aucune information renseignée.'}</p>
              <button className="primary" onClick={()=>setInfo(null)}>Fermer</button>
            </div>
          </div>}
        </div>
        {active && !preview && <div className="toolbar">
          <span>OUTILS</span>
          <button className={'tool '+(mode==='navigation'?'selected':'')} onClick={()=>setMode(mode==='navigation'?null:'navigation')}>➜ Navigation</button>
          <button className={'tool '+(mode==='information'?'selected':'')} onClick={()=>setMode(mode==='information'?null:'information')}>ⓘ Information</button>
          <button className={'tool '+(mode==='lien'?'selected':'')} onClick={()=>setMode(mode==='lien'?null:'lien')}>↗ Lien</button>
          <button className="tool" onClick={()=>{setPanel('bar');setMode(null);}}>☷ Barre du bas</button>
          <div className="grow"/><button className="tool danger" onClick={removeScene}>⌫ Supprimer scène</button>
        </div>}
      </main>
      <aside className="right panel">
        <div className="side-tabs" role="tablist" aria-label="Options d'édition">
          <button role="tab" aria-selected={panel==='points'} className={panel==='points'?'active':''} onClick={()=>setPanel('points')}>Points</button>
          <button role="tab" aria-selected={panel==='bar'} className={panel==='bar'?'active':''} onClick={()=>setPanel('bar')}>Barre du bas</button>
          <button role="tab" aria-selected={panel==='icons'} className={panel==='icons'?'active':''} onClick={()=>setPanel('icons')}>Mes icônes</button>
        </div>
        {panel==='points' && <div className="properties">
          <div className="section-title">PANORAMA</div>
          {!active?<div className="hint">Importe un panorama pour configurer des points interactifs.</div>:<>
            <label>Nom de la scène<input value={active.name} onChange={e=>patchScene(sc=>({...sc,name:e.target.value}))}/></label>
            <hr/><div className="section-title">POINTS INTERACTIFS <span className="counter">{active.hotspots.length}</span></div>
            {!selected?<><p className="hint">Choisis Navigation, Information ou Lien sous le panorama, puis clique à l'endroit souhaité.</p>
                {active.hotspots.map(h=><button className="point-row" key={h.id} onClick={()=>setSelectedId(h.id)}><span>{project.icons.find(i=>i.id===h.iconId)?<img className="point-icon-small" src={project.icons.find(i=>i.id===h.iconId)!.dataUrl} alt=""/>:h.type==='navigation'?'➜':h.type==='lien'?'↗':'ⓘ'}</span>{h.title}</button>)}
              </>:<>
                <button className="back" onClick={()=>setSelectedId('')}>← Tous les points</button>
                <div className="tag">{selected.type==='navigation'?'➜ Navigation':selected.type==='lien'?'↗ Lien':'ⓘ Information'}</div>
                <label>Titre<input value={selected.title} onChange={e=>patchPoint({title:e.target.value})}/></label>
                {selected.type==='navigation'?<label>Destination<select value={selected.target} onChange={e=>patchPoint({target:e.target.value})}><option value="">Sélectionner une scène…</option>{project.scenes.filter(sc=>sc.id!==activeId).map(sc=><option key={sc.id} value={sc.id}>{sc.name}</option>)}</select></label>
                  : selected.type==='lien'?<label>Adresse (https://, tel:, mailto:)<input type="text" placeholder="https://exemple.fr" value={selected.url??''} onChange={e=>patchPoint({url:e.target.value})}/></label>
                  :<label>Texte affiché<textarea rows={5} value={selected.text} onChange={e=>patchPoint({text:e.target.value})}/></label>}
                <div className="section-title">ICÔNE PERSONNALISÉE</div>
                {iconSelector(selected.iconId,id=>patchPoint({iconId:id}))}
                <label>Taille de l'icône : {selected.iconSize??46} px<input type="range" min="24" max="120" step="2" value={selected.iconSize??46} onChange={e=>patchPoint({iconSize:Number(e.target.value)})}/></label>
                <small className="coords">Position : {selected.yaw.toFixed(2)} / {selected.pitch.toFixed(2)} rad</small>
                <button className="delete" onClick={()=>{patchScene(sc=>({...sc,hotspots:sc.hotspots.filter(h=>h.id!==selectedId)}));setSelectedId('');}}>Supprimer ce point</button>
              </>}
          </>}
        </div>}
        {panel==='bar' && <div className="properties">
          <div className="section-title">BARRE DE NAVIGATION <span className="counter">{project.bottomBar.length}</span></div>
          <p className="hint">Ces icônes apparaissent en bas de la visite. Clique sur un bouton dans le panorama ou dans la liste pour le modifier.</p>
          <div className="bar-items-list">{project.bottomBar.map(item=><button key={item.id} className={'bar-item-row '+(selectedBarId===item.id?'current':'')} onClick={()=>setSelectedBarId(item.id)}>
            <span className="bar-item-symbol">{project.icons.find(i=>i.id===item.iconId)?<img src={project.icons.find(i=>i.id===item.iconId)!.dataUrl} alt=""/>:<BarGlyph name={item.builtinIcon??'info'}/>}</span>
            <span>{item.title}</span><small>{item.type==='navigation'?'Scène':item.type==='information'?'Info':'Lien'}</small>
          </button>)}</div>
          <button className="import" onClick={()=>addBar('information')}>＋ Ajouter un bouton</button>
          <button className="preset-button" onClick={()=>{if(window.confirm('Remplacer la barre actuelle par le modèle bordeaux à 5 icônes ? Les icônes importées resteront disponibles.')){setProject(p=>({...p,bottomBar:defaultBar()}));setSelectedBarId('');}}}>↻ Appliquer le modèle 5 icônes</button>
          {selectedBar && <>
            <hr/>
            <div className="section-title">CONFIGURER LE BOUTON</div>
            <label>Libellé<input value={selectedBar.title} onChange={e=>patchBar({title:e.target.value})}/></label>
            <label>Action<select value={selectedBar.type} onChange={e=>patchBar({type:e.target.value as BottomBarItem['type']})}>
              <option value="navigation">Aller vers un panorama</option><option value="information">Afficher des informations</option><option value="lien">Ouvrir un lien / réserver / appeler</option>
            </select></label>
            {selectedBar.type==='navigation'?<label>Scène de destination<select value={selectedBar.target} onChange={e=>patchBar({target:e.target.value})}><option value="">Première scène (accueil)</option>{project.scenes.map(sc=><option key={sc.id} value={sc.id}>{sc.name}</option>)}</select></label>
            : selectedBar.type==='information'?<label>Contenu du panneau<textarea rows={5} value={selectedBar.text} onChange={e=>patchBar({text:e.target.value})} placeholder="Horaires, description, informations utiles…"/></label>
            :<label>Lien de destination<input type="text" value={selectedBar.url} placeholder="https://… ou tel:+33…" onChange={e=>patchBar({url:e.target.value})}/>{selectedBar.url && !safeLink(selectedBar.url)&&<small className="warning-inline">Adresse invalide : https://, mailto: ou tel: requis</small>}</label>}
            <div className="section-title">CHOISIR L’ICÔNE</div>
            {iconSelector(selectedBar.iconId,id=>patchBar({iconId:id}))}
            {!selectedBar.iconId && <label>Icône de base<select value={selectedBar.builtinIcon??'info'} onChange={e=>patchBar({builtinIcon:e.target.value})}>
              {Object.keys(glyphs).map(key=><option value={key} key={key}>{key}</option>)}
            </select></label>}
            <label>Taille : {selectedBar.iconSize??32} px<input type="range" min="20" max="72" step="2" value={selectedBar.iconSize??32} onChange={e=>patchBar({iconSize:Number(e.target.value)})}/></label>
            <div className="reorder-row"><button className="tool" onClick={()=>moveBar(-1)}>← Déplacer</button><button className="tool" onClick={()=>moveBar(1)}>Déplacer →</button></div>
            <button className="delete" onClick={()=>{setProject(p=>({...p,bottomBar:p.bottomBar.filter(b=>b.id!==selectedBarId)}));setSelectedBarId('');}}>Supprimer ce bouton</button>
          </>}
        </div>}
        {panel==='icons' && <div className="properties">
          <div className="section-title">BIBLIOTHÈQUE D’ICÔNES <span className="counter">{project.icons.length}</span></div>
          <p className="hint">Ajoute tes propres icônes pour les points 360° et la barre inférieure. Elles sont conservées dans le fichier projet exporté.</p>
          <button className="import" onClick={()=>iconInput.current?.click()}>＋ Importer mes icônes</button>
          <small className="hint-inline">Formats : PNG (transparent), JPG, WebP, GIF animé · 1,5 Mo maximum par fichier.</small>
          <div className="asset-grid">{project.icons.map(icon=><div className="asset-card" key={icon.id}><img src={icon.dataUrl} alt={icon.name}/><span title={icon.name}>{icon.name}</span><button title={'Supprimer '+icon.name} onClick={()=>deleteIcon(icon.id)}>✕</button></div>)}</div>
          {!project.icons.length && <p className="hint">Ta bibliothèque est vide. Les icônes intégrées restent disponibles en attendant.</p>}
        </div>}
      </aside>
    </div>
    <footer><span>NovaVisio Studio · Prototype v0.3</span><span>{project.scenes.length} panoramas · {totalPoints} points</span><span>Stockage local sur cet appareil</span></footer>
    <input ref={upload} hidden type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>void addImages(e.target.files)}/>
    <input ref={projectInput} hidden type="file" accept=".json,.nvstudio.json,application/json" onChange={e=>void openProject(e.target.files?.[0])}/>
    <input ref={iconInput} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={e=>void addIconFiles(e.target.files)}/>
    {help&&<div className="overlay" onClick={()=>setHelp(false)}><div className="modal" onClick={e=>e.stopPropagation()}>
      <button className="close" onClick={()=>setHelp(false)}>✕</button><h2>Guide NovaVisio Studio</h2>
      <p><b>1.</b> Importe des panoramas 360° au format équirectangulaire.</p>
      <p><b>2.</b> Choisis « Navigation » ou « Information », puis clique sur l’image pour placer le point.</p>
      <p><b>3.</b> Dans « Barre du bas », ajoute des boutons et choisis leur action. Dans « Mes icônes », importe tes PNG, WebP ou GIF.</p><p><b>4.</b> Paramètre les points et boutons dans la colonne de droite, puis teste en mode « Prévisualiser ».</p>
      <p><b>5.</b> Tes modifications sont sauvegardées dans ce navigateur. Exporte ton projet pour conserver une copie.</p>
      <p className="warning">Prototype : l’export HTML autonome n’est pas encore disponible. N’efface pas les données du navigateur sans exporter ton projet.</p>
      <button className="primary" onClick={()=>setHelp(false)}>Compris</button>
    </div></div>}
  </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
