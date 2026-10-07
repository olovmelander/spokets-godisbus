import { Color, type Mesh, SRGBColorSpace } from 'three';
import { describe, expect, it } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import { testbana } from '../../src/content/chapters/testbana';
import { MATCHBOX, matchboxShape } from '../../src/render/matchbox';
import { moverProp } from '../../src/render/props';

const byn = COURSES['byn']!;
const box = byn.movers!.find((mover) => mover.id === 'box')!;
const tall = box.height - MATCHBOX.out;

// Every corner is one of the box's colours, shaded: the shade scales all three channels, so the colour's
// proportions say which it is.
const PALETTE = { paper: MATCHBOX.paper, strip: MATCHBOX.strip, card: MATCHBOX.card, wood: MATCHBOX.wood, head: MATCHBOX.head, label: MATCHBOX.label, frame: MATCHBOX.frame, drawn: MATCHBOX.drawn, flame: MATCHBOX.flame[0], core: MATCHBOX.flame[1] };
const proportions = (r: number, g: number, b: number) => [r, g, b].map((c) => c / (r + g + b));
const KINDS = Object.entries(PALETTE).map(([name, hex]) => { const c = new Color(hex); return { name, of: proportions(c.r, c.g, c.b) }; });
function corners() {
  const shape = matchboxShape(box.width, box.height);
  const at = shape.getAttribute('position');
  const colour = shape.getAttribute('color');
  return Array.from({ length: at.count }, (_, i) => {
    const of = proportions(colour.getX(i), colour.getY(i), colour.getZ(i));
    const kind = KINDS.find((k) => k.of.every((v, j) => Math.abs(v - of[j]!) < 1e-4))?.name;
    return { x: at.getX(i), y: at.getY(i), z: at.getZ(i), kind };
  });
}

describe("the matchbox on the shop's step", () => {
  it('is the box he pulls down, and the block on the test course stays a block', () => {
    expect(box.look).toBe('matchbox');
    expect(testbana.movers!.find((mover) => mover.id === 'block')!.look).toBe('block');
  });

  it("fills the simulation's box: he stands on the tray's end, and its label is just behind the ring", () => {
    const shape = matchboxShape(box.width, box.height);
    shape.computeBoundingBox();
    const { min, max } = shape.boundingBox!;
    expect(min.y).toBeCloseTo(0, 5);
    expect(max.y).toBeCloseTo(box.height, 5);
    // Its sides are where the simulation's are, but for the striking strips' thickness.
    expect(Math.abs(min.x + box.width / 2)).toBeLessThan(0.01);
    expect(Math.abs(max.x - box.width / 2)).toBeLessThan(0.01);
    // The view's ring is at z 0.2 and 0.04 thick: in front of all that is printed on the label, and close to it.
    expect(max.z).toBeLessThan(0.2 - 0.04);
    expect(max.z).toBeGreaterThan(0.12);
  });

  it('has its tray pushed up out of the sleeve, five match heads in it, and dark strips down both narrow sides', () => {
    const all = corners();
    expect(all.every((corner) => corner.kind !== undefined)).toBe(true);
    const of = (kind: string) => all.filter((corner) => corner.kind === kind);
    // The sleeve stops where the tray comes out, and the tray goes on to the top.
    expect(Math.max(...of('paper').map((c) => c.y))).toBeCloseTo(tall, 5);
    expect(Math.max(...of('card').map((c) => c.y))).toBeCloseTo(box.height, 5);
    // Five heads, side by side, in the part of the tray that is out.
    const xs = of('head').map((c) => c.x).sort((a, b) => a - b);
    const heads = xs.filter((x, i) => i === 0 || x - xs[i - 1]! > 0.03).length;
    expect(heads).toBe(MATCHBOX.heads);
    expect(Math.min(...of('head').map((c) => c.y))).toBeGreaterThan(tall);
    // The striking strips stand on both narrow sides.
    expect(of('strip').some((c) => c.x < -box.width / 2)).toBe(true);
    expect(of('strip').some((c) => c.x > box.width / 2)).toBe(true);
    // The drawn flame is on the label, and the label on the front of the sleeve.
    for (const kind of ['label', 'flame', 'core']) expect(of(kind).every((c) => c.z > MATCHBOX.front && c.y < tall), kind).toBe(true);
  });

  it("is one draw, and none of its colours is a red: red is the ring's and the candy's", () => {
    const meshes: Mesh[] = [];
    moverProp(box)!.traverse((node) => { if ((node as Mesh).isMesh) meshes.push(node as Mesh); });
    expect(meshes.length).toBe(1);
    for (const [name, hex] of Object.entries(PALETTE)) {
      const hsl = new Color(hex).getHSL({ h: 0, s: 0, l: 0 }, SRGBColorSpace);
      const fromRed = Math.min(hsl.h, 1 - hsl.h) * 360;
      expect(hsl.s < 0.3 || fromRed > 15, name).toBe(true);
    }
  });
});
