import {BackSide,BufferAttribute,CanvasTexture,Color,Group,Mesh,MeshBasicMaterial,SphereGeometry,SRGBColorSpace,Vector3,RepeatWrapping,AdditiveBlending} from 'three';
import type {Viewer} from '@photo-sphere-viewer/core';
import {MarkersPlugin} from '@photo-sphere-viewer/markers-plugin';

/**
 * Flèches « Sphère » : une vraie boule 3D, placée dans la scène du visualiseur, qui montre le panorama de destination
 * et tourne doucement sur elle-même. Au survol elle grossit légèrement et vient vers le visiteur.
 *
 * Le clic, l'infobulle et l'édition restent gérés par un marqueur HTML transparent de même taille (data.nvSphere) :
 * la sphère est donc purement visuelle, et suit exactement la vie de ces marqueurs (ajout, retrait, fondu, déplacement).
 */
export type SphereData={size:number;target:string};
const DEPTH=7;          // distance de la sphère à la caméra (le panorama est à 10 : elle passe devant)
const HOVER_GROW=0.16;  // grossissement apparent au survol
const HOVER_PULL=0.9;   // et elle se rapproche d'autant
const SPHERE_ALPHA=0.72; // translucidité : on devine le décor à travers la sphère
const SPIN=0.00035;     // radians / ms

type Entry={group:Group;ball:Mesh;halo:Mesh;mat:MeshBasicMaterial;haloMat:MeshBasicMaterial;hover:number;spin:number;key:string};
const textures=new Map<string,Promise<CanvasTexture|null>>();

function loadTexture(url:string,key:string):Promise<CanvasTexture|null>{
  let p=textures.get(key);
  if(p)return p;
  p=new Promise<CanvasTexture|null>(resolve=>{
    const img=new Image();img.crossOrigin='anonymous';
    img.onload=()=>{
      try{
        const c=document.createElement('canvas');c.width=512;c.height=256;
        c.getContext('2d')!.drawImage(img,0,0,512,256);
        const t=new CanvasTexture(c);
        t.colorSpace=SRGBColorSpace;t.wrapS=RepeatWrapping;
        // Vue de l'extérieur, le panorama doit se lire à l'endroit (pas en miroir).
        t.repeat.x=-1;t.offset.x=1;
        resolve(t);
      }catch{resolve(null);}
    };
    img.onerror=()=>resolve(null);
    img.src=url;
  });
  textures.set(key,p);
  if(textures.size>40){const first=textures.keys().next().value;if(first)textures.delete(first);}
  return p;
}

const geometry=new SphereGeometry(1,44,30);
// Ombrage « cuit » dans les sommets (lumière en haut à gauche, bords légèrement assombris) : la boule prend du volume.
// La boule reste fixe et c'est la texture qui tourne, pour que la lumière ne tourne pas avec elle.
{
  const n=geometry.getAttribute('normal'),col=new Float32Array(n.count*3);
  const L=new Vector3(0.4,0.6,-0.7).normalize();
  for(let i=0;i<n.count;i++){
    const d=Math.max(0,n.getX(i)*L.x+n.getY(i)*L.y+n.getZ(i)*L.z);
    const rim=Math.max(0,-n.getZ(i));
    const k=Math.min(1,0.42+0.5*d+0.2*Math.pow(rim,0.6));
    col[i*3]=col[i*3+1]=col[i*3+2]=k;
  }
  geometry.setAttribute('color',new BufferAttribute(col,3));
}

/** Branche la couche « sphères » sur un visualiseur. `imageOf(sceneId)` donne l'image du panorama de destination. Retourne la fonction de nettoyage. */
export function attachSphereLayer(viewer:Viewer,imageOf:(sceneId:string)=>string|undefined):()=>void{
  const plugin=viewer.getPlugin(MarkersPlugin) as MarkersPlugin;
  const entries=new Map<string,Entry>();
  let hoverId='',raf=0,last=performance.now(),alive=true;
  const tmp=new Vector3();

  const over=(e:Event)=>{const el=(e.target as HTMLElement|null)?.closest?.('.psv-marker');hoverId=el?.id?.replace(/^psv-marker-/,'')??'';};
  const out=()=>{hoverId='';};
  viewer.container.addEventListener('pointerover',over);
  viewer.container.addEventListener('pointerleave',out);

  const remove=(id:string)=>{
    const e=entries.get(id);if(!e)return;
    viewer.renderer.removeObject(e.group);
    e.mat.dispose();e.haloMat.dispose();entries.delete(id);
  };
  const create=(id:string,data:SphereData):Entry=>{
    // transparent:true même à pleine opacité : le panorama du visualiseur est dessiné après les objets opaques et les recouvrirait.
    const mat=new MeshBasicMaterial({color:new Color(0x2a4a5a),transparent:true,vertexColors:true});
    const haloMat=new MeshBasicMaterial({color:0x9fe3ff,transparent:true,opacity:0.16,side:BackSide,blending:AdditiveBlending,depthWrite:false});
    const ball=new Mesh(geometry,mat),halo=new Mesh(geometry,haloMat);
    halo.scale.setScalar(1.09);
    ball.renderOrder=10;halo.renderOrder=11;
    const group=new Group();group.add(ball,halo);
    viewer.renderer.addObject(group);
    const url=imageOf(data.target);
    const key=data.target+':'+(url?.length??0);
    if(url)void loadTexture(url,key).then(t=>{if(t&&alive&&entries.get(id)?.group===group){mat.map=t;mat.color.set(0xffffff);mat.needsUpdate=true;viewer.needsUpdate();}});
    const e:Entry={group,ball,halo,mat,haloMat,hover:0,spin:0,key};
    entries.set(id,e);return e;
  };

  const tick=(now:number)=>{
    if(!alive)return;
    raf=requestAnimationFrame(tick);
    const dt=Math.min(64,now-last);last=now;
    if(document.hidden)return;
    const markers=plugin.getMarkers().filter(m=>(m.config as {data?:{nvSphere?:SphereData}}).data?.nvSphere);
    const seen=new Set<string>();
    const hpx=viewer.container.clientHeight||600;
    const vfov=((viewer.state as unknown as {vFov:number}).vFov||60)*Math.PI/180;
    const cam=viewer.getPosition();
    let needsRender=false;
    for(const m of markers){
      const id=m.id,cfg=m.config as unknown as {position?:{yaw:number;pitch:number};opacity?:number;data:{nvSphere:SphereData}};
      const data=cfg.data.nvSphere;
      if(!cfg.position||typeof cfg.position.yaw!=='number')continue;
      seen.add(id);
      let e=entries.get(id);
      const url=imageOf(data.target);
      if(e&&e.key!==data.target+':'+(url?.length??0)){remove(id);e=undefined;}
      if(!e)e=create(id,data);
      e.hover+=((hoverId===id?1:0)-e.hover)*Math.min(1,dt/90);
      const ang=data.size/hpx*vfov*(1+HOVER_GROW*e.hover);
      const dist=DEPTH-HOVER_PULL*e.hover;
      viewer.dataHelper.sphericalCoordsToVector3(cfg.position,tmp,dist);
      e.group.position.copy(tmp);
      e.group.scale.setScalar(Math.max(0.001,dist*Math.tan(ang/2)));
      e.spin=(e.spin+dt*SPIN*(1+2.5*e.hover)/(2*Math.PI))%1;
      if(e.mat.map)e.mat.map.offset.x=1+e.spin;
      const op=Math.max(0,Math.min(1,cfg.opacity??1));
      e.group.visible=op>0.01;
      e.mat.opacity=op*SPHERE_ALPHA;e.haloMat.opacity=0.16*op*(1+e.hover);
      // On ne redessine en continu que si une sphère est dans le champ de vision (batterie).
      const dy=Math.atan2(Math.sin(cfg.position.yaw-cam.yaw),Math.cos(cfg.position.yaw-cam.yaw)),dp=cfg.position.pitch-cam.pitch;
      if(Math.abs(dy)<vfov*2&&Math.abs(dp)<vfov)needsRender=true;
    }
    for(const id of [...entries.keys()])if(!seen.has(id)){remove(id);needsRender=true;}
    if(needsRender)viewer.needsUpdate();
  };
  raf=requestAnimationFrame(tick);

  return ()=>{
    alive=false;cancelAnimationFrame(raf);
    viewer.container.removeEventListener('pointerover',over);
    viewer.container.removeEventListener('pointerleave',out);
    try{for(const id of [...entries.keys()])remove(id);}catch{/* visualiseur déjà détruit */}
  };
}
