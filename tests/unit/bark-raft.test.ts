import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { BARK, floatingBark, type BarkWorld } from '../../src/content/aventyr2/bark-raft';
import { flarken } from '../../src/content/aventyr2/chapters/flarken';

/**
 * Flärken's bark as it is drawn (src/content/aventyr2/bark-raft.ts; Olov, 14 November 2026: "Kan vi förbättra både
 * designen och texturen på barken som flyter, så att den ser snyggare ut?"). It stood on its edge in the water as it
 * does on the planks, a block. Now it lies flat on the water as bark floats, its plates up where he stands, rides and
 * rocks, gives under him when he lands on it, and still holds him: its top stays where the simulation has it.
 */
const bark = flarken.movers!.find((mover) => mover.id === 'sjon-bark')!;
const before = bark.stops[bark.stops.length - 2]!, last = bark.stops[bark.stops.length - 1]!;
const water = flarken.water!.find((w) => w.from <= last.x && w.to >= last.x)!.y;

/** The bark as the view holds it, with a world of its own: where the planks end, a splash, and where he is. */
function drawn(still = false) {
  const him = { x: 0, y: 0 };
  const world: BarkWorld = {
    behind: -0.6, still: () => still, elof: () => him,
    edge: () => ({ edge: 173.4, water }),
    splash: { group: new Group(), update: () => {} },
  };
  const prop = floatingBark(bark, world);
  const mesh = new Group();
  mesh.add(prop);
  const holder = prop.getObjectByName('bark-holder')!, piece = prop.getObjectByName('bark-piece')!;
  // The kit's piece, as big as it is: standing on its long edge, its outside towards the camera.
  const model = new Mesh(new BoxGeometry(bark.width, BARK.tall, BARK.thick).translate(0, BARK.tall / 2, BARK.thick / 2 - BARK.back), new MeshStandardMaterial());
  piece.add(model);
  const tick = prop.userData.tick as (clock: number) => void;
  return {
    him, holder, piece, model,
    frame(clock: number, place: { x: number; y: number }) {
      mesh.position.set(place.x, place.y, 0);
      tick(clock);
      mesh.updateMatrixWorld(true);
      model.geometry.computeBoundingBox();
      const box = model.geometry.boundingBox!.clone().applyMatrix4(model.matrixWorld);
      return { box, at: holder.getWorldPosition(new Vector3()) };
    },
  };
}

describe("Flärken's bark, on the planks and afloat", () => {
  it('stands on its long edge on the planks, as tall as the thing is to the simulation, at their back', () => {
    expect(BARK.tall).toBeCloseTo(bark.height, 5);
    const look = drawn();
    for (const [i, stop] of bark.stops.slice(0, -1).entries()) {
      const seen = look.frame(i, stop);
      expect(look.piece.rotation.x).toBeCloseTo(0, 9);
      expect(seen.box.min.y).toBeCloseTo(stop.y, 5);
      expect(seen.box.max.y).toBeCloseTo(stop.y + bark.height, 5);
      expect(seen.box.max.x - seen.box.min.x).toBeCloseTo(bark.width, 5);
      // Behind the play plane, where he pushes it from beside it.
      expect((seen.box.min.z + seen.box.max.z) / 2).toBeLessThan(-0.4);
    }
  });

  it('falls flat as it goes in, and floats so: its plates up at his feet, its middle on the play plane, low in the water', () => {
    const look = drawn();
    look.frame(0, before);
    // The last push: over the planks' end and in.
    let turned = 0;
    for (let t = 1 / 60; t < 3; t += 1 / 60) {
      look.frame(10 + t, t < 0.6 ? { x: before.x + (last.x - before.x) * (t / 0.6), y: before.y + (last.y - before.y) * (t / 0.6) } : last);
      // It only ever turns one way, from standing to flat.
      expect(look.piece.rotation.x).toBeLessThanOrEqual(turned + 1e-9);
      turned = look.piece.rotation.x;
    }
    expect(turned).toBeCloseTo(-Math.PI / 2, 5);
    const top = last.y + bark.height;
    // Afloat, a few seconds on: flat, its plates' tops at the simulation's top, give or take its ride on the water.
    for (const clock of [20, 20.4, 21.1, 22.3]) {
      const seen = look.frame(clock, last);
      expect(Math.abs(seen.box.max.y - top), `at ${clock}`).toBeLessThan(0.07);
      // As thick as bark is, not as tall as it stood; some of it under the water and some over.
      expect(seen.box.max.y - seen.box.min.y).toBeCloseTo(BARK.thick, 1);
      expect(seen.box.min.y).toBeLessThan(water - 0.2);
      expect(seen.box.max.y).toBeGreaterThan(water + 0.4);
      // Under him: its middle on the line he walks, wide enough to stand on, from one end of the thing to the other.
      expect(Math.abs((seen.box.min.z + seen.box.max.z) / 2)).toBeLessThan(0.08);
      expect(seen.box.max.z - seen.box.min.z).toBeCloseTo(BARK.tall, 1);
      expect(seen.box.min.x).toBeLessThan(last.x - bark.width / 2 + 0.1);
      expect(seen.box.max.x).toBeGreaterThan(last.x + bark.width / 2 - 0.1);
    }
    // A game taken up with it in place: afloat and flat from the first frame.
    const taken = drawn();
    const first = taken.frame(0, last);
    expect(taken.piece.rotation.x).toBeCloseTo(-Math.PI / 2, 5);
    expect(Math.abs(first.box.max.y - top)).toBeLessThan(0.07);
  });

  it('gives under him when he lands on it and comes up again: it holds him', () => {
    const look = drawn();
    look.frame(0, last);
    for (let t = 0; t < 1; t += 1 / 60) look.frame(t, last);
    const top = last.y + bark.height;
    const rode = look.frame(1, last).at.y;
    // He lands on its right half.
    look.him.x = last.x + 0.5;
    look.him.y = top;
    let lowest = Infinity, tipped = 0;
    const heights: number[] = [];
    for (let t = 1; t < 4; t += 1 / 60) {
      const seen = look.frame(t, last);
      lowest = Math.min(lowest, seen.at.y);
      tipped = Math.min(tipped, look.holder.rotation.z);
      heights.push(seen.box.max.y);
      // Never far from his feet: it holds him.
      expect(Math.abs(seen.at.y - last.y)).toBeLessThan(0.11);
    }
    // It dips under him at once, by a few fingers, tips towards him, and is back up within a couple of seconds.
    expect(lowest).toBeLessThan(rode - 0.02);
    expect(lowest).toBeLessThan(last.y - 0.02);
    expect(tipped).toBeLessThan(-0.01);
    expect(Math.abs(look.frame(4, last).at.y - last.y)).toBeLessThan(0.03);
    // With less motion it lies still where the simulation has it.
    const calm = drawn(true);
    for (const clock of [0, 0.9, 2.2]) {
      const seen = calm.frame(clock, last);
      expect(seen.at.y).toBeCloseTo(last.y, 6);
      expect(calm.holder.rotation.z).toBeCloseTo(0, 9);
    }
  });
});
