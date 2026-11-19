#!/usr/bin/env node
// Génère sites/<vitrine>/vr.json à partir de la page index.html de chaque vitrine Immosphera,
// pour que le casque affiche le contenu du site (une page de texte par onglet).
//
// Usage : node scripts/make-vr-json.mjs
import {readFileSync, writeFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

const root = new URL('../sites/', import.meta.url).pathname;
const names = readdirSync(root).filter((n) => n.startsWith('immosphera-vitrine-'));

// Lignes d'habillage à ne pas lire dans le casque (numéros, boutons, navigation).
const NOISE = [
  /^\d{1,2}$/, /^(découvrir|maps|waze|plans?|accueil|360°|services|contact|©)$/i, /^[·•◆]$/,
  /^(découvrir nos biens|estimer mon bien|voir les biens à vendre|vendre avec nous|envoyer un e-mail|honoraires)$/i,
  /^·?\s*mentions légales$/i,
];
const BLOCKS = 'p|h1|h2|h3|li|div|blockquote|a|button|section|header|article';
const decode = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&middot;/g, '·');

function sections(html) {
  let body = html.slice(html.indexOf('<body'));
  body = body.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<svg[\s\S]*?<\/svg>/g, '');
  const parts = body.split(/(?=<section[^>]*class="tab)/).slice(1);
  return parts.map((part) => {
    const id = /id="([^"]+)"/.exec(part)?.[1] ?? '';
    // Les blocs (titres, paragraphes, boutons) deviennent des lignes ; les balises en ligne (em, span…) disparaissent sans couper la phrase.
    const withBreaks = part.replace(new RegExp(`</?(?:${BLOCKS})\\b[^>]*>`, 'g'), '\n').replace(/<br\s*\/?>/g, '\n');
    const text = decode(withBreaks.replace(/<[^>]+>/g, ' '));
    const lines = text.split('\n').map((l) => l.replace(/\s+/g, ' ').replace(/\s+([,.])/g, '$1').trim()).filter(Boolean)
      .filter((l) => !NOISE.some((re) => re.test(l)));
    return {id, lines};
  });
}

const TITLES = {accueil: 'Présentation', experience: "L'expérience Immosphera", services: 'Nos services', equipe: 'Votre conseiller', contact: 'Contact & accès'};

for (const name of names) {
  const file = join(root, name, 'index.html');
  const html = readFileSync(file, 'utf8');
  const title = decode(/<title>([^<]+)<\/title>/.exec(html)?.[1] ?? name);
  // Libellés de navigation (onglets) : ignorés dans le texte.
  const navLabels = [...(/<nav[^>]*tabs[^>]*>([\s\S]*?)<\/nav>/.exec(html)?.[1] ?? '').matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)]
    .map((m) => decode(m[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim().toLowerCase()).filter(Boolean);
  const pages = sections(html).map(({id, lines}) => {
    const kept = lines.filter((l) => !navLabels.includes(l.toLowerCase()));
    // Une ligne vide après un paragraphe long, rien après un titre court : le texte tient mieux dans les pages du casque.
    const text = kept.map((l, i) => l + (i < kept.length - 1 ? (l.length > 70 ? '\n\n' : '\n') : '')).join('');
    return {title: TITLES[id] ?? id, text};
  }).filter((p) => p.text.length > 40);
  const out = {languages: {fr: {title, pages}}};
  writeFileSync(join(root, name, 'vr.json'), JSON.stringify(out, null, 1) + '\n');
  console.log(`✓ ${name} — ${pages.length} pages, ${pages.reduce((n, p) => n + p.text.length, 0)} caractères`);
}
