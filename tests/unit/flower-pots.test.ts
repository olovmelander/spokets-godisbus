import { readFileSync } from 'node:fs';
import { Box3, type BufferAttribute, type Mesh, MeshStandardMaterial, type Object3D, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { stormgard } from '../../src/content/aventyr2/chapters/stormgard';
import { BOWL_SOIL, flowerPot, potAt } from '../../src/content/aventyr2/flower-pots';
import { OUTDOOR_MODELS } from '../../src/render/outdoor-models';
import { CLOSE_DETAIL, GROUND_WET } from '../../src/render/ground-detail';
import { terracotta } from '../../src/render/terracotta';
import { WIND } from '../../src/render/wind';

/**
 * Stormgården's flower pots (Olov, 14 November 2026: "Krukorna som syns när stormbyarna kommer behöver modelleras bättre och
 * få bättre texturer"): terracotta garden pots from Blender (art/blender/a2-props.py), no two alike, their clay drawn
 * close by src/render/terracotta.ts. They were six copies of one plain upturned pot of 26 sides, its colours on its
 * corners only.
 */

/** The props kit as Blender baked it. */
async function kit(): Promise<Object3D> {
  const file = readFileSync(new URL('../../art/baked/aventyr2/props.glb', import.meta.url));
  return (await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '')).scene;
}

const gust = stormgard.gusts![0]!;
const pots = gust.shelters.map((_, n) => potAt(n));

describe("Stormgården's flower pots", () => {
  it('are six different pots, one at each lee of the gusts, where the simulation has its shelters', () => {
    expect(gust.shelters).toHaveLength(6);
    expect(new Set(pots).size).toBe(6);
    for (const [n, x] of gust.shelters.entries()) {
      const pot = flowerPot(x, gust.y, n);
      expect(pot.userData.model).toBe(pots[n]);
      // Just behind the path, where it was; and until the kit's has come, a plain pot as tall as he is or taller.
      expect([pot.position.x, pot.position.y, pot.position.z]).toEqual([x, gust.y, -1.3]);
      expect(new Box3().setFromObject(pot).max.y - gust.y).toBeGreaterThan(1);
    }
    // What grows in one leans with the wind, which comes from the right: those are turned little where they stand.
    for (const [n, name] of pots.entries()) {
      if (['kruka-ljung', 'kruka-hog', 'kruka-valt'].includes(name)) expect(Math.abs(flowerPot(0, 0, n).userData.turn as number), name).toBeLessThan(0.6);
    }
  });

  it('are each in the kit, of clay, as tall as he is or taller, and no wider than the lee they give', async () => {
    const scene = await kit();
    for (const name of pots) {
      const pot = scene.getObjectByName(name) as Mesh;
      expect(pot, name).toBeDefined();
      const material = pot.material as MeshStandardMaterial;
      expect(material.name, name).toBe('kit-clay');
      // Each corner says where on its pot it is, for the game to draw the clay between them.
      const clay = pot.geometry.getAttribute('_clay') as BufferAttribute;
      expect(clay, name).toBeDefined();
      expect(clay.count).toBe(pot.geometry.getAttribute('position').count);
      const size = new Box3().setFromObject(pot);
      expect(size.min.y, name).toBeGreaterThan(-0.05);
      expect(size.max.y, name).toBeGreaterThan(1.2);
      // Its clay stands within a pot's width of where it stands (what spills and what grows may reach further).
      let reach = 0, corners = 0;
      const at = new Vector3();
      const position = pot.geometry.getAttribute('position');
      for (let i = 0; i < clay.count; i++) {
        if (clay.getZ(i) < -0.5) continue;
        corners++;
        at.fromBufferAttribute(position, i).applyMatrix4(pot.matrixWorld);
        reach = Math.max(reach, Math.hypot(at.x, at.z));
      }
      // Far more of them than the 339 points of the pot there was.
      expect(corners, name).toBeGreaterThan(600);
      expect(reach, name).toBeLessThan(name === 'kruka-valt' ? 2 : 1.25);
    }
    // The upturned one, as it stands on Gården's and Byn's lawns too, is as big as it was: 2.1 across, 1.74 tall.
    expect([...OUTDOOR_MODELS.garden!, ...OUTDOOR_MODELS.byn!].filter((item) => item.model === 'kruka')).toHaveLength(3);
    const upturned = new Box3().setFromObject(scene.getObjectByName('kruka')!);
    expect(upturned.max.y).toBeCloseTo(1.74, 1);
    expect(upturned.max.x - upturned.min.x).toBeCloseTo(2.1, 1);
  });

  it('has Klonk blown into the wide bowl, standing on its soil with its rim round him', async () => {
    const perch = stormgard.ghost!.find((one) => one.z !== undefined)!;
    const n = gust.shelters.indexOf(perch.at.x);
    expect(pots[n]).toBe('kruka-skal');
    expect(perch.at.y).toBe(BOWL_SOIL);
    expect(perch.z).toBe(flowerPot(perch.at.x, gust.y, n).position.z);
    const bowl = (await kit()).getObjectByName('kruka-skal') as Mesh;
    const clay = bowl.geometry.getAttribute('_clay'), position = bowl.geometry.getAttribute('position');
    const at = new Vector3();
    let rim = 0, soil = 0;
    for (let i = 0; i < clay.count; i++) {
      at.fromBufferAttribute(position, i).applyMatrix4(bowl.matrixWorld);
      if (clay.getZ(i) > -0.5) rim = Math.max(rim, at.y);
      // Its soil: what is not clay, lies still and is in its very middle (last summer's stalks stand further out).
      else if (clay.getX(i) === 0 && Math.hypot(at.x, at.z) < 0.12) soil = Math.max(soil, at.y);
    }
    expect(soil).toBeGreaterThan(BOWL_SOIL - 0.08);
    expect(soil).toBeLessThan(BOWL_SOIL + 0.2);
    // He is a head taller than its rim, and stands in it to his shins.
    expect(rim - BOWL_SOIL).toBeGreaterThan(0.12);
    expect(rim - BOWL_SOIL).toBeLessThan(0.45);
  });

  it('draws the clay close, wet in the rain, and sways what grows in it with the wind, in one program', () => {
    const material = new MeshStandardMaterial({ name: 'kit-clay', vertexColors: true });
    terracotta(material);
    terracotta(material);
    expect(material.customProgramCacheKey()).toMatch(/terracotta/);
    const shader = {
      uniforms: {} as Record<string, unknown>,
      vertexShader: 'void main() {\n#include <begin_vertex>\n#include <project_vertex>\n}',
      fragmentShader: 'void main() {\n#include <normal_fragment_maps>\n}',
    };
    (material.onBeforeCompile as unknown as (shader: unknown, renderer: unknown) => void)(shader, null);
    // The tier's switch, the rain and the wind are the game's own: nothing is compiled when they change.
    expect(shader.uniforms.clayDetail).toBe(CLOSE_DETAIL);
    expect(shader.uniforms.clayRain).toBe(GROUND_WET);
    expect(shader.uniforms.windGust).toBe(WIND.windGust);
    expect(shader.vertexShader).toContain('attribute vec3 _clay;');
    expect(shader.vertexShader.indexOf('#include <project_vertex>')).toBeLessThan(shader.vertexShader.indexOf('windGust.z'));
    expect(shader.fragmentShader).toContain('clayNoise');
    expect(shader.fragmentShader.match(/#include <normal_fragment_maps>/g)).toHaveLength(1);
  });
});
