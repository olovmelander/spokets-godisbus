import { describe, expect, it } from 'vitest';
import { albumComplete, KINDS } from '../../src/content/kinds';
import { sv } from '../../src/content/sv';
import { albumHtml } from '../../src/ui/album';

/** The stickers' own part of the page, on its four chapter strips: under it lies Hittegods, which has its own test. */
const grid = (html: string) => html.slice(html.indexOf('<div class="album-chapters">'), html.indexOf(`<h3>${sv.lostTitle}`));
const slots = (html: string) => grid(html).match(/<li/g)?.length ?? 0;
const got = (html: string) => grid(html).match(/<li class="got"/g)?.length ?? 0;

describe('the sticker album', () => {
  it('has a place for every kind, and an empty one keeps its name to itself', () => {
    const empty = albumHtml([]);
    expect(slots(empty)).toBe(16);
    expect(got(empty)).toBe(0);
    for (const kind of Object.keys(KINDS)) expect(empty, kind).not.toContain(sv.kinds[kind]);
    expect(empty).toContain('0 av 16 sorter');
    expect(empty).toContain(sv.album.title);
    // A new album is not a page of question marks (menus.md row 12).
    expect(empty).not.toContain('?');
  });

  it('lays the stickers out by chapter, in the story\'s order, each strip with its place and its count', () => {
    const some = albumHtml(['gelehallon', 'gummibjorn', 'sockerbit']);
    const strips = [...some.matchAll(/<section class="album-chapter" aria-label="([^"]+)">/g)].map((match) => match[1]);
    expect(strips).toEqual(['Gården: 2 av 4', 'Granskogen: 1 av 4', 'Myren: 0 av 4', 'Berget: 0 av 4']);
    expect(some.match(/class="chapter-picture"/g)).toHaveLength(4);
  });

  it('a kind he has found is a sticker in its colours, with its name', () => {
    const some = albumHtml(['polkagris', 'gelehallon']);
    expect(slots(some)).toBe(16);
    expect(got(some)).toBe(2);
    expect(some).toContain('2 av 16 sorter');
    expect(some).toContain('Geléhallon');
    expect(some).toContain('Polkagris');
    expect(some).toContain(KINDS.gelehallon!.colour);
    expect(some).not.toContain('Gummibjörn');
    // The story's order, whatever order he found them in: Gården's before Berget's.
    expect(some.indexOf('Geléhallon')).toBeLessThan(some.indexOf('Polkagris'));
  });

  it('is full when all sixteen are found, and a kind it does not know is left out', () => {
    const all = albumHtml([...Object.keys(KINDS), 'something else']);
    expect(got(all)).toBe(16);
    expect(all).toContain('16 av 16 sorter');
    expect(all).not.toContain('something else');
    expect(grid(all)).not.toContain('class="missing"');
    expect(all).toContain('data-reward="golden"');
    expect(all).toContain(sv.album.golden);
    expect(all.match(/data-reward="golden"/g)).toHaveLength(1);
  });

  it('awards the final golden piece only for every distinct known candy', () => {
    const incomplete = [...Object.keys(KINDS).slice(1), 'gummibjorn', 'unknown'];
    expect(incomplete.length).toBeGreaterThan(16);
    expect(albumComplete(incomplete)).toBe(false);
    expect(albumHtml(incomplete)).not.toContain('data-reward="golden"');
    expect(albumComplete([...incomplete, 'gelehallon'])).toBe(true);
  });
});
