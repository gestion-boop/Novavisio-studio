import {describe,expect,it} from 'vitest';
import {INTRO_STYLES,INTRO_ANIMATIONS,DEFAULT_INTRO_DESIGN,validateIntroDesign,nativeIntroActive,introDurationSec,INTRO_LIMITS} from '../src/introDesign';

const ok={...DEFAULT_INTRO_DESIGN,enabled:true,title:'Ariya',subtitle:'Bien-être',styleId:'luxe' as const};
describe('introduction native (logique pure)',()=>{
  it('7 styles, libellés non vides',()=>{
    expect(INTRO_STYLES.length).toBe(7);
    for(const s of INTRO_STYLES) expect(s.label.length).toBeGreaterThan(0);
  });
  it('accepte une introduction valide',()=>{
    expect(validateIntroDesign(ok).title).toBe('Ariya');
  });
  it('conserve les animations historiques et valide les nouvelles entrées',()=>{
    for(const id of ['fade','zoom','slide','iris','curtain','sweep']){
      expect(INTRO_ANIMATIONS.some(animation=>animation.id===id)).toBe(true);
      expect(validateIntroDesign({...ok,animation:id}).animation).toBe(id);
    }
  });
  it('refuse un style, une animation ou une longueur hors limites',()=>{
    expect(()=>validateIntroDesign({...ok,styleId:'inconnu'})).toThrow();
    expect(()=>validateIntroDesign({...ok,animation:'explosion'})).toThrow();
    expect(()=>validateIntroDesign({...ok,title:'x'.repeat(INTRO_LIMITS.title+1)})).toThrow();
  });
  it('refuse un logo non image ou trop lourd',()=>{
    expect(()=>validateIntroDesign({...ok,logoDataUrl:'data:text/html;base64,AAAA'})).toThrow();
    expect(()=>validateIntroDesign({...ok,logoDataUrl:'data:image/png;base64,'+'A'.repeat(INTRO_LIMITS.logoChars)})).toThrow();
    expect(()=>validateIntroDesign({...ok,logoDataUrl:'data:image/png;base64,iVBORw0KGgo='})).not.toThrow();
  });
  it('une URL externe existante reste prioritaire',()=>{
    expect(nativeIntroActive({introUrl:'https://intro.exemple.fr/',introDesign:ok})).toBe(false);
    expect(nativeIntroActive({introUrl:'',introDesign:ok})).toBe(true);
    expect(nativeIntroActive({introUrl:'',introDesign:{...ok,enabled:false}})).toBe(false);
    expect(nativeIntroActive({introUrl:''})).toBe(false);
  });
  it('durée bornée : 2 à 60 s, 6 s par défaut',()=>{
    expect(introDurationSec({})).toBe(6);
    expect(introDurationSec({introDuration:1})).toBe(2);
    expect(introDurationSec({introDuration:500})).toBe(60);
    expect(introDurationSec({introDuration:NaN})).toBe(6);
  });
});
