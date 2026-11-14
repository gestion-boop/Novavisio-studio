export const VIDEO_MAX_BYTES = 45*1024*1024;
export type Corner = {x:number;y:number};
export type FrameCorners = {tl:Corner;tr:Corner;br:Corner;bl:Corner};
export type FrameSphericalCorners=[
  {yaw:number;pitch:number},{yaw:number;pitch:number},
  {yaw:number;pitch:number},{yaw:number;pitch:number}
];
export const defaultFrameCorners = ():FrameCorners => ({
  tl:{x:7,y:7},tr:{x:93,y:7},br:{x:93,y:93},bl:{x:7,y:93}
});
export const IMAGE_FRAME_STYLES = ['none','white','black','wood','gold','rounded'] as const;
export type ImageFrameStyle = typeof IMAGE_FRAME_STYLES[number];
export type Hotspot = {
  id:string;
  type:'navigation'|'information'|'lien'|'image'|'video';
  title:string;text:string;target:string;yaw:number;pitch:number;
  translations?: Partial<Record<'en'|'es'|'de'|'nl',string>>;
  iconId?:string;hoverIconId?:string;pressedIconId?:string;iconSize?:number;url?:string;
  mediaDisplay?:'popup'|'inline';
  fontFamily?:string;linkMode?:'embed'|'tab';
  imageDataUrl?:string;
  imageBounce?:boolean;
  imageFrameStyle?:ImageFrameStyle;
  videoDataUrl?:string;videoUrl?:string;videoAutoplay?:boolean;videoLoop?:boolean;videoOpenFullscreen?:boolean;
  /** Son de la télé prioritaire : la musique de fond s'efface (fondu) pendant la vidéo agrandie, puis revient. Actif par défaut. */
  videoMasterSound?:boolean;
  /** Auréole discrète autour d'un cadre cliquable (Aperçu et visite). Actif par défaut. */
  frameHalo?:boolean;
  /** Signal visuel autour d'un média cliquable. */
  frameSignalStyle?:'gold'|'soft'|'pulse'|'none';
  frameWidth?:number;frameHeight?:number;
  frameReferenceHeight?:number;
  frameReferenceZoom?:number;
  frameCorners?:FrameCorners;
  frameSphericalCorners?:FrameSphericalCorners;
  fadeOnClick?:boolean;
  // Flèche de navigation : vue d'arrivée dans le panorama de destination, propre à CETTE flèche.
  arrivalYaw?:number;arrivalPitch?:number;arrivalZoom?:number;arrivalZoomModel?:'wide';
};
export type CustomIcon = { id: string; name: string; dataUrl: string };
export type MusicTrack = {
  id:string; name:string; dataUrl?:string; url?:string;
  volume:number; loop:boolean;
};
export type BarStyle = {
  background: string;
  outline: string;
  button: string;
  buttonOutline: string;
  icon: string;
  dayNightColor?: string;
  outlineWidth: number;
  buttonOutlineWidth: number;
  roundness: number;
  width?: number;
  height?: number;
};
export const defaultBarStyle = ():BarStyle => ({
  background:'#c2c5c6', outline:'#987974',button:'#5d131a',
  buttonOutline:'#4a1518',icon:'#f4d69a',dayNightColor:'#2f72b4',
  outlineWidth:2,buttonOutlineWidth:1,roundness:60
});
/** Une vignette de la galerie : panorama + nom affiché (vide = nom du panorama). */
export type GalleryItem = { sceneId: string; label: string };
export type BottomBarItem = {
  id: string;
  title: string;
  type: 'navigation' | 'information' | 'lien' | 'gallery';
  gallery?: GalleryItem[];
  galleryTitle?: string;
  /** Photo de fond du panneau d'espaces : « scene:<id> » (un panorama) ou « space:<id> » (la couverture d'un espace). */
  galleryBackground?: string;
  /** Photo importée par l'utilisateur comme fond du panneau (image compressée) : prioritaire sur galleryBackground. */
  galleryBackgroundImage?: string;
  gallerySpaceIds?:string[];linkMode?:'embed'|'tab';fontFamily?:string;
  target: string;
  text: string;
  url: string;
  translations?: Partial<Record<'en'|'es'|'de'|'nl',string>>;
  iconId?: string;
  hoverIconId?: string;
  pressedIconId?: string;
  iconSize?: number;
  builtinIcon?: string;
};
// Single source of truth for the size of a bottom-bar button (editor, preview and exported tour).
export const BAR_ICON_DEFAULT = 48;
export const barIconSize = (item:{iconSize?:number}) => Math.max(20, Math.min(72, item.iconSize ?? BAR_ICON_DEFAULT));
export const defaultBar = ():BottomBarItem[] => [
  {id:crypto.randomUUID(),title:'Carte',type:'information',target:'',text:'',url:'',builtinIcon:'utensils'},
  {id:crypto.randomUUID(),title:'Photos',type:'information',target:'',text:'',url:'',builtinIcon:'images'},
  {id:crypto.randomUUID(),title:'Espaces',type:'navigation',target:'',text:'',url:'',builtinIcon:'grid'},
  {id:crypto.randomUUID(),title:'Appeler',type:'lien',target:'',text:'',url:'',builtinIcon:'phone'},
  {id:crypto.randomUUID(),title:'Informations',type:'information',target:'',text:'',url:'',builtinIcon:'info'},
];
export const isSafeIconDataUrl = (value: unknown): value is string =>
  typeof value === 'string' && /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value);
export const isSafeFrameImage = (value:unknown):value is string =>
  typeof value === 'string' && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
export const validateFrameCorners = (corners:unknown):corners is FrameCorners => {
  if (!corners || typeof corners !== 'object') return false;
  return (['tl','tr','br','bl'] as const).every(key=>{
    const v=(corners as Record<string,unknown>)[key] as Partial<Corner> | undefined;
    return !!v && typeof v.x==='number' && typeof v.y==='number' &&
      Number.isFinite(v.x) && Number.isFinite(v.y) && v.x>=-100 && v.x<=200 && v.y>=-100 && v.y<=200;
  });
};
export type Scene = {
  id:string;name:string;dataUrl:string;nightDataUrl?:string;nightSourceSceneId?:string;hotspots:Hotspot[];
  arrivalYaw?:number;arrivalPitch?:number;arrivalZoom?:number;arrivalZoomModel?:'wide';
  audioDataUrl?:string;audioUrl?:string;audioEnabled?:boolean;audioLoop?:boolean;audioVolume?:number;
  musicTrackId?:string;
  /** Panorama décoché : il reste dans le projet mais n'apparaît ni dans la visite publiée ni dans les exports. */
  excluded?:boolean;
};
export const isSafeVideoData = (s:unknown):s is string =>
  typeof s==='string' && /^data:video\/(?:mp4|webm);base64,[A-Za-z0-9+/=]+$/.test(s);
export const isSafeAudioData = (s:unknown):s is string =>
  typeof s==='string' && /^data:audio\/(?:mpeg|mp3|ogg|wav|webm|mp4|x-wav);base64,[A-Za-z0-9+/=]+$/.test(s);
export const isSafeMediaUrl = (s:unknown):s is string =>
  typeof s==='string' && s.length<=2048 && /^https:\/\/[^\s]+$/i.test(s);
export type ClientProfile = {novagenId:string;name:string;category:string;address:string;city:string;phone:string;email:string;website:string;facebook:string;instagram:string;otherLinks:string;description:string; bookingUrl?:string; openingHours?:string; services?:string; logoUrl?:string; photoUrls?:string[]; sourceNotes?:string[]};
export const emptyClientProfile=():ClientProfile=>({novagenId:'',name:'',category:'',address:'',city:'',phone:'',email:'',website:'',facebook:'',instagram:'',otherLinks:'',description:''});
export type StudioLanguage = 'fr'|'es'|'de'|'en'|'nl';
export const STUDIO_LANGUAGES:ReadonlyArray<{code:StudioLanguage;flag:string;name:string}>=[{code:'fr',flag:'🇫🇷',name:'Français'},{code:'es',flag:'🇪🇸',name:'Español'},{code:'de',flag:'🇩🇪',name:'Deutsch'},{code:'en',flag:'🇬🇧',name:'English'},{code:'nl',flag:'🇳🇱',name:'Nederlands'}];
export type DefaultNavigationIcon = {iconId:string;hoverIconId?:string;pressedIconId?:string;iconSize:number};
export type ImportedButtonSet = DefaultNavigationIcon & {id:string;name:string};
/** Commentaire d'équipe accroché à un endroit d'un panorama (jamais publié dans la visite). */
export type ProjectComment = {id:string;sceneId:string;yaw:number;pitch:number;text:string;author:string;at:number;done?:boolean;issueId?:string};
export type StudioProject = { version: 1; comments?:ProjectComment[]; defaultPhotoIcon?:DefaultNavigationIcon;defaultVideoIcon?:DefaultNavigationIcon; buttonSets?:ImportedButtonSet[]; preparationComplete?:boolean; defaultNavigationIcon?:DefaultNavigationIcon; defaultMusicTrackId?:string; iconPackId?:string; clientProfile?:ClientProfile; name: string; languages?:StudioLanguage[]; scenes: Scene[]; icons: CustomIcon[]; audioTracks: MusicTrack[]; bottomBar: BottomBarItem[]; barStyle: BarStyle; introUrl: string; introEnabled: boolean; introDuration: number; updatedAt: string; closeIconId?:string; soundOnIconId?:string; soundOnHoverIconId?:string; soundOnPressedIconId?:string; soundOffIconId?:string; soundOffHoverIconId?:string; soundOffPressedIconId?:string; hiddenIconSets?: string[]; hiddenAvailableIcons?:string[]; favoriteNavigationIconSet?:string; spaces?: {id:string;name:string;sceneIds:string[];coverDataUrl?:string}[] };

const DB_NAME = 'novavisio-studio-v1';
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('projects')) req.result.createObjectStore('projects'); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function loadProject(): Promise<StudioProject|null> {
  const db = await openDb();
  return new Promise((resolve,reject) => {
    const tx = db.transaction('projects','readonly');
    const request = tx.objectStore('projects').get('current');
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}
/** Le projet enregistré a été modifié ailleurs (autre onglet) depuis le dernier chargement/enregistrement de cet onglet. */
export class SaveConflictError extends Error {
  constructor(){super('Le projet a été modifié dans une autre fenêtre.');this.name='SaveConflictError';}
}
/**
 * Enregistre le projet SANS écraser silencieusement le travail d'un autre onglet : la lecture de la version
 * enregistrée et l'écriture se font dans la même transaction. `expected` = date (`updatedAt`) de la version que
 * cet onglet a chargée ou enregistrée en dernier ; si elle a changé entre-temps, rien n'est écrit (sauf `force`).
 * Renvoie la date de la version écrite.
 */
export async function saveProject(project:StudioProject,expected:string|null,force=false):Promise<string> {
  const db = await openDb();
  return new Promise((resolve,reject) => {
    const tx = db.transaction('projects','readwrite');
    const store = tx.objectStore('projects');
    const stamp = new Date().toISOString();
    const read = store.get('current');
    let conflict = false;
    read.onsuccess = () => {
      const current = read.result as {updatedAt?:string}|undefined;
      if (current && !force && (current.updatedAt ?? null) !== expected) {
        conflict = true;
        tx.abort();
        return;
      }
      store.put({...project,updatedAt:stamp},'current');
    };
    tx.oncomplete = () => { db.close(); resolve(stamp); };
    tx.onabort = () => { db.close(); reject(conflict ? new SaveConflictError() : (tx.error ?? new Error('Écriture annulée'))); };
    tx.onerror = () => { /* l'erreur est traitée dans onabort */ };
  });
}
export const newProject = ():StudioProject => ({version:1,name:'Ma première visite',scenes:[],icons:[],audioTracks:[],bottomBar:defaultBar(),barStyle:defaultBarStyle(),introUrl:'',introEnabled:false,introDuration:6,updatedAt:new Date().toISOString()});
export const uid = () => crypto.randomUUID();
export function readImage(file:File):Promise<string> {
  return new Promise((resolve,reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
export function validateProject(value:unknown):StudioProject {
  if (!value || typeof value !== 'object') throw new Error('Format de projet incorrect');
  const p = value as Partial<StudioProject>;
  if (p.version !== 1 || typeof p.name !== 'string' || !Array.isArray(p.scenes) || p.scenes.length > 500) throw new Error('Projet non reconnu');
  // Les anciens projets V0.1 n'ont pas encore de bibliothèque d'icônes.
  const icons = p.icons ?? [];
  if (!Array.isArray(icons) || icons.length > 150) throw new Error('Bibliothèque d’icônes non valide');
  for (const icon of icons) {
    if (!icon || typeof icon.id !== 'string' || typeof icon.name !== 'string' || icon.name.length > 150 || !isSafeIconDataUrl(icon.dataUrl) || icon.dataUrl.length > 3_000_000) {
      throw new Error('Icône importée non valide');
    }
  }
  const audioTracks = p.audioTracks ?? [];
  if(!Array.isArray(audioTracks) || audioTracks.length > 60) throw new Error('Bibliothèque de musique non valide');
  const ids=new Set<string>();
  for(const track of audioTracks){
    if(!track || typeof track.id!=='string'||!track.id||ids.has(track.id)||
      typeof track.name!=='string'||track.name.length>150||
      (track.dataUrl!==undefined && (track.dataUrl.length>34_000_000||!isSafeAudioData(track.dataUrl))) ||
      (track.url!==undefined && track.url!=='' && !isSafeMediaUrl(track.url)) ||
      !Number.isFinite(track.volume)||track.volume<0||track.volume>100||
      typeof track.loop!=='boolean') throw new Error('Piste musicale non valide');
    ids.add(track.id);
  }
  if(p.closeIconId!==undefined && (typeof p.closeIconId!=='string' || !icons.some(icon=>icon.id===p.closeIconId))) throw new Error('Icône de fermeture introuvable');
  for(const field of ['soundOnIconId','soundOnHoverIconId','soundOnPressedIconId','soundOffIconId','soundOffHoverIconId','soundOffPressedIconId'] as const){
    if(p[field]!==undefined && (typeof p[field]!=='string'||!icons.some(icon=>icon.id===p[field]))) throw new Error('Icône de son introuvable');
  }
  if(p.clientProfile!==undefined){
    if(!p.clientProfile||typeof p.clientProfile!=='object')throw new Error('Fiche client invalide');
    const profile=p.clientProfile as ClientProfile;
    for(const field of Object.keys(emptyClientProfile()) as (keyof ClientProfile)[]){
      if(typeof profile[field]!=='string'||profile[field].length>4000)throw new Error('Champ client invalide : '+field);
    }
  }
  if(p.clientProfile){
    const client=p.clientProfile as ClientProfile;
    for(const field of ['bookingUrl','openingHours','services','logoUrl'] as const){
      if(client[field]!==undefined&&(typeof client[field]!=='string'||client[field].length>4000))
        throw new Error('Informations NovaGen invalides : '+field);
    }
    for(const field of ['photoUrls','sourceNotes'] as const){
      if(client[field]!==undefined&&(!Array.isArray(client[field])||client[field].length>30||
        client[field].some(v=>typeof v!=='string'||v.length>2048)))
        throw new Error('Médias ou notes NovaGen invalides : '+field);
    }
  }
  // Les projets antérieurs à V0.4 reprennent automatiquement le thème Bordeaux.
  const barStyle = {...defaultBarStyle(),...(p.barStyle ?? {})};
  const isColor = (v:unknown)=>typeof v==='string' && /^#[0-9a-fA-F]{6}$/.test(v);
  if (!isColor(barStyle.background) || !isColor(barStyle.outline) ||
      !isColor(barStyle.button) || !isColor(barStyle.buttonOutline) || !isColor(barStyle.icon) || !isColor(barStyle.dayNightColor) ||
      !Number.isInteger(barStyle.outlineWidth) || barStyle.outlineWidth < 0 || barStyle.outlineWidth > 8 ||
      !Number.isInteger(barStyle.buttonOutlineWidth) || barStyle.buttonOutlineWidth < 0 || barStyle.buttonOutlineWidth > 8 ||
      !Number.isInteger(barStyle.roundness) || barStyle.roundness < 0 || barStyle.roundness > 60 ||
      (barStyle.width!==undefined && (!Number.isInteger(barStyle.width)||barStyle.width<0||barStyle.width>1400)) ||
      (barStyle.height!==undefined && (!Number.isInteger(barStyle.height)||barStyle.height<56||barStyle.height>160))) {
    throw new Error('Style de la barre non valide');
  }
  const introUrl = p.introUrl ?? '';
  const introEnabled = p.introEnabled ?? false;
  const introDuration = p.introDuration ?? 6;
  if(typeof introUrl !== 'string' || introUrl.length>2048 || typeof introEnabled !== 'boolean') throw new Error('Introduction de visite invalide');
  if(introUrl && !/^https:\/\/[^\s]+$/i.test(introUrl)) throw new Error('L’introduction doit commencer par https://');
  if(!Number.isFinite(introDuration)||introDuration<2||introDuration>60) throw new Error('Durée d’introduction invalide');
  const bottomBar = p.bottomBar ?? defaultBar();
  if(!Array.isArray(bottomBar) || bottomBar.length > 30) throw new Error('Barre d’icônes non valide');
  for(const item of bottomBar) {
    if (!item || typeof item.id !== 'string' || typeof item.title !== 'string' || item.title.length > 120 ||
      !['navigation','information','lien','gallery'].includes(item.type) ||
      (item.gallery !== undefined && (!Array.isArray(item.gallery) || item.gallery.length > 200 ||
        !item.gallery.every(g => g && typeof g.sceneId === 'string' && typeof g.label === 'string' && g.label.length <= 100))) ||
      (item.gallerySpaceIds!==undefined&&(!Array.isArray(item.gallerySpaceIds)||item.gallerySpaceIds.length>80||item.gallerySpaceIds.some(id=>typeof id!=='string'))) ||
      (item.linkMode!==undefined&&!['embed','tab'].includes(item.linkMode)) ||
      (item.fontFamily!==undefined&&(typeof item.fontFamily!=='string'||item.fontFamily.length>50)) ||
      (item.galleryTitle !== undefined && (typeof item.galleryTitle !== 'string' || item.galleryTitle.length > 100)) ||
      (item.galleryBackgroundImage !== undefined && (item.galleryBackgroundImage.length > 3_000_000 || !isSafeFrameImage(item.galleryBackgroundImage))) ||
      (item.galleryBackground !== undefined && (typeof item.galleryBackground !== 'string' || item.galleryBackground.length > 120)) ||
      typeof item.target !== 'string' || typeof item.text !== 'string' || typeof item.url !== 'string' ||
      item.url.length > 2048 || item.text.length > 8000 ||
      (item.translations!==undefined && (typeof item.translations!=='object' || item.translations===null || Object.entries(item.translations).some(([lang,txt])=>!['en','es','de','nl'].includes(lang)||typeof txt!=='string'||txt.length>8000))) ||
      (item.iconId !== undefined && (typeof item.iconId !== 'string' || !icons.some(icon => icon.id === item.iconId))) ||
      (item.hoverIconId !== undefined && (typeof item.hoverIconId !== 'string' || !icons.some(icon => icon.id === item.hoverIconId))) ||
      (item.pressedIconId !== undefined && (typeof item.pressedIconId !== 'string' || !icons.some(icon => icon.id === item.pressedIconId))) ||
      (item.iconSize !== undefined && (!Number.isFinite(item.iconSize) || item.iconSize < 20 || item.iconSize > 100)) ||
      (item.builtinIcon !== undefined && typeof item.builtinIcon !== 'string')
    ) throw new Error('Bouton de la barre non valide');
  }
  for (const scene of p.scenes) {
    if (!scene || typeof scene.id !== 'string' || typeof scene.name !== 'string' || typeof scene.dataUrl !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(scene.dataUrl) || !Array.isArray(scene.hotspots)) throw new Error('Scène non valide');
    if (scene.hotspots.length > 1000) throw new Error('Trop de points dans cette scène');
    if(scene.nightDataUrl!==undefined && (!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(scene.nightDataUrl) || scene.nightDataUrl.length>85_000_000)) throw new Error('Panorama de nuit invalide');
    if(scene.nightSourceSceneId!==undefined && (typeof scene.nightSourceSceneId!=='string'||scene.nightSourceSceneId===scene.id||!p.scenes.some(other=>other.id===scene.nightSourceSceneId))) throw new Error('Panorama de nuit sélectionné introuvable');
    if(scene.musicTrackId!==undefined && (typeof scene.musicTrackId!=='string'||!ids.has(scene.musicTrackId)))
      throw new Error('Musique du panorama introuvable');
    if((scene.arrivalYaw!==undefined && (!Number.isFinite(scene.arrivalYaw)||Math.abs(scene.arrivalYaw)>100)) ||
       (scene.arrivalPitch!==undefined && (!Number.isFinite(scene.arrivalPitch)||Math.abs(scene.arrivalPitch)>Math.PI/2+0.001)) ||
       (scene.arrivalZoom!==undefined && (!Number.isFinite(scene.arrivalZoom)||scene.arrivalZoom<0||scene.arrivalZoom>100)) ||
       (scene.arrivalZoomModel!==undefined && scene.arrivalZoomModel!=='wide')
    ) throw new Error('Vue d’arrivée invalide');
    if ((scene.audioDataUrl !== undefined && (scene.audioDataUrl.length > 34_000_000 || !isSafeAudioData(scene.audioDataUrl))) ||
        (scene.audioUrl !== undefined && scene.audioUrl !== '' && !isSafeMediaUrl(scene.audioUrl)) ||
        (scene.audioEnabled !== undefined && typeof scene.audioEnabled !== 'boolean') ||
        (scene.audioLoop !== undefined && typeof scene.audioLoop !== 'boolean') ||
        (scene.audioVolume !== undefined && (!Number.isFinite(scene.audioVolume) || scene.audioVolume<0 || scene.audioVolume>100))
       ) throw new Error('Piste audio non valide');
    for (const h of scene.hotspots) {
      if (!h || typeof h.id !== 'string' || !['navigation','information','lien','image','video'].includes(h.type) || typeof h.title !== 'string' || typeof h.text !== 'string' || typeof h.target !== 'string' || !Number.isFinite(h.yaw) || !Number.isFinite(h.pitch) ||
        (h.iconId !== undefined && (typeof h.iconId !== 'string' || !icons.some(icon=>icon.id===h.iconId))) ||
        (h.hoverIconId !== undefined && (typeof h.hoverIconId !== 'string' || !icons.some(icon=>icon.id===h.hoverIconId))) ||
        (h.pressedIconId !== undefined && (typeof h.pressedIconId !== 'string' || !icons.some(icon=>icon.id===h.pressedIconId))) ||
        (h.arrivalYaw !== undefined && (!Number.isFinite(h.arrivalYaw) || Math.abs(h.arrivalYaw) > 100)) ||
        (h.arrivalPitch !== undefined && (!Number.isFinite(h.arrivalPitch) || Math.abs(h.arrivalPitch) > Math.PI/2 + 0.001)) ||
        (h.arrivalZoom !== undefined && (!Number.isFinite(h.arrivalZoom) || h.arrivalZoom < 0 || h.arrivalZoom > 100)) ||
        (h.arrivalZoomModel !== undefined && h.arrivalZoomModel !== 'wide') ||
        (h.iconSize !== undefined && (typeof h.iconSize !== 'number' || h.iconSize < 16 || h.iconSize > 120)) ||
        (h.url !== undefined && (typeof h.url !== 'string' || h.url.length > 2048)) ||
        (h.imageDataUrl !== undefined && (h.imageDataUrl.length > 12_000_000 || !isSafeFrameImage(h.imageDataUrl))) ||
        (h.fontFamily!==undefined&&(typeof h.fontFamily!=='string'||h.fontFamily.length>50)) ||
        (h.linkMode!==undefined&&!['embed','tab'].includes(h.linkMode)) ||
        (h.mediaDisplay !== undefined && !['popup','inline'].includes(h.mediaDisplay)) ||
        (h.imageBounce !== undefined && typeof h.imageBounce !== 'boolean') ||
        (h.imageFrameStyle !== undefined && !IMAGE_FRAME_STYLES.includes(h.imageFrameStyle)) ||
        (h.videoDataUrl !== undefined && (h.videoDataUrl.length > Math.ceil(VIDEO_MAX_BYTES/3)*4+64 || !isSafeVideoData(h.videoDataUrl))) ||
        (h.videoUrl !== undefined && h.videoUrl !== '' && !isSafeMediaUrl(h.videoUrl)) ||
        (h.videoAutoplay !== undefined && typeof h.videoAutoplay !== 'boolean') ||
        (h.videoLoop !== undefined && typeof h.videoLoop !== 'boolean') ||
        (h.videoOpenFullscreen !== undefined && typeof h.videoOpenFullscreen !== 'boolean') ||
        (h.frameWidth !== undefined && (!Number.isFinite(h.frameWidth) || h.frameWidth < 80 || h.frameWidth > 900)) ||
        (h.frameHeight !== undefined && (!Number.isFinite(h.frameHeight) || h.frameHeight < 60 || h.frameHeight > 700)) ||
        (h.frameReferenceHeight !== undefined && (!Number.isFinite(h.frameReferenceHeight) || h.frameReferenceHeight < 100 || h.frameReferenceHeight > 3000)) ||
        (h.frameReferenceZoom !== undefined && (!Number.isFinite(h.frameReferenceZoom) || h.frameReferenceZoom < 0 || h.frameReferenceZoom > 100)) ||
        (h.frameCorners !== undefined && !validateFrameCorners(h.frameCorners)) ||
        (h.frameSphericalCorners !== undefined && (
          !Array.isArray(h.frameSphericalCorners)||h.frameSphericalCorners.length!==4||
          !h.frameSphericalCorners.every(p=>p && Number.isFinite(p.yaw) && Math.abs(p.yaw)<100 &&
            Number.isFinite(p.pitch) && Math.abs(p.pitch)<=Math.PI/2+0.001)
        )) ||
        (h.fadeOnClick !== undefined && typeof h.fadeOnClick !== 'boolean')
      ) throw new Error('Point interactif non valide');
    }
  }
  // Jeux d'icônes que l'utilisateur a retirés de la liste de suggestions (n'affecte aucun bouton ni point).
  if(p.comments!==undefined){
    if(!Array.isArray(p.comments)||p.comments.length>500)throw new Error('Commentaires invalides');
    for(const c of p.comments){
      if(!c||typeof c.id!=='string'||typeof c.sceneId!=='string'||typeof c.text!=='string'||c.text.length>2000||typeof c.author!=='string'||c.author.length>100||(c.issueId!==undefined&&(typeof c.issueId!=='string'||c.issueId.length>300))||
        !Number.isFinite(c.yaw)||!Number.isFinite(c.pitch)||!Number.isFinite(c.at))throw new Error('Commentaire invalide');
    }
  }
  // Additive model: legacy visits have no spaces and remain intact.
  const spaces=p.spaces??[];
  if(!Array.isArray(spaces)||spaces.length>80)throw new Error('Espaces invalides');
  const sceneIds=new Set(p.scenes.map(scene=>scene.id));
  const spaceIds=new Set<string>();
  for(const space of spaces){
    if(!space||typeof space.id!=='string'||!space.id||space.id.length>100||spaceIds.has(space.id)||
       typeof space.name!=='string'||!space.name.trim()||space.name.length>100||
       (space.coverDataUrl!==undefined&&(space.coverDataUrl.length>3_000_000||!isSafeFrameImage(space.coverDataUrl))) ||
       !Array.isArray(space.sceneIds)||space.sceneIds.length>p.scenes.length||
       new Set(space.sceneIds).size!==space.sceneIds.length||
       space.sceneIds.some((id:unknown)=>typeof id!=='string'||!sceneIds.has(id as string)))
       throw new Error('Un espace contient des références de panoramas invalides');
    spaceIds.add(space.id);
  }
  const languages=p.languages===undefined?(p.name?.toLowerCase().includes('figurotta')?STUDIO_LANGUAGES.map(l=>l.code):['fr' as StudioLanguage]):p.languages;
  if(!Array.isArray(languages)||!languages.length||languages.length>5||new Set(languages).size!==languages.length||languages.some(code=>!STUDIO_LANGUAGES.some(l=>l.code===code)))throw new Error('Langues du projet invalides');
  if(p.preparationComplete!==undefined && typeof p.preparationComplete!=='boolean')throw new Error('Préparation de projet invalide');
  if(p.defaultMusicTrackId!==undefined&&!audioTracks.some(t=>t.id===p.defaultMusicTrackId))throw new Error('Musique par défaut introuvable');
  for(const media of [p.defaultPhotoIcon,p.defaultVideoIcon]){
    if(media&&(typeof media!=='object'||!icons.some(i=>i.id===media.iconId)||[media.hoverIconId,media.pressedIconId].some(id=>id!==undefined&&!icons.some(i=>i.id===id))||!Number.isFinite(media.iconSize)||media.iconSize<16||media.iconSize>80))throw new Error('Icône de média par défaut invalide');
  }
  const nav=p.defaultNavigationIcon;
  if(nav && (typeof nav!=='object'||!icons.some(i=>i.id===nav.iconId)||[nav.hoverIconId,nav.pressedIconId].some(id=>id!==undefined&&!icons.some(i=>i.id===id))||!Number.isFinite(nav.iconSize)||nav.iconSize<16||nav.iconSize>80))throw new Error('Icône de navigation par défaut invalide');
  if(p.iconPackId!==undefined&&(typeof p.iconPackId!=='string'||p.iconPackId.length>100))throw new Error('Collection d’icônes invalide');
  if(p.buttonSets!==undefined){
    if(!Array.isArray(p.buttonSets)||p.buttonSets.length>150)throw new Error('Bibliothèque de boutons invalide');
    const buttonIds=new Set<string>();
    for(const set of p.buttonSets){
      if(!set||typeof set.id!=='string'||!set.id||buttonIds.has(set.id)||typeof set.name!=='string'||!set.name.trim()||set.name.length>100||!icons.some(i=>i.id===set.iconId)||[set.hoverIconId,set.pressedIconId].some(id=>id!==undefined&&!icons.some(i=>i.id===id))||!Number.isFinite(set.iconSize)||set.iconSize<20||set.iconSize>72)throw new Error('Bouton importé invalide');
      buttonIds.add(set.id);
    }
  }
  const hiddenIconSets = Array.isArray(p.hiddenIconSets) ? p.hiddenIconSets.filter(k => typeof k === 'string' && k.length < 600).slice(0, 300) : undefined;
  const hiddenAvailableIcons=Array.isArray(p.hiddenAvailableIcons)?p.hiddenAvailableIcons.filter(id=>typeof id==='string'&&icons.some(icon=>icon.id===id)).slice(0,300):undefined;
  const favoriteNavigationIconSet=typeof p.favoriteNavigationIconSet==='string'&&p.favoriteNavigationIconSet.length<600?p.favoriteNavigationIconSet:undefined;
  return {...p,version:1,name:p.name,languages,scenes:p.scenes,icons,audioTracks,bottomBar,barStyle,closeIconId:p.closeIconId,introUrl,introEnabled,introDuration,spaces,hiddenIconSets,hiddenAvailableIcons,favoriteNavigationIconSet,updatedAt:typeof p.updatedAt==='string'?p.updatedAt:new Date().toISOString()};
}

/**
 * Panoramas larger than 8192 px wide exceed the texture budget of many GPUs/phones and make
 * rotation stutter. Larger images are downscaled once at import; smaller files are kept untouched.
 */
export const MAX_PANORAMA_WIDTH = 8192;
export async function readPanorama(file:File):Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    try {
      if (bitmap.width <= MAX_PANORAMA_WIDTH) return await readImage(file);
      const ratio = MAX_PANORAMA_WIDTH / bitmap.width;
      const canvas = document.createElement('canvas');
      canvas.width = MAX_PANORAMA_WIDTH;
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      const ctx = canvas.getContext('2d');
      if (!ctx) return await readImage(file);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.9);
    } finally { bitmap.close(); }
  } catch {
    return readImage(file);
  }
}

/* ---------- Fichiers projet volumineux (.nvstudio.json) ----------
 * Un navigateur ne peut pas manipuler un texte de plus de ~512 Mo d'un seul bloc ; un projet avec beaucoup de grands panoramas
 * dépasse vite cette taille. Écriture et lecture se font donc par morceaux, sans jamais créer une chaîne géante.
 * Le format du fichier reste le même JSON qu'avant : les anciens fichiers restent lisibles, et ceux-ci aussi par les anciennes versions.
 */
export const MAX_PROJECT_FILE_BYTES = 1_500_000_000;
const MEDIA_MIN_LENGTH = 4096;

/** Morceaux de texte JSON du projet, à passer à `new Blob(parts)`. Chaque média (data:…) reste une chaîne à part. */
export function projectJsonParts(project: unknown): string[] {
  const media: string[] = [];
  const skeleton = JSON.stringify(project, (_key, value) => {
    if (typeof value === 'string' && value.length > MEDIA_MIN_LENGTH && value.startsWith('data:')) {
      media.push(value);
      return '@@NVMEDIA' + (media.length - 1) + '@@';
    }
    return value;
  });
  const parts: string[] = [];
  const re = /"@@NVMEDIA(\d+)@@"/g;
  let last = 0, match: RegExpExecArray | null;
  while ((match = re.exec(skeleton))) {
    parts.push(skeleton.slice(last, match.index) + '"');
    parts.push(media[Number(match[1])]);
    last = match.index + match[0].length - 1; // le guillemet fermant démarre le morceau suivant
  }
  parts.push(skeleton.slice(last));
  return parts;
}

/** Lit un fichier projet de n'importe quelle taille (jusqu'à 1,5 Go) en flux, avec progression en pourcentage. */
export async function readProjectFile(file: File, onProgress?: (percent: number) => void): Promise<unknown> {
  if (file.size > MAX_PROJECT_FILE_BYTES) {
    throw new Error('Fichier trop volumineux (' + Math.round(file.size / 1e6) + ' Mo, maximum ' + Math.round(MAX_PROJECT_FILE_BYTES / 1e6) + ' Mo)');
  }
  const START = ':"data:';
  const reader = file.stream().getReader();
  const decoder = new TextDecoder('utf-8');
  const skeleton: string[] = [];
  const media: string[] = [];
  const st = { mode: 'out' as 'out' | 'media' };
  let pending = '';
  let current: string[] = [];
  let read = 0, lastPercent = -1;
  const feed = (chunk: string) => {
    let text = pending + chunk;
    pending = '';
    while (text.length) {
      if (st.mode === 'out') {
        const i = text.indexOf(START);
        if (i < 0) {
          const keep = Math.min(START.length - 1, text.length);
          skeleton.push(text.slice(0, text.length - keep));
          pending = text.slice(text.length - keep);
          text = '';
        } else {
          skeleton.push(text.slice(0, i + 2) + '@@NVMEDIA' + media.length + '@@');
          text = text.slice(i + 2); // commence par « data: » : c'est la valeur du média
          st.mode = 'media';
          current = [];
        }
      } else {
        const q = text.indexOf('"');
        if (q < 0) { current.push(text); text = ''; }
        else {
          current.push(text.slice(0, q));
          media.push(current.join(''));
          current = [];
          text = text.slice(q); // le guillemet fermant revient dans le squelette
          st.mode = 'out';
        }
      }
    }
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    read += value.byteLength;
    const percent = Math.min(99, Math.floor((read / Math.max(1, file.size)) * 100));
    if (onProgress && percent !== lastPercent) { lastPercent = percent; onProgress(percent); }
    feed(decoder.decode(value, { stream: true }));
  }
  feed(decoder.decode());
  if (st.mode === 'media') throw new Error('Fichier incomplet ou tronqué');
  skeleton.push(pending);
  const root = JSON.parse(skeleton.join(''));
  const restore = (v: unknown): unknown => {
    if (typeof v === 'string') {
      const m = /^@@NVMEDIA(\d+)@@$/.exec(v);
      return m && Number(m[1]) < media.length ? media[Number(m[1])] : v;
    }
    if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) v[i] = restore(v[i]); return v; }
    if (v && typeof v === 'object') { const o = v as Record<string, unknown>; for (const k of Object.keys(o)) o[k] = restore(o[k]); return o; }
    return v;
  };
  return restore(root);
}
