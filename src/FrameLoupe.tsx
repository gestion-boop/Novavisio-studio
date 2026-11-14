import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import type {PointerEvent as RPointerEvent,KeyboardEvent as RKeyboardEvent} from 'react';
import type {Hotspot,FrameSphericalCorners} from './storage';
import {FRAME_KEYS,frameWorldCorners,type FrameKey} from './sphericalFrame';

/**
 * « Zoom de précision » : une vraie loupe sur le panorama (projection rectilinéaire comme la vue 3D),
 * avec les 4 coins du cadre déplaçables directement dessus. Les coins restent des coordonnées sphériques :
 * ce que l'on voit ici est exactement ce qui sera posé sur le panorama.
 */
const W=330,H=230;
const ORDER:FrameKey[]=['tl','tr','br','bl'];
const LABEL:Record<FrameKey,string>={tl:'haut gauche',tr:'haut droit',br:'bas droit',bl:'bas gauche'};
const ZOOMS=[1,2,3,4];
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));

type Basis={f:number;fw:[number,number,number];rt:[number,number,number];up:[number,number,number]};
function basis(cy:number,cp:number,fov:number):Basis{
  const f=(W/2)/Math.tan(fov/2);
  const sy=Math.sin(cy),cyy=Math.cos(cy),sp=Math.sin(cp),cpp=Math.cos(cp);
  return {f,fw:[sy*cpp,sp,cyy*cpp],rt:[cyy,0,-sy],up:[-sy*sp,cpp,-cyy*sp]};
}
/** yaw/pitch -> pixel de la loupe (null si derrière la caméra). */
function project(b:Basis,yaw:number,pitch:number):[number,number]|null{
  const d:[number,number,number]=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)];
  const z=d[0]*b.fw[0]+d[1]*b.fw[1]+d[2]*b.fw[2];
  if(z<=0.02)return null;
  const x=d[0]*b.rt[0]+d[1]*b.rt[1]+d[2]*b.rt[2];
  const y=d[0]*b.up[0]+d[1]*b.up[1]+d[2]*b.up[2];
  return [W/2+b.f*x/z,H/2-b.f*y/z];
}
/** pixel de la loupe -> yaw/pitch. */
function unproject(b:Basis,px:number,py:number){
  const dx=px-W/2,dy=-(py-H/2);
  const r=[b.f*b.fw[0]+dx*b.rt[0]+dy*b.up[0],b.f*b.fw[1]+dx*b.rt[1]+dy*b.up[1],b.f*b.fw[2]+dx*b.rt[2]+dy*b.up[2]];
  const n=Math.hypot(r[0],r[1],r[2])||1;
  return {yaw:Math.atan2(r[0],r[2]),pitch:clamp(Math.asin(r[1]/n),-Math.PI/2+0.005,Math.PI/2-0.005)};
}
/** Angle de yaw le plus proche de `ref` (évite les sauts de 2π). */
const nearYaw=(yaw:number,ref:number)=>yaw+2*Math.PI*Math.round((ref-yaw)/(2*Math.PI));

function useSource(url:string){
  const [src,setSrc]=useState<{w:number;h:number;data:Uint8ClampedArray}|null>(null);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    let dead=false;setSrc(null);setFailed(false);
    const img=new Image();img.crossOrigin='anonymous';
    img.onload=()=>{
      if(dead)return;
      try{
        const w=Math.min(4096,img.naturalWidth),h=Math.round(w*img.naturalHeight/img.naturalWidth);
        const c=document.createElement('canvas');c.width=w;c.height=h;
        const x=c.getContext('2d',{willReadFrequently:true})!;x.drawImage(img,0,0,w,h);
        setSrc({w,h,data:x.getImageData(0,0,w,h).data});
      }catch{setFailed(true);}
    };
    img.onerror=()=>{if(!dead)setFailed(true);};
    img.src=url;
    return ()=>{dead=true;};
  },[url]);
  return {src,failed};
}

export function FrameLoupe({hotspot,sceneUrl,onCorners,onAdjusting}:{
  hotspot:Hotspot;sceneUrl:string;onCorners:(corners:FrameSphericalCorners)=>void;onAdjusting?:(on:boolean)=>void;
}){
  const {src,failed}=useSource(sceneUrl);
  const canvas=useRef<HTMLCanvasElement>(null);
  const corners=useMemo(()=>frameWorldCorners(hotspot),[hotspot]);
  const [zoom,setZoom]=useState(1);
  const [active,setActive]=useState<FrameKey>('tl');
  const [guided,setGuided]=useState(false);
  const [snap,setSnap]=useState(true);
  const [fine,setFine]=useState(false);
  const [dragging,setDragging]=useState(false);
  const frozen=useRef<{yaw:number;pitch:number}|null>(null);
  const grad=useRef<Float32Array|null>(null);
  const cornersRef=useRef(corners);cornersRef.current=corners;

  // Centre de la frame (moyenne) et champ de vision « cadre entier ».
  const geo=useMemo(()=>{
    const ref=corners[0].yaw;
    const ys=corners.map(c=>nearYaw(c.yaw,ref)),ps=corners.map(c=>c.pitch);
    const cy=ys.reduce((a,b)=>a+b,0)/4,cp=ps.reduce((a,b)=>a+b,0)/4;
    const span=Math.max((Math.max(...ys)-Math.min(...ys))*Math.cos(cp),Math.max(...ps)-Math.min(...ps),0.02);
    return {cy,cp,fit:clamp(span*2.1,0.12,1.1)};
  },[corners]);
  const idx=ORDER.indexOf(active);
  const activePt=corners[FRAME_KEYS.indexOf(active)];
  // Zoom > 1 : on suit le coin actif ; zoom 1 : le cadre entier. Figé pendant un glissement pour ne pas bouger sous le doigt.
  const view=useMemo(()=>{
    if(frozen.current&&dragging)return frozen.current;
    return zoom>1?{yaw:nearYaw(activePt.yaw,geo.cy),pitch:activePt.pitch}:{yaw:geo.cy,pitch:geo.cp};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[zoom,active,geo,dragging,activePt.yaw,activePt.pitch]);
  const fov=clamp(geo.fit/(zoom>1?zoom*0.9:1),0.02,1.4);
  const b=useMemo(()=>basis(view.yaw,view.pitch,fov),[view,fov]);
  const viewRef=useRef(b);viewRef.current=b;

  // Rendu du fond : vrai panorama échantillonné (bilinéaire) à travers la même projection que la vue 3D.
  useEffect(()=>{
    const c=canvas.current;if(!c||!src)return;
    const ctx=c.getContext('2d')!;const out=ctx.createImageData(W,H);const o=out.data;
    const {w,h,data}=src;const g=new Float32Array(W*H);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const p=unproject(b,x,y);
      const u=((p.yaw/(2*Math.PI)+0.5)%1+1)%1*w-0.5,v=clamp((0.5-p.pitch/Math.PI)*h-0.5,0,h-1.001);
      const x0=Math.floor(u),y0=Math.floor(v),fx=u-x0,fy=v-y0;
      const xa=((x0%w)+w)%w,xb=(xa+1)%w,ya=y0,yb=Math.min(h-1,y0+1);
      const i=(y*W+x)*4;
      for(let k=0;k<3;k++){
        const a=data[(ya*w+xa)*4+k],bb=data[(ya*w+xb)*4+k],cc=data[(yb*w+xa)*4+k],d=data[(yb*w+xb)*4+k];
        o[i+k]=a*(1-fx)*(1-fy)+bb*fx*(1-fy)+cc*(1-fx)*fy+d*fx*fy;
      }
      o[i+3]=255;g[y*W+x]=0.299*o[i]+0.587*o[i+1]+0.114*o[i+2];
    }
    ctx.putImageData(out,0,0);
    // Gradient (Sobel simplifié) pour le magnétisme sur les bords.
    const mag=new Float32Array(W*H);
    for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
      const gx=g[y*W+x+1]-g[y*W+x-1]+0.5*(g[(y-1)*W+x+1]-g[(y-1)*W+x-1]+g[(y+1)*W+x+1]-g[(y+1)*W+x-1]);
      const gy=g[(y+1)*W+x]-g[(y-1)*W+x]+0.5*(g[(y+1)*W+x-1]-g[(y-1)*W+x-1]+g[(y+1)*W+x+1]-g[(y-1)*W+x+1]);
      mag[y*W+x]=Math.hypot(gx,gy);
    }
    grad.current=mag;
  },[src,b]);

  const setCorner=useCallback((key:FrameKey,px:number,py:number,useSnap:boolean)=>{
    let x=clamp(px,0,W),y=clamp(py,0,H);
    const m=grad.current;
    if(useSnap&&m){
      let best=0,bx=x,by=y;
      for(let dy=-7;dy<=7;dy++)for(let dx=-7;dx<=7;dx++){
        const xx=Math.round(x)+dx,yy=Math.round(y)+dy;
        if(xx<1||yy<1||xx>=W-1||yy>=H-1)continue;
        const score=m[yy*W+xx]-0.9*(dx*dx+dy*dy)/2;
        if(score>best){best=score;bx=xx;by=yy;}
      }
      // Seulement si un vrai bord est détecté : le calage reste léger, jamais brutal.
      if(best>38){x=x+(bx-x)*0.6;y=y+(by-y)*0.6;}
    }
    const p=unproject(viewRef.current,x,y);
    const next=cornersRef.current.map(c=>({...c})) as FrameSphericalCorners;
    next[FRAME_KEYS.indexOf(key)]={yaw:p.yaw,pitch:p.pitch};
    onCorners(next);
  },[onCorners]);

  const local=(e:{clientX:number;clientY:number;currentTarget:Element})=>{
    const r=(e.currentTarget as SVGSVGElement).getBoundingClientRect();
    return [(e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height] as const;
  };
  const pts=useMemo(()=>FRAME_KEYS.map(k=>project(b,corners[FRAME_KEYS.indexOf(k)].yaw,corners[FRAME_KEYS.indexOf(k)].pitch)),[b,corners]);

  function down(e:RPointerEvent<SVGSVGElement>){
    const [x,y]=local(e);
    let near:FrameKey|null=null,dist=22;
    FRAME_KEYS.forEach((k,i)=>{const p=pts[i];if(!p)return;const d=Math.hypot(p[0]-x,p[1]-y);if(d<dist){dist=d;near=k;}});
    const key=near??active;
    if(near){setActive(near);if(guided)setGuided(false);}
    e.currentTarget.setPointerCapture(e.pointerId);
    frozen.current={yaw:view.yaw,pitch:view.pitch};
    setDragging(true);onAdjusting?.(true);
    // Clic dans la zone : le coin actif vient se poser exactement là.
    if(!near)setCorner(key,x,y,snap);
  }
  function move(e:RPointerEvent<SVGSVGElement>){
    if(!dragging)return;
    const [x,y]=local(e);setCorner(active,x,y,snap);
  }
  function up(){frozen.current=null;setDragging(false);onAdjusting?.(false);}
  // Micro-ajustements : 1 px de loupe (ou 0,1 px) dans la direction demandée.
  function nudge(dx:number,dy:number){
    const p=pts[FRAME_KEYS.indexOf(active)];if(!p)return;
    const s=fine?0.1:1;
    onAdjusting?.(true);setCorner(active,p[0]+dx*s,p[1]+dy*s,false);
    window.setTimeout(()=>onAdjusting?.(false),500);
  }
  function key(e:RKeyboardEvent){
    const m:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
    const d=m[e.key];if(d){e.preventDefault();nudge(d[0]*(e.shiftKey?5:1),d[1]*(e.shiftKey?5:1));}
  }
  const goStep=(n:number)=>{const i=clamp(n,0,3);setActive(ORDER[i]);};
  const startGuided=()=>{setGuided(true);setActive('tl');setZoom(3);};

  if(failed)return <p className="nv-loupe-note">Impossible d’afficher la loupe pour ce panorama (image non lisible). Déplace les coins directement dans la vue 3D.</p>;
  const polygon=pts.every(Boolean)?pts.map(p=>p![0].toFixed(1)+','+p![1].toFixed(1)).join(' '):'';
  return <div className="nv-loupe" onKeyDown={key}>
    <div className="nv-loupe-head"><strong>Zoom de précision</strong>
      <span className="nv-loupe-zoom" role="group" aria-label="Niveau de zoom">{ZOOMS.map(z=><button key={z} type="button" className={zoom===z?'is-on':''} onClick={()=>setZoom(z)} aria-pressed={zoom===z}>×{z}</button>)}</span>
    </div>
    <div className="nv-loupe-stage" style={{aspectRatio:W+'/'+H}}>
      <canvas ref={canvas} width={W} height={H}/>
      {!src&&<div className="nv-loupe-wait">Chargement du panorama…</div>}
      <svg viewBox={`0 0 ${W} ${H}`} tabIndex={0} aria-label="Loupe : glisse un coin ou clique pour le poser" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <defs><pattern id="nv-loupe-grid" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" fill="none" stroke="#fff" strokeOpacity=".16" strokeWidth=".6"/></pattern></defs>
        {polygon&&<><polygon points={polygon} fill="url(#nv-loupe-grid)" stroke="#000" strokeOpacity=".6" strokeWidth="2.6"/>
          <polygon points={polygon} fill="none" stroke="#ffd98a" strokeWidth="1" strokeDasharray="5 4"/></>}
        {FRAME_KEYS.map((k,i)=>{const p=pts[i];if(!p)return null;const on=k===active;
          return <g key={k} opacity={on?1:.42}>
            <circle cx={p[0]} cy={p[1]} r={on?11:6} fill="none" stroke="#000" strokeOpacity=".55" strokeWidth={on?3.2:2.4}/>
            <circle cx={p[0]} cy={p[1]} r={on?11:6} fill="none" stroke={on?'#ffe9b0':'#fff'} strokeWidth={on?1.4:1}/>
            {on&&<path d={`M${p[0]-17} ${p[1]}H${p[0]-4}M${p[0]+4} ${p[1]}H${p[0]+17}M${p[0]} ${p[1]-17}V${p[1]-4}M${p[0]} ${p[1]+4}V${p[1]+17}`} stroke="#ffe9b0" strokeWidth=".9"/>}
          </g>;})}
      </svg>
    </div>
    <div className="nv-loupe-corners" role="group" aria-label="Coin à régler">{ORDER.map((k,i)=><button key={k} type="button" className={k===active?'is-on':''} onClick={()=>{setActive(k);}}>{i+1}</button>)}
      <span>Coin : <b>{LABEL[active]}</b></span></div>
    <div className="nv-loupe-nudge">
      <div className="nv-loupe-pad" aria-label="Micro-ajustement">
        <button type="button" onClick={()=>nudge(0,-1)} aria-label="Monter">↑</button>
        <button type="button" onClick={()=>nudge(-1,0)} aria-label="Gauche">←</button>
        <button type="button" onClick={()=>nudge(1,0)} aria-label="Droite">→</button>
        <button type="button" onClick={()=>nudge(0,1)} aria-label="Descendre">↓</button>
      </div>
      <div className="nv-loupe-opts">
        <label className="toggle-row"><input type="checkbox" checked={fine} onChange={e=>setFine(e.target.checked)}/> Pas fin (0,1 px)</label>
        <label className="toggle-row"><input type="checkbox" checked={snap} onChange={e=>setSnap(e.target.checked)}/> Magnétisme sur les bords</label>
      </div>
    </div>
    {guided?<div className="nv-loupe-guide" role="status">
      <span>Étape {idx+1}/4 · place le coin <b>{LABEL[active]}</b></span>
      <button type="button" disabled={idx===0} onClick={()=>goStep(idx-1)}>← Précédent</button>
      {idx<3?<button type="button" className="is-primary" onClick={()=>goStep(idx+1)}>Suivant →</button>:<button type="button" className="is-primary" onClick={()=>{setGuided(false);setZoom(1);}}>✓ Terminer</button>}
    </div>:<button type="button" className="nv-loupe-start" onClick={startGuided}>Ajuster coin par coin</button>}
    <small className="nv-loupe-note">Clique dans la loupe pour poser le coin actif, ou glisse-le. Flèches du clavier = micro-réglage (Maj = ×5).</small>
  </div>;
}
