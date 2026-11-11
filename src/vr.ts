import {
  CanvasTexture,Color,LinearFilter,DoubleSide,Group,Line,BufferGeometry,LineBasicMaterial,Float32BufferAttribute,Mesh,MeshBasicMaterial,
  PerspectiveCamera,PlaneGeometry,Raycaster,Scene as ThreeScene,SphereGeometry,SRGBColorSpace,Vector3,WebGLRenderer,type Object3D,type Texture
} from 'three';
import type {StudioProject,Scene,Hotspot,BottomBarItem} from './storage';
import {galleryEntries} from './gallery';

/**
 * Mode VR de base (WebXR) pour casque Meta Quest : panorama 360° autour du spectateur, flèches de navigation cliquables
 * avec la manette, barre flottante, galerie de panoramas. Les panoramas sont allégés (4096 px max) pour le casque.
 * Les cadres photo/vidéo, fenêtres d'information et la musique ne font pas partie de cette version.
 */
export const VR_MAX_TEXTURE=4096;
const SPHERE_R=10,HOTSPOT_R=6;

export async function vrSupported():Promise<boolean>{
  try{
    const xr=(navigator as Navigator&{xr?:{isSessionSupported:(m:string)=>Promise<boolean>}}).xr;
    return !!xr&&await xr.isSessionSupported('immersive-vr');
  }catch{return false;}
}

export type VrOptions={
  getProject:()=>StudioProject;
  startSceneId:string;
  /** Demande le téléchargement d'un panorama pas encore chargé (lien public). */
  ensureScene?:(id:string)=>void;
  onSceneChange?:(id:string)=>void;
  onEnd?:(lastSceneId:string)=>void;
};

type Clickable=Object3D&{userData:{onSelect?:()=>void;hoverScale?:number;baseScale?:number}};

const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));

/** Charge une image en la réduisant dès le décodage (évite de décoder une image géante en entier). */
async function loadReduced(src:string,maxWidth:number):Promise<HTMLCanvasElement>{
  const blob=await (await fetch(src)).blob();
  let bitmap:ImageBitmap|HTMLImageElement;
  try{
    const probe=await createImageBitmap(blob);
    const needs=probe.width>maxWidth;
    if(!needs){bitmap=probe;}
    else{
      probe.close();
      bitmap=await createImageBitmap(blob,{resizeWidth:maxWidth,resizeQuality:'high'});
    }
  }catch{
    const url=URL.createObjectURL(blob);
    bitmap=await new Promise<HTMLImageElement>((ok,ko)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>ko(new Error('image'));i.src=url;});
    URL.revokeObjectURL(url);
  }
  const w0='width' in bitmap?bitmap.width:0,h0='height' in bitmap?bitmap.height:0;
  const scale=Math.min(1,maxWidth/Math.max(1,w0));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(w0*scale));canvas.height=Math.max(1,Math.round(h0*scale));
  canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);
  if('close' in bitmap)bitmap.close();
  return canvas;
}

function roundRect(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();
}
function canvasTexture(w:number,h:number,draw:(c:CanvasRenderingContext2D)=>void):CanvasTexture{
  const k=document.createElement('canvas');k.width=w;k.height=h;
  draw(k.getContext('2d')!);
  const t=new CanvasTexture(k);t.colorSpace=SRGBColorSpace;return t;
}
function loadImage(src:string):Promise<HTMLImageElement|null>{
  return new Promise(ok=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>ok(null);i.src=src;});
}
function wrapText(c:CanvasRenderingContext2D,text:string,maxW:number):string[]{
  const out:string[]=[];
  for(const para of text.split('\n')){
    let line='';
    for(const word of para.split(' ')){
      const test=line?line+' '+word:word;
      if(c.measureText(test).width>maxW&&line){out.push(line);line=word;}else line=test;
    }
    out.push(line);
  }
  return out;
}
const GLYPH:Record<string,string>={home:'⌂',info:'i',calendar:'▦',map:'⌖',phone:'☎',web:'⊕',arrow:'➜',menu:'☰',star:'★',utensils:'✂',images:'▣',grid:'▦'};

export async function startVr(opts:VrOptions):Promise<()=>void>{
  const xr=(navigator as Navigator&{xr:{requestSession:(m:string,o?:object)=>Promise<any>}}).xr;
  // Doit être appelé tout de suite (geste de l'utilisateur), avant tout chargement.
  const session=await xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor','hand-tracking']});

  const canvas=document.createElement('canvas');
  const renderer=new WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.xr.enabled=true;
  renderer.setPixelRatio(1);
  const maxTex=Math.min(VR_MAX_TEXTURE,renderer.capabilities.maxTextureSize);
  await renderer.xr.setSession(session);

  const scene=new ThreeScene();scene.background=new Color(0x000000);
  const camera=new PerspectiveCamera(70,1,0.05,50);
  const root=new Group();scene.add(root);          // panorama + flèches (alignés sur la direction du regard)
  const ui=new Group();scene.add(ui);              // barre / galerie / texte (devant le visage)
  const clickables:Clickable[]=[];
  const disposables:{dispose:()=>void}[]=[];

  // ---- sphère panoramique ------------------------------------------------------------------------------------
  const sphereMat=new MeshBasicMaterial({color:0x000000,side:DoubleSide,depthTest:false,depthWrite:false});
  const sphere=new Mesh(new SphereGeometry(SPHERE_R,64,32,-Math.PI/2,Math.PI*2,0,Math.PI).scale(-1,1,1),sphereMat);
  sphere.renderOrder=0;root.add(sphere);
  disposables.push(sphereMat,sphere.geometry);
  let panoTexture:Texture|null=null;

  const hotspotGroup=new Group();root.add(hotspotGroup);
  let currentId=opts.startSceneId;
  let busy=false;
  let ended=false;
  let alignPending=true;
  let alignYaw=0;
  let fade=1,fadeTarget=1;

  const project=()=>opts.getProject();
  const sceneOf=(id:string):Scene|undefined=>project().scenes.find(s=>s.id===id);

  const headForward=():{x:number;y:number;z:number;phi:number}=>{
    const cam=renderer.xr.getCamera();
    const p=new Vector3(),d=new Vector3();
    cam.getWorldPosition(p);cam.getWorldDirection(d);
    return {x:p.x,y:p.y,z:p.z,phi:Math.atan2(d.x,d.z)};
  };
  /** Place le panorama de sorte que la vue d'arrivée (yaw) se trouve devant le visage actuel. */
  const alignToHead=(yaw:number)=>{const h=headForward();root.position.set(h.x,h.y,h.z);root.rotation.y=yaw+h.phi;};

  const makeHotspot=async(h:Hotspot):Promise<Mesh|null>=>{
    if(h.type!=='navigation'||!h.target)return null;
    const icon=project().icons?.find(i=>i.id===h.iconId);
    const img=icon?.dataUrl?await loadImage(icon.dataUrl):null;
    const tex=canvasTexture(256,256,c=>{
      if(img){c.drawImage(img,0,0,256,256);return;}
      c.fillStyle='rgba(20,20,24,.72)';c.beginPath();c.arc(128,128,120,0,Math.PI*2);c.fill();
      c.lineWidth=10;c.strokeStyle='#ffffff';c.stroke();
      c.strokeStyle='#ffffff';c.lineWidth=22;c.lineCap='round';c.lineJoin='round';
      c.beginPath();c.moveTo(88,148);c.lineTo(128,100);c.lineTo(168,148);c.stroke();
    });
    const size=Math.min(1.3,Math.max(.6,(h.iconSize??28)/32*.7));
    const mesh=new Mesh(new PlaneGeometry(size,size),new MeshBasicMaterial({map:tex,transparent:true,depthTest:false,depthWrite:false,side:DoubleSide}));
    mesh.renderOrder=1;
    const pos=new Vector3(-Math.cos(h.pitch)*Math.sin(h.yaw),Math.sin(h.pitch),Math.cos(h.pitch)*Math.cos(h.yaw)).multiplyScalar(HOTSPOT_R);
    mesh.position.copy(pos);
    mesh.userData={baseScale:1,hoverScale:1.25,onSelect:()=>{void goTo(h.target,h);}};
    return mesh;
  };

  const clearGroup=(g:Group)=>{
    for(const child of [...g.children]){
      g.remove(child);
      const m=child as Mesh;
      const mat=m.material as MeshBasicMaterial|undefined;
      mat?.map?.dispose();mat?.dispose();m.geometry?.dispose();
      const idx=clickables.indexOf(child as Clickable);if(idx>=0)clickables.splice(idx,1);
    }
  };

  const showScene=async(id:string,via?:Hotspot):Promise<boolean>=>{
    const target=sceneOf(id);
    if(!target)return false;
    opts.ensureScene?.(id);
    // Panorama pas encore téléchargé (lien public) : on attend un peu.
    for(let i=0;i<120&&!sceneOf(id)?.dataUrl;i++)await wait(250);
    const src=sceneOf(id)?.dataUrl;
    if(!src)return false;
    let canvasImg:HTMLCanvasElement;
    try{canvasImg=await loadReduced(src,maxTex);}catch{return false;}
    if(ended)return false;
    const tex=new CanvasTexture(canvasImg);tex.colorSpace=SRGBColorSpace;
    tex.generateMipmaps=false;tex.minFilter=LinearFilter;
    const previous=panoTexture;
    sphereMat.map=tex;sphereMat.color.setScalar(1);sphereMat.needsUpdate=true;
    panoTexture=tex;previous?.dispose();
    currentId=id;
    // Orientation d'arrivée : vue propre à la flèche utilisée, sinon celle du panorama.
    alignYaw=via?.arrivalYaw??target.arrivalYaw??0;
    alignPending=true;
    clearGroup(hotspotGroup);
    for(const h of target.hotspots){
      const m=await makeHotspot(h);
      if(m){hotspotGroup.add(m);clickables.push(m as Clickable);}
    }
    opts.onSceneChange?.(id);
    return true;
  };

  async function goTo(id:string,via?:Hotspot){
    if(busy||ended||id===currentId&&!via)return;
    busy=true;closePanels();
    fadeTarget=0;await wait(180);
    const ok=await showScene(id,via);
    fadeTarget=1;
    busy=false;
    if(!ok)setNotice('Ce panorama n\'est pas encore disponible.');
  }

  // ---- panneaux flottants (barre, galerie, texte) ----------------------------------------------------------
  const theme=project().barStyle;
  const panelBg=theme?.background??'#c2c5c6',panelLine=theme?.outline??'#987974',btnBg=theme?.button??'#5d131a',btnLine=theme?.buttonOutline??'#4a1518',iconColor=theme?.icon??'#f4d69a';
  const barGroup=new Group();ui.add(barGroup);
  const panelGroup=new Group();ui.add(panelGroup);
  const noticeGroup=new Group();ui.add(noticeGroup);

  const addPlane=(parent:Group,w:number,h:number,tex:Texture,order:number,x:number,y:number,z=0):Mesh=>{
    const m=new Mesh(new PlaneGeometry(w,h),new MeshBasicMaterial({map:tex,transparent:true,depthTest:false,depthWrite:false,side:DoubleSide}));
    m.renderOrder=order;m.position.set(x,y,z);parent.add(m);return m;
  };
  const backdrop=(w:number,h:number)=>canvasTexture(Math.round(w*600),Math.round(h*600),c=>{
    roundRect(c,6,6,c.canvas.width-12,c.canvas.height-12,36);
    c.fillStyle=panelBg;c.fill();c.lineWidth=8;c.strokeStyle=panelLine;c.stroke();
  });
  const buttonTexture=async(label:string,iconSrc:string|undefined,glyph:string,wide=false):Promise<CanvasTexture>=>{
    const img=iconSrc?await loadImage(iconSrc):null;
    const W=wide?420:300,H=360;
    return canvasTexture(W,H,c=>{
      roundRect(c,8,8,W-16,H-16,48);c.fillStyle=btnBg;c.fill();c.lineWidth=7;c.strokeStyle=btnLine;c.stroke();
      if(img){
        const s=Math.min(190/img.width,190/img.height);
        c.drawImage(img,(W-img.width*s)/2,40+(190-img.height*s)/2,img.width*s,img.height*s);
      }else{
        c.fillStyle=iconColor;c.font='bold 150px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(glyph,W/2,135);
      }
      c.fillStyle=iconColor;c.font='bold 38px sans-serif';c.textAlign='center';c.textBaseline='alphabetic';
      let t=label;while(c.measureText(t).width>W-36&&t.length>2)t=t.slice(0,-2);
      c.fillText(t===label?t:t.trimEnd()+'…',W/2,H-50);
    });
  };
  const addButton=(parent:Group,w:number,h:number,tex:Texture,x:number,y:number,onSelect:()=>void,order=4)=>{
    const m=addPlane(parent,w,h,tex,order,x,y,0.002) as unknown as Clickable;
    m.userData={baseScale:1,hoverScale:1.08,onSelect};clickables.push(m);return m;
  };

  const placeInFront=(g:Group,distance:number,drop:number)=>{
    const h=headForward();
    // direction avant (phi mesuré depuis +z) : avant = (sin phi, cos phi)
    g.position.set(h.x+Math.sin(h.phi)*distance,h.y-drop,h.z+Math.cos(h.phi)*distance);
    g.lookAt(h.x,h.y-drop+drop*.6,h.z);
  };

  let barPlacedPhi=0;
  const buildBar=async()=>{
    clearGroup(barGroup);
    const items=project().bottomBar??[];
    const bw=.21,bh=.25,gap=.03;
    const entries:{item?:BottomBarItem;label:string}[]=[...items.map(item=>({item,label:item.title})),{label:'Quitter la VR'}];
    const total=entries.length*bw+(entries.length-1)*gap;
    const W=total+.12,H=bh+.1;
    addPlane(barGroup,W,H,backdrop(W,H),2,0,0);
    let x=-total/2+bw/2;
    for(const e of entries){
      if(e.item){
        const item=e.item;
        const icon=project().icons?.find(i=>i.id===item.iconId);
        const tex=await buttonTexture(item.title,icon?.dataUrl,GLYPH[item.builtinIcon??'info']??'i');
        addButton(barGroup,bw,bh,tex,x,0,()=>onBarItem(item));
      }else{
        const tex=await buttonTexture('Quitter la VR',undefined,'✕');
        addButton(barGroup,bw,bh,tex,x,0,()=>{void session.end();});
      }
      x+=bw+gap;
    }
    placeInFront(barGroup,1.5,.55);
    barPlacedPhi=headForward().phi;
  };

  function closePanels(){
    clearGroup(panelGroup);
    for(const c of [...clickables]){if((c as Object3D).userData.panel){const i=clickables.indexOf(c);if(i>=0)clickables.splice(i,1);}}
  }
  const addPanelButton=(w:number,h:number,tex:Texture,x:number,y:number,onSelect:()=>void)=>{
    const m=addButton(panelGroup,w,h,tex,x,y,onSelect,6);m.userData={...m.userData};(m as Object3D).userData.panel=true;return m;
  };
  const closeButtonTexture=()=>canvasTexture(240,110,c=>{
    roundRect(c,6,6,228,98,40);c.fillStyle=btnBg;c.fill();c.lineWidth=6;c.strokeStyle=btnLine;c.stroke();
    c.fillStyle=iconColor;c.font='bold 46px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('Fermer',120,58);
  });

  let noticeTimer=0;
  const setNotice=(text:string)=>{
    clearGroup(noticeGroup);
    const tex=canvasTexture(900,160,c=>{
      roundRect(c,6,6,888,148,40);c.fillStyle='rgba(20,20,24,.85)';c.fill();
      c.fillStyle='#fff';c.font='bold 44px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,450,82);
    });
    addPlane(noticeGroup,.9,.16,tex,7,0,0);
    placeInFront(noticeGroup,1.4,-.25);
    clearTimeout(noticeTimer);noticeTimer=window.setTimeout(()=>clearGroup(noticeGroup),2600);
  };

  const showText=(title:string,text:string)=>{
    closePanels();
    const W=1.1,H=.8;
    const tex=canvasTexture(1100,800,c=>{
      roundRect(c,6,6,1088,788,50);c.fillStyle=panelBg;c.fill();c.lineWidth=8;c.strokeStyle=panelLine;c.stroke();
      c.fillStyle='#1b1b1f';c.font='bold 56px sans-serif';c.textAlign='left';c.textBaseline='top';c.fillText(title,60,50);
      c.font='40px sans-serif';
      wrapText(c,text||'Aucune information renseignée.',980).slice(0,10).forEach((l,i)=>c.fillText(l,60,150+i*54));
    });
    addPlane(panelGroup,W,H,tex,5,0,0);
    addPanelButton(.24,.11,closeButtonTexture(),0,-H/2+.1,closePanels);
    placeInFront(panelGroup,1.5,-.0);
  };

  const showGallery=async(item:BottomBarItem)=>{
    closePanels();
    const entries=galleryEntries(item,project().scenes);
    const perPage=6,cols=3;
    let page=0;
    const render=async()=>{
      closePanels();
      const slice=entries.slice(page*perPage,page*perPage+perPage);
      const W=1.5,H=1.12;
      const bgTex=canvasTexture(1500,1120,c=>{
        roundRect(c,6,6,1488,1108,56);c.fillStyle=panelBg;c.fill();c.lineWidth=8;c.strokeStyle=panelLine;c.stroke();
        c.fillStyle='#1b1b1f';c.font='bold 60px sans-serif';c.textAlign='left';c.textBaseline='top';c.fillText(item.galleryTitle||item.title||'Panoramas',70,48);
      });
      addPlane(panelGroup,W,H,bgTex,5,0,0);
      for(let i=0;i<slice.length;i++){
        const e=slice[i];
        const col=i%cols,row=Math.floor(i/cols);
        const cw=.44,ch=.4;
        const x=(col-1)*(cw+.04),y=.16-row*(ch+.06);
        let thumb:HTMLCanvasElement|null=null;
        const src=sceneOf(e.sceneId)?.dataUrl;
        if(src){try{thumb=await loadReduced(src,320);}catch{thumb=null;}}
        const tex=canvasTexture(440,400,c=>{
          roundRect(c,6,6,428,388,34);c.fillStyle=e.sceneId===currentId?btnLine:btnBg;c.fill();c.lineWidth=7;c.strokeStyle=e.sceneId===currentId?iconColor:btnLine;c.stroke();
          c.save();roundRect(c,22,22,396,250,24);c.clip();
          if(thumb)c.drawImage(thumb,22,22,396,250);else{c.fillStyle='#333';c.fillRect(22,22,396,250);}
          c.restore();
          c.fillStyle=iconColor;c.font='bold 38px sans-serif';c.textAlign='center';c.textBaseline='alphabetic';
          let t=e.label;while(c.measureText(t).width>390&&t.length>2)t=t.slice(0,-2);
          c.fillText(t===e.label?t:t.trimEnd()+'…',220,336);
        });
        addPanelButton(cw,ch,tex,x,y,()=>{void goTo(e.sceneId);});
      }
      const pages=Math.max(1,Math.ceil(entries.length/perPage));
      if(pages>1){
        const nav=(label:string,dx:number,to:number)=>addPanelButton(.2,.11,canvasTexture(200,110,c=>{
          roundRect(c,6,6,188,98,40);c.fillStyle=btnBg;c.fill();c.lineWidth=6;c.strokeStyle=btnLine;c.stroke();
          c.fillStyle=iconColor;c.font='bold 52px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(label,100,58);
        }),dx,-H/2+.1,()=>{page=(to+pages)%pages;void render();});
        nav('◀',-.55,page-1);nav('▶',.55,page+1);
      }
      addPanelButton(.24,.11,closeButtonTexture(),0,-H/2+.1,closePanels);
      placeInFront(panelGroup,1.6,-.0);
    };
    await render();
  };

  function onBarItem(item:BottomBarItem){
    if(item.type==='gallery'){void showGallery(item);return;}
    if(item.type==='navigation'){void goTo(item.target||project().scenes[0].id);return;}
    if(item.type==='information'){showText(item.title,item.text);return;}
    setNotice('Ce bouton s\'ouvre dans la visite classique.');
  }

  // ---- manettes ---------------------------------------------------------------------------------------------
  const raycaster=new Raycaster();
  const controllers=[0,1].map(i=>{
    const c=renderer.xr.getController(i);
    const geo=new BufferGeometry();geo.setAttribute('position',new Float32BufferAttribute([0,0,0,0,0,-3],3));
    const line=new Line(geo,new LineBasicMaterial({color:0xffffff,transparent:true,opacity:.7,depthTest:false}));
    line.renderOrder=9;c.add(line);scene.add(c);
    disposables.push(geo,line.material as LineBasicMaterial);
    return c;
  });
  const hits=(c:Object3D):Clickable|null=>{
    const origin=new Vector3(),dir=new Vector3(0,0,-1);
    c.getWorldPosition(origin);
    dir.transformDirection(c.matrixWorld);
    raycaster.set(origin,dir);
    const live=clickables.filter(m=>m.parent&&m.visible);
    // Ordre de priorité : panneaux (devant) avant les flèches.
    const found=raycaster.intersectObjects(live,false);
    if(!found.length)return null;
    found.sort((a,b)=>((b.object as Mesh).renderOrder-(a.object as Mesh).renderOrder)||a.distance-b.distance);
    return found[0].object as Clickable;
  };
  controllers.forEach(c=>{
    c.addEventListener('selectstart',()=>{const t=hits(c);t?.userData.onSelect?.();});
    // Prise (gâchette latérale) : ramène la barre devant soi.
    c.addEventListener('squeezestart',()=>{void buildBar();});
  });

  // ---- boucle de rendu --------------------------------------------------------------------------------------
  const tick=()=>{
    if(alignPending){
      const h=headForward();
      // Attend la première vraie pose de la tête.
      if(h.x!==0||h.y!==0||h.z!==0){alignToHead(alignYaw);alignPending=false;}
    }
    fade+=(fadeTarget-fade)*.35;
    if(Math.abs(fadeTarget-fade)<.01)fade=fadeTarget;
    if(panoTexture)sphereMat.color.setScalar(fade);
    hotspotGroup.visible=fade>.6;
    // Flèches toujours face au spectateur.
    const cam=renderer.xr.getCamera();const camPos=new Vector3();cam.getWorldPosition(camPos);
    for(const m of hotspotGroup.children)m.lookAt(camPos);
    // Barre : suit doucement le regard quand on s'en détourne trop.
    const hf=headForward();
    let diff=hf.phi-barPlacedPhi;diff=Math.atan2(Math.sin(diff),Math.cos(diff));
    if(Math.abs(diff)>1.1&&barGroup.children.length&&!panelGroup.children.length){void buildBar();}
    // Survol.
    const hovered=new Set<Clickable>();
    controllers.forEach(c=>{if(c.visible){const t=hits(c);if(t)hovered.add(t);}});
    for(const m of clickables){
      const base=m.userData.baseScale??1,wanted=hovered.has(m)?(m.userData.hoverScale??1):base;
      const cur=m.scale.x;m.scale.setScalar(cur+(wanted-cur)*.3);
    }
    renderer.render(scene,camera);
  };
  renderer.setAnimationLoop(tick);

  const stop=()=>{
    if(ended)return;
    ended=true;
    renderer.setAnimationLoop(null);
    clearTimeout(noticeTimer);
    clearGroup(hotspotGroup);clearGroup(barGroup);clearGroup(panelGroup);clearGroup(noticeGroup);
    panoTexture?.dispose();disposables.forEach(d=>d.dispose());
    renderer.dispose();
    opts.onEnd?.(currentId);
  };
  session.addEventListener('end',stop);

  // Première scène + barre.
  const first=await showScene(opts.startSceneId);
  if(!first&&!ended){setNotice('Panorama indisponible.');}
  fade=1;fadeTarget=1;
  await buildBar();
  return ()=>{if(!ended)void session.end();};
}
