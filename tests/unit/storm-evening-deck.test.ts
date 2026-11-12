import { stubCanvas } from './canvas-stub';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Box3, InstancedMesh, Matrix4, Mesh, Object3D, Vector3 } from 'three';
import { Game } from '../../src/app/game';
import { stormkvall } from '../../src/content/aventyr2/chapters/stormkvall';
import { HOME_LAYOUT } from '../../src/content/home-layout';
import { DOLL_Z, TAKE } from '../../src/render/elof-coat';
import { createStage } from '../../src/render/stage';

/**
 * Stormkvällen's going out (Olov, 12 November 2026: "Moa och Bertil får gärna hänga med på altanen"): Moa and Bertil walk
 * after him from where the trail is found (`foljer`), and go out onto the deck to a place each between Mamma and Pappa
 * (`lofte`). Played by the game and drawn by the stage frame by frame, for a child who runs flat out, with or without the
 * doll's raincoat, one who walks, and ones who stand still on the way: the two of them never pass through the room's
 * furniture, the door, the big candies, him, the ghost, each other or their kneeling parents, never jump from one place
 * to another, and are crouching in their places for the promises when he does not run (and by the title when he does).
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
/** What stands in their way, as the room, its kit and src/render/dressing/house-door.ts build it. */
const IN_THE_WAY: Record<string, Box3> = {
  table: box(table.x - 2.5, table.x + 2.5, 0, 1.7, table.z - 1.1, table.z + 1.1),
  ...Object.fromEntries(Object.entries(table.chairs).map(([name, chair]) => [`chair ${name}`, box(chair.x - 0.55, chair.x + 0.55, 0, 2.6, chair.z - 0.55, chair.z + 0.55)])),
  'toy shelf': box(21.3 - 1.7, 21.3 + 1.7, 0, 1.85, -2.5, -1.5),
  doll: box(doll - 0.35, doll + 0.35, 0, 0.9, DOLL_Z - 0.35, DOLL_Z + 0.35),
  'door post (back)': box(door - 0.17, door + 0.17, -0.8, 8.4, -2.27, -1.93),
  'door post (front)': box(door - 0.17, door + 0.17, -0.8, 8.4, 1.03, 1.37),
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
const READY = ['scene:kvall', 'lamp:take', 'lamp:give', 'beat:skLampThanks', 'beat:skShelf', 'beat:skMyCarving', 'goodnight', 'gust',
  'scene:fonstret', 'window:shut', 'star:out', 'scene:klonkstar', 'star', 'scene:krymper', 'scene:upptackt', 'scene:tillsammans'];
type Way = { name: string; checkpoint: number; speed: number; coat: boolean; stop?: number };
const WAYS: Way[] = [
  { name: 'runs, and takes the raincoat', checkpoint: 0, speed: 1, coat: true },
  { name: 'runs past the raincoat', checkpoint: 0, speed: 1, coat: false },
  { name: 'walks', checkpoint: 0, speed: 0.5, coat: true },
  { name: 'stands at the door sill', checkpoint: 0, speed: 1, coat: true, stop: 29.62 },
  { name: 'stands in the door', checkpoint: 0, speed: 1, coat: true, stop: 38.2 },
  { name: 'stands just out on the deck', checkpoint: 0, speed: 1, coat: true, stop: 39.6 },
  { name: 'runs from the table\'s big candy in a game taken up', checkpoint: 1, speed: 1, coat: false },
];

beforeEach(stubCanvas);
afterEach(() => vi.unstubAllGlobals());

describe('Stormkvällen: Moa and Bertil go out onto the deck with him', () => {
  const deck = stormkvall.scenes!.find((scene) => scene.id === 'lofte')!.stage!.actors!;
  /** Where each of the family kneels or crouches on the deck: the last place the scene puts them. */
  const place = (who: 'mamma' | 'pappa' | 'moa' | 'bertil') => deck[who]!.filter((key) => key.x !== undefined).at(-1)!;
  /** How far a body stands from its place on the deck, along the deck and across it (going down on a knee or into a crouch, the body settles back a little). */
  const fromPlace = (who: 'mamma' | 'pappa' | 'moa' | 'bertil', at: Vector3) => Math.hypot(at.x - place(who).x!, at.z - place(who).z!);

  it.each(WAYS)('$name', (way) => {
    const game = new Game(stormkvall, {}, { checkpoint: way.checkpoint, flags: READY });
    const stage = createStage(stormkvall, ground);
    const body = (who: 'mamma' | 'pappa' | 'moa' | 'bertil') => stage.actors.get(who)!.rig.group;
    const close: string[] = [];
    const was = new Map<string, Vector3>();
    let stood = 0, clock = 0;
    /** Where Elof and each of the family are as each promise is said. */
    const promised = new Map<string, { elof: number; at: Record<string, Vector3> }>();
    for (let frame = 0; frame < 60 * 140 && !game.sim.flags.has('scene:stormtitel'); frame++) {
      const p = game.sim.curr;
      const standing = way.stop !== undefined && p.x >= way.stop && stood < 60 * 8;
      if (standing) stood++;
      game.frame(1 / 60, { x: standing ? 0 : way.speed, hopHeld: !standing }, { hop: !standing && frame % 40 === 0, act: way.coat && p.word === 'skTakeCoat', helper: false });
      const scene = game.sim.sceneFrame, elof = { x: game.sim.curr.x, y: game.sim.curr.y };
      stage.update(scene, game.sim.flags, elof, clock += 1 / 60, 1 / 60, false);
      if (!game.sim.flags.has('scene:spar')) continue;
      const when = `${scene?.id ?? 'free'} ${scene?.seconds.toFixed(2) ?? ''}, Elof at ${elof.x.toFixed(2)}`;
      const kids = { moa: parts(body('moa')), bertil: parts(body('bertil')) };
      const him = [box(elof.x - 0.25, elof.x + 0.25, elof.y, elof.y + 1.1, -0.25, 0.25)];
      const ghost = game.sim.ghost ? [box(game.sim.ghost.x - 0.3, game.sim.ghost.x + 0.3, game.sim.ghost.y, game.sim.ghost.y + 1.1, -0.3, 0.3)] : [];
      const check = (what: string, gap: number) => { if (gap < -0.005) close.push(`${what} ${gap.toFixed(2)} (${when})`); };
      for (const [who, own] of Object.entries(kids)) {
        for (const [what, thing] of Object.entries(IN_THE_WAY)) check(`${who} in the ${what}`, apart(own, [thing]));
        check(`${who} in Elof`, apart(own, him));
        if (ghost.length) check(`${who} in the ghost`, apart(own, ghost));
        // Mamma and Pappa are on the deck from the scene that takes them there.
        if (game.sim.flags.has('scene:lofte') || scene?.id === 'lofte') for (const parent of ['mamma', 'pappa'] as const) check(`${who} in ${parent}`, apart(own, parts(body(parent))));
        // Walked, not put: no step between two frames is longer than a run.
        const at = body(who as 'moa').position.clone();
        const before = was.get(who);
        if (before) expect(at.distanceTo(before), `${who} jumped (${when})`).toBeLessThan(0.2);
        was.set(who, at);
      }
      check('Moa in Bertil', apart(kids.moa, kids.bertil));
      for (const id of ['skNear', 'skFollow']) if (!promised.has(id) && game.sim.said.includes(id)) {
        promised.set(id, { elof: elof.x, at: Object.fromEntries((['mamma', 'moa', 'bertil', 'pappa'] as const).map((who) => [who, body(who).position.clone()])) });
      }
    }
    expect(game.sim.flags.has('scene:lofte')).toBe(true);
    expect(game.sim.flags.has('scene:stormtitel')).toBe(true);
    expect(close).toEqual([]);
    for (const id of ['skNear', 'skFollow']) {
      const then = promised.get(id)!;
      expect(then, id).toBeDefined();
      if (way.speed < 1 || way.stop !== undefined) {
        // Walked or stood on the way: all four kneel and crouch in their places as each promise is said.
        for (const who of ['mamma', 'moa', 'bertil', 'pappa'] as const) {
          expect(fromPlace(who, then.at[who]!), `${who} at ${id}`).toBeLessThan(0.5);
        }
      } else if (id === 'skFollow') {
        // Run flat out, he is ahead of them: they come up behind him along the deck, close enough to be in the picture.
        for (const who of ['moa', 'bertil'] as const) {
          expect(then.at[who]!.x, `${who} at ${id}`).toBeGreaterThan(door + 2);
          expect(then.elof - then.at[who]!.x, `${who} at ${id}`).toBeLessThan(5);
        }
      }
    }
    // By the title, whatever he did, everyone is in their place.
    for (const who of ['mamma', 'moa', 'bertil', 'pappa'] as const) {
      expect(fromPlace(who, body(who).position), who).toBeLessThan(0.5);
    }
  });

  it('has a game taken up on the veranda or the deck begin with all four in their places', () => {
    for (const checkpoint of [2, 3]) {
      const game = new Game(stormkvall, {}, { checkpoint, flags: [...READY, 'scene:spar'] });
      const stage = createStage(stormkvall, ground);
      for (let frame = 0; frame < 30; frame++) {
        game.frame(1 / 60, { x: 0, hopHeld: false }, { hop: false, act: false, helper: false });
        stage.update(game.sim.sceneFrame, game.sim.flags, { x: game.sim.curr.x, y: game.sim.curr.y }, frame / 60, 1 / 60, false);
        for (const who of ['mamma', 'moa', 'bertil', 'pappa'] as const) {
          const at = stage.actors.get(who)!.rig.group.position;
          expect(fromPlace(who, at), `${who}, big candy ${checkpoint}, frame ${frame}`).toBeLessThan(0.5);
        }
      }
    }
  });
});
