import { Group, type Object3D } from 'three';
import type { Assets } from './assets';

/** Scenic positions, separate from the playable deck, roots, hooks and saved checkpoints. */
export const GARDEN_HOME = [
  { name: 'home-house', x: 14, y: 5, z: -28, scale: 1 },
  { name: 'home-playhouse', x: 94, y: 0.2, z: -22, scale: 1 },
  { name: 'home-kota', x: 120, y: 0.2, z: -24, scale: 1 },
] as const;

/** Leave clear views through the nearer birches to each landmark's entrance and silhouette. */
export function gardenViewGap(x: number): boolean {
  return GARDEN_HOME.some(at => Math.abs(x - at.x) < (at.name === 'home-house' ? 28 : 14));
}

/** Private architecture stays removable; builds without it carry an original, generic garden. */
export async function installGardenHome(scene: Object3D, assets: Assets, standIns = false): Promise<string | null> {
  const manifest = await assets.manifest();
  const choices = [['garden', 'home-landmarks'], ['boot', 'garden-fallback']] as const;
  for (const [pack, name] of choices) {
    if (standIns && pack === 'garden') continue;
    if (!manifest.packs[pack]?.files[`${name}.glb`]) continue;
    try {
      const model = await assets.model(pack, name);
      const roots = GARDEN_HOME.map(at => model.getObjectByName(at.name));
      if (roots.some(root => !root)) continue;
      // Packed glTF may express quantization through each mesh's scale and translation. Keep
      // those authored transforms intact; the scenic placement belongs to a separate parent.
      model.updateMatrixWorld(true);
      GARDEN_HOME.forEach((at, i) => {
        const root = roots[i]!;
        root.name = `${at.name}-model`;
        const anchor = new Group();
        anchor.name = at.name;
        model.add(anchor);
        anchor.attach(root);
        anchor.position.set(at.x, at.y, at.z);
        anchor.scale.setScalar(at.scale);
      });
      model.name = 'garden-home';
      scene.add(model);
      const placeholder = scene.getObjectByName('garden-home-placeholder');
      if (placeholder) placeholder.visible = false;
      return `${pack}/${name}`;
    } catch (error) {
      console.warn('The garden buildings could not be loaded; trying the fallback.', error);
    }
  }
  return null;
}
