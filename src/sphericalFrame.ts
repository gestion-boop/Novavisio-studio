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
  return h.type==='image' || h.type==='video';
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
