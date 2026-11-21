import {glyphPng} from './barGlossy';
import type {IconSetImages} from './IconSetCreator';
import type {ComponentType} from 'react';
import {GENERAL_ICONS} from './generalIconCatalog';

export type GeneralIconDesign={
  motif:string;shape:'round'|'rounded'|'square';finish:'matte'|'glossy'|'clear';
  background:string;outline:string;foreground:string;
};
export const DEFAULT_GENERAL_ICON:GeneralIconDesign={
  motif:'Accueil',shape:'round',finish:'glossy',background:'#224a95',outline:'#accedc',foreground:'#ffffff',
};

export function readGeneralIconDesign(raw:unknown):GeneralIconDesign|null{
  if(!raw||typeof raw!=='object')return null;
  const d=raw as GeneralIconDesign;
  if(!GENERAL_ICONS.some(icon=>icon.label===d.motif)||
    !['round','rounded','square'].includes(d.shape)||
    !['matte','glossy','clear'].includes(d.finish)||
    ![d.background,d.outline,d.foreground].every(value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)))return null;
  return d;
}

export async function renderGeneralIcon(design:GeneralIconDesign):Promise<IconSetImages>{
  const Glyph=GENERAL_ICONS.find(icon=>icon.label===design.motif)?.Glyph;
  if(!Glyph)throw Error('Pictogramme introuvable.');
  const png=await glyphPng(Glyph as unknown as ComponentType<Record<string,unknown>>,design.foreground);
  const image=new Image();
  image.src=png;
  await image.decode();
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw Error('Impossible de dessiner l’icône.');
  function draw(state:'normal'|'hover'|'pressed'){
    if(!ctx)throw Error('Impossible de dessiner l’icône.');
    const hovered=state==='hover',pressed=state==='pressed';
    const offset=pressed?8:0;
    const radius=design.shape==='round'?231:design.shape==='rounded'?85:4;
    ctx.clearRect(0,0,512,512);
    if(design.finish!=='clear'){
      ctx.beginPath();ctx.roundRect(25,25+offset,462,462,radius);
      ctx.fillStyle=design.background;ctx.fill();
      ctx.save();ctx.clip();
      if(design.finish==='glossy'){
        const gradient=ctx.createLinearGradient(50,30,440,475);
        gradient.addColorStop(0,'rgba(255,255,255,.43)');
        gradient.addColorStop(.48,'rgba(255,255,255,0)');
        gradient.addColorStop(1,'rgba(0,0,0,.46)');
        ctx.fillStyle=gradient;ctx.fillRect(25,25+offset,462,462);
        const sheen=ctx.createLinearGradient(0,32+offset,0,265+offset);
        sheen.addColorStop(0,'rgba(255,255,255,.65)');
        sheen.addColorStop(1,'rgba(255,255,255,0)');
        // Reflet doux sans ellipse : l'ancien tracé créait un arc parasite
        // visible en haut des pictogrammes sur toute la bibliothèque.
        ctx.fillStyle=sheen;
        ctx.fillRect(25,25+offset,462,235);
      }
      if(state!=='normal'){
        ctx.fillStyle=hovered?'rgba(255,255,255,.16)':'rgba(0,0,0,.22)';
        ctx.fillRect(25,25+offset,462,462);
      }
      ctx.restore();
      ctx.lineWidth=12;ctx.strokeStyle=design.outline;ctx.stroke();
    }
    const size=hovered?480:pressed?426:454;
    const center=(512-size)/2;
    ctx.drawImage(image,center,center+offset,size,size);
    return canvas.toDataURL('image/png');
  }
  return {normal:draw('normal'),hover:draw('hover'),pressed:draw('pressed')};
}
