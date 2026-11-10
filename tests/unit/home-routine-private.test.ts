import { existsSync, readFileSync } from 'node:fs';
import { Group, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { expect, it } from 'vitest';
import { epilog } from '../../src/content/chapters/ends';
import { actPose } from '../../src/render/acting';
import { BATHROOM, createHomeRoutine } from '../../src/render/home-routine';
import { createModelRig, STANDING } from '../../src/render/rig';

// Local check with the attached family export; the public CI checkout skips this private-asset case.
const file = new URL('../../art/private/baked/private/elof.glb', import.meta.url);
it.skipIf(!existsSync(file))('keeps the private toothbrush head at Elof’s lips and its handle in his fingers', async () => {
  const data = readFileSync(file), gltf = await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), '');
  gltf.scene.rotation.y = Math.PI / 2;
  const rig = createModelRig(gltf.scene, 1), root = new Group(); root.add(rig.group);
  root.scale.setScalar(3); root.rotation.y = -.42 * Math.PI * 2; root.position.set(BATHROOM.x, 0, BATHROOM.feetZ);
  rig.pose(actPose('eat', { t: .7, aim: null, stride: 0, pace: 0, calm: false, clock: 5 }, { ...STANDING }));
  const home = createHomeRoutine(epilog); home.update(new Set(['teeth']), { id: 'bathroom', seconds: 5 }, 5); home.updateElof(rig);
  const brush = home.group.getObjectByName('elof-toothbrush')!, mouth = rig.mouth(new Vector3());
  const head = brush.localToWorld(new Vector3(0, .17, 0)), handle = brush.getWorldPosition(new Vector3());
  const socket = rig.socket!(1, { kind: 'power', size: .04 }, new Vector3());
  expect(handle.distanceTo(socket)).toBeLessThan(.01);
  expect(head.distanceTo(mouth)).toBeLessThan(.1);
});
