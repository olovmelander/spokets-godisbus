import { describe, expect, it } from 'vitest';
import { norrsken } from '../../src/content/chapters/norrsken';
import { Sim } from '../../src/sim/sim';
import { sharingReward } from '../../src/sim/story';

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
