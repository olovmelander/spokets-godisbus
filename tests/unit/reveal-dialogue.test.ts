import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { alven } from '../../src/content/aventyr2/chapters/alven';
import { billsta } from '../../src/content/aventyr2/chapters/billsta';
import { flarken } from '../../src/content/aventyr2/chapters/flarken';
import { olympia } from '../../src/content/aventyr2/chapters/olympia';
import { stormbyn } from '../../src/content/aventyr2/chapters/stormbyn';
import { stormgard } from '../../src/content/aventyr2/chapters/stormgard';
import { stormskog } from '../../src/content/aventyr2/chapters/stormskog';
import { STEP } from '../../src/sim/constants';
import { SceneDirector } from '../../src/sim/scene';
import { Sim } from '../../src/sim/sim';
import type { PlayerState } from '../../src/sim/types';
import { idle, run } from '../sim/drive';

const reveals = [stormgard, stormskog, stormbyn, olympia, flarken, alven, billsta]
  .flatMap(chapter => (chapter.scenes ?? []).filter(scene => scene.dialogue?.length).map(scene => ({ chapter, scene })));

describe('the words belonging to a distant story reveal', () => {
  for (const { chapter, scene } of reveals) it(`${chapter.id}/${scene.id}: keeps its authored picture until the owned line has finished`, () => {
    // A long spoken/subtitled line must not consume the rest of a short cutaway. This uses the real authored
    // scenes, including those whose speech is emitted by a world beat rather than SceneDef.lines.
    const flags = new Set<string>([scene.on, scene.needs].filter((flag): flag is string => flag !== undefined));
    const pending = new Set<string>();
    const conditions = { has: (flag: string) => flags.has(flag) && !pending.has(flag) };
    const at = scene.at ?? ((scene.before ?? 1) - 1);
    const player = { x: at, y: 0, mode: 'free', grounded: true } as PlayerState;
    const director = new SceneDirector([scene], { x: at, y: 0 }, flags);
    director.tick(player, flags, [], false, true, conditions);
    expect(director.frame?.id).toBe(scene.id);
    for (const id of scene.dialogue!) expect(chapter.beats?.some(beat => beat.id === id)).toBe(true);
    const first = `beat:${scene.dialogue![0]}`;
    flags.add(first); pending.add(first);
    const began = director.frame!.seconds;
    for (let i = 0; i < 20 / STEP; i++) director.tick(player, flags, [], true, true, conditions);
    expect(director.frame).toMatchObject({ id: scene.id, seconds: began, waiting: true });
    expect(director.holding).toBe(scene.hold === true);
    expect(flags.has(`scene:${scene.id}`)).toBe(false);
    pending.delete(first);
    for (let i = 0; i < (scene.seconds + 1) / STEP; i++) director.tick(player, flags, [], false, true, conditions);
    expect(flags.has(`scene:${scene.id}`)).toBe(true);
  });

  it('keeps the actual owl ride and Down steering moving while the little figure is being described', () => {
    const ride = alven.rides!.find(one => one.id === 'al:owl')!;
    const make = () => {
      const flags = ['al:owl-call', 'al:owl-ready', 'scene:bron', ...alven.beats!.filter(b => b.id !== 'al:see-little').map(b => `beat:${b.id}`)];
      const sim = new Sim({ ...alven, spawn: { ...ride.from, y: ride.from.y + .01 } }, {}, { flags });
      run(sim, .2, { talking: false });
      sim.step({ ...idle, act: true, talking: false });
      for (let i = 0; i < 10 / STEP && !sim.pendingDialogue.has('al:see-little'); i++) sim.step({ ...idle, talking: false });
      expect(sim.pendingDialogue.has('al:see-little')).toBe(true);
      sim.step({ ...idle, talking: true });
      expect(sim.curr.mode).toBe('ride');
      expect(sim.sceneFrame).toMatchObject({ id: 'al:little', waiting: true });
      return sim;
    };
    const low = make(), neutral = make(), x = low.curr.x, clock = low.sceneFrame!.seconds;
    run(low, .6, { talking: true, y: -1 });
    run(neutral, .6, { talking: true });
    expect(low.curr.x).toBeGreaterThan(x + 1);
    expect(low.curr.y).toBeLessThan(neutral.curr.y - .1);
    expect(low.sceneFrame!.seconds).toBe(clock);
    expect(low.held).toBe(false);
    run(low, 10, { talking: true });
    expect(low.curr.mode).toBe('free');
    expect(low.curr.x).toBeCloseTo(ride.to.x, 1);
    expect(low.sceneFrame).toMatchObject({ id: 'al:little', seconds: clock, waiting: true });
    low.acknowledge('al:see-little');
    run(low, 6, { talking: false });
    expect(low.flags.has('scene:al:little')).toBe(true);
  });

  it('frames Billsta before its first words, then waits for them before the little one lands', () => {
    const ids = new Set(['bi:there', 'bi:holds', 'bi:not-alone', 'bi:owl', 'bi:down', 'bi:cheer']);
    const flags = [...billsta.beats!.filter(b => !ids.has(b.id)).map(b => `beat:${b.id}`),
      ...billsta.scenes!.filter(scene => scene.id !== 'bi:sundet').map(scene => `scene:${scene.id}`)];
    const sim = new Sim({ ...billsta, spawn: { x: 193, y: 6.4 } }, {}, { flags });
    for (let i = 0; i < 3 / STEP && !sim.pendingDialogue.has('bi:there'); i++) sim.step({ ...idle, x: 1, talking: false });
    expect(sim.pendingDialogue.has('bi:there')).toBe(true);
    expect(sim.flags.has('bi:strait-seen')).toBe(true);
    expect(sim.sceneFrame?.id).toBe('bi:sundet');
    // The normal stopping stride decelerates on the safe brow; continued input cannot take him out of the shot.
    const entered = sim.curr.x;
    run(sim, .2, { x: 1, talking: true });
    expect(sim.curr.x - entered).toBeLessThan(.1);
    const x = sim.curr.x;
    run(sim, 20, { x: 1, talking: true });
    expect(sim.curr.x).toBeCloseTo(x, 5);
    expect(sim.flags.has('bi:landed')).toBe(false);
    expect(sim.sceneFrame).toMatchObject({ id: 'bi:sundet', waiting: true });
    sim.acknowledge('bi:there');
    run(sim, 1.4, { talking: false });
    expect(sim.flags.has('bi:landed')).toBe(false);
    run(sim, .3, { talking: false });
    expect(sim.flags.has('bi:landed')).toBe(true);
    expect(sim.pendingDialogue.has('bi:holds')).toBe(true);
    run(sim, 20, { talking: true });
    expect(sim.sceneFrame).toMatchObject({ id: 'bi:sundet', waiting: true });
  });

  it('frames the moving owl through its landing and the little figure together in both phone orientations', () => {
    const shot = alven.scenes!.find(scene => scene.id === 'al:little')!.stage!.shots![0]!;
    const flyby = alven.storm!.flybys!.find(f => f.on === 'al:little-seen')!;
    for (const aspect of [390 / 844, 844 / 390]) {
      const camera = new PerspectiveCamera(30, aspect, .1, 140);
      const height = Math.max(shot.height, (shot.width ?? 0) / aspect);
      camera.position.set(shot.x, shot.y, height / 2 / Math.tan(Math.PI / 12));
      camera.lookAt(shot.x, shot.y, 0); camera.updateMatrixWorld();
      // The previous14EL-wide shot assumed the whole owl ride stopped with the text. Walking/talking must
      // retain its complete remaining path, body width, and a little landing-room before returning to follow.
      for (const x of [151.2, 152, 166, 169.8]) for (const y of [0, 5.5]) {
        const point = new Vector3(x, y, 0).project(camera);
        expect(Math.abs(point.x)).toBeLessThan(.95);
        expect(Math.abs(point.y)).toBeLessThan(.95);
      }
      for (const x of [flyby.from.x, flyby.to.x]) for (const y of [flyby.from.y, flyby.from.y + flyby.size!]) {
        const point = new Vector3(x, y, flyby.z).project(camera);
        expect(Math.abs(point.x)).toBeLessThan(.9);
        expect(Math.abs(point.y)).toBeLessThan(.9);
      }
    }
  });
});
