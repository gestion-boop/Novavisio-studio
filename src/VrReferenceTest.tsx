import {useState} from 'react';
import {ChevronDown,ChevronLeft,ChevronRight,ChevronUp,Compass,Eye,Home,Map as MapIcon,MessageCircleQuestion,Volume2,VolumeX,X} from 'lucide-react';
import type {StudioProject} from './storage';

/** Panneau de test purement visuel : ne modifie pas la visite ou son projet Cloud. */
export function VrReferenceTest({project,currentId,onPick,onClose,onEnterVr,vrAvailable}:{
 project:StudioProject;currentId:string;onPick:(sceneId:string)=>void;onClose:()=>void;
 onEnterVr:()=>void;vrAvailable:boolean;
}){
 const [panel,setPanel]=useState<'gallery'|'plan'|'help'|null>('gallery');
 const [offset,setOffset]=useState(0);
 const [muted,setMuted]=useState(false);
 const [floorIndex,setFloorIndex]=useState(0);
 const scenes=project.scenes.filter(s=>!s.excluded);
 const scene=scenes.find(s=>s.id===currentId)??scenes[0];
 const pages=Math.max(1,Math.ceil(scenes.length/8));
 const page=Math.min(offset,pages-1);
 const floorLabels=['RDC','1er','2e','3e'];
 const control=(label:string,glyph:React.ReactNode,click:()=>void,active=false)=>
   <button type="button" className={'nv-vr-ref-round'+(active?' is-active':'')} aria-label={label} title={label} onClick={click}>{glyph}</button>;
 const choose=(id:string)=>{onPick(id);setPanel(null);};
 return <div className="nv-vr-ref" role="dialog" aria-label="Test de l’interface VR anthracite et or">
   <div className="nv-vr-ref-top">
     <div className="nv-vr-ref-compass"><Compass size={23} strokeWidth={2.6}/><span>N</span></div>
     <div className="nv-vr-ref-scene"><strong>{scene?.name||'Panorama'}</strong><small>INTERFACE VR · APERÇU TEST</small></div>
   </div>
   <div className="nv-vr-ref-left">
     {control('Galerie des panoramas',<MapIcon/>,()=>setPanel(v=>v==='gallery'?null:'gallery'),panel==='gallery')}
     <div className="nv-vr-ref-floors">
       <button aria-label="Étage précédent" type="button" onClick={()=>setFloorIndex(n=>Math.max(0,n-1))}><ChevronUp/></button>
       <span>{floorLabels[floorIndex]}</span>
       <button aria-label="Étage suivant" type="button" onClick={()=>setFloorIndex(n=>Math.min(floorLabels.length-1,n+1))}><ChevronDown/></button>
     </div>
     {control('Retour au panorama initial',<Home/>,()=>choose(scenes[0]?.id??currentId))}
   </div>
   <div className="nv-vr-ref-right">
     {control(muted?'Rétablir le son':'Couper le son',muted?<VolumeX/>:<Volume2/>,()=>setMuted(v=>!v))}
     {control('Afficher ou masquer le plan',<Eye/>,()=>setPanel(v=>v==='plan'?null:'plan'),panel==='plan')}
     {control('Aide',<MessageCircleQuestion/>,()=>setPanel(v=>v==='help'?null:'help'),panel==='help')}
   </div>
   {panel&&<div className="nv-vr-ref-panel">
     {panel==='gallery'?<><header><strong>Choisir un panorama</strong><small>{scenes.length} panoramas</small></header>
       <div className="nv-vr-ref-gallery">{scenes.slice(page*8,page*8+8).map(s=><button type="button" key={s.id}
         className={s.id===currentId?'is-current':''} onClick={()=>choose(s.id)}>
         <span className="nv-vr-ref-thumb" style={{backgroundImage:s.dataUrl?`url("${s.dataUrl}")`:undefined}}/>
         <span>{s.name}</span>
       </button>)}</div>
       {pages>1&&<footer>
         <button type="button" aria-label="Page précédente" onClick={()=>setOffset(p=>(p-1+pages)%pages)}><ChevronLeft/></button>
         {page+1} / {pages}
         <button type="button" aria-label="Page suivante" onClick={()=>setOffset(p=>(p+1)%pages)}><ChevronRight/></button>
       </footer>}
     </>:panel==='plan'?<><header><strong>{project.floorPlan?.name||'Plan de la visite'}</strong></header>
       {project.floorPlan?.imageDataUrl?<div className="nv-vr-ref-map">
         <img src={project.floorPlan.imageDataUrl} alt="Plan interactif"/>
         {project.floorPlan.points.map((p,i)=><button key={i} type="button" style={{left:p.x+'%',top:p.y+'%'}}
           className={p.sceneId===currentId?'is-current':''} onClick={()=>choose(p.sceneId)} title={project.scenes.find(s=>s.id===p.sceneId)?.name}>{i+1}</button>)}
       </div>:<p>Aucun plan n'est configuré pour cette visite. Ajoute un plan dans NovaStudio pour le tester ici.</p>}
     </>:<><header><strong>Commandes de navigation</strong></header><p>Pointe un bouton avec la manette et presse la gâchette pour sélectionner. Dans le casque, le retour haptique dépend de la compatibilité WebXR.</p></>}
   </div>}
   <div className="nv-vr-ref-bottom">
     <span>MAQUETTE TEST · Anthracite / or</span>
     {vrAvailable&&<button type="button" className="nv-vr-ref-enter" onClick={onEnterVr}>🥽 Tester dans le casque</button>}
     <button type="button" className="nv-vr-ref-exit" onClick={onClose}><X size={16}/> Quitter le test</button>
   </div>
 </div>;
}
