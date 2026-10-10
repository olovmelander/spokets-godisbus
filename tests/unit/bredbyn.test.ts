import { Box3, Color, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { bredbynLandmarks, BREDBYN_LANDMARKS } from '../../art/procedural/bredbyn-landmarks';

const landmarks = bredbynLandmarks();
const church = landmarks.getObjectByName('anundsjo-church') as Mesh;
const tower = landmarks.getObjectByName('anundsjo-bell-tower') as Mesh;

describe('Bredbyn church and freestanding bell tower', () => {
  it('keeps two separate readable silhouettes with the clock tower beside, never on, the nave', () => {
    const nave = new Box3().setFromObject(church), belfry = new Box3().setFromObject(tower);
    expect(belfry.min.x - nave.max.x).toBeGreaterThan(1.5);
    expect(nave.min.y).toBeGreaterThanOrEqual(-0.001);
    expect(belfry.min.y).toBeGreaterThanOrEqual(-0.001);
    expect(belfry.max.y).toBeCloseTo(BREDBYN_LANDMARKS.tower.tall, 3);
    expect(belfry.max.y).toBeGreaterThan(nave.max.y + 2);
    // The tiny-player view needs the steep roof, not an added steeple, to carry the white nave's identity.
    expect(BREDBYN_LANDMARKS.church.ridge - BREDBYN_LANDMARKS.church.eaves).toBeGreaterThan(BREDBYN_LANDMARKS.church.deep / 2);
    expect(nave.max.z).toBeGreaterThan(BREDBYN_LANDMARKS.church.deep / 2 + 3);
  });

  it('uses just two opaque lit draws, no photographic plates or extra shader programs', () => {
    let triangles = 0, draws = 0;
    landmarks.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      draws++;
      expect(node.material).toBeInstanceOf(MeshStandardMaterial);
      const material = node.material as MeshStandardMaterial;
      expect(material.transparent).toBe(false);
      expect(material.map).toBeNull();
      expect(material.vertexColors).toBe(true);
      triangles += node.geometry.getAttribute('position').count / 3;
    });
    expect(draws).toBe(2);
    expect(triangles).toBeLessThan(12000);
  });

  it('has finite positions, unit normals and matching colours after all geometry is merged', () => {
    for (const mesh of [church, tower]) {
      const positions = mesh.geometry.getAttribute('position'), normal = mesh.geometry.getAttribute('normal'), colours = mesh.geometry.getAttribute('color');
      expect(normal.count).toBe(positions.count);
      expect(colours.count).toBe(positions.count);
      const n = new Vector3();
      for (let i = 0; i < positions.count; i++) {
        expect(Number.isFinite(positions.getX(i) + positions.getY(i) + positions.getZ(i))).toBe(true);
        expect(n.fromBufferAttribute(normal, i).length()).toBeCloseTo(1, 4);
      }
    }
  });

  it('faces the visible shingle facets towards the sky so the low sun can illuminate them', () => {
    const shape = church.geometry, colours = shape.getAttribute('color'), normals = shape.getAttribute('normal');
    const roofColour = new Color('#756353');
    let seen = 0;
    for (let i = 0; i < colours.count; i++) {
      if (Math.abs(colours.getX(i) - roofColour.r) > 1e-5 || Math.abs(colours.getY(i) - roofColour.g) > 1e-5) continue;
      seen++;
      expect(normals.getY(i)).toBeGreaterThan(0.35);
    }
    expect(seen).toBeGreaterThan(1000);
  });
});
