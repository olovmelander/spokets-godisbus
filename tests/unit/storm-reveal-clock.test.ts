import { Color, DirectionalLight, Group, HemisphereLight, InstancedMesh, PerspectiveCamera, Scene } from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AVENTYR2 } from '../../src/content/aventyr2/aventyr2';
import '../../src/content/aventyr2/render';
import { PACK } from '../../src/render/extensions';
import { STEP } from '../../src/sim/constants';
import { SceneDirector } from '../../src/sim/scene';
import type { PlayerState } from '../../src/sim/types';

beforeAll(() => {
  const fake: object = new Proxy(function () {}, { get: (_, key) => key === Symbol.toPrimitive ? () => 0 : fake, apply: () => fake, set: () => true });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => fake }) });
});
afterAll(() => vi.unstubAllGlobals());

function setup(still = false, restored = false) {
  const chapter = AVENTYR2.find(chapter => chapter.id === 'stormskog')!;
  const flight = chapter.storm!.flybys![0]!;
  const scene = new Scene(), camera = new PerspectiveCamera();
  camera.position.set(12, 4, 15);
  const wing = new Group(); wing.name = 'owl-wing'; wing.userData.side = 1; scene.add(wing);
  const extras = PACK.extras.map(make => make({ chapter, scene, sky: new Color(), hemisphere: new HemisphereLight(), sun: new DirectionalLight() })).filter(extra => extra !== null);
  const flags = new Set<string>(restored ? [flight.on] : []);
  let clock = 0;
  const update = (dt: number, revealPaused = false) => {
    clock += dt;
    extras.forEach(extra => extra.update({ dt, clock, flags, x: 12, y: 0, camera, still, tier: 'low', riding: false, revealPaused }));
  };
  update(0);
  const figure = scene.getObjectByName(`flyby:${flight.on}`)!;
  const rain = scene.getObjectByName('storm-rain-drops') as InstancedMesh;
  return { flight, flags, figure, rain, wing, update };
}

describe('a story reveal waits for its own line without stopping the storm', () => {
  it.each([false, true])('keeps the flight visible and resumes its remaining travel after a long line (reduced motion %s)', still => {
    const { flight, flags, figure, rain, wing, update } = setup(still);
    flags.add(flight.on); update(.05);
    expect(figure.visible).toBe(true);
    for (let i = 0; i < 8; i++) update(.05);
    const held = figure.position.clone(), rotation = figure.quaternion.clone();
    const drops = Array.from(rain.instanceMatrix.array), wingAt = wing.rotation.x;
    // More time than the entire authored flight, with the actual renderer extras still updating every frame.
    for (let i = 0; i < 160; i++) update(.05, true);
    expect(figure.visible).toBe(true);
    expect(figure.position.toArray()).toEqual(held.toArray());
    expect(figure.quaternion.toArray()).toEqual(rotation.toArray());
    if (!still) {
      expect(Array.from(rain.instanceMatrix.array)).not.toEqual(drops);
      expect(wing.rotation.x).not.toBe(wingAt);
    }
    // Pause neither moves the figure nor spends any of its remaining flight time.
    for (let i = 0; i < 20; i++) update(0);
    expect(figure.position.toArray()).toEqual(held.toArray());
    update(.05);
    expect(figure.position.x).toBeGreaterThan(held.x);
    expect(figure.visible).toBe(true);
    for (let i = 0; i < Math.ceil(flight.seconds / .05); i++) update(.05);
    expect(figure.visible).toBe(false);
  });

  it('can start a new reveal while its line is pending, without advancing before it has been read', () => {
    const { flight, flags, figure, update } = setup();
    flags.add(flight.on); update(.05, true);
    const start = figure.position.clone();
    expect(start.x).toBe(flight.from.x); // no active owner: an unrelated pause does not skip its entrance
    expect(figure.visible).toBe(true);
    for (let i = 0; i < 80; i++) update(.05, true);
    expect(figure.position.toArray()).toEqual(start.toArray());
    update(.05);
    expect(figure.position.x).toBeGreaterThan(start.x);
  });

  it('does not replay a completed flight when a saved chapter already contains its trigger', () => {
    const { figure, update } = setup(false, true);
    for (let i = 0; i < 80; i++) update(.05);
    expect(figure.visible).toBe(false);
  });
});

describe('restoring the actual Älven reveal without replaying old flights', () => {
  function saved(completed = false, fresh = false) {
    const chapter = AVENTYR2.find(chapter => chapter.id === 'alven')!;
    const flight = chapter.storm!.flybys!.find(f => f.on === 'al:little-seen')!;
    const past = chapter.storm!.flybys![0]!;
    const view = new Scene(), camera = new PerspectiveCamera();
    camera.position.set(160, 4, 15);
    const extras = PACK.extras.map(make => make({ chapter, scene: view, sky: new Color(), hemisphere: new HemisphereLight(), sun: new DirectionalLight() })).filter(extra => extra !== null);
    // Save filtering removed the unfinished beat:al:see-little, but its earlier non-beat scene cue remains.
    const flags = new Set([...(fresh ? [] : [flight.on]), past.on, ...(completed ? ['scene:al:little', 'beat:al:see-little'] : [])]);
    let clock = 0;
    const update = (dt: number, seconds: number | null, waiting = false) => {
      clock += dt;
      extras.forEach(extra => extra.update({ dt, clock, flags, x: 156, y: 3, camera, still: false, tier: 'low', riding: true,
        revealPaused: waiting, scene: seconds === null ? null : { id: 'al:little', seconds, waiting } }));
    };
    update(0, null);
    const figure = view.getObjectByName(`flyby:${flight.on}`)!;
    const historical = view.getObjectByName(`flyby:${past.on}`)!;
    const halo = figure.children.find(child => child.type === 'Mesh') as import('three').Mesh<import('three').BufferGeometry, import('three').MeshBasicMaterial>;
    return { flags, flight, figure, historical, halo, update };
  }

  it('establishes the fresh figure visibly when its first cue waits behind an earlier line', () => {
    const { flags, flight, figure, historical, halo, update } = saved(false, true);
    update(.05, .75);
    expect(figure.visible).toBe(false);
    // The actual scene cue has just fired, but the earlier owl line still owns the HUD. The scene waits
    // before emitting its own words; an elapsed-zero flight would otherwise hold a completely dark halo.
    flags.add(flight.on);
    update(.05, .8, true);
    expect(flags.has('beat:al:see-little')).toBe(false);
    expect(figure.visible).toBe(true);
    expect(halo.material.opacity).toBeGreaterThan(.3);
    const x = figure.position.x, z = figure.position.z;
    expect(x).toBeGreaterThan(flight.from.x);
    for (let i = 0; i < 200; i++) update(.05, .8, true);
    expect(figure.position.x).toBe(x);
    expect(figure.position.z).toBe(z);
    expect(halo.material.opacity).toBeGreaterThan(.3);
    expect(historical.visible).toBe(false);
    update(0, .8, true);
    expect(figure.position.x).toBe(x);
    update(.05, .85);
    expect(figure.position.x).toBeGreaterThan(x);
    for (let i = 0; i < 120; i++) update(.05, .9 + i * .05);
    expect(figure.visible).toBe(false);
    expect(historical.visible).toBe(false);
  });

  it('reconstructs a saved pending reveal at a visible phase, then continues only once', () => {
    const { flags, flight, figure, historical, halo, update } = saved();
    expect(figure.visible).toBe(false);
    update(.05, .3, true); // the shot is still moving toward the figure
    expect(figure.visible).toBe(false);
    update(.05, .81, true);
    expect(figure.visible).toBe(true);
    expect(halo.material.opacity).toBeGreaterThan(.3);
    const x = figure.position.x, z = figure.position.z;
    expect(x).toBeGreaterThan(flight.from.x);
    for (let i = 0; i < 200; i++) update(.05, .81, true);
    expect(figure.visible).toBe(true);
    expect(figure.position.x).toBe(x);
    expect(figure.position.z).toBe(z);
    expect(historical.visible).toBe(false);
    // A resumed line cannot reset its flight every frame, and a later re-entry cannot resurrect it again.
    flags.add('beat:al:see-little');
    for (let i = 0; i < 120; i++) update(.05, .81 + i * .05);
    expect(figure.visible).toBe(false);
    update(.05, .81, true);
    expect(figure.visible).toBe(false);
    expect(historical.visible).toBe(false);
  });

  it('restores at the actual director cue phase, including its half-step emission boundary', () => {
    const { flags, figure, halo, update } = saved();
    const scene = AVENTYR2.find(chapter => chapter.id === 'alven')!.scenes!.find(scene => scene.id === 'al:little')!;
    const cue = scene.cues![0]!;
    flags.add('al:owl');
    const player = { x: 152, y: 3, mode: 'ride', grounded: false } as PlayerState;
    const director = new SceneDirector([scene], player, flags);
    while ((director.frame?.seconds ?? 0) + STEP / 2 < cue.at) director.tick(player, flags, [], false, true);
    const phase = director.frame!.seconds;
    expect(phase + STEP / 2).toBeGreaterThanOrEqual(cue.at);
    update(.05, phase, true);
    expect(figure.visible).toBe(true);
    expect(halo.material.opacity).toBeGreaterThan(.3);
    const x = figure.position.x;
    for (let i = 0; i < 100; i++) update(.05, phase, true);
    expect(figure.position.x).toBe(x);
    expect(halo.material.opacity).toBeGreaterThan(.3);
  });

  it('leaves a completed reveal hidden, even if an old caller supplies its scene frame', () => {
    const { figure, historical, update } = saved(true);
    for (let i = 0; i < 120; i++) update(.05, .81, true);
    expect(figure.visible).toBe(false);
    expect(historical.visible).toBe(false);
  });

  it('does not resurrect a restored flight after its authored passage is already over', () => {
    const { figure, update } = saved();
    update(.05, 6, true);
    expect(figure.visible).toBe(false);
  });
});
