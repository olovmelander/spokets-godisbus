import { describe, expect, it } from 'vitest';
import { sv } from '../../src/content/sv';
import { hintHtml } from '../../src/ui/keys';
import { keysLearned, learnKeys } from '../../src/save/keys';

// The keys' hint (docs/ux-audit/in-play.md row 13): three keycaps with a word under each, until each has been used.
describe("the keys' hint", () => {
  it('is three keys with one word under each, for keys and for a pad', () => {
    for (const pairs of [sv.keysHint, sv.padHint]) {
      expect(pairs).toHaveLength(3);
      const html = hintHtml(pairs);
      expect(html.match(/class="hint-pair"/g)).toHaveLength(3);
      for (const [, does] of pairs) expect(does.split(' ')).toHaveLength(1);
    }
  });

  it('is learned once on a device, and a device that keeps nothing shows it again', () => {
    const kept = new Map<string, string>();
    const storage = { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => void kept.set(key, value) };
    expect(keysLearned(storage)).toBe(false);
    learnKeys(storage);
    expect(keysLearned(storage)).toBe(true);
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(keysLearned(broken)).toBe(false);
    expect(() => learnKeys(broken)).not.toThrow();
  });

  it('still starts and learns controls when access to localStorage itself is denied', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() { throw new DOMException('Storage is denied', 'SecurityError'); },
    });
    try {
      expect(keysLearned()).toBe(false);
      expect(() => learnKeys()).not.toThrow();
      // An explicitly unavailable store stays unavailable instead of consulting the browser again.
      expect(keysLearned(null)).toBe(false);
      expect(() => learnKeys(null)).not.toThrow();
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });
});
