import {
  BoxGeometry, CapsuleGeometry, ConeGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry, Vector3, type Object3D, type SkinnedMesh,
} from 'three';
import type { SceneFrame } from '../sim/scene';
import type { ChapterData } from '../sim/types';
import { DOLL_SIZE, DOLL_Z, ELOF_COAT, PUT_ON, TAKE, TAKE_OFF, smooth } from './elof-coat';

/** What is drawn of Elof's raincoat beside what ./rain-gear.ts draws on him (./elof-coat.ts): the coat in his hands. */

/**
 * What of a body is worn over the coat, by its corners: Elof's backpack, its olive canvas, its straps and buckles (and his
 * shirt's buttons, under the coat in any case), told by their colours. Null for anyone else's body: their coats' shells
 * are of all that the coat covers.
 */
export function wornOver(body: SkinnedMesh): ((corner: number) => boolean) | null {
  const material = body.material as MeshStandardMaterial;
  const colour = body.geometry.getAttribute('color');
  if (!colour || !/^elof\b/.test(material.name ?? '')) return null;
  return (i) => {
    const r = colour.getX(i), g = colour.getY(i), b = colour.getZ(i);
    return r < 0.6 && b < 0.6 * g && b < 0.45 * r;
  };
}

/** The doll's coat as it is taken off the doll, built small in code until the room's model has come (art/blender/a2-room.py). */
function codeCoat(): Group {
  const group = new Group();
  const material = new MeshStandardMaterial({ color: ELOF_COAT, roughness: 0.42 });
  const body = new Mesh(new ConeGeometry(0.2, 0.42, 14, 1, true).translate(0, 0.27, 0), material);
  const top = new Mesh(new SphereGeometry(0.11, 12, 8).scale(1.3, 0.55, 1).translate(0, 0.47, 0), material);
  const hood = new Mesh(new SphereGeometry(0.09, 10, 8).scale(1, 0.8, 0.5).translate(0, 0.42, -0.12), material);
  for (const side of [-1, 1]) {
    const sleeve = new Mesh(new CapsuleGeometry(0.05, 0.16, 4, 8).rotateZ(side * 0.3).translate(side * 0.17, 0.32, 0), material);
    group.add(sleeve);
  }
  const zip = new Mesh(new BoxGeometry(0.012, 0.36, 0.01).translate(0, 0.28, 0.2), new MeshStandardMaterial({ color: '#4a4a4e', roughness: 0.5 }));
  group.add(body, top, hood, zip);
  return group;
}

/** Whether the coat is ever in his hands in this chapter: where he takes it from the doll, or takes it off. */
export function holdsCoat(chapter: Pick<ChapterData, 'spots' | 'scenes'>): boolean {
  return (chapter.spots ?? []).some((spot) => spot.id === TAKE) || (chapter.scenes ?? []).some((scene) => scene.id === TAKE_OFF.scene);
}

/**
 * The coat between the doll and his back, and from his back to the stone: in his two hands as he takes it and holds it
 * up, and lying on the stone after he has laid it down in the storm's eye, until he grows (the POFF hides it).
 */
export function createHeldCoat(chapter: Pick<ChapterData, 'id' | 'spots'>) {
  const group = new Group();
  group.name = 'held-coat';
  const holder = new Group();
  holder.userData.model = 'docka-rock';
  holder.userData.disposeFallback = true;
  holder.add(codeCoat());
  group.add(holder);
  group.visible = false;
  const doll = chapter.spots?.find((spot) => spot.id === TAKE);
  const from = doll ? new Vector3(doll.at.x, doll.at.y, DOLL_Z) : null;
  const hands = new Vector3(), other = new Vector3(), laid = new Vector3();
  let laidSet = false;
  return {
    group,
    /**
     * Where it is this frame: `rig` is his body, posed; `body` his drawn group; `size` how big he is drawn, which it is held
     * at while in his hands; `ground` the height he stands at. In reduced motion (`calm`) the coat goes on and comes off at
     * once (./elof-coat.ts `coatOnAt`): it is never in his hands, and lies on the stone from the moment it is off.
     */
    update(scene: SceneFrame | null, flags: ReadonlySet<string>, rig: { hand(side: 0 | 1, out: Vector3): Vector3 }, body: Object3D, size: number, ground: number, calm = false): void {
      const t = scene?.seconds ?? 0;
      // In his hands from the doll until it begins to go on him, and from when it is off him until he lays it down.
      const putting = chapter.id === 'stormkvall' && scene?.id === PUT_ON.scene && t < PUT_ON.on && !calm;
      const taking = chapter.id === 'stormoga' && scene?.id === TAKE_OFF.scene && (t >= TAKE_OFF.off || calm);
      const lying = chapter.id === 'stormoga' && (flags.has(`scene:${TAKE_OFF.scene}`) || (taking && (t >= TAKE_OFF.laid || calm)))
        && (!flags.has('taste') || (scene?.id === 'stor' && t < 2));
      group.visible = putting || taking || lying;
      if (!group.visible) { if (!flags.has(`scene:${TAKE_OFF.scene}`)) laidSet = false; return; }
      rig.hand(0, hands); rig.hand(1, other);
      hands.add(other).multiplyScalar(0.5);
      if (lying) {
        // Laid down flat on the stone where his hands put it, at his feet, its front up and its collar away from us. A game
        // taken up after it finds it a little behind where he stands.
        if (!laidSet) { laid.set(taking ? hands.x : body.position.x - 0.55, ground + 0.06, -0.12); laidSet = true; }
        group.position.copy(laid);
        group.rotation.set(-Math.PI / 2, 0, 0.3);
        // Empty, it lies flat.
        group.scale.set(DOLL_SIZE, DOLL_SIZE, DOLL_SIZE * 0.4);
        return;
      }
      group.rotation.set(0, 0, 0);
      const held = DOLL_SIZE * Math.min(1, size);
      group.scale.setScalar(held);
      // Off the doll and into his hands; held by its shoulders, it hangs from them.
      const k = putting && from ? smooth(t / PUT_ON.hands) : 1;
      group.position.copy(hands).add(other.set(0, -0.44 * held, 0));
      if (from && k < 1) group.position.lerp(other.set(from.x, from.y + 0.02, from.z), 1 - k);
    },
  };
}
