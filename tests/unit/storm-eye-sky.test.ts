import { BufferGeometry, Color, DirectionalLight, HemisphereLight, PerspectiveCamera, Points, Scene, Vector3 } from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { stormoga } from '../../src/content/aventyr2/chapters/stormoga';
import { installPictures } from '../../src/content/aventyr2/render';
import { PACK } from '../../src/render/extensions';

beforeAll(() => {
  const fake: object = new Proxy(function () {}, { get: (_, key) => key === Symbol.toPrimitive ? () => 0 : fake, apply: () => fake, set: () => true });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => fake }) });
  installPictures();
});
afterAll(() => vi.unstubAllGlobals());

/**
 * Olov, 15 November 2026: "I kapitlet 'Stormens öga' zoomar kameran ut, och då försvinner stjärnorna och månen." A shot
 * backs the camera off to fit its width (src/render/view.ts): the eye opening (`oga`, 20 wide) and him grown with the
 * family on the shore (`stor`, 26.6 wide) took it 50 to 100 back on a phone held upright, and the sky stood past the end of
 * the camera's sight, 140.
 */
describe("Stormens öga: the sky stays in the picture as a shot opens out", () => {
  // How far back the camera stands, and how wide the picture is: the play picture on a computer, `stor` on a tablet held
  // sideways, `oga` and `stor` on a phone held upright.
  it.each([[16, 1.6], [37, 1.44], [81, 0.462], [107, 0.462]])('keeps the moon and the stars in sight with the camera %s back, %s wide', (back, aspect) => {
    const scene = new Scene();
    const camera = new PerspectiveCamera(30, aspect, 0.1, 140);
    camera.position.set(57.6, 3.6, back);
    camera.lookAt(57.6, 3.6, 0);
    camera.updateMatrixWorld();
    const effects = PACK.extras.map((make) => make({ chapter: stormoga, scene, sky: new Color(), hemisphere: new HemisphereLight(), sun: new DirectionalLight() }))
      .filter((effect) => effect !== null);
    // The eye is open (`still`: at once, as with less motion).
    for (const effect of effects) effect.update({ dt: 0.016, clock: 5, flags: new Set(['eye']), x: 57.6, y: 0.6, camera, still: true, tier: 'high', riding: false });
    scene.updateMatrixWorld(true);
    const moon = scene.getObjectByName('moon')!.getWorldPosition(new Vector3()).project(camera);
    expect(moon.z, 'the moon is inside the camera\'s sight').toBeLessThan(1);
    expect(Math.abs(moon.x), 'the moon is in the picture, across').toBeLessThan(0.9);
    expect(moon.y, 'the moon is in the sky').toBeGreaterThan(0);
    expect(moon.y).toBeLessThan(0.9);
    const stars = scene.getObjectByName('storm-stars') as Points<BufferGeometry>;
    const position = stars.geometry.getAttribute('position');
    let seen = 0;
    for (let i = 0; i < position.count; i++) {
      const at = new Vector3().fromBufferAttribute(position, i).applyMatrix4(stars.matrixWorld).project(camera);
      if (at.z < 1 && Math.abs(at.x) <= 1 && Math.abs(at.y) <= 1) seen++;
    }
    expect(seen, 'stars in the picture').toBeGreaterThan(15);
    scene.traverse((object) => { (object as Points).geometry?.dispose(); });
  });
});
