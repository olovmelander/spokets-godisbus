import { describe, expect, it } from 'vitest';
import { STORY } from '../../src/content/chapters';
import { sv } from '../../src/content/sv';
import { mapState, mapSvg } from '../../src/ui/map';

describe('Moas karta', () => {
  it('has a picture for every part of the story, and none for a course outside it', () => {
    for (const part of STORY) expect(mapState(part.id), part.id).not.toBeNull();
    expect(mapState('testbana')).toBeNull();
    expect(mapSvg(mapState('testbana'))).toBe('');
  });

  it('draws the places in as he reaches them, and never takes one away', () => {
    let drawn = 0;
    for (const part of STORY) {
      const state = mapState(part.id)!;
      expect(state.drawn.length, part.id).toBeGreaterThanOrEqual(drawn);
      drawn = state.drawn.length;
      // He is somewhere that is drawn.
      expect(state.drawn).toContain(state.here);
    }
    expect(mapState('garden')!.drawn).toEqual(['home']);
    expect(mapState('granskog')!.drawn).toEqual(['home', 'forest', 'brook']);
    expect(mapState('berget')!.drawn).toEqual(['home', 'forest', 'brook', 'bog', 'mountain']);
  });

  it('shows where the ghost is heading: the next place, still blank paper, until it waits for him', () => {
    expect(mapState('garden')).toMatchObject({ here: 'home', ghost: 'forest' });
    expect(mapState('granskog')).toMatchObject({ here: 'forest', ghost: 'bog' });
    expect(mapState('myren')).toMatchObject({ here: 'bog', ghost: 'mountain' });
    // On the mountain it is with him, and after that it is his friend: it is not drawn apart from him.
    expect(mapState('norrsken')!.ghost).toBeNull();
    expect(mapState('epilog')).toMatchObject({ here: 'home', ghost: null });
  });

  it('writes the places as a child would, and "Här är du" beside him', () => {
    const svg = mapSvg(mapState('myren'));
    for (const name of [sv.map.home, sv.map.forest, sv.map.brook, sv.map.bog, sv.map.here]) expect(svg).toContain(`>${name}<`);
    // The mountain is not drawn yet: only the ghost is there.
    expect(svg).not.toContain(`>${sv.map.mountain}<`);
    expect(mapSvg(mapState('berget'))).toContain(`>${sv.map.mountain}<`);
  });

  it('says nothing about where the real places are: no number in it is a coordinate of the world', () => {
    const svg = mapSvg(mapState('epilog'));
    expect(svg).not.toMatch(/\d{2}\.\d{3,}/);
    expect(svg).not.toMatch(/Bredbyn|Näsbacken/);
  });
});
