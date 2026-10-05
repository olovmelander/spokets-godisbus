import { describe, expect, it } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import { sv } from '../../src/content/sv';
import { STEP } from '../../src/sim/constants';
import { QUIET_WAIT, SceneDirector, sceneBeats, type SceneDef } from '../../src/sim/scene';
import type { PlayerState } from '../../src/sim/types';

/** Just what the director reads of him: where he is, and whether he stands on his own feet. */
const standing = (x: number, more: Partial<PlayerState> = {}) => ({ x, y: 0, mode: 'free', grounded: true, ...more }) as PlayerState;

function run(director: SceneDirector, seconds: number, player: PlayerState, flags: Set<string>, said: string[], talking = false) {
  for (let i = 0; i < Math.round(seconds / STEP); i++) director.tick(player, flags, said, talking);
}

const morning: SceneDef = {
  id: 'morning', seconds: 2, hold: true,
  cues: [{ at: 0.5, flag: 'woke' }, { at: 1.5, flag: 'grab' }],
  lines: [{ at: 0.2, who: 'mamma', line: 'notYet' }, { at: 1.0, who: 'pappa', line: 'newGhost' }],
};
const later: SceneDef = { id: 'later', on: 'grab', seconds: 1, hold: true };

describe('the story\'s scenes', () => {
  it('plays a scene through: its cues and lines at their moments, and its flag at the end', () => {
    const flags = new Set<string>();
    const said: string[] = [];
    const director = new SceneDirector([morning], { x: 0, y: 0 }, flags);
    run(director, 0.6, standing(0), flags, said);
    expect(director.frame?.id).toBe('morning');
    expect(director.holding).toBe(true);
    expect(flags.has('woke')).toBe(true);
    expect(flags.has('grab')).toBe(false);
    expect(said).toEqual(['morning:0']);
    run(director, 1.5, standing(0), flags, said);
    expect(said).toEqual(['morning:0', 'morning:1']);
    expect(flags.has('scene:morning')).toBe(true);
    expect(director.frame).toBeNull();
    expect(director.holding).toBe(false);
  });

  it('tells each line as a beat of its own, said once', () => {
    expect(sceneBeats([morning]).map((beat) => beat.id)).toEqual(['morning:0', 'morning:1']);
    const flags = new Set<string>();
    const said: string[] = [];
    const director = new SceneDirector([morning], { x: 0, y: 0 }, flags);
    run(director, 3, standing(0), flags, said);
    run(director, 3, standing(0), flags, said);
    expect(said).toEqual(['morning:0', 'morning:1']);
  });

  it('keeps the story\'s order: a scene due later waits for the one before it', () => {
    const flags = new Set<string>(['grab']);
    const said: string[] = [];
    const director = new SceneDirector([morning, later], { x: 0, y: 0 }, flags);
    run(director, 0.1, standing(0), flags, said);
    expect(director.frame?.id).toBe('morning');
    run(director, 2, standing(0), flags, said);
    expect(director.frame?.id).toBe('later');
  });

  it('holds a scene back until he stands on his own feet', () => {
    const flags = new Set<string>();
    const director = new SceneDirector([morning], { x: 0, y: 0 }, flags);
    run(director, 1, standing(0, { grounded: false }), flags, []);
    expect(director.frame).toBeNull();
    run(director, 1, standing(0, { mode: 'climb' }), flags, []);
    expect(director.frame).toBeNull();
    director.tick(standing(0), flags, []);
    expect(director.frame?.id).toBe('morning');
  });

  it('waits for him at the place it is staged, and never plays once the story has gone past it', () => {
    const deck: SceneDef = { id: 'deck', on: 'star', from: 39.5, until: 'done', seconds: 1 };
    const flags = new Set<string>(['star']);
    const director = new SceneDirector([deck], { x: 0, y: 0 }, flags);
    run(director, 0.5, standing(30), flags, []);
    expect(director.frame).toBeNull();
    run(director, 0.1, standing(40), flags, []);
    expect(director.frame?.id).toBe('deck');

    const past = new Set<string>(['star', 'done']);
    const after = new SceneDirector([deck], { x: 0, y: 0 }, past);
    run(after, 1, standing(40), past, []);
    expect(after.frame).toBeNull();
  });

  it('counts a scene staged at a place he starts beyond as seen', () => {
    const edge: SceneDef = { id: 'edge', at: 20, seconds: 1 };
    const flags = new Set<string>();
    new SceneDirector([edge], { x: 26, y: 0 }, flags);
    expect(flags.has('scene:edge')).toBe(true);
  });

  it('plays an interrupted scene again from its start, its lines too, and keeps the flags it set', () => {
    const flags = new Set<string>();
    const said: string[] = [];
    const director = new SceneDirector([morning], { x: 0, y: 0 }, flags);
    run(director, 0.7, standing(0), flags, said);
    director.cancel();
    expect(director.frame).toBeNull();
    expect(flags.has('woke')).toBe(true);
    expect(flags.has('scene:morning')).toBe(false);
    director.tick(standing(0), flags, said);
    expect(director.frame?.id).toBe('morning');
    expect(director.frame!.seconds).toBeLessThan(0.05);
    run(director, 0.3, standing(0), flags, said);
    expect(said).toEqual(['morning:0', 'morning:0']);
  });

  it('lets what is being said finish before a scene that waits for quiet, and he listens meanwhile', () => {
    const titel: SceneDef = { id: 'titel', at: 51.4, seconds: 1, hold: true, quiet: true };
    const flags = new Set<string>();
    const director = new SceneDirector([titel], { x: 0, y: 0 }, flags);
    run(director, 2, standing(51.5), flags, [], true);
    expect(director.frame).toBeNull();
    expect(director.holding).toBe(true);
    director.tick(standing(51.5), flags, [], false);
    expect(director.frame?.id).toBe('titel');
  });

  it('waits for quiet only so long', () => {
    const titel: SceneDef = { id: 'titel', at: 51.4, seconds: 1, hold: true, quiet: true };
    const flags = new Set<string>();
    const director = new SceneDirector([titel], { x: 0, y: 0 }, flags);
    run(director, QUIET_WAIT + 0.1, standing(51.5), flags, [], true);
    expect(director.frame?.id).toBe('titel');
  });

  it('keeps every held scene short, its moments inside it, and its lines among the game\'s words', () => {
    const lines: Record<string, string> = sv.lines;
    const words: Record<string, string> = sv.scene;
    for (const chapter of Object.values(COURSES)) {
      const ids = new Set<string>();
      for (const scene of chapter.scenes ?? []) {
        expect(ids.has(scene.id), `${chapter.id}: ${scene.id} twice`).toBe(false);
        ids.add(scene.id);
        // He watches a held scene with his hands still: at most 11 seconds of it at a time.
        if (scene.hold) expect(scene.seconds, `${chapter.id}: ${scene.id}`).toBeLessThanOrEqual(11);
        for (const moment of [...(scene.cues ?? []), ...(scene.lines ?? [])]) expect(moment.at).toBeLessThanOrEqual(scene.seconds);
        for (const line of scene.lines ?? []) expect(lines[line.line], `${chapter.id}: ${line.line}`).toBeTruthy();
        for (const word of scene.stage?.words ?? []) expect(words[word.text], `${chapter.id}: ${word.text}`).toBeTruthy();
      }
    }
  });

  it('does not hold him for a scene that is not held', () => {
    const walk: SceneDef = { id: 'walk', on: 'go', seconds: 1 };
    const flags = new Set<string>(['go']);
    const director = new SceneDirector([walk], { x: 0, y: 0 }, flags);
    run(director, 0.2, standing(0, { grounded: false }), flags, []);
    expect(director.frame?.id).toBe('walk');
    expect(director.holding).toBe(false);
  });
});
