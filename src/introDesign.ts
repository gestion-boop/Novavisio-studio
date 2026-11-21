import {contrastRatio,hexToHsl,hslToHex,isHex,readableOn} from './brandKit';

/**
 * Introduction native (NovaStudio AI — phase 3). Logique PURE, sans réseau.
 * Priorité : une URL d'introduction externe (existante) reste prioritaire ; l'introduction native ne s'active que sans URL.
 */
export const INTRO_STYLES: ReadonlyArray<{id: IntroStyleId; label: string}> = [
  {id:'premium',label:'Premium'},{id:'cinematic',label:'Cinématique'},{id:'minimal',label:'Minimaliste'},
  {id:'luxe',label:'Luxe'},{id:'nature',label:'Nature'},{id:'moderne',label:'Moderne'},{id:'dynamique',label:'Dynamique'}
];
export type IntroStyleId='premium'|'cinematic'|'minimal'|'luxe'|'nature'|'moderne'|'dynamique';
export type IntroAnimation='fade'|'zoom'|'slide'|'iris'|'curtain'|'sweep';
export const INTRO_ANIMATIONS: ReadonlyArray<{id: IntroAnimation; label: string}> = [
  {id:'fade',label:'Fondu'},{id:'zoom',label:'Zoom doux'},{id:'slide',label:'Glissement'},
  {id:'iris',label:'Ouverture iris'},{id:'curtain',label:'Ouverture rideau'},{id:'sweep',label:'Balayage diagonal'}
];
export const INTRO_LOGO_SHAPES = [
  {id:'original',label:'Par défaut'}, {id:'round',label:'Rond'}, {id:'square',label:'Carré'}
] as const;
export type IntroLogoShape = typeof INTRO_LOGO_SHAPES[number]['id'];

export type IntroDesign = {
  enabled: boolean;
  styleId: IntroStyleId;
  title: string;
  subtitle: string;
  buttonLabel: string;
  animation: IntroAnimation;
  logoDataUrl?: string;
  logoShape?: IntroLogoShape;
  backgroundColor?: string;
  buttonColor?: string;
  welcomeColor?: string;
};
export const INTRO_DEFAULT_COLORS={background:'#0b1826',button:'#224a95'} as const;
export const INTRO_LIMITS={title:80,subtitle:160,button:30,logoChars:1_500_000} as const;
export const DEFAULT_INTRO_DESIGN: IntroDesign={enabled:false,styleId:'premium',title:'',subtitle:'',buttonLabel:'Découvrir',animation:'fade'};

const LOGO=/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
/** Vérifie la forme d'une introduction native (lève une erreur explicite sinon). */
export function validateIntroDesign(v: unknown): IntroDesign {
  const d=v as IntroDesign;
  const styleOk=INTRO_STYLES.some(s=>s.id===d?.styleId);
  const animOk=INTRO_ANIMATIONS.some(a=>a.id===d?.animation);
  if(!d||typeof d!=='object'||typeof d.enabled!=='boolean'||!styleOk||!animOk) throw new Error('Introduction invalide');
  if(typeof d.title!=='string'||d.title.length>INTRO_LIMITS.title) throw new Error('Titre d’introduction trop long');
  if(typeof d.subtitle!=='string'||d.subtitle.length>INTRO_LIMITS.subtitle) throw new Error('Sous-titre d’introduction trop long');
  if(typeof d.buttonLabel!=='string'||d.buttonLabel.length>INTRO_LIMITS.button) throw new Error('Libellé du bouton trop long');
  for(const color of [d.backgroundColor,d.buttonColor,d.welcomeColor]){
    if(color!==undefined&&!isHex(color))throw new Error('Couleur d’introduction invalide');
  }
  if(d.logoShape!==undefined&&!INTRO_LOGO_SHAPES.some(shape=>shape.id===d.logoShape)) throw new Error('Forme du logo invalide');
  if(d.logoDataUrl!==undefined&&(typeof d.logoDataUrl!=='string'||d.logoDataUrl.length>INTRO_LIMITS.logoChars||!LOGO.test(d.logoDataUrl)))
    throw new Error('Logo d’introduction invalide (PNG, JPG ou WebP, 1 Mo maximum)');
  return {...DEFAULT_INTRO_DESIGN,...d};
}

/** Une URL externe existante a toujours la priorité. */
export function nativeIntroActive(p:{introUrl?:string;introDesign?:IntroDesign}): boolean {
  return !!p.introDesign?.enabled && !(p.introUrl??'').startsWith('https://');
}
/** Durée en secondes, bornée (même règle que l'introduction existante : 2 à 60 s, 6 s par défaut). */
export function introDurationSec(p:{introDuration?:number}): number {
  const n=p.introDuration??6;
  return Number.isFinite(n)?Math.max(2,Math.min(60,n)):6;
}

/** Conserve la teinte du projet et ajuste sa luminosité pour le texte d’accueil. */
export function introWelcomeColor(accent:string,background:string):string {
  const fallback=readableOn(background);
  if(!isHex(accent))return fallback;
  if(contrastRatio(accent,background)>=4.5)return accent;
  const [hue,saturation,lightness]=hexToHsl(accent);
  const direction=fallback==='#ffffff'?1:-1;
  for(let step=1;step<=20;step++){
    const color=hslToHex(hue,saturation,lightness+step*5*direction);
    if(contrastRatio(color,background)>=4.5)return color;
  }
  return fallback;
}
