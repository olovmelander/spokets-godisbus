import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import '../../src/content/aventyr2/aventyr2';
import { context, stormskog } from '../../src/content/aventyr2/chapters/stormskog';
import { words } from '../../src/content/aventyr2/lines/stormskog';
import { storyContext } from '../../src/content/story-context';
import { sv } from '../../src/content/sv';
import { settingsFor, simOptions } from '../../src/save/settings';
import { STEP } from '../../src/sim/constants';
import { sceneBeats } from '../../src/sim/scene';
import { Sim } from '../../src/sim/sim';
import type { Ledge, SimStart } from '../../src/sim/types';
import { idle, jump, leap, run, runPast, use, walkTo } from '../sim/drive';
import { decide, heightAt, playThrough } from './robot';

/**
 * Äventyr 2, Kapitel 2: Stormskogen (docs/aventyr-2.md). The generic rules every chapter of the adventure keeps
 * are in ./aventyr2.test.ts; here are its own: the owl's twig and flight, Pappa's flashlight that turns Klonk
 * into a bridge, the old one's memory at the hollow, the jay, and the optional layers.
 */

/** Everything said on the way, in order, when the robot plays it from the start. */
const SAID = [
  'ss:dark', 'ss:klonk', 'ss:flash', 'ss:cones', 'ss:owl', 'ss:owl-free', 'ss:windthrow',
  'ss:owl-waits', 'ss:owl-fly', 'ss:wide', 'ss:pappa', 'ss:ljuset:0', 'ss:ljuset:1', 'ss:ljuset:2', 'ss:tiptoe',
  'ss:vaknar:0', 'ss:vaknar:1', 'ss:vaknar:2', 'ss:hollow-seen', 'ss:hollow', 'ss:alone', 'ss:why', 'ss:both', 'ss:jay', 'ss:jay-glad', 'ss:see-old',
  'ss:village', 'ss:onward',
];
/** The big candies by name: their places in stormskog.checkpoints. */
const CP = { boughs: 2, owl: 3, windthrow: 4, owlGap: 5, pappa: 6, hollow: 7, jay: 8, root: 9 };
const ledge = (look: Ledge['look'], x: number) => stormskog.ledges!.find((l) => l.look === look && Math.abs(l.x - x) < 0.5)!;
const where = (sim: Sim) => `he is at ${sim.curr.x.toFixed(2)}, ${sim.curr.y.toFixed(2)} (${sim.curr.mode})`;
const on = (sim: Sim, l: Ledge) => sim.curr.mode === 'free' && sim.curr.grounded && Math.abs(sim.curr.y - l.y) < 0.08 && Math.abs(sim.curr.x - l.x) <= l.width / 2 + 0.16;
const sideTaken = (sim: Sim, from: number, to: number) => (stormskog.side ?? []).every((c, i) => c.x < from || c.x > to || sim.collectedSide[i]);
const mover = (sim: Sim, id: string) => sim.movers.find((m) => m.def.id === id)!;
/** Waits, standing where he is, until `ready`; then a held leap to the right. */
function leapWhen(sim: Sim, ready: () => boolean): void {
  for (let i = 0; i < 10 / STEP && !ready(); i++) sim.step(idle);
  jump(sim, 1);
}

/**
 * The save a real game keeps at a big candy (src/main.ts): the robot plays from the start until it reaches it,
 * and what it has found, placed and seen is taken up from there, said remarks and all.
 */
const saves = new Map<number, SimStart>();
function saveAt(checkpoint: number): SimStart {
  const kept = saves.get(checkpoint);
  if (kept) return kept;
  const game = new Game(stormskog, {});
  let wasAhead = false;
  let wasOffered = false;
  for (let frame = 0; frame < 60 * 400 && game.sim.checkpoint < checkpoint; frame++) {
    const { x, y, ahead, offered } = decide(game, stormskog);
    game.frame(1 / 60, { x, y, hopHeld: true }, { hop: ahead && !wasAhead, act: offered && !wasOffered, helper: false });
    wasAhead = ahead;
    wasOffered = offered;
  }
  expect(game.sim.checkpoint).toBe(checkpoint);
  const indices = (got: readonly boolean[]) => got.flatMap((has, i) => (has ? [i] : []));
  const save: SimStart = {
    checkpoint, collected: indices(game.sim.collected), side: indices(game.sim.collectedSide),
    placed: game.sim.placed, flags: [...game.sim.flags],
  };
  saves.set(checkpoint, save);
  return save;
}

describe('Äventyr 2, Kapitel 2: Stormskogen', () => {
  for (const fps of [30, 60, 144]) {
    it(`the robot plays it from the forest's edge down to the village at ${fps} Hz`, () => {
      const result = playThrough(fps, stormskog, {}, 400);
      expect(result.goal, `it got to x ${result.x.toFixed(1)}`).toBe(true);
      expect(result.checkpoint).toBe(stormskog.checkpoints!.length - 1);
      // The cones are read from their shadows: none lands on it, and nothing sends it back.
      expect(result.knocks).toBe(0);
      expect(result.bubbles).toBe(0);
      expect(result.bowled).toBe(0);
      // The things it had to do: the owl's twig and the flight, Pappa's beam and the bridge, the hollow, the jay.
      expect(result.flags).toEqual(expect.arrayContaining([
        'placed:owl-twig', 'owl', 'ss:beam', 'ss:frozen', 'ss:hollow', 'berry', 'jay', 'goal',
      ]));
      expect(result.said).toEqual(SAID);
    });
  }

  it('the robot leaves no trail candy behind', () => {
    const result = playThrough(60, stormskog, {}, 400);
    expect(result.missed.map((i) => `${stormskog.candy[i]!.x},${stormskog.candy[i]!.y}`)).toEqual([]);
    expect(stormskog.candy.length).toBeGreaterThanOrEqual(85);
  });

  it('on Lugnt the cones miss a running Elof, and Hoppa is never needed', () => {
    const game = new Game(stormskog, simOptions(settingsFor('lugnt')));
    let wasOffered = false;
    let wasAhead = false;
    let hops = 0;
    for (let frame = 0; frame < 60 * 400 && !game.sim.flags.has('goal'); frame++) {
      const { x, y, ahead, offered } = decide(game, stormskog);
      // On Lugnt it jumps only where something stands in the way that no marked jump covers.
      const blocked = ahead && game.sim.curr.vx < 0.2;
      if (blocked && !wasAhead) hops++;
      game.frame(1 / 60, { x, y, hopHeld: blocked }, { hop: blocked && !wasAhead, act: offered && !wasOffered, helper: false });
      wasOffered = offered;
      wasAhead = blocked;
    }
    expect(game.sim.flags.has('goal'), `it got to x ${game.sim.curr.x.toFixed(1)}`).toBe(true);
    expect(game.sim.knocks).toBe(0);
    expect(game.sim.bubbles).toBe(0);
    expect(hops).toBe(0);
  });

  it('takes a game up again at the big candy after the owl, with nothing said twice', () => {
    const game = new Game(stormskog, {}, saveAt(CP.pappa));
    expect(game.sim.curr.x).toBe(stormskog.checkpoints![CP.pappa]!.x);
    expect(game.sim.flags.has('owl')).toBe(true);
    let wasOffered = false;
    let wasAhead = false;
    for (let frame = 0; frame < 60 * 200 && !game.sim.flags.has('goal'); frame++) {
      const { x, y, ahead, offered } = decide(game, stormskog);
      game.frame(1 / 60, { x, y, hopHeld: true }, { hop: ahead && !wasAhead, act: offered && !wasOffered, helper: false });
      wasOffered = offered;
      wasAhead = ahead;
    }
    expect(game.sim.flags.has('goal')).toBe(true);
    expect(game.sim.bubbles).toBe(0);
    expect(game.sim.said).toEqual(SAID.slice(SAID.indexOf('ss:wide')));
    // And every trail candy is in the bag at the end, the ones before the big candy from the save.
    expect(game.sim.collected.every((got) => got)).toBe(true);
  });

  it('flies again with the owl when taken up before its gap', () => {
    const sim = new Sim(stormskog, {}, { checkpoint: CP.owlGap, placed: ['owl-twig'], flags: ['placed:owl-twig', 'owl'] });
    // The flight ends beyond the big candy he starts at: it is ready again.
    expect(sim.flags.has('owl')).toBe(false);
    run(sim, 0.2);
    walkTo(sim, 109.6);
    expect(sim.curr.verb).toBe('take');
    expect(sim.curr.word).toBe('ssFlyOwl');
  });

  describe('Ugglan', () => {
    it('the owl cannot fly him until the twig is out of its hole; then it carries him over the widest gap', () => {
      const sim = new Sim(stormskog, {}, { checkpoint: CP.owlGap });
      run(sim, 0.2);
      walkTo(sim, 109.6);
      // Nothing to use at the gap: the owl is still shut in.
      expect(sim.curr.verb, where(sim)).toBeNull();
      expect(runPast(sim, 125, 3)).toBe(false);

      const freed = new Sim(stormskog, {}, { checkpoint: CP.owl });
      run(freed, 0.2);
      // Its ring hangs out of every jump's reach: it is the lace that pulls it.
      walkTo(freed, 69.5);
      expect(freed.curr.verb).toBe('pull');
      use(freed);
      run(freed, 1);
      expect(freed.flags.has('placed:owl-twig')).toBe(true);
      expect(freed.said).toContain('ss:owl-free');
      // The twig lies in the moss, low enough to walk over.
      const twig = mover(freed, 'owl-twig');
      expect(twig.y + twig.def.height - heightAt(stormskog, twig.x)).toBeLessThanOrEqual(0.3);
      expect(runPast(freed, 76)).toBe(true);
    });

    it('from its edge the owl flies him across, wherever he steers', () => {
      for (const y of [-1, 0, 1]) {
        const sim = new Sim(stormskog, {}, { checkpoint: CP.owlGap, placed: ['owl-twig'], flags: ['placed:owl-twig'] });
        run(sim, 0.2);
        walkTo(sim, 109.6);
        expect(sim.curr.word).toBe('ssFlyOwl');
        use(sim);
        expect(sim.curr.mode).toBe('ride');
        run(sim, 3.2, { y });
        expect(sim.curr.mode, where(sim)).toBe('free');
        expect(sim.curr.x).toBeGreaterThan(121.5);
        expect(sim.bubbles).toBe(0);
      }
    });
  });

  describe('Pappas ficklampa', () => {
    const plank = stormskog.ledges!.find((l) => l.needs === 'ss:frozen')!;

    it('the gap is too wide for any jump, and a plank lies across it only once Pappa has shone on Klonk', () => {
      // Twice a running jump, and the bridge spans it from rim to rim, level with both.
      expect(plank.look).toBe('plank');
      expect(plank.width).toBeGreaterThan(4);
      expect(plank.y).toBe(heightAt(stormskog, plank.x - plank.width / 2));
      expect(plank.y).toBe(heightAt(stormskog, plank.x + plank.width / 2));
      const sim = new Sim(stormskog, {}, { checkpoint: CP.pappa, placed: ['owl-twig'], flags: ['placed:owl-twig', 'owl'] });
      run(sim, 0.2);
      leap(sim, 1, 133.6);
      // Without the beam he never reaches the far rim: the glitter bubble brings him back.
      run(sim, 2);
      expect(sim.curr.x, where(sim)).toBeLessThan(134);
      expect(sim.bubbles).toBe(1);
    });

    it('calling Pappa: his lamp finds him at the edge, its light freezes Klonk into the bridge, and he walks over his friend', () => {
      const sim = new Sim(stormskog, {}, saveAt(CP.pappa));
      run(sim, 0.2);
      // Klonk waits at the edge of the gap.
      const edge = stormskog.ghost!.findIndex((perch) => perch.until === 'ss:frozen');
      walkTo(sim, 131);
      expect(sim.ghost!.perch).toBe(edge);
      expect(sim.curr.verb).toBe('call');
      expect(sim.curr.word).toBe('callPappa');
      use(sim);
      expect(sim.flags.has('ss:beam')).toBe(true);
      // A held moment while the lamp finds him, and Klonk: the stick does nothing.
      run(sim, 0.6, { x: 1 });
      expect(sim.sceneFrame?.id).toBe('ss:ljuset');
      expect(sim.held).toBe(true);
      expect(Math.abs(sim.curr.x - 131)).toBeLessThan(0.1);
      run(sim, 1, { x: 1 });
      expect(sim.flags.has('ss:frozen')).toBe(true);
      // Then Klonk is the bridge: the place where it waited at the edge is left behind.
      expect(sim.ghost!.perch).toBeGreaterThan(edge);
      // Across on foot, without a jump.
      expect(runPast(sim, 139)).toBe(true);
      expect(sim.bubbles).toBe(0);
      expect(sim.said).toEqual(['ss:wide', 'ss:pappa', 'ss:ljuset:0', 'ss:ljuset:1', 'ss:ljuset:2', 'ss:tiptoe']);
      // On the far side he stands while Pappa turns his lamp to the path, and Klonk wakes beside him and waits there.
      expect(sim.flags.has('ss:woke')).toBe(false);
      for (let i = 0; i < 5 / STEP && !sim.sceneFrame; i++) sim.step({ ...idle, x: 1 });
      expect(sim.sceneFrame?.id).toBe('ss:vaknar');
      run(sim, 2, { x: 1 });
      expect(sim.flags.has('ss:woke')).toBe(true);
      expect(sim.ghost!.x).toBeCloseTo(141.5, 1);
      runPast(sim, 143);
      expect(sim.said.slice(-3)).toEqual(['ss:vaknar:0', 'ss:vaknar:1', 'ss:vaknar:2']);
    });

    it('says what each of them sees: Pappa searching, finding him, a toy fallen over; Elof knowing why; Klonk waking', () => {
      const scene = (id: string) => stormskog.scenes!.find((one) => one.id === id)!;
      const said = (id: string) => scene(id).lines!.map((line) => `${line.who}: ${words.lines[line.line]}`);
      // Something tiny in his light: Pappa is not sure it is him, and Elof answers by calling (the way over).
      expect((stormskog.beats ?? []).filter((beat) => beat.who === 'pappa').map((beat) => words.lines[beat.line]))
        .toEqual(['Något rör sig i ljuset. Är det du, Elof?']);
      expect(said('ss:ljuset')).toEqual([
        'pappa: Där är du ju! Akta dig för kanten!',
        'pappa: Oj! Klonk föll rakt över klyftan.',
        'elof: Han blir stel när Pappa tittar. En bro!',
      ]);
      expect(said('ss:vaknar')).toEqual([
        'pappa: Bra, Elof! Nu lyser jag på stigen.',
        'spoket: Klonk!',
        'elof: Tack, Klonk! Du är världens bästa bro.',
      ]);
      // Klonk stiffens only after Pappa has found Elof, and wakes only after Pappa has turned his lamp away.
      for (const id of ['ss:ljuset', 'ss:vaknar']) {
        const one = scene(id);
        expect(one.hold, id).toBe(true);
        expect(one.lines![0]!.at, id).toBeLessThan(one.cues![0]!.at);
        expect(one.cues![0]!.at, id).toBeLessThan(one.lines![1]!.at);
        for (const line of one.lines!) expect(words.lines[line.line]!.length, line.line).toBeLessThanOrEqual(40);
      }
      expect(scene('ss:ljuset').cues).toEqual([{ at: expect.any(Number), flag: 'ss:frozen' }]);
      expect(scene('ss:vaknar').cues).toEqual([{ at: expect.any(Number), flag: stormskog.storm!.wakes }]);
      // That a grown-up's look stiffens Klonk is Elof's secret: he thinks it, and the grown-ups never say it.
      expect(words.lines.ssStiff).toMatch(/Pappa tittar/);
      expect(said('ss:ljuset').filter((line) => line.startsWith('pappa')).join(' ')).not.toMatch(/stel|lever|vaken/);
    });

    it('wakes Klonk in a game taken up beyond the gap, as in one that saw him wake', () => {
      const sim = new Sim(stormskog, {}, { checkpoint: CP.hollow, flags: ['placed:owl-twig', 'owl', 'ss:beam', 'ss:frozen'] });
      run(sim, 0.1);
      expect(sim.flags.has('ss:woke')).toBe(true);
      expect(sim.flags.has('scene:ss:ljuset')).toBe(true);
    });
  });

  describe('Gamla trägubbens minne', () => {
    it('recovers the old figure\'s motive when a save beyond the hollow lacks its reading receipt', () => {
      // The next big candy can be a return point even if the thought has not yet reached the reader.
      const sim = new Sim(stormskog, {}, { checkpoint: CP.jay, flags: ['ss:frozen'] });
      run(sim, 0.1);
      expect(sim.flags.has('ss:hollow')).toBe(true);
      expect(sim.said.filter((id) => ['ss:alone', 'ss:why'].includes(id))).toEqual([
        'ss:alone', 'ss:why',
      ]);
    });

    it('at the dark hollow Klonk waits with the old one\'s thought, and the picture stays once he has seen it', () => {
      const perch = stormskog.ghost!.find((p) => p.until === 'ss:hollow')!;
      expect(perch.thought?.picture).toBe('pine-crack');
      expect(stormskog.thoughtClues).toEqual([{ at: expect.objectContaining({ x: perch.at.x }), picture: 'pine-crack', after: 'ss:hollow' }]);
      const sim = new Sim(stormskog, {}, saveAt(CP.hollow));
      run(sim, 0.2);
      leap(sim, 1, 145.2);
      runPast(sim, 153);
      expect(sim.flags.has('ss:hollow')).toBe(false);
      const waiting = sim.ghost!.perch;
      expect(stormskog.ghost![waiting]).toBe(perch);
      runPast(sim, 158);
      expect(sim.flags.has('ss:hollow')).toBe(true);
      // The heart of the chapter, read slowly, in this order.
      const memory = (stormskog.beats ?? []).filter((beat) => beat.on === 'ss:hollow');
      expect(memory.map((beat) => [beat.who, beat.line, beat.read ?? false])).toEqual([
        ['spoket', 'ssHollowKlonk', false], ['elof', 'ssAlone', true], ['elof', 'ssWhy', true],
      ]);
      expect(words.lines.ssAlone).toBe('Gamla trägubben låg ensam i flera år.');
      expect(words.lines.ssWhy).toBe('Därför skyndar han. Lillgubben är ensam!');
      expect(sim.said).toEqual(['ss:hollow-seen', 'ss:hollow', 'ss:alone', 'ss:why']);
      run(sim, 1);
      expect(sim.ghost!.perch).toBeGreaterThan(waiting);
    });
  });

  describe('Lavskrikan', () => {
    it('a lingonberry for the jay, and it shows the beard lichen up the high root', () => {
      const sim = new Sim(stormskog, {}, saveAt(CP.jay));
      run(sim, 0.2);
      // The root is too high, and the lichen is not there yet.
      walkTo(sim, 177.7);
      run(sim, 1, { x: 1 });
      expect(sim.curr.y).toBeLessThan(1);
      walkTo(sim, 172.5);
      expect(sim.curr.verb).toBeNull();
      walkTo(sim, 167.5);
      expect(sim.curr.word).toBe('pick');
      use(sim);
      walkTo(sim, 172.5);
      expect(sim.curr.word).toBe('giveJay');
      use(sim);
      expect(sim.flags.has('jay')).toBe(true);
      runPast(sim, 180);
      expect(sim.curr.y, where(sim)).toBeCloseTo(4, 1);
    });
  });

  describe('the optional layers', () => {
    it('the swaying boughs over the ravine: up the trunk, from bough to bough as they swing close, and down', () => {
      const [plate, branch, far] = [ledge('bark', 43.4), ledge('branch', 45.2), ledge('branch', 57)];
      const sim = new Sim(stormskog, {}, { checkpoint: CP.boughs });
      run(sim, 0.2);
      walkTo(sim, plate.x);
      jump(sim);
      expect(on(sim, plate), where(sim)).toBe(true);
      jump(sim, 1);
      expect(on(sim, branch), where(sim)).toBe(true);
      walkTo(sim, branch.x + branch.width / 2 - 0.3);
      const [a, b, c] = ['bough-0', 'bough-1', 'bough-2'].map((id) => () => mover(sim, id));
      const gap = (left: () => { x: number; def: { width: number } }, right: () => { x: number; def: { width: number } }) =>
        right().x - right().def.width / 2 - (left().x + left().def.width / 2);
      const branchEnd = { x: branch.x, def: { width: branch.width } };
      const farStart = { x: far.x, def: { width: far.width } };
      leapWhen(sim, () => gap(() => branchEnd, a!) < 0.8);
      leapWhen(sim, () => gap(a!, b!) < 0.6);
      leapWhen(sim, () => gap(b!, c!) < 0.6);
      leapWhen(sim, () => gap(c!, () => farStart) < 0.5);
      expect(on(sim, far), where(sim)).toBe(true);
      // Along it, and down onto the far rim, softly.
      expect(runPast(sim, 61)).toBe(true);
      expect(sideTaken(sim, 43, 58)).toBe(true);
      expect(sim.bubbles).toBe(0);
    });

    it('the boughs keep clear of every head on the trail below, and of every jump the trail asks for', () => {
      const boughs = stormskog.movers!.filter((m) => m.cycle);
      expect(boughs.length).toBe(3);
      for (const m of boughs) {
        // Optional: the helper never points at them, and the robot never waits for them.
        expect(m.extra).toBe(true);
        const from = m.stops[0]!.x - m.width / 2;
        const to = m.stops[1]!.x + m.width / 2;
        const under = Math.min(...m.stops.map((s) => s.y));
        // A walk, a run and a hop on the ravine's bank or floor pass under with room to spare.
        for (let x = from; x <= to; x += 0.1) expect(under - heightAt(stormskog, x), `under ${m.id} at ${x.toFixed(1)}`).toBeGreaterThan(1.9);
        // No marked jump of the trail takes off within a running jump of their sweep.
        for (const j of stormskog.jumps ?? []) expect(j.at.x < from - 2.2 || j.at.x > to || under - j.at.y > 2.2, `the jump at ${j.at.x}`).toBe(true);
      }
    });

    it('the branch over the leaning spruce, and down before the crack', () => {
      const branch = ledge('branch', 100.6);
      const sim = new Sim(stormskog, {}, { checkpoint: CP.windthrow, placed: ['owl-twig'], flags: ['placed:owl-twig'] });
      run(sim, 0.2);
      leap(sim, 1, 83.6);
      runPast(sim, 95);
      walkTo(sim, 98.6);
      jump(sim, 1);
      expect(on(sim, branch), where(sim)).toBe(true);
      run(sim, 2, { x: 0.5 });
      expect(sim.curr.x).toBeLessThan(103);
      expect(sideTaken(sim, 99, 102)).toBe(true);
      expect(sim.bubbles).toBe(0);
    });

    it('the two boughs off the high root: a leap up, and a walk down onto the next', () => {
      const [first, second] = [ledge('branch', 186.6), ledge('branch', 188.9)];
      const sim = new Sim(stormskog, {}, { checkpoint: CP.root, flags: ['berry', 'jay'] });
      run(sim, 0.2);
      walkTo(sim, 182.6);
      leap(sim, 1, 183.7);
      expect(on(sim, first), where(sim)).toBe(true);
      walkTo(sim, first.x + first.width / 2 - 0.2);
      for (let i = 0; i < 1.5 / STEP && !on(sim, second); i++) sim.step({ ...idle, x: 0.5 });
      run(sim, 0.3);
      expect(on(sim, second), where(sim)).toBe(true);
      run(sim, 2, { x: 0.5 });
      expect(sideTaken(sim, 185, 191)).toBe(true);
      expect(sim.bubbles).toBe(0);
    });
  });

  it('says every line in at most 40 characters, warm and plain, and every word it uses exists', () => {
    for (const [key, text] of Object.entries(words.lines)) {
      expect(text.length, key).toBeLessThanOrEqual(40);
      expect(key, key).toMatch(/^ss[A-Z]/);
    }
    // Every line of the chapter's words is said somewhere in it: along the way, or in one of its scenes.
    const said = new Set([...(stormskog.beats ?? []), ...sceneBeats(stormskog.scenes)].map((beat) => beat.line));
    for (const key of Object.keys(words.lines)) expect(said.has(key), key).toBe(true);
    const verbs: Record<string, string> = sv.verbs;
    for (const spot of stormskog.spots ?? []) expect(verbs[spot.word ?? spot.verb], spot.id).toBeTruthy();
  });

  it('"Just nu" follows the story: Pappa guides at his gap, and the end looks down to the village', () => {
    const say = (flags: string[], x: number, y = heightAt(stormskog, x)) => storyContext('stormskog', new Set(flags), { x, y });
    expect(say([], 2)?.purpose).toBe(words.purposes!.ssForest!.purpose);
    expect(say([], 20)?.purpose).toBe(words.purposes!.ssCones!.purpose);
    expect(say([], 68)?.purpose).toBe(words.purposes!.ssOwl!.purpose);
    expect(say(['placed:owl-twig'], 109)?.purpose).toBe(words.purposes!.ssOwlBoard!.purpose);
    expect(say(['placed:owl-twig', 'owl'], 130)?.guide).toBe('pappa');
    expect(say(['placed:owl-twig', 'owl', 'ss:beam', 'ss:frozen'], 135, 0)?.purpose).toBe(words.purposes!.ssPlank!.purpose);
    expect(say(['ss:frozen', 'ss:hollow'], 158)?.recap).toMatch(/ensam i mörkret/);
    expect(say(['ss:hollow'], 170)?.purpose).toBe(words.purposes!.ssJay!.purpose);
    expect(say(['ss:hollow', 'berry', 'jay'], 205)?.purpose).toBe(words.purposes!.ssDown!.purpose);
    // Every purpose the chooser can give has its words.
    for (const x of [0, 20, 50, 70, 100, 110, 130, 136, 145, 160, 170, 180, 200]) {
      for (const flags of [[], ['placed:owl-twig'], ['placed:owl-twig', 'owl'], ['ss:frozen'], ['ss:hollow'], ['jay']]) {
        const [purpose, helper] = context((flag) => flags.includes(flag), { x, y: heightAt(stormskog, x) });
        expect(words.purposes![purpose], purpose).toBeDefined();
        expect(words.helpers![helper], helper).toBeDefined();
      }
    }
  });
});
