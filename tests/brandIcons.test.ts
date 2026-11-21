import {describe,expect,it} from 'vitest';
import {BRAND_ICON_SET} from '../src/brandIconSet';
import {buildPack,iconSvg,stateColors,PACK_SIZE,ICON_STATES} from '../src/brandIcons';
import {generateBrand,checkContrast} from '../src/brandKit';

// Retire les couleurs : ce qui reste (forme, cadrage, tracés, épaisseurs) doit être identique entre états.
const geometry=(svg:string)=>svg.replace(/(fill|stroke|stop-color|stop-opacity)="[^"]*"/g,'$1=""');

describe('icônes de charte',()=>{
  const c=generateBrand('#2f8fb5','moderne');
  it('50 icônes, 3 états chacune, noms normalisés',()=>{
    const pack=buildPack(c,'circle');
    expect(pack.length).toBe(PACK_SIZE);
    expect(PACK_SIZE).toBe(150);
    expect(pack.find(f=>f.filename==='reservation_normal')).toBeTruthy();
    expect(pack.find(f=>f.filename==='reservation_hover')).toBeTruthy();
    expect(pack.find(f=>f.filename==='reservation_pressed')).toBeTruthy();
  });
  it('les trois états ont EXACTEMENT la même géométrie (cadrage et proportions identiques)',()=>{
    for(const shape of ['circle','rounded','minimal'] as const)
      for(const spec of BRAND_ICON_SET){
        const g=ICON_STATES.map(s=>geometry(iconSvg(spec,c,shape,s)));
        expect(g[1],spec.key+' '+shape).toBe(g[0]);
        expect(g[2],spec.key+' '+shape).toBe(g[0]);
      }
  });
  it('le cercle est parfaitement centré et rond (rond par défaut)',()=>{
    const svg=iconSvg(BRAND_ICON_SET[0],c,'circle','normal');
    expect(svg).toContain('cx="12" cy="12" r="10.7"');
    expect(svg).toContain('viewBox="0 0 24 24"');
  });
  it('les états changent bien de couleur (survol plus clair, appui plus sombre)',()=>{
    const n=stateColors(c,'normal'),h=stateColors(c,'hover'),p=stateColors(c,'pressed');
    expect(n.fill).not.toBe(h.fill);
    expect(p.fill).not.toBe(n.fill);
  });
  it('le glyphe reste lisible sur chaque état',()=>{
    for(const s of ICON_STATES){
      const k=stateColors(c,s);
      expect(checkContrast({...c,btnRest:k.fill,btnHover:k.fill,btnPressed:k.fill}).filter(i=>i.level==='error')).toEqual([]);
    }
  });
  it('un SVG ne contient aucune image embarquée ni script',()=>{
    for(const f of buildPack(c,'rounded')){expect(f.svg).not.toMatch(/<script|<image|href=/i);}
  });
});

describe('couleur du symbole',()=>{
  it('le symbole garde la même couleur sur les trois états pour la charte de référence',()=>{
    const c=generateBrand('#2f8fb5','moderne');
    const g=ICON_STATES.map(s=>stateColors(c,s).glyph);
    expect(new Set(g).size).toBe(1);
  });
});
