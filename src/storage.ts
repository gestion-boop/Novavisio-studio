export type Hotspot = { id: string; type: 'navigation' | 'information'; title: string; text: string; target: string; yaw: number; pitch: number };
export type Scene = { id: string; name: string; dataUrl: string; hotspots: Hotspot[] };
export type StudioProject = { version: 1; name: string; scenes: Scene[]; updatedAt: string };

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
export const newProject = ():StudioProject => ({version:1,name:'Ma première visite',scenes:[],updatedAt:new Date().toISOString()});
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
  for (const scene of p.scenes) {
    if (!scene || typeof scene.id !== 'string' || typeof scene.name !== 'string' || typeof scene.dataUrl !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(scene.dataUrl) || !Array.isArray(scene.hotspots)) throw new Error('Scène non valide');
    if (scene.hotspots.length > 1000) throw new Error('Trop de points dans cette scène');
    for (const h of scene.hotspots) {
      if (!h || typeof h.id !== 'string' || !['navigation','information'].includes(h.type) || typeof h.title !== 'string' || typeof h.text !== 'string' || typeof h.target !== 'string' || !Number.isFinite(h.yaw) || !Number.isFinite(h.pitch)) throw new Error('Point interactif non valide');
    }
  }
  return {...p,version:1,name:p.name,scenes:p.scenes,updatedAt:typeof p.updatedAt==='string'?p.updatedAt:new Date().toISOString()};
}
