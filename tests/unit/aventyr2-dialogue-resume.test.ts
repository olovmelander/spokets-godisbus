import { describe, expect, it } from 'vitest';
import { stormkvall } from '../../src/content/aventyr2/chapters/stormkvall';
import { billsta } from '../../src/content/aventyr2/chapters/billsta';
import { stormoga } from '../../src/content/aventyr2/chapters/stormoga';
import { Sim } from '../../src/sim/sim';
import { run } from '../sim/drive';

/** Older saves have the original story flags but no receipts for the newly added conversations. */
describe('Äventyr 2: new dialogue in an older saved game', () => {
  const lampGiven = ['scene:kvall', 'lamp:take', 'lamp:give', 'beat:skLampThanks'];
  const shelfLines = ['skShelf', 'skMyCarving'];
  const barnOpen = ['scene:card', 'bi:ladder', 'bi:mormor', 'beat:bi:open'];
  const lookoutLines = ['bi:lookout', 'bi:way', 'bi:onward'];
  const goldGiven = ['eye', 'scene:oga', 'scene:motet', 'gift', 'beat:soGold', 'beat:soLast', 'beat:soShare'];

  it('offers the new goodnight exchange after giving the lamp, before saying goodnight', () => {
    const sim = new Sim(stormkvall, {}, { flags: lampGiven });
    run(sim, .1);
    expect(sim.said.filter(id => shelfLines.includes(id))).toEqual(shelfLines);
    expect(sim.flags.has('goodnight')).toBe(false);
  });

  it('does not ask for goodnight again after a saved shrinking', () => {
    const sim = new Sim(stormkvall, {}, { checkpoint: 1, flags: [
      ...lampGiven, 'goodnight', 'gust', 'scene:fonstret', 'scene:klonkstar',
      'star', 'scene:krymper', 'scene:tillsammans',
    ] });
    run(sim, .1);
    expect(sim.said.filter(id => shelfLines.includes(id))).toEqual([]);
    expect(sim.flags.has('scene:tillsammans')).toBe(true);
  });

  it('recovers the new lookout plan at the barn when its reading receipts are missing', () => {
    const sim = new Sim(billsta, {}, { checkpoint: 3, placed: ['bi-door'], flags: barnOpen });
    run(sim, .1);
    expect(sim.said.filter(id => lookoutLines.includes(id))).toEqual(lookoutLines);
  });

  it('does not direct an old hill save back through the barn', () => {
    const sim = new Sim(billsta, {}, { checkpoint: 7, placed: ['bi-door', 'bi-pivot'], flags: [
      ...barnOpen, 'beat:bi:roof', 'bi:call-klonk', 'bi:klonk-on', 'bi:fling',
    ] });
    run(sim, .1);
    expect(sim.said.filter(id => lookoutLines.includes(id))).toEqual([]);
    expect(sim.curr.x).toBeGreaterThan(140);
  });

  it('recalls the gold sweet’s magic if a saved gift has not yet been tasted', () => {
    const sim = new Sim(stormoga, {}, { checkpoint: 2, flags: goldGiven });
    run(sim, .1);
    expect(sim.said).toContain('soMagic');
    expect(sim.flags.has('taste')).toBe(false);
  });

  it('does not promise to grow again when an older save has already tasted the sweet', () => {
    const sim = new Sim(stormoga, {}, { checkpoint: 2, flags: [...goldGiven, 'taste', 'scene:stor'] });
    run(sim, .1);
    expect(sim.said).not.toContain('soMagic');
    expect(sim.flags.has('taste')).toBe(true);
  });
});
