import { InstancedMesh, Matrix4, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prolog } from '../../src/content/chapters/ends';
import { stormkvall } from '../../src/content/aventyr2/chapters/stormkvall';
import { stormoga } from '../../src/content/aventyr2/chapters/stormoga';
import { sv } from '../../src/content/sv';
import { A2 } from '../../src/content/aventyr2/sv';
import { createStage } from '../../src/render/stage';
import { talk } from '../../src/render/talk';
import { stubCanvas } from './canvas-stub';

beforeEach(() => { stubCanvas(); talk.reset(); });
afterEach(() => { talk.reset(); vi.unstubAllGlobals(); });

const DT = 1 / 60;
const LINES: Readonly<Record<string, string>> = { ...sv.lines, ...A2.lines };
const cases = [
  { chapter: prolog, scene: 'vaknar', role: 'pappa' as const },
  { chapter: prolog, scene: 'poff', role: 'moa' as const },
  { chapter: stormkvall, scene: 'upptackt', role: 'moa' as const },
  { chapter: stormoga, scene: 'hem', role: 'pappa' as const },
];

describe('authored head turns stay in front of the chest', () => {
  it.each(cases)('$chapter.id / $scene / $role, including reading and Pause', ({ chapter, scene: targetScene, role }) => {
    const ground = (x: number) => {
      for (let i = 0; i < chapter.ground.length - 1; i++) {
        const a = chapter.ground[i]!, b = chapter.ground[i + 1]!;
        if (a.x !== b.x && x >= a.x && x <= b.x) return a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x);
      }
      return 0;
    };
    const stage = createStage(chapter, ground), flags = new Set<string>();
    const mesh = stage.actors.get(role)!.rig.group.children[0] as InstancedMesh;
    const chest = new Matrix4(), head = new Matrix4();
    const forward = () => {
      // These are the actual rendered rehearsal chest/head instances, not requested Pose values.
      mesh.getMatrixAt(0, chest); mesh.getMatrixAt(1, head);
      return new Vector3(0, 0, 1).transformDirection(head).transformDirection(new Matrix4().extractRotation(chest).invert());
    };
    let clock = 0, maximum = 0, largestStep = 0, previous: Vector3 | null = null, samples = 0;
    for (const scene of chapter.scenes!) {
      if (scene.on) flags.add(scene.on);
      if (scene.needs) flags.add(scene.needs);
      const x = scene.resumeAt?.x ?? scene.from ?? scene.at ?? chapter.spawn.x;
      const held = new Set<number>(); previous = null;
      const frame = (t: number, dt: number, line: NonNullable<typeof scene.lines>[number] | null = null, age = 0) => {
        clock += dt;
        talk.hear(line ? { who: line.who, text: LINES[line.line]!, seconds: age, reading: true } : null, dt);
        // HOME is a ground-following ride. Use its real eased x route rather than leaving Elof at the chapter spawn.
        const home = chapter.id === 'stormoga' && scene.id === 'hem' ? chapter.rides!.find(r => r.id === 'home')! : null;
        const u = home ? Math.min(1, t / home.time) : 0, k = u * u * (3 - 2 * u);
        const at = home ? home.from.x + (home.to.x - home.from.x) * k : x;
        stage.update({ id: scene.id, seconds: t }, flags, { x: at, y: scene.resumeAt?.y ?? ground(at) }, clock, dt, false);
        if (scene.id !== targetScene) return;
        const direction = forward();
        maximum = Math.max(maximum, direction.angleTo(new Vector3(0, 0, 1)));
        if (previous && dt > 0) largestStep = Math.max(largestStep, direction.angleTo(previous));
        previous = direction; samples++;
      };
      for (let i = 0; i <= Math.ceil(scene.seconds * 60); i++) {
        const t = Math.min(scene.seconds, i / 60);
        for (const cue of scene.cues ?? []) if (cue.at <= t) flags.add(cue.flag);
        frame(t, DT);
        for (const [index, line] of (scene.lines ?? []).entries()) if (line.at <= t && !held.has(index)) {
          held.add(index);
          for (let h = 0; h < 60; h++) frame(t, DT, line, h / 60);
          if (scene.id === targetScene) {
            frame(t, 0, line, 59 / 60); const paused = Array.from(mesh.instanceMatrix.array);
            for (let p = 0; p < 8; p++) frame(t, 0, line, 59 / 60);
            expect(Array.from(mesh.instanceMatrix.array)).toEqual(paused);
          }
        }
      }
      flags.add(scene.by?.done ?? `scene:${scene.id}`);
      if (scene.id === targetScene) break;
    }
    expect(samples).toBeGreaterThan(60);
    expect(maximum * 180 / Math.PI, 'actual head/chest angle, including pitch').toBeLessThan(85);
    expect(largestStep, 'head turns remain continuous between ordinary frames').toBeLessThan(.22);
  });
});
