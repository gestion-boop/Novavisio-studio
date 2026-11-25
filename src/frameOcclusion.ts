import type {MarkerConfig} from '@photo-sphere-viewer/markers-plugin';
import type {Hotspot} from './storage';
import {frameWorldCorners} from './sphericalFrame';

/**
 * Détourage d'un écran incrusté (photo ou télé) derrière un objet de premier plan (pancarte, poteau…).
 * L'utilisateur trace le contour de l'objet sur le panorama (points yaw / pitch). On fabrique alors un second calque,
 * posé exactement sur le cadre et juste au-dessus : il ne contient QUE les pixels du panorama situés dans ce contour
 * (rééchantillonnés depuis la photo 360°), le reste est transparent. L'écran semble ainsi passer derrière l'objet.
 * Rien n'est modifié dans les photos : le calque est recalculé à l'affichage et mis en cache.
 */
type V=[number,number,number];
const TAU=Math.PI*2;
// Convention de Photo Sphere Viewer : x = −cos(pitch)·sin(yaw), y = sin(pitch), z = cos(pitch)·cos(yaw)
export const dirOf=(yaw:number,pitch:number):V=>[-Math.cos(pitch)*Math.sin(yaw),Math.sin(pitch),Math.cos(pitch)*Math.cos(yaw)];
export function spherical(v:V):{yaw:number;pitch:number}{
  const len=Math.hypot(v[0],v[1],v[2])||1;
  const theta=Math.atan2(v[0],v[2]);
  return {yaw:theta<0?-theta:TAU-theta,pitch:Math.asin(Math.max(-1,Math.min(1,v[1]/len)))};
}
const sub=(a:V,b:V):V=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const add=(a:V,b:V):V=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const mul=(a:V,k:number):V=>[a[0]*k,a[1]*k,a[2]*k];
const dot=(a:V,b:V)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a:V,b:V):V=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const det=(x:V,y:V,z:V)=>dot(x,cross(y,z));

/** Parallélogramme plan du cadre, identique à celui que construit `straightenFrames` : coins P0 (haut-gauche), P1 (haut-droit), P3 (bas-gauche). */
export function framePlane(h:Hotspot):{p0:V;eu:V;ev:V;ratio:number}|null{
  const c=frameWorldCorners(h);
  const r=c.map(p=>dirOf(p.yaw,p.pitch));            // haut-gauche, haut-droit, bas-droit, bas-gauche
  const a=r[2],b=mul(r[1],-1),cc=mul(r[3],-1),rhs=mul(r[0],-1);
  const D=det(a,b,cc);
  if(Math.abs(D)<1e-9)return null;
  const d2=det(rhs,b,cc)/D,d1=det(a,rhs,cc)/D,d3=det(a,b,rhs)/D;
  if(!(d1>0&&d2>0&&d3>0))return null;
  const P0=r[0],P1=mul(r[1],d1),P3=mul(r[3],d3);
  const eu=sub(P1,P0),ev=sub(P3,P0);
  const lu=Math.hypot(...eu),lv=Math.hypot(...ev);
  if(lu<1e-9||lv<1e-9)return null;
  return {p0:P0,eu,ev,ratio:lu/lv};
}
/** Coordonnées (u, v) d'une direction sur le plan du cadre ; null si le rayon ne le coupe pas devant nous. */
export function planeCoords(plane:{p0:V;eu:V;ev:V},dir:V):[number,number]|null{
  // s·dir = p0 + u·eu + v·ev  →  résolution 3×3 par déterminants
  const a=dir,b=mul(plane.eu,-1),c=mul(plane.ev,-1),rhs=plane.p0;
  const D=det(a,b,c);
  if(Math.abs(D)<1e-12)return null;
  const s=det(rhs,b,c)/D,u=det(a,rhs,c)/D,v=det(a,b,rhs)/D;
  if(!(s>0))return null;
  return [u,v];
}

/**
 * Remet les 4 coins d'un écran au FORMAT RÉEL du média (largeur / hauteur de la photo ou de la vidéo), sans déformation.
 * `anchor` : bord conservé tel quel — 'left' garde le bord gauche et étend vers la droite, 'right' garde le bord droit et étend vers la gauche.
 * La hauteur du cadre ne change pas. Retourne null si le cadre est dégénéré.
 */
export function fitCornersToAspect(h:Hotspot,aspect:number,anchor:'left'|'right'):{yaw:number;pitch:number}[]|null{
  const plane=framePlane(h);
  if(!plane||!Number.isFinite(aspect)||aspect<=0)return null;
  const {p0,eu,ev}=plane;
  const lu=Math.hypot(...eu),lv=Math.hypot(...ev);
  const along=mul(eu,(lv*aspect)/lu);                       // même direction que le bord haut, longueur = hauteur × format
  const P0=anchor==='left'?p0:sub(add(p0,eu),along);        // 'right' : le coin haut-droit reste en place
  const P1=add(P0,along),P3=add(P0,ev),P2=add(P1,ev);
  return [P0,P1,P2,P3].map(v=>spherical(v));
}

type Region={x0:number;y0:number;w:number;h:number;cw:number;ch:number;data:Uint8ClampedArray;W:number;H:number};
/** Lit un rectangle de l'équirectangulaire en pleine définition (borné à 2048 px de large). */
async function readRegion(src:string,yawMin:number,yawMax:number,pitchMin:number,pitchMax:number):Promise<Region|null>{
  const blob=await (await fetch(src)).blob();
  const bmp=await createImageBitmap(blob);
  const W=bmp.width,H=bmp.height;
  const xOf=(yaw:number)=>(((yaw/TAU+0.5)%1)+1)%1*W;
  const yOf=(pitch:number)=>H/2-pitch/Math.PI*H;
  let x0=Math.floor(xOf(yawMin)),x1=Math.ceil(xOf(yawMax));
  if(x1<=x0||x1-x0>W*0.6){bmp.close();return null;}       // contour à cheval sur la couture du panorama : non géré
  const y0=Math.max(0,Math.floor(yOf(pitchMax))-2),y1=Math.min(H,Math.ceil(yOf(pitchMin))+2);
  x0=Math.max(0,x0-2);x1=Math.min(W,x1+2);
  const sw=x1-x0,sh=y1-y0;
  if(sw<2||sh<2){bmp.close();return null;}
  const scale=Math.min(1,2048/sw,2048/sh);
  const cw=Math.max(2,Math.round(sw*scale)),ch=Math.max(2,Math.round(sh*scale));
  const cv=document.createElement('canvas');cv.width=cw;cv.height=ch;
  const g=cv.getContext('2d',{willReadFrequently:true})!;
  g.drawImage(bmp,x0,y0,sw,sh,0,0,cw,ch);
  bmp.close();
  return {x0,y0,w:sw,h:sh,cw,ch,data:g.getImageData(0,0,cw,ch).data,W,H};
}

const cache=new Map<string,string|'pending'|'failed'>();
/** Un calque de restitution du panorama est nécessaire : objet détouré devant l'écran, ou découpe de l'écran. */
export const needsOccluder=(h:Hotspot):boolean=>!!(h.frameMasks?.length||h.frameShape?.length);
const keyOf=(h:Hotspot,src:string)=>h.id+'|'+JSON.stringify(h.frameMasks)+'|'+JSON.stringify(h.frameShape)+'|'+JSON.stringify(frameWorldCorners(h))+'|'+src.length+'|'+src.slice(-48);

async function build(h:Hotspot,src:string):Promise<string|null>{
  const plane=framePlane(h);const masks=h.frameMasks??[];const shape=h.frameShape;
  if(!plane||!(masks.length||shape?.length))return null;
  const long=1024,Wt=plane.ratio>=1?long:Math.max(64,Math.round(long*plane.ratio)),Ht=plane.ratio>=1?Math.max(64,Math.round(long/plane.ratio)):long;
  // Contours projetés sur le plan du cadre (les droites restent des droites) → masque anti-crénelé
  const mask=document.createElement('canvas');mask.width=Wt;mask.height=Ht;
  const mg=mask.getContext('2d')!;mg.fillStyle='#fff';
  let yawMin=Infinity,yawMax=-Infinity,pitchMin=Infinity,pitchMax=-Infinity,any=false;
  // Découpe : tout le cadre est « à restituer », sauf l'intérieur du contour (là, l'écran reste visible).
  if(shape&&shape.length>=3){
    mg.fillRect(0,0,Wt,Ht);
    mg.save();mg.globalCompositeOperation='destination-out';
    mg.beginPath();let ok=true;
    shape.forEach(([yaw,pitch],i)=>{
      const uv=planeCoords(plane,dirOf(yaw,pitch));
      if(!uv){ok=false;return;}
      const x=uv[0]*Wt,y=uv[1]*Ht;i?mg.lineTo(x,y):mg.moveTo(x,y);
    });
    if(ok){mg.closePath();mg.fill();any=true;}else{mg.restore();mg.clearRect(0,0,Wt,Ht);}
    if(ok)mg.restore();
  }
  for(const poly of masks){
    mg.beginPath();let ok=true;
    poly.forEach(([yaw,pitch],i)=>{
      const uv=planeCoords(plane,dirOf(yaw,pitch));
      if(!uv){ok=false;return;}
      const x=uv[0]*Wt,y=uv[1]*Ht;i?mg.lineTo(x,y):mg.moveTo(x,y);
      yawMin=Math.min(yawMin,yaw);yawMax=Math.max(yawMax,yaw);pitchMin=Math.min(pitchMin,pitch);pitchMax=Math.max(pitchMax,pitch);
    });
    if(ok){mg.closePath();mg.fill();any=true;}
  }
  if(!any)return null;
  // La zone du panorama à lire est celle du cadre (le contour peut le dépasser : on lit tout le cadre)
  const cs=frameWorldCorners(h);
  for(const p of cs){yawMin=Math.min(yawMin,p.yaw);yawMax=Math.max(yawMax,p.yaw);pitchMin=Math.min(pitchMin,p.pitch);pitchMax=Math.max(pitchMax,p.pitch);}
  const region=await readRegion(src,yawMin,yawMax,pitchMin,pitchMax);
  if(!region)return null;
  const mdata=mg.getImageData(0,0,Wt,Ht).data;
  const out=document.createElement('canvas');out.width=Wt;out.height=Ht;
  const og=out.getContext('2d')!;const img=og.createImageData(Wt,Ht);
  const rcw=region.cw,rch=region.ch;
  for(let y=0;y<Ht;y++)for(let x=0;x<Wt;x++){
    const a=mdata[(y*Wt+x)*4+3];if(a===0)continue;
    const u=(x+.5)/Wt,v=(y+.5)/Ht;
    const d=add(plane.p0,add(mul(plane.eu,u),mul(plane.ev,v)));
    const sp=spherical(d);
    const px=((((sp.yaw/TAU+0.5)%1)+1)%1*region.W-region.x0)/region.w*rcw;
    const py=(region.H/2-sp.pitch/Math.PI*region.H-region.y0)/region.h*rch;
    const ix=Math.max(0,Math.min(rcw-1,Math.floor(px))),iy=Math.max(0,Math.min(rch-1,Math.floor(py)));
    const o=(iy*rcw+ix)*4,i=(y*Wt+x)*4;
    img.data[i]=region.data[o];img.data[i+1]=region.data[o+1];img.data[i+2]=region.data[o+2];img.data[i+3]=a;
  }
  og.putImageData(img,0,0);
  return out.toDataURL('image/png');
}

const timers=new Map<string,{timer:number;key:string}>();
/** Source (PNG) du calque de restitution, ou null tant qu'il se prépare ; l'événement `nv-occluder-ready` signale qu'il est prêt.
 *  Le calcul est différé de 140 ms : pendant qu'on glisse un coin ou un point du contour, seul le dernier état est calculé. */
export function occluderSource(h:Hotspot,src:string|undefined):string|null{
  if(!src||!needsOccluder(h)||typeof document==='undefined')return null;
  const key=keyOf(h,src),hit=cache.get(key);
  if(hit&&hit!=='pending'&&hit!=='failed')return hit;
  if(hit)return null;
  const older=timers.get(h.id);
  if(older){window.clearTimeout(older.timer);if(cache.get(older.key)==='pending')cache.delete(older.key);}
  cache.set(key,'pending');
  const snapshot={...h};
  const timer=window.setTimeout(()=>{
    timers.delete(h.id);
    build(snapshot,src).then(result=>{cache.set(key,result??'failed');if(result)window.dispatchEvent(new Event('nv-occluder-ready'));})
      .catch(()=>cache.set(key,'failed'));
  },140);
  timers.set(h.id,{timer,key});
  if(cache.size>40)cache.delete(cache.keys().next().value!);
  return null;
}
export const occluderId=(id:string)=>id+':occ';
/** Calque posé sur le cadre, par-dessus : seul le contour détouré est visible. */
export function occluderMarkers(h:Hotspot,panorama:string|undefined):MarkerConfig[]{
  const source=occluderSource(h,panorama);
  if(!source)return [];
  return [{id:occluderId(h.id),imageLayer:source,position:frameWorldCorners(h),hoverScale:false,zIndex:40} as unknown as MarkerConfig];
}

/** Aperçu du contour en cours de tracé (points et ligne) dans l'éditeur. */
export function maskDraftMarkers(points:[number,number][]):MarkerConfig[]{
  const out:unknown[]=[];
  if(points.length>=2)out.push({id:'__nv-mask-draft',polygon:points,svgStyle:{fill:points.length>=3?'rgba(255,60,60,.28)':'none',stroke:'#ff5a5a',strokeWidth:'2px',strokeDasharray:'6 4'},hoverScale:false,zIndex:60});
  points.forEach(([yaw,pitch],i)=>out.push({id:'__nv-mask-pt-'+i,html:'<span class="nv-mask-dot'+(i===0?' is-first':'')+'"></span>',position:{yaw,pitch},size:{width:16,height:16},anchor:'center center',hoverScale:false,zIndex:61}));
  return out as MarkerConfig[];
}
