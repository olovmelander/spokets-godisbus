import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4, Vector3 } from 'three';
import { garden } from '../../src/content/chapters/garden';
import { testbana } from '../../src/content/chapters/testbana';
import { songGlitter } from '../../src/render/song-glitter';

describe('the lawn’s melody reward', () => {
  it('reveals real preallocated grass sparkles when the song has been played, including after a reload', () => {
    const effect = songGlitter(garden);
    const stars = effect.group.getObjectByName('song-glitter') as InstancedMesh;
    const matrix = new Matrix4();
    const scale = new Vector3();
    expect(stars.count).toBe(72);
    effect.update(new Set(), 1);
    stars.getMatrixAt(0, matrix);
    expect(scale.setFromMatrixScale(matrix).x).toBe(0);
    effect.update(new Set(['dewsong']), 2);
    stars.getMatrixAt(0, matrix);
    expect(scale.setFromMatrixScale(matrix).x).toBeGreaterThan(0.03);
    expect(effect.group.children).toHaveLength(1);
    stars.geometry.dispose();
    (stars.material as { dispose(): void }).dispose();
    stars.dispose();
  });

  it('adds no scene objects to a chapter without the toy', () => {
    expect(songGlitter(testbana).group.children).toHaveLength(0);
  });
});
