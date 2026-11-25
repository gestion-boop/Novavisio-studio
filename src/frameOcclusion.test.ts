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
