import { sv } from '../content/sv';
import { createRace, ROULETTE_SECONDS, type ItemId, type KartEvent } from './sim/race';
import { DRIFT_TIERS, MAX_CANDIES } from './sim/kart';
import { LAPS, trackGap } from './sim/track';
import { createKartView } from './render';
import { createKartInput } from './input';
import { createKartAudio, type KartSoundEvent } from './audio';
import { createKartRecords, kartTime } from './records';
import { BAG, CANDY, CROWN, ITEM_ICONS, ROULETTE_ORDER } from './icons';
import type { KartOptions, KartSession } from './types';
import './kart.css';

export type { KartOptions, KartSession } from './types';
const words = sv.kart;
const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`;
/** How far away a rival's bang or pop can still be heard, in metres along the road. */
const EARSHOT = 70;

/** The television's self-contained game. The house remains owned and frozen by main.ts. */
export async function openKart(options: KartOptions): Promise<KartSession> {
  const root = document.createElement('section');
  root.className = 'kart-game'; root.dataset.mode = 'intro'; root.dataset.device = matchMedia('(pointer: coarse)').matches ? 'touch' : 'keys';
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', words.title);
  root.innerHTML = `
    <canvas class="kart-canvas" tabindex="0" aria-label="${words.title} – ${words.place}"></canvas>
    <div class="kart-speedlines" aria-hidden="true"></div>
    <div class="kart-vignette" aria-hidden="true"></div>
    <div class="kart-race-ui" hidden>
      <header class="kart-hud">
        <div class="kart-position" aria-label="${words.placeLabel}"><b data-value="position">8:e</b><span>/8</span></div>
        <div class="kart-laps"><small>${words.lap}</small><b data-value="lap">1/3</b><span data-value="time">0:00,0</span></div>
        <div class="kart-candies" aria-label="${words.candies}">${CANDY}<b data-value="candies">0</b></div>
        <div class="kart-slot" data-state="empty" role="img" aria-label="${words.itemSlot}"><span class="kart-slot-art">${BAG}</span><b class="kart-slot-count" hidden></b></div>
        <button class="kart-pause" data-action="pause" aria-label="${words.pause}">Ⅱ</button>
      </header>
      <canvas class="kart-map" width="240" height="240" role="img" aria-label="${words.map}"></canvas>
      <ol class="kart-ranks" aria-hidden="true"></ol>
      <div class="kart-countdown" aria-live="assertive" hidden></div>
      <div class="kart-notice" role="status"></div>
      <div class="kart-dashboard"><span class="kart-speed"><b data-value="speed">0</b> ${words.speed}</span>
        <div class="kart-drift-meter" data-tier="0"><span data-value="drift">${words.sparks[0]}</span><div><i></i><u></u><u></u></div></div></div>
      <div class="kart-touch">
        <div class="kart-steering"><button data-kart-control="left" aria-label="${words.left}">‹</button><button data-kart-control="right" aria-label="${words.right}">›</button>
          <button class="kart-brake" data-kart-control="brake">${words.brake}</button></div>
        <div class="kart-pedals"><button class="kart-gas" data-kart-control="gas" hidden>${words.gas}</button>
          <button class="kart-drift" data-kart-control="drift">${words.drift}<span>↝</span></button>
          <button class="kart-item" data-kart-control="item" aria-label="${words.useItem}"><span class="kart-item-art">${BAG}</span><small>${words.item}</small></button></div>
      </div>
      <p class="kart-key-hint"></p>
    </div>
    <div class="kart-menu kart-intro">
      <div class="kart-title"><span class="kart-kicker">${words.subtitle}</span><div>${CROWN}<h1>${words.title}</h1></div><p>${words.place}</p><div class="kart-title-actions"><button class="kart-primary" data-action="start">${words.start}<span>→</span></button><button class="kart-back" data-action="exit">${words.back}</button></div></div>
      <div class="kart-start-card"><p class="kart-lore">${words.story}</p>
        <div class="kart-lessons" aria-label="${words.controlsLabel}"><div><b>↔</b><strong>${words.steer}</strong><span>${words.steerTip}</span></div><div><b>↝</b><strong>${words.drift}</strong><span>${words.driftTip}</span></div><div><b class="kart-lesson-art">${BAG}</b><strong>${words.item}</strong><span>${words.itemTip}</span></div></div>
        <p class="kart-more">${words.moreTips}</p>
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
    <div class="kart-menu kart-results" hidden><div class="kart-paper">${CROWN}<span class="kart-kicker">${words.finish}</span><h2></h2><p class="kart-result-place"></p><div class="kart-result-time"></div><ol class="kart-result-order" aria-label="${words.standings}"></ol><ol class="kart-result-laps"></ol><p class="kart-result-record"></p><p class="kart-result-storage"></p><button class="kart-primary" data-action="restart">${words.again}<span>→</span></button><button class="kart-back" data-action="exit">${words.back}</button></div></div>
    <div class="kart-menu kart-error" hidden><div class="kart-paper"><h2>${words.paused}</h2><p>${words.pictureLost}</p><button class="kart-primary" data-action="exit">${words.back}</button></div></div>
    <span class="kart-announcement" aria-live="polite" aria-atomic="true"></span>`;
  const query = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const canvas = query<HTMLCanvasElement>('.kart-canvas');
  const intro = query('.kart-intro'), pausedPanel = query('.kart-paused'), results = query('.kart-results'), errorPanel = query('.kart-error'), raceUi = query('.kart-race-ui');
  const mapCanvas = query<HTMLCanvasElement>('.kart-map'), map = mapCanvas.getContext('2d');
  const el = {
    position: query('[data-value="position"]'), lap: query('[data-value="lap"]'), time: query('[data-value="time"]'), speed: query('[data-value="speed"]'),
    candies: query('[data-value="candies"]'), candyBox: query('.kart-candies'), drift: query('[data-value="drift"]'), meter: query('.kart-drift-meter'),
    fill: query('.kart-drift-meter i'), slot: query('.kart-slot'), slotArt: query('.kart-slot-art'), slotCount: query('.kart-slot-count'),
    itemButton: query('.kart-item'), itemArt: query('.kart-item-art'), ranks: query('.kart-ranks'), notice: query('.kart-notice'),
    countdown: query('.kart-countdown'), announcement: query('.kart-announcement'),
  };
  const recordStore = createKartRecords(options.storage, options.playerId);
  let easy = false, race = createRace({ difficulty: 'normal' }), disposed = false, suspended = false, mode: 'intro' | 'race' | 'paused' | 'result' | 'error' = 'intro';
  let raf = 0, previous = 0, frames = 0, lastTenth = -1, lastCountdown = -1, noticeUntil = 0, noticeRank = 0;
  let shownPlace = 0, placeClock = 0, shownItem = '', rouletteTick = -1, shownTier = -1, shownFill = -1, shownCandies = -1, shownRanks = '', hitUntil = 0, visited = 1;
  let padSelect = false, padBack = false, padDirection = 0, throttle = 0;
  let view: ReturnType<typeof createKartView> | undefined;
  let sound: ReturnType<typeof createKartAudio> | undefined;
  let input: ReturnType<typeof createKartInput> | undefined;
  let resize: ResizeObserver | undefined;
  const abort = new AbortController(), listeners = { signal: abort.signal };
  const NO_EVENTS: KartEvent[] = [];
  const outline = Array.from({ length: 321 }, (_, i) => race.track.point(race.track.length * i / 320));
  const { minX, maxX, minZ, maxZ } = race.track.bounds;
  const mapScale = 204 / Math.max(maxX - minX, maxZ - minZ), mx = (minX + maxX) / 2, mz = (minZ + maxZ) / 2;
  // The course is drawn once; only the eight dots move.
  const mapBase = document.createElement('canvas'); mapBase.width = mapBase.height = 240;
  {
    const c = mapBase.getContext('2d');
    if (c) {
      const path = () => { c.beginPath(); outline.forEach((p, i) => { const x = 120 + (p.x - mx) * mapScale, y = 120 + (p.z - mz) * mapScale; if (i) c.lineTo(x, y); else c.moveTo(x, y); }); c.closePath(); };
      c.lineJoin = 'round';
      path(); c.strokeStyle = '#10222d'; c.lineWidth = 15; c.stroke();
      path(); c.strokeStyle = '#fff4d6'; c.lineWidth = 7; c.stroke();
      const start = outline[0]!; c.fillStyle = '#10222d'; c.fillRect(120 + (start.x - mx) * mapScale - 2, 120 + (start.z - mz) * mapScale - 7, 4, 14);
    }
  }
  const mapPoint = race.track.point(0);
  function drawMap(): void {
    if (!map) return;
    map.clearRect(0, 0, 240, 240); map.drawImage(mapBase, 0, 0);
    for (const kart of [...race.state.karts.slice(1), race.state.player]) {
      const p = race.track.point(kart.distance, kart.lane, mapPoint), me = kart.index === 0;
      map.beginPath(); map.arc(120 + (p.x - mx) * mapScale, 120 + (p.z - mz) * mapScale, me ? 9 : 6, 0, Math.PI * 2);
      map.fillStyle = hex(kart.color); map.fill(); map.strokeStyle = me ? '#ffffff' : '#10222d'; map.lineWidth = me ? 3 : 2; map.stroke();
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
    if (next !== 'race') root.classList.remove('kart-boosting', 'kart-hit');
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
    race = createRace({ difficulty: easy ? 'easy' : 'normal' });
    lastCountdown = -1; lastTenth = -1; noticeUntil = noticeRank = 0; shownPlace = 0; placeClock = 0; shownItem = ''; rouletteTick = -1; shownTier = shownFill = shownCandies = -1; shownRanks = ''; hitUntil = 0; visited = 1;
    el.notice.textContent = ''; el.announcement.textContent = '';
    sound?.unlock(); show('race'); drawHud(true);
  }
  function pauseRace(): void {
    if (disposed || suspended) return;
    if (mode === 'race') show('paused');
    else if (mode === 'paused' && !suspended) { sound?.unlock(); show('race'); }
    else if (mode === 'intro' || mode === 'result' || mode === 'error') options.onClose();
  }
  /** A line over the road. A weightier line is not pushed aside by a lighter one while it is still up. */
  function notice(text: string, rank = 1, seconds = 1.9): void {
    if (rank < noticeRank && race.state.elapsed < noticeUntil) return;
    el.notice.textContent = text; el.notice.dataset.rank = String(rank); noticeUntil = race.state.elapsed + seconds; noticeRank = rank;
    el.notice.classList.remove('kart-pop'); void el.notice.offsetWidth; el.notice.classList.add('kart-pop');
  }
  function finishRace(): void {
    const result = race.state.result;
    if (!result) return;
    const saved = recordStore.finish(easy, { race: result.elapsed, lap: result.bestLap });
    results.querySelector('h2')!.textContent = result.place === 1 ? words.winner : result.place <= 3 ? words.podium : words.finishHint;
    query('.kart-result-place').textContent = words.result.replace('{place}', String(result.place));
    query('.kart-result-time').textContent = kartTime(result.elapsed);
    query('.kart-result-order').replaceChildren(...result.order.map((entry, i) => {
      const li = document.createElement('li'), dot = document.createElement('i'), name = document.createElement('span'), time = document.createElement('b');
      const kart = race.state.karts.find(k => k.id === entry.id)!;
      if (entry.id === 'player') li.className = 'is-me';
      dot.style.background = hex(kart.color); name.textContent = `${words.ordinals[i]} ${words.racers[entry.id]}`; time.textContent = kartTime(entry.time);
      li.append(dot, name, time); return li;
    }));
    query('.kart-result-laps').replaceChildren(...result.lapTimes.map((time, i) => { const li = document.createElement('li'); li.textContent = `${words.lap} ${i + 1} `; const b = document.createElement('b'); b.textContent = kartTime(time); li.append(b); return li; }));
    query('.kart-result-record').textContent = saved.improved ? words.newRecord : `${words.bestLap}: ${kartTime(result.bestLap)}`;
    query('.kart-result-storage').textContent = saved.saved ? words.recordLocal : words.recordUnavailable;
    show('result');
    // The finish cue is allowed through while the result is first shown, then silence again.
    sound?.suspend(false);
    sound?.tick(soundState(), 0);
    sound?.event(result.place <= 3 ? 'win' : 'finish');
  }
  function soundState() {
    const player = race.state.player, phase = mode === 'race' ? race.state.phase : mode === 'result' ? 'finished' as const : 'menu' as const;
    return {
      speed: Math.abs(player.speed), throttle, drifting: player.drift !== 0, driftTier: player.driftTier as 0 | 1 | 2 | 3,
      boost: player.boostTime > 0 ? 1 : 0, airborne: player.airborne, surface: player.surface,
      zone: race.track.zone(player.distance) as 0 | 1 | 2 | 3 | 4, finalLap: player.lap >= LAPS, star: player.star > 0, phase,
    };
  }
  /** What the race just did, as sound and as words. Rivals are heard when they are near. */
  function hear(events: readonly KartEvent[]): void {
    const player = race.state.player;
    for (const event of events) {
      if (event.type === 'go') { sound?.event('go'); continue; }
      if (event.type === 'shotEnd') continue;
      const mine = event.kart === 0, kart = race.state.karts[event.kart]!;
      const near = mine ? 1 : Math.max(0, 1 - Math.abs(trackGap(player.distance, kart.distance)) / EARSHOT) * .7;
      const play = (name: KartSoundEvent, gain = 1) => { if (near > .02) sound?.event(name, near * gain); };
      switch (event.type) {
        case 'hop': if (mine) play('hop'); break;
        case 'trick': play('trick'); if (mine) notice(words.trick, 2, 1.2); break;
        case 'land': if (event.air > .22) play('land'); break;
        case 'tier': if (mine) play('tier'); break;
        case 'draft': if (mine) { play('draft'); notice(words.draft, 1, 1.2); } break;
        case 'boost':
          if (event.kind === 'turbo1' || event.kind === 'turbo2' || event.kind === 'turbo3') { play(event.kind, mine ? 1 : .6); if (mine) notice(words.turbo[Number(event.kind.slice(5)) - 1]!, 1, 1.1); }
          else if (event.kind === 'start') { play('startBoost'); if (mine) notice(words.rocket, 2, 1.4); }
          else if (event.kind === 'pad') play('pad', mine ? 1 : .5);
          else if (event.kind === 'sweet') play('boost', mine ? 1 : .6);
          break;
        case 'wall': if (mine) play('wall', .5 + event.force * .5); break;
        case 'bump': if (mine || event.other === 0) sound?.event('bump'); break;
        case 'box': play('box'); break;
        case 'item': if (mine) { play('itemReady'); notice(`${words.items[event.item]} – ${words.itemTips[event.item]}`, 2, 2.4); el.announcement.textContent = words.items[event.item]; } break;
        case 'use':
          if (event.item === 'cone' || event.item === 'bee') play('throw'); else if (event.item === 'gum') play('drop');
          else if (event.item === 'floss') play('shield'); else if (event.item === 'rainbow') play('star'); else if (event.item === 'cloud') sound?.event('cloud', mine ? 1 : .6);
          break;
        case 'hit':
          play(mine ? 'hit' : 'spin');
          if (mine) { notice(words.hits[event.kind], 3, 2.2); hitUntil = race.state.elapsed + .5; root.classList.add('kart-hit'); }
          else if (event.by === 0) notice(words.youHit.replace('{name}', words.racers[kart.id]), 2, 1.8);
          break;
        case 'cloud': if (mine) notice(words.rained, 3, 2.2); break;
        case 'shieldPop': play('shieldPop'); if (mine) notice(words.shieldSaved, 3, 1.8); break;
        case 'candy': if (mine) play('candy'); break;
        case 'candyLost': play('candyLost'); break;
        case 'lap':
          if (!mine) break;
          sound?.event(event.lap >= LAPS ? 'finalLap' : 'lap');
          notice(event.lap >= LAPS ? words.finalLap : words.lapAnnouncement.replace('{lap}', String(event.lap)), 3, 2.6);
          el.announcement.textContent = el.notice.textContent;
          break;
        default: break;
      }
    }
  }
  function drawHud(force = false): void {
    const state = race.state, player = state.player, tenth = Math.floor(state.elapsed * 10);
    // The place, with a little wait so two karts swapping places do not make it flicker.
    if (state.position !== shownPlace && (force || state.elapsed >= placeClock)) {
      if (shownPlace && state.phase === 'racing') sound?.event(state.position < shownPlace ? 'passUp' : 'passDown');
      shownPlace = state.position; placeClock = state.elapsed + .35;
      el.position.textContent = words.ordinals[state.position - 1]!; el.position.parentElement!.dataset.place = String(state.position);
      el.position.classList.remove('kart-pop'); void el.position.offsetWidth; el.position.classList.add('kart-pop');
    }
    // The spark meter and the item slot follow every frame, but touch the page only when they change.
    const tier = player.driftTier, charge = player.drift ? Math.min(1, player.driftCharge / DRIFT_TIERS[2]) : 0, fill = Math.round(charge * 50);
    if (tier !== shownTier || player.boostTime > 0 !== (shownTier === 9)) {
      shownTier = player.boostTime > 0 && !player.drift ? 9 : tier;
      el.meter.dataset.tier = String(tier); el.drift.textContent = shownTier === 9 ? words.boostActive : words.sparks[tier]!;
    }
    if (fill !== shownFill) { shownFill = fill; el.fill.style.width = `${fill * 2}%`; }
    const spinning = player.roulette > 0, flick = spinning ? Math.floor((ROULETTE_SECONDS - player.roulette) * 12) : -1;
    const item: ItemId | null = spinning ? ROULETTE_ORDER[flick % ROULETTE_ORDER.length]! : player.item, key = `${item}:${player.itemCount}:${spinning}`;
    if (key !== shownItem) {
      shownItem = key;
      const art = item ? ITEM_ICONS[item] : BAG;
      el.slotArt.innerHTML = art; el.itemArt.innerHTML = art;
      el.slot.dataset.state = spinning ? 'rolling' : item ? 'ready' : 'empty';
      el.slot.setAttribute('aria-label', item && !spinning ? words.items[item] : words.itemEmpty);
      el.slotCount.hidden = spinning || player.itemCount < 2; el.slotCount.textContent = String(player.itemCount);
      el.itemButton.classList.toggle('is-ready', !!item && !spinning); el.itemButton.setAttribute('aria-disabled', String(!item || spinning));
    }
    if (flick !== rouletteTick) { rouletteTick = flick; if (spinning) sound?.event('roulette'); }
    if (player.candies !== shownCandies) {
      shownCandies = player.candies; el.candies.textContent = String(player.candies);
      el.candyBox.classList.toggle('is-full', player.candies >= MAX_CANDIES);
      el.candyBox.classList.remove('kart-pop'); void el.candyBox.offsetWidth; el.candyBox.classList.add('kart-pop');
    }
    root.classList.toggle('kart-boosting', player.boostTime > 0 && !options.calm);
    root.classList.toggle('kart-star', player.star > 0 && !options.calm);
    if (hitUntil && state.elapsed > hitUntil) { hitUntil = 0; root.classList.remove('kart-hit'); }
    const count = state.phase === 'countdown' ? Math.max(1, Math.ceil(state.countdown)) : state.elapsed < .8 ? 0 : -1;
    if (count !== lastCountdown) {
      el.countdown.hidden = count < 0; el.countdown.textContent = count > 0 ? String(count) : count === 0 ? words.go : '';
      el.countdown.classList.remove('kart-pop'); void el.countdown.offsetWidth; el.countdown.classList.add('kart-pop');
      if (count > 0) sound?.event('countdown');
      lastCountdown = count;
    }
    if (player.wrongWay > .5) notice(words.wrongWay, 4, .4);
    // Each place's name, the first time the player drives into it.
    const zone = race.track.zone(player.distance);
    if (state.phase === 'racing' && !(visited & 1 << zone)) { visited |= 1 << zone; notice(words.zones[zone]!, 1, 2); }
    if (noticeUntil && state.elapsed > noticeUntil) { el.notice.textContent = ''; noticeUntil = noticeRank = 0; }
    if (!force && tenth === lastTenth) return;
    lastTenth = tenth;
    el.lap.textContent = `${Math.min(LAPS, player.lap)}/${state.laps}`;
    el.time.textContent = kartTime(state.elapsed);
    el.speed.textContent = String(Math.round(Math.max(0, player.speed) * 3.6));
    const ranks = [...state.karts].sort((a, b) => a.place - b.place).map(kart => kart.index).join('');
    if (ranks !== shownRanks) {
      shownRanks = ranks;
      el.ranks.replaceChildren(...[...state.karts].sort((a, b) => a.place - b.place).map(kart => {
        const li = document.createElement('li'), dot = document.createElement('i');
        dot.style.background = hex(kart.color); li.append(dot, words.racers[kart.id]);
        if (kart.index === 0) li.className = 'is-me';
        return li;
      }));
    }
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
    let events = NO_EVENTS;
    if (mode === 'race') {
      const controls = input!.read(dt);
      // read() may open Pause on this exact frame: do not simulate a final unowned step.
      if (disposed || mode !== 'race') return;
      throttle = controls.throttle;
      const before = race.state.phase;
      race.tick(controls, dt); events = race.takeEvents();
      hear(events); drawHud();
      sound?.tick(soundState(), dt);
      if (race.state.phase === 'finished' && before !== 'finished') finishRace();
    } else pollMenu();
    if (disposed || mode === 'error' || mode === 'paused') return;
    view?.render(race, dt, mode === 'intro' ? 'menu' : mode === 'result' ? 'result' : 'race', events); frames++;
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
    // For the development page and review pictures only: put the player somewhere, or hand it something.
    poke: options.debug ? values => { Object.assign(race.state.player, values); } : undefined,
    debug: () => {
      if (!options.debug) return {};
      const state = race.state, player = state.player;
      return {
        mode, suspended, frames, phase: state.phase, elapsed: state.elapsed, countdown: state.countdown,
        distance: player.distance, lane: player.lane, speed: player.speed, heading: player.heading,
        position: state.position, lap: player.lap, drift: player.drift, driftCharge: player.driftCharge, driftTier: player.driftTier,
        boostTime: player.boostTime, boostKind: player.boostKind, item: player.item, roulette: player.roulette, candies: player.candies,
        airborne: player.airborne, surface: player.surface, spin: player.spin, shots: state.shots.length,
        result: state.result, autoGas: input?.autoGas, device: input?.device, render: view?.stats(),
        karts: state.karts.map(({ id, distance, lane, heading, speed, place, item, finishTime }) => ({ id, distance, lane, heading, speed, place, item, finishTime })),
      };
    },
  };
}
