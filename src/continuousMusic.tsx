import {useEffect,useRef,useState} from 'react';
import {Volume2,VolumeX} from 'lucide-react';
import type {StudioProject,Scene} from './storage';
import {setSound,useVisitorPrefs} from './visitorPrefs';

type SoundSide='on'|'off';

function SoundGlyph({project,side}:{project:StudioProject;side:SoundSide}){
  const ids=side==='on'
    ?[project.soundOnIconId,project.soundOnHoverIconId,project.soundOnPressedIconId]
    :[project.soundOffIconId,project.soundOffHoverIconId,project.soundOffPressedIconId];
  const sources=ids.map(id=>project.icons?.find(icon=>icon.id===id)?.dataUrl||'');
  const normal=sources[0]||sources[1]||sources[2];
  if(!normal)return side==='on'?<Volume2 size={22}/>:<VolumeX size={22}/>;
  return <span className="nv-sound-glyph" aria-hidden="true">
    <img className="nv-sound-normal" src={normal} alt=""/>
    {sources[1]&&<img className="nv-sound-hover" src={sources[1]} alt=""/>}
    {sources[2]&&<img className="nv-sound-pressed" src={sources[2]} alt=""/>}
  </span>;
}

/** One player throughout the visit. The first sound choice is made by the visitor,
 * after the intro. This also satisfies browser audio autoplay restrictions. */
export function ContinuousMusic({project,scene,paused=false,onEdit}:{project:StudioProject;scene:Scene|null;paused?:boolean;onEdit?:()=>void}){
  const audio=useRef<HTMLAudioElement>(null);
  // Le choix du son est partagé avec le bouton « Paramètres » (même état).
  const choice=useVisitorPrefs().sound;
  const setChoice=setSound;
  const [playing,setPlaying]=useState(false);
  const [failed,setFailed]=useState(false);
  const track=project.audioTracks?.find(t=>t.id===scene?.musicTrackId);
  const source=track?(track.dataUrl||track.url||''):
    (scene?.audioEnabled===false?'':(scene?.audioDataUrl||scene?.audioUrl||''));
  const volume=Math.max(0,Math.min(100,track?.volume??scene?.audioVolume??65))/100;
  const loop=track?.loop??scene?.audioLoop!==false;

  const volRef=useRef(volume);volRef.current=volume;
  const fadeRaf=useRef(0);
  /** Fondu rapide du volume (sortie 350 ms, retour 450 ms) : la musique s'efface / revient sans coupure sèche. */
  const fade=(el:HTMLAudioElement,to:number,ms:number,done?:()=>void)=>{
    cancelAnimationFrame(fadeRaf.current);
    const from=el.volume,t0=performance.now();
    const step=(now:number)=>{
      const k=Math.min(1,(now-t0)/ms);
      el.volume=Math.max(0,Math.min(1,from+(to-from)*k));
      if(k<1)fadeRaf.current=requestAnimationFrame(step);else done?.();
    };
    fadeRaf.current=requestAnimationFrame(step);
  };
  useEffect(()=>()=>cancelAnimationFrame(fadeRaf.current),[]);

  useEffect(()=>{
    const el=audio.current;if(!el)return;
    el.loop=loop;
    if(!el.paused&&!paused)el.volume=volume;
  },[volume,loop]);

  useEffect(()=>{
    const el=audio.current;if(!el)return;
    if(!source||choice!=='on'){
      cancelAnimationFrame(fadeRaf.current);el.pause();setPlaying(false);return;
    }
    if(paused){
      if(el.paused){setPlaying(false);return;}
      fade(el,0,350,()=>{el.pause();setPlaying(false);});
      return;
    }
    let disposed=false;
    if(el.paused)el.volume=0;
    void el.play().then(()=>{if(!disposed){setPlaying(true);setFailed(false);fade(el,volRef.current,450);}})
      .catch(()=>{if(!disposed){setPlaying(false);setFailed(true);}});
    // Do not stop the same track on navigation; the next effect manages playback.
    return ()=>{disposed=true;};
  },[source,paused,choice]);

  const choose=(next:'on'|'off')=>{
    const el=audio.current;
    setChoice(next);setFailed(false);
    if(next==='off'){el?.pause();setPlaying(false);return;}
    // Called during a real user gesture: invoke play synchronously here,
    // never only in an effect, so browsers grant permission for audio.
    if(el){el.volume=volRef.current;}
    if(el)void el.play().then(()=>{setPlaying(true);setFailed(false);})
      .catch(()=>{setPlaying(false);setFailed(true);});
  };

  return <div className="nv-audio-layer">
    <audio ref={audio} src={source||undefined} preload="auto" playsInline
      onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)}
      onError={()=>{if(source&&choice==='on')setFailed(true);}}/>
    {!onEdit&&!!source&&!paused&&choice==='undecided'&&
      <div className="nv-sound-choice-backdrop" role="dialog" aria-modal="true" aria-label="Choisir le son de la visite">
        <section className="nv-sound-choice-dialog">
          <h2>Profitez de la visite immersive</h2>
          <p>Souhaitez-vous découvrir la visite avec de la musique ?</p>
          <div className="nv-sound-choice-actions">
            <button type="button" className="nv-sound-choice-button" onClick={()=>choose('on')}>
              <SoundGlyph project={project} side="on"/><span>Avec le son</span>
            </button>
            <button type="button" className="nv-sound-choice-button" onClick={()=>choose('off')}>
              <SoundGlyph project={project} side="off"/><span>Sans le son</span>
            </button>
          </div>
        </section>
      </div>}
    {onEdit&&<button type="button" className="nv-audio-toggle is-editing" aria-label="Modifier les icônes du bouton son" title="Bouton son de la visite : clique pour changer ses icônes (normal, survol, clic)" onClick={onEdit}>
      <SoundGlyph project={project} side="on"/><span className="nv-audio-edit-tag">✎</span></button>}
    {!onEdit&&!!source&&!paused&&choice!=='undecided'&&
      <button type="button" className="nv-audio-toggle"
        aria-label={choice==='on'?'Couper la musique':'Activer la musique'}
        title={choice==='on'?(playing?'Couper la musique':'Démarrer la musique'):'Activer la musique'}
        onClick={()=>choose(choice==='on'?'off':'on')}>
        <SoundGlyph project={project} side={choice}/>
        {failed&&<span className="nv-audio-warning">Réessayer</span>}
      </button>}
  </div>;
}
