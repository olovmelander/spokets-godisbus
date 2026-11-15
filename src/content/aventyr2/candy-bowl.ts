import {
  AdditiveBlending, Color, DoubleSide, DynamicDrawUsage, Euler, Group, InstancedMesh, LatheGeometry, Matrix4, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, PlaneGeometry, Quaternion, TorusGeometry, Vector2, Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { sweetSocket, TRAIL_SHAPES, trailColour, trailShape } from '../../render/candy';
import { glowTexture } from '../../render/glow';
import { drawnWhile } from '../../render/idle';
import type { SpotProp } from '../../render/props';
import type { Spot } from '../../sim/types';
import { BOWL, BOWL_SWEETS, GRAB, LEAP_OVER, LEFT, SPILLED, grabAt, inBowl, leapAt, type Grab, type Point3 } from './bowl';

/**
 * The bowl of Saturday sweets on the family's table (./bowl.ts has the story, the place and the leap's moments): a glass
 * bowl, so that how full it is shows from the side and from a small boy's height, heaped with the game's own sweets.
 * They are the trail's karameller, striped ones and swirls (../../render/candy.ts) in the trail's colours and order, a
 * little smaller than they float along the trail: this is where the trail comes from.
 *
 * When the old one leaps (the decor's `until` flag), this draws him too: from where he stood on the shelf, down into the
 * bowl with a knock, bent into the sweets, up with four in his arms, and out through the window with two flying after
 * him, while four spill onto the table. The carving on the shelf is handed over to this one the moment the flag is set
 * (./render.ts, `tragubbe` with the word `grabs`). A soft light of his own goes with him, so that he is seen against
 * whoever stands behind the table (Olov, 12 November 2026: "Han ska synas tydligt överallt"). With less motion, and in
 * a game taken up later, the bowl is simply as he left it.
 *
 * One draw for the glass and one for each kind of sweet; while he leaps, his own and his light's.
 */

/** How big a sweet in the bowl is, of one on the trail. */
export const SWEET_SIZE = 0.72;
/** How the old one stands turned on the shelf once the gust has come: towards the window the little one went out of. */
export const WATCH_TURN = 0.95;

/**
 * Where each of the four in his arms is held, from his feet with his front towards +z: one under each arm and two
 * against his chest, each sticking out past his sides, so that they show from behind as he leaps away.
 */
const ARMFUL: readonly { x: number; y: number; z: number; turn: number; tip: number }[] = [
  { x: -0.21, y: 0.3, z: 0.04, turn: 0.5, tip: 0.55 },
  { x: 0.21, y: 0.3, z: 0.04, turn: -0.5, tip: -0.55 },
  { x: -0.12, y: 0.5, z: 0.13, turn: 0.2, tip: -0.3 },
  { x: 0.13, y: 0.47, z: 0.13, turn: -0.25, tip: 0.35 },
];

const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** The glass: the bowl's wall turned from its foot to its rim, a thicker rim and a foot ring, in one piece. */
function glass(): Mesh {
  const wall: (readonly [number, number])[] = [[0.001, 0.014], [0.26, 0.014], [0.31, 0.04], [0.43, 0.15], [0.535, 0.3], [BOWL.radius, BOWL.rim]];
  const parts = [
    new LatheGeometry(wall.map(([r, y]) => new Vector2(r, y)), 28),
    new TorusGeometry(BOWL.radius, 0.022, 6, 28).rotateX(Math.PI / 2).translate(0, BOWL.rim, 0),
    new TorusGeometry(0.27, 0.02, 6, 24).rotateX(Math.PI / 2).translate(0, 0.02, 0),
  ];
  const mesh = new Mesh(mergeGeometries(parts), new MeshStandardMaterial({
    color: '#dcecf0', roughness: 0.08, transparent: true, opacity: 0.34, side: DoubleSide, depthWrite: false,
    // Seen in the dark of the power cut too: a little of its own pale light.
    emissive: '#7d98a4', emissiveIntensity: 0.22,
  }));
  parts.forEach((part) => part.dispose());
  mesh.name = 'candy-bowl-glass';
  // Over the sweets in it.
  mesh.renderOrder = 2;
  return mesh;
}

/** A wrapped sweet in profile, lying along x: what stands in until the candy kit has come (../../render/candy.ts). */
function standIn(): LatheGeometry {
  const profile = [[0.072, -0.19], [0.024, -0.115], [0.085, -0.064], [0.1, 0], [0.085, 0.064], [0.024, 0.115], [0.072, 0.19]];
  const made = new LatheGeometry(profile.map(([radius, along]) => new Vector2(radius!, along!)), 12);
  made.rotateZ(Math.PI / 2).scale(SWEET_SIZE, SWEET_SIZE, SWEET_SIZE);
  return made;
}

export interface BowlStory { readonly flags: ReadonlySet<string> | null; readonly still: boolean }

/**
 * `figure` makes the old trägubbe who leaps (the same as stands on the shelf); `places` says where he leaps from and
 * out to, once the chapter is known (./bowl.ts, `grabPlaces`). Without them, or with the word `left`, it is the bowl
 * alone. The prop is placed where the bowl stands: the middle of its foot, on the table.
 */
export function candyBowl(spot: Spot, story: BowlStory, figure?: () => Group, places?: () => { from: Point3; out: Point3 } | null): SpotProp {
  const root = new Group();
  root.name = 'candy-bowl';
  root.position.set(spot.at.x, spot.at.y, BOWL.z);
  root.add(glass());
  const morning = spot.word === LEFT;
  const sweets = BOWL_SWEETS.map((sweet, i) => ({ ...sweet, kind: trailShape(i), colour: trailColour(i) })).filter((sweet) => !morning || sweet.part === 'rest');
  // Each kind of sweet is one instanced mesh, as on the trail, and takes the kit's shape when it has come.
  const colour = new Color();
  const batches = [0, 1, 2].map((kind) => {
    const mine = sweets.map((sweet, i) => ({ sweet, i })).filter(({ sweet }) => sweet.kind === kind);
    const mesh = new InstancedMesh(standIn(), new MeshStandardMaterial({ roughness: 0.32, side: DoubleSide }), Math.max(1, mine.length));
    mesh.count = mine.length;
    mesh.name = `candy-bowl-${TRAIL_SHAPES[kind]}`;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    // They leave the bowl with him: never outside the picture as a whole while he is in it.
    mesh.frustumCulled = false;
    for (const [slot, { sweet }] of mine.entries()) mesh.setColorAt(slot, colour.set(sweet.colour));
    sweetSocket(mesh, { shape: TRAIL_SHAPES[kind]!, scale: SWEET_SIZE });
    drawnWhile(mesh, mine.length > 0);
    root.add(mesh);
    return { mesh, mine };
  });
  const leaper = !morning && figure ? figure() : null;
  // His own soft light, behind him: made when he first leaps.
  let halo: Mesh | null = null;
  if (leaper) {
    leaper.name = 'bowl-leaper';
    leaper.rotation.order = 'YXZ';
    drawnWhile(leaper, false);
    root.add(leaper);
  }

  const at = new Vector3(), size = new Vector3(), turn = new Quaternion(), matrix = new Matrix4(), euler = new Euler(0, 0, 0, 'YXZ');
  const held = new Vector3(), heldTurn = new Quaternion(), carried = new Quaternion();
  /** Where everything is `since` seconds after his leap began; below zero, before it. */
  function show(since: number): void {
    const way = leaper && places ? places() : null;
    const grab: Grab | null = way ? grabAt(since, way.from, way.out) : null;
    const landed = since - GRAB.lands, leapt = since - GRAB.leaps;
    if (leaper && way && grab) {
      const flying = since >= 0 && grab.phase !== 'gone';
      drawnWhile(leaper, flying);
      if (flying && !halo) {
        halo = new Mesh(new PlaneGeometry(2.1, 2.1), new MeshBasicMaterial({
          color: '#ffe2b0', map: glowTexture(32), transparent: true, opacity: 0.5, depthWrite: false, blending: AdditiveBlending, fog: false,
        }));
        halo.name = 'bowl-leaper-light';
        halo.renderOrder = 1;
        root.add(halo);
      }
      if (halo) drawnWhile(halo, flying);
      if (flying) {
        leaper.position.set(grab.at.x - root.position.x, grab.at.y - root.position.y, grab.at.z - root.position.z);
        const down = Math.atan2(BOWL.x - way.from.x, BOWL.z - way.from.z), up = Math.atan2(way.out.x - BOWL.x, way.out.z - BOWL.z);
        // He turns the short way round at each leap: to where he is going as he crouches, and holds it in the air.
        const turned = grab.phase === 'shelf' ? mix(WATCH_TURN, down, smooth(grab.k))
          : grab.phase === 'down' ? down
            : grab.phase === 'bowl' ? mix(down, up, smooth((since - GRAB.lifts + 0.12) / (GRAB.leaps - GRAB.lifts + 0.12)))
              : up;
        // Leaning into each leap, upright as he lands, and bent down into the sweets as he digs.
        const lean = grab.phase === 'down' ? 0.5 * Math.sin(Math.PI * Math.min(1, grab.k * 1.25))
          : grab.phase === 'bowl' ? 1.05 * grab.dig
            : grab.phase === 'up' ? 0.4 * Math.sin(Math.PI * Math.min(1, grab.k * 1.4)) : 0;
        leaper.rotation.set(lean, turned, 0);
        // A crouch before each leap; and out in the dark he is soon small, and gone.
        const far = grab.phase === 'up' ? 1 - smooth((grab.k - 0.8) / 0.2) : 1;
        leaper.scale.set(far, far * (1 - 0.22 * grab.crouch), far);
        leaper.updateMatrix();
        halo!.position.set(leaper.position.x, leaper.position.y + 0.45, leaper.position.z - 0.3);
        halo!.scale.setScalar(far);
      }
    }
    let carriedSlot = 0, afterSlot = 0, spillSlot = 0;
    const slots = batches.map(() => 0);
    for (const sweet of sweets) {
      const batch = batches[sweet.kind]!, slot = slots[sweet.kind]!++;
      at.set(sweet.at.x, sweet.at.y, sweet.at.z);
      euler.set(0, sweet.turn, sweet.tip);
      turn.setFromEuler(euler);
      let scale = 1;
      // What lies under him jumps as he lands in it, and settles.
      if (landed >= 0 && sweet.part !== 'spill') at.y += 0.05 * Math.exp(-landed * 7) * Math.abs(Math.sin(landed * 16 + sweet.turn));
      if (sweet.part === 'armful') {
        const mine = ARMFUL[carriedSlot++ % ARMFUL.length]!;
        if (grab && leaper && since >= GRAB.lands) {
          // Out of the heap and into his arms as he comes up, and then wherever he goes.
          held.set(mine.x, mine.y, mine.z).applyMatrix4(leaper.matrix);
          euler.set(0, mine.turn, mine.tip);
          heldTurn.copy(leaper.quaternion).multiply(carried.setFromEuler(euler));
          const k = grab.phase === 'bowl' ? grab.gathered : 1;
          at.lerp(held, k);
          turn.slerp(heldTurn, k);
          scale = grab.phase === 'gone' ? 0 : leaper.scale.x;
        }
      } else if (sweet.part === 'after') {
        // Two that were not in his arms fly out after him, one a little behind the other, turning over as they go.
        const mine = afterSlot++;
        const k = (leapt - 0.1 - 0.12 * mine) / (GRAB.out - GRAB.leaps);
        if (way && k > 0) {
          const from = { x: at.x + root.position.x, y: at.y + root.position.y, z: at.z + root.position.z };
          const on = leapAt(from, way.out, 0.95 + 0.25 * mine, Math.min(1, k));
          at.set(on.x - root.position.x, on.y - root.position.y, on.z - root.position.z);
          euler.set(k * 7, sweet.turn + k * 5, sweet.tip);
          turn.setFromEuler(euler);
          scale = 1 - smooth((k - 0.8) / 0.2);
        }
      } else if (sweet.part === 'spill') {
        // Some are knocked out as he lands: up over the rim, down onto the table beside it, a small bounce, and still.
        const mine = spillSlot++;
        const to = SPILLED[mine % SPILLED.length]!;
        const k = (landed - 0.04 * mine) / 0.52;
        if (k > 0) {
          const e = Math.min(1, k);
          const bounce = k > 1 ? 0.07 * Math.exp(-(k - 1) * 6) * Math.abs(Math.sin((k - 1) * 11)) : 0;
          at.set(mix(at.x, to.x, e), mix(at.y, to.y, e) + 0.6 * 4 * e * (1 - e) + bounce, mix(at.z, to.z, e));
          // Tumbling in the air, and lying on its side on the table.
          euler.set((1 - e) * 5 * (mine % 2 ? 1 : -1), sweet.turn + e * 2.4, sweet.tip * (1 - e));
          turn.setFromEuler(euler);
        }
      }
      matrix.compose(at, turn, size.setScalar(scale));
      batch.mesh.setMatrixAt(slot, matrix);
    }
    for (const { mesh } of batches) mesh.instanceMatrix.needsUpdate = true;
  }

  // Before the first frame it is the full bowl (or the morning's).
  show(-1);
  /** Seconds since his leap began: null until the first frame has said how the story stands. */
  let since: number | null = null;
  return {
    group: root,
    update(used, _clock, dt) {
      if (morning || !leaper) return;
      // A game taken up after the leap, and a picture that keeps still, have the bowl as he left it; and so does one
      // whose scene of the window was over before there was a bowl (./bowl.ts, `LEAP_OVER`).
      const over = story.flags?.has(LEAP_OVER) ?? false;
      if (since === null) since = used ? GRAB.out + 9 : -1;
      else if (!used) since = -1;
      else if (story.still || (since < 0 && over)) since = GRAB.out + 9;
      else since = since < 0 ? 0 : since + Math.max(0, dt);
      show(since);
    },
  };
}

/** For the tests and the chapter's notes: where the bowl's middle is in the room, at its rim's height. */
export const bowlTop = (): Point3 => ({ x: BOWL.x, y: BOWL.y + BOWL.rim, z: BOWL.z });
export { inBowl };
