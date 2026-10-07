import { BufferGeometry, Color, Float32BufferAttribute, Mesh, MeshStandardMaterial } from 'three';
import type { ChapterData } from '../../sim/types';
import { DRAIN_BACK, DRAIN_FRONT, drainsOf, streetDrop } from './ground';

/** How wide a drain's cast frame is, round its grate. */
export const FRAME = 0.6;
/** How far its frame lies over the road: a hair, so that it is drawn over it. */
const OVER = 0.012;
const IRON = new Color('#2a3039');
const WORN = new Color('#8b9098');

/**
 * The cast frame round each drain's grate, lying in the road (docs/visual-audit/byn.md row 9): a strip
 * behind the bars, one in front of them at the edge of the path, and one down each side. It is as flat as
 * the road it lies in, a hair over it, so that nothing of it stands where he walks, and its inner edge is
 * worn bright. Every drain's frame is one draw.
 */
export function drainFrame(chapter: ChapterData): Mesh | null {
  const position: number[] = [];
  const colour: number[] = [];
  const index: number[] = [];
  const c = new Color();
  /**
   * A strip of the frame, flat on the road between x0 and x1 and between depths z0 and z1. `inner` says
   * which of its edges is the grate's: x0, x1, z0 or z1.
   */
  const strip = (x0: number, x1: number, z0: number, z1: number, y: number, inner: 'x0' | 'x1' | 'z0' | 'z1') => {
    // Corners along its depth wherever the road bends there, and across it at its edges and a little in.
    const depths = [z0, ...[0.6, 0.75, 0.9, 1.1].filter((z) => z > z0 && z < z1), z1];
    const across = (inner === 'x0' || inner === 'x1') ? [x0, x0 + 0.08, x1 - 0.08, x1] : [x0, x1];
    const along = (inner === 'z0' || inner === 'z1') ? [z0, z0 + 0.08, ...depths.filter((z) => z > z0 + 0.08 && z < z1 - 0.08), z1 - 0.08, z1] : depths;
    const first = position.length / 3;
    for (const z of along) {
      for (const x of across) {
        position.push(x, y - streetDrop(z) + OVER, z);
        const edge = inner === 'x0' ? x === x0 : inner === 'x1' ? x === x1 : inner === 'z0' ? z === z0 : z === z1;
        c.copy(IRON).lerp(WORN, edge ? 0.5 : 0);
        colour.push(c.r, c.g, c.b);
      }
    }
    const wide = across.length;
    for (let r = 0; r < along.length - 1; r++) {
      for (let k = 0; k < wide - 1; k++) {
        const a = first + r * wide + k;
        // Faces up: towards the back from each row, to the right along it.
        index.push(a, a + wide, a + wide + 1, a, a + wide + 1, a + 1);
      }
    }
  };
  for (const drain of drainsOf(chapter)) {
    const { from, to, y } = drain;
    strip(from - FRAME, to + FRAME, DRAIN_BACK - FRAME, DRAIN_BACK, y, 'z1');
    strip(from - FRAME, to + FRAME, DRAIN_FRONT, DRAIN_FRONT + FRAME, y, 'z0');
    strip(from - FRAME, from, DRAIN_BACK, DRAIN_FRONT, y, 'x1');
    strip(to, to + FRAME, DRAIN_BACK, DRAIN_FRONT, y, 'x0');
  }
  if (index.length === 0) return null;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colour, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const mesh = new Mesh(geometry, new MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }));
  mesh.name = 'drain-frame';
  return mesh;
}
