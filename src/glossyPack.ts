import {BRAND_ICON_SET} from './brandIconSet';
import {ICON_STATES,svgToPng,type IconShape} from './brandIcons';
import {glossyIconStates} from './glossyIcon';
import type {BrandColors} from './brandKit';
import type {CustomIcon} from './storage';

const LABEL: Record<string, string> = {normal: 'Normal', hover: 'Survol', pressed: 'Pressé'};
const attrs = (o: Record<string, string | number>) => Object.entries(o).map(([k, v]) => `${k}="${String(v)}"`).join(' ');

/** Pictogramme blanc seul (sans fond), à passer au générateur glossy. */
function glyphSvg(nodes: ReadonlyArray<[string, Record<string, string | number>]>): string {
  const body = nodes.map(([tag, a]) => `<${tag} ${attrs(a)}/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24"><g fill="none" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" transform="translate(12 12) scale(0.56) translate(-12 -12)">${body}</g></svg>`;
}

/**
 * Pack glossy : 36 icônes × 3 états, bouton brillant à la couleur principale de la charte.
 * Noms au même format que le pack plat (« libellé · Normal »), pour la bibliothèque générale.
 */
export async function buildGlossyPack(c: BrandColors, _shape: IconShape = 'circle'): Promise<CustomIcon[]> {
  const out: CustomIcon[] = [];
  for (const spec of BRAND_ICON_SET) {
    const glyph = await svgToPng(glyphSvg(spec.nodes as never), 256);
    const states = await glossyIconStates({base: c.primary, glyph, size: 256, format: 'png'});
    for (const state of ICON_STATES) {
      out.push({id: spec.key + '-' + state, name: spec.label + ' · ' + LABEL[state], dataUrl: states[state]});
    }
  }
  return out;
}
