import type {Scene,StudioProject} from './storage';

/**
 * Retouche des panoramas d'intérieur (Exposition, Saturation, Vibrance, Température, Contraste, Points forts),
 * à l'échelle −100 / +100 d'un éditeur de photos. Appliquée à l'AFFICHAGE par un filtre SVG sur le canevas :
 * aucune photo n'est modifiée et chaque valeur reste réversible. Seuls les panoramas marqués « intérieur » en profitent.
 */
export type InteriorGrade={exposure:number;saturation:number;vibrance:number;temperature:number;contrast:number;highlights:number};
export const GRADE_KEYS=['exposure','saturation','vibrance','temperature','contrast','highlights'] as const;
export const GRADE_LABELS:Record<keyof InteriorGrade,string>={exposure:'Exposition',saturation:'Saturation',vibrance:'Vibrance',temperature:'Température',contrast:'Contraste',highlights:'Points forts'};
/** Réglage demandé : on applique les valeurs négatives (Exposition −10, Température −10, Points forts −10). */
export const RECOMMENDED_GRADE:InteriorGrade={exposure:-10,saturation:0,vibrance:0,temperature:-10,contrast:0,highlights:-10};
export const INTERIOR_FILTER_ID='nv-interior-lift';

const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
export function gradeOf(project:Pick<StudioProject,'interiorGrade'>):InteriorGrade|null{
  const g=project.interiorGrade;
  if(!g||typeof g!=='object')return null;
  const out={} as InteriorGrade;let any=false;
  for(const k of GRADE_KEYS){const v=Number((g as Partial<InteriorGrade>)[k]);out[k]=Number.isFinite(v)?clamp(Math.round(v),-100,100):0;if(out[k]!==0)any=true;}
  return any?out:null;
}
/** Vrai si ce panorama est un intérieur et qu'une retouche est réglée pour la visite. */
export const interiorLifted=(project:Pick<StudioProject,'interiorGrade'>,scene?:Pick<Scene,'interior'>|null):boolean=>!!scene?.interior&&!!gradeOf(project);

/** Courbe d'un canal (0 à 1) : exposition, température, contraste puis points forts. */
export function gradeCurve(g:InteriorGrade,channel:'r'|'g'|'b',x:number):number{
  const gain=Math.pow(2,g.exposure/100*1.5);
  const tone=channel==='r'?1+0.003*g.temperature:channel==='b'?1-0.003*g.temperature:1;
  let y=x*gain*tone;
  y=(y-0.5)*(1+g.contrast/100*0.7)+0.5;
  const w=Math.max(0,(x-0.45)/0.55);
  y+=(g.highlights/100)*0.35*w*w;
  return clamp(y,0,1);
}
const table=(g:InteriorGrade,c:'r'|'g'|'b',n=17)=>Array.from({length:n},(_,i)=>gradeCurve(g,c,i/(n-1)).toFixed(4)).join(' ');
/** Saturation globale : curseur Saturation et moitié de l'effet de la Vibrance. */
export const gradeSaturation=(g:InteriorGrade):number=>Math.max(0,(1+g.saturation/100)*(1+0.5*g.vibrance/100));

/** Définition du filtre, placée une fois dans la page (sans effet tant qu'aucune classe ne l'utilise). */
export function InteriorLightFilter({grade}:{grade:InteriorGrade}){
  return <svg width="0" height="0" aria-hidden="true" focusable="false" style={{position:'absolute',pointerEvents:'none'}}>
    <filter id={INTERIOR_FILTER_ID} colorInterpolationFilters="sRGB">
      <feColorMatrix type="saturate" values={gradeSaturation(grade).toFixed(3)}/>
      <feComponentTransfer>
        <feFuncR type="table" tableValues={table(grade,'r')}/>
        <feFuncG type="table" tableValues={table(grade,'g')}/>
        <feFuncB type="table" tableValues={table(grade,'b')}/>
      </feComponentTransfer>
    </filter>
  </svg>;
}
