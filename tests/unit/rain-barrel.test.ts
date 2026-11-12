import { describe, expect, it } from 'vitest';
import { stormgard } from '../../src/content/aventyr2/chapters/stormgard';
import { FLOW, flowAt, jetAt, jetFall, LID_BACK, SPOUT, TAP_Z } from '../../src/render/rain-barrel';
import { WATER_REACH } from '../../src/sim/constants';
import { AWASH, levelUnder } from '../../src/sim/water-level';
import { heightAt } from '../robot/robot';

/**
 * Stormgården's rain barrel (Olov, 12 November 2026: "att vattnet man vrider på hänger ihop med locket som kommer upp
 * visuellt"): the tap's water is seen to go into the ditch, the ditch to fill, and the lid to rise on it
 * (src/render/rain-barrel.ts). These are the numbers the picture was looked at with, at 1280×720 and 844×390.
 */
const ditch = stormgard.water!.find((w) => w.floats !== undefined)!;
const lid = stormgard.movers!.find((m) => m.id === ditch.floats)!;
const tap = stormgard.spots!.find((s) => s.look === 'tap')!;
const scene = stormgard.scenes!.find((s) => s.id === 'kranen')!;
const mouth = { x: tap.at.x + SPOUT.x, y: tap.at.y + SPOUT.y, z: TAP_Z + SPOUT.z };
const low = levelUnder(ditch, lid, lid.stops[0]!.y);
const full = levelUnder(ditch, lid, lid.stops[lid.stops.length - 1]!.y);

describe('the ditch fills under the lid', () => {
  it('stands low with the lid awash before the tap, rises with it, and is full once it lies on the banks', () => {
    expect(full).toBeCloseTo(ditch.y, 6);
    expect(lid.stops[0]!.y + lid.height - low).toBeCloseTo(AWASH, 6);
    expect(AWASH).toBeLessThan(WATER_REACH);
    // Half full: over the ditch's bottom, and more than an EL under the lawn, so that the filling is seen.
    expect(low).toBeGreaterThan(heightAt(stormgard, (ditch.from + ditch.to) / 2) + 1);
    expect(full - low).toBeGreaterThan(0.8);
    let before = -Infinity;
    for (let k = 0; k <= 1; k += 0.1) {
      const y = lid.stops[0]!.y + (lid.stops[1]!.y - lid.stops[0]!.y) * k;
      const level = levelUnder(ditch, lid, y);
      expect(level).toBeGreaterThan(before);
      // The water is never over the lid's top.
      expect(level).toBeLessThan(y + lid.height);
      before = level;
    }
  });
});

describe('the tap\'s water', () => {
  it('comes down in the ditch, in open water behind the lid, however high the water stands', () => {
    for (let k = 0; k <= 1; k += 0.125) {
      const level = low + (full - low) * k;
      const t = jetFall(mouth.y - level);
      const at = jetAt(t);
      const hit = { x: mouth.x + at.x, z: mouth.z + at.z };
      expect(hit.x, `at ${level.toFixed(2)}`).toBeGreaterThan(ditch.from + 0.2);
      expect(hit.x, `at ${level.toFixed(2)}`).toBeLessThan(ditch.to - 0.2);
      // Behind the lid's round outline (its middle a little behind the path), with room for the foam.
      const away = Math.hypot(hit.x - lid.stops[0]!.x, hit.z + LID_BACK);
      expect(away, `at ${level.toFixed(2)}`).toBeGreaterThan(lid.width / 2 + 0.4);
    }
  });

  it('clears the can and the ditch\'s near bank on its way down', () => {
    // Where it crosses the near bank's edge, it is still over the lawn.
    const t = (ditch.from - mouth.x) / (jetAt(1).x);
    expect(mouth.y + jetAt(t).y).toBeGreaterThan(heightAt(stormgard, ditch.from - 0.2) + 0.3);
    // And over the can, which stands beside the barrel.
    const can = stormgard.landmarks!.find((one) => one.look === 'can')!;
    const over = (can.to - mouth.x) / jetAt(1).x;
    expect(mouth.y + jetAt(Math.max(0, over)).y).toBeGreaterThan(heightAt(stormgard, (can.from + can.to) / 2) + 0.5);
  });

  it('comes as he watches, reaches the water as the lid begins to rise, and has all fallen in when it lies there', () => {
    const pour = scene.cues!.find((cue) => cue.flag === lid.on)!;
    expect(scene.hold).toBe(true);
    expect(scene.on).toBe(tap.id);
    expect(scene.sounds?.some((one) => one.sound === 'pour' && Math.abs(one.at - pour.at) < 0.05)).toBe(true);
    // The lid starts up within a moment of the water reaching it.
    expect(Math.abs(lid.wait! - jetFall(mouth.y - low))).toBeLessThan(0.2);
    // The barrel runs dry, and its last water is in the ditch, before the lid lies on the banks and his words come.
    expect(FLOW.dry + jetFall(mouth.y - full)).toBeLessThanOrEqual(lid.seconds!);
    expect(flowAt(FLOW.dry)).toBe(0);
    expect(flowAt(FLOW.open)).toBe(1);
    // He stands until the lid is up, and his words about it are read in the moment's picture.
    expect(scene.seconds).toBeGreaterThan(pour.at + lid.seconds!);
    expect(scene.dialogue).toEqual(['sg:lid']);
  });
});
