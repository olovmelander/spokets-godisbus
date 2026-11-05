// Builds a kit in Olov's open Blender: art/blender/kit-tools.py, then the kit, then the bake, and, if asked, the export.
//
//   node scripts/bake/send-kit.mjs art/blender/a2-nature.py                       everything, baked
//   node scripts/bake/send-kit.mjs art/blender/a2-nature.py --fast                no bake, to look at it quickly
//   node scripts/bake/send-kit.mjs art/blender/a2-nature.py --only=gran-a --fast  one thing: the kit reads ONLY
//   node scripts/bake/send-kit.mjs art/blender/a2-nature.py --out=art/baked/aventyr2/nature.glb
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = (path) => fileURLToPath(new URL(`../../${path}`, import.meta.url));
const [kit, ...flags] = process.argv.slice(2);
const flag = (name) => flags.find((f) => f.startsWith(`--${name}=`))?.split('=')[1];
const out = flag('out');
const only = flag('only');
const parts = [
  `ROOT = r'${here('.').split(String.fromCharCode(92)).join('/')}'`,
  `BAKE = ${flags.includes('--fast') ? 'False' : 'True'}`,
  `ONLY = ${only ? `'${only}'` : 'None'}`,
  readFileSync(here('art/blender/kit-tools.py'), 'utf8'),
  readFileSync(kit, 'utf8'),
  readFileSync(here('art/blender/kit-bake.py'), 'utf8'),
];
if (out) parts.push(`OUT = r'${resolve(out).split('\\').join('/')}'`, readFileSync(here('scripts/bake/export.py'), 'utf8'));
const file = join(tmpdir(), 'kit-to-send.py');
writeFileSync(file, parts.join('\n'));
const sent = spawnSync(process.execPath, [here('scripts/bake/send-to-blender.mjs'), file], { stdio: 'inherit' });
process.exit(sent.status ?? 1);
