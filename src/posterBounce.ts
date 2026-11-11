import type {Viewer} from '@photo-sphere-viewer/core';
import {MarkersPlugin} from '@photo-sphere-viewer/markers-plugin';
import {frameWorldCorners} from './sphericalFrame';
import type {FrameSphericalCorners,Hotspot,Scene} from './storage';

/**
 * Très léger rebond optionnel des cadres photo uniquement. Les écrans vidéo restent toujours immobiles.
 * Les affiches sont dessinées dans la vue 3D : on anime donc leurs 4 coins autour de leur centre (un simple zoom de l'objet
 * depuis le centre de la sphère ne changerait rien à l'écran). Le rebond est amorti : +3 % puis -1 % puis retour à 100 %.
 */
const DURATION_MS=900;
const FIRST_DELAY_MS=1800;   // premier rebond peu après l'arrivée sur la scène
const PAUSE_MS=4200;         // puis un rebond toutes les ~5 secondes
const STAGGER_MS=110;        // plusieurs affiches : léger décalage entre elles
const AMPLITUDE=0.05;

const isPoster=(h:Hotspot)=>h.type==='image'&&!!h.imageDataUrl&&h.imageBounce!==false;
const wrap=(a:number)=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;};
const curve=(t:number)=>1+AMPLITUDE*Math.sin(t*Math.PI*2*1.5)*Math.exp(-3.5*t);

function scaleCorners(corners:FrameSphericalCorners,s:number):FrameSphericalCorners{
  const ref=corners[0].yaw;
  const rel=corners.map(c=>({yaw:wrap(c.yaw-ref),pitch:c.pitch}));
  const cy=rel.reduce((a,c)=>a+c.yaw,0)/4,cp=rel.reduce((a,c)=>a+c.pitch,0)/4;
  const limit=Math.PI/2-0.005;
  return rel.map(c=>({yaw:ref+cy+(c.yaw-cy)*s,pitch:Math.max(-limit,Math.min(limit,cp+(c.pitch-cp)*s))})) as FrameSphericalCorners;
}

/** Renvoie une fonction d'arrêt. `enabled()` est relu à chaque image : le rebond s'arrête net si on passe en édition. */
export function startPosterBounce(viewer:Viewer,getScene:()=>Scene|null,enabled:()=>boolean):()=>void{
  if(typeof window==='undefined'||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return ()=>{};
  const plugin=viewer.getPlugin(MarkersPlugin) as MarkersPlugin;
  let raf=0,timer=0,disposed=false;

  const setScale=(h:Hotspot,s:number)=>{
    const live=getScene()?.hotspots.find(x=>x.id===h.id);
    if(!live||!isPoster(live))return;
    const base=frameWorldCorners(live);
    try{plugin.updateMarker({id:h.id,position:s===1?base:scaleCorners(base,s)},false);}catch{/* marqueur absent (changement de scène) */}
  };
  const run=()=>{
    if(disposed)return;
    const scene=getScene();
    const posters=enabled()&&!document.hidden&&scene?scene.hotspots.filter(isPoster):[];
    if(!posters.length){timer=window.setTimeout(run,1500);return;}
    const start=performance.now();
    const frame=(now:number)=>{
      if(disposed)return;
      const keep=enabled();
      let running=false;
      posters.forEach((h,i)=>{
        const t=(now-start-i*STAGGER_MS)/DURATION_MS;
        if(t<0){running=true;return;}
        if(!keep||t>=1){setScale(h,1);return;}   // fin (ou arrêt demandé) : retour exact à la taille normale
        setScale(h,curve(t));running=true;
      });
      viewer.needsUpdate();
      if(running&&keep)raf=requestAnimationFrame(frame);
      else timer=window.setTimeout(run,PAUSE_MS);
    };
    raf=requestAnimationFrame(frame);
  };
  timer=window.setTimeout(run,FIRST_DELAY_MS);
  return ()=>{disposed=true;cancelAnimationFrame(raf);window.clearTimeout(timer);};
}
