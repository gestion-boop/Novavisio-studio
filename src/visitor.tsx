import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {createRoot} from 'react-dom/client';
import {Viewer} from '@photo-sphere-viewer/core';
import {MarkersPlugin,type MarkerConfig} from '@photo-sphere-viewer/markers-plugin';
import {frameWorldCorners} from './sphericalFrame';
import {syncMarkers,resetMarkers} from './markerSync';
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';
import {Maximize,Minimize,X,ArrowRight,Globe,Home,Phone,CalendarDays,Info,Images,LayoutGrid,Utensils,MapPin,Menu,Star} from 'lucide-react';
import {defaultBarStyle,defaultFrameCorners,type StudioProject,type Scene,type Hotspot,type BottomBarItem,type CustomIcon} from './storage';
import {imageMarkerHtml,responsiveFrameSize} from './imageFrame';
import {iconStateHtml,IconStateVisual,videoMarkerHtml,VideoPopup} from './media';
import {ContinuousMusic} from './continuousMusic';
import './visitor.css';
import './media.css';

const symbols={home:Home,info:Info,calendar:CalendarDays,map:MapPin,phone:Phone,web:Globe,arrow:ArrowRight,menu:Menu,star:Star,utensils:Utensils,images:Images,grid:LayoutGrid};
function Symbol({name}:{name:string}) {
  const Icon = symbols[name as keyof typeof symbols]??Info;
  return <Icon size={28} strokeWidth={2}/>;
}
function checkedLink(raw:string):string|null {
  try{
    const parsed=new URL(raw.trim());
    return ['https:','http:','tel:','mailto:'].includes(parsed.protocol)?parsed.href:null;
  }catch{return null;}
}
function publicMarker(h:Hotspot,icons:CustomIcon[],height:number,zoom:number):MarkerConfig {
  if(h.type==='image'&&h.imageDataUrl){
    return {id:h.id,imageLayer:h.imageDataUrl,position:frameWorldCorners(h),hoverScale:false};
  }
  const source=h.videoDataUrl||h.videoUrl;
  if(h.type==='video'&&source){
    return {id:h.id,videoLayer:source,position:frameWorldCorners(h),
      autoplay:h.videoAutoplay!==false,hoverScale:false};
  }
  const isMedia=h.type==='image'||h.type==='video';
  const size=isMedia?responsiveFrameSize(h,height,zoom):null;
  const w=size?.width??Math.min(80,Math.max(16,h.iconSize??28));
  const hh=size?.height??w;
  const custom=icons.find(icon=>icon.id===h.iconId);
  const html=h.type==='image'?imageMarkerHtml(undefined,h.frameCorners??defaultFrameCorners(),w,hh,h.title):
    h.type==='video'?videoMarkerHtml(h,w,hh):
    custom?iconStateHtml(icons,h.iconId,h.hoverIconId,h.pressedIconId,'tour-marker'):
    '<span class="tour-marker">'+(h.type==='navigation'?'➜':h.type==='lien'?'↗':'i')+'</span>';
  return {id:h.id,position:{yaw:h.yaw,pitch:h.pitch},size:{width:w,height:hh},
    anchor:'center center',html,tooltip:h.title};
}
type ViewerProps={
  scene:Scene;
  icons:CustomIcon[];
  navigate:(id:string)=>void;
  info:(h:Hotspot)=>void;
  linked:(title:string,url:string)=>void;
  image:(h:Hotspot)=>void;
  video:(h:Hotspot)=>void;
};
function Pano({scene,icons,navigate,info,linked,image,video}:ViewerProps){
  const container=useRef<HTMLDivElement>(null);
  const viewer=useRef<Viewer|null>(null);
  const loadedScene=useRef<string|null>(null);
  const handlers=useRef({scene,icons,navigate,info,linked,image,video});
  handlers.current={scene,icons,navigate,info,linked,image,video};
  useEffect(()=>{
    if(!container.current)return;
    const instance=new Viewer({
      container:container.current,
      panorama:scene.dataUrl,
      navbar:[],defaultZoomLvl:scene.arrivalZoom??60,
      defaultYaw:scene.arrivalYaw??0,defaultPitch:scene.arrivalPitch??0,
      minFov:35,maxFov:75,fisheye:false,loadingTxt:'',
      defaultTransition:{effect:'fade',rotation:false,speed:260},
      plugins:[MarkersPlugin]
    });
    viewer.current=instance;
    loadedScene.current=scene.id;
    const plugin=instance.getPlugin(MarkersPlugin) as MarkersPlugin;
    plugin.addEventListener('select-marker',({marker})=>{
      const a=handlers.current;
      const h=a.scene.hotspots.find(x=>x.id===marker.id);
      if(!h)return;
      if(h.type==='navigation'){if(h.target)a.navigate(h.target);}
      else if(h.type==='image')a.image(h);
      else if(h.type==='video' && h.videoOpenFullscreen!==false)a.video(h);
      else if(h.url && checkedLink(h.url))a.linked(h.title,h.url);
      else if(h.type==='information')a.info(h);
    });
    const refreshMarkers=()=>{
      const viewHeight=container.current?.clientHeight||550;
      const current=handlers.current;
      if(loadedScene.current!==current.scene.id)return;
      syncMarkers(instance,current.scene.hotspots.map(h=>
        publicMarker(h,current.icons,viewHeight,instance.getZoomLevel())));
    };
    refreshMarkers();
    let pending=0;
    instance.addEventListener('zoom-updated',()=>{
      if(pending)cancelAnimationFrame(pending);
      pending=requestAnimationFrame(refreshMarkers);
    });
    // Fullscreen and mobile orientation changes both resize the panorama viewport.
    const observer=new ResizeObserver(refreshMarkers);
    if(container.current)observer.observe(container.current);
    return ()=>{if(pending)cancelAnimationFrame(pending);observer.disconnect();viewer.current=null;loadedScene.current=null;instance.destroy();};
  },[]);
  useEffect(()=>{
    const instance=viewer.current;
    if(!instance||loadedScene.current===scene.id)return;
    const next=scene;
    let disposed=false;
    void instance.setPanorama(next.dataUrl,{
      showLoader:false,transition:{effect:'fade',rotation:false,speed:260},
      position:{yaw:next.arrivalYaw??0,pitch:next.arrivalPitch??0},
      zoom:next.arrivalZoom??60
    }).then(success=>{
      if(disposed||!success)return;
      loadedScene.current=next.id;
      const height=container.current?.clientHeight||550;
      resetMarkers(instance,next.hotspots.map(h=>
        publicMarker(h,handlers.current.icons,height,instance.getZoomLevel())));
    }).catch(()=>{/* Keep previous panorama if the new photo cannot load. */});
    return ()=>{disposed=true;};
  },[scene.id,scene.dataUrl]);
  return <div className="tour-panorama" ref={container}/>;
}
function Tour(){
  const [project]=useState<StudioProject|null>(()=>{
    try{const el=document.getElementById('nv-project-data');return el?JSON.parse(el.textContent??'null'):null;}catch{return null;}
  });
  const [sceneId,setSceneId]=useState(()=>project?.scenes[0]?.id??'');
  const [modal,setModal]=useState<{title:string;url?:string;text?:string}|null>(null);
  const [photo,setPhoto]=useState<Hotspot|null>(null);
  const [video,setVideo]=useState<Hotspot|null>(null);
  const [showIntro,setShowIntro]=useState(()=>Boolean(project?.introEnabled && project.introUrl?.startsWith('https://')));
  const [fullscreen,setFullscreen]=useState(false);
  useEffect(()=>{
    if(!showIntro||!project?.introEnabled||!project.introUrl)return;
    const finish=()=>{setShowIntro(false);setSceneId(project.scenes[0]?.id??'');};
    const timer=window.setTimeout(finish,(project.introDuration??6)*1000);
    const onMessage=(e:MessageEvent)=>{
      try{
        if(e.origin!==new URL(project.introUrl).origin)return;
        const kind=typeof e.data==='string'?e.data:e.data?.type;
        if(['intro:done','intro-finished','novavisio:intro-finished'].includes(kind))finish();
      }catch{}
    };
    window.addEventListener('message',onMessage);
    return ()=>{window.clearTimeout(timer);window.removeEventListener('message',onMessage);};
  },[showIntro,project]);
  const wrap=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const sync=()=>setFullscreen(document.fullscreenElement===wrap.current);
    document.addEventListener('fullscreenchange',sync);
    return ()=>document.removeEventListener('fullscreenchange',sync);
  },[]);
  const theme=project?.barStyle??defaultBarStyle();
  const cssVars={
    '--nv-bar-bg':theme.background,
    '--nv-bar-outline':theme.outline,
    '--nv-button-bg':theme.button,
    '--nv-button-outline':theme.buttonOutline,
    '--nv-icon-color':theme.icon,
    '--nv-bar-border-width':theme.outlineWidth+'px',
    '--nv-button-border-width':theme.buttonOutlineWidth+'px',
    '--nv-bar-roundness':theme.roundness+'px'
  } as CSSProperties;
  if(!project || !Array.isArray(project.scenes)||!project.scenes.length)return <main className="tour-empty">Cette visite ne contient aucun panorama.</main>;
  const current=project.scenes.find(s=>s.id===sceneId)??project.scenes[0];
  const move=(id:string)=>{if(project.scenes.some(s=>s.id===id)){setSceneId(id);setModal(null);setPhoto(null);setVideo(null);}};
  const openLink=(title:string,url:string)=>{
    const checked=checkedLink(url);
    if(!checked)return;
    if(/^https?:\/\//.test(checked))setModal({title,url:checked});
    else window.location.href=checked;
  };
  const information=(h:Hotspot)=>setModal({title:h.title,text:h.text});
  const act=(item:BottomBarItem)=>{
    if(item.type==='navigation'){
      move(item.target||project.scenes[0].id);
    }else if(item.url && checkedLink(item.url)){
      openLink(item.title,item.url);
    }else if(item.type==='information'){
      setModal({title:item.title,text:item.text});
    }
  };
  const toggleFull=async()=>{
    try{
      if(document.fullscreenElement)await document.exitFullscreen();
      else await wrap.current?.requestFullscreen();
    }catch{/* Le navigateur peut interdire le plein écran. */}
  };
  return <main className="tour-app" ref={wrap}>
    <Pano scene={current} icons={project.icons??[]} navigate={move} info={information} linked={openLink} image={h=>setPhoto(h)} video={h=>setVideo(h)}/>
    <button type="button" className="tour-fullscreen" onClick={()=>void toggleFull()} aria-label={fullscreen?'Quitter le plein écran':'Passer en plein écran'}>
      {fullscreen?<Minimize size={21}/>:<Maximize size={21}/>}
    </button>
    {project.bottomBar?.length>0&&<nav className="tour-bottom-bar" style={cssVars} aria-label="Navigation de la visite">
      {project.bottomBar.map(item=>{
        const icon=project.icons?.find(i=>i.id===item.iconId);
        return <button type="button" className={'tour-bar-button '+(icon?'has-custom-png':'')} key={item.id} onClick={()=>act(item)} aria-label={item.title} title={item.title}>
          <span className="tour-bar-icon">{icon?<IconStateVisual icons={project.icons??[]} normal={item.iconId} hover={item.hoverIconId} pressed={item.pressedIconId} size={Math.min(item.iconSize??44,56)}/>:<Symbol name={item.builtinIcon??'info'}/>}</span>
        </button>;
      })}
    </nav>}
    <ContinuousMusic project={project} scene={current} paused={showIntro||!!video}/>
    {video&&<VideoPopup hotspot={video} onClose={()=>setVideo(null)}/>}
    {modal&&<div className="tour-overlay" onClick={()=>setModal(null)}>
      <section className="tour-dialog" onClick={e=>e.stopPropagation()} aria-label={modal.title}>
        <header><h2>{modal.title}</h2><button type="button" aria-label="Fermer" onClick={()=>setModal(null)}><X/></button></header>
        {modal.url?<><iframe src={modal.url} title={modal.title} loading="lazy" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox" referrerPolicy="strict-origin-when-cross-origin" allow="fullscreen"/>
          <p className="tour-embed-note">Si ce contenu ne s'affiche pas, le site externe peut empêcher son intégration.</p></>:
          <p className="tour-dialog-text">{modal.text||'Aucune information renseignée.'}</p>}
      </section>
    </div>}
    {photo?.imageDataUrl&&<div className={'tour-image-viewer '+(photo.fadeOnClick!==false?'fade-in':'')} onClick={()=>setPhoto(null)}>
      <button className="tour-close-image" onClick={()=>setPhoto(null)} type="button" aria-label="Fermer"><X/></button>
      <img src={photo.imageDataUrl} alt={photo.title} onClick={e=>e.stopPropagation()}/>
    </div>}
    {showIntro&&project.introUrl&&<div className="tour-intro">
      <iframe title={'Introduction de '+project.name} src={project.introUrl} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" referrerPolicy="strict-origin-when-cross-origin"/>

    </div>}
  </main>;
}
createRoot(document.getElementById('visitor-root')!).render(<Tour/>);
