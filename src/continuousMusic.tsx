import {useEffect,useRef,useState} from 'react';
import {Volume2,VolumeX} from 'lucide-react';
import type {StudioProject,Scene} from './storage';

type SoundChoice='undecided'|'on'|'off';
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
export function ContinuousMusic({project,scene,paused=false}:{project:StudioProject;scene:Scene|null;paused?:boolean}){
  const audio=useRef<HTMLAudioElement>(null);
  const [choice,setChoice]=useState<SoundChoice>('undecided');
  const [playing,setPlaying]=useState(false);
  const [failed,setFailed]=useState(false);
  const track=project.audioTracks?.find(t=>t.id===scene?.musicTrackId);
  const source=track?(track.dataUrl||track.url||''):
    (scene?.audioEnabled===false?'':(scene?.audioDataUrl||scene?.audioUrl||''));
  const volume=Math.max(0,Math.min(100,track?.volume??scene?.audioVolume??65))/100;
  const loop=track?.loop??scene?.audioLoop!==false;

  useEffect(()=>{
    const el=audio.current;if(!el)return;
    el.volume=volume;el.loop=loop;
  },[volume,loop]);

  useEffect(()=>{
    const el=audio.current;if(!el)return;
    if(!source||paused||choice!=='on'){
      el.pause();setPlaying(false);return;
    }
    let disposed=false;
    void el.play().then(()=>{if(!disposed){setPlaying(true);setFailed(false);}})
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
    if(el)void el.play().then(()=>{setPlaying(true);setFailed(false);})
      .catch(()=>{setPlaying(false);setFailed(true);});
  };

  return <div className="nv-audio-layer">
    <audio ref={audio} src={source||undefined} preload="auto" playsInline
      onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)}
      onError={()=>{if(source&&choice==='on')setFailed(true);}}/>
    {!!source&&!paused&&choice==='undecided'&&
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
    {!!source&&!paused&&choice!=='undecided'&&
      <button type="button" className="nv-audio-toggle"
        aria-label={choice==='on'?'Couper la musique':'Activer la musique'}
        title={choice==='on'?(playing?'Couper la musique':'Démarrer la musique'):'Activer la musique'}
        onClick={()=>choose(choice==='on'?'off':'on')}>
        <SoundGlyph project={project} side={choice}/>
        {failed&&<span className="nv-audio-warning">Réessayer</span>}
      </button>}
  </div>;
}
