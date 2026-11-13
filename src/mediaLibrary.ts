/**
 * Bibliothèque de médias (photos et vidéos) : tout ce qui est importé dans NovaStudio est gardé sur cet ordinateur
 * pour pouvoir être resélectionné sans repasser par le disque. Stockée dans IndexedDB (pas de limite de 5 Mo).
 */
export type MediaKind='image'|'video';
export type MediaItem={id:string;kind:MediaKind;name:string;dataUrl:string;addedAt:number};
const DB='novavisio-media-v1',STORE='items';
export const mediaKey=(dataUrl:string)=>dataUrl.length+':'+dataUrl.slice(-48);

function open():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB,1);
    req.onupgradeneeded=()=>req.result.createObjectStore(STORE,{keyPath:'id'});
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
}
export async function listMedia():Promise<MediaItem[]>{
  const db=await open();
  return new Promise((resolve,reject)=>{
    const req=db.transaction(STORE).objectStore(STORE).getAll();
    req.onsuccess=()=>resolve((req.result as MediaItem[]).sort((a,b)=>b.addedAt-a.addedAt));req.onerror=()=>reject(req.error);
  });
}
export async function rememberMedia(kind:MediaKind,name:string,dataUrl:string):Promise<void>{
  try{
    const existing=await listMedia();
    const key=mediaKey(dataUrl);
    if(existing.some(item=>item.kind===kind&&mediaKey(item.dataUrl)===key))return;
    const db=await open();
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).put({id:crypto.randomUUID(),kind,name:name.slice(0,120)||(kind==='image'?'Photo':'Vidéo'),dataUrl,addedAt:Date.now()} satisfies MediaItem);
      tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
    });
  }catch{/* stockage indisponible : la bibliothèque du projet reste utilisable */}
}
export async function forgetMedia(id:string):Promise<void>{
  const db=await open();
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});
}
