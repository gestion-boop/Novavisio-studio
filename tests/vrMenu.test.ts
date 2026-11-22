import { describe, expect, it } from 'vitest';
import {
  DEFAULT_VR_MENU,
  VR_BUILTIN_ACTIONS,
  availableVrActions,
  layoutColumns,
  resolveVrGalleryItem,
  resolveVrPhotosItem,
  vrActionSymbol,
  vrMenuOf,
} from '../src/vrMenu';
import { barKind } from '../src/barKind';
import { newProject, type StudioProject } from '../src/storage';

function sampleProject(): StudioProject {
  const base = newProject();
  return {
    ...base,
    name: 'Projet Test VR',
    scenes: [
      { id: 's1', name: 'Salon', dataUrl: 'data:image/jpeg;base64,s1', hotspots: [] },
      { id: 's2', name: 'Cuisine', dataUrl: 'data:image/jpeg;base64,s2', hotspots: [] },
      { id: 's3', name: 'Terrasse cachée', dataUrl: 'data:image/jpeg;base64,s3', excluded: true, hotspots: [] },
    ],
  };
}

describe('VR Menu & Actions', () => {
  it('exposes the default Immosphera/reference 6-row layout with autoOpen enabled', () => {
    expect(DEFAULT_VR_MENU.autoOpen).toBe(true);
    expect(DEFAULT_VR_MENU.left).toEqual(['gallery', 'plan', 'photos', '', '', 'home']);
    expect(DEFAULT_VR_MENU.right).toEqual(['sound', '', '', '', 'help', 'exit']);
    expect(VR_BUILTIN_ACTIONS.some((a) => a.id === 'photos')).toBe(true);
    expect(Boolean(vrActionSymbol('photos'))).toBe(true);
  });

  it('upgrades a project missing vrMenu to the default menu cleanly', () => {
    const project = sampleProject();
    delete (project as Partial<StudioProject>).vrMenu;
    const menu = vrMenuOf(project);
    expect(menu.autoOpen).toBe(true);
    expect(menu.left).toEqual(DEFAULT_VR_MENU.left);
    expect(menu.right).toEqual(DEFAULT_VR_MENU.right);
  });

  it('canonicalizes legacy bottom-bar photos actions without duplicates', () => {
    const project = sampleProject();
    const photosItem = project.bottomBar.find((b) => b.type === 'photos');
    expect(photosItem).toBeDefined();
    if (!photosItem) return;

    const available = availableVrActions(project);
    expect(available.filter((a) => a.id === `bar:${photosItem.id}`).length).toBe(0);

    const normalized = vrMenuOf({
      ...project,
      vrMenu: { autoOpen: true, left: [`bar:${photosItem.id}`, 'plan', 'photos'], right: ['sound'] },
    });
    expect(normalized.left[0]).toBe('photos');
    expect(normalized.left.filter((id) => id === 'photos').length).toBe(1);

    const grid = layoutColumns(normalized.left, normalized.right);
    expect(grid.left.length).toBeGreaterThan(0);
    expect(grid.left[0].id).toBe('photos');
  });

  it('dynamically filters stale scene IDs and exposes active project panoramas in VR gallery', () => {
    const project = sampleProject();
    project.bottomBar.push({
      id: 'custom-gallery',
      type: 'gallery',
      title: 'Galerie',
      text: '',
      url: '',
      gallery: [{ sceneId: 'deleted-scene', label: 'Ancien' }],
    });
    const resolved = resolveVrGalleryItem(project);
    expect(resolved?.gallery?.map((g) => g.sceneId)).toEqual(['s1', 's2']);
  });

  it('dynamically resolves project photos from media library and hotspot fallback', () => {
    const withLibrary = sampleProject();
    withLibrary.mediaLibrary = [
      {
        id: 'm1',
        kind: 'photo',
        title: 'Façade',
        provider: 'local',
        url: '',
        data: 'data:image/jpeg;base64,ml1',
        addedAt: '2026-01-01T00:00:00Z',
      },
    ];
    const resolvedLib = resolveVrPhotosItem(withLibrary);
    expect((resolvedLib?.photos ?? []).map((p) => p.data || p.url)).toContain('data:image/jpeg;base64,ml1');

    const hotspotOnly = sampleProject();
    hotspotOnly.scenes[0].hotspots = [
      {
        id: 'h1',
        type: 'image',
        yaw: 0,
        pitch: 0,
        title: 'Détail',
        text: '',
        target: '',
        imageDataUrl: 'data:image/jpeg;base64,hs1',
      },
    ];
    const resolvedHs = resolveVrPhotosItem(hotspotOnly);
    expect((resolvedHs?.photos ?? []).map((p) => p.data || p.url)).toContain('data:image/jpeg;base64,hs1');
  });

  it('classifies standard bottom-bar actions with barKind', () => {
    expect(barKind({ title: 'Photos', text: '', url: '' })).toBe('photos');
    expect(barKind({ title: 'Panoramas', text: '', url: '' })).toBe('gallery');
    expect(barKind({ title: 'Appeler', text: '', url: 'tel:+33102030405' })).toBe('phone');
    expect(barKind({ title: 'Site web', text: '', url: 'https://example.com' })).toBe('web');
    expect(barKind({ title: 'Infos', text: '', url: '' })).toBe('info');
    expect(barKind({ title: 'Plan 2D', text: '', url: '' })).toBe('map');
    expect(barKind({ title: 'Restaurant', text: '', url: '' })).toBe('menu');
  });
});
