import { describe, expect, it } from 'vitest';
import { CylinderGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import '../../src/content/aventyr2/aventyr2';
import { stormskog } from '../../src/content/aventyr2/chapters/stormskog';
import { EAT, jayStandIn } from '../../src/render/jay';
import { bringPose, bringSeconds, bringTimes, broughtDown, buildJayLichen, snagOf } from '../../src/render/jay-lichen';
import { STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import { idle, run, use, walkTo } from './drive';

/**
 * Olov's list of 14 November 2026, point 18: in Stormskogen the beard lichen came down the high root the moment the jay
 * was given its berry. Now the jay flies up over the edge and tugs it loose, and it is there to climb once it has
 * unrolled to the ground: never before, and always in a game taken up after the berry.
 */
const lichen = stormskog.climbs!.find((climb) => climb.broughtBy)!;
const by = lichen.broughtBy!;
const scene = stormskog.scenes!.find((one) => one.id === by.scene)!;
const jay = stormskog.spots!.find((spot) => spot.id === by.jay)!;
/** The big candy before the jay, the hollow's memory told. */
const BEFORE = { checkpoint: 8, flags: ['ss:hollow', 'beat:ss:hollow', 'beat:ss:alone', 'beat:ss:why', 'beat:ss:both', 'scene:ss:minnet'] };

describe('the beard lichen the jay brings down in Stormskogen', () => {
  it('is not there when he gives the berry: the jay flies up and tugs it loose, and only then can he climb', () => {
    const sim = new Sim(stormskog, {}, { ...BEFORE, flags: [...BEFORE.flags, 'berry'] });
    run(sim, 0.2);
    walkTo(sim, jay.at.x - 0.7);
    expect(sim.curr.word).toBe('giveJay');
    use(sim);
    expect(sim.flags.has(by.jay)).toBe(true);
    expect(sim.sceneFrame?.id).toBe(by.scene);
    // He is free all the while: nothing holds a child who runs on.
    expect(sim.held).toBe(false);
    expect(broughtDown(lichen, sim.flags, sim.sceneFrame)).toBe(0);
    // He runs to the root's foot and pushes on against it: nothing hangs there, and he stays on the ground.
    let held = false;
    while (sim.sceneFrame && sim.sceneFrame.seconds < by.at - 0.05) {
      sim.step({ ...idle, x: 1 });
      held ||= sim.held;
      expect(sim.curr.mode).toBe('free');
      expect(sim.flags.has(lichen.needs!)).toBe(false);
      expect(broughtDown(lichen, sim.flags, sim.sceneFrame)).toBe(0);
    }
    expect(held).toBe(false);
    expect(sim.curr.x).toBeGreaterThan(lichen.x - 0.5);
    expect(sim.curr.y).toBeLessThan(0.5);
    // It unrolls, and as it reaches the ground it is his to climb: still pushing on, he takes hold of it.
    while (sim.sceneFrame && sim.sceneFrame.seconds < by.at + by.seconds - 2 * STEP) {
      sim.step({ ...idle, x: 1 });
      expect(sim.curr.mode).toBe('free');
      const down = broughtDown(lichen, sim.flags, sim.sceneFrame)!;
      expect(down).toBeGreaterThanOrEqual(0);
      expect(down).toBeLessThan(1);
    }
    run(sim, 0.2, { x: 1 });
    expect(sim.flags.has(lichen.needs!)).toBe(true);
    expect(sim.curr.mode).toBe('climb');
    run(sim, 6, { x: 1 });
    expect(sim.curr.y).toBeCloseTo(lichen.top, 1);
    expect(sim.flags.has(`scene:${by.scene}`)).toBe(true);
    // Once its scene is over the climb's own flag decides, as for any hose.
    expect(broughtDown(lichen, sim.flags, null)).toBeNull();
  });

  it('hangs down in a game taken up after the berry, without the flight being played again', () => {
    const sim = new Sim(stormskog, {}, { ...BEFORE, flags: [...BEFORE.flags, 'berry', by.jay, 'beat:ss:jay-glad'] });
    expect(sim.flags.has(`scene:${by.scene}`)).toBe(true);
    run(sim, 0.1);
    expect(sim.flags.has(lichen.needs!)).toBe(true);
    expect(sim.sceneFrame).toBeNull();
    run(sim, 14, { x: 1 });
    expect(sim.curr.x).toBeGreaterThan(lichen.x);
    expect(sim.curr.y).toBeCloseTo(lichen.top, 1);
  });

  it('is told in a scene he is free in, long enough for the jay\'s whole part, that makes it climbable as it reaches the ground', () => {
    expect(scene.hold).toBeFalsy();
    expect(scene.live).toBe(true);
    expect(scene.on).toBe(by.jay);
    expect(scene.seconds).toBeGreaterThanOrEqual(bringSeconds(by));
    expect(scene.cues).toEqual([{ at: by.at + by.seconds, flag: lichen.needs }]);
    expect(stormskog.sets).toContainEqual({ flag: lichen.needs, when: [`scene:${by.scene}`] });
    // The wait is short: he climbs within five seconds of giving the berry.
    expect(by.at + by.seconds).toBeLessThanOrEqual(4.2);
    // The berry is swallowed before it springs; it is in the air for a second; it pecks before the lichen is free.
    const T = bringTimes(by.at);
    expect(T.springs).toBeGreaterThanOrEqual(EAT.swallowed);
    expect(T.flies).toBeGreaterThan(T.springs);
    expect(T.touchdown - T.flies).toBeGreaterThan(0.8);
    expect(T.pecks).toBeGreaterThan(T.touchdown);
    expect(T.loose).toBeGreaterThan(T.pecks);
    expect(T.loose).toBe(by.at);
  });

  it('shows the jay eat, fly up over the edge, tug at the bundle on the snag, and sit at its tip looking back at him', () => {
    const snag = snagOf(lichen);
    const ground = new Vector3(jay.at.x, jay.at.y, -0.6);
    const T = bringTimes(by.at);
    const pose = (t: number) => bringPose(t, by, ground, snag, -1);
    // The snag stands at the lichen's top, out over the face on the side away from the ledge he steps onto.
    expect(snag.hang.x).toBe(lichen.x);
    expect(snag.hang.y).toBeGreaterThan(lichen.top);
    expect(Math.sign(snag.tip.x - lichen.x)).toBe(-lichen.exit!);
    expect(snag.tugs.y).toBeGreaterThan(lichen.top);
    expect(snag.sits.y).toBeGreaterThan(lichen.top);
    // From the climb's own numbers: moved with the ground, it is where the climb is.
    const moved = snagOf({ ...lichen, x: lichen.x + 3, top: lichen.top + 2 });
    expect(moved.tugs.x - snag.tugs.x).toBeCloseTo(3, 6);
    expect(moved.tugs.y - snag.tugs.y).toBeCloseTo(2, 6);
    // On the ground it eats, turned to him, the berry in its bill until it is swallowed.
    const eating = pose((EAT.from + EAT.swallowed) / 2);
    expect(eating.at.distanceTo(ground)).toBe(0);
    expect(eating.aloft).toBe(false);
    expect(eating.heading).toBe(-1);
    expect(eating.berry).toBe(true);
    expect(eating.clips).toEqual([expect.objectContaining({ name: 'eat', weight: 1 })]);
    expect(pose(T.springs).berry).toBe(false);
    // It flies up between the two, over the edge: higher than where it lands, and never below the ground.
    let highest = -Infinity;
    for (let t = T.flies + 0.02; t < T.touchdown; t += 0.02) {
      const flying = pose(t);
      expect(flying.aloft && flying.flying).toBe(true);
      expect(flying.at.y).toBeGreaterThan(ground.y);
      expect(flying.at.x).toBeGreaterThanOrEqual(ground.x);
      expect(flying.at.x).toBeLessThanOrEqual(snag.tugs.x);
      expect(flying.heading).toBeCloseTo(1, 5);
      highest = Math.max(highest, flying.at.y);
    }
    expect(highest).toBeGreaterThan(snag.tugs.y + 0.3);
    expect(pose((T.flies + T.touchdown) / 2).clips.some((clip) => clip.name === 'fly' && clip.weight > 0.9)).toBe(true);
    // Down on the snag it pecks at the bundle, and its second stab is the tug that frees the lichen.
    const pecking = pose(T.pecks + 0.3);
    expect(pecking.at.distanceTo(snag.tugs)).toBeLessThan(1e-6);
    expect(pecking.clips.some((clip) => clip.name === 'peck' && clip.weight > 0.9)).toBe(true);
    expect(pose(by.at).tug).toBeCloseTo(1, 5);
    expect(pose(T.touchdown + 0.05).tug).toBe(0);
    // Then it hops out to the tip, turns back to where he stands, and sits.
    const sitting = pose(scene.seconds);
    expect(sitting.at.distanceTo(snag.sits)).toBeLessThan(1e-6);
    expect(sitting.heading).toBeCloseTo(-1, 5);
    expect(sitting.settled).toBe(1);
    expect(sitting.aloft).toBe(true);
    // With less motion it is on the ground, and then on the snag: nothing flies.
    expect(bringPose(T.flies - 0.1, by, ground, snag, -1, true).at.distanceTo(ground)).toBe(0);
    expect(bringPose(T.flies + 0.1, by, ground, snag, -1, true).at.distanceTo(snag.sits)).toBe(0);
    expect(broughtDown(lichen, new Set([by.jay]), { id: by.scene, seconds: by.at - 0.01 }, true)).toBe(0);
    expect(broughtDown(lichen, new Set([by.jay]), { id: by.scene, seconds: by.at + 0.01 }, true)).toBe(1);
  });

  it('draws the bundle on the snag until it has unrolled, and puts the jay on the snag from then on', () => {
    const climbs = new Group();
    const strand = new Mesh(new CylinderGeometry(0.06, 0.06, 4.25).translate(0, -4.25 / 2, 0), new MeshStandardMaterial());
    strand.name = `climb:lichen:${lichen.x}`;
    climbs.add(strand);
    const place = new Group();
    place.position.set(jay.at.x, jay.at.y, -0.6);
    const bird = jayStandIn();
    place.add(bird);
    const made = buildJayLichen(stormskog, climbs);
    const bundle = made.group.getObjectByName(`climb:lichen:${lichen.x}:bundle`)!;
    const snag = snagOf(lichen);
    const frame = (flags: string[], seconds: number | null, elofX = jay.at.x - 0.8) => made.update({
      flags: new Set(flags), scene: seconds === null ? null : { id: by.scene, seconds }, bird: place,
      elof: { x: elofX, y: 0, climbing: false }, clock: 10 + (seconds ?? 0), dt: 1 / 60, calm: false,
    });
    // Before the berry: the bundle hangs on the snag, and the jay is the spot's own, on the ground.
    frame(['berry'], null);
    expect(bundle.visible).toBe(true);
    expect(bundle.position.y).toBeCloseTo(snag.hang.y, 5);
    expect(bird.userData.directed).toBe(false);
    expect(place.position.x).toBe(jay.at.x);
    expect(place.userData.aloft).toBe(false);
    // In the scene: the jay is on its way up, the bundle still up there until it is tugged loose.
    const T = bringTimes(by.at);
    frame(['berry', by.jay], (T.flies + T.touchdown) / 2);
    expect(bird.userData.directed).toBe(true);
    expect(place.position.y).toBeGreaterThan(1);
    expect(place.userData.aloft).toBe(true);
    expect(bundle.visible).toBe(true);
    expect(bundle.position.y).toBeCloseTo(snag.hang.y, 5);
    // Unrolling, its roll rides down at its end.
    frame(['berry', by.jay], by.at + by.seconds / 2);
    expect(bundle.visible).toBe(true);
    expect(bundle.position.y).toBeLessThan(snag.hang.y - 0.5);
    frame(['berry', by.jay], by.at + by.seconds);
    expect(bundle.visible).toBe(false);
    // The lichen swings out the last of its fall.
    for (let i = 0; i < 6; i++) frame(['berry', by.jay, lichen.needs!], by.at + by.seconds + 0.02 * (i + 1));
    expect(Math.abs(strand.rotation.z)).toBeGreaterThan(0.01);
    // After the scene, and in a game taken up later: the lichen is down, and the jay sits at the snag's tip.
    frame(['berry', by.jay, lichen.needs!, `scene:${by.scene}`], null);
    expect(bundle.visible).toBe(false);
    expect(place.position.distanceTo(snag.sits)).toBeLessThan(1e-6);
    expect(place.userData.aloft).toBe(true);
    const later = buildJayLichen(stormskog, climbs);
    const there = new Group();
    there.position.set(jay.at.x, jay.at.y, -0.6);
    there.add(jayStandIn());
    later.update({ flags: new Set(['berry', by.jay, lichen.needs!, `scene:${by.scene}`]), scene: null, bird: there, elof: { x: 175, y: 0, climbing: false }, clock: 1, dt: 1 / 60, calm: false });
    expect(there.position.distanceTo(snag.sits)).toBeLessThan(1e-6);
    expect(later.group.getObjectByName(`climb:lichen:${lichen.x}:bundle`)!.visible).toBe(false);
  });
});
