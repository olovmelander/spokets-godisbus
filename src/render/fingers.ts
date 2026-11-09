import { Bone, Matrix4, Quaternion, Skeleton, Vector3, type Object3D, type SkinnedMesh } from 'three';
import { halfOf, weightsOf, writeWeights } from './sleeves';

/**
 * Hands that hold (Olov, 9 November 2026: "can we improve the hands and fingers when the characters grabbing things so it
 * looks good"; his proposal 2 the day before: "Händer med fingrar som griper kniven, kritan och muggen").
 *
 * The family's models from Blender have one bone in each hand, and the hand as it was sculpted (the private repository's
 * family/shared.py): a round palm, the four fingers one block notched apart only at their tips, and a thumb of its own.
 * Whatever a hand held, it held it open and flat: a knife's handle through the palm, a mug beside it.
 *
 * So each hand is given fingers as the model is put on its rig, as the elbows are given their half bones (./joints.ts):
 * three bones in each finger and in the thumb, at the knuckles where the hand's own shape has them, and a half bone at each
 * knuckle that turns half as far, so that a curled knuckle keeps its round. The four fingers curl nearly together, as one
 * block, the little one a little further; the thumb swings across the palm and closes. Their corners are weighed to them
 * here, from where each corner lies; the rest of the model is left as it is.
 *
 * A model whose hands were made with fingers of their own (the private repository's family/finger_hands.py: four
 * fingers and a thumb, each of three parts joined at round knuckles, and three bones in each, `thumb_01_l` ...
 * `pinky_03_r`) is used as it is: its bones are found by name and measured as they rest, and nothing is weighed again.
 * Its fingers move apart: the first finger points, and pinches against the thumb.
 *
 * A hand rests a little curled; it closes round a handle (`power`: the knife's haft, a lamp, a rung) until each finger
 * touches it, the thumb over the fist; hooks (`hook`: a lantern's bail); pinches with the thumb (`pinch`: a crayon, a
 * sheet's edge), tip to tip where the fingers are their own and against the first finger's side where they are one block;
 * puts two fingers through a handle and the thumb on it (`loop`: the mug); points with the first finger (`point`); lies
 * flat on something (`flat`), or opens (`open`). Each grip has a socket: where the held thing's middle is, and its axis, in
 * the hand's own frame (./arm-contact.ts createHandHold puts it in the world).
 */

/** How a hand is shaped. */
export type GripKind = 'rest' | 'open' | 'flat' | 'power' | 'hook' | 'pinch' | 'point' | 'loop';
/** A grip, and the held thing's radius in the world's units (a handle's, a crayon's, a bail's). */
export interface Grip { kind: GripKind; size?: number }

/** The digits, thumb first. */
export const DIGITS = ['thumb', 'index', 'middle', 'ring', 'little'] as const;
export type DigitName = (typeof DIGITS)[number];

/**
 * A hand's shape: each finger's three knuckles (from the palm out), and the thumb's swing across the palm (`across`)
 * with its own three joints. Radians; positive curls in, towards the palm.
 */
export interface Shape {
  fingers: [number, number, number][];
  thumb: { across: number; joints: [number, number, number] };
}

/** One digit as the hand was made: its three joints and its end, in the hand bone's own frame at rest, and its radius. */
export interface Digit { name: DigitName; joints: [Vector3, Vector3, Vector3, Vector3]; radius: number }

/**
 * A hand's layout, measured from its own corners: its digits, and its directions (unit, in the hand bone's frame): along
 * the hand from the wrist (`along`), towards the thumb (`thumbward`) and towards the palm's side (`palmward`). `size` is the
 * hand's unit (its length is 0.112 of it); `palm` is how far the palm's surface stands out on the palm's side, by how far
 * along the hand.
 */
export interface Layout {
  digits: Digit[];
  along: Vector3; thumbward: Vector3; palmward: Vector3;
  size: number;
  palm: (y: number) => number;
  /** Each digit's joints' axes as they rest, in the hand's frame, where the bones say (a model's own fingers). */
  turns?: Vector3[][];
  /** The fingers are each their own, not one block: they may move apart. */
  separate?: boolean;
}

/**
 * The family's hands as their generator makes them (family/shared.py), in its hand units (HAND_K), from the wrist: towards
 * the palm's side (a), towards the thumb (w) and along the hand (y). Each finger: its root, middle and tip as [a, w] (at y
 * 0.064, 0.55 of the way and its length on), and its radius.
 */
const FINGERS = [
  { at: [[-0.003, 0.028], [0.001, 0.0309], [0.011, 0.0383]], length: 0.034, r: 0.0086 },
  { at: [[-0.003, 0.012], [0.001, 0.013], [0.011, 0.0194]], length: 0.041, r: 0.0090 },
  { at: [[-0.003, -0.004], [0.001, -0.005], [0.011, 0.0006]], length: 0.039, r: 0.0088 },
  { at: [[-0.003, -0.019], [0.001, -0.0218], [0.011, -0.0171]], length: 0.031, r: 0.0078 },
] as const;
const ROOT = 0.064, LENGTH = 0.112;
/** The thumb's root (inside the palm), its middle and its tip, as [a, w, y]; and its radius. */
const THUMB = { at: [[0.003, 0.03, 0.026], [0.011, 0.048, 0.044], [0.013, 0.054, 0.062]], r: 0.0108 } as const;
/** Where a finger's knuckles are, from its root knuckle to its end: the bones of a finger are about 45, 30 and 25 of 100. */
const KNUCKLE = 0.066, PHALANGES = [0.45, 0.75] as const;
/** How far each knuckle's blend runs to each side of it, in the digit's radius: wide at the root, narrower further out. */
const BLEND = { fingers: [0.7, 0.55, 0.5], thumb: [1.0, 0.6, 0.45] } as const;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** The largest principal direction of points about their middle (power iteration on their covariance). */
function principal(points: Vector3[], start: Vector3): Vector3 {
  const m = points.reduce((sum, p) => sum.add(p), new Vector3()).divideScalar(points.length);
  const c = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  const d = new Vector3();
  for (const p of points) {
    d.subVectors(p, m);
    const v = [d.x, d.y, d.z];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) c[i * 3 + j] += v[i]! * v[j]!;
  }
  const out = start.clone().normalize(), next = new Vector3();
  for (let n = 0; n < 40; n++) {
    next.set(c[0]! * out.x + c[1]! * out.y + c[2]! * out.z, c[3]! * out.x + c[4]! * out.y + c[5]! * out.z, c[6]! * out.x + c[7]! * out.y + c[8]! * out.z);
    if (next.lengthSq() < 1e-30) break;
    out.copy(next).normalize();
  }
  return out.dot(start) < 0 ? out.negate() : out;
}

/** The largest principal direction of points at right angles to `axis`. */
function flat(points: Vector3[], axis: Vector3): Vector3 {
  const off = points.map((p) => p.clone().addScaledVector(axis, -p.dot(axis)));
  // Any start at right angles to the axis.
  const start = Math.abs(axis.x) < 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 0, 1);
  start.addScaledVector(axis, -start.dot(axis)).normalize();
  const out = principal(off, start);
  return out.addScaledVector(axis, -out.dot(axis)).normalize();
}

/** How far the generator sets a hand bone's tail off the hand's own length: a little forward and out (family/shared.py). */
const TILT = 0.004 / 0.07;

/**
 * Measures a hand from its corners in the hand bone's frame: null if they don't look like one of the family's hands (a
 * palm with four fingers along the bone and a thumb out to one side).
 */
export function measureHand(points: Vector3[]): Layout | null {
  if (points.length < 60) return null;
  let length = 0;
  for (const p of points) length = Math.max(length, p.y);
  if (!(length > 0)) return null;
  const bone = new Vector3(0, 1, 0);
  const fingers = points.filter((p) => p.y > 0.72 * length);
  if (fingers.length < 12) return null;
  // The four fingers lie side by side across the hand.
  const thumbward = flat(fingers, bone);
  const centre = fingers.reduce((sum, p) => sum.add(p), new Vector3()).divideScalar(fingers.length);
  let most = -Infinity, least = Infinity;
  for (const p of points) {
    if (p.y < 0.3 * length || p.y > 0.62 * length) continue;
    const w = p.clone().sub(centre).dot(thumbward);
    most = Math.max(most, w); least = Math.min(least, w);
  }
  // The thumb stands out further to its side than the palm's other edge does.
  if (most < -least) { thumbward.negate(); [most, least] = [-least, -most]; }
  if (!(most > 1.15 * -least)) return null;
  // The fingertips curl in, towards the palm's side.
  const palmward = new Vector3().crossVectors(bone, thumbward).normalize();
  const mean = (list: Vector3[], axis: Vector3) => list.reduce((sum, p) => sum + p.dot(axis), 0) / Math.max(1, list.length);
  const tips = points.filter((p) => p.y > 0.9 * length);
  const palmPoints = points.filter((p) => p.y > 0.25 * length && p.y < 0.5 * length && p.clone().sub(centre).dot(thumbward) < 0.5 * most);
  if (mean(tips, palmward) < mean(palmPoints, palmward)) palmward.negate();
  const along = bone.clone().addScaledVector(palmward, TILT).addScaledVector(thumbward, -TILT).normalize();
  thumbward.addScaledVector(along, -thumbward.dot(along)).normalize();
  palmward.addScaledVector(along, -palmward.dot(along)).addScaledVector(thumbward, -palmward.dot(thumbward)).normalize();
  length = 0;
  for (const p of points) length = Math.max(length, p.dot(along));
  const k = length / LENGTH;
  // From the wrist (the bone's own origin), as the generator makes a hand.
  const at = (a: number, w: number, y: number) => new Vector3()
    .addScaledVector(palmward, a * k).addScaledVector(thumbward, w * k).addScaledVector(along, y * k);
  const digits: Digit[] = [];
  {
    const [root, mid, tip] = THUMB.at.map(([a, w, y]) => at(a, w, y)) as [Vector3, Vector3, Vector3];
    const ip = mid.clone().lerp(tip, 0.6);
    const end = tip.clone().addScaledVector(tip.clone().sub(mid).normalize(), 0.0084 * k);
    digits.push({ name: 'thumb', joints: [root, mid, ip, end], radius: THUMB.r * k });
  }
  FINGERS.forEach((finger, i) => {
    // The finger as made: its root, its middle and its tip, joined by straight lines and run on past the tip.
    const [root, mid, tip] = finger.at;
    const line = (y: number) => {
      const t = (y - ROOT) / finger.length;
      const [from, to, u] = t <= 0.55 ? [root, mid, Math.max(0, t) / 0.55] : [mid, tip, (t - 0.55) / 0.45];
      return at(from[0] + (to[0] - from[0]) * u, from[1] + (to[1] - from[1]) * u, y);
    };
    const end = ROOT + finger.length + 0.78 * finger.r;
    const span = end - KNUCKLE;
    const joints = [KNUCKLE, KNUCKLE + PHALANGES[0] * span, KNUCKLE + PHALANGES[1] * span, end].map(line) as Digit['joints'];
    digits.push({ name: DIGITS[i + 1]!, joints, radius: finger.r * k });
  });
  // How far the palm's surface stands out on its side, by how far along the hand (from the wrist): for a handle against it.
  const bands = new Float32Array(24).fill(-Infinity);
  for (const p of points) {
    if (p.dot(thumbward) > 0.022 * k) continue;
    const band = Math.floor(p.dot(along) / length * bands.length);
    if (band >= 0 && band < bands.length) bands[band] = Math.max(bands[band]!, p.dot(palmward));
  }
  const palm = (y: number) => {
    const band = Math.min(bands.length - 1, Math.max(0, Math.floor(y / length * bands.length)));
    return Number.isFinite(bands[band]!) ? bands[band]! : 0.014 * k;
  };
  return { digits, along, thumbward, palmward, size: k, palm };
}

/** The closest point of a digit's line to `p`: how far along it (negative before its root, more than its length past its end), and how far off. */
export function alongDigit(digit: Digit, p: Vector3): { s: number; off: number } {
  const j = digit.joints;
  let best = { s: 0, off: Infinity }, run = 0;
  const d = new Vector3(), q = new Vector3();
  for (let k = 0; k < 3; k++) {
    d.subVectors(j[k + 1]!, j[k]!);
    const length = d.length();
    let t = q.subVectors(p, j[k]!).dot(d) / (length * length);
    // The line runs on before the root and past the end.
    if (k > 0) t = Math.max(0, t);
    if (k < 2) t = Math.min(1, t);
    const off = q.copy(j[k]!).addScaledVector(d, t).distanceTo(p);
    if (off < best.off) best = { s: run + t * length, off };
    run += length;
  }
  return best;
}

/** A digit's knuckles: how far along its line each is. */
const knucklesOf = (digit: Digit) => {
  const j = digit.joints, first = j[1].distanceTo(j[0]);
  return [0, first, first + j[2].distanceTo(j[1])] as const;
};

/**
 * How a corner at `s` along a digit is weighed over its bones: [hand, half 1, bone 1, half 2, bone 2, half 3, bone 3],
 * each knuckle blending the bone before it through its half bone into the bone after it.
 */
export function chainWeights(digit: Digit, s: number, out: number[] = new Array(7).fill(0)): number[] {
  out.fill(0);
  const knuckles = knucklesOf(digit), blend = digit.name === 'thumb' ? BLEND.thumb : BLEND.fingers;
  for (let k = 0; k < 3; k++) {
    const reach = blend[k]! * digit.radius, at = knuckles[k]!;
    if (Math.abs(s - at) < reach) {
      const u = smooth(at - reach, at + reach, s);
      out[2 * k] = Math.max(0, 1 - 2 * u);
      out[2 * k + 1] = 1 - Math.abs(2 * u - 1);
      out[2 * k + 2] = Math.max(0, 2 * u - 1);
      return out;
    }
  }
  const bone = s < knuckles[0] ? 0 : s < knuckles[1] ? 2 : s < knuckles[2] ? 4 : 6;
  out[bone] = 1;
  return out;
}

/** How much of a corner each digit has (thumb first): the thumb's own, and the rest shared by the two fingers it lies between. */
export function digitShares(layout: Layout, p: Vector3, out: number[] = new Array(5).fill(0)): number[] {
  out.fill(0);
  const [thumb, ...fingers] = layout.digits as [Digit, ...Digit[]];
  const k = layout.size;
  const { off } = alongDigit(thumb, p);
  const w = p.dot(layout.thumbward), y = p.dot(layout.along);
  // Near the thumb's line, on its side of the palm.
  out[0] = (1 - smooth(1.25 * thumb.radius, 2.0 * thumb.radius, off)) * smooth(0.012 * k, 0.02 * k, w - layout.digits[1]!.joints[0].dot(layout.thumbward) + 0.024 * k);
  // Between the fingers' lines, at its own height: shared over the middle half of the way from one to the next.
  const lines = fingers.map((finger) => {
    const [root, , , end] = finger.joints;
    const t = Math.min(1, Math.max(0, (y - root.dot(layout.along)) / (end.dot(layout.along) - root.dot(layout.along))));
    return root.dot(layout.thumbward) + (end.dot(layout.thumbward) - root.dot(layout.thumbward)) * t;
  });
  const rest = 1 - out[0]!;
  // Fingers run from the thumb's side (index) to the other (little): their lines fall in w.
  if (w >= lines[0]!) out[1] = rest;
  else if (w <= lines[3]!) out[4] = rest;
  else {
    for (let i = 0; i < 3; i++) {
      const hi = lines[i]!, lo = lines[i + 1]!;
      if (w <= hi && w >= lo) {
        const gap = hi - lo, u = smooth(lo + 0.25 * gap, hi - 0.25 * gap, w);
        out[i + 1] = rest * u;
        out[i + 2] = rest * (1 - u);
        break;
      }
    }
  }
  return out;
}

const turnAbout = (axis: Vector3, angle: number, out: Quaternion) => out.setFromAxisAngle(axis, angle);

/** A hand's digits, posed: each joint as the shape puts it, in the hand bone's frame (forward kinematics). */
export function posedDigits(layout: Layout, axes: Axes, shape: Shape): Vector3[][] {
  return layout.digits.map((digit, d) => {
    const turns = digitTurns(axes, d, shape, [new Quaternion(), new Quaternion(), new Quaternion()]);
    const out = [digit.joints[0].clone()];
    const q = new Quaternion(), step = new Vector3();
    for (let k = 0; k < 3; k++) {
      q.multiply(turns[k]!);
      out.push(out[k]!.clone().add(step.subVectors(digit.joints[k + 1]!, digit.joints[k]!).applyQuaternion(q)));
    }
    return out;
  });
}

/**
 * The axes the digits turn about, in the hand's frame: the fingers' curl, the thumb's swing across and its own curl, and
 * each digit's three joints' own (the curl's or the thumb's, or a model's bones' own).
 */
export interface Axes { curl: Vector3; across: Vector3; thumb: Vector3; joints: Vector3[][] }

export function axesOf(layout: Layout): Axes {
  const { along, palmward, thumbward } = layout;
  // A turn about along × palmward brings a finger's +y towards the palm.
  const curl = new Vector3().crossVectors(along, palmward).normalize();
  // About thumbward × palmward, the thumb swings from its side to in front of the palm.
  const swing = new Vector3().crossVectors(thumbward, palmward).normalize();
  // The thumb curls in towards the palm and across it, towards the little finger.
  const [root, mid] = layout.digits[0]!.joints;
  const way = mid.clone().sub(root).normalize();
  const towards = palmward.clone().addScaledVector(thumbward, -0.7);
  towards.addScaledVector(way, -towards.dot(way)).normalize();
  const thumb = new Vector3().crossVectors(way, towards).normalize();
  const joints = layout.turns ?? layout.digits.map((_, d) => [0, 1, 2].map(() => (d === 0 ? thumb : curl).clone()));
  return { curl, across: swing, thumb, joints };
}

/** Each joint's turn of a digit, as its bone's own: the thumb's root swings across and curls, the rest curl. */
const swung = new Quaternion(), X = new Vector3(1, 0, 0);
function digitTurns(axes: Axes, d: number, shape: Shape, out: [Quaternion, Quaternion, Quaternion]): [Quaternion, Quaternion, Quaternion] {
  const q = swung, [a0, a1, a2] = axes.joints[d]!;
  if (d === 0) {
    const [root, mid, end] = shape.thumb.joints;
    turnAbout(axes.across, shape.thumb.across, out[0]).multiply(turnAbout(a0!, root, q));
    turnAbout(a1!, mid, out[1]);
    turnAbout(a2!, end, out[2]);
  } else {
    const [root, mid, end] = shape.fingers[d - 1]!;
    turnAbout(a0!, root, out[0]);
    turnAbout(a1!, mid, out[1]);
    turnAbout(a2!, end, out[2]);
  }
  return out;
}

const shape = (fingers: [number, number, number][], across: number, thumb: [number, number, number]): Shape =>
  ({ fingers, thumb: { across, joints: thumb } });
/** A hand at rest: a little curled, the little finger most, the thumb a little in. */
export const REST = shape([[0.14, 0.22, 0.12], [0.17, 0.26, 0.14], [0.2, 0.29, 0.16], [0.25, 0.33, 0.18]], 0.12, [0.06, 0.12, 0.1]);
/** At rest, fingers of their own: they were made a little curled already, so they curl a little further only. */
export const REST_OWN = shape([[0.05, 0.08, 0.04], [0.07, 0.1, 0.05], [0.09, 0.12, 0.06], [0.12, 0.15, 0.07]], 0.08, [0.04, 0.08, 0.06]);
/** Open, as in a wave: the fingers out, the thumb out to its side. */
export const OPEN = shape([[0.02, 0.05, 0.03], [0.02, 0.05, 0.03], [0.03, 0.06, 0.04], [0.05, 0.08, 0.05]], -0.05, [0, 0.04, 0.04]);
/** Flat on something: nearly straight, the fingertips just touching it. */
export const FLAT = shape([[0.04, 0.06, 0.03], [0.04, 0.06, 0.03], [0.05, 0.07, 0.04], [0.06, 0.08, 0.04]], 0.06, [0.02, 0.05, 0.04]);
/** Pointing: the first finger out, the others curled in under the thumb (fingers of their own only). */
export const POINT = shape([[0.02, 0.04, 0.02], [1.25, 1.55, 0.95], [1.3, 1.6, 0.95], [1.35, 1.6, 0.95]], 0.6, [0.25, 0.4, 0.3]);
/** A hook: the fingers bent at their middle knuckles, the thumb resting beside them. */
export const HOOK = shape([[0.3, 1.45, 0.8], [0.32, 1.5, 0.85], [0.35, 1.5, 0.85], [0.4, 1.5, 0.85]], 0.3, [0.12, 0.25, 0.2]);

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
/** A shape `t` of the way from `a` to `b`. */
export function mixShape(a: Shape, b: Shape, t: number, out: Shape = copyShape(a)): Shape {
  for (let f = 0; f < 4; f++) for (let j = 0; j < 3; j++) out.fingers[f]![j] = mix(a.fingers[f]![j]!, b.fingers[f]![j]!, t);
  out.thumb.across = mix(a.thumb.across, b.thumb.across, t);
  for (let j = 0; j < 3; j++) out.thumb.joints[j] = mix(a.thumb.joints[j]!, b.thumb.joints[j]!, t);
  return out;
}
export const copyShape = (s: Shape): Shape => ({ fingers: s.fingers.map((f) => [...f] as [number, number, number]), thumb: { across: s.thumb.across, joints: [...s.thumb.joints] } });

/** How far a point is from a line through `at` along the unit `axis`. */
function offLine(p: Vector3, at: Vector3, axis: Vector3): number {
  const d = p.clone().sub(at);
  return d.addScaledVector(axis, -d.dot(axis)).length();
}

/** A held thing's middle and its axis in the hand's frame. */
export interface Socket { at: Vector3; axis: Vector3 }

/** The thumb's swing across and how far it curls, closing together from rest: 0 at rest, 1 closed. */
const thumbClosed = (across: number, curl: number): Shape['thumb'] =>
  ({ across: mix(REST.thumb.across, 1.3, across), joints: [mix(REST.thumb.joints[0], 0.45, curl), mix(REST.thumb.joints[1], 0.7, curl), mix(REST.thumb.joints[2], 0.6, curl)] });

/**
 * Closes the thumb as far as `cost` likes best: a search over its swing across the palm and its curl, from rest. `cost` is
 * given the thumb's pad (along its last bone) and its posed line.
 */
function thumbTo(layout: Layout, axes: Axes, made: Shape, cost: (pad: Vector3, line: Vector3[]) => number): void {
  let best = { c: Infinity, across: 0, curl: 0 };
  const pad = new Vector3();
  const at = (across: number, curl: number) => {
    made.thumb = thumbClosed(across, curl);
    const line = posedDigits(layout, axes, made)[0]!;
    return cost(pad.copy(line[2]!).lerp(line[3]!, 0.45), line);
  };
  for (let i = 0; i <= 12; i++) for (let j = 0; j <= 12; j++) {
    const c = at(i / 12, j / 12);
    if (c < best.c) best = { c, across: i / 12, curl: j / 12 };
  }
  // Finer, about the best.
  for (let step = 1 / 24; step > 1 / 400; step /= 2) {
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const across = Math.min(1.2, Math.max(0, best.across + di * step)), curl = Math.min(1.2, Math.max(0, best.curl + dj * step));
      const c = at(across, curl);
      if (c < best.c) best = { c, across, curl };
    }
  }
  made.thumb = thumbClosed(best.across, best.curl);
}

/**
 * Closes the fingers round a handle of radius `r` (hand units), lying across the palm against it at the root knuckles:
 * each knuckle in turn, from the palm out, curls until the end of its bone comes against the handle (as a hand closes),
 * and the thumb comes round its far side over the first finger. Returns the shape and the handle's socket: its axis runs
 * across the palm, towards the thumb's side.
 */
export function powerGrip(layout: Layout, axes: Axes, r: number, through = false): { shape: Shape; socket: Socket } {
  const { digits, along, palmward, thumbward, size } = layout;
  const fingers = digits.slice(1);
  const root = fingers.reduce((sum, f) => sum.add(f.joints[0]), new Vector3()).divideScalar(fingers.length);
  const y = root.dot(along) - 0.25 * r;
  // Against the palm's surface just short of the root knuckles (sunk a little into its softness), clear of the knuckles.
  const lift = Math.max(layout.palm(y) + 0.85 * r, layout.palm(y - r) + 0.85 * r, root.dot(palmward) + 0.95 * fingers[1]!.radius + r);
  const at = root.clone().addScaledVector(along, y - root.dot(along)).addScaledVector(palmward, lift - root.dot(palmward));
  const axis = thumbward.clone();
  const made = copyShape(REST);
  const most = [1.5, 1.8, 1.4];
  // In each finger's own plane of curl (along the hand, and towards the palm), each bone becomes a chord of the circle
  // round the handle at the finger's own thickness: its end (the last bone's pad) comes onto that circle.
  const u = (p: Vector3) => p.dot(along), v = (p: Vector3) => p.dot(palmward);
  const cu = u(at), cv = v(at);
  fingers.forEach((finger, f) => {
    // Through a handle, the first two fingers go round it; the others are tucked in under them.
    if (through && f > 1) { made.fingers[f] = [1.35, 1.6, 1.0]; return; }
    const rho = r + 0.9 * finger.radius;
    const j = finger.joints;
    let pu = u(j[0]), pv = v(j[0]), heading = 0, restHeading = 0;
    for (let k = 0; k < 3; k++) {
      const du = u(j[k + 1]!) - u(j[k]!), dv = v(j[k + 1]!) - v(j[k]!);
      const full = Math.hypot(du, dv), l = full * (k === 2 ? 0.7 : 1), rest = Math.atan2(dv, du);
      // Where a bone of length l from (pu, pv) meets the circle: the meeting reached first as it curls in.
      const dx = cu - pu, dy = cv - pv, d = Math.hypot(dx, dy);
      let want = heading + (rest - restHeading) + REST.fingers[f]![k]!;
      if (d > 1e-9 && d <= rho + l && d >= Math.abs(rho - l)) {
        const a = (l * l - rho * rho + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l * l - a * a));
        const mx = pu + a * dx / d, my = pv + a * dy / d;
        let turn = Infinity;
        for (const s of [1, -1]) {
          const angle = Math.atan2(my + s * h * dx / d - pv, mx - s * h * dy / d - pu);
          const by = Math.atan2(Math.sin(angle - heading), Math.cos(angle - heading));
          if (by > -0.3 && by < turn) { turn = by; want = heading + by; }
        }
      }
      const angle = Math.min(most[k]!, Math.max(0.5 * REST.fingers[f]![k]!, want - heading - (rest - restHeading)));
      made.fingers[f]![k] = angle;
      heading += rest - restHeading + angle;
      restHeading = rest;
      pu += full * Math.cos(heading); pv += full * Math.sin(heading);
    }
  });
  // The thumb comes over the fist onto the handle's far side, beside the first finger: as near there as it reaches, its
  // last bone kept out of the handle where the fingers hold it (past the first finger the handle ends, or is a blade).
  // Fingers of their own close round far enough for the thumb to come over them: onto the first finger's middle bone.
  const thumb = digits[0]!, index = digits[1]!, touch = r + 0.9 * thumb.radius;
  const middle = at.dot(thumbward), end = index.joints[0].dot(thumbward) + index.radius;
  let target = at.clone().addScaledVector(palmward, touch).addScaledVector(thumbward, end - middle);
  if (layout.separate && !through) {
    const posed = posedDigits(layout, axes, made)[1]!;
    const bone = posed[1]!.clone().lerp(posed[2]!, 0.5), out = bone.clone().sub(at);
    out.addScaledVector(axis, -out.dot(axis)).normalize();
    target = bone.addScaledVector(out, index.radius + 0.85 * thumb.radius).addScaledVector(thumbward, 0.4 * index.radius);
  } else if (layout.separate) target.addScaledVector(palmward, 0.2 * thumb.radius);
  const point = new Vector3();
  thumbTo(layout, axes, made, (pad, line) => {
    let inside = 0;
    for (let t = 0; t <= 1; t += 0.25) {
      point.copy(line[2]!).lerp(line[3]!, t);
      if (point.dot(thumbward) > middle - 0.05 * size && point.dot(thumbward) < end) inside = Math.max(inside, touch - offLine(point, at, axis));
    }
    return pad.distanceTo(target) + 2 * inside;
  });
  return { shape: made, socket: { at, axis } };
}

/** The hook's socket: inside the bent fingers, against their middle bones; its axis across the hand. */
function hookSocket(layout: Layout, axes: Axes, r: number): Socket {
  const posed = posedDigits(layout, axes, HOOK);
  const at = new Vector3();
  for (let f = 1; f < 5; f++) {
    const [root, pip, dip] = posed[f]!;
    // In the crook: from the middle bone towards the root knuckle's side of it, where a bail hangs.
    const middle = pip!.clone().lerp(dip!, 0.4);
    const inward = root!.clone().sub(pip!);
    const bone = dip!.clone().sub(pip!).normalize();
    inward.addScaledVector(bone, -inward.dot(bone)).normalize();
    at.add(middle.addScaledVector(inward, r + layout.digits[f]!.radius * 0.9));
  }
  return { at: at.divideScalar(4), axis: layout.thumbward.clone() };
}

/**
 * A pinch: the first finger curled a little, the others more, and the thumb's pad brought against the first finger's,
 * the held thing between them. The socket's axis runs from the web between the thumb and the first finger out between
 * their pads, as a crayon or a brush is held.
 */
export function pinchGrip(layout: Layout, axes: Axes, r: number): { shape: Shape; socket: Socket } {
  if (layout.separate) return tipPinch(layout, axes, r);
  const made = shape([[0.85, 1.05, 0.55], [0.95, 1.2, 0.65], [1.05, 1.3, 0.75], [1.15, 1.35, 0.8]], REST.thumb.across, [...REST.thumb.joints]);
  const { digits, thumbward } = layout;
  const thumb = digits[0]!, index = digits[1]!;
  const posed = posedDigits(layout, axes, made);
  const [, pip, dip] = posed[1]!;
  // The first finger's middle bone, on its thumb's side: the thumb's pad comes against it with the thing between.
  const side = pip!.clone().lerp(dip!, 0.55).addScaledVector(thumbward, index.radius * 0.85);
  const touch = 2 * r + 0.85 * thumb.radius;
  thumbTo(layout, axes, made, (pad) => Math.abs(pad.distanceTo(side) - touch) + 0.5 * Math.max(0, side.dot(thumbward) + r - pad.dot(thumbward)));
  const after = posedDigits(layout, axes, made)[0]!;
  const pad = after[2]!.clone().lerp(after[3]!, 0.45);
  const at = side.clone().lerp(pad, r / Math.max(1e-9, touch));
  // Along the first finger's middle bone, from the palm out: as a crayon lies along it.
  const axis = dip!.clone().sub(pip!);
  const across = pad.clone().sub(side).normalize();
  axis.addScaledVector(across, -axis.dot(across)).normalize();
  return { shape: made, socket: { at, axis } };
}

/**
 * A pinch, tip to tip, for fingers of their own: the first finger a little curled and the thumb's pad brought to its pad,
 * the held thing between them; the other fingers curled in under. The socket's axis runs from the web between the thumb
 * and the first finger out between their pads, as a crayon is held.
 */
function tipPinch(layout: Layout, axes: Axes, r: number): { shape: Shape; socket: Socket } {
  const made = shape([[0.7, 1.0, 0.6], [0.95, 1.25, 0.75], [1.15, 1.4, 0.85], [1.25, 1.45, 0.85]], 0.6, [0.2, 0.3, 0.25]);
  const { digits, thumbward } = layout;
  const thumb = digits[0]!, index = digits[1]!;
  const posed = posedDigits(layout, axes, made)[1]!;
  const [root, pip, dip, end] = posed;
  const bone = end!.clone().sub(dip!).normalize();
  const palmSide = pip!.clone().sub(root!);
  palmSide.addScaledVector(bone, -palmSide.dot(bone)).negate().normalize();
  // The first finger's pad, and the way to the thumb's from it: towards the palm, and a little towards the thumb.
  const pad = dip!.clone().lerp(end!, 0.5).addScaledVector(palmSide, index.radius * 0.8);
  const towards = palmSide.clone().addScaledVector(thumbward, 0.5);
  towards.addScaledVector(bone, -towards.dot(bone)).normalize();
  const target = pad.clone().addScaledVector(towards, 2 * r + 0.85 * thumb.radius);
  thumbTo(layout, axes, made, (thumbPad) => thumbPad.distanceTo(target));
  const after = posedDigits(layout, axes, made);
  const thumbPad = after[0]![2]!.clone().lerp(after[0]![3]!, 0.45);
  const at = pad.clone().lerp(thumbPad, 0.5);
  const web = after[0]![1]!.clone().lerp(after[1]![0]!, 0.5);
  const axis = at.clone().sub(web);
  const across = thumbPad.clone().sub(pad).normalize();
  axis.addScaledVector(across, -axis.dot(across)).normalize();
  return { shape: made, socket: { at, axis } };
}

/** Pointing, the thumb over the curled fingers' middle bones; where the fingers are one block, the hand rests. */
function pointing(layout: Layout, axes: Axes): { shape: Shape; socket: Socket } {
  const made = copyShape(layout.separate ? POINT : REST);
  if (layout.separate) {
    const posed = posedDigits(layout, axes, made)[2]!;
    const target = posed[1]!.clone().lerp(posed[2]!, 0.4).addScaledVector(layout.palmward, layout.digits[2]!.radius + 0.8 * layout.digits[0]!.radius);
    thumbTo(layout, axes, made, (pad) => pad.distanceTo(target));
  }
  const tip = posedDigits(layout, axes, made)[1]!;
  return { shape: made, socket: { at: tip[3]!.clone(), axis: tip[3]!.clone().sub(tip[2]!).normalize() } };
}

/** A shape and a socket for each grip and size, made once. */
export interface Hand {
  readonly layout: Layout;
  readonly axes: Axes;
  /** Each digit's three bones, thumb first. */
  readonly bones: Bone[][];
  /** The shape and socket of a grip, for a held thing of radius `r` in the hand's own units. */
  grip(kind: GripKind, r?: number): { shape: Shape; socket: Socket };
  /** Puts the digits in a shape. */
  set(shape: Shape): void;
  /** The shape they are in now. */
  readonly shape: Shape;
  /** The shape they rest in. */
  readonly rest: Shape;
}

function makeHand(layout: Layout, bones: Bone[][], rests?: Quaternion[][]): Hand {
  const axes = axesOf(layout);
  const made = new Map<string, { shape: Shape; socket: Socket }>();
  const now = copyShape(REST);
  const turns: [Quaternion, Quaternion, Quaternion] = [new Quaternion(), new Quaternion(), new Quaternion()];
  const palmAt = (r: number): Socket => {
    const y = layout.digits[2]!.joints[0].dot(layout.along) * 0.55;
    const at = layout.along.clone().multiplyScalar(y).addScaledVector(layout.palmward, layout.palm(y) + r);
    return { at, axis: axes.curl.clone() };
  };
  return {
    layout, axes, bones,
    get shape() { return now; },
    rest: layout.separate ? REST_OWN : REST,
    grip(kind, r = 0) {
      // Sizes within a hundredth of the hand's unit share a shape.
      const key = `${kind}:${Math.round(r / layout.size * 2000)}`;
      let found = made.get(key);
      if (!found) {
        found = kind === 'power' || kind === 'loop' ? powerGrip(layout, axes, Math.max(r, 0.004 * layout.size), kind === 'loop' && !!layout.separate)
          : kind === 'pinch' ? pinchGrip(layout, axes, r)
          : kind === 'point' ? pointing(layout, axes)
          : kind === 'hook' ? { shape: HOOK, socket: hookSocket(layout, axes, r) }
          : { shape: kind === 'open' ? OPEN : kind === 'flat' ? FLAT : REST, socket: palmAt(r) };
        made.set(key, found);
      }
      return found;
    },
    set(shape) {
      if (shape !== now) mixShape(shape, shape, 0, now);
      if (rests) {
        // A model's own bones: each curls about its own x from its rest; the thumb's root swings across the palm first.
        bones.forEach((chain, d) => chain.forEach((bone, k) => {
          const angle = d === 0 ? now.thumb.joints[k]! : now.fingers[d - 1]![k]!;
          bone.quaternion.copy(rests[d]![k]!).multiply(turnAbout(X, angle, swung));
          if (d === 0 && k === 0) bone.quaternion.premultiply(turnAbout(axes.across, now.thumb.across, swung));
        }));
        return;
      }
      bones.forEach((chain, d) => {
        digitTurns(axes, d, now, turns);
        chain.forEach((bone, k) => bone.quaternion.copy(turns[k]!));
      });
    },
  };
}

/** The model's own finger bones, as family/finger_hands.py names them. */
const OWN = ['thumb', 'index', 'middle', 'ring', 'pinky'] as const;

/**
 * A hand whose model has its own finger bones, measured as they rest: each digit's knuckles and its tip's end, its joints'
 * axes (each bone's own x), its thickness from its own corners; the hand's directions from the fingers' roots and their
 * curl. Null if any of the fifteen is missing.
 */
function ownFingers(model: Object3D, tag: 'l' | 'r', hand: Object3D, meshes: SkinnedMesh[]): Hand | null {
  const bones = OWN.map((digit) => [1, 2, 3].map((j) => model.getObjectByName(`${digit}_0${j}_${tag}`) as Bone | undefined));
  if (bones.some((chain) => chain.some((bone) => !bone || bone.parent !== (chain.indexOf(bone) === 0 ? hand : chain[chain.indexOf(bone) - 1])))) return null;
  const chains = bones as Bone[][];
  const rests = chains.map((chain) => chain.map((bone) => bone.quaternion.clone()));
  // Each bone's corners in its own frame at rest, from the mesh that has most of them.
  const cornersOf = (bone: Bone): Vector3[] => {
    let best: Vector3[] = [];
    for (const mesh of meshes) {
      const index = mesh.skeleton.bones.indexOf(bone);
      if (index < 0) continue;
      const m = new Matrix4().multiplyMatrices(mesh.skeleton.boneInverses[index]!, mesh.bindMatrix);
      const position = mesh.geometry.getAttribute('position'), out: Vector3[] = [];
      for (let i = 0; i < position.count; i++) {
        let own = 0;
        for (const [b, w] of weightsOf(mesh, i)) if (b === index) own += w;
        if (own > 0.5) out.push(new Vector3().fromBufferAttribute(position, i).applyMatrix4(m));
      }
      if (out.length > best.length) best = out;
    }
    return best;
  };
  const turns: Vector3[][] = [];
  const digits: Digit[] = chains.map((chain, d) => {
    const joints: Vector3[] = [chain[0]!.position.clone()];
    const turn = chain[0]!.quaternion.clone();
    const axes: Vector3[] = [];
    let radius = 0, count = 0, tip = 0;
    chain.forEach((bone, k) => {
      if (k > 0) {
        joints.push(joints[k - 1]!.clone().add(bone.position.clone().applyQuaternion(turn)));
        turn.multiply(bone.quaternion);
      }
      axes.push(X.clone().applyQuaternion(turn));
      for (const p of cornersOf(bone)) {
        radius += Math.hypot(p.x, p.z); count++;
        if (k === 2) tip = Math.max(tip, p.y);
      }
    });
    joints.push(joints[2]!.clone().add(new Vector3(0, tip || chain[2]!.position.length(), 0).applyQuaternion(turn)));
    turns.push(axes);
    return { name: DIGITS[d]!, joints: joints as Digit['joints'], radius: count ? radius / count : 0.01 };
  });
  // The hand's directions: along it to the fingers' roots, across from the little finger to the first, and towards the
  // palm, which the fingers curl to.
  const roots = digits.slice(1).reduce((sum, digit) => sum.add(digit.joints[0]), new Vector3()).multiplyScalar(0.25);
  const along = roots.clone().normalize();
  const thumbward = digits[1]!.joints[0].clone().sub(digits[4]!.joints[0]);
  thumbward.addScaledVector(along, -thumbward.dot(along)).normalize();
  const palmward = new Vector3().crossVectors(turns[2]![0]!, along).normalize();
  let length = 0;
  for (const digit of digits) length = Math.max(length, digit.joints[3].dot(along));
  const size = length / LENGTH;
  const palmCorners = cornersOf(hand as Bone);
  const bands = new Float32Array(24).fill(-Infinity);
  for (const p of palmCorners) {
    if (p.dot(thumbward) > 0.022 * size) continue;
    const band = Math.floor(p.dot(along) / length * bands.length);
    if (band >= 0 && band < bands.length) bands[band] = Math.max(bands[band]!, p.dot(palmward));
  }
  const palm = (y: number) => {
    const band = Math.min(bands.length - 1, Math.max(0, Math.floor(y / length * bands.length)));
    return Number.isFinite(bands[band]!) ? bands[band]! : 0.014 * size;
  };
  return makeHand({ digits, along, thumbward, palmward, size, palm, turns, separate: true }, chains, rests);
}

/** A bone under `parent` at `at` in its frame, not turned, its inverse bind from the parent's. */
function childBone(name: string, parent: Object3D, at: Vector3): Bone {
  const bone = new Bone();
  bone.name = name;
  bone.position.copy(at);
  parent.add(bone);
  return bone;
}

/**
 * Gives each hand of a model fingers, as above: its skinned meshes' hand corners are weighed to them. Returns each hand
 * (the body's left first), or null where a hand has no bone or doesn't look like the family's. A model is done once.
 */
export function fingersOf(model: Object3D): [Hand | null, Hand | null] {
  const done = model.userData.fingers as [Hand | null, Hand | null] | undefined;
  if (done) return done;
  const meshes: SkinnedMesh[] = [];
  model.traverse((node) => { if ((node as SkinnedMesh).isSkinnedMesh && (node as SkinnedMesh).skeleton) meshes.push(node as SkinnedMesh); });
  const hands = (['l', 'r'] as const).map((tag) => {
    const handBone = model.getObjectByName(`hand_${tag}`);
    if (!handBone) return null;
    // A hand made with fingers of its own is used as it is.
    const own = ownFingers(model, tag, handBone, meshes);
    if (own) { own.set(own.rest); return own; }
    // Each mesh's corners that only the hand moves, in the hand bone's frame at rest.
    const found = meshes.map((mesh) => {
      const index = mesh.skeleton.bones.indexOf(handBone as Bone);
      const corners: number[] = [], points: Vector3[] = [];
      if (index < 0 || mesh.geometry.userData[`fingers_${tag}`] !== undefined) return { mesh, index, corners, points };
      const toHand = new Matrix4().multiplyMatrices(mesh.skeleton.boneInverses[index]!, mesh.bindMatrix);
      const position = mesh.geometry.getAttribute('position');
      for (let i = 0; i < position.count; i++) {
        const weights = weightsOf(mesh, i);
        let own = 0;
        for (const [bone, w] of weights) if (bone === index) own += w;
        if (own < 0.999) continue;
        corners.push(i);
        points.push(new Vector3().fromBufferAttribute(position, i).applyMatrix4(toHand));
      }
      return { mesh, index, corners, points };
    });
    const most = found.reduce((best, one) => (one.points.length > best.points.length ? one : best), found[0]!);
    if (!most || most.points.length === 0) return null;
    const layout = measureHand(most.points);
    if (!layout) return null;
    // Three bones in each digit, at its joints, and a half bone at each joint.
    const bones = layout.digits.map((digit) => {
      const chain: Bone[] = [];
      let parent: Object3D = handBone, from = new Vector3();
      for (let k = 0; k < 3; k++) {
        const bone = childBone(`hand_${tag}_${digit.name}${k + 1}`, parent, digit.joints[k]!.clone().sub(from));
        chain.push(bone);
        parent = bone; from = digit.joints[k]!;
      }
      return chain;
    });
    const halves = bones.map((chain) => chain.map((bone) => halfOf(bone)));
    const hand = makeHand(layout, bones);
    // Weighed over the digits' bones, in each mesh that has the hand.
    for (const { mesh, index, corners, points } of found) {
      if (corners.length === 0) continue;
      const handInverse = mesh.skeleton.boneInverses[index]!;
      const added: Bone[] = [], inverses: Matrix4[] = [];
      const slot = new Map<Bone, number>();
      const add = (bone: Bone, at: Vector3) => {
        slot.set(bone, mesh.skeleton.bones.length + added.length);
        added.push(bone);
        inverses.push(new Matrix4().makeTranslation(-at.x, -at.y, -at.z).multiply(handInverse));
      };
      layout.digits.forEach((digit, d) => {
        for (let k = 0; k < 3; k++) { add(bones[d]![k]!, digit.joints[k]!); add(halves[d]![k]!, digit.joints[k]!); }
      });
      mesh.bind(new Skeleton([...mesh.skeleton.bones, ...added], [...mesh.skeleton.boneInverses, ...inverses]), mesh.bindMatrix);
      const shares = new Array(5).fill(0), chain = new Array(7).fill(0);
      corners.forEach((i, n) => {
        const p = points[n]!;
        digitShares(layout, p, shares);
        const put = new Map<number, number>();
        const give = (bone: number, w: number) => { if (w > 1e-5) put.set(bone, (put.get(bone) ?? 0) + w); };
        layout.digits.forEach((digit, d) => {
          const share = shares[d]!;
          if (share <= 1e-5) return;
          chainWeights(digit, alongDigit(digit, p).s, chain);
          give(index, share * chain[0]!);
          for (let k = 0; k < 3; k++) {
            give(slot.get(halves[d]![k]!)!, share * chain[2 * k + 1]!);
            give(slot.get(bones[d]![k]!)!, share * chain[2 * k + 2]!);
          }
        });
        writeWeights(mesh, i, [...put.entries()]);
      });
      mesh.geometry.getAttribute('skinIndex').needsUpdate = true;
      mesh.geometry.getAttribute('skinWeight').needsUpdate = true;
      mesh.geometry.userData[`fingers_${tag}`] = corners.length;
    }
    hand.set(REST);
    return hand;
  }) as [Hand | null, Hand | null];
  model.userData.fingers = hands;
  return hands;
}
