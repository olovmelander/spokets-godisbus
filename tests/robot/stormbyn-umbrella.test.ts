import { describe, expect, it, vi } from 'vitest';
import { BREDBYN_LANDMARKS } from '../../art/procedural/bredbyn-landmarks';
import { Game } from '../../src/app/game';
import '../../src/content/aventyr2/aventyr2';
import { stormbyn } from '../../src/content/aventyr2/chapters/stormbyn';
import { words } from '../../src/content/aventyr2/lines/stormbyn';
import { BREDBYN_CHURCH, churchAt } from '../../src/content/bredbyn';
import { sv } from '../../src/content/sv';
import { heightAt as groundAt, makeKit } from '../../src/render/dressing/kit';
import { familyShot } from '../../src/render/family-shot';
import { plant } from '../../src/render/lift/flora/trees';
import { STANDING } from '../../src/render/rig';
import { createMoaAnswer, MOA_ANSWERS } from '../../src/render/umbrella-thanks';
import { LAMP_POST, STREET_DEPTH, villageLife } from '../../src/render/village';
import { waterKind, waterShape } from '../../src/render/water';
import { cameraIntent } from '../../src/sim/camera-intent';
import { Sim } from '../../src/sim/sim';
import type { PlayerState } from '../../src/sim/types';
import { decide } from './robot';

/**
 * Olov's list of 14 November 2026, in Byn i stormen. Point 19: "Kan vi göra kyrkan mer synlig i bakgrunden när Moa ger
 * Elof sitt paraply? Nu syns bara halva kyrkan." Point 20: "Elof ska tacka Moa efter att han har flugit med paraplyet."
 */
const call = stormbyn.spots!.find((spot) => spot.id === 'umbrella:ready')!;
const board = stormbyn.spots!.find((spot) => spot.ride === 'umbrella')!;
const umbrella = stormbyn.rides!.find((ride) => ride.id === 'umbrella')!;
const WALL = call.at.y;

describe('Byn i stormen: the church behind Moa and her umbrella (point 19)', () => {
  const SCREENS = [[1280, 720], [844, 390], [390, 844], [1180, 820], [1440, 900]] as const;
  const TAN = Math.tan((30 * Math.PI) / 360);
  const church = churchAt('stormbyn'), s = BREDBYN_CHURCH.scale;
  /** The nave's walls and the belfry's foot, from end to end, and their fronts; the roofs' eaves; the belfry's top. */
  const nave = { from: church.x - (BREDBYN_LANDMARKS.church.wide / 2) * s, to: church.x + (BREDBYN_LANDMARKS.church.wide / 2) * s, front: BREDBYN_CHURCH.z + (BREDBYN_LANDMARKS.church.deep / 2) * s };
  const belfry = { from: church.x + (BREDBYN_LANDMARKS.tower.x - 3.45) * s, to: church.x + (BREDBYN_LANDMARKS.tower.x + 3.45) * s, front: BREDBYN_CHURCH.z + (BREDBYN_LANDMARKS.tower.z + 3.3) * s, eave: church.x + (BREDBYN_LANDMARKS.tower.x + 3.6) * s };
  const top = church.y + BREDBYN_LANDMARKS.tower.tall * s;
  /** The lens where she holds the umbrella out and he stands to take it, on a screen: where it is, and how far a point is from the picture's middle (1 at its edge). */
  const lens = (width: number, height: number, elofX: number, moaX: number) => {
    const aspect = width / height;
    const view = Math.max(height / Math.min(140, Math.max(75, height * 0.2)), 6 / aspect);
    const zone = cameraIntent({ x: elofX, y: WALL, facing: 1, mode: 'free', groundY: WALL, standY: WALL, hook: null, vy: 0 } as unknown as PlayerState, stormbyn.cameras);
    const shot = familyShot({ x: elofX, y: WALL }, { x: moaX, y: WALL }, view * zone.zoom, aspect, call.vista);
    const away = shot.height / 2 / TAN;
    return {
      shot,
      across: (x: number, z: number) => (x - shot.x) / ((away - z) * TAN * aspect),
      up: (y: number, z: number) => (y - shot.y) / ((away - z) * TAN),
      /** What something at x, z stands in front of at the church's depth. */
      shadow: (x: number, z: number, depth: number) => shot.x + ((x - shot.x) * (away - depth)) / (away - z),
    };
  };
  /** Where he stands to take it, and where she holds it out: its canopy reaches this far beyond its crook. */
  const TAKES = board.at.x - 0.4, CANOPY = 1.3;

  it('stands over the flooded crossing, to the right of the wall, with nothing of the street before it', () => {
    const flood = stormbyn.water!.find((pool) => pool.from === 103)!;
    // Its nave begins beyond the wall's edge and its belfry ends before the shoemaker's house: over the open flood.
    expect(nave.from).toBeGreaterThan(call.goesTo!.x);
    expect(nave.from).toBeLessThan(flood.from);
    expect(belfry.to).toBeGreaterThan(flood.to);
    expect(belfry.to).toBeLessThan(flood.to + 1);
    // It stood behind the wall, at 97.8: behind Moa and her umbrella.
    expect(church.x).toBeGreaterThan(flood.from + 3);
    // No birch of the flora stands in the yard before it, and no lamp post on the pavement before it.
    // The kit draws bark on a canvas: there is none here, and none is needed.
    const context = new Proxy({}, { get: () => () => undefined, set: () => true });
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => context }) });
    makeKit();
    const trees = plant(stormbyn, null);
    vi.unstubAllGlobals();
    for (const tree of [...trees.birch, ...trees.spruce, ...trees.pine]) {
      expect(tree.x < nave.from - 4 || tree.x > belfry.eave + 4 || tree.z < BREDBYN_CHURCH.z - 6, `a tree at ${tree.x.toFixed(1)}, ${tree.z.toFixed(1)}`).toBe(true);
    }
    for (const post of stormbyn.lampPosts!) expect(post < call.at.x - 10 || post > flood.to, `the lamp post at ${post}`).toBe(true);
  });

  it('is whole in the picture where she hands him the umbrella, on every screen, clear of her umbrella and of the shoemaker\'s gable', () => {
    for (const [width, height] of SCREENS) {
      const name = `${width}x${height}`;
      const { shot, across, up, shadow } = lens(width, height, TAKES, call.goesTo!.x);
      // The two of them stand in the picture's near third, and the picture looks on over the crossing.
      expect(across(TAKES, 0), name).toBeGreaterThan(-0.72);
      expect(across(call.goesTo!.x, call.goesTo!.z), name).toBeGreaterThan(-0.82);
      expect(across(TAKES, 0), name).toBeLessThan(-0.3);
      expect(shot.x, name).toBeGreaterThan(umbrella.from.x + 3);
      // From its nave's left end to its belfry's right eave, and from its foot to the belfry's top under the words.
      expect(across(nave.from, nave.front), name).toBeGreaterThan(-0.97);
      expect(across(belfry.eave, belfry.front), name).toBeLessThan(0.97);
      expect(up(top, BREDBYN_CHURCH.z), name).toBeLessThan(0.62);
      expect(up(church.y, nave.front), name).toBeGreaterThan(-0.6);
      // Her umbrella, held out over the edge, ends short of the nave: on a screen held sideways wholly; upright, where
      // the picture is narrow, it may reach before the nave's first eighth, short of its porch.
      const canopy = shadow(umbrella.from.x + CANOPY, 0, nave.front);
      const over = (canopy - nave.from) / (nave.to - nave.from);
      if (width > height) expect(over, name).toBeLessThanOrEqual(0);
      else expect(over, name).toBeLessThan(0.125);
      // The shoemaker's gable reaches back 17 EL from its front (src/render/village.ts SIDE), and its corner board a
      // little further: the belfry is seen to the left of its far end.
      const house = stormbyn.street!.find((part) => part.depth === 'near' && part.from >= umbrella.to.x - 2)!;
      expect(shadow(house.from, STREET_DEPTH.near - 17.6, belfry.front), name).toBeGreaterThan(belfry.eave);
      // And no lamp post stands in the picture before it.
      for (const post of stormbyn.lampPosts!) {
        const at = shadow(post + 1.2, LAMP_POST.z, BREDBYN_CHURCH.z);
        expect(at < nave.from || shadow(post - 1.2, LAMP_POST.z, BREDBYN_CHURCH.z) > belfry.eave, `${name}: the post at ${post}`).toBe(true);
      }
    }
  });

  it('is whole before he calls her too, from beside her on the wall, on a screen held sideways', () => {
    for (const [width, height] of SCREENS.filter(([w, h]) => w > h)) {
      const name = `${width}x${height}`;
      const { across, shadow } = lens(width, height, call.at.x, call.at.x);
      expect(across(nave.from, nave.front), name).toBeGreaterThan(-0.97);
      expect(across(belfry.eave, belfry.front), name).toBeLessThan(0.97);
      // She holds the umbrella over her head there: its canopy ends short of the nave.
      expect(shadow(call.at.x + CANOPY, call.goesTo!.z, nave.front), name).toBeLessThan(nave.from);
    }
  });

  it('has the flood\'s far shore at the street\'s height, not the wall\'s: no dark bank stands before its walls', () => {
    const shape = waterShape(stormbyn.water!, waterKind('village'), { from: stormbyn.ground[0]!.x, to: stormbyn.ground.at(-1)!.x }, (x) => groundAt(stormbyn, x));
    const shore: { x: number; y: number }[] = [];
    for (let i = 0; i < shape.position.length / 3; i++) if (shape.part[i * 4] === 2) shore.push({ x: shape.position[i * 3]!, y: shape.position[i * 3 + 1]! });
    const flood = shore.filter((corner) => corner.x >= 103 && corner.x <= 118);
    expect(flood.length).toBeGreaterThan(0);
    // The street beyond the crossing is at 0, the wall's top at 5: the shore is the street's, well under the church's foot.
    expect(Math.max(...flood.map((corner) => corner.y))).toBe(groundAt(stormbyn, 118.2));
    expect(Math.max(...flood.map((corner) => corner.y))).toBeLessThan(church.y - 2);
    expect(groundAt(stormbyn, 102.8)).toBe(WALL);
  });

  it('keeps the passer-by on the road behind the crossing out of that picture while he is on the wall', () => {
    const clear = stormbyn.streetClear!;
    const life = villageLife(stormbyn);
    const legs = life.group.getObjectByName('passing-shoes')!;
    // Away from the wall the legs walk the whole street, past the church too.
    let passed = false;
    for (let clock = 0; clock < 60; clock += 1 / 30) {
      life.update(clock, { x: 60, y: 0 });
      passed ||= legs.position.x > nave.from && legs.position.x < belfry.to;
    }
    expect(passed).toBe(true);
    // He comes up onto the wall as they are far off: they come as far as the stretch's near end, and wait there.
    const waits = villageLife(stormbyn), waiting = waits.group.getObjectByName('passing-shoes')!;
    for (let clock = 0; clock < 120; clock += 1 / 30) {
      waits.update(clock, { x: clock < 31 ? 60 : call.at.x, y: WALL });
      if (clock > 36) expect(waiting.position.x).toBeLessThanOrEqual(clear.from + 0.01);
    }
    // Out of the picture from the wall: left of where it begins on the widest screen.
    const { across } = lens(844, 390, stormbyn.streetClear!.while[0], call.at.x);
    expect(across(clear.from + 2, -12.2)).toBeLessThan(-1);
    // And they walk on once he has gone: in the air, landed and thanking her they still wait; beyond that, no more.
    expect(clear.while[0]).toBeLessThan(call.at.x - 2);
    expect(clear.while[1]).toBeGreaterThan(umbrella.to.x + 1);
    for (let clock = 120; clock < 130; clock += 1 / 30) waits.update(clock, { x: 126, y: 0 });
    expect(waiting.position.x).toBeGreaterThan(clear.from + 20);
    // A game taken up on the wall as they pass: they have not come yet.
    const later = villageLife(stormbyn);
    later.update(12, { x: call.at.x, y: WALL });
    expect(later.group.getObjectByName('passing-shoes')!.position.x).toBeCloseTo(clear.from, 5);
  });
});

describe('Byn i stormen: Elof thanks Moa after the flight (point 20)', () => {
  const scene = stormbyn.scenes!.find((one) => one.id === 'tack-moa')!;
  /** The robot from the big candy on the wall until `done`. */
  function play(done: (game: Game) => boolean, each: (game: Game) => void = () => {}, seconds = 60): Game {
    const game = new Game(stormbyn, {}, { checkpoint: 4, flags: ['leaf'] });
    let wasAhead = false, wasOffered = false;
    for (let frame = 0; frame < 60 * seconds && !done(game); frame++) {
      const d = decide(game, stormbyn);
      game.frame(1 / 60, { x: d.x, y: d.y, hopHeld: true }, { hop: d.ahead && !wasAhead, act: d.offered && !wasOffered, helper: false });
      wasAhead = d.ahead;
      wasOffered = d.offered;
      each(game);
    }
    return game;
  }

  it('lands, turns and thanks her standing, in his own words, before he goes on', () => {
    let thanksAt: number | null = null, heldAt: number | null = null;
    const game = play((g) => g.sim.flags.has('scene:tack-moa'), (g) => {
      if (thanksAt === null && g.sim.said.includes('sbThanksMoa')) thanksAt = g.sim.curr.x;
      if (g.sim.sceneFrame?.id === 'tack-moa') { heldAt ??= g.sim.curr.x; expect(g.sim.held).toBe(true); }
    });
    expect(game.sim.flags.has('scene:tack-moa')).toBe(true);
    // Where the umbrella sets him down, on his own feet.
    expect(heldAt).toBeCloseTo(umbrella.to.x, 1);
    expect(thanksAt).toBeCloseTo(umbrella.to.x, 1);
    expect(game.sim.curr.mode).toBe('free');
    // His own words, about her umbrella and the flight: short, and with her name.
    expect(words.lines.sbThanksMoa).toMatch(/^Tack, Moa!/);
    expect(words.lines.sbThanksMoa).toMatch(/paraply/);
    expect(words.lines.sbThanksMoa!.length).toBeLessThanOrEqual(40);
    expect(scene.lines).toEqual([expect.objectContaining({ who: 'elof', line: 'sbThanksMoa' })]);
    expect(scene.hold).toBe(true);
    // He turns back to her and waves.
    const turned = scene.stage!.elof![0]!;
    expect(turned.face).toBe(0.5);
    expect(turned.act).toBe('wave');
    expect(turned.aim!.x).toBe(call.goesTo!.x);
  });

  it('has Moa on the wall and him on the far side in one picture, each well inside it, her head under the words', () => {
    const wide = scene.stage!.shots!.at(-1)!;
    for (const [width, height] of [[1280, 720], [844, 390], [1180, 820]] as const) {
      const aspect = width / height;
      const tall = Math.max(wide.height, wide.width! / aspect), across = tall * aspect;
      expect((call.goesTo!.x - wide.x) / (across / 2), `${width}x${height}`).toBeGreaterThan(-0.85);
      expect((umbrella.to.x - wide.x) / (across / 2), `${width}x${height}`).toBeLessThan(0.85);
      // Her head (she is 3.7 EL tall) under the reading card, which takes the picture's top quarter on a phone held sideways.
      expect((WALL + 3.7 - wide.y) / (tall / 2), `${width}x${height}`).toBeLessThan(0.5);
      expect((umbrella.to.y - wide.y) / (tall / 2), `${width}x${height}`).toBeGreaterThan(-0.85);
    }
    // It is shown before the words come.
    expect(scene.lines![0]!.at).toBeGreaterThanOrEqual(wide.at + (wide.move ?? 1));
  });

  it('is told once: not in a game taken up at the big candy beyond it, nor before he has flown', () => {
    const beyond = new Sim(stormbyn, {}, { checkpoint: 5, flags: ['leaf', 'umbrella:ready', 'family:umbrella-ready', 'umbrella'] });
    expect(beyond.flags.has('scene:tack-moa')).toBe(true);
    const before = new Sim(stormbyn, {}, { checkpoint: 4, flags: ['leaf'] });
    for (let i = 0; i < 300; i++) before.step({ x: 0, y: 0, hopHeld: false, hop: false, act: false });
    expect(before.sceneFrame).toBeNull();
    expect(before.said).not.toContain('sbThanksMoa');
  });

  it('Moa cheers and waves back with her free arm when she hears it, and stands again when her answer is over', () => {
    const lines: Record<string, string> = sv.lines;
    const answer = createMoaAnswer();
    const said = { who: 'elof' as const, text: lines[MOA_ANSWERS.line]!, seconds: 0, reading: true };
    const first = { ...STANDING };
    answer.update(said, 1 / 60, false, undefined, first);
    expect(first.armL).toBeCloseTo(STANDING.armL, 5);
    let cheered = 0, waved = 0;
    for (let t = 0; t < 7; t += 1 / 60) {
      const posed = { ...STANDING };
      said.seconds = t;
      answer.update(t < 5.5 ? said : null, 1 / 60, false, undefined, posed);
      if (t < MOA_ANSWERS.wave) cheered = Math.max(cheered, posed.armL);
      else waved = Math.max(waved, posed.armL);
      // Her wave is her left arm's: the right has her lamp.
      if (t > MOA_ANSWERS.wave + 0.3) expect(posed.armR).toBeLessThan(0.6);
    }
    expect(cheered).toBeGreaterThan(2.3);
    expect(waved).toBeGreaterThan(1.5);
    const after = { ...STANDING };
    answer.update(null, 1 / 60, false, undefined, after);
    expect(after).toEqual(STANDING);
    // Nobody else's words, and none of his others, make her cheer.
    const other = createMoaAnswer(), still = { ...STANDING };
    other.update({ who: 'elof', text: lines.sbFloat!, seconds: 2, reading: true }, 1 / 60, false, undefined, still);
    other.update({ who: 'moa', text: lines[MOA_ANSWERS.line]!, seconds: 2, reading: true }, 1 / 60, false, undefined, still);
    expect(still).toEqual(STANDING);
  });
});
