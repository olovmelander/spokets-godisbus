import {
  Color, Euler, Group, InstancedBufferAttribute, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Vector3,
  type BufferGeometry, type Material, type PerspectiveCamera,
} from 'three';
import { PACK, type ExtraContext, type ExtraFrame, type ViewExtra } from '../extensions';
import { sequence } from '../dressing/kit';
import { drawnWhile } from '../idle';
import { forestFolk, installForestFolk } from './fauna/folk';
import { faunaPlan, type Landing, type Plan, type Soarer } from './fauna/plan';
import { BIRD_TILT, birdMaterial, flockOf, type BirdKind } from './fauna/bird-kit';
import {
  BIRDS, CARVINGS, creatureMaterial, glintMaterial, glints, herd, owl, plain,
  type Species, type V3,
} from './fauna/shapes';
import { fireflyMaterial, smallMaterial, swarm, type SmallKind } from './fauna/small-kit';
import { OWL_TALL, type OwlRig } from '../owl';

/**
 * The near forest's life (docs/visual-upgrade.md), behind the play plane in every chapter of both adventures:
 * squirrels that dash up their trunks, a fox far back now and then, owls at dusk, small birds that lift as he comes,
 * fireflies, dragonflies and butterflies, and the little forest beings and carved figures that peek out from behind
 * stones and roots. Where they live is ./fauna/plan.ts; their shapes ./fauna/shapes.ts, and the small and the many
 * (butterflies, dragonflies, bats, fireflies), modelled in Blender and posed in the vertex stage, ./fauna/small-kit.ts;
 * the birds, small and high, the same way, ./fauna/bird-kit.ts.
 *
 * All of it is drawn on Mid and High only (the rich layer), one draw call a kind, and only while some of a kind is
 * in the picture. With less motion asked for, everything holds still and the birds stay where they sit.
 */
export function installFauna(): void {
  PACK.lifts.push(createFauna);
  // The fox, the squirrels and the beings modelled, rigged and animated in Blender (./fauna/folk.ts).
  PACK.models.push(installForestFolk);
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
const NOWHERE = new Matrix4().makeScale(0, 0, 0);

/** A kind's mesh, and what it puts there this frame: shown only if anything of it is. */
function crowd(mesh: InstancedMesh) {
  const act = mesh.geometry.getAttribute('act') as InstancedBufferAttribute | undefined;
  // A bird's second four numbers: its tail, its bill and its hands (./fauna/bird-kit.ts).
  const act2 = mesh.geometry.getAttribute('act2') as InstancedBufferAttribute | undefined;
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
    pose2(i: number, x: number, y = 0, z = 0, w = 0) { act2?.setXYZW(i, x, y, z, w); },
    hide(i: number) { mesh.setMatrixAt(i, NOWHERE); },
    flush() {
      drawnWhile(mesh, shown);
      if (shown) {
        mesh.instanceMatrix.needsUpdate = true;
        if (act) act.needsUpdate = true;
        if (act2) act2.needsUpdate = true;
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
  // The small and the many are modelled in Blender and posed by their own rig (./fauna/small-kit.ts): a kind's name
  // instead of a shape, and their own material.
  const small = { solid: smallMaterial(), glass: smallMaterial(true), firefly: fireflyMaterial(time, glow) };
  const add: Add = (shape, count, with_, name = '') => {
    const made = adopt(typeof shape === 'string' ? swarm(shape, count, with_ ?? small.solid) : herd(shape, count, with_ ?? material));
    made.mesh.name = `fauna-${name}`;
    return made;
  };
  // The birds have a material of their own, with their rig (./fauna/bird-kit.ts).
  const feathers = birdMaterial();
  const addFlock: AddFlock = (kind, count, name) => {
    const made = adopt(flockOf(kind, count, feathers));
    made.mesh.name = `fauna-${name}`;
    return made;
  };
  // The calm of the storm's eye, as the storm itself fades it.
  let calm = 0;
  const storm = chapter.storm;
  // The fox, the squirrels and the beings (./fauna/folk.ts): drawn rigged once their models have come.
  const folk = forestFolk(plan, add, group, chapter.checkpoints ?? []);
  group.userData.forestFolk = folk.wants;
  const kinds = [
    ...folk.kinds,
    owls(plan, add),
    birds(plan, addFlock),
    soarers(plan, add, addFlock),
    butterflies(plan, add),
    carvings(plan, add),
    plan.dragonflies.length + plan.fireflies ? lights(plan, add, plan.fireflies ? adopt(glints(plan.fireflies, glint)) : null, glow, small) : null,
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
      // For a session's close pictures: the lens, to find a creature in the picture by. Not in a build.
      if (import.meta.env.DEV && typeof window !== 'undefined') (window as { __lens?: PerspectiveCamera }).__lens = camera;
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

type Add = (shape: BufferGeometry | SmallKind, count: number, material?: Material, name?: string) => Crowd;
type AddFlock = (kind: BirdKind, count: number, name: string) => Crowd;
type SmallMaterials = { solid: Material; glass: Material; firefly: Material };
/** How many of n are drawn: all on High, fewer on Mid. */
const quota = (n: number, now: Now) => (now.share < 1 ? Math.max(1, Math.round(n * now.share)) : n);
type Kind = ((now: Now, calm: number) => void) | null;

// --- owls: on a branch or a stump at dusk and by night; they blink slowly, and turn their heads now and then ----

function owls(plan: Plan, add: Add): Kind {
  if (!plan.owls.length) return null;
  const crowd = add(owl(), plan.owls.length, undefined, 'owls');
  const next = sequence(31);
  const all = plan.owls.map((o) => ({ ...o, from: 0, to: 0, k: 1, look: 2 + next() * 4, blink: 1 + next() * 3 }));
  return (now) => {
    const rigs = crowd.mesh.userData.owlRigs as OwlRig[] | undefined;
    for (const [i, o] of all.entries()) {
      if (now.day > 0.6 || !seen(now, o.at[0], o.at[2], 3)) {
        crowd.hide(i);
        if (rigs?.[i]) drawnWhile(rigs[i]!.turn, false);
        continue;
      }
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
      // The rigged owl (../owl.ts), once it has come, sits there instead: its own breathing, blinks and looks about.
      const rig = rigs?.[i];
      if (rig) {
        crowd.hide(i);
        drawnWhile(rig.turn, true);
        rig.turn.position.set(o.at[0], o.at[1], o.at[2]);
        rig.turn.rotation.set(0, o.yaw, 0);
        rig.turn.scale.setScalar(1.8 / OWL_TALL);
        rig.clips.scrub('perch', now.still ? 0 : (now.t + i * 4.3) / rig.clips.duration('perch'));
        rig.clips.update(now.dt);
        continue;
      }
      crowd.put(i, o.at[0], o.at[1], o.at[2], o.yaw, 1.8);
      crowd.pose(i, 0, 0, lerp(o.from, o.to, smooth(o.k)), shut);
    }
  };
}

// --- small birds: hop and peck behind the path; they lift as he comes, and come back once he has gone by ---------
// Visitors (one bird each) come by themselves: in from out of the picture, down where they like, a while there, and
// off again, so that the birds come and go whether he is near or not.

/** Those that hang upside down under a twig to feed, and those that sing from where they sit. */
const HANGS = new Set<Species>(['tit', 'blue']);
const SINGS = new Set<Species>(['tit', 'blue', 'thrush', 'sparrow']);
/** A small bird's wingbeat at a point of its stroke: the wing's angle (rad, up), how open it is, and its hand's bend. */
export function smallStroke(phase: number, strong: number): [number, number, number] {
  const rising = Math.cos(phase);
  // Up with its wings half drawn in and its hands trailing down; down with them wide, the hands trailing up.
  return [strong * Math.sin(phase), 1 - 0.32 * Math.max(0, rising) ** 2 * Math.min(1, strong), -0.5 * rising * strong];
}
/** How far round under its twig a tit is at time t (0 on top, 1 hanging): now and then, for a few seconds. */
export function hanging(t: number, seed: number): number {
  const w = (((t * 0.16 + seed * 0.13) % 1) + 1) % 1;
  return smooth((w - 0.4) / 0.06) - smooth((w - 0.86) / 0.06);
}
/** A wagtail's tail at time t: up quick, down slow, over and over. */
export function wagtailBob(t: number, seed: number): number {
  const w = (((t * 1.7 + seed) % 1) + 1) % 1;
  return w < 0.18 ? smooth(w / 0.18) : 1 - smooth((w - 0.18) / 0.62);
}

function birds(plan: Plan, add: AddFlock): Kind {
  if (!plan.flocks.length && !plan.visitors.length) return null;
  const next = sequence(41);
  // The visitors' own chances, so that the flocks do what they always did.
  const chance = sequence(43);
  const meshes = new Map<Species, Crowd>();
  const counts = new Map<Species, number>();
  for (const f of plan.flocks) counts.set(f.species, (counts.get(f.species) ?? 0) + f.birds.length);
  for (const v of plan.visitors) counts.set(v.species, (counts.get(v.species) ?? 0) + 1);
  for (const [species, count] of counts) meshes.set(species, add(species, count, `birds:${species}`));
  const used = new Map<Species, number>();
  const member = (species: Species, at: V3, yaw: number) => {
    const i = used.get(species) ?? 0;
    used.set(species, i + 1);
    return {
      crowd: meshes.get(species)!, i, rest: [...at] as [number, number, number], yaw, home: at,
      doing: 0, k: 0, long: 0, wait: next() * 2, look: 0, look2: 0, hop: 0, from: 0,
      // How open its wings are and how it leans as it lands, settling; and its own beat.
      open: 0, lean: 0, seed: i * 2.39,
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
        // A visitor on its way down lands first, and lifts again from where it came down.
        if (!f.away && near && !(visit && f.birds[0]!.fly)) {
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
        const tilt = BIRD_TILT[f.species];
        // A wagtail's tail goes up and down all the time it is not flying.
        const bob = f.species === 'wagtail' ? 0.5 * wagtailBob(now.t, b.seed) - 0.12 : 0;
        if (b.gone && b.perch) {
          // On its bough, looking about, until he has gone by; its wings settle. A tit or a blue tit swings round to
          // hang under it a while, pecking at it, and up again.
          b.open = Math.max(0, b.open - now.dt / 0.2);
          b.lean = Math.max(0, b.lean - now.dt / 0.25);
          const under = HANGS.has(f.species) ? hanging(now.t, b.seed) : 0;
          crowd.put(i, b.perch[0], b.perch[1] - (1 - Math.cos(Math.PI * under)) * 0.06, b.perch[2], b.yaw, s, b.lean * 0.35, Math.PI * under);
          crowd.pose(i, 0, b.open, glance(now.t, i * 1.9) * (0.7 - 0.2 * under), under * Math.max(0, Math.sin(now.t * 7 + b.seed)) * 0.7);
          crowd.pose2(i, bob + 0.25 * under, 0, 0, 0);
          continue;
        }
        if (b.fly) {
          const fl = b.fly;
          fl.k += now.dt / fl.long;
          if (fl.k < 0) {
            // Crouching for the spring, the moment before it goes.
            const crouch = fl.out ? smooth((fl.k * fl.long + 0.14) / 0.1) : 0;
            crowd.put(i, b.rest[0], b.rest[1] - crouch * 0.02, b.rest[2], b.yaw, s, -crouch * 0.15, 0, s * (1 - crouch * 0.12));
            // Its wings come a little open and its tail up, for the spring.
            crowd.pose(i, 0, crouch * 0.25, 0, 0);
            crowd.pose2(i, crouch * 0.3 + bob, 0, 0, 0);
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
            // Landing, it flares: body up, wings wide, tail spread and down, to brake.
            const flare = coming && !fl.out ? smooth((fl.k - 0.8) / 0.16) : 0;
            // Flying, its body is level, not tipped up as it sits.
            const climb = Math.atan2(d[1]!, Math.hypot(d[0]!, d[2]!)) * 0.6;
            crowd.put(i, at[0]!, at[1]! + dip, at[2]!, b.yaw, s, (climb - tilt) * (1 - flare) + flare * 0.35);
            const spread = Math.min(1, fl.k * 6, coming ? 1 : (1 - fl.k) * 9);
            const [beat, open, hand] = smallStroke((now.t * (coming ? 30 : 46 + (i % 4) * 3)) / Math.sqrt(big) + i * 1.7, beating ? 0.95 : 0.12);
            b.open = spread * (beating ? open : 0.2);
            b.lean = flare;
            crowd.pose(i, beat * spread, b.open, 0, -0.15 * (1 - flare));
            crowd.pose2(i, -0.35 * flare + 0.08, beating ? 0.25 + 0.75 * flare : 0, 0, hand * spread);
            continue;
          }
        }
        // Where it sits: a peck, a hop, a look round. Sheltering from the rain it sits fluffed and only looks.
        if (b.doing === 0 && (b.wait -= now.dt) <= 0) {
          const r = next();
          // On a twig a tit or a blue tit now and then swings round to hang under it and feed; a singer sings.
          b.doing = f.shelter ? 3 : f.perch ? (HANGS.has(f.species) && r < 0.3 ? 5 : SINGS.has(f.species) && r < 0.6 ? 6 : 3)
            : r < 0.45 ? 1 : r < 0.75 ? 2 : f.species === 'thrush' && r < 0.82 ? 6 : 3;
          b.long = b.doing === 1 ? 0.55 : b.doing === 2 ? (f.species === 'magpie' ? 0.5 : 0.34) : b.doing === 5 ? 3.4 : b.doing === 6 ? 1.7 : 1.3;
          b.look = (next() - 0.5) * 1.4;
          b.look2 = (next() - 0.5) * 1.4;
          b.hop = (0.1 + next() * 0.14) * big;
          b.k = 0;
        }
        let peck = 0, turn = 0, up = 0, squat = 0, roll = 0, sing = 0, tail = bob, flick = 0;
        if (b.doing) {
          b.k += now.dt / b.long;
          const k = Math.min(1, b.k);
          if (b.doing === 1) peck = Math.abs(Math.sin(k * Math.PI * 2)) * 0.95;
          else if (b.doing === 5) {
            // Round under its twig, a while there pecking at it and looking about, and up again.
            const under = smooth(k / 0.13) - smooth((k - 0.87) / 0.13);
            roll = Math.PI * under;
            peck = under * Math.max(0, Math.sin(k * 23)) * 0.7;
            turn = under * glance(now.t * 1.3, i * 2.3) * 0.6;
            tail = 0.25 * under;
          } else if (b.doing === 6) {
            // Its head up, its bill opening on each note.
            const lift = smooth(k / 0.12) * (1 - smooth((k - 0.85) / 0.15));
            peck = -0.38 * lift;
            sing = lift * Math.max(0, Math.sin(k * b.long * Math.PI * (f.species === 'thrush' ? 9 : 6.5))) ** 0.7;
          }
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
            // Its tail flicks up as it lands; a magpie bounds high on both feet, tail up and its wings flicked open.
            tail += squat * 0.2 + (f.species === 'magpie' ? 0.55 * Math.sin(air * Math.PI) : 0);
            if (f.species === 'magpie') { up *= 1.6; flick = Math.sin(air * Math.PI); }
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
        // Just landed, its wings fold and it settles level on its feet.
        b.open = Math.max(0, b.open - now.dt / 0.18);
        b.lean = Math.max(0, b.lean - now.dt / 0.25);
        // Hanging, its feet hold the twig's underside: half a twig's width down.
        const hang = (1 - Math.cos(roll)) * 0.06;
        crowd.put(i, b.rest[0], (f.perch ? b.rest[1] : plan.ground(b.rest[0])) + up - hang, b.rest[2], b.yaw, s * fluff, -squat * 0.12 + b.lean * 0.35, roll, s * (f.shelter ? 1.08 : 1) * (1 - squat * 0.12));
        crowd.pose(i, 0.45 * flick, Math.max(b.open, 0.3 * flick), turn, peck);
        crowd.pose2(i, tail, 0.4 * flick, sing, 0);
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
  raven: { size: 1.6, up: [6.5, 9], z: [-17, -27], r: [3.5, 5.5], turn: 0.3, beat: 6, flaps: -0.45 },
  crow: { size: 1.3, up: [5.5, 8], z: [-14, -24], r: [3, 4.5], turn: 0.36, beat: 8, flaps: 0.2 },
  bat: { size: 0.75, up: [3.8, 5.4], z: [-5, -9], r: [2.2, 3], turn: 1, beat: 52, flaps: 2 },
};
/**
 * A bat's wings at a point of its stroke (a phase in radians): how far up they are (0 out level), and how far its hands
 * are folded. Up as the stroke rises, the hand folds in; down, it opens wide to push on the air.
 */
export function batStroke(phase: number): [number, number] {
  const fold = Math.max(0, Math.cos(phase));
  return [0.12 + 0.8 * Math.sin(phase), fold * fold * (3 - 2 * fold) * 0.95];
}
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

/**
 * A raven's or a crow's wings at a point of its stroke (a phase in radians): how far up they are (rad), how open, and
 * how far its hands are bent up at the wrist. Its beat is deep and slow, mostly down; on the way up its hands trail and
 * its wings draw in a little. Gliding (`beating` 0) it holds them a little over level, its fingers turned up.
 */
export function corvidStroke(phase: number, beating: number): [number, number, number] {
  const beat = 0.12 + 0.52 * Math.sin(phase);
  const rising = Math.cos(phase);
  return [lerp(0.1, beat, beating), lerp(1, 1 - 0.2 * Math.max(0, rising) ** 2, beating), lerp(0.16, 0.38 * Math.sin(phase - 1.1), beating)];
}

function soarers(plan: Plan, add: Add, addFlock: AddFlock): Kind {
  if (!plan.soarers.length) return null;
  const next = sequence(97);
  // When each croaks and rolls: its own, so that where they fly stays as it was.
  const chance = sequence(101);
  const flights = plan.soarers.map(({ kind, count }) => {
    // A bat is one of the small life, modelled in Blender: its wings beat at the shoulder and fold at the wrist. A raven
    // and a crow are birds of the bird kit (./fauna/bird-kit.ts).
    const crowd = kind === 'bat' ? add('bat', count, undefined, `soarers:${kind}`) : addFlock(kind, count, `soarers:${kind}`);
    const own = SOAR[kind];
    // Ravens and crows in twos, one a little behind the other on the same circle; bats each on its own.
    const all = Array.from({ length: count }, (_, i) => {
      const pair = kind !== 'bat' && i % 2 === 1;
      return {
        k: pair ? NaN : next() * SKY_SPAN[kind], phase: next() * 6.28, lag: pair ? 0.5 + next() * 0.3 : 0,
        up: own.up[0] + next() * (own.up[1] - own.up[0]), z: own.z[0] + next() * (own.z[1] - own.z[0]), r: own.r[0] + next() * (own.r[1] - own.r[0]),
        drift: (next() < 0.5 ? -1 : 1) * (0.25 + next() * 0.35), way: next() < 0.5 ? -1 : 1, yaw: 0, climb: 0, x: NaN, y: 0, zz: 0,
        // How long until it croaks, and how far into its croak it is; how long until a raven rolls over, and how far.
        croak: 3 + chance() * 9, croaking: -1, roll: 15 + chance() * 25, rolling: -1, beating: 0,
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
        let bank = kind === 'bat' ? 0.5 * Math.sin(t * 3.3 + 2 * one.phase) : -one.way * 0.32;
        if (kind === 'bat') {
          crowd.put(i, x, y, z, one.yaw, own.size, climb * 0.5, bank);
          // A bat's stroke: its wings sweep down full and wide, and come up with its hands folded in at the wrist.
          const [stroke, fold] = batStroke(t * own.beat + one.phase * 5);
          crowd.pose(i, stroke, fold, 0, 0);
          continue;
        }
        // Beats in bursts, and between them a glide on wings held a little up, its fingers spread and turned up; it
        // eases from one to the other.
        const beating = Math.sin(t * 0.45 + one.phase * 3) < own.flaps ? 1 : 0;
        one.beating = now.still ? beating : one.beating + (beating - one.beating) * Math.min(1, now.dt * 3);
        const [stroke, open, hand] = corvidStroke(t * own.beat + one.phase * 5, one.beating);
        // Now and then it croaks: its bill opens twice, its head a little down; between, it looks about.
        if (!now.still) {
          if (one.croaking >= 0) one.croaking += now.dt;
          if (one.croaking > 1.1) { one.croaking = -1; one.croak = 7 + chance() * 10; }
          if (one.croaking < 0 && (one.croak -= now.dt) <= 0) one.croaking = 0;
          // A raven, now and then, rolls right over in the air, as ravens do for the fun of it.
          if (kind === 'raven') {
            if (one.rolling >= 0) one.rolling += now.dt / 0.9;
            if (one.rolling > 1) { one.rolling = -1; one.roll = 25 + chance() * 30; }
            if (one.rolling < 0 && (one.roll -= now.dt) <= 0) one.rolling = 0;
          }
        }
        const c = one.croaking;
        const bill = c < 0 ? 0 : Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, (c - 0.1) / 0.3))), Math.sin(Math.PI * Math.min(1, Math.max(0, (c - 0.55) / 0.3))));
        if (one.rolling >= 0) bank -= one.way * Math.PI * 2 * smooth(one.rolling);
        crowd.put(i, x, y, z, one.yaw, own.size, climb * 0.5, bank);
        crowd.pose(i, stroke, open, 0.45 * glance(t * 0.4, i * 3.1 + 1), c < 0 ? 0 : 0.3 * Math.sin(Math.PI * Math.min(1, c / 1.1)));
        // A crow fans its round tail wide as it glides; a raven's wedge opens less.
        crowd.pose2(i, 0.05 * Math.sin(t * 0.7 + one.phase), (kind === 'crow' ? 0.7 : 0.4) * (1 - 0.6 * one.beating), bill, hand);
      }
    }
    asked = false;
  };
}

// --- butterflies: soft arcs by day, settling on a flower now and then ------------------------------------------

/**
 * A brimstone, a wood white and a blue, each its own wings and patterns (art/blender/small-life.py), and each its own
 * mesh: the first butterfly of a place is a brimstone, the next a wood white, and so on.
 */
const BUTTERFLIES = ['butterfly-1', 'butterfly-2', 'butterfly-3'] as const;
/** How it holds its wings: upright and closed over its back, as it sits; and gliding, a little up in a shallow V. */
const CLOSED = 1.5;
const GLIDE = 0.3;

/**
 * Its wings at a moment: the fore pair raised, the hind pair raised (both in radians, 0 out flat and π/2 upright). It
 * flies in bursts of beats with short glides between; sitting (`sit` 1) it closes them upright, and opens and shuts
 * them slowly as it rests in the sun, a blue (species 2) wide open, the others only a little.
 */
export function butterflyWings(t: number, phase: number, sit: number, species: number): [number, number] {
  const beat = t * 38;
  const gliding = smooth((Math.sin(t * 0.55 + phase * 2) - 0.55) / 0.3);
  const fore = lerp(0.55 + 0.8 * Math.sin(beat), GLIDE, gliding);
  const hind = lerp(0.5 + 0.75 * Math.sin(beat - 0.45), GLIDE - 0.05, gliding);
  const bask = smooth(0.5 + 0.7 * Math.sin(t * 0.33 + phase)) * (species === 2 ? 1.25 : 0.45);
  const rest = CLOSED - bask + 0.02 * Math.sin(t * 9 + phase);
  const k = smooth(sit);
  return [lerp(fore, rest, k), lerp(hind, rest - 0.03, k)];
}

function butterflies(plan: Plan, add: Add): Kind {
  if (!plan.butterflies.length) return null;
  const counts = BUTTERFLIES.map((_, s) => plan.butterflies.filter((_, i) => i % 3 === s).length);
  const crowds = BUTTERFLIES.map((kind, s) => (counts[s] ? add(kind, counts[s]!, undefined, `butterflies:${s + 1}`) : null));
  const next = sequence(53);
  // On a dandelion in the garden it sits on the head's top; on the bog's moss, a little over the plan's flower.
  const perch = plan.place === 'garden' ? 0.11 : 0.02;
  const all = plan.butterflies.map((b, i) => ({
    ...b, species: i % 3, slot: Math.floor(i / 3), p: next() * 6.28, sit: 0, wait: 4 + next() * 8, stay: 0, flower: b.flowers[0]!, yaw: 0,
    x: b.home[0], y: b.home[1], z: b.home[2],
  }));
  return (now) => {
    for (const [i, b] of all.entries()) {
      const crowd = crowds[b.species]!;
      if (i >= quota(all.length, now) || now.day < 0.5 || !seen(now, b.home[0], b.home[2], 4)) { crowd.hide(b.slot); continue; }
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
      // downstroke of its wings; gliding, it sinks a little instead.
      const beat = t * 38;
      const gliding = smooth((Math.sin(t * 0.55 + b.p * 2) - 0.55) / 0.3);
      const fx = b.home[0] + 1.5 * Math.sin(t * 0.31 + b.p) + 0.6 * Math.sin(t * 0.73 + 2 * b.p) + 0.16 * Math.sin(t * 2.9 + b.p) * Math.sin(t * 1.3);
      const fy = b.home[1] + 0.45 * Math.sin(t * 0.47 + b.p) + 0.12 * Math.sin(t * 2.3 + 2 * b.p) * Math.sin(t * 1.1)
        + lerp(0.035 * Math.sin(beat + 1.2), -0.05, gliding);
      const fz = Math.min(-1.2, b.home[2] - 0.6 * Math.sin(t * 0.27 + 1.3 * b.p));
      const k = smooth(b.sit);
      const x = lerp(fx, b.flower[0], k), y = lerp(fy, b.flower[1] + perch, k), z = lerp(fz, b.flower[2], k);
      if (!now.still) {
        if (k < 0.9 && Math.hypot(x - b.x, z - b.z) > 1e-4) {
          // It turns into its way quickly, but never in one frame.
          const wanted = Math.atan2(-(z - b.z), x - b.x);
          b.yaw += Math.atan2(Math.sin(wanted - b.yaw), Math.cos(wanted - b.yaw)) * Math.min(1, now.dt * 10);
        } else if (k >= 0.9) {
          // Settled, it turns side on, so that its closed wings are seen.
          const side = Math.cos(b.yaw) >= 0 ? 0 : Math.PI;
          b.yaw += Math.atan2(Math.sin(side - b.yaw), Math.cos(side - b.yaw)) * Math.min(1, now.dt * 2);
        }
      }
      b.x = x; b.y = y; b.z = z;
      // Flying, its body nods with each beat.
      crowd.put(b.slot, x, y, z, b.yaw, 1.4, (1 - k) * (1 - gliding) * 0.18 * Math.sin(beat + 0.6));
      const [fore, hind] = butterflyWings(t, b.p, now.still ? 1 : b.sit, b.species);
      crowd.pose(b.slot, fore, hind, 0, 0);
    }
  };
}

// --- carved figures: they stand where they were left; one of them tips back as he goes by ------------------------

function carvings(plan: Plan, add: Add): Kind {
  if (!plan.carvings.length) return null;
  // Oiled by hands that held them: a little sheen on the facets.
  const wood = new MeshStandardMaterial({ vertexColors: true, roughness: 0.78, flatShading: true });
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

// --- fireflies at dusk and in the storm's calm; dragonflies over the water by day ------------------------------

/** Fireflies' soft warm green. */
const GREEN = new Color('#d4f09a');

/**
 * A dragonfly's wings at a moment: the fore pair raised, the hind pair raised, both swept back (in radians). Flying,
 * the two pairs beat out of step, fast and shallow, a shimmer; perched (`rest` 1), they lie out flat, a little down
 * and forward, as a resting dragonfly's do.
 */
export function dragonflyWings(t: number, phase: number, rest: number): [number, number, number] {
  const k = smooth(rest);
  return [lerp(0.12 + 0.42 * Math.sin(t * 150 + phase), -0.1, k), lerp(0.12 + 0.42 * Math.sin(t * 150 + phase - 1.6), -0.14, k), lerp(0, -0.12, k)];
}

function lights(plan: Plan, add: Add, shine: Crowd | null, glow: { value: number }, small: SmallMaterials): Kind {
  const flies = plan.dragonflies.length;
  const fireflies = shine ? plan.fireflies : 0;
  if (!flies && !fireflies) return null;
  const bodies = flies ? add('dragonfly', flies, small.glass, 'dragonflies') : null;
  // Each firefly's glow has a body under it, which drifts and glows by the same numbers (./fauna/small-kit.ts).
  const lamps = fireflies ? add('firefly', fireflies, small.firefly, 'fireflies') : null;
  const fly = shine?.mesh.geometry.getAttribute('fly') as InstancedBufferAttribute | undefined;
  const flown = lamps ? new InstancedBufferAttribute(new Float32Array(fireflies * 4), 4) : null;
  if (lamps && flown) lamps.mesh.geometry.setAttribute('fly', flown);
  const next = sequence(71);
  // What a dragonfly decides as it goes, apart from where everything is.
  const chance = sequence(73);
  const SPAN = 30;
  const swarm = Array.from({ length: fireflies }, (_, i) => {
    const own = [next() * 6.28, 0.4 + next() * 0.5, 0.25 + next() * 0.3, 1.1 + next() * 0.5] as const;
    fly!.setXYZW(i, ...own);
    flown!.setXYZW(i, ...own);
    shine!.mesh.setColorAt(i, GREEN);
    return { k: next() * SPAN, up: 0.3 + next() * 1.9, z: -1.9 - next() * 5, at: NaN };
  });
  const darts = plan.dragonflies.map((home, d) => ({
    home, reed: plan.reeds[d] ?? null, from: [...home], to: [...home], k: 1, wait: next() * 2, yaw: 0, face: 0, long: 0.3,
    // How many darts since it last sat, whether it is on its way to its reed or on it, and how settled it is there.
    darts: 0, landing: false, perched: false, rest: 0,
  }));
  return (now, calm) => {
    // Fireflies glow up as the dusk deepens or the storm's eye opens, and fade with the day.
    const want = fireflies ? (plan.place === 'dusk' ? 1 : calm) : 0;
    glow.value = now.still ? want : lerp(glow.value, want, Math.min(1, now.dt / 2));
    for (const [i, s] of swarm.entries()) {
      if (glow.value < 0.01 || i >= quota(fireflies, now)) { shine!.hide(i); lamps!.hide(i); s.at = NaN; continue; }
      // Its thin wings whir under its lifted wing cases.
      const whir = now.still ? 0.5 : 0.55 + 0.4 * Math.sin(now.t * 47 + i * 2.3);
      lamps!.pose(i, whir, whir, -0.15, 0);
      // Each keeps its place in a window that goes with the camera; only when it wraps round is it put anew.
      const at = now.cx - SPAN / 2 + ((((s.k - now.cx) % SPAN) + SPAN) % SPAN);
      if (at === s.at) { shine!.keep(); lamps!.keep(); continue; }
      s.at = at;
      shine!.matrix(i, M.makeScale(0.3, 0.3, 1).setPosition(at, plan.ground(at) + s.up, s.z));
      lamps!.matrix(i, M.makeTranslation(at, plan.ground(at) + s.up, s.z));
    }
    for (const [d, f] of darts.entries()) {
      if (!bodies || d >= quota(flies, now) || now.day < 0.5 || !seen(now, f.home[0], f.home[2], 2)) {
        bodies?.hide(d);
        continue;
      }
      // He comes near its reed: it is up and away at once.
      const near = !!f.reed && Math.abs(now.x - f.reed[0]) < 2.6 && Math.abs(now.y - f.reed[1]) < 3.5;
      if (f.k < 1) {
        f.k = Math.min(1, f.k + now.dt / f.long);
        if (f.k >= 1 && f.landing) { f.landing = false; f.perched = true; }
      } else if (!now.still && ((f.wait -= now.dt) <= 0 || (f.perched && near))) {
        f.from = [...f.to];
        if (f.reed && !f.perched && f.darts >= 2 && !near && chance() < 0.6) {
          // Down onto its reed's tip, slower, to sit a while with its wings out.
          f.to = [f.reed[0], f.reed[1] + 0.055, f.reed[2]];
          f.long = 0.55;
          f.wait = 3 + chance() * 5;
          f.landing = true;
          f.darts = 0;
        } else {
          // A dart to somewhere near, and a hover there.
          f.to = [f.home[0] + (next() - 0.5) * 2.4, f.home[1] + (next() - 0.5) * 0.6, f.home[2] + (next() - 0.6) * 1.2];
          f.long = 0.3 + next() * 0.2;
          f.wait = 0.8 + next() * 2.2;
          f.darts++;
        }
        f.perched = false;
        f.k = 0;
        f.yaw = Math.atan2(-(f.to[2]! - f.from[2]!), f.to[0]! - f.from[0]!);
      }
      f.rest = f.perched ? Math.min(1, f.rest + now.dt / 0.35) : Math.max(0, f.rest - now.dt / 0.08);
      // On its reed it turns side on, slowly; flying, it turns to its new way first, quick but not in one frame, then
      // darts, nose down, and hovers level.
      const facing = f.perched ? (Math.cos(f.face) >= 0 ? 0 : Math.PI) : f.yaw;
      f.face += Math.atan2(Math.sin(facing - f.face), Math.cos(facing - f.face)) * Math.min(1, now.dt * (f.perched ? 3 : 28));
      const e = smooth(Math.max(0, (f.k - 0.15) / 0.85));
      const x = lerp(f.from[0]!, f.to[0]!, e);
      const y = lerp(f.from[1]!, f.to[1]!, e) + 0.03 * Math.sin(now.t * 9 + d) * (1 - smooth(f.rest));
      const z = lerp(f.from[2]!, f.to[2]!, e);
      bodies.put(d, x, y, z, f.face, 1.25, -0.3 * Math.sin(Math.PI * e) * (f.landing ? 0.4 : 1));
      const [fore, hind, sweep] = dragonflyWings(now.still ? 0 : now.t, d * 2.1, now.still ? 1 : f.rest);
      bodies.pose(d, fore, hind, sweep, 0);
    }
  };
}
