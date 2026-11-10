import { Vector3, type Group } from 'three';
import type { ChapterData } from '../sim/types';
import type { SpotProp } from './props';
import type { Rig } from './rig';
import { drawnWhile } from './idle';
import { holdCarving } from './carrying';

type Decor = { def: NonNullable<ChapterData['decor']>[number]; prop: SpotProp | null };

/**
 * The figures on Stormens öga's stone become the figures in Elof's hands. Reuse their actual objects, so the
 * approved models installed in them come along too. Their size stays fixed while Elof grows around them.
 */
export function createRescuedFigures(chapter: ChapterData, decor: readonly Decor[]) {
  if (chapter.id !== 'stormoga') return null;
  const old = decor.find(({ def }) => def.look === 'tragubbe' && def.until === 'taste');
  const little = decor.find(({ def }) => def.look === 'lillgubbe' && def.until === 'taste');
  const cap = decor.find(({ def }) => def.look === 'tiny-cap' && def.until === 'taste');
  if (!old?.prop || !little?.prop) return null;
  const figures = [old, little] as const;
  const hand = new Vector3(), target = new Vector3(), stone = new Vector3(), heldAxis = new Vector3(), up = new Vector3(0, 1, 0);
  // Undo only this layer's overrides before the next ordinary decor update. That update can then animate
  // the figures from its own state, including when a checkpoint restores flags from before the rescue.
  const saved = [...figures, ...(cap?.prop ? [cap] : [])].flatMap(({ prop }) => {
    const root = prop!.group;
    return [root, ...root.children.slice(0, 1)].map(object => ({ object, position: object.position.clone(),
      quaternion: object.quaternion.clone(), scale: object.scale.clone(), visible: object.visible, idle: object.userData.idle }));
  });
  let overridden = false;
  const restore = () => {
    if (!overridden) return;
    for (const state of saved) {
      state.object.position.copy(state.position);
      state.object.quaternion.copy(state.quaternion);
      state.object.scale.copy(state.scale);
      state.object.visible = state.visible;
      state.object.userData.idle = state.idle;
    }
    overridden = false;
  };

  return {
    /** Remove last frame's carry pose before updating the ordinary decor animations. */
    restore,
    /** Call after Elof's final pose and the ordinary decor update, including on a restored save. */
    update(flags: ReadonlySet<string>, player: Group, body: Pick<Rig, 'reach' | 'hand' | 'grasp' | 'hold'>, size: number): void {
      if (!flags.has('taste')) { restore(); return; }
      for (const state of saved) {
        state.position.copy(state.object.position);
        state.quaternion.copy(state.object.quaternion);
        state.scale.copy(state.object.scale);
        state.visible = state.object.visible;
        state.idle = state.object.userData.idle;
      }
      overridden = true;
      const grown = Math.max(0, Math.min(1, (size - 1) / ((chapter.size?.scale ?? 3) - 1)));
      const lift = grown * grown * (3 - 2 * grown);
      for (const side of [0, 1] as const) {
        const { def, prop } = figures[side];
        // Elbows bent near his waist, fingers around each carving's body. Its feet hang below the grip,
        // instead of balancing on the wrist with both arms held straight out.
        player.localToWorld(target.set(.23, .54, side === 0 ? -.16 : .16));
        holdCarving(body, side, target, up, side === 0 ? .27 : .18, side === 0 ? .12 : .09, hand, heldAxis, lift);
        stone.set(def.at.x, def.at.y, def.z ?? -.6);
        const root = prop!.group;
        root.position.copy(stone).lerp(hand, lift);
        root.quaternion.setFromUnitVectors(up, heldAxis);
        root.scale.setScalar(def.scale ?? 1);
        drawnWhile(root, true);
        // The little one's glad hop belongs on the stone, not above a moving palm.
        const toy = root.children[0];
        if (toy) { toy.position.set(0, 0, 0); toy.rotation.set(0, 0, 0); }
      }
      if (cap?.prop) {
        const root = cap.prop.group;
        root.position.copy(little.prop!.group.position).add(target.set(0, cap.def.at.y - little.def.at.y, 0).applyQuaternion(little.prop!.group.quaternion));
        root.rotation.copy(little.prop!.group.rotation);
        root.scale.setScalar(cap.def.scale ?? 1);
        drawnWhile(root, true);
        const hat = root.children[0];
        if (hat) hat.position.set(0, 0, 0);
      }
    },
  };
}
