import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sv } from '../../src/content/sv';
import { storyContext } from '../../src/content/story-context';
import { hintHtml, keycapsOf } from '../../src/ui/keys';
import { ICONS, spriteHtml } from '../../src/ui/sprite';

// One drawn set of icons (docs/ux-audit/style-and-sound.md row 13): a typed symbol is drawn by each system its own
// way, in its own weight and on its own baseline, and some come out as colour emoji.
const TYPED = /[←↑→↓↩−≈⌂␣▧△▶○●☀★☆♡♧✎✓✕✚✦✧❀×]/u;
const code = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe("the UI's icons", () => {
  it('puts every icon in the sprite once, as a symbol with its own box', () => {
    const sprite = spriteHtml();
    for (const id of Object.keys(ICONS)) expect(sprite.match(new RegExp(`<symbol id="i-${id}" viewBox="[-\\d .]+"`, 'g')), id).toHaveLength(1);
    expect(sprite).toMatch(/^<svg class="sprite" aria-hidden="true"/);
    // Plain shapes, nothing fetched (plan §0, §5.6).
    expect(sprite).not.toMatch(/https?:|<image|href=/);
  });

  it('is put into the page by Vite, so the game\'s script carries none of the drawings', () => {
    expect(code('vite.config.ts')).toMatch(/transformIndexHtml[^\n]*spriteHtml\(\)/);
    expect(code('src/ui/icons.ts')).not.toMatch(/from '\.\/sprite'(?!;)/);
    expect(code('src/ui/icons.ts')).toMatch(/import type \{ IconId \} from '\.\/sprite'/);
  });

  it('types no symbol anywhere the player looks', () => {
    // The bench and the debug line are for grown-ups measuring the game (canvas 1280×720); keys.ts looks up the drawing
    // for each arrow key by the arrow's name.
    const files = readdirSync(new URL('../../src/ui/', import.meta.url)).filter((name) => name.endsWith('.ts') && !['bench.ts', 'debug.ts', 'keys.ts'].includes(name));
    const typed = [...files.map((file) => `src/ui/${file}`), 'src/content/story-context.ts']
      .flatMap((path) => code(path).split('\n').filter((row) => TYPED.test(row)).map((row) => `${path}: ${row.trim().slice(0, 80)}`));
    expect(typed).toEqual([]);
  });

  it('draws the purpose line\'s picture for every purpose', () => {
    const contexts = [
      storyContext('prolog', new Set(['star', 'scene:familj']), { x: 30, y: 0 }),
      storyContext('granskog', new Set(), { x: 180, y: 0 }),
      storyContext('epilog', new Set(['knife']), { x: 30, y: 0 }),
      storyContext('byn', new Set(), { x: 20, y: 0 }),
    ];
    for (const context of contexts) expect(Object.keys(ICONS), context?.id).toContain(context!.icon);
    expect(contexts.map((context) => context!.icon)).toEqual(['heart', 'heart', 'knife', 'village']);
  });

  it('draws the arrow keys, and names them for a screen reader', () => {
    const hint = hintHtml(sv.keysHint);
    expect(hint).not.toMatch(TYPED);
    expect(hint).toContain('<use href="#i-key-left"/>');
    expect(hint).toContain(`<span class="sr-only">${sv.arrowKeys['←']}</span>`);
    expect(keycapsOf('E')).toBe('<kbd>E</kbd>');
    expect(keycapsOf('← →').match(/<kbd>/g)).toHaveLength(2);
  });
});
