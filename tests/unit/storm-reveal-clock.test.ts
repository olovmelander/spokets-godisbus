import { Color, DirectionalLight, Group, HemisphereLight, InstancedMesh, PerspectiveCamera, Scene } from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AVENTYR2 } from '../../src/content/aventyr2/aventyr2';
import '../../src/content/aventyr2/render';
import { PACK } from '../../src/render/extensions';

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
