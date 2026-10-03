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
  /** A flag that has to be set before he can use it: the hose the ladybird shows him. */
  needs?: string;
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
 * on the lace, through the air to a landing, knocked over for a moment, or on a ride.
 */
export type Mode = 'free' | 'bubble' | 'ledge' | 'climb' | 'slide' | 'swing' | 'fly' | 'down' | 'ride';

/** What the Använd button would do right now. Each has its word in `sv.verbs`. */
export type Verb = 'slide' | 'lace' | 'push' | 'pull' | 'turn' | 'take' | 'call' | 'grab';

/**
 * A thing on a rail (plan §4.2): a shaving, a cone, a stick. It moves one stop at a time and can never end
 * up somewhere unsolvable. At its last stop it stays for good; before that it goes home when Elof leaves.
 */
export interface Mover {
  /** A stable name: the save remembers it by this. */
  id: string;
  width: number;
  height: number;
  /** Where the middle of its bottom is at each stop, from home to where it belongs. */
  stops: Vec[];
  /** Knuffa: he pushes it from beside it. Dra: the lace pulls it by its red ring. */
  verb: 'push' | 'pull';
  /** For Dra: where the ring sits, from the middle of its bottom. */
  ring?: Vec;
}

/** A trail candy: where it floats, and the flag that has to be set before it is there at all. */
export interface Candy extends Vec {
  /** It appears when this flag is set: the candy the ghost drops when Elof nearly catches it. */
  after?: string;
}

/**
 * A place where Använd does one thing, once (plan §4.7): a lever to turn, a thing to take, someone to call.
 * Using it sets the flag with its id, and what follows from that is the chapter's business.
 */
export interface Spot {
  id: string;
  at: Vec;
  verb: 'turn' | 'take' | 'call';
  /** A flag that has to be set before it can be used. */
  needs?: string;
  /** The word on the button where the verb's own is too plain: a key of `sv.verbs`, as in "Ropa på Moa". */
  word?: string;
  /** Using it starts this ride. */
  ride?: string;
}

/** Who a bubble belongs to. Each has a name in `sv.who`. */
export type Speaker = 'mamma' | 'pappa' | 'moa' | 'bertil' | 'elof' | 'spoket';

/**
 * Something said, in a bubble (plan §3.7): the game has no voices. It comes when Elof first passes `at`, or
 * when the flag `on` is set, and only once.
 */
export interface Beat {
  id: string;
  at?: number;
  on?: string;
  who: Speaker;
  /** A key of `sv.lines`. */
  line: string;
}

/**
 * A ride that can't fail (plan §4.2): the paper plane, the cap, the crane. It carries him along an arc from
 * one place to another, and the stick only moves him up and down inside its corridor.
 */
export interface Ride {
  id: string;
  from: Vec;
  to: Vec;
  /** How high the arc rises above the straight line between its ends. */
  rise: number;
  /** How long it takes, in seconds. */
  time: number;
}

/**
 * A place where the ghost waits for Elof (plan §4.2). It hops on to the next when he comes near, so it is
 * always a little ahead: the chase can't be lost, and it can't be won before the story says so.
 */
export interface GhostPerch {
  at: Vec;
  /** How close he may come before it hops on. Left out: 4 EL. */
  near?: number;
  /** A near-catch: it stays until he is within 1.5 EL, and Använd says Ta! Grabbing sets this flag. */
  catch?: string;
  /** It waits here, however close he comes, until this flag is set. */
  until?: string;
}

/** A stretch of the course where the camera frames differently (plan §6.4). */
export interface CameraZone {
  from: number;
  to: number;
  /** How wide the picture is there: 1 is the usual, 1.3 shows about a third more. */
  zoom?: number;
  /** How far the picture is lifted, in EL. */
  lift?: number;
  /** How far ahead of Elof it looks, where the usual 2.5 EL is wrong. */
  lead?: number;
}

/**
 * A place where drops fall, one after another (plan §4.7, E1). Each drop's shadow grows on the ground before
 * it lands, so the way through is read from the ground.
 */
export interface Drip {
  /** Where the drops land. */
  at: Vec;
  /** The time between two drops, in seconds. */
  every: number;
  /** When a drop lands, counted from the chapter's start: it sets this drip's place in the rhythm. */
  first: number;
}

/** A jump the course asks for: the edge it is made from, the way it goes, and where it lands. */
export interface Jump {
  at: Vec;
  dir: 1 | -1;
  land: Vec;
  /** The thing on a rail that has to be in place before this jump can be made. */
  needs?: string;
}

/** The settings that change the rules (plan §4.1). */
export interface SimOptions {
  /** *Hjälp med svingen*: the swing pumps itself, and letting go always lands. */
  swingHelp?: boolean;
  /** *Lätta hopp*: running to a marked edge jumps by itself, and the jump is steered to its landing. */
  easyJumps?: boolean;
  /** *Lugnt*: he stops at every drop too long to land, at a run too, instead of falling. */
  stopAtEdges?: boolean;
  /** *Lugnt*: in the exciting sequences nothing needs timing. Falling drops miss him while he moves. */
  gentle?: boolean;
}

/** Where a simulation starts when a saved game is taken up again. */
export interface SimStart {
  /** The big candy to start at, by its place in chapter.checkpoints. Left out or unknown: the chapter's start. */
  checkpoint?: number;
  /** The trail candy already in the bag, by its place in chapter.candy. */
  collected?: readonly number[];
  /** The things on rails that are where they belong, by id. */
  placed?: readonly string[];
  /** What has happened in the chapter: the flags set so far. */
  flags?: readonly string[];
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
  candy: Candy[];
  /** The hoses and stems he can climb. */
  climbs?: Climb[];
  /** The hooks he can throw the lace to. */
  hooks?: Hook[];
  /** The big candies on the path, in order. Each is a checkpoint: the game saves there (plan §3.3, rule 4). */
  checkpoints?: Vec[];
  /** The jumps that *Lätta hopp* makes by itself. */
  jumps?: Jump[];
  /** The things on rails that he pushes and pulls. */
  movers?: Mover[];
  /** The places where drops fall. */
  drips?: Drip[];
  /** Where the camera frames differently. */
  cameras?: CameraZone[];
  /** The places where Använd does one thing, once. */
  spots?: Spot[];
  /** The places where the ghost waits for him, in order. Left out: the chapter has no ghost. */
  ghost?: GhostPerch[];
  /** What is said along the way. */
  beats?: Beat[];
  /** The rides. */
  rides?: Ride[];
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
  /** The word for the button, where the verb's own is too plain: a key of `sv.verbs`. */
  word: string | null;
}
