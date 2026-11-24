import {describe,expect,it} from 'vitest';
import {gradeCurve,gradeOf,gradeSaturation,interiorLifted,RECOMMENDED_GRADE,type InteriorGrade} from './interiorLight';

const zero:InteriorGrade={exposure:0,saturation:0,vibrance:0,temperature:0,contrast:0,highlights:0};
describe('retouche des intérieurs',()=>{
  it('ne change rien quand tous les réglages sont à 0',()=>{
    for(const c of ['r','g','b'] as const)for(const x of [0,.25,.5,.75,1])expect(gradeCurve(zero,c,x)).toBeCloseTo(x,6);
    expect(gradeSaturation(zero)).toBe(1);
    expect(gradeOf({interiorGrade:zero})).toBeNull();
  });
  it('assombrit avec une exposition négative et baisse les points forts',()=>{
    const g=RECOMMENDED_GRADE;
    expect(gradeCurve(g,'g',0.5)).toBeLessThan(0.5);
    expect(gradeCurve(g,'g',1)).toBeLessThan(1);               // les blancs sont adoucis
    expect(gradeCurve(g,'g',0)).toBe(0);                        // le noir reste noir
    expect(gradeCurve(g,'g',1)-gradeCurve(g,'g',0.9)).toBeGreaterThan(0); // la courbe reste croissante
  });
  it('température négative = plus froid (moins de rouge, plus de bleu)',()=>{
    const g={...zero,temperature:-10};
    expect(gradeCurve(g,'r',0.5)).toBeLessThan(0.5);
    expect(gradeCurve(g,'b',0.5)).toBeGreaterThan(0.5);
    expect(gradeCurve(g,'g',0.5)).toBeCloseTo(0.5,6);
  });
  it('la saturation et la vibrance se combinent',()=>{
    expect(gradeSaturation({...zero,saturation:-20})).toBeCloseTo(0.8,6);
    expect(gradeSaturation({...zero,vibrance:20})).toBeCloseTo(1.1,6);
  });
  it('n’agit que sur les panoramas marqués intérieur',()=>{
    const project={interiorGrade:RECOMMENDED_GRADE};
    expect(interiorLifted(project,{interior:true})).toBe(true);
    expect(interiorLifted(project,{interior:undefined})).toBe(false);
    expect(interiorLifted({interiorGrade:undefined},{interior:true})).toBe(false);
  });
});
