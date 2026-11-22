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

/** Précharge les panoramas voisins (adresses réseau) en priorité basse pour des transitions quasi instantanées sur PC et tablette. */
const warmed = new Set<string>();
export function warmPanoramas(urls: Array<string | undefined>): void {
  if (typeof Image === 'undefined') return;
  for (const url of urls) {
    if (!url || warmed.has(url) || url.startsWith('data:')) continue;
    if (warmed.size >= 80) {
      const oldest = warmed.values().next().value;
      if (oldest) warmed.delete(oldest);
    }
    warmed.add(url);
    const img = new Image() as HTMLImageElement & { fetchPriority?: string };
    img.decoding = 'async';
    try { img.fetchPriority = 'low'; } catch { /* optionnel */ }
    img.src = url;
    void img.decode?.().catch(() => { /* ignoré : le chargement normal prendra le relais */ });
  }
}
