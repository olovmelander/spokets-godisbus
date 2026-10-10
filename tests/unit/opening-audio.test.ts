import { describe, expect, it } from 'vitest';
import { openingCues, openingQuiet } from '../../src/audio/opening';
import type { SceneDef } from '../../src/sim/scene';

const scenes: SceneDef[] = [{
  id: 'star', seconds: 10, sounds: [
    { at: 0, sound: 'blink' }, { at: 2, sound: 'taste' }, { at: 4, sound: 'poff' }, { at: 6, sound: 'breath' },
  ], soundQuiet: [2, 7],
}, { id: 'bird', seconds: 8, sounds: [{ at: 1.6, sound: 'bird' }] }];
const frame = (seconds: number, id = 'star') => ({ id, seconds });
const sounds = (from: number, to: number) => openingCues(frame(from), frame(to), scenes).map(cue => cue.kind === 'story' && cue.sound);

describe('the opening sound follows the authored scene clock', () => {
  it('crosses a marker exactly once, including a frame that crosses several moments', () => {
    expect(sounds(1.9, 2)).toEqual(['taste']);
    expect(sounds(2, 2.01)).toEqual([]);
    expect(sounds(2, 6.5)).toEqual(['poff', 'breath']);
  });

  it('stays silent for held reading, pause and frames with no scene', () => {
    expect(sounds(2, 2)).toEqual([]);
    expect(sounds(6, 6)).toEqual([]);
    expect(openingCues(frame(6), null, scenes)).toEqual([]);
    expect(openingCues(null, null, scenes)).toEqual([]);
  });

  it('takes up a late-entered scene without playing the sounds already past', () => {
    expect(openingCues(null, frame(6.5), scenes)).toEqual([]);
    expect(openingCues(frame(8, 'bird'), frame(6.5), scenes)).toEqual([]);
    expect(openingCues(frame(8), frame(6.5), scenes)).toEqual([]);
    // A sound happening now is still heard once, even if the first frame begins a little after it.
    expect(openingCues(null, frame(6.005), scenes)).toEqual([{ kind: 'story', sound: 'breath' }]);
  });

  it('restarts from the beginning after a checkpoint, then crosses new markers normally', () => {
    expect(openingCues(frame(8), frame(0.01), scenes)).toEqual([{ kind: 'story', sound: 'blink' }]);
    expect(sounds(0.01, 1)).toEqual([]);
    expect(sounds(1, 2.01)).toEqual(['taste']);
    expect(openingCues(frame(1, 'bird'), frame(1.61, 'bird'), scenes)).toEqual([{ kind: 'story', sound: 'bird' }]);
  });

  it('ducks only the authored interval, including frozen frames, and resets outside that scene', () => {
    for (const seconds of [2, 4, 6.99]) expect(openingQuiet(frame(seconds), scenes)).toBe(true);
    for (const seconds of [0, 1.99, 7, 8]) expect(openingQuiet(frame(seconds), scenes)).toBe(false);
    expect(openingQuiet(frame(4, 'bird'), scenes)).toBe(false);
    expect(openingQuiet(null, scenes)).toBe(false);
  });
});
