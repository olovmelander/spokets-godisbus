import { readFileSync } from 'node:fs';
import { Box3, BufferGeometry, Color, DirectionalLight, DoubleSide, HemisphereLight, Mesh, MeshBasicMaterial, PerspectiveCamera, Raycaster, Scene, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import '../../src/content/aventyr2/aventyr2';
import { alven } from '../../src/content/aventyr2/chapters/alven';
import { flarken } from '../../src/content/aventyr2/chapters/flarken';
import { gungflyExtra, gungflyMat } from '../../src/render/gungfly';
import type { ExtraFrame } from '../../src/render/extensions';
import { openWaterAt } from '../../src/render/water';
import { SINK_DEPTH } from '../../src/sim/constants';

/**
 * Flärken's gungfly as it is drawn (src/render/gungfly.ts; Olov, 14 November 2026: "Kan vi förbättra designen
 * och texturerna på gungflyet som sjunker när Elof står stilla på det?"). They were plain dark green mounds. Each is a
 * raft of bog now, drawn in the place of the view's own mound and following it as the simulation sinks it: level where
 * he stands, down under the water at its sides, with water welling up round his boots as it sinks.
 */
const mats = flarken.tussocks!;
const camera = new PerspectiveCamera();
const frame = (clock: number, x: number, y: number, dt = 1 / 60, still = false): ExtraFrame =>
  ({ dt, clock, flags: new Set<string>(), x, y, camera, still, tier: 'mid', riding: false });

/** The gungfly in a scene with the view's own mounds, as the view has them: named, and moved by the simulation. */
function staged() {
  const scene = new Scene();
  const extra = gungflyExtra({ chapter: flarken, scene, sky: new Color(), hemisphere: new HemisphereLight(), sun: new DirectionalLight() })!;
  const own = mats.map((mat) => {
    const mound = new Mesh(new BufferGeometry(), new MeshBasicMaterial());
    mound.name = 'tussock';
    mound.position.set(mat.x, mat.y, 0);
    scene.add(mound);
    return mound;
  });
  return { scene, extra, own, drawn: scene.children.find((child) => child.name === 'gungfly')!.children.filter((child) => child.name === 'gungfly-mat') as Mesh[] };
}

describe("Flärken's gungfly", () => {
  it('is drawn for Flärken only, a raft for each of its sinking mats, in the place of the view\'s own mounds', () => {
    expect(gungflyExtra({ chapter: alven, scene: new Scene(), sky: new Color(), hemisphere: new HemisphereLight(), sun: new DirectionalLight() })).toBeNull();
    const { extra, own, drawn } = staged();
    expect(drawn.length).toBe(mats.length);
    expect(mats.length).toBe(4);
    extra.update(frame(0, 80, 0));
    for (const [i, mat] of mats.entries()) {
      // The view's mound is put away, and the raft is where it is.
      expect(own[i]!.visible).toBe(false);
      expect(drawn[i]!.visible).toBe(true);
      expect(drawn[i]!.position.x).toBe(mat.x);
      expect(Math.abs(drawn[i]!.position.y - mat.y)).toBeLessThan(0.03);
    }
    // The view names its mounds for it (src/render/view.ts, buildTussocks): without the name they would both be drawn.
    expect(readFileSync(new URL('../../src/render/view.ts', import.meta.url), 'utf8')).toMatch(/mesh\.name = 'tussock';/);
  });

  it('is level where he stands, wider than his footing, and goes down under the water at its sides', () => {
    const ray = new Raycaster();
    for (const [i, mat] of mats.entries()) {
      const water = openWaterAt(flarken, mat.x)! - mat.y;
      const shape = gungflyMat(mat.width, i * 1.7 + mat.x * 0.13, water);
      const raft = new Mesh(shape, new MeshBasicMaterial({ side: DoubleSide }));
      raft.updateMatrixWorld();
      // Along the play plane, from one end of his footing to the other: its top is where his feet are.
      for (let x = -mat.width / 2; x <= mat.width / 2 + 1e-6; x += mat.width / 8) {
        ray.set(new Vector3(x, 5, 0), new Vector3(0, -1, 0));
        const top = ray.intersectObject(raft)[0]?.point.y;
        expect(top, `mat ${i} at ${x.toFixed(2)}`).toBeDefined();
        // (A sprig or a berry may stand a little over the moss beside his way: the moss itself is within a finger of level.)
        expect(top!).toBeGreaterThan(-0.07);
        expect(top!).toBeLessThan(0.12);
      }
      const box = new Box3().setFromObject(raft);
      expect(box.min.x).toBeLessThan(-mat.width / 2 - 0.05);
      expect(box.max.x).toBeGreaterThan(mat.width / 2 + 0.05);
      // In front of the play plane and well behind it; and its sides go on down under the lake, sunk or not.
      expect(box.max.z).toBeGreaterThan(0.5);
      expect(box.min.z).toBeLessThan(-1.5);
      expect(box.min.y).toBeLessThan(water - SINK_DEPTH);
      // It grows something: sedge and cotton grass stand well over the moss.
      expect(box.max.y).toBeGreaterThan(0.5);
      // Greens, straw and rust-brown, never the red that read as blood here (HANDOVER #202): of all its surface, what
      // is plainly red is only the few cranberries, a hundredth of it or so.
      const colour = shape.getAttribute('color'), at = shape.getAttribute('position');
      const a = new Vector3(), b = new Vector3(), c = new Vector3();
      let red = 0, all = 0;
      for (let k = 0; k < at.count; k += 3) {
        const area = b.fromBufferAttribute(at, k + 1).sub(a.fromBufferAttribute(at, k)).cross(c.fromBufferAttribute(at, k + 2).sub(a)).length() / 2;
        all += area;
        if ([k, k + 1, k + 2].every((v) => colour.getX(v) > 0.12 && colour.getY(v) < colour.getX(v) * 0.3)) red += area;
      }
      expect(red / all).toBeLessThan(0.02);
    }
  });

  it('follows the simulation down as it sinks under him, tips towards him, and wells up round his boots', () => {
    const { scene, extra, own, drawn } = staged();
    const mat = mats[0]!, raft = drawn[0]!;
    const welling = scene.getObjectByName('gungfly-welling')!;
    const rings = scene.getObjectByName('gungfly-rings')!;
    extra.update(frame(0, 80, 0));
    expect(welling.visible).toBe(false);
    expect(rings.visible).toBe(false);
    // He stands on its right half while it sinks, a frame at a time, as the simulation sinks it.
    const at = mat.x + 0.6;
    let clock = 0;
    for (let sunk = 0; sunk <= 0.8; sunk += 0.02) {
      clock += 1 / 60;
      const y = mat.y - sunk * SINK_DEPTH;
      own[0]!.position.y = y;
      extra.update(frame(clock, at, y));
      // Its top stays under his boots: tipped about where he stands.
      const under = raft.position.y + Math.tan(raft.rotation.z) * (at - mat.x);
      expect(Math.abs(under - y), `sunk ${sunk.toFixed(2)}`).toBeLessThan(0.02);
    }
    // Down with it, tipped towards him (its right side lower), the water up round his boots, rings on the lake.
    expect(raft.position.y).toBeLessThan(mat.y - 0.25);
    expect(raft.rotation.z).toBeLessThan(-0.02);
    expect(welling.visible).toBe(true);
    expect(Math.abs(welling.position.x - at)).toBeLessThan(1e-6);
    expect(welling.position.y).toBeGreaterThan(own[0]!.position.y);
    expect(welling.position.y).toBeLessThan(own[0]!.position.y + 0.05);
    expect(rings.visible).toBe(true);
    // The other mats are where they were.
    for (const [i, other] of drawn.entries()) if (i > 0) expect(Math.abs(other.position.y - mats[i]!.y)).toBeLessThan(0.03);
    // He leaves it: it comes up again, dripping, and the welling is gone.
    const drops = scene.getObjectByName('gungfly-drops')!;
    let dripped = false;
    for (let sunk = 0.8; sunk >= 0; sunk -= 0.04) {
      clock += 1 / 60;
      own[0]!.position.y = mat.y - sunk * SINK_DEPTH;
      extra.update(frame(clock, mat.x + 3, mat.y));
      dripped ||= drops.visible;
      expect(welling.visible).toBe(false);
    }
    expect(dripped).toBe(true);
    own[0]!.position.y = mat.y;
    for (let i = 0; i < 120; i++) { clock += 1 / 60; extra.update(frame(clock, mat.x + 3, mat.y)); }
    expect(Math.abs(raft.position.y - mat.y)).toBeLessThan(0.03);
    expect(Math.abs(raft.rotation.z)).toBeLessThan(0.03);
    expect(drops.visible).toBe(false);
  });

  it('keeps still with less motion: no rocking, no rings, where the simulation has it', () => {
    const { scene, extra, own, drawn } = staged();
    const mat = mats[1]!;
    own[1]!.position.y = mat.y - 0.2;
    for (const clock of [0, 0.7, 1.9]) {
      extra.update(frame(clock, mat.x, mat.y - 0.2, 0.5, true));
      expect(drawn[1]!.position.y).toBeCloseTo(mat.y - 0.2, 6);
      expect(drawn[1]!.rotation.z).toBe(0);
      expect(drawn[0]!.position.y).toBe(mats[0]!.y);
      expect(scene.getObjectByName('gungfly-rings')!.visible).toBe(false);
    }
    // The water has still welled up where he stands on the sunk one.
    expect(scene.getObjectByName('gungfly-welling')!.visible).toBe(true);
  });
});
