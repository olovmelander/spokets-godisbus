import { stubCanvas } from './canvas-stub';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Box3, Color, InstancedMesh, Matrix4, Mesh, Vector3 } from 'three';
import { BRINK, BROW, billsta, NARROW, STONE, STONE_OUT } from '../../src/content/aventyr2/chapters/billsta';
import { hillAt, sprucesOf, vista } from '../../src/content/aventyr2/billsta-vista';
import { bankShapes } from '../../src/render/dressing/ground';
import { heightAt } from '../../src/render/dressing/kit';
import { cameraIntent } from '../../src/sim/camera-intent';

/**
 * The view from Billaberget's brow down over the narrow (Olov, 14 November 2026: "Vi står på Billaberget och tittar ned
 * mot sundet, men nu känns det som att sundet ligger på samma höjd, och vattnet ser dessutom helt platt ut."). The water
 * was a flat sheet a little over the brow's own ground. Now the ground ends at a brink behind the path and falls away,
 * the hill's cliff and wooded slope go down to the narrow far below, and the camera looks down over it
 * (src/content/aventyr2/billsta-vista.ts).
 */

beforeEach(() => {
  stubCanvas();
});
afterEach(() => vi.unstubAllGlobals());

const top = (x: number) => heightAt(billsta, x);

describe('the brow over the narrow', () => {
  it('ends at a brink behind the path, where the ground falls away out of sight, and only there', () => {
    expect(billsta.brink).toEqual(BRINK);
    expect(BRINK.z).toBeLessThan(-2.6);
    expect(BRINK.from).toBeLessThan(194);
    const shapes = bankShapes(billsta, 'lawn');
    const lowest = (from: number, to: number, behind: number) => {
      let low = Infinity;
      for (const { shape } of shapes) {
        const at = shape.getAttribute('position');
        for (let i = 0; i < at.count; i++) if (at.getX(i) > from && at.getX(i) < to && at.getZ(i) < behind) low = Math.min(low, at.getY(i));
      }
      return low;
    };
    // Behind the brow, past the brink: gone, far under the water.
    expect(lowest(192, 210, BRINK.z - 1)).toBeLessThan(NARROW.y - 20);
    // In front of the brink the brow is whole, where Mormor and he stand.
    for (const { shape } of shapes) {
      const at = shape.getAttribute('position');
      for (let i = 0; i < at.count; i++) {
        if (at.getX(i) > 191.5 && at.getX(i) < 210 && at.getZ(i) >= -2.65 && at.getZ(i) <= 0.5) expect(at.getY(i)).toBeGreaterThan(BROW.y - 0.5);
      }
    }
    // Elsewhere the ground is as it was without a brink.
    const { brink: _, ...plain } = billsta;
    const before = bankShapes(plain, 'lawn');
    const heights = (list: typeof shapes) => list.flatMap(({ shape }) => {
      const at = shape.getAttribute('position');
      return Array.from({ length: at.count }, (_, i) => i).filter((i) => at.getX(i) < BRINK.from - 4.5).map((i) => at.getY(i));
    });
    expect(heights(shapes)).toEqual(heights(before));
  });

  it('falls away beyond the brink: a cliff, then a wooded slope down to the shore, and the water far below', () => {
    expect(NARROW.y).toBeLessThan(BROW.y - 25);
    // At the brink it is the brow's own height; just beyond it, a cliff; at the near shore, the water's.
    expect(hillAt(198, -2.5, top)).toBeCloseTo(BROW.y, 0);
    expect(hillAt(198, BRINK.z - 6, top)).toBeLessThan(BROW.y - 12);
    expect(Math.abs(hillAt(198, NARROW.near, top) - NARROW.y)).toBeLessThan(2);
    for (let z = BRINK.z - 0.5; z > NARROW.near; z -= 2) expect(hillAt(198, z, top), `at ${z}`).toBeLessThan(BROW.y);
  });

  it('has spruces on the slope whose tops are under the brow, seen from above, and a far shore lower than the brow', () => {
    const spruces = sprucesOf(top);
    const near = spruces.filter((s) => s.z > NARROW.near);
    expect(near.length).toBeGreaterThan(100);
    for (const s of near) expect(s.y + s.tall, `the spruce at ${s.x.toFixed(1)}, ${s.z.toFixed(1)}`).toBeLessThan(BROW.y - 0.3);
    // Their tops come up just under the brink, so that they are seen beyond it.
    expect(Math.max(...near.map((s) => s.y + s.tall))).toBeGreaterThan(BROW.y - 3);
    const far = spruces.filter((s) => s.z < NARROW.far);
    expect(far.length).toBeGreaterThan(80);
    for (const s of far) expect(s.y + s.tall).toBeLessThan(BROW.y);
  });

  it('is seen from the brow: the camera rises and looks down, and the stone shows over the brink', () => {
    const zone = billsta.cameras!.find((c) => c.from <= 194 && c.to > 194)!;
    expect(zone.eye).toBeGreaterThan(1);
    const intent = cameraIntent({ x: 194, y: BROW.y, vx: 0, vy: 0, facing: 1, mode: 'free', grounded: true, groundY: BROW.y, standY: BROW.y } as never, billsta.cameras);
    expect(intent.eye).toBe(zone.eye);
    // The camera stands about where the view puts it (src/render/view.ts: 10 from the plane for each step of zoom), and
    // the line from it over the brink comes down to the water before the stone: the stone is in sight, beyond the brink.
    const eyeY = intent.y + 1.5 + intent.eye! * intent.zoom;
    const eyeZ = 9.6 * intent.zoom;
    const overBrink = (BROW.y + 0.8 - eyeY) / (BRINK.z - eyeZ);
    const reaches = eyeZ + (NARROW.y + STONE.over - eyeY) / overBrink;
    expect(reaches).toBeGreaterThan(STONE_OUT.z);
  });

  it('draws the brink, the hill, the spruces, the water, the far shore, the mist and the stone: a few draws', () => {
    const made = vista(billsta, new Color('#2a2e50'));
    const meshes: Mesh[] = [];
    made.group.traverse((node) => { if (node instanceof Mesh) meshes.push(node); });
    expect(meshes.length).toBeLessThanOrEqual(8);
    const water = made.group.getObjectByName('vista-water') as Mesh;
    const box = new Box3().setFromObject(water);
    expect(box.max.y).toBeCloseTo(NARROW.y, 3);
    expect(box.max.z).toBeCloseTo(NARROW.near, 3);
    expect(box.min.z).toBeCloseTo(NARROW.far, 3);
    // Not a flat colour: a material of its own that draws its waves, current, wind, glitter and white water.
    const material = water.material as Mesh['material'] & { customProgramCacheKey(): string; onBeforeCompile: (s: unknown, r: unknown) => void };
    expect(material.customProgramCacheKey()).toContain('billsta-narrow');
    const shader = { uniforms: {} as Record<string, unknown>, vertexShader: '#include <project_vertex>', fragmentShader: '#include <normal_fragment_maps>\n#include <emissivemap_fragment>\n#include <fog_fragment>' };
    material.onBeforeCompile(shader, null);
    for (const part of ['narrowTime', 'narrowFlow', 'narrowMoon', 'narrowStone', 'narrowLampOn']) expect(shader.uniforms[part], part).toBeDefined();
    expect(shader.fragmentShader).toContain('wWaves');
    // The stone stands in the current at its place, its foot in the water and its top under their feet.
    const stone = made.group.getObjectByName('vista-stone')!;
    const rock = new Box3().setFromObject(stone);
    expect(rock.max.y).toBeCloseTo(STONE_OUT.y, 1);
    expect(rock.min.y).toBeLessThan(NARROW.y);
    expect(Math.abs((rock.min.x + rock.max.x) / 2 - STONE_OUT.x)).toBeLessThan(1);
    // The spruces are one draw.
    const spruces = made.group.getObjectByName('vista-spruces') as InstancedMesh;
    expect(spruces.count).toBeGreaterThan(200);
    const one = new Matrix4();
    spruces.getMatrixAt(0, one);
    expect(new Vector3().setFromMatrixPosition(one).y).toBeLessThan(BROW.y);
  });
});
