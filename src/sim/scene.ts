import { STEP } from './constants';
import type { Beat, PlayerState, Speaker, Vec } from './types';

/**
 * Scenes: the story's short authored moments (docs/narrative-audit.md). A scene has a clock of its own. While
 * it plays it may hold Elof (he watches: the stick and the buttons do nothing), set the story's flags at its
 * moments, and say lines. Its clock is the simulation's, so a pause, a hidden page or a lost picture holds
 * every actor in it together, and the same scene plays the same on every device.
 *
 * A finished scene is remembered as `scene:<id>`. An interrupted scene normally replays from its start;
 * one marked `resumeReading` keeps acknowledged line receipts and resumes their last tableau. Its flags
 * stay set. Acting and shots are the picture's business (`stage`): the simulation never reads them.
 */
export interface SceneDef {
  /** A stable name. Finishing the scene sets `scene:<id>`. */
  id: string;
  /** It begins when this flag is set. Left out, with `at` left out too: as soon as it may. */
  on?: string;
  /** It begins when Elof first passes this x. */
  at?: number;
  /** It waits for this flag as well. */
  needs?: string;
  /**
   * And for Elof to be at least this far along: a scene staged at a place waits for him there, so a game taken
   * up at an earlier big candy never plays it where he is not.
   */
  from?: number;
  /**
   * And for Elof to be short of this x: a scene staged at a place he has already gone past (a game taken up beyond
   * it, at the next checkpoint) has been seen, and is never played there.
   */
  before?: number;
  /**
   * A safe mark for replaying this unfinished scene after recovery. A checkpoint must not put Elof
   * away from its camera and the hands he needs next once he has chosen to begin this moment.
   */
  resumeAt?: Vec;
  /** It is never played once this flag is set: the story has gone past it, in an older save too. */
  until?: string;
  /**
   * It plays only when its `on` flag is set while he plays: a game taken up with that flag already set has seen it
   * (Myren's lysklubba, held up as he takes it).
   */
  live?: boolean;
  /** How long it lasts, in seconds of game time. */
  seconds: number;
  /**
   * He stands and watches it: the stick and the buttons do nothing. A held scene begins only when he stands on
   * his own feet, so he is never stopped in the air or on a hose, and only when nothing is being said: it takes
   * the floor once the words before it are finished, as `quiet` does. Keep uninterrupted acting short; essential
   * lines provide reading stops between the actions (the chapter tests check this pacing).
   */
  hold?: boolean;
  /** Resume this conversation from acknowledged line receipts, preserving its remaining actions and cues. */
  resumeReading?: boolean;
  /**
   * It waits until nothing is being said. Elof can keep moving while it waits unless `hold` is also set.
   * A held scene always waits for quiet.
   */
  quiet?: boolean;
  /**
   * World beat IDs belonging to this reveal, in spoken order. Its clock waits while one is queued or spoken,
   * independently of player movement; a ride keeps going while its scenery remains visible for the words.
   */
  dialogue?: readonly string[];
  /** Flags the scene sets at its moments, in seconds from its start: the story's own steps. */
  cues?: readonly { at: number; flag: string }[];
  /**
   * What is said in it, and when: each is a bubble, with the speaker's wordless sound (plan §3.7). A line is a
   * beat with the id `<scene id>:<index>`, or an explicit stable `id` retained from an older beat. Each is a
   * reading stop: the scene's clock waits at its next cue, line, and end, so it never talks over itself.
   */
  lines?: readonly { at: number; who: Speaker; line: string; id?: string }[];
  /** Wordless sounds follow the same clock as the acting, including reading pauses. */
  sounds?: readonly { at: number; sound: StorySound }[];
  /** Music and ambience soften during this span, leaving room for the story's small sounds. */
  soundQuiet?: readonly [start: number, end: number];
  /** For the picture only: who does what, and where the camera looks. */
  stage?: SceneStage;
  /**
   * Played by something else than the director, and done when this flag is set: the prologue's two freeze
   * jokes (./prologue.ts) keep their own clock, and have only their staging here.
   */
  by?: { done: string };
}

/** Who acts in a scene. Elof is the player: in a held scene he acts too. */
export type Actor = 'pappa' | 'mamma' | 'moa' | 'bertil' | 'ghost' | 'elof';
export type StorySound = 'bird' | 'blink' | 'paper' | 'taste' | 'swell' | 'poff' | 'breath' | 'wind' | 'pour' | 'clatter';

/**
 * What an actor does from a moment on. Each is a movement made in code on the body's joints (src/render/acting.ts),
 * the same on the rehearsal figures and on the models from Blender.
 */
export type Act =
  // the family, and Elof where it suits him
  | 'stand' | 'walk' | 'sit' | 'carve' | 'draw' | 'sip' | 'sneak' | 'kneel' | 'crouch' | 'gasp' | 'point' | 'shine'
  | 'wave' | 'cheer' | 'offer' | 'reach' | 'lift' | 'show' | 'blow' | 'shrug' | 'hug' | 'nod' | 'look'
  | 'startle' | 'stomp' | 'hands' | 'watch' | 'paint' | 'eat'
  // the family's own: putting on the raincoat and the boots (src/render/rain-gear.ts), standing
  | 'dress'
  // a little shy, holding what was shown (Moa's drawing in the prologue, src/render/drawing-hold.ts)
  | 'shy'
  // the ghost: a wooden toy that has come alive, and never bends
  | 'carved' | 'wake' | 'waddle' | 'grab' | 'run' | 'freeze' | 'tilt' | 'hop' | 'peek';

/** A point in the picture's space: along the course, up, and towards the camera (0 is the play plane). */
export interface Point {
  x: number;
  y: number;
  z?: number;
}

/** One moment of an actor's part: where they go, which way they face, and what they do from then on. */
export interface ActorKey {
  /** Seconds from the scene's start. */
  at: number;
  /** Where they stand: the middle of their feet. Left out: where they were. */
  x?: number;
  y?: number;
  z?: number;
  /**
   * Picture only, in place of `x`: this far along from where Elof stands, wherever he began the scene. Berget's lift
   * brings the ghost to his hands, however near or far from it he pressed Lyft.
   */
  byElof?: number;
  /**
   * Which way they face, in turns about the vertical: 0 along the course (to the right), 0.25 towards the
   * camera, 0.5 back along the course, 0.75 away from the camera. Left out: as they faced.
   */
  face?: number;
  /** How long getting there takes, in seconds. Left out: 0.6. */
  move?: number;
  /** What they do from this moment. Left out: what they did. */
  act?: Act;
  /** What the act is aimed at: what they look at, point to, reach for or offer to. */
  aim?: Point;
  /**
   * Picture only: where a torch in their hand shines, when not where they look (Pappa's beam out through the window
   * while he reaches up to pull it to). A later key with an `aim` and no `beam` has the beam follow the aim again.
   */
  beam?: Point;
  /**
   * Picture only, after the scene: the actor walks along behind Elof, this far behind him, and stops where
   * he stops. Null: they stay where the scene left them. Left out: as before.
   */
  follow?: number | null;
  /** What they hold in the right hand from this moment, and in the left. Null: nothing. Left out: as before. */
  holds?: Thing | null;
  holdsLeft?: Thing | null;
  /** The ghost only: how much of the block of wood is still round it as Pappa carves, from 1 to 0. */
  rough?: number;
  /**
   * Picture only: true, they have gone in out of the picture (through a door behind a house, say) and are not drawn
   * from this key on, nor after the scene; false, they are back. Left out: as before.
   */
  away?: boolean;
}

/** Things the family hold in a scene. */
export type Thing = 'knife' | 'brush' | 'mug' | 'crayon' | 'drawing' | 'lamp-mamma' | 'lamp-pappa' | 'lamp-moa' | 'lamp-bertil';

/** One moment of the camera: what it looks at, and how much of the place it shows. */
export interface ShotKey {
  at: number;
  /** The middle of the picture, on the play plane. */
  x: number;
  y: number;
  /** How tall the picture is, in EL. */
  height: number;
  /** The least the picture shows across: a phone held upright shows more height instead. */
  width?: number;
  /** The camera's own height over `y`: below zero it looks up, as Elof does at a giant. */
  eye?: number;
  /**
   * For something further back than the play plane (the two on their stone far out in Billsta's narrow): how far behind
   * it the middle of the picture is, and `height` is measured there. Left out: 0, the play plane.
   */
  z?: number;
  /** How long the camera takes to get here, in seconds. Left out: 1. */
  move?: number;
}

/** Something that happens in the air: glitter, a stream of magic, the POFF, shavings, a bird at the window. */
export interface FxKey {
  at: number;
  kind: 'sparkle' | 'stream' | 'poff' | 'shavings' | 'glow' | 'jay' | 'wind';
  /** Where it is; a stream flows from here to `to`. */
  from: Point;
  to?: Point;
  /** How long it lasts. */
  seconds: number;
}

/** A scene's staging: the picture's business only. */
export interface SceneStage {
  actors?: Partial<Record<Actor, readonly ActorKey[]>>;
  shots?: readonly ShotKey[];
  fx?: readonly FxKey[];
  /** Thin dark bars above and below while it plays: the game is telling, the hands rest. Default: a held scene has them. */
  bars?: boolean;
  /** How Elof is drawn while it plays: lifted off where he stands, acting, and how big. Picture only. */
  elof?: readonly ElofKey[];
  /**
   * Words over the picture, never needed to follow it: a card that says the time of day as a chapter opens
   * (Firewatch's day cards), or the game's own name. `text` is a key of `sv.scene`.
   */
  words?: readonly { at: number; seconds: number; kind: 'caption' | 'title'; text: string }[];
  /** The picture fades from or to black: how dark it is from each moment, eased over `move` seconds. */
  fade?: readonly { at: number; to: number; move?: number }[];
  /**
   * Elof holds a star while he shows it and eats it: the shrinking, in either adventure. 'gold': the golden geléhallon
   * instead, that makes him big again (Stormens öga).
   */
  star?: boolean | 'gold';
}

/** One moment of Elof's part in a held scene. His place in the simulation never changes with it. */
export interface ElofKey {
  at: number;
  /** Where he is drawn, apart from where he stands: on a hand, say. {0,0} sets him down again. */
  lift?: Point;
  /**
   * In place of `lift`: a place in the room he is drawn going to, wherever he stood when the scene began (the stool
   * under Pappa's shelf in Godiskalaset). `lift` {0,0} brings him back to where he stands.
   */
  to?: Point;
  /**
   * He stands on this one's right hand, and goes where the hand goes: Pappa's palm, wherever the run left him.
   * Null: he steps back down to where he stands.
   */
  rides?: Exclude<Actor, 'ghost' | 'elof'> | null;
  /** How long getting there takes. Left out: 0.6. */
  move?: number;
  /** What he does. Null: as in play. Left out: as before. */
  act?: Act | null;
  aim?: Point;
  /** In place of `aim`: a point this far from his feet, wherever he stands (what an actor's `byElof` brings him). */
  aimByElof?: Point;
  /** Which way he faces: as an actor's `face`. Left out: as in play. */
  face?: number;
  /** How big he is drawn, from this moment, while the scene plays: 3 is a boy among small things. */
  size?: number;
}

/** The scene playing now, for the picture: which one, and how far into it. */
export interface SceneFrame {
  id: string;
  seconds: number;
  /** This reveal's owned world line is queued or unfinished; hold its picture clock, not the rest of the world. */
  waiting?: boolean;
}

function sceneLineId(scene: SceneDef, index: number): string {
  return scene.lines?.[index]?.id ?? `${scene.id}:${index}`;
}

/** The bubbles of a chapter's scenes, as beats: what the page shows and the sound says. */
export function sceneBeats(scenes: readonly SceneDef[] | undefined): Beat[] {
  return (scenes ?? []).flatMap((scene) => (scene.lines ?? []).map((line, i) => ({ id: sceneLineId(scene, i), who: line.who, line: line.line })));
}

/**
 * Whether one of a chapter's scenes ends it: its goal waits for a flag a scene sets (the prologue's title). The
 * scene is then the chapter's last moment, and nothing else is played after the goal.
 */
export function endsInScene(chapter: { goalNeeds?: string; scenes?: readonly SceneDef[] }): boolean {
  return chapter.goalNeeds !== undefined && (chapter.scenes ?? []).some((scene) => scene.cues?.some((cue) => cue.flag === chapter.goalNeeds));
}

/** The flag a finished scene leaves. */
export const sceneDone = (id: string) => `scene:${id}`;

/** An unfinished reveal's saved cues must not stand in for the words that accompanied them. */
function unheardReveal(scene: SceneDef, flags: Pick<ReadonlySet<string>, 'has'>): boolean {
  return !!scene.dialogue?.some((id) => !flags.has(`beat:${id}`)) && !!scene.cues?.some((cue) => flags.has(cue.flag));
}

/** Whether a scene still has something to tell: not finished, and the story not gone past it. */
export function sceneWaits(scene: SceneDef, flags: Pick<ReadonlySet<string>, 'has'>): boolean {
  // Some reveals end an action with their own until cue (the stone's plop). If its words are still unread,
  // that saved cue must not skip the picture on recovery; an explicit completed scene remains completed.
  const unreadEnding = unheardReveal(scene, flags) && scene.cues?.some((cue) => cue.flag === scene.until);
  return !flags.has(scene.by?.done ?? sceneDone(scene.id)) && (scene.until === undefined || !flags.has(scene.until) || !!unreadEnding);
}

/** Keep an interrupted, triggered tableau in its authored place when a checkpoint lies elsewhere. */
export function sceneResumeAt(scenes: readonly SceneDef[] | undefined, flags: Pick<ReadonlySet<string>, 'has'>, checkpoint: Vec): Vec {
  const scene = scenes?.find((candidate) => candidate.resumeAt && candidate.on && flags.has(candidate.on)
    && (candidate.needs === undefined || flags.has(candidate.needs)) && sceneWaits(candidate, flags));
  return scene?.resumeAt ?? checkpoint;
}

/**
 * Plays a chapter's scenes, one at a time, in the simulation's steps. They are tried in the order the chapter
 * lists them; a held scene that is due waits for Elof to stand, and those after it wait with it.
 */
export class SceneDirector {
  private playing: { def: SceneDef; seconds: number; cue: number; line: number } | null = null;
  /** A held scene is due and waits for quiet: he stands and listens. */
  private listening = false;
  private dialogueWaiting = false;
  /** Where the next scene of this name begins, when it is not at its start. */
  private opening: { id: string; seconds: number } | null = null;

  constructor(private readonly scenes: readonly SceneDef[], spawn: Vec, flags: Set<string>) {
    // A scene that waits for a place he starts beyond has been seen: the game was taken up after it.
    for (const scene of scenes) if (scene.at !== undefined && scene.on === undefined && scene.at < spawn.x - 0.5 && !unheardReveal(scene, flags)) flags.add(sceneDone(scene.id));
    for (const scene of scenes) if (scene.before !== undefined && spawn.x > scene.before) flags.add(sceneDone(scene.id));
    for (const scene of scenes) if (scene.live && scene.on !== undefined && flags.has(scene.on)) flags.add(sceneDone(scene.id));
    // An older save can remember the later action without the scene added around it. Its until flag
    // already means the story has passed this scene; retain that completion for presentation too.
    for (const scene of scenes) if (scene.until && flags.has(scene.until) && !sceneWaits(scene, flags)) flags.add(sceneDone(scene.id));
  }

  /** The scene playing now, or null. */
  get frame(): SceneFrame | null {
    return this.playing ? { id: this.playing.def.id, seconds: this.playing.seconds,
      ...(this.dialogueWaiting ? { waiting: true } : {}) } : null;
  }

  /** Whether he watches now, or listens before a scene. */
  get holding(): boolean {
    return this.listening || this.playing?.def.hold === true;
  }

  /**
   * One step. `said` is where the beats told go, as the simulation's own; `talking`, whether a line is still being
   * read, or waits to be said; `listening`, whether a page hears them, so that its lines come one at a time.
   */
  tick(player: PlayerState, flags: Set<string>, said: string[], talking = false, listening = false,
    conditions: Pick<ReadonlySet<string>, 'has'> = flags, waiting?: Pick<ReadonlySet<string>, 'has'>): void {
    if (!this.playing) this.begin(player, flags, talking, conditions);
    // A scene he is free in still plays, and the next one due is one he stands for: he waits for it where he is.
    else if (!this.playing.def.hold) this.listening = this.standsNext(player, conditions);
    this.dialogueWaiting = false;
    const playing = this.playing;
    if (!playing) return;
    this.dialogueWaiting = (playing.def.dialogue ?? []).some((id) => waiting?.has(id)
      || (flags.has(`beat:${id}`) && !conditions.has(`beat:${id}`)));
    if (this.dialogueWaiting) return;
    const lines = playing.def.lines ?? [];
    // Story cues, another line and the ending wait for the current words, however long they take.
    // Acting between cues can continue; the rendering supplies subtle life during a held reading stop.
    const cues = playing.def.cues ?? [];
    if (talking && lines.length > 0) {
      const next = Math.min(lines[playing.line]?.at ?? playing.def.seconds,
        cues[playing.cue]?.at ?? playing.def.seconds);
      if (playing.seconds + STEP * 1.5 >= next) return;
    }
    playing.seconds += STEP;
    // Half a step early, so that a moment on a step's edge is never a step late at any frame rate.
    const now = playing.seconds + STEP / 2;
    for (; playing.cue < cues.length && cues[playing.cue]!.at <= now; playing.cue++) flags.add(cues[playing.cue]!.flag);
    let spoke = false;
    for (; playing.line < lines.length && lines[playing.line]!.at <= now && !(spoke && listening); playing.line++) {
      const id = sceneLineId(playing.def, playing.line);
      if (playing.def.resumeReading && conditions.has(`beat:${id}`)) continue;
      flags.add(`beat:${id}`);
      said.push(id);
      spoke = true;
    }
    // Heard, a line is read before the next, and before the scene ends.
    if (now < playing.def.seconds || (spoke && listening)) return;
    // Whatever was left is told at its end.
    for (; playing.cue < cues.length; playing.cue++) flags.add(cues[playing.cue]!.flag);
    flags.add(sceneDone(playing.def.id));
    this.playing = null;
  }

  /**
   * The scene of this name begins this far in when it is next due: the picture before it was already its first
   * shot (the title, docs/ux-audit/first-minutes.md rows 4 and 16), so it goes on from there, with no fade from black.
   * What it would have set or said before that moment is set and said at once.
   */
  openAt(id: string, seconds: number): void {
    this.opening = { id, seconds };
  }

  /** "Jag har fastnat", or a story panel that takes over: the scene is let go, and plays again when due. */
  cancel(): void {
    this.playing = null;
    this.listening = false;
    this.dialogueWaiting = false;
  }

  /**
   * Whether the next scene due, once the one playing is over, is one he stands and watches. It is staged where he
   * started it (the latch he has just hooked, the cup he has just taken): free until the scene before it had played
   * out, he was somewhere else in the room when it began. Read as `begin` reads the list, and changing nothing.
   */
  private standsNext(player: PlayerState, conditions: Pick<ReadonlySet<string>, 'has'>): boolean {
    for (const scene of this.scenes) {
      if (scene === this.playing?.def || scene.by || !sceneWaits(scene, conditions)) continue;
      if (scene.needs !== undefined && !conditions.has(scene.needs)) continue;
      const due = scene.on !== undefined ? conditions.has(scene.on) : scene.at === undefined || player.x >= scene.at;
      if (!due) continue;
      if (scene.from !== undefined && player.x < scene.from) return false;
      if (scene.before !== undefined && player.x > scene.before) continue;
      return scene.hold === true && player.mode === 'free' && player.grounded;
    }
    return false;
  }

  private begin(player: PlayerState, flags: Set<string>, talking: boolean, conditions: Pick<ReadonlySet<string>, 'has'>): void {
    this.listening = false;
    for (const scene of this.scenes) {
      if (scene.by || !sceneWaits(scene, conditions)) continue;
      if (scene.needs !== undefined && !conditions.has(scene.needs)) continue;
      const due = scene.on !== undefined ? conditions.has(scene.on) : scene.at === undefined || player.x >= scene.at;
      if (!due) continue;
      // Due, but staged where he is not yet: it waits for him, and the scenes after it wait with it.
      if (scene.from !== undefined && player.x < scene.from) return;
      // Staged where he has already gone past: it has been seen.
      if (scene.before !== undefined && player.x > scene.before) {
        flags.add(sceneDone(scene.id));
        continue;
      }
      // A held scene waits for him to stand, and the scenes after it wait with it: the story keeps its order.
      if (scene.hold && !(player.mode === 'free' && player.grounded)) return;
      // Waiting for quiet does not itself hold the player. Only the authored physical scene reserves his hands.
      if ((scene.quiet || scene.hold) && talking) {
        this.listening = scene.hold === true;
        return;
      }
      const opened = this.opening?.id === scene.id;
      let from = opened ? Math.min(this.opening!.seconds, scene.seconds) : 0, line = 0;
      if (scene.resumeReading && !opened) {
        // Saves contain acknowledged receipts only. Keep a new introduction before any older, named receipts;
        // tick skips those known later lines when reached. Reconstruct the last acknowledged tableau, then
        // play every action and cue between it and the next unread line (or the scene's ending).
        while (line < (scene.lines?.length ?? 0) && conditions.has(`beat:${sceneLineId(scene, line)}`)) line++;
        if (line > 0) from = scene.lines![line - 1]!.at;
      } else {
        // Other scenes, and an explicit title opening, replay from their chosen beginning after interruption.
        for (let i = 0; i < (scene.lines?.length ?? 0); i++) flags.delete(`beat:${sceneLineId(scene, i)}`);
      }
      this.opening = null;
      this.playing = { def: scene, seconds: from, cue: 0, line };
      return;
    }
  }
}
