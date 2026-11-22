import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSrc = (rel: string) => readFileSync(resolve(process.cwd(), 'src', rel), 'utf8');

describe('PC & Tablet UI Regression Guards', () => {
  it('uses Lucide vector pills and unified settings button without tiny 24px gears in CreationToolbar', () => {
    const toolbar = readSrc('CreationToolbar.tsx');
    expect(toolbar).toContain('nv-tool-pill');
    expect(toolbar).toContain('nv-tool-settings-btn');
    expect(toolbar).toContain('SlidersHorizontal');
    expect(toolbar).not.toContain('nv-tool-gear');
  });

  it('keeps gallery nav arrows >= 44px on narrow viewports and purges dead visitor selectors', () => {
    const visitorCss = readSrc('visitor.css');
    const styleCss = readSrc('style.css');
    expect(visitorCss).not.toContain('.tour-fullscreen');
    expect(visitorCss).not.toContain('.tour-start');
    expect(visitorCss).not.toMatch(/@media\(max-width:560px\)\{[^}]*\.nv-pg-nav\{[^}]*width:34px/);
    expect(styleCss).not.toMatch(/@media\(max-width:560px\)\{[^}]*\.nv-pg-nav\{[^}]*width:34px/);
    expect(styleCss).not.toMatch(/@media\(max-width:600px\)\{[^}]*\.nv-v3-undo[^}]*display:none/);
  });

  it('preserves tactile press feedback on custom PNG buttons and touch delete visibility for iPad landscape', () => {
    const mediaCss = readSrc('media.css');
    const styleCss = readSrc('style.css');
    expect(mediaCss).toContain('.has-custom-png:active:not(:disabled)');
    expect(styleCss).toContain('@media(max-width:1024px),(hover:none),(pointer:coarse)');
    expect(styleCss).toContain('.corner-handle::before');
    expect(styleCss).toContain('.nv-scene-include::after');
  });

  it('wires visitor touch labels, explicit editor reorder toggle, and FloorPlan 2-tap touch preview', () => {
    const tour = readSrc('tour.tsx');
    const main = readSrc('main.tsx');
    const floorPlan = readSrc('FloorPlan.tsx');
    const floorPlanCss = readSrc('floorPlan.css');

    expect(tour).toContain('tour-bar-item');
    expect(tour).toContain('tour-bar-label');
    expect(main).toContain('barReorderMode');
    expect(main).toContain('nv-bar-reorder-toggle');
    expect(main).toContain('nv-mode-settings');
    expect(floorPlan).toContain('touchPreview');
    expect(floorPlan).toContain('nv-plan-touch-go');
    expect(floorPlanCss).toContain('.nv-plan-touch-go');
  });
});
