import { fileURLToPath } from 'node:url';

/** The decoder that takes the place of three's Zstandard one, which the game never needs (src/render/no-zstd.ts). */
export const STUB = fileURLToPath(new URL('../src/render/no-zstd.ts', import.meta.url));

/**
 * A plugin that resolves KTX2Loader's import of three's Zstandard decoder to the game's stub: the decoder is
 * 17 KB of the script gzipped, and every texture the game ships is ETC1S, never Zstandard.
 */
export function noZstd() {
  return {
    name: 'no-zstd',
    enforce: 'pre',
    resolveId(source, importer) {
      return source.endsWith('/zstddec.module.js') && importer?.replaceAll('\\', '/').endsWith('/loaders/KTX2Loader.js') ? STUB : null;
    },
  };
}
