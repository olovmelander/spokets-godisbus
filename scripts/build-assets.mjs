// The pack step (plan §5.6, §6.6): every model baked from Blender in art/baked/<pack>/ becomes a file the
// game can load, in public/packs/<pack>/. Textures become KTX2 (ETC1S), meshes are compressed with meshopt,
// and manifest.json lists the bytes per pack. public/packs/ is generated and never committed.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const BAKED = join(ROOT, 'art', 'baked');
// Models that are not in the public repository (plan §2.6). The folder is ignored by git and exists only where
// those files are: on Olov's computer now, and later wherever the private repository is checked out.
const PRIVATE_BAKED = join(ROOT, 'art', 'private', 'baked');
const OUT = join(ROOT, 'public', 'packs');
const CLI = join(ROOT, 'node_modules', '@gltf-transform', 'cli', 'bin', 'cli.js');

/** The folder that holds the KTX-Software `ktx` tool, or '' when it is already on the PATH. */
function findKtx() {
  if (spawnSync('ktx', ['--version'], { encoding: 'utf8' }).status === 0) return '';
  const folders = [
    process.env.KTX_BIN,
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Programs', 'KTX-Software', 'bin'),
    process.env.ProgramFiles && join(process.env.ProgramFiles, 'KTX-Software', 'bin'),
  ].filter(Boolean);
  for (const folder of folders) {
    if (existsSync(join(folder, process.platform === 'win32' ? 'ktx.exe' : 'ktx'))) return folder;
  }
  console.error('build-assets: the KTX-Software `ktx` tool (4.4 or newer) was not found.');
  console.error('  Linux and CI: ./scripts/install-ktx.sh');
  console.error('  Windows: run the installer from https://github.com/KhronosGroup/KTX-Software/releases');
  console.error('           (HANDOVER.md has the command), or set KTX_BIN to the folder that holds ktx.exe.');
  process.exit(1);
}

const ktxFolder = findKtx();
const env = { ...process.env };
if (ktxFolder) {
  const key = Object.keys(env).find((k) => k.toLowerCase() === 'path') ?? 'PATH';
  env[key] = `${ktxFolder}${delimiter}${env[key] ?? ''}`;
}

function transform(args) {
  const run = spawnSync(process.execPath, [CLI, ...args], { env, encoding: 'utf8' });
  if (run.status !== 0) {
    console.error(run.stdout, run.stderr);
    console.error(`build-assets: gltf-transform ${args[0]} failed.`);
    process.exit(1);
  }
}

rmSync(OUT, { recursive: true, force: true });
const manifest = { version: 1, packs: {} };
const packsIn = (folder) =>
  existsSync(folder) ? readdirSync(folder).filter((name) => statSync(join(folder, name)).isDirectory()).map((name) => [name, join(folder, name)]) : [];
const packs = [...packsIn(BAKED), ...packsIn(PRIVATE_BAKED)];
for (const [pack, folder] of packs) {
  mkdirSync(join(OUT, pack), { recursive: true });
  const files = {};
  const hashes = {};
  for (const name of readdirSync(folder).filter((file) => file.endsWith('.glb')).sort()) {
    const source = join(folder, name);
    const target = join(OUT, pack, name);
    const temp = `${target}.tmp.glb`;
    // Colour textures as ETC1S; characters and small props carry no normal maps (plan §6.6).
    transform(['etc1s', source, temp, '--quality', '200']);
    transform(['meshopt', temp, target, '--level', 'medium']);
    rmSync(temp);
    files[name] = statSync(target).size;
    hashes[name] = createHash('sha256').update(readFileSync(target)).digest('hex');
    console.log(`  ${pack}/${name}: ${statSync(source).size} → ${files[name]} bytes`);
  }
  manifest.packs[pack] = { bytes: Object.values(files).reduce((sum, bytes) => sum + bytes, 0), files, hashes };
}
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`build-assets: ${packs.length} pack(s) written to public/packs/`);
