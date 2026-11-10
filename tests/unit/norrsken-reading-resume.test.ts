import { describe, expect, it } from 'vitest';
import { norrsken } from '../../src/content/chapters/norrsken';
import { STEP } from '../../src/sim/constants';
import { SceneDirector, sceneBeats, type SceneDef } from '../../src/sim/scene';
import { Sim } from '../../src/sim/sim';
import type { PlayerState } from '../../src/sim/types';
import { run } from '../sim/drive';

const standing = { x: 26.6, y: 0, mode: 'free', grounded: true } as PlayerState;
const scene = norrsken.scenes!.find(value => value.id === 'aterfunna')!;
const tick = (director: SceneDirector, flags: Set<string>, said: string[], seconds: number, talking = false) => {
  for (let n = 0; n < Math.round(seconds / STEP); n++) director.tick(standing, flags, said, talking, true);
};

describe('the reunion resumes acknowledged reading', () => {
  it('keeps old Pappa receipts authoritative while still telling the new arrival and wellbeing exchange', () => {
    const flags = new Set(['taste', 'beat:first1', 'beat:first2']);
    const director = new SceneDirector([scene], standing, flags), said: string[] = [];
    tick(director, flags, said, STEP);
    expect(director.frame!.seconds).toBeLessThan(.02); // Family still runs in on the first visit.
    tick(director, flags, said, 6);
    expect(said).toEqual(['aterfunna:0', 'aterfunna:1', 'first3', 'first4']);
    expect(sceneBeats([scene]).slice(2, 6).map(beat => beat.id)).toEqual(['first1', 'first2', 'first3', 'first4']);
  });

  it('restores the taste mark from an earlier checkpoint and repeats only the unread origin after two resumptions', () => {
    const saved = ['placed:tragubbe', 'eyes', 'bag', 'shared', 'taste', 'beat:aterfunna:0', 'beat:aterfunna:1', 'beat:first1'];
    for (let visit = 0; visit < 2; visit++) {
      const sim = new Sim(norrsken, {}, { checkpoint: 1, flags: saved });
      expect(sim.curr.x).toBe(26.6);
      run(sim, .8);
      expect(sim.said[0]).toBe('first2');
      expect(sim.said).not.toContain('nrFoundYou');
      expect(sim.flags.has('lower')).toBe(false);
      expect(sim.flags.has('nr:rope-ready')).toBe(false);
      expect(sim.said).not.toContain('first1');
      expect(sim.flags.has('scene:aterfunna')).toBe(false);
      expect(sim.flags.has('home')).toBe(false);
    }
  });

  it('reconstructs past cues but plays the remaining actions, unread words and tail before completion', () => {
    const scored: SceneDef = { id: 'reading', on: 'start', seconds: 4, hold: true, resumeReading: true,
      lines: [{ at: .4, who: 'mamma', line: 'notYet', id: 'oldFirst' }, { at: 1.5, who: 'pappa', line: 'newGhost' }],
      cues: [{ at: .1, flag: 'before' }, { at: 1.1, flag: 'between' }, { at: 3.9, flag: 'tail' }] };
    const flags = new Set(['start', 'beat:oldFirst']), said: string[] = [];
    const director = new SceneDirector([scored], standing, flags);
    tick(director, flags, said, STEP);
    expect(director.frame!.seconds).toBeCloseTo(.4 + STEP);
    expect(flags.has('before')).toBe(true);
    expect(flags.has('between')).toBe(false);
    tick(director, flags, said, 1.1);
    expect(said).toEqual(['reading:1']);
    expect(flags.has('between')).toBe(true);
    tick(director, flags, said, 10, true);
    expect(flags.has('tail')).toBe(false);
    expect(flags.has('scene:reading')).toBe(false);
    // On save/restart main removes the currently unread receipt; the acknowledged first line survives.
    flags.delete('beat:reading:1'); director.cancel();
    tick(director, flags, said, 1.2);
    expect(said).toEqual(['reading:1', 'reading:1']);
    // Both lines have now been acknowledged: resume their final tableau, then play its remaining tail.
    director.cancel(); tick(director, flags, said, STEP);
    expect(director.frame!.seconds).toBeCloseTo(1.5 + STEP);
    expect(flags.has('tail')).toBe(false);
    tick(director, flags, said, 2.5);
    expect(flags.has('tail')).toBe(true);
    expect(flags.has('scene:reading')).toBe(true);
    expect(said).toEqual(['reading:1', 'reading:1']);
  });

  it('lets an explicit opening replay its chosen picture and lines despite resumable receipts', () => {
    const flags = new Set(['taste', 'beat:aterfunna:0', 'beat:aterfunna:1', 'beat:first1']);
    const director = new SceneDirector([scene], standing, flags), said: string[] = [];
    director.openAt('aterfunna', 2.8); tick(director, flags, said, .3);
    expect(said).toEqual(['aterfunna:0']);
    expect(flags.has('beat:first1')).toBe(false);
  });
});
