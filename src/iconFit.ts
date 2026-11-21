/** Mesure les marges transparentes d'une icône PNG et renvoie le zoom (en %) qui la fait remplir son bouton comme les autres icônes. */
export function autoIconZoom(dataUrl:string):Promise<number>{
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>{
      try{
        const N=160,c=document.createElement('canvas');c.width=c.height=N;
        const x=c.getContext('2d',{willReadFrequently:true})!;
        const s=Math.min(N/img.naturalWidth,N/img.naturalHeight);
        x.drawImage(img,(N-img.naturalWidth*s)/2,(N-img.naturalHeight*s)/2,img.naturalWidth*s,img.naturalHeight*s);
        const d=x.getImageData(0,0,N,N).data;
        let x0=N,y0=N,x1=-1,y1=-1;
        for(let yy=0;yy<N;yy++)for(let xx=0;xx<N;xx++)if(d[(yy*N+xx)*4+3]>40){if(xx<x0)x0=xx;if(xx>x1)x1=xx;if(yy<y0)y0=yy;if(yy>y1)y1=yy;}
        if(x1<0){resolve(100);return;}
        const fill=Math.max((x1-x0+1)/N,(y1-y0+1)/N);
        resolve(Math.max(100,Math.min(250,Math.round(97/fill/5)*5)));
      }catch{resolve(100);}
    };
    img.onerror=()=>resolve(100);
    img.src=dataUrl;
  });
}

/* ——— Rognage automatique des marges transparentes : toutes les icônes d'une barre remplissent leur bouton de la même façon ——— */
const trimCache=new Map<string,Promise<string>>();
/** Renvoie l'icône recadrée sur son contenu visible (carré centré). Si elle remplit déjà son cadre, elle est renvoyée telle quelle. */
export function trimIcon(dataUrl:string,fitCircle=false):Promise<string>{
  const cacheKey=fitCircle?'circle:'+dataUrl:dataUrl;
  let p=trimCache.get(cacheKey);
  if(p)return p;
  p=new Promise<string>(resolve=>{
    const img=new Image();
    img.onload=()=>{
      try{
        const scale=Math.min(1,512/Math.max(img.naturalWidth,img.naturalHeight));
        const W=Math.max(1,Math.round(img.naturalWidth*scale)),H=Math.max(1,Math.round(img.naturalHeight*scale));
        const c=document.createElement('canvas');c.width=W;c.height=H;
        const x=c.getContext('2d',{willReadFrequently:true})!;x.drawImage(img,0,0,W,H);
        const d=x.getImageData(0,0,W,H).data;
        let x0=W,y0=H,x1=-1,y1=-1;
        for(let yy=0;yy<H;yy++)for(let xx=0;xx<W;xx++)if(d[(yy*W+xx)*4+3]>24){if(xx<x0)x0=xx;if(xx>x1)x1=xx;if(yy<y0)y0=yy;if(yy>y1)y1=yy;}
        if(x1<0){resolve(dataUrl);return;}
        const bw=x1-x0+1,bh=y1-y0+1;
        let side=Math.max(bw,bh);
        if(fitCircle){
          const cx=x0+bw/2,cy=y0+bh/2;
          let radiusSquared=0;
          for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++){
            if(d[(yy*W+xx)*4+3]>24){
              radiusSquared=Math.max(radiusSquared,(xx+.5-cx)**2+(yy+.5-cy)**2);
            }
          }
          side=Math.max(side,Math.ceil(2*(Math.sqrt(radiusSquared)+1)/.96));
        }
        // Déjà bien rempli (≥ 96 % dans les deux sens) : on ne touche à rien.
        if(!fitCircle&&bw/W>=0.96&&bh/H>=0.96){resolve(dataUrl);return;}
        const o=document.createElement('canvas');o.width=o.height=side;
        o.getContext('2d')!.drawImage(c,x0,y0,bw,bh,(side-bw)/2,(side-bh)/2,bw,bh);
        resolve(o.toDataURL('image/png'));
      }catch{resolve(dataUrl);}
    };
    img.onerror=()=>resolve(dataUrl);
    img.src=dataUrl;
  });
  trimCache.set(cacheKey,p);
  if(trimCache.size>150){const first=trimCache.keys().next().value;if(first)trimCache.delete(first);}
  return p;
}
