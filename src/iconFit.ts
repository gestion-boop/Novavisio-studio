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
