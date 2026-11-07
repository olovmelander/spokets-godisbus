// Gate 2 (plan §6.12): the first playable in at most 3 MB as served, with at most 540 KB of gzipped JS (450 KB until
// 4 November 2026, when Olov widened the budget for the visual upgrade; three r187 alone took the last of the 450;
// 520 KB until 6 November, when he widened the graphics budget again, "rejält", for the Unravel look).
// Runs after `vite build`. Everything in dist/ is the boot pack, except a chapter pack's own JavaScript: Äventyr 2
// (docs/aventyr-2.md) is a chunk that is fetched only when it is played, and has a gate of its own.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const JS_GZIP_MAX = 540 * 1024;
// 4.5 MB as served for the whole site (from 4 MB on 7 November 2026, at Olov's "höj grafikbudgeten rejält om det
// behövs"): the family's rain gear and Äventyr 2's rebuilt nature, with the family's own models in the deploy.
const BOOT_MAX = 4.5 * 1024 * 1024;
const PACK_JS_MAX = 160 * 1024;

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else yield path;
  }
}

/**
 * The chunks the page fetches only when it asks for them (`import("./x.js")`), and that nothing imports outright:
 * Äventyr 2's pack, and the debug tools. They are not part of the first playable, so each has a gate of its own.
 */
function lazyChunks() {
  const dynamic = new Set();
  const outright = new Set();
  for (const path of files(join(DIST, 'assets'))) {
    if (extname(path) !== '.js') continue;
    const code = readFileSync(path, 'utf8');
    for (const [, name] of code.matchAll(/import\(\s*["'`]\.\/([\w.-]+\.js)["'`]\s*\)/g)) dynamic.add(`assets/${name}`);
    for (const [, name] of code.matchAll(/(?:from|import)\s*["'`]\.\/([\w.-]+\.js)["'`]/g)) outright.add(`assets/${name}`);
  }
  return new Set([...dynamic].filter((name) => !outright.has(name)));
}
const LAZY = lazyChunks();
// GitHub Pages gzips in transit, and not only text: read from the live site on 3 October 2026, .wasm and .glb
// come gzipped too (the transcoder as 245 KB of its 527 KB). A .ktx2 on its own has not been measured, and is
// already compressed, so it is counted at full size, as are pictures and sound.
const COMPRESSED = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt', '.webmanifest', '.xml', '.wasm', '.glb']);

let js = 0;
const lazy = [];
let boot = 0;
let voices = 0;
const rows = [];
for (const path of files(DIST)) {
  const relPath = relative(DIST, path).replaceAll('\\', '/');
  const raw = readFileSync(path);
  const ext = extname(path).toLowerCase();
  const served = COMPRESSED.has(ext) ? gzipSync(raw, { level: 9 }).length : raw.length;
  if (LAZY.has(relPath)) lazy.push([relPath, served]);
  else if (ext === '.js') js += served;
  if (LAZY.has(relPath)) { /* a chunk fetched later, counted on its own */ } else if (relPath.startsWith('audio/') || ext === '.mp3') voices += served;
  else boot += served;
  rows.push([relPath, raw.length, served]);
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
for (const [name, raw, served] of rows.sort((a, b) => b[2] - a[2])) {
  console.log(`  ${name.padEnd(44)} ${kb(raw).padStart(10)}  as served ${kb(served).padStart(10)}`);
}
console.log(`JS, gzipped:      ${kb(js)} of ${kb(JS_GZIP_MAX)}`);
console.log(`Boot, as served:  ${kb(boot)} of ${kb(BOOT_MAX)}`);
for (const [name, served] of lazy) console.log(`Fetched later:    ${kb(served)} of ${kb(PACK_JS_MAX)}  ${name}`);
if (voices > 0) console.log(`Voices (audio):   ${kb(voices)}`);

const broken = [];
if (js > JS_GZIP_MAX) broken.push(`the JS is ${kb(js)} gzipped; the gate is ${kb(JS_GZIP_MAX)}`);
if (boot > BOOT_MAX) broken.push(`the boot pack is ${kb(boot)} as served; the gate is ${kb(BOOT_MAX)}`);
for (const [name, served] of lazy) if (served > PACK_JS_MAX) broken.push(`${name} is ${kb(served)} gzipped; a chunk fetched later has a gate of ${kb(PACK_JS_MAX)}`);
if (!lazy.some(([name]) => /^assets\/aventyr2-/.test(name))) broken.push('Äventyr 2 is not a chunk of its own: it would be part of the boot JavaScript');
if (broken.length) {
  for (const line of broken) console.error(`SIZE GATE: ${line}`);
  process.exit(1);
}
console.log('Size gate: ok');
