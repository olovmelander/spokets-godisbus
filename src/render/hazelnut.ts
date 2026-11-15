import { BufferGeometry, Color, Float32BufferAttribute, LatheGeometry, Mesh, MeshStandardMaterial, Vector2 } from 'three';

/**
 * A ripe hazelnut out of its husk, as Elof finds one on Billaberget (Olov, 14 November 2026: "På berget vid
 * hasselnötsbuskarna ska Elof hitta en hasselnöt och säga något om fyndet"). To him, fifteen centimetres tall, a nut is
 * as big as his head: about a quarter of his height long. An egg a little flattened, glossy chestnut brown with faint
 * darker stripes from its foot to its point, the point itself paler, with a tiny tuft; its foot a broad, rough, pale
 * scar where it sat in its husk.
 *
 * Its foot's middle is at the origin and its point along +y, so that it lies or is held as it is turned. Measured for him
 * small (1 EL tall): scale it by how tall he is drawn.
 */
export const HAZELNUT = { long: 0.27, wide: 0.23 };

const SHELL = new Color('#8a5328');
const DARK = new Color('#5c3417');
const SCAR = new Color('#cdb790');
const TIP = new Color('#a87a4c');

/** The nut's shape and its colours. */
export function hazelnutShape(): BufferGeometry {
  const rows = 16;
  const outline: Vector2[] = [];
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    // From its broad foot, round and full low down, narrowing to a short blunt point.
    const r = (HAZELNUT.wide / 2) * Math.sin(Math.PI * Math.min(1, 0.04 + t * 0.98)) ** 0.75 * (1 - 0.22 * t * t) * (t < 0.06 ? 0.55 + 7.5 * t : 1);
    outline.push(new Vector2(Math.max(0.0005, r), HAZELNUT.long * t));
  }
  const lathe = new LatheGeometry(outline, 22);
  const shape = lathe.toNonIndexed();
  lathe.dispose();
  shape.deleteAttribute('uv');
  // A little flattened, as a hazelnut is: broader one way than the other.
  shape.scale(1, 1, 0.86);
  const at = shape.getAttribute('position');
  const colours = new Float32Array(at.count * 3);
  const c = new Color();
  for (let i = 0; i < at.count; i++) {
    const x = at.getX(i), y = at.getY(i), z = at.getZ(i);
    const t = y / HAZELNUT.long;
    const round = Math.atan2(z, x);
    // Its stripes, and a sheen of red-brown along the middle; darker towards the point.
    const stripe = 0.5 + 0.5 * Math.sin(round * 9 + Math.sin(t * 7) * 0.6);
    c.copy(SHELL).lerp(DARK, 0.18 + 0.32 * stripe * Math.sin(Math.PI * Math.min(1, t * 1.2)) + 0.25 * Math.max(0, t - 0.6));
    if (t > 0.9) c.lerp(TIP, (t - 0.9) / 0.1);
    // The scar at its foot: pale and rough, its edge ragged.
    const edge = 0.2 + 0.035 * Math.sin(round * 5) + 0.02 * Math.sin(round * 11 + 1);
    if (t < edge) c.copy(SCAR).multiplyScalar(0.82 + 0.3 * (0.5 + 0.5 * Math.sin(round * 23 + t * 40)));
    colours.set([c.r, c.g, c.b], i * 3);
  }
  shape.setAttribute('color', new Float32BufferAttribute(colours, 3));
  shape.computeVertexNormals();
  shape.computeBoundingSphere();
  return shape;
}

let shared: { shape: BufferGeometry; material: MeshStandardMaterial } | null = null;

/** A hazelnut to place: one mesh, its shape and material shared with every other. */
export function hazelnut(): Mesh {
  // The shell is smooth and a little glossy; wet from the rain, more so.
  shared ??= { shape: hazelnutShape(), material: new MeshStandardMaterial({ vertexColors: true, roughness: 0.38 }) };
  const mesh = new Mesh(shared.shape, shared.material);
  mesh.name = 'hazelnut';
  mesh.castShadow = true;
  return mesh;
}
