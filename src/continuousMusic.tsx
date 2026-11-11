import {useEffect,useRef,useState} from 'react';
import {Volume2,VolumeX} from 'lucide-react';
import type {Scene,StudioProject} from './storage';

/** Une seule piste pour toute la visite. Les scènes qui utilisent la même
 * musique ne la redémarrent pas à chaque navigation.
 * Les navigateurs bloquent généralement le son sans geste utilisateur :
 * une commande claire et accessible permet de le débloquer.
 */
export function ContinuousMusic({project,scene,paused=false}:{project:StudioProject;scene:Scene|null;paused?:boolean}){
  const audio=useRef<HTMLAudioElement>(null);
  const [needsTap,setNeedsTap]=useState(false);
  const [muted,setMuted]=useState(false);
  const [playing,setPlaying]=useState(false);
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
    if(!source||paused){
      el.pause();setPlaying(false);
      if(!source)setNeedsTap(false);
      return;
    }
    let obsolete=false;
    // Essaye l'autoplay, mais affiche un bouton immédiatement et de manière
    // fiable si la politique du navigateur interdit de démarrer avec le son.
    setNeedsTap(true);
    const attempt=el.play();
    if(attempt)void attempt.then(()=>{
      if(!obsolete){setPlaying(true);setNeedsTap(false);}
    }).catch(()=>{
      if(!obsolete){setPlaying(false);setNeedsTap(true);}
    });
    return ()=>{obsolete=true;};
  },[source,paused]);

  // En cas de blocage autoplay, n'importe quel premier clic du visiteur peut
  // autoriser la musique. Si ce clic ne suffit pas, le bouton reste disponible.
  useEffect(()=>{
    if(!source||paused||!needsTap)return;
    const activate=()=>{
      const el=audio.current;
      if(!el||!el.paused)return;
      void el.play().then(()=>{setNeedsTap(false);setPlaying(true);})
        .catch(()=>setNeedsTap(true));
    };
    document.addEventListener('pointerdown',activate,{capture:true});
    document.addEventListener('keydown',activate,{capture:true});
    return ()=>{
      document.removeEventListener('pointerdown',activate,true);
      document.removeEventListener('keydown',activate,true);
    };
  },[source,paused,needsTap]);

  const activate=()=>{
    const el=audio.current;
    if(!el)return;
    if(muted){el.muted=false;setMuted(false);}
    void el.play().then(()=>{setPlaying(true);setNeedsTap(false);})
      .catch(()=>{setPlaying(false);setNeedsTap(true);});
  };

  return <div className={'nv-audio-layer'+(needsTap?' nv-audio-awaiting':'')}>
    <audio ref={audio} src={source||undefined} preload="auto" playsInline
      onPlay={()=>setPlaying(true)}
      onPause={()=>setPlaying(false)}
      onError={()=>{if(source&&!paused)setNeedsTap(true);}}/>
    {source&&!paused&&(needsTap ?
      <button type="button" className="nv-audio-start" onClick={activate}
        aria-label="Activer la musique de la visite">
        <Volume2 size={18}/> <span>Activer la musique</span>
      </button> :
      <button type="button" className="nv-audio-mute"
        title={muted?'Réactiver la musique':playing?'Couper la musique':'Démarrer la musique'}
        aria-label={muted?'Réactiver la musique':playing?'Couper la musique':'Démarrer la musique'}
        onClick={()=>{
          if(!playing){activate();return;}
          setMuted(value=>!value);
        }}>
        {muted?<VolumeX size={17}/>:<Volume2 size={17}/>}
      </button>)}
  </div>;
}
