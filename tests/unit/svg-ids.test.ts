import { describe, expect, it } from 'vitest';
import { ownIds } from '../../src/ui/svg-ids';
import { MEMORIES } from '../../src/ui/memory-art';
import { memoryAlbumHtml } from '../../src/ui/memory';
import { stormMemoryPictures } from '../../src/ui/collection-art';
import { faceBody, faceSvg } from '../../src/ui/faces';

const ids = (markup: string) => [...markup.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]!);
const references = (markup: string) => [...markup.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)].map((match) => match[1] ?? match[2]!);

/** Every gradient a copy paints with is its own: none of them can be found in another copy first. */
function selfContained(markup: string): boolean {
  const own = new Set(ids(markup));
  return references(markup).filter((id) => !id.startsWith('i-')).every((id) => own.has(id));
}

describe('each copy of a drawing in the page paints with its own gradients', () => {
  it('renames the ids a copy defines and the references to them, and leaves the icon sprite alone', () => {
    const markup = '<svg><defs><linearGradient id="g-1"/></defs><path fill="url(#g-1)"/><use href="#i-play"/><rect filter="url(#g-1)"/></svg>';
    const a = ownIds(markup), b = ownIds(markup);
    expect(ids(a)).toHaveLength(1);
    expect(ids(a)).not.toEqual(ids(b));
    for (const copy of [a, b]) {
      expect(selfContained(copy)).toBe(true);
      expect(copy).toContain('href="#i-play"');
      expect(copy.match(/url\(#/g)).toHaveLength(2);
    }
    expect(ownIds('<path fill="#f8d2b6"/>')).toBe('<path fill="#f8d2b6"/>');
  });

  it('gives the album thumbnail and the memory shown from it different gradients (Den första trägubben)', () => {
    const album = memoryAlbumHtml({ garden: ['memory'], granskog: ['memory'], myren: ['memory'], berget: ['memory'] });
    for (const pictures of Object.values(MEMORIES)) {
      const shown = ownIds(pictures[0]!);
      expect(ids(shown).length).toBeGreaterThan(0);
      expect(selfContained(shown)).toBe(true);
      for (const id of ids(shown)) expect(album).not.toContain(`id="${id}"`);
    }
    expect(new Set(ids(album)).size).toBe(ids(album).length);
  });

  it('keeps the storm memories and the family faces self-contained in every copy', () => {
    const storm = stormMemoryPictures('storm:lights')!;
    for (const picture of [...storm, ownIds(storm[0]!)]) expect(selfContained(picture)).toBe(true);
    for (const who of ['mamma', 'pappa', 'moa', 'bertil', 'elof'] as const) {
      const bubble = faceSvg(who), line = faceSvg(who), panel = faceBody(who);
      expect(ids(bubble).length).toBeGreaterThan(0);
      for (const copy of [bubble, line, panel]) expect(selfContained(copy)).toBe(true);
      expect(new Set([...ids(bubble), ...ids(line), ...ids(panel)]).size).toBe(ids(bubble).length * 3);
    }
  });

  it('draws the family on Berget\'s cliff solid, not see-through over the rock', () => {
    const last = MEMORIES.berget!.at(-1)!;
    expect(last).toContain('person-moa');
    expect(last).not.toMatch(/<g opacity="\.7\d">/);
  });
});
