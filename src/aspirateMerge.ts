import type {ClientProfile} from './storage';

/** Résultat d'une aspiration (même forme que la réponse de /api/novagen, plus les autres réseaux repérés). */
export type ScrapeLike = {
  fiche: {
    nom: string; type: string; adresse: string; ville: string; tel: string; email: string;
    site: string; facebook: string; instagram: string; booking: string; description: string;
    horaires: string[]; services: string[]; autres?: Record<string, string>;
  };
  photos: string[]; logos: string[]; notes: string[];
};

/** Limite de la fiche client : 30 liens de photos au plus. */
export const MAX_PROFILE_PHOTOS = 30;

/** Clé d'une photo : même image en plusieurs tailles ou avec des paramètres = une seule photo. */
export const photoKey = (url: string) =>
  url.replace(/[?#].*$/, '').replace(/-\d{2,4}x\d{2,4}(?=\.[a-z]+$)/i, '').toLowerCase();

export function uniquePhotos(list: string[], limit = MAX_PROFILE_PHOTOS): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of list) {
    if (typeof url !== 'string' || !/^https:\/\//i.test(url) || url.length > 2048) continue;
    const k = photoKey(url);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(url);
    if (out.length >= limit) break;
  }
  return out;
}

const first = (...values: Array<string | undefined>) => values.find((v) => typeof v === 'string' && v.trim()) ?? '';
const longest = (a: string, b: string) => (b.length > a.length ? b : a);

/**
 * Fusionne ce que dit le site de l'établissement et ce que dit NovaGen.
 *  - coordonnées, réseaux, réservation, horaires, services : le site d'abord (c'est la source de l'établissement) ;
 *  - nom, type, adresse, ville : NovaGen d'abord (fiche plus complète) ;
 *  - description : la plus détaillée ; photos et logos : ceux du site d'abord, sans doublon.
 */
export function mergeScrapes(site: ScrapeLike | null, novagen: ScrapeLike | null): ScrapeLike | null {
  if (!site && !novagen) return null;
  if (!site) return novagen;
  if (!novagen) return site;
  const s = site.fiche, n = novagen.fiche;
  return {
    fiche: {
      nom: first(n.nom, s.nom), type: first(n.type, s.type), adresse: first(n.adresse, s.adresse), ville: first(n.ville, s.ville),
      tel: first(s.tel, n.tel), email: first(s.email, n.email), site: first(s.site, n.site),
      facebook: first(s.facebook, n.facebook), instagram: first(s.instagram, n.instagram), booking: first(s.booking, n.booking),
      description: longest(s.description || '', n.description || ''),
      horaires: s.horaires.length ? s.horaires : n.horaires,
      services: s.services.length ? s.services : n.services,
      autres: {...(n.autres || {}), ...(s.autres || {})},
    },
    photos: uniquePhotos([...site.photos, ...novagen.photos]),
    logos: uniquePhotos([...site.logos, ...novagen.logos], 8),
    notes: [...new Set([...site.notes, ...novagen.notes])].slice(0, 12),
  };
}

/** Lignes lisibles : ce que l'aspiration a trouvé (et ce qui manque). */
export function describeScrape(r: ScrapeLike): string[] {
  const f = r.fiche;
  const lines = [
    `${r.photos.length} photo${r.photos.length > 1 ? 's' : ''}`,
    r.logos.length ? `${r.logos.length} logo${r.logos.length > 1 ? 's' : ''}` : 'aucun logo',
    f.horaires.length ? `horaires : ${f.horaires.length} ligne${f.horaires.length > 1 ? 's' : ''}` : 'horaires : non trouvés',
    f.tel ? 'téléphone' : 'téléphone : non trouvé',
    f.email ? 'e-mail' : 'e-mail : non trouvé',
    f.facebook ? 'Facebook' : 'Facebook : non trouvé',
    f.instagram ? 'Instagram' : 'Instagram : non trouvé',
  ];
  if (f.booking) lines.push('réservation');
  if (f.services.length) lines.push(`${f.services.length} service${f.services.length > 1 ? 's' : ''}`);
  return lines;
}

const clip = (v: string) => v.slice(0, 4000);

/**
 * Applique une aspiration à une fiche client.
 * `overwrite` = false (défaut) : seuls les champs VIDES sont remplis, ce que vous avez saisi n'est jamais écrasé.
 * Les photos s'ajoutent à celles déjà présentes (sans doublon, 30 au plus). Renvoie aussi la liste des champs remplis.
 */
export function applyScrapeToProfile(profile: ClientProfile, r: ScrapeLike, overwrite = false): {profile: ClientProfile; filled: string[]} {
  const f = r.fiche;
  const next: ClientProfile = {...profile};
  const filled: string[] = [];
  const set = (key: keyof ClientProfile, label: string, value: string) => {
    if (!value) return;
    const current = String(next[key] ?? '');
    if (current && !overwrite) return;
    if (current === value) return;
    (next as Record<string, unknown>)[key] = clip(value);
    filled.push(label);
  };
  set('name', 'nom', f.nom); set('category', 'type', f.type); set('address', 'adresse', f.adresse); set('city', 'ville', f.ville);
  set('phone', 'téléphone', f.tel); set('email', 'e-mail', f.email); set('website', 'site', f.site);
  set('facebook', 'Facebook', f.facebook); set('instagram', 'Instagram', f.instagram);
  set('bookingUrl', 'réservation', f.booking); set('description', 'description', f.description);
  set('openingHours', 'horaires', f.horaires.filter(Boolean).join(' · '));
  set('services', 'services', f.services.filter(Boolean).join(', '));
  const others = Object.entries(f.autres || {}).map(([k, v]) => `${k} : ${v}`).join('\n');
  set('otherLinks', 'autres liens', others);
  if (r.logos[0] && (overwrite || !next.logoUrl)) { next.logoUrl = r.logos[0]; filled.push('logo'); }
  const before = next.photoUrls?.length ?? 0;
  const photos = overwrite ? uniquePhotos(r.photos) : uniquePhotos([...(next.photoUrls || []), ...r.photos]);
  if (photos.length !== before || overwrite) {
    next.photoUrls = photos;
    if (photos.length > before) filled.push(`${photos.length - before} photo${photos.length - before > 1 ? 's' : ''}`);
  }
  if (r.notes.length) next.sourceNotes = [...new Set([...(next.sourceNotes || []), ...r.notes])].slice(0, 12);
  return {profile: next, filled};
}

/**
 * Complète une fiche EXISTANTE avec une fiche trouvée : seuls les champs vides sont remplis, les photos s'ajoutent
 * (sans doublon, 30 au plus). Ce qui est déjà saisi n'est jamais écrasé.
 */
export function mergeProfiles(existing: ClientProfile, incoming: ClientProfile): {profile: ClientProfile; filled: string[]} {
  const labels: Array<[keyof ClientProfile, string]> = [
    ['category', 'activité'], ['address', 'adresse'], ['city', 'ville'], ['phone', 'téléphone'], ['email', 'e-mail'],
    ['website', 'site'], ['facebook', 'Facebook'], ['instagram', 'Instagram'], ['otherLinks', 'autres liens'],
    ['bookingUrl', 'réservation'], ['openingHours', 'horaires'], ['services', 'services'], ['description', 'description'],
    ['logoUrl', 'logo'],
  ];
  const next: ClientProfile = {...existing};
  const filled: string[] = [];
  for (const [key, label] of labels) {
    const have = String(next[key] ?? '').trim();
    const add = String(incoming[key] ?? '').trim();
    if (!have && add) { (next as Record<string, unknown>)[key] = add.slice(0, 4000); filled.push(label); }
  }
  if (!next.name.trim() && incoming.name.trim()) { next.name = incoming.name; filled.push('nom'); }
  const before = next.photoUrls?.length ?? 0;
  const photos = uniquePhotos([...(next.photoUrls || []), ...(incoming.photoUrls || [])]);
  if (photos.length > before) { next.photoUrls = photos; filled.push(`${photos.length - before} photo${photos.length - before > 1 ? 's' : ''}`); }
  if (incoming.sourceNotes?.length) next.sourceNotes = [...new Set([...(next.sourceNotes || []), ...incoming.sourceNotes])].slice(0, 12);
  return {profile: next, filled};
}
