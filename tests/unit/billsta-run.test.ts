import { stubCanvas } from './canvas-stub';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { billsta, HOUSE, RUN } from '../../src/content/aventyr2/chapters/billsta';
import { heightOf } from '../../src/render/rig';
import { routeAt, routeThrough, runProgress, runRate, runTop } from '../../src/render/run-route';
import { createStage } from '../../src/render/stage';

/**
 * Moa's and Bertil's run up to mormor and morfar's house (Olov, 14 November 2026: "Moa och Bertil springer rakt igenom
 * det vita huset i bakgrunden. De måste springa mot huset och sedan runt det."). Their way was two straight legs, to a
 * corner on the lawn and on to a door at the back: the second leg went through the house's left corner and the bushes
 * beside it. Now it is one curve towards the house, along its front and round its left end (`RUN`), played here by the
 * stage itself and measured against the house as it stands (`HOUSE`).
 */

beforeEach(() => {
  stubCanvas();
});
afterEach(() => vi.unstubAllGlobals());

type P = { x: number; z: number };
const [front, left, back, right] = HOUSE.corners;
/** How far inside the house's walls a point is (above zero), or outside them (below): its four walls, in order round it. */
function insideHouse(p: P): number {
  const walls: [P, P][] = [[front, left], [left, back], [back, right], [right, front]];
  const middle = { x: (front.x + back.x) / 2, z: (front.z + back.z) / 2 };
  return Math.min(...walls.map(([a, b]) => {
    const along = Math.hypot(b.x - a.x, b.z - a.z);
    const out = { x: (b.z - a.z) / along, z: -(b.x - a.x) / along };
    const side = Math.sign((middle.x - a.x) * out.x + (middle.z - a.z) * out.z);
    return side * ((p.x - a.x) * out.x + (p.z - a.z) * out.z);
  }));
}
/** How far inside a box on the ground a point is (above zero), or outside it (below). */
function insideBox(p: P, box: { from: P; to: P }): number {
  const dx = Math.max(box.from.x - p.x, p.x - box.to.x), dz = Math.max(box.from.z - p.z, p.z - box.to.z);
  return dx > 0 || dz > 0 ? -Math.hypot(Math.max(dx, 0), Math.max(dz, 0)) : -Math.max(dx, dz);
}

/** Whether a bush or the house stands between an eye on the road and a point on the lawn: sampled along the sight line. */
function hidden(eye: P, p: P): boolean {
  for (let k = 0.02; k < 0.995; k += 0.004) {
    const at = { x: eye.x + (p.x - eye.x) * k, z: eye.z + (p.z - eye.z) * k };
    if (insideHouse(at) > 0 || HOUSE.shrubs.some((bush) => Math.hypot(at.x - bush.x, at.z - bush.z) < bush.r - 0.6)) return true;
  }
  return false;
}

/** Where the two of them are drawn, every tenth of a second of their run. */
function played(): { t: number; moa: P & { y: number; seen: boolean }; bertil: P & { y: number; seen: boolean } }[] {
  const stage = createStage(billsta, () => 0);
  const moa = stage.actors.get('moa')!, bertil = stage.actors.get('bertil')!;
  const run = billsta.scenes!.find((scene) => scene.id === 'bi:kids-run')!;
  stage.update({ id: 'card', seconds: 5 }, new Set(), { x: 1, y: 0 }, 5, 1 / 60, false);
  const told = new Set(['scene:card', 'beat:bi:new-trail']);
  const out = [];
  const at = (who: typeof moa) => ({ x: who.rig.group.position.x, y: who.rig.group.position.y, z: who.rig.group.position.z, seen: who.visible() });
  for (let i = 0; i <= Math.round(run.seconds * 10); i++) {
    const t = i / 10;
    stage.update({ id: run.id, seconds: t }, told, { x: 4, y: 0 }, 6 + t, 0.1, false);
    out.push({ t, moa: at(moa), bertil: at(bertil) });
  }
  return out;
}

describe('Moa and Bertil run up to the house and round it', () => {
  it('never through its walls, the bushes at its end, a tree, the pole, the car or their parents', () => {
    const trees = billsta.storm!.buildings!.filter((b) => b.kind === 'birch' || b.kind === 'spruce');
    const pole = billsta.storm!.buildings!.filter((b) => b.kind === 'pole');
    const car = billsta.storm!.buildings!.find((b) => b.kind === 'car')!;
    for (const frame of played()) for (const who of ['moa', 'bertil'] as const) {
      const p = frame[who];
      if (!p.seen) continue;
      const where = `${who} at ${frame.t} s (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`;
      // A child's shoulders are a good EL across: this far clear of every wall and bush.
      expect(insideHouse(p), `${where}: the house`).toBeLessThan(-1.5);
      for (const bush of HOUSE.shrubs) expect(Math.hypot(p.x - bush.x, p.z - bush.z) - bush.r, `${where}: the bushes`).toBeGreaterThan(1.5);
      // And of the plain house drawn where the family's own model is not.
      expect(insideBox(p, HOUSE.standIn), `${where}: the stand-in house`).toBeLessThan(-1.5);
      for (const tree of trees) expect(Math.hypot(p.x - tree.x, p.z - tree.z!), `${where}: the ${tree.kind} at ${tree.x}`).toBeGreaterThan(3.5);
      for (const one of pole) expect(Math.hypot(p.x - one.x, p.z - one.z!), `${where}: the pole`).toBeGreaterThan(1.2);
      // The car is drawn `size` of its `width` long, and about a third as wide as it is long.
      const long = car.width! * car.size!;
      expect(insideBox(p, { from: { x: car.x - long / 2, z: car.z! - long / 4 }, to: { x: car.x + long / 2, z: car.z! + long / 4 } }), `${where}: the car`).toBeLessThan(-1);
      // Mamma and Pappa by the car (the card's first keys).
      for (const parent of ['mamma', 'pappa'] as const) {
        const stands = billsta.scenes![0]!.stage!.actors![parent]![0]!;
        expect(Math.hypot(p.x - stands.x!, p.z - stands.z!), `${where}: ${parent}`).toBeGreaterThan(1.5);
      }
      // On the ground: the road, and the lawn a hair over it.
      expect(p.y, where).toBeGreaterThanOrEqual(-0.01);
      expect(p.y, where).toBeLessThanOrEqual(0.11);
    }
  });

  it('first towards the house, then along its front and round its left end, where the bushes and the house hide them', () => {
    const frames = played();
    for (const who of ['moa', 'bertil'] as const) {
      const seen = frames.filter((f) => f[who].seen).map((f) => f[who]);
      // Towards the house: straight up from the road, until they are close in front of its long wall.
      const close = seen.findIndex((p) => insideHouse(p) > -12);
      expect(close, who).toBeGreaterThan(0);
      for (let i = 1; i <= close; i++) expect(seen[i]!.z, `${who} goes on towards the house`).toBeLessThanOrEqual(seen[i - 1]!.z + 1e-6);
      expect(Math.abs(seen[close]!.x - seen[0]!.x), `${who} runs straight at it`).toBeLessThan(5);
      // Then along it to its left end, and round the bushes there: past them on the left, and in behind them.
      const far = HOUSE.shrubs[1];
      const beyond = seen.find((p) => p.x < far.x - far.r - 1.5 && Math.abs(p.z - far.z) < 2);
      expect(beyond, `${who} passes the bushes on their left`).toBeDefined();
      // Where they end, the bushes or the house stand between them and the road, wherever he is on it.
      const last = seen.at(-1)!;
      for (const x of [-2, 4, 10, 16, 22]) expect(hidden({ x, z: 14.4 }, last), `${who}, seen from x ${x}`).toBe(true);
      // And not long before it they were in plain sight from the ditch, beside the bushes.
      expect(hidden({ x: 16, z: 14.4 }, beyond!), `${who} beside the bushes`).toBe(false);
      // Gone only there: every frame after is unseen, and none before.
      const gone = frames.findIndex((f) => !f[who].seen);
      expect(gone).toBeGreaterThan(0);
      expect(frames.slice(gone).every((f) => !f[who].seen)).toBe(true);
      expect(frames[gone]!.t).toBeGreaterThanOrEqual(RUN[who].from + RUN[who].seconds);
    }
  });

  it('never through each other, Bertil a little behind Moa all the way', () => {
    const frames = played().filter((f) => f.moa.seen && f.bertil.seen);
    for (const f of frames) expect(Math.hypot(f.moa.x - f.bertil.x, f.moa.z - f.bertil.z), `at ${f.t} s`).toBeGreaterThan(1.8);
    // He comes round the bushes after her, within a few seconds.
    const behind = RUN.bertil.from + RUN.bertil.seconds - (RUN.moa.from + RUN.moa.seconds);
    expect(behind).toBeGreaterThan(0.8);
    expect(behind).toBeLessThan(3);
  });

  it('at an even pace, a child\'s eager run for their size, and no longer in all than before', () => {
    const frames = played();
    for (const who of ['moa', 'bertil'] as const) {
      const speeds: { t: number; v: number }[] = [];
      for (let i = 1; i < frames.length; i++) {
        const a = frames[i - 1]![who], b = frames[i]![who];
        if (a.seen && b.seen) speeds.push({ t: frames[i]!.t, v: Math.hypot(b.x - a.x, b.z - a.z) / 0.1 });
      }
      const fastest = Math.max(...speeds.map((s) => s.v));
      // In their own heights a second: a run (the stride is one from about 1.6), and under the 2.4 their steps can hold.
      expect(fastest / heightOf(who), who).toBeLessThan(2.4);
      expect(fastest / heightOf(who), who).toBeGreaterThan(1.6);
      // Even: once up to speed, and until slowing at the end, never under nine tenths of the fastest. As eased legs they
      // stopped at each corner.
      const { from, seconds } = RUN[who];
      for (const s of speeds.filter((s) => s.t > from + 1.6 && s.t < from + seconds - 1.2)) expect(s.v, `${who} at ${s.t} s`).toBeGreaterThan(0.9 * fastest);
    }
    // He stands at morfar's ladder until this scene is over (a held scene waits for it): it was 18.2 s.
    expect(billsta.scenes!.find((scene) => scene.id === 'bi:kids-run')!.seconds).toBeLessThanOrEqual(18.2);
  });
});

describe('a run that bends (src/render/run-route.ts)', () => {
  const through = [{ x: 0, z: 0 }, { x: 0, z: -10 }, { x: -6, z: -18 }, { x: -20, z: -20 }];
  const route = routeThrough(through);

  it('goes through every point, and is no shorter than the straight way between them', () => {
    for (const point of through) {
      const near = Math.min(...route.points.map((p) => Math.hypot(p.x - point.x, p.z - point.z)));
      expect(near).toBeLessThan(1e-6);
    }
    const straight = through.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - through[i]!.x, p.z - through[i]!.z), 0);
    expect(route.length).toBeGreaterThanOrEqual(straight);
    expect(route.length).toBeLessThan(straight * 1.1);
  });

  it('turns smoothly: the heading never steps', () => {
    let last = routeAt(route, 0).travel;
    for (let i = 1; i <= 400; i++) {
      const now = routeAt(route, i / 400).travel;
      let turned = now - last;
      turned -= Math.round(turned);
      expect(Math.abs(turned), `at ${i / 400}`).toBeLessThan(0.01);
      last = now;
    }
    // It sets off up the first stretch (away from the camera), and arrives along the last (to the left).
    expect(Math.abs(routeAt(route, 0).travel) % 1).toBeCloseTo(0.5, 1);
    expect(routeAt(route, 1).travel).toBeCloseTo(-0.25, 1);
  });

  it('is run from rest up to an even speed and down to rest, all of the way in its time', () => {
    for (const seconds of [3, 8, 15]) {
      expect(runProgress(0, seconds)).toBe(0);
      expect(runProgress(1, seconds)).toBe(1);
      expect(runRate(0, seconds)).toBe(0);
      expect(runRate(1, seconds)).toBe(0);
      let before = 0, area = 0;
      for (let i = 1; i <= 1000; i++) {
        const u = i / 1000, now = runProgress(u, seconds);
        expect(now).toBeGreaterThanOrEqual(before);
        // The progress is the area under the speed.
        area += runRate(u - 0.0005, seconds) / 1000;
        expect(now).toBeCloseTo(area, 3);
        before = now;
      }
      expect(runRate(0.5, seconds)).toBeCloseTo(runTop(seconds), 6);
    }
    // A long run is nearly all at its even speed; a move eased from rest to rest goes half as fast again as its mean.
    expect(runTop(15)).toBeLessThan(1.08);
  });
});
