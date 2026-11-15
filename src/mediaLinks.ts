import type {MediaLinkItem} from './storage';

/**
 * Bibliothèque Photos et Vidéos : de simples LIENS vers des fichiers hébergés ailleurs (Google Drive, kDrive, autre site).
 * Rien n'est envoyé dans Supabase : le projet ne garde que le nom et l'adresse.
 */
export type MediaProvider=MediaLinkItem['provider'];

export function detectProvider(url:string):MediaProvider{
  try{
    const h=new URL(url).hostname.toLowerCase();
    if(h==='drive.google.com'||h==='docs.google.com'||h.endsWith('.googleusercontent.com'))return 'gdrive';
    if(h.endsWith('infomaniak.com')||h.endsWith('kdrive.com'))return 'kdrive';
  }catch{/* adresse invalide */}
  return 'web';
}
/** Identifiant d'un fichier Google Drive (liens …/file/d/ID/…, open?id=ID, uc?id=ID). */
export function driveFileId(url:string):string|null{
  const m=/\/file\/d\/([A-Za-z0-9_-]{10,})/.exec(url)||/[?&]id=([A-Za-z0-9_-]{10,})/.exec(url);
  return m?m[1]:null;
}
export const isDriveFolder=(url:string)=>/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\//.test(url);
const VIDEO_EXT=/\.(mp4|webm|mov|m4v)(\?|#|$)/i;

export type Resolved={
  /** Photo : adresse utilisable dans <img>. */ image?:string;
  /** Petite vignette pour la liste. */ thumb?:string;
  /** Vidéo lisible directement (<video>). */ video?:string;
  /** Vidéo à afficher dans un lecteur intégré (iframe). */ embed?:string;
  problem?:string;
};
export function resolveLink(item:Pick<MediaLinkItem,'kind'|'url'|'provider'>):Resolved{
  const url=item.url.trim();
  if(!/^https:\/\/\S+$/i.test(url))return {problem:'L’adresse doit commencer par https://'};
  if(item.provider==='gdrive'){
    if(isDriveFolder(url))return {problem:'C’est un dossier : colle le lien d’UN fichier (clic droit sur la photo ou la vidéo → Partager → Copier le lien).'};
    const id=driveFileId(url);
    if(!id)return {problem:'Lien Google Drive non reconnu : il doit contenir /file/d/… ou ?id=…'};
    return item.kind==='photo'
      ?{image:'https://drive.google.com/thumbnail?id='+id+'&sz=w2000',thumb:'https://drive.google.com/thumbnail?id='+id+'&sz=w400'}
      :{embed:'https://drive.google.com/file/d/'+id+'/preview',thumb:'https://drive.google.com/thumbnail?id='+id+'&sz=w400'};
  }
  // kDrive et autres sites : on utilise l'adresse telle quelle (idéalement un lien direct vers le fichier).
  if(item.kind==='photo')return {image:url,thumb:url};
  return VIDEO_EXT.test(url)?{video:url}:{embed:url};
}
export const providerLabel:Record<MediaProvider,string>={gdrive:'Google Drive',kdrive:'kDrive',web:'Lien web'};
