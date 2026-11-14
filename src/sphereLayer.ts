import {BackSide,CanvasTexture,Group,Mesh,MeshBasicMaterial,ShaderMaterial,SphereGeometry,SRGBColorSpace,Vector3,RepeatWrapping,AdditiveBlending} from 'three';
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
const SPHERE_ALPHA=0.98; // La destination reste nette dans la goutte ; seuls les reflets évoquent le verre.
const SPIN=0.00035;     // radians / ms

type Entry={group:Group;ball:Mesh;halo:Mesh;mat:ShaderMaterial;haloMat:MeshBasicMaterial;hover:number;spin:number;key:string};
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
        // Le shader inverse la longitude pour lire la destination à l’endroit depuis l’extérieur.
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
// Reflets en coordonnées caméra : ils restent sur le verre pendant que la destination tourne.
function waterDropMaterial(){
  return new ShaderMaterial({
    transparent:true,
    uniforms:{panorama:{value:null},hasPanorama:{value:false},spin:{value:0},opacity:{value:SPHERE_ALPHA}},
    vertexShader:`
      varying vec2 panoramaUv;
      varying vec3 viewNormal;
      void main(){
        panoramaUv=uv;
        viewNormal=normalize(normalMatrix*normal);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }`,
    fragmentShader:`
      uniform sampler2D panorama;
      uniform bool hasPanorama;
      uniform float spin;
      uniform float opacity;
      varying vec2 panoramaUv;
      varying vec3 viewNormal;
      void main(){
        vec3 n=normalize(viewNormal);
        vec3 destination=hasPanorama
          ?texture2D(panorama,vec2(1.0-panoramaUv.x+spin,panoramaUv.y)).rgb
          :vec3(0.13,0.3,0.38);
        float facing=max(n.z,0.0);
        float fresnel=pow(1.0-facing,3.5);
        // Une lentille claire : le panorama garde sa couleur, avec du volume au bord.
        vec3 color=destination*(0.84+0.16*facing);
        color=mix(color,vec3(0.76,0.94,1.0),fresnel*0.42);
        // Grande réflexion douce en haut à gauche, point brillant et rappel en bas à droite.
        float soft=pow(max(dot(n,normalize(vec3(-0.4,0.58,0.72))),0.0),18.0);
        float shine=pow(max(dot(n,normalize(vec3(-0.32,0.5,0.81))),0.0),100.0);
        float bounce=pow(max(dot(n,normalize(vec3(0.5,-0.65,0.57))),0.0),45.0);
        color=mix(color,vec3(1.0),min(0.88,soft*0.28+shine*0.78));
        color+=vec3(0.55,0.82,0.9)*bounce*0.24;
        gl_FragColor=vec4(color,opacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
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
    const mat=waterDropMaterial();
    const haloMat=new MeshBasicMaterial({color:0x9fe3ff,transparent:true,opacity:0.07,side:BackSide,blending:AdditiveBlending,depthWrite:false});
    const ball=new Mesh(geometry,mat),halo=new Mesh(geometry,haloMat);
    halo.scale.setScalar(1.025);
    ball.renderOrder=10;halo.renderOrder=11;
    const group=new Group();group.add(ball,halo);
    viewer.renderer.addObject(group);
    const url=imageOf(data.target);
    const key=data.target+':'+(url?.length??0);
    if(url)void loadTexture(url,key).then(t=>{if(t&&alive&&entries.get(id)?.group===group){mat.uniforms.panorama.value=t;mat.uniforms.hasPanorama.value=true;viewer.needsUpdate();}});
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
      e.mat.uniforms.spin.value=e.spin;
      const op=Math.max(0,Math.min(1,cfg.opacity??1));
      e.group.visible=op>0.01;
      e.mat.uniforms.opacity.value=op*SPHERE_ALPHA;e.haloMat.opacity=0.07*op*(1+e.hover);
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
