import {proposePlanLayout} from './planAutoPlace';
import {confirmAsk} from './confirmDialog';
import {createPortal} from 'react-dom';
import {Fragment,useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {Map,Maximize2,X,Eye} from 'lucide-react';
import {isSafeFrameImage,type FloorPlan,type Scene} from './storage';
import {ui,pick} from './i18n';
import './floorPlan.css';

const visiblePoints=(plan:FloorPlan,scenes:Scene[])=>{
  const visible=new Set(scenes.filter(scene=>!scene.excluded).map(scene=>scene.id));
  return plan.points.filter(point=>visible.has(point.sceneId));
};

// Only the top dialog handles Escape / Tab when a 360 preview is open above the plan.
const modalStack:HTMLElement[]=[];
export function PlanModal({children,title,onClose,wide=false,immersive=false,icon,closeLabel='Fermer le plan',onEscape,animated=false}:{children:ReactNode;title:string;onClose:()=>void;wide?:boolean;immersive?:boolean;icon?:ReactNode;closeLabel?:string;onEscape?:()=>void;animated?:boolean}){
  const root=useRef<HTMLElement>(null),close=useRef(onClose);
  close.current=onClose;
  const escape=useRef(onEscape);escape.current=onEscape;
  const titleId=useId();
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    const element=root.current;
    if(element)modalStack.push(element);
    element?.focus();
    const key=(event:KeyboardEvent)=>{
      if(modalStack[modalStack.length-1]!==element)return;
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();(escape.current??close.current)();}
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
  return createPortal(<div className={'nv-plan-overlay'+(animated?' nv-plan-animated':'')} onClick={e=>{e.stopPropagation();if(e.target===e.currentTarget)onClose();}}>
    <section className={'nv-plan-dialog'+(wide?' nv-plan-dialog-editor':'')+(immersive?' nv-plan-dialog-immersive':'')} ref={root} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
      <header><h2 id={titleId}>{icon??<Map size={22}/>}{title}</h2><button type="button" aria-label={closeLabel} onClick={onClose}><X/></button></header>
      {children}
    </section>
  </div>,document.fullscreenElement??document.body);
}

/** The image determines the canvas size: markers never drift into letterboxing. */
function PlanImage({plan,scenes,currentId,onPick,onPlace,onMove,onRemove,thumbs,lang='fr'}:{lang?:string;onRemove?:(id:string)=>void;plan:FloorPlan;scenes:Scene[];currentId?:string;onPick:(id:string)=>void;onPlace?:(x:number,y:number)=>void;onMove?:(id:string,x:number,y:number)=>void;thumbs?:Record<string,string>}){
  const drag=useRef<{x:number;y:number;moved:boolean;dx:number;dy:number}|null>(null);
  const suppressClick=useRef(false);
  const [dragOverPos,setDragOverPos]=useState<{x:number;y:number}|null>(null);
  const [ripple,setRipple]=useState<{x:number;y:number;id:number}|null>(null);
  const [movingPointId,setMovingPointId]=useState<string|null>(null);
  const [hoveredSceneId,setHoveredSceneId]=useState<string|null>(null);
  const position=(clientX:number,clientY:number,rect:DOMRect)=>({x:Math.max(0,Math.min(100,(clientX-rect.left)/rect.width*100)),y:Math.max(0,Math.min(100,(clientY-rect.top)/rect.height*100))});
  return <div className={'nv-plan-image'+(onPlace?' is-editing':'')+(dragOverPos?' is-drag-over':'')}
    onDragOver={onMove?e=>{e.preventDefault();e.dataTransfer.dropEffect='move';const rect=e.currentTarget.getBoundingClientRect();setDragOverPos(position(e.clientX,e.clientY,rect));}:undefined}
    onDragLeave={onMove?e=>{if(e.currentTarget.contains(e.relatedTarget as Node))return;setDragOverPos(null);}:undefined}
    onDrop={onMove?e=>{
      e.preventDefault();e.stopPropagation();setDragOverPos(null);
      const id=e.dataTransfer.getData('text/plain');if(!scenes.some(scene=>scene.id===id))return;
      const p=position(e.clientX,e.clientY,e.currentTarget.getBoundingClientRect());
      setRipple({x:p.x,y:p.y,id:Date.now()});
      onMove(id,p.x,p.y);
    }:undefined}
    onClick={onPlace?e=>{
      const rect=e.currentTarget.getBoundingClientRect();
      const p=position(e.clientX,e.clientY,rect);
      setRipple({x:p.x,y:p.y,id:Date.now()});
      onPlace(p.x,p.y);
    }:undefined}>
    <img src={plan.imageDataUrl} alt={plan.name||'Plan de la visite'} draggable={false}/>
    {dragOverPos&&<div className="nv-plan-reticle" style={{left:dragOverPos.x+'%',top:dragOverPos.y+'%'}}>
      <div className="nv-plan-reticle-ring"/>
      <div className="nv-plan-reticle-crosshair"/>
      <span className="nv-plan-reticle-label">Déposer ici</span>
    </div>}
    {ripple&&<div key={ripple.id} className="nv-plan-drop-ripple" style={{left:ripple.x+'%',top:ripple.y+'%'}}/>}
    {visiblePoints(plan,scenes).map((point,index)=>{
      const scene=scenes.find(scene=>scene.id===point.sceneId)!;
      const current=scene.id===currentId;
      const isMoving=movingPointId===point.sceneId;
      const isHovered=hoveredSceneId===point.sceneId&&!movingPointId;
      return <Fragment key={point.sceneId}>
        <button type="button" className={'nv-plan-point nv-no-fx'+(current?' is-current':'')+(isMoving?' is-moving':'')} style={{left:point.x+'%',top:point.y+'%'}}
          aria-label={(onPlace?ui('select',lang):ui('goTo',lang))+pick(scene.name,scene.nameTranslations,lang)} aria-current={current?'location':undefined} title={pick(scene.name,scene.nameTranslations,lang)}
          onMouseEnter={()=>setHoveredSceneId(point.sceneId)}
          onMouseLeave={()=>setHoveredSceneId(id=>id===point.sceneId?null:id)}
          onPointerDown={onMove?e=>{if(e.button!==0)return;e.stopPropagation();const rect=e.currentTarget.getBoundingClientRect();drag.current={x:e.clientX,y:e.clientY,moved:false,dx:e.clientX-rect.left-rect.width/2,dy:e.clientY-rect.top-rect.height/2};suppressClick.current=false;setMovingPointId(point.sceneId);e.currentTarget.setPointerCapture(e.pointerId);onPick(point.sceneId);}:undefined}
          onPointerMove={onMove?e=>{if(!drag.current)return;if(Math.hypot(e.clientX-drag.current.x,e.clientY-drag.current.y)>4)drag.current.moved=true;if(drag.current.moved){const p=position(e.clientX-drag.current.dx,e.clientY-drag.current.dy,e.currentTarget.parentElement!.getBoundingClientRect());e.currentTarget.style.left=p.x+'%';e.currentTarget.style.top=p.y+'%';}}:undefined}
          onPointerUp={onMove?e=>{if(!drag.current)return;const {moved,dx,dy}=drag.current;drag.current=null;setMovingPointId(null);suppressClick.current=moved;if(moved){const p=position(e.clientX-dx,e.clientY-dy,e.currentTarget.parentElement!.getBoundingClientRect());setRipple({x:p.x,y:p.y,id:Date.now()});onMove(point.sceneId,p.x,p.y);}}:undefined}
          onPointerCancel={e=>{drag.current=null;setMovingPointId(null);e.currentTarget.style.left=point.x+'%';e.currentTarget.style.top=point.y+'%';}}
          onClick={e=>{e.stopPropagation();if(suppressClick.current){suppressClick.current=false;return;}onPick(point.sceneId);}}><span>{index+1}</span></button>
        {onRemove&&<button type="button" className="nv-plan-remove nv-no-fx" style={{left:`calc(${point.x}% + 16px)`,top:`calc(${point.y}% - 16px)`}}
          aria-label={'Retirer le point : '+scene.name} title={'Retirer le point : '+scene.name} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onRemove(point.sceneId);}}><X size={13}/></button>}
        {isHovered&&<div className={'nv-plan-point-tooltip'+(point.y<22?' is-below':'')} style={{left:point.x+'%',top:point.y+'%'}}>
          {thumbs?.[point.sceneId]&&<img src={thumbs[point.sceneId]} alt="" draggable={false}/>}
          <strong>{pick(scene.name,scene.nameTranslations,lang)}</strong>
        </div>}
      </Fragment>;
    })}
  </div>;
}


/** Galerie publique de plans : l'étage actif est prioritaire si le panorama courant y figure. */
export function FloorPlanDialog({plans,scenes,currentId,onPick,onClose,thumbs,lang='fr',shortcuts,onShortcut}:{
  plans:FloorPlan[];scenes:Scene[];currentId?:string;onPick:(id:string)=>void;onClose:()=>void;
  thumbs?:Record<string,string>;lang?:string;
  /** Raccourcis de la barre du bas affichés sous le plan (option « Intégrer les raccourcis dans le plan »). */
  shortcuts?:{id:string;label:string;icon?:string}[];onShortcut?:(id:string)=>void;
}){
  const [selectedIndex,setSelectedIndex]=useState(()=>{
    const index=plans.findIndex(plan=>plan.points.some(point=>point.sceneId===currentId));
    return index>=0?index:0;
  });
  const index=Math.max(0,Math.min(selectedIndex,plans.length-1));
  const plan=plans[index];
  const points=plan?visiblePoints(plan,scenes):[];
  const change=(step:number)=>setSelectedIndex(i=>(i+step+plans.length)%plans.length);
  return <PlanModal animated immersive title={ui('planTitle',lang)} closeLabel={ui('close',lang)} onClose={onClose}>
    {plan?.imageDataUrl?<div className="nv-plan-immersive-layout">
      <div className="nv-plan-immersive-stage">
        <div className="nv-plan-immersive-caption">
          <strong>{plan.name||'Plan '+(index+1)}</strong>
          <small>{index+1} / {plans.length} · {points.length} panorama{points.length>1?'s':''}</small>
        </div>
        <div className="nv-plan-view"><PlanImage key={plan.id??index} plan={plan} scenes={scenes}
          currentId={currentId} onPick={onPick} thumbs={thumbs} lang={lang}/></div>
        {!points.length&&<small className="nv-plan-immersive-empty">{ui('noPlanPoint',lang)}</small>}
        {shortcuts&&shortcuts.length>0&&onShortcut&&<nav className="nv-plan-shortcuts" aria-label="Raccourcis">
          {shortcuts.map(s=><button type="button" key={s.id} title={s.label} onClick={()=>onShortcut(s.id)}>
            {s.icon?<img src={s.icon} alt="" draggable={false}/>:<span aria-hidden="true">●</span>}<span>{s.label}</span></button>)}
        </nav>}
      </div>
      {plans.length>1&&<aside className="nv-plan-immersive-rail" aria-label="Changer de plan">
        <button type="button" className="nv-plan-rail-arrow" onClick={()=>change(-1)} aria-label="Plan précédent">‹</button>
        <div className="nv-plan-immersive-thumbs" role="group" aria-label="Galerie de plans">
          {plans.map((item,i)=><button type="button" key={item.id??i} aria-pressed={i===index}
            title={item.name||'Plan '+(i+1)} aria-label={'Afficher '+(item.name||'plan '+(i+1))}
            onClick={()=>setSelectedIndex(i)}>
            <img src={item.imageDataUrl} alt=""/><span>{i+1}</span>
          </button>)}
        </div>
        <button type="button" className="nv-plan-rail-arrow" onClick={()=>change(1)} aria-label="Plan suivant">›</button>
      </aside>}
    </div>:<p role="status" className="nv-plan-help">Aucun plan n'a encore été ajouté à cette visite.</p>}
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


export function FloorPlanEditor({plans,scenes,onChange,hasPlanButton,onAddButton,onPreview,thumbs={},renderPreview,onSceneChange}:{
  renderPreview?:(id:string)=>ReactNode;thumbs?:Record<string,string>;
  /** Renomme un panorama ou règle sa superficie (m²) directement depuis le plan. */
  onSceneChange?:(id:string,patch:{name?:string;surfaceM2?:number|null})=>void;
  plans:FloorPlan[];scenes:Scene[];onChange:(plans:FloorPlan[])=>void;
  hasPlanButton:boolean;onAddButton:()=>void;onPreview:()=>void;
}){
  const [selectedIndex,setSelectedIndex]=useState(0);
  const [selectedId,setSelectedId]=useState('');
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [expanded,setExpanded]=useState(false);
  const [previewId,setPreviewId]=useState<string|null>(null);
  const [draggingSceneId,setDraggingSceneId]=useState<string|null>(null);
  const fileInput=useRef<HTMLInputElement>(null),importing=useRef(false);
  const importMode=useRef<'append'|'replace'>('append');
  const available=scenes.filter(scene=>!scene.excluded);
  const index=Math.max(0,Math.min(selectedIndex,plans.length-1));
  const plan=plans[index];
  const selected=available.find(scene=>scene.id===selectedId)??available[0];
  const previewScene=scenes.find(scene=>scene.id===previewId);
  const updatePlan=(change:(plan:FloorPlan)=>FloorPlan)=>{
    if(!plan)return;
    onChange(plans.map((item,i)=>i===index?change(item):item));
  };
  const removePoint=(id:string)=>updatePlan(item=>({...item,points:item.points.filter(point=>point.sceneId!==id)}));
  const movePoint=(sceneId:string,x:number,y:number)=>{
    if(!plan||!available.some(scene=>scene.id===sceneId))return;
    setSelectedId(sceneId);
    updatePlan(item=>({...item,points:item.points.some(point=>point.sceneId===sceneId)?
      item.points.map(point=>point.sceneId===sceneId?{sceneId,x,y}:point):
      [...item.points,{sceneId,x,y}]}));
  };
  const place=(x:number,y:number)=>{if(selected)movePoint(selected.id,x,y);};
  const choose=(i:number)=>{setSelectedIndex(i);setPreviewId(null);setSelectedId('');};
  const reorder=(offset:number)=>{
    const destination=index+offset;
    if(destination<0||destination>=plans.length)return;
    const next=[...plans];[next[index],next[destination]]=[next[destination],next[index]];
    onChange(next);choose(destination);
  };
  const removePlan=async ()=>{
    if(!plan||!await confirmAsk('Supprimer « '+plan.name+' » et ses repères ? Les panoramas restent intacts.'))return;
    onChange(plans.filter((_,i)=>i!==index));
    choose(Math.max(0,index-1));
  };
  const selectFile=(mode:'append'|'replace')=>{
    importMode.current=mode;
    if(fileInput.current){fileInput.current.multiple=mode==='append';fileInput.current.click();}
  };
  const controls=<div className="nv-plan-editor">
    <p>Glisse un panorama sur le plan ou sélectionne-le et clique à l’emplacement souhaité. Le même panorama peut figurer sur plusieurs plans.</p>
    {plan&&<div className="nv-plan-workspace">
      <div className="nv-plan-workspace-map">
        <div className="nv-plan-pane-heading"><strong>{plan.name||'Plan '+(index+1)}</strong>
          <small>{visiblePoints(plan,available).length} / {available.length} panoramas placés</small>
          {available.length>0&&<button type="button" className="nv-plan-autoplace" title="Propose un placement : l’entrée d’abord, puis les panoramas reliés. À corriger à la souris."
            onClick={async()=>{
              if(plan.points.length&&!await confirmAsk('Remplacer les '+plan.points.length+' repères de ce plan par une proposition automatique ? (Tu peux annuler avec la flèche retour.)'))return;
              updatePlan(item=>({...item,points:proposePlanLayout(available)}));
              setError('Proposition appliquée : l’entrée est en bas du plan, ajuste chaque repère à la souris.');
            }}>✨ Placer automatiquement</button>}
        </div>
        <div className="nv-plan-edit-canvas">
          <div className="nv-plan-map-surface" style={{visibility:previewScene?'hidden':undefined}}>
            <PlanImage key={plan.id??index} plan={plan} scenes={available} currentId={selected?.id}
              onPick={setSelectedId} onPlace={selected?place:undefined} onMove={movePoint}
              onRemove={removePoint} thumbs={thumbs}/>
          </div>
          {previewScene&&renderPreview&&<section className="nv-plan-inline-preview" role="dialog"
              aria-modal="false" aria-label={'Aperçu 360° · '+previewScene.name}>
            <header><strong><Eye size={18}/> {previewScene.name}</strong>
              <button type="button" aria-label="Fermer l’aperçu 360°" onClick={()=>setPreviewId(null)}><X size={20}/></button>
            </header>
            <div className="nv-plan-inline-preview-view" key={previewScene.id}>{renderPreview(previewScene.id)}</div>
            <small>Glisse pour regarder à 360°. Choisis un panorama à droite.</small>
          </section>}
        </div>
      </div>
      <aside className="nv-plan-panorama-pane" aria-label="Panoramas à placer">
        <strong>Panoramas ({available.length})</strong>
        {onSceneChange&&selected&&<div className="nv-plan-scene-edit" key={selected.id}>
          <span className="nv-plan-scene-edit-title">Panorama sélectionné</span>
          <label>Nom<input type="text" maxLength={150} value={selected.name} onChange={e=>onSceneChange(selected.id,{name:e.target.value})}/></label>
          <label>Superficie (m²)<input type="text" inputMode="decimal" placeholder="ex. 25" defaultValue={selected.surfaceM2!==undefined?String(selected.surfaceM2):''}
            onChange={e=>{
              const raw=e.target.value.trim().replace(',','.');
              if(raw===''){onSceneChange(selected.id,{surfaceM2:null});return;}
              const n=Number(raw);
              if(Number.isFinite(n)&&n>0&&n<=100000)onSceneChange(selected.id,{surfaceM2:n});
            }}/></label>
          <small>Le nom et la superficie s’affichent dans la visite.</small>
        </div>}
        <div className="nv-plan-source-list" role="group">{available.map(scene=>{
          const pointIndex=visiblePoints(plan,available).findIndex(point=>point.sceneId===scene.id);
          return <div className="nv-plan-source-row" key={scene.id}>
            <button type="button" draggable aria-label={scene.name}
              className={'nv-plan-source-card'+(selected?.id===scene.id?' is-selected':'')+
                (draggingSceneId===scene.id?' is-dragging':'')}
              aria-pressed={selected?.id===scene.id}
              onClick={()=>{setSelectedId(scene.id);if(previewId)setPreviewId(scene.id);}}
              onDragStart={event=>{event.dataTransfer.setData('text/plain',scene.id);
                event.dataTransfer.effectAllowed='move';setPreviewId(null);
                setSelectedId(scene.id);setDraggingSceneId(scene.id);}}
              onDragEnd={()=>setDraggingSceneId(null)}>
              {thumbs[scene.id]?<img src={thumbs[scene.id]} alt="" loading="lazy" draggable={false}/>:
                <span className="nv-plan-thumb-placeholder">360°</span>}
              <span className="nv-plan-source-copy"><strong>{scene.name}</strong>
                <small>{pointIndex>=0?'✓ Point '+(pointIndex+1):'À placer sur ce plan'}</small></span>
            </button>
            {renderPreview&&<button type="button" className="nv-plan-preview-eye" aria-label={'Voir '+scene.name+' en 360°'}
              onClick={event=>{event.stopPropagation();setSelectedId(scene.id);setPreviewId(scene.id);}}>
              <Eye size={18}/></button>}
          </div>;
        })}</div>
      </aside>
    </div>}
  </div>;
  return <div className="nv-plan-editor">
    <p>Ajoute autant de plans que nécessaire : RDC, étage, extérieur, dépendance. Chaque plan possède ses propres points panoramiques.</p>
    <input ref={fileInput} hidden type="file" accept="image/png,image/jpeg,image/webp"
      disabled={busy} onChange={async event=>{
        const files=Array.from(event.target.files??[]);
        event.target.value='';
        if(!files.length||importing.current)return;
        const mode=importMode.current;
        if(mode==='replace'&&plan?.points.length&&!await confirmAsk('Remplacer l’image de ce plan ? Les repères de ce plan seront retirés.'))return;
        importing.current=true;setBusy(true);setError('');
        try{
          const imported:FloorPlan[]=[];
          for(const file of files)imported.push({id:crypto.randomUUID(),
            imageDataUrl:await importPlan(file),name:file.name.replace(/\.[^.]+$/,'').slice(0,200),points:[]});
          if(mode==='replace'&&plan){
            onChange(plans.map((old,i)=>i===index?{...imported[0],id:old.id??imported[0].id}:old));
          }else{
            onChange([...plans,...imported]);
            choose(plans.length);
          }
          setExpanded(true);
        }catch(e){setError(e instanceof Error?e.message:'Import des plans impossible.');}
        finally{importing.current=false;setBusy(false);}
      }}/>
    <div className="nv-plans-editor-actions">
      <button type="button" disabled={busy} onClick={()=>selectFile('append')}>
        {busy?'Importation…':'+ Ajouter des plans (PNG, JPG, WebP)'}
      </button>
      {plan&&<button type="button" disabled={busy} onClick={()=>selectFile('replace')}>Remplacer l’image du plan sélectionné</button>}
    </div>
    {error&&<p role="alert">{error}</p>}
    {plans.length>0&&<>
      <nav className="nv-plans-editor-nav" aria-label="Parcourir les plans">
        <button type="button" disabled={plans.length<2} onClick={()=>choose((index-1+plans.length)%plans.length)}>‹</button>
        <strong>{plan?.name||'Plan'} <small>{index+1} / {plans.length}</small></strong>
        <button type="button" disabled={plans.length<2} onClick={()=>choose((index+1)%plans.length)}>›</button>
      </nav>
      <div className="nv-plans-strip nv-plans-editor-strip" role="group" aria-label="Plans importés">
        {plans.map((p,i)=><button type="button" key={p.id??i} onClick={()=>choose(i)}
          aria-pressed={i===index}>
          <img src={p.imageDataUrl} alt=""/><span>{p.name||'Plan '+(i+1)}</span>
        </button>)}
      </div>
      <label>Nom du plan sélectionné
        <input type="text" maxLength={200} value={plan.name}
          onChange={event=>updatePlan(item=>({...item,name:event.target.value}))}/>
      </label>
      <div className="nv-plans-editor-actions">
        <button type="button" onClick={()=>reorder(-1)} disabled={index===0}>↑ Monter le plan</button>
        <button type="button" onClick={()=>reorder(1)} disabled={index===plans.length-1}>↓ Descendre le plan</button>
        <button type="button" onClick={removePlan}>Supprimer ce plan</button>
      </div>
      <button type="button" onClick={()=>setExpanded(true)}><Maximize2 size={16}/> Ouvrir le plan et positionner les panoramas</button>
      {expanded?<PlanModal wide title={'Plan et panoramas · '+(plan.name||'Plan '+(index+1))}
        onEscape={previewId?()=>setPreviewId(null):undefined} onClose={()=>{setExpanded(false);setPreviewId(null);}}>
        <div className="nv-plan-expanded-editor">{controls}</div>
      </PlanModal>:null}
      <div className="nv-plan-editor-actions">
        {!hasPlanButton&&<button type="button" onClick={onAddButton}>＋ Ajouter le bouton Plan à la visite</button>}
        {hasPlanButton&&<small>✓ Le bouton Plan est configuré dans la barre de la visite.</small>}
        <button type="button" onClick={onPreview}>Tester la galerie de plans dans la visite</button>
      </div>
    </>}
  </div>;
}
