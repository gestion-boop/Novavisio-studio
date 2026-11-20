/**
 * Couleur des croix de fermeture, commune à tout le projet (photos, vidéos, informations, galeries, pages intégrées).
 * Sans réglage : elles gardent la couleur des boutons de la barre.
 */
const HEX = /^#[0-9a-f]{6}$/i;
const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (hex: string, to: number, k: number) => '#' + channels(hex).map((v) => Math.round(v + (to - v) * k).toString(16).padStart(2, '0')).join('');
const luminance = (hex: string) => { const [r, g, b] = channels(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

export function applyCloseColor(color?: string): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (!color || !HEX.test(color)) {
    delete root.dataset.closeColor;
    ['--nv-close-bg', '--nv-close-border', '--nv-close-ink', '--nv-close-hover'].forEach((v) => root.style.removeProperty(v));
    return;
  }
  root.dataset.closeColor = '1';
  root.style.setProperty('--nv-close-bg', color);
  root.style.setProperty('--nv-close-border', mix(color, 0, 0.35));
  root.style.setProperty('--nv-close-ink', luminance(color) > 0.55 ? '#1b1208' : '#ffffff');
  root.style.setProperty('--nv-close-hover', mix(color, 255, 0.28));
}
