import { Color, Triangle, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { alven } from '../../src/content/aventyr2/chapters/alven';
import { RAPID_LANE, RAPID_STONES, riverStonesGeometry, STONE_SEGMENTS } from '../../src/content/aventyr2/river-stones';

/**
 * The stones Älven's rapids break over (src/content/aventyr2/river-stones.ts). Olov, 12 November 2026: "stenarna när
 * man åker flotte kan modelleras snyggare, de är väldigt kantiga för tillfället".
 */
describe('the stones in Älven\'s rapids', () => {
  const geometry = riverStonesGeometry(RAPID_STONES, 22);
  const position = geometry.getAttribute('position');
  const colour = geometry.getAttribute('color');

  it('stand in both of the river\'s white waters: the torrent the raft goes down, and the rapids under the bridge', () => {
    expect(alven.decor!.filter((d) => d.look === 'whiteWater').length).toBe(2);
    const raft = alven.rides!.find((r) => r.id === 'al:raft')!;
    expect(alven.decor!.some((d) => d.look === 'whiteWater' && d.at.x > raft.from.x && d.at.x < raft.to.x)).toBe(true);
  });

  it('are round, not faceted: smooth shared corners, and no sharp edge between neighbouring faces', () => {
    // An indexed shape shares its corners between faces, and its normals are smooth across them.
    expect(geometry.index).not.toBeNull();
    const perStone = (STONE_SEGMENTS.round + 1) * (STONE_SEGMENTS.up + 1);
    expect(position.count).toBe(perStone * RAPID_STONES.length);
    expect(perStone).toBeGreaterThan(300);
    // The sharpest turn between two faces that share an edge, over the stones' visible parts.
    const index = geometry.index!;
    const normals = new Map<string, Vector3[]>();
    const a = new Vector3(), b = new Vector3(), c = new Vector3(), n = new Vector3();
    for (let i = 0; i < index.count; i += 3) {
      const [ia, ib, ic] = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
      a.fromBufferAttribute(position, ia);
      b.fromBufferAttribute(position, ib);
      c.fromBufferAttribute(position, ic);
      if (Math.min(a.y, b.y, c.y) < 0) continue;
      new Triangle(a, b, c).getNormal(n);
      if (n.lengthSq() < 0.5) continue;
      for (const [p, q] of [[ia, ib], [ib, ic], [ic, ia]] as const) {
        const key = p < q ? `${p}:${q}` : `${q}:${p}`;
        normals.set(key, [...(normals.get(key) ?? []), n.clone()]);
      }
    }
    const turns: number[] = [];
    for (const pair of normals.values()) if (pair.length === 2) turns.push(pair[0]!.angleTo(pair[1]!));
    turns.sort((p, q) => p - q);
    // The old lumps had eighty faces each, drawn flat, and one in a hundred of their edges turned more than 60 degrees
    // (their sharpest 70): these turn gently nearly everywhere, and only the rims of the smallest, flattest turn more.
    expect(turns[Math.floor(turns.length * 0.99)]!).toBeLessThan((24 * Math.PI) / 180);
    const sharpest = turns[turns.length - 1]!;
    expect(sharpest).toBeLessThan((38 * Math.PI) / 180);
  });

  it('are wet and dark where the water washes them, and the high ones mossy on top', () => {
    const at = new Vector3();
    const c = new Color();
    let wet = 0, wetN = 0, dry = 0, dryN = 0, green = 0;
    for (let i = 0; i < position.count; i++) {
      at.fromBufferAttribute(position, i);
      c.fromBufferAttribute(colour, i);
      const light = c.r + c.g + c.b;
      if (at.y > -0.1 && at.y < 0.15) { wet += light; wetN++; }
      if (at.y > 0.9) { dry += light; dryN++; }
      if (at.y > 0.9 && c.g > c.r * 1.15 && c.g > c.b * 1.15) green++;
    }
    expect(wet / wetN).toBeLessThan((dry / dryN) * 0.65);
    expect(green).toBeGreaterThan(20);
  });

  it('keep out of the raft\'s lane, and stand in the water, not over it', () => {
    const at = new Vector3();
    let front = -Infinity;
    let lowest = Infinity;
    for (let i = 0; i < position.count; i++) {
      at.fromBufferAttribute(position, i);
      if (at.y > -0.2) front = Math.max(front, at.z);
      lowest = Math.min(lowest, at.y);
    }
    expect(front).toBeLessThanOrEqual(-RAPID_LANE + 0.05);
    expect(lowest).toBeLessThan(-0.2);
  });
});
