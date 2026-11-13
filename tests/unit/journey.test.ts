import { describe, expect, it } from 'vitest';
import { chapterQuery, exploreChapter, ghostNamed, rememberFlags, storyFinished, visitChapter } from '../../src/save/journey';
import { newSave, readSave } from '../../src/save/store';
import { epilog } from '../../src/content/chapters/ends';
import { norrsken } from '../../src/content/chapters/norrsken';
import { morgonen } from '../../src/content/aventyr2/chapters/morgonen';
import { Sim } from '../../src/sim/sim';
import { STEP } from '../../src/sim/constants';
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
    // The second adventure's end counts too: its last card leads back to the map of the chapters.
    expect(storyFinished({ morgonen: ['goal'] })).toBe(true);
    expect(storyFinished({ stormoga: ['goal'] })).toBe(false);
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


describe('explicit chapter choices start a fresh playthrough', () => {
  it.each(['epilog', 'garden'])('starts %s at the beginning, including the current chapter, without losing history or mutating the save', id => {
    const save = { ...newSave(1, 'epilog'), checkpoint: 2, checkpoints: { epilog: 1, garden: 10 },
      candy: { garden: [0, 3] }, side: { garden: [2] }, placed: { garden: ['curl', 'bridge'], epilog: ['old-piece'] },
      flags: { garden: ['goal', 'memory', 'found:gelehallon', 'moa', 'plane:board'], epilog: ['goal', 'beat:named', 'dots', 'teeth', 'bedtime'] } };
    const before = structuredClone(save);
    const visit = exploreChapter(save, id);
    expect(visit.chapter).toBe(id);
    expect(visit.checkpoint).toBe(-1);
    expect(visit.checkpoints).toEqual({ epilog: 2, garden: 10 });
    expect(visit.candy).toBe(save.candy);
    expect(visit.side).toBe(save.side);
    expect(visit.placed[id]).toEqual([]);
    const other = id === 'garden' ? 'epilog' : 'garden';
    expect(visit.placed[other]).toBe(save.placed[other]);
    expect(visit.flags[other]).toBe(save.flags[other]);
    expect(storyFinished(visit.flags)).toBe(true);
    expect(ghostNamed(visit.flags)).toBe(true);
    expect(save).toEqual(before);
    const loaded = readSave(JSON.stringify(visit));
    expect(loaded.kind).toBe('save');
    if (loaded.kind !== 'save') return;
    expect(loaded.save.checkpoint).toBe(-1);
    expect(loaded.save.checkpoints?.[id]).toBe(id === 'epilog' ? 2 : 10);
    expect(loaded.save.placed[id]).toEqual([]);
    expect(loaded.save.flags).toEqual(visit.flags);
    // Ordinary chapter visits still use the remembered checkpoint; their contract has not changed.
    expect(visitChapter(save, id).checkpoint).toBe(id === 'epilog' ? 2 : 10);
  });

  it.each([
    { chapter: epilog, flags: ['goal', 'beat:named', 'partied', 'knife', 'cut1', 'cut2', 'cut3', 'dots', 'teeth', 'bedtime', 'scene:bathroom'] },
    { chapter: norrsken, flags: ['goal', 'lower', 'nr:rope-ready', 'haul', 'placed:tragubbe', 'bag', 'shared', 'taste', 'scene:aterfunna'] },
    { chapter: morgonen, flags: ['goal', 'shelf:old', 'shelf:small', 'latch', 'cocoa', 'a2slut', 'scene:frukost', 'scene:slut'] },
  ])('$chapter.id: a completed story starts at its actual spawn instead of resuming a late tableau', ({ chapter, flags }) => {
    const save = { ...newSave(1, chapter.id), checkpoint: chapter.checkpoints!.length - 1,
      placed: { [chapter.id]: (chapter.movers ?? []).map(mover => mover.id) }, flags: { [chapter.id]: flags } };
    const replay = exploreChapter(save, chapter.id);
    const live = replay.flags[chapter.id]!.filter(flag => flag !== 'goal');
    const sim = new Sim(chapter, {}, { checkpoint: replay.checkpoint, placed: replay.placed[chapter.id], flags: live });
    expect(sim.curr.x).toBe(chapter.spawn.x);
    expect(sim.curr.y).toBeCloseTo(chapter.spawn.y, 6);
    expect(sim.checkpoint).toBe(-1);
    for (const transient of ['teeth', 'bedtime', 'taste', 'lower', 'a2slut', 'cocoa', 'shelf:old']) expect(sim.flags.has(transient)).toBe(false);
    for (const mover of sim.movers.filter(one => !one.def.cycle)) expect(mover.stop).toBe(0);
    for (let step = 0; step < .2 / STEP; step++) sim.step({ x: 0, y: 0, hop: false, hopHeld: false, act: false });
    expect(sim.flags.has('goal')).toBe(false);
    expect(['bathroom', 'aterfunna', 'slut']).not.toContain(sim.sceneFrame?.id);
    if (chapter.id === 'morgonen') expect(sim.sceneFrame?.id).toBe('frukost');
  });

  it('keeps the permanent name and keepsake when saving a live state without the old story events', () => {
    const replay = exploreChapter({ ...newSave(1, 'epilog'), flags: { epilog: ['goal', 'beat:named', 'dots', 'teeth'] } }, 'epilog');
    const live = new Set(replay.flags.epilog!.filter(flag => flag !== 'goal' && flag !== 'beat:named'));
    replay.flags.epilog = rememberFlags(replay.flags.epilog!, live, 'epilog');
    const loaded = readSave(JSON.stringify(replay));
    expect(loaded.kind).toBe('save');
    if (loaded.kind !== 'save') return;
    expect(ghostNamed(loaded.save.flags)).toBe(true);
    expect(storyFinished(loaded.save.flags)).toBe(true);
    expect(loaded.save.flags.epilog).toContain('keepsake:firstcarving');
    expect(loaded.save.flags.epilog).not.toContain('teeth');
  });
});
