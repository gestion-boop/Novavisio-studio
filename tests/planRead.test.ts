import {describe, expect, it, vi} from 'vitest';
vi.mock('../src/cloud', () => ({supabase: () => ({}), cloudConfigured: false}));
import {matchScenesToRooms} from '../src/planRead';

describe('matchScenesToRooms', () => {
  const rooms = [{label: 'Séjour', surfaceM2: 24, x: 30, y: 30}, {label: 'Chambre', surfaceM2: null, x: 80, y: 80}];
  it('associe chaque panorama à la pièce la plus proche, une pièce par panorama', () => {
    const m = matchScenesToRooms([{sceneId: 'a', x: 28, y: 33}, {sceneId: 'b', x: 75, y: 78}], rooms);
    expect(m.get('a')).toBe(0); expect(m.get('b')).toBe(1);
  });
  it('ne réutilise pas une pièce déjà prise', () => {
    const m = matchScenesToRooms([{sceneId: 'a', x: 30, y: 30}, {sceneId: 'b', x: 31, y: 31}, {sceneId: 'c', x: 32, y: 29}], rooms);
    expect(m.size).toBe(2);
    expect(new Set(m.values()).size).toBe(2);
  });
});
