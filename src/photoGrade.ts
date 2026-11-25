import {Vector3,Vector4} from 'three';
import type {Viewer} from '@photo-sphere-viewer/core';

/**
 * Retouche de la PHOTO du panorama (Exposition, Contraste, Saturation, Vibrance, Température, Points forts), en direct.
 * Le calcul est fait par la carte graphique, dans le rendu de la sphère seulement : les logos, photos, télés incrustés
 * et boutons ne sont jamais touchés. Aucun fichier n'est modifié : le réglage est enregistré avec la scène (−100 à +100).
 */
export type PhotoGrade={exposure:number;contrast:number;saturation:number;vibrance:number;temperature:number;highlights:number};
export const GRADE_KEYS=['exposure','contrast','saturation','vibrance','temperature','highlights'] as const;
export const GRADE_LABELS:Record<keyof PhotoGrade,string>={exposure:'Exposition',contrast:'Contraste',saturation:'Saturation',vibrance:'Vibrance',temperature:'Température',highlights:'Points forts'};
export const ZERO_GRADE:PhotoGrade={exposure:0,contrast:0,saturation:0,vibrance:0,temperature:0,highlights:0};
/** Réglage « moins hôpital » : un peu moins d'exposition, une teinte moins froide, des points forts adoucis. */
export const SOFTER_GRADE:PhotoGrade={...ZERO_GRADE,exposure:-10,temperature:-10,highlights:-10};

const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
/** Valeurs entières bornées ; null si rien n'est réglé. */
export function normalizeGrade(g:Partial<PhotoGrade>|null|undefined):PhotoGrade|null{
  if(!g||typeof g!=='object')return null;
  const out={...ZERO_GRADE};let any=false;
  for(const k of GRADE_KEYS){const v=Number(g[k]);out[k]=Number.isFinite(v)?clamp(Math.round(v),-100,100):0;if(out[k]!==0)any=true;}
  return any?out:null;
}

const GLSL=`
uniform vec4 uNvG1; uniform vec3 uNvG2; uniform float uNvOn;
vec3 nvGrade(vec3 c){
  // PSV n'applique aucune conversion de couleur : c est déjà en valeurs d'écran (sRGB).
  vec3 lin=pow(max(c,vec3(0.0)),vec3(2.2));
  lin*=exp2(uNvG1.x*1.5);                                  // exposition (en lumière linéaire, ±1,5 IL)
  lin.r*=1.0+0.16*uNvG2.x; lin.b*=1.0-0.16*uNvG2.x;       // température : + chaud, − froid
  vec3 s=pow(clamp(lin,0.0,1.0),vec3(1.0/2.2));
  float l=dot(s,vec3(0.2126,0.7152,0.0722));
  s+=uNvG2.y*0.30*smoothstep(0.45,1.0,l)*s;                 // points forts : − adoucit les zones claires
  s=(s-0.5)*(1.0+uNvG1.y*0.7)+0.5;                          // contraste
  float g=dot(s,vec3(0.2126,0.7152,0.0722));
  float chroma=max(max(s.r,s.g),s.b)-min(min(s.r,s.g),s.b);
  float sat=max(0.0,1.0+uNvG1.z+uNvG1.w*0.5*(1.0-clamp(chroma*1.6,0.0,1.0)));  // vibrance : agit surtout sur les couleurs ternes
  s=mix(vec3(g),s,sat);
  return clamp(s,0.0,1.0);
}`;

type Material={userData:Record<string,unknown>;onBeforeCompile?:(shader:{uniforms:Record<string,unknown>;fragmentShader:string})=>void;needsUpdate:boolean};
export type GradeHandle={set:(g:PhotoGrade|null)=>void};

/**
 * Installe la retouche sur un lecteur : chaque sphère créée par la suite (changement de panorama, fondu, photo de nuit) la reçoit,
 * et la sphère déjà affichée est mise à jour. `set` règle les valeurs en direct.
 */
export function installPhotoGrade(viewer:Viewer):GradeHandle{
  const U={g1:{value:new Vector4(0,0,0,0)},g2:{value:new Vector3(0,0,0)},on:{value:0}};
  const patch=(material:Material|undefined)=>{
    if(!material||material.userData.nvGrade)return;
    material.userData.nvGrade=true;
    material.onBeforeCompile=shader=>{
      shader.uniforms.uNvG1=U.g1;shader.uniforms.uNvG2=U.g2;shader.uniforms.uNvOn=U.on;
      shader.fragmentShader=GLSL+shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n  if(uNvOn>0.5){diffuseColor.rgb=nvGrade(diffuseColor.rgb);}');
    };
    material.needsUpdate=true;
  };
  const adapter=(viewer as unknown as {adapter?:{createMesh:(d:unknown)=>{material:Material}}}).adapter;
  if(adapter&&!(adapter as unknown as {__nvGrade?:boolean}).__nvGrade){
    const create=adapter.createMesh.bind(adapter);
    adapter.createMesh=(panoData:unknown)=>{const mesh=create(panoData);patch(mesh.material);return mesh;};
    (adapter as unknown as {__nvGrade:boolean}).__nvGrade=true;
  }
  patch((viewer as unknown as {renderer?:{mesh?:{material:Material}}}).renderer?.mesh?.material);
  return {set(g){
    const n=normalizeGrade(g);
    U.on.value=n?1:0;
    if(n){U.g1.value.set(n.exposure/100,n.contrast/100,n.saturation/100,n.vibrance/100);U.g2.value.set(n.temperature/100,n.highlights/100,0);}
    try{viewer.needsUpdate();}catch{/* lecteur détruit */}
  }};
}
