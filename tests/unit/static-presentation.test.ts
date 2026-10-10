import { describe, expect, it } from 'vitest';
import { staticPresentation } from '../../scripts/static-presentation.mjs';
import { MEMORIES } from '../../src/ui/memory-art';
import { shellHtml } from '../../src/ui/shell-html';

type PresentationPlugin = {
  apply: string;
  transformIndexHtml(html: string): string;
  transform(code: string, id: string): string | null;
};
const plugin = () => staticPresentation(MEMORIES, shellHtml) as unknown as PresentationPlugin;

describe('the production presentation templates', () => {
  it('preserves every illustrated scene and both complete helper interfaces in inert HTML', () => {
    const page = plugin().transformIndexHtml('<html><body><main id="game"></main></body></html>');
    const memories = [...page.matchAll(/<template data-memory-art="([^"]+)">([\s\S]*?)<\/template>/g)];
    expect(memories.map((match) => match[1])).toEqual(Object.keys(MEMORIES));
    for (const [, chapter, markup] of memories) expect(markup).toBe(MEMORIES[chapter!]!.join(''));
    for (const helper of ['jay', 'ghost'] as const) {
      const markup = page.match(new RegExp(`<template id="game-shell-${helper}">([\\s\\S]*?)<\\/template>`));
      expect(markup?.[1]).toBe(shellHtml(helper));
    }
    expect(page.startsWith('<html><body><main id="game"></main>')).toBe(true);
    expect(page.endsWith('</body></html>')).toBe(true);
    expect(page.match(/<template/g)).toHaveLength(Object.keys(MEMORIES).length + 2);
  });

  it('replaces only the two source modules, including on Windows, leaving raw imports and previews alone', () => {
    const build = plugin();
    expect(build.apply).toBe('build');
    for (const name of ['memory-art', 'shell-html']) {
      const posix = `/workspace/game/src/ui/${name}.ts`;
      const windows = `C:\\game\\src\\ui\\${name}.ts`;
      const source = 'the authored generator';
      expect(build.transform(source, posix)).toBeTypeOf('string');
      expect(build.transform(source, windows)).toBe(build.transform(source, posix));
      expect(build.transform(source, `${posix}?raw`)).toBeNull();
      expect(build.transform(source, `${posix}?url`)).toBeNull();
      expect(build.transform(source, `/workspace/game/other/${name}.ts`)).toBeNull();
    }
    expect(build.transform('', '/workspace/game/src/ui/memory.ts')).toBeNull();
    expect(build.transform('', '/workspace/game/src/ui/shell.ts')).toBeNull();
  });
});
