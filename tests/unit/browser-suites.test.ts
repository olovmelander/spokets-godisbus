import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NOT_SUITES, SUITES, parts, shareOf, units } from '../browser/suites.mjs';

// The browser suites run side by side on GitHub, shared out by tests/browser/suites.mjs. A suite that is
// not in that list would never run.

const files = readdirSync(new URL('../browser/', import.meta.url)).filter((file) => file.endsWith('.mjs')).map((file) => file.slice(0, -4));
const names = SUITES.map(([name]) => name);
/** What runs: each suite, or each share of a split one. */
const runs = units().map((unit) => unit.name);

describe('the browser suites', () => {
  it('are every script in tests/browser, each once', () => {
    expect([...names].sort()).toEqual(files.filter((file) => !NOT_SUITES.includes(file)).sort());
    expect(new Set(names).size).toBe(names.length);
    for (const helper of NOT_SUITES) expect(files).toContain(helper);
  });

  it('are shared out over the parts with none left out and none twice, whatever the number of parts', () => {
    for (const count of [1, 2, 6, 8, 12]) {
      const shared = parts(count);
      expect(shared).toHaveLength(count);
      expect(shared.flatMap((part) => part.suites).sort()).toEqual([...runs].sort());
      // Inside a part the suites keep the order of the list.
      for (const part of shared) expect(part.suites).toEqual(runs.filter((name) => part.suites.includes(name)));
    }
    expect(parts(1)[0]!.suites).toEqual(runs);
  });

  it('split a long suite into shares that each run their own cases and together run all of them, the last share once', () => {
    for (const [name, seconds] of SUITES) {
      if (!Array.isArray(seconds)) continue;
      const shares = seconds.length;
      expect(shares).toBeGreaterThan(1);
      // The suite takes its share of its cases from SHARD, as the runner passes it.
      expect(readFileSync(new URL(`../browser/${name}.mjs`, import.meta.url), 'utf8')).toContain('shareOf(');
      expect(units().filter((unit) => unit.file === name).map((unit) => unit.shard)).toEqual(Array.from({ length: shares }, (_, i) => `${i + 1}/${shares}`));
    }
    const cases = ['a', 'b', 'c', 'd', 'e'];
    for (const of of [1, 2, 3]) {
      const shares = Array.from({ length: of }, (_, i) => shareOf(cases, `${i + 1}/${of}`));
      expect(shares.flatMap((share) => share.cases).sort()).toEqual(cases);
      expect(shares.filter((share) => share.last)).toHaveLength(1);
    }
    // Run on its own, a suite runs whole.
    expect(shareOf(cases, undefined)).toEqual({ cases, last: true });
  });

  it('are shared out evenly: the heaviest part is little more than its share', () => {
    const all = units().reduce((sum, unit) => sum + unit.seconds, 0);
    const heaviest = Math.max(...units().map((unit) => unit.seconds));
    for (const count of [4, 6, 8, 12]) {
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
