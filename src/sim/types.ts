export interface Vec {
  x: number;
  y: number;
}

/** A big candy on the path: a checkpoint (plan §3.3, rule 4). */
export interface Checkpoint extends Vec {
  /**
   * It is there only once this flag is set, and can't be reached before: a trail that the story lays down
   * (the old trägubbe's, in Stormkvällen) has no big candy waiting before it is laid.
   */
  after?: string;
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
  look?: 'hose' | 'lace' | 'braid' | 'lichen' | 'root' | 'ladder';
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
  /** Its branch is already present at this height and rises as the named counterweight rolls to its last stop. */
  counterweight?: { mover: string; fromY: number };
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
  /**
   * Once in place and `after` is set, he drags it behind him on the lace wherever he goes, until `until`: Norrsken's
   * trägubbe, pulled out of the crack. It keeps a step behind him, lies on the rock, and is nothing to stand on.
   */
  tow?: { after: string; until: string };
  /** Where the middle of its bottom is at each stop, from home to where it belongs. */
  stops: Vec[];
  /** Knuffa: he pushes it from beside it. Dra: the lace pulls it by its red ring. */
  verb: 'push' | 'pull';
  /** A flag that has to be set before it can be moved. */
  needs?: string;
  /** It goes to its last stop by itself when this flag is set, and Använd never moves it: a helper's hands lift it. */
  on?: string;
  /** Seconds for one move; a helper may need time to bend, lift and set it down. */
  seconds?: number;
  /** A cast or a grip before the object starts moving, within seconds. */
  wait?: number;
  /** What it is, for the picture. Left out: a plain box. */
  look?: MoverLook;
  /** For Dra: where the ring sits, from the middle of its bottom. */
  ring?: Vec & { z?: number };
  /** An optional path: the story helper never sends him here from the main trail. */
  extra?: boolean;
  /** A toy/side puzzle: keep its final placement in saves, but do not steer the main hint trail into it. */
  optional?: boolean;
  /** The word on the button where Knuffa or Dra is too plain: a key of `sv.verbs`, as "Sparka" for a football. */
  word?: string;
  /**
   * A repeating platform, between its two stops. Its phase is local, never saved as puzzle progress. `wait`: it is a
   * hop away only for a moment, and he waits for that. `slam`: it rests at each stop a moment, then gathers speed
   * and bangs into the other, as a door does in the wind; otherwise it eases in and out.
   */
  cycle?: { seconds: number; phase?: number; wait?: boolean; slam?: boolean };
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
  /**
   * It is wherever this mover is now: the towed trägubbe's eyes are painted, and its candy given, where he has dragged
   * it to, not back at the crack it came out of. `at` is where it is before the mover is towed.
   */
  follows?: string;
  /** For the picture: whoever of the family is shown here sits, in a boat, say. */
  seated?: boolean;
  /** For the picture: whoever of the family is shown here stands on a paddle board and paddles. */
  paddles?: boolean;
  /**
   * For the picture: where whoever of the family is shown here stands, when it is not by the spot itself (Pappa up
   * on the bridge, called from the bank below). `z` is behind the play plane.
   */
  standsAt?: { x: number; y: number; z: number };
  /**
   * For the picture: once the spot is used (Pappa called), whoever of the family is shown here walks over and stands
   * here instead (Pappa to his seesaw's high end), and an owl flies over (Älven's, to where he climbs onto it). Without
   * motion, or in a game taken up after it, they are there.
   */
  goesTo?: { x: number; y: number; z: number };
  /**
   * The flag that sends them there, when it is not the spot's own: Pappa, given his candy at the party, comes over to
   * the carving once Elof has taken the knife.
   */
  goesWhen?: string;
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
  /**
   * For the picture: what stands there is drawn only once this flag is set, and rises into its place. Something
   * a scene brings out (Klonk's last star) must not lie there waiting before the story gets to it.
   */
  after?: string;
  /** The word on the button where the verb's own is too plain: a key of `sv.verbs`, as in "Ropa på Moa". */
  word?: string;
  /** Using it starts this ride. */
  ride?: string;
  /** Opens an authored interaction; pressing Använd alone never awards its flag. */
  story?: import('./story').StoryKind;
}

/** Who a bubble belongs to. Each has a name in `sv.who`. */
export type Speaker = 'mamma' | 'pappa' | 'moa' | 'bertil' | 'elof' | 'spoket'
  // Äventyr 2's grandparents: their faces, names and voices come with its pack (src/content/aventyr2/render.ts).
  | 'mormor' | 'morfar';

/**
 * Something said, in a bubble (plan §3.7): the game has no voices. It comes when Elof first passes `at`, or
 * when the flag `on` is set, and only once. While someone is still speaking it waits its turn, and its flag
 * (`beat:<id>`) comes when it is said for the picture. Story conditions wait for its completion receipt
 * (src/sim/sim.ts, `acknowledge`); movement stays available except during explicitly staged moments.
 *
 * Whose turn it is (docs/dialogue.md): a line that goes on from the one just read (`on: 'beat:…'`) comes first, so
 * that an answer follows what it answers; then the story's lines, the one that has waited longest first; and last
 * the passing remarks (`aside`), which are said at their moment or not at all.
 */
export interface Beat {
  id: string;
  at?: number;
  on?: string;
  /** Context that must exist even when Elof reaches the position first. */
  needs?: string;
  /** An explanation is no longer useful once this next action is complete. */
  until?: string;
  /** A local explanation waits until Elof is back at its help encounter. */
  within?: readonly [number, number];
  /** An essential explanation retains its receipt across checkpoints; presentation need not hold movement. */
  read?: boolean;
  /**
   * A passing remark: about something he sees as he goes by, and never needed to follow the story. It is said only at
   * its moment. If someone is still speaking then it waits, and is let go once he is `ASIDE_REACH` EL (or this many)
   * from where its moment came, when a staged moment takes the floor, or, where it answers a line, when it cannot come
   * straight after that line: so it is never said late, about something that has left the picture. Nothing may
   * wait for a remark's flag except a remark that answers it.
   */
  aside?: boolean | number;
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
  /**
   * Over this stretch it goes low, his feet at most `y` high, and climbs again after it (./ride-path.ts): the owl over
   * the shallows in Älven, so that what lies there is in reach of the stick.
   */
  skim?: { from: number; to: number; y: number };
  /**
   * He walks it on his own feet, along this ground, and is not carried through the air: where his feet are, point to
   * point along the way (the bed of the shallows where he wades). It takes the arc's place, and the stick does not
   * steer him. The picture draws him walking.
   */
  ground?: readonly Vec[];
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
  /** It stays where it stands while it waits, near as he comes, and does not rise out of reach: it is on something. */
  still?: boolean;
  /**
   * The mover it sits on while it waits (the leaf in Granskogen's eddy): it stands on that one's top, and rises with
   * it as he pulls, until its `until` lets it hop on.
   */
  on?: string;
  at: Vec;
  /** Takeoff distance, default 4 EL. Only close meetings may use a smaller value. */
  near?: number;
  /** Candy spilled on departure. Close meetings may instead offer Ta! and set it when grabbed. */
  catch?: string;
  /** It waits here until this flag is set; in a chase it rises out of reach if he approaches. */
  until?: string;
  /** A wordless picture at this story stop; progress makes the ghost's thoughts clearer (§3.3). */
  thought?: { picture: 'mountain' | 'pine-crack' | 'lonely-figure' | 'small-figure'; after?: string; until?: string };
  /** For the picture only: how far behind the play plane it stands here, on a table's edge, say. Left out: 0. */
  z?: number;
  /**
   * For the picture only: where it creeps away to when it leaves its last stop, a hole it disappears into, say,
   * instead of shrinking where it stands. Its z is behind the play plane.
   */
  into?: { x: number; y: number; z: number };
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
export type MoverLook = 'none' | 'owl-twig' | 'boulder' | 'riverLog' | 'plank' | 'block' | 'matchbox' | 'curl' | 'twig' | 'cone' | 'leaf' | 'log' | 'figure' | 'ants' | 'tussock' | 'stone'
  // Äventyr 2's, drawn by its pack (src/content/aventyr2/render.ts).
  // Flärken's round stone, which rolls off the planks and sinks.
  | 'fieldstone'
  | 'lid' | 'bark' | 'swing-sign' | 'jetty-plank' | 'football' | 'raft' | 'buoy' | 'hut-door' | 'barn-door';
export type LedgeLook = 'plank' | 'trestle' | 'leaf' | 'branch' | 'bark' | 'nest' | 'stone' | 'ladder' | 'shelf';
export type SpotLook = 'souvenir' | 'toothbrushes' | 'kit' | 'casement' | 'doll' | 'toyShelf' | 'mormorHome' | 'otter' | 'seesawLog' | 'bellCord' | 'blind' | 'homeEvening' | 'whiteWater' | 'floatBall' | 'deadLamp' | 'owlLanding' | 'aftermath' | 'ladybird' | 'berry' | 'crowberry' | 'jay' | 'ants' | 'sign' | 'seesaw' | 'lollipop' | 'crane' | 'cobble' | 'bag' | 'gold' | 'star' | 'shavings' | 'memory' | 'marble' | 'clip' | 'brick' | 'coin' | 'dew' | 'wisp' | 'cairn' | 'crack' | 'vittra-door' | 'keepsake' | 'rootHole'
  // Äventyr 2's, drawn by its pack (src/content/aventyr2/render.ts).
  | 'pumpkin' | 'tragubbe' | 'lillgubbe' | 'owl' | 'tap' | 'candle' | 'cocoa' | 'breakfast' | 'tiny-cap' | 'latch' | 'flashlight' | 'reed'
  | 'football' | 'lifebuoy' | 'flag' | 'lantern' | 'mormor' | 'morfar' | 'target';
export type RideLook = 'plane' | 'cap' | 'crane' | 'ants' | 'leaf' | 'none' | 'boot' | 'umbrella' | 'owl' | 'football' | 'raft';

/** The places of the story, each with its own light and layers (plan §5.4). The picture's business only. */
export type PlaceId = 'forest' | 'garden' | 'bog' | 'mountain' | 'dusk' | 'home' | 'village';

/** What a stretch of ground is made of, where it isn't the place's own ground. The picture's business only. */
/** What a gust's shelters are drawn as, in a storm: see Storm.shelters. */
export type Shelter = 'pots' | 'posts' | 'vents' | 'rocks';

export type SurfaceKind = 'roof' | 'wood' | 'earth' | 'stone' | 'shavings' | 'hedge' | 'paving' | 'asphalt' | 'iron' | 'turf' | 'sand' | 'moss' | 'wetRock';

/**
 * A thing that a block of the ground is, for the picture only: the block runs from `from` to `to` along the
 * outline, and `base` is the height of the ground at its foot.
 */
/** Things on the floor that he walks on, each a model of its own: the land goes on under them. */
export type LandmarkThing = 'barrel' | 'can' | 'playhouse' | 'slide' | 'picnic' | 'fence' | 'stairs' | 'woodpile' | 'skerry' | 'edging';

export interface Landmark {
  look: 'cone' | 'log' | 'anthill' | 'stone' | LandmarkThing;
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
  /** Rendered plaster among the timber fronts; no effect on collisions. */
  finish?: 'plaster';
  /** A low boundary and side birch leave the public village landmarks in view. */
  lowFence?: boolean;
  goods?: StreetGoods;
  /** Its shop windows, each from one side of the glass to the other. */
  windows?: { from: number; to: number }[];
  /** Its door, from one side of the opening to the other. Its step lies in front of it. */
  door?: { from: number; to: number };
  /** Where its downpipes stand, where its sign hangs low on the wall, and where a cellar window sits in its foot. */
  pipes?: number[];
  sign?: number;
  cellar?: number;
  /**
   * Its awnings, each from one end to the other: striped cloth from high on a near wall out over the line he
   * walks on. Last night's rain drips from the tips of its scalloped edge.
   */
  awnings?: { from: number; to: number }[];
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
  counterweight?: { from: number; to: number; call: string; heavy: string; launch: string; trial?: string };
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
  /** For the picture: clear the near trunks where people come down from a road or stand in a clearing. */
  treeGaps?: { from: number; to: number; back: number }[];
  /**
   * For the picture only, and never read by the simulation: what a raised block of the ground is. A model
   * stands over the block (src/render/forest-kit.ts), with its top where the outline has the block's.
   */
  landmarks?: Landmark[];
  /** For the picture: its water is a river, open towards the camera and behind the path, with no near shore. */
  river?: boolean;
  /** For the picture: a deck overhead, with the sun falling through between its boards. */
  roofs?: { from: number; to: number; y: number }[];
  /**
   * For the picture: how big he is drawn (plan §5.2). In the prologue he is a boy among small things until the
   * star shrinks him; in the final he grows back; in the epilogue he is a boy all through. The simulation
   * knows nothing of it: there he is always one Elof length.
   */
  size?: { scale: number; after?: string; until?: string };
  /** The final carving's windowsill, and the camera's post-credit shot. */
  /**
   * The evening's last picture: his first carving on the window sill. With `shelf`, where it stands once he has put it up on
   * Pappa's shelf (the flag `shelf:placed`), and where the last picture finds it then.
   */
  epilogue?: { window: { x: number; y: number; z: number }; shelf?: { x: number; y: number; z: number } };
  /** For the picture: Pappa's shelf of figures on the wall, with the first place in the row empty or filled. */
  shelf?: { x: number; y: number; filled?: boolean };
  /**
   * For the picture: things that stand about and are not used. One with `until` is gone when that flag is
   * set, and one with `after` is not there before its flag is.
   */
  decor?: { look: SpotLook; at: Vec; word?: string; until?: string; after?: string; z?: number; scale?: number; turn?: number }[];
  /**
   * For the picture only: where the old pine stands, a little behind the path (plan §3.4). The wind has swept
   * it to the left; `flip` turns it round, swept to the right. The simulation knows nothing of it.
   */
  pine?: { x: number; flip?: boolean };
  /** For the picture: the house's wall behind the scene, with its windows. */
  house?: {
    from: number; to: number; windows: number[];
    /**
     * The window the storm blows open, by its x (one of `windows`). The wall has a real opening there, with the
     * night beyond it, and the window's two halves are drawn by the chapter's `casement` look, so that they swing.
     */
    opens?: number;
  };
  /**
   * For the picture: what stands behind the village street, from left to right, with no gap and nothing twice.
   * tests/unit/street.test.ts holds its rules.
   */
  street?: StreetPart[];
  /** For the picture: where the street's lamp posts stand, on the far pavement across the crossing. */
  lampPosts?: number[];
  /** For the picture: an open shop door leading into a room beside the street, at the path's height. */
  shop?: { door: number; to: number; floor: number };
  /** The ground as one open line, from left to right. Elof walks on its upper side. */
  ground: Vec[];
  spawn: Vec;
  /** Reaching this x sets the flag "goal". */
  goalX: number;
  /** For the picture: the trail has run out before the goal, so no big candy stands there. */
  trailEnds?: boolean;
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
  checkpoints?: Checkpoint[];
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
  /** The opening and ending let Elof meet the ghost. Everywhere else it stays out of reach. */
  ghostMeet?: boolean;
  /** Kapitel 1's helper is the ghost. A story visit happens once regardless of the chosen help level. */
  helper?: { kind: 'ghost' | 'jay'; visit?: { id: string; from: number; to: number; at: Vec } };
  /** Where cones roll. */
  rollers?: Roller[];
  /**
   * Water: its surface, between two places. He never touches it: the glitter bubble catches him just above
   * it (plan §3.4, Myren). What crosses it is ground, a tussock, a ride or a thing on a rail.
   */
  /** `eddy`, for the picture only: the water turns round in a whirl there (Granskogen's virvel, ../render/eddy.ts). */
  /**
   * `floats`: the id of a thing on a rail that floats on this water and is lifted as it fills (Stormgården's lid). The
   * water stands under it as ./water-level.ts has it: low, with the thing awash, until the water comes, and at `y` once
   * the thing is in place.
   */
  water?: { from: number; to: number; y: number; eddy?: boolean; floats?: string }[];
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
  later?: { flag: string; after: string; seconds: number; hold?: boolean; until?: string; within?: readonly [number, number] }[];
  /**
   * For the picture: while `from` is set and `until` is not, someone looks at these places, one after the
   * other, each for the same share of the time: the ghost looks at the empty place on the shelf, and at the bag.
   */
  glance?: { from: string; until: string; seconds: number; at: { x: number; y: number; z: number }[] };
  /** For the picture: night falls and the northern lights flare when this flag is set. Null: it is night from the start. */
  night?: { after: string | null };
  /** For the picture: the mist rolls in when this flag is set, and he carries a light. `lamp` glows behind him in it. */
  mist?: { after: string; lamp?: Vec };
  /**
   * For the picture: someone small who waits at `at`, follows him once `after` is set, and stays at `home`
   * once `until` is set. The flags come from things he touches.
   */
  follower?: { at: Vec; after: string; until: string; home: Vec };
  /** What is said along the way. */
  beats?: Beat[];
  /** Äventyr 2's weather, for the picture. */
  storm?: Storm;
  /** The ghost is Klonk, named and his friend from the first step: it carries no stolen bag (Äventyr 2). */
  named?: boolean;
  /** Who answers from afar in the chapter's coda, where main.ts's own table has no word for it. */
  coda?: 'mamma' | 'pappa' | 'moa' | 'bertil' | 'all';
  /**
   * The story's short authored moments, in the order they are tried (src/sim/scene.ts): each may hold him
   * while it plays, set the story's flags and say lines, and carries its staging for the picture.
   */
  scenes?: import('./scene').SceneDef[];
  /**
   * For the picture only: things that stand about in a room, behind the play plane: a table, a chair. Where
   * an actor of a scene sits or stands at them is the scene's business.
   */
  furniture?: { look: 'table' | 'chair' | 'stool'; at: Vec; z: number; face?: number; cloth?: string }[];
  /**
   * For the picture only: from this x the chapter is out of doors: the house's wall gives way to the
   * garden's far scenery. Indoors before it.
   */
  outdoors?: number;
  /** The rides. */
  rides?: Ride[];
  /**
   * For the picture only: stretches where something may happen far off in the scenery, a moose in the mist
   * or cranes overhead (content/life.ts). The camera coming into one starts it. The simulation never reads
   * this, so it cannot change the play.
   */
  life?: LifeStage[];
}

/**
 * A figure blown across the dark sky in a flash (Äventyr 2's storm): from `from` to `to` in `seconds`, eased, tumbling
 * over a rise. The picture's business only, as all of `Storm` is.
 */
export interface Flyby {
  /** A wooden figure walking on the path between these ground heights, never airborne. */
  walk?: boolean;
  on: string;
  from: Vec;
  to: Vec;
  seconds: number;
  who: 'lillgubbe' | 'tragubbe';
  /** How far behind the play plane it flies at its start, and at its end. Left out: 4 behind, all the way. */
  z?: number;
  toZ?: number;
  /** How big it is drawn. Left out: 1.2. */
  size?: number;
  /** How high its tumble rises over the straight line between its ends. Left out: 2.2 in the air. */
  rise?: number;
  /**
   * A flight meant to be watched, not glimpsed: the figure as it is, pale wood in a soft glow, and the lightning
   * flashes again at these seconds into it. Left out: a dark shape, lit by one flash.
   */
  lit?: readonly number[];
}

/**
 * Äventyr 2's weather and what is seen in its flashes (docs/aventyr-2.md). The picture's business only: the
 * simulation never reads it. Drawn by the adventure's own pack.
 */
export interface Storm {
  /** A boat that is rowed in once `after` is set, from far out to its place, carrying whoever the spot `spot` shows. */
  boat?: { spot: string; after: string; y: number; from: { x: number; z: number }; to: { x: number; z: number } };
  /** How hard it rains, from 0 to 1. Left out: no rain. */
  rain?: number;
  /** About how many seconds pass between two flashes of lightning. Left out: none. */
  lightning?: number;
  /** Once this flag is set the storm has passed: no rain, no flashes, and the sky clears. */
  calm?: string;
  /** A flash when the flag is set, and a figure blown across the dark sky, from one place to another. */
  flybys?: Flyby[];
  /**
   * Someone seen far off in a flash once `on` is set, until `until` is: the little one caught on a stone where the river
   * begins, seen from the top of the diving tower. Drawn as the carving itself, pale, on its stone in the water, with a
   * little light of its own so that it reads in the dark; `size` is how much bigger than its own it is drawn, for the
   * distance. `z` is behind the play plane.
   */
  sightings?: { on: string; until: string; at: Vec; z: number; who: 'lillgubbe' | 'tragubbe'; size?: number }[];
  /**
   * The flag of a ledge that is Klonk himself, frozen stiff as a plank in a grown-up's lamp (the Toy Story rule):
   * while it is set and Elof has not crossed, Klonk lies across, and the ghost is not drawn standing anywhere else.
   */
  frozen?: string;
  /**
   * The flag on which the frozen one wakes: the grown-up looks away. Pappa's lamp leaves him, and he is himself again
   * where the ghost waits. Left out: once Elof is over.
   */
  wakes?: string;
  /**
   * The chapter's ledges that are always there are drawn as a goal's white frame bar: the crossbar he walks along,
   * where Äventyr 1 would have drawn a trestle.
   */
  bars?: 'goal';
  /**
   * A scarf held down to him from above for a ride (src/render/scarf.ts): Pappa's from the bridge. `held`: the spot whose
   * call lowers it, whose one holds it in both hands and walks along with him while it carries him. `from`: where it is
   * held from, its height the hands'; `z`, how far behind the path they hold it out. `colour`: its wool. `lamp`: where
   * the holder sets their flashlight down meanwhile, still lighting him. Picture only.
   */
  ropes?: { ride: string; from: Vec; z?: number; colour?: string; held?: string; lamp?: { x: number; y: number; z: number } }[];
  /** What falls at the chapter's drips, where it is not water: cones shaken from the spruces. */
  drips?: 'cone';
  /**
   * What the gusts' shelters are, where they are not boulders: the garden's upturned flower pots, the jetty's posts,
   * a barn roof's ventilation hoods. One for all the gusts, or one for each gust in order ('stones' keeps a gust's
   * boulders).
   */
  shelters?: Shelter | (Shelter | 'stones')[];
  /**
   * Open water behind the play plane, for the picture only: a lake or a narrow seen past the path's end, from `near`
   * (default −4) back to the far shore.
   */
  lakes?: { from: number; to: number; y: number; near?: number }[];
  /** What the chapter's rollers are, where they are not cones: footballs bowled along by the wind. */
  rollers?: 'football';
  /**
   * What the chapter's bouncers are, where they are not cranberries: the garden's trampoline, an awning's flap, a
   * volleyball net torn loose and sagging between its posts.
   */
  bouncers?: 'trampoline' | 'awning' | 'net';
  /**
   * For the picture: where cream foam drifts on the water, and how fast, in EL a second.
   */
  foam?: { from: number; to: number; y: number; speed: number; dense?: number }[];
  /**
   * Buildings and big things standing behind the play plane, built in code by the adventure's pack: picture only,
   * never ground. Sizes are in EL (one Elof length, 15 cm), so a real house towers over him. `lit`: its windows glow
   * once that flag is set (or from the start with an empty string).
   */
  buildings?: {
    kind: 'jettyArm' | 'pole' | 'store' | 'trestleTable' | 'pitch' | 'chess' | 'sunboard' | 'villa' | 'barn' | 'goal' | 'floodlight' | 'stand' | 'clubhouse' | 'tower' | 'hut' | 'birch' | 'car' | 'kota'
      | 'church' | 'bridge' | 'woodshed' | 'rowboat' | 'swings' | 'slide' | 'picnic' | 'volleyball' | 'lodge' | 'mailbox' | 'cliff' | 'spruce'
      | 'gardenset' | 'outlet';
    x: number; z: number; y?: number; width?: number; height?: number; flip?: boolean; lit?: string; model?: string; size?: number;
    /**
     * A pitch's lines (../content/aventyr2/buildings.ts): its halfway line and circle, a goal's box, how far it runs on
     * towards the camera, and its flooded places (`wet`, in the chapter's x and z), where its turf is cut away.
     */
    marks?: { halfway: number; box?: { x: number; long: number }; front?: number; wet?: { from: number; to: number; back: number }[] };
    /** A hut's logs tarred black, with white trim. */
    tar?: boolean;
    /**
     * A hut's door slides on a rail along its front, out to the right, the rail rising this far over the door's width:
     * the door is a mover (look 'hut-door'), and the hut has its doorway, the rail, and its window on the left.
     */
    slider?: { top: number; rise: number };
    /** Turned about the upright, in quarter turns: a net or a table seen from its end. */
    turn?: number;
    /** An outlet's near bank begins this far along it, past the end of a jetty that runs out into its mouth. */
    opens?: number;
    /** A goal whose top is level from its crossbar back, a box he can walk along the top of (Olympia's small goal). */
    level?: boolean;
  }[];
  /**
   * Warm windows of lit candles and lanterns, which glow through the rain. `candle`: the candle itself is drawn too, this
   * many EL of wax standing on the sill under its flame at `at` (src/render/window-candle.ts).
   */
  glows?: { at: Vec; z?: number; size?: number; after?: string; candle?: number }[];
  /** A lamp shining on him from somewhere (Moa from a window), while he is between `within`'s two x. */
  beams?: { at: Vec; z: number; within: [number, number] }[];
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
  /**
   * Someone is still speaking on the page, or a line was said earlier in this frame: what is to be said next waits
   * its turn, and so do a held scene and a freeze joke (src/sim/scene.ts). A listening page must also call
   * Sim.acknowledge when each line finishes. Left out: nobody listens (the robot and tests with no page),
   * and lines are said and completed as their moments come.
   */
  talking?: boolean;
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
