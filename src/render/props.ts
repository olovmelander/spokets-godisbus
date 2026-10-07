import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  AdditiveBlending, BoxGeometry, BufferGeometry, CanvasTexture, Color, ConeGeometry, DataTexture, Float32BufferAttribute, CylinderGeometry, DoubleSide, DynamicDrawUsage, Group, InstancedMesh, LatheGeometry, LinearFilter, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, OctahedronGeometry, PlaneGeometry, Shape, ShapeGeometry, SphereGeometry, SRGBColorSpace, TorusGeometry, Vector2, Vector3,
} from 'three';
import type { ChapterData, HelpState, Mover, RideLook, Spot } from '../sim/types';
import { DEMO_SECONDS, demoFloor, demoFor, sampleDemo, type DemoPose } from './helper-demo';
import { drawnWhile } from './idle';
import { sweetSocket } from './candy';
import { forestSocket, standingCone } from './forest-kit';
import type { MountainSocket } from './mountain-kit';
import { saturdayBag } from './saturday-bag';
import { MODEL_TURN } from './ghost-model';
import { matchboxShape } from './matchbox';

/**
 * Stand-ins for the things and the animals of the story, built in code: each is recognisable, and none is
 * final. The animals and the family are designed in Blender (plan §5.6); until they are, a chapter says what
 * a thing is (`look`), and it is drawn as that instead of as a box or a bare glint.
 * Nothing here is a likeness of anyone: a person is a sign on a stick, in a colour of their own.
 */

const solid = (color: string, roughness = 0.8, more: Partial<ConstructorParameters<typeof MeshStandardMaterial>[0]> = {}) =>
  new MeshStandardMaterial({ color, roughness, ...more });
const ball = (radius: number, material: MeshStandardMaterial, x = 0, y = 0, z = 0, squash: [number, number, number] = [1, 1, 1]): Mesh => {
  const mesh = new Mesh(new SphereGeometry(radius, 14, 10), material);
  mesh.position.set(x, y, z);
  mesh.scale.set(...squash);
  return mesh;
};
const rod = (radius: number, length: number, material: MeshStandardMaterial): Mesh => new Mesh(new CylinderGeometry(radius, radius, length, 8), material);

// --- things on rails -----------------------------------------------------------------------------------------

/** A thing on a rail, as what it is. Its origin is the middle of its bottom, as the simulation's. Null: a plain box. */
export function moverProp(mover: Mover): Group | null {
  const w = mover.width;
  const h = mover.height;
  const group = new Group();
  switch (mover.look) {
    case 'plank':
    case 'block': {
      const wood = solid(mover.look === 'plank' ? '#c9ae84' : '#d7a65e', 0.75);
      const body = new Mesh(new BoxGeometry(w, h, mover.look === 'plank' ? 1.6 : 1.1), wood);
      body.position.y = h / 2;
      // A darker band at each end: sawn ends.
      for (const side of [-1, 1]) {
        const end = new Mesh(new BoxGeometry(0.06, h * 1.01, mover.look === 'plank' ? 1.61 : 1.11), solid('#9a7c52', 0.9));
        end.position.set((side * (w - 0.06)) / 2, h / 2, 0);
        group.add(end);
      }
      group.add(body);
      break;
    }
    case 'matchbox':
      // The one on the shop's step: blue paper, a drawn flame, its tray pushed up (./matchbox.ts). One draw.
      group.add(new Mesh(matchboxShape(w, h), solid('#ffffff', 0.85, { vertexColors: true })));
      break;
    case 'curl': {
      // A shaving from Pappa's knife: pale wood, thin, curled.
      const pale = solid('#f1dfb4', 0.7, { side: DoubleSide });
      if (h > w * 0.6) {
        for (const [radius, turn] of [[Math.min(w, h) / 2, 4.6], [Math.min(w, h) / 3.4, 5.2]] as const) {
          const shell = new Mesh(new CylinderGeometry(radius, radius, 1, 22, 1, true, 0.6, turn), pale);
          shell.rotation.x = Math.PI / 2;
          shell.position.y = h / 2;
          group.add(shell);
        }
      } else {
        const ribbon = new Mesh(new BoxGeometry(w - 0.5, 0.1, 1), pale);
        ribbon.position.y = h - 0.05;
        group.add(ribbon);
        for (const side of [-1, 1]) {
          const shell = new Mesh(new CylinderGeometry(h / 2, h / 2, 1, 16, 1, true, 0, 4.4), pale);
          shell.rotation.set(Math.PI / 2, 0, side > 0 ? 0 : Math.PI);
          shell.position.set(side * (w / 2 - h / 2), h / 2, 0);
          group.add(shell);
        }
      }
      break;
    }
    case 'stone': {
      // A step of the summit cairn, until the mountain kit's stacks are there: one of their stones is the step.
      const slab = new Mesh(new CylinderGeometry(w / 2, w * 0.53, h, 8), solid('#8d9698', 1, { flatShading: true }));
      slab.position.y = h / 2;
      slab.scale.z = 0.75;
      group.add(slab);
      group.userData.mountain = { standIn: 'step' } satisfies MountainSocket;
      group.userData.mover = mover.id;
      break;
    }
    case 'tussock': {
      // A tussock sedge's pedestal (visual audit, myren row 12): a column of dark peat and roots up out of the
      // water behind the lower path, a skirt of last year's straw leaves hanging round its crown, a flat top of
      // moss as wide as he can stand on and a few fresh blades at its back. Nothing floats. One mesh, its
      // colours on its corners.
      const paint = (shape: BufferGeometry, hex: string, shade?: (x: number, y: number, z: number) => number) => {
        const c = new Color(hex);
        const at = shape.getAttribute('position');
        const colour: number[] = [];
        for (let i = 0; i < at.count; i++) {
          const k = shade ? shade(at.getX(i), at.getY(i), at.getZ(i)) : 1;
          colour.push(c.r * k, c.g * k, c.b * k);
        }
        shape.setAttribute('color', new Float32BufferAttribute(colour, 3));
        return shape.index ? shape.toNonIndexed() : shape;
      };
      // The column: ragged, with the fibres of old roots up it, and darker the nearer the water it is.
      const column = new CylinderGeometry(w * 0.34, w * 0.27, 14, 12, 10).translate(0, h - 7.1, -0.2);
      const at = column.getAttribute('position');
      for (let i = 0; i < at.count; i++) {
        const a = Math.atan2(at.getZ(i) + 0.2, at.getX(i));
        const out = 1 + 0.09 * Math.sin(a * 5 + at.getY(i) * 1.7) + 0.05 * Math.sin(a * 11 - at.getY(i) * 0.9);
        at.setXYZ(i, at.getX(i) * out, at.getY(i), (at.getZ(i) + 0.2) * out - 0.2);
      }
      const leaf = (turn: number, lean: number, long: number, hex: string, y: number, rim: number) => paint(
        new ConeGeometry(0.05, long, 3).rotateZ(Math.PI).translate(0, -long / 2, 0).rotateZ(lean).rotateY(-turn)
          .translate(Math.cos(turn) * rim * w * 0.5, y, Math.sin(turn) * rim * w * 0.38), hex);
      const parts = [
        paint(column, '#4a3627', (x, y, z) => (0.55 + 0.45 * Math.min(1, Math.max(0, (y + 2) / 6))) * (0.8 + 0.2 * Math.sin(Math.atan2(z + 0.2, x) * 9))),
        // The moss: flat where he stands, rounding over at its edge into the leaves.
        paint(new LatheGeometry([[0.42, 0], [0.5, 0.45], [0.47, 0.8], [0.4, 1], [0, 1]].map(([r, y]) => new Vector2(r! * w, y! * h)), 14)
          .scale(1, 1, 0.76), '#7d8a36', (_, y) => 0.62 + 0.38 * (y / h) ** 2),
        // Last year's leaves hang round the crown, close to the column.
        ...Array.from({ length: 22 }, (_, i) => leaf((i / 22) * Math.PI * 2 + 0.2, 0.12 + (i % 3) * 0.06, 1.3 + (i % 5) * 0.14, i % 3 ? '#d2b968' : '#a8894a', 0.08, 0.9)),
        ...[-0.3, -0.1, 0.12, 0.3].map((x, i) => leaf(Math.PI * 1.5 + x, Math.PI - 0.2 + i * 0.1, 0.45, '#8f9a3a', h - 0.02, 0.6)),
      ];
      group.add(new Mesh(mergeGeometries(parts), solid('#ffffff', 0.9, { vertexColors: true })));
      break;
    }
    case 'ants': {
      // Two draw calls for the whole living column: dark linked bodies beneath a broad needle mat.
      // The animals remain code stand-ins until their Blender round.
      const ants = new InstancedMesh(new SphereGeometry(0.09, 8, 6), solid('#3a281c'), 30);
      const at = new Object3D();
      for (let i = 0; i < 30; i++) {
        const row = Math.floor(i / 3);
        at.position.set(Math.sin(row * 1.6) * 0.14 + (i % 3 - 1) * 0.11, h - 0.25 - row * 0.2, 0.13);
        at.scale.set(i % 3 === 0 ? 1.3 : 1, 0.75, 1);
        at.updateMatrix();
        ants.setMatrixAt(i, at.matrix);
      }
      const mat = new Mesh(new BoxGeometry(w, h, 0.9), solid('#a08b45'));
      mat.position.y = h / 2;
      group.add(ants, mat);
      break;
    }
    case 'twig': {
      const bark = solid('#6e5238', 0.95);
      const stem = new Mesh(new CylinderGeometry(h * 0.3, h * 0.42, w, 9), bark);
      stem.rotation.z = Math.PI / 2;
      stem.position.y = h * 0.42;
      group.add(stem);
      for (const [x, lean] of [[-0.6, 0.9], [0.1, -0.8], [0.7, 0.7]] as const) {
        const side = rod(h * 0.14, 0.7, bark);
        side.position.set(x * (w / 2.4), h * 0.6, lean > 0 ? 0.25 : -0.25);
        side.rotation.set(lean, 0, lean * 0.6);
        group.add(side);
      }
      // The forest kit's twig takes its place (./forest-kit.ts), as its cone, its leaf, its seesaw, its door and the cap do theirs.
      forestSocket(group, { shape: 'kvist', size: [w / 2.4, h / 0.5, h / 0.5] });
      break;
    }
    case 'cone': {
      // A spruce cone standing on its end: as tall as he is and more.
      const profile = [[0, 0], [0.62, 0.06], [0.95, 0.28], [1, 0.52], [0.78, 0.8], [0.4, 0.96], [0, 1]];
      const cone = new Mesh(new LatheGeometry(profile.map(([r, y]) => new Vector2(r! * (w / 2), y! * h)), 12), solid('#7a4f2c', 0.85, { flatShading: true }));
      group.add(cone);
      forestSocket(group, standingCone(w, h));
      break;
    }
    case 'leaf': {
      const leaf = ball(1, solid('#b7bf4c', 0.6), 0, h * 0.6, 0, [w / 2, h * 0.45, 0.95]);
      const rib = new Mesh(new BoxGeometry(w * 0.92, 0.05, 0.07), solid('#8a8f33', 0.7));
      rib.position.y = h;
      group.add(leaf, rib);
      forestSocket(group, { shape: 'lovbat', size: [w / 2.9, h / 0.3, w / 2.9] });
      break;
    }
    case 'log': {
      // A dead pine, grey and bare: it lies level, with its top where he walks.
      const grey = solid('#a9a69e', 1);
      const trunk = new Mesh(new CylinderGeometry(h * 0.55, h * 0.7, w, 12), grey);
      trunk.rotation.z = Math.PI / 2;
      trunk.position.y = h * 0.42;
      group.add(trunk);
      for (const x of [-0.3, 0.15, 0.38]) {
        const stub = rod(0.07, 0.9, grey);
        stub.position.set(x * w, h * 0.8, -0.45);
        stub.rotation.x = -0.9;
        group.add(stub);
      }
      break;
    }
    case 'figure': {
      // The pointed cap and crooked smile match the remembered first carving. Its restored eyes
      // become visible only after Elof paints them; the collider keeps its existing saved meaning.
      const old = solid('#8f8c7e', 1);
      const body = new Mesh(new CylinderGeometry(.13, .2, .48, 8), old);
      body.position.set(0, .24, 0); body.rotation.z = -.08;
      const cap = new Mesh(new ConeGeometry(.17, .34, 7), old); cap.position.set(.02, .84, 0); cap.rotation.z = -.1;
      const dark = solid('#3d3932', .9), eyes = new Group(); eyes.name = 'first-carving-eyes'; eyes.visible = false;
      for (const x of [-.075, .075]) eyes.add(ball(.023, dark, x, .61, .146));
      const smile = new Mesh(new TorusGeometry(.055, .009, 5, 12, Math.PI), dark);
      smile.position.set(0, .57, .146); smile.rotation.z = Math.PI;
      group.add(body, ball(.16, old, .015, .58), cap, smile, eyes,
        ball(.06, solid('#6f8a45', 1), -.13, .38, .08, [1, .5, 1]));
      group.name = 'first-carving';
      break;
    }
    default:
      return null;
  }
  return group;
}

// --- things to use -------------------------------------------------------------------------------------------

/** A thing at a spot: what it looks like, and how it answers to being used. */
export interface SpotProp {
  group: Group;
  /** `used`: its flag is set. `clock` and `dt` are in seconds. */
  update(used: boolean, clock: number, dt: number, strike?: number): void;
}

/** The colour of a person's sign: Moa's denim, Pappa's green, Bertil's cap, Mamma's mug. No likeness. */
const SIGNS: Record<string, string> = {
  callMoa: '#5b7fb5', callPappa: '#5a7d4a', callBertil: '#d98a2c', callMamma: '#f1ece2', goHome: '#5a7d4a',
  giveMoa: '#5b7fb5', givePappa: '#5a7d4a', giveBertil: '#d98a2c', giveMamma: '#f1ece2', takeKnife: '#5a7d4a',
  gardenBoard: '#334e72',
};

/** A thing at a spot, a little behind the path so that he passes in front of it. Null: only the glint. */
/**
 * A shy light's glow, worked out in numbers so that it needs no canvas: pale gold at its heart, green towards its
 * rim, and gone at its edge. Its brightness is in its alpha, so that it adds to what is behind it.
 */
function wispLight(): DataTexture {
  const size = 32;
  const data = new Uint8Array(size * size * 4);
  const [rim, gold, heart] = [new Color('#8ac5a0'), new Color('#fff2b0'), new Color('#fffbe8')];
  const tone = new Color();
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const out = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) / (size / 2);
      const core = Math.max(0, 1 - out / 0.12);
      tone.copy(rim).lerp(gold, Math.max(0, 1 - out / 0.4)).lerp(heart, core);
      data.set([tone.r * 255, tone.g * 255, tone.b * 255, 255 * Math.min(1, core + 0.85 * Math.max(0, 1 - out) ** 2)], (y * size + x) * 4);
    }
  }
  const texture = new DataTexture(data, size, size);
  texture.magFilter = texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function spotProp(spot: Spot): SpotProp | null {
  const group = new Group();
  group.position.set(spot.at.x, spot.at.y, -0.6);
  /** For how long it has been used. */
  let since = 0;
  let lastStrike = 0;
  const vanish = (used: boolean, dt: number, over = 0.35) => {
    since = used ? since + dt : 0;
    const size = Math.max(0, 1 - since / over);
    group.scale.setScalar(size);
    // Shrunk away, it is out of the picture too (./idle.ts).
    drawnWhile(group, size > 0);
  };
  switch (spot.look) {
    case 'crack': {
      // The crack the finale walks to, beside the old pine (visual audit, berget-and-norrsken row 22): its lips
      // weathered pale and chipped, and crowberry at its back. It was a slit with nothing to mark it. The stones
      // lie behind the line he walks on and in front of it, never on it.
      const parts: BufferGeometry[] = [];
      const pale = ['#c9c6bc', '#b8b5ab', '#d6d3c8'];
      for (const [i, [side, z, w]] of ([[-1, -0.9, 0.2], [1, -0.6, 0.17], [-1, 0.55, 0.14], [1, 0.68, 0.2], [-1, 1.1, 0.16], [1, 1.35, 0.13], [-1, -1.6, 0.18], [1, -1.3, 0.15]] as const).entries()) {
        // Each on its lip, its inner edge just outside the crack, which is 0.36 wide.
        const stone = new OctahedronGeometry(1, 1).scale(w * 1.3, w * 0.35, w).rotateY(i * 1.3).translate(side * (0.2 + w * 1.3), w * 0.1, z);
        const tone = new Color(pale[i % pale.length]);
        stone.setAttribute('color', new Float32BufferAttribute(Array.from({ length: stone.getAttribute('position').count }, () => [tone.r, tone.g, tone.b]).flat(), 3));
        parts.push(stone);
      }
      // Crowberry at the back lip: low dark sprigs.
      for (const [x, z] of [[-0.45, -1.15], [0.48, -0.95], [0.5, -1.7]] as const) {
        const sprig = new SphereGeometry(0.14, 7, 5).scale(1.4, 0.55, 1.1).translate(x, 0.04, z);
        const tone = new Color('#25391f');
        sprig.setAttribute('color', new Float32BufferAttribute(Array.from({ length: sprig.getAttribute('position').count }, () => [tone.r, tone.g, tone.b]).flat(), 3));
        parts.push(sprig.toNonIndexed());
      }
      group.add(new Mesh(mergeGeometries(parts.map((part) => (part.index ? part.toNonIndexed() : part))), solid('#ffffff', 0.95, { vertexColors: true, flatShading: true })));
      return { group, update() {} };
    }
    case 'cairn': {
      const stones = new InstancedMesh(new SphereGeometry(1, 10, 7), solid('#b5b9ad', 1, { flatShading: true }), 3);
      const at = new Object3D();
      for (const [i, [x, y, w, h]] of [[0, 0.17, 0.44, 0.2], [-0.06, 0.45, 0.32, 0.16], [0.03, 0.68, 0.21, 0.13]].entries()) {
        at.position.set(x!, y!, 0);
        at.scale.set(w!, h!, w! * 0.8);
        at.updateMatrix();
        stones.setMatrixAt(i, at.matrix);
      }
      group.add(stones);
      // The mountain kit's cairn has its mark on its capstone.
      group.userData.mountain = { standIn: 'cairn' } satisfies MountainSocket;
      return { group, update() {} };
    }
    case 'wisp': {
      // A shy light over the bog: a soft glow, pale gold at its heart and green towards its rim, added to the
      // mist behind it, that bobs and shimmers (visual audit, myren row 19). It was a ball in a shell.
      const material = new MeshBasicMaterial({ map: wispLight(), transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false });
      const glow = new Mesh(new PlaneGeometry(1.4, 1.4), material);
      glow.position.y = 0.65;
      group.add(glow);
      group.visible = false;
      // Each shimmers at its own pace: slowly, two waves together, never a flicker.
      const pace = 0.8 + (Math.abs(spot.at.x * 7.3) % 1) * 0.6;
      return { group, update(used, clock, dt) {
        vanish(used, dt, 0.6);
        glow.position.y = 0.65 + Math.sin(clock * 2.5) * 0.12;
        material.color.setScalar(0.88 + 0.12 * Math.sin(clock * 2.3 * pace) * Math.sin(clock * 1.1 * pace + 1));
      } };
    }
    case 'ladybird': {
      // On its back, legs in the air, until he turns it over. Then it flies to the hose.
      const body = new Group();
      const shell = new Mesh(new SphereGeometry(0.36, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), solid('#d2281e', 0.25));
      const black = solid('#1c1a1a', 0.4);
      body.add(shell, ball(0.15, black, 0.3, 0.05, 0), new Mesh(new CylinderGeometry(0.36, 0.36, 0.03, 18), black));
      for (const [x, z] of [[-0.1, 0.16], [0.08, -0.14], [-0.16, -0.1], [0.14, 0.12], [0, 0]] as const) body.add(ball(0.06, black, x, Math.sqrt(Math.max(0, 0.36 ** 2 - x * x - z * z)) - 0.02, z, [1, 0.4, 1]));
      // Six legs under it: in the air, and kicking, while it lies on its back.
      const legs = [-0.2, 0, 0.2].flatMap((x) => [-1, 1].map((side) => {
        const leg = rod(0.018, 0.24, black);
        leg.position.set(x, -0.08, side * 0.2);
        leg.rotation.x = side * 0.7;
        body.add(leg);
        return leg;
      }));
      body.position.y = 0.36;
      group.add(body);
      return {
        group,
        update(used, clock, dt) {
          since = used ? since + dt : 0;
          for (const [i, leg] of legs.entries()) leg.rotation.z = used ? 0 : Math.sin(clock * 11 + i * 1.3) * 0.5;
          const turned = Math.min(1, since / 0.4);
          body.rotation.x = Math.PI * (1 - turned) + (used ? 0 : Math.sin(clock * 7) * 0.12);
          // Up and away, to the right, where the hose hangs.
          const flown = Math.max(0, since - 0.6);
          body.position.set(flown * 3.2, 0.36 * turned + (1 - turned) * 0.36 + flown * flown * 2.2, 0);
          group.scale.setScalar(flown > 1.6 ? 0 : 1);
          drawnWhile(group, flown <= 1.6);
        },
      };
    }
    case 'berry':
    case 'crowberry': {
      const stem = rod(0.02, 0.5, solid('#5a6b2e'));
      stem.position.y = 0.25;
      const leaf = solid('#2f5a26', 0.4);
      group.add(stem, ball(0.11, solid(spot.look === 'berry' ? '#c4202a' : '#1e1e2a', 0.25), 0.06, 0.36, 0.08));
      for (const [x, y, turn] of [[-0.14, 0.42, 0.5], [0.12, 0.5, -0.6], [-0.05, 0.56, 2.2]] as const) {
        const blade = ball(1, leaf, x, y, 0, [0.14, 0.025, 0.08]);
        blade.rotation.set(0.3, turn, 0.4);
        group.add(blade);
      }
      return { group, update: (used, _clock, dt) => vanish(used, dt) };
    }
    case 'vittra-door': {
      // An ordinary little wooden door tucked under a root; no creature or family likeness.
      const frame = new Mesh(new BoxGeometry(0.72, 0.82, 0.12), solid('#60432d'));
      frame.position.y = 0.41;
      const door = new Mesh(new BoxGeometry(0.5, 0.65, 0.09), solid('#785d37'));
      door.position.set(0, 0.33, 0.1);
      const root = rod(0.11, 1.1, solid('#4b3529'));
      root.position.set(-0.12, 0.86, -0.02);
      root.rotation.z = 1.2;
      const gift = ball(0.08, solid('#c4202a', 0.25), 0.37, 0.12, 0.2);
      group.add(forestSocket(new Group().add(frame, door, root, ball(0.025, solid('#dfc372', 0.5), 0.16, 0.33, 0.17)), { shape: 'vittradorr', size: 0.85 }), gift);
      return { group, update(used) { gift.scale.setScalar(used ? 1 : 0); drawnWhile(gift, used); } };
    }
    case 'keepsake': {
      const paper = ball(0.2, solid('#f2df9a'), 0, 0, 0, [1, 1, 0.1]);
      const leaf = ball(0.1, solid('#5f923f'), 0, 0, 0.04, [0.7, 1.3, 0.15]);
      leaf.rotation.z = -0.5;
      group.add(paper, leaf);
      return { group, update(used, clock, dt) {
        group.rotation.z = Math.sin(clock * 1.7) * 0.08;
        if (spot.id === 'garden:paper' || spot.id === 'garden:shared-paper') vanish(used, dt);
      } };
    }
    case 'jay': {
      // Lavskrikan: grey-brown, with a dark cap and a rust-red tail. It hops when it gets its berry.
      const bird = new Group();
      // The view puts the jay modelled in Blender here, once it has arrived: it finds this group by its name.
      bird.name = 'bird';
      const grey = solid('#8c7f72', 0.9);
      const tail = new Mesh(new BoxGeometry(0.42, 0.05, 0.16), solid('#b5622c', 0.8));
      tail.position.set(-0.36, 0.3, 0);
      tail.rotation.z = 0.35;
      const beak = new Mesh(new ConeGeometry(0.04, 0.14, 8), solid('#2a2622', 0.5));
      beak.rotation.z = -Math.PI / 2;
      beak.position.set(0.38, 0.55, 0);
      bird.add(
        ball(1, grey, 0, 0.36, 0, [0.3, 0.22, 0.2]), ball(0.14, solid('#5a4c42', 0.9), 0.22, 0.55, 0), tail, beak,
        ball(0.03, solid('#111111', 0.2), 0.3, 0.59, 0.1), ball(1, solid('#b5622c', 0.8), -0.05, 0.36, 0.19, [0.16, 0.1, 0.03]),
      );
      for (const z of [-0.07, 0.07]) {
        const leg = rod(0.015, 0.2, solid('#3a3028'));
        leg.position.set(0.02, 0.1, z);
        bird.add(leg);
      }
      group.add(bird);
      return {
        group,
        update(used, clock, dt) {
          since = used ? since + dt : 0;
          const hop = used && since < 1.4 ? Math.abs(Math.sin(since * 9)) * 0.3 : 0;
          bird.position.y = hop + Math.max(0, Math.sin(clock * 2.3)) * 0.02;
          bird.rotation.y = used ? 0 : Math.sin(clock * 1.1) * 0.5;
        },
      };
    }
    case 'ants': {
      const dark = solid('#2a1e18', 0.5);
      for (let i = 0; i < 6; i++) {
        const ant = new Group();
        ant.add(ball(0.07, dark, -0.11, 0.09, 0), ball(0.05, dark, 0, 0.1, 0), ball(0.06, dark, 0.1, 0.11, 0));
        ant.position.set(-0.9 + i * 0.36, 0, i % 2 ? 0.12 : -0.12);
        group.add(ant);
      }
      return {
        group,
        update(used, clock, dt) {
          vanish(used, dt);
          for (const [i, ant] of group.children.entries()) ant.position.y = Math.abs(Math.sin(clock * 8 + i)) * 0.03;
        },
      };
    }
    case 'sign': {
      // Where someone can be called: a round sign on a stick, in that person's colour.
      const wood = solid('#b9976a', 0.85);
      const stick = rod(0.035, 1.1, wood);
      stick.position.y = 0.55;
      const board = new Mesh(new CylinderGeometry(0.4, 0.4, 0.06, 24), wood);
      board.rotation.x = Math.PI / 2;
      board.position.y = 1.3;
      const face = new Mesh(new CylinderGeometry(0.31, 0.31, 0.07, 24), solid(SIGNS[spot.word ?? ''] ?? '#e8dcc0', 0.6));
      face.rotation.x = Math.PI / 2;
      face.position.y = 1.3;
      group.add(stick, board, face);
      // Mamma's is her white mug with its heart.
      if (spot.word === 'callMamma' || spot.word === 'giveMamma') group.add(ball(0.1, solid('#d0473a', 0.5), 0, 1.3, 0.05, [1, 1, 0.3]));
      if (spot.word === 'gardenBoard') {
        // A folded-plane glyph makes the departure choice readable without naming another family figure.
        const sheet = new Shape();
        sheet.moveTo(-0.2, 1.43); sheet.lineTo(0.23, 1.32); sheet.lineTo(-0.14, 1.13);
        sheet.lineTo(-0.08, 1.3); sheet.closePath();
        const paper = new Mesh(new ShapeGeometry(sheet), solid('#faf5e6', 0.8, { side: DoubleSide }));
        paper.name = 'garden-boarding-glyph'; paper.position.z = 0.055; group.add(paper);
      }
      group.position.z = -0.9;
      return { group, update: (_used, clock) => void (board.rotation.z = face.rotation.z = Math.sin(clock * 1.3 + spot.at.x) * 0.05) };
    }
    case 'seesaw': {
      // Pappa's seesaw: a stick across a stone. He stands on the low end.
      const plank = forestSocket(new Group().add(new Mesh(new BoxGeometry(4.4, 0.12, 0.7), solid('#c9ae84', 0.75))), { shape: 'gungbrada' });
      plank.position.set(1.3, 0.34, 0.6);
      plank.rotation.z = 0.14;
      group.add(plank, forestSocket(new Group().add(ball(0.3, solid('#8d8f8a', 0.95), 1.3, 0.12, 0.6, [1.2, 0.8, 1])), { shape: 'gungsten', at: [1.3, -0.2, 0.6] }));
      return { group, update: (used, _clock, dt) => { since = used ? since + dt : 0; plank.rotation.z = 0.14 - Math.min(1, since / 0.25) * 0.28; } };
    }
    case 'lollipop': {
      const stick = rod(0.025, 0.9, solid('#fff6e0', 0.6));
      stick.position.y = 0.45;
      // The kit's golden swirl, glowing; until it has come, a glowing ball.
      const sweet = sweetSocket(new Group().add(ball(0.22, solid('#ffd98a', 0.3, { emissive: '#ffb23c', emissiveIntensity: 0.9 }))),
        { shape: 'lysklubba', glow: 0.95 });
      sweet.position.y = 1;
      group.add(stick, sweet);
      group.position.z = -0.35;
      return { group, update: (used, clock, dt) => { vanish(used, dt); group.rotation.z = Math.sin(clock * 1.2) * 0.04; } };
    }
    case 'crane': {
      // A crane, kneeling for him to climb on: grey, long-necked, with its red crown.
      const grey = solid('#9aa0a6', 0.9);
      const neck = rod(0.06, 1.1, grey);
      neck.position.set(0.75, 1, 0);
      neck.rotation.z = -0.35;
      const beak = new Mesh(new ConeGeometry(0.045, 0.34, 8), solid('#6a6048', 0.6));
      beak.rotation.z = -Math.PI / 2;
      beak.position.set(1.2, 1.52, 0);
      group.add(
        ball(1, grey, 0, 0.55, 0, [0.95, 0.45, 0.42]), neck, ball(0.13, grey, 0.96, 1.5, 0), beak,
        ball(0.06, solid('#b8332a', 0.5), 0.94, 1.62, 0, [1, 0.5, 1]), ball(1, solid('#5c6066', 0.9), -0.85, 0.55, 0, [0.5, 0.22, 0.3]),
      );
      group.position.z = -0.8;
      return { group, update: (used, clock, dt) => { vanish(used, dt); neck.rotation.z = -0.35 + Math.sin(clock * 0.9) * 0.05; } };
    }
    case 'dew': {
      // A drop of dew at the tip of a bent blade of grass, as big as his head. Rung, it shivers and shines.
      const green = solid('#6fa436', 0.7, { side: DoubleSide });
      const blade = new Mesh(new CylinderGeometry(0.012, 0.05, spot.at.y + 0.5, 6), green);
      blade.position.set(-0.28, -spot.at.y / 2 + 0.2, 0);
      blade.rotation.z = -0.28;
      const drop = ball(0.16, new MeshStandardMaterial({ color: '#dff3ff', roughness: 0.05, transparent: true, opacity: 0.8, emissive: '#bfe6ff', emissiveIntensity: 0.25 }), 0, 0, 0, [1, 1.12, 1]);
      group.add(blade, drop);
      group.position.z = -0.5;
      return {
        group,
        update(used, clock, dt, strike = 0) {
          if (strike !== lastStrike) { since = 0; lastStrike = strike; }
          else since = used ? since + dt : 0;
          const ring = used && since < 0.9 ? Math.sin(since * 40) * 0.06 * (1 - since / 0.9) : 0;
          drop.position.set(ring, Math.sin(clock * 1.7 + spot.at.x) * 0.015, 0);
          (drop.material as MeshStandardMaterial).emissiveIntensity = used ? 0.9 : 0.25 + 0.1 * Math.sin(clock * 3 + spot.at.x);
        },
      };
    }
    case 'cobble': {
      // One of the five that ring: pale and smooth among the grey ones lying round it, and the lower its
      // note the bigger it is. The mountain kit's cobble takes this egg's place.
      const size = 0.36 - ((spot.note ?? 67) - 67) * 0.013;
      const pale = solid('#d8d6cf', 0.35, { emissive: '#fff6dc', emissiveIntensity: 0 });
      const stone = new Mesh(new SphereGeometry(1, 14, 10).scale(1, 0.6, 0.78), pale);
      stone.scale.setScalar(size);
      stone.rotation.y = spot.at.x * 1.7;
      stone.userData.mountain = { part: 'klapper' } satisfies MountainSocket;
      group.add(stone);
      group.position.z = -0.45;
      const rest = size * 0.5;
      return {
        group,
        update(used, _clock, dt, strike = 0) {
          // A small jump for every new touch, even when its discovery is already saved, and a flash of light.
          if (strike !== lastStrike) { since = 0; lastStrike = strike; }
          else since = used ? since + dt : 0;
          stone.position.y = rest + (used && since < 0.4 ? Math.sin((since / 0.4) * Math.PI) * 0.18 : 0);
          pale.emissiveIntensity = used && since < 0.3 ? 0.5 * (1 - since / 0.3) : 0;
        },
      };
    }
    case 'bag': {
      // The same striped bag on the table, in the chase and when the ghost returns it.
      group.add(saturdayBag());
      group.position.z = 0.25;
      return { group, update: (used, _clock, dt) => vanish(used, dt) };
    }
    case 'memory': {
      // A minnesspån: a curl of Pappa's shaving that glows where the ghost has stopped. Touched, it has been seen.
      const glow = solid('#ffe6a8', 0.5, { emissive: '#ffbf4a', emissiveIntensity: 1, side: DoubleSide });
      const curl = new Group();
      for (const [radius, turn] of [[0.3, 4.8], [0.17, 5.4]] as const) {
        const shell = new Mesh(new CylinderGeometry(radius, radius, 0.42, 20, 1, true, 0.4, turn), glow);
        shell.rotation.x = Math.PI / 2;
        curl.add(shell);
      }
      curl.position.y = 0.42;
      group.add(curl);
      group.position.z = -0.4;
      return {
        group,
        update(used, clock) {
          glow.emissiveIntensity = used ? 0.15 : 0.8 + 0.4 * Math.sin(clock * 3);
          curl.position.y = 0.42 + (used ? 0 : Math.sin(clock * 2) * 0.05);
          curl.rotation.y = used ? 0.4 : Math.sin(clock * 0.8) * 0.5;
        },
      };
    }
    case 'shavings': {
      // What Pappa's knife left on the table: pale curls.
      const pale = solid('#f1dfb4', 0.7, { side: DoubleSide });
      for (const [x, z, r, turn] of [[-0.35, 0.1, 0.13, 0.4], [0.1, -0.15, 0.1, 2], [0.4, 0.2, 0.15, 3.4], [0.05, 0.3, 0.08, 5]] as const) {
        const curl = new Mesh(new CylinderGeometry(r, r, 0.22, 14, 1, true, 0, 4.6), pale);
        curl.rotation.set(Math.PI / 2, 0, turn);
        curl.position.set(x, r, z);
        group.add(curl);
      }
      group.position.z = 0.3;
      return { group, update: () => {} };
    }
    case 'star': {
      // The star that rolled out of the torn bag: it glitters, and turns.
      const gold = solid('#ffe07a', 0.2, { emissive: '#ffb400', emissiveIntensity: 0.9 });
      const star = new Group();
      for (let i = 0; i < 5; i++) {
        const point = new Mesh(new ConeGeometry(0.09, 0.3, 4), gold);
        point.position.set(Math.sin((i * Math.PI * 2) / 5) * 0.17, Math.cos((i * Math.PI * 2) / 5) * 0.17, 0);
        point.rotation.z = -(i * Math.PI * 2) / 5;
        star.add(point);
      }
      star.add(ball(0.13, gold, 0, 0, 0, [1, 1, 0.5]));
      sweetSocket(star, { shape: 'stjarna', glow: 0.8 });
      star.position.y = 0.55;
      group.add(star);
      group.position.z = 0;
      return { group, update: (used, clock, dt) => { vanish(used, dt); star.rotation.y = Math.sin(clock * 1.6) * 0.7; star.position.y = 0.55 + Math.sin(clock * 2.2) * 0.07; } };
    }
    case 'marble':
    case 'clip':
    case 'brick':
    case 'coin': {
      // Hittegods: a small thing on a foundation stone under the deck. To him it is as big as his head.
      const stone = new Mesh(new BoxGeometry(0.95, spot.at.y, 0.95), solid('#8d8a84', 0.95));
      stone.position.y = -spot.at.y / 2;
      const cap = new Mesh(new BoxGeometry(1.1, 0.12, 1.1), solid('#a09c94', 0.95));
      cap.position.y = -0.06;
      const thing = new Group();
      if (spot.look === 'marble') {
        thing.add(ball(0.2, solid('#3aa0d8', 0.08, { emissive: '#0c3a5a', emissiveIntensity: 0.5 }), 0, 0.2, 0));
        thing.add(ball(0.09, solid('#f4f8ff', 0.2), 0.03, 0.22, 0.06, [1.6, 0.5, 0.6]));
      } else if (spot.look === 'clip') {
        const pink = solid('#e86a9a', 0.4);
        const bar = new Mesh(new BoxGeometry(0.62, 0.05, 0.14), pink);
        bar.position.y = 0.05;
        thing.add(bar);
        // A little flower at one end, five petals round a yellow middle.
        for (let i = 0; i < 5; i++) thing.add(ball(0.06, solid('#fff3f7', 0.5), 0.22 + Math.cos(i * 1.257) * 0.08, 0.12, Math.sin(i * 1.257) * 0.08));
        thing.add(ball(0.05, solid('#f2c230', 0.5), 0.22, 0.14, 0));
      } else if (spot.look === 'brick') {
        // A toy brick: plain, with two studs, and no mark on it.
        const yellow = solid('#f2c230', 0.35);
        const block = new Mesh(new BoxGeometry(0.44, 0.24, 0.24), yellow);
        block.position.y = 0.12;
        thing.add(block);
        for (const x of [-0.11, 0.11]) {
          const stud = new Mesh(new CylinderGeometry(0.07, 0.07, 0.06, 14), yellow);
          stud.position.set(x, 0.27, 0);
          thing.add(stud);
        }
        thing.rotation.y = 0.5;
      } else {
        // A coin, leaning: plain gold, with a rim.
        const gold = solid('#d9a93a', 0.3, { emissive: '#6a4a00', emissiveIntensity: 0.4 });
        const disc = new Mesh(new CylinderGeometry(0.2, 0.2, 0.035, 28), gold);
        const rim = new Mesh(new CylinderGeometry(0.16, 0.16, 0.045, 28), solid('#f0c860', 0.3));
        const coin = new Group();
        coin.add(disc, rim);
        coin.rotation.set(Math.PI / 2 - 0.5, 0, 0.3);
        coin.position.y = 0.2;
        thing.add(coin);
      }
      // Under the deck it lies on a stone. On the table at the party it lies on the cloth.
      if (spot.at.y > 0.2) group.add(stone, cap);
      group.add(thing);
      group.position.z = -0.9;
      let gone = 0;
      return {
        group,
        update(used, clock, dt) {
          // The stone stays. The thing glints a little while it lies there, and is gone when he has it.
          gone = used ? Math.min(1, gone + dt / 0.3) : 0;
          thing.scale.setScalar(1 - gone);
          drawnWhile(thing, gone < 1);
          thing.position.y = used ? gone * 0.5 : Math.sin(clock * 2 + spot.at.x) * 0.02;
        },
      };
    }
    case 'gold': {
      // The golden geléhallon: a raspberry of golden beads.
      const gold = solid('#ffcf3a', 0.25, { emissive: '#d99a00', emissiveIntensity: 0.7 });
      const sweet = new Group();
      for (let i = 0; i < 9; i++) sweet.add(ball(0.07, gold, Math.cos(i * 2.4) * 0.09 * (1 - i / 14), 0.05 + i * 0.022, Math.sin(i * 2.4) * 0.09 * (1 - i / 14)));
      sweetSocket(sweet, { shape: 'guldhallon', scale: 0.8, y: 0.12, glow: 0.65 });
      sweet.position.y = 0.5;
      group.add(sweet);
      group.position.z = 0;
      return { group, update: (used, clock, dt) => { vanish(used, dt); sweet.rotation.y = clock * 1.4; sweet.position.y = 0.5 + Math.sin(clock * 2) * 0.06; } };
    }
    default:
      return null;
  }
}

// --- the helper ----------------------------------------------------------------------------------------------

/** A small bird, facing +x, with its feet at the origin: the jay's shape, used for the helper as well. */
function bird(): Group {
  const group = new Group();
  group.name = 'bird';
  const grey = solid('#8c7f72', 0.9);
  const tail = new Mesh(new BoxGeometry(0.42, 0.05, 0.16), solid('#b5622c', 0.8));
  tail.position.set(-0.36, 0.3, 0);
  tail.rotation.z = 0.35;
  const beak = new Mesh(new ConeGeometry(0.04, 0.14, 8), solid('#2a2622', 0.5));
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.38, 0.55, 0);
  group.add(ball(1, grey, 0, 0.36, 0, [0.3, 0.22, 0.2]), ball(0.14, solid('#5a4c42', 0.9), 0.22, 0.55, 0), tail, beak, ball(0.03, solid('#111111', 0.2), 0.3, 0.59, 0.1));
  for (const side of [-1, 1]) {
    const wing = new Mesh(new BoxGeometry(0.3, 0.03, 0.34), solid('#b5622c', 0.8));
    wing.geometry.translate(0, 0, 0.17);
    wing.position.set(-0.04, 0.44, side * 0.12);
    wing.scale.z = side;
    wing.name = side > 0 ? 'wingNear' : 'wingFar';
    group.add(wing);
  }
  return group;
}

/** How far in front of the play plane the dotted Elof is drawn: 0.3 EL nearer than the nearest prop. */
const DEMO_Z = 0.95;
/** How high over what it shows the jay perches. */
const BIRD_PERCH = 1.6;

/**
 * The helper (plan §4.6): the existing wooden ghost in the garden, then the jay. The third hint samples
 * a dotted silhouette along a short action trajectory. Nothing here changes a rule or awards anything.
 * All meshes exist from startup, including the still poses for the reduced-motion alternative. What is not
 * shown is out of the picture, and not drawn at no size or unseen (./idle.ts).
 */
export function helperProp(chapter: ChapterData, ghost?: Group) {
  const group = new Group();
  group.name = 'helper';
  const flyer = new Group();
  flyer.name = 'helper-actor';
  flyer.add(ghost ?? bird());
  flyer.scale.setScalar(0);
  drawnWhile(flyer, false);
  const pale = () => new MeshStandardMaterial({ color: '#fff6dc', roughness: 1, transparent: true, opacity: 0, depthWrite: false, emissive: '#fff0c0', emissiveIntensity: 0.65 });
  // The dotted Elof is drawn in front of every prop, and each of its 0.05 EL dots lies on a darker one at 30%, so
  // that it holds on pale ground and never hides behind the thing it shows (docs/ux-audit/in-play.md row 21).
  const dark = () => new MeshStandardMaterial({ color: '#24180e', roughness: 1, transparent: true, opacity: 0, depthWrite: false });
  const unders: InstancedMesh<SphereGeometry, MeshStandardMaterial>[] = [];
  const figures = [0, 1, 2].map((i) => {
    const mesh = new InstancedMesh(new SphereGeometry(0.05, 8, 6), pale(), 64);
    mesh.name = `helper-demo-${i}`;
    drawnWhile(mesh, false);
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    const under = new InstancedMesh(new SphereGeometry(0.068, 8, 6), dark(), 64);
    under.name = `helper-demo-${i}-under`;
    // The same dots, read from the same matrices.
    under.instanceMatrix = mesh.instanceMatrix;
    drawnWhile(under, false);
    under.frustumCulled = false;
    unders.push(under);
    group.add(under, mesh);
    return mesh;
  });
  const rope = new Mesh(new CylinderGeometry(0.017, 0.017, 1, 6), pale());
  rope.name = 'helper-demo-lace';
  drawnWhile(rope, false);
  group.add(flyer, rope);
  // Its first thought is only a smudge, not words or the later story's revealed figure (§3.4).
  let thought: Mesh<PlaneGeometry, MeshBasicMaterial> | null = null;
  if (ghost) {
    const canvas = document.createElement('canvas'); canvas.width = 96; canvas.height = 64;
    const c = canvas.getContext('2d')!;
    c.fillStyle = '#fff6e2'; c.beginPath(); c.ellipse(49, 25, 42, 23, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(26, 55, 6, 4, -0.5, 0, Math.PI * 2); c.fill();
    c.filter = 'blur(5px)'; c.fillStyle = '#8b8172'; c.beginPath(); c.ellipse(50, 25, 13, 10, -0.4, 0, Math.PI * 2); c.fill();
    const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace;
    thought = new Mesh(new PlaneGeometry(0.95, 0.65), new MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false }));
    thought.name = 'helper-first-thought'; drawnWhile(thought, false); group.add(thought);
  }
  const dot = new Object3D(), end = new Vector3(), direction = new Vector3(), up = new Vector3(0, 1, 0);
  function drawPose(mesh: InstancedMesh, pose: DemoPose): void {
    let n = 0;
    const point = (x: number, y: number) => {
      dot.position.set(x - Math.sin(pose.lean) * y * 0.35, y, 0); dot.updateMatrix();
      mesh.setMatrixAt(n++, dot.matrix);
    };
    const segment = (ax: number, ay: number, bx: number, by: number, count = 5) => {
      for (let i = 0; i < count; i++) point(ax + (bx - ax) * i / (count - 1), ay + (by - ay) * i / (count - 1));
    };
    for (let i = 0; i < 10; i++) point(Math.cos(i / 10 * Math.PI * 2) * 0.15, 0.84 + Math.sin(i / 10 * Math.PI * 2) * 0.15);
    segment(-0.13, 0.69, -0.12, 0.38); segment(0.13, 0.69, 0.12, 0.38);
    segment(-0.13, 0.69, 0.13, 0.69); segment(-0.12, 0.38, 0.12, 0.38);
    for (const side of [-1, 1]) {
      segment(side * 0.11, 0.63, side * 0.18 + pose.reach * 0.28, 0.43 + pose.reach * 0.47, 6);
      segment(side * 0.09, 0.37, side * (0.15 + pose.stride * 0.22), 0.03, 6);
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.position.set(pose.x, pose.y, DEMO_Z);
  }
  let shown = 0;
  let last = { x: 0, y: 0 };
  let demonstration: DemoPose[] = [];
  let demoKey = '';
  let elapsed = 0;
  function update(help: HelpState, x: number, y: number, standY: number, clock: number, dt: number, still: boolean): void {
    const { step, at } = help;
    const here = step > 0 && at !== null;
    if (at) last = at;
    // It comes from where he is, and leaves upwards.
    if (here && shown === 0) flyer.position.set(x - 0.6, y + 1.4, 0.4);
    shown = still ? (here ? 1 : 0) : Math.min(1, Math.max(0, shown + (here ? dt : -dt) / 0.4));
    const cycle = clock % 3;
    const doubleKnock = Math.max(0, 1 - Math.abs(cycle - 0.9) / 0.12) + Math.max(0, 1 - Math.abs(cycle - 1.2) / 0.12);
    const knock = !still && (step >= 2 || help.visit) ? doubleKnock * 0.12 : 0;
    // The ghost stands beside what it shows; the jay perches 1.6 EL over it, so that it is never a second bird
    // beside a bird it shows (in-play.md row 21).
    const targetX = last.x - (ghost ? (help.verb === 'lace' || help.visit ? (step >= 3 ? 2.7 : 2.1) : 0.75) : 0.1);
    const targetY = ghost ? demoFloor(chapter, targetX) : last.y + BIRD_PERCH;
    const to = here ? { x: targetX + knock, y: targetY + (still ? 0 : ghost ? Math.sin(Math.PI * shown) * 0.35 : Math.sin(clock * 5) * 0.04), z: 0.45 } : { x: flyer.position.x, y: flyer.position.y + dt * 4, z: 0.45 };
    const k = still ? 1 : 1 - Math.exp(-5 * dt);
    flyer.position.set(flyer.position.x + (to.x - flyer.position.x) * k, flyer.position.y + (to.y - flyer.position.y) * k, to.z);
    flyer.scale.setScalar(shown * 0.9);
    drawnWhile(flyer, shown > 0);
    flyer.rotation.z = ghost ? -knock * 0.8 : 0;
    if (thought) {
      thought.material.opacity = help.visit ? shown * 0.9 : 0;
      drawnWhile(thought, thought.material.opacity > 0);
      thought.position.set(flyer.position.x + 0.15, flyer.position.y + 1.5, 0.65);
    }
    const beat = still ? 0 : Math.sin(clock * 22) * 0.9;
    const near = flyer.getObjectByName('wingNear'), far = flyer.getObjectByName('wingFar');
    if (near) near.rotation.x = -beat;
    if (far) far.rotation.x = beat;
    const key = step >= 3 && at ? `${at.x},${at.y},${help.verb},${help.replay ?? 0}` : '';
    if (key !== demoKey) { demoKey = key; elapsed = 0; demonstration = demoFor(chapter, help, standY); }
    if (key) elapsed = Math.min(DEMO_SECONDS, elapsed + dt);
    for (const [i, figure] of figures.entries()) {
      const visible = key !== '' && (i === 0 || still);
      const under = unders[i]!;
      figure.material.opacity = visible ? (still ? [0.24, 0.55, 0.35][i]! : 0.65) : 0;
      under.material.opacity = figure.material.opacity * (0.3 / 0.65);
      drawnWhile(figure, visible);
      drawnWhile(under, visible);
      if (!visible) continue;
      drawPose(figure, sampleDemo(demonstration, still ? [0, DEMO_SECONDS * 0.6, DEMO_SECONDS][i]! : elapsed));
      under.count = figure.count;
      under.position.set(figure.position.x, figure.position.y, DEMO_Z - 0.04);
    }
    const pose = key ? sampleDemo(demonstration, still ? DEMO_SECONDS * 0.6 : elapsed) : null;
    rope.material.opacity = pose?.rope ? 0.5 : 0;
    drawnWhile(rope, !!pose?.rope);
    if (pose?.rope) {
      end.set(pose.x + 0.2, pose.y + 0.9, DEMO_Z);
      direction.set(pose.rope.x, pose.rope.y, DEMO_Z).sub(end);
      rope.position.copy(end).addScaledVector(direction, 0.5);
      rope.scale.y = direction.length();
      rope.quaternion.setFromUnitVectors(up, direction.normalize());
    }
  }
  return { group, actor: flyer, update, get active() { return shown > 0.001; }, replaceGhost(model: Group) {
    if (!ghost) return;
    flyer.clear();
    model.rotation.y = MODEL_TURN;
    flyer.add(model);
  } };
}

// --- what carries him ----------------------------------------------------------------------------------------

/** What he rides on, pointing along +x, with its origin under his feet. The paper plane is the view's own. */
export function rideProp(look: RideLook): Object3D | null {
  const group = new Group();
  switch (look) {
    case 'cap': {
      // Bertil's cap, upside down on the water: a bowl with its peak pointing the way he goes.
      const cloth = solid('#3f5f8f', 0.85, { side: DoubleSide });
      const bowl = new Mesh(new SphereGeometry(0.75, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), cloth);
      bowl.scale.set(1.15, 0.55, 0.9);
      const peak = new Mesh(new CylinderGeometry(0.55, 0.55, 0.05, 18, 1, false, -0.9, 1.8), cloth);
      peak.position.set(0.55, -0.02, 0);
      // The kit's cap floats deeper, so that he sits in it, and is turned a little towards the camera.
      group.add(forestSocket(new Group().add(bowl, peak), { shape: 'keps', at: [0, 0.3, 0], turn: [0.22, -0.7, 0] }));
      group.position.y = 0.02;
      break;
    }
    case 'leaf': {
      // A birch leaf on the water: yellow, a little cupped, with its stalk pointing back the way he came.
      const yellow = solid('#e8b63a', 0.7, { side: DoubleSide });
      const blade = new Mesh(new SphereGeometry(0.9, 18, 8), yellow);
      blade.scale.set(1.3, 0.07, 0.85);
      const rib = new Mesh(new CylinderGeometry(0.03, 0.03, 2.3, 6), solid('#a9781f', 0.8));
      rib.rotation.z = Math.PI / 2;
      rib.position.y = 0.06;
      const stalk = new Mesh(new CylinderGeometry(0.025, 0.035, 0.7, 6), solid('#a9781f', 0.8));
      stalk.rotation.z = Math.PI / 2 - 0.5;
      stalk.position.set(-1.4, 0.2, 0);
      group.add(blade, rib, stalk);
      group.position.y = 0.02;
      break;
    }
    case 'crane': {
      const grey = solid('#9aa0a6', 0.9);
      const neck = rod(0.06, 1.2, grey);
      neck.rotation.z = -Math.PI / 2 + 0.25;
      neck.position.set(1.2, -0.05, 0);
      const beak = new Mesh(new ConeGeometry(0.045, 0.34, 8), solid('#6a6048', 0.6));
      beak.rotation.z = -Math.PI / 2;
      beak.position.set(2.05, 0.1, 0);
      group.add(ball(1, grey, 0, -0.35, 0, [1, 0.36, 0.42]), neck, ball(0.13, grey, 1.82, 0.1, 0), beak, ball(0.06, solid('#b8332a', 0.5), 1.8, 0.21, 0, [1, 0.5, 1]));
      for (const side of [-1, 1]) {
        const wing = new Mesh(new BoxGeometry(0.9, 0.05, 1.9), solid('#7d8288', 0.9));
        wing.geometry.translate(0, 0, 0.95);
        wing.position.set(0, -0.2, side * 0.3);
        wing.scale.z = side;
        wing.name = side > 0 ? 'wingNear' : 'wingFar';
        group.add(wing);
      }
      const legs = rod(0.03, 1.1, solid('#4a4a4a'));
      legs.rotation.z = Math.PI / 2;
      legs.position.set(-1.3, -0.42, 0);
      group.add(legs);
      break;
    }
    case 'ants': {
      const dark = solid('#2a1e18', 0.5);
      for (let i = 0; i < 5; i++) group.add(ball(0.07, dark, -0.5 + i * 0.25 - 0.11, -0.06, i % 2 ? 0.1 : -0.1), ball(0.06, dark, -0.5 + i * 0.25 + 0.03, -0.05, i % 2 ? 0.1 : -0.1));
      break;
    }
    default:
      return null;
  }
  return group;
}
