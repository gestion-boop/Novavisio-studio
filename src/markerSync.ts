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

/**
 * Fondu enchaîné des marqueurs pendant un changement de panorama.
 * Avant : les flèches / affiches de l'ANCIEN panorama restaient visibles pendant tout le fondu de l'image puis disparaissaient d'un coup,
 * et celles du NOUVEAU panorama n'apparaissaient qu'à la fin (on voyait le dessous d'une affiche, puis elle surgissait).
 * Maintenant, les anciens marqueurs s'estompent pendant que les nouveaux apparaissent, en même temps que le fondu de l'image.
 * Un enchaînement rapide termine proprement le fondu précédent.
 */
const fades=new WeakMap<MarkersPlugin,{finish:()=>void}>();
const easeInOut=(t:number)=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;

export function crossfadeMarkers(viewer:Viewer,next:MarkerConfig[],ms:number):Promise<void>{
  const plugin=viewer.getPlugin(MarkersPlugin) as MarkersPlugin;
  fades.get(plugin)?.finish();
  const present=new Set(plugin.getMarkers().map(m=>m.id));
  // Cas rare : un même identifiant dans les deux scènes → remplacement direct, sans fondu.
  if(ms<=0||next.some(m=>present.has(m.id))){resetMarkers(viewer,next);return Promise.resolve();}
  const nextIds=new Set(next.map(m=>m.id));
  const leaving=[...present].filter(id=>!nextIds.has(id));
  next.forEach(m=>{try{plugin.addMarker({...m,opacity:0},false);}catch{/* déjà présent */}});

  return new Promise<void>(resolve=>{
    let raf=0,done=false;
    const t0=performance.now();
    const finish=()=>{
      if(done)return;
      done=true;cancelAnimationFrame(raf);
      leaving.forEach(id=>{try{plugin.removeMarker(id,false);}catch{/* déjà retiré */}});
      next.forEach(m=>{try{plugin.updateMarker({id:m.id,opacity:1},false);}catch{/* ignoré */}});
      applied.set(plugin,new Map(next.map(m=>[m.id,m])));
      plugin.renderMarkers();viewer.needsUpdate();
      if(fades.get(plugin)===handle)fades.delete(plugin);
      resolve();
    };
    const handle={finish};
    fades.set(plugin,handle);
    const step=(now:number)=>{
      if(done)return;
      const t=Math.min(1,(now-t0)/ms),e=easeInOut(t);
      leaving.forEach(id=>{try{plugin.updateMarker({id,opacity:1-e},false);}catch{/* ignoré */}});
      next.forEach(m=>{try{plugin.updateMarker({id:m.id,opacity:e},false);}catch{/* ignoré */}});
      plugin.renderMarkers();viewer.needsUpdate();
      if(t>=1)finish();else raf=requestAnimationFrame(step);
    };
    raf=requestAnimationFrame(step);
  });
}
