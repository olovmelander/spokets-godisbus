import { Color, InstancedMesh, Matrix4, Object3D, Vector3, type BufferGeometry, type Group, type Material } from 'three';
import type { ChapterData, PlaceId } from '../../../sim/types';
import { KIT, grows, heightAt, sequence } from '../../dressing/kit';
import { gardenViewGap } from '../../garden-home';
import { backRise } from '../../mountain-kit';
import { STREET_DEPTH } from '../../village';

/** Where the village's church and belfry stand far behind the street (src/render/view.ts): no tree in front of them. */
const CHURCH_X = 46;
import { walkLine } from '../../dressing/foreground';
import { Cards } from './light';

/**
 * The crowns of the flora (docs/visual-upgrade.md): what was a pillar of bark gets its boughs, and between the path
 * and the far pictures stand young birches, pines and spruces with their crowns in the picture.
 *
 * Every tree is one shape of cards that face the camera (./light.ts `Cards`), 1 high, so that the wind's sway
 * (../../wind.ts) moves its crown by its height: the foot stays, the top goes furthest. A kind is one mesh of
 * instances for the whole chapter.
 */

const TAN = Math.tan(Math.PI / 12);
/** About how high over the ground he stands on the picture reaches at a depth, on a tablet held sideways (the lens 10.9 off). */
export const TOP = (z: number, lens = 10.9) => 0.08 * lens + (lens - z) * TAN;

/**
 * How high the picture's top reaches at a depth, at most, wherever he is when a thing at x is in it: the picture
 * follows where he can stand (dressing/foreground.ts `walkLine`), waits at the edge of a drop, and is wider and
 * lifted where the chapter says. A bough hung under that never hangs into the middle of the picture.
 */
export function pictureTop(chapter: ChapterData): (x: number, z: number) => number {
  const walk = walkLine(chapter);
  return (x, z) => {
    let top = -Infinity;
    const half = (10.9 - z) * TAN * 1.5;
    for (let eye = x - half; eye <= x + half; eye += 1) {
      const zones = (chapter.cameras ?? []).filter((zone) => eye >= zone.from && eye <= zone.to);
      const lens = 10.9 * Math.max(1, ...zones.map((zone) => zone.zoom ?? 1));
      // He may stand on a ledge over the ground there, and the picture goes up with him.
      const stand = Math.max(walk(eye, true), ...(chapter.ledges ?? []).filter((l) => Math.abs(l.x - eye) < l.width / 2).map((l) => l.y));
      top = Math.max(top, stand + TOP(z, lens) + Math.max(0, ...zones.map((zone) => zone.lift ?? 0)));
    }
    return top;
  };
}

const hex = (colour: string) => new Color(colour);
/** The leaves of October: birch green going yellow, the dark of spruce, the lighter grey-green of pine. */
const BIRCH = ['#7d9a3c', '#93a447', '#6f8c38', '#b4ac4c', '#a3a24a'].map(hex);
const SPRUCE = ['#2c4636', '#34523a', '#283f30', '#3e5838'].map(hex);
const PINE = ['#506c3a', '#5c7440', '#4a6438'].map(hex);
const WHITE = hex('#ffffff');
const BARK = hex('#a08c74');

/** A young birch, 12 high: a white stem, a crown like an egg of leaf clumps, and strands hanging at its edge. */
function birch(): BufferGeometry {
  const next = sequence(71);
  const H = 12;
  const cards = new Cards(new Vector3(0, H * 0.68, 0), new Vector3(3.2, H * 0.32, 1.6));
  cards.stem(0, 0, 0, H * 0.96, 0.3, 0.05, 'birch', WHITE, 0.4);
  for (let i = 0; i < 54; i++) {
    const [ux, uy, uz] = ball(next);
    const foot = [ux * 3.1, H * 0.68 + uy * H * 0.3, uz * 1.5] as const;
    cards.card(foot, Math.atan2(uy + 0.3, ux) + (next() - 0.5) * 0.8, 1.5 + next() * 0.8, 1.5 + next() * 0.7, 'clump', BIRCH[Math.floor(next() * 5)]!, (next() - 0.5) * 1.2);
  }
  for (let i = 0; i < 16; i++) {
    const side = next() < 0.5 ? -1 : 1;
    const foot = [side * (1.4 + next() * 1.8), H * (0.5 + next() * 0.25), (next() - 0.5) * 2.4] as const;
    cards.card(foot, -Math.PI / 2 + side * (0.15 + next() * 0.2), 1.8 + next() * 1.6, 1 + next() * 0.4, 'strand', BIRCH[Math.floor(next() * 3)]!, (next() - 0.5) * 0.8, -side * 0.25);
  }
  return cards.build(1 / H);
}

/**
 * The lowest boughs of a big birch, whose crown is far over the picture: clumps and hanging strands around its
 * trunk, 8 high from the lowest tip, as wide as a crown is. Its foot is where those tips hang.
 */
function birchBoughs(): BufferGeometry {
  const next = sequence(73);
  const H = 8;
  const cards = new Cards(new Vector3(0, 5, 0), new Vector3(5, 3.5, 1.6));
  for (let i = 0; i < 46; i++) {
    const x = (next() - 0.5) * 11;
    const foot = [x, 3.2 + next() * 5 - Math.abs(x) * 0.25, (next() - 0.5) * 3.2] as const;
    cards.card(foot, Math.atan2(0.4, x) + (next() - 0.5) * 0.9, 1.4 + next() * 0.8, 1.5 + next() * 0.7, 'clump', BIRCH[Math.floor(next() * 5)]!, (next() - 0.5) * 1.2);
  }
  for (let i = 0; i < 26; i++) {
    const x = (next() - 0.5) * 10;
    const side = Math.sign(x) || 1;
    const foot = [x, 2.2 + next() * 2.6, (next() - 0.5) * 3.4] as const;
    cards.card(foot, -Math.PI / 2 + side * (0.1 + next() * 0.2), 2 + next() * 2, 1 + next() * 0.4, 'strand', BIRCH[Math.floor(next() * 3)]!, (next() - 0.5) * 0.8, -side * 0.2);
  }
  return cards.build(1 / H);
}

/** Sprays of a spruce's boughs, in tiers up its stem from `from`, as long as `reach` says at a height. */
function sprays(cards: Cards, next: () => number, from: number, to: number, every: number, reach: (y: number) => number, round: number, out = 0.5): void {
  for (let y = from; y < to; y += every * (0.8 + next() * 0.4)) {
    for (let k = 0; k < 3; k++) {
      const side = k === 0 ? -1 : k === 1 ? 1 : next() < 0.5 ? -1 : 1;
      const long = reach(y) * (0.75 + next() * 0.35) * (k === 2 ? 0.7 : 1);
      const angle = (side > 0 ? 0 : Math.PI) - side * (0.25 + next() * 0.3);
      const foot = [side * out, y + 0.3, (next() - 0.5) * round * (k === 2 ? 2.4 : 1.2)] as const;
      cards.card(foot, angle, long, long * 0.55 + 0.4, 'spray', SPRUCE[Math.floor(next() * 4)]!, (next() - 0.5) * (k === 2 ? 1.8 : 0.8), side * 0.35);
    }
  }
}

/** The boughs of a big spruce from where their lowest tips hang, 12 high: the trunk stands in the middle. */
function spruceBoughs(): BufferGeometry {
  const next = sequence(79);
  const H = 12;
  const cards = new Cards(new Vector3(0, 6, 0), new Vector3(4.5, 6, 1.6));
  sprays(cards, next, 1.1, H, 0.75, (y) => 4.4 - y * 0.12, 1.3, 0.7);
  return cards.build(1 / H);
}

/** A young spruce, 10 high: a thin stem and its cone of tiers, to its top shoot. */
function spruce(): BufferGeometry {
  const next = sequence(83);
  const H = 10;
  const cards = new Cards(new Vector3(0, H * 0.45, 0), new Vector3(3, H * 0.5, 1.5));
  cards.stem(0, 0, 0, H * 0.96, 0.16, 0.03, 'pine', hex('#6a6058'));
  sprays(cards, next, H * 0.08, H * 0.92, 0.55, (y) => (1 - y / H) * 3.3 + 0.35, 1, 0.1);
  cards.card([0, H * 0.88, 0], Math.PI / 2, H * 0.12, 0.7, 'spray', SPRUCE[1]!);
  return cards.build(1 / H);
}

/** A pine, 14 high: a long straight stem, warm higher up, and a flat crown of needle tufts at its top. */
function pine(): BufferGeometry {
  const next = sequence(89);
  const H = 14;
  const cards = new Cards(new Vector3(0, H * 0.86, 0), new Vector3(2.4, H * 0.13, 1));
  cards.stem(0, 0, 0, H * 0.95, 0.27, 0.07, 'pine', BARK, 0.3);
  for (let i = 0; i < 26; i++) {
    const x = (next() - 0.5) * 4.6;
    const y = H * (0.72 + next() * 0.24) - Math.abs(x) * 0.25;
    cards.card([x, y, (next() - 0.5) * 2], Math.PI / 2 - x * 0.28 + (next() - 0.5) * 0.6, 1.4 + next() * 0.7, 1.7 + next() * 0.6, 'tuft', PINE[Math.floor(next() * 3)]!, (next() - 0.5) * 1.2);
  }
  return cards.build(1 / H);
}

/** A point in a ball of radius 1, nearer its skin than its middle. */
function ball(next: () => number): [number, number, number] {
  for (;;) {
    const p: [number, number, number] = [next() * 2 - 1, next() * 2 - 1, next() * 2 - 1];
    const r = Math.hypot(...p);
    if (r <= 1 && r > 0.35) return p;
  }
}

/** The trees' own colour in a place's light: on the mountain and at dusk the far trees go blue-violet, as its far pictures do. */
export const STAND: Partial<Record<PlaceId, Color>> = { mountain: new Color(0.72, 0.72, 0.9), dusk: new Color(0.5, 0.55, 0.85) };

/** Where one tree of a kind stands: its foot, its height, whether it is turned round, and how light it is. */
export interface Tree { x: number; y: number; z: number; tall: number; flip: boolean; tone: number }

const one = new Object3D();
const matrix = new Matrix4();
/** One kind's trees as one mesh: instanced, coloured, its bounds those of its trees. Null where there are none. */
export function grove(geometry: BufferGeometry, material: Material, trees: readonly Tree[], name: string, light = WHITE): InstancedMesh | null {
  if (trees.length === 0) return null;
  const mesh = new InstancedMesh(geometry, material, trees.length);
  const tint = new Color();
  for (const [i, tree] of trees.entries()) {
    one.position.set(tree.x, tree.y, tree.z);
    one.scale.set(tree.flip ? -tree.tall : tree.tall, tree.tall, tree.tall);
    one.updateMatrix();
    mesh.setMatrixAt(i, one.matrix);
    mesh.setColorAt(i, tint.copy(light).multiplyScalar(tree.tone));
  }
  mesh.name = name;
  mesh.userData.crowns = true;
  mesh.computeBoundingSphere();
  return mesh;
}

/** The instances of the dressing's meshes of one material: their feet and how wide each is. */
function standing(root: Object3D | null | undefined, material: Material): { x: number; y: number; z: number; wide: number }[] {
  const found: { x: number; y: number; z: number; wide: number }[] = [];
  const at = new Vector3();
  const size = new Vector3();
  root?.traverse((object) => {
    const mesh = object as InstancedMesh;
    if (!mesh.isInstancedMesh || mesh.material !== material) return;
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix);
      at.setFromMatrixPosition(matrix);
      size.setFromMatrixScale(matrix);
      found.push({ x: at.x, y: at.y, z: at.z, wide: size.x });
    }
  });
  return found;
}

/** What each place's trees are made of, once for the view. */
export const SHAPES = { birch, birchBoughs, spruceBoughs, spruce, pine };
export type TreeKind = keyof typeof SHAPES;

/**
 * Where the trees stand in a chapter, by kind. `boughs` are for the trunks the dressing already has, and for the
 * birches a chapter builds; the rest stand on their own between the path and the far pictures.
 */
export function plant(chapter: ChapterData, dressing: Group | null | undefined): Record<TreeKind, Tree[]> {
  const next = sequence(chapter.id.length * 131 + 7);
  const trees: Record<TreeKind, Tree[]> = { birch: [], birchBoughs: [], spruceBoughs: [], spruce: [], pine: [] };
  const place = chapter.place;
  if (!place || place === 'home') return trees;
  const from = chapter.ground[0]!.x;
  const to = chapter.ground[chapter.ground.length - 1]!.x;
  const ground = (x: number, z: number) => heightAt(chapter, x) + (place === 'mountain' || place === 'dusk' ? backRise(z) : 0);
  // Nothing of theirs stands in a building of the chapter's, nor in front of one, nor in a view the garden keeps.
  const built = (chapter.storm?.buildings ?? []).filter((b) => b.kind !== 'birch' && b.kind !== 'spruce' && b.kind !== 'mailbox');
  const free = (x: number, z: number, wide: number) => (place === 'village' || (grows(chapter, x) && grows(chapter, x - wide / 2) && grows(chapter, x + wide / 2)))
    && !built.some((b) => Math.abs(x - b.x) < (b.width ?? 10) / 2 + wide / 2 + 1.5 && z > b.z - 14)
    && !(chapter.id === 'garden' && gardenViewGap(x) && z > -29.5) && !(chapter.street ?? []).some((part) => part.kind === 'house' && x > part.from - 2 && x < part.to + 2);
  const tone = () => 0.85 + next() * 0.25;
  /** Its crown's foot just under the top of the picture at its depth, and some of it over the picture. */
  const reaching = (z: number, share: number, more: number) => (TOP(z) - 2.6 - next() * 1.8) / share + next() * more;

  // The boughs of the trunks that are there: the forest's spruces, the lawn's birches, and the birches a chapter builds.
  const top = pictureTop(chapter);
  for (const trunk of standing(dressing, KIT.bark)) {
    trees.spruceBoughs.push({ x: trunk.x, y: top(trunk.x, trunk.z) - 1.2 - next() * 1.1, z: trunk.z, tall: 12 * (0.85 + trunk.wide * 0.2), flip: next() < 0.5, tone: tone() });
  }
  const birches = [
    ...standing(dressing, KIT.birch).map((trunk) => ({ x: trunk.x, y: trunk.y + 0.5, z: trunk.z })),
    ...(chapter.storm?.buildings ?? []).filter((b) => b.kind === 'birch').map((b) => ({ x: b.x, y: b.y ?? heightAt(chapter, b.x), z: b.z })),
    ...(chapter.street ?? []).filter((part) => part.kind === 'yard').map((part) => {
      const x = part.from + (part.lowFence ? 2 : (part.to - part.from) * 0.4);
      return { x, y: part.foot ?? heightAt(chapter, x), z: STREET_DEPTH[part.depth] - 0.6 };
    }),
  ];
  for (const b of birches) trees.birchBoughs.push({ x: b.x, y: Math.max(b.y + 3, top(b.x, b.z) - 1.8 - next() * 0.9), z: b.z, tall: 8 * (0.9 + next() * 0.25), flip: next() < 0.5, tone: tone() });

  // Trees of their own, between the path and the far pictures: each kind as often as its place has it.
  const own: Partial<Record<PlaceId, [TreeKind, number, number, number, number][]>> = {
    // [kind, every so many EL, nearest depth, furthest depth, share of its height where the crown begins]
    forest: [['pine', 9, -13, -24, 0.66], ['spruce', 6, -14, -27, 0], ['birch', 30, -12, -22, 0.4]],
    garden: [['birch', 6, -11, -31, 0.4]],
    village: [['birch', 9, -23, -30, 0.4]],
    bog: [['pine', 13, -10, -24, 0.6], ['spruce', 12, -18, -26, 0], ['birch', 24, -12, -22, 0.4]],
    mountain: [['pine', 26, -14, -24, 0.6], ['spruce', 20, -18, -26, 0]],
    dusk: [['pine', 26, -14, -24, 0.6], ['spruce', 20, -18, -26, 0]],
  };
  for (const [kind, every, near, far, crown] of own[place] ?? []) {
    for (let x = from - 10 + next() * every; x < to + 10; x += every * (0.6 + next() * 0.8)) {
      const z = near + (far - near) * next();
      const wide = kind === 'pine' ? 5 : kind === 'birch' ? 6.5 : 6;
      // In the village only where a yard opens the street, behind its fence, and never in front of Anundsjö's church
      // and belfry far behind it (src/render/view.ts stands them at x 46, z −29; tests/browser/bredbyn.mjs).
      if (place === 'village' && !(chapter.street ?? []).some((part) => part.kind === 'yard' && x > part.from + 3 && x < part.to - 3)) continue;
      if (place === 'village' && Math.abs(x - CHURCH_X) < 18) continue;
      if (!free(x, z, wide)) continue;
      const tall = crown > 0 ? reaching(z, crown, 1.5) : 5 + next() * 7;
      trees[kind].push({ x, y: ground(x, z) - 0.2, z, tall: Math.max(kind === 'pine' ? 9 : 6, tall), flip: next() < 0.5, tone: tone() });
    }
  }
  return trees;
}
