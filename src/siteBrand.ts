import {generateBrand,type BrandColors,type StyleId} from './brandKit';
import {type SiteBrandAnalysis} from '../shared/siteBrandCore';

/**
 * Analyse de l'identité graphique publique d'un site (module 1 — NovaStudio AI).
 * L'extraction (couleurs, polices, couleur de thème) est dans shared/siteBrandCore.js, partagée avec l'API.
 * Tout résultat est une PROPOSITION : source indiquée, à valider par l'utilisateur.
 */
export {analyzeSiteBrand, extractColors, extractFonts, extractThemeColor, isUsefulColor, normalizeHex} from '../shared/siteBrandCore';
export type {ColorFinding, FontFinding, SiteBrandAnalysis} from '../shared/siteBrandCore';

/**
 * Charte proposée : si le site donne une couleur, on la prend comme graine ;
 * sinon on génère une charte adaptée au secteur (style par défaut de la catégorie).
 */
export function proposeBrand(analysis: SiteBrandAnalysis | null, fallbackStyle: StyleId, fallbackSeed: string): {colors: BrandColors; origin: 'site' | 'proposition'; seed: string} {
  const seed = analysis && analysis.colors[0] ? analysis.colors[0].hex : fallbackSeed;
  const origin = analysis && analysis.colors.length ? 'site' : 'proposition';
  return {colors: generateBrand(seed, fallbackStyle), origin, seed};
}
