import { Timer } from 'three';
import { Game } from './app/game';
import { testbana } from './content/chapters/testbana';
import { sv } from './content/sv';
import { createInput, type Device } from './input/input';
import { tierFromQuery } from './render/quality';
import { createView, type View } from './render/view';
import { settingsFor, simOptions, tempoOf, type Settings } from './save/settings';
import { createStore, newSave, type PlayerSave } from './save/store';
import type { SimStart, Vec } from './sim/types';
import { createBench } from './ui/bench';
import { createDebug, type Debug } from './ui/debug';
import { createHud } from './ui/hud';
import { createPause } from './ui/pause';
import { mountShell } from './ui/shell';
import './ui/ui.css';

declare global {
  interface Window {
    /** Only with ?debug: what the browser tests and a session read. */
    __godis?: {
      state(): Record<string, unknown>;
      info(): Record<string, unknown>;
    };
  }
}

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const params = new URLSearchParams(location.search);
const benchOn = params.has('bench');
const debugOn = params.has('debug') || benchOn;

function showMessage(text: string, button: string = sv.retry, action: () => void = () => location.reload()): void {
  byId('messageText').textContent = text;
  const element = byId<HTMLButtonElement>('messageButton');
  element.textContent = button;
  element.onclick = action;
  byId('message').hidden = false;
  byId('loading').classList.add('done');
}

/** With ?debug, ?at=x,y starts Elof there instead of at the chapter's start: for looking at one place. */
function debugStart(): Vec | null {
  const [x, y] = debugOn ? (params.get('at') ?? '').split(',').map(Number) : [];
  return x !== undefined && y !== undefined && Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

/** `localStorage`, or null where the browser refuses it: private windows, blocked storage. */
function storage(): Storage | null {
  try {
    const found = window.localStorage;
    found.getItem('godisbus.v1.index');
    return found;
  } catch {
    return null;
  }
}

function start(): void {
  const at = debugStart();
  const chapter = at ? { ...testbana, spawn: at } : testbana;
  mountShell(document.body);
  const canvas = byId<HTMLCanvasElement>('game');
  let view: View;
  try {
    view = createView(canvas, chapter, tierFromQuery(params.get('tier')));
  } catch (error) {
    console.error(error);
    showMessage(sv.noWebGL);
    return;
  }

  // The saved game (plan §6.9). ?bench plays without one, and a debug start position never writes one.
  const store = createStore(benchOn ? null : storage());
  const loaded = store.load();
  if (loaded.kind === 'unreadable') {
    showMessage(sv.saveUnreadable, sv.startOver, () => {
      store.clear();
      location.reload();
    });
    return;
  }
  let save: PlayerSave = loaded.kind === 'save' ? loaded.save : newSave(Date.now(), chapter.id);
  let settings: Settings = debugOn && params.get('style') === 'lugnt' ? settingsFor('lugnt') : save.settings;
  const from: SimStart =
    at || save.chapter !== chapter.id
      ? {}
      : { checkpoint: save.checkpoint, collected: save.candy[chapter.id] ?? [], placed: save.placed[chapter.id] ?? [] };

  const game = new Game(chapter, simOptions(settings), from);
  game.tempo = tempoOf(settings);
  const hud = createHud(byId('bag'), byId('bagCount'), byId<HTMLButtonElement>('actBtn'), chapter.candy.length);
  const controls = byId('controls');
  const hint = byId('hint');

  let playedFrom = performance.now();
  /** Writes the game as it stands: at every big candy, on pause, and when the page is hidden. */
  function writeSave(): void {
    const now = performance.now();
    save = {
      ...save,
      updated: Date.now(),
      settings,
      chapter: chapter.id,
      checkpoint: game.sim.checkpoint,
      candy: { ...save.candy, [chapter.id]: game.sim.collected.flatMap((got, i) => (got ? [i] : [])) },
      placed: { ...save.placed, [chapter.id]: game.sim.placed },
      playMs: save.playMs + (now - playedFrom),
    };
    playedFrom = now;
    if (!at) store.write(save);
  }
  if (!store.available && !benchOn) {
    const notice = byId('notice');
    notice.textContent = sv.saveOff;
    notice.hidden = false;
    setTimeout(() => (notice.hidden = true), 7000);
  }

  // The on-screen controls follow the device in use, not the kind of computer (plan §4.1).
  let device: Device = window.matchMedia('(pointer: coarse)').matches ? 'touch' : 'keys';
  const showDevice = (d: Device) => {
    device = d;
    controls.hidden = d !== 'touch';
    hint.hidden = d === 'touch';
    hint.textContent = d === 'pad' ? sv.padHint : sv.keysHint;
  };
  showDevice(device);

  // Pause: the game stands still, and the panel has the play style and "Jag har fastnat" (plan §6.10).
  let paused = false;
  function openPause(): void {
    if (paused) return;
    paused = true;
    input.release();
    pause.show(settings);
    writeSave();
  }
  function resume(): void {
    if (!paused) return;
    paused = false;
    pause.hide();
    input.release();
    game.resume();
  }
  const pause = createPause(document, {
    onResume: resume,
    onSettings(next) {
      settings = next;
      game.sim.options = simOptions(settings);
      game.tempo = tempoOf(settings);
      writeSave();
    },
    onStuck() {
      game.sim.toCheckpoint();
      resume();
    },
  });
  byId('pauseBtn').addEventListener('click', openPause);

  const input = createInput(
    {
      stickZone: byId('stickZone'),
      stickBase: byId('stickBase'),
      stickKnob: byId('stickKnob'),
      hopBtn: byId('hopBtn'),
      actBtn: byId('actBtn'),
      world: canvas,
    },
    {
      onDevice: showDevice,
      onKey: (key) => {
        if (key === 'pause') (paused ? resume : openPause)();
      },
      panelOpen: () => paused,
      upClimbs: () => game.sim.curr.mode === 'climb' || game.sim.curr.mode === 'swing',
    },
  );

  // The page is a game surface: no pinch zoom, no double-tap zoom, no long-press menu (plan §6.7).
  for (const type of ['gesturestart', 'dblclick', 'contextmenu']) {
    document.addEventListener(type, (e) => e.preventDefault());
  }
  window.addEventListener('resize', () => view.resize());

  // r186's Timer follows the page's visibility, so a hidden tab doesn't come back with one huge frame.
  const timer = new Timer();
  timer.connect(document);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) writeSave();
    else game.resume();
  });
  window.addEventListener('pagehide', writeSave);

  const debug: Debug | null = debugOn ? createDebug(byId('debug')) : null;
  if (debugOn) {
    window.__godis = {
      state: () => ({
        ...game.sim.curr, steps: game.sim.steps, flags: [...game.sim.flags], candy: game.sim.candyCount,
        bubbles: game.sim.bubbles, checkpoint: game.sim.checkpoint, style: settings.style, paused, device,
      }),
      info: () => ({ ...view.info() }),
    };
  }

  // ?bench plays the course by itself for 30 seconds and then shows numbers to paste into a session.
  const bench = benchOn ? createBench(30, chapter) : null;

  let shown = false;
  let lastTime = 0;
  let savedAt = game.sim.checkpoint;
  function frame(time: number): void {
    requestAnimationFrame(frame);
    const began = performance.now();
    timer.update(time);
    const dt = Math.min(timer.getDelta(), 0.25);
    if (paused) {
      // The panel's buttons still answer a gamepad.
      input.poll();
    } else {
      let held = input.state();
      let edges = input.consume();
      if (bench && !bench.done) ({ held, edges } = bench.play(game.sim.curr, time));
      game.frame(dt, { x: held.x, y: held.y, hopHeld: held.hopHeld }, edges);
    }
    // A big candy is a safe place: the game saves there (plan §3.3, rule 4).
    if (game.sim.checkpoint !== savedAt) {
      savedAt = game.sim.checkpoint;
      writeSave();
    }
    const atGoal = game.sim.flags.has('goal');
    view.render({
      prev: game.sim.prev, curr: game.sim.curr, alpha: game.alpha, dt: paused ? 0 : dt, atGoal,
      collected: game.sim.collected, checkpoint: game.sim.checkpoint, movers: game.sim.movers,
    });
    hud.candy(game.sim.candyCount);
    hud.verb(game.sim.curr.verb);
    if (atGoal && device !== 'touch') hint.textContent = sv.goal;

    if (!shown) {
      shown = true;
      byId('loading').classList.add('done');
    }
    if (bench && lastTime > 0) {
      bench.frame(time - lastTime, performance.now() - began);
      if (bench.done && !bench.shown) byId('debug').textContent = bench.report(view.info());
    }
    if (debug && !bench?.shown) {
      const p = game.sim.curr;
      // Two decimals, and never "-0.00".
      const n = (value: number) => (Math.abs(value) < 0.005 ? 0 : value).toFixed(2);
      debug.frame(time - lastTime, performance.now() - began, time, () => {
        const i = view.info();
        return [
          `steps/frame ${game.lastSteps} · device ${device}`,
          `draw calls ${i.drawCalls} · triangles ${i.triangles} · programs ${i.programs}`,
          `tier ${i.tier} · canvas ${i.width}×${i.height} · pixel ratio ${i.pixelRatio.toFixed(2)}`,
          `models ${i.models.join(', ') || 'none yet'} · KTX2 textures ${i.compressedTextures}`,
          `x ${n(p.x)} y ${n(p.y)} · vx ${n(p.vx)} vy ${n(p.vy)} · ${p.grounded ? 'on the ground' : 'in the air'}`,
          `candy ${game.sim.candyCount} of ${chapter.candy.length} · bubbles ${game.sim.bubbles} · ${p.mode}${p.verb ? ` · Använd: ${p.verb}` : ''}${p.atEdge ? ' · at an edge' : ''}`,
          `big candy ${game.sim.checkpoint + 1} of ${chapter.checkpoints?.length ?? 0} · ${settings.style}${paused ? ' · paused' : ''}`,
        ];
      });
    }
    lastTime = time;
  }
  requestAnimationFrame(frame);
}

start();
