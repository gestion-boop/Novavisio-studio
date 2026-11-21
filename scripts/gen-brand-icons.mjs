#!/usr/bin/env node
// Génère src/brandIconSet.ts à partir des tracés Lucide (licence ISC) : figé, sans dépendance à l'exécution.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const DIR='node_modules/lucide-react/dist/esm/icons/';
// clé NovaStudio → nom Lucide, libellé
const SPEC=[
  ['accueil','house','Accueil'],['nav-gauche','arrow-left','Navigation gauche'],['nav-droite','arrow-right','Navigation droite'],
  ['nav-avant','arrow-up','Navigation avant'],['nav-arriere','arrow-down','Navigation arrière'],['informations','info','Informations'],
  ['galerie-photos','images','Galerie photos'],['videos','video','Vidéos'],['localisation','map-pin','Localisation'],
  ['plan','layout-grid','Plan'],['carte','map','Carte'],['reservation','calendar-check','Réservation'],
  ['site-internet','globe','Site internet'],['telephone','phone','Téléphone'],['email','mail','E-mail'],
  ['reseaux-sociaux','share-2','Réseaux sociaux'],['son-active','volume-2','Son activé'],['son-desactive','volume-x','Son désactivé'],
  ['musique','music','Musique'],['plein-ecran','maximize','Plein écran'],['parametres','settings','Paramètres'],
  ['changement-langue','languages','Changement de langue'],['mode-vr','glasses','Mode VR'],['jour-nuit','moon','Jour et nuit'],
  ['restaurant','utensils','Restaurant'],['chambre','bed-double','Chambre'],['hebergement','bed','Hébergement'],
  ['piscine','waves','Piscine'],['spa','sparkles','Spa'],['massage','hand-heart','Massage'],
  ['produits','package','Produits'],['boutique','shopping-bag','Boutique'],['services','concierge-bell','Services'],
  ['tarifs','tag','Tarifs'],['accessibilite','accessibility','Accessibilité'],['retour','undo-2','Retour'],
  // Extension : 50 icônes au total = 150 images, soit la limite d'un projet.
  ['tente','tent','Tente'],['caravane','caravan','Caravane'],['nature','trees','Nature'],['velo','bike','Vélo'],
  ['voiture','car','Voiture'],['animaux','dog','Animaux acceptés'],['cafe','coffee','Café'],['vin','wine','Bar'],
  ['glaces','ice-cream-cone','Glaces'],['wifi','wifi','Wi-Fi'],['douche','shower-head','Douches'],['television','tv','Télévision'],
  ['localisation-plan','map-pinned','Localisation sur plan'],['randonnee','footprints','Randonnée']
];
const out=[];const missing=[];
for(const [key,name,label] of SPEC){
  const f=DIR+name+'.js';
  if(!existsSync(f)){missing.push(name);continue;}
  const src=readFileSync(f,'utf8');
  const m=/createLucideIcon\("[^"]+",\s*(\[[\s\S]*?\])\);\s*\n\s*export/.exec(src);
  if(!m){missing.push(name+' (format)');continue;}
  const nodes=new Function('return '+m[1])();
  // on ne garde que les attributs géométriques (sans la clé de référence Lucide)
  const clean=nodes.map(([tag,attrs])=>{const {key:_k,...rest}=attrs;return [tag,rest];});
  out.push({key,label,nodes:clean});
}
if(missing.length){console.error('Icônes introuvables :',missing.join(', '));process.exit(1);}
const body=`// GÉNÉRÉ par scripts/gen-brand-icons.mjs — ne pas modifier à la main.
// Tracés issus de Lucide (https://lucide.dev), licence ISC.
export type IconNode=[string,Record<string,string|number>];
export type BrandIconSpec={key:string;label:string;nodes:IconNode[]};
export const BRAND_ICON_SET:ReadonlyArray<BrandIconSpec>=${JSON.stringify(out,null,1)};
`;
writeFileSync('src/brandIconSet.ts',body);
console.log('icônes générées :',out.length);
