import {describe,expect,it} from 'vitest';
import {mapLinks,translationGaps,TRANSLATION_LANGS} from '../src/localisation';

describe('localisation',()=>{
  it('liens carte et itinéraire depuis une adresse vérifiée',()=>{
    const l=mapLinks('12 rue de la Paix, 11100 Narbonne');
    expect(l?.map).toContain('google.com/maps/search/');
    expect(l?.route).toContain('destination=');
    expect(l?.route).toContain(encodeURIComponent('11100 Narbonne'));
  });
  it('pas d’adresse = pas de lien (jamais de coordonnées devinées)',()=>{
    expect(mapLinks(undefined)).toBeUndefined();
    expect(mapLinks('   ')).toBeUndefined();
    expect(mapLinks('Narbonne')).toBeUndefined();
  });
  it('espaces multiples nettoyés',()=>{
    expect(mapLinks('12   rue  de la Paix')?.map).toContain(encodeURIComponent('12 rue de la Paix'));
  });
});
describe('traductions avant publication',()=>{
  it('signale chaque texte non traduit, par langue',()=>{
    const gaps=translationGaps([{label:'Carte',base:'Carte',translations:{en:'Map'}}],['fr','en','es']);
    expect(gaps).toEqual([{label:'Carte',lang:'es'}]);
  });
  it('un texte vide n’est pas à traduire',()=>{
    expect(translationGaps([{label:'Vide',base:'  '}],['fr','en'])).toEqual([]);
  });
  it('le français n’est jamais un manque',()=>{
    expect(translationGaps([{label:'X',base:'X'}],['fr']).length).toBe(0);
  });
  it('6 langues prévues',()=>{
    expect(TRANSLATION_LANGS).toEqual(['fr','en','es','de','nl','it']);
  });
});
