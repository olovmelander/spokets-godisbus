import { Group, Vector3, type Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import '../../src/content/aventyr2/aventyr2';
import { flarken } from '../../src/content/aventyr2/chapters/flarken';
import { DRAWN_IN } from '../../src/content/aventyr2/render';
import { moverProp } from '../../src/render/props';
import { MOVE_TIME } from '../../src/sim/constants';
import type { Mover } from '../../src/sim/types';

/**
 * Flärken's stone and bark as drawn (src/content/aventyr2/render.ts, `fieldstone` and `bark`; Olov, 9 November 2026:
 * "Uppdraget med stenen som ska fylla luckan måste se bättre ut"). The simulation takes each from the planks straight
 * to where it ends, through the planks' end; the picture takes its own way there: the stone rolls along the planks,
 * tips over the edge and sinks, and the bark slides off the edge and floats. Played here as the view plays them: the
 * simulation's place each frame, then the look's own tick.
 */
const stone = flarken.movers!.find((mover) => mover.id === 'sjon-stone')!;
const bark = flarken.movers!.find((mover) => mover.id === 'sjon-bark')!;
/** Where the planks end at the gap, and the water's level in it. */
const edge = 173.4;
const water = flarken.water!.find((w) => w.from <= edge + 1 && w.to >= edge + 1)!.y;

/** The simulation's own way between two stops (src/sim/sim.ts, moveMovers): eased, a little past, and back. */
function simAt(mover: Mover, from: number, to: number, t: number): { x: number; y: number } {
  const k = Math.min(1, Math.max(0, t / MOVE_TIME));
  const eased = 1 - (1 - k) ** 3 + Math.sin(Math.PI * k) * 0.06 * k;
  const a = mover.stops[from]!, b = mover.stops[to]!;
  return { x: a.x + (b.x - a.x) * eased, y: a.y + (b.y - a.y) * eased };
}

/** The look as the view holds it (src/render/view.ts, buildMovers): in a group the simulation's place is given to. */
function drawn(mover: Mover) {
  DRAWN_IN.chapter = flarken;
  const prop = moverProp(mover)!;
  const mesh = new Group();
  mesh.add(prop);
  const holder = prop.children[0]!;
  const tick = prop.userData.tick as (clock: number) => void;
  const at = new Vector3();
  return {
    frame(clock: number, place: { x: number; y: number }) {
      mesh.position.set(place.x, place.y, 0);
      tick(clock);
      mesh.updateMatrixWorld(true);
      return { at: holder.getWorldPosition(at).clone(), turn: holder.rotation.z, z: holder.position.z, holder: holder as Object3D };
    },
  };
}

describe('Flärken\'s stone, drawn with its weight', () => {
  it('rolls along the front of the planks, never through them, tips over the edge and sinks to where it ends', () => {
    const look = drawn(stone);
    const r = stone.height / 2;
    const first = stone.stops[0]!, last = stone.stops[stone.stops.length - 1]!;
    // At rest it lies on the planks, in front of the bark.
    const rest = look.frame(0, first);
    expect(rest.at.y).toBeCloseTo(first.y + r, 5);
    expect(rest.z).toBeGreaterThan(0.4);
    let turned = 0;
    let wentIn = -1;
    for (let t = 1 / 60; t < 6; t += 1 / 60) {
      const seen = look.frame(10 + t, simAt(stone, 0, 1, t));
      // Whatever the simulation has, the stone is never inside the planks: on them while its middle is over them,
      // and off their end only as a ball rolling off an edge is.
      if (seen.at.x < edge) expect(seen.at.y, `t ${t.toFixed(2)}`).toBeCloseTo(first.y + r, 5);
      else expect(Math.hypot(seen.at.x - edge, seen.at.y - first.y), `t ${t.toFixed(2)}`).toBeGreaterThan(r * 0.93);
      if (wentIn < 0 && seen.at.y - r < water) wentIn = t;
      turned = seen.turn;
    }
    // It turns as it rolls, about a turn and a quarter, the way a ball rolls to the right.
    expect(turned).toBeLessThan(-Math.PI * 2);
    // It takes its time: it is in the water about a second and a half after the push, as the chapter's plop waits for
    // (the scene that watches it go begins as it is placed to the simulation, and says when it is under).
    const sunk = flarken.scenes!.find((scene) => scene.id === 'sjon:plopp')!.cues!.find((cue) => cue.flag === 'sjon:sunk')!;
    expect(wentIn).toBeGreaterThan(1.4);
    expect(wentIn).toBeLessThan(MOVE_TIME + sunk.at);
    expect(MOVE_TIME + sunk.at - wentIn).toBeLessThan(0.6);
    // And it ends where the simulation has it, on the bottom.
    const end = look.frame(20, last);
    expect(end.at.x).toBeCloseTo(last.x, 1);
    expect(end.at.y).toBeCloseTo(last.y + r, 2);
  });

  it('is drawn sunk at once in a game taken up after it went in', () => {
    const last = stone.stops[stone.stops.length - 1]!;
    const seen = drawn(stone).frame(0, last);
    expect(seen.at.x).toBeCloseTo(last.x, 1);
    expect(seen.at.y).toBeCloseTo(last.y + stone.height / 2, 2);
  });
});

describe('Flärken\'s bark, drawn sliding off the edge and afloat', () => {
  it('lies at the back of the planks, behind the stone, and ends afloat under him where he hops onto it', () => {
    const look = drawn(bark);
    const n = bark.stops.length;
    const before = bark.stops[n - 2]!, last = bark.stops[n - 1]!;
    // On the planks, pushed from stop to stop, it is where the simulation has it, at their back.
    for (let i = 0; i < n - 1; i++) {
      const seen = look.frame(i, bark.stops[i]!);
      expect(seen.at.x).toBeCloseTo(bark.stops[i]!.x, 5);
      expect(seen.z).toBeLessThan(-0.4);
    }
    // The last push: it never sinks into the planks, and goes in over their end.
    for (let t = 1 / 60; t < 3; t += 1 / 60) {
      const seen = look.frame(10 + t, simAt(bark, n - 2, n - 1, t));
      if (seen.at.x + bark.width * 0.3 < edge) expect(seen.at.y, `t ${t.toFixed(2)}`).toBeGreaterThan(before.y - 0.05);
    }
    // Afloat it is where the simulation has it, its top where he stands, under the play plane's line.
    const afloat = look.frame(20, last);
    expect(afloat.at.x).toBeCloseTo(last.x, 1);
    expect(Math.abs(afloat.at.y - last.y)).toBeLessThan(0.05);
    expect(Math.abs(afloat.z)).toBeLessThan(1e-6);
  });
});
