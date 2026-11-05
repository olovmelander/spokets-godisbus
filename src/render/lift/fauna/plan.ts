import { InstancedMesh, Matrix4, Quaternion, Vector3, type Object3D } from 'three';
import type { ChapterData, PlaceId } from '../../../sim/types';
import { standing } from '../../dressing/foreground';
import { KIT, grows, heightAt, landscape, sequence, surfaceAt } from '../../dressing/kit';
import { branch, stone, stump, type Carving, type Part, type Species, type V3 } from './shapes';

/**
 * Where the near life lives in a chapter (docs/visual-upgrade.md): read from the chapter's own data and from the
 * trunks its dressing stands up, and the same in every session (seeded by the chapter's id). Nothing rests within
 * 1.5 EL of a candy, nothing stands in front of the path, and in the storm the life hides.
 */

/** A trunk of the dressing: a spruce, a birch, or one of the bog's dead pines. `y` is the ground at its foot. */
export interface Tree { x: number; y: number; z: number; r: number; sy: number; snag: boolean }
/** A squirrel's trunk. */
export interface Climber { tree: Tree; a: number; h: number }
/** A place to rest: where, and which way it faces (a turn about the upright: 0 along +x). */
export interface Rest { at: V3; yaw: number }
export interface Flock { x: number; y: number; species: Species; birds: Rest[]; perch: boolean; shelter: boolean }
/** A stone or a stump to peek from behind: its foot, how high its top is, how deep and wide it is, and the side to peek out on. */
export interface Peek { at: V3; top: number; deep: number; wide: number; side: number; lichen: boolean }
export interface Carved extends Rest { shape: Carving }

export interface Plan {
  place: PlaceId;
  trees: Tree[];
  squirrels: Climber[];
  fox: boolean;
  owls: Rest[];
  flocks: Flock[];
  butterflies: { home: V3; flowers: V3[] }[];
  dragonflies: V3[];
  fireflies: number;
  beings: Peek[];
  carvings: Carved[];
  /** The stones, stumps and branches they hide behind and sit on, already where they stand. */
  props: Part[];
  /** The ground's height at x, as the dressing has it (the land under a landmark). */
  ground: (x: number) => number;
}

/** Who lives in a place by day. The storm sends all of it into hiding but the birds on their branches and the owl. */
const CAST: Partial<Record<PlaceId, { squirrels?: number; fox?: boolean; birds?: Species[]; butterflies?: number; beings?: number; dragonflies?: boolean }>> = {
  forest: { squirrels: 3, fox: true, birds: ['tit', 'thrush'], beings: 2, dragonflies: true },
  garden: { squirrels: 2, birds: ['blue', 'tit'], butterflies: 5 },
  bog: { birds: ['sparrow', 'tit'], butterflies: 4, beings: 2, dragonflies: true },
  mountain: { beings: 2 },
  village: { birds: ['sparrow'] },
};
/** Where the carvings are, a quiet secret in a few chapters of both adventures: how many. */
const CARVED: Record<string, number> = { garden: 1, granskog: 2, myren: 1, berget: 1, stormskog: 1, alven: 1, billsta: 1, flarken: 1, 'look-forest': 1 };
/** What shelters in the storm, by place. */
const SHELTER: Partial<Record<PlaceId, Species>> = { forest: 'tit', garden: 'blue', bog: 'sparrow' };

/** The shape of a spruce's trunk and of a dead pine's: radius at heights up its own shape (../../dressing/kit.ts). */
const SPRUCE = [[1.9, 0], [1.55, 0.35], [1.25, 0.9], [1.08, 1.8], [1.01, 3.2], [1, 8], [0.98, 20]] as const;
const SNAG = [[0.95, 0], [0.6, 0.3], [0.47, 0.9], [0.42, 2.5], [0.33, 5.5], [0.25, 8.2]] as const;
/** How thick a trunk is h over the ground at its foot (each stands half an EL into it). */
export function girth(tree: Tree, h: number): number {
  const shape = tree.snag ? SNAG : SPRUCE;
  const y = (h + 0.5) / tree.sy;
  let i = 1;
  while (i < shape.length - 1 && shape[i]![1] < y) i++;
  const [ra, ya] = shape[i - 1]!;
  const [rb, yb] = shape[i]!;
  return (ra + ((rb - ra) * Math.min(1, Math.max(0, (y - ya) / (yb - ya))))) * tree.r;
}

const seedOf = (id: string) => [...id].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);

/** The trunks the dressing stands up: one instanced mesh of each kind a stretch. */
export function treesOf(dressing: Object3D): Tree[] {
  const trees: Tree[] = [];
  const m = new Matrix4(), p = new Vector3(), q = new Quaternion(), s = new Vector3();
  dressing.traverse((object) => {
    const mesh = object as InstancedMesh;
    if (!KIT || !mesh.isInstancedMesh || (mesh.geometry !== KIT.trunk && mesh.geometry !== KIT.snag)) return;
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, m);
      m.decompose(p, q, s);
      trees.push({ x: p.x, y: p.y + 0.5 * s.y, z: p.z, r: s.x, sy: s.y, snag: mesh.geometry === KIT.snag });
    }
  });
  return trees.sort((a, b) => a.x - b.x);
}

/** Moves parts made about their own foot to where they stand, turned about the upright. */
function placed(parts: Part[], x: number, y: number, z: number, yaw = 0): Part[] {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return parts.map(([shape, colour, at, size, turn = [0, 0, 0], rig]) =>
    [shape, colour, [x + at[0] * c + at[2] * s, y + at[1], z - at[0] * s + at[2] * c], size, [turn[0], turn[1] + yaw, turn[2]], rig]);
}

export function faunaPlan(source: ChapterData, dressing: Object3D | null | undefined): Plan | null {
  const place = source.place;
  if (!dressing || !place || place === 'home') return null;
  const chapter = landscape(source);
  const storm = !!source.storm?.rain;
  const night = storm || place === 'dusk';
  const cast = storm || night ? {} : CAST[place] ?? {};
  const next = sequence(seedOf(source.id));
  const from = chapter.ground[0]!.x;
  const to = chapter.ground[chapter.ground.length - 1]!.x;
  const ground = (x: number) => heightAt(chapter, x);
  // A broad skerry's landscape is its submerged bed. Its incidental bog trunks are underwater, not perches.
  const underSkerry = (x: number) => (source.landmarks ?? []).some((mark) => mark.look === 'skerry' && x >= mark.from - 2 && x <= mark.to + 2);
  const trees = treesOf(dressing).filter((tree) => !underSkerry(tree.x));
  const props: Part[] = [];

  // Nothing rests by a candy: the trail, the side candy, the hidden ones and the big ones.
  const sweets = [...source.candy, ...(source.side ?? []), ...(source.hidden ?? []), ...(source.checkpoints ?? [])];
  const clear = (x: number, y: number, z: number, d = 1.5) => sweets.every((c) => (c.x - x) ** 2 + (c.y - y) ** 2 + z * z >= d * d);
  /** And, seen from the front, not over or under one: how far along the path the nearest candy at about that height is. */
  const gap = (x: number, y: number) => Math.min(9, ...sweets.filter((c) => Math.abs(c.y - y) < 1.5).map((c) => Math.abs(c.x - x)));
  // Nor where the story has its things. (Not by where he begins: a game taken up at a checkpoint, or a picture
  // taken with ?at, begins elsewhere, and the life must stand where it always does.)
  const busy: [number, number][] = [];
  const mark = (x: number, pad: number) => busy.push([x - pad, x + pad]);
  for (const s of source.spots ?? []) mark(s.at.x, 1.8);
  for (const d of source.decor ?? []) mark(d.at.x, 1.8);
  for (const g of source.ghost ?? []) mark(g.at.x, 1.2);
  for (const m of source.movers ?? []) for (const s of m.stops) mark(s.x, m.width / 2 + 1);
  for (const r of source.rides ?? []) { mark(r.from.x, 2); mark(r.to.x, 2); }
  for (const c of source.climbs ?? []) mark(c.x, 1.2);
  for (const d of source.drips ?? []) mark(d.at.x, 1.5);
  for (const l of source.landmarks ?? []) busy.push([l.from - 1.2, l.to + 1.2]);
  for (const b of source.storm?.buildings ?? []) if (b.z > -9) mark(b.x, (b.width ?? 4) / 2 + 1.5);
  if (source.pine) mark(source.pine.x, 5.5);
  if (source.shop) busy.push([source.shop.door - 1, source.shop.to + 1]);
  const free = (x: number) => x > from + 2 && x < to - 2 && !busy.some(([a, b]) => x >= a && x <= b);
  const level = (x: number) => Math.abs(ground(x - 0.8) - ground(x)) < 0.12 && Math.abs(ground(x + 0.8) - ground(x)) < 0.12;
  // Bare earth (gravel, sand) is ground too, for what stands or hops on it.
  const bare = { ...chapter, surfaces: (chapter.surfaces ?? []).filter((s) => s.kind !== 'earth') };
  const soil = (x: number) => free(x) && level(x) && grows(bare, x) && grows(bare, x - 0.8) && grows(bare, x + 0.8);
  // Pavement, not its puddles.
  const paved = (x: number) => free(x) && level(x) && ['paving', 'asphalt'].includes(surfaceAt(chapter, x) ?? '') && (source.water ?? []).every((w) => x < w.from - 1 || x > w.to + 1);
  // The bog's islands go down into the water behind the path: what stands on them stays near it.
  const back = place === 'bog' ? -2.4 : -3.6;
  // The story's own owl in Äventyr 2: none of ours sits near where it is.
  const owlsAt = [
    ...[...(source.spots ?? []), ...(source.decor ?? [])].filter((s) => s.look === 'owl').map((s) => s.at.x),
    ...(source.rides ?? []).filter((r) => r.look === 'owl').flatMap((r) => [r.from.x, r.to.x]),
  ];
  /** The nearest x to x, within reach, where `ok` holds: tried every half EL outwards. */
  const nearest = (x: number, reach: number, ok: (x: number) => boolean) => {
    for (let d = 0; d <= reach; d += 0.5) for (const c of [x + d, x - d]) if (ok(c)) return c;
    return null;
  };
  const spread = (n: number, pick: (a: number, b: number) => void) => {
    for (let k = 0; k < n; k++) pick(from + ((to - from) * k) / n, from + ((to - from) * (k + 1)) / n);
  };

  // Squirrels: two or three a chapter, on the nearest trunks, spread along it.
  const squirrels: Climber[] = [];
  spread(cast.squirrels ?? 0, (a, b) => {
    const tree = trees.filter((t) => !t.snag && t.x >= a && t.x < b && t.z > -18 && free(t.x)).sort((p, q) => q.z - p.z)[0];
    if (tree) squirrels.push({ tree, a: (next() - 0.5) * 1.4, h: 1.6 + next() * 3 });
  });

  /**
   * A dead branch out of a tree at height h, towards the camera on one side, and never as far as the path: where
   * along it things can sit. Null where the trunk stands too close in front for one.
   */
  const perchOn = (tree: Tree, h: number, side: number, want: number): ((k: number) => V3) | null => {
    const a = side * (0.55 + next() * 0.4);
    const r = girth(tree, h) * 0.92;
    const root: V3 = [tree.x + Math.sin(a) * r, tree.y + h, tree.z + Math.cos(a) * r];
    const long = Math.min(want, (-1.4 - root[2]) / Math.cos(a));
    if (long < want * 0.6) return null;
    const toward = Math.atan2(-Math.cos(a), Math.sin(a));
    props.push(...placed(branch(long + r * 0.1, toward, tree.snag ? 0.05 : 0.07), root[0], root[1], root[2]));
    return (k) => [root[0] + Math.sin(a) * long * k, root[1] + long * k * 0.12 + 0.06, root[2] + Math.cos(a) * long * k];
  };

  // The owl, at dusk and by night: on a branch of a near trunk, or on a stump behind the path.
  const owls: Rest[] = [];
  if (night && place !== 'village') {
    // Nor behind one of the storm's buildings, which would hide it.
    const far = (x: number, z = -4) => owlsAt.every((o) => Math.abs(o - x) > 16) && x > from + 4 && x < to - 4
      && (source.storm?.buildings ?? []).every((b) => b.z < z - 3 || Math.abs(b.x - x) > (b.width ?? 6) / 2 + 2);
    // The nearest trunk towards the chapter's middle.
    const score = (t: Tree) => Math.abs(t.x - (from + to) * 0.45) / 25 + Math.abs(t.z + 5);
    const tree = trees.filter((t) => t.z > -14 && t.z < -3 && far(t.x, t.z)).sort((p, q) => score(p) - score(q))[0];
    const sit = tree && perchOn(tree, (tree.snag ? 2 : 2.3) + next() * 0.5, next() < 0.5 ? -1 : 1, 1.3);
    if (sit) owls.push({ at: sit(0.62), yaw: -Math.PI / 2 });
    else {
      for (let k = 0; k < 40; k++) {
        const x = from + 6 + next() * (source.goalX - from - 10);
        const z = -4.2 - next() * 1.6;
        // A stump stands on the ground, by the level where he plays; four EL back it is in nobody's way.
        if (!far(x, z) || underSkerry(x) || !level(x) || !grows(bare, x) || Math.abs(ground(x) - ground(from + 4)) > 4 || (source.pine && Math.abs(x - source.pine.x) < 5.5) || !clear(x, ground(x) + 2, z, 3)) continue;
        const tall = 1.4 + next() * 0.5;
        props.push(...placed(stump(tall, 0.32), x, ground(x) - 0.1, z, next() * 6));
        owls.push({ at: [x, ground(x) + tall - 0.12, z], yaw: -Math.PI / 2 + (next() - 0.5) * 0.4 });
        break;
      }
    }
  }

  // Small birds: in twos and threes, on the ground just behind the path, or on a low branch, every twenty or thirty EL.
  const flocks: Flock[] = [];
  const kinds = cast.birds ?? [];
  for (let x = from + 7 + next() * 8; kinds.length && x < to - 5; x += 16 + next() * 12) {
    const species = kinds[Math.floor(next() * kinds.length)]!;
    const n = next() < 0.6 ? 3 : 2;
    const near = trees.find((t) => !t.snag && Math.abs(t.x - x) < 3 && t.z > -7 && t.z < -3 && free(t.x));
    const sit = near && next() < 0.45 && perchOn(near, 1.5 + next() * 0.9, next() < 0.5 ? -1 : 1, 1.8);
    if (sit) {
      const birds = Array.from({ length: n }, (_, k): Rest => ({ at: sit(0.45 + k * 0.22), yaw: (next() < 0.5 ? 0 : Math.PI) + (next() - 0.5) * 0.8 }));
      if (birds.every((b) => clear(b.at[0], b.at[1], b.at[2]))) flocks.push({ x: near.x, y: birds[0]!.at[1], species, birds, perch: true, shelter: false });
      continue;
    }
    // Each its own step from the middle, depth and way it faces; the flock settles where all of them can.
    const spots = Array.from({ length: n }, (_, k) => [(k - (n - 1) / 2) * (0.7 + next() * 0.5), -1.9 + (back + 1.9) * next(), (next() < 0.5 ? 0 : Math.PI) + (next() - 0.5) * 1.2] as const);
    // Well clear of the candy, a hop either way included.
    const c = nearest(x, 12, (c) => spots.every(([dx, z]) => (soil(c + dx) || (place === 'village' && paved(c + dx))) && clear(c + dx, ground(c + dx), z, 2.3)));
    if (c === null) continue;
    flocks.push({ x: c, y: ground(c), species, birds: spots.map(([dx, z, yaw]) => ({ at: [c + dx, ground(c + dx), z], yaw })), perch: false, shelter: false });
    x = Math.max(x, c);
  }
  // In the storm: a few birds sit out the rain close together on low branches, and none flies.
  const shelter = storm ? SHELTER[place] : undefined;
  if (shelter) {
    const used = new Set<Tree>();
    spread(2, (a, b) => {
      // Up in a tree, they are in nobody's way: only the chapter's ends are kept clear.
      const tree = trees.filter((t) => !used.has(t) && t.z > -18 && t.x > from + 4 && t.x < to - 4 && owls.every((o) => Math.abs(o.at[0] - t.x) > 6) && [...used].every((u) => Math.abs(u.x - t.x) > 25))
        .sort((p, q) => Math.abs(p.x - (a + b) / 2) - Math.abs(q.x - (a + b) / 2))[0];
      const sit = tree && perchOn(tree, 1.8 + next() * 1.2, next() < 0.5 ? -1 : 1, 1.5);
      if (!sit) return;
      used.add(tree);
      flocks.push({ x: tree.x, y: tree.y, species: shelter, birds: [0.5, 0.68].map((k) => ({ at: sit(k), yaw: (next() < 0.5 ? 0 : Math.PI) + (next() - 0.5) * 0.6 })), perch: true, shelter: true });
    });
  }

  // Butterflies by day: over the garden's lawn, settling on its dandelions; over the bog's meadow, on its moss.
  const butterflies: Plan['butterflies'] = [];
  if (cast.butterflies) {
    const heads = place === 'garden' && KIT ? standing(dressing, KIT.petal).map((h) => [h.at.x, h.at.y + 0.04, h.at.z] as V3).filter((h) => h[2] < -1.2) : [];
    for (let k = 0, x = from + 5 + next() * 10; k < cast.butterflies && x < to - 4; x += 16 + next() * 18) {
      const c = nearest(x, 8, soil);
      const z = -1.6 - next() * (place === 'bog' ? 0.7 : 2.4);
      if (c === null) continue;
      // A dandelion near, or where there is none the top of the moss.
      const ground_ = [-0.8, 0.6].map((dx): V3 => [c + dx, ground(c + dx) + 0.32, z]).filter((f) => soil(f[0]));
      const flowers = (heads.length ? heads.filter((h) => Math.abs(h[0] - c) < 4) : ground_).filter((f) => clear(f[0], f[1], f[2])).slice(0, 4);
      if (!flowers.length) continue;
      butterflies.push({ home: [c, ground(c) + 1.7, z], flowers });
      x = Math.max(x, c);
      k++;
    }
  }

  // Dragonflies over the water by day: one every dozen EL of it, clear of the candy over the hops.
  const dragonflies: V3[] = [];
  if (cast.dragonflies) {
    for (const w of source.water ?? []) {
      for (let x = w.from + 2 + next() * 3; x < w.to - 1.5; x += 8 + next() * 5) {
        // Over the water behind the path, out of the candy's way: it darts about a step from where it hovers.
        const at: V3 = [x, w.y + 1.3 + next() * 0.6, -2.6 - next() * 1.2];
        if (clear(at[0], at[1], at[2], 2.2)) dragonflies.push(at);
      }
    }
  }

  /**
   * Spots behind the path, far from candy and the story's things, with a stone or a stump in front: of the places
   * tried, those that stand in the widest gaps of the trail, so that none looks to be by a candy.
   */
  const hideouts = (n: number, taken: number[]): Peek[] => {
    const tried: { x: number; z: number; gap: number }[] = [];
    for (let k = 0; k < 90; k++) {
      const x = from + 8 + next() * (to - from - 16);
      const z = place === 'bog' ? -2.1 : -2.5 - next() * 0.9;
      const y = ground(x);
      if (!soil(x) || !clear(x, y + 0.4, z, 2.8)) continue;
      tried.push({ x, z, gap: gap(x, y) });
    }
    tried.sort((a, b) => b.gap - a.gap);
    const out: Peek[] = [];
    for (const { x, z } of tried) {
      if (out.length >= n || taken.concat(out.map((o) => o.at[0])).some((t) => Math.abs(t - x) < 10)) continue;
      const y = ground(x);
      // As high as the moss and the ferns round it, or a little higher, so that what peeks over it is seen.
      const size = 1.25 + next() * 0.3;
      const stumpy = place === 'forest' && next() < 0.4;
      const yaw = next() * 6.28;
      props.push(...placed(
        stumpy ? stump(0.95, 0.42) : place === 'mountain' ? stone(size, '#9a9da4', '#c4c6b4') : place === 'bog' ? stone(size, '#7d8a36', '#9aa246') : place === 'garden' ? stone(size, '#8f918c', '#a4ab7a') : stone(size, '#8a877c', '#5f7a34'),
        x, y - 0.06, z, stumpy ? yaw : yaw * 0.1));
      out.push({ at: [x, y, z], top: y + (stumpy ? 0.97 : size * 0.68), deep: stumpy ? 0.45 : size * 0.45, wide: stumpy ? 0.44 : size * 0.55, side: next() < 0.5 ? -1 : 1, lichen: place !== 'forest' });
    }
    return out;
  };
  const beings = hideouts(cast.beings ?? 0, []);
  const carvings = hideouts(CARVED[source.id] ?? 0, beings.map((b) => b.at[0])).map((h): Carved => ({
    // Left on the top of its stone, a little back, as if someone had put it there.
    at: [h.at[0] + h.side * h.wide * 0.25, h.top - 0.05, h.at[2] - h.deep * 0.3], yaw: -Math.PI / 2 + h.side * 0.5,
    shape: (['bird', 'hare', 'nisse'] as const)[Math.floor(next() * 3)]!,
  }));

  // Fireflies at dusk, and in the storm's eye once it is calm.
  const fireflies = place === 'dusk' || (storm && source.storm?.calm) ? 36 : 0;
  const plan: Plan = { place, trees, squirrels, fox: !!cast.fox, owls, flocks, butterflies, dragonflies, fireflies, beings, carvings, props, ground };
  const any = squirrels.length + owls.length + flocks.length + butterflies.length + dragonflies.length + fireflies + beings.length + carvings.length;
  return any > 0 || plan.fox ? plan : null;
}
