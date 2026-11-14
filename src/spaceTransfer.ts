import {uid,validateProject,type CustomIcon,type MusicTrack,type Scene,type StudioProject} from './storage';
import {projectForSpaceExport,type StudioSpace} from './spaces';

/** Projet « valise » contenant uniquement les espaces choisis (leurs panoramas, points, icônes et musiques utilisés). */
export function exportSpacesProject(project:StudioProject,spaces:StudioSpace[]):StudioProject{
  const ids=[...new Set(spaces.flatMap(space=>space.sceneIds))];
  const base=projectForSpaceExport(project,{id:'transfer',name:'transfert',sceneIds:ids},true);
  return {...base,
    name:(project.name+' – '+spaces.map(space=>space.name).join(', ')).slice(0,150),
    bottomBar:[],
    spaces:spaces.map(space=>({...space,sceneIds:space.sceneIds.filter(id=>ids.includes(id))})),
    updatedAt:new Date().toISOString()};
}

/** Ajoute les espaces d'un fichier au projet ouvert. Les panoramas déjà présents (même identifiant et même image) ne sont pas dupliqués. */
export function mergeImportedSpaces(project:StudioProject,raw:unknown):{project:StudioProject;spaces:number;scenes:number}{
  const imported=validateProject(raw);
  const importedSpaces=imported.spaces??[];
  if(!importedSpaces.length)throw new Error('Ce fichier ne contient aucun espace.');
  const sceneMap=new Map<string,string>();
  const scenes:Scene[]=[...project.scenes];
  const created:Scene[]=[];
  for(const scene of imported.scenes){
    const same=project.scenes.find(existing=>existing.id===scene.id&&existing.dataUrl===scene.dataUrl);
    if(same){sceneMap.set(scene.id,same.id);continue;}
    const id=scenes.some(existing=>existing.id===scene.id)?uid():scene.id;
    sceneMap.set(scene.id,id);
    const next={...scene,id};scenes.push(next);created.push(next);
  }
  if(scenes.length>500)throw new Error('Trop de panoramas (500 maximum) : retire-en avant d’importer.');
  // Icônes et musiques
  const icons:CustomIcon[]=[...project.icons],iconMap=new Map<string,string>();
  for(const icon of imported.icons){
    const same=icons.find(existing=>existing.dataUrl===icon.dataUrl);
    if(same){iconMap.set(icon.id,same.id);continue;}
    const id=icons.some(existing=>existing.id===icon.id)?uid():icon.id;
    iconMap.set(icon.id,id);icons.push({...icon,id});
  }
  if(icons.length>150)throw new Error('Bibliothèque d’icônes pleine (150 maximum).');
  const tracks:MusicTrack[]=[...(project.audioTracks??[])],trackMap=new Map<string,string>();
  for(const track of imported.audioTracks??[]){
    const same=tracks.find(existing=>existing.dataUrl&&existing.dataUrl===track.dataUrl);
    if(same){trackMap.set(track.id,same.id);continue;}
    const id=tracks.some(existing=>existing.id===track.id)?uid():track.id;
    trackMap.set(track.id,id);tracks.push({...track,id});
  }
  const mapIcon=(id?:string)=>id?iconMap.get(id)??undefined:undefined;
  const fixed=new Set(created.map(scene=>scene.id));
  const finalScenes=scenes.map(scene=>!fixed.has(scene.id)?scene:{
    ...scene,
    musicTrackId:scene.musicTrackId?trackMap.get(scene.musicTrackId):undefined,
    hotspots:scene.hotspots.map(point=>({
      ...point,
      target:point.type==='navigation'&&point.target?(sceneMap.get(point.target)??''):point.target,
      iconId:mapIcon(point.iconId),hoverIconId:mapIcon(point.hoverIconId),pressedIconId:mapIcon(point.pressedIconId)
    }))
  });
  const spaces=[...(project.spaces??[])];
  for(const space of importedSpaces){
    const id=spaces.some(existing=>existing.id===space.id)?uid():space.id;
    spaces.push({...space,id,sceneIds:space.sceneIds.map(sceneId=>sceneMap.get(sceneId)).filter((sceneId):sceneId is string=>!!sceneId)});
  }
  return {project:validateProject({...project,scenes:finalScenes,icons,audioTracks:tracks,spaces}),spaces:importedSpaces.length,scenes:created.length};
}
