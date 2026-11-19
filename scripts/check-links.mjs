#!/usr/bin/env node
// Surveillance des liens de visite publiés.
// Pour chaque lien : la page s'ouvre sans erreur, la visite s'affiche (canevas 360°),
// aucun message « lien invalide / expiré / indisponible », et aucun média du cloud n'échoue.
//
// Usage : node scripts/check-links.mjs <fichier-liens.json>
// Format du fichier : [{"name":"Pauline","url":"https://novavisio-studio.vercel.app/share.html?t=…"}]
// Le fichier contient des liens d'accès : garde-le hors du dépôt (ou dans un fichier ignoré par git).
// Code de sortie : 0 si tout est correct, 1 sinon (utilisable dans une tâche planifiée ou une alerte).
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const file = process.argv[2];
if (!file) {
  console.error('Usage : node scripts/check-links.mjs <fichier-liens.json>');
  process.exit(2);
}
const links = JSON.parse(readFileSync(file, 'utf8'));
if (!Array.isArray(links) || links.some((l) => typeof l.url !== 'string')) {
  console.error('Le fichier doit contenir une liste [{name,url}].');
  process.exit(2);
}

// Playwright : module du projet, sinon installation locale indiquée par PLAYWRIGHT_PATH.
let chromium;
try {
  ({chromium} = await import('playwright'));
} catch {
  const require = createRequire(import.meta.url);
  const path = process.env.PLAYWRIGHT_PATH || '/opt/node-tools/node_modules/playwright/index.js';
  ({chromium} = require(path));
}
const executablePath = process.env.CHROME_PATH || undefined;

const FAILURE_TEXTS = ['Lien invalide', 'Ce lien a expiré', 'Visite indisponible', 'Contenu indisponible'];
const MEDIA = /nvmedia|supabase\.co\/storage|\/storage\/v1\//;

async function checkLink(browser, link) {
  const problems = [];
  const page = await browser.newPage({viewport: {width: 1280, height: 800}});
  page.on('pageerror', (e) => problems.push('erreur JavaScript : ' + e.message.slice(0, 160)));
  page.on('response', (r) => {
    if (MEDIA.test(r.url()) && r.status() >= 400) problems.push('média en erreur ' + r.status());
  });
  page.on('requestfailed', (r) => {
    if (MEDIA.test(r.url())) problems.push('média non chargé');
  });
  try {
    await page.goto(link.url, {waitUntil: 'load', timeout: 45000});
    const text = await page.locator('body').innerText({timeout: 10000}).catch(() => '');
    for (const t of FAILURE_TEXTS) if (text.includes(t)) problems.push('message affiché : « ' + t + ' »');
    if (!problems.length) {
      // La visite est prête quand son canevas 360° est affiché (jusqu'à 45 s).
      const ready = await page.waitForSelector('.tour-app canvas', {state: 'visible', timeout: 45000}).then(() => true, () => false);
      if (!ready) problems.push('visite non affichée (aucun canevas 360°)');
    }
  } catch (e) {
    problems.push('ouverture impossible : ' + String(e.message || e).split('\n')[0].slice(0, 160));
  } finally {
    await page.close();
  }
  return {name: link.name ?? link.url, ok: problems.length === 0, problems: [...new Set(problems)]};
}

const browser = await chromium.launch({executablePath, args: ['--no-sandbox']});
const results = [];
try {
  for (const link of links) results.push(await checkLink(browser, link));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log((r.ok ? '✓ ' : '✘ ') + r.name + (r.ok ? '' : ' — ' + r.problems.join(' ; ')));
}
console.log(`\n${results.length - failed.length}/${results.length} lien(s) correct(s), ${failed.length} en échec.`);
process.exit(failed.length ? 1 : 0);
