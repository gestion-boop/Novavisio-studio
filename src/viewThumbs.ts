/**
 * Vignettes « vue » des panoramas : au lieu de l'image 360° aplatie (déformée), on calcule la vue
 * que verrait le visiteur à l'arrivée (projection en perspective, champ de 92°). Définition élevée (640×400).
 */
export type ViewSource={dataUrl:string;yaw?:number;pitch?:number};
const OUT_W=640,OUT_H=400,SRC_W=2560,SRC_H=1280,FOV=92*Math.PI/180;
const cache=new Map<string,string>();

export async function renderViewThumb(src:ViewSource):Promise<string>{
  const key=src.dataUrl.length+':'+src.dataUrl.slice(-48)+':'+(src.yaw??0).toFixed(2)+':'+(src.pitch??0).toFixed(2);
  const hit=cache.get(key);if(hit)return hit;
  const blob=await (await fetch(src.dataUrl)).blob();
  let bitmap:ImageBitmap;
  try{bitmap=await createImageBitmap(blob,{resizeWidth:SRC_W,resizeHeight:SRC_H,resizeQuality:'high'});}
  catch{bitmap=await createImageBitmap(blob);}
  try{
    const sw=Math.min(bitmap.width,SRC_W),sh=Math.min(bitmap.height,SRC_H);
    const sc=document.createElement('canvas');sc.width=sw;sc.height=sh;
    const sctx=sc.getContext('2d',{willReadFrequently:true});if(!sctx)throw new Error('canvas');
    sctx.drawImage(bitmap,0,0,sw,sh);
    const sdata=sctx.getImageData(0,0,sw,sh).data;
    const out=document.createElement('canvas');out.width=OUT_W;out.height=OUT_H;
    const octx=out.getContext('2d');if(!octx)throw new Error('canvas');
    const img=octx.createImageData(OUT_W,OUT_H),od=img.data;
    const yaw=src.yaw??0,pitch=Math.max(-0.6,Math.min(0.6,src.pitch??0));
    const tanH=Math.tan(FOV/2),tanV=tanH*OUT_H/OUT_W;
    const cp=Math.cos(pitch),sp=Math.sin(pitch);
    for(let j=0;j<OUT_H;j++){
      const y=(1-2*(j+.5)/OUT_H)*tanV;
      for(let i=0;i<OUT_W;i++){
        const x=(2*(i+.5)/OUT_W-1)*tanH;
        const y1=y*cp+sp,z1=-y*sp+cp;
        const lon=Math.atan2(x,z1)+yaw,lat=Math.atan2(y1,Math.hypot(x,z1));
        let u=(lon/(2*Math.PI)+.5)%1;if(u<0)u+=1;
        const v=.5-lat/Math.PI;
        const fx=u*sw-.5,fy=Math.max(0,Math.min(sh-1.001,v*sh-.5));
        const x0=Math.floor(fx),y0=Math.floor(fy),tx=fx-x0,ty=fy-y0;
        const xa=((x0%sw)+sw)%sw,xb=(xa+1)%sw;
        const p00=(y0*sw+xa)*4,p10=(y0*sw+xb)*4,p01=((y0+1)*sw+xa)*4,p11=((y0+1)*sw+xb)*4,o=(j*OUT_W+i)*4;
        for(let c=0;c<3;c++)od[o+c]=(sdata[p00+c]*(1-tx)+sdata[p10+c]*tx)*(1-ty)+(sdata[p01+c]*(1-tx)+sdata[p11+c]*tx)*ty;
        od[o+3]=255;
      }
    }
    octx.putImageData(img,0,0);
    const url=out.toDataURL('image/jpeg',0.86);
    cache.set(key,url);
    return url;
  }finally{bitmap.close();}
}
