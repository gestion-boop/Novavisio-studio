export type Hotspot = { id: string; type: 'navigation' | 'information' | 'lien'; title: string; text: string; target: string; yaw: number; pitch: number; iconId?: string; iconSize?: number; url?: string };
export type CustomIcon = { id: string; name: string; dataUrl: string };
export type BottomBarItem = {
  id: string;
  title: string;
  type: 'navigation' | 'information' | 'lien';
  target: string;
  text: string;
  url: string;
  iconId?: string;
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
export type Scene = { id: string; name: string; dataUrl: string; hotspots: Hotspot[] };
export type StudioProject = { version: 1; name: string; scenes: Scene[]; icons: CustomIcon[]; bottomBar: BottomBarItem[]; updatedAt: string };

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
export const newProject = ():StudioProject => ({version:1,name:'Ma première visite',scenes:[],icons:[],bottomBar:defaultBar(),updatedAt:new Date().toISOString()});
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
  const bottomBar = p.bottomBar ?? defaultBar();
  if(!Array.isArray(bottomBar) || bottomBar.length > 30) throw new Error('Barre d’icônes non valide');
  for(const item of bottomBar) {
    if (!item || typeof item.id !== 'string' || typeof item.title !== 'string' || item.title.length > 120 ||
      !['navigation','information','lien'].includes(item.type) ||
      typeof item.target !== 'string' || typeof item.text !== 'string' || typeof item.url !== 'string' ||
      item.url.length > 2048 || item.text.length > 8000 ||
      (item.iconId !== undefined && (typeof item.iconId !== 'string' || !icons.some(icon => icon.id === item.iconId))) ||
      (item.iconSize !== undefined && (!Number.isFinite(item.iconSize) || item.iconSize < 20 || item.iconSize > 100)) ||
      (item.builtinIcon !== undefined && typeof item.builtinIcon !== 'string')
    ) throw new Error('Bouton de la barre non valide');
  }
  for (const scene of p.scenes) {
    if (!scene || typeof scene.id !== 'string' || typeof scene.name !== 'string' || typeof scene.dataUrl !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(scene.dataUrl) || !Array.isArray(scene.hotspots)) throw new Error('Scène non valide');
    if (scene.hotspots.length > 1000) throw new Error('Trop de points dans cette scène');
    for (const h of scene.hotspots) {
      if (!h || typeof h.id !== 'string' || !['navigation','information','lien'].includes(h.type) || typeof h.title !== 'string' || typeof h.text !== 'string' || typeof h.target !== 'string' || !Number.isFinite(h.yaw) || !Number.isFinite(h.pitch) ||
        (h.iconId !== undefined && (typeof h.iconId !== 'string' || !icons.some(icon=>icon.id===h.iconId))) ||
        (h.iconSize !== undefined && (typeof h.iconSize !== 'number' || h.iconSize < 24 || h.iconSize > 120)) ||
        (h.url !== undefined && (typeof h.url !== 'string' || h.url.length > 2048))) throw new Error('Point interactif non valide');
    }
  }
  return {...p,version:1,name:p.name,scenes:p.scenes,icons,bottomBar,updatedAt:typeof p.updatedAt==='string'?p.updatedAt:new Date().toISOString()};
}
