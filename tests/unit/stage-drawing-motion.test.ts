import { InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { morgonen } from '../../src/content/aventyr2/chapters/morgonen';
import { A2 } from '../../src/content/aventyr2/sv';
import { createStage } from '../../src/render/stage';
import { talk } from '../../src/render/talk';
import { stubCanvas } from './canvas-stub';

beforeEach(() => { stubCanvas(); talk.reset(); });
afterEach(() => { vi.unstubAllGlobals(); talk.reset(); });

it.each([
  { id: 'frukost', at: 7 },
  { id: 'frukost', at: 9.6 },
  { id: 'namnet', at: 3.4 },
])('returns Moa’s hands smoothly to her drawing in $id at $at', ({ id, at }) => {
  const stage = createStage(morgonen, () => 0), flags = new Set<string>();
  const rig = stage.actors.get('moa')!.rig, body = rig.group.children[0] as InstancedMesh;
  const matrix = new Matrix4();
  let clock = 0, previous: { hands: Vector3[]; turns: Quaternion[] } | null = null;
  let largestStep = 0, largestTurn = 0, samples = 0;
  for (const scene of morgonen.scenes!) {
    if (scene.on) flags.add(scene.on);
    if (scene.needs) flags.add(scene.needs);
    const x = scene.resumeAt?.x ?? scene.from ?? scene.at ?? morgonen.spawn.x, held = new Set<number>();
    const frame = (t: number, line: NonNullable<typeof scene.lines>[number] | null = null, age = 0) => {
      clock += 1 / 60;
      talk.hear(line ? { who: line.who, text: A2.lines[line.line as keyof typeof A2.lines], seconds: age, reading: true } : null, 1 / 60);
      stage.update({ id: scene.id, seconds: t }, flags, { x, y: scene.resumeAt?.y ?? 0 }, clock, 1 / 60, false);
      if (scene.id !== id || t < at - .05 || t > at + .6) return;
      const hands = ([0, 1] as const).map(side => rig.hand(side, new Vector3()));
      const turns = [5, 6, 8, 9].map(i => {
        body.getMatrixAt(i, matrix);
        return new Quaternion().setFromRotationMatrix(new Matrix4().extractRotation(matrix));
      });
      if (previous) {
        for (let i = 0; i < hands.length; i++) largestStep = Math.max(largestStep, hands[i]!.distanceTo(previous.hands[i]!));
        for (let i = 0; i < turns.length; i++) largestTurn = Math.max(largestTurn, turns[i]!.angleTo(previous.turns[i]!));
      }
      previous = { hands, turns }; samples++;
    };
    for (let f = 0; f <= Math.ceil(scene.seconds * 60); f++) {
      const t = Math.min(scene.seconds, f / 60);
      for (const cue of scene.cues ?? []) if (cue.at <= t) flags.add(cue.flag);
      frame(t);
      for (const [i, line] of (scene.lines ?? []).entries()) if (line.at <= t && !held.has(i)) {
        held.add(i);
        for (let h = 0; h < 60; h++) frame(t, line, h / 60);
      }
      if (scene.id === id && t >= at + .6) break;
    }
    flags.add(scene.by?.done ?? `scene:${scene.id}`);
    if (scene.id === id) break;
  }
  expect(samples).toBeGreaterThan(35);
  expect(largestStep, 'resolved hand displacement per 60Hz frame').toBeLessThan(.1);
  expect(largestTurn, 'resolved arm turn per 60Hz frame').toBeLessThan(.25);
});

it('keeps the pen on the paper when a drawing pose is repeated or restored', () => {
  const breakfast = morgonen.scenes!.find(scene => scene.id === 'frukost')!;
  const first = breakfast.stage!.actors!.moa![0]!;
  const chapter = { ...morgonen, scenes: [{ ...breakfast, lines: [], stage: { ...breakfast.stage,
    actors: { ...breakfast.stage!.actors, moa: [first, { at: 1, act: 'draw' as const }] } } }] };
  const stage = createStage(chapter, () => 0), rig = stage.actors.get('moa')!.rig;
  const flags = new Set([breakfast.on!]);
  for (const t of [0, .2, .99, 1, 1.01, 1.2, 3]) {
    stage.update({ id: breakfast.id, seconds: t }, flags, morgonen.spawn, t, 1 / 60, false);
    stage.group.updateMatrixWorld(true);
    const support = stage.group.getObjectByName('drawing-paper-support')!.position;
    expect(rig.grip(0, new Vector3(), new Vector3(0, 1, 0), new Vector3(), 0).distanceTo(support)).toBeLessThan(1e-5);
    const tip = stage.group.getObjectByName('drawing-crayon-tip')!.getWorldPosition(new Vector3());
    expect(tip.distanceTo(stage.group.getObjectByName('drawing-paper-contact')!.position)).toBeLessThan(1e-5);
  }
});

it.each([
  { id: 'frukost', at: 7 },
  { id: 'frukost', at: 9.6 },
  { id: 'namnet', at: 3.4 },
])('completes the quiet drawing contact on return or restore in $id at $at', ({ id, at }) => {
  for (const restored of [false, true]) {
    const stage = createStage(morgonen, () => 0), rig = stage.actors.get('moa')!.rig;
    const index = morgonen.scenes!.findIndex(scene => scene.id === id), scene = morgonen.scenes![index]!;
    const flags = new Set(morgonen.scenes!.slice(0, index).map(prior => prior.by?.done ?? `scene:${prior.id}`));
    if (scene.on) flags.add(scene.on);
    if (scene.needs) flags.add(scene.needs);
    if (!restored) stage.update({ id, seconds: at - 1 / 60 }, flags, morgonen.spawn, at - 1 / 60, 1 / 60, true);
    stage.update({ id, seconds: at }, flags, morgonen.spawn, at, restored ? 0 : 1 / 60, true);
    // In namnet she also sits back down: the body must reach the chair before the page is within arm's reach.
    if (id === 'namnet') stage.update({ id, seconds: at + .45 }, flags, morgonen.spawn, at + .45, 1 / 60, true);
    stage.group.updateMatrixWorld(true);
    const palm = rig.grip(0, new Vector3(), new Vector3(0, 1, 0), new Vector3(), 0);
    expect(palm.distanceTo(stage.group.getObjectByName('drawing-paper-support')!.position)).toBeLessThan(1e-5);
    const tip = stage.group.getObjectByName('drawing-crayon-tip')!.getWorldPosition(new Vector3());
    expect(tip.distanceTo(stage.group.getObjectByName('drawing-paper-contact')!.position)).toBeLessThan(1e-5);
  }
});
