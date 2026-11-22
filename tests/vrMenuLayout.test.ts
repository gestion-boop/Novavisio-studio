import {describe,expect,it} from 'vitest';
import {layoutColumns,vrMenuOf} from '../src/vrMenu';

describe('interface du casque : colonnes alignées',()=>{
  it('la ligne n de gauche est à la même hauteur que la ligne n de droite',()=>{
    const g=layoutColumns(['a','b','c','d'],['e','f','g','h']);
    g.left.forEach((s,i)=>expect(s.y).toBeCloseTo(g.right[i].y));
    expect(g.left[0].x).toBeCloseTo(-g.right[0].x);
  });
  it('les cases vides gardent l’alignement et le bloc reste centré',()=>{
    const g=layoutColumns(['a','b','c'],['','e','f']);
    expect(g.right[0].y).toBeCloseTo(g.left[1].y);
    expect(g.left[0].y).toBeCloseTo(-g.left[2].y);
  });
  it('lignes vides en haut des deux colonnes : le bloc utilisé est recentré',()=>{
    const g=layoutColumns(['','a','b'],['','c','d']);
    expect(g.left[0].y).toBeCloseTo(-g.left[1].y);
  });
  it('actions inconnues ou en double deviennent des cases vides',()=>{
    const m=vrMenuOf({bottomBar:[],vrMenu:{left:['gallery','zzz','up'],right:['gallery','sound','']}});
    expect(m.left).toEqual(['gallery','','up']);
    expect(m.right).toEqual(['','sound']);
  });
});
