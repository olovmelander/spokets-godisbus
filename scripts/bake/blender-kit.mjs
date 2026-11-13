// Builds a kit in Blender without its window, on this computer: art/blender/kit-tools.py, art/blender/creature-tools.py,
// the kit, the bake of its shade (art/blender/kit-bake.py), and, if asked, the export (scripts/bake/export.py), a .blend
// to look at, and stills of every clip of every creature in it. One command, and several may run at once.
//
//   node scripts/bake/blender-kit.mjs art/blender/crane.py --out=art/baked/boot/crane.glb       build, bake, export
//   node scripts/bake/blender-kit.mjs art/blender/crane.py --fast --preview=C:/tmp/crane         no bake; stills only
//   node scripts/bake/blender-kit.mjs art/blender/a2-nature.py --only=gran-a --fast --save=C:/tmp/gran.blend
//
//   --out=<file.glb>     export the scene there (relative to the repository, or absolute)
//   --fast               skip the bake of the shade (BAKE = False), to look at it quickly
//   --only=<name>        the kit builds only that thing (ONLY = '<name>'), where the kit reads ONLY
//   --save=<file.blend>  save the built scene, after the export
//   --preview=<folder>   after the export: <creature>-<clip>-<view>.png for every clip (creature-tools.py preview)
//   --views=side,top     the views of the stills: side, three-quarter, front, top (default side,three-quarter)
//   --clips=fly,kneel    stills of these clips only           --size=800x600   each still's size (default 400x300)
//   --blender=<exe>      Blender's program; else $BLENDER, else Blender 5.2 where Windows installs it, else `blender`
//
// The script it sends is written to the system's temporary folder under a name of its own, and Blender runs with
// --factory-startup, so that nothing of anyone's own Blender settings goes into a model.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const here = (path) => join(ROOT, path);
const slashed = (path) => resolve(ROOT, path).split('\\').join('/');
const [kit, ...flags] = process.argv.slice(2);
if (!kit || !existsSync(resolve(ROOT, kit))) {
  console.error('blender-kit: name a kit, such as art/blender/crane.py');
  process.exit(2);
}
const flag = (name) => flags.find((f) => f.startsWith(`--${name}=`))?.slice(name.length + 3);
const out = flag('out');
const only = flag('only');
const save = flag('save');
const preview = flag('preview');

function findBlender() {
  const asked = flag('blender') ?? process.env.BLENDER;
  if (asked) return asked;
  const windows = 'C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe';
  return existsSync(windows) ? windows : 'blender';
}

const parts = [
  `ROOT = r'${slashed('.')}'`,
  `BAKE = ${flags.includes('--fast') ? 'False' : 'True'}`,
  `ONLY = ${only ? `'${only}'` : 'None'}`,
  readFileSync(here('art/blender/kit-tools.py'), 'utf8'),
  readFileSync(here('art/blender/creature-tools.py'), 'utf8'),
  readFileSync(resolve(ROOT, kit), 'utf8'),
  readFileSync(here('art/blender/kit-bake.py'), 'utf8'),
];
parts.push(`for _arm in [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']:\n    report(_arm)`);
if (out) parts.push(`OUT = r'${slashed(out)}'`, readFileSync(here('scripts/bake/export.py'), 'utf8'));
if (save) parts.push(`bpy.ops.wm.save_as_mainfile(filepath=r'${slashed(save)}')`);
const names = (name, otherwise) => (flag(name) ? `(${flag(name).split(',').map((v) => `'${v}'`).join(', ')},)` : otherwise);
const [wide, high] = (flag('size') ?? '400x300').split('x').map(Number);
if (preview) {
  parts.push(`preview_creatures(r'${slashed(preview)}', globals().get('PREVIEW_FRAMES'), views=${names('views', "('side', 'three-quarter')")}, `
    + `clips=${names('clips', 'None')}, size=(${wide}, ${high}))`);
}
const file = join(tmpdir(), `kit-${basename(kit, '.py')}-${process.pid}.py`);
writeFileSync(file, parts.join('\n'));
const run = spawnSync(findBlender(), ['-b', '--factory-startup', '--python-exit-code', '1', '--python', file], { stdio: 'inherit' });
rmSync(file, { force: true });
if (run.error) console.error(`blender-kit: ${run.error.message}`);
process.exit(run.status ?? 1);
