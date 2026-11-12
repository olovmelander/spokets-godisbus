import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { AVENTYR2 } from '../../src/content/aventyr2/aventyr2';
import { BONUS, STORY } from '../../src/content/chapters';
import { sv } from '../../src/content/sv';
import { endsInScene, sceneBeats } from '../../src/sim/scene';
import type { Beat, ChapterData } from '../../src/sim/types';
import { createHud, readingTime } from '../../src/ui/hud';
import { fakePage } from './listener';
import { decide } from './robot';

/**
 * A tool, not a test: each chapter as it is heard, line by line against what he does (docs/dialogue.md). It runs only
 * when asked, and writes one text file a chapter into the folder named:
 *
 *   $env:DIALOGUE_TIMELINE = "<a folder outside the repository>"; npx vitest run tests/robot/dialogue-timeline.test.ts
 *
 * The robot plays with the game's own bubbles listening, as in ./listener.ts. Each line is written with when it was
 * said, where he was, and how long after its moment (`LATE`); a passing remark let go unsaid is written at its moment
 * (`gone`); and between them every flag, scene and big candy, and where he stood and waited for words (`STOP`).
 * `DIALOGUE_PAUSE` is the seconds the robot rests at each big candy: a child who looks about hears more remarks.
 * `_summary.txt` has a line a chapter, and the lines that came late.
 */
const OUT = process.env.DIALOGUE_TIMELINE ?? '';
const PAUSE = Number(process.env.DIALOGUE_PAUSE ?? '0');

interface Row { t: number; x: number; kind: string; text: string }
interface Said { id: string; who: string; text: string; due: number; dueX: number; shown: number | null; shownX: number; needs: number; scene: string | null; held: boolean; aside: boolean }

function timeline(chapter: ChapterData) {
  const game = new Game(chapter, {});
  const fps = 60;
  const dt = 1 / fps;
  let clock = 0;
  const lines: Record<string, string> = sv.lines;
  const rows: Row[] = [];
  const heard: Said[] = [];
  const hud = createHud(fakePage({
    show(text) {
      const next = heard.find((one) => one.shown === null && one.text === text);
      if (!next) return;
      next.shown = clock;
      next.shownX = game.sim.curr.x;
    },
    hide() {},
  }), chapter.candy.length, () => true, () => 1, () => {}, () => {}, (id) => game.sim.acknowledge(id));
  const world = new Map((chapter.beats ?? []).map((beat) => [beat.id, beat]));
  const beats = new Map<string, Beat>([...(chapter.beats ?? []), ...sceneBeats(chapter.scenes)].map((beat) => [beat.id, beat]));
  const inScene = new Map<string, string>();
  for (const scene of chapter.scenes ?? []) (scene.lines ?? []).forEach((line, i) => inScene.set(line.id ?? `${scene.id}:${i}`, `${scene.id} at ${line.at} s`));
  const trigger = (id: string) => {
    const beat = world.get(id);
    if (!beat) return `scene ${inScene.get(id) ?? '?'}`;
    return [beat.at !== undefined ? `at ${beat.at}` : '', beat.on ? `on ${beat.on}` : '', beat.needs ? `needs ${beat.needs}` : '', beat.until ? `until ${beat.until}` : '',
      beat.within ? `within ${beat.within.join('..')}` : '', beat.read ? 'read' : '', beat.aside ? `aside${beat.aside === true ? '' : ` ${beat.aside}`}` : ''].filter(Boolean).join(', ');
  };
  let told = game.sim.said.length;
  let sceneWas: string | null = null;
  let wasAhead = false;
  let wasOffered = false;
  let endFor = 0;
  let quietFor = 0;
  let rest = 0;
  let stoodFrom: number | null = null;
  const wait = !endsInScene(chapter) && !chapter.epilogue ? 4.6 : 1.4;
  const due = new Map<string, { t: number; x: number }>();
  const known = new Set(game.sim.flags);
  let checkpoint = game.sim.checkpoint;
  for (let frame = 0; frame < fps * 1200; frame++) {
    clock += dt;
    for (const id of game.sim.waits.keys()) if (!due.has(id)) due.set(id, { t: clock, x: game.sim.curr.x });
    if (hud.reading()) {
      game.resume();
    } else {
      const d = decide(game, chapter);
      const resting = rest > 0 && game.sim.curr.mode === 'free' && game.sim.curr.grounded;
      if (resting) rest -= dt;
      game.frame(dt, { x: resting ? 0 : d.x, y: d.y, hopHeld: true, talking: hud.speaking() }, { hop: !resting && d.ahead && !wasAhead, act: !resting && d.offered && !wasOffered, helper: false });
      wasAhead = d.ahead;
      wasOffered = d.offered;
    }
    const p = game.sim.curr;
    for (const flag of game.sim.flags) {
      if (known.has(flag)) continue;
      known.add(flag);
      if (!flag.startsWith('beat:')) rows.push({ t: clock, x: p.x, kind: 'flag', text: flag });
    }
    if (game.sim.checkpoint !== checkpoint) {
      checkpoint = game.sim.checkpoint;
      rest = PAUSE;
      rows.push({ t: clock, x: p.x, kind: 'candy', text: `big candy ${checkpoint}` });
    }
    const scene = game.sim.sceneFrame;
    if ((scene?.id ?? null) !== sceneWas) {
      if (sceneWas) rows.push({ t: clock, x: p.x, kind: 'scene', text: `end of ${sceneWas}` });
      if (scene) {
        const def = chapter.scenes?.find((one) => one.id === scene.id);
        rows.push({ t: clock, x: p.x, kind: 'scene', text: `${scene.id}${def?.hold ? ', held' : ''}${def?.quiet ? ', quiet' : ''}` });
        if (def?.hold) hud.hush();
      }
    }
    sceneWas = scene?.id ?? null;
    const stands = game.sim.held && !scene;
    if (stands && stoodFrom === null) stoodFrom = clock;
    if (!stands && stoodFrom !== null) {
      rows.push({ t: stoodFrom, x: p.x, kind: 'STOP', text: `stood and waited ${(clock - stoodFrom).toFixed(1)} s` });
      stoodFrom = null;
    }
    for (; told < game.sim.said.length; told++) {
      const id = game.sim.said[told]!;
      const beat = beats.get(id);
      if (!beat || !lines[beat.line]) continue;
      const held = game.sim.held && game.sim.sceneFrame !== null;
      const moment = due.get(id) ?? { t: clock, x: p.x };
      heard.push({ id, who: beat.who, text: lines[beat.line]!, due: moment.t, dueX: moment.x, shown: null, shownX: p.x, needs: readingTime(lines[beat.line]!),
        scene: game.sim.sceneFrame?.id ?? null, held, aside: !!beat.aside });
      hud.say(beat.who, beat.line, held, id);
    }
    hud.tick(dt);
    if (game.sim.flags.has('goal')) endFor += dt;
    quietFor = hud.reading() || hud.speaking() || game.sim.unsaid ? 0 : quietFor + dt;
    if (endFor > wait && quietFor > 0.4) break;
  }
  const lateness = (one: Said) => Math.max(0, (one.shown ?? one.due) - one.due);
  for (const one of heard) {
    rows.push({ t: one.shown ?? one.due, x: one.shownX, kind: one.aside ? 'aside' : 'LINE',
      text: `${one.who.toUpperCase()}: "${one.text}" [${one.id}; ${trigger(one.id)}]${one.held ? ' {held}' : one.scene ? ` {in ${one.scene}}` : ''}`
        + `${lateness(one) > 0.05 ? ` LATE ${lateness(one).toFixed(1)} s, ${(one.shownX - one.dueX).toFixed(1)} EL on` : ''} (${one.needs.toFixed(1)} s)` });
  }
  const gone = [...due].filter(([id]) => !heard.some((one) => one.id === id));
  for (const [id, moment] of gone) rows.push({ t: moment.t, x: moment.x, kind: 'gone', text: `${world.get(id)?.who}: "${lines[world.get(id)?.line ?? ''] ?? ''}" [${id}; ${trigger(id)}]` });
  rows.sort((a, b) => a.t - b.t);
  const never = [...world.values()].filter((beat) => !heard.some((one) => one.id === beat.id) && !due.has(beat.id))
    .map((beat) => `  ${beat.who}: "${lines[beat.line] ?? '??'}" [${beat.id}; ${trigger(beat.id)}]`);
  return { goal: game.sim.flags.has('goal'), seconds: clock, heard, rows, never, gone, lateness };
}

describe.skipIf(!OUT)('each chapter as it is heard (a tool: set DIALOGUE_TIMELINE to a folder)', () => {
  const summary: string[] = [];
  const late: string[] = [];
  for (const chapter of [...STORY, ...BONUS, ...AVENTYR2]) {
    it(chapter.id, () => {
      const result = timeline(chapter);
      mkdirSync(OUT, { recursive: true });
      writeFileSync(`${OUT}/${chapter.id}.txt`, [`${chapter.id}: ${result.seconds.toFixed(0)} s${PAUSE ? `, resting ${PAUSE} s at each big candy` : ''}`, '',
        ...result.rows.map((row) => `${row.t.toFixed(1).padStart(6)} s  x ${row.x.toFixed(1).padStart(6)}  ${row.kind.padEnd(5)} ${row.text}`),
        '', 'Never due in this run:', ...result.never, ''].join('\n'), 'utf8');
      const story = result.heard.filter((one) => !one.aside && !one.held && one.shown !== null);
      summary.push(`${chapter.id.padEnd(11)} ${result.seconds.toFixed(0).padStart(4)} s  heard ${String(result.heard.length).padStart(3)}  let go ${String(result.gone.length).padStart(2)}`
        + `  latest story line ${Math.max(0, ...story.map(result.lateness)).toFixed(1).padStart(5)} s`);
      for (const one of result.heard) if (!one.held && result.lateness(one) > 1.5) late.push(`${result.lateness(one).toFixed(1).padStart(5)} s  ${chapter.id}  ${one.aside ? 'aside' : 'LINE '}  ${one.id}  "${one.text}"`);
      writeFileSync(`${OUT}/_summary.txt`, [...summary, '', 'More than 1.5 s after its moment:', ...late.sort().reverse(), ''].join('\n'), 'utf8');
      expect(result.goal).toBe(true);
    }, 120000);
  }
});
