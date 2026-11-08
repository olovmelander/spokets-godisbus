// Rebuild the original public environment bank, then use the normal build-assets packing pipeline.
// Node 22.12+: node --experimental-strip-types scripts/bake-bredbyn.mjs
//
// Two steps. Three builds the church, the belfry and the street fronts from art/procedural/ and exports them plain;
// then Blender bakes their soft shade into their colours (art/blender/bredbyn-shade.py) and writes
// art/baked/boot/bredbyn.glb. Blender is found as BLENDER (its program, run headless) or BPY_PYTHON (a Python with
// the bpy module, as in a cloud session), or as `blender` on the PATH. Without one, nothing is written.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Group } from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { bredbynLandmarks } from '../art/procedural/bredbyn-landmarks.ts';
import { bredbynStreet } from '../art/procedural/bredbyn-street.ts';

// GLTFExporter uses this browser interface for its binary buffer; no images or DOM are involved.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(buffer => { this.result = buffer; this.onloadend?.(); });
  }
};
const here = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const bank = new Group();
bank.name = 'bredbyn';
bank.add(bredbynLandmarks(), bredbynStreet());
const binary = await new GLTFExporter().parseAsync(bank, { binary: true });
const scratch = mkdtempSync(join(tmpdir(), 'bredbyn-'));
const plain = join(scratch, 'bredbyn-plain.glb');
writeFileSync(plain, new Uint8Array(binary));
console.log(`Bredbyn, plain: ${binary.byteLength} bytes; original church, belfry and street geometry.`);

const directory = here('art/baked/boot/');
mkdirSync(directory, { recursive: true });
const out = join(directory, 'bredbyn.glb');
const py = (path) => JSON.stringify(path.split('\\').join('/'));
const expression = `IN = ${py(plain)}; OUT = ${py(out)}; `
  + `exec(open(${py(here('art/blender/bredbyn-shade.py'))}).read() + open(${py(here('scripts/bake/export.py'))}).read())`;
const runs = [
  process.env.BLENDER && [process.env.BLENDER, ['-b', '--factory-startup', '--python-exit-code', '1', '--python-expr', expression]],
  process.env.BPY_PYTHON && [process.env.BPY_PYTHON, ['-I', '-c', expression]],
  ['blender', ['-b', '--factory-startup', '--python-exit-code', '1', '--python-expr', expression]],
].filter(Boolean);
let baked = false;
for (const [program, args] of runs) {
  const run = spawnSync(program, args, { stdio: 'inherit' });
  if (run.error?.code === 'ENOENT') continue;
  baked = run.status === 0;
  break;
}
rmSync(scratch, { recursive: true, force: true });
if (!baked) {
  console.error('Bredbyn: Blender did not bake the shade, so art/baked/boot/bredbyn.glb is as it was. Set BLENDER to '
    + 'Blender 5.2, or BPY_PYTHON to a Python with the bpy module, and run this again.');
  process.exit(1);
}
console.log('Bredbyn: shade baked in Blender; art/baked/boot/bredbyn.glb written.');
