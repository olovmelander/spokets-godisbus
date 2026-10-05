import { Group, Matrix4, Vector3, type InstancedMesh, type Material, type Mesh, type Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { STORY } from '../../src/content/chapters';
import { epilog } from '../../src/content/chapters/ends';
import { garden } from '../../src/content/chapters/garden';
import { granskog } from '../../src/content/chapters/granskog';
import { createTrail } from '../../src/render/candy';
import { createEpilogueStage } from '../../src/render/epilogue-stage';
import { DEMO_SECONDS } from '../../src/render/helper-demo';
import { drawnWhile } from '../../src/render/idle';
import { buildLedges } from '../../src/render/ledges';
import { helperProp, spotProp } from '../../src/render/props';
import { createSharedSweets } from '../../src/render/shared-sweets';
import { songGlitter } from '../../src/render/song-glitter';
import type { HelpState } from '../../src/sim/types';

/**
 * three.js makes a draw call for a mesh of no size whose middle is in the picture, and for one that is wholly
 * unseen. So what has nothing to draw is taken out of the picture (src/render/idle.ts). These are the meshes
 * that would be drawn for nothing: in the picture, and with no size, no opacity or no instance of any size.
 */
function drawnForNothing(root: Object3D): string[] {
  root.updateMatrixWorld(true);
  const size = new Vector3();
  const matrix = new Matrix4();
  const none = (from: Matrix4) => Math.max(...size.setFromMatrixScale(from).toArray()) === 0;
  const found: string[] = [];
  root.traverseVisible((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const material = mesh.material as Material;
    const many = mesh as InstancedMesh;
    let nothing = none(mesh.matrixWorld) || (material.transparent && material.opacity === 0);
    if (!nothing && many.isInstancedMesh) {
      nothing = true;
      for (let i = 0; i < many.count && nothing; i++) {
        many.getMatrixAt(i, matrix);
        nothing = none(matrix);
      }
    }
    if (nothing) found.push(mesh.name || mesh.parent?.name || mesh.type);
  });
  return found;
}

/** Out of the picture, and marked as waiting there: the view's warm-up draws what is marked, and only that. */
const idle = (object: Object3D): boolean => !object.visible && object.userData.idle === true;
/** In the picture, and not marked. */
const there = (object: Object3D): boolean => object.visible && object.userData.idle !== true;

describe('nothing is drawn for what is not there', () => {
  it('a thing is hidden and marked as idle together, and shown and unmarked together', () => {
    const thing = new Group();
    expect(there(thing)).toBe(true);
    drawnWhile(thing, false);
    expect(idle(thing)).toBe(true);
    drawnWhile(thing, true);
    expect(there(thing)).toBe(true);
  });

  it('a thing that has been used and has shrunk away is out of the picture, and so is what it has not given yet', () => {
    for (const chapter of STORY) {
      for (const spot of chapter.spots ?? []) {
        const prop = spotProp(spot);
        if (!prop) continue;
        prop.update(false, 1, 1 / 60);
        expect(there(prop.group), `${chapter.id}: the ${spot.id}, waiting`).toBe(true);
        expect(drawnForNothing(prop.group), `${chapter.id}: the ${spot.id}, waiting`).toEqual([]);
        for (let i = 0; i < 240; i++) prop.update(true, 1 + i / 60, 1 / 60);
        expect(prop.group.scale.x > 0 ? there(prop.group) : idle(prop.group), `${chapter.id}: the ${spot.id}, used`).toBe(true);
        expect(drawnForNothing(prop.group), `${chapter.id}: the ${spot.id}, used`).toEqual([]);
      }
    }
  });

  it('the helper, its dotted figures and its lace are in the picture only while they are shown', () => {
    const away: HelpState = { step: 0, at: null, verb: null, word: null };
    const hook = garden.hooks![1]!;
    for (const chapter of [garden, granskog]) {
      const helper = helperProp(chapter);
      const shown = () => helper.group.children.filter((part) => part.visible).map((part) => part.name);
      expect(shown(), chapter.id).toEqual([]);
      expect(helper.group.children.every(idle), chapter.id).toBe(true);
      helper.update(away, 4, 0, 0, 1, 1 / 60, false);
      expect(helper.group.children.every(idle), chapter.id).toBe(true);
      // It comes: in the picture from the first frame it has a size.
      helper.update({ ...away, step: 1, at: { x: 6, y: 1 } }, 4, 0, 0, 1, 1 / 60, false);
      expect(shown(), chapter.id).toEqual(['helper-actor']);
      expect(there(helper.actor), chapter.id).toBe(true);
      expect(helper.actor.scale.x).toBeGreaterThan(0);
      expect(drawnForNothing(helper.group), chapter.id).toEqual([]);
    }
    // The third hint: one dotted figure swings from the hook, and its lace is there while it holds on.
    const helper = helperProp(garden);
    const shown = () => helper.group.children.filter((part) => part.visible).map((part) => part.name).sort();
    const third: HelpState = { step: 3, at: hook, verb: 'lace', word: null };
    const seen = new Set<string>();
    for (let t = 0; t < DEMO_SECONDS; t += 1 / 30) {
      helper.update(third, hook.x - 2, 0, 0, t, 1 / 30, false);
      for (const name of shown()) seen.add(name);
      expect(drawnForNothing(helper.group)).toEqual([]);
      expect(helper.group.children.every((part) => there(part) || idle(part))).toBe(true);
    }
    expect([...seen].sort()).toEqual(['helper-actor', 'helper-demo-0', 'helper-demo-lace']);
    // Mindre rörelse: three still poses in place of the one that moves.
    helper.update(third, hook.x - 2, 0, 0, 1, 1 / 30, true);
    expect(shown()).toEqual(['helper-actor', 'helper-demo-0', 'helper-demo-1', 'helper-demo-2', 'helper-demo-lace']);
    expect(drawnForNothing(helper.group)).toEqual([]);
    for (let i = 0; i < 60; i++) helper.update(away, hook.x - 2, 0, 0, 3 + i / 60, 1 / 60, false);
    expect(helper.group.children.every(idle)).toBe(true);
  });

  it('the trail is drawn while one of its sweets has a size', () => {
    const trail = createTrail([{ x: 1, y: 1 }, { x: 2, y: 1, after: 'drop' }]);
    const mesh = trail.group.children[0]!;
    trail.update([false, false], new Set(), 0, 0, 1 / 60, 0);
    expect(there(mesh)).toBe(true);
    // The one is in his bag, and the other waits for the ghost to drop it.
    for (let i = 0; i < 30; i++) trail.update([true, false], new Set(), 0, 0, 1 / 60, i / 60);
    expect(idle(mesh)).toBe(true);
    trail.update([true, false], new Set(['drop']), 0, 0, 1 / 60, 1);
    expect(there(mesh)).toBe(true);
    expect(drawnForNothing(trail.group)).toEqual([]);
    // A chapter with no side candy has nothing to draw for it.
    const none = createTrail([], 'side');
    none.update([], new Set(), 0, 0, 1 / 60, 0);
    expect(none.group.children.every(idle)).toBe(true);
  });

  it('ledges that wait for a flag are drawn from the frame they begin to grow', () => {
    const built = buildLedges([{ x: 0, y: 1, width: 2, look: 'leaf', needs: 'grown' }, { x: 3, y: 1, width: 2, look: 'leaf', needs: 'grown' }]);
    const mesh = built.group.children[0]!;
    expect(idle(mesh)).toBe(true);
    built.update(new Set(), 1 / 60);
    expect(idle(mesh)).toBe(true);
    built.update(new Set(['grown']), 1 / 60);
    expect(there(mesh)).toBe(true);
    expect(drawnForNothing(built.group)).toEqual([]);
  });

  it('the song’s glitter, the shared sweets’ balls and the blink’s glint wait out of the picture', () => {
    const song = songGlitter(garden);
    song.update(new Set(), 1);
    expect(idle(song.group.children[0]!)).toBe(true);
    song.update(new Set(['dewsong']), 2);
    expect(there(song.group.children[0]!)).toBe(true);
    expect(drawnForNothing(song.group)).toEqual([]);

    const shared = createSharedSweets();
    shared.update(new Set(), null);
    expect(idle(shared.mesh)).toBe(true);
    shared.update(new Set(['share:jay']), null);
    expect(there(shared.mesh)).toBe(true);
    expect(drawnForNothing(shared.group)).toEqual([]);

    const stage = createEpilogueStage(epilog.epilogue);
    const drawn = () => { let n = 0; stage.group.traverseVisible((object) => { if ((object as Mesh).isMesh) n++; }); return n; };
    stage.update(new Set(['dots']), null, false);
    const before = drawn();
    expect(drawnForNothing(stage.group)).toEqual([]);
    stage.update(new Set(['dots']), 1.5, false);
    expect(drawn()).toBe(before + 1);
    expect(drawnForNothing(stage.group)).toEqual([]);
  });
});
