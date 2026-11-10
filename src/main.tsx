import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {createRoot} from 'react-dom/client';
import {imageMarkerHtml,responsiveFrameSize,perspectiveMatrix} from './imageFrame';
import {exportStaticTour} from './exportTour';
import {IconStateVisual,iconStateHtml,videoMarkerHtml,SceneAudio,VideoPopup} from './media';
import {Utensils,Images,LayoutGrid,Phone,Info,Home,CalendarDays,MapPin,Globe,ArrowRight,Menu,Star,Maximize,Minimize} from 'lucide-react';
import {Viewer} from '@photo-sphere-viewer/core';
import {MarkersPlugin} from '@photo-sphere-viewer/markers-plugin';
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';
import {loadProject,newProject,readImage,saveProject,uid,validateProject,defaultBar,isSafeIconDataUrl,type Hotspot,type CustomIcon,type BottomBarItem,type Scene,type StudioProject,type BarStyle,defaultBarStyle,defaultFrameCorners,isSafeFrameImage,isSafeVideoData,isSafeAudioData,isSafeMediaUrl,type FrameCorners} from './storage';
import './style.css';

type EditMode = Hotspot['type'] | null;
type PanelTab = 'points' | 'bar' | 'icons' | 'intro';
type EmbedFrame = { title:string; url:string };
function ensureFrameReferences(project:StudioProject,height:number):StudioProject {
  const baseline=Math.max(100,Math.min(3000,height||550));
  return {...project,scenes:project.scenes.map(s=>({...s,hotspots:s.hotspots.map(h=>
    (h.type==='image'||h.type==='video')&&!h.frameReferenceHeight?{...h,frameReferenceHeight:baseline}:h
  )}))};
}

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
  onImage: (h:Hotspot)=>void;
  onVideo: (h:Hotspot)=>void;
  selectedId:string;
  onCornerChange:(id:string,corner:keyof FrameCorners,x:number,y:number)=>void;
};
function markerFor(h:Hotspot,icons:CustomIcon[],viewerHeight:number,selectedId:string,preview:boolean) {
  const isMedia=h.type==='image'||h.type==='video';
  const sz=Math.max(24,Math.min(120,h.iconSize??46));
  const scaled=isMedia?responsiveFrameSize(h,viewerHeight):null;
  const width=scaled?.width??sz;
  const height=scaled?.height??sz;
  const symbol=h.type==='navigation'?'➜':h.type==='lien'?'↗':'i';
  const iconHtml=iconStateHtml(icons,h.iconId,h.hoverIconId,h.pressedIconId);
  return {
    id:h.id,position:{yaw:h.yaw,pitch:h.pitch},
    html:h.type==='image'?imageMarkerHtml(h.imageDataUrl,h.frameCorners??defaultFrameCorners(),width,height,h.title,!preview&&selectedId===h.id):
      h.type==='video'?videoMarkerHtml(h,width,height):
      iconHtml || '<span class="nv-marker" style="width:100%;height:100%" aria-label="Point interactif">'+symbol+'</span>',
    size:{width,height},anchor:'center center' as const,tooltip:h.title
  };
}
function Panorama({scene,icons,mode,preview,onCreate,onPick,onNavigate,onInfo,onLink,onImage,onVideo,selectedId,onCornerChange}:PanoramaProps) {
  const box = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer|null>(null);
  const actions = useRef({scene,icons,mode,preview,onCreate,onPick,onNavigate,onInfo,onLink,onImage,onVideo,selectedId,onCornerChange});
  actions.current = {scene,icons,mode,preview,onCreate,onPick,onNavigate,onInfo,onLink,onImage,onVideo,selectedId,onCornerChange};

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
        else if(h.type==='image') a.onImage(h);
        else if(h.type==='video' && h.videoOpenFullscreen!==false) a.onVideo(h);
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
    const height=box.current?.clientHeight||550;
    markers.setMarkers(scene.hotspots.map(h=>markerFor(h,icons,height,selectedId,preview)));
    return ()=>{viewerRef.current=null; viewer.destroy();};
  },[scene.id,scene.dataUrl]);
  useEffect(()=>{
    const refresh=()=>{
      const element=box.current;
      const p=viewerRef.current?.getPlugin(MarkersPlugin) as MarkersPlugin|undefined;
      if(!element||!p)return;
      const a=actions.current;
      const height=element.clientHeight||550;
      p.setMarkers(a.scene.hotspots.map(h=>markerFor(h,a.icons,height,a.selectedId,a.preview)));
    };
    refresh();
    if(!box.current)return;
    // ResizeObserver fires when the panorama enters or exits fullscreen.
    const observer=new ResizeObserver(refresh);
    observer.observe(box.current);
    return ()=>observer.disconnect();
  },[scene.id,scene.dataUrl]);
  useEffect(()=>{
    const element=box.current;
    const plugin=viewerRef.current?.getPlugin(MarkersPlugin) as MarkersPlugin|undefined;
    if(!element||!plugin)return;
    plugin.setMarkers(scene.hotspots.map(h=>markerFor(h,icons,element.clientHeight||550,selectedId,preview)));
  },[scene.hotspots,icons,selectedId,preview]);
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
  const [imageZoom,setImageZoom]=useState<Hotspot|null>(null);
  const [videoZoom,setVideoZoom]=useState<Hotspot|null>(null);
  const [introVisible,setIntroVisible]=useState(false);
  const [exporting,setExporting]=useState(false);
  const [photoFeedback,setPhotoFeedback]=useState('');
  const videoInput=useRef<HTMLInputElement>(null);
  const audioInput=useRef<HTMLInputElement>(null);
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
        if(project.introEnabled && project.introUrl.startsWith('https://'))setIntroVisible(true);
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
      if (p) {
        const upgraded=ensureFrameReferences(validateProject(p),viewAreaRef.current?.clientHeight||550);
        setProject(upgraded);setActiveId(upgraded.scenes[0]?.id ?? '');
      }
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
  async function exportTour(){
    if(!project.scenes.length){setStatus('Importe au moins un panorama avant de publier');return;}
    setExporting(true);
    setStatus('Préparation du dossier HTML…');
    try {
      await exportStaticTour(project);
      setStatus('Dossier HTML prêt — archive ZIP téléchargée');
    }catch(err){setStatus('Échec de l’export : '+(err instanceof Error?err.message:String(err)));}
    finally{setExporting(false);}
  }
  async function addVideo(file?:File){
    if(!file||!selectedId)return;
    if(!['video/mp4','video/webm'].includes(file.type)||file.size>22*1024*1024){
      setStatus('Vidéo : MP4/WebM, 22 Mo maximum pour ce prototype');return;
    }
    try{
      const data=await readImage(file);
      if(!isSafeVideoData(data))throw Error('Fichier vidéo incompatible');
      patchPoint({videoDataUrl:data,videoUrl:''});
      setStatus('Vidéo ajoutée à l’écran');
    }catch{setStatus('Impossible de lire la vidéo');}
    if(videoInput.current)videoInput.current.value='';
  }
  async function addAudio(file?:File){
    if(!file||!activeId)return;
    if(!['audio/mpeg','audio/mp3','audio/ogg','audio/wav','audio/x-wav','audio/webm','audio/mp4'].includes(file.type)||
      file.size>14*1024*1024){setStatus('Audio : MP3, WAV, OGG ou WebM · 14 Mo maximum');return;}
    try{
      const data=await readImage(file);
      if(!isSafeAudioData(data))throw Error('Fichier audio incompatible');
      patchScene(sc=>({...sc,audioDataUrl:data,audioUrl:'',audioEnabled:true}));
      setStatus('Ambiance sonore assignée à ce panorama');
    }catch{setStatus('Impossible de lire ce son');}
    if(audioInput.current)audioInput.current.value='';
  }
  async function addFrameImage(file?:File){
    if(!file)return;
    const sceneId=activeId,hotspotId=selectedId;
    if(!sceneId||!hotspotId){setPhotoFeedback('Sélectionne un cadre photo avant d’importer une image.');return;}
    setPhotoFeedback('Import de la photo…');
    if(file.size>40*1024*1024){
      setPhotoFeedback('Photo trop volumineuse (40 Mo maximum).');
      return;
    }
    try {
      // Utilise le décodage natif du navigateur : accepte aussi les HEIC/HEIF
      // lorsque le navigateur les décode. Limite la taille pour une sauvegarde fiable.
      const imageUrl=URL.createObjectURL(file);
      let img:HTMLImageElement;
      try {
        img=new Image();
        img.decoding='async';
        await new Promise<void>((resolve,reject)=>{
          img.onload=()=>resolve();
          img.onerror=()=>reject(new Error('Image incompatible avec ce navigateur. Utilise JPG, PNG ou WebP.'));
          img.src=imageUrl;
        });
      } finally {URL.revokeObjectURL(imageUrl);}
      if(!img.naturalWidth||!img.naturalHeight)throw Error('Dimensions d’image incorrectes');
      const scale=Math.min(1,2560/Math.max(img.naturalWidth,img.naturalHeight));
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
      canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
      const ctx=canvas.getContext('2d');
      if(!ctx)throw Error('Conversion de la photo non disponible');
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      // WebP préserve les transparences des PNG et réduit sensiblement le poids du projet.
      let data=canvas.toDataURL('image/webp',0.88);
      if(!isSafeFrameImage(data)||data.length>12_000_000){
        data=canvas.toDataURL('image/jpeg',0.78);
      }
      if(!isSafeFrameImage(data)||data.length>12_000_000)throw Error('Image trop lourde après conversion. Réduis sa résolution.');
      setProject(p=>({...p,scenes:p.scenes.map(sc=>sc.id!==sceneId?sc:{
        ...sc,hotspots:sc.hotspots.map(h=>h.id===hotspotId?{...h,imageDataUrl:data}:h)
      })}));
      setPhotoFeedback('Photo intégrée dans le cadre.');
      setStatus('Photo ajoutée au panorama');
    }catch(e){
      const message=e instanceof Error?e.message:'Impossible de lire cette photo.';
      setPhotoFeedback(message);
      setStatus('Import photo : '+message);
    }
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
    const h:Hotspot={
      id:uid(),type:mode,title:mode==='navigation'?'Aller vers…':mode==='lien'?'Ouvrir un lien':mode==='image'?'Cadre photo':mode==='video'?'Écran vidéo':'Informations',
      text:'',target:'',yaw,pitch,
      ...(['image','video'].includes(mode)?{frameWidth:320,frameHeight:200,frameReferenceHeight:Math.max(100,viewAreaRef.current?.clientHeight||550),frameCorners:defaultFrameCorners(),fadeOnClick:true}:{}),
      ...(mode==='video'?{videoAutoplay:true,videoLoop:true,videoOpenFullscreen:true}:{})
    };
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
      const imported=ensureFrameReferences(validateProject(JSON.parse(await file.text())),viewAreaRef.current?.clientHeight||550);
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
        <button className="quiet" onClick={download}>Sauvegarder le projet</button>
        <button className="primary" disabled={exporting} onClick={()=>void exportTour()}>{exporting?'Export…':'Exporter HTML / ZIP'}</button>
        <button className={preview?'primary':'outline'} onClick={()=>{if(!preview && project.introEnabled && project.introUrl.startsWith('https://'))setIntroVisible(true);else setIntroVisible(false);setPreview(p=>!p);setMode(null);setSelectedId('');}}>{preview?'Quitter l’aperçu':'Prévisualiser'}</button>
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
        <div className="view-area" ref={viewAreaRef}>{active?<Panorama key={active.id} scene={active} icons={project.icons} mode={mode} preview={preview} onCreate={newPoint} onPick={id=>{setSelectedId(id);setSelectedBarId('');setPanel('points');}} onNavigate={id=>{if(project.scenes.some(s=>s.id===id))setActiveId(id);}} onInfo={h=>{setFrame(null);setInfo(h);}} onLink={openLinkInTour} onImage={h=>{setImageZoom(h);setInfo(null);setFrame(null);}} onVideo={h=>{setVideoZoom(h);setInfo(null);setFrame(null);}}/>:<div className="empty">
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
              return <button type="button" key={item.id} className={'visitor-bar-button '+(icon?'has-custom-png ':'')+(selectedBarId===item.id&&!preview?'is-selected':'')} onClick={()=>triggerBar(item)} disabled={isUnavailable} title={isUnavailable?'Lien à configurer':item.title} aria-label={item.title}>
                <span className="visitor-bar-icon">{icon?<IconStateVisual icons={project.icons} normal={item.iconId} hover={item.hoverIconId} pressed={item.pressedIconId} size={Math.min(item.iconSize??44,56)}/>:<BarGlyph name={item.builtinIcon??'info'}/>}</span>
                <span className="visitor-bar-label">{item.title}</span>
              </button>;
            })}
          </nav>}
          {introVisible && project.introEnabled && project.introUrl && <div className="intro-overlay">
            <iframe title="Introduction de la visite" src={project.introUrl} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" referrerPolicy="strict-origin-when-cross-origin"/>
            <div className="intro-bottom-actions">
              <button type="button" className="intro-enter" onClick={()=>setIntroVisible(false)}>Entrer dans la visite <span aria-hidden="true">→</span></button>
            </div>
          </div>}
          {videoZoom && <VideoPopup hotspot={videoZoom} onClose={()=>setVideoZoom(null)}/>}
          {active && preview && <SceneAudio key={active.id} scene={active} paused={!!videoZoom||introVisible||!!frame||!!info||!!imageZoom}/>}
          {imageZoom?.imageDataUrl && <div className={'image-lightbox '+(imageZoom.fadeOnClick!==false?'with-fade':'')} onClick={()=>setImageZoom(null)}>
            <button type="button" aria-label="Fermer l'image" className="lightbox-close" onClick={()=>setImageZoom(null)}>✕</button>
            <img src={imageZoom.imageDataUrl} alt={imageZoom.title} onClick={e=>e.stopPropagation()}/>
          </div>}
          {frame && <div className="embed-overlay" onClick={()=>setFrame(null)} role="presentation">
            <section className="embed-shell" aria-label={'Contenu intégré : '+frame.title} onClick={event=>event.stopPropagation()}>
              <div className="embed-header">
                <span className="embed-title">{frame.title}</span>
                <div className="embed-actions">
                  
                  <button type="button" onClick={()=>setFrame(null)} aria-label="Fermer le contenu intégré">✕</button>
                </div>
              </div>
              <iframe key={frame.url} title={frame.title} src={frame.url}
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                referrerPolicy="strict-origin-when-cross-origin" allow="fullscreen" loading="lazy" />
              <p className="embed-hint">Certains sites externes n'autorisent pas leur affichage dans une iframe.</p>
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
          <button className={'tool '+(mode==='image'?'selected':'')} onClick={()=>setMode(mode==='image'?null:'image')}>▣ Cadre photo</button>
          <button className={'tool '+(mode==='video'?'selected':'')} onClick={()=>setMode(mode==='video'?null:'video')}>▶ Écran vidéo</button>
          <button className="tool" onClick={()=>{setPanel('bar');setMode(null);}}>☷ Barre du bas</button>
          <div className="grow"/><button className="tool danger" onClick={removeScene}>⌫ Supprimer scène</button>
        </div>}
      </main>
      <aside className="right panel">
        <div className="side-tabs" role="tablist" aria-label="Options d'édition">
          <button role="tab" aria-selected={panel==='points'} className={panel==='points'?'active':''} onClick={()=>setPanel('points')}>Points</button>
          <button role="tab" aria-selected={panel==='bar'} className={panel==='bar'?'active':''} onClick={()=>setPanel('bar')}>Barre du bas</button>
          <button role="tab" aria-selected={panel==='icons'} className={panel==='icons'?'active':''} onClick={()=>setPanel('icons')}>Mes icônes</button>
          <button role="tab" aria-selected={panel==='intro'} className={panel==='intro'?'active':''} onClick={()=>setPanel('intro')}>Intro</button>
        </div>
        {panel==='points' && <div className="properties">
          <div className="section-title">PANORAMA</div>
          {!active?<div className="hint">Importe un panorama pour configurer des points interactifs.</div>:<>
            <label>Nom de la scène<input value={active.name} onChange={e=>patchScene(sc=>({...sc,name:e.target.value}))}/></label>
            <div className="scene-audio-settings">
              <div className="section-title">AMBIANCE SONORE DE CETTE SCÈNE</div>
              <button type="button" className="import" onClick={()=>audioInput.current?.click()}>{active.audioDataUrl?'Remplacer le son':'＋ Importer un fichier audio'}</button>
              <label>Ou adresse HTTPS du son<input type="url" placeholder="https://…/musique.mp3" value={active.audioUrl??''}
                onChange={e=>patchScene(sc=>({...sc,audioUrl:e.target.value,audioDataUrl:undefined}))}/></label>
              {active.audioUrl && !isSafeMediaUrl(active.audioUrl)&&<small className="warning-inline">Indique une URL HTTPS valide.</small>}
              <label className="toggle-row"><input type="checkbox" checked={active.audioEnabled??Boolean(active.audioDataUrl||active.audioUrl)}
                onChange={e=>patchScene(sc=>({...sc,audioEnabled:e.target.checked}))}/> Lecture de la bande sonore à l’entrée dans la scène</label>
              <label className="toggle-row"><input type="checkbox" checked={active.audioLoop!==false}
                onChange={e=>patchScene(sc=>({...sc,audioLoop:e.target.checked}))}/> Lire en boucle</label>
              <label>Volume du son : {active.audioVolume??65} %
                <input type="range" min="0" max="100" value={active.audioVolume??65}
                  onChange={e=>patchScene(sc=>({...sc,audioVolume:Number(e.target.value)}))}/></label>
              {(active.audioDataUrl||active.audioUrl)&&<button type="button" className="style-reset" onClick={()=>patchScene(sc=>({...sc,audioUrl:'',audioDataUrl:undefined,audioEnabled:false}))}>Supprimer la bande sonore</button>}
              <small className="hint-inline">Le son est associé à ce panorama. Certains navigateurs imposent un clic pour activer l’audio.</small>
            </div>
            <hr/><div className="section-title">POINTS INTERACTIFS <span className="counter">{active.hotspots.length}</span></div>
            {!selected?<><p className="hint">Choisis Navigation, Information, Lien, Cadre photo ou Écran vidéo sous le panorama, puis clique sur l’image 360°.</p>
                {active.hotspots.map(h=><button className="point-row" key={h.id} onClick={()=>setSelectedId(h.id)}><span>{project.icons.find(i=>i.id===h.iconId)?<img className="point-icon-small" src={project.icons.find(i=>i.id===h.iconId)!.dataUrl} alt=""/>:h.type==='navigation'?'➜':h.type==='lien'?'↗':h.type==='image'?'▣':h.type==='video'?'▶':'ⓘ'}</span>{h.title}</button>)}
              </>:<>
                <button className="back" onClick={()=>setSelectedId('')}>← Tous les points</button>
                <div className="tag">{selected.type==='navigation'?'➜ Navigation':selected.type==='lien'?'↗ Lien':selected.type==='image'?'▣ Cadre photo':selected.type==='video'?'▶ Écran vidéo':'ⓘ Information'}</div>
                <label>Titre<input value={selected.title} onChange={e=>patchPoint({title:e.target.value})}/></label>
                {selected.type==='image'?
                <>
                  <label className="photo-upload-dropzone" onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add('drag-hover');}}
                    onDragLeave={e=>{e.currentTarget.classList.remove('drag-hover');}}
                    onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove('drag-hover');void addFrameImage(e.dataTransfer.files[0]);}}>
                    <span className="photo-upload-icon">＋</span>
                    <strong>{selected.imageDataUrl?'Changer la photo du cadre':'Choisir une photo'}</strong>
                    <span>Cliquer ici ou déposer une photo dans ce cadre</span>
                    <input type="file" accept="image/*,.heic,.heif" onChange={e=>{const file=e.currentTarget.files?.[0];if(file)void addFrameImage(file);e.currentTarget.value='';}}/>
                  </label>
                  <small className="hint-inline">JPG, PNG, WebP (HEIC selon navigateur) · 40 Mo maximum, optimisé automatiquement</small>
                  {photoFeedback&&<div role="status" className="photo-feedback">{photoFeedback}</div>}
                  {selected.imageDataUrl&&<img className="photo-preview-uploaded" src={selected.imageDataUrl} alt="Photo intégrée au cadre"/>}
                  {selected.imageDataUrl&&<CornerEditor image={selected.imageDataUrl} width={selected.frameWidth??320} height={selected.frameHeight??200} corners={selected.frameCorners??defaultFrameCorners()} onChange={(v:FrameCorners)=>patchPoint({frameCorners:v})}/>}
                  <label>Largeur du cadre : {selected.frameWidth??320} px
                    <input type="range" min="80" max="900" step="10" value={selected.frameWidth??320} onChange={e=>patchPoint({frameWidth:Number(e.target.value)})}/>
                  </label>
                  <label>Hauteur du cadre : {selected.frameHeight??200} px
                    <input type="range" min="60" max="700" step="10" value={selected.frameHeight??200} onChange={e=>patchPoint({frameHeight:Number(e.target.value)})}/>
                  </label>
                  <label className="toggle-row"><input type="checkbox" checked={selected.fadeOnClick??true} onChange={e=>patchPoint({fadeOnClick:e.target.checked})}/> Agrandir en fondu au clic</label>
                  <button className="style-reset" type="button" onClick={()=>patchPoint({frameCorners:defaultFrameCorners()})}>Réinitialiser les 4 coins</button>
                </>
                :selected.type==='video'?<>
                  <button type="button" className="import" onClick={()=>videoInput.current?.click()}>{selected.videoDataUrl?'Remplacer la vidéo':'＋ Importer une vidéo MP4 / WebM'}</button>
                  <small className="hint-inline">22 Mo maximum dans ce prototype ; pour une vidéo longue, utilise une URL HTTPS.</small>
                  <label>Ou URL HTTPS de la vidéo<input type="url" placeholder="https://…/video.mp4" value={selected.videoUrl??''}
                    onChange={e=>patchPoint({videoUrl:e.target.value,videoDataUrl:undefined})}/></label>
                  {selected.videoUrl && !isSafeMediaUrl(selected.videoUrl)&&<small className="warning-inline">Adresse HTTPS invalide.</small>}
                  {(selected.videoDataUrl||selected.videoUrl)&&<video className="editor-video-preview" src={selected.videoDataUrl||selected.videoUrl} controls muted playsInline/>}
                  <div className="section-title">ADAPTER L'ÉCRAN À LA PERSPECTIVE</div>
                  <CornerEditor width={selected.frameWidth??320} height={selected.frameHeight??200} corners={selected.frameCorners??defaultFrameCorners()}
                    onChange={v=>patchPoint({frameCorners:v})}/>
                  <label>Largeur : {selected.frameWidth??320} px
                    <input type="range" min="80" max="900" step="10" value={selected.frameWidth??320} onChange={e=>patchPoint({frameWidth:Number(e.target.value)})}/></label>
                  <label>Hauteur : {selected.frameHeight??200} px
                    <input type="range" min="60" max="700" step="10" value={selected.frameHeight??200} onChange={e=>patchPoint({frameHeight:Number(e.target.value)})}/></label>
                  <label className="toggle-row"><input type="checkbox" checked={selected.videoAutoplay!==false} onChange={e=>patchPoint({videoAutoplay:e.target.checked})}/> Démarrer automatiquement, sans son, à l’arrivée</label>
                  <label className="toggle-row"><input type="checkbox" checked={selected.videoLoop!==false} onChange={e=>patchPoint({videoLoop:e.target.checked})}/> Répéter la vidéo</label>
                  <label className="toggle-row"><input type="checkbox" checked={selected.videoOpenFullscreen!==false} onChange={e=>patchPoint({videoOpenFullscreen:e.target.checked})}/> Clic sur l’écran → vidéo agrandie avec son</label>
                  <button className="style-reset" type="button" onClick={()=>patchPoint({frameCorners:defaultFrameCorners()})}>Réinitialiser les 4 coins</button>
                </>
                :selected.type==='navigation'?<label>Destination<select value={selected.target} onChange={e=>patchPoint({target:e.target.value})}><option value="">Sélectionner une scène…</option>{project.scenes.filter(sc=>sc.id!==activeId).map(sc=><option key={sc.id} value={sc.id}>{sc.name}</option>)}</select></label>
                  : selected.type==='lien'?<label>Adresse (https://, tel:, mailto:)<input type="text" placeholder="https://exemple.fr" value={selected.url??''} onChange={e=>patchPoint({url:e.target.value})}/></label>
                  :<><label>Texte affiché<textarea rows={5} value={selected.text} onChange={e=>patchPoint({text:e.target.value})}/></label>
                    <label>Page web intégrée (optionnel)<input type="text" placeholder="https://… menu, catalogue, galerie" value={selected.url??''} onChange={e=>patchPoint({url:e.target.value})}/></label>
                    <small className="hint-inline">Si une adresse est renseignée, elle s'ouvre dans la visite à la place du texte.</small></>}
                {!['image','video'].includes(selected.type) && <>
                  <div className="section-title">ICÔNE PNG — ÉTATS INTERACTIFS</div>
                  <label>PNG normal (sans déformation ni changement de fond)</label>
                  {iconSelector(selected.iconId,id=>patchPoint({iconId:id}))}
                  <label>PNG au survol (optionnel)</label>
                  {iconSelector(selected.hoverIconId,id=>patchPoint({hoverIconId:id}))}
                  <label>PNG lors du clic (optionnel)</label>
                  {iconSelector(selected.pressedIconId,id=>patchPoint({pressedIconId:id}))}
                  <small className="hint-inline">Tu peux fournir trois fichiers PNG distincts. Sans variante, l'original est conservé avec un effet de survol léger.</small>
                </>}
                {!['image','video'].includes(selected.type) && <label>Taille de l'icône : {selected.iconSize??46} px<input type="range" min="24" max="120" step="2" value={selected.iconSize??46} onChange={e=>patchPoint({iconSize:Number(e.target.value)})}/></label>}
                <small className="coords">Position : {selected.yaw.toFixed(2)} / {selected.pitch.toFixed(2)} rad</small>
                <button className="delete" onClick={()=>{patchScene(sc=>({...sc,hotspots:sc.hotspots.filter(h=>h.id!==selectedId)}));setSelectedId('');}}>Supprimer ce point</button>
              </>}
          </>}
        </div>}
        {panel==='bar' && <div className="properties">
          <div className="section-title">BARRE DE NAVIGATION <span className="counter">{project.bottomBar.length}</span></div>
          <p className="hint">Ces icônes apparaissent en bas de la visite. Clique sur un bouton dans le panorama ou dans la liste pour le modifier.</p>
          <div className="style-settings">
            <div className="section-title">COULEURS ET CONTOURS</div>
            <div className="style-colors">
              {barColorFields.map(field=><label className="style-color-field" key={field.key}>
                <span>{field.label}</span>
                <span className="style-picker"><input type="color" value={project.barStyle[field.key]} aria-label={field.label} onChange={e=>changeBarStyle({[field.key]:e.target.value})}/><small>{project.barStyle[field.key]}</small></span>
              </label>)}
            </div>
            <label>Épaisseur du contour de la barre : {project.barStyle.outlineWidth} px
              <input type="range" min="0" max="8" step="1" value={project.barStyle.outlineWidth} onChange={e=>changeBarStyle({outlineWidth:Number(e.target.value)})}/></label>
            <label>Épaisseur du contour des boutons : {project.barStyle.buttonOutlineWidth} px
              <input type="range" min="0" max="8" step="1" value={project.barStyle.buttonOutlineWidth} onChange={e=>changeBarStyle({buttonOutlineWidth:Number(e.target.value)})}/></label>
            <label>Arrondi de la barre : {project.barStyle.roundness} px
              <input type="range" min="0" max="60" step="1" value={project.barStyle.roundness} onChange={e=>changeBarStyle({roundness:Number(e.target.value)})}/></label>
            <button type="button" className="style-reset" onClick={()=>changeBarStyle(defaultBarStyle())}>Restaurer les couleurs bordeaux et argent</button>
          </div>
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
            : selectedBar.type==='information'?<><label>Contenu du panneau<textarea rows={5} value={selectedBar.text} onChange={e=>patchBar({text:e.target.value})} placeholder="Horaires, description, informations utiles…"/></label>
              <label>Page intégrée (optionnel)<input type="text" value={selectedBar.url} placeholder="https://… menu, photos, réservations" onChange={e=>patchBar({url:e.target.value})}/></label>
              <small className="hint-inline">Si tu renseignes une URL, elle remplacera le texte par une fenêtre intégrée.</small></>
            :<label>Lien de destination<input type="text" value={selectedBar.url} placeholder="https://… ou tel:+33…" onChange={e=>patchBar({url:e.target.value})}/>{selectedBar.url && !safeLink(selectedBar.url)&&<small className="warning-inline">Adresse invalide : https://, mailto: ou tel: requis</small>}</label>}
            <div className="section-title">MES PNG — NORMAL, SURVOL, CLIC</div>
            <label>PNG normal</label>
            {iconSelector(selectedBar.iconId,id=>patchBar({iconId:id}))}
            <label>PNG au survol</label>
            {iconSelector(selectedBar.hoverIconId,id=>patchBar({hoverIconId:id}))}
            <label>PNG au clic</label>
            {iconSelector(selectedBar.pressedIconId,id=>patchBar({pressedIconId:id}))}
            {!selectedBar.iconId && <label>Icône de base<select value={selectedBar.builtinIcon??'info'} onChange={e=>patchBar({builtinIcon:e.target.value})}>
              {Object.keys(glyphs).map(key=><option value={key} key={key}>{key}</option>)}
            </select></label>}
            <label>Taille : {selectedBar.iconSize??32} px<input type="range" min="20" max="72" step="2" value={selectedBar.iconSize??32} onChange={e=>patchBar({iconSize:Number(e.target.value)})}/></label>
            <div className="reorder-row"><button className="tool" onClick={()=>moveBar(-1)}>← Déplacer</button><button className="tool" onClick={()=>moveBar(1)}>Déplacer →</button></div>
            <button className="delete" onClick={()=>{setProject(p=>({...p,bottomBar:p.bottomBar.filter(b=>b.id!==selectedBarId)}));setSelectedBarId('');}}>Supprimer ce bouton</button>
          </>}
        </div>}
        {panel==='intro' && <div className="properties">
          <div className="section-title">INTRODUCTION DE LA VISITE</div>
          <p className="hint">Chaque visite possède son URL d’introduction. Le splash screen s’affiche au lancement et le bouton « Entrer dans la visite » donne accès au panorama.</p>
          <label className="toggle-row"><input type="checkbox" checked={project.introEnabled} onChange={e=>setProject(p=>({...p,introEnabled:e.target.checked}))}/> Activer l’introduction</label>
          <label>Adresse HTTPS de l'introduction
            <input type="url" value={project.introUrl} placeholder="https://intro-au-bureau-narbonne.vercel.app/" onChange={e=>setProject(p=>({...p,introUrl:e.target.value}))}/>
          </label>
          <small className="hint-inline">Exemple : intro-au-bureau-narbonne.vercel.app. Renseigne une URL différente pour chaque projet.</small>
          <button type="button" className="import" onClick={()=>{if(project.introUrl.startsWith('https://')){setPreview(true);setIntroVisible(true);}else setStatus('Renseigne d’abord une URL HTTPS valide');}}>Tester l’introduction</button>
          <p className="hint">Dans le dossier HTML exporté, cette introduction sera présentée avant l’entrée dans la visite.</p>
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
    <footer><span>NovaVisio Studio · Prototype v0.6</span><span>{project.scenes.length} panoramas · {totalPoints} points</span><span>Stockage local sur cet appareil</span></footer>
    <input ref={upload} hidden type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>void addImages(e.target.files)}/>
    <input ref={projectInput} hidden type="file" accept=".json,.nvstudio.json,application/json" onChange={e=>void openProject(e.target.files?.[0])}/>
    <input ref={iconInput} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={e=>void addIconFiles(e.target.files)}/>
    <input ref={videoInput} hidden type="file" accept="video/mp4,video/webm" onChange={e=>void addVideo(e.target.files?.[0])}/>
    <input ref={audioInput} hidden type="file" accept="audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/x-wav,audio/webm,audio/mp4" onChange={e=>void addAudio(e.target.files?.[0])}/>
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
