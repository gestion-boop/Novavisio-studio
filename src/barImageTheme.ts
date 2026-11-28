import {useEffect,useState,type CSSProperties} from 'react';
import {barUsesIconImage,type BarStyle,type StudioProject} from './storage';

/**
 * Couleurs RÉELLES de la barre du bas.
 * Quand les boutons de la barre sont des images (pack d'icônes importé), leur aspect visible
 * (disque + pictogramme) ne correspond pas forcément à barStyle.button / barStyle.icon.
 * On lit alors les couleurs directement dans l'image du premier bouton :
 *  - button = couleur dominante du disque,
 *  - icon   = couleur dominante du pictogramme (la plus fréquente qui contraste avec le disque).
 * Ces couleurs servent au bouton Paramètres, à son panneau (Son / Langue) et aux croix de fermeture.
 */
type Sampled={button:string;icon:string};
const cache=new Map<string,Promise<Sampled|null>>();

const hex=(r:number,g:number,b:number)=>'#'+[r,g,b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
const dist=(a:number[],b:number[])=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);

/** Contraste WCAG entre deux couleurs #rrggbb (défini ici car utilisé à l'échantillonnage). */
function contrastOf(a:string,b:string){return contrast(a,b);}

function sample(dataUrl:string):Promise<Sampled|null>{
  const hit=cache.get(dataUrl);
  if(hit)return hit;
  const job=new Promise<Sampled|null>(resolve=>{
    if(typeof document==='undefined'){resolve(null);return;}
    const img=new Image();
    img.crossOrigin='anonymous';
    img.onload=()=>{
      try{
        const S=64,c=document.createElement('canvas');c.width=S;c.height=S;
        const ctx=c.getContext('2d',{willReadFrequently:true});
        if(!ctx){resolve(null);return;}
        ctx.drawImage(img,0,0,S,S);
        const px=ctx.getImageData(0,0,S,S).data;
        const buckets=new Map<number,{n:number;r:number;g:number;b:number}>();
        for(let i=0;i<px.length;i+=4){
          if(px[i+3]<200)continue;
          const key=(px[i]>>4)<<8|(px[i+1]>>4)<<4|(px[i+2]>>4);
          const e=buckets.get(key)??{n:0,r:0,g:0,b:0};
          e.n++;e.r+=px[i];e.g+=px[i+1];e.b+=px[i+2];buckets.set(key,e);
        }
        const list=[...buckets.values()].map(e=>({n:e.n,c:[e.r/e.n,e.g/e.n,e.b/e.n]})).sort((a,b)=>b.n-a.n);
        if(!list.length){resolve(null);return;}
        const disc=list[0].c;
        // Le pictogramme est la couleur SIGNIFICATIVE qui contraste le plus avec le disque : avant, l'anneau du bouton (plus fréquent)
        // était pris pour le pictogramme et le texte du panneau Paramètres devenait rouge sur fond sombre.
        const total=list.reduce((a,e)=>a+e.n,0);
        const toHex=(c:number[])=>hex(c[0],c[1],c[2]);
        const glyph=list.filter(e=>dist(e.c,disc)>90&&e.n>=Math.max(6,total*0.008))
          .sort((a,b)=>contrastOf(toHex(b.c),toHex(disc))-contrastOf(toHex(a.c),toHex(disc))||b.n-a.n)[0]?.c;
        resolve(glyph?{button:hex(disc[0],disc[1],disc[2]),icon:hex(glyph[0],glyph[1],glyph[2])}:null);
      }catch{resolve(null);}
    };
    img.onerror=()=>resolve(null);
    img.src=dataUrl;
  });
  cache.set(dataUrl,job);
  return job;
}

function firstBarImage(project?:StudioProject|null):string|undefined{
  if(!project?.bottomBar?.length)return undefined;
  const style=project.barStyle;
  for(const item of project.bottomBar){
    if(!item.iconId||!barUsesIconImage(style,item))continue;
    const url=project.icons?.find(i=>i.id===item.iconId)?.dataUrl;
    if(url)return url;
  }
  return undefined;
}

/** Thème de la barre tel qu'il est VU par le visiteur (images du pack prises en compte). */
export function useEffectiveBarTheme(project:StudioProject|null|undefined,base:BarStyle):BarStyle{
  const url=firstBarImage(project);
  const [sampled,setSampled]=useState<{url:string;s:Sampled|null}|null>(null);
  useEffect(()=>{
    if(!url){setSampled(null);return;}
    let alive=true;
    void sample(url).then(s=>{if(alive)setSampled({url,s});});
    return ()=>{alive=false;};
  },[url]);
  const s=sampled&&sampled.url===url?sampled.s:null;
  return s?{...base,button:s.button,buttonOutline:s.button,icon:s.icon}:base;
}

function lum(c:string){
  const m=/^#?([0-9a-f]{6})$/i.exec(c.trim());
  if(!m)return 0.5;
  const n=parseInt(m[1],16),ch=[n>>16&255,n>>8&255,n&255].map(v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4;});
  return 0.2126*ch[0]+0.7152*ch[1]+0.0722*ch[2];
}
const contrast=(a:string,b:string)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};

/** Variables du panneau Paramètres et des croix : couleurs effectives + encre lisible sur le fond de la barre. */
export function popupThemeVars(theme:BarStyle):CSSProperties{
  const ink=contrast(theme.button,theme.background)>=contrast(theme.icon,theme.background)?theme.button:theme.icon;
  return {
    '--nv-button-bg':theme.button,
    '--nv-button-outline':theme.buttonOutline,
    '--nv-icon-color':theme.icon,
    '--nv-panel-ink':ink,
  } as CSSProperties;
}
