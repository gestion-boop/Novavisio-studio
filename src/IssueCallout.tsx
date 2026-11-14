import {useEffect,useRef,useState} from 'react';
import {AlertTriangle,CheckCircle2} from 'lucide-react';
import {XMark} from './XMark';

export type IssueFocus={hotspotId?:string;text:string;level:'error'|'warn'};

/** Met en évidence le point à corriger (anneau pulsant) et affiche une bulle à côté qui dit quoi corriger. */
export function IssueCallout({focus,stillPresent,onClose,onOpen,step,onNext}:{focus:IssueFocus;stillPresent:boolean;onClose:()=>void;onOpen?:()=>void;step?:{i:number;n:number};onNext?:()=>void}){
  const [pos,setPos]=useState<{x:number;y:number}|null>(null);
  const [dock,setDock]=useState<number>(92);
  const targetRef=useRef<HTMLElement|null>(null);
  useEffect(()=>{
    let raf=0,alive=true;
    const tick=()=>{
      if(!alive)return;
      const el=focus.hotspotId?document.querySelector<HTMLElement>('[data-nv-marker-id="'+focus.hotspotId+'"]'):null;
      if(targetRef.current&&targetRef.current!==el)targetRef.current.classList.remove('nv-issue-target');
      targetRef.current=el;
      if(el){
        el.classList.add('nv-issue-target');
        const r=el.getBoundingClientRect();
        const visible=r.width>0&&r.right>0&&r.left<window.innerWidth&&r.bottom>0&&r.top<window.innerHeight;
        setPos(p=>{const n=visible?{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)}:null;return p&&n&&p.x===n.x&&p.y===n.y?p:n;});
      }else setPos(p=>p?null:p);
      const view=document.querySelector<HTMLElement>('.psv-container');
      if(view){const t=Math.round(view.getBoundingClientRect().top)+12;setDock(d=>d===t?d:t);}
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=>{alive=false;cancelAnimationFrame(raf);targetRef.current?.classList.remove('nv-issue-target');};
  },[focus.hotspotId]);
  const doneRef=useRef<()=>void>(()=>{});doneRef.current=onNext??onClose;
  useEffect(()=>{if(!stillPresent){const t=window.setTimeout(()=>doneRef.current(),onNext?1400:2200);return ()=>window.clearTimeout(t);}},[stillPresent,focus.text]); // eslint-disable-line react-hooks/exhaustive-deps
  const W=300,right=pos&&pos.x+50+W<window.innerWidth;
  const style=pos?{left:right?pos.x+46:Math.max(8,pos.x-46-W),top:Math.max(70,Math.min(pos.y-30,window.innerHeight-170))}:{right:16,top:dock};
  return <aside className={'nv-issue-callout is-'+(stillPresent?focus.level:'ok')+(pos?(right?' arrow-left':' arrow-right'):'')} style={{...style,width:W}} role="status" aria-live="polite">
    {stillPresent?<><AlertTriangle size={18}/><div><b>{step?'Problème '+step.i+' sur '+step.n+' · ':''}{focus.level==='error'?'À corriger':'À vérifier'}</b><span>{focus.text}</span>{onOpen&&focus.hotspotId&&<button type="button" className="nv-issue-open" onClick={onOpen}>Ouvrir les réglages du point</button>}{onNext&&<button type="button" className="nv-issue-open nv-issue-next" onClick={onNext}>Passer au suivant →</button>}</div>
      <button type="button" onClick={onClose} aria-label="Fermer l’indication"><XMark size={14}/></button></>
    :<><CheckCircle2 size={18}/><div><b>Corrigé !</b><span>Ce problème a disparu du contrôle.{onNext?' Suivant…':''}</span></div></>}
  </aside>;
}
