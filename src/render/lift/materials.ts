import type { Object3D } from 'three';
import { PACK } from '../extensions';
import { createDew } from './materials/dew';
import { createPuddles } from './materials/puddles';
import { createSurfaces } from './materials/surface';

/**
 * The visual upgrade's materials (docs/visual-upgrade.md): matte carved wood against wet, glossy moss; wet
 * surfaces by the water, in the bog, on the street after rain and out of doors in the storm (./materials/surface.ts);
 * dew that catches the sun of a morning (./materials/dew.ts); puddles on the hard ground in the rain
 * (./materials/puddles.ts). The water that mirrors its banks is ../water.ts.
 *
 * The surfaces are a patch on the scene's own materials: the view lays it at each warm-up (`patch`), as it does
 * the rim light, so that a model which arrives late is patched before it is drawn.
 */
export function installMaterials(out: ReadonlySet<string> = new Set()): void {
  if (!out.has('surface')) {
    PACK.lifts.push((context) => {
      const surfaces = createSurfaces(context);
      return { update: (frame) => surfaces.update(frame), patch: (root: Object3D) => surfaces.apply(root) };
    });
  }
  if (!out.has('dew')) PACK.lifts.push(createDew);
  if (!out.has('puddles')) PACK.lifts.push(createPuddles);
}
