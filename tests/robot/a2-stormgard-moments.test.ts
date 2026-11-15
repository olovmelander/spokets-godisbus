import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import '../../src/content/aventyr2/aventyr2';
import { stormgard } from '../../src/content/aventyr2/chapters/stormgard';
import { gateOf } from '../../src/render/dressing/hedge-gate';
import { GHOST_CLEARANCE } from '../../src/sim/constants';
import { walkedOff, walkOffOf } from '../../src/sim/walk-off';
import type { ChapterData } from '../../src/sim/types';
import { decide } from './robot';

/** The robot from a big candy until `done`, pressing what is offered: a step a frame at 60 Hz. */
function playUntil(game: Game, chapter: ChapterData, done: () => boolean, seconds: number): void {
  let wasAhead = false, wasOffered = false;
  for (let frame = 0; frame < 60 * seconds && !done(); frame++) {
    const d = decide(game, chapter);
    game.frame(1 / 60, { x: d.x, y: d.y, hopHeld: true }, { hop: d.ahead && !wasAhead, act: d.offered && !wasOffered, helper: false });
    wasAhead = d.ahead;
    wasOffered = d.offered;
  }
}

/** Where a staged walk has got to at `t`: from key to key, each reached `move` seconds after its moment. */
function walked(keys: readonly { at: number; move?: number; to?: { x: number; y: number; z?: number }; x?: number; y?: number; z?: number }[], t: number, from: { x: number; z: number }): { x: number; z: number } {
  let at = { ...from };
  for (const key of keys) {
    if (key.at > t) break;
    const to = key.to ?? (key.x !== undefined ? { x: key.x, z: key.z } : null);
    if (!to) continue;
    const k = Math.min(1, (t - key.at) / (key.move ?? 0.6));
    at = { x: at.x + (to.x - at.x) * k, z: at.z + ((to.z ?? 0) - at.z) * k };
  }
  return at;
}

describe('Stormgården ends with Elof and Klonk going in through the arch in the hedge (Olov, 14 November 2026)', () => {
  const walkOff = walkOffOf(stormgard)!;
  const gate = gateOf(stormgard)!;

  it('holds him at the goal while they go in, and the last page waits until he is through', () => {
    // Taken up at the last big candy, before the hedge, with the little one's flight seen.
    const flags = ['scene:card', 'sg:tap', 'placed:lid', 'sg:bertil', 'sg:boot-ready', 'sg:boot', 'sg:old-seen', 'scene:sg:lekstugan', 'beat:sg:playhouse', 'sg:thought',
      'scene:haecken', 'sg:flight', 'beat:sg:flash'];
    const game = new Game(stormgard, {}, { checkpoint: stormgard.checkpoints!.length - 1, flags, placed: ['lid'] });
    expect(walkOff.id).toBe('gangen');
    playUntil(game, stormgard, () => game.sim.flags.has('goal'), 120);
    expect(game.sim.flags.has('goal')).toBe(true);
    const goalAt = game.sim.curr.x;
    let seconds = 0, gone = -1, played = false, strayed = 0;
    // A child who goes on pushing right: the walk holds him at the goal, and the picture walks him in. (The page has
    // turned before the scene is over; here nothing turns it.)
    for (let frame = 0; frame < 60 * 11; frame++) {
      game.frame(1 / 60, { x: 1, y: 0, hopHeld: false }, { hop: false, act: false, helper: false });
      seconds += 1 / 60;
      if (game.sim.sceneFrame?.id === 'gangen') {
        played = true;
        expect(game.sim.held).toBe(true);
        strayed = Math.max(strayed, Math.abs(game.sim.curr.x - goalAt));
      }
      if (gone < 0 && walkedOff(walkOff, game.sim.flags, game.sim.sceneFrame)) gone = seconds;
    }
    expect(played).toBe(true);
    expect(strayed).toBeLessThan(0.8);
    // Longer than the plain coda's 4.6 s, so that he is seen going in; and not much longer than Gården's.
    expect(gone).toBeGreaterThan(7);
    expect(gone).toBeLessThan(10);
    // A save that has seen it does not wait for it again.
    expect(walkedOff(walkOff, new Set(['scene:gangen']), null)).toBe(true);
  });

  it('walks him onto the path over the low hedge and in through the arch, into the forest, for the picture only', () => {
    const stage = walkOff.stage!;
    const elof = stage.elof!;
    expect(elof.every((key) => key.act === undefined || key.act === 'walk')).toBe(true);
    // He stays level with the low hedge's top, which is the arch's floor.
    for (const key of elof) expect(Math.abs(key.to!.y - gate.floor)).toBeLessThan(0.1);
    // Inside the opening wherever he is as far back as its hedge; and by the time the page turns, well beyond it.
    const from = { x: stormgard.goalX, z: 0 };
    for (let t = 0; t <= walkOff.seconds; t += 0.1) {
      const at = walked(elof, t, from);
      if (at.z < gate.front + 0.4 && at.z > gate.back - 0.4) {
        expect(at.x, `at ${t.toFixed(1)} s`).toBeGreaterThan(gate.open.from + 0.4);
        expect(at.x, `at ${t.toFixed(1)} s`).toBeLessThan(gate.open.to - 0.4);
      }
    }
    expect(walked(elof, walkOff.seconds - 1, from).z).toBeLessThan(gate.back - 1.5);
  });

  it('has Klonk wait for him by the arch to the end, out of reach, and go in before him', () => {
    const last = stormgard.ghost!.at(-1)!;
    // It no longer shrinks away as he comes: it stays, just past the opening, further from the goal than he can reach.
    expect(last.stays).toBe(true);
    expect(last.at.x).toBeGreaterThan(gate.open.to);
    expect(last.at.x - stormgard.goalX).toBeGreaterThan(GHOST_CLEARANCE + 0.3);
    const klonk = walkOff.stage!.actors!.ghost!;
    expect([klonk[0]!.x, klonk[0]!.y, klonk[0]!.z]).toEqual([last.at.x, last.at.y, 0]);
    // Ahead of him all the way in, and never beside him in the arch.
    const elof = walkOff.stage!.elof!;
    for (let t = 1.5; t <= walkOff.seconds; t += 0.1) {
      const k = walked(klonk, t, { x: last.at.x, z: 0 }), e = walked(elof, t, { x: stormgard.goalX, z: 0 });
      expect(e.z - k.z, `at ${t.toFixed(1)} s`).toBeGreaterThan(1);
    }
  });
});
