import type {Viewer} from '@photo-sphere-viewer/core';
import {Vector3} from 'three';
import type {SunFlare} from './storage';

const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));

/**
 * Reflet de soleil : un halo et des rayons placés sur la position du soleil dans le panorama.
 * La position est recalculée à chaque mouvement de vue ; le reflet disparaît quand le soleil est derrière le visiteur.
 * Retourne la fonction de nettoyage.
 */
export function attachSunFlare(viewer:Viewer,flare:SunFlare|undefined):()=>void{
  if(!flare)return ()=>{};
  const len=clamp(flare.length??400,40,1200);
  const rays=Math.round(clamp(flare.rays??16,4,48));
  const el=document.createElement('div');
  el.className='nv-sun-flare';
  el.setAttribute('aria-hidden','true');
  el.style.cssText='position:absolute;left:0;top:0;pointer-events:none;z-index:4;display:none;will-change:transform';
  el.innerHTML=
    '<div style="position:absolute;left:0;top:0;width:'+len*2+'px;height:'+len*2+'px;opacity:'+clamp(flare.intensity??0.6,0,1)+';'+
    'background:radial-gradient(circle,rgba(255,250,235,.95) 0%,rgba(255,236,190,.55) 6%,rgba(255,226,170,.14) 26%,transparent 58%);'+
    'mix-blend-mode:screen"></div>'+
    '<div style="position:absolute;left:0;top:0;width:'+len*2+'px;height:'+len*2+'px;opacity:'+clamp(flare.intensity??0.6,0,1)*.9+';'+
    'background:repeating-conic-gradient(from '+(flare.orientation??0)+'deg,rgba(255,244,210,.85) 0deg 1.2deg,transparent 1.2deg '+(360/rays)+'deg);'+
    '-webkit-mask-image:radial-gradient(circle,#000 0%,#000 14%,transparent 70%);mask-image:radial-gradient(circle,#000 0%,#000 14%,transparent 70%);'+
    'mix-blend-mode:screen"></div>';
  viewer.container.appendChild(el);
  const camera=(viewer as unknown as {renderer:{camera:import('three').PerspectiveCamera}}).renderer.camera;
  const world=new Vector3();
  const update=()=>{
    const w=viewer.container.clientWidth,h=viewer.container.clientHeight;
    if(!w||!h||!camera){el.style.display='none';return;}
    viewer.dataHelper.sphericalCoordsToVector3({yaw:flare.yaw*Math.PI/180,pitch:flare.pitch*Math.PI/180},world,10);
    const inFront=world.clone().applyMatrix4(camera.matrixWorldInverse).z<0;
    if(!inFront){el.style.display='none';return;}
    const p=world.clone().project(camera);
    const x=(p.x+1)/2*w,y=(1-p.y)/2*h;
    el.style.display='block';
    el.style.transform='translate('+(x-len)+'px,'+(y-len)+'px)';
  };
  const events=['position-updated','zoom-updated','size-updated'] as const;
  events.forEach(ev=>viewer.addEventListener(ev,update));
  update();
  return ()=>{
    events.forEach(ev=>viewer.removeEventListener(ev,update));
    el.remove();
  };
}
