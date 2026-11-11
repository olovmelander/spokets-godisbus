import { sv } from '../content/sv';
import { createRace, DRIFT_GOLD } from './race';
import { createKartView } from './render';
import { createKartInput } from './input';
import { createKartAudio } from './audio';
import { createKartRecords, kartTime } from './records';
import type { KartOptions, KartSession } from './types';
import './kart.css';

export type { KartOptions, KartSession } from './types';
const words = sv.kart;
const CROWN = '<svg viewBox="0 0 80 64" aria-hidden="true"><path d="M12 49 5 13l21 14L40 5l14 22 21-14-7 36Z" fill="#efc55c" stroke="#755431" stroke-width="4" stroke-linejoin="round"/><path d="M12 49h56v10H12Z" fill="#c18b39"/><circle cx="40" cy="38" r="5" fill="#f9efd3"/></svg>';
const STAR = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="m32 5 8 18 20 2-15 14 4 20-17-10-17 10 4-20L4 25l20-2Z" fill="currentColor" stroke="#78522f" stroke-width="2.5" stroke-linejoin="round"/></svg>';

/** The television's self-contained game. The house remains owned and frozen by main.ts. */
export async function openKart(options: KartOptions): Promise<KartSession> {
  const root = document.createElement('section');
  root.className = 'kart-game'; root.dataset.mode = 'intro'; root.dataset.device = matchMedia('(pointer: coarse)').matches ? 'touch' : 'keys';
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', words.title);
  root.innerHTML = `
    <canvas class="kart-canvas" tabindex="0" aria-label="${words.title} — ${words.place}"></canvas>
    <div class="kart-vignette" aria-hidden="true"></div>
    <div class="kart-race-ui" hidden>
      <header class="kart-hud"><div class="kart-position"><b data-value="position">4<span>/4</span></b><small>${words.placeLabel}</small></div>
        <div class="kart-laps"><small>${words.lap}</small><b data-value="lap">1 / 3</b><span data-value="time">0:00,0</span></div>
        <button class="kart-pause" data-action="pause" aria-label="${words.pause}">Ⅱ</button></header>
      <canvas class="kart-map" width="240" height="240" role="img" aria-label="${words.map}"></canvas>
      <div class="kart-countdown" aria-live="assertive" hidden></div>
      <div class="kart-notice" role="status"></div>
      <div class="kart-dashboard"><span class="kart-speed"><b data-value="speed">0</b> ${words.speed}</span>
        <div class="kart-drift-meter"><span data-value="drift">${words.charge}</span><div><i></i></div></div>
        <span class="kart-item-state" data-value="item">${words.itemEmpty}</span></div>
      <div class="kart-touch">
        <div class="kart-steering"><button data-kart-control="left" aria-label="${words.left}">‹</button><button data-kart-control="right" aria-label="${words.right}">›</button>
          <button class="kart-brake" data-kart-control="brake">${words.brake}</button></div>
        <div class="kart-pedals"><button class="kart-gas" data-kart-control="gas" hidden>${words.gas}</button>
          <button class="kart-drift" data-kart-control="drift">${words.drift}<span>↝</span></button>
          <button class="kart-item" data-kart-control="item" aria-label="${words.boost}">${STAR}<small>${words.boost}</small></button></div>
      </div>
      <p class="kart-key-hint"></p>
    </div>
    <div class="kart-menu kart-intro">
      <div class="kart-title"><span class="kart-kicker">${words.subtitle}</span><div>${CROWN}<h1>${words.title}</h1></div><p>${words.place} <span>· 665 m</span></p><div class="kart-title-actions"><button class="kart-primary" data-action="start">${words.start}<span>→</span></button><button class="kart-back" data-action="exit">${words.back}</button></div></div>
      <div class="kart-start-card"><p class="kart-lore">${words.story}</p>
        <div class="kart-lessons" aria-label="${words.controlsLabel}"><div><b>↔</b><strong>${words.steer}</strong><span>${words.steerTip}</span></div><div><b>↝</b><strong>${words.drift}</strong><span>${words.driftTip}</span></div><div><b>✦</b><strong>${words.boost}</strong><span>${words.boostTip}</span></div></div>
        <p class="kart-instructions"></p>
        <fieldset class="kart-modes"><legend>${words.modeLabel}</legend><button type="button" data-action="normal" aria-pressed="true">${words.normal}</button><button type="button" data-action="easy" aria-pressed="false">${words.easy}</button></fieldset>
        <p class="kart-mode-tip">${words.normalTip}</p>
        <label class="kart-autogas"><input type="checkbox" checked> ${words.autoGas}<span>${words.autoGasTip}</span></label>
        <p class="kart-record">${words.noRecord}</p>
        <button class="kart-primary" data-action="start">${words.start}<span>→</span></button>
        <button class="kart-back" data-action="exit">${words.back}</button>
      </div>
    </div>
    <div class="kart-menu kart-paused" hidden><div class="kart-paper"><span class="kart-kicker">${words.title}</span><h2>${words.paused}</h2><p>${words.pauseHint}</p><button class="kart-primary" data-action="resume">${words.resume}<span>→</span></button><button data-action="restart">${words.again}</button><button class="kart-back" data-action="exit">${words.back}</button></div></div>
    <div class="kart-menu kart-results" hidden><div class="kart-paper">${CROWN}<span class="kart-kicker">${words.finish}</span><h2></h2><p class="kart-result-place"></p><div class="kart-result-time"></div><ol class="kart-result-laps"></ol><p class="kart-result-record"></p><p class="kart-result-storage"></p><button class="kart-primary" data-action="restart">${words.again}<span>→</span></button><button class="kart-back" data-action="exit">${words.back}</button></div></div>
    <div class="kart-menu kart-error" hidden><div class="kart-paper"><h2>${words.paused}</h2><p>${words.pictureLost}</p><button class="kart-primary" data-action="exit">${words.back}</button></div></div>
    <span class="kart-announcement" aria-live="polite" aria-atomic="true"></span>`;
  const query = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const canvas = query<HTMLCanvasElement>('.kart-canvas');
  const intro = query('.kart-intro'), pausedPanel = query('.kart-paused'), results = query('.kart-results'), errorPanel = query('.kart-error'), raceUi = query('.kart-race-ui');
  const mapCanvas = query<HTMLCanvasElement>('.kart-map'), map = mapCanvas.getContext('2d');
  const recordStore = createKartRecords(options.storage, options.playerId);
  let easy = false, race = createRace({ easy }), disposed = false, suspended = false, mode: 'intro' | 'race' | 'paused' | 'result' | 'error' = 'intro';
  let raf = 0, previous = 0, frames = 0, lastHud = -1, lastCountdown = -1, previousLap = 1, noticeUntil = 0;
  let lastPickup = 0, lastBoost = 0, lastPhase = race.state.phase;
  let padSelect = false, padBack = false, padDirection = 0;
  let view: ReturnType<typeof createKartView> | undefined;
  let sound: ReturnType<typeof createKartAudio> | undefined;
  let input: ReturnType<typeof createKartInput> | undefined;
  let resize: ResizeObserver | undefined;
  const abort = new AbortController(), listeners = { signal: abort.signal };
  const playerColor = '#ffd66b';
  const line = Array.from({ length: 333 }, (_, i) => race.track.sample(race.track.length * i / 332).position);
  const x0 = Math.min(...line.map(p => p.x)), x1 = Math.max(...line.map(p => p.x));
  const z0 = Math.min(...line.map(p => p.z)), z1 = Math.max(...line.map(p => p.z));
  const mapScale = 202 / Math.max(x1 - x0, z1 - z0), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
  function drawMap(): void {
    if (!map) return;
    map.clearRect(0, 0, 240, 240);
    const path = () => { map.beginPath(); line.forEach((p, i) => { const x = 120 + (p.x - mx) * mapScale, y = 120 + (p.z - mz) * mapScale; if (i) map.lineTo(x, y); else map.moveTo(x, y); }); map.closePath(); };
    path(); map.strokeStyle = '#132e2b'; map.lineWidth = 14; map.lineJoin = 'round'; map.stroke();
    path(); map.strokeStyle = '#efe1bb'; map.lineWidth = 6; map.stroke();
    for (const driver of [...race.state.drivers.slice(1), race.state.player]) {
      const p = race.track.sample(driver.distance, driver.lane).position;
      map.beginPath(); map.arc(120 + (p.x - mx) * mapScale, 120 + (p.z - mz) * mapScale, driver.id === 'player' ? 8 : 6, 0, Math.PI * 2);
      map.fillStyle = driver.id === 'player' ? playerColor : `#${driver.color.toString(16).padStart(6, '0')}`; map.fill(); map.strokeStyle = '#16302c'; map.lineWidth = 2; map.stroke();
    }
  }
  const focusable = () => [...root.querySelectorAll<HTMLElement>('button,input,[tabindex="0"]')].filter(e => !e.closest('[hidden]') && !('disabled' in e && e.disabled) && e.getClientRects().length > 0);
  function focusAction(action: string): void { [...root.querySelectorAll<HTMLElement>(`.kart-menu:not([hidden]) [data-action="${action}"]`)].find(e => e.getClientRects().length > 0)?.focus(); }
  function show(next: typeof mode): void {
    mode = next; root.dataset.mode = next;
    // Held gas/brake at the finish or Pause must not become a menu click.
    if (next !== 'race') {
      const held = menuPad(); padSelect = held.a; padBack = held.b; padDirection = held.direction;
    }
    intro.hidden = next !== 'intro'; pausedPanel.hidden = next !== 'paused'; results.hidden = next !== 'result'; errorPanel.hidden = next !== 'error'; raceUi.hidden = next !== 'race';
    input?.setEnabled(next === 'race' && !suspended); sound?.suspend(next !== 'race' || suspended);
    if (next === 'race') canvas.focus(); else focusAction(next === 'intro' ? 'start' : next === 'paused' ? 'resume' : next === 'result' ? 'restart' : 'exit');
    previous = 0;
  }
  function updateInstructions(): void {
    const device = root.dataset.device;
    const text = device === 'touch' ? words.touch : device === 'pad' ? words.pad : words.keys;
    query('.kart-instructions').textContent = text; query('.kart-key-hint').textContent = text;
  }
  function updateRecord(): void {
    const best = recordStore.best(easy);
    query('.kart-record').textContent = best ? `${words.bestRace}: ${kartTime(best.race)} · ${words.bestLap}: ${kartTime(best.lap)}` : words.noRecord;
  }
  function startRace(): void {
    if (suspended || mode === 'error') return;
    race = createRace({ easy }); previousLap = 1; lastPickup = lastBoost = 0; lastPhase = 'countdown'; lastCountdown = -1; lastHud = -1; noticeUntil = 0;
    query('.kart-notice').textContent = ''; query('.kart-announcement').textContent = '';
    sound?.unlock(); show('race'); drawHud(true);
  }
  function pauseRace(): void {
    if (disposed || suspended) return;
    if (mode === 'race') show('paused');
    else if (mode === 'paused' && !suspended) { sound?.unlock(); show('race'); }
    else if (mode === 'intro' || mode === 'result' || mode === 'error') options.onClose();
  }
  function notice(text: string): void { query('.kart-notice').textContent = text; noticeUntil = race.state.elapsed + 2.3; }
  function finishRace(): void {
    const result = race.state.result;
    if (!result) return;
    const saved = recordStore.finish(easy, { race: result.elapsed, lap: result.bestLap });
    results.querySelector('h2')!.textContent = result.place === 1 ? words.winner : words.finishHint;
    query('.kart-result-place').textContent = words.result.replace('{place}', String(result.place));
    query('.kart-result-time').textContent = kartTime(result.elapsed);
    query('.kart-result-laps').replaceChildren(...result.lapTimes.map((time, i) => { const li = document.createElement('li'); li.textContent = `${words.lap} ${i + 1}`; const b = document.createElement('b'); b.textContent = kartTime(time); li.append(b); return li; }));
    query('.kart-result-record').textContent = saved.improved ? words.newRecord : `${words.bestLap}: ${kartTime(result.bestLap)}`;
    query('.kart-result-storage').textContent = saved.saved ? words.recordLocal : words.recordUnavailable;
    show('result');
    // The soft finish cue is allowed through while the result is first shown, then silence again.
    sound?.suspend(false);
    sound?.tick({ speed: 0, throttle: 0, drifting: false, boost: false, phase: 'finished' }, 0);
    sound?.event('finish');
  }
  function drawHud(force = false): void {
    const state = race.state, player = state.player;
    if (!force && Math.floor(state.elapsed * 10) === lastHud && state.phase !== 'countdown') return;
    lastHud = Math.floor(state.elapsed * 10);
    query('[data-value="position"]').innerHTML = `${state.position}<span>/4</span>`;
    query('[data-value="lap"]').textContent = `${player.lap} / ${state.laps}`;
    query('[data-value="time"]').textContent = kartTime(state.elapsed);
    query('[data-value="speed"]').textContent = String(Math.round(Math.max(0, player.speed) * 3.6));
    const meter = query('.kart-drift-meter'); meter.dataset.tier = player.driftTier;
    meter.querySelector<HTMLElement>('i')!.style.width = `${Math.min(100, player.driftCharge / DRIFT_GOLD * 100)}%`;
    query('[data-value="drift"]').textContent = player.boostTime > 0 ? words.boostActive : player.driftTier === 'gold' ? words.gold : player.driftTier === 'blue' ? words.blue : words.charge;
    query('[data-value="item"]').textContent = state.item ? words.itemReady : words.itemEmpty;
    query('.kart-item').classList.toggle('is-ready', !!state.item); query('.kart-item').setAttribute('aria-disabled', String(!state.item));
    root.classList.toggle('kart-boosting', player.boostTime > 0 && !options.calm);
    const countdown = query('.kart-countdown');
    const count = state.phase === 'countdown' ? Math.max(1, Math.ceil(state.countdown)) : state.elapsed < .8 ? 0 : -1;
    countdown.hidden = count < 0;
    if (count !== lastCountdown) { countdown.textContent = count > 0 ? String(count) : count === 0 ? words.go : ''; if (count >= 0) sound?.event(count ? 'countdown' : 'go'); lastCountdown = count; }
    if (state.events.pickup !== lastPickup) { notice(words.itemReady); sound?.event('pickup'); lastPickup = state.events.pickup; }
    if (state.events.boost !== lastBoost) { sound?.event('boost'); lastBoost = state.events.boost; }
    if (player.lap !== previousLap) { notice(player.lap === 3 ? words.finalLap : words.lapAnnouncement.replace('{lap}', String(player.lap))); query('.kart-announcement').textContent = query('.kart-notice').textContent; previousLap = player.lap; }
    if (noticeUntil && state.elapsed > noticeUntil) { query('.kart-notice').textContent = ''; noticeUntil = 0; }
    drawMap();
  }
  function menuPad(): { a: boolean; b: boolean; direction: number } {
    let pad: Gamepad | null | undefined;
    try { pad = navigator.getGamepads?.().find(p => p?.connected && (!p.mapping || p.mapping === 'standard')); } catch { /* Keyboard and touch still work. */ }
    return { a: !!pad?.buttons[0]?.pressed, b: !!pad?.buttons[1]?.pressed,
      direction: pad?.buttons[13]?.pressed || (pad?.axes[1] ?? 0) > .6 ? 1 : pad?.buttons[12]?.pressed || (pad?.axes[1] ?? 0) < -.6 ? -1 : 0 };
  }
  function pollMenu(): void {
    input?.pollMenu();
    if (disposed || mode === 'race') return;
    const { a, b, direction } = menuPad();
    if (direction && direction !== padDirection) {
      const items = focusable().filter(e => e !== canvas), index = items.indexOf(document.activeElement as HTMLElement);
      items[(index + direction + items.length) % items.length]?.focus();
    }
    if (a && !padSelect && document.activeElement instanceof HTMLElement && root.contains(document.activeElement) && document.activeElement !== canvas) document.activeElement.click();
    if (b && !padBack && !suspended) {
      if (mode === 'paused') show('race');
      else if (mode === 'intro' || mode === 'result') options.onClose();
    }
    padSelect = a; padBack = b; padDirection = direction;
  }
  function frame(now: number): void {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const dt = previous ? Math.min(.05, Math.max(0, (now - previous) / 1000)) : 0; previous = now;
    if (suspended || document.hidden) return;
    if (mode === 'race') {
      const controls = input!.read(dt);
      // read() may open Pause on this exact frame: do not simulate a final unowned step.
      if (disposed || mode !== 'race') return;
      race.tick(controls, dt); drawHud();
      sound?.tick({ speed: race.state.player.speed, throttle: controls.throttle, drifting: race.state.player.drifting, boost: race.state.player.boostTime > 0, phase: race.state.phase }, dt);
      if (race.state.phase === 'finished' && lastPhase !== 'finished') finishRace();
      lastPhase = race.state.phase;
    } else pollMenu();
    if (disposed || mode === 'error' || mode === 'paused') return;
    view?.render(race, dt, mode === 'intro' ? 'menu' : mode === 'result' ? 'result' : 'race'); frames++;
  }
  function cleanup(): void {
    if (disposed) return; disposed = true;
    cancelAnimationFrame(raf); abort.abort(); resize?.disconnect(); input?.dispose(); sound?.dispose(); view?.dispose(); root.remove();
  }
  try {
    options.host.append(root);
    view = createKartView(canvas, { calm: options.calm, tier: options.tier });
    sound = createKartAudio({ effects: options.effects, music: options.music, calm: options.calm });
    input = createKartInput(root, { pause: pauseRace, action: () => sound?.unlock(), device(device) { root.dataset.device = device; updateInstructions(); } });
    input.setAutoGas(true); input.setEnabled(false); sound.suspend(true);
    root.addEventListener('click', event => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-action]') : null;
      if (!target) return;
      const action = target.dataset.action;
      if (action === 'exit') { options.onClose(); return; }
      if (suspended) return;
      if (action === 'start' || action === 'restart') startRace();
      else if (action === 'pause' || action === 'resume') pauseRace();
      else if (action === 'easy' || action === 'normal') {
        easy = action === 'easy'; root.querySelectorAll<HTMLElement>('.kart-modes button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.action === action)));
        query('.kart-mode-tip').textContent = easy ? words.easyTip : words.normalTip; updateRecord();
      }
    }, listeners);
    query<HTMLInputElement>('.kart-autogas input').addEventListener('change', event => {
      const enabled = (event.target as HTMLInputElement).checked; input?.setAutoGas(enabled); query('.kart-gas').hidden = enabled;
    }, listeners);
    root.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const items = focusable(), current = items.indexOf(document.activeElement as HTMLElement);
      if (items.length) { event.preventDefault(); items[(current + (event.shiftKey ? -1 : 1) + items.length) % items.length]?.focus(); }
    }, listeners);
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); show('error'); }, listeners);
    window.addEventListener('blur', () => { if (mode === 'race') show('paused'); }, listeners);
    document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'race') show('paused'); previous = 0; }, listeners);
    resize = new ResizeObserver(() => { if (!disposed) { view?.resize(root.clientWidth, root.clientHeight); if (mode === 'paused') view?.render(race, 0); } });
    resize.observe(root); view.resize(root.clientWidth, root.clientHeight); view.render(race, 0, 'menu');
    updateInstructions(); updateRecord(); show('intro'); raf = requestAnimationFrame(frame);
  } catch (error) { cleanup(); throw error; }
  return {
    element: root,
    suspend(blocked) {
      if (disposed || blocked === suspended) return;
      suspended = blocked; previous = 0; input?.clear();
      if (blocked && mode === 'race') show('paused');
      input?.setEnabled(mode === 'race' && !blocked); sound?.suspend(blocked || mode !== 'race');
    },
    dispose: cleanup,
    debug: () => options.debug ? {
      mode, suspended, frames, phase: race.state.phase, elapsed: race.state.elapsed, countdown: race.state.countdown,
      distance: race.state.player.distance, lane: race.state.player.lane, speed: race.state.player.speed,
      position: race.state.position, lap: race.state.player.lap, driftCharge: race.state.player.driftCharge,
      boostTime: race.state.player.boostTime, item: race.state.item, events: { ...race.state.events },
      result: race.state.result, autoGas: input?.autoGas, device: input?.device, render: view?.stats(),
      drivers: race.state.drivers.map(({ id, distance, lane, heading, yawRate, u, w, speed, slip, assist, finishTime }) =>
        ({ id, distance, lane, heading, yawRate, u, w, speed, slip, assist, finishTime })),
    } : {},
  };
}
