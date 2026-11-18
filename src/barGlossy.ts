import {createElement, type ComponentType} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {glossyIconStates,type GlossyStates} from './glossyIcon';

/** Rend une icône de la barre (SVG) en PNG blanc, prêt à être posé au centre d'un bouton glossy. */
export async function glyphPng(Glyph: ComponentType<Record<string, unknown>>, color = '#ffffff'): Promise<string> {
  const svg = renderToStaticMarkup(createElement(Glyph, {size: 256, strokeWidth: 2, color}));
  const withNs = svg.includes('xmlns=') ? svg : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(withNs);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(Error('Icône non rendue'));
    i.src = src;
  });
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw Error('Canvas indisponible');
  ctx.drawImage(img, 96, 96, 320, 320);
  return canvas.toDataURL('image/png');
}

export type BarItemForGlossy = {id: string; title: string; builtinIcon?: string; iconId?: string};
export type GlossyStyleParams = {base: string; rim?: string; gloss: number; shadow: number};

/** Un pack glossy (normal, survol, pressé) par bouton de la barre qui n'a pas encore d'icône personnalisée. */
export async function glossyBarPacks(
  items: BarItemForGlossy[],
  style: GlossyStyleParams,
  glyphs: Record<string, ComponentType<Record<string, unknown>>>,
  fallback: ComponentType<Record<string, unknown>>,
): Promise<Array<{item: BarItemForGlossy; states: GlossyStates}>> {
  const result: Array<{item: BarItemForGlossy; states: GlossyStates}> = [];
  for (const item of items) {
    if (item.iconId) continue;
    const Glyph = glyphs[item.builtinIcon ?? ''] ?? fallback;
    const glyph = await glyphPng(Glyph);
    const states = await glossyIconStates({...style, glyph});
    result.push({item, states});
  }
  return result;
}
