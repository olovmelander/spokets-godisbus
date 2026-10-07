import { Box3, Color, Mesh, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import { heightAt } from '../../src/render/dressing/kit';
import { LAMP_POST, lampPosts, lampPostShape, MIRRORED, paintStreetMirror, STREET_DEPTH } from '../../src/render/village';
import { cameraIntent } from '../../src/sim/camera-intent';
import type { ChapterData, PlayerState } from '../../src/sim/types';

const byn = COURSES['byn']!;

/** The screens the contact sheets are taken at. */
const SCREENS = [[390, 844], [844, 390], [780, 360], [1180, 820], [1440, 900]] as const;

/** The camera as the view sets it up (src/render/view.ts): the lens, and where the ground lies in the picture. */
const FOV = 30;
const GROUND_FROM_BOTTOM = 0.35;
function lensOf(width: number, height: number) {
  const elofPx = Math.min(140, Math.max(75, height * 0.2));
  const viewHeight = Math.max(height / elofPx, 6 / (width / height));
  return { viewHeight, distance: viewHeight / 2 / Math.tan((FOV * Math.PI) / 360) };
}

/** Where the camera is when he stands at x, facing that way. */
function eyeAt(chapter: ChapterData, x: number, facing: -1 | 1, width: number, height: number) {
  const { viewHeight, distance } = lensOf(width, height);
  const y = heightAt(chapter, x);
  const look = cameraIntent({ x, y, facing, mode: 'free', groundY: y, standY: y, hook: null } as unknown as PlayerState, chapter.cameras);
  // How far the picture reaches up, and to each side, for each EL away from the camera.
  const half = viewHeight / 2 / distance;
  return { x: look.x, y: look.y + viewHeight * look.zoom * (0.5 - GROUND_FROM_BOTTOM), z: distance * look.zoom, half, wide: half * (width / height) };
}

/**
 * What must be seen clearly along the street, where it stands and how wide it is: each big candy (the Blender
 * one is 0.68 across, 0.7 behind the path) and each hook's ring.
 */
function marks(chapter: ChapterData) {
  const end = chapter.shop?.door ?? Infinity;
  return [
    ...(chapter.checkpoints ?? []).map((at) => ({ what: 'the big candy', x: at.x, z: -0.7, half: 0.34 })),
    ...(chapter.hooks ?? []).map((hook) => ({ what: 'the hook', x: hook.x, z: 0, half: 0.4 })),
  ].filter((mark) => mark.x < end);
}

/** The flat of the foot that the hatch is on, as far out as it is at the hatch's middle. */
function hatchFlat(): number {
  const [, , low, high] = LAMP_POST.foot;
  return low[0] + ((high[0] - low[0]) * (LAMP_POST.door.up - low[1])) / (high[1] - low[1]);
}

describe("the village's lamp posts", () => {
  it('stand where the chapter says: on the far pavement, at the foot of what is behind them, clear of its wall and of the road', () => {
    expect(byn.lampPosts!.length).toBe(2);
    const posts = lampPosts(byn)!;
    expect(posts).toBeInstanceOf(Mesh);
    const at = posts.geometry.getAttribute('position');
    for (const x of byn.lampPosts!) {
      const part = byn.street!.find((one) => x >= one.from && x < one.to)!;
      expect(part.depth, `the post at ${x}`).toBe('far');
      const own = new Box3();
      for (let i = 0; i < at.count; i++) if (Math.abs(at.getX(i) - x) < 2) own.expandByPoint(new Vector3().fromBufferAttribute(at, i));
      expect(own.min.y, `the post at ${x}`).toBeCloseTo(part.foot!, 5);
      expect((own.min.x + own.max.x) / 2, `the post at ${x}`).toBeCloseTo(x, 3);
      // In front of the stone foot that stands 0.35 out from the far wall, and behind the road's back edge.
      expect(own.min.z).toBeGreaterThan(STREET_DEPTH.far + 0.35);
      expect(own.max.z).toBeLessThan(-16);
    }
    // A street that says none has none.
    expect(lampPosts(COURSES['look-street']!)).toBeNull();
  });

  it('take one draw for all of them', () => {
    const box = new Box3().setFromObject(lampPosts(byn)!);
    expect(box.min.x).toBeCloseTo(Math.min(...byn.lampPosts!) - 1.2, 3);
    expect(box.max.x).toBeCloseTo(Math.max(...byn.lampPosts!) + 1.2, 3);
  });

  it('stand behind no big candy or hook when he is at it, whichever way he faces, on any screen', () => {
    let nearest = Infinity;
    let where = '';
    for (const [width, height] of SCREENS) {
      for (const mark of marks(byn)) {
        for (const facing of [-1, 1] as const) {
          const eye = eyeAt(byn, mark.x, facing, width, height);
          for (const x of byn.lampPosts!) {
            // The sides of the foot, where they come nearest the camera, as the lens lays them over the mark.
            const scale = (eye.z - mark.z) / (eye.z - (LAMP_POST.z + 0.5));
            const left = eye.x + (x - 1.2 - eye.x) * scale;
            const right = eye.x + (x + 1.2 - eye.x) * scale;
            const apart = Math.max(left - (mark.x + mark.half), mark.x - mark.half - right);
            if (apart >= nearest) continue;
            nearest = apart;
            where = `${width}x${height}: the post at ${x} behind ${mark.what} at ${mark.x}, facing ${facing}`;
          }
        }
      }
    }
    expect(nearest, where).toBeGreaterThan(0.25);
  });

  it('go on up out of every picture they are in', () => {
    let highest = -Infinity;
    let seen = 0;
    for (const [width, height] of SCREENS) {
      for (let x = byn.ground[0]!.x + 0.5; x < byn.shop!.door; x += 0.5) {
        for (const facing of [-1, 1] as const) {
          const eye = eyeAt(byn, x, facing, width, height);
          const away = eye.z - LAMP_POST.z;
          for (const post of byn.lampPosts!) {
            if (Math.abs(post - eye.x) > away * eye.wide + 1.2) continue;
            seen++;
            highest = Math.max(highest, eye.y + away * eye.half);
          }
        }
      }
    }
    expect(seen).toBeGreaterThan(100);
    const top = Math.min(...byn.lampPosts!.map((x) => byn.street!.find((one) => x >= one.from && x < one.to)!.foot!)) + LAMP_POST.tall;
    expect(top).toBeGreaterThan(highest + 2);
  });

  it('have an eight-sided foot 2.4 across its flats, one flat to the street with a hatch and two bolts on it, and a fluted shaft', () => {
    const shape = lampPostShape();
    shape.computeBoundingBox();
    expect(shape.boundingBox!.min.x).toBeCloseTo(-1.2, 4);
    expect(shape.boundingBox!.max.x).toBeCloseTo(1.2, 4);
    expect(shape.boundingBox!.max.z).toBeCloseTo(1.2, 4);
    expect(shape.boundingBox!.max.y).toBeCloseTo(LAMP_POST.tall, 4);
    const at = shape.getAttribute('position'), normal = shape.getAttribute('normal');
    const flat = hatchFlat();
    // The plinth's flat towards the street faces it: each of its triangles, by its middle.
    let plinth = 0;
    for (let i = 0; i < at.count; i += 3) {
      const y = (at.getY(i) + at.getY(i + 1) + at.getY(i + 2)) / 3, z = (at.getZ(i) + at.getZ(i + 1) + at.getZ(i + 2)) / 3;
      if (y > 0.3 || z < 1.19) continue;
      plinth++;
      for (let k = i; k < i + 3; k++) expect(normal.getZ(k)).toBeCloseTo(1, 4);
    }
    expect(plinth).toBe(2);
    let hatch = 0, bolts = 0;
    const shaft: number[] = [];
    for (let i = 0; i < at.count; i++) {
      const x = at.getX(i), y = at.getY(i), z = at.getZ(i);
      if (Math.abs(y - LAMP_POST.door.up) < LAMP_POST.door.tall / 2 + 1e-4 && Math.abs(x) <= LAMP_POST.door.wide / 2 + 1e-4) {
        if (Math.abs(z - (flat + 0.05)) < 1e-4 && normal.getZ(i) > 0.99) hatch++;
        if (z > flat + 0.085 && normal.getZ(i) > 0.99) bolts++;
      }
      // Where the shaft comes out of its collar: how far out it is, all round its front.
      if (Math.abs(y - (LAMP_POST.foot.at(-1)![1] - 0.05)) < 1e-4 && z > -0.6 && Math.abs(x) < 0.6) shaft.push(Math.hypot(x, z));
    }
    expect(hatch).toBe(6);
    expect(bolts).toBe(12);
    // Its flutes: the shaft swells and narrows eight times round.
    expect(Math.max(...shaft) / Math.min(...shaft)).toBeGreaterThan(1.12);
  });

  it('are painted dark green, chipped lighter on their edges and darker where the dirt splashed their foot, and never red', () => {
    const shape = lampPostShape();
    const at = shape.getAttribute('position'), colour = shape.getAttribute('color');
    const green = new Color(LAMP_POST.green);
    let chipped = 0, low = Infinity, high = 0;
    for (let i = 0; i < at.count; i++) {
      const [r, g, b] = [colour.getX(i), colour.getY(i), colour.getZ(i)];
      expect(g).toBeGreaterThan(r);
      expect(g).toBeGreaterThan(b);
      if (g > green.g * 1.2) {
        chipped++;
        expect(at.getY(i), 'only the foot is chipped').toBeLessThan(3);
      }
      if (at.getY(i) < 0.01) low = Math.min(low, g);
      if (at.getY(i) > 5) high = Math.max(high, g);
    }
    expect(chipped).toBeGreaterThan(20);
    expect(low).toBeLessThan(high * 0.75);
  });

  it('stand in the puddle, painted in front of what is behind them, from the far foot up out of what the water shows', () => {
    const boxes: { x0: number; x1: number; y0: number; y1: number; colour: unknown }[] = [];
    const c = {
      fillStyle: '' as unknown,
      fillRect(x: number, y: number, w: number, h: number) { boxes.push({ x0: x, x1: x + w, y0: -y - h, y1: -y, colour: this.fillStyle }); },
      createLinearGradient: () => ({ addColorStop() {} }),
    };
    paintStreetMirror(byn, c as unknown as CanvasRenderingContext2D, (x) => x, (y) => -y);
    const puddle = byn.water![0]!;
    const inPuddle = byn.lampPosts!.filter((x) => x > puddle.from && x < puddle.to);
    expect(inPuddle).toEqual([52]);
    const posts = boxes.filter((b) => b.colour === MIRRORED.lamp);
    expect(posts.length).toBe(byn.lampPosts!.length * 3);
    // The last thing painted, so that nothing behind covers them.
    expect(boxes.slice(-posts.length).every((b) => b.colour === MIRRORED.lamp)).toBe(true);
    const own = posts.filter((b) => b.x0 < 52 && b.x1 > 52);
    expect(Math.min(...own.map((b) => b.y0))).toBe(1);
    expect(Math.max(...own.map((b) => b.y1))).toBeGreaterThan(20);
    expect(Math.max(...own.map((b) => b.x1 - b.x0))).toBeCloseTo(2.4, 5);
  });
});
