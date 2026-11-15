import {createPortal} from 'react-dom';
import {Fragment,useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {Map,Maximize2,X,Eye} from 'lucide-react';
import {isSafeFrameImage,type FloorPlan,type Scene} from './storage';
import './floorPlan.css';

const visiblePoints=(plan:FloorPlan,scenes:Scene[])=>{
  const visible=new Set(scenes.filter(scene=>!scene.excluded).map(scene=>scene.id));
  return plan.points.filter(point=>visible.has(point.sceneId));
};

// Only the top dialog handles Escape / Tab when a 360 preview is open above the plan.
const modalStack:HTMLElement[]=[];
export function PlanModal({children,title,onClose,wide=false,icon,closeLabel='Fermer le plan'}:{children:ReactNode;title:string;onClose:()=>void;wide?:boolean;icon?:ReactNode;closeLabel?:string}){
  const root=useRef<HTMLElement>(null),close=useRef(onClose);
  close.current=onClose;
  const titleId=useId();
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    const element=root.current;
    if(element)modalStack.push(element);
    element?.focus();
    const key=(event:KeyboardEvent)=>{
      if(modalStack[modalStack.length-1]!==element)return;
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close.current();}
      if(event.key==='Tab'){
        const nodes=Array.from(root.current?.querySelectorAll<HTMLElement>('button,input,select,[tabindex="0"]')??[]).filter(el=>!el.hasAttribute('disabled')&&el.getClientRects().length);
        const first=nodes[0],last=nodes[nodes.length-1];
        if(event.shiftKey&&(document.activeElement===first||document.activeElement===root.current)){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===root.current)){event.preventDefault();first?.focus();}
      }
    };
    document.addEventListener('keydown',key,true);
    return ()=>{document.removeEventListener('keydown',key,true);if(element){const index=modalStack.indexOf(element);if(index>=0)modalStack.splice(index,1);}previous?.focus();};
  },[]);
  return createPortal(<div className="nv-plan-overlay" onClick={e=>{e.stopPropagation();if(e.target===e.currentTarget)onClose();}}>
    <section className={'nv-plan-dialog'+(wide?' nv-plan-dialog-editor':'')} ref={root} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
      <header><h2 id={titleId}>{icon??<Map size={22}/>}{title}</h2><button type="button" aria-label={closeLabel} onClick={onClose}><X/></button></header>
      {children}
    </section>
  </div>,document.fullscreenElement??document.body);
}

/** The image determines the canvas size: markers never drift into letterboxing. */
function PlanImage({plan,scenes,currentId,onPick,onPlace,onMove,onRemove}:{onRemove?:(id:string)=>void;plan:FloorPlan;scenes:Scene[];currentId?:string;onPick:(id:string)=>void;onPlace?:(x:number,y:number)=>void;onMove?:(id:string,x:number,y:number)=>void}){
  const drag=useRef<{x:number;y:number;moved:boolean;dx:number;dy:number}|null>(null);
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
      return <Fragment key={point.sceneId}><button type="button" className={'nv-plan-point nv-no-fx'+(current?' is-current':'')} style={{left:point.x+'%',top:point.y+'%'}}
        aria-label={(onPlace?'Sélectionner : ':'Aller à : ')+scene.name} aria-current={current?'location':undefined} title={scene.name}
        onPointerDown={onMove?e=>{if(e.button!==0)return;e.stopPropagation();const rect=e.currentTarget.getBoundingClientRect();drag.current={x:e.clientX,y:e.clientY,moved:false,dx:e.clientX-rect.left-rect.width/2,dy:e.clientY-rect.top-rect.height/2};suppressClick.current=false;e.currentTarget.setPointerCapture(e.pointerId);onPick(point.sceneId);}:undefined}
        onPointerMove={onMove?e=>{if(!drag.current)return;if(Math.hypot(e.clientX-drag.current.x,e.clientY-drag.current.y)>4)drag.current.moved=true;if(drag.current.moved){const p=position(e.clientX-drag.current.dx,e.clientY-drag.current.dy,e.currentTarget.parentElement!.getBoundingClientRect());e.currentTarget.style.left=p.x+'%';e.currentTarget.style.top=p.y+'%';}}:undefined}
        onPointerUp={onMove?e=>{if(!drag.current)return;const {moved,dx,dy}=drag.current;drag.current=null;suppressClick.current=moved;if(moved){const p=position(e.clientX-dx,e.clientY-dy,e.currentTarget.parentElement!.getBoundingClientRect());onMove(point.sceneId,p.x,p.y);}}:undefined}
        onPointerCancel={e=>{drag.current=null;e.currentTarget.style.left=point.x+'%';e.currentTarget.style.top=point.y+'%';}}
        onClick={e=>{e.stopPropagation();if(suppressClick.current){suppressClick.current=false;return;}onPick(point.sceneId);}}><span>{index+1}</span></button>
        {onRemove&&<button type="button" className="nv-plan-remove nv-no-fx" style={{left:`calc(${point.x}% + 16px)`,top:`calc(${point.y}% - 16px)`}}
          aria-label={'Retirer le point : '+scene.name} title={'Retirer le point : '+scene.name} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onRemove(point.sceneId);}}><X size={13}/></button>}
      </Fragment>;
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

export function FloorPlanEditor({plan,scenes,onChange,hasPlanButton,onAddButton,onPreview,thumbs={},renderPreview}:{renderPreview?:(id:string)=>ReactNode;thumbs?:Record<string,string>;plan?:FloorPlan;scenes:Scene[];onChange:(plan:FloorPlan|undefined)=>void;hasPlanButton:boolean;onAddButton:()=>void;onPreview:()=>void}){
  const [selectedId,setSelectedId]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[expanded,setExpanded]=useState(!!plan);
  const [previewId,setPreviewId]=useState<string|null>(null);
  const previewScene=scenes.find(scene=>scene.id===previewId);
  const fileInput=useRef<HTMLInputElement>(null),importing=useRef(false);
  const available=scenes.filter(scene=>!scene.excluded);
  const selected=available.find(scene=>scene.id===selectedId)??available[0];
  const removePoint=(id:string)=>{if(plan)onChange({...plan,points:plan.points.filter(point=>point.sceneId!==id)});};
  const movePoint=(sceneId:string,x:number,y:number)=>{
    if(!plan||!available.some(scene=>scene.id===sceneId))return;
    setSelectedId(sceneId);
    onChange({...plan,points:plan.points.some(point=>point.sceneId===sceneId)?plan.points.map(point=>point.sceneId===sceneId?{sceneId,x,y}:point):[...plan.points,{sceneId,x,y}]});
  };
  const place=(x:number,y:number)=>{if(selected)movePoint(selected.id,x,y);};
  const controls=<div className="nv-plan-editor">
    <p>Glisse un panorama de la liste sur le plan. Pour retirer un point, clique sur sa croix.</p>
    {plan&&<>
      <div className="nv-plan-workspace">
        <div className="nv-plan-workspace-map">
          <div className="nv-plan-pane-heading"><strong>Plan de la visite</strong><small>{visiblePoints(plan,available).length} / {available.length} panoramas placés</small></div>
          <div className="nv-plan-edit-canvas"><PlanImage plan={plan} scenes={available} currentId={selected?.id} onPick={setSelectedId} onPlace={selected?place:undefined} onMove={movePoint} onRemove={removePoint}/></div>
        </div>
        <aside className="nv-plan-panorama-pane" aria-label="Liste et aperçu des panoramas">
          <strong>Panoramas</strong>
          <div className="nv-plan-source-list" role="group" aria-label="Panoramas à glisser sur le plan">{available.map(scene=>{
            const index=visiblePoints(plan,available).findIndex(point=>point.sceneId===scene.id);
            return <div className="nv-plan-source-row" key={scene.id}><button type="button" className="nv-plan-source-card" draggable aria-label={scene.name} aria-pressed={selected?.id===scene.id}
              onClick={()=>setSelectedId(scene.id)} onDragStart={e=>{e.dataTransfer.setData('text/plain',scene.id);e.dataTransfer.effectAllowed='move';setSelectedId(scene.id);}}>
              {thumbs[scene.id]?<img src={thumbs[scene.id]} alt="" loading="lazy" draggable={false}/>:<span className="nv-plan-thumb-placeholder">360°</span>}
              <span className="nv-plan-source-copy"><strong>{scene.name}</strong><small>{index>=0?'✓ Point '+(index+1)+' sur le plan':'À placer sur le plan'}</small></span>
            </button>
              {renderPreview&&<button type="button" className="nv-plan-preview-eye" aria-label={'Voir '+scene.name+' en 360°'} title="Aperçu 360°" draggable={false}
                onPointerDown={e=>e.stopPropagation()} onDragStart={e=>e.preventDefault()} onClick={e=>{e.stopPropagation();setPreviewId(scene.id);}}><Eye size={18}/></button>}
            </div>;
          })}</div>
        </aside>
      </div>
    </>}
    {previewScene&&renderPreview&&<PlanModal title={'Aperçu 360° · '+previewScene.name} icon={<Eye size={22}/>} closeLabel="Fermer l’aperçu 360°" onClose={()=>setPreviewId(null)}>
      <div className="nv-plan-popup-preview" key={previewScene.id}>{renderPreview(previewScene.id)}</div>
      <p className="nv-plan-help">Glisse pour regarder à 360° et utilise la molette pour zoomer.</p>
    </PlanModal>}
  </div>;
  return <div className="nv-plan-editor">
    <p>Importe le plan de cette visite (PNG, JPG ou WebP), puis associe chaque point à un panorama.</p>
    <input ref={fileInput} hidden type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={async e=>{
      const file=e.target.files?.[0];e.target.value='';if(!file||importing.current)return;
      // Replacing a drawing clears positions because its layout may be different.
      if(plan&&!window.confirm('Remplacer le plan ? Les points devront être replacés sur la nouvelle image.'))return;
      importing.current=true;setBusy(true);setError('');
      try{onChange({imageDataUrl:await importPlan(file),name:file.name.slice(0,200),points:[]});setExpanded(true);}
      catch(error){setError(error instanceof Error?error.message:'Import impossible.');}
      finally{importing.current=false;setBusy(false);}
    }}/>
    <button type="button" disabled={busy} onClick={()=>fileInput.current?.click()}>{busy?'Import du plan…':plan?'Remplacer le plan':'Importer un plan'}</button>
    {error&&<p role="alert">{error}</p>}
    {plan&&<>
      <button type="button" onClick={()=>setExpanded(true)}><Maximize2 size={16}/> Ouvrir le plan</button>
      {expanded?<PlanModal wide title="Plan et panoramas" onClose={()=>setExpanded(false)}><div className="nv-plan-expanded-editor">{controls}</div></PlanModal>:null}
      <div className="nv-plan-editor-actions">
        {!hasPlanButton&&<button type="button" onClick={onAddButton}>＋ Ajouter le bouton Plan à la visite</button>}
        {hasPlanButton&&<small>✓ Une action Plan est configurée dans la barre de la visite.</small>}
        <button type="button" onClick={onPreview}>Tester le plan dans la visite</button>
        <button type="button" disabled={busy} onClick={()=>{if(window.confirm('Supprimer le plan et ses points ? Les panoramas seront conservés.'))onChange(undefined);}}>Supprimer le plan</button>
      </div>
    </>}
  </div>;
}
