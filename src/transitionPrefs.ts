/**
 * Réglage « Transitions » : durée du fondu entre deux panoramas (0 = instantané). Commun à tout le projet.
 * Lu au moment de chaque changement de panorama, dans l'éditeur comme dans la visite.
 */
export const DEFAULT_TRANSITION_MS = 200;
let current = DEFAULT_TRANSITION_MS;
export const setTransitionMs = (ms?: number) => {
  current = typeof ms === 'number' && Number.isFinite(ms) ? Math.max(0, Math.min(3000, Math.round(ms))) : DEFAULT_TRANSITION_MS;
};
export const getTransitionMs = () => current;

/** Précharge les panoramas voisins (adresses réseau) pour que le changement soit quasi instantané. */
const warmed = new Set<string>();
export function warmPanoramas(urls: Array<string | undefined>): void {
  if (typeof Image === 'undefined') return;
  for (const url of urls) {
    if (!url || warmed.has(url) || url.startsWith('data:') || warmed.size > 60) continue;
    warmed.add(url);
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    void img.decode?.().catch(() => { /* ignoré : le chargement normal prendra le relais */ });
  }
}
