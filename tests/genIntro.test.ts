import {describe,expect,it} from 'vitest';
// @ts-expect-error script .mjs sans types
import {buildIntro} from '../scripts/gen-intro.mjs';

const cfg={slug:'exemple',name:'Exemple',accent:'#c9973a',fr:{title:'Bienvenue chez Exemple',tagline:'Massage · Narbonne',label:'Visite immersive'}};
describe('générateur d’intro',()=>{
  it('produit une page complète, sans champ non remplacé',()=>{
    const html=buildIntro(cfg);
    expect(html).toContain('Bienvenue chez Exemple');
    expect(html).not.toMatch(/\{\{|undefined|NaN/);
    expect(html).toContain('<html lang="fr">');
  });
  it('couleur d’accent invalide = couleur par défaut',()=>{
    expect(buildIntro({...cfg,accent:'rouge'})).toContain('#c9973a');
  });
  it('échappe le contenu saisi (pas d’injection HTML)',()=>{
    const html=buildIntro({...cfg,fr:{title:'<img src=x onerror=alert(1)>',tagline:'a',label:'b'}});
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x');
  });
  it('langue manquante = repli sur le français',()=>{
    const html=buildIntro(cfg);
    expect(html).toContain('"de":["Bienvenue chez Exemple"');
  });
  it('slug invalide refusé',()=>{
    expect(()=>buildIntro({...cfg,slug:'../x'})).toThrow();
  });
  it('la langue française est obligatoire',()=>{
    expect(()=>buildIntro({slug:'ok',name:'Ok'})).toThrow();
  });
});
