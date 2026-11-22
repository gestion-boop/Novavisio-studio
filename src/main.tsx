import {barUsesIconImage} from './storage';
import {confirmAsk,ConfirmHost} from './confirmDialog';
import {PanoramaPreviewEditor} from './PanoramaPreviewEditor';
import {overlayClose} from './overlayClose';
import {FloorPlanEditor,FloorPlanDialog} from './FloorPlan';
import {MediaIconSelector} from './MediaIconSettings';
import {BarSmartCard,barKind,recommendedType} from './BarSmartCard';
import {InformationEditor,informationFont} from './InformationEditor';
import {EmbeddedPage} from './EmbeddedPage';
import {SpaceCover} from './SpaceCover';
import {BarGalleryEditor,type BarGalleryTab} from './BarGalleryEditor';
import './workflow.css';
import {CreationToolbar} from './CreationToolbar';
import {reorderItems,useGripSort} from './gripSort';
import {useHorizontalSort} from './hSort';
import {isPopupMedia,MediaDisplayControl} from './mediaDisplay';
import './creation.css';
import {ProjectPreparation} from './ProjectPreparation';
import {SkinLibrary} from './SkinLibrary';
import {cloudListSkins} from './cloudSkins';
import {applySkin} from './skins';
import {BarDimensions,InspectorSection} from './PreparationControls';
import './preparation.css';
import {PhotoFramePicker} from './photoFrame';
declare const __NV_BUILD_TIME__:string;

import {useCallback, useEffect, useMemo, useRef, useState, type CSSProperties,type ComponentType,type ReactNode} from 'react';
import {flushSync} from 'react-dom';
import {createRoot} from 'react-dom/client';
import {ErrorBoundary,installErrorLog} from './ErrorBoundary';
import {glyphs} from './glyphSet';
import {BrandKitDialog} from './BrandKitDialog';
import {NovaStudioAIAssistant} from './NovaStudioAIAssistant';
import {NativeIntro} from './nativeIntro';
import {InterestDialog} from './InterestDialog';
import {ProjectSummaryDialog} from './ProjectSummaryDialog';
import {urlForSuggestion,type Suggestion as InterestSuggestion} from './interestPoints';
import {BRAND_ICON_SET} from './brandIconSet';
import {INTRO_STYLES,INTRO_ANIMATIONS,INTRO_LOGO_SHAPES,INTRO_DEFAULT_COLORS,introWelcomeColor,INTRO_LIMITS,DEFAULT_INTRO_DESIGN,type IntroDesign} from './introDesign';
import {EditMode,PanelTab,EmbedFrame,ensureFrameReferences,barColorFields,VISIT_MOTIFS,BarGlyph,safeLink,launchLink,startSceneId,FullscreenGalleryHoverPreview,Panorama} from './EditorPanorama';
import {FrameLoupe} from './FrameLoupe';
import {exportStaticTour} from './exportTour';
import {useLiveSession,LiveOverlay,useLiveInvites,sendLiveInvite,sendLiveShot} from './liveSession';
import {LiveShareDialog} from './LiveShareDialog';
import {WriteHand} from './WriteHand';
import {scenesInSpace,plansInSpace,updatePlansInSpace,projectForSpaceExport,stripExcluded,safeSpaceName,type StudioSpace} from './spaces';
import {IconStateVisual,VideoPopup,ZoomImage,type ZoomOrigin} from './media';
import {ContinuousMusic} from './continuousMusic';
import {settingsGlyphs} from './settingsGlyph';
import {GlossyPackMaker,BAR_CHOICES} from './GlossyPackMaker';
import {harmonizeWithBar} from './glossyThemes';
import {VrMenuEditor} from './VrMenuEditor';
import {SceneRoomNameOptions,SpaceRoomNameOptions} from './RoomNameOptions';
import {glossyBarPacks,glyphPng} from './barGlossy';
import {glossyIconStates} from './glossyIcon';
import {autoIconZoom} from './iconFit';
import {MediaLibraryPanel} from './MediaLibraryPanel';
import {PhotoGallery} from './PhotoGallery';
import {resolveLink} from './mediaLinks';
import {settingsButtonBarStyle,settingsSize} from './settingsButton';
import {useEffectiveBarTheme,popupThemeVars} from './barImageTheme';
import {useVisitorPrefs,setSound,setLang,effectiveLang} from './visitorPrefs';
import {ui,pick} from './i18n';
import {SunFlareEditor} from './SunFlareEditor';
const SunGlyph=({size=24}:{size?:number})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></svg>
import {panoramaArrivalZoom} from './panoramaLens';
import {CloudPanel} from './CloudPanel';
import {ClientPanel,type ClientLink} from './ClientPanel';
import {ClientsDirectory} from './ClientsDirectory';
import type {ImportedClientVideo} from './novagenVideos';
import {useCloudSync,type SyncState} from './cloudSync';
import {cloudConfigured,supabase,confirmEmailLink,readLink,writeLink,listCloudProjects,getWriteState,openCloudProject,type CloudLink} from './cloud';
import {autoPublishOn,refreshActivePublication,publishPermanent,getPublication,publicationActive,shareUrl,wrapperHtml} from './share';
import {readSpaceCloudLink,writeSpaceCloudLink} from './spaces';
import {SharePanel} from './SharePanel';
import {PrivatePanel} from './PrivatePanel';
import {PanoramaGallery,galleryEntries,galleryBackgroundSrc} from './gallery';
import {useSceneThumbs} from './thumbs';
import {Settings as SettingsIcon,Undo2,Redo2,MessageSquarePlus,Bell,Users,Images,LayoutGrid,Info,Home,Globe,Menu,Star,Eye,Edit3,Trash2,Plus,ChevronLeft,ChevronRight,Sparkles,Download,Cloud,Link2,Layers,Lock,Maximize2,Minimize2,ChevronDown,Search,PanelLeftClose,PanelRightClose,Save,RefreshCw,X,Music,StickyNote,Play,PanelBottom,Smile,MapPin as PinIcon,Upload,Pencil,Moon,Palette,Ruler,Camera,Share2,Map as MapIcon,GripVertical,Timer} from 'lucide-react';
import {checkProject,type CheckIssue} from './projectCheck';
import {autoFixProject} from './autoFix';
import {IssueCallout,IssueBanner,type IssueFocus} from './IssueCallout';
import {ProjectCheckPanel} from './ProjectCheckPanel';
import {CommentsPanel} from './CommentsPanel';
import {captureScreen,ShotEditor} from './ScreenshotTool';
import {SectionHub} from './SectionHub';
import {MediaPicker} from './MediaPicker';
import {SpacesActions} from './SpacesActions';
import {mergeImportedSpaces} from './spaceTransfer';
import {rememberMedia} from './mediaLibrary';
import {IconLibrary,buildIconSets} from './IconLibrary';
import {GeneralIconLibrary} from './GeneralIconLibrary';
import type {IconSetImages} from './IconSetCreator';
import {ExistingIconPackPicker} from './ExistingIconPackPicker';
import {NotesPanel} from './NotesPanel';
import {pngFromSvg} from './svgIcons';
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';
import {updateBarStyle,refusesEmbedding,getFloorPlans,loadProject,newProject,readImage,readPanorama,saveProject,projectJsonParts,readProjectFile,SaveConflictError,WINDOW_ANIMATIONS,type WindowAnimation,barIconSize,barHeightFor,withBarSize,uid,validateProject,defaultBar,isSafeIconDataUrl,type Hotspot,type CustomIcon,type BottomBarItem,type Scene,type StudioProject,type ProjectComment,type StudioLanguage,STUDIO_LANGUAGES,type BarStyle,defaultBarStyle,defaultFrameCorners,isSafeFrameImage,isSafeVideoData,isSafeAudioData,isSafeMediaUrl,VIDEO_MAX_BYTES} from './storage';
import './style.css';
import './windowAnim.css';
import {initWindowAnimOrigin} from './windowAnimOrigin';
import {applyCloseColor} from './closeColor';
import {setTransitionMs} from './transitionPrefs';
initWindowAnimOrigin();
import './media.css';
import {XMark} from './XMark';

type HeaderMenu='file'|'share'|'display'|null;
type SceneFilter='all'|'with'|'without';
function readStudioLayout(){
  try{
    const raw=window.localStorage.getItem('nvstudio-sheet-v1')?window.localStorage.getItem('nvstudio-ui-layout-v1'):null;
    if(raw){const value=JSON.parse(raw) as Record<string,unknown>;return {
      leftHidden:value.leftHidden===true,rightHidden:value.rightHidden===true,
      density:value.density==='compact'?'compact' as const:'comfortable' as const
    };}
  }catch{/* Private browsing or storage disabled. */}
  return {leftHidden:false,rightHidden:true,density:'comfortable' as const}; // les réglages s'ouvrent à la demande (icône en haut à droite)
}
function App(){
  const studioRef=useRef<HTMLDivElement>(null);
  const topMenusRef=useRef<HTMLDivElement>(null);
  const [openTopMenu,setOpenTopMenu]=useState<HeaderMenu>(null);
  const [navigationDrawerOpen,setNavigationDrawerOpen]=useState(false);
  const [aiFreshClient,setAiFreshClient]=useState(false);
  const [spacesDrawerOpen,setSpacesDrawerOpen]=useState(false);
  const [spaceDelete,setSpaceDelete]=useState<{id:string;target:string}|null>(null);  // fenêtre « supprimer un espace »
  const [spaceTransferTo,setSpaceTransferTo]=useState('');
  // Écran partagé (présence en direct à deux sur le même projet Cloud)
  const [liveProjectId,setLiveProjectId]=useState<string|null>(null);
  const [liveLabel,setLiveLabel]=useState('');
  const [liveDialogOpen,setLiveDialogOpen]=useState(false);
  const [liveLeads,setLiveLeads]=useState(true); // celui qui lance le partage pilote ; celui qui rejoint suit
  // Identité (projet Cloud + e-mail) pour recevoir les invitations « partager l'écran ».
  const [inviteIdentity,setInviteIdentity]=useState<{projectId:string;email:string}|null>(null);
  useEffect(()=>{
    let dead=false;
    const read=async()=>{
      const link=readLink();
      if(!link||!cloudConfigured){if(!dead)setInviteIdentity(null);return;}
      try{
        const {supabase}=await import('./cloud');
        const {data}=await supabase().auth.getSession();
        const email=data.session?.user?.email?.toLowerCase();
        if(dead)return;
        setInviteIdentity(prev=>!email?null:prev&&prev.projectId===link.projectId&&prev.email===email?prev:{projectId:link.projectId,email});
      }catch{/* hors ligne : on réessaie */}
    };
    void read();
    const timer=window.setInterval(()=>void read(),30000);
    return ()=>{dead=true;window.clearInterval(timer);};
  },[]);
  const pendingClientSaveRef=useRef(false);
  useEffect(()=>{
    // Garder le tiroir monté pour l'animation, tout en excluant ses commandes
    // du clavier et du focus lorsqu'il est refermé.
    document.getElementById('nv-workspace-spaces')?.toggleAttribute('inert',!spacesDrawerOpen);
  },[spacesDrawerOpen]);
  const [studioFullscreen,setStudioFullscreen]=useState(false);
  const [studioFallback,setStudioFallback]=useState(false);
  const [leftHidden,setLeftHidden]=useState(()=>readStudioLayout().leftHidden);
  const [rightHidden,setRightHidden]=useState(()=>readStudioLayout().rightHidden);
  const [autoReturn,setAutoReturnState]=useState(()=>{try{return window.localStorage.getItem('nvstudio-auto-return')!=='0';}catch{return true;}});
  const setAutoReturn=(v:boolean)=>{setAutoReturnState(v);try{window.localStorage.setItem('nvstudio-auto-return',v?'1':'0');}catch{/* stockage indisponible */}};
  const [exportDialog,setExportDialog]=useState<{spaceId:string|null}|null>(null);
  const [pendingSpaceIntent,setPendingSpaceIntent]=useState<{spaceId:string;intent:'share'|'export'}|null>(null);
  const [brandOpen,setBrandOpen]=useState(false);
  const [introPreview,setIntroPreview]=useState(false);
  const [interestOpen,setInterestOpen]=useState(false);
  const [summaryOpen,setSummaryOpen]=useState(false);
  const logoInput=useRef<HTMLInputElement>(null);
  const endIntroPreview=useCallback(()=>setIntroPreview(false),[]);
  const [pickedSceneId,setPickedSceneId]=useState<string|null>(null);
  const [inspectorVw,setInspectorVw]=useState(()=>{try{const v=Number(window.localStorage.getItem('nvstudio-inspector-vw2'));return v>=24&&v<=98?v:54;}catch{return 54;}});
  const setInspectorWidth=(v:number)=>{const n=Math.round(Math.max(24,Math.min(98,v)));setInspectorVw(n);try{window.localStorage.setItem('nvstudio-inspector-vw2',String(n));}catch{/* stockage indisponible */}};
  const startInspectorResize=(e:{preventDefault:()=>void})=>{e.preventDefault();const move=(ev:PointerEvent)=>setInspectorWidth((1-ev.clientX/window.innerWidth)*100);const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);};
  const [sceneDensity,setSceneDensity]=useState<'compact'|'comfortable'>(()=>readStudioLayout().density);
  const [sceneSearch,setSceneSearch]=useState('');
  const [sceneFilter,setSceneFilter]=useState<SceneFilter>('all');
  useEffect(()=>{
    try{window.localStorage.setItem('nvstudio-sheet-v1','1');window.localStorage.setItem('nvstudio-ui-layout-v1',JSON.stringify({leftHidden,rightHidden,density:sceneDensity}));}
    catch{/* Viewing and editing still work if local preferences cannot be saved. */}
  },[leftHidden,rightHidden,sceneDensity]);
  useEffect(()=>{
    const outside=(event:PointerEvent)=>{
      if(!topMenusRef.current?.contains(event.target as Node))setOpenTopMenu(null);
    };
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){
        setOpenTopMenu(null);
        setNavigationDrawerOpen(false);
        if(studioFallback){setStudioFallback(false);setStudioFullscreen(false);}
      }
    };
    const changed=()=>{if(document.fullscreenElement!==studioRef.current && !studioFallback)setStudioFullscreen(false);};
    document.addEventListener('pointerdown',outside);
    document.addEventListener('keydown',key);
    document.addEventListener('fullscreenchange',changed);
    return ()=>{
      document.removeEventListener('pointerdown',outside);
      document.removeEventListener('keydown',key);
      document.removeEventListener('fullscreenchange',changed);
    };
  },[studioFallback]);
  async function toggleStudioFullscreen(){
    const root=studioRef.current;
    if(!root)return;
    setOpenTopMenu(null);
    if(studioFullscreen){
      if(document.fullscreenElement===root){
        try{await document.exitFullscreen();}catch{setStatus('Impossible de quitter le plein écran du Studio');}
      }else{setStudioFallback(false);setStudioFullscreen(false);}
      return;
    }
    try{
      if(document.fullscreenElement)await document.exitFullscreen();
      if(!root.requestFullscreen)throw Error('Fullscreen API unavailable');
      await root.requestFullscreen();
      setStudioFallback(false);setStudioFullscreen(true);
    }catch{
      // iOS and other browsers that do not allow the Fullscreen API.
      setStudioFallback(true);setStudioFullscreen(true);
    }
  }
  const [project,setProjectRaw]=useState<StudioProject>(newProject());
  // Historique Annuler / Rétablir (Ctrl+Z · Ctrl+Maj+Z · Ctrl+Y) : des modifications rapprochées comptent pour une seule action.
  const histRef=useRef<{past:StudioProject[];future:StudioProject[];last:number;ops:number}>({past:[],future:[],last:0,ops:0});
  const [,setHistTick]=useState(0);
  const setProject=useCallback((update:React.SetStateAction<StudioProject>)=>{
    setProjectRaw(prev=>{
      const next=typeof update==='function'?(update as (p:StudioProject)=>StudioProject)(prev):update;
      if(next===prev)return prev;
      const h=histRef.current,now=Date.now();
      if(now-h.last>700||!h.past.length){h.past.push(prev);if(h.past.length>60)h.past.shift();h.ops++;}
      h.last=now;h.future=[];
      return next;
    });
    setHistTick(t=>t+1);
  },[]);
  /** Remplace tout le projet (ouverture, nouveau projet…) : l'historique repart de zéro. */
  const resetProject=useCallback((p:StudioProject)=>{histRef.current={past:[],future:[],last:0,ops:0};setProjectRaw(p);setHistTick(t=>t+1);},[]);
  const [ready,setReady]=useState(false);
  const [preparationOpen,setPreparationOpen]=useState(false);
  const [aiAssistantOpen,setAiAssistantOpen]=useState(false);
  const [skinsOpen,setSkinsOpen]=useState(false);
  const [vrMenuOpen,setVrMenuOpen]=useState(false);
  const [informationEdit,setInformationEdit]=useState<{sceneId:string;pointId:string}|null>(null);
  const [publishConfirm,setPublishConfirm]=useState(false);
  const [publishReport,setPublishReport]=useState<{ok:boolean;text:string}[]|null>(null);
  useEffect(()=>{if(!publishConfirm)return;document.querySelector<HTMLButtonElement>('.nv-publish-warning button')?.focus();
    const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setPublishConfirm(false);
      if(event.key==='Tab'){const buttons=[...document.querySelectorAll<HTMLButtonElement>('.nv-publish-warning button')];const first=buttons[0],last=buttons[buttons.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}
    };document.addEventListener('keydown',close);return ()=>document.removeEventListener('keydown',close);
  },[publishConfirm]);
  const preparationPrompted=useRef(false);
  const [savingManually,setSavingManually]=useState(false);
  const [updateAvailable,setUpdateAvailable]=useState(false);
  const [updateSnoozeUntil,setUpdateSnoozeUntil]=useState(0);   // « Plus tard » : la bannière revient après quelques minutes
  const updateReloadApproved=useRef(false);
  // Ne jamais recharger automatiquement : les projets Cloud sont sauvegardés
  // volontairement à la disquette. La détection est uniquement informative.
  useEffect(()=>{
    let stopped=false;
    let checking=false;
    const checkUpdate=async()=>{
      if(stopped||checking||document.visibilityState==='hidden')return;
      checking=true;
      try{
        const response=await fetch('/version.json?check='+Date.now(),{
          cache:'no-store',headers:{Accept:'application/json'}
        });
        if(!response.ok)return;
        const payload:unknown=await response.json();
        if(!payload||typeof payload!=='object'||!('buildTime' in payload))return;
        const remote=(payload as {buildTime:unknown}).buildTime;
        if(typeof remote!=='string')return;
        const publishedAt=Date.parse(remote);
        const openedAt=Date.parse(__NV_BUILD_TIME__);
        if(!stopped&&Number.isFinite(publishedAt)&&Number.isFinite(openedAt)&&publishedAt>openedAt){
          setUpdateAvailable(true);
        }
      }catch{/* Hors ligne ou publication en cours : nouvel essai plus tard. */}
      finally{checking=false;}
    };
    void checkUpdate();
    const interval=window.setInterval(()=>void checkUpdate(),30_000);
    // Fichier de l'ancienne version supprimé après un déploiement : la mise à jour est alors nécessaire.
    const onPreloadError=()=>setUpdateAvailable(true);
    window.addEventListener('vite:preloadError',onPreloadError);
    const onFocus=()=>{void checkUpdate();};
    const onVisibility=()=>{if(document.visibilityState==='visible')void checkUpdate();};
    window.addEventListener('focus',onFocus);
    window.addEventListener('online',onFocus);
    document.addEventListener('visibilitychange',onVisibility);
    return ()=>{
      stopped=true;window.clearInterval(interval);
      window.removeEventListener('focus',onFocus);
      window.removeEventListener('online',onFocus);
      document.removeEventListener('visibilitychange',onVisibility);
      window.removeEventListener('vite:preloadError',onPreloadError);
    };
  },[]);
  // Dernière position (panorama + vue) mémorisée en continu : une mise à jour OU un simple rafraîchissement ramène au même endroit.
  function rememberPosition(){
    if(!activeId)return;
    try{const cam=cameraRef.current;if(cam.sceneId!==activeId)return;localStorage.setItem('nvstudio-resume',JSON.stringify({projectName:projectRef.current.name,sceneId:activeId,spaceId:activeSpaceId,yaw:cam.yaw,pitch:cam.pitch,zoom:cam.zoom,at:Date.now()}));}catch{/* stockage indisponible */}
  }
  async function reloadToLatestVersion(){
    if(savingManually||savingRef.current){
      setStatus('Sauvegarde en cours : actualise NovaStudio une fois terminée.');
      return;
    }
    if(ready&&projectRef.current!==savedRef.current){
      const proceed=await confirmAsk(
        'Des modifications du projet ne sont pas enregistrées. Enregistre avec la disquette avant de mettre à jour. Actualiser quand même et perdre ces modifications ?'
      );
      if(!proceed)return;
    }
    updateReloadApproved.current=true;
    // On mémorise où l'on était : après la mise à jour, on revient dans le même panorama (même vue), pas au début de la visite.
    rememberPosition();
    // La reprise caméra ne doit se produire QUE lors d'une mise à jour demandée,
    // jamais pendant l'ouverture normale d'un autre projet ni au rechargement d'une visite.
    try{sessionStorage.setItem('nvstudio-update-resume','1');}catch{/* mode privé */}
    window.location.reload();
  }
  const [activeId,setActiveId]=useState('');
  const [nightSceneId,setNightSceneId]=useState<string|null>(null);
  const [infoLanguage,setInfoLanguage]=useState<StudioLanguage>('fr');
  const visitorPrefs=useVisitorPrefs();
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [floorPlanOpen,setFloorPlanOpen]=useState(false);
  const [photoGalleryId,setPhotoGalleryId]=useState<string|null>(null);
  const [panoModalId,setPanoModalId]=useState<string|null>(null);
  const sphereImage=(id:string)=>projectRef.current.scenes.find(sc=>sc.id===id)?.dataUrl;
  const settingsIconSrc=project.icons.find(i=>i.id===(project.settingsIconId??project.settingsHoverIconId??project.settingsPressedIconId))?.dataUrl;
  const [activeSpaceId,setActiveSpaceId]=useState<string|null>(null);
  async function toggleLive(){
    if(liveProjectId){setLiveProjectId(null);return;}
    const link=readLink();
    if(!link){setStatus('Écran partagé : ouvre d’abord le projet depuis le Cloud (bouton Cloud), comme la personne avec qui tu travailles.');return;}
    try{
      const {supabase}=await import('./cloud');
      const {data:{session}}=await supabase().auth.getSession();
      const email=session?.user?.email??'';
      setLiveLabel((email.split('@')[0]||'Invité').slice(0,24));
      setLiveProjectId(link.projectId);
    }catch(e){setStatus('Écran partagé indisponible : '+(e instanceof Error?e.message:String(e)));}
  }
  /** Démarre l'écran partagé et invite les personnes choisies. */
  async function startLiveWith(emails:string[],asLeader=true){
    setLiveDialogOpen(false);
    const link=readLink();
    if(!link){setStatus('Écran partagé : ouvre d’abord le projet depuis le Cloud (bouton Cloud), comme la personne avec qui tu travailles.');return;}
    try{
      const {supabase}=await import('./cloud');
      const {data:{session}}=await supabase().auth.getSession();
      const email=(session?.user?.email??'').toLowerCase();
      const label=(email.split('@')[0]||'Invité').slice(0,24);
      setLiveLabel(label);setLiveLeads(asLeader);setLiveProjectId(link.projectId);
      if(emails.length){
        await sendLiveInvite(link.projectId,label,email,emails);
        setStatus('Invitation envoyée à '+emails.map(e=>e.split('@')[0]).join(', ')+' : elle apparaît dans son NovaStudio ouvert sur ce projet.');
      }
    }catch(e){setStatus('Écran partagé indisponible : '+(e instanceof Error?e.message:String(e)));}
  }
  const [spaceManagerOpen,setSpaceManagerOpen]=useState(false);
  const [editingSpaceId,setEditingSpaceId]=useState<string|null>(null);
  const [editingSpaceName,setEditingSpaceName]=useState('');
  const cancelSpaceEditRef=useRef(false);
  const [selectedId,setSelectedId]=useState('');
  const [selectedBarId,setSelectedBarId]=useState('');
  const [barGalleryTab,setBarGalleryTab]=useState<BarGalleryTab>('spaces');
  const [panel,setPanel]=useState<PanelTab>('points');
  // Préférence d'affichage propre à ce navigateur, jamais enregistrée dans les visites.
  const [galleryVerticalOffset,setGalleryVerticalOffset]=useState(()=>{
    try{return Math.max(0,Math.min(260,Number(localStorage.getItem('nvstudio-gallery-offset')||0)||0));}
    catch{return 0;}
  });
  const galleryDragStart=useRef<{y:number;offset:number}|null>(null);
  useEffect(()=>{
    try{localStorage.setItem('nvstudio-gallery-offset',String(galleryVerticalOffset));}catch{/* Préférence facultative */}
  },[galleryVerticalOffset]);
  function beginGalleryVerticalDrag(e:React.PointerEvent<HTMLButtonElement>){
    if(e.button!==0)return;
    galleryDragStart.current={y:e.clientY,offset:galleryVerticalOffset};
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function moveGalleryVerticalDrag(e:React.PointerEvent<HTMLButtonElement>){
    const start=galleryDragStart.current;
    if(!start)return;
    setGalleryVerticalOffset(Math.max(0,Math.min(260,Math.round(start.offset+e.clientY-start.y))));
  }
  function endGalleryVerticalDrag(){galleryDragStart.current=null;}
  const [mode,setMode]=useState<EditMode>(null);
  // Assistant de navigation en chaîne : état temporaire, aucun enregistrement automatique.
  const [autoNavigation,setAutoNavigation]=useState(false);
  // Parcours guidé (Auto) : suit l'ordre des panoramas. 'forward' = poser la flèche vers le suivant, 'back' = demi-tour puis valider le retour.
  const [guide,setGuide]=useState<{phase:'forward'|'back';prevId?:string;fwdYaw:number;fwdPitch:number}|null>(null);
  // Retour au panorama en cours d'édition après une mise à jour de l'application
  const rememberRef=useRef(rememberPosition);rememberRef.current=rememberPosition;
  useEffect(()=>{if(ready)rememberRef.current();},[activeId,activeSpaceId,ready]);
  useEffect(()=>{
    const save=()=>rememberRef.current();
    const vis=()=>{if(document.visibilityState==='hidden')save();};
    window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',vis);
    const t=window.setInterval(save,8000);
    return ()=>{window.removeEventListener('pagehide',save);document.removeEventListener('visibilitychange',vis);window.clearInterval(t);};
  },[]);
  const resumeDone=useRef(false);
  useEffect(()=>{
    if(!ready||resumeDone.current)return;
    resumeDone.current=true;
    let explicitUpdate=false;
    try{explicitUpdate=sessionStorage.getItem('nvstudio-update-resume')==='1';sessionStorage.removeItem('nvstudio-update-resume');}catch{/* stockage indisponible */}
    if(!explicitUpdate)return;
    let saved:{projectName?:string;sceneId?:string;spaceId?:string|null;yaw?:number;pitch?:number;zoom?:number;at?:number}|null=null;
    try{saved=JSON.parse(localStorage.getItem('nvstudio-resume')||'null');}catch{saved=null;}
    if(!saved||saved.projectName!==projectRef.current.name||!saved.sceneId||Date.now()-(saved.at??0)>10*60_000)return;
    const sceneId=saved.sceneId;
    if(!projectRef.current.scenes.some(sc=>sc.id===sceneId))return;
    const spaceId=saved.spaceId&&(projectRef.current.spaces??[]).some(sp=>sp.id===saved!.spaceId&&sp.sceneIds.includes(sceneId))?saved.spaceId:null;
    setActiveSpaceId(spaceId);setActiveId(sceneId);setSelectedId('');
    if(Number.isFinite(saved.yaw)&&Number.isFinite(saved.pitch)&&Number.isFinite(saved.zoom)){
      const v={yaw:saved.yaw!,pitch:saved.pitch!,zoom:saved.zoom!};
      window.setTimeout(()=>{
        // N'écrase pas une nouvelle vue si l'utilisateur a changé de panorama entre-temps.
        if(cameraRef.current.sceneId===sceneId)setTurnRequest({n:Date.now(),yaw:v.yaw,pitch:v.pitch,zoom:v.zoom,fast:true});
      },1400);
    }
    setStatus('Mise à jour appliquée · vue de travail restaurée sans modifier les vues enregistrées');
  },[ready]); // eslint-disable-line react-hooks/exhaustive-deps
  const [turnRequest,setTurnRequest]=useState<{n:number;yaw:number;pitch:number;zoom?:number;fast?:boolean}|null>(null);
  const [preview,setPreview]=useState(false);
  useEffect(()=>{if(preview||panel!=='panoramas')setPanoModalId(null);},[preview,panel]);

  const [clientVideoPlacement,setClientVideoPlacement]=useState<(ImportedClientVideo&{sceneId:string})|null>(null);
  useEffect(()=>{
    if(mode!=='video'||preview||clientVideoPlacement?.sceneId!==activeId)setClientVideoPlacement(null);
  },[mode,preview,activeId,clientVideoPlacement?.sceneId]);
  const [status,setStatus]=useState('Initialisation…');
  // Notification visible : chaque message d'état s'affiche quelques secondes (les messages importants gardent leur bandeau).
  const [toast,setToast]=useState<{text:string;error:boolean}|null>(null);
  useEffect(()=>{
    if(!status||status==='Initialisation…'||status==='Prêt')return;
    if(/^(Enregistré dans le Cloud|Échec|Sauvegardé|Publication|Cloud déconnecté)/.test(status))return; // déjà affiché par le bandeau persistant
    setToast({text:status,error:/^(Impossible|Erreur|Échec|Cloud déconnecté|Format|Fichier|Panorama nuit :)/.test(status)});
    const t=window.setTimeout(()=>setToast(null),status.length>90?7000:4200);
    return ()=>window.clearTimeout(t);
  },[status]);
  const [help,setHelp]=useState(false);
  const [info,setInfo]=useState<Hotspot|null>(null);
  const [frame,setFrame]=useState<EmbedFrame|null>(null);
  const [imageZoom,setImageZoom]=useState<Hotspot|null>(null);
  const [zoomFrom,setZoomFrom]=useState<ZoomOrigin|null>(null);
  const [videoZoom,setVideoZoom]=useState<Hotspot|null>(null);
  const [introVisible,setIntroVisible]=useState(false);
  const [introEnding,setIntroEnding]=useState(false);
  const [exporting,setExporting]=useState(false);
  const [cloudOpen,setCloudOpen]=useState(false);
  const [saveWarning,setSaveWarning]=useState<string|null>(null);
  const [authNotice,setAuthNotice]=useState<string|null>(null);
  // Lien de confirmation « à bouton » : ?token_hash=…&type=… (le jeton n'est consommé qu'au clic).
  const [emailLink,setEmailLink]=useState<{tokenHash:string;type:string;busy:boolean;error:string;done:boolean}|null>(()=>{
    const q=new URLSearchParams(window.location.search);
    const tokenHash=q.get('token_hash'),type=q.get('type');
    return tokenHash&&type?{tokenHash,type,busy:false,error:'',done:false}:null;
  });
  useEffect(()=>{
    // Retour d'un lien reçu par e-mail (connexion / confirmation) : Supabase ajoute l'erreur dans l'adresse.
    const params=new URLSearchParams(window.location.hash.replace(/^#/,''));
    const code=params.get('error_code')??params.get('error');
    if(!code)return;
    setAuthNotice(code==='otp_expired'?'Le lien reçu par e-mail a expiré ou a déjà été utilisé.':
      (params.get('error_description')??'La connexion par lien a échoué.').replace(/\+/g,' '));
    window.history.replaceState(null,'',window.location.pathname+window.location.search);
  },[]);
  const [shareOpen,setShareOpen]=useState(false);
  const [clientOpen,setClientOpen]=useState(false);
  const [privateOpen,setPrivateOpen]=useState(false);
  const [photoFeedback,setPhotoFeedback]=useState('');
  const videoInput=useRef<HTMLInputElement>(null);
  const audioInput=useRef<HTMLInputElement>(null);
  const nightInput=useRef<HTMLInputElement>(null);
  const upload=useRef<HTMLInputElement>(null);
  const projectInput=useRef<HTMLInputElement>(null);
  const placedMediaInput=useRef<HTMLInputElement>(null);
  const pendingMediaPlacement=useRef<{sceneId:string;hotspotId:string;type:'image'|'video'}|null>(null);
  // Choix d'un média : la bibliothèque (déjà utilisés) s'ouvre d'abord ; l'import depuis l'ordinateur reste facultatif.
  const [mediaPicker,setMediaPicker]=useState<{sceneId:string;hotspotId:string;type:'image'|'video';fresh:boolean}|null>(null);
  const [mediaVersion,setMediaVersion]=useState(0);
  useEffect(()=>{
    const input=placedMediaInput.current;if(!input)return;
    // Sélecteur du système annulé : on reste sur la bibliothèque, rien n'est supprimé.
    const cancel=()=>{pendingMediaPlacement.current=null;setStatus('Import annulé : choisis un média déjà utilisé, ou réessaie.');};
    input.addEventListener('cancel',cancel);return ()=>input.removeEventListener('cancel',cancel);
  },[]);

  const iconInput=useRef<HTMLInputElement>(null);
  const replaceIconInput=useRef<HTMLInputElement>(null);
  const replacingIconId=useRef<string|null>(null);
  const stateIconInput=useRef<HTMLInputElement>(null);
  const stateTarget=useRef<((id:string|undefined)=>void)|null>(null);
  const [libraryFor,setLibraryFor]=useState<string|null>(null);
  const [galleryOpen,setGalleryOpen]=useState<string|null>(null);
  const sceneThumbs=useSceneThumbs(project.scenes);
  const sortBusy=useRef(false);
  // Vue d'arrivée PAR FLÈCHE : on retient par quelle flèche on est arrivé dans le panorama affiché.
  const [arrivedVia,setArrivedVia]=useState<{sceneId:string;hotspotId:string;fromSceneId:string}|null>(null);
  const nextArrivalRef=useRef<{sceneId:string;yaw:number;pitch:number;zoom:number}|null>(null);
  const scenesRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(!preview)setGalleryOpen(null);},[preview]);
  const suppressClick=useRef(false);
  const viewAreaRef=useRef<HTMLDivElement>(null);
  const [creationFullscreen,setCreationFullscreen]=useState(false);
  const [fullscreenGalleryOpen,setFullscreenGalleryOpen]=useState(false);
  const [hoveredGallerySceneId,setHoveredGallerySceneId]=useState<string|null>(null);
  const [fullscreenSelectedDestinationId,setFullscreenSelectedDestinationId]=useState<string|null>(null);
  const galleryHoverTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const scheduleGalleryHover=(id:string)=>{
    if(galleryHoverTimer.current)clearTimeout(galleryHoverTimer.current);
    galleryHoverTimer.current=setTimeout(()=>setHoveredGallerySceneId(id),110);
  };
  const dismissGalleryHover=(delay=230)=>{
    if(galleryHoverTimer.current)clearTimeout(galleryHoverTimer.current);
    galleryHoverTimer.current=setTimeout(()=>setHoveredGallerySceneId(null),delay);
  };
  useEffect(()=>()=>{if(galleryHoverTimer.current)clearTimeout(galleryHoverTimer.current);},[]);
  useEffect(()=>{if(!fullscreenGalleryOpen){setHoveredGallerySceneId(null);setFullscreenSelectedDestinationId(null);}},[fullscreenGalleryOpen]);
  const [fullscreenToolsOpen,setFullscreenToolsOpen]=useState(false);
  const [navigationPickerOpen,setNavigationPickerOpen]=useState(false);
  const [navigationPickerHover,setNavigationPickerHover]=useState<string|null>(null);
  const [navigationPickerPreviewId,setNavigationPickerPreviewId]=useState<string|null>(null);
  const [navigationPickerSearch,setNavigationPickerSearch]=useState('');
  const [classicDestinationOpen,setClassicDestinationOpen]=useState(false);
  const [classicDestinationPreviewId,setClassicDestinationPreviewId]=useState<string|null>(null);
  const [galleryPreviewSceneId,setGalleryPreviewSceneId]=useState<string|null>(null);
  const [navigationDraft,setNavigationDraft]=useState<{
    sourceId:string;targetId:string;sourceYaw:number;sourcePitch:number;existingPointId?:string;
  }|null>(null);
  const [destinationEditId,setDestinationEditId]=useState<string|null>(null);
  const [galleryPreviewPinned,setGalleryPreviewPinned]=useState(false);
  const sidePreviewTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const hoverSidePreview=(id:string)=>{if(galleryPreviewPinned)return;if(sidePreviewTimer.current)clearTimeout(sidePreviewTimer.current);sidePreviewTimer.current=setTimeout(()=>setGalleryPreviewSceneId(id),180);};
  const leaveSidePreview=()=>{if(sidePreviewTimer.current)clearTimeout(sidePreviewTimer.current);if(!galleryPreviewPinned)sidePreviewTimer.current=setTimeout(()=>setGalleryPreviewSceneId(null),330);};
  useEffect(()=>()=>{if(sidePreviewTimer.current)clearTimeout(sidePreviewTimer.current);},[]);
  const [classicDestinationSearch,setClassicDestinationSearch]=useState('');
  const destinationListRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!classicDestinationOpen||!classicDestinationPreviewId)return;
    const list=destinationListRef.current;
    if(!list)return;
    const selected=Array.from(list.querySelectorAll<HTMLButtonElement>('[data-destination-scene]'))
      .find(button=>button.dataset.destinationScene===classicDestinationPreviewId);
    if(!selected)return;
    const viewport=list.getBoundingClientRect(),item=selected.getBoundingClientRect();
    if(item.top<viewport.top||item.bottom>viewport.bottom){
      list.scrollBy({top:item.top-viewport.top-(viewport.height-item.height)/2,behavior:'smooth'});
    }
  },[classicDestinationOpen,classicDestinationPreviewId,classicDestinationSearch]);
  const [fullscreenCommandDrawerOpen,setFullscreenCommandDrawerOpen]=useState(false);
  const [quickLinkMode,setQuickLinkMode]=useState(true);
  const [toolsMenuOpen,setToolsMenuOpen]=useState(false);
  // « Retour » : quand une fenêtre s'ouvre depuis le rideau d'outils ou le menu Partager, la croix ramène à ce rideau / menu.
  const returnTo=useRef<'tools'|'share'|null>(null);
  function backFrom(){const r=returnTo.current;returnTo.current=null;if(r==='tools')setToolsMenuOpen(true);else if(r==='share')setShareMenuOpen(true);}
  function leaveTools(){returnTo.current='tools';setToolsMenuOpen(false);}
  function leaveShare(){returnTo.current='share';setShareMenuOpen(false);}
  const [notesOpen,setNotesOpen]=useState(false);
  // Le rideau des outils descend TOUJOURS jusqu'à la ligne du haut de la barre du bas (ou du pied de page si elle est absente), quelle que soit la vue ou son contenu.
  useEffect(()=>{
    if(!toolsMenuOpen)return;
    const fit=()=>{
      const top=document.querySelector('.topbar')?.getBoundingClientRect().bottom??0;
      const bar=document.querySelector('.nv-sortable-toolbar');
      const barTop=bar&&bar.getClientRects().length?bar.getBoundingClientRect().top:null;
      const limit=barTop??document.querySelector('.nv-app-footer')?.getBoundingClientRect().top??window.innerHeight;
      document.documentElement.style.setProperty('--nv-curtain-max',Math.max(160,Math.floor(limit-top))+'px');
    };
    fit();const t=window.setTimeout(fit,450);window.addEventListener('resize',fit);
    return ()=>{window.clearTimeout(t);window.removeEventListener('resize',fit);};
  },[toolsMenuOpen]);
  const [hubOpen,setHubOpen]=useState<Record<string,string|null>>({});
  const [panelBack,setPanelBack]=useState<{panel:PanelTab;hub:Record<string,string|null>;barId:string;pointId:string}|null>(null);
  const prevPanelRef=useRef<PanelTab>('points');
  const [toolSettings,setToolSettings]=useState<'navigation'|'information'|'lien'|'image'|'video'>('navigation');
  // Sélection multiple d'espaces : partager avec des membres, envoyer vers un autre projet
  const [spaceSelectMode,setSpaceSelectMode]=useState(false);
  const [spaceSelection,setSpaceSelection]=useState<Set<string>>(new Set());
  const [spaceAction,setSpaceAction]=useState<'share'|'transfer'|null>(null);
  const spaceImportInput=useRef<HTMLInputElement>(null);
  const spacePanoramasInput=useRef<HTMLInputElement>(null);
  const spacePanoramasTarget=useRef<string|null>(null);
  const [shareMenuOpen,setShareMenuOpen]=useState(false);
  const [bellOpen,setBellOpen]=useState(false);
  const [bellTab,setBellTab]=useState<'notifs'|'comments'>('notifs');
  const bellRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!bellOpen)return;
    const outside=(e:PointerEvent)=>{if(!bellRef.current?.contains(e.target as Node))setBellOpen(false);};
    const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')setBellOpen(false);};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',esc);
    return ()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',esc);};
  },[bellOpen]);
  const shareMenuRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!shareMenuOpen)return;
    const outside=(e:PointerEvent)=>{if(!shareMenuRef.current?.contains(e.target as Node))setShareMenuOpen(false);};
    const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')setShareMenuOpen(false);};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',esc);
    return ()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',esc);};
  },[shareMenuOpen]);
  /** Choisir des espaces (affiche la barre des espaces avec les cases), puis lancer l'action voulue. */
  function startSpaceAction(action?:'share'|'transfer'){
    setShareMenuOpen(false);
    setSpacesDrawerOpen(true);setSpaceSelectMode(true);
    if(action&&spaceSelection.size>0){setSpaceAction(action);return;}
    setStatus(action?'Coche les espaces à '+(action==='share'?'partager':'envoyer')+', puis clique sur « '+(action==='share'?'Partager avec un membre…':'Envoyer vers un autre projet…')+' » dans la barre qui s’affiche.':'Coche les espaces voulus : les actions apparaissent dans la barre sous les espaces.');
  }
  const selectedSpaces=(project.spaces??[]).filter(space=>spaceSelection.has(space.id));
  const toggleSpacePick=(id:string)=>setSpaceSelection(cur=>{const n=new Set(cur);if(n.has(id))n.delete(id);else n.add(id);return n;});
  async function importSpacesFile(file?:File){
    if(!file)return;
    if(file.size>480*1024*1024){
      setStatus('Ce fichier pèse '+Math.round(file.size/1048576)+' Mo : le navigateur ne peut pas le lire (limite ≈ 500 Mo). Dans le projet d’origine, utilise « Envoyer des espaces vers un autre projet » → « Envoyer directement ».');
      if(spaceImportInput.current)spaceImportInput.current.value='';
      return;
    }
    try{
      setStatus('Lecture du fichier d’espaces…');
      const raw=await readProjectFile(file,pct=>setStatus('Lecture du fichier d’espaces… '+pct+' %'));
      const result=mergeImportedSpaces(project,raw);
      setProject(result.project);
      setStatus(result.spaces+' espace'+(result.spaces>1?'s':'')+' importé'+(result.spaces>1?'s':'')+' ('+result.scenes+' nouveau'+(result.scenes>1?'x':'')+' panorama'+(result.scenes>1?'s':'')+'). Enregistre avec la disquette.');
    }catch(e){setStatus('Import des espaces impossible : '+(e instanceof Error?e.message:String(e)));}
    finally{if(spaceImportInput.current)spaceImportInput.current.value='';}
  }
  const [shotImage,setShotImage]=useState<{image:string;defaultTo?:string}|null>(null);
  /** Capture annotée : photo de l'écran à l'instant T, à entourer / commenter puis envoyer à un collègue. */
  async function takeShot(){
    setToolsMenuOpen(false);
    if(creationFullscreen)await toggleCreationFullscreen();
    try{
      await new Promise(resolve=>window.setTimeout(resolve,150));
      setShotImage({image:await captureScreen()});
    }catch(e){
      setStatus(e instanceof DOMException&&e.name==='NotAllowedError'?'Capture annulée.':'Capture impossible : '+(e instanceof Error?e.message:String(e)));
    }
  }
  async function sendShot(to:string[],comment:string,image:string){
    const link=readLink();
    if(!inviteIdentity||!link)throw new Error('ouvre le projet depuis le Cloud et connecte-toi.');
    await sendLiveShot(link.projectId,inviteIdentity.email.split('@')[0].slice(0,24),inviteIdentity.email,to,comment,image);
    setStatus('Capture envoyée à '+to.map(e=>e.split('@')[0]).join(', ')+'. Elle apparaît dans son NovaStudio s’il est ouvert sur ce projet.');
  }
  // Fenêtres et panneaux ouverts : envoyés à l'autre personne pour qu'elle voie les mêmes écrans s'ouvrir.
  const liveUi=JSON.stringify({
    pv:preview,g:galleryOpen,b:selectedBarId,s:selectedId,p:panel,
    tm:toolsMenuOpen,rh:rightHidden,sp:spacesDrawerOpen,nd:navigationDrawerOpen,hub:hubOpen,sk:skinsOpen,cl:clientOpen,
    i:info?.id??null,f:frame?{t:frame.title,u:frame.url}:null,im:imageZoom?.id??null,vi:videoZoom?.id??null
  });
  const liveInvite=useLiveInvites(inviteIdentity,true);
  // Historique des notifications (mémorisé sur cet ordinateur) : enregistrements, publications, échecs, notes et captures reçues.
  type NotifEntry={id:string;icon:string;text:string;at:number};
  const [notifHistory,setNotifHistory]=useState<NotifEntry[]>(()=>{try{const v=JSON.parse(localStorage.getItem('nvstudio-notif-history')||'[]');return Array.isArray(v)?v.slice(0,30):[];}catch{return [];}});
  const [sharedNotesUnread,setSharedNotesUnread]=useState(0);
  const [projectSharesUnread,setProjectSharesUnread]=useState(0);
  const pushNotif=(icon:string,text:string,id=String(Date.now())+Math.random().toString(36).slice(2,6))=>setNotifHistory(list=>{
    if(list.some(x=>x.id===id)||(list[0]&&list[0].text===text&&Date.now()-list[0].at<3000))return list;
    const next=[{id,icon,text,at:Date.now()},...list].slice(0,30);
    try{localStorage.setItem('nvstudio-notif-history',JSON.stringify(next));}catch{/* stockage indisponible */}
    return next;
  });
  useEffect(()=>{
    // Seules les erreurs entrent dans la cloche : les enregistrements et publications réussis ne sont pas notifiés.
    if(!/^(Échec|Cloud déconnecté)/.test(status))return;
    pushNotif('⚠️',status.slice(0,120));
  },[status]);
  useEffect(()=>{
    for(const n of liveInvite.notesIn)pushNotif('📝',n.fromLabel+' : '+n.body.slice(0,80),'note-'+n.id);
    for(const sh of liveInvite.shots)pushNotif('📷',sh.fromLabel+' a envoyé une capture','shot-'+sh.id);
  },[liveInvite.notesIn,liveInvite.shots]);
  // Nouveaux projets partagés : suivi par compte, sans afficher les anciens comme nouveaux.
  useEffect(()=>{
    if(!cloudConfigured)return;
    let gone=false,busy=false;
    const poll=async()=>{
      if(gone||busy||document.visibilityState==='hidden')return;
      busy=true;
      try{
        const {data:{user}}=await supabase().auth.getUser();
        if(!user||gone)return;
        const key='nvstudio-visible-shares:'+user.id;
        const projects=(await listCloudProjects()).filter(p=>p.shared);
        if(gone)return;
        const saved=localStorage.getItem(key);
        const oldIds:string[]=saved?JSON.parse(saved):[];
        const previous=new Set(oldIds);
        if(saved!==null)for(const item of projects.filter(p=>!previous.has(p.id))){
          pushNotif('👥','Nouveau projet partagé avec toi : « '+item.name+' »','project-share-'+item.id);
          setProjectSharesUnread(n=>Math.min(99,n+1));
        }
        localStorage.setItem(key,JSON.stringify([...new Set([...oldIds,...projects.map(p=>p.id)])].slice(-1000)));
      }catch{/* Réessayer à la prochaine synchronisation. */}
      finally{busy=false;}
    };
    void poll();
    const timer=window.setInterval(()=>void poll(),30000);
    window.addEventListener('focus',poll);
    return ()=>{gone=true;window.clearInterval(timer);window.removeEventListener('focus',poll);};
  },[]);
  // Boîte de réception fiable : les notes partagées sont conservées dans le
  // Cloud et reçues même lorsque le destinataire était déconnecté.
  // La lecture suit le projet Cloud ouvert, jamais un autre dossier client.
  useEffect(()=>{
    if(!cloudConfigured)return;
    let disposed=false,busy=false;
    const poll=async()=>{
      if(disposed||busy||document.visibilityState==='hidden')return;
      const link=readLink();if(!link)return;
      busy=true;
      try{
        const {data:{session}}=await supabase().auth.getSession();
        if(!session?.user||disposed)return;
        const userId=session.user.id;
        const key='nvstudio-received-notes:'+userId+':'+link.projectId;
        const saved=JSON.parse(localStorage.getItem(key)||'[]') as unknown;
        const seen=new Set(Array.isArray(saved)?saved.filter((id):id is string=>typeof id==='string'):[]);
        const {data,error}=await supabase().from('nvstudio_notes')
          .select('id,body,author_id,author_email,scene_id,created_at')
          .eq('project_id',link.projectId).eq('shared',true)
          .order('created_at',{ascending:false}).limit(80);
        if(error||disposed||readLink()?.projectId!==link.projectId)return;
        const next=(data??[]).filter(note=>note.author_id!==userId&&!seen.has(String(note.id))&&
          Date.parse(String(note.created_at))>Date.now()-7*86400000);
        for(const note of [...next].reverse().slice(-10)){
          const author=String(note.author_email||'Un collègue').split('@')[0];
          const scene=projectRef.current.scenes.find(sc=>sc.id===note.scene_id);
          const intro=scene?'Sur « '+scene.name+' » · ':'';
          pushNotif('📝',author+' : '+intro+String(note.body||'').slice(0,105),'shared-note-'+note.id);
        }
        if(next.length)setSharedNotesUnread(value=>Math.min(99,value+next.length));
        try{localStorage.setItem(key,JSON.stringify([
          ...new Set([...((data??[]).filter(note=>note.author_id!==userId).map(note=>String(note.id))),...seen])
        ].slice(0,300)));}catch{/* historique facultatif */}
      }catch{/* prochain contrôle, sans interrompre l'éditeur */}
      finally{busy=false;}
    };
    void poll();
    const interval=window.setInterval(()=>void poll(),12000);
    const onFocus=()=>void poll();
    window.addEventListener('focus',onFocus);
    return ()=>{disposed=true;window.clearInterval(interval);window.removeEventListener('focus',onFocus);};
  },[]);
  // Commentaires d'équipe accrochés à un endroit du panorama
  const [commentsOpen,setCommentsOpen]=useState(false);
  function addComment(text:string){
    const cam=cameraRef.current,sceneId=cam.sceneId||activeId;if(!sceneId)return;
    const c:ProjectComment={id:uid(),sceneId,yaw:cam.yaw,pitch:cam.pitch,text,author:inviteIdentity?inviteIdentity.email.split('@')[0].slice(0,24):'Moi',at:Date.now()};
    setProject(p=>({...p,comments:[c,...(p.comments??[])].slice(0,500)}));
    pushNotif('💬','Commentaire ajouté sur « '+(project.scenes.find(sc=>sc.id===sceneId)?.name||'panorama')+' »');
    // Notification durable envoyée sans attendre une révision complète du projet.
    // Cela évite de perdre le message si un collègue édite la même visite.
    const link=readLink();
    if(cloudConfigured&&link){
      const name=project.scenes.find(sc=>sc.id===sceneId)?.name||'panorama';
      // Renseigner explicitement l'auteur pour que la réception filtre bien
      // les notes émises par un autre compte (y compris le compte gestion).
      void supabase().auth.getSession().then(({data})=>{
        const user=data.session?.user;
        if(!user)throw new Error('Session Cloud expirée : reconnecte-toi.');
        return supabase().from('nvstudio_notes').insert({
          project_id:link.projectId,body:'Sur « '+name+' » : '+text.slice(0,3800),
          shared:true,scene_id:sceneId,yaw:cam.yaw,pitch:cam.pitch,
          author_id:user.id,author_email:user.email??null
        }).then(({error})=>{if(error)throw error;});
      }).catch(error=>{
        pushNotif('⚠️','Commentaire enregistré, mais notification non envoyée : '+String(error?.message??error).slice(0,85));
      });
    }
    setStatus('Commentaire accroché · enregistre avec la disquette pour le partager dans la visite');
  }
  function goToComment(c:ProjectComment){
    if(!project.scenes.some(sc=>sc.id===c.sceneId)){setStatus('Ce panorama n’existe plus.');return;}
    setCommentsOpen(false);
    if(currentSpace&&!visibleIds.has(c.sceneId))setActiveSpaceId(null);
    setArrivedVia(null);nextArrivalRef.current=null;setActiveId(c.sceneId);setSelectedId('');setMode(null);
    window.setTimeout(()=>setTurnRequest({n:Date.now(),yaw:c.yaw,pitch:c.pitch}),900);
  }
  const toggleComment=(id:string)=>setProject(p=>({...p,comments:(p.comments??[]).map(c=>c.id===id?{...c,done:!c.done}:c)}));
  const deleteComment=(id:string)=>setProject(p=>({...p,comments:(p.comments??[]).filter(c=>c.id!==id)}));
  // Contrôle avant publication
  const [checkOpen,setCheckOpen]=useState(false);
  const allProjectIssues=useMemo(()=>ready?checkProject(project):[],[project,ready]);
  const autoFixChanges=useMemo(()=>ready?autoFixProject(project).changes:[],[project,ready]);
  const ignoredIds=useMemo(()=>new Set(project.ignoredChecks??[]),[project.ignoredChecks]);
  const projectIssues=useMemo(()=>allProjectIssues.filter(issue=>!ignoredIds.has(issue.id)),[allProjectIssues,ignoredIds]);
  const hiddenIssues=useMemo(()=>allProjectIssues.filter(issue=>ignoredIds.has(issue.id)),[allProjectIssues,ignoredIds]);
  // Ne pas masquer les vrais blocages dans la confirmation de publication.
  // Publication d'un espace : on ne contrôle que les panoramas de CET espace (les défauts des autres espaces ne concernent pas ce lien).
  const publishIssues=useMemo(()=>{
    const space=(project.spaces??[]).find(sp=>sp.id===activeSpaceId);
    if(!space)return allProjectIssues;
    const inSpace=new Set(space.sceneIds);
    return allProjectIssues.filter(issue=>!issue.sceneId||inSpace.has(issue.sceneId));
  },[allProjectIssues,project.spaces,activeSpaceId]);
  function ignoreCheck(id:string){
    setProject(p=>({...p,ignoredChecks:[...new Set([...(p.ignoredChecks??[]),id])].slice(-500)}));
    setIssueFocus(null);setGuided(null);
    setStatus('Contrôle ignoré pour cette visite. Enregistre pour conserver ce choix.');
  }
  function restoreCheck(id:string){
    setProject(p=>({...p,ignoredChecks:(p.ignoredChecks??[]).filter(value=>value!==id)}));
  }
  const issueErrors=projectIssues.filter(i=>i.level==='error').length;
  // Correctifs notés « à faire » : un commentaire lié au problème, résolu tout seul dès que le problème disparaît.
  const notedIds=useMemo(()=>new Set((project.comments??[]).filter(c=>c.issueId&&!c.done).map(c=>c.issueId!)),[project.comments]);
  useEffect(()=>{
    if(!ready)return;
    const present=new Set(allProjectIssues.map(i=>i.id));
    const stale=(project.comments??[]).filter(c=>c.issueId&&!c.done&&!present.has(c.issueId));
    if(stale.length)setProject(p=>({...p,comments:(p.comments??[]).map(c=>c.issueId&&!c.done&&!present.has(c.issueId)?{...c,done:true}:c)}));
  },[allProjectIssues,ready]); // eslint-disable-line react-hooks/exhaustive-deps
  const openCommentCount=(project.comments??[]).filter(c=>!c.done).length;
  // Pastille 📝 sur les vignettes des panoramas qui ont un correctif « à faire » en attente.
  const todoByScene=useMemo(()=>{const m=new Map<string,number>();for(const c of project.comments??[])if(c.issueId&&!c.done)m.set(c.sceneId,(m.get(c.sceneId)??0)+1);return m;},[project.comments]);
  const todoPin=(sceneId:string)=>{const n=todoByScene.get(sceneId);return n?<span className="nv-todo-pin" title={n+' correctif'+(n>1?'s':'')+' à faire dans ce panorama'}>📝{n>1?<b>{n}</b>:null}</span>:null;};
  function noteIssueForLater(){
    if(!issueFocus?.id)return;
    const is=projectIssues.find(x=>x.id===issueFocus.id);
    const sceneId=issueFocus.sceneId??is?.sceneId;
    const mine=noteText.trim();
    if(sceneId&&(mine||!notedIds.has(issueFocus.id))){
      const hs=project.scenes.find(sc=>sc.id===sceneId)?.hotspots.find(h=>h.id===issueFocus.hotspotId);
      const cam=cameraRef.current;
      const c:ProjectComment={id:uid(),sceneId,yaw:hs?.yaw??cam.yaw,pitch:hs?.pitch??cam.pitch,
        text:mine?mine+'\n(à corriger : '+issueFocus.text+')':'À faire : '+issueFocus.text+(issueFocus.hint?' — '+issueFocus.hint:''),
        author:inviteIdentity?inviteIdentity.email.split('@')[0].slice(0,24):'Moi',at:Date.now(),issueId:issueFocus.id};
      setProject(p=>({...p,comments:[c,...(p.comments??[])].slice(0,500)}));
      pushNotif('📝',(mine?'Note : '+mine:'Noté « à faire » : '+issueFocus.text).slice(0,90));
      setStatus('Note enregistrée dans les commentaires du panorama · enregistre pour la partager');
    }
    setNoteText('');
    if(guided){nextGuided();return;}
    setIssueFocus(null);
    if(returnToCheck.current){returnToCheck.current=false;setCheckOpen(true);}
  }
  const notifCount=sharedNotesUnread+projectSharesUnread+(liveInvite.invite?1:0)+liveInvite.notesIn.length+liveInvite.shots.length+(updateAvailable?1:0)+(issueErrors>0?1:0);
  const [issueFocus,setIssueFocus]=useState<IssueFocus|null>(null);
  // Flèche provisoire créée pour un panorama sans point : supprimée si on ferme la galerie sans choisir de destination.
  const orphanArrow=useRef<{sceneId:string;hotspotId:string;armed:boolean}|null>(null);
  useEffect(()=>{
    const o=orphanArrow.current;
    if(!o||!o.armed||classicDestinationOpen)return;
    orphanArrow.current=null;
    setProject(p=>({...p,scenes:p.scenes.map(sc=>sc.id!==o.sceneId?sc:{...sc,hotspots:sc.hotspots.filter(h=>!(h.id===o.hotspotId&&!h.target))})}));
    setSelectedId(cur=>cur===o.hotspotId?'':cur);
  },[classicDestinationOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  const returnToCheck=useRef(false);
  const [guided,setGuided]=useState<{queue:CheckIssue[];i:number}|null>(null);
  const fixingRef=useRef(false);
  const [fixError,setFixError]=useState('');
  const [noteText,setNoteText]=useState('');
  async function validateFix(){
    if(fixingRef.current)return;
    fixingRef.current=true;setFixError('');
    const guidedNow=guided;
    let ok:boolean|undefined;
    try{
      // On n'attend pas indéfiniment le Cloud : après 20 s l'enregistrement continue en arrière-plan et on passe à la suite.
      ok=await Promise.race([manualSave().catch(()=>false),new Promise<undefined>(resolve=>window.setTimeout(()=>resolve(undefined),20000))]);
    }finally{fixingRef.current=false;}
    if(ok===false){setFixError('L’enregistrement n’a pas abouti : la correction n’est pas sauvegardée. Lis le message en haut de l’écran, puis réessaie.');return;}
    if(guidedNow){nextGuided();return;}
    setIssueFocus(null);setGuided(null);
    if(returnToCheck.current){returnToCheck.current=false;setCheckOpen(true);}
  }
  function startGuided(){
    const queue=[...projectIssues.filter(i=>i.level==='error'&&!notedIds.has(i.id)),...projectIssues.filter(i=>i.level==='warn'&&!notedIds.has(i.id))];
    if(!queue.length)return;
    returnToCheck.current=true;setGuided({queue,i:0});goToIssue(queue[0]);
  }
  function nextGuided(){
    if(!guided)return;
    let j=guided.i+1;
    while(j<guided.queue.length&&(!projectIssues.some(x=>x.id===guided.queue[j].id)||notedIds.has(guided.queue[j].id)))j++;
    if(j>=guided.queue.length){setGuided(null);setIssueFocus(null);setStatus('Tous les problèmes ont été passés en revue 🎉');if(returnToCheck.current){returnToCheck.current=false;setCheckOpen(true);}return;}
    setGuided({queue:guided.queue,i:j});goToIssue(guided.queue[j]);
  }
  /** Numéro de scan d'un panorama (« …-PAN034 » → 34, « Entrée 1 » → 1) : les panoramas sont normalement numérotés dans l'ordre du scan. */
  function sceneNumber(name:string):number|null{
    const m=name.match(/PAN\s*0*(\d+)/i)??name.match(/(\d+)(?!.*\d)/);
    return m?parseInt(m[1],10):null;
  }
  /** Panoramas à proposer en premier comme destination : d'abord les voisins dans la numérotation (le 14 et le 16 pour le 15, en écartant celui déjà relié),
   *  puis ceux qui ont déjà une flèche vers ce panorama, puis les voisins dans l'ordre du projet. */
  function suggestDestinations(sceneId:string):{id:string;why:string}[]{
    const out:{id:string;why:string}[]=[];
    const add=(id:string,why:string)=>{if(id!==sceneId&&visibleIds.has(id)&&!out.some(o=>o.id===id))out.push({id,why});};
    const cur=project.scenes.find(sc=>sc.id===sceneId);
    const n=cur?sceneNumber(cur.name):null;
    if(cur&&n!==null){
      const linked=new Set(cur.hotspots.filter(h=>h.type==='navigation'&&h.target).map(h=>h.target));
      const numbered=project.scenes.filter(sc=>sc.id!==sceneId&&visibleIds.has(sc.id)).map(sc=>({sc,num:sceneNumber(sc.name)})).filter((x):x is {sc:Scene;num:number}=>x.num!==null);
      const next=numbered.filter(x=>x.num>n).sort((x,y)=>x.num-y.num)[0];
      const prev=numbered.filter(x=>x.num<n).sort((x,y)=>y.num-x.num)[0];
      for(const [cand,label] of [[next,'suivant'],[prev,'précédent']] as const)
        if(cand&&!linked.has(cand.sc.id))add(cand.sc.id,'⭐ Suggéré · n°'+cand.num+' ('+label+' dans la numérotation)');
    }
    for(const sc of project.scenes)if(sc.hotspots.some(h=>h.type==='navigation'&&h.target===sceneId))add(sc.id,'⭐ Suggéré · a déjà une flèche vers ce panorama');
    const i=project.scenes.findIndex(sc=>sc.id===sceneId);
    if(i>0)add(project.scenes[i-1].id,'⭐ Suggéré · juste avant dans la liste');
    if(i>=0&&i<project.scenes.length-1)add(project.scenes[i+1].id,'⭐ Suggéré · juste après dans la liste');
    return out;
  }
  /** Ouvre la galerie 360° pour choisir le panorama d'arrivée (crée d'abord une flèche provisoire si le panorama n'a aucun point). */
  function chooseDestination(){
    const sceneId=issueFocus?.sceneId;if(!sceneId)return;
    let spotId=issueFocus?.hotspotId;
    if(issueFocus?.kind==='scene-empty'){
      const scene=project.scenes.find(sc=>sc.id===sceneId);
      if(!scene)return;
      const fav=defaultNavigationIconSet(),id=uid();
      // La flèche est posée là où on regarde (centre de la vue) pour qu'on la voie tout de suite, y compris en Aperçu.
      const cam=cameraRef.current,here=cam.sceneId===sceneId;
      const point:Hotspot={id,type:'navigation',title:'Aller vers…',text:'',target:'',yaw:here?cam.yaw:(scene.arrivalYaw??0),pitch:here?Math.max(-0.35,Math.min(0.2,cam.pitch)):(scene.arrivalPitch??0),
        ...(fav?{iconId:fav.iconId,hoverIconId:fav.hoverIconId,pressedIconId:fav.pressedIconId,iconSize:fav.iconSize}:{})};
      orphanArrow.current={sceneId,hotspotId:id,armed:true};
      setIssueFocus(f=>f?{...f,hotspotId:id}:f);
      setProject(p=>({...p,scenes:p.scenes.map(sc=>sc.id===sceneId?{...sc,hotspots:[...sc.hotspots,point]}:sc)}));
      spotId=id;
    }
    if(!spotId)return;
    setSelectedId(spotId);
    setClassicDestinationSearch('');
    setClassicDestinationPreviewId(suggestDestinations(sceneId)[0]?.id??project.scenes.find(sc=>sc.id!==sceneId)?.id??null);
    setClassicDestinationOpen(true);
  }
  function goToIssue(is:CheckIssue){
    setCheckOpen(false);setPublishConfirm(false);
    setFixError('');setNoteText('');setIssueFocus({id:is.id,kind:is.kind,position:is.sceneId?'Scène '+(project.scenes.findIndex(sc=>sc.id===is.sceneId)+1)+' / '+project.scenes.length:undefined,sceneId:is.sceneId,hotspotId:is.hotspotId,text:is.text,level:is.level,hint:is.hint,thumb:is.sceneId?sceneThumbs[is.sceneId]:undefined,sceneName:is.sceneId?project.scenes.find(sc=>sc.id===is.sceneId)?.name:undefined});
    // Le mode Auto crée / déplace des flèches et change de panorama après chaque validation : on le coupe pour que la correction ne touche que la flèche signalée.
    if(autoNavigation){setAutoNavigation(false);setGuide(null);setNavigationDraft(null);setDestinationEditId(null);}
    setClassicDestinationOpen(false);setPreview(false);
    if(is.kind==='comments'){setCommentsOpen(true);return;}
    if(is.kind==='bar-link'||is.kind==='bar-nav'){setPanel('bar');setSelectedBarId(is.barId??'');setSelectedId('');setRightHidden(false);return;}
    if(!is.sceneId){setPanel('panoramas');setRightHidden(false);return;}
    const sceneId=is.sceneId,hs=project.scenes.find(sc=>sc.id===sceneId)?.hotspots.find(h=>h.id===is.hotspotId);
    if(currentSpace&&!visibleIds.has(sceneId))setActiveSpaceId(null);
    setArrivedVia(null);nextArrivalRef.current=null;setActiveId(sceneId);setMode(null);
    setPanel('points');setRightHidden(['nav','dup-nav','photo','video','scene-empty'].includes(is.kind)); // la feuille de réglages ne s'ouvre que si on doit y écrire
    const spotId=is.hotspotId,kind=is.kind;
    if(spotId){
      setSelectedId(spotId);
      if(kind==='nav'){
        // La galerie ne s'ouvre pas toute seule : on voit d'abord le panorama et la bulle, puis on clique sur « Choisir le panorama de destination ».
      }else if(is.kind==='photo'||is.kind==='video')setMediaPicker({sceneId,hotspotId:spotId,type:is.kind==='photo'?'image':'video',fresh:false});
      else window.setTimeout(()=>document.querySelector<HTMLElement>('aside.right input[type="url"],aside.right input[type="text"],aside.right textarea')?.focus(),500);
    }else{
      setSelectedId('');
      if(is.kind==='scene-name')setHubOpen(h=>({...h,scene:'name'}));
      else setHubOpen(h=>({...h,scene:null}));
    }
    if(hs)window.setTimeout(()=>setTurnRequest({n:Date.now(),yaw:hs.yaw,pitch:hs.pitch}),900);
  }
  // Carte « depuis ta dernière visite » (une fois par ouverture, seulement s'il y a quelque chose à dire)
  const [welcome,setWelcome]=useState<{since:number|null;notifs:number;comments:number;errors:number}|null>(null);
  const welcomeDone=useRef(false);
  useEffect(()=>{
    if(!ready||welcomeDone.current)return;
    welcomeDone.current=true;
    const key='nvstudio-lastvisit:'+(project.name||'projet');
    let since:number|null=null;try{since=Number(localStorage.getItem(key))||null;}catch{/* rien */}
    try{localStorage.setItem(key,String(Date.now()));}catch{/* rien */}
    const notifs=since?notifHistory.filter(h=>h.at>since!).length:0;
    const comments=(project.comments??[]).filter(c=>!c.done).length;
    const errors=checkProject(project).filter(i=>i.level==='error').length;
    if(notifs||comments||errors)setWelcome({since,notifs,comments,errors});
  },[ready]); // eslint-disable-line react-hooks/exhaustive-deps
  // Notes reçues en direct : on les garde dans les notes de ce projet (sur cet ordinateur), en plus de la carte affichée.
  const savedNoteIds=useRef(new Set<string>());
  useEffect(()=>{
    for(const n of liveInvite.notesIn){
      if(savedNoteIds.current.has(n.id))continue;
      savedNoteIds.current.add(n.id);
      try{
        const key='nvstudio-notes-local:'+(project.name||'projet');
        const list=JSON.parse(localStorage.getItem(key)||'[]');
        localStorage.setItem(key,JSON.stringify([{id:n.id,body:n.body,shared:true,authorEmail:n.fromEmail,mine:false,createdAt:new Date(n.at).toISOString()},...(Array.isArray(list)?list:[])].slice(0,300)));
      }catch{/* stockage indisponible */}
    }
  },[liveInvite.notesIn,project.name]);
  const live=useLiveSession({
    startAsLeader:liveLeads,projectId:liveProjectId,enabled:!!liveProjectId,label:liveLabel,
    state:{sceneId:activeId,spaceId:activeSpaceId},
    getView:()=>cameraRef.current.sceneId?cameraRef.current:null,
    ui:liveUi,
    onRemoteUi:raw=>applyRemoteUi(raw),
    onRemoteView:v=>{
      // Même panorama seulement : on reproduit l'orientation et le zoom de l'autre personne.
      if(cameraRef.current.sceneId!==v.sceneId)return;
      setTurnRequest({n:Date.now(),yaw:v.yaw,pitch:v.pitch,zoom:v.zoom,fast:true});
    },
    onRemoteState:remote=>{
      const current=projectRef.current;
      const space=remote.spaceId?(current.spaces??[]).find(sp=>sp.id===remote.spaceId):null;
      if(remote.spaceId&&!space)return;                 // espace pas (encore) présent dans ma copie
      if(!current.scenes.some(sc=>sc.id===remote.sceneId))return;
      setActiveSpaceId(space?.id??null);setActiveId(remote.sceneId);setSelectedId('');
    }
  });
  function applyRemoteUi(raw:string){
    let u:{tm?:boolean;rh?:boolean;sp?:boolean;nd?:boolean;hub?:Record<string,string|null>;sk?:boolean;cl?:boolean;pv?:boolean;g?:string|null;b?:string;s?:string;p?:PanelTab;i?:string|null;f?:{t:string;u:string}|null;im?:string|null;vi?:string|null};
    try{u=JSON.parse(raw);}catch{return;}
    const current=projectRef.current;
    const findHotspot=(id:string|null|undefined)=>id?current.scenes.flatMap(sc=>sc.hotspots).find(h=>h.id===id)??null:null;
    // Tout l'écran de l'autre : rideau des outils, feuille de réglages, rubriques ouvertes, menus…
    if(typeof u.tm==='boolean')setToolsMenuOpen(u.tm);
    if(typeof u.rh==='boolean')setRightHidden(u.rh);
    if(typeof u.sp==='boolean')setSpacesDrawerOpen(u.sp);
    if(typeof u.nd==='boolean')setNavigationDrawerOpen(u.nd);
    if(u.hub&&typeof u.hub==='object')setHubOpen(Object.fromEntries(Object.entries(u.hub).filter(([,v])=>v===null||typeof v==='string').map(([k,v])=>[k,v as string|null])));
    if(typeof u.sk==='boolean')setSkinsOpen(u.sk);
    if(typeof u.cl==='boolean')setClientOpen(u.cl);
    setPreview(!!u.pv);
    setGalleryOpen(u.pv&&u.g&&current.bottomBar.some(b=>b.id===u.g)?u.g:null);
    setSelectedBarId(u.b&&current.bottomBar.some(b=>b.id===u.b)?u.b:'');
    if(u.p&&['points','panoramas','bar','general'].includes(u.p as string))setPanel(u.p);
    // Fenêtre d'information : soit un bouton de la barre du bas, soit un point du panorama (toujours relus dans MA copie du projet).
    const bar=u.i?current.bottomBar.find(b=>b.id===u.i):null;
    if(bar)setInfo({id:bar.id,type:'information',title:bar.title,titleTranslations:bar.titleTranslations,text:bar.text,translations:bar.translations,target:'',yaw:0,pitch:0});
    else setInfo(findHotspot(u.i));
    const safe=u.f?safeLink(u.f.u):null;
    setFrame(u.f&&safe&&/^https:\/\//i.test(safe)?{title:String(u.f.t).slice(0,120),url:safe}:null);
    setImageZoom(findHotspot(u.im));
    setVideoZoom(findHotspot(u.vi));
  }
  const toolsMenuRef=useRef<HTMLDivElement>(null);
  const fsToolsRef=useRef<HTMLDivElement>(null);
  const toolOptions:Array<{key:PanelTab;label:string}>=[
    {key:'panoramas',label:'Panoramas'},
    {key:'plan',label:'Plan de la visite'},
    {key:'points',label:selectedId?'Inspecteur · Scène & Points':'Scène & Points'},
    {key:'bar',label:'Barre du bas'},
    {key:'icons',label:'Mes icônes'},
    {key:'intro',label:'Intro'},
    {key:'elements',label:'Éléments'},
    {key:'medialib',label:'Photos & Vidéos'},
    {key:'music',label:'Musique'},
    {key:'settings',label:'Paramètres de la visite'},
    {key:'client',label:'Clients'}
  ];
  // Ordre des outils dans la fenêtre « quatre carrés » : réglable par glisser-déposer, mémorisé sur cet ordinateur.
  const TOOL_KEYS=['settings','plan','spaces','panoramas','points','bar','icons','skins','vrmenu','intro','elements','medialib','music','client','notes','comments'];
  const [toolOrder,setToolOrder]=useState<string[]>(()=>{
    try{
      const saved=JSON.parse(localStorage.getItem('nvstudio-tools-order')||'[]') as unknown;
      const known=Array.isArray(saved)?saved.filter((k):k is string=>typeof k==='string'&&TOOL_KEYS.includes(k)):[];
      return [...new Set([...(known.includes('settings')?[]:['settings']),...(known.includes('plan')?[]:['plan']),...known,...TOOL_KEYS])];
    }catch{return TOOL_KEYS;}
  });
  const saveToolOrder=(order:string[])=>{try{localStorage.setItem('nvstudio-tools-order',JSON.stringify(order));}catch{/* ordre non mémorisé */}};
  // Glisser-déposer des tuiles (ordinateur uniquement : pas de déplacement sur mobile / écran tactile).
  const canDragTools=typeof window!=='undefined'&&!window.matchMedia('(max-width:820px),(pointer:coarse)').matches;
  function toolMeta(key:string):{label:string;icon:ReactNode;tone:string;active:boolean;badge?:number;run:()=>void}|null{
    const ic=22;
    if(key==='spaces')return {label:'Espaces',icon:<Layers size={ic}/>,tone:'#4f7cff',active:spacesDrawerOpen,badge:(project.spaces?.length??0)+1,
      run:()=>{leaveTools();setSpacesDrawerOpen(open=>!open);}};
    if(key==='plan')return {label:'Plan',icon:<MapIcon size={ic}/>,tone:'#20b2aa',active:!rightHidden&&panel==='plan',badge:plansInSpace(project,(project.spaces??[]).find(sp=>sp.id===activeSpaceId)??null).length||undefined,
      run:()=>toggleToolPanel('plan' as PanelTab)};
    // Même accès que « Skins » dans le menu principal : choix des thèmes glossy et des modèles.
    if(key==='skins')return {label:'Skins',icon:<Palette size={ic}/>,tone:'#2fbf8f',active:skinsOpen,run:()=>{leaveTools();setSkinsOpen(true);}};
    // Interface jaune du casque : boutons et actions, enregistrés avec la visite.
    if(key==='vrmenu')return {label:'Vue casque',icon:<Eye size={ic}/>,tone:'#e1a525',active:vrMenuOpen,run:()=>{leaveTools();setVrMenuOpen(true);}};
    if(key==='notes')return {label:'Notes',icon:<StickyNote size={ic}/>,tone:'#e3b341',active:false,run:()=>{leaveTools();setRightHidden(true);setNotesOpen(true);}};
    if(key==='comments')return {label:'Commentaires',icon:<MessageSquarePlus size={ic}/>,tone:'#ff9f43',active:false,badge:(project.comments??[]).filter(c=>!c.done).length||undefined,run:()=>{leaveTools();setRightHidden(true);setCommentsOpen(true);}};
    const option=toolOptions.find(item=>item.key===key);
    if(!option)return null;
    const look:Record<string,{icon:ReactNode;tone:string}>={
      settings:{icon:<SettingsIcon size={ic}/>,tone:'#42c6b7'},plan:{icon:<MapIcon size={ic}/>,tone:'#20b2aa'},panoramas:{icon:<Images size={ic}/>,tone:'#ff8a3d'},points:{icon:<PinIcon size={ic}/>,tone:'#2fbf8f'},bar:{icon:<PanelBottom size={ic}/>,tone:'#a468f0'},
      icons:{icon:<Star size={ic}/>,tone:'#f0b429'},intro:{icon:<Play size={ic}/>,tone:'#ef5b7b'},elements:{icon:<Plus size={ic}/>,tone:'#2bb3d6'},
      medialib:{icon:<Images size={ic}/>,tone:'#3ec6a8'},music:{icon:<Music size={ic}/>,tone:'#ff6fa8'},client:{icon:<Smile size={ic}/>,tone:'#7f8cff'}
    };
    const l=look[key]??{icon:<Layers size={ic}/>,tone:'#4f7cff'};
    return {label:key==='points'?'Scène & Points':option.label,icon:l.icon,tone:l.tone,active:!rightHidden&&panel===key,run:()=>toggleToolPanel(key as PanelTab)};
  }
  // Éditer · tous les outils · Aperçu (en-tête, et en haut du plein écran de création)
  function modeSwitch(fs:boolean){
    return (
        <div className="mode-switch-group" role="group" aria-label="Mode de l'éditeur">
        <button type="button" className={'mode-btn '+(!preview?'is-active':'')}
          aria-pressed={!preview}
          onClick={()=>{if(preview){setPreview(false);setIntroVisible(false);}}}>
          <Edit3 size={15}/> Éditer
        </button>
        <button type="button" className={'mode-btn nv-v3-grid-btn'+(toolsMenuOpen?' is-open':'')}
          aria-label="Tous les outils : panoramas, scène, barre, icônes, enregistrer, exporter" title="Tous les outils · Enregistrer · Publier · Exporter"
          aria-haspopup="dialog" aria-expanded={toolsMenuOpen} aria-controls={fs?'nv-fs-tools-options':'nv-header-tools-options'}
          onClick={()=>setToolsMenuOpen(open=>!open)}>
          <LayoutGrid size={20}/>
          {project!==savedRef.current&&<i aria-hidden="true" className="nv-unsaved-dot"/>}
        </button>
        <button type="button" className={'mode-btn '+(preview?'is-active':'')}
          aria-pressed={preview}
          title="Visualiser la visite depuis la scène affichée"
          onClick={()=>{
            if(!preview){setIntroVisible(false);setPreview(true);setMode(null);setSelectedId('');}
          }}>
          <Eye size={15}/> Aperçu
        </button>
      </div>
    );
  }
  // Glisser-déposer des tuiles d'outils : état et références au niveau racine pour éviter tout démontage React
  const [dragTool,setDragTool]=useState<string|null>(null);
  const [justDroppedTool,setJustDroppedTool]=useState<string|null>(null);
  const latestToolOrderRef=useRef<string[]>(toolOrder);
  latestToolOrderRef.current=toolOrder;
  const hasDraggedToolRef=useRef(false);
  const disposeToolDragRef=useRef<(()=>void)|null>(null);
  useEffect(()=>()=>disposeToolDragRef.current?.(),[]);

  function handleToolPointerDown(event:React.PointerEvent<HTMLDivElement>,id:string){
    if(event.button!==0||!canDragTools||disposeToolDragRef.current)return;
    const tileWrap=event.currentTarget;
    const container=tileWrap.closest<HTMLElement>('.nv-tiles');
    if(!container)return;

    const original=[...latestToolOrderRef.current];
    let liveOrder=[...original];
    const initial=tileWrap.getBoundingClientRect();
    const startX=event.clientX;
    const startY=event.clientY;
    const offsetX=startX-initial.left;
    const offsetY=startY-initial.top;

    const items=()=>[...container.querySelectorAll<HTMLElement>(':scope > .nv-tile-wrap[data-tool-key]')];
    // Capture la géométrie fixe des cases de la grille avant tout mouvement
    let slotRects=items().map(el=>el.getBoundingClientRect());

    let moved=false;
    let ghost:HTMLElement|null=null;
    let disposed=false;
    let currentX=startX;
    let currentY=startY;

    const moveTilesToIndex=(targetIdx:number)=>{
      const currentIdx=liveOrder.indexOf(id);
      if(currentIdx<0||targetIdx<0||currentIdx===targetIdx)return;
      const targetKey=liveOrder[targetIdx];
      if(!targetKey||targetKey===id)return;

      // 1. Mesure la position visuelle exacte de chaque tuile à cet instant précis
      const beforeMap=new Map<string,DOMRect>();
      for(const it of items()){
        const k=it.dataset.toolKey;
        if(k)beforeMap.set(k,it.getBoundingClientRect());
      }

      // 2. Met à jour l'ordre de manière synchrone (sans clignotement d'image)
      liveOrder=reorderItems(liveOrder,id,targetKey,k=>k);
      latestToolOrderRef.current=liveOrder;
      flushSync(()=>{
        setToolOrder(liveOrder);
      });

      // 3. Anime en douceur (FLIP) chaque tuile déplacée depuis son ancienne position visuelle
      if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
        for(const item of items()){
          const k=item.dataset.toolKey;
          if(!k||k===id)continue;
          item.getAnimations().forEach(a=>a.cancel());
          const oldRect=beforeMap.get(k);
          if(!oldRect)continue;
          const newRect=item.getBoundingClientRect();
          const dx=oldRect.left-newRect.left;
          const dy=oldRect.top-newRect.top;
          if(Math.abs(dx)>1||Math.abs(dy)>1){
            item.animate([
              {transform:`translate3d(${dx}px,${dy}px,0)`},
              {transform:'translate3d(0,0,0)'}
            ],{
              duration:220,
              easing:'cubic-bezier(0.2,0,0,1)'
            });
          }
        }
      }
    };

    const update=()=>{
      if(!moved||disposed)return;
      if(ghost){
        ghost.style.transform=`translate3d(${currentX-offsetX}px,${currentY-offsetY}px,0) scale(1.06)`;
      }

      // Détecte dans quelle case fixe de la grille se trouve le pointeur (zone centrale 72% pour éviter toute oscillation)
      let targetIdx=-1;
      for(let i=0;i<slotRects.length;i++){
        const r=slotRects[i];
        const padX=r.width*0.14;
        const padY=r.height*0.14;
        if(
          currentX>=r.left+padX&&
          currentX<=r.right-padX&&
          currentY>=r.top+padY&&
          currentY<=r.bottom-padY
        ){
          targetIdx=i;
          break;
        }
      }

      if(targetIdx!==-1&&targetIdx!==liveOrder.indexOf(id)){
        moveTilesToIndex(targetIdx);
      }
    };

    const handlePointerMove=(e:PointerEvent)=>{
      currentX=e.clientX;
      currentY=e.clientY;

      if(!moved&&Math.hypot(currentX-startX,currentY-startY)>5){
        moved=true;
        hasDraggedToolRef.current=true;
        // Recalcule les cases au démarrage effectif du glissement
        slotRects=items().map(el=>{
          el.getAnimations().forEach(a=>a.cancel());
          return el.getBoundingClientRect();
        });

        const tileBtn=tileWrap.querySelector('.nv-app-tile') as HTMLElement;
        ghost=(tileBtn?tileBtn.cloneNode(true):tileWrap.cloneNode(true)) as HTMLElement;
        ghost.className='nv-app-tile nv-tile-ghost';
        ghost.removeAttribute('id');
        ghost.setAttribute('aria-hidden','true');
        Object.assign(ghost.style,{
          position:'fixed',
          left:'0',
          top:'0',
          width:`${initial.width}px`,
          height:`${initial.height}px`,
          transform:`translate3d(${currentX-offsetX}px,${currentY-offsetY}px,0) scale(1.06)`,
          pointerEvents:'none',
          zIndex:'99999',
          margin:'0',
          boxShadow:'0 20px 48px rgba(0,0,0,0.8), 0 0 0 2px #4bebde, 0 0 24px rgba(75,235,222,0.45)',
          borderRadius:'22px',
          willChange:'transform'
        });
        document.body.appendChild(ghost);
        document.body.classList.add('nv-is-sorting');
        setDragTool(id);
      }

      if(moved){
        e.preventDefault();
        update();
      }
    };

    const cleanup=()=>{
      disposed=true;
      disposeToolDragRef.current=null;
      window.removeEventListener('pointermove',handlePointerMove,{capture:true});
      window.removeEventListener('pointerup',handlePointerUp,true);
      window.removeEventListener('pointercancel',handlePointerCancel,true);
      window.removeEventListener('keydown',handleKeyDownGlobal,true);
      document.body.classList.remove('nv-is-sorting');
    };

    const finish=(rollback=false)=>{
      if(disposed)return;
      cleanup();

      if(!moved){
        hasDraggedToolRef.current=false;
        return;
      }

      if(rollback){
        liveOrder=[...original];
        latestToolOrderRef.current=liveOrder;
        setToolOrder(liveOrder);
        ghost?.remove();
        setDragTool(null);
        hasDraggedToolRef.current=false;
        return;
      }

      const finalIdx=liveOrder.indexOf(id);
      const finalRect=slotRects[finalIdx]??container.querySelector<HTMLElement>(`.nv-tile-wrap[data-tool-key="${id}"]`)?.getBoundingClientRect();
      if(ghost&&finalRect){
        const g=ghost;
        const land=g.animate([
          {transform:`translate3d(${currentX-offsetX}px,${currentY-offsetY}px,0) scale(1.06)`},
          {transform:`translate3d(${finalRect.left}px,${finalRect.top}px,0) scale(1)`}
        ],{
          duration:160,
          easing:'cubic-bezier(0.2,0,0,1)'
        });
        land.onfinish=()=>{
          g.remove();
          setDragTool(null);
          setJustDroppedTool(id);
          setTimeout(()=>{
            setJustDroppedTool(null);
            hasDraggedToolRef.current=false;
          },380);
        };
      }else{
        ghost?.remove();
        setDragTool(null);
        hasDraggedToolRef.current=false;
      }

      saveToolOrder(liveOrder);
    };

    const handlePointerUp=()=>finish(false);
    const handlePointerCancel=()=>finish(true);
    const handleKeyDownGlobal=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){
        e.preventDefault();
        finish(true);
      }
    };

    disposeToolDragRef.current=cleanup;
    window.addEventListener('pointermove',handlePointerMove,{capture:true,passive:false});
    window.addEventListener('pointerup',handlePointerUp,true);
    window.addEventListener('pointercancel',handlePointerCancel,true);
    window.addEventListener('keydown',handleKeyDownGlobal,true);
  }

  function handleToolKeyDown(e:React.KeyboardEvent,key:string){
    if(!canDragTools)return;
    if(e.altKey||e.ctrlKey){
      let delta=0;
      if(e.key==='ArrowLeft'||e.key==='ArrowUp')delta=-1;
      else if(e.key==='ArrowRight'||e.key==='ArrowDown')delta=1;

      if(delta!==0){
        e.preventDefault();
        const currentIndex=toolOrder.indexOf(key);
        const targetIndex=currentIndex+delta;
        if(targetIndex>=0&&targetIndex<toolOrder.length){
          const targetKey=toolOrder[targetIndex];
          setToolOrder(order=>{
            const next=reorderItems(order,key,targetKey,k=>k);
            saveToolOrder(next);
            return next;
          });
          setJustDroppedTool(key);
          setTimeout(()=>setJustDroppedTool(null),450);
        }
      }
    }
  }

  // Rideau des outils (tuiles) : sous l'en-tête, ou dans le plein écran de création.
  function toolsCurtain(fs:boolean){
    return (
        <div id={fs?'nv-fs-tools-options':'nv-header-tools-options'} className={'nv-tools-curtain'+(toolsMenuOpen?' is-open':'')+(fs?' nv-in-fullscreen':'')} role="dialog" aria-label="Tous les outils" aria-hidden={!toolsMenuOpen}>
          <div className="nv-tools-curtain-inner">
            <div className="nv-tiles-title">Tes outils<small>{canDragTools?'Glisse une tuile pour la ranger où tu veux (ou Alt + Flèches)':'Touche une tuile pour l’ouvrir'}</small></div>
            <div className={'nv-tiles'+(dragTool?' nv-tiles-is-dragging':'')} role="list">
              {toolOrder.map(key=>{
                const meta=toolMeta(key);
                if(!meta)return null;
                const isDragging=dragTool===key;
                const isDropped=justDroppedTool===key;
                return (
                  <div key={key} data-tool-key={key} role="listitem"
                    className={'nv-tile-wrap'+(isDragging?' is-dragging':'')+(isDropped?' is-just-dropped':'')}
                    onPointerDown={e=>handleToolPointerDown(e,key)}
                    onKeyDown={e=>handleToolKeyDown(e,key)}>
                    <button type="button" className={'nv-app-tile'+(meta.active?' is-active':'')} aria-pressed={meta.active}
                      onClick={()=>{
                        if(hasDraggedToolRef.current)return;
                        if(fs)runFromFullscreen(key,meta.run);
                        else meta.run();
                      }}
                      tabIndex={toolsMenuOpen?0:-1}
                      style={{'--tile-tone':meta.tone} as CSSProperties}
                      title={canDragTools?`${meta.label} · Glisser pour déplacer (ou Alt+Flèches)`:meta.label}>
                      {canDragTools&&<span className="nv-tile-drag-handle" aria-hidden="true" title="Glisser pour réorganiser"><GripVertical size={13}/></span>}
                      <span className="nv-app-tile-icon">{meta.icon}</span>
                      <span className="nv-app-tile-label">{meta.label}</span>
                      {meta.badge!==undefined&&<small className="nv-app-tile-badge">{meta.badge}</small>}
                    </button>
                  </div>
                );
              })}
            </div>
            {!fs&&<>
            <div className="nv-tiles-title nv-tiles-title-second">Fichier et équipe</div>
            <div className="nv-tiles">
              <div className="nv-tile-wrap"><button type="button" tabIndex={toolsMenuOpen?0:-1} className={'nv-app-tile nv-tile-save'+(project!==savedRef.current?' is-dirty':'')}
                disabled={!ready||savingManually||!!lock} onClick={()=>{setToolsMenuOpen(false);void manualSave();}} title="Enregistrer (⌘S / Ctrl+S)"
                style={{'--tile-tone':'#e8873a'} as CSSProperties}>
                <span className="nv-app-tile-icon"><Save size={22}/></span><span className="nv-app-tile-label">{savingManually?'Enregistrement…':'Enregistrer'}</span>
                {!savingManually&&project!==savedRef.current&&<i aria-hidden="true" className="nv-unsaved-dot"/>}
              </button></div>
              <div className="nv-tile-wrap"><button type="button" tabIndex={toolsMenuOpen?0:-1} className="nv-app-tile" disabled={savingManually||!ready||!!lock||!project.scenes.length}
                onClick={()=>{setToolsMenuOpen(false);setPublishConfirm(true);}} style={{'--tile-tone':'#e05d44'} as CSSProperties}>
                <span className="nv-app-tile-icon"><Upload size={22}/></span><span className="nv-app-tile-label">Publier</span></button></div>
              <div className="nv-tile-wrap"><button type="button" tabIndex={toolsMenuOpen?0:-1} className="nv-app-tile" disabled={exporting||!visibleScenes.length}
                title="Exporter un dossier HTML / ZIP : tu choisis le projet complet ou un seul espace"
                onClick={()=>{setToolsMenuOpen(false);setExportDialog({spaceId:currentSpace?.id??null});}} style={{'--tile-tone':'#3aa0d8'} as CSSProperties}>
                <span className="nv-app-tile-icon"><Download size={22}/></span><span className="nv-app-tile-label">{exporting?'Export…':'Exporter ZIP'}</span></button></div>
              <div className="nv-tile-wrap"><button type="button" tabIndex={toolsMenuOpen?0:-1} className="nv-app-tile" disabled={!ready}
                title="Télécharger uniquement le fichier HTML NovaVisio : il affiche toujours la dernière version publiée"
                onClick={()=>{setToolsMenuOpen(false);void exportNovaVisioHtml();}} style={{'--tile-tone':'#1fb5a8'} as CSSProperties}>
                <span className="nv-app-tile-icon"><Globe size={22}/></span><span className="nv-app-tile-label">HTML NovaVisio</span></button></div>
              <div className="nv-tile-wrap"><button type="button" tabIndex={toolsMenuOpen?0:-1} className={'nv-app-tile'+(liveProjectId?' is-active':'')}
                onClick={()=>{leaveTools();setRightHidden(true);if(liveProjectId)void toggleLive();else setLiveDialogOpen(true);}} style={{'--tile-tone':'#27ae60'} as CSSProperties}
                title="Travailler à deux sur le même projet : voir la souris de l’autre et se passer la main">
                <span className="nv-app-tile-icon"><Users size={22}/></span><span className="nv-app-tile-label">Écran partagé</span></button></div>
              <div className="nv-tile-wrap nv-tile-hand"><WriteHand onStatus={setStatus}/></div>
            </div>
            </>}
          </div>
        </div>
    );
  }
  // Dans le plein écran : Panoramas, Scène & Points et Barre du bas s'ouvrent sur place ; les autres outils sortent du plein écran.
  function runFromFullscreen(key:string,run:()=>void){
    setToolsMenuOpen(false);
    if(key==='panoramas'){setFullscreenToolsOpen(false);setFullscreenCommandDrawerOpen(true);setFullscreenGalleryOpen(true);return;}
    if(key==='points'){setFullscreenToolsTab('point');setFullscreenToolsOpen(true);setFullscreenGalleryOpen(false);return;}
    if(key==='bar'){setFullscreenToolsTab('bar');setFullscreenToolsOpen(true);setFullscreenGalleryOpen(false);return;}
    void toggleCreationFullscreen().then(()=>run());
  }
  function togglePanoramaSettings(){
    if(creationFullscreen){
      const open=!(fullscreenToolsOpen&&fullscreenToolsTab==='scene');
      setFullscreenToolsTab('scene');setFullscreenToolsOpen(open);
      setFullscreenCommandDrawerOpen(false);setFullscreenGalleryOpen(false);
      setToolsMenuOpen(false);setMode(null);return;
    }
    if(!rightHidden&&panel==='points'&&!selectedId){setRightHidden(true);return;}
    returnTo.current=null;setToolsMenuOpen(false);
    setSelectedId('');setSelectedBarId('');setMode(null);
    setPanel('points');setHubOpen(h=>({...h,scene:null}));setRightHidden(false);
  }
  function editSettingsButton(){
    const open=()=>{
      leaveTools();setSettingsOpen(false);setPanel('settings');setRightHidden(false);
      setSelectedId('');setSelectedBarId('');setMode(null);
    };
    if(creationFullscreen)runFromFullscreen('settings',open);else open();
  }
  function toggleToolPanel(next:PanelTab){
    leaveTools();
    if(!rightHidden&&panel===next){setRightHidden(true);return;}
    setPanel(next);
    setRightHidden(false);
    if(next==='panoramas'){setSelectedId('');setMode(null);}
  }
  useEffect(()=>{
    if(!toolsMenuOpen)return;
    const outside=(event:PointerEvent)=>{const t=event.target as Node;if(!toolsMenuRef.current?.contains(t)&&!fsToolsRef.current?.contains(t))setToolsMenuOpen(false);};
    const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setToolsMenuOpen(false);};
    document.addEventListener('pointerdown',outside);
    document.addEventListener('keydown',close);
    return ()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',close);};
  },[toolsMenuOpen]);
  const galleryOrientationRef=useRef<Record<string,{yaw:number;pitch:number;zoom:number}>>({});
  const [fullscreenGalleryLayout,setFullscreenGalleryLayout]=useState<'grid'|'list'>(()=>{try{return localStorage.getItem('nvstudio-gallery-layout')==='list'?'list':'grid';}catch{return 'grid';}});
  const [panoramasLayout,setPanoramasLayout]=useState<'grid'|'list'>(()=>{try{return localStorage.getItem('nvstudio-panorama-layout')==='grid'?'grid':'list';}catch{return 'list';}});
  const [showArrivalCrosshair,setShowArrivalCrosshair]=useState(false);
  const [arrivalSaving,setArrivalSaving]=useState(false);
  const arrivalSavingRef=useRef(false);
  useEffect(()=>{try{localStorage.setItem('nvstudio-gallery-layout',fullscreenGalleryLayout);}catch{}},[fullscreenGalleryLayout]);
  useEffect(()=>{try{localStorage.setItem('nvstudio-panorama-layout',panoramasLayout);}catch{}},[panoramasLayout]);
  useEffect(()=>{if(fullscreenToolsOpen&&fullscreenCommandDrawerOpen)setFullscreenCommandDrawerOpen(false);},[fullscreenToolsOpen,fullscreenCommandDrawerOpen]);
  useEffect(()=>{if(!creationFullscreen)setShowArrivalCrosshair(false);},[creationFullscreen]);
  const [fullscreenToolsTab,setFullscreenToolsTab]=useState<'point'|'bar'|'scene'>('point');
  const [creationFullscreenFallback,setCreationFullscreenFallback]=useState(false);
  const creationFallbackRef=useRef(false);
  useEffect(()=>{
    const syncFullscreen=()=>{
      if(document.fullscreenElement===viewAreaRef.current){
        setCreationFullscreen(true);
      } else if(!creationFallbackRef.current){
        // The user pressed Escape or used the browser's own fullscreen exit.
        setCreationFullscreen(false);
        setCreationFullscreenFallback(false);
      }
    };
    const exitFallbackOnEscape=(event:KeyboardEvent)=>{
      if(event.key==='Escape'&&creationFallbackRef.current){
        creationFallbackRef.current=false;
        setCreationFullscreen(false);
        setCreationFullscreenFallback(false);
      }
    };
    document.addEventListener('fullscreenchange',syncFullscreen);
    document.addEventListener('keydown',exitFallbackOnEscape);
    return ()=>{
      document.removeEventListener('fullscreenchange',syncFullscreen);
      document.removeEventListener('keydown',exitFallbackOnEscape);
    };
  },[]);
  async function toggleCreationFullscreen(){
    const node=viewAreaRef.current;
    if(!node)return;
    if(creationFullscreen){
      if(document.fullscreenElement===node){
        try{await document.exitFullscreen();}
        catch{setStatus('Impossible de quitter le plein écran');}
      }else{
        creationFallbackRef.current=false;
        setCreationFullscreenFallback(false);
        setCreationFullscreen(false);
      }
      return;
    }
    // Only the 360° creation is expanded: no Studio header, sidebars or footer.
    // Do not force preview mode: editing handles must remain usable.
    try{
      if(!node.requestFullscreen)throw Error('Fullscreen API unavailable');
      await node.requestFullscreen();
      creationFallbackRef.current=false;
      setCreationFullscreenFallback(false);
      setCreationFullscreen(true);
    }catch{
      // CSS fallback for browsers without the Fullscreen API (some mobile Safari).
      creationFallbackRef.current=true;
      setCreationFullscreenFallback(true);
      setCreationFullscreen(true);
    }
  }
  const cameraRef=useRef({sceneId:'',yaw:0,pitch:0,zoom:60});
  const savedRef=useRef<StudioProject|null>(null);
  const baseRef=useRef<string|null>(null);          // date de la version enregistrée que cet onglet connaît
  const projectRef=useRef<StudioProject>(project);  // dernier état du projet, sauvegardé uniquement sur demande
  const rawStoredRef=useRef<unknown>(null);          // projet enregistré tel quel, si illisible
  const savingRef=useRef(false);
  const lockRef=useRef<unknown>(null);
  const channelRef=useRef<BroadcastChannel|null>(null);
  const [lock,setLock]=useState<{kind:'unreadable';reason:string}|{kind:'conflict'}|{kind:'saveError';reason:string}|null>(null);
  // Ne pas supprimer le verrou de conflit : les sessions Cloud sont isolées
  // de la sauvegarde locale, mais un conflit local réel reste bloquant.
  projectRef.current=project;
  // Enregistrement automatique discret : dès la 5e modification non enregistrée, on sauvegarde en arrière-plan (sans fenêtre ni blocage).
  const autoSaveBlock=useRef(0);
  useEffect(()=>{
    if(!ready||lock||savingManually)return;
    if(histRef.current.ops<5||project===savedRef.current||Date.now()<autoSaveBlock.current)return;
    const t=window.setTimeout(async()=>{
      if(projectRef.current===savedRef.current)return;
      const ok=await manualSave(false,true);
      if(!ok)autoSaveBlock.current=Date.now()+90_000;
    },2500);
    return ()=>window.clearTimeout(t);
  },[project,ready,savingManually]); // eslint-disable-line react-hooks/exhaustive-deps
  function applyHistory(target:StudioProject,label:string){
    setProjectRaw(target);setHistTick(t=>t+1);histRef.current.last=0;
    if(!target.scenes.some(sc=>sc.id===activeId))setActiveId(startSceneId(target.scenes));
    if(selectedId&&!target.scenes.some(sc=>sc.hotspots.some(h=>h.id===selectedId)))setSelectedId('');
    setStatus(label);
  }
  function undo(){const h=histRef.current,prev=h.past.pop();if(!prev)return;h.future.push(projectRef.current);applyHistory(prev,'Action annulée · Ctrl+Maj+Z pour la rétablir');}
  function redo(){const h=histRef.current,nxt=h.future.pop();if(!nxt)return;h.past.push(projectRef.current);applyHistory(nxt,'Action rétablie');}
  const undoRef=useRef(undo),redoRef=useRef(redo);undoRef.current=undo;redoRef.current=redo;
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if(!(e.ctrlKey||e.metaKey)||e.altKey)return;
      const t=e.target as HTMLElement|null;
      if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT'||t.isContentEditable))return;
      if(document.querySelector('.nv-shot-overlay'))return;
      const k=e.key.toLowerCase();
      if(k==='z'&&!e.shiftKey){e.preventDefault();undoRef.current();}
      else if((k==='z'&&e.shiftKey)||k==='y'){e.preventDefault();redoRef.current();}
    };
    window.addEventListener('keydown',onKey);return ()=>window.removeEventListener('keydown',onKey);
  },[]);
  lockRef.current=lock;
  function adopt(p:StudioProject,stamp:string|null){
    setPreparationOpen(false);
    setActiveSpaceId(null);setSpaceManagerOpen(false);
    const upgraded=ensureFrameReferences(validateProject(p),viewAreaRef.current?.clientHeight||550);
    savedRef.current=upgraded;baseRef.current=stamp;
    resetProject(upgraded);setActiveId(startSceneId(upgraded.scenes));setSelectedId('');setMode(null);
  }
  useEffect(()=>{
    let cancelled=false;
    const restore=async()=>{
      // A linked cloud project always takes precedence over the older "current"
      // IndexedDB project; otherwise refreshing reopens an unrelated customer.
      const link=readLink();
      if(link){
        setStatus('Réouverture du dernier projet Cloud…');
        try{
          const {supabase,openCloudProject,cloudConfigured}=await import('./cloud');
          if(!cloudConfigured)throw new Error('Cloud non configuré');
          const {data:{session},error}=await supabase().auth.getSession();
          if(cancelled)return;
          if(error)throw error;
          if(!session){
            setStatus('Connecte-toi au Cloud pour retrouver ton dernier projet · bouton Cloud.');
            setReady(true);
            return;
          }
          // Juste après une mise à jour le réseau / la session peut mettre un instant : on réessaie seul avant d'afficher une erreur.
          let loaded:Awaited<ReturnType<typeof openCloudProject>>|null=null,lastError:unknown=null;
          for(let attempt=0;attempt<3&&!loaded;attempt++){
            if(attempt>0){setStatus('Réouverture du projet Cloud… nouvel essai '+(attempt+1)+'/3');await new Promise(r=>window.setTimeout(r,1500*attempt));if(cancelled)return;}
            try{loaded=await openCloudProject(link.projectId,message=>{if(!cancelled)setStatus(message);});}catch(err){lastError=err;}
          }
          if(!loaded)throw lastError??new Error('Réouverture impossible');
          if(cancelled)return;
          adopt(loaded.project,null);
          writeLink(loaded.link);
          setStatus('Projet Cloud restauré : '+loaded.project.name);
          setReady(true);
          return;
        }catch(e){
          if(cancelled)return;
          // Never silently switch to an unrelated locally stored project.
          setStatus('Impossible de rouvrir le dernier projet Cloud : '+(e instanceof Error?e.message:String(e))+' · Ouvre Cloud pour choisir une sauvegarde.');
          setReady(true);
          return;
        }
      }
      try{
        const p=await loadProject();
        if(cancelled)return;
        if(p){
          rawStoredRef.current=p;
          try{adopt(p,p.updatedAt??null);rawStoredRef.current=null;}
          catch(e){
            setLock({kind:'unreadable',reason:e instanceof Error?e.message:String(e)});
            setReady(true);setStatus('Projet local illisible — enregistrement suspendu');return;
          }
        }
        setReady(true);setStatus('Prêt');
      }catch(e){
        if(cancelled)return;
        setLock({kind:'unreadable',reason:'Stockage du navigateur indisponible ('+(e instanceof Error?e.message:String(e))+')'});
        setReady(true);setStatus('Stockage indisponible — enregistrement suspendu');
      }
    };
    void restore();
    return ()=>{cancelled=true;};
  },[]);
  // Enregistrement : jamais pendant un verrou, jamais en écrasant le travail d'un autre onglet.
  async function persist(snapshot:StudioProject,force=false):Promise<boolean>{
    if(savingRef.current)return false;
    savingRef.current=true;
    setStatus('Sauvegarde…');
    try{
      const stamp=await saveProject(snapshot,baseRef.current,force);
      baseRef.current=stamp;savedRef.current=snapshot;
      setStatus('Sauvegardé localement');
      setLock(l=>l&&l.kind!=='unreadable'?null:l);
      try{channelRef.current?.postMessage({type:'saved',stamp});}catch{/* ignoré */}
      // Une modification pendant l'écriture reste non enregistrée.
      // L'utilisateur décide du prochain enregistrement avec la disquette.
      return true;
    }catch(e){
      if(e instanceof SaveConflictError){setLock({kind:'conflict'});setStatus('Modifié dans une autre fenêtre');}
      else{setLock({kind:'saveError',reason:e instanceof Error?e.message:String(e)});setStatus('Erreur de sauvegarde');}
      return false;
    }finally{savingRef.current=false;}
  }
  // Sauvegarde volontaire : aucun timer, aucune écriture au changement d'onglet,
  // aucune écriture automatique dans IndexedDB. Avertir seulement si on quitte sans enregistrer.
  useEffect(()=>{
    const onBeforeUnload=(event:BeforeUnloadEvent)=>{
      if(!updateReloadApproved.current&&((ready&&projectRef.current!==savedRef.current)||savingRef.current)){
        event.preventDefault();
        event.returnValue='';
      }
    };
    window.addEventListener('beforeunload',onBeforeUnload);
    return ()=>window.removeEventListener('beforeunload',onBeforeUnload);
  },[ready]);
  // Plusieurs onglets : on est prévenu dès qu'un autre onglet enregistre.
  async function reloadFromStore(){
    try{
      const p=await loadProject();
      if(p){adopt(p,p.updatedAt??null);rawStoredRef.current=null;}
      setLock(null);setStatus('Projet rechargé depuis la version enregistrée');
    }catch(e){setLock({kind:'unreadable',reason:e instanceof Error?e.message:String(e)});}
  }
  useEffect(()=>{
    if(typeof BroadcastChannel==='undefined')return;
    const channel=new BroadcastChannel('novavisio-studio-project');
    channelRef.current=channel;
    channel.onmessage=ev=>{
      // Local changes belong to a different project while a Cloud project is open.
      if(readLink())return;
      if(ev.data?.type!=='saved'||ev.data.stamp===baseRef.current)return;
      if(projectRef.current===savedRef.current)void reloadFromStore(); // aucun travail en cours ici : on se met simplement à jour
      else setLock({kind:'conflict'});                                 // travail non enregistré ici ET modifs ailleurs : on demande
    };
    return ()=>{channel.close();channelRef.current=null;};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  // Cloud en mode manuel : aucun envoi au fil des modifications.
  const cloud=useCloudSync(project,ready&&!lock,(remote,by)=>{
    const up=ensureFrameReferences(remote,viewAreaRef.current?.clientHeight||550);
    resetProject(up);
    setActiveId(id=>up.scenes.some(sc=>sc.id===id)?id:startSceneId(up.scenes));
    setStatus('Projet cloud ouvert : '+(by??'version distante'));
    return up;
  },true);
  const lastAutoPublish=useRef(0);
  async function manualSave(publishing=false,silent=false):Promise<boolean>{
    if(!ready||savingManually||savingRef.current)return false;
    if(lock?.kind==='unreadable'||lock?.kind==='conflict'){
      setStatus('Enregistrement bloqué : vérifie le conflit ou récupère le projet');
      return false;
    }
    const snapshot=projectRef.current;
    setSavingManually(true);
    try{
      if(cloud.signedIn||await cloud.ensureSignedIn()){
        const link=readLink();
        if(link){
          const hand=await getWriteState(link.projectId);
          if(!hand){
            const message='Impossible de vérifier les droits de sauvegarde de cette visite. Par sécurité, aucune modification ne sera envoyée au Cloud.';
            setSaveWarning(message);setStatus(message);return false;
          }
          if(!hand.canWrite){
            const message='Attention, vous n’avez pas la main. '+(hand.holderEmail??'Le propriétaire du projet')+' est la seule personne autorisée à enregistrer cette visite. Demandez la main avant de sauvegarder.';
            setStatus(message);
            window.dispatchEvent(new CustomEvent('nv-write-denied',{detail:{holderEmail:hand.holderEmail}}));
            return false;
          }
        }
        setStatus('Sauvegarde dans Supabase…');
        const synced=await cloud.syncNow(snapshot);
        if(!synced){
          const reason=cloud.getLastError();
          const message='Échec de la sauvegarde Cloud : '+(reason??'synchronisation non confirmée. Vérifie la connexion, les droits et le panneau Cloud.')+' · Tes modifications restent sur cet appareil. Ne ferme pas cette fenêtre avant de les sécuriser.';
          setStatus(message);setSaveWarning(message);
          return false;
        }
        savedRef.current=snapshot;
        // Enregistrer met aussi à jour les liens permanents DÉJÀ actifs (réglable dans « Lien public ») ; jamais de nouveau lien, jamais les liens temporaires.
        const autoRefresh=!publishing&&autoPublishOn()&&!(silent&&Date.now()-lastAutoPublish.current<45_000);
        if(autoRefresh)lastAutoPublish.current=Date.now();
        if(publishing||autoRefresh){
        // Publier actualise explicitement les liens publics actifs :
        // le projet complet et chacun des espaces possèdent leur propre
        // publication stable. Les partages temporaires restent immuables.
        let updated=0;
        const errors:string[]=[];
        const report:{ok:boolean;text:string}[]=[];
        const master=readLink();
        const allTargets=[
          {name:'Projet complet',space:null as StudioSpace|null,link:master},
          ...(snapshot.spaces??[]).map(space=>({
            name:space.name,space,link:readSpaceCloudLink(space.id,'public')
          }))
        ];
        // « Publier » avec un espace sélectionné : on ne publie QUE cet espace (pas le projet complet ni les autres espaces).
        const selectedSpace=publishing?(snapshot.spaces??[]).find(sp=>sp.id===activeSpaceId):undefined;
        const targets=selectedSpace?allTargets.filter(t=>t.space?.id===selectedSpace.id):allTargets;
        for(const target of targets){
          if(!target.link&&target.space){
            if(publishing)report.push({ok:false,text:'Espace « '+target.name+' » : ignoré, aucun lien public enregistré sur cet appareil (publie-le une fois depuis « Lien public » avec cet espace ouvert).'});
            continue;
          }
          try{
            const scoped=projectForSpaceExport(snapshot,target.space,true);
            const run=(link:typeof target.link)=>(target.space||!publishing?refreshActivePublication:publishPermanent)(scoped,link,
              progress=>setStatus('Publication '+target.name+' · '+progress));
            let result;
            try{result=await run(target.link);}
            catch(err){
              // Une autre personne (ou un autre appareil) a ajouté une révision entre-temps : publier ajoute simplement la suivante, rien n'est écrasé.
              const m=err instanceof Error?/révision (\d+) alors que cette copie/.exec(err.message):null;
              if(publishing&&m&&target.link)result=await run({...target.link,revision:Number(m[1])});else throw err;
            }
            if(!result){
              if(publishing)report.push({ok:false,text:target.name+' : aucune publication active à mettre à jour (clique sur « Publier la visite » dans « Lien public »).'});
              continue;
            }
            if(target.space)writeSpaceCloudLink(target.space.id,'public',result.link);
            else writeLink(result.link);
            updated++;
            report.push({ok:true,text:target.name+' : publié · révision '+result.link.revision+' · '+shareUrl(result.publication.token)});
          }catch(error){
            const msg=target.name+' : '+(error instanceof Error?error.message:String(error));
            errors.push(msg);report.push({ok:false,text:msg});
          }
        }
        if(publishing)setPublishReport(report);
        if(errors.length){
          setStatus('Sauvegardé · Publication partielle/échouée : '+errors.join(' | '));
        }else{
          setStatus((synced?'Enregistré dans Supabase':'Enregistré localement · Cloud non synchronisé')+
            (updated?' · '+updated+' lien'+(updated>1?'s':'')+' public'+(updated>1?'s':'')+' actualisé'+(updated>1?'s':''):''));
        }
        }else setStatus('Enregistré dans le Cloud · Cliquez sur Publier pour actualiser la visite en ligne');
      }else{
        if(!silent){setStatus('Cloud déconnecté : connexion nécessaire pour enregistrer ou publier.');setCloudOpen(true);}
        return false;
      }
      if(silent)setStatus('Enregistrement automatique effectué');
      histRef.current.ops=0;setHistTick(t=>t+1);
      return true;
    }catch(error){
      const message='Échec de sauvegarde : '+(error instanceof Error?error.message:String(error))+'. Les modifications locales ne sont pas supprimées.';
      setStatus(message);setSaveWarning(message);return false;
    }finally{setSavingManually(false);}
  }
  useEffect(()=>{
    const onSaveShortcut=(event:KeyboardEvent)=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='s'){
        event.preventDefault();
        void manualSave();
      }
    };
    window.addEventListener('keydown',onSaveShortcut);
    return ()=>window.removeEventListener('keydown',onSaveShortcut);
  });
  const cloudLabel=(st:SyncState):string=>
    st.kind==='off'?'':st.kind==='login'?'Non connecté':st.kind==='idle'?'Connecté':st.kind==='paused'?'En pause':
    st.kind==='pending'?'Envoi…':st.kind==='saving'?st.progress:st.kind==='saved'?'Enregistré':
    st.kind==='error'?'Échec — nouvel essai':'À installer';

  // Subspaces are non-destructive views over the master panorama library.
  useEffect(()=>{
    if(!creationFullscreen){setFullscreenGalleryOpen(false);setFullscreenToolsOpen(false);setFullscreenCommandDrawerOpen(false);setNavigationPickerOpen(false);}
  },[creationFullscreen]);
  const currentSpace:StudioSpace|null=(project.spaces??[]).find(sp=>sp.id===activeSpaceId)??null;
  const visibleScenes=scenesInSpace(project,currentSpace);
  const filteredScenes=visibleScenes.filter(scene=>{
    if(sceneSearch.trim()&&!scene.name.toLocaleLowerCase('fr').includes(sceneSearch.trim().toLocaleLowerCase('fr')))return false;
    if(sceneFilter==='with'&&!scene.hotspots.length)return false;
    if(sceneFilter==='without'&&scene.hotspots.length)return false;
    return true;
  });
  // Existing drag order works on the complete master list only.
  const sceneSortEnabled=!currentSpace&&!sceneSearch.trim()&&sceneFilter==='all';
  const visibleIds=new Set(visibleScenes.map(scene=>scene.id));
  const active=visibleScenes.find(s=>s.id===activeId) ?? null;
  // Aperçu : les flèches vers les panoramas décochés disparaissent (ils ne font pas partie de la visite)
  const tourActive=useMemo(()=>{
    if(!active||!preview||!project.scenes.some(sc=>sc.excluded))return active;
    const out=new Set(project.scenes.filter(sc=>sc.excluded).map(sc=>sc.id));
    return {...active,hotspots:active.hotspots.filter(h=>!(h.type==='navigation'&&h.target&&out.has(h.target)))};
  },[active,preview,project.scenes]);
  useEffect(()=>{
    if(activeSpaceId && !(project.spaces??[]).some(sp=>sp.id===activeSpaceId)){
      setActiveSpaceId(null);setSpaceManagerOpen(false);return;
    }
    if(activeSpaceId && !visibleIds.has(activeId)){
      setActiveId(startSceneId(visibleScenes));setSelectedId('');
      setArrivedVia(null);nextArrivalRef.current=null;
    }
  },[activeSpaceId,project.spaces,project.scenes,activeId]);
  const selected=active?.hotspots.find(h=>h.id===selectedId) ?? null;
  const viaFrom=arrivedVia?project.scenes.find(sc=>sc.id===arrivedVia.fromSceneId):undefined;
  const viaHotspot=active&&arrivedVia&&arrivedVia.sceneId===active.id?
    viaFrom?.hotspots.find(h=>h.id===arrivedVia.hotspotId&&h.type==='navigation'&&
      (h.target===active.id||!!h.targetSpaceId))??null:null;
  useEffect(()=>{
    if(!introVisible||!project.introEnabled||!project.introUrl)return;
    // Ne pas rediriger vers le premier panorama du projet complet :
    // l'espace et sa première scène ont déjà été choisis au lancement.
    setIntroEnding(false);
    const duration=Math.max(2,Math.min(60,project.introDuration??6))*1000;
    const fadeMs=Math.min(350,duration/4);
    const fade=window.setTimeout(()=>setIntroEnding(true),duration-fadeMs);
    const finish=window.setTimeout(()=>setIntroVisible(false),duration);
    return ()=>{window.clearTimeout(fade);window.clearTimeout(finish);};
  },[introVisible,project.introEnabled,project.introUrl,project.introDuration]);
  const totalPoints=project.scenes.reduce((n,s)=>n+s.hotspots.length,0);
  const nightSource=project.scenes.find(sc=>sc.id===active?.nightSourceSceneId);
  const nightTexture=active?.nightDataUrl??nightSource?.dataUrl;
  const nightActive=nightSceneId===activeId && !!nightTexture;
  const selectedBar=project.bottomBar.find(b=>b.id===selectedBarId) ?? null;
  useEffect(()=>{
    if(!selectedBarId||panel!=='bar')return;
    const frame=requestAnimationFrame(()=>document.getElementById('nv-bar-button-settings')?.scrollIntoView({block:'start'}));
    return ()=>cancelAnimationFrame(frame);
  },[selectedBarId,panel]);
  useEffect(()=>{
    if(!selectedId||panel!=='points')return;
    const frame=requestAnimationFrame(()=>document.getElementById('nv-selected-point')?.scrollIntoView({block:'start'}));
    return ()=>cancelAnimationFrame(frame);
  },[selectedId,panel]);
  const closeIcon=project.icons.find(icon=>icon.id===project.closeIconId);
  const popupThemeClass=closeIcon?' nv-custom-close':'';
  useEffect(()=>{
    if(ready&&!lock&&!preparationPrompted.current){
      preparationPrompted.current=true;
      if(!project.preparationComplete&&project.scenes.length===0&&!readLink())setPreparationOpen(true);
    }
  },[ready,lock,project.preparationComplete,project.scenes.length]);
  const barSort=useGripSort('visit-bar',project.bottomBar.map(item=>item.id),(from,to)=>setProject(p=>({...p,bottomBar:reorderItems(p.bottomBar,from,to,item=>item.id)})));
  const liveBarSort=useHorizontalSort(project.bottomBar.map(item=>item.id),(from,to)=>setProject(p=>({...p,bottomBar:reorderItems(p.bottomBar,from,to,item=>item.id)})));
  const spaceSort=useHorizontalSort((project.spaces??[]).map(sp=>sp.id),(from,to)=>setProject(p=>({...p,spaces:reorderItems(p.spaces??[],from,to,sp=>sp.id)})));
  // Couleurs réellement visibles de la barre (pack d'images compris) : bouton Paramètres, son panneau et croix de fermeture.
  const barTheme=useEffectiveBarTheme(project,project.barStyle);
  const popupCss=popupThemeVars(barTheme);
  const barCss = {
    '--nv-close-icon-image':closeIcon?`url("${closeIcon.dataUrl}")`:'none',
    '--nv-close-icon-hover-image':project.closeIconHoverId?`url("${project.icons.find(i=>i.id===project.closeIconHoverId)?.dataUrl??''}")`:'none',
    '--nv-close-icon-pressed-image':project.closeIconPressedId?`url("${project.icons.find(i=>i.id===project.closeIconPressedId)?.dataUrl??''}")`:'none',
    '--nv-bar-bg':project.barStyle.background,
    '--nv-daynight-color':project.barStyle.dayNightColor??'#2f72b4',
    '--nv-bar-outline':project.barStyle.outline,
    '--nv-button-bg':project.barStyle.button,
    '--nv-button-outline':project.barStyle.buttonOutline,
    '--nv-icon-color':project.barStyle.icon,
    '--nv-bar-border-width':project.barStyle.outlineWidth+'px',
    '--nv-button-border-width':project.barStyle.buttonOutlineWidth+'px',
    '--nv-bar-roundness':project.barStyle.roundness+'px',
    '--nv-bar-width':project.barStyle.width?project.barStyle.width+'px':'max-content',
    '--nv-bar-height':Math.max(project.barStyle.height??82,project.bottomBar.length?barHeightFor(project.bottomBar):0)+'px'
  } as CSSProperties;
  function changeBarStyle(update:Partial<BarStyle>) {
    setProject(p=>({...p,barStyle:updateBarStyle(p.barStyle,update)}));
  }
  function openLinkInTour(title:string,raw:string,mode?:'embed'|'tab',full?:boolean) {
    const link=safeLink(raw);
    if (!link) {setStatus('Lien invalide : utilise https://, tel: ou mailto:');return;}
    setInfo(null);
    if(mode==='tab'||refusesEmbedding(link)){launchLink(link);return;}
    if (/^https?:\/\//i.test(link)){
      let url=link;
      // Les pages Figurotta prennent en charge ?langs=fr,es,de,en,nl.
      // La page intégrée affiche seulement les langues choisies dans le projet.
      try{
        const parsed=new URL(link);
        // Tous les mini-sites d'information hébergés sur Vercel reçoivent les langues du projet (?langs=) et la langue choisie par le visiteur (?lang=).
        if(parsed.hostname.endsWith('.vercel.app')){
          const codes=project.languages??['fr','es','de','en','nl'];
          parsed.searchParams.set('langs',codes.join(','));
          parsed.searchParams.set('lang',effectiveLang(visitorPrefs,codes));
          url=parsed.toString();
        }
      }catch{/* Conserver le lien original si l'URL ne peut pas être analysée. */}
      setFrame({title,url,...(full?{full:true}:{})});
    }else launchLink(link);
  }
  /** Exporte un dossier HTML. `spaceId` : un espace précis, `null` : projet complet, absent : l'espace actuellement ouvert. */
  async function exportTour(spaceId?:string|null){
    const space=spaceId===undefined?currentSpace:(spaceId?(project.spaces??[]).find(sp=>sp.id===spaceId)??null:null);
    const scoped=projectForSpaceExport(project,space,true);
    if(!scoped.scenes.length){setStatus('Cet espace ne contient aucun panorama à exporter');return;}
    setExporting(true);
    setStatus('Préparation du dossier HTML…');
    try {
      await exportStaticTour(scoped);
      const nights=scoped.scenes.filter(sc=>sc.nightDataUrl).length;
      setStatus((space?'Espace « '+space.name+' » exporté':'Projet complet exporté')+' : '+scoped.scenes.length+' panorama'+(scoped.scenes.length>1?'s':'')+(nights?' · '+nights+' avec mode nuit':' · sans mode nuit')+' — archive ZIP téléchargée');
    }catch(err){setStatus('Échec de l’export : '+(err instanceof Error?err.message:String(err)));}
    finally{setExporting(false);}
  }
  // Fenêtre « Que veux-tu exporter ? » : le contenu du dossier est choisi explicitement (jamais deviné).
  const exportChoices=useMemo(()=>{
    if(!exportDialog)return [];
    const count=(space:StudioSpace|null)=>{const p=projectForSpaceExport(project,space,true);return {n:p.scenes.length,night:p.scenes.filter(sc=>sc.nightDataUrl).length};};
    return [{id:null as string|null,label:'Projet complet',...count(null)},...(project.spaces??[]).map(sp=>({id:sp.id as string|null,label:'Espace « '+sp.name+' »',...count(sp)}))];
  },[exportDialog,project]);
  // Depuis « Mes projets Cloud » : après l'ouverture d'un espace, lance tout de suite son lien public ou son export.
  useEffect(()=>{
    if(!pendingSpaceIntent||activeSpaceId!==pendingSpaceIntent.spaceId||!currentSpace)return;
    const {intent}=pendingSpaceIntent;setPendingSpaceIntent(null);
    if(intent==='share')setShareOpen(true);else void exportTour();
  });
  async function addVideo(file?:File,placement?:{sceneId:string;hotspotId:string}){
    const sceneId=placement?.sceneId??activeId,hotspotId=placement?.hotspotId??selectedId;
    if(!file||!sceneId||!hotspotId)return;
    if(!['video/mp4','video/webm'].includes(file.type)||file.size>VIDEO_MAX_BYTES){
      setStatus('Vidéo : MP4/WebM, 45 Mo maximum');return;
    }
    try{
      const data=await readImage(file);
      if(!isSafeVideoData(data))throw Error('Fichier vidéo incompatible');
      setProject(p=>({...p,scenes:p.scenes.map(scene=>scene.id===sceneId?{...scene,hotspots:scene.hotspots.map(h=>h.id===hotspotId?{...h,videoDataUrl:data,videoUrl:'',...(placement?{title:file.name.replace(/\.[^.]+$/,'').slice(0,120)}:{})}:h)}:scene)}));
      setStatus('Vidéo ajoutée à l’écran');
      void rememberMedia('video',file.name.replace(/\.[^.]+$/,''),data).then(()=>setMediaVersion(v=>v+1));
      setMediaPicker(null);
    }catch{setStatus('Impossible de lire la vidéo');}
    if(videoInput.current)videoInput.current.value='';
  }
  async function addAudio(file?:File){
    if(!file)return;
    if(!['audio/mpeg','audio/mp3','audio/ogg','audio/wav','audio/x-wav','audio/webm','audio/mp4'].includes(file.type)||
      file.size>14*1024*1024){setStatus('Audio : MP3, WAV, OGG ou WebM · 14 Mo maximum');return;}
    try{
      const data=await readImage(file);
      if(!isSafeAudioData(data))throw Error('Fichier audio incompatible');
      const id=uid(),name=file.name.replace(/\\.[^.]+$/,'').slice(0,120);
      setProject(p=>({...p,
        audioTracks:[...(p.audioTracks??[]),{id,name,dataUrl:data,volume:50,loop:true}],
        scenes:p.scenes.map(sc=>sc.id===activeId?{...sc,musicTrackId:id}:sc)
      }));
      setPanel('music');
      setStatus('Musique ajoutée à la bibliothèque, assignée au panorama actuel');
    }catch{setStatus('Impossible de lire ce son');}
    if(audioInput.current)audioInput.current.value='';
  }
  function assignMusic(trackId:string,sceneId:string,checked:boolean){
    setProject(p=>({...p,scenes:p.scenes.map(sc=>sc.id===sceneId?
      {...sc,musicTrackId:checked?trackId:undefined,audioEnabled:checked?false:sc.audioEnabled}:sc)}));
  }
  /** Tout intégrer / tout retirer : applique (ou retire) cette piste sur tous les panoramas, sans toucher aux autres pistes. */
  function assignMusicAll(trackId:string,checked:boolean){
    setProject(p=>({...p,scenes:p.scenes.map(sc=>checked?{...sc,musicTrackId:trackId,audioEnabled:false}:
      (sc.musicTrackId===trackId?{...sc,musicTrackId:undefined}:sc))}));
    setStatus(checked?'Musique appliquée à tous les panoramas · Enregistre avec la disquette.':'Musique retirée de tous les panoramas.');
  }
  async function removeTrack(trackId:string){
    if(!await confirmAsk('Supprimer cette musique et ses affectations aux panoramas ?'))return;
    setProject(p=>({...p,
      audioTracks:p.audioTracks.filter(track=>track.id!==trackId),
      defaultMusicTrackId:p.defaultMusicTrackId===trackId?undefined:p.defaultMusicTrackId,
      scenes:p.scenes.map(sc=>sc.musicTrackId===trackId?{...sc,musicTrackId:undefined}:sc)
    }));
  }
  async function addFrameImage(file?:File,placement?:{sceneId:string;hotspotId:string}){
    if(!file)return;
    const sceneId=placement?.sceneId??activeId,hotspotId=placement?.hotspotId??selectedId;
    if(!sceneId||!hotspotId){setPhotoFeedback('Sélectionne un cadre photo ou un point Information avant d’importer une image.');return;}
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
        ...sc,hotspots:sc.hotspots.map(h=>h.id===hotspotId?{...h,imageDataUrl:data,...(placement?{title:file.name.replace(/\.[^.]+$/,'').slice(0,120)}:{})}:h)
      })}));
      setPhotoFeedback('Photo importée avec succès.');
      setStatus('Photo ajoutée au panorama');
      void rememberMedia('image',file.name.replace(/\.[^.]+$/,''),data).then(()=>setMediaVersion(v=>v+1));
      setMediaPicker(null);
    }catch(e){
      const message=e instanceof Error?e.message:'Impossible de lire cette photo.';
      setPhotoFeedback(message);
      setStatus('Import photo : '+message);
    }
  }
  function importFromPicker(){
    if(!mediaPicker)return;
    pendingMediaPlacement.current={sceneId:mediaPicker.sceneId,hotspotId:mediaPicker.hotspotId,type:mediaPicker.type};
    const input=placedMediaInput.current;
    if(input){input.accept=mediaPicker.type==='image'?'image/*,.heic,.heif':'video/mp4,video/webm';input.value='';input.click();}
  }
  function pickFromLibrary(item:{name:string;dataUrl?:string;url?:string}){
    const target=mediaPicker;if(!target)return;
    setProject(p=>({...p,scenes:p.scenes.map(sc=>sc.id!==target.sceneId?sc:{...sc,hotspots:sc.hotspots.map(h=>h.id!==target.hotspotId?h:{
      ...h,
      ...(target.type==='image'?{imageDataUrl:item.dataUrl}:item.dataUrl?{videoDataUrl:item.dataUrl,videoUrl:''}:{videoUrl:item.url??'',videoDataUrl:undefined}),
      ...(target.fresh?{title:item.name.slice(0,120)}:{})
    })})}));
    setMediaPicker(null);
    setStatus((target.type==='image'?'Photo':'Vidéo')+' « '+item.name+' » ajoutée depuis la bibliothèque.');
  }
  function closeMediaPicker(){
    const target=mediaPicker;setMediaPicker(null);
    if(!target)return;
    // Le point reste placé et sélectionné : on retrouve ses réglages (icône, taille…) et on pourra choisir le média plus tard.
    setSelectedId(target.hotspotId);setPanel('points');setMode(null);setRightHidden(false);
    setStatus((target.type==='image'?'Point photo':'Point vidéo')+' créé sans média : choisis-le avec « '+(target.type==='image'?'Choisir une photo déjà utilisée':'Choisir une vidéo déjà utilisée')+' », ou règle son icône et sa taille.');
  }
  function mediaPickerEl(){
    return mediaPicker?<MediaPicker kind={mediaPicker.type} project={project} version={mediaVersion} onPick={pickFromLibrary} onDeleteLibrary={id=>setProject(p=>({...p,mediaLibrary:(p.mediaLibrary??[]).filter(m=>m.id!==id)}))} onImport={importFromPicker} onClose={closeMediaPicker} banner={issueFocus?<IssueBanner focus={issueFocus}/>:undefined}/>:null;
  }
  function stopAutoNavigation(){
    setAutoPending(null);setAutoNavigation(false);setGuide(null);setNavigationDraft(null);setDestinationEditId(null);
    setClassicDestinationOpen(false);setFullscreenGalleryOpen(false);
    setFullscreenCommandDrawerOpen(false);setGalleryPreviewSceneId(null);
    setGalleryPreviewPinned(false);setMode(null);setSelectedId('');
    setStatus('Mode Auto arrêté · Modifications non enregistrées à sauvegarder avec la disquette.');
  }
  function toggleAutoNavigation(){
    if(autoNavigation){stopAutoNavigation();return;}
    if(!active||preview)return;
    setAutoNavigation(true);setMode('navigation');setClassicDestinationOpen(false);
    setDestinationEditId(null);setNavigationDraft(null);
    setGuide({phase:'forward',fwdYaw:cameraRef.current.yaw,fwdPitch:cameraRef.current.pitch});
    setStatus('Parcours guidé · Vise avec la cible puis clique sur + : passage direct au panorama suivant.');
  }
  function selectScene(id:string){
    if(currentSpace&&!visibleIds.has(id)){setStatus('Ce panorama n’appartient pas à l’espace sélectionné');return;}
    // Navigation directe : toujours revenir à la vue d'arrivée par défaut du panorama.
    // Une arrivée personnalisée PAR FLÈCHE ne s'applique qu'au clic sur cette flèche.
    setArrivedVia(null);nextArrivalRef.current=null;setActiveId(id);
    setSelectedId('');setMode(null);
  }
  // Réutiliser le jeu Navigation réellement employé par le projet.
  // Ainsi Figurotta reprend ses trois PNG et sa taille 50px.
  function defaultNavigationIconSet(){
    if(project.defaultNavigationIcon&&project.icons.some(icon=>icon.id===project.defaultNavigationIcon!.iconId))return project.defaultNavigationIcon;
    if(project.iconPackId==='classic')return null;
    const valid=new Set(project.icons.map(icon=>icon.id));
    const counts=new Map<string,{iconId:string;hoverIconId?:string;pressedIconId?:string;iconSize:number;count:number}>();
    for(const scene of project.scenes)for(const point of scene.hotspots){
      if(point.type!=='navigation'||!point.iconId||!valid.has(point.iconId))continue;
      const iconSize=point.iconSize??28;
      const hoverIconId=point.hoverIconId&&valid.has(point.hoverIconId)?point.hoverIconId:undefined;
      const pressedIconId=point.pressedIconId&&valid.has(point.pressedIconId)?point.pressedIconId:undefined;
      const key=[point.iconId,hoverIconId??'',pressedIconId??'',iconSize].join('|');
      const old=counts.get(key);
      counts.set(key,old?{...old,count:old.count+1}:{iconId:point.iconId,hoverIconId,pressedIconId,iconSize,count:1});
    }
    const favorite=project.favoriteNavigationIconSet;
    if(favorite&&counts.has(favorite))return counts.get(favorite)!;
    return [...counts.values()].sort((a,b)=>b.count-a.count)[0]??null;
  }
  // Une seule procédure pour l'éditeur et la création plein écran :
  // mémoriser la direction de départ, orienter le panorama d'arrivée, puis valider.
  function createNavigationFromGallery(targetId:string){
    const source=project.scenes.find(scene=>scene.id===activeId);
    const destination=visibleScenes.find(scene=>scene.id===targetId);
    if(!source||!destination||source.id===destination.id)return;
    const camera=cameraRef.current;
    setNavigationDraft({
      sourceId:source.id,targetId:destination.id,
      sourceYaw:camera.sceneId===source.id?camera.yaw:source.arrivalYaw??0,
      sourcePitch:camera.sceneId===source.id?camera.pitch:source.arrivalPitch??0,
      existingPointId:destinationEditId??undefined
    });
    setFullscreenGalleryOpen(false);setFullscreenCommandDrawerOpen(false);
    setFullscreenToolsOpen(false);setHoveredGallerySceneId(null);
    setGalleryPreviewSceneId(null);setGalleryPreviewPinned(false);
    setClassicDestinationOpen(false);
    setStatus('Oriente le panorama '+destination.name+' puis clique sur Valider la direction.');
  }
  function confirmNavigationDirection(draftOverride?:{
    sourceId:string;targetId:string;sourceYaw:number;sourcePitch:number;existingPointId?:string;
    arrivalOverride?:{yaw:number;pitch:number;zoom:number};
    /** false : arrivée automatique (pas visée) ; sinon la vue de la flèche est une vue propre. */
    arrivalCustom?:boolean;
  }){
    const draft=draftOverride??navigationDraft;
    if(!draft)return;
    const source=project.scenes.find(scene=>scene.id===draft.sourceId);
    const destination=project.scenes.find(scene=>scene.id===draft.targetId);
    if(!source||!destination){setNavigationDraft(null);return;}
    const arrival=(draftOverride?.arrivalOverride)??galleryOrientationRef.current[destination.id]??{
      yaw:destination.arrivalYaw??0,pitch:destination.arrivalPitch??0,zoom:panoramaArrivalZoom(destination)
    };
    const favorite=defaultNavigationIconSet();
    const id=draft.existingPointId??uid();
    const point:Hotspot={
      id,type:'navigation',title:'Aller vers '+destination.name,text:'',
      target:destination.id,yaw:draft.sourceYaw,pitch:draft.sourcePitch,
      arrivalYaw:arrival.yaw,arrivalPitch:arrival.pitch,arrivalZoom:arrival.zoom,
      arrivalZoomModel:'wide',arrivalCustom:draftOverride?.arrivalCustom??true,
      ...(favorite?{iconId:favorite.iconId,hoverIconId:favorite.hoverIconId,
        pressedIconId:favorite.pressedIconId,iconSize:favorite.iconSize}:{})
    };
    // Retour automatique B → A : la flèche est derrière nous à l'arrivée (cap + 180°) et, en revenant, on regarde à
    // l'opposé de l'aller (cap de départ + 180°). Seulement pour une NOUVELLE flèche, sans retour déjà présent, hors parcours Auto
    // (qui pose son retour lui-même, avec validation).
    const twoPi=2*Math.PI;
    const norm=(v:number)=>((v%twoPi)+twoPi)%twoPi;
    const makeReturn=autoReturn&&!draft.existingPointId&&!autoNavigation&&!destination.hotspots.some(h=>h.type==='navigation'&&h.target===source.id);
    const backPoint:Hotspot|null=makeReturn?{
      id:uid(),type:'navigation',title:'Retour vers '+source.name,text:'',target:source.id,
      yaw:norm(arrival.yaw+Math.PI),pitch:-0.12,
      arrivalYaw:norm(draft.sourceYaw+Math.PI),arrivalPitch:0,arrivalZoom:panoramaArrivalZoom(source),arrivalZoomModel:'wide',arrivalCustom:true,
      ...(favorite?{iconId:favorite.iconId,hoverIconId:favorite.hoverIconId,pressedIconId:favorite.pressedIconId,iconSize:favorite.iconSize}:{})
    }:null;
    setProject(p=>({...p,scenes:p.scenes.map(sc=>{
      if(backPoint&&sc.id===destination.id)return {...sc,hotspots:[...sc.hotspots,backPoint]};
      if(sc.id!==source.id)return sc;
      return {
      ...sc,hotspots:draft.existingPointId?
        sc.hotspots.map(h=>h.id===draft.existingPointId?{
          ...h,target:destination.id,arrivalYaw:arrival.yaw,arrivalPitch:arrival.pitch,
          arrivalZoom:arrival.zoom,arrivalZoomModel:'wide' as const,arrivalCustom:draftOverride?.arrivalCustom??true
        }:h):[...sc.hotspots,point]
      };
    })}));
    // Arriver automatiquement au panorama de destination avec l'orientation choisie.
    nextArrivalRef.current={sceneId:destination.id,yaw:arrival.yaw,pitch:arrival.pitch,zoom:arrival.zoom};
    setArrivedVia({sceneId:destination.id,hotspotId:id,fromSceneId:source.id});
    setActiveId(destination.id);setSelectedId('');setSelectedBarId('');
    setMode(autoNavigation?'navigation':null);setPreview(false);setPanel('panoramas');
    setNavigationDraft(null);setDestinationEditId(null);
    setNavigationPickerOpen(false);setClassicDestinationOpen(false);
    setFullscreenGalleryOpen(false);setFullscreenCommandDrawerOpen(false);
    setGalleryPreviewSceneId(null);setGalleryPreviewPinned(false);
    setStatus('Flèche '+(draft.existingPointId?'mise à jour':'créée')+' vers '+destination.name+(backPoint?' · retour créé (vue à 180°)':'')+(autoNavigation?' · Auto : place la flèche suivante.':' · Enregistre avec la disquette.'));
  }
  // ── Parcours guidé ──────────────────────────────────────────────────────────
  // Aller : la flèche part vers le panorama SUIVANT dans l'ordre, on y arrive en regardant dans le même sens (on avance).
  // Retour : dans ce panorama on fait demi-tour (180°), on valide la vue, la flèche retour est posée, puis on repart en avant.
  // Mode Auto : le clic sur la cible ouvre la galerie 360° pour choisir le panorama d'arrivée (suggestion par numéro de scan).
  const arrivalDraftRef=useRef<{id:string;yaw:number;pitch:number;zoom:number}|null>(null);
  const [autoPending,setAutoPending]=useState<{yaw:number;pitch:number}|null>(null);
  function openAutoGallery(yaw:number,pitch:number){
    if(!active||!autoNavigation||preview)return;
    const index=visibleScenes.findIndex(sc=>sc.id===active.id);
    if(visibleScenes.length<2){setStatus('Il faut au moins deux panoramas pour créer une flèche.');return;}
    setAutoPending({yaw,pitch});
    setFullscreenGalleryOpen(false);setNavigationPickerOpen(false);
    setClassicDestinationSearch('');
    setClassicDestinationPreviewId(suggestDestinations(active.id)[0]?.id??visibleScenes[index+1]?.id??visibleScenes.find(sc=>sc.id!==active.id)?.id??null);
    setClassicDestinationOpen(true);
  }
  function guidedForward(yaw:number,pitch:number,destinationId?:string){
    if(!active)return;
    const index=visibleScenes.findIndex(sc=>sc.id===active.id);
    const next=destinationId?visibleScenes.find(sc=>sc.id===destinationId):visibleScenes[index+1];
    if(!next){stopAutoNavigation();setStatus('Dernier panorama atteint · le parcours est terminé. Enregistre avec la disquette.');return;}
    const existing=active.hotspots.find(h=>h.type==='navigation'&&h.target===next.id);
    const prevId=active.id;
    const alreadyBack=next.hotspots.some(h=>h.type==='navigation'&&h.target===prevId);
    // Vue d'arrivée = la vue réellement visée dans l'aperçu de destination (cible + inclinaison), sinon le cap de la flèche.
    const aim=destinationId?galleryOrientationRef.current[destinationId]:undefined;
    const arrival=aim?{yaw:aim.yaw,pitch:aim.pitch,zoom:aim.zoom??panoramaArrivalZoom(next)}:{yaw:existing?.yaw??yaw,pitch:0,zoom:panoramaArrivalZoom(next)};
    confirmNavigationDirection({
      sourceId:active.id,targetId:next.id,sourceYaw:existing?.yaw??yaw,sourcePitch:existing?.pitch??pitch,
      existingPointId:existing?.id,arrivalOverride:arrival,arrivalCustom:!!aim
    });
    const fwdYaw=existing?.yaw??yaw,fwdPitch=existing?.pitch??pitch;
    if(alreadyBack){setGuide({phase:'forward',fwdYaw,fwdPitch});return;}
    // On arrive déjà tourné à 180° : il ne reste qu'à valider la vue pour le retour.
    const half=(fwdYaw+Math.PI)%(2*Math.PI);
    nextArrivalRef.current={sceneId:next.id,yaw:half,pitch:0,zoom:panoramaArrivalZoom(next)};
    setGuide({phase:'back',prevId,fwdYaw,fwdPitch});
    setStatus('Retour · '+next.name+' : tourne la vue vers l’arrière (180°) puis clique sur « Valider le retour ».');
  }
  function guidedBack(){
    if(!active||!guide||guide.phase!=='back'||!guide.prevId)return;
    const origin=project.scenes.find(sc=>sc.id===guide.prevId);
    const camera=cameraRef.current;
    if(!origin||camera.sceneId!==active.id)return;
    const favorite=defaultNavigationIconSet();
    const point:Hotspot={
      id:uid(),type:'navigation',title:'Retour vers '+origin.name,text:'',target:origin.id,
      yaw:camera.yaw,pitch:camera.pitch,
      // En revenant, on regarde à l'opposé de l'aller : on remonte l'allée.
      arrivalYaw:(guide.fwdYaw+Math.PI)%(2*Math.PI),arrivalPitch:0,arrivalZoom:panoramaArrivalZoom(origin),arrivalZoomModel:'wide',
      ...(favorite?{iconId:favorite.iconId,hoverIconId:favorite.hoverIconId,pressedIconId:favorite.pressedIconId,iconSize:favorite.iconSize}:{})
    };
    patchScene(sc=>({...sc,hotspots:[...sc.hotspots,point]}));
    setTurnRequest({n:Date.now(),yaw:guide.fwdYaw,pitch:guide.fwdPitch});
    setGuide({phase:'forward',fwdYaw:guide.fwdYaw,fwdPitch:guide.fwdPitch});
    setStatus('Retour créé vers '+origin.name+' · Continue : vise la suite et clique sur +.');
  }
  function guidedSkipBack(){
    if(!guide||guide.phase!=='back')return;
    setTurnRequest({n:Date.now(),yaw:guide.fwdYaw,pitch:guide.fwdPitch});
    setGuide({phase:'forward',fwdYaw:guide.fwdYaw,fwdPitch:guide.fwdPitch});
    setStatus('Pas de retour ici · Continue : vise la suite et clique sur +.');
  }
  function validateFullscreenDestination(targetId:string){
    if(!active||targetId===active.id)return;
    // The source arrow position is preserved if a navigation marker was just placed.
    // Otherwise the crosshair on the source panorama is its current camera center.
    const existing=destinationEditId?active.hotspots.find(h=>h.id===destinationEditId&&h.type==='navigation'):undefined;
    const camera=cameraRef.current;
    const view=camera.sceneId===active.id?camera:{
      yaw:active.arrivalYaw??0,pitch:active.arrivalPitch??0
    };
    confirmNavigationDirection({
      sourceId:active.id,targetId,
      sourceYaw:existing?.yaw??view.yaw,
      sourcePitch:existing?.pitch??view.pitch,
      existingPointId:existing?.id
    });
    setFullscreenSelectedDestinationId(null);
  }
  function chooseFullscreenScene(id:string){
    if(!visibleIds.has(id))return;
    selectScene(id);
    setFullscreenGalleryOpen(true);
    setFullscreenCommandDrawerOpen(true);
  }
  function stepFullscreenScene(direction:-1|1){
    if(!visibleScenes.length)return;
    const idx=visibleScenes.findIndex(sc=>sc.id===activeId);
    const next=visibleScenes[(idx+direction+visibleScenes.length)%visibleScenes.length];
    if(next)chooseFullscreenScene(next.id);
  }
  function goThroughArrow(h:Hotspot,fromSceneId:string){
    const space=h.targetSpaceId?(project.spaces??[]).find(item=>item.id===h.targetSpaceId):null;
    // Le premier panorama de l'espace est recalculé lors de chaque navigation :
    // pas de copie de médias, et le choix reste valide si l'espace est réorganisé.
    const destination=space?space.sceneIds.find(id=>project.scenes.some(sc=>sc.id===id&&!sc.excluded)):h.target;
    if(!destination||!project.scenes.some(sc=>sc.id===destination&&!sc.excluded))return;
    if(space)setActiveSpaceId(space.id);
    else if(!visibleIds.has(destination))setActiveSpaceId(null);
    nextArrivalRef.current=h.arrivalCustom&&h.arrivalYaw!==undefined?{sceneId:destination,yaw:h.arrivalYaw,pitch:h.arrivalPitch??0,zoom:panoramaArrivalZoom(h)}:null;
    setArrivedVia({sceneId:destination,hotspotId:h.id,fromSceneId});
    setActiveId(destination);setSelectedId('');setMode(null);
  }
  function setArrowArrival(fromSceneId:string,hotspotId:string,view:{yaw:number;pitch:number;zoom:number}|null){
    setProject(p=>({...p,scenes:p.scenes.map(sc=>sc.id!==fromSceneId?sc:{...sc,hotspots:sc.hotspots.map(h=>h.id!==hotspotId?h:
      view?{...h,arrivalYaw:view.yaw,arrivalPitch:view.pitch,arrivalZoom:view.zoom,arrivalZoomModel:'wide' as const,arrivalCustom:true}:{...h,arrivalYaw:undefined,arrivalPitch:undefined,arrivalZoom:undefined,arrivalZoomModel:undefined})})}));
  }
  function saveArrivalForArrow(){
    if(!active||!viaHotspot)return;
    const view=cameraRef.current;
    if(view.sceneId!==active.id){setStatus('Oriente d’abord le panorama puis réessaie');return;}
    setArrowArrival(arrivedVia!.fromSceneId,viaHotspot.id,{yaw:view.yaw,pitch:view.pitch,zoom:view.zoom});
    setStatus('Vue d’arrivée enregistrée pour cette flèche');
  }
  async function importNightPanorama(file?:File){
    if(!file||!activeId)return;
    const sceneId=activeId;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>40*1024*1024){
      setStatus('Panorama nuit : JPG, PNG ou WebP, 40 Mo maximum');return;
    }
    try{
      const data=await readPanorama(file);
      setProject(p=>({...p,scenes:p.scenes.map(sc=>sc.id===sceneId?{...sc,nightDataUrl:data,nightSourceSceneId:undefined}:sc)}));
      setStatus('Panorama de nuit associé à la scène. Clique sur Lune pour le visualiser.');
    }catch{
      setStatus('Impossible d’importer cette photo de nuit');
    }
    if(nightInput.current)nightInput.current.value='';
  }
  function nightSceneControls(scene:Scene,open=false){
    const source=project.scenes.find(other=>other.id===scene.nightSourceSceneId);
    const configured=!!(scene.nightDataUrl||source);
    return <InspectorSection title="Mode jour / nuit" initiallyOpen={open}><div className="nv-night-settings">
      <p className="hint">Associe un panorama de nuit au panorama actuel. Les deux vues gardent les mêmes points et un fondu assure la transition.</p>
      <div className="nv-night-dropzone" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void importNightPanorama(e.dataTransfer.files[0]);}}>
        <button type="button" className="import" onClick={()=>nightInput.current?.click()}>
          {scene.nightDataUrl?'🌙 Remplacer la photo de nuit':'🌙 Importer un nouveau panorama 360°'}
        </button>
        <small>Ou glisse une photo 360° ici (JPG, PNG, WebP).</small>
      </div>
      <label>Ou choisir un panorama déjà importé dans la galerie
        <select value={source?.id??''} onChange={e=>{
          const id=e.target.value||undefined;
          setProject(p=>({...p,scenes:p.scenes.map(sc=>sc.id===scene.id?{...sc,nightSourceSceneId:id,nightDataUrl:undefined}:sc)}));
          setNightSceneId(null);
          setStatus(id?'Panorama de la galerie associé comme vue de nuit':'Choix de la galerie retiré');
        }}>
          <option value="">Sélectionner dans la galerie…</option>
          {project.scenes.filter(other=>other.id!==scene.id).map(other=><option key={other.id} value={other.id}>{other.name}</option>)}
        </select>
      </label>
      {source&&<div className="nv-night-source-preview">
        <img src={source.dataUrl} alt="" />
        <span>Vue Nuit : {source.name}</span>
      </div>}
      {configured&&<>
        <div className="nv-night-view">
          <button type="button" className="style-reset" onClick={()=>{
            const cam=cameraRef.current;
            if(cam.sceneId!==scene.id){setStatus('Ouvre ce panorama et oriente la vue, puis enregistre-la.');return;}
            setProject(p=>({...p,scenes:p.scenes.map(sc=>sc.id===scene.id?{...sc,nightYaw:cam.yaw,nightPitch:cam.pitch,nightZoom:cam.zoom}:sc)}));
            setStatus('Vue enregistrée : la nuit s’ouvrira sur cette orientation.');
          }}>📍 Enregistrer la vue actuelle pour la nuit</button>
          {scene.nightYaw!==undefined&&<button type="button" className="style-reset" onClick={()=>setProject(p=>({...p,scenes:p.scenes.map(sc=>sc.id===scene.id?{...sc,nightYaw:undefined,nightPitch:undefined,nightZoom:undefined}:sc)}))}>Effacer la vue nuit</button>}
          <small className="hint-inline">En mode Nuit, le panorama s’affiche seul, sans bouton ni point : seul le choix Jour / Nuit reste.</small>
        </div>
        <label className="nv-night-color-picker">Couleur du bouton Nuit
          <input type="color" aria-label="Couleur du bouton Nuit" value={project.barStyle.dayNightColor??'#2f72b4'} onChange={e=>changeBarStyle({dayNightColor:e.target.value})}/>
        </label>
        <div className="nv-daynight-preview">
          <button type="button" className={nightSceneId===scene.id?'':'is-active'} onClick={()=>setNightSceneId(null)}>☀ Jour</button>
          <button type="button" className={nightSceneId===scene.id?'is-active':''} onClick={()=>setNightSceneId(scene.id)}>☾ Nuit</button>
        </div>
        <button type="button" className="style-reset" onClick={()=>{
          setProject(p=>({...p,scenes:p.scenes.map(sc=>sc.id===scene.id?{...sc,nightDataUrl:undefined,nightSourceSceneId:undefined}:sc)}));
          setNightSceneId(null);
        }}>Retirer la version nuit</button>
      </>}
      <small className="hint-inline">Pour un fondu parfaitement aligné, utilise deux photos prises depuis le même point et orientées de la même façon.</small>
    </div></InspectorSection>;
  }
  async function saveArrivalImmediately(){
    if(!active||lock){setStatus('Échec : enregistrement de la vue indisponible');return;}
    if(arrivalSavingRef.current||savingManually||savingRef.current){setStatus('Une sauvegarde est déjà en cours : clique à nouveau dans un instant');return;}
    const camera=cameraRef.current;
    const sceneId=active.id;
    const yaw=camera.sceneId===sceneId?camera.yaw:active.arrivalYaw??0;
    const pitch=camera.sceneId===sceneId?camera.pitch:active.arrivalPitch??0;
    const zoom=camera.sceneId===sceneId?camera.zoom:panoramaArrivalZoom(active);
    const snapshot:StudioProject={...projectRef.current,scenes:projectRef.current.scenes.map(sc=>sc.id===sceneId?
      {...sc,arrivalYaw:yaw,arrivalPitch:pitch,arrivalZoom:zoom,arrivalZoomModel:'wide'}:sc)};
    const name=active.name;
    arrivalSavingRef.current=true;setArrivalSaving(true);
    flushSync(()=>setProject(snapshot));
    try{
      // 1) copie locale d'abord : la vue ne se perd jamais, même si le Cloud échoue.
      const localOk=await persist(snapshot);
      // 2) puis Cloud si le projet y est lié.
      const ok=(cloud.signedIn||readLink())?await manualSave(false,true):localOk;
      if(!ok){
        setStatus('Vue définie, mais le Cloud n’a pas confirmé : enregistre avec la disquette (la vue reste en mémoire).');
        return;
      }
      setStatus('Sauvegardé · Vue d’arrivée enregistrée pour '+name);
    }catch(error){setStatus('Échec de sauvegarde de la vue : '+(error instanceof Error?error.message:String(error)));}
    finally{arrivalSavingRef.current=false;setArrivalSaving(false);}
  }
  function saveArrivalView(){
    if(!active)return;
    const view=cameraRef.current;
    if(view.sceneId!==active.id){setStatus('Oriente d’abord le panorama puis réessaie');return;}
    setOpenTopMenu(null);
    setNavigationDrawerOpen(false);
    patchScene(sc=>({...sc,arrivalYaw:view.yaw,arrivalPitch:view.pitch,arrivalZoom:view.zoom,arrivalZoomModel:'wide'}));
    setStatus('Vue d’arrivée définie pour '+active.name+' · Enregistre le projet avec la disquette.');
  }
  function removeAutoNavigationArrow(id:string){
    if(!active||!active.hotspots.some(h=>h.id===id))return;
    patchScene(sc=>({...sc,hotspots:sc.hotspots.filter(h=>h.id!==id)}));
    setSelectedId('');setDestinationEditId(null);setMode(null);
    setStatus('Élément supprimé du panorama · Enregistre avec la disquette.');
  }
  function moveHotspot(id:string,yaw:number,pitch:number){
    patchScene(sc=>({...sc,hotspots:sc.hotspots.map(h=>h.id===id?{...h,yaw,pitch}:h)}));
  }
  function dropIcon(payload:string,yaw:number,pitch:number){
    if(payload.startsWith('media:')){
      if(!active)return;
      const mediaId=payload.slice(6);
      const item=(project.mediaLibrary??[]).find(m=>m.id===mediaId);
      if(!item)return;
      const r=resolveLink(item);
      if(r.problem)return;
      const h:Hotspot=item.kind==='photo'
        ?{id:uid(),type:'image',title:item.name,text:'',target:'',yaw,pitch,mediaDisplay:'popup',
          ...(item.provider==='local'&&item.data?{imageDataUrl:item.data}:{imageUrl:r.image})}
        :{id:uid(),type:'video',title:item.name,text:'',target:'',yaw,pitch,mediaDisplay:'popup',videoOpenFullscreen:true,
          ...(item.provider==='local'&&item.data?{videoDataUrl:item.data}:r.video?{videoUrl:r.video}:{videoEmbed:r.embed,videoUrl:''})};
      patchScene(sc=>({...sc,hotspots:[...sc.hotspots,h]}));
      setPanel('points');setSelectedId(h.id);setMode(null);
      setStatus((item.kind==='photo'?'Photo':'Vidéo')+' « '+item.name+' » positionnée dans le panorama');
      return;
    }
    // `payload` = identifiant d'une icône seule, ou JSON d'un jeu complet (normal + survol + clic).
    let set:{iconId:string;hoverIconId?:string;pressedIconId?:string;size?:number}|null=null;
    if(payload.startsWith('{')){
      try{
        const v=JSON.parse(payload) as Record<string,unknown>;
        if(typeof v.iconId==='string')set={iconId:v.iconId,
          hoverIconId:typeof v.hoverIconId==='string'?v.hoverIconId:undefined,
          pressedIconId:typeof v.pressedIconId==='string'?v.pressedIconId:undefined,
          size:typeof v.size==='number'&&Number.isFinite(v.size)?Math.max(16,Math.min(80,v.size)):undefined};
      }catch{/* payload invalide : ignoré */}
    }else set={iconId:payload};
    const exists=(id?:string)=>!!id&&project.icons.some(i=>i.id===id);
    if(!active||!set||!exists(set.iconId))return;
    const icon=project.icons.find(i=>i.id===set!.iconId)!;
    const h:Hotspot={id:uid(),type:'information',title:icon.name,text:'',target:'',yaw,pitch,iconId:set.iconId,
      ...(exists(set.hoverIconId)?{hoverIconId:set.hoverIconId}:{}),
      ...(exists(set.pressedIconId)?{pressedIconId:set.pressedIconId}:{}),
      ...(set.size?{iconSize:set.size}:{})};
    patchScene(sc=>({...sc,hotspots:[...sc.hotspots,h]}));
    setPanel('points');setSelectedId(h.id);setMode(null);
    setStatus('Icône positionnée : déplace-la dans le panorama pour l’ajuster');
  }
  function patchScene(patch:(s:Scene)=>Scene){
    setProject(p=>({...p,scenes:p.scenes.map(s=>s.id===activeId?patch(s):s)}));
  }
  // Glisser-déposer des scènes (1D liste et 2D grille) : suit le pointeur en direct en 2D (aucun rendu React pendant le glissement),
  // décale les autres scènes sur les axes X/Y avec une animation fluide, et fait défiler la liste près des bords.
  function startSceneDrag(e:React.PointerEvent<HTMLDivElement>,index:number){
    if(e.button!==0||sortBusy.current)return;
    const targetEl=e.target as HTMLElement;
    if(targetEl.closest('.nv-scene-include,.nv-scene-360-preview-btn,.nv-space-exclude'))return;
    if(e.pointerType==='touch'&&!targetEl.closest('.scene-grip'))return;
    const container=scenesRef.current;
    if(!container)return;
    const slots=Array.from(container.querySelectorAll<HTMLElement>(':scope > .scene-slot'));
    const el=slots[index];
    const id=project.scenes[index]?.id;
    if(!el||!id)return;
    const pointerId=e.pointerId,startX=e.clientX,startY=e.clientY,startScroll=container.scrollTop;
    const lefts=slots.map(n=>n.offsetLeft),tops=slots.map(n=>n.offsetTop);
    const widths=slots.map(n=>n.offsetWidth),heights=slots.map(n=>n.offsetHeight);
    const crect=container.getBoundingClientRect();
    let started=false,to=index,lastX=startX,lastY=startY,raf=0,zoneSince=0;
    const layout=()=>{
      const dx=lastX-startX;
      const dy=lastY-startY+(container.scrollTop-startScroll);
      el.style.transform=`translate3d(${dx}px,${dy}px,0) scale(1.04)`;

      const curRect=container.getBoundingClientRect();
      const curX=lastX-curRect.left+container.scrollLeft;
      const curY=lastY-curRect.top+container.scrollTop;

      for(let k=0;k<slots.length;k++){
        const padX=widths[k]*0.12;
        const padY=heights[k]*0.12;
        if(
          curX>=lefts[k]+padX&&
          curX<=lefts[k]+widths[k]-padX&&
          curY>=tops[k]+padY&&
          curY<=tops[k]+heights[k]-padY
        ){
          to=k;
          break;
        }
      }

      slots.forEach((n,j)=>{
        if(j===index)return;
        let destIdx=j;
        if(index<to&&j>index&&j<=to)destIdx=j-1;
        else if(index>to&&j>=to&&j<index)destIdx=j+1;
        if(destIdx!==j){
          const sx=lefts[destIdx]-lefts[j];
          const sy=tops[destIdx]-tops[j];
          n.style.transform=`translate3d(${sx}px,${sy}px,0)`;
        }else{
          n.style.transform='';
        }
      });
    };
    const tick=(now:number)=>{
      const edge=30;
      const depth=lastY<crect.top+edge?crect.top+edge-lastY:lastY>crect.bottom-edge?lastY-(crect.bottom-edge):0;
      if(!depth)zoneSince=0;
      else{
        if(!zoneSince)zoneSince=now;
        if(now-zoneSince>140){
          const ratio=Math.min(1,depth/edge);
          const v=Math.max(1,Math.round(13*ratio*ratio))*(lastY<crect.top+edge?-1:1);
          container.scrollTop+=v;
          layout();
        }
      }
      raf=requestAnimationFrame(tick);
    };
    const move=(ev:PointerEvent)=>{
      if(ev.pointerId!==pointerId)return;
      lastX=ev.clientX;
      lastY=ev.clientY;
      if(!started){
        if(Math.hypot(ev.clientX-startX,ev.clientY-startY)<5)return;
        started=true;
        el.classList.add('is-dragging');
        container.classList.add('is-sorting');
        document.body.classList.add('nv-is-sorting');
        raf=requestAnimationFrame(tick);
      }
      ev.preventDefault();
      layout();
    };
    const finish=(commit:boolean)=>{
      document.removeEventListener('pointermove',move);
      document.removeEventListener('pointerup',up);
      document.removeEventListener('pointercancel',cancel);
      document.removeEventListener('keydown',key);
      document.body.classList.remove('nv-is-sorting');
      cancelAnimationFrame(raf);
      if(!started)return;
      suppressClick.current=true;
      window.setTimeout(()=>{suppressClick.current=false;},0);
      sortBusy.current=true;
      const apply=commit&&to!==index;
      const finalX=apply?lefts[to]-lefts[index]:0;
      const finalY=apply?tops[to]-tops[index]:0;
      el.classList.add('is-settling');
      el.style.transform=`translate3d(${finalX}px,${finalY}px,0) scale(1)`;
      if(!apply)slots.forEach(n=>{if(n!==el)n.style.transform='';});
      window.setTimeout(()=>{
        if(apply)flushSync(()=>moveScene(id,to>index?to+1:to));
        slots.forEach(n=>{n.style.transition='none';n.style.transform='';n.classList.remove('is-dragging','is-settling');});
        container.classList.remove('is-sorting');
        requestAnimationFrame(()=>{slots.forEach(n=>{n.style.transition='';});sortBusy.current=false;});
      },170);
    };
    const up=(ev:PointerEvent)=>{if(ev.pointerId===pointerId)finish(true);};
    const cancel=(ev:PointerEvent)=>{if(ev.pointerId===pointerId)finish(false);};
    const key=(ev:KeyboardEvent)=>{if(ev.key==='Escape')finish(false);};
    document.addEventListener('pointermove',move,{passive:false});
    document.addEventListener('pointerup',up);
    document.addEventListener('pointercancel',cancel);
    document.addEventListener('keydown',key);
  }
  // Réordonne les scènes. `insertAt` = position d'insertion (0..n) dans l'ordre actuel.
  // Les liens de navigation utilisent les identifiants : aucun lien n'est cassé par le changement d'ordre.
  function moveScene(id:string,insertAt:number){
    setProject(p=>{
      const from=p.scenes.findIndex(sc=>sc.id===id);
      if(from<0)return p;
      const target=Math.max(0,Math.min(p.scenes.length,insertAt));
      const to=target>from?target-1:target;
      if(to===from)return p;
      const scenes=[...p.scenes];
      const [moved]=scenes.splice(from,1);
      scenes.splice(to,0,moved);
      return {...p,scenes};
    });
  }
  /** Place un point proposé à la position actuelle de la caméra. Lien/téléphone seulement si l'information est vérifiée. */
  function placeInterestPoint(s:InterestSuggestion){
    const cam=cameraRef.current;
    if(!activeId||cam.sceneId!==activeId){setStatus('Ouvre un panorama et oriente la vue avant de placer le point.');return;}
    const label=BRAND_ICON_SET.find(i=>i.key===s.icon)?.label;
    const icon=label?project.icons.find(i=>i.name===label+' · Normal'):undefined;
    const url=urlForSuggestion(s,project.interestInfo??{});
    const h:Hotspot={id:uid(),type:url?'lien':'information',title:s.title,text:'',target:'',yaw:cam.yaw,pitch:cam.pitch,
      ...(url?{url}:{}),...(icon?{iconId:icon.id}:{})} as Hotspot;
    patchScene(sc=>({...sc,hotspots:[...sc.hotspots,h]}));
    setStatus(s.title+' placé dans le panorama'+(url?' (lien vérifié)':'')+' · enregistre avec la disquette.');
  }
  function patchIntroDesign(patch:Partial<IntroDesign>){
    setProject(p=>({...p,introDesign:{backgroundColor:INTRO_DEFAULT_COLORS.background,buttonColor:INTRO_DEFAULT_COLORS.button,...(p.introDesign??DEFAULT_INTRO_DESIGN),...patch}}));
  }
  async function importIntroLogo(file?:File){
    if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)){setStatus('Logo : PNG, JPG ou WebP');return;}
    try{
      const data=await readImage(file);
      if(data.length>INTRO_LIMITS.logoChars){setStatus('Logo trop lourd (1 Mo maximum)');return;}
      patchIntroDesign({logoDataUrl:data});setStatus('Logo de l’introduction ajouté · enregistre avec la disquette.');
    }catch{setStatus('Impossible de lire ce logo');}
  }
  function patchBar(update:Partial<BottomBarItem>){
    setProject(p=>{
      const bottomBar=p.bottomBar.map(b=>b.id===selectedBarId?{...b,...update}:b);
      // Locked proportions: the bar height always follows the biggest button.
      return 'iconSize' in update?{...p,bottomBar,barStyle:{...p.barStyle,height:barHeightFor(bottomBar)}}:{...p,bottomBar};
    });
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
  function chooseBarAction(type:BottomBarItem['type'],tab?:BarGalleryTab){
    if(tab)setBarGalleryTab(tab);
    // Keep existing selections and content when changing the button's action.
    if(type==='plan'){patchBar({type,builtinIcon:'map'});return;}
    patchBar(type==='gallery'?{type,gallery:selectedBar?.gallery??[]}:type==='photos'?{type,photos:selectedBar?.photos??[]}:{type});
  }
  const activeLanguages:StudioLanguage[]=project.languages??STUDIO_LANGUAGES.map(lang=>lang.code);
  const visitorLang=effectiveLang(visitorPrefs,activeLanguages);
  const [windowDemo,setWindowDemo]=useState(false);
  useEffect(()=>{applyCloseColor(project.closeIconId?undefined:project.closeButtonColor,project.closeButtonInk);},[project.closeButtonColor,project.closeButtonInk,project.closeIconId]);
  useEffect(()=>{setTransitionMs(project.transitionMs);},[project.transitionMs]);
  useEffect(()=>{document.documentElement.dataset.windowAnim=project.windowAnimation??'fade';document.documentElement.style.setProperty('--nv-win-dur',(project.windowAnimationMs??700)+'ms');},[project.windowAnimation,project.windowAnimationMs]);
  // La langue choisie dans « Paramètres » s'applique d'office à chaque fenêtre d'information qui s'ouvre (comme un clic sur le drapeau).
  useEffect(()=>{if(info)setInfoLanguage(effectiveLang(visitorPrefs,activeLanguages));},[info?.id,visitorPrefs.lang]); // eslint-disable-line react-hooks/exhaustive-deps
  function triggerBar(item:BottomBarItem){
    if(!preview){
      setSelectedBarId(current=>current===item.id?'':item.id);setPanel('bar');setSelectedId('');setRightHidden(false);
      // Bouton encore vide : on règle tout de suite le bon type d'action d'après son titre (panorama, appel, site, infos…).
      const rec=recommendedType(barKind(item));
      if(item.type!=='plan'&&rec&&rec!==item.type&&!item.url&&!item.text&&!(item.gallery?.length))setProject(p=>({...p,bottomBar:p.bottomBar.map(b=>b.id===item.id?{...b,type:rec,...(rec==='gallery'?{gallery:b.gallery??[]}:{})}:b)}));
      if(creationFullscreen){setFullscreenToolsTab('bar');setFullscreenToolsOpen(true);setFullscreenGalleryOpen(false);}
      return;
    }
    document.documentElement.dataset.windowAnim=item.openAnimation??project.windowAnimation??'fade';
    if(item.type==='plan'){setFloorPlanOpen(true);return;}
    if(item.type==='gallery'){setGalleryOpen(item.id);return;}
    if(item.type==='photos'&&!(item.url&&safeLink(item.url))){setPhotoGalleryId(item.id);return;}
    if(item.type==='photos'){openLinkInTour(item.title,item.url,item.linkMode);return;}
    if(item.type==='navigation'){
      const dest=item.target && visibleIds.has(item.target)?item.target:visibleScenes[0]?.id;
      if(dest)selectScene(dest);
    }else if(item.type==='information') {
      if (item.url && safeLink(item.url)) openLinkInTour(item.title,item.url,item.linkMode,true);
      else {setFrame(null);setInfoLanguage(activeLanguages[0]??'fr');setInfo({id:item.id,type:'information',title:item.title,titleTranslations:item.titleTranslations,text:item.text,translations:item.translations,target:'',yaw:0,pitch:0});}
    }
    else if(item.url)openLinkInTour(item.title,item.url,item.linkMode);
  }
  // Crée les 6 icônes Son (activé / coupé × normal, survol, clic) aux couleurs de la barre et les ajoute à « Mes icônes ».
  async function addSoundIcons(){
    try{
      const bs=project.barStyle;
      const base={primary:bs?.button||'#146d84',secondary:bs?.icon||'#ffffff',accent:bs?.buttonOutline||'#58dfd0',gradient:true,shape:'circle' as const};
      const states=[{k:'Normal',d:base},{k:'Survol',d:{...base,primary:'#b98558',accent:'#e0b07a',secondary:'#ffffff'}},{k:'Clic',d:{...base,primary:'#4a2c15',accent:'#8d5f36',secondary:'#ffffff'}}];
      const made:{on:CustomIcon[];off:CustomIcon[]}={on:[],off:[]};
      for(const kind of ['on','off'] as const)for(const st of states)
        made[kind].push({id:uid(),name:(kind==='on'?'Son activé · ':'Son coupé · ')+st.k,dataUrl:await pngFromSvg(kind==='on'?'sound-on':'sound-off',st.d)});
      setProject(p=>({...p,icons:[...p.icons,...made.on,...made.off].slice(0,150),
        soundOnIconId:made.on[0].id,soundOnHoverIconId:made.on[1].id,soundOnPressedIconId:made.on[2].id,
        soundOffIconId:made.off[0].id,soundOffHoverIconId:made.off[1].id,soundOffPressedIconId:made.off[2].id}));
      setStatus('Icônes Son ajoutées à « Mes icônes » et appliquées (activé et coupé, avec survol et clic). Enregistre avec la disquette.');
    }catch{setStatus('Impossible de créer les icônes Son');}
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
  function requestReplaceIcon(id:string){
    replacingIconId.current=id;
    replaceIconInput.current?.click();
  }
  async function replaceIconEverywhere(file?:File){
    const id=replacingIconId.current;
    if(!file||!id)return;
    replacingIconId.current=null;
    if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type) || file.size>1_500_000){
      setStatus('Icône incompatible (PNG, JPG, WebP, GIF ; maximum 1,5 Mo)');return;
    }
    try {
      const dataUrl=await readImage(file);
      if(!isSafeIconDataUrl(dataUrl))throw Error('Format invalide');
      setProject(p=>({...p,icons:p.icons.map(icon=>icon.id===id?{...icon,dataUrl}:icon)}));
      setStatus('Icône remplacée partout : barre et points de tous les panoramas');
    }catch{setStatus('Impossible de remplacer cette icône');}
    if(replaceIconInput.current)replaceIconInput.current.value='';
  }
  // Supprimer les trois états en une seule mise à jour : aucun état intermédiaire
  // ne doit laisser de référence vers une icône supprimée dans le projet.
  async function deleteIcons(ids:string[],confirmed=false){
    const removed=new Set(ids);
    if(!removed.size)return;
    if(!confirmed&&!await confirmAsk('Supprimer ces icônes et les retirer des boutons et points qui les utilisent ?'))return;
    const keep=(id?:string)=>id&&!removed.has(id)?id:undefined;
    setProject(p=>({
      ...p,
      icons:p.icons.filter(icon=>!removed.has(icon.id)),
      defaultPhotoIcon:p.defaultPhotoIcon&&!removed.has(p.defaultPhotoIcon.iconId)?{
        ...p.defaultPhotoIcon,hoverIconId:keep(p.defaultPhotoIcon.hoverIconId),pressedIconId:keep(p.defaultPhotoIcon.pressedIconId)
      }:undefined,
      defaultVideoIcon:p.defaultVideoIcon&&!removed.has(p.defaultVideoIcon.iconId)?{
        ...p.defaultVideoIcon,hoverIconId:keep(p.defaultVideoIcon.hoverIconId),pressedIconId:keep(p.defaultVideoIcon.pressedIconId)
      }:undefined,
      defaultNavigationIcon:p.defaultNavigationIcon&&!removed.has(p.defaultNavigationIcon.iconId)?{
        ...p.defaultNavigationIcon,hoverIconId:keep(p.defaultNavigationIcon.hoverIconId),pressedIconId:keep(p.defaultNavigationIcon.pressedIconId)
      }:undefined,
      buttonSets:p.buttonSets?.filter(set=>!removed.has(set.iconId)).map(set=>({
        ...set,hoverIconId:keep(set.hoverIconId),pressedIconId:keep(set.pressedIconId)
      })),
      closeIconId:keep(p.closeIconId),closeIconHoverId:keep(p.closeIconHoverId),closeIconPressedId:keep(p.closeIconPressedId),
      soundOnIconId:keep(p.soundOnIconId),soundOnHoverIconId:keep(p.soundOnHoverIconId),soundOnPressedIconId:keep(p.soundOnPressedIconId),
      soundOffIconId:keep(p.soundOffIconId),soundOffHoverIconId:keep(p.soundOffHoverIconId),soundOffPressedIconId:keep(p.soundOffPressedIconId),
      settingsIconId:keep(p.settingsIconId),settingsHoverIconId:keep(p.settingsHoverIconId),settingsPressedIconId:keep(p.settingsPressedIconId),
      hiddenAvailableIcons:p.hiddenAvailableIcons?.filter(id=>!removed.has(id)),
      hiddenIconSets:p.hiddenIconSets?.filter(key=>!ids.some(id=>key.includes(id))),
      favoriteNavigationIconSet:p.favoriteNavigationIconSet&&ids.some(id=>p.favoriteNavigationIconSet!.includes(id))?undefined:p.favoriteNavigationIconSet,
      scenes:p.scenes.map(scene=>({...scene,hotspots:scene.hotspots.map(point=>({
        ...point,iconId:keep(point.iconId),hoverIconId:keep(point.hoverIconId),pressedIconId:keep(point.pressedIconId)
      }))})),
      bottomBar:p.bottomBar.map(button=>({
        ...button,iconId:keep(button.iconId),hoverIconId:keep(button.hoverIconId),pressedIconId:keep(button.pressedIconId)
      }))
    }));
  }
  function deleteIcon(id:string,confirmed=false){deleteIcons([id],confirmed);}

  type GeneralIconTarget={barId:string}|{sceneId:string;pointId:string}|{close:true}|{settings:true}|{soundOn:true}|{soundOff:true};

  // Création d'un pack depuis la bibliothèque générale ou directement depuis n'importe quel onglet/sélecteur.
  // L'import et l'application se font dans UNE mise à jour du projet.
  async function createLibraryIconSet(
    name:string,images:IconSetImages,applyTo?:{sceneId:string;pointId:string},
    generalTarget?:GeneralIconTarget
  ):Promise<void>{
    const rawLabel=name.trim().replace(/[\\/]/g,' ').trim();
    if(!rawLabel||rawLabel.length>100)throw Error('Donne un nom au pack (100 caractères maximum).');
    if(project.icons.length+3>150)throw Error('La bibliothèque est pleine (150 icônes maximum). Supprime un ancien pack avant de continuer.');
    if(applyTo&&!project.scenes.some(sc=>sc.id===applyTo.sceneId&&sc.hotspots.some(h=>h.id===applyTo.pointId&&(h.type==='image'||h.type==='video')))){
      throw Error('Le point photo ou vidéo sélectionné est introuvable.');
    }
    const existingNames=new Set(buildIconSets(project.icons).map(set=>set.name.toLocaleLowerCase('fr')));
    let label=rawLabel,n=2;
    while(existingNames.has(label.toLocaleLowerCase('fr'))){
      label=`${rawLabel} ${n++}`;
    }
    const suffixes=[['normal','Normal'],['hover','Survol'],['pressed','Pressé']] as const;
    const added:CustomIcon[]=suffixes.map(([state,suffix])=>({
      id:uid(),name:label+' · '+suffix,dataUrl:images[state]
    }));
    const patch={iconId:added[0].id,hoverIconId:added[1].id,pressedIconId:added[2].id};
    const point=applyTo??(generalTarget&&'pointId' in generalTarget?generalTarget:undefined);
    const apply=(p:StudioProject):StudioProject=>({...p,icons:[...p.icons,...added],
      scenes:point?p.scenes.map(sc=>sc.id!==point.sceneId?sc:{
        ...sc,hotspots:sc.hotspots.map(h=>h.id===point.pointId?{...h,...patch}:h)
      }):p.scenes,
      bottomBar:generalTarget&&'barId' in generalTarget?p.bottomBar.map(item=>item.id===generalTarget.barId?
        {...item,...patch,useCustomIcon:true}:item):p.bottomBar,
      ...(generalTarget&&'close' in generalTarget?{
        closeIconId:patch.iconId,closeIconHoverId:patch.hoverIconId,closeIconPressedId:patch.pressedIconId
      }:{}),
      ...(generalTarget&&'settings' in generalTarget?{
        settingsIconId:patch.iconId,settingsHoverIconId:patch.hoverIconId,settingsPressedIconId:patch.pressedIconId
      }:{}),
      ...(generalTarget&&'soundOn' in generalTarget?{
        soundOnIconId:patch.iconId,soundOnHoverIconId:patch.hoverIconId,soundOnPressedIconId:patch.pressedIconId
      }:{}),
      ...(generalTarget&&'soundOff' in generalTarget?{
        soundOffIconId:patch.iconId,soundOffHoverIconId:patch.hoverIconId,soundOffPressedIconId:patch.pressedIconId
      }:{})
    });
    validateProject(apply(project));
    setProject(apply);
    const applied=!!(applyTo||generalTarget);
    setStatus('Pack « '+label+' » créé avec Normal, Survol et Pressé'+(applied?' et appliqué':'')+'. Enregistre avec la disquette.');
  }
  /** Bibliothèque générale disponible partout : ajoute les icônes au projet (avec le thème de la barre) et les applique si demandé. */
  function generalLibraryBlock(target?:GeneralIconTarget,applyLabel?:string){
    return <details className="nv-icons-library">
      <summary>Bibliothèque générale d’icônes (thème de la barre)</summary>
      <GeneralIconLibrary applyLabel={applyLabel??''} barTheme={project.barStyle}
        onAdd={(name,images,apply)=>createLibraryIconSet(name,images,undefined,apply?target:undefined)}/>
    </details>;
  }
  /** Ouvre une visite cloud dans l'éditeur (panneau Cloud et fiche client). */
  const openCloudVisit=(p:StudioProject,link:CloudLink,spaceId?:string,intent?:'share'|'export')=>{if(spaceId&&intent)setPendingSpaceIntent({spaceId,intent});const up=ensureFrameReferences(p,viewAreaRef.current?.clientHeight||550);resetProject(up);setPreparationOpen(false);const openSpace=spaceId?(up.spaces??[]).find(sp=>sp.id===spaceId):undefined;setActiveSpaceId(openSpace?.id??null);setActiveId(openSpace?(scenesInSpace(up,openSpace)[0]?.id??''):(startSceneId(up.scenes)));setSelectedId('');setMode(null);setPreview(false);savedRef.current=up;setLock(null);cloud.markSynced(up,link);};
  function popupIconSettings(hotspot:Hotspot,kind:'image'|'video'){
    const target={sceneId:activeId,pointId:hotspot.id};
    return <>
      <MediaIconSelector project={project} value={hotspot} kind={kind} label="Icône du popup" onChange={patchPoint}
        onCreateGeneral={(name,images,apply)=>createLibraryIconSet(name,images,apply?target:undefined)}/>
      <details className="nv-icons-library" key={target.sceneId+':'+target.pointId}>
        <summary>Bibliothèque générale d’icônes (thème de la barre)</summary>
        <GeneralIconLibrary applyLabel="à ce popup" barTheme={project.barStyle}
          onAdd={(name,images,apply)=>createLibraryIconSet(name,images,apply?target:undefined)}/>
      </details>
    </>;
  }
  // Jeux d'icônes déjà utilisés dans le projet (barre + points) : la même combinaison normal / survol / clic n'apparaît qu'une fois.
  type IconSet={key:string;iconId:string;hoverIconId?:string;pressedIconId?:string;size:number;users:string[]};
  function allIconSets():IconSet[]{
    const known=(id?:string)=>id&&project.icons.some(i=>i.id===id)?id:undefined;
    const map=new Map<string,IconSet>();
    const add=(user:string,size:number,i?:string,h?:string,pr?:string)=>{
      const iconId=known(i);
      if(!iconId)return;
      const hoverIconId=known(h),pressedIconId=known(pr);
      const key=iconId+'|'+(hoverIconId??'')+'|'+(pressedIconId??'')+'|'+size; // même PNG mais taille différente = jeu différent
      const entry=map.get(key)??{key,iconId,hoverIconId,pressedIconId,size,users:[]};
      if(entry.users.length<4&&!entry.users.includes(user))entry.users.push(user);
      map.set(key,entry);
    };
    project.buttonSets?.forEach(set=>add('Bouton : '+set.name,set.iconSize,set.iconId,set.hoverIconId,set.pressedIconId));
    project.bottomBar.forEach(b=>add('Barre : '+b.title,barIconSize(b),b.iconId,b.hoverIconId,b.pressedIconId));
    if(project.defaultNavigationIcon){const nav=project.defaultNavigationIcon;add('Flèche par défaut',nav.iconSize,nav.iconId,nav.hoverIconId,nav.pressedIconId);}
    add('Fermeture des popups',42,project.closeIconId,project.closeIconHoverId,project.closeIconPressedId);
    add('Son activé',42,project.soundOnIconId,project.soundOnHoverIconId,project.soundOnPressedIconId);
    add('Son coupé',42,project.soundOffIconId,project.soundOffHoverIconId,project.soundOffPressedIconId);
    project.scenes.forEach(sc=>sc.hotspots.forEach(h=>{
      if(h.type!=='image'&&h.type!=='video')add(sc.name+' : '+h.title,h.iconSize??28,h.iconId,h.hoverIconId,h.pressedIconId);
    }));
    return [...map.values()];
  }
  // Jeux visibles : ceux que l'utilisateur n'a pas retirés de la liste.
  function setNavigationIconFavorite(key:string){
    const chosen=allIconSets().find(set=>set.key===key);
    setProject(p=>({...p,favoriteNavigationIconSet:p.favoriteNavigationIconSet===key?undefined:key,
      defaultNavigationIcon:p.favoriteNavigationIconSet===key||!chosen?undefined:{iconId:chosen.iconId,hoverIconId:chosen.hoverIconId,pressedIconId:chosen.pressedIconId,iconSize:Math.max(16,Math.min(80,chosen.size))}}));
  }
  function collectIconSets():IconSet[]{
    const hidden=new Set(project.hiddenIconSets??[]);
    return allIconSets().filter(set=>!hidden.has(set.key));
  }
  function hiddenIconSetCount():number{
    const hidden=new Set(project.hiddenIconSets??[]);
    return allIconSets().filter(set=>hidden.has(set.key)).length;
  }
  // Retirer un jeu de la liste ne modifie AUCUN bouton ni point : c'est seulement un rangement des suggestions.
  function hideIconSet(key:string){
    setProject(p=>({...p,hiddenIconSets:[...new Set([...(p.hiddenIconSets??[]),key])]}));
    setStatus('Jeu retiré de la liste (tes boutons et points ne changent pas)');
  }
  function showAllIconSets(){
    setProject(p=>({...p,hiddenIconSets:undefined}));
    setStatus('Tous les jeux d’icônes sont de nouveau affichés');
  }
  const restoreHiddenLink=()=>hiddenIconSetCount()>0&&<button type="button" className="icon-set-restore" onClick={showAllIconSets}>{hiddenIconSetCount()} jeu{hiddenIconSetCount()>1?'x':''} masqué{hiddenIconSetCount()>1?'s':''} · Tout réafficher</button>;
  function iconSetCells(set:IconSet){
    const src=(id?:string)=>project.icons.find(i=>i.id===id)?.dataUrl;
    const normal=src(set.iconId),hover=src(set.hoverIconId)??normal,pressed=src(set.pressedIconId)??hover;
    return [['Normal',normal],['Survol',hover],['Clic',pressed]] as const;
  }
  function iconSetPicker(current:{iconId?:string;hoverIconId?:string;pressedIconId?:string;size:number},apply:(set:{iconId:string;hoverIconId?:string;pressedIconId?:string;size:number})=>void){
    const sets=collectIconSets().filter(set=>!(set.iconId===current.iconId&&set.hoverIconId===current.hoverIconId&&set.pressedIconId===current.pressedIconId&&set.size===current.size));
    if(!sets.length)return hiddenIconSetCount()>0?<div className="icon-set-picker">{restoreHiddenLink()}</div>:null;
    return <div className="icon-set-picker">
      <div className="icon-state-label">RÉUTILISER UN JEU D’ICÔNES DÉJÀ CRÉÉ</div>
      <small className="hint-inline">Un clic applique d’un coup le PNG normal, survol, clic <b>et la taille</b> d’un autre bouton ou point. Tu peux ensuite modifier la taille. La croix ✕ retire un jeu de cette liste sans rien changer à tes boutons.</small>
      <div className="icon-set-grid">{sets.map(set=><div className="icon-set-wrap" key={set.key}>
        <button type="button" className="icon-set"
          title={'Utilisé par : '+set.users.join(', ')}
          onClick={()=>{apply(set);setStatus('Jeu d’icônes appliqué : normal, survol, clic et taille ('+set.size+' px)');}}>
          {iconSetCells(set).map(([label,url])=><span className="icon-set-cell" key={label}><img src={url} alt=""/><small>{label}</small></span>)}
          <span className="icon-set-size">{set.size} px</span>
        </button>
        <button type="button" className={'nv-icon-set-favorite'+(project.favoriteNavigationIconSet===set.key?' is-active':'')} title="Flèche favorite du projet" aria-pressed={project.favoriteNavigationIconSet===set.key} onClick={()=>setNavigationIconFavorite(set.key)}>{project.favoriteNavigationIconSet===set.key?'★':'☆'}</button>
        <button type="button" className="icon-set-hide" title="Retirer ce jeu de la liste (aucun bouton ni point n'est modifié)" aria-label="Retirer ce jeu de la liste" onClick={()=>hideIconSet(set.key)}><XMark/></button>
      </div>)}</div>
      {restoreHiddenLink()}
    </div>;
  }
  /** Packs de la bibliothèque (PNG nommés …_normal / …_hover / …_pressed) : un clic applique les trois états d'un coup. */
  function libraryPackPicker(currentIconId:string|undefined,apply:(patch:{iconId:string;hoverIconId?:string;pressedIconId?:string})=>void){
    const packs=buildIconSets(project.icons).filter(g=>g.normal||g.hover||g.pressed);
    if(!packs.length)return null;
    return <div className="icon-set-picker nv-library-pack-picker">
      <div className="icon-state-label">PACK DE LA BIBLIOTHÈQUE</div>
      <small className="hint-inline">Un clic applique d’un coup normal, survol et clic de ce pack.</small>
      <div className="icon-set-grid">{packs.map(g=>{
        const main=(g.normal??g.hover??g.pressed) as CustomIcon;
        const active=currentIconId===main.id;
        return <button type="button" key={g.key} className={'icon-set'+(active?' is-active':'')} title={'Pack « '+g.name+' »'}
          onClick={()=>{apply({iconId:main.id,hoverIconId:g.hover?.id,pressedIconId:g.pressed?.id});setStatus('Pack « '+g.name+' » appliqué (normal, survol, clic)');}}>
          {([['Normal',g.normal],['Survol',g.hover],['Clic',g.pressed]] as const).map(([label,icon])=><span className="icon-set-cell" key={label}>
            {icon?<img src={icon.dataUrl} alt=""/>:<i className="icon-set-empty"/>}<small>{label}</small></span>)}
          <span className="icon-set-size">{g.name}</span>
        </button>;})}</div>
    </div>;
  }
  // Choix rapide d'un jeu complet, identique à l'inspecteur principal :
  // une sélection applique normal + survol + clic + taille en une seule opération.
  function fullscreenIconSetPicker(
    current:{iconId?:string;hoverIconId?:string;pressedIconId?:string;size:number},
    apply:(set:{iconId:string;hoverIconId?:string;pressedIconId?:string;size:number})=>void
  ){
    const sets=collectIconSets();
    return <div className="nv-quick-icon-pack">
      <div className="nv-quick-section-title">JEUX D’ICÔNES COMPLETS</div>
      <p className="nv-quick-hint">Choisis un groupe : les trois états (normal, survol, clic) et la taille sont appliqués ensemble.</p>
      {sets.length>0?<div className="nv-quick-icon-packs">
        {sets.map(set=>{
          const isCurrent=set.iconId===current.iconId&&
            set.hoverIconId===current.hoverIconId&&
            set.pressedIconId===current.pressedIconId&&set.size===current.size;
          return <button type="button" key={set.key}
            className={'nv-quick-icon-pack-choice'+(isCurrent?' is-active':'')}
            title={'Utilisé par : '+set.users.join(', ')}
            aria-pressed={isCurrent}
            onClick={()=>{apply(set);setStatus('Jeu appliqué : normal, survol, clic et taille ('+set.size+' px)');}}>
            <span className="nv-quick-icon-pack-icons">
              {iconSetCells(set).map(([label,url])=><span key={label} className="nv-quick-icon-pack-state">
                {url?<img src={url} alt={label}/>:<span className="nv-quick-icon-pack-empty">◎</span>}
                <small>{label}</small>
              </span>)}
            </span>
            <span className="nv-quick-icon-pack-caption">{set.size} px{isCurrent?' · Actuel':''}</span>
          </button>;
        })}
      </div>:<p className="nv-quick-hint">Aucun pack enregistré. Crée un jeu dans le panneau classique ; il apparaîtra automatiquement ici.</p>}
      {hiddenIconSetCount()>0&&<button type="button" className="nv-quick-icon-pack-restore" onClick={showAllIconSets}>
        Réafficher les {hiddenIconSetCount()} jeux masqués
      </button>}
    </div>;
  }
  // Un seul état à la fois : on voit l'icône de CE bouton, avec accès direct à la bibliothèque du projet ET à la bibliothèque générale.
  function iconStateEditor(key:string,label:string,iconId:string|undefined,apply:(value:string|undefined)=>void,fallback:string){
    const icon=project.icons.find(i=>i.id===iconId);
    const openProject=libraryFor===key;
    const openGeneral=libraryFor===key+':general';
    const open=openProject||openGeneral;
    return <div className="icon-state">
      <div className="icon-state-label">{label}</div>
      <div className="icon-state-row">
        <div className="icon-state-preview" title={icon?.name??fallback}>{icon?<img src={icon.dataUrl} alt={icon.name}/>:<span>{fallback}</span>}</div>
        <div className="icon-state-actions">
          <button type="button" className="tool" onClick={()=>{stateTarget.current=apply;stateIconInput.current?.click();}}>{icon?'Remplacer par un fichier…':'Importer un fichier…'}</button>
          <button type="button" className="tool" onClick={()=>setLibraryFor(openProject?null:key)}>{openProject?'Fermer ma bibliothèque':'Choisir dans ma bibliothèque'}</button>
          <button type="button" className="tool" onClick={()=>setLibraryFor(openGeneral?null:key+':general')}>{openGeneral?'Fermer la bibliothèque générale':'Bibliothèque générale (thème barre)'}</button>
          {icon&&<button type="button" className="tool" onClick={()=>apply(undefined)}>Retirer</button>}
        </div>
      </div>
      {open&&<>
        <div className="nv-general-tab-bar" role="tablist" aria-label="Source de l'icône">
          <button type="button" role="tab" aria-selected={openProject} aria-pressed={openProject} className={openProject?'is-on':''} onClick={()=>setLibraryFor(key)}>
            Icônes du projet ({project.icons.length})
          </button>
          <button type="button" role="tab" aria-selected={openGeneral} aria-pressed={openGeneral} className={openGeneral?'is-on':''} onClick={()=>setLibraryFor(key+':general')}>
            Bibliothèque générale
          </button>
        </div>
        {openGeneral?<GeneralIconLibrary
          barTheme={project.barStyle}
          applyLabel={'à « '+label+' »'}
          onAdd={async(name,images,shouldApply)=>{
            const rawLabel=name.trim().replace(/[\\/]/g,' ').trim()||'Icône';
            if(project.icons.length+3>150)throw Error('La bibliothèque est pleine (150 icônes maximum).');
            const existingNames=new Set(buildIconSets(project.icons).map(set=>set.name.toLocaleLowerCase('fr')));
            let packLabel=rawLabel,n=2;
            while(existingNames.has(packLabel.toLocaleLowerCase('fr')))packLabel=`${rawLabel} ${n++}`;
            const added:CustomIcon[]=[
              {id:uid(),name:packLabel+' · Normal',dataUrl:images.normal},
              {id:uid(),name:packLabel+' · Survol',dataUrl:images.hover},
              {id:uid(),name:packLabel+' · Pressé',dataUrl:images.pressed}
            ];
            setProject(p=>({...p,icons:[...p.icons,...added].slice(0,150)}));
            if(shouldApply){
              const chosenId=key.includes('hover')?added[1].id:key.includes('pressed')?added[2].id:added[0].id;
              apply(chosenId);
              setLibraryFor(null);
            }
          }}
        />:<div className="icon-choice-row">
          {[...project.icons].sort((a,b)=>a.name.localeCompare(b.name,'fr',{sensitivity:'base'})).map(i=><span key={i.id} className="icon-choice-wrap">
            <button type="button" title={i.name} className={i.id===iconId?'icon-choice chosen':'icon-choice'} onClick={()=>{apply(i.id);setLibraryFor(null);}}>
              <img src={i.dataUrl} alt={i.name}/></button>
            <button type="button" className="icon-delete" title={'Supprimer « '+i.name+' » de la bibliothèque'} aria-label={'Supprimer '+i.name} onClick={()=>deleteIcon(i.id)}><XMark/></button>
          </span>)}
          <button type="button" className="icon-choice icon-upload" title="Ajouter un nouveau PNG" onClick={()=>{stateTarget.current=apply;stateIconInput.current?.click();}}>＋</button>
        </div>}
      </>}
    </div>;
  }
  async function importStateIcon(file?:File){
    const apply=stateTarget.current;
    stateTarget.current=null;
    if(stateIconInput.current)stateIconInput.current.value='';
    if(!file||!apply)return;
    if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)||file.size>1_500_000){
      setStatus('Icône incompatible (PNG, JPG, WebP, GIF ; maximum 1,5 Mo)');return;
    }
    try{
      const dataUrl=await readImage(file);
      if(!isSafeIconDataUrl(dataUrl))throw Error('Format invalide');
      const created:CustomIcon={id:uid(),name:file.name.replace(/\.[^/.]+$/,'').slice(0,100),dataUrl};
      setProject(p=>({...p,icons:[...p.icons,created].slice(0,150)}));
      apply(created.id);
      setStatus('PNG appliqué à cet état du bouton uniquement');
    }catch{setStatus('Impossible de lire cette icône');}
  }
  // Upload directly within the native fullscreen element, so the user never
  // needs to leave the panorama or click a hidden input outside fullscreen.
  async function uploadFullscreenIcon(file:File|undefined,field:'iconId'|'hoverIconId'|'pressedIconId'){
    if(!file)return;
    if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)||file.size>1_500_000){
      setStatus('Icône invalide : PNG/JPG/WebP/GIF, 1,5 Mo max');return;
    }
    try{
      const url=await readImage(file);
      if(!isSafeIconDataUrl(url))throw Error('Format non pris en charge');
      const id=uid();
      const icon:CustomIcon={id,name:file.name.replace(/\.[^.]+$/,'').slice(0,100),dataUrl:url};
      const pointId=selectedId,barId=selectedBarId,sceneId=activeId,tab=fullscreenToolsTab;
      setProject(p=>({
        ...p,icons:[...p.icons,icon].slice(0,150),
        scenes:tab==='point'?p.scenes.map(sc=>sc.id!==sceneId?sc:{...sc,
          hotspots:sc.hotspots.map(h=>h.id===pointId?{...h,[field]:id}:h)}):p.scenes,
        bottomBar:tab==='bar'?p.bottomBar.map(b=>b.id===barId?{...b,[field]:id}:b):p.bottomBar
      }));
      setStatus('Icône importée et appliquée');
    }catch{setStatus('Erreur pendant l’import de l’icône');}
  }
  function selectPointForEditing(id:string){
    if(autoNavigation)stopAutoNavigation();
    setSelectedId(id);setSelectedBarId('');setPanel('points');setMode(null);setRightHidden(false);
    setDestinationEditId(null);setClassicDestinationOpen(false);setNavigationPickerOpen(false);
    setFullscreenGalleryOpen(false);setFullscreenCommandDrawerOpen(false);
    if(creationFullscreen){setFullscreenToolsTab('point');setFullscreenToolsOpen(true);}
    // Flèche sans destination : on ouvre directement la galerie 360° pour choisir le panorama d'arrivée.
    const hs=active?.hotspots.find(h=>h.id===id);
    if(!creationFullscreen&&!preview&&active&&hs?.type==='navigation'&&(!hs.target||!project.scenes.some(sc=>sc.id===hs.target))){
      setClassicDestinationSearch('');
      setClassicDestinationPreviewId(suggestDestinations(active.id)[0]?.id??project.scenes.find(sc=>sc.id!==active.id)?.id??null);
      setClassicDestinationOpen(true);
    }
  }
  /** Applique l'icône (normal / survol / clic) et la taille du point sélectionné à tous les points du même type de la visite, et en fait le choix par défaut des prochains points. */
  const TYPE_LABELS:Record<string,string>={navigation:'toutes les flèches',image:'tous les points photo',video:'tous les points vidéo',information:'tous les points information',lien:'tous les liens'};
  /** Réglette de taille de l'icône du point sélectionné (16 à 80 px). */
  function iconSizeControl(){
    if(!selected)return null;
    if(selected.type==='navigation'&&selected.sphere){
      const d=Math.max(40,Math.min(120,selected.iconSize??90));
      return <label className="nv-size-control">Diamètre de la sphère : <b>{d} px</b>
        <input type="range" min="40" max="120" step="2" value={d} onChange={e=>patchPoint({iconSize:Number(e.target.value)})}/></label>;
    }
    const current=selected.iconSize??(isPopupMedia(selected)?42:28);
    return <label className="nv-size-control">Taille de l’icône : <b>{current} px</b>
      <input type="range" min="16" max="80" step="2" value={current} onChange={e=>patchPoint({iconSize:Number(e.target.value)})}/></label>;
  }
  async function applyIconToAll(){
    if(!selected)return;
    const type=selected.type,{iconId,hoverIconId,pressedIconId}=selected,iconSize=selected.iconSize;
    const n=project.scenes.reduce((sum,sc)=>sum+sc.hotspots.filter(h=>h.type===type).length,0);
    if(!await confirmAsk('Appliquer cette icône (et sa taille) à '+(TYPE_LABELS[type]??'tous les points du même type')+' de la visite ? '+n+' point'+(n>1?'s':'')+' '+(n>1?'seront':'sera')+' modifié'+(n>1?'s':'')+'. Tu peux annuler avec Ctrl+Z.'))return;
    setProject(p=>{
      const def=iconId?{iconId,hoverIconId,pressedIconId,iconSize:iconSize??28}:undefined;
      return {...p,
        ...(type==='navigation'?{defaultNavigationIcon:def}:type==='image'?{defaultPhotoIcon:def}:type==='video'?{defaultVideoIcon:def}:{}),
        scenes:p.scenes.map(sc=>({...sc,hotspots:sc.hotspots.map(h=>h.type!==type?h:{...h,iconId,hoverIconId,pressedIconId,iconSize})}))};
    });
    setStatus('Icône appliquée à '+n+' point'+(n>1?'s':'')+' · enregistre pour conserver');
  }
  function applyAllButton(){
    if(!selected)return null;
    const n=project.scenes.reduce((sum,sc)=>sum+sc.hotspots.filter(h=>h.type===selected.type).length,0);
    return <button type="button" className="nv-apply-all" onClick={applyIconToAll} title="Remplace l'icône de tous les points du même type de la visite">
      ⟳ Remplacer {TYPE_LABELS[selected.type]??'tous les points du même type'} par cette icône <b>({n})</b></button>;
  }
  // « Retour » en haut à gauche de la colonne de droite : on revient toujours à l'écran précédent quand il existe.
  const CHILD_PANELS:PanelTab[]=['icons','plan','music','medialib','tool'];
  useEffect(()=>{
    const prev=prevPanelRef.current;
    if(prev!==panel){
      if(CHILD_PANELS.includes(panel)&&!CHILD_PANELS.includes(prev))setPanelBack({panel:prev,hub:hubOpen,barId:selectedBarId,pointId:selectedId});
      else if(!CHILD_PANELS.includes(panel))setPanelBack(null);
      prevPanelRef.current=panel;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[panel]);
  function inspectorBack():(()=>void)|null{
    if(CHILD_PANELS.includes(panel)){
      const b=panelBack;
      return ()=>{setPanelBack(null);setLibraryFor(null);if(b){setPanel(b.panel);setHubOpen(b.hub);setSelectedBarId(b.barId);setSelectedId(b.pointId);}else setPanel('points');};
    }
    if(panel==='bar'){
      if(selectedBarId)return ()=>{setSelectedBarId('');if(hubOpen.bar?.startsWith('btn:'))setHubOpen(h=>({...h,bar:null}));};
      if(hubOpen.bar)return ()=>setHubOpen(h=>({...h,bar:null}));
    }
    if(panel==='points'){
      if(selected)return ()=>setSelectedId('');
      if(hubOpen.scene)return ()=>setHubOpen(h=>({...h,scene:null}));
    }
    return null;
  }
  /** Réglages du bouton de la barre sélectionné (partagés par la liste « Boutons et actions » et les tuiles par bouton). */
  function renderBarButtonConfig(){
    return <>{selectedBar && <InspectorSection key={selectedBar.id} title={"Configurer : "+selectedBar.title} initiallyOpen>
            <hr/>
            <div id="nv-bar-button-settings" className="section-title">CONFIGURER LE BOUTON</div>
            <label>Libellé<input value={selectedBar.title} onChange={e=>patchBar(selectedBar.type==='gallery'&&selectedBar.galleryTitle?{title:e.target.value,galleryTitle:undefined}:{title:e.target.value})}/></label><button type="button" className="primary" onClick={()=>{document.documentElement.dataset.windowAnim=selectedBar.openAnimation??project.windowAnimation??'fade';setWindowDemo(true);}}>▶ Tester cet effet</button><label>Animation à l’ouverture<select value={selectedBar.openAnimation??''} onChange={e=>patchBar({openAnimation:e.target.value?e.target.value as WindowAnimation:undefined})}><option value="">Comme le réglage général</option>{WINDOW_ANIMATIONS.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select></label>
                  <button type="button" className="nv-test-anim" onClick={()=>{document.documentElement.dataset.windowAnim=selectedBar.openAnimation??project.windowAnimation??'fade';setWindowDemo(false);window.setTimeout(()=>setWindowDemo(true),30);}}>▶ Tester l’animation</button>
            {selectedBar.type!=='plan'&&<BarSmartCard item={selectedBar} onPatch={patchBar} onChooseGallery={()=>chooseBarAction('gallery','panoramas')} library={project.mediaLibrary??[]} onOpenLibrary={()=>{setPanel('medialib');setRightHidden(false);}}/>}
            <div className="section-title">ACTION DU BOUTON</div>
            <div className="nv-bar-action-choices" role="group" aria-label="Action du bouton">
              <button type="button" aria-pressed={selectedBar.type==='navigation'} onClick={()=>chooseBarAction('navigation')}>➜ Panorama</button>
              <button type="button" aria-pressed={selectedBar.type==='gallery'&&barGalleryTab==='panoramas'} onClick={()=>chooseBarAction('gallery','panoramas')}>▧ Panoramas</button>
              <button type="button" aria-pressed={selectedBar.type==='gallery'&&barGalleryTab==='spaces'} onClick={()=>chooseBarAction('gallery','spaces')}>▦ Espaces</button>
              <button type="button" aria-pressed={selectedBar.type==='plan'} onClick={()=>chooseBarAction('plan')}>⌖ Plan</button>
              <button type="button" aria-pressed={selectedBar.type==='photos'} onClick={()=>chooseBarAction('photos')}>▣ Photos</button>
              <button type="button" aria-pressed={selectedBar.type==='information'} onClick={()=>chooseBarAction('information')}>ⓘ Information</button>
              <button type="button" aria-pressed={selectedBar.type==='lien'} onClick={()=>chooseBarAction('lien')}>↗ Lien</button>
            </div>
            {selectedBar.type==='plan'?<><p className="hint">Ce bouton ouvre la galerie des plans interactifs : flèches gauche/droite et points panoramiques pour chaque plan.</p>
              {!plansInSpace(project,currentSpace).length&&<p role="status">Importe d’abord un plan dans l’outil Plan.</p>}
              <button type="button" onClick={()=>{setPanel('plan');setRightHidden(false);}}>Configurer le plan</button></>:selectedBar.type==='gallery'?<BarGalleryEditor renderPreview={id=>{const scene=project.scenes.find(sc=>sc.id===id);return scene?<FullscreenGalleryHoverPreview scene={scene} thumb={sceneThumbs[id]}/>:null;}} item={selectedBar} scenes={project.scenes} spaces={project.spaces??[]} thumbs={sceneThumbs} tab={barGalleryTab} onTabChange={setBarGalleryTab} onChange={patchBar} onPreview={()=>{setPreview(true);setMode(null);setSelectedId('');setIntroVisible(false);setGalleryOpen(selectedBar.id);}}/>:selectedBar.type==='navigation'?<label>Scène de destination<select value={selectedBar.target} onChange={e=>patchBar({target:e.target.value})}><option value="">Première scène (accueil)</option>{project.scenes.map(sc=><option key={sc.id} value={sc.id}>{sc.name}</option>)}</select></label>
            : selectedBar.type==='information'?<><label>Contenu du panneau<textarea rows={5} value={selectedBar.text} onChange={e=>patchBar({text:e.target.value})} placeholder="Horaires, description, informations utiles…"/></label>
              <label>Page intégrée (optionnel)<input type="text" value={selectedBar.url} placeholder="https://… menu, photos, réservations" onChange={e=>patchBar({url:e.target.value})}/></label>
              <small className="hint-inline">Si tu renseignes une URL, elle remplacera le texte par une fenêtre intégrée.</small></>
            :<label>Lien de destination<input type="text" value={selectedBar.url} placeholder="https://… ou tel:+33…" onChange={e=>patchBar({url:e.target.value})}/>{selectedBar.url && !safeLink(selectedBar.url)&&<small className="warning-inline">Adresse invalide : https://, mailto: ou tel: requis</small>}{selectedBar.type==='photos'&&<small className="hint-inline">Si tu mets un lien ici (par exemple la galerie en ligne …/kamci-galerie/#imperia), ce bouton l’ouvre dans la visite à la place de la galerie de photos.</small>}</label>}
            {(selectedBar.type==='lien'||selectedBar.type==='information'||selectedBar.type==='photos')&&!!selectedBar.url&&<label>Ouverture du lien
              <select value={selectedBar.linkMode??'embed'} onChange={e=>patchBar({linkMode:e.target.value as 'embed'|'tab'})}><option value="embed">Dans la visite (fenêtre intégrée)</option><option value="tab">Dans un nouvel onglet</option></select>
              {refusesEmbedding(selectedBar.url)&&<small className="hint-inline">Instagram, Facebook, LinkedIn… refusent d’être affichés dans une fenêtre intégrée : ce lien s’ouvre automatiquement dans un nouvel onglet.</small>}</label>}
            <InspectorSection title="Icônes : normal, survol, clic">
            {generalLibraryBlock({barId:selectedBar.id},'au bouton « '+selectedBar.title+' »')}
            {iconSetPicker({...selectedBar,size:barIconSize(selectedBar)},set=>patchBar({iconId:set.iconId,hoverIconId:set.hoverIconId,pressedIconId:set.pressedIconId,iconSize:set.size,useCustomIcon:true}))}
            {libraryPackPicker(selectedBar.iconId,patch=>patchBar({...patch,useCustomIcon:true}))}
            {iconStateEditor('bar-normal','PNG normal',selectedBar.iconId,id=>patchBar({iconId:id,useCustomIcon:!!id}),'Icône par défaut')}
            {selectedBar.iconId && <button type="button" className="style-reset" onClick={()=>requestReplaceIcon(selectedBar.iconId!)}>Remplacer ce PNG dans toute la visite</button>}
            {iconStateEditor('bar-hover','PNG au survol',selectedBar.hoverIconId,id=>patchBar({hoverIconId:id}),'Identique au normal')}
            {iconStateEditor('bar-pressed','PNG au clic',selectedBar.pressedIconId,id=>patchBar({pressedIconId:id}),'Identique au survol')}
            {(!selectedBar.iconId||!barUsesIconImage(project.barStyle,selectedBar)) && <label>Icône de base<select value={selectedBar.builtinIcon??'info'} onChange={e=>patchBar({builtinIcon:e.target.value})}>
              {Object.keys(glyphs).map(key=><option value={key} key={key}>{key}</option>)}
            </select></label>}
            </InspectorSection>
            <InspectorSection title="Taille et position">
            <label>Taille : {barIconSize(selectedBar)} px<input type="range" min="20" max="72" step="2" value={barIconSize(selectedBar)} onChange={e=>patchBar({iconSize:Number(e.target.value)})}/></label>
            {selectedBar.iconId&&<>
              <label>Zoom de l’icône : {selectedBar.iconZoom??100} %<input type="range" min="100" max="250" step="5" value={selectedBar.iconZoom??100} onChange={e=>patchBar({iconZoom:Number(e.target.value)})}/></label>
              <button type="button" className="style-reset" onClick={()=>{const src=project.icons.find(i=>i.id===selectedBar.iconId)?.dataUrl;if(!src)return;void autoIconZoom(src).then(z=>{patchBar({iconZoom:z});setStatus('Icône ajustée automatiquement : zoom '+z+' %');});}} title="Mesure les marges transparentes de l’image et l’agrandit pour qu’elle remplisse son bouton comme les autres icônes">Ajuster automatiquement la taille de l’icône</button>
            </>}
            <button type="button" className="style-reset" onClick={()=>{const size=barIconSize(selectedBar);setProject(p=>withBarSize(p,size));setStatus('Taille '+size+' px appliquée à tous les boutons');}}>Appliquer cette taille à tous les boutons</button>
            <div className="reorder-row"><button className="tool" onClick={()=>moveBar(-1)}>← Déplacer</button><button className="tool" onClick={()=>moveBar(1)}>Déplacer →</button></div>
            </InspectorSection>
            <button className="delete" onClick={()=>{setProject(p=>({...p,bottomBar:p.bottomBar.filter(b=>b.id!==selectedBarId)}));setSelectedBarId('');}}>Supprimer ce bouton</button>
          </InspectorSection>}</>;
  }
  /** « Appliquer le thème » : bouton Paramètres et croix de fermeture aux couleurs réelles de la barre (fond = boutons, picto = icônes). */
  function applyBarThemeEverywhere(){
    const t=barTheme;
    if(!/^#[0-9a-f]{6}$/i.test(t.button)||!/^#[0-9a-f]{6}$/i.test(t.icon))return;
    setProject(p=>({...p,closeIconId:undefined,closeIconHoverId:undefined,closeIconPressedId:undefined,
      settingsIconId:undefined,settingsHoverIconId:undefined,settingsPressedIconId:undefined,
      closeButtonColor:t.button,closeButtonInk:t.icon,settingsColor:t.button,settingsIconColor:t.icon}));
    setStatus('Thème de la barre appliqué au bouton Paramètres et aux croix. ↶ pour annuler · enregistre avec la disquette.');
  }
  /** Panneau Icônes : couleurs de la visite (barre, bouton Paramètres, croix) avec aperçu en direct et « Appliquer le thème » en un clic. */
  function visitColorsCard(){
    const t=barTheme;
    const isHex=(c?:string):c is string=>!!c&&/^#[0-9a-f]{6}$/i.test(c);
    const palette=[...new Set([t.button,t.icon,t.background,t.outline,'#ffffff','#1c1c1c'].filter(isHex).map(c=>c.toLowerCase()))];
    const lumi=(c:string)=>{const n=parseInt(c.slice(1),16);return (0.299*(n>>16&255)+0.587*(n>>8&255)+0.114*(n&255))/255;};
    const closeBg=isHex(project.closeButtonColor)?project.closeButtonColor:t.button;
    const closeInk=isHex(project.closeButtonInk)?project.closeButtonInk:(isHex(closeBg)&&lumi(closeBg)>0.55?'#1b1208':'#ffffff');
    const setBg=project.settingsColor??t.button,setFg=project.settingsIconColor??t.icon;
    const barItem=project.bottomBar.find(item=>item.iconId&&barUsesIconImage(project.barStyle,item));
    const barImg=barItem?project.icons.find(i=>i.id===barItem.iconId)?.dataUrl:undefined;
    const themed=!closeIcon&&!settingsIconSrc&&project.closeButtonColor?.toLowerCase()===t.button.toLowerCase()&&project.closeButtonInk?.toLowerCase()===t.icon.toLowerCase()
      &&setBg.toLowerCase()===t.button.toLowerCase()&&setFg.toLowerCase()===t.icon.toLowerCase();
    const noPng={closeIconId:undefined,closeIconHoverId:undefined,closeIconPressedId:undefined};
    const noSettingsPng={settingsIconId:undefined,settingsHoverIconId:undefined,settingsPressedIconId:undefined};
    const pick=(label:string,value:string,onPick:(c:string)=>void)=><div className="nv-vc-pick">
      <span className="nv-vc-pick-label">{label}</span>
      <div className="nv-vc-swatches">
        {palette.map(c=><button type="button" key={c} className={value.toLowerCase()===c?'is-on':''} style={{background:c}} title={c} aria-label={label+' '+c} onClick={()=>onPick(c)}/>)}
        <label className="nv-vc-custom" title="Autre couleur"><input type="color" aria-label={label+' : autre couleur'} value={isHex(value)?value:'#888888'} onChange={e=>onPick(e.target.value)}/><span>+</span></label>
      </div>
    </div>;
    return <section className="nv-vc" aria-label="Couleurs de la visite">
      <header className="nv-vc-head"><Palette size={18}/><div><strong>Couleurs de la visite</strong><small>Barre du bas, bouton Paramètres et croix de fermeture</small></div></header>
      <div className="nv-vc-preview" aria-label="Aperçu">
        <figure><span className="nv-vc-dot" style={{background:t.button,color:t.icon,borderColor:t.buttonOutline}}>{barImg?<img src={barImg} alt=""/>:<Home size={20}/>}</span><figcaption>Barre</figcaption></figure>
        <figure><span className="nv-vc-dot" style={{background:setBg,color:setFg}}>{settingsIconSrc?<img src={settingsIconSrc} alt=""/>:<SettingsIcon size={20}/>}</span><figcaption>Paramètres</figcaption></figure>
        <figure><span className="nv-vc-dot" style={{background:closeBg,color:closeInk}}>{closeIcon?<img src={closeIcon.dataUrl} alt=""/>:<X size={20}/>}</span><figcaption>Croix</figcaption></figure>
      </div>
      <button type="button" className={'nv-vc-apply'+(themed?' is-done':'')} onClick={applyBarThemeEverywhere} disabled={!isHex(t.button)||!isHex(t.icon)}>
        <span className="nv-vc-apply-chips"><i style={{background:t.button}}/><i style={{background:t.icon}}/></span>
        {themed?'✓ Thème de la barre appliqué':'Appliquer le thème de la barre partout'}
      </button>
      <small className="nv-vc-note">Met le bouton Paramètres et les croix aux couleurs de la barre{(closeIcon||settingsIconSrc)?' (les images personnalisées de croix / Paramètres sont remplacées par la version couleur)':''}.</small>
      <details className="nv-vc-fine">
        <summary>Régler chaque élément</summary>
        <div className="nv-vc-group">
          <strong><X size={15}/> Croix de fermeture</strong>
          {pick('Fond',closeBg,c=>setProject(p=>({...p,...noPng,closeButtonColor:c})))}
          {pick('Croix',closeInk,c=>setProject(p=>({...p,...noPng,closeButtonColor:p.closeButtonColor??t.button,closeButtonInk:c})))}
          <button type="button" className="nv-vc-reset" disabled={!project.closeButtonColor&&!project.closeButtonInk} onClick={()=>setProject(p=>({...p,closeButtonColor:undefined,closeButtonInk:undefined}))}>Couleurs par défaut</button>
        </div>
        <div className="nv-vc-group">
          <strong><SettingsIcon size={15}/> Bouton Paramètres</strong>
          {settingsIconSrc&&<small className="nv-vc-note">Une image personnalisée est active : choisir une couleur la remplace par la roue crantée.</small>}
          {pick('Fond',setBg,c=>setProject(p=>({...p,...noSettingsPng,settingsColor:c})))}
          {pick('Roue',setFg,c=>setProject(p=>({...p,...noSettingsPng,settingsIconColor:c})))}
          <button type="button" className="nv-vc-reset" disabled={!project.settingsColor&&!project.settingsIconColor} onClick={()=>setProject(p=>({...p,settingsColor:undefined,settingsIconColor:undefined}))}>Couleurs de la barre</button>
        </div>
      </details>
    </section>;
  }
  /** Couleur des croix de fermeture : couleurs de la barre, sélecteur libre, pipette. Choisir une couleur remplace une icône de croix personnalisée. */
  function setCloseColor(color?:string){
    setProject(p=>({...p,closeButtonColor:color,...(color?{closeIconId:undefined,closeIconHoverId:undefined,closeIconPressedId:undefined}:{})}));
  }
  function closeColorControls(){
    const eyedropper=typeof window!=='undefined'&&'EyeDropper' in window;
    const barColor=/^#[0-9a-f]{6}$/i.test(barTheme.button)?barTheme.button:undefined;
    return <div className="nv-close-config">
      <p className="hint">Une seule couleur pour les croix des photos, vidéos, informations, galeries et pages intégrées de tout le projet. Au survol, la croix s’éclaircit.</p>
      <button type="button" className="nv-close-barcolors" disabled={!barColor} onClick={applyBarThemeEverywhere}>
        <i style={{background:barColor??'#888'}}/> Appliquer le thème de la barre (croix + bouton Paramètres)</button>
      <div className="nv-close-colors">
        {([['Jaune','#f5b324'],['Blanc','#ffffff'],['Orange','#e18533'],['Rouge','#d93b3b'],['Bleu','#2f9fd8'],['Noir','#1c1c1c']] as const).map(([name,c])=>
          <button type="button" key={c} className={project.closeButtonColor?.toLowerCase()===c?'is-on':''} title={name} aria-label={'Croix '+name} style={{background:c}} onClick={()=>setCloseColor(c)}/>)}
        <input type="color" aria-label="Choisir une couleur" title="Choisir une couleur" value={project.closeButtonColor??barColor??'#f5b324'} onChange={e=>setCloseColor(e.target.value)}/>
        {eyedropper&&<button type="button" className="nv-close-pipette" title="Pipette : prendre une couleur n’importe où à l’écran" onClick={()=>{
          const Dropper=(window as unknown as {EyeDropper:new()=>{open:()=>Promise<{sRGBHex:string}>}}).EyeDropper;
          void new Dropper().open().then(r=>setCloseColor(r.sRGBHex)).catch(()=>{/* annulé */});
        }}>💧 Pipette</button>}
        <button type="button" className="quiet" disabled={!project.closeButtonColor} onClick={()=>setCloseColor(undefined)}>Retirer la couleur</button>
      </div>
      {project.closeIconId&&<small className="hint-inline">Une icône de croix personnalisée (pack) est active : elle remplace la couleur. Choisir une couleur ci-dessus la désactive.</small>}
    </div>;
  }
  /** Vue d'arrivée : de simples tuiles-icônes, un toucher = l'action (plus de paragraphes ni de longs boutons). */
  function arrivalTiles(){
    if(!active)return null;
    const deg=(y?:number)=>y===undefined?'':Math.round(y*180/Math.PI)+'°';
    const tile=(key:string,title:string,hint:string,icon:ReactNode,tone:string,onClick:()=>void)=>
      <button type="button" key={key} className="nv-app-tile nv-hub-tile" style={{'--tile-tone':tone} as CSSProperties} onClick={onClick}>
        <span className="nv-app-tile-icon">{icon}</span><span className="nv-app-tile-label">{title}</span><small className="nv-hub-hint">{hint}</small>
      </button>;
    const defHint=active.arrivalYaw!==undefined?'✓ '+deg(active.arrivalYaw)+' · zoom '+Math.round(active.arrivalZoom??60)+'%':'Pas encore définie';
    return <>
      <small className="nv-arrival-caption">Glisse dans le panorama pour choisir la direction, ajuste le zoom, puis enregistre la vue ci-dessous. Termine par la disquette pour sauvegarder le projet.</small>
      <div className="nv-hub-tiles">
        {viaHotspot&&viaFrom?<>
          {tile('arrow','Pour cette flèche',viaHotspot.arrivalYaw!==undefined?'✓ '+deg(viaHotspot.arrivalYaw)+' · zoom '+Math.round(viaHotspot.arrivalZoom??60)+'%':'« '+(viaHotspot.title||'Navigation')+' »',<Eye size={26}/>,'#2fbf8f',saveArrivalForArrow)}
          {tile('back','Retour',viaFrom.name,<Undo2 size={26}/>,'#4f7cff',()=>selectScene(viaFrom.id))}
          {viaHotspot.arrivalYaw!==undefined&&tile('reset','Réinitialiser','Cette flèche',<RefreshCw size={26}/>,'#e0645c',()=>{setArrowArrival(viaFrom.id,viaHotspot.id,null);nextArrivalRef.current=null;setStatus('Vue d’arrivée de la flèche réinitialisée');})}
          {tile('default','Vue par défaut',defHint,<Home size={26}/>,'#ff8a3d',saveArrivalView)}
        </>:tile('default','Enregistrer la vue actuelle',defHint,<Eye size={26}/>,'#2fbf8f',saveArrivalView)}
      </div>
    </>;
  }
  /** Transforme toutes les flèches de la visite en sphères du même diamètre que la flèche sélectionnée. */
  function applySphereToAll(){
    if(!selected||selected.type!=='navigation')return;
    const size=Math.max(40,Math.min(120,selected.iconSize??90));
    setProject(p=>({...p,scenes:p.scenes.map(sc=>({...sc,hotspots:sc.hotspots.map(h=>h.type==='navigation'?{...h,sphere:true,iconSize:size,sphereRimColor:selected.sphereRimColor,sphereRimIntensity:selected.sphereRimIntensity}:h)}))}));
    setStatus('Sphère de '+size+' px appliquée à toutes les flèches de la visite');
  }
  function navigationEditor(){
    if(!selected||selected.type!=='navigation')return null;
    const target=project.scenes.find(sc=>sc.id===selected.target);
    const canGo=!!selected.target&&(selected.targetSpaceId
      ?!!(project.spaces??[]).find(sp=>sp.id===selected.targetSpaceId&&sp.sceneIds.some(id=>project.scenes.some(sc=>sc.id===id&&!sc.excluded)))
      :visibleIds.has(selected.target));
    const hasBack=!!target?.hotspots.some(h=>h.type==='navigation'&&h.target===activeId);
    const openDestination=()=>{
      if(!active)return;
      setClassicDestinationSearch('');
      setClassicDestinationPreviewId(selected.target||suggestDestinations(active.id)[0]?.id||visibleScenes.find(sc=>sc.id!==active.id)?.id||null);
      setClassicDestinationOpen(true);
    };
    const goIcon=()=>document.querySelector<HTMLElement>('aside.right')?.querySelectorAll('.section-title').forEach(el=>{if(el.textContent?.includes('ICÔNE'))el.scrollIntoView({behavior:'smooth',block:'center'});});
    return <div className="nv-navigation-edit-card">
      <strong>Flèche{selected.targetSpaceId?' → espace « '+((project.spaces??[]).find(sp=>sp.id===selected.targetSpaceId)?.name??'introuvable')+' »':target?' → '+target.name:' · sans destination'}</strong>
      <div className="nv-action-tiles" role="toolbar" aria-label="Actions sur la flèche">
        <button type="button" className={'nv-act'+(selected.target?'':' is-todo')} onClick={openDestination} title="Choisir le panorama d’arrivée dans la galerie 360°">
          {target&&sceneThumbs[target.id]?<img src={sceneThumbs[target.id]} alt=""/>:<Images size={26}/>}<span>Destination</span></button>
        <button type="button" className="nv-act" disabled={!canGo} onClick={()=>{if(active&&selected.target)goThroughArrow(selected,active.id);}} title="Tester : aller au panorama d’arrivée"><Play size={26}/><span>Tester</span></button>
        <button type="button" className="nv-act" disabled={!canGo} onClick={()=>reverseNavigation(selected)} title={hasBack?'Ouvrir la flèche retour existante':'Créer la flèche retour vers ce panorama'}><Undo2 size={26}/><span>{hasBack?'Voir le retour':'Créer le retour'}</span></button>
        <button type="button" className="nv-act" disabled={!canGo} onClick={()=>document.querySelector('.nv-arrival-inline')?.scrollIntoView({behavior:'smooth',block:'center'})} title="Régler la vue d’arrivée juste en dessous"><Eye size={26}/><span>Vue d’arrivée</span></button>
        <button type="button" className="nv-act" onClick={goIcon} title="Changer l’icône et la taille"><Star size={26}/><span>Icône</span></button>
        <button type="button" className={'nv-act'+(selected.sphere?' is-on':'')} aria-pressed={!!selected.sphere} onClick={()=>patchPoint({sphere:!selected.sphere,iconSize:selected.iconSize&&selected.iconSize>=40?selected.iconSize:90})} title={selected.target?'Remplacer la flèche par une sphère 3D qui montre le panorama de destination et tourne sur elle-même':'Choisis d’abord la destination : la sphère affiche ce panorama'}><Globe size={26}/><span>{selected.sphere?'Sphère : oui':'Sphère 3D'}</span></button>
        <button type="button" className="nv-act is-danger" onClick={()=>removeAutoNavigationArrow(selected.id)} title="Supprimer cette flèche"><Trash2 size={26}/><span>Supprimer</span></button>
      </div>
      {iconSizeControl()}
      {selected.sphere&&<div style={{display:'grid',gap:8}}>
        <span>Contour de la sphère</span>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
          {['#9fe3ff','#e6c17c','#ffffff','#ff6fa8','#7fe08a','#ff9f43'].map(c=><button key={c} type="button" aria-label={'Contour '+c} title={c} onClick={()=>patchPoint({sphereRimColor:c})} style={{width:28,height:28,borderRadius:'50%',background:c,cursor:'pointer',border:(selected.sphereRimColor??'#9fe3ff')===c?'3px solid #111':'1px solid #0004'}}/>)}
          <input type="color" aria-label="Couleur personnalisée du contour" value={selected.sphereRimColor??'#9fe3ff'} onChange={e=>patchPoint({sphereRimColor:e.target.value})}/>
        </div>
        <label>Intensité du contour : <b>{selected.sphereRimIntensity??7}</b>
          <input type="range" min="0" max="100" step="1" value={selected.sphereRimIntensity??7} onChange={e=>patchPoint({sphereRimIntensity:Number(e.target.value)})}/></label>
      </div>}
      {selected.sphere&&<button type="button" className="style-reset" onClick={applySphereToAll} title="Toutes les flèches de la visite deviennent des sphères de ce diamètre, avec ce contour et cette intensité">Appliquer à toute la visite</button>}
      <small>✥ Glisse la poignée à côté de la flèche pour la déplacer.</small>
    </div>;
  }
  function frameLoupe(h:Hotspot){
    if(!active||isPopupMedia(h))return null;
    const hasMedia=h.type==='image'?!!h.imageDataUrl:h.type==='video'?!!(h.videoDataUrl||h.videoUrl):false;
    if(!hasMedia)return null;
    return <FrameLoupe hotspot={h} sceneUrl={active.dataUrl}
      onAdjusting={on=>window.dispatchEvent(new CustomEvent('nv-frame-dim',{detail:{id:h.id,opacity:on?0.03:0.3}}))}
      onCorners={c=>{
        const ref=c[0].yaw;
        const yaw=c.reduce((n,p)=>n+p.yaw+2*Math.PI*Math.round((ref-p.yaw)/(2*Math.PI)),0)/4;
        patchPoint({frameSphericalCorners:c,yaw,pitch:c.reduce((n,p)=>n+p.pitch,0)/4});
      }}/>;
  }
  function patchPoint(update:Partial<Hotspot>){
    patchScene(s=>({...s,hotspots:s.hotspots.map(h=>h.id===selectedId?{...h,...update}:h)}));
  }
  // Le choix d'une destination ne crée JAMAIS un point de retour implicitement.
  // L'utilisateur peut créer ce retour volontairement via reverseNavigation.
  function setNavigationDestination(targetId:string,spaceId?:string){
    if(!active||!selected||selected.type!=='navigation'||(targetId&&(!project.scenes.some(sc=>sc.id===targetId&&!sc.excluded)||targetId===active.id)))return;
    const fromId=active.id,pointId=selected.id;
    setProject(p=>({...p,scenes:p.scenes.map(sc=>sc.id===fromId?
      {...sc,hotspots:sc.hotspots.map(h=>h.id===pointId?
        {...h,target:targetId,targetSpaceId:spaceId,arrivalYaw:galleryOrientationRef.current[targetId]?.yaw??(h.target===targetId?h.arrivalYaw:undefined),
          arrivalPitch:galleryOrientationRef.current[targetId]?.pitch??(h.target===targetId?h.arrivalPitch:undefined),
          arrivalZoom:galleryOrientationRef.current[targetId]?.zoom??(h.target===targetId?h.arrivalZoom:undefined),
          arrivalZoomModel:'wide' as const}:h)}:sc)}));
    setNavigationPickerOpen(false);
    setClassicDestinationOpen(false);
    setNavigationPickerHover(null);
    setNavigationPickerPreviewId(null);
    setStatus(targetId?(spaceId?'Espace sélectionné · arrivée sur son premier panorama':'Destination sélectionnée · aucun retour créé automatiquement'):'Destination retirée');
  }
  function setNavigationSpace(spaceId:string){
    const space=(project.spaces??[]).find(s=>s.id===spaceId);
    if(!space){setStatus('Espace introuvable');return;}
    const first=space.sceneIds.find(id=>project.scenes.some(sc=>sc.id===id&&!sc.excluded));
    if(!first){setStatus('Cet espace ne contient aucun panorama disponible.');return;}
    if(first===activeId){setStatus('Le premier panorama de cet espace est déjà celui de départ.');return;}
    setNavigationDestination(first,space.id);
  }
  // Une connexion A → B peut créer sa flèche retour B → A en un seul clic.
  // Le point est placé devant la caméra à l'arrivée sur B ; ajustable ensuite.
  function reverseNavigation(h:Hotspot){
    if(!active||h.type!=='navigation'||!h.target||h.target===active.id)return;
    const originId=active.id,originName=active.name;
    const destination=project.scenes.find(sc=>sc.id===h.target);
    if(!destination){setStatus('Panorama de destination introuvable');return;}
    if(currentSpace&&!visibleIds.has(destination.id)){setStatus('Destination hors de cet espace');return;}
    const existing=destination.hotspots.find(point=>point.type==='navigation'&&point.target===originId);
    if(existing){
      setActiveId(destination.id);setSelectedId(existing.id);setPanel('points');setFullscreenToolsTab('point');
      setFullscreenToolsOpen(true);setMode(null);
      setStatus('Le retour existe déjà : point sélectionné dans '+destination.name);
      return;
    }
    const newId=uid();
    const reverse:Hotspot={
      id:newId,type:'navigation',title:'Retour vers '+originName,text:'',target:originId,
      yaw:(((h.arrivalYaw??destination.arrivalYaw??0)+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI),
      pitch:-0.12,
      arrivalYaw:(((h.yaw)+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI),arrivalPitch:0,arrivalZoom:panoramaArrivalZoom(active),arrivalZoomModel:'wide',arrivalCustom:true,
      ...(h.iconId?{iconId:h.iconId}:{}),
      ...(h.hoverIconId?{hoverIconId:h.hoverIconId}:{}),
      ...(h.pressedIconId?{pressedIconId:h.pressedIconId}:{}),
      ...(h.iconSize?{iconSize:h.iconSize}:{})
    };
    setProject(p=>({...p,scenes:p.scenes.map(sc=>sc.id===destination.id?
      {...sc,hotspots:sc.hotspots.some(point=>point.type==='navigation'&&point.target===originId)?
        sc.hotspots:[...sc.hotspots,reverse]}:sc)}));
    setActiveId(destination.id);setSelectedId(newId);setPanel('points');setFullscreenToolsTab('point');
    setFullscreenToolsOpen(true);setMode(null);
    setStatus('Retour créé dans '+destination.name+' : déplace la flèche si nécessaire puis enregistre.');
  }
  async function addImages(list:FileList|null,targetSpaceId?:string|null){
    if(!list?.length)return;
    const next:Scene[]=[];
    const errors:string[]=[];
    let imported=0;
    for(const file of Array.from(list)){
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)){
        errors.push(file.name+' : utiliser JPG, PNG ou WebP.');
        continue;
      }
      imported++;
      setStatus('Préparation du panorama '+imported+'/'+list.length+' : '+file.name+'…');
      if(file.size>40*1024*1024){errors.push(file.name+' : limite 40 Mo par panorama.');continue;}
      try {
        next.push({id:uid(),name:file.name.replace(/\.[^.]+$/,'').slice(0,100),dataUrl:await readPanorama(file),hotspots:[]});
      } catch(e) { errors.push(file.name+' : '+(e instanceof Error?e.message:'lecture impossible')); }
    }
    if(next.length){
      const spaceId=targetSpaceId===undefined?activeSpaceId:targetSpaceId;
      setProject(p=>({...p,scenes:[...p.scenes,...next.map(scene=>({...scene,musicTrackId:p.defaultMusicTrackId}))],
        spaces:spaceId?(p.spaces??[]).map(space=>space.id===spaceId?{
          ...space,sceneIds:[...space.sceneIds,...next.map(scene=>scene.id)]
        }:space):p.spaces
      }));
      if(!activeId)setActiveId(next[0].id);
      setStatus(next.length+' panorama(s) importé(s)'+(errors.length?' · '+errors.length+' échec(s) : '+errors.slice(0,2).join(' ; '):''));
    }
    if(!next.length&&errors.length)setStatus('Import impossible : '+errors.slice(0,2).join(' ; '));
    if(upload.current)upload.current.value='';
    if(spacePanoramasInput.current)spacePanoramasInput.current.value='';
  }
  function newPoint(yaw:number,pitch:number){
    if(!active||!mode)return;
    const importedVideo=mode==='video'&&clientVideoPlacement?.sceneId===active.id?clientVideoPlacement:null;
    const favorite=mode==='navigation'?defaultNavigationIconSet():mode==='image'?project.defaultPhotoIcon:mode==='video'?project.defaultVideoIcon:null;
    // Taille par défaut = celle de la plupart des points du même type déjà posés (sinon celle de l'icône favorite).
    const sizes=new Map<number,number>();
    for(const sc of project.scenes)for(const x of sc.hotspots)if(x.type===mode&&typeof x.iconSize==='number')sizes.set(x.iconSize,(sizes.get(x.iconSize)??0)+1);
    const commonSize=[...sizes.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0];
    const h:Hotspot={
      id:uid(),type:mode,title:mode==='navigation'?'Aller vers…':mode==='lien'?'Ouvrir un lien':mode==='image'?'Photo':mode==='video'?'Vidéo':'Informations',
      text:'',target:'',yaw,pitch,
      ...(favorite?{iconId:favorite.iconId,hoverIconId:favorite.hoverIconId,
        pressedIconId:favorite.pressedIconId,iconSize:favorite.iconSize}:{}),
      ...(commonSize!==undefined?{iconSize:commonSize}:{}),
      ...(['image','video'].includes(mode)?{mediaDisplay:'popup' as const,frameWidth:320,frameHeight:200,frameReferenceHeight:Math.max(100,viewAreaRef.current?.clientHeight||550),frameReferenceZoom:cameraRef.current.zoom,frameCorners:defaultFrameCorners(),fadeOnClick:true}:{}),
      ...(mode==='lien'?{linkMode:'embed' as const}:{}),
      ...(mode==='video'?{videoAutoplay:true,videoLoop:true,videoOpenFullscreen:true}:{}),
      ...(importedVideo?{videoDataUrl:importedVideo.dataUrl,title:importedVideo.name.replace(/\.[^.]+$/,'').slice(0,120)}:{})
    };
    patchScene(s=>({...s,hotspots:[...s.hotspots,h]}));
    setSelectedId(h.id);setPanel('points');setMode(null);
    if(mode==='information'){setRightHidden(false);setInformationEdit({sceneId:active.id,pointId:h.id});}
    if(mode==='lien')setRightHidden(false);
    if(importedVideo){setClientVideoPlacement(null);setRightHidden(false);setStatus('Vidéo NovaGen placée · Enregistre la visite pour conserver le fichier');}
    if(mode==='image'||(mode==='video'&&!importedVideo)){
      setRightHidden(false);
      setMediaPicker({sceneId:active.id,hotspotId:h.id,type:mode,fresh:true});
    }
    if(mode==='navigation'){
      const sceneIndex=visibleScenes.findIndex(sc=>sc.id===active.id);
      const suggestion=visibleScenes[(sceneIndex+1)%visibleScenes.length];
      setDestinationEditId(h.id);
      setClassicDestinationPreviewId(suggestion&&suggestion.id!==active.id?suggestion.id:null);
      setClassicDestinationSearch('');
      if(creationFullscreen){
        setFullscreenToolsOpen(false);setFullscreenCommandDrawerOpen(true);setFullscreenGalleryOpen(true);
      }else setClassicDestinationOpen(true);
    }else if(creationFullscreen){
      setFullscreenToolsTab('point');setFullscreenToolsOpen(true);setFullscreenGalleryOpen(false);
    }
  }
  // « Enregistrer » depuis le répertoire Clients : on attend que la fiche soit bien dans le projet, puis on enregistre.
  useEffect(()=>{
    if(!pendingClientSaveRef.current)return;
    pendingClientSaveRef.current=false;
    void manualSave();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[project.clientProfile]);
  function selectSpace(spaceId:string|null){
    const space=spaceId?(project.spaces??[]).find(item=>item.id===spaceId):null;
    if(spaceId&&!space)return;
    const first=space?scenesInSpace(project,space)[0]:project.scenes[0];
    setActiveSpaceId(space?.id??null);
    setActiveId(first?.id??'');
    setSelectedId('');setMode(null);setPreview(false);
    setArrivedVia(null);nextArrivalRef.current=null;
    setSpaceManagerOpen(false);
  }
  function createSpace(){
    if((project.spaces??[]).length>=80){setStatus('Limite de 80 espaces atteinte');return;}
    const id=uid(),count=(project.spaces??[]).length+1;
    const name='Espace '+count;
    // Start with the complete visit; the user deselects any unwanted panoramas.
    // The original master project remains untouched.
    setProject(p=>({...p,spaces:[...(p.spaces??[]),{
      id,name,sceneIds:p.scenes.map(scene=>scene.id)
    }]}));
    setActiveSpaceId(id);setSelectedId('');setPreview(false);setMode(null);
    setSpaceManagerOpen(true);
    setStatus('Espace créé sans dupliquer ni supprimer aucun panorama');
  }
  function startSpaceRename(spaceId:string,name:string){
    cancelSpaceEditRef.current=false;
    setEditingSpaceId(spaceId);
    setEditingSpaceName(name);
  }
  function finishSpaceRename(spaceId:string){
    if(!cancelSpaceEditRef.current){
      const name=safeSpaceName(editingSpaceName).trim();
      if(name&&spaceId==='__project__')setProject(p=>({...p,name:name.slice(0,150)}));
      else if(name)renameSpace(spaceId,name);
    }
    cancelSpaceEditRef.current=false;
    setEditingSpaceId(null);
  }
  function renameSpace(spaceId:string,name:string){
    if(!safeSpaceName(name).trim())return;
    setProject(p=>({...p,spaces:(p.spaces??[]).map(space=>
      space.id===spaceId?{...space,name:safeSpaceName(name)}:space)}));
  }
  function setSceneInSpace(spaceId:string,sceneId:string,include:boolean){
    if(!project.scenes.some(scene=>scene.id===sceneId))return;
    setProject(p=>({...p,spaces:(p.spaces??[]).map(space=>{
      if(space.id!==spaceId)return space;
      const ids=space.sceneIds.filter(id=>id!==sceneId);
      if(include)ids.push(sceneId);
      return {...space,sceneIds:ids};
    })}));
    if(!include&&activeId===sceneId){
      const alternative=visibleScenes.find(scene=>scene.id!==sceneId);
      setActiveId(alternative?.id??'');setSelectedId('');setMode(null);
    }
  }
  /** Supprime un panorama du projet (avec nettoyage des espaces, de la galerie, des flèches qui y menaient). Annulable avec Ctrl+Z. */
  async function deleteScene(id:string){
    const sc=project.scenes.find(x=>x.id===id);
    if(!sc)return;
    if(project.scenes.length<=1){setStatus('Impossible de supprimer le seul panorama du projet.');return;}
    const incoming=project.scenes.reduce((n,x)=>n+x.hotspots.filter(h=>h.type==='navigation'&&h.target===id).length,0);
    if(!await confirmAsk('Supprimer « '+sc.name+' » du projet ?\n'+(incoming?incoming+' flèche'+(incoming>1?'s qui y mènent seront':' qui y mène sera')+' à reconfigurer.\n':'')+'Tu pourras annuler avec le bouton Annuler (Ctrl+Z).'))return;
    const remaining=project.scenes.filter(x=>x.id!==id);
    setProject(p=>({...p,
      floorPlan:p.floorPlan?{...p.floorPlan,points:p.floorPlan.points.filter(point=>point.sceneId!==id)}:undefined,
      floorPlans:p.floorPlans?.map(plan=>({...plan,points:plan.points.filter(point=>point.sceneId!==id)})),
      scenes:p.scenes.filter(x=>x.id!==id).map(x=>({...x,
        nightSourceSceneId:x.nightSourceSceneId===id?undefined:x.nightSourceSceneId,
        hotspots:x.hotspots.map(h=>h.type==='navigation'&&h.target===id?{...h,target:'',arrivalYaw:undefined,arrivalPitch:undefined,arrivalZoom:undefined}:h)})),
      spaces:(p.spaces??[]).map(sp=>({...sp,sceneIds:sp.sceneIds.filter(sid=>sid!==id)})),
      bottomBar:p.bottomBar.map(b=>({...b,target:b.target===id?'':b.target,
        ...(b.gallery?{gallery:b.gallery.filter(g=>g.sceneId!==id)}:{}),
        galleryBackground:b.galleryBackground==='scene:'+id?undefined:b.galleryBackground})),
      comments:(p.comments??[]).filter(c=>c.sceneId!==id)}));
    if(activeId===id){setActiveId(startSceneId(remaining));setSelectedId('');}
    setPanoModalId(null);
    setStatus('« '+sc.name+' » supprimé du projet.');
  }
  function removeSceneFromSpace(spaceId:string,sceneId:string){
    const sc=project.scenes.find(item=>item.id===sceneId);
    if(!sc)return;
    setSceneInSpace(spaceId,sceneId,false);
    setStatus('« '+sc.name+' » retiré de cet espace uniquement. Original conservé.');
  }
  /** Ajoute (copie) ou déplace tous les panoramas d'un espace vers un autre. Les panoramas originaux ne sont jamais touchés. */
  function transferSpaceScenes(fromId:string,toId:string,move:boolean){
    const from=(project.spaces??[]).find(item=>item.id===fromId),to=(project.spaces??[]).find(item=>item.id===toId);
    if(!from||!to||from.id===to.id)return;
    const moved=from.sceneIds.filter(id=>project.scenes.some(sc=>sc.id===id));
    const added=moved.filter(id=>!to.sceneIds.includes(id)).length;
    setProject(p=>({...p,spaces:(p.spaces??[]).map(sp=>{
      if(sp.id===toId)return {...sp,sceneIds:[...sp.sceneIds,...moved.filter(id=>!sp.sceneIds.includes(id))]};
      if(sp.id===fromId&&move)return {...sp,sceneIds:[]};
      return sp;
    })}));
    if(move){setActiveId('');setSelectedId('');}
    setStatus(added+' panorama(s) '+(move?'déplacé(s)':'ajouté(s)')+' vers « '+to.name+' ». Les originaux sont conservés.');
  }
  /** Supprime un espace ; ses panoramas peuvent d'abord être transférés vers un autre espace. */
  function deleteSpace(spaceId:string,transferTo?:string){
    const space=(project.spaces??[]).find(item=>item.id===spaceId);
    if(!space)return;
    const target=transferTo?(project.spaces??[]).find(item=>item.id===transferTo&&item.id!==spaceId):undefined;
    const moved=target?space.sceneIds.filter(id=>project.scenes.some(sc=>sc.id===id)):[];
    setProject(p=>({...p,
      spaces:(p.spaces??[]).filter(item=>item.id!==spaceId).map(sp=>
        target&&sp.id===target.id?{...sp,sceneIds:[...sp.sceneIds,...moved.filter(id=>!sp.sceneIds.includes(id))]}:sp),
      // Les plans de l'espace supprimé restent conservés seulement s'ils
      // ont été explicitement transférés vers un autre espace.
      floorPlans:getFloorPlans(p).filter(plan=>plan.spaceId!==spaceId||!!target).map(plan=>
        plan.spaceId===spaceId&&target?{...plan,spaceId:target.id}:plan),
      floorPlan:getFloorPlans(p).find(plan=>plan.spaceId!==spaceId)??undefined
    }));
    if(target){
      setActiveSpaceId(target.id);
      setActiveId(moved[0]??target.sceneIds[0]??'');
    }else{
      setActiveSpaceId(null);setActiveId(startSceneId(project.scenes));
    }
    setSelectedId('');setPreview(false);setMode(null);setSpaceManagerOpen(false);setSpaceDelete(null);
    setStatus(target?'Espace supprimé · panoramas transférés vers « '+target.name+' ». Rien n\'est perdu.':'Espace supprimé. Tous les panoramas du projet principal sont conservés.');
  }
  /** Fichier HTML « NovaVisio » : une seule page qui affiche toujours la dernière version publiée de LA visite affichée
   *  (le projet complet, ou uniquement l'espace sélectionné : jamais les autres espaces). */
  async function exportNovaVisioHtml(){
    const scopeName=currentSpace?currentSpace.name:project.name;
    const link=currentSpace?readSpaceCloudLink(currentSpace.id,'public'):readLink();
    if(!link){setStatus(currentSpace?'NovaVisio : l’espace « '+currentSpace.name+' » n’est pas encore publié. Ouvre Partager › Lien public avec cet espace sélectionné, ou clique sur Publier.':'NovaVisio : enregistre d’abord la visite dans le Cloud, puis clique sur Publier.');return;}
    try{
      const pub=await getPublication(link.projectId);
      if(!pub||!publicationActive(pub)){setStatus('NovaVisio : « '+scopeName+' » n’est pas encore publié. Clique d’abord sur Publier, puis sur HTML NovaVisio.');return;}
      const html=wrapperHtml(shareUrl(pub.token),scopeName||'Visite 360°',project.introEnabled?project.introUrl:'',project.introDuration??6);
      const url=URL.createObjectURL(new Blob([html],{type:'text/html'}));
      const a=document.createElement('a');a.href=url;a.download=((scopeName||'visite').replace(/[^a-zA-Z0-9-]/g,'_')||'visite')+'-novavisio.html';
      document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
      setStatus('Fichier HTML de « '+scopeName+' » téléchargé. Il affiche toujours la dernière version publiée de cette visite : après une mise à jour, clique simplement sur Publier.');
    }catch(e){setStatus('NovaVisio : '+(e instanceof Error?e.message:String(e)));}
  }
  function download(){
    const blob=new Blob(projectJsonParts(project),{type:'application/json'}); // par morceaux : pas de limite de ~512 Mo
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;link.download=(project.name.replace(/[^a-zA-Z0-9-]/g,'_')||'visite')+'.nvstudio.json';
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  async function openProject(file?:File){
    if(!file)return;
    try {
      setStatus('Lecture du fichier… 0 %');
      const raw=await readProjectFile(file,pct=>setStatus('Lecture du fichier… '+pct+' %'));
      const imported=ensureFrameReferences(validateProject(raw),viewAreaRef.current?.clientHeight||550);
      if(!await confirmAsk('Remplacer le projet actuellement ouvert par ce fichier ?'))return;
      setActiveSpaceId(null);setSpaceManagerOpen(false);setProject(imported);setActiveId(startSceneId(imported.scenes));setSelectedId('');setMode(null);setPreview(false);
      cloud.unlink(); // un autre projet : il aura sa propre visite dans le cloud (l'ancienne reste intacte)
      setStatus('Projet importé');setPreparationOpen(false);
    }catch(e){window.alert('Impossible d’ouvrir ce projet : '+String(e));}
    finally {if(projectInput.current)projectInput.current.value='';}
  }
  function downloadRawStored(){
    const raw=rawStoredRef.current;
    if(!raw){window.alert('Aucune donnée brute à télécharger.');return;}
    const url=URL.createObjectURL(new Blob(projectJsonParts(raw),{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='projet-enregistre-brut.json';
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  async function startEmptyOverUnreadable(){
    if(!await confirmAsk('Repartir d’un projet vide REMPLACE définitivement le projet enregistré dans ce navigateur. As-tu téléchargé les données brutes ?'))return;
    baseRef.current=(rawStoredRef.current as {updatedAt?:string}|null)?.updatedAt??null;
    const fresh=newProject();
    setProject(fresh);setActiveId('');setSelectedId('');setLock(null);setPreparationOpen(true);
    void persist(fresh,true);
  }
  function addClientLink(item:ClientLink){
    const next:BottomBarItem={id:uid(),title:item.label,type:item.kind==='info'?'information':'lien',target:'',text:'',url:item.url,builtinIcon:item.label==='Appeler'?'phone':item.label==='Itinéraire'?'grid':'info'};
    setProject(p=>({...p,bottomBar:[...p.bottomBar,next]}));
    setSelectedBarId(next.id);setPanel('bar');setStatus('Bouton « '+item.label+' » ajouté à la barre du bas · Enregistre la visite');
  }
  function placeClientVideo(video:ImportedClientVideo){
    if(!active)return;
    if(autoNavigation)stopAutoNavigation();
    setClientOpen(false);setPreview(false);setSelectedId('');setSelectedBarId('');
    setPanel('points');setMode('video');setRightHidden(false);
    setClientVideoPlacement({...video,sceneId:active.id});
    setStatus('Clique dans le panorama pour placer « '+video.name+' »');
  }
  const clientView=<ClientPanel value={project.clientProfile}
    onChange={clientProfile=>setProject(p=>({...p,clientProfile}))}
    onAddLink={addClientLink} canPlaceVideo={!!active} onPlaceVideo={placeClientVideo}
    onImportPhotos={items=>setProject(p=>({...p,mediaLibrary:[...items,...(p.mediaLibrary??[])].slice(0,300)}))}
    libraryNames={(project.mediaLibrary??[]).map(item=>item.name)} libraryRoom={Math.max(0,300-(project.mediaLibrary??[]).length)}/>;
  return <div ref={studioRef} className={
    'app nv-studio-pro'+
    (studioFallback?' nv-studio-fullscreen-fallback':'')+
    (leftHidden?' nv-studio-hide-left':'')+
    ' nv-studio-hide-right'+(!rightHidden?' nv-sheet-open':'')+(selectedId&&panel==='points'?' nv-sheet-side':'')+
    (sceneDensity==='compact'?' nv-scenes-compact':'')
  }>
    <header className="topbar nv-topbar-v3">
      <div className="nv-v3-left">
      <div className="nv-top-left">
        <button type="button" className={'nv-header-burger'+(navigationDrawerOpen?' is-open':'')}
          aria-label="Ouvrir le menu de navigation" aria-expanded={navigationDrawerOpen}
          aria-controls="nv-studio-navigation" onClick={()=>{setNavigationDrawerOpen(open=>!open);setOpenTopMenu(null);}}>
          <Menu size={22}/><span>Menu</span>
        </button>
        {navigationDrawerOpen&&<button type="button" className="nv-navigation-scrim"
          aria-label="Fermer le menu" onClick={()=>{setNavigationDrawerOpen(false);setOpenTopMenu(null);}}/>}
        <nav id="nv-studio-navigation" className={'nv-navigation-drawer'+(navigationDrawerOpen?' is-open':'')}
          aria-label="Navigation NovaStudio" aria-hidden={!navigationDrawerOpen}>
          <div className="nv-navigation-brand">
            <div className="brand">
              <div className="brand-logo">
                <img src="/brand/novavisio-logo.png" alt="Logo NovaVisio" draggable={false}/>
              </div>
              <div className="nv-brand-text">
                <strong>NovaVisio <span>Studio</span></strong>
                <small>ÉDITEUR DE VISITES 360°</small>
              </div>
            </div>
          </div>
          <div className="nv-navigation-drawer-header"><strong>Navigation</strong>
            <button type="button" onClick={()=>{setNavigationDrawerOpen(false);setOpenTopMenu(null);}} aria-label="Fermer le menu"><XMark/></button>
          </div>
          <button type="button" className="nv-client-top-btn" onClick={()=>{setSkinsOpen(true);setNavigationDrawerOpen(false);setOpenTopMenu(null);}}><span className="nv-drawer-item-label"><Layers size={17}/> Skins</span></button>
          <button type="button" className="nv-client-top-btn" onClick={()=>{setVrMenuOpen(true);setNavigationDrawerOpen(false);setOpenTopMenu(null);}}><span className="nv-drawer-item-label"><Eye size={17}/> Vue casque</span></button>
          <button type="button" className="nv-client-top-btn" onClick={()=>{setAiFreshClient(true);setAiAssistantOpen(true);setNavigationDrawerOpen(false);setOpenTopMenu(null);}} title="NovaStudio AI — Création intelligente"><span className="nv-drawer-item-label"><Sparkles size={17} color="#38bdf8"/> NovaStudio AI</span></button>
          <button type="button" className="nv-client-top-btn" onClick={()=>{setClientOpen(true);setNavigationDrawerOpen(false);setOpenTopMenu(null);}}>
            <Users size={17}/><span className="nv-drawer-item-label">Clients</span>
          </button>
          <div className="nv-header-menu-list" ref={topMenusRef}>
          <div className="nv-menu-root">
            <button type="button" className={'nv-menu-trigger '+(openTopMenu==='file'?'is-open':'')}
              aria-haspopup="menu" aria-expanded={openTopMenu==='file'}
              onClick={()=>setOpenTopMenu(m=>m==='file'?null:'file')}>
              <span className="nv-drawer-item-label"><Plus size={17}/> Fichier</span><ChevronDown size={15}/>
            </button>
            {openTopMenu==='file'&&<div className="nv-menu-popover" role="menu" aria-label="Fichier">
              <button type="button" role="menuitem" onClick={()=>{setOpenTopMenu(null);setAiFreshClient(true);setAiAssistantOpen(true);}}>
                <Sparkles size={16} color="#38bdf8"/><strong>Nouveau client (NovaStudio AI)</strong>
              </button>
              <div className="nv-menu-divider" role="separator"/>
              <button type="button" role="menuitem" disabled={!ready||savingManually||!!lock}
                onClick={()=>{setOpenTopMenu(null);void manualSave();}}>
                <Save size={16}/><span>Enregistrer maintenant</span><b>⌘ S</b>
              </button>
            </div>}
          </div>
          <div className="nv-menu-root">
            <button type="button" className={'nv-menu-trigger '+(openTopMenu==='share'?'is-open':'')}
              aria-haspopup="menu" aria-expanded={openTopMenu==='share'}
              onClick={()=>setOpenTopMenu(m=>m==='share'?null:'share')}>
              <span className="nv-drawer-item-label"><Link2 size={17}/> Partager</span><ChevronDown size={15}/>
            </button>
            {openTopMenu==='share'&&<div className="nv-menu-popover" role="menu" aria-label="Partager">
              <button type="button" role="menuitem" onClick={()=>{setOpenTopMenu(null);setShareOpen(true);}}>
                <Link2 size={16}/><span>Lien public et publication</span>
              </button>
              <button type="button" role="menuitem" onClick={()=>{setOpenTopMenu(null);setPrivateOpen(true);}}>
                <Lock size={16}/><span>Invitations et lien privé</span>
              </button>
            </div>}
          </div>
          <div className="nv-menu-root">
            <button type="button" className={'nv-menu-trigger '+(openTopMenu==='display'?'is-open':'')}
              aria-haspopup="menu" aria-expanded={openTopMenu==='display'}
              onClick={()=>setOpenTopMenu(m=>m==='display'?null:'display')}>
              <span className="nv-drawer-item-label"><Eye size={17}/> Affichage</span><ChevronDown size={15}/>
            </button>
            {openTopMenu==='display'&&<div className="nv-menu-popover nv-display-popover"
              role="menu" aria-label="Affichage">
              <button type="button" role="menuitem" onClick={()=>void toggleStudioFullscreen()}>
                {studioFullscreen?<Minimize2 size={16}/>:<Maximize2 size={16}/>}
                <span>{studioFullscreen?'Quitter le plein écran':'Plein écran du logiciel'}</span>
              </button>
              <div className="nv-menu-divider" role="separator"/>
              <button type="button" role="menuitemcheckbox" aria-checked={!leftHidden}
                onClick={()=>setLeftHidden(value=>!value)}>
                <PanelLeftClose size={16}/><span>Colonne panoramas</span><b>{leftHidden?'Masquée':'Visible'}</b>
              </button>
              <button type="button" role="menuitemcheckbox" aria-checked={!rightHidden}
                onClick={()=>setRightHidden(value=>!value)}>
                <PanelRightClose size={16}/><span>Inspecteur</span><b>{rightHidden?'Masqué':'Visible'}</b>
              </button>
              <div className="nv-menu-divider" role="separator"/>
              <button type="button" role="menuitemradio" aria-checked={sceneDensity==='comfortable'}
                onClick={()=>setSceneDensity('comfortable')}>
                <Images size={16}/><span>Grandes miniatures</span><b>{sceneDensity==='comfortable'?'✓':''}</b>
              </button>
              <button type="button" role="menuitemradio" aria-checked={sceneDensity==='compact'}
                onClick={()=>setSceneDensity('compact')}>
                <LayoutGrid size={16}/><span>Liste compacte</span><b>{sceneDensity==='compact'?'✓':''}</b>
              </button>
              <div className="nv-menu-divider" role="separator"/>
              <button type="button" role="menuitem" onClick={()=>{
                setLeftHidden(false);setRightHidden(false);setSceneDensity('comfortable');setOpenTopMenu(null);
              }}>
                <Home size={16}/><span>Réinitialiser l’affichage</span>
              </button>
            </div>}
          </div>
          <div className="nv-menu-root">
            <button type="button" className="nv-menu-trigger" title="Sauvegardes et versions Supabase"
              onClick={()=>{setOpenTopMenu(null);setNavigationDrawerOpen(false);setCloudOpen(true);}}>
              <span className="nv-drawer-item-label"><Cloud size={17}/> Cloud</span>
            </button>
          </div>
          </div>
        </nav>
      </div>
      <label className="nv-v3-name" title="Nom du projet">
        <Edit3 size={14} aria-hidden="true"/>
        <input aria-label="Nom du projet" value={project.name}
          onChange={event=>setProject(current=>({...current,name:event.target.value}))}/>
      </label>
      </div>
      <div className="nv-v3-center" ref={toolsMenuRef}>
        {!creationFullscreen&&modeSwitch(false)}
        {toolsCurtain(false)}
      </div>
      <div className="nv-v3-right">
        {updateAvailable&&<button type="button" className="nv-header-update is-available"
          onClick={reloadToLatestVersion} disabled={savingManually}
          title="Une nouvelle version de NovaStudio est disponible : cliquer pour la charger (pensez à enregistrer avant)"
          aria-label="Nouvelle version de NovaStudio disponible : actualiser">
          <RefreshCw size={16} aria-hidden="true"/><span>Nouvelle version</span><i className="nv-header-update-dot" aria-hidden="true"/>
        </button>}
        {(()=>{
          const dirty=ready&&project!==savedRef.current,ops=histRef.current.ops;
          const state=savingManually?'saving':!dirty?'clean':ops>=5?'urgent':'dirty';
          const tip=state==='saving'?'Enregistrement en cours…':state==='clean'?'Tout est enregistré':state==='urgent'?ops+' modifications non enregistrées : clique pour enregistrer (enregistrement automatique à la 6e)':'Des modifications ne sont pas enregistrées : clique pour enregistrer (Ctrl+S)';
          return <button type="button" className={'nv-v3-icon-btn nv-v3-save is-'+state} onClick={()=>void manualSave()} disabled={!ready||savingManually||!!lock} aria-label={tip} title={tip}>
            <Save size={20}/>{state==='dirty'||state==='urgent'?<i className="nv-save-badge" aria-hidden="true">{ops>9?'9+':ops||'!'}</i>:null}
          </button>;
        })()}
        <button type="button" className="nv-v3-icon-btn nv-v3-undo" onClick={undo} disabled={!histRef.current.past.length} aria-label="Annuler la dernière action" title="Annuler (Ctrl+Z)"><Undo2 size={20}/></button>
        <button type="button" className="nv-v3-icon-btn nv-v3-redo" onClick={redo} disabled={!histRef.current.future.length} aria-label="Rétablir l’action annulée" title="Rétablir (Ctrl+Maj+Z ou Ctrl+Y)"><Redo2 size={20}/></button>
        <div className="nv-share-wrap" ref={shareMenuRef}>
          <button type="button" className={'nv-v3-icon-btn nv-v3-share'+(shareMenuOpen?' is-open':'')} onClick={()=>setShareMenuOpen(open=>!open)}
            aria-haspopup="menu" aria-expanded={shareMenuOpen} aria-label="Partager" title="Partager : projet, espaces, autres projets">
            <Share2 size={21}/>
          </button>
          {shareMenuOpen&&<div className="nv-share-menu" role="menu" aria-label="Partager">
            <div className="nv-share-group">Le projet</div>
            <button type="button" role="menuitem" onClick={()=>{leaveShare();setShareOpen(true);}}>🔗 Lien public et publication</button>
            <button type="button" role="menuitem" onClick={()=>{leaveShare();setPrivateOpen(true);}}>🔒 Inviter un membre (lien privé)</button>
            <div className="nv-share-group">Les espaces</div>
            <button type="button" role="menuitem" onClick={()=>startSpaceAction()}>☑ Choisir plusieurs espaces</button>
            <button type="button" role="menuitem" onClick={()=>startSpaceAction('share')}>👥 Partager des espaces avec un membre</button>
            <button type="button" role="menuitem" onClick={()=>startSpaceAction('transfer')}>⭱ Envoyer des espaces vers un autre projet</button>
            <button type="button" role="menuitem" onClick={()=>{setShareMenuOpen(false);spaceImportInput.current?.click();}}>⭳ Importer des espaces d’un autre projet</button>
          </div>}
        </div>
        <button type="button" className="nv-v3-icon-btn nv-v3-camera" onClick={()=>void takeShot()}
          aria-label="Capture annotée" title="Capture d’écran : entourer, écrire, envoyer à un collègue">
          <Camera size={22}/>
        </button>
        <button type="button" className="nv-v3-icon-btn nv-v3-fullscreen" onClick={()=>void toggleCreationFullscreen()} disabled={!active}
          aria-label="Plein écran de la création" title="Plein écran : agrandir uniquement la création 360°">
          <Maximize2 size={21}/>
        </button>
        <div className="nv-share-wrap nv-bell-wrap" ref={bellRef}>
          <button type="button" className={'nv-v3-icon-btn nv-v3-bell'+(bellOpen?' is-open':'')+(notifCount?' has-new':'')} onClick={()=>{setBellOpen(value=>!value);setSharedNotesUnread(0);setProjectSharesUnread(0);}}
            aria-haspopup="menu" aria-expanded={bellOpen} aria-label={notifCount?'Notifications ('+notifCount+' nouvelles)':'Notifications'} title="Notifications : notes, captures, invitations, mises à jour">
            <Bell size={21}/>{notifCount>0&&<i className="nv-bell-badge" aria-hidden="true">{notifCount>9?'9+':notifCount}</i>}
          </button>
          {bellOpen&&<div className="nv-share-menu nv-bell-menu" role="menu" aria-label="Notifications">
            <div className="nv-bell-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={bellTab==='notifs'} className={bellTab==='notifs'?'is-on':''} onClick={()=>setBellTab('notifs')}>🔔 Notifications{notifCount?' ('+notifCount+')':''}</button>
              <button type="button" role="tab" aria-selected={bellTab==='comments'} className={bellTab==='comments'?'is-on':''} onClick={()=>setBellTab('comments')}>💬 Commentaires{openCommentCount?' ('+openCommentCount+')':''}</button>
            </div>
            {bellTab==='comments'?<>
              <button type="button" role="menuitem" className="nv-bell-open-all" onClick={()=>{setBellOpen(false);setCommentsOpen(true);}}>💬 Ouvrir tous les commentaires · en ajouter un ici</button>
              {!openCommentCount&&<p className="nv-bell-empty">Aucun commentaire en attente. Ajoute-en un accroché à l’endroit que tu regardes.</p>}
              {[...(project.comments??[])].filter(c=>!c.done).sort((x,y)=>y.at-x.at).slice(0,12).map(c=><button type="button" role="menuitem" key={c.id} onClick={()=>{setBellOpen(false);goToComment(c);}}>{c.issueId?'📝':'💬'} <span><b>{project.scenes.find(sc=>sc.id===c.sceneId)?.name||'panorama'}</b> · {c.text.replace(/\n/g,' ').slice(0,90)}<small>{c.author} · {new Date(c.at).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})} · cliquer pour aller à l’endroit</small></span></button>)}
            </>:<>
            <button type="button" role="menuitem" onClick={()=>{setBellOpen(false);setCheckOpen(true);}}>{issueErrors?'⛔':projectIssues.length?'⚠️':'✅'} <span><b>Contrôle du projet</b><small>{projectIssues.length?issueErrors+' erreur'+(issueErrors>1?'s':'')+' · '+(projectIssues.length-issueErrors)+' avertissement'+(projectIssues.length-issueErrors>1?'s':'')+' · cliquer pour corriger':'Rien d’anormal détecté'}</small></span></button>
            {!notifCount&&!notifHistory.length&&<p className="nv-bell-empty">Rien de nouveau. Les notes, captures et invitations de tes collègues apparaîtront ici.</p>}
            {liveInvite.invite&&<button type="button" role="menuitem" onClick={()=>{setBellOpen(false);liveInvite.dismiss();void startLiveWith([],false);}}>🖥 <span><b>{liveInvite.invite.fromLabel}</b> t’invite à partager son écran<small>Cliquer pour rejoindre</small></span></button>}
            {liveInvite.notesIn.map(n=><button type="button" role="menuitem" key={n.id} onClick={()=>{setBellOpen(false);liveInvite.dismissNote(n.id);setToolsMenuOpen(false);setRightHidden(true);setNotesOpen(true);}}>📝 <span><b>{n.fromLabel}</b> : {n.body.slice(0,70)}{n.body.length>70?'…':''}<small>Note · cliquer pour ouvrir les notes</small></span></button>)}
            {liveInvite.shots.map(sh=><button type="button" role="menuitem" key={sh.id} onClick={()=>{setBellOpen(false);liveInvite.dismissShot(sh.id);setShotImage({image:sh.image,defaultTo:sh.fromEmail});}}>📷 <span><b>{sh.fromLabel}</b> t’envoie une capture{sh.comment?' : '+sh.comment.slice(0,60):''}<small>Cliquer pour la voir et répondre</small></span></button>)}
            {updateAvailable&&<button type="button" role="menuitem" onClick={reloadToLatestVersion}>🔄 <span><b>Nouvelle version de NovaStudio</b><small>Enregistre ton travail, puis clique pour actualiser</small></span></button>}
            {notifHistory.length>0&&<div className="nv-share-group">Récemment</div>}
            {notifHistory.slice(0,10).map(h=><div key={h.id} className="nv-bell-hist"><span>{h.icon}</span><span>{h.text}<small>{new Date(h.at).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</small></span></div>)}
            {notifHistory.length>0&&<button type="button" role="menuitem" className="nv-bell-clear" onClick={()=>{setNotifHistory([]);try{localStorage.removeItem('nvstudio-notif-history');}catch{/* rien */}}}>Effacer l’historique</button>}
            {(liveInvite.notesIn.length+liveInvite.shots.length>1)&&<button type="button" role="menuitem" className="nv-bell-clear" onClick={()=>{liveInvite.notesIn.forEach(n=>liveInvite.dismissNote(n.id));liveInvite.shots.forEach(sh=>liveInvite.dismissShot(sh.id));}}>Tout marquer comme lu</button>}
            </>}
          </div>}
        </div>
      </div>
    </header>
    <section id="nv-workspace-spaces" className={"nv-space-strip nv-space-drawer"+(spacesDrawerOpen?" is-open":"")} aria-label="Espaces de travail du projet" aria-hidden={!spacesDrawerOpen}>

      <div className="nv-space-tab-scroll" role="tablist" aria-label="Espaces du projet" data-hsort="spaces">
        <div className={'nv-space-tab nv-space-tab-editable'+(!currentSpace?' is-active':'')}>
          {editingSpaceId==='__project__'?
            <input autoFocus className="nv-space-tab-rename" value={editingSpaceName} maxLength={150} aria-label="Nouveau nom du projet"
              onChange={e=>setEditingSpaceName(e.target.value)}
              onBlur={()=>finishSpaceRename('__project__')}
              onKeyDown={e=>{
                if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}
                if(e.key==='Escape'){e.preventDefault();cancelSpaceEditRef.current=true;e.currentTarget.blur();}
              }}/>:
            <>
              <button type="button" role="tab" aria-selected={!currentSpace} className="nv-space-tab-select"
                onClick={()=>selectSpace(null)} onDoubleClick={()=>startSpaceRename('__project__',project.name)}
                title={project.name+' · tous les panoramas originaux · double-clic pour renommer'}>
                <Home size={13}/><span>{project.name||'Projet complet'}</span><small>{project.scenes.length}</small>
              </button>
              <button type="button" className="nv-space-tab-rename-button" aria-label="Renommer le projet" title="Renommer le projet"
                onClick={()=>startSpaceRename('__project__',project.name)}><Edit3 size={13}/></button>
            </>}
        </div>
        {(project.spaces??[]).map(space=><div key={space.id} data-hsort-id={space.id}
          className={'nv-space-tab nv-space-tab-editable'+(activeSpaceId===space.id?' is-active':'')+(spaceSort.drag===space.id?' is-dragging':'')+(spaceSelection.has(space.id)?' is-picked':'')}>
          {spaceSelectMode&&<button type="button" className={'nv-space-pick'+(spaceSelection.has(space.id)?' is-on':'')} aria-pressed={spaceSelection.has(space.id)} aria-label={'Sélectionner '+space.name} onClick={()=>toggleSpacePick(space.id)}>{spaceSelection.has(space.id)?'✓':''}</button>}
          {editingSpaceId!==space.id&&spaceSort.grip(space.id,space.name)}
          {editingSpaceId===space.id?
            <input autoFocus className="nv-space-tab-rename" value={editingSpaceName}
              maxLength={100} aria-label={'Nouveau nom de '+space.name}
              onChange={e=>setEditingSpaceName(e.target.value)}
              onBlur={()=>finishSpaceRename(space.id)}
              onKeyDown={e=>{
                if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}
                if(e.key==='Escape'){e.preventDefault();cancelSpaceEditRef.current=true;e.currentTarget.blur();}
              }}/>:
            <>
              <button type="button" role="tab" aria-selected={activeSpaceId===space.id}
                className="nv-space-tab-select" title={space.name+' · double-clic pour renommer'}
                onClick={()=>selectSpace(space.id)}
                onDoubleClick={()=>startSpaceRename(space.id,space.name)}>
                <LayoutGrid size={13}/><span>{space.name}</span><small>{space.sceneIds.length}</small>
              </button>
              <button type="button" className="nv-space-tab-rename-button"
                aria-label={'Renommer '+space.name} title={'Renommer '+space.name}
                onClick={()=>startSpaceRename(space.id,space.name)}>
                <Edit3 size={13}/>
              </button>
              <button type="button" className="nv-space-tab-rename-button nv-space-tab-trash"
                aria-label={'Supprimer '+space.name} title={'Supprimer '+space.name+' (avec transfert possible)'}
                onClick={()=>{setSpaceDelete({id:space.id,target:''});}}>
                <Trash2 size={13}/>
              </button>
            </>}
        </div>)}
      </div>
      <button type="button" className="nv-space-create" onClick={createSpace}
        title="Créer une sous-visite à partir des panoramas existants">
        <Plus size={15}/> Ajouter un espace
      </button>

      {currentSpace&&<button type="button" className="nv-space-manage" onClick={()=>setSpaceManagerOpen(true)}>
        Gérer les panoramas
      </button>}
    </section>
    {spacesDrawerOpen&&spaceSelectMode&&<div className="nv-space-selbar" role="toolbar" aria-label="Actions sur les espaces choisis">
      <b>{spaceSelection.size} espace{spaceSelection.size>1?'s':''} choisi{spaceSelection.size>1?'s':''}</b>
      <button type="button" onClick={()=>setSpaceSelection(new Set((project.spaces??[]).map(space=>space.id)))}>Tout choisir</button>
      <button type="button" disabled={!spaceSelection.size} onClick={()=>setSpaceAction('share')}>👥 Partager avec un membre…</button>
      <button type="button" disabled={!spaceSelection.size} onClick={()=>setSpaceAction('transfer')}>⭱ Envoyer vers un autre projet…</button>
      <button type="button" onClick={()=>{setSpaceSelectMode(false);setSpaceSelection(new Set());}}>Terminer</button>
    </div>}
    <input ref={spaceImportInput} hidden type="file" accept=".json,.nvspaces.json,application/json" onChange={e=>void importSpacesFile(e.currentTarget.files?.[0])}/>
    {spaceManagerOpen&&currentSpace&&<div className="overlay nv-space-overlay" onMouseDown={event=>{
      if(event.target===event.currentTarget)setSpaceManagerOpen(false);
    }}>
      <section className="nv-space-modal" role="dialog" aria-modal="true" aria-label="Gestion de l’espace">
        <div className="nv-space-modal-head">
          <div><small>PROJET : {project.name}</small><h2>Organiser cet espace</h2></div>
          <button type="button" className="nv-space-close" onClick={()=>setSpaceManagerOpen(false)} aria-label="Fermer"><XMark/></button>
        </div>
        <SpaceCover name={currentSpace.name} value={currentSpace.coverDataUrl} onChange={coverDataUrl=>setProject(p=>({...p,spaces:p.spaces?.map(space=>space.id===currentSpace.id?{...space,coverDataUrl}:space)}))}/>
        <SpaceRoomNameOptions space={currentSpace} onChange={v=>setProject(p=>({...p,spaces:p.spaces?.map(space=>space.id===currentSpace.id?{...space,...v}:space)}))}/>
        <label className="nv-space-name-label">Nom de l’espace
          <input aria-label="Renommer cet espace" value={currentSpace.name}
            onChange={e=>renameSpace(currentSpace.id,e.target.value)} maxLength={100}/>
        </label>
        <p>Panoramas 360° de cet espace : sélectionne plusieurs JPG, PNG ou WebP en une seule fois (40 Mo maximum par panorama). Les fichiers sont ajoutés à cet espace sans toucher aux autres espaces.</p>
        <div className="nv-space-select-actions">
          <span>{currentSpace.sceneIds.length} / {project.scenes.length} panoramas inclus</span>
          <button type="button" className="primary" onClick={()=>{
            spacePanoramasTarget.current=currentSpace.id;
            spacePanoramasInput.current?.click();
          }}>＋ Importer plusieurs panoramas (40 Mo chacun)…</button>
          <button type="button" onClick={()=>setProject(p=>({...p,spaces:(p.spaces??[]).map(sp=>sp.id===currentSpace.id?{
            ...sp,sceneIds:p.scenes.filter(sc=>sp.sceneIds.includes(sc.id)||!p.spaces?.some(other=>other.id!==sp.id&&other.sceneIds.includes(sc.id))).map(sc=>sc.id)
          }:sp)}))}>Ajouter les panoramas libres</button>
          <button type="button" onClick={()=>{
            setProject(p=>({...p,spaces:(p.spaces??[]).map(sp=>sp.id===currentSpace.id?{...sp,sceneIds:[]}:sp)}));
            setActiveId('');setSelectedId('');
          }}>Tout retirer</button>
        </div>
        <div className="nv-pano-import-dropzone" role="button" tabIndex={0}
          aria-label="Déposer plusieurs panoramas dans cet espace"
          onClick={()=>{spacePanoramasTarget.current=currentSpace.id;spacePanoramasInput.current?.click();}}
          onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();spacePanoramasTarget.current=currentSpace.id;spacePanoramasInput.current?.click();}}}
          onDragOver={e=>{if(e.dataTransfer?.types.includes('Files')){e.preventDefault();e.currentTarget.classList.add('drag-hover');}}}
          onDragLeave={e=>e.currentTarget.classList.remove('drag-hover')}
          onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove('drag-hover');void addImages(e.dataTransfer.files,currentSpace.id);}}>
          <strong>⬆ Glisse ici tous tes panoramas 360°</strong>
          <small>Ou clique pour choisir plusieurs fichiers · JPG, PNG, WebP · 40 Mo / fichier</small>
        </div>
        <p>Les panoramas déjà affectés à un autre espace restent séparés. Pour les réutiliser, utilise l'action de copie ou de transfert entre espaces.</p>
        <div className="nv-space-scene-picker">
          {project.scenes.filter(scene=>currentSpace.sceneIds.includes(scene.id)||!(project.spaces??[]).some(other=>other.id!==currentSpace.id&&other.sceneIds.includes(scene.id))).map(scene=><label key={scene.id} className="nv-space-scene-option">
            <input type="checkbox" checked={currentSpace.sceneIds.includes(scene.id)}
              onChange={e=>setSceneInSpace(currentSpace.id,scene.id,e.target.checked)}/>
            {sceneThumbs[scene.id]?<img src={sceneThumbs[scene.id]} alt="" draggable={false}/>:<span className="nv-space-no-thumb">◎</span>}{todoPin(scene.id)}
            <span>{scene.name}</span>
          </label>)}
        </div>
        {(project.spaces??[]).length>1&&<div className="nv-space-select-actions nv-space-transfer">
          <span>Transférer les {currentSpace.sceneIds.length} panoramas de cet espace vers :</span>
          <select aria-label="Espace de destination" value={spaceTransferTo} onChange={e=>setSpaceTransferTo(e.target.value)}>
            <option value="">Choisir un espace…</option>
            {(project.spaces??[]).filter(sp=>sp.id!==currentSpace.id).map(sp=><option key={sp.id} value={sp.id}>{sp.name}</option>)}
          </select>
          <button type="button" disabled={!spaceTransferTo} onClick={()=>transferSpaceScenes(currentSpace.id,spaceTransferTo,false)}>Ajouter (copier)</button>
          <button type="button" disabled={!spaceTransferTo} onClick={()=>transferSpaceScenes(currentSpace.id,spaceTransferTo,true)}>Déplacer</button>
        </div>}
        <div className="nv-space-modal-footer">
          <button type="button" className="nv-space-delete" onClick={()=>setSpaceDelete({id:currentSpace.id,target:''})}>Supprimer cet espace…</button>
          <button type="button" className="primary" onClick={()=>setSpaceManagerOpen(false)}>Terminer</button>
        </div>
      </section>
    </div>}
    {spaceAction&&selectedSpaces.length>0&&<SpacesActions mode={spaceAction} project={project} spaces={selectedSpaces} onClose={()=>setSpaceAction(null)} onStatus={setStatus}
      onMoved={ids=>{setProject(p=>{const remaining=getFloorPlans(p).filter(plan=>!plan.spaceId||!ids.includes(plan.spaceId));return {...p,spaces:(p.spaces??[]).filter(space=>!ids.includes(space.id)),floorPlans:remaining,floorPlan:remaining[0]};});setSpaceSelection(new Set());if(activeSpaceId&&ids.includes(activeSpaceId)){setActiveSpaceId(null);}}}/>}
    {!creationFullscreen&&mediaPickerEl()}
    {shotImage&&<ShotEditor image={shotImage.image} defaultTo={shotImage.defaultTo} canSend={!!inviteIdentity} onSend={sendShot} onClose={()=>setShotImage(null)}/>}
    {updateAvailable&&Date.now()>=updateSnoozeUntil&&<div className="nv-update-banner" role="alert">
      <span className="nv-update-text"><b>Nouvelle version de NovaStudio disponible</b><small>{ready&&projectRef.current!==savedRef.current?'Enregistre ton travail avec la disquette, puis actualise.':'Actualise pour profiter des dernières nouveautés.'}</small></span>
      <button type="button" className="is-go" onClick={reloadToLatestVersion} disabled={savingManually}><RefreshCw size={16}/> Actualiser maintenant</button>
      <button type="button" onClick={()=>setUpdateSnoozeUntil(Date.now()+10*60_000)}>Plus tard</button>
    </div>}
    {liveDialogOpen&&<LiveShareDialog onStart={emails=>void startLiveWith(emails)} onClose={()=>{setLiveDialogOpen(false);backFrom();}}/>}
    {!liveProjectId&&liveInvite.invite&&<div className="nv-live-invite" role="alert"><span><b>{liveInvite.invite.fromLabel}</b> t’invite à partager son écran.</span><button type="button" className="is-join" onClick={()=>{liveInvite.dismiss();void startLiveWith([],false);}}>Rejoindre</button><button type="button" onClick={liveInvite.dismiss}>Plus tard</button></div>}
    {issueFocus&&!classicDestinationOpen&&!mediaPicker&&<IssueCallout docked={!rightHidden} noted={!!(issueFocus.id&&notedIds.has(issueFocus.id))} noteText={noteText} onNoteText={setNoteText} onNote={noteIssueForLater} onChoose={issueFocus.kind==='nav'||issueFocus.kind==='scene-empty'?chooseDestination:undefined} onRemove={issueFocus.kind==='dup-nav'&&issueFocus.hotspotId?()=>{removeAutoNavigationArrow(issueFocus.hotspotId!);setStatus('Flèche en double supprimée');}:undefined} media={(()=>{const sc=project.scenes.find(x=>x.id===issueFocus.sceneId);return sc?<FullscreenGalleryHoverPreview scene={sc} thumb={sceneThumbs[sc.id]}/>:undefined;})()} focus={issueFocus} stillPresent={projectIssues.some(i=>i.id===issueFocus.id)} saving={savingManually} error={fixError} onValidate={validateFix} onClose={()=>{setIssueFocus(null);setGuided(null);if(returnToCheck.current){returnToCheck.current=false;setCheckOpen(true);}}} step={guided?{i:guided.i+1,n:guided.queue.length}:undefined} onNext={guided?nextGuided:undefined} onOpen={()=>{setPanel('points');setRightHidden(false);}}/>}
    {checkOpen&&<ProjectCheckPanel noted={notedIds} issues={projectIssues} hidden={hiddenIssues}
      onIgnore={ignoreCheck} onRestore={restoreCheck}
      onGo={i=>{setGuided(null);returnToCheck.current=true;goToIssue(i);}}
      onGuided={startGuided} onClose={()=>setCheckOpen(false)}
      autoFixCount={autoFixChanges.length}
      onAutoFix={()=>{const r=autoFixProject(project);try{setProject(validateProject(r.project));setStatus(r.changes.length?'Corrections appliquées ('+r.changes.length+'). Vérifie les flèches créées et déplace-les vers la bonne direction.':'Rien à corriger automatiquement.');}catch(e){setStatus('Correction impossible : '+String(e));}}}/>}
    {commentsOpen&&<CommentsPanel comments={project.comments??[]} scenes={project.scenes} currentSceneId={cameraRef.current.sceneId||activeId} onAdd={addComment} onGo={goToComment} onToggle={toggleComment} onDelete={deleteComment} onClose={()=>{setCommentsOpen(false);backFrom();}}/>}
    {welcome&&<aside className="nv-welcome" role="status" aria-label="Depuis ta dernière visite">
      <h3>👋 {welcome.since?'Depuis ta dernière visite ('+new Date(welcome.since).toLocaleDateString('fr-FR',{day:'2-digit',month:'long'})+')':'À savoir sur ce projet'}</h3>
      <ul>
        {welcome.notifs>0&&<li>{welcome.notifs} événement{welcome.notifs>1?'s':''} (enregistrements, notes, captures)</li>}
        {welcome.comments>0&&<li>{welcome.comments} commentaire{welcome.comments>1?'s':''} d’équipe en attente</li>}
        {welcome.errors>0&&<li>{welcome.errors} problème{welcome.errors>1?'s':''} à corriger avant de publier</li>}
      </ul>
      <div className="nv-welcome-actions">
        {welcome.notifs>0&&<button type="button" onClick={()=>{setWelcome(null);setBellOpen(true);}}>Voir l’historique</button>}
        {welcome.comments>0&&<button type="button" onClick={()=>{setWelcome(null);setCommentsOpen(true);}}>Voir les commentaires</button>}
        {welcome.errors>0&&<button type="button" onClick={()=>{setWelcome(null);setPublishConfirm(true);}}>Contrôler le projet</button>}
        <button type="button" onClick={()=>setWelcome(null)}>OK</button>
      </div>
    </aside>}
    {notesOpen&&<NotesPanel projectName={project.name}
      onOpenPanorama={sceneId=>{
        if(!project.scenes.some(sc=>sc.id===sceneId)){setStatus('Ce panorama n’est plus disponible.');return;}
        setNotesOpen(false);setPreview(false);setActiveSpaceId(null);
        setActiveId(sceneId);setSelectedId('');setMode(null);setRightHidden(true);
      }}
      onClose={()=>{setNotesOpen(false);backFrom();}}
      onOpenCloud={()=>{returnTo.current=null;setToolsMenuOpen(false);setCloudOpen(true);}}/>}
    {liveProjectId&&<LiveOverlay live={live} onClose={()=>setLiveProjectId(null)}/>}
    {spaceDelete&&(()=>{
      const sp=(project.spaces??[]).find(item=>item.id===spaceDelete.id);
      if(!sp)return null;
      const others=(project.spaces??[]).filter(item=>item.id!==sp.id);
      return <div className="overlay nv-space-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)setSpaceDelete(null);}}>
        <section className="nv-space-modal" role="alertdialog" aria-modal="true" aria-label="Supprimer l’espace">
          <div className="nv-space-modal-head"><div><small>PROJET : {project.name}</small><h2>Supprimer « {sp.name} »</h2></div>
            <button type="button" className="nv-space-close" onClick={()=>setSpaceDelete(null)} aria-label="Fermer"><XMark/></button></div>
          <p>Seul l’espace est supprimé : les {sp.sceneIds.length} panoramas restent dans le projet complet. Vous pouvez aussi les ajouter à un autre espace.</p>
          <label className="nv-space-name-label">Transférer ses panoramas vers
            <select value={spaceDelete.target} onChange={e=>setSpaceDelete({id:sp.id,target:e.target.value})}>
              <option value="">Aucun transfert (supprimer l’espace seulement)</option>
              {others.map(o=><option key={o.id} value={o.id}>{o.name} ({o.sceneIds.length} panoramas)</option>)}
            </select>
          </label>
          <div className="nv-space-modal-footer">
            <button type="button" onClick={()=>setSpaceDelete(null)}>Annuler</button>
            <button type="button" className="nv-space-delete" onClick={()=>deleteSpace(sp.id,spaceDelete.target||undefined)}>{spaceDelete.target?'Transférer puis supprimer':'Supprimer l’espace'}</button>
          </div>
        </section>
      </div>;
    })()}
    {emailLink&&<div className="overlay"><div className="modal cloud-panel">
      <h2>{emailLink.done?'Adresse confirmée ✓':'Confirmer mon accès'}</h2>
      {emailLink.done?<>
        <p>Tu es connecté. Tu peux maintenant ouvrir la visite partagée : clique sur <b>Cloud</b> en haut, puis <b>Ouvrir</b> à côté de la visite.</p>
        <button className="primary" onClick={()=>{setEmailLink(null);setCloudOpen(true);}}>Ouvrir le panneau Cloud</button>
      </>:<>
        <p>Clique sur le bouton pour confirmer ton adresse e-mail et accéder à NovaVisio Studio.</p>
        <button className="primary" disabled={emailLink.busy} onClick={async()=>{
          setEmailLink(l=>l&&{...l,busy:true,error:''});
          try{
            await confirmEmailLink(emailLink.tokenHash,emailLink.type);
            window.history.replaceState(null,'',window.location.pathname);
            setEmailLink(l=>l&&{...l,busy:false,done:true});
          }catch(e){setEmailLink(l=>l&&{...l,busy:false,error:e instanceof Error?e.message:String(e)});}
        }}>{emailLink.busy?'Confirmation…':'Confirmer mon adresse'}</button>
        {emailLink.error&&<><p className="warning">{emailLink.error}</p>
          <p className="hint-inline">Demande à la personne qui t’a invité de recréer ton accès, ou utilise « Cloud » → « Lien magique » pour recevoir un nouveau lien.</p>
          <button className="quiet" onClick={()=>{window.history.replaceState(null,'',window.location.pathname);setEmailLink(null);setCloudOpen(true);}}>Aller à la connexion</button></>}
      </>}
    </div></div>}
    {authNotice&&<div className="nv-banner" role="alert">
      <p><b>{authNotice}</b> Un lien de connexion ne fonctionne qu’<b>une seule fois</b> et pendant environ 1 heure. Certaines messageries (Outlook, antivirus, filtres) l’ouvrent à l’avance et le rendent inutilisable. Demande-en un nouveau et clique dessus tout de suite, dans ce navigateur.</p>
      <div className="nv-banner-actions">
        <button className="primary" onClick={()=>{setAuthNotice(null);setCloudOpen(true);}}>Recevoir un nouveau lien / me connecter avec mon mot de passe</button>
        <button className="quiet" onClick={()=>setAuthNotice(null)}>Fermer</button>
      </div>
    </div>}
    {cloud.state.kind==='setup'&&<div className="nv-banner" role="alert">
      <p><b>La sauvegarde instantanée n’est pas encore installée dans Supabase.</b> Ton travail reste enregistré sur cet appareil. Pour l’activer : ouvre le SQL Editor de Supabase et exécute le fichier <code>20261110020000_nvstudio_autosave.sql</code> (et <code>20261110000000_nvstudio_init.sql</code> si ce n’est pas déjà fait).</p>
      <div className="nv-banner-actions">
        <a className="quiet share-open" href="https://github.com/gestion-boop/Novavisio-studio/blob/main/supabase/migrations/20261110020000_nvstudio_autosave.sql" target="_blank" rel="noopener">Voir le fichier SQL</a>
        <button className="primary" onClick={cloud.retryNow}>J’ai exécuté le SQL : réessayer</button>
        <button className="quiet" onClick={()=>cloud.setEnabled(false)}>Mettre en pause</button>
      </div>
    </div>}
    {lock&&<div className="nv-banner" role="alert">
      {lock.kind==='conflict'&&<>
        <p><b>Ce projet a été modifié dans une autre fenêtre.</b> Rien n’a été écrasé : l’enregistrement est suspendu dans celle-ci pour protéger ton travail.</p>
        <div className="nv-banner-actions">
          <button className="primary" onClick={()=>void reloadFromStore()}>Recharger la version enregistrée</button>
          <button className="quiet" onClick={download}>Télécharger ma version d’abord</button>
          <button className="quiet" onClick={async ()=>{if(await confirmAsk('Garder CETTE fenêtre remplace la version enregistrée par les autres fenêtres. Continuer ?'))void persist(project,true);}}>Garder cette fenêtre (remplace l’autre)</button>
        </div>
      </>}
      {lock.kind==='unreadable'&&<>
        <p><b>Le projet enregistré dans ce navigateur n’a pas pu être lu.</b> Il n’a pas été modifié ni écrasé, et l’enregistrement automatique est suspendu. Détail : {lock.reason}</p>
        <div className="nv-banner-actions">
          <button className="primary" onClick={downloadRawStored}>Télécharger les données brutes</button>
          <button className="quiet" onClick={()=>window.location.reload()}>Réessayer</button>
          <button className="quiet" onClick={startEmptyOverUnreadable}>Repartir d’un projet vide (remplace l’ancien)</button>
        </div>
      </>}
      {lock.kind==='saveError'&&<>
        <p><b>La sauvegarde manuelle a échoué :</b> {lock.reason}. Tes dernières modifications ne sont pas enregistrées.</p>
        <div className="nv-banner-actions">
          <button className="primary" onClick={download}>Télécharger ma sauvegarde (.nvstudio.json)</button>
          <button className="quiet" onClick={()=>setLock(null)}>Réessayer</button>
        </div>
      </>}
    </div>}
    <div className="workspace" style={{"--nv-inspector-width":inspectorVw+"vw"} as CSSProperties}>
      {classicDestinationOpen&&!creationFullscreen&&!preview&&active&&(selected?.type==='navigation'||(autoNavigation&&autoPending))&&
        <section id="nv-classic-destination-picker" className="nv-classic-destination-overlay"
          aria-label="Choix visuel du panorama de destination">
          <div className="nv-classic-destination-heading">
            <div><small>{autoNavigation?'AUTO · ÉTAPE 2 / DESTINATION':'CHOISIR UNE DESTINATION'}</small><strong>Galerie 360°</strong></div>
            <button type="button" onClick={()=>{if(autoPending){setAutoPending(null);setClassicDestinationOpen(false);}else if(autoNavigation)stopAutoNavigation();else setClassicDestinationOpen(false);}} aria-label={autoNavigation&&!autoPending?"Quitter l'assistant Auto":"Fermer la galerie"} title={autoNavigation?"Quitter l'assistant Auto":"Fermer"}><XMark/></button>
          </div>
          {(issueFocus||(selected&&active&&!selected.target)||(autoPending&&active))&&<IssueBanner focus={issueFocus?{...issueFocus,thumb:undefined,sceneName:undefined}:{level:'warn' as const,text:autoPending?'Mode Auto · tu as placé la flèche. Vers quel panorama doit-elle mener ?':'Cette flèche n’a pas encore de panorama de destination.',hint:'Choisis dans la liste le panorama vers lequel elle doit mener, règle le viseur, puis valide.',thumb:undefined,sceneName:undefined}}/>}
          <div className="nv-classic-destination-layout">
            <div className="nv-classic-destination-list-panel">
              {(project.spaces??[]).length>0&&!autoNavigation&&selected?.type==='navigation'&&<div className="nv-destination-space-choices">
                <strong>Ou rejoindre un espace existant</strong>
                {(project.spaces??[]).filter(sp=>sp.sceneIds.some(id=>project.scenes.some(sc=>sc.id===id&&!sc.excluded))).map(sp=>
                  <button type="button" key={sp.id} className="nv-classic-destination-row"
                    onClick={()=>setNavigationSpace(sp.id)}>
                    <Layers size={17}/><span><strong>{sp.name}</strong><small>Ouvrir le premier panorama, sans duplication</small></span><ChevronRight size={15}/>
                  </button>)}
              </div>}
              <input type="search" value={classicDestinationSearch} placeholder="Rechercher un panorama…"
                aria-label="Rechercher un panorama" onChange={e=>setClassicDestinationSearch(e.target.value)}/>
              <div className="nv-classic-destination-list" ref={destinationListRef}>
                {(()=>{const sugg=issueFocus&&activeId?suggestDestinations(activeId):[];const curN=sceneNumber(project.scenes.find(x=>x.id===activeId)?.name??'');const rank=(id:string)=>{const k=sugg.findIndex(x=>x.id===id);if(k>=0)return k;const m=sceneNumber(project.scenes.find(x=>x.id===id)?.name??'');return 1000+(curN!==null&&m!==null?Math.abs(m-curN):5000);};return [...visibleScenes].filter(sc=>sc.id!==activeId&&sc.name.toLocaleLowerCase('fr').includes(classicDestinationSearch.toLocaleLowerCase('fr'))).sort((a,b)=>rank(a.id)-rank(b.id)).map(sc=>({sc,why:sugg.find(x=>x.id===sc.id)?.why}));})().map(({sc,why})=>
                  <button type="button" key={sc.id} data-destination-scene={sc.id} className={'nv-classic-destination-row'+(classicDestinationPreviewId===sc.id?' is-active':'')}
                    onClick={()=>setClassicDestinationPreviewId(sc.id)}
                    aria-pressed={classicDestinationPreviewId===sc.id}>
                    {sceneThumbs[sc.id]?<img src={sceneThumbs[sc.id]} alt="" draggable={false}/>:<span>◎</span>}{todoPin(sc.id)}
                    <span><strong>{sc.name}</strong><small>{sc.id===classicDestinationPreviewId?'✓ Sélectionné'+(why?' · '+why.replace('⭐ Suggéré · ','suggéré : '):' · vue affichée'):sc.id===selected?.target?'✓ Destination actuelle':why??'Voir en 360°'}</small></span>
                    <ChevronRight size={15}/>
                  </button>)}
              </div>
            </div>
            <div className="nv-classic-destination-view-panel">
              {visibleScenes.filter(sc=>sc.id===classicDestinationPreviewId&&sc.id!==activeId).map(sc=>
                <div key={sc.id} className="nv-classic-destination-detail">
                  <div className="nv-classic-destination-title"><strong>{sc.name}</strong><span>Glisse pour explorer à 360°</span></div>
                  <div className="nv-classic-destination-viewer nv-targeted-preview">
                     <FullscreenGalleryHoverPreview scene={sc} thumb={sceneThumbs[sc.id]} onOrientation={view=>{galleryOrientationRef.current[sc.id]=view;}}/>
                     <div className="nv-target-center" aria-hidden="true"><span/><span/><i/></div>
                   </div>
                  <button type="button" className="nv-classic-destination-confirm" onClick={()=>{
                      if(autoNavigation&&autoPending&&active){const p=autoPending;setAutoPending(null);setClassicDestinationOpen(false);guidedForward(p.yaw,p.pitch,sc.id);return;}
                      if(!active||!selected||selected.type!=='navigation')return;
                      if(!autoNavigation)setNavigationDestination(sc.id);
                      else confirmNavigationDirection({
                        sourceId:active.id,targetId:sc.id,sourceYaw:selected.yaw,sourcePitch:selected.pitch,
                        existingPointId:selected.id
                      });
                    }}>
                    <Images size={16}/> ✓ Valider la direction
                  </button>
                </div>)}
              {!visibleScenes.some(sc=>sc.id===classicDestinationPreviewId&&sc.id!==activeId)&&
                <div className="nv-classic-destination-empty">Sélectionne un panorama dans la liste à gauche.</div>}
            </div>
            {active&&<aside className="nv-classic-destination-source" aria-label="Panorama de départ">
              <small>PANORAMA DE DÉPART</small>
              <div className="nv-classic-destination-source-view"><FullscreenGalleryHoverPreview scene={active} thumb={sceneThumbs[active.id]}/></div>
              <strong>{active.name}</strong>
              <span>Scène {Math.max(1,project.scenes.findIndex(sc=>sc.id===active.id)+1)} / {project.scenes.length} · la flèche à régler est ici. Glisse pour regarder autour.</span>
            </aside>}
          </div>
          <div className="nv-classic-destination-foot">
            <span>Choisis le prochain panorama, règle la direction avec le viseur, puis valide pour continuer de panorama en panorama.</span>
            <button type="button" onClick={()=>{if(autoPending){setAutoPending(null);setClassicDestinationOpen(false);}else if(autoNavigation)stopAutoNavigation();else setClassicDestinationOpen(false);}}>{autoPending?'← Annuler et replacer la flèche':autoNavigation?'✕ Quitter Auto':'← Retour aux réglages'}</button>
          </div>
        </section>}
      <main className="editor">
        <div className={'view-area'+(creationFullscreenFallback?' nv-creation-fullscreen-fallback':'')+popupThemeClass} ref={viewAreaRef} style={{...barCss,...popupCss}}>
          {active?<Panorama sphereImage={sphereImage} scene={tourActive??active} icons={project.icons} mode={mode} preview={preview} autoNavigation={autoNavigation} night={nightActive} nightTexture={nightTexture} onCreate={autoNavigation&&mode==='navigation'?(y,p)=>{if(guide?.phase==='back')setStatus('Étape retour : tourne la vue puis clique sur « Valider le retour ».');else openAutoGallery(y,p);}:newPoint} turn={turnRequest} onPick={selectPointForEditing} arrival={active&&nextArrivalRef.current?.sceneId===active.id?nextArrivalRef.current:null} onNavigate={(id,via)=>{if(via&&active){goThroughArrow(via,active.id);return;}if(!visibleIds.has(id))return;selectScene(id);}} onInfo={h=>{setFrame(null);setInfoLanguage(activeLanguages[0]??'fr');setInfo(h);}} onLink={openLinkInTour} onImage={(h,from)=>{setZoomFrom(from??null);setImageZoom(h);setInfo(null);setFrame(null);}} onVideo={(h,from)=>{setZoomFrom(from??null);setVideoZoom(h);setInfo(null);setFrame(null);}} selectedId={selectedId}
            onWorldFrameChange={(id,corners,center)=>patchScene(sc=>({...sc,hotspots:sc.hotspots.map(h=>h.id===id?
              {...h,frameSphericalCorners:corners,yaw:center?.yaw??h.yaw,pitch:center?.pitch??h.pitch}:h)}))}
            onMarkerMove={moveHotspot} onRemoveNavigation={removeAutoNavigationArrow} onAssetDrop={dropIcon}
            onCameraChange={(yaw,pitch,zoom)=>{cameraRef.current={sceneId:activeId,yaw,pitch,zoom};}}/>:<div className={'empty'+(!currentSpace?' nv-home':'')}>
            {currentSpace&&<div className="empty-icon">◎</div>}
            {currentSpace&&<h1>Cet espace est vide</h1>}
            {currentSpace&&<p>Sélectionne les panoramas de la visite principale à inclure dans cet espace.</p>}
            {currentSpace&&<button className="primary" onClick={()=>setSpaceManagerOpen(true)}>Choisir les panoramas</button>}
            {!currentSpace&&<>
              <h1>Bienvenue dans NovaStudio</h1>
              <p>Crée un client : l'assistant analyse son site, sa charte et ses icônes, puis prépare la visite.</p>
              <div className="nv-home-actions">
                <button className="primary" onClick={()=>{setAiFreshClient(true);setAiAssistantOpen(true);}}>✨ Nouveau client (NovaStudio AI)</button>
                <button onClick={()=>setPreparationOpen(true)}>Démarrer sans assistant</button>
              </div>
            </>}
          </div>}
          {navigationDraft&&visibleScenes.some(sc=>sc.id===navigationDraft.targetId)&&
            <section className="nv-direction-preview" role="dialog" aria-modal="true" aria-label="Valider la direction de la destination">
              {visibleScenes.filter(sc=>sc.id===navigationDraft.targetId).map(sc=>
                <div className="nv-direction-preview-inner" key={sc.id}>
                  <div className="nv-direction-preview-head">
                    <div><small>DESTINATION 360°</small><strong>{sc.name}</strong></div>
                    <button type="button" onClick={()=>autoNavigation?stopAutoNavigation():(setNavigationDraft(null),setDestinationEditId(null))} aria-label={autoNavigation?"Quitter Auto":"Annuler la destination"} title={autoNavigation?"Quitter le mode Auto":"Annuler"}><XMark/></button>
                  </div>
                  <div className="nv-direction-preview-viewer nv-targeted-preview">
                    <FullscreenGalleryHoverPreview scene={sc} thumb={sceneThumbs[sc.id]}
                      onOrientation={view=>{galleryOrientationRef.current[sc.id]=view;}}/>
                    <div className="nv-target-center" aria-hidden="true"><span/><span/><i/></div>
                  </div>
                  <p>Oriente l'arrivée avec le viseur, puis valide. {autoNavigation?'Tu passeras directement au panorama suivant pour créer la prochaine flèche.':'La flèche garde sa position dans le panorama de départ.'}</p>
                  <div className="nv-direction-preview-actions">
                    <button type="button" className="nv-direction-confirm" onClick={()=>confirmNavigationDirection()}>✓ Valider la direction</button>
                    <button type="button" onClick={()=>autoNavigation?stopAutoNavigation():(setNavigationDraft(null),setDestinationEditId(null))}>{autoNavigation?'Quitter Auto':'Annuler'}</button>
                  </div>
                </div>)}
            </section>}
          {preview&&active&&viaFrom&&!viaFrom.excluded&&arrivedVia?.sceneId===active.id&&<button type="button" className="nv-preview-back" onClick={()=>selectScene(viaFrom.id)} aria-label={'Retour vers '+viaFrom.name} title={'Retour vers '+viaFrom.name}>↩ <span>{viaFrom.name}</span></button>}
          {autoNavigation&&!preview&&guide?.phase==='back'&&<div className="nv-guide-banner" role="status">
            <span>↩ <b>Retour</b> · fais un demi-tour (180°), ajuste la vue si besoin, puis valide.</span>
            <button type="button" className="nv-guide-ok" onClick={guidedBack}>✓ Valider le retour</button>
            <button type="button" onClick={guidedSkipBack}>Passer</button>
          </div>}
          {autoNavigation&&!preview&&guide?.phase==='forward'&&<div className="nv-guide-banner is-forward" role="status">
            <span>➜ <b>Aller</b> · vise avec la cible puis clique sur + : ouvre directement le panorama suivant.</span>
          </div>}
          {((autoNavigation&&!preview)||(creationFullscreen&&showArrivalCrosshair&&!preview))&&
            <div className={'nv-arrival-crosshair'+(autoNavigation?' nv-auto-crosshair':'')} aria-label="Cible centrale du panorama de départ">
              <span className="nv-cross-h"/><span className="nv-cross-v"/><span className="nv-cross-dot"/>
              {autoNavigation&&guide?.phase!=='back'&&!fullscreenGalleryOpen&&!classicDestinationOpen&&!navigationDraft&&mode==='navigation'&&
                <button type="button" className="nv-auto-crosshair-place nv-no-fx" aria-label="Placer la flèche sur la cible au centre"
                  title="Placer la flèche ici"
                  onPointerDown={e=>e.stopPropagation()}
                  onClick={e=>{
                    e.preventDefault();e.stopPropagation();
                    if(!active)return;
                    const v=cameraRef.current;
                    // Si le panorama vient de changer, la caméra peut encore
                    // porter l'ID précédent : ne jamais ignorer le clic.
                    // Le + avance directement vers le panorama suivant dans l'ordre visible.
                    // La galerie de choix reste disponible par les autres commandes de navigation.
                    guidedForward(v.sceneId===active.id?v.yaw:(active.arrivalYaw??0),
                      v.sceneId===active.id?v.pitch:(active.arrivalPitch??0));
                  }}>
                  <span aria-hidden="true">+</span>
                </button>}
            </div>}
          {creationFullscreen&&mediaPickerEl()}
          {creationFullscreen&&<div className="nv-fs-topbar" ref={fsToolsRef}>
            {modeSwitch(true)}
            <button type="button" className="nv-fs-exit" onClick={()=>void toggleCreationFullscreen()} aria-label="Quitter le plein écran" title="Revenir à l’écran classique"><Minimize2 size={20}/></button>
            {toolsCurtain(true)}
          </div>}
          {active&&!preview&&<button type="button"
            className={'nv-panorama-settings-toggle'+(creationFullscreen?' is-fullscreen':'')}
            aria-label="Réglages du panorama" title="Réglages du panorama : vue d’arrivée, nom, jour/nuit et musique"
            aria-expanded={creationFullscreen?fullscreenToolsOpen&&fullscreenToolsTab==='scene':!rightHidden&&panel==='points'&&!selectedId}
            aria-controls={creationFullscreen?'nv-fullscreen-tools':'nv-panorama-inspector'}
            onClick={togglePanoramaSettings}>
            <Menu size={20}/><span>Réglages</span>
          </button>}
          {creationFullscreen&&<small className="nv-build-stamp" title="Date et heure de compilation de cette version">Build {new Date(__NV_BUILD_TIME__).toLocaleString('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</small>}
          {nightTexture&&<div className="nv-daynight-switch" role="group" aria-label="Mode jour et nuit">
            <button type="button" className={!nightActive?'is-active':''} aria-pressed={!nightActive} onClick={()=>setNightSceneId(null)}>☀ <span>Jour</span></button>
            <button type="button" className={nightActive?'is-active':''} aria-pressed={nightActive} onClick={()=>setNightSceneId(activeId)}>☾ <span>Nuit</span></button>
          </div>}
          {active && creationFullscreen && !fullscreenToolsOpen && <button type="button" className={'nv-command-drawer-handle'+(fullscreenCommandDrawerOpen?' is-open':'')}
            onClick={()=>{setFullscreenCommandDrawerOpen(open=>!open);setFullscreenToolsOpen(false);setFullscreenGalleryOpen(false);setHoveredGallerySceneId(null);}}
            aria-expanded={fullscreenCommandDrawerOpen} aria-controls="nv-fullscreen-command-drawer"
            aria-label={fullscreenCommandDrawerOpen?'Masquer les commandes':'Afficher les commandes'}>
            <PanelRightClose size={19}/> <span>{fullscreenCommandDrawerOpen?'Masquer':'Commandes'}</span>
          </button>}
          {active && creationFullscreen && fullscreenCommandDrawerOpen && !fullscreenToolsOpen && <div id="nv-fullscreen-command-drawer" className="nv-command-drawer" aria-label="Commandes de création">
            <div className="nv-command-drawer-heading"><strong>{fullscreenGalleryOpen?'Galerie':'Commandes'}</strong><button type="button" onClick={()=>setFullscreenCommandDrawerOpen(false)} aria-label="Fermer le tiroir"><XMark/></button></div>
            {fullscreenGalleryOpen?null:<><div className="nv-creation-fullscreen-controls" role="toolbar" aria-label="Commandes du plein écran de création">
            <span className="nv-fullscreen-scene-name" title={active.name}>{active.name}</span>
            <button type="button" className={'nv-fullscreen-gallery-toggle'+(fullscreenGalleryOpen?' is-active':'')}
              aria-expanded={fullscreenGalleryOpen} aria-controls="nv-fullscreen-gallery"
              onClick={()=>{setDestinationEditId(null);setFullscreenSelectedDestinationId(null);setFullscreenGalleryOpen(true);setHoveredGallerySceneId(null);setMode(null);setFullscreenToolsOpen(false);}}
              title="Choisir un panorama dans la galerie">
              <Images size={16}/> Galerie <span className="nv-fullscreen-gallery-count">{visibleScenes.length}</span>
            </button>
            {!preview&&<button type="button"
              className={'nv-fullscreen-auto'+(autoNavigation?' is-active':'')}
              aria-pressed={autoNavigation}
              title={autoNavigation?'Terminer le parcours Auto':'Lancer la création automatique panorama par panorama'}
              onClick={()=>{
                toggleAutoNavigation();
                setFullscreenCommandDrawerOpen(false);
                setFullscreenGalleryOpen(false);
                setFullscreenToolsOpen(false);
              }}>
              ↪ {autoNavigation?'Terminer Auto':'Auto'}
            </button>}
            <button type="button" className={!preview?'nv-fullscreen-mode is-active':'nv-fullscreen-mode'}
              onClick={()=>{setPreview(false);setIntroVisible(false);}} title="Retoucher les éléments 360°">
              <Edit3 size={16}/> Éditer
            </button>
            <button type="button" className={preview?'nv-fullscreen-mode is-active':'nv-fullscreen-mode'}
              onClick={()=>{setPreview(true);setMode(null);setSelectedId('');setIntroVisible(false);}}
              title="Voir la création sans poignées d'édition">
              <Eye size={16}/> Voir
            </button>
            <button type="button" className="nv-fullscreen-save" onClick={()=>void manualSave()}
              disabled={!ready||savingManually||!!lock} title="Enregistrer la visite sans quitter le plein écran">
              <Save size={16}/> {savingManually?'Sauvegarde…':'Enregistrer'}
            </button>
            {!preview&&<button type="button" className={'nv-fullscreen-tools-toggle'+(fullscreenToolsOpen?' is-active':'')}
              title="Ouvrir les réglages, la bibliothèque d’icônes et la barre du bas"
              aria-expanded={fullscreenToolsOpen} aria-controls="nv-fullscreen-tools"
              onClick={()=>{setFullscreenToolsOpen(v=>!v);setFullscreenCommandDrawerOpen(false);setFullscreenGalleryOpen(false);}}>
              <PanelRightClose size={16}/> Outils
            </button>}
            <button type="button" className="nv-creation-fullscreen-exit"
              onClick={()=>void toggleCreationFullscreen()} title="Revenir à NovaVisio Studio" aria-label="Quitter le plein écran de création">
              <Minimize2 size={17}/> Quitter
            </button>
          </div>
            {!preview&&<div className="nv-creation-fullscreen-palette" role="toolbar" aria-label="Ajouter des éléments dans la création">
              {([
                ['navigation','➜ Navigation'],['information','ⓘ Information'],['lien','↗ Lien'],
                ['image','▣ Photo'],['video','▶ Vidéo']
              ] as const).map(([type,label])=>(
                <button key={type} type="button" className={'nv-fullscreen-tool'+(mode===type?' is-active':'')}
                  onClick={()=>{setMode(mode===type?null:type);setSelectedId('');setFullscreenCommandDrawerOpen(false);}}
                  title={'Ajouter : '+label}>{label}</button>
              ))}
              {mode&&<button type="button" className="nv-fullscreen-tool nv-fullscreen-cancel" onClick={()=>setMode(null)}>Annuler</button>}
            </div>}</>}
            {fullscreenGalleryOpen&&<section id="nv-fullscreen-gallery" className="nv-drawer-gallery" aria-label="Galerie des panoramas">
            <header className="nv-fullscreen-gallery-header">
              <div><small>{currentSpace?.name??project.name}</small><strong>Galerie des panoramas</strong></div>
              <button type="button" className="nv-gallery-back" onClick={()=>{setFullscreenGalleryOpen(false);setHoveredGallerySceneId(null);setFullscreenSelectedDestinationId(null);}}
                aria-label="Retour au menu des commandes">← Retour</button>
            </header>
            <div className="nv-fullscreen-gallery-nav">
              <button type="button" onClick={()=>stepFullscreenScene(-1)} title="Panorama précédent">
                <ChevronLeft size={16}/> Précédent
              </button>
              <button type="button" onClick={()=>stepFullscreenScene(1)} title="Panorama suivant">
                Suivant <ChevronRight size={16}/>
              </button>
            </div>

            <div className="nv-quick-link-mode" hidden>
              <button type="button" className={quickLinkMode?'is-active':''} aria-pressed={quickLinkMode} onClick={()=>setQuickLinkMode(v=>!v)}>
                ➜ {quickLinkMode?'Création de flèches activée':'Activer création de flèches'}
              </button>
              <small>{quickLinkMode?'Choisis une destination, vise avec la croix, puis valide. Les icônes du projet seront utilisées.':'Choisis un panorama pour l’ouvrir sans créer de flèche.'}</small>
            </div>
            <div className="nv-gallery-layout-choice" role="group" aria-label="Affichage des panoramas"><button type="button" className={fullscreenGalleryLayout==='grid'?'is-active':''} onClick={()=>setFullscreenGalleryLayout('grid')}>▦ Grille</button><button type="button" className={fullscreenGalleryLayout==='list'?'is-active':''} onClick={()=>setFullscreenGalleryLayout('list')}>☷ Liste</button></div>
            <div className={'nv-fullscreen-gallery-list nv-gallery-layout-'+fullscreenGalleryLayout}>
              {visibleScenes.map((scene,index)=><button type="button" key={scene.id}
                className={'nv-fullscreen-gallery-scene'+(scene.id===activeId?' is-active':'')+(scene.id===fullscreenSelectedDestinationId?' is-selected-destination':'')}
                onMouseEnter={()=>scheduleGalleryHover(scene.id)}
                onMouseLeave={()=>dismissGalleryHover()}
                onFocus={()=>scheduleGalleryHover(scene.id)}
                onBlur={()=>dismissGalleryHover()}
                onClick={()=>{if(scene.id!==activeId){setFullscreenSelectedDestinationId(scene.id);setHoveredGallerySceneId(scene.id);}}}
                aria-pressed={scene.id===fullscreenSelectedDestinationId}
                aria-current={scene.id===activeId?'true':undefined}>
                {sceneThumbs[scene.id]?<img alt="" draggable={false} src={sceneThumbs[scene.id]} decoding="async"/>:
                  <span className="nv-fullscreen-gallery-placeholder">◎</span>}{todoPin(scene.id)}
                <span className="nv-fullscreen-gallery-scene-details">
                  <strong>{scene.name}</strong>
                  <small>Panorama {index+1}{scene.id===activeId?' · En cours':''}</small>
                  {scene.id===fullscreenSelectedDestinationId?<em>✓ Destination sélectionnée</em>:scene.id!==activeId?<em>⊕ Orienter la destination</em>:null}
                  {scene.arrivalYaw!==undefined&&<em>✓ Vue d'arrivée définie</em>}
                </span>
              </button>)}
            </div>
            <footer className="nv-fullscreen-gallery-footer">
              {visibleScenes.length} panorama{visibleScenes.length>1?'s':''} dans cet espace
            </footer>
            </section>}
            {!fullscreenGalleryOpen&&<div className="nv-drawer-arrival-action">
              <button type="button" className="nv-arrival-aim-toggle" onClick={()=>{setShowArrivalCrosshair(v=>!v);setFullscreenCommandDrawerOpen(false);}} aria-pressed={showArrivalCrosshair}>⊕ {showArrivalCrosshair?'Masquer le viseur':'Afficher le viseur'}</button>
              <button type="button" className="nv-drawer-arrival-save" onClick={()=>{saveArrivalView();setShowArrivalCrosshair(false);}}
                title="Définir l'orientation et le zoom d'arrivée de ce panorama">
                <Eye size={17}/> Définir la vue actuelle
              </button>
              {active.arrivalYaw!==undefined?
                <small className="nv-drawer-arrival-current">✓ Vue définie · {Math.round(active.arrivalYaw*180/Math.PI)}° · zoom {Math.round(active.arrivalZoom??60)} %</small>:
                <small className="nv-drawer-arrival-current">Oriente la vue et règle le zoom avant de cliquer.</small>}
              <small className="nv-drawer-arrival-note">Vue d'arrivée par défaut depuis la galerie et les flèches sans vue spécifique. Enregistre ensuite le projet avec la disquette.</small>
            </div>}

          </div>}
          {active&&creationFullscreen&&!preview&&fullscreenToolsOpen&&
            <aside id="nv-fullscreen-tools" className="nv-fullscreen-tools-panel" aria-label="Réglages en plein écran">
              <div className="nv-fullscreen-tools-head">
                <div><small>NOVAVISIO STUDIO</small><strong>Réglages rapides</strong></div>
                <button type="button" aria-label="Fermer les réglages" onClick={()=>setFullscreenToolsOpen(false)}><XMark/></button>
              </div>
              <div className="nv-fullscreen-tools-tabs" role="tablist">
                <button type="button" className={fullscreenToolsTab==='point'?'is-active':''}
                  onClick={()=>setFullscreenToolsTab('point')}>Points</button>
                <button type="button" className={fullscreenToolsTab==='bar'?'is-active':''}
                  onClick={()=>setFullscreenToolsTab('bar')}>Barre</button>
                <button type="button" className={fullscreenToolsTab==='scene'?'is-active':''}
                  onClick={()=>setFullscreenToolsTab('scene')}>Scène</button>
              </div>
              <div className="nv-fullscreen-tools-body">
                {fullscreenToolsTab==='point'&&<>
                  <div className="nv-quick-section-title">Points de ce panorama</div>
                  <div className="nv-quick-point-list">
                    {active.hotspots.map(h=><button type="button" key={h.id}
                      className={selectedId===h.id?'is-active':''}
                      onClick={()=>selectPointForEditing(h.id)}>
                      <span>{h.type==='navigation'?'➜':h.type==='image'?'▣':h.type==='video'?'▶':h.type==='lien'?'↗':'ⓘ'}</span>
                      <strong>{h.title||'Sans titre'}</strong>
                    </button>)}
                    {!active.hotspots.length&&<p className="nv-quick-hint">Ajoute un élément depuis la barre supérieure, puis clique dans le panorama.</p>}
                  </div>
                  {selected?<div className="nv-quick-fields">
                    {navigationEditor()}
                    <label>Nom du point
                      <input value={selected.title} onChange={e=>patchPoint({title:e.target.value})}/>
                    </label>
                    {selected.type==='navigation'&&<>
                      <label>Aller vers</label>
                      <button type="button" className="nv-quick-destination-picker" aria-expanded={navigationPickerOpen}
                        aria-controls="nv-navigation-gallery-picker"
                        onClick={()=>{setNavigationPickerOpen(v=>!v);setNavigationPickerHover(null);setNavigationPickerPreviewId(null);setFullscreenCommandDrawerOpen(false);setFullscreenGalleryOpen(false);}}>
                        <Images size={16}/>
                        <span>{project.scenes.find(sc=>sc.id===selected.target)?.name??'Choisir un panorama dans la galerie'}</span>
                        <ChevronRight size={16}/>
                      </button>
                      <small className="nv-quick-hint">Sélectionne la destination dans la galerie visuelle à gauche. La scène en cours reste ouverte.</small>
                      <button type="button" className="tool" disabled={!selected.target||!visibleIds.has(selected.target)}
                        onClick={()=>{if(active&&selected.target)goThroughArrow(selected,active.id);}}>
                        ➜ Tester la navigation
                      </button>
                      <button type="button" className="nv-quick-primary" disabled={!selected.target||!visibleIds.has(selected.target)}
                        onClick={()=>reverseNavigation(selected)}>
                        ↩ {project.scenes.find(sc=>sc.id===selected.target)?.hotspots.some(h=>h.type==='navigation'&&h.target===activeId)
                          ?'Ouvrir le retour existant':'Créer le retour (facultatif)'}
                      </button>
                      <small className="nv-quick-hint">Aucun retour n’est créé automatiquement. Clique ici uniquement si tu souhaites ajouter un retour.</small>
                    </>}
                    {(selected.type==='lien'||selected.type==='information')&&<>
                      <label>Adresse / lien
                        <input type="url" placeholder="https://…" value={selected.url??''} onChange={e=>patchPoint({url:e.target.value})}/>
                      </label>
                      <button type="button" className="import" onClick={()=>setInformationEdit({sceneId:activeId,pointId:selected.id})}>Rédiger le texte et choisir la police</button>
                  <label>Texte affiché
                        <textarea rows={3} value={selected.text} onChange={e=>patchPoint({text:e.target.value})}/>
                      </label>
                    </>}
                    {selected.type==='information'&&<>
                      <button type="button" onClick={()=>setInformationEdit({sceneId:activeId,pointId:selected.id})}>Rédiger l’information</button>
                      <label className="nv-quick-upload">▣ {selected.imageDataUrl?'Remplacer la photo du popup':'Importer une photo pour popup'}
                        <input type="file" accept="image/*,.heic,.heif"
                          onChange={e=>{void addFrameImage(e.target.files?.[0]);e.currentTarget.value='';}}/>
                      </label>
                      {selected.imageDataUrl&&<>
                        <PhotoFramePicker value={selected.imageFrameStyle} onChange={imageFrameStyle=>patchPoint({imageFrameStyle})}/>
                        <img className="photo-preview-uploaded" src={selected.imageDataUrl} alt="Photo du popup"/>
                        <label className="nv-quick-check"><input type="checkbox" checked={selected.fadeOnClick!==false}
                          onChange={e=>patchPoint({fadeOnClick:e.target.checked})}/> Animation de fondu au clic</label>
                        <button type="button" className="nv-quick-primary" onClick={()=>{setZoomFrom(null);setImageZoom(selected);}}>
                          <Eye size={15}/> Tester le popup photo
                        </button>
                        <button type="button" className="tool" onClick={()=>patchPoint({imageDataUrl:undefined})}>Retirer la photo</button>
                      </>}
                      <p className="nv-quick-hint">Dans la visite classique, un clic sur l’icône Information ouvre cette photo en grand.</p>
                    </>}
                    {selected.type==='image'&&<>
                      <MediaDisplayControl hotspot={selected} onChange={patchPoint}/>
                {frameLoupe(selected)}
                {isPopupMedia(selected)&&popupIconSettings(selected,selected.type)}
                {isPopupMedia(selected)&&iconSizeControl()}
                {isPopupMedia(selected)&&applyAllButton()}
                      <PhotoFramePicker value={selected.imageFrameStyle} onChange={imageFrameStyle=>patchPoint({imageFrameStyle})}/>
                      <label className="nv-quick-upload">▣ {selected.imageDataUrl?'Remplacer la photo':'Ajouter une photo'}
                        <input type="file" accept="image/*,.heic,.heif"
                          onChange={e=>{void addFrameImage(e.target.files?.[0]);e.currentTarget.value='';}}/>
                      </label>
                      <label className="nv-quick-check"><input type="checkbox" checked={selected.fadeOnClick!==false}
                        onChange={e=>patchPoint({fadeOnClick:e.target.checked})}/> Agrandir en fondu au clic</label>
                      {!isPopupMedia(selected)&&<label className="nv-quick-check"><input type="checkbox" checked={selected.imageBounce!==false}
                        onChange={e=>patchPoint({imageBounce:e.target.checked})}/> Rebond de cette image en aperçu</label>}
                      {(selected.imageDataUrl||selected.imageUrl)&&<button type="button" className="nv-quick-primary"
                        onClick={()=>{setZoomFrom(null);setImageZoom(selected);}}>
                        <Eye size={15}/> Tester le popup photo
                      </button>}
                      {!isPopupMedia(selected)&&<p className="nv-quick-hint">Déplace les quatre petites poignées sur le panorama pour adapter la photo.</p>}
                    </>}
                    {selected.type==='video'&&<>
                      <MediaDisplayControl hotspot={selected} onChange={patchPoint}/>
                {frameLoupe(selected)}
                {isPopupMedia(selected)&&popupIconSettings(selected,selected.type)}
                {isPopupMedia(selected)&&iconSizeControl()}
                {isPopupMedia(selected)&&applyAllButton()}
                      <label>URL de la vidéo
                        <input type="url" placeholder="https://…/video.mp4" value={selected.videoUrl??''}
                          onChange={e=>patchPoint({videoUrl:e.target.value,videoDataUrl:undefined})}/>
                      </label>
                      <label className="nv-quick-upload">▶ Importer une vidéo
                        <input type="file" accept="video/mp4,video/webm" onChange={e=>{
                          void addVideo(e.target.files?.[0]);e.currentTarget.value='';
                        }}/>
                      </label>
                      {!isPopupMedia(selected)&&<label className="nv-quick-check"><input type="checkbox" checked={selected.videoAutoplay!==false}
                        onChange={e=>patchPoint({videoAutoplay:e.target.checked})}/> Lecture automatique</label>}
                      <label className="nv-quick-check"><input type="checkbox" checked={selected.videoLoop!==false}
                        onChange={e=>patchPoint({videoLoop:e.target.checked})}/> Boucle</label>
                      {!isPopupMedia(selected)&&<label className="nv-quick-check"><input type="checkbox" checked={selected.videoOpenFullscreen!==false}
                        onChange={e=>patchPoint({videoOpenFullscreen:e.target.checked})}/> Agrandir au clic</label>}
                      <label className="nv-quick-check"><input type="checkbox" checked={selected.videoMasterSound!==false} onChange={e=>patchPoint({videoMasterSound:e.target.checked})}/> 🔊 Son de la télé prioritaire (la musique s'efface)</label>
                      {!isPopupMedia(selected)&&<label className="nv-quick-check">Signal de clic
                        <select value={selected.frameHalo===false?'none':(selected.frameSignalStyle??'gold')} onChange={e=>patchPoint({frameSignalStyle:e.target.value as 'gold'|'soft'|'pulse'|'none',frameHalo:e.target.value!=='none'})}>
                          <option value="gold">Contour doré fin</option>
                          <option value="soft">Halo discret</option>
                          <option value="pulse">Pulsation légère</option>
                          <option value="none">Aucun</option>
                        </select>
                      </label>}
                    </>}
                    {selected.type!=='image'&&selected.type!=='video'&&<>
                      {generalLibraryBlock({sceneId:activeId,pointId:selected.id},'à ce point')}
                      {fullscreenIconSetPicker(
                        {...selected,size:selected.iconSize??28},
                        set=>patchPoint({iconId:set.iconId,hoverIconId:set.hoverIconId,
                          pressedIconId:set.pressedIconId,iconSize:set.size})
                      )}
                    </>}
                    <details className="nv-quick-icon-advanced">
                      <summary>Personnaliser les PNG séparément</summary>
                    {(['iconId','hoverIconId','pressedIconId'] as const).map((field,index)=>
                      <div key={field} className="nv-quick-icon-field">
                        <strong>{['Normale','Survol','Clic'][index]}</strong>
                        <div className="nv-quick-icon-grid">
                          <button type="button" className={!selected[field]?'is-active':''}
                            title="Icône par défaut" onClick={()=>patchPoint({[field]:undefined})}>◎</button>
                          {project.icons.map(icon=><button type="button" key={icon.id}
                            className={selected[field]===icon.id?'is-active':''}
                            title={icon.name} onClick={()=>patchPoint({[field]:icon.id})}>
                            <img src={icon.dataUrl} alt={icon.name}/>
                          </button>)}
                        </div>
                        <label className="nv-quick-upload-small">＋ Importer un PNG
                          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif"
                            onChange={e=>{void uploadFullscreenIcon(e.target.files?.[0],field);e.currentTarget.value='';}}/>
                        </label>
                      </div>)}
                    </details>
                    <label>Taille de l’icône : {selected.iconSize??28} px
                      <input type="range" min="16" max="80" value={selected.iconSize??28}
                        onChange={e=>patchPoint({iconSize:Number(e.target.value)})}/>
                    </label>
                    <button type="button" className="nv-quick-delete" onClick={async ()=>{
                      if(!await confirmAsk('Supprimer ce point ?'))return;
                      patchScene(sc=>({...sc,hotspots:sc.hotspots.filter(h=>h.id!==selectedId)}));
                      setSelectedId('');
                    }}><Trash2 size={14}/> Supprimer ce point</button>
                  </div>:<p className="nv-quick-hint">Sélectionne un point dans la liste ou clique sur son icône dans le panorama pour modifier ses paramètres et ses PNG.</p>}
                  <div className="nv-fullscreen-gallery-arrival nv-quick-arrival">
                    <div className="nv-fullscreen-gallery-arrival-text">
                      <strong>Vue d’arrivée du panorama</strong>
                      <span>Oriente la caméra et règle le zoom, puis enregistre cette vue. Elle sera utilisée en arrivant ici depuis la galerie, une navigation normale ou l'export.</span>
                    </div>
                    <button type="button" onClick={saveArrivalView}>
                      <Eye size={15}/> Enregistrer la vue actuelle
                    </button>
                    {active.arrivalYaw!==undefined &&
                      <small className="nv-fullscreen-gallery-arrival-saved">
                        ✓ Vue définie · orientation {Math.round(active.arrivalYaw*180/Math.PI)}° · zoom {Math.round(active.arrivalZoom??60)} %
                      </small>}
                  </div>
                </>}
                {fullscreenToolsTab==='bar'&&<>
                  <div className="nv-quick-section-title">Boutons de la barre</div>
                  <div className="nv-quick-point-list">
                    {project.bottomBar.map(item=><button type="button" key={item.id}
                      className={selectedBarId===item.id?'is-active':''}
                      onClick={()=>{setSelectedBarId(item.id);setSelectedId('');setMode(null);}}>
                      <span>{project.icons.find(i=>i.id===item.iconId)?
                        <img src={project.icons.find(i=>i.id===item.iconId)!.dataUrl} alt=""/>:'◉'}</span>
                      <strong>{item.title}</strong>
                    </button>)}
                  </div>
                  {selectedBar&&<div className="nv-quick-fields">
                    <label>Libellé
                      <input value={selectedBar.title} onChange={e=>patchBar(selectedBar.type==='gallery'&&selectedBar.galleryTitle?{title:e.target.value,galleryTitle:undefined}:{title:e.target.value})}/>
                    </label>
                    {selectedBar.type==='navigation'&&<label>Panorama de destination
                      <select value={selectedBar.target} onChange={e=>patchBar({target:e.target.value})}>
                        <option value="">Sélectionner…</option>
                        {visibleScenes.map(sc=><option key={sc.id} value={sc.id}>{sc.name}</option>)}
                      </select>
                    </label>}
                    {(selectedBar.type==='lien'||selectedBar.type==='information')&&<label>Lien
                      <input value={selectedBar.url??''} placeholder="https://…" onChange={e=>patchBar({url:e.target.value})}/>
                    </label>}
                    {generalLibraryBlock({barId:selectedBar.id},'à ce bouton')}
                    {fullscreenIconSetPicker(
                      {...selectedBar,size:barIconSize(selectedBar)},
                      set=>patchBar({iconId:set.iconId,hoverIconId:set.hoverIconId,
                        pressedIconId:set.pressedIconId,iconSize:set.size,useCustomIcon:true})
                    )}
                    <details className="nv-quick-icon-advanced">
                      <summary>Personnaliser les PNG séparément</summary>
                    {(['iconId','hoverIconId','pressedIconId'] as const).map((field,index)=><div key={field} className="nv-quick-icon-field">
                      <strong>{['PNG normal','PNG survol','PNG clic'][index]}</strong>
                      <div className="nv-quick-icon-grid">
                        <button type="button" className={!selectedBar[field]?'is-active':''}
                          onClick={()=>patchBar({[field]:undefined})}>◎</button>
                        {project.icons.map(icon=><button type="button" key={icon.id} title={icon.name}
                          className={selectedBar[field]===icon.id?'is-active':''}
                          onClick={()=>patchBar({[field]:icon.id})}><img src={icon.dataUrl} alt={icon.name}/></button>)}
                      </div>
                      <label className="nv-quick-upload-small">＋ Importer un PNG
                        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif"
                          onChange={e=>{void uploadFullscreenIcon(e.target.files?.[0],field);e.currentTarget.value='';}}/>
                      </label>
                    </div>)}
                    </details>
                    <label>Taille du bouton : {barIconSize(selectedBar)} px
                      <input type="range" min="20" max="72" value={barIconSize(selectedBar)}
                        onChange={e=>patchBar({iconSize:Number(e.target.value)})}/>
                    </label>
                  </div>}
                  <InspectorSection title="Dimensions de la barre"><><BarDimensions style={project.barStyle} onChange={changeBarStyle} size={project.bottomBar.length?Math.max(...project.bottomBar.map(barIconSize)):48} onSize={size=>setProject(p=>withBarSize(p,size))}/><label className="toggle-row"><input type="checkbox" checked={project.barIconTrim!==false} onChange={e=>setProject(p=>({...p,barIconTrim:e.target.checked}))}/> Remplir les boutons : rogner les marges transparentes des icônes (toutes à la même taille)</label></></InspectorSection>
                  <div className="nv-quick-section-title">Apparence de la barre</div>
                  <div className="nv-quick-colors">
                    {([
                      ['background','Fond'],
                      ['outline','Contour'],
                      ['button','Boutons'],
                      ['icon','Pictogrammes']
                    ] as const).map(([key,label])=><label key={key}>{label}
                      <input type="color" value={project.barStyle[key]} onChange={e=>changeBarStyle({[key]:e.target.value})}/>
                    </label>)}
                  </div>
                </>}
                {fullscreenToolsTab==='scene'&&<div className="nv-quick-fields">
                  <div className="nv-name-row"><label className="nv-name-main">Nom du panorama
                    <input value={active.name} onChange={e=>patchScene(sc=>({...sc,name:e.target.value}))}/>
                  </label>
                  <label className="nv-surface-field">Superficie de la pièce (m²)
                    <input type="number" min="0.01" max="100000" step="0.01" placeholder="Ex. 24,5"
                      value={active.surfaceM2??''}
                      onChange={e=>{const v=e.target.value,n=v===''?undefined:Number(v);if(n===undefined||(Number.isFinite(n)&&n>0&&n<=100000))patchScene(sc=>({...sc,surfaceM2:n}));}}/>
                  </label>
                  </div>
                  <SceneRoomNameOptions scene={active} onChange={v=>patchScene(sc=>({...sc,...v}))}/>
                  {nightSceneControls(active)}
                  <button type="button" className="nv-quick-primary" onClick={saveArrivalView}>
                    <Eye size={15}/> Définir cette vue comme arrivée
                  </button>
                  <p className="nv-quick-hint">Oriente et zoome comme tu le souhaites, puis enregistre cette vue. Les orientations propres aux flèches restent prioritaires.</p>
                  <button type="button" className="nv-quick-primary" onClick={()=>{setFullscreenToolsOpen(false);setFullscreenCommandDrawerOpen(true);setFullscreenGalleryOpen(true);}}>
                    <Images size={15}/> Choisir un autre panorama
                  </button>
                </div>}
              </div>
              <div className="nv-fullscreen-tools-foot">
                <button type="button" onClick={()=>{setFullscreenToolsOpen(false);}}>
                  <Eye size={14}/> Retour au panorama
                </button>
              </div>
            </aside>}
          {active&&creationFullscreen&&!preview&&fullscreenToolsOpen&&navigationPickerOpen&&selected?.type==='navigation'&&
            <aside id="nv-navigation-gallery-picker" className={"nv-navigation-gallery-picker"+(navigationPickerPreviewId?" is-preview":"")} aria-label="Choisir le panorama de destination">
              <header className="nv-navigation-gallery-header">
                <div><small>SÉLECTION DE DESTINATION</small><strong>Galerie des panoramas</strong></div>
                <button type="button" aria-label="Fermer la galerie de sélection" onClick={()=>{setNavigationPickerOpen(false);setNavigationPickerHover(null);setNavigationPickerPreviewId(null);}}><XMark/></button>
              </header>
              <p className="nv-navigation-gallery-tip">Clique sur un panorama pour l’examiner en 360°, puis confirme sa destination.</p>
              {navigationPickerPreviewId&&<div className="nv-navigation-inspect">
                <button type="button" className="nv-navigation-inspect-back" onClick={()=>{setNavigationPickerPreviewId(null);setNavigationPickerHover(null);}}>
                  <ChevronLeft size={16}/> Liste des panoramas
                </button>
                {visibleScenes.filter(sc=>sc.id===navigationPickerPreviewId).map(sc=><div key={sc.id} className="nv-navigation-inspect-scene">
                  <strong>{sc.name}</strong>
                  <div className="nv-navigation-inspect-360"><FullscreenGalleryHoverPreview scene={sc} thumb={sceneThumbs[sc.id]} onOrientation={view=>{galleryOrientationRef.current[sc.id]=view;}}/></div>
                  <small>Fais glisser l’image pour regarder autour avant de choisir.</small>
                  <button type="button" className="nv-navigation-inspect-select" onClick={()=>setNavigationDestination(sc.id)}>
                    <Images size={16}/> Utiliser {sc.name} comme destination
                  </button>
                </div>)}
              </div>}
              {!navigationPickerPreviewId&&<input className="nv-navigation-gallery-search" type="search" value={navigationPickerSearch}
                onChange={e=>setNavigationPickerSearch(e.target.value)} placeholder="Rechercher un panorama…" aria-label="Rechercher un panorama"/>}
              {!navigationPickerPreviewId&&<div className="nv-navigation-gallery-list">
                {visibleScenes.filter(sc=>sc.id!==activeId&&sc.name.toLocaleLowerCase('fr').includes(navigationPickerSearch.toLocaleLowerCase('fr'))).map(sc=>
                  <button type="button" key={sc.id} title={'Choisir '+sc.name}
                    className={'nv-fullscreen-gallery-scene'+(sc.id===selected.target?' is-active':'')}
                    onMouseEnter={()=>setNavigationPickerHover(sc.id)}
                    onMouseLeave={()=>setNavigationPickerHover(null)}
                    onFocus={()=>setNavigationPickerHover(sc.id)}
                    onClick={()=>{setNavigationPickerPreviewId(sc.id);setNavigationPickerHover(null);}}>
                    {sceneThumbs[sc.id]?<img src={sceneThumbs[sc.id]} draggable={false} alt=""/>:<span className="nv-fullscreen-gallery-placeholder">◎</span>}{todoPin(sc.id)}
                    <span className="nv-fullscreen-gallery-scene-details">
                      <strong>{sc.name}</strong><small>{sc.id===selected.target?'✓ Destination sélectionnée':'Choisir cette destination'}</small>
                    </span><ChevronRight size={15}/>
                  </button>)}
              </div>}
              <footer><button type="button" onClick={()=>{setNavigationPickerOpen(false);setNavigationPickerHover(null);setNavigationPickerPreviewId(null);}}>
                <ChevronLeft size={15}/> Retour aux réglages
              </button></footer>
            </aside>}
          {active&&creationFullscreen&&!preview&&fullscreenToolsOpen&&navigationPickerOpen&&!navigationPickerPreviewId&&navigationPickerHover&&
            visibleScenes.some(sc=>sc.id===navigationPickerHover)&&
            <aside className="nv-navigation-gallery-preview" aria-label="Aperçu du panorama avant sélection"
              onMouseEnter={()=>{}} onMouseLeave={()=>setNavigationPickerHover(null)}>
              {visibleScenes.filter(sc=>sc.id===navigationPickerHover).map(sc=><div key={sc.id} className="nv-hover-preview-content">
                <div className="nv-hover-preview-title"><div><small>APERÇU 360°</small><strong>{sc.name}</strong></div>
                  <button type="button" onClick={()=>setNavigationDestination(sc.id)}>Choisir cette destination <ChevronRight size={15}/></button>
                </div>
                <FullscreenGalleryHoverPreview scene={sc} thumb={sceneThumbs[sc.id]}/>
              </div>)}
            </aside>}
          {active&&creationFullscreen&&fullscreenCommandDrawerOpen&&fullscreenGalleryOpen&&
            (fullscreenSelectedDestinationId||hoveredGallerySceneId)&&
            visibleScenes.some(scene=>scene.id===(fullscreenSelectedDestinationId||hoveredGallerySceneId))&&
            <aside className="nv-fullscreen-gallery-hover-preview nv-drawer-gallery-hover-preview nv-pinned-destination-preview"
              aria-label="Aperçu de la destination avec viseur"
              onMouseEnter={()=>{if(galleryHoverTimer.current)clearTimeout(galleryHoverTimer.current);}}
              onMouseLeave={()=>{if(!fullscreenSelectedDestinationId)dismissGalleryHover(100);}}>
              {visibleScenes.filter(scene=>scene.id===(fullscreenSelectedDestinationId||hoveredGallerySceneId)).map(scene=>
                <div className="nv-hover-preview-content" key={scene.id}>
                  <div className="nv-hover-preview-title">
                    <div><small>ORIENTATION DE DESTINATION</small><strong title={scene.name}>{scene.name}</strong></div>
                  </div>
                  <div className="nv-targeted-preview nv-fullscreen-destination-viewer">
                    <FullscreenGalleryHoverPreview scene={scene} thumb={sceneThumbs[scene.id]}
                      onOrientation={view=>{galleryOrientationRef.current[scene.id]=view;}}/>
                    <div className="nv-target-center" aria-hidden="true"><span/><span/><i/></div>
                  </div>
                  <button type="button" className="nv-fullscreen-validate-destination"
                    disabled={scene.id===activeId}
                    onClick={()=>validateFullscreenDestination(scene.id)}>✓ Valider la destination</button>
                  <div className="nv-hover-preview-foot">
                    <span>Oriente la vue sur la cible, puis valide pour continuer</span>
                    <span>{visibleScenes.findIndex(sc=>sc.id===scene.id)+1} / {visibleScenes.length}</span>
                  </div>
                </div>)}
            </aside>}
          {active && !preview && mode && (
            <div className="mode-active-pill">
              <span className="mode-active-dot" />
              <span>Cliquez dans le 360° pour placer : <strong>{mode==='navigation'?'Point Navigation':mode==='information'?'Point Information':mode==='lien'?'Lien web':mode==='image'?'Photo':clientVideoPlacement?.name??'Vidéo'}</strong></span>
              <button type="button" className="nv-cancel-placement" onClick={()=>setMode(null)}>✕ Annuler la pose (Échap)</button>
            </div>
          )}
          {/* BARRE DU BAS CONSERVÉE INTACTE */}
          {active && !autoNavigation && project.bottomBar.length>0 && <nav className="visitor-bottom-bar" data-hsort={!preview?'':undefined} aria-label="Barre interactive de la visite" style={barCss}>
            {project.bottomBar.map(item=>{
              const icon=barUsesIconImage(project.barStyle,item)&&project.icons.find(i=>i.id===item.iconId);
              const isUnavailable=preview && item.type==='lien' && !safeLink(item.url);
              return <div key={item.id} data-hsort-id={!preview?item.id:undefined} className={liveBarSort.drag===item.id?'nv-live-bar-dragging':undefined}><div className="nv-bar-sort-item">{!preview&&project.bottomBar.length>1&&liveBarSort.grip(item.id,item.title)}<button type="button" style={{'--nv-bar-btn':barIconSize(item)+'px'} as CSSProperties} className={'visitor-bar-button '+(icon?'has-custom-png ':'')+(selectedBarId===item.id&&!preview?'is-selected':'')} onClick={()=>triggerBar(item)} disabled={isUnavailable} title={isUnavailable?'Lien à configurer':item.title} aria-label={item.title}>
                <span className="visitor-bar-icon">{icon?<IconStateVisual icons={project.icons} normal={item.iconId} hover={item.hoverIconId} pressed={item.pressedIconId} size={barIconSize(item)} zoom={(item.iconZoom??100)/100} trim={project.barIconTrim!==false}/>:<BarGlyph name={item.builtinIcon??'info'}/>}</span>
                <span className="visitor-bar-label">{pick(item.title,item.titleTranslations,visitorLang)}</span>
              </button></div></div>;
            })}
          </nav>}
          {introVisible && project.introEnabled && project.introUrl && <div className={"intro-overlay"+(introEnding?" is-ending":"")}>
            <iframe title="Introduction de la visite" src={project.introUrl} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" referrerPolicy="strict-origin-when-cross-origin"/>
          </div>}
          {videoZoom && <VideoPopup hotspot={videoZoom} animation={videoZoom.openAnimation??project.windowAnimation} origin={zoomFrom} onClose={()=>setVideoZoom(null)}/>}
          {active&&!introVisible&&<div className="nv-visitor-settings">
            <button type="button" style={settingsButtonBarStyle(project,barTheme)} className={'nv-visitor-settings-btn'+(settingsIconSrc?' has-custom-png':'')} aria-label={ui('settings',visitorLang)} aria-expanded={preview?settingsOpen:undefined} title={preview?'Paramètres : plan, son et langue':'Modifier le bouton Paramètres'} onClick={()=>{if(preview){setSettingsOpen(o=>!o);return;}editSettingsButton();}}>{settingsIconSrc?<IconStateVisual icons={project.icons} normal={project.settingsIconId??project.settingsHoverIconId??project.settingsPressedIconId} hover={project.settingsHoverIconId} pressed={project.settingsPressedIconId} size={settingsSize(project)}/>:<SettingsIcon size={Math.round(settingsSize(project)*0.42)}/>}</button>
            {preview&&settingsOpen&&<div className="nv-visitor-settings-panel" role="dialog" aria-label="Paramètres">
              <strong>{ui('sound',visitorLang)}</strong>
              <div className="nv-vs-row">
                <button type="button" className={visitorPrefs.sound==='on'?'is-on':''} onClick={()=>setSound('on')}>🔊 {ui('soundOn',visitorLang)}</button>
                <button type="button" className={visitorPrefs.sound==='off'?'is-on':''} onClick={()=>setSound('off')}>🔇 {ui('soundOff',visitorLang)}</button>
              </div>
              {activeLanguages.length>1&&<><strong>{ui('language',visitorLang)}</strong>
              <div className="nv-vs-row nv-vs-flags">{STUDIO_LANGUAGES.filter(l=>activeLanguages.includes(l.code)).map(l=>
                <button type="button" key={l.code} title={l.name} aria-label={l.name} aria-pressed={effectiveLang(visitorPrefs,activeLanguages)===l.code} className={effectiveLang(visitorPrefs,activeLanguages)===l.code?'is-on':''} onClick={()=>setLang(l.code)}>{l.flag}</button>)}</div></>}
            </div>}
          </div>}
          {active && <ContinuousMusic project={project} scene={active} paused={!preview||(!!videoZoom&&videoZoom.videoMasterSound!==false)||introVisible} showToggle={false}/>}
          {preview&&floorPlanOpen&&<FloorPlanDialog lang={visitorLang} shortcuts={project.planShortcuts?project.bottomBar.filter(b=>b.type!=='plan').map(b=>({id:b.id,label:pick(b.title,b.titleTranslations,visitorLang),icon:project.icons.find(i=>i.id===b.iconId)?.dataUrl})):undefined} onShortcut={id=>{const item=project.bottomBar.find(b=>b.id===id);if(item){setFloorPlanOpen(false);triggerBar(item);}}} plans={plansInSpace(project,currentSpace)} scenes={visibleScenes} currentId={active?.id} onClose={()=>setFloorPlanOpen(false)} onPick={id=>{selectScene(id);setFloorPlanOpen(false);}} thumbs={sceneThumbs}/>}
          {preview&&photoGalleryId&&(()=>{
            const item=project.bottomBar.find(b=>b.id===photoGalleryId&&b.type==='photos');
            return item?<PhotoGallery title={item.title||'Photos'} items={item.photos??[]} onClose={()=>setPhotoGalleryId(null)}/>:null;
          })()}
          {preview&&galleryOpen&&(()=>{
            const item=project.bottomBar.find(b=>b.id===galleryOpen&&b.type==='gallery');
            if(!item)return null;
            return <PanoramaGallery title={item.galleryTitle||item.title||'Panoramas'} currentId={active?.id} background={galleryBackgroundSrc(item,project.scenes,project.spaces,sceneThumbs)}
              entries={galleryEntries(item,preview?visibleScenes.filter(sc=>!sc.excluded):visibleScenes,project.spaces).map(e=>({sceneId:e.sceneId,spaceId:e.spaceId,label:e.label,thumb:e.coverDataUrl??sceneThumbs[e.sceneId]}))}
              onPick={(id,spaceId)=>{if(spaceId){selectSpace(spaceId);setPreview(true);}else selectScene(id);setGalleryOpen(null);}} renderPreview={id=>{const sc=project.scenes.find(x=>x.id===id);return sc?<FullscreenGalleryHoverPreview scene={sc} thumb={sceneThumbs[sc.id]}/>:null;}} viewSource={id=>{const sc=project.scenes.find(x=>x.id===id);return sc?{dataUrl:sc.dataUrl,yaw:sc.arrivalYaw,pitch:sc.arrivalPitch}:undefined;}} onClose={()=>setGalleryOpen(null)}/>;
          })()}
          {(imageZoom?.imageDataUrl||imageZoom?.imageUrl) && <ZoomImage variant="studio" animation={imageZoom.openAnimation??project.windowAnimation} frameStyle={imageZoom.imageFrameStyle} src={(imageZoom.imageDataUrl||imageZoom.imageUrl)!} alt={imageZoom.title} origin={zoomFrom} animate={imageZoom.fadeOnClick!==false} onClose={()=>setImageZoom(null)}/>}
          {frame && <div className="embed-overlay" {...overlayClose(()=>setFrame(null))} role="presentation">
            <section className={'embed-shell'+(frame.full?' is-full':'')} aria-label={'Contenu intégré : '+frame.title} onClick={event=>event.stopPropagation()}>
              <div className="embed-header">
                <span className="embed-title">{frame.title}</span>
                <div className="embed-actions">
                  <button type="button" onClick={()=>setFrame(null)} aria-label="Fermer le contenu intégré"><XMark/></button>
                </div>
              </div>
              <EmbeddedPage url={frame.url} title={frame.title}/>
            </section>
          </div>}
          {windowDemo && <div className="overlay info-in-view" onClick={()=>setWindowDemo(false)}><div className="modal" onClick={e=>e.stopPropagation()}><h2>Test de l’animation</h2><p>Cette fenêtre s’ouvre avec le style et la durée choisis.</p><button className="primary" onClick={()=>setWindowDemo(false)}>Fermer</button></div></div>}
          {info && <div className={'overlay info-in-view'+(project.bottomBar.some(b=>b.id===info.id)?' is-full':'')} onClick={()=>setInfo(null)}>
            <div className="modal" onClick={event=>event.stopPropagation()}>
              <button className="close" onClick={()=>setInfo(null)} aria-label={ui('close',infoLanguage)}><XMark/></button>
              <h2>{pick(info.title,info.titleTranslations,infoLanguage)}</h2>
              <div className="nv-info-languages" role="group" aria-label="Langue de l'information">
                {STUDIO_LANGUAGES.filter(lang=>activeLanguages.includes(lang.code)).map(lang=><button type="button" key={lang.code} title={lang.name} aria-label={lang.name} aria-pressed={infoLanguage===lang.code} className={infoLanguage===lang.code?'is-active':''} onClick={()=>setInfoLanguage(lang.code)}>{lang.flag}</button>)}
              </div><p className="preserve" style={{fontFamily:informationFont(info.fontFamily)+', Arial, sans-serif'}}>{(infoLanguage==='fr'?info.text:info.translations?.[infoLanguage]||info.text)||'Aucune information renseignée.'}</p>
              <button className="primary" onClick={()=>setInfo(null)}>{ui('close',infoLanguage)}</button>
            </div>
          </div>}
        </div>
        {active && !preview && <CreationToolbar selected={mode??(panel==='bar'?'bar':null)} auto={autoNavigation} onAuto={toggleAutoNavigation}
          onSettings={tool=>{
            if(tool==='bar'){setPanel('bar');setMode(null);setSelectedId('');setRightHidden(false);return;}
            setToolSettings(tool);setPanel('tool');setSelectedId('');setRightHidden(false);
          }}
          onTool={tool=>{
            if(autoNavigation)stopAutoNavigation();
            if(tool==='bar'){setPanel('bar');setMode(null);setSelectedId('');setRightHidden(false);}
            else setMode(current=>current===tool?null:tool);
          }}/>}

      </main>
      <aside id="nv-panorama-inspector" className="right panel">
        <div className="nv-inspector-resize" onPointerDown={startInspectorResize} onDoubleClick={()=>setInspectorWidth(inspectorVw<58?66:40)} role="separator" aria-orientation="vertical" aria-label="Glisser pour élargir ou réduire la colonne (double-clic : agrandir / normal)" title="Glisser pour élargir · double-clic : agrandir / normal"><i/></div>
        <div className="nv-inspector-top">{(()=>{const back=inspectorBack();return back?<button type="button" className="nv-inspector-back" onClick={back} aria-label="Retour à l’écran précédent" title="Retour"><ChevronLeft size={20}/><span>Retour</span></button>:null;})()}{active&&panel==='points'&&!selected&&<strong className="nv-panorama-settings-title">Réglages du panorama</strong>}<button type="button" onClick={()=>{setRightHidden(true);backFrom();}} aria-label="Fermer les réglages" title="Fermer"><X size={20}/></button></div>
        {currentSpace&&<><SpaceCover name={currentSpace.name} value={currentSpace.coverDataUrl} onChange={coverDataUrl=>setProject(p=>({...p,spaces:p.spaces?.map(space=>space.id===currentSpace.id?{...space,coverDataUrl}:space)}))}/><SpaceRoomNameOptions space={currentSpace} onChange={v=>setProject(p=>({...p,spaces:p.spaces?.map(space=>space.id===currentSpace.id?{...space,...v}:space)}))}/></>}
        {panel==='client'&&<div className="properties nv-right-client-panel">{clientView}</div>}
        {panel==='panoramas'&&<div className="properties nv-right-panorama-gallery">
        <div className="nv-gallery-heading">
          <div className="section-title"><span>PANORAMAS</span><span className="counter">{visibleScenes.length}</span></div>
          <div className="nv-gallery-heading-actions"><div className="nv-gallery-layout-choice" role="group" aria-label="Affichage des panoramas">
            <button type="button" className={panoramasLayout==='grid'?'is-active':''} onClick={()=>setPanoramasLayout('grid')}>▦</button>
            <button type="button" className={panoramasLayout==='list'?'is-active':''} onClick={()=>setPanoramasLayout('list')}>☷</button>
          </div><button type="button" className="nv-gallery-reset" onClick={()=>setGalleryVerticalOffset(0)} title="Remonter les panoramas en haut">↑ Remonter</button></div>
        </div>
        {currentSpace&&<div className="nv-space-sidebar-context">
          <strong>{currentSpace.name}</strong>
          <small>Les originaux restent dans « Projet complet ».</small>
          <button type="button" className="primary" onClick={()=>{spacePanoramasTarget.current=currentSpace.id;spacePanoramasInput.current?.click();}}>⬆ Importer plusieurs panoramas 360° (40 Mo chacun)</button>
          <button type="button" onClick={()=>setSpaceManagerOpen(true)}>＋ / − Choisir les panoramas existants</button>
        </div>}
        {!preview&&false&&<div className="nv-quick-link-mode nv-sidebar-quick-link">
          <button type="button" className={quickLinkMode?'is-active':''} aria-pressed={quickLinkMode}
            onClick={()=>setQuickLinkMode(v=>!v)}>
            ➜ {quickLinkMode?'Flèche automatique : activée':'Flèche automatique : désactivée'}
          </button>
          <small>{quickLinkMode?'Choisis une destination, oriente la cible, puis valide la flèche avec les icônes du projet.':'Clique sur un panorama pour l’ouvrir sans créer de flèche.'}</small>
        </div>}
        <button className="import nv-pano-import-dropzone" onClick={()=>upload.current?.click()}
          onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add('drag-hover');}}
          onDragLeave={e=>{e.currentTarget.classList.remove('drag-hover');}}
          onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove('drag-hover');addImages(e.dataTransfer.files);}}>
          <Plus size={15} style={{marginRight:6,verticalAlign:'-2px'}}/> Importer ou glisser des panoramas 360°
        </button>
        <div className="nv-scene-discovery">
          <label className="nv-scene-search">
            <Search size={16} aria-hidden="true"/>
            <input type="search" value={sceneSearch} aria-label="Rechercher un panorama"
              placeholder="Rechercher une scène…" onChange={event=>setSceneSearch(event.target.value)}/>
          </label>
          <select className="nv-scene-filter" aria-label="Filtrer les panoramas"
            value={sceneFilter} onChange={event=>setSceneFilter(event.target.value as SceneFilter)}>
            <option value="all">Toutes</option>
            <option value="with">Avec points</option>
            <option value="without">Sans points</option>
          </select>
        </div>
        <div className="nv-gallery-position" style={{marginTop:galleryVerticalOffset}}>
          <button type="button" className="nv-gallery-drag-handle" aria-label="Abaisser ou remonter la liste des panoramas" title="Glisser vers le bas ou le haut pour déplacer la liste"
            onPointerDown={beginGalleryVerticalDrag} onPointerMove={moveGalleryVerticalDrag} onPointerUp={endGalleryVerticalDrag} onPointerCancel={endGalleryVerticalDrag}>
            <span className="nv-gallery-drag-lines" aria-hidden="true">⠿</span> Déplacer la liste <span className="nv-gallery-drag-direction" aria-hidden="true">↕</span>
          </button>
        </div>
        {!preview&&<div className="nv-panorama-manage-actions" role="group" aria-label="Gestion des panoramas du projet">
          <button type="button" className="primary" onClick={()=>{spacePanoramasTarget.current=currentSpace?.id??null;if(currentSpace)spacePanoramasInput.current?.click();else upload.current?.click();}}>＋ Importer des panoramas</button>
          <span className="hint">Sélection multiple possible · suppression par panorama ci-dessous</span>
        </div>}
        <div className="nv-scene-bulk" role="group" aria-label="Panoramas dans la visite">
          <span>✓ {visibleScenes.filter(sc=>!sc.excluded).length} / {visibleScenes.length} dans {currentSpace?'cet espace':'la visite'}</span>
          <button type="button" onClick={()=>setProject(p=>({...p,scenes:p.scenes.map(sc=>(!currentSpace||currentSpace.sceneIds.includes(sc.id))&&sc.excluded?{...sc,excluded:undefined}:sc)}))}>Tout cocher</button>
          <button type="button" onClick={()=>setProject(p=>({...p,scenes:p.scenes.map(sc=>((!currentSpace||currentSpace.sceneIds.includes(sc.id))&&sc.id!==(currentSpace?.sceneIds[0]??p.scenes[0]?.id)&&!sc.excluded)?{...sc,excluded:true}:sc)}))} title="Décoche tout sauf le premier panorama de cet espace">Tout décocher</button>
        </div>
        <div className={'scenes nv-panorama-list-'+panoramasLayout} ref={scenesRef}>{filteredScenes.map((s,i)=><div key={s.id} className={'scene-slot'+(s.excluded?' is-excluded':'')}
          onMouseEnter={()=>{if(autoNavigation)hoverSidePreview(s.id);}} onMouseLeave={leaveSidePreview}
           onPointerDown={e=>{if(sceneSortEnabled)startSceneDrag(e,i);}}
          onClickCapture={e=>{if(suppressClick.current){e.preventDefault();e.stopPropagation();}}}>
          <button className={'scene '+(s.id===activeId?'active':'')+(s.id===pickedSceneId||s.id===panoModalId?' is-picked':'')} title={(preview?'Ouvrir ':'Prévisualiser et renommer ')+s.name}
            onKeyDown={e=>{
              if(!sceneSortEnabled||!e.altKey||(e.key!=='ArrowUp'&&e.key!=='ArrowDown'&&e.key!=='ArrowLeft'&&e.key!=='ArrowRight'))return;
              e.preventDefault();
              moveScene(s.id,(e.key==='ArrowUp'||e.key==='ArrowLeft')?i-1:i+2);
            }}
            onClick={()=>{
              setPickedSceneId(s.id);
              // Hors mode Auto : un clic ouvre une fenêtre pour tourner dans le panorama à 360° avant de décider (ouvrir ou supprimer).
              if(!preview){setPanoModalId(s.id);return;}
              selectScene(s.id);
              if(!autoNavigation){returnTo.current=null;setRightHidden(true);} // on va simplement au panorama choisi
              setMode(autoNavigation&&!preview?'navigation':null);
              setGalleryPreviewSceneId(null);
              setGalleryPreviewPinned(false);
              setClassicDestinationOpen(false);
              setNavigationDraft(null);
              setDestinationEditId(null);
              setStatus('Panorama '+s.name+' ouvert dans la grande vue.');
            }}>
            {sceneThumbs[s.id]?<img src={sceneThumbs[s.id]} alt="Miniature du panorama" draggable={false} decoding="async"/>:<span className="scene-thumb-ph" aria-hidden="true"/>}{todoPin(s.id)}
            <span className="nv-scene-description">
              <strong title={s.name}>{s.name}</strong>
              <small>Scène {visibleScenes.findIndex(scene=>scene.id===s.id)+1}
                {s.id===visibleScenes[0]?.id?' · Accueil':''} · {s.hotspots.length} point{s.hotspots.length>1?'s':''}</small>
            </span>
          </button>
          <button type="button" className={'nv-scene-include'+(s.excluded?'':' is-on')} role="checkbox" aria-checked={!s.excluded}
            title={s.excluded?'Panorama décoché : absent de la visite. Clique pour le remettre.':'Dans la visite. Décoche pour le retirer de la visite sans le supprimer.'}
            onPointerDown={e=>e.stopPropagation()}
            onClick={e=>{e.stopPropagation();setProject(p=>({...p,scenes:p.scenes.map(sc=>sc.id===s.id?{...sc,excluded:sc.excluded?undefined:true}:sc)}));}}>
            {s.excluded?'':'✓'}</button>
          {!preview&&<button type="button" className="nv-scene-360-preview-btn" title={'Prévisualiser '+s.name+' en 360°'}
            onClick={()=>setPanoModalId(s.id)}>360°</button>}
          {!preview&&project.scenes.length>1&&<button type="button" className="nv-scene-delete-project" title={'Supprimer définitivement '+s.name+' du projet (confirmation requise)'} aria-label={'Supprimer '+s.name+' du projet'} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();deleteScene(s.id);}}>✕</button>}
          {currentSpace?<button type="button" className="nv-space-exclude" title={'Retirer '+s.name+' de cet espace uniquement'}
             aria-label={'Retirer '+s.name+' de cet espace'}
             onClick={()=>removeSceneFromSpace(currentSpace.id,s.id)}><XMark/></button>:
            <span className="scene-grip" aria-hidden="true" title="Glisse pour changer l’ordre">⋮⋮</span>}
        </div>)}
        {currentSpace&&!visibleScenes.length&&<div className="nv-space-empty-list">
          <p>Aucun panorama dans cet espace.</p>
          <button type="button" onClick={()=>setSpaceManagerOpen(true)}>Choisir des panoramas</button>
        </div>}
        {visibleScenes.length>0&&!filteredScenes.length&&<div className="nv-space-empty-list">
          <p>Aucun panorama ne correspond à la recherche.</p>
          <button type="button" onClick={()=>{setSceneSearch('');setSceneFilter('all');}}>Effacer les filtres</button>
        </div>}</div>
        {galleryPreviewSceneId&&visibleScenes.some(sc=>sc.id===galleryPreviewSceneId)&&<div className="nv-side-panorama-preview nv-side-panorama-popup" onMouseEnter={()=>{if(sidePreviewTimer.current)clearTimeout(sidePreviewTimer.current);}} onMouseLeave={leaveSidePreview}>
          <div className="nv-side-preview-title"><strong>Aperçu 360°</strong>
            <button type="button" onClick={()=>{setGalleryPreviewSceneId(null);setGalleryPreviewPinned(false);}} aria-label="Fermer l'aperçu"><XMark/></button></div>
          {visibleScenes.filter(sc=>sc.id===galleryPreviewSceneId).map(sc=><div key={sc.id} className="nv-side-preview-content">
            <strong>{sc.name}</strong>
            <div className="nv-side-preview-viewer nv-targeted-preview"><FullscreenGalleryHoverPreview scene={sc} thumb={sceneThumbs[sc.id]} onOrientation={view=>{galleryOrientationRef.current[sc.id]=view;}}/>{autoNavigation&&!preview&&<div className="nv-target-center" aria-hidden="true"><span/><span/><i/></div>}</div>
            {autoNavigation&&!preview&&sc.id!==activeId?<button type="button" className="nv-quick-create-arrow" onClick={()=>createNavigationFromGallery(sc.id)}>✓ Valider la direction</button>:<button type="button" onClick={()=>{selectScene(sc.id);setGalleryPreviewSceneId(null);setGalleryPreviewPinned(false);setPanel('points');}}>Ouvrir le panorama</button>}
          </div>)}
        </div>}
        <div className="helper nv-gallery-help" hidden>
          <strong>✦ Guide rapide</strong>
          <p>Clique sur un point dans le 360° pour modifier directement ses propriétés à droite.</p>
          <button className="help" onClick={()=>setHelp(true)}>Guide de démarrage →</button>
        </div>
        </div>}
        {panel==='points' && <div className="properties">
          {!active?<div className="hint">Importe un panorama pour commencer à créer.</div>:selected ? (
            /* ============================================================== */
            /* DIRECT ELEMENT INSPECTOR (QUAND UN ÉLÉMENT DU 360° EST CLIQUÉ) */
            /* ============================================================== */
            <div id="nv-selected-point" className="element-inspector">
              <div className="element-inspector-header">
                <div className="element-inspector-badge">
                  <span className="badge-glyph">
                    {selected.type==='navigation'?'➜':selected.type==='lien'?'↗':selected.type==='image'?'▣':selected.type==='video'?'▶':'ⓘ'}
                  </span>
                  <div>
                    <strong>{selected.type==='navigation'?'Navigation':selected.type==='lien'?'Lien web':selected.type==='image'?'Photo':selected.type==='video'?'Vidéo':'Information'}</strong>
                    <small>Paramètres de l’élément sélectionné</small>
                  </div>
                </div>
                <button type="button" className="element-close-btn" onClick={()=>setSelectedId('')} title="Désélectionner et revenir aux paramètres de la scène">
                  ← Vue d’ensemble
                </button>
              </div>

              {navigationEditor()}
              {active.hotspots.length > 1 && (
                <div className="point-quick-switcher">
                  <label>Passer à un autre point :
                    <select value={selectedId} onChange={e=>selectPointForEditing(e.target.value)}>
                      {active.hotspots.map((h, idx) => (
                        <option key={h.id} value={h.id}>
                          {idx + 1}. {h.type==='navigation'?'➜ ':h.type==='lien'?'↗ ':h.type==='image'?'▣ ':h.type==='video'?'▶ ':'ⓘ '}
                          {h.title || 'Point sans titre'}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              <div className="field-group">
                <label>Titre / Libellé
                  <input value={selected.title} placeholder="Nom du point..." onChange={e=>patchPoint({title:e.target.value})}/>
                  <label>Animation à l’ouverture<select value={selected.openAnimation??''} onChange={e=>patchPoint({openAnimation:e.target.value?e.target.value as WindowAnimation:undefined})}><option value="">Comme le réglage général</option>{WINDOW_ANIMATIONS.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select></label>
                  <button type="button" className="nv-test-anim" onClick={()=>{document.documentElement.dataset.windowAnim=selected.openAnimation??project.windowAnimation??'fade';setWindowDemo(false);window.setTimeout(()=>setWindowDemo(true),30);}}>▶ Tester l’animation</button>
                </label>
              </div>

              {selected.type==='image' ? <>
                <MediaDisplayControl hotspot={selected} onChange={patchPoint}/>
                {frameLoupe(selected)}
                {isPopupMedia(selected)&&popupIconSettings(selected,selected.type)}
                {isPopupMedia(selected)&&iconSizeControl()}
                {isPopupMedia(selected)&&applyAllButton()}
                <PhotoFramePicker value={selected.imageFrameStyle} onChange={imageFrameStyle=>patchPoint({imageFrameStyle})}/>
                <button type="button" className="import" onClick={()=>{setPanel('medialib');setRightHidden(false);}}>📚 Choisir dans ma bibliothèque Photos & Vidéos (Drive, kDrive…)</button>
                <button type="button" className="import" onClick={()=>{setMediaPicker({sceneId:activeId,hotspotId:selectedId,type:'image',fresh:false});}}>🖼 Choisir une photo déjà utilisée</button>
                <label className="photo-upload-dropzone" onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add('drag-hover');}}
                  onDragLeave={e=>{e.currentTarget.classList.remove('drag-hover');}}
                  onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove('drag-hover');void addFrameImage(e.dataTransfer.files[0]);}}>
                  <span className="photo-upload-icon">＋</span>
                  <strong>{selected.imageDataUrl?'Changer la photo du cadre':'Choisir une photo'}</strong>
                  <span>Cliquer ici ou déposer une photo dans ce cadre</span>
                  <input type="file" accept="image/*,.heic,.heif" onChange={e=>{const file=e.currentTarget.files?.[0];if(file)void addFrameImage(file);e.currentTarget.value='';}}/>
                </label>
                <small className="hint-inline">JPG, PNG, WebP (HEIC selon navigateur) · 40 Mo max</small>
                {photoFeedback&&<div role="status" className="photo-feedback">{photoFeedback}</div>}
                {selected.imageDataUrl&&<img className="photo-preview-uploaded" src={selected.imageDataUrl} alt="Photo intégrée au cadre"/>}
                {!isPopupMedia(selected)&&<>
                {selected.imageDataUrl && <p className="hint">💡 Cadrage : déplace directement les quatre poignées turquoise sur le cadre photo dans le 360° pour suivre la perspective.</p>}
                <label>Largeur : {selected.frameWidth??320} px
                  <input type="range" min="80" max="900" step="10" value={selected.frameWidth??320} onChange={e=>patchPoint({frameWidth:Number(e.target.value)})}/>
                </label>
                <label>Hauteur : {selected.frameHeight??200} px
                  <input type="range" min="60" max="700" step="10" value={selected.frameHeight??200} onChange={e=>patchPoint({frameHeight:Number(e.target.value)})}/>
                </label>
                </>}
                <label className="toggle-row"><input type="checkbox" checked={selected.fadeOnClick??true} onChange={e=>patchPoint({fadeOnClick:e.target.checked})}/> Agrandir en fondu au clic</label>
                {!isPopupMedia(selected)&&<label className="toggle-row"><input type="checkbox" checked={selected.imageBounce!==false} onChange={e=>patchPoint({imageBounce:e.target.checked})}/> Rebond de cette image en aperçu</label>}
                {(selected.imageDataUrl||selected.imageUrl)&&<button type="button" className="tool" onClick={()=>{setZoomFrom(null);setImageZoom(selected);}}>
                  <Eye size={15}/> Tester le popup photo
                </button>}
                {!isPopupMedia(selected)&&<button className="style-reset" type="button" onClick={()=>patchPoint({frameCorners:defaultFrameCorners(),frameSphericalCorners:undefined})}>Réinitialiser les 4 coins</button>}
              </> : selected.type==='video' ? <>
                <MediaDisplayControl hotspot={selected} onChange={patchPoint}/>
                {frameLoupe(selected)}
                {isPopupMedia(selected)&&popupIconSettings(selected,selected.type)}
                {isPopupMedia(selected)&&iconSizeControl()}
                {isPopupMedia(selected)&&applyAllButton()}
                <button type="button" className="import" onClick={()=>{setPanel('medialib');setRightHidden(false);}}>📚 Choisir dans ma bibliothèque Photos & Vidéos (Drive, kDrive…)</button>
                <button type="button" className="import" onClick={()=>{setMediaPicker({sceneId:activeId,hotspotId:selectedId,type:'video',fresh:false});}}>🎞 Choisir une vidéo déjà utilisée</button>
                <button type="button" className="import" onClick={()=>videoInput.current?.click()}>{selected.videoDataUrl?'Remplacer la vidéo':'＋ Importer une vidéo MP4 / WebM'}</button>
                <small className="hint-inline">45 Mo max en local, ou renseigne une URL HTTPS directe :</small>
                <label>Ou URL HTTPS de la vidéo
                  <input type="url" placeholder="https://…/video.mp4" value={selected.videoUrl??''} onChange={e=>patchPoint({videoUrl:e.target.value,videoDataUrl:undefined})}/>
                </label>
                {selected.videoUrl && !isSafeMediaUrl(selected.videoUrl)&&<small className="warning-inline">Adresse HTTPS invalide.</small>}
                {(selected.type==='video'||selected.videoDataUrl||selected.videoUrl)&&<label className="nv-volume-field">Volume du son : <b>{selected.videoVolume??100} %</b>
                  <input type="range" min={0} max={100} step={5} value={selected.videoVolume??100} onChange={e=>patchPoint({videoVolume:Number(e.target.value)})}/>
                  <small className="hint-inline">{isPopupMedia(selected)?'Appliqué à la vidéo quand le visiteur ouvre la fenêtre (0 % = sans son).':'En incrustation dans le panorama, la vidéo démarre sans son (blocage des navigateurs) : le volume s’applique à l’ouverture en fenêtre.'}</small></label>}
                {(selected.videoDataUrl||selected.videoUrl)&&<video className="editor-video-preview" src={selected.videoDataUrl||selected.videoUrl} controls muted playsInline/>}
                {!isPopupMedia(selected)&&<>
                <div className="section-title">ADAPTER L'ÉCRAN À LA PERSPECTIVE</div>
                
                <label>Largeur : {selected.frameWidth??320} px
                  <input type="range" min="80" max="900" step="10" value={selected.frameWidth??320} onChange={e=>patchPoint({frameWidth:Number(e.target.value)})}/>
                </label>
                <label>Hauteur : {selected.frameHeight??200} px
                  <input type="range" min="60" max="700" step="10" value={selected.frameHeight??200} onChange={e=>patchPoint({frameHeight:Number(e.target.value)})}/>
                </label>
                </>}
                {!isPopupMedia(selected)&&<label className="toggle-row"><input type="checkbox" checked={selected.videoAutoplay!==false} onChange={e=>patchPoint({videoAutoplay:e.target.checked})}/> Démarrer automatiquement (muet)</label>}
                <label className="toggle-row"><input type="checkbox" checked={selected.videoLoop!==false} onChange={e=>patchPoint({videoLoop:e.target.checked})}/> Répéter la vidéo en boucle</label>
                {!isPopupMedia(selected)&&<label className="toggle-row"><input type="checkbox" checked={selected.videoOpenFullscreen!==false} onChange={e=>patchPoint({videoOpenFullscreen:e.target.checked})}/> Agrandir au clic avec le son</label>}
                <label className="toggle-row"><input type="checkbox" checked={selected.videoMasterSound!==false} onChange={e=>patchPoint({videoMasterSound:e.target.checked})}/> 🔊 Son de la télé prioritaire : la musique de fond s’efface en fondu pendant la vidéo agrandie, puis revient vite à son niveau</label>
                {!isPopupMedia(selected)&&<label className="toggle-row">Signal visuel de la vidéo / image
                  <select value={selected.frameHalo===false?'none':(selected.frameSignalStyle??'gold')} onChange={e=>patchPoint({frameSignalStyle:e.target.value as 'gold'|'soft'|'pulse'|'none',frameHalo:e.target.value!=='none'})}>
                    <option value="gold">Fin contour doré (conseillé)</option>
                    <option value="soft">Halo très discret</option>
                    <option value="pulse">Légère pulsation</option>
                    <option value="none">Aucun effet</option>
                  </select>
                </label>}
                {!isPopupMedia(selected)&&<button className="style-reset" type="button" onClick={()=>patchPoint({frameCorners:defaultFrameCorners(),frameSphericalCorners:undefined})}>Réinitialiser les 4 coins</button>}
              </> : selected.type==='navigation' ? (
                <>
                {/* Destination, test, retour et vue d'arrivée : voir les tuiles d'action en haut du panneau */}
                <div className="arrival-view-card is-inspector nv-arrival-inline">
                  <div className="section-title">VUE D’ARRIVÉE · destination et orientation</div>
                  {(project.spaces??[]).length>0&&<label className="nv-arrival-dest">Type de destination
                    <select aria-label="Type de destination" value={selected.targetSpaceId?'space':'scene'}
                      onChange={e=>{if(e.target.value==='scene')setNavigationDestination(selected.target,undefined);else if(project.spaces?.[0])setNavigationSpace(project.spaces[0].id);}}>
                      <option value="scene">Panorama</option>
                      <option value="space">Espace existant</option>
                    </select>
                  </label>}
                  {selected.targetSpaceId&&<label className="nv-arrival-dest">Espace de destination
                    <select aria-label="Espace de destination" value={selected.targetSpaceId} onChange={e=>setNavigationSpace(e.target.value)}>
                      {(project.spaces??[]).filter(sp=>sp.sceneIds.some(id=>project.scenes.some(sc=>sc.id===id&&!sc.excluded))).map(sp=>
                        <option key={sp.id} value={sp.id}>{sp.name} · premier panorama : {project.scenes.find(sc=>sc.id===sp.sceneIds[0])?.name??'Non défini'}</option>)}
                    </select>
                  </label>}
                  {!selected.targetSpaceId&&<label className="nv-arrival-dest">Panorama de destination
                    <select aria-label="Panorama de destination" value={selected.target||''} onChange={e=>{if(e.target.value)setNavigationDestination(e.target.value);}}>
                      <option value="" disabled>Choisir un panorama…</option>
                      {[...visibleScenes].filter(sc=>sc.id!==activeId).sort((x,y)=>{const sg=suggestDestinations(activeId).map(g=>g.id);const rx=sg.indexOf(x.id),ry=sg.indexOf(y.id);return (rx<0?999:rx)-(ry<0?999:ry);}).map(sc=><option key={sc.id} value={sc.id}>{sc.name}</option>)}
                    </select>
                  </label>}
                  {(()=>{
                    const space=selected.targetSpaceId?(project.spaces??[]).find(sp=>sp.id===selected.targetSpaceId):null;
                    const resolvedId=space?space.sceneIds.find(id=>project.scenes.some(sc=>sc.id===id&&!sc.excluded)):selected.target;
                    const dest=project.scenes.find(sc=>sc.id===resolvedId);
                    if(!dest)return <small>Choisis d’abord le panorama de destination.</small>;
                    const view:Scene={...dest,arrivalYaw:selected.arrivalYaw??dest.arrivalYaw,arrivalPitch:selected.arrivalPitch??dest.arrivalPitch,arrivalZoom:selected.arrivalZoom??dest.arrivalZoom,arrivalZoomModel:selected.arrivalZoomModel??dest.arrivalZoomModel};
                    return <>
                      <div className="nv-arrival-view" key={selected.id+':'+dest.id+':'+(selected.arrivalYaw??'d')}>
                        <FullscreenGalleryHoverPreview scene={view} thumb={sceneThumbs[dest.id]} onOrientation={v=>{arrivalDraftRef.current={id:selected.id,...v};}}/>
                        <div className="nv-target-center" aria-hidden="true"><span/><span/><i/></div>
                      </div>
                      <small>Tourne et zoome le panorama « {dest.name} » : au centre de la cible, c’est la vue exacte qu’aura le visiteur en arrivant.</small>
                      <div className="nv-arrival-actions">
                        <button type="button" className="nv-arrival-save" onClick={()=>{const d=arrivalDraftRef.current;if(!d||d.id!==selected.id){setStatus('Bouge un peu le panorama pour définir la vue');return;}patchPoint({arrivalYaw:d.yaw,arrivalPitch:d.pitch,arrivalZoom:d.zoom,arrivalZoomModel:'wide',arrivalCustom:true});setStatus('Vue d’arrivée enregistrée · enregistre avec la disquette');}}>✓ Utiliser cette vue à l’arrivée</button>
                        {selected.arrivalYaw!==undefined&&<button type="button" onClick={()=>{patchPoint({arrivalYaw:undefined,arrivalPitch:undefined,arrivalZoom:undefined,arrivalCustom:undefined});setStatus('Vue d’arrivée de la flèche réinitialisée');}}>Réinitialiser</button>}
                      </div>
                      {selected.arrivalYaw!==undefined?<small className="arrival-saved">✓ Vue enregistrée · angle {Math.round(selected.arrivalYaw*180/Math.PI)}° · zoom {Math.round(selected.arrivalZoom??60)}%</small>:<small>Pas de vue propre : la vue par défaut du panorama de destination est utilisée.</small>}
                    </>;
                  })()}
                </div>
                </>
              ) : selected.type==='lien' ? (
                <><div className="nv-action-steps">1. Lien choisi → 2. Point placé → 3. Destination</div><label>Adresse (https://, tel:, mailto:)
                  <input type="text" placeholder="https://exemple.fr" value={selected.url??''} onChange={e=>patchPoint({url:e.target.value})}/>
                </label><label>Ouverture<select aria-label="Ouverture" value={selected.linkMode??'embed'} onChange={e=>patchPoint({linkMode:e.target.value as 'embed'|'tab'})}><option value="embed">Dans la visite (iframe prioritaire)</option><option value="tab">Nouvel onglet</option></select></label><button type="button" onClick={()=>selected.url&&openLinkInTour(selected.title,selected.url,selected.linkMode)}>Tester le lien</button></>
              ) : (
                <>
                  <button type="button" className="import" onClick={()=>setInformationEdit({sceneId:activeId,pointId:selected.id})}>Rédiger le texte et choisir la police</button>
                  <label>Texte affiché
                    <textarea rows={4} placeholder="Description ou informations..." value={selected.text} onChange={e=>patchPoint({text:e.target.value})}/>
                  </label>

                  <InspectorSection title="Contenus complémentaires : page web et photo">
                  <label>Page web intégrée (optionnel)
                    <input type="text" placeholder="https://… menu, réservations" value={selected.url??''} onChange={e=>patchPoint({url:e.target.value})}/>
                    <small className="hint-inline">Si renseignée, la page s'ouvre directement dans la visite à la place du texte.</small>
                  </label>
                  <button type="button" className="import" onClick={()=>{setMediaPicker({sceneId:activeId,hotspotId:selectedId,type:'image',fresh:false});}}>🖼 Choisir une photo déjà utilisée</button>
                <label className="photo-upload-dropzone" onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add('drag-hover');}}
                    onDragLeave={e=>e.currentTarget.classList.remove('drag-hover')}
                    onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove('drag-hover');void addFrameImage(e.dataTransfer.files[0]);}}>
                    <span className="photo-upload-icon">＋</span>
                    <strong>{selected.imageDataUrl?'Remplacer la photo du popup':'Importer une photo pour popup'}</strong>
                    <span>Cliquer ici ou déposer une photo · JPG, PNG, WebP</span>
                    <input type="file" accept="image/*,.heic,.heif" onChange={e=>{void addFrameImage(e.currentTarget.files?.[0]);e.currentTarget.value='';}}/>
                  </label>
                  {photoFeedback&&<div role="status" className="photo-feedback">{photoFeedback}</div>}
                  {selected.imageDataUrl&&<>
                    <PhotoFramePicker value={selected.imageFrameStyle} onChange={imageFrameStyle=>patchPoint({imageFrameStyle})}/>
                    <img className="photo-preview-uploaded" src={selected.imageDataUrl} alt="Photo du popup"/>
                    <label className="toggle-row"><input type="checkbox" checked={selected.fadeOnClick!==false} onChange={e=>patchPoint({fadeOnClick:e.target.checked})}/> Popup avec fondu au clic</label>
                    <button type="button" className="tool" onClick={()=>{setZoomFrom(null);setImageZoom(selected);}}><Eye size={15}/> Tester le popup photo</button>
                    <button type="button" className="style-reset" onClick={()=>patchPoint({imageDataUrl:undefined})}>Supprimer la photo du popup</button>
                  </>}
                  <small className="hint-inline">Si une photo est importée, elle s’ouvre au clic sur l’icône Information dans la visite classique, avant la page web ou le texte.</small>
                  </InspectorSection>
                </>
              )}

              {!['image','video'].includes(selected.type) && <InspectorSection title="Icône et apparence">
                <div className="section-title">ICÔNE DU POINT</div>
                {generalLibraryBlock({sceneId:activeId,pointId:selected.id},'à ce point')}
                {iconSetPicker({...selected,size:selected.iconSize??28},set=>patchPoint({iconId:set.iconId,hoverIconId:set.hoverIconId,pressedIconId:set.pressedIconId,iconSize:Math.max(16,Math.min(80,set.size))}))}
                {libraryPackPicker(selected.iconId,patch=>patchPoint(patch))}
                {iconStateEditor('pt-normal','Icône personnalisée',selected.iconId,id=>patchPoint({iconId:id}),'Icône par défaut')}
                {selected.iconId && <button type="button" className="style-reset" onClick={()=>requestReplaceIcon(selected.iconId!)}>Remplacer ce PNG partout</button>}
                {applyAllButton()}
                {iconStateEditor('pt-hover','PNG au survol (optionnel)',selected.hoverIconId,id=>patchPoint({hoverIconId:id}),'Identique au normal')}
                {iconStateEditor('pt-pressed','PNG au clic (optionnel)',selected.pressedIconId,id=>patchPoint({pressedIconId:id}),'Identique au survol')}
                <label>Taille de l'icône : {selected.iconSize??28} px
                  <input type="range" min="16" max="80" step="2" value={selected.iconSize??28} onChange={e=>patchPoint({iconSize:Number(e.target.value)})}/>
                </label>
              </InspectorSection>}

              <div className="coords-card">
                <span>Position 360° : {selected.yaw.toFixed(2)} / {selected.pitch.toFixed(2)} rad</span>
                <small>💡 Astuce : tu peux glisser ce point directement dans le panorama pour ajuster sa position.</small>
              </div>

              <button type="button" className="delete" onClick={()=>{patchScene(sc=>({...sc,hotspots:sc.hotspots.filter(h=>h.id!==selectedId)}));setSelectedId('');}}>
                <Trash2 size={13} style={{marginRight:6,verticalAlign:'-2px'}}/> Supprimer ce point
              </button>
            </div>
          ) : (
            /* ============================================================== */
            /* SCENE OVERVIEW (AUCUN POINT SÉLECTIONNÉ)                        */
            /* ============================================================== */
            <div className="scene-overview">
              <SectionHub id="scene" open={hubOpen.scene??null} onOpenChange={k=>setHubOpen(h=>({...h,scene:k}))}
                intro={currentSpace?<div className="nv-action-rectangles" style={{display:'flex',flexDirection:'column',gap:8}}>
                  <button type="button" className="primary" onClick={()=>{spacePanoramasTarget.current=currentSpace.id;spacePanoramasInput.current?.click();}}>⬆ Importer plusieurs panoramas 360° (40 Mo chacun)</button>
                  <button type="button" onClick={()=>setSpaceManagerOpen(true)}>▦ Modifier l’espace « {currentSpace.name} »</button>
                </div>:null}
                sections={[
                  {key:'name',title:'Nom du panorama',hint:active.name,icon:<Pencil size={26}/>,tone:'#4f7cff',content:<>
              <div className="nv-name-row"><label className="nv-name-main">Nom de la scène
                <input value={active.name} onChange={e=>patchScene(sc=>({...sc,name:e.target.value}))}/>
              </label>
                  <label className="nv-surface-field">Superficie de la pièce (m²)
                    <input type="number" min="0.01" max="100000" step="0.01" placeholder="Ex. 24,5"
                      value={active.surfaceM2??''}
                      onChange={e=>{const v=e.target.value,n=v===''?undefined:Number(v);if(n===undefined||(Number.isFinite(n)&&n>0&&n<=100000))patchScene(sc=>({...sc,surfaceM2:n}));}}/>
                  </label>
              </div>
              <SceneRoomNameOptions scene={active} onChange={v=>patchScene(sc=>({...sc,...v}))}/>
                  </>},
                  {key:'arrival',title:'Vue d’arrivée',hint:arrivalSaving?'Enregistrement…':active.arrivalYaw!==undefined?'✓ Définie · cliquer pour actualiser':'Enregistrer le cadrage actuel',icon:<Eye size={26}/>,tone:'#2fbf8f',disabled:arrivalSaving||savingManually||!!lock,onClick:()=>{void saveArrivalImmediately();},content:<>{arrivalTiles()}</>},
                  {key:'daynight',title:'Jour / nuit',hint:active.nightDataUrl||active.nightSourceSceneId?'✓ Configuré':'Non configuré',icon:<Moon size={26}/>,tone:'#7f8cff',content:nightSceneControls(active,true)},
                  {key:'sun',title:'Rayon de soleil',hint:active.sunFlare?'✓ Activé':'Désactivé',icon:<SunGlyph size={26}/>,tone:'#ffc53d',content:<SunFlareEditor value={active.sunFlare} defaultValue={project.sunFlareDefault} onChange={next=>patchScene(sc=>({...sc,sunFlare:next}))} onSaveDefault={()=>{if(!active.sunFlare){setStatus('Active d’abord le reflet sur ce panorama');return;}setProject(p=>({...p,sunFlareDefault:active.sunFlare}));setStatus('Réglage de soleil enregistré par défaut');}} onApplyAll={()=>{if(!active.sunFlare){setStatus('Active d’abord le reflet sur ce panorama');return;}const f=active.sunFlare;setProject(p=>({...p,sunFlareDefault:f,scenes:p.scenes.map(sc=>({...sc,sunFlare:f}))}));setStatus('Réglage de soleil appliqué à tous les panoramas');}}/>},
                  {key:'points',title:'Points interactifs',badge:active.hotspots.length,hint:'Flèches, infos, photos…',icon:<PinIcon size={26}/>,tone:'#ff8a3d',content:<>
              <div className="section-title">
                <span>POINTS INTERACTIFS</span>
                <span className="counter">{active.hotspots.length}</span>
              </div>

              {active.hotspots.length === 0 ? (
                <div className="empty-points-card">
                  <p>Aucun point interactif dans cette scène.</p>
                  <small>Clique sur un des outils sous le panorama (Navigation, Information, Lien, Cadre, Vidéo) puis clique dans le 360° pour en placer un.</small>
                </div>
              ) : (
                <div className="points-list">
                  <p className="hint-small">Clique sur un point ci-dessous ou directement dans le panorama 360° pour le modifier :</p>
                  {active.hotspots.map(h => (
                    <button key={h.id} type="button" className="point-item-btn" onClick={() => selectPointForEditing(h.id)}>
                      <span className="point-item-glyph">
                        {project.icons.find(i=>i.id===h.iconId)?<img className="point-icon-small" src={project.icons.find(i=>i.id===h.iconId)!.dataUrl} alt=""/>:h.type==='navigation'?'➜':h.type==='lien'?'↗':h.type==='image'?'▣':h.type==='video'?'▶':'ⓘ'}
                      </span>
                      <span className="point-item-info">
                        <strong>{h.title || '(Sans titre)'}</strong>
                        <small>{h.type==='navigation'?'Navigation':h.type==='lien'?'Lien web':h.type==='image'?'Photo':h.type==='video'?'Vidéo':'Information'}</small>
                      </span>
                      <ChevronRight size={14} className="point-item-arrow"/>
                    </button>
                  ))}
                </div>
              )}


                  </>},
                  {key:'transitions',title:'Transitions',hint:(project.transitionMs??200)===0?'Instantané':'Fondu '+(project.transitionMs??200)+' ms',icon:<Timer size={26}/>,tone:'#5fc9b4',content:<>
              <div className="section-title">FONDU ENTRE DEUX PANORAMAS</div>
              <p className="hint">Durée du fondu quand on passe d’un panorama à l’autre, pour toute la visite (éditeur et visite publiée). Plus c’est court, plus le passage est rapide. Les panoramas voisins sont aussi préchargés quand ils sont en ligne.</p>
              <label>Durée : <b>{(project.transitionMs??200)===0?'instantané':(project.transitionMs??200)+' ms'}</b>
                <input type="range" min={0} max={1500} step={50} value={project.transitionMs??200} onChange={e=>setProject(p=>({...p,transitionMs:Number(e.target.value)}))}/></label>
              <div className="nv-close-colors">
                {([['Instantané',0],['Rapide',150],['Normal',300],['Doux',600],['Lent',1000]] as const).map(([name,v])=>
                  <button type="button" key={v} className={'nv-trans-preset'+((project.transitionMs??200)===v?' is-on':'')} onClick={()=>setProject(p=>({...p,transitionMs:v}))}>{name}</button>)}
              </div>
              <button type="button" className="nv-test-anim" onClick={()=>{const list=visibleScenes;const i=list.findIndex(sc=>sc.id===active.id);const next=list[(i+1)%Math.max(1,list.length)];if(next&&next.id!==active.id)selectScene(next.id);}}>▶ Tester : passer au panorama suivant</button>
            </>},
                  {key:'music',title:'Musique',hint:active.musicTrackId?(project.audioTracks??[]).find(t=>t.id===active.musicTrackId)?.name:'Aucune',icon:<Music size={26}/>,tone:'#ff6fa8',content:<>
              <div className="section-title">MUSIQUE DE CE PANORAMA</div>
              <label>Musique active
                <select value={active.musicTrackId??''} onChange={e=>{
                  const id=e.target.value;
                  patchScene(sc=>({...sc,musicTrackId:id||undefined,audioEnabled:id?false:sc.audioEnabled}));
                }}>
                  <option value="">Aucune musique de la bibliothèque</option>
                  {(project.audioTracks??[]).map(track=><option value={track.id} key={track.id}>{track.name}</option>)}
                </select>
              </label>
              <button type="button" className="import" onClick={()=>audioInput.current?.click()}>＋ Importer une musique</button>
              <button type="button" className="style-reset" onClick={()=>setPanel('music')}>Gérer la bibliothèque musicale</button>
                  </>}
                ]}/>
            </div>
          )}
        </div>}
        {panel==='bar' && <div className="properties">
          <div className="section-title">BARRE DE NAVIGATION <span className="counter">{project.bottomBar.length}</span></div>
          <p className="hint">Ces icônes apparaissent en bas de la visite. Clique sur un bouton dans le panorama ou dans la liste pour le modifier.</p>
          <SectionHub id="bar" open={hubOpen.bar??null} onOpenChange={k=>{if(!k)setSelectedBarId('');setHubOpen(h=>({...h,bar:k}));}} forceOpen={selectedBarId&&hubOpen.bar!=='btn:'+selectedBarId&&hubOpen.bar!=='buttons'?'btn:'+selectedBarId:selectedBarId&&!hubOpen.bar?'buttons':null} sections={[
            {key:'buttons',title:'Boutons et actions',badge:project.bottomBar.length,hint:'Ajouter, modifier, ordonner',icon:<PanelBottom size={26}/>,tone:'#a468f0',content:<>

          <div className="bar-items-list" data-sort-scope="visit-bar">{project.bottomBar.map(item=><div key={item.id} {...barSort.itemProps(item.id)}><div className="nv-bar-list-sort">{barSort.grip(item.id,item.title)}<button className={'bar-item-row '+(selectedBarId===item.id?'current':'')} aria-expanded={selectedBarId===item.id} onClick={()=>setSelectedBarId(current=>current===item.id?'':item.id)}>
            <span className="bar-item-symbol">{project.icons.find(i=>i.id===item.iconId)?<img src={project.icons.find(i=>i.id===item.iconId)!.dataUrl} alt=""/>:<BarGlyph name={item.builtinIcon??'info'}/>}</span>
            <span>{item.title}</span><small>{item.type==='plan'?'Plan':item.type==='navigation'?'Scène':item.type==='information'?'Info':item.type==='gallery'?'Galerie':'Lien'}</small>
          </button></div></div>)}</div>
          <button className="import" onClick={()=>addBar('information')}>＋ Ajouter un bouton</button>
          <button className="preset-button" onClick={async ()=>{if(await confirmAsk('Remplacer la barre actuelle par le modèle bordeaux à 5 icônes ? Les icônes importées resteront disponibles.')){setProject(p=>({...p,bottomBar:defaultBar()}));setSelectedBarId('');}}}>↻ Appliquer le modèle 5 icônes</button>
          {renderBarButtonConfig()}

            </>},
            {key:'colors',title:'Couleurs et contours',hint:'Fond, boutons, pictogrammes',icon:<Palette size={26}/>,tone:'#ff8a3d',content:<><div className="style-settings">
            <button type="button" className="tool" onClick={()=>{setPanel('icons');setLibraryFor('global-close-icon');}}>✕ Configurer la croix de fermeture de tous les popups</button>
            {generalLibraryBlock(selectedBar?{barId:selectedBar.id}:undefined,selectedBar?'au bouton « '+selectedBar.title+' »':'')}
            <div className="style-colors">
              {barColorFields.map(field=><label className="style-color-field" key={field.key}>
                <span>{field.label}</span>
                <span className="style-picker"><input type="color" value={project.barStyle[field.key]} aria-label={field.label} onChange={e=>changeBarStyle({[field.key]:e.target.value})}/><small>{project.barStyle[field.key]}</small></span>
              </label>)}
            </div>
            {project.bottomBar.some(item=>item.iconId)&&<label className="toggle-row">
              <input type="checkbox" checked={project.barStyle.useBarGlyphs===true} onChange={e=>changeBarStyle({useBarGlyphs:e.target.checked})}/>
              Appliquer les couleurs aux boutons avec les pictogrammes intégrés
            </label>}
            <label>Épaisseur du contour de la barre : {project.barStyle.outlineWidth} px
              <input type="range" min="0" max="8" step="1" value={project.barStyle.outlineWidth} onChange={e=>changeBarStyle({outlineWidth:Number(e.target.value)})}/></label>
            <label>Épaisseur du contour des boutons : {project.barStyle.buttonOutlineWidth} px
              <input type="range" min="0" max="8" step="1" value={project.barStyle.buttonOutlineWidth} onChange={e=>changeBarStyle({buttonOutlineWidth:Number(e.target.value)})}/></label>
            <label>Arrondi de la barre : {project.barStyle.roundness} px
              <input type="range" min="0" max="60" step="1" value={project.barStyle.roundness} onChange={e=>changeBarStyle({roundness:Number(e.target.value)})}/></label>
            <button type="button" className="style-reset" onClick={()=>changeBarStyle({...defaultBarStyle(),useBarGlyphs:true})}>Restaurer les couleurs bordeaux et argent</button>
          </div>
</>},
            {key:'size',title:'Dimensions de la barre',hint:project.barStyle.height?project.barStyle.height+' px':'Taille automatique',icon:<Ruler size={26}/>,tone:'#2bb3d6',content:<><><BarDimensions style={project.barStyle} onChange={changeBarStyle} size={project.bottomBar.length?Math.max(...project.bottomBar.map(barIconSize)):48} onSize={size=>setProject(p=>withBarSize(p,size))}/><label className="toggle-row"><input type="checkbox" checked={project.barIconTrim!==false} onChange={e=>setProject(p=>({...p,barIconTrim:e.target.checked}))}/> Remplir les boutons : rogner les marges transparentes des icônes (toutes à la même taille)</label></></>},
            {key:'skins',title:'Skins',hint:'Enregistrer ou appliquer',icon:<Layers size={26}/>,tone:'#2fbf8f',onClick:()=>setSkinsOpen(true)},
            // Une tuile par bouton de la barre : réglages rapides, « Retour » revient à ce panneau.
            ...project.bottomBar.map(item=>{
              const img=project.icons.find(i=>i.id===item.iconId)?.dataUrl;
              const kind=item.type==='plan'?'Plan':item.type==='photos'?'Photos':item.type==='navigation'?'Panorama':item.type==='information'?'Information':item.type==='gallery'?'Galerie':'Lien';
              const tone=item.type==='plan'?'#e1a525':item.type==='photos'?'#e0645c':item.type==='gallery'?'#4f7cff':item.type==='information'?'#2bb3d6':item.type==='navigation'?'#2fbf8f':'#a468f0';
              return {key:'btn:'+item.id,title:item.title||kind,hint:kind,tone,
                icon:img?<img className="nv-hub-tile-img" src={img} alt=""/>:<BarGlyph name={item.builtinIcon??'info'}/>,
                content:<>{selectedBar?.id===item.id?renderBarButtonConfig():null}</>,
                onClick:()=>{setSelectedBarId(item.id);setHubOpen(h=>({...h,bar:'btn:'+item.id}));}};
            })
          ]}/>
        </div>}
        {panel==='medialib' && <div className="properties">
          <InspectorSection title="Photos & Vidéos de cette visite" initiallyOpen>
            <MediaLibraryPanel items={project.mediaLibrary??[]} onChange={items=>setProject(p=>({...p,mediaLibrary:items}))} selected={selected}
              onApply={item=>{
                const r=resolveLink(item);
                const retitle=selected&&(!selected.title||/^(photo|image|vid)/i.test(selected.title))?{title:item.name}:{};
                if(item.provider==='local'&&item.data){
                  // Fichier importé : il est copié dans le point (affichage en fenêtre ou en incrustation, comme avant).
                  if(item.kind==='photo')patchPoint({imageDataUrl:item.data,imageUrl:undefined,...retitle});
                  else patchPoint({videoDataUrl:item.data,videoUrl:'',videoEmbed:undefined,...retitle});
                }
                else if(item.kind==='photo'&&r.image)patchPoint({imageUrl:r.image,imageDataUrl:undefined,mediaDisplay:'popup',...retitle});
                else if(item.kind==='video')patchPoint(r.video?{videoUrl:r.video,videoEmbed:undefined,videoDataUrl:undefined,mediaDisplay:'popup',videoOpenFullscreen:true}:{videoEmbed:r.embed,videoUrl:'',videoDataUrl:undefined,mediaDisplay:'popup',videoOpenFullscreen:true});
                setStatus('« '+item.name+' » appliqué au point sélectionné');
              }}/>
          </InspectorSection>
        </div>}
        {panel==='elements' && <div className="properties">
          <div className="section-title">ÉLÉMENTS DE CE PANORAMA</div>
          <p className="hint">Sélectionne un point pour afficher ses réglages, puis déplace-le directement dans le panorama. Pour ajouter une icône PNG, fais-la glisser depuis la bibliothèque ci-dessous.</p>
          {!active?<p className="hint">Aucun panorama ouvert.</p>:<>
            <div className="elements-list">{active.hotspots.map(h=><button type="button" key={h.id}
              className="elements-entry" onClick={()=>{setSelectedId(h.id);setPanel('points');setMode(null);}}>
              <span>{project.icons.find(i=>i.id===h.iconId)?<img src={project.icons.find(i=>i.id===h.iconId)!.dataUrl} alt=""/>:h.type==='video'?'▶':h.type==='image'?'▣':h.type==='navigation'?'➜':'ⓘ'}</span>
              <strong>{h.title}</strong><small>Modifier et déplacer</small>
            </button>)}</div>
            {!active.hotspots.length&&<p className="hint">Pas encore d’élément dans cette scène.</p>}
          </>}
          {generalLibraryBlock(active&&selected?{sceneId:active.id,pointId:selected.id}:undefined,active&&selected?'au point sélectionné':'')}
          <div className="section-title">ICÔNES DISPONIBLES</div>
          <div className="elements-icon-grid">
            {project.icons.filter(icon=>!(project.hiddenAvailableIcons??[]).includes(icon.id)).map(icon=><div className="nv-element-icon-wrap" key={icon.id}><button type="button" draggable
              onDragStart={e=>{e.dataTransfer.setData('application/x-nv-icon',icon.id);e.dataTransfer.effectAllowed='copy';}}
              onClick={()=>setStatus('Glisse « '+icon.name+' » dans le panorama pour créer un point')}
              title={'Faire glisser '+icon.name+' sur le panorama'}>
              <img src={icon.dataUrl} alt=""/><span>{icon.name}</span>
            </button><button type="button" className="nv-element-icon-hide" aria-label={'Masquer '+icon.name} title="Masquer sans supprimer l'icône du projet" onClick={()=>setProject(p=>({...p,hiddenAvailableIcons:[...new Set([...(p.hiddenAvailableIcons??[]),icon.id])]}))}>−</button></div>)}
          </div>
          {!!project.hiddenAvailableIcons?.length&&<button type="button" className="quiet" onClick={()=>setProject(p=>({...p,hiddenAvailableIcons:[]}))}>Réafficher les icônes masquées ({project.hiddenAvailableIcons.length})</button>}
          {(collectIconSets().length>0||hiddenIconSetCount()>0)&&<>
            <div className="section-title">JEUX D’ICÔNES (NORMAL + SURVOL + CLIC)</div>
            <div className="icon-set-grid">{collectIconSets().map(set=><div className="icon-set-wrap" key={set.key}>
              <button type="button" className="icon-set" draggable
                onDragStart={e=>{e.dataTransfer.setData('application/x-nv-icon',JSON.stringify({iconId:set.iconId,hoverIconId:set.hoverIconId,pressedIconId:set.pressedIconId,size:set.size}));e.dataTransfer.effectAllowed='copy';}}
                onClick={()=>setStatus('Glisse ce jeu dans le panorama pour créer un point avec ses 3 états')}
                title={'Faire glisser sur le panorama · utilisé par : '+set.users.join(', ')}>
                {iconSetCells(set).map(([label,url])=><span className="icon-set-cell" key={label}><img src={url} alt=""/><small>{label}</small></span>)}
                <span className="icon-set-size">{set.size} px</span>
              </button>
              <button type="button" className={'nv-icon-set-favorite'+(project.favoriteNavigationIconSet===set.key?' is-active':'')} title="Flèche favorite du projet" aria-pressed={project.favoriteNavigationIconSet===set.key} onClick={()=>setNavigationIconFavorite(set.key)}>{project.favoriteNavigationIconSet===set.key?'★':'☆'}</button>
        <button type="button" className="icon-set-hide" title="Retirer ce jeu de la liste (aucun bouton ni point n'est modifié)" aria-label="Retirer ce jeu de la liste" onClick={()=>hideIconSet(set.key)}><XMark/></button>
            </div>)}</div>
            {restoreHiddenLink()}
          </>}
          <button className="import" type="button" onClick={()=>iconInput.current?.click()}>＋ Importer une icône PNG</button>
          <div className="section-title">ICÔNES DE LA BARRE DU BAS</div>
          {project.bottomBar.map(item=><button type="button" className="elements-entry" key={item.id}
            onClick={()=>{setSelectedBarId(item.id);setPanel('bar');}}>
            <span><BarGlyph name={item.builtinIcon??'info'}/></span><strong>{item.title}</strong><small>Personnaliser</small>
          </button>)}
        </div>}
        {panel==='intro' && <div className="properties">
          <div className="section-title">INTRODUCTION AUTOMATIQUE <span className="counter">NovaStudio AI</span></div>
          <p className="hint">Une introduction créée ici, sans site externe : texte, logo, style et animation. Elle s’efface seule à la durée réglée plus bas, ou dès que le visiteur clique sur le bouton.</p>
          <label className="toggle-row"><input type="checkbox" checked={!!project.introDesign?.enabled} onChange={e=>patchIntroDesign({enabled:e.target.checked})}/> Activer l’introduction automatique</label>
          {(project.introUrl??'').startsWith('https://')&&<p className="warning-inline">Une adresse d’introduction externe est déjà définie plus bas : elle reste prioritaire. Vide ce champ pour utiliser l’introduction automatique.</p>}
          <div className="section-title">STYLE</div>
          <div className="nv-brand-styles" role="radiogroup" aria-label="Style de l’introduction">
            {INTRO_STYLES.map(s=><button key={s.id} type="button" role="radio" aria-checked={(project.introDesign?.styleId??'premium')===s.id}
              className={'nv-brand-style'+((project.introDesign?.styleId??'premium')===s.id?' is-on':'')} onClick={()=>patchIntroDesign({styleId:s.id})}>{s.label}</button>)}
          </div>
          <label>Titre
            <input value={project.introDesign?.title??''} maxLength={INTRO_LIMITS.title} placeholder={project.name} onChange={e=>patchIntroDesign({title:e.target.value})}/>
          </label>
          <label>Phrase d’accueil
            <input value={project.introDesign?.subtitle??''} maxLength={INTRO_LIMITS.subtitle} placeholder="Bienvenue dans votre visite" onChange={e=>patchIntroDesign({subtitle:e.target.value})}/>
          </label>
          <label>Texte du bouton
            <input value={project.introDesign?.buttonLabel??'Découvrir'} maxLength={INTRO_LIMITS.button} onChange={e=>patchIntroDesign({buttonLabel:e.target.value})}/>
          </label>
          <div className="section-title">COULEURS DE L’INTRODUCTION</div>
          <label>Fond de l’introduction
            <input type="color" value={project.introDesign?.backgroundColor??INTRO_DEFAULT_COLORS.background} onChange={e=>patchIntroDesign({backgroundColor:e.target.value})}/>
          </label>
          <label>Fond du bouton de l’introduction
            <input type="color" value={project.introDesign?.buttonColor??INTRO_DEFAULT_COLORS.button} onChange={e=>patchIntroDesign({buttonColor:e.target.value})}/>
          </label>
          <label className="toggle-row"><input type="checkbox" checked={!project.introDesign?.welcomeColor}
            onChange={e=>{const d=project.introDesign;const cover=d?.animation==='iris'||d?.animation==='curtain'||d?.animation==='sweep';patchIntroDesign({welcomeColor:e.target.checked?undefined:introWelcomeColor(d?.buttonColor??INTRO_DEFAULT_COLORS.button,cover?'#394846':d?.backgroundColor??INTRO_DEFAULT_COLORS.background)});}}/>
            Couleur automatique du texte d’accueil
          </label>
          {project.introDesign?.welcomeColor&&<label>Couleur du texte d’accueil
            <input type="color" value={project.introDesign.welcomeColor} onChange={e=>patchIntroDesign({welcomeColor:e.target.value})}/>
          </label>}
          <label>Forme du cadre du logo
            <select value={project.introDesign?.logoShape??'original'} onChange={e=>patchIntroDesign({logoShape:e.target.value as IntroDesign['logoShape']})}>
              {INTRO_LOGO_SHAPES.map(shape=><option key={shape.id} value={shape.id}>{shape.label}</option>)}
            </select>
          </label>
          <label>Effet d’entrée
            <select value={project.introDesign?.animation??'fade'} onChange={e=>patchIntroDesign({animation:e.target.value as IntroDesign['animation']})}>
              {INTRO_ANIMATIONS.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </label>
          <small className="hint-inline">L’iris, le rideau et le balayage révèlent le panorama de départ, puis le logo et le titre.</small>
          <div className="nv-brand-pack-actions">
            <button type="button" className="import" onClick={()=>logoInput.current?.click()}>{project.introDesign?.logoDataUrl?'Remplacer le logo':'Ajouter un logo'}</button>
            {project.introDesign?.logoDataUrl&&<button type="button" className="quiet" onClick={()=>patchIntroDesign({logoDataUrl:undefined})}>Retirer le logo</button>}
          </div>
          <input ref={logoInput} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{void importIntroLogo(e.target.files?.[0]);e.target.value='';}}/>
          <small className="hint-inline">Durée : {project.introDuration??6} s (réglée dans la section ci-dessous).</small>
          <button type="button" className="primary" disabled={!project.introDesign} onClick={()=>setIntroPreview(true)}>▶ Prévisualiser l’introduction</button>
          <div className="section-title">ADRESSE EXTERNE (FACULTATIF)</div>
          <div className="section-title">INTRODUCTION DE LA VISITE</div>
          <p className="hint">Chaque visite possède son URL d’introduction. L’introduction apparaît au lancement puis passe automatiquement au premier panorama, sans bouton supplémentaire.</p>
          <label className="toggle-row"><input type="checkbox" checked={project.introEnabled} onChange={e=>setProject(p=>({...p,introEnabled:e.target.checked}))}/> Activer l’introduction</label>
          <label>Adresse HTTPS de l'introduction
            <input type="url" value={project.introUrl} placeholder="https://intro-au-bureau-narbonne.vercel.app/" onChange={e=>setProject(p=>({...p,introUrl:e.target.value}))}/>
          </label>
          <small className="hint-inline">Exemple : intro-au-bureau-narbonne.vercel.app. Une URL différente par projet.</small>
          <label>Durée avant le premier panorama : {project.introDuration??6} secondes
            <input type="range" min="2" max="60" step="1" value={project.introDuration??6}
              onChange={e=>setProject(p=>({...p,introDuration:Number(e.target.value)}))}/>
          </label>
          <small className="hint-inline">La transition s'effectue automatiquement à la durée réglée, indépendamment de la durée de la vidéo et sans attendre de clic.</small>
          <button type="button" className="import" onClick={()=>{if(project.introUrl.startsWith('https://')){setActiveId(startSceneId(visibleScenes));setMode(null);setSelectedId('');setPreview(true);setIntroEnding(false);setIntroVisible(true);}else setStatus('Renseigne d’abord une URL HTTPS valide');}}>Tester l’introduction</button>
          <p className="hint">Dans le dossier HTML exporté, cette introduction sera présentée avant l’entrée dans la visite.</p>
        </div>}
        {panel==='plan' && <div className="properties">
          <InspectorSection title={currentSpace?'Plans de l’espace « '+currentSpace.name+' »':'Plans du projet principal'} initiallyOpen>
            <p className="hint-inline">{currentSpace?'Ces plans et leurs repères sont propres à cet espace. Les autres espaces conservent leurs propres plans et panoramas.':'Ces plans appartiennent au projet principal. Choisis un espace pour lui attribuer ses propres plans.'}</p>
            <FloorPlanEditor renderPreview={id=>{const scene=project.scenes.find(sc=>sc.id===id);return scene?<FullscreenGalleryHoverPreview scene={scene} thumb={sceneThumbs[id]}/>:null;}} plans={plansInSpace(project,currentSpace)} scenes={visibleScenes} thumbs={sceneThumbs} onChange={plans=>setProject(p=>updatePlansInSpace(p,currentSpace,plans))}
              hasPlanButton={project.bottomBar.some(item=>item.type==='plan')}
              onSceneChange={(id,patch)=>setProject(p=>({...p,scenes:p.scenes.map(sc=>{
                if(sc.id!==id)return sc;
                const next={...sc};
                if(patch.name!==undefined)next.name=patch.name;
                if(patch.surfaceM2===null)delete next.surfaceM2;else if(patch.surfaceM2!==undefined)next.surfaceM2=patch.surfaceM2;
                return next;
              })}))}
              onAddButton={()=>{if(project.bottomBar.length>=20){setStatus('20 boutons maximum');return;}setProject(p=>({...p,bottomBar:[...p.bottomBar,{id:uid(),title:'Plan',type:'plan',builtinIcon:'map',target:'',text:'',url:''}]}));}}
              onPreview={()=>{setPreview(true);setRightHidden(true);setIntroVisible(false);setFloorPlanOpen(true);}}/>
          </InspectorSection>
          <InspectorSection title="Raccourcis dans le plan" initiallyOpen>
            <label className="toggle-row"><input type="checkbox" checked={!!project.planShortcuts} onChange={e=>setProject(p=>({...p,planShortcuts:e.target.checked}))}/> Intégrer les raccourcis de la barre dans le plan</label>
            <p className="hint-inline">Affiche sous le plan les boutons de la barre du bas ({project.bottomBar.filter(b=>b.type!=='plan').map(b=>b.title).join(', ')||'aucun'}) : le visiteur passe du plan aux photos, informations ou panoramas sans le fermer à la main.</p>
          </InspectorSection>
        </div>}
        {panel==='settings' && <div className="properties">
          <InspectorSection title="Panoramas du projet" initiallyOpen={false}>
            <p className="hint">Ajoute ou supprime des panoramas sans réinitialiser les vues de caméra ni les éléments des autres scènes.</p>
            <button type="button" className="primary" onClick={()=>upload.current?.click()}>＋ Ajouter des panoramas</button>
            <div className="nv-settings-panorama-list">
              {project.scenes.map(sc=><div key={sc.id} className="nv-settings-panorama-row">
                <span title={sc.name}>{sc.name}</span>
                <button type="button" title={'Ouvrir '+sc.name} onClick={()=>{setActiveId(sc.id);setPanel('panoramas');}}>Ouvrir</button>
                <button type="button" title={'Supprimer '+sc.name} disabled={project.scenes.length<=1} onClick={()=>deleteScene(sc.id)}>Supprimer</button>
              </div>)}
            </div>
          </InspectorSection>
          <InspectorSection title="Animation des fenêtres (info, photo, vidéo, galeries, plan)" initiallyOpen>
            <p className="hint">Ce style s’applique à toutes les fenêtres de la visite : informations, photos, vidéos, galeries et plan. Il s’applique aussi à l’aperçu.</p>
            <button type="button" className="primary" onClick={()=>{document.documentElement.dataset.windowAnim=project.windowAnimation??'fade';setWindowDemo(true);}}>▶ Tester l’animation</button>
            <label>Durée d’ouverture : {project.windowAnimationMs??700} ms
              <input type="range" min={200} max={2000} step={50} value={project.windowAnimationMs??700} onChange={e=>setProject(p=>({...p,windowAnimationMs:Number(e.target.value)}))}/>
            </label>
            <label>Style
              <select value={project.windowAnimation??'fade'} onChange={e=>setProject(p=>({...p,windowAnimation:e.target.value as WindowAnimation}))}>
                {WINDOW_ANIMATIONS.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </label>
          </InspectorSection>
          <InspectorSection title="Rectangle avec le nom des pièces (en haut)" initiallyOpen>
            <p className="hint">Le petit cadre qui affiche le nom du panorama en haut de la visite. Ces deux cases le masquent partout, quel que soit le réglage des dossiers ou des panoramas.</p>
            <label className="toggle-row"><input type="checkbox" checked={!!project.hideRoomNames} onChange={e=>setProject(p=>({...p,hideRoomNames:e.target.checked||undefined}))}/> Masquer dans la visite immersive</label>
            <label className="toggle-row"><input type="checkbox" checked={!!project.hideRoomNamesVr} onChange={e=>setProject(p=>({...p,hideRoomNamesVr:e.target.checked||undefined}))}/> Masquer dans le casque (VR)</label>
            <small className="hint-inline">Pour garder le cadre seulement sur certains panoramas : décochez ici, puis réglez chaque dossier ou chaque panorama (tuile « Nom du panorama »).</small>
          </InspectorSection>
          <InspectorSection title="Croix de fermeture (toutes les fenêtres)" initiallyOpen>
            {closeColorControls()}
          </InspectorSection>
          <InspectorSection title="Visite immersive 360° et VR (facultatif)" initiallyOpen>
            <label>Hauteur du regard dans le casque : {Math.round((project.vrEyeOffset??0)*100)} cm<input type="range" min={-100} max={50} step={5} value={Math.round((project.vrEyeOffset??0)*100)} onChange={e=>setProject(p=>({...p,vrEyeOffset:Number(e.target.value)/100}))}/></label>
            <small className="hint-inline">Négatif : le panorama descend, vous ne flottez plus au-dessus de l’image. 0 = réglage actuel.</small>
            <p className="hint">La visite fonctionne toujours sur mobile, ordinateur et tablette. Le mode casque VR est une option à activer uniquement pour les clients qui le souhaitent.</p>
            <label className="toggle-row"><input type="checkbox" checked={project.vrEnabled!==false}
              onChange={e=>{const enabled=e.target.checked;setProject(p=>({...p,vrEnabled:enabled}));setStatus(enabled?'VR activée pour cette visite. Enregistre avec la disquette.':'VR désactivée : la visite 360° classique reste disponible. Enregistre avec la disquette.');}}/>
              Autoriser le mode casque VR dans cette visite
            </label>
            <small className="hint-inline">Avec l'option activée, les navigateurs WebXR compatibles proposent l'entrée immersive. Sans l'option, aucun bouton ni écran d'accueil VR n'apparaît. La fonction n'est pas activée automatiquement sur les nouveaux projets.</small>
          </InspectorSection>
          <InspectorSection title="Personnaliser le bouton Paramètres" initiallyOpen>
          <p className="hint">Choisis les icônes normales, au survol et au clic. Les modifications sont visibles immédiatement sur le bouton en bas à droite. Passe en aperçu pour tester son menu son et langue.</p>
          <div className="section-title">BOUTON PARAMÈTRES (EN BAS À DROITE) — 3 ICÔNES</div>
          <button type="button" className="import" disabled={project.icons.length>147} onClick={()=>{
            if(project.icons.length>147){setStatus('Bibliothèque pleine : supprime un ancien pack avant d’en ajouter un autre.');return;}
            try{
              const g=settingsGlyphs();
              const mk=(name:string,dataUrl:string)=>({id:uid(),name,dataUrl});
              const existing=buildIconSets(project.icons).map(p=>p.name.toLocaleLowerCase('fr'));
              let label='Paramètres doré 3D',n=2;
              while(existing.includes(label.toLocaleLowerCase('fr')))label='Paramètres doré 3D '+n++;
              const a=mk(label+' · Normal',g.normal),b=mk(label+' · Survol',g.hover),c=mk(label+' · Pressé',g.pressed);
              const next=validateProject({...project,icons:[...project.icons,a,b,c],
                settingsIconId:a.id,settingsHoverIconId:b.id,settingsPressedIconId:c.id});
              setProject(next);
              setStatus('Pack « '+label+' » créé : Normal, Survol, Pressé. Il est appliqué au bouton Paramètres et disponible dans la bibliothèque. Sauvegarde avec la disquette.');
            }catch(e){setStatus('Impossible de créer le pack Paramètres : '+String(e));}
          }}>⚙ Créer et utiliser mon pack Paramètres doré 3D (Normal · Survol · Pressé)</button>
          <button type="button" className="nv-harmonize" onClick={()=>{
            void (async()=>{
              try{
                setStatus('Harmonisation des boutons en cours…');
                const next=await harmonizeWithBar(project);
                setProject(next);
                setStatus('Tous les boutons (barre, son, paramètres, flèche, photo, vidéo, plan) ont maintenant la couleur de la barre. Sauvegarde avec la disquette.');
              }catch(e){setStatus('Impossible d’harmoniser les boutons : '+(e instanceof Error?e.message:String(e)));}
            })();
          }}>🎨 Mettre tous les boutons à la couleur de la barre</button>
          <GlossyPackMaker key={JSON.stringify(project.glossyStyle??null)} initial={project.glossyStyle} defaultLabel="Bouton glossy"
            onAddToBar={(keys,style)=>{
              void (async()=>{
                try{
                  const room=20-project.bottomBar.length;
                  if(keys.length>room){setStatus('La barre accepte encore '+room+' bouton(s) (20 maximum).');return;}
                  if(project.icons.length+keys.length*3>147){setStatus('Bibliothèque pleine : supprime des packs avant d’en créer.');return;}
                  const newIcons:{id:string;name:string;dataUrl:string}[]=[];
                  const items:BottomBarItem[]=[];
                  for(const key of keys){
                    const choice=BAR_CHOICES.find(c=>c.key===key);
                    if(!choice)continue;
                    const Glyph=glyphs[key as keyof typeof glyphs] as unknown as ComponentType<Record<string,unknown>>;
                    const states=await glossyIconStates({...style,glyph:await glyphPng(Glyph)});
                    const a={id:uid(),name:choice.label+' · glossy · Normal',dataUrl:states.normal};
                    const b={id:uid(),name:choice.label+' · glossy · Survol',dataUrl:states.hover};
                    const c={id:uid(),name:choice.label+' · glossy · Pressé',dataUrl:states.pressed};
                    newIcons.push(a,b,c);
                    items.push({id:uid(),title:choice.label,type:choice.type,target:'',text:'',url:'',builtinIcon:key,
                      iconId:a.id,hoverIconId:b.id,pressedIconId:c.id,iconSize:40,...(choice.type==='gallery'?{gallery:[]}:{})} as BottomBarItem);
                  }
                  setProject(validateProject({...project,icons:[...project.icons,...newIcons],glossyStyle:style,bottomBar:[...project.bottomBar,...items]}));
                  setStatus(items.length+' bouton(s) ajouté(s) à la barre avec leur icône glossy. Sauvegarde avec la disquette.');
                }catch(e){setStatus('Impossible d’ajouter les boutons : '+String(e));}
              })();
            }}
            onCreateMotifs={style=>{
              void (async()=>{
                try{
                  if(project.icons.length+VISIT_MOTIFS.length*3>147){setStatus('Bibliothèque pleine : supprime des packs avant d’en créer.');return;}
                  const made:Record<string,{iconId:string;hoverIconId:string;pressedIconId:string}>={};
                  const newIcons:{id:string;name:string;dataUrl:string}[]=[];
                  for(const motif of VISIT_MOTIFS){
                    const Glyph=glyphs[motif.key] as unknown as ComponentType<Record<string,unknown>>;
                    const states=await glossyIconStates({...style,glyph:await glyphPng(Glyph)});
                    const a={id:uid(),name:motif.label+' · glossy · Normal',dataUrl:states.normal};
                    const b={id:uid(),name:motif.label+' · glossy · Survol',dataUrl:states.hover};
                    const c={id:uid(),name:motif.label+' · glossy · Pressé',dataUrl:states.pressed};
                    newIcons.push(a,b,c);
                    made[motif.key]={iconId:a.id,hoverIconId:b.id,pressedIconId:c.id};
                  }
                  setProject(validateProject({...project,icons:[...project.icons,...newIcons],glossyStyle:style,
                    defaultNavigationIcon:{...made.arrow,iconSize:40},
                    defaultPhotoIcon:{...made.camera,iconSize:40},
                    defaultVideoIcon:{...made.video,iconSize:40},
                    soundOnIconId:made.soundOn.iconId,soundOnHoverIconId:made.soundOn.hoverIconId,soundOnPressedIconId:made.soundOn.pressedIconId,
                    soundOffIconId:made.soundOff.iconId,soundOffHoverIconId:made.soundOff.hoverIconId,soundOffPressedIconId:made.soundOff.pressedIconId,
                    settingsIconId:made.settings.iconId,settingsHoverIconId:made.settings.hoverIconId,settingsPressedIconId:made.settings.pressedIconId,
                    bottomBar:project.bottomBar.map(item=>{const k=item.builtinIcon;return item.iconId||!k||!made[k]?item:{...item,...made[k]};})}));
                  setStatus('Icônes glossy de la visite créées (flèche, photo, vidéo, localisation, images, carte, panorama, restaurant) et utilisées par défaut. Sauvegarde avec la disquette.');
                }catch(e){setStatus('Impossible de créer les icônes glossy : '+String(e));}
              })();
            }}
            onCreateBar={style=>{
              void (async()=>{
                try{
                  const packs=await glossyBarPacks(project.bottomBar,style,glyphs as unknown as Record<string,ComponentType<Record<string,unknown>>>,Info as unknown as ComponentType<Record<string,unknown>>);
                  if(!packs.length){setStatus('Tous les boutons ont déjà une icône personnalisée.');return;}
                  if(project.icons.length+packs.length*3>147){setStatus('Bibliothèque pleine : supprime des packs avant d’en créer.');return;}
                  const newIcons:{id:string;name:string;dataUrl:string}[]=[];
                  const byItem=new Map<string,{iconId:string;hoverIconId:string;pressedIconId:string}>();
                  for(const {item,states} of packs){
                    const a={id:uid(),name:(item.title||'Bouton')+' · glossy · Normal',dataUrl:states.normal};
                    const b={id:uid(),name:(item.title||'Bouton')+' · glossy · Survol',dataUrl:states.hover};
                    const c={id:uid(),name:(item.title||'Bouton')+' · glossy · Pressé',dataUrl:states.pressed};
                    newIcons.push(a,b,c);
                    byItem.set(item.id,{iconId:a.id,hoverIconId:b.id,pressedIconId:c.id});
                  }
                  setProject(validateProject({...project,icons:[...project.icons,...newIcons],glossyStyle:style,
                    bottomBar:project.bottomBar.map(item=>{const ids=byItem.get(item.id);return ids?{...item,...ids}:item;})}));
                  setStatus(packs.length+' icône(s) glossy créée(s) avec leur pictogramme. Sauvegarde avec la disquette.');
                }catch(e){setStatus('Impossible de créer les icônes glossy : '+String(e));}
              })();
            }}
            onCreate={(g,label,style,applyBar)=>{
            if(project.icons.length>147){setStatus('Bibliothèque pleine : supprime un ancien pack avant d’en ajouter un autre.');return;}
            const mk=(name:string,dataUrl:string)=>({id:uid(),name,dataUrl});
            const a=mk(label+' · Normal',g.normal),b=mk(label+' · Survol',g.hover),c=mk(label+' · Pressé',g.pressed);
            try{
              setProject(validateProject({...project,icons:[...project.icons,a,b,c],
                settingsIconId:a.id,settingsHoverIconId:b.id,settingsPressedIconId:c.id,glossyStyle:style,
                bottomBar:applyBar?project.bottomBar.map(item=>({...item,iconId:a.id,hoverIconId:b.id,pressedIconId:c.id})):project.bottomBar}));
              setStatus('Pack « '+label+' » créé'+(applyBar?' et appliqué à toute la barre':'')+'. Charte enregistrée. Sauvegarde avec la disquette.');
            }catch(e){setStatus('Impossible de créer le pack : '+String(e));}
          }}/>
          {project.settingsIconId&&<div className="nv-settings-three-previews">
            {([['Normal',project.settingsIconId],['Survol',project.settingsHoverIconId],['Pressé',project.settingsPressedIconId]] as const).map(([label,id])=>
              <div key={label}><span>{id&&project.icons.some(i=>i.id===id)?<img src={project.icons.find(i=>i.id===id)!.dataUrl} alt={'Paramètres '+label}/>:<i>⚙</i>}</span><small>{label}</small></div>)}
          </div>}
          {generalLibraryBlock({settings:true},'au bouton Paramètres')}
          <ExistingIconPackPicker project={project}
            value={{iconId:project.settingsIconId,hoverIconId:project.settingsHoverIconId,pressedIconId:project.settingsPressedIconId}}
            preferred="settings" label="Choisir un pack de 3 pour Paramètres"
            onCreateGeneral={(name,images,apply)=>createLibraryIconSet(name,images,undefined,apply?{settings:true}:undefined)}
            onSelect={pack=>{setProject(p=>({...p,settingsIconId:pack.iconId,settingsHoverIconId:pack.hoverIconId,settingsPressedIconId:pack.pressedIconId}));setStatus('Pack Paramètres appliqué : '+pack.name);}}/>
          {iconStateEditor('settings-normal','Paramètres · Normal',project.settingsIconId,
            id=>setProject(p=>({...p,settingsIconId:id})),'⚙')}
          {iconStateEditor('settings-hover','Paramètres · Survol',project.settingsHoverIconId,
            id=>setProject(p=>({...p,settingsHoverIconId:id})),'⚙')}
          {iconStateEditor('settings-pressed','Paramètres · Clic',project.settingsPressedIconId,
            id=>setProject(p=>({...p,settingsPressedIconId:id})),'⚙')}
          <div className="section-title">TAILLE ET COULEURS</div>
          <label className="nv-size-control">Taille du bouton : <b>{settingsSize(project)} px</b>
            <input type="range" min="32" max="120" step="2" value={settingsSize(project)} onChange={e=>setProject(p=>({...p,settingsIconSize:Number(e.target.value)}))}/></label>
          {settingsIconSrc&&<label className="nv-size-control">Zoom de l’icône : <b>{project.settingsIconZoom??100} %</b>
            <input type="range" min="100" max="300" step="5" value={project.settingsIconZoom??100} onChange={e=>setProject(p=>({...p,settingsIconZoom:Number(e.target.value)}))}/>
            <small className="hint-inline">Agrandit l’image dans le bouton si ton icône a des marges transparentes et paraît trop petite.</small></label>}
          {!settingsIconSrc&&<div className="nv-vs-colors">
            <label>Fond du bouton <input type="color" value={project.settingsColor??'#0b1826'} onChange={e=>setProject(p=>({...p,settingsColor:e.target.value}))}/></label>
            <label>Roue crantée <input type="color" value={project.settingsIconColor??'#ffffff'} onChange={e=>setProject(p=>({...p,settingsIconColor:e.target.value}))}/></label>
          </div>}
          <button type="button" className="style-reset" onClick={()=>setProject(p=>({...p,settingsIconSize:undefined,settingsIconZoom:undefined,settingsColor:undefined,settingsIconColor:undefined}))}>Réinitialiser taille et couleurs</button>
          </InspectorSection>
        </div>}
        {panel==='music' && <div className="properties">
          <InspectorSection title="Boutons son de la visite">
          <p className="hint">À la fin de l’introduction, le visiteur choisit « Avec le son » ou « Sans le son ». Les mêmes boutons sont utilisés dans les liens publics, privés et les exports. Ils peuvent être personnalisés depuis ta bibliothèque d’icônes.</p>
          <button type="button" className="style-reset" onClick={()=>void addSoundIcons()}>＋ Ajouter les icônes Son à mes icônes (aux couleurs de la barre)</button>
          <div className="section-title">SON ACTIVÉ — 3 ICÔNES</div>
          {generalLibraryBlock({soundOn:true},'à Son activé')}
          <ExistingIconPackPicker project={project}
            value={{iconId:project.soundOnIconId,hoverIconId:project.soundOnHoverIconId,pressedIconId:project.soundOnPressedIconId}}
            preferred="audio" label="Choisir un pack de 3 pour Son activé"
            onCreateGeneral={(name,images,apply)=>createLibraryIconSet(name,images,undefined,apply?{soundOn:true}:undefined)}
            onSelect={pack=>{setProject(p=>({...p,soundOnIconId:pack.iconId,soundOnHoverIconId:pack.hoverIconId,soundOnPressedIconId:pack.pressedIconId}));setStatus('Pack Son activé appliqué : '+pack.name);}}/>
          {iconStateEditor('audio-on-normal','Son activé · Normal',project.soundOnIconId,
            id=>setProject(p=>({...p,soundOnIconId:id})),'🔊')}
          {iconStateEditor('audio-on-hover','Son activé · Survol',project.soundOnHoverIconId,
            id=>setProject(p=>({...p,soundOnHoverIconId:id})),'🔊')}
          {iconStateEditor('audio-on-pressed','Son activé · Clic',project.soundOnPressedIconId,
            id=>setProject(p=>({...p,soundOnPressedIconId:id})),'🔊')}
          <div className="section-title">SON COUPÉ — 3 ICÔNES</div>
          {generalLibraryBlock({soundOff:true},'à Son coupé')}
          <ExistingIconPackPicker project={project}
            value={{iconId:project.soundOffIconId,hoverIconId:project.soundOffHoverIconId,pressedIconId:project.soundOffPressedIconId}}
            preferred="audio" label="Choisir un pack de 3 pour Son coupé"
            onCreateGeneral={(name,images,apply)=>createLibraryIconSet(name,images,undefined,apply?{soundOff:true}:undefined)}
            onSelect={pack=>{setProject(p=>({...p,soundOffIconId:pack.iconId,soundOffHoverIconId:pack.hoverIconId,soundOffPressedIconId:pack.pressedIconId}));setStatus('Pack Son coupé appliqué : '+pack.name);}}/>
          {iconStateEditor('audio-off-normal','Son coupé · Normal',project.soundOffIconId,
            id=>setProject(p=>({...p,soundOffIconId:id})),'🔇')}
          {iconStateEditor('audio-off-hover','Son coupé · Survol',project.soundOffHoverIconId,
            id=>setProject(p=>({...p,soundOffHoverIconId:id})),'🔇')}
          {iconStateEditor('audio-off-pressed','Son coupé · Clic',project.soundOffPressedIconId,
            id=>setProject(p=>({...p,soundOffPressedIconId:id})),'🔇')}
          </InspectorSection>
          <div className="section-title">BIBLIOTHÈQUE MUSICALE <span className="counter">{project.audioTracks?.length??0}</span></div>
          <p className="hint">Attribue une piste à plusieurs panoramas : elle joue en continu, en boucle, sans recommencer lors du passage d’une scène à l’autre. Choisis une autre piste là où tu souhaites changer d’ambiance.</p>
          <button type="button" className="import" onClick={()=>audioInput.current?.click()}>＋ Importer une piste MP3, WAV, OGG</button>
          {(project.audioTracks??[]).map(track=><InspectorSection title={track.name} key={track.id}>
            <div className="music-track-title"><strong>{track.name}</strong><button type="button" onClick={()=>removeTrack(track.id)} title="Supprimer cette piste"><XMark/></button></div>
            <label>Nom<input value={track.name} onChange={e=>setProject(p=>({...p,audioTracks:p.audioTracks.map(t=>t.id===track.id?{...t,name:e.target.value}:t)}))}/></label>
            <label>Volume : {track.volume} %
              <input type="range" min="0" max="100" value={track.volume} onChange={e=>setProject(p=>({...p,audioTracks:p.audioTracks.map(t=>t.id===track.id?{...t,volume:Number(e.target.value)}:t)}))}/>
            </label>
            <label className="toggle-row"><input type="checkbox" checked={track.loop} onChange={e=>setProject(p=>({...p,audioTracks:p.audioTracks.map(t=>t.id===track.id?{...t,loop:e.target.checked}:t)}))}/> Lecture en boucle</label>
            <div className="section-title">PANORAMAS À SONORISER <span className="counter">{project.scenes.filter(sc=>sc.musicTrackId===track.id).length} / {project.scenes.length}</span></div>
            <div className="nv-music-bulk">
              <button type="button" disabled={!project.scenes.length||project.scenes.every(sc=>sc.musicTrackId===track.id)} onClick={()=>assignMusicAll(track.id,true)}>✓ Tout intégrer</button>
              <button type="button" disabled={!project.scenes.some(sc=>sc.musicTrackId===track.id)} onClick={()=>assignMusicAll(track.id,false)}>✕ Tout retirer</button>
            </div>
            {project.scenes.map(sc=><label className="music-scene-check" key={sc.id}>
              <input type="checkbox" checked={sc.musicTrackId===track.id} onChange={e=>assignMusic(track.id,sc.id,e.target.checked)}/>
              <span>{sc.name}</span>
            </label>)}
          </InspectorSection>)}
          {!project.audioTracks?.length&&<p className="hint">Aucune musique importée. Commence par ajouter un fichier audio.</p>}
        </div>}
        {panel==='tool'&&(()=>{
          const t=toolSettings;
          const names={navigation:'Flèche · navigation',information:'Information',lien:'Lien web',image:'Photo',video:'Vidéo'} as const;
          const list=active?.hotspots.filter(h=>h.type===t)??[];
          return <div className="properties nv-tool-panel">
            <div className="section-title"><span>RÉGLAGES · {names[t].toUpperCase()}</span></div>
            {t==='navigation'&&<>
              <label className="toggle-row"><input type="checkbox" checked={autoReturn} onChange={e=>setAutoReturn(e.target.checked)}/> ↩ Créer aussi la flèche retour (arrivée à 180°, à l’opposé de l’aller)</label>
              <small className="hint-inline">Quand tu crées une nouvelle flèche A → B, la flèche B → A est ajoutée toute seule. Le mode Auto garde son pas à pas.</small>
              <button type="button" className="nv-tool-action" onClick={()=>{setLibraryFor(null);setPanel('icons');}}>Choisir les icônes des flèches (bibliothèque)</button>
            </>}
            {(t==='image'||t==='video')&&<button type="button" className="nv-tool-action" onClick={()=>setPanel('medialib')}>📚 Ouvrir ma bibliothèque Photos &amp; Vidéos</button>}
            {t!=='navigation'&&<>
              <label>Animation d’ouverture (toute la visite)
                <select value={project.windowAnimation??'fade'} onChange={e=>setProject(p=>({...p,windowAnimation:e.target.value as WindowAnimation}))}>{WINDOW_ANIMATIONS.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select></label>
              <button type="button" className="nv-test-anim" onClick={()=>{document.documentElement.dataset.windowAnim=project.windowAnimation??'fade';setWindowDemo(false);window.setTimeout(()=>setWindowDemo(true),30);}}>▶ Tester l’animation</button>
              <button type="button" className="nv-tool-action" onClick={()=>{setLibraryFor('global-close-icon');setPanel('icons');}}>✕ Croix de fermeture (couleur ou icône)</button>
            </>}
            <div className="section-title"><span>POINTS DE CE TYPE DANS CE PANORAMA ({list.length})</span></div>
            {!list.length&&<p className="hint">Aucun point de ce type ici. Clique l’outil « {names[t]} » puis dans le panorama pour en poser un.</p>}
            <div className="nv-tool-list">{list.map(h=><button type="button" key={h.id} onClick={()=>{setMode(null);setSelectedId(h.id);setPanel('points');}}>{h.title||names[t]}<small>Réglages ›</small></button>)}</div>
          </div>;
        })()}
        {panel==='icons' && <div className="properties nv-icons-panel nv-icons-v2">
          {visitColorsCard()}
          <div className="nv-icons-sections">
          <details className="nv-icons-card">
            <summary><span className="nv-icons-card-thumb">{closeIcon?<img src={closeIcon.dataUrl} alt=""/>:<X size={18}/>}</span>
              <span className="nv-icons-card-text"><strong>Croix de fermeture · image</strong><small>{closeIcon?'Image : '+closeIcon.name:project.closeButtonColor?'Version couleur (thème)':'Croix classique'}</small></span></summary>
            <div className="nv-icons-card-body">
              <p className="hint">Facultatif : remplace la croix couleur par un pack d’images (normal, survol, pressé). Choisir une couleur plus haut retire l’image.</p>
            <div className="nv-close-current">
              <span className="nv-close-current-preview">{closeIcon?<img src={closeIcon.dataUrl} alt="Croix choisie"/>:'✕'}</span>
              <div><strong>{closeIcon?.name??'Croix classique'}</strong><small>{closeIcon?'Appliquée à toutes les interactions':'Croix classique par défaut'}</small></div>
            </div>
            {generalLibraryBlock({close:true},'à la croix de fermeture')}
          {libraryPackPicker(project.closeIconId,patch=>setProject(p=>({...p,closeIconId:patch.iconId,closeIconHoverId:patch.hoverIconId,closeIconPressedId:patch.pressedIconId})))}
            <details className="nv-icons-states">
              <summary>Croix : PNG normal, survol et clic un par un</summary>
              <ExistingIconPackPicker project={project}
              value={{iconId:project.closeIconId,hoverIconId:project.closeIconHoverId,pressedIconId:project.closeIconPressedId}}
              preferred="close" label="Choisir une croix dans mes packs de 3"
              onCreateGeneral={(name,images,apply)=>createLibraryIconSet(name,images,undefined,apply?{close:true}:undefined)}
              onSelect={pack=>{
                setProject(p=>({...p,closeIconId:pack.iconId,closeIconHoverId:pack.hoverIconId,closeIconPressedId:pack.pressedIconId}));
                setStatus('Pack « '+pack.name+' » appliqué à la croix : Normal, Survol et Pressé. Sauvegarde avec la disquette.');
              }}/>
            <details className="nv-icon-single-states"><summary>Modifier les 3 images séparément (facultatif)</summary>
            {iconStateEditor('global-close-icon','Croix globale',project.closeIconId,
                id=>setProject(p=>({...p,closeIconId:id})),'Croix classique')}
              {iconStateEditor('global-close-hover-icon','Croix · Survol',project.closeIconHoverId,
                id=>setProject(p=>({...p,closeIconHoverId:id})),'Identique au normal')}
              {iconStateEditor('global-close-pressed-icon','Croix · Pressé',project.closeIconPressedId,
                id=>setProject(p=>({...p,closeIconPressedId:id})),'Identique au survol')}
              {closeIcon&&<button type="button" className="style-reset" onClick={()=>requestReplaceIcon(closeIcon.id)}>Remplacer ce PNG partout</button>}
            </details>
            </details>
            </div>
          </details>
          <button type="button" className="nv-icons-card nv-icons-card-link" onClick={editSettingsButton}>
            <span className="nv-icons-card-thumb">{settingsIconSrc?<img src={settingsIconSrc} alt=""/>:<SettingsIcon size={18}/>}</span>
            <span className="nv-icons-card-text"><strong>Bouton Paramètres · icône et taille</strong><small>{settingsIconSrc?'Image personnalisée':'Roue crantée · '+settingsSize(project)+' px'}</small></span>
            <ChevronRight size={18} className="nv-icons-card-go"/>
          </button>
          <details className="nv-icons-card">
            <summary><span className="nv-icons-card-thumb"><Sparkles size={18}/></span>
              <span className="nv-icons-card-text"><strong>Créer des icônes</strong><small>Bibliothèque générale, aux couleurs de la barre</small></span></summary>
            <div className="nv-icons-card-body">
            <GeneralIconLibrary
              barTheme={project.barStyle}
              applyLabel={libraryFor?.startsWith('global-close')?'à la croix de fermeture':selectedBar?'au bouton sélectionné':active&&selected?'au point sélectionné':undefined}
              onAdd={(name,images,apply)=>createLibraryIconSet(name,images,undefined,apply?(
                libraryFor?.startsWith('global-close')?{close:true}:selectedBar?{barId:selectedBar.id}:
                active&&selected?{sceneId:active.id,pointId:selected.id}:undefined
              ):undefined)}/>
            </div>
          </details>
          <details className="nv-icons-card">
            <summary><span className="nv-icons-card-thumb"><Images size={18}/></span>
              <span className="nv-icons-card-text"><strong>Mes packs d’icônes</strong><small>{project.icons.length} image{project.icons.length>1?'s':''} · packs Normal / Survol / Pressé</small></span></summary>
            <div className="nv-icons-card-body">
          <IconLibrary icons={project.icons} onImport={()=>iconInput.current?.click()}
            onCreateSet={createLibraryIconSet}
            onDeleteSet={async (ids,name)=>{if(!await confirmAsk('Supprimer définitivement le pack « '+name+' » et ses '+ids.length+' image(s) ? Si elles sont utilisées, leurs affectations dans la visite seront retirées. Les panoramas et les boutons resteront présents.'))return;deleteIcons(ids,true);setStatus('Pack « '+name+' » supprimé. Sauvegarde avec la disquette.');}}
            applyLabel={libraryFor?.startsWith('global-close')?'croix de fermeture':selectedBar?'bouton « '+selectedBar.title+' »':selected?'point « '+(selected.title||'sans titre')+' »':undefined}
            onApply={libraryFor?.startsWith('global-close')||selectedBar||selected?set=>{
              const patch={iconId:(set.normal??set.hover??set.pressed)?.id,hoverIconId:set.hover?.id,pressedIconId:set.pressed?.id};
              if(libraryFor?.startsWith('global-close')){setProject(p=>({...p,closeIconId:patch.iconId,closeIconHoverId:patch.hoverIconId,closeIconPressedId:patch.pressedIconId}));setStatus('Pack de croix appliqué : normal, survol et pressé.');}
              else if(selectedBar){patchBar({...patch,useCustomIcon:true});setStatus('Jeu « '+set.name+' » appliqué au bouton.');}
              else{patchPoint(patch);setStatus('Jeu « '+set.name+' » appliqué au point.');}
            }:undefined}/>
            </div>
          </details>
          </div>
          <small className="hint-inline nv-icons-save">Pense à enregistrer avec la disquette pour conserver ces réglages.</small>
        </div>}
      </aside>
    </div>
    {clientOpen&&<ClientsDirectory
      onOpenProject={async(projectId:string)=>{
        if(projectRef.current!==savedRef.current&&!await confirmAsk('Des modifications du projet actuel ne sont pas encore enregistrées. Ouvrir ce projet sans sauvegarder ces modifications ?'))return;
        try{const loaded=await openCloudProject(projectId,()=>{});writeLink(loaded.link);openCloudVisit(loaded.project,loaded.link);setClientOpen(false);}
        catch(e){setStatus('Ouverture impossible : '+(e instanceof Error?e.message:String(e)));}
      }}
      currentProjectName={project.name}
      currentProfile={project.clientProfile}
      canPlaceVideo={!!active} onPlaceVideo={placeClientVideo}
      onClose={()=>{setClientOpen(false);backFrom();}}
      onOpenCloud={()=>{setClientOpen(false);setCloudOpen(true);}}
      onLaunchAiAssistant={()=>{setClientOpen(false);setAiFreshClient(false);setAiAssistantOpen(true);}}
      currentStyle={project.barStyle}
      onUpdateCurrent={(profile,style)=>setProject(p=>({...p,...(profile?{clientProfile:profile}:{}),...(style?{barStyle:{...p.barStyle,...style}}:{})}))}
      onSaveDiscovered={(clientProfile,style)=>{
        setProject(p=>({...p,clientProfile,...(style?{barStyle:{...p.barStyle,...style}}:{})}));
        setPanel('client');pendingClientSaveRef.current=true;
        setStatus('Client « '+clientProfile.name+' » enregistré dans la visite…');
      }}
      onCreateVisit={async (clientProfile,style,visitName)=>{
        if((project.scenes.length||projectRef.current!==savedRef.current)&&!await confirmAsk('Créer une nouvelle visite pour « '+clientProfile.name+' » ? Pense à enregistrer ou exporter le projet actuel avant.'))return;
        // Le skin préféré de ce client est appliqué avant d'ouvrir la nouvelle
        // visite ; si le Cloud ne l'a plus, aucune visite vide ne remplace
        // silencieusement le projet actuel.
        void (async()=>{
          try{
            let fresh=newProject();
            if(clientProfile.preferredSkinId){
              const skin=(await cloudListSkins()).find(item=>item.id===clientProfile.preferredSkinId);
              if(!skin)throw Error('Skin du client introuvable dans ce compte Cloud.');
              fresh=applySkin({...fresh,bottomBar:[]},skin);
            }
            const name=visitName?.trim()||clientProfile.name||'Nouvelle visite';
            fresh={...fresh,name,clientProfile,
              ...(style?{barStyle:{...fresh.barStyle,...style}}:{})};
            setActiveSpaceId(null);setSpaceManagerOpen(false);
            setProject(fresh);setActiveId('');setSelectedId('');setMode(null);setPreview(false);setPreparationOpen(true);
            cloud.unlink();
            setStatus('Bien « '+name+' » préparé pour « '+clientProfile.name+' »'+(clientProfile.preferredSkinId?' avec son skin':'')+'. Ajoute les panoramas puis enregistre avec la disquette.');
          }catch(e){
            setStatus('Impossible de préparer ce bien avec le skin choisi : '+(e instanceof Error?e.message:String(e)));
          }
        })();
      }}
      onAssociate={clientProfile=>{
        setProject(p=>({...p,clientProfile}));
        setPanel('client');
        setStatus('Client « '+clientProfile.name+' » associé à la visite · Clique sur Enregistrer pour conserver ce lien.');
      }}
    />}
    <footer className="nv-app-footer"><span>NovaVisio Studio · Éditeur professionnel</span><span>{project.scenes.length} panoramas{project.scenes.some(sc=>sc.excluded)?' ('+project.scenes.filter(sc=>sc.excluded).length+' décoché'+(project.scenes.filter(sc=>sc.excluded).length>1?'s':'')+')':''} · {totalPoints} points</span><span className="nv-footer-build">Build {new Date(__NV_BUILD_TIME__).toLocaleString('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})} · Projets Cloud Supabase <button type="button" className="nv-footer-refresh" onClick={reloadToLatestVersion} disabled={savingManually} title="Recharger NovaStudio pour obtenir la dernière version">↻ Actualiser</button></span></footer>
    {toast&&<div className={'nv-toast'+(toast.error?' is-error':'')} role="status" aria-live="polite"><span>{toast.text}</span><button type="button" aria-label="Fermer la notification" onClick={()=>setToast(null)}><XMark/></button></div>}
    {/^(Enregistré dans le Cloud|Échec|Sauvegardé|Publication|Cloud déconnecté)/.test(status)&&<div className="nv-workflow-status" role="status"><span>{status}</span><button type="button" aria-label="Masquer le message" onClick={()=>setStatus('Prêt')}><XMark/></button></div>}
    {informationEdit&&(()=>{const point=project.scenes.find(scene=>scene.id===informationEdit.sceneId)?.hotspots.find(h=>h.id===informationEdit.pointId);return point?<InformationEditor point={point} onClose={()=>setInformationEdit(null)} onSave={patch=>setProject(p=>({...p,scenes:p.scenes.map(scene=>scene.id===informationEdit.sceneId?{...scene,hotspots:scene.hotspots.map(h=>h.id===informationEdit.pointId?{...h,...patch}:h)}:scene)}))}/>:null;})()}
    {publishReport&&<div className="nv-publish-overlay"><section role="alertdialog" aria-modal="true" aria-label="Résultat de la publication" className="nv-publish-warning">
      <h2>Résultat de la publication</h2>
      <ul className="nv-publish-check">{publishReport.length?publishReport.map((r,i)=><li key={i} className={r.ok?'is-warn':'is-error'}><span>{r.ok?'✅':'⛔'}</span><span>{r.text}</span></li>):<li className="is-error"><span>⛔</span><span>Rien n’a été publié (aucun lien public trouvé).</span></li>}</ul>
      <div><button type="button" onClick={()=>setPublishReport(null)}>OK</button></div></section></div>}
    {exportDialog&&<div className="overlay" {...overlayClose(()=>setExportDialog(null))}>
      <section className="modal nv-export-dialog" role="dialog" aria-modal="true" aria-label="Exporter un dossier HTML" onClick={e=>e.stopPropagation()}>
        <button className="close" onClick={()=>setExportDialog(null)}><XMark/></button>
        <h2>Que veux-tu exporter ?</h2>
        <p className="hint">Le dossier ne contiendra que les panoramas choisis. Les flèches qui mènent vers un autre espace sont retirées.</p>
        <div className="nv-export-choices" role="radiogroup">
          {exportChoices.map(c=><label key={c.id??'all'} className={'nv-export-choice'+(exportDialog.spaceId===c.id?' is-on':'')}>
            <input type="radio" name="export-scope" checked={exportDialog.spaceId===c.id} onChange={()=>setExportDialog({spaceId:c.id})}/>
            <span><b>{c.label}</b><small>{c.n} panorama{c.n>1?'s':''} · {c.night?c.night+' avec mode nuit':'sans mode nuit'}</small></span>
          </label>)}
        </div>
        <div className="nv-banner-actions">
          <button type="button" className="quiet" onClick={()=>setExportDialog(null)}>Annuler</button>
          <button type="button" className="primary" disabled={exporting} onClick={()=>{const id=exportDialog.spaceId;setExportDialog(null);void exportTour(id);}}>Exporter le dossier ZIP</button>
        </div>
      </section>
    </div>}
    {brandOpen&&<BrandKitDialog current={project.brandKit} onClose={()=>setBrandOpen(false)}
      iconCount={project.icons.length}
      onAddIcons={files=>{setProject(p=>({...p,icons:[...p.icons,...files.map(f=>({id:uid(),name:f.name.slice(0,150),dataUrl:f.dataUrl}))]}));setStatus(files.length+' icônes de charte ajoutées à « Mes icônes » · enregistre avec la disquette.');}}
      onApply={(patch,kit)=>{setProject(p=>({...p,barStyle:{...p.barStyle,...patch},brandKit:kit}));setStatus('Charte graphique appliquée à la barre du bas · enregistre avec la disquette.');}}/>}
    {aiAssistantOpen&&<NovaStudioAIAssistant project={project} freshClient={aiFreshClient} onClose={()=>setAiAssistantOpen(false)}
      onApply={(updated,clientProfile,brandKit,mode)=>{
        if(mode==='new'){
          const fresh=newProject();
          const created:StudioProject={
            ...fresh,
            ...updated,
            name:updated.name||clientProfile.name||'Nouvelle visite 360°',
            clientProfile,
            brandKit,
            scenes:[],
            spaces:[],
            updatedAt:new Date().toISOString(),
          };
          setActiveSpaceId(null);
          setSpaceManagerOpen(false);
          resetProject(created);
          setActiveId('');
          setSelectedId('');
          setMode(null);
          setPreview(false);
          cloud.unlink();
          setStatus('✨ Nouvelle visite « '+clientProfile.name+' » créée avec succès ! Tu peux maintenant ajouter tes panoramas 360°.');
        }else{
          setProject(p=>({...p,...updated,clientProfile,brandKit}));
          setStatus('NovaStudio AI : Visite « '+(updated.name||clientProfile.name)+' » mise à jour avec la charte.');
        }
      }}/>}
    {introPreview&&project.introDesign&&<div className="nv-native-intro-preview" role="presentation">
      <NativeIntro design={project.introDesign} cover={visibleScenes.find(scene=>scene.id===startSceneId(visibleScenes))?.dataUrl} durationSec={project.introDuration??6} onDone={endIntroPreview}/>
    </div>}
    {interestOpen&&<InterestDialog category={project.interestCategory} info={project.interestInfo??{}} points={project.interestPoints??[]}
      canPlace={!!activeId&&cameraRef.current.sceneId===activeId} onClose={()=>setInterestOpen(false)} onPlace={placeInterestPoint}
      onPatch={patch=>setProject(p=>({...p,...(patch.category!==undefined?{interestCategory:patch.category}:{}),...(patch.info!==undefined?{interestInfo:patch.info}:{}),...(patch.points!==undefined?{interestPoints:patch.points}:{})}))}/>}
    {summaryOpen&&<ProjectSummaryDialog project={project} onClose={()=>setSummaryOpen(false)} onPatch={fn=>{setProject(p=>({...p,...fn(p)}));setStatus('Traductions mises à jour · enregistre avec la disquette.');}}/>}
    {publishConfirm&&<div className="nv-publish-overlay"><section role="alertdialog" aria-modal="true" aria-label="Publier sur NovaVisio" className="nv-publish-warning"><h2>⚠ Attention : publication sur NovaVisio</h2><p>La mise à jour va s’appliquer sur NovaVisio. Le projet et les espaces déjà publiés seront actualisés pour les visiteurs. Les liens publics restent identiques.</p><p>Enregistrer seul ne publie plus les modifications.</p>
      {publishIssues.length===0?<p className="nv-publish-ok">✓ Contrôle automatique : rien d’anormal détecté.</p>:<>
        <p><b>Contrôle automatique : {publishIssues.length} point{publishIssues.length>1?'s':''} à vérifier</b></p>
        <ul className="nv-publish-check">{publishIssues.slice(0,40).map((is,i)=><li key={i} className={'is-'+is.level}><span>{is.level==='error'?'⛔':'⚠️'}</span><span>{is.text}</span>
          {is.sceneId&&<button type="button" onClick={()=>goToIssue(is)}>Corriger</button>}</li>)}</ul></>}
      <div><button type="button" onClick={()=>setPublishConfirm(false)}>Annuler</button><button type="button" onClick={()=>{setPublishConfirm(false);void manualSave(true)}}>{publishIssues.some(i=>i.level==='error')?'Publier quand même':'Confirmer la publication'}</button></div></section></div>}
    {panoModalId&&(()=>{
      const scene=project.scenes.find(sc=>sc.id===panoModalId);
      if(!scene)return null;
      return <PanoramaPreviewEditor key={scene.id} scene={scene} onDelete={()=>deleteScene(scene.id)} onClose={()=>setPanoModalId(null)}
        onSave={async (name,surfaceM2)=>{flushSync(()=>setProject(p=>({...p,scenes:p.scenes.map(sc=>sc.id===scene.id?{...sc,name,surfaceM2}:sc)})));return cloud.signedIn||readLink()?manualSave():persist(projectRef.current);}}>
        <FullscreenGalleryHoverPreview scene={scene} thumb={sceneThumbs[scene.id]}/>
      </PanoramaPreviewEditor>;
    })()}
    {preparationOpen&&<ProjectPreparation project={project} setProject={setProject} onImportPanoramas={addImages}
      onClose={()=>setPreparationOpen(false)} onFinish={()=>{setProject(p=>({...p,preparationComplete:true}));setPreparationOpen(false);setStatus('Projet préparé · Enregistre pour conserver tes réglages');}}/>}
    {skinsOpen&&<SkinLibrary project={project} setProject={setProject} onClose={()=>setSkinsOpen(false)}/>}
    {vrMenuOpen&&<VrMenuEditor project={project} setProject={setProject} onClose={()=>setVrMenuOpen(false)}/>}
    <input ref={placedMediaInput} hidden type="file" aria-label="Importer le média placé" onChange={e=>{
      const file=e.currentTarget.files?.[0],placement=pendingMediaPlacement.current;
      if(!file){e.currentTarget.dispatchEvent(new Event('cancel'));return;}
      pendingMediaPlacement.current=null;e.currentTarget.value='';if(!placement)return;
      if(placement.type==='image')void addFrameImage(file,placement);else void addVideo(file,placement);
    }}/>
    <input ref={upload} hidden type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>void addImages(e.target.files)}/>
    <input ref={spacePanoramasInput} hidden type="file" multiple accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
      aria-label="Importer plusieurs panoramas dans cet espace"
      onChange={e=>{const files=e.currentTarget.files;const spaceId=spacePanoramasTarget.current;spacePanoramasTarget.current=null;void addImages(files,spaceId);}}/>
    <input ref={stateIconInput} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>void importStateIcon(e.target.files?.[0])}/>
    <input ref={projectInput} hidden type="file" accept=".json,.nvstudio.json,application/json" onChange={e=>void openProject(e.target.files?.[0])}/>
    <input ref={iconInput} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={e=>void addIconFiles(e.target.files)}/>
    <input ref={replaceIconInput} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>void replaceIconEverywhere(e.target.files?.[0])}/>
    <input ref={videoInput} hidden type="file" accept="video/mp4,video/webm" onChange={e=>void addVideo(e.target.files?.[0])}/>
    <input ref={nightInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void importNightPanorama(e.target.files?.[0])}/>
    <input ref={audioInput} hidden type="file" accept="audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/x-wav,audio/webm,audio/mp4" onChange={e=>void addAudio(e.target.files?.[0])}/>
    {privateOpen&&<PrivatePanel project={stripExcluded({...project,clientProfile:undefined,comments:undefined})} space={currentSpace} onClose={()=>{setPrivateOpen(false);backFrom();}} onStatus={setStatus} onShared={(email,spaces)=>{pushNotif('👥','Projet « '+project.name+' » partagé avec '+email+' · '+spaces.join(', '));setProjectSharesUnread(n=>Math.min(99,n+1));}} syncNow={cloud.syncNow} syncState={cloud.state}/>}
    {shareOpen&&<SharePanel project={projectForSpaceExport(project,currentSpace,true)} space={currentSpace} onClose={()=>{setShareOpen(false);backFrom();}} onStatus={setStatus}/>}
    {cloudOpen&&<CloudPanel project={project} onClose={()=>setCloudOpen(false)} onOpenClients={()=>{setCloudOpen(false);setClientOpen(true);}} hasUnsavedChanges={projectRef.current!==savedRef.current} onStatus={setStatus}
      autoEnabled={cloud.enabled} onAutoChange={cloud.setEnabled} manualMode autoLabel={cloud.state.kind==='saved'?'Dernier envoi à '+new Date(cloud.state.at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):cloudLabel(cloud.state)}
      onOpen={openCloudVisit}/>}
    {saveWarning&&<div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setSaveWarning(null);}}>
      <section className="modal" role="alertdialog" aria-modal="true" aria-label="Sauvegarde impossible" onClick={e=>e.stopPropagation()}>
        <h2>⚠ Sauvegarde impossible</h2>
        <p>{saveWarning}</p>
        <p><strong>Aucune version cloud n’a été remplacée par cette tentative.</strong> Sauvegarde une copie locale avant de fermer cette fenêtre.</p>
        <button type="button" className="primary" onClick={()=>setSaveWarning(null)}>J’ai compris</button>
      </section>
    </div>}
    {help&&<div className="overlay" {...overlayClose(()=>setHelp(false))}><div className="modal" onClick={e=>e.stopPropagation()}>
      <button className="close" onClick={()=>setHelp(false)}><XMark/></button><h2>Guide NovaVisio Studio</h2>
      <p><b>1.</b> Importe des panoramas 360° au format équirectangulaire.</p>
      <p><b>2.</b> Choisis « Navigation » ou « Information », puis clique sur l’image pour placer le point.</p>
      <p><b>3.</b> Dans « Barre du bas », ajoute des boutons et choisis leur action. Dans « Mes icônes », importe tes PNG, WebP ou GIF.</p><p><b>4.</b> Paramètre les points et boutons dans la colonne de droite, puis teste en mode « Prévisualiser ».</p>
      <p><b>5.</b> Tes modifications sont sauvegardées dans ce navigateur. Exporte ton projet pour conserver une copie.</p>
      <p className="warning">Prototype : l’export HTML autonome n’est pas encore disponible. N’efface pas les données du navigateur sans exporter ton projet.</p>
      <button className="primary" onClick={()=>setHelp(false)}>Compris</button>
    </div></div>}
  </div>;
}
installErrorLog();
createRoot(document.getElementById('root')!).render(<ErrorBoundary label="éditeur"><App/><ConfirmHost/></ErrorBoundary>);
