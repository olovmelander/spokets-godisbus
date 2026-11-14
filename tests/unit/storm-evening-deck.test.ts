import { stubCanvas } from './canvas-stub';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Box3, InstancedMesh, Matrix4, Mesh, Object3D, Vector3 } from 'three';
import { Game } from '../../src/app/game';
import { stormkvall } from '../../src/content/aventyr2/chapters/stormkvall';
import { HOME_LAYOUT } from '../../src/content/home-layout';
import { DOLL_Z, TAKE } from '../../src/render/elof-coat';
import { createStage } from '../../src/render/stage';

/**
 * Stormkvällen's going out. Moa and Bertil walk after him from where the trail is found (`foljer`; Olov, 12 November
 * 2026: "Moa och Bertil får gärna hänga med på altanen"), and go on ahead of him over the veranda to wait by the door
 * (`verandan`). When he has stepped out, all four walk out through the door onto the deck together, to a place each along
 * it (`lofte`; Olov, 14 November 2026: "Mamma och pappa måste promenera ut på trallen tillsammans med Moa och Bertil. Nu
 * dyker de bara upp utomhus medan Moa och Bertil promenerar ut.").
 *
 * Played by the game and drawn by the stage frame by frame, for a child who runs flat out, with or without the doll's
 * raincoat, one who walks, and ones who stand still on the way. None of the four ever passes through the room's
 * furniture, the door, the big candies, him, the ghost or each other. Moa and Bertil never jump from one place to another;
 * Mamma and Pappa do once, to just inside the door, where the house's front hides them from the picture out on the deck.
 * All four go out through the doorway, one after another, while he stands and watches; and all four kneel and crouch in
 * their places when that is over, whatever he did.
 */
const ground = (x: number) => {
  const line = stormkvall.ground;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]!, b = line[i + 1]!;
    if (a.x !== b.x && x >= a.x && x <= b.x) return a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x);
  }
  return 0;
};

const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => new Box3(new Vector3(x0, y0, z0), new Vector3(x1, y1, z1));
const table = HOME_LAYOUT.dining;
const doll = stormkvall.spots!.find((spot) => spot.id === TAKE)!.at.x;
const door = stormkvall.outdoors!;
/** The doorway, between its posts (src/render/dressing/house-door.ts). */
const DOORWAY = { back: -1.93, front: 1.03 };
/** What stands in their way, as the room, its kit and src/render/dressing/house-door.ts build it. */
const IN_THE_WAY: Record<string, Box3> = {
  table: box(table.x - 2.5, table.x + 2.5, 0, 1.7, table.z - 1.1, table.z + 1.1),
  ...Object.fromEntries(Object.entries(table.chairs).map(([name, chair]) => [`chair ${name}`, box(chair.x - 0.55, chair.x + 0.55, 0, 2.6, chair.z - 0.55, chair.z + 0.55)])),
  'toy shelf': box(21.3 - 1.7, 21.3 + 1.7, 0, 1.85, -2.5, -1.5),
  doll: box(doll - 0.35, doll + 0.35, 0, 0.9, DOLL_Z - 0.35, DOLL_Z + 0.35),
  'door post (back)': box(door - 0.17, door + 0.17, -0.8, 8.4, -2.27, DOORWAY.back),
  'door post (front)': box(door - 0.17, door + 0.17, -0.8, 8.4, DOORWAY.front, 1.37),
  'end wall': box(door - 0.15, door + 0.15, -0.8, 9.6, -8.9, -2.1),
  'open door': box(door + 0.12, door + 1.82, -0.75, 7, -2.38, -2.22),
  // The big candies: a stick 1.1 tall, and the sweet on it, 0.32 round at 1.25 (src/render/view.ts, buildCandy).
  ...Object.fromEntries(stormkvall.checkpoints!.flatMap((c, i) => {
    const z = c.z ?? -0.7;
    return [[`big candy ${i}`, box(c.x - 0.32, c.x + 0.32, c.y + 0.93, c.y + 1.57, z - 0.32, z + 0.32)], [`big candy ${i} stick`, box(c.x - 0.04, c.x + 0.04, c.y, c.y + 1.1, z - 0.04, z + 0.04)]];
  })),
};

const shown = (o: Object3D) => { for (let p: Object3D | null = o; p; p = p.parent) if (!p.visible) return false; return true; };
const instance = new Matrix4();
/** A body's parts, each as the box round it in the world. */
function parts(root: Object3D): Box3[] {
  const out: Box3[] = [];
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!(o instanceof Mesh) || !shown(o)) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    if (!(o instanceof InstancedMesh)) { out.push(o.geometry.boundingBox!.clone().applyMatrix4(o.matrixWorld)); return; }
    for (let i = 0; i < o.count; i++) {
      o.getMatrixAt(i, instance);
      const part = o.geometry.boundingBox!.clone().applyMatrix4(instance.premultiply(o.matrixWorld));
      const size = part.getSize(new Vector3());
      if (size.x * size.y * size.z > 1e-4) out.push(part);
    }
  });
  return out;
}
/** How far apart two sets of boxes are: below zero, by how much they go into each other. */
function apart(as: readonly Box3[], bs: readonly Box3[]): number {
  let least = Infinity;
  for (const a of as) for (const b of bs) {
    least = Math.min(least, Math.max(a.min.x - b.max.x, b.min.x - a.max.x, a.min.y - b.max.y, b.min.y - a.max.y, a.min.z - b.max.z, b.min.z - a.max.z));
  }
  return least;
}

/** The story up to the trail's first big candy: the family dressed and ready, the trail not yet found. */
const READY = ['scene:kvall', 'lamp:take', 'lamp:give', 'beat:skLampThanks', 'beat:skShelf', 'beat:skMyCarving', 'goodnight', 'gust', 'sk:leap',
  'scene:fonstret', 'window:shut', 'star:out', 'scene:klonkstar', 'star', 'scene:krymper', 'scene:upptackt', 'scene:tillsammans'];
type Way = { name: string; checkpoint: number; speed: number; coat: boolean; stop?: number };
const WAYS: Way[] = [
  { name: 'runs, and takes the raincoat', checkpoint: 0, speed: 1, coat: true },
  { name: 'runs past the raincoat', checkpoint: 0, speed: 1, coat: false },
  { name: 'walks', checkpoint: 0, speed: 0.5, coat: true },
  { name: 'stands at the door sill', checkpoint: 0, speed: 1, coat: true, stop: 29.62 },
  { name: 'stands on the veranda', checkpoint: 0, speed: 1, coat: true, stop: 34 },
  { name: 'stands just inside the door', checkpoint: 0, speed: 1, coat: true, stop: 37.6 },
  { name: 'runs from the table\'s big candy in a game taken up', checkpoint: 1, speed: 1, coat: false },
  { name: 'walks from the veranda\'s big candy in a game taken up', checkpoint: 2, speed: 0.5, coat: false },
];
const FAMILY = ['pappa', 'bertil', 'moa', 'mamma'] as const;
type Who = typeof FAMILY[number];

beforeEach(stubCanvas);
afterEach(() => vi.unstubAllGlobals());

describe('Stormkvällen: all four walk out onto the deck with him', () => {
  const lofte = stormkvall.scenes!.find((scene) => scene.id === 'lofte')!;
  const deck = lofte.stage!.actors!;
  /** Where each of the family kneels or crouches on the deck: the last place the scene puts them. */
  const place = (who: Who) => deck[who]!.filter((key) => key.x !== undefined).at(-1)!;
  /** How far a body stands from its place on the deck, along the deck and across it (going down on a knee or into a crouch, the body settles back a little). */
  const fromPlace = (who: Who, at: Vector3) => Math.hypot(at.x - place(who).x!, at.z - place(who).z!);

  it.each(WAYS)('$name', (way) => {
    const game = new Game(stormkvall, {}, { checkpoint: way.checkpoint, flags: way.checkpoint === 2 ? [...READY, 'scene:spar'] : READY });
    const stage = createStage(stormkvall, ground);
    const body = (who: Who) => stage.actors.get(who)!.rig.group;
    const close: string[] = [];
    const was = new Map<string, Vector3>();
    /** When each went out through the door, on the scene's clock, and where across the doorway. */
    const through = new Map<Who, { at: number; z: number }>();
    const cuts: string[] = [];
    let stood = 0, clock = 0, held = 0;
    for (let frame = 0; frame < 60 * 140 && !game.sim.flags.has('scene:stormtitel'); frame++) {
      const p = game.sim.curr;
      const standing = way.stop !== undefined && p.x >= way.stop && stood < 60 * 8;
      if (standing) stood++;
      game.frame(1 / 60, { x: standing ? 0 : way.speed, hopHeld: !standing }, { hop: !standing && frame % 40 === 0, act: way.coat && p.word === 'skTakeCoat', helper: false });
      const scene = game.sim.sceneFrame, elof = { x: game.sim.curr.x, y: game.sim.curr.y };
      const drawn = stage.update(scene, game.sim.flags, elof, clock += 1 / 60, 1 / 60, false);
      if (!game.sim.flags.has('scene:spar')) continue;
      const out = scene?.id === 'lofte';
      if (out) held++;
      const when = `${scene?.id ?? 'free'} ${scene?.seconds.toFixed(2) ?? ''}, Elof at ${elof.x.toFixed(2)}`;
      const bodies = Object.fromEntries(FAMILY.map((who) => [who, parts(body(who))])) as Record<Who, Box3[]>;
      // Where he is drawn: a step aside while they come out.
      const lift = drawn.elof?.lift ?? { x: 0, y: 0, z: 0 };
      const him = [box(elof.x + lift.x - 0.25, elof.x + lift.x + 0.25, elof.y, elof.y + 1.1, (lift.z ?? 0) - 0.25, (lift.z ?? 0) + 0.25)];
      // The ghost is drawn at the depth of the place it is at, or on its way to.
      const depth = game.sim.ghost ? stormkvall.ghost![game.sim.ghost.perch]?.z ?? 0 : 0;
      const ghost = game.sim.ghost ? [box(game.sim.ghost.x - 0.3, game.sim.ghost.x + 0.3, game.sim.ghost.y, game.sim.ghost.y + 1.1, depth - 0.3, depth + 0.3)] : [];
      const check = (what: string, gap: number) => { if (gap < -0.005) close.push(`${what} ${gap.toFixed(2)} (${when})`); };
      // Mamma and Pappa are in the story's picture from the scene that takes them out of the door.
      const there = (who: Who) => who === 'moa' || who === 'bertil' || ((out && scene.seconds > 0.5) || game.sim.flags.has('scene:lofte'));
      for (const who of FAMILY) {
        if (!there(who)) continue;
        for (const [what, thing] of Object.entries(IN_THE_WAY)) check(`${who} in the ${what}`, apart(bodies[who], [thing]));
        check(`${who} in Elof`, apart(bodies[who], him));
        if (ghost.length) check(`${who} in the ghost`, apart(bodies[who], ghost));
        for (const other of FAMILY) if (other < who && there(other)) check(`${who} in ${other}`, apart(bodies[who], bodies[other]));
        // Walked, not put: no step between two frames is longer than a run.
        const at = body(who).position.clone();
        const before = was.get(who);
        if (before && at.distanceTo(before) >= 0.2) {
          if (who === 'moa' || who === 'bertil') expect.fail(`${who} jumped ${at.distanceTo(before).toFixed(2)} (${when})`);
          cuts.push(`${who} ${when}`);
        }
        // Out through the doorway: the moment each one's middle passes the door.
        if (before && before.x < door && at.x >= door) {
          expect(out, `${who} went out of the door outside the scene (${when})`).toBe(true);
          through.set(who, { at: scene!.seconds, z: at.z });
        }
        was.set(who, at);
      }
      // Hidden by the house's front as they are put inside the door: what is seen of them is their stepping out.
      for (const who of ['mamma', 'pappa'] as const) {
        if (out && !there(who)) continue;
        if (out && scene.seconds < 0.6) expect(body(who).position.x, `${who} is put where the picture sees inside (${when})`).toBeLessThan(door - 1.5);
      }
    }
    expect(game.sim.flags.has('scene:verandan')).toBe(true);
    expect(game.sim.flags.has('scene:lofte')).toBe(true);
    expect(game.sim.flags.has('scene:stormtitel')).toBe(true);
    expect(close).toEqual([]);
    expect(cuts).toEqual([]);
    // He stood and watched them come out: all of it, and no longer than it takes.
    expect(lofte.hold).toBe(true);
    expect(held).toBeGreaterThan(60 * lofte.seconds - 3);
    expect(held).toBeLessThan(60 * lofte.seconds + 3);
    // One after another through the doorway, between its posts, the one who goes furthest first.
    expect([...through.keys()]).toEqual([...FAMILY]);
    const times = FAMILY.map((who) => through.get(who)!.at);
    for (let i = 1; i < times.length; i++) expect(times[i]! - times[i - 1]!, `${FAMILY[i]} after ${FAMILY[i - 1]}`).toBeGreaterThan(0.3);
    for (const who of FAMILY) {
      expect(through.get(who)!.z, who).toBeGreaterThan(DOORWAY.back + 0.4);
      expect(through.get(who)!.z, who).toBeLessThan(DOORWAY.front - 0.4);
    }
    // By the end of it, and by the title, whatever he did, everyone is in their place.
    for (const who of FAMILY) expect(fromPlace(who, body(who).position), who).toBeLessThan(0.5);
  });

  it('keeps them where the picture cannot see inside until they step out: the house\'s front is whole in the scene\'s shot', () => {
    // src/render/dressing/house-door.ts: the front fades in over the cut-away rooms as the camera goes out past the door.
    const shot = lofte.stage!.shots![0]!;
    expect(shot.x).toBeGreaterThanOrEqual(door + 4.2);
    // The door and every place along the deck are in it.
    expect(shot.x - shot.width! / 2).toBeLessThan(door - 1);
    for (const who of FAMILY) expect(Math.abs(place(who).x! - shot.x), who).toBeLessThan(shot.width! / 2 - 0.6);
    // He is well out on the deck when it begins, so the front has closed over the inside in the picture he came in.
    expect(lofte.from).toBeGreaterThanOrEqual(door + 1.4);
    // Mamma and Pappa are put inside as it begins, each behind the front's edge at any picture shape, and wherever
    // between him and the shot the picture is looking from: through the lane's depth, a striding body's near side
    // (its arm ahead of it) stays left of the door.
    for (const who of ['mamma', 'pappa'] as const) {
      const put = deck[who]![0]!;
      expect(put.move).toBeLessThan(0.05);
      for (const from of [lofte.from!, shot.x]) for (const height of [5.5, shot.height, shot.width! / (390 / 844), shot.width! / (1180 / 820)]) {
        const away = height / 2 / Math.tan(Math.PI / 12);
        const seen = from + (put.x! + 1.2 - from) * away / (away - put.z!);
        expect(seen, `${who} seen from ${from} in a picture ${height.toFixed(1)} high`).toBeLessThan(door - 0.2);
      }
    }
  });

  it('has a game taken up on the deck begin with all four in their places, and one taken up on the veranda with the two waiting by the door', () => {
    // A game saved at the deck's big candy has seen them come out; one saved at the veranda's has not.
    const saved = { 2: [...READY, 'scene:spar', 'scene:foljer', 'scene:verandan'], 3: [...READY, 'scene:spar', 'scene:foljer', 'scene:verandan', 'scene:lofte'] } as const;
    for (const checkpoint of [2, 3] as const) {
      const game = new Game(stormkvall, {}, { checkpoint, flags: [...saved[checkpoint]] });
      const stage = createStage(stormkvall, ground);
      for (let frame = 0; frame < 30; frame++) {
        game.frame(1 / 60, { x: 0, hopHeld: false }, { hop: false, act: false, helper: false });
        stage.update(game.sim.sceneFrame, game.sim.flags, { x: game.sim.curr.x, y: game.sim.curr.y }, frame / 60, 1 / 60, false);
        expect(game.sim.sceneFrame, `big candy ${checkpoint}, frame ${frame}`).toBeNull();
        const at = (who: Who) => stage.actors.get(who)!.rig.group.position;
        if (checkpoint === 3) {
          for (const who of FAMILY) expect(fromPlace(who, at(who)), `${who}, big candy ${checkpoint}, frame ${frame}`).toBeLessThan(0.5);
        } else {
          // On the veranda: Moa and Bertil wait by the door, out of the lane; Mamma and Pappa are not out yet.
          for (const who of ['moa', 'bertil'] as const) {
            expect(at(who).x, `${who}, frame ${frame}`).toBeLessThan(door - 0.8);
            expect(at(who).x, `${who}, frame ${frame}`).toBeGreaterThan(door - 5);
            expect(at(who).z, `${who}, frame ${frame}`).toBeLessThan(-2.6);
          }
          for (const who of ['mamma', 'pappa'] as const) expect(at(who).x, `${who}, frame ${frame}`).toBeLessThan(20);
        }
      }
    }
    // The veranda's big candy stands where he comes onto it, before the scene that sends the two ahead is over for good:
    // taken up there without having seen it (a game from before it was there), they are by the door all the same.
    const veranda = stormkvall.scenes!.find((scene) => scene.id === 'verandan')!;
    expect(stormkvall.checkpoints![2]!.x).toBeGreaterThan(veranda.before!);
    const old = new Game(stormkvall, {}, { checkpoint: 2, flags: [...READY, 'scene:spar'] });
    expect(old.sim.flags.has('scene:verandan')).toBe(true);
    expect(old.sim.flags.has('scene:foljer')).toBe(true);
  });
});
