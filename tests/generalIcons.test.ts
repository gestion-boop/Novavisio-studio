import {describe,expect,it} from 'vitest';
import {GENERAL_ICONS,GENERAL_ICON_GROUPS} from '../src/generalIconCatalog';
import {DEFAULT_GENERAL_ICON,readGeneralIconDesign} from '../src/generalIconDesign';

describe('bibliothèque générale',()=>{
  it('fournit des pictogrammes uniques pour les neuf catégories',()=>{
    expect(GENERAL_ICON_GROUPS).toHaveLength(9);
    expect(GENERAL_ICONS.length).toBeGreaterThanOrEqual(100);
    expect(new Set(GENERAL_ICONS.map(icon=>icon.label)).size).toBe(GENERAL_ICONS.length);
  });

  it('accepte le brillant et le plat sur des formes rondes et carrées',()=>{
    for(const shape of ['round','square']){
      for(const finish of ['glossy','matte']){
        const design={...DEFAULT_GENERAL_ICON,shape,finish};
        expect(readGeneralIconDesign(design)).toEqual(design);
      }
    }
    expect(readGeneralIconDesign({...DEFAULT_GENERAL_ICON,motif:'inconnu'})).toBeNull();
    expect(readGeneralIconDesign({...DEFAULT_GENERAL_ICON,foreground:'red'})).toBeNull();
  });
});
