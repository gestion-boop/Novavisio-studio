import {useEffect,useRef,useState,type ReactNode} from 'react';
import {AlertTriangle,CheckCircle2} from 'lucide-react';
import {XMark} from './XMark';

export type IssueFocus={id?:string;hotspotId?:string;text:string;level:'error'|'warn';hint?:string;thumb?:string;sceneName?:string;sceneId?:string};

/** Met en évidence le point à corriger (anneau pulsant) et affiche une bulle à côté qui dit quoi corriger. */
export function IssueCallout({focus,stillPresent,onClose,onOpen,step,onNext,docked,onValidate,saving,error,media,onNote,noted}:{focus:IssueFocus;stillPresent:boolean;onClose:()=>void;onOpen?:()=>void;step?:{i:number;n:number};onNext?:()=>void;docked?:boolean;onValidate:()=>void;saving?:boolean;error?:string;media?:ReactNode;onNote?:()=>void;noted?:boolean}){
  const [dock,setDock]=useState<number>(92);
  const targetRef=useRef<HTMLElement|null>(null);
  useEffect(()=>{
    let raf=0,alive=true;
    const tick=()=>{
      if(!alive)return;
      const el=focus.hotspotId?document.querySelector<HTMLElement>('[data-nv-marker-id="'+focus.hotspotId+'"]'):null;
      if(targetRef.current&&targetRef.current!==el)targetRef.current.classList.remove('nv-issue-target');
      targetRef.current=el;
      if(el)el.classList.add('nv-issue-target');
      const view=document.querySelector<HTMLElement>('.view-area .psv-container');
      if(view){const t=Math.round(view.getBoundingClientRect().top)+12;setDock(d=>d===t?d:t);}
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=>{alive=false;cancelAnimationFrame(raf);targetRef.current?.classList.remove('nv-issue-target');};
  },[focus.hotspotId]);
  const W=380;
  const style={right:16,top:dock+(docked?66:12)};
  return <aside className={'nv-issue-callout is-'+(stillPresent?focus.level:'ok')+' is-docked'} style={{...style,width:'min('+W+'px,calc(100vw - 24px))'}} role="status" aria-live="polite">
    {stillPresent?<>{media?<figure className="nv-issue-thumb nv-issue-360">{media}{focus.sceneName&&<figcaption>{focus.sceneName} · glisse pour voir à 360°</figcaption>}</figure>:focus.thumb&&<figure className="nv-issue-thumb"><img src={focus.thumb} alt=""/>{focus.sceneName&&<figcaption>{focus.sceneName}</figcaption>}</figure>}<AlertTriangle size={18}/><div><b>{focus.level==='error'?'À corriger':'À vérifier'}{step&&<span className="nv-issue-step">{step.i} / {step.n}</span>}</b>{step&&<i className="nv-issue-bar"><i style={{width:(step.i/step.n*100)+'%'}}/></i>}<span>{focus.text}</span>{focus.hint&&<em className="nv-issue-hint">👉 {focus.hint}</em>}{onNote&&<button type="button" className="nv-issue-open nv-issue-note" onClick={onNote}>{noted?'📝 Déjà noté · passer':'📝 Noter « à faire » et passer'}</button>}{!docked&&onOpen&&focus.hotspotId&&<button type="button" className="nv-issue-open" onClick={onOpen}>Ouvrir les réglages du point</button>}{onNext&&<button type="button" className="nv-issue-open nv-issue-next" onClick={onNext}>Passer au suivant →</button>}</div>
      <button type="button" onClick={onClose} aria-label="Fermer l’indication"><XMark size={14}/></button></>
    :<>{focus.thumb&&<figure className="nv-issue-thumb"><img src={focus.thumb} alt=""/>{focus.sceneName&&<figcaption>{focus.sceneName}</figcaption>}</figure>}<CheckCircle2 size={18}/><div><b>Corrigé !</b><span>Enregistre pour valider cette correction{onNext?' et passer à la suivante':''}.</span>{error&&<span className="nv-issue-err">⚠ {error}</span>}
      <button type="button" className="nv-issue-open nv-issue-save" disabled={saving} onClick={onValidate}>💾 {saving?'Enregistrement…':(onNext?'Enregistrer et continuer':'Enregistrer')}</button></div>
      <button type="button" onClick={onClose} aria-label="Fermer l’indication"><XMark size={14}/></button></>}
  </aside>;
}

/** Version « bandeau » : intégrée en haut d'une fenêtre déjà ouverte (galerie, choix de média) pour ne montrer qu'un seul panneau. */
export function IssueBanner({focus}:{focus:IssueFocus}){
  return <div className={'nv-issue-banner is-'+focus.level} role="status">
    {focus.thumb&&<figure className="nv-issue-banner-thumb"><img src={focus.thumb} alt=""/><figcaption><small>PANORAMA DE DÉPART</small>{focus.sceneName}</figcaption></figure>}
    <div><b>{focus.level==='error'?'À corriger':'À vérifier'}</b><span>{focus.text}</span>{focus.hint&&<em>👉 {focus.hint}</em>}
      <small>Le panorama de départ (à gauche) est celui où se trouve la flèche. Choisis dans la liste le panorama vers lequel elle doit mener, règle le viseur, puis valide.</small></div>
  </div>;
}
