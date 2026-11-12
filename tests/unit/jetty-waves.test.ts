import { PerspectiveCamera } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { billsta } from '../../src/content/aventyr2/chapters/billsta';
import { flarken } from '../../src/content/aventyr2/chapters/flarken';
import { stormgard } from '../../src/content/aventyr2/chapters/stormgard';
import { createJettyWaves, DECK, jettyGusts, leeAt, LEE, rushAt } from '../../src/render/jetty-waves';
import { GUST_SHELTER } from '../../src/sim/constants';
import { stubCanvas } from './canvas-stub';

beforeEach(() => stubCanvas());
afterEach(() => vi.unstubAllGlobals());

/**
 * The waves over Flärken's jetty (Olov, 12 November 2026: "Elof säger, vågor, jag gömmer mig bakom stolparna, men man
 * ser bara vind"): the gusts there are drawn as the lake washing over the planks, dry in each post's lee.
 */
describe("the waves over Flärken's jetty", () => {
  const gust = flarken.gusts![0]!;

  it('are the jetty’s, where the gusts’ shelters are its posts, and nowhere else', () => {
    expect(jettyGusts(flarken)).toEqual([0]);
    expect(jettyGusts(billsta)).toEqual([]);
    expect(jettyGusts(stormgard)).toEqual([]);
  });

  it('leave the planks dry in front of each post, where he is sheltered, and wash over them between', () => {
    for (const post of gust.shelters) {
      expect(leeAt(gust, post, 0)).toBe(1);
      expect(leeAt(gust, post + LEE.dry, 0)).toBeCloseTo(1, 5);
      // Never dry where the gust takes him: the drawn lee is within the simulation's.
      expect(leeAt(gust, post + GUST_SHELTER + 0.05, 0)).toBe(0);
      // Behind the post the wave comes in against it.
      expect(leeAt(gust, post, DECK.back)).toBe(0);
    }
    expect(LEE.dry).toBeLessThan(GUST_SHELTER);
    for (let i = 1; i < gust.shelters.length; i++) expect(leeAt(gust, (gust.shelters[i - 1]! + gust.shelters[i]!) / 2, 0)).toBe(0);
  });

  it('come over the planks to their front edge as a gust begins, stay while it blows, and drain after it', () => {
    expect(rushAt(0, 0, false).front).toBeCloseTo(DECK.back, 5);
    expect(rushAt(0.6, 0, false).front).toBeCloseTo(DECK.front, 5);
    // Higher than the planks against their back edge as it breaks, and knee-deep over them.
    expect(rushAt(0.12, 0, false).back).toBeGreaterThan(gust.y - flarken.water![1]!.y + 0.5);
    expect(rushAt(0.3, 0, false).deep).toBeGreaterThan(0.3);
    expect(rushAt(gust.length, 0, false).wet).toBe(1);
    expect(rushAt(gust.length, 0.8, false).wet).toBe(0);
  });

  it('are drawn as the gust has it: the swell in the second before, the water and the spray while it blows', () => {
    const waves = createJettyWaves(flarken)!;
    const camera = new PerspectiveCamera();
    camera.position.set((gust.from + gust.to) / 2, 3, 20);
    const named = (name: string) => waves.group.getObjectByName(name)!;
    const frame = (blow: number, warn: number, clock: number) => waves.update({ dt: 1 / 60, clock, flags: new Set(), x: gust.from, y: gust.y, camera, still: false, tier: 'mid', riding: false, gusts: [{ blow, warn }] });
    frame(0, 0, 0);
    expect(named('jetty-water').visible).toBe(false);
    expect(named('jetty-swell').visible).toBe(false);
    frame(0, 0.6, 0.5);
    expect(named('jetty-swell').visible).toBe(true);
    expect(named('jetty-water').visible).toBe(false);
    for (let k = 1; k <= 30; k++) frame(k / 84, 0, 1 + k / 60);
    expect(named('jetty-water').visible).toBe(true);
    expect(named('jetty-pour').visible).toBe(true);
    expect(named('jetty-swell').visible).toBe(false);
    // Far from the jetty nothing is drawn.
    camera.position.x = gust.to + 80;
    frame(0.5, 0, 2);
    expect(named('jetty-water').visible).toBe(false);
  });
});
