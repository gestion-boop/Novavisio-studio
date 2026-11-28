import {describe,expect,it} from 'vitest';
import {matchesSearch} from '../src/PreparationControls';

describe('matchesSearch',()=>{
  it('ignore les accents et la casse',()=>{
    expect(matchesSearch('Visite immersive 360° et VR (facultatif)','IMMERSIVE')).toBe(true);
    expect(matchesSearch('Croix de fermeture','fermeturé')).toBe(true);
    expect(matchesSearch('Langues de la visite','LANGUES')).toBe(true);
  });
  it('exige tous les mots, dans n\'importe quel ordre',()=>{
    expect(matchesSearch('Cadre doré des photos et vidéos','video photo')).toBe(true);
    expect(matchesSearch('Cadre doré des photos et vidéos','photo casque')).toBe(false);
  });
  it('une recherche vide laisse tout passer',()=>{
    expect(matchesSearch('Agent immobilier','   ')).toBe(true);
  });
});
