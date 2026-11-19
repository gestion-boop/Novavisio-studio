/**
 * Mémorise où l'on a cliqué en dernier (décalage par rapport au centre de l'écran) : l'effet « Envol » fait partir
 * la fenêtre de cet endroit, petite, puis la fait grossir en se déplaçant vers le centre.
 */
let started = false;
export function initWindowAnimOrigin(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  const root = document.documentElement;
  window.addEventListener('pointerdown', (e) => {
    root.style.setProperty('--nv-ox', Math.round(e.clientX - window.innerWidth / 2) + 'px');
    root.style.setProperty('--nv-oy', Math.round(e.clientY - window.innerHeight / 2) + 'px');
  }, {capture: true, passive: true});
}
