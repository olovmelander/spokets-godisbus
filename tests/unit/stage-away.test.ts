import { stubCanvas } from './canvas-stub';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { billsta } from '../../src/content/aventyr2/chapters/billsta';
import { heightOf } from '../../src/render/rig';
import { createStage } from '../../src/render/stage';

beforeEach(() => {
  stubCanvas();
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
  // On their way up to the house, at a child's sprint (their run takes the time their steps need).
  const told = new Set(['scene:card', 'scene:bi:kids-window', 'beat:bi:new-trail']);
  stage.update({ id: run.id, seconds: 5 }, told, { x: 7.4, y: 0 }, 6, 1 / 60, false);
  expect(moa.visible() && bertil.visible()).toBe(true);
  expect(moa.rig.group.position.z).toBeLessThan(car - 10);
  // In at the back door: gone, during the scene's last moment and after it.
  stage.update({ id: run.id, seconds: run.seconds }, told, { x: 7.4, y: 0 }, 6 + run.seconds, 1 / 60, false);
  expect(moa.visible() || bertil.visible()).toBe(false);
  told.add(`scene:${run.id}`);
  stage.update(null, told, { x: 9, y: 0 }, 7 + run.seconds, 1 / 60, false);
  expect(moa.visible() || bertil.visible()).toBe(false);
});

it('gives Moa and Bertil the time their steps need: at most about a child’s sprint for their size', () => {
  const run = billsta.scenes!.find(scene => scene.id === 'bi:kids-run')!;
  for (const who of ['moa', 'bertil'] as const) {
    const keys = run.stage!.actors![who]!;
    let x = who === 'moa' ? 6.4 : 8.6, z = who === 'moa' ? -7.6 : -6.4, fastest = 0;
    for (const key of keys) {
      if (key.x === undefined || key.z === undefined || !key.move) continue;
      // An eased move (smoothstep) goes at its fastest one and a half times its mean speed, half way.
      fastest = Math.max(fastest, 1.5 * Math.hypot(key.x - x, key.z - z) / key.move);
      x = key.x; z = key.z;
    }
    // In their own heights a second: they ran at 4 (Moa) and 5.4 (Bertil), twice a child's sprint, and their boots slid.
    expect(fastest / heightOf(who)).toBeLessThan(2.4);
  }
});
