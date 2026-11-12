import { Group, Mesh, MeshStandardMaterial, Object3D } from 'three';
import type { ChapterData } from '../sim/types';
import { barkDetail } from './bark-detail';
import { heightAt } from './dressing/kit';
import { swayingBough } from './ledges';

/**
 * The boughs the wind sways over Stormskogen's ravine (a mover with a `cycle`, drawn as a twig). Drawn as the kit's
 * twig, they were sawn-off logs swinging in the air with nothing holding them. Each is now a spruce bough as the
 * branch ledges beside them are drawn (./ledges.ts): its branchlets hang from it, and it grows from a young stem
 * behind it, rooted on the ravine's floor, that leans to and fro as the bough swings: a young spruce in the storm.
 *
 * The bough goes where the simulation has it, level, as its mover group does (./mover-motion.ts). The stem turns
 * about its foot so that it meets the bough's middle; its foot stays where it stands on the ground.
 */
export function swayingBoughs(chapter: ChapterData, meshes: readonly Object3D[]): Group | null {
  const boughs = (chapter.movers ?? []).flatMap((mover, i) => mover.look === 'twig' && mover.cycle && meshes[i] ? [{ mover, group: meshes[i]! }] : []);
  if (boughs.length === 0) return null;
  const group = new Group();
  group.name = 'swaying-boughs';
  const solid = new MeshStandardMaterial({ vertexColors: true, roughness: 0.88 });
  barkDetail(solid);
  for (const { mover, group: moving } of boughs) {
    const { bough, stem } = swayingBough(mover.width);
    // The bough on the mover, in place of the kit's twig: its top where he stands.
    const prop = moving.children[0];
    if (prop) prop.visible = false;
    const drawn = new Mesh(bough, solid);
    drawn.name = `swaying-bough:${mover.id}`;
    drawn.position.y = mover.height;
    moving.add(drawn);
    // The stem, rooted under the middle of the bough's swing.
    const xs = mover.stops.map((stop) => stop.x);
    const middle = (Math.min(...xs) + Math.max(...xs)) / 2;
    const foot = new Object3D();
    foot.position.set(middle, heightAt(chapter, middle), 0);
    const tall = Math.max(...mover.stops.map((stop) => stop.y)) + mover.height - foot.position.y;
    const trunk = new Mesh(stem, solid);
    trunk.name = `swaying-stem:${mover.id}`;
    trunk.position.y = tall;
    foot.add(trunk);
    group.add(foot);
    // After the movers are placed in a frame (../render/view.ts runs a mover's `tick` then): lean to the bough.
    const tick = prop?.userData.tick as ((clock: number) => void) | undefined;
    const lean = () => { foot.rotation.z = -Math.atan2(moving.position.x - middle, moving.position.y + mover.height - foot.position.y); };
    moving.children[0]!.userData.tick = (clock: number) => { tick?.(clock); lean(); };
    lean();
  }
  return group;
}
