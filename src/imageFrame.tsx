import {useState, type PointerEvent} from 'react';
import {defaultFrameCorners, type FrameCorners} from './storage';

export type CornerKey = keyof FrameCorners;
const keys:CornerKey[]=['tl','tr','br','bl'];
const titles:Record<CornerKey,string>={tl:'Haut gauche',tr:'Haut droit',br:'Bas droit',bl:'Bas gauche'};

// Calcule la transformation projective exacte d'un rectangle vers quatre coins.
// Le CSS matrix3d donne une perspective (et non un simple rognage polygonal).
export function perspectiveMatrix(corners:FrameCorners,width:number,height:number):string {
  const src:[[number,number],[number,number],[number,number],[number,number]]=[
    [0,0],[width,0],[width,height],[0,height]
  ];
  const dst=keys.map(k=>[width*corners[k].x/100,height*corners[k].y/100]);
  const rows:number[][]=[];
  for(let i=0;i<4;i++) {
    const [x,y]=src[i];
    const [u,v]=dst[i];
    rows.push([x,y,1,0,0,0,-x*u,-y*u,u]);
    rows.push([0,0,0,x,y,1,-x*v,-y*v,v]);
  }
  for(let col=0;col<8;col++) {
    let pivot=col;
    for(let row=col+1;row<8;row++) if(Math.abs(rows[row][col])>Math.abs(rows[pivot][col])) pivot=row;
    if(Math.abs(rows[pivot][col])<1e-9) return 'none';
    [rows[col],rows[pivot]]=[rows[pivot],rows[col]];
    const div=rows[col][col];
    for(let k=col;k<=8;k++)rows[col][k]/=div;
    for(let row=0;row<8;row++) {
      if(row===col)continue;
      const ratio=rows[row][col];
      for(let k=col;k<=8;k++)rows[row][k]-=ratio*rows[col][k];
    }
  }
  const [a,b,c,d,e,f,g,h]=rows.map(row=>row[8]);
  return 'matrix3d('+[a,d,0,g,b,e,0,h,0,0,1,0,c,f,0,1].map(v=>Number(v.toFixed(9))).join(',')+')';
}
export function escapeAttribute(text:string):string {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
export function imageMarkerHtml(src:string|undefined,corners:FrameCorners,width:number,height:number,title:string):string {
  const transform=perspectiveMatrix(corners,width,height);
  const content=src
    ? '<img alt="" src="'+escapeAttribute(src)+'" draggable="false" class="nv-frame-photo" style="transform:'+transform+'"/>'
    : '<span class="nv-frame-placeholder">＋ Ajouter une image</span>';
  return '<span class="nv-frame-host" aria-label="'+escapeAttribute(title)+'">'+content+'</span>';
}
type CornerEditorProps={
  corners:FrameCorners;image?:string;
  width:number;height:number;
  onChange:(v:FrameCorners)=>void;
};
export function CornerEditor({corners,image,width,height,onChange}:CornerEditorProps){
  const [dragging,setDragging]=useState<CornerKey|null>(null);
  function move(key:CornerKey,event:PointerEvent<HTMLButtonElement>) {
    const container=event.currentTarget.parentElement;
    if(!container)return;
    const r=container.getBoundingClientRect();
    if(!r.width||!r.height)return;
    const x=Math.round(Math.max(0,Math.min(100,100*(event.clientX-r.left)/r.width)));
    const y=Math.round(Math.max(0,Math.min(100,100*(event.clientY-r.top)/r.height)));
    onChange({...corners,[key]:{x,y}});
  }
  const shape=keys.map(key=>corners[key].x+','+corners[key].y).join(' ');
  return <div className="corner-editor">
    <div className="corner-editor-stage" style={{aspectRatio:width+'/'+height}}>
      {image?<img className="corner-editor-photo" src={image} alt="Prévisualisation du cadre" />:<div className="corner-editor-empty">Importe une image pour prévisualiser son cadre</div>}
      <svg className="corner-editor-guides" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polygon points={shape} fill="rgba(21,193,195,.06)" stroke="#70f6ee" strokeWidth=".7" strokeDasharray="2 1"/>
      </svg>
      {keys.map(key=><button key={key} type="button" title={titles[key]} aria-label={'Déplacer le coin '+titles[key]}
        className={'corner-handle '+(dragging===key?'grabbing':'')}
        style={{left:corners[key].x+'%',top:corners[key].y+'%'}}
        onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);setDragging(key);e.preventDefault();e.stopPropagation();}}
        onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))move(key,e);}}
        onPointerUp={e=>{move(key,e);setDragging(null);}}
        onPointerCancel={()=>setDragging(null)}>{key.toUpperCase()}</button>)}
    </div>
    <div className="corner-editor-coordinates">
      {keys.map(key=><div className="corner-coord" key={key}>
        <span>{titles[key]}</span>
        <label>X <input type="number" min="0" max="100" value={corners[key].x} onChange={e=>onChange({...corners,[key]:{...corners[key],x:Math.max(0,Math.min(100,Number(e.target.value)||0))}})}/></label>
        <label>Y <input type="number" min="0" max="100" value={corners[key].y} onChange={e=>onChange({...corners,[key]:{...corners[key],y:Math.max(0,Math.min(100,Number(e.target.value)||0))}})}/></label>
      </div>)}
    </div>
  </div>;
}
