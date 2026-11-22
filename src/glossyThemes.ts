import type {BarStyle, StudioProject, VrMenuConfig} from './storage';
import {validateProject} from './storage';
import {glossyIconStates} from './glossyIcon';
import {glyphPng} from './barGlossy';
import {glyphs} from './glyphSet';
import type {ComponentType} from 'react';
import {DEFAULT_VR_MENU} from './vrMenu';

/** 12 thèmes NovaStudio : couleurs de la barre et charte glossy (icônes générées à l'application). */
export type GlossyTheme = {
  id: string;
  name: string;
  bar: Pick<BarStyle, 'background' | 'outline' | 'button' | 'buttonOutline' | 'icon'>;
  glossy: {base: string; rim: string; gloss: number; shadow: number};
  /** Thème qui configure aussi le casque : autorise la VR et règle l'interface jaune. */
  vr?: VrMenuConfig;
};

export const GLOSSY_THEMES: ReadonlyArray<GlossyTheme> = [
  {id: 'nuit-or', name: 'Nuit et or', bar: {background: '#0b1826', outline: '#c79c5a', button: '#c79c5a', buttonOutline: '#e6c17c', icon: '#f7f5ef'}, glossy: {base: '#c79c5a', rim: '#6b4f26', gloss: 0.8, shadow: 0.5}},
  {id: 'ocean-profond', name: 'Océan profond', bar: {background: '#153f59', outline: '#2ad8cf', button: '#153f59', buttonOutline: '#2ad8cf', icon: '#f7f5ef'}, glossy: {base: '#2ad8cf', rim: '#0b5c5a', gloss: 0.7, shadow: 0.5}},
  {id: 'coucher-soleil', name: 'Coucher de soleil', bar: {background: '#0b1826', outline: '#e8734a', button: '#e8734a', buttonOutline: '#e6c17c', icon: '#f7f5ef'}, glossy: {base: '#e8734a', rim: '#7a2435', gloss: 0.8, shadow: 0.5}},
  {id: 'lagon', name: 'Lagon', bar: {background: '#f7f5ef', outline: '#56e1d9', button: '#2ad8cf', buttonOutline: '#153f59', icon: '#0b1826'}, glossy: {base: '#56e1d9', rim: '#153f59', gloss: 0.9, shadow: 0.4}},
  {id: 'creme-bronze', name: 'Crème et bronze', bar: {background: '#f7f5ef', outline: '#b8924a', button: '#b8924a', buttonOutline: '#e6c17c', icon: '#0b1826'}, glossy: {base: '#b8924a', rim: '#6b4f26', gloss: 0.8, shadow: 0.5}},
  {id: 'lavande', name: 'Lavande', bar: {background: '#1e1b3a', outline: '#7f8cff', button: '#7f8cff', buttonOutline: '#c9cfff', icon: '#ffffff'}, glossy: {base: '#7f8cff', rim: '#3a3f8f', gloss: 0.8, shadow: 0.5}},
  {id: 'olive-camping', name: 'Olive camping', bar: {background: '#f0e9d8', outline: '#91816b', button: '#5f7a3a', buttonOutline: '#859652', icon: '#fff4cf'}, glossy: {base: '#5f7a3a', rim: '#3c4d24', gloss: 0.7, shadow: 0.5}},
  {id: 'bordeaux', name: 'Bordeaux élégant', bar: {background: '#2a0f16', outline: '#7a2435', button: '#7a2435', buttonOutline: '#c79c5a', icon: '#f7f5ef'}, glossy: {base: '#7a2435', rim: '#4a1420', gloss: 0.8, shadow: 0.5}},
  {id: 'anthracite', name: 'Anthracite', bar: {background: '#1d2126', outline: '#718692', button: '#3d4248', buttonOutline: '#718692', icon: '#ffffff'}, glossy: {base: '#3d4248', rim: '#15181c', gloss: 0.6, shadow: 0.6}},
  {id: 'ocean-clair', name: 'Océan clair', bar: {background: '#e0eff3', outline: '#6591a5', button: '#176a91', buttonOutline: '#62a4bc', icon: '#ffffff'}, glossy: {base: '#176a91', rim: '#0d3f57', gloss: 0.7, shadow: 0.4}},
  {id: 'sable', name: 'Sable', bar: {background: '#f3e7d3', outline: '#c79c5a', button: '#e6c17c', buttonOutline: '#b8924a', icon: '#5a4630'}, glossy: {base: '#e6c17c', rim: '#b8924a', gloss: 0.8, shadow: 0.4}},
  {id: 'immosphera', name: 'Immosphera', bar: {background: '#0f0f0f', outline: '#e2ad5c', button: '#171717', buttonOutline: '#e2ad5c', icon: '#f6c97f'}, glossy: {base: '#171717', rim: '#e2ad5c', gloss: 0.8, shadow: 0.5},
    vr: {...DEFAULT_VR_MENU, autoOpen: true}},
  {id: 'minuit-dore', name: 'Minuit doré', bar: {background: '#071a28', outline: '#e6c17c', button: '#0b1826', buttonOutline: '#e6c17c', icon: '#e6c17c'}, glossy: {base: '#153f59', rim: '#c79c5a', gloss: 0.7, shadow: 0.5}},
];

/** Pictogrammes de la barre (par clé) et boutons globaux (son, paramètres). */
const GLOBAL_KEYS = ['soundOn', 'soundOff', 'settings', 'video', 'plan'] as const;
const LABELS: Record<string, string> = {
  utensils: 'Restaurant', images: 'Images', grid: 'Espaces', phone: 'Appeler', info: 'Information',
  soundOn: 'Son activé', soundOff: 'Son coupé', settings: 'Paramètres', video: 'Vidéo', plan: 'Plan',
};
/** Clé du pictogramme d'un bouton de la barre : un bouton de type « plan » prend le pictogramme du plan. */
const keyOfItem = (item: {type: string; builtinIcon?: string}): string | undefined => (item.type === 'plan' ? 'plan' : item.builtinIcon);
const MAX_ICONS = 147;

/**
 * Applique un thème : couleurs de la barre, charte glossy, et un pack glossy (normal, survol, pressé) par bouton,
 * plus le son et les paramètres. Les icônes sont en WebP 512 px pour rester légères.
 */
export async function applyGlossyTheme(project: StudioProject, theme: GlossyTheme, options: {defaults?: boolean} = {}): Promise<StudioProject> {
  const barKeys = [...new Set(project.bottomBar.map(keyOfItem).filter((k): k is string => !!k && k in glyphs))];
  const keys = [...new Set([...barKeys, ...GLOBAL_KEYS, ...(options.defaults ? ['arrow', 'camera'] : [])])];
  if (project.icons.length + keys.length * 3 > MAX_ICONS) {
    throw Error('Bibliothèque pleine : supprime des anciens packs avant d’appliquer un thème.');
  }
  const style = {base: theme.glossy.base, rim: theme.glossy.rim, gloss: theme.glossy.gloss, shadow: theme.glossy.shadow};
  const packs = new Map<string, {iconId: string; hoverIconId: string; pressedIconId: string}>();
  const icons: {id: string; name: string; dataUrl: string}[] = [];
  for (const key of keys) {
    const Glyph = (glyphs as unknown as Record<string, ComponentType<Record<string, unknown>>>)[key];
    const states = await glossyIconStates({...style, glyph: await glyphPng(Glyph, '#ffffff'), size: 512, format: 'webp'});
    const label = `${theme.name} · ${LABELS[key] ?? key}`;
    const a = {id: crypto.randomUUID(), name: label + ' · Normal', dataUrl: states.normal};
    const b = {id: crypto.randomUUID(), name: label + ' · Survol', dataUrl: states.hover};
    const c = {id: crypto.randomUUID(), name: label + ' · Pressé', dataUrl: states.pressed};
    icons.push(a, b, c);
    packs.set(key, {iconId: a.id, hoverIconId: b.id, pressedIconId: c.id});
  }
  const bottomBar = project.bottomBar.map((item) => {
    const key = keyOfItem(item);
    const pack = key ? packs.get(key) : undefined;
    return pack ? {...item, ...pack} : item;
  });
  const sound = {soundOn: packs.get('soundOn')!, soundOff: packs.get('soundOff')!, settings: packs.get('settings')!};
  return validateProject({
    ...project,
    // Les nouvelles vidéos utilisent le bouton vidéo glossy par défaut.
    defaultVideoIcon: {...packs.get('video')!, iconSize: project.defaultVideoIcon?.iconSize ?? 40},
    ...(options.defaults ? {
      defaultNavigationIcon: {...packs.get('arrow')!, iconSize: project.defaultNavigationIcon?.iconSize ?? 40},
      defaultPhotoIcon: {...packs.get('camera')!, iconSize: project.defaultPhotoIcon?.iconSize ?? 40},
    } : {}),
    barStyle: {...project.barStyle, ...theme.bar, useBarGlyphs:false},
    glossyStyle: style,
    ...(theme.vr ? {vrEnabled: true, vrMenu: theme.vr} : {}),
    icons: [...project.icons, ...icons],
    bottomBar,
    soundOnIconId: sound.soundOn.iconId, soundOnHoverIconId: sound.soundOn.hoverIconId, soundOnPressedIconId: sound.soundOn.pressedIconId,
    soundOffIconId: sound.soundOff.iconId, soundOffHoverIconId: sound.soundOff.hoverIconId, soundOffPressedIconId: sound.soundOff.pressedIconId,
    settingsIconId: sound.settings.iconId, settingsHoverIconId: sound.settings.hoverIconId, settingsPressedIconId: sound.settings.pressedIconId,
  });
}

const mixHex = (hex: string, to: string, k: number): string => {
  const p = (h: string) => { const m = /^#?([0-9a-f]{6})$/i.exec(h.trim()); const n = parseInt(m ? m[1] : '808080', 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const a = p(hex), b = p(to);
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join('');
};

/**
 * « Même couleur que la barre » : refait TOUS les boutons (barre, son, paramètres, flèche, photo, vidéo, plan) avec la couleur
 * des boutons de la barre, pour qu'aucun ne détonne. Reprend le reflet et l'ombre de la charte glossy si elle existe.
 */
export async function harmonizeWithBar(project: StudioProject): Promise<StudioProject> {
  const bar = project.barStyle;
  const base = /^#[0-9a-f]{6}$/i.test(bar.button) ? bar.button : '#c79c5a';
  const theme: GlossyTheme = {
    id: 'harmonise', name: 'Couleur de la barre',
    bar: {background: bar.background, outline: bar.outline, button: bar.button, buttonOutline: bar.buttonOutline, icon: bar.icon},
    glossy: {base, rim: mixHex(/^#[0-9a-f]{6}$/i.test(bar.buttonOutline) ? bar.buttonOutline : base, '#000000', 0.45), gloss: project.glossyStyle?.gloss ?? 0.8, shadow: project.glossyStyle?.shadow ?? 0.5},
  };
  return applyGlossyTheme(project, theme, {defaults: true});
}
