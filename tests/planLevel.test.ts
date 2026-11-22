import {describe,expect,it} from 'vitest';
import {plansByLevel,planLevelLabel} from '../src/storage';
describe('étages des plans',()=>{
  it('trie du plus bas au plus haut, sans étage à la fin',()=>{
    const out=plansByLevel([{id:'a'},{id:'b',level:1},{id:'c',level:0},{id:'d',level:-1}] as any);
    expect(out.map((p:any)=>p.id)).toEqual(['d','c','b','a']);
  });
  it('libellés',()=>{
    expect(planLevelLabel({level:0},0)).toBe('RDC');
    expect(planLevelLabel({level:2},0)).toBe('2');
    expect(planLevelLabel({level:-1},0)).toBe('S1');
    expect(planLevelLabel({},3)).toBe('4');
  });
});
