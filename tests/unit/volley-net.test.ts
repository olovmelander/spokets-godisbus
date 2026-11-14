import { Box3, Color, DirectionalLight, HemisphereLight, PerspectiveCamera, Scene, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import '../../src/content/aventyr2/aventyr2';
import { alven } from '../../src/content/aventyr2/chapters/alven';
import { flarken } from '../../src/content/aventyr2/chapters/flarken';
import { NET, volleyNet, volleyNetExtra } from '../../src/content/aventyr2/volley-net';
import type { ExtraFrame } from '../../src/render/extensions';
import { GRAVITY } from '../../src/sim/constants';

/**
 * Flärken's volleyball net as it is drawn (src/content/aventyr2/volley-net.ts; Olov, 14 November 2026: "Kan vi förbättra
 * beachvolleynätets utseende och göra det tydligare att man kan hoppa på det för att studsa?"). It was a rope dipping
 * between two posts, squashed whole (posts and all) as a cranberry is when he bounced, and nothing showed its spring
 * before he tried it. Now it is a net that hangs where his bounce is, dips under him, springs back and quivers, and
 * the wind tosses a ball in it before he comes.
 */
const bouncer = flarken.bouncers![0]!;
const camera = new PerspectiveCamera();
const frame = (clock: number, x: number, y: number, dt = 1 / 60, still = false): ExtraFrame =>
  ({ dt, clock, flags: new Set<string>(), x, y, camera, still, tier: 'mid', riding: false });

/** He comes down on the net at `at` (from its middle) and is thrown up, as the simulation has it: a frame at a time. */
function bounceOn(net: ReturnType<typeof volleyNet>, at = 0, from = 5) {
  let clock = from, y = bouncer.y + 1.2, vy = -3;
  // Down onto it.
  while (y > bouncer.y) { net.update(frame(clock, bouncer.x + at, y)); clock += 1 / 60; vy -= GRAVITY / 60; y += vy / 60; }
  // And up from it at once, as high as the bouncer throws him.
  vy = Math.sqrt(2 * GRAVITY * bouncer.lift);
  const struck = clock;
  return {
    struck,
    /** Plays on for some seconds, he rising and falling away to the side; gives what `read` saw each frame. */
    play<T>(seconds: number, read: (since: number) => T): T[] {
      const seen: T[] = [];
      for (let t = 0; t < seconds; t += 1 / 60) {
        y += vy / 60; vy -= GRAVITY / 60;
        // (Onto the changing hut's roof, 2.9 up, where he then stands.)
        net.update(frame(clock, bouncer.x + at + Math.min(3, t * 3), t > 0.6 ? Math.max(y, 2.9) : y));
        seen.push(read(clock - struck));
        clock += 1 / 60;
      }
      return seen;
    },
  };
}

describe("Flärken's volleyball net", () => {
  it('is drawn where the chapter has a net to bounce on, and nowhere else', () => {
    const context = (chapter: typeof flarken) => ({ chapter, scene: new Scene(), sky: new Color(), hemisphere: new HemisphereLight(), sun: new DirectionalLight() });
    expect(volleyNetExtra(context(alven))).toBeNull();
    const at = context(flarken);
    expect(volleyNetExtra(at)).not.toBeNull();
    const net = at.scene.getObjectByName('volley-net')!;
    expect(net.position.x).toBe(bouncer.x);
    for (const part of ['volley-net-posts', 'volley-net-mesh', 'volley-net-tapes', 'volley-ball', 'volley-cone']) expect(net.getObjectByName(part), part).toBeDefined();
  });

  it('hangs between its posts with its foot where he lands, in front of the changing hut and behind the play plane', () => {
    const net = volleyNet(bouncer, 0);
    // Its foot's lowest point is the bouncer's top, in its middle; from there it rises to where it is made fast.
    expect(net.footAt(0).y).toBeCloseTo(bouncer.y, 5);
    expect(net.footAt(0.42).y - bouncer.y).toBeLessThan(0.06);
    expect(net.footAt(-NET.half).y).toBeCloseTo(NET.low, 5);
    for (let x = 0.25; x <= NET.half; x += 0.25) for (const side of [-1, 1]) expect(net.footAt(side * x).y).toBeGreaterThan(net.footAt(side * (x - 0.25)).y);
    // A net, as tall as he is in the middle and taller than he is at its posts, which stand two and a half of him high.
    expect(NET.top - bouncer.y).toBeGreaterThan(0.7);
    expect(NET.high - NET.low).toBeGreaterThan(0.8);
    expect(NET.post).toBeGreaterThan(NET.high + 0.2);
    // All of it behind the line he walks and in front of the hut's wall, 0.64 behind it (art/blender/flarken.py).
    const hut = flarken.storm!.buildings!.find((b) => b.kind === 'hut' && !b.tar)!;
    expect(hut.x - hut.width! / 2).toBeLessThan(bouncer.x + NET.half);
    net.group.updateMatrixWorld(true);
    for (const name of ['volley-net-mesh', 'volley-net-tapes']) {
      const mesh = net.group.getObjectByName(name)!;
      (mesh as unknown as { geometry: { computeBoundingBox(): void } }).geometry.computeBoundingBox();
      const box = new Box3().setFromObject(mesh);
      expect(box.max.z, name).toBeLessThan(0);
      expect(box.min.z, name).toBeGreaterThan(-0.6);
      expect(box.min.x).toBeGreaterThan(bouncer.x - NET.half - 0.1);
      expect(box.max.x).toBeLessThan(bouncer.x + NET.half + 0.1);
      expect(box.min.y).toBeGreaterThan(0.2);
    }
  });

  it('dips deep under him when he lands, springs up past where it hung, and quivers to rest', () => {
    const net = volleyNet(bouncer, 0);
    const bounce = bounceOn(net);
    const dips = bounce.play(3.2, (since) => ({ since, dip: net.dipAt(0) }));
    // Down at once: a third of him, within a tenth of a second.
    const first = dips.filter((d) => d.since < 0.1).map((d) => d.dip);
    expect(Math.min(...first)).toBeLessThan(-0.25);
    // Up past where it hung, within the first third of a second.
    expect(Math.max(...dips.filter((d) => d.since < 0.35).map((d) => d.dip))).toBeGreaterThan(0.1);
    // It goes on quivering: down and up again several times, each less than the last.
    const turns = dips.filter((d, i) => i > 0 && i < dips.length - 1 && d.since < 1.4 && (d.dip - dips[i - 1]!.dip) * (dips[i + 1]!.dip - d.dip) < 0 && Math.abs(d.dip) > 0.02);
    expect(turns.length).toBeGreaterThanOrEqual(4);
    // And is at rest again three seconds on, but for the wind in it and what the ball does.
    expect(Math.abs(dips[dips.length - 1]!.dip)).toBeLessThan(0.12);
    // Under where he landed it dips most: far along it, hardly at all.
    const other = volleyNet(bouncer, 0);
    const far = bounceOn(other).play(0.08, () => ({ here: other.dipAt(0), there: other.dipAt(2) }));
    expect(Math.abs(far[far.length - 1]!.there)).toBeLessThan(Math.abs(far[far.length - 1]!.here) * 0.3);
  });

  it('throws the ball up with him, and it bounces back down into the net', () => {
    const net = volleyNet(bouncer, 0);
    net.update(frame(4.9, bouncer.x - 4, 0));
    const rest = net.ball.y;
    const heights = bounceOn(net).play(3, () => net.ball.y - rest);
    expect(Math.max(...heights)).toBeGreaterThan(0.8);
    // Three bounces, each lower: the ball's height turns down at three tops.
    const tops = heights.filter((h, i) => i > 0 && i < heights.length - 1 && h > heights[i - 1]! && h >= heights[i + 1]! && h > 0.08);
    expect(tops.length).toBeGreaterThanOrEqual(3);
    expect(tops[1]!).toBeLessThan(tops[0]!);
    expect(tops[2]!).toBeLessThan(tops[1]!);
  });

  it('shows its spring before he comes: the wind tosses the ball in it, and it dips where the ball lands', () => {
    const net = volleyNet(bouncer, 0);
    net.update(frame(0, bouncer.x - 6, 0, 1 / 60, true));
    const rest = net.ball.y;
    let tosses = 0, high = 0, wasUp = false, deepest = 0;
    for (let clock = 0; clock < 9.2; clock += 1 / 60) {
      // He stands on the sand well before it.
      net.update(frame(clock, bouncer.x - 6, 0));
      const up = net.ball.y - rest;
      high = Math.max(high, up);
      if (up > 0.2 && !wasUp) tosses++;
      wasUp = up > 0.2;
      deepest = Math.min(deepest, net.dipAt(net.ball.x));
    }
    // Every two seconds or so, well up out of the net, and the mesh gives where it comes down.
    expect(tosses).toBeGreaterThanOrEqual(3);
    expect(high).toBeGreaterThan(0.3);
    expect(deepest).toBeLessThan(-0.04);
  });

  it('is not struck by a jump from the sand beside it, nor by walking past, and hangs still with less motion', () => {
    const net = volleyNet(bouncer, 0);
    // A jump on the sand at its middle: down to the ground and up again.
    let clock = 3, y = 0.8, vy = -4, deepest = 0;
    for (let i = 0; i < 90; i++) {
      vy -= GRAVITY / 60; y += vy / 60;
      if (y <= 0) { y = 0; vy = 9; }
      net.update(frame(clock, bouncer.x, y));
      deepest = Math.min(deepest, net.dipAt(0));
      clock += 1 / 60;
    }
    expect(deepest).toBeGreaterThan(-0.15);
    // With less motion: where it hangs, the ball lying in it.
    const calm = volleyNet(bouncer, 0);
    calm.update(frame(0, bouncer.x - 6, 0, 1 / 60, true));
    const lying = calm.ball.clone();
    for (let t = 1; t < 5; t += 0.37) {
      calm.update(frame(t, bouncer.x - 6, 0, 0.37, true));
      expect(calm.dipAt(0)).toBe(0);
      expect(calm.ball.distanceTo(lying)).toBeLessThan(1e-9);
    }
    expect(lying.y - calm.footAt(lying.x).y).toBeLessThan(0.35);
    expect(new Vector3().copy(lying).y).toBeGreaterThan(bouncer.y - 0.2);
  });
});
