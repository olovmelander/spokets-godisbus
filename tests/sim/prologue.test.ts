import { describe, expect, it } from 'vitest';
import { prolog } from '../../src/content/chapters/ends';
import { STEP } from '../../src/sim/constants';
import { ELOF_HALF_WIDTH } from '../../src/sim/constants';
import { MAMMA_DOWN, MAMMA_SEEN, MAMMA_TIME, PAPPA_TIME, droppedBag, prologuePose } from '../../src/sim/prologue';
import { sceneBeats } from '../../src/sim/scene';
import { Sim } from '../../src/sim/sim';
import type { StepInput } from '../../src/sim/types';

const idle: StepInput = { x: 0, y: 0, hop: false, hopHeld: false, act: false };
const go: StepInput = { ...idle, x: 1 };
function tick(sim: Sim, seconds: number, input = idle) {
  for (let i = 0; i < Math.ceil(seconds / STEP); i++) sim.step(input);
}
/** Everything up to Elof stepping onto Pappa's hand, told: the next is the lift and Moa's drawing. */
const toHand = ['scene:morgon', 'eye', 'paint', 'woke', 'grab', 'blink', 'scene:vaknar', 'mamma:noticed', 'mamma:passed', 'bag:torn', 'star', 'scene:poff', 'scene:familj'];
const told = [...toHand, 'hand', 'scene:handen'];
const layout = prolog.prologue!;

describe('the star is a choice', () => {
  const beforeStar = ['scene:morgon', 'eye', 'paint', 'woke', 'grab', 'blink', 'scene:vaknar', 'mamma:noticed', 'mamma:passed', 'bag:torn', 'scene:stjarnan'];

  it('never consumes the star when he walks through it in either direction', () => {
    const sim = new Sim({ ...prolog, spawn: { x: 40.4, y: -0.79 } }, {}, { flags: beforeStar });
    tick(sim, 1.1, go);
    expect(sim.curr.x).toBeGreaterThan(42.8);
    expect(sim.flags.has('star')).toBe(false);
    tick(sim, 1.7, { ...idle, x: -1 });
    expect(sim.curr.x).toBeLessThan(40.5);
    expect(sim.flags.has('star')).toBe(false);
  });

  it('replays an interrupted taste on the deck without asking him to consume the star twice', () => {
    const sim = new Sim(prolog, {}, { checkpoint: 1, flags: [...beforeStar, 'star'] });
    expect(sim.curr.x).toBeCloseTo(40.5);
    expect(sim.checkpoint).toBe(1);
    for (let i = 0; i < 30 && !sim.sceneFrame; i++) sim.step(idle);
    expect(sim.sceneFrame?.id).toBe('poff');
    expect(sim.sceneFrame!.seconds).toBeLessThan(0.05);
    tick(sim, 10.3);
    expect(sim.flags.has('scene:poff')).toBe(true);
  });

  it('replays a taste inside its picture after he has first saved beyond the uneaten star', () => {
    const sim = new Sim(prolog, {}, { checkpoint: 2, flags: beforeStar });
    expect(sim.curr.x).toBeCloseTo(45.5);
    tick(sim, 0.2);
    for (let i = 0; i < 360 && sim.curr.word !== 'tasteStar'; i++) sim.step({ ...idle, x: -1 });
    expect(sim.curr.word).toBe('tasteStar');
    sim.step({ ...idle, act: true });
    tick(sim, 0.3);
    expect(sim.sceneFrame?.id).toBe('poff');
    expect(sim.checkpoint).toBe(2);

    const restored = new Sim(prolog, {}, { checkpoint: sim.checkpoint, flags: [...sim.flags] });
    expect(restored.curr.x).toBeCloseTo(40.5);
    tick(restored, 0.2);
    expect(restored.sceneFrame?.id).toBe('poff');
    expect(restored.flags.has('star')).toBe(true);
    // Jag har fastnat uses the same authored recovery mark, not the later candy outside this shot.
    sim.toCheckpoint();
    tick(sim, 4);
    expect(sim.sceneFrame?.id).toBe('poff');
    expect(sim.curr.x).toBeCloseTo(40.5, 1);
  });

  it('uses the normal checkpoint again after the deck scenes are finished', () => {
    const sim = new Sim(prolog, {}, { checkpoint: 2, flags: [...beforeStar, 'star', 'scene:poff', 'scene:familj', 'hand', 'scene:handen'] });
    expect(sim.curr.x).toBeCloseTo(45.5);
  });

  it('recognises completed shrinking in an older save that only remembers the later railing joke', () => {
    const sim = new Sim(prolog, {}, { checkpoint: 2, flags: ['eye', 'paint', 'blink', 'star', 'pappa:noticed'] });
    expect(sim.curr.x).toBeCloseTo(45.5);
    expect(sim.flags.has('scene:poff')).toBe(true);
    expect(sim.flags.has('scene:familj')).toBe(true);
    expect(sim.flags.has('scene:handen')).toBe(true);
    expect(sim.flags.has(prolog.size!.until!)).toBe(true);
  });
});

describe('the shared kitchen keeps opening saves playable', () => {
  it('retains the awakening dialogue receipts when the window visit gains a new observation', () => {
    const scene = prolog.scenes!.find(scene => scene.id === 'vaknar')!;
    const receipts = new Map(sceneBeats([scene]).map(beat => [beat.line, beat.id]));
    expect(receipts.get('jayWindow')).toBe('vaknar:0');
    expect(receipts.get('eyesAlive')).toBe('vaknar:1');
    expect(receipts.get('bagGlitters')).toBe('vaknar:2');
    expect(receipts.get('stolenBag')).toBe('vaknar:3');
  });

  it('keeps all saved candy indices in the forward trail after the relocated hinge', () => {
    const collected = [0, 5, 10, 11, 16];
    const sim = new Sim(prolog, {}, { checkpoint: 1, flags: ['eye', 'paint', 'blink'], collected });
    expect(sim.collected).toHaveLength(17);
    expect(sim.collected.flatMap((taken, index) => taken ? [index] : [])).toEqual(collected);
    expect(prolog.candy.every(candy => candy.x > layout.doorway.x)).toBe(true);
    expect(prolog.candy.slice(11).map(candy => candy.x)).toEqual([30.6, 32.4, 34.4, 36.4, 38.6, 39.8]);
  });

  it('lets an old kitchen save finish its second eye and resumes the awakening beside the carving', () => {
    const flags = ['scene:morgon', 'eye'];
    const painting = new Sim(prolog, {}, { checkpoint: 0, flags });
    for (let i = 0; i < 240 && painting.curr.word !== 'paintGhost'; i++) painting.step(go);
    expect(painting.curr.word).toBe('paintGhost');
    painting.step({ ...idle, act: true });
    expect(painting.story).toEqual({ kind: 'paint', spot: 'paint' });

    const waking = new Sim(prolog, {}, { checkpoint: 0, flags: [...flags, 'paint', 'woke'] });
    expect(waking.curr.x).toBeCloseTo(prolog.spots!.find(spot => spot.id === 'paint')!.at.x);
    tick(waking, .1);
    expect(waking.sceneFrame?.id).toBe('vaknar');
    expect(waking.sceneFrame!.seconds).toBeLessThan(.2);
  });
});

describe('the prologue freeze jokes', () => {
  it('keeps the ghost wooden while the family walks back from the window', () => {
    const scene = prolog.scenes!.find(scene => scene.id === 'prologue:mamma')!;
    const arrivals = Object.values(scene.stage!.actors!).flatMap(keys => keys!
      .filter(key => key.follow === undefined && (key.x !== undefined || key.z !== undefined))
      .map(key => key.at + (key.move ?? 0)));
    const lastArrival = Math.max(...arrivals);
    expect(scene.seconds).toBe(MAMMA_TIME);
    expect(lastArrival).toBeLessThan(MAMMA_TIME);
    const ghost = { x: layout.doorway.x - 1, y: 0.8 };
    // Moving the family farther away must not leave the ghost standing up halfway through their return.
    for (let seconds = MAMMA_DOWN; seconds < lastArrival - 0.01; seconds += 0.1) {
      const pose = prologuePose(layout, { kind: 'mamma', seconds, ghost });
      expect(pose.tilt, `wooden during return at ${seconds}`).toBeCloseTo(-Math.PI / 2);
      expect(pose.y).toBeCloseTo(layout.doorway.y + 0.29);
      expect(pose.x).toBe(ghost.x);
    }
    const onward = prologuePose(layout, { kind: 'mamma', seconds: MAMMA_TIME, ghost });
    expect(onward.tilt).toBeCloseTo(0);
    expect(onward.y).toBeCloseTo(ghost.y);
  });

  it('freezes and topples the hopping ghost before the hinge tears the bag', () => {
    const sim = new Sim({ ...prolog, spawn: { x: prolog.spawn.x + 2.9, y: 0.01 } }, {}, { flags: ['scene:morgon', 'eye', 'paint', 'woke', 'grab', 'blink', 'scene:vaknar'] });
    for (let i = 0; i < 240 && !sim.prologue!.frame; i++) sim.step(go);
    expect(sim.prologue!.frame?.kind).toBe('mamma');
    // Mamma has not seen it yet: it has still to fall.
    expect(sim.flags.has('mamma:noticed')).toBe(false);
    expect(sim.flags.has('bag:torn')).toBe(false);
    tick(sim, MAMMA_DOWN + 0.05, { ...go, hop: true, hopHeld: true, act: true });
    const frame = sim.prologue!.frame!;
    expect(prologuePose(layout, frame).tilt).toBeCloseTo(-Math.PI / 2);
    const position = sim.ghost!.x;
    tick(sim, 0.6, go);
    expect(sim.ghost!.x).toBe(position);
    expect(sim.candyCount).toBe(0);
    tick(sim, MAMMA_TIME, go);
    expect(sim.flags.has('mamma:passed')).toBe(true);
    tick(sim, 1.5, go);
    expect(sim.flags.has('bag:torn')).toBe(true);
    expect(sim.candyCount).toBeGreaterThan(0);
  });

  it('lays the ghost on the floor, and its bag apart from it, before Mamma says a word', () => {
    // Where he painted the eyes: the ghost hops off the table as the waking ends.
    const sim = new Sim({ ...prolog, spawn: { x: prolog.spots!.find((spot) => spot.id === 'paint')!.at.x, y: 0.01 } }, {},
      { flags: ['scene:morgon', 'eye', 'paint', 'woke', 'grab', 'blink', 'scene:vaknar'] });
    for (let i = 0; i < 600 && !sim.said.includes('dropped'); i++) sim.step(idle);
    expect(sim.said).toContain('dropped');
    // The line comes as she sees it: it has lain still on the floor a moment already, clear of the doorway's post.
    const frame = sim.prologue!.frame!;
    expect(frame.kind).toBe('mamma');
    expect(frame.ghost.x).toBeLessThan(layout.doorway.x - 2);
    expect(frame.seconds).toBeGreaterThanOrEqual(MAMMA_SEEN - STEP);
    expect(MAMMA_SEEN - MAMMA_DOWN).toBeGreaterThanOrEqual(0.5);
    const pose = prologuePose(layout, frame);
    expect(pose.tilt).toBeCloseTo(-Math.PI / 2);
    expect(pose.y).toBeCloseTo(layout.doorway.y + 0.29);
    // The bag lies on its side on the floor, past the ghost's head: the ghost is seen whole.
    const held = { x: 0.44, y: 0.18, z: -0.08 };
    const bag = droppedBag(layout, frame, held)!;
    expect(bag.out).toBeCloseTo(1);
    expect(bag.tilt).toBeCloseTo(-Math.PI / 2);
    expect(bag.x).toBeGreaterThan(1.1);
    expect(pose.y + bag.y).toBeLessThan(layout.doorway.y + 0.25);
    // And the ghost has its bag in its hands again as it is off.
    expect(droppedBag(layout, { ...frame, seconds: MAMMA_TIME }, held)!.out).toBeCloseTo(0);
  });

  it('waits for Pappa until Moa\'s drawing is told, lifts the wooden ghost onto the railing, and leaves it at the deck\'s edge', () => {
    const sim = new Sim({ ...prolog, spawn: { x: 41.6, y: -0.79 } }, {}, { flags: told });
    tick(sim, 0.1);
    expect(sim.prologue!.frame?.kind).toBe('pappa');
    expect(sim.flags.has('pappa:noticed')).toBe(true);
    const start = sim.curr.x;
    tick(sim, 2.85, { ...go, hop: true, act: true });
    const placed = prologuePose(layout, sim.prologue!.frame!);
    expect(placed.x).toBeCloseTo(layout.railing.x);
    expect(placed.y).toBeCloseTo(layout.railing.y);
    expect(sim.curr.x).toBeCloseTo(start);
    tick(sim, 2.4);
    expect(sim.flags.has('pappa:done')).toBe(true);
    // The railing is empty: the ghost is at the deck's edge, and waits there for him.
    expect(sim.ghost!.gone).toBe(false);
    expect(sim.ghost!.x).toBeCloseTo(layout.edge!.x);
    expect(sim.flags.has('goal')).toBe(false);
  });

  it('does not begin Pappa\'s joke before Moa has told what the star did', () => {
    const sim = new Sim({ ...prolog, spawn: { x: 41, y: -0.79 } }, {}, { flags: toHand });
    tick(sim, 1);
    expect(sim.prologue!.frame).toBeNull();
    expect(sim.curr.word).toBe('climbOn');
  });

  it('takes a game saved after the joke up with the ghost at the deck\'s edge', () => {
    const sim = new Sim(prolog, {}, { checkpoint: 2, flags: [...told, 'pappa:noticed', 'pappa:done'] });
    tick(sim, 0.2);
    expect(sim.prologue!.frame).toBeNull();
    expect(sim.ghost!.gone).toBe(false);
    expect(sim.ghost!.x).toBeCloseTo(layout.edge!.x);
  });

  it('replays an interrupted deck tableau from where it is staged', () => {
    const sim = new Sim(prolog, {}, { checkpoint: 1, flags: [...told, 'pappa:noticed'] });
    tick(sim, 0.2);
    expect(sim.prologue!.frame).toBeNull();
    // He walks back to the family on the deck; the joke is played there again, whole.
    for (let i = 0; i < 1200 && !sim.prologue!.frame; i++) sim.step(go);
    expect(sim.prologue!.frame?.kind).toBe('pappa');
    tick(sim, PAPPA_TIME + 0.2);
    expect(sim.flags.has('pappa:done')).toBe(true);
  });

  it('keeps the meaning of the old big candies, and infers only the passed doorway for older saves', () => {
    // 0 in the kitchen at the start, 1 at the end of the hall, 2 on the deck after the shrinking.
    expect(prolog.checkpoints!.map((c) => c.x)).toEqual([9.1, 26, 45.5]);
    const sim = new Sim(prolog, {}, { checkpoint: 1, flags: ['eye', 'paint', 'blink'] });
    tick(sim, 0.1);
    expect(sim.prologue!.frame).toBeNull();
    expect(sim.flags.has('bag:torn')).toBe(true);
    expect(sim.flags.has('pappa:done')).toBe(false);
    // An older save past the waking never plays the morning or the waking again.
    expect(sim.sceneFrame).toBeNull();
  });

  it('takes a game saved in the kitchen up there, with the morning and the eyes still to come', () => {
    const sim = new Sim(prolog, {}, { checkpoint: 0, flags: [] });
    expect(sim.curr.x).toBeLessThan(prolog.prologue!.doorway.x);
    tick(sim, 0.2);
    expect(sim.flags.has('bag:torn')).toBe(false);
    // He stands a step behind the table: the morning begins as he comes to it.
    for (let i = 0; i < 240 && !sim.sceneFrame; i++) sim.step(go);
    expect(sim.sceneFrame?.id).toBe('morgon');
    expect(sim.held).toBe(true);
  });

  it('gives him his feet back after the lift: Pappa notices the ghost as he sets off towards it', () => {
    const sim = new Sim({ ...prolog, spawn: { x: 40.8, y: -0.79 } }, {}, { flags: told });
    tick(sim, 1);
    expect(sim.prologue!.frame).toBeNull();
    expect(sim.held).toBe(false);
    for (let i = 0; i < 240 && !sim.prologue!.frame; i++) sim.step(go);
    expect(sim.prologue!.frame?.kind).toBe('pappa');
    expect(sim.curr.x).toBeGreaterThanOrEqual(41.5);
  });

  it('restarts an interrupted tableau after Till stora godiset without losing its completed actions', () => {
    const sim = new Sim({ ...prolog, spawn: { x: 41.6, y: -0.79 } }, {}, { flags: told });
    tick(sim, 0.8);
    sim.toCheckpoint();
    expect(sim.prologue!.frame).toBeNull();
    tick(sim, 3);
    for (let i = 0; i < 2400 && !sim.flags.has('pappa:done'); i++) sim.step(go);
    expect(sim.flags.has('pappa:done')).toBe(true);
    expect(sim.flags.has('star')).toBe(true);
  });
});

describe('the ghost at the deck\'s edge waits for every promise', () => {
  const PROMISES = ['nearYou', 'mapForYou', 'heja', 'followTrail'];
  /** A page that reads each line it is given for `seconds`, one after another, and says when each is read. */
  function page(sim: Sim, seconds = 4.5) {
    const queue: string[] = [];
    const read = new Map<string, number>();
    let told = sim.said.length;
    let reading = 0;
    return {
      read,
      step(input: StepInput) {
        sim.step({ ...input, talking: queue.length > 0 });
        for (; told < sim.said.length; told++) queue.push(sim.said[told]!);
        if (queue.length > 0 && (reading += STEP) >= seconds) {
          const id = queue.shift()!;
          sim.acknowledge(id);
          read.set(id, sim.steps);
          reading = 0;
        }
      },
    };
  }

  it('lets a child who runs straight to the edge stand free at its side, never past it, until the family is done', () => {
    const sim = new Sim({ ...prolog, spawn: { x: 41.8, y: -0.79 } }, {}, { flags: [...told, 'pappa:noticed', 'pappa:done'] });
    const reader = page(sim);
    let furthest = -Infinity, lowest = Infinity, freeBeside = 0, leapt = -1;
    for (let i = 0; i < 60 / STEP && !sim.flags.has('goal'); i++) {
      // Running and jumping at the edge all the while, as a child might.
      reader.step({ ...go, hop: i % 40 === 0, hopHeld: true });
      furthest = Math.max(furthest, sim.curr.x);
      lowest = Math.min(lowest, sim.curr.y);
      if (sim.curr.x > layout.beside! - 0.6 && !sim.held && !sim.flags.has('leap')) freeBeside += STEP;
      if (leapt < 0 && sim.flags.has('leap')) leapt = sim.steps;
      // However near he stands, it waits where it is until then.
      if (leapt < 0) expect(sim.ghost!.x).toBeCloseTo(layout.edge!.x);
    }
    expect(sim.flags.has('goal')).toBe(true);
    // He reached the ghost's side and stayed on the deck: never past it, never over the edge.
    expect(furthest).toBeGreaterThan(layout.beside! - ELOF_HALF_WIDTH - 0.1);
    expect(furthest).toBeLessThanOrEqual(layout.beside! - ELOF_HALF_WIDTH + 0.02);
    expect(lowest).toBeGreaterThan(layout.edge!.y - 0.05);
    // He stood there free, not held, while they spoke; and the ghost leapt only once the last of them was read.
    expect(freeBeside).toBeGreaterThan(5);
    for (const id of PROMISES) expect(reader.read.get(id), id).toBeLessThan(leapt);
    expect(sim.said.filter((id) => PROMISES.includes(id))).toEqual(PROMISES);
  });
});
