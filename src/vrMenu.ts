import type {StudioProject, VrMenuConfig} from './storage';

/**
 * Interface jaune du casque : catalogue des actions, configuration par défaut et mise en page.
 * Le casque (vr.ts) et l'éditeur (aperçu) utilisent LA MÊME mise en page : ce que vous voyez dans l'éditeur
 * est ce que le casque dessine.
 */

/** Cadre de l'interface jaune, en mètres. */
export const VR_SHELL = {w: 2.13, h: 1.15};
/** Côté d'un bouton rond. */
export const VR_BTN = 0.124;
/** Distance entre le bord extérieur d'un bouton et le bord du cadre : identique à gauche, à droite, en haut et en bas. */
export const VR_MARGIN = 0.07;
/** Écart maximal entre deux boutons (centre à centre) : évite des boutons trop espacés dans une colonne courte. */
export const VR_MAX_PITCH = 0.24;
export const VR_MAX_PER_COLUMN = 6;

export type VrAction = {id: string; label: string};

/** Actions intégrées. Les boutons de la barre du bas s'ajoutent sous la forme `bar:<identifiant>`. */
export const VR_BUILTIN_ACTIONS: ReadonlyArray<VrAction> = [
  {id: 'gallery', label: 'Galerie des panoramas'},
  {id: 'up', label: 'Panorama précédent'},
  {id: 'counter', label: 'Compteur « n / N »'},
  {id: 'down', label: 'Panorama suivant'},
  {id: 'home', label: 'Premier panorama (accueil)'},
  {id: 'sound', label: 'Son'},
  {id: 'plan', label: 'Plan'},
  {id: 'help', label: 'Aide'},
  {id: 'exit', label: 'Fermer le menu'},
];

/** Interface actuelle : colonne de gauche (navigation) et colonne de droite (commandes). */
export const DEFAULT_VR_MENU: VrMenuConfig = {
  left: ['gallery', 'up', 'counter', 'down', 'home'],
  right: ['sound', 'plan', 'help', 'exit'],
};

/** Actions disponibles pour ce projet : intégrées + une par bouton de la barre du bas. */
export function availableVrActions(project: Pick<StudioProject, 'bottomBar'>): VrAction[] {
  return [
    ...VR_BUILTIN_ACTIONS,
    ...project.bottomBar.map((item) => ({id: 'bar:' + item.id, label: 'Bouton « ' + (item.title || 'sans titre') + ' »'})),
  ];
}

/** Configuration à utiliser : celle du projet, débarrassée des actions inconnues ou en double, sinon l'interface actuelle. */
export function vrMenuOf(project: Pick<StudioProject, 'vrMenu' | 'bottomBar'>): VrMenuConfig {
  const cfg = project.vrMenu;
  if (!cfg) return DEFAULT_VR_MENU;
  const barIds = new Set(project.bottomBar.map((b) => b.id));
  const valid = (id: string) => VR_BUILTIN_ACTIONS.some((a) => a.id === id) || (id.startsWith('bar:') && barIds.has(id.slice(4)));
  const seen = new Set<string>();
  const clean = (list: string[]) => list.filter((id) => valid(id) && !seen.has(id) && !!seen.add(id)).slice(0, VR_MAX_PER_COLUMN);
  const left = clean(cfg.left), right = clean(cfg.right);
  return {left, right, autoOpen: !!cfg.autoOpen};
}

export type VrSlot = {id: string; x: number; y: number};
export type VrLayoutOptions = {w?: number; h?: number; btn?: number; margin?: number; maxPitch?: number};

/**
 * Place les boutons des deux colonnes :
 *  - mêmes marges au cadre : à gauche et à droite (`margin`), et en haut / en bas quand une colonne est pleine ;
 *  - même écart entre les boutons dans les DEUX colonnes (les lignes sont donc alignées d'une colonne à l'autre) ;
 *  - chaque colonne centrée verticalement dans le cadre.
 */
export function layoutColumns(left: string[], right: string[], options: VrLayoutOptions = {}) {
  const w = options.w ?? VR_SHELL.w, h = options.h ?? VR_SHELL.h;
  const btn = options.btn ?? VR_BTN, margin = options.margin ?? VR_MARGIN, maxPitch = options.maxPitch ?? VR_MAX_PITCH;
  const rows = Math.max(left.length, right.length);
  const pitch = rows > 1 ? Math.min(maxPitch, (h - 2 * margin - btn) / (rows - 1)) : 0;
  const x = w / 2 - margin - btn / 2;
  const place = (ids: string[], sign: number): VrSlot[] =>
    ids.map((id, i) => ({id, x: sign * x, y: ((ids.length - 1) / 2 - i) * pitch}));
  return {left: place(left, -1), right: place(right, 1), pitch, x, btn};
}

/** Libellé du bouton pour l'éditeur (aperçu) : symbole simple par action. */
export function vrActionSymbol(id: string): string {
  switch (id) {
    case 'gallery': return '▣';
    case 'up': return '▲';
    case 'counter': return '1/9';
    case 'down': return '▼';
    case 'home': return '⌂';
    case 'sound': return '♪';
    case 'plan': return '◫';
    case 'help': return '?';
    case 'exit': return '✕';
    default: return '●';
  }
}
