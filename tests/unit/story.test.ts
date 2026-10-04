import { describe, expect, it } from 'vitest';
import { epilog } from '../../src/content/chapters/ends';
import { norrsken } from '../../src/content/chapters/norrsken';
import { Sim } from '../../src/sim/sim';
import { PARTY_GUESTS, partyReward, sharingReward, type PartyGuest } from '../../src/sim/story';

const idle = { x: 0, y: 0, hopHeld: false, hop: false, act: false };
function sharing() {
  const sim = new Sim({ ...norrsken, spawn: { x: 13.4, y: 0.01 } }, {}, { flags: ['bag'] });
  for (let i = 0; i < 30; i++) sim.step(idle);
  sim.step({ ...idle, act: true });
  return sim;
}
describe('sharing choice on the summit', () => {
  it('does not award an action flag until food and recipient are chosen', () => {
    const sim = sharing();
    expect(sim.story?.kind).toBe('share');
    expect(sim.flags.has('share:tragubbe')).toBe(false);
    const x = sim.curr.x;
    for (let i = 0; i < 300; i++) sim.step({ ...idle, act: true, x: 1 });
    expect(sim.curr.x).toBe(x);
    expect(sim.flags.has('share:tragubbe')).toBe(false);
  });
  it('gives the jay only a lingonberry and never removes collected candy', () => {
    const sim = sharing();
    const candy = sim.candyCount;
    expect(sim.finishStory({ kind: 'share', friend: 'jay', sweet: 'karamell' })).toBe(false);
    expect(sim.flags.has('share:jay')).toBe(false);
    expect(sim.finishStory({ kind: 'share', friend: 'jay', sweet: 'lingon' })).toBe(true);
    expect(sim.flags.has('gift:jay:lingon')).toBe(true);
    expect(sim.candyCount).toBe(candy);
    expect(sharingReward(sim.flags, 'jay', 'lingon')).toBeNull();
  });
  it('cancellation is harmless, and the next attempt can choose either candy recipient', () => {
    const sim = sharing();
    sim.cancelStory();
    sim.step(idle);
    sim.step({ ...idle, act: true });
    expect(sim.finishStory({ kind: 'share', friend: 'spoket', sweet: 'skumbanan' })).toBe(true);
    expect(sim.flags.has('gift:spoket:skumbanan')).toBe(true);
    expect(sim.finishStory({ kind: 'share', friend: 'tragubbe', sweet: 'karamell' })).toBe(false);
  });
});

describe('choosing candy at the family party', () => {
  it('every guest likes every candy, and the bird stays outside this party choice', () => {
    for (const friend of PARTY_GUESTS) for (const sweet of ['gelehallon', 'karamell', 'skumbanan'] as const) {
      expect(partyReward(new Set(), friend, sweet)).toEqual([`party:${friend}`, `party-gift:${friend}:${sweet}`]);
    }
    expect(partyReward(new Set(), 'mamma', 'lingon')).toBeNull();
    expect(partyReward(new Set(), 'jay' as PartyGuest, 'gelehallon')).toBeNull();
    expect(partyReward(new Set(['party:moa']), 'moa', 'karamell')).toBeNull();
  });
  it('waits for a choice, preserves the candy count, and names the ghost only after all guests receive theirs', () => {
    const sim = new Sim({ ...epilog, spawn: { x: 7, y: .01 } });
    for (let i = 0; i < 30; i++) sim.step(idle);
    sim.step({ ...idle, act: true });
    const candy = sim.candyCount;
    expect(sim.story?.kind).toBe('party');
    expect(sim.flags.has('party:mamma')).toBe(false);
    sim.cancelStory();
    sim.step(idle); sim.step({ ...idle, act: true });
    for (const friend of ['bertil', 'moa', 'pappa', 'spoket', 'mamma'] as const) {
      expect(sim.finishStory({ kind: 'party', friend, sweet: friend === 'moa' ? 'skumbanan' : 'karamell' })).toBe(true);
      expect(sim.candyCount).toBe(candy);
      sim.step(idle);
      if (friend !== 'mamma') {
        expect(sim.flags.has('partied')).toBe(false);
        sim.step({ ...idle, act: true });
      }
    }
    expect(sim.flags.has('partied')).toBe(true);
    expect(sim.flags.has('party-gift:moa:skumbanan')).toBe(true);
    expect(sim.said).toContain('named');
  });
});
