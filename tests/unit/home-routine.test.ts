import { Box3, Vector3 } from 'three';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { epilog, prolog } from '../../src/content/chapters/ends';
import { stormkvall } from '../../src/content/aventyr2/chapters/stormkvall';
import { morgonen } from '../../src/content/aventyr2/chapters/morgonen';
import { BATHROOM, createHomeRoutine } from '../../src/render/home-routine';
import { createEpilogueStage } from '../../src/render/epilogue-stage';

describe('the family bathroom and first carving', () => {
  it('bakes the doorway hinge and brush bristles at their runtime anchors, without textures or private art', () => {
    const bytes = readFileSync(new URL('../../art/baked/aventyr2/home-routine.glb', import.meta.url));
    const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
    expect(json.images).toBeUndefined();
    const shape = (name: string) => {
      const node = json.nodes.find((one: { name: string }) => one.name === name);
      expect(node.translation).toBeUndefined();
      expect(node.rotation).toBeUndefined();
      const primitives = json.meshes[node.mesh].primitives;
      expect(primitives).toHaveLength(1);
      expect(primitives[0].attributes.COLOR_0).toBeDefined();
      return json.accessors[primitives[0].attributes.POSITION];
    };
    const door = shape('home-routine-door');
    expect(door.min[0]).toBe(0); // Hinge, not the centre of the leaf.
    expect(door.min[1]).toBe(0);
    expect(door.max[0]).toBeCloseTo(3.6);
    expect(door.max[1]).toBeCloseTo(5.9);
    const brush = shape('home-toothbrush');
    expect(brush.max[1]).toBeCloseTo(.17 + .095 / 2);
    expect(shape('home-routine-room').max[0]).toBeLessThan(38); // Inside the exterior door.
  });

  it('keeps the same real doorway in all four home chapters', () => {
    const positions = [prolog, epilog, stormkvall, morgonen].map(chapter => {
      const room = createHomeRoutine(chapter);
      const door = room.group.getObjectByName('bathroom-door')!;
      return new Box3().setFromObject(door).getCenter(new Vector3()).toArray();
    });
    for (const position of positions) expect(position).toEqual(positions[0]);
    expect(positions[0]![0]).toBeCloseTo(BATHROOM.x);
    expect(positions[0]![2]).toBeLessThan(0);
  });

  it('walks on the floor through the open door, then brushes at his mouth and ends inside', () => {
    const room = createHomeRoutine(epilog), flags = new Set(['teeth']);
    const where = { x: BATHROOM.x, y: 0 };
    room.update(flags, { id: 'bathroom', seconds: 0 }, 0);
    expect(room.body(where)!.position.distanceTo(new Vector3(BATHROOM.x, 0, 0))).toBe(0);
    room.update(flags, { id: 'bathroom', seconds: 1.8 }, 1.8);
    const halfway = room.body(where)!;
    expect(halfway.walking).toBe(true);
    expect(halfway.position.y).toBe(0);
    expect(halfway.position.z).toBeLessThan(BATHROOM.doorZ / 2);
    expect(room.group.getObjectByName('bathroom-door')!.rotation.y).toBeLessThan(-1);
    room.update(flags, { id: 'bathroom', seconds: 5 }, 5);
    expect(room.body(where)!.walking).toBe(false);
    expect(room.body(where)!.position.toArray()).toEqual([BATHROOM.x, 0, BATHROOM.feetZ]);
    const mouth = new Vector3(BATHROOM.x, 2.7, BATHROOM.feetZ);
    const grasp = vi.fn((_side, _grip, target: Vector3, axis: Vector3, out: Vector3, _weight, axisOut: Vector3) => { axisOut.copy(axis); return out.copy(target).add(new Vector3(.015, 0, 0)); });
    room.updateElof({ mouth: out => out.copy(mouth), hand: (_side, out) => out, reach: vi.fn(), grasp });
    const brush = room.group.getObjectByName('elof-toothbrush')!;
    expect(brush.visible).toBe(true);
    // The brush's bristles are .17 along its local y, not its centre. They touch the mouth; the fist holds its handle.
    const bristles = brush.localToWorld(new Vector3(0, .17, 0));
    expect(bristles.distanceTo(mouth)).toBeLessThan(.08);
    expect(grasp).toHaveBeenCalledOnce();
    expect((grasp.mock.calls[0]![4] as Vector3).distanceTo(brush.position)).toBeLessThan(.001);
    room.update(new Set(['teeth', 'bedtime']), null, 12);
    expect(room.body(where)!.position.toArray()).toEqual([BATHROOM.x, 0, BATHROOM.feetZ]);
    expect(brush.visible).toBe(false);
  });

  it('shows the actual completed carving immediately, with its feet on the private hand socket', () => {
    const stage = createEpilogueStage(epilog.epilogue);
    const figure = stage.group.getObjectByName('epilogue-lillgubbe')!;
    const palm = new Vector3(32.3, 2.1, .8), hold = vi.fn();
    stage.update(new Set(['dots']), null, false);
    stage.updateElof({ hand: (_side, out) => out, socket: (_side, _grip, out) => out.copy(palm), hold });
    expect(figure.visible).toBe(true);
    expect(figure.userData.model).toBe('lillgubbe');
    const feet = figure.getWorldPosition(new Vector3());
    expect(feet.distanceTo(palm)).toBeCloseTo(.02);
    expect(hold).toHaveBeenCalledWith(1, { kind: 'flat', size: 0 });
    stage.update(new Set(['dots', 'scene:first-carving']), null, false);
    expect(figure.getWorldPosition(new Vector3()).toArray()).toEqual(Object.values(epilog.epilogue!.window));
  });
});
