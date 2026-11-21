import {describe,expect,it} from 'vitest';
import {INTEREST_CATEGORIES,templatesFor,buildSuggestions,isPublishable,type Suggestion} from '../src/interestPoints';
import {BRAND_ICON_SET} from '../src/brandIconSet';

const iconKeys=new Set(BRAND_ICON_SET.map(i=>i.key));
describe('points d’information (sans IA)',()=>{
  it('chaque catégorie a des modèles, et chaque icône existe dans le pack',()=>{
    for(const c of INTEREST_CATEGORIES){
      const t=templatesFor(c.id);
      expect(t.length,c.id).toBeGreaterThan(0);
      for(const x of t) expect(iconKeys.has(x.icon),c.id+' '+x.icon).toBe(true);
    }
  });
  it('sans information vérifiée, aucun point lié à une donnée n’est proposé',()=>{
    const {ready,missing}=buildSuggestions('restaurant',{});
    expect(ready.find(s=>s.key==='reservation')).toBeUndefined();
    expect(ready.find(s=>s.key==='carte')).toBeUndefined();
    expect(missing.find(m=>m.key==='carte')?.needs).toEqual(['menuUrl']);
  });
  it('avec une information vérifiée, le point devient prêt',()=>{
    const {ready}=buildSuggestions('restaurant',{bookingUrl:'https://exemple.fr/resa'});
    expect(ready.some(s=>s.key==='reservation')).toBe(true);
  });
  it('aucun texte inventé : les points sans données n’ont pas de contenu, seulement un libellé générique',()=>{
    const {ready}=buildSuggestions('spa',{});
    for(const s of ready) expect(Object.keys(s).sort()).toEqual(['icon','id','kind','key','status','title']);
  });
  it('un point ne peut être publié qu’après confirmation',()=>{
    const s:Suggestion={id:'x',key:'x',title:'x',kind:'text',icon:'accueil',status:'proposed'};
    expect(isPublishable(s)).toBe(false);
    expect(isPublishable({...s,status:'rejected'})).toBe(false);
    expect(isPublishable({...s,status:'confirmed'})).toBe(true);
  });
  it('une catégorie inconnue retombe sur « Autre »',()=>{
    expect(templatesFor('inconnue' as never)).toEqual(templatesFor('autre'));
  });
  it('une valeur vide ou une liste vide ne compte pas comme vérifiée',()=>{
    const {missing}=buildSuggestions('hotel',{phone:'   ',services:[]});
    expect(missing.find(m=>m.key==='telephone')).toBeTruthy();
  });
});
