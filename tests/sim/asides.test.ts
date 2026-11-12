import { describe, expect, it } from 'vitest';
import { ASIDE_NEAR, ASIDE_REACH, ASIDE_ROOM, REPLY_PATIENCE, RUN_SPEED, STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { Beat, ChapterData } from '../../src/sim/types';
import { idle, run, runPast } from './drive';

/**
 * Whose turn it is to speak (docs/dialogue.md; Olov, 12 November 2026: "vissa kommentarer kan komma lite sent nu när vi
 * alltid ger plats för en kommentar så den inte avbryts"). Nothing said is ever cut, so what waits behind it has to be
 * chosen: an answer follows what it answers, the story's lines come before passing remarks, and a remark (`aside`) is
 * said at its moment or not at all. It is let go once he has left its moment behind, when a staged moment has the
 * floor, or when it answers a line and cannot come straight after it; and it is not begun just before a story line.
 */
function lane(beats: Beat[], more: Partial<ChapterData> = {}): ChapterData {
  return {
    id: 'lane', spawn: { x: 0, y: 0.01 }, goalX: 1000, candy: [],
    ground: [{ x: -10, y: 8 }, { x: -10, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 8 }],
    beats, ...more,
  };
}
const elof = (id: string, rest: Partial<Beat>): Beat => ({ id, who: 'elof', line: 'ssDark', ...rest });

/** A page that listens: he runs right while it speaks or not, until `x`. */
function walk(sim: Sim, x: number, talking: boolean): void {
  for (let i = 0; i < 60 / STEP && sim.curr.x < x; i++) sim.step({ ...idle, x: 1, talking });
}
/** The page has read every line said so far, and it is quiet for a step. */
function quiet(sim: Sim, x = 0): void {
  for (const id of sim.said) sim.acknowledge(id);
  sim.step({ ...idle, x, talking: false });
}

describe('passing remarks, said at their moment or not at all', () => {
  it('says a remark as he passes its place, when nobody is speaking', () => {
    const sim = new Sim(lane([elof('pot', { at: 5, aside: true })]));
    walk(sim, 5.2, false);
    expect(sim.said).toEqual(['pot']);
  });

  it('lets a remark wait a little, and lets it go once he has left its moment behind: it is never said late', () => {
    const sim = new Sim(lane([elof('pot', { at: 5, aside: true })]));
    walk(sim, 5 + ASIDE_REACH - 0.5, true);
    expect(sim.waits.has('pot')).toBe(true);
    // It waits, and holds nothing up: the page's last card is not kept waiting for a remark.
    expect(sim.unsaid).toBe(false);
    // Still in reach: quiet now, it is said.
    const near = new Sim(lane([elof('pot', { at: 5, aside: true })]));
    walk(near, 5 + ASIDE_REACH - 0.5, true);
    quiet(near, 1);
    expect(near.said).toEqual(['pot']);
    // Out of reach: gone, with no flag, however quiet it gets, and not if he walks back to the place either.
    walk(sim, 5 + ASIDE_REACH + 0.5, true);
    expect(sim.waits.has('pot')).toBe(false);
    expect(sim.unsaid).toBe(false);
    quiet(sim);
    run(sim, 1, { talking: false });
    expect(sim.said).toEqual([]);
    expect(sim.flags.has('beat:pot')).toBe(false);
    for (let i = 0; i < 20 / STEP && sim.curr.x > 4; i++) sim.step({ ...idle, x: -1, talking: false });
    runPast(sim, 6);
    expect(sim.said).toEqual([]);
  });

  it('gives a remark its own reach where the thing is in the picture for longer', () => {
    const sim = new Sim(lane([elof('lake', { at: 5, aside: 14 })]));
    walk(sim, 5 + ASIDE_REACH + 4, true);
    expect(sim.waits.has('lake')).toBe(true);
    quiet(sim, 1);
    expect(sim.said).toEqual(['lake']);
  });

  it('never drops the story\'s own line, however long it waits and however far he runs', () => {
    const sim = new Sim(lane([elof('story', { at: 5 })]));
    walk(sim, 60, true);
    expect(sim.waits.has('story')).toBe(true);
    quiet(sim);
    expect(sim.said).toEqual(['story']);
  });

  it('nobody listening (the robot): every remark is said as its moment comes, as every line is', () => {
    const sim = new Sim(lane([elof('first', { at: 5, aside: true }), elof('klonk', { on: 'beat:first', aside: true }), elof('story', { at: 6 })]));
    runPast(sim, 7);
    expect(sim.said).toEqual(['first', 'klonk', 'story']);
  });
});

describe('whose turn it is when it is quiet', () => {
  it('the story\'s line before a remark that has waited longer', () => {
    const sim = new Sim(lane([elof('remark', { at: 5, aside: true }), elof('story', { at: 7 })]));
    walk(sim, 7.5, true);
    expect([...sim.waits.keys()]).toEqual(['remark', 'story']);
    quiet(sim);
    expect(sim.said).toEqual(['story']);
  });

  it('an answer straight after its line, before a story line that has waited longer', () => {
    const beats = [elof('opening', { at: 1 }), elof('ask', { at: 3 }), elof('other', { at: 4 }), { ...elof('answer', { on: 'beat:ask' }), who: 'spoket' as const }];
    const sim = new Sim(lane(beats));
    walk(sim, 1.2, false);
    expect(sim.said).toEqual(['opening']);
    walk(sim, 4.5, true);
    expect([...sim.waits.keys()]).toEqual(['ask', 'other']);
    quiet(sim);
    expect(sim.said).toEqual(['opening', 'ask']);
    // `other` has waited since before the question was asked, and the answer still comes first.
    run(sim, 0.5, { talking: true });
    quiet(sim);
    expect(sim.said).toEqual(['opening', 'ask', 'answer']);
    quiet(sim);
    expect(sim.said).toEqual(['opening', 'ask', 'answer', 'other']);
  });

  it('a passing answer (Klonk\'s klonk) comes straight after its line, or not at all', () => {
    const beats = [elof('ask', { at: 3, aside: true }), { ...elof('klonk', { on: 'beat:ask', aside: true }), who: 'spoket' as const }, elof('story', { on: 'helped' })];
    // Nothing else to say: the answer follows.
    const alone = new Sim(lane(beats.slice(0, 2)));
    walk(alone, 3.2, false);
    quiet(alone);
    expect(alone.said).toEqual(['ask', 'klonk']);
    // Something happens while the question is read, and the story has a line for it. That line takes the floor after
    // the question: the answer does not come trailing after it.
    const sim = new Sim(lane(beats));
    walk(sim, 3.2, false);
    expect(sim.said).toEqual(['ask']);
    sim.flags.add('helped');
    run(sim, 0.4, { talking: true });
    quiet(sim);
    expect(sim.said).toEqual(['ask', 'story']);
    run(sim, REPLY_PATIENCE + 0.2, { talking: true });
    quiet(sim);
    run(sim, 0.5, { talking: false });
    expect(sim.said).toEqual(['ask', 'story']);
    expect(sim.flags.has('beat:klonk')).toBe(false);
  });
});

describe('a remark gives way to the story', () => {
  it('is not begun just before a story line he is running towards, and is begun when he stands there', () => {
    const ahead = RUN_SPEED * ASIDE_ROOM;
    const beats = [elof('remark', { at: 5, aside: true }), elof('story', { at: 5 + ahead - 1 })];
    const running = new Sim(lane(beats));
    walk(running, 5.3, false);
    expect(running.said).toEqual([]);
    expect(running.waits.has('remark')).toBe(true);
    // It waits, and its moment passes: the story line is said on time, with nothing in its way.
    walk(running, 5 + ahead - 0.8, false);
    expect(running.said).toEqual(['story']);
    // Standing still at the same place, there is time for it.
    const standing = new Sim(lane(beats, { spawn: { x: 5.2, y: 0.01 } }));
    run(standing, 0.5, { talking: false });
    expect(standing.said).toEqual(['remark']);
    // But not a step from the story's line, standing or not.
    const close = new Sim(lane([elof('remark', { at: 5, aside: true }), elof('story', { at: 5 + ASIDE_NEAR - 0.3 })], { spawn: { x: 5.05, y: 0.01 } }));
    run(close, 0.5, { talking: false });
    expect(close.said).toEqual([]);
  });

  it('with room ahead, it is begun on the run', () => {
    const sim = new Sim(lane([elof('remark', { at: 5, aside: true }), elof('story', { at: 5 + RUN_SPEED * ASIDE_ROOM + 2 })]));
    walk(sim, 5.3, false);
    expect(sim.said).toEqual(['remark']);
  });

  it('is let go when a staged moment takes the floor, which waits for the story\'s lines only', () => {
    const scenes = [{ id: 'held', at: 20, seconds: 1, hold: true }];
    // A remark is waiting as he comes to the scene: the scene does not wait for it.
    const sim = new Sim(lane([elof('remark', { at: 19, aside: true })], { scenes }));
    walk(sim, 18, false);
    walk(sim, 19.5, true);
    expect(sim.waits.has('remark')).toBe(true);
    walk(sim, 20.1, true);
    quiet(sim);
    run(sim, 0.1, { talking: false });
    expect(sim.sceneFrame?.id).toBe('held');
    expect(sim.said).toEqual([]);
    run(sim, 2, { x: 1, talking: false });
    expect(sim.said).toEqual([]);
    // A story line that waits is said first, and the scene after it.
    const story = new Sim(lane([elof('line', { at: 19 })], { scenes }));
    walk(story, 18, false);
    walk(story, 20.1, true);
    quiet(story);
    expect(story.said).toEqual(['line']);
    expect(story.sceneFrame).toBeNull();
    expect(story.held).toBe(true);
    quiet(story);
    expect(story.sceneFrame?.id).toBe('held');
  });

  it('a game taken up later does not say a remark whose moment had come before', () => {
    const beats = [elof('ask', { at: 3 }), { ...elof('klonk', { on: 'beat:ask', aside: true }), who: 'spoket' as const }, elof('seen', { on: 'lookout', aside: true }), elof('thanks', { on: 'helped' })];
    const chapter = lane(beats, { checkpoints: [{ x: 10, y: 0 }] });
    const sim = new Sim(chapter, {}, { checkpoint: 0, flags: ['lookout', 'helped'] });
    run(sim, 0.5, { talking: false });
    // The story's own line is still told; the remarks belonged to their moments.
    expect(sim.said).toEqual(['thanks']);
    expect(sim.flags.has('beat:ask')).toBe(true);
  });
});
