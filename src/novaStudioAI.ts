import {askAspirate} from './aspirate';
import {type BrandKit, type StyleId, generateBrand, isHex} from './brandKit';
import {paletteFromLogo} from './svgIcons';

export type ActivityCategory =
  | 'restaurant'
  | 'hotel'
  | 'camping'
  | 'immobilier'
  | 'airbnb'
  | 'gite'
  | 'commerce'
  | 'spa'
  | 'musee'
  | 'tourisme'
  | 'autre';

export const ACTIVITY_CATEGORIES: ReadonlyArray<{
  id: ActivityCategory;
  label: string;
  defaultStyle: StyleId;
  defaultSeed: string;
}> = [
  {id: 'restaurant', label: 'Restaurant', defaultStyle: 'luxe', defaultSeed: '#8f2d2f'},
  {id: 'hotel', label: 'Hôtel', defaultStyle: 'luxe', defaultSeed: '#c79c5a'},
  {id: 'camping', label: 'Camping', defaultStyle: 'nature', defaultSeed: '#536e28'},
  {id: 'immobilier', label: 'Immobilier', defaultStyle: 'moderne', defaultSeed: '#176a91'},
  {id: 'airbnb', label: 'Airbnb', defaultStyle: 'familial', defaultSeed: '#e8734a'},
  {id: 'gite', label: 'Gîte', defaultStyle: 'nature', defaultSeed: '#688e4e'},
  {id: 'commerce', label: 'Commerce', defaultStyle: 'moderne', defaultSeed: '#2b5876'},
  {id: 'spa', label: 'Spa / institut', defaultStyle: 'elegant', defaultSeed: '#8e5b7b'},
  {id: 'musee', label: 'Musée', defaultStyle: 'classique', defaultSeed: '#2c3e50'},
  {id: 'tourisme', label: 'Tourisme', defaultStyle: 'mediterraneen', defaultSeed: '#1f8a85'},
  {id: 'autre', label: 'Autre', defaultStyle: 'moderne', defaultSeed: '#2f8fb5'},
];

export type VisitType = 'classic' | 'premium' | 'vr' | 'hybrid';

export const VISIT_TYPES: ReadonlyArray<{
  id: VisitType;
  label: string;
  description: string;
  tag: string;
}> = [
  {id: 'classic', label: 'Classique 360°', description: 'Visite immersive interactive web standard', tag: '360°'},
  {id: 'premium', label: 'Premium', description: 'Visite haut de gamme avec médias HD et intro animée', tag: 'HD'},
  {id: 'vr', label: 'VR (Casque)', description: 'Optimisée pour casques WebXR (Meta Quest, etc.)', tag: 'WebXR'},
  {id: 'hybrid', label: 'Mixte', description: 'Expérience complète : Ordinateur, Mobile et Casque VR', tag: 'Complet'},
];

export type DetectedInfo = {
  website?: string;
  colors: string[];
  themeColor?: string;
  fonts: string[];
  logoUrls: string[];
  photoUrls: string[];
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  bookingUrl?: string;
  facebook?: string;
  instagram?: string;
  openingHours?: string;
  services?: string[];
  notes?: string[];
  raw?: unknown;
};

/** Analyse automatique du site internet public via le crawler serveur NovaStudio */
export async function analyzeWebsite(url: string, signal?: AbortSignal): Promise<DetectedInfo> {
  const result = await askAspirate(url, signal);
  const fiche = result.fiche || {};
  const brand = result.brand;

  const colors: string[] = [];
  if (brand?.themeColor && isHex(brand.themeColor)) colors.push(brand.themeColor);
  if (Array.isArray(brand?.colors)) {
    for (const c of brand.colors) {
      if (c?.hex && isHex(c.hex) && !colors.includes(c.hex)) {
        colors.push(c.hex);
      }
    }
  }

  const fonts: string[] = [];
  if (Array.isArray(brand?.fonts)) {
    for (const f of brand.fonts) {
      if (f?.name && !fonts.includes(f.name)) fonts.push(f.name);
    }
  }

  const openingHours = Array.isArray(fiche.horaires) && fiche.horaires.length
    ? fiche.horaires.join(' · ')
    : undefined;

  return {
    website: fiche.site || url,
    colors,
    themeColor: brand?.themeColor || undefined,
    fonts,
    logoUrls: result.logos || [],
    photoUrls: result.photos || [],
    address: fiche.adresse || undefined,
    city: fiche.ville || undefined,
    phone: fiche.tel || undefined,
    email: fiche.email || undefined,
    bookingUrl: fiche.booking || undefined,
    facebook: fiche.facebook || undefined,
    instagram: fiche.instagram || undefined,
    openingHours,
    services: fiche.services || [],
    notes: result.notes || [],
    raw: result,
  };
}

/** Analyse des couleurs dominantes d'un logo importé ou choisi */
export async function analyzeLogoColors(logoDataUrl: string): Promise<{primary: string; accent: string}> {
  return paletteFromLogo(logoDataUrl);
}

/** Devine la catégorie d'activité d'après le texte descriptif ou les données trouvées */
export function inferCategory(name: string, description?: string, services?: string[]): ActivityCategory {
  const text = `${name} ${description || ''} ${(services || []).join(' ')}`.toLowerCase();
  if (/restaurant|bistrot|brasserie|carte|menu|table|dégustation|chef|cuisine/i.test(text)) return 'restaurant';
  if (/hôtel|hotel|chambre|suite|relais|auberge/i.test(text)) return 'hotel';
  if (/camping|mobil-home|tente|caravane|bungalow|emplacement/i.test(text)) return 'camping';
  if (/immo|agence|appartement|villa|maison|terrain|vente|location|mandat/i.test(text)) return 'immobilier';
  if (/airbnb|location saisonnière|court séjour/i.test(text)) return 'airbnb';
  if (/gîte|gite|meublé de tourisme|chambre d'hôtes/i.test(text)) return 'gite';
  if (/spa|massage|institut|beauté|bien-être|sauna|hammam|soin/i.test(text)) return 'spa';
  if (/musée|galerie|exposition|monument|château|patrimoine/i.test(text)) return 'musee';
  if (/tourisme|office|visite|activité|excursion|loisir/i.test(text)) return 'tourisme';
  if (/boutique|magasin|commerce|produit|vente/i.test(text)) return 'commerce';
  return 'autre';
}

/** Prépare la charte graphique initiale à partir des éléments détectés ou par défaut */
export function buildInitialBrandKit(
  category: ActivityCategory,
  detected?: DetectedInfo | null,
  logoColors?: {primary: string; accent: string} | null,
  styleOverride?: StyleId
): {kit: BrandKit; seed: string; styleId: StyleId} {
  const catConfig = ACTIVITY_CATEGORIES.find((c) => c.id === category) || ACTIVITY_CATEGORIES[ACTIVITY_CATEGORIES.length - 1];
  const styleId: StyleId = styleOverride || catConfig.defaultStyle;

  // Priorité pour la couleur de départ :
  // 1. Logo dominant
  // 2. Méta theme-color du site
  // 3. Première couleur CSS utile
  // 4. Couleur par défaut de la catégorie
  let seed = catConfig.defaultSeed;
  if (logoColors?.primary && isHex(logoColors.primary)) {
    seed = logoColors.primary;
  } else if (detected?.themeColor && isHex(detected.themeColor)) {
    seed = detected.themeColor;
  } else if (detected?.colors?.length && isHex(detected.colors[0])) {
    seed = detected.colors[0];
  }

  const colors = generateBrand(seed, styleId);
  return {
    kit: {
      styleId,
      colors,
      validated: false,
      seed,
    },
    seed,
    styleId,
  };
}
