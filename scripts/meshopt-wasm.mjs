// Writes meshoptimizer's decoder (MIT, by Arseny Kapoulkine) as WebAssembly files of their own, from the copy that
// three ships inside a script (examples/jsm/libs/meshopt_decoder.module.js), so that the game's script does not carry
// it (src/render/meshopt.ts; plan §6.12, gate 2). Run it again after three is upgraded: a unit test says when.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MODULE = fileURLToPath(new URL('../node_modules/three/examples/jsm/libs/meshopt_decoder.module.js', import.meta.url));
const OUT = fileURLToPath(new URL('../src/render/meshopt/', import.meta.url));

/** The two builds of the decoder, as three's copy carries them, unpacked as its own `unpack` does. */
export function meshoptBuilds(source = readFileSync(MODULE, 'utf8')) {
  const string = (name) => source.match(new RegExp(`var ${name} =\\s*'([^']+)'`))?.[1];
  const pack = source.match(/var wasmpack = new Uint8Array\(\[([^\]]+)\]\)/)?.[1]?.split(',').map(Number);
  if (!pack) throw new Error('meshopt: no wasmpack in three\'s decoder');
  const unpack = (data) => {
    const result = new Uint8Array(data.length);
    for (let i = 0; i < data.length; ++i) {
      const ch = data.charCodeAt(i);
      result[i] = ch > 96 ? ch - 97 : ch > 64 ? ch - 39 : ch + 4;
    }
    let write = 0;
    for (let i = 0; i < data.length; ++i) result[write++] = result[i] < 60 ? pack[result[i]] : (result[i] - 60) * 64 + result[++i];
    return Buffer.from(result.buffer.slice(0, write));
  };
  const builds = {};
  for (const [name, variable] of [['base', 'wasm_base'], ['simd', 'wasm_simd']]) {
    const data = string(variable);
    if (!data) throw new Error(`meshopt: no ${variable} in three's decoder`);
    builds[name] = unpack(data);
  }
  return builds;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [name, bytes] of Object.entries(meshoptBuilds())) {
    writeFileSync(`${OUT}decoder-${name}.wasm`, bytes);
    console.log(`meshopt: decoder-${name}.wasm, ${bytes.length} bytes`);
  }
}
