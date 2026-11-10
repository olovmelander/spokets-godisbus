import { InstancedMesh, Matrix4, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stormkvall } from '../../src/content/aventyr2/chapters/stormkvall';
import { createStage, type Stage } from '../../src/render/stage';
import { JOINTS, type Pose, type Role } from '../../src/render/rig';
import { talk } from '../../src/render/talk';

/**
 * While a line is read the story waits (the scene's clock stands still) and the picture goes on: the family go on standing and
 * breathing, look at whoever speaks, and the one speaking says it (Olov, 9 November 2026: "när någon säger någonting så blir
 * allt helt stilla", and "Går det även lägga till lip-sync för den som pratar?").
 */
beforeEach(() => {
  const context = Object.fromEntries(['fillRect', 'beginPath', 'lineTo', 'moveTo', 'closePath', 'fill', 'stroke', 'arc', 'ellipse'].map(name => [name, () => {}]));
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => context }) });
  talk.reset();
});
afterEach(() => { vi.unstubAllGlobals(); talk.reset(); });

const DT = 1 / 60;
/** The rehearsal figure's mouth: its last part (src/render/rig.ts). */
const MOUTH = 17;
const scene = stormkvall.scenes!.find((one) => one.id === 'kvall')!;
const LINE = 'Strömmen gick! Jag tänder ljusen.';
const UPPER = ['turn', 'nod', 'tilt', 'twist', 'lean', 'armL', 'armR', 'elbowL', 'elbowR'] as const;

/** The stage through Stormkvällen's first scene up to its first line, which is then read for `reading` seconds. */
function hold(reading: number, calm = false) {
  const stage = createStage(stormkvall, () => 0), flags = new Set<string>();
  const posed = new Map<Role, Pose[]>(), opened = new Map<Role, number>();
  for (const [who, { rig }] of stage.actors) {
    const pose = rig.pose.bind(rig), face = rig.face!.bind(rig);
    rig.pose = (p) => { (posed.get(who) ?? posed.set(who, []).get(who)!).push({ ...p }); pose(p); };
    rig.face = (open, round, lids) => { opened.set(who, Math.max(opened.get(who) ?? 0, open)); face(open, round, lids); };
  }
  const first = scene.lines![0]!;
  let clock = 0;
  const frame = (t: number, dt: number, said: number | null) => {
    clock += dt;
    talk.hear(said === null ? null : { who: first.who, text: LINE, seconds: said, reading: true }, dt);
    talk.place('elof', 3, 0.8, 0);
    stage.update({ id: scene.id, seconds: t }, flags, { x: 3, y: 0 }, clock, dt, calm);
  };
  for (let t = 0; t < first.at; t += DT) frame(t, DT, null);
  const at = posed.get('pappa')!.length;
  for (let s = 0; s < reading; s += DT) frame(first.at, DT, s);
  return { stage, posed, opened, at, frame, first };
}

/** How tall the rehearsal figure's mouth is drawn: the length of its part's upright. */
const mouthOf = (stage: Stage, who: Role) => {
  const mesh = stage.actors.get(who)!.rig.group.children[0] as InstancedMesh, m = new Matrix4();
  mesh.getMatrixAt(MOUTH, m);
  return new Vector3().setFromMatrixColumn(m, 1).length();
};

describe('a line read in a scene', () => {
  it('leaves nobody standing still while the story waits', () => {
    const { posed, at } = hold(3);
    for (const [who, poses] of posed) {
      const held = poses.slice(at);
      let still = 0;
      for (let k = 1; k < held.length; k++) if (JOINTS.every((joint) => Math.abs(held[k]![joint] - held[k - 1]![joint]) < 1e-5)) still++;
      // Each goes on breathing, standing as they stand or under what they do, looking at whoever speaks.
      expect(still, who).toBeLessThan(held.length * 0.1);
    }
  });

  it('opens the mouth of the one who speaks, and keeps the others shut', () => {
    const { stage, opened, first } = hold(3);
    expect(opened.get(first.who as Role)).toBeGreaterThan(0.5);
    for (const who of ['pappa', 'moa', 'bertil'] as const) if (who !== first.who) expect(opened.get(who), who).toBe(0);
    // Shut, the figure's mouth is a sliver (0.01 tall) inside its head, out of sight.
    for (const who of ['pappa', 'moa', 'bertil'] as const) expect(mouthOf(stage, who), who).toBeLessThan(0.0101);
  });

  it('holds what was drawn exactly while the game is paused, the mouth too', () => {
    const { stage, posed, frame, first } = hold(1);
    const before = posed.get('mamma')!.length, mouth = mouthOf(stage, 'mamma');
    for (let i = 0; i < 5; i++) frame(first.at, 0, 1);
    const last = posed.get('mamma')!;
    for (let k = before; k < last.length; k++) expect(last[k]).toEqual(last[before - 1]);
    expect(mouthOf(stage, 'mamma')).toBe(mouth);
  });

  it('goes on into the scene again with no jolt as the line is read and the story goes on', () => {
    const { posed, frame, first } = hold(2.5);
    for (let t = first.at; t < first.at + 1; t += DT) frame(t, DT, null);
    for (const [who, poses] of posed) {
      const speeds = poses.slice(1).map((p, k) => UPPER.map((joint) => (p[joint] - poses[k]![joint]) / DT));
      // The upper body and the head (the legs have their steps, which are the scene's own): no frame's change of speed is a jolt.
      const accel = speeds.slice(1).map((v, k) => Math.max(...v.map((x, j) => Math.abs(x - speeds[k]![j]!) / DT)));
      expect(Math.max(...accel), who).toBeLessThan(400);
    }
  });
});
