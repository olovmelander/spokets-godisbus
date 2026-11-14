// dev/kart.html: Godisracet on its own, without the house (plan §6.10). Served by `npm run dev` only.
// ?track=cup|garden|bog|mountain|varggropen, ?cc=50|100|150, ?level=easy|normal|hard, ?tier=low|mid|high,
// ?calm, ?mute, ?start (skips the title page) and ?auto choose how it opens.
// `window.__kart` is the session: debug() is what the browser checks and the review pictures read, and
// poke({ distance: 500, lane: 0 }) or poke({ item: 'bee' }) sets the player up for a picture.
// ?auto drives with the real keys, for pictures of whole laps, and drives on through a cup.
import { openKart, type KartSession } from '../src/kart/game';
import { DRIFT_RATE, TOP_SPEED, turnRate } from '../src/kart/sim/kart';
import { racingLine, type TrackId } from '../src/kart/sim/race';
import { getTrack } from '../src/kart/sim/track';
import '../src/ui/ui.css';

const params = new URLSearchParams(location.search);
const tier = params.get('tier');
const host = document.getElementById('host')!;
const click = (selector: string) => host.querySelector<HTMLElement>(selector)?.click();
let session: KartSession | undefined;
async function open(): Promise<void> {
  session?.dispose();
  session = await openKart({
    host, onClose: () => { void open(); },
    effects: params.has('mute') ? 0 : .8, music: params.has('mute') ? 0 : .6,
    calm: params.has('calm'), tier: tier === 'low' || tier === 'mid' ? tier : 'high',
    storage: null, playerId: 'dev', debug: true,
  });
  (window as unknown as { __kart: KartSession }).__kart = session;
  if (params.has('track')) click(`[data-track="${params.get('track')}"]`);
  if (params.has('cc')) click(`[data-cc="${params.get('cc')}"]`);
  if (params.has('level')) click(`.kart-modes [data-action="${params.get('level')}"]`);
  if (params.has('start')) click('[data-action="start"]');
}
void open();

if (params.has('auto')) {
  // A driver at the keyboard: it follows the racing line, hops into a drift where the bend asks for one,
  // and uses what it picks up. It presses the same keys a player does.
  const held = new Set<string>();
  const press = (code: string, down: boolean) => {
    if (held.has(code) === down) return;
    if (down) held.add(code); else held.delete(code);
    window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true, cancelable: true }));
  };
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  let side = 0, carry = 0, itemClock = 0, frames = 0;
  const drive = () => {
    requestAnimationFrame(drive);
    const d = session?.debug() as { mode?: string; phase?: string; track?: TrackId; cc?: number; countdown?: number; distance?: number; lane?: number; heading?: number; speed?: number; item?: string | null; drift?: number } | undefined;
    if (d?.mode === 'result' && frames++ % 240 === 239) click('.kart-results [data-action="next"]:not([hidden])');   // on to the cup's next race
    if (!d || d.mode !== 'race' || d.distance === undefined || !d.track) { for (const code of [...held]) press(code, false); side = 0; return; }
    if (d.phase === 'countdown') { press('Space', (d.countdown ?? 3) < .9); return; }
    const track = getTrack(d.track), line = racingLine(d.track), top = TOP_SPEED * (d.cc ?? 150) / 150;
    const v = Math.max(0, d.speed ?? 0), look = 6 + v * .34, lane = d.lane ?? 0, s = d.distance;
    const bend = track.curvature(s + look * .4), wanted = Math.atan2(line.laneAt(s + look) - lane, look);
    const omega = Math.max(v, 4) * (bend / Math.max(.3, 1 - bend * lane) + 2 * Math.sin(wanted - (d.heading ?? 0)) / look);
    const plain = omega / Math.max(.05, turnRate(v));
    let steer = clamp(plain, -1, 1);
    if (!side && Math.abs(plain) > .8 && Math.abs(line.curvatureAt(s + v * .45)) > .03 && v > .55 * top) side = Math.sign(omega);
    if (side) {
      const inward = (omega * side * Math.max(v, .6 * TOP_SPEED) / TOP_SPEED - DRIFT_RATE.turn) / DRIFT_RATE.range;
      steer = side * (d.drift ? clamp(inward, -1, 1) : Math.max(.6, clamp(inward, -1, 1)));
      if (inward < -1.05 || v < .4 * top) side = 0;
    }
    // Keys are all or nothing: a steady share of frames gives the amount of wheel wanted.
    carry += steer; const key = carry > .5 ? 1 : carry < -.5 ? -1 : 0; carry -= key;
    press('ArrowLeft', key > 0); press('ArrowRight', key < 0); press('Space', side !== 0 || track.onRamp(s + 1, lane));
    itemClock = d.item ? itemClock + 1 : 0;
    if (itemClock > 80 && frames % 12 === 0) { press('KeyE', true); itemClock = 0; } else press('KeyE', false);
    frames++;
  };
  requestAnimationFrame(drive);
}
