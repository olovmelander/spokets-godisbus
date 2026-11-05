import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import '../../src/content/aventyr2/aventyr2';
import { stormoga } from '../../src/content/aventyr2/chapters/stormoga';
import { morgonen } from '../../src/content/aventyr2/chapters/morgonen';
import { createPlayerStandIn } from '../../src/render/player-motion';
import { spotProp } from '../../src/render/props';
import { createRescuedFigures } from '../../src/render/rescued-figures';
import { STANDING } from '../../src/render/rig';

function setup() {
  const decor = stormoga.decor!.filter(def => ['tragubbe', 'lillgubbe', 'tiny-cap'].includes(def.look))
    .map((def, i) => ({ def, prop: spotProp({ id: `decor:${i}`, at: def.at, verb: 'take', look: def.look, word: def.word }) }));
  const player = createPlayerStandIn();
  const carry = createRescuedFigures(stormoga, decor)!;
  const root = (look: string) => decor.find(d => d.def.look === look)!.prop!.group;
  const show = (x: number, size: number, turn = 0) => {
    // The normal update would shrink all three objects away after taste.
    carry.restore();
    for (const d of decor) d.prop!.update(true, 100, 1);
    player.pose({ ...STANDING });
    player.group.position.set(x, 2, .3);
    player.group.rotation.y = turn;
    player.group.scale.setScalar(size);
    carry.update(new Set(['taste', 'scene:motet']), player.group, player, size);
  };
  return { decor, player, carry, root, show };
}

describe('the two rescued figures in Stormens öga', () => {
  it('keeps both original toys on Elof’s actual palms as he turns and walks home', () => {
    const { decor, player, root, show } = setup();
    const originals = decor.map(d => d.prop!.group.children[0]);
    for (const [x, turn] of [[48, 0], [62, -.35], [70, Math.PI + .35]]) {
      show(x!, 3, turn!);
      for (const [side, look] of [[0, 'tragubbe'], [1, 'lillgubbe']] as const) {
        const toy = root(look);
        expect(toy.visible).toBe(true);
        expect(toy.userData.idle).toBe(false);
        expect(toy.scale.toArray()).toEqual([1, 1, 1]);
        expect(toy.position.distanceTo(player.hand(side, new Vector3()))).toBeLessThan(1e-8);
      }
      expect(root('tiny-cap').position.clone().sub(root('lillgubbe').position).toArray()).toEqual([0, .48, 0]);
      expect(root('tiny-cap').visible).toBe(true);
    }
    expect(decor.map(d => d.prop!.group.children[0])).toEqual(originals);
  });

  it('lifts the toys from the stone during growth and restores the final carry without replaying it', () => {
    const first = setup();
    first.show(48, 1);
    const old = first.decor.find(d => d.def.look === 'tragubbe')!.def;
    expect(first.root('tragubbe').position.toArray()).toEqual([old.at.x, old.at.y, old.z]);
    first.show(48, 2);
    const halfway = first.root('tragubbe').position.clone();
    first.show(48, 3);
    expect(halfway.distanceTo(first.root('tragubbe').position)).toBeGreaterThan(.1);
    const restored = setup();
    restored.show(48, 3);
    for (const look of ['tragubbe', 'lillgubbe', 'tiny-cap']) {
      expect(restored.root(look).position.toArray()).toEqual(first.root(look).position.toArray());
    }
  });

  it('leaves the meeting and every other chapter’s figures to their own staging', () => {
    const { carry, decor, player, root } = setup();
    for (const d of decor) d.prop!.update(false, 0, 0);
    const before = root('tragubbe').position.clone();
    carry.update(new Set(['scene:motet']), player.group, player, 1);
    expect(root('tragubbe').position).toEqual(before);
    expect(createRescuedFigures(morgonen, decor)).toBeNull();
  });

  it('restores the stone’s own animation when a checkpoint rewinds the rescue, then carries again', () => {
    const actual = setup(), fresh = setup();
    actual.show(70, 3, Math.PI + .35);
    actual.carry.restore();
    for (const game of [actual, fresh]) {
      for (const d of game.decor) d.prop!.update(false, 12, 1 / 60);
      game.carry.update(new Set(), game.player.group, game.player, 1);
    }
    for (const look of ['tragubbe', 'lillgubbe', 'tiny-cap']) {
      const after = actual.root(look), before = fresh.root(look);
      expect(after.position.toArray()).toEqual(before.position.toArray());
      expect(after.quaternion.toArray()).toEqual(before.quaternion.toArray());
      expect(after.scale.toArray()).toEqual(before.scale.toArray());
      expect(after.visible).toBe(before.visible);
      expect(after.children[0]!.position.toArray()).toEqual(before.children[0]!.position.toArray());
      expect(after.children[0]!.quaternion.toArray()).toEqual(before.children[0]!.quaternion.toArray());
    }
    actual.show(50, 3, -.35);
    fresh.show(50, 3, -.35);
    for (const look of ['tragubbe', 'lillgubbe', 'tiny-cap']) {
      expect(actual.root(look).position.toArray()).toEqual(fresh.root(look).position.toArray());
      expect(actual.root(look).visible).toBe(true);
    }
  });
});
