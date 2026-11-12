import {cloudConfigured,supabase} from './cloud';
import {isSafeVideoData,readImage,VIDEO_MAX_BYTES} from './storage';

export type NovaGenVideo={id:string;name:string;size:number;date:number;url:string};
export type ImportedClientVideo={name:string;dataUrl:string};

export async function listNovaGenVideos(id:string,signal?:AbortSignal):Promise<NovaGenVideo[]>{
  if(!cloudConfigured)throw Error('Le Cloud NovaStudio doit être configuré.');
  const {data,error}=await supabase().auth.getSession();
  if(error||!data.session?.access_token)throw Error('Connecte-toi au Cloud pour consulter les vidéos NovaGen.');
  const response=await fetch('/api/novagen-directory',{
    method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+data.session.access_token},
    body:JSON.stringify({mode:'videos',id}),cache:'no-store',signal
  });
  const result=await response.json().catch(()=>({error:'Répertoire NovaGen indisponible.'}));
  if(!response.ok)throw Error(result.error||'Impossible de lire les vidéos NovaGen.');
  if(!Array.isArray(result.videos))throw Error('Liste de vidéos NovaGen invalide.');
  return result.videos;
}

/** Copy the actual file, never a temporary signed playback URL, into the tour. */
export async function importNovaGenVideo(clientId:string,videoId:string,signal:AbortSignal):Promise<ImportedClientVideo>{
  const video=(await listNovaGenVideos(clientId,signal)).find(v=>v.id===videoId);
  if(!video?.url)throw Error('Cette vidéo est introuvable. Actualise la liste NovaGen.');
  const url=new URL(video.url);
  if(url.protocol!=='https:'||url.username||url.password)throw Error('Adresse de vidéo invalide.');
  if(video.size>VIDEO_MAX_BYTES)throw Error('Vidéo trop lourde : 45 Mo maximum.');
  const response=await fetch(url.href,{signal,referrerPolicy:'no-referrer'});
  if(!response.ok)throw Error('Téléchargement impossible. Actualise les vidéos puis réessaie.');
  if(Number(response.headers.get('content-length'))>VIDEO_MAX_BYTES)throw Error('Vidéo trop lourde : 45 Mo maximum.');
  const mime=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
  if(!['video/mp4','application/octet-stream'].includes(mime))throw Error('Le fichier reçu n’est pas une vidéo MP4.');
  const chunks:ArrayBuffer[]=[];
  let size=0;
  if(response.body){
    const reader=response.body.getReader();
    try{
      while(true){
        const {value,done}=await reader.read();if(done)break;
        size+=value.byteLength;
        if(size>VIDEO_MAX_BYTES){await reader.cancel();throw Error('Vidéo trop lourde : 45 Mo maximum.');}
        chunks.push(new Uint8Array(value).buffer);
      }
    }finally{reader.releaseLock();}
  }else{const blob=await response.blob();size=blob.size;chunks.push(await blob.arrayBuffer());}
  if(!size||size>VIDEO_MAX_BYTES)throw Error('Vidéo vide ou trop lourde (45 Mo maximum).');
  signal.throwIfAborted();
  const file=new File(chunks,video.name,{type:'video/mp4'});
  const dataUrl=await readImage(file);
  signal.throwIfAborted();
  if(!isSafeVideoData(dataUrl))throw Error('Fichier vidéo incompatible.');
  return {name:video.name,dataUrl};
}
