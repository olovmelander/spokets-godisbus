import {
  Color, Euler, Group, InstancedBufferAttribute, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Vector3,
  type BufferGeometry, type Material, type PerspectiveCamera,
} from 'three';
import { PACK, type ExtraContext, type ExtraFrame, type ViewExtra } from '../extensions';
import { sequence } from '../dressing/kit';
import { drawnWhile } from '../idle';
import { faunaPlan, girth, type Landing, type Plan, type Soarer } from './fauna/plan';
import {
  BIRDS, CARVINGS, SOARING, bat, being, bird, butterfly, creatureMaterial, dragonfly, fox, glintMaterial, glints, herd, owl, plain, soarer, squirrel,
  type Species, type V3,
} from './fauna/shapes';

/**
 * The near forest's life (docs/visual-upgrade.md), behind the play plane in every chapter of both adventures:
 * squirrels that dash up their trunks, a fox far back now and then, owls at dusk, small birds that lift as he comes,
 * fireflies, dragonflies and butterflies, and the little forest beings and carved figures that peek out from behind
 * stones and roots. Where they live is ./fauna/plan.ts; their shapes ./fauna/shapes.ts.
 *
 * All of it is drawn on Mid and High only (the rich layer), one draw call a kind, and only while some of a kind is
 * in the picture. With less motion asked for, everything holds still and the birds stay where they sit.
 */
export function installFauna(): void {
  PACK.lifts.push(createFauna);
}

/** A visitor's coming and going: where it may come down, how long until it comes, and how long it stays. */
interface Visit { landings: readonly Landing[]; wait: number; stay: number }

/** What every kind is told each frame. */
interface Now {
  /** The creatures' own clock and step: both stand still with less motion. */
  t: number;
  dt: number;
  still: boolean;
  /** How many of each kind, on Mid against High. */
  share: number;
  /** Where he is. */
  x: number;
  y: number;
  /** The camera along the path, how far in front it is, and how wide the picture is for each EL away. */
  cx: number;
  cz: number;
  slope: number;
  /** 1 by day, fading to 0 at night; in the storm 0. */
  day: number;
}

/** Whether something at x, z (and `pad` around it) is in the picture. */
const seen = (now: Now, x: number, z: number, pad = 2) => Math.abs(x - now.cx) < (now.cz - z) * now.slope + pad;
const smooth = (k: number) => { const t = Math.min(1, Math.max(0, k)); return t * t * (3 - 2 * t); };
/** A number from -1 to 1 for each whole `n`, the same each time. */
const hashed = (n: number) => { const v = Math.sin(n * 12.9898 + 4.1) * 43758.5453; return (v - Math.floor(v)) * 2 - 1; };
/** A small bird's look about: held, then a quick snap to the next way, at uneven times. */
const glance = (t: number, seed: number) => {
  const w = t * 0.85 + 0.4 * Math.sin(t * 0.7 + seed) + seed;
  const n = Math.floor(w);
  return hashed(n - 1) + (hashed(n) - hashed(n - 1)) * smooth((w - n) / 0.08);
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const M = new Matrix4();
const R = new Matrix4();
const Q = new Quaternion();
const E = new Euler();
const P = new Vector3();
const S = new Vector3();
const F = new Vector3();
const U = new Vector3();
const W = new Vector3();
const NOWHERE = new Matrix4().makeScale(0, 0, 0);

/** A kind's mesh, and what it puts there this frame: shown only if anything of it is. */
function crowd(mesh: InstancedMesh) {
  const act = mesh.geometry.getAttribute('act') as InstancedBufferAttribute | undefined;
  let shown = false;
  return {
    mesh,
    /** Puts instance i at x, y, z, turned (yaw, then pitched and rolled), at a size. */
    put(i: number, x: number, y: number, z: number, yaw: number, size: number, pitch = 0, roll = 0, tall = size) {
      E.set(roll, yaw, pitch, 'YZX');
      mesh.setMatrixAt(i, M.compose(P.set(x, y, z), Q.setFromEuler(E), S.set(size, tall, size)));
      shown = true;
    },
    matrix(i: number, matrix: Matrix4) { mesh.setMatrixAt(i, matrix); shown = true; },
    /** Instance i stays where it was put. */
    keep() { shown = true; },
    pose(i: number, x: number, y = 0, z = 0, w = 0) { act?.setXYZW(i, x, y, z, w); },
    hide(i: number) { mesh.setMatrixAt(i, NOWHERE); },
    flush() {
      drawnWhile(mesh, shown);
      if (shown) {
        mesh.instanceMatrix.needsUpdate = true;
        if (act) act.needsUpdate = true;
      }
      shown = false;
    },
  };
}
type Crowd = ReturnType<typeof crowd>;

/** The near life of one chapter: null where it has none. */
export function createFauna(context: ExtraContext): ViewExtra | null {
  const { chapter } = context;
  const plan = faunaPlan(chapter, context.dressing);
  if (!plan) return null;
  const group = new Group();
  group.name = 'fauna';
  // Low draws none of it (../rich.ts).
  group.userData.rich = true;
  const material = creatureMaterial();
  const time = { value: 0 };
  const glow = { value: 0 };
  const glint = glintMaterial(time, glow);
  const crowds: Crowd[] = [];
  const adopt = (mesh: InstancedMesh) => {
    mesh.name ||= 'fauna-glints';
    group.add(mesh);
    const made = crowd(mesh);
    crowds.push(made);
    return made;
  };
  const add: Add = (shape, count, with_ = material, name = '') => {
    const made = adopt(herd(shape, count, with_));
    made.mesh.name = `fauna-${name}`;
    return made;
  };
  // The calm of the storm's eye, as the storm itself fades it.
  let calm = 0;
  const storm = chapter.storm;
  const kinds = [
    squirrels(plan, add),
    foxes(plan, add),
    owls(plan, add),
    birds(plan, add),
    soarers(plan, add),
    butterflies(plan, add),
    beings(plan, add),
    carvings(plan, add),
    plan.dragonflies.length + plan.fireflies ? lights(plan, add, adopt(glints(plan.dragonflies.length * 2 + plan.fireflies, glint)), glow) : null,
  ].filter((kind): kind is NonNullable<Kind> => kind !== null);
  if (plan.props.length) {
    const props = new Mesh(plain(plan.props), new MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
    props.name = 'fauna-props';
    group.add(props);
  }
  context.scene.add(group);
  // For a session's pictures: what of it is drawn (src/main.ts's ?debug has the draw calls). Not in a build.
  if (import.meta.env.DEV && typeof window !== 'undefined') (window as { __fauna?: Group }).__fauna = Object.assign(group, { plan });

  let clock = 0;
  return {
    update(frame: ExtraFrame) {
      const camera = frame.camera as PerspectiveCamera;
      if (frame.tier === 'low') {
        for (const c of crowds) c.flush();
        return;
      }
      const dt = frame.still ? 0 : Math.min(0.1, frame.dt);
      clock += dt;
      time.value = clock;
      if (storm?.calm) calm = Math.min(1, Math.max(0, calm + (frame.flags.has(storm.calm) ? 1 : -1) * (frame.still ? 1 : frame.dt / 3)));
      const now: Now = {
        t: clock, dt, still: frame.still, share: frame.tier === 'high' ? 1 : 0.6, x: frame.x, y: frame.y,
        cx: camera.position.x, cz: camera.position.z, slope: Math.tan((camera.fov * Math.PI) / 360) * camera.aspect,
        day: storm?.rain || plan.place === 'dusk' ? 0 : 1 - smooth(((frame.darkness ?? 0) - 0.25) / 0.4),
      };
      for (const kind of kinds) kind(now, calm);
      for (const c of crowds) c.flush();
    },
  };
}

type Add = (shape: BufferGeometry, count: number, material?: Material, name?: string) => Crowd;
/** How many of n are drawn: all on High, fewer on Mid. */
const quota = (n: number, now: Now) => (now.share < 1 ? Math.max(1, Math.round(n * now.share)) : n);
type Kind = ((now: Now, calm: number) => void) | null;

// --- squirrels: dash up and round their trunk, pause, flick the tail, dash on ------------------------------------

/** How far a squirrel comes in one stride, in EL. */
const STRIDE = 0.5;

function squirrels(plan: Plan, add: Add): Kind {
  if (!plan.squirrels.length) return null;
  const crowd = add(squirrel(), plan.squirrels.length, undefined, 'squirrels');
  const next = sequence(11);
  const all = plan.squirrels.map((s) => ({ ...s, a0: s.a, h0: s.h, a1: s.a, h1: s.h, k: 1, run: 0.5, long: 1, wait: next() * 2, fa: 0, fh: 1, flick: next() * 2 }));
  return (now) => {
    for (const [i, q] of all.entries()) {
      const tree = q.tree;
      if (i >= quota(all.length, now) || !seen(now, tree.x, tree.z, tree.r + 3)) { crowd.hide(i); continue; }
      // When he comes near its trunk, it runs higher, and stays up while he is there.
      const near = Math.abs(now.x - tree.x) < 3 + tree.r;
      if (q.k < 1) q.k = Math.min(1, q.k + now.dt / q.run);
      else if (!now.still && ((q.wait -= now.dt) <= 0 || (near && q.h < 6.5))) {
        q.a0 = q.a;
        q.h0 = q.h;
        q.h1 = near ? 7.2 + next() * 2.5 : Math.min(6, Math.max(1.3, q.h + (next() - 0.45) * 3.6));
        q.a1 = Math.min(2.5, Math.max(-2.5, q.a + (next() - 0.5) * 2.8));
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
      // On the bark, belly to it: forward along its way, its back out from the trunk.
      U.set(Math.sin(q.a), 0, Math.cos(q.a));
      F.set(Math.cos(q.a) * q.fa, q.fh, -Math.sin(q.a) * q.fa).normalize();
      W.crossVectors(F, U);
      // It bounds: a stride for each half length it has come, so that no foot slides on the bark.
      const stride = (e * q.long * Math.PI * 2) / STRIDE;
      const out = girth(tree, q.h) + 0.03 + (dash ? 0.05 * Math.abs(Math.sin(stride)) : 0);
      M.makeBasis(F, U, W).setPosition(tree.x + U.x * out, tree.y + q.h, tree.z + U.z * out);
      crowd.matrix(i, M);
      // A pause has a flick of the tail now and then, and a look round in quick snaps; a dash streams it out behind.
      if (!dash && !now.still) q.flick -= now.dt;
      if (q.flick < -0.8) q.flick = 1 + next() * 2.5;
      const flick = q.flick < 0 ? Math.sin(-q.flick * 20) * Math.exp(q.flick * 4) * 0.6 : 0;
      crowd.pose(i, 0, dash ? 0.3 + 0.12 * Math.sin(stride + 1) : flick, dash ? 0 : 0.35 * glance(now.t * 1.4, i * 2.7), dash ? 0.8 * Math.sin(stride) : 0);
    }
  };
}

// --- the fox: now and then, far back; it trots along, sits and looks, and trots off, never towards him -------------

/** How the forest's floor rises far behind the path (../dressing/ground.ts, PROFILE_FOREST). */
const backOf = (z: number) => (z > -16 ? -0.15 - (0.1 * (-10 - z)) / 6 : z > -22 ? -0.25 + (0.25 * (-16 - z)) / 6 : (0.3 * (-22 - z)) / 8);

function foxes(plan: Plan, add: Add): Kind {
  if (!plan.fox) return null;
  const crowd = add(fox(), 1, undefined, 'fox');
  const next = sequence(23);
  const SIZE = 2.3;
  const fx = { on: false, wait: 18 + next() * 20, x: 0, z: 0, dir: 1, yaw: 0, sat: false, sit: 0, k: 0, walked: 0, stay: 0, steps: 0 };
  const shoulder = new Matrix4();
  const flat = (x: number, dir: number) => [0, 3, 6, 9, 12, 15].every((d) => Math.abs(plan.ground(x + dir * d) - plan.ground(x)) < 0.4);
  return (now) => {
    if (!fx.on) {
      crowd.hide(0);
      if ((fx.wait -= now.dt) > 0 || now.day < 0.5 || now.still) return;
      // It steps out from behind a trunk that is in the picture, on the side away from him.
      const tree = plan.trees.find((t) => !t.snag && t.z < -7 && t.z > -18 && Math.abs(t.x - now.cx) < (now.cz - t.z) * now.slope * 0.6);
      const dir = tree ? Math.sign(tree.x - now.x) || 1 : 1;
      if (!tree || !flat(tree.x, dir)) { fx.wait = 3; return; }
      Object.assign(fx, { on: true, x: tree.x, z: Math.max(-24, Math.min(-12, tree.z - 3 - next() * 4)), dir, yaw: dir > 0 ? 0 : Math.PI, sat: false, sit: 0, k: 0, walked: 0, stay: 2.5 + next() * 1.5 });
    }
    // Never towards him: if he is ahead of it, it turns and trots the other way.
    if (!now.still && Math.sign(now.x - fx.x) === fx.dir && Math.abs(now.x - fx.x) > 1.5 && Math.abs(now.x - fx.x) < 30) fx.dir = -fx.dir;
    fx.yaw += (((fx.dir > 0 ? 0 : Math.PI) - fx.yaw) * Math.min(1, now.dt * 5));
    const sitting = !fx.sat && fx.walked > 4;
    if (sitting) {
      fx.sit = Math.min(1, fx.sit + now.dt / 0.7);
      if (fx.sit >= 1 && (fx.stay -= now.dt) <= 0) fx.sat = true;
    } else {
      fx.sit = Math.max(0, fx.sit - now.dt / 0.6);
      // It goes the way it faces: turning round, it stops until it has.
      const pace = 1.7 * now.dt * Math.max(0, Math.cos(fx.yaw - (fx.dir > 0 ? 0 : Math.PI)));
      if (fx.sit === 0) {
        fx.x += fx.dir * pace;
        fx.walked += pace;
        // Its legs go by the way it has come, so that no foot slides over the ground, and it never trots on the spot.
        fx.steps += pace * 3.8;
      }
    }
    // Gone once it has trotted out of the picture; it comes again after a while.
    if (fx.sat && !seen(now, fx.x, fx.z, 4)) {
      fx.on = false;
      fx.wait = 40 + next() * 40;
      crowd.hide(0);
      return;
    }
    const sit = smooth(fx.sit) * 0.45;
    const trot = fx.sit === 0 ? Math.sin(fx.steps) : 0;
    shoulder.makeTranslation(-0.48, -0.66, 0).premultiply(R.makeRotationZ(sit)).premultiply(M.makeTranslation(0.48, 0.66, 0))
      .premultiply(R.makeScale(SIZE, SIZE, SIZE)).premultiply(M.makeRotationY(fx.yaw))
      .premultiply(R.makeTranslation(fx.x, plan.ground(fx.x) - backOf(fx.z) + 0.05 * Math.abs(trot), fx.z));
    crowd.matrix(0, shoulder);
    // Sitting, it looks round at the picture, and a little about.
    const look = smooth(fx.sit) * (fx.dir > 0 ? -1.1 : 1.1) + (fx.sit > 0.9 ? 0.2 * Math.sin(now.t * 0.9) : 0);
    crowd.pose(0, 0, 0.55 * trot, look, sit);
  };
}

// --- owls: on a branch or a stump at dusk and by night; they blink slowly, and turn their heads now and then ----

function owls(plan: Plan, add: Add): Kind {
  if (!plan.owls.length) return null;
  const crowd = add(owl(), plan.owls.length, undefined, 'owls');
  const next = sequence(31);
  const all = plan.owls.map((o) => ({ ...o, from: 0, to: 0, k: 1, look: 2 + next() * 4, blink: 1 + next() * 3 }));
  return (now) => {
    for (const [i, o] of all.entries()) {
      if (now.day > 0.6 || !seen(now, o.at[0], o.at[2], 3)) { crowd.hide(i); continue; }
      if ((o.look -= now.dt) <= 0) {
        o.from = lerp(o.from, o.to, smooth(o.k));
        o.to = next() < 0.3 ? 0 : (next() - 0.5) * 1.8;
        o.k = 0;
        o.look = 4 + next() * 5;
      }
      o.k = Math.min(1, o.k + now.dt / 1.4);
      o.blink -= now.dt;
      if (o.blink < -1) o.blink = 3 + next() * 4;
      // Down in 0.35 s, shut for a moment, and up again in 0.45.
      // Its lids rest half down, sleepy and kind.
      const shut = 0.45 + 0.55 * (o.blink >= 0 ? 0 : -o.blink < 0.35 ? smooth(-o.blink / 0.35) : -o.blink < 0.55 ? 1 : 1 - smooth((-o.blink - 0.55) / 0.45));
      crowd.put(i, o.at[0], o.at[1], o.at[2], o.yaw, 1.8);
      crowd.pose(i, 0, 0, lerp(o.from, o.to, smooth(o.k)), shut);
    }
  };
}

// --- small birds: hop and peck behind the path; they lift as he comes, and come back once he has gone by ---------
// Visitors (one bird each) come by themselves: in from out of the picture, down where they like, a while there, and
// off again, so that the birds come and go whether he is near or not.

function birds(plan: Plan, add: Add): Kind {
  if (!plan.flocks.length && !plan.visitors.length) return null;
  const next = sequence(41);
  // The visitors' own chances, so that the flocks do what they always did.
  const chance = sequence(43);
  const meshes = new Map<Species, Crowd>();
  const counts = new Map<Species, number>();
  for (const f of plan.flocks) counts.set(f.species, (counts.get(f.species) ?? 0) + f.birds.length);
  for (const v of plan.visitors) counts.set(v.species, (counts.get(v.species) ?? 0) + 1);
  for (const [species, count] of counts) meshes.set(species, add(bird(BIRDS[species]), count, undefined, `birds:${species}`));
  const used = new Map<Species, number>();
  const member = (species: Species, at: V3, yaw: number) => {
    const i = used.get(species) ?? 0;
    used.set(species, i + 1);
    return {
      crowd: meshes.get(species)!, i, rest: [...at] as [number, number, number], yaw, home: at,
      doing: 0, k: 0, long: 0, wait: next() * 2, look: 0, look2: 0, hop: 0, from: 0,
      // Where it has come down in a tree, while he goes by.
      perch: null as V3 | null,
      fly: null as null | { a: V3; b: V3; c: V3; k: number; long: number; out: boolean },
      gone: false,
    };
  };
  const flocks = [
    ...plan.flocks.map((f) => ({ ...f, away: false, since: 0, side: 1, visit: null as Visit | null, birds: f.birds.map((b) => member(f.species, b.at, b.yaw)) })),
    // A visitor waits out of the picture first: away, and gone.
    ...plan.visitors.map((v) => {
      const one = member(v.species, [NaN, 0, -2], 0);
      one.gone = true;
      return { x: NaN, y: 0, species: v.species, perch: false, shelter: false, away: true, since: 0, side: 1, visit: { landings: v.landings, wait: 2 + chance() * 8, stay: 0 } as Visit | null, birds: [one] };
    }),
  ];
  type Flying = (typeof flocks)[number];
  const size = (s: Species) => BIRDS[s].size;
  /**
   * How near he may come before a visitor lifts, a big one sooner; and how far he is from it, along the path and back
   * from it: one that came down well behind the path lets him go by closer.
   */
  const shy = (s: Species) => 2.6 + size(s) * 0.4;
  const apart = (along: number, back: number) => Math.hypot(along, back * 0.8);
  /** A flight from a, over b, to c. */
  const flight = (a: V3, b: V3, c: V3, long: number, out: boolean, delay: number) => ({ a, b, c, k: -delay / long, long, out });
  /** They lift, one after the other, away from x and up into the trees or out of the picture. A visitor goes out of it. */
  const lift = (f: Flying, x: number) => {
    f.away = true;
    f.since = 0;
    f.side = Math.sign(f.x - x) || 1;
    const tree = f.visit ? undefined : plan.trees.find((t) => Math.sign(t.x - f.x) === f.side && Math.abs(t.x - f.x) > 3 && Math.abs(t.x - f.x) < 11 && t.z < -3 && t.z > -12);
    for (const b of f.birds) {
      const r = b.rest;
      // Onto a bough of that tree, in the picture; with no tree near, up and away out of it.
      const c: V3 = tree
        ? [tree.x + (next() < 0.5 ? -1 : 1) * (1.1 + next()), tree.y + 5 + next() * 2.6, tree.z + 0.3]
        : [r[0] + f.side * (8 + next() * 3), r[1] + 8 + next() * 2, r[2] - 3 - next() * 4];
      b.perch = tree ? c : null;
      b.fly = flight([...r], [r[0] + f.side * 1.2, r[1] + 2.2, r[2] - 0.5], c, 1.3 + next() * 0.6, true, next() * 0.35);
      b.doing = 0;
    }
  };
  return (now) => {
    for (const f of flocks) {
      const show = seen(now, f.x, -2, 4) && (f.shelter || now.day > 0.4);
      const visit = f.visit;
      if (now.still) {
        // With less motion every bird is where it sits; a visitor on its way is there, or gone.
        if (visit) {
          const b = f.birds[0]!;
          if (b.fly?.out) { b.gone = true; f.away = true; } else if (b.fly) b.rest = [...b.home];
          b.fly = null;
          b.doing = 0;
        } else {
          f.away = false;
          for (const b of f.birds) { b.fly = null; b.gone = false; b.perch = null; b.doing = 0; b.rest = [...b.home]; }
        }
      }
      if (visit && !now.still) {
        const b = f.birds[0]!;
        if ((!f.away || b.fly) && !seen(now, f.x, -2, 6)) {
          // Left behind out of the picture, sitting or on its way: it goes, unseen.
          f.away = b.gone = true;
          b.fly = b.perch = null;
          visit.wait = 2 + chance() * 6;
        }
        if (f.away) {
          if (b.gone && !b.fly && now.day > 0.4 && (visit.wait -= now.dt) <= 0) {
            // Somewhere in the picture, not so near him that it would lift again at once, and not where another
            // visitor sits.
            const others = flocks.filter((o) => o !== f && o.visit && !o.away).map((o) => o.x);
            const free = visit.landings.filter((l) => seen(now, l.at[0], l.at[2], -0.8) && apart(now.x - l.at[0], l.at[2]) > shy(f.species) + 0.7 && others.every((o) => Math.abs(o - l.at[0]) > 2.5));
            const land = free[Math.floor(chance() * free.length)];
            if (!land) visit.wait = 1 + chance() * 2;
            else {
              // In from the side away from him, out of the picture and over it, and down in a long curve.
              const side = Math.sign(land.at[0] - now.x) || 1;
              const half = (now.cz - land.at[2]) * now.slope;
              const from: V3 = [now.cx + side * (half + 2.5), land.at[1] + 4 + chance() * 3, land.at[2] - 1.5 - chance() * 2.5];
              Object.assign(f, { x: land.at[0], y: land.at[1], perch: land.bough, away: false, since: 0 });
              Object.assign(b, { home: land.at, rest: [...land.at], yaw: side > 0 ? Math.PI : 0, gone: false, perch: null, doing: 0, wait: 0.4 + chance() });
              b.fly = flight(from, [land.at[0] + side * 2.4, land.at[1] + 1.6, land.at[2] - 0.3], land.at, 1.9 + chance() * 0.7, false, 0);
              visit.stay = 6 + chance() * 9;
            }
          }
        } else if (!b.fly && (visit.stay -= now.dt) <= 0) {
          lift(f, now.x);
          visit.wait = 6 + chance() * 10;
        }
      }
      if (!f.shelter && !now.still && show) {
        const near = (visit ? apart(now.x - f.x, f.birds[0]!.rest[2]) < shy(f.species) : Math.abs(now.x - f.x) < 2.9 + f.birds.length * 0.3) && Math.abs(now.y - f.y) < 3.5;
        if (!f.away && near) {
          lift(f, now.x);
          if (visit) visit.wait = 6 + chance() * 10;
        }
        f.since += now.dt;
        if (!visit && f.away && f.since > 6 && Math.abs(now.x - f.x) > 6.5 && f.birds.every((b) => b.gone)) {
          // They come back from the side away from him, behind him now, and land where they were.
          const side = Math.sign(f.x - now.x) || 1;
          for (const b of f.birds) {
            const r = b.home;
            b.rest = [...r];
            b.fly = flight(b.perch ? [...b.perch] : [r[0] + side * (5 + next() * 3), r[1] + 5.5, r[2] - 3 - next() * 3], [r[0] + side * 1.4, r[1] + 1.6, r[2] - 0.4], r, 1.7 + next() * 0.5, false, next() * 0.5);
            b.gone = false;
            b.perch = null;
          }
          f.away = false;
        }
      }
      for (const [k, b] of f.birds.entries()) {
        const { crowd, i } = b;
        if (!show || (b.gone && !b.perch) || (k > 1 && now.share < 1)) { crowd.hide(i); continue; }
        const s = size(f.species);
        // A visitor bigger than a tit hops and dips by its size, and beats its wings slower.
        const big = f.visit ? Math.max(1, s) : 1;
        if (b.gone && b.perch) {
          // On its bough, looking about, until he has gone by.
          crowd.put(i, b.perch[0], b.perch[1], b.perch[2], b.yaw, s);
          crowd.pose(i, 0, 0, glance(now.t, i * 1.9) * 0.7, 0);
          continue;
        }
        if (b.fly) {
          const fl = b.fly;
          fl.k += now.dt / fl.long;
          if (fl.k < 0) {
            // Crouching for the spring, the moment before it goes.
            const crouch = fl.out ? smooth((fl.k * fl.long + 0.14) / 0.1) : 0;
            crowd.put(i, b.rest[0], b.rest[1] - crouch * 0.02, b.rest[2], b.yaw, s, -crouch * 0.15, 0, s * (1 - crouch * 0.12));
            crowd.pose(i, 0, 0, 0, 0);
            continue;
          }
          if (fl.k >= 1) {
            b.fly = null;
            if (fl.out) {
              b.gone = true;
              if (!b.perch) crowd.hide(i);
              continue;
            }
          } else {
            // Out it speeds up; coming back it slows to land.
            const k1 = fl.out ? fl.k ** 1.4 : 1 - (1 - fl.k) ** 2;
            const m = 1 - k1;
            const at = [0, 1, 2].map((j) => m * m * fl.a[j]! + 2 * m * k1 * fl.b[j]! + k1 * k1 * fl.c[j]!);
            const d = [0, 1, 2].map((j) => 2 * m * (fl.b[j]! - fl.a[j]!) + 2 * k1 * (fl.c[j]! - fl.b[j]!));
            // It turns into its way, and never in one frame.
            const wanted = Math.atan2(-d[2]!, d[0]!);
            b.yaw += Math.atan2(Math.sin(wanted - b.yaw), Math.cos(wanted - b.yaw)) * Math.min(1, now.dt * 9);
            // A small bird flies in bursts: a few quick beats, then wings shut for a moment, so that it rises and dips.
            // Coming down it brakes, with its wings wide and its beats slower.
            const coming = (!fl.out || !!b.perch) && fl.k > 0.72;
            const beating = coming || Math.sin(now.t * 7 + i * 2.1) > -0.35;
            const dip = coming ? 0 : Math.sin(now.t * 7 + i * 2.1 - 1) * 0.09 * big * Math.min(1, fl.k * 5);
            // Landing, it flares: body up, wings wide, to brake.
            const flare = coming && !fl.out ? smooth((fl.k - 0.8) / 0.16) : 0;
            crowd.put(i, at[0]!, at[1]! + dip, at[2]!, b.yaw, s, Math.atan2(d[1]!, Math.hypot(d[0]!, d[2]!)) * 0.6 * (1 - flare) + flare * 0.75);
            const spread = Math.min(1, fl.k * 6, coming ? 1 : (1 - fl.k) * 9);
            crowd.pose(i, (beating ? 0.95 : 0.12) * Math.sin((now.t * (coming ? 30 : 46 + (i % 4) * 3)) / Math.sqrt(big) + i * 1.7), spread * (beating ? 1 : 0.25), 0, 0);
            continue;
          }
        }
        // Where it sits: a peck, a hop, a look round. Sheltering from the rain it sits fluffed and only looks.
        if (b.doing === 0 && (b.wait -= now.dt) <= 0) {
          const r = next();
          b.doing = f.shelter || f.perch ? 3 : r < 0.45 ? 1 : r < 0.75 ? 2 : 3;
          b.long = b.doing === 1 ? 0.55 : b.doing === 2 ? 0.34 : 1.3;
          b.look = (next() - 0.5) * 1.4;
          b.look2 = (next() - 0.5) * 1.4;
          b.hop = (0.1 + next() * 0.14) * big;
          b.k = 0;
        }
        let peck = 0, turn = 0, up = 0, squat = 0;
        if (b.doing) {
          b.k += now.dt / b.long;
          const k = Math.min(1, b.k);
          if (b.doing === 1) peck = Math.abs(Math.sin(k * Math.PI * 2)) * 0.95;
          else if (b.doing === 3) {
            // A look round, in quick snaps of the head, each held: one way, another, and back.
            const snap = (at: number) => smooth((k - at) / 0.05);
            turn = b.look * (snap(0.06) - snap(0.5)) + b.look2 * (snap(0.5) - snap(0.9));
          } else if (b.doing === 4) {
            // Turning round: a little hop, and round in the air.
            up = Math.sin(k * Math.PI) * 0.04 * big;
            b.yaw = b.from + Math.PI * smooth(k);
          } else {
            // A hop: a crouch, then along the way it faces and a little up, and it lands with a give.
            squat = k < 0.24 ? Math.sin((k / 0.24) * Math.PI) : 0;
            const air = Math.max(0, (k - 0.24) / 0.76);
            up = (Math.sin(air * Math.PI) * 0.09 - squat * 0.015) * big;
            const step = k > 0.24 ? (b.hop * now.dt) / (b.long * 0.76) : 0;
            const z = b.rest[2] - Math.sin(b.yaw) * step;
            b.rest[0] += Math.cos(b.yaw) * step;
            // It keeps near where it came down: a hop on either side, and no nearer the path.
            if (z < -1.25 && Math.abs(z - b.home[2]) < 0.5) b.rest[2] = z;
          }
          if (b.k >= 1) {
            // Now and then, and when it has gone far enough, it turns round, never in one frame.
            if (b.doing === 2 && (next() < 0.35 || Math.abs(b.rest[0] - b.home[0]) > 0.3 * big)) {
              b.doing = 4; b.k = 0; b.long = 0.22; b.from = b.yaw;
            } else {
              b.doing = 0; b.wait = f.shelter ? 3 + next() * 5 : 0.3 + next() * 1.6;
            }
          }
        }
        const fluff = f.shelter ? 1.12 : 1;
        crowd.put(i, b.rest[0], (f.perch ? b.rest[1] : plan.ground(b.rest[0])) + up, b.rest[2], b.yaw, s * fluff, -squat * 0.12, 0, s * (f.shelter ? 1.08 : 1) * (1 - squat * 0.12));
        crowd.pose(i, 0, 0, turn, peck);
      }
    }
  };
}

// --- high over the place: ravens and crows circling by day, bats flitting at dusk --------------------------------

/**
 * How each flies: its size; how high over the ground under the camera and how far back; the circle it rides (ravens
 * and crows) or the patch it hunts over (bats); how fast it goes round; how fast its wings beat; and how much of the
 * time it beats them rather than gliding.
 */
const SOAR: Record<Soarer, { size: number; up: readonly [number, number]; z: readonly [number, number]; r: readonly [number, number]; turn: number; beat: number; flaps: number }> = {
  raven: { size: 1.9, up: [6.5, 9], z: [-15, -24], r: [3.5, 5.5], turn: 0.3, beat: 6, flaps: -0.2 },
  crow: { size: 1.5, up: [5.5, 8], z: [-13, -22], r: [3, 4.5], turn: 0.36, beat: 8, flaps: 0.2 },
  bat: { size: 0.75, up: [3.8, 5.4], z: [-5, -9], r: [2.2, 3], turn: 1, beat: 70, flaps: 2 },
};
/** The window of the world, round the camera, where each keeps its place: it is put anew only when it wraps, out of sight. */
const SKY_SPAN = { raven: 60, crow: 56, bat: 34 } as const;
/** `?soar` brings them over the middle of the picture as the view starts, to look at them (as `?life=` does the far life). */
function soarHere(): boolean {
  try {
    return new URLSearchParams(globalThis.location?.search ?? '').has('soar');
  } catch {
    return false;
  }
}

function soarers(plan: Plan, add: Add): Kind {
  if (!plan.soarers.length) return null;
  const next = sequence(97);
  const flights = plan.soarers.map(({ kind, count }) => {
    const crowd = add(kind === 'bat' ? bat() : soarer(SOARING[kind]), count, undefined, `soarers:${kind}`);
    const own = SOAR[kind];
    // Ravens and crows in twos, one a little behind the other on the same circle; bats each on its own.
    const all = Array.from({ length: count }, (_, i) => {
      const pair = kind !== 'bat' && i % 2 === 1;
      return {
        k: pair ? NaN : next() * SKY_SPAN[kind], phase: next() * 6.28, lag: pair ? 0.5 + next() * 0.3 : 0,
        up: own.up[0] + next() * (own.up[1] - own.up[0]), z: own.z[0] + next() * (own.z[1] - own.z[0]), r: own.r[0] + next() * (own.r[1] - own.r[0]),
        drift: (next() < 0.5 ? -1 : 1) * (0.25 + next() * 0.35), way: next() < 0.5 ? -1 : 1, yaw: 0, climb: 0, x: NaN, y: 0, zz: 0,
      };
    });
    for (const [i, one] of all.entries()) if (Number.isNaN(one.k)) Object.assign(one, { k: all[i - 1]!.k, z: all[i - 1]!.z, drift: all[i - 1]!.drift, way: all[i - 1]!.way, phase: all[i - 1]!.phase, up: all[i - 1]!.up + 0.6 });
    return { kind, crowd, own, all, ground: NaN };
  });
  const wrap = (v: number, span: number) => ((v % span) + span) % span;
  let asked = soarHere();
  return (now) => {
    for (const f of flights) {
      const { kind, crowd, own } = f;
      const span = SKY_SPAN[kind];
      if (asked) for (const [i, one] of f.all.entries()) one.k = now.cx + span / 2 - one.drift * now.t + (kind === 'bat' ? (i - 1) * 4 : 0);
      // The ground under the camera, slowly followed: they keep to the sky over the place, not over each step he takes.
      const under = plan.ground(now.cx);
      f.ground = Number.isNaN(f.ground) || now.still ? under : f.ground + (under - f.ground) * Math.min(1, now.dt * 0.5);
      const out = kind === 'bat' ? now.day > 0.5 : now.day < 0.5;
      for (const [i, one] of f.all.entries()) {
        if (out || i >= quota(f.all.length, now)) { crowd.hide(i); continue; }
        const t = now.t;
        const middle = now.cx - span / 2 + wrap(one.k + one.drift * t - now.cx, span);
        let x: number, y: number, z: number;
        if (kind === 'bat') {
          // A bat's way is all sudden turns: quick loops over its patch, up and down, never still.
          x = middle + one.r * Math.sin(t * 1.1 + one.phase) + 0.9 * Math.sin(t * 3.3 + 2 * one.phase);
          y = f.ground + one.up + 0.7 * Math.sin(t * 1.7 + one.phase) + 0.25 * Math.sin(t * 4.9 + one.phase);
          z = one.z + 1.2 * Math.sin(t * 0.8 + one.phase * 1.3);
        } else {
          // Round and round on a wide circle, the far side of it further back, and slowly along the sky.
          const a = one.phase + one.way * own.turn * t - one.lag;
          x = middle + one.r * Math.cos(a);
          y = f.ground + one.up + 0.5 * Math.sin(a * 0.5 + one.phase);
          z = one.z - 0.45 * one.r * Math.sin(a);
        }
        if (!seen(now, x, z, own.size * 1.5)) { crowd.hide(i); one.x = NaN; continue; }
        // It faces its way, turned smoothly, and noses up as it climbs: from where it was the frame before. Held
        // still, it keeps how it was turned.
        const went = Number.isNaN(one.x) ? 0 : Math.hypot(x - one.x, z - one.zz);
        if (went > 1e-5) {
          const wanted = Math.atan2(-(z - one.zz), x - one.x);
          one.yaw += Math.atan2(Math.sin(wanted - one.yaw), Math.cos(wanted - one.yaw)) * Math.min(1, now.dt * 6);
          one.climb = Math.atan2(y - one.y, went);
        }
        const climb = one.climb;
        one.x = x; one.y = y; one.zz = z;
        // Ravens and crows bank into their circle; a bat rolls as it jinks.
        const bank = kind === 'bat' ? 0.5 * Math.sin(t * 3.3 + 2 * one.phase) : -one.way * 0.32;
        crowd.put(i, x, y, z, one.yaw, own.size, climb * 0.5, bank);
        // Beats in bursts, and between them a glide on wings held a little up; a bat never glides.
        const beating = kind === 'bat' || Math.sin(t * 0.45 + one.phase * 3) < own.flaps;
        crowd.pose(i, beating ? 0.85 * Math.sin(t * own.beat + one.phase * 5) : -0.12, 1, 0, 0);
      }
    }
    asked = false;
  };
}

// --- butterflies: soft arcs by day, settling on a flower now and then ------------------------------------------

/** Brimstone, wood white and a blue: pale, and none red. */
const WINGS = ['#ece7a6', '#f4f2ea', '#9db4e0'].map((hex) => new Color(hex));

function butterflies(plan: Plan, add: Add): Kind {
  if (!plan.butterflies.length) return null;
  const crowd = add(butterfly(), plan.butterflies.length, undefined, 'butterflies');
  const next = sequence(53);
  const all = plan.butterflies.map((b, i) => {
    crowd.mesh.setColorAt(i, WINGS[i % 3]!);
    return { ...b, p: next() * 6.28, sit: 0, wait: 4 + next() * 8, stay: 0, flower: b.flowers[0]!, yaw: 0, x: b.home[0], y: b.home[1], z: b.home[2] };
  });
  return (now) => {
    for (const [i, b] of all.entries()) {
      if (i >= quota(all.length, now) || now.day < 0.5 || !seen(now, b.home[0], b.home[2], 4)) { crowd.hide(i); continue; }
      const t = now.t + b.p * 3;
      if (now.still) b.sit = 1;
      else if (b.wait > 0) {
        b.wait -= now.dt;
        b.sit = Math.max(0, b.sit - now.dt / 1.2);
        if (b.wait <= 0) { b.flower = b.flowers[Math.floor(next() * b.flowers.length)]!; b.stay = 3 + next() * 3; }
      } else {
        b.sit = Math.min(1, b.sit + now.dt / 1.6);
        if (b.sit >= 1 && (b.stay -= now.dt) <= 0) b.wait = 8 + next() * 9;
      }
      // Its own soft loops round its home, with the small sudden swerves of a butterfly's way, and a lift with each
      // downstroke of its wings.
      const beat = t * 38;
      const fx = b.home[0] + 1.5 * Math.sin(t * 0.31 + b.p) + 0.6 * Math.sin(t * 0.73 + 2 * b.p) + 0.16 * Math.sin(t * 2.9 + b.p) * Math.sin(t * 1.3);
      const fy = b.home[1] + 0.45 * Math.sin(t * 0.47 + b.p) + 0.12 * Math.sin(t * 2.3 + 2 * b.p) * Math.sin(t * 1.1) + 0.035 * Math.sin(beat + 1.2);
      const fz = Math.min(-1.2, b.home[2] - 0.6 * Math.sin(t * 0.27 + 1.3 * b.p));
      const k = smooth(b.sit);
      const x = lerp(fx, b.flower[0], k), y = lerp(fy, b.flower[1], k), z = lerp(fz, b.flower[2], k);
      // It turns into its way quickly, but never in one frame.
      if (!now.still && Math.hypot(x - b.x, z - b.z) > 1e-4) {
        const wanted = Math.atan2(-(z - b.z), x - b.x);
        b.yaw += Math.atan2(Math.sin(wanted - b.yaw), Math.cos(wanted - b.yaw)) * Math.min(1, now.dt * 10);
      }
      b.x = x; b.y = y; b.z = z;
      crowd.put(i, x, y, z, b.yaw, 1.4, 0, 0);
      // Flying, its wings beat about six times a second, held up in a V; sitting, they stand closed over its back
      // and open slowly.
      crowd.pose(i, k > 0.95 ? -1.35 + 0.3 * (0.5 + 0.5 * Math.sin(t * 1.4)) : lerp(-0.45 + 0.9 * Math.sin(beat), -1.2, k), 1);
    }
  };
}

// --- the little beings: they peek out from behind their stones, and duck back when he comes ----------------------

/** How big a being is drawn: three quarters of him. */
const BEING = 1.35;

function beings(plan: Plan, add: Add): Kind {
  if (!plan.beings.length) return null;
  const crowd = add(being(plan.beings[0]!.lichen), plan.beings.length, undefined, 'beings');
  const next = sequence(61);
  const all = plan.beings.map((b) => ({ ...b, out: 1, wait: 0, blink: 1 + next() * 3 }));
  return (now) => {
    for (const [i, b] of all.entries()) {
      if (i >= quota(all.length, now) || !seen(now, b.at[0], b.at[2], 2)) { crowd.hide(i); continue; }
      const near = Math.abs(now.x - b.at[0]) < 3 && Math.abs(now.y - b.at[1]) < 4;
      if (!now.still) {
        // Quick to duck, slow and careful to come out again, a while after he has gone by.
        if (near) { b.out = Math.max(0, b.out - now.dt / 0.25); b.wait = 2 + next() * 2; }
        else if ((b.wait -= now.dt) <= 0) b.out = Math.min(1, b.out + now.dt / 1.4);
        b.blink -= now.dt;
        if (b.blink < -0.3) b.blink = 2.5 + next() * 3;
      }
      const out = smooth(b.out);
      const shut = b.blink < 0 ? Math.sin((-b.blink / 0.3) * Math.PI) : 0;
      // Behind its stone: out, its eyes are just over the top, and it leans out to one side to look.
      crowd.put(i, b.at[0] + b.side * b.wide * lerp(0.05, 0.32, out), b.top - lerp(0.82, 0.36, out), b.at[2] - b.deep - 0.28, -Math.PI / 2 + b.side * 0.3, BEING, 0,
        -b.side * (0.16 * out + 0.04 * Math.sin(now.t * 0.7 + i)));
      crowd.pose(i, 0, 0, 0, shut);
    }
  };
}

// --- carved figures: they stand where they were left; one of them tips back as he goes by ------------------------

function carvings(plan: Plan, add: Add): Kind {
  if (!plan.carvings.length) return null;
  const wood = new MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
  const shapes = [...new Set(plan.carvings.map((c) => c.shape))];
  const crowds = new Map(shapes.map((shape) => [shape, add(CARVINGS[shape]('#d6bf98'), plan.carvings.filter((c) => c.shape === shape).length, wood, `carving:${shape}`)]));
  const all = plan.carvings.map((c, n) => ({ ...c, crowd: crowds.get(c.shape)!, i: plan.carvings.slice(0, n).filter((o) => o.shape === c.shape).length, tip: -1, armed: true }));
  return (now) => {
    for (const [n, c] of all.entries()) {
      if (!seen(now, c.at[0], c.at[2], 2)) { c.crowd.hide(c.i); continue; }
      // The first rocks back on its foot when he passes, and settles.
      if (n === 0 && !now.still) {
        const by = Math.abs(now.x - c.at[0]);
        if (c.armed && by < 1) { c.tip = 0; c.armed = false; }
        if (by > 3) c.armed = true;
        if (c.tip >= 0) c.tip += now.dt;
        if (c.tip > 3) c.tip = -1;
      }
      const t = c.tip;
      const back = t < 0 ? 0 : t < 0.25 ? 0.3 * smooth(t / 0.25) : 0.3 * Math.exp(-(t - 0.25) * 2.4) * Math.cos((t - 0.25) * 6);
      // Tipped back about its foot: away from the camera, whichever way it faces.
      E.set(-back, 0, 0, 'YXZ');
      Q.setFromEuler(E);
      M.compose(P.set(...c.at), Q, S.setScalar(1.4)).multiply(R.makeRotationY(c.yaw));
      c.crowd.matrix(c.i, M);
    }
  };
}

// --- glints: fireflies at dusk and in the storm's calm; dragonflies over the water by day, their wings glints -----

/** Fireflies' soft warm green, and a dragonfly wing's pale shine. */
const GREEN = new Color('#d4f09a');
const SHEEN = new Color('#cfe6ea');

function lights(plan: Plan, add: Add, shine: Crowd, glow: { value: number }): Kind {
  const flies = plan.dragonflies.length;
  const fireflies = plan.fireflies;
  if (!flies && !fireflies) return null;
  const bodies = flies ? add(dragonfly(), flies, undefined, 'dragonflies') : null;
  const fly = shine.mesh.geometry.getAttribute('fly') as InstancedBufferAttribute;
  const next = sequence(71);
  const SPAN = 30;
  const swarm = Array.from({ length: fireflies }, (_, i) => {
    fly.setXYZW(flies * 2 + i, next() * 6.28, 0.4 + next() * 0.5, 0.25 + next() * 0.3, 1.1 + next() * 0.5);
    shine.mesh.setColorAt(flies * 2 + i, GREEN);
    return { k: next() * SPAN, up: 0.3 + next() * 1.9, z: -1.9 - next() * 5, at: NaN };
  });
  const darts = plan.dragonflies.map((home, d) => {
    for (const w of [0, 1]) { fly.setXYZW(d * 2 + w, 0, 0, 0, 0.45); shine.mesh.setColorAt(d * 2 + w, SHEEN); }
    return { home, from: [...home], to: [...home], k: 1, wait: next() * 2, yaw: 0, face: 0, long: 0.3 };
  });
  return (now, calm) => {
    // Fireflies glow up as the dusk deepens or the storm's eye opens, and fade with the day.
    const want = fireflies ? (plan.place === 'dusk' ? 1 : calm) : 0;
    glow.value = now.still ? want : lerp(glow.value, want, Math.min(1, now.dt / 2));
    for (const [i, s] of swarm.entries()) {
      if (glow.value < 0.01 || i >= quota(fireflies, now)) { shine.hide(flies * 2 + i); s.at = NaN; continue; }
      // Each keeps its place in a window that goes with the camera; only when it wraps round is it put anew.
      const at = now.cx - SPAN / 2 + ((((s.k - now.cx) % SPAN) + SPAN) % SPAN);
      if (at === s.at) { shine.keep(); continue; }
      s.at = at;
      shine.matrix(flies * 2 + i, M.makeScale(0.3, 0.3, 1).setPosition(at, plan.ground(at) + s.up, s.z));
    }
    for (const [d, f] of darts.entries()) {
      if (!bodies || d >= quota(flies, now) || now.day < 0.5 || !seen(now, f.home[0], f.home[2], 2)) {
        bodies?.hide(d);
        shine.hide(d * 2);
        shine.hide(d * 2 + 1);
        continue;
      }
      if (f.k < 1) f.k = Math.min(1, f.k + now.dt / f.long);
      else if (!now.still && (f.wait -= now.dt) <= 0) {
        // A dart to somewhere near, and a hover there.
        f.from = [...f.to];
        f.to = [f.home[0] + (next() - 0.5) * 2.4, f.home[1] + (next() - 0.5) * 0.6, f.home[2] + (next() - 0.6) * 1.2];
        f.long = 0.3 + next() * 0.2;
        f.k = 0;
        f.wait = 0.8 + next() * 2.2;
        f.yaw = Math.atan2(-(f.to[2]! - f.from[2]!), f.to[0]! - f.from[0]!);
      }
      // It turns to its new way first, quick but not in one frame, then darts, nose down, and hovers level.
      f.face += Math.atan2(Math.sin(f.yaw - f.face), Math.cos(f.yaw - f.face)) * Math.min(1, now.dt * 28);
      const e = smooth(Math.max(0, (f.k - 0.15) / 0.85));
      const x = lerp(f.from[0]!, f.to[0]!, e);
      const y = lerp(f.from[1]!, f.to[1]!, e) + 0.03 * Math.sin(now.t * 9 + d);
      const z = lerp(f.from[2]!, f.to[2]!, e);
      bodies.put(d, x, y, z, f.face, 1.25, -0.3 * Math.sin(Math.PI * e));
      // Its wings, over its back: a faint shine on each pair, flickering as they beat.
      const flicker = 0.85 + 0.15 * Math.sin(now.t * 47 + d * 2.1);
      for (const w of [0, 1]) shine.matrix(d * 2 + w, M.makeScale((w ? 0.34 : 0.42) * flicker, (w ? 0.1 : 0.13) * flicker, 1).setPosition(x + Math.cos(f.face) * (w ? -0.03 : 0.06), y + 0.045, z + 0.01));
    }
  };
}
