import {
  CanvasTexture,Color,LinearFilter,DoubleSide,Group,Line,BufferGeometry,LineBasicMaterial,Float32BufferAttribute,Mesh,MeshBasicMaterial,
  PerspectiveCamera,PlaneGeometry,Raycaster,Scene as ThreeScene,SphereGeometry,SRGBColorSpace,Vector3,WebGLRenderer,RepeatWrapping,type Object3D,type Texture
} from 'three';
import type {StudioProject,Scene,Hotspot,BottomBarItem} from './storage';
import {galleryEntries} from './gallery';

/**
 * Mode VR de base (WebXR) pour casque Meta Quest : panorama 360° autour du spectateur, flèches de navigation cliquables
 * avec la manette, barre flottante, galerie de panoramas. Les panoramas sont allégés (4096 px max) pour le casque.
 * Les cadres photo/vidéo en perspective et la musique ne font pas encore partie de cette version.
 * Les points d'information texte, le style de barre et la galerie restent accessibles.
 */
export const VR_MAX_TEXTURE=4096;
const SPHERE_R=10,HOTSPOT_R=6;
const POINTER_MAX=2.2; // Un laser court ; point bleu sur la vraie cible.

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

  const getIconUrl=(id?:string)=>id?project().icons?.find(i=>i.id===id)?.dataUrl:undefined;
  // Les logos Cloud peuvent arriver après le chargement des panoramas.
  const currentIconSignature=()=>[...(project().icons??[]).map(i=>i.id+':'+(i.dataUrl??'')),...(project().bottomBar??[]).map(i=>i.id+':'+(i.iconId??''))].join('|');
  let iconSignature=currentIconSignature();
  let refreshBusy=false;
  const makeHotspot=async(h:Hotspot):Promise<Mesh|null>=>{
    if(h.type!=='navigation'&&h.type!=='information'&&h.type!=='lien'&&h.type!=='image'&&h.type!=='video')return null;
    if(h.type==='navigation'&&!h.target)return null;
    const iconUrl=getIconUrl(h.iconId);
    const img=iconUrl?await loadImage(iconUrl):null;
    if(h.type==='navigation'&&h.sphere&&h.target){
      const radius=Math.max(.09,Math.min(.18,(h.iconSize??48)/90*.15));
      const mesh=new Mesh(new SphereGeometry(radius,32,20),new MeshBasicMaterial({color:0xd4edf5,transparent:true,opacity:.94,depthTest:false,depthWrite:false}));
      const pos=new Vector3(-Math.cos(h.pitch)*Math.sin(h.yaw),Math.sin(h.pitch),Math.cos(h.pitch)*Math.cos(h.yaw)).multiplyScalar(HOTSPOT_R);
      mesh.position.copy(pos);mesh.renderOrder=2;
      mesh.userData={baseScale:1,hoverScale:1.18,onSelect:()=>void goTo(h.target,h)};
      opts.ensureScene?.(h.target);
      const loadSphere=async()=>{
        for(let attempt=0;attempt<30&&!ended;attempt++){
          const url=sceneOf(h.target)?.dataUrl;
          if(url){
            try{
              const pano=await loadReduced(url,512);
              if(ended||!mesh.parent)return;
              const texture=new CanvasTexture(pano);texture.colorSpace=SRGBColorSpace;texture.wrapS=RepeatWrapping;
              const material=mesh.material as MeshBasicMaterial;
              material.map=texture;material.color.set(0xffffff);material.opacity=1;material.needsUpdate=true;
              return;
            }catch{}
          }
          await wait(450);
        }
      };
      void loadSphere();
      return mesh;
    }
    const tex=canvasTexture(256,256,c=>{
      if(img){c.drawImage(img,0,0,256,256);return;}
      c.fillStyle='rgba(20,20,24,.72)';c.beginPath();c.arc(128,128,120,0,Math.PI*2);c.fill();
      c.lineWidth=10;c.strokeStyle='#ffffff';c.stroke();
      c.strokeStyle='#ffffff';c.lineWidth=22;c.lineCap='round';c.lineJoin='round';
      if(h.type==='navigation'){c.beginPath();c.moveTo(88,148);c.lineTo(128,100);c.lineTo(168,148);c.stroke();}
      else {c.font='bold 144px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(h.type==='information'?'i':h.type==='lien'?'↗':h.type==='video'?'▶':'▣',128,130);}
    });
    const size=Math.min(.30,Math.max(.12,(h.iconSize??28)/48*.20));
    const mesh=new Mesh(new PlaneGeometry(size,size),new MeshBasicMaterial({map:tex,transparent:true,depthTest:false,depthWrite:false,side:DoubleSide}));
    mesh.renderOrder=1;
    const pos=new Vector3(-Math.cos(h.pitch)*Math.sin(h.yaw),Math.sin(h.pitch),Math.cos(h.pitch)*Math.cos(h.yaw)).multiplyScalar(HOTSPOT_R);
    mesh.position.copy(pos);
    mesh.userData={baseScale:1,hoverScale:1.25,onSelect:()=>{
      if(h.type==='navigation')void goTo(h.target,h);
      else {
        // Toujours lire la dernière version du point : les médias Cloud peuvent
        // finir de charger après la création des icônes WebXR.
        const live=sceneOf(currentId)?.hotspots.find(p=>p.id===h.id)??h;
        if(live.type==='information'){
          // Un point « i » est d'abord une fiche de renseignements : ne pas
          // remplacer son texte par l'image associée.
          const detail=(live.text||'').trim();
          if(detail){showText(live.title||'Informations',detail);return;}
          if(live.imageDataUrl||live.imageUrl){void showPhoto(live);return;}
          showText(live.title||'Informations','Aucune information renseignée.');return;
        }
        if(live.type==='image'){void showPhoto(live);return;}
        if(live.type==='lien'){showText(live.title||'Lien',live.url||'Aucun lien renseigné.');return;}
        setNotice('Cette vidéo est disponible dans la visite classique.');
      }
    }};
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
  // Icônes de la barre Quest : mêmes boutons ronds que la visite NovaStudio.
  // Les PNG personnalisés conservent leur charte, mais leurs angles carrés
  // sont masqués par une découpe circulaire dans la texture WebXR.
  const barCircleTexture=async(iconSrc:string|undefined,glyph:string,zoom=100):Promise<CanvasTexture>=>{
    const img=iconSrc?await loadImage(iconSrc):null;
    return canvasTexture(320,320,c=>{
      const cx=160,cy=160,r=151;
      c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);
      c.fillStyle=btnBg;c.fill();
      c.save();
      c.beginPath();c.arc(cx,cy,r-6,0,Math.PI*2);c.clip();
      if(img){
        // Respecte les proportions du vrai logo NovaStudio et son zoom défini
        // dans l'éditeur, plutôt que de le forcer dans une image carrée.
        const factor=Math.max(1,Math.min(2.5,zoom/100));
        const scale=Math.min(268/img.width,268/img.height)*factor;
        const w=img.width*scale,h=img.height*scale;
        c.drawImage(img,(320-w)/2,(320-h)/2,w,h);
      }else{
        c.fillStyle=iconColor;
        c.font='bold 168px sans-serif';c.textAlign='center';c.textBaseline='middle';
        c.fillText(glyph,cx,cy+6);
      }
      c.restore();
      c.beginPath();c.arc(cx,cy,r-4,0,Math.PI*2);
      c.lineWidth=7;c.strokeStyle=btnLine;c.stroke();
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
    const bw=.145,bh=.145,gap=.013;
    const entries:{item?:BottomBarItem;label:string}[]=[...items.map(item=>({item,label:item.title})),{label:'Quitter la VR'}];
    const total=entries.length*bw+(entries.length-1)*gap;
    const W=total+.08,H=bh+.045;
    addPlane(barGroup,W,H,backdrop(W,H),2,0,0);
    let x=-total/2+bw/2;
    for(const e of entries){
      if(e.item){
        const item=e.item;
        const icon=project().icons?.find(i=>i.id===item.iconId);
        const tex=await barCircleTexture(icon?.dataUrl,GLYPH[item.builtinIcon??'info']??'i',item.iconZoom??100);
        const hover=project().icons?.find(i=>i.id===item.hoverIconId);
        const pressed=project().icons?.find(i=>i.id===item.pressedIconId);
        const hoverTex=hover?.dataUrl?await barCircleTexture(hover.dataUrl,GLYPH[item.builtinIcon??'info']??'i',item.iconZoom??100):null;
        const pressedTex=pressed?.dataUrl?await barCircleTexture(pressed.dataUrl,GLYPH[item.builtinIcon??'info']??'i',item.iconZoom??100):null;
        const btn=addButton(barGroup,bw,bh,tex,x,0,()=>onBarItem(item));
        btn.userData.vrIconStates={normal:tex,hover:hoverTex,pressed:pressedTex,pressedUntil:0};
      }else{
        const tex=await barCircleTexture(undefined,'✕');
        addButton(barGroup,bw,bh,tex,x,0,()=>{void session.end();});
      }
      x+=bw+gap;
    }
    placeInFront(barGroup,1.55,1.08);
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

  // Photos cliquables (ex. cafetière) : vraie fenêtre-image en 3D, sans
  // quitter WebXR, fermable avec la gâchette sur « Fermer ».
  const showPhoto=async(h:Hotspot)=>{
    const src=h.imageDataUrl||h.imageUrl;
    if(!src){setNotice('Photo en cours de chargement…');opts.ensureScene?.(currentId);return;}
    const shownFor=currentId;
    let bitmap:HTMLCanvasElement;
    try{bitmap=await loadReduced(src,1400);}
    catch{setNotice('Impossible de charger cette photo.');return;}
    if(ended||shownFor!==currentId)return;
    closePanels();
    const ratio=bitmap.width/Math.max(1,bitmap.height);
    const maxW=1.42,maxH=.92;
    const w=Math.min(maxW,maxH*ratio);
    const hgt=Math.min(maxH,maxW/ratio);
    const W=Math.max(.65,w+.1),H=hgt+.24;
    const frame=canvasTexture(1024,1024,c=>{
      roundRect(c,8,8,1008,1008,56);c.fillStyle=panelBg;c.fill();
      c.lineWidth=8;c.strokeStyle=panelLine;c.stroke();
    });
    addPlane(panelGroup,W,H,frame,5,0,0);
    const photoTex=new CanvasTexture(bitmap);photoTex.colorSpace=SRGBColorSpace;
    photoTex.minFilter=LinearFilter;
    addPlane(panelGroup,w,hgt,photoTex,6,0,.055);
    const titleTex=canvasTexture(960,120,c=>{
      c.fillStyle='#17232b';c.font='bold 47px sans-serif';c.textAlign='center';c.textBaseline='middle';
      let title=h.title||'Photo';while(c.measureText(title).width>900&&title.length>3)title=title.slice(0,-2);
      c.fillText(title===h.title?title:title+'…',480,60);
    });
    addPlane(panelGroup,Math.min(W-.10,1.25),.10,titleTex,7,0,H/2-.08);
    addPanelButton(.24,.11,closeButtonTexture(),0,-H/2+.08,closePanels);
    placeInFront(panelGroup,1.55,0);
  };

  const showGallery=async(item:BottomBarItem)=>{
    closePanels();
    const entries=galleryEntries(item,project().scenes,project().spaces);
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
    if(item.type==='navigation'){
      if(item.target){void goTo(item.target);return;}
      // Bouton Espaces sans cible : affiche la liste des panoramas et espaces.
      void showGallery({...item,type:'gallery',galleryTitle:item.title||'Espaces',gallery:project().scenes.map(scene=>({sceneId:scene.id,label:scene.name})),gallerySpaceIds:project().spaces?.map(space=>space.id)});return;
    }
    if(item.type==='information'){showText(item.title,item.text);return;}
    if(item.type==='lien'){showText(item.title,item.url||'Aucun lien renseigné.');return;}
    setNotice('Ce bouton s\'ouvre dans la visite classique.');
  }

  // ---- manettes ---------------------------------------------------------------------------------------------
  const raycaster=new Raycaster();
  const controllers=[0,1].map(i=>{
    const c=renderer.xr.getController(i);
    const geo=new BufferGeometry();geo.setAttribute('position',new Float32BufferAttribute([0,0,0,0,0,-POINTER_MAX],3));
    const line=new Line(geo,new LineBasicMaterial({color:0xbce6fb,transparent:true,opacity:.65,depthTest:false}));
    line.renderOrder=9;c.add(line);scene.add(c);
    const dot=new Mesh(new SphereGeometry(.022,12,8),new MeshBasicMaterial({color:0x13c7ff,depthTest:false,depthWrite:false}));
    dot.renderOrder=12;dot.visible=false;scene.add(dot);
    c.userData.vrPointer={geo,dot};
    disposables.push(dot.geometry,dot.material as MeshBasicMaterial);
    disposables.push(geo,line.material as LineBasicMaterial);
    return c;
  });
  const hits=(c:Object3D):{target:Clickable|null;point:Vector3|null;distance:number}=>{
    const origin=new Vector3(),dir=new Vector3(0,0,-1);
    c.getWorldPosition(origin);
    dir.transformDirection(c.matrixWorld);
    raycaster.set(origin,dir);
    const live=clickables.filter(m=>m.parent&&m.visible);
    // Les panneaux devant les yeux doivent passer avant les hotspots plus
    // éloignés. Parmi des cibles de même plan, on choisit la plus proche.
    const found=raycaster.intersectObjects(live,false);
    if(!found.length)return {target:null,point:null,distance:POINTER_MAX};
    found.sort((a,b)=>{
      const aPanel=Boolean(a.object.userData.panel),bPanel=Boolean(b.object.userData.panel);
      return Number(bPanel)-Number(aPanel)||a.distance-b.distance;
    });
    return {target:found[0].object as Clickable,point:found[0].point,distance:found[0].distance};
  };
  controllers.forEach(c=>{
    c.addEventListener('selectstart',()=>{
      const h=hits(c),target=h.target;
      if(target){
        const states=target.userData.vrIconStates as {pressedUntil:number}|undefined;
        if(states)states.pressedUntil=performance.now()+180;
        target.userData.onSelect?.();
      }
    });
    // Prise (gâchette latérale) : ramène la barre devant soi.
    c.addEventListener('squeezestart',()=>{void buildBar();});
  });

  // ---- boucle de rendu --------------------------------------------------------------------------------------
  let lastRefreshCheck=0;
  let lastFrameAt=0;
  const tick=()=>{
    // Rotation du panorama au joystick (Meta Quest Touch) sans bouger
    // physiquement le visiteur. Les hotspots pivotent avec le panorama.
    const frameAt=performance.now();
    const dt=lastFrameAt?Math.min(.05,(frameAt-lastFrameAt)/1000):0;
    lastFrameAt=frameAt;
    const inputs=renderer.xr.getSession()?.inputSources??[];
    let turn=0;
    for(const source of inputs){
      const axes=source.gamepad?.axes;
      if(!axes||axes.length<2)continue;
      const horizontal=axes.length>=4?axes[2]:axes[0];
      if(typeof horizontal==='number'&&Math.abs(horizontal)>.2){
        turn=horizontal;
        break;
      }
    }
    if(turn&&dt&&!alignPending&&!busy){
      const direction=Math.sign(turn)*(Math.abs(turn)-.2)/.8;
      root.rotation.y-=direction*dt*1.15;
    }
    const now=performance.now();
    if(now-lastRefreshCheck>900&&!refreshBusy&&!ended){
      lastRefreshCheck=now;
      const signature=currentIconSignature();
      if(signature!==iconSignature){
        iconSignature=signature;refreshBusy=true;
        void (async()=>{
          await buildBar();
          const active=sceneOf(currentId);
          if(active){
            clearGroup(hotspotGroup);
            for(const h of active.hotspots){const m=await makeHotspot(h);if(m){hotspotGroup.add(m);clickables.push(m as Clickable);}}
          }
        })().finally(()=>{refreshBusy=false;});
      }
    }
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
    controllers.forEach(c=>{
      const hit=hits(c),pointer=c.userData.vrPointer as {geo:BufferGeometry;dot:Mesh}|undefined;
      if(hit.target)hovered.add(hit.target);
      if(pointer){
        const length=Math.min(POINTER_MAX,hit.distance);
        const pos=pointer.geo.getAttribute('position') as Float32BufferAttribute;
        pos.setXYZ(1,0,0,-length);pos.needsUpdate=true;pointer.geo.computeBoundingSphere();
        pointer.dot.visible=!!hit.point&&c.visible;
        if(hit.point){pointer.dot.position.copy(hit.point);pointer.dot.scale.setScalar(hit.distance>3?3:1);}
      }
    });
    for(const m of clickables){
      const base=m.userData.baseScale??1,wanted=hovered.has(m)?(m.userData.hoverScale??1):base;
      const cur=m.scale.x;m.scale.setScalar(cur+(wanted-cur)*.3);
      const states=m.userData.vrIconStates as {normal:Texture;hover:Texture|null;pressed:Texture|null;pressedUntil:number}|undefined;
      if(states){
        const selected=states.pressedUntil>now&&states.pressed
          ?states.pressed:hovered.has(m)&&states.hover?states.hover:states.normal;
        const material=(m as Mesh).material as MeshBasicMaterial;
        if(material.map!==selected){material.map=selected;material.needsUpdate=true;}
      }
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
