/**
 * The visual upgrade (docs/visual-upgrade.md): what every chapter of both adventures gets, on top of its place's
 * dressing. Each area is a module of its own that registers its systems into `PACK.lifts` (../extensions.ts):
 *
 * - `atmosphere.ts`: light shafts and god rays, dust motes in the light, leaves falling in the air, ground mist and
 *   depth haze;
 * - `fauna.ts`: the near forest's life (squirrels, a fox, owls, small birds that lift as he comes, fireflies,
 *   dragonflies, butterflies) and the little forest beings and carved figures that peek out;
 * - `near-motes.ts`: pollen and dust drifting just in front of the lens, out of focus, soft discs of light;
 * - `beetles.ts`: dor beetles walking on the forest floor just behind the path, which hurry out of his way;
 * - `bumblebee.ts`: the garden's bumblebee, which bumbles from dandelion to dandelion;
 * - `flora.ts`: birch crowns, pines, moss, ferns, tall grass, glowing mushrooms, and plants that bend as he passes;
 * - `materials.ts`: wet and dry surfaces, dew, brooks that mirror the bank.
 *
 * Imported once by the view, so that a chapter built before any system registers still gets them all.
 */
import { installAtmosphere } from './atmosphere';
import { installBeetles } from './beetles';
import { installBumblebee } from './bumblebee';
import { installFauna } from './fauna';
import { installBirds } from './fauna/bird-kit';
import { installSmallLife } from './fauna/small-kit';
import { installOwls } from '../owl';
import { installFlora } from './flora';
import { installMaterials } from './materials';
import { installNearMotes } from './near-motes';
import { PACK } from '../extensions';

let installed = false;

/**
 * `?nolift=fauna,flora` leaves those areas out (and `surface`, `dew` or `puddles`, the parts of the materials), to compare their cost on a device (`?bench`) or in a picture. What
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
  // The small life modelled in Blender (./fauna/small-kit.ts) comes for every one of it in the scene: the fauna's,
  // the bumblebee and the ants that carry him (../ant-ride.ts).
  PACK.models.push(installSmallLife);
  // The rigged owl (../owl.ts) comes for the story's owl and for the near forest's owls on their branches.
  PACK.models.push(installOwls);
  // The birds modelled in Blender (./fauna/bird-kit.ts), small and high, the same way.
  PACK.models.push(installBirds);
  if (!out.has('atmosphere')) installAtmosphere();
  if (!out.has('atmosphere') && !out.has('near')) installNearMotes();
  if (!out.has('fauna')) installFauna();
  if (!out.has('beetles')) installBeetles();
  if (!out.has('fauna') && !out.has('bee')) installBumblebee();
  if (!out.has('flora')) installFlora();
  if (!out.has('materials')) installMaterials(out);
}
