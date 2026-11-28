import {useEffect,useRef,useState,type ReactNode} from 'react';
import {type BarStyle} from './storage';
import {XMark} from './XMark';

export function InspectorSection({title,children,initiallyOpen=false}:{title:string;children:ReactNode;initiallyOpen?:boolean}){
  return <details className="nv-inspector-section" open={initiallyOpen||undefined}>
    <summary>{title}<span aria-hidden="true">⌄</span></summary><div className="nv-inspector-section-body">{children}</div>
  </details>;
}
const foldSearch=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

/** Pure : vrai si TOUS les mots cherchés se trouvent dans le texte (sans accents ni casse). */
export function matchesSearch(haystack:string,query:string):boolean{
  const words=foldSearch(query).split(/\s+/).filter(Boolean);
  if(!words.length)return true;
  const text=foldSearch(haystack);
  return words.every(word=>text.includes(word));
}

/**
 * Champ de recherche placé en tête d'un panneau d'`InspectorSection` : il masque les sections qui ne correspondent pas
 * (titre ou contenu) et ouvre celles qui correspondent. En effaçant, chaque section retrouve son état d'origine.
 */
export function InspectorSearch({placeholder='Rechercher un réglage…'}:{placeholder?:string}){
  const [query,setQuery]=useState('');
  const [found,setFound]=useState<number|null>(null);
  const holder=useRef<HTMLDivElement>(null);
  const touched=useRef(false);
  useEffect(()=>{
    const root=holder.current?.parentElement;
    if(!root)return;
    const sections=[...root.querySelectorAll<HTMLDetailsElement>('details.nv-inspector-section')];
    const active=query.trim().length>0;
    if(!active&&!touched.current)return;
    let count=0;
    for(const section of sections){
      if(!active){
        // Retour à l'état d'avant la recherche.
        section.style.display='';
        if(section.dataset.nvWasOpen!==undefined)section.open=section.dataset.nvWasOpen==='1';
        delete section.dataset.nvWasOpen;
        continue;
      }
      if(section.dataset.nvWasOpen===undefined)section.dataset.nvWasOpen=section.open?'1':'0';
      const hit=matchesSearch(section.textContent??'',query);
      section.style.display=hit?'':'none';
      if(hit){section.open=true;count++;}
    }
    touched.current=active;
    setFound(active?count:null);
  });
  return <div className="nv-inspector-search" ref={holder} role="search">
    <input type="search" value={query} placeholder={placeholder} aria-label="Rechercher dans les réglages"
      onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(event.key==='Escape'&&query){event.stopPropagation();setQuery('');}}}/>
    {found===0&&<small className="nv-inspector-search-empty">Aucun réglage ne correspond à « {query.trim()} ».</small>}
  </div>;
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
