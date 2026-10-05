import type { Act } from '../sim/scene';
import { groundedHips, STANDING, type Pose } from './rig';

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
  aim: { ahead: number; up: number } | null;
  /** How far the body has walked, in its own strides: the legs go by it. */
  stride: number;
  /** How fast it walks now, from 0 to 1. */
  pace: number;
  /** Still: reduced motion. Each act holds its readable pose, without loops, bounces or shakes. */
  calm: boolean;
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
  p.bounce = Math.abs(Math.cos(c.stride * Math.PI)) * 0.06 * c.pace;
  return p;
}

/** The head turned up or down at what is aimed at. */
function look(p: Pose, c: ActContext, k = 1): void {
  if (!c.aim) return;
  const eyes = hipsOf(p) + SHOULDER + 0.55;
  const nod = -Math.atan2(c.aim.up - eyes, Math.max(0.6, Math.abs(c.aim.ahead))) - p.lean * 0.6;
  p.nod += (Math.max(-0.55, Math.min(0.8, nod)) - p.nod) * k;
}

/**
 * The pose an act asks for at its moment. `stance` is what the body does under an act that only uses its arms
 * or its head: sitting, kneeling, crouching or standing, which the stage keeps from the acts before.
 */
export function actPose(act: Act, c: ActContext, out: Pose, stance: Stance = 'stand'): Pose {
  Object.assign(out, STANDING);
  const loop = c.calm ? 0 : 1;
  const t = c.t;
  const under = () => (stance === 'sit' ? sitting(out) : stance === 'kneel' ? kneeling(out) : stance === 'crouch' ? crouching(out) : out);
  switch (act) {
    case 'stand':
    case 'watch':
    case 'look': {
      under();
      if (stance === 'stand') {
        // Someone standing breathes and shifts a little.
        out.lean = 0.02 * Math.sin(t * 1.3) * loop;
        out.armL = 0.04 + 0.03 * Math.sin(t * 1.1) * loop;
        out.armR = 0.04 + 0.03 * Math.sin(t * 1.1 + 1) * loop;
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
      // The piece in the left hand over the table; the knife in the right, each stroke away from the body.
      out.nod = 0.5;
      out.lean = 0.22;
      const phase = (t * 1.6) % 1;
      const stroke = loop === 0 ? 0.5 : phase < 0.35 ? smooth(phase / 0.35) : 1 - smooth((phase - 0.35) / 0.65);
      handTo(out, 1.2, 2.25, 0);
      handTo(out, 1.05 + 0.35 * stroke, 2.45 - 0.25 * stroke, 1);
      return out;
    }
    case 'draw': {
      sitting(out);
      out.nod = 0.55;
      out.lean = 0.3;
      handTo(out, 1.35, 1.75, 0);
      handTo(out, 1.55 + 0.1 * Math.cos(t * 7) * loop, 1.78 + 0.05 * Math.sin(t * 7) * loop, 1);
      return out;
    }
    case 'sip': {
      under();
      // The mug at her chest, and to her mouth now and then.
      const cycle = loop === 0 ? 0 : (t % 4.2) / 4.2;
      const up = cycle > 0.55 && cycle < 0.85 ? Math.sin(((cycle - 0.55) / 0.3) * Math.PI) : 0;
      const hips = hipsOf(out);
      handTo(out, 0.55 + 0.05 * up, hips + 1.2 + 0.75 * up, 0);
      out.nod = -0.12 * up;
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
      const k = rise(t, 0.25);
      const hips = hipsOf(out);
      out.lean -= 0.1 * k;
      handTo(out, 0.42, hips + SHOULDER + 0.45, 0, k);
      handTo(out, 0.42, hips + SHOULDER + 0.45, 1, k);
      out.bounce = loop * 0.12 * Math.max(0, Math.sin(Math.min(1, t / 0.3) * Math.PI));
      look(out, c);
      return out;
    }
    case 'point': {
      under();
      const target = c.aim ?? { ahead: 6, up: CHEST };
      const hips = hipsOf(out);
      const k = rise(t, 0.3);
      // Straight at it: the hand goes as far as the arm reaches along the line to it.
      const dx = target.ahead, dy = target.up - (hips + SHOULDER);
      const far = Math.hypot(dx, dy) || 1;
      handTo(out, dx / far * 1.7, hips + SHOULDER + dy / far * 1.7, 1, k);
      out.lean += 0.06 * k;
      look(out, c, k);
      return out;
    }
    case 'wave': {
      under();
      const k = rise(t, 0.3);
      out.armR = 2.75 * k;
      out.elbowR = 0.45 + 0.4 * Math.sin(t * 10) * loop * k;
      look(out, c);
      return out;
    }
    case 'cheer': {
      under();
      const k = rise(t, 0.2);
      out.armL = out.armR = 2.85 * k;
      out.elbowL = out.elbowR = 0.25;
      out.bounce = loop * Math.abs(Math.sin(t * 7.5)) * 0.32 * (t < 1.6 ? 1 : 0);
      return out;
    }
    case 'offer':
    case 'reach':
    case 'lift': {
      under();
      const target = c.aim ?? { ahead: 1.6, up: CHEST };
      const k = rise(t, act === 'lift' ? 1.1 : 0.5);
      // Reaching low, the back bends to it; lifting, it straightens as the hand comes up.
      const hips = hipsOf(out);
      const low = Math.max(0, hips + 0.4 - target.up);
      out.lean += (act === 'reach' ? Math.min(0.8, 0.2 + low * 0.35) : act === 'lift' ? 0.15 : 0.1) * k;
      handTo(out, target.ahead, target.up, 1, k);
      if (act !== 'offer') handTo(out, target.ahead - 0.15, target.up - 0.1, 0, k * 0.6);
      out.nod = (act === 'offer' ? 0.18 : Math.min(0.7, 0.25 + low * 0.2)) * k;
      look(out, c, k);
      return out;
    }
    case 'show': {
      under();
      // Something held up in both hands, at the height of the face, for others to see.
      const k = rise(t, 0.4);
      const hips = hipsOf(out);
      handTo(out, 1.05, hips + SHOULDER + 0.35, 0, k);
      handTo(out, 1.05, hips + SHOULDER + 0.35, 1, k);
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
      const k = Math.sin(Math.min(1, t / 0.9) * Math.PI);
      out.armL = out.armR = 0.25;
      out.elbowL = out.elbowR = 0.3 + 1.2 * k;
      out.spread = 0.35 * k;
      out.bounce = 0.06 * k;
      out.nod = -0.1 * k;
      return out;
    }
    case 'hug': {
      under();
      const k = rise(t, 0.5);
      out.armL = out.armR = 0.4 + 1.0 * k;
      out.elbowL = out.elbowR = 0.3 + 1.4 * k;
      out.lean += 0.12 * k;
      return out;
    }
    case 'nod': {
      under();
      out.nod = loop ? 0.18 + 0.22 * Math.max(0, Math.sin(Math.min(t, 1.2) * 2 * Math.PI * 1.6)) : 0.25;
      return out;
    }
    case 'startle': {
      under();
      const k = rise(t, 0.18);
      out.armL = out.armR = 2.1 * k;
      out.elbowL = out.elbowR = 1.3 * k;
      out.lean = -0.18 * k;
      out.bounce = loop * 0.25 * Math.max(0, Math.sin(Math.min(1, t / 0.35) * Math.PI));
      look(out, c);
      return out;
    }
    case 'stomp': {
      under();
      // A foot comes up and down, hard: cross, and sure of himself.
      const beat = (t % 0.9) / 0.9;
      const lift = loop === 0 ? 0 : beat < 0.45 ? Math.sin((beat / 0.45) * Math.PI) : 0;
      out.legR = 0.9 * lift;
      out.kneeR = 1.1 * lift;
      out.armL = out.armR = -0.25;
      out.elbowL = out.elbowR = 0.5;
      out.lean = 0.16;
      out.nod = -0.1;
      return out;
    }
    case 'hands': {
      under();
      const k = rise(t, 0.4);
      const hips = hipsOf(out);
      handTo(out, 0.7, hips + SHOULDER - 0.3, 0, k);
      handTo(out, 0.75, hips + SHOULDER - 0.25, 1, k);
      out.nod = 0.65 * k;
      out.lean = 0.12 * k;
      return out;
    }
    case 'paint': {
      under();
      const target = c.aim ?? { ahead: 1.2, up: 1.8 };
      const dab = loop * 0.08 * Math.sin(t * 9);
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
