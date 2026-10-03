export interface Vec {
  x: number;
  y: number;
}

/** Something upright that Elof climbs: a hose, a stem, a root (plan §4.2). */
export interface Climb {
  x: number;
  bottom: number;
  top: number;
  /** The side its top has a ledge on, which he steps onto: -1 left, 1 right. None: he stops at the top. */
  exit?: -1 | 1;
}

/** What Elof is doing: on his own feet, or carried by the glitter bubble, up a ledge, on a hose, down a hose. */
export type Mode = 'free' | 'bubble' | 'ledge' | 'climb' | 'slide';

/** What the Använd button would do right now. Each has its word in `sv.verbs`. */
export type Verb = 'slide';

/** What a chapter file gives the simulation and the renderer. Units: EL. */
export interface ChapterData {
  id: string;
  /** The ground as one open line, from left to right. Elof walks on its upper side. */
  ground: Vec[];
  spawn: Vec;
  /** Reaching this x sets the flag "goal". */
  goalX: number;
  /**
   * Trail candy, in the order the path meets it (plan §4.3). Each point is where the candy floats: about
   * half an EL over the ground on a walk, and along the arc of the jump over a gap or up a step.
   */
  candy: Vec[];
  /** The hoses and stems he can climb. */
  climbs?: Climb[];
}

/** One simulation step's input. hop and act are presses; the rest is held state. */
export interface StepInput {
  /** -1 (left) to 1 (right). */
  x: number;
  /** -1 (down) to 1 (up): for climbing. */
  y: number;
  hopHeld: boolean;
  hop: boolean;
  act: boolean;
}

export interface PlayerState {
  /** The middle of Elof's feet. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  /** Height of the ground straight below him, for his shadow and the camera. */
  groundY: number;
  /** Height of the ground he last stood on: where the camera looks while he is over a long drop. */
  standY: number;
  /** He has stopped at the edge of a drop too long to walk off (plan §4.2). */
  atEdge: boolean;
  /** 0 outside the glitter bubble; inside it, how far it has carried him, up to 1. */
  bubble: number;
  mode: Mode;
  /** How far through the bubble, the ledge or the slide he is, from 0 to 1. 0 in the other modes. */
  t: number;
  /** What Använd would do now, or null when there is nothing to use. */
  verb: Verb | null;
}
