import { BufferGeometry, Color, DynamicDrawUsage, Float32BufferAttribute, Matrix4, MeshStandardMaterial, SkinnedMesh, Uint16BufferAttribute, Vector3, type Object3D } from 'three';
import { drawnWhile } from './idle';

/**
 * Faces that speak and blink (Olov, 9 November 2026: "Går det även lägga till lip-sync för den som pratar?"), made in game code
 * as each model is put on its rig, as the fingers are (./fingers.ts): nothing in the private models changes.
 *
 * The family's faces are painted on in the vertex colours: a closed smile drawn as a thin line of lip colour, with no mouth
 * in the shape, no shape keys and no jaw; and each eye is a dome in an opening of the face, with no lids. So each face is
 * measured where it is painted (`measureFace`): the eyes from the eyes' own mesh, and the mouth found by its colour and its
 * place, as the line of lip colour under the nose within the eyes' width, followed across from its darkest middle to where it
 * fades at its corners. Then one small mesh is made over the face (`buildFace`), on the body's own skeleton and its Head bone,
 * with a copy of the body's own material, so that it goes with the head and makes no new shader:
 *
 * - the mouth: it lies on the face over the painted line, which it matches shut. Opening, the lower lip goes down under a
 *   dark mouth, the upper teeth show under the upper lip as it opens wide, and the tongue low in it; rounded (o, u), the
 *   opening narrows to a round one between corners that stay shut, as lips do;
 * - the lids: a skin-coloured shell over each eyeball, the lashes' colour at its edge, tucked away behind the face over the
 *   eye while the eye is open, and turned down over the eye to blink.
 *
 * None of it is drawn while the mouth is shut and the eyes are open, and a frame redraws only what has changed.
 */

/** The front of the face drawn into a grid in face terms, `u` across and `w` up from between the eyes: depth and colour. */
export interface FaceGrid { u0: number; w0: number; cell: number; nu: number; nw: number; depth: Float32Array; colour: Float32Array }

/** An eye: its eyeball's middle and radius in head space, and its opening in the face (radians from its forward axis). */
export interface EyeLayout {
  centre: Vector3;
  radius: number;
  /** Up to the top of the opening and down to its bottom (both positive), half its width, and where the lid is tucked open. */
  top: number; bottom: number; half: number; tucked: number;
  /** The lid's colour, and its lashes'. */
  skin: Color; lash: Color;
}

/**
 * The painted mouth: its line's middle across (pairs of u, w), its corners, how thick it is painted, and its colour. A grin
 * painted open with its teeth showing (Bertil's) has `grin`: at each step across, how far down from the line its lower edge is.
 */
export interface MouthLayout { line: Float32Array; from: number; to: number; thick: number; lip: Color; grin: Float32Array | null }

/**
 * A face measured at rest in head space (the Head bone's own frame, as the body was bound). `left`, `up` and `ahead` are the
 * face's own directions there; `centre` is the middle between the eyes and `spacing` the distance between them: the face's
 * own unit.
 */
export interface FaceLayout {
  left: Vector3; up: Vector3; ahead: Vector3;
  centre: Vector3; spacing: number;
  eyes: EyeLayout[];
  mouth: MouthLayout | null;
  grid: FaceGrid;
}

/** At full open, how far the mouth opens below its line, in eye spacings. */
const OPEN_HEIGHT = 0.3;
/** How far over the face its parts lie, in eye spacings: enough not to fight it in the depth, too little to see. */
const LIFT = 0.012;
/** The face's grid, in eye spacings from between the eyes: across, and from below the mouth to over the eyes. */
const ACROSS = 1.1, FROM = -1.25, TO = 0.6;
/** Where the mouth is looked for in it: its middle within this of the face's middle, below the eyes this far. */
const MOUTH_MIDDLE = 0.2, MOUTH_BELOW: readonly [number, number] = [0.35, 1.2];

const luma = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** The Head bone's index in a skinned body's skeleton, or -1. */
function headOf(mesh: SkinnedMesh): number {
  return mesh.skeleton.bones.findIndex((bone) => bone.name === 'Head' || bone.name === 'head');
}

/** How much of a corner the head alone moves. */
function headShare(mesh: SkinnedMesh, head: number, i: number): number {
  const index = mesh.geometry.getAttribute('skinIndex'), weight = mesh.geometry.getAttribute('skinWeight');
  let w = 0;
  for (let k = 0; k < 4; k++) if (index.getComponent(i, k) === head) w += weight.getComponent(i, k);
  return w;
}

/** The pieces a mesh's triangles join it into: each corner's piece. Corners in one place are one, indexed or not. */
function pieces(geometry: BufferGeometry): Int32Array {
  const position = geometry.getAttribute('position');
  const count = position.count, parent = Int32Array.from({ length: count }, (_, i) => i);
  const find = (i: number): number => { while (parent[i] !== i) { parent[i] = parent[parent[i]!]!; i = parent[i]!; } return i; };
  const index = geometry.index, corners = index ? index.count : count;
  for (let t = 0; t + 2 < corners; t += 3) {
    const a = index ? index.getX(t) : t, b = index ? index.getX(t + 1) : t + 1, c = index ? index.getX(t + 2) : t + 2;
    parent[find(a)] = find(b); parent[find(b)] = find(c);
  }
  const seen = new Map<string, number>();
  for (let i = 0; i < count; i++) {
    const key = `${position.getX(i)},${position.getY(i)},${position.getZ(i)}`, first = seen.get(key);
    if (first === undefined) seen.set(key, i); else parent[find(i)] = find(first);
  }
  return parent.map((_, i) => find(i));
}

/** The face's depth at (u, w), between the grid's cells. */
export function depthAt(grid: FaceGrid, u: number, w: number): number {
  const x = Math.min(grid.nu - 1.001, Math.max(0, (u - grid.u0) / grid.cell)), y = Math.min(grid.nw - 1.001, Math.max(0, (w - grid.w0) / grid.cell));
  const j = Math.floor(x), i = Math.floor(y), fx = x - j, fy = y - i, d = grid.depth, n = grid.nu;
  const k = i * n + j;
  return (d[k]! * (1 - fx) + d[k + 1]! * fx) * (1 - fy) + (d[k + n]! * (1 - fx) + d[k + n + 1]! * fx) * fy;
}

/**
 * Measures a face from its painted body and its eyes, in head space. Null when it is not one of the family's faces: no Head
 * bone, no colours, or not two eyes.
 */
export function measureFace(painted: SkinnedMesh, eyes: SkinnedMesh | null): FaceLayout | null {
  const head = headOf(painted), colour = painted.geometry.getAttribute('color');
  if (head < 0 || !colour || !eyes) return null;
  const eyeHead = headOf(eyes);
  if (eyeHead < 0) return null;
  // The body's own directions (its left +x, up +y, ahead +z) in the head's frame.
  const inverse = painted.skeleton.boneInverses[head]!;
  const left = new Vector3(1, 0, 0).transformDirection(inverse), up = new Vector3(0, 1, 0).transformDirection(inverse);
  const ahead = new Vector3(0, 0, 1).transformDirection(inverse);
  const toHead = new Matrix4().multiplyMatrices(inverse, painted.bindMatrix);
  const eyeToHead = new Matrix4().multiplyMatrices(eyes.skeleton.boneInverses[eyeHead]!, eyes.bindMatrix);

  // The eyeballs: the two largest pieces of the eyes' mesh, each the front of a sphere. From its width and its depth, its
  // radius; its middle that far behind its front.
  const eyePosition = eyes.geometry.getAttribute('position'), piece = pieces(eyes.geometry);
  const sizes = new Map<number, number>();
  for (const p of piece) sizes.set(p, (sizes.get(p) ?? 0) + 1);
  const at = new Vector3();
  const spheres = [...sizes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([id]) => {
    const points: Vector3[] = [];
    for (let i = 0; i < eyePosition.count; i++) if (piece[i] === id) points.push(new Vector3().fromBufferAttribute(eyePosition, i).applyMatrix4(eyeToHead));
    const middle = points.reduce((sum, p) => sum.add(p), new Vector3()).divideScalar(Math.max(1, points.length));
    let front = -Infinity, back = Infinity, half = 0;
    for (const p of points) {
      const d = at.subVectors(p, middle).dot(ahead);
      front = Math.max(front, d); back = Math.min(back, d);
      half = Math.max(half, Math.abs(at.dot(left)), Math.abs(at.dot(up)));
    }
    const depth = Math.max(1e-6, front - back), radius = Math.min((half * half + depth * depth) / (2 * depth), half * 1.6);
    return { centre: middle.clone().addScaledVector(ahead, front - radius), radius, points: points.length };
  }).sort((a, b) => a.centre.dot(left) - b.centre.dot(left));
  if (spheres.length < 2 || spheres.some((one) => one.points < 12)) return null;
  const centre = spheres[0]!.centre.clone().add(spheres[1]!.centre).multiplyScalar(0.5);
  const spacing = spheres[1]!.centre.clone().sub(spheres[0]!.centre).dot(left);
  if (!(spacing > 0)) return null;

  // The front of the face, drawn into the grid: of what the head alone moves, what faces forward, the nearest of it.
  const position = painted.geometry.getAttribute('position'), count = position.count;
  const face = new Float32Array(count * 3), paint = new Float32Array(count * 3), headed = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    if (headShare(painted, head, i) < 0.9) continue;
    headed[i] = 1;
    at.fromBufferAttribute(position, i).applyMatrix4(toHead).sub(centre);
    face[i * 3] = at.dot(left); face[i * 3 + 1] = at.dot(up); face[i * 3 + 2] = at.dot(ahead);
    paint[i * 3] = colour.getX(i); paint[i * 3 + 1] = colour.getY(i); paint[i * 3 + 2] = colour.getZ(i);
  }
  const cell = spacing / 72, u0 = -ACROSS * spacing, w0 = FROM * spacing;
  const nu = Math.ceil(2 * ACROSS * spacing / cell) + 1, nw = Math.ceil((TO - FROM) * spacing / cell) + 1;
  const depth = new Float32Array(nu * nw).fill(-Infinity), shade = new Float32Array(nu * nw * 3);
  const index = painted.geometry.index, corners = index ? index.count : count;
  const tv = [0, 0, 0];
  for (let t = 0; t + 2 < corners; t += 3) {
    let inside = true;
    for (let k = 0; k < 3; k++) {
      tv[k] = index ? index.getX(t + k) : t + k;
      if (!headed[tv[k]!]) inside = false;
    }
    if (!inside) continue;
    const a = tv[0]! * 3, b = tv[1]! * 3, c = tv[2]! * 3;
    const ua = face[a]!, ub = face[b]!, uc = face[c]!, wa = face[a + 1]!, wb = face[b + 1]!, wc = face[c + 1]!;
    // Either way round: the family's paint is drawn on both sides (the mouth's line is a thin strip of its own over the face).
    const area = (ub - ua) * (wc - wa) - (uc - ua) * (wb - wa);
    if (Math.abs(area) <= 1e-14) continue;
    const from = Math.max(0, Math.floor((Math.min(ua, ub, uc) - u0) / cell)), to = Math.min(nu - 1, Math.ceil((Math.max(ua, ub, uc) - u0) / cell));
    const low = Math.max(0, Math.floor((Math.min(wa, wb, wc) - w0) / cell)), high = Math.min(nw - 1, Math.ceil((Math.max(wa, wb, wc) - w0) / cell));
    for (let j = from; j <= to; j++) for (let i = low; i <= high; i++) {
      const u = u0 + j * cell, w = w0 + i * cell;
      const b0 = ((ub - u) * (wc - w) - (uc - u) * (wb - w)) / area, b1 = ((uc - u) * (wa - w) - (ua - u) * (wc - w)) / area, b2 = 1 - b0 - b1;
      if (b0 < -1e-6 || b1 < -1e-6 || b2 < -1e-6) continue;
      const d = b0 * face[a + 2]! + b1 * face[b + 2]! + b2 * face[c + 2]!, k = i * nu + j;
      if (d <= depth[k]!) continue;
      depth[k] = d;
      shade[k * 3] = b0 * paint[a]! + b1 * paint[b]! + b2 * paint[c]!;
      shade[k * 3 + 1] = b0 * paint[a + 1]! + b1 * paint[b + 1]! + b2 * paint[c + 1]!;
      shade[k * 3 + 2] = b0 * paint[a + 2]! + b1 * paint[b + 2]! + b2 * paint[c + 2]!;
    }
  }
  // What no triangle covered (the eyes' openings, a gap between the paint's strips) takes its neighbours' depth, so that the
  // face has no holes where its parts lie; what is further off (past the cheeks and the chin) lies as far back as the face.
  const filled = new Float32Array(depth.length);
  let back = Infinity;
  for (const d of depth) if (d > -Infinity) back = Math.min(back, d);
  for (let pass = 0; pass < 16; pass++) {
    let holes = 0;
    filled.set(depth);
    for (let i = 0; i < nw; i++) for (let j = 0; j < nu; j++) {
      const k = i * nu + j;
      if (depth[k]! > -Infinity) continue;
      let sum = 0, found = 0;
      if (j > 0 && depth[k - 1]! > -Infinity) { sum += depth[k - 1]!; found++; }
      if (j < nu - 1 && depth[k + 1]! > -Infinity) { sum += depth[k + 1]!; found++; }
      if (i > 0 && depth[k - nu]! > -Infinity) { sum += depth[k - nu]!; found++; }
      if (i < nw - 1 && depth[k + nu]! > -Infinity) { sum += depth[k + nu]!; found++; }
      if (found > 0) filled[k] = sum / found; else holes++;
    }
    depth.set(filled);
    if (holes === 0) break;
  }
  for (let k = 0; k < depth.length; k++) if (depth[k] === -Infinity) depth[k] = Number.isFinite(back) ? back : 0;
  const grid: FaceGrid = { u0, w0, cell, nu, nw, depth, colour: shade };

  // Each eye's opening, from the face's corners round it; the lid's colour from over it, and the lashes' its darkest.
  const eyesOut: EyeLayout[] = spheres.map(({ centre: c, radius }) => {
    let top = Infinity, bottom = Infinity, half = Infinity, darkest = Infinity;
    const lash = new Color(0.06, 0.03, 0.02), lid: number[] = [];
    const cu = at.subVectors(c, centre).dot(left), cw = at.dot(up), cd = at.dot(ahead);
    for (let i = 0; i < count; i++) {
      if (!headed[i]) continue;
      const du = face[i * 3]! - cu, dw = face[i * 3 + 1]! - cw, dd = face[i * 3 + 2]! - cd;
      if (dd < 0.3 * radius || Math.hypot(du, dw) > 1.6 * radius) continue;
      if (Math.abs(du) < 0.35 * radius) { if (dw > 0) top = Math.min(top, dw); else bottom = Math.min(bottom, -dw); }
      if (Math.abs(dw) < 0.35 * radius) half = Math.min(half, Math.abs(du));
      if (Math.abs(du) < 0.7 * radius && dw > 0.3 * radius && dw < 1.2 * radius) {
        const r = paint[i * 3]!, g = paint[i * 3 + 1]!, b = paint[i * 3 + 2]!, l = luma(r, g, b);
        if (l < darkest) { darkest = l; lash.setRGB(r, g, b); }
        lid.push(l, r, g, b);
      }
    }
    const angle = (x: number, fallback: number) => (Number.isFinite(x) ? Math.asin(Math.min(0.98, x / radius)) : fallback);
    // The lid's skin: the lighter half of what is over the eye (the lashes and their shade are not skin).
    const shades: number[][] = [];
    for (let k = 0; k < lid.length; k += 4) shades.push([lid[k]!, lid[k + 1]!, lid[k + 2]!, lid[k + 3]!]);
    shades.sort((x, y) => y[0]! - x[0]!);
    const light = shades.slice(0, Math.max(1, Math.ceil(shades.length / 2)));
    const skin = light.length && light[0] ? new Color(
      light.reduce((s, x) => s + x[1]!, 0) / light.length, light.reduce((s, x) => s + x[2]!, 0) / light.length, light.reduce((s, x) => s + x[3]!, 0) / light.length,
    ) : new Color(0.8, 0.5, 0.35);
    const eye: EyeLayout = { centre: c.clone(), radius, top: angle(top, 0.5), bottom: angle(bottom, 0.5), half: angle(half, 0.6), tucked: 0, skin, lash };
    eye.tucked = tuck(eye, grid, left, up, ahead, centre, spacing);
    return eye;
  });
  return { left, up, ahead, centre, spacing, eyes: eyesOut, mouth: traceMouth(grid, spacing), grid };
}

/** How far the lid is over the eyeball: just over it and over what shines on it. */
const LID_OVER = 1.045;
/** The lid's edge goes this far past the opening's bottom as it shuts, and its rows this far over its opening's height. */
const LID_PAST = 0.08, LID_MORE = 0.6, LID_WIDER = 0.4;

/**
 * Where the open lid's edge is tucked away (radians up from the eye's forward axis): the least that hides the whole lid behind
 * the face over the eye, so that nothing of it shows while the eye is open.
 */
function tuck(eye: EyeLayout, grid: FaceGrid, left: Vector3, up: Vector3, ahead: Vector3, centre: Vector3, spacing: number): number {
  const radius = eye.radius * LID_OVER, margin = 0.008 * spacing, span = eye.top + eye.bottom + LID_MORE, wide = Math.min(1.35, eye.half + LID_WIDER);
  const at = new Vector3();
  const c = at.subVectors(eye.centre, centre), cu = c.dot(left), cw = c.dot(up), cd = c.dot(ahead);
  for (let edge = eye.top + 0.12; edge < Math.PI / 2 + 0.6; edge += 0.04) {
    let hidden = true;
    for (let r = 0; r <= 6 && hidden; r++) {
      const theta = edge + (r / 6) * span;
      for (let k = 0; k <= 8 && hidden; k++) {
        const phi = -wide + (2 * wide * k) / 8, front = Math.cos(theta) * Math.cos(phi);
        if (front <= 0) continue;
        const u = cu + radius * Math.cos(theta) * Math.sin(phi), w = cw + radius * Math.sin(theta);
        if (depthAt(grid, u, w) < cd + radius * front + margin) hidden = false;
      }
    }
    if (hidden) return edge;
  }
  return Math.PI / 2 + 0.6;
}

/**
 * Finds the painted mouth in the face's grid: the line of lip colour (darker than the skin and redder than skin is) nearest the
 * face's middle under the nose, followed across a step at a time, rising or falling a little at each as a smile does, until
 * it fades at its corners.
 */
function traceMouth(grid: FaceGrid, spacing: number): MouthLayout | null {
  const { u0, w0, cell, nu, nw, colour: shade } = grid;
  const lowest = Math.max(0, Math.floor((-MOUTH_BELOW[1] * spacing - w0) / cell)), highest = Math.min(nw - 1, Math.ceil((-MOUTH_BELOW[0] * spacing - w0) / cell));
  const lumas: number[] = [];
  for (let i = lowest; i <= highest; i++) for (let j = 0; j < nu; j++) {
    const k = i * nu + j;
    if (shade[k * 3]! + shade[k * 3 + 1]! + shade[k * 3 + 2]! > 0) lumas.push(luma(shade[k * 3]!, shade[k * 3 + 1]!, shade[k * 3 + 2]!));
  }
  if (lumas.length < 20) return null;
  lumas.sort((a, b) => a - b);
  const skin = lumas[Math.floor(lumas.length * 0.65)]!;
  const lip = (i: number, j: number) => {
    if (i < lowest || j < 0 || i > highest || j >= nu) return 0;
    const k = i * nu + j, r = shade[k * 3]!, g = shade[k * 3 + 1]!, b = shade[k * 3 + 2]!;
    return Math.max(0, (skin - luma(r, g, b)) / skin) * smooth(1.9, 3, r / Math.max(1e-4, g));
  };
  // Its darkest middle, near the face's middle.
  let best = 0, bi = -1, bj = -1;
  const middle = Math.round(-u0 / cell), reach = Math.round(MOUTH_MIDDLE * spacing / cell);
  for (let j = middle - reach; j <= middle + reach; j++) for (let i = lowest; i <= highest; i++) {
    const l = lip(i, j);
    if (l > best) { best = l; bi = i; bj = j; }
  }
  if (best < 0.15) return null;
  const enough = Math.max(0.08, 0.3 * best);
  const rows = new Map<number, { i: number; top: number; bottom: number; l: number }>();
  const column = (j: number, near: number) => {
    let most = 0, mi = -1;
    for (let i = near - 3; i <= near + 3; i++) { const l = lip(i, j); if (l > most) { most = l; mi = i; } }
    if (most < enough) return null;
    let top = mi, bottom = mi;
    while (lip(top + 1, j) >= 0.45 * most) top++;
    while (lip(bottom - 1, j) >= 0.45 * most) bottom--;
    return { i: mi, top, bottom, l: most };
  };
  for (const step of [-1, 1]) {
    let near = bi, misses = 0;
    for (let j = bj; j >= 0 && j < nu; j += step) {
      const found = column(j, near);
      if (!found) { if (++misses > 1) break; continue; }
      misses = 0;
      rows.set(j, found);
      near = found.i;
    }
  }
  const across = [...rows.keys()].sort((a, b) => a - b);
  if (across.length < 5) return null;
  // The line's middle, a little smoothed, at each step across.
  const middleOf = (m: number) => { const row = rows.get(across[Math.min(across.length - 1, Math.max(0, m))]!)!; return (row.top + row.bottom) / 2; };
  const line = new Float32Array(across.length * 2);
  across.forEach((j, n) => {
    line[n * 2] = u0 + j * cell;
    line[n * 2 + 1] = w0 + ((middleOf(n - 1) + 2 * middleOf(n) + middleOf(n + 1)) / 4) * cell;
  });
  // How thick it is painted in its middle half, and its colour where it is darkest.
  const middles = across.slice(Math.floor(across.length / 4), Math.ceil((across.length * 3) / 4)).map((j) => rows.get(j)!);
  const thick = Math.max(2, middles.map((row) => row.top - row.bottom + 1).sort((a, b) => a - b)[middles.length >> 1]!) * cell;
  const darkest = [...rows.entries()].sort((a, b) => b[1].l - a[1].l).slice(0, Math.max(1, Math.ceil(rows.size * 0.3)));
  const lipColour = new Color(0, 0, 0);
  for (const [j, row] of darkest) { const k = row.i * nu + j; lipColour.r += shade[k * 3]!; lipColour.g += shade[k * 3 + 1]!; lipColour.b += shade[k * 3 + 2]!; }
  lipColour.multiplyScalar(1 / darkest.length);
  // A grin painted open: under the line, teeth (light, and nearly grey) down to its lower edge.
  const deepest = Math.round(0.3 * spacing / cell);
  const grin = new Float32Array(across.length);
  let found = 0;
  across.forEach((j, n) => {
    const row = rows.get(j)!;
    let teeth = 0;
    for (let i = row.bottom - 1; i >= Math.max(lowest, row.bottom - deepest); i--) {
      const k = i * nu + j, r = shade[k * 3]!, g = shade[k * 3 + 1]!, b = shade[k * 3 + 2]!;
      if (luma(r, g, b) > skin * 1.05 && Math.max(r, g, b) - Math.min(r, g, b) < 0.3 * Math.max(r, g, b)) teeth++;
      else if (teeth >= 2) { grin[n] = ((row.top + row.bottom) / 2 - i) * cell; break; }
      else if (i < row.bottom - 2) break;
    }
    if (grin[n]! > 0 && n > across.length / 3 && n < (across.length * 2) / 3) found++;
  });
  const painted = found >= across.length / 6;
  if (painted) {
    // Smoothed, and coming to nothing at the corners, where the grin's edges meet.
    const raw = Float32Array.from(grin);
    for (let n = 0; n < grin.length; n++) {
      const near = [raw[n - 1], raw[n], raw[n + 1]].filter((v): v is number => v !== undefined && v > 0);
      grin[n] = near.length ? near.reduce((s, v) => s + v, 0) / near.length : 0;
    }
  }
  return { line, from: line[0]!, to: line[line.length - 2]!, thick, lip: lipColour, grin: painted ? grin : null };
}

/** How far down from the line a painted grin's lower edge is at `u`, between its traced steps: 0 where there is none. */
function grinAt(mouth: MouthLayout, u: number): number {
  const grin = mouth.grin, line = mouth.line, n = line.length / 2;
  if (!grin) return 0;
  for (let k = 1; k < n; k++) {
    if (u <= line[k * 2]!) {
      const a = line[(k - 1) * 2]!, b = line[k * 2]!, s = b > a ? Math.max(0, (u - a) / (b - a)) : 0;
      return grin[k - 1]! + (grin[k]! - grin[k - 1]!) * s;
    }
  }
  return 0;
}

/** The painted line's middle at `u`, between its traced steps. */
function lineAt(mouth: MouthLayout, u: number): number {
  const line = mouth.line, n = line.length / 2;
  if (u <= line[0]!) return line[1]!;
  for (let k = 1; k < n; k++) {
    if (u <= line[k * 2]!) {
      const a = line[(k - 1) * 2]!, b = line[k * 2]!, s = b > a ? (u - a) / (b - a) : 0;
      return line[(k - 1) * 2 + 1]! + (line[k * 2 + 1]! - line[(k - 1) * 2 + 1]!) * s;
    }
  }
  return line[(n - 1) * 2 + 1]!;
}

/** A face that speaks and blinks. */
export interface Face {
  /** The mouth open (0 shut, 1 wide) and round (0 spread, 1 round), and the lids down (0 open, 1 shut), from now on. */
  set(open: number, round: number, lids: number): void;
  readonly layout: FaceLayout;
  readonly mesh: SkinnedMesh;
}

/**
 * The mouth's rows, top to bottom: the upper lip (2), the teeth (3), the dark of the mouth (6), the tongue (2), the lower lip (3).
 * Rows enough that the mouth follows the face's round over the lips without the face coming through it.
 */
const ROWS = 16, COLUMNS = 17;
/** Each lid's rows from its edge up (the lashes, a fold, the lid), and its columns across; how far up the lashes and the fold go. */
const LID_ROWS = 9, LID_COLUMNS = 13, LASHES = 0.07, FOLD = 0.16;

/** Builds the speaking, blinking face over a measured one, on the body's skeleton and its Head bone. */
export function buildFace(painted: SkinnedMesh, layout: FaceLayout): Face {
  const head = headOf(painted);
  const { left, up, ahead, centre, spacing, mouth, eyes, grid } = layout;
  const mouthCount = mouth ? ROWS * COLUMNS : 0, lidCount = LID_ROWS * LID_COLUMNS;
  const count = mouthCount + eyes.length * lidCount;
  const geometry = new BufferGeometry();
  const position = new Float32BufferAttribute(new Float32Array(count * 3), 3).setUsage(DynamicDrawUsage);
  const normal = new Float32BufferAttribute(new Float32Array(count * 3), 3).setUsage(DynamicDrawUsage);
  // Four channels, as the body's own colours have: the same shader draws both.
  const colour = new Float32BufferAttribute(new Float32Array(count * 4).fill(1), 4);
  const skinIndex = new Uint16BufferAttribute(new Uint16Array(count * 4), 4), skinWeight = new Float32BufferAttribute(new Float32Array(count * 4), 4);
  for (let i = 0; i < count; i++) { skinIndex.setX(i, head); skinWeight.setX(i, 1); }
  geometry.setAttribute('position', position).setAttribute('normal', normal).setAttribute('color', colour)
    .setAttribute('skinIndex', skinIndex).setAttribute('skinWeight', skinWeight);
  const triangles: number[] = [];
  const quad = (a: number, b: number, c: number, d: number) => triangles.push(a, b, c, b, d, c);
  const paint = (i: number, c: Color) => colour.setXYZW(i, c.r, c.g, c.b, 1);
  // The mouth's colours by row. The lips are the painted line's own colour; the mouth is dark, the teeth a warm white.
  const lip = mouth?.lip ?? new Color(0.3, 0.06, 0.05);
  const dark = lip.clone().multiplyScalar(0.22), teeth = new Color(0.8, 0.76, 0.68), tongue = lip.clone().lerp(new Color(0.55, 0.16, 0.16), 0.5);
  const rowColour = [lip, lip, teeth, teeth, teeth, dark, dark, dark, dark, dark, tongue, tongue, tongue, lip, lip, lip];
  if (mouth) {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLUMNS; c++) paint(r * COLUMNS + c, rowColour[r]!);
    for (let r = 0; r + 1 < ROWS; r++) for (let c = 0; c + 1 < COLUMNS; c++) quad(r * COLUMNS + c, (r + 1) * COLUMNS + c, r * COLUMNS + c + 1, (r + 1) * COLUMNS + c + 1);
  }
  // The lids: the lashes at the edge, a fold over them, the lid's skin over it, a little in the shade of the brow.
  eyes.forEach((eye, e) => {
    const base = mouthCount + e * lidCount, lid = eye.skin.clone().multiplyScalar(0.92), fold = eye.lash.clone().lerp(lid, 0.55);
    for (let r = 0; r < LID_ROWS; r++) for (let c = 0; c < LID_COLUMNS; c++) paint(base + r * LID_COLUMNS + c, r < 2 ? eye.lash : r === 2 ? fold : lid);
    for (let r = 0; r + 1 < LID_ROWS; r++) for (let c = 0; c + 1 < LID_COLUMNS; c++) {
      const a = base + r * LID_COLUMNS + c;
      quad(a, a + 1, a + LID_COLUMNS, a + LID_COLUMNS + 1);
    }
  });
  geometry.setIndex(triangles);

  const material = (painted.material as MeshStandardMaterial).clone();
  material.name = 'face-parts';
  material.vertexColors = true;
  // It lies on the face: drawn over it where the two are as near as makes no difference.
  material.polygonOffset = true;
  material.polygonOffsetFactor = -1;
  material.polygonOffsetUnits = -2;
  const mesh = new SkinnedMesh(geometry, material);
  mesh.name = 'face-parts';
  mesh.bind(painted.skeleton, painted.bindMatrix);
  mesh.position.copy(painted.position);
  mesh.quaternion.copy(painted.quaternion);
  mesh.scale.copy(painted.scale);
  mesh.frustumCulled = false;
  painted.parent?.add(mesh);

  // From face terms (u across, w up, d ahead, from between the eyes) to the body's own space as it is bound.
  const toBody = new Matrix4().multiplyMatrices(painted.skeleton.boneInverses[head]!, painted.bindMatrix).invert();
  const turnToBody = new Matrix4().extractRotation(toBody);
  const at = new Vector3(), way = new Vector3();
  const put = (i: number, u: number, w: number, d: number, nu: number, nw: number, nd: number) => {
    at.copy(centre).addScaledVector(left, u).addScaledVector(up, w).addScaledVector(ahead, d).applyMatrix4(toBody);
    position.setXYZ(i, at.x, at.y, at.z);
    way.set(0, 0, 0).addScaledVector(left, nu).addScaledVector(up, nw).addScaledVector(ahead, nd).applyMatrix4(turnToBody).normalize();
    normal.setXYZ(i, way.x, way.y, way.z);
  };
  const lift = LIFT * spacing, rows = new Float32Array(ROWS);
  /** The mouth `open` and `round`: the rows down each column across the painted line. */
  const shapeMouth = (open: number, round: number) => {
    if (!mouth) return;
    const thick = mouth.thick, mid = (mouth.from + mouth.to) / 2, half = (mouth.to - mouth.from) / 2;
    // Rounded, the opening narrows to a round one between corners that stay shut; spread, it is wide, its top the smile.
    const width = half * (0.84 - 0.3 * round), height = OPEN_HEIGHT * spacing * open, lifted = 0.05 * spacing * open;
    const teethShow = smooth(0.3, 0.6, open) * (1 - 0.6 * round);
    for (let c = 0; c < COLUMNS; c++) {
      const s = -1 + (2 * c) / (COLUMNS - 1), u = mid + s * half, line = lineAt(mouth, u);
      const x = Math.min(1, Math.abs(u - mid) / Math.max(1e-6, width));
      const spread = Math.pow(Math.max(0, 1 - Math.pow(x, 2.2)), 0.75), rounded = Math.sqrt(Math.max(0, 1 - x * x));
      const p = spread + (rounded - spread) * round;
      // The upper lip over its painted line; the lower comes down under the opening, fuller towards the middle. A grin painted
      // open opens from its own painted edge, its painted teeth kept under the upper lip.
      const lower = thick * 1.2 * smooth(0, 0.25, open) * Math.sqrt(Math.max(0, 1 - s * s));
      const grin = grinAt(mouth, u);
      const upper = line - thick / 2 + lifted * p, bottom = upper - grin - height * p;
      const teethTo = upper - Math.max(Math.min(0.32 * (upper - bottom), 0.07 * spacing) * teethShow * (1 - smooth(0.45, 0.72, x)),
        grin * (1 - 0.2 * smooth(0, 0.3, open)));
      const tongueTo = bottom + 0.28 * Math.max(0, teethTo - bottom);
      rows[0] = line + thick / 2; rows[1] = upper; rows[2] = upper; rows[3] = (upper + teethTo) / 2; rows[4] = teethTo;
      for (let k = 0; k <= 5; k++) rows[5 + k] = teethTo + (tongueTo - teethTo) * (k / 5);
      rows[11] = (tongueTo + bottom) / 2; rows[12] = bottom; rows[13] = bottom; rows[14] = bottom - lower / 2; rows[15] = bottom - lower;
      for (let r = 0; r < ROWS; r++) {
        const w = rows[r]!, d = depthAt(grid, u, w);
        // The face's slope here, for the normal.
        const du = (depthAt(grid, u + grid.cell, w) - depthAt(grid, u - grid.cell, w)) / (2 * grid.cell);
        const dw = (depthAt(grid, u, w + grid.cell) - depthAt(grid, u, w - grid.cell)) / (2 * grid.cell);
        put(r * COLUMNS + c, u, w, d + lift, -du, -dw, 1);
      }
    }
  };
  /** One eye's lid, `down` of the way from tucked away to shut over the eye. */
  const shapeLid = (e: number, down: number) => {
    const eye = eyes[e]!, base = mouthCount + e * lidCount, radius = eye.radius * LID_OVER;
    const edge = eye.tucked + (-eye.bottom - LID_PAST - eye.tucked) * down, span = eye.top + eye.bottom + LID_MORE;
    const wide = Math.min(1.35, eye.half + LID_WIDER);
    for (let r = 0; r < LID_ROWS; r++) {
      // Its first two rows are the lashes, a dark edge; the third a fold over them; the rest the lid.
      const theta = edge + (r === 0 ? 0 : r === 1 ? LASHES : FOLD + ((r - 2) / (LID_ROWS - 3)) * (span - FOLD));
      for (let c = 0; c < LID_COLUMNS; c++) {
        const phi = -wide + (2 * wide * c) / (LID_COLUMNS - 1);
        const nu = Math.cos(theta) * Math.sin(phi), nw = Math.sin(theta), nd = Math.cos(theta) * Math.cos(phi);
        at.copy(eye.centre).sub(centre);
        put(base + r * LID_COLUMNS + c, at.dot(left) + radius * nu, at.dot(up) + radius * nw, at.dot(ahead) + radius * nd, nu, nw, nd);
      }
    }
  };
  let shownOpen = -1, shownRound = -1, shownLids = -1;
  const made: Face = {
    layout,
    mesh,
    set(open, round, lids) {
      open = Math.max(0, Math.min(1, open)); round = Math.max(0, Math.min(1, round)); lids = Math.max(0, Math.min(1, lids));
      let changed = false;
      if (Math.abs(open - shownOpen) > 1e-3 || Math.abs(round - shownRound) > 1e-3) {
        shapeMouth(open, round);
        shownOpen = open; shownRound = round; changed = true;
      }
      if (Math.abs(lids - shownLids) > 1e-3) {
        for (let e = 0; e < eyes.length; e++) shapeLid(e, lids);
        shownLids = lids; changed = true;
      }
      if (changed) { position.needsUpdate = true; normal.needsUpdate = true; }
      // Nothing is drawn while the mouth is shut and the eyes are open: the painted face is the face.
      drawnWhile(mesh, open > 0.004 || lids > 0.004);
    },
  };
  made.set(0, 0, 0);
  return made;
}

/**
 * The face of a model from Blender: measured once and built as the model is put on its rig. Null for a model that is not one of
 * the family's (no Head bone, no painted colours, no eyes), which keeps the face it has.
 */
export function faceOf(model: Object3D): Face | null {
  if (model.userData.face !== undefined) return model.userData.face as Face | null;
  const skinned: SkinnedMesh[] = [];
  model.traverse((node) => {
    const mesh = node as SkinnedMesh;
    if (mesh.isSkinnedMesh && mesh.name !== 'face-parts' && mesh.name !== 'rain-gear' && headOf(mesh) >= 0) skinned.push(mesh);
  });
  const painted = skinned.filter((mesh) => mesh.geometry.getAttribute('color'))
    .sort((a, b) => b.geometry.getAttribute('position').count - a.geometry.getAttribute('position').count)[0];
  const eyes = skinned.find((mesh) => /eyes?$/i.test(mesh.name) && mesh !== painted) ?? null;
  let face: Face | null = null;
  if (painted && !Array.isArray(painted.material)) {
    // A geometry shared by two of the same model is measured once.
    const cached = painted.geometry.userData.faceLayout as FaceLayout | null | undefined;
    const layout = cached !== undefined ? cached : measureFace(painted, eyes);
    painted.geometry.userData.faceLayout = layout;
    if (layout && (layout.mouth || layout.eyes.length)) face = buildFace(painted, layout);
  }
  model.userData.face = face;
  return face;
}
