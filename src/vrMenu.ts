import type {StudioProject, VrMenuConfig} from './storage';
import {barKind} from './barKind';

/** Boutons de la barre exclus de l'interface jaune (ex. « Appeler » : retiré du casque). */
const excludedFromVr = (project: Pick<StudioProject, 'bottomBar'>) => new Set(project.bottomBar.filter((b) => barKind(b) === 'phone').map((b) => b.id));

/**
 * Interface jaune du casque : catalogue des actions, configuration par défaut et mise en page.
 * Le casque (vr.ts) et l'éditeur (aperçu) utilisent LA MÊME mise en page : ce que vous voyez dans l'éditeur
 * est ce que le casque dessine.
 */

/** Cadre de l'interface jaune, en mètres. */
export const VR_SHELL = {w: 2.6, h: 1.4};
/** Côté d'un bouton rond (compact pour laisser le maximum d'espace aux visuels et photos). */
export const VR_BTN = 0.118;
/** Distance entre le bord extérieur d'un bouton et le bord du cadre : identique à gauche, à droite, en haut et en bas. */
export const VR_MARGIN = 0.045;
/** Écart maximal entre deux boutons (centre à centre) : évite des boutons trop espacés dans une colonne courte. */
export const VR_MAX_PITCH = 0.21;
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

/** Actions disponibles pour ce projet : intégrées + boutons de la barre du bas sans doublons. */
export function availableVrActions(project: Pick<StudioProject, 'bottomBar'>): VrAction[] {
  const seenSig = new Set<string>();
  const extra: VrAction[] = [];
  const excluded = excludedFromVr(project);
  for (const item of project.bottomBar) {
    if (excluded.has(item.id)) continue;
    if (item.type === 'plan') continue;
    if (item.type === 'gallery' && !item.gallerySpaceIds?.length) continue;
    if (item.type === 'navigation' && !item.target) continue;
    const label = item.title?.trim() || (item.type === 'gallery' ? 'Espaces' : 'Sans titre');
    const sig = `${item.type}|${label.toLocaleLowerCase('fr')}|${item.url || item.target || ''}`;
    if (seenSig.has(sig)) continue;
    seenSig.add(sig);
    extra.push({id: 'bar:' + item.id, label: 'Bouton « ' + label + ' »'});
  }
  return [...VR_BUILTIN_ACTIONS, ...extra];
}

/** Case vide d'une colonne : garde l'alignement des lignes entre les deux colonnes. */
export const VR_GAP = '';

/** Dernier index occupé d'une colonne (-1 si vide). */
const lastUsed = (list: string[]) => {for (let i = list.length - 1; i >= 0; i--) if (list[i]) return i; return -1;};
const firstUsed = (list: string[]) => list.findIndex(Boolean);

/** Normalise une action `bar:` en doublon vers son action intégrée équivalente. */
function canonicalVrAction(id: string, project: Pick<StudioProject, 'bottomBar'>): string {
  if (!id.startsWith('bar:')) return id;
  const item = project.bottomBar.find((b) => b.id === id.slice(4));
  if (!item) return id;
  if (item.type === 'plan') return 'plan';
  if (item.type === 'gallery' && !item.gallerySpaceIds?.length) return 'gallery';
  if (item.type === 'navigation' && !item.target) return 'home';
  return id;
}

/**
 * Configuration à utiliser : celle du projet, sinon l'interface actuelle.
 * Les actions inconnues ou en double deviennent des cases vides (les lignes restent alignées),
 * les cases vides en fin de colonne sont retirées.
 */
export function vrMenuOf(project: Pick<StudioProject, 'vrMenu' | 'bottomBar'>): VrMenuConfig {
  const cfg = project.vrMenu;
  if (!cfg) return DEFAULT_VR_MENU;
  const excluded = excludedFromVr(project);
  const barIds = new Set(project.bottomBar.map((b) => b.id).filter((id) => !excluded.has(id)));
  const valid = (id: string) => VR_BUILTIN_ACTIONS.some((a) => a.id === id) || (id.startsWith('bar:') && barIds.has(id.slice(4)));
  const seen = new Set<string>();
  const clean = (list: string[]) => {
    const out = (Array.isArray(list) ? list : []).slice(0, VR_MAX_PER_COLUMN).map((raw) => {
      if (typeof raw !== 'string' || !raw || !valid(raw)) return VR_GAP;
      const id = canonicalVrAction(raw, project);
      if (seen.has(id)) return VR_GAP;
      seen.add(id);
      return id;
    });
    return out.slice(0, lastUsed(out) + 1);
  };
  const left = clean(cfg.left), right = clean(cfg.right);
  return {left, right, autoOpen: !!cfg.autoOpen, themed: !!cfg.themed};
}

export type VrSlot = {id: string; x: number; y: number; row: number};
export type VrLayoutOptions = {w?: number; h?: number; btn?: number; margin?: number; maxPitch?: number};

/**
 * Place les boutons des deux colonnes sur UNE MÊME GRILLE de lignes :
 *  - la ligne n de gauche est exactement à la hauteur de la ligne n de droite (cases vides comprises) ;
 *  - mêmes marges au cadre à gauche et à droite (`margin`), et en haut / en bas quand la grille est pleine ;
 *  - le bloc de lignes utilisées est centré verticalement dans le cadre.
 * Ancien format sans case vide : la colonne la plus courte est centrée sur la grille (au plus près).
 */
export function layoutColumns(left: string[], right: string[], options: VrLayoutOptions = {}) {
  const w = options.w ?? VR_SHELL.w, h = options.h ?? VR_SHELL.h;
  const btn = options.btn ?? VR_BTN, margin = options.margin ?? VR_MARGIN, maxPitch = options.maxPitch ?? VR_MAX_PITCH;
  let L = left, R = right;
  const nL = lastUsed(L) + 1, nR = lastUsed(R) + 1;
  const compact = (l: string[]) => l.slice(0, lastUsed(l) + 1).every(Boolean);
  if (compact(L) && compact(R) && nL && nR && nL !== nR) {
    const pad = Array(Math.floor(Math.abs(nL - nR) / 2)).fill(VR_GAP);
    if (nL < nR) L = [...pad, ...L]; else R = [...pad, ...R];
  }
  const firsts = [firstUsed(L), firstUsed(R)].filter((i) => i >= 0);
  const top = firsts.length ? Math.min(...firsts) : 0;
  const bottom = Math.max(lastUsed(L), lastUsed(R), top);
  const rows = bottom - top + 1;
  const pitch = rows > 1 ? Math.min(maxPitch, (h - 2 * margin - btn) / (rows - 1)) : 0;
  const x = w / 2 - margin - btn / 2;
  const place = (ids: string[], sign: number): VrSlot[] => ids.flatMap((id, i) =>
    id ? [{id, row: i, x: sign * x, y: ((rows - 1) / 2 - (i - top)) * pitch}] : []);
  return {left: place(L, -1), right: place(R, 1), pitch, x, btn, rows};
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
