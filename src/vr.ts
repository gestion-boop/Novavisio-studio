import {
  CanvasTexture,Color,LinearFilter,DoubleSide,Group,Line,LineBasicMaterial,BufferGeometry,Float32BufferAttribute,Mesh,MeshBasicMaterial,
  PerspectiveCamera,PlaneGeometry,Quaternion,Raycaster,Scene as ThreeScene,SphereGeometry,SRGBColorSpace,Vector3,VideoTexture,WebGLRenderer,RepeatWrapping,type Object3D,type Texture
} from 'three';
import type {StudioProject,Scene,Hotspot,BottomBarItem} from './storage';
import {galleryEntries} from './gallery';
import {trimIcon} from './iconFit';
import {resolveLink} from './mediaLinks';
import {frameWorldCorners} from './sphericalFrame';
import {getPrefs,effectiveLang,setSound} from './visitorPrefs';
import {ui as uiText,pick,type UiKey} from './i18n';
import {makeVrControlTexture,type VrControlIcon} from './vrInterfaceIcons';

/**
 * Mode VR de base (WebXR) pour casque Meta Quest : panorama 360° autour du spectateur, flèches de navigation cliquables
 * avec la manette, barre flottante, galerie de panoramas. Les panoramas sont allégés (4096 px max) pour le casque.
 * Dans le casque : points d'information (texte en pages, ou pages d'un mini-site via /vr.json), photos, vidéos MP4/WebM, galerie de photos de la barre.
 * Les cadres photo/vidéo en perspective dans le panorama ne sont pas encore affichés ; la musique continue de jouer via la page.
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
  try{renderer.xr.setFramebufferScaleFactor(1.25);}catch{/* non pris en charge */}
  const maxTex=Math.min(VR_MAX_TEXTURE,renderer.capabilities.maxTextureSize);
  await renderer.xr.setSession(session);
  try{renderer.xr.setFoveation(.35);}catch{/* non pris en charge */}

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
  /** Texte du casque dans la langue choisie par le visiteur (repli : français). */
  const vlang=()=>effectiveLang(getPrefs(),project().languages??['fr']);
  const tt=(key:UiKey,vars?:Record<string,string|number>)=>uiText(key,vlang(),vars);
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
  /** Cadre photo/vidéo incrusté (TV) : affiché DANS le panorama, déformé sur la sphère comme dans la visite. Un clic ouvre la version en grand. */
  const makeFrame=async(h:Hotspot):Promise<Mesh|null>=>{
    const corners=frameWorldCorners(h);
    if(!corners||corners.length!==4)return null;
    const isVideo=h.type==='video';
    const src=isVideo?(h.videoDataUrl||h.videoUrl):h.imageDataUrl;
    if(!src)return null;
    let tex:Texture;let video:HTMLVideoElement|null=null;
    if(isVideo){
      const el=document.createElement('video');
      el.src=src;el.crossOrigin='anonymous';el.loop=h.videoLoop!==false;el.muted=true;el.playsInline=true;el.setAttribute('playsinline','');el.preload='auto';
      void el.play().catch(()=>{/* lecture relancée par le casque au premier geste */});
      const vt=new VideoTexture(el);vt.minFilter=LinearFilter;tex=vt;video=el;
    }else{
      const canvas=await loadReduced(src,1024).catch(()=>null);
      if(!canvas)return null;
      tex=new CanvasTexture(canvas);
    }
    tex.colorSpace=SRGBColorSpace;
    // Maillage 12×12 : chaque sommet est pris sur la sphère (direction interpolée puis normalisée) -> image sans cisaillement.
    const dirOf=(c:{yaw:number;pitch:number})=>new Vector3(-Math.cos(c.pitch)*Math.sin(c.yaw),Math.sin(c.pitch),Math.cos(c.pitch)*Math.cos(c.yaw)).normalize();
    const [tl,tr,br,bl]=corners.map(dirOf);
    const N=12,pos:number[]=[],uv:number[]=[],idx:number[]=[];
    for(let j=0;j<=N;j++)for(let i=0;i<=N;i++){
      const u=i/N,v=j/N;
      const top=tl.clone().lerp(tr,u),bottom=bl.clone().lerp(br,u);
      // Même surface que le panorama : le cadre est collé à l'écran de la télé, sans décalage quand la tête bouge.
      const d=top.lerp(bottom,v).normalize().multiplyScalar(SPHERE_R-.05);
      pos.push(d.x,d.y,d.z);uv.push(u,1-v);
    }
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){
      const a=j*(N+1)+i,b=a+1,c=a+(N+1),d=c+1;
      idx.push(a,c,b,b,c,d);
    }
    const geo=new BufferGeometry();
    geo.setAttribute('position',new Float32BufferAttribute(pos,3));
    geo.setAttribute('uv',new Float32BufferAttribute(uv,2));
    geo.setIndex(idx);
    const mat=new MeshBasicMaterial({map:tex,depthTest:false,depthWrite:false,side:DoubleSide});
    const mesh=new Mesh(geo,mat);
    mesh.renderOrder=0.5;
    mesh.userData={isFrame:true,video,baseScale:1,hoverScale:1,onSelect:()=>{
      // Même ouverture que l'icône : la photo ou la vidéo s'affiche en grand dans le casque.
      const live=sceneOf(currentId)?.hotspots.find(p=>p.id===h.id)??h;
      if(live.type==='image'){void showPhoto(live);return;}
      const direct=live.videoDataUrl||live.videoUrl;
      if(direct)void showVideoPanel(direct,pick(live.title,live.titleTranslations,vlang())||tt('videoTitle'));
    }};
    return mesh;
  };
  const makeHotspot=async(h:Hotspot):Promise<Mesh|null>=>{
    if((h.type==='image'||h.type==='video')&&h.mediaDisplay!=='popup'){const f=await makeFrame(h);if(f)return f;}
    if(h.type!=='navigation'&&h.type!=='information'&&h.type!=='lien'&&h.type!=='image'&&h.type!=='video')return null;
    if(h.type==='navigation'&&!h.target)return null;
    const iconUrl=getIconUrl(h.iconId);
    const img=iconUrl?await loadImage(iconUrl):null;
    if(h.type==='navigation'&&h.sphere&&h.target){
      const radius=Math.max(.09,Math.min(.18,(h.iconSize??48)/90*.15));
      const mesh=new Mesh(new SphereGeometry(radius,32,20),new MeshBasicMaterial({color:0xd4edf5,transparent:true,opacity:.94,depthTest:false,depthWrite:false}));
      const pos=new Vector3(-Math.cos(h.pitch)*Math.sin(h.yaw),Math.sin(h.pitch),Math.cos(h.pitch)*Math.cos(h.yaw)).multiplyScalar(HOTSPOT_R);
      mesh.position.copy(pos);mesh.renderOrder=2;
      // Dans un casque, un changement d'échelle sous le rayon de la manette
      // déplace la cible à chaque frame et donne l'impression qu'elle clignote.
      mesh.userData={baseScale:1,hoverScale:1,spin:true,dir:pos.clone().normalize(),dist:HOTSPOT_R,onSelect:()=>void goTo(h.target,h)};
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
    mesh.userData={baseScale:1,hoverScale:1,onSelect:()=>{
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
          if(body){showInfo(pick(live.title,live.titleTranslations,vlang())||tt('infoTitle'),body,url);return;}
          if(url){void showWebContent(pick(live.title,live.titleTranslations,vlang())||tt('infoTitle'),url,'');return;}
          showText(pick(live.title,live.titleTranslations,vlang())||tt('infoTitle'),detail||tt('noInfo'));
          return;
        }
        if(live.type==='image'){void showPhoto(live);return;}
        if(live.type==='lien'){
          const body=infoText(live);
          if(body)showInfo(pick(live.title,live.titleTranslations,vlang())||tt('linkTitle'),body,live.url);
          else void showWebContent(pick(live.title,live.titleTranslations,vlang())||tt('linkTitle'),live.url||'','');
          return;
        }
        if(live.type==='video'){
          const direct=live.videoDataUrl||live.videoUrl;
          if(direct)void showVideoPanel(direct,pick(live.title,live.titleTranslations,vlang())||tt('videoTitle'));
          else setNotice(tt('videoClassic'));
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
      const states=m.userData.vrIconStates as {normal?:Texture|null;hover?:Texture|null;pressed?:Texture|null}|undefined;
      for(const texture of [states?.normal,states?.hover,states?.pressed])if(texture&&texture!==mat?.map)texture.dispose();
      mat?.map?.dispose();mat?.dispose();m.geometry?.dispose();
      const vid=m.userData.video as HTMLVideoElement|null|undefined;
      if(vid){try{vid.pause();vid.removeAttribute('src');vid.load();}catch{/* déjà arrêtée */}}
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
    if(!ok)setNotice(tt('unavailable'));
    else{
      renderRoomHeader();
      if(referenceMode)void buildBar().then(()=>{
        const first=project().scenes.filter(s=>!s.excluded);
        const gallery=project().bottomBar.find(item=>item.type==='gallery');
        const fallback={id:'vr-room-gallery',title:'Panoramas',type:'gallery',
          gallery:first.map(scene=>({sceneId:scene.id,label:scene.name}))} as BottomBarItem;
        void showGallery(gallery??fallback);
      });
    }
  }

  // ---- panneaux flottants (barre, galerie, texte) ----------------------------------------------------------
  // Le nouveau design ne s'active QUE dans le casque par A ou B.
  let referenceMode=false;
  const theme=project().barStyle;
  let panelBg=theme?.background??'#c2c5c6',
    panelLine=theme?.outline??'#987974',
    btnBg=theme?.button??'#5d131a',
    btnLine=theme?.buttonOutline??'#4a1518',
    iconColor=theme?.icon??'#f4d69a';
  const updateVrPalette=()=>{
    panelBg=referenceMode?'rgba(37,38,42,.87)':theme?.background??'#c2c5c6';
    panelLine=referenceMode?'#e1a525':theme?.outline??'#987974';
    btnBg=referenceMode?'#1c1d20':theme?.button??'#5d131a';
    btnLine=referenceMode?'#daa025':theme?.buttonOutline??'#4a1518';
    iconColor=referenceMode?'#f6bb34':theme?.icon??'#f4d69a';
  };
  // Les commandes gauche/droite et le contenu central sont dans LE MÊME
  // repère spatial. Déplacer le groupe parent déplace l'ensemble sans décalage.
  const vrInterfaceGroup=new Group();ui.add(vrInterfaceGroup);
  const vrShellGroup=new Group();vrInterfaceGroup.add(vrShellGroup);
  const barGroup=new Group();vrInterfaceGroup.add(barGroup);
  const panelGroup=new Group();vrInterfaceGroup.add(panelGroup);
  // En-tête nom + superficie indépendant, ancré à deux mètres du casque.
  const headerGroup=new Group();ui.add(headerGroup);
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
    // Les boutons restent géométriquement fixes : le rayon du contrôleur ne
    // peut plus les faire grossir/rétrécir et provoquer un scintillement.
    m.userData={baseScale:1,hoverScale:1,onSelect};clickables.push(m);return m;
  };

  const placeInFront=(g:Group,distance:number,drop:number)=>{
    const h=headForward();
    // direction avant (phi mesuré depuis +z) : avant = (sin phi, cos phi)
    g.position.set(h.x+Math.sin(h.phi)*distance,h.y-drop,h.z+Math.cos(h.phi)*distance);
    g.lookAt(h.x,h.y-drop+drop*.6,h.z);
  };

  let barPlacedPhi=0;
  const renderRoomHeader=()=>{
    clearGroup(headerGroup);
    const room=sceneOf(currentId);
    const name=room?.name||project().name;
    const area=room?.surfaceM2!==undefined?room.surfaceM2.toLocaleString('fr-FR',{maximumFractionDigits:2})+' m²':'';
    const tex=canvasTexture(1100,210,ctx=>{
      roundRect(ctx,8,8,1084,194,44);ctx.fillStyle='rgba(28,29,32,.9)';ctx.fill();
      ctx.lineWidth=7;ctx.strokeStyle='#d9a32e';ctx.stroke();
      ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
      let title=name;ctx.font='bold 70px sans-serif';
      while(ctx.measureText(title).width>1000&&title.length>4)title=title.slice(0,-2);
      ctx.fillText(title===name?title:title+'…',550,area?78:107);
      if(area){ctx.font='bold 48px sans-serif';ctx.fillStyle='#eec464';ctx.fillText(area,550,151);}
    });
    addPlane(headerGroup,1.12,.215,tex,6,0,0);
    // Plus loin de l'utilisateur : moins intrusif dans le champ de vision du casque.
    placeInFront(headerGroup,2.0,-.62);
  };
  const buildBar=async()=>{
    // Le casque démarre sans barre. A/B ouvre ou ferme l'unique bloc VR.
    if(!referenceMode){
      clearGroup(barGroup);clearGroup(vrShellGroup);
      return;
    }
    clearGroup(barGroup);clearGroup(vrShellGroup);
    // Une plaque commune (fond + bord fin) soude les trois colonnes,
    // au lieu de les laisser flotter à des profondeurs indépendantes.
    addPlane(vrShellGroup,2.13,1.15,canvasTexture(1200,650,ctx=>{
      roundRect(ctx,7,7,1186,636,54);
      ctx.fillStyle='rgba(30,31,35,.79)';ctx.fill();
      ctx.lineWidth=7;ctx.strokeStyle='rgba(238,180,52,.72)';ctx.stroke();
    }),3,0,0,-.03);
    const button=(x:number,y:number,icon:VrControlIcon,onSelect:()=>void)=>{
      const normal=makeVrControlTexture(icon,'normal');
      const hover=makeVrControlTexture(icon,'hover');
      const pressed=makeVrControlTexture(icon,'pressed');
      const mesh=addButton(barGroup,.124,.124,normal,x,y,onSelect,9);
      mesh.userData.vrIconStates={normal,hover,pressed,pressedUntil:0};
      mesh.userData.referenceUi=true;
      return mesh;
    };
    const floorLabel=(label:string)=>canvasTexture(280,180,ctx=>{
      roundRect(ctx,8,8,264,164,36);ctx.fillStyle='#25262a';ctx.fill();
      ctx.strokeStyle='#d6a13d';ctx.lineWidth=7;ctx.stroke();
      ctx.fillStyle='#ffffff';ctx.font='bold 56px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(label,140,90);
    });
    const scenes=project().scenes.filter(scene=>!scene.excluded);
    const sceneIndex=Math.max(0,scenes.findIndex(scene=>scene.id===currentId));
    const gallery=project().bottomBar.find(item=>item.type==='gallery');
    const galleryDefault={id:'vr-menu-gallery',title:'Panoramas',type:'gallery',
      gallery:scenes.map(scene=>({sceneId:scene.id,label:scene.name}))} as BottomBarItem;
    const plan=project().bottomBar.find(item=>item.type==='plan');
    const planAction={id:'vr-menu-plan',title:project().floorPlan?.name||'Plan',type:'plan'} as BottomBarItem;
    const left=-.936,right=.936;
    button(left,.33,'gallery',()=>{void showGallery(gallery??galleryDefault);});
    button(left,.12,'up',()=>{const target=scenes[Math.max(0,sceneIndex-1)];if(target)void goTo(target.id);});
    addPlane(barGroup,.15,.09,floorLabel((sceneIndex+1)+' / '+scenes.length),8,left,-.09);
    button(left,-.29,'down',()=>{const target=scenes[Math.min(scenes.length-1,sceneIndex+1)];if(target)void goTo(target.id);});
    button(left,-.49,'home',()=>{if(scenes[0])void goTo(scenes[0].id);});
    button(right,.32,getPrefs().sound==='off'?'mute':'sound',()=>{
      setSound(getPrefs().sound==='off'?'on':'off');
      void buildBar();
    });
    // Plan ≠ galerie. Prend le floorPlan enregistré, même sans bouton 2D.
    button(right,.07,'plan',()=>{void showFloorPlan(plan??planAction);});
    button(right,-.18,'help',()=>showText('Navigation VR',
      'Manette droite : laser et gâchette. Manette gauche : joystick et gâchette. A/B : ouvrir ou fermer le bloc. Clic joystick : tout masquer.'));
    button(right,-.43,'exit',()=>{void session.end();});
    // Premier affichage : une seule pose pour le bloc complet.
    if(!panelAnchor){
      placeInFront(vrInterfaceGroup,VR_UI_DIST,0);
      panelAnchor={pos:vrInterfaceGroup.position.clone(),quat:vrInterfaceGroup.quaternion.clone()};
    }
    barPlacedPhi=headForward().phi;
  };
    const items=project().bottomBar??[];
    const bw=.145,bh=.145,gap=.013;
    const entries:{item?:BottomBarItem;label:string}[]=[...items.map(item=>({item,label:pick(item.title,item.titleTranslations,vlang())})),{label:tt('quitVr')}];
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
    placeInFront(barGroup,1.55,1.22);
    barPlacedPhi=headForward().phi;
  };

  // Les fenêtres gardent leur place quand on passe de l'une à l'autre (photo suivante, page, retour galerie) : elles ne suivent plus le regard.
  // Distance des panneaux (galeries, textes, photos) : assez loin pour ne pas occuper tout le champ de vision.
  const PANEL_DIST=2.25;
  const VR_UI_DIST=2.0;
  let panelAnchor:{pos:Vector3;quat:Quaternion}|null=null;
  let panelReplace=false;
  const placePanel=(distance:number,drop:number)=>{
    if(referenceMode){
      // Ni la galerie ni le plan ne possèdent de pose autonome.
      // Ils restent au centre du groupe parent même si l'on change de panneau.
      panelGroup.position.set(0,0,0);
      panelGroup.quaternion.identity();
      if(!panelAnchor){
        placeInFront(vrInterfaceGroup,VR_UI_DIST,0);
        panelAnchor={pos:vrInterfaceGroup.position.clone(),quat:vrInterfaceGroup.quaternion.clone()};
      }
      return;
    }
    if(panelReplace&&panelAnchor){
      vrInterfaceGroup.position.copy(panelAnchor.pos);
      vrInterfaceGroup.quaternion.copy(panelAnchor.quat);
      return;
    }
    placeInFront(vrInterfaceGroup,distance,drop);
    panelAnchor={pos:vrInterfaceGroup.position.clone(),quat:vrInterfaceGroup.quaternion.clone()};
  };
  let activeVideo:{el:HTMLVideoElement;tex:VideoTexture}|null=null;
  const stopVideo=()=>{
    if(!activeVideo)return;
    try{activeVideo.el.pause();activeVideo.el.removeAttribute('src');activeVideo.el.load();}catch{/* déjà arrêtée */}
    activeVideo.tex.dispose();activeVideo=null;
  };
  let panelGen=0; // change à chaque fermeture / remplacement de fenêtre : un chargement en cours ne peut plus rien ajouter après coup
  function closePanels(){
    panelGen++;
    panelReplace=panelGroup.children.length>0;
    stopVideo();
    clearGroup(panelGroup);
    for(const c of [...clickables]){if((c as Object3D).userData.panel){const i=clickables.indexOf(c);if(i>=0)clickables.splice(i,1);}}
  }
  const addPanelButton=(w:number,h:number,tex:Texture,x:number,y:number,onSelect:()=>void,order=6)=>{
    const m=addButton(panelGroup,w,h,tex,x,y,onSelect,order);m.userData={...m.userData};(m as Object3D).userData.panel=true;return m;
  };
  // Vignettes : la tuile s'affiche tout de suite, l'image arrive ensuite (mise en cache, jamais rechargée).
  const thumbCache=new Map<string,Promise<HTMLCanvasElement|null>>();
  let thumbQueue:Promise<unknown>=Promise.resolve();
  const cachedThumb=(key:string,src:string)=>{
    let p=thumbCache.get(key);
    // Une vignette à la fois : décoder plusieurs grands panoramas en même temps fait saccader le casque.
    if(!p){p=thumbQueue.then(()=>ended?null:loadReduced(src,480)).catch(()=>null);thumbQueue=p.then(()=>wait(30));thumbCache.set(key,p);}
    return p;
  };
  const thumbTile=(key:string,src:string|undefined,tw:number,th:number,draw:(c:CanvasRenderingContext2D,thumb:HTMLCanvasElement|null)=>void,w:number,h:number,x:number,y:number,onSelect:()=>void)=>{
    const btn=addPanelButton(w,h,canvasTexture(tw,th,c=>draw(c,null)),x,y,onSelect);
    if(!src)return;
    const gen=panelGen;
    void cachedThumb(key,src).then(thumb=>{
      if(!thumb||ended||gen!==panelGen||!(btn as Object3D).parent)return;
      const mat=(btn as unknown as Mesh).material as MeshBasicMaterial;
      const old=mat.map;mat.map=canvasTexture(tw,th,c=>draw(c,thumb));mat.needsUpdate=true;old?.dispose();
    });
  };
  const closeButtonTexture=()=>canvasTexture(240,110,c=>{
    roundRect(c,6,6,228,98,40);c.fillStyle=btnBg;c.fill();c.lineWidth=6;c.strokeStyle=btnLine;c.stroke();
    c.fillStyle=iconColor;c.font='bold 46px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(tt('close'),120,58);
  });

  let noticeTimer=0;
  const setNotice=(text:string)=>{
    clearGroup(noticeGroup);
    const tex=canvasTexture(900,160,c=>{
      roundRect(c,6,6,888,148,40);c.fillStyle='rgba(20,20,24,.85)';c.fill();
      c.fillStyle='#fff';c.font='bold 44px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,450,82);
    });
    addPlane(noticeGroup,.62,.11,tex,7,0,0);
    placeInFront(noticeGroup,2.1,-.4);
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
      c.fillStyle=referenceMode?'#ffffff':'#1b1b1f';c.font='bold 58px sans-serif';c.textAlign='left';c.textBaseline='middle';
      let t=title;while(c.measureText(t).width>W*1000-420&&t.length>3)t=t.slice(0,-2);
      c.fillText(t,64,92);
      c.font='34px sans-serif';c.fillStyle=referenceMode?'#e8bf65':'#4a4a52';c.textAlign='right';
      c.fillText(count+(pages>1?'  ·  '+tt('page')+' '+(page+1)+'/'+pages:''),W*1000-170,92);
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
      const lines=wrapText(measure,(pg.text||'').trim()||tt('noInfo'),980);
      for(let i=0;i<lines.length;i+=LINES)chunks.push({title:pg.title||title,lines:lines.slice(i,i+LINES)});
    }
    if(!chunks.length)chunks.push({title,lines:[tt('noInfo')]});
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
    placePanel(PANEL_DIST,-.0);
  };
  const showText=(title:string,text:string)=>showPages(title,[{text}]);
  /** Texte d'un point « i » dans la langue du visiteur (réglage Paramètres), avec le texte français en repli. */
  const infoText=(h:{text?:string;translations?:Partial<Record<string,string>>}):string=>{
    const lang=getPrefs().lang??project().languages?.[0]??'fr';
    return ((lang==='fr'?h.text:(h.translations?.[lang]||h.text))||'').trim();
  };
  const openSiteOutside=(title:string,url:string)=>{
    // Une page web ne peut pas être dessinée dans la scène immersive : on quitte le casque puis la page s'affiche dans NovaStudio.
    void session.end().then(()=>opts.onOpenEmbedded?.(title||tt('webPage'),url)).catch(()=>opts.onOpenEmbedded?.(title||tt('webPage'),url));
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
      c.font='bold 54px sans-serif';c.fillText(title||tt('webLinkTitle'),65,54,1110);
      c.font='37px sans-serif';
      const caption=description.trim()||tt('openInBrowser');
      wrapText(c,caption,1100).slice(0,5).forEach((line,i)=>c.fillText(line,65,155+i*58));
      c.font='31px sans-serif';
      if(valid)c.fillText(new URL(valid).hostname,65,535,1100);
      else c.fillText(tt('badUrl'),65,535);
    });
    addPlane(panelGroup,W,H,tex,5,0,0);
    if(valid){
      const action=canvasTexture(650,150,c=>{
        roundRect(c,8,8,634,134,45);c.fillStyle=btnBg;c.fill();
        c.lineWidth=7;c.strokeStyle=btnLine;c.stroke();
        c.fillStyle=iconColor;c.font='bold 49px sans-serif';c.textAlign='center';c.textBaseline='middle';
        c.fillText(tt('openSite'),325,78);
      });
      addPanelButton(.58,.135,action,0,-.19,()=>{
        // Un iframe HTML ne peut pas être dessiné à l'intérieur d'une
        // scène WebXR immersive. On quitte la session VR puis on affiche
        // l'iframe ABSOLUE existante dans le même onglet de NovaStudio.
        // Aucun window.open ni changement d'adresse.
        void session.end().then(()=>opts.onOpenEmbedded?.(title||tt('webPage'),valid))
          .catch(()=>opts.onOpenEmbedded?.(title||tt('webPage'),valid));
      });
    }
    addPanelButton(.24,.11,closeButtonTexture(),0,-H/2+.055,closePanels);
    placePanel(PANEL_DIST,0);
  };

  /** Contenu d'une page web : lu directement dans le casque si le site propose /vr.json, sinon panneau « Ouvrir le site » (sortie du casque puis page affichée dans NovaStudio). */
  const showWebContent=async(title:string,url:string,description=''):Promise<void>=>{
    if(!url){showText(title||tt('linkTitle'),tt('noLink'));return;}
    setNotice(tt('loading'));
    const gen=panelGen;
    const doc=await fetchVrDoc(url);
    if(ended||gen!==panelGen)return;
    if(doc){showPages(doc.title||title,doc.pages);return;}
    showWebLink(title,url,description);
  };

  // Image en grand dans un panneau 3D (fermable avec la gâchette). `nav` ajoute précédent / suivant / retour à la galerie.
  let imageReq=0;
  const showImagePanel=async(src:string|undefined,title:string,nav?:{index:number;count:number;prev:()=>void;next:()=>void;back:()=>void})=>{
    if(!src){setNotice(tt('photoLoading'));opts.ensureScene?.(currentId);return;}
    const shownFor=currentId,gen=panelGen,req=++imageReq;
    let bitmap:HTMLCanvasElement;
    try{bitmap=await loadReduced(src,2048);}
    catch{setNotice(tt('photoFail'));return;}
    if(ended||shownFor!==currentId||gen!==panelGen||req!==imageReq)return;
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
      c.fillStyle='#17232b';c.font='bold 36px sans-serif';c.textAlign='center';c.textBaseline='middle';
      const label=nav?title+'  ·  '+(nav.index+1)+'/'+nav.count:title;
      let t=label;while(c.measureText(t).width>900&&t.length>3)t=t.slice(0,-2);
      c.fillText(t===label?t:t+'…',480,60);
    });
    addPlane(panelGroup,Math.min(W-.10,1.0),.07,titleTex,7,0,H/2-.06);
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
    placePanel(PANEL_DIST,0);
  };
  const showPhoto=(h:Hotspot)=>showImagePanel(h.imageDataUrl||h.imageUrl,pick(h.title,h.titleTranslations,vlang())||'Photo');

  // Galerie de photos / vidéos d'un bouton de la barre (type « photos ») : vignettes puis image en grand.
  const showPhotoGallery=async(item:BottomBarItem)=>{
    closePanels();
    const entries=(item.photos??[]).map(m=>({m,r:resolveLink(m)})).filter(e=>e.r.image||e.r.video||e.r.embed);
    if(!entries.length){showText(pick(item.title,item.titleTranslations,vlang())||tt('photos'),tt('noPhoto'));return;}
    let page=0;
    const open=async(i:number)=>{
      const e=entries[i];
      const count=entries.length;
      const nav={index:i,count,prev:()=>{void open((i-1+count)%count);},next:()=>{void open((i+1)%count);},back:()=>{void renderGrid();}};
      if(e.m.kind==='photo')await showImagePanel(e.r.image,e.m.name,nav);
      else if(e.r.video)await showVideoPanel(e.r.video,e.m.name);
      else setNotice(tt('videoClassic'));
    };
    const renderGrid=async()=>{
      closePanels();
      const cols=4,rows=2,cw=.34,ch=.30,gx=.04,gy=.05;
      const perPageP=cols*rows;
      const slice=entries.slice(page*perPageP,page*perPageP+perPageP);
      const W=cols*cw+(cols-1)*gx+.32,H=.17+rows*ch+(rows-1)*gy+.1;
      const pages=Math.max(1,Math.ceil(entries.length/perPageP));
      galleryChrome(W,H,pick(item.title,item.titleTranslations,vlang())||tt('photos'),entries.length+' '+tt('items'),pages,page,
        ()=>{page=(page-1+pages)%pages;void renderGrid();},()=>{page=(page+1)%pages;void renderGrid();});
      for(let k=0;k<slice.length;k++){
        const e=slice[k];
        const col=k%cols,row=Math.floor(k/cols);
        const x=(col-(cols-1)/2)*(cw+gx),y=H/2-.17-ch/2-row*(ch+gy);
        thumbTile('media:'+e.m.id,e.m.kind==='photo'?(e.r.thumb??e.r.image):undefined,340,300,(c,thumb)=>{
          roundRect(c,5,5,330,290,28);c.fillStyle=btnBg;c.fill();c.lineWidth=6;c.strokeStyle=btnLine;c.stroke();
          c.save();roundRect(c,16,16,308,196,20);c.clip();
          if(thumb)c.drawImage(thumb,16,16,308,196);else{c.fillStyle='#222';c.fillRect(16,16,308,196);if(e.m.kind!=='photo'){c.fillStyle='#fff';c.font='bold 80px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('▶',170,116);}}
          c.restore();
          c.fillStyle=iconColor;c.font='bold 30px sans-serif';c.textAlign='center';c.textBaseline='alphabetic';
          let t=e.m.name;while(c.measureText(t).width>300&&t.length>2)t=t.slice(0,-2);
          c.fillText(t===e.m.name?t:t.trimEnd()+'…',170,258);
        },cw,ch,x,y,()=>{void open(page*perPageP+k);});
      }
      placePanel(PANEL_DIST,-.0);
    };
    await renderGrid();
  };

  // Vidéo lue dans le casque (fichier MP4/WebM du projet) : panneau 16:9 avec lecture / pause.
  const showVideoPanel=async(src:string|undefined,title:string)=>{
    if(!src){setNotice(tt('videoClassic'));return;}
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
    const toggle=addPanelButton(.3,.11,navTexture('❚❚ / ▶',300),-.2,-H/2+.09,()=>{if(el.paused)void el.play().catch(()=>setNotice(tt('playFail')));else el.pause();});
    void toggle;
    addPanelButton(.24,.11,closeButtonTexture(),.2,-H/2+.09,closePanels);
    placePanel(PANEL_DIST,0);
    void el.play().catch(()=>setNotice(tt('videoPlayHint')));
  };

  const showGallery=async(item:BottomBarItem)=>{
    closePanels();
    const entries=galleryEntries(item,project().scenes,project().spaces).map(e=>{const sc=project().scenes.find(x=>x.id===e.sceneId);return sc&&sc.name===e.label?{...e,label:pick(sc.name,sc.nameTranslations,vlang())}:e;});
    // Deux colonnes plus larges : dans le casque les vignettes restent lisibles
    // et ne se chevauchent pas avec les flèches de navigation.
    const cols=referenceMode?4:2,rows=referenceMode?2:3,perPage=cols*rows;
    let page=0;
    const render=async()=>{
      closePanels();
      const slice=entries.slice(page*perPage,page*perPage+perPage);
      const cw=referenceMode?.31:.62,ch=referenceMode?.28:.34,gx=referenceMode?.025:.06,gy=.05;
      const W=cols*cw+(cols-1)*gx+.32,H=.17+rows*ch+(rows-1)*gy+.1;
      const pages=Math.max(1,Math.ceil(entries.length/perPage));
      galleryChrome(W,H,item.galleryTitle||pick(item.title,item.titleTranslations,vlang())||tt('panoramas'),entries.length+' '+tt('panoramaCount'),pages,page,
        ()=>{page=(page-1+pages)%pages;void render();},()=>{page=(page+1)%pages;void render();});
      for(let i=0;i<slice.length;i++){
        const e=slice[i];
        const col=i%cols,row=Math.floor(i/cols);
        const x=(col-(cols-1)/2)*(cw+gx),y=H/2-.17-ch/2-row*(ch+gy);
        opts.ensureScene?.(e.sceneId);
        thumbTile('scene:'+e.sceneId,sceneOf(e.sceneId)?.dataUrl,620,340,(c,thumb)=>{
          roundRect(c,6,6,608,328,30);c.fillStyle=e.sceneId===currentId?btnLine:btnBg;c.fill();c.lineWidth=7;c.strokeStyle=e.sceneId===currentId?iconColor:btnLine;c.stroke();
          c.save();roundRect(c,18,18,584,218,20);c.clip();
          if(thumb)c.drawImage(thumb,18,18,584,218);else{c.fillStyle='#333';c.fillRect(18,18,584,218);}
          c.restore();
          c.fillStyle=iconColor;c.font='bold 32px sans-serif';c.textAlign='center';c.textBaseline='alphabetic';
          let t=e.label;while(c.measureText(t).width>560&&t.length>2)t=t.slice(0,-2);
          c.fillText(t===e.label?t:t.trimEnd()+'…',310,303);
        },cw,ch,x,y,()=>{void goTo(e.sceneId);});
      }
      placePanel(PANEL_DIST,-.0);
    };
    await render();
  };

  // Plan de visite dans le casque : image plane flottante et destinations
  // cliquables avec le laser des manettes Quest.
  const showFloorPlan=async(item:BottomBarItem)=>{
    const plan=project().floorPlan;
    if(!plan?.imageDataUrl){showText(pick(item.title,item.titleTranslations,vlang())||tt('plan'),tt('planUnset'));return;}
    setNotice(tt('planLoading'));
    let bitmap:HTMLCanvasElement;
    try{bitmap=await loadReduced(plan.imageDataUrl,2048);}catch{setNotice(tt('planFail'));return;}
    if(ended)return;
    closePanels();
    const ratio=bitmap.width/Math.max(1,bitmap.height);
    const maxW=1.48,maxH=1.02;
    const imageW=Math.min(maxW,maxH*ratio),imageH=Math.min(maxH,maxW/ratio);
    const W=imageW+.16,H=imageH+.30;
    addPlane(panelGroup,W,H,backdrop(W,H),5,0,0);
    const imageTex=new CanvasTexture(bitmap);imageTex.colorSpace=SRGBColorSpace;imageTex.minFilter=LinearFilter;
    addPlane(panelGroup,imageW,imageH,imageTex,6,0,-.025);
    addPlane(panelGroup,Math.min(1.25,W-.12),.09,canvasTexture(1000,80,c=>{
      c.fillStyle=iconColor;c.font='bold 42px sans-serif';c.textAlign='center';c.textBaseline='middle';
      c.fillText(plan.name||pick(item.title,item.titleTranslations,vlang())||tt('planTitle'),500,42);
    }),7,0,H/2-.075);
    const pointTexture=(label:string,current:boolean)=>canvasTexture(180,180,c=>{
      c.beginPath();c.arc(90,90,76,0,Math.PI*2);c.fillStyle=current?iconColor:btnBg;c.fill();
      c.lineWidth=8;c.strokeStyle=current?btnLine:iconColor;c.stroke();
      c.fillStyle=current?btnLine:iconColor;c.font='bold 64px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(label,90,94);
    });
    const visible=plan.points.filter(point=>{const scene=sceneOf(point.sceneId);return !!scene&&!scene.excluded;});
    visible.forEach((point,index)=>{
      const target=sceneOf(point.sceneId)!;
      const x=(point.x/100-.5)*imageW;
      const y=(.5-point.y/100)*imageH-.025;
      // Le plan est fixe dans l'espace et les points sont rendus au-dessus de
      // l'image, sinon le mesh de l'image peut les recouvrir selon l'angle.
      addPanelButton(.105,.105,pointTexture(String(index+1),target.id===currentId),x,y,()=>{void goTo(target.id);},8);
    });
    addPanelButton(.24,.11,closeButtonTexture(),0,-H/2+.075,closePanels);
    placePanel(PANEL_DIST,0);
  };

  function onBarItem(item:BottomBarItem){
    if(item.type==='plan'){void showFloorPlan(item);return;}
    if(item.type==='gallery'){void showGallery(item);return;}
    if(item.type==='navigation'){
      if(item.target){void goTo(item.target);return;}
      // Bouton Espaces sans cible : affiche la liste des panoramas et espaces.
      void showGallery({...item,type:'gallery',galleryTitle:pick(item.title,item.titleTranslations,vlang())||tt('spaces'),gallery:project().scenes.map(scene=>({sceneId:scene.id,label:pick(scene.name,scene.nameTranslations,vlang())})),gallerySpaceIds:project().spaces?.map(space=>space.id)});return;
    }
    if(item.type==='photos'){void showPhotoGallery(item);return;}
    if(item.type==='information'){
      const body=infoText(item);
      const url=item.url||((body.match(/https?:\/\/[^\s]+/i)||[])[0]);
      if(body)showInfo(pick(item.title,item.titleTranslations,vlang())||tt('infoTitle'),body,url);
      else if(url)void showWebContent(pick(item.title,item.titleTranslations,vlang())||tt('infoTitle'),url,'');
      else showText(pick(item.title,item.titleTranslations,vlang())||tt('infoTitle'),tt('noInfo'));
      return;
    }
    if(item.type==='lien'){
      const body=infoText(item);
      if(body)showInfo(pick(item.title,item.titleTranslations,vlang())||tt('linkTitle'),body,item.url);
      else void showWebContent(pick(item.title,item.titleTranslations,vlang())||tt('linkTitle'),item.url||'','');
      return;
    }
    setNotice(tt('buttonClassic'));
  }

  // ---- télécommande gauche + laser de pointage droit --------------------------
  // Joystick gauche : télécommande sans rayon. Laser précis seulement à droite.
  const controllers=[0,1].map(i=>{
    const controller=renderer.xr.getController(i);
    scene.add(controller);
    return controller;
  });
  // Le contrôleur droit peut pointer et sélectionner directement les boutons,
  // même lorsque l'agent préfère la télécommande gauche.
  const laserRaycaster=new Raycaster();
  const rightLaserGeometry=new BufferGeometry();
  rightLaserGeometry.setAttribute('position',new Float32BufferAttribute([0,0,0,0,0,-2.3],3));
  const rightLaserLine=new Line(rightLaserGeometry,new LineBasicMaterial({
    color:0xbad9e9,transparent:true,opacity:.67,depthTest:false,depthWrite:false
  }));
  rightLaserLine.renderOrder=9;
  const rightLaserDot=new Mesh(new SphereGeometry(.004,12,8),
    new MeshBasicMaterial({color:0x5ccaff,depthTest:false,depthWrite:false}));
  rightLaserDot.visible=false;rightLaserDot.renderOrder=11;scene.add(rightLaserDot);
  disposables.push(rightLaserGeometry,rightLaserLine.material as LineBasicMaterial,rightLaserDot.geometry,rightLaserDot.material as MeshBasicMaterial);
  const pointable=(controller:Object3D):{target:Clickable|null;point:Vector3|null}=>{
    const pos=new Vector3(),dir=new Vector3(0,0,-1);
    controller.updateMatrixWorld(true);
    controller.getWorldPosition(pos);
    dir.transformDirection(controller.matrixWorld);
    laserRaycaster.set(pos,dir);
    const shown=(item:Object3D)=>{let p:Object3D|null=item;while(p){if(!p.visible)return false;p=p.parent;}return true;};
    const buttons=clickables.filter(item=>item.parent&&shown(item)&&!!item.userData.onSelect);
    const blockers=[...panelGroup.children,...barGroup.children].filter(item=>shown(item)&&!item.userData.onSelect);
    const intersections=laserRaycaster.intersectObjects([...buttons,...blockers],false);
    if(!intersections.length)return {target:null,point:null};
    // Surface interactive la plus proche ; le laser ne traverse pas les panneaux.
    const hit=intersections[0];
    return {target:hit.object.userData.onSelect?hit.object as Clickable:null,point:hit.point};
  };
  let remoteTarget:Clickable|null=null;
  let remoteAxisArmed=true;
  // Cadre doré autour du contrôle sélectionné. La bordure suit la cible,
  // elle n'est pas un laser et ne dépend pas de l'orientation de la manette.
  const remoteFocus=new Mesh(new PlaneGeometry(1,1),new MeshBasicMaterial({
    color:0xf5ba32,side:DoubleSide,depthTest:false,depthWrite:false
  }));
  remoteFocus.visible=false;ui.add(remoteFocus);
  disposables.push(remoteFocus.geometry,remoteFocus.material as MeshBasicMaterial);
  const remoteCandidates=():Clickable[]=>{
    if(!referenceMode||uiHidden)return [];
    const shown=(obj:Object3D)=>{let x:Object3D|null=obj;while(x){if(!x.visible)return false;x=x.parent;}return true;};
    const panel=clickables.filter(m=>m.parent===panelGroup&&shown(m)&&!!m.userData.onSelect);
    const sides=clickables.filter(m=>m.parent===barGroup&&shown(m)&&!!m.userData.onSelect);
    return [...panel,...sides];
  };
  const remotePositions=(items:Clickable[])=>{
    const xrCamera=renderer.xr.getCamera();
    const eye=xrCamera.cameras[0]??xrCamera;
    eye.updateMatrixWorld();
    return items.map(mesh=>{
      const point=new Vector3();mesh.getWorldPosition(point);point.project(eye);
      return {mesh,x:point.x,y:point.y};
    });
  };
  const navigateRemote=(horizontal:number,vertical:number)=>{
    const items=remoteCandidates();
    if(!items.length){remoteTarget=null;return;}
    const coords=remotePositions(items);
    let current=coords.find(p=>p.mesh===remoteTarget);
    if(!current){current=[...coords].sort((a,b)=>b.y-a.y||a.x-b.x)[0];remoteTarget=current.mesh;return;}
    const xdir=Math.abs(horizontal)>=Math.abs(vertical)?Math.sign(horizontal):0;
    const ydir=xdir?0:-Math.sign(vertical);
    const options=coords.filter(p=>p!==current).map(p=>{
      const dx=p.x-current.x,dy=p.y-current.y;
      const forward=dx*xdir+dy*ydir,side=Math.abs(dx*ydir-dy*xdir);
      return {...p,forward,score:forward+side*2.5};
    }).filter(p=>p.forward>.015&&p.forward>Math.abs(p.x*ydir-p.y*xdir-(current.x*ydir-current.y*xdir))*.18);
    const next=options.sort((a,b)=>a.score-b.score)[0];
    if(next)remoteTarget=next.mesh;
  };
  /** Vibration de la manette (impulsion courte). Ignorée si le casque ne la prend pas en charge. */
  const pulse=(c:Object3D,intensity:number,ms:number)=>{
    try{
      type Haptic={pulse?:(intensity:number,duration:number)=>Promise<boolean>|boolean;playEffect?:(type:string,options:object)=>Promise<unknown>|unknown};
      const source=c.userData.source as {gamepad?:{hapticActuators?:Haptic[];vibrationActuator?:Haptic}}|undefined;
      const actuator=source?.gamepad?.hapticActuators?.[0]??source?.gamepad?.vibrationActuator;
      if(actuator?.pulse)void Promise.resolve(actuator.pulse(intensity,ms)).catch(()=>{});
      else if(actuator?.playEffect)void Promise.resolve(actuator.playEffect('dual-rumble',{startDelay:0,duration:ms,strongMagnitude:intensity,weakMagnitude:intensity})).catch(()=>{});
    }catch{/* La manette ou le navigateur ne gère pas les vibrations */}
  };
  controllers.forEach(controller=>{
    controller.addEventListener('connected',event=>{
      controller.userData.source=(event as unknown as {data?:unknown}).data;
    });
    controller.addEventListener('selectstart',()=>{
      const source=controller.userData.source as {handedness?:string}|undefined;
      if(uiHidden)return;
      // À droite : gâchette sur le rayon. À gauche : sélection au joystick.
      const target=source?.handedness==='right'?pointable(controller).target:
        source?.handedness==='left'&&referenceMode?remoteCandidates().find(item=>item===remoteTarget):null;
      if(!target?.userData.onSelect)return;
      target.userData.pressedUntil=performance.now()+260;
      const states=target.userData.vrIconStates as {pressed?:Texture|null;pressedUntil:number}|undefined;
      if(states){
        states.pressedUntil=performance.now()+260;
        if(states.pressed){const mat=(target as Mesh).material as MeshBasicMaterial;mat.map=states.pressed;mat.needsUpdate=true;}
      }
      pulse(controller,.75,60);
      target.userData.onSelect();
      remoteTarget=null;
    });
    // Prise latérale : recentrer le panneau sans en modifier l'état.
    controller.addEventListener('squeezestart',()=>{
      if(referenceMode)void buildBar();
    });
  });
  // ---- boucle de rendu --------------------------------------------------------------------------------------
  let lastRefreshCheck=0;
  let turnArmed=true;
  // Clic sur le joystick : masque toute l'interface (barre, fenêtres, repères) ; un second clic la fait réapparaître.
  let uiHidden=false;
  const thumbDown:Record<string,boolean>={};
  const abDown:Record<string,boolean>={};
  let switchingReference=false;
  let lastTick=performance.now();
  const tick=()=>{
    const tnow=performance.now();const dt=Math.min(.1,(tnow-lastTick)/1000);lastTick=tnow;
    // Rotation instantanée d'un quart de tour pour réduire le mal des yeux.
    // Une nouvelle impulsion exige d'abord le retour du joystick au neutre.
    const inputs=renderer.xr.getSession()?.inputSources??[];
    for(const source of inputs){
      const pressed=!!source.gamepad?.buttons?.[3]?.pressed;
      const key=source.handedness||'x';
      if(pressed&&!thumbDown[key])uiHidden=!uiHidden;
      thumbDown[key]=pressed;
      // Profil WebXR xr-standard : A et B sont les boutons 4 et 5 à droite.
      if(source.handedness==='right'){
        const down=!!source.gamepad?.buttons?.[4]?.pressed||!!source.gamepad?.buttons?.[5]?.pressed;
        if(down&&!abDown[key]&&!switchingReference){
          switchingReference=true;
          referenceMode=!referenceMode;
          remoteTarget=null;
          panelAnchor=null;
          updateVrPalette();
          closePanels();uiHidden=false;
          void buildBar().then(()=>{
            if(referenceMode){
              const all=project().scenes.filter(s=>!s.excluded);
              const gallery=project().bottomBar.find(b=>b.type==='gallery');
              const fallback={id:'vr-ab-gallery',title:'Panoramas',type:'gallery',gallery:all.map(s=>({sceneId:s.id,label:s.name}))} as BottomBarItem;
              void showGallery(gallery??fallback);
            }
          }).finally(()=>{switchingReference=false;});
        }
        abDown[key]=down;
      }
    }
    barGroup.visible=referenceMode&&!uiHidden;
    panelGroup.visible=!uiHidden;
    headerGroup.visible=!uiHidden;
    noticeGroup.visible=!uiHidden;
    let turn=0;
    for(const source of inputs){
      const axes=source.gamepad?.axes;
      if(!axes||axes.length<2)continue;
      const horizontal=axes.length>=4?axes[2]:axes[0];
      const vertical=axes.length>=4?axes[3]:axes[1];
      // Manette gauche : navigation du menu sans rayon. Joystick
      // droit : rotation du panorama comme auparavant.
      if(source.handedness==='left'&&referenceMode&&!uiHidden){
        const magnitude=Math.hypot(horizontal,vertical);
        if(magnitude<.3)remoteAxisArmed=true;
        else if(magnitude>.65&&remoteAxisArmed){
          const before=remoteTarget;
          navigateRemote(horizontal,vertical);
          if(remoteTarget!==before){
            const c=controllers.find(ctrl=>(ctrl.userData.source as {handedness?:string}|undefined)?.handedness==='left');
            if(c)pulse(c,.2,25);
          }
          remoteAxisArmed=false;
        }
      }else if(source.handedness==='right'&&typeof horizontal==='number'){
        if(Math.abs(horizontal)>Math.abs(turn))turn=horizontal;
      }
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
    hotspotGroup.visible=fade>.6&&!uiHidden;
    // Flèches toujours face au spectateur.
    const cam=renderer.xr.getCamera();const camPos=new Vector3();cam.getWorldPosition(camPos);
    for(const m of hotspotGroup.children)if(!m.userData.isFrame)m.lookAt(camPos);
    // Sphères : la texture (le panorama) défile en continu, la sphère tourne sur elle-même sans bouger de place.
    for(const m of hotspotGroup.children){
      const mat=(m as Mesh).material as MeshBasicMaterial|undefined;
      if(m.userData.spin&&mat?.map)mat.map.offset.x=(mat.map.offset.x+dt*.05)%1;
    }
    // Le monobloc reste ancré dans l'espace : il ne suit pas chaque mouvement de tête.
    const hf=headForward();
    let diff=hf.phi-barPlacedPhi;diff=Math.atan2(Math.sin(diff),Math.cos(diff));
    if(!referenceMode&&Math.abs(diff)>1.1&&barGroup.children.length&&!panelGroup.children.length){void buildBar();}
    // Laser visible exclusivement depuis la manette droite. Son extrémité
    // est placée au point d'intersection réel, sans dépasser le bouton.
    const right=controllers.find(ctrl=>(ctrl.userData.source as {handedness?:string}|undefined)?.handedness==='right');
    if(right){
      if(rightLaserLine.parent!==right)right.add(rightLaserLine);
      const impact=pointable(right);
      const tip=impact.point?right.worldToLocal(impact.point.clone()):new Vector3(0,0,-2.3);
      const attr=rightLaserGeometry.getAttribute('position') as Float32BufferAttribute;
      attr.setXYZ(1,tip.x,tip.y,tip.z);attr.needsUpdate=true;rightLaserGeometry.computeBoundingSphere();
      rightLaserLine.visible=!uiHidden;
      rightLaserDot.visible=!uiHidden&&!!impact.point;
      if(impact.point)rightLaserDot.position.copy(impact.point);
    }else{rightLaserLine.visible=false;rightLaserDot.visible=false;}
    // Le joystick choisit un bouton : halo doré sur la cible, aucun laser.
    const choices=remoteCandidates();
    if(remoteTarget&&!choices.includes(remoteTarget))remoteTarget=null;
    if(!remoteTarget&&choices.length)remoteTarget=remotePositions(choices).sort((a,b)=>b.y-a.y||a.x-b.x)[0].mesh;
    const hovered=new Set<Clickable>();
    if(remoteTarget){
      hovered.add(remoteTarget);
      const mesh=remoteTarget as Mesh;
      const geometry=mesh.geometry as PlaneGeometry;
      const w=geometry.parameters.width,h=geometry.parameters.height;
      mesh.getWorldPosition(remoteFocus.position);
      mesh.getWorldQuaternion(remoteFocus.quaternion);
      remoteFocus.translateZ(-.004);
      remoteFocus.scale.set(w+.027,h+.027,1);
      remoteFocus.renderOrder=mesh.renderOrder-.15;
      remoteFocus.visible=!uiHidden&&referenceMode;
    }else remoteFocus.visible=false;
    for(const m of clickables){
      const isPressed=(m.userData.pressedUntil??0)>now;
      const base=m.userData.baseScale??1,wanted=isPressed?.9:hovered.has(m)?(m.userData.hoverScale??1):base;
      // Zoom avant des sphères au survol : elles s'avancent vers le spectateur.
      if(m.userData.spin&&m.userData.dir){const want=isPressed?HOTSPOT_R-4.2:hovered.has(m)?HOTSPOT_R-1.8:HOTSPOT_R;m.userData.dist+=(want-m.userData.dist)*.22;m.position.copy(m.userData.dir).multiplyScalar(m.userData.dist);}
      // Survol (plus clair) et pressé (plus sombre) pour tous les boutons de l'interface.
      if(!m.userData.isFrame&&(m as Mesh).material instanceof MeshBasicMaterial){
        const mm=(m as Mesh).material as MeshBasicMaterial;
        const tint=isPressed?.66:hovered.has(m)?1.2:1;
        if(!m.userData.spin)mm.color.setScalar(tint);
      }
      const cur=m.scale.x;m.scale.setScalar(cur+(wanted-cur)*.3);
      const states=m.userData.vrIconStates as {normal:Texture;hover:Texture|null;pressed:Texture|null;pressedUntil:number}|undefined;
      if(states){
        // Les trois véritables états du pack : Pressé > Survol > Normal.
        const selected=states.pressedUntil>now&&states.pressed?states.pressed:
          hovered.has(m)&&states.hover?states.hover:states.normal;
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
    clearGroup(hotspotGroup);clearGroup(headerGroup);clearGroup(barGroup);clearGroup(panelGroup);clearGroup(vrShellGroup);clearGroup(noticeGroup);
    panoTexture?.dispose();disposables.forEach(d=>d.dispose());
    renderer.dispose();
    opts.onEnd?.(currentId);
  };
  session.addEventListener('end',stop);

  // Première scène + barre.
  const first=await showScene(opts.startSceneId);
  if(!first&&!ended){setNotice(tt('unavailableAny'));}
  fade=1;fadeTarget=1;
  renderRoomHeader();
  await buildBar();
  return ()=>{if(!ended)void session.end();};
}
