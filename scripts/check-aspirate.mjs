// Contrôle de l'aspirateur de site (api/_aspirate.js) sur des pages fictives : aucun accès réseau.
// Usage : node scripts/check-aspirate.mjs
import assert from 'node:assert/strict';
import {crawlSite,bestFromSrcset} from '../api/_aspirate.js';

const HOME=`<!doctype html><html><head><title>Ariya Massage | Narbonne</title>
<meta property="og:site_name" content="Ariya Massage">
<meta property="og:description" content="Massages bien-être &amp; relaxation à Narbonne.">
<meta property="og:image" content="/img/og-cover.jpg">
<meta property="og:image:alt" content="">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"HealthAndBeautyBusiness","name":"Ariya Massage","telephone":"+33 6 12 34 56 78","email":"contact@ariya.fr",
"address":{"@type":"PostalAddress","streetAddress":"12 rue de la Paix","postalCode":"11100","addressLocality":"Narbonne"},
"openingHoursSpecification":[{"dayOfWeek":["Monday","Tuesday"],"opens":"09:00","closes":"18:00"}],
"sameAs":["https://www.facebook.com/ariyamassage","https://instagram.com/ariya.massage/"],"logo":"https://ariya.fr/logo-ariya.png"}]}</script>
</head><body>
<img src="/img/logo-header.png" alt="Logo Ariya" class="logo">
<img src="/uploads/salle-300x200.jpg" width="300" height="200" alt="Salle">
<img src="/uploads/salle.jpg" width="1200" height="800" alt="Salle de massage">
<img data-src="/uploads/soin-visage.webp" alt="Soin">
<img srcset="/u/a-480.jpg 480w, /u/a-1600.jpg 1600w" src="/u/a-480.jpg" alt="Cabine">
<img src="/img/icon-phone.png" width="24" height="24">
<img src="/img/sprite.png"><img src="/x.svg"><img src="data:image/gif;base64,AAAA">
<div style="background-image:url('/hero/bandeau.jpg')">Bienvenue</div>
<a href="/contact">Contact</a><a href="/tarifs-massages">Tarifs</a><a href="/blog/article-12">Blog</a><a href="https://autre-site.fr/contact">Ailleurs</a>
<a href="https://www.facebook.com/sharer/sharer.php?u=x">Partager</a>
<a href="https://www.instagram.com/ariya.massage/?hl=fr">Instagram</a>
<a href="https://www.planity.com/ariya-massage">Réserver</a>
</body></html>`;
const CONTACT=`<html><head><title>Contact</title></head><body>
<a href="tel:+33612345678">06 12 34 56 78</a><a href="mailto:rdv@ariya.fr?subject=x">Mail</a>
<p>Lundi : 9h00 - 18h00</p><p>Mardi: 9h-18h</p><p>Samedi 10h à 14h</p><p>Dimanche : fermé</p>
<img src="/uploads/accueil.jpg" width="900" height="600">
</body></html>`;
const pages={'https://ariya.fr/':HOME,'https://ariya.fr/contact':CONTACT,'https://ariya.fr/tarifs-massages':'<html><title>Tarifs</title><body><img src="/uploads/tarifs.jpg" width="800"></body></html>'};
const requested=[];
const fetchPage=async(url)=>{requested.push(url);if(!(url in pages))throw new Error('404');return {html:pages[url],finalUrl:url};};

const r=await crawlSite('https://ariya.fr/',fetchPage,{maxPages:6});
assert.ok(r.ok);
assert.equal(r.fiche.nom,'Ariya Massage');
assert.equal(r.fiche.tel,'+33 6 12 34 56 78','téléphone JSON-LD en premier');
assert.equal(r.fiche.email,'contact@ariya.fr');
assert.equal(r.fiche.adresse,'12 rue de la Paix 11100');assert.equal(r.fiche.ville,'Narbonne');
assert.equal(r.fiche.facebook,'https://www.facebook.com/ariyamassage','Facebook sans le bouton Partager');
assert.equal(r.fiche.instagram,'https://instagram.com/ariya.massage','Instagram sans paramètres');
assert.equal(r.fiche.booking,'https://www.planity.com/ariya-massage');
assert.match(r.fiche.description,/Massages bien-être & relaxation/);
assert.ok(r.fiche.horaires.some(h=>/Lundi, Mardi : 09:00–18:00/.test(h)),'horaires JSON-LD');
assert.ok(r.fiche.horaires.some(h=>/Samedi 10h à 14h/.test(h)),'horaires du texte (page contact)');
assert.ok(r.fiche.horaires.some(h=>/Lundi : 9h00 - 18h00/.test(h)));
assert.ok(r.fiche.horaires.some(h=>/Dimanche : fermé/.test(h)),'jour de fermeture');
assert.deepEqual(requested,['https://ariya.fr/','https://ariya.fr/contact','https://ariya.fr/tarifs-massages'],'accueil + pages utiles, ni le blog ni un autre site');
assert.ok(r.photos.includes('https://ariya.fr/uploads/salle.jpg'),'version la plus grande gardée');
assert.ok(!r.photos.includes('https://ariya.fr/uploads/salle-300x200.jpg'),'miniature dédoublonnée');
assert.ok(r.photos.includes('https://ariya.fr/uploads/soin-visage.webp'),'data-src lu (et « visage » n\'est pas « visa »)');
assert.ok(r.photos.includes('https://ariya.fr/u/a-1600.jpg'),'meilleure entrée du srcset');
assert.ok(r.photos.includes('https://ariya.fr/hero/bandeau.jpg'),'fond CSS');
assert.ok(r.photos.includes('https://ariya.fr/img/og-cover.jpg'),'image de partage');
assert.ok(r.photos.includes('https://ariya.fr/uploads/accueil.jpg')&&r.photos.includes('https://ariya.fr/uploads/tarifs.jpg'),'photos des autres pages');
assert.ok(!r.photos.includes('https://ariya.fr/'),'une balise vide ne devient pas une photo');
for(const bad of ['icon-phone','sprite','.svg','data:'])assert.ok(!r.photos.some(p=>p.includes(bad)),'écarté : '+bad);
assert.ok(!r.photos.some(p=>/logo/i.test(p)),'les logos ne sont pas des photos');
assert.ok(r.logos.includes('https://ariya.fr/logo-ariya.png')&&r.logos.includes('https://ariya.fr/img/logo-header.png'));
const r2=await crawlSite('https://ariya.fr/',async(u)=>{if(u!=='https://ariya.fr/')throw new Error('timeout');return {html:HOME,finalUrl:u};});
assert.ok(r2.ok&&r2.notes.some(n=>/Page ignorée/.test(n)),'une page en erreur n\'arrête pas l\'aspiration');
assert.equal((await crawlSite('https://down.fr/',async()=>{throw new Error('503');})).ok,false);
assert.equal((await crawlSite('https://ariya.fr/',fetchPage,{maxPages:1})).pages.length,1,'maxPages respecté');
const r5=await crawlSite('https://vide.fr/',async(u)=>({html:'<html><title>Vide</title><body>Bonjour</body></html>',finalUrl:u}));
assert.ok(r5.ok&&r5.notes.length>=3,'site pauvre : notes explicites (horaires, réseaux, photos)');
assert.equal(bestFromSrcset('/a.jpg 1x, /b.jpg 2x','https://x.fr/'),'https://x.fr/b.jpg');
console.log('OK —',r.photos.length,'photos,',r.fiche.horaires.length,'horaires trouvés sur le site fictif');
