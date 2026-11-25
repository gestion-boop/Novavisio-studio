import {describe,expect,it} from 'vitest';
import {displayPitch} from './returnLink';
import type {Hotspot} from './storage';

const nav=(over:Partial<Hotspot>):Hotspot=>({id:'x',type:'navigation',title:'Aller vers Salle',text:'',target:'s2',yaw:0,pitch:-0.2,...over} as Hotspot);
describe('hauteur affichée d’une flèche de retour',()=>{
  const forward=nav({id:'f',pitch:-0.3});
  it('est abaissée près d’une flèche d’avancée',()=>{
    const back=nav({id:'b',title:'Retour vers Salle',yaw:0.1,pitch:-0.1});
    expect(displayPitch(back,[forward,back])).toBeLessThan(-0.3);
  });
  it('garde exactement sa hauteur quand l’utilisateur l’a placée (pitchFixed)',()=>{
    const back=nav({id:'b',title:'Retour vers Salle',yaw:0.1,pitch:-0.1,pitchFixed:true});
    expect(displayPitch(back,[forward,back])).toBe(-0.1);
  });
  it('ne touche jamais aux flèches d’avancée',()=>{
    expect(displayPitch(forward,[forward])).toBe(-0.3);
  });
});
