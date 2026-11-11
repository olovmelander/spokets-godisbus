import { InstancedMesh } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { epilog } from '../../src/content/chapters/ends';
import { HOME_BATHROOM } from '../../src/content/home-layout';
import { norrsken } from '../../src/content/chapters/norrsken';
import { sv } from '../../src/content/sv';
import { JOINTS, type Pose, type Role } from '../../src/render/rig';
import { createStage } from '../../src/render/stage';
import { talk } from '../../src/render/talk';
import type { SceneDef } from '../../src/sim/scene';
import type { ChapterData } from '../../src/sim/types';
import { stubCanvas } from './canvas-stub';

beforeEach(() => { stubCanvas(); talk.reset(); });
afterEach(() => { vi.unstubAllGlobals(); talk.reset(); });

const DT = 1 / 60;
const ARMS = ['armL', 'armR', 'elbowL', 'elbowR'] as const;

/** Replay the authored chapter, including reading holds; Pause must not change the motion after it. */
function replay(chapter: ChapterData, sceneId: string, at: number, pause: boolean) {
  talk.reset();
  const ground = (x: number) => {
    for (let i = 0; i < chapter.ground.length - 1; i++) {
      const a = chapter.ground[i]!, b = chapter.ground[i + 1]!;
      if (a.x !== b.x && x >= a.x && x <= b.x) return a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x);
    }
    return 0;
  };
  const stage = createStage(chapter, ground), poses = new Map<Role, Pose>(), flags = new Set<string>();
  for (const [role, { rig }] of stage.actors) {
    const draw = rig.pose.bind(rig);
    rig.pose = pose => { poses.set(role, { ...pose }); draw(pose); };
  }
  const picture = () => [...stage.actors].flatMap(([role, { rig, visible }]) => {
    if (!visible()) return [];
    const mesh = rig.group.children[0] as InstancedMesh;
    return [...JOINTS.map(joint => poses.get(role)![joint]), ...rig.group.matrix.elements, ...mesh.instanceMatrix.array];
  });
  const trace: number[][] = [], steps: number[] = [];
  let clock = 0, reached = false, previous = new Map<Role, Pose>();
  for (const scene of chapter.scenes ?? []) {
    if (scene.on) flags.add(scene.on);
    if (scene.needs) flags.add(scene.needs);
    const x = scene.resumeAt?.x ?? scene.from ?? scene.at ?? chapter.spawn.x;
    const elof = { x, y: scene.resumeAt?.y ?? ground(x) }, held = new Set<number>();
    const frame = (seconds: number, dt: number, line?: NonNullable<SceneDef['lines']>[number], age = 0) => {
      clock += dt;
      talk.hear(line ? { who: line.who, text: (sv.lines as Readonly<Record<string, string>>)[line.line] ?? line.line, seconds: age, reading: true } : null, dt);
      stage.update({ id: scene.id, seconds }, flags, elof, clock, dt, false);
      stage.group.updateMatrixWorld(true);
    };
    for (let f = 0; f <= Math.ceil(scene.seconds * 60); f++) {
      const seconds = Math.min(scene.seconds, f / 60);
      for (const cue of scene.cues ?? []) if (cue.at <= seconds) flags.add(cue.flag);
      frame(seconds, DT);
      if (reached) {
        const drawn = picture();
        expect(drawn.every(Number.isFinite)).toBe(true);
        trace.push(drawn);
        for (const [role, pose] of poses) {
          const old = previous.get(role);
          if (old) steps.push(...ARMS.map(joint => Math.abs(pose[joint] - old[joint])));
        }
        previous = new Map([...poses].map(([role, pose]) => [role, { ...pose }]));
        if (seconds >= at + .3) return { trace, largestStep: Math.max(...steps) };
      }
      for (const [index, line] of (scene.lines ?? []).entries()) if (line.at <= seconds && !held.has(index)) {
        held.add(index);
        for (let h = 0; h < 60; h++) frame(seconds, DT, line, h / 60);
        if (scene.id === sceneId && line.at === at) {
          reached = true;
          previous = new Map([...poses].map(([role, pose]) => [role, { ...pose }]));
          if (pause) {
            const before = picture();
            for (let p = 0; p < 4; p++) {
              frame(seconds, 0, line, 59 / 60);
              expect(picture()).toEqual(before);
            }
          }
        }
      }
    }
    flags.add(scene.by?.done ?? `scene:${scene.id}`);
  }
  throw new Error(`No authored reading stop ${chapter.id}/${sceneId}/${at}`);
}

describe('resuming an authored scene after Pause', () => {
  it.each([
    { chapter: norrsken, sceneId: 'aterfunna', at: 3 },
    { chapter: norrsken, sceneId: 'aterfunna', at: 9 },
    { chapter: epilog, sceneId: 'bathroom', at: HOME_BATHROOM.goodnight },
  ])('$chapter.id/$sceneId at $at preserves the same smooth joint path as uninterrupted reading', ({ chapter, sceneId, at }) => {
    const continuous = replay(chapter, sceneId, at, false);
    const resumed = replay(chapter, sceneId, at, true);
    expect(resumed.trace.length).toBe(continuous.trace.length);
    const largestDifference = Math.max(...resumed.trace.map((row, frame) => Math.max(...row.map((value, i) => Math.abs(value - continuous.trace[frame]![i]!)))));
    expect(largestDifference).toBeLessThan(1e-7);
    // The old Pause reset produced a full one-radian elbow step on the first resumed frame.
    expect(resumed.largestStep).toBeLessThan(.2);
  });
});
