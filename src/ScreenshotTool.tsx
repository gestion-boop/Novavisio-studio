import {useEffect,useMemo,useRef,useState,type PointerEvent as RPointerEvent} from 'react';
import {Camera,Circle,Download,Copy,MousePointer2,MoveUpRight,Pencil,Square,Type,Undo2,Trash2,X,Send,ChevronUp,ChevronDown,Layers} from 'lucide-react';
import {loadParticipants,type Person} from './LiveShareDialog';
import type {LiveShot} from './liveSession';

/**
 * Capture annotée : on prend une photo de l'écran à l'instant T, on entoure / flèche / écrit dessus,
 * puis on l'envoie à la personne concernée sur le projet (ou on la télécharge).
 */
export async function captureScreen():Promise<string>{
  type Md=MediaDevices&{getDisplayMedia?:(o?:unknown)=>Promise<MediaStream>};
  const md=navigator.mediaDevices as Md|undefined;
  if(!md?.getDisplayMedia)throw new Error('Ce navigateur ne permet pas la capture d’écran (utilise Chrome, Edge ou Safari récent sur ordinateur).');
  const stream=await md.getDisplayMedia({video:true,audio:false,preferCurrentTab:true,selfBrowserSurface:'include',surfaceSwitching:'exclude'});
  try{
    const video=document.createElement('video');
    video.muted=true;video.playsInline=true;video.srcObject=stream;
    await video.play();
    await new Promise(resolve=>window.setTimeout(resolve,350)); // laisse l'image se stabiliser
    const canvas=document.createElement('canvas');
    canvas.width=video.videoWidth;canvas.height=video.videoHeight;
    canvas.getContext('2d')!.drawImage(video,0,0);
    return canvas.toDataURL('image/png');
  }finally{stream.getTracks().forEach(t=>t.stop());}
}

type Tool='select'|'pen'|'circle'|'arrow'|'rect'|'text';
type Shape={tool:Tool;color:string;size:number;pts?:[number,number][];x1?:number;y1?:number;x2?:number;y2?:number;text?:string};
const COLORS=['#ff3b30','#ffd60a','#34c759','#0a84ff','#ffffff','#111111'];
const SIZES=[3,6,10];

function drawShape(ctx:CanvasRenderingContext2D,sh:Shape,scale:number){
  ctx.save();ctx.strokeStyle=sh.color;ctx.fillStyle=sh.color;ctx.lineWidth=sh.size*scale;ctx.lineCap='round';ctx.lineJoin='round';
  if(sh.tool==='pen'&&sh.pts&&sh.pts.length>0){
    ctx.beginPath();ctx.moveTo(sh.pts[0][0],sh.pts[0][1]);
    for(const [x,y] of sh.pts.slice(1))ctx.lineTo(x,y);
    if(sh.pts.length===1)ctx.lineTo(sh.pts[0][0]+.1,sh.pts[0][1]);
    ctx.stroke();
  }else if(sh.tool==='circle'&&sh.x1!==undefined){
    const cx=(sh.x1+sh.x2!)/2,cy=(sh.y1!+sh.y2!)/2,rx=Math.abs(sh.x2!-sh.x1)/2,ry=Math.abs(sh.y2!-sh.y1!)/2;
    ctx.beginPath();ctx.ellipse(cx,cy,Math.max(rx,1),Math.max(ry,1),0,0,Math.PI*2);ctx.stroke();
  }else if(sh.tool==='rect'&&sh.x1!==undefined){
    ctx.strokeRect(Math.min(sh.x1,sh.x2!),Math.min(sh.y1!,sh.y2!),Math.abs(sh.x2!-sh.x1),Math.abs(sh.y2!-sh.y1!));
  }else if(sh.tool==='arrow'&&sh.x1!==undefined){
    const a=Math.atan2(sh.y2!-sh.y1!,sh.x2!-sh.x1),head=Math.max(16*scale,sh.size*scale*3.2);
    ctx.beginPath();ctx.moveTo(sh.x1,sh.y1!);ctx.lineTo(sh.x2!,sh.y2!);ctx.stroke();
    ctx.beginPath();ctx.moveTo(sh.x2!,sh.y2!);
    ctx.lineTo(sh.x2!-head*Math.cos(a-.45),sh.y2!-head*Math.sin(a-.45));ctx.lineTo(sh.x2!-head*Math.cos(a+.45),sh.y2!-head*Math.sin(a+.45));ctx.closePath();ctx.fill();
  }else if(sh.tool==='text'&&sh.text&&sh.x1!==undefined){
    const px=Math.round((10+sh.size*2.2)*scale);
    ctx.font=`800 ${px}px system-ui,Segoe UI,Arial,sans-serif`;ctx.textBaseline='top';
    ctx.lineWidth=Math.max(3,px/7);ctx.strokeStyle=sh.color==='#ffffff'||sh.color==='#ffd60a'?'#000000cc':'#ffffffee';
    sh.text.split('\n').forEach((line,i)=>{ctx.strokeText(line,sh.x1!,sh.y1!+i*px*1.2);ctx.fillText(line,sh.x1!,sh.y1!+i*px*1.2);});
  }
  ctx.restore();
}

/* ---- Sélection / modification des annotations ---- */
const distSeg=(px:number,py:number,x1:number,y1:number,x2:number,y2:number)=>{
  const dx=x2-x1,dy=y2-y1,l2=dx*dx+dy*dy;
  const t=l2===0?0:Math.max(0,Math.min(1,((px-x1)*dx+(py-y1)*dy)/l2));
  return Math.hypot(px-(x1+t*dx),py-(y1+t*dy));
};
function textBounds(ctx:CanvasRenderingContext2D,sh:Shape,scale:number){
  const px=Math.round((10+sh.size*2.2)*scale);
  ctx.save();ctx.font=`800 ${px}px system-ui,Segoe UI,Arial,sans-serif`;
  const lines=(sh.text??'').split('\n');
  const w=Math.max(...lines.map(l=>ctx.measureText(l).width),10);
  ctx.restore();
  return {x:sh.x1!,y:sh.y1!,w,h:lines.length*px*1.2};
}
function shapeBounds(ctx:CanvasRenderingContext2D,sh:Shape,scale:number){
  if(sh.tool==='text')return textBounds(ctx,sh,scale);
  if(sh.tool==='pen'&&sh.pts?.length){
    const xs=sh.pts.map(p=>p[0]),ys=sh.pts.map(p=>p[1]);
    const x=Math.min(...xs),y=Math.min(...ys);return {x,y,w:Math.max(...xs)-x,h:Math.max(...ys)-y};
  }
  const x=Math.min(sh.x1!,sh.x2!),y=Math.min(sh.y1!,sh.y2!);return {x,y,w:Math.abs(sh.x2!-sh.x1!),h:Math.abs(sh.y2!-sh.y1!)};
}
function hitShape(ctx:CanvasRenderingContext2D,sh:Shape,x:number,y:number,scale:number):boolean{
  const tol=Math.max(12*scale,sh.size*scale*1.5);
  if(sh.tool==='text'){const b=textBounds(ctx,sh,scale);return x>=b.x-tol/2&&x<=b.x+b.w+tol/2&&y>=b.y-tol/2&&y<=b.y+b.h+tol/2;}
  if(sh.tool==='pen'&&sh.pts){
    if(sh.pts.length===1)return Math.hypot(x-sh.pts[0][0],y-sh.pts[0][1])<=tol;
    for(let i=1;i<sh.pts.length;i++)if(distSeg(x,y,sh.pts[i-1][0],sh.pts[i-1][1],sh.pts[i][0],sh.pts[i][1])<=tol)return true;
    return false;
  }
  if(sh.tool==='arrow')return distSeg(x,y,sh.x1!,sh.y1!,sh.x2!,sh.y2!)<=tol;
  const b=shapeBounds(ctx,sh,scale);
  if(sh.tool==='rect')return x>=b.x-tol&&x<=b.x+b.w+tol&&y>=b.y-tol&&y<=b.y+b.h+tol;   // contour ou intérieur
  // cercle / ellipse : proche du contour
  const cx=b.x+b.w/2,cy=b.y+b.h/2,rx=Math.max(b.w/2,1),ry=Math.max(b.h/2,1);
  const d=Math.hypot((x-cx)/rx,(y-cy)/ry);
  return (d-1)*Math.min(rx,ry)<=tol;   // contour ou intérieur
}
const moveShape=(sh:Shape,dx:number,dy:number):Shape=>({
  ...sh,
  ...(sh.pts?{pts:sh.pts.map(([a,b])=>[a+dx,b+dy] as [number,number])}:{}),
  ...(sh.x1!==undefined?{x1:sh.x1+dx,y1:sh.y1!+dy}:{}),
  ...(sh.x2!==undefined?{x2:sh.x2+dx,y2:sh.y2!+dy}:{})
});

export function ShotEditor({image,defaultTo,canSend,onSend,onClose}:{
  image:string;defaultTo?:string;canSend:boolean;onSend:(to:string[],comment:string,image:string)=>Promise<void>;onClose:()=>void;
}){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const imgRef=useRef<HTMLImageElement|null>(null);
  const [ready,setReady]=useState(false);
  const [tool,setTool]=useState<Tool>('arrow');
  const [color,setColor]=useState(COLORS[0]);
  const [size,setSize]=useState(SIZES[1]);
  const [shapes,setShapes]=useState<Shape[]>([]);
  const draft=useRef<Shape|null>(null);
  const [textBox,setTextBox]=useState<{x:number;y:number;value:string;color:string;size:number;index?:number}|null>(null);
  const textRef=useRef<HTMLTextAreaElement>(null);
  const [sel,setSel]=useState<number|null>(null);                       // annotation sélectionnée (outil « Sélection »)
  const drag=useRef<{idx:number;x:number;y:number}|null>(null);
  const [people,setPeople]=useState<Person[]|null>(null);
  const [peopleError,setPeopleError]=useState('');
  const [chosen,setChosen]=useState<Set<string>>(new Set(defaultTo?[defaultTo]:[]));
  const [comment,setComment]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const scale=useMemo(()=>ready&&imgRef.current?Math.max(1,imgRef.current.width/1000):1,[ready]);

  useEffect(()=>{
    const img=new Image();
    img.onload=()=>{
      imgRef.current=img;
      const c=canvasRef.current;if(!c)return;
      const maxW=1600,k=Math.min(1,maxW/img.width);
      c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);
      setReady(true);
    };
    img.src=image;
  },[image]);
  useEffect(()=>{
    let dead=false;
    if(!canSend){setPeople([]);return;}
    loadParticipants().then(r=>{if(!dead)setPeople(r.people);}).catch(e=>{if(!dead){setPeople([]);setPeopleError(e instanceof Error?e.message:String(e));}});
    return ()=>{dead=true;};
  },[canSend]);

  const scaleOf=()=>{const c=canvasRef.current;return c?Math.max(1,c.width/1000):1;};
  function render(){
    const c=canvasRef.current,img=imgRef.current;
    if(!c||!img)return;
    const ctx=c.getContext('2d')!;
    ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);
    for(const sh of shapes)drawShape(ctx,sh,scaleOf());
    if(draft.current)drawShape(ctx,draft.current,scaleOf());
    // Cadre pointillé autour de l'annotation sélectionnée (jamais exporté)
    if(sel!==null&&shapes[sel]){
      const k=scaleOf(),bb=shapeBounds(ctx,shapes[sel],k),pad=8*k;
      ctx.save();ctx.setLineDash([8*k,6*k]);ctx.lineWidth=2*k;ctx.strokeStyle='#4bebde';
      ctx.strokeRect(bb.x-pad,bb.y-pad,bb.w+2*pad,bb.h+2*pad);ctx.restore();
    }
  }
  // Image propre (sans cadre de sélection) pour télécharger, copier, envoyer
  function flatCanvas():HTMLCanvasElement{
    const c=canvasRef.current!,img=imgRef.current!;
    const out=document.createElement('canvas');out.width=c.width;out.height=c.height;
    const ctx=out.getContext('2d')!;ctx.drawImage(img,0,0,c.width,c.height);
    for(const sh of shapes)drawShape(ctx,sh,Math.max(1,c.width/1000));
    return out;
  }
  useEffect(render,[shapes,ready,scale,sel]);

  const pos=(e:RPointerEvent):[number,number]=>{
    const c=canvasRef.current!,r=c.getBoundingClientRect();
    return [(e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height];
  };
  function down(e:RPointerEvent<HTMLCanvasElement>){
    if(!ready)return;
    e.preventDefault();
    const [x,y]=pos(e);
    if(tool==='select'){
      commitText();
      const ctx=canvasRef.current!.getContext('2d')!,k=scaleOf();
      let idx=-1;for(let i=shapes.length-1;i>=0;i--){if(hitShape(ctx,shapes[i],x,y,k)){idx=i;break;}}
      setSel(idx>=0?idx:null);
      if(idx>=0){setColor(shapes[idx].color);setSize(shapes[idx].size);drag.current={idx,x,y};(e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);}
      return;
    }
    if(tool==='text'){
      commitText();
      // clic sur un texte déjà posé : on le modifie ; sinon on en écrit un nouveau
      const ctx=canvasRef.current!.getContext('2d')!,k=scaleOf();
      for(let i=shapes.length-1;i>=0;i--)if(shapes[i].tool==='text'&&hitShape(ctx,shapes[i],x,y,k)){
        setSel(i);setColor(shapes[i].color);setSize(shapes[i].size);
        setTextBox({x:shapes[i].x1!,y:shapes[i].y1!,value:shapes[i].text??'',color:shapes[i].color,size:shapes[i].size,index:i});return;
      }
      setSel(null);setTextBox({x,y,value:'',color,size});return;
    }
    setSel(null);
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
    draft.current=tool==='pen'?{tool,color,size,pts:[[x,y]]}:{tool,color,size,x1:x,y1:y,x2:x,y2:y};
    render();
  }
  function move(e:RPointerEvent<HTMLCanvasElement>){
    if(drag.current){
      const [x,y]=pos(e),dr=drag.current,dx=x-dr.x,dy=y-dr.y;
      dr.x=x;dr.y=y;
      setShapes(list=>list.map((sh,i)=>i===dr.idx?moveShape(sh,dx,dy):sh));
      return;
    }
    const d=draft.current;if(!d)return;
    const [x,y]=pos(e);
    if(d.tool==='pen')d.pts!.push([x,y]);else{d.x2=x;d.y2=y;}
    render();
  }
  function up(){
    if(drag.current){drag.current=null;return;}
    const d=draft.current;draft.current=null;
    if(!d)return;
    const tiny=d.tool!=='pen'&&Math.hypot((d.x2??0)-(d.x1??0),(d.y2??0)-(d.y1??0))<6;
    // la forme qu'on vient de tracer reste sélectionnée : couleur, épaisseur et suppression s'appliquent tout de suite
    if(!tiny)setShapes(list=>{setSel(list.length);return [...list,d];});else render();
  }
  function commitText(){
    setTextBox(box=>{
      if(!box)return null;
      const value=box.value.trim();
      if(box.index!==undefined){
        // modification d'un texte existant (texte vide = suppression)
        setShapes(list=>value?list.map((sh,i)=>i===box.index?{...sh,text:value,color:box.color,size:box.size}:sh):list.filter((_,i)=>i!==box.index));
        if(!value)setSel(null);
      }else if(value){
        // le nouveau texte reste sélectionné : on peut tout de suite le modifier ou changer sa couleur
        setShapes(list=>{setSel(list.length);return [...list,{tool:'text',color:box.color,size:box.size,x1:box.x,y1:box.y,text:value}];});
      }
      return null;
    });
  }
  // Modifier le texte sélectionné (double-clic ou bouton)
  function editSelectedText(){
    if(sel===null||shapes[sel]?.tool!=='text')return;
    const sh=shapes[sel];setTextBox({x:sh.x1!,y:sh.y1!,value:sh.text??'',color:sh.color,size:sh.size,index:sel});
  }
  function removeSelected(){
    if(sel===null)return;
    setShapes(list=>list.filter((_,i)=>i!==sel));setSel(null);
  }
  function pickLayer(i:number){commitText();setTool('select');setSel(i);setColor(shapes[i].color);setSize(shapes[i].size);}
  function moveLayer(i:number,dir:1|-1){
    const j=i+dir;if(j<0||j>=shapes.length)return;
    setShapes(list=>{const n=[...list];[n[i],n[j]]=[n[j],n[i]];return n;});
    if(sel===i)setSel(j);else if(sel===j)setSel(i);
  }
  function removeLayer(i:number){
    setShapes(list=>list.filter((_,k)=>k!==i));
    setSel(cur=>cur===null?null:cur===i?null:cur>i?cur-1:cur);
  }
  function pickColor(c:string){setColor(c);if(textBox){setTextBox(b=>b?{...b,color:c}:b);requestAnimationFrame(()=>textRef.current?.focus());}if(sel!==null)setShapes(list=>list.map((sh,i)=>i===sel?{...sh,color:c}:sh));}
  function pickSize(sz:number){setSize(sz);if(textBox){setTextBox(b=>b?{...b,size:sz}:b);requestAnimationFrame(()=>textRef.current?.focus());}if(sel!==null)setShapes(list=>list.map((sh,i)=>i===sel?{...sh,size:sz}:sh));}
  function dblClick(e:RPointerEvent<HTMLCanvasElement>|React.MouseEvent<HTMLCanvasElement>){
    if(tool!=='select')return;
    const c=canvasRef.current!,r=c.getBoundingClientRect();
    const x=(e.clientX-r.left)*c.width/r.width,y=(e.clientY-r.top)*c.height/r.height;
    const ctx=c.getContext('2d')!,k=scaleOf();
    for(let i=shapes.length-1;i>=0;i--)if(shapes[i].tool==='text'&&hitShape(ctx,shapes[i],x,y,k)){setSel(i);setTextBox({x:shapes[i].x1!,y:shapes[i].y1!,value:shapes[i].text??'',color:shapes[i].color,size:shapes[i].size,index:i});return;}
  }
  // Touches Suppr / Retour arrière : supprime l'annotation sélectionnée
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      const tag=(e.target as HTMLElement|null)?.tagName;if(tag==='TEXTAREA'||tag==='INPUT')return;
      if((e.key==='Delete'||e.key==='Backspace')&&sel!==null){e.preventDefault();removeSelected();}
      if(e.key==='Escape'&&sel!==null)setSel(null);
    };
    window.addEventListener('keydown',onKey);return ()=>window.removeEventListener('keydown',onKey);
  });
  // Image finale (annotations incluses)
  function exportCanvas(maxW:number,type:'image/png'|'image/jpeg',q=.8):string{
    const c=flatCanvas();
    const k=Math.min(1,maxW/c.width);
    const out=document.createElement('canvas');out.width=Math.round(c.width*k);out.height=Math.round(c.height*k);
    out.getContext('2d')!.drawImage(c,0,0,out.width,out.height);
    return out.toDataURL(type,q);
  }
  function lightImage():string{
    for(const w of [1100,900,760,640,520])for(const q of [.7,.55,.4]){const d=exportCanvas(w,'image/jpeg',q);if(d.length<=240_000)return d;}
    return exportCanvas(480,'image/jpeg',.35);
  }
  function download(){
    const c=flatCanvas();
    c.toBlob(blob=>{
      if(!blob)return;
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='capture-novastudio.png';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
    },'image/png');
  }
  async function copy(){
    try{
      const c=flatCanvas();
      const blob=await new Promise<Blob|null>(r=>c.toBlob(r,'image/png'));
      if(!blob)throw new Error('image vide');
      await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
      setMessage('Image copiée : colle-la (Ctrl/⌘ + V) dans un e-mail ou un message.');
    }catch{setMessage('Copie impossible dans ce navigateur : utilise « Télécharger ».');}
  }
  async function send(){
    if(!chosen.size){setMessage('Choisis au moins une personne.');return;}
    commitText();
    setBusy(true);setMessage('');
    try{await onSend([...chosen],comment,lightImage());onClose();}
    catch(e){setMessage('Envoi impossible : '+(e instanceof Error?e.message:String(e)));}
    finally{setBusy(false);}
  }
  const toggle=(email:string)=>setChosen(cur=>{const n=new Set(cur);if(n.has(email))n.delete(email);else n.add(email);return n;});
  const tools:[Tool,string,typeof Pencil][]=[['select','Sélection',MousePointer2],['arrow','Flèche',MoveUpRight],['circle','Cercle',Circle],['rect','Cadre',Square],['pen','Crayon',Pencil],['text','Texte',Type]];
  const canvasRect=canvasRef.current?.getBoundingClientRect();

  return <div className="overlay nv-shot-overlay" role="dialog" aria-modal="true" aria-label="Capture annotée">
    <div className="nv-shot">
      <header className="nv-shot-bar">
        <div className="nv-shot-tools" role="toolbar" aria-label="Outils d’annotation">
          {tools.map(([key,label,Icon])=><button type="button" key={key} className={'nv-shot-tool'+(tool===key?' is-on':'')} aria-pressed={tool===key} onClick={()=>{commitText();setTool(key);if(key!=='select')setSel(null);}}><Icon size={18}/><span>{label}</span></button>)}
        </div>
        <div className="nv-shot-colors" role="group" aria-label="Couleur">
          {COLORS.map(c=><button type="button" key={c} className={'nv-shot-color'+(color===c?' is-on':'')} style={{background:c}} aria-label={'Couleur '+c} aria-pressed={color===c} onClick={()=>pickColor(c)}/>)}
        </div>
        <div className="nv-shot-sizes" role="group" aria-label="Épaisseur">
          {SIZES.map(sz=><button type="button" key={sz} className={'nv-shot-size'+(size===sz?' is-on':'')} aria-pressed={size===sz} onClick={()=>pickSize(sz)}><i style={{height:Math.max(3,sz)+'px'}}/></button>)}
        </div>
        <button type="button" className="nv-shot-tool" onClick={()=>{setShapes(l=>l.slice(0,-1));setSel(null);}} disabled={!shapes.length}><Undo2 size={18}/><span>Annuler</span></button>
        <button type="button" className="nv-shot-tool" onClick={()=>{setShapes([]);setSel(null);}} disabled={!shapes.length}><Trash2 size={18}/><span>Tout effacer</span></button>
        {sel!==null&&shapes[sel]?.tool==='text'&&<button type="button" className="nv-shot-tool" onClick={editSelectedText}><Pencil size={18}/><span>Modifier le texte</span></button>}
        <button type="button" className="nv-shot-tool nv-shot-del" onClick={removeSelected} disabled={sel===null} title="Supprimer l’élément sélectionné (touche Suppr)"><Trash2 size={18}/><span>Supprimer</span></button>
        <button type="button" className="nv-shot-close" onClick={onClose} aria-label="Fermer la capture"><X size={20}/></button>
      </header>
      <p className="nv-shot-tip">{sel!==null?'Élément sélectionné : change sa couleur ou son épaisseur, supprime-le (bouton ou touche Suppr)'+(tool==='select'?', glisse-le pour le déplacer, double-clique sur un texte pour le modifier.':'. Choisis « Sélection » pour le déplacer ou en choisir un autre.'):(tool==='select'?'Clique sur une annotation pour la sélectionner.':'Astuce : après avoir tracé un élément, il reste sélectionné ; « Sélection » permet d’en choisir un autre.')}</p>
      <div className="nv-shot-body">
      <div className="nv-shot-stage">
        <div className="nv-shot-canvaswrap">
          <canvas ref={canvasRef} className={'nv-shot-canvas tool-'+tool} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onDoubleClick={dblClick}/>
          {textBox&&canvasRect&&canvasRef.current&&<textarea ref={textRef} className="nv-shot-text" autoFocus rows={2} value={textBox.value} placeholder="Écris ton message…"
            style={{left:textBox.x*canvasRect.width/canvasRef.current.width,top:textBox.y*canvasRect.height/canvasRef.current.height,color:textBox.color,fontSize:Math.round((10+textBox.size*2.2)*canvasRect.width/canvasRef.current.width*(canvasRef.current.width/1000>1?canvasRef.current.width/1000:1))+'px'}}
            onChange={e=>setTextBox({...textBox,value:e.target.value})}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();commitText();}if(e.key==='Escape'){setTextBox(null);}}}
            onBlur={e=>{const to=e.relatedTarget as HTMLElement|null;if(to&&to.closest('.nv-shot-bar'))return;commitText();}}/>}
        </div>
      </div>
      <aside className="nv-shot-layers" aria-label="Calques">
        <strong><Layers size={15}/> Calques <small>{shapes.length}</small></strong>
        {!shapes.length&&<p>Les éléments que tu traces apparaissent ici : clique pour les sélectionner.</p>}
        <ul>
          {shapes.map((sh,i)=>({sh,i})).reverse().map(({sh,i})=>{
            const meta=tools.find(t=>t[0]===sh.tool)!,Ic=meta[2];
            return <li key={i} className={sel===i?'is-on':''}>
              <button type="button" className="nv-layer-main" onClick={()=>pickLayer(i)} aria-pressed={sel===i}>
                <i className="nv-layer-dot" style={{background:sh.color}}/><Ic size={15}/>
                <span>{sh.tool==='text'?'« '+(sh.text||'').split('\n')[0].slice(0,22)+' »':meta[1]+' '+(i+1)}</span>
              </button>
              <button type="button" className="nv-layer-btn" onClick={()=>moveLayer(i,1)} disabled={i===shapes.length-1} aria-label="Mettre devant"><ChevronUp size={14}/></button>
              <button type="button" className="nv-layer-btn" onClick={()=>moveLayer(i,-1)} disabled={i===0} aria-label="Mettre derrière"><ChevronDown size={14}/></button>
              <button type="button" className="nv-layer-btn" onClick={()=>removeLayer(i)} aria-label="Supprimer ce calque"><Trash2 size={14}/></button>
            </li>;})}
        </ul>
      </aside>
      </div>
      <footer className="nv-shot-send">
        <div className="nv-shot-people">
          <strong>Envoyer à</strong>
          {people===null&&<small>Chargement…</small>}
          {people&&people.map(p=><button type="button" key={p.email} className={'nv-shot-person'+(chosen.has(p.email)?' is-on':'')} aria-pressed={chosen.has(p.email)} onClick={()=>toggle(p.email)}>
            <span aria-hidden="true">{chosen.has(p.email)?'✓':''}</span>{p.email.split('@')[0]}<em>{p.role}</em></button>)}
          {people&&people.length===0&&<small>{peopleError||'Personne d’autre n’est invité sur ce projet.'}</small>}
        </div>
        <textarea className="nv-shot-comment" rows={2} maxLength={600} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Message pour la personne (facultatif)…"/>
        <div className="nv-shot-actions">
          <span className="nv-shot-msg" role="status">{message}</span>
          <button type="button" onClick={()=>void copy()}><Copy size={16}/> Copier</button>
          <button type="button" onClick={download}><Download size={16}/> Télécharger</button>
          <button type="button" className="is-primary" disabled={busy||!canSend||!people||people.length===0} onClick={()=>void send()}><Send size={16}/> {busy?'Envoi…':'Envoyer'}</button>
        </div>
      </footer>
    </div>
  </div>;
}

/** Captures reçues : cartes cliquables en haut à droite, avec une croix pour les fermer. */
export function ShotInbox({shots,onDismiss,onReply}:{shots:LiveShot[];onDismiss:(id:string)=>void;onReply:(shot:LiveShot)=>void}){
  const [view,setView]=useState<LiveShot|null>(null);
  if(!shots.length)return null;
  const download=(shot:LiveShot)=>{const a=document.createElement('a');a.href=shot.image;a.download='capture-'+shot.fromLabel+'.jpg';document.body.append(a);a.click();a.remove();};
  return <>
    <div className="nv-shot-inbox" role="region" aria-label="Captures reçues">
      {shots.map(shot=><article key={shot.id} className="nv-shot-card">
        <button type="button" className="nv-shot-card-thumb" onClick={()=>setView(shot)} aria-label={'Voir la capture de '+shot.fromLabel}><img src={shot.image} alt=""/></button>
        <div className="nv-shot-card-body"><strong><Camera size={14}/> {shot.fromLabel} t’envoie une capture</strong>{shot.comment&&<p>{shot.comment}</p>}
          <div><button type="button" onClick={()=>setView(shot)}>Voir</button><button type="button" onClick={()=>onReply(shot)}>Répondre</button></div></div>
        <button type="button" className="nv-shot-card-x" onClick={()=>onDismiss(shot.id)} aria-label="Fermer cette capture"><X size={16}/></button>
      </article>)}
    </div>
    {view&&<div className="overlay nv-shot-overlay" role="dialog" aria-modal="true" aria-label="Capture reçue" onMouseDown={e=>{if(e.target===e.currentTarget)setView(null);}}>
      <div className="nv-shot nv-shot-view">
        <header className="nv-shot-bar"><strong>{view.fromLabel} · capture annotée</strong>
          <button type="button" className="nv-shot-close" onClick={()=>setView(null)} aria-label="Fermer"><X size={20}/></button></header>
        <div className="nv-shot-stage"><img src={view.image} alt="Capture annotée reçue"/></div>
        {view.comment&&<p className="nv-shot-viewcomment">{view.comment}</p>}
        <div className="nv-shot-actions"><span/>
          <button type="button" onClick={()=>download(view)}><Download size={16}/> Télécharger</button>
          <button type="button" className="is-primary" onClick={()=>{const s=view;setView(null);onReply(s);}}><Pencil size={16}/> Répondre en annotant</button></div>
      </div>
    </div>}
  </>;
}
