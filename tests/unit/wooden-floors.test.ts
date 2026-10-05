import { describe, expect, it } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import { groundOf } from '../../src/render/dressing';
import { bankShapes } from '../../src/render/dressing/ground';
import { heightAt } from '../../src/render/dressing/kit';

/** Every corner of a chapter's wooden ground. */
function* boards(course: string) {
  const chapter = COURSES[course]!;
  for (const { kind, shape } of bankShapes(chapter, groundOf(chapter.place!))) {
    if (kind !== 'wood') continue;
    const at = shape.getAttribute('position');
    for (let i = 0; i < at.count; i++) yield { x: at.getX(i), y: at.getY(i), z: at.getZ(i) };
  }
}
/** Where the floor is level ground, away from a step: half a length to each side it has one height. */
const open = (course: string, x: number) => Math.abs(heightAt(COURSES[course]!, x - 0.5) - heightAt(COURSES[course]!, x + 0.5)) < 0.01;

describe('a wooden floor', () => {
  // Home in the morning and in the evening, the deck, the sweet shop.
  const floors = ['prolog', 'epilog', 'garden', 'byn'];

  it('runs on towards the camera, level, past the lower edge of the widest picture', () => {
    for (const course of floors) {
      let front = -Infinity;
      let seen = 0;
      for (const corner of boards(course)) {
        front = Math.max(front, corner.z);
        // The camera stands at most 16 lengths in front of the path; the widest picture's lower edge meets
        // the floor 11 in front. Up to there it is the floor he stands on, and no face.
        if (corner.z <= 0.45 || corner.z > 11 || !open(course, corner.x)) continue;
        seen += 1;
        expect(corner.y, `${course} at x ${corner.x.toFixed(2)}, z ${corner.z.toFixed(2)}`).toBeCloseTo(heightAt(COURSES[course]!, corner.x), 5);
      }
      expect(front, course).toBeGreaterThanOrEqual(11);
      expect(seen, course).toBeGreaterThan(100);
    }
  });

  it('is a walk of planks over the bog: narrow, with a front edge a step in front of the path', () => {
    let front = -Infinity;
    let under = 0;
    for (const corner of boards('myren')) {
      front = Math.max(front, corner.z);
      if (open('myren', corner.x) && corner.z > 0.5) under = Math.max(under, heightAt(COURSES['myren']!, corner.x) - corner.y);
    }
    expect(front).toBeGreaterThan(0.9);
    expect(front).toBeLessThan(1.3);
    // Under its edge it goes down: a rim, and the peat it lies on.
    expect(under).toBeGreaterThan(4);
  });
});
