import { describe, expect, it } from 'vitest';
import {
  applyImmospheraDefaults,
  isImmospheraProject,
  isImmospheraText,
} from '../src/immospheraDefaults';
import { applySkin, captureSkin, validateSkin } from '../src/skins';
import { defaultBar, newProject, roomNameVisible, validateProject } from '../src/storage';
import { DEFAULT_VR_MENU } from '../src/vrMenu';

describe('Storage, Skins & Immosphera defaults', () => {
  it('sets bottomBar Photos item to type "photos" by default', () => {
    const bar = defaultBar();
    const photos = bar.find((b) => b.title.toLowerCase().includes('photo'));
    const spaces = bar.find((b) => b.title.toLowerCase().includes('espace'));
    expect(photos?.type).toBe('photos');
    expect(spaces).toBeDefined();
  });

  it('creates and validates a StudioProject cleanly', () => {
    const project = newProject();
    project.scenes = [
      { id: 's1', name: 'Entrée', dataUrl: 'data:image/jpeg;base64,abc', hotspots: [] },
    ];
    const validated = validateProject(project);
    expect(validated.scenes.length).toBe(1);
    expect(validated.bottomBar.some((b) => b.type === 'photos')).toBe(true);
    expect(roomNameVisible(validated, validated.scenes[0])).toBe(true);
  });

  it('captures, validates and applies skins while forcing Immosphera VR defaults', () => {
    const source = newProject();
    source.name = 'Immosphera Démo';
    const skin = validateSkin(captureSkin(source, 'Immosphera VR'));
    expect(skin.appearance).toBeDefined();

    // Without custom vrMenu on target, Immosphera skin upgrades to DEFAULT_VR_MENU & activates VR
    const target = newProject();
    target.vrEnabled = false;
    delete target.vrMenu;
    const upgraded = applySkin(target, skin);
    expect(upgraded.vrEnabled).toBe(true);
    expect(upgraded.vrMenu?.autoOpen).toBe(true);
    expect(upgraded.vrMenu?.left).toEqual(DEFAULT_VR_MENU.left);
    expect(upgraded.vrMenu?.right).toEqual(DEFAULT_VR_MENU.right);

    // Custom vrMenu choices remain intact while VR is still enabled
    const customized = newProject();
    customized.vrEnabled = false;
    customized.vrMenu = { autoOpen: false, left: ['home'], right: [] };
    const updatedCustom = applySkin(customized, skin);
    expect(updatedCustom.vrEnabled).toBe(true);
    expect(updatedCustom.vrMenu?.left).toEqual(['home']);
  });

  it('detects Immosphera branding across project text variants', () => {
    expect(isImmospheraText('Immosphera')).toBe(true);
    expect(isImmospheraText('IMMOSPHERA - Villa Soleil')).toBe(true);
    expect(isImmospheraText('Villa Soleil')).toBe(false);

    const p = newProject();
    p.name = 'Visite Immosphera Test';
    expect(isImmospheraProject(p)).toBe(true);
  });

  it('activates VR and applies default VR layout on Immosphera projects', async () => {
    const base = newProject();
    base.name = 'Immosphera Résidence';
    base.vrEnabled = false;
    delete base.vrMenu;

    const fakeImmospheraSkin = validateSkin(captureSkin(base, 'Immosphera Gold'));
    const next = await applyImmospheraDefaults(base, fakeImmospheraSkin);
    expect(next.vrEnabled).toBe(true);
    expect(next.vrMenu?.autoOpen).toBe(true);
    expect(next.vrMenu?.left).toEqual(DEFAULT_VR_MENU.left);
    expect(next.vrMenu?.right).toEqual(DEFAULT_VR_MENU.right);
  });
});
