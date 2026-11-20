#!/usr/bin/env node
// Livraison en une commande : vérifie, pousse la branche de travail, fusionne dans main, pousse main.
// Ne déploie PAS en production : le déploiement reste une décision explicite (affiche le SHA à déployer).
//
// Usage : node scripts/ship.mjs
import {execSync} from 'node:child_process';

const BRANCH = 'claude/gallant-davinci-3j0crn';
const run = (cmd, opts = {}) => execSync(cmd, {stdio: 'inherit', ...opts});
const out = (cmd) => execSync(cmd, {encoding: 'utf8'}).trim();
const fail = (msg) => { console.error('\n✘ ' + msg); process.exit(1); };

const current = out('git rev-parse --abbrev-ref HEAD');
if (current !== BRANCH) fail(`Tu dois être sur la branche ${BRANCH} (actuelle : ${current}).`);
if (out('git status --porcelain')) fail('Des modifications non commitées existent. Commite-les avant de livrer.');

console.log('1/5 Vérification TypeScript et tests…');
run('npx tsc --noEmit');
run('npm test');
console.log('2/5 Build…');
run('npm run build');

console.log('3/5 Synchronisation avec origin…');
run('git fetch -q origin');
run(`git merge -q --no-edit origin/${BRANCH}`);
run('git push -q origin ' + BRANCH);

console.log('4/5 Fusion dans main…');
run('git checkout -q main');
run('git merge -q --no-edit origin/main');
run(`git merge -q --no-edit ${BRANCH}`);
run('npx tsc --noEmit');
run('git push -q origin main');
run('git checkout -q ' + BRANCH);

const sha = out('git rev-parse main');
console.log('5/5 Terminé.');
console.log(`\nSHA à déployer : ${sha}`);
console.log('Pour déployer en production, demande-le explicitement (« déploie »).');
