import type {StudioProject,Scene,BottomBarItem} from './storage';

export type StudioSpace={id:string;name:string;sceneIds:string[]};

/**
 * Master project is immutable to space selection: a space contains REFERENCES
 * to panoramas, never duplicates or deletes their data.
 */
export function scenesInSpace(project:StudioProject,space:StudioSpace|null):Scene[]{
  if(!space)return project.scenes;
  const allowed=new Set(space.sceneIds);
  return project.scenes.filter(scene=>allowed.has(scene.id));
}

/** Prepare an independent visit without changing the parent project or its cloud IDs. */
export function projectForSpaceExport(project:StudioProject,space:StudioSpace|null):StudioProject{
  if(!space)return project;
  const scenes=scenesInSpace(project,space);
  const ids=new Set(scenes.map(scene=>scene.id));
  const trimBar=(item:BottomBarItem):BottomBarItem=>{
    const gallery=item.gallery?.filter(entry=>ids.has(entry.sceneId));
    return {
      ...item,
      target:item.target&&ids.has(item.target)?item.target:'',
      ...(gallery?{gallery}:{})
    };
  };
  return {
    ...project,
    name:project.name+' - '+space.name,
    scenes:scenes.map(scene=>({
      ...scene,
      hotspots:scene.hotspots.filter(h=>h.type!=='navigation'||!h.target||ids.has(h.target))
    })),
    bottomBar:project.bottomBar.map(trimBar),
    spaces:[], // A public standalone visit never exposes unrelated areas.
    audioTracks:project.audioTracks.filter(track=>scenes.some(scene=>scene.musicTrackId===track.id))
  };
}

export function safeSpaceName(name:string):string{
  return name.slice(0,100);
}
