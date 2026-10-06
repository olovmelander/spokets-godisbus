import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PLACE_SHADE } from '../../src/ui/materials';

// The UI's colours are tokens (docs/ux-audit/style-and-sound.md row 7): every rule reads them, so no part of the look
// is written in two places, and neighbouring surfaces always match.

// The rules, without their comments.
const css = readFileSync(new URL('../../src/ui/ui.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const roots = [...css.matchAll(/:root\s*\{([^}]*)\}/g)].map((match) => match[1]!);
const outside = css.replace(/:root\s*\{[^}]*\}/g, '');

/** Every custom property the page's code sets: `setProperty('--x', …)` and `style="--x: …"` in the UI's markup. */
function setByCode(): Set<string> {
  const names = new Set<string>();
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (path.endsWith('.ts')) for (const match of readFileSync(path, 'utf8').matchAll(/['"`;\s]--([a-z][\w-]*)\s*[:'"]/g)) names.add(match[1]!);
    }
  };
  walk(fileURLToPath(new URL('../../src/', import.meta.url)));
  return names;
}

describe("the UI's colours", () => {
  it('writes every colour once, as a token on :root', () => {
    expect(roots.length).toBeGreaterThan(0);
    expect(roots.join('')).toMatch(/--paper:\s*#/);
    expect(outside.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([]);
  });

  it('reads only tokens that exist', () => {
    const declared = new Set([...css.matchAll(/(?<![\w-])--([a-z][\w-]*)\s*:/g)].map((match) => match[1]!));
    const code = setByCode();
    const missing = [...new Set([...css.matchAll(/var\(--([a-z][\w-]*)/g)].map((match) => match[1]!))]
      .filter((name) => !declared.has(name) && !code.has(name));
    expect(missing).toEqual([]);
  });

  it('keeps three reds for three jobs: paint to press, crayon for what is chosen, candy for rewards', () => {
    const rule = (selector: string) => new RegExp(`(?:^|[},])\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(outside)?.[1] ?? '';
    expect(rule('.wide.go')).toContain('var(--paint-red)');
    expect(rule('.btn-hop')).toContain('var(--paint-red)');
    expect(rule('.style.on')).toContain('var(--crayon-red)');
    expect(rule('.level.on')).toContain('var(--crayon-red)');
    expect(rule('.rows i')).toContain('var(--candy-red)');
  });

  it('dims each place in its own shade', () => {
    for (const shade of Object.values(PLACE_SHADE)) expect(shade).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/);
    expect(outside).toMatch(/\.panel-back\s*\{[^}]*rgb\(var\(--place-shade\) \/ 0\.3\)/);
  });
});
