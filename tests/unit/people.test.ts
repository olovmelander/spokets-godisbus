import { describe, expect, it } from 'vitest';
import { STORY } from '../../src/content/chapters';
import { PEOPLE, personFor } from '../../src/content/people';
import { sv } from '../../src/content/sv';

describe('who a sign stands for', () => {
  it('is one of the four, for every word that calls someone or gives them something', () => {
    for (const who of ['Mamma', 'Pappa', 'Moa', 'Bertil']) {
      expect(personFor(`call${who}`)).toBe(who.toLowerCase());
      expect(personFor(`give${who}`)).toBe(who.toLowerCase());
    }
    expect(PEOPLE).toHaveLength(4);
  });

  it('is nobody for a sign that stands for a thing, and for no word at all', () => {
    for (const word of ['takeKnife', 'goHome', 'giveGhost', 'giveJay', 'giveTragubbe', undefined]) expect(personFor(word)).toBeNull();
  });

  it('knows every sign in the story: each stands for one of the family, or for a thing with a word', () => {
    const verbs: Record<string, string> = sv.verbs;
    for (const chapter of STORY) {
      const signs = [...(chapter.spots ?? []), ...(chapter.decor ?? [])].filter((s) => s.look === 'sign');
      for (const sign of signs) {
        expect(sign.word, chapter.id).toBeDefined();
        expect(verbs[sign.word!], `${chapter.id}: ${sign.word}`).toBeDefined();
      }
      // At home, where he is a boy among people, the family's signs are the ones their models take the place of.
      if (chapter.size) {
        const people = signs.map((sign) => personFor(sign.word)).filter((who) => who !== null);
        expect(people.length, chapter.id).toBeGreaterThanOrEqual(chapter.id === 'norrsken' ? 0 : 1);
      }
    }
  });
});
