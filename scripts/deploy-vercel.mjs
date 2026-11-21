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

console.log(`🚀 Déclenchement déploiement Vercel pour ${sha.slice(0, 7)} (${branch})...`);

const createRes = await fetch(`https://api.vercel.com/v13/deployments?teamId=${TEAM_ID}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'novavisio-studio',
    project: PROJECT_ID,
    target: 'production',
    gitSource: {
      type: 'github',
      repoId: REPO_ID,
      ref: branch,
      sha: sha,
    },
  }),
});

if (!createRes.ok) {
  const errText = await createRes.text();
  console.error('Erreur API Vercel:', errText);
  process.exit(1);
}

const deployData = await createRes.json();
console.log(`📦 Déploiement créé: ${deployData.id} (${deployData.url})`);
console.log(`⏳ En attente de la fin du build...`);

const startTime = Date.now();
while (Date.now() - startTime < 180000) {
  await new Promise(r => setTimeout(r, 4000));
  const checkRes = await fetch(`https://api.vercel.com/v13/deployments/${deployData.id}?teamId=${TEAM_ID}`, {
    headers: { 'Authorization': `Bearer ${TOKEN}` },
  });
  if (checkRes.ok) {
    const status = await checkRes.json();
    if (status.readyState === 'READY') {
      console.log(`✅ Déploiement prêt en production !`);
      console.log(`🌐 URL: https://novavisio-studio.vercel.app/`);
      process.exit(0);
    }
    if (status.readyState === 'ERROR' || status.readyState === 'CANCELED') {
      console.error(`❌ Échec du déploiement: ${status.readyState}`);
      process.exit(1);
    }
  }
}

console.warn('⚠️ Timeout en attente de READY, le build continue sur Vercel.');
