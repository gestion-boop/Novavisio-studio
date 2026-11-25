import {describe,expect,it} from 'vitest';
import {normalizeGrade,SOFTER_GRADE,ZERO_GRADE} from './photoGrade';

describe('retouche de la photo du panorama',()=>{
  it('ne retient rien quand tous les réglages sont à 0',()=>{
    expect(normalizeGrade(ZERO_GRADE)).toBeNull();
    expect(normalizeGrade(undefined)).toBeNull();
    expect(normalizeGrade({})).toBeNull();
  });
  it('borne et arrondit les valeurs',()=>{
    expect(normalizeGrade({exposure:250.6,contrast:-999})).toEqual({...ZERO_GRADE,exposure:100,contrast:-100});
    expect(normalizeGrade({exposure:-9.6})).toEqual({...ZERO_GRADE,exposure:-10});
  });
  it('le réglage « moins hôpital » est −10 / −10 / −10',()=>{
    expect(normalizeGrade(SOFTER_GRADE)).toEqual({...ZERO_GRADE,exposure:-10,temperature:-10,highlights:-10});
  });
});
