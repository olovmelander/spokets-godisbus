import { Euler, Group, Matrix4, Quaternion, Vector3, type BufferGeometry, type InstancedMesh, type Material, type Object3D } from 'three';
import type { Assets } from '../../assets';
import { creatureClips, type CreatureClips } from '../../creature-clips';
import { sequence } from '../../dressing/kit';
import { drawnWhile } from '../../idle';
import { RICH_LAYER } from '../../rich';
import { girth, type Plan } from './plan';
import { being, fox, squirrel } from './shapes';

/**
 * The forest folk of the near life (../fauna.ts), modelled, rigged and animated in Blender (the creature overhaul, 13
 * November 2026): the red fox (art/blender/fox.py), the red squirrel (art/blender/squirrel.py) and the little forest
 * beings, vättar (art/blender/vatte.py), each a GLB of its own in the boot pack (fox.glb, squirrel.glb, vatte.glb).
 *
 * Each kind decides what it does here, every frame, and shows it two ways: with its rigged copies, one skinned mesh
 * each, once its GLB has come (`installForestFolk`, before the view's first frames); and until then, or without the
 * file, with the shapes built in code (./shapes.ts), one instanced draw for all of a kind, as the near life always had.
 * There are few of them (a fox, two or three squirrels, two beings a chapter), so a copy each costs a draw call each
 * only while it is in the picture, on Mid and High; Low draws none of the near life.
 *
 * The fox steps out from behind a trunk far back, trots, sniffs the moss, pounces now and then, sits down facing the
 * picture with its tail round its feet, looks at the camera, scratches or yawns, and trots off, never towards him. The
 * squirrel dashes up and round its trunk, stops dead and flicks its tail, and now and then runs down to sit at the foot of
 * its tree and nibble a cone, until he comes near and it leaps back onto the bark. The beings peek over their stones,
 * duck when he comes, blink at him, and now and then one waves.
 */

/** What every kind is told each frame (../fauna.ts `Now`). */
export interface FolkNow {
  t: number;
  dt: number;
  still: boolean;
  share: number;
  x: number;
  y: number;
  cx: number;
  cz: number;
  slope: number;
  day: number;
}
/** One instanced mesh of a kind's code-built shape (../fauna.ts `crowd`). */
export interface FolkCrowd {
  mesh: InstancedMesh;
  put(i: number, x: number, y: number, z: number, yaw: number, size: number, pitch?: number, roll?: number, tall?: number): void;
  matrix(i: number, matrix: Matrix4): void;
  pose(i: number, x: number, y?: number, z?: number, w?: number): void;
  hide(i: number): void;
}
export type FolkAdd = (shape: BufferGeometry, count: number, material?: Material, name?: string) => FolkCrowd;
export type FolkKind = (now: FolkNow) => void;

export type Folk = 'fox' | 'squirrel' | 'vatte';
/** What a fauna asks of the loader: so many copies of a kind, and what to do with them once they have come. */
export interface FolkWant { kind: Folk; count: number; install(rigs: CreatureClips[]): void }

// --- the fox's and the squirrel's own numbers, as their kits build them ------------------------------------------------

/** How big the fox is drawn: its kit and its code-built shape are 1 tall at the withers. */
export const FOX_SIZE = 2.3;
/** How far one stride of the fox's trot and of its walk carries it, in its own units (art/blender/fox.py). */
export const TROT_STRIDE = 0.7;
export const WALK_STRIDE = 0.42;
/** How far its pounce carries it, in its own units: the clip leaps on the spot, and the game carries it. */
export const LEAP = 1.0;
/** How far a squirrel comes in one bound, in EL (art/blender/squirrel.py RUN_STRIDE). */
export const STRIDE = 0.5;
/** How big a being is drawn: three quarters of him. */
export const BEING = 1.35;
/** How far down a being ducks in its `hide` clip, in its own units (art/blender/vatte.py HIDE). */
export const HIDE = 0.34;

// --- helpers ------------------------------------------------------------------------------------------------------------

const smooth = (k: number) => { const t = Math.min(1, Math.max(0, k)); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const hashed = (n: number) => { const v = Math.sin(n * 12.9898 + 4.1) * 43758.5453; return (v - Math.floor(v)) * 2 - 1; };
/** A look about: held, then a quick snap to the next way, at uneven times. */
const glance = (t: number, seed: number) => {
  const w = t * 0.85 + 0.4 * Math.sin(t * 0.7 + seed) + seed;
  const n = Math.floor(w);
  return hashed(n - 1) + (hashed(n) - hashed(n - 1)) * smooth((w - n) / 0.08);
};
const seen = (now: FolkNow, x: number, z: number, pad = 2) => Math.abs(x - now.cx) < (now.cz - z) * now.slope + pad;
const quota = (n: number, now: FolkNow) => (now.share < 1 ? Math.max(1, Math.round(n * now.share)) : n);
/** The way from a to b, the short way round. */
const turnTo = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
/** Eases v towards `to` at `rate` a second. */
const ease = (v: number, to: number, rate: number, dt: number) => v + (to - v) * Math.min(1, rate * dt);

const M = new Matrix4();
const R = new Matrix4();
const E = new Euler();
const Q = new Quaternion();
const P = new Vector3();
const S = new Vector3();
const F = new Vector3();
const U = new Vector3();
const W = new Vector3();
const UP = new Vector3(0, 1, 0);
const PQ = new Quaternion();
const TQ = new Quaternion();
const AX = new Vector3();

/** Whether the page was asked to show something at once (`?fox`, `?eat`), to look at it. */
function asked(name: string): boolean {
  try {
    return new URLSearchParams(globalThis.location?.search ?? '').has(name);
  } catch {
    return false;
  }
}

/** Turns a bone about a way in the world (its parents' pose as it is now), on top of what its clips posed. */
function turnBone(bone: Object3D | undefined, axis: Vector3, angle: number): void {
  if (!bone?.parent || Math.abs(angle) < 1e-5) return;
  bone.parent.getWorldQuaternion(PQ);
  AX.copy(axis).applyQuaternion(PQ.invert()).normalize();
  bone.quaternion.premultiply(TQ.setFromAxisAngle(AX, angle));
}

/** A set of rigged copies of one kind, until they come null: shown, posed and placed from the kind's own state. */
interface Rigs { list: CreatureClips[] | null }
/**
 * The copies go in a group of their own (`holder`), put in the fauna only once some have come, so that a fauna without
 * them is its instanced meshes alone, as it always was.
 */
function rigs(kind: Folk, count: number, holder: Group, wants: FolkWant[]): Rigs {
  const made: Rigs = { list: null };
  wants.push({
    kind, count,
    install(list) {
      const fauna = holder.userData.fauna as Object3D | undefined;
      if (fauna && !holder.parent) fauna.add(holder);
      for (const rig of list) {
        rig.root.name = `fauna-rigged:${kind}`;
        // For a session's pictures and the browser tests: what it shows (CreatureClips.showing), out of its userData, which
        // is copied as JSON when anything clones it.
        Object.defineProperty(rig.root, 'creatureClips', { value: rig });
        holder.add(rig.root);
        // What only Mid and High draw (../../rich.ts): laid here too, in case it comes after the view has laid its own.
        rig.root.traverse((part) => part.layers.set(RICH_LAYER));
        drawnWhile(rig.root, false);
      }
      made.list = list;
    },
  });
  return made;
}

/** Shows a rigged copy, or hides it; hidden, it is not posed at all. */
const shown = (rig: CreatureClips, on: boolean) => { if (rig.root.visible !== on) drawnWhile(rig.root, on); };

/**
 * The forest folk of a chapter's plan: their kinds, in the order the fauna updates them, and what each asks of the
 * loader. The rigged copies go in a group of their own in `fauna`; the code-built shapes are made by `add`. `sweets`
 * are the chapter's big candies (its checkpoints), tall on the path, which nothing of them sits behind.
 */
export function forestFolk(plan: Plan, add: FolkAdd, fauna: Object3D, sweets: readonly Sweet[] = []): { kinds: FolkKind[]; wants: FolkWant[] } {
  const wants: FolkWant[] = [];
  const holder = new Group();
  holder.name = 'fauna-rigged';
  holder.userData.fauna = fauna;
  const kinds = [squirrels(plan, add, holder, wants, sweets), foxes(plan, add, holder, wants), beings(plan, add, holder, wants)]
    .filter((kind): kind is FolkKind => kind !== null);
  return { kinds, wants };
}

/**
 * Puts the rigged forest folk in every fauna of the scene that asks for them, before the first frames: each kind's GLB,
 * copied for each of its places. Without a kind's file, or if it fails, its code-built shapes stay.
 */
export async function installForestFolk(assets: Assets, scene: Object3D): Promise<boolean> {
  const wants: FolkWant[] = [];
  scene.traverse((object) => {
    const asked = object.userData.forestFolk as FolkWant[] | undefined;
    if (!asked || object.userData.forestFolkAsked) return;
    object.userData.forestFolkAsked = true;
    wants.push(...asked);
  });
  if (wants.length === 0) return false;
  const manifest = await assets.manifest();
  const kinds = [...new Set(wants.map((want) => want.kind))].filter((kind) => manifest.packs.boot?.files[`${kind}.glb`]);
  const arrived = await Promise.all(kinds.map(async (kind) => {
    const model = await assets.model('boot', kind).catch((error) => {
      console.warn(`The ${kind} could not be loaded; its shape built in code stays.`, error);
      return null;
    });
    if (!model) return false;
    let any = false;
    for (const want of wants.filter((w) => w.kind === kind)) {
      const list: CreatureClips[] = [];
      for (let i = 0; i < want.count; i++) {
        const rig = creatureClips(model, kind, { fade: 0.3 });
        if (!rig) break;
        list.push(rig);
      }
      if (list.length !== want.count) continue;
      want.install(list);
      any = true;
    }
    return any;
  }));
  return arrived.includes(true);
}

// --- the squirrels: up and round their trunks, and now and then down to eat a cone at its foot -------------------------

/** A big candy of the chapter, where it is along the path and how high. */
export interface Sweet { x: number; y: number }

function squirrels(plan: Plan, add: FolkAdd, holder: Group, wants: FolkWant[], sweets: readonly Sweet[]): FolkKind | null {
  if (!plan.squirrels.length) return null;
  const crowd = add(squirrel(), plan.squirrels.length, undefined, 'squirrels');
  const rigged = rigs('squirrel', plan.squirrels.length, holder, wants);
  const next = sequence(11);
  // What a squirrel decides about the ground, apart from where it runs on its trunk: so that its trunk runs are as
  // they always were.
  const chance = sequence(13);
  type Where = 'trunk' | 'leap-off' | 'ground' | 'leap-on';
  const all = plan.squirrels.map((s) => ({
    ...s, a0: s.a, h0: s.h, a1: s.a, h1: s.h, k: 1, run: 0.5, long: 1, wait: next() * 2, fa: 0, fh: 1, flick: next() * 2,
    where: 'trunk' as Where, down: false, air: 0, eat: 0, flickT: 9, bounds: 0, look: 0, side: 1,
    from: new Matrix4(), to: new Matrix4(), place: new Matrix4(),
    // The sides of its trunk where it may sit on the ground: those where, seen from the path, no big candy stands in
    // front of it.
    sides: [-1, 1].filter((side) => {
      const x = s.tree.x + side * (girth(s.tree, 0.1) + 0.5);
      return sweets.every((c) => Math.abs(c.x - x) > 1.6 || c.y < s.tree.y - 3 || c.y > s.tree.y + 4);
    }),
  }));
  type One = (typeof all)[number];
  /** Where it sits at the foot of its tree: beside the trunk, a little in front, facing out across the picture. */
  const groundOf = (q: One, out: Matrix4) => {
    const tree = q.tree;
    const r = girth(tree, 0.1);
    F.set(q.side, 0, 0.5).normalize();
    U.set(0, 1, 0);
    W.crossVectors(F, U);
    return out.makeBasis(F, U, W).setPosition(tree.x + q.side * (r + 0.5), tree.y, tree.z + r * 0.4);
  };
  /** Where it is on the bark: at angle a round the trunk and height h, running along (fa, fh), belly to it. */
  const barkOf = (q: One, a: number, h: number, fa: number, fh: number, out: Matrix4, lift = 0) => {
    const tree = q.tree;
    U.set(Math.sin(a), 0, Math.cos(a));
    F.set(Math.cos(a) * fa, fh, -Math.sin(a) * fa).normalize();
    W.crossVectors(F, U);
    const r = girth(tree, h) + 0.03 + lift;
    return out.makeBasis(F, U, W).setPosition(tree.x + U.x * r, tree.y + h, tree.z + U.z * r);
  };
  /** Between two places, along an arc `high` over the straight way and round its trunk, turned from one's way to the other's. */
  const between = (q: One, a: Matrix4, b: Matrix4, k: number, high: number, out: Matrix4) => {
    const e = smooth(k);
    P.setFromMatrixPosition(a).lerp(W.setFromMatrixPosition(b), e);
    P.y += Math.sin(Math.PI * k) * high;
    const dx = P.x - q.tree.x, dz = P.z - q.tree.z, r = Math.hypot(dx, dz);
    const bark = girth(q.tree, Math.max(0, P.y - q.tree.y)) + 0.03;
    if (r < bark && r > 1e-6) { P.x = q.tree.x + (dx / r) * bark; P.z = q.tree.z + (dz / r) * bark; }
    Q.setFromRotationMatrix(a).slerp(TQ.setFromRotationMatrix(b), smooth(Math.min(1, k * 1.4)));
    return out.compose(P, Q, S.set(1, 1, 1));
  };
  const leapLong = 0.42;
  // `?eat` sends each down to eat as soon as it can, to look at it.
  const hungry = asked('eat');

  return (now) => {
    const list = rigged.list;
    for (const [i, q] of all.entries()) {
      const tree = q.tree;
      const rig = list?.[i];
      if (i >= quota(all.length, now) || !seen(now, tree.x, tree.z, tree.r + 3)) {
        crowd.hide(i);
        if (rig) shown(rig, false);
        continue;
      }
      // When he comes near its trunk, it runs higher, and stays up while he is there.
      const near = Math.abs(now.x - tree.x) < 3 + tree.r;
      const dt = now.still ? 0 : now.dt;
      let pose: 'run-up' | 'run' | 'leap' | 'sit-eat' | 'freeze' | 'tail-flick' = 'freeze';
      let phase = 0;
      if (q.where === 'trunk') {
        if (q.k < 1) q.k = Math.min(1, q.k + dt / q.run);
        else if (!now.still && q.down && !near) {
          // At the foot of the trunk, on its way down: it jumps off onto the ground in front.
          q.down = false;
          q.where = 'leap-off';
          q.air = 0;
          q.side = q.sides[Math.floor(chance() * q.sides.length)] ?? 1;
          q.from.copy(q.place);
          groundOf(q, q.to);
        } else if (!now.still && ((q.wait -= dt) <= 0 || (near && q.h < 6.5))) {
          q.a0 = q.a;
          q.h0 = q.h;
          // Now and then, low on its trunk and with him far off, it runs down head first to the moss.
          q.down = !near && !tree.snag && q.sides.length > 0 && q.h < 4 && (chance() < 0.35 || hungry);
          q.h1 = q.down ? 0.42 : near ? 7.2 + next() * 2.5 : Math.min(6, Math.max(1.3, q.h + (next() - 0.45) * 3.6));
          q.a1 = q.down ? (next() - 0.5) * 0.8 : Math.min(2.5, Math.max(-2.5, q.a + (next() - 0.5) * 2.8));
          const across = (q.a1 - q.a0) * girth(tree, (q.h0 + q.h1) / 2);
          const long = Math.max(0.3, Math.hypot(across, q.h1 - q.h0));
          q.fa = across / long;
          q.fh = (q.h1 - q.h0) / long;
          q.run = long / (near ? 5.5 : 3.8);
          q.long = long;
          q.k = 0;
          q.wait = 0.9 + next() * 2.6;
        }
        const dash = q.k < 1;
        const e = smooth(q.k);
        q.a = lerp(q.a0, q.a1, e);
        q.h = lerp(q.h0, q.h1, e);
        barkOf(q, q.a, q.h, q.fa, q.fh, q.place);
        // It bounds: a bound for each STRIDE it has come, so that no foot slides on the bark.
        q.bounds = (e * q.long) / STRIDE;
        if (dash) { pose = 'run-up'; phase = q.bounds; }
      } else if (q.where === 'leap-off' || q.where === 'leap-on') {
        q.air = Math.min(1, q.air + dt / leapLong);
        between(q, q.from, q.to, q.air, q.where === 'leap-off' ? 0.25 : 0.4, q.place);
        pose = 'leap';
        phase = Math.min(0.999, q.air);
        if (q.air >= 1) {
          if (q.where === 'leap-off') {
            q.where = 'ground';
            q.eat = 3.5 + chance() * 4;
            q.place.copy(q.to);
          } else {
            // Back on the bark, it runs on up.
            q.where = 'trunk';
            q.a = q.a0 = q.a1;
            q.h = q.h0 = q.h1 = 0.7;
            q.fa = 0;
            q.fh = 1;
            q.k = 1;
            q.wait = 0;
          }
        }
      } else {
        // On the ground: it sits up and eats, until he comes near or it has had enough.
        q.place.copy(q.to);
        pose = 'sit-eat';
        phase = now.t / 2;
        if (!now.still && ((q.eat -= dt) <= 0 || near)) {
          q.where = 'leap-on';
          q.air = 0;
          q.from.copy(q.to);
          q.a1 = (next() - 0.5) * 0.6;
          barkOf(q, q.a1, 0.7, 0, 1, q.to);
        }
      }
      // A pause has a flick of the tail now and then, and a look round in quick snaps.
      const paused = pose === 'freeze';
      if (paused && !now.still) q.flick -= dt;
      if (q.flick < -0.8) q.flick = 1 + next() * 2.5;
      const flick = q.flick < 0 ? Math.sin(-q.flick * 20) * Math.exp(q.flick * 4) * 0.6 : 0;
      if (paused && q.flick < 0) { pose = 'tail-flick'; phase = Math.min(0.999, -q.flick / 0.8); }
      if (rig) {
        crowd.hide(i);
        shown(rig, true);
        q.place.decompose(rig.root.position, rig.root.quaternion, rig.root.scale);
        rig.scrub(pose, phase);
        rig.update(now.still ? 0 : now.dt);
        // Stopped, it looks about, and as often as not at the picture.
        q.look = ease(q.look, paused || pose === 'sit-eat' ? 1 : 0, 6, now.dt);
        if (q.look > 0.01) {
          U.set(0, 1, 0).applyQuaternion(rig.root.quaternion);
          turnBone(rig.bone('head'), U, q.look * 0.45 * glance(now.t * 1.4, i * 2.7));
        }
        continue;
      }
      // The shape built in code: as it always moved.
      M.copy(q.place);
      if (pose === 'run-up') {
        const stride = phase * Math.PI * 2;
        M.multiply(R.makeTranslation(0, 0.05 * Math.abs(Math.sin(stride)), 0));
        crowd.matrix(i, M);
        crowd.pose(i, 0, 0.3 + 0.12 * Math.sin(stride + 1), 0, 0.8 * Math.sin(stride));
      } else {
        crowd.matrix(i, M);
        crowd.pose(i, 0, flick, 0.35 * glance(now.t * 1.4, i * 2.7), 0);
      }
    }
  };
}

// --- the fox: now and then, far back; it trots along, sniffs, pounces, sits and looks, and trots off ---------------------

/** How the forest's floor rises far behind the path (../../dressing/ground.ts, PROFILE_FOREST). */
const backOf = (z: number) => (z > -16 ? -0.15 - (0.1 * (-10 - z)) / 6 : z > -22 ? -0.25 + (0.25 * (-16 - z)) / 6 : (0.3 * (-22 - z)) / 8);

type FoxAct = 'out' | 'trot' | 'sniff' | 'pounce' | 'look' | 'sit' | 'scratch' | 'yawn';
/** How long each act lasts, at least and at most, in seconds (a pounce and a yawn as long as their clips). */
const FOX_ACTS: Record<FoxAct, readonly [number, number]> = {
  out: [1.4, 1.8], trot: [0, 0], sniff: [1.8, 3.2], pounce: [2.0, 2.0], look: [1.2, 2.2], sit: [2.2, 3.6], scratch: [1.2, 1.8], yawn: [2.17, 2.17],
};
/** What the fox does after each act: one of these, by chance. */
const FOX_NEXT: Record<FoxAct, readonly FoxAct[]> = {
  out: ['trot'], trot: ['sniff', 'look', 'sit'], sniff: ['pounce', 'look', 'sit'], pounce: ['look', 'sit'],
  look: ['sit', 'sit', 'sniff'], sit: ['scratch', 'yawn', 'sit', 'trot'], scratch: ['sit', 'trot'], yawn: ['sit', 'trot'],
};

function foxes(plan: Plan, add: FolkAdd, holder: Group, wants: FolkWant[]): FolkKind | null {
  if (!plan.fox) return null;
  const crowd = add(fox(), 1, undefined, 'fox');
  const rigged = rigs('fox', 1, holder, wants);
  const next = sequence(23);
  const first = 18 + next() * 20;
  const fx = {
    // `?fox` brings it out at once, to look at it (as `?soar` does the birds high over the place).
    on: false, wait: asked('fox') ? 1 : first, x: 0, z: 0, dir: 1, yaw: 0, act: 'out' as FoxAct, time: 0, long: 0, walked: 0,
    speed: 0, walk: 0, trot: 0, leaving: false, acts: 0, sat: 0, look: 0, startled: false,
  };
  const shoulder = new Matrix4();
  /** Level ground for it to do its things on, ahead of x: it goes by the path's ground, far back as it is. */
  const flat = (x: number, dir: number) => [0, 2, 4, 6, 8, 10].every((d) => Math.abs(plan.ground(x + dir * d) - plan.ground(x)) < 0.4);
  const begin = (act: FoxAct) => {
    fx.act = act;
    fx.time = 0;
    const [a, b] = FOX_ACTS[act];
    fx.long = a + (b - a) * next();
    fx.acts++;
  };
  const sitting = (act: FoxAct) => act === 'sit' || act === 'scratch' || act === 'yawn';
  return (now) => {
    const rig = rigged.list?.[0];
    if (!fx.on) {
      crowd.hide(0);
      if (rig) shown(rig, false);
      if ((fx.wait -= now.dt) > 0 || now.day < 0.5 || now.still) return;
      // It steps out from behind a trunk that is in the picture, a little way off to one side of him, and goes on away
      // from him: of those trunks, the nearest to him with level ground for it to trot on, so that it has the picture's
      // width to do its things in before it is out of it.
      const away = (t: { x: number }) => Math.sign(t.x - now.x) || 1;
      const tree = plan.trees
        .filter((t) => !t.snag && t.z < -7 && t.z > -18 && Math.abs(t.x - now.x) > 3 && Math.abs(t.x - now.cx) < (now.cz - t.z) * now.slope * 0.7 && flat(t.x, away(t)))
        .sort((a, b) => Math.abs(a.x - now.x) - Math.abs(b.x - now.x))[0];
      if (!tree) { fx.wait = 3; return; }
      const dir = away(tree);
      Object.assign(fx, {
        on: true, x: tree.x, z: Math.max(-24, Math.min(-12, tree.z - 3 - next() * 4)), dir, yaw: dir > 0 ? 0 : Math.PI, walked: 0,
        speed: 0, leaving: false, acts: 0, sat: 0, look: 0, startled: false,
      });
      begin('out');
    }
    const dt = now.still ? 0 : now.dt;
    const away = Math.abs(now.x - fx.x);
    // Never towards him: if he is ahead of it, it turns and trots the other way.
    if (!now.still && Math.sign(now.x - fx.x) === fx.dir && away > 1.5 && away < 30 && !sitting(fx.act) && fx.act !== 'pounce') fx.dir = -fx.dir;
    // He comes near (along the path; it is far back): it stops what it does, looks at him a moment, and trots off, away.
    if (!now.still && !fx.startled && away < 2.5 && fx.act !== 'pounce') {
      fx.startled = true;
      fx.leaving = true;
      fx.dir = Math.sign(fx.x - now.x) || fx.dir;
      begin('look');
      fx.long = 0.8;
    }
    fx.time += dt;
    if (fx.act !== 'trot' && fx.time >= fx.long) {
      // Seen enough, or done enough: it trots off, out of the picture.
      // Near the edge of the picture, it goes on out of it rather than do more there.
      if (fx.acts > 7 || fx.leaving || !seen(now, fx.x + fx.dir * 3, fx.z, -2)) { fx.leaving = true; begin('trot'); fx.walked = 0; }
      else {
        const options = FOX_NEXT[fx.act].filter((a) => a !== 'pounce' || Math.sign(now.x - fx.x) !== fx.dir);
        begin(options[Math.floor(next() * options.length)] ?? 'trot');
        if ((fx.act as FoxAct) === 'trot') fx.walked = 0;
      }
    } else if (fx.act === 'trot' && !fx.leaving && (fx.walked > (fx.acts > 2 ? 3 : 1.6) || !seen(now, fx.x, fx.z, -4) || Math.abs(plan.ground(fx.x + fx.dir * 3) - plan.ground(fx.x)) > 0.4)) {
      begin(FOX_NEXT.trot[Math.floor(next() * FOX_NEXT.trot.length)]!);
    }
    // Which way it faces: along its way, or, sitting, three quarters towards the picture.
    const along = fx.dir > 0 ? 0 : Math.PI;
    const sits = sitting(fx.act);
    const facing = sits ? along + (fx.dir > 0 ? -0.95 : 0.95) : along;
    fx.yaw += turnTo(fx.yaw, facing) * Math.min(1, now.dt * (sits ? 2.5 : 5));
    // It goes the way it faces: turning round, it stops until it has.
    const want = fx.act === 'out' ? 1.0 : fx.act === 'trot' ? 2.4 : 0;
    fx.speed = ease(fx.speed, want, 3, dt);
    const pace = fx.speed * dt * Math.max(0, Math.cos(fx.yaw - along));
    fx.x += fx.dir * pace;
    fx.walked += pace;
    // Its legs go by the way it has come, so that no foot slides over the ground, and it never trots on the spot.
    fx.walk += pace / (WALK_STRIDE * FOX_SIZE);
    fx.trot += pace / (TROT_STRIDE * FOX_SIZE);
    // The pounce carries it forward while it is in the air (frames 10 to 27 of its 48).
    let hop = 0;
    if (fx.act === 'pounce') {
      const air = (k: number) => smooth((k - 10 / 48) / (17 / 48));
      const k = fx.time / fx.long;
      fx.x += fx.dir * LEAP * FOX_SIZE * (air(k) - air((fx.time - dt) / fx.long));
      hop = Math.sin(Math.PI * Math.min(1, Math.max(0, (k - 10 / 48) / (17 / 48))));
    }
    // Gone once it is out of the picture on its way off, or wandered far out of it, or where the ground ahead steps up or
    // down (into the trees there); it comes again after a while.
    const step = Math.abs(plan.ground(fx.x + fx.dir * 0.8) - plan.ground(fx.x)) > 0.4;
    if (fx.act !== 'out' && (fx.leaving && fx.walked > 1 ? !seen(now, fx.x, fx.z, 4) || step : !seen(now, fx.x, fx.z, 12))) {
      fx.on = false;
      fx.wait = 40 + next() * 40;
      crowd.hide(0);
      if (rig) shown(rig, false);
      return;
    }
    fx.sat = ease(fx.sat, sits ? 1 : 0, 2.2, dt);
    // Sitting or looking, it turns its head to the picture.
    fx.look = ease(fx.look, sits && fx.act !== 'yawn' && fx.act !== 'scratch' ? 1 : fx.act === 'look' ? 0.7 : 0, 3, now.dt);
    const ground = plan.ground(fx.x) - backOf(fx.z);
    if (rig) {
      crowd.hide(0);
      shown(rig, true);
      rig.root.position.set(fx.x, ground, fx.z);
      rig.root.rotation.set(0, fx.yaw, 0);
      rig.root.scale.setScalar(FOX_SIZE);
      const moving = smooth(fx.speed / 0.5);
      if (moving > 0.02) {
        const trotting = smooth((fx.speed - 1.1) / 0.9);
        rig.scrub('walk', fx.walk, moving * (1 - trotting));
        rig.scrub('trot', fx.trot, moving * trotting);
        const still = fx.act === 'trot' || fx.act === 'out' ? 'look' : fx.act;
        if (moving < 0.98) rig.scrub(clipOf(still), (fx.time / rig.duration(clipOf(still))) % 1, 1 - moving);
      } else {
        const clip = clipOf(fx.act);
        const once = fx.act === 'pounce' || fx.act === 'yawn';
        rig.scrub(clip, once ? Math.min(0.999, fx.time / rig.duration(clip)) : fx.time / rig.duration(clip));
      }
      rig.update(now.still ? 0 : now.dt);
      if (fx.look > 0.01) {
        const toward = Math.atan2(-(now.cz - fx.z), now.cx - fx.x);
        const turn = Math.max(-1.1, Math.min(1.1, turnTo(fx.yaw, toward))) * fx.look;
        turnBone(rig.bone('neck'), UP, turn * 0.4);
        turnBone(rig.bone('head'), UP, turn * 0.6);
      }
      return;
    }
    // The shape built in code: it trots, and sits about its shoulder.
    const sit = smooth(fx.sat) * 0.45;
    const trot = fx.speed > 0.3 ? Math.sin(fx.trot * Math.PI * 2) : 0;
    shoulder.makeTranslation(-0.48, -0.66, 0).premultiply(R.makeRotationZ(sit)).premultiply(M.makeTranslation(0.48, 0.66, 0))
      .premultiply(R.makeScale(FOX_SIZE, FOX_SIZE, FOX_SIZE)).premultiply(M.makeRotationY(fx.yaw))
      .premultiply(R.makeTranslation(fx.x, ground + 0.05 * Math.abs(trot) + hop * 1.2, fx.z));
    crowd.matrix(0, shoulder);
    const look = fx.look * (fx.dir > 0 ? -0.6 : 0.6) + (fx.sat > 0.9 ? 0.2 * Math.sin(now.t * 0.9) : 0);
    crowd.pose(0, 0, 0.55 * trot, look, sit);
  };
}

/** The fox's clip for an act. */
const clipOf = (act: FoxAct): string => (act === 'pounce' ? 'mouse-jump' : act === 'out' ? 'walk' : act);

// --- the little beings: they peek out from behind their stones, duck back when he comes, blink and wave ---------------

type BeingAct = 'peek' | 'blink' | 'wave';

function beings(plan: Plan, add: FolkAdd, holder: Group, wants: FolkWant[]): FolkKind | null {
  if (!plan.beings.length) return null;
  const lichen = plan.beings[0]!.lichen;
  const crowd = add(being(lichen), plan.beings.length, undefined, 'beings');
  const rigged = rigs('vatte', plan.beings.length, holder, wants);
  const next = sequence(61);
  // What a being chooses to do while it is out, apart from its ducking and blinking: so that those are as they were.
  const chance = sequence(67);
  // `?wave` has them wave whenever he is near enough, to look at it.
  const friendly = asked('wave');
  const all = plan.beings.map((b) => ({
    ...b, out: 1, wait: 0, blink: 1 + next() * 3, act: 'peek' as BeingAct, actFor: 2 + chance() * 3, waved: false,
    w: { peek: 1, blink: 0, wave: 0 } as Record<BeingAct, number>, clock: chance() * 10,
  }));
  return (now) => {
    const list = rigged.list;
    for (const [i, b] of all.entries()) {
      const rig = list?.[i];
      if (i >= quota(all.length, now) || !seen(now, b.at[0], b.at[2], 2)) {
        crowd.hide(i);
        if (rig) shown(rig, false);
        continue;
      }
      const near = Math.abs(now.x - b.at[0]) < 3 && Math.abs(now.y - b.at[1]) < 4;
      if (!now.still) {
        // Quick to duck, slow and careful to come out again, a while after he has gone by.
        if (near) { b.out = Math.max(0, b.out - now.dt / 0.25); b.wait = 2 + next() * 2; }
        else if ((b.wait -= now.dt) <= 0) b.out = Math.min(1, b.out + now.dt / 1.4);
        b.blink -= now.dt;
        if (b.blink < -0.3) b.blink = 2.5 + next() * 3;
        b.clock += now.dt;
        // Out, it looks about, or watches him and blinks, or, with him not far, waves once in a while: shy and friendly.
        if ((b.actFor -= now.dt) <= 0) {
          const watching = Math.abs(now.x - b.at[0]) < 10;
          const r = chance();
          b.act = watching && (!b.waved || friendly) && (r < 0.4 || friendly) && b.out > 0.9 ? 'wave' : watching && r < 0.75 ? 'blink' : 'peek';
          if (b.act === 'wave') b.waved = true;
          if (!watching) b.waved = false;
          b.actFor = b.act === 'wave' ? 3 : b.act === 'blink' ? 1.5 * (1 + Math.floor(chance() * 2)) : 2.5 + chance() * 3;
          b.clock = 0;
        }
      }
      const out = smooth(b.out);
      const x = b.at[0] + b.side * b.wide * lerp(0.05, 0.32, out);
      const z = b.at[2] - b.deep - 0.28;
      const yaw = -Math.PI / 2 + b.side * 0.3;
      const roll = -b.side * (0.16 * out + 0.04 * Math.sin(now.t * 0.7 + i));
      if (rig) {
        crowd.hide(i);
        shown(rig, true);
        // Behind its stone, as high as it is when it peeks: its clips take it down out of sight. One on its stone's left
        // is drawn mirrored, so that it waves with the hand on its open side.
        E.set(roll, yaw, 0, 'YZX');
        rig.root.position.set(x, b.top - 0.36, z);
        rig.root.quaternion.setFromEuler(E);
        rig.root.scale.set(BEING, BEING, b.side < 0 ? -BEING : BEING);
        for (const act of ['peek', 'blink', 'wave'] as const) b.w[act] = ease(b.w[act], act === b.act ? 1 : 0, 4, now.dt);
        const sum = b.w.peek + b.w.blink + b.w.wave || 1;
        rig.scrub('hide', now.t / rig.duration('hide'), 1 - out);
        for (const act of ['peek', 'blink', 'wave'] as const) {
          if (b.w[act] > 0.001) rig.scrub(act, (act === 'peek' ? now.t + i * 1.7 : b.clock) / rig.duration(act), (out * b.w[act]) / sum);
        }
        rig.update(now.still ? 0 : now.dt);
        // It wears the cap of its place: a leaf in the forest, lichen on the bog and the mountain.
        rig.bone('cap.leaf')?.scale.setScalar(lichen ? 0 : 1);
        rig.bone('cap.lichen')?.scale.setScalar(lichen ? 1 : 0);
        continue;
      }
      // The shape built in code: out, its eyes are just over the top, and it leans out to one side to look.
      const shut = b.blink < 0 ? Math.sin((-b.blink / 0.3) * Math.PI) : 0;
      crowd.put(i, x, b.top - lerp(0.82, 0.36, out), z, yaw, BEING, 0, roll);
      crowd.pose(i, 0, 0, 0, shut);
    }
  };
}
