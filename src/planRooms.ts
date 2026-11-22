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

/** Distance de chaque pixel au mur le plus proche (chamfer 3-4, unité ≈ 1/3 de pixel). Les bords de l'image comptent comme des murs. */
function wallDistance(d:Uint8ClampedArray,w:number,h:number):Uint16Array{
  const INF=60000,dist=new Uint16Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=y*w+x;dist[p]=(x===0||y===0||x===w-1||y===h-1||luma(d,p*4)<WALL_LUMA)?0:INF;}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const p=y*w+x;let v=dist[p];if(!v)continue;
    if(x>0)v=Math.min(v,dist[p-1]+3);
    if(y>0){v=Math.min(v,dist[p-w]+3);if(x>0)v=Math.min(v,dist[p-w-1]+4);if(x<w-1)v=Math.min(v,dist[p-w+1]+4);}
    dist[p]=v;
  }
  for(let y=h-1;y>=0;y--)for(let x=w-1;x>=0;x--){
    const p=y*w+x;let v=dist[p];if(!v)continue;
    if(x<w-1)v=Math.min(v,dist[p+1]+3);
    if(y<h-1){v=Math.min(v,dist[p+w]+3);if(x<w-1)v=Math.min(v,dist[p+w+1]+4);if(x>0)v=Math.min(v,dist[p+w-1]+4);}
    dist[p]=v;
  }
  return dist;
}

/** Plusieurs pièces à la fois : « bassins versants » à partir des repères, sur la distance aux murs.
 *  Chaque pièce se remplit depuis son repère ; deux pièces reliées par une porte se rejoignent à l'endroit le plus étroit (la porte),
 *  au lieu que l'une déborde sur l'autre. Une pièce ne prend que des pixels de la couleur de son sol. */
export function floodRooms(d:Uint8ClampedArray,w:number,h:number,seeds:{id:string;x:number;y:number}[]):Record<string,Uint8Array|null>{
  const result:Record<string,Uint8Array|null>={};
  const dist=wallDistance(d,w,h);
  const label=new Int16Array(w*h); // 0 = libre, n = index de repère + 1
  const starts:{id:string;seed:number}[]=[];
  seeds.forEach(sd=>{
    const i=findFloorSeed(d,w,h,Math.round(sd.x),Math.round(sd.y));
    result[sd.id]=null;
    if(i>=0)starts.push({id:sd.id,seed:i});
  });
  const maxLevel=dist.reduce((m,v)=>v>m?v:m,0);
  const buckets:number[][]=Array.from({length:maxLevel+1},()=>[]);
  let cur=0;
  starts.forEach((st,n)=>{const p=st.seed/4;if(label[p])return;label[p]=n+1;buckets[dist[p]].push(p);if(dist[p]>cur)cur=dist[p];});
  const counts=new Int32Array(starts.length+1);
  const limit=w*h*MAX_AREA;
  while(cur>=0){
    const b=buckets[cur];
    if(!b.length){cur--;continue;}
    const p=b.pop()!;
    const n=label[p];const seedI=starts[n-1].seed;
    const x=p%w,y=(p-x)/w;
    const visit=(q:number)=>{
      if(label[q]||dist[q]===0)return;
      if(!close(d,q*4,seedI,COLOR_TOLERANCE))return;
      label[q]=n;counts[n]++;
      buckets[dist[q]].push(q);if(dist[q]>cur)cur=dist[q];
    };
    if(x>0)visit(p-1);if(x<w-1)visit(p+1);if(y>0)visit(p-w);if(y<h-1)visit(p+w);
  }
  starts.forEach((st,i)=>{
    const n=i+1;
    if(counts[n]<MIN_AREA||counts[n]>limit)return; // trop petite ou fuite vers l'extérieur : on ne montre rien
    // Fermeture limitée au rectangle de la pièce (beaucoup plus rapide dans le casque).
    let x0=w,y0=h,x1=-1,y1=-1;
    for(let p=0;p<label.length;p++)if(label[p]===n){const x=p%w,y=(p-x)/w;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
    const pad=6;x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);x1=Math.min(w-1,x1+pad);y1=Math.min(h-1,y1+pad);
    const bw=x1-x0+1,bh=y1-y0+1;
    const small=new Uint8Array(bw*bh);
    for(let y=0;y<bh;y++)for(let x=0;x<bw;x++)if(label[(y+y0)*w+x+x0]===n)small[y*bw+x]=1;
    const closedSmall=closeMask(small,bw,bh,4);
    const closed=new Uint8Array(w*h);
    for(let y=0;y<bh;y++)for(let x=0;x<bw;x++){
      if(!closedSmall[y*bw+x])continue;
      const p=(y+y0)*w+x+x0;
      if(label[p]===0||label[p]===n)closed[p]=1; // ne mord pas sur la voisine
    }
    result[st.id]=closed;
  });
  return result;
}

/** Une seule pièce (sans voisines à départager). */
export function floodRoom(d:Uint8ClampedArray,w:number,h:number,sx:number,sy:number):Uint8Array|null{
  return floodRooms(d,w,h,[{id:'_',x:sx,y:sy}])['_']??null;
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

const maskCache=new Map<string,Record<string,HTMLCanvasElement>>();
const yieldToUi=()=>new Promise<void>(r=>setTimeout(r,0));

/** Une zone colorée (canvas RGBA, couleur du thème, translucide) par panorama placé sur le plan ; absente si la pièce n'est pas détectable. */
export async function roomHighlights(plan:FloorPlan,points:FloorPlanPoint[],color='#f5b324'):Promise<Record<string,HTMLCanvasElement>>{
  if(typeof document==='undefined'||!plan.imageDataUrl||!points.length)return {};
  const key=plan.imageDataUrl.length+':'+plan.imageDataUrl.slice(-48)+'|'+color+'|'+points.map(p=>p.sceneId+'@'+p.x.toFixed(1)+','+p.y.toFixed(1)).join(';');
  const cached=maskCache.get(key);if(cached)return cached;
  const img=await decodePlan(plan.imageDataUrl);
  if(!img)return {};
  await yieldToUi();
  const masks=floodRooms(img.d,img.w,img.h,points.map(p=>({id:p.sceneId,x:p.x/100*(img.w-1),y:p.y/100*(img.h-1)})));
  const r=parseInt(color.slice(1,3),16),g=parseInt(color.slice(3,5),16),b=parseInt(color.slice(5,7),16);
  const out:Record<string,HTMLCanvasElement>={};
  for(const [id,m] of Object.entries(masks)){
    if(!m)continue;
    const canvas=document.createElement('canvas');canvas.width=img.w;canvas.height=img.h;
    const ctx=canvas.getContext('2d')!;const data=ctx.createImageData(img.w,img.h);
    for(let i=0;i<m.length;i++)if(m[i]){data.data[i*4]=r;data.data[i*4+1]=g;data.data[i*4+2]=b;data.data[i*4+3]=115;}
    ctx.putImageData(data,0,0);out[id]=canvas;
  }
  if(maskCache.size>24)maskCache.clear();
  maskCache.set(key,out);
  return out;
}
