#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const localTokenFile = path.join(os.homedir(), '.vercel_token');
const TOKEN = process.env.VERCEL_TOKEN || (fs.existsSync(localTokenFile) ? fs.readFileSync(localTokenFile, 'utf8').trim() : '');

if (!TOKEN) {
  console.error('❌ Aucun token Vercel trouvé dans process.env.VERCEL_TOKEN ou ~/.vercel_token');
  process.exit(1);
}

const TEAM_ID = 'team_Xexdj7soTgzYhrqGogr15lzZ';
const PROJECT_ID = 'prj_DoDglHb9ubtymhaxvSMNr8pHOTSa';
const REPO_ID = 1451961082;

const sha = process.env.GITHUB_SHA || execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
const branch = process.env.GITHUB_REF_NAME || execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
const isProduction = branch === 'main';
const modeLabel = isProduction ? 'production' : `preview (${branch})`;

console.log(`🚀 Déclenchement du déploiement Vercel [${modeLabel}] pour ${branch}@${sha.slice(0, 7)}...`);

const payload = {
  name: 'novavisio-studio',
  project: PROJECT_ID,
  ...(isProduction ? { target: 'production' } : {}),
  gitSource: { type: 'github', repoId: REPO_ID, ref: branch, sha },
};

const createRes = await fetch(`https://api.vercel.com/v13/deployments?teamId=${TEAM_ID}`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
});

const deployData = await createRes.json();
if (!createRes.ok) {
  console.error('❌ Échec création déploiement Vercel:', JSON.stringify(deployData, null, 2));
  process.exit(1);
}

console.log(`⏳ Déploiement créé (${deployData.id}), attente du statut READY...`);

const deadline = Date.now() + 180_000;
while (Date.now() < deadline) {
  await new Promise(resolve => setTimeout(resolve, 5000));
  const checkRes = await fetch(`https://api.vercel.com/v13/deployments/${deployData.id}?teamId=${TEAM_ID}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const status = await checkRes.json();
  if (!checkRes.ok) {
    console.warn(`⚠️ Réponse API Vercel (${checkRes.status}), nouvelle tentative...`);
    continue;
  }
  if (status.readyState === 'READY') {
    const deployUrl = status.url ? `https://${status.url}` : (deployData.url ? `https://${deployData.url}` : '');
    const aliases = Array.isArray(status.alias) ? status.alias.map(a => `https://${a}`) : [];
    const primaryUrl = isProduction ? 'https://novavisio-studio.vercel.app/' : (aliases[0] || deployUrl);
    console.log(`✅ Déploiement prêt en ${modeLabel} !`);
    console.log(`🌐 URL principale: ${primaryUrl}`);
    if (deployUrl && deployUrl !== primaryUrl) console.log(`🔗 URL immuable: ${deployUrl}`);
    if (aliases.length > 1) console.log(`🏷️ Alias: ${aliases.join(', ')}`);
    if (process.env.GITHUB_STEP_SUMMARY) {
      const summary = [
        `### Déploiement Vercel (${modeLabel})`,
        `- Branche : \`${branch}\` (\`${sha.slice(0, 7)}\`)`,
        `- URL principale : ${primaryUrl}`,
        deployUrl && deployUrl !== primaryUrl ? `- URL immuable : ${deployUrl}` : null,
      ].filter(Boolean).join('\n') + '\n';
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary, 'utf8');
    }
    process.exit(0);
  }
  if (status.readyState === 'ERROR' || status.readyState === 'CANCELED') {
    console.error(`❌ Déploiement Vercel terminé en erreur (${status.readyState}):`, status.errorMessage || '');
    process.exit(1);
  }
}

console.warn('⚠️ Timeout en attente de READY, le build continue sur Vercel.');
