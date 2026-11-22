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
  /** Navigation vers un espace existant du même projet : sa première scène est résolue à l'ouverture. */
  targetSpaceId?:string;
  /** Vue d'arrivée réglée à la main sur cette flèche : seule cette vue passe avant « Vue d’arrivée » du panorama. */
  arrivalCustom?:boolean;
  translations?: Partial<Record<'en'|'es'|'de'|'nl'|'it',string>>;
  /** Titre dans les autres langues. */
  titleTranslations?: Partial<Record<'en'|'es'|'de'|'nl'|'it',string>>;
  /** Style d'ouverture propre à ce point (sinon : réglage général des Paramètres). */
  openAnimation?: WindowAnimation;
  iconId?:string;hoverIconId?:string;pressedIconId?:string;iconSize?:number;/** Flèche « Sphère » : boule 3D qui tourne et montre le panorama de destination (diamètre = iconSize). */sphere?:boolean;/** Contour de la sphère : couleur (#rrggbb) et intensité 0-100. */sphereRimColor?:string;sphereRimIntensity?:number;/** Photo hébergée ailleurs (https) : affichée en fenêtre. */imageUrl?:string;/** Vidéo à lire dans un lecteur intégré (ex. Google Drive). */videoEmbed?:string;url?:string;
  mediaDisplay?:'popup'|'inline';
  fontFamily?:string;linkMode?:'embed'|'tab';
  imageDataUrl?:string;
  imageBounce?:boolean;
  imageFrameStyle?:ImageFrameStyle;
  videoDataUrl?:string;videoUrl?:string;/** Volume de la vidéo en pourcentage (0 à 100, défaut 100). */videoVolume?:number;videoAutoplay?:boolean;videoLoop?:boolean;videoOpenFullscreen?:boolean;
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
/** Lien vers une photo ou une vidéo hébergée hors Supabase (Google Drive, kDrive…). */
export type MediaLinkItem = {id:string;kind:'photo'|'video';name:string;url:string;provider:'local'|'gdrive'|'kdrive'|'web';/** Fichier importé depuis l'ordinateur (provider « local ») : données du média. */data?:string};
export type CustomIcon = { id: string; name: string; dataUrl: string };
export type MusicTrack = {
  id:string; name:string; dataUrl?:string; url?:string;
  volume:number; loop:boolean;
};
export type BarStyle = {
  background: string;
  outline: string;
  button: string;
  useBarGlyphs?: boolean;
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
  useBarGlyphs:false,
  background:'#c2c5c6', outline:'#987974',button:'#5d131a',
  buttonOutline:'#4a1518',icon:'#f4d69a',dayNightColor:'#2f72b4',
  outlineWidth:2,buttonOutlineWidth:1,roundness:60
});
/** Une couleur sélectionnée manuellement utilise les pictogrammes intégrés.
 * Les images du pack restent disponibles pour rétablir son apparence.
 */
export function updateBarStyle(style:BarStyle,update:Partial<BarStyle>):BarStyle {
  const editsButton=update.button!==undefined||update.buttonOutline!==undefined||
    update.buttonOutlineWidth!==undefined||update.icon!==undefined;
  return {...style,...update,useBarGlyphs:update.useBarGlyphs??(editsButton||style.useBarGlyphs===true)};
}

/** Une vignette de la galerie : panorama + nom affiché (vide = nom du panorama). */
export type GalleryItem = { sceneId: string; label: string };
export const barUsesIconImage=(style:BarStyle,item:BottomBarItem)=>!style.useBarGlyphs||item.useCustomIcon===true;

export type BottomBarItem = {
  useCustomIcon?: boolean;
  id: string;
  /** Zoom de l'icône dans son bouton (100–250 %) : compense les marges transparentes de l'image. */
  iconZoom?: number;
  title: string;
  titleTranslations?: Partial<Record<'en'|'es'|'de'|'nl',string>>;
  /** Style d'ouverture propre à ce bouton (sinon : réglage général des Paramètres). */
  openAnimation?: WindowAnimation;
  type: 'navigation' | 'information' | 'lien' | 'gallery' | 'photos' | 'plan';
  /** Type « photos » : galerie de photos / vidéos affichée en grand (copies des éléments choisis dans la bibliothèque Photos & Vidéos). */
  photos?: MediaLinkItem[];
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
  translations?: Partial<Record<'en'|'es'|'de'|'nl'|'it',string>>;
  iconId?: string;
  hoverIconId?: string;
  pressedIconId?: string;
  iconSize?: number;
  builtinIcon?: string;
};
// Single source of truth for the size of a bottom-bar button (editor, preview and exported tour).
export const BAR_ICON_DEFAULT = 48;
/** Animations d'ouverture des fenêtres d'information (choisies par l'auteur du projet). */
export const WINDOW_ANIMATIONS = [
  {id:'fade',label:'Fondu'},
  {id:'unfold',label:'Déploiement (la fenêtre s’ouvre depuis une fine barre)'},
  {id:'slide',label:'Glissement depuis le bas'},
  {id:'zoom',label:'Zoom (grossit depuis le centre)'},
  {id:'drop',label:'Chute depuis le haut, avec rebond'},
  {id:'fly',label:'Envol : part de l’endroit cliqué, petit, et grossit en se déplaçant'},
  {id:'swing-left',label:'Zoom depuis le fond avec un virage vers la gauche'},
  {id:'swing-right',label:'Zoom depuis le fond avec un virage vers la droite'},
  {id:'rise',label:'Montée depuis le bas de l’écran'},
  {id:'soft',label:'Fondu doux (flou vers net)'},
] as const;
export type WindowAnimation = typeof WINDOW_ANIMATIONS[number]['id'];
/** One lock for the bar: its height always follows the biggest button (button + 16 px of air). */
export const barHeightFor = (items:{iconSize?:number}[]) => Math.max(56, Math.min(160, Math.max(BAR_ICON_DEFAULT, ...items.map(i=>barIconSize(i))) + 18));
export const withBarSize = <T extends {bottomBar:BottomBarItem[];barStyle:BarStyle}>(p:T,size:number):T => {
  const bottomBar=p.bottomBar.map(b=>({...b,iconSize:size}));
  return {...p,bottomBar,barStyle:{...p.barStyle,height:Math.max(56,Math.min(160,size+18))}};
};
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
/** Reflet de soleil d'un panorama : position du soleil (degrés), intensité 0–1, longueur des rayons (px), orientation (degrés), nombre de rayons. */
export type SunFlare = {yaw:number;pitch:number;intensity:number;length:number;orientation:number;rays:number};
export type Scene = {
  id:string;name:string;
  /** Superficie réelle de la pièce en m² ; ne pas déduire d'une photographie. */
  surfaceM2?:number;
  /** Rectangle avec le nom de la pièce, dans la visite immersive : true/false imposé pour ce panorama ; absent = réglage du dossier (espace), sinon affiché. */
  showRoomName?:boolean;
  /** Idem dans le casque (VR). */
  showRoomNameVr?:boolean;
  sunFlare?:SunFlare;
  /** Nom du panorama dans les autres langues de la visite (le français reste dans « name »). */
  nameTranslations?:Partial<Record<'en'|'es'|'de'|'nl',string>>;
  dataUrl:string;nightDataUrl?:string;nightSourceSceneId?:string;/** Vue enregistrée pour le mode nuit (le panorama de nuit s'ouvre dessus). */nightYaw?:number;nightPitch?:number;nightZoom?:number;hotspots:Hotspot[];
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
export const isSafeMediaLinkItem=(m:MediaLinkItem):boolean=>!!m&&typeof m.id==='string'&&['photo','video'].includes(m.kind)&&typeof m.name==='string'&&m.name.length<=200&&['local','gdrive','kdrive','web'].includes(m.provider)&&
  (m.provider==='local'?(m.kind==='photo'?isSafeFrameImage(m.data)&&m.data.length<=12_000_000:isSafeVideoData(m.data)&&m.data.length<=Math.ceil(VIDEO_MAX_BYTES/3)*4+64):isSafeMediaUrl(m.url));
export const isSafeMediaUrl = (s:unknown):s is string =>
  typeof s==='string' && s.length<=2048 && /^https:\/\/[^\s]+$/i.test(s);
export type ClientProfile = {novagenId:string;name:string;category:string;address:string;city:string;phone:string;email:string;website:string;facebook:string;instagram:string;otherLinks:string;description:string; bookingUrl?:string; openingHours?:string; services?:string; logoUrl?:string; photoUrls?:string[]; sourceNotes?:string[];preferredSkinId?:string;activityCategory?:string;stylePreference?:string;visitType?:'classic'|'premium'|'vr'|'hybrid';brandLibraryId?:string};
export const emptyClientProfile=():ClientProfile=>({novagenId:'',name:'',category:'',address:'',city:'',phone:'',email:'',website:'',facebook:'',instagram:'',otherLinks:'',description:''});
export type StudioLanguage = 'fr'|'es'|'de'|'en'|'nl'|'it';
export const STUDIO_LANGUAGES:ReadonlyArray<{code:StudioLanguage;flag:string;name:string}>=[{code:'fr',flag:'🇫🇷',name:'Français'},{code:'en',flag:'🇬🇧',name:'English'},{code:'es',flag:'🇪🇸',name:'Español'},{code:'de',flag:'🇩🇪',name:'Deutsch'},{code:'nl',flag:'🇳🇱',name:'Nederlands'},{code:'it',flag:'🇮🇹',name:'Italiano'}];
export type DefaultNavigationIcon = {iconId:string;hoverIconId?:string;pressedIconId?:string;iconSize:number};
export type ImportedButtonSet = DefaultNavigationIcon & {id:string;name:string};
/** Commentaire d'équipe accroché à un endroit d'un panorama (jamais publié dans la visite). */
export type ProjectComment = {id:string;sceneId:string;yaw:number;pitch:number;text:string;author:string;at:number;done?:boolean;issueId?:string};
/** Positions in percentages of the plan image, independent of screen size. */
export type FloorPlanPoint = {sceneId:string;x:number;y:number};
export type FloorPlan = {id?:string;imageDataUrl:string;name:string;points:FloorPlanPoint[];/** Espace auquel appartient le plan, absent pour un plan du projet principal (anciens plans inclus). */spaceId?:string};
/** Compatibilité : les anciennes visites n'ont qu'un floorPlan.
 * Le tableau floorPlans devient la source de vérité dès sa création. */
export function getFloorPlans(project:Pick<StudioProject,'floorPlan'|'floorPlans'>):FloorPlan[]{
  if(Array.isArray(project.floorPlans))return project.floorPlans;
  return project.floorPlan?[project.floorPlan]:[];
}
export function withFloorPlans<T extends StudioProject>(project:T,plans:FloorPlan[]):T{
  return {...project,floorPlans:plans,floorPlan:plans[0]} as T;
}
export type GlossyStyle = {base:string;rim?:string;gloss:number;shadow:number};
/** Interface jaune du casque : actions de chaque colonne, dans l'ordre. `autoOpen` : s'ouvre dès l'entrée dans le casque. */
export type VrMenuConfig = {left:string[];right:string[];autoOpen?:boolean;/** Cadre et boutons aux couleurs de la barre du bas (au lieu du jaune). */themed?:boolean};
import type {BrandKit} from './brandKit';
import {validateIntroDesign,type IntroDesign} from './introDesign';
import type {InterestCategory,VerifiedInfo,Suggestion} from './interestPoints';
export type StudioProject = { version: 1; /** Charte graphique NovaStudio AI (optionnelle, phase 1). */ brandKit?: BrandKit; /** Introduction native NovaStudio AI (phase 3) ; l'URL externe reste prioritaire. */ introDesign?: IntroDesign; /** Points d'information NovaStudio AI (phase 4) : catégorie, infos vérifiées, décisions. */ interestCategory?: InterestCategory; interestInfo?: VerifiedInfo; interestPoints?: Suggestion[]; /** Traductions relues et validées par l'utilisateur (module 8). */ translationsValidated?: boolean; /** Masque le rectangle avec le nom des pièces partout dans la visite immersive (prioritaire sur les réglages des dossiers et des panoramas). */ hideRoomNames?:boolean; /** Idem dans le casque. */ hideRoomNamesVr?:boolean; /** Durée du fondu entre deux panoramas, en ms (0 = instantané, défaut 200). */ transitionMs?:number; /** Couleur (#rrggbb) des croix de fermeture de toute la visite ; absent = couleur des boutons de la barre. */ closeButtonColor?:string; /** Affiche les raccourcis de la barre du bas (Photos, Informations, Galerie…) dans la fenêtre du plan (défaut : oui). */ planShortcuts?:boolean; /** Couleur (#rrggbb) du pictogramme des croix ; absent = blanc ou foncé selon le fond. */ closeButtonInk?:string; windowAnimation?: WindowAnimation; /** Hauteur du regard dans le casque, en mètres par rapport à la position par défaut (négatif = plus bas). */ vrEyeOffset?:number; /** Charte du bouton glossy (couleur, reflet, ombre), réutilisable via les thèmes. */ glossyStyle?:GlossyStyle; /** Boutons et actions de l'interface jaune du casque (défaut : interface actuelle). */ vrMenu?:VrMenuConfig; /** Réglage de soleil enregistré comme modèle pour les autres panoramas (cap, hauteur, intensité, longueur, orientation, rayons). */ sunFlareDefault?: SunFlare; /** Durée d'ouverture des fenêtres, en ms (200 à 2000, défaut 700). */ windowAnimationMs?: number; /** Autorise le mode immersif WebXR pour cette visite. Les anciens projets sans ce champ conservent la VR. */ vrEnabled?:boolean; floorPlan?:FloorPlan; floorPlans?:FloorPlan[]; comments?:ProjectComment[]; ignoredChecks?:string[]; defaultPhotoIcon?:DefaultNavigationIcon;defaultVideoIcon?:DefaultNavigationIcon; buttonSets?:ImportedButtonSet[]; preparationComplete?:boolean; defaultNavigationIcon?:DefaultNavigationIcon; defaultMusicTrackId?:string; iconPackId?:string; clientProfile?:ClientProfile; name: string; languages?:StudioLanguage[]; scenes: Scene[]; icons: CustomIcon[]; audioTracks: MusicTrack[]; bottomBar: BottomBarItem[]; barStyle: BarStyle; introUrl: string; introEnabled: boolean; introDuration: number; updatedAt: string; closeIconId?:string;closeIconHoverId?:string;closeIconPressedId?:string; soundOnIconId?:string; soundOnHoverIconId?:string; soundOnPressedIconId?:string; soundOffIconId?:string; soundOffHoverIconId?:string; soundOffPressedIconId?:string;settingsIconId?:string;settingsHoverIconId?:string;settingsPressedIconId?:string;mediaLibrary?:MediaLinkItem[];/** Barre du bas : rogne les marges transparentes des icônes pour qu'elles remplissent toutes leur bouton (défaut : oui). */barIconTrim?:boolean;settingsIconSize?:number;settingsIconZoom?:number;settingsColor?:string;settingsIconColor?:string; hiddenIconSets?: string[]; hiddenAvailableIcons?:string[]; favoriteNavigationIconSet?:string; spaces?: {id:string;name:string;sceneIds:string[];coverDataUrl?:string;/** Rectangle avec le nom des pièces de ce dossier dans la visite immersive : false = masqué (défaut : affiché). */showRoomName?:boolean;/** Idem dans le casque (VR). */showRoomNameVr?:boolean}[] };

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
export const newProject = ():StudioProject => ({version:1,vrEnabled:false,name:'Ma première visite',scenes:[],icons:[],audioTracks:[],bottomBar:defaultBar(),barStyle:defaultBarStyle(),introUrl:'',introEnabled:false,introDuration:6,updatedAt:new Date().toISOString()});
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
  // Vérifier TOUS les plans, sans faire dépendre les autres étages de la
  // présence du plan historique. Un panorama peut figurer sur plusieurs plans.
  if(p.floorPlan!==undefined&&(!p.floorPlan||typeof p.floorPlan!=='object'))
    throw new Error('Plan de la visite invalide');
  if(p.floorPlans!==undefined&&(!Array.isArray(p.floorPlans)||p.floorPlans.length>200))
    throw new Error('La galerie des plans est invalide');
  const knownPlanIds=new Set<string>();
  // Dans les nouveaux projets, floorPlan est volontairement le miroir du
  // premier floorPlans. Ne pas valider deux fois cet identifiant.
  const allPlans=p.floorPlans!==undefined?p.floorPlans:(p.floorPlan?[p.floorPlan]:[]);
  for(const plan of allPlans){
    if(!plan||typeof plan!=='object'||!isSafeFrameImage(plan.imageDataUrl)||plan.imageDataUrl.length>6_000_000||
      typeof plan.name!=='string'||plan.name.length>200||!Array.isArray(plan.points)||plan.points.length>500||
      (plan.spaceId!==undefined&&(typeof plan.spaceId!=='string'||plan.spaceId.length>100||!plan.spaceId.trim()))||
      (plan.id!==undefined&&(typeof plan.id!=='string'||plan.id.length>120||!plan.id.trim())))
      throw new Error('Plan de la visite invalide');
    if(plan.id){
      if(knownPlanIds.has(plan.id))throw new Error('Identifiant de plan en double');
      knownPlanIds.add(plan.id);
    }
    const placed=new Set<string>();
    for(const point of plan.points){
      if(!point||typeof point.sceneId!=='string'||!p.scenes.some(scene=>scene.id===point.sceneId)||placed.has(point.sceneId)||
        !Number.isFinite(point.x)||!Number.isFinite(point.y)||point.x<0||point.x>100||point.y<0||point.y>100)
        throw new Error('Position de panorama sur le plan invalide');
      placed.add(point.sceneId);
    }
  }
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
  for(const field of ['soundOnIconId','soundOnHoverIconId','soundOnPressedIconId','soundOffIconId','soundOffHoverIconId','soundOffPressedIconId','settingsIconId','settingsHoverIconId','settingsPressedIconId'] as const){
    if(p[field]!==undefined && (typeof p[field]!=='string'||!icons.some(icon=>icon.id===p[field]))) throw new Error('Icône de son introuvable');
  }
  if(p.barIconTrim!==undefined&&typeof p.barIconTrim!=='boolean')throw new Error('Réglage des icônes de la barre invalide');
  if(p.glossyStyle!==undefined){
    const g=p.glossyStyle as Partial<GlossyStyle>;
    const hex=/^#[0-9a-f]{6}$/i;
    if(typeof g!=='object'||g===null||typeof g.base!=='string'||!hex.test(g.base)||(g.rim!==undefined&&(typeof g.rim!=='string'||!hex.test(g.rim)))||
      typeof g.gloss!=='number'||typeof g.shadow!=='number'||g.gloss<0||g.gloss>1||g.shadow<0||g.shadow>1)throw new Error('Charte glossy invalide');
  }
  if(p.vrMenu!==undefined){
    const m=p.vrMenu as Partial<VrMenuConfig>;
    const column=(list:unknown)=>Array.isArray(list)&&list.length<=8&&list.every(id=>typeof id==='string'&&id.length<=80);
    if(typeof m!=='object'||m===null||!column(m.left)||!column(m.right)||(m.autoOpen!==undefined&&typeof m.autoOpen!=='boolean')||(m.themed!==undefined&&typeof m.themed!=='boolean'))throw new Error('Menu du casque invalide');
  }
  if(p.mediaLibrary!==undefined){

    if(!Array.isArray(p.mediaLibrary)||p.mediaLibrary.length>300||!p.mediaLibrary.every(isSafeMediaLinkItem))
      throw new Error('Bibliothèque Photos et Vidéos invalide');
  }
  if((p.settingsIconSize!==undefined&&(!Number.isFinite(p.settingsIconSize)||p.settingsIconSize<32||p.settingsIconSize>120))||
     (p.settingsIconZoom!==undefined&&(!Number.isFinite(p.settingsIconZoom)||p.settingsIconZoom<100||p.settingsIconZoom>300))||
     [p.settingsColor,p.settingsIconColor].some(c=>c!==undefined&&!(typeof c==='string'&&/^#[0-9a-fA-F]{6}$/.test(c))))throw new Error('Réglages du bouton Paramètres invalides');
  if(p.clientProfile!==undefined){
    if(!p.clientProfile||typeof p.clientProfile!=='object')throw new Error('Fiche client invalide');
    const profile=p.clientProfile as ClientProfile;
    for(const field of Object.keys(emptyClientProfile()) as (keyof ClientProfile)[]){
      if(typeof profile[field]!=='string'||profile[field].length>4000)throw new Error('Champ client invalide : '+field);
    }
  }
  if(p.clientProfile){
    const client=p.clientProfile as ClientProfile;
    for(const field of ['bookingUrl','openingHours','services','logoUrl','preferredSkinId','activityCategory','stylePreference','visitType','brandLibraryId'] as const){
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
      typeof barStyle.useBarGlyphs!=='boolean' || !isColor(barStyle.button) || !isColor(barStyle.buttonOutline) || !isColor(barStyle.icon) || !isColor(barStyle.dayNightColor) ||
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
      !['navigation','information','lien','gallery','photos','plan'].includes(item.type) ||
      (item.photos !== undefined && (!Array.isArray(item.photos) || item.photos.length > 300 || !item.photos.every(isSafeMediaLinkItem))) ||
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
      (item.useCustomIcon!==undefined&&typeof item.useCustomIcon!=='boolean') ||
      (item.iconId !== undefined && (typeof item.iconId !== 'string' || !icons.some(icon => icon.id === item.iconId))) ||
      (item.hoverIconId !== undefined && (typeof item.hoverIconId !== 'string' || !icons.some(icon => icon.id === item.hoverIconId))) ||
      (item.pressedIconId !== undefined && (typeof item.pressedIconId !== 'string' || !icons.some(icon => icon.id === item.pressedIconId))) ||
      (item.iconSize !== undefined && (!Number.isFinite(item.iconSize) || item.iconSize < 20 || item.iconSize > 100)) ||
      (item.iconZoom !== undefined && (!Number.isFinite(item.iconZoom) || item.iconZoom < 100 || item.iconZoom > 250)) ||
      (item.builtinIcon !== undefined && typeof item.builtinIcon !== 'string')
    ) throw new Error('Bouton de la barre non valide');
  }
  for (const scene of p.scenes) {
    if (!scene || typeof scene.id !== 'string' || typeof scene.name !== 'string' || typeof scene.dataUrl !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(scene.dataUrl) || !Array.isArray(scene.hotspots)) throw new Error('Scène non valide');
    if (scene.hotspots.length > 1000) throw new Error('Trop de points dans cette scène');
    if(scene.surfaceM2!==undefined && (!Number.isFinite(scene.surfaceM2)||scene.surfaceM2<=0||scene.surfaceM2>100000))throw new Error('Superficie de la pièce invalide');
    if((scene.showRoomName!==undefined && typeof scene.showRoomName!=='boolean')||(scene.showRoomNameVr!==undefined && typeof scene.showRoomNameVr!=='boolean'))throw new Error('Réglage du nom de la pièce invalide');
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
        (h.targetSpaceId !== undefined && (typeof h.targetSpaceId !== 'string' || h.targetSpaceId.length>100)) ||
        (h.iconId !== undefined && (typeof h.iconId !== 'string' || !icons.some(icon=>icon.id===h.iconId))) ||
        (h.hoverIconId !== undefined && (typeof h.hoverIconId !== 'string' || !icons.some(icon=>icon.id===h.hoverIconId))) ||
        (h.pressedIconId !== undefined && (typeof h.pressedIconId !== 'string' || !icons.some(icon=>icon.id===h.pressedIconId))) ||
        (h.arrivalYaw !== undefined && (!Number.isFinite(h.arrivalYaw) || Math.abs(h.arrivalYaw) > 100)) ||
        (h.arrivalPitch !== undefined && (!Number.isFinite(h.arrivalPitch) || Math.abs(h.arrivalPitch) > Math.PI/2 + 0.001)) ||
        (h.arrivalZoom !== undefined && (!Number.isFinite(h.arrivalZoom) || h.arrivalZoom < 0 || h.arrivalZoom > 100)) ||
        (h.arrivalZoomModel !== undefined && h.arrivalZoomModel !== 'wide') ||
        (h.iconSize !== undefined && (typeof h.iconSize !== 'number' || h.iconSize < 16 || h.iconSize > 120)) ||
        (h.sphere !== undefined && typeof h.sphere !== 'boolean') ||
        (h.imageUrl !== undefined && h.imageUrl !== '' && !isSafeMediaUrl(h.imageUrl)) ||
        (h.videoEmbed !== undefined && h.videoEmbed !== '' && !isSafeMediaUrl(h.videoEmbed)) ||
        (h.url !== undefined && (typeof h.url !== 'string' || h.url.length > 2048)) ||
        (h.imageDataUrl !== undefined && (h.imageDataUrl.length > 12_000_000 || !isSafeFrameImage(h.imageDataUrl))) ||
        (h.fontFamily!==undefined&&(typeof h.fontFamily!=='string'||h.fontFamily.length>50)) ||
        (h.linkMode!==undefined&&!['embed','tab'].includes(h.linkMode)) ||
        (h.mediaDisplay !== undefined && !['popup','inline'].includes(h.mediaDisplay)) ||
        (h.imageBounce !== undefined && typeof h.imageBounce !== 'boolean') ||
        (h.imageFrameStyle !== undefined && !IMAGE_FRAME_STYLES.includes(h.imageFrameStyle)) ||
        (h.videoDataUrl !== undefined && (h.videoDataUrl.length > Math.ceil(VIDEO_MAX_BYTES/3)*4+64 || !isSafeVideoData(h.videoDataUrl))) ||
        (h.videoUrl !== undefined && h.videoUrl !== '' && !isSafeMediaUrl(h.videoUrl)) ||
        (h.videoVolume !== undefined && (typeof h.videoVolume !== 'number' || !Number.isFinite(h.videoVolume) || h.videoVolume < 0 || h.videoVolume > 100)) ||
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
  if(p.ignoredChecks!==undefined&&(!Array.isArray(p.ignoredChecks)||p.ignoredChecks.length>500||
      p.ignoredChecks.some(id=>typeof id!=='string'||id.length>400)))
    throw new Error('Contrôles ignorés invalides');
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
       (space.showRoomName!==undefined&&typeof space.showRoomName!=='boolean')||(space.showRoomNameVr!==undefined&&typeof space.showRoomNameVr!=='boolean')||
       new Set(space.sceneIds).size!==space.sceneIds.length||
       space.sceneIds.some((id:unknown)=>typeof id!=='string'||!sceneIds.has(id as string)))
       throw new Error('Un espace contient des références de panoramas invalides');
    spaceIds.add(space.id);
  }
  for(const plan of allPlans)if(plan.spaceId!==undefined&&!spaceIds.has(plan.spaceId))
    throw new Error('Le plan appartient à un espace inexistant');
  const languages=p.languages===undefined?STUDIO_LANGUAGES.map(l=>l.code):p.languages;
  if(!Array.isArray(languages)||!languages.length||languages.length>STUDIO_LANGUAGES.length||new Set(languages).size!==languages.length||languages.some(code=>!STUDIO_LANGUAGES.some(l=>l.code===code)))throw new Error('Langues du projet invalides');
  if(p.preparationComplete!==undefined && typeof p.preparationComplete!=='boolean')throw new Error('Préparation de projet invalide');
  if(p.vrEnabled!==undefined&&typeof p.vrEnabled!=='boolean')throw new Error('Option VR du projet invalide');
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
  const brandKit = p.brandKit === undefined ? undefined : (() => {
    const k = p.brandKit as BrandKit;
    const ok = k && typeof k === 'object' && typeof k.styleId === 'string' && typeof k.validated === 'boolean' && k.colors && typeof k.colors === 'object'
      && Object.values(k.colors).every((v: unknown) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v as string));
    if (!ok) throw new Error('Charte graphique invalide');
    return k;
  })();
  const introDesign = p.introDesign === undefined ? undefined : validateIntroDesign(p.introDesign);
  // Initialise les anciennes intros à partir de leurs couleurs historiques.
  if(introDesign){
    introDesign.backgroundColor??=barStyle.background;
    introDesign.buttonColor??=barStyle.button;
  }
  const interestPoints = p.interestPoints === undefined ? undefined : (Array.isArray(p.interestPoints) && p.interestPoints.length <= 200 && p.interestPoints.every((x: any) => x && typeof x.id === 'string' && typeof x.key === 'string' && typeof x.title === 'string' && typeof x.icon === 'string' && ['proposed','confirmed','rejected'].includes(x.status) && x.title.length <= 120))
    ? p.interestPoints : (() => { throw new Error('Points d’information invalides'); })();
  const interestInfo = p.interestInfo === undefined ? undefined : (typeof p.interestInfo === 'object' && Object.values(p.interestInfo).every((v: any) => typeof v === 'string' || (Array.isArray(v) && v.every((x: any) => typeof x === 'string'))) ? p.interestInfo : (() => { throw new Error('Informations vérifiées invalides'); })());
  return {...p,version:1,name:p.name,brandKit,introDesign,interestPoints,interestInfo,translationsValidated:p.translationsValidated===true?true:(p.translationsValidated===false?false:undefined),interestCategory:p.interestCategory,languages,scenes:p.scenes,icons,audioTracks,bottomBar,barStyle,closeIconId:p.closeIconId,introUrl,introEnabled,introDuration,spaces,hiddenIconSets,hiddenAvailableIcons,favoriteNavigationIconSet,updatedAt:typeof p.updatedAt==='string'?p.updatedAt:new Date().toISOString()};
}

/**
 * Panoramas larger than 8192 px wide exceed the texture budget of many GPUs/phones and make
 * rotation stutter. Larger images are downscaled once at import; smaller files are kept untouched.
 */
// 6144 px suffisent pour un écran 4K et économisent ~45 % de mémoire graphique par panorama (8192 px : 134 Mo décodés, 6144 px : 75 Mo).
export const MAX_PANORAMA_WIDTH = 6144;
export async function readPanorama(file:File):Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    try {
      // Les fichiers 360° jusqu'à 40 Mo sont importés sans les conserver
      // inutilement à leur poids d'origine dans les sauvegardes cloud.
      // Les petites images restent inchangées ; les grandes sont converties
      // en JPEG de qualité élevée, jusqu'à 8192 px, sans recadrage.
      // Recompression : PNG (souvent très lourds) et fichiers de plus de 3 Mo passent en JPEG 0,86, sans perte visible.
      const keepOriginal = bitmap.width <= MAX_PANORAMA_WIDTH && file.size <= 3 * 1024 * 1024 && file.type !== 'image/png';
      if (keepOriginal) return await readImage(file);
      const ratio = Math.min(1, MAX_PANORAMA_WIDTH / bitmap.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      const ctx = canvas.getContext('2d');
      if (!ctx) return await readImage(file);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.92);
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

/**
 * Faut-il afficher le rectangle avec le nom de la pièce ? Réglé séparément pour la visite immersive (`visit`) et le casque (`vr`).
 * Priorité : réglage du panorama, puis celui de son dossier (premier espace qui le contient et qui a un réglage), sinon affiché.
 */
export function roomNameVisible(project:Pick<StudioProject,'spaces'|'hideRoomNames'|'hideRoomNamesVr'>,scene:Pick<Scene,'id'|'showRoomName'|'showRoomNameVr'>,mode:'visit'|'vr'='visit'):boolean{
  if(mode==='vr'?project.hideRoomNamesVr:project.hideRoomNames)return false;
  const own=mode==='vr'?scene.showRoomNameVr:scene.showRoomName;
  if(own!==undefined)return own;
  const space=(project.spaces??[]).find(sp=>(mode==='vr'?sp.showRoomNameVr:sp.showRoomName)!==undefined&&sp.sceneIds.includes(scene.id));
  if(!space)return true;
  return (mode==='vr'?space.showRoomNameVr:space.showRoomName)!==false;
}

/** Sites qui interdisent d'être affichés dans une page intégrée (iframe) : leurs liens s'ouvrent toujours dans un nouvel onglet. */
export const refusesEmbedding = (url: string): boolean => {
  try { return /(^|\.)(instagram|facebook|fb|linkedin|x|twitter|tiktok|pinterest)\.com$/i.test(new URL(url).hostname); } catch { return false; }
};
