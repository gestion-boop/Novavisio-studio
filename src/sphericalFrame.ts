import {Vector3} from 'three';
import type {MarkersPlugin} from '@photo-sphere-viewer/markers-plugin';
import type {Hotspot,FrameSphericalCorners} from './storage';
import {defaultFrameCorners} from './storage';

/**
 * These corners are attached to the spherical panorama (not to a floating HTML billboard).
 * Once captured, zoom and camera rotation never modify their stored world coordinates.
 */
export const FRAME_KEYS=['tl','tr','br','bl'] as const;
export type FrameKey=typeof FRAME_KEYS[number];
export type SphericalPoint={yaw:number;pitch:number};

export function isFrame(h:Hotspot):boolean {
  return (h.type==='image' || h.type==='video')&&h.mediaDisplay!=='popup';
}

export function frameWorldCorners(h:Hotspot):FrameSphericalCorners {
  if(h.frameSphericalCorners?.length===4)return h.frameSphericalCorners;
  const points=h.frameCorners??defaultFrameCorners();
  const refHeight=Math.max(100,h.frameReferenceHeight??550);
  const zoom=Math.max(0,Math.min(100,h.frameReferenceZoom??60));
  // Keep this matching the PSV minFov:35/maxFov:75 settings.
  const vfov=(75-(75-35)*zoom/100)*Math.PI/180;
  const halfV=Math.tan(vfov/2);
  const w=h.frameWidth??320;
  const ht=h.frameHeight??200;
  return FRAME_KEYS.map(key=>{
    const px=(points[key].x/100-0.5)*w;
    const py=(points[key].y/100-0.5)*ht;
    const horizontal=Math.atan2(2*px*halfV,refHeight);
    const vertical=Math.atan2(2*py*halfV,refHeight);
    const pitch=Math.max(-Math.PI/2+0.005,Math.min(Math.PI/2-0.005,h.pitch-vertical));
    const yaw=h.yaw+horizontal/Math.max(0.3,Math.cos(h.pitch));
    return {yaw,pitch};
  }) as FrameSphericalCorners;
}

/** En visite, n'affiche qu'une seule fois deux copies de la même vidéo placées sur le même écran.
 * La dernière copie est conservée : elle correspond généralement au réglage le plus récent.
 * Les points restent tous présents dans l'éditeur et dans les données du projet.
 */
export function visibleVideoFrames(hotspots:Hotspot[]):Hotspot[]{
  const close=(a:Hotspot,b:Hotspot)=>{
    if(a.type!=='video'||b.type!=='video'||!isFrame(a)||!isFrame(b))return false;
    const source=a.videoDataUrl||a.videoUrl;
    if(!source||source!==(b.videoDataUrl||b.videoUrl))return false;
    const ac=frameWorldCorners(a),bc=frameWorldCorners(b);
    return ac.every((p,i)=>{
      const dy=Math.atan2(Math.sin(p.yaw-bc[i].yaw),Math.cos(p.yaw-bc[i].yaw));
      return Math.abs(dy)<0.02&&Math.abs(p.pitch-bc[i].pitch)<0.02;
    });
  };
  return hotspots.filter((h,i)=>!hotspots.slice(i+1).some(other=>close(h,other)));
}

export function replaceWorldCorner(h:Hotspot,key:FrameKey,position:SphericalPoint):FrameSphericalCorners {
  const corners=frameWorldCorners(h).map(p=>({...p})) as FrameSphericalCorners;
  corners[FRAME_KEYS.indexOf(key)]={yaw:position.yaw,pitch:position.pitch};
  return corners;
}

export function moveWorldFrame(h:Hotspot,center:SphericalPoint):FrameSphericalCorners {
  const yawDelta=center.yaw-h.yaw;
  const pitchDelta=center.pitch-h.pitch;
  return frameWorldCorners(h).map(p=>({
    yaw:p.yaw+yawDelta,
    pitch:Math.max(-Math.PI/2+0.005,Math.min(Math.PI/2-0.005,p.pitch+pitchDelta))
  })) as FrameSphericalCorners;
}

export const cornerMarkerId=(id:string,key:FrameKey)=>'__nv-corner-'+key+'-'+id;
export const centerMarkerId=(id:string)=>'__nv-center-'+id;
export const removeFrameMarkerId=(id:string)=>'__nv-remove-'+id;

/** Screen-size handles are deliberately tiny; the invisible hit area is larger. */
export function editingFrameControls(h:Hotspot){
  const corners=frameWorldCorners(h);
  return [
    ...FRAME_KEYS.map((key,index)=>({
      id:cornerMarkerId(h.id,key),
      html:'<button type="button" class="nv-sphere-handle" data-frame-id="'+h.id+'" data-corner="'+key+'" aria-label="Ajuster le coin '+key.toUpperCase()+'"></button>',
      position:corners[index],
      size:{width:24,height:24},
      anchor:'center center' as const,
      hoverScale:false,
      zIndex:90
    })),
    {
      id:removeFrameMarkerId(h.id),
      className:'nv-frame-remove-marker',
      html:'<button type="button" class="nv-sphere-remove" data-frame-id="'+h.id+'" aria-label="Supprimer ce cadre" title="Supprimer ce cadre photo ou vidéo">×</button>',
      position:corners[1],
      size:{width:30,height:30},
      anchor:'center center' as const,hoverScale:false,zIndex:99
    },
    {
      id:centerMarkerId(h.id),
      html:'<button type="button" class="nv-sphere-center" data-frame-id="'+h.id+'" aria-label="Déplacer le cadre entier"></button>',
      position:{yaw:h.yaw,pitch:h.pitch},
      size:{width:24,height:24},
      anchor:'center center' as const,
      hoverScale:false,
      zIndex:89
    }
  ];
}

/** Auréole légère autour d'un cadre photo / vidéo cliquable (affichée seulement dans l'Aperçu et la visite). */
export function haloMarkers(h:Hotspot):{id:string;polygon:[number,number][];svgStyle:Record<string,string>;className:string;tooltip?:string}[]{
  const media=(h.type==='image'&&!!h.imageDataUrl)||(h.type==='video'&&!!(h.videoDataUrl||h.videoUrl));
  const clickable=h.type==='video'?h.videoOpenFullscreen!==false:true;
  if(!media||!isFrame(h)||(h.frameHalo===false||h.frameSignalStyle==='none')||!clickable)return [];
  const c=frameWorldCorners(h);
  const wrap=(a:number)=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;};
  const ref=c[0].yaw,rel=c.map(p=>({yaw:wrap(p.yaw-ref),pitch:p.pitch}));
  const cy=rel.reduce((a,p)=>a+p.yaw,0)/4,cp=rel.reduce((a,p)=>a+p.pitch,0)/4,k=1.07,lim=Math.PI/2-0.005;
  const polygon=rel.map(p=>[ref+cy+(p.yaw-cy)*k,Math.max(-lim,Math.min(lim,cp+(p.pitch-cp)*k))] as [number,number]);
  const style=h.frameSignalStyle??'gold';
  return [{id:h.id+':halo',polygon,className:'nv-frame-halo nv-frame-halo-'+style,svgStyle:{fill:'none',stroke:style==='gold'?'rgba(215,177,102,.9)':'rgba(230,245,255,.85)',strokeWidth:style==='gold'?'1.5px':'2px'}}];
}

/**
 * Perspective correcte des cadres photo / vidéo.
 * Le plugin plaque l'image sur deux triangles dont les 4 sommets sont à la même distance : dès que le cadre n'est pas un parallélogramme parfait,
 * l'image se déforme le long de la diagonale. On garde exactement les mêmes directions (les coins restent là où on les a posés) mais on règle la
 * distance de chaque sommet pour que le cadre soit un parallélogramme plan : l'image est alors en perspective exacte, sans cisaillement.
 * Le rapport largeur / hauteur réel sert aussi à ne rogner l'image que si son format diffère vraiment de celui du cadre.
 */
export function straightenFrames(plugin:MarkersPlugin,ids:string[]){
  for(const id of ids){
    let marker:unknown;
    try{marker=plugin.getMarker(id);}catch{continue;}
    const mesh=(marker as {threeMesh?:{geometry:{getAttribute:(n:string)=>{count:number;needsUpdate:boolean;setXYZ:(i:number,x:number,y:number,z:number)=>void;getX:(i:number)=>number;getY:(i:number)=>number;getZ:(i:number)=>number}|undefined;boundingSphere:unknown;boundingBox:unknown};material:{map?:{image?:{videoWidth?:number;videoHeight?:number;naturalWidth?:number;naturalHeight?:number;width?:number;height?:number}};repeat?:{set:(x:number,y:number)=>void};offset?:{set:(x:number,y:number)=>void}}}}).threeMesh;
    const pos=mesh?.geometry.getAttribute('position');
    if(!mesh||!pos||pos.count<4)continue;
    // Ordre des sommets du maillage : 0 = haut-gauche, 1 = haut-droit, 2 = bas-gauche, 3 = bas-droit
    const v=[0,1,2,3].map(i=>new Vector3(pos.getX(i),pos.getY(i),pos.getZ(i)));
    // Rayon FIXE (celui de la sphère de PSV) : recalculé à partir des sommets courants, il dériverait à chaque image et le cadre finirait par s'effondrer.
    const R=10;
    if(!v.every(p=>p.lengthSq()>1e-6&&Number.isFinite(p.x+p.y+p.z)))continue;
    const r=[v[0],v[1],v[3],v[2]].map(p=>p.clone().normalize()); // haut-gauche, haut-droit, bas-droit, bas-gauche
    // d2·r2 − d1·r1 − d3·r3 = −r0 (parallélogramme : P0 + P2 = P1 + P3), avec d0 = 1
    const a=r[2],b=r[1].clone().negate(),c=r[3].clone().negate(),rhs=r[0].clone().negate();
    const det=(x:Vector3,y:Vector3,z:Vector3)=>x.dot(new Vector3().crossVectors(y,z));
    const D=det(a,b,c);
    if(Math.abs(D)<1e-9)continue;
    const d2=det(rhs,b,c)/D,d1=det(a,rhs,c)/D,d3=det(a,b,rhs)/D;
    if(!(d1>0&&d2>0&&d3>0))continue;
    const ds=[1,d1,d2,d3],mean=(ds[0]+ds[1]+ds[2]+ds[3])/4;
    const P=r.map((dir,i)=>dir.clone().multiplyScalar(R*ds[i]/mean)); // TL, TR, BR, BL
    pos.setXYZ(0,P[0].x,P[0].y,P[0].z);pos.setXYZ(1,P[1].x,P[1].y,P[1].z);
    pos.setXYZ(2,P[3].x,P[3].y,P[3].z);pos.setXYZ(3,P[2].x,P[2].y,P[2].z);
    pos.needsUpdate=true;mesh.geometry.boundingSphere=null;mesh.geometry.boundingBox=null;
    // Format réel du cadre (largeur / hauteur dans le plan) comparé à celui de l'image
    const layerRatio=P[1].distanceTo(P[0])/Math.max(1e-9,P[3].distanceTo(P[0]));
    const img=mesh.material.map?.image;
    const iw=img?.videoWidth||img?.naturalWidth||img?.width||0,ih=img?.videoHeight||img?.naturalHeight||img?.height||0;
    if(iw&&ih&&mesh.material.repeat&&mesh.material.offset){
      const imageRatio=iw/ih;
      let rx=1,ry=1;
      if(layerRatio<imageRatio)rx=layerRatio/imageRatio;else ry=imageRatio/layerRatio;
      mesh.material.repeat.set(rx,ry);mesh.material.offset.set((1-rx)/2,(1-ry)/2);
    }
  }
}
export const frameIdsOf=(hotspots:Hotspot[])=>hotspots.filter(h=>(h.type==='image'&&!!h.imageDataUrl&&h.mediaDisplay!=='popup')||(h.type==='video'&&!!(h.videoDataUrl||h.videoUrl)&&h.mediaDisplay!=='popup')).map(h=>h.id);
