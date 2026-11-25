import {describe,expect,it} from 'vitest';
import {dirOf,spherical,framePlane,planeCoords} from './frameOcclusion';
import type {Hotspot} from './storage';

const frame=(over:Partial<Hotspot>={}):Hotspot=>({id:'f',type:'video',title:'Télé',text:'',target:'',yaw:0.3,pitch:0.1,
  frameSphericalCorners:[{yaw:0.2,pitch:0.2},{yaw:0.45,pitch:0.2},{yaw:0.45,pitch:0.02},{yaw:0.2,pitch:0.02}],...over} as Hotspot);
describe('détourage : géométrie',()=>{
  it('yaw/pitch → vecteur → yaw/pitch revient au point de départ',()=>{
    for(const [y,p] of [[0.3,0.1],[4.2,-0.5],[6.0,0.9],[1.5,0]]){
      const s=spherical(dirOf(y,p));expect(s.yaw).toBeCloseTo(y,6);expect(s.pitch).toBeCloseTo(p,6);
    }
  });
  it('le plan du cadre est calculé et un point du cadre retombe dans [0,1]²',()=>{
    const f=frame(),plane=framePlane(f);expect(plane).not.toBeNull();
    const centre=planeCoords(plane!,dirOf(0.325,0.11));
    expect(centre).not.toBeNull();
    expect(centre![0]).toBeGreaterThan(0.3);expect(centre![0]).toBeLessThan(0.7);
    expect(centre![1]).toBeGreaterThan(0.3);expect(centre![1]).toBeLessThan(0.7);
  });
  it('un point hors du cadre sort de [0,1]²',()=>{
    const plane=framePlane(frame())!;
    const uv=planeCoords(plane,dirOf(0.9,0.5))!;
    expect(uv[0]>1||uv[1]<0||uv[0]<0||uv[1]>1).toBe(true);
  });
  it('un rayon vers l’arrière ne coupe pas le cadre',()=>{
    expect(planeCoords(framePlane(frame())!,dirOf(0.325+Math.PI,0.11))).toBeNull();
  });
});

import {fitCornersToAspect} from './frameOcclusion';
describe('remise au format réel',()=>{
  const squeezed=frame();   // cadre 0,25 rad de large pour 0,18 de haut ≈ 1,4 : 1
  const ratioOf=(c:{yaw:number;pitch:number}[])=>{const h=frame({frameSphericalCorners:c as never});const p=framePlane(h)!;return p.ratio;};
  it('donne exactement le format demandé, en gardant le bord gauche',()=>{
    const c=fitCornersToAspect(squeezed,16/9,'left')!;
    expect(ratioOf(c)).toBeCloseTo(16/9,3);
    expect(c[0].yaw).toBeCloseTo(0.2,6);expect(c[0].pitch).toBeCloseTo(0.2,6);   // coin haut-gauche inchangé
    expect(c[3].pitch).toBeCloseTo(0.02,6);                                     // bas-gauche inchangé : même hauteur
  });
  it('garde le bord droit quand on le demande',()=>{
    const c=fitCornersToAspect(squeezed,16/9,'right')!;
    expect(ratioOf(c)).toBeCloseTo(16/9,3);
    expect(c[1].yaw).toBeCloseTo(0.45,6);expect(c[1].pitch).toBeCloseTo(0.2,6);   // coin haut-droit inchangé
  });
  it('refuse un format invalide',()=>{expect(fitCornersToAspect(squeezed,0,'left')).toBeNull();});
});
