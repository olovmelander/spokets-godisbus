import {
  Bone, BoxGeometry, BufferGeometry, Color, CylinderGeometry, Float32BufferAttribute, Group, LatheGeometry, Mesh, MeshStandardMaterial,
  Quaternion, Skeleton, SkinnedMesh, SphereGeometry, TorusGeometry, Uint16BufferAttribute, Vector2, Vector3, type Object3D,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { lessMotion } from '../../platform/motion';
import { play, stand } from '../../render/gait';
import { CLIPS, STANDS } from '../../render/motion-data';
import { JOINTS, STANDING, createModelRig, heightOf, type Pose, type Rig } from '../../render/rig';
import { windAt } from '../../render/wind';

/**
 * Mormor and Morfar (docs/aventyr-2.md): plain figures, no likeness of anyone: grey hair and the story's two things,
 * a lantern and a ladder. They are built in code as a soft body on the bones a model from Blender has, so that
 * `createModelRig` poses them as it does the family, in one draw each, and they stand as tall as the family do.
 *
 * Warmth is timing. They are slower than the family, a little stooped, and their heads follow him from far off.
 * When he comes near they go down on one knee, to his height. Called, they do what the story says, and stay.
 */

export type Grandparent = 'mormor' | 'morfar';

/** How tall each stands, in EL: the family's adults are 5.2. */
export const HEIGHT: Record<Grandparent, number> = { mormor: 4.8, morfar: 5 };

const LOOK = {
  mormor: { coat: '#6c6880', legs: '#3e4150', boots: '#2f3a34', hem: 1.72 },
  morfar: { coat: '#3f5a4e', legs: '#454a4f', boots: '#2f2f2c', hem: 2.12 },
} as const;
const SKIN = '#dfb586';
const HAIR = '#cfccc4';
const SCARF = '#d9d2bf';
const CAP = '#4a4a46';
const DARK = '#2a2420';

// Where the joints stand at rest, in EL. The figure faces +z, and its own left is +x.
const HIP_Y = 2.45;
const SHOULDER = { x: 0.7, y: 1.4 };
const UPPER = 0.82;
const FORE = 0.78;
const THIGH = 1.15;
const SHIN = 1.15;
const HEAD_Y = 1.65;

const LADDER_LONG = 5;
/** Where the ladder's foot stands on the ditch's near rim, from Morfar's spot, and when it has come down. */
const LADDER_AT = { x: 1.2, z: 0.15 };
const LADDER_DOWN = 1.3;
/** How far it stands turned from the picture while it stands, so that its rungs show. */
const LADDER_TURN = 0.8;

const SIDES = 12;
const shade = new Color();

/** Rigid skinning: every corner of a part goes with one bone, so the parts must overlap at the joints. */
function part(geometry: BufferGeometry, bone: number, colour: string): BufferGeometry {
  const made = geometry.index ? geometry.toNonIndexed() : geometry;
  made.deleteAttribute('uv');
  shade.set(colour);
  const count = made.getAttribute('position').count;
  const colours = new Float32Array(count * 3);
  const index = new Uint16Array(count * 4);
  const weight = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    colours.set([shade.r, shade.g, shade.b], i * 3);
    index[i * 4] = bone;
    weight[i * 4] = 1;
  }
  made.setAttribute('color', new Float32BufferAttribute(colours, 3));
  made.setAttribute('skinIndex', new Uint16BufferAttribute(index, 4));
  made.setAttribute('skinWeight', new Float32BufferAttribute(weight, 4));
  return made;
}

/** A turned shape from its outline, low to high: radius and height. */
const turned = (outline: readonly (readonly [number, number])[]) => new LatheGeometry(outline.map(([r, y]) => new Vector2(r, y)), SIDES);

/** A limb from its top at the origin downwards, round at both ends. */
function limb(top: number, bottom: number, long: number): BufferGeometry {
  const outline: [number, number][] = [];
  for (let k = 0; k <= 4; k++) {
    const a = (k / 4) * (Math.PI / 2);
    outline.push([Math.max(0.001, Math.sin(a) * bottom), -long - Math.cos(a) * bottom * 0.7 + bottom * 0.7]);
  }
  for (let k = 4; k >= 0; k--) {
    const a = (k / 4) * (Math.PI / 2);
    outline.push([Math.max(0.001, Math.sin(a) * top), Math.cos(a) * top * 0.7]);
  }
  return turned(outline);
}

const blob = (rx: number, ry: number, rz: number) => new SphereGeometry(1, SIDES, 9).scale(rx, ry, rz);

/** A joint of the skeleton. A limb's bone lies along its own +y, as Blender's do: turned over, so that it hangs. */
function bone(name: string, parent: Object3D, x: number, y: number, z = 0, hangs = false): Bone {
  const made = new Bone();
  made.name = name;
  made.position.set(x, y, z);
  if (hangs) made.rotation.z = Math.PI;
  parent.add(made);
  return made;
}

function body(who: Grandparent): { model: Group; bones: Record<string, Bone> } {
  const look = LOOK[who];
  const mesh = new SkinnedMesh();
  const pelvis = bone('pelvis', mesh, 0, HIP_Y);
  const spine = bone('spine_01', pelvis, 0, 0);
  const head = bone('Head', spine, 0, HEAD_Y);
  const eyeL = bone('eye_l', head, 0.17, 0.5, 0.42);
  const eyeR = bone('eye_r', head, -0.17, 0.5, 0.42);
  const armL = bone('upperarm_l', spine, SHOULDER.x, SHOULDER.y, 0, true);
  const armR = bone('upperarm_r', spine, -SHOULDER.x, SHOULDER.y, 0, true);
  const foreL = bone('lowerarm_l', armL, 0, UPPER);
  const foreR = bone('lowerarm_r', armR, 0, UPPER);
  const handL = bone('hand_l', foreL, 0, FORE);
  const handR = bone('hand_r', foreR, 0, FORE);
  const thighL = bone('thigh_l', pelvis, 0.33, 0, 0, true);
  const thighR = bone('thigh_r', pelvis, -0.33, 0, 0, true);
  const calfL = bone('calf_l', thighL, 0, THIGH);
  const calfR = bone('calf_r', thighR, 0, THIGH);
  const footL = bone('foot_l', calfL, 0, SHIN);
  const footR = bone('foot_r', calfR, 0, SHIN);
  const list = [pelvis, spine, head, eyeL, eyeR, armL, armR, foreL, foreR, handL, handR, thighL, thighR, calfL, calfR, footL, footR];
  const at = (one: Bone) => list.indexOf(one);

  const top = HIP_Y + SHOULDER.y;
  const eyes = HIP_Y + HEAD_Y + 0.5;
  const parts: BufferGeometry[] = [
    // The coat: wide at its hem, in at the waist, round at the shoulders. Hers is long, his a work jacket.
    part(turned([[0.001, look.hem - 0.02], [0.74, look.hem], [0.68, HIP_Y - 0.1], [0.66, HIP_Y + 0.5], [0.74, top - 0.3], [0.78, top - 0.02], [0.62, top + 0.2], [0.26, top + 0.3], [0.001, top + 0.31]]).scale(1, 1, 0.76), at(spine), look.coat),
    // The neck, and a scarf or a collar round it.
    part(new CylinderGeometry(0.2, 0.24, 0.4, SIDES).translate(0, top + 0.38, 0), at(spine), SKIN),
    part(new TorusGeometry(0.28, 0.13, 8, SIDES).rotateX(Math.PI / 2).translate(0, top + 0.27, 0), at(spine), who === 'mormor' ? SCARF : look.coat),
    // The head: big and round, its ears, its nose and two dark eyes with a smile under them.
    part(blob(0.5, 0.54, 0.48).translate(0, eyes - 0.04, 0), at(head), SKIN),
    part(blob(0.09, 0.13, 0.07).translate(0.49, eyes - 0.06, 0), at(head), SKIN),
    part(blob(0.09, 0.13, 0.07).translate(-0.49, eyes - 0.06, 0), at(head), SKIN),
    part(blob(0.09, 0.08, 0.1).translate(0, eyes - 0.1, 0.47), at(head), '#d8a878'),
    part(blob(0.055, 0.07, 0.03).translate(0.17, eyes, 0.45), at(eyeL), DARK),
    part(blob(0.055, 0.07, 0.03).translate(-0.17, eyes, 0.45), at(eyeR), DARK),
    part(new TorusGeometry(0.13, 0.016, 6, 10, Math.PI).rotateZ(Math.PI).translate(0, eyes - 0.2, 0.455), at(head), '#8a5a4a'),
    // The arms and the big hands.
    ...([[armL, foreL, handL, 1], [armR, foreR, handR, -1]] as const).flatMap(([upper, fore, hand, side]) => [
      part(limb(0.23, 0.2, UPPER).translate(side * SHOULDER.x, top, 0), at(upper), look.coat),
      part(limb(0.2, 0.17, FORE).translate(side * SHOULDER.x, top - UPPER, 0), at(fore), look.coat),
      part(blob(0.19, 0.23, 0.16).translate(side * SHOULDER.x, top - UPPER - FORE - 0.12, 0), at(hand), SKIN),
    ]),
    // The legs, and rubber boots to below the knee: it has rained all night.
    ...([[thighL, calfL, footL, 1], [thighR, calfR, footR, -1]] as const).flatMap(([thigh, calf, foot, side]) => [
      part(limb(0.32, 0.25, THIGH).translate(side * 0.33, HIP_Y, 0), at(thigh), look.legs),
      part(limb(0.26, 0.2, SHIN).translate(side * 0.33, HIP_Y - THIGH, 0), at(calf), look.boots),
      part(blob(0.26, 0.17, 0.42).translate(side * 0.33, 0.17, 0.12), at(foot), look.boots),
    ]),
  ];
  if (who === 'mormor') {
    // Grey hair, drawn back to a bun.
    parts.push(part(blob(0.53, 0.5, 0.5).translate(0, eyes + 0.14, -0.08), at(head), HAIR));
    parts.push(part(blob(0.24, 0.22, 0.22).translate(0, eyes + 0.42, -0.42), at(head), HAIR));
  } else {
    // Grey hair at the sides, under a plain cap with a short peak.
    parts.push(part(blob(0.53, 0.3, 0.5).translate(0, eyes - 0.02, -0.1), at(head), HAIR));
    parts.push(part(blob(0.54, 0.26, 0.52).translate(0, eyes + 0.26, 0), at(head), CAP));
    parts.push(part(blob(0.36, 0.05, 0.28).translate(0, eyes + 0.2, 0.48), at(head), CAP));
  }

  mesh.geometry = mergeGeometries(parts);
  mesh.material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.82 });
  mesh.name = `grandparent:${who}`;
  mesh.frustumCulled = false;
  mesh.updateMatrixWorld(true);
  mesh.bind(new Skeleton(list));
  const model = new Group();
  model.add(mesh);
  return { model, bones: { head, eyeL, eyeR, handR, handL } };
}

/** Morfar's long ladder, upright from its foot: two rails and its rungs, one shape. */
function ladder(): Mesh {
  const wood = (geometry: BufferGeometry) => { const made = geometry.toNonIndexed(); made.deleteAttribute('uv'); return made; };
  const parts = [-0.34, 0.34].map((z) => wood(new BoxGeometry(0.14, LADDER_LONG, 0.12).translate(0, LADDER_LONG / 2, z)));
  for (let y = 0.4; y < LADDER_LONG; y += 0.5) parts.push(wood(new CylinderGeometry(0.05, 0.05, 0.7, 6).rotateX(Math.PI / 2).translate(0, y, 0)));
  const mesh = new Mesh(mergeGeometries(parts), new MeshStandardMaterial({ color: '#8f7f68', roughness: 0.85 }));
  mesh.name = 'morfar-ladder';
  return mesh;
}

const smooth = (t: number) => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k); };
const clamp = (v: number, low: number, high: number) => Math.min(high, Math.max(low, v));

/** The ladder coming down: slowly at first, then falling, with two small bounces where it lands. */
export function ladderAngle(since: number): number {
  if (since <= 0) return 0;
  const k = Math.min(1, since / LADDER_DOWN);
  const down = (Math.PI / 2) * k * k;
  const after = since - LADDER_DOWN;
  return after <= 0 ? down : Math.PI / 2 - Math.abs(Math.sin(after * 11)) * 0.06 * Math.exp(-after * 5);
}

export interface Figure {
  group: Group;
  rig: Rig;
  ladder: Mesh | null;
  /** Takes the model from Blender in place of the figure built in code: it is the family's own hand. */
  dress(model: Object3D): void;
  /** `used`: he has called them. `elof`: where he is. `laid`: the ledge lies over the ditch now, and takes the ladder's place. */
  update(used: boolean, clock: number, dt: number, elof: number, laid?: boolean): void;
}

/**
 * One of them, placed by its spot. `lantern` hangs from Mormor's hand, and swings as her hand moves. `decor`: they
 * stand in the picture of a scene and nobody calls them, so they don't kneel to him.
 */
export function createGrandparent(who: Grandparent, lantern: Object3D | null, decor = false): Figure {
  const { model, bones } = body(who);
  let rig = createModelRig(model, HEIGHT[who]);
  const group = new Group();
  group.name = `figure:${who}`;
  group.userData.grandparent = who;
  rig.group.position.z = -1.9;
  group.add(rig.group);
  const carried = who === 'morfar' && !decor ? ladder() : null;
  if (carried) {
    carried.position.set(LADDER_AT.x, 0, LADDER_AT.z);
    group.add(carried);
  }

  // The lantern hangs under her hand from its own hinge, which keeps it upright whatever her arm does.
  const hinge = new Group();
  if (lantern) {
    hinge.add(lantern);
    bones.handR!.add(hinge);
    hinge.position.y = 0.3;
  }
  let hand: Object3D = bones.handR!;

  const pose: Pose = { ...STANDING }, wanted: Pose = { ...STANDING }, kneeling: Pose = { ...STANDING };
  const phase = who === 'mormor' ? 0.7 : 2.1;
  /** Going down on a knee, keyed in Blender (art/blender/motion.py): how far through it they are, 0 standing to 1 down. */
  const clip = CLIPS.kneelElder;
  const was = new Vector3(), now = new Vector3(), rail = new Vector3(), up = new Quaternion(), tilt = new Quaternion(), Z = new Vector3(0, 0, 1);
  let since = 0, kneel = 0, facing = 0, gaze = 0, nextBlink = 2 + phase, swing = 0, swingSpeed = 0, first = true;

  return {
    group,
    get rig() { return rig; },
    ladder: carried,
    dress(dressed) {
      // Drawn as big as the family are, whom the models are measured with.
      dressed.scale.setScalar(3);
      group.remove(rig.group);
      rig = createModelRig(dressed, heightOf('mamma'));
      rig.group.position.z = -1.9;
      group.add(rig.group);
      hand = dressed.getObjectByName('hand_r') ?? hand;
      if (lantern) {
        hand.add(hinge);
        group.updateWorldMatrix(true, true);
        const size = hand.getWorldScale(new Vector3()).x;
        hinge.scale.setScalar(1 / size);
        hinge.position.y = 0.3 / size;
      }
      delete (bones as Partial<typeof bones>).eyeL;
      delete (bones as Partial<typeof bones>).eyeR;
    },
    update(used, clock, dt, elof, laid = false) {
      const still = lessMotion();
      since = used ? since + dt : 0;
      group.getWorldPosition(now);
      const off = elof - now.x;
      const close = !decor && !used && Math.abs(off) < 5.5;
      // Down at their own pace, and up again the same way back; without motion they are simply there.
      kneel = still ? (close ? 1 : 0) : Math.min(1, Math.max(0, kneel + (close ? 1 : -1) * dt / clip.seconds));

      // Standing, as they stand (./motion-data.ts STANDS): a little stooped, slow and steady, breathing.
      stand(wanted, clock + phase * 3, STANDS[who], rig.legs, still);
      if (who === 'mormor') {
        // She holds her lantern out low, and lifts it to her shoulder when she's called, to light his way: higher, and
        // facing us as she does, it hid her face.
        const raised = smooth(since / 0.8);
        wanted.armR = 0.55 + raised * 0.8;
        wanted.elbowR = 0.9 - raised * 0.2;
      } else if (used) {
        // He lets the ladder down with both hands, and then shows him the way over.
        const shows = smooth((since - LADDER_DOWN - 0.3) / 0.5);
        const lets = smooth(since / 0.5) * (1 - shows);
        wanted.armL = 1.4 * lets + 1.55 * shows;
        wanted.elbowL = 0.3 * lets + 0.1 * shows;
        wanted.armR = 1.2 * lets + 0.02 * shows;
        wanted.elbowR = 0.3 * lets + 0.1 * shows;
      }
      // Kneeling: the clip from where they stand, taking over as they start down.
      Object.assign(pose, wanted);
      if (kneel > 0) {
        play(clip, kneel * clip.seconds, Object.assign(kneeling, wanted));
        const k = smooth(kneel / 0.2);
        for (const joint of JOINTS) pose[joint] = wanted[joint] + (kneeling[joint] - wanted[joint]) * k;
        pose.bounce = 0;
      }
      if (who === 'mormor' && used) pose.armR = wanted.armR;

      // Head first, and the body after it: slowly, and only so far.
      const lookAt = Math.abs(off) < 18 ? clamp(off * 0.2, -1, 1) : 0;
      const wish = (who === 'morfar' && used && since > LADDER_DOWN ? 0.9 : lookAt) * 0.55;
      facing += (wish - facing) * Math.min(1, dt * 1.6);
      gaze += (lookAt - facing - gaze) * Math.min(1, dt * 4);
      rig.group.rotation.y = facing;
      pose.turn = clamp(gaze, -0.7, 0.7);
      rig.pose(pose);
      rig.breeze?.(windAt(now.x), dt, still);
      if (carried) {
        // His hand stays on the rail until he has let it go.
        const holds = 1 - smooth((since - LADDER_DOWN * 0.45) / 0.25);
        if (holds > 0 && kneel < 0.5) {
          group.updateWorldMatrix(true, true);
          rig.reach(0, carried.localToWorld(rail.set(0, 2.7, 0)), holds * (1 - kneel * 2));
        }
      }

      // A slow blink now and then.
      const blink = !still && clock > nextBlink;
      const lids = blink ? 0.12 : 1;
      if (bones.eyeL && bones.eyeR) bones.eyeL.scale.y = bones.eyeR.scale.y = lids;
      if (clock > nextBlink + 0.16) nextBlink = clock + 3 + ((clock * 7.3) % 3);

      if (carried) {
        const angle = ladderAngle(since);
        carried.rotation.set(0, LADDER_TURN * (1 - Math.min(1, angle / (Math.PI / 2))), -angle);
        carried.visible = !laid;
      }

      if (lantern) {
        // A pendulum on the hand: it lags behind what the hand does, and settles.
        hand.getWorldPosition(now);
        const moved = first || dt <= 0 ? 0 : (now.x - was.x) / dt;
        was.copy(now);
        first = false;
        swingSpeed += (-moved * 0.9 - 26 * swing - 2.6 * swingSpeed) * Math.min(dt, 1 / 30);
        swing += swingSpeed * Math.min(dt, 1 / 30);
        hinge.parent!.getWorldQuaternion(up).invert();
        hinge.quaternion.copy(up).multiply(tilt.setFromAxisAngle(Z, still ? 0 : swing));
      }
    },
  };
}
