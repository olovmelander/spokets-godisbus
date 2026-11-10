import { Game } from '../../src/app/game';
import { sv } from '../../src/content/sv';
import { endsInScene, sceneBeats } from '../../src/sim/scene';
import type { ChapterData, SimOptions } from '../../src/sim/types';
import { createHud, readingTime } from '../../src/ui/hud';
import { decide } from './robot';

/**
 * The robot with a page to listen to: the game's own bubbles (src/ui/hud.ts) on a page made of plain objects, driven
 * as src/main.ts drives them. What the simulation says goes to the bubbles; while a story line waits for Fortsätt the
 * game waits; a held scene that begins takes the floor; and the page tells the simulation whether someone is still
 * speaking. A reader presses Fortsätt once a line has been up as long as it takes to read. Every bubble is logged with
 * when it came, when it went and how long it takes to read, so that a line cut short, or one never shown, is counted.
 */

/** One line as the page showed it. */
export interface Heard {
  id: string;
  line: string;
  text: string;
  read: boolean;
  /** Seconds on the page's clock: when its moment came, when the simulation said it, when it showed, and when it went. */
  due: number;
  said: number;
  shown: number | null;
  gone: number | null;
  /** How long it takes to read: 2.5 s and 0.09 s a letter (src/ui/hud.ts). */
  needs: number;
}

export interface Listened {
  goal: boolean;
  /** The page's clock at the end card. */
  seconds: number;
  heard: Heard[];
  /** Lines taken off the page before they had been up for their reading time. */
  cut: Heard[];
  /** Lines said but never shown. */
  lost: Heard[];
  /** The longest a line waited between being said and being shown. */
  lag: number;
  /** The longest a line waited between its moment and being shown. */
  late: number;
  /** Seconds he stood held outside a scene: listening while the story waited for the words, or watching a beat. */
  listened: number;
  /** Seconds the game waited for Fortsätt, and from the goal to the end card. */
  frozen: number;
  ending: number;
  /** Each time he stood and listened: where, from when, and for how long. */
  stops: { x: number; at: number; seconds: number }[];
}

/** A page of plain objects: just what the bubbles touch. `seen` hears every line that is shown and every hide. */
export function fakePage(seen: { show(text: string): void; hide(): void }): Document {
  const elements = new Map<string, Record<string, unknown>>();
  const element = (id: string): Record<string, unknown> => {
    const made: Record<string, unknown> = {
      id, hidden: true, dataset: {}, textContent: '', innerHTML: '', disabled: false, title: '', onclick: null, className: '',
      style: { setProperty() {} }, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
      setAttribute() {}, animate: () => ({}), focus() {}, querySelectorAll: () => [],
      querySelector: () => element(`${id}>`),
      replaceChildren(...nodes: { textContent?: string; className?: string }[]) {
        made.textContent = nodes.map((node) => node.textContent ?? '').join('');
        if (id === 'bubbleLine') seen.show(nodes.filter((node) => node.className === 'said').at(-1)?.textContent ?? '');
      },
    };
    if (id === 'bubble') {
      let hidden = true;
      Object.defineProperty(made, 'hidden', {
        get: () => hidden,
        set: (value: boolean) => { if (value && !hidden) seen.hide(); hidden = value; },
      });
    }
    return made;
  };
  const byId = (id: string) => {
    if (!elements.has(id)) elements.set(id, element(id));
    return elements.get(id)!;
  };
  return {
    getElementById: byId,
    createElement: () => ({ className: '', textContent: '' }),
    createTextNode: (text: string) => ({ textContent: text }),
    documentElement: { dataset: {} },
    defaultView: null,
  } as unknown as Document;
}

/**
 * Plays `chapter` from its start to its end card, as a player who reads every line: the bubbles and the simulation
 * as the page has them.
 */
export function listenThrough(chapter: ChapterData, options: SimOptions = {}, fps = 60, limit = 600): Listened {
  const game = new Game(chapter, options);
  const dt = 1 / fps;
  let clock = 0;
  const lines: Record<string, string> = sv.lines;
  const heard: Heard[] = [];
  let showing: Heard[] = [];
  const hud = createHud(fakePage({
    show(text) {
      const next = heard.find((one) => one.shown === null && one.text === text);
      if (!next) return;
      // A line that goes on from the one before is added under it: the one before has had its time.
      for (const one of showing) one.gone ??= clock;
      next.shown = clock;
      showing = [next];
    },
    hide() {
      for (const one of showing) one.gone ??= clock;
      showing = [];
    },
  }), chapter.candy.length, () => true);
  // What src/main.ts reads as story lines that wait for Fortsätt.
  const beats = new Map([...(chapter.beats ?? []), ...sceneBeats(chapter.scenes)].map((beat) => [beat.id, beat]));
  const reading = new Set([
    ...(chapter.beats ?? []).filter((beat) => beat.read).map((beat) => beat.id),
    ...sceneBeats(chapter.scenes?.filter((scene) => scene.hold)).map((beat) => beat.id),
    ...(chapter.id === 'norrsken' ? ['first1', 'first2', 'first3', 'first4'] : []),
  ]);
  let told = game.sim.said.length;
  let sceneHeard: string | null = null;
  let wasAhead = false;
  let wasOffered = false;
  let endFor = 0;
  let listened = 0;
  const stops: Listened['stops'] = [];
  let frozen = 0;
  // The coda before the page (src/main.ts), where a scene is not the chapter's end and it is not the epilogue.
  const wait = !endsInScene(chapter) && !chapter.epilogue ? 4.6 : 1.4;
  const due = new Map<string, number>();
  for (let frame = 0; frame < fps * limit; frame++) {
    clock += dt;
    for (const id of game.sim.waits.keys()) if (!due.has(id)) due.set(id, clock);
    if (hud.reading()) {
      // The reader presses Fortsätt once the line has been up long enough to read.
      const up = showing.at(-1);
      if (up?.read && up.shown !== null && clock - up.shown >= up.needs) hud.advance();
      game.resume();
      frozen += dt;
    } else {
      const { x, y, ahead, offered } = decide(game, chapter);
      game.frame(dt, { x, y, hopHeld: true, talking: hud.speaking() }, { hop: ahead && !wasAhead, act: offered && !wasOffered, helper: false });
      wasAhead = ahead;
      wasOffered = offered;
      if (game.sim.held && !game.sim.sceneFrame) {
        listened += dt;
        const last = stops.at(-1);
        if (last && Math.abs(last.at + last.seconds - clock) < dt * 1.5) last.seconds += dt;
        else stops.push({ x: game.sim.curr.x, at: clock, seconds: dt });
      }
    }
    const scene = game.sim.sceneFrame;
    if (scene && scene.id !== sceneHeard && chapter.scenes?.find((def) => def.id === scene.id)?.hold) hud.hush();
    sceneHeard = scene?.id ?? null;
    for (; told < game.sim.said.length; told++) {
      const id = game.sim.said[told]!;
      const beat = beats.get(id);
      if (!beat || !lines[beat.line]) continue;
      const read = reading.has(id);
      heard.push({ id, line: beat.line, text: lines[beat.line]!, read, due: due.get(id) ?? clock, said: clock, shown: null, gone: null, needs: readingTime(lines[beat.line]!) });
      hud.say(beat.who, beat.line, read);
    }
    hud.tick(dt);
    if (game.sim.flags.has('goal')) {
      endFor += dt;
    }
    // The end card, as the page brings it.
    if (endFor > wait && !hud.reading() && !hud.speaking() && !game.sim.unsaid) break;
  }
  for (const one of showing) one.gone ??= clock;
  const shown = heard.filter((one) => one.shown !== null);
  // One frame's grace: a bubble goes on the frame its time runs out.
  const cut = shown.filter((one) => one.gone! - one.shown! < one.needs - dt - 1e-6);
  return {
    goal: game.sim.flags.has('goal'), seconds: clock, heard, cut,
    lost: heard.filter((one) => one.shown === null),
    lag: Math.max(0, ...shown.map((one) => one.shown! - one.said)),
    late: Math.max(0, ...shown.map((one) => one.shown! - one.due)),
    listened, frozen, ending: endFor, stops,
  };
}
