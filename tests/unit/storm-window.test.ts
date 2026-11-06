import { Vector3, type BufferGeometry, type Mesh, type Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { prolog } from '../../src/content/chapters/ends';
import { stormkvall } from '../../src/content/aventyr2/chapters/stormkvall';
import { casement } from '../../src/content/aventyr2/render';
import { built } from '../../src/render/dressing/built';

/** Whether a point (in the mesh's own plane) lies on one of its triangles. */
function covers(geometry: BufferGeometry, x: number, y: number): boolean {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const corner = (i: number) => { const k = index ? index.getX(i) : i; return [position.getX(k), position.getY(k)] as const; };
  const count = index ? index.count : position.count;
  for (let i = 0; i < count; i += 3) {
    const [a, b, c] = [corner(i), corner(i + 1), corner(i + 2)];
    const side = (p: readonly number[], q: readonly number[]) => (q[0]! - p[0]!) * (y - p[1]!) - (q[1]! - p[1]!) * (x - p[0]!);
    const s1 = side(a, b), s2 = side(b, c), s3 = side(c, a);
    if ((s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)) return true;
  }
  return false;
}

function room(chapter: typeof stormkvall) {
  const canvas: object = new Proxy(function () {}, { get: (_, key) => key === Symbol.toPrimitive ? () => 0 : canvas, apply: () => canvas, set: () => true });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => canvas }) });
  try { return built(chapter, true); } finally { vi.unstubAllGlobals(); }
}

describe('the window the storm blows open (Stormkvällen)', () => {
  it('goes through the wall, with the night behind it, and only there', () => {
    const house = stormkvall.house!;
    expect(house.windows).toContain(house.opens);
    const wall = room(stormkvall).children.find((child) => child.renderOrder === -2) as Mesh;
    const middle = (house.from + house.to) / 2;
    // In the wall's own plane: the window's middle is open, the wall beside it is not, nor the room's other windows.
    expect(covers(wall.geometry, house.opens! - middle, 6 - wall.position.y)).toBe(false);
    expect(covers(wall.geometry, house.opens! - middle + 4, 6 - wall.position.y)).toBe(true);
    for (const x of house.windows.filter((x) => x !== house.opens)) expect(covers(wall.geometry, x - middle, 6 - wall.position.y)).toBe(true);
    const outside = room(stormkvall).getObjectByName('window-outside')!;
    expect(outside.position.x).toBe(house.opens);
    expect(outside.position.z).toBeLessThan(wall.position.z - 2.5);
    // The first adventure's room keeps its solid wall.
    expect(room(prolog).getObjectByName('window-outside')).toBeUndefined();
  });

  it('rattles on its hook, bursts open outward at the gust, bangs, and is pulled to', () => {
    const story = { flags: new Set<string>() as Set<string>, still: false };
    const window = casement({ id: 'decor:1', at: { x: 9.4, y: 6 }, verb: 'take', look: 'casement' }, story);
    const halves = window.group.children.filter((child) => child.type === 'Group' && child.children.length >= 2);
    expect(halves).toHaveLength(2);
    // How far a half's free edge stands out of the wall, towards the night (negative) or the room (positive).
    const out = (half: Object3D) => {
      half.updateWorldMatrix(true, false);
      const hinge = new Vector3().setFromMatrixPosition(half.matrixWorld);
      return half.localToWorld(new Vector3(-Math.sign(half.position.x) * 2.5, 0, 0)).z - hinge.z;
    };
    let clock = 0;
    const play = (seconds: number, used = false) => { for (let t = 0; t < seconds; t += 1 / 60) window.update(used, clock += 1 / 60, 1 / 60); };
    play(3);
    for (const half of halves) expect(Math.abs(out(half))).toBeLessThan(0.1);
    story.flags.add('gust');
    play(0.3);
    // Both halves fly out into the storm, never into the room and the shelf.
    for (const half of halves) expect(out(half)).toBeLessThan(-1.2);
    const swings = new Set<number>();
    for (let i = 0; i < 20; i++) { play(0.1); swings.add(Math.round(out(halves[0]!) * 20)); expect(out(halves[0]!)).toBeLessThan(-0.6); }
    expect(swings.size).toBeGreaterThan(3);
    // Pappa pulls it to: shut, and still.
    play(1.5, true);
    for (const half of halves) expect(Math.abs(out(half))).toBeLessThan(0.02);
  });

  it('stands open without banging when the picture keeps still, and a game taken up later finds it open', () => {
    const story = { flags: new Set(['gust']) as ReadonlySet<string>, still: true };
    const window = casement({ id: 'decor:1', at: { x: 9.4, y: 6 }, verb: 'take', look: 'casement' }, story);
    const half = window.group.children.find((child) => child.type === 'Group' && child.children.length >= 2)!;
    window.update(false, 1, 0);
    const first = half.rotation.y;
    expect(Math.abs(first)).toBeGreaterThan(0.9);
    window.update(false, 2.7, 1 / 60);
    expect(half.rotation.y).toBe(first);
  });
});
