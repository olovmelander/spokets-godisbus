import { describe, expect, it } from 'vitest';
import { Tutorial } from '../../src/app/tutorial';
import { Sim } from '../../src/sim/sim';
import { prolog } from '../../src/content/chapters/ends';
import type { PlayerState } from '../../src/sim/types';
const base = new Sim(prolog).curr;
const held = { x: 0, y: 0, hopHeld: false };
const edges = { hop: false, act: false, helper: false };
const at = (x: number, more: Partial<PlayerState> = {}): PlayerState => ({ ...base, x, y: 0, vx: 0, vy: 0, grounded: true, mode: 'free', ...more });
const flags = new Set(['blink']);
describe('conditional, wordless prologue controls', () => {
  it('waits four idle seconds, then goes away as soon as movement is discovered', () => {
    const tutor = new Tutorial('prolog');
    expect(tutor.update(3.9, at(1), new Set(), held, edges)).toBeNull();
    expect(tutor.update(0.11, at(1), new Set(), held, edges)).toBe('move');
    expect(tutor.update(0.1, at(1), flags, { ...held, x: 1 }, edges)).toBeNull();
    expect(tutor.update(10, at(1), flags, held, edges)).toBeNull();
  });
  it('shows only Hoppa after three seconds at the sill, and never after a discovered jump', () => {
    const tutor = new Tutorial('prolog');
    expect(tutor.update(2.9, at(29.5), flags, held, edges)).toBeNull();
    expect(tutor.update(0.11, at(29.5), flags, held, edges)).toBe('hop');
    expect(tutor.update(0.1, at(29.5), flags, held, { ...edges, hop: true })).toBeNull();
    expect(tutor.update(10, at(29.5), flags, held, edges)).toBeNull();
  });
  it('shows use beside the brush Pappa holds out, and no more once the eyes are painted', () => {
    const tutor = new Tutorial('prolog');
    const morning = new Set(['scene:morgon']);
    tutor.update(0, at(3.7, { verb: 'give' }), morning, { ...held, x: 1 }, edges);
    expect(tutor.update(2.9, at(3.7, { verb: 'give' }), morning, held, edges)).toBeNull();
    expect(tutor.update(0.11, at(3.7, { verb: 'give' }), morning, held, edges)).toBe('act');
    expect(tutor.update(10, at(3.7), new Set(['scene:morgon', 'eye', 'paint']), held, edges)).toBeNull();
  });
  it('shows use beside Pappa\'s open hand, and disappears when he steps onto it', () => {
    const tutor = new Tutorial('prolog');
    const small = new Set(['blink', 'star', 'scene:poff', 'scene:familj', 'paint']);
    expect(tutor.update(10, at(41, { y: -0.8 }), small, held, edges)).not.toBe('act');
    expect(tutor.update(2.9, at(41, { y: -0.8, verb: 'take' }), small, held, edges)).toBeNull();
    expect(tutor.update(0.11, at(41, { y: -0.8, verb: 'take' }), small, held, edges)).toBe('act');
    expect(tutor.update(0.1, at(41, { y: -0.8, verb: 'take' }), new Set([...small, 'hand']), held, edges)).toBeNull();
  });
  it('teaches nothing while a scene holds him', () => {
    const tutor = new Tutorial('prolog');
    expect(tutor.update(20, at(2), new Set(), held, edges, true)).toBeNull();
    expect(tutor.update(3.9, at(2), new Set(), held, edges)).toBeNull();
    expect(tutor.update(0.11, at(2), new Set(), held, edges)).toBe('move');
  });
  it('resets the wait when leaving a place and never teaches other chapters or carried states', () => {
    const tutor = new Tutorial('prolog');
    tutor.update(2.9, at(29.5), flags, held, edges);
    tutor.update(0.2, at(28), flags, held, edges);
    expect(tutor.update(0.2, at(29.5), flags, held, edges)).toBeNull();
    expect(tutor.update(20, at(29.5, { mode: 'bubble' }), flags, held, edges)).toBeNull();
    expect(new Tutorial('garden').update(20, at(1), flags, held, edges)).toBeNull();
  });
});
