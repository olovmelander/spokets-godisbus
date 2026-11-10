import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Object3D, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { barkDetail } from './bark-detail';
import { kneeling } from './acting';
import { STANDING, type Legs, type Pose } from './rig';

/** Mamma takes the same log as Elof, then the low steps behind the boardwalk edge. */
export function mammaPathY(x: number): number {
  return Math.max(0, Math.min(2.35, (x - 97.2) * .47));
}

export function mammaPathZ(x: number): number {
  if (x < 85.7) return -.4 + .4 * Math.max(0, (x - 85.2) / .5);
  if (x <= 94.3) return 0;
  return -1.35 * Math.min(1, (x - 94.3) / 2.9);
}

export function mammaSteps(): Group {
  const group = new Group();
  group.name = 'mamma-boardwalk-steps';
  const timber = new MeshStandardMaterial({ color: '#a08b69', roughness: .94 }); barkDetail(timber);
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const height = (i + 1) * (2.35 / 7), x = 97.55 + i * .72;
    parts.push(new BoxGeometry(.75, .14, 1.5).translate(x, height - .07, -1.35));
    for (const z of [-1.85, -.85]) parts.push(new BoxGeometry(.14, height - .14, .14).translate(x, (height - .14) / 2, z));
  }
  group.add(new Mesh(mergeGeometries(parts), timber));
  for (const part of parts) part.dispose();
  return group;
}

/** The long plait continues the model's own plait at its tip, so there is only one braid. */
export function braidTip(model: Object3D): Object3D | undefined {
  // The shoulder braid's lower section is skinned to the chest in the approved model.
  const head = model.getObjectByName('spine_02') ?? model.getObjectByName('Head') ?? model.getObjectByName('head');
  if (!head) return;
  model.updateWorldMatrix(true, true);
  const tip = new Object3D();
  tip.name = 'mamma-braid-tip';
  // The approved model's plait ends at this point in its exported, metre-sized coordinates, inside the last tuft of the plait.
  tip.position.copy(model.localToWorld(new Vector3(-.066, .692, .111)));
  head.attach(tip);
  return tip;
}

/** She holds the near end, then eases it down during the last part of laying the log. */
export function pineTilt(y: number): number {
  const t = Math.max(0, Math.min(1, ((y + 1.5) / 1.1 - .7) / .3));
  const near = .45 - .65 * t * t * (3 - 2 * t);
  return Math.asin(Math.max(-.6, Math.min(.6, (y + .2 - near) / 4.2)));
}

/** A measured low kneel brings her palms onto the trunk without stretching her arms. */
export function mammaLogPose(pose: Pose, legs: Legs, weight: number): void {
  const low = kneeling({ ...STANDING }, legs, 'mamma'); low.lean = 1.6;
  for (const key of ['lean', 'legL', 'legR', 'kneeL', 'kneeR', 'footL', 'footR', 'splayL', 'splayR', 'sway', 'hipRoll'] as const) {
    pose[key] += (low[key] - pose[key]) * weight;
  }
}
