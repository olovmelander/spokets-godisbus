import { Box3, InstancedMesh, Matrix4, Vector3 } from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { prolog } from '../../src/content/chapters/ends';
import { sv } from '../../src/content/sv';
import { createStage } from '../../src/render/stage';
import { talk } from '../../src/render/talk';
import { stubCanvas } from './canvas-stub';

beforeEach(() => { stubCanvas(); talk.reset(); });
afterEach(() => { vi.unstubAllGlobals(); talk.reset(); });

it('holds Moa’s picture in front of her body while her head follows the conversation', () => {
  const stage = createStage(prolog, () => -.8), flags = new Set<string>();
  const rig = stage.actors.get('moa')!.rig;
  const body = rig.group.children[0] as InstancedMesh;
  const sheet = stage.group.getObjectByName('stage-thing:drawing')!;
  const shoulder = new Vector3(), elbow = new Vector3(), wrist = new Vector3(), point = new Vector3();
  const chest = new Matrix4(), inverse = new Matrix4();
  const torso = new Box3(new Vector3(-.5, -.5, -.5), new Vector3(.5, .5, .5));
  let clock = 0, samples = 0;
  for (const scene of prolog.scenes!) {
    if (scene.on) flags.add(scene.on);
    if (scene.needs) flags.add(scene.needs);
    const x = scene.resumeAt?.x ?? scene.from ?? scene.at ?? prolog.spawn.x;
    const held = new Set<number>();
    const frame = (t: number, line: NonNullable<typeof scene.lines>[number] | null = null, age = 0) => {
      clock += 1 / 60;
      talk.hear(line ? { who: line.who, text: sv.lines[line.line as keyof typeof sv.lines], seconds: age, reading: true } : null, 1 / 60);
      stage.update({ id: scene.id, seconds: t }, flags, { x, y: scene.resumeAt?.y ?? -.8 }, clock, 1 / 60, false);
      if (scene.id !== 'handen' || t < 2.8 || t >= 8) return;
      stage.group.updateMatrixWorld(true);
      body.getMatrixAt(0, chest); inverse.copy(body.matrixWorld).multiply(chest).invert();
      expect(new Vector3(0, 0, 1).applyQuaternion(sheet.quaternion).z).toBeGreaterThan(.99);
      for (const side of [0, 1] as const) {
        rig.arm!(side, shoulder, elbow, wrist);
        for (const u of [.2, .4, .6, .8]) {
          point.copy(elbow).lerp(wrist, u).applyMatrix4(inverse);
          expect(torso.containsPoint(point), `forearm ${side}, ${t}, ${u}`).toBe(false);
        }
        const target = stage.group.getObjectByName(side === 0 ? 'drawing-left-grip' : 'drawing-right-grip')!.position;
        const palm = rig.grip(side, point, new Vector3(0, 1, 0), new Vector3(), 0);
        expect(palm.distanceTo(target)).toBeLessThan(1e-5);
      }
      samples++;
    };
    for (let f = 0; f <= Math.ceil(scene.seconds * 60); f++) {
      const t = Math.min(scene.seconds, f / 60);
      for (const cue of scene.cues ?? []) if (cue.at <= t) flags.add(cue.flag);
      frame(t);
      for (const [i, line] of (scene.lines ?? []).entries()) if (line.at <= t && !held.has(i)) {
        held.add(i);
        for (let h = 0; h < 60; h++) frame(t, line, h / 60);
      }
    }
    flags.add(scene.by?.done ?? `scene:${scene.id}`);
    if (scene.id === 'handen') break;
  }
  expect(samples).toBeGreaterThan(400);
});
