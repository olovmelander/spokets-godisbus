import { stubCanvas } from './canvas-stub';
import { Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stormkvall } from '../../src/content/aventyr2/chapters/stormkvall';
import { morgonen } from '../../src/content/aventyr2/chapters/morgonen';
import { CANDLES_LIT, electricLight, POWER_FLICKER, POWER_GOES, POWER_OUT, powerGone } from '../../src/content/home-power';
import { homeConsoleAvailable } from '../../src/app/home-console';
import { HOME_LAYOUT } from '../../src/content/home-layout';
import { createStage } from '../../src/render/stage';
import { talk } from '../../src/render/talk';

beforeEach(() => { stubCanvas(); talk.reset(); });
afterEach(() => { vi.unstubAllGlobals(); talk.reset(); });

const scene = (id: string) => stormkvall.scenes!.find((one) => one.id === id)!;
const before = (id: string) => new Set(stormkvall.scenes!.slice(0, stormkvall.scenes!.findIndex((one) => one.id === id)).map((one) => `scene:${one.id}`));

describe('the power cut on the evening of the storm (Olov, 12 November 2026)', () => {
  it('has the room lit as the evening opens, flickering and going out once the picture is up, and the candle lit after', () => {
    const kvall = scene('kvall');
    const fadeEnds = kvall.stage!.fade!.reduce((end, key) => Math.max(end, key.at + (key.move ?? 0)), 0);
    // The lit room is seen for a moment after the fade from black, before the lamps flicker.
    expect(POWER_FLICKER).toBeGreaterThan(fadeEnds + 0.5);
    const cue = (flag: string) => kvall.cues!.find((one) => one.flag === flag)!.at;
    expect(cue(POWER_OUT)).toBe(POWER_GOES);
    // Mamma lights the candle in the dark, as she says so, a moment after the lamps have gone.
    expect(cue(CANDLES_LIT)).toBeGreaterThan(POWER_GOES + 0.5);
    expect(kvall.lines![0]).toMatchObject({ who: 'mamma', line: 'skPower', at: cue(CANDLES_LIT) });
    const lift = kvall.stage!.actors!.mamma!.find((key) => key.act === 'lift')!;
    expect(lift.at).toBeGreaterThan(POWER_GOES);
    expect(cue(CANDLES_LIT) - lift.at).toBeGreaterThan(0.8);
    // The candle stands on the table from the start, unlit: it is never hidden until the cue.
    const candle = stormkvall.decor!.find((one) => one.look === 'candle')!;
    expect(candle.after).toBeUndefined();
    expect(stormkvall.storm!.glows!.every((glow) => glow.after === CANDLES_LIT)).toBe(true);

    const at = (seconds: number, flags: string[] = []) => electricLight('stormkvall', new Set(flags), { id: 'kvall', seconds });
    expect(at(0)).toBe(1);
    expect(at(POWER_FLICKER - 0.01)).toBe(1);
    const flicker = Array.from({ length: 30 }, (_, i) => at(POWER_FLICKER + (POWER_GOES - POWER_FLICKER) * i / 30));
    expect(Math.min(...flicker)).toBeLessThan(0.2);
    expect(Math.max(...flicker)).toBeGreaterThan(0.7);
    expect(at(POWER_GOES)).toBe(0);
    expect(at(1, [POWER_OUT])).toBe(0);
    // Reduced motion: no flicker, the lamps go out at once.
    expect(electricLight('stormkvall', new Set(), { id: 'kvall', seconds: POWER_FLICKER + 0.1 }, true)).toBe(1);
    // A game taken up later finds the power out; other homes are never without it.
    expect(electricLight('stormkvall', new Set(['scene:kvall']), null)).toBe(0);
    expect(electricLight('morgonen', new Set([POWER_OUT]), null)).toBe(1);
  });

  it('offers no TV game once the power has gone, and offers it again the morning after', () => {
    const atTv = { x: HOME_LAYOUT.television.x, y: 0, grounded: true, mode: 'free' as const };
    expect(homeConsoleAvailable(stormkvall, atTv, false, new Set())).toBe(true);
    for (const flags of [[POWER_OUT], [CANDLES_LIT], ['scene:kvall', 'lamp:give', 'scene:tillsammans']]) {
      expect(powerGone('stormkvall', new Set(flags))).toBe(true);
      expect(homeConsoleAvailable(stormkvall, atTv, false, new Set(flags))).toBe(false);
    }
    expect(homeConsoleAvailable(morgonen, atTv, false, new Set([POWER_OUT, 'scene:frukost']))).toBe(true);
  });

  it('has Pappa shine his lamp out through the window as he pulls it to, not straight up the wall', () => {
    const stage = createStage(stormkvall, () => 0), lamp = stage.group.getObjectByName('stage-thing:lamp-pappa')!;
    const flags = before('klonkstar');
    for (const flag of ['lamp:give', 'gust', 'goodnight']) flags.add(flag);
    const window = { x: stormkvall.house!.opens!, y: 6, z: -8.9 };
    let clock = 0;
    for (let i = 0; i <= 6 * 60; i++) {
      const t = i / 60;
      clock += 1 / 60;
      if (t >= 2.0) flags.add('window:shut');
      stage.update({ id: 'klonkstar', seconds: t }, flags, { x: 4.2, y: 0 }, clock, 1 / 60, false);
      if (t < 1.6) continue;
      const beam = new Vector3(0, 0, 1).applyQuaternion(lamp.quaternion);
      expect(beam.y, `at ${t.toFixed(2)}`).toBeLessThan(0.5);
      expect(beam.z, `at ${t.toFixed(2)}`).toBeLessThan(-0.75);
      // The lamp is in the room, and its beam crosses the wall within the window (its glass, or its open frame).
      if (flags.has('window:shut')) expect(lamp.position.z, `at ${t.toFixed(2)}`).toBeGreaterThan(window.z);
      const along = (window.z - lamp.position.z) / beam.z, through = lamp.position.clone().addScaledVector(beam, along);
      expect(Math.abs(through.x - window.x), `at ${t.toFixed(2)}`).toBeLessThan(2.4);
      expect(Math.abs(through.y - window.y), `at ${t.toFixed(2)} from ${lamp.position.toArray().map((v) => v.toFixed(2))} along ${beam.toArray().map((v) => v.toFixed(2))}`).toBeLessThan(2.75);
    }
  });

  it('has Pappa carry his lamp low, the torch running on from his forearm, kneeling and getting ready', () => {
    const stage = createStage(stormkvall, () => 0), lamp = stage.group.getObjectByName('stage-thing:lamp-pappa')!;
    const rig = stage.actors.get('pappa')!.rig;
    const shoulder = new Vector3(), elbow = new Vector3(), wrist = new Vector3();
    let clock = 0;
    // Kneeling by him once he has come down to them, and standing to get ready (before the coats go on).
    for (const [id, from, until] of [['upptackt', 4.8, 9], ['tillsammans', 0.5, 3.5]] as const) {
      const flags = before(id);
      flags.add('lamp:give'); flags.add('star');
      for (let i = 0; i <= until * 60; i++) {
        const t = i / 60;
        clock += 1 / 60;
        stage.update({ id, seconds: t }, flags, { x: 6.4, y: 0 }, clock, 1 / 60, false);
        if (t < from) continue;
        rig.arm!(0, shoulder, elbow, wrist);
        const forearm = wrist.clone().sub(elbow).normalize(), beam = new Vector3(0, 0, 1).applyQuaternion(lamp.quaternion);
        expect(forearm.angleTo(beam), `${id} at ${t.toFixed(2)}`).toBeLessThan(0.9);
        expect(lamp.position.y, `${id} at ${t.toFixed(2)}`).toBeLessThan(shoulder.y - 0.2);
      }
    }
  });

  it('brings the family to Elof on ways that do not cross, once they have found him small', () => {
    const stage = createStage(stormkvall, () => 0), flags = before('upptackt');
    flags.add('lamp:give'); flags.add('star');
    // Where the scenes before left them.
    stage.update({ id: 'krymper', seconds: 7.8 }, new Set([...flags].filter((flag) => flag !== 'scene:krymper')), { x: 6.4, y: 0 }, 0, 0, false);
    const who = ['mamma', 'pappa', 'moa', 'bertil'] as const;
    let nearest = Infinity, pair = '';
    for (let i = 0; i <= 9.4 * 30; i++) {
      const t = i / 30;
      stage.update({ id: 'upptackt', seconds: t }, flags, { x: 6.4, y: 0 }, t, 1 / 30, false);
      const at = who.map((one) => stage.actors.get(one)!.rig.group.position);
      for (let a = 0; a < at.length; a++) for (let b = a + 1; b < at.length; b++) {
        const d = Math.hypot(at[a]!.x - at[b]!.x, at[a]!.z - at[b]!.z);
        if (d < nearest) { nearest = d; pair = `${who[a]}-${who[b]} at ${t.toFixed(2)}`; }
      }
    }
    expect(nearest, pair).toBeGreaterThan(1.4);
  });
});
