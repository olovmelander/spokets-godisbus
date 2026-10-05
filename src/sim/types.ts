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
  /** Keep a reused climbing rule recognizable as the story's actual tool. */
  look?: 'hose' | 'lace' | 'braid' | 'lichen' | 'root';
}

/** A hook for the lace, marked with a red ring (plan §4.2). */
export interface Hook {
  x: number;
  y: number;
  /** How long the lace is when he swings from it: short enough that the swing clears the ground. */
  length: number;
  /** Where the swing is meant to land him. With *Hjälp med svingen* the flight is steered there. */
  land?: Vec;
  /** A hook of a challenge route (plan §4.7): off the way on, so the helper never points at it. */
  extra?: boolean;
  /**
   * For the picture: its ring hangs on a cord this long from something above it, a string from a bough or
   * the flex of a lamp. Left out, a ring under a line (`lines`) hangs from that line, and any other is a
   * ring on a nail.
   */
  hangs?: number;
}

/**
 * A line strung over the path, for the picture only (docs/level-design.md): a clothes line, a rope between
 * two dead pines. The rings under it hang from it, so that nothing floats.
 */
export interface Line {
  from: Vec;
  to: Vec;
  /** How far its middle hangs below its ends. */
  sag?: number;
  /** A pole stands under each end, down into the ground. */
  posts?: boolean;
}

/**
 * A ledge (docs/level-design.md): a thin floor that he can jump up through and stand on, and walk in front of
 * when it is higher than his feet. It is how a chapter gets a second level over the same stretch: the ground
 * is one line, and a ledge is ground only from above. He leaves it by walking off its end.
 */
export interface Ledge {
  /** The middle of its top. */
  x: number;
  y: number;
  width: number;
  /** What it is, for the picture. */
  look: LedgeLook;
  /** It is there only once this flag is set: something a helper's hands, or his own, put in place. */
  needs?: string;
}

/**
 * What Elof is doing: on his own feet, or carried by the glitter bubble, up a ledge, on a hose, down a hose,
 * on the lace, through the air to a landing, knocked over for a moment, or on a ride.
 */
export type Mode = 'free' | 'bubble' | 'ledge' | 'climb' | 'slide' | 'swing' | 'fly' | 'down' | 'ride';

/** What the Använd button would do right now. Each has its word in `sv.verbs`. */
export type Verb = 'slide' | 'lace' | 'push' | 'pull' | 'turn' | 'take' | 'call' | 'give' | 'grab';

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
  /** A flag that has to be set before it can be moved. */
  needs?: string;
  /** It goes to its last stop by itself when this flag is set, and Använd never moves it: a helper's hands lift it. */
  on?: string;
  /** What it is, for the picture. Left out: a plain box. */
  look?: MoverLook;
  /** For Dra: where the ring sits, from the middle of its bottom. */
  ring?: Vec;
  /** An optional path: the story helper never sends him here from the main trail. */
  extra?: boolean;
  /** A toy/side puzzle: keep its final placement in saves, but do not steer the main hint trail into it. */
  optional?: boolean;
  /** A repeating platform, between its two stops. Its phase is local, never saved as puzzle progress. */
  cycle?: { seconds: number; phase?: number };
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
  verb: 'turn' | 'take' | 'call' | 'give';
  /** A flag that has to be set before it can be used. A thing on a rail sets `placed:<its id>` once in place. */
  needs?: string;
  /** It is used by coming close, with no button: a memory he touches. With a ride, the ride begins by itself. */
  touch?: boolean;
  /** A side-route interaction, left out of the main trail's hints. */
  extra?: boolean;
  /** A replayable bell: its MIDI pitch stays the same on every visit, including after loading a save. */
  note?: number;
  /** A kindness toy: after using it, leave by 4 EL and return for this saved keepsake flag. */
  returnGift?: string;
  /** What stands there, for the picture. Left out: only the glint over it. */
  look?: SpotLook;
  /** The word on the button where the verb's own is too plain: a key of `sv.verbs`, as in "Ropa på Moa". */
  word?: string;
  /** Using it starts this ride. */
  ride?: string;
  /** Opens an authored interaction; pressing Använd alone never awards its flag. */
  story?: import('./story').StoryKind;
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
  /** Context that must exist even when Elof reaches the position first. */
  needs?: string;
  /** A new causal scene replaces stale queued dialogue. */
  priority?: boolean;
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
  /** How far the stick moves him from the middle of its path. Left out: 1.6 EL. A boat hardly at all. */
  corridor?: number;
  /** What he rides on, for the picture. Left out: Moa's paper plane. */
  look?: RideLook;
}

/**
 * A stretch of open ground where gusts sweep across (plan §4.7, E4). Each is announced a second ahead. One
 * that catches him in the open takes him back to the last boulder; in a boulder's lee it passes him by.
 * Nothing falls. The ground of the stretch is level and has no gap.
 */
export interface Gust {
  /** The open stretch, and the height of its ground. */
  from: number;
  to: number;
  y: number;
  /** The time between two gusts, in seconds, and how long one blows. */
  every: number;
  length: number;
  /** When a gust begins, counted from the chapter's start: its place in the rhythm. */
  first: number;
  /** Where the boulders stand. */
  shelters: number[];
}

/**
 * A soft tussock (plan §4.7, E3): it carries him, and sinks slowly while he stands on it. When it has sunk,
 * the glitter bubble lifts him off and floats him back to the last firm ground. Left alone it rises again.
 */
export interface Tussock {
  /** Its middle. */
  x: number;
  /** Its top, at rest. */
  y: number;
  width: number;
}

/**
 * A cranberry (plan §4.8, O7): a trampoline. Coming down on one sends him `lift` EL up, whatever Hoppa does.
 * Walking into one does nothing. It is a toy: nothing in the story needs it.
 */
export interface Bouncer {
  x: number;
  /** Its top. */
  y: number;
  lift: number;
}

/**
 * A place where cones roll (plan §4.7, E2): one sets off from `from` every so often and rolls to `to`. One
 * that reaches Elof's legs bowls him into the glitter bubble, which takes him to the last big candy.
 */
export interface Roller {
  from: Vec;
  to: Vec;
  /** The time between two cones, in seconds. */
  every: number;
  /** When a cone sets off, counted from the chapter's start or from `needs`: its place in the rhythm. */
  first: number;
  /** EL per second. */
  speed: number;
  radius: number;
  /** A flag that sets the cones rolling: the loose cone he nudges. Left out: they roll from the start. */
  needs?: string;
  /** A local story beat can end the hazard before a return path becomes a puzzle hub. */
  until?: string;
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
  /** A wordless picture at this story stop; progress makes the ghost's thoughts clearer (§3.3). */
  thought?: { picture: 'mountain' | 'pine-crack' | 'lonely-figure' | 'small-figure'; after?: string; until?: string };
}

/** A stretch of the course where the camera frames differently (plan §6.4). */
export interface CameraZone {
  from: number;
  to: number;
  /** Only above this height: a challenge can have its own framing without widening the ordinary path. */
  above?: number;
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
  /** A traversal aid that stops once its obstacle becomes an interactive puzzle. */
  until?: string;
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
  /** How much the helper does by itself (plan §4.6). Left out: only when he asks. */
  help?: HelpLevel;
}

/** *Bara när jag frågar*, *Påminn mig*, *Guida mig*. */
export type HelpLevel = 'ask' | 'remind' | 'guide';

/**
 * What the helper is doing (plan §4.6). Each time he asks it goes one step further:
 * 1. it goes to the place and looks at it;
 * 2. it knocks on the thing, and Använd's word pulses;
 * 3. a dotted figure of Elof demonstrates the action, without changing the simulation.
 * At 0 it is away.
 */
export interface HelpState {
  step: 0 | 1 | 2 | 3;
  at: Vec | null;
  verb: Verb | null;
  word: string | null;
  /** An authored story visit: looking/double-knocking only, never a pulse on Använd. */
  visit?: boolean;
  /** A fresh explicit request for step three restarts its short visual demonstration. */
  replay?: number;
}

/** Where a simulation starts when a saved game is taken up again. */
export interface SimStart {
  /** The big candy to start at, by its place in chapter.checkpoints. Left out or unknown: the chapter's start. */
  checkpoint?: number;
  /** The trail candy already in the bag, by its place in chapter.candy. */
  collected?: readonly number[];
  /** The side candy already in the bag, by its place in chapter.side. */
  side?: readonly number[];
  /** The things on rails that are where they belong, by id. */
  placed?: readonly string[];
  /** What has happened in the chapter: the flags set so far. */
  flags?: readonly string[];
}

/** What a chapter file gives the simulation and the renderer. Units: EL. */
/** What a thing on a rail is, a thing to use is, and what he rides on: the picture's business only. */
export type MoverLook = 'plank' | 'block' | 'curl' | 'twig' | 'cone' | 'leaf' | 'log' | 'figure' | 'ants' | 'tussock' | 'stone';
export type LedgeLook = 'plank' | 'trestle' | 'leaf' | 'branch' | 'bark' | 'stone';
export type SpotLook = 'ladybird' | 'berry' | 'crowberry' | 'jay' | 'ants' | 'sign' | 'seesaw' | 'lollipop' | 'crane' | 'cobble' | 'bag' | 'gold' | 'star' | 'shavings' | 'memory' | 'marble' | 'clip' | 'brick' | 'coin' | 'dew' | 'wisp' | 'cairn' | 'vittra-door' | 'keepsake';
export type RideLook = 'plane' | 'cap' | 'crane' | 'ants' | 'leaf' | 'none';

/** The places of the story, each with its own light and layers (plan §5.4). The picture's business only. */
export type PlaceId = 'forest' | 'garden' | 'bog' | 'mountain' | 'dusk' | 'home' | 'village';

/** What a stretch of ground is made of, where it isn't the place's own ground. The picture's business only. */
export type SurfaceKind = 'wood' | 'earth' | 'stone' | 'shavings' | 'hedge' | 'paving' | 'asphalt' | 'iron';

/**
 * A thing that a block of the ground is, for the picture only: the block runs from `from` to `to` along the
 * outline, and `base` is the height of the ground at its foot.
 */
export interface Landmark {
  look: 'cone' | 'log' | 'anthill' | 'stone';
  from: number;
  to: number;
  base: number;
}

/** What a shop in the village sells: told by the wares in its window, never by a letter. The picture's business only. */
export type StreetGoods = 'yarn' | 'boots' | 'bread' | 'candy';

/**
 * One stretch of what stands behind the village street: a house's front, or a yard behind its fence. The
 * picture's business only: no rule of the game reads it, and nothing in it can be stood on or run into.
 */
export interface StreetPart {
  from: number;
  to: number;
  /** Near: its wall stands right behind him, and he walks at its foot. Far: on the other side of the crossing. */
  depth: 'near' | 'far';
  kind: 'house' | 'yard';
  /** How high its foot stands. Left out: on the ground that is there. */
  foot?: number;
  /** A house's wall: its colour, and which way its boards run. */
  wall?: string;
  boards?: 'upright' | 'lying';
  goods?: StreetGoods;
  /** Its shop windows, each from one side of the glass to the other. */
  windows?: { from: number; to: number }[];
  /** Its door, from one side of the opening to the other. Its step lies in front of it. */
  door?: { from: number; to: number };
  /** Where its downpipes stand, where its sign hangs low on the wall, and where a cellar window sits in its foot. */
  pipes?: number[];
  sign?: number;
  cellar?: number;
}

/** A raised optional path. Fixed waypoints keep all three helper hints steady even on moving platforms. */
export interface Challenge {
  id: string;
  from: number;
  to: number;
  above: number;
  reward: string;
  steps: Vec[];
  return: Vec;
  /** What makes the route playable, such as the lollipop light. */
  needs?: string;
  /** Unfinished local steps; reset on leaving, getting unstuck or reloading, until the reward commits. */
  pending?: string[];
  /** After the prize, guide back down the same landings before showing the return to the trail. */
  backtrack?: boolean;
}

export interface ChapterData {
  id: string;
  /** An optional melody toy. Consecutive repeat bumps are allowed; other wrong notes restart it. */
  song?: { notes: string[]; flag: string };
  /** A weight puzzle: the trial is optional; the helper can guide a deliberate return to the heavy mover. */
  counterweight?: { from: number; to: number; call: string; heavy: string; launch: string; trial: string };
  /** Once he chooses to leave a gift, a nearby return route can guide him back to its picture clue. */
  returnClue?: { from: number; to: number; gift: string; away: string; clue: string; root: Climb; door: Vec };
  /** A picture left at a landmark, revealed by a saved discovery rather than by moving the chase ghost. */
  thoughtClues?: { at: Vec; picture: NonNullable<GhostPerch['thought']>['picture']; after: string }[];
  /** The place it is dressed as. Left out: greybox. */
  place?: PlaceId;
  /**
   * For the picture only: how high over the land around it the chapter starts, in EL. The far scenery lies
   * that much lower from the first step: the finale begins on the summit that Berget climbs to. Left out,
   * the land around is at the height where the chapter starts. Nothing in the simulation reads it.
   */
  outlook?: number;
  /**
   * The hidden candy for the album (plan §4.3): off the trail, each of its own kind. Finding one sets the
   * flag `found:<kind>`, which the save keeps. One with `route` hangs at the end of the chapter's challenge
   * route (plan §4.7), and is reached that way only.
   */
  hidden?: {
    x: number; y: number; kind: string; route?: boolean; after?: string;
    /**
     * How it is reached, where a held jump from the ground under it is not the way: up some ledges, down in a
     * pocket, at the end of a swing. A few words for people; tests/sim/secrets.test.ts plays every one.
     */
    way?: string;
  }[];
  /** Cranberries to bounce on (plan §4.8, O7). */
  bouncers?: Bouncer[];
  /** Optional routes, entered by leaving the ordinary trail; their prizes never gate the story. */
  challenges?: Challenge[];
  /** For the picture: stretches of ground that are something else than the place's own: a deck, a boulder. */
  surfaces?: { from: number; to: number; kind: SurfaceKind }[];
  /**
   * For the picture only, and never read by the simulation: what a raised block of the ground is. A model
   * stands over the block (src/render/forest-kit.ts), with its top where the outline has the block's.
   */
  landmarks?: Landmark[];
  /** For the picture: a deck overhead, with the sun falling through between its boards. */
  roofs?: { from: number; to: number; y: number }[];
  /**
   * For the picture: how big he is drawn (plan §5.2). In the prologue he is a boy among small things until the
   * star shrinks him; in the final he grows back; in the epilogue he is a boy all through. The simulation
   * knows nothing of it: there he is always one Elof length.
   */
  size?: { scale: number; after?: string; until?: string };
  /** The final carving's windowsill, and the camera's post-credit shot. */
  epilogue?: { window: { x: number; y: number; z: number } };
  /** For the picture: Pappa's shelf of figures on the wall, with the first place in the row empty or filled. */
  shelf?: { x: number; y: number; filled?: boolean };
  /**
   * For the picture: things that stand about and are not used. One with `until` is gone when that flag is
   * set, and one with `after` is not there before its flag is.
   */
  decor?: { look: SpotLook; at: Vec; word?: string; until?: string; after?: string }[];
  /**
   * For the picture only: where the old pine stands, a little behind the path (plan §3.4). The wind has swept
   * it to the left; `flip` turns it round, swept to the right. The simulation knows nothing of it.
   */
  pine?: { x: number; flip?: boolean };
  /** For the picture: the house's wall behind the scene, with its windows. */
  house?: { from: number; to: number; windows: number[] };
  /**
   * For the picture: what stands behind the village street, from left to right, with no gap and nothing twice.
   * tests/unit/street.test.ts holds its rules.
   */
  street?: StreetPart[];
  /** For the picture: an open shop door leading into a room beside the street, at the path's height. */
  shop?: { door: number; to: number; floor: number };
  /** The ground as one open line, from left to right. Elof walks on its upper side. */
  ground: Vec[];
  spawn: Vec;
  /** Reaching this x sets the flag "goal". */
  goalX: number;
  /** A final story beat can finish before the safe walk to the chapter card. */
  goalNeeds?: string;
  /** The prologue's two freeze jokes and the hinge that tears the bag. */
  prologue?: import('./prologue').PrologueLayout;
  /**
   * Trail candy, in the order the path meets it (plan §4.3). Each point is where the candy floats: about
   * half an EL over the ground on a walk, and along the arc of the jump over a gap or up a step.
   */
  candy: Candy[];
  /**
   * Side candy (docs/level-design.md): candy off the trail, on an upper route or in a pocket. It is drawn as
   * hearts and lollipops, where the trail is karameller, so that "this is the way" and "this is extra" are
   * different words. It goes in the bag like any candy, is never needed, and none of the trail's rules of
   * order and spacing apply to it. Saved by its place in this list: add new ones at the end.
   */
  side?: Candy[];
  /** Ledges: thin floors over the path that he jumps up through. */
  ledges?: Ledge[];
  /** For the picture: lines strung over the path, which the rings under them hang from. */
  lines?: Line[];
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
  /** Kapitel 1's helper is the ghost. A story visit happens once regardless of the chosen help level. */
  helper?: { kind: 'ghost' | 'jay'; visit?: { id: string; from: number; to: number; at: Vec } };
  /** Where cones roll. */
  rollers?: Roller[];
  /**
   * Water: its surface, between two places. He never touches it: the glitter bubble catches him just above
   * it (plan §3.4, Myren). What crosses it is ground, a tussock, a ride or a thing on a rail.
   */
  water?: { from: number; to: number; y: number }[];
  /** The soft tussocks. */
  tussocks?: Tussock[];
  /** Where gusts sweep across. */
  gusts?: Gust[];
  /** A flag that is set once all of some others are: he has shared with everyone. */
  sets?: { flag: string; when: string[] }[];
  /**
   * A beat of the story that takes time: `flag` is set this many seconds after `after` was. With `hold` he
   * stands and watches until then: the stick and the buttons do nothing. Keep such a beat short.
   */
  later?: { flag: string; after: string; seconds: number; hold?: boolean }[];
  /**
   * For the picture: while `from` is set and `until` is not, someone looks at these places, one after the
   * other, each for the same share of the time: the ghost looks at the empty place on the shelf, and at the bag.
   */
  glance?: { from: string; until: string; seconds: number; at: { x: number; y: number; z: number }[] };
  /** For the picture: night falls and the northern lights flare when this flag is set. Null: it is night from the start. */
  night?: { after: string | null };
  /** For the picture: the mist rolls in when this flag is set, and he carries a light. */
  mist?: { after: string };
  /**
   * For the picture: someone small who waits at `at`, follows him once `after` is set, and stays at `home`
   * once `until` is set. The flags come from things he touches.
   */
  follower?: { at: Vec; after: string; until: string; home: Vec };
  /** What is said along the way. */
  beats?: Beat[];
  /** The rides. */
  rides?: Ride[];
  /**
   * For the picture only: stretches where something may happen far off in the scenery, a moose in the mist
   * or cranes overhead (content/life.ts). The camera coming into one starts it. The simulation never reads
   * this, so it cannot change the play.
   */
  life?: LifeStage[];
}

/** A stage for the far scenery's life: what comes, and where the camera is when it does. */
export interface LifeStage {
  kind: string;
  from: number;
  to: number;
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
  /** He asks the helper. Left out: no. */
  help?: boolean;
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
