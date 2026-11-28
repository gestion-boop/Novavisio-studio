import {getFloorPlans,withFloorPlans,type StudioProject,type Scene,type BottomBarItem,type FloorPlan} from './storage';
import type {CloudLink} from './cloud';

export type StudioSpace={id:string;name:string;sceneIds:string[];coverDataUrl?:string;showRoomName?:boolean;showRoomNameVr?:boolean};
/** Plans visibles dans le contexte ouvert : les anciens plans non rattachés
 * restent dans le projet principal, sans se mélanger aux plans des espaces. */
export function plansInSpace(project:StudioProject,space:StudioSpace|null):FloorPlan[]{
  return getFloorPlans(project).filter(plan=>space?plan.spaceId===space.id:!plan.spaceId);
}
/** Ne remplace que les plans de l'espace actif, sans toucher aux autres. */
export function updatePlansInSpace(project:StudioProject,space:StudioSpace|null,edited:FloorPlan[]):StudioProject{
  const current=getFloorPlans(project);
  const belongs=(plan:FloorPlan)=>space?plan.spaceId===space.id:!plan.spaceId;
  const changed=edited.map(plan=>({...plan,spaceId:space?.id}));
  return withFloorPlans(project,[...current.filter(plan=>!belongs(plan)),...changed]);
}


/**
 * Master project is immutable to space selection: a space contains REFERENCES
 * to panoramas, never duplicates or deletes their data.
 */
export function scenesInSpace(project:StudioProject,space:StudioSpace|null):Scene[]{
  if(!space)return project.scenes;
  const allowed=new Set(space.sceneIds);
  return project.scenes.filter(scene=>allowed.has(scene.id));
}

/** Only assets referenced by visible points, bottom bar, sound controls or close
 * control belong in a published visit. Keep the full editor library untouched. */
function relevantIcons(project:StudioProject,scenes:Scene[]){
  const ids=new Set<string>();
  const take=(id?:string)=>{if(id)ids.add(id);};
  for(const scene of scenes)for(const point of scene.hotspots){
    take(point.iconId);take(point.hoverIconId);take(point.pressedIconId);
  }
  for(const item of project.bottomBar){
    take(item.iconId);take(item.hoverIconId);take(item.pressedIconId);
  }
  for(const key of ['closeIconId','soundOnIconId','soundOnHoverIconId','soundOnPressedIconId',
      'soundOffIconId','soundOffHoverIconId','soundOffPressedIconId','settingsIconId','settingsHoverIconId','settingsPressedIconId'] as const)take(project[key]);
  return project.icons.filter(icon=>ids.has(icon.id));
}

/** Prepare an independent visit without changing the parent project or its cloud IDs.
 * slim=true for published links/static exports: omit unused icon and audio libraries. */
/** Retire de la visite les panoramas décochés, les flèches qui y mènent et leurs entrées dans les galeries / espaces. */
export function stripExcluded(project:StudioProject):StudioProject{
  const out=new Set(project.scenes.filter(sc=>sc.excluded).map(sc=>sc.id));
  if(!out.size)return project;
  return {...project,
    floorPlan:project.floorPlan?{...project.floorPlan,points:project.floorPlan.points.filter(point=>!out.has(point.sceneId))}:undefined,
    floorPlans:project.floorPlans?.map(plan=>({...plan,points:plan.points.filter(point=>!out.has(point.sceneId))})),
    // Le panorama de nuit d'une scène peut être une autre scène décochée : on copie sa photo avant de la retirer, sinon le mode nuit disparaît.
    scenes:project.scenes.filter(sc=>!out.has(sc.id)).map(sc=>{
      const night=!sc.nightDataUrl&&sc.nightSourceSceneId&&out.has(sc.nightSourceSceneId)?project.scenes.find(o=>o.id===sc.nightSourceSceneId)?.dataUrl:undefined;
      return night?{...sc,nightDataUrl:night,nightSourceSceneId:undefined}:sc;
    }).map(sc=>({...sc,hotspots:sc.hotspots.filter(h=>!(h.type==='navigation'&&h.target&&out.has(h.target)))})),
    bottomBar:project.bottomBar.map(item=>({...item,
      ...(item.gallery?{gallery:item.gallery.filter(g=>!out.has(g.sceneId))}:{}),
      target:item.target&&out.has(item.target)?'':item.target})),
    spaces:(project.spaces??[]).map(space=>({...space,sceneIds:space.sceneIds.filter(id=>!out.has(id))}))};
}
export function projectForSpaceExport(project:StudioProject,space:StudioSpace|null,slim=false):StudioProject{
  if(slim)project=stripExcluded(project);
  if(!space){
    if(!slim)return project;
    return {...project,
      buttonSets:undefined,defaultPhotoIcon:undefined,defaultVideoIcon:undefined,defaultNavigationIcon:undefined,defaultMusicTrackId:undefined,
    clientProfile:undefined, // never publish private customer records
      comments:undefined, // commentaires d'équipe : jamais publiés
      mediaLibrary:undefined, // la bibliothèque est un outil d'édition : les médias utilisés sont déjà dans les points
      icons:relevantIcons(project,project.scenes),
      audioTracks:project.audioTracks.filter(track=>project.scenes.some(scene=>scene.musicTrackId===track.id))
    };
  }
  const scenes=scenesInSpace(project,space);
  const ids=new Set(scenes.map(scene=>scene.id));
  const trimBar=(item:BottomBarItem):BottomBarItem=>{
    const gallery=item.gallery?.filter(entry=>ids.has(entry.sceneId));
    return {
      ...item,
      gallerySpaceIds:[],
      galleryBackgroundImage:item.galleryBackgroundImage,
      galleryCardTheme:item.galleryCardTheme,
      galleryBackground:item.galleryBackground?.startsWith('scene:')&&ids.has(item.galleryBackground.slice(6))?item.galleryBackground:undefined,
      target:item.target&&ids.has(item.target)?item.target:'',
      ...(gallery?{gallery}:{})
    };
  };
  return {
    ...project,
    buttonSets:undefined,defaultPhotoIcon:undefined,defaultVideoIcon:undefined,defaultNavigationIcon:undefined,defaultMusicTrackId:undefined,
    clientProfile:undefined, // only Studio editors receive customer details
    comments:undefined,
    mediaLibrary:undefined,
    name:project.name+' - '+space.name,
    floorPlan:(plansInSpace(project,space).length?plansInSpace(project,space):getFloorPlans(project))[0]?{...(plansInSpace(project,space).length?plansInSpace(project,space):getFloorPlans(project))[0],spaceId:undefined,
      points:(plansInSpace(project,space).length?plansInSpace(project,space):getFloorPlans(project))[0].points.filter(point=>ids.has(point.sceneId))}:undefined,
    floorPlans:(plansInSpace(project,space).length?plansInSpace(project,space):getFloorPlans(project)).map(plan=>({...plan,spaceId:undefined,
      points:plan.points.filter(point=>ids.has(point.sceneId))})),
    scenes:scenes.map(scene=>({
      ...scene,
      // Conserve la texture de nuit même si sa source est dans un autre espace.
      nightDataUrl:scene.nightDataUrl??project.scenes.find(other=>other.id===scene.nightSourceSceneId)?.dataUrl,
      nightSourceSceneId:undefined,
      // Le réglage « nom de la pièce » de l'espace est reporté sur ses panoramas : la visite publiée n'a plus la liste des espaces.
      showRoomName:scene.showRoomName??space.showRoomName,
      showRoomNameVr:scene.showRoomNameVr??space.showRoomNameVr,
      hotspots:scene.hotspots.filter(h=>h.type!=='navigation'||!h.target||ids.has(h.target))
    })),
    bottomBar:project.bottomBar.map(trimBar),
    spaces:[], // A public standalone visit never exposes unrelated areas.
    icons:slim?relevantIcons(project,scenes):project.icons,
    audioTracks:project.audioTracks.filter(track=>scenes.some(scene=>scene.musicTrackId===track.id))
  };
}

export function safeSpaceName(name:string):string{
  return name.slice(0,100);
}

/** Liens cloud distincts par espace et par usage. Ne jamais remplacer readLink()/writeLink()
 * du projet maître : une publication isolée ne doit pas changer son association cloud. */
const spaceLinkKey=(spaceId:string,kind:'public'|'private')=>'nvstudio-space-cloud-v1:'+kind+':'+spaceId;
export function readSpaceCloudLink(spaceId:string,kind:'public'|'private'):CloudLink|null{
  try{
    const raw=JSON.parse(localStorage.getItem(spaceLinkKey(spaceId,kind))||'null') as CloudLink|null;
    return raw&&typeof raw.projectId==='string'&&Number.isInteger(raw.revision)?raw:null;
  }catch{return null;}
}
export function writeSpaceCloudLink(spaceId:string,kind:'public'|'private',link:CloudLink){
  try{localStorage.setItem(spaceLinkKey(spaceId,kind),JSON.stringify(link));}catch{/* unavailable */ }
}
