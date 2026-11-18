import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createChaseCamera, gateLift } from '../../src/kart/visual/camera';
import { createRace } from '../../src/kart/sim/race';
import { LAP } from '../../src/kart/sim/track';
import { TRACK_IDS } from '../../src/kart/sim/courses';

/**
 * Behind Godisracet's menu the camera tours the lap. Over the start gate it rises, so the bunting under the gate's
 * crossbar (5.8 to 7.25 m over the road) never passes just under its eye and fills the picture with pennants.
 */
describe("the menu's flight over the start gate", () => {
  it('rises about 4 m as it reaches the gate, and keeps its usual height elsewhere on the lap', () => {
    // The camera rides 7 m behind the point it tours: at tour 3 it is 4 m before the gate.
    expect(gateLift(3)).toBeCloseTo(4, 5);
    expect(gateLift(3 + LAP)).toBeCloseTo(4, 5);
    expect(gateLift(LAP / 2)).toBeLessThan(1e-6);
    expect(gateLift(60)).toBeLessThan(0.01);
  });

  it.each(TRACK_IDS)('on %s it is well clear of the bunting from 12 m before the gate to 4 m past it', (id) => {
    const race = createRace({ track: id, difficulty: 'normal', cc: 100 });
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 2000);
    const chase = createChaseCamera(camera, race.track, { calm: false });
    const driver = race.state.player;
    const gate = race.track.point(0, 0);
    // Fly the menu's tour slowly through the stretch round the gate, letting the camera settle each step.
    let lowest = Infinity;
    for (let tour = LAP - 20; tour <= LAP + 20; tour += 0.25) {
      for (let i = 0; i < 6; i++) chase.update(driver, 'menu', 1 / 60, tour / 15);
      const past = tour - 7 - LAP;
      if (past >= -12 && past <= 4) lowest = Math.min(lowest, camera.position.y - gate.y);
    }
    // The crossbar's top is 7.25 m over the road; the eye now passes at least a metre above it.
    expect(lowest).toBeGreaterThan(8.25);
  });
});
