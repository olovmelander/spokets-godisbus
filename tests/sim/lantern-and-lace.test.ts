import { describe, expect, it } from 'vitest';
import { berget } from '../../src/content/chapters/berget';
import { myren } from '../../src/content/chapters/myren';
import { letDown } from '../../src/render/ghost-lace';
import { STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { StepInput } from '../../src/sim/types';

/**
 * Olov's round of 13 November 2026: on Myren the lysklubba is taken in a moment of its own, held up in the rising mist
 * while Elof says what it is for; on Berget the ghost lets the lace down and holds it while he climbs, and lets go once
 * he has thanked it.
 */
const idle: StepInput = { x: 0, y: 0, hopHeld: false, hop: false, act: false };
function run(sim: Sim, seconds: number, input: Partial<StepInput> = {}): void {
  for (let i = 0; i < Math.round(seconds / STEP); i++) sim.step({ ...idle, ...input });
}
function walkTo(sim: Sim, x: number): void {
  for (let i = 0; i < 1200 && Math.abs(x - sim.curr.x) > 0.1; i++) sim.step({ ...idle, x: Math.sign(x - sim.curr.x) * 0.6 });
  run(sim, 0.25);
}

describe('the lysklubba, taken in the mist', () => {
  it('holds him while he holds it up, and he says what it is for once the mist has begun to close in', () => {
    const sim = new Sim(myren, {}, { checkpoint: 7 });
    run(sim, 0.3);
    walkTo(sim, 141.2);
    expect(sim.curr.word).toBe('takeLight');
    sim.step({ ...idle, act: true });
    expect(sim.flags.has('light')).toBe(true);
    run(sim, 0.1);
    expect(sim.sceneFrame?.id).toBe('lysklubba');
    expect(sim.held).toBe(true);
    // Not as he takes it: the mist takes three seconds to come in, and the words come once it is seen.
    const line = myren.scenes!.find((scene) => scene.id === 'lysklubba')!.lines![0]!;
    expect(line.at).toBeGreaterThanOrEqual(1);
    run(sim, 3);
    expect(sim.said).toContain('bog:light-mist');
    run(sim, 8);
    expect(sim.flags.has('scene:lysklubba')).toBe(true);
    expect(sim.held).toBe(false);
  });

  it('is not played again in a game taken up with the light already in his hand', () => {
    const sim = new Sim(myren, {}, { checkpoint: 7, flags: ['light'] });
    expect(sim.flags.has('scene:lysklubba')).toBe(true);
    run(sim, 1);
    expect(sim.held).toBe(false);
    expect(sim.said).not.toContain('bog:light-mist');
  });
});

describe('the lace the ghost lets down at Berget\'s cliff', () => {
  const lace = berget.climbs!.find((climb) => climb.heldBy)!;
  const hold = berget.ghost!.find((perch) => perch.until === lace.heldBy!.until)!;

  it('runs out from the ghost\'s hands in the lift, not when he presses Lyft', () => {
    const by = lace.heldBy!;
    const flags = new Set(['lift']);
    expect(letDown(lace, flags, null)).toBe(0);
    expect(letDown(lace, flags, { id: by.scene, seconds: by.at - 0.1 })).toBe(0);
    expect(letDown(lace, flags, { id: by.scene, seconds: by.at + by.seconds / 2 })).toBeCloseTo(0.5, 5);
    expect(letDown(lace, flags, { id: by.scene, seconds: by.at + by.seconds + 1 })).toBe(1);
    // Once the lift has been seen, the climb's own flag decides, as for any lace.
    expect(letDown(lace, new Set(['lift', `scene:${by.scene}`]), null)).toBeNull();
    // The lift ends with the ghost where it holds the lace, as the simulation has it wait.
    const ghost = berget.scenes!.find((scene) => scene.id === by.scene)!.stage!.actors!.ghost!;
    const last = [...ghost].reverse().find((key) => key.x !== undefined)!;
    expect(last.x).toBe(hold.at.x);
    expect([...ghost].reverse().find((key) => key.z !== undefined)!.z).toBe(hold.z);
  });

  it('holds it at the top while he climbs, and goes on to the pine once he has thanked it', () => {
    const sim = new Sim(berget, {}, { checkpoint: 3, flags: ['flight'] });
    run(sim, 0.3);
    walkTo(sim, 143.9);
    expect(sim.curr.word).toBe('lift');
    sim.step({ ...idle, act: true });
    run(sim, 6);
    expect(sim.flags.has('scene:berget:lift')).toBe(true);
    expect(sim.ghost).toMatchObject({ x: hold.at.x, y: hold.at.y });
    // Up the lace: it stays where it holds it, however near he comes.
    walkTo(sim, lace.x);
    for (let i = 0; i < 600 && sim.curr.mode !== 'climb'; i++) sim.step({ ...idle, y: 1, hop: i === 0, hopHeld: true });
    expect(sim.curr.mode).toBe('climb');
    for (let i = 0; i < 900 && sim.curr.mode === 'climb'; i++) sim.step({ ...idle, y: 1 });
    expect(sim.ghost).toMatchObject({ x: hold.at.x, y: hold.at.y });
    // At the top he thanks it, standing; then it lets go and hops on.
    for (let i = 0; i < 600 && sim.sceneFrame?.id !== 'berget:tack'; i++) sim.step({ ...idle, x: 0.6 });
    expect(sim.sceneFrame?.id).toBe('berget:tack');
    expect(sim.flags.has('berget:let-go')).toBe(false);
    run(sim, 10);
    expect(sim.said).toContain('mountain:thanks');
    expect(sim.flags.has('berget:let-go')).toBe(true);
    expect(sim.ghost!.perch).toBeGreaterThan(berget.ghost!.indexOf(hold));
  });

  it('lets go in a game taken up past the thanks', () => {
    const sim = new Sim(berget, {}, { checkpoint: 4, flags: ['flight', 'lift'] });
    run(sim, 0.2);
    expect(sim.flags.has('berget:let-go')).toBe(true);
    expect(sim.ghost!.x).toBeGreaterThan(hold.at.x);
  });
});
