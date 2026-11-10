import { InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { prolog } from '../../src/content/chapters/ends';
import { sv } from '../../src/content/sv';
import { createStage } from '../../src/render/stage';
import { talk } from '../../src/render/talk';
import { stubCanvas } from './canvas-stub';

beforeEach(() => { stubCanvas(); talk.reset(); });
afterEach(() => { vi.unstubAllGlobals(); talk.reset(); });

it.each([
  { id: 'morgon', at: 8.9 },
  { id: 'vaknar', at: .2 },
])('keeps Pappa’s arm continuous as an offer starts or ends in $id at $at', ({ id, at }) => {
  const stage = createStage(prolog, () => 0), flags = new Set<string>();
  const rig = stage.actors.get('pappa')!.rig, body = rig.group.children[0] as InstancedMesh;
  const matrix = new Matrix4();
  const picture = () => ({
    hand: rig.hand(1, new Vector3()),
    turns: [8, 9].map(i => {
      body.getMatrixAt(i, matrix);
      return new Quaternion().setFromRotationMatrix(new Matrix4().extractRotation(matrix));
    }),
  });
  let clock = 0, previous: ReturnType<typeof picture> | null = null;
  for (const scene of prolog.scenes!) {
    if (scene.on) flags.add(scene.on);
    if (scene.needs) flags.add(scene.needs);
    const x = scene.resumeAt?.x ?? scene.from ?? scene.at ?? prolog.spawn.x, held = new Set<number>();
    const frame = (t: number, line: NonNullable<typeof scene.lines>[number] | null = null, age = 0) => {
      clock += 1 / 60;
      talk.hear(line ? { who: line.who, text: sv.lines[line.line as keyof typeof sv.lines], seconds: age, reading: true } : null, 1 / 60);
      stage.update({ id: scene.id, seconds: t }, flags, { x, y: scene.resumeAt?.y ?? 0 }, clock, 1 / 60, false);
    };
    for (let f = 0; f <= Math.ceil(scene.seconds * 60); f++) {
      const t = Math.min(scene.seconds, f / 60);
      for (const cue of scene.cues ?? []) if (cue.at <= t) flags.add(cue.flag);
      frame(t);
      if (scene.id === id && Math.abs(t - at) < 1e-8) {
        const now = picture();
        expect(previous).not.toBeNull();
        expect(now.hand.distanceTo(previous!.hand)).toBeLessThan(.05);
        for (const [i, turn] of now.turns.entries()) expect(turn.angleTo(previous!.turns[i]!)).toBeLessThan(.2);
        return;
      }
      for (const [i, line] of (scene.lines ?? []).entries()) if (line.at <= t && !held.has(i)) {
        held.add(i);
        for (let h = 0; h < 60; h++) frame(t, line, h / 60);
      }
      previous = picture();
    }
    flags.add(scene.by?.done ?? `scene:${scene.id}`);
  }
  throw new Error(`Missing offer boundary ${id}:${at}`);
});
