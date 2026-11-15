import { describe, expect, it } from 'vitest';
import { Group, InstancedMesh, Matrix4, Vector3 } from 'three';
import { Game } from '../../src/app/game';
import { A2 } from '../../src/content/aventyr2/sv';
import { BOWL, BOWL_FULL, BOWL_LEAP, BOWL_LEFT, GRAB, GRABS, LEAP_OVER, LEFT, SPILLED, grabAt, grabPlaces, inBowl } from '../../src/content/aventyr2/bowl';
import { candyBowl } from '../../src/content/aventyr2/candy-bowl';
import { morgonen } from '../../src/content/aventyr2/chapters/morgonen';
import { stormkvall } from '../../src/content/aventyr2/chapters/stormkvall';
import { BONUS, STORY } from '../../src/content/chapters';
import { HOME_LAYOUT } from '../../src/content/home-layout';
import type { ActorKey } from '../../src/sim/scene';

/**
 * The bowl of Saturday sweets (Olov, 14 November 2026: "Vi behöver en godisskål … Det ska tydligt synas när han tar
 * godiset ur skålen, eftersom Moa säger att …"). The fistful is the old trägubbe's, whose trail it becomes
 * (docs/aventyr-2.md): he takes it in the picture, in the scene of the window, before Moa says she saw him; the bowl is
 * emptier after, on the evening and the morning after; and the first adventure's home has no bowl.
 */
const table = HOME_LAYOUT.dining;
const fonstret = stormkvall.scenes!.find((scene) => scene.id === 'fonstret')!;
const LEAP = fonstret.cues!.find((cue) => cue.flag === BOWL_LEAP)!.at;
const bowlOf = (chapter: typeof stormkvall) => chapter.decor!.find((thing) => thing.look === 'candyBowl');

/** Where every sweet of a bowl is, in the room, and how big it is drawn. */
function sweetsOf(root: Group): { at: Vector3; size: number }[] {
  const out: { at: Vector3; size: number }[] = [];
  const matrix = new Matrix4();
  root.updateMatrixWorld(true);
  for (const child of root.children) {
    if (!(child instanceof InstancedMesh)) continue;
    for (let i = 0; i < child.count; i++) {
      child.getMatrixAt(i, matrix);
      matrix.premultiply(child.matrixWorld);
      // Read from the matrix itself: one drawn at no size has no turn to take apart.
      const e = matrix.elements;
      out.push({ at: new Vector3().setFromMatrixPosition(matrix), size: Math.hypot(e[0]!, e[1]!, e[2]!) });
    }
  }
  return out;
}
const inTheBowl = (sweet: { at: Vector3; size: number }) => sweet.size > 0.5 && Math.hypot(sweet.at.x - BOWL.x, sweet.at.z - BOWL.z) < BOWL.radius && sweet.at.y < BOWL.y + 1;

function staged(word?: string) {
  const story = { flags: new Set<string>(), still: false };
  const def = { ...bowlOf(stormkvall)!, ...(word ? { word } : {}) };
  const leaper = new Group();
  const prop = candyBowl({ id: 'decor:9', at: def.at, verb: 'take', look: 'candyBowl', ...(def.word ? { word: def.word } : {}) }, story, () => leaper, () => grabPlaces(stormkvall));
  prop.group.position.z = def.z!;
  return { story, prop, leaper };
}

describe('the bowl of Saturday sweets', () => {
  it('stands heaped on the table from the evening\'s first picture, clear of the candle and the flashlight', () => {
    const bowl = bowlOf(stormkvall)!;
    expect(bowl.at).toEqual({ x: BOWL.x, y: BOWL.y });
    expect(bowl.until).toBe(BOWL_LEAP);
    // On the table's top, all of it.
    expect(BOWL.x - BOWL.radius).toBeGreaterThanOrEqual(table.x - 2.5);
    expect(BOWL.x + BOWL.radius).toBeLessThan(table.x + 2.5);
    expect(BOWL.z - BOWL.radius).toBeGreaterThan(table.z - 1.1);
    expect(BOWL.z + BOWL.radius).toBeLessThan(table.z + 1.1);
    for (const look of ['candle', 'flashlight'] as const) {
      const thing = stormkvall.decor!.find((one) => one.look === look)!;
      expect(Math.hypot(thing.at.x - BOWL.x, thing.z! - BOWL.z), look).toBeGreaterThan(BOWL.radius + 0.25);
    }
    // In the opening picture.
    const opening = stormkvall.scenes!.find((scene) => scene.id === 'kvall')!.stage!.shots![0]!;
    expect(Math.abs(BOWL.x - opening.x)).toBeLessThan(opening.width! / 2 - BOWL.radius);
    // Full: heaped over its rim.
    const { prop } = staged();
    const sweets = sweetsOf(prop.group);
    expect(sweets).toHaveLength(BOWL_FULL);
    expect(sweets.every(inTheBowl)).toBe(true);
    expect(sweets.filter((sweet) => sweet.at.y > BOWL.y + BOWL.rim).length).toBeGreaterThanOrEqual(4);
  });

  it('is where the old one takes his fistful, in the picture, once the little one is gone and before Moa says she saw him', () => {
    // The old one waits on the shelf for his leap; the little one goes with the gust.
    const old = stormkvall.decor!.find((thing) => thing.look === 'tragubbe')!;
    expect(old.word).toBe(GRABS);
    expect(old.until).toBe(BOWL_LEAP);
    const cues = fonstret.cues!.map((cue) => cue.flag);
    expect(cues).toEqual(['gust', BOWL_LEAP]);
    // The leap comes after Elof has cried out for the little one, and nothing is said while it lasts: its picture is
    // not read past. What he says of the old one comes when he is gone.
    const lines = fonstret.lines!;
    const said = (line: string) => lines.find((one) => one.line === line)!.at;
    expect(said('skTaken')).toBeLessThan(LEAP);
    expect(lines.filter((line) => line.at > LEAP && line.at < LEAP + GRAB.out)).toEqual([]);
    expect(said('skLeapt')).toBeGreaterThan(LEAP + GRAB.out);
    expect(fonstret.hold).toBe(true);
    // The picture is on the bowl while he is in it: close enough that he is a fifth of its height.
    const shots = fonstret.stage!.shots!;
    const close = shots.filter((shot) => shot.at <= LEAP + GRAB.lands).at(-1)!;
    expect(close.at + (close.move ?? 1)).toBeLessThanOrEqual(LEAP + GRAB.lands + 0.1);
    expect(close.height).toBeLessThan(4.5);
    expect(Math.abs(close.x - BOWL.x)).toBeLessThan(close.width! / 2 - 1);
    expect(Math.abs(close.y - (BOWL.y + 0.8))).toBeLessThan(close.height / 2 - 0.9);
    // A knock as he lands, and the papers as he digs.
    expect(fonstret.sounds!.filter((sound) => sound.at >= LEAP + GRAB.lands && sound.at < LEAP + GRAB.lifts).map((sound) => sound.sound)).toEqual(['clatter', 'paper']);
    // Moa looks at the bowl as he is in it, and says what she saw when the trail is found, pointing at the bowl.
    const moa = fonstret.stage!.actors!.moa!.find((key) => key.at > LEAP && key.at < LEAP + GRAB.lifts)!;
    expect(Math.hypot(moa.aim!.x - BOWL.x, moa.aim!.z! - BOWL.z)).toBeLessThan(0.1);
    const spar = stormkvall.scenes!.find((scene) => scene.id === 'spar')!;
    const point = spar.stage!.actors!.moa!.find((key) => key.act === 'point')!;
    expect(Math.hypot(point.aim!.x - BOWL.x, point.aim!.z! - BOWL.z)).toBeLessThan(0.1);
    expect(point.at).toBeLessThan(spar.lines!.find((line) => line.line === 'skHandful')!.at);
    // And she names him: "honom" was read as Klonk.
    expect(A2.lines.skHandful).toMatch(/gamla trägubben/);
    expect(A2.lines.skHandful).toMatch(/näve/);
    expect(A2.lines.skHandful!.length).toBeLessThanOrEqual(42);
  });

  it('has him leap from the shelf into the bowl and out through the window, past everyone in the room', () => {
    const way = grabPlaces(stormkvall)!;
    const old = stormkvall.decor!.find((thing) => thing.look === 'tragubbe')!;
    expect(way.from).toEqual({ x: old.at.x, y: old.at.y, z: old.z });
    // Out through the opening in the wall: within the window, beyond the wall.
    const window = stormkvall.decor!.find((thing) => thing.look === 'casement')!;
    expect(way.out.z).toBeLessThan(HOME_LAYOUT.wall.z - 1);
    const through = (HOME_LAYOUT.wall.z - inBowl().z) / (way.out.z - inBowl().z);
    const crossing = grabAt(GRAB.leaps + through * (GRAB.out - GRAB.leaps), way.from, way.out).at;
    expect(Math.abs(crossing.x - window.at.x)).toBeLessThan(2.2);
    expect(Math.abs(crossing.y - window.at.y)).toBeLessThan(2.2);
    // Where each of the family stands while he leaps, and how tall: his way is clear of them all.
    const tall = { pappa: 5.2, mamma: 5.2, moa: 4.0, bertil: 3.12 } as const;
    const kvall = stormkvall.scenes!.find((scene) => scene.id === 'kvall')!.stage!.actors!;
    const stands = (who: keyof typeof tall) => {
      const keys: readonly ActorKey[] = [...kvall[who]!, ...fonstret.stage!.actors![who]!.filter((key) => key.at < LEAP)];
      const moved = (pick: 'x' | 'z') => keys.filter((key) => key[pick] !== undefined).at(-1)![pick]!;
      // Everyone has come to where they stand before he leaps.
      for (const key of fonstret.stage!.actors![who]!) if (key.x !== undefined) expect(key.at + (key.move ?? 0.6), who).toBeLessThan(LEAP);
      return { x: moved('x'), z: moved('z') };
    };
    for (let since = 0; since < GRAB.out; since += 1 / 60) {
      const at = grabAt(since, way.from, way.out).at;
      for (const who of ['pappa', 'mamma', 'moa', 'bertil'] as const) {
        const body = stands(who);
        const beside = Math.hypot(at.x - body.x, at.z - body.z);
        expect(beside > 0.95 || at.y > tall[who] + 0.15, `${who} at ${since.toFixed(2)} s: ${beside.toFixed(2)} beside, ${at.y.toFixed(2)} up`).toBe(true);
      }
    }
    // He lands in the bowl, and stands in it while he digs.
    for (const since of [GRAB.lands + 0.02, (GRAB.lands + GRAB.lifts) / 2, GRAB.leaps - 0.02]) {
      const at = grabAt(since, way.from, way.out).at;
      expect(Math.hypot(at.x - BOWL.x, at.z - BOWL.z)).toBeLessThan(0.01);
      expect(at.y).toBeGreaterThan(BOWL.y + 0.1);
      expect(at.y).toBeLessThan(BOWL.y + BOWL.rim);
    }
    expect(grabAt((GRAB.lands + GRAB.lifts) / 2, way.from, way.out).dig).toBeGreaterThan(0.8);
    expect(grabAt(GRAB.lifts, way.from, way.out).gathered).toBe(1);
  });

  it('is drawn: he is seen in the bowl, his arms full as he leaves, and the bowl is emptier after, with sweets spilt beside it', () => {
    const { story, prop, leaper } = staged();
    const way = grabPlaces(stormkvall)!;
    const shown = () => leaper.visible;
    let clock = 0;
    const play = (seconds: number, used: boolean) => { for (let t = 0; t < seconds - 1e-9; t += 1 / 60) prop.update(used, clock += 1 / 60, 1 / 60); };
    const at = () => leaper.getWorldPosition(new Vector3());
    // The evening before the gust: the bowl full, and nobody leaping.
    play(1, false);
    expect(shown()).toBe(false);
    expect(sweetsOf(prop.group).filter(inTheBowl)).toHaveLength(BOWL_FULL);
    // His leap: from the shelf …
    story.flags.add(BOWL_LEAP);
    play(1 / 60, true);
    expect(shown()).toBe(true);
    expect(at().distanceTo(new Vector3(way.from.x, way.from.y, way.from.z))).toBeLessThan(0.05);
    // … down into the bowl, where he bends into the sweets …
    play(GRAB.lands + 0.3 - 1 / 60, true);
    expect(shown()).toBe(true);
    expect(Math.hypot(at().x - BOWL.x, at().z - BOWL.z)).toBeLessThan(0.02);
    expect(leaper.rotation.x).toBeGreaterThan(0.5);
    // … and up and out with four in his arms, wherever he is, and two after him.
    play(GRAB.leaps + 0.35 - (GRAB.lands + 0.3), true);
    expect(shown()).toBe(true);
    expect(at().y).toBeGreaterThan(BOWL.y + 1);
    const flying = sweetsOf(prop.group).filter((sweet) => sweet.size > 0.5 && !inTheBowl(sweet) && sweet.at.y > BOWL.y + 0.5);
    const carried = flying.filter((sweet) => sweet.at.distanceTo(at()) < 0.75);
    expect(carried).toHaveLength(4);
    expect(flying.length - carried.length).toBe(2);
    // Gone out into the dark: the bowl is half empty, four lie spilt on the table beside it, and the rest went with him.
    play(GRAB.out - (GRAB.leaps + 0.35) + 1.5, true);
    expect(shown()).toBe(false);
    const after = sweetsOf(prop.group).filter((sweet) => sweet.size > 0.5);
    expect(after.filter(inTheBowl)).toHaveLength(BOWL_LEFT);
    expect(BOWL_LEFT).toBeLessThanOrEqual(BOWL_FULL / 2);
    // What is left lies below the rim: seen through the glass, not heaped over it.
    expect(after.filter(inTheBowl).every((sweet) => sweet.at.y < BOWL.y + BOWL.rim - 0.1)).toBe(true);
    const spilt = after.filter((sweet) => !inTheBowl(sweet));
    expect(spilt).toHaveLength(SPILLED.length);
    for (const sweet of spilt) {
      expect(Math.hypot(sweet.at.x - BOWL.x, sweet.at.z - BOWL.z)).toBeGreaterThan(BOWL.radius + 0.1);
      expect(sweet.at.y).toBeCloseTo(BOWL.y + 0.075, 2);
      expect(sweet.at.x).toBeLessThan(table.x + 2.4);
      expect(Math.abs(sweet.at.z - table.z)).toBeLessThan(1.0);
    }
  });

  it('is as he left it in a game taken up later, in a picture that keeps still, and in a game saved before there was a bowl', () => {
    for (const how of ['later', 'still', 'old save'] as const) {
      const { story, prop, leaper } = staged();
      story.flags.add(BOWL_LEAP);
      if (how === 'still') { story.still = true; prop.update(false, 0, 0); }
      // An old save: the scene is over, and its leap flag comes a step after the first picture.
      if (how === 'old save') { story.flags.add(LEAP_OVER); prop.update(false, 0, 1 / 60); }
      for (let frame = 1; frame < 30; frame++) {
        prop.update(true, frame / 60, 1 / 60);
        expect(leaper.visible, how).toBe(false);
        expect(sweetsOf(prop.group).filter((sweet) => sweet.size > 0.5).filter(inTheBowl), how).toHaveLength(BOWL_LEFT);
      }
    }
    // That save: the leap's flag is set from the scene's.
    const game = new Game(stormkvall, {}, { checkpoint: 0, flags: ['scene:kvall', 'lamp:take', 'lamp:give', 'beat:skLampThanks', 'goodnight', 'gust', LEAP_OVER, 'scene:klonkstar', 'star', 'scene:krymper', 'scene:tillsammans'] });
    expect(game.sim.flags.has(BOWL_LEAP)).toBe(false);
    game.frame(1 / 60, { x: 0, hopHeld: false }, { hop: false, act: false, helper: false });
    expect(game.sim.flags.has(BOWL_LEAP)).toBe(true);
  });

  it('stands there still the morning after, with what he left; and the first adventure\'s home has none', () => {
    const morning = bowlOf(morgonen)!;
    expect(morning.word).toBe(LEFT);
    expect(morning.at).toEqual(bowlOf(stormkvall)!.at);
    expect(morning.z).toBe(bowlOf(stormkvall)!.z);
    expect(morning.until).toBeUndefined();
    const { prop, leaper } = staged(LEFT);
    prop.update(false, 0, 1 / 60);
    expect(leaper.parent).toBeNull();
    const left = sweetsOf(prop.group).filter((sweet) => sweet.size > 0.5);
    expect(left).toHaveLength(BOWL_LEFT);
    expect(left.every(inTheBowl)).toBe(true);
    // Its Saturday sweets are in the bag the ghost takes.
    for (const chapter of [...STORY, ...BONUS]) expect(chapter.decor?.some((thing) => thing.look === 'candyBowl') ?? false, chapter.id).toBe(false);
  });
});
