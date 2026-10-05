// Runs the browser suites against a build (`npm run build` first).
//   node tests/browser/run.mjs              every suite, one after another; stops at the first that fails
//   node tests/browser/run.mjs --part 2/6   the second of six parts: GitHub runs the parts side by side
//   node tests/browser/run.mjs --parts 6    says which suite is in which part, and runs nothing
// A part runs all its suites, also after one has failed, so that one run shows everything that is wrong.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SUITES, parts } from './suites.mjs';

const args = process.argv.slice(2);
const value = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);

if (value('--parts')) {
  for (const [i, part] of parts(Number(value('--parts'))).entries()) {
    console.log(`part ${i + 1}, about ${Math.round(part.seconds / 60)} min on GitHub: ${part.suites.join(', ')}`);
  }
  process.exit(0);
}

let names = SUITES.map(([name]) => name);
let bail = true;
const part = value('--part');
if (part) {
  const [which, of] = part.split('/').map(Number);
  if (!Number.isInteger(which) || !Number.isInteger(of) || which < 1 || which > of) {
    console.error(`--part wants "2/6", not "${part}"`);
    process.exit(1);
  }
  names = parts(of)[which - 1].suites;
  bail = false;
  console.log(`Part ${which} of ${of}: ${names.join(', ')}\n`);
}

const failed = [];
const took = [];
for (const name of names) {
  const began = Date.now();
  const result = spawnSync(process.execPath, [fileURLToPath(new URL(`./${name}.mjs`, import.meta.url))], { stdio: 'inherit' });
  took.push(`${name} ${Math.round((Date.now() - began) / 1000)} s`);
  if (result.status !== 0) {
    failed.push(name);
    console.error(`\n${name}: failed\n`);
    if (bail) break;
  }
}

console.log(`\nBrowser suites: ${took.join(', ')}.`);
if (failed.length > 0) {
  console.error(`Failed: ${failed.join(', ')}.`);
  process.exit(1);
}
console.log(`All ${names.length} passed.`);
