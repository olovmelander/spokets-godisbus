import { STEP } from './constants';
import type { GhostState } from './sim';
import type { GhostPerch, PlayerState, Vec } from './types';

/**
 * The prologue's set: the doorway whose hinge tears the bag, the railing Pappa puts the frozen ghost on, and
 * the deck's edge it sneaks off to behind his back. Pappa notices it once the flag `pappaAfter` is set.
 */
export interface PrologueLayout {
  doorway: Vec; railing: Vec; edge?: Vec; pappaAfter?: string; pappaFrom?: number;
  /**
   * Where he is when the ghost, waiting at the deck's edge, leaps down into the garden (`leap`): far enough from it
   * that he never reaches it, at a run or in a jump, and in the picture, so that a child who walks sees it go too
   * (Olov, 13 November 2026: "fixa så att spöket hoppar ner innan man hinner fram till det").
   */
  leapFrom?: number;
  /** For the picture only: where the deck's railing runs, and how far behind the play plane. */
  rail?: { from: number; to: number; z: number };
}
export interface PrologueFrame { kind: 'mamma' | 'pappa'; seconds: number; ghost: Vec }
// The family returns from the window around the kitchen table before the frozen carving moves again.
export const MAMMA_TIME = 9.4;
/**
 * Pappa's joke: he puts the stiff ghost up on the railing and turns his back. It hops down onto the deck (PAPPA_DOWN)
 * and scurries off along it to the deck's edge (PAPPA_EDGE), where it turns to look back at Elof. Elof's "Det smiter!"
 * (PAPPA_SNUCK, ../content/chapters/ends.ts) is said while it runs, and the picture held while it is read shows it
 * running away along the boards (Olov, 13 November 2026: "Jag vill ju att det ska kännas som att det smiter").
 */
export const PAPPA_TIME = 5.9;
const PAPPA_OFF = 3.4;
const PAPPA_DOWN = 3.8;
export const PAPPA_SNUCK = 4.4;
const PAPPA_EDGE = 5.4;
/** Where it lands on the deck, off the railing, and how many quick hops its scurry to the edge takes. */
const DECK_LANDING = 47.4;
const SCURRY_HOPS = 6;
/**
 * Mamma's joke: the ghost stiffens in mid-hop as she turns (FROZEN), drops like a dropped piece of wood, lands with a
 * knock (LANDS), rocks once and lies still on the floor (DOWN). Only once it has lain there a moment does she see it
 * (`mamma:sees`, SEEN), and say "Hoppsan! Vem tappade spöket?": the line freezes the picture while it is read, so
 * that picture is the joke, and the ghost lies in it (Olov, 13 November 2026: "så måste spöket först ligga på golvet").
 */
export const MAMMA_FROZEN = 0.3;
export const MAMMA_LANDS = 0.72;
export const MAMMA_DOWN = 0.95;
export const MAMMA_SEEN = 1.7;
/** It is up again, and off in the hop it froze in, over the last part of the joke, while their backs are turned. */
const MAMMA_UP = 0.7;
/** How far before the doorway it freezes in its hop: clear of the doorway's post, and in the joke's picture. */
const MAMMA_BEFORE_DOOR = 2.5;

/**
 * Two short, deterministic freeze jokes (plan §3.3 rule 2). Only completed beats are saved; an interrupted one
 * replays. `perches` are the ghost's places: after Pappa's joke it is where the edge perch is.
 */
export class PrologueSequence {
  frame: PrologueFrame | null = null;
  /** A joke is due and waits for what is being said to finish: he stands and listens meanwhile. */
  listening = false;
  constructor(readonly layout: PrologueLayout, private readonly perches: readonly GhostPerch[] = []) {}

  /**
   * One step. `talking`: a line is still being read, or waits to be said, so a joke that is due waits. The simulation
   * waits for the page to finish the line (./sim.ts).
   */
  tick(player: PlayerState, ghost: GhostState | null, flags: Set<string>, talking = false, conditions: Pick<ReadonlySet<string>, 'has'> = flags): void {
    this.listening = false;
    if (!ghost) return;
    if (conditions.has('pappa:done') && !this.layout.edge) { ghost.gone = true; return; }
    if (!this.frame && player.mode === 'free' && player.grounded) {
      // Pappa notices it once its flag is set, where he kneels: a game taken up further back walks there first.
      const pappaDue = this.layout.pappaAfter
        ? (conditions.has(this.layout.pappaAfter) || conditions.has('pappa:noticed')) && player.x >= (this.layout.pappaFrom ?? -Infinity)
        : player.x >= 44.4;
      const kind = conditions.has('blink') && !conditions.has('mamma:passed') && ghost.x >= this.layout.doorway.x - MAMMA_BEFORE_DOOR ? 'mamma'
        : conditions.has('star') && !conditions.has('pappa:done') && pappaDue ? 'pappa' : null;
      // Pappa's line is said as it begins, and Mamma's as she sees the ghost on the floor (`mamma:sees`): the words
      // before are let finish first.
      if (kind && talking) this.listening = true;
      else if (kind) {
        flags.add(`${kind}:noticed`);
        this.frame = { kind, seconds: 0, ghost: { x: ghost.x, y: ghost.y } };
      }
    }
    if (this.frame) {
      this.frame.seconds += STEP;
      const mamma = this.frame.kind === 'mamma';
      if (mamma && this.frame.seconds + STEP / 2 >= MAMMA_SEEN) flags.add('mamma:sees');
      if (this.frame.seconds + STEP / 2 >= (mamma ? MAMMA_TIME : PAPPA_TIME)) {
        flags.add(mamma ? 'mamma:passed' : 'pappa:done');
        if (!mamma) this.hide(ghost);
        this.frame = null;
      }
    }
    // The first doorway catches the bag after Mamma has passed. The existing trail begins just beyond it.
    if (conditions.has('mamma:passed') && ghost.x >= this.layout.doorway.x) flags.add('bag:torn');
    // At the deck's edge it waits for him, looking back, and leaps down into the garden as he comes: before he is there.
    if (this.layout.leapFrom !== undefined && conditions.has('pappa:done') && player.x >= this.layout.leapFrom) flags.add('leap');
  }

  /**
   * The railing is empty when Pappa looks back. In the older prologue the ghost was gone; now it is at the deck's
   * edge, where it waits for Elof: its edge perch.
   */
  hide(ghost: GhostState): void {
    const edge = this.layout.edge;
    const at = edge ? this.perches.findIndex((perch) => perch.at.x === edge.x && perch.at.y === edge.y) : -1;
    if (!edge || at < 0) { ghost.gone = true; return; }
    ghost.x = edge.x;
    ghost.y = edge.y;
    ghost.perch = at;
    ghost.t = 1;
    ghost.gone = false;
  }

  cancel(): void { this.frame = null; this.listening = false; }
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const between = (t: number, start: number, end: number) => {
  const n = Math.max(0, Math.min(1, (t - start) / (end - start)));
  return n * n * (3 - 2 * n);
};

/** How far in front of the play plane the ghost is drawn in a freeze joke, where it is not on the railing. */
const PLAY_Z = 0.1;

/** The view rehearses exactly the simulation's clock, so pause/recovery freeze every actor together. */
export function prologuePose(layout: PrologueLayout, frame: PrologueFrame) {
  const t = frame.seconds;
  if (frame.kind === 'mamma') {
    // Lying, a wooden figure rests on its side: its feet, where it turns, a little off the floor.
    const floor = layout.doorway.y, lying = floor + 0.29, top = frame.ghost.y;
    // Stiff in mid-air for a moment, then it drops, toppling as it falls.
    if (t < MAMMA_LANDS) {
      const drop = Math.max(0, (t - MAMMA_FROZEN) / (MAMMA_LANDS - MAMMA_FROZEN));
      return { x: frame.ghost.x, y: mix(top, lying, drop * drop), z: PLAY_Z, tilt: -Math.PI / 2 * between(drop, 0, 1), turn: 0.4, scale: 1 };
    }
    // It lands with a knock, bounces a little and rocks once on its side, then lies still.
    if (t < MAMMA_DOWN) {
      const k = (t - MAMMA_LANDS) / (MAMMA_DOWN - MAMMA_LANDS);
      const bounce = Math.sin(Math.PI * k) * (1 - k);
      return { x: frame.ghost.x, y: lying + 0.3 * bounce, z: PLAY_Z, tilt: -Math.PI / 2 + 0.35 * bounce, turn: 0.4, scale: 1 };
    }
    // Behind their backs it gets up, stiff, onto its feet, and springs up into the hop it froze in.
    const rise = between(t, MAMMA_TIME - MAMMA_UP, MAMMA_TIME - MAMMA_UP / 2);
    const spring = Math.max(0, (t - (MAMMA_TIME - MAMMA_UP / 2)) / (MAMMA_UP / 2));
    const up = Math.min(1, spring) * (2 - Math.min(1, spring));
    return { x: frame.ghost.x, y: mix(mix(lying, floor, rise), top, up), z: PLAY_Z, tilt: -Math.PI / 2 * (1 - rise), turn: 0.4, scale: 1 };
  }
  const lift = between(t, 1.1, 2.8), sneak = between(t, 3.4, 4.9);
  if (layout.edge) {
    // Behind his back it hops down off the railing onto the deck, and scurries off along it to the deck's edge.
    const rail = layout.rail?.z ?? PLAY_Z;
    const onRail = { x: mix(frame.ghost.x, layout.railing.x, lift), y: mix(frame.ghost.y, layout.railing.y, lift), z: mix(PLAY_Z, rail, lift) };
    // It turns round to go as it sets off, over a third of a second.
    const away = mix(Math.PI - 0.4, 0.4, between(t, 3.15, 3.5));
    if (t < PAPPA_DOWN) {
      const k = Math.max(0, (t - PAPPA_OFF) / (PAPPA_DOWN - PAPPA_OFF));
      return {
        x: mix(onRail.x, DECK_LANDING, k), y: mix(onRail.y, layout.edge.y, k * k) + Math.sin(Math.PI * k) * 0.45,
        z: mix(onRail.z, PLAY_Z, k), tilt: -0.1 * Math.sin(Math.PI * k), turn: away, scale: 1,
      };
    }
    // Along the boards in quick little hops, leaning into its run; at the edge it turns to look back at him.
    const run = Math.min(1, (t - PAPPA_DOWN) / (PAPPA_EDGE - PAPPA_DOWN));
    return {
      x: mix(DECK_LANDING, layout.edge.x, between(run, 0, 1)),
      y: layout.edge.y + Math.abs(Math.sin(Math.PI * SCURRY_HOPS * run)) * 0.2,
      z: PLAY_Z,
      tilt: -0.3 * Math.sin(Math.PI * run),
      turn: mix(0.4, Math.PI - 0.4, between(t, PAPPA_EDGE + 0.05, PAPPA_EDGE + 0.4)),
      scale: 1,
    };
  }
  return {
    x: mix(frame.ghost.x, layout.railing.x, lift) + sneak * 2.7,
    y: mix(frame.ghost.y, layout.railing.y, lift),
    z: PLAY_Z,
    tilt: -0.1 * Math.sin(Math.PI * sneak), turn: mix(Math.PI - 0.4, 0.4, between(t, 3.15, 3.5)),
    scale: 1 - between(t, 4.7, 5.15),
  };
}

/** Where the dropped bag lies in Mamma's joke: ahead of the ghost's feet, past its head, and a little nearer. */
const BAG_AHEAD = 1.3;
const BAG_NEAR = 0.25;
/** The bag lying on its side: how high its bottom's middle is off the floor. */
const BAG_LYING = 0.14;

/**
 * The bag in Mamma's joke, from the ghost's place in the picture, while it is not in the ghost's hands (`held`, also
 * from its place): it slips out of them as the ghost drops, falls on ahead, and lands on its side on the floor, its
 * mouth to the doorway, so that the ghost lies there alone and plain to see. The ghost takes it again as it gets up.
 * `tilt` turns it about the line into the picture; `out` is how far it is out of the ghost's hands. Null: in them.
 */
export function droppedBag(layout: PrologueLayout, frame: PrologueFrame, held: { x: number; y: number; z: number }) {
  const t = frame.seconds;
  if (frame.kind !== 'mamma' || t <= MAMMA_FROZEN) return null;
  const ghost = prologuePose(layout, frame);
  // It falls a little behind the ghost, carried on by the hop, and lands just after it.
  const fall = Math.min(1, (t - MAMMA_FROZEN) / (MAMMA_LANDS + 0.08 - MAMMA_FROZEN));
  const out = between(fall, 0, 1) * (1 - between(t, MAMMA_TIME - MAMMA_UP, MAMMA_TIME - MAMMA_UP / 2));
  const y = mix(frame.ghost.y + held.y, layout.doorway.y + BAG_LYING, fall * fall);
  return {
    x: mix(held.x, BAG_AHEAD, out),
    y: mix(held.y, y - ghost.y, out),
    z: mix(held.z, BAG_NEAR, out),
    tilt: -Math.PI / 2 * out,
    out,
  };
}
