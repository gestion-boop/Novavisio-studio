import type {Scene,StudioProject} from './storage';

/**
 * Luminosité des panoramas intérieurs, sans « blanchir » les photos.
 * Une courbe gamma (sortie = entrée ^ exposant, exposant < 1) relève les ombres et les tons moyens
 * mais laisse le blanc pur et le noir purs : les fenêtres et les zones claires ne se brûlent pas.
 * Appliquée à l'affichage seulement (filtre SVG sur le canevas) : aucune photo n'est modifiée.
 */
export const INTERIOR_FILTER_ID='nv-interior-lift';
export const INTERIOR_LIFT_MAX=60;
/** 0 % = aucun changement ; 25 % ≈ exposant 0,77 ; 60 % ≈ exposant 0,58. */
export const interiorExponent=(lift:number):number=>1/(1+Math.max(0,Math.min(INTERIOR_LIFT_MAX,lift))*0.012);
export const interiorLiftOf=(project:Pick<StudioProject,'interiorLift'>):number=>{const v=project.interiorLift;return typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.min(INTERIOR_LIFT_MAX,v)):0;};
/** Vrai si ce panorama est un intérieur et qu'un éclaircissement est réglé pour la visite. */
export const interiorLifted=(project:Pick<StudioProject,'interiorLift'>,scene?:Pick<Scene,'interior'>|null):boolean=>!!scene?.interior&&interiorLiftOf(project)>0;

/** Définition du filtre, à placer une fois dans la page (sans effet tant qu'aucune classe ne l'utilise). */
export function InteriorLightFilter({lift}:{lift:number}){
  const e=interiorExponent(lift).toFixed(3);
  return <svg width="0" height="0" aria-hidden="true" focusable="false" style={{position:'absolute',pointerEvents:'none'}}>
    <filter id={INTERIOR_FILTER_ID} colorInterpolationFilters="sRGB">
      <feComponentTransfer>
        <feFuncR type="gamma" amplitude="1" exponent={e} offset="0"/>
        <feFuncG type="gamma" amplitude="1" exponent={e} offset="0"/>
        <feFuncB type="gamma" amplitude="1" exponent={e} offset="0"/>
      </feComponentTransfer>
    </filter>
  </svg>;
}
