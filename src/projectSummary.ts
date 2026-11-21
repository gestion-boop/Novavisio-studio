/**
 * Synthèse avant application (NovaStudio AI — module 10). Lecture seule : aucune donnée n'est modifiée.
 * Chaque ligne indique l'état réel du projet et ce qui reste à faire.
 */
import {translationGaps,mapLinks,type LangCode,type TranslatableText} from './localisation';
import {nativeIntroActive} from './introDesign';
import type {StudioProject} from './storage';

export type SummaryLine={id:string;label:string;state:'ok'|'todo'|'info';detail:string};
const SUPPORTED:LangCode[]=['en','es','de','nl'];

export function summarizeProject(p:StudioProject):SummaryLine[]{
  const lines:SummaryLine[]=[];
  const add=(id:string,label:string,state:SummaryLine['state'],detail:string)=>lines.push({id,label,state,detail});

  // Identité
  const client=p.clientProfile?.name;
  add('identite','Identité',client?'ok':'todo',client?`Client : ${client}`:'Aucun client renseigné (fiche client à compléter).');

  // Charte
  const k=p.brandKit;
  add('charte','Charte graphique',k?(k.validated?'ok':'todo'):'todo',
    k?(k.validated?`Validée (style : ${k.styleId})`:'Brouillon : à valider dans la charte graphique.'):'Aucune charte : menu Fichier → Charte graphique.');

  // Icônes
  const packs=p.icons.filter(i=>/ · (Normal|Survol|Pressé)$/.test(i.name)).length;
  add('icones','Icônes',p.icons.length>0?'ok':'todo',`${p.icons.length} icône(s)${packs?` dont ${packs} de charte`:''}.`);

  // Intro
  const native=nativeIntroActive(p);
  const external=(p.introUrl??'').startsWith('https://');
  add('intro','Introduction',native||external?'ok':'info',
    external?'Adresse externe définie (prioritaire).':native?`Automatique : « ${p.introDesign?.title||p.name} ».`:'Aucune introduction.');

  // Navigation
  const arrows=p.scenes.reduce((n,sc)=>n+sc.hotspots.filter(h=>h.type==='navigation').length,0);
  const noArrival=p.scenes.filter(sc=>!sc.hotspots.some(h=>h.type==='navigation')&&!sc.excluded).length;
  add('navigation','Navigation',noArrival?'todo':'ok',
    `${arrows} flèche(s).`+(noArrival?` ${noArrival} panorama(s) sans aucune flèche (impasse).`:''));

  // Points d'information
  const pts=p.interestPoints??[];
  const confirmed=pts.filter(x=>x.status==='confirmed').length, proposed=pts.filter(x=>x.status==='proposed').length;
  add('points','Points d’information',proposed?'todo':confirmed?'ok':'info',
    `${confirmed} confirmé(s)`+(proposed?`, ${proposed} à valider`:'')+'.');

  // Localisation
  const links=mapLinks(p.interestInfo?.address as string|undefined);
  add('localisation','Localisation',links?'ok':'todo',links?'Adresse vérifiée : liens carte et itinéraire prêts.':'Adresse non vérifiée (ou trop vague) : aucun lien de carte.');

  // Traductions
  const langs=(p.languages??['fr']).filter(l=>l!=='fr');
  const items:TranslatableText[]=[
    ...p.bottomBar.map(b=>({label:'Bouton : '+b.title,base:b.title,translations:b.titleTranslations as Partial<Record<LangCode,string>>})),
    ...p.scenes.map(s=>({label:'Panorama : '+s.name,base:s.name,translations:s.nameTranslations as Partial<Record<LangCode,string>>}))
  ];
  const supported=langs.filter(l=>SUPPORTED.includes(l as LangCode)) as LangCode[];
  const gaps=translationGaps(items,supported);
  const unsupported=langs.filter(l=>!SUPPORTED.includes(l as LangCode));
  add('traductions','Traductions',gaps.length?'todo':'ok',
    (supported.length?(gaps.length?`${gaps.length} texte(s) non traduit(s) (${[...new Set(gaps.map(g=>g.lang))].join(', ')}).`:'Tous les textes sont traduits.'):'Aucune langue étrangère choisie.')
    +(unsupported.length?` Langue sans champ de traduction : ${unsupported.join(', ')}.`:''));

  // Mobile / VR
  add('vr','Casque VR',p.vrEnabled?'ok':'info',p.vrEnabled?'Activé.':'Désactivé (visite classique uniquement).');
  return lines;
}
