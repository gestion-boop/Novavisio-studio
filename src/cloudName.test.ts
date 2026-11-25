import {describe,expect,it} from 'vitest';
import {sameProjectName} from './cloud';

describe('garde-fou : même projet ?',()=>{
  it('ignore la casse, les accents et les espaces multiples',()=>{
    expect(sameProjectName('Camping Figurotta','  camping   FIGUROTTA ')).toBe(true);
    expect(sameProjectName('Cabane enchantée','CABANE ENCHANTEE')).toBe(true);
  });
  it('détecte deux projets différents (l’incident du 25 novembre)',()=>{
    expect(sameProjectName('Camping Figurotta','Au Bureau Narbonne')).toBe(false);
    expect(sameProjectName('Camping Figurotta','Camping Figurotta - Tipi Indien')).toBe(false);
  });
});
