import {useEffect,useMemo,useRef,useState,type PointerEvent as RPointerEvent} from 'react';
import {Camera,Circle,Download,Copy,MoveUpRight,Pencil,Square,Type,Undo2,Trash2,X,Send} from 'lucide-react';
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

type Tool='pen'|'circle'|'arrow'|'rect'|'text';
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
  const [textBox,setTextBox]=useState<{x:number;y:number;value:string}|null>(null);
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
  }
  useEffect(render,[shapes,ready,scale]);

  const pos=(e:RPointerEvent):[number,number]=>{
    const c=canvasRef.current!,r=c.getBoundingClientRect();
    return [(e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height];
  };
  function down(e:RPointerEvent<HTMLCanvasElement>){
    if(!ready)return;
    e.preventDefault();
    const [x,y]=pos(e);
    if(tool==='text'){commitText();setTextBox({x,y,value:''});return;}
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
    draft.current=tool==='pen'?{tool,color,size,pts:[[x,y]]}:{tool,color,size,x1:x,y1:y,x2:x,y2:y};
    render();
  }
  function move(e:RPointerEvent<HTMLCanvasElement>){
    const d=draft.current;if(!d)return;
    const [x,y]=pos(e);
    if(d.tool==='pen')d.pts!.push([x,y]);else{d.x2=x;d.y2=y;}
    render();
  }
  function up(){
    const d=draft.current;draft.current=null;
    if(!d)return;
    const tiny=d.tool!=='pen'&&Math.hypot((d.x2??0)-(d.x1??0),(d.y2??0)-(d.y1??0))<6;
    if(!tiny)setShapes(list=>[...list,d]);else render();
  }
  function commitText(){
    setTextBox(box=>{
      if(box&&box.value.trim())setShapes(list=>[...list,{tool:'text',color,size,x1:box.x,y1:box.y,text:box.value.trim()}]);
      return null;
    });
  }
  // Image finale (annotations incluses)
  function exportCanvas(maxW:number,type:'image/png'|'image/jpeg',q=.8):string{
    const c=canvasRef.current!;
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
    const c=canvasRef.current!;
    c.toBlob(blob=>{
      if(!blob)return;
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='capture-novastudio.png';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
    },'image/png');
  }
  async function copy(){
    try{
      const c=canvasRef.current!;
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
  const tools:[Tool,string,typeof Pencil][]=[['arrow','Flèche',MoveUpRight],['circle','Cercle',Circle],['rect','Cadre',Square],['pen','Crayon',Pencil],['text','Texte',Type]];
  const canvasRect=canvasRef.current?.getBoundingClientRect();

  return <div className="overlay nv-shot-overlay" role="dialog" aria-modal="true" aria-label="Capture annotée">
    <div className="nv-shot">
      <header className="nv-shot-bar">
        <div className="nv-shot-tools" role="toolbar" aria-label="Outils d’annotation">
          {tools.map(([key,label,Icon])=><button type="button" key={key} className={'nv-shot-tool'+(tool===key?' is-on':'')} aria-pressed={tool===key} onClick={()=>{commitText();setTool(key);}}><Icon size={18}/><span>{label}</span></button>)}
        </div>
        <div className="nv-shot-colors" role="group" aria-label="Couleur">
          {COLORS.map(c=><button type="button" key={c} className={'nv-shot-color'+(color===c?' is-on':'')} style={{background:c}} aria-label={'Couleur '+c} aria-pressed={color===c} onClick={()=>setColor(c)}/>)}
        </div>
        <div className="nv-shot-sizes" role="group" aria-label="Épaisseur">
          {SIZES.map(sz=><button type="button" key={sz} className={'nv-shot-size'+(size===sz?' is-on':'')} aria-pressed={size===sz} onClick={()=>setSize(sz)}><i style={{height:Math.max(3,sz)+'px'}}/></button>)}
        </div>
        <button type="button" className="nv-shot-tool" onClick={()=>setShapes(l=>l.slice(0,-1))} disabled={!shapes.length}><Undo2 size={18}/><span>Annuler</span></button>
        <button type="button" className="nv-shot-tool" onClick={()=>setShapes([])} disabled={!shapes.length}><Trash2 size={18}/><span>Tout effacer</span></button>
        <button type="button" className="nv-shot-close" onClick={onClose} aria-label="Fermer la capture"><X size={20}/></button>
      </header>
      <div className="nv-shot-stage">
        <div className="nv-shot-canvaswrap">
          <canvas ref={canvasRef} className={'nv-shot-canvas tool-'+tool} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}/>
          {textBox&&canvasRect&&canvasRef.current&&<textarea className="nv-shot-text" autoFocus rows={2} value={textBox.value} placeholder="Écris ton message…"
            style={{left:textBox.x*canvasRect.width/canvasRef.current.width,top:textBox.y*canvasRect.height/canvasRef.current.height,color}}
            onChange={e=>setTextBox({...textBox,value:e.target.value})}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();commitText();}if(e.key==='Escape'){setTextBox(null);}}}
            onBlur={commitText}/>}
        </div>
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
