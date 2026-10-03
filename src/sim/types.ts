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

/** A hook for the lace, marked with a red ring (plan §4.2). */
export interface Hook {
  x: number;
  y: number;
  /** How long the lace is when he swings from it: short enough that the swing clears the ground. */
  length: number;
  /** Where the swing is meant to land him. With *Hjälp med svingen* the flight is steered there. */
  land?: Vec;
}

/**
 * What Elof is doing: on his own feet, or carried by the glitter bubble, up a ledge, on a hose, down a hose,
 * on the lace, or through the air to a swing's landing.
 */
export type Mode = 'free' | 'bubble' | 'ledge' | 'climb' | 'slide' | 'swing' | 'fly';

/** What the Använd button would do right now. Each has its word in `sv.verbs`. */
export type Verb = 'slide' | 'lace';

/** A jump the course asks for: the edge it is made from, the way it goes, and where it lands. */
export interface Jump {
  at: Vec;
  dir: 1 | -1;
  land: Vec;
}

/** The settings that change the rules (plan §4.1). */
export interface SimOptions {
  /** *Hjälp med svingen*: the swing pumps itself, and letting go always lands. */
  swingHelp?: boolean;
  /** *Lätta hopp*: running to a marked edge jumps by itself, and the jump is steered to its landing. */
  easyJumps?: boolean;
  /** *Lugnt*: he stops at every drop too long to land, at a run too, instead of falling. */
  stopAtEdges?: boolean;
}

/** Where a simulation starts when a saved game is taken up again. */
export interface SimStart {
  /** The big candy to start at, by its place in chapter.checkpoints. Left out or unknown: the chapter's start. */
  checkpoint?: number;
  /** The trail candy already in the bag, by its place in chapter.candy. */
  collected?: readonly number[];
}

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
  /** The hooks he can throw the lace to. */
  hooks?: Hook[];
  /** The big candies on the path, in order. Each is a checkpoint: the game saves there (plan §3.3, rule 4). */
  checkpoints?: Vec[];
  /** The jumps that *Lätta hopp* makes by itself. */
  jumps?: Jump[];
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
  /** The hook he swings from, or null. */
  hook: Vec | null;
}
