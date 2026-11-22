import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSrc = (rel: string) => readFileSync(resolve(process.cwd(), 'src', rel), 'utf8');

describe('VR & Export Regression Guards', () => {
  it('preserves water-drop shader spin, horizon-locked label, black/gold header and gold unity in vr.ts', () => {
    const vr = readSrc('vr.ts');
    expect(vr).toMatch(/pictoGold/);
    expect(vr).toContain('#f3bb37');
    expect(vr).toContain('#111317');
    expect(vr).toContain('PlaneGeometry');
    expect(vr).toContain('ShaderMaterial');
    expect(vr).toContain('renderRoomHeader');
    expect(vr).toContain('hoverTooltip');
    expect(vr).toContain('spin');
    // Guard against re-introducing the sticky tooltip bug where aiming away left remoteTarget stuck
    expect(vr).not.toMatch(/showTooltipFor\([^)]*activeLaserHover\s*\?\?\s*remoteTarget/);
  });

  it('keeps dynamic VR menu helpers wired in vrMenu.ts and tour.tsx', () => {
    const vrMenu = readSrc('vrMenu.ts');
    const tour = readSrc('tour.tsx');
    expect(vrMenu).toContain('resolveVrGalleryItem');
    expect(vrMenu).toContain('resolveVrPhotosItem');
    expect(vrMenu).toMatch(/autoOpen:\s*true/);
    expect(tour).toContain('warmPanoramas');
    expect(tour).toContain('FloorPlanDialog');
  });

  it('keeps FloorPlan touch/picker wiring intact', () => {
    const fp = readSrc('FloorPlan.tsx');
    expect(fp).toContain('FloorPlanDialog');
    expect(fp).toContain('nv-plan-point');
  });
});
