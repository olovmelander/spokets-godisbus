import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { billsta } from '../../src/content/aventyr2/chapters/billsta';
import { createStage } from '../../src/render/stage';

beforeEach(() => {
  const context = Object.fromEntries(['fillRect', 'beginPath', 'lineTo', 'moveTo', 'closePath', 'fill', 'stroke', 'arc', 'ellipse'].map(name => [name, () => {}]));
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => context }) });
});
afterEach(() => vi.unstubAllGlobals());

it('draws Moa and Bertil by the car, running to the house, and not once they have gone in at its back', () => {
  const stage = createStage(billsta, () => 0);
  const moa = stage.actors.get('moa')!, bertil = stage.actors.get('bertil')!;
  const run = billsta.scenes!.find(scene => scene.id === 'bi:kids-run')!;
  // By the car, as the card plays.
  stage.update({ id: 'card', seconds: 1 }, new Set(), { x: 1, y: 0 }, 1, 1 / 60, false);
  expect(moa.visible() && bertil.visible()).toBe(true);
  const car = moa.rig.group.position.z;
  // On their way up to the house.
  const told = new Set(['scene:card', 'scene:bi:kids-window', 'beat:bi:new-trail']);
  stage.update({ id: run.id, seconds: 3 }, told, { x: 7.4, y: 0 }, 4, 1 / 60, false);
  expect(moa.visible() && bertil.visible()).toBe(true);
  expect(moa.rig.group.position.z).toBeLessThan(car - 10);
  // In at the back door: gone, during the scene's last moment and after it.
  stage.update({ id: run.id, seconds: run.seconds }, told, { x: 7.4, y: 0 }, 13, 1 / 60, false);
  expect(moa.visible() || bertil.visible()).toBe(false);
  told.add(`scene:${run.id}`);
  stage.update(null, told, { x: 9, y: 0 }, 14, 1 / 60, false);
  expect(moa.visible() || bertil.visible()).toBe(false);
});
