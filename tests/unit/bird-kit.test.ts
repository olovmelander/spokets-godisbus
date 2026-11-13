import { readFileSync } from 'node:fs';
import { Box3, BufferGeometry, Group, InstancedMesh, MeshBasicMaterial, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { corvidStroke, hanging, smallStroke, wagtailBob } from '../../src/render/lift/fauna';
import { BIRD_KINDS, BIRD_RIGS, BIRD_TILT, birdFallback, birdKit, flockOf, installBirds, posedCorner, type BirdKind } from '../../src/render/lift/fauna/bird-kit';
import type { Assets } from '../../src/render/assets';

/**
 * The birds (the creature overhaul, 13 November 2026): modelled in Blender (art/blender/birds.py), moved in the vertex
 * stage by eight numbers a bird (src/render/lift/fauna/bird-kit.ts).
 */

const FILE = new URL('../../art/baked/boot/birds.glb', import.meta.url);

function nodes(): { name: string; extras: Record<string, unknown> }[] {
  const data = readFileSync(FILE);
  const length = data.readUInt32LE(12);
  const json = JSON.parse(data.subarray(20, 20 + length).toString('utf8')) as { nodes: { name: string; extras?: Record<string, unknown> }[] };
  return json.nodes.filter((node) => node.extras?.creature === 'bird').map((node) => ({ name: node.name, extras: node.extras! }));
}

async function model(): Promise<Group> {
  const data = readFileSync(FILE);
  const gltf = await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), '');
  return gltf.scene;
}

/** The corners of a shape that are part of `rig` (and on `side`), each as the numbers pose it. */
function corners(shape: BufferGeometry, rig: number, side?: number): number[] {
  const r = shape.getAttribute('rig');
  return Array.from({ length: r.count }, (_, i) => i).filter((i) => r.getX(i) === rig && (side === undefined || r.getY(i) === side));
}
const REST = [0, 0, 0, 0];
const box = (shape: BufferGeometry, which: number[], act: number[], act2: number[]) => which.reduce((b, i) => b.expandByPoint(posedCorner(shape, i, act, act2)), new Box3());

describe('the bird kit', () => {
  it('has every bird, each with its moving parts, and says how each moves', () => {
    const parts = nodes();
    for (const kind of BIRD_KINDS) {
      const own = parts.filter((p) => p.extras.species === kind);
      const rigs = own.map((p) => p.extras.rig).sort();
      const high = kind === 'raven' || kind === 'crow';
      // A small bird stands on its legs; a raven or a crow has them tucked up in its body.
      expect(rigs, kind).toEqual(high ? ['body', 'head', 'jaw', 'tail', 'wing', 'wing'] : ['body', 'head', 'jaw', 'legs', 'tail', 'wing', 'wing']);
      expect(own.filter((p) => p.extras.rig === 'wing').map((p) => p.extras.side).sort(), kind).toEqual([-1, 1]);
      // Tipped up at rest as the game levels it in flight.
      for (const p of own) expect(p.extras.tilt as number, `${kind} ${p.name}`).toBeCloseTo(BIRD_TILT[kind], 5);
      // A wing turns at its shoulder and bends at its wrist, out beyond it.
      for (const w of own.filter((p) => p.extras.rig === 'wing')) {
        const [sx, sy, sz] = w.extras.pivot as number[];
        const [jx, jy, jz] = w.extras.joint as number[];
        expect(Math.hypot(jx! - sx!, jy! - sy!, jz! - sz!), `${kind} ${w.name}`).toBeGreaterThan(0.15);
      }
    }
  });

  it('builds each bird into one shape, with the same numbers on its corners as the one built in code', async () => {
    const kit = birdKit(await model());
    expect([...kit.keys()].sort()).toEqual([...BIRD_KINDS].sort());
    for (const kind of BIRD_KINDS) {
      const shape = kit.get(kind)!;
      const code = birdFallback(kind);
      // The same attributes the same size: the kit's shape takes the place of the code's without a new program.
      const names = (g: BufferGeometry) => Object.entries(g.attributes).map(([name, a]) => `${name}:${a.itemSize}`).sort();
      expect(names(shape), kind).toEqual(names(code));
      for (const rig of Object.values(BIRD_RIGS)) {
        if (rig === BIRD_RIGS.legs && (kind === 'raven' || kind === 'crow')) continue;
        expect(corners(shape, rig).length, `${kind} rig ${rig}`).toBeGreaterThan(0);
      }
      // Its colours are its own: not all one.
      const colour = shape.getAttribute('color');
      const tones = new Set(Array.from({ length: colour.count }, (_, i) => Math.round(colour.getX(i) * 20) * 400 + Math.round(colour.getY(i) * 20) * 20 + Math.round(colour.getZ(i) * 20)));
      expect(tones.size, kind).toBeGreaterThan(6);
    }
  });

  it('folds a small bird\'s wings onto its flanks, and opens them out wide', async () => {
    const kit = birdKit(await model());
    for (const kind of BIRD_KINDS.filter((k) => k !== 'raven' && k !== 'crow')) {
      const shape = kit.get(kind)!;
      const body = box(shape, corners(shape, BIRD_RIGS.body), REST, REST);
      for (const side of [1, -1]) {
        const wing = corners(shape, BIRD_RIGS.wing, side);
        const folded = box(shape, wing, REST, REST);
        const open = box(shape, wing, [0, 1, 0, 0], REST);
        // Folded, it lies on its own side, close against the body, and runs back past it over the tail.
        expect(side > 0 ? folded.min.z : -folded.max.z, `${kind} ${side} folded on its side`).toBeGreaterThan(-0.03);
        expect(side > 0 ? folded.max.z : -folded.min.z, `${kind} ${side} folded close`).toBeLessThan((body.max.z - body.min.z) / 2 + 0.06);
        expect(folded.min.x, `${kind} ${side} folded back`).toBeLessThan(body.min.x + 0.12);
        // Open, it reaches out more than twice as far.
        expect(side > 0 ? open.max.z : -open.min.z, `${kind} ${side} open`).toBeGreaterThan(0.45);
      }
    }
  });

  it('beats its wings up and down, bends them at the wrist, and moves its head, bill, tail and legs', async () => {
    const kit = birdKit(await model());
    for (const kind of BIRD_KINDS) {
      const shape = kit.get(kind)!;
      const wing = corners(shape, BIRD_RIGS.wing, 1);
      const up = box(shape, wing, [0.8, 1, 0, 0], REST);
      const down = box(shape, wing, [-0.8, 1, 0, 0], REST);
      expect(up.max.y - down.max.y, `${kind} beats`).toBeGreaterThan(0.25);
      // The hand alone bends: the arm stays where the beat puts it.
      const hand = wing.filter((i) => shape.getAttribute('rig').getZ(i) > 0.99);
      const arm = wing.filter((i) => shape.getAttribute('rig').getZ(i) < 0.01);
      expect(box(shape, hand, [0, 1, 0, 0], [0, 0, 0, 0.6]).max.y - box(shape, hand, [0, 1, 0, 0], REST).max.y, `${kind} hand`).toBeGreaterThan(0.08);
      expect(box(shape, arm, [0, 1, 0, 0], [0, 0, 0, 0.6]).max.y).toBeCloseTo(box(shape, arm, [0, 1, 0, 0], REST).max.y, 5);
      // The head turns to the far side and nods down; the bill opens.
      const head = corners(shape, BIRD_RIGS.head);
      expect(box(shape, head, [0, 0, 0.8, 0], REST).getCenter(new Vector3()).z).toBeLessThan(box(shape, head, REST, REST).getCenter(new Vector3()).z);
      expect(box(shape, head, [0, 0, 0, 0.8], REST).min.y).toBeLessThan(box(shape, head, REST, REST).min.y);
      // The lower bill's tip drops as it opens.
      const jaw = corners(shape, BIRD_RIGS.jaw);
      const position = shape.getAttribute('position');
      const tip = jaw.reduce((a, b) => (position.getX(b) > position.getX(a) ? b : a));
      expect(posedCorner(shape, tip, REST, [0, 0, 1, 0]).y, `${kind} bill`).toBeLessThan(posedCorner(shape, tip, REST, REST).y - 0.02);
      // The tail rises, and fans out wider.
      const tail = corners(shape, BIRD_RIGS.tail);
      expect(box(shape, tail, REST, [0.5, 0, 0, 0]).getCenter(new Vector3()).y, `${kind} tail`).toBeGreaterThan(box(shape, tail, REST, REST).getCenter(new Vector3()).y + 0.04);
      const wide = (b: Box3) => b.max.z - b.min.z;
      expect(wide(box(shape, tail, REST, [0, 1, 0, 0])), `${kind} fan`).toBeGreaterThan(wide(box(shape, tail, REST, REST)) * 1.3);
      // A small bird's legs tuck up and back as its wings open.
      if (kind !== 'raven' && kind !== 'crow') {
        const legs = corners(shape, BIRD_RIGS.legs);
        expect(box(shape, legs, [0, 1, 0, 0], REST).min.y, `${kind} legs`).toBeGreaterThan(box(shape, legs, REST, REST).min.y + 0.05);
      }
    }
  });

  it('has a raven\'s and a crow\'s fingers spread at its wingtips, and a raven\'s tail a wedge', async () => {
    const kit = birdKit(await model());
    for (const kind of ['raven', 'crow'] as const) {
      const shape = kit.get(kind)!;
      // Out at the tip, the wing is split: across its chord there are gaps between the fingers.
      const out = corners(shape, BIRD_RIGS.wing, 1).map((i) => posedCorner(shape, i, [0, 1, 0, 0], REST));
      const reach = Math.max(...out.map((p) => p.z));
      const tips = out.filter((p) => p.z > reach * 0.88);
      const xs = tips.map((p) => Math.round(p.x * 50)).sort((a, b) => a - b);
      const gaps = xs.slice(1).filter((x, k) => x - xs[k]! > 1).length;
      expect(gaps, kind).toBeGreaterThanOrEqual(2);
    }
    // A raven's wedge: its middle feathers longest. A crow's round tail is nearly as long at its sides.
    const length = (kind: BirdKind, outer: boolean) => {
      const shape = kit.get(kind)!;
      const share = shape.getAttribute('rig');
      return Math.min(...corners(shape, BIRD_RIGS.tail).filter((i) => (Math.abs(share.getZ(i)) > 0.95) === outer).map((i) => shape.getAttribute('position').getX(i)));
    };
    expect(length('raven', true) - length('raven', false)).toBeGreaterThan(0.12);
    expect(length('crow', true) - length('crow', false)).toBeLessThan(0.08);
  });

  it('puts the kit\'s shapes in place of the code\'s, each mesh keeping its own numbers; without the file they stay', async () => {
    const loaded = await model();
    const assets = (files: Record<string, number>) => ({
      manifest: async () => ({ packs: { boot: { files } } }),
      model: async () => loaded,
    }) as unknown as Assets;
    const scene = new Group();
    const tits = flockOf('tit', 3, new MeshBasicMaterial());
    const ravens = flockOf('raven', 2, new MeshBasicMaterial());
    scene.add(tits, ravens);
    const act = tits.geometry.getAttribute('act');
    const act2 = tits.geometry.getAttribute('act2');
    const before = tits.geometry;
    expect(await installBirds(assets({}), scene)).toBe(false);
    expect(tits.geometry).toBe(before);
    expect(await installBirds(assets({ 'birds.glb': 1 }), scene)).toBe(true);
    expect(tits.geometry).not.toBe(before);
    expect(tits.geometry.getAttribute('act')).toBe(act);
    expect(tits.geometry.getAttribute('act2')).toBe(act2);
    expect((ravens as InstancedMesh).geometry.getAttribute('position').count).toBeGreaterThan(500);
    // Done once: a second call finds nothing that wants it.
    expect(await installBirds(assets({ 'birds.glb': 1 }), scene)).toBe(false);
  });
});

describe('how the birds move', () => {
  it('beats a small bird\'s wings with its hands trailing, and draws them in on the way up', () => {
    const [up, upOpen, upHand] = smallStroke(0, 0.95);
    expect(up).toBeCloseTo(0);
    // Rising (the stroke's start): wings drawn in, the hands trailing down.
    expect(upOpen).toBeLessThan(0.75);
    expect(upHand).toBeLessThan(-0.3);
    const [, downOpen, downHand] = smallStroke(Math.PI, 0.95);
    expect(downOpen).toBe(1);
    expect(downHand).toBeGreaterThan(0.3);
  });

  it('bobs a wagtail\'s tail up quick and down slow, and hangs a tit under its twig now and then', () => {
    const samples = Array.from({ length: 600 }, (_, k) => wagtailBob(k / 600 / 1.7, 0));
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...samples)).toBeCloseTo(1, 1);
    const rising = samples.slice(1).filter((v, k) => v > samples[k]! + 1e-6).length;
    expect(rising / samples.length).toBeLessThan(0.3);
    const hung = Array.from({ length: 1000 }, (_, k) => hanging(k * 0.1, 1));
    const share = hung.filter((u) => u > 0.99).length / hung.length;
    expect(share).toBeGreaterThan(0.25);
    expect(share).toBeLessThan(0.6);
  });

  it('glides a raven on wings held a little up, its fingers turned up; beating, its wings go deep', () => {
    const [glide, open, fingers] = corvidStroke(1, 0);
    expect(glide).toBeGreaterThan(0);
    expect(open).toBe(1);
    expect(fingers).toBeGreaterThan(0);
    const beats = Array.from({ length: 64 }, (_, k) => corvidStroke((k / 64) * Math.PI * 2, 1)[0]);
    expect(Math.max(...beats) - Math.min(...beats)).toBeGreaterThan(0.9);
  });
});
