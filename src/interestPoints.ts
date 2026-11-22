/**
 * Points d'information intelligents (NovaStudio AI — phase 4, partie SANS IA).
 * Règles : un point n'est proposé QUE si l'information requise est vérifiée ; sinon il est listé « à compléter ».
 * Aucun texte n'est inventé : seuls des libellés génériques et les données vérifiées sont utilisés.
 * Rien n'est publié sans confirmation explicite (statut « confirmed »).
 */
export type InterestCategory='hotel'|'airbnb'|'gite'|'restaurant'|'camping'|'immobilier'|'spa'|'musee'|'commerce'|'autre';
export const INTEREST_CATEGORIES:ReadonlyArray<{id:InterestCategory;label:string}>=[
  {id:'hotel',label:'Hôtel'},{id:'airbnb',label:'Airbnb'},{id:'gite',label:'Gîte'},{id:'restaurant',label:'Restaurant'},
  {id:'camping',label:'Camping'},{id:'immobilier',label:'Immobilier'},{id:'spa',label:'Spa / institut'},
  {id:'musee',label:'Musée / tourisme'},{id:'commerce',label:'Commerce'},{id:'autre',label:'Autre'}
];
/** Données VÉRIFIÉES (saisies ou confirmées par l'utilisateur). Une clé absente = information inconnue. */
export type VerifiedInfo=Partial<Record<'phone'|'email'|'bookingUrl'|'address'|'website'|'menuUrl'|'tariffUrl'|'openingHours'|'services'|'specialties'|'activities'|'rooms'|'surfaces'|'equipments'|'pool'|'accessibility',string|string[]>>;
export type PointKind='text'|'link'|'phone'|'email'|'navigate'|'gallery'|'plan'|'map'|'image'|'video'|'booking'|'pdf'|'space';
export type PointTemplate={key:string;title:string;kind:PointKind;icon:string;requires?:Array<keyof VerifiedInfo>};
/** `text`/`url`/`targetSceneId`/`targetSpaceId` : saisis par l'utilisateur pour un point personnalisé (`custom`). */
export type Suggestion={id:string;key:string;title:string;kind:PointKind;icon:string;status:'proposed'|'confirmed'|'rejected';custom?:boolean;text?:string;url?:string;targetSceneId?:string;targetSpaceId?:string};
/** Les 12 types de points du module 4, avec l'icône par défaut et le type de point NovaStudio créé au placement. */
export const POINT_KINDS:ReadonlyArray<{id:PointKind;label:string;icon:string;hotspot:'information'|'lien'|'image'|'video'|'navigation';needsUrl?:boolean}>=[
  {id:'text',label:'Texte',icon:'informations',hotspot:'information'},
  {id:'image',label:'Image',icon:'galerie-photos',hotspot:'image'},
  {id:'gallery',label:'Galerie',icon:'galerie-photos',hotspot:'image'},
  {id:'video',label:'Vidéo',icon:'videos',hotspot:'video'},
  {id:'link',label:'Lien externe',icon:'site-internet',hotspot:'lien',needsUrl:true},
  {id:'booking',label:'Réservation',icon:'reservation',hotspot:'lien',needsUrl:true},
  {id:'phone',label:'Téléphone',icon:'telephone',hotspot:'lien'},
  {id:'email',label:'E-mail',icon:'email',hotspot:'lien'},
  {id:'pdf',label:'Document PDF',icon:'informations',hotspot:'lien',needsUrl:true},
  {id:'navigate',label:'Vers un panorama',icon:'nav-avant',hotspot:'navigation'},
  {id:'space',label:'Vers un autre espace',icon:'plan',hotspot:'navigation'},
  {id:'map',label:'Carte / localisation',icon:'localisation',hotspot:'lien'},
  {id:'plan',label:'Plan',icon:'plan',hotspot:'information'}
];
export const kindLabel=(k:PointKind)=>POINT_KINDS.find(p=>p.id===k)?.label??'Texte';
export type Missing={key:string;title:string;needs:Array<keyof VerifiedInfo>};

const T:Record<InterestCategory,PointTemplate[]>={
  hotel:[
    {key:'chambre',title:'Chambre',kind:'text',icon:'chambre'},
    {key:'equipements',title:'Équipements',kind:'text',icon:'services',requires:['equipments']},
    {key:'petit-dejeuner',title:'Petit-déjeuner',kind:'text',icon:'restaurant',requires:['services']},
    {key:'services',title:'Services',kind:'text',icon:'services',requires:['services']},
    {key:'reservation',title:'Réserver',kind:'link',icon:'reservation',requires:['bookingUrl']},
    {key:'telephone',title:'Appeler',kind:'phone',icon:'telephone',requires:['phone']}
  ],
  airbnb:[
    {key:'chambre',title:'Logement',kind:'text',icon:'hebergement'},
    {key:'equipements',title:'Équipements',kind:'text',icon:'services',requires:['equipments']},
    {key:'reservation',title:'Réserver',kind:'link',icon:'reservation',requires:['bookingUrl']}
  ],
  gite:[
    {key:'hebergement',title:'Hébergement',kind:'text',icon:'hebergement'},
    {key:'equipements',title:'Équipements',kind:'text',icon:'services',requires:['equipments']},
    {key:'telephone',title:'Appeler',kind:'phone',icon:'telephone',requires:['phone']}
  ],
  restaurant:[
    {key:'carte',title:'Carte',kind:'link',icon:'carte',requires:['menuUrl']},
    {key:'specialites',title:'Spécialités',kind:'text',icon:'restaurant',requires:['specialties']},
    {key:'terrasse',title:'Terrasse',kind:'text',icon:'hebergement'},
    {key:'horaires',title:'Horaires',kind:'text',icon:'informations',requires:['openingHours']},
    {key:'reservation',title:'Réserver une table',kind:'link',icon:'reservation',requires:['bookingUrl']},
    {key:'telephone',title:'Appeler',kind:'phone',icon:'telephone',requires:['phone']}
  ],
  camping:[
    {key:'hebergements',title:'Hébergements',kind:'navigate',icon:'hebergement'},
    {key:'piscine',title:'Piscine',kind:'text',icon:'piscine',requires:['pool']},
    {key:'activites',title:'Activités',kind:'text',icon:'services',requires:['activities']},
    {key:'services',title:'Services',kind:'text',icon:'services',requires:['services']},
    {key:'plan',title:'Plan du camping',kind:'plan',icon:'plan'},
    {key:'reservation',title:'Réserver',kind:'link',icon:'reservation',requires:['bookingUrl']}
  ],
  immobilier:[
    {key:'pieces',title:'Nom des pièces',kind:'text',icon:'informations',requires:['rooms']},
    {key:'surfaces',title:'Surfaces',kind:'text',icon:'informations',requires:['surfaces']},
    {key:'equipements',title:'Équipements',kind:'text',icon:'services',requires:['equipments']},
    {key:'galerie',title:'Galerie photos',kind:'gallery',icon:'galerie-photos'},
    {key:'plan',title:'Plan',kind:'plan',icon:'plan'},
    {key:'contact',title:'Contacter',kind:'email',icon:'email',requires:['email']}
  ],
  spa:[
    {key:'soins',title:'Soins',kind:'text',icon:'spa',requires:['services']},
    {key:'tarifs',title:'Tarifs',kind:'link',icon:'tarifs',requires:['tariffUrl']},
    {key:'accessibilite',title:'Accessibilité',kind:'text',icon:'accessibilite',requires:['accessibility']},
    {key:'reservation',title:'Réserver',kind:'link',icon:'reservation',requires:['bookingUrl']},
    {key:'telephone',title:'Appeler',kind:'phone',icon:'telephone',requires:['phone']}
  ],
  musee:[
    {key:'horaires',title:'Horaires',kind:'text',icon:'informations',requires:['openingHours']},
    {key:'tarifs',title:'Tarifs',kind:'link',icon:'tarifs',requires:['tariffUrl']},
    {key:'localisation',title:'Localisation',kind:'map',icon:'localisation',requires:['address']},
    {key:'site',title:'Site internet',kind:'link',icon:'site-internet',requires:['website']}
  ],
  commerce:[
    {key:'produits',title:'Produits',kind:'text',icon:'produits',requires:['services']},
    {key:'horaires',title:'Horaires',kind:'text',icon:'informations',requires:['openingHours']},
    {key:'localisation',title:'Localisation',kind:'map',icon:'localisation',requires:['address']},
    {key:'telephone',title:'Appeler',kind:'phone',icon:'telephone',requires:['phone']}
  ],
  autre:[
    {key:'localisation',title:'Localisation',kind:'map',icon:'localisation',requires:['address']},
    {key:'site',title:'Site internet',kind:'link',icon:'site-internet',requires:['website']},
    {key:'telephone',title:'Appeler',kind:'phone',icon:'telephone',requires:['phone']}
  ]
};
export const templatesFor=(c:InterestCategory):PointTemplate[]=>T[c]??T.autre;

const has=(info:VerifiedInfo,k:keyof VerifiedInfo)=>{const v=info[k];return Array.isArray(v)?v.length>0:typeof v==='string'&&v.trim().length>0;};
/** Sépare les points prêts (informations vérifiées présentes) des points à compléter. */
export function buildSuggestions(category:InterestCategory,info:VerifiedInfo):{ready:Suggestion[];missing:Missing[]}{
  const ready:Suggestion[]=[],missing:Missing[]=[];
  for(const t of templatesFor(category)){
    const needs=(t.requires??[]).filter(k=>!has(info,k));
    if(needs.length) missing.push({key:t.key,title:t.title,needs});
    else ready.push({id:category+':'+t.key,key:t.key,title:t.title,kind:t.kind,icon:t.icon,status:'proposed'});
  }
  return {ready,missing};
}
/** Seul un point confirmé par l'utilisateur peut être publié. */
export const isPublishable=(s:Suggestion):boolean=>s.status==='confirmed';

/** Lien d'un point, dérivé UNIQUEMENT d'une information vérifiée (jamais inventé). Undefined si absent. */
export function urlForSuggestion(s:Pick<Suggestion,'key'|'kind'>,info:VerifiedInfo):string|undefined{
  const pick=(k:keyof VerifiedInfo)=>{const v=info[k];const t=Array.isArray(v)?v[0]:v;return typeof t==='string'&&t.trim()?t.trim():undefined;};
  if(s.kind==='phone'){const p=pick('phone');return p?'tel:'+p.replace(/[^+\d]/g,''):undefined;}
  if(s.kind==='email'){const e=pick('email');return e?'mailto:'+e:undefined;}
  if(s.kind!=='link')return undefined;
  const byKey:Record<string,keyof VerifiedInfo>={reservation:'bookingUrl',carte:'menuUrl',tarifs:'tariffUrl',site:'website'};
  const k=byKey[s.key];
  return k?pick(k):undefined;
}
