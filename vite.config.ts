import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import { noZstd } from './scripts/no-zstd.mjs';
import { squeezeShaders } from './scripts/squeeze-glsl.mjs';
import { staticPresentation } from './scripts/static-presentation.mjs';
import { sv } from './src/content/sv';
import { spriteHtml } from './src/ui/sprite';
import { MEMORIES } from './src/ui/memory-art';
import { shellHtml } from './src/ui/shell-html';

const base = '/spokets-godisbus/';
const hash = (content: string | Uint8Array) => createHash('sha256').update(content).digest('hex');
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((file) => file.isDirectory() ? sources(join(dir, file.name)) : [join(dir, file.name)]);
}

export default defineConfig(({ mode }) => {
  const manifestPath = 'public/packs/manifest.json';
  const assetVersion = existsSync(manifestPath) ? hash(readFileSync(manifestPath)) : 'dev';
  // Stable for identical builds; changes for code, art, dependency or HTML changes. No timestamps.
  const version = hash([...sources('src'), ...(existsSync('public') ? sources('public') : []), 'index.html', 'package-lock.json', 'vite.config.ts', 'scripts/squeeze-glsl.mjs', 'scripts/no-zstd.mjs', 'scripts/static-presentation.mjs']
    .map((file) => `${file}:${hash(readFileSync(file))}`).join('\n')).slice(0, 24);
  return {
    base,
    define: { __BUILD_VERSION__: JSON.stringify(version), __ASSET_VERSION__: JSON.stringify(assetVersion) },
    plugins: [
      ...(mode === 'lan' ? [basicSsl()] : []),
      // The script's size gate (scripts/size-gate.mjs) leaves room for graphics when shaders carry no padding.
      { name: 'squeeze-glsl', apply: 'build', enforce: 'pre', transform: squeezeShaders },
      // ...and when it carries no Zstandard decoder, which no texture of the game's needs (src/render/no-zstd.ts).
      noZstd(),
      // The drawn icons, once, at the top of every page (src/ui/sprite.ts): the game's script carries none of them.
      { name: 'icon-sprite', transformIndexHtml: (html: string) => html.replace(/<body([^>]*)>/, (body) => `${body}\n  ${spriteHtml()}`) },
      staticPresentation(MEMORIES, shellHtml),
      // The home screen's name for the web app on an iPhone, from the game's words (access-and-devices.md row 21).
      { name: 'short-name', transformIndexHtml: (html: string) => html.replace('%SHORT_NAME%', sv.homeScreen.shortName) },
      VitePWA({
        strategies: 'injectManifest', srcDir: 'src', filename: 'sw.ts',
        injectRegister: false, registerType: 'prompt',
        manifest: {
          id: base, name: sv.title, short_name: sv.homeScreen.shortName,
          lang: 'sv', start_url: base, scope: base, display: 'standalone',
          display_override: ['fullscreen', 'standalone'], orientation: 'landscape',
          theme_color: '#ecdfc6', background_color: '#ecdfc6',
          // Android cuts its own shape out of a maskable icon: the ghost on its cream to the edges, inside the middle
          // 80 % (access-and-devices.md row 21).
          icons: [
            ...[192, 512].map((size) => ({ src: `icons/ghost-${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any' })),
            { src: 'icons/ghost-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        injectManifest: {
          globPatterns: ['**/*.{js,wasm,css,html,woff2}', 'assets/*.webp', 'icons/*.png', 'packs/manifest.json', 'packs/boot/*.{glb,ktx2,m4a,webp}'],
          maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
          // Pack filenames are stable. Version their URLs too, including the manifest fetched by old pages.
          manifestTransforms: [(entries) => ({
            manifest: entries.map((entry) => {
              if (!entry.url.startsWith('packs/')) return entry;
              const bytes = readFileSync(join('public', entry.url));
              return { ...entry, url: `${entry.url}?v=${hash(bytes)}`, integrity: `sha256-${createHash('sha256').update(bytes).digest('base64')}` };
            }), warnings: [],
          })],
        },
      }),
    ],
    build: { target: 'es2022', chunkSizeWarningLimit: 900, emptyOutDir: true },
    // A robot plays a whole chapter in one test. Vitest's five seconds are enough on a quiet computer, and
    // not when another session's browser is drawing the game beside it (HANDOVER.md, "Known bugs").
    test: { include: ['tests/{unit,sim,robot}/**/*.test.ts'], environment: 'node', testTimeout: 30000 },
  };
});
