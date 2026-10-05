import { BufferAttribute, BufferGeometry, DynamicDrawUsage, Mesh, type Material } from 'three';

/**
 * A batch of quads in one geometry, so that every soft card of a kind is one draw call: the tufts in front,
 * the shrubs behind, the shafts of light, what floats and what flies. Each quad has its own corners, its own
 * part of the batch's picture, and its own colour and opacity (give the material `vertexColors`).
 *
 * The cards blend, and three.js sorts whole meshes, never the quads of one. So the order of the quads is the
 * order they are drawn in: set them far to near (the camera always looks along -z), unless the batch only
 * adds light, where the order does not matter.
 *
 * A batch is never culled, since it is as long as its chapter: its hundred or so quads are always sent, and
 * the graphics card clips them. A quad that has not been put anywhere has no size and draws nothing.
 */
export function quadBatch(count: number, material: Material, moving = false) {
  const position = new BufferAttribute(new Float32Array(count * 12), 3);
  const uv = new BufferAttribute(new Float32Array(count * 8), 2);
  const colour = new BufferAttribute(new Float32Array(count * 16).fill(1), 4);
  if (moving) for (const changing of [position, colour]) changing.setUsage(DynamicDrawUsage);
  const index = new Uint16Array(count * 6);
  for (let i = 0; i < count; i++) index.set([0, 1, 2, 2, 1, 3].map((corner) => i * 4 + corner), i * 6);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', position).setAttribute('uv', uv).setAttribute('color', colour);
  geometry.setIndex(new BufferAttribute(index, 1));
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  return {
    mesh,
    count,
    /**
     * Where quad i is: its middle, half of its width as a step to the right (x, y), and half of its height as
     * a step up (x, y, z). An upright card has only ux and vy; one that lies on the ground has ux and vz.
     */
    put(i: number, x: number, y: number, z: number, ux: number, uy: number, vx: number, vy: number, vz = 0): void {
      // Bottom left, bottom right, top left, top right. Nothing is allocated: what moves is put every frame.
      for (let corner = 0, at = i * 12; corner < 4; corner++) {
        const right = corner & 1 ? 1 : -1;
        const up = corner & 2 ? 1 : -1;
        position.array[at++] = x + right * ux + up * vx;
        position.array[at++] = y + right * uy + up * vy;
        position.array[at++] = z + up * vz;
      }
      position.needsUpdate = true;
    },
    /** Which part of the picture quad i shows, as shares of the picture counted from its top left corner. */
    cell(i: number, left: number, top: number, wide: number, tall: number): void {
      uv.array.set([left, 1 - top - tall, left + wide, 1 - top - tall, left, 1 - top, left + wide, 1 - top], i * 8);
      uv.needsUpdate = true;
    },
    /** Its colour, in linear light as `Color` holds it, and its opacity. */
    tint(i: number, r: number, g: number, b: number, a: number): void {
      for (let at = i * 16; at < i * 16 + 16; at += 4) {
        colour.array[at] = r;
        colour.array[at + 1] = g;
        colour.array[at + 2] = b;
        colour.array[at + 3] = a;
      }
      colour.needsUpdate = true;
    },
  };
}
export type QuadBatch = ReturnType<typeof quadBatch>;
