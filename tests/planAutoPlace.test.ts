import {describe, expect, it} from 'vitest';
import {proposePlanLayout, PLAN_ENTRANCE} from '../src/planAutoPlace';
import type {Scene} from '../src/storage';

const scene = (id: string, name: string, links: {to: string; yaw: number}[] = [], excluded = false) =>
  ({id, name, excluded, hotspots: links.map((l, i) => ({id: id + i, type: 'navigation', title: '', text: '', target: l.to, yaw: l.yaw, pitch: 0}))}) as unknown as Scene;

describe('proposePlanLayout', () => {
  it('place le premier panorama (numéro le plus bas) à l’entrée', () => {
    const pts = proposePlanLayout([scene('b', 'PAN002'), scene('a', 'PAN001'), scene('c', 'PAN010')]);
    expect(pts[0].sceneId).toBe('a');
    expect(pts[0]).toMatchObject({x: PLAN_ENTRANCE.x, y: PLAN_ENTRANCE.y});
    expect(pts.map((p) => p.sceneId)).toEqual(['a', 'b', 'c']);
  });
  it('suit le lien : un lien droit devant monte sur le plan', () => {
    const pts = proposePlanLayout([scene('a', 'PAN001', [{to: 'b', yaw: 0}]), scene('b', 'PAN002')]);
    const [a, b] = pts;
    expect(b.y).toBeLessThan(a.y);
    expect(Math.abs(b.x - a.x)).toBeLessThan(1);
  });
  it('aligne les panoramas non reliés en bas, sans superposition ni sortie du plan', () => {
    const pts = proposePlanLayout(Array.from({length: 8}, (_, i) => scene('s' + i, 'PAN00' + i)));
    for (const p of pts) {expect(p.x).toBeGreaterThanOrEqual(6); expect(p.x).toBeLessThanOrEqual(94); expect(p.y).toBeLessThanOrEqual(94);}
    expect(new Set(pts.map((p) => p.x + ',' + p.y)).size).toBe(8);
  });
  it('ignore les panoramas exclus et une liste vide', () => {
    expect(proposePlanLayout([])).toEqual([]);
    expect(proposePlanLayout([scene('a', 'PAN001'), scene('x', 'PAN002', [], true)]).map((p) => p.sceneId)).toEqual(['a']);
  });
});
