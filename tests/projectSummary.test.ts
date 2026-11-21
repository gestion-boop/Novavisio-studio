import {describe,expect,it} from 'vitest';
import {summarizeProject} from '../src/projectSummary';

const base:any={name:'Test',scenes:[{id:'a',name:'Accueil',hotspots:[]}],icons:[],bottomBar:[],languages:['fr']};
const find=(lines:any[],id:string)=>lines.find(l=>l.id===id);
describe('synthèse avant application',()=>{
  it('ne modifie jamais le projet (lecture seule)',()=>{
    const before=JSON.stringify(base);summarizeProject(base);expect(JSON.stringify(base)).toBe(before);
  });
  it('signale une charte absente et un brouillon non validé',()=>{
    expect(find(summarizeProject(base),'charte').state).toBe('todo');
    expect(find(summarizeProject({...base,brandKit:{styleId:'luxe',colors:{},validated:false}}),'charte').state).toBe('todo');
    expect(find(summarizeProject({...base,brandKit:{styleId:'luxe',colors:{},validated:true}}),'charte').state).toBe('ok');
  });
  it('signale un panorama sans aucune flèche (impasse)',()=>{
    expect(find(summarizeProject(base),'navigation').state).toBe('todo');
  });
  it('localisation : adresse vague = à faire, adresse précise = ok',()=>{
    expect(find(summarizeProject({...base,interestInfo:{address:'Narbonne'}}),'localisation').state).toBe('todo');
    expect(find(summarizeProject({...base,interestInfo:{address:'12 rue de la Paix 11100 Narbonne'}}),'localisation').state).toBe('ok');
  });
  it('traductions : compte les manques et signale l’italien (pas encore de champ)',()=>{
    const p={...base,languages:['fr','en','it'],bottomBar:[{id:'b',title:'Carte',titleTranslations:{}}]};
    const t=find(summarizeProject(p),'traductions');
    expect(t.state).toBe('todo');
    expect(t.detail).toContain('Langue sans champ de traduction : it');
  });
  it('tout en ordre quand chaque élément est prêt',()=>{
    const p={...base,languages:['fr','en'],bottomBar:[{id:'b',title:'Carte',titleTranslations:{en:'Map'}}],
      scenes:[{id:'a',name:'Accueil',nameTranslations:{en:'Entrance'},hotspots:[{type:'navigation',target:'b'}]},{id:'b',name:'B',nameTranslations:{en:'B'},hotspots:[{type:'navigation',target:'a'}]}],
      icons:[{id:'i',name:'x',dataUrl:'data:image/png;base64,AA=='}],clientProfile:{name:'Figurotta'},vrEnabled:true,translationsValidated:true};
    const lines=summarizeProject(p);
    expect(find(lines,'traductions').state).toBe('ok');
    expect(find(lines,'navigation').state).toBe('ok');
    expect(find(lines,'identite').state).toBe('ok');
  });
  it('des traductions complètes mais non validées restent à relire',()=>{
    const p={...base,languages:['fr','en'],bottomBar:[{id:'b',title:'Carte',titleTranslations:{en:'Map'}}],scenes:[{id:'a',name:'Accueil',nameTranslations:{en:'Entrance'},hotspots:[]}]};
    const t=find(summarizeProject(p),'traductions');
    expect(t.state).toBe('todo');
    expect(t.detail).toContain('à relire');
  });
});
