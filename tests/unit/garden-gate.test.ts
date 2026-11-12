import { InstancedMesh, Matrix4, Mesh, Raycaster, Vector3, type Object3D } from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ADVENTURE2, COURSES, loadAdventure2 } from '../../src/content/chapters';
import { PLACES, dress } from '../../src/render/dressing';
import { bank } from '../../src/render/dressing/ground';
import { hedgeGround } from '../../src/render/dressing/hedge';
import { gateOf, type Gate } from '../../src/render/dressing/hedge-gate';
import { KIT, landscape } from '../../src/render/dressing/kit';
import type { ChapterData } from '../../src/sim/types';

/**
 * Gården's tall end hedge has an arch where the path goes on into the forest (Olov, 12 November 2026: "Ja!" to "Ska häcken
 * ha en öppning in mot skogen?"; src/render/dressing/hedge-gate.ts). For the picture only: the goal and the wall stay.
 */

let garden: ChapterData;
let stormgard: ChapterData;
let gate: Gate;
let dressing: Object3D;

beforeAll(async () => {
  // The dressing draws on canvases: there are none here, and what they would hold is not needed.
  const fake: object = new Proxy(function () {}, { get: (_, key) => (key === Symbol.toPrimitive ? () => 0 : fake), apply: () => fake, set: () => true });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => fake }) });
  vi.stubGlobal('window', { innerWidth: 1180, innerHeight: 820, devicePixelRatio: 1 });
  await loadAdventure2();
  garden = COURSES.garden!;
  stormgard = ADVENTURE2.find((chapter) => chapter.id === 'stormgard')!;
  gate = gateOf(garden)!;
  dressing = dress(garden, PLACES.garden).group;
  dressing.updateMatrixWorld(true);
}, 120000);
afterAll(() => vi.unstubAllGlobals());

/** What a ray from in front meets first among these, and how far in. */
function first(from: Vector3, to: Vector3, among: Object3D[]): { name: string; z: number } | null {
  const ray = new Raycaster(from, to.clone().sub(from).normalize(), 0, from.distanceTo(to));
  const hit = ray.intersectObjects(among, true)[0];
  return hit ? { name: hit.object.name, z: hit.point.z } : null;
}

describe("Gården's hedge, with its arch into the forest", () => {
  it('has the arch only where a hedge is marked, beside the goal, with the hedge\'s tall end on its right', () => {
    expect(gateOf(stormgard)).toBeNull();
    const end = garden.ground.at(-1)!.x;
    // Just before the end of the ground, and around where he stops at the goal and the big candy stands.
    expect(gate.open.from).toBeLessThan(garden.goalX + 0.9);
    expect(gate.open.to).toBeGreaterThan(garden.goalX + 1.5);
    expect(gate.open.to).toBeLessThan(end);
    expect(gate.to).toBeGreaterThan(end);
    // Behind the path, as tall as the end wall, the opening a good deal taller than he is.
    expect(gate.front).toBeLessThan(-3.6);
    expect(gate.top).toBe(garden.ground.at(-1)!.y);
    expect(gate.open.spring + gate.open.radius - gate.base).toBeGreaterThan(3);
  });

  it('is open from the path into the forest, and solid beside the opening', () => {
    const core = dressing.getObjectByName('hedge-core')!;
    const forest = ['hedge-gate-spruces', 'hedge-gate-green'].map((name) => dressing.getObjectByName(name)!);
    // From where the camera stands at the goal, through the middle of the opening at his height.
    const eye = new Vector3(gate.open.middle + 0.6, 2, 12);
    const through = new Vector3(gate.open.middle, 1.2, gate.front);
    const far = eye.clone().add(through.clone().sub(eye).multiplyScalar(3));
    expect(first(eye, far, [core])).toBeNull();
    // ...it goes on into the forest's spruces, behind the hedge.
    const tree = first(eye, far, forest);
    expect(tree).not.toBeNull();
    expect(tree!.z).toBeLessThan(gate.back);
    // Beside the opening, and over its round top, the hedge stands at its face.
    for (const at of [new Vector3(gate.open.from - 1.2, 1.2, gate.front), new Vector3(gate.open.middle, gate.open.spring + gate.open.radius + 1, gate.front)]) {
      const hit = first(eye, eye.clone().add(at.clone().sub(eye).multiplyScalar(1.2)), [core]);
      expect(hit, `${at.x} ${at.y}`).not.toBeNull();
      expect(Math.abs(hit!.z - gate.front)).toBeLessThan(0.4);
    }
  });

  it('lays the forest\'s floor and the trodden path on the lawn, never under it nor floating', () => {
    const floor = dressing.getObjectByName('hedge-gate-floor') as Mesh;
    // The lawn as the dressing draws it (src/render/dressing/index.ts): its hedge's bank lowered, drawn as lawn.
    const land = hedgeGround(landscape(garden));
    const lawn = bank({ ...land, surfaces: land.surfaces?.filter((surface) => surface.kind !== 'hedge') }, 'lawn');
    lawn.updateMatrixWorld(true);
    const position = floor.geometry.getAttribute('position');
    let checked = 0;
    for (let i = 0; i < position.count; i += 37) {
      const at = new Vector3().fromBufferAttribute(position, i);
      const land = new Raycaster(at.clone().setY(at.y + 3), new Vector3(0, -1, 0), 0, 6).intersectObject(lawn, true)[0];
      if (!land) continue;
      checked++;
      expect(at.y - land.point.y, `${at.x.toFixed(1)} ${at.z.toFixed(1)}`).toBeGreaterThan(0);
      expect(at.y - land.point.y, `${at.x.toFixed(1)} ${at.z.toFixed(1)}`).toBeLessThan(0.15);
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('treads the lawn\'s grass short on the path into the arch', () => {
    const m = new Matrix4(), p = new Vector3(), s = new Vector3();
    let onPath = 0;
    dressing.traverse((object) => {
      const grass = object as InstancedMesh;
      if (!grass.isInstancedMesh || grass.material !== KIT.lawn) return;
      for (let i = 0; i < grass.count; i++) {
        grass.getMatrixAt(i, m);
        p.setFromMatrixPosition(m);
        s.setFromMatrixScale(m);
        if (p.z > gate.front + 0.3 && p.z < -0.6 && Math.abs(p.x - gate.open.middle) < 0.5) {
          onPath++;
          expect(s.y, `${p.x.toFixed(2)} ${p.z.toFixed(2)}`).toBeLessThan(0.15);
        }
      }
    });
    expect(onPath).toBeGreaterThan(0);
  });
});
