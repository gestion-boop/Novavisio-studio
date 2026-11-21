import {BRAND_ICON_SET,type BrandIconSpec} from './brandIconSet';
import {readableOn,contrastRatio,type BrandColors} from './brandKit';

/**
 * Icônes de charte (NovaStudio AI — phase 2). Un seul dessin par icône : les trois états ne changent que les COULEURS
 * et un léger enfoncement de l'anneau intérieur. Géométrie identique → cadrage et proportions identiques par construction.
 */
export type IconShape='circle'|'rounded'|'minimal';
export type IconState='normal'|'hover'|'pressed';
export const ICON_STATES:ReadonlyArray<IconState>=['normal','hover','pressed'];
export const ICON_SHAPES:ReadonlyArray<{id:IconShape;label:string}>=[
  {id:'circle',label:'Rond'},{id:'rounded',label:'Carré arrondi'},{id:'minimal',label:'Minimaliste'}
];

const esc=(v:string|number)=>String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const attrs=(o:Record<string,string|number>)=>Object.entries(o).map(([k,v])=>`${k}="${esc(v)}"`).join(' ');

/** Couleurs de chaque état : seules valeurs qui diffèrent entre les trois états. */
export function stateColors(c:BrandColors,state:IconState):{fill:string;glyph:string;ring:string;inner:string}{
  const fill=state==='normal'?c.btnRest:state==='hover'?c.btnHover:c.btnPressed;
  // Le symbole garde la MÊME couleur sur les trois états quand le contraste le permet (sinon il s'adapte à chaque état).
  const common=readableOn(c.btnRest);
  const fits=[c.btnRest,c.btnHover,c.btnPressed].every(f=>contrastRatio(common,f)>=3);
  return {fill,glyph:fits?common:readableOn(fill),ring:state==='hover'?c.glow:c.border,inner:state==='pressed'?'#00000059':'#ffffff26'};
}

/** SVG d'une icône pour un état donné. Géométrie identique entre les états (seules les couleurs changent). */
export function iconSvg(spec:BrandIconSpec,c:BrandColors,shape:IconShape,state:IconState):string{
  const k=stateColors(c,state);
  const glyphGroup=`<g fill="none" stroke="${k.glyph}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" transform="translate(12 12) scale(0.56) translate(-12 -12)">`+
    spec.nodes.map(([tag,a])=>`<${tag} ${attrs(a)}/>`).join('')+'</g>';
  let base='';
  if(shape==='circle'){
    base=`<circle cx="12" cy="12" r="10.7" fill="${k.fill}" stroke="${k.ring}" stroke-width="0.6"/>`+
      `<circle cx="12" cy="12" r="9.6" fill="none" stroke="${k.inner}" stroke-width="0.9"/>`;
  }else if(shape==='rounded'){
    base=`<rect x="1.2" y="1.2" width="21.6" height="21.6" rx="5.2" fill="${k.fill}" stroke="${k.ring}" stroke-width="0.6"/>`+
      `<rect x="2.3" y="2.3" width="19.4" height="19.4" rx="4.2" fill="none" stroke="${k.inner}" stroke-width="0.9"/>`;
  }
  // minimaliste : pas de fond, le trait prend la couleur de l'état (pas de cercle)
  const glyph=shape==='minimal'?glyphGroup.replace(`stroke="${k.glyph}"`,`stroke="${k.fill}"`):glyphGroup;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24">${base}${glyph}</svg>`;
}

export type PackFile={key:string;label:string;state:IconState;filename:string;svg:string};
/** Pack complet : 36 icônes × 3 états, noms normalisés (reservation_normal, reservation_hover, reservation_pressed). */
export function buildPack(c:BrandColors,shape:IconShape):PackFile[]{
  const out:PackFile[]=[];
  for(const spec of BRAND_ICON_SET)for(const state of ICON_STATES)
    out.push({key:spec.key,label:spec.label,state,filename:`${spec.key}_${state}`,svg:iconSvg(spec,c,shape,state)});
  return out;
}
export const PACK_SIZE=BRAND_ICON_SET.length*ICON_STATES.length;

/** Rendu PNG transparent (navigateur uniquement) : taille 256 pour l'éditeur, jusqu'à 1024 pour l'export. */
export function svgToPng(svg:string,size:number):Promise<string>{
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>{
      try{
        const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
        const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas indisponible');
        ctx.drawImage(img,0,0,size,size);resolve(canvas.toDataURL('image/png'));
      }catch(e){reject(e);}
    };
    img.onerror=()=>reject(new Error('Icône non rendue'));
    img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  });
}
