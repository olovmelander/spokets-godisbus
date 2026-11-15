import {
  BufferAttribute, BufferGeometry, CatmullRomCurve3, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial,
  TorusGeometry, TubeGeometry, Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GROUND_SKY, GROUND_WET } from '../../render/ground-detail';
import { windAt } from '../../render/wind';

/**
 * Stormgården's trampoline (Olov, 14 November 2026: "Kan vi modellera studsmattan bättre?"). It was a dark disc in a green
 * ring on four sticks, and he waded through it up to his knees. Now it is the garden's trampoline as he sees it, 15 cm
 * tall: a round frame of galvanised steel tube on four legs, each bent to a W and standing in its sockets, a black woven
 * mat with its stitched edge, the springs between the mat and the frame, and the blue edge pad over them in ten
 * cushions, all of it wet. The storm has torn one cushion loose on the left: it hangs down outside the frame by its edge and
 * flaps in the wind, and the springs show where it lay. No safety net: its poles and mesh would stand between the camera
 * and him where he bounces.
 *
 * The simulation is untouched. Its bounce surface is the bouncer's top (`at.y`), and a bounce is what it says one is
 * (`squash`): the mat's top is drawn exactly there. For the picture only (`trampolineStep`):
 * - he walks over the trampoline, not through it: where the simulation has him on the lawn under it, he is drawn
 *   standing on the pad and the mat;
 * - the mat gives: a little under his weight as he stands and walks on it, and deep where he lands in a bounce. It takes
 *   him down with it and throws him: he is drawn on the cloth until it is level again, and then catches up with where
 *   the simulation has him, which is already on his way up. With less motion asked for there is none of that: the mat
 *   lies still, and he is drawn where the simulation has him.
 */

/** How high the mat lies over the lawn: the bouncer's top over its foot. */
const HIGH = 0.5;
/** The mat's radius, the frame's (the middle of its tube), and how far out the pad's edge is. */
const MAT = 1.12;
const FRAME = 1.5;
const OUT = 1.63;
/** How far behind the path the trampoline's middle is: he crosses it a little in front of its middle. */
const BACK = -0.2;
/** How high the frame's tube lies, and how thick the tube is. */
const FRAME_Y = 0.44;
const TUBE = 0.052;
/** How far the mat gives under his weight; and in a bounce, how deep it is as he touches it and how fast it goes on down. */
const WEIGHT = 0.06;
const TOUCH = { deep: 0.1, speed: 5.2 };
/** The cloth as a spring: how stiff, and how soon it comes to rest. */
const CLOTH = { stiff: 330, damp: 11 };

/** The trampoline's measures, for the tests and for whoever draws beside it. */
export const TRAMPOLINE = { high: HIGH, mat: MAT, out: OUT, back: BACK, weight: WEIGHT } as const;

const STEEL = new Color('#b4bcc2');
const STEEL_DARK = new Color('#6c757c');
const PAD = new Color('#2a569c');
const PAD_DARK = new Color('#1a3769');
const PAD_PALE = new Color('#4a7ab8');
const WEAVE = new Color('#14171a');
const BAND = new Color('#23272c');

/** A shape with a colour for each of its points, and nothing else on it: for merging into one draw. */
function tinted(geometry: BufferGeometry, tint: (at: Vector3) => Color): BufferGeometry {
  const at = geometry.getAttribute('position');
  const colours = new Float32Array(at.count * 3);
  const point = new Vector3();
  for (let i = 0; i < at.count; i++) tint(point.fromBufferAttribute(at, i)).toArray(colours, i * 3);
  geometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
  geometry.deleteAttribute('uv');
  return geometry;
}

const ring = (angle: number, radius: number, y: number) => new Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);

/** The frame, its legs and the springs: one shape of steel. */
function steelwork(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const shade = new Color();
  // The frame: a ring of tube, darker underneath.
  parts.push(tinted(new TorusGeometry(FRAME, TUBE, 8, 56).rotateX(Math.PI / 2).translate(0, FRAME_Y, 0),
    (p) => shade.copy(STEEL).lerp(STEEL_DARK, Math.max(0, (FRAME_Y - p.y) / TUBE) * 0.7)));
  // Four legs, each one tube bent to a W: down from its two sockets on the frame, along the ground, and up to a peak
  // between them. Their feet stand a little wider than the frame.
  for (let leg = 0; leg < 4; leg++) {
    const middle = Math.PI / 4 + (leg * Math.PI) / 2;
    const spread = 0.34;
    const a = ring(middle - spread, FRAME, FRAME_Y), g = ring(middle + spread, FRAME, FRAME_Y);
    const out = ring(middle, 0.07, 0);
    const foot = (k: number, y: number) => a.clone().lerp(g, k).setY(y).add(out);
    const path = [a.clone().setY(FRAME_Y - 0.02), foot(0, 0.16), foot(0.015, 0.05), foot(0.2, 0.045), foot(0.31, 0.07), foot(0.5, 0.27), foot(0.69, 0.07), foot(0.8, 0.045),
      foot(0.985, 0.05), foot(1, 0.16), g.clone().setY(FRAME_Y - 0.02)];
    parts.push(tinted(new TubeGeometry(new CatmullRomCurve3(path, false, 'catmullrom', 0.18), 44, TUBE * 0.9, 7),
      (p) => shade.copy(STEEL).lerp(STEEL_DARK, 0.25 + 0.5 * Math.max(0, 1 - p.y / 0.2))));
    // The sockets welded under the frame, which the leg's ends go up into.
    for (const end of [a, g]) {
      parts.push(tinted(new CylinderGeometry(TUBE * 1.28, TUBE * 1.28, 0.15, 8).translate(end.x, FRAME_Y - 0.1, end.z), () => shade.copy(STEEL_DARK).lerp(STEEL, 0.35)));
    }
  }
  // The springs, from the mat's edge out to the frame: each a thin coil, its turns light and dark by turns.
  const count = 40;
  for (let i = 0; i < count; i++) {
    const angle = ((i + 0.5) / count) * Math.PI * 2;
    const from = ring(angle, MAT + 0.015, HIGH - 0.02), to = ring(angle, FRAME - TUBE * 0.6, FRAME_Y + 0.01);
    const long = from.distanceTo(to);
    const coil = new CylinderGeometry(0.021, 0.021, long, 5, 8, true).rotateZ(Math.PI / 2).rotateY(-angle)
      .translate((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
    parts.push(tinted(coil, (p) => shade.copy(Math.round((Math.hypot(p.x, p.z) - MAT) / (long / 8)) % 2 ? STEEL : STEEL_DARK)));
  }
  const merged = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  return merged;
}

/**
 * One cushion of the edge pad, lying over the springs from the mat's edge out over the frame and a little down its
 * outside: `from` to `to` round the ring. Paler on top where it is worn, darker in its seams and down its skirt.
 */
function cushion(from: number, to: number, tone: number): BufferGeometry {
  const profile: [radius: number, y: number][] = [[MAT - 0.07, HIGH + 0.004], [MAT - 0.04, HIGH + 0.02], [MAT + 0.12, HIGH + 0.024], [FRAME - 0.14, HIGH + 0.022],
    [FRAME + 0.03, FRAME_Y + TUBE + 0.014], [OUT - 0.01, FRAME_Y + 0.015], [OUT, FRAME_Y - 0.1]];
  const across = 7;
  const position: number[] = [], colour: number[] = [], index: number[] = [], where: number[] = [];
  const c = new Color();
  for (let i = 0; i <= across; i++) {
    const angle = from + ((to - from) * i) / across;
    const seam = i === 0 || i === across ? 0.55 : i === 1 || i === across - 1 ? 0.15 : 0;
    for (const [k, [radius, y]] of profile.entries()) {
      position.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      where.push(angle, radius);
      c.copy(PAD).lerp(PAD_PALE, k === 2 || k === 3 ? 0.4 : 0).lerp(PAD_DARK, Math.max(seam, k === 6 ? 0.6 : k === 0 ? 0.45 : 0)).multiplyScalar(tone);
      colour.push(c.r, c.g, c.b);
      if (i < across && k < profile.length - 1) {
        const at = i * profile.length + k, next = at + profile.length;
        index.push(at, at + 1, next, at + 1, next + 1, next);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colour, 3));
  geometry.setAttribute('padAt', new Float32BufferAttribute(where, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/** The pad's cover: blue vinyl, creased across, with a row of stitching along each of its edges, wet. */
function padVinyl(): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.5, side: DoubleSide });
  material.customProgramCacheKey = () => 'trampoline-pad-v1';
  material.onBeforeCompile = (shader) => {
    shader.uniforms.padRain = GROUND_WET;
    shader.uniforms.padSky = GROUND_SKY;
    shader.vertexShader = 'attribute vec2 padAt;\nvarying vec2 vPadAt;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vPadAt = padAt;');
    shader.fragmentShader = /* glsl */ `varying vec2 vPadAt;
      uniform float padRain;
      uniform vec3 padSky;
      float padHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float padNoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(padHash(i), padHash(i + vec2(1.0, 0.0)), u.x), mix(padHash(i + vec2(0.0, 1.0)), padHash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      ` + shader.fragmentShader.replace('#include <normal_fragment_maps>', /* glsl */ `#include <normal_fragment_maps>
      {
        // Creases across it, where the foam under the cover has been sat and trodden on; and scuffs.
        vec2 at = vec2(vPadAt.x * ${FRAME.toFixed(2)}, vPadAt.y);
        float crease = padNoise(vec2(at.x * 9.0, at.y * 2.2)) * 0.6 + padNoise(vec2(at.x * 23.0, at.y * 5.0) + 7.0) * 0.4;
        diffuseColor.rgb *= 0.84 + 0.3 * crease;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.5 + 0.02, 0.5 * smoothstep(0.72, 0.9, padNoise(at * 31.0 + 3.0)));
        // A row of pale stitches along its inner edge and along the frame.
        float row = max(1.0 - smoothstep(0.006, 0.014, abs(at.y - ${(MAT - 0.01).toFixed(3)})), 1.0 - smoothstep(0.006, 0.014, abs(at.y - ${(FRAME + 0.07).toFixed(3)})));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.5, 0.56, 0.66), 0.75 * row * step(0.45, fract(at.x * 16.0)));
        float creaseHeight = crease * 0.012;
        vec3 padX = dFdx(-vViewPosition), padY = dFdy(-vViewPosition);
        vec3 padR1 = cross(padY, normal), padR2 = cross(normal, padX);
        float padDet = dot(padX, padR1);
        vec3 creased = abs(padDet) * normal - sign(padDet) * (dFdx(creaseHeight) * padR1 + dFdy(creaseHeight) * padR2);
        float padFacing = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
        if (dot(creased, creased) > 1e-20) normal = normalize(mix(normal, normalize(creased), smoothstep(0.1, 0.4, padFacing)));
        // Wet: beads and a film of rain on the vinyl, and the sky in it where it is looked along.
        roughnessFactor = mix(roughnessFactor, 0.3 + 0.2 * crease, padRain);
        totalEmissiveRadiance += padSky * padRain * pow(1.0 - padFacing, 4.0) * 0.14;
      }`);
  };
  return material;
}

/** How many cushions the pad has, and which one the storm has torn loose (to the left, on the camera's side of where he walks onto it). */
const CUSHIONS = 10;
const LOOSE = 3;
const cushionSpan = (i: number): [number, number] => [((i + 0.012) / CUSHIONS) * Math.PI * 2, ((i + 0.988) / CUSHIONS) * Math.PI * 2];

/** The mat's points: rings from its middle out to its stitched edge. */
const MAT_RINGS = 12, MAT_AROUND = 48;

/** How much of a hollow a place on the mat can take: all of it in the middle, none at its edge, where the springs hold it. */
const free = (x: number, z: number) => Math.max(0, 1 - ((x * x + z * z) / (MAT * MAT)) ** 2);

/**
 * How far under level the mat lies at a place on it, when it is pressed `deep` where his feet are (`footX`, `footZ`, in
 * the trampoline's own space): a hollow round his feet, held at the mat's edge, and shallower where he stands near it.
 */
export function hollow(x: number, z: number, footX: number, footZ: number, deep: number): number {
  if (deep === 0) return 0;
  const near = Math.max(0, 1 - Math.hypot(x - footX, z - footZ) / 1.5);
  return (deep * free(x, z) * near * near * (3 - 2 * near)) / Math.max(0.3, free(footX, footZ));
}

function matShape(): BufferGeometry {
  const position: number[] = [0, HIGH, 0], colour: number[] = [WEAVE.r, WEAVE.g, WEAVE.b], index: number[] = [];
  for (let j = 1; j <= MAT_RINGS; j++) {
    const radius = MAT * (j / MAT_RINGS) ** 0.85;
    const edge = j >= MAT_RINGS - 1 ? BAND : WEAVE;
    for (let i = 0; i < MAT_AROUND; i++) {
      const angle = (i / MAT_AROUND) * Math.PI * 2;
      position.push(Math.cos(angle) * radius, HIGH, Math.sin(angle) * radius);
      colour.push(edge.r, edge.g, edge.b);
      const at = 1 + (j - 1) * MAT_AROUND + i, next = 1 + (j - 1) * MAT_AROUND + ((i + 1) % MAT_AROUND);
      if (j === 1) index.push(0, next, at);
      else index.push(at - MAT_AROUND, next - MAT_AROUND, next, at - MAT_AROUND, next, at);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colour, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/** The mat's cloth: black woven webbing, its weave seen close and rows of stitching round its edge, wet. */
function matCloth(): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.62, side: DoubleSide });
  material.customProgramCacheKey = () => 'trampoline-mat-v1';
  material.onBeforeCompile = (shader) => {
    shader.uniforms.matRain = GROUND_WET;
    shader.uniforms.matSky = GROUND_SKY;
    shader.vertexShader = 'varying vec2 vMatAt;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vMatAt = position.xz;');
    shader.fragmentShader = 'varying vec2 vMatAt;\nuniform float matRain;\nuniform vec3 matSky;\n' + shader.fragmentShader.replace('#include <normal_fragment_maps>', /* glsl */ `#include <normal_fragment_maps>
      {
        // The weave: threads over and under, where they are wider than a pixel; and the stitching round its edge.
        vec2 thread = vMatAt * 30.0;
        float pixel = max(length(fwidth(thread)), 1e-4);
        float seen = 1.0 - smoothstep(0.3, 1.0, pixel);
        diffuseColor.rgb *= 1.0 + 0.6 * sin(thread.x * 6.2832) * sin(thread.y * 6.2832) * seen;
        float far = length(vMatAt);
        float row = max(1.0 - smoothstep(0.01, 0.02, abs(far - ${(MAT - 0.045).toFixed(3)})), 1.0 - smoothstep(0.01, 0.02, abs(far - ${(MAT - 0.125).toFixed(3)})));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.24, 0.25, 0.26), 0.7 * row * step(0.4, fract(atan(vMatAt.y, vMatAt.x) * 28.0)));
        // Wet: the rain stands in the weave, and the mat gives back the sky where it is looked along.
        roughnessFactor = mix(roughnessFactor, 0.36, matRain);
        float along = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 4.0);
        totalEmissiveRadiance += matSky * matRain * along * 0.16;
      }`);
  };
  return material;
}

/** The mat's cloth and him on it, as the picture has them: stepped by `trampolineStep`. */
export interface Cloth {
  /** How deep the hollow is at his feet's place (below zero: sprung up past level), and how fast it deepens. */
  deep: number;
  speed: number;
  /** Where his feet press it, along the path from the trampoline's middle. */
  foot: number;
  /** The simulation's `squash` last frame: a bounce is its jump up. */
  flat: number;
  /** The mat has him: from the bounce until it is level again. */
  holds: boolean;
  held: number;
  /** How far over the simulation's place he is drawn. */
  lift: number;
}

export const newCloth = (): Cloth => ({ deep: 0, speed: 0, foot: 0, flat: 0, holds: false, held: 0, lift: 0 });

/**
 * One frame of the mat and of him on it: `dx` is how far along from the trampoline's middle he is and `feet` how high
 * over the lawn under it, both as the simulation has him; `squash` is the simulation's bouncer (1 at a bounce, to 0).
 * It moves the cloth and gives how far over the simulation's place he is to be drawn (`cloth.lift`): up onto the pad
 * and the mat where he walks over them, and with the cloth while it holds him in a bounce.
 */
export function trampolineStep(cloth: Cloth, dx: number, feet: number, squash: number, dt: number, still: boolean): number {
  const far = Math.hypot(dx, BACK);
  // He stands on the mat: over its cloth, and the simulation has him at its height or on the lawn under it.
  const onMat = far < MAT - 0.04 && feet < HIGH + 0.03;
  const bounced = squash > cloth.flat + 0.3;
  cloth.flat = squash;
  if (onMat || bounced) cloth.foot = Math.max(-MAT + 0.25, Math.min(MAT - 0.25, dx));
  if (still) {
    cloth.deep = 0; cloth.speed = 0; cloth.holds = false;
  } else {
    // A bounce: he touches the cloth, and it goes down with him and comes up again.
    if (bounced) { cloth.deep = Math.max(cloth.deep, TOUCH.deep); cloth.speed = TOUCH.speed; cloth.holds = true; cloth.held = 0; }
    const level = onMat || cloth.holds ? WEIGHT : 0;
    const steps = Math.max(1, Math.ceil(dt / 0.004));
    for (let i = 0; i < steps; i++) {
      cloth.speed += ((level - cloth.deep) * CLOTH.stiff - cloth.speed * CLOTH.damp) * (dt / steps);
      cloth.deep += cloth.speed * (dt / steps);
    }
    cloth.deep = Math.max(-0.07, Math.min(0.36, cloth.deep));
    cloth.held += dt;
    // It lets him go as it comes up to level, and never holds him longer than a quarter of a second.
    if (cloth.holds && ((cloth.speed < 0 && cloth.deep < WEIGHT + 0.02) || cloth.held > 0.25)) cloth.holds = false;
  }
  if (far > OUT + 0.4 && !cloth.holds && Math.abs(cloth.lift) < 1e-3) return (cloth.lift = 0);
  // What he walks on here: the mat with its hollow, the pad round it, and a step up onto the pad from the lawn.
  const under = far < MAT ? hollow(dx, -BACK, cloth.foot, -BACK, Math.max(0, cloth.deep)) : 0;
  const step = Math.min(1, Math.max(0, (OUT + 0.22 - far) / 0.32));
  const surface = (HIGH - under) * step * step * (3 - 2 * step);
  const target = cloth.holds ? surface - feet : Math.max(0, surface - feet);
  cloth.lift = still || cloth.holds ? target : cloth.lift + (target - cloth.lift) * Math.min(1, dt * 22);
  return cloth.lift;
}

export interface Trampoline {
  group: Group;
  /**
   * Each frame: where the simulation has him, how flat its bouncer is after a bounce, the frame's time, and whether
   * less motion is asked for. Gives how far over the simulation's place he is to be drawn.
   */
  update(x: number, y: number, squash: number, dt: number, clock: number, still: boolean): number;
}

/** The trampoline whose mat is the bouncer at `at` (its top at `at.y`, its middle at `at.x`). */
export function createTrampoline(at: { x: number; y: number }): Trampoline {
  const group = new Group();
  group.name = 'trampoline';
  group.position.set(at.x, at.y - HIGH, BACK);
  const steel = new Mesh(steelwork(), new MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.35 }));
  steel.name = 'trampoline-steel';
  const fixed = Array.from({ length: CUSHIONS }, (_, i) => i).filter((i) => i !== LOOSE).map((i) => cushion(...cushionSpan(i), 0.92 + (0.16 * ((i * 7) % 3)) / 2));
  const padShape = mergeGeometries(fixed);
  for (const part of fixed) part.dispose();
  const vinyl = padVinyl();
  const pad = new Mesh(padShape, vinyl);
  pad.name = 'trampoline-pad';
  // The loose cushion hangs on by its outer edge and turns about it: its shape is in the space of a hinge along that
  // edge, which looks out from the trampoline's middle.
  const [looseFrom, looseTo] = cushionSpan(LOOSE);
  const middle = (looseFrom + looseTo) / 2;
  const hingeAt = ring(middle, OUT - 0.02, FRAME_Y + 0.02);
  const hinge = new Group();
  hinge.position.copy(hingeAt);
  hinge.rotation.y = -middle;
  const flap = new Mesh(cushion(looseFrom, looseTo, 1).translate(-hingeAt.x, -hingeAt.y, -hingeAt.z).rotateY(middle), vinyl);
  flap.name = 'trampoline-flap';
  hinge.add(flap);
  const mat = new Mesh(matShape(), matCloth());
  mat.name = 'trampoline-mat';
  for (const mesh of [steel, pad, flap, mat]) { mesh.castShadow = true; mesh.receiveShadow = true; }
  group.add(steel, pad, hinge, mat);

  const rest = (mat.geometry.getAttribute('position') as BufferAttribute).clone();
  const cloth = newCloth();
  let drawnDeep = 0, drawnFoot = 0;

  /** The mat's cloth as the hollow has it now. */
  function press(): void {
    if (Math.abs(cloth.deep - drawnDeep) < 1e-4 && (Math.abs(cloth.foot - drawnFoot) < 1e-3 || Math.abs(cloth.deep) < 1e-4)) return;
    drawnDeep = cloth.deep; drawnFoot = cloth.foot;
    const points = mat.geometry.getAttribute('position') as BufferAttribute;
    for (let i = 0; i < points.count; i++) points.setY(i, rest.getY(i) - hollow(rest.getX(i), rest.getZ(i), cloth.foot, -BACK, cloth.deep));
    points.needsUpdate = true;
    mat.geometry.computeVertexNormals();
  }

  return {
    group,
    update(x, y, squash, dt, clock, still) {
      const lift = trampolineStep(cloth, x - at.x, y - (at.y - HIGH), squash, dt, still);
      press();
      // The loose cushion hangs down outside the frame by its edge, and lifts and flaps in the wind: most in a gust.
      const wind = still ? 0 : windAt(at.x);
      hinge.rotation.z = -4.25 + (still ? 0 : (0.12 + 0.2 * Math.sin(clock * 9.3)) * Math.min(1.8, 0.25 + Math.abs(wind) * 0.45));
      return lift;
    },
  };
}
