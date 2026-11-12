import { Box3, Color, DirectionalLight, HemisphereLight, PerspectiveCamera, Scene, Vector3 } from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { BOARDING } from '../../src/content/aventyr2/render';
import { ADVENTURE2, loadAdventure2 } from '../../src/content/chapters';
import { PACK, type ViewExtra } from '../../src/render/extensions';
import type { SceneFrame } from '../../src/sim/scene';

/**
 * Flärken's end (Olov, 12 November 2026: "När gamla trägubben hoppar på en stock i slutet så syns han på två ställen
 * samtidigt"). The old one standing on the end post leapt away on his own when his flight began from the same post,
 * and while the line about it was read (a reading stop holds the picture) he stood on the post and floated on the log
 * at once. Now there is one of him: the figure on the post goes as the flight begins, and the flight begins with his
 * hop from the post down onto the log that waits in the water.
 */
beforeAll(async () => {
  const fake: object = new Proxy(function () {}, { get: (_, key) => (key === Symbol.toPrimitive ? () => 0 : fake), apply: () => fake, set: () => true });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => fake }) });
  await loadAdventure2();
});
afterAll(() => vi.unstubAllGlobals());

describe("the old trägubbe at Flärken's end", () => {
  it('goes from the end post at once when his flight begins, even in a frame where no time passes', () => {
    const chapter = ADVENTURE2.find((one) => one.id === 'flarken')!;
    const post = chapter.decor!.find((d) => d.look === 'tragubbe' && d.until === 'sjon:log-run')!;
    expect(post.word).toBe('boards');
    const standing = PACK.spots.get('tragubbe')!({ id: 'decor:0', at: post.at, verb: 'take', look: 'tragubbe', word: 'boards' })!;
    standing.update(false, 0, 1 / 60);
    expect(standing.group.visible).toBe(true);
    standing.update(true, 0, 0);
    expect(standing.group.visible).toBe(false);
  });

  it('hops from where he stood onto his log, which waits for him in the water, and floats off on it', () => {
    const chapter = ADVENTURE2.find((one) => one.id === 'flarken')!;
    const post = chapter.decor!.find((d) => d.look === 'tragubbe' && d.until === 'sjon:log-run')!;
    const scene = new Scene();
    const extras = PACK.extras.map((make) => make({ chapter, scene, sky: new Color(), hemisphere: new HemisphereLight(), sun: new DirectionalLight() }))
      .filter((extra): extra is ViewExtra => extra !== null);
    const camera = new PerspectiveCamera();
    camera.position.set(190, 6, 20);
    const frame = (flags: ReadonlySet<string>, clock: number, moment: SceneFrame) => {
      for (const extra of extras) extra.update({ dt: 1 / 60, clock, flags, x: 186.6, y: 0.6, camera, still: false, tier: 'mid', riding: false, scene: moment });
      scene.updateMatrixWorld(true);
    };
    const opening = { id: 'sjon:stocken', seconds: 0.3 } as SceneFrame;
    const flight = scene.getObjectByName('flyby:sjon:log-run')!;
    const waits = scene.getObjectByName('waiting-log')!;
    frame(new Set(['sjon:downstream']), 1, opening);
    expect(waits.visible).toBe(true);
    expect(flight.visible).toBe(false);
    const flags = new Set(['sjon:downstream', 'sjon:log-run']);
    frame(flags, 1 + 1 / 60, { ...opening, seconds: 0.72 });
    expect(flight.visible).toBe(true);
    expect(waits.visible).toBe(false);
    const figure = flight.children[0]!;
    // Where he stood on the post, as big as he stood there.
    expect(figure.getWorldPosition(new Vector3()).distanceTo(new Vector3(post.at.x, post.at.y, post.z ?? -0.6))).toBeLessThan(0.05);
    expect(figure.getWorldScale(new Vector3()).x).toBeCloseTo(1, 2);
    // Up in an arc, and down onto the log.
    let high = -Infinity;
    for (let t = 2 / 60; t <= BOARDING.seconds + 0.05; t += 1 / 60) {
      frame(flags, 1 + t, { ...opening, seconds: 0.7 + t });
      high = Math.max(high, figure.getWorldPosition(new Vector3()).y);
    }
    expect(high).toBeGreaterThan(post.at.y + 0.3);
    // On the log: where a floating flight has its figure, its feet on the log's top, and the log at its own place.
    const log = flight.getObjectByName('flyby-log')!;
    expect(figure.position.x).toBeCloseTo(0, 3);
    expect(figure.position.z).toBeCloseTo(0, 3);
    expect(figure.position.y).toBeCloseTo(-0.5, 3);
    expect(figure.scale.x).toBeCloseTo(1, 3);
    expect(log.position.y).toBeCloseTo(-0.25, 3);
    expect(log.scale.x).toBeCloseTo(1, 3);
    // The log stayed where it floats under him all the while: at the flight's own place.
    expect(Math.abs(new Box3().setFromObject(log).getCenter(new Vector3()).z - (chapter.storm!.flybys!.find((f) => f.on === 'sjon:log-run')!.z ?? -4))).toBeLessThan(0.3);
  });
});
