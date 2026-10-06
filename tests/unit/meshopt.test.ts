import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { meshoptBuilds } from '../../scripts/meshopt-wasm.mjs';

const file = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url));

// The meshes' decoder is a file of its own, not 16 KB of the script (src/render/meshopt.ts; plan §6.12, gate 2).
describe('the meshopt decoder', () => {
  it('is three\'s own, byte for byte: after an upgrade of three, run scripts/meshopt-wasm.mjs', () => {
    const builds = meshoptBuilds();
    expect(Buffer.compare(file('src/render/meshopt/decoder-base.wasm'), Buffer.from(builds.base))).toBe(0);
    expect(Buffer.compare(file('src/render/meshopt/decoder-simd.wasm'), Buffer.from(builds.simd))).toBe(0);
  });

  it('starts, and has what the packs ask of it', async () => {
    const { instance } = await WebAssembly.instantiate(file('src/render/meshopt/decoder-base.wasm'), {});
    const names = Object.keys(instance.exports);
    for (const name of ['memory', 'sbrk', '__wasm_call_ctors', 'meshopt_decodeVertexBuffer', 'meshopt_decodeIndexBuffer',
      'meshopt_decodeIndexSequence', 'meshopt_decodeFilterOct', 'meshopt_decodeFilterQuat', 'meshopt_decodeFilterExp']) {
      expect(names, name).toContain(name);
    }
  });

  it('is never taken from three\'s script', () => {
    expect(file('src/render/assets.ts').toString()).not.toMatch(/meshopt_decoder\.module/);
  });
});
