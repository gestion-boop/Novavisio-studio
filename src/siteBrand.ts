import {generateBrand,isHex,hexToHsl,type BrandColors,type StyleId} from './brandKit';

/**
 * Analyse de l'identité graphique publique d'un site (module 1 — NovaStudio AI).
 * Fonctions pures : elles travaillent sur du HTML/CSS déjà téléchargé côté serveur.
 * Tout résultat est une PROPOSITION : source indiquée, à valider par l'utilisateur.
 */
export type ColorFinding={hex:string;count:number;source:'theme-color'|'css'};
export type FontFinding={name:string;source:'google-fonts'|'css'};
export type SiteBrandAnalysis={colors:ColorFinding[];fonts:FontFinding[];themeColor:string};

const GENERIC_FONTS=new Set(['serif','sans-serif','monospace','cursive','fantasy','system-ui','inherit','initial','unset','-apple-system','blinkmacsystemfont','ui-sans-serif','ui-serif']);

/** Forme #rgb / #rrggbb → #rrggbb minuscule ; sinon ''. */
export function normalizeHex(raw:string):string{
  const v=raw.trim().toLowerCase();
  if(/^#[0-9a-f]{3}$/.test(v)) return '#'+v.slice(1).split('').map(c=>c+c).join('');
  if(/^#[0-9a-f]{6}$/.test(v)) return v;
  return '';
}

/** Couleur « utile » : pas un gris quasi neutre ni un blanc/noir pur (ce sont souvent des textes ou des fonds). */
export function isUsefulColor(hex:string):boolean{
  if(!isHex(hex)) return false;
  const [, s, l]=hexToHsl(hex); // s et l sont exprimés sur 0–100
  return s>=12 && l>=8 && l<=92;
}

export function extractColors(css:string):ColorFinding[]{
  const counts=new Map<string,number>();
  for(const m of css.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)){
    const hex=normalizeHex(m[0]); if(!hex||!isUsefulColor(hex)) continue;
    counts.set(hex,(counts.get(hex)??0)+1);
  }
  return [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12).map(([hex,count])=>({hex,count,source:'css' as const}));
}

export function extractThemeColor(html:string):string{
  const m=html.match(/<meta[^>]+name=["']theme-color["'][^>]*content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*name=["']theme-color["']/i);
  const hex=m?normalizeHex(m[1]):'';
  return isUsefulColor(hex)?hex:'';
}

export function extractFonts(html:string,css:string):FontFinding[]{
  const out:FontFinding[]=[];const seen=new Set<string>();
  const add=(name:string,source:FontFinding['source'])=>{
    const clean=name.replace(/["']/g,'').trim();
    const key=clean.toLowerCase();
    if(!clean||clean.length>60||GENERIC_FONTS.has(key)||seen.has(key)) return;
    seen.add(key); out.push({name:clean,source});
  };
  for(const m of html.matchAll(/fonts\.googleapis\.com\/css2?\?[^"'>\s]*/g)){
    for(const fam of m[0].matchAll(/family=([^&"'\s]+)/g)){
      add(decodeURIComponent(fam[1]).split(':')[0].replace(/\+/g,' '),'google-fonts');
    }
  }
  for(const m of css.matchAll(/font-family\s*:\s*([^;}{]+)/gi)){
    const first=m[1].split(',')[0];
    add(first,'css');
  }
  return out.slice(0,6);
}

export function analyzeSiteBrand(html:string,css:string=''):SiteBrandAnalysis{
  const themeColor=extractThemeColor(html);
  const colors=extractColors(css+' '+html);
  const all:ColorFinding[]=themeColor?[{hex:themeColor,count:999,source:'theme-color'},...colors.filter(c=>c.hex!==themeColor)]:colors;
  return {colors:all.slice(0,10),fonts:extractFonts(html,css),themeColor};
}

/**
 * Charte proposée : si le site donne une couleur, on la prend comme graine ;
 * sinon on génère une charte adaptée au secteur (style par défaut de la catégorie).
 */
export function proposeBrand(analysis:SiteBrandAnalysis|null,fallbackStyle:StyleId,fallbackSeed:string):{colors:BrandColors;origin:'site'|'proposition';seed:string}{
  const seed=analysis&&analysis.colors[0]?analysis.colors[0].hex:fallbackSeed;
  const origin=analysis&&analysis.colors.length?'site':'proposition';
  return {colors:generateBrand(seed,fallbackStyle),origin,seed};
}
