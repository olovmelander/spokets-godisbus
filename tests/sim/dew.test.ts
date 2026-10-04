import { describe, expect, it } from 'vitest';
import { cuesFor, newCueMemory, type Heard } from '../../src/audio/cues';
import { garden } from '../../src/content/chapters/garden';
import { sv } from '../../src/content/sv';
import { STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { StepInput } from '../../src/sim/types';
import { heightAt } from '../robot/robot';

// O1, Daggklockspelet (plan §4.8): dew drops on grass blades ring when bumped.

const idle: StepInput = { x: 0, y: 0, hopHeld: false, hop: false, act: false };
const drops = (garden.spots ?? []).filter((spot) => spot.look === 'dew');

describe('the dew bells on the lawn', () => {
  it('are four drops over level lawn, each rung by coming up to it', () => {
    expect(drops.map((spot) => spot.id)).toEqual(['note:dew1', 'note:dew2', 'note:dew3', 'note:dew4']);
    for (const [i, spot] of drops.entries()) {
      expect(spot.touch, spot.id).toBe(true);
      expect(heightAt(garden, spot.at.x), spot.id).toBe(0);
      // Higher than he reaches from the ground, and within a hop.
      expect(spot.at.y, spot.id).toBeGreaterThan(1.3);
      expect(spot.at.y, spot.id).toBeLessThan(2);
      if (i > 0) expect(spot.at.x).toBeGreaterThan(drops[i - 1]!.at.x);
    }
  });

  it('walking under one leaves it silent, and a hop rings it', () => {
    for (const spot of drops) {
      const walked = new Sim({ ...garden, spawn: { x: spot.at.x - 1.6, y: 0.01 } });
      for (let i = 0; i < 1 / STEP; i++) walked.step({ ...idle, x: 1 });
      expect(walked.flags.has(spot.id), spot.id).toBe(false);

      const hopped = new Sim({ ...garden, spawn: { x: spot.at.x, y: 0.01 } });
      for (let i = 0; i < 0.2 / STEP; i++) hopped.step(idle);
      hopped.step({ ...idle, hop: true, hopHeld: true });
      for (let i = 0; i < 0.7 / STEP; i++) hopped.step({ ...idle, hopHeld: true });
      expect(hopped.flags.has(spot.id), spot.id).toBe(true);
    }
  });

  it('each one rings a step higher than the last, and when all four have rung the lawn glitters', () => {
    const still: Heard = {
      time: 0, mode: 'free', grounded: false, x: 0, y: 1, vx: 0, vy: 0, candy: 0, checkpoint: -1, bubbles: 0, atGoal: false,
      moving: 0, shadows: [], drips: [], notes: 0,
    };
    expect(cuesFor({ ...still, notes: 2 }, { ...still, notes: 3 }, newCueMemory())).toEqual([{ kind: 'note', step: 2 }]);
    const sim = new Sim({ ...garden, spawn: { x: 95, y: 1.11 } }, {}, { flags: ['note:dew1', 'note:dew2', 'note:dew3'] });
    for (let i = 0; i < 0.2 / STEP; i++) sim.step(idle);
    expect(sim.flags.has('dewsong')).toBe(false);
    const last = new Sim({ ...garden, spawn: { x: 95, y: 1.11 } }, {}, { flags: ['note:dew1', 'note:dew2', 'note:dew3', 'note:dew4'] });
    for (let i = 0; i < 0.2 / STEP; i++) last.step(idle);
    expect(last.flags.has('dewsong')).toBe(true);
    expect(sv.dewSong.length).toBeLessThanOrEqual(40);
  });
});
