import { STEP } from './constants';
import type { Beat, PlayerState, Speaker, Vec } from './types';

/**
 * Scenes: the story's short authored moments (docs/narrative-audit.md). A scene has a clock of its own. While
 * it plays it may hold Elof (he watches: the stick and the buttons do nothing), set the story's flags at its
 * moments, and say lines. Its clock is the simulation's, so a pause, a hidden page or a lost picture holds
 * every actor in it together, and the same scene plays the same on every device.
 *
 * Only a finished scene is remembered, as `scene:<id>`, and the save keeps that. A scene that a reload or
 * "Jag har fastnat" interrupted plays again from its start, with its lines; the flags it had already set stay
 * set. What a scene looks like, its acting and its shots, is the picture's business (`stage`): the simulation
 * never reads it.
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
   * A safe mark for replaying this unfinished scene after recovery. A checkpoint must not put Elof
   * away from its camera and the hands he needs next once he has chosen to begin this moment.
   */
  resumeAt?: Vec;
  /** It is never played once this flag is set: the story has gone past it, in an older save too. */
  until?: string;
  /** How long it lasts, in seconds of game time. */
  seconds: number;
  /**
   * He stands and watches it: the stick and the buttons do nothing. A held scene begins only when he stands on
   * his own feet, so he is never stopped in the air or on a hose. Keep uninterrupted acting short; essential
   * lines provide reading stops between the actions (the chapter tests check this pacing).
   */
  hold?: boolean;
  /**
   * It waits until nothing is being said, and he stands and listens meanwhile: the words before it are let
   * finish, for `QUIET_WAIT` seconds at most.
   */
  quiet?: boolean;
  /** Flags the scene sets at its moments, in seconds from its start: the story's own steps. */
  cues?: readonly { at: number; flag: string }[];
  /**
   * What is said in it, and when: each is a bubble, with the speaker's wordless sound (plan §3.7). A line is a
   * beat with the id `<scene id>:<index>`, said once.
   */
  lines?: readonly { at: number; who: Speaker; line: string }[];
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
export type StorySound = 'bird' | 'blink' | 'paper' | 'taste' | 'swell' | 'poff' | 'breath';

/**
 * What an actor does from a moment on. Each is a movement made in code on the body's joints (src/render/acting.ts),
 * the same on the rehearsal figures and on the models from Blender.
 */
export type Act =
  // the family, and Elof where it suits him
  | 'stand' | 'walk' | 'sit' | 'carve' | 'draw' | 'sip' | 'sneak' | 'kneel' | 'crouch' | 'gasp' | 'point'
  | 'wave' | 'cheer' | 'offer' | 'reach' | 'lift' | 'show' | 'blow' | 'shrug' | 'hug' | 'nod' | 'look'
  | 'startle' | 'stomp' | 'hands' | 'watch' | 'paint' | 'eat'
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
   * Picture only, after the scene: the actor walks along behind Elof, this far behind him, and stops where
   * he stops. Null: they stay where the scene left them. Left out: as before.
   */
  follow?: number | null;
  /** What they hold in the right hand from this moment, and in the left. Null: nothing. Left out: as before. */
  holds?: Thing | null;
  holdsLeft?: Thing | null;
  /** The ghost only: how much of the block of wood is still round it as Pappa carves, from 1 to 0. */
  rough?: number;
}

/** Things the family hold in a scene. */
export type Thing = 'knife' | 'brush' | 'mug' | 'crayon' | 'drawing';

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
  /** How long the camera takes to get here, in seconds. Left out: 1. */
  move?: number;
}

/** Something that happens in the air: glitter, a stream of magic, the POFF, shavings, a bird at the window. */
export interface FxKey {
  at: number;
  kind: 'sparkle' | 'stream' | 'poff' | 'shavings' | 'glow' | 'jay';
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
}

/** One moment of Elof's part in a held scene. His place in the simulation never changes with it. */
export interface ElofKey {
  at: number;
  /** Where he is drawn, apart from where he stands: on a hand, say. {0,0} sets him down again. */
  lift?: Point;
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
  /** Which way he faces: as an actor's `face`. Left out: as in play. */
  face?: number;
  /** How big he is drawn, from this moment, while the scene plays: 3 is a boy among small things. */
  size?: number;
}

/** The scene playing now, for the picture: which one, and how far into it. */
export interface SceneFrame {
  id: string;
  seconds: number;
}

/** The bubbles of a chapter's scenes, as beats: what the page shows and the sound says. */
export function sceneBeats(scenes: readonly SceneDef[] | undefined): Beat[] {
  return (scenes ?? []).flatMap((scene) => (scene.lines ?? []).map((line, i) => ({ id: `${scene.id}:${i}`, who: line.who, line: line.line })));
}

/**
 * Whether one of a chapter's scenes ends it: its goal waits for a flag a scene sets (the prologue's title). The
 * scene is then the chapter's last moment, and nothing else is played after the goal.
 */
export function endsInScene(chapter: { goalNeeds?: string; scenes?: readonly SceneDef[] }): boolean {
  return chapter.goalNeeds !== undefined && (chapter.scenes ?? []).some((scene) => scene.cues?.some((cue) => cue.flag === chapter.goalNeeds));
}

/** The longest a scene waits for quiet, in seconds: a line that never ends cannot keep the story waiting. */
export const QUIET_WAIT = 10;

/** The flag a finished scene leaves. */
export const sceneDone = (id: string) => `scene:${id}`;

/** Whether a scene still has something to tell: not finished, and the story not gone past it. */
export function sceneWaits(scene: SceneDef, flags: ReadonlySet<string>): boolean {
  return !flags.has(scene.by?.done ?? sceneDone(scene.id)) && (scene.until === undefined || !flags.has(scene.until));
}

/** Keep an interrupted, triggered tableau in its authored place when a checkpoint lies elsewhere. */
export function sceneResumeAt(scenes: readonly SceneDef[] | undefined, flags: ReadonlySet<string>, checkpoint: Vec): Vec {
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
  /** A scene is due and waits for quiet: he stands and listens. How long it has waited. */
  private listening = false;
  private waited = 0;
  /** Where the next scene of this name begins, when it is not at its start. */
  private opening: { id: string; seconds: number } | null = null;

  constructor(private readonly scenes: readonly SceneDef[], spawn: Vec, flags: Set<string>) {
    // A scene that waits for a place he starts beyond has been seen: the game was taken up after it.
    for (const scene of scenes) if (scene.at !== undefined && scene.on === undefined && scene.at < spawn.x - 0.5) flags.add(sceneDone(scene.id));
    // An older save can remember the later action without the scene added around it. Its until flag
    // already means the story has passed this scene; retain that completion for presentation too.
    for (const scene of scenes) if (scene.until && flags.has(scene.until)) flags.add(sceneDone(scene.id));
  }

  /** The scene playing now, or null. */
  get frame(): SceneFrame | null {
    return this.playing ? { id: this.playing.def.id, seconds: this.playing.seconds } : null;
  }

  /** Whether he watches now, or listens before a scene. */
  get holding(): boolean {
    return this.listening || this.playing?.def.hold === true;
  }

  /** One step. `said` is where the beats told go, as the simulation's own; `talking`, whether a line is still read. */
  tick(player: PlayerState, flags: Set<string>, said: string[], talking = false): void {
    if (!this.playing) this.begin(player, flags, talking);
    const playing = this.playing;
    if (!playing) return;
    playing.seconds += STEP;
    // Half a step early, so that a moment on a step's edge is never a step late at any frame rate.
    const now = playing.seconds + STEP / 2;
    const cues = playing.def.cues ?? [];
    for (; playing.cue < cues.length && cues[playing.cue]!.at <= now; playing.cue++) flags.add(cues[playing.cue]!.flag);
    const lines = playing.def.lines ?? [];
    for (; playing.line < lines.length && lines[playing.line]!.at <= now; playing.line++) {
      const id = `${playing.def.id}:${playing.line}`;
      flags.add(`beat:${id}`);
      said.push(id);
    }
    if (now < playing.def.seconds) return;
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
    this.waited = 0;
  }

  private begin(player: PlayerState, flags: Set<string>, talking: boolean): void {
    this.listening = false;
    for (const scene of this.scenes) {
      if (scene.by || !sceneWaits(scene, flags)) continue;
      if (scene.needs !== undefined && !flags.has(scene.needs)) continue;
      const due = scene.on !== undefined ? flags.has(scene.on) : scene.at === undefined || player.x >= scene.at;
      if (!due) continue;
      // Due, but staged where he is not yet: it waits for him, and the scenes after it wait with it.
      if (scene.from !== undefined && player.x < scene.from) return;
      // A held scene waits for him to stand, and the scenes after it wait with it: the story keeps its order.
      if (scene.hold && !(player.mode === 'free' && player.grounded)) return;
      // One that waits for quiet lets what is being said finish first. He stands and listens meanwhile.
      if (scene.quiet && talking && this.waited < QUIET_WAIT) {
        this.waited += STEP;
        this.listening = true;
        return;
      }
      this.waited = 0;
      // Begun again after an interruption: its lines are said again, from the first.
      for (let i = 0; i < (scene.lines?.length ?? 0); i++) flags.delete(`beat:${scene.id}:${i}`);
      const from = this.opening?.id === scene.id ? Math.min(this.opening.seconds, scene.seconds) : 0;
      this.opening = null;
      this.playing = { def: scene, seconds: from, cue: 0, line: 0 };
      return;
    }
  }
}
