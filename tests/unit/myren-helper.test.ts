import { Group, Object3D, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { braidTip, mammaPathY, mammaPathZ, pineTilt } from '../../src/render/myren-helper';
import { buildBraid } from '../../src/render/braid';

describe('the same Mamma at the log and braid', () => {
  it('walks level across the log, then climbs continuously to the braid steps', () => {
    for (const x of [84.8, 86, 90, 94, 97.2]) expect(mammaPathY(x)).toBe(0);
    let previous = 0;
    for (let x = 97.2; x < 102.2; x += .01) {
      const y = mammaPathY(x);
      expect(y - previous).toBeLessThan(.005); previous = y;
    }
    expect(mammaPathY(102.2)).toBeCloseTo(2.35);
    for (const x of [85.7, 89, 93, 94.3]) expect(mammaPathZ(x)).toBe(0);
    expect(mammaPathZ(102.2)).toBeCloseTo(-1.35);
  });
  it('lays the near end down continuously without snapping the finished log level', () => {
    expect(-1.5 + .2 - 4.2 * Math.sin(pineTilt(-1.5))).toBeCloseTo(.45);
    expect(pineTilt(-.4)).toBeCloseTo(0);
    expect(Math.abs(pineTilt(-.40001))).toBeLessThan(.00001);
  });
  it('continues the native plait and follows its supporting bone when the model moves or talks', () => {
    const model = new Group(), head = new Object3D(); head.name = 'spine_02'; head.position.y = 1.065;
    model.scale.setScalar(3); model.add(head);
    const tip = braidTip(model)!;
    expect(tip.parent).toBe(head);
    expect(tip.getWorldPosition(new Vector3()).distanceTo(new Vector3(-.198, 2.076, .333))).toBeLessThan(1e-8);
    model.position.set(102.2, 2.35, -1.35); head.rotation.z = .12;
    const connected = tip.getWorldPosition(new Vector3());
    const braid = buildBraid(103.7, 0, 4.5); braid.attach(connected); braid.update(1, 1, .1, false);
    const connector = braid.group.children[0]! as import('three').Mesh;
    const position = connector.geometry.getAttribute('position');
    const start = new Vector3().fromBufferAttribute(position, 0);
    expect(start.distanceTo(connected)).toBeLessThan(.13);
  });
});
