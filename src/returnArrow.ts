import type {Hotspot,Scene,StudioProject} from './storage';
import {panoramaArrivalZoom} from './panoramaLens';

const TAU=Math.PI*2;
const norm=(a:number)=>((a%TAU)+TAU)%TAU;
const goesTo=(scene:Scene,id:string)=>scene.hotspots.some(h=>h.type==='navigation'&&h.target===id);

/**
 * Flèche retour B → A d'une flèche aller A → B.
 *  - dans B : elle est placée DERRIÈRE le regard d'arrivée (demi-tour de 180°), donc là où l'on se retournerait pour repartir ;
 *  - dans A : on arrive en regardant à l'opposé de la direction de l'aller (on revient par où l'on était parti).
 * Elle reprend les icônes et la taille de l'aller. Rien n'est créé si B possède déjà un chemin vers A.
 */
export function returnFor(project:StudioProject,originId:string,forward:Hotspot):Hotspot|null{
  if(forward.type!=='navigation'||!forward.target||forward.target===originId)return null;
  const origin=project.scenes.find(s=>s.id===originId),destination=project.scenes.find(s=>s.id===forward.target);
  if(!origin||!destination||goesTo(destination,originId))return null;
  return {
    id:'ret-'+forward.id,type:'navigation',title:'Retour vers '+origin.name,text:'',target:originId,
    yaw:norm((forward.arrivalYaw??destination.arrivalYaw??0)+Math.PI),pitch:-0.12,
    arrivalYaw:norm(forward.yaw+Math.PI),arrivalPitch:0,arrivalZoom:panoramaArrivalZoom(origin),arrivalZoomModel:'wide',
    ...(forward.iconId?{iconId:forward.iconId}:{}),
    ...(forward.hoverIconId?{hoverIconId:forward.hoverIconId}:{}),
    ...(forward.pressedIconId?{pressedIconId:forward.pressedIconId}:{}),
    ...(forward.iconSize?{iconSize:forward.iconSize}:{})
  };
}
/** Ajoute le retour de la flèche `hotspotId` (de la scène `originId`) s'il manque. Renvoie le projet et le retour créé. */
export function withReturn(project:StudioProject,originId:string,hotspotId:string):{project:StudioProject;created?:{sceneId:string;pointId:string}}{
  const forward=project.scenes.find(s=>s.id===originId)?.hotspots.find(h=>h.id===hotspotId);
  const back=forward&&returnFor(project,originId,forward);
  if(!forward||!back)return {project};
  return {
    project:{...project,scenes:project.scenes.map(s=>s.id===forward.target?{...s,hotspots:[...s.hotspots,back]}:s)},
    created:{sceneId:forward.target,pointId:back.id}
  };
}
/** Tous les retours qui manquent parmi les scènes données (ex. celles de l'espace affiché). */
export function missingReturns(project:StudioProject,sceneIds:Set<string>):{originId:string;hotspotId:string}[]{
  const out:{originId:string;hotspotId:string}[]=[];
  const planned=new Set<string>();
  for(const scene of project.scenes){
    if(!sceneIds.has(scene.id))continue;
    for(const h of scene.hotspots){
      if(h.type!=='navigation'||!h.target||h.target===scene.id||!sceneIds.has(h.target))continue;
      const dest=project.scenes.find(s=>s.id===h.target);
      const key=h.target+'>'+scene.id;
      if(!dest||goesTo(dest,scene.id)||planned.has(key))continue;
      planned.add(key);out.push({originId:scene.id,hotspotId:h.id});
    }
  }
  return out;
}
export function withAllReturns(project:StudioProject,sceneIds:Set<string>):{project:StudioProject;count:number}{
  let next=project,count=0;
  for(const item of missingReturns(project,sceneIds)){const r=withReturn(next,item.originId,item.hotspotId);if(r.created){next=r.project;count++;}}
  return {project:next,count};
}
