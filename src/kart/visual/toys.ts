import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createBatch, canvasTexture } from '../ported/kit.js';
import type { KartDriver, RacerId } from '../race';
import { randomFrom } from './forest';

export function toyMaterial() {
  const random = randomFrom(930);
  const map = canvasTexture(128, 128, (c, w, h) => {
    c.fillStyle = '#fff4df'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 38; i++) {
      c.strokeStyle = i % 4 ? '#e5d4b9' : '#cfb99b'; c.lineWidth = i % 4 ? .7 : 1.1;
      const y = random() * h; c.beginPath(); c.moveTo(-4, y);
      c.bezierCurveTo(32, y - 2 + random() * 6, 76, y + random() * 6, 132, y); c.stroke();
    }
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshStandardMaterial({map, vertexColors: true, roughness: .52, metalness: .035});
}

/** Four original carved toy racers. Their jointed hands stay on the turning steering wheel. */
export function toyKart(id: RacerId, colour: number, material: THREE.MeshStandardMaterial) {
  const root = new THREE.Group(); root.name = `toy-kart:${id}`;
  const body = new THREE.Group(); root.add(body);
  const rounded = new RoundedBoxGeometry(1, 1, 1, 1, .12);
  const sphere = new THREE.SphereGeometry(1, 16, 10), cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
  const batch = createBatch();
  const add = (geometry: THREE.BufferGeometry, at: number[], size: number[], color: number, rotation = [0, 0, 0]) => batch.add(geometry, material, at, rotation, size, color);
  add(rounded, [0, .37, 0], [1.12, .19, 2.22], 0xb58a52);
  add(rounded, [0, .48, 1.07], [1.34, .34, .61], colour);
  add(rounded, [0, .38, -1.15], [2.02, .21, .24], colour);
  for (const side of [-1, 1]) {
    add(rounded, [side * .72, .47, -.02], [.34, .30, 1.04], colour);
    add(rounded, [side * .48, .48, -.43], [.12, .26, .65], 0x796047);
    add(rounded, [side * .19, .58, .34], [.20, .14, .45], 0x795039, [0, side * .10, 0]);
  }
  add(rounded, [0, .72, -.63], [.75, .67, .20], 0x7e5239, [-.15, 0, 0]);
  add(cylinder, [0, .33, -.77], [.06, 1.9, .06], 0x5c5144, [0, 0, Math.PI / 2]);
  add(cylinder, [0, .33, .72], [.05, 1.75, .05], 0x5c5144, [0, 0, Math.PI / 2]);
  // A wooden star on the nose, with no number, logo or family reference.
  for (let i = 0; i < 5; i++) add(rounded, [Math.sin(i * Math.PI * .4) * .07, .665, 1.07 + Math.cos(i * Math.PI * .4) * .07], [.05, .025, .22], 0xffe7a0, [0, i * Math.PI * .4, 0]);
  batch.build(body, {name: 'carved-kart'});

  const wheels: THREE.Mesh[] = [], front: THREE.Group[] = [];
  const wheelMaterial = new THREE.MeshStandardMaterial({vertexColors: true, roughness: .64, metalness: .14});
  const tyre = new THREE.LatheGeometry([
    new THREE.Vector2(.18, -.16), new THREE.Vector2(.27, -.16), new THREE.Vector2(.31, -.12),
    new THREE.Vector2(.32, -.05), new THREE.Vector2(.32, .05), new THREE.Vector2(.31, .12),
    new THREE.Vector2(.27, .16), new THREE.Vector2(.18, .16),
  ], 18).rotateZ(Math.PI / 2);
  const wheelBatch = createBatch(), wheelRoot = new THREE.Group();
  wheelBatch.add(tyre, wheelMaterial, [0, 0, 0], [0, 0, 0], 1, 0x252d2e);
  wheelBatch.add(cylinder, wheelMaterial, [0, 0, 0], [0, 0, Math.PI / 2], [.20, .325, .20], 0xb3babc);
  for (const side of [-1, 1]) for (let i = 0; i < 5; i++) {
    const angle = i * Math.PI * .4;
    wheelBatch.add(rounded, wheelMaterial, [side * .17, Math.sin(angle) * .10, Math.cos(angle) * .10], [angle, 0, 0], [.02, .045, .26], colour);
  }
  wheelBatch.build(wheelRoot, {name: 'toy-wheel'});
  const wheelSource = wheelRoot.children[0] as THREE.Mesh;
  for (const side of [-1, 1]) for (const z of [-.77, .72]) {
    const pivot = new THREE.Group(); pivot.position.set(side * (z > 0 ? .84 : .9), .32, z); root.add(pivot);
    const wheel = new THREE.Mesh(wheelSource.geometry, wheelMaterial); wheel.castShadow = true; pivot.add(wheel); wheels.push(wheel);
    if (z > 0) front.push(pivot);
  }
  tyre.dispose();

  const puppet = new THREE.Group(); puppet.position.set(0, .68, -.34); body.add(puppet);
  const person = createBatch();
  const wood = id === 'fox' ? 0xc48242 : id === 'owl' ? 0xb39e76 : id === 'hare' ? 0xd5c7a2 : 0xd8ad70;
  person.add(sphere, material, [0, .28, 0], [0, 0, 0], [.30, .38, .25], colour);
  person.add(cylinder, material, [0, .65, 0], [0, 0, 0], [.11, .19, .11], wood);
  person.add(sphere, material, [0, .89, .035], [0, 0, 0], id === 'owl' ? [.35, .36, .30] : [.29, .32, .27], wood);
  const headFront = .29;
  if (id === 'fox') {
    for (const side of [-1, 1]) {
      person.add(new THREE.ConeGeometry(1, 1, 4), material, [side * .19, 1.19, 0], [0, Math.PI / 4, side * -.16], [.115, .32, .10], 0x99552f);
      person.add(sphere, material, [side * .085, .80, .28], [0, 0, 0], [.13, .10, .14], 0xf4d7a4);
    }
  } else if (id === 'hare') {
    for (const side of [-1, 1]) {
      person.add(sphere, material, [side * .15, 1.26, 0], [0, 0, side * -.18], [.09, .32, .07], wood);
      person.add(sphere, material, [side * .15, 1.27, .05], [0, 0, side * -.18], [.045, .22, .025], 0xbe8d82);
    }
    person.add(sphere, material, [0, .79, .28], [0, 0, 0], [.16, .10, .10], 0xf1e0bf);
  } else if (id === 'owl') {
    for (const side of [-1, 1]) person.add(sphere, material, [side * .14, .92, headFront - .02], [0, 0, 0], [.16, .17, .055], 0xf6dfaa);
  } else {
    person.add(cylinder, material, [0, 1.17, 0], [0, 0, 0], [.25, .11, .25], 0xf7c55d);
    for (let i = 0; i < 5; i++) person.add(new THREE.ConeGeometry(1, 1, 4), material,
      [Math.sin(i * Math.PI * .4) * .19, 1.28, Math.cos(i * Math.PI * .4) * .19], [0, Math.PI / 4, 0], [.09, .2, .09], 0xf7d575);
  }
  for (const side of [-1, 1]) {
    person.add(sphere, material, [side * .12, .94, headFront + .026], [0, 0, 0], [.038, .048, .022], 0x393b32);
    person.add(sphere, material, [side * .12 + .008, .955, headFront + .045], [0, 0, 0], [.011, .012, .008], 0xfff1d6);
  }
  person.add(sphere, material, [0, .82, id === 'fox' ? .405 : .34], [0, 0, 0], [.045, .036, .04], id === 'owl' ? 0xd9a244 : 0x594632);
  person.build(puppet, {name: `woodland-driver:${id}`});

  const steering = new THREE.Group(); steering.position.set(0, 1.02, .36); steering.rotation.x = -.45; body.add(steering);
  const rim = new THREE.TorusGeometry(.22, .025, 7, 22), steerBatch = createBatch();
  steerBatch.add(rim, material, [0, 0, 0], [0, 0, 0], 1, 0x68523b);
  for (const side of [-1, 1]) {
    steerBatch.add(rounded, material, [side * .1, 0, 0], [0, 0, 0], [.20, .028, .03], 0xbd9b63);
    steerBatch.add(sphere, material, [side * .22, 0, .01], [0, 0, 0], [.065, .065, .065], wood);
  }
  steerBatch.build(steering, {name: 'held-steering-rim'}); rim.dispose();
  const arms = new THREE.InstancedMesh(new THREE.CylinderGeometry(.065, .07, 1, 9), material, 4);
  arms.name = 'jointed-wooden-arms'; body.add(arms);
  for (let i = 0; i < 4; i++) arms.setColorAt(i, new THREE.Color(wood));
  const dummy = new THREE.Object3D(), shoulder = new THREE.Vector3(), elbow = new THREE.Vector3(), hand = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0), delta = new THREE.Vector3();
  let rolling = 0;
  rounded.dispose(); sphere.dispose(); cylinder.dispose();
  return {root,
    update(driver: KartDriver, dt: number, time: number, calm: boolean) {
      rolling += driver.u * dt / .32;
      for (const wheel of wheels) wheel.rotation.x = rolling;
      for (const pivot of front) pivot.rotation.y = driver.steerAngle;
      steering.rotation.z = driver.steerAngle * 1.6;
      puppet.rotation.z = calm ? 0 : -THREE.MathUtils.clamp(driver.latAccel * .008, -.07, .07);
      puppet.rotation.x = calm ? 0 : THREE.MathUtils.clamp(driver.longAccel * .004, -.04, .04);
      body.position.y = calm ? 0 : Math.sin(time * 4 + driver.distance) * .008 * Math.min(1, driver.speed / 8);
      puppet.updateMatrix(); steering.updateMatrix();
      for (let side = 0; side < 2; side++) {
        const sign = side ? -1 : 1;
        shoulder.set(sign * .25, .45, 0).applyMatrix4(puppet.matrix);
        hand.set(sign * .22, 0, .01).applyMatrix4(steering.matrix);
        elbow.copy(shoulder).lerp(hand, .5); elbow.x += sign * .10; elbow.y -= .12;
        for (let joint = 0; joint < 2; joint++) {
          const a = joint ? elbow : shoulder, b = joint ? hand : elbow;
          delta.subVectors(b, a); dummy.position.copy(a).add(b).multiplyScalar(.5);
          dummy.quaternion.setFromUnitVectors(up, delta.clone().normalize()); dummy.scale.set(1, delta.length(), 1); dummy.updateMatrix();
          arms.setMatrixAt(side * 2 + joint, dummy.matrix);
        }
      }
      arms.instanceMatrix.needsUpdate = true;
      // Hand movement is small; a fixed local bound avoids per-frame bound rebuilding and stale culling.
      if (!arms.boundingSphere) arms.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, .05), .9);
    },
  };
}
