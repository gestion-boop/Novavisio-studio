import {describe,expect,it} from 'vitest';
import {STYLES,generateBrand,checkContrast,contrastRatio,readableOn,toBarPatch,isHex,hexToHsl,hslToHex} from '../src/brandKit';

describe('charte graphique (logique pure)',()=>{
  it('contraste WCAG exact : noir/blanc = 21',()=>{
    expect(contrastRatio('#000000','#ffffff')).toBeCloseTo(21,1);
    expect(contrastRatio('#777777','#777777')).toBeCloseTo(1,5);
  });
  it('readableOn choisit le texte le plus lisible',()=>{
    expect(readableOn('#0b1826')).toBe('#ffffff');
    expect(readableOn('#f5f0e6')).toBe('#111111');
  });
  it('hsl ↔ hex aller-retour stable',()=>{
    for(const hex of ['#2f8fb5','#c0392b','#16a085']){
      const [h,s,l]=hexToHsl(hex);
      expect(hslToHex(h,s,l).toLowerCase()).toBe(hex);
    }
  });
  it('chaque style produit dix couleurs HEX valides',()=>{
    for(const s of STYLES){
      const c=generateBrand('#2f8fb5',s.id);
      for(const v of Object.values(c)) expect(isHex(v)).toBe(true);
    }
  });
  it('génération déterministe',()=>{
    expect(generateBrand('#2f8fb5','luxe')).toEqual(generateBrand('#2f8fb5','luxe'));
  });
  it('une couleur de départ invalide retombe sur la valeur par défaut',()=>{
    expect(generateBrand('pas-une-couleur','moderne')).toEqual(generateBrand('#2f8fb5','moderne'));
  });
  it('les textes et boutons de chaque style passent le contrôle AA',()=>{
    for(const s of STYLES){
      const errors=checkContrast(generateBrand('#2f8fb5',s.id)).filter(i=>i.level==='error');
      expect(errors,s.id).toEqual([]);
    }
  });
  it('détecte un texte illisible sur fond proche',()=>{
    const c=generateBrand('#2f8fb5','classique');
    const bad={...c,text:'#f0f0f0',background:'#f4f4f4'};
    expect(checkContrast(bad).some(i=>i.level==='error')).toBe(true);
  });
  it('toBarPatch ne renvoie que les réglages de couleur de la barre',()=>{
    const p=toBarPatch(generateBrand('#2f8fb5','mediterraneen'));
    expect(Object.keys(p).sort()).toEqual(['background','button','buttonOutline','dayNightColor','icon','outline']);
  });
});
