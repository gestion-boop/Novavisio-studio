import {useEffect,useRef,type ReactNode} from 'react';
import {type BarStyle} from './storage';
import {XMark} from './XMark';

export function InspectorSection({title,children,initiallyOpen=false}:{title:string;children:ReactNode;initiallyOpen?:boolean}){
  return <details className="nv-inspector-section" open={initiallyOpen||undefined}>
    <summary>{title}<span aria-hidden="true">⌄</span></summary><div className="nv-inspector-section-body">{children}</div>
  </details>;
}
export function BarDimensions({style,onChange,size,onSize}:{style:BarStyle;onChange:(style:Partial<BarStyle>)=>void;size:number;onSize:(size:number)=>void}){
  return <div className="nv-bar-dimensions">
    <label>Taille de la barre et des boutons : {size} px
      <input aria-label="Taille de la barre et des boutons" type="range" min="20" max="72" step="2" value={size} onChange={e=>onSize(Number(e.target.value))}/>
    </label>
    <small>Un seul réglage : la barre et tous les boutons grandissent ensemble, toujours proportionnels.</small>
    <label className="toggle-row"><input type="checkbox" checked={!style.width} onChange={e=>onChange({width:e.target.checked?0:500})}/> Largeur automatique</label>
    {!!style.width&&<label>Largeur de la barre : {style.width} px
      <input aria-label="Largeur de la barre" type="range" min="240" max="1400" step="10" value={style.width} onChange={e=>onChange({width:Number(e.target.value)})}/>
    </label>}
    <small>La largeur s’adapte à l’écran. Les icônes restent accessibles par défilement si nécessaire.</small>
  </div>;
}
export function PreparationDialog({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}){
  const ref=useRef<HTMLElement>(null),close=useRef(onClose);close.current=onClose;
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    ref.current?.focus();
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close.current();}
      if(event.key==='Tab'){
        const nodes=[...(ref.current?.querySelectorAll<HTMLElement>('button,input,select,a[href],[tabindex="0"]')??[])].filter(el=>!el.hasAttribute('disabled')&&el.getClientRects().length);
        const first=nodes[0],last=nodes[nodes.length-1];
        if(event.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===ref.current)){event.preventDefault();first?.focus();}
      }
    };
    document.addEventListener('keydown',key,true);return ()=>{document.removeEventListener('keydown',key,true);previous?.focus();};
  },[]);
  return <div className="nv-preparation-overlay"><section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="nv-preparation-dialog">
    <header><div><small>NOVAVISIO STUDIO</small><h2>{title}</h2></div><button type="button" onClick={onClose} aria-label="Fermer la préparation"><XMark/></button></header>
    {children}
  </section></div>;
}
