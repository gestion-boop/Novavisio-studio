import {useEffect,useRef,useState} from 'react';
import {Volume2,VolumeX} from 'lucide-react';
import type {Scene,StudioProject} from './storage';

/** One audio element per visit — scene changes do not remount or restart the same track. */
export function ContinuousMusic({project,scene,paused=false}:{project:StudioProject;scene:Scene|null;paused?:boolean}){
  const audio=useRef<HTMLAudioElement>(null);
  const [needsTap,setNeedsTap]=useState(false);
  const [muted,setMuted]=useState(false);
  const track=project.audioTracks?.find(t=>t.id===scene?.musicTrackId);
  const source=track?(track.dataUrl||track.url||''):
    (scene?.audioEnabled===false?'':(scene?.audioDataUrl||scene?.audioUrl||''));
  const volume=Math.max(0,Math.min(100,track?.volume??scene?.audioVolume??65))/100;
  const loop=track?.loop??scene?.audioLoop!==false;

  useEffect(()=>{
    const el=audio.current;
    if(!el)return;
    el.volume=volume;el.loop=loop;el.muted=muted;
  },[source,volume,loop,muted]);
  useEffect(()=>{
    const el=audio.current;
    if(!el)return;
    if(!source||paused){el.pause();setNeedsTap(false);return;}
    let obsolete=false;
    void el.play().then(()=>{if(!obsolete)setNeedsTap(false);})
      .catch(()=>{if(!obsolete)setNeedsTap(true);});
    // Deliberately do not pause in cleanup: the same song must continue between panoramas.
    return ()=>{obsolete=true;};
  },[source,paused]);

  return <div className="nv-audio-layer">
    <audio ref={audio} src={source||undefined} preload="auto" playsInline/>
    {source && !paused && (needsTap ?
      <button type="button" className="nv-audio-start"
        onClick={()=>{void audio.current?.play().then(()=>setNeedsTap(false)).catch(()=>setNeedsTap(true));}}>
        <Volume2 size={16}/> Activer la musique
      </button> :
      <button type="button" className="nv-audio-mute" title={muted?'Réactiver la musique':'Couper la musique'}
        onClick={()=>setMuted(value=>!value)}>
        {muted?<VolumeX size={17}/>:<Volume2 size={17}/>}
      </button>)}
  </div>;
}
