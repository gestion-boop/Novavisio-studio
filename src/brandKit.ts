/**
 * Charte graphique (NovaStudio AI — phase 1). Logique PURE : aucune requête réseau, aucune IA.
 * Déterministe : même couleur de départ + même style = même palette. Testé dans tests/brandKit.test.ts.
 */
export type BrandColors = {
  primary: string; secondary: string; accent: string;
  text: string; background: string; border: string; glow: string;
  btnRest: string; btnHover: string; btnPressed: string;
};
export type BrandKit = { styleId: string; colors: BrandColors; validated: boolean; seed?: string };

export const BRAND_COLOR_LABELS: Record<keyof BrandColors, string> = {
  primary: 'Couleur principale', secondary: 'Couleur secondaire', accent: 'Accentuation',
  text: 'Texte', background: 'Fond', border: 'Bordures', glow: 'Effets lumineux',
  btnRest: 'Bouton au repos', btnHover: 'Bouton au survol', btnPressed: 'Bouton à l’appui'
};

const HEX = /^#[0-9a-f]{6}$/i;
export const isHex = (v: unknown): v is string => typeof v === 'string' && HEX.test(v);

type HSL = [number, number, number];
export function hexToHsl(hex: string): HSL {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}
export function hslToHex(h: number, s: number, l: number): string {
  const H = ((h % 360) + 360) % 360, S = Math.max(0, Math.min(100, s)) / 100, L = Math.max(0, Math.min(100, l)) / 100;
  const a = S * Math.min(L, 1 - L);
  const f = (n: number) => { const k = (n + H / 30) % 12; const c = L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(c * 255).toString(16).padStart(2, '0'); };
  return '#' + f(0) + f(8) + f(4);
}
const channel = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
export function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
/** Contraste WCAG entre deux couleurs (1 à 21). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
/** Texte lisible sur un fond : blanc ou presque noir, celui qui contraste le plus. */
export function readableOn(bg: string): string {
  return contrastRatio(bg, '#ffffff') >= contrastRatio(bg, '#111111') ? '#ffffff' : '#111111';
}

export type StyleId = 'luxe' | 'moderne' | 'nature' | 'mediterraneen' | 'elegant' | 'familial' | 'technologique' | 'classique' | 'personnalise';
/** Paramètres de chaque style : teinte décalée, saturation et luminosité des couleurs de base. */
const STYLE_PARAMS: Record<Exclude<StyleId, 'personnalise'>, { label: string; shift: number; ps: number; pl: number; bgS: number; bgL: number; accS: number; accL: number }> = {
  luxe:          { label: 'Luxe et premium',        shift: 0,   ps: 45, pl: 40, bgS: 25, bgL: 9,  accS: 60, accL: 62 },
  moderne:       { label: 'Moderne et minimaliste', shift: 180, ps: 70, pl: 50, bgS: 10, bgL: 96, accS: 80, accL: 55 },
  nature:        { label: 'Nature et écologique',   shift: 90,  ps: 40, pl: 35, bgS: 18, bgL: 94, accS: 55, accL: 50 },
  mediterraneen: { label: 'Méditerranéen',          shift: 200, ps: 65, pl: 42, bgS: 45, bgL: 95, accS: 75, accL: 60 },
  elegant:       { label: 'Élégant et raffiné',     shift: 330, ps: 35, pl: 30, bgS: 12, bgL: 97, accS: 40, accL: 70 },
  familial:      { label: 'Familial',               shift: 30,  ps: 75, pl: 52, bgS: 50, bgL: 97, accS: 85, accL: 60 },
  technologique: { label: 'Technologique',          shift: 210, ps: 85, pl: 48, bgS: 40, bgL: 10, accS: 90, accL: 62 },
  classique:     { label: 'Classique',              shift: 220, ps: 30, pl: 32, bgS: 15, bgL: 98, accS: 35, accL: 45 }
};
export const STYLES: ReadonlyArray<{ id: StyleId; label: string }> = [
  ...Object.entries(STYLE_PARAMS).map(([id, p]) => ({ id: id as StyleId, label: p.label })),
  { id: 'personnalise', label: 'Personnalisé (ma couleur)' }
];

/** Génère les dix couleurs d'une charte à partir d'une couleur de départ et d'un style. */
export function generateBrand(seedHex: string, styleId: StyleId): BrandColors {
  const seed = isHex(seedHex) ? seedHex : '#2f8fb5';
  const [h, s] = hexToHsl(seed);
  const style = styleId === 'personnalise' ? null : STYLE_PARAMS[styleId];
  const hue = style ? h + style.shift : h;
  const primary = style ? hslToHex(hue, style.ps, style.pl) : seed;
  const background = style ? hslToHex(hue, style.bgS, style.bgL) : hslToHex(hue, 12, 96);
  const accent = style ? hslToHex(hue + 25, style.accS, style.accL) : hslToHex(hue + 25, Math.max(40, s), 62);
  const secondary = hslToHex(hue - 25, 40, 40);
  const [ph, ps2, pl] = hexToHsl(primary);
  const btnRest = primary;
  const btnHover = hslToHex(ph, ps2, Math.min(90, pl + 10));
  const btnPressed = hslToHex(ph, ps2, Math.max(8, pl - 12));
  const text = readableOn(background);
  const border = hslToHex(hue, 35, Math.max(20, hexToHsl(background)[2] > 50 ? 45 : 60));
  const glow = accent;
  return { primary, secondary, accent, text, background, border, glow, btnRest, btnHover, btnPressed };
}

export type ContrastIssue = { level: 'error' | 'warn'; text: string };
/** Vérifie la lisibilité : seuils WCAG AA (4,5 pour le texte, 3 pour les grands éléments). */
export function checkContrast(c: BrandColors): ContrastIssue[] {
  const out: ContrastIssue[] = [];
  const btnText = readableOn(c.btnRest);
  const r1 = contrastRatio(c.text, c.background);
  if (r1 < 4.5) out.push({ level: 'error', text: `Texte et fond trop proches (${r1.toFixed(1)} : 4,5 minimum).` });
  for (const [k, v] of [['au repos', c.btnRest], ['au survol', c.btnHover], ['à l’appui', c.btnPressed]] as const) {
    const r = contrastRatio(readableOn(v), v);
    if (r < 4.5) out.push({ level: 'error', text: `Icône/texte du bouton ${k} illisible (${r.toFixed(1)}).` });
  }
  const rb = contrastRatio(btnText, c.btnRest);
  if (rb < 3) out.push({ level: 'warn', text: `Bouton au repos peu visible sur le fond (${rb.toFixed(1)}).` });
  return out;
}

/** Traduit une charte en réglages de la barre du bas existants (BarStyle). Ne touche ni aux tailles ni aux arrondis. */
export function toBarPatch(c: BrandColors): { background: string; outline: string; button: string; buttonOutline: string; icon: string; dayNightColor: string } {
  return {
    background: c.background, outline: c.border, button: c.btnRest, buttonOutline: c.border,
    icon: readableOn(c.btnRest), dayNightColor: c.primary
  };
}
