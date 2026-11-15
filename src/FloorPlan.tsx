import {createPortal} from 'react-dom';
import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {Map,Maximize2,X} from 'lucide-react';
import {isSafeFrameImage,type FloorPlan,type Scene} from './storage';
import './floorPlan.css';

const visiblePoints=(plan:FloorPlan,scenes:Scene[])=>{
  const visible=new Set(scenes.filter(scene=>!scene.excluded).map(scene=>scene.id));
  return plan.points.filter(point=>visible.has(point.sceneId));
};

function PlanModal({children,title,onClose}:{children:ReactNode;title:string;onClose:()=>void}){
  const root=useRef<HTMLElement>(null),close=useRef(onClose);
  close.current=onClose;
  const titleId=useId();
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    root.current?.focus();
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close.current();}
      if(event.key==='Tab'){
        const nodes=Array.from(root.current?.querySelectorAll<HTMLElement>('button,input,select,[tabindex="0"]')??[]).filter(el=>!el.hasAttribute('disabled')&&el.getClientRects().length);
        const first=nodes[0],last=nodes[nodes.length-1];
        if(event.shiftKey&&(document.activeElement===first||document.activeElement===root.current)){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===root.current)){event.preventDefault();first?.focus();}
      }
    };
    document.addEventListener('keydown',key,true);
    return ()=>{document.removeEventListener('keydown',key,true);previous?.focus();};
  },[]);
  return createPortal(<div className="nv-plan-overlay" onClick={e=>{e.stopPropagation();if(e.target===e.currentTarget)onClose();}}>
    <section className="nv-plan-dialog" ref={root} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
      <header><h2 id={titleId}><Map size={22}/>{title}</h2><button type="button" aria-label="Fermer le plan" onClick={onClose}><X/></button></header>
      {children}
    </section>
  </div>,document.fullscreenElement??document.body);
}

/** The image determines the canvas size: markers never drift into letterboxing. */
function PlanImage({plan,scenes,currentId,onPick,onPlace,onMove}:{plan:FloorPlan;scenes:Scene[];currentId?:string;onPick:(id:string)=>void;onPlace?:(x:number,y:number)=>void;onMove?:(id:string,x:number,y:number)=>void}){
  const drag=useRef<{x:number;y:number;moved:boolean}|null>(null);
  const suppressClick=useRef(false);
  const position=(clientX:number,clientY:number,rect:DOMRect)=>({x:Math.max(0,Math.min(100,(clientX-rect.left)/rect.width*100)),y:Math.max(0,Math.min(100,(clientY-rect.top)/rect.height*100))});
  return <div className={'nv-plan-image'+(onPlace?' is-editing':'')}
    onDragOver={onMove?e=>{e.preventDefault();e.dataTransfer.dropEffect='move';}:undefined}
    onDrop={onMove?e=>{e.preventDefault();e.stopPropagation();const id=e.dataTransfer.getData('text/plain');if(!scenes.some(scene=>scene.id===id))return;const p=position(e.clientX,e.clientY,e.currentTarget.getBoundingClientRect());onMove(id,p.x,p.y);}:undefined}
    onClick={onPlace?e=>{
    const rect=e.currentTarget.getBoundingClientRect();
    const p=position(e.clientX,e.clientY,rect);onPlace(p.x,p.y);
  }:undefined}>
    <img src={plan.imageDataUrl} alt={plan.name||'Plan de la visite'} draggable={false}/>
    {visiblePoints(plan,scenes).map((point,index)=>{
      const scene=scenes.find(scene=>scene.id===point.sceneId)!;
      const current=scene.id===currentId;
      return <button type="button" key={point.sceneId} className={'nv-plan-point'+(current?' is-current':'')} style={{left:point.x+'%',top:point.y+'%'}}
        aria-label={(onPlace?'Sélectionner : ':'Aller à : ')+scene.name} aria-current={current?'location':undefined} title={scene.name}
        onPointerDown={onMove?e=>{if(e.button!==0)return;e.stopPropagation();drag.current={x:e.clientX,y:e.clientY,moved:false};suppressClick.current=false;e.currentTarget.setPointerCapture(e.pointerId);onPick(point.sceneId);}:undefined}
        onPointerMove={onMove?e=>{if(!drag.current)return;if(Math.hypot(e.clientX-drag.current.x,e.clientY-drag.current.y)>4)drag.current.moved=true;if(drag.current.moved){const p=position(e.clientX,e.clientY,e.currentTarget.parentElement!.getBoundingClientRect());e.currentTarget.style.left=p.x+'%';e.currentTarget.style.top=p.y+'%';}}:undefined}
        onPointerUp={onMove?e=>{if(!drag.current)return;const moved=drag.current.moved;drag.current=null;suppressClick.current=moved;if(moved){const p=position(e.clientX,e.clientY,e.currentTarget.parentElement!.getBoundingClientRect());onMove(point.sceneId,p.x,p.y);}}:undefined}
        onPointerCancel={e=>{drag.current=null;e.currentTarget.style.left=point.x+'%';e.currentTarget.style.top=point.y+'%';}}
        onClick={e=>{e.stopPropagation();if(suppressClick.current){suppressClick.current=false;return;}onPick(point.sceneId);}}><span>{index+1}</span></button>;
    })}
  </div>;
}

export function FloorPlanDialog({plan,scenes,currentId,onPick,onClose}:{plan?:FloorPlan;scenes:Scene[];currentId?:string;onPick:(id:string)=>void;onClose:()=>void}){
  const points=plan?visiblePoints(plan,scenes):[];
  return <PlanModal title="Plan de la visite" onClose={onClose}>
    {plan?.imageDataUrl?<>
      <p className="nv-plan-help">Cliquez sur un point pour rejoindre son panorama. Le point en couleur indique votre position.</p>
      <div className="nv-plan-view"><PlanImage plan={plan} scenes={scenes} currentId={currentId} onPick={onPick}/></div>
      {points.length?<nav className="nv-plan-destinations" aria-label="Destinations du plan">{points.map((point,index)=>{
        const scene=scenes.find(scene=>scene.id===point.sceneId)!;
        return <button key={scene.id} type="button" aria-current={scene.id===currentId?'location':undefined} onClick={()=>onPick(scene.id)}>{index+1}. {scene.name}</button>;
      })}</nav>:<p role="status" className="nv-plan-help">Aucun panorama accessible n’est placé sur ce plan.</p>}
    </>:<p role="status" className="nv-plan-help">{plan?"Chargement du plan… S’il ne s’affiche pas, rechargez la visite.":"Le plan de cette visite n’a pas encore été configuré."}</p>}
  </PlanModal>;
}

async function importPlan(file:File):Promise<string>{
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Choisis une image PNG, JPG ou WebP.');
  if(file.size>25*1024*1024)throw Error('Le plan doit peser moins de 25 Mo.');
  const bitmap=await createImageBitmap(file);
  try{
    const scale=Math.min(1,3000/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const ctx=canvas.getContext('2d');
    if(!ctx)throw Error('Impossible de lire cette image.');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    for(const quality of [.95,.85,.7,.5]){
      const data=canvas.toDataURL('image/jpeg',quality);
      if(isSafeFrameImage(data)&&data.length<=6_000_000)return data;
    }
    throw Error('Image trop lourde : réduis ses dimensions avant de l’importer.');
  }finally{bitmap.close();}
}

export function FloorPlanEditor({plan,scenes,onChange,hasPlanButton,onAddButton,onPreview}:{plan?:FloorPlan;scenes:Scene[];onChange:(plan:FloorPlan|undefined)=>void;hasPlanButton:boolean;onAddButton:()=>void;onPreview:()=>void}){
  const [selectedId,setSelectedId]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[expanded,setExpanded]=useState(false);
  const fileInput=useRef<HTMLInputElement>(null),importing=useRef(false);
  const available=scenes.filter(scene=>!scene.excluded);
  const selected=available.find(scene=>scene.id===selectedId)??available[0];
  const point=plan?.points.find(point=>point.sceneId===selected?.id);
  const movePoint=(sceneId:string,x:number,y:number)=>{
    if(!plan||!available.some(scene=>scene.id===sceneId))return;
    setSelectedId(sceneId);
    onChange({...plan,points:plan.points.some(point=>point.sceneId===sceneId)?plan.points.map(point=>point.sceneId===sceneId?{sceneId,x,y}:point):[...plan.points,{sceneId,x,y}]});
  };
  const place=(x:number,y:number)=>{if(selected)movePoint(selected.id,x,y);};
  const controls=<div className="nv-plan-editor">
    <p>Glisse un panorama sur le plan, ou sélectionne-le puis clique à son emplacement. Les points peuvent aussi être déplacés à la souris ou au doigt.</p>
    {plan&&<>
      <label>Panorama à placer<select value={selected?.id??''} disabled={!available.length} onChange={e=>setSelectedId(e.target.value)}>
        {!available.length&&<option value="">Importe d’abord des panoramas</option>}
        {available.map(scene=><option key={scene.id} value={scene.id}>{plan.points.some(point=>point.sceneId===scene.id)?'✓ ':''}{scene.name}</option>)}
      </select></label>
      <div className="nv-plan-source-list" role="group" aria-label="Panoramas à glisser sur le plan">{available.map(scene=><button type="button" key={scene.id} draggable aria-pressed={selected?.id===scene.id}
        onClick={()=>setSelectedId(scene.id)} onDragStart={e=>{e.dataTransfer.setData('text/plain',scene.id);e.dataTransfer.effectAllowed='move';setSelectedId(scene.id);}}>{plan.points.some(point=>point.sceneId===scene.id)?'✓ ':''}{scene.name}</button>)}</div>
      <div className="nv-plan-edit-canvas"><PlanImage plan={plan} scenes={available} currentId={selected?.id} onPick={setSelectedId} onPlace={selected?place:undefined} onMove={movePoint}/></div>
      {selected&&<div className="nv-plan-position">
        <span>{selected.name} {point?'· placé':'· à placer'}</span>
        {(['x','y'] as const).map(axis=><label key={axis}>{axis==='x'?'Horizontal':'Vertical'} (%)<input type="number" min="0" max="100" step="0.1" value={Math.round((point?.[axis]??50)*10)/10} onChange={e=>{
          if(e.target.value==='')return;
          const value=Number(e.target.value);
          if(Number.isFinite(value))place(axis==='x'?Math.max(0,Math.min(100,value)):point?.x??50,axis==='y'?Math.max(0,Math.min(100,value)):point?.y??50);
        }}/></label>)}
        {!point&&<button type="button" onClick={()=>place(50,50)}>Placer au centre</button>}
        {point&&<button type="button" onClick={()=>onChange({...plan,points:plan.points.filter(point=>point.sceneId!==selected.id)})}>Retirer ce point</button>}
      </div>}
      <small>{visiblePoints(plan,available).length} / {available.length} panoramas placés</small>
    </>}
  </div>;
  return <div className="nv-plan-editor">
    <p>Importe le plan de cette visite (PNG, JPG ou WebP), puis associe chaque point à un panorama.</p>
    <input ref={fileInput} hidden type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={async e=>{
      const file=e.target.files?.[0];e.target.value='';if(!file||importing.current)return;
      // Replacing a drawing clears positions because its layout may be different.
      if(plan&&!window.confirm('Remplacer le plan ? Les points devront être replacés sur la nouvelle image.'))return;
      importing.current=true;setBusy(true);setError('');
      try{onChange({imageDataUrl:await importPlan(file),name:file.name.slice(0,200),points:[]});}
      catch(error){setError(error instanceof Error?error.message:'Import impossible.');}
      finally{importing.current=false;setBusy(false);}
    }}/>
    <button type="button" disabled={busy} onClick={()=>fileInput.current?.click()}>{busy?'Import du plan…':plan?'Remplacer le plan':'Importer un plan'}</button>
    {error&&<p role="alert">{error}</p>}
    {plan&&<>
      <button type="button" onClick={()=>setExpanded(true)}><Maximize2 size={16}/> Agrandir l’éditeur du plan</button>
      {expanded?<PlanModal title="Placer les panoramas sur le plan" onClose={()=>setExpanded(false)}><div className="nv-plan-expanded-editor">{controls}</div></PlanModal>:controls}
      <div className="nv-plan-editor-actions">
        {!hasPlanButton&&<button type="button" onClick={onAddButton}>＋ Ajouter le bouton Plan à la visite</button>}
        {hasPlanButton&&<small>✓ Une action Plan est configurée dans la barre de la visite.</small>}
        <button type="button" onClick={onPreview}>Tester le plan dans la visite</button>
        <button type="button" disabled={busy} onClick={()=>{if(window.confirm('Supprimer le plan et ses points ? Les panoramas seront conservés.'))onChange(undefined);}}>Supprimer le plan</button>
      </div>
    </>}
  </div>;
}
