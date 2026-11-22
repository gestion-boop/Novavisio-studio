import {describe,expect,it} from 'vitest';
import {floodRoom} from '../src/planRooms';
/** Plan synthétique 100×80 : fond blanc, deux pièces (beige / rose) entourées de murs foncés. */
function plan(){
  const w=100,h=80,d=new Uint8ClampedArray(w*h*4);
  const set=(x:number,y:number,c:number[])=>{const i=(y*w+x)*4;d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=255;};
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)set(x,y,[255,255,255]);
  for(let y=10;y<=60;y++)for(let x=10;x<=80;x++){
    const wall=y===10||y===60||x===10||x===80||x===45;
    set(x,y,wall?[25,30,40]:x<45?[236,226,200]:[235,205,190]);
  }
  return {d,w,h};
}
describe('détection de pièce',()=>{
  it('remplit la pièce du repère sans déborder sur la voisine',()=>{
    const {d,w,h}=plan();
    const m=floodRoom(d,w,h,25,35)!;
    expect(m).toBeTruthy();
    expect(m[35*w+25]).toBe(1);
    expect(m[35*w+60]).toBe(0);
    expect(m[5*w+5]).toBe(0);
  });
  it('repère sur un mur : cherche le sol voisin',()=>{
    const {d,w,h}=plan();
    const m=floodRoom(d,w,h,45,35)!;
    expect(m).toBeTruthy();
  });
  it('fond blanc (zone qui fuit) : pas de surbrillance',()=>{
    const {d,w,h}=plan();
    expect(floodRoom(d,w,h,5,5)).toBeNull();
  });
});

import {floodRooms} from '../src/planRooms';
describe('pièces reliées par une porte',()=>{
  it('chaque repère garde sa pièce, la frontière tombe à la porte',()=>{
    // Deux pièces de même couleur séparées par un mur percé d'une porte (ouverture de 14 px).
    const w=300,h=200,d=new Uint8ClampedArray(w*h*4);
    const set=(x:number,y:number,c:number[])=>{const i=(y*w+x)*4;d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=255;};
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)set(x,y,[255,255,255]);
    for(let y=10;y<=70;y++)for(let x=10;x<=130;x++){
      const wall=y===10||y===70||x===10||x===130||(x===70&&(y<30||y>44));
      set(x,y,wall?[25,30,40]:[236,226,200]);
    }
    const out=floodRooms(d,w,h,[{id:'a',x:40,y:40},{id:'b',x:100,y:40}]);
    expect(out.a&&out.b).toBeTruthy();
    expect(out.a![40*w+40]).toBe(1);
    expect(out.a![40*w+100]).toBe(0);
    expect(out.b![40*w+100]).toBe(1);
    expect(out.b![40*w+40]).toBe(0);
    expect(out.a![20*w+60]).toBe(1); // proche de la porte, côté gauche
    expect(out.b![20*w+80]).toBe(1);
  });
});
