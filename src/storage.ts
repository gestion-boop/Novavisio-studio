export type Corner = {x:number;y:number};
export type FrameCorners = {tl:Corner;tr:Corner;br:Corner;bl:Corner};
export const defaultFrameCorners = ():FrameCorners => ({
  tl:{x:7,y:7},tr:{x:93,y:7},br:{x:93,y:93},bl:{x:7,y:93}
});
export type Hotspot = {
  id:string;
  type:'navigation'|'information'|'lien'|'image'|'video';
  title:string;text:string;target:string;yaw:number;pitch:number;
  iconId?:string;hoverIconId?:string;pressedIconId?:string;iconSize?:number;url?:string;
  imageDataUrl?:string;
  videoDataUrl?:string;videoUrl?:string;videoAutoplay?:boolean;videoLoop?:boolean;videoOpenFullscreen?:boolean;
  frameWidth?:number;frameHeight?:number;
  frameCorners?:FrameCorners;
  fadeOnClick?:boolean;
};
export type CustomIcon = { id: string; name: string; dataUrl: string };
export type BarStyle = {
  background: string;
  outline: string;
  button: string;
  buttonOutline: string;
  icon: string;
  outlineWidth: number;
  buttonOutlineWidth: number;
  roundness: number;
};
export const defaultBarStyle = ():BarStyle => ({
  background:'#c2c5c6', outline:'#987974',button:'#5d131a',
  buttonOutline:'#4a1518',icon:'#f4d69a',
  outlineWidth:2,buttonOutlineWidth:1,roundness:60
});
export type BottomBarItem = {
  id: string;
  title: string;
  type: 'navigation' | 'information' | 'lien';
  target: string;
  text: string;
  url: string;
  iconId?: string;
  hoverIconId?: string;
  pressedIconId?: string;
  iconSize?: number;
  builtinIcon?: string;
};
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
      Number.isFinite(v.x) && Number.isFinite(v.y) && v.x>=0 && v.x<=100 && v.y>=0 && v.y<=100;
  });
};
export type Scene = {
  id:string;name:string;dataUrl:string;hotspots:Hotspot[];
  audioDataUrl?:string;audioUrl?:string;audioEnabled?:boolean;audioLoop?:boolean;audioVolume?:number;
};
export const isSafeVideoData = (s:unknown):s is string =>
  typeof s==='string' && /^data:video\/(?:mp4|webm);base64,[A-Za-z0-9+/=]+$/.test(s);
export const isSafeAudioData = (s:unknown):s is string =>
  typeof s==='string' && /^data:audio\/(?:mpeg|mp3|ogg|wav|webm|mp4|x-wav);base64,[A-Za-z0-9+/=]+$/.test(s);
export const isSafeMediaUrl = (s:unknown):s is string =>
  typeof s==='string' && s.length<=2048 && /^https:\/\/[^\s]+$/i.test(s);
export type StudioProject = { version: 1; name: string; scenes: Scene[]; icons: CustomIcon[]; bottomBar: BottomBarItem[]; barStyle: BarStyle; introUrl: string; introEnabled: boolean; updatedAt: string };

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
export async function saveProject(project:StudioProject):Promise<void> {
  const db = await openDb();
  return new Promise((resolve,reject) => {
    const tx = db.transaction('projects','readwrite');
    tx.objectStore('projects').put(project,'current');
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
export const newProject = ():StudioProject => ({version:1,name:'Ma première visite',scenes:[],icons:[],bottomBar:defaultBar(),barStyle:defaultBarStyle(),introUrl:'',introEnabled:false,updatedAt:new Date().toISOString()});
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
  // Les projets antérieurs à V0.4 reprennent automatiquement le thème Bordeaux.
  const barStyle = {...defaultBarStyle(),...(p.barStyle ?? {})};
  const isColor = (v:unknown)=>typeof v==='string' && /^#[0-9a-fA-F]{6}$/.test(v);
  if (!isColor(barStyle.background) || !isColor(barStyle.outline) ||
      !isColor(barStyle.button) || !isColor(barStyle.buttonOutline) || !isColor(barStyle.icon) ||
      !Number.isInteger(barStyle.outlineWidth) || barStyle.outlineWidth < 0 || barStyle.outlineWidth > 8 ||
      !Number.isInteger(barStyle.buttonOutlineWidth) || barStyle.buttonOutlineWidth < 0 || barStyle.buttonOutlineWidth > 8 ||
      !Number.isInteger(barStyle.roundness) || barStyle.roundness < 0 || barStyle.roundness > 60) {
    throw new Error('Style de la barre non valide');
  }
  const introUrl = p.introUrl ?? '';
  const introEnabled = p.introEnabled ?? false;
  if(typeof introUrl !== 'string' || introUrl.length>2048 || typeof introEnabled !== 'boolean') throw new Error('Introduction de visite invalide');
  if(introUrl && !/^https:\/\/[^\s]+$/i.test(introUrl)) throw new Error('L’introduction doit commencer par https://');
  const bottomBar = p.bottomBar ?? defaultBar();
  if(!Array.isArray(bottomBar) || bottomBar.length > 30) throw new Error('Barre d’icônes non valide');
  for(const item of bottomBar) {
    if (!item || typeof item.id !== 'string' || typeof item.title !== 'string' || item.title.length > 120 ||
      !['navigation','information','lien'].includes(item.type) ||
      typeof item.target !== 'string' || typeof item.text !== 'string' || typeof item.url !== 'string' ||
      item.url.length > 2048 || item.text.length > 8000 ||
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
        (h.iconSize !== undefined && (typeof h.iconSize !== 'number' || h.iconSize < 24 || h.iconSize > 120)) ||
        (h.url !== undefined && (typeof h.url !== 'string' || h.url.length > 2048)) ||
        (h.imageDataUrl !== undefined && (h.imageDataUrl.length > 12_000_000 || !isSafeFrameImage(h.imageDataUrl))) ||
        (h.videoDataUrl !== undefined && (h.videoDataUrl.length > 42_000_000 || !isSafeVideoData(h.videoDataUrl))) ||
        (h.videoUrl !== undefined && h.videoUrl !== '' && !isSafeMediaUrl(h.videoUrl)) ||
        (h.videoAutoplay !== undefined && typeof h.videoAutoplay !== 'boolean') ||
        (h.videoLoop !== undefined && typeof h.videoLoop !== 'boolean') ||
        (h.videoOpenFullscreen !== undefined && typeof h.videoOpenFullscreen !== 'boolean') ||
        (h.frameWidth !== undefined && (!Number.isFinite(h.frameWidth) || h.frameWidth < 80 || h.frameWidth > 900)) ||
        (h.frameHeight !== undefined && (!Number.isFinite(h.frameHeight) || h.frameHeight < 60 || h.frameHeight > 700)) ||
        (h.frameCorners !== undefined && !validateFrameCorners(h.frameCorners)) ||
        (h.fadeOnClick !== undefined && typeof h.fadeOnClick !== 'boolean')
      ) throw new Error('Point interactif non valide');
    }
  }
  return {...p,version:1,name:p.name,scenes:p.scenes,icons,bottomBar,barStyle,introUrl,introEnabled,updatedAt:typeof p.updatedAt==='string'?p.updatedAt:new Date().toISOString()};
}
