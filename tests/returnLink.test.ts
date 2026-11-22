import {describe, expect, it} from 'vitest';
import {displayPitch, isReturnLink} from '../src/returnLink';
import type {Hotspot} from '../src/storage';

const nav = (id: string, title: string, yaw: number, pitch = -0.1) => ({id, type: 'navigation', title, text: '', target: 'x', yaw, pitch}) as unknown as Hotspot;

describe('flèches retour', () => {
  it('reconnaît « Retour vers … »', () => {
    expect(isReturnLink(nav('a', 'Retour vers Salon', 0))).toBe(true);
    expect(isReturnLink(nav('a', 'Cuisine', 0))).toBe(false);
  });
  it('ne bouge pas une flèche retour éloignée de l’avant', () => {
    const back = nav('b', 'Retour vers A', Math.PI), fwd = nav('f', 'Salon', 0);
    expect(displayPitch(back, [back, fwd])).toBe(back.pitch);
  });
  it('descend une flèche retour proche d’une flèche avant, sans toucher l’avant', () => {
    const back = nav('b', 'Retour vers A', 0.1, -0.12), fwd = nav('f', 'Salon', 0, -0.1);
    expect(displayPitch(back, [back, fwd])).toBeLessThan(-0.3);
    expect(displayPitch(fwd, [back, fwd])).toBe(fwd.pitch);
  });
});
