/**
 * In place of three's Zstandard decoder (`three/examples/jsm/libs/zstddec.module.js`, 17 KB of the script
 * gzipped), which KTX2Loader imports for KTX2 images supercompressed with Zstandard. The game has none: every
 * texture is built as ETC1S (scripts/build-assets.mjs), whose supercompression is BasisLZ, and the asset build
 * fails on one that is Zstandard (scripts/asset-gpu-estimate.mjs). The build puts this here
 * (scripts/no-zstd.mjs); should an image ever ask for it, its texture fails to load with this message.
 */
export class ZSTDDecoder {
  init(): Promise<void> {
    return Promise.resolve();
  }

  decode(): Uint8Array {
    throw new Error('The game ships no Zstandard decoder: build KTX2 textures as ETC1S (scripts/no-zstd.mjs).');
  }
}
