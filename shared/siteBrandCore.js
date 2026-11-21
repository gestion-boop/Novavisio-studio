/* Extraction de l'identité graphique publique d'un site (partagé par l'API et l'éditeur).
 * Fonctions pures : aucune lecture réseau ici. Tout résultat est une PROPOSITION à valider. */
const GENERIC_FONTS = new Set(['serif','sans-serif','monospace','cursive','fantasy','system-ui','inherit','initial','unset','-apple-system','blinkmacsystemfont','ui-sans-serif','ui-serif']);

export function normalizeHex(raw) {
  const v = String(raw || '').trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(v)) return '#' + v.slice(1).split('').map((c) => c + c).join('');
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  return '';
}

/** Saturation et luminosité (0–100) : une couleur « utile » n'est ni un gris quasi neutre ni un blanc/noir. */
function satLight(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return {s: 0, l: l * 100};
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  return {s: s * 100, l: l * 100};
}

export function isUsefulColor(hex) {
  if (!/^#[0-9a-f]{6}$/.test(hex || '')) return false;
  const {s, l} = satLight(hex);
  return s >= 12 && l >= 8 && l <= 92;
}

export function extractColors(css) {
  const counts = new Map();
  for (const m of String(css || '').matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)) {
    const hex = normalizeHex(m[0]);
    if (!hex || !isUsefulColor(hex)) continue;
    counts.set(hex, (counts.get(hex) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([hex, count]) => ({hex, count, source: 'css'}));
}

export function extractThemeColor(html) {
  const m = String(html || '').match(/<meta[^>]+name=["']theme-color["'][^>]*content=["']([^"']+)["']/i)
    || String(html || '').match(/<meta[^>]+content=["']([^"']+)["'][^>]*name=["']theme-color["']/i);
  const hex = m ? normalizeHex(m[1]) : '';
  return isUsefulColor(hex) ? hex : '';
}

export function extractFonts(html, css) {
  const out = [];
  const seen = new Set();
  const add = (name, source) => {
    const clean = String(name || '').replace(/["']/g, '').trim();
    const key = clean.toLowerCase();
    if (!clean || clean.length > 60 || GENERIC_FONTS.has(key) || seen.has(key)) return;
    seen.add(key);
    out.push({name: clean, source});
  };
  for (const m of String(html || '').matchAll(/fonts\.googleapis\.com\/css2?\?[^"'>\s]*/g)) {
    for (const fam of m[0].matchAll(/family=([^&"'\s]+)/g)) {
      let name = fam[1];
      try { name = decodeURIComponent(name); } catch { /* garder brut */ }
      add(name.split(':')[0].replace(/\+/g, ' '), 'google-fonts');
    }
  }
  for (const m of String(css || '').matchAll(/font-family\s*:\s*([^;}{]+)/gi)) add(m[1].split(',')[0], 'css');
  return out.slice(0, 6);
}

export function analyzeSiteBrand(html, css = '') {
  const themeColor = extractThemeColor(html);
  const colors = extractColors(css + ' ' + html);
  const all = themeColor ? [{hex: themeColor, count: 999, source: 'theme-color'}, ...colors.filter((c) => c.hex !== themeColor)] : colors;
  return {colors: all.slice(0, 10), fonts: extractFonts(html, css), themeColor};
}

/** Feuilles de style liées par une page, résolues par rapport à son adresse (au plus `limit`). */
export function collectStylesheetUrls(html, baseUrl, limit = 3) {
  const out = [];
  for (const m of String(html || '').matchAll(/<link[^>]+>/gi)) {
    const tag = m[0];
    if (!/rel=["']?stylesheet/i.test(tag)) continue;
    const href = tag.match(/href=["']([^"']+)["']/i);
    if (!href) continue;
    try {
      const u = new URL(href[1], baseUrl);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') continue;
      if (!out.includes(u.href)) out.push(u.href);
    } catch { /* lien invalide : ignoré */ }
    if (out.length >= limit) break;
  }
  return out;
}
