import { Box3, Group, Mesh, Vector3 } from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import '../../src/content/aventyr2/aventyr2';
import { billsta } from '../../src/content/aventyr2/chapters/billsta';
import { PACK } from '../../src/render/extensions';

beforeAll(() => {
  const context = new Proxy({}, { get: () => () => undefined, set: () => true });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => context }) });
});
afterAll(() => vi.unstubAllGlobals());

describe('Billsta’s loft door', () => {
  it('shows its broad boarded face from the yard and swings on a fixed hinge inside its frame', () => {
    const mover = billsta.movers!.find(mover => mover.look === 'barn-door')!;
    const parent = new Group();
    parent.position.set(mover.stops[0]!.x, mover.stops[0]!.y, 0);
    const door = PACK.movers.get('barn-door')!(mover)!;
    parent.add(door);
    const frame = door.getObjectByName('barn-door-frame') as Mesh;
    const leaf = door.getObjectByName('barn-door-leaf') as Mesh;
    const hinge = door.getObjectByName('barn-door-hinge')!;
    door.userData.tick();
    parent.updateWorldMatrix(true, true);
    const bounds = new Box3().setFromObject(leaf), size = bounds.getSize(new Vector3());
    // An edge-on door was only .3 EL wide in the game. Its actual 2.4 EL broad face must be visible.
    expect(size.x).toBeGreaterThan(2.3);
    expect(size.z).toBeLessThan(.6);
    expect(size.y).toBeGreaterThan(5);
    const fixedFrame = new Box3().setFromObject(frame), fixedHinge = hinge.getWorldPosition(new Vector3());
    for (const fraction of [.3, .7, 1]) {
      parent.position.y = mover.stops[0]!.y + (mover.stops.at(-1)!.y - mover.stops[0]!.y) * fraction;
      door.userData.tick();
    parent.updateWorldMatrix(true, true);
      expect(new Box3().setFromObject(frame).equals(fixedFrame)).toBe(true);
      expect(hinge.getWorldPosition(new Vector3()).distanceTo(fixedHinge)).toBeLessThan(1e-8);
    }
    // The leaf is open into the loft, clear of the yard face; neither the door nor its wall rises into the air.
    expect(new Box3().setFromObject(leaf).getSize(new Vector3()).x).toBeLessThan(.7);
    expect(new Box3().setFromObject(leaf).max.z).toBeLessThan(.25);
    expect(frame.geometry.getAttribute('color').count).toBeGreaterThan(100);
  });
});
