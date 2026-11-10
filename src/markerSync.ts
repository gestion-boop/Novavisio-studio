import type {Viewer} from '@photo-sphere-viewer/core';
import {MarkersPlugin,type MarkerConfig} from '@photo-sphere-viewer/markers-plugin';

/**
 * Differential marker update.
 *
 * `plugin.setMarkers()` destroys and recreates every marker. For image/video layers drawn
 * on the sphere that means a new WebGL texture upload (and a restarted <video>) each time,
 * which is what made zooming / editing stutter. Here only markers whose configuration
 * really changed are touched; layer markers whose source is unchanged are never rebuilt.
 */
const applied=new WeakMap<MarkersPlugin,Map<string,MarkerConfig>>();
// Changing one of these means a different texture / media element: rebuild that marker only.
const REBUILD_KEYS=['imageLayer','videoLayer','autoplay'];

const sameValue=(a:unknown,b:unknown):boolean=>{
  if(a===b)return true;
  if(a&&b&&typeof a==='object'&&typeof b==='object'){
    try{return JSON.stringify(a)===JSON.stringify(b);}catch{return false;}
  }
  return false;
};

export function resetMarkers(viewer:Viewer,next:MarkerConfig[]){
  const plugin=viewer.getPlugin(MarkersPlugin) as MarkersPlugin;
  plugin.setMarkers(next);
  applied.set(plugin,new Map(next.map(m=>[m.id,m])));
}

export function syncMarkers(viewer:Viewer,next:MarkerConfig[]){
  const plugin=viewer.getPlugin(MarkersPlugin) as MarkersPlugin;
  const previous=applied.get(plugin);
  if(!previous){resetMarkers(viewer,next);return;}
  const live=new Set(plugin.getMarkers().map(m=>m.id));
  const wanted=new Set(next.map(m=>m.id));
  for(const id of live){
    if(!wanted.has(id)){
      try{plugin.removeMarker(id,false);}catch{/* already gone */}
      previous.delete(id);
    }
  }
  for(const config of next){
    const before=previous.get(config.id);
    if(!live.has(config.id)||!before){
      if(live.has(config.id)){try{plugin.removeMarker(config.id,false);}catch{/* ignore */}}
      plugin.addMarker(config,false);
      previous.set(config.id,config);
      continue;
    }
    const keys=new Set([...Object.keys(before),...Object.keys(config)]);
    const changed:Record<string,unknown>={};
    let rebuild=false,dirty=false;
    for(const key of keys){
      const a=(before as Record<string,unknown>)[key];
      const b=(config as Record<string,unknown>)[key];
      if(sameValue(a,b))continue;
      dirty=true;
      changed[key]=b;
      if(b===undefined||REBUILD_KEYS.includes(key))rebuild=true;
    }
    if(!dirty)continue;
    if(rebuild){
      try{plugin.removeMarker(config.id,false);}catch{/* ignore */}
      plugin.addMarker(config,false);
    }else{
      plugin.updateMarker({...changed,id:config.id} as MarkerConfig,false);
    }
    previous.set(config.id,config);
  }
  plugin.renderMarkers();
  // renderMarkers() only refreshes the DOM overlay: WebGL layers (photo / video frames) need an explicit repaint.
  viewer.needsUpdate();
}
