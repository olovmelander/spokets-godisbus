import { describe, expect, it } from 'vitest';
import { AVENTYR2 } from '../../src/content/aventyr2/aventyr2';
import { courseAvailable } from '../../src/content/chapters';
import { mapState, mapSvg } from '../../src/ui/map';

/** Moa's map of Äventyr 2 (src/content/aventyr2/map.ts): the storm's long way, drawn as he goes. */
describe('Äventyr 2: Moa\'s map', () => {
  const dev = (id: string) => courseAvailable(new URLSearchParams('dev'), id);
  it('has a state for every chapter, and draws more of the way as he goes', () => {
    let drawn = 0;
    for (const chapter of AVENTYR2) {
      const state = mapState(chapter.id, dev);
      expect(state, chapter.id).not.toBeNull();
      expect(state!.drawn.length, chapter.id).toBeGreaterThanOrEqual(drawn);
      drawn = state!.drawn.length;
      expect(state!.drawn).toContain(state!.here);
      expect(mapSvg(state, true)).toMatch(/^<svg class="moas-karta"/);
    }
    expect(mapState('billsta', dev)!.drawn).toEqual(['stormkvall', 'stormskog', 'stormbyn', 'olympia', 'flarken', 'alven', 'billsta']);
    // The names a child writes, and no number or address anywhere.
    const svg = mapSvg(mapState('stormoga', dev), true);
    for (const name of ['Hemma', 'Skogen', 'Byn', 'Olympia', 'Flärken', 'Älven', 'Billsta']) expect(svg).toContain(`>${name}<`);
    expect(svg.replace(/<[^>]*>/g, '')).not.toMatch(/\d/);
  });

  it('keeps unreleased places off the public map', () => {
    const released = (id: string) => courseAvailable(new URLSearchParams(), id, 'stormbyn');
    const state = mapState('stormbyn', released);
    expect(state!.drawn).toEqual(['stormkvall', 'stormskog', 'stormbyn']);
    expect(state!.unfinished).toBe(true);
  });
});
