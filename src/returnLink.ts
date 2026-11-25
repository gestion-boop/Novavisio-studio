import type {Hotspot} from './storage';

/** Une flèche « retour » est créée par le studio avec le titre « Retour vers <panorama> » (retour automatique ou parcours Auto). */
export const isReturnLink = (h: Pick<Hotspot, 'type' | 'title'>) => h.type === 'navigation' && /^Retour vers\b/i.test(h.title || '');

/** Écart minimal (radians, ≈ 24°) en dessous duquel une flèche retour est jugée « confondue » avec une flèche d'avancée. */
export const RETURN_CLOSE = 0.42;
const RETURN_DROP = 0.24;

const angle = (a: {yaw: number; pitch: number}, b: {yaw: number; pitch: number}) => {
  const v = (p: {yaw: number; pitch: number}) => [Math.cos(p.pitch) * Math.sin(p.yaw), Math.sin(p.pitch), Math.cos(p.pitch) * Math.cos(p.yaw)];
  const [x, y] = [v(a), v(b)];
  return Math.acos(Math.max(-1, Math.min(1, x[0] * y[0] + x[1] * y[1] + x[2] * y[2])));
};

/**
 * Hauteur (pitch) à AFFICHER pour un point. Une flèche retour proche d'une flèche d'avancée est descendue vers le sol :
 * les deux ne se superposent plus et ne peuvent plus être confondues. Les autres points ne bougent pas, et la position
 * enregistrée dans le projet n'est jamais modifiée. Une flèche déplacée par l'utilisateur (`pitchFixed`) garde exactement sa hauteur.
 */
export function displayPitch(h: Hotspot, all: readonly Hotspot[]): number {
  if (!isReturnLink(h) || h.pitchFixed) return h.pitch;
  const close = all.filter((o) => o.id !== h.id && o.type === 'navigation' && !isReturnLink(o) && angle(h, o) < RETURN_CLOSE);
  if (!close.length) return h.pitch;
  return Math.max(-1.2, Math.min(h.pitch, ...close.map((o) => o.pitch)) - RETURN_DROP);
}
