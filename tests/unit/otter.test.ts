import { Group, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { alven } from '../../src/content/aventyr2/chapters/alven';
import { OTTER_REACH, otterLife, type OtterWatcher } from '../../src/content/aventyr2/otter';

/**
 * The otter on its stone in Älven's lake (src/content/aventyr2/otter.ts). Olov, 12 November 2026: "om man går ut till
 * uttern så hoppar den ner i älven med ett plask".
 */
function otter() {
  const decor = alven.decor!.find((d) => d.look === 'otter')!;
  const root = new Group();
  root.position.set(decor.at.x, decor.at.y, decor.z ?? 0);
  const group = new Group();
  group.scale.setScalar(0.72);
  root.add(group);
  const splashes: number[] = [];
  const splash = { group: new Group(), update: (since: number) => { splashes.push(since); } };
  const elof: OtterWatcher = { x: 0, y: 0, still: false, riding: false };
  let sat = 0;
  const life = otterLife({ id: 'decor:otter', at: decor.at, verb: 'take', look: 'otter' }, group, elof, splash, () => alven.water ?? [], () => { sat++; });
  root.add(life.splash);
  let clock = 0;
  const run = (x: number, seconds: number, y = 0) => {
    elof.x = x;
    elof.y = y;
    for (let t = 0; t < seconds; t += 1 / 30) { clock += 1 / 30; life.alive(clock, 1 / 30); }
  };
  const world = () => { root.updateMatrixWorld(true); return group.getWorldPosition(new Vector3()); };
  return { decor, group, root, elof, run, world, life, splashes, sat: () => sat };
}

/** The water's surface just past the otter's stone. */
const lake = (x: number) => alven.water!.find((w) => w.from >= x - 0.1)!;

describe('the otter on its stone in Älven', () => {
  it('sits on its stone while he is on the shore, or flies over it on the owl', () => {
    const o = otter();
    o.run(132, 3);
    expect(o.life.phase()).toBe('sit');
    expect(o.group.visible).toBe(true);
    expect(o.sat()).toBeGreaterThan(0);
    // High over it on the owl's back, it stays where it is.
    o.elof.riding = true;
    o.run(o.decor.at.x - 2, 2, 3);
    expect(o.life.phase()).toBe('sit');
  });

  it('goes out to: it looks at him, and jumps head first off its stone into the lake with a splash', () => {
    const o = otter();
    o.run(132, 1);
    // Out on the second rolling log, a hop or two from its stone.
    const out = o.decor.at.x - OTTER_REACH + 0.6;
    expect(alven.movers!.some((m) => m.extra && Math.abs(m.stops[0]!.x - out) < m.width / 2 + 0.4)).toBe(true);
    o.run(out, 0.2);
    expect(o.life.phase()).toBe('alert');
    o.run(out, 0.5);
    expect(o.life.phase()).toBe('leap');
    // Up and over, away from him, and down into the water past the stone's far end.
    let highest = -Infinity;
    let furthest = -Infinity;
    for (let i = 0; i < 18; i++) {
      o.run(out, 1 / 30);
      if (o.group.visible) { highest = Math.max(highest, o.world().y); furthest = Math.max(furthest, o.world().x); }
    }
    const stone = alven.ground.filter((p) => p.y === o.decor.at.y && p.x > o.decor.at.x - 3 && p.x < o.decor.at.x + 3);
    expect(highest).toBeGreaterThan(o.decor.at.y + 0.4);
    expect(furthest).toBeGreaterThan(Math.max(...stone.map((p) => p.x)));
    // In: the splash, on the water past the stone.
    expect(o.splashes.some((since) => since >= 0)).toBe(true);
    const at = o.life.splash.getWorldPosition(new Vector3());
    expect(at.y).toBeCloseTo(lake(o.decor.at.x).y, 3);
    expect(at.x).toBeGreaterThan(Math.max(...stone.map((p) => p.x)));
    o.run(out, 1);
    expect(o.life.phase()).not.toBe('sit');
  });

  it('swims away and is gone, and climbs back onto its stone once he is back on the shore', () => {
    const o = otter();
    o.run(o.decor.at.x - 3, 0.8);
    o.run(o.decor.at.x - 3, 1.5);
    expect(o.life.phase()).toBe('swim');
    expect(o.group.visible).toBe(true);
    // Low in the water, floating on its back, off into the lake.
    expect(o.world().y).toBeLessThan(lake(o.decor.at.x).y);
    o.run(o.decor.at.x - 3, 3);
    expect(o.group.visible).toBe(false);
    // Still out there with him: it does not come back.
    o.run(o.decor.at.x, 5);
    expect(o.group.visible).toBe(false);
    // Back on the shore: it climbs out of the water and up onto its stone, and sits there again.
    o.run(o.decor.at.x - 10, 0.5);
    expect(o.life.phase()).toBe('climb');
    expect(o.group.visible).toBe(true);
    o.run(o.decor.at.x - 10, 1);
    expect(o.life.phase()).toBe('sit');
    expect(o.group.position.x).toBeCloseTo(0, 3);
  });

  it('with less motion is simply gone, with only the splash\'s rings', () => {
    const o = otter();
    o.elof.still = true;
    o.run(o.decor.at.x - 3, 1.2);
    expect(o.group.visible).toBe(false);
    expect(o.group.position.x).toBe(0);
  });
});
