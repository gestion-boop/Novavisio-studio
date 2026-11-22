import {CanvasTexture,LinearFilter,SRGBColorSpace} from 'three';

/** Icônes vectorielles dédiées au casque : même tracé dans les trois états. */
export type VrControlIcon='gallery'|'up'|'down'|'home'|'sound'|'mute'|'plan'|'help'|'exit'|'info'|'link'|'photos';
export type VrControlState='normal'|'hover'|'pressed';

const path=(ctx:CanvasRenderingContext2D,points:readonly [number,number][],closed=false)=>{
  ctx.beginPath();
  points.forEach(([x,y],i)=>i===0?ctx.moveTo(x,y):ctx.lineTo(x,y));
  if(closed)ctx.closePath();
  ctx.stroke();
};
function drawIcon(c:CanvasRenderingContext2D,kind:VrControlIcon){
  c.save();
  c.translate(160,160);
  c.scale(2.12,2.12);
  c.lineWidth=5.4;
  c.lineCap='round';
  c.lineJoin='round';
  switch(kind){
    case 'gallery':
      c.strokeRect(-38,-29,76,58);
      c.beginPath();c.arc(20,-12,7,0,Math.PI*2);c.stroke();
      path(c,[[-33,23],[-9,0],[6,13],[18,3],[34,23]]);
      break;
    case 'plan':
      path(c,[[-40,-30],[-15,-38],[13,-28],[40,-37],[40,29],[13,38],[-15,28],[-40,37]],true);
      path(c,[[-15,-38],[-15,28]]);
      path(c,[[13,-28],[13,38]]);
      break;
    case 'up':
    case 'down':
      path(c,kind==='up'?[[-30,16],[0,-16],[30,16]]:[[-30,-16],[0,16],[30,-16]]);
      break;
    case 'home':
      path(c,[[-40,-3],[0,-36],[40,-3]]);
      path(c,[[-29,-10],[-29,33],[-9,33],[-9,6],[9,6],[9,33],[29,33],[29,-10]]);
      break;
    case 'sound':
    case 'mute':
      path(c,[[-40,-17],[-20,-17],[0,-34],[0,34],[-20,17],[-40,17]],true);
      if(kind==='sound'){
        c.beginPath();c.arc(0,0,25,-Math.PI/3,Math.PI/3);c.stroke();
        c.beginPath();c.arc(0,0,41,-Math.PI/3,Math.PI/3);c.stroke();
      }else path(c,[[16,-22],[42,24]]);
      break;
    case 'help':
      c.beginPath();c.arc(0,0,39,0,Math.PI*2);c.stroke();
      c.font='bold 61px system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('?',0,4);
      break;
    case 'exit':
      path(c,[[-30,-30],[30,30]]);
      path(c,[[30,-30],[-30,30]]);
      break;
    case 'info':
      c.beginPath();c.arc(0,0,39,0,Math.PI*2);c.stroke();
      path(c,[[0,-4],[0,22]]);
      c.beginPath();c.arc(0,-20,3.5,0,Math.PI*2);c.fill();
      break;
    case 'link':
      // Flèche qui sort d'un cadre : ouvre un site.
      path(c,[[-34,-6],[-34,32],[4,32]]);
      path(c,[[-34,-6],[-8,-6]]);
      path(c,[[8,-30],[36,-30],[36,-2]]);
      path(c,[[36,-30],[-6,12]]);
      break;
    case 'photos':
      c.strokeRect(-38,-24,62,46);
      c.strokeRect(-24,-36,62,46);
      c.beginPath();c.arc(14,-14,6,0,Math.PI*2);c.stroke();
      break;
  }
  c.restore();
}

const mixHex=(a:string,b:string,k:number)=>{
  const ch=(h:string)=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
  const [x,y]=[ch(a),ch(b)];
  return '#'+x.map((v,i)=>Math.round(v+(y[i]-v)*k).toString(16).padStart(2,'0')).join('');
};
/** Couleurs optionnelles (thème de la barre) : disque = bouton, pictogramme et bord = icône. Sans elles : jaune actuel. */
export type VrControlColors={button:string;icon:string};
const HEX6=/^#[0-9a-f]{6}$/i;
export function makeVrControlTexture(icon:VrControlIcon,state:VrControlState,colors?:VrControlColors):CanvasTexture{
  const canvas=document.createElement('canvas');
  canvas.width=320;canvas.height=320;
  const c=canvas.getContext('2d');
  if(!c)throw new Error('Canvas 2D indisponible');
  const themed=!!colors&&HEX6.test(colors.button)&&HEX6.test(colors.icon);
  const color=themed?(state==='pressed'?mixHex(colors!.icon,'#ffffff',.65):state==='hover'?mixHex(colors!.icon,'#ffffff',.35):colors!.icon)
    :state==='pressed'?'#fff4c7':state==='hover'?'#ffe19b':'#f3bb37';
  const bg=themed?(state==='pressed'?mixHex(colors!.button,colors!.icon,.5):state==='hover'?mixHex(colors!.button,colors!.icon,.28):colors!.button)
    :state==='pressed'?'#68471d':state==='hover'?'#393027':'#1d1e22';
  c.save();
  c.beginPath();c.arc(160,160,144,0,Math.PI*2);
  c.fillStyle=bg;c.fill();
  c.strokeStyle=color;c.lineWidth=state==='normal'?8:11;
  c.shadowColor=state==='normal'?'transparent':themed?colors!.icon:'#ffc33d';
  c.shadowBlur=state==='pressed'?25:state==='hover'?17:0;
  c.stroke();
  c.restore();
  c.strokeStyle=color;c.fillStyle=color;
  drawIcon(c,icon);
  const texture=new CanvasTexture(canvas);
  texture.colorSpace=SRGBColorSpace;
  texture.minFilter=LinearFilter;
  return texture;
}
