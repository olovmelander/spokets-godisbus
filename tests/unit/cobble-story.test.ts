import { describe, expect, it } from 'vitest';
import { cobbleMemory } from '../../src/content/cobbles';
import { berget } from '../../src/content/chapters/berget';
import { epilog } from '../../src/content/chapters/ends';
import { sv } from '../../src/content/sv';
import { newSave, readSave } from '../../src/save/store';
import { Sim } from '../../src/sim/sim';

const idle = { x: 0, y: 0, hopHeld: false, hop: false, act: false };
const settle = (sim: Sim) => { for (let i = 0; i < 20; i++) sim.step(idle); };
const explanation = ['cobbles1', 'cobbles2', 'cobbles3'];

describe('Pappa remembers the mountain cobbles at the party', () => {
  it('carries a real saved note discovery, then explains it after Elof gives Pappa candy', () => {
    const mountain = new Sim({ ...berget, spawn: { x: 98, y: 26.41 } });
    settle(mountain);
    expect(mountain.flags.has('note:1')).toBe(true);
    const loaded = readSave(JSON.stringify({ ...newSave(1, 'epilog'), flags: { berget: [...mountain.flags] } }));
    if (loaded.kind !== 'save') throw new Error('Expected saved mountain visit');
    const party = new Sim({ ...epilog, spawn: { x: 11, y: 0.01 } }, {}, { flags: cobbleMemory(loaded.save.flags) });
    settle(party);
    expect(party.said).toEqual([]);
    party.step({ ...idle, act: true });
    expect(party.finishStory({ kind: 'party', friend: 'pappa', sweet: 'karamell' })).toBe(true);
    settle(party);
    expect(party.said).toEqual(explanation);
    const resumed = new Sim(epilog, {}, { flags: [...party.flags] });
    settle(resumed);
    expect(resumed.said).toEqual([]);
  });

  it('never requires finding the optional toy and ignores unrelated note flags', () => {
    const cases: Record<string, readonly string[]>[] = [{}, { garden: ['note:1'] }, { berget: ['note:0', 'note:6', 'notes:1'] }];
    for (const flags of cases) {
      expect(cobbleMemory(flags)).toEqual([]);
    }
    const party = new Sim(epilog, {}, { flags: ['party:pappa'] });
    settle(party);
    expect(party.said).toEqual([]);
    for (const line of explanation) expect(sv.lines[line as keyof typeof sv.lines].length).toBeLessThanOrEqual(40);
  });
});
