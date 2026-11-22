import type {FloorPlan,FloorPlanPoint} from './storage';

/** Détection de la pièce sous un repère de panorama, pour la mettre en surbrillance sur le plan.
 *  Principe : à partir du repère, on « remplit » la zone de même couleur jusqu'aux murs foncés. Heuristique pensée pour les plans
 *  aux pièces colorées et aux murs sombres ; si la zone fuit (portes ouvertes, plan noir et blanc) on ne met rien en surbrillance. */
const MAX_SIDE=900;
const WALL_LUMA=90;
const COLOR_TOLERANCE=55;
const MAX_AREA=0.3;
const MIN_AREA=60;
const luma=(d:Uint8ClampedArray,i:number)=>0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
const close=(d:Uint8ClampedArray,i:number,j:number,tol:number)=>Math.abs(d[i]-d[j])+Math.abs(d[i+1]-d[j+1])+Math.abs(d[i+2]-d[j+2])<=tol;

/** Cherche, autour du repère, un pixel de « sol » (ni mur, ni texte) dans une zone unie. */
function findFloorSeed(d:Uint8ClampedArray,w:number,h:number,sx:number,sy:number):number{
  const flat=(x:number,y:number)=>{
    if(x<2||y<2||x>=w-2||y>=h-2)return false;
    const i=(y*w+x)*4;if(luma(d,i)<WALL_LUMA)return false;
    for(const [dx,dy] of [[-2,-2],[2,-2],[-2,2],[2,2],[0,-2],[0,2],[-2,0],[2,0]]){if(!close(d,i,((y+dy)*w+x+dx)*4,14))return false;}
    return true;
  };
  const R=Math.round(Math.max(w,h)*0.05);
  for(let r=0;r<=R;r++){
    for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
      if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
      const x=sx+dx,y=sy+dy;if(flat(x,y))return (y*w+x)*4;
    }
  }
  return -1;
}

/** Masque (1 = dans la pièce) de la pièce sous le point (sx,sy) en pixels, ou null si la zone n'est pas fiable. */
export function floodRoom(d:Uint8ClampedArray,w:number,h:number,sx:number,sy:number):Uint8Array|null{
  const seed=findFloorSeed(d,w,h,Math.round(sx),Math.round(sy));
  if(seed<0)return null;
  const mask=new Uint8Array(w*h);
  const stack=new Int32Array(w*h);let sp=0,count=0;
  const start=seed/4;mask[start]=1;stack[sp++]=start;
  const limit=w*h*MAX_AREA;
  while(sp){
    const p=stack[--sp];count++;if(count>limit)return null;
    const x=p%w,y=(p-x)/w;
    const tryPush=(q:number)=>{if(mask[q])return;const i=q*4;if(luma(d,i)<WALL_LUMA||!close(d,i,seed,COLOR_TOLERANCE))return;mask[q]=1;stack[sp++]=q;};
    if(x>0)tryPush(p-1);if(x<w-1)tryPush(p+1);if(y>0)tryPush(p-w);if(y<h-1)tryPush(p+w);
  }
  if(count<MIN_AREA)return null;
  return closeMask(mask,w,h,4);
}

/** Fermeture morphologique : bouche les trous laissés par les textes (nom de la pièce, m²) à l'intérieur de la zone. */
export function closeMask(src:Uint8Array,w:number,h:number,r:number):Uint8Array{
  const pass=(input:Uint8Array,horizontal:boolean,dilate:boolean)=>{
    const out=new Uint8Array(w*h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      let v=dilate?0:1;
      for(let k=-r;k<=r;k++){
        const xx=horizontal?x+k:x,yy=horizontal?y:y+k;
        const b=xx<0||yy<0||xx>=w||yy>=h?0:input[yy*w+xx];
        if(dilate){if(b){v=1;break;}}else if(!b){v=0;break;}
      }
      out[y*w+x]=v;
    }
    return out;
  };
  return pass(pass(pass(pass(src,true,true),false,true),true,false),false,false);
}

const decoded=new Map<string,Promise<{d:Uint8ClampedArray;w:number;h:number}|null>>();
function decodePlan(url:string){
  const key=url.length+':'+url.slice(-48);
  let p=decoded.get(key);
  if(!p){
    p=new Promise(resolve=>{
      const img=new Image();
      img.onload=()=>{
        try{
          const k=Math.min(1,MAX_SIDE/Math.max(img.naturalWidth,img.naturalHeight));
          const w=Math.max(1,Math.round(img.naturalWidth*k)),h=Math.max(1,Math.round(img.naturalHeight*k));
          const c=document.createElement('canvas');c.width=w;c.height=h;
          const x=c.getContext('2d',{willReadFrequently:true})!;x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(img,0,0,w,h);
          resolve({d:x.getImageData(0,0,w,h).data,w,h});
        }catch{resolve(null);}
      };
      img.onerror=()=>resolve(null);img.src=url;
    });
    decoded.set(key,p);
  }
  return p;
}

const maskCache=new Map<string,HTMLCanvasElement|null>();
const yieldToUi=()=>new Promise<void>(r=>setTimeout(r,0));

/** Une zone colorée (canvas RGBA, couleur du thème, translucide) par panorama placé sur le plan ; absente si la pièce n'est pas détectable. */
export async function roomHighlights(plan:FloorPlan,points:FloorPlanPoint[],color='#f5b324'):Promise<Record<string,HTMLCanvasElement>>{
  const out:Record<string,HTMLCanvasElement>={};
  if(typeof document==='undefined'||!plan.imageDataUrl)return out;
  const img=await decodePlan(plan.imageDataUrl);
  if(!img)return out;
  const base=plan.imageDataUrl.length+':'+plan.imageDataUrl.slice(-48)+'|'+color+'|';
  for(const point of points){
    const key=base+point.x.toFixed(1)+','+point.y.toFixed(1);
    if(!maskCache.has(key)){
      await yieldToUi();
      const m=floodRoom(img.d,img.w,img.h,point.x/100*(img.w-1),point.y/100*(img.h-1));
      let canvas:HTMLCanvasElement|null=null;
      if(m){
        canvas=document.createElement('canvas');canvas.width=img.w;canvas.height=img.h;
        const ctx=canvas.getContext('2d')!;const id=ctx.createImageData(img.w,img.h);
        const r=parseInt(color.slice(1,3),16),g=parseInt(color.slice(3,5),16),b=parseInt(color.slice(5,7),16);
        for(let i=0;i<m.length;i++)if(m[i]){id.data[i*4]=r;id.data[i*4+1]=g;id.data[i*4+2]=b;id.data[i*4+3]=115;}
        ctx.putImageData(id,0,0);
      }
      maskCache.set(key,canvas);
    }
    const hit=maskCache.get(key);if(hit)out[point.sceneId]=hit;
  }
  return out;
}
