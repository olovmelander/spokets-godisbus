// Gate 2 (plan §6.12): the first playable in at most 3 MB as served, with at most 450 KB of gzipped JS.
// Runs after `vite build`. Until chapters have packs of their own, everything in dist/ is the boot pack.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const JS_GZIP_MAX = 450 * 1024;
const BOOT_MAX = 3 * 1024 * 1024;
// GitHub Pages compresses text in transit. Stage 0a records whether it also compresses .wasm, .glb and .ktx2;
// until that is known they are counted at full size.
const COMPRESSED = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt', '.webmanifest', '.xml']);

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else yield path;
  }
}

let js = 0;
let boot = 0;
const rows = [];
for (const path of files(DIST)) {
  const raw = readFileSync(path);
  const ext = extname(path).toLowerCase();
  const served = COMPRESSED.has(ext) ? gzipSync(raw, { level: 9 }).length : raw.length;
  if (ext === '.js') js += served;
  boot += served;
  rows.push([relative(DIST, path).replaceAll('\\', '/'), raw.length, served]);
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
for (const [name, raw, served] of rows.sort((a, b) => b[2] - a[2])) {
  console.log(`  ${name.padEnd(44)} ${kb(raw).padStart(10)}  as served ${kb(served).padStart(10)}`);
}
console.log(`JS, gzipped:      ${kb(js)} of ${kb(JS_GZIP_MAX)}`);
console.log(`Boot, as served:  ${kb(boot)} of ${kb(BOOT_MAX)}`);

const broken = [];
if (js > JS_GZIP_MAX) broken.push(`the JS is ${kb(js)} gzipped; the gate is ${kb(JS_GZIP_MAX)}`);
if (boot > BOOT_MAX) broken.push(`the boot pack is ${kb(boot)} as served; the gate is ${kb(BOOT_MAX)}`);
if (broken.length) {
  for (const line of broken) console.error(`SIZE GATE: ${line}`);
  process.exit(1);
}
console.log('Size gate: ok');
