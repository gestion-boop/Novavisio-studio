/* Aspirateur de site : lit la page d'accueil et quelques pages utiles d'un établissement et en tire
 * coordonnées, réseaux sociaux, horaires, photos et logos. Fonctions pures (testables sans réseau) :
 * la récupération des pages est injectée (fetchPage), l'endpoint /api/aspirate fournit une version sécurisée.
 */

const SOCIALS = [
  ['facebook', /(?:^|\.)(?:facebook\.com|fb\.com|fb\.me)$/i],
  ['instagram', /(?:^|\.)instagram\.com$/i],
  ['linkedin', /(?:^|\.)linkedin\.com$/i],
  ['tiktok', /(?:^|\.)tiktok\.com$/i],
  ['youtube', /(?:^|\.)(?:youtube\.com|youtu\.be)$/i],
  ['tripadvisor', /(?:^|\.)tripadvisor\.[a-z.]+$/i],
];
const BOOKING_HOSTS = /(?:doctolib|planity|calendly|thefork|lafourchette|booking\.com|airbnb|abritel|gites-de-france|resalib|bookeo|simplybook|reservation|mindbody|treatwell|fresha|zenchef|guestready|lodgify|beds24)/i;
const USEFUL_PAGE = /(contact|horaire|ouvert|galerie|gallery|photo|album|tarif|prix|menu|carte|service|prestation|soin|a-propos|apropos|about|presentation|equipe|reserv|acces|hebergement|chambre|appartement|activite)/i;
const DAYS = '(?:lun|mar|mer|jeu|ven|sam|dim)[a-zéèû]*\\.?';
const TIME = '\\d{1,2}\\s*[h:]\\s*\\d{0,2}';
const HOURS_LINE = new RegExp(`${DAYS}[^\\n<]{0,40}?${TIME}[^\\n<]{0,6}?(?:-|–|—|à|a|/)[^\\n<]{0,6}?${TIME}[^\\n<]{0,60}`, 'i');
const CLOSED_LINE = new RegExp(`^${DAYS}[^\\n<]{0,20}ferm`, 'i');
const BAD_IMAGE = /(?:^|[^a-z])(?:sprite|favicon|spacer|pixel|1x1|blank|loader|loading|spinner|placeholder|avatar|emoji|flag|arrow|icons?|badge|captcha|tracking|gravatar|visa|mastercard|paypal)(?:[^a-z]|$)/i;
const GOOD_EXT = /\.(?:jpe?g|png|webp)(?:$|\?|#)/i;

export const decode = (s) => String(s ?? '')
  .replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&#x27;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
const clean = (s, max = 400) => decode(s).replace(/\s+/g, ' ').trim().slice(0, max);

export function absolute(raw, base) {
  if (!String(raw ?? '').trim()) return '';
  try {
    const u = new URL(decode(raw).trim(), base || undefined);
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.href.length > 2048) return '';
    u.hash = '';
    return u.href;
  } catch { return ''; }
}

const attr = (tag, name) => {
  const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  return m ? decode(m[1] ?? m[2] ?? m[3] ?? '') : '';
};
const tags = (html, name) => html.match(new RegExp(`<${name}\\b[^>]*>`, 'gi')) ?? [];

/** Plus grande image d'un attribut srcset. */
export function bestFromSrcset(srcset, base) {
  let best = '', bestW = -1;
  for (const part of String(srcset || '').split(',')) {
    const [u, d] = part.trim().split(/\s+/);
    if (!u) continue;
    const w = d ? parseFloat(d) * (d.endsWith('x') ? 1000 : 1) : 0;
    if (w >= bestW) { best = u; bestW = w; }
  }
  return best ? absolute(best, base) : '';
}

/** Retire les suffixes de miniature WordPress (-300x200) pour regrouper les versions d'une même photo. */
const imageKey = (url) => url.replace(/[?#].*$/, '').replace(/-\d{2,4}x\d{2,4}(?=\.[a-z]+$)/i, '').toLowerCase();

function jsonLdBlocks(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1].trim());
      const stack = Array.isArray(data) ? [...data] : [data];
      while (stack.length) {
        const item = stack.shift();
        if (!item || typeof item !== 'object') continue;
        if (Array.isArray(item['@graph'])) stack.push(...item['@graph']);
        out.push(item);
      }
    } catch { /* JSON-LD invalide : ignoré */ }
  }
  return out;
}
const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const dayName = (d) => String(d).replace(/^.*\//, '').replace(/s$/i, '');
const DAY_FR = {Monday: 'Lundi', Tuesday: 'Mardi', Wednesday: 'Mercredi', Thursday: 'Jeudi', Friday: 'Vendredi', Saturday: 'Samedi', Sunday: 'Dimanche'};

/** Analyse d'UNE page : renvoie tout ce qui est utile, sans rien décider. */
export function parsePage(html, pageUrl) {
  const found = {
    title: '', description: '', name: '', phones: [], emails: [], address: '', city: '',
    socials: {}, booking: '', hours: [], images: [], logos: [], videos: [], links: [], services: [],
  };
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');

  found.title = clean((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html) || [])[1] || '', 200);
  const meta = (key) => {
    for (const t of tags(html, 'meta')) {
      if ([attr(t, 'property'), attr(t, 'name')].some((v) => v.toLowerCase() === key)) return attr(t, 'content');
    }
    return '';
  };
  if (!pageUrl) {
    const canonical = tags(html, 'link').find(tag => attr(tag, 'rel').toLowerCase() === 'canonical');
    pageUrl = absolute(meta('og:url') || (canonical ? attr(canonical, 'href') : ''), undefined);
  }
  found.description = clean(meta('og:description') || meta('description'), 1200);
  found.name = clean(meta('og:site_name') || meta('og:title'), 160);
  const ogImage = absolute(meta('og:image:secure_url') || meta('og:image') || meta('twitter:image'), pageUrl);
  if (ogImage) found.images.push({url: ogImage, score: 80});

  const addVideo = (raw) => {
    const url = absolute(raw, pageUrl);
    if (!url) return;
    const {hostname,pathname} = new URL(url);
    const direct = /\.(mp4|webm|mov|m4v)$/i.test(pathname);
    const youtube = /^(?:www\.)?youtube(?:-nocookie)?\.com$/i.test(hostname) && pathname.startsWith('/embed/');
    const vimeo = hostname === 'player.vimeo.com' && pathname.startsWith('/video/');
    if (direct || youtube || vimeo) found.videos.push(url);
  };
  addVideo(meta('og:video:secure_url') || meta('og:video:url') || meta('og:video'));
  for (const video of text.matchAll(/<video\b[^>]*>(?:[\s\S]*?<\/video>|)/gi)) {
    const opening = tags(video[0], 'video')[0];
    addVideo(attr(opening, 'src') || attr(opening, 'data-src'));
    for (const source of tags(video[0], 'source')) addVideo(attr(source, 'src'));
  }
  for (const frame of tags(text, 'iframe')) addVideo(attr(frame, 'src'));

  // JSON-LD : la source la plus fiable quand elle existe.
  for (const item of jsonLdBlocks(html)) {
    const type = asArray(item['@type']).join(' ');
    if (/\bVideoObject\b/i.test(type)) addVideo(item.contentUrl || item.embedUrl);
    if (!/(Business|Organization|Restaurant|Hotel|Store|Service|Place|Camp|Lodging|Salon|Spa|Clinic|Dentist|Physician|Gym|Cafe|Bar)/i.test(type)) continue;
    if (item.name && !found.name) found.name = clean(item.name, 160);
    if (item.description && !found.description) found.description = clean(item.description, 1200);
    for (const t of asArray(item.telephone)) if (t) found.phones.push(clean(t, 40));
    for (const e of asArray(item.email)) if (e) found.emails.push(clean(String(e).replace(/^mailto:/i, ''), 120));
    const a = item.address;
    if (a && typeof a === 'object') {
      found.address ||= clean([a.streetAddress, a.postalCode].filter(Boolean).join(' '), 300);
      found.city ||= clean(a.addressLocality || '', 100);
    } else if (typeof a === 'string') found.address ||= clean(a, 300);
    for (const s of asArray(item.sameAs)) found.links.push(String(s));
    for (const o of asArray(item.openingHours)) if (o) found.hours.push(clean(o, 120));
    for (const spec of asArray(item.openingHoursSpecification)) {
      const days = asArray(spec?.dayOfWeek).map((d) => DAY_FR[dayName(d)] || dayName(d)).join(', ');
      if (days && spec.opens && spec.closes) found.hours.push(`${days} : ${spec.opens}–${spec.closes}`);
    }
    const logo = typeof item.logo === 'string' ? item.logo : item.logo?.url;
    if (logo) { const u = absolute(logo, pageUrl); if (u) found.logos.push({url: u, score: 90}); }
    for (const im of asArray(item.image)) {
      const u = absolute(typeof im === 'string' ? im : im?.url, pageUrl);
      if (u) found.images.push({url: u, score: 70});
    }
    if (item.makesOffer) for (const o of asArray(item.makesOffer)) { const n = o?.itemOffered?.name || o?.name; if (n) found.services.push(clean(n, 120)); }
  }

  // Liens : réseaux sociaux, réservation, téléphone, courriel, pages utiles.
  for (const m of text.matchAll(/<a\b[^>]*>/gi)) {
    const href = attr(m[0], 'href');
    if (!href) continue;
    if (/^tel:/i.test(href)) { found.phones.push(clean(href.replace(/^tel:/i, ''), 40)); continue; }
    if (/^mailto:/i.test(href)) { found.emails.push(clean(href.replace(/^mailto:/i, '').split('?')[0], 120)); continue; }
    const u = absolute(href, pageUrl);
    if (u) found.links.push(u);
  }
  for (const link of found.links) {
    let host = '';
    try { host = new URL(link).hostname.toLowerCase(); } catch { continue; }
    for (const [key, re] of SOCIALS) {
      if (!re.test(host) || found.socials[key]) continue;
      // Exclut les boutons de partage et les modules intégrés.
      if (/(sharer|share|dialog|plugins|intent|embed|login|tr\?|\/p\/|\/reel|\/watch)/i.test(link) && key !== 'youtube') continue;
      found.socials[key] = link.split('?')[0].replace(/\/+$/, '');
    }
    if (!found.booking && BOOKING_HOSTS.test(link) && !SOCIALS.some(([, re]) => re.test(host))) found.booking = link;
  }

  // Téléphones lisibles dans le texte (France) si aucun lien tel:.
  const plain = decode(text.replace(/<[^>]+>/g, '\n'));
  if (!found.phones.length) {
    for (const m of plain.matchAll(/(?:(?:\+|00)33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/g)) found.phones.push(m[0].trim());
  }

  // Horaires en texte libre : lignes avec un jour et deux heures.
  for (const line of plain.split('\n')) {
    const l = line.replace(/\s+/g, ' ').trim();
    if (l.length < 6 || l.length > 150) continue;
    if (HOURS_LINE.test(l) || CLOSED_LINE.test(l)) found.hours.push(l);
  }

  // Images : <img>, data-src, srcset, <source>, fonds CSS.
  for (const m of text.matchAll(/<(?:img|source)\b[^>]*>/gi)) {
    const t = m[0];
    const w = parseInt(attr(t, 'width'), 10) || 0, h = parseInt(attr(t, 'height'), 10) || 0;
    const srcset = attr(t, 'srcset') || attr(t, 'data-srcset');
    const src = bestFromSrcset(srcset, pageUrl) ||
      absolute(attr(t, 'data-src') || attr(t, 'data-lazy-src') || attr(t, 'data-original') || attr(t, 'src'), pageUrl);
    if (!src || src.startsWith('data:')) continue;
    const meta2 = `${src} ${attr(t, 'alt')} ${attr(t, 'class')} ${attr(t, 'id')}`;
    const isLogo = /logo/i.test(meta2) && !/(partenaire|partner|sponsor|client|label|certif)/i.test(meta2);
    if (isLogo) { found.logos.push({url: src, score: 60}); continue; }
    if ((w && w < 120) || (h && h < 120) || (!GOOD_EXT.test(src) && !/^<img\b/i.test(t)) || BAD_IMAGE.test(src)) continue;
    found.images.push({url: src, score: 30 + Math.min(40, Math.round(w / 40)) + (attr(t, 'alt') ? 5 : 0)});
  }
  for (const m of text.matchAll(/background(?:-image)?\s*:[^;"']*url\(\s*['"]?([^'")\s]+)['"]?\s*\)/gi)) {
    const u = absolute(m[1], pageUrl);
    if (u && GOOD_EXT.test(u) && !BAD_IMAGE.test(u)) found.images.push({url: u, score: 35});
  }
  for (const t of tags(html, 'link')) {
    const rel = attr(t, 'rel').toLowerCase();
    if (/apple-touch-icon|^icon$|shortcut icon/.test(rel)) {
      const u = absolute(attr(t, 'href'), pageUrl);
      if (u && !/\.svg(\?|$)/i.test(u) && !/\.ico(\?|$)/i.test(u)) found.logos.push({url: u, score: 40});
    }
  }
  return found;
}

/** Pages du même site qui méritent d'être lues (contact, horaires, galerie…). */
export function usefulLinks(links, startUrl, limit = 5) {
  let host = '';
  try { host = new URL(startUrl).hostname.replace(/^www\./, ''); } catch { return []; }
  const out = [];
  for (const l of links) {
    try {
      const u = new URL(l);
      if (u.hostname.replace(/^www\./, '') !== host) continue;
      if (/\.(?:jpe?g|png|webp|gif|pdf|zip|svg|mp4)$/i.test(u.pathname)) continue;
      if (!USEFUL_PAGE.test(u.pathname)) continue;
      const key = u.origin + u.pathname.replace(/\/+$/, '');
      if (key === new URL(startUrl).origin + new URL(startUrl).pathname.replace(/\/+$/, '')) continue;
      if (!out.some((x) => x.key === key)) out.push({key, href: u.href});
    } catch { /* lien invalide */ }
  }
  return out.slice(0, limit).map((x) => x.href);
}

const uniqueBy = (list, keyOf) => { const seen = new Set(); return list.filter((x) => { const k = keyOf(x); if (!k || seen.has(k)) return false; seen.add(k); return true; }); };
const rank = (list, keyOf, limit) => {
  // Une même photo peut exister en plusieurs tailles : on garde la mieux notée.
  const best = new Map();
  for (const item of list) {
    const k = keyOf(item.url);
    if (!best.has(k) || item.score > best.get(k).score) best.set(k, item);
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.url);
};

/**
 * Parcourt le site : page d'accueil + au plus `maxPages - 1` pages utiles.
 * fetchPage(url) → {html, finalUrl} ; lève une erreur si la page est inaccessible (la page est alors ignorée).
 */
export async function crawlSite(startUrl, fetchPage, {maxPages = 6, maxPhotos = 60, followLinks = true} = {}) {
  const pages = [];
  const notes = [];
  const results = [];
  const queue = [startUrl];
  const visited = new Set();
  while (queue.length && pages.length < maxPages) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);
    try {
      const {html, finalUrl} = await fetchPage(url);
      const parsed = parsePage(html, finalUrl || url);
      results.push(parsed);
      pages.push(finalUrl || url);
      if (followLinks && pages.length === 1) {
        for (const next of usefulLinks(parsed.links, finalUrl || url, maxPages - 1)) if (!visited.has(next)) queue.push(next);
      }
    } catch (e) {
      notes.push(`Page ignorée : ${url} (${String(e?.message || e).slice(0, 80)})`);
    }
  }
  if (!results.length) return {ok: false, notes: notes.length ? notes : ['Site inaccessible.'], pages};

  const first = results[0];
  const phones = uniqueBy(results.flatMap((r) => r.phones), (p) => p.replace(/\D/g, ''));
  const emails = uniqueBy(results.flatMap((r) => r.emails), (e) => e.toLowerCase());
  const hours = uniqueBy(results.flatMap((r) => r.hours), (h) => h.toLowerCase()).slice(0, 14);
  const socials = {};
  for (const r of results) for (const [k, v] of Object.entries(r.socials)) socials[k] ||= v;
  const fiche = {
    nom: first.name || first.title.split(/[|–—-]/)[0].trim(),
    adresse: results.map((r) => r.address).find(Boolean) || '',
    ville: results.map((r) => r.city).find(Boolean) || '',
    tel: phones[0] || '',
    email: emails[0] || '',
    site: startUrl,
    facebook: socials.facebook || '',
    instagram: socials.instagram || '',
    booking: results.map((r) => r.booking).find(Boolean) || '',
    description: results.map((r) => r.description).find(Boolean) || '',
    horaires: hours,
    services: uniqueBy(results.flatMap((r) => r.services), (s) => s.toLowerCase()).slice(0, 30),
    autres: Object.fromEntries(Object.entries(socials).filter(([k]) => !['facebook', 'instagram'].includes(k))),
  };
  const photos = rank(results.flatMap((r) => r.images), imageKey, maxPhotos);
  const logos = rank(results.flatMap((r) => r.logos), imageKey, 8);
  if (!hours.length) notes.push('Aucun horaire trouvé sur le site.');
  if (!fiche.facebook && !fiche.instagram) notes.push('Aucun lien Facebook ou Instagram trouvé sur le site.');
  if (!photos.length) notes.push('Aucune photo exploitable trouvée sur le site.');
  const videos = [...new Set(results.flatMap((r) => r.videos))].slice(0, 30);
  return {ok: true, fiche, photos, logos, videos, notes, pages, emails, phones};
}
