/**
 * Pictogrammes SVG conçus pour NovaStudio.
 * SVG source généré uniquement à partir de chemins de confiance et couleurs hex.
 * Pour garantir la compatibilité des visites exportées, les icônes ajoutées au
 * projet sont rasterisées en PNG transparent à haute définition.
 */
export type SvgIconShape='circle'|'rounded';
export type SvgIconDesign={primary:string;secondary:string;accent:string;gradient:boolean;shape:SvgIconShape};
export const SVG_ICON_PRESETS=[
  {id:'info',name:'Informations',paths:'<circle cx="12" cy="12" r="8.2"/><path d="M12 11v5"/><path d="M12 8h.01"/>'},
  {id:'arrow',name:'Navigation',paths:'<path d="M4 12h15m-6-6 6 6-6 6"/>'},
  {id:'pin3d',name:'Repère 3D',paths:''},
  {id:'location',name:'Localisation',paths:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.3"/>'},
  {id:'phone',name:'Téléphone',paths:'<path d="M7 3h3l1.2 4.5-2.4 1.6a15 15 0 0 0 6.1 6.1l1.6-2.4L21 14v3c0 2-2 4-4 4C10 21 3 14 3 7c0-2 2-4 4-4Z"/>'},
  {id:'wifi',name:'Wi-Fi',paths:'<path d="M2.5 9a15 15 0 0 1 19 0M5.8 12.5a10 10 0 0 1 12.4 0M9 16a5 5 0 0 1 6 0"/><circle cx="12" cy="19.2" r="1" fill="currentColor" stroke="none"/>'},
  {id:'photo',name:'Photos',paths:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.7" cy="9" r="1.6"/><path d="m4 17 5-5 3 3 3-4 6 6"/>'},
  {id:'video',name:'Vidéo',paths:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3Z"/>'},
  {id:'map',name:'Plan',paths:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15m6-12v15"/>'},
  {id:'clock',name:'Horaires',paths:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>'},
  {id:'calendar',name:'Réservation',paths:'<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M8 3v4m8-4v4M3.5 10h17m-11 6 2 2 4-4"/>'},
  {id:'restaurant',name:'Restaurant',paths:'<path d="M4 3v7c0 2 2 3 4 3s4-1 4-3V3M6.6 3v9M9.4 3v9M8 13v8M18 3c-2.6 3-3.5 6.2-3.5 10H19V3h-1Zm.9 10v8"/>'},
  {id:'bed',name:'Hébergement',paths:'<path d="M3 10V6m18 4V6M3 15h18v5M3 17h18"/><path d="M5 11V8h14v3M3 11h18v4H3Z"/>'},
  {id:'key',name:'Accès',paths:'<circle cx="8" cy="9" r="4.5"/><path d="m11.2 12.2 9 9M17 17l2-2m-4 0 2-2"/>'},
  {id:'parking',name:'Parking',paths:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>'},
  {id:'pool',name:'Piscine',paths:'<path d="M4 17c2 0 2-1.6 4-1.6s2 1.6 4 1.6 2-1.6 4-1.6 2 1.6 4 1.6M4 20c2 0 2-1.6 4-1.6s2 1.6 4 1.6 2-1.6 4-1.6 2 1.6 4 1.6"/><path d="M8 14V7a3 3 0 0 1 6 0M8 10h7"/>'},
  {id:'beach',name:'Plage',paths:'<path d="M3 12c3-7 15-7 18 0H3Zm9 0v9m-4 0h8M12 3v2"/>'},
  {id:'shopping',name:'Boutique',paths:'<path d="M4 9h16l-1 12H5L4 9ZM8 10V7a4 4 0 0 1 8 0v3"/>'},
  {id:'star',name:'Avis',paths:'<path d="m12 2.8 2.8 6 6.5.8-4.8 4.7 1.2 6.6-5.7-3.2-5.7 3.2 1.2-6.6-4.8-4.7 6.5-.8Z"/>'},
  {id:'link',name:'Site internet',paths:'<path d="M10 14a5 5 0 0 0 7.2 0l2-2a5 5 0 0 0-7.2-7.2l-2 2M14 10a5 5 0 0 0-7.2 0l-2 2a5 5 0 0 0 7.2 7.2l2-2"/>'},
  {id:'wheelchair',name:'Accessibilité',paths:'<circle cx="10" cy="4.5" r="1.6"/><path d="M10 8v6h5l3 5m-4-10h-4m1 5a7 7 0 1 1-7-4"/>'},
  {id:'music',name:'Musique',paths:'<path d="M10 18V5l10-2v13M10 8l10-2"/><ellipse cx="7.3" cy="18.2" rx="2.7" ry="1.8"/><ellipse cx="17.3" cy="16.2" rx="2.7" ry="1.8"/>'},
  {id:'home',name:'Accueil',paths:'<path d="m3 10 9-7 9 7v11h-7v-7h-4v7H3Z"/>'}
] as const;

const hex=(value:string,fallback:string)=>/^#[0-9a-f]{6}$/i.test(value)?value:fallback;
export function svgIconMarkup(iconId:string,design:SvgIconDesign):string {
  if(iconId==='pin3d'){
    const primary=hex(design.primary,'#f13c35'),accent=hex(design.accent,'#ad1419');
    return '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">'+
      '<defs><linearGradient id="pinBody" x1="0" y1="0" x2=".82" y2="1"><stop stop-color="'+primary+'"/><stop offset=".65" stop-color="'+primary+'"/><stop offset="1" stop-color="'+accent+'"/></linearGradient></defs>'+
      '<path d="M128 11C66 11 28 59 28 115c0 68 76 121 100 133 24-12 100-65 100-133C228 59 190 11 128 11Z" fill="'+accent+'" opacity=".55" transform="translate(5 2)"/>'+
      '<path d="M128 9C70 9 32 52 32 109c0 64 73 121 96 135 23-14 96-71 96-135C224 52 186 9 128 9Z" fill="url(#pinBody)" stroke="'+accent+'" stroke-width="3"/>'+
      '<path d="M43 104C48 49 81 20 128 20c48 0 82 31 87 84" fill="none" stroke="#ffffff" stroke-opacity=".22" stroke-width="8" stroke-linecap="round"/>'+
      '<circle cx="128" cy="109" r="43" fill="'+accent+'" opacity=".78"/><circle cx="128" cy="104" r="35" fill="none" stroke="'+primary+'" stroke-width="7"/></svg>';
  }
  const preset=SVG_ICON_PRESETS.find(p=>p.id===iconId)??SVG_ICON_PRESETS[0];
  const p=hex(design.primary,'#187e9c'),s=hex(design.secondary,'#ffffff'),a=hex(design.accent,'#43d8ce');
  const gradientId='novavisio-gradient';
  const fill=design.gradient?'url(#'+gradientId+')':p;
  const shape=design.shape==='rounded'
    ?'<rect x="1.2" y="1.2" width="21.6" height="21.6" rx="5.2" fill="'+fill+'" stroke="'+a+'" stroke-width=".55"/>'
    :'<circle cx="12" cy="12" r="10.7" fill="'+fill+'" stroke="'+a+'" stroke-width=".55"/>';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none">'+
    '<defs><linearGradient id="'+gradientId+'" x1="0" y1="0" x2="1" y2="1">'+
      '<stop offset="0%" stop-color="'+p+'"/><stop offset="100%" stop-color="'+a+'"/></linearGradient></defs>'+
    shape+'<g fill="none" stroke="'+s+'" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">'+preset.paths+'</g></svg>';
}
export function svgIconPreview(iconId:string,design:SvgIconDesign):string {
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svgIconMarkup(iconId,design));
}
export function pngFromSvg(iconId:string,design:SvgIconDesign):Promise<string> {
  const svg=svgIconPreview(iconId,design);
  return new Promise((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>{
      try{
        const canvas=document.createElement('canvas');
        canvas.width=256;canvas.height=256;
        const ctx=canvas.getContext('2d');
        if(!ctx)throw Error('Canvas indisponible');
        ctx.drawImage(image,0,0,256,256);
        resolve(canvas.toDataURL('image/png'));
      }catch(error){reject(error);}
    };
    image.onerror=()=>reject(Error('SVG non chargé'));
    image.src=svg;
  });
}
/** Colorise la silhouette/alpha d'une icône existante sans modifier son original. */
export function recolorIconPng(dataUrl:string,design:SvgIconDesign):Promise<string> {
  return new Promise((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>{
      try{
        const canvas=document.createElement('canvas');
        canvas.width=Math.min(512,Math.max(1,image.naturalWidth));
        canvas.height=Math.min(512,Math.max(1,image.naturalHeight));
        const ctx=canvas.getContext('2d');
        if(!ctx)throw Error('Canvas indisponible');
        ctx.drawImage(image,0,0,canvas.width,canvas.height);
        ctx.globalCompositeOperation='source-in';
        ctx.fillStyle=design.gradient?(()=>{
          const gradient=ctx.createLinearGradient(0,0,canvas.width,canvas.height);
          gradient.addColorStop(0,hex(design.primary,'#187e9c'));
          gradient.addColorStop(1,hex(design.accent,'#43d8ce'));
          return gradient;
        })():hex(design.primary,'#187e9c');
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.globalCompositeOperation='source-over';
        resolve(canvas.toDataURL('image/png'));
      }catch(error){reject(error);}
    };
    image.onerror=()=>reject(Error('Image non chargée'));
    image.src=dataUrl;
  });
}
/** Extraire deux couleurs significatives du logo, sans prétendre le faire si CORS l'empêche. */
export function paletteFromLogo(url:string):Promise<{primary:string;accent:string}> {
  return new Promise((resolve,reject)=>{
    const image=new Image();
    image.crossOrigin='anonymous';
    image.onload=()=>{
      try{
        const canvas=document.createElement('canvas');canvas.width=80;canvas.height=80;
        const ctx=canvas.getContext('2d',{willReadFrequently:true});
        if(!ctx)throw Error('Canvas indisponible');
        ctx.drawImage(image,0,0,80,80);
        const rgba=ctx.getImageData(0,0,80,80).data;
        const counts=new Map<string,number>();
        for(let i=0;i<rgba.length;i+=16){
          const [r,g,b,a]=[rgba[i],rgba[i+1],rgba[i+2],rgba[i+3]];
          if(a<160)continue;
          const max=Math.max(r,g,b),min=Math.min(r,g,b);
          const sat=max-min;
          if(sat<24||max<40||min>225)continue;
          const key=[r,g,b].map(v=>Math.min(255,Math.round(v/32)*32)).map(v=>v.toString(16).padStart(2,'0')).join('');
          counts.set(key,(counts.get(key)??0)+1);
        }
        const sorted=[...counts.entries()].sort((a,b)=>b[1]-a[1]).map(([k])=>k);
        if(!sorted.length)throw Error('Logo sans couleur dominante détectable');
        const first=sorted[0];
        const distance=(a:string,b:string)=>[0,2,4].reduce((sum,i)=>sum+(parseInt(a.slice(i,i+2),16)-parseInt(b.slice(i,i+2),16))**2,0);
        const second=sorted.find(k=>distance(k,first)>14000)??sorted[1]??first;
        resolve({primary:'#'+first,accent:'#'+second});
      }catch(error){reject(error);}
    };
    image.onerror=()=>reject(Error('Impossible de lire le logo : accès externe bloqué'));
    image.src=url;
  });
}
