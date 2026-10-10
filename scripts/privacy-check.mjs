// Gate 8 (plan §2.6, §6.12). Fails when the repository or the built site holds something that could lead a
// stranger to the family:
//   1. a tracked file from a folder that must stay on Olov's computer;
//   2. a word from the denylist (surname, house number, street address, school, account names). The list is the
//      secret PRIVACY_DENYLIST, one word or phrase per line or comma, so it never enters the repository;
//   3. location, owner or device fields in an image, model or audio file.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const FORBIDDEN_PATHS = [/^photos\//, /^references\//, /^art\/private\//, /(^|\/)\.env(\.(?!example$)[^/]*)?$/];
const MEDIA = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.heic', '.gif', '.glb', '.gltf', '.m4a', '.mp3', '.wav', '.ktx2']);
const TEXT = new Set([
  '.md', '.ts', '.mjs', '.js', '.json', '.html', '.css', '.yml', '.yaml', '.txt', '.svg', '.py', '.sh', '.gltf',
  '.webmanifest', '.xml', '',
]);
// EXIF tags that say where, by whom or with which device a picture was taken.
const EXIF_TAGS = { 0x8825: 'GPS', 0x013b: 'Artist', 0x8298: 'Copyright', 0x010f: 'Make', 0x0110: 'Model', 0xa430: 'OwnerName' };
const EXIFTOOL_FIELDS = /^(GPS|Artist|Creator|By-line|Copyright$|CopyrightNotice|Rights|OwnerName|CameraOwnerName|SerialNumber|Make$|Model$|Location|City|Sub-location)/;

const problems = [];
const rel = (path) => relative(ROOT, path).replaceAll('\\', '/');

function tracked() {
  const out = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' });
  return out.split('\0').filter(Boolean);
}

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

/** The JSON part of a .glb, where glTF extras live. */
function glbJson(buffer) {
  if (buffer.length < 20 || buffer.readUInt32LE(0) !== 0x46546c67) return '';
  const length = buffer.readUInt32LE(12);
  return buffer.subarray(20, 20 + length).toString('utf8');
}

/** A small fallback for when exiftool isn't installed: the EXIF tags and XMP words that give a place or owner. */
function metadataFound(buffer) {
  const found = new Set();
  for (const marker of ['Exif\0\0', 'eXIf']) {
    let at = buffer.indexOf(marker, 0, 'latin1');
    while (at !== -1) {
      const tiff = buffer.indexOf(marker === 'eXIf' ? 'II*\0' : 'II*\0', at, 'latin1');
      const tiffBig = buffer.indexOf('MM\0*', at, 'latin1');
      const start = [tiff, tiffBig].filter((i) => i !== -1 && i - at < 16).sort((a, b) => a - b)[0];
      if (start !== undefined) {
        const little = buffer.toString('latin1', start, start + 2) === 'II';
        const u16 = (o) => (little ? buffer.readUInt16LE(o) : buffer.readUInt16BE(o));
        const u32 = (o) => (little ? buffer.readUInt32LE(o) : buffer.readUInt32BE(o));
        const ifd = start + u32(start + 4);
        if (ifd + 2 <= buffer.length) {
          const count = u16(ifd);
          for (let i = 0; i < count && ifd + 2 + i * 12 + 12 <= buffer.length; i++) {
            const tag = u16(ifd + 2 + i * 12);
            if (EXIF_TAGS[tag]) found.add(EXIF_TAGS[tag]);
          }
        }
      }
      at = buffer.indexOf(marker, at + 4, 'latin1');
    }
  }
  const text = buffer.toString('latin1');
  for (const word of ['GPSLatitude', 'GPSLongitude', 'photoshop:City', 'Iptc4xmpCore:Location']) {
    if (text.includes(word)) found.add(word);
  }
  return [...found];
}

// --- 1. folders that must stay on Olov's computer -------------------------------------------------
const files = tracked();
for (const file of files) {
  if (FORBIDDEN_PATHS.some((pattern) => pattern.test(file))) problems.push(`${file}: this path must never be committed`);
}

// --- 2. the denylist ------------------------------------------------------------------------------
const denylist = (process.env.PRIVACY_DENYLIST ?? '')
  .split(/[\n,]/)
  .map((word) => word.trim().toLowerCase())
  .filter(Boolean);
const built = [...walk(join(ROOT, 'dist'))];
const everything = [...files.map((file) => join(ROOT, file)), ...built];
if (denylist.length) {
  for (const path of everything) {
    if (!existsSync(path)) continue;
    const ext = extname(path).toLowerCase();
    let text = '';
    if (ext === '.glb') text = glbJson(readFileSync(path));
    else if (TEXT.has(ext) && statSync(path).size < 8 * 1024 * 1024) text = readFileSync(path, 'utf8');
    const lower = `${rel(path)}\n${text}`.toLowerCase();
    // The word itself is not printed: this log is public.
    denylist.forEach((word, index) => {
      if (lower.includes(word)) problems.push(`${rel(path)}: holds denylist entry number ${index + 1}`);
    });
  }
}

// --- 3. metadata in pictures, models and sound ----------------------------------------------------
const media = everything.filter((path) => MEDIA.has(extname(path).toLowerCase()) && existsSync(path));
const hasExiftool = spawnSync('exiftool', ['-ver'], { encoding: 'utf8' }).status === 0;
if (media.length && hasExiftool) {
  const run = spawnSync('exiftool', ['-json', '-a', '-G0', ...media], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  for (const entry of JSON.parse(run.stdout || '[]')) {
    const fields = Object.keys(entry)
      .map((key) => key.replace(/^[^:]+:/, ''))
      .filter((key) => EXIFTOOL_FIELDS.test(key));
    if (fields.length) problems.push(`${rel(entry.SourceFile)}: metadata ${[...new Set(fields)].join(', ')}`);
  }
} else {
  for (const path of media) {
    const found = metadataFound(readFileSync(path));
    if (found.length) problems.push(`${rel(path)}: metadata ${found.join(', ')}`);
  }
}

console.log(`Privacy check: ${files.length} tracked files, ${built.length} built files, ${media.length} media files.`);
console.log(`  denylist: ${denylist.length ? `${denylist.length} entries` : 'not set (built-in rules only)'}`);
console.log(`  metadata: ${hasExiftool ? 'exiftool' : 'built-in scan (exiftool is not installed)'}`);
if (problems.length) {
  for (const problem of problems) console.error(`PRIVACY: ${problem}`);
  process.exit(1);
}
console.log('Privacy check: ok');
