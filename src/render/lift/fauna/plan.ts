import { InstancedMesh, Matrix4, Quaternion, Vector3, type Object3D } from 'three';
import type { ChapterData, PlaceId } from '../../../sim/types';
import { standing } from '../../dressing/foreground';
import { KIT, grows, heightAt, landscape, sequence, surfaceAt } from '../../dressing/kit';
import { BIRDS, branch, reed, sapling, stone, stump, type Carving, type Part, type Species, type V3 } from './shapes';

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
/**
 * Where a being peeks out from: over a stone or a stump, its top and its size, which side it leans out on, whether it wears
 * lichen for a cap (else a leaf), and whether it holds a big leaf over its head against the rain (in the storm).
 */
export interface Peek { at: V3; top: number; deep: number; wide: number; side: number; lichen: boolean; umbrella: boolean }
export interface Carved extends Rest { shape: Carving }
/** Where a visiting bird may come down: on the ground behind the path, or on a bough. */
export interface Landing extends Rest { bough: boolean }
/** A bird that comes by itself now and then, lands where it likes in the picture, stays a while and flies off again. */
export interface Visitor { species: Species; landings: Landing[] }
/** What circles high over a place by day, or flits over it at dusk. */
export type Soarer = 'raven' | 'crow' | 'bat';

export interface Plan {
  place: PlaceId;
  trees: Tree[];
  squirrels: Climber[];
  fox: boolean;
  owls: Rest[];
  flocks: Flock[];
  visitors: Visitor[];
  soarers: { kind: Soarer; count: number }[];
  butterflies: { home: V3; flowers: V3[] }[];
  dragonflies: V3[];
  /** Where each dragonfly perches between its darts: the tip of a reed in the water near where it hovers. */
  reeds: V3[];
  fireflies: number;
  beings: Peek[];
  carvings: Carved[];
  /** The stones, stumps and branches they hide behind and sit on, already where they stand. */
  props: Part[];
  /** What the carvings stand on, apart from the rest: drawn with them on every tier (../fauna.ts). */
  stands: Part[];
  /** The ground's height at x, as the dressing has it (the land under a landmark). */
  ground: (x: number) => number;
}

/**
 * Who lives in a place by day. The storm sends all of it into hiding but the birds on their branches and the owl.
 * `visitors` come by themselves, one bird of each kind, now and then; `soarers` circle high over the place.
 */
const CAST: Partial<Record<PlaceId, {
  squirrels?: number; fox?: boolean; birds?: Species[]; butterflies?: number; beings?: number; dragonflies?: boolean;
  visitors?: Species[]; soarers?: { kind: Soarer; count: number }[];
}>> = {
  forest: { squirrels: 3, fox: true, birds: ['tit', 'thrush'], beings: 2, dragonflies: true, visitors: ['tit', 'thrush'] },
  garden: { squirrels: 2, birds: ['blue', 'tit'], butterflies: 5, visitors: ['magpie', 'wagtail', 'blue'], soarers: [{ kind: 'crow', count: 2 }] },
  bog: { birds: ['sparrow', 'tit'], butterflies: 4, beings: 2, dragonflies: true, visitors: ['wagtail'], soarers: [{ kind: 'raven', count: 2 }] },
  mountain: { beings: 2, soarers: [{ kind: 'raven', count: 2 }] },
  village: { birds: ['sparrow'], visitors: ['jackdaw', 'wagtail'] },
};
/** What is out at dusk: bats over the path, against the last of the light. */
const DUSK: { kind: Soarer; count: number }[] = [{ kind: 'bat', count: 3 }];
/** The birds that come down on the ground only: the rest also come down on a bough. */
const GROUNDED = new Set<Species>(['thrush', 'sparrow', 'wagtail', 'magpie', 'jackdaw']);
/** Where the carvings are, a quiet secret in a few chapters of both adventures: how many. */
const CARVED: Record<string, number> = { garden: 1, granskog: 2, myren: 1, berget: 1, stormskog: 1, alven: 1, billsta: 1, flarken: 1, 'look-forest': 1 };
/**
 * Where a carving the plan finds a place for is to stand instead, because what the chapter has there would hide it:
 * `found` is the place the plan finds (within an EL and a half), `x` and `z` where its stone stands. Granskogen's nisse
 * was found right behind the nest tree, where its stems, the bracket fungi, a young spruce of the forest kit and the
 * ghost's stop at x 141 hid it from every picture (Olov, 12 November 2026: "Nissen får va kvar"). It peeks out from the
 * tree's left side, between the log's end and the trunk, as he comes along the log: the stems' own depth and the candy's
 * gap allow it there. Its kind is the plan's, and no draw of the plan's sequence changes, so every other carving keeps
 * its kind and place (tests/unit/lift-fauna.test.ts).
 */
const PEEK: Partial<Record<string, readonly { found: number; x: number; z: number; being?: boolean }[]>> = {
  // The being is Granskogen's second, which hid at the bottom of the ravine he is thrown over. The place the plan then
  // finds for it where he walks is by the jay, in a shaft of light in front of a pale boulder and among the thrushes,
  // where it was not to be seen: it peeks over its stone on the level moss before the seesaw instead (14 November 2026).
  granskog: [{ found: 139.5, x: 138.08, z: -2.84 }, { found: 40.7, x: 105.6, z: -2.9, being: true }],
  // Myren's two found their places where the trail ends, the widest gaps: one behind the crane he boards, the other on the
  // goal's height, where the end page comes (Olov, 15 November 2026: "se till att vättarna syns på ett bra och fint
  // sätt"). They peek out where he arrives, past the first big candy, and on the dry ground before the boardwalk, instead:
  // a step further back than the bog's others, since a sweet lies every two EL along the path there, and far from Pappa's
  // bird on its stone past the lysklubba.
  myren: [
    { found: 184.2, x: 7.5, z: -3, being: true }, { found: 195.2, x: 99.6, z: -3, being: true },
    // Pappa's bird keeps its stone past the lysklubba: it went there because the beings had taken the trail's end.
    { found: 194.7, x: 144.5, z: -2.7 },
  ],
};
/**
 * How many beings peek out in a chapter of the storm (Olov, 15 November 2026: "Kan vi ha vättarna i äventyr 2 också på
 * passande ställen!"): in the storm's forest and by the forest at Billsta, each under a big leaf against the rain; Billsta
 * has room for one, on its one stretch of free grass. Not in the garden, the village or at Olympia, nor at Flärken, whose
 * bathing place has no stone for one, nor in the storm's eye, which is the family's. Nor by the river: Älven's dry banks
 * are all the story's (its stones, the beaver's place, the lift, the end), and the one gap left was right behind its
 * last big lollipop, which hid the being.
 */
const STORM_BEINGS: Partial<Record<string, number>> = { stormskog: 2, billsta: 1 };
/** Where along the path the storm's beings may peek out from: five EL past where he starts in each of those chapters. */
const STORM_BEINGS_FROM = 6;
/**
 * How far each carving stands turned from facing the picture, in radians: the hare and the bird far enough to show what
 * they are from the side (the long back and the tucked tail; the bill and the tail), the nisse nearly facing it.
 */
const TURNED: Record<Carving, number> = { bird: 1.0, hare: 0.8, nisse: 0.45 };
/** How far behind the path an owl sits at most, in EL. */
export const OWL_BACK = -6.5;
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
  const stands: Part[] = [];

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
  /**
   * Where he is carried high over the ground and never walks: the valley under the crane's flight on Berget, the
   * windthrow's widest gap under the owl in Stormskogen, Granskogen's ravine under the seesaw's throw. Nobody hides,
   * nothing is left and no bird hops there: Berget's hare and both its beings stood down in the valley, Stormskogen's
   * bird at the bottom of the gap, and one of Granskogen's beings and three of its thrushes in the ravine, where no
   * picture finds them (Olov, 14 November 2026: "syns tydligt på de platser där de ska förekomma").
   */
  const carried = (x: number) => (source.rides ?? []).some((r) => x > Math.min(r.from.x, r.to.x) + 1 && x < Math.max(r.from.x, r.to.x) - 1
    && ground(x) < Math.min(r.from.y, r.to.y) - 3);
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
  const perchOn = (tree: Tree, h: number, side: number, want: number, rand = next, unbuilt = false): ((k: number) => V3) | null => {
    const a = side * (0.55 + rand() * 0.4);
    const r = girth(tree, h) * 0.92;
    const root: V3 = [tree.x + Math.sin(a) * r, tree.y + h, tree.z + Math.cos(a) * r];
    const long = Math.min(want, (-1.4 - root[2]) / Math.cos(a));
    if (long < want * 0.6) return null;
    const toward = Math.atan2(-Math.cos(a), Math.sin(a));
    if (!unbuilt) props.push(...placed(branch(long + r * 0.1, toward, tree.snag ? 0.05 : 0.07), root[0], root[1], root[2]));
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
    /**
     * A stump behind the path, four or five EL back, where it is in nobody's way, with the owl on it: on ground near the
     * height he starts at (`startLevel`), or anywhere level he walks (Stormgården starts on the veranda, six EL up).
     */
    const onStump = (rand: () => number, startLevel = true) => {
      for (let k = 0; k < 40; k++) {
        const x = from + 6 + rand() * (source.goalX - from - 10);
        const z = -4.2 - rand() * 1.6;
        // A stump stands on the ground, by the level where he plays.
        if (!far(x, z) || underSkerry(x) || !level(x) || !grows(bare, x) || (startLevel && Math.abs(ground(x) - ground(from + 4)) > 4) || (source.pine && Math.abs(x - source.pine.x) < 5.5) || !clear(x, ground(x) + 2, z, 3)) continue;
        const tall = 1.4 + rand() * 0.5;
        props.push(...placed(stump(tall, 0.32), x, ground(x) - 0.1, z, rand() * 6));
        owls.push({ at: [x, ground(x) + tall - 0.12, z], yaw: -Math.PI / 2 + (rand() - 0.5) * 0.4 });
        return true;
      }
      return false;
    };
    // The numbers drawn for the trunk are drawn as they always were, so that everything placed after the owl (the
    // carvings) stays where it was. A trunk whose branch would sit the owl further back than `OWL_BACK` is not used: there
    // it was a soft brown shape, eight to eleven EL behind the path in Stormgården, Olympia and Stormens öga (Olov, 14
    // November 2026: "syns tydligt på de platser där de ska förekomma"). It sits on a nearer trunk instead, or on a stump
    // just behind the path, placed by numbers of its own.
    let sat = false;
    if (tree) {
      const h = (tree.snag ? 2 : 2.3) + next() * 0.5, side = next() < 0.5 ? -1 : 1, turn = next();
      const where = perchOn(tree, h, side, 1.3, () => turn, true);
      if (where && where(0.62)[2] > OWL_BACK) {
        owls.push({ at: perchOn(tree, h, side, 1.3, () => turn)!(0.62), yaw: -Math.PI / 2 });
        sat = true;
      } else if (where) {
        const own = sequence(seedOf(source.id) ^ 0x0b1e5);
        const near = trees.filter((t) => t.z > -6 && t.z < -3 && far(t.x, t.z) && !underSkerry(t.x) && Math.abs(t.y - ground(t.x)) < 2).sort((p, q) => score(p) - score(q));
        for (const t of near.slice(0, 4)) {
          const sit = perchOn(t, (t.snag ? 2 : 2.3) + own() * 0.5, own() < 0.5 ? -1 : 1, 1.3, own);
          if (!sit || sit(0.62)[2] <= OWL_BACK) continue;
          owls.push({ at: sit(0.62), yaw: -Math.PI / 2 });
          sat = true;
          break;
        }
        if (!sat) sat = onStump(own, false);
        // Nowhere nearer: on its trunk as it always was.
        if (!sat) owls.push({ at: perchOn(tree, h, side, 1.3, () => turn)!(0.62), yaw: -Math.PI / 2 });
        sat = true;
      }
    }
    if (!sat) onStump(next);
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
    type Spots = readonly (readonly [number, number, number])[];
    const settles = (c: number, at: Spots = spots) => at.every(([dx, z]) => (soil(c + dx) || (place === 'village' && paved(c + dx))) && clear(c + dx, ground(c + dx), z, 2.3));
    const c = nearest(x, 12, settles);
    if (c === null) continue;
    // Found where he is carried over the ground (the only stretch without candy), it settles where he walks instead: the
    // nearest such place along the chapter, further back from the path, where the trail's candy leaves it room. The plan
    // goes on from where it was found, so that everything placed after it stays where it was.
    let seen: number | null = c, seats: Spots = spots;
    if (spots.some(([dx]) => carried(c + dx))) {
      const back: Spots = spots.map(([dx, z, yaw]) => [dx, Math.min(z, -2.7), yaw] as const);
      seats = back;
      seen = nearest(c, 60, (c) => settles(c, back) && back.every(([dx]) => !carried(c + dx)) && flocks.every((f) => Math.abs(f.x - c) > 12));
    }
    if (seen !== null) {
      const here = seen;
      flocks.push({ x: here, y: ground(here), species, birds: seats.map(([dx, z, yaw]) => ({ at: [here + dx, ground(here + dx), z], yaw })), perch: false, shelter: false });
    }
    x = Math.max(x, c);
  }
  // In the storm: a few birds sit out the rain close together on low branches, and none flies.
  const shelter = storm ? SHELTER[place] : undefined;
  if (shelter) {
    // They sat in whichever trunk stood nearest the middle of each half of the chapter, however far back: eight to
    // seventeen EL behind the path in Stormgården, Stormskogen, Billsta and Stormens öga, where a tit is a few soft pixels
    // (Olov, 14 November 2026: "syns tydligt på de platser där de ska förekomma"). Now in a near trunk, three to seven
    // and a half EL back, at about the height he walks at, and not behind one of the storm's buildings.
    //
    // The plan's own numbers are drawn here as they were when the birds sat far back, with nothing put up, so that
    // everything placed after them (the carvings) stays where it was. Where the birds now sit is drawn from numbers of
    // their own, once the carvings stand (`seatShelter`, below): a sapling keeps clear of a carving's stone.
    const was = new Set<Tree>();
    spread(2, (a, b) => {
      const middle = (p: Tree, q: Tree) => Math.abs(p.x - (a + b) / 2) - Math.abs(q.x - (a + b) / 2);
      const far = trees.filter((t) => !was.has(t) && t.z > -18 && t.x > from + 4 && t.x < to - 4 && owls.every((o) => Math.abs(o.at[0] - t.x) > 6) && [...was].every((u) => Math.abs(u.x - t.x) > 25)).sort(middle)[0];
      if (far && perchOn(far, 1.8 + next() * 1.2, next() < 0.5 ? -1 : 1, 1.5, next, true)) {
        was.add(far);
        for (let k = 0; k < 4; k++) next();
      }
    });
  }
  const seatShelter = (species: Species, carved: readonly number[]) => {
    const used = new Set<Tree>();
    const own = sequence(seedOf(source.id) ^ 0x5e17e4);
    const open = (t: Tree) => (source.storm?.buildings ?? []).every((s) => s.z < t.z - 3 || Math.abs(s.x - t.x) > (s.width ?? 6) / 2 + 2);
    // Where he can come: not in the land that lies beyond the chapter's goal.
    const walked = (x: number) => x > from + 4 && x < Math.min(to, source.goalX) - 4;
    spread(2, (a, b) => {
      const middle = (p: Tree, q: Tree) => Math.abs(p.x - (a + b) / 2) - Math.abs(q.x - (a + b) / 2);
      // Up in a tree, they are in nobody's way: only the chapter's ends are kept clear.
      const near = trees.filter((t) => !used.has(t) && t.z > -7.5 && t.z < -3 && Math.abs(t.y - ground(t.x)) < 2.5 && open(t) && walked(t.x) && t.x > a - 10 && t.x < b + 10
        && owls.every((o) => Math.abs(o.at[0] - t.x) > 6) && [...used].every((u) => Math.abs(u.x - t.x) > 25)).sort(middle);
      const settle = (tree: Tree, sit: (k: number) => V3) => {
        used.add(tree);
        flocks.push({ x: tree.x, y: tree.y, species, birds: [0.5, 0.68].map((k) => ({ at: sit(k), yaw: (own() < 0.5 ? 0 : Math.PI) + (own() - 0.5) * 0.6 })), perch: true, shelter: true });
      };
      for (const tree of near.slice(0, 4)) {
        const sit = perchOn(tree, 1.8 + own() * 1.2, own() < 0.5 ? -1 : 1, 1.5, own);
        if (!sit) continue;
        settle(tree, sit);
        return;
      }
      // No trunk stands near enough there: a dead sapling does, bare, just behind the path, with a bough for them.
      for (let k = 0; k < 40; k++) {
        const x = a + 3 + own() * Math.max(1, b - a - 6);
        const z = place === 'bog' ? -2.2 : -3.2 - own() * 1.1;
        const tall = 2.2 + own() * 0.5;
        const stem: Tree = { x, y: ground(x), z, r: 0.12, sy: 1, snag: true };
        if (!walked(x) || !soil(x) || carried(x) || !clear(x, ground(x) + 1.9, z, 2.6) || !open(stem) || carved.some((c) => Math.abs(c - x) < 3.5)
          || owls.some((o) => Math.abs(o.at[0] - x) < 6) || [...used].some((u) => Math.abs(u.x - x) < 25)) continue;
        const sit = perchOn(stem, 1.75 + own() * 0.3, own() < 0.5 ? -1 : 1, 1.2, own);
        if (!sit) continue;
        props.push(...placed(sapling(tall), x, ground(x) - 0.1, z, own() * 6));
        settle(stem, sit);
        return;
      }
    });
  };

  // Visitors: places on the ground behind the path every few EL, and a few dead boughs on the near trunks, where a bird
  // that comes by itself may come down. Clear of the candy (a hop either way included), of the story's things, and of
  // where the flocks sit, so that none lands on another.
  const visitors: Visitor[] = [];
  const kinds_ = cast.visitors ?? [];
  if (kinds_.length) {
    // A sequence of their own, so that what was placed before them stays where it was.
    const next = sequence(seedOf(source.id) ^ 0x2f6b9d3);
    const sitting = flocks.flatMap((f) => f.birds.map((b) => b.at));
    const apart = (x: number, z: number) => sitting.every((at) => Math.hypot(at[0] - x, at[2] - z) > 1.6);
    // A bird stands on a gentle slope as well as on the level, and walks over it.
    const gentle = (x: number) => Math.abs(ground(x - 0.6) - ground(x)) < 0.3 && Math.abs(ground(x + 0.6) - ground(x)) < 0.3;
    // Under the open sky: not under the deck's roof, nor by the house, which it would fly through to come down.
    const open = (x: number) => (source.roofs ?? []).every((r) => x < r.from - 1.5 || x > r.to + 1.5) && (!source.house || x < source.house.from - 1 || x > source.house.to + 1);
    const stand = (x: number) => free(x) && open(x) && gentle(x) && ((grows(bare, x) && grows(bare, x - 0.6) && grows(bare, x + 0.6)) || (place === 'village' && paved(x)));
    const ground_: Landing[] = [];
    for (let x = from + 4 + next() * 3; x < to - 4; x += 2.5 + next() * 2) {
      const z = -2 + (back + 2) * next();
      const c = nearest(x, 1.5, (c) => stand(c) && clear(c, ground(c), z, 2.6) && apart(c, z));
      if (c === null) continue;
      ground_.push({ at: [c, ground(c), z], yaw: (next() < 0.5 ? 0 : Math.PI) + (next() - 0.5) * 1, bough: false });
      x = Math.max(x, c);
    }
    const boughs: Landing[] = [];
    if (kinds_.some((k) => !GROUNDED.has(k))) {
      let last = -Infinity;
      for (const tree of trees) {
        if (tree.z > -3 || tree.z < -7.5 || !free(tree.x) || tree.x - last < 6 || next() < 0.2) continue;
        const sit = perchOn(tree, 1.6 + next() * 1.2, next() < 0.5 ? -1 : 1, 1.6, next);
        if (!sit) continue;
        last = tree.x;
        const at = sit(0.58);
        if (clear(at[0], at[1], at[2], 1.8) && apart(at[0], at[2])) boughs.push({ at, yaw: (next() < 0.5 ? 0 : Math.PI) + (next() - 0.5) * 0.6, bough: true });
      }
    }
    // Seen from the front, a bird well behind the path stands as high in the picture as a big lollipop's top: none
    // comes down behind one, where it would seem to sit on it, nor beside one, by the bird's own size.
    const aside = (l: Landing, species: Species) => (source.checkpoints ?? []).every((c) => c.y < l.at[1] - 1 || c.y > l.at[1] + 3.5 || Math.abs(c.x - l.at[0]) >= 1.2 + BIRDS[species].size * 0.6);
    for (const species of kinds_) {
      const landings = (GROUNDED.has(species) ? ground_ : [...boughs, ...ground_.filter((_, k) => k % 2 === 0)]).filter((l) => aside(l, species));
      if (landings.length) visitors.push({ species, landings });
    }
  }
  const soarers = (place === 'dusk' && !storm ? DUSK : cast.soarers ?? []).filter((s) => s.count > 0);

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
  const reeds: V3[] = [];
  if (cast.dragonflies) {
    // The reeds draw from a sequence of their own, so that everything placed after them stays where it was.
    const stem = sequence(seedOf(source.id) ^ 0x5eed1e);
    for (const w of source.water ?? []) {
      for (let x = w.from + 2 + next() * 3; x < w.to - 1.5; x += 8 + next() * 5) {
        // Over the water behind the path, out of the candy's way: it darts about a step from where it hovers.
        const at: V3 = [x, w.y + 1.3 + next() * 0.6, -2.6 - next() * 1.2];
        if (!clear(at[0], at[1], at[2], 2.2)) continue;
        dragonflies.push(at);
        // A reed stands in the water beside it, a little further back, as tall as he is: its tip is where it perches
        // between its darts (the creature overhaul, 13 November 2026).
        const tall = 0.95 + stem() * 0.35;
        const foot: V3 = [Math.min(w.to - 0.5, Math.max(w.from + 0.5, at[0] + (stem() - 0.5) * 1.6)), w.y - 0.3, Math.min(-2.3, at[2] - 0.2 - stem() * 0.5)];
        props.push(...placed(reed(tall), foot[0], foot[1], foot[2], stem() * 6));
        reeds.push([foot[0], foot[1] + tall, foot[2]]);
      }
    }
  }

  /**
   * Spots behind the path, far from candy and the story's things, with a stone or a stump in front: of the places
   * tried, those that stand in the widest gaps of the trail, so that none looks to be by a candy.
   */
  const hideouts = (n: number, taken: number[], carved = false, ask: { draw?: () => number; since?: number; until?: number; tries?: number } = {}): Peek[] => {
    const { draw = next, since = from + 8, until = to - 8, tries = 90 } = ask;
    const tried: { x: number; z: number; gap: number }[] = [];
    for (let k = 0; k < tries; k++) {
      const x = since + draw() * (until - since);
      const z = place === 'bog' ? -2.1 : -2.5 - draw() * 0.9;
      const y = ground(x);
      if (!soil(x) || carried(x) || !clear(x, y + 0.4, z, 2.8)) continue;
      tried.push({ x, z, gap: gap(x, y) });
    }
    tried.sort((a, b) => b.gap - a.gap);
    // Apart from those taken, and from where the plan found each already chosen (before `PEEK` moved it): so that moving
    // one does not change which the plan chooses next.
    const chosen: number[] = [];
    const apart = (x: number) => taken.concat(chosen).every((t) => Math.abs(t - x) >= 10);
    // Where the trail's candy lies all along the dry ground (Myren: a sweet every two EL, one over every hop), no spot
    // tried is clear of it, or the only ones are by those taken. A carving then looks every half EL for the widest gap
    // of the trail, a little further back on the same dry ground, not beside a big lollipop, and of those the one
    // furthest from the story's things. It is only asked when the tries came to too few, so a chapter that has its
    // carvings keeps them where they are (Olov, 12 November 2026: Myren had none).
    if (carved && tried.filter((t) => apart(t.x)).length < n) {
      const z = place === 'bog' ? -2.7 : -3.4;
      const room = (x: number) => Math.min(9, ...busy.map(([a, b]) => Math.max(a - x, x - b)));
      const found: { x: number; z: number; gap: number; room: number }[] = [];
      for (let x = Math.ceil(from + 8); x <= to - 8; x += 0.5) {
        if (!soil(x) || carried(x) || !clear(x, ground(x) + 0.4, z, 2.8) || (source.checkpoints ?? []).some((c) => Math.abs(c.y - ground(x)) < 1.5 && Math.abs(c.x - x) < 2)) continue;
        found.push({ x, z, gap: gap(x, ground(x)), room: room(x) });
      }
      tried.push(...found.sort((a, b) => b.gap - a.gap || b.room - a.room));
    }
    const out: Peek[] = [];
    for (const { x: found, z: back } of tried) {
      if (out.length >= n || !apart(found)) continue;
      chosen.push(found);
      // A carving or a being that the plan puts where a chapter's own things hide it peeks out elsewhere instead (`PEEK`).
      const peek = PEEK[source.id]?.find((p) => !p.being === carved && Math.abs(p.found - found) < 1.5);
      const x = peek?.x ?? found, z = peek?.z ?? back;
      const y = ground(x);
      // As high as the moss and the ferns round it, or a little higher, so that what peeks over it is seen.
      const size = 1.25 + draw() * 0.3;
      const stumpy = place === 'forest' && draw() < 0.4;
      const yaw = draw() * 6.28;
      // Drawn on every tier, as what it stands behind or sits on is (../fauna.ts).
      stands.push(...placed(
        stumpy ? stump(0.95, 0.42) : place === 'mountain' ? stone(size, '#9a9da4', '#c4c6b4') : place === 'bog' ? stone(size, '#8c8b7c', '#7d8a36') : place === 'garden' ? stone(size, '#8f918c', '#a4ab7a') : stone(size, '#8a877c', '#5f7a34'),
        x, y - 0.06, z, stumpy ? yaw : yaw * 0.1));
      out.push({ at: [x, y, z], top: y + (stumpy ? 0.97 : size * 0.68), deep: stumpy ? 0.45 : size * 0.45, wide: stumpy ? 0.44 : size * 0.55, side: draw() < 0.5 ? -1 : 1, lichen: place !== 'forest', umbrella: storm });
    }
    return out;
  };
  const beings = hideouts(cast.beings ?? 0, []);
  const carvings = hideouts(CARVED[source.id] ?? 0, beings.map((b) => b.at[0]), true).map((h): Carved => {
    const shape = (['bird', 'hare', 'nisse'] as const)[Math.floor(next() * 3)]!;
    // Left on the top of its stone as if someone had put it there, turned from the picture by its kind. Near the
    // middle of the top, its plinth a little into the moss: further out and back, where the stone's top falls away, one
    // end of the plinth hung in the air.
    return { at: [h.at[0] + h.side * h.wide * 0.1, h.top - 0.045, h.at[2] - h.deep * 0.08], yaw: -Math.PI / 2 + h.side * TURNED[shape], shape };
  });
  // The storm's beings come after the carvings, from a sequence of their own, and keep away from them: so that every
  // carving keeps the place and the kind it had.
  // Where he goes: from a little past where he starts to short of the goal. Billsta's ground reaches thirty EL back behind
  // him, where nobody goes; each of these chapters begins at 1, and a picture that starts him elsewhere (`?at`) moves none.
  if (storm) {
    beings.push(...hideouts(STORM_BEINGS[source.id] ?? 0, carvings.map((c) => c.at[0]), false, {
      draw: sequence(seedOf(source.id) ^ 0x7a77e), since: Math.max(from + 8, STORM_BEINGS_FROM), until: Math.min(to - 8, source.goalX - 6), tries: 400,
    }));
  }
  if (shelter) seatShelter(shelter, carvings.map((c) => c.at[0]));

  // Fireflies at dusk, and in the storm's eye once it is calm.
  const fireflies = place === 'dusk' || (storm && source.storm?.calm) ? 36 : 0;
  const plan: Plan = { place, trees, squirrels, fox: !!cast.fox, owls, flocks, visitors, soarers, butterflies, dragonflies, reeds, fireflies, beings, carvings, props, stands, ground };
  const any = squirrels.length + owls.length + flocks.length + visitors.length + soarers.length + butterflies.length + dragonflies.length + fireflies + beings.length + carvings.length;
  return any > 0 || plan.fox ? plan : null;
}
