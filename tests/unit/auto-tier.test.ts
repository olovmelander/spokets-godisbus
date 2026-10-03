import { describe, expect, it } from 'vitest';
import { AUTO_SETTLE, AUTO_TRIAL, createAutoTier, type Tier } from '../../src/render/quality';

/**
 * Plays for `seconds` on a device whose frames take `frame(tier)` seconds, and tells every tier it was in.
 * `hitch` puts one long frame in at that second.
 */
function play(seconds: number, frame: (tier: Tier) => number, hitch?: { at: number; seconds: number }) {
  const auto = createAutoTier();
  const tiers: Tier[] = ['mid'];
  let hitched = false;
  for (let time = 0; time < seconds; ) {
    let dt = frame(auto.tier);
    if (hitch && !hitched && time >= hitch.at) {
      dt = hitch.seconds;
      hitched = true;
    }
    time += dt;
    const next = auto.feed(dt);
    if (next !== tiers[tiers.length - 1]) tiers.push(next);
  }
  return { auto, tiers };
}

describe('Auto, the graphics level that finds its own place', () => {
  it('goes up to High on a device that keeps up, and stays there', () => {
    const { auto, tiers } = play(30, () => 1 / 60);
    expect(tiers).toEqual(['mid', 'high']);
    expect(auto.settled).toBe(true);
    // It took the first second, the measuring at Mid, the change and the try: about ten seconds.
    const quick = play(1 + AUTO_SETTLE + 0.5 + AUTO_TRIAL + 0.2, () => 1 / 60);
    expect(quick.auto.settled).toBe(true);
    expect(quick.auto.tier).toBe('high');
  });

  it('comes back to Mid when High makes the frames late, and never tries again', () => {
    const { auto, tiers } = play(60, (tier) => (tier === 'high' ? 1 / 38 : 1 / 60));
    expect(tiers).toEqual(['mid', 'high', 'mid']);
    expect(auto.settled).toBe(true);
    expect(auto.tier).toBe('mid');
  });

  it('never tries High on a device that is already slow at Mid', () => {
    const { auto, tiers } = play(30, () => 1 / 30);
    expect(tiers).toEqual(['mid']);
    expect(auto.settled).toBe(true);
  });

  it('one long frame during the try does not cost it High', () => {
    const { auto } = play(30, () => 1 / 60, { at: 7, seconds: 0.2 });
    expect(auto.tier).toBe('high');
  });

  it('measures against the screen it is on: at 120 frames a second, sixty is late', () => {
    expect(play(30, () => 1 / 120).auto.tier).toBe('high');
    expect(play(30, (tier) => (tier === 'high' ? 1 / 60 : 1 / 120)).auto.tier).toBe('mid');
  });

  it('is not misled by the first second, with the loading in it', () => {
    let time = 0;
    const { auto } = play(30, () => {
      time += 1 / 60;
      return time < 0.3 ? 0.15 : 1 / 60;
    });
    expect(auto.tier).toBe('high');
  });

  it('takes no notice of a frame with no time in it', () => {
    const auto = createAutoTier();
    expect(auto.feed(0)).toBe('mid');
    expect(auto.feed(Number.NaN)).toBe('mid');
    expect(auto.settled).toBe(false);
  });
});
