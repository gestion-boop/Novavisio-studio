// Contrôle de la fusion des aspirations et de l'application à une fiche client (src/aspirateMerge.ts).
// Usage : node scripts/check-aspirate-merge.mjs
import {build} from 'esbuild';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
const dir=mkdtempSync(resolve('scripts/.merge-'));
try{
  const entry=join(dir,'check.mjs');
  writeFileSync(entry,`
    import assert from 'node:assert/strict';
    import {mergeScrapes,applyScrapeToProfile,mergeProfiles,uniquePhotos,describeScrape,MAX_PROFILE_PHOTOS} from '../../src/aspirateMerge';
    import {emptyClientProfile} from '../../src/storage';
    const fiche=(o={})=>({nom:'',type:'',adresse:'',ville:'',tel:'',email:'',site:'',facebook:'',instagram:'',booking:'',description:'',horaires:[],services:[],...o});
    const site={fiche:fiche({nom:'Ariya (site)',tel:'06 12 34 56 78',facebook:'https://facebook.com/ariya',horaires:['Lundi : 9h-18h'],description:'Court.',autres:{tiktok:'https://tiktok.com/@ariya'}}),
      photos:['https://ariya.fr/a.jpg','https://ariya.fr/b-300x200.jpg','https://ariya.fr/b.jpg'],logos:['https://ariya.fr/logo.png'],notes:['3 pages lues']};
    const ng={fiche:fiche({nom:'Ariya Massage',type:'Massage',adresse:'12 rue de la Paix',ville:'Narbonne',tel:'04 68 00 00 00',instagram:'https://instagram.com/ariya',horaires:['Mardi : 10h-12h'],description:'Une description nettement plus longue et détaillée de l établissement.'}),
      photos:['https://ariya.fr/b.jpg?w=400','https://cdn.fr/c.jpg','http://non-https.fr/d.jpg'],logos:[],notes:['NovaGen : fiche trouvée']};
    const m=mergeScrapes(site,ng);
    assert.equal(m.fiche.nom,'Ariya Massage','nom : NovaGen d\\'abord');
    assert.equal(m.fiche.adresse,'12 rue de la Paix');
    assert.equal(m.fiche.tel,'06 12 34 56 78','téléphone : le site d\\'abord');
    assert.equal(m.fiche.facebook,'https://facebook.com/ariya');assert.equal(m.fiche.instagram,'https://instagram.com/ariya','réseau manquant sur le site : repris de NovaGen');
    assert.deepEqual(m.fiche.horaires,['Lundi : 9h-18h'],'horaires : ceux du site');
    assert.match(m.fiche.description,/nettement plus longue/,'description la plus détaillée');
    assert.deepEqual(m.photos,['https://ariya.fr/a.jpg','https://ariya.fr/b-300x200.jpg','https://cdn.fr/c.jpg'].map(x=>x).filter(x=>m.photos.includes(x)).length===3?m.photos:[], 'doublons : même photo en plusieurs tailles = une seule');
    assert.ok(!m.photos.some(p=>p.startsWith('http://')),'les photos non https sont écartées');
    assert.equal(m.photos.filter(p=>/\\/b/.test(p)).length,1,'b.jpg, b-300x200.jpg et b.jpg?w=400 : une seule');
    assert.equal(mergeScrapes(null,null),null);assert.equal(mergeScrapes(site,null),site);assert.equal(mergeScrapes(null,ng),ng);
    // Application à une fiche : ne jamais écraser ce qui est saisi
    const mine={...emptyClientProfile(),name:'Ariya',phone:'07 00 00 00 00',description:'Ma description',photoUrls:['https://ariya.fr/a.jpg','https://mes.photos/x.jpg']};
    const r=applyScrapeToProfile(mine,m);
    assert.equal(r.profile.phone,'07 00 00 00 00','téléphone saisi conservé');
    assert.equal(r.profile.description,'Ma description','description saisie conservée');
    assert.equal(r.profile.name,'Ariya','nom saisi conservé');
    assert.equal(r.profile.address,'12 rue de la Paix','champ vide rempli');
    assert.equal(r.profile.openingHours,'Lundi : 9h-18h');
    assert.equal(r.profile.facebook,'https://facebook.com/ariya');
    assert.match(r.profile.otherLinks,/tiktok : https:\\/\\/tiktok.com\\/@ariya/);
    assert.equal(r.profile.logoUrl,'https://ariya.fr/logo.png');
    assert.ok(r.profile.photoUrls.includes('https://mes.photos/x.jpg'),'photos existantes gardées');
    assert.equal(new Set(r.profile.photoUrls).size,r.profile.photoUrls.length,'sans doublon');
    assert.ok(r.filled.includes('adresse')&&r.filled.includes('horaires')&&!r.filled.includes('téléphone'));
    // Écrasement demandé
    const o=applyScrapeToProfile(mine,m,true);
    assert.equal(o.profile.phone,'06 12 34 56 78');assert.equal(o.profile.name,'Ariya Massage');
    // Seconde application : rien de nouveau à remplir
    const again=applyScrapeToProfile(r.profile,m);
    assert.deepEqual(again.filled,[],'idempotent');
    // Limite de 30 photos
    const many=Array.from({length:80},(_,i)=>'https://x.fr/p'+i+'.jpg');
    assert.equal(uniquePhotos(many).length,MAX_PROFILE_PHOTOS);
    assert.equal(applyScrapeToProfile({...emptyClientProfile(),photoUrls:many.slice(0,28)},{...site,photos:many.slice(28,40)}).profile.photoUrls.length,30);
    assert.ok(describeScrape(m).includes('Facebook')&&describeScrape(site).includes('Instagram : non trouvé'));
    // Compléter une fiche existante avec une fiche trouvée
    const found={...emptyClientProfile(),name:'Ariya Massage SARL',phone:'04 00 00 00 00',facebook:'https://facebook.com/ariya',openingHours:'Lundi : 9h-18h',photoUrls:['https://ariya.fr/a.jpg','https://ariya.fr/n.jpg'],sourceNotes:['note']};
    const mp=mergeProfiles({...emptyClientProfile(),name:'Ariya',phone:'07 11 22 33 44',photoUrls:['https://ariya.fr/a.jpg']},found);
    assert.equal(mp.profile.name,'Ariya','nom existant conservé');
    assert.equal(mp.profile.phone,'07 11 22 33 44','téléphone existant conservé');
    assert.equal(mp.profile.facebook,'https://facebook.com/ariya');assert.equal(mp.profile.openingHours,'Lundi : 9h-18h');
    assert.deepEqual(mp.profile.photoUrls,['https://ariya.fr/a.jpg','https://ariya.fr/n.jpg']);
    assert.ok(mp.filled.includes('Facebook')&&mp.filled.includes('1 photo')&&!mp.filled.includes('téléphone'));
    assert.deepEqual(mergeProfiles(mp.profile,found).filled,[],'idempotent');
    assert.equal(mergeProfiles({...emptyClientProfile()},found).profile.name,'Ariya Massage SARL','fiche sans nom : nom repris');
    console.log('OK');
  `);
  const out=join(dir,'out.mjs');
  await build({entryPoints:[entry],bundle:true,format:'esm',platform:'node',outfile:out,logLevel:'error'});
  await import(out);
}finally{rmSync(dir,{recursive:true,force:true});}
