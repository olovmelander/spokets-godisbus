import { DataTexture, LinearFilter } from 'three';

/**
 * A soft round glow, worked out in numbers so that it needs no canvas: white, its strength in its alpha, brighter
 * at its heart and gone at its edge. The material it is drawn with gives it its colour.
 */
export function glowTexture(size = 32): DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const out = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) / (size / 2);
      const strength = Math.max(0, 1 - out) ** 2 * (0.6 + 0.4 * Math.max(0, 1 - out / 0.25));
      data.set([255, 255, 255, Math.round(255 * strength)], (y * size + x) * 4);
    }
  }
  const texture = new DataTexture(data, size, size);
  texture.magFilter = texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
