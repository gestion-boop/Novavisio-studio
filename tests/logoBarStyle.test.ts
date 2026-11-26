import {describe,expect,it} from 'vitest';
import {proposalsFrom} from '../src/skinPalette';

describe('couleurs de la barre d’après le logo',()=>{
  it('la première proposition prend la couleur dominante du logo pour les boutons',()=>{
    const [first]=proposalsFrom('#a04c34','#e0b155');
    expect(first.style.button).toBe('#a04c34');
    expect(first.style.icon).toBe('#ffffff');            // pictogramme lisible sur un fond foncé
    expect(first.style.background).not.toBe(first.style.button);
  });
  it('un logo clair donne un pictogramme foncé',()=>{
    const [first]=proposalsFrom('#f2d16b','#345c95');
    expect(first.style.icon).toBe('#1b1b1f');
  });
});
