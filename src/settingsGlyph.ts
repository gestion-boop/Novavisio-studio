/** Icône « Paramètres » par défaut (roue crantée), en 3 états, générée en PNG pour être mise dans la bibliothèque et remplaçable ensuite. */
export function settingsGlyphs():{normal:string;hover:string;pressed:string}{
  const draw=(bg:string,ring:string,gear:string,scale:number)=>{
    const c=document.createElement('canvas');c.width=c.height=128;
    const x=c.getContext('2d')!;
    x.translate(64,64);
    x.beginPath();x.arc(0,0,60,0,Math.PI*2);x.fillStyle=bg;x.fill();x.lineWidth=4;x.strokeStyle=ring;x.stroke();
    x.scale(scale,scale);
    x.beginPath();
    const teeth=8,inner=26,outer=36;
    for(let i=0;i<teeth*2;i++){
      const a0=(i/(teeth*2))*Math.PI*2,a1=((i+1)/(teeth*2))*Math.PI*2;
      const r=i%2===0?outer:inner;
      x.lineTo(Math.cos(a0+0.09)*r,Math.sin(a0+0.09)*r);
      x.lineTo(Math.cos(a1-0.09)*r,Math.sin(a1-0.09)*r);
    }
    x.closePath();x.fillStyle=gear;x.fill();
    x.globalCompositeOperation='destination-out';
    x.beginPath();x.arc(0,0,12,0,Math.PI*2);x.fill();
    return c.toDataURL('image/png');
  };
  return {
    normal:draw('rgba(11,24,38,0.85)','rgba(255,255,255,0.55)','#ffffff',1),
    hover:draw('rgba(31,138,168,0.95)','#bff0ff','#ffffff',1.06),
    pressed:draw('rgba(8,18,28,0.95)','rgba(255,255,255,0.4)','#d6e6ea',0.92)
  };
}
