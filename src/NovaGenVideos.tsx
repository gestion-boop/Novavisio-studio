import {useEffect,useRef,useState} from 'react';
import {importNovaGenVideo,listNovaGenVideos,type ImportedClientVideo,type NovaGenVideo} from './novagenVideos';

export function NovaGenVideos({clientId,canPlace,onPlace}:{clientId:string;canPlace:boolean;onPlace:(video:ImportedClientVideo)=>void}){
  const [videos,setVideos]=useState<NovaGenVideo[]>([]);
  const [loading,setLoading]=useState(true),[error,setError]=useState('');
  const [refresh,setRefresh]=useState(0),[busy,setBusy]=useState('');
  const download=useRef<AbortController|null>(null);
  useEffect(()=>{
    const controller=new AbortController();
    setLoading(true);setError('');setVideos([]);setBusy('');
    void listNovaGenVideos(clientId,controller.signal).then(result=>{if(!controller.signal.aborted)setVideos(result);})
      .catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:String(e));})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>{controller.abort();const pending=download.current;download.current=null;pending?.abort();};
  },[clientId,refresh]);
  async function place(video:NovaGenVideo){
    if(!canPlace||download.current)return;
    const controller=new AbortController();download.current=controller;setBusy(video.id);setError('');
    const timeout=window.setTimeout(()=>controller.abort('timeout'),120000);
    try{
      const imported=await importNovaGenVideo(clientId,video.id,controller.signal);
      if(!controller.signal.aborted)onPlace(imported);
    }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:String(e));
      else if(controller.signal.reason==='timeout')setError('Le téléchargement a pris trop de temps. Réessaie.');}
    finally{window.clearTimeout(timeout);if(download.current===controller){download.current=null;setBusy('');}}
  }
  return <section className="nv-novagen-videos" aria-label="Vidéos NovaGen">
    <div className="nv-novagen-videos-heading"><strong>Vidéos NovaGen ({videos.length})</strong>
      <button type="button" disabled={loading||!!busy} onClick={()=>setRefresh(n=>n+1)}>Actualiser les vidéos</button></div>
    {loading&&<p role="status">Chargement des vidéos…</p>}
    {error&&<p role="alert">{error}</p>}
    {!loading&&!error&&!videos.length&&<p>Aucune vidéo finale sauvegardée dans cette fiche NovaGen.</p>}
    <div className="nv-novagen-video-grid">{videos.map(video=><article key={video.id}>
      {video.url?<video key={video.url} src={video.url} controls playsInline preload="metadata" aria-label={'Aperçu : '+video.name}/>:<p>Aperçu indisponible. Actualise les vidéos.</p>}
      <strong>{video.name}</strong>
      <small>{video.size>0?(video.size/1048576).toLocaleString('fr-FR',{maximumFractionDigits:1})+' Mo':''}{video.date?' · '+new Date(video.date).toLocaleDateString('fr-FR'):''}</small>
      <button type="button" disabled={!canPlace||!!busy||!video.url} onClick={()=>void place(video)}>{busy===video.id?'Copie de la vidéo…':'Placer dans la visite'}</button>
    </article>)}</div>
    {!canPlace&&<p>Ouvre ou importe un panorama pour y placer une vidéo.</p>}
    <small>Après « Placer », clique dans le panorama pour poser son icône. Le fichier sera conservé avec la visite lorsque tu l’enregistres.</small>
    <details><summary>Une vidéo manque ?</summary><p>Seules les vidéos finales sauvegardées sur le serveur NovaGen apparaissent ici. Les anciennes vidéos conservées uniquement sur un ordinateur doivent être importées depuis leur fichier avec l’outil Vidéo.</p></details>
  </section>;
}
