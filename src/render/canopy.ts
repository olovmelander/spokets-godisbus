import {
  CanvasTexture, DoubleSide, DynamicDrawUsage, InstancedMesh, Matrix3, MeshBasicMaterial, Object3D, PlaneGeometry,
  RepeatWrapping, Vector2, Vector3, type DirectionalLight, type Texture,
} from 'three';

/** How high the crowns hang over the ground he walks on, in EL: up among the spruces' tops. */
const HIGH = 26;
/** Where the ground in the picture lies, behind the play plane: the crowns cover it, round this depth. */
const MIDDLE = -8;
/** How many of the leaves' tiles each layer is across: enough to cover the sun's shadow map round him. */
const TILES = 16;
/**
 * Two layers of crowns, one over the other. Each is the same sheet of leaves with sky through it, at its own size
 * and turned its own way, so that the sun comes through only where both let it: in flecks of every shape, which
 * shimmer as the two sway against each other. `size` is one tile's width in EL; `lift` is how much higher it hangs.
 */
const LAYERS = [
  { size: 9, turn: 0, lift: 0, shift: 0, pace: 0.55 },
  { size: 6.5, turn: Math.PI / 2, lift: 3, shift: 0.37, pace: 0.8 },
] as const;
/** How much of each layer is sky: about a quarter of the ground gets the sun through both. */
const OPEN = 0.5;

/**
 * The crowns as the ground's shader sees them (./ground-detail.ts), shared by every patched material so that nothing
 * compiles when they change. The forest floor takes far more light from the sky than from the sun, so the sun's
 * shadow alone leaves its flecks faint; the floor paints them as well, from the same leaves in the same places, so
 * that they lie exactly where the crowns' shade on him and on the family has its gaps, and reach as far as the eye
 * does, past the sun's shadow map. `on` is how strong (by day 1, at night 0, off below High); `layers` take a point
 * of a layer, in the world's x and z, to its place on the sheet; `high` is how high each layer hangs; `beam` is how
 * far the sun's light moves in x and z for each EL it comes down.
 */
export const CANOPY = {
  on: { value: 0 },
  sheet: { value: null as Texture | null },
  layers: { value: LAYERS.map(() => new Matrix3()) },
  high: { value: new Vector2() },
  beam: { value: new Vector2() },
};

/**
 * The crowns' leaves, seen from below: a sheet that repeats, white where a leaf is, with holes of sky in clusters.
 * Under a tall crown a fleck of sun is a picture of the sun, round, whatever the gap; so the holes are round, from a
 * hand's width to a step wide for him (1 EL is his height), which is how big the flecks are to someone his size.
 */
function leafSheet(): CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d', { willReadFrequently: true })!;
  let seed = 11;
  const next = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, size, size);
  g.globalCompositeOperation = 'destination-out';
  const open = () => {
    const alpha = g.getImageData(0, 0, size, size).data;
    let sky = 0;
    for (let i = 3; i < alpha.length; i += 4) if (alpha[i]! < 128) sky++;
    return sky / (size * size);
  };
  // Clusters of round holes, each wrapped round the sheet's edges so that it repeats without a seam.
  for (let cluster = 0; cluster < 400; cluster++) {
    if (cluster % 4 === 0 && open() >= OPEN) break;
    const cx = next() * size, cy = next() * size;
    const holes = 1 + Math.floor(next() * 4);
    for (let k = 0; k < holes; k++) {
      const r = 4 + next() * next() * 20;
      const x = cx + (next() - 0.5) * r * 2.4, y = cy + (next() - 0.5) * r * 2.4;
      for (const dx of [-size, 0, size]) {
        for (const dy of [-size, 0, size]) {
          g.beginPath();
          g.arc(x + dx, y + dy, r, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.anisotropy = 1;
  return texture;
}

/**
 * Sunlight through the leaves (Unravel's dappled light), cast for real on High: crowns high over the ground round
 * him, which only the sun's shadow map sees. Their shade falls on the ground, on him, on the family and on everything
 * that takes the sun's shadow, with flecks of sun between. The leaves stay where they are in the world, so the flecks
 * do not slide with the camera; they only shimmer as the crowns sway. One instanced draw in the shadow pass, and one
 * that writes nothing in the picture.
 */
export function createCanopy(sun: DirectionalLight) {
  const geometry = new PlaneGeometry(TILES, TILES);
  // The sheet repeats once per unit, so that each layer, scaled by its tile's size, has whole tiles on the world's grid.
  const uv = geometry.attributes.uv!;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * TILES, uv.getY(i) * TILES);
  const material = new MeshBasicMaterial({ map: leafSheet(), alphaTest: 0.5, side: DoubleSide, colorWrite: false, depthWrite: false });
  const mesh = new InstancedMesh(geometry, material, LAYERS.length);
  mesh.name = 'canopy';
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  // A marked caster (./character-shadows.ts). In the picture it writes no colour and no depth: only the sun's shadow
  // map sees it (three.js casts only what the picture's camera may see, so it stays on the common layer).
  mesh.userData.casts = true;
  mesh.visible = false;
  const place = new Object3D();
  const beam = new Vector3();
  return {
    mesh,
    /**
     * Over the place round `focusX`. Each layer moves on a whole tile at a time, so the light on the ground stays put
     * while the camera follows him; `wind` sways the crowns further.
     */
    update(focusX: number, focusY: number, clock: number, wind: number): void {
      if (!mesh.visible) return;
      beam.copy(sun.position).sub(sun.target.position).normalize();
      const rise = Math.max(0.25, beam.y);
      CANOPY.sheet.value = material.map;
      CANOPY.beam.value.set(beam.x / rise, beam.z / rise);
      LAYERS.forEach((layer, n) => {
        const reach = 0.12 + 0.3 * wind;
        const swayX = Math.sin(clock * layer.pace + n * 2.1) * reach + Math.sin(clock * layer.pace * 2.7 + n) * reach * 0.3;
        const swayZ = Math.cos(clock * layer.pace * 0.8 + n * 1.3) * reach * 0.6;
        // The layer's tiles lie on the world's grid as their shade falls on level ground, whole tiles round him; the
        // layer hangs over that, moved towards the sun by as much as its shade falls away from it. So the flecks stay
        // where they lie on the ground as he climbs and the crowns rise with him.
        // Measured on the ground, a place's pattern is where its shade falls, less how far the sun throws it from
        // that ground's height; round him that is the focus' own.
        const alongX = (focusX - beam.x / rise * focusY) / layer.size, alongZ = (MIDDLE - beam.z / rise * focusY) / layer.size;
        const high = focusY + HIGH + layer.lift;
        place.position.set(
          (Math.round(alongX) + layer.shift) * layer.size + beam.x / rise * high + swayX,
          high,
          (Math.round(alongZ) + layer.shift) * layer.size + beam.z / rise * high + swayZ,
        );
        place.rotation.set(-Math.PI / 2, 0, layer.turn);
        place.scale.set(layer.size, layer.size, 1);
        place.updateMatrix();
        mesh.setMatrixAt(n, place.matrix);
        // The same layer for the ground: from a point's x and z to the sheet, as the plane's own coordinates give it
        // (turned by the layer's turn, then laid level, so that the world's z runs against the sheet's second axis).
        const c = Math.cos(layer.turn) / layer.size, s = Math.sin(layer.turn) / layer.size;
        const px = place.position.x, pz = place.position.z;
        CANOPY.layers.value[n]!.set(
          c, -s, -(c * px - s * pz),
          -s, -c, -(-s * px - c * pz),
          0, 0, 1,
        );
        CANOPY.high.value.setComponent(n, place.position.y);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
    setOn(on: boolean): void { mesh.visible = on; },
    dispose(): void {
      if (CANOPY.sheet.value === material.map) CANOPY.sheet.value = null;
      geometry.dispose(); material.map?.dispose(); material.dispose();
    },
  };
}
