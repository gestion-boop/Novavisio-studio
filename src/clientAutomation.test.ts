import {describe,expect,it} from 'vitest';
import {agentFullName,diallable,withClientAutomation} from './clientAutomation';
import {emptyClientProfile,newProject,type BottomBarItem,type StudioProject} from './storage';

const call=(over:Partial<BottomBarItem>={}):BottomBarItem=>({id:'b1',title:'Appeler',type:'information',target:'',text:'',url:'',...over} as BottomBarItem);
const base=(client:Partial<ReturnType<typeof emptyClientProfile>>&Record<string,string>,bar:BottomBarItem[]):StudioProject=>({...newProject(),bottomBar:bar,clientProfile:{...emptyClientProfile(),...client}});

describe('withClientAutomation',()=>{
  it('reporte le téléphone direct de l’agent sur le bouton Appeler',()=>{
    const out=withClientAutomation(base({phone:'04 68 00 00 00',agentPhone:'06 12 34 56 78'},[call()]));
    expect(out.bottomBar[0].url).toBe('tel:0612345678');
    expect(out.bottomBar[0].type).toBe('lien');
  });
  it('utilise le téléphone de la fiche sans numéro d’agent',()=>{
    expect(withClientAutomation(base({phone:'04 68 00 00 00'},[call()])).bottomBar[0].url).toBe('tel:0468000000');
  });
  it('met à jour un ancien numéro tel: mais respecte un lien personnalisé',()=>{
    const old=withClientAutomation(base({agentPhone:'0600000002'},[call({type:'lien',url:'tel:0600000001'})]));
    expect(old.bottomBar[0].url).toBe('tel:0600000002');
    const custom=base({agentPhone:'0600000002'},[call({type:'lien',url:'https://exemple.fr/contact'})]);
    expect(withClientAutomation(custom).bottomBar[0].url).toBe('https://exemple.fr/contact');
  });
  it('ne touche pas aux boutons qui ne sont pas des appels',()=>{
    const photos=call({title:'Photos'});
    expect(withClientAutomation(base({agentPhone:'0600000002'},[photos])).bottomBar[0]).toBe(photos);
  });
  it('reporte l’intro seulement si la visite n’en a pas',()=>{
    const p=base({introUrl:'https://intro.exemple.fr/x'},[]);
    const out=withClientAutomation(p);
    expect(out.introUrl).toBe('https://intro.exemple.fr/x');expect(out.introEnabled).toBe(true);
    expect(withClientAutomation({...p,introUrl:'https://deja.fr/a'}).introUrl).toBe('https://deja.fr/a');
    expect(withClientAutomation(base({introUrl:'http://pas-https.fr'},[])).introUrl).toBe('');
  });
  it('est idempotente',()=>{
    const once=withClientAutomation(base({agentPhone:'0612345678'},[call()]));
    expect(withClientAutomation(once)).toBe(once);
  });
  it('formate le nom et le numéro',()=>{
    expect(agentFullName({...emptyClientProfile(),agentFirstName:' Sylvain ',agentLastName:'Grazia'})).toBe('Sylvain Grazia');
    expect(diallable('+33 (0)6.12-34')).toBe('+33061234');
  });
});
