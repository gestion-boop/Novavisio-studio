import type { BottomBarItem, BarStyle } from './storage';
import type { ActivityCategory } from './novaStudioAI';
import type { BrandColors } from './brandKit';
import type { IntroDesign, IntroStyleId, IntroAnimation } from './introDesign';
import { introWelcomeColor } from './introDesign';

export type AutoButtonItem = {
  key: string;
  title: string;
  description: string;
  type: BottomBarItem['type'];
  iconKey: string; // Correspond à la clé dans BRAND_ICON_SET
  recommended: boolean;
  url?: string;
  text?: string;
};

export type AutoBarLayout = 'discrete' | 'floating' | 'minimal' | 'full';

export interface AutoBarLayoutOption {
  id: AutoBarLayout;
  label: string;
  description: string;
  height: number;
  roundness: number;
  outlineWidth: number;
  buttonOutlineWidth: number;
}

export const AUTO_BAR_LAYOUTS: AutoBarLayoutOption[] = [
  {
    id: 'discrete',
    label: 'Barre discrète',
    description: 'Boutons arrondis et hauteur équilibrée, idéale pour laisser respirer le panorama 360°.',
    height: 68,
    roundness: 60,
    outlineWidth: 1,
    buttonOutlineWidth: 1,
  },
  {
    id: 'floating',
    label: 'Boutons flottants',
    description: 'Style aérien tout en rondeur pour une expérience moderne.',
    height: 76,
    roundness: 80,
    outlineWidth: 2,
    buttonOutlineWidth: 1,
  },
  {
    id: 'minimal',
    label: 'Minimaliste épuré',
    description: 'Formes douces et contrastées, sobre et sans surcharge visuelle.',
    height: 60,
    roundness: 24,
    outlineWidth: 1,
    buttonOutlineWidth: 0,
  },
  {
    id: 'full',
    label: 'Charte intégrale',
    description: 'Reprend fidèlement les bordures et contrastes affirmés de la charte graphique.',
    height: 72,
    roundness: 40,
    outlineWidth: 2,
    buttonOutlineWidth: 2,
  },
];

/**
 * Génère des propositions de boutons intelligents en fonction de la catégorie,
 * des données vérifiées du site web et des coordonnées saisies.
 */
export function generateAutoMenuProposals(params: {
  category: ActivityCategory;
  clientName: string;
  bookingUrl?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  services?: string[];
  openingHours?: string;
  hasPhotos?: boolean;
}): AutoButtonItem[] {
  const {
    category,
    clientName,
    bookingUrl,
    phone,
    email,
    website,
    address,
    services,
    openingHours,
    hasPhotos
  } = params;

  const proposals: AutoButtonItem[] = [];

  // 1. Bouton Réservation (Prioritaire pour restaurant, hôtel, camping, gîte, spa)
  const isBookingSector = ['restaurant', 'hotel', 'camping', 'airbnb', 'gite', 'spa'].includes(category);
  if (bookingUrl || isBookingSector) {
    proposals.push({
      key: 'reservation',
      title: 'Réservation',
      description: bookingUrl ? 'Lien direct vers votre moteur de réservation en ligne' : 'Bouton de réservation pour vos clients',
      type: 'lien',
      iconKey: 'reservation',
      recommended: true,
      url: bookingUrl || (website ? `${website.replace(/\/$/, '')}/reservation` : ''),
    });
  }

  // 2. Boutons spécifiques par secteur d'activité
  switch (category) {
    case 'restaurant':
      proposals.push({
        key: 'carte',
        title: 'Carte & Menus',
        description: 'Présentation de votre carte, formules et spécialités culinaires',
        type: 'information',
        iconKey: 'restaurant',
        recommended: true,
        text: services?.length ? `Nos spécialités et prestations :\n• ${services.join('\n• ')}` : 'Consultez nos menus et notre carte du moment.',
      });
      break;

    case 'hotel':
    case 'airbnb':
    case 'gite':
      proposals.push({
        key: 'chambres',
        title: category === 'hotel' ? 'Chambres & Suites' : 'Hébergements',
        description: 'Détails des chambres, équipements et capacités d’accueil',
        type: 'information',
        iconKey: 'chambre',
        recommended: true,
        text: services?.length ? `Prestations & Équipements :\n• ${services.join('\n• ')}` : 'Découvrez nos chambres confortables et nos espaces privatifs.',
      });
      break;

    case 'camping':
      proposals.push({
        key: 'hebergements',
        title: 'Hébergements & Emplacements',
        description: 'Mobil-homes, lodges, chalets et emplacements tentes / camping-cars',
        type: 'information',
        iconKey: 'hebergement',
        recommended: true,
        text: services?.length ? `Activités & Prestations du camping :\n• ${services.join('\n• ')}` : 'Découvrez nos hébergements de plein air et emplacements.',
      });
      proposals.push({
        key: 'plan_camping',
        title: 'Plan du domaine',
        description: 'Plan interactif du domaine pour repérer la piscine, l’accueil et les allées',
        type: 'plan',
        iconKey: 'plan',
        recommended: true,
      });
      break;

    case 'immobilier':
      proposals.push({
        key: 'caracteristiques',
        title: 'Caractéristiques du bien',
        description: 'Surfaces, nombre de pièces, prestations clés et diagnostics',
        type: 'information',
        iconKey: 'informations',
        recommended: true,
        text: services?.length ? `Points forts du bien :\n• ${services.join('\n• ')}` : 'Prestations clés du bien immobilier.',
      });
      proposals.push({
        key: 'plan_bien',
        title: 'Plans du bien',
        description: 'Plans intérieurs cotés pour visualiser les volumes et distributions',
        type: 'plan',
        iconKey: 'plan',
        recommended: true,
      });
      break;

    case 'spa':
      proposals.push({
        key: 'soins',
        title: 'Soins & Massages',
        description: 'Carte des soins relaxants, rituels bien-être et accès spa',
        type: 'information',
        iconKey: 'spa',
        recommended: true,
        text: services?.length ? `Rituels et soins proposés :\n• ${services.join('\n• ')}` : 'Découvrez notre univers de détente et nos rituels.',
      });
      break;

    case 'commerce':
      proposals.push({
        key: 'boutique',
        title: 'Boutique & Produits',
        description: 'Aperçu des collections, produits phares et conseils',
        type: 'information',
        iconKey: 'boutique',
        recommended: true,
        text: services?.length ? `Nos collections et services :\n• ${services.join('\n• ')}` : 'Découvrez notre sélection de produits.',
      });
      break;

    case 'musee':
    case 'tourisme':
      proposals.push({
        key: 'visite_guidee',
        title: 'Guide de visite',
        description: 'Informations patrimoniales, œuvres incontournables et parcours',
        type: 'information',
        iconKey: 'informations',
        recommended: true,
        text: services?.length ? `Parcours et thématiques :\n• ${services.join('\n• ')}` : 'Bienvenue pour votre visite culturelle immersive.',
      });
      proposals.push({
        key: 'plan_musee',
        title: 'Plan du site',
        description: 'Plan des salles et espaces d’exposition',
        type: 'plan',
        iconKey: 'plan',
        recommended: true,
      });
      break;

    default:
      proposals.push({
        key: 'services',
        title: 'Services & Prestations',
        description: 'Présentation des prestations proposées à vos clients',
        type: 'information',
        iconKey: 'services',
        recommended: true,
        text: services?.length ? `Nos services :\n• ${services.join('\n• ')}` : `Découvrez les services proposés par ${clientName}.`,
      });
  }

  // 3. Galerie Photos (si photos disponibles ou très pertinent)
  proposals.push({
    key: 'galerie',
    title: 'Galerie photos',
    description: 'Affichage des photographies haute définition de l’établissement',
    type: 'photos',
    iconKey: 'galerie',
    recommended: hasPhotos ?? true,
  });

  // 4. Horaires d'ouverture (si disponibles)
  if (openingHours) {
    proposals.push({
      key: 'horaires',
      title: 'Horaires',
      description: 'Heures et jours d’ouverture au public',
      type: 'information',
      iconKey: 'informations',
      recommended: true,
      text: `Horaires d’ouverture :\n${openingHours}`,
    });
  }

  // 5. Itinéraire / Localisation géographique
  if (address) {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${clientName} ${address}`)}`;
    proposals.push({
      key: 'localisation',
      title: 'Localisation',
      description: `Adresse géographique : ${address}`,
      type: 'lien',
      iconKey: 'localisation',
      recommended: true,
      url: mapsUrl,
    });
  }

  // 6. Contact direct par téléphone
  if (phone) {
    proposals.push({
      key: 'telephone',
      title: 'Appeler',
      description: `Numéro d’appel direct : ${phone}`,
      type: 'lien',
      iconKey: 'telephone',
      recommended: true,
      url: `tel:${phone.replace(/[^0-9+]/g, '')}`,
    });
  }

  // 7. Contact e-mail
  if (email) {
    proposals.push({
      key: 'email',
      title: 'E-mail',
      description: `Contact par courrier électronique : ${email}`,
      type: 'lien',
      iconKey: 'email',
      recommended: !phone, // Recommandé en priorité si le téléphone est absent
      url: `mailto:${email}`,
    });
  }

  // 8. Site internet officiel
  if (website) {
    proposals.push({
      key: 'siteweb',
      title: 'Site internet',
      description: `Lien officiel : ${website}`,
      type: 'lien',
      iconKey: 'siteweb',
      recommended: false, // Accessible souvent par le logo ou bouton discret
      url: website,
    });
  }

  return proposals;
}

/**
 * Génère le préréglage d'introduction recommandé pour un client selon son secteur et sa charte graphique.
 */
export function generateAutoIntroPreset(params: {
  category: ActivityCategory;
  clientName: string;
  colors: BrandColors;
  logoUrl?: string;
}): IntroDesign {
  const { category, clientName, colors, logoUrl } = params;

  let styleId: IntroStyleId = 'premium';
  let animation: IntroAnimation = 'fade';
  let subtitle = `Bienvenue chez ${clientName} · Visite immersive 360°`;
  let buttonLabel = 'Découvrir la visite';

  switch (category) {
    case 'restaurant':
      styleId = 'cinematic';
      animation = 'zoom';
      subtitle = 'Bienvenue à notre table · Découvrez notre univers culinaire';
      buttonLabel = 'Découvrir le restaurant';
      break;

    case 'hotel':
      styleId = 'luxe';
      animation = 'curtain';
      subtitle = 'Bienvenue · Découvrez nos chambres d’exception et nos espaces de détente';
      buttonLabel = 'Explorer l’hôtel';
      break;

    case 'camping':
      styleId = 'nature';
      animation = 'fade';
      subtitle = 'Bienvenue au domaine · Explorez nos hébergements et nos activités de plein air';
      buttonLabel = 'Explorer le domaine';
      break;

    case 'airbnb':
    case 'gite':
      styleId = 'nature';
      animation = 'zoom';
      subtitle = 'Bienvenue · Découvrez votre prochain séjour en immersion totale';
      buttonLabel = 'Visiter le lieu';
      break;

    case 'immobilier':
      styleId = 'moderne';
      animation = 'sweep';
      subtitle = 'Bienvenue · Découvrez ce bien exclusif en visite immersive 360°';
      buttonLabel = 'Commencer la visite';
      break;

    case 'spa':
      styleId = 'luxe';
      animation = 'iris';
      subtitle = 'Bienvenue · Un instant de sérénité, de ressourcement et de détente';
      buttonLabel = 'Entrer dans l’univers bien-être';
      break;

    case 'commerce':
      styleId = 'moderne';
      animation = 'slide';
      subtitle = 'Bienvenue dans notre boutique · Explorez nos collections';
      buttonLabel = 'Entrer dans la boutique';
      break;

    case 'musee':
    case 'tourisme':
      styleId = 'cinematic';
      animation = 'curtain';
      subtitle = 'Bienvenue · Parcourez notre patrimoine d’exception et nos collections';
      buttonLabel = 'Commencer la découverte';
      break;

    default:
      styleId = 'premium';
      animation = 'fade';
      subtitle = `Bienvenue · Visitez ${clientName} en immersion 360°`;
      buttonLabel = 'Découvrir';
  }

  const welcomeColor = introWelcomeColor(colors.accent, colors.background);

  return {
    enabled: true,
    styleId,
    animation,
    title: clientName.slice(0, 80),
    subtitle: subtitle.slice(0, 160),
    buttonLabel: buttonLabel.slice(0, 30),
    backgroundColor: colors.background,
    buttonColor: colors.btnRest,
    welcomeColor,
    logoShape: 'original',
    logoDataUrl: logoUrl,
  };
}

/**
 * Applique le style de barre choisi aux couleurs de la charte.
 */
export function buildBarStyle(
  colors: BrandColors,
  layoutId: AutoBarLayout,
  existingStyle?: BarStyle
): BarStyle {
  const layout = AUTO_BAR_LAYOUTS.find((l) => l.id === layoutId) || AUTO_BAR_LAYOUTS[0];

  return {
    ...(existingStyle || {}),
    background: colors.background,
    outline: colors.border,
    button: colors.btnRest,
    buttonOutline: colors.border,
    icon: colors.text,
    outlineWidth: layout.outlineWidth,
    buttonOutlineWidth: layout.buttonOutlineWidth,
    roundness: layout.roundness,
    height: layout.height,
    useBarGlyphs: false, // Utilise les icônes haute fidélité
  };
}
