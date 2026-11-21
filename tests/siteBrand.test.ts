import {describe,expect,it} from 'vitest';
import {analyzeSiteBrand,extractColors,extractFonts,extractThemeColor,isUsefulColor,normalizeHex,proposeBrand} from '../src/siteBrand';

describe('analyse de l’identité du site',()=>{
  it('normalise les couleurs courtes et longues',()=>{
    expect(normalizeHex('#ABC')).toBe('#aabbcc');
    expect(normalizeHex('#12ABef')).toBe('#12abef');
    expect(normalizeHex('rouge')).toBe('');
  });
  it('écarte les gris, blancs et noirs',()=>{
    expect(isUsefulColor('#ffffff')).toBe(false);
    expect(isUsefulColor('#000000')).toBe(false);
    expect(isUsefulColor('#888888')).toBe(false);
    expect(isUsefulColor('#2b899d')).toBe(true);
  });
  it('classe les couleurs par fréquence',()=>{
    const css='a{color:#2b899d}b{background:#2b899d}c{color:#c9973a}';
    const c=extractColors(css);
    expect(c[0].hex).toBe('#2b899d');
    expect(c[0].count).toBe(2);
    expect(c[0].source).toBe('css');
  });
  it('lit la couleur de thème déclarée',()=>{
    const html='<meta name="theme-color" content="#125c68">';
    expect(extractThemeColor(html)).toBe('#125c68');
  });
  it('détecte les polices Google et CSS, sans les génériques',()=>{
    const html='<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400&family=Lato">';
    const css='body{font-family:"Montserrat", sans-serif} h1{font-family:serif}';
    const names=extractFonts(html,css).map(f=>f.name);
    expect(names).toContain('Playfair Display');
    expect(names).toContain('Lato');
    expect(names).toContain('Montserrat');
    expect(names).not.toContain('serif');
    expect(names).not.toContain('sans-serif');
  });
  it('place la couleur de thème en tête',()=>{
    const r=analyzeSiteBrand('<meta name="theme-color" content="#125c68">','a{color:#c9973a}');
    expect(r.colors[0].hex).toBe('#125c68');
    expect(r.colors[0].source).toBe('theme-color');
  });
  it('sans couleur exploitable : proposition générée, marquée comme telle',()=>{
    const r=proposeBrand(analyzeSiteBrand('<p>rien</p>',''),'luxe','#c9973a');
    expect(r.origin).toBe('proposition');
    expect(r.seed).toBe('#c9973a');
    expect(isUsefulColor(r.colors.primary)).toBe(true);
  });
  it('avec couleurs trouvées : la charte part de la couleur du site',()=>{
    const r=proposeBrand(analyzeSiteBrand('','a{color:#2b899d}'),'moderne','#c9973a');
    expect(r.origin).toBe('site');
    expect(r.seed).toBe('#2b899d');
  });
});
