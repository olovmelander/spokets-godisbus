import { InstancedMesh, Matrix4, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { garden } from '../../src/content/chapters/garden';
import { stepLength } from '../../src/render/acting';
import { heightOf } from '../../src/render/rig';
import { createStage, type Stage } from '../../src/render/stage';
import type { ActorKey, SceneDef } from '../../src/sim/scene';

/**
 * The family move as people do (the motion pass of 6 November 2026): a planted boot stays where it was put down,
 * nobody whips round, a follower keeps up with a running Elof without jumping, and a scene that does not stage
 * them leaves them where they are.
 */
beforeEach(() => {
  const context = Object.fromEntries(['fillRect', 'beginPath', 'lineTo', 'moveTo', 'closePath', 'fill', 'stroke', 'arc', 'ellipse'].map(name => [name, () => {}]));
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => context }) });
});
afterEach(() => vi.unstubAllGlobals());

const SHOE = { left: 13, right: 16 } as const;
const stageFor = (keys: readonly ActorKey[], more: SceneDef[] = []) =>
  createStage({ ...garden, furniture: [], scenes: [{ id: 'motion', seconds: 12, stage: { actors: { mamma: keys } } }, ...more] }, () => 0);
const body = (stage: Stage) => stage.actors.get('mamma')!.rig;
function shoes(stage: Stage): [Vector3, Vector3] {
  const rig = body(stage), mesh = rig.group.children[0] as InstancedMesh, m = new Matrix4();
  stage.group.updateMatrixWorld(true);
  return [SHOE.left, SHOE.right].map((i) => { mesh.getMatrixAt(i, m); return new Vector3().setFromMatrixPosition(m.premultiply(mesh.matrixWorld)); }) as [Vector3, Vector3];
}

describe('the family walk', () => {
  it.each([[6, 4], [6, 2], [10, 2]])('keeps the planted boot where it was put down: %s across in %s seconds', (way, seconds) => {
    const stage = stageFor([{ at: 0, x: 0, y: 0, face: 0, move: .01, act: 'stand' }, { at: 1, x: way, move: seconds }]);
    let last: [Vector3, Vector3] | null = null, lastX = 0, slipped = 0, travelled = 0;
    for (let f = 0; f <= (1 + seconds + .5) * 60; f++) {
      stage.update({ id: 'motion', seconds: f / 60 }, new Set(), { x: 0, y: 0 }, f / 60, 1 / 60, false);
      const now = shoes(stage), x = body(stage).group.position.x;
      if (last) {
        // The lower boot is the one on the ground; it should not move while the body does.
        const down = now[0].y <= now[1].y ? 0 : 1;
        if (Math.abs(now[down].y - Math.min(now[0].y, now[1].y)) < 1e-6 && Math.abs(last[down].y - now[down].y) < .01) {
          slipped += Math.abs(now[down].x - last[down].x);
          travelled += Math.abs(x - lastX);
        }
      }
      last = now; lastX = x;
    }
    expect(travelled).toBeGreaterThan(way * .2);
    // Before this pass the planted boot slid about as far as the body went (a ratio near 1); a little remains from
    // the stance knee's give and the boot's tilt.
    expect(slipped / travelled).toBeLessThan(.15);
  });

  it('ends a walk with the feet together, and its steps get longer as it goes faster', () => {
    const stage = stageFor([{ at: 0, x: 0, y: 0, face: 0, move: .01, act: 'stand' }, { at: 1, x: 6.5, move: 3 }]);
    for (let f = 0; f <= 4.5 * 60; f++) stage.update({ id: 'motion', seconds: f / 60 }, new Set(), { x: 0, y: 0 }, f / 60, 1 / 60, false);
    const [left, right] = shoes(stage);
    expect(Math.abs(left.x - right.x)).toBeLessThan(.15);
    const tall = heightOf('mamma');
    expect(stepLength(1.2, tall)).toBeGreaterThan(stepLength(.5, tall) * 1.2);
  });

  it('turns about at a person\'s pace, never in a frame', () => {
    // Walking back the way she faces: a half turn first.
    const stage = stageFor([{ at: 0, x: 4, y: 0, face: 0, move: .01, act: 'stand' }, { at: 1, x: 0, move: 2 }]);
    let last: number | null = null, fastest = 0;
    for (let f = 0; f <= 3.5 * 60; f++) {
      stage.update({ id: 'motion', seconds: f / 60 }, new Set(), { x: 0, y: 0 }, f / 60, 1 / 60, false);
      const yaw = body(stage).group.rotation.y;
      if (last !== null) fastest = Math.max(fastest, Math.abs(Math.atan2(Math.sin(yaw - last), Math.cos(yaw - last))) * 60);
      last = yaw;
    }
    expect(fastest).toBeGreaterThan(1);
    expect(fastest).toBeLessThan(7.5);
  });

  it.each(['kneel', 'crouch'] as const)('gets up off the knees into a walk, and down again, over a moment: %s', act => {
    // As Pappa does in the prologue's familj: kneeling, he walks to the next place and kneels there.
    const stage = stageFor([{ at: 0, x: 0, y: 0, face: 0, move: .01, act }, { at: 1, x: 3, move: 1 }, { at: 2, act }]);
    let last: number | null = null, fastest = 0, highest = 0;
    for (let f = 0; f <= 3 * 60; f++) {
      stage.update({ id: 'motion', seconds: f / 60 }, new Set(), { x: 0, y: 0 }, f / 60, 1 / 60, false);
      const y = body(stage).mouth(new Vector3()).y;
      if (last !== null) fastest = Math.max(fastest, Math.abs(y - last) * 60);
      highest = Math.max(highest, y);
      last = y;
    }
    // Up into the stride and down again at about a body height a second; the legs used to take over in a few
    // frames, five heights a second.
    expect(highest - last!).toBeGreaterThan(.3);
    expect(fastest / heightOf('mamma')).toBeLessThan(1.25);
  });
});

describe('a follower', () => {
  const follower = (more: SceneDef[] = []) => stageFor([{ at: 0, x: 0, y: 0, face: .25, move: .01, act: 'stand', follow: 3 }], more);

  it('keeps up with Elof running, without a jump', () => {
    const stage = follower();
    stage.update({ id: 'motion', seconds: 1 }, new Set(), { x: 0, y: 0 }, 1, 1 / 60, false);
    const flags = new Set(['scene:motion']);
    let last = body(stage).group.position.x, biggest = 0;
    for (let f = 1; f <= 12 * 60; f++) {
      // He runs as fast as he can (RUN_SPEED), for twelve seconds.
      stage.update(null, flags, { x: f / 60 * 3.5, y: 0 }, 1 + f / 60, 1 / 60, false);
      const x = body(stage).group.position.x;
      biggest = Math.max(biggest, Math.abs(x - last));
      last = x;
    }
    expect(biggest).toBeLessThan(.15);
    expect(12 * 3.5 - 3 - last).toBeLessThan(8);
  });

  it('stays where they are through a scene that does not stage them, and follows on after it', () => {
    const stage = follower([{ id: 'elsewhere', seconds: 3, stage: {} }]);
    stage.update({ id: 'motion', seconds: 1 }, new Set(), { x: 0, y: 0 }, 1, 1 / 60, false);
    const flags = new Set(['scene:motion']);
    for (let f = 1; f <= 4 * 60; f++) stage.update(null, flags, { x: f / 60 * 2, y: 0 }, 1 + f / 60, 1 / 60, false);
    const before = body(stage).group.position.x;
    for (let f = 0; f <= 60; f++) stage.update({ id: 'elsewhere', seconds: f / 60 }, flags, { x: 8, y: 0 }, 5 + f / 60, 1 / 60, false);
    // Slowing to a stop, not put back where the first scene left them.
    expect(Math.abs(body(stage).group.position.x - before)).toBeLessThan(1.2);
    expect(body(stage).group.position.x).toBeGreaterThan(2);
  });
});
