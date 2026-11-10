import { describe, expect, it } from 'vitest';
import { norrsken } from '../../src/content/chapters/norrsken';
import { homeTrailWay } from '../../src/render/home-trail';
import { Sim } from '../../src/sim/sim';

/**
 * Norrsken's way home (Olov, 8 November 2026: Pappa walked down from the summit in the air). Pappa carries Elof down a
 * trail behind the play plane (src/render/home-trail.ts); to the simulation the summit still ends in a drop.
 */
describe('Norrsken: the trail home', () => {
  const way = homeTrailWay(norrsken)!;
  const feet = { y: 0, z: 0 };
  const idle = { x: 0, y: 0, hopHeld: false, hop: false, act: false };
  const done = ['lower', 'crowberry', 'eyes', 'bag', 'share:tragubbe', 'share:spoket', 'share:jay', 'shared', 'taste', 'scene:aterfunna'];

  it('has his feet where the simulation carries him, the whole way down', () => {
    const sim = new Sim({ ...norrsken, spawn: { x: 33, y: 0.01 } }, {}, { placed: ['tragubbe'], flags: done });
    for (let i = 0; i < 24; i++) sim.step(idle);
    sim.step({ ...idle, act: true });
    expect(sim.curr.mode).toBe('ride');
    let checked = 0;
    while (sim.curr.mode === 'ride') {
      way.feet(sim.curr.x, feet);
      expect(Math.abs(feet.y - sim.curr.y)).toBeLessThan(0.01);
      // Over the drop, the trail is above the ground the simulation has under him.
      if (sim.curr.x > way.edge + 0.5 && sim.curr.x < way.end - 1) expect(feet.y).toBeGreaterThan(sim.curr.groundY + 0.2);
      sim.step(idle);
      checked++;
    }
    expect(checked).toBeGreaterThan(1000);
    expect(sim.curr.x).toBeCloseTo(norrsken.rides![0]!.to.x, 3);
  });

  it('is on the summit before its edge, behind the play plane down the mountainside, and in front again at its foot', () => {
    expect(way.feet(32, feet, -0.6)).toEqual({ y: 0, z: -0.6 });
    // He is on the trail's top at its middle by the summit's edge, and stays there down the mountainside.
    for (const x of [way.edge, 45, 55, 65]) {
      way.feet(x, feet, -0.6);
      expect(feet.z).toBeLessThan(way.front - 0.4);
      expect(feet.z).toBeGreaterThan(way.back + 0.4);
    }
    way.feet(way.end, feet, -0.6);
    expect(feet).toEqual({ y: way.floor, z: -0.6 });
  });

  it('never lets Elof walk down alone: the summit still ends in a drop he stops at', () => {
    const i = norrsken.ground.findIndex((p) => p.x === way.edge);
    expect(norrsken.ground[i]!.y - norrsken.ground[i + 1]!.y).toBeGreaterThan(4);
  });
});
