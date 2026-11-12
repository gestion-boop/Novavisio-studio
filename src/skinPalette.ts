import type {BarStyle} from './storage';
import {paletteFromLogo} from './svgIcons';
import {cloudConfigured,supabase} from './cloud';

/** Propositions de couleurs pour le skin de la barre, calculées à partir du logo (ou, à défaut, d'une photo) de l'établissement. */
const toRgb=(hex:string):[number,number,number]=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)) as [number,number,number];
const toHex=(rgb:number[])=>'#'+rgb.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
const mix=(a:string,b:string,t:number)=>{const [x,y]=[toRgb(a),toRgb(b)];return toHex(x.map((v,i)=>v*(1-t)+y[i]*t));};
const luminance=(hex:string)=>{const [r,g,b]=toRgb(hex).map(v=>{const c=v/255;return c<=.03928?c/12.92:((c+.055)/1.055)**2.4;});return .2126*r+.7152*g+.0722*b;};
const readable=(bg:string)=>luminance(bg)>.45?'#1b1b1f':'#ffffff';

export type SkinProposal={name:string;style:Pick<BarStyle,'background'|'outline'|'button'|'buttonOutline'|'icon'>};
export function proposalsFrom(primary:string,accent:string):SkinProposal[]{
  const dark=(c:string,t:number)=>mix(c,'#000000',t),light=(c:string,t:number)=>mix(c,'#ffffff',t);
  return [
    {name:'Couleur du logo',style:{background:light(primary,.9),outline:light(primary,.5),button:primary,buttonOutline:dark(primary,.3),icon:readable(primary)}},
    {name:'Accent du logo',style:{background:light(accent,.9),outline:light(accent,.5),button:accent,buttonOutline:dark(accent,.3),icon:readable(accent)}},
    {name:'Sombre élégant',style:{background:mix('#14181d',primary,.16),outline:accent,button:dark(primary,.25),buttonOutline:accent,icon:readable(dark(primary,.25))}},
    {name:'Clair et sobre',style:{background:'#f4f1ea',outline:light(primary,.55),button:primary,buttonOutline:accent,icon:readable(primary)}}
  ];
}
/** Télécharge l'image par le serveur NovaStudio (le site d'origine n'autorise généralement pas la lecture de ses pixels). */
async function viaProxy(url:string):Promise<string>{
  if(!cloudConfigured)throw Error('Cloud non configuré');
  const {data}=await supabase().auth.getSession();
  const token=data.session?.access_token;
  if(!token)throw Error('Connexion Cloud requise');
  const response=await fetch('/api/novagen-image?url='+encodeURIComponent(url),{headers:{authorization:'Bearer '+token},cache:'no-store'});
  if(!response.ok)throw Error('Image inaccessible');
  return URL.createObjectURL(await response.blob());
}
export async function proposalsFromImages(urls:string[]):Promise<SkinProposal[]>{
  for(const url of urls){
    let local='';
    try{
      local=await viaProxy(url);
      const {primary,accent}=await paletteFromLogo(local);
      return proposalsFrom(primary,accent);
    }catch{/* on essaie l'image suivante */}
    finally{if(local)URL.revokeObjectURL(local);}
  }
  throw Error('Aucune couleur détectable : le logo et les photos ne sont pas lisibles.');
}
