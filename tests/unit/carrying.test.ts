import { Group, type Mesh, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { holdCarving } from '../../src/render/carrying';
import { createNorrskenRescue, ghostHoldAt, heaveAt } from '../../src/render/norrsken-rescue';
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

  it('lowers a visible line without lifting the toy, then draws it dragged on the rock where the simulation tows it', () => {
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
    flags.add('placed:tragubbe'); flags.add('scene:uppdragen'); toy.position.set(12.4, 0, 0);
    rescue.update(rig, player, toy, flags, 1, false, 1, .05, false);
    // Where it lies is the simulation's (Mover.tow): the line draws it on the rock, and never moves it along itself.
    player.position.x = 16;
    for (let i = 0; i < 12; i++) { toy.position.x += .2; rescue.update(rig, player, toy, flags, 1, false, 1 + i * .05, .05, false); }
    expect(toy.position.x).toBeCloseTo(14.8);
    // Dragged, its lower corner scrapes the rock, leaning back from him.
    expect(toy.position.y).toBeCloseTo(.06, 2);
    expect(toy.rotation.z).toBeLessThan(-.25);
    expect(rescue.hauling).toBeGreaterThan(.9);
    // At rest a step behind him, it stands upright on the rock again: its candy is given there.
    for (let i = 0; i < 12; i++) rescue.update(rig, player, toy, flags, 1, false, 2 + i * .05, .05, false);
    expect(toy.rotation.z).toBeCloseTo(0, 2);
    expect(toy.position.y).toBeCloseTo(.015, 2);
    // Dragged the other way, it leans the other way.
    player.position.x = 10;
    for (let i = 0; i < 12; i++) { toy.position.x -= .2; rescue.update(rig, player, toy, flags, 1, false, 3 + i * .05, .05, false); }
    expect(toy.rotation.z).toBeGreaterThan(.25);
    flags.add('taste');
    rescue.update(rig, player, toy, flags, 1, false, 2, .05, false);
    expect(rescue.group.visible).toBe(false);
  });

  it('heaves three times in one pull, with the lace\'s end back to the ghost behind him (Olov, 13 November 2026)', () => {
    // Three heaves, between the scene's cue and the lip; one steady pull with reduced motion.
    const heaves = Array.from({ length: 64 }, (_, i) => heaveAt(i * .05));
    expect(heaves.slice(0, 8).every((h) => h === 0)).toBe(true);
    expect(heaves.filter((h, i) => i > 0 && h > .9 && heaves[i - 1]! <= .9).length).toBe(3);
    expect(heaveAt(3)).toBe(0);
    expect(heaveAt(1, true)).toBe(heaveAt(2, true));
    expect(ghostHoldAt(0)).toBe(0);
    expect(ghostHoldAt(.6)).toBe(1);

    const rescue = createNorrskenRescue(), rig = createRehearsalRig('pappa');
    const player = new Group(), toy = new Group(); player.add(rig.group);
    player.position.set(10.9, 0, 0); toy.position.set(12.4, -1.5, 0);
    rig.pose(STANDING);
    const flags = new Set(['lower', 'nr:rope-ready', 'haul']);
    const tail = () => rescue.group.children.slice(18) as Mesh[];
    // Before the ghost has it, the end is not drawn.
    rescue.update(rig, player, toy, flags, 1, true, 0, .05, false, 0, false, 0, { heave: 0, ghost: null, hold: 0 });
    expect(tail().some((piece) => piece.visible)).toBe(false);
    // Held, it runs from his hands back to the ghost's front.
    const ghost = new Vector3(9.95, 0, .05);
    rescue.update(rig, player, toy, flags, 1, true, 1, .05, false, 0, false, 0, { heave: 1, ghost, hold: 1 });
    expect(tail().every((piece) => piece.visible)).toBe(true);
    const last = tail().at(-1)!;
    const end = last.position.clone().add(new Vector3(0, last.scale.y / 2, 0).applyQuaternion(last.quaternion));
    const start = last.position.clone().sub(new Vector3(0, last.scale.y / 2, 0).applyQuaternion(last.quaternion));
    const nearer = end.distanceTo(ghost) < start.distanceTo(ghost) ? end : start;
    expect(nearer.x).toBeCloseTo(ghost.x + .26, 1);
    expect(nearer.y).toBeCloseTo(.42, 1);
    // Out of the crack, the ghost lets go of it.
    flags.add('placed:tragubbe'); toy.position.set(12.4, 0, 0);
    rescue.update(rig, player, toy, flags, 1, false, 2, .05, false, 0, false, 0, { heave: 0, ghost, hold: 1 });
    expect(tail().some((piece) => piece.visible)).toBe(false);
  });
});
