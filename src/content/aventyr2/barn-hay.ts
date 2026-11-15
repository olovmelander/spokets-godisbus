import { AdditiveBlending, BufferGeometry, Color, DynamicDrawUsage, Float32BufferAttribute, Points, PointsMaterial, Vector3 } from 'three';
import { sequence } from '../../render/dressing/kit';
import { glowTexture } from '../../render/glow';

/**
 * The hay in Billsta's barn (Olov, 14 November 2026: "Kan vi göra höet inne i ladan snyggare?"). It was bales of upright
 * slabs, each a box in its own tan, and a row of smooth lumps along the wall: crates and sponges. He is fifteen
 * centimetres tall: to him a stalk of hay is as long as he is, and a bale is a wall of them.
 *
 * So it is made of stalks. The bales are small square bales lying end on to us, two deep and stacked as a loft's are:
 * each a soft-cornered block, bulging between its two twines, which bite into it over its top and down its end; its
 * faces are stalks pressed flat, across its long sides and every which way in its end; stalks stick out of its edges,
 * and wisps hang over them. Along the back wall, behind the bales and round the hatch, loose hay lies heaped, lumpy
 * and tousled, spilling down into the hatch and over the back bales. Single straws lie about on the boards, most near the
 * hay, a few dragged out through the door. Between the stalks the hay is dark: every stalk is darker at its foot, where
 * it goes in, and the mass under them darker still. Mormor's lantern warms it from the door (./straw.ts), and dust
 * hangs in its light.
 *
 * All of it is one shape of vertex colours, one draw, and the dust another. It stands on the loft's floor and on the
 * steps the simulation has (`HayPlace.bales`): each bale's top is flat where he walks, at the height he stands on.
 */

/** Where the hay is: the loft, in the world's own measures (./barn-loft.ts, ./chapters/billsta.ts). */
export interface HayPlace {
  /** The loft's floor, its back wall's inner face, and how near us anything of the hay may come (inside the barn's front). */
  floor: number;
  back: number;
  front: number;
  /** The gables' inner faces. */
  left: number;
  right: number;
  /** The steps he climbs: each a stack of bales from `low` up to `high`, where he stands. */
  bales: readonly { from: number; to: number; low: number; high: number }[];
  /** The hatch in the floor. */
  hatch: { from: number; to: number };
  /** Where the planks come in at the door, and how high they are there: a few straws lie out on them. */
  threshold: { x: number; slope: number };
  /** Where the lantern's light is, in the loft: its middle, and how far it reaches. */
  lamps: readonly { x: number; y: number; z: number; reach: number }[];
}

/** How far to either side of the plane he walks in a bale's top is level, at the height he stands on. */
export const WALKED = 0.85;
/** Dried grass: pale, golden, olive, a little green still in it, and old brown stalks; and the dark between them. */
const TONES = ['#dccb8c', '#cdb669', '#c0a85e', '#ac9f58', '#96984f', '#a58446'].map((hex) => new Color(hex));
const MASS = ['#a8914b', '#9d8946', '#b09a52', '#968242'].map((hex) => new Color(hex));
const DEEP = new Color('#4d3f20');
const TWINE = [new Color('#7a5326'), new Color('#5c3d1c')];

const UP = new Vector3(0, 1, 0);

/** Smooth noise over the plane, 0 to 1: the lumps of a heap and the patches of a bale's face. */
function noise(x: number, y: number): number {
  const hash = (i: number, j: number) => {
    const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return (hash(i, j) * (1 - u) + hash(i + 1, j) * u) * (1 - v) + (hash(i, j + 1) * (1 - u) + hash(i + 1, j + 1) * u) * v;
}
const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** The shape as it grows: corners with their normals, colours and whether they are of the pressed mass (its fibres are drawn). */
class Mass {
  readonly position: number[] = [];
  readonly normal: number[] = [];
  readonly colour: number[] = [];
  readonly fibre: number[] = [];
  readonly index: number[] = [];
  corner(p: Vector3, n: Vector3, c: Color, fibre: number): number {
    this.position.push(p.x, p.y, p.z);
    this.normal.push(n.x, n.y, n.z);
    this.colour.push(c.r, c.g, c.b);
    this.fibre.push(fibre);
    return this.position.length / 3 - 1;
  }
  /** A sheet of `across` by `along` corners, each given by where it is on the sheet (0 to 1 both ways). */
  sheet(across: number, along: number, at: (u: number, v: number) => { p: Vector3; c: Color }, fibre = 1, flip = false): void {
    const first = this.position.length / 3;
    const points: Vector3[] = [];
    const colours: Color[] = [];
    for (let j = 0; j <= along; j++) for (let i = 0; i <= across; i++) {
      const made = at(i / across, j / along);
      points.push(made.p);
      colours.push(made.c);
    }
    // Each corner's normal from its neighbours on the sheet.
    const a = new Vector3(), b = new Vector3(), n = new Vector3();
    for (let j = 0; j <= along; j++) for (let i = 0; i <= across; i++) {
      const here = j * (across + 1) + i;
      a.subVectors(points[j * (across + 1) + Math.min(across, i + 1)]!, points[j * (across + 1) + Math.max(0, i - 1)]!);
      b.subVectors(points[Math.min(along, j + 1) * (across + 1) + i]!, points[Math.max(0, j - 1) * (across + 1) + i]!);
      n.crossVectors(a, b).normalize();
      if (flip) n.negate();
      this.corner(points[here]!, n, colours[here]!, fibre);
    }
    for (let j = 0; j < along; j++) for (let i = 0; i < across; i++) {
      const k = first + j * (across + 1) + i, l = k + across + 1;
      // Wound so that its front is the side its normals are on.
      if (flip) this.index.push(k, l, k + 1, k + 1, l, l + 1);
      else this.index.push(k, k + 1, l, k + 1, l + 1, l);
    }
  }
  /**
   * A stalk: a thin flat blade through the points, `wide` at its foot and narrowing to its tip, darker at its foot.
   * `side`: which way its flat lies across. `crossed`: a second blade across the first, for one that stands free.
   */
  stalk(points: readonly Vector3[], side: Vector3, wide: number, foot: Color, tip: Color, crossed = false): void {
    const along = new Vector3(), n = new Vector3(), across = new Vector3(), c = new Color();
    for (const turn of crossed ? [0, 1] : [0]) {
      const first = this.position.length / 3;
      for (const [i, p] of points.entries()) {
        const t = i / (points.length - 1);
        along.subVectors(points[Math.min(points.length - 1, i + 1)]!, points[Math.max(0, i - 1)]!).normalize();
        across.copy(side).addScaledVector(along, -side.dot(along)).normalize();
        n.crossVectors(across, along).normalize();
        if (turn) { const swap = across.clone(); across.copy(n); n.copy(swap).negate(); }
        const half = (wide / 2) * (1 - 0.7 * t * t) * (i === 0 ? 0.8 : 1);
        c.copy(foot).lerp(tip, Math.min(1, t * 1.6));
        this.corner(new Vector3().copy(p).addScaledVector(across, -half), n, c, 0);
        this.corner(new Vector3().copy(p).addScaledVector(across, half), n, c, 0);
        if (i > 0) {
          const k = first + (i - 1) * 2;
          this.index.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
        }
      }
    }
  }
  /** A stalk from `from` along `way`, `long`; it rises off what it lies on (`out`) towards its tip by `lift`, and hangs by `droop`. */
  straw(from: Vector3, way: Vector3, out: Vector3, long: number, wide: number, lift: number, droop: number, foot: Color, tip: Color, crossed = false, bend = 0, roll = 0): void {
    const side = new Vector3().crossVectors(way, out);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();
    // Its flat turned a little about its own length (`roll`): lying dead flat, a stalk seen along its face is a hair.
    // It bends in what it lies on, whichever way its flat is turned.
    const flat = new Vector3().copy(side).multiplyScalar(Math.cos(roll)).addScaledVector(out, Math.sin(roll)).normalize();
    const points: Vector3[] = [];
    const pieces = long > 0.9 ? 4 : 3;
    for (let k = 0; k <= pieces; k++) {
      const t = k / pieces;
      points.push(new Vector3().copy(from).addScaledVector(way, long * t).addScaledVector(out, lift * long * t * t)
        .addScaledVector(UP, -droop * long * t * t).addScaledVector(side, bend * long * Math.sin(Math.PI * t)));
    }
    this.stalk(points, flat, wide, foot, tip, crossed);
  }
  /** A cord: a thin four-sided rope through the points. */
  cord(points: readonly Vector3[], thick: number, colours: readonly Color[]): void {
    const first = this.position.length / 3;
    const along = new Vector3(), a = new Vector3(), b = new Vector3(), n = new Vector3();
    for (const [i, p] of points.entries()) {
      along.subVectors(points[Math.min(points.length - 1, i + 1)]!, points[Math.max(0, i - 1)]!).normalize();
      a.crossVectors(along, Math.abs(along.x) > 0.9 ? UP : new Vector3(1, 0, 0)).normalize();
      b.crossVectors(along, a).normalize();
      for (let k = 0; k < 4; k++) {
        const turn = (k / 4) * Math.PI * 2;
        n.copy(a).multiplyScalar(Math.cos(turn)).addScaledVector(b, Math.sin(turn));
        // Twisted of two strands: lighter and darker by turns along it.
        this.corner(new Vector3().copy(p).addScaledVector(n, thick), n.clone(), colours[(i + k) % 2]!, 0);
      }
      if (i > 0) for (let k = 0; k < 4; k++) {
        const here = first + (i - 1) * 4 + k, next = first + (i - 1) * 4 + ((k + 1) % 4);
        this.index.push(here, next, here + 4, next, next + 4, here + 4);
      }
    }
  }
  shape(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(this.position, 3));
    geometry.setAttribute('normal', new Float32BufferAttribute(this.normal, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(this.colour, 3));
    geometry.setAttribute('fibre', new Float32BufferAttribute(this.fibre, 1));
    geometry.setIndex(this.index);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  }
}

/** One bale: where it lies (its length is from `z0` at the back to `z1` at its near end), and which of its sides are seen. */
interface Bale { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number; left: boolean; right: boolean; walked: boolean; seed: number }

/** How round a bale's edges are, how deep its twines bite, and how far in from each side they run. */
const ROUND = 0.13, BITE = 0.085, TWINES = [0.27, 0.73];

/**
 * A bale's skin at a point of its box (its bulges, its bitten-in twines and its soft edges), and how much in shadow it
 * is there. `face`: 'top', 'end' (its near end, towards us) or 'side'; (`u`, `v`): where on that face.
 */
function baleSkin(b: Bale, face: 'top' | 'end' | 'left' | 'right', u: number, v: number): { p: Vector3; shade: number } {
  const wide = b.x1 - b.x0, tall = b.y1 - b.y0, long = b.z1 - b.z0;
  const p = new Vector3();
  const out = new Vector3();
  if (face === 'top') { p.set(b.x0 + wide * u, b.y1, b.z0 + long * v); out.set(0, 1, 0); }
  else if (face === 'end') { p.set(b.x0 + wide * u, b.y0 + tall * v, b.z1); out.set(0, 0, 1); }
  else if (face === 'left') { p.set(b.x0, b.y0 + tall * v, b.z0 + long * u); out.set(-1, 0, 0); }
  else { p.set(b.x1, b.y0 + tall * v, b.z0 + long * u); out.set(1, 0, 0); }
  // Soft edges where its top meets its end and its sides, and where its end meets its sides: towards the box drawn
  // in by `ROUND`, and out again by as much, as a rounded box is.
  const inner = new Vector3(
    Math.min(b.x1 - ROUND, Math.max(b.x0 + ROUND, p.x)), Math.min(b.y1 - ROUND, p.y), Math.min(b.z1 - ROUND, p.z),
  );
  const off = new Vector3().subVectors(p, inner);
  if (off.lengthSq() > 1e-9) p.copy(inner).addScaledVector(off.normalize(), ROUND);
  // The twines bite in across its top and down its end, and it bulges between them and its edges.
  const across = (p.x - b.x0) / wide;
  let bite = 0;
  for (const twine of TWINES) bite = Math.max(bite, Math.exp(-((((across - twine) * wide) / 0.075) ** 2)));
  const lump = noise(p.x * 2.1 + b.seed, (p.y + p.z) * 2.1) - 0.5;
  let push = 0;
  if (face === 'end') push = 0.05 * Math.sin(Math.PI * Math.min(1, Math.max(0, v))) + 0.07 * lump - BITE * bite;
  else if (face === 'top') {
    // Level where he walks; behind that, and on a bale nobody walks on, a little uneven.
    const free = b.walked ? smooth((Math.abs(p.z) - WALKED) / 0.5) : 1;
    push = (0.05 * lump + 0.02) * free - BITE * bite * (b.walked ? 0.75 : 1);
    if (b.walked && free === 0) push = Math.min(0, push);
  } else push = 0.06 * lump;
  p.addScaledVector(out, push);
  // In shadow: at its foot, in the twines' grooves, and at the joints with the bales beside it.
  const foot = 1 - 0.35 * (1 - smooth((p.y - b.y0) / 0.4));
  const joint = face === 'end' || face === 'top' ? 1 - 0.3 * (1 - smooth(Math.min(across, 1 - across) * wide / 0.16)) : 1;
  return { p, shade: foot * joint * (1 - 0.4 * bite) };
}

/** A bale: its mass, its two twines, the stalks pressed flat on it, those that stick out of its edges, and the wisps that hang. */
function bale(m: Mass, b: Bale, place: HayPlace): void {
  const random = sequence(b.seed * 7919 + 13);
  const wide = b.x1 - b.x0, tall = b.y1 - b.y0, long = b.z1 - b.z0;
  const tone = MASS[b.seed % MASS.length]!;
  const colour = new Color();
  const skin = (face: 'top' | 'end' | 'left' | 'right') => (u: number, v: number) => {
    const { p, shade } = baleSkin(b, face, u, v);
    const patch = 0.86 + 0.28 * noise(p.x * 1.4 + p.z * 0.9 + b.seed, p.y * 1.6 + p.z * 0.7);
    return { p, c: colour.copy(tone).multiplyScalar(shade * patch).clone() };
  };
  const cells = (span: number) => Math.max(3, Math.round(span / 0.14));
  m.sheet(cells(wide), cells(long), skin('top'), 1, true);
  m.sheet(cells(wide), cells(tall), skin('end'));
  // Its two long sides too, though a bale beside it hides most of them: the joint between two bales is a dark cleft.
  m.sheet(cells(long), cells(tall), skin('left'));
  m.sheet(cells(long), cells(tall), skin('right'), 1, true);

  // The twines: over its top from the back, round its edge and down its near end, lying in the grooves they have bitten.
  for (const twine of TWINES) {
    const line: Vector3[] = [];
    for (let k = 0; k <= 10; k++) line.push(baleSkin(b, 'top', twine, k / 10).p.add(new Vector3(0, b.walked ? 0.006 : 0.03, 0)));
    for (let k = 9; k >= 0; k--) line.push(baleSkin(b, 'end', twine, k / 10).p.add(new Vector3(0, 0, 0.034)));
    m.cord(line, 0.03, TWINE);
  }

  const pick = () => TONES[Math.floor(random() * TONES.length)]!;
  const foot = new Color();
  /** A stalk pressed flat on a face, at (`u`, `v`) of it, lying `turn` round from the face's own way across. */
  const pressed = (face: 'top' | 'end' | 'left' | 'right', u: number, v: number, turn: number, long_: number) => {
    // The twines lie over the stalks: none begins under one, and none crosses one.
    const bound = face === 'top' || face === 'end';
    const clear = 0.06 / wide;
    if (bound && TWINES.some((twine) => Math.abs(u - twine) < clear)) return;
    const here = baleSkin(b, face, u, v);
    // It lies flat in its face's own plane, over the bulges and the twines' grooves: along the face's two ways.
    const du = new Vector3(), dv = new Vector3(), out = new Vector3();
    if (face === 'top') { du.set(1, 0, 0); dv.set(0, 0, 1); out.set(0, 1, 0); }
    else if (face === 'end') { du.set(1, 0, 0); dv.set(0, 1, 0); out.set(0, 0, 1); }
    else { du.set(0, 0, 1); dv.set(0, 1, 0); out.set(face === 'left' ? -1 : 1, 0, 0); }
    // It stays on its face, and between the twines it lies between: as long as the way to the nearest of them, at the most.
    const [spanU, spanV] = face === 'top' ? [wide, long] : face === 'end' ? [wide, tall] : [long, tall];
    const stepU = Math.cos(turn) / spanU, stepV = Math.sin(turn) / spanV;
    let low = 0.02, high = 0.98;
    if (bound) for (const twine of TWINES) {
      if (twine < u) low = Math.max(low, twine + clear);
      else high = Math.min(high, twine - clear);
    }
    const room = Math.min(stepU > 0 ? (high - u) / stepU : stepU < 0 ? (low - u) / stepU : 9, stepV > 0 ? (0.96 - v) / stepV : stepV < 0 ? (0.03 - v) / stepV : 9);
    long_ = Math.min(long_, room);
    if (long_ < 0.1) return;
    const way = du.multiplyScalar(Math.cos(turn)).addScaledVector(dv, Math.sin(turn)).normalize();
    const tip = pick();
    foot.copy(tip).lerp(DEEP, 0.55).multiplyScalar(here.shade);
    // Nothing of it stands over where he walks: it lies in the top's own height there.
    const level = face === 'top' && b.walked && Math.abs(here.p.z) < WALKED + 0.3;
    if (level) here.p.y = b.y1;
    const lift = level ? 0 : random() < 0.12 ? 0.03 + random() * 0.08 : 0.004;
    m.straw(here.p.addScaledVector(out, level ? 0.006 : 0.016), way, out, long_, 0.022 + random() * 0.03, lift, 0, foot, tip.clone().multiplyScalar(0.92 + random() * 0.2), false, (random() - 0.5) * 0.3,
      face === 'top' ? (level ? 0.5 : 0.9) * (random() < 0.5 ? -1 : 1) * (0.5 + 0.5 * random()) : (random() - 0.5) * 0.7);
  };
  // A bale behind another has its near end against that one: only what is seen of it is dressed.
  const seen = b.walked;
  // Its near end: a flake's face, the stalks lying every which way in it.
  for (let i = 0; seen && i < Math.round(wide * tall * 52); i++) pressed('end', 0.04 + random() * 0.92, 0.05 + random() * 0.9, random() * Math.PI * 2, 0.3 + random() * 0.55);
  // Its long sides and its top: the stalks go across it, bent over where the baler folded them, a little askew.
  const acrossIt = () => (random() < 0.5 ? 0 : Math.PI) + (random() - 0.5) * 1.0;
  for (let i = 0; i < Math.round(wide * long * 20); i++) pressed('top', 0.05 + random() * 0.9, 0.03 + random() * 0.94, acrossIt(), 0.3 + random() * 0.5);
  for (const face of ['left', 'right'] as const) {
    if (!b[face]) continue;
    for (let i = 0; i < Math.round(long * tall * 16); i++) pressed(face, 0.03 + random() * 0.94, 0.06 + random() * 0.88, Math.PI / 2 + acrossIt(), 0.3 + random() * 0.45);
  }

  // Stalks sticking out of its edges: all round its near end, and along its top's sides.
  const out = new Vector3(), way = new Vector3();
  const fringe = (at: Vector3, outward: Vector3, most: number) => {
    const tip = pick();
    foot.copy(tip).lerp(DEEP, 0.6);
    way.copy(outward).add(out.set(random() - 0.5, random() - 0.3, random() - 0.5).multiplyScalar(0.9)).normalize();
    let long_ = 0.18 + random() * most;
    // Never up over where he walks, out through the barn's front, or through a gable.
    if (b.walked && at.y > b.y1 - 0.25) way.y = Math.min(way.y, Math.abs(at.z) < WALKED + 0.4 ? 0.02 : 0.22);
    way.normalize();
    if (way.z > 0) long_ = Math.min(long_, (place.front - 0.03 - at.z) / way.z);
    if (way.x > 0) long_ = Math.min(long_, (place.right - 0.04 - at.x) / way.x);
    if (way.x < 0) long_ = Math.min(long_, (at.x - place.left - 0.04) / -way.x);
    if (long_ < 0.08) return;
    m.straw(at, way, UP, long_, 0.02 + random() * 0.022, 0, 0.12 + random() * 0.3, foot, tip, true);
  };
  for (let i = 0; seen && i < Math.round((wide + tall) * 9); i++) {
    const u = random(), edge = Math.floor(random() * 3);
    // Along the end's top edge, and down its two upright edges.
    if (edge === 0) fringe(baleSkin(b, 'end', u, 0.97).p, new Vector3(0, 0.5, 0.6), 0.34);
    else if (edge === 1 && b.left) fringe(baleSkin(b, 'end', 0.03, 0.1 + 0.85 * u).p, new Vector3(-0.8, 0, 0.4), 0.3);
    else if (edge === 2 && b.right) fringe(baleSkin(b, 'end', 0.97, 0.1 + 0.85 * u).p, new Vector3(0.8, 0, 0.4), 0.3);
  }
  for (const [face, side] of [['left', -1], ['right', 1]] as const) {
    if (!b[face]) continue;
    for (let i = 0; i < Math.round(long * 5); i++) {
      const at = baleSkin(b, face, 0.04 + random() * 0.92, 0.96).p;
      // Not out over the ground he walks on beside it.
      if (Math.abs(at.z) > WALKED + 0.1) fringe(at, new Vector3(side * 0.8, 0.35, 0), 0.3);
    }
  }

  // Wisps hanging over its near edge, down its end: each from a little way back on its top, over the edge and down.
  for (let i = 0; seen && i < Math.round(wide * 4.5); i++) {
    const u = 0.06 + random() * 0.88, hangs = 0.25 + random() * Math.min(0.75, tall * 0.7), back = 0.12 + random() * 0.3;
    const top = baleSkin(b, 'top', u, 1 - back / long).p, edge = baleSkin(b, 'end', u, 0.985).p;
    const points = [
      top.add(new Vector3(0, 0.006, 0)),
      edge.clone().add(new Vector3((random() - 0.5) * 0.06, 0.012, 0.012)),
      baleSkin(b, 'end', Math.min(0.98, Math.max(0.02, u + (random() - 0.5) * 0.12)), 1 - (hangs * 0.5) / tall).p.add(new Vector3(0, 0, 0.022)),
      baleSkin(b, 'end', Math.min(0.98, Math.max(0.02, u + (random() - 0.5) * 0.2)), Math.max(0.03, 1 - hangs / tall)).p.add(new Vector3(0, 0, 0.03 + random() * 0.03)),
    ];
    const tip = pick();
    m.stalk(points, new Vector3(1, 0, 0), 0.024 + random() * 0.02, foot.copy(tip).lerp(DEEP, 0.3).clone(), tip, false);
  }
}

/** A heap of loose hay along the back wall: where it lies, how high against the wall, and what it lies on. */
interface Heap { from: number; to: number; base: number; high: number; reach: number; seed: number; hatch?: { from: number; to: number } }

/** How much a heap has slid into the hatch at `x` (0 to 1), and how far it reaches from the wall there. */
const slidIn = (h: Heap, x: number) => (h.hatch ? smooth((x - h.hatch.from + 0.35) / 0.5) * smooth((h.hatch.to + 0.35 - x) / 0.5) : 0);
const reachAt = (h: Heap, x: number) => h.reach * (0.75 + 0.5 * noise(x * 0.7 + h.seed, 3.3)) * (1 - 0.3 * slidIn(h, x));

/** How high over its base a heap's top is at a place. */
function heapAt(h: Heap, place: HayPlace, x: number, z: number): number {
  const ends = smooth((x - h.from) / 0.9) * smooth((h.to - x) / 0.9);
  // Over the hatch it has slid in: lower, and nearer the wall.
  const over = slidIn(h, x);
  const reach = reachAt(h, x);
  const t = Math.min(1, (z - place.back) / reach);
  const lumps = 0.6 + 0.5 * noise(x * 1.1 + h.seed, z * 1.3) + 0.15 * noise(x * 2.9, z * 3.1 + h.seed);
  const tall = h.high * ends * lumps * (1 - 0.45 * over);
  // A soft slope from the wall down to its foot, which dips under what it lies on.
  return tall * (1 - smooth(t)) ** 0.8 * (1 - t * 0.2) - 0.5 * smooth((t - 0.82) / 0.18) - 0.9 * over * smooth((t - 0.45) / 0.5);
}

function heap(m: Mass, h: Heap, place: HayPlace): void {
  const random = sequence(h.seed * 104729 + 7);
  const deep = h.reach * 1.25;
  const colour = new Color();
  const at = (x: number, z: number) => new Vector3(x, h.base + heapAt(h, place, x, z), z);
  // From the wall out to its foot, wherever that is: the sheet ends there, under what the heap lies on.
  m.sheet(Math.round((h.to - h.from) / 0.17), Math.round(deep / 0.16), (u, v) => {
    const x = h.from + (h.to - h.from) * u, z = place.back + reachAt(h, x) * v;
    const p = at(x, z);
    // Darker in its hollows and at its foot, lighter on its lumps.
    const up = heapAt(h, place, x, z);
    const light = 0.62 + 0.5 * smooth(up / (h.high * 0.9)) + 0.16 * (noise(x * 2.3, z * 2.3 + h.seed) - 0.5);
    return { p, c: colour.copy(MASS[(h.seed + Math.floor(noise(x * 0.8, z * 0.8) * 4)) % MASS.length]!).multiplyScalar(light).clone() };
  }, 1, true);
  // Its stalks: lying on it every which way, most a little down its slope, some standing out of it.
  const count = Math.round((h.to - h.from) * h.reach * 58);
  const n = new Vector3(), way = new Vector3(), foot = new Color();
  for (let i = 0; i < count; i++) {
    const x = h.from + 0.15 + random() * (h.to - h.from - 0.3), z = place.back + 0.05 + random() ** 0.8 * deep * 0.96;
    const up = heapAt(h, place, x, z);
    if (up < -0.2 || z > -WALKED - 0.05) continue;
    const here = at(x, z);
    n.crossVectors(at(x, z + 0.06).sub(at(x, z - 0.06)), at(x + 0.06, z).sub(at(x - 0.06, z))).normalize();
    const turn = random() * Math.PI * 2;
    way.set(Math.cos(turn), 0, Math.sin(turn) + 0.35).addScaledVector(n, -n.dot(way)).normalize();
    way.addScaledVector(n, -n.dot(way)).normalize();
    const tip = TONES[Math.floor(random() * TONES.length)]!;
    const stands = random() < 0.09;
    const long = (stands ? 0.25 : 0.45) + random() * (stands ? 0.3 : 1.1);
    foot.copy(tip).lerp(DEEP, stands ? 0.7 : 0.5).multiplyScalar(0.7 + 0.3 * smooth(up / h.high));
    // Nothing of it reaches out over where he walks, or through a gable.
    if (here.z + way.z * long > -WALKED - 0.05) continue;
    const reaches = here.x + way.x * long;
    if (reaches < place.left + 0.06 || reaches > place.right - 0.06 || here.x < place.left + 0.06 || here.x > place.right - 0.06) continue;
    m.straw(here.addScaledVector(n, 0.015), way, n, long, 0.022 + random() * 0.03, stands ? 0.35 + random() * 0.35 : random() * 0.14, stands ? 0.1 : 0.06,
      foot, tip.clone().multiplyScalar(0.9 + random() * 0.22), stands, (random() - 0.5) * 0.35, (random() - 0.5) * 1.6);
  }
  // Where it has slid into the hatch, stalks hang from its foot down into the dark: a ragged edge, not a cut one.
  if (h.hatch) {
    for (let i = 0; i < 46; i++) {
      const x = h.hatch.from - 0.3 + random() * (h.hatch.to - h.hatch.from + 0.6), z = place.back + reachAt(h, x) * (0.9 + 0.1 * random());
      const here = at(x, z);
      if (here.y > h.base - 0.15) continue;
      const tip = TONES[Math.floor(random() * TONES.length)]!;
      way.set((random() - 0.5) * 0.5, -1, 0.15 + random() * 0.3).normalize();
      m.straw(here, way, new Vector3(0, 0, 1), 0.3 + random() * 0.6, 0.024 + random() * 0.025, 0, 0, foot.copy(tip).lerp(DEEP, 0.4), tip.clone().multiplyScalar(0.75), false, (random() - 0.5) * 0.3, (random() - 0.5) * 0.8);
    }
  }
}

/** Single straws lying about on the boards, and those that hang over the hatch's edges. */
function strays(m: Mass, place: HayPlace): void {
  const random = sequence(4219);
  const way = new Vector3(), foot = new Color(), at = new Vector3();
  const onHay = (x: number) => place.bales.some((b) => x > b.from - 0.25 && x < b.to + 0.25);
  const inHatch = (x: number) => x > place.hatch.from - 0.05 && x < place.hatch.to + 0.05;
  const lay = (x: number, y: number, z: number, long: number, slope = 0) => {
    const turn = random() * Math.PI * 2;
    way.set(Math.cos(turn), 0, Math.sin(turn));
    // It stays inside the barn's front, and on the planks' slope short of their top.
    if (z + way.z * long > place.front - 0.08) way.z = -Math.abs(way.z);
    if (slope && x + way.x * long > place.threshold.x - 0.05) way.x = -Math.abs(way.x);
    way.y = slope * way.x;
    way.normalize();
    const tip = TONES[Math.floor(random() * TONES.length)]!;
    m.straw(at.set(x, y + 0.014, z), way, UP, long, 0.022 + random() * 0.025, 0, 0, foot.copy(tip).multiplyScalar(0.78), tip, false, (random() - 0.5) * 0.5, (random() < 0.5 ? -1 : 1) * (0.35 + 0.4 * random()));
  };
  // On the floor: most near the hay, thinning out towards the door.
  for (let i = 0; i < 150; i++) {
    const x = place.left + 0.5 + random() * (place.right - place.left - 1), z = place.back + 0.3 + random() * (place.front - place.back - 0.5);
    const long = 0.35 + random() * 0.9;
    if (onHay(x) || inHatch(x) || inHatch(x + 0.9) || inHatch(x - 0.9)) continue;
    const near = Math.min(...place.bales.map((b) => Math.min(Math.abs(x - b.from), Math.abs(x - b.to))), Math.abs(z - place.back) * 0.8);
    if (random() > 1.15 - near * 0.3) continue;
    lay(x, place.floor, Math.min(z, place.front - 0.4), long);
  }
  // A few dragged out through the door onto the planks.
  for (let i = 0; i < 7; i++) {
    const back = 0.3 + random() * 2.6;
    lay(place.threshold.x - back, place.floor - back * place.threshold.slope, -0.9 + random() * 1.9, 0.3 + random() * 0.5, place.threshold.slope);
  }
  // Over the hatch's two edges: from the floor, over the edge and down into it.
  for (const [edge, into] of [[place.hatch.from, 1], [place.hatch.to, -1]] as const) {
    for (let i = 0; i < 16; i++) {
      const z = place.back + 0.4 + random() * (place.front - place.back - 1.3), hangs = 0.2 + random() * 0.7, back = 0.15 + random() * 0.45;
      const tip = TONES[Math.floor(random() * TONES.length)]!;
      const lean = (random() - 0.5) * 0.3;
      m.stalk([
        new Vector3(edge - into * back, place.floor + 0.012, z - lean),
        new Vector3(edge + into * 0.015, place.floor + 0.014, z),
        new Vector3(edge + into * 0.05, place.floor - hangs * 0.5, z + lean * 0.5),
        new Vector3(edge + into * (0.06 + random() * 0.05), place.floor - hangs, z + lean),
      ], new Vector3(0, 0, 1), 0.022 + random() * 0.02, foot.copy(tip).multiplyScalar(0.8).clone(), tip.clone().multiplyScalar(0.7));
    }
  }
}

/** The bales of a step, as a loft stacks them: side by side, two deep, each its own. */
function stacked(place: HayPlace): Bale[] {
  const out: Bale[] = [];
  const seam = -0.92;
  for (const [i, step] of place.bales.entries()) {
    const columns = Math.max(1, Math.round((step.to - step.from) / 1.4));
    const wide = (step.to - step.from) / columns;
    // Standing on the floor, it goes on down into it; on another bale, it stands on that.
    const y0 = step.low <= place.floor + 1e-6 ? step.low - 0.4 : step.low - 0.03;
    for (let c = 0; c < columns; c++) {
      const x0 = step.from + c * wide, x1 = x0 + wide;
      // Seen from the side where no other bale stands against it as high.
      const beside = (x: number) => place.bales.some((other) => other !== step && x > other.from + 0.05 && x < other.to - 0.05 && other.high >= step.high - 0.05 && other.low <= step.low + 0.05);
      const left = c === 0 && !beside(x0 - 0.2) && x0 - 0.2 > place.left, right = c === columns - 1 && !beside(x1 + 0.2) && x1 + 0.3 < place.right;
      const seed = i * 10 + c * 2 + 1;
      // The near one, which he walks on, and the one behind it against the wall, a hand's breadth out of line.
      out.push({ x0: x0 + 0.012, x1: x1 - 0.012, y0, y1: step.high, z0: seam, z1: place.front - 0.24, left, right, walked: true, seed });
      const askew = ((seed * 37) % 7) / 7 - 0.5;
      out.push({ x0: x0 + 0.012 + askew * 0.05, x1: x1 - 0.012 + askew * 0.05, y0, y1: step.high + 0.02 + 0.03 * ((seed * 13) % 5) / 5, z0: place.back + 0.06, z1: seam + 0.05, left, right, walked: false, seed: seed + 1 });
    }
  }
  return out;
}

/** All the hay of the loft, one shape. */
export function loftHay(place: HayPlace): BufferGeometry {
  const m = new Mass();
  for (const one of stacked(place)) bale(m, one, place);
  // Loose hay along the back wall: by the door, behind the first bales and over them, round the hatch, and up over the
  // stack at the gable.
  const first = place.bales[0]!, stack = place.bales.filter((b) => b !== first);
  const stackFrom = Math.min(...stack.map((b) => b.from)), stackTop = Math.max(...stack.map((b) => b.high));
  heap(m, { from: place.left + 0.1, to: first.from + 0.5, base: place.floor, high: 0.85, reach: 1.55, seed: 3 }, place);
  heap(m, { from: first.from - 0.3, to: first.to + 0.3, base: first.high, high: 0.3, reach: 1.3, seed: 5 }, place);
  heap(m, { from: first.to - 0.4, to: stackFrom + 0.5, base: place.floor, high: 1.05, reach: 1.9, seed: 8, hatch: place.hatch }, place);
  for (const [i, b] of stack.entries()) {
    // Only on a bale's own top: where a higher one stands on it, that one has the hay.
    const covered = stack.find((other) => other !== b && other.low >= b.high - 0.05 && other.from < b.to - 0.05 && other.to > b.from + 0.05);
    const to = covered ? covered.from + 0.35 : Math.min(place.right - 0.05, b.to + 0.4);
    if (to - b.from > 1) heap(m, { from: b.from - 0.35, to, base: b.high, high: b.high >= stackTop - 0.05 ? 0.75 : 0.6, reach: 1.45, seed: 11 + i * 3 }, place);
  }
  strays(m, place);
  return m.shape();
}

/**
 * Dust in the lantern's light: specks of chaff hanging in the loft's air, drifting slowly, each brightest near the
 * lamp. One draw of points. `tick`: `lit` 0 to 1, how much the lantern lights the loft now; `still`, less motion.
 */
export function hayDust(place: HayPlace, count = 54): { points: Points; tick(clock: number, lit: number, still: boolean): void } {
  const random = sequence(977);
  const seeds = Array.from({ length: count }, () => {
    const lamp = place.lamps[Math.floor(random() * place.lamps.length)]!;
    const far = lamp.reach * (0.15 + 0.6 * random()), turn = random() * Math.PI * 2;
    return {
      x: Math.min(place.right - 0.4, Math.max(place.left + 0.3, lamp.x + Math.cos(turn) * far)),
      y: Math.max(place.floor + 0.25, lamp.y + (random() - 0.6) * lamp.reach * 0.5),
      z: Math.min(place.front - 0.4, Math.max(place.back + 0.3, lamp.z + Math.sin(turn) * far * 0.6)),
      phase: random() * 40, pace: 0.5 + random(), size: 0.6 + random() * 0.8,
    };
  });
  const geometry = new BufferGeometry();
  const position = new Float32BufferAttribute(new Float32Array(count * 3), 3).setUsage(DynamicDrawUsage);
  const colour = new Float32BufferAttribute(new Float32Array(count * 3), 3).setUsage(DynamicDrawUsage);
  geometry.setAttribute('position', position);
  geometry.setAttribute('color', colour);
  // (A point's size is in EL at a picture's own height from the camera: these are a few pixels across.)
  const material = new PointsMaterial({ size: 0.34, sizeAttenuation: true, map: glowTexture(32), vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending });
  const points = new Points(geometry, material);
  points.name = 'barn-dust';
  points.frustumCulled = false;
  const warm = new Color('#ffcf8a');
  return {
    points,
    tick(clock, lit, still) {
      points.visible = lit > 0.01;
      if (!points.visible) return;
      const t = still ? 0 : clock;
      for (const [i, s] of seeds.entries()) {
        // A slow drift, a little up and round, each at its own pace: the loft's air is nearly still.
        const x = s.x + 0.35 * Math.sin(t * 0.11 * s.pace + s.phase), y = s.y + 0.3 * Math.sin(t * 0.07 * s.pace + s.phase * 1.7) + 0.12 * Math.sin(t * 0.31 + s.phase);
        const z = s.z + 0.3 * Math.cos(t * 0.09 * s.pace + s.phase * 0.6);
        position.setXYZ(i, x, y, z);
        let light = 0;
        for (const lamp of place.lamps) light = Math.max(light, 1 - Math.min(1, Math.hypot(x - lamp.x, y - lamp.y, z - lamp.z) / lamp.reach));
        // It glints as it turns.
        const glint = 0.55 + 0.45 * Math.sin(t * 0.9 * s.pace + s.phase * 3);
        const k = lit * light * (0.4 + 0.6 * light) * glint * s.size * 1.5;
        colour.setXYZ(i, warm.r * k, warm.g * k, warm.b * k);
      }
      position.needsUpdate = true;
      colour.needsUpdate = true;
    },
  };
}
