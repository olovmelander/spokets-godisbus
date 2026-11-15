import { AdditiveBlending, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, RingGeometry, type Object3D } from 'three';
import { drawnWhile } from '../../render/idle';
import type { Mover } from '../../sim/types';

/**
 * Flärken's bark as it is drawn (art/blender/flarken.py, `barkbit`; Olov, 14 November 2026: "Kan vi förbättra både
 * designen och texturen på barken som flyter, så att den ser snyggare ut?"). The piece itself is the kit's: a thick
 * piece of an old pine's bark, long plates between deep furrows, its broken edge in layers.
 *
 * - **On the planks** it stands on its long edge at their back, its outside to the camera, as tall as the thing is to
 *   the simulation, and is pushed along them as the simulation has it.
 * - **The last push** takes it over the planks' end: it slides to the edge, tips over it and falls flat on the water
 *   with a splash, its outside up, and bobs up again.
 * - **Afloat** it lies flat as bark floats, its plates up where he stands and its layered edge towards the camera,
 *   dark and wet where the lake laps it. It rides a little up and down and rocks, rings spreading from it; when he
 *   lands on it, it dips under him, tips towards him and comes up again, and holds him.
 *
 * To the simulation it is a box that goes straight from the planks to where it floats, its top level with the
 * planks: afloat, the piece's plates are at that top whatever it does, give or take its bob.
 */

/** The kit's piece, in its own measures (EL): how thick it is from its inside to its plates' tops, and how tall it stands. */
export const BARK = { thick: 1.09, back: 0.45, tall: 1.5 } as const;
/** How long it slides to the planks' edge, how long it takes from tipping to lying in the water, and to settle flat. */
const SLIDE = 0.32, DROP = 0.3, SETTLE = 0.35;

const smooth = (t: number) => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k); };

/** What the pack's own picture gives it (./render.ts): the things the stone has too. */
export interface BarkWorld {
  /** How far behind the play plane it stands on the planks. */
  behind: number;
  /** Where the planks end going right from a place on them, and the water's level beyond. */
  edge(from: { x: number; y: number }, to: number): { edge: number; water: number };
  /** A splash to play where it goes in. */
  splash: { group: Group; update(since: number, still: boolean): void };
  /** Whether the picture keeps still (less motion), and where Elof is. */
  still(): boolean;
  elof(): { x: number; y: number };
}

/** The kit's piece, wet: darker and shinier from a little over the lake's level down. `level` is that height, in the world. */
function wet(model: Object3D, level: { value: number }): void {
  model.traverse((node) => {
    const mesh = node as Mesh;
    const paint = mesh.material as MeshStandardMaterial | undefined;
    if (!paint?.isMeshStandardMaterial) return;
    const soaked = paint.clone();
    // Wet all over in the rain: a little sheen.
    soaked.roughness = 0.6;
    const before = soaked.onBeforeCompile;
    const key = soaked.customProgramCacheKey.bind(soaked);
    soaked.customProgramCacheKey = () => `${key()}:bark-wet-v1`;
    soaked.onBeforeCompile = (shader, renderer) => {
      before.call(soaked, shader, renderer);
      shader.uniforms.barkWet = level;
      shader.vertexShader = 'varying float barkHigh;\n' + shader.vertexShader.replace('#include <project_vertex>', /* glsl */ `
        barkHigh = (modelMatrix * vec4(transformed, 1.0)).y;
        #include <project_vertex>`);
      shader.fragmentShader = 'uniform float barkWet;\nvarying float barkHigh;\n' + shader.fragmentShader.replace('#include <color_fragment>', /* glsl */ `
        #include <color_fragment>
        diffuseColor.rgb *= mix(0.4, 1.0, smoothstep(barkWet, barkWet + 0.16, barkHigh));`);
    };
    mesh.material = soaked;
    mesh.castShadow = true;
  });
}

/**
 * The bark, as a thing on a rail is drawn (src/render/props.ts): a group whose `tick` the view calls each frame, after
 * it has put the group's parent where the simulation has the thing. Its holder ('bark-holder') is where the piece is
 * as a whole; the piece in it ('bark-piece') is the kit's, stood up or laid flat.
 */
export function floatingBark(mover: Mover, world: BarkWorld): Group {
  const outer = new Group();
  const holder = new Group();
  holder.name = 'bark-holder';
  const piece = new Group();
  piece.name = 'bark-piece';
  piece.userData.model = 'barkbit';
  const level = { value: -1000 };
  piece.userData.onModelInstalled = (model: Group) => wet(model, level);
  holder.add(piece);
  // Rings spreading from it over the lake while it floats: slow and faint as it rides, plain when something strikes it.
  const rings = [0, 1, 2].map(() => {
    const ring = new Mesh(new RingGeometry(0.93, 1, 44).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({ color: '#cfe0f0', transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false }));
    ring.renderOrder = 3;
    drawnWhile(ring, false);
    return ring;
  });
  outer.add(holder, world.splash.group, ...rings);
  const before = mover.stops[mover.stops.length - 2]!;
  const last = mover.stops[mover.stops.length - 1]!;
  let ready = false, edge = before.x, water = last.y + mover.height * 0.6, start = 0;
  let state: 'unknown' | 'planks' | 'going' | 'afloat' = 'unknown';
  // Under him: how far it has dipped and how fast, how far it has tipped and how fast, and whether he stood on it.
  let dip = 0, dipSpeed = 0, tip = 0, tipSpeed = 0, stood = false, struck = -10, lastClock: number | null = null;
  /** The piece laid over by `k`: from standing on its edge (0) to flat on the water, its plates up (1). */
  const lay = (k: number) => {
    const e = smooth(k);
    piece.rotation.x = -Math.PI / 2 * e;
    // Flat, its plates' tops are where its top was standing, and its middle is over the thing's own.
    piece.position.set(0, (mover.height - (BARK.thick - BARK.back)) * e, (BARK.tall / 2) * e);
  };
  outer.userData.tick = (clock: number) => {
    const mesh = outer.parent;
    if (!mesh) return;
    if (!ready) {
      ({ edge, water } = world.edge(before, last.x));
      ready = true;
    }
    const still = world.still();
    const dt = lastClock === null ? 0 : Math.min(0.05, Math.max(0, clock - lastClock));
    lastClock = clock;
    const sx = mesh.position.x, sy = mesh.position.y;
    // On the planks, give or take the little way past a stop that a push settles back from.
    const onPlanks = sx <= before.x + 0.2 && sy >= before.y - 0.05;
    if (state === 'unknown') state = Math.abs(sx - last.x) < 1e-3 && Math.abs(sy - last.y) < 1e-3 ? 'afloat' : 'planks';
    if (state === 'planks' && !onPlanks) { state = 'going'; start = clock; }
    if (state !== 'planks' && onPlanks) state = 'planks';
    level.value = water + 0.08;
    if (state === 'planks') {
      // On the planks it stands at their back, and slides as the simulation has it.
      holder.position.set(0, 0, world.behind);
      holder.rotation.set(0, 0, 0);
      lay(0);
      world.splash.update(-1, still);
      for (const ring of rings) drawnWhile(ring, false);
      return;
    }
    const t = state === 'afloat' ? 60 : clock - start;
    // Where its middle is when it tips: a little over the edge.
    const over = edge + mover.width * 0.12;
    const tipped = over + (last.x - over) * 0.7;
    let x: number, y: number, lean: number;
    if (t < SLIDE) {
      const u = t / SLIDE;
      x = before.x + (over - before.x) * (1.6 * u - 0.6 * u * u);
      y = before.y;
      lean = 0;
    } else if (t < SLIDE + DROP) {
      const k = (t - SLIDE) / DROP;
      x = over + (tipped - over) * k;
      y = before.y + (last.y - 0.22 - before.y) * k * k;
      lean = -0.45 * Math.sin(Math.PI * k);
    } else {
      // Under, and up again: it bobs a few times and settles where it floats.
      const k = t - SLIDE - DROP;
      x = tipped + (last.x - tipped) * (1 - Math.exp(-k / 0.3));
      y = last.y - 0.22 * Math.exp(-k / 0.28) * Math.cos(k * 6.5);
      lean = 0.07 * Math.exp(-k / 0.35) * Math.sin(k * 8);
    }
    // As it tips over the edge it falls over flat, and has settled so a moment after it is in.
    lay((t - SLIDE) / (DROP + SETTLE));
    const z = world.behind * (1 - smooth(t / (SLIDE + DROP)));
    // He lands on it: it gives under him and tips towards him, and comes up again. (A spring each, by the frame's time.)
    const him = world.elof();
    const on = state === 'afloat' && Math.abs(him.x - last.x) <= mover.width / 2 + 0.18 && Math.abs(him.y - (last.y + mover.height)) < 0.12;
    if (on && !stood) { dipSpeed -= 0.9; struck = clock; }
    stood = on;
    if (still) { dip = 0; dipSpeed = 0; tip = 0; tipSpeed = 0; }
    else if (dt > 0) {
      const aim = on ? -0.035 * Math.max(-1, Math.min(1, (him.x - last.x) / (mover.width / 2))) : 0;
      dipSpeed += (-dip * 90 - dipSpeed * 6) * dt;
      dip = Math.max(-0.09, dip + dipSpeed * dt);
      tipSpeed += ((aim - tip) * 60 - tipSpeed * 5) * dt;
      tip += tipSpeed * dt;
    }
    // Afloat, it rides a little up and down and rocks; under him it keeps still enough to stand on.
    const ride = still ? 0 : (on ? 0.012 : 0.03) * Math.sin(clock * 1.9);
    const rock = still ? 0 : (on ? 0.008 : 0.02) * Math.sin(clock * 1.3 + 1);
    mesh.rotation.z = 0;
    mesh.scale.set(1, 1, 1);
    holder.position.set(x - sx, y + ride + dip - sy, z);
    holder.rotation.set(0, 0, lean + rock + tip);
    // In it goes where its foot meets the water as it tips.
    world.splash.group.position.set(over + (tipped - over) * 0.6 - sx, water - sy, 0);
    world.splash.update(t - SLIDE - DROP * 0.6, still);
    // Its rings on the lake: one after another, wider and fainter; plainer for a while after he has landed on it.
    const lively = still ? 0 : 0.1 + 0.3 * Math.exp(-(clock - struck) / 0.9);
    const floats = t > SLIDE + DROP + 0.4;
    for (const [i, ring] of rings.entries()) {
      const phase = (clock * 0.42 + i / rings.length) % 1;
      drawnWhile(ring, floats && !still);
      ring.position.set(last.x - sx, water + 0.02 - sy, 0);
      ring.scale.set((mover.width / 2 + 0.1) * (1 + 1.1 * phase), 1, (BARK.tall / 2 + 0.1) * (1 + 0.9 * phase));
      (ring.material as MeshBasicMaterial).opacity = lively * (1 - phase) * Math.min(1, phase * 5);
    }
  };
  return outer;
}
