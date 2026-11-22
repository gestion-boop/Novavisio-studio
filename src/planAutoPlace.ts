import type {FloorPlanPoint, Scene} from './storage';

/** Entrée par défaut sur le plan (en %) : bas, au centre. L'utilisateur la déplace ensuite à la souris. */
export const PLAN_ENTRANCE = {x: 50, y: 88};
const STEP = 11;
const MIN_GAP = 4;
const clamp = (v: number) => Math.max(6, Math.min(94, v));

/**
 * Proposition de placement des panoramas sur un plan (coordonnées en %, 0–100).
 *  - Les panoramas sont triés par numéro dans leur nom (…PAN001, PAN002…) : l'ordre de prise de vue commence à l'entrée.
 *  - Le premier (l'entrée) est posé à `PLAN_ENTRANCE`.
 *  - Les suivants sont placés en suivant les liens de navigation, dans la direction du lien (cap de la flèche).
 *  - Ceux qui ne sont reliés à rien sont alignés en bas du plan, dans l'ordre.
 * Aucun contrôle de la pièce réelle : c'est une base à corriger à la souris.
 */
export function proposePlanLayout(scenes: Scene[]): FloorPlanPoint[] {
  const list = scenes.filter((s) => !s.excluded)
    .map((s, i) => ({s, i}))
    .sort((a, b) => a.s.name.localeCompare(b.s.name, 'fr', {numeric: true}) || a.i - b.i)
    .map((e) => e.s);
  if (!list.length) return [];
  const ids = new Set(list.map((s) => s.id));
  const byId = new Map(list.map((s) => [s.id, s]));
  const placed = new Map<string, {x: number; y: number}>();
  const free = (x: number, y: number) => ![...placed.values()].some((p) => Math.hypot(p.x - x, p.y - y) < MIN_GAP);
  const put = (id: string, x: number, y: number, dx = 0, dy = 0) => {
    let px = clamp(x), py = clamp(y);
    for (let k = 0; k < 6 && !free(px, py); k++) {px = clamp(px + dx * MIN_GAP || px + MIN_GAP); py = clamp(py + dy * MIN_GAP);}
    placed.set(id, {x: Math.round(px * 10) / 10, y: Math.round(py * 10) / 10});
  };
  const queue: string[] = [];
  put(list[0].id, PLAN_ENTRANCE.x, PLAN_ENTRANCE.y);
  queue.push(list[0].id);
  while (queue.length) {
    const from = byId.get(queue.shift()!)!;
    const origin = placed.get(from.id)!;
    for (const h of from.hotspots ?? []) {
      if (h.type !== 'navigation' || !h.target || !ids.has(h.target) || placed.has(h.target)) continue;
      const yaw = Number.isFinite(h.yaw) ? h.yaw : 0;
      // Même repère que le casque : avant = (−sin(cap), cos(cap)) ; sur le plan, « devant » = vers le haut.
      const dx = -Math.sin(yaw), dy = -Math.cos(yaw);
      put(h.target, origin.x + dx * STEP, origin.y + dy * STEP, dx, dy);
      queue.push(h.target);
    }
  }
  const rest = list.filter((s) => !placed.has(s.id));
  rest.forEach((s, i) => placed.set(s.id, {x: rest.length > 1 ? 8 + (84 * i) / (rest.length - 1) : 50, y: 94}));
  return list.map((s) => ({sceneId: s.id, ...placed.get(s.id)!}));
}
