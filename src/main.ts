import { Timer } from 'three';
import { Game } from './app/game';
import { testbana } from './content/chapters/testbana';
import { sv } from './content/sv';
import { createInput, type Device } from './input/input';
import { tierFromQuery } from './render/quality';
import { createView, type View } from './render/view';
import { createBench } from './ui/bench';
import { createDebug, type Debug } from './ui/debug';
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

function showMessage(text: string): void {
  byId('messageText').textContent = text;
  const button = byId<HTMLButtonElement>('messageButton');
  button.textContent = sv.retry;
  button.onclick = () => location.reload();
  byId('message').hidden = false;
  byId('loading').classList.add('done');
}

function start(): void {
  mountShell(document.body);
  const canvas = byId<HTMLCanvasElement>('game');
  let view: View;
  try {
    view = createView(canvas, testbana, tierFromQuery(params.get('tier')));
  } catch (error) {
    console.error(error);
    showMessage(sv.noWebGL);
    return;
  }

  const game = new Game(testbana);
  const controls = byId('controls');
  const hint = byId('hint');

  // The on-screen controls follow the device in use, not the kind of computer (plan §4.1).
  let device: Device = window.matchMedia('(pointer: coarse)').matches ? 'touch' : 'keys';
  const showDevice = (d: Device) => {
    device = d;
    controls.hidden = d !== 'touch';
    hint.hidden = d === 'touch';
    hint.textContent = d === 'pad' ? sv.padHint : sv.keysHint;
  };
  showDevice(device);

  const input = createInput(
    {
      stickZone: byId('stickZone'),
      stickBase: byId('stickBase'),
      stickKnob: byId('stickKnob'),
      hopBtn: byId('hopBtn'),
      actBtn: byId('actBtn'),
      world: canvas,
    },
    { onDevice: showDevice },
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
    if (!document.hidden) game.resume();
  });

  const debug: Debug | null = debugOn ? createDebug(byId('debug')) : null;
  if (debugOn) {
    window.__godis = {
      state: () => ({ ...game.sim.curr, steps: game.sim.steps, flags: [...game.sim.flags], device }),
      info: () => ({ ...view.info() }),
    };
  }

  // ?bench plays the course by itself for 30 seconds and then shows numbers to paste into a session.
  const bench = benchOn ? createBench(30, testbana) : null;

  let shown = false;
  let lastTime = 0;
  function frame(time: number): void {
    requestAnimationFrame(frame);
    const began = performance.now();
    timer.update(time);
    const dt = Math.min(timer.getDelta(), 0.25);
    let held = input.state();
    let edges = input.consume();
    if (bench && !bench.done) ({ held, edges } = bench.play(game.sim.curr, time));
    game.frame(dt, { x: held.x, hopHeld: held.hopHeld }, edges);
    const atGoal = game.sim.flags.has('goal');
    view.render(game.sim.prev, game.sim.curr, game.alpha, dt, atGoal);
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
        ];
      });
    }
    lastTime = time;
  }
  requestAnimationFrame(frame);
}

start();
