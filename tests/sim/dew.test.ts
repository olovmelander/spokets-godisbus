import { describe, expect, it } from 'vitest';
import { cuesFor, newCueMemory, type Heard } from '../../src/audio/cues';
import { garden } from '../../src/content/chapters/garden';
import { sv } from '../../src/content/sv';
import { POLSKA } from '../../src/audio/music';
import { STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { ChapterData, StepInput } from '../../src/sim/types';
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

  it('rings the opening theme with each drop’s own pitch, including repeated notes between frames', () => {
    const still: Heard = {
      time: 0, mode: 'free', grounded: false, x: 0, y: 1, vx: 0, vy: 0, candy: 0, checkpoint: -1, bubbles: 0, atGoal: false,
      moving: 0, shadows: [], drips: [], notes: 0,
    };
    expect(drops.map((spot) => spot.note)).toEqual(POLSKA[0]!.map((note) => note.midi + 12));
    expect(cuesFor({ ...still, noteHits: [{ serial: 1, midi: 74 }] }, {
      ...still, noteHits: [{ serial: 1, midi: 74 }, { serial: 2, midi: 74 }, { serial: 3, midi: 81 }],
    }, newCueMemory())).toEqual([{ kind: 'bell', midi: 74 }, { kind: 'bell', midi: 81 }]);
    expect(sv.dewSong.length).toBeLessThanOrEqual(40);
  });

  it('does not award the song for merely loading four discovered drops in any order', () => {
    const sim = new Sim({ ...garden, spawn: { x: 95, y: 1.11 } }, {}, { flags: ['note:dew1', 'note:dew2', 'note:dew3'] });
    for (let i = 0; i < 0.2 / STEP; i++) sim.step(idle);
    expect(sim.flags.has('dewsong')).toBe(false);
    const last = new Sim({ ...garden, spawn: { x: 95, y: 1.11 } }, {}, { flags: ['note:dew1', 'note:dew2', 'note:dew3', 'note:dew4'] });
    for (let i = 0; i < 0.2 / STEP; i++) last.step(idle);
    expect(last.flags.has('dewsong')).toBe(false);
    expect(last.noteHits).toEqual([]);
  });

  // A flat test lane uses the real chapter's authored melody and pitches; real physics crosses each bell.
  const lane: ChapterData = {
    id: 'bells', ground: [{ x: -10, y: 0 }, { x: 30, y: 0 }], spawn: { x: -3, y: 0.01 }, goalX: 25, candy: [],
    spots: drops.map((spot, i) => ({ ...spot, at: { x: i * 4, y: 0 } })), song: garden.song!,
  };
  function walkTo(sim: Sim, x: number) {
    const direction = Math.sign(x - sim.curr.x);
    for (let i = 0; i < 1500 && (x - sim.curr.x) * direction > 0; i++) sim.step({ ...idle, x: direction });
    expect((x - sim.curr.x) * direction).toBeLessThanOrEqual(0);
  }

  it('makes the lawn sparkle for the ordered theme, and keeps every bell playable afterwards', () => {
    const sim = new Sim(lane);
    walkTo(sim, 14);
    expect(sim.noteHits.map((hit) => hit.id)).toEqual(garden.song!.notes);
    expect(sim.flags.has('dewsong')).toBe(true);
    walkTo(sim, -3);
    expect(sim.noteHits).toHaveLength(8);
    expect(sim.noteHits.slice(4).map((hit) => hit.midi)).toEqual(drops.map((spot) => spot.note!).reverse());
    expect(sim.flags.has('dewsong')).toBe(true);
  });

  it('does not award a reversed melody, then accepts a fresh ordered try without resetting the chapter', () => {
    const sim = new Sim({ ...lane, spawn: { x: 15, y: 0.01 } });
    walkTo(sim, -3);
    expect(sim.flags.has('dewsong')).toBe(false);
    walkTo(sim, 14);
    expect(sim.flags.has('dewsong')).toBe(true);
  });

  it('does not ring every physics tick while standing on a bell, and replays after loading a discovery', () => {
    const sim = new Sim({ ...lane, spawn: { x: 0, y: 0.01 } }, {}, { flags: ['note:dew1', 'dewsong'] });
    for (let i = 0; i < 2 / STEP; i++) sim.step(idle);
    expect(sim.noteHits).toHaveLength(1);
    walkTo(sim, -3);
    walkTo(sim, 0);
    expect(sim.noteHits).toHaveLength(2);
    expect(sim.noteHits[1]?.midi).toBe(74);
  });
});
