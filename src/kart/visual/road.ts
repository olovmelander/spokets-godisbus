// Road, grid paint and crowned kerbs adapted from Pekkas Pokal 7762360 trackside.js.
// The route and surface table remain the real Varggropen trace; only the paint palette changes.
import * as THREE from 'three';
import { createBatch, trackRibbon } from '../ported/kit.js';
import { trackLayout, asphaltMaterial, paintMaterial, surfaceMaterial, EDGE_LINE, GRID_SLOTS, KERB_INNER, KERB_OUTER } from '../ported/surfaces.js';
import { createRoute, ROAD_HALF_WIDTH } from '../ported/route.js';
export function roadSurface(route: ReturnType<typeof createRoute>, group: THREE.Group, anisotropy: number) {
  const layout = trackLayout(route), {length, sample} = route;
  /* ---------------------------------------------------------- road surface */
  const gravel = surfaceMaterial('gravel', anisotropy);
  const gravelMesh = new THREE.Mesh(trackRibbon(route, { from: -4.75, to: 4.75, lift: 0.012, columns: 2 }), gravel);
  gravelMesh.receiveShadow = true; gravelMesh.name = 'gravel'; group.add(gravelMesh);
  const asphalt = asphaltMaterial(anisotropy);
  const road = new THREE.Mesh(trackRibbon(route, {
    from: -ROAD_HALF_WIDTH, to: ROAD_HALF_WIDTH, lift: 0.04, columns: 6, step: 0.6,
    track: (d) => layout.racingLine(d), color: () => 1
  }), asphalt);
  road.receiveShadow = true; road.name = 'asphalt'; group.add(road);

  /* ---------------------------------------------------------- paint */
  const paint = paintMaterial();
  const paintBatch = createBatch();
  // Edge lines run everywhere except under a kerb.
  for (const side of [-1, 1]) {
    let runStart = null;
    for (let d = 0; d <= length; d += 0.5) {
      const kerb = d < length && layout.kerbAt(d, side);
      if (!kerb && runStart === null) runStart = d;
      if ((kerb || d >= length) && runStart !== null) {
        if (d - runStart > 0.6) paintBatch.addMatrix(trackRibbon(route, { from: side * EDGE_LINE[0], to: side * EDGE_LINE[1], start: runStart, end: d, lift: 0.048, step: 1 }), paint, new THREE.Matrix4(), 0xf4e3bb);
        runStart = null;
      }
    }
  }
  // Start/finish: a chequered band, a solid line on its leading edge.
  const tile = 0.5, rows = 3;
  for (let row = 0; row < rows; row++) for (let i = 0; i < 14; i++) {
    const d0 = -0.75 + row * tile, lane0 = -3.5 + i * tile;
    paintBatch.addMatrix(trackRibbon(route, { from: lane0, to: lane0 + tile, start: d0, end: d0 + tile, lift: 0.048, step: tile }), paint, new THREE.Matrix4(), (row + i) % 2 ? 0x1b1f1d : 0xf4e3bb);
  }
  paintBatch.addMatrix(trackRibbon(route, { from: -3.5, to: 3.5, start: 0.75, end: 0.9, lift: 0.048, step: 0.15 }), paint, new THREE.Matrix4(), 0xf4e3bb);
  // Grid boxes: front bar and two short side legs, painted on the asphalt.
  for (const slot of GRID_SLOTS) {
    const front = slot.distance + 1.25, w = 0.85, line = 0.09;
    paintBatch.addMatrix(trackRibbon(route, { from: slot.lane - w, to: slot.lane + w, start: front - line, end: front, lift: 0.048, step: 0.1 }), paint, new THREE.Matrix4(), 0xf4e3bb);
    for (const edge of [-1, 1]) {
      const lane = slot.lane + edge * w;
      paintBatch.addMatrix(trackRibbon(route, { from: lane - line / 2, to: lane + line / 2, start: front - 1.6, end: front, lift: 0.048, step: 0.4 }), paint, new THREE.Matrix4(), 0xf4e3bb);
    }
  }
  paintBatch.build(group, { castShadow: false, name: 'paint' });

  /* ---------------------------------------------------------- kerbs */
  // Crowned profile across the kerb (lane offset from its inner edge, height
  // over the terrain): 8 mm above the asphalt at the road, 4.5 cm crown.
  const width = KERB_OUTER - KERB_INNER;
  const profile = [[0, 0.046], [0.1, 0.07], [0.32, 0.084], [width - 0.22, 0.08], [width - 0.08, 0.05], [width, 0.012]];
  const kerbPositions = [], kerbColors = [], kerbIndices = [];
  const red = new THREE.Color(0xc96555), white = new THREE.Color(0xf4e3bb);
  for (const kerb of layout.kerbs) {
    const pieceLength = (kerb.end - kerb.start) / kerb.pieces;
    for (let piece = 0; piece < kerb.pieces; piece++) {
      const color = piece % 2 ? white : red;
      const base = kerbPositions.length / 3;
      const rowsPerPiece = 3;
      for (let r = 0; r < rowsPerPiece; r++) {
        // Tiny gap between pieces gives each block an edge.
        const d = kerb.start + pieceLength * (piece + 0.015 + 0.97 * r / (rowsPerPiece - 1));
        for (const [offset, height] of profile) {
          const lane = kerb.side * (KERB_INNER + offset);
          const p = sample(d, lane).position;
          kerbPositions.push(p.x, p.y + height, p.z);
          kerbColors.push(color.r, color.g, color.b);
        }
      }
      const cols = profile.length;
      for (let r = 0; r < rowsPerPiece - 1; r++) for (let c = 0; c < cols - 1; c++) {
        const a = base + r * cols + c, b = a + cols;
        if (kerb.side > 0) kerbIndices.push(a, b, a + 1, a + 1, b, b + 1); else kerbIndices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const kerbGeometry = new THREE.BufferGeometry();
  kerbGeometry.setAttribute('position', new THREE.Float32BufferAttribute(kerbPositions, 3));
  kerbGeometry.setAttribute('color', new THREE.Float32BufferAttribute(kerbColors, 3));
  kerbGeometry.setIndex(kerbIndices); kerbGeometry.computeVertexNormals();
  const kerbMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const kerbMesh = new THREE.Mesh(kerbGeometry, kerbMaterial); kerbMesh.name = 'kerbs';
  kerbMesh.receiveShadow = true; group.add(kerbMesh);

  return layout;
}
