import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyMotion, lessMotion } from '../../src/platform/motion';

const file = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const fakeDoc = (deviceSaysLess: boolean) => ({
  documentElement: { dataset: {} as Record<string, string> },
  defaultView: { matchMedia: () => ({ matches: deviceSaysLess }) },
}) as unknown as Document;

// Less motion is one switch with two sources (docs/ux-audit/style-and-sound.md row 17).
describe('less motion', () => {
  it('is set from Mindre rörelse or the device, and cleared when neither asks', () => {
    const doc = fakeDoc(false);
    expect(lessMotion(doc)).toBe(false);
    applyMotion(doc, true);
    expect(doc.documentElement.dataset.motion).toBe('reduce');
    expect(lessMotion(doc)).toBe(true);
    applyMotion(doc, false);
    expect(doc.documentElement.dataset.motion).toBeUndefined();
    const device = fakeDoc(true);
    applyMotion(device, false);
    expect(device.documentElement.dataset.motion).toBe('reduce');
    // Before anything has set it, the device's setting still counts.
    expect(lessMotion(fakeDoc(true))).toBe(true);
  });

  it('is read by the stylesheet from the one attribute, never from either source on its own', () => {
    const css = file('src/ui/ui.css');
    expect(css).not.toMatch(/prefers-reduced-motion/);
    expect(css).not.toMatch(/body\.calm/);
    expect(css).toMatch(/:root\[data-motion="reduce"\] :is\(\.btn-act, \.key-prompt\)\.pulse/);
  });

  it('is set before the first paint, from the current player\'s save', () => {
    const html = file('index.html');
    const head = html.slice(0, html.indexOf('</head>'));
    expect(head).toMatch(/dataset\.motion = 'reduce'/);
    expect(head).toMatch(/godisbus\.v1\.index/);
    expect(head).toMatch(/'godisbus\.v1\.player\.' \+ id/);
    expect(html).not.toMatch(/prefers-reduced-motion: reduce\) \{/);
  });
});
