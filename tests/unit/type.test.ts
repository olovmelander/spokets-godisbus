import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Every word in the game is set in its own type (docs/ux-audit.md, step 1). A `font:` shorthand that names
// `inherit` as its family is invalid, and a browser drops the whole rule: on 5 October 2026 three such rules left
// Hoppa, Använd, the code and name fields and the recovery button in the browser's own 13 px Arial.

// The rules, without their comments, which may talk about a `font:` shorthand.
const css = readFileSync(new URL('../../src/ui/ui.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const licences = readFileSync(new URL('../../LICENSES.md', import.meta.url), 'utf8');

describe("the game's type", () => {
  it('has no font shorthand that a browser would drop', () => {
    const shorthands = [...css.matchAll(/(?<![-\w])font\s*:\s*([^;}]+)/g)].map((match) => match[1]!.trim());
    expect(shorthands.length).toBeGreaterThan(0);
    for (const value of shorthands) {
      if (value === 'inherit') continue;
      expect(value, `font: ${value}`).not.toMatch(/\binherit\b/);
    }
  });

  it('sets the page in Andika, with the system font only as a fallback', () => {
    const body = /body\s*\{[^}]*font-family:\s*([^;]+);/.exec(css);
    expect(body?.[1]?.trim().startsWith("'Andika'")).toBe(true);
  });

  it('lets buttons and fields take the page type instead of the browser\'s', () => {
    expect(css).toMatch(/button,\s*input,\s*select,\s*textarea\s*\{\s*font:\s*inherit;/);
  });

  it('serves every font it names from the site, with its licence listed', () => {
    const files = [...css.matchAll(/url\('\/fonts\/([^']+\.woff2)'\)/g)].map((match) => match[1]!);
    expect(files.length).toBeGreaterThanOrEqual(2);
    for (const file of files) {
      expect(existsSync(new URL(`../../public/fonts/${file}`, import.meta.url)), file).toBe(true);
      expect(licences, file).toContain(file);
    }
    expect(existsSync(new URL('../../public/fonts/Andika-OFL.txt', import.meta.url))).toBe(true);
    // Nothing is fetched from anyone else (plan §5.6): no font from a font service.
    expect(css).not.toMatch(/fonts\.(googleapis|gstatic)|@import\s+url\(\s*['"]?https?:/);
  });
});
