import { readFileSync } from 'node:fs';
import { Group, type Object3D, type SkinnedMesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { SICKAN, stormgard } from '../../src/content/aventyr2/chapters/stormgard';
import { words } from '../../src/content/aventyr2/lines/stormgard';
import { attachSickan, standInCat } from '../../src/content/aventyr2/sickan';
import {
  FPS, FRAMES, JUMP, LID_OPEN, SICKAN_SIZE, TROT_SPEED, TROT_STRIDE, WALK_STRIDE, createSickan, leapSeconds, placeFor, stepSickan,
  type SickanState,
} from '../../src/content/aventyr2/sickan-life';
import { heightAt, landscape } from '../../src/render/dressing/kit';
import { RUN_SPEED } from '../../src/sim/constants';

/**
 * Sickan, the family's black cat in Stormgården (Olov, 14 November 2026): her model from Blender, where she waits, and
 * her life played through without the picture.
 */

const FILE = 'art/baked/aventyr2/sickan.glb';
const CLIPS = ['walk', 'trot', 'stand', 'sit', 'greet', 'wash', 'crouch', 'stretch', 'shake', 'jump'];

/** The JSON of a GLB, as Blender wrote it (art/baked). */
function glb(path: string) {
  const buffer = readFileSync(path);
  return JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString('utf8')) as {
    nodes: { name?: string; skin?: number; mesh?: number }[];
    skins?: { joints: number[] }[];
    animations?: { name: string; channels: { target: { node: number } }[] }[];
  };
}

async function model(): Promise<Object3D> {
  const bytes = Uint8Array.from(readFileSync(FILE));
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer, '');
  gltf.scene.animations = gltf.animations;
  return gltf.scene;
}

const land = landscape(stormgard);
const ground = (x: number) => heightAt(land, x);
/** What the picture takes in, about him: the widest the chapter's cameras show at a phone held sideways. */
const VIEW = 11;

/** Her life with him going from `from` to `to` at `pace` EL a second, standing `rest` seconds at the end. */
function play(from: number, to: number, pace: number, { rest = 0, still = false, state = createSickan(SICKAN), flags = new Set<string>() } = {}) {
  const dt = 1 / 60;
  let x = from;
  const frames: { elof: number; state: SickanState }[] = [];
  const seen = (px: number) => Math.abs(px - x) < VIEW;
  for (let t = 0; x < to || t < rest; ) {
    if (x < to) x = Math.min(to, x + pace * dt);
    else t += dt;
    stepSickan(state, SICKAN, { dt, elof: { x, y: 0 }, still, flags, ground, seen });
    frames.push({ elof: x, state: { ...state, show: { ...state.show }, from: { ...state.from } } });
  }
  return { frames, state, x };
}

describe('Sickan from Blender (art/blender/sickan.py)', () => {
  it('is one skin on one mesh, with her bones by their names and every clip moving every bone', () => {
    const json = glb(FILE);
    expect(json.skins).toHaveLength(1);
    expect(json.nodes.filter((node) => node.skin !== undefined).map((node) => node.name)).toEqual(['sickan-kropp']);
    const joints = json.skins![0]!.joints.map((i) => json.nodes[i]!.name);
    for (const bone of ['hips', 'body', 'chest', 'neck', 'head', 'jaw', 'ear.L', 'ear.R', 'lid.L', 'lid.R', 'tail1', 'tail6', 'forearm.L', 'fpaw.R', 'shin.L', 'hpaw.R']) {
      expect(joints).toContain(bone);
    }
    // The IK controls her feet were set with are baked away.
    expect(joints.some((name) => name?.includes('_ik'))).toBe(false);
    expect(json.animations?.map((a) => a.name).sort()).toEqual(CLIPS.map((clip) => `sickan:${clip}`).sort());
    for (const animation of json.animations!) {
      const moved = new Set(animation.channels.map((channel) => channel.target.node));
      for (const joint of json.skins![0]!.joints) expect(moved.has(joint)).toBe(true);
    }
  });

  it('is counted by the game as the kit builds her: her strides, her lids, her leap, her clips\' lengths', async () => {
    const kit = readFileSync('art/blender/sickan.py', 'utf8');
    expect(kit).toContain(`WALK_STRIDE = ${WALK_STRIDE}`);
    expect(kit).toContain(`TROT_STRIDE = ${TROT_STRIDE}`);
    expect(kit).toContain(`LID_OPEN = ${LID_OPEN.toFixed(1)}`);
    expect(kit).toContain(`JUMP_FRAMES = ${JUMP.frames}`);
    expect(kit).toContain(`JUMP_LIFT = ${JUMP.lift}`);
    expect(kit).toContain(`JUMP_LAND = ${JUMP.land}`);
    const clips = new Map((await model()).animations.map((clip) => [clip.name, clip.duration]));
    for (const [name, frames] of Object.entries(FRAMES)) expect(clips.get(`sickan:${name}`)).toBeCloseTo(frames / FPS, 3);
    expect(clips.get('sickan:jump')).toBeCloseTo(JUMP.frames / FPS, 3);
  });

  it('goes into her holder with every clip, as one mesh that is drawn; a model without her clips is refused', async () => {
    const fit = new Group();
    expect(attachSickan(fit, new Group())).toBe(false);
    expect(fit.children).toHaveLength(0);
    expect(attachSickan(fit, await model())).toBe(true);
    const meshes: SkinnedMesh[] = [];
    fit.traverse((node) => { if ((node as SkinnedMesh).isSkinnedMesh) meshes.push(node as SkinnedMesh); });
    expect(meshes.map((mesh) => mesh.name)).toEqual(['sickan-kropp']);
  });

  it('is a cat of natural size beside an Elof of fifteen centimetres', async () => {
    // 1 EL is his 15 cm: 25 cm at the withers, about 46 cm from nose to rump, a tail of about 30 cm.
    expect(SICKAN_SIZE).toBeGreaterThanOrEqual(1.6);
    expect(SICKAN_SIZE).toBeLessThanOrEqual(1.8);
    const mesh = (await model()).getObjectByName('sickan-kropp') as SkinnedMesh;
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox!;
    const tailRoot = -0.6;
    // In her own measure she faces +x, y is up, and her feet stand at the origin.
    expect(box.min.y).toBeGreaterThan(-0.02);
    expect((box.max.x - tailRoot - 0.07) * SICKAN_SIZE).toBeGreaterThan(2.7);
    expect((box.max.x - tailRoot - 0.07) * SICKAN_SIZE).toBeLessThan(3.3);
    expect((tailRoot - box.min.x) * SICKAN_SIZE).toBeGreaterThan(1.6);
    expect(box.max.y * SICKAN_SIZE).toBeLessThan(2.8);
  });

  it('has a plain stand-in built in code, sitting and standing', () => {
    for (const sitting of [true, false]) {
      const shape = standInCat(sitting);
      shape.computeBoundingBox();
      expect(shape.getAttribute('color')).toBeDefined();
      expect(shape.boundingBox!.min.y).toBeGreaterThan(-0.05);
      expect(shape.boundingBox!.max.y).toBeGreaterThan(1.2);
      // Her ears sitting; the tip of her tail, held up, standing.
      expect(shape.boundingBox!.max.y).toBeLessThan(sitting ? 1.6 : 1.9);
    }
  });
});

describe('where Sickan waits in Stormgården', () => {
  it('is several places through the chapter, in order, each behind his path and near enough to be sharp', () => {
    expect(SICKAN.length).toBeGreaterThanOrEqual(5);
    for (const [i, place] of SICKAN.entries()) {
      // He walks at z 0: her near side is at least a body's width behind it, and she is no deeper than the picture is sharp.
      expect(place.z, place.id).toBeLessThanOrEqual(-2.5);
      expect(place.z, place.id).toBeGreaterThanOrEqual(-3.5);
      if (i > 0) {
        expect(place.x, place.id).toBeGreaterThan(SICKAN[i - 1]!.x);
        expect(place.go, place.id).toBeGreaterThan(SICKAN[i - 1]!.go);
      }
      // She leaves as he reaches her, or as he comes into her picture.
      if (i < SICKAN.length - 1) {
        expect(place.go, place.id).toBeLessThan(place.x + 3);
        expect(place.go, place.id).toBeGreaterThan(place.x - VIEW);
      }
    }
    // She has a way on from every place but the ditch's far bank (the flooded lawn is beyond it) and her last.
    expect(SICKAN.filter((place) => !place.path).map((place) => place.id)).toEqual(['far-bank', 'root']);
  });

  it('is on the ground, the deck or a step: her feet where something is to stand on', () => {
    for (const place of SICKAN) {
      // On the lawn, or where a height is given on what he walks there too (the deck).
      if (place.y !== undefined) expect(place.y, place.id).toBeCloseTo(heightAt(stormgard, place.x), 5);
      else expect(ground(place.x), place.id).toBeCloseTo(0, 5);
      // Never over water or a pit.
      for (const pool of stormgard.water ?? []) expect(place.x < pool.from - 0.8 || place.x > pool.to + 0.8, place.id).toBe(true);
    }
  });

  it('never lands a step of her way in the water, and leaps what is too wide to step over', () => {
    for (const place of SICKAN) {
      let from = { x: place.x, y: place.y ?? ground(place.x), z: place.z };
      for (const step of place.path ?? []) {
        const to = { x: step.x, y: step.y ?? ground(step.x), z: step.z };
        expect(step.z, `${place.id} → ${step.x}`).toBeLessThanOrEqual(-2.5);
        const wet = (stormgard.water ?? []).filter((pool) => pool.to > Math.min(from.x, to.x) && pool.from < Math.max(from.x, to.x));
        for (const pool of wet) {
          // Over water only in a leap, from bank to bank.
          expect(step.gait, `${place.id} over the water at ${pool.from}`).toBe('leap');
          expect(from.x).toBeLessThan(pool.from);
          expect(to.x).toBeGreaterThan(pool.to);
        }
        if (step.gait === 'leap') {
          expect(Math.hypot(to.x - from.x, to.z - from.z), `${place.id} leap to ${step.x}`).toBeLessThan(7.5);
          expect(leapSeconds(from, to)).toBeLessThan(0.9);
        } else {
          // Walked and trotted on the level, or up a slope: never down a drop.
          expect(Math.abs(to.y - from.y), `${place.id} → ${step.x}`).toBeLessThan(1.5);
        }
        from = to;
      }
    }
  });

  it('keeps clear of the sweets: none of the trail\'s is behind the path where she sits', () => {
    // Every sweet lies in the play plane (z 0), in front of her; none of them is ever covered by her.
    for (const place of SICKAN) expect(place.z).toBeLessThan(-1.6);
  });

  it('has Elof say two things about her, both passing remarks, the first where he first has room to say it', () => {
    const beats = (stormgard.beats ?? []).filter((beat) => beat.line.startsWith('sgSickan'));
    expect(beats.map((beat) => beat.id)).toEqual(['sg:sickan', 'sg:sickan-pots', 'sg:sickan-big']);
    // The first is said once: on the veranda, or else between the flowerpots.
    expect(beats.map((beat) => beat.line)).toEqual(['sgSickan', 'sgSickan', 'sgSickanBig']);
    expect(beats[1]!.until).toBe('beat:sg:sickan');
    for (const beat of beats) {
      expect(beat.who).toBe('elof');
      expect(beat.aside).toBeTruthy();
      expect(words.lines[beat.line]).toContain('Sickan');
      expect(words.lines[beat.line]!.length).toBeLessThanOrEqual(40);
      // Said where she is in his picture, ahead of him: the picture looks on ahead of him as he goes.
      const there = SICKAN.find((place) => place.x > beat.at! && place.x - beat.at! < 9.5);
      expect(there, beat.id).toBeDefined();
    }
    // They are the last of the chapter's beats: nothing before them changed its place in a saved game.
    expect((stormgard.beats ?? []).slice(-3).map((beat) => beat.id)).toEqual(['sg:sickan', 'sg:sickan-pots', 'sg:sickan-big']);
  });
});

describe('Sickan\'s life (src/content/aventyr2/sickan-life.ts)', () => {
  it('waits at each place as he comes to it, at a run from the chapter\'s start to its end', () => {
    const { frames } = play(stormgard.spawn.x, stormgard.goalX + 4, RUN_SPEED);
    const met = new Set<string>();
    for (const { elof, state } of frames) {
      const place = SICKAN[state.place]!;
      // As he comes within four EL of a place she is bound for, she is already there, resting.
      if (state.mode === 'rest' && elof < place.x && place.x - elof < 4) met.add(place.id);
    }
    // All but the bank she only waits on to leap from: every other place is a meeting.
    expect([...met]).toEqual(SICKAN.filter((place) => !place.passing).map((place) => place.id));
    expect(frames[frames.length - 1]!.state.place).toBe(SICKAN.length - 1);
    expect(frames[frames.length - 1]!.state.mode).toBe('rest');
  });

  it('is never moved while she is in the picture: she goes every way on her own feet, or unseen', () => {
    for (const pace of [RUN_SPEED, 1.2]) {
      const { frames } = play(stormgard.spawn.x, stormgard.goalX + 4, pace);
      for (let i = 1; i < frames.length; i++) {
        const a = frames[i - 1]!, b = frames[i]!;
        const moved = Math.hypot(b.state.x - a.state.x, b.state.z - a.state.z);
        const seen = (frame: typeof a) => Math.abs(frame.state.x - frame.elof) < VIEW;
        // A frame's step at her trot, or a leap's (its longest covers 7 EL in under a second).
        if (seen(a) || seen(b)) expect(moved, `at ${b.elof.toFixed(1)}, ${a.state.mode} → ${b.state.mode}`).toBeLessThan(0.3);
      }
    }
  });

  it('walks and trots without sliding: her stride is counted by how far she goes', () => {
    const { frames } = play(stormgard.spawn.x, 80, RUN_SPEED);
    let checked = 0;
    for (let i = 1; i < frames.length; i++) {
      const a = frames[i - 1]!.state, b = frames[i]!.state;
      if (a.mode !== 'go' || b.mode !== 'go' || a.gait !== b.gait || a.step !== b.step || a.place !== b.place) continue;
      const gone = Math.hypot(b.x - a.x, b.z - a.z);
      const stride = (b.gait === 'walk' ? WALK_STRIDE : TROT_STRIDE) * SICKAN_SIZE;
      expect(b.stride - a.stride).toBeCloseTo(gone / stride, 6);
      expect(b.show.clip).toBe(b.gait);
      checked++;
    }
    expect(checked).toBeGreaterThan(200);
    // And she is quicker than he is, so that she is ahead of him at the next place.
    expect(TROT_SPEED).toBeGreaterThan(RUN_SPEED * 1.4);
  });

  it('greets him as he comes near, and gets up as he reaches her', () => {
    const state = createSickan(SICKAN);
    const first = SICKAN[0]!;
    let run = play(first.x - 9, first.x - 7.5, RUN_SPEED, { state });
    expect(run.state.mode).toBe('rest');
    expect(run.state.doing).toBe('idle');
    run = play(first.x - 7.5, first.x - 5, RUN_SPEED, { state });
    expect(run.frames.some((frame) => frame.state.show.clip === 'greet')).toBe(true);
    run = play(first.x - 5, first.go + 0.2, RUN_SPEED, { state, rest: 0.6 });
    expect(['rise', 'go']).toContain(run.state.mode);
    // A child who dawdles up to her sees her stretch before she goes.
    const slow = play(first.x - 9, first.go + 0.1, 0.8, { rest: 0.5 });
    expect(slow.frames.some((frame) => frame.state.show.clip === 'stretch')).toBe(true);
  });

  it('leaps the ditch as he comes to the barrel, and sits on the far bank to watch', () => {
    const bank = SICKAN.findIndex((place) => place.id === 'bank');
    const ditch = stormgard.water![0]!;
    const { frames } = play(SICKAN[bank - 1]!.go - 3, SICKAN[bank]!.go + 2, RUN_SPEED, { rest: 4 });
    const air = frames.filter((frame) => frame.state.mode === 'leap' && frame.state.x > ditch.from && frame.state.x < ditch.to);
    expect(air.length).toBeGreaterThan(10);
    // Over the water she is in the air, well above it.
    for (const frame of air) expect(frame.state.y).toBeGreaterThan(0.3);
    expect(frames[frames.length - 1]!.state.place).toBe(bank + 1);
    expect(frames[frames.length - 1]!.state.mode).toBe('rest');
    expect(frames[frames.length - 1]!.state.x).toBeGreaterThan(ditch.to);
  });

  it('is where she would be by now in a game taken up at a safe place', () => {
    for (const checkpoint of stormgard.checkpoints ?? []) {
      const state = createSickan(SICKAN);
      stepSickan(state, SICKAN, { dt: 1 / 60, elof: checkpoint, still: false, flags: new Set(), ground, seen: () => true });
      expect(state.place).toBe(placeFor(SICKAN, checkpoint.x));
      expect(state.mode).toBe('rest');
      expect(state.x).toBe(SICKAN[state.place]!.x);
      // Ahead of him, or just beside him: never left behind, until her last place, where she stays.
      if (state.place < SICKAN.length - 1) expect(state.x).toBeGreaterThan(checkpoint.x - 3);
    }
  });

  it('with less motion rests at her places only, in each one\'s first pose, and changes place unseen', () => {
    const { frames } = play(stormgard.spawn.x, stormgard.goalX + 4, RUN_SPEED, { still: true });
    const places = new Set<string>();
    for (let i = 0; i < frames.length; i++) {
      const { elof, state } = frames[i]!;
      expect(state.mode).toBe('rest');
      expect(state.show.phase).toBe(0);
      expect(['sit', 'crouch', 'stand']).toContain(state.show.clip);
      places.add(SICKAN[state.place]!.id);
      if (i > 0 && frames[i - 1]!.state.place !== state.place) {
        // Neither where she was nor where she is now is in his picture as she changes.
        expect(Math.abs(frames[i - 1]!.state.x - elof)).toBeGreaterThanOrEqual(VIEW);
        expect(Math.abs(state.x - elof)).toBeGreaterThanOrEqual(VIEW);
      }
    }
    // The bank is too near the far bank to change unseen: she is never put there. Nor at a place that comes into a
    // wide picture before the one she left has gone from it; at the others he meets her as ever.
    expect(places.has('bank')).toBe(false);
    for (const id of ['veranda', 'pots', 'far-bank', 'playhouse', 'root']) expect(places.has(id), id).toBe(true);
  });
});
