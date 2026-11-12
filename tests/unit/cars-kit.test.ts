import { readFileSync } from 'node:fs';
import { Box3, type BufferAttribute, Color, Mesh, type Object3D, Raycaster, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { building, FAMILY_CAR } from '../../src/content/aventyr2/buildings';
import { byn } from '../../src/content/chapters/byn';
import { stormbyn } from '../../src/content/aventyr2/chapters/stormbyn';
import { villageLife } from '../../src/render/village';

/** The props kit as Blender baked it (art/blender/a2-props.py, art/baked/aventyr2/props.glb). */
async function kit(): Promise<Object3D> {
  const file = readFileSync(new URL('../../art/baked/aventyr2/props.glb', import.meta.url));
  return (await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '')).scene;
}

const luminance = (mesh: Mesh, index: number) => {
  const colour = mesh.geometry.getAttribute('color') as BufferAttribute;
  return new Color(colour.getX(index), colour.getY(index), colour.getZ(index)).getHSL({ h: 0, s: 0, l: 0 }).l;
};

describe('the cars made in Blender', () => {
  it('drive no more through the village streets: only a grown-up’s legs go by, in Byn and in Byn i stormen', () => {
    // Olov, 12 November 2026: "De stora benen i byn ser verkligen ut som en jätte när man jämför med Bilen som kör
    // förbi! Vi kan ta bort bilarna". Before, Byn's grey estate car drove behind the street, the same in the storm.
    for (const chapter of [byn, stormbyn]) {
      const life = villageLife(chapter);
      expect(life.group.getObjectByName('passing-car'), chapter.id).toBeUndefined();
      const models: unknown[] = [];
      life.group.traverse((object) => { if (object.userData.model) models.push(object.userData.model); });
      expect(models, chapter.id).toEqual(['fotgangare']);
      life.update(1);
      const shoes = life.group.getObjectByName('passing-shoes')!;
      const at = shoes.position.x;
      life.update(2);
      expect(shoes.position.x, chapter.id).toBeGreaterThan(at);
    }
  });

  it('hang their wheels on a pivot at each axle, round, on the ground, with how far they roll in a turn', async () => {
    const scene = await kit();
    for (const name of ['bil', 'bil-gra']) {
      const car = scene.getObjectByName(name)!;
      expect(car, name).toBeDefined();
      for (const end of ['fram', 'bak']) {
        const pivot = car.getObjectByName(`${name}-hjul-${end}`)!;
        expect(pivot, `${name} ${end}`).toBeDefined();
        expect(typeof pivot.userData.radius).toBe('number');
        expect(pivot.userData.track).toBeGreaterThan(0.7);
        // The pivot is the axle: the tyres reach the ground under it and turn round it.
        const tyres = new Box3().setFromObject(pivot);
        expect(tyres.min.y).toBeCloseTo(0, 1);
        expect((tyres.max.y - tyres.min.y) / 2).toBeCloseTo(pivot.userData.radius as number, 1);
        expect(Math.abs((tyres.min.x + tyres.max.x) / 2 - pivot.position.x)).toBeLessThan(0.01);
        expect(pivot.position.y).toBeCloseTo(pivot.userData.radius as number, 3);
        // Both sides' wheels, out to their tyres' faces.
        expect(tyres.max.z).toBeCloseTo(pivot.userData.track as number, 1);
        expect(tyres.min.z).toBeCloseTo(-(pivot.userData.track as number), 1);
      }
    }
  });

  it("is the family's car at the size and on the axles the game knows it by", async () => {
    const scene = await kit();
    const car = scene.getObjectByName('bil')!;
    const size = new Box3().setFromObject(car).getSize(new Vector3());
    expect(size.x).toBeCloseTo(FAMILY_CAR.long, 1);
    expect(size.y).toBeCloseTo(FAMILY_CAR.top.reduce((top, [, y]) => Math.max(top, y), 0), 1);
    expect(car.getObjectByName('bil-hjul-fram')!.position.x).toBeCloseTo(FAMILY_CAR.axles[1], 3);
    expect(car.getObjectByName('bil-hjul-bak')!.position.x).toBeCloseTo(FAMILY_CAR.axles[0], 3);
    expect(car.getObjectByName('bil-hjul-fram')!.userData.radius).toBeCloseTo(FAMILY_CAR.wheel, 3);
  });

  it("fits the fallback panes to the modeled car's side glass, just out from it, and nowhere else", async () => {
    const scene = await kit();
    const width = 29;
    const fit = width / FAMILY_CAR.long;
    // The body is the car's own node here, as baked; packed for the game, it hangs under it (./shared-models.ts).
    const car = scene.getObjectByName('bil')!;
    const body = ((car as Mesh).isMesh ? car : car.children.find((child) => (child as Mesh).isMesh)) as Mesh;
    car.scale.setScalar(fit);
    car.updateMatrixWorld(true);
    const made = building({ kind: 'car', x: 0, z: 0, width });
    const panes = (made.group.children[1] as Mesh).geometry;
    const at = panes.getAttribute('position');
    const index = panes.getIndex();
    let glass = 0;
    let total = 0;
    const count = index ? index.count : at.count;
    for (let t = 0; t < count; t += 3) {
      const corners = [0, 1, 2].map((k) => new Vector3().fromBufferAttribute(at, index ? index.getX(t + k) : t + k));
      const middle = corners[0]!.clone().add(corners[1]!).add(corners[2]!).divideScalar(3);
      for (const point of [middle, ...corners.map((corner) => corner.clone().lerp(middle, 0.35))]) {
        const hit = new Raycaster(point.clone().add(new Vector3(0, 0, 0.001)), new Vector3(0, 0, -1), 0, 2 * fit).intersectObject(body)[0];
        total++;
        expect(hit, `nothing behind the pane at ${point.toArray().map((v) => v.toFixed(2))}`).toBeDefined();
        // Just in front of the glass, where the sides lean in towards the roof: never inside the body.
        expect(hit!.distance).toBeGreaterThan(0);
        expect(hit!.distance).toBeLessThan(0.24 * fit);
        if (luminance(body, hit!.face!.a) < 0.12) glass++;
      }
    }
    expect(total).toBeGreaterThan(20);
    // What lies behind the panes is the dark glass and its black surround.
    expect(glass / total).toBeGreaterThan(0.9);
  });

  it('is made by the props generator as the game asks for it, wheels and all, with nothing written on it', () => {
    const generator = readFileSync(new URL('../../art/blender/a2-props.py', import.meta.url), 'utf8');
    expect([...generator.matchAll(/^build_car\('([a-z-]+)'/gm)].map((match) => match[1])).toEqual(['bil', 'bil-gra']);
    expect(building({ kind: 'car', x: 0, z: 0 }).group.userData.model).toBe('bil');
    // No badge, no plate, no letters: the generator draws none.
    expect(generator).not.toMatch(/badge\(|plate\(|text_body|FONT/i);
  });
});
