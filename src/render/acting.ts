import type { Act } from '../sim/scene';
import { groundedHips, STANDING, type Pose, type Role } from './rig';
import { carvingAt } from './carving-motion';

/**
 * Acting: what each of a scene's acts does to a body, as a pose that moves with time (docs/narrative-audit.md).
 * Pure: no three, no clock of its own. The same pose drives the rehearsal figures and the models from Blender
 * (src/render/rig.ts), so a scene reads the same wherever it is played; the models' own clips replace these
 * when they are made in Blender on Olov's computer.
 */
export interface ActContext {
  /** Seconds since the act began. */
  t: number;
  /** The aim, from the body's feet in its own side view, in an adult's units: how far ahead, and how high. */
  aim: { ahead: number; up: number; side?: number } | null;
  /** How far the body has walked, in its own strides: the legs go by it. */
  stride: number;
  /** How fast it walks now, from 0 to 1. */
  pace: number;
  /** Still: reduced motion. Each act holds its readable pose, without loops, bounces or shakes. */
  calm: boolean;
  /** Family timing and weight; story contacts retain their authored arrival times. */
  role?: Role;
}

/** The body's stance under an act that only uses its arms and head. */
export type Stance = 'stand' | 'sit' | 'kneel' | 'crouch';

const UPPER = 0.84;
const FORE = 0.92;
/** How high the shoulders are over the hips. */
const SHOULDER = 1.55;
const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
/** 0 → 1 over the first `inFor` seconds. */
const rise = (t: number, inFor: number) => smooth(t / inFor);
const timing = (role?: Role) => role === 'pappa' ? .9 : role === 'mamma' ? .86 : role === 'moa' ? 1.04 : role === 'bertil' ? 1.22 : 1;
const weight = (role?: Role) => role === 'pappa' ? .92 : role === 'mamma' ? .82 : role === 'bertil' ? 1.12 : 1;
const pulse = (t: number, at: number, up: number, hold: number, down: number) => rise(t - at, up) * (1 - rise(t - at - up - hold, down));

// Paper-space offsets: three deliberate marks, lifting between them, then looking over the drawing.
const DRAWING = [[0, -.12, -.04, .08], [.25, -.12, -.04, 0], [.85, .1, .04, 0], [1.1, .1, .04, .06],
  [1.4, -.08, .07, .06], [1.55, -.08, .07, 0], [2.05, .12, -.06, 0], [2.3, .12, -.06, .07],
  [2.7, -.02, -.02, .07], [2.85, -.02, -.02, 0], [3.15, .08, .06, 0], [3.5, .08, .06, .14],
  [4.2, .08, .06, .14], [4.8, -.12, -.04, .08]] as const;

/** Shared with the pen contact: seconds since drawing began, independent of frames and previous calls. */
export function drawingAt(seconds: number, calm = false, role?: Role) {
  const t = calm ? .25 : Math.max(0, seconds) * timing(role) % 4.8;
  let index = 1;
  while (index < DRAWING.length - 1 && t > DRAWING[index]![0]) index++;
  const a = DRAWING[index - 1]!, b = DRAWING[index]!, k = smooth((t - a[0]) / (b[0] - a[0]));
  const lift = a[3] + (b[3] - a[3]) * k;
  return { across: a[1] + (b[1] - a[1]) * k, ahead: a[2] + (b[2] - a[2]) * k, lift,
    contact: lift < 1e-6, inspect: calm ? 0 : pulse(t, 3.25, .3, .45, .65) };
}

/** Mug lift, a held sip, then a slower return; stage uses the same clock to meet the lips. */
export function sippingAt(seconds: number, calm = false, role?: Role) {
  const t = calm ? 0 : Math.max(0, seconds) * timing(role) % 6.8;
  return { raise: pulse(t, .9, .8, .95, 1.05), tilt: pulse(t, 1.75, .35, .35, .35) };
}

/**
 * Two joints that put a hand at a point (ahead, up) from the shoulder, in the body's side view. The elbow bends
 * forward only: an arm that cannot reach points straight at it.
 */
export function reachFor(ahead: number, up: number): { arm: number; elbow: number } {
  const far = Math.min(UPPER + FORE - 1e-3, Math.max(Math.abs(UPPER - FORE) + 1e-3, Math.hypot(ahead, up)));
  const elbow = Math.acos(Math.max(-1, Math.min(1, (far * far - UPPER * UPPER - FORE * FORE) / (2 * UPPER * FORE))));
  const towards = Math.atan2(ahead, -up);
  const bent = Math.atan2(FORE * Math.sin(elbow), UPPER + FORE * Math.cos(elbow));
  return { arm: towards - bent, elbow };
}

/** The hips' height in a pose: its seat, or where its lowest foot or knee puts them. */
const hipsOf = (p: Pose) => p.seat ?? groundedHips(p);

/**
 * Puts a hand at a point given from the feet (ahead, up), for the pose's own hips and lean: the right hand, or
 * the left with `side` 0.
 */
function handTo(p: Pose, ahead: number, up: number, side: 0 | 1 = 1, k = 1): void {
  const hips = hipsOf(p);
  const shoulderAhead = Math.sin(p.lean) * SHOULDER;
  const shoulderUp = hips + Math.cos(p.lean) * SHOULDER;
  const r = reachFor(ahead - shoulderAhead, up - shoulderUp);
  // The arm hangs from the leaning spine, whose own "down" points back as it leans forward: its swing is counted
  // from there, so the lean is added to it.
  const arm = r.arm + p.lean;
  if (side === 1) {
    p.armR += (arm - p.armR) * k;
    p.elbowR += (r.elbow - p.elbowR) * k;
  } else {
    p.armL += (arm - p.armL) * k;
    p.elbowL += (r.elbow - p.elbowL) * k;
  }
}

/** The wrist before an action changes the torso: its path starts from the stance's actual hand. */
function handFrom(p: Pose, side: 0 | 1): { ahead: number; up: number } {
  const arm = (side === 0 ? p.armL : p.armR) - p.lean;
  const elbow = arm + (side === 0 ? p.elbowL : p.elbowR);
  return {
    ahead: Math.sin(p.lean) * SHOULDER + Math.sin(arm) * UPPER + Math.sin(elbow) * FORE,
    up: hipsOf(p) + Math.cos(p.lean) * SHOULDER - Math.cos(arm) * UPPER - Math.cos(elbow) * FORE,
  };
}

/** Solve the arm along a hand-space path, so the elbow follows the hand instead of flinging a held prop. */
function handAlong(p: Pose, from: { ahead: number; up: number }, ahead: number, up: number, travel: number, lift: number, arc: number, side: 0 | 1): void {
  handTo(p, from.ahead + (ahead - from.ahead) * travel, from.up + (up - from.up) * lift + Math.sin(Math.PI * lift) * arc, side);
}

/** Where a standing adult's chest is, from the feet: the hands come here to hold something before them. */
const CHEST = 3.55;

/** The body sitting on a chair. */
function sitting(p: Pose): Pose {
  p.legL = p.legR = 1.5;
  p.kneeL = p.kneeR = 1.45;
  p.seat = 1.5;
  p.lean = 0.12;
  handTo(p, 1.0, 2.15, 0);
  handTo(p, 1.0, 2.15, 1);
  return p;
}

/** One knee on the ground, the other foot planted: the giant comes down to Elof's height. */
function kneeling(p: Pose): Pose {
  p.legR = 1.32;
  p.kneeR = 1.32;
  p.legL = -0.08;
  p.kneeL = 1.62;
  p.lean = 0.2;
  p.armR = 0.45;
  p.elbowR = 0.6;
  p.armL = 0.2;
  p.elbowL = 0.35;
  return p;
}

/** Down on both heels, hands on the knees. */
function crouching(p: Pose): Pose {
  p.legL = p.legR = 1.7;
  p.kneeL = p.kneeR = 2.25;
  p.lean = 0.45;
  p.armL = p.armR = 0.9;
  p.elbowL = p.elbowR = 0.35;
  p.nod = 0.15;
  return p;
}

/** A walk: the legs swing with the distance covered, the arms against them. */
function walking(p: Pose, c: ActContext): Pose {
  const swing = Math.sin(c.stride * Math.PI) * 0.5 * c.pace;
  p.legL = swing;
  p.legR = -swing;
  p.kneeL = Math.max(0, Math.cos(c.stride * Math.PI)) * 0.7 * c.pace;
  p.kneeR = Math.max(0, -Math.cos(c.stride * Math.PI)) * 0.7 * c.pace;
  p.armL = -swing * 0.7;
  p.armR = swing * 0.7;
  p.elbowL = p.elbowR = 0.25;
  p.lean = 0.06 * c.pace;
  p.bounce = c.calm ? 0 : Math.abs(Math.cos(c.stride * Math.PI)) * 0.06 * c.pace;
  return p;
}

/** The head turned up or down at what is aimed at. */
function look(p: Pose, c: ActContext, k = 1): void {
  if (!c.aim) return;
  const eyes = hipsOf(p) + SHOULDER + 0.55;
  const nod = -Math.atan2(c.aim.up - eyes, Math.max(.6, Math.hypot(c.aim.ahead, c.aim.side ?? 0))) - p.lean * .6;
  p.nod += (Math.max(-0.55, Math.min(0.8, nod)) - p.nod) * k;
  const turn = Math.atan2(c.aim.side ?? 0, Math.max(.2, c.aim.ahead));
  p.turn += (Math.max(-.7, Math.min(.7, turn)) - p.turn) * k;
}

/**
 * The pose an act asks for at its moment. `stance` is what the body does under an act that only uses its arms
 * or its head: sitting, kneeling, crouching or standing, which the stage keeps from the acts before.
 */
export function actPose(act: Act, c: ActContext, out: Pose, stance: Stance = 'stand'): Pose {
  Object.assign(out, STANDING);
  const loop = c.calm ? 0 : 1;
  // A reduced-motion act holds its completed, readable pose; authored keys still decide when acts change.
  const t = c.calm ? 3 : Math.max(0, c.t);
  const r = t * timing(c.role), energy = weight(c.role);
  const under = () => (stance === 'sit' ? sitting(out) : stance === 'kneel' ? kneeling(out) : stance === 'crouch' ? crouching(out) : out);
  switch (act) {
    case 'stand':
    case 'watch':
    case 'look': {
      under();
      if (stance === 'stand') {
        // Someone standing breathes and shifts a little.
        out.lean = 0.015 * Math.sin(r * 1.3) * loop * energy;
        out.armL = 0.04 + 0.025 * Math.sin(r * 1.1) * loop * energy;
        out.armR = 0.04 + 0.025 * Math.sin(r * 1.1 + 1) * loop * energy;
      }
      look(out, c);
      return out;
    }
    case 'walk':
      return walking(out, c);
    case 'sit':
      sitting(out);
      look(out, c);
      return out;
    case 'carve': {
      sitting(out);
      const carving = carvingAt(c.t, c.calm);
      out.nod = carving.nod;
      out.lean = carving.lean;
      handTo(out, carving.left.ahead, carving.left.up, 0);
      handTo(out, carving.right.ahead, carving.right.up, 1);
      return out;
    }
    case 'draw': {
      sitting(out);
      const pen = drawingAt(c.t, c.calm, c.role);
      out.nod = .55 - .18 * pen.inspect;
      out.lean = .3 - .055 * pen.inspect;
      handTo(out, 1.35, 1.75, 0);
      handTo(out, 1.55 + pen.ahead, 1.78 + pen.lift, 1);
      return out;
    }
    case 'sip': {
      under();
      const sip = sippingAt(c.t, c.calm, c.role), up = sip.raise;
      const hips = hipsOf(out);
      handTo(out, .55 - .08 * up, hips + 1.2 + .75 * up, 0);
      out.nod = -.08 * sip.tilt;
      look(out, c, 1 - up);
      return out;
    }
    case 'sneak': {
      under();
      out.lean = 0.3 * rise(t, 0.8);
      const creep = rise(t, 1.6);
      const target = c.aim ?? { ahead: 1.8, up: 2.2 };
      handTo(out, 0.6 + (target.ahead - 0.6) * creep, 2.6 + (target.up - 2.6) * creep, 1);
      out.armL = 0.3;
      out.elbowL = 0.9;
      look(out, c);
      return out;
    }
    case 'kneel':
      kneeling(out);
      out.nod = 0.35 * rise(t, 0.6);
      look(out, c, rise(t, 0.6));
      return out;
    case 'crouch':
      crouching(out);
      look(out, c);
      return out;
    case 'gasp': {
      under();
      // Both hands to the mouth.
      const k = c.calm ? 1 : rise(r, .22) * (1 - .42 * rise(r - .7, .75));
      const hips = hipsOf(out);
      out.lean -= 0.1 * k;
      handTo(out, 0.42, hips + SHOULDER + 0.45, 0, k);
      handTo(out, 0.42, hips + SHOULDER + 0.4, 1, k);
      out.bounce = loop * .08 * energy * Math.sin(Math.min(1, r / .3) * Math.PI) ** 2;
      look(out, c);
      return out;
    }
    case 'point': {
      under();
      const target = c.aim ?? { ahead: 6, up: CHEST };
      const hips = hipsOf(out);
      const k = rise(t, 0.3);
      out.lean += 0.06 * k;
      // Straight at it: the hand goes as far as the arm reaches along the line to it.
      const shoulderAhead = Math.sin(out.lean) * SHOULDER, shoulderUp = hips + Math.cos(out.lean) * SHOULDER;
      const dx = target.ahead - shoulderAhead, dy = target.up - shoulderUp;
      const far = Math.hypot(dx, dy) || 1;
      handTo(out, shoulderAhead + dx / far * 1.7, shoulderUp + dy / far * 1.7, 1, k);
      look(out, c, rise(t, .16));
      return out;
    }
    case 'wave': {
      under();
      const k = rise(r, .34), settle = c.calm ? 0 : rise(r - 1.45, .8);
      out.armR += (2.45 * energy - out.armR) * k;
      out.armR += (.48 - out.armR) * settle;
      out.elbowR = .6 + .45 * settle + .26 * Math.sin(r * 9) * loop * k * (1 - rise(r - 1.2, .7));
      look(out, c);
      return out;
    }
    case 'cheer': {
      under();
      const k = rise(r, .24), settle = c.calm ? 0 : rise(r - 1.05, .9);
      out.armR = (2.85 - 1.85 * settle) * k;
      out.armL = (2.75 - 1.9 * settle) * rise(r - .08, .3);
      out.elbowL = .25 + .55 * settle; out.elbowR = .25 + .4 * settle;
      out.bounce = loop * Math.sin(r * 7.5) ** 2 * .2 * energy * rise(r, .16) * smooth((1.6 - r) / .35);
      return out;
    }
    case 'offer':
    case 'reach':
    case 'lift': {
      under();
      const target = c.aim ?? { ahead: 1.6, up: CHEST };
      const fromR = handFrom(out, 1), fromL = handFrom(out, 0);
      const k = rise(t, act === 'lift' ? 1.1 : 0.5);
      const hips = hipsOf(out);
      const low = Math.max(0, hips + 0.4 - target.up);
      // A low standing reach shares the work with the knees; seated and kneeling contacts retain their stance.
      if (act === 'reach' && stance === 'stand') {
        const bend = Math.min(1, low / 2) * rise(t, 0.3);
        out.legL = out.legR = 0.5 * bend;
        out.kneeL = out.kneeR = 0.85 * bend;
      }
      out.lean += (act === 'reach' ? Math.min(0.8, 0.2 + low * 0.35) : act === 'lift' ? stance === 'kneel' ? 0 : 0.15 : 0.1) * k;
      if (act === 'reach' && target.ahead > 0) {
        // Bring the shoulder close enough to the object, rather than holding a fully stretched hand short of it.
        const up = target.up - hipsOf(out), far = Math.hypot(target.ahead, up);
        const reach = UPPER + FORE - 0.08;
        const angle = Math.acos(Math.max(-1, Math.min(1, (far * far + SHOULDER * SHOULDER - reach * reach) / (2 * far * SHOULDER))));
        out.lean = Math.max(out.lean, Math.min(stance === 'kneel' ? 1.45 : 0.8, Math.atan2(target.ahead, up) - angle) * k);
      }
      // Lift close to the body before extending; offering clears the lap, reaching takes a smaller curved path.
      const lifted = act === 'lift' ? rise(t, 0.85) : k;
      handAlong(out, fromR, target.ahead, target.up, k, lifted, act === 'offer' ? 0.3 : 0.14, 1);
      if (act !== 'offer') {
        const support = rise(t - 0.08, act === 'lift' ? 1.02 : 0.42);
        handAlong(out, fromL, target.ahead - 0.15, target.up - 0.1, support, support, 0.1, 0);
      }
      out.nod = (act === 'offer' ? 0.18 : Math.min(0.7, 0.25 + low * 0.2)) * k;
      look(out, c, rise(t, .18));
      return out;
    }
    case 'show': {
      under();
      // Something held up in both hands, at the height of the face, for others to see.
      const k = rise(t, .65);
      const hips = hipsOf(out);
      const fromR = handFrom(out, 1), fromL = handFrom(out, 0);
      handAlong(out, fromL, 1.05, hips + SHOULDER + .22, k, rise(t, .5), .2, 0);
      handAlong(out, fromR, 1.05, hips + SHOULDER + .22, k, rise(t, .5), .2, 1);
      out.nod = -0.08 * k;
      return out;
    }
    case 'blow': {
      under();
      out.nod = 0.25;
      out.lean += 0.2;
      const hips = hipsOf(out);
      handTo(out, 0.75, hips + SHOULDER + 0.35, 0);
      handTo(out, 0.8, hips + SHOULDER + 0.3, 1);
      // A breath in, and out over the piece.
      out.lean += loop * 0.1 * Math.sin(Math.min(1, t / 0.8) * Math.PI);
      return out;
    }
    case 'shrug': {
      under();
      const k = c.calm ? 1 : rise(t, 0.2) * (1 - rise(t - 0.55, 0.35));
      out.armL = out.armR = 0.25;
      out.elbowL = out.elbowR = 0.3 + 1.2 * k;
      out.spread = 0.35 * k;
      out.bounce = 0;
      out.nod = -0.1 * k;
      return out;
    }
    case 'hug': {
      under();
      const k = rise(r, .55), squeeze = loop * pulse(r, .6, .3, .2, .65);
      out.armR = .4 + .95 * k;
      out.armL = .4 + 1.02 * rise(r - .07, .6);
      out.elbowL = .3 + 1.3 * k + .12 * squeeze;
      out.elbowR = .3 + 1.4 * k + .1 * squeeze;
      out.lean += .1 * k + .025 * squeeze;
      out.nod = .12 * k;
      return out;
    }
    case 'nod': {
      under();
      look(out, c);
      out.nod += c.calm ? .18 : energy * (.22 * pulse(r, .05, .18, .04, .28) + .09 * pulse(r, .57, .15, 0, .24));
      return out;
    }
    case 'startle': {
      under();
      const k = rise(r, .14), settle = c.calm ? .5 : rise(r - .3, .8);
      out.armR = (1.85 - 1.35 * settle) * k * energy;
      out.armL = (1.65 - 1.3 * settle) * rise(r - .04, .18) * energy;
      out.elbowR = (1.2 - .55 * settle) * k;
      out.elbowL = (1.1 - .55 * settle) * k;
      out.lean -= .16 * k * (1 - settle);
      out.bounce = loop * .17 * energy * Math.sin(Math.min(1, r / .35) * Math.PI) ** 2;
      look(out, c);
      return out;
    }
    case 'stomp': {
      under();
      // A foot comes up and down, hard: cross, and sure of himself.
      const lift = loop * pulse(r, .06, .18, .03, .12);
      const impact = loop * pulse(r, .39, .05, 0, .22);
      out.legR = 0.9 * lift;
      out.kneeR = 1.1 * lift + .15 * impact; out.kneeL = .12 * impact;
      out.armL = out.armR = -0.25;
      out.elbowL = out.elbowR = 0.5;
      out.lean = .16 + .045 * impact;
      out.nod = -0.1;
      return out;
    }
    case 'hands': {
      under();
      const k = rise(t, 0.4);
      out.lean = 0.12 * k;
      const hips = hipsOf(out);
      handTo(out, 0.7, hips + SHOULDER - 0.3, 0, k);
      handTo(out, 0.75, hips + SHOULDER - 0.25, 1, k);
      out.nod = 0.65 * k;
      return out;
    }
    case 'paint': {
      under();
      const target = c.aim ?? { ahead: 1.2, up: 1.8 };
      const dab = loop * .08 * pulse(r % 2.6, .2, .3, .5, .55);
      out.lean = 0.2;
      handTo(out, target.ahead + dab, target.up, 1);
      look(out, c);
      return out;
    }
    default:
      // The ghost's acts are its own (src/render/stage.ts): a person asked for one just stands there.
      look(under(), c);
      return out;
  }
}

/** The stance an act leaves for the acts after it that only use arms and head. */
export function stanceOf(act: Act, before: Stance): Stance {
  if (act === 'sit' || act === 'carve' || act === 'draw') return 'sit';
  if (act === 'kneel') return 'kneel';
  if (act === 'crouch') return 'crouch';
  if (act === 'walk' || act === 'stand' || act === 'stomp' || act === 'sneak' || act === 'cheer') return 'stand';
  return before;
}
