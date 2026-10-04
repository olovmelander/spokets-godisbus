import {
  BoxGeometry, ConeGeometry, CylinderGeometry, DoubleSide, Group, InstancedMesh, LatheGeometry, Mesh, Object3D, MeshStandardMaterial, SphereGeometry, Vector2,
} from 'three';
import type { Mover, RideLook, Spot } from '../sim/types';

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
      const slab = new Mesh(new CylinderGeometry(w / 2, w * 0.53, h, 8), solid('#8d9698', 1, { flatShading: true }));
      slab.position.y = h / 2;
      slab.scale.z = 0.75;
      group.add(slab);
      break;
    }
    case 'tussock': {
      // A firm tuft on a slim peat pillar behind the lower path, with a flat, readable moss top.
      const peat = new Mesh(new CylinderGeometry(w * 0.36, w * 0.23, 2.5, 8), solid('#635447'));
      peat.position.set(0, h - 1.45, -0.45);
      const moss = new Mesh(new CylinderGeometry(w / 2, w * 0.45, h, 10), solid('#829950'));
      moss.scale.z = 0.75;
      moss.position.y = h / 2;
      group.add(peat, moss);
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
      break;
    }
    case 'cone': {
      // A spruce cone standing on its end: as tall as he is and more.
      const profile = [[0, 0], [0.62, 0.06], [0.95, 0.28], [1, 0.52], [0.78, 0.8], [0.4, 0.96], [0, 1]];
      const cone = new Mesh(new LatheGeometry(profile.map(([r, y]) => new Vector2(r! * (w / 2), y! * h)), 12), solid('#7a4f2c', 0.85, { flatShading: true }));
      group.add(cone);
      break;
    }
    case 'leaf': {
      const leaf = ball(1, solid('#b7bf4c', 0.6), 0, h * 0.6, 0, [w / 2, h * 0.45, 0.95]);
      const rib = new Mesh(new BoxGeometry(w * 0.92, 0.05, 0.07), solid('#8a8f33', 0.7));
      rib.position.y = h;
      group.add(leaf, rib);
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
      // The first trägubbe: small, grey with age, mossy. Its eyes are painted in the story.
      const old = solid('#8f8c7e', 1);
      const body = new Mesh(new CylinderGeometry(w * 0.32, w * 0.42, h * 0.85, 10), old);
      body.position.y = h * 0.42;
      group.add(body, ball(w * 0.34, old, 0, h * 1.02), ball(w * 0.2, solid('#6f8a45', 1), -w * 0.12, h * 0.9, 0.06, [1, 0.5, 1]));
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
  update(used: boolean, clock: number, dt: number): void;
}

/** The colour of a person's sign: Moa's denim, Pappa's green, Bertil's cap, Mamma's mug. No likeness. */
const SIGNS: Record<string, string> = {
  callMoa: '#5b7fb5', callPappa: '#5a7d4a', callBertil: '#d98a2c', callMamma: '#f1ece2', goHome: '#5a7d4a',
  giveMoa: '#5b7fb5', givePappa: '#5a7d4a', giveBertil: '#d98a2c', giveMamma: '#f1ece2', takeKnife: '#5a7d4a',
};

/** A thing at a spot, a little behind the path so that he passes in front of it. Null: only the glint. */
export function spotProp(spot: Spot): SpotProp | null {
  const group = new Group();
  group.position.set(spot.at.x, spot.at.y, -0.6);
  /** For how long it has been used. */
  let since = 0;
  const vanish = (used: boolean, dt: number, over = 0.35) => {
    since = used ? since + dt : 0;
    group.scale.setScalar(Math.max(0, 1 - since / over));
  };
  switch (spot.look) {
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
      return { group, update() {} };
    }
    case 'wisp': {
      const light = solid('#fff2b0', 0.25, { emissive: '#ffe8a0', emissiveIntensity: 1.8 });
      const glow = ball(0.18, light, 0, 0.65);
      const halo = ball(0.32, solid('#b0e1b7', 0.4, { transparent: true, opacity: 0.3, depthWrite: false, emissive: '#8ac5a0', emissiveIntensity: 0.6 }), 0, 0.65);
      group.add(glow, halo);
      group.visible = false;
      return { group, update(used, clock, dt) {
        vanish(used, dt, 0.6);
        glow.position.y = halo.position.y = 0.65 + Math.sin(clock * 2.5) * 0.12;
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
      group.position.z = -0.9;
      return { group, update: (_used, clock) => void (board.rotation.z = face.rotation.z = Math.sin(clock * 1.3 + spot.at.x) * 0.05) };
    }
    case 'seesaw': {
      // Pappa's seesaw: a stick across a stone. He stands on the low end.
      const plank = new Mesh(new BoxGeometry(4.4, 0.12, 0.7), solid('#c9ae84', 0.75));
      plank.position.set(1.3, 0.34, 0.6);
      plank.rotation.z = 0.14;
      group.add(plank, ball(0.3, solid('#8d8f8a', 0.95), 1.3, 0.12, 0.6, [1.2, 0.8, 1]));
      return { group, update: (used, _clock, dt) => { since = used ? since + dt : 0; plank.rotation.z = 0.14 - Math.min(1, since / 0.25) * 0.28; } };
    }
    case 'lollipop': {
      const stick = rod(0.025, 0.9, solid('#fff6e0', 0.6));
      stick.position.y = 0.45;
      group.add(stick, ball(0.22, solid('#ffd98a', 0.3, { emissive: '#ffb23c', emissiveIntensity: 0.9 }), 0, 1, 0));
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
        update(used, clock, dt) {
          since = used ? since + dt : 0;
          const ring = used && since < 0.9 ? Math.sin(since * 40) * 0.06 * (1 - since / 0.9) : 0;
          drop.position.set(ring, Math.sin(clock * 1.7 + spot.at.x) * 0.015, 0);
          (drop.material as MeshStandardMaterial).emissiveIntensity = used ? 0.9 : 0.25 + 0.1 * Math.sin(clock * 3 + spot.at.x);
        },
      };
    }
    case 'cobble': {
      const stone = ball(0.3, solid('#9c9d98', 0.6), 0, 0.14, 0, [1.15, 0.7, 1]);
      group.add(stone);
      group.position.z = -0.45;
      return {
        group,
        update(used, _clock, dt) {
          // Touched, it rings: a small jump, once.
          since = used ? since + dt : 0;
          stone.position.y = 0.14 + (used && since < 0.4 ? Math.sin((since / 0.4) * Math.PI) * 0.18 : 0);
        },
      };
    }
    case 'bag': {
      // The Saturday bag, striped paper with a folded top.
      const paper = solid('#efe2c4', 0.9);
      const body = new Mesh(new CylinderGeometry(0.2, 0.26, 0.5, 4), paper);
      body.rotation.y = Math.PI / 4;
      body.position.y = 0.25;
      const fold = new Mesh(new BoxGeometry(0.34, 0.1, 0.06), solid('#d9c8a2', 0.9));
      fold.position.y = 0.53;
      group.add(body, fold);
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
          thing.position.y = used ? gone * 0.5 : Math.sin(clock * 2 + spot.at.x) * 0.02;
        },
      };
    }
    case 'gold': {
      // The golden geléhallon: a raspberry of golden beads.
      const gold = solid('#ffcf3a', 0.25, { emissive: '#d99a00', emissiveIntensity: 0.7 });
      const sweet = new Group();
      for (let i = 0; i < 9; i++) sweet.add(ball(0.07, gold, Math.cos(i * 2.4) * 0.09 * (1 - i / 14), 0.05 + i * 0.022, Math.sin(i * 2.4) * 0.09 * (1 - i / 14)));
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

/**
 * The helper (plan §4.6): a bird that comes when he asks. It flies to the thing and looks at it; asked
 * again it knocks on it; asked a third time, a pale figure shows where to stand and do it. It has no words.
 * It is in the scene from the start, at no size, so nothing is compiled when it first comes.
 */
export function helperProp() {
  const group = new Group();
  const flyer = bird();
  flyer.scale.setScalar(0);
  // Where to stand: a pale figure the size of Elof, that fades in and out.
  const pale = new MeshStandardMaterial({ color: '#fff6dc', roughness: 1, transparent: true, opacity: 0, depthWrite: false, emissive: '#fff0c0', emissiveIntensity: 0.6 });
  const figure = new Group();
  const body = new Mesh(new CylinderGeometry(0.16, 0.2, 0.6, 12), pale);
  body.position.y = 0.34;
  figure.add(body, ball(0.17, pale, 0, 0.8, 0));
  group.add(flyer, figure);
  let shown = 0;
  let last = { x: 0, y: 0 };
  function update(step: number, at: { x: number; y: number } | null, x: number, y: number, standY: number, clock: number, dt: number): void {
    const here = step > 0 && at !== null;
    if (at) last = at;
    // It comes from where he is, and leaves upwards.
    if (here && shown === 0) flyer.position.set(x - 0.6, y + 1.4, 0.4);
    shown = Math.min(1, Math.max(0, shown + (here ? dt : -dt) / 0.4));
    const knock = step >= 2 ? Math.max(0, Math.sin(clock * 16)) * (Math.sin(clock * 3.2) > 0 ? 0.16 : 0) : 0;
    const to = here ? { x: last.x - 0.45 + knock, y: last.y + 0.25 + Math.sin(clock * 5) * 0.04, z: 0.45 } : { x: flyer.position.x, y: flyer.position.y + dt * 4, z: 0.45 };
    const k = 1 - Math.exp(-5 * dt);
    flyer.position.set(flyer.position.x + (to.x - flyer.position.x) * k, flyer.position.y + (to.y - flyer.position.y) * k, to.z);
    flyer.scale.setScalar(shown * 0.9);
    const beat = Math.sin(clock * 22) * 0.9;
    flyer.getObjectByName('wingNear')!.rotation.x = -beat;
    flyer.getObjectByName('wingFar')!.rotation.x = beat;
    figure.position.set(last.x - 0.75, Math.min(last.y, standY), -0.15);
    pale.opacity = step >= 3 ? 0.3 + 0.25 * Math.sin(clock * 5) : 0;
  }
  return { group, update };
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
      group.add(bowl, peak);
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
