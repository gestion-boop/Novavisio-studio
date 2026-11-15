import type {StudioLanguage} from './storage';

/**
 * Textes fixes de la visite (paramètres, plan, fenêtres) dans les 5 langues de la visite.
 * Le français est la langue de référence : une clé absente dans une langue retombe sur le français.
 */
export const UI_TEXTS = {
  settings:{fr:'Paramètres',en:'Settings',es:'Ajustes',de:'Einstellungen',nl:'Instellingen'},
  settingsTitle:{fr:'Paramètres : plan, son et langue',en:'Settings: plan, sound and language',es:'Ajustes: plano, sonido e idioma',de:'Einstellungen: Plan, Ton und Sprache',nl:'Instellingen: plattegrond, geluid en taal'},
  showPlan:{fr:'Afficher le plan',en:'Show the plan',es:'Mostrar el plano',de:'Plan anzeigen',nl:'Plattegrond tonen'},
  sound:{fr:'Son',en:'Sound',es:'Sonido',de:'Ton',nl:'Geluid'},
  soundOn:{fr:'Activé',en:'On',es:'Activado',de:'An',nl:'Aan'},
  soundOff:{fr:'Coupé',en:'Off',es:'Silenciado',de:'Aus',nl:'Uit'},
  language:{fr:'Langue',en:'Language',es:'Idioma',de:'Sprache',nl:'Taal'},
  planTitle:{fr:'Plan de la visite',en:'Visit map',es:'Plano de la visita',de:'Besuchsplan',nl:'Plattegrond van de visite'},
  planHelp:{fr:'Cliquez sur un point pour rejoindre son panorama. Le point en couleur indique votre position.',en:'Click a point to go to its panorama. The coloured point shows where you are.',es:'Haga clic en un punto para ir a su panorámica. El punto de color indica dónde está usted.',de:'Klicken Sie auf einen Punkt, um zu seinem Panorama zu gelangen. Der farbige Punkt zeigt Ihre Position.',nl:'Klik op een punt om naar het bijbehorende panorama te gaan. Het gekleurde punt toont uw positie.'},
  placedCount:{fr:'panoramas placés',en:'panoramas placed',es:'panorámicas colocadas',de:'Panoramen platziert',nl:'panorama’s geplaatst'},
  goTo:{fr:'Aller à : ',en:'Go to: ',es:'Ir a: ',de:'Gehe zu: ',nl:'Ga naar: '},
  select:{fr:'Sélectionner : ',en:'Select: ',es:'Seleccionar: ',de:'Auswählen: ',nl:'Selecteer: '},
  removePoint:{fr:'Retirer le point : ',en:'Remove point: ',es:'Quitar punto: ',de:'Punkt entfernen: ',nl:'Punt verwijderen: '},
  preview360:{fr:'Aperçu 360°',en:'360° preview',es:'Vista previa 360°',de:'360°-Vorschau',nl:'360°-voorbeeld'},
  backToPlan:{fr:'Revenir au plan',en:'Back to the map',es:'Volver al plano',de:'Zurück zum Plan',nl:'Terug naar de plattegrond'},
  close:{fr:'Fermer',en:'Close',es:'Cerrar',de:'Schließen',nl:'Sluiten'},
  pointOnPlan:{fr:'Point {n} sur le plan',en:'Point {n} on the map',es:'Punto {n} en el plano',de:'Punkt {n} auf dem Plan',nl:'Punt {n} op de plattegrond'},
  toPlace:{fr:'À placer sur le plan',en:'To place on the map',es:'Por colocar en el plano',de:'Auf dem Plan platzieren',nl:'Nog op de plattegrond plaatsen'},
  view360:{fr:'Voir {name} en 360°',en:'View {name} in 360°',es:'Ver {name} en 360°',de:'{name} in 360° ansehen',nl:'{name} bekijken in 360°'},
  noInfo:{fr:'Aucune information renseignée.',en:'No information available.',es:'No hay información disponible.',de:'Keine Informationen vorhanden.',nl:'Geen informatie beschikbaar.'},
  photos:{fr:'Photos',en:'Photos',es:'Fotos',de:'Fotos',nl:'Foto’s'},
  panoramas:{fr:'Panoramas',en:'Panoramas',es:'Panorámicas',de:'Panoramen',nl:'Panorama’s'},
  noPlanPoint:{fr:'Aucun panorama accessible n’est placé sur ce plan.',en:'No accessible panorama is placed on this map.',es:'Ninguna panorámica accesible está colocada en este plano.',de:'Auf diesem Plan ist kein zugängliches Panorama platziert.',nl:'Er is geen toegankelijk panorama op deze plattegrond geplaatst.'},
  quitVr:{fr:'Quitter la VR',en:'Exit VR',es:'Salir de RV',de:'VR beenden',nl:'VR verlaten'},
  infoTitle:{fr:'Informations',en:'Information',es:'Información',de:'Informationen',nl:'Informatie'},
  linkTitle:{fr:'Lien',en:'Link',es:'Enlace',de:'Link',nl:'Link'},
  videoTitle:{fr:'Vidéo',en:'Video',es:'Vídeo',de:'Video',nl:'Video'},
  webPage:{fr:'Page web',en:'Web page',es:'Página web',de:'Webseite',nl:'Webpagina'},
  webLinkTitle:{fr:'Lien internet',en:'Web link',es:'Enlace de internet',de:'Internetlink',nl:'Internetlink'},
  openInBrowser:{fr:'Ouvrir cette page dans le navigateur du casque.',en:'Open this page in the headset browser.',es:'Abra esta página en el navegador de las gafas.',de:'Diese Seite im Browser der Brille öffnen.',nl:'Open deze pagina in de browser van de bril.'},
  badUrl:{fr:'Adresse web indisponible',en:'Web address unavailable',es:'Dirección web no disponible',de:'Webadresse nicht verfügbar',nl:'Webadres niet beschikbaar'},
  openSite:{fr:'↗ Ouvrir le site',en:'↗ Open the site',es:'↗ Abrir el sitio',de:'↗ Website öffnen',nl:'↗ Site openen'},
  loading:{fr:'Chargement…',en:'Loading…',es:'Cargando…',de:'Wird geladen…',nl:'Laden…'},
  noLink:{fr:'Aucun lien renseigné.',en:'No link provided.',es:'No hay ningún enlace.',de:'Kein Link angegeben.',nl:'Geen link ingevuld.'},
  photoLoading:{fr:'Photo en cours de chargement…',en:'Photo loading…',es:'Cargando la foto…',de:'Foto wird geladen…',nl:'Foto wordt geladen…'},
  photoFail:{fr:'Impossible de charger cette photo.',en:'This photo could not be loaded.',es:'No se pudo cargar esta foto.',de:'Dieses Foto konnte nicht geladen werden.',nl:'Deze foto kon niet worden geladen.'},
  noPhoto:{fr:'Aucune photo dans cette galerie.',en:'No photo in this gallery.',es:'No hay fotos en esta galería.',de:'Keine Fotos in dieser Galerie.',nl:'Geen foto’s in deze galerie.'},
  unavailable:{fr:'Ce panorama n’est pas encore disponible.',en:'This panorama is not available yet.',es:'Esta panorámica aún no está disponible.',de:'Dieses Panorama ist noch nicht verfügbar.',nl:'Dit panorama is nog niet beschikbaar.'},
  unavailableAny:{fr:'Panorama indisponible.',en:'Panorama unavailable.',es:'Panorámica no disponible.',de:'Panorama nicht verfügbar.',nl:'Panorama niet beschikbaar.'},
  videoClassic:{fr:'Cette vidéo se lit dans la visite classique.',en:'This video plays in the standard visit.',es:'Este vídeo se reproduce en la visita clásica.',de:'Dieses Video wird im klassischen Besuch abgespielt.',nl:'Deze video wordt afgespeeld in de klassieke rondleiding.'},
  videoPlayHint:{fr:'Touche ❚❚ / ▶ pour lancer la vidéo.',en:'Press ❚❚ / ▶ to start the video.',es:'Pulse ❚❚ / ▶ para iniciar el vídeo.',de:'Taste ❚❚ / ▶ drücken, um das Video zu starten.',nl:'Druk op ❚❚ / ▶ om de video te starten.'},
  playFail:{fr:'Lecture impossible.',en:'Playback not possible.',es:'No se puede reproducir.',de:'Wiedergabe nicht möglich.',nl:'Afspelen is niet mogelijk.'},
  buttonClassic:{fr:'Ce bouton s’ouvre dans la visite classique.',en:'This button opens in the standard visit.',es:'Este botón se abre en la visita clásica.',de:'Diese Schaltfläche öffnet sich im klassischen Besuch.',nl:'Deze knop opent in de klassieke rondleiding.'},
  planUnset:{fr:'Le plan de cette visite n’est pas configuré.',en:'The map of this visit is not set up.',es:'El plano de esta visita no está configurado.',de:'Der Plan dieses Besuchs ist nicht eingerichtet.',nl:'De plattegrond van deze rondleiding is niet ingesteld.'},
  planLoading:{fr:'Chargement du plan…',en:'Loading the map…',es:'Cargando el plano…',de:'Plan wird geladen…',nl:'Plattegrond laden…'},
  planFail:{fr:'Impossible de charger le plan.',en:'The map could not be loaded.',es:'No se pudo cargar el plano.',de:'Der Plan konnte nicht geladen werden.',nl:'De plattegrond kon niet worden geladen.'},
  items:{fr:'éléments',en:'items',es:'elementos',de:'Elemente',nl:'items'},
  panoramaCount:{fr:'panoramas',en:'panoramas',es:'panorámicas',de:'Panoramen',nl:'panorama’s'},
  page:{fr:'page',en:'page',es:'página',de:'Seite',nl:'pagina'},
  spaces:{fr:'Espaces',en:'Spaces',es:'Espacios',de:'Bereiche',nl:'Ruimten'},
  plan:{fr:'Plan',en:'Map',es:'Plano',de:'Plan',nl:'Plattegrond'},
} as const;
export type UiKey = keyof typeof UI_TEXTS;

/** Texte d'interface dans la langue donnée ({n}, {name} remplacés si fournis). */
export function ui(key:UiKey,lang:StudioLanguage|string,vars?:Record<string,string|number>):string{
  const entry:Partial<Record<string,string>>=UI_TEXTS[key];
  let text=entry[lang]??entry.fr??key;
  if(vars)for(const [k,v] of Object.entries(vars))text=text.split('{'+k+'}').join(String(v));
  return text;
}

/**
 * Contenu de la visite : le texte de référence (français) est remplacé par la traduction de la langue du visiteur
 * si elle existe, sinon le français s'affiche.
 */
export function pick(base:string|undefined,translations:Partial<Record<string,string>>|undefined,lang:StudioLanguage|string):string{
  if(lang==='fr')return base??'';
  const t=translations?.[lang];
  return (t&&t.trim())?t:(base??'');
}
