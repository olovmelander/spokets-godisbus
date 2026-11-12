import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import '../../src/content/aventyr2/aventyr2';
import { stormkvall } from '../../src/content/aventyr2/chapters/stormkvall';
import { stormoga } from '../../src/content/aventyr2/chapters/stormoga';
import { morgonen } from '../../src/content/aventyr2/chapters/morgonen';
import { endsInScene } from '../../src/sim/scene';
import { groundAlong } from '../../src/sim/sim';
import { listenThrough } from './listener';
import { playThrough } from './robot';

/** Äventyr 2's beginning, final and end (docs/aventyr-2.md): every step is his own choice, and none can fail. */
describe('Äventyr 2: Stormkvällen', () => {
  it('finds the flashlight for Pappa, says goodnight, loses both figures to the gust, tastes Klonk\'s star and goes out into the storm', () => {
    const result = playThrough(60, stormkvall, {}, 300);
    expect(result.goal).toBe(true);
    expect(result.flags).toEqual(expect.arrayContaining(['lamp:take', 'lamp:give', 'goodnight', 'gust', 'star', 'scene:krymper', 'scene:tillsammans', 'coat:take', 'scene:regnrock', 'a2titel']));
    // The doll's raincoat, after the family have put on theirs.
    expect(result.flags.indexOf('scene:tillsammans')).toBeLessThan(result.flags.indexOf('coat:take'));
    const order = ['kvall:0', 'skLampThanks', 'fonstret:0', 'fonstret:2', 'klonkstar:1', 'krymper:0',
      'upptackt:0', 'upptackt:1', 'upptackt:2', 'upptackt:3', 'tillsammans:0', 'skTrail', 'stormtitel:0'];
    expect(result.said.filter((id) => order.includes(id))).toEqual(order);
    expect(result.bubbles).toBe(0);
  });

  it('has nothing waiting on the floor before the story lays it there: no big candy, and no star', () => {
    // The trail is the old trägubbe's, laid when he leaps; the star is in Klonk's bag until it opens it.
    expect(stormkvall.checkpoints!.every((c) => c.after === 'scene:tillsammans')).toBe(true);
    const star = stormkvall.spots!.find((spot) => spot.id === 'star')!;
    expect(star.after).toBe('star:out');
    expect(stormkvall.scenes!.find((scene) => scene.id === 'klonkstar')!.cues).toContainEqual(expect.objectContaining({ flag: 'star:out' }));
    // He runs through the house before anything has happened, past where every big candy will be.
    const game = new Game(stormkvall, {});
    let furthest = 0;
    for (let frame = 0; frame < 60 * 40; frame++) {
      game.frame(1 / 60, { x: 1, hopHeld: true }, { hop: frame % 50 === 0, act: false, helper: false });
      furthest = Math.max(furthest, game.sim.curr.x);
    }
    expect(furthest).toBeGreaterThan(Math.max(...stormkvall.checkpoints!.map((c) => c.x)) + 1);
    expect(game.sim.checkpoint).toBe(-1);
    expect(game.sim.flags.has('star:out')).toBe(false);
    expect(game.sim.candyCount).toBe(0);
    expect(game.sim.said).not.toContain('skSill');
    expect(game.sim.said).not.toContain('skRain');
  });

  it('brings the star out in the scene after the window, before it can be tasted', () => {
    const result = playThrough(60, stormkvall, {}, 300);
    const flags = result.flags;
    expect(flags.indexOf('scene:fonstret')).toBeLessThan(flags.indexOf('star:out'));
    expect(flags.indexOf('star:out')).toBeLessThan(flags.indexOf('star'));
  });

  it('resumes after the shrinking on the floor, small, and still has its trail', () => {
    const game = new Game(stormkvall, {}, { checkpoint: 1, flags: ['scene:kvall', 'lamp:take', 'lamp:give', 'beat:skLampThanks', 'goodnight', 'gust', 'scene:fonstret', 'scene:klonkstar', 'star', 'scene:krymper', 'scene:tillsammans'] });
    expect(game.sim.curr.x).toBe(stormkvall.checkpoints![1]!.x);
    for (let frame = 0; frame < 60 * 120 && !game.sim.flags.has('goal'); frame++) {
      game.frame(1 / 60, { x: 1, hopHeld: true }, { hop: frame % 50 === 0, act: false, helper: false });
    }
    expect(game.sim.flags.has('goal')).toBe(true);
  });
});

describe('Äventyr 2: Stormens öga', () => {
  it.each([30, 60, 144])('can collect the whole trail before the homecoming ends at %i Hz', (fps) => {
    const result = playThrough(fps, stormoga, {}, 300);
    expect(result.goal).toBe(true);
    expect(result.flags).toContain('home');
    expect(result.missed).toEqual([]);
  });

  it('flies out with the owl, opens the storm\'s eye, takes the gold sweet, grows and goes home', () => {
    const result = playThrough(60, stormoga, {}, 300);
    expect(result.goal).toBe(true);
    expect(result.flags).toEqual(expect.arrayContaining(['owl:call', 'owl:ready', 'owl', 'eye', 'scene:oga', 'scene:motet', 'gift', 'taste', 'scene:stor', 'home']));
    const order = ['soFar', 'soOwl', 'oga:1', 'motet:3', 'soGold', 'soShare', 'soMagic', 'stor:4', 'stor:5', 'stor:6'];
    expect(result.said.filter((id) => order.includes(id))).toEqual(order);
  });

  it('thanks the owl over the last stretch of water and lets Bertil name Elof before offering the light', () => {
    const lamp = stormoga.scenes!.find(scene => scene.id === 'lampa:bertil')!;
    expect(lamp.lines!.map(line => line.line)).toEqual(['soLampBertil', 'soLampBertilShine']);
    const owl = stormoga.rides!.find(ride => ride.id === 'owl')!;
    const thanks = stormoga.beats!.find(beat => beat.id === 'soOwlThanks')!;
    expect(thanks).toMatchObject({ who: 'elof', needs: 'owl', read: true });
    expect(thanks.at).toBeGreaterThan(owl.from.x + (owl.to.x - owl.from.x) * .8);
    expect(thanks.at).toBeLessThan(stormoga.water![0]!.to);
    const result = playThrough(60, stormoga, {}, 300);
    const ordered = ['lampa:bertil:0', 'lampa:bertil:1', 'soOwlThanks', 'oga:0'];
    expect(result.said.filter(id => ordered.includes(id))).toEqual(ordered);
  });

  it('walks up with the cap and gives it back before the golden sweet is offered', () => {
    const meeting = stormoga.scenes!.find(scene => scene.id === 'motet')!;
    const keys = meeting.stage!.elof!;
    const walk = keys.find(key => key.act === 'walk')!;
    const reach = keys.find(key => key.act === 'reach')!;
    const line = meeting.lines!.find(line => line.line === 'soCapBack')!;
    const handed = meeting.cues!.find(cue => cue.flag === 'so:cap-returned')!;
    const gift = meeting.cues!.find(cue => cue.flag === 'gift:out')!;
    expect(walk.lift!.x).toBeGreaterThan(2);
    expect(walk.at + walk.move!).toBeLessThanOrEqual(reach.at + 1e-8);
    expect(reach.at + .6).toBeLessThan(line.at);
    expect(line.at).toBeLessThan(handed.at);
    expect(handed.at).toBeLessThan(gift.at);
    expect(keys.find(key => key.act === 'walk' && key.at > handed.at)?.lift).toEqual({ x: 0, y: 0, z: 0 });
    expect(stormoga.storm!.buildings!.some(building => building.kind === 'church')).toBe(false);
  });

  it('walks home on his own feet: off the stone, through the shallows and up onto the shore, never in the air', () => {
    // Olov, 9 November 2026: "När Elof väljer att gå hem i slutet flyger han."
    const home = stormoga.rides!.find((ride) => ride.id === 'home')!;
    expect(home.ground).toBeDefined();
    const game = new Game({ ...stormoga, spawn: { ...home.from } }, {}, { flags: ['eye', 'scene:oga', 'scene:rockav', 'scene:motet', 'gift:out', 'gift', 'taste', 'scene:stor'] });
    const still = { x: 0, hopHeld: false }, none = { hop: false, act: false, helper: false };
    let walked = 0, above = -Infinity, deepest = Infinity;
    // He lands where he is put, and then chooses Gå hem.
    for (let frame = 0; frame < 60 * 16 && (walked === 0 || game.sim.curr.mode === 'ride'); frame++) {
      game.frame(1 / 60, still, { ...none, act: frame === 30 });
      const p = game.sim.curr;
      if (p.mode !== 'ride') continue;
      walked++;
      above = Math.max(above, p.y - groundAlong(home.ground!, p.x));
      deepest = Math.min(deepest, p.y);
    }
    expect(walked).toBeGreaterThan(60 * (home.time - 1));
    // His feet on the ground all the way, and in the shallows under the water's surface: he wades.
    expect(above).toBeLessThan(0.02);
    expect(deepest).toBeLessThan(Math.min(...stormoga.water!.map((w) => w.y)));
    expect(game.sim.curr.x).toBeCloseTo(home.to.x, 1);
    expect(game.sim.flags.has('goal')).toBe(true);
  });

  it('keeps the walk home on the visible rounded rock and the shallow bank', () => {
    const home = stormoga.rides!.find((ride) => ride.id === 'home')!;
    // moonstone.ts keeps the path flat to x58, then rounds down as 0.6 - 0.7 * distance².
    // The earlier path cut into this rock by over one Elof length before reaching the water.
    for (let x = 54; x <= 59.46; x += 0.04) {
      const stone = 0.6 - 0.7 * Math.max(0, x - 58) ** 2;
      expect(Math.abs(groundAlong(home.ground!, x) - stone)).toBeLessThan(0.03);
    }
    for (let x = 62.2; x <= home.to.x; x += 0.1) {
      expect(groundAlong(home.ground!, x)).toBeCloseTo(groundAlong(stormoga.ground, x), 5);
    }
    // The grandparents wait on this bank too, with their soles on it.
    for (const person of stormoga.decor!.filter((thing) => ['mormor', 'morfar'].includes(thing.look) && thing.after === 'taste')) {
      expect(person.at.y).toBeCloseTo(groundAlong(stormoga.ground, person.at.x), 5);
      expect(stormoga.water!.some(water => person.at.x >= water.from && person.at.x <= water.to)).toBe(false);
    }
  });

  it('reveals the saved golden sweet only after the reunion, then recalls its magic before tasting', () => {
    const gift = stormoga.spots!.find((spot) => spot.id === 'gift')!;
    // It comes out at the end of the meeting, after all that is said in it, so that the scene can show it held out; and
    // it can be taken only once the meeting is over.
    const motet = stormoga.scenes!.find((scene) => scene.id === 'motet')!;
    const reveal = motet.cues!.find((cue) => cue.flag === gift.after)!;
    expect(reveal.at).toBeGreaterThan(Math.max(...motet.lines!.map((line) => line.at)));
    expect(gift.needs).toBe('scene:motet');
    const game = new Game({ ...stormoga, spawn: gift.at }, {}, { flags: ['eye', 'scene:oga'] });
    game.frame(1 / 60, { x: 0, hopHeld: false }, { hop: false, act: true, helper: false });
    expect(game.sim.flags.has('gift')).toBe(false);
    const result = playThrough(60, stormoga, {}, 300);
    const steps = ['scene:motet', 'gift', 'beat:soShare', 'beat:soMagic', 'taste'];
    expect(result.flags.filter((flag) => steps.includes(flag))).toEqual(steps);
  });

  it('replays an interrupted taste at the sweet, inside its close-up, then lets him walk home', () => {
    const taste = stormoga.spots!.find((spot) => spot.id === 'taste')!;
    // The last collected candy is behind the tasting place. Closing the page while the family speaks
    // preserves taste, but not the unfinished scene: replay must keep Elof in the shot with his sweet.
    const game = new Game(stormoga, {}, { checkpoint: 1, flags: [
      'owl:call', 'owl:ready', 'owl', 'eye', 'scene:oga', 'scene:rockav', 'scene:motet',
      'gift:out', 'gift', 'beat:soShare', 'beat:soMagic', 'taste',
    ] });
    expect(game.sim.curr.x).toBeCloseTo(taste.at.x, 5);
    for (let frame = 0; frame < 60 * 20; frame++) {
      game.frame(1 / 60, { x: 0, hopHeld: false }, { hop: false, act: false, helper: false });
    }
    expect(game.sim.flags.has('scene:stor')).toBe(true);
    expect(game.sim.said).toContain('stor:6');
    expect(game.sim.curr.x).toBeCloseTo(taste.at.x, 5);
    // A completed scene still resumes at its candy, so replaying does not pull a later save backwards.
    const completed = new Game(stormoga, {}, { checkpoint: 2, flags: [...game.sim.flags] });
    expect(completed.sim.curr.x).toBe(stormoga.checkpoints![2]!.x);
  });
});

describe('Äventyr 2: Morgonen efter', () => {
  it('is the room of the evening of the storm: the shelf, the window by it, the table and its chairs where they stood', () => {
    // Olov, 9 November 2026: "Hyllan med trägubbarna har bytt plats i huset. Den ska stå där den stod i Stormkvällen."
    expect(morgonen.shelf).toEqual(stormkvall.shelf);
    expect(morgonen.house!.windows).toEqual(expect.arrayContaining([...stormkvall.house!.windows]));
    expect(morgonen.furniture).toEqual(stormkvall.furniture);
    // The new latch is on the window the storm blew open, by the shelf.
    expect(morgonen.decor!.find((thing) => thing.look === 'latch')!.at.x).toBe(stormkvall.house!.opens);
  });

  it('ends in a scene of its own, at the door after the cup of cocoa, and only then', () => {
    expect(endsInScene(morgonen)).toBe(true);
    const last = morgonen.scenes!.find((scene) => scene.cues?.some((cue) => cue.flag === morgonen.goalNeeds))!;
    // It is due at the door once the cocoa's words are read, and stands him there while his last line, said on the
    // way to the door, is read (docs/dialogue.md): waiting for that line itself, it began wherever he had run on to.
    expect(last.needs).toBe('beat:moAnswer');
    expect(last.hold && last.quiet).toBe(true);
    const all = morgonen.beats!.find((beat) => beat.id === 'moAll')!;
    expect(all.needs).toBe('beat:moAnswer');
    expect(all.at!).toBeLessThan(last.at!);
    // The cocoa's words and the name are each told where they belong: he stands for them.
    for (const [id, lines] of [['fjun', ['moLatched', 'moFluff', 'moName']], ['kakao', ['moCup', 'moKnew', 'moAnswer']]] as const) {
      const scene = morgonen.scenes!.find((one) => one.id === id)!;
      expect(scene.hold, id).toBe(true);
      expect(scene.dialogue, id).toEqual(lines);
    }
  });

  it('stands him at the window for the name, at the table for the cocoa and at the door for the end', () => {
    // Read by a page, with the robot running on whenever it is let: the hardest player to keep in the picture.
    const result = listenThrough(morgonen, {}, 60, 600);
    expect(result.goal).toBe(true);
    const at = Object.fromEntries(result.scenes.map((scene) => [scene.id, scene.x]));
    const spot = (id: string) => morgonen.spots!.find((one) => one.id === id)!.at.x;
    // Hooking the latch while Pappa is still on his way to the window holds him there for it, and for the name.
    expect(Math.abs(at.haken! - spot('latch'))).toBeLessThan(1.5);
    expect(Math.abs(at.fjun! - spot('latch'))).toBeLessThan(1.5);
    // Taking the cup while the others still answer the name holds him at the table for what is said over it.
    expect(Math.abs(at.kakao! - spot('cocoa'))).toBeLessThan(1.5);
    // And his last line is read at the door, where they wave to him.
    expect(Math.abs(at.slut! - morgonen.scenes!.find((scene) => scene.id === 'slut')!.at!)).toBeLessThan(1);
  });

  it('puts both figures back, turns the latch, names the little one Fjun and ends on a cup of cocoa', () => {
    const result = playThrough(60, morgonen, {}, 300);
    expect(result.goal).toBe(true);
    expect(result.flags).toEqual(expect.arrayContaining(['shelf:old', 'shelf:small', 'latch', 'beat:moName', 'cocoa']));
    const order = ['moOld', 'moSmall', 'moLatched', 'moFluff', 'moName', 'moNice', 'moWelcome', 'moKnew', 'moAnswer', 'moAll'];
    expect(result.said.filter((id) => order.includes(id))).toEqual(order);
    expect(morgonen.decor).toContainEqual(expect.objectContaining({ look: 'tiny-cap', word: 'home', after: 'shelf:small' }));
  });

  it('does not end before the cocoa: walking past everything leaves him at the end of the room', () => {
    const game = new Game(morgonen, {});
    for (let frame = 0; frame < 60 * 60; frame++) game.frame(1 / 60, { x: 1, hopHeld: false }, { hop: false, act: false, helper: false });
    expect(game.sim.curr.x).toBeGreaterThan(morgonen.goalX);
    expect(game.sim.flags.has('goal')).toBe(false);
  });
});
