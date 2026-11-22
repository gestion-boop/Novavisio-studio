import type {BottomBarItem} from './storage';

export type BarKind='photos'|'gallery'|'phone'|'web'|'info'|'map'|'menu'|'other';

const norm=(s:string)=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
/** Devine à quoi sert un bouton de la barre d'après son titre (et son icône) : panoramas, téléphone, site, infos, carte, menu… */
export function barKind(item:Pick<BottomBarItem,'title'|'builtinIcon'|'url'|'text'>):BarKind{
  const t=norm((item.title||'')+' '+(item.builtinIcon||''));
  if(/^tel:/.test(item.url||'')||/(appel|telephone|\btel\b|phone|call|joindre|contact|numero)/.test(t))return 'phone';
  if(/(photo|image|album|diaporama)/.test(t))return 'photos';
  if(/(panorama|espace|galerie|visite|logement|chambre|hebergement|home|accueil|grid)/.test(t))return 'gallery';
  if(/(resto|menu|cuisine|restaurant|manger|fork|food|bar\b|carte des|tarif)/.test(t))return 'menu';
  if(/(carte|plan|localis|itiner|map|acces|situer|trouver|adresse|pin)/.test(t))return 'map';
  if(/(site|web|reserv|booking|lien|www|internet|globe|externe)/.test(t))return 'web';
  if(/(info|horaire|aide|renseign|infos|about)/.test(t))return 'info';
  return 'other';
}
