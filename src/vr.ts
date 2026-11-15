import {
  CanvasTexture,Color,LinearFilter,DoubleSide,Group,Line,BufferGeometry,LineBasicMaterial,Float32BufferAttribute,Mesh,MeshBasicMaterial,
  PerspectiveCamera,PlaneGeometry,Quaternion,Raycaster,Scene as ThreeScene,SphereGeometry,SRGBColorSpace,Vector3,VideoTexture,WebGLRenderer,RepeatWrapping,type Object3D,type Texture
} from 'three';
import type {StudioProject,Scene,Hotspot,BottomBarItem} from './storage';
import {galleryEntries} from './gallery';
import {trimIcon} from './iconFit';
import {resolveLink} from './mediaLinks';
import {getPrefs} from './visitorPrefs';

/**
 * Mode VR de base (WebXR) pour casque Meta Quest : panorama 360° autour du spectateur, flèches de navigation cliquables
 * avec la manette, barre flottante, galerie de panoramas. Les panoramas sont allégés (4096 px max) pour le casque.
 * Dans le casque : points d'information (texte en pages, ou pages d'un mini-site via /vr.json), photos, vidéos MP4/WebM, galerie de photos de la barre.
 * Les cadres photo/vidéo en perspective dans le panorama ne sont pas encore affichés ; la musique continue de jouer via la page.
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
  /** Afficher une page externe dans l'iframe absolue de la visite 2D après sortie de WebXR. */
  onOpenEmbedded?:(title:string,url:string)=>void;
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
/** Facteur de définition des textures de panneaux : le casque a une résolution élevée, un panneau 1×1 px par pixel paraîtrait flou. */
const TEX_Q=2;
function canvasTexture(w:number,h:number,draw:(c:CanvasRenderingContext2D)=>void):CanvasTexture{
  const k=document.createElement('canvas');k.width=Math.round(w*TEX_Q);k.height=Math.round(h*TEX_Q);
  const c=k.getContext('2d')!;
  c.scale(TEX_Q,TEX_Q);            // on dessine toujours en coordonnées « logiques » w × h
  draw(c);
  const t=new CanvasTexture(k);t.colorSpace=SRGBColorSpace;t.anisotropy=8;return t;
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
  // Netteté dans le casque : tampon d'image plus grand (avant le début de la session) et pas de dégradé de définition sur les bords.
  try{renderer.xr.setFramebufferScaleFactor(1.5);}catch{/* non pris en charge */}
  const maxTex=Math.min(VR_MAX_TEXTURE,renderer.capabilities.maxTextureSize);
  await renderer.xr.setSession(session);
  try{renderer.xr.setFoveation(0);}catch{/* non pris en charge */}

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
          const detail=(live.text||'').trim();
          const body=infoText(live);
          if(!body&&(live.imageDataUrl||live.imageUrl)){void showPhoto(live);return;}
          const url=live.url||((body.match(/https?:\/\/[^\s]+/i)||[])[0]);
          if(body){showInfo(live.title||'Informations',body,url);return;}
          if(url){void showWebContent(live.title||'Informations',url,'');return;}
          showText(live.title||'Informations',detail||'Aucune information renseignée.');
          return;
        }
        if(live.type==='image'){void showPhoto(live);return;}
        if(live.type==='lien'){
          const body=infoText(live);
          if(body)showInfo(live.title||'Lien',body,live.url);
          else void showWebContent(live.title||'Lien',live.url||'','');
          return;
        }
        if(live.type==='video'){
          const direct=live.videoDataUrl||live.videoUrl;
          if(direct)void showVideoPanel(direct,live.title||'Vidéo');
          else setNotice('Cette vidéo se lit dans la visite classique.');
          return;
        }
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
    roundRect(c,6,6,Math.round(w*600)-12,Math.round(h*600)-12,36);
    c.fillStyle=panelBg;c.fill();c.lineWidth=8;c.strokeStyle=panelLine;c.stroke();
  });
  // Icônes de la barre Quest : mêmes boutons ronds que la visite NovaStudio.
  // Les PNG personnalisés conservent leur charte, mais leurs angles carrés
  // sont masqués par une découpe circulaire dans la texture WebXR.
  const barCircleTexture=async(iconSrc:string|undefined,glyph:string,zoom=100):Promise<CanvasTexture>=>{
    // Même recadrage transparent que la visite 360 classique.
    const trimmed=iconSrc&&project().barIconTrim!==false?await trimIcon(iconSrc):iconSrc;
    const img=trimmed?await loadImage(trimmed):null;
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

  // Les fenêtres gardent leur place quand on passe de l'une à l'autre (photo suivante, page, retour galerie) : elles ne suivent plus le regard.
  let panelAnchor:{pos:Vector3;quat:Quaternion}|null=null;
  let panelReplace=false;
  const placePanel=(distance:number,drop:number)=>{
    if(panelReplace&&panelAnchor){panelGroup.position.copy(panelAnchor.pos);panelGroup.quaternion.copy(panelAnchor.quat);return;}
    placeInFront(panelGroup,distance,drop);
    panelAnchor={pos:panelGroup.position.clone(),quat:panelGroup.quaternion.clone()};
  };
  let activeVideo:{el:HTMLVideoElement;tex:VideoTexture}|null=null;
  const stopVideo=()=>{
    if(!activeVideo)return;
    try{activeVideo.el.pause();activeVideo.el.removeAttribute('src');activeVideo.el.load();}catch{/* déjà arrêtée */}
    activeVideo.tex.dispose();activeVideo=null;
  };
  function closePanels(){
    panelReplace=panelGroup.children.length>0;
    stopVideo();
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

  /** Texte en pages : chaque page tient dans le panneau, avec ◀ ▶ quand le contenu est long (plus de coupure à 10 lignes). */
  const navTexture=(label:string,w=200)=>canvasTexture(w,110,c=>{
    roundRect(c,6,6,w-12,98,40);c.fillStyle=btnBg;c.fill();c.lineWidth=6;c.strokeStyle=btnLine;c.stroke();
    c.fillStyle=iconColor;c.font='bold 52px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(label,w/2,58);
  });
  /** Cadre commun des galeries : titre en haut à gauche, compteur, bouton ✕ rond en haut à droite, flèches ◀ ▶ au milieu des côtés (hors des vignettes). */
  const closeIconTexture=()=>canvasTexture(110,110,c=>{
    c.beginPath();c.arc(55,55,49,0,Math.PI*2);c.fillStyle=btnBg;c.fill();c.lineWidth=6;c.strokeStyle=btnLine;c.stroke();
    c.strokeStyle=iconColor;c.lineWidth=9;c.lineCap='round';
    c.beginPath();c.moveTo(36,36);c.lineTo(74,74);c.moveTo(74,36);c.lineTo(36,74);c.stroke();
  });
  const sideArrowTexture=(label:string)=>canvasTexture(110,230,c=>{
    roundRect(c,6,6,98,218,44);c.fillStyle=btnBg;c.fill();c.lineWidth=6;c.strokeStyle=btnLine;c.stroke();
    c.fillStyle=iconColor;c.font='bold 62px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(label,55,120);
  });
  const galleryChrome=(W:number,H:number,title:string,count:string,pages:number,page:number,onPrev:()=>void,onNext:()=>void)=>{
    addPlane(panelGroup,W,H,canvasTexture(W*1000,H*1000,c=>{
      roundRect(c,6,6,W*1000-12,H*1000-12,56);c.fillStyle=panelBg;c.fill();c.lineWidth=8;c.strokeStyle=panelLine;c.stroke();
      c.fillStyle='#1b1b1f';c.font='bold 58px sans-serif';c.textAlign='left';c.textBaseline='middle';
      let t=title;while(c.measureText(t).width>W*1000-420&&t.length>3)t=t.slice(0,-2);
      c.fillText(t,64,92);
      c.font='34px sans-serif';c.fillStyle='#4a4a52';c.textAlign='right';
      c.fillText(count+(pages>1?'  ·  page '+(page+1)+'/'+pages:''),W*1000-170,92);
    }),5,0,0).userData.blocker=true;
    addPanelButton(.1,.1,closeIconTexture(),W/2-.095,H/2-.095,closePanels);
    if(pages>1){
      addPanelButton(.1,.21,sideArrowTexture('◀'),-(W/2-.075),-.04,onPrev);
      addPanelButton(.1,.21,sideArrowTexture('▶'),W/2-.075,-.04,onNext);
    }
  };
  const showPages=(title:string,pages:{title?:string;text:string}[],extra?:{label:string;onSelect:()=>void})=>{
    closePanels();
    const measure=document.createElement('canvas').getContext('2d')!;
    measure.font='40px sans-serif';
    const LINES=10;
    // Découpe chaque page de texte en blocs de 10 lignes.
    const chunks:{title:string;lines:string[]}[]=[];
    for(const pg of pages){
      const lines=wrapText(measure,(pg.text||'').trim()||'Aucune information renseignée.',980);
      for(let i=0;i<lines.length;i+=LINES)chunks.push({title:pg.title||title,lines:lines.slice(i,i+LINES)});
    }
    if(!chunks.length)chunks.push({title,lines:['Aucune information renseignée.']});
    let page=0;
    const W=1.1,H=.82;
    const render=()=>{
      clearGroup(panelGroup);
      for(const c of [...clickables]){if((c as Object3D).userData.panel){const i=clickables.indexOf(c);if(i>=0)clickables.splice(i,1);}}
      const chunk=chunks[page];
      const tex=canvasTexture(1100,820,c=>{
        roundRect(c,6,6,1088,808,50);c.fillStyle=panelBg;c.fill();c.lineWidth=8;c.strokeStyle=panelLine;c.stroke();
        c.fillStyle='#1b1b1f';c.font='bold 56px sans-serif';c.textAlign='left';c.textBaseline='top';
        let t=chunk.title;while(c.measureText(t).width>980&&t.length>3)t=t.slice(0,-2);
        c.fillText(t,60,46);
        c.font='40px sans-serif';
        chunk.lines.forEach((l,i)=>c.fillText(l,60,140+i*54));
        if(chunks.length>1){c.font='32px sans-serif';c.fillStyle='#4a4a52';c.textAlign='right';c.fillText((page+1)+' / '+chunks.length,1040,52);}
      });
      addPlane(panelGroup,W,H,tex,5,0,0);
      if(chunks.length>1){
        addPanelButton(.2,.11,navTexture('◀'),-.5,-H/2+.1,()=>{page=(page-1+chunks.length)%chunks.length;render();});
        addPanelButton(.2,.11,navTexture('▶'),.5,-H/2+.1,()=>{page=(page+1)%chunks.length;render();});
      }
      if(extra){
        addPanelButton(.24,.11,closeButtonTexture(),-.14,-H/2+.1,closePanels);
        addPanelButton(.38,.11,navTexture(extra.label,380),.2,-H/2+.1,extra.onSelect);
      }else addPanelButton(.24,.11,closeButtonTexture(),0,-H/2+.1,closePanels);
    };
    render();
    placePanel(1.5,-.0);
  };
  const showText=(title:string,text:string)=>showPages(title,[{text}]);
  /** Texte d'un point « i » dans la langue du visiteur (réglage Paramètres), avec le texte français en repli. */
  const infoText=(h:{text?:string;translations?:Partial<Record<string,string>>}):string=>{
    const lang=getPrefs().lang??project().languages?.[0]??'fr';
    return ((lang==='fr'?h.text:(h.translations?.[lang]||h.text))||'').trim();
  };
  const openSiteOutside=(title:string,url:string)=>{
    // Une page web ne peut pas être dessinée dans la scène immersive : on quitte le casque puis la page s'affiche dans NovaStudio.
    void session.end().then(()=>opts.onOpenEmbedded?.(title||'Page web',url)).catch(()=>opts.onOpenEmbedded?.(title||'Page web',url));
  };
  /** Point d'information : le contenu s'affiche TOUJOURS dans la fenêtre du casque ; s'il y a un site lié, un bouton « ↗ Site » est proposé en plus. */
  const showInfo=(title:string,text:string,url?:string)=>{
    const valid=url?safeWebUrl(url):null;
    showPages(title,[{text}],valid?{label:'↗ Site',onSelect:()=>openSiteOutside(title,valid)}:undefined);
  };

  /** Pages d'un mini-site NovaVisio (convention : /vr.json à côté de la page). Retourne null si le site n'en propose pas. */
  const fetchVrDoc=async(url:string):Promise<{title:string;pages:{title?:string;text:string}[]}|null>=>{
    try{
      const base=new URL(url);
      if(base.protocol!=='https:')return null;
      const doc=new URL('vr.json',base);
      const ctl=new AbortController();const timer=window.setTimeout(()=>ctl.abort(),6000);
      const res=await fetch(doc.href,{signal:ctl.signal,referrerPolicy:'no-referrer'});
      clearTimeout(timer);
      if(!res.ok)return null;
      type Doc={title?:string;pages?:{title?:string;text?:string}[];languages?:Record<string,Doc>};
      const data=await res.json() as Doc;
      // Plusieurs langues : on prend celle du visiteur (réglage Paramètres), sinon la première langue du projet, sinon le français.
      const wanted=getPrefs().lang??project().languages?.[0]??'fr';
      const pick=data.languages?(data.languages[wanted]??data.languages.fr??Object.values(data.languages)[0]):data;
      const pages=(pick?.pages??[]).filter(p=>p&&typeof p.text==='string').map(p=>({title:typeof p.title==='string'?p.title:undefined,text:p.text as string}));
      return pages.length?{title:typeof pick?.title==='string'?pick.title:'',pages}:null;
    }catch{return null;}
  };
  // Les pages web ne peuvent pas être rendues comme un panneau HTML dans
  // WebXR. Un vrai bouton ouvre la destination dans le navigateur du Quest
  // après sortie explicite de la session immersive.
  const safeWebUrl=(candidate:string):string|null=>{
    try{
      const u=new URL(candidate.trim());
      return u.protocol==='https:'||u.protocol==='http:'?u.href:null;
    }catch{return null;}
  };
  const showWebLink=(title:string,url:string,description='')=>{
    closePanels();
    const valid=safeWebUrl(url);
    const W=1.24,H=.80;
    const tex=canvasTexture(1240,800,c=>{
      roundRect(c,8,8,1224,784,52);c.fillStyle=panelBg;c.fill();
      c.lineWidth=8;c.strokeStyle=panelLine;c.stroke();
      c.fillStyle='#17232b';c.textAlign='left';c.textBaseline='top';
      c.font='bold 54px sans-serif';c.fillText(title||'Lien internet',65,54,1110);
      c.font='37px sans-serif';
      const caption=description.trim()||'Ouvrir cette page dans le navigateur du casque.';
      wrapText(c,caption,1100).slice(0,5).forEach((line,i)=>c.fillText(line,65,155+i*58));
      c.font='31px sans-serif';
      if(valid)c.fillText(new URL(valid).hostname,65,535,1100);
      else c.fillText('Adresse web indisponible',65,535);
    });
    addPlane(panelGroup,W,H,tex,5,0,0);
    if(valid){
      const action=canvasTexture(650,150,c=>{
        roundRect(c,8,8,634,134,45);c.fillStyle=btnBg;c.fill();
        c.lineWidth=7;c.strokeStyle=btnLine;c.stroke();
        c.fillStyle=iconColor;c.font='bold 49px sans-serif';c.textAlign='center';c.textBaseline='middle';
        c.fillText('↗ Ouvrir le site',325,78);
      });
      addPanelButton(.58,.135,action,0,-.19,()=>{
        // Un iframe HTML ne peut pas être dessiné à l'intérieur d'une
        // scène WebXR immersive. On quitte la session VR puis on affiche
        // l'iframe ABSOLUE existante dans le même onglet de NovaStudio.
        // Aucun window.open ni changement d'adresse.
        void session.end().then(()=>opts.onOpenEmbedded?.(title||'Page web',valid))
          .catch(()=>opts.onOpenEmbedded?.(title||'Page web',valid));
      });
    }
    addPanelButton(.24,.11,closeButtonTexture(),0,-H/2+.055,closePanels);
    placePanel(1.5,0);
  };

  /** Contenu d'une page web : lu directement dans le casque si le site propose /vr.json, sinon panneau « Ouvrir le site » (sortie du casque puis page affichée dans NovaStudio). */
  const showWebContent=async(title:string,url:string,description=''):Promise<void>=>{
    if(!url){showText(title||'Lien','Aucun lien renseigné.');return;}
    setNotice('Chargement…');
    const doc=await fetchVrDoc(url);
    if(ended)return;
    if(doc){showPages(doc.title||title,doc.pages);return;}
    showWebLink(title,url,description);
  };

  // Image en grand dans un panneau 3D (fermable avec la gâchette). `nav` ajoute précédent / suivant / retour à la galerie.
  const showImagePanel=async(src:string|undefined,title:string,nav?:{index:number;count:number;prev:()=>void;next:()=>void;back:()=>void})=>{
    if(!src){setNotice('Photo en cours de chargement…');opts.ensureScene?.(currentId);return;}
    const shownFor=currentId;
    let bitmap:HTMLCanvasElement;
    try{bitmap=await loadReduced(src,2048);}
    catch{setNotice('Impossible de charger cette photo.');return;}
    if(ended||shownFor!==currentId)return;
    closePanels();
    const ratio=bitmap.width/Math.max(1,bitmap.height);
    const maxW=1.42,maxH=.92;
    const w=Math.min(maxW,maxH*ratio);
    const hgt=Math.min(maxH,maxW/ratio);
    const W=Math.max(.95,w+.1),H=hgt+.24;
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
      const label=nav?title+'  ·  '+(nav.index+1)+'/'+nav.count:title;
      let t=label;while(c.measureText(t).width>900&&t.length>3)t=t.slice(0,-2);
      c.fillText(t===label?t:t+'…',480,60);
    });
    addPlane(panelGroup,Math.min(W-.10,1.25),.10,titleTex,7,0,H/2-.08);
    if(nav){
      // Flèches près de l'image (de part et d'autre), « Retour » à la galerie en bas.
      if(nav.count>1){
        addPanelButton(.13,.2,navTexture('◀',130),-(w/2+.1),0,nav.prev);
        addPanelButton(.13,.2,navTexture('▶',130),(w/2+.1),0,nav.next);
      }
      addPanelButton(.34,.11,canvasTexture(340,110,c=>{
        roundRect(c,6,6,328,98,40);c.fillStyle=btnBg;c.fill();c.lineWidth=6;c.strokeStyle=btnLine;c.stroke();
        c.fillStyle=iconColor;c.font='bold 42px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('Galerie',170,58);
      }),-.2,-H/2+.08,nav.back);
      addPanelButton(.24,.11,closeButtonTexture(),.2,-H/2+.08,closePanels);
    }else addPanelButton(.24,.11,closeButtonTexture(),0,-H/2+.08,closePanels);
    placePanel(1.55,0);
  };
  const showPhoto=(h:Hotspot)=>showImagePanel(h.imageDataUrl||h.imageUrl,h.title||'Photo');

  // Galerie de photos / vidéos d'un bouton de la barre (type « photos ») : vignettes puis image en grand.
  const showPhotoGallery=async(item:BottomBarItem)=>{
    closePanels();
    const entries=(item.photos??[]).map(m=>({m,r:resolveLink(m)})).filter(e=>e.r.image||e.r.video||e.r.embed);
    if(!entries.length){showText(item.title||'Photos','Aucune photo dans cette galerie.');return;}
    let page=0;
    const open=async(i:number)=>{
      const e=entries[i];
      const count=entries.length;
      const nav={index:i,count,prev:()=>{void open((i-1+count)%count);},next:()=>{void open((i+1)%count);},back:()=>{void renderGrid();}};
      if(e.m.kind==='photo')await showImagePanel(e.r.image,e.m.name,nav);
      else if(e.r.video)await showVideoPanel(e.r.video,e.m.name);
      else setNotice('Cette vidéo se lit dans la visite classique.');
    };
    const renderGrid=async()=>{
      closePanels();
      const cols=4,rows=2,cw=.34,ch=.30,gx=.04,gy=.05;
      const perPageP=cols*rows;
      const slice=entries.slice(page*perPageP,page*perPageP+perPageP);
      const W=cols*cw+(cols-1)*gx+.32,H=.17+rows*ch+(rows-1)*gy+.1;
      const pages=Math.max(1,Math.ceil(entries.length/perPageP));
      galleryChrome(W,H,item.title||'Photos',entries.length+' éléments',pages,page,
        ()=>{page=(page-1+pages)%pages;void renderGrid();},()=>{page=(page+1)%pages;void renderGrid();});
      for(let k=0;k<slice.length;k++){
        const e=slice[k];
        const col=k%cols,row=Math.floor(k/cols);
        const x=(col-(cols-1)/2)*(cw+gx),y=H/2-.17-ch/2-row*(ch+gy);
        let thumb:HTMLCanvasElement|null=null;
        const src=e.r.thumb??e.r.image;
        if(e.m.kind==='photo'&&src){try{thumb=await loadReduced(src,480);}catch{thumb=null;}}
        const tex=canvasTexture(340,300,c=>{
          roundRect(c,5,5,330,290,28);c.fillStyle=btnBg;c.fill();c.lineWidth=6;c.strokeStyle=btnLine;c.stroke();
          c.save();roundRect(c,16,16,308,196,20);c.clip();
          if(thumb)c.drawImage(thumb,16,16,308,196);else{c.fillStyle='#222';c.fillRect(16,16,308,196);c.fillStyle='#fff';c.font='bold 80px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('▶',170,116);}
          c.restore();
          c.fillStyle=iconColor;c.font='bold 30px sans-serif';c.textAlign='center';c.textBaseline='alphabetic';
          let t=e.m.name;while(c.measureText(t).width>300&&t.length>2)t=t.slice(0,-2);
          c.fillText(t===e.m.name?t:t.trimEnd()+'…',170,258);
        });
        addPanelButton(cw,ch,tex,x,y,()=>{void open(page*perPageP+k);});
      }
      placePanel(1.7,-.0);
    };
    await renderGrid();
  };

  // Vidéo lue dans le casque (fichier MP4/WebM du projet) : panneau 16:9 avec lecture / pause.
  const showVideoPanel=async(src:string|undefined,title:string)=>{
    if(!src){setNotice('Cette vidéo se lit dans la visite classique.');return;}
    closePanels();
    const el=document.createElement('video');
    el.src=src;el.crossOrigin='anonymous';el.loop=true;el.playsInline=true;el.setAttribute('playsinline','');
    el.preload='auto';
    const tex=new VideoTexture(el);tex.colorSpace=SRGBColorSpace;tex.minFilter=LinearFilter;
    activeVideo={el,tex};
    const W=1.6,Hv=W*9/16,H=Hv+.3;
    addPlane(panelGroup,W+.1,H,canvasTexture(1100,700,c=>{roundRect(c,8,8,1084,684,50);c.fillStyle=panelBg;c.fill();c.lineWidth=8;c.strokeStyle=panelLine;c.stroke();}),5,0,0);
    addPlane(panelGroup,W,Hv,tex,6,0,.06);
    addPlane(panelGroup,1.2,.09,canvasTexture(960,72,c=>{
      c.fillStyle='#17232b';c.font='bold 40px sans-serif';c.textAlign='center';c.textBaseline='middle';
      let t=title;while(c.measureText(t).width>900&&t.length>3)t=t.slice(0,-2);c.fillText(t,480,38);
    }),7,0,H/2-.07);
    const toggle=addPanelButton(.3,.11,navTexture('❚❚ / ▶',300),-.2,-H/2+.09,()=>{if(el.paused)void el.play().catch(()=>setNotice('Lecture impossible.'));else el.pause();});
    void toggle;
    addPanelButton(.24,.11,closeButtonTexture(),.2,-H/2+.09,closePanels);
    placePanel(1.7,0);
    void el.play().catch(()=>setNotice('Touche ❚❚ / ▶ pour lancer la vidéo.'));
  };

  const showGallery=async(item:BottomBarItem)=>{
    closePanels();
    const entries=galleryEntries(item,project().scenes,project().spaces);
    const cols=3,rows=2,perPage=cols*rows;
    let page=0;
    const render=async()=>{
      closePanels();
      const slice=entries.slice(page*perPage,page*perPage+perPage);
      const cw=.44,ch=.40,gx=.04,gy=.05;
      const W=cols*cw+(cols-1)*gx+.32,H=.17+rows*ch+(rows-1)*gy+.1;
      const pages=Math.max(1,Math.ceil(entries.length/perPage));
      galleryChrome(W,H,item.galleryTitle||item.title||'Panoramas',entries.length+' panoramas',pages,page,
        ()=>{page=(page-1+pages)%pages;void render();},()=>{page=(page+1)%pages;void render();});
      for(let i=0;i<slice.length;i++){
        const e=slice[i];
        const col=i%cols,row=Math.floor(i/cols);
        const x=(col-(cols-1)/2)*(cw+gx),y=H/2-.17-ch/2-row*(ch+gy);
        let thumb:HTMLCanvasElement|null=null;
        const src=sceneOf(e.sceneId)?.dataUrl;
        if(src){try{thumb=await loadReduced(src,480);}catch{thumb=null;}}
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
      placePanel(1.6,-.0);
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
    if(item.type==='photos'){void showPhotoGallery(item);return;}
    if(item.type==='information'){
      const body=infoText(item);
      const url=item.url||((body.match(/https?:\/\/[^\s]+/i)||[])[0]);
      if(body)showInfo(item.title||'Informations',body,url);
      else if(url)void showWebContent(item.title||'Informations',url,'');
      else showText(item.title||'Informations','Aucune information renseignée.');
      return;
    }
    if(item.type==='lien'){
      const body=infoText(item);
      if(body)showInfo(item.title||'Lien',body,item.url);
      else void showWebContent(item.title||'Lien',item.url||'','');
      return;
    }
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
    // Les fonds de fenêtres et de la barre arrêtent aussi le laser (il ne traverse plus les panneaux) ; seuls les boutons sont sélectionnables.
    const blockers=[...panelGroup.children,...barGroup.children].filter(m=>m.visible&&m.userData.onSelect===undefined) as Clickable[];
    const live=[...clickables.filter(m=>m.parent&&m.visible),...blockers];
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
  /** Vibration de la manette (impulsion courte). Ignorée si le casque ne la prend pas en charge. */
  const pulse=(c:Object3D,intensity:number,ms:number)=>{
    try{
      const gp=(c.userData.source as {gamepad?:{hapticActuators?:{pulse?:(i:number,d:number)=>unknown}[];vibrationActuator?:{playEffect?:(t:string,o:object)=>unknown}}}|undefined)?.gamepad;
      const act=gp?.hapticActuators?.[0];
      if(act?.pulse)void act.pulse(intensity,ms);
      else gp?.vibrationActuator?.playEffect?.('dual-rumble',{startDelay:0,duration:ms,strongMagnitude:intensity,weakMagnitude:intensity});
    }catch{/* pas de vibration */}
  };
  controllers.forEach(c=>{
    c.addEventListener('connected',e=>{c.userData.source=(e as unknown as {data?:unknown}).data;});
    c.addEventListener('selectstart',()=>{
      const h=hits(c),target=h.target;
      if(target){
        const states=target.userData.vrIconStates as {pressedUntil:number}|undefined;
        if(states)states.pressedUntil=performance.now()+180;
        if(target.userData.onSelect){pulse(c,.85,45);target.userData.onSelect();}
      }
    });
    // Prise (gâchette latérale) : ramène la barre devant soi.
    c.addEventListener('squeezestart',()=>{void buildBar();});
  });

  // ---- boucle de rendu --------------------------------------------------------------------------------------
  let lastRefreshCheck=0;
  let turnArmed=true;
  const tick=()=>{
    // Rotation instantanée d'un quart de tour pour réduire le mal des yeux.
    // Une nouvelle impulsion exige d'abord le retour du joystick au neutre.
    const inputs=renderer.xr.getSession()?.inputSources??[];
    let turn=0;
    for(const source of inputs){
      const axes=source.gamepad?.axes;
      if(!axes||axes.length<2)continue;
      const horizontal=axes.length>=4?axes[2]:axes[0];
      if(typeof horizontal==='number'&&Math.abs(horizontal)>Math.abs(turn))turn=horizontal;
    }
    if(Math.abs(turn)<.25)turnArmed=true;
    else if(Math.abs(turn)>.72&&turnArmed&&!alignPending&&!busy){
      root.rotation.y+=Math.sign(turn)*Math.PI/2;
      turnArmed=false;
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
      // Légère vibration quand le laser arrive sur une cible sélectionnable.
      const selectable=hit.target&&hit.target.userData.onSelect?hit.target:null;
      if(selectable&&c.userData.lastSelectable!==selectable)pulse(c,.2,12);
      c.userData.lastSelectable=selectable;
      if(pointer){
        // Le faisceau va jusqu'à la cible, même lointaine (flèches du panorama), et pas plus loin ; sans cible il reste court.
        const length=hit.target?hit.distance:POINTER_MAX;
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
