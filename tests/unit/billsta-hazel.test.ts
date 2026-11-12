import { Color, DirectionalLight, HemisphereLight, InstancedMesh, Matrix4, Mesh, Scene, Vector3, type BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { AVENTYR2 } from '../../src/content/aventyr2/aventyr2';
import { billsta, HAZEL } from '../../src/content/aventyr2/chapters/billsta';
import { BARE_BELOW, HAZEL_FRONT, hazelExtra, hazelGrowth, NUT_SIZE } from '../../src/content/aventyr2/hazel';
import { heightAt, landscape } from '../../src/render/dressing/kit';

/**
 * Billsta's hazel at Billaberget's shelves (src/content/aventyr2/hazel.ts; Olov, 12 November 2026: "gör det som
 * rekommenderad men gärna hasselbuskar också och nån hasselnöt"). Elof's line there stays "Hyllor i berget! Där uppe finns
 * godis."; beside the shelves grow hazel bushes, with nuts in their husks hanging in them and two fallen on the shelves.
 * Picture only: none of it stands in front of him, the shelves he jumps on, or a sweet.
 */
describe("Billsta's hazel at the shelves", () => {
  const shelves = billsta.ledges!.filter((ledge) => ledge.look === 'shelf');
  const sweets = [...billsta.candy, ...(billsta.side ?? [])];
  const context = (chapter: typeof billsta) => ({ chapter, scene: new Scene(), sky: new Color(), hemisphere: new HemisphereLight(), sun: new DirectionalLight() });
  const drawn = () => {
    const here = context(billsta);
    expect(hazelExtra(here)).not.toBeNull();
    return here.scene.getObjectByName('hazel')!;
  };
  /** Every corner of the leaves, where it is drawn. */
  const leafCorners = (leaves: InstancedMesh) => {
    const corners: Vector3[] = [];
    const at = leaves.geometry.getAttribute('position');
    const matrix = new Matrix4();
    for (let i = 0; i < leaves.count; i++) {
      leaves.getMatrixAt(i, matrix);
      for (let k = 0; k < at.count; k++) corners.push(new Vector3().fromBufferAttribute(at, k).applyMatrix4(matrix));
    }
    return corners;
  };
  const corners = (geometry: BufferGeometry) => {
    const at = geometry.getAttribute('position');
    return Array.from({ length: at.count }, (_, k) => new Vector3().fromBufferAttribute(at, k));
  };
  const nearFallen = (p: Vector3, fallen: Vector3[]) => fallen.some((nut) => nut.distanceTo(p) < NUT_SIZE.long);

  it('keeps the line about the shelves, and draws the hazel only in Billsta, in two draws', () => {
    expect(billsta.beats!.find((beat) => beat.id === 'bi:hazel')!.line).toBe('biHazel');
    const hazel = drawn();
    expect(hazel.children.length).toBe(2);
    expect(hazel.children.every((child) => child instanceof Mesh)).toBe(true);
    expect(hazel.children.filter((child) => child instanceof InstancedMesh).length).toBe(1);
    for (const chapter of AVENTYR2) if (chapter.id !== 'billsta') expect(hazelExtra(context(chapter)), chapter.id).toBeNull();
  });

  it('grows its bushes from the ground at the shelves, behind the boulders and the path, on several stems', () => {
    const land = landscape(billsta);
    for (const bush of HAZEL.bushes) {
      // Beside the shelves, on the drawn ground at the boulders' foot: never over the crack's deep floor.
      expect(Math.min(...shelves.map((s) => Math.abs(s.x - bush.x)))).toBeLessThan(8);
      for (const dx of [-0.5, 0, 0.5]) expect(heightAt(land, bush.x + dx), `${bush.x + dx}`).toBeCloseTo(bush.y, 5);
      expect(bush.z).toBeLessThanOrEqual(-2.2);
    }
    const { leaves } = hazelGrowth(shelves);
    // A bush's worth of leaves each, and leafy only above where he and the trail's sweets stand in front of it.
    expect(leaves.length).toBeGreaterThan(HAZEL.bushes.length * 80);
    for (const leaf of leaves) expect(HAZEL.bushes.some((b) => Math.abs(leaf.at.x - b.x) < b.wide * 1.8 && leaf.at.y >= b.y + BARE_BELOW - 1e-6)).toBe(true);
  });

  it('stands behind the path, and off the shelves and their fronts: only the fallen nuts lie on the shelves', () => {
    const hazel = drawn();
    const leaves = hazel.children.find((child) => child instanceof InstancedMesh) as InstancedMesh;
    const wood = hazel.children.find((child) => !(child instanceof InstancedMesh)) as Mesh;
    const { nuts } = hazelGrowth(shelves);
    const all = [...leafCorners(leaves), ...corners(wood.geometry).filter((p) => !nearFallen(p, nuts.fallen))];
    expect(all.length).toBeGreaterThan(1000);
    for (const p of all) {
      expect(p.z, `${p.x.toFixed(2)},${p.y.toFixed(2)}`).toBeLessThanOrEqual(HAZEL_FRONT + 1e-6);
      for (const s of shelves) {
        // Nothing in the drawn shelf (a little wider than walked), on its top where he stands, or in front of its back.
        const inside = Math.abs(p.x - s.x) < s.width * 0.8 + 0.1 && p.y > s.y - 1.3 && p.y < s.y + 1.3 && p.z > -1.75;
        expect(inside, `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)} at the shelf at ${s.x}`).toBe(false);
      }
    }
  });

  it('has small nuts hanging in twos and threes in the bushes, and two fallen on the shelves aside from the sweets', () => {
    // Small: smaller than a sweet, and only a little bigger than a nut would be at his size, to be seen.
    expect(NUT_SIZE.long).toBeLessThan(0.3);
    expect(NUT_SIZE.wide).toBeLessThan(NUT_SIZE.long);
    const { nuts } = hazelGrowth(shelves);
    expect(nuts.hanging.length).toBe(HAZEL.bushes.reduce((sum, b) => sum + b.nuts, 0));
    for (const hub of nuts.hanging) {
      expect(hub.z).toBeLessThan(HAZEL_FRONT);
      expect(HAZEL.bushes.some((b) => Math.abs(hub.x - b.x) < b.wide * 1.8 && hub.y > b.y + 1.5 && hub.y < b.y + b.tall)).toBe(true);
    }
    expect(nuts.fallen.length).toBe(2);
    for (const nut of nuts.fallen) {
      // Lying on a shelf's top, near its front, between the path and the shelf's back.
      const shelf = shelves.find((s) => Math.abs(nut.x - s.x) < s.width * 0.75)!;
      expect(shelf, `${nut.x}`).toBeDefined();
      expect(nut.y - NUT_SIZE.wide / 2).toBeCloseTo(shelf.y, 1);
      expect(nut.z).toBeLessThan(-0.45);
      expect(nut.z).toBeGreaterThan(-1.5);
      // Near the sweets over its shelf, and never at one: none within a step of it.
      const near = sweets.map((c) => Math.hypot(c.x - nut.x, c.y - nut.y));
      expect(Math.min(...near)).toBeLessThan(1.2);
      expect(Math.min(...near)).toBeGreaterThan(0.4);
    }
    // Picture only: no nut is candy, and the simulation's shelves and sweets are as they were.
    expect(billsta.side!.length).toBe(12);
    expect(shelves.map((s) => [s.x, s.y])).toEqual([[151.7, 5.4], [154.3, 6.3], [157.1, 7]]);
  });
});
