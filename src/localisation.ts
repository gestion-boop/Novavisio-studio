/**
 * Localisation (NovaStudio AI — phase 5, sans IA). Liens construits UNIQUEMENT à partir d'une adresse vérifiée.
 * Aucune coordonnée n'est devinée : sans adresse vérifiée, rien n'est proposé.
 */
export function mapLinks(address: string | undefined): {map: string; route: string} | undefined {
  const a = (address ?? '').replace(/\s+/g, ' ').trim();
  // Adresse précise exigée : au moins deux mots (rue + ville, pas une ville seule), 200 caractères au maximum.
  if (a.length < 5 || a.length > 200 || !a.includes(' ')) return undefined;
  const q = encodeURIComponent(a);
  return {
    map: 'https://www.google.com/maps/search/?api=1&query=' + q,
    route: 'https://www.google.com/maps/dir/?api=1&destination=' + q
  };
}

export type LangCode = 'fr' | 'en' | 'es' | 'de' | 'nl' | 'it';
export const TRANSLATION_LANGS: ReadonlyArray<LangCode> = ['fr', 'en', 'es', 'de', 'nl', 'it'];
export type TranslatableText = {label: string; base: string; translations?: Partial<Record<LangCode, string>>};
export type TranslationGap = {label: string; lang: LangCode};

/**
 * Traductions manquantes par langue, à valider AVANT publication. Un texte traduit identique au français
 * (ex. nom propre) est considéré comme valide : les noms propres et marques ne sont pas à traduire.
 */
export function translationGaps(items: TranslatableText[], langs: ReadonlyArray<LangCode>): TranslationGap[] {
  const gaps: TranslationGap[] = [];
  for (const it of items) {
    if (!it.base || !it.base.trim()) continue;
    for (const lang of langs) {
      if (lang === 'fr') continue;
      const t = it.translations?.[lang]?.trim();
      if (!t) gaps.push({label: it.label, lang});
    }
  }
  return gaps;
}
