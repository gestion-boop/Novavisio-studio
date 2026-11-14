import type {StudioProject,Scene,BottomBarItem} from './storage';
import type {CloudLink} from './cloud';

export type StudioSpace={id:string;name:string;sceneIds:string[];coverDataUrl?:string};

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
      'soundOffIconId','soundOffHoverIconId','soundOffPressedIconId'] as const)take(project[key]);
  return project.icons.filter(icon=>ids.has(icon.id));
}

/** Prepare an independent visit without changing the parent project or its cloud IDs.
 * slim=true for published links/static exports: omit unused icon and audio libraries. */
/** Retire de la visite les panoramas décochés, les flèches qui y mènent et leurs entrées dans les galeries / espaces. */
export function stripExcluded(project:StudioProject):StudioProject{
  const out=new Set(project.scenes.filter(sc=>sc.excluded).map(sc=>sc.id));
  if(!out.size)return project;
  return {...project,
    scenes:project.scenes.filter(sc=>!out.has(sc.id)).map(sc=>({...sc,hotspots:sc.hotspots.filter(h=>!(h.type==='navigation'&&h.target&&out.has(h.target)))})),
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
    name:project.name+' - '+space.name,
    scenes:scenes.map(scene=>({
      ...scene,
      // Conserve la texture de nuit même si sa source est dans un autre espace.
      nightDataUrl:scene.nightDataUrl??project.scenes.find(other=>other.id===scene.nightSourceSceneId)?.dataUrl,
      nightSourceSceneId:undefined,
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
