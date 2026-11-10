import { Group, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { holdCarving } from '../../src/render/carrying';
import { createNorrskenRescue } from '../../src/render/norrsken-rescue';
import { createRehearsalRig, STANDING } from '../../src/render/rig';

describe('physical support for rescued carvings', () => {
  it('keeps the toy waist inside the actual palm, including a clamped reach on a turned body', () => {
    const rig = createRehearsalRig('pappa'), up = new Vector3(0, 1, 0);
    rig.group.position.set(8, 2, -3); rig.group.rotation.y = .8;
    const base = new Vector3(), axis = new Vector3(), actual = new Vector3();
    for (const far of [0, 20]) {
      rig.pose({ ...STANDING, armR: .8, elbowR: .5 });
      const target = rig.group.localToWorld(new Vector3(-.7 + far, 2.7, .9));
      holdCarving(rig, 1, target, up, .43, .12, base, axis);
      rig.grip(1, target, up, actual, 0);
      expect(base.clone().addScaledVector(axis, .43).distanceTo(actual)).toBeLessThan(1e-6);
      expect(axis.length()).toBeCloseTo(1);
      if (far) expect(actual.distanceTo(target)).toBeGreaterThan(10);
    }
  });

  it('lowers a visible line without lifting the toy, then drags it with lag and keeps it on the rock', () => {
    const rescue = createNorrskenRescue(), rig = createRehearsalRig('pappa');
    const player = new Group(), toy = new Group(); player.add(rig.group);
    player.position.set(10.9, 0, 0); toy.position.set(12.4, -2.6, 0);
    rig.pose(STANDING);
    const flags = new Set(['lower']);
    const bottom: number[] = [];
    for (const progress of [0, .5, 1]) {
      rescue.update(rig, player, toy, flags, progress, false, 0, .05, false);
      const line = rescue.group.children[8]!;
      bottom.push(line.position.y - line.scale.y / 2);
      expect(toy.position.y).toBe(-2.6);
    }
    expect(bottom[0]).toBeGreaterThan(bottom[1]!);
    expect(bottom[1]).toBeGreaterThan(bottom[2]!);
    expect(bottom[2]).toBeCloseTo(-2.22);
    flags.add('placed:tragubbe'); flags.add('scene:uppdragen'); toy.position.y = 0;
    rescue.update(rig, player, toy, flags, 1, false, 1, .05, false);
    player.position.x = 16;
    rescue.update(rig, player, toy, flags, 1, false, 1.05, .05, false);
    expect(toy.position.x).toBeGreaterThan(12.4);
    expect(toy.position.x).toBeLessThan(15.15);
    expect(toy.position.y).toBeCloseTo(.06);
    expect(toy.rotation.z).toBeLessThan(-.25);
    // Returning to paint its eyes, the wooden body does not teleport through him to the other side.
    const before = toy.position.x;
    player.position.x = before + .3;
    rescue.update(rig, player, toy, flags, 1, false, 1.1, .05, false);
    expect(toy.position.x).toBe(before);
    player.position.x = before - 1.4;
    rescue.update(rig, player, toy, flags, 1, false, 1.15, .05, false);
    expect(toy.position.x).toBeLessThan(before);
    expect(toy.position.x).toBeGreaterThan(player.position.x);
    expect(toy.rotation.z).toBeGreaterThan(.25);
    flags.add('taste');
    rescue.update(rig, player, toy, flags, 1, false, 2, .05, false);
    expect(rescue.group.visible).toBe(false);
  });
});
