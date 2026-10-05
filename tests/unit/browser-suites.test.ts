import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NOT_SUITES, SUITES, parts } from '../browser/suites.mjs';

// The browser suites run side by side on GitHub, shared out by tests/browser/suites.mjs. A suite that is
// not in that list would never run.

const files = readdirSync(new URL('../browser/', import.meta.url)).filter((file) => file.endsWith('.mjs')).map((file) => file.slice(0, -4));
const names = SUITES.map(([name]) => name);

describe('the browser suites', () => {
  it('are every script in tests/browser, each once', () => {
    expect([...names].sort()).toEqual(files.filter((file) => !NOT_SUITES.includes(file)).sort());
    expect(new Set(names).size).toBe(names.length);
    for (const helper of NOT_SUITES) expect(files).toContain(helper);
  });

  it('are shared out over the parts with none left out and none twice, whatever the number of parts', () => {
    for (const count of [1, 2, 6, 8]) {
      const shared = parts(count);
      expect(shared).toHaveLength(count);
      expect(shared.flatMap((part) => part.suites).sort()).toEqual([...names].sort());
      // Inside a part the suites keep the order of the list.
      for (const part of shared) expect(part.suites).toEqual(names.filter((name) => part.suites.includes(name)));
    }
    expect(parts(1)[0]!.suites).toEqual(names);
  });

  it('are shared out evenly: the heaviest part is little more than its share', () => {
    const all = SUITES.reduce((sum, [, seconds]) => sum + seconds, 0);
    const heaviest = Math.max(...SUITES.map(([, seconds]) => seconds));
    for (const count of [4, 6]) {
      const most = Math.max(...parts(count).map((part) => part.seconds));
      expect(most).toBeLessThanOrEqual(Math.max(heaviest, (all / count) * 1.1));
    }
  });

  it('are run by `npm run test:browser`, and on GitHub in as many jobs as the workflow says', () => {
    const scripts = (JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { scripts: Record<string, string> }).scripts;
    expect(scripts['test:browser']).toBe('node tests/browser/run.mjs');
    const workflow = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');
    const listed = /part: \[([\d, ]+)\]/.exec(workflow)![1]!.split(',').map((one) => Number(one.trim()));
    // The parts are numbered from one, with none missing, and the command names the same count.
    expect(listed).toEqual(listed.map((_, i) => i + 1));
    expect(workflow).toContain(`--part \${{ matrix.part }}/${listed.length}`);
  });
});
