import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { billsta } from '../../src/content/aventyr2/chapters/billsta';
import { createStage } from '../../src/render/stage';
import { STEP } from '../../src/sim/constants';

beforeEach(() => {
  const context = Object.fromEntries(['fillRect', 'beginPath', 'lineTo', 'moveTo', 'closePath', 'fill', 'stroke', 'arc', 'ellipse'].map(name => [name, () => {}]));
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => context }) });
});
afterEach(() => vi.unstubAllGlobals());

it('frames the strait completely by the first simulation step, then holds it while the line is read', () => {
  const stage = createStage(billsta, () => 0);
  const flags = new Set(['beat:bi:there']);
  const first = stage.update({ id: 'bi:sundet', seconds: STEP }, flags, { x: 193.2, y: 6.4 }, STEP, STEP, false).shot;
  expect(first?.blend).toBe(1);
  expect(first?.z).toBeLessThan(-20);
  const held = stage.update({ id: 'bi:sundet', seconds: STEP }, flags, { x: 193.2, y: 6.4 }, 1, 0, false).shot;
  expect(held).toEqual(first);
});
