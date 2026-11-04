/**
 * The visual upgrade (docs/visual-upgrade.md): what every chapter of both adventures gets, on top of its place's
 * dressing. Each area is a module of its own that registers its systems into `PACK.lifts` (../extensions.ts):
 *
 * - `atmosphere.ts`: light shafts and god rays, dust motes in the light, leaves falling in the air, ground mist and
 *   depth haze;
 * - `fauna.ts`: the near forest's life (squirrels, a fox, owls, small birds that lift as he comes, fireflies,
 *   dragonflies, butterflies) and the little forest beings and carved figures that peek out;
 * - `flora.ts`: birch crowns, pines, moss, ferns, tall grass, glowing mushrooms, and plants that bend as he passes;
 * - `materials.ts`: wet and dry surfaces, dew, brooks that mirror the bank.
 *
 * Imported once by the view, so that a chapter built before any system registers still gets them all.
 */
import { installAtmosphere } from './atmosphere';
import { installFauna } from './fauna';
import { installFlora } from './flora';
import { installMaterials } from './materials';

let installed = false;

/**
 * `?nolift=fauna,flora` leaves those areas out (and `surface` or `dew`, the two halves of the materials), to compare their cost on a device (`?bench`) or in a picture. What
 * an area changed in the place's own dressing (the grass's tall clumps, the shared wind's bend, the effects' cards)
 * stays; only its systems here are not made.
 */
function left(): Set<string> {
  try {
    return new Set((new URLSearchParams(globalThis.location?.search ?? '').get('nolift') ?? '').split(',').filter(Boolean));
  } catch {
    return new Set();
  }
}

export function installLift(): void {
  if (installed) return;
  installed = true;
  const out = left();
  if (!out.has('atmosphere')) installAtmosphere();
  if (!out.has('fauna')) installFauna();
  if (!out.has('flora')) installFlora();
  if (!out.has('materials')) installMaterials(out);
}
