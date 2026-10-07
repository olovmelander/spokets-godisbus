import { describe, expect, it } from 'vitest';
import { noZstd, STUB } from '../../scripts/no-zstd.mjs';
import { ZSTDDecoder } from '../../src/render/no-zstd';

describe("three's Zstandard decoder", () => {
  it("is the game's stub where KTX2Loader asks for it, and nowhere else", () => {
    const plugin = noZstd();
    expect(plugin.resolveId('../libs/zstddec.module.js', '/x/node_modules/three/examples/jsm/loaders/KTX2Loader.js')).toBe(STUB);
    expect(plugin.resolveId('../libs/zstddec.module.js', 'C:\\x\\node_modules\\three\\examples\\jsm\\loaders\\KTX2Loader.js')).toBe(STUB);
    expect(plugin.resolveId('../libs/meshopt_decoder.module.js', '/x/node_modules/three/examples/jsm/loaders/KTX2Loader.js')).toBeNull();
    expect(plugin.resolveId('../libs/zstddec.module.js', '/x/src/render/assets.ts')).toBeNull();
    expect(STUB.replaceAll('\\', '/')).toMatch(/\/src\/render\/no-zstd\.ts$/);
  });

  it('says why, if an image ever asks it to decode', async () => {
    const decoder = new ZSTDDecoder();
    await expect(decoder.init()).resolves.toBeUndefined();
    expect(() => decoder.decode()).toThrow('ETC1S');
  });
});
