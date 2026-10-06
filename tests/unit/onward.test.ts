import { describe, expect, it } from 'vitest';
import { CARD_KEY, markOnward, takeOnward } from '../../src/save/onward';

/** A tab's session storage, in memory. */
function session(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  const kept = new Map<string, string>();
  return {
    getItem: (key) => kept.get(key) ?? null,
    setItem: (key, value) => void kept.set(key, value),
    removeItem: (key) => void kept.delete(key),
  };
}

describe('going on to the next chapter', () => {
  it('opens the marked chapter without the title, once', () => {
    const storage = session();
    markOnward('granskog', storage);
    expect(takeOnward('granskog', storage)).toBe(true);
    // A reload by hand shows the title again.
    expect(takeOnward('granskog', storage)).toBe(false);
  });

  it('shows the title for any other chapter, and uses the mark up', () => {
    const storage = session();
    markOnward('granskog', storage);
    expect(takeOnward('myren', storage)).toBe(false);
    expect(takeOnward('granskog', storage)).toBe(false);
  });

  it('keeps the next chapter\'s card words for the loading card, until the page has loaded', () => {
    const storage = session();
    markOnward('granskog', storage, 'Granskogen · halv tolv');
    // index.html reads them before any script has arrived (docs/ux-audit/first-minutes.md row 2).
    expect(storage.getItem(CARD_KEY)).toBe('Granskogen · halv tolv');
    takeOnward('granskog', storage);
    expect(storage.getItem(CARD_KEY)).toBeNull();
    // A mark without words leaves no old ones behind.
    storage.setItem(CARD_KEY, 'Myren · klockan ett');
    markOnward('garden', storage);
    expect(storage.getItem(CARD_KEY)).toBeNull();
  });

  it('shows the title when there is no session storage, or it fails', () => {
    expect(takeOnward('granskog', null)).toBe(false);
    const failing = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => undefined };
    expect(() => markOnward('granskog', failing)).not.toThrow();
    expect(takeOnward('granskog', failing)).toBe(false);
  });
});
