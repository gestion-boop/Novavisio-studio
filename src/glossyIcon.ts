/**
 * Pack « glossy » réutilisable : un bouton rond brillant (biseau, reflet, ombre) dans trois états
 * (normal, survol, pressé), à partir d'une seule couleur de base choisie par l'utilisateur.
 * Les tons clair, moyen et sombre sont dérivés automatiquement de cette couleur.
 * Un pictogramme facultatif (PNG importé) peut être posé au centre.
 */
export type GlossyOptions = {
  /** Couleur de base du bouton, au format #rrggbb. */
  base: string;
  /** Couleur du liseré extérieur, #rrggbb. Par défaut : une teinte plus sombre que la base. */
  rim?: string;
  /** Intensité du reflet, de 0 (mat) à 1 (très brillant). */
  gloss?: number;
  /** Intensité de l'ombre portée, de 0 à 1. */
  shadow?: number;
  /** Pictogramme facultatif, en data URL (PNG ou WebP). */
  glyph?: string;
  /** Côté de l'image en pixels (défaut 1024). Le dessin reste le même, mis à l'échelle. */
  size?: number;
  /** Format de sortie : PNG (défaut) ou WebP, plus léger. */
  format?: 'png' | 'webp';
};
export type GlossyStates = { normal: string; hover: string; pressed: string };

const SIZE = 1024;

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw Error('Couleur invalide : ' + hex);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgbToCss = (rgb: readonly number[], a = 1) => `rgba(${Math.round(rgb[0])},${Math.round(rgb[1])},${Math.round(rgb[2])},${a})`;
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);

/** Tons dérivés : clair (reflet), moyen (base), sombre (ombre). */
function tones(base: number[]) {
  return {
    light: mix(base, [255, 255, 255], 0.55),
    mid: base,
    dark: mix(base, [0, 0, 0], 0.45),
    deep: mix(base, [0, 0, 0], 0.7),
  };
}

function drawState(state: 'normal' | 'hover' | 'pressed', o: Required<Pick<GlossyOptions, 'gloss' | 'shadow'>> & { base: number[]; rim: number[] }, glyph: HTMLImageElement | null, size: number, mime: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw Error('Canvas indisponible : impossible de créer le pack.');
  // Le dessin est fait sur une base de 1024 px, puis mis à l'échelle.
  ctx.setTransform(size / SIZE, 0, 0, size / SIZE, 0, 0);
  ctx.translate(SIZE / 2, SIZE / 2);
  const hover = state === 'hover', pressed = state === 'pressed';
  const t = tones(o.base);
  // Survol : base un peu plus claire. Pressé : base plus sombre et bouton enfoncé.
  const shift = hover ? 0.12 : pressed ? -0.1 : 0;
  const lift = (c: number[]) => (shift >= 0 ? mix(c, [255, 255, 255], shift) : mix(c, [0, 0, 0], -shift));

  // Ombre portée.
  if (o.shadow > 0 && !pressed) {
    const sh = ctx.createRadialGradient(12, 28, 312, 12, 28, 460);
    sh.addColorStop(0, `rgba(0,0,0,${0.35 * o.shadow})`);
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.beginPath(); ctx.arc(12, 28, 460, 0, Math.PI * 2); ctx.fill();
  }
  const dy = pressed ? 13 : 0;
  ctx.translate(0, dy);

  // Liseré extérieur (contour de couleur).
  ctx.beginPath(); ctx.arc(0, 0, 405, 0, Math.PI * 2);
  ctx.fillStyle = rgbToCss(o.rim);
  ctx.fill();

  // Biseau : du clair au sombre.
  const bevel = ctx.createLinearGradient(-240, -360, 230, 390);
  bevel.addColorStop(0, rgbToCss(lift(t.deep)));
  bevel.addColorStop(0.18, rgbToCss(lift(t.light)));
  bevel.addColorStop(0.6, rgbToCss(lift(t.dark)));
  bevel.addColorStop(1, rgbToCss(t.deep));
  ctx.beginPath(); ctx.arc(0, 0, 382, 0, Math.PI * 2);
  ctx.fillStyle = bevel; ctx.fill();

  // Face : léger dégradé.
  const face = ctx.createLinearGradient(-220, -355, 255, 355);
  face.addColorStop(0, rgbToCss(lift(t.light)));
  face.addColorStop(0.5, rgbToCss(lift(t.mid)));
  face.addColorStop(1, rgbToCss(lift(t.dark)));
  ctx.beginPath(); ctx.arc(0, 0, 360, 0, Math.PI * 2);
  ctx.fillStyle = face; ctx.fill();

  // Reflet brillant (glossy), proportionnel à l'intensité choisie.
  if (o.gloss > 0) {
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, 357, 0, Math.PI * 2); ctx.clip();
    const sheen = ctx.createLinearGradient(0, -345, 0, 90);
    sheen.addColorStop(0, `rgba(255,255,255,${(hover ? 0.6 : 0.42) * o.gloss})`);
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    // Reflet en dégradé sans contour elliptique apparent en haut du bouton.
    ctx.fillRect(-357, -357, 714, 340);
    ctx.restore();
  }

  // Pictogramme facultatif, centré.
  if (glyph) {
    const max = 500;
    const k = Math.min(max / glyph.naturalWidth, max / glyph.naturalHeight);
    const w = glyph.naturalWidth * k, h = glyph.naturalHeight * k;
    ctx.drawImage(glyph, -w / 2, -h / 2, w, h);
  }

  ctx.translate(0, -dy);
  // Anneau net, même diamètre dans tous les états.
  ctx.beginPath(); ctx.arc(0, 0, 402, 0, Math.PI * 2);
  ctx.strokeStyle = rgbToCss(hover ? mix(o.rim, [255, 255, 255], 0.3) : o.rim);
  ctx.lineWidth = 8; ctx.stroke();
  return canvas.toDataURL(mime, 0.92);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(Error('Pictogramme non chargé'));
    img.src = src;
  });
}

/** Génère les trois états (normal, survol, pressé) du bouton glossy. */
export async function glossyIconStates(options: GlossyOptions): Promise<GlossyStates> {
  const base = hexToRgb(options.base);
  const rim = options.rim ? hexToRgb(options.rim) : mix(base, [0, 0, 0], 0.5);
  const glyph = options.glyph ? await loadImage(options.glyph) : null;
  const o = {
    base,
    rim,
    gloss: Math.max(0, Math.min(1, options.gloss ?? 0.7)),
    shadow: Math.max(0, Math.min(1, options.shadow ?? 0.5)),
  };
  const size = Math.max(128, Math.min(1024, Math.round(options.size ?? SIZE)));
  const mime = options.format === 'webp' ? 'image/webp' : 'image/png';
  return {
    normal: drawState('normal', o, glyph, size, mime),
    hover: drawState('hover', o, glyph, size, mime),
    pressed: drawState('pressed', o, glyph, size, mime),
  };
}
