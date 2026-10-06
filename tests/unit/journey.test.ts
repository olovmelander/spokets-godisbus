import { describe, expect, it } from 'vitest';
import { chapterQuery, ghostNamed, rememberFlags, storyFinished, visitChapter } from '../../src/save/journey';
import { newSave, readSave } from '../../src/save/store';
import { EXPLORE_CHAPTERS, exploreHtml } from '../../src/ui/explore';

describe('visiting the story after its ending', () => {
  it('keeps each chapter’s collection, puzzles and safe place while visiting another', () => {
    const save = { ...newSave(1, 'epilog'), checkpoint: 2, checkpoints: { garden: 4 }, candy: { garden: [1, 3] }, placed: { garden: ['box'] }, flags: { garden: ['goal', 'memory', 'found:gelehallon'], epilog: ['goal', 'beat:named'] } };
    const garden = visitChapter(save, 'garden');
    expect(garden.checkpoint).toBe(4);
    expect(garden.candy).toBe(save.candy);
    expect(garden.placed).toBe(save.placed);
    expect(garden.flags).toBe(save.flags);
    expect(visitChapter(garden, 'epilog').checkpoint).toBe(2);
    const restart = visitChapter(garden, 'garden', true);
    expect(restart.checkpoint).toBe(-1);
    expect(visitChapter(restart, 'garden').checkpoint).toBe(4);
    expect(save.chapter).toBe('epilog');
  });

  it('retains saved completion after live goal has been cleared and after writing and loading', () => {
    const flags = rememberFlags(['goal', 'memory'], new Set(['memory', 'found:gelehallon']));
    expect(flags).toEqual(['memory', 'found:gelehallon', 'goal']);
    expect(rememberFlags(flags, new Set(flags)).filter((flag) => flag === 'goal')).toHaveLength(1);
    const loaded = readSave(JSON.stringify({ ...newSave(1, 'epilog'), flags: { epilog: flags } }));
    expect(loaded.kind === 'save' && storyFinished(loaded.save.flags)).toBe(true);
    expect(storyFinished({ berget: ['goal'] })).toBe(false);
    expect(ghostNamed({ epilog: ['partied'] })).toBe(false);
    expect(ghostNamed({ epilog: ['beat:named'] })).toBe(true);
  });

  it('migrates the old single checkpoint and drops malformed entries', () => {
    const loaded = readSave(JSON.stringify({ ...newSave(1, 'myren'), checkpoint: 3, checkpoints: { garden: 4, myren: 1, negative: -2, decimal: 1.1, text: '3' } }));
    expect(loaded.kind === 'save' && loaded.save.checkpoints).toEqual({ garden: 4, myren: 3 });
    expect(loaded.kind === 'save' && visitChapter(loaded.save, 'garden').checkpoint).toBe(4);
  });

  it('replaces explicit courses and debug positions without mutating the original URL', () => {
    const params = new URLSearchParams('dev&course=epilog&at=54,3&flags=goal&title&tier=low');
    const next = new URLSearchParams(chapterQuery(params, 'garden'));
    expect(next.get('course')).toBe('garden');
    expect(next.has('dev')).toBe(true);
    expect(next.get('tier')).toBe('low');
    for (const key of ['at', 'flags', 'title']) expect(next.has(key)).toBe(false);
    expect(params.get('course')).toBe('epilog');
  });

  it('offers all built story chapters and the village with candy rows, stickers and challenge stars', () => {
    const save = { ...newSave(1, 'epilog'), candy: { garden: [0, 1, 1, -1, 99999] }, flags: { garden: ['found:gelehallon'], epilog: ['goal'] } };
    const html = exploreHtml(save);
    expect(EXPLORE_CHAPTERS.map((chapter) => chapter.id)).toEqual(['prolog', 'garden', 'granskog', 'myren', 'berget', 'norrsken', 'epilog', 'byn']);
    expect(html.match(/data-chapter=/g)).toHaveLength(8);
    expect(html).not.toContain('testbana');
    // Two sweets, one by one; a ten would be a roll (docs/ux-audit/story-presentation.md row 12).
    expect(html).toContain('<span class="rows" aria-hidden="true"><i></i><i></i></span>');
    expect(html).toContain('1 / 4 Gömt godis');
    expect(html).toContain('En utmaningsväg att utforska');
    // Moa's drawings, not typed symbols that each system draws its own way (docs/ux-audit/menus.md row 18).
    expect(html.match(/class="chapter-picture"/g)).toHaveLength(8);
    expect(html).not.toMatch(/[☀❀♧≈△✧⌂☆★]/u);
    expect(html).toContain('<small aria-hidden="true">Utmaning</small>');
    const released = exploreHtml(save, (id) => ['prolog', 'garden'].includes(id));
    expect(released.match(/data-chapter=/g)).toHaveLength(2);
    expect(released).not.toContain('data-chapter="byn"');
    expect(exploreHtml(save, () => false)).toBe('');
  });
});
