import { InstancedMesh, Matrix4, Mesh, Raycaster, Vector3, type Object3D } from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ADVENTURE2, loadAdventure2 } from '../../src/content/chapters';
import { flightAt } from '../../src/content/aventyr2/kit';
import { PLACES, dress } from '../../src/render/dressing';
import { gateOf, onGatePath, type Gate } from '../../src/render/dressing/hedge-gate';
import { heightAt } from '../../src/render/dressing/kit';
import type { ChapterData } from '../../src/sim/types';

/**
 * Stormgården's hedge has an arch into the forest, as Gården's has (Olov, 14 November 2026: "I slutet av kapitlet vill
 * jag att det ska finnas ett hål i häcken som Elof går igenom när kapitlet avslutas, precis som i kapitlet ”Gården” i
 * äventyr 1"; src/render/dressing/hedge-gate.ts). It was a tall hedge with no way through. For the picture only: the
 * goal, the low hedge he walks on and the wall at the ground's end stay, and the little carving still goes over it.
 */

let stormgard: ChapterData;
let gate: Gate;
let dressing: Object3D;

beforeAll(async () => {
  // The dressing draws on canvases: there are none here, and what they would hold is not needed.
  const fake: object = new Proxy(function () {}, { get: (_, key) => (key === Symbol.toPrimitive ? () => 0 : fake), apply: () => fake, set: () => true });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => fake }) });
  vi.stubGlobal('window', { innerWidth: 1180, innerHeight: 820, devicePixelRatio: 1 });
  await loadAdventure2();
  stormgard = ADVENTURE2.find((chapter) => chapter.id === 'stormgard')!;
  gate = gateOf(stormgard)!;
  dressing = dress(stormgard, PLACES.garden).group;
  dressing.updateMatrixWorld(true);
}, 120000);
afterAll(() => vi.unstubAllGlobals());

/** What a ray from in front meets first among these, and how far in. */
function first(from: Vector3, to: Vector3, among: Object3D[]): { name: string; z: number } | null {
  const ray = new Raycaster(from, to.clone().sub(from).normalize(), 0, from.distanceTo(to));
  const hit = ray.intersectObjects(among, true)[0];
  return hit ? { name: hit.object.name, z: hit.point.z } : null;
}

describe("Stormgården's hedge, with its arch into the storm's forest", () => {
  it('has the arch in the tall hedge behind the low one, beside the goal, its floor the low hedge\'s top', () => {
    expect(gate).not.toBeNull();
    const end = stormgard.ground.at(-1)!.x;
    const lip = heightAt(stormgard, stormgard.goalX);
    // He stops on the low hedge: the arch is level with it, behind it, and as tall as the wall at the ground's end.
    expect(lip).toBeGreaterThan(1);
    expect(gate.lip).toBe(true);
    expect(gate.floor).toBe(lip);
    expect(gate.storm).toBe(true);
    expect(gate.top).toBe(stormgard.ground.at(-1)!.y);
    // Just past where he stops, as far past it as Gården's is, and as wide and as high.
    expect(gate.open.from).toBeLessThan(stormgard.goalX + 0.9);
    expect(gate.open.to).toBeGreaterThan(stormgard.goalX + 1.5);
    expect(gate.open.to).toBeLessThan(end);
    expect(gate.open.to - gate.open.from).toBeCloseTo(2.7, 6);
    expect(gate.open.spring + gate.open.radius - gate.floor).toBeGreaterThan(3);
    // Its hedge stands all along the low one and into the hedge's tall end.
    expect(gate.from).toBeLessThan(stormgard.goalX - 3);
    expect(gate.to).toBeGreaterThan(end);
  });

  it('stands behind the little carving all his way up: he is over its crown before he is as far back as its face', () => {
    const flight = stormgard.storm!.flybys!.find((flyby) => flyby.who === 'lillgubbe')!;
    const half = (flight.size ?? 1) / 2;
    let over = false;
    for (let k = 0; k <= 1.0001; k += 0.01) {
      const at = flightAt(flight, k);
      // While any of him is below the hedge's crown, he is well in front of its leaves.
      if (at.y - half < gate.top + 0.3) expect(at.z - half, `at ${k.toFixed(2)}`).toBeGreaterThan(gate.front + 0.5);
      else over = true;
    }
    expect(over).toBe(true);
    expect(flightAt(flight, 1).y).toBeGreaterThan(gate.top + 2);
  });

  it('is open from the low hedge into the forest, and solid beside the opening and over it', () => {
    const core = dressing.getObjectByName('hedge-core')!;
    const forest = ['hedge-gate-spruces', 'hedge-gate-green'].map((name) => dressing.getObjectByName(name)!);
    // From where the camera stands at the goal, through the middle of the opening at his height on the low hedge.
    const eye = new Vector3(gate.open.middle + 0.6, gate.floor + 2, 12);
    const through = new Vector3(gate.open.middle, gate.floor + 1.2, gate.front);
    const far = eye.clone().add(through.clone().sub(eye).multiplyScalar(2.2));
    expect(first(eye, far, [core])).toBeNull();
    // ...it goes on into the forest's spruces, behind the hedge.
    const tree = first(eye, far, forest);
    expect(tree).not.toBeNull();
    expect(tree!.z).toBeLessThan(gate.back);
    // Beside the opening, and over its round top, the hedge stands at its face.
    for (const at of [new Vector3(gate.open.from - 1.2, gate.floor + 1.2, gate.front), new Vector3(gate.open.to + 1.2, gate.floor + 1.2, gate.front),
      new Vector3(gate.open.middle, gate.open.spring + gate.open.radius + 1, gate.front)]) {
      const hit = first(eye, eye.clone().add(at.clone().sub(eye).multiplyScalar(1.2)), [core]);
      expect(hit, `${at.x} ${at.y}`).not.toBeNull();
      expect(Math.abs(hit!.z - gate.front)).toBeLessThan(0.4);
    }
  });

  it('lays the trodden path on the low hedge\'s top, and the forest\'s floor level with it where the path goes in', () => {
    const floor = dressing.getObjectByName('hedge-gate-floor') as Mesh;
    const position = floor.geometry.getAttribute('position');
    const at = new Vector3();
    let onLip = 0, onPath = 0, aside = 0;
    for (let i = 0; i < position.count; i++) {
      at.fromBufferAttribute(position, i);
      const fromPath = Math.abs(at.x - gate.open.middle);
      if (at.z > gate.back) {
        // Over the low hedge and through the arch: a finger over its clipped top.
        onLip++;
        expect(at.y - gate.floor, `${at.x.toFixed(1)} ${at.z.toFixed(1)}`).toBeGreaterThan(0);
        expect(at.y - gate.floor).toBeLessThan(0.1);
      } else if (fromPath < 1.5 && at.z > gate.back - 12) {
        // Where the path goes on in: a low bank, level with the low hedge's top, rolling a little.
        onPath++;
        expect(Math.abs(at.y - gate.floor), `${at.x.toFixed(1)} ${at.z.toFixed(1)}`).toBeLessThan(0.3);
      } else if (fromPath > 7.5) {
        // To both sides the bank has come down to the lawn, where the forest is seen past the hedge's end.
        aside++;
        expect(at.y, `${at.x.toFixed(1)} ${at.z.toFixed(1)}`).toBeLessThan(0.7);
      }
    }
    expect(onLip).toBeGreaterThan(100);
    expect(onPath).toBeGreaterThan(100);
    expect(aside).toBeGreaterThan(100);
  });

  it('keeps the low hedge\'s crown bare of leaves where the path is trodden over it', () => {
    const leaves = dressing.getObjectByName('hedge-leaves') as InstancedMesh;
    const m = new Matrix4(), p = new Vector3();
    let beside = 0;
    for (let i = 0; i < leaves.count; i++) {
      leaves.getMatrixAt(i, m);
      p.setFromMatrixPosition(m);
      if (Math.abs(p.y - gate.floor) > 0.2 || p.z > -0.8 || p.z < gate.front + 0.3) continue;
      expect(onGatePath(gate, p.x, p.z, 0.1), `${p.x.toFixed(2)} ${p.z.toFixed(2)}`).toBe(false);
      if (Math.abs(p.x - gate.open.middle) < 3) beside++;
    }
    // ...and the crown beside the path has its leaves.
    expect(beside).toBeGreaterThan(40);
  });
});
