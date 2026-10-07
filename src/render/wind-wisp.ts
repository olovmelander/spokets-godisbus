import { DataTexture, LinearFilter } from 'three';

/**
 * A gust's wisp on the mountain (view.ts, `buildWind`), worked out in numbers so that it needs no canvas: white,
 * its strength in its alpha. Its line waves a little; it is thickest in its middle and gone at both ends and at
 * its edges, so that a gust is air and not a line drawn across the picture (visual audit, berget row 8).
 */
export function windWisp(): DataTexture {
  const [wide, high] = [64, 16];
  const data = new Uint8Array(wide * high * 4);
  for (let y = 0; y < high; y++) {
    for (let x = 0; x < wide; x++) {
      const [u, v] = [(x + 0.5) / wide, (y + 0.5) / high];
      const line = 0.5 + 0.14 * Math.sin(Math.PI * (1.4 * u - 0.2));
      const thick = 0.06 + 0.12 * Math.sin(Math.PI * u);
      const strength = Math.sin(Math.PI * u) ** 1.5 * Math.exp(-(((v - line) / thick) ** 2));
      data.set([255, 255, 255, Math.round(255 * strength)], (y * wide + x) * 4);
    }
  }
  const texture = new DataTexture(data, wide, high);
  texture.magFilter = texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
