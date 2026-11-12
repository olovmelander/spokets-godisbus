import { Box3, PerspectiveCamera, Vector3 } from 'three';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { epilog, prolog } from '../../src/content/chapters/ends';
import { stormkvall } from '../../src/content/aventyr2/chapters/stormkvall';
import { morgonen } from '../../src/content/aventyr2/chapters/morgonen';
import { BATHROOM, createHomeRoutine } from '../../src/render/home-routine';
import { createEpilogueStage } from '../../src/render/epilogue-stage';
import { HOME_BATHROOM, HOME_LAYOUT } from '../../src/content/home-layout';
import { createStage } from '../../src/render/stage';
import { stubCanvas } from './canvas-stub';

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
    // The bathroom takes a genuine opening in the rear wall, not an alcove in front of a lit window.
    for (const chapter of [prolog, epilog, stormkvall, morgonen]) {
      expect(chapter.house!.windows).not.toContain(34);
      expect(chapter.house!.windows).toEqual(expect.arrayContaining(HOME_LAYOUT.windows));
    }
    expect(stormkvall.storm!.glows!.some(glow => glow.at.x === 34)).toBe(false);
  });

  it('walks on the floor through the open door, then brushes at his mouth and ends inside', () => {
    const room = createHomeRoutine(epilog), flags = new Set(['teeth']);
    const where = { x: BATHROOM.x, y: 0 };
    room.update(flags, { id: 'bathroom', seconds: 0 }, 0);
    expect(room.body(where)!.position.distanceTo(new Vector3(BATHROOM.x, 0, 0))).toBe(0);
    const crossing = HOME_BATHROOM.walkEnd - .8;
    room.update(flags, { id: 'bathroom', seconds: crossing }, crossing);
    const halfway = room.body(where)!;
    expect(halfway.walking).toBe(true);
    expect(halfway.position.y).toBeGreaterThanOrEqual(0);
    expect(halfway.position.y).toBeLessThanOrEqual(HOME_BATHROOM.floorY);
    expect(halfway.position.z).toBeLessThan(BATHROOM.doorZ / 2);
    expect(room.group.getObjectByName('bathroom-door')!.rotation.y).toBeLessThan(-1);
    room.update(flags, { id: 'bathroom', seconds: HOME_BATHROOM.brushStart }, HOME_BATHROOM.brushStart);
    expect(room.body(where)!.walking).toBe(false);
    expect(room.body(where)!.position.toArray()).toEqual([BATHROOM.x, HOME_BATHROOM.floorY, BATHROOM.feetZ]);
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
    room.update(new Set(['teeth', 'bedtime']), null, HOME_BATHROOM.seconds);
    expect(room.body(where)!.position.toArray()).toEqual([BATHROOM.x, HOME_BATHROOM.floorY, BATHROOM.feetZ]);
    expect(brush.visible).toBe(false);
  });

  it('keeps his boots and head inside the letterbox and the actual doorway clear throughout the walk on either phone orientation', () => {
    stubCanvas();
    try {
      const room = createHomeRoutine(epilog), stage = createStage(epilog, () => 0), flags = new Set(['teeth']);
      for (const aspect of [390 / 844, 844 / 390, 16 / 9]) {
        const camera = new PerspectiveCamera(30, aspect, .1, 140);
        // The action can be taken a little to either side of its mark. Follow the real body and interpolated
        // authored shot, rather than just checking the final still or a second copy of the walk curve.
        for (const x of [HOME_BATHROOM.x - .9, HOME_BATHROOM.x + .9]) {
          for (const seconds of [.1, 1.1, 1.8, 2.9, 3.9, 4.7, HOME_BATHROOM.walkEnd, HOME_BATHROOM.brushStart, 8, HOME_BATHROOM.goodnight]) {
            const where = { x, y: 0 }, frame = { id: 'bathroom', seconds };
            room.update(flags, frame, seconds);
            const body = room.body(where)!, shot = stage.update(frame, flags, where, seconds, 0, false).shot!;
            const height = Math.max(shot.height, shot.width / aspect);
            camera.position.set(shot.x, shot.y + shot.eye, shot.z + height / 2 / Math.tan(Math.PI / 12));
            camera.lookAt(shot.x, shot.y, shot.z); camera.updateMatrixWorld();
            expect(body.position.y).toBeGreaterThanOrEqual(0);
            expect(body.position.y).toBeLessThanOrEqual(HOME_BATHROOM.floorY);
            if (body.position.z > HOME_BATHROOM.doorZ) expect(body.position.y).toBe(0);
            expect(camera.position.z).toBeGreaterThan(HOME_BATHROOM.doorZ);
            for (const dx of [-.55, .55]) for (const y of [0, 3.25]) {
              const point = body.position.clone().add(new Vector3(dx, y, 0));
              const projected = point.clone().project(camera);
              // The bars cover 7.5vh at either edge: leave a further margin for boots and hair.
              expect(Math.abs(projected.x), `side, aspect ${aspect}, second ${seconds}`).toBeLessThan(.85);
              expect(Math.abs(projected.y), `head/feet, aspect ${aspect}, second ${seconds}`).toBeLessThan(.8);
              if (point.z < HOME_LAYOUT.wall.z) {
                const k = (HOME_LAYOUT.wall.z - camera.position.z) / (point.z - camera.position.z);
                const through = camera.position.clone().lerp(point, k);
                expect(Math.abs(through.x - HOME_BATHROOM.x)).toBeLessThan(HOME_BATHROOM.openingWidth / 2 - .1);
                expect(through.y).toBeGreaterThan(0);
                expect(through.y).toBeLessThan(HOME_BATHROOM.openingHeight - .1);
              }
            }
          }
        }
      }
    } finally { vi.unstubAllGlobals(); }
  });

  it('takes Klonk over the front of the party table and back onto clear floor, without passing through its cloth or chairs', () => {
    stubCanvas();
    try {
      const stage = createStage(epilog, () => 0), flags = new Set(['partied']);
      const table = stage.group.getObjectByName('furniture:table')!;
      const cloth = new Box3().setFromObject(table).expandByVector(new Vector3(.15, 0, .15));
      cloth.max.y = 1.68;
      const solids = [cloth, ...stage.group.children.filter(object => object.name === 'furniture:chair').map(object => new Box3().setFromObject(object))];
      const sequence = epilog.scenes!.find(scene => scene.id === 'klonk-table')!;
      let tableLandings = 0;
      for (let seconds = 0; seconds < sequence.seconds; seconds += 1 / 60) {
        const ghost = stage.update({ id: sequence.id, seconds }, flags, { x: 23.4, y: 0 }, seconds, 1 / 60, false).ghost!;
        const feet = ghost.y + ghost.bounce;
        // A small clearance at the soles allows a landing to touch the surface without counting it as penetration.
        const body = new Box3(new Vector3(ghost.x - .24, feet + .015, ghost.z - .24), new Vector3(ghost.x + .24, feet + .85, ghost.z + .24));
        for (const solid of solids) expect(body.intersectsBox(solid), `furniture at second ${seconds.toFixed(2)}`).toBe(false);
        if (Math.abs(ghost.y - cloth.max.y) < .01 && Math.abs(ghost.z - HOME_LAYOUT.dining.z) < .01) tableLandings++;
      }
      expect(tableLandings).toBeGreaterThan(80);
      const moa = epilog.spots!.find(spot => spot.id === 'party:moa')!.standsAt!;
      expect(moa.z - cloth.max.z).toBeGreaterThan(.6);
    } finally { vi.unstubAllGlobals(); }
  });

  it('composes the morning window detail with whole carvings and the bird, while keeping the latch legible on a phone', () => {
    stubCanvas();
    try {
      const stage = createStage(morgonen, () => 0), flags = new Set(['shelf:old', 'shelf:small', 'latch']);
      const shot = stage.update({ id: 'haken', seconds: 1.85 }, flags, { x: 10, y: 0 }, 1.85, 0, false).shot!;
      for (const aspect of [390 / 844, 844 / 390]) {
        const camera = new PerspectiveCamera(30, aspect, .1, 140);
        const height = Math.max(shot.height, shot.width / aspect);
        camera.position.set(shot.x, shot.y + shot.eye, shot.z + height / 2 / Math.tan(Math.PI / 12));
        camera.lookAt(shot.x, shot.y, shot.z); camera.updateMatrixWorld();
        // Three nearest shelf figures, including their hats, and both ends of the bird's little hopping range.
        for (const [from, to] of [
          [new Vector3(8.3, 5.48, -8.5), new Vector3(10.9, 6.9, -8.5)],
          [new Vector3(8.45, 3.2, -8.38), new Vector3(10.65, 3.95, -8.38)],
        ]) for (const x of [from!.x, to!.x]) for (const y of [from!.y, to!.y]) {
          const point = new Vector3(x, y, from!.z).project(camera);
          expect(Math.abs(point.x)).toBeLessThan(.92);
          expect(Math.abs(point.y)).toBeLessThan(.85);
        }
        const left = new Vector3(8.85, 4.5, -8.67).project(camera), right = new Vector3(9.92, 4.5, -8.67).project(camera);
        expect((right.x - left.x) / 2 * (aspect < 1 ? 390 : 844)).toBeGreaterThan(75);
      }
    } finally { vi.unstubAllGlobals(); }
  });

  it('shows the actual completed carving immediately, with its feet on the private hand socket, until it is on the shelf', () => {
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
    // He carries it on after the carving's scene, to Pappa's shelf, and puts it up there himself before his teeth.
    stage.update(new Set(['dots', 'scene:first-carving', 'shelf']), null, false);
    stage.updateElof({ hand: (_side, out) => out, socket: (_side, _grip, out) => out.copy(palm), hold });
    expect(figure.getWorldPosition(new Vector3()).distanceTo(palm)).toBeCloseTo(.02);
    stage.update(new Set(['dots', 'scene:first-carving', 'shelf', 'shelf:placed']), null, false);
    const shelf = epilog.epilogue!.shelf!;
    const placed = figure.getWorldPosition(new Vector3());
    expect([placed.x, placed.y, placed.z].map((v) => Math.round(v * 1000) / 1000)).toEqual([shelf.x, shelf.y, shelf.z].map((v) => Math.round(v * 1000) / 1000));
    // Where it stands on the evening of the storm: between Pappa's old trägubbe and Klonk.
    expect(shelf.x).toBeCloseTo(epilog.shelf!.x - 2.9);
  });
});
