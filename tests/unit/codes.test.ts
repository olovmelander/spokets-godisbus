import { describe, expect, it } from 'vitest';
import { STORY } from '../../src/content/chapters';
import { sv } from '../../src/content/sv';
import { chapterFor, codeFor } from '../../src/save/codes';

describe('chapter codes', () => {
  it('every part of the story after the prologue has one, and nothing else has', () => {
    for (const part of STORY.slice(1)) expect(codeFor(part.id), part.id).not.toBeNull();
    expect(codeFor('prolog')).toBeNull();
    expect(codeFor('testbana')).toBeNull();
    expect(Object.keys(sv.codes).sort()).toEqual(STORY.slice(1).map((part) => part.id).sort());
  });

  it('is three short plain words in capitals, and no word is in two codes', () => {
    const all = Object.values(sv.codes).flat();
    for (const word of all) expect(word, word).toMatch(/^[A-ZÅÄÖ]{3,8}$/);
    for (const words of Object.values(sv.codes)) expect(words).toHaveLength(3);
    expect(new Set(all).size).toBe(all.length);
    // Typed without å, ä and ö they are still all different.
    const bare = all.map((word) => word.replace(/[ÅÄ]/g, 'A').replace(/Ö/g, 'O'));
    expect(new Set(bare).size).toBe(all.length);
    expect(codeFor('granskog')).toBe('GRAN KOTTE MOSSA');
  });

  it('names nobody, and does not give the ghost its name', () => {
    for (const word of Object.values(sv.codes).flat()) {
      for (const name of ['ELOF', 'MOA', 'BERTIL', 'SOFIE', 'EMIL', 'MAMMA', 'PAPPA', 'KLONK']) expect(word).not.toBe(name);
    }
  });

  it('opens its chapter, however a child types it', () => {
    for (const part of STORY.slice(1)) expect(chapterFor(codeFor(part.id)!), part.id).toBe(part.id);
    expect(chapterFor('gran kotte mossa')).toBe('granskog');
    expect(chapterFor('  Mossa,  gran - KOTTE ')).toBe('granskog');
    // Without å, ä and ö, as on a keyboard that lacks them.
    expect(chapterFor('tuva spang trana')).toBe('myren');
    expect(chapterFor('kniv span lordag')).toBe('epilog');
  });

  it('is no code when a word is wrong, missing or one too many', () => {
    for (const typed of ['', 'gran kotte', 'gran kotte mossa tall', 'gran kotte sten', 'gran gran gran', '123', 'gran kotte mosse']) {
      expect(chapterFor(typed), typed).toBeNull();
    }
    // Words from two codes do not make a third.
    expect(chapterFor('gran tuva tall')).toBeNull();
  });
});
