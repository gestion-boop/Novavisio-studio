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
