import {
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Original geometry, packed into one material/draw per craft. Feet stay at the simulation's origin. */
function painted(
  parts: { geometry: BufferGeometry; colour: string }[],
  name: string,
): Mesh {
  const geometries = parts.map(({ geometry, colour }) => {
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    const c = new Color(colour),
      colours = [];
    for (let i = 0; i < flat.getAttribute("position").count; i++)
      colours.push(c.r, c.g, c.b);
    flat.setAttribute("color", new Float32BufferAttribute(colours, 3));
    flat.deleteAttribute("uv");
    if (flat !== geometry) geometry.dispose();
    return flat;
  });
  const geometry = mergeGeometries(geometries)!;
  geometries.forEach((g) => g.dispose());
  const craft = new Mesh(
    geometry,
    new MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.83,
      side: DoubleSide,
    }),
  );
  craft.name = name;
  return craft;
}

function facet(points: number[][]): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(points.flat(), 3),
  );
  geometry.computeVertexNormals();
  return geometry;
}

/** A real folded dart: broad wings, raised creases, a deep keel and blue pencil marks on the paper. */
export function paperPlane(): Mesh {
  const nose = [1.32, -0.09, 0],
    tail = [-1, -0.03, 0];
  const parts = [];
  for (const side of [-1, 1]) {
    const fold = [-0.86, 0.01, side * 0.23],
      wing = [-1.12, -0.14, side * 0.9],
      keel = [-0.93, -0.3, 0];
    parts.push(
      {
        geometry: facet([nose, fold, wing]),
        colour: side > 0 ? "#fff7df" : "#e8e4d8",
      },
      {
        geometry: facet([nose, tail, fold]),
        colour: side > 0 ? "#f3ebd8" : "#d3d7d4",
      },
      { geometry: facet([nose, keel, tail]), colour: "#c7c6bd" },
    );
    // Tiny folded winglets make the rear silhouette readable even from ground level.
    parts.push({
      geometry: facet([
        [-1.12, -0.14, side * 0.9],
        [-0.65, -0.1, side * 0.72],
        [-1.06, 0.055, side * 0.83],
      ]),
      colour: "#f3eedf",
    });
    for (let i = 0; i < 3; i++) {
      const x = -0.8 + i * 0.12,
        z = side * (0.46 - i * 0.04);
      parts.push({
        geometry: facet([
          [x, -0.043, z],
          [x + 0.08, -0.039, z - side * 0.014],
          [x + 0.06, -0.044, z + side * 0.016],
        ]),
        colour: "#7192ae",
      });
    }
  }
  const craft = painted(parts, "moa-paper-plane");
  craft.scale.setScalar(0);
  craft.frustumCulled = false;
  return craft;
}

/** Bertil's red-and-white cap, inverted: six stitched cloth panels, a curved peak and plain patch. */
export function capBoat(): Mesh {
  const parts = [];
  const red = "#ba443b",
    cream = "#ede8db";
  for (let panel = 0; panel < 6; panel++) {
    const start = (panel * Math.PI) / 3;
    const crown = new SphereGeometry(
      0.78,
      6,
      10,
      start,
      Math.PI / 3,
      Math.PI / 2,
      Math.PI / 2,
    );
    crown.scale(1.13, 0.64, 0.91).translate(0, -0.025, 0);
    parts.push({
      geometry: crown,
      colour: panel === 0 || panel === 5 ? cream : red,
    });
    // Real seams, drawn as slim strips; cream stitching follows each panel's curved edge.
    for (let stitch = 0; stitch < 7; stitch++) {
      const a = Math.PI / 2 + stitch * 0.17;
      const seam = new SphereGeometry(
        0.784,
        1,
        1,
        start - 0.008,
        0.016,
        a,
        0.08,
      );
      seam.scale(1.13, 0.64, 0.91).translate(0, -0.025, 0);
      parts.push({ geometry: seam, colour: "#f4d9bd" });
    }
  }
  const lip = new TorusGeometry(0.78, 0.037, 6, 40)
    .rotateX(Math.PI / 2)
    .scale(1.13, 1, 0.91)
    .translate(0, -0.022, 0);
  parts.push({ geometry: lip, colour: "#8c3c36" });
  const visor = new SphereGeometry(
    0.82,
    20,
    5,
    0,
    Math.PI,
    Math.PI / 2 - 0.09,
    0.18,
  );
  visor
    .rotateY(Math.PI / 2)
    .scale(0.9, 0.36, 0.8)
    .translate(0.57, -0.057, 0);
  parts.push({ geometry: visor, colour: red });
  const button = new SphereGeometry(0.07, 10, 6)
    .scale(1, 0.5, 1)
    .translate(0, -0.53, 0);
  parts.push({ geometry: button, colour: "#96392f" });
  // A plain patch, with coloured blocks; never a brand or lettering.
  const patch = new CylinderGeometry(0.135, 0.135, 0.014, 12)
    .rotateZ(Math.PI / 2)
    .translate(0.68, -0.25, 0);
  parts.push({ geometry: patch, colour: cream });
  for (const [y, z, colour] of [
    [-0.22, -0.043, "#deb958"],
    [-0.22, 0.043, "#6d95ae"],
    [-0.29, 0, "#7f9c65"],
  ] as const) {
    parts.push({
      geometry: new SphereGeometry(0.033, 7, 5)
        .scale(0.24, 1, 1)
        .translate(0.692, y, z),
      colour,
    });
  }
  return painted(parts, "bertil-cap-boat");
}
