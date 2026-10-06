import { describe, expect, it } from 'vitest';
import { sv } from '../../src/content/sv';
import { ICONS } from '../../src/ui/sprite';
import { VERB_ICON, verbIcon } from '../../src/ui/verbs';

// A picture for every verb (docs/ux-audit/in-play.md row 6): the button says what it does to a child who does not
// read the word.
describe("Använd's pictures", () => {
  it('has a drawn picture for every word the button can say', () => {
    for (const word of Object.keys(sv.verbs)) {
      expect(VERB_ICON[word], word).toBeDefined();
      expect(Object.keys(ICONS), word).toContain(VERB_ICON[word]);
    }
  });

  it('takes the word\'s picture before the verb\'s, and the open hand only with nothing to do', () => {
    expect(verbIcon('take', 'takeKnife')).toBe('take');
    expect(verbIcon('take', 'paintGhost')).toBe('brush');
    expect(verbIcon('call', 'callMoa')).toBe('call');
    expect(verbIcon('give', null)).toBe('give');
    expect(verbIcon(null)).toBe('hand');
    // Not every verb is the same hand any more.
    expect(new Set(Object.values(VERB_ICON)).size).toBeGreaterThanOrEqual(10);
  });
});
