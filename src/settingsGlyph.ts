/** Pack Paramètres métallique 3D : trois PNG carrés haute définition, avec extérieur transparent. */
export function settingsGlyphs():{normal:string;hover:string;pressed:string}{
  const SIZE=1024;
  const render=(state:'normal'|'hover'|'pressed'):string=>{
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=SIZE;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw Error('Canvas indisponible : impossible de créer le pack Paramètres.');
    ctx.translate(SIZE/2,SIZE/2);
    const hover=state==='hover',pressed=state==='pressed';
    const radius=405;
    // Lumière douce, conservée entièrement dans l'image transparente.
    if(hover){
      const glow=ctx.createRadialGradient(0,0,370,0,0,498);
      glow.addColorStop(0,'rgba(250,213,151,.43)');
      glow.addColorStop(1,'rgba(250,213,151,0)');
      ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,497,0,Math.PI*2);ctx.fill();
    }
    // Ombre portée douce : pas de découpe du contour circulaire.
    const shadow=ctx.createRadialGradient(12,28,312,12,28,460);
    shadow.addColorStop(0,'rgba(23,15,9,.29)');
    shadow.addColorStop(1,'rgba(23,15,9,0)');
    ctx.fillStyle=shadow;ctx.beginPath();ctx.arc(12,28,460,0,Math.PI*2);ctx.fill();
    const edge=ctx.createLinearGradient(-360,-400,350,420);
    edge.addColorStop(0,hover?'#fff3d4':'#f5dcaa');
    edge.addColorStop(.3,hover?'#ddba7f':'#c79c5a');
    edge.addColorStop(.72,pressed?'#674822':'#805f35');
    edge.addColorStop(1,hover?'#f3dca4':'#b48a4d');
    ctx.fillStyle=edge;ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fill();
    const bevel=ctx.createLinearGradient(-240,-360,230,390);
    bevel.addColorStop(0,'#634825');bevel.addColorStop(.18,hover?'#fae6b7':'#d8b77e');
    bevel.addColorStop(.6,'#9c7643');bevel.addColorStop(1,'#4e381d');
    ctx.fillStyle=bevel;ctx.beginPath();ctx.arc(0,0,382,0,Math.PI*2);ctx.fill();
    const face=ctx.createLinearGradient(-220,-355,255,355);
    if(pressed){
      face.addColorStop(0,'#977044');face.addColorStop(.55,'#74532e');face.addColorStop(1,'#48321d');
    }else if(hover){
      face.addColorStop(0,'#f1d8a8');face.addColorStop(.43,'#d4aa70');face.addColorStop(1,'#926633');
    }else{
      face.addColorStop(0,'#dfc08c');face.addColorStop(.5,'#b08b56');face.addColorStop(1,'#71542d');
    }
    ctx.fillStyle=face;ctx.beginPath();ctx.arc(0,0,360,0,Math.PI*2);ctx.fill();
    // Reflet en bande courbe, volontairement très léger pour l'effet 3D.
    ctx.save();ctx.beginPath();ctx.arc(0,0,357,0,Math.PI*2);ctx.clip();
    const sheen=ctx.createLinearGradient(0,-345,0,90);
    sheen.addColorStop(0,hover?'rgba(255,255,255,.53)':'rgba(255,255,255,.36)');
    sheen.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=sheen;ctx.beginPath();ctx.ellipse(-90,-195,420,155,-.28,0,Math.PI*2);ctx.fill();
    ctx.restore();
    // Roue crantée blanche, ombre sous la roue pour la lisibilité en VR.
    ctx.save();
    ctx.translate(0,pressed?13:0);ctx.scale(pressed?.94:hover?1.065:1,pressed?.94:hover?1.065:1);
    const gearPath=new Path2D();
    const count=12;
    for(let i=0;i<count*4;i++){
      const a=-Math.PI/2+i*Math.PI*2/(count*4);
      const phase=i%4;
      const r=phase===0||phase===3?188:phase===1?233:233;
      const x=Math.cos(a)*r,y=Math.sin(a)*r;
      if(i===0)gearPath.moveTo(x,y);else gearPath.lineTo(x,y);
    }
    gearPath.closePath();
    // Even-odd fill draws a hole in the wheel rather than erasing the bronze button.
    gearPath.moveTo(91,0);
    gearPath.arc(0,0,91,0,Math.PI*2);
    ctx.shadowColor='rgba(34,23,13,.34)';ctx.shadowBlur=18;ctx.shadowOffsetY=12;
    ctx.fillStyle=pressed?'#f1e1c9':'#ffffff';
    ctx.fill(gearPath,'evenodd');
    ctx.shadowColor='transparent';
    ctx.strokeStyle=hover?'#fff8e9':'#eee7db';
    ctx.lineWidth=4;ctx.stroke(gearPath);
    ctx.restore();
    // Anneau de contour net : même diamètre dans tous les états.
    ctx.beginPath();ctx.arc(0,0,402,0,Math.PI*2);ctx.strokeStyle=hover?'#fae4af':'#d2a56d';ctx.lineWidth=8;ctx.stroke();
    return canvas.toDataURL('image/png');
  };
  return {normal:render('normal'),hover:render('hover'),pressed:render('pressed')};
}
