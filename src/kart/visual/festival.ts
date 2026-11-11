import * as THREE from 'three';
import { createBatch } from '../ported/kit.js';
import type { Route } from '../ported/route.js';
import type { KartState } from '../race';

/** Wooden start gate and soft candy-coloured pennants. No sponsor boards or lettering. */
export function festival(route: Route, root: THREE.Group) {
  const batch = createBatch(), material = new THREE.MeshStandardMaterial({vertexColors: true, roughness: .72});
  const cube = new THREE.BoxGeometry(1, 1, 1), cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
  const start = route.sample(1), matrix = new THREE.Matrix4().makeRotationY(start.angle); matrix.setPosition(start.position);
  for (const side of [-1, 1]) {
    batch.add(cylinder, material, [side * 4.65, 2.5, 0], [0, 0, side * -.035], [.15, 5, .15], 0xb48856, matrix);
    batch.add(cube, material, [side * 4.65, .35, 0], [0, 0, 0], [.55, .7, .55], 0x795d41, matrix);
  }
  batch.add(cube, material, [0, 4.85, 0], [0, 0, 0], [9.7, .24, .28], 0xb89562, matrix);
  const flag = new THREE.BufferGeometry();
  flag.setAttribute('position', new THREE.Float32BufferAttribute([-.30, 0, 0, .30, 0, 0, 0, -.65, 0], 3));
  flag.setIndex([0, 1, 2, 2, 1, 0]); flag.computeVertexNormals();
  const colors = [0xd98271, 0xf0ca72, 0x89b9b1, 0xb39fc8];
  for (let i = 0; i < 12; i++) batch.add(flag, material, [-4.25 + i * .77, 4.66 - Math.sin(i / 11 * Math.PI) * .32, .03], [0, 0, (i % 3 - 1) * .08], 1, colors[i % 4]!, matrix);
  // Round sweet medallion at the gate, using shape rather than words.
  batch.add(new THREE.SphereGeometry(1, 16, 10), material, [0, 4.9, .18], [0, 0, 0], [.38, .28, .12], 0xf7d578, matrix);
  batch.build(root, {castShadow: false, name: 'wooden-finish-gate'}); cube.dispose(); cylinder.dispose(); flag.dispose();
}

export function raceMagic(route: Route, root: THREE.Group, low: boolean) {
  const batch = createBatch(), group = new THREE.Group();
  const candyMaterial = new THREE.MeshStandardMaterial({vertexColors: true, roughness: .34, metalness: .10});
  const body = new THREE.SphereGeometry(1, 16, 10), wrap = new THREE.ConeGeometry(1, 1, 7);
  batch.add(body, candyMaterial, [0, 0, 0], [0, 0, .2], [.38, .25, .24], 0xffd16b);
  for (const side of [-1, 1]) batch.add(wrap, candyMaterial, [side * .45, 0, 0], [0, 0, side * Math.PI / 2], [.23, .28, .17], 0xf5b56a);
  batch.add(body, candyMaterial, [0, .17, .12], [0, 0, .2], [.27, .045, .10], 0xffefd1);
  batch.build(group, {castShadow: false, name: 'golden-sweet'}); body.dispose(); wrap.dispose();
  const source = group.children[0] as THREE.Mesh;
  group.visible = false; root.add(group); // Own the shared pickup resources even before the first frame.
  const sweets: THREE.Mesh[] = [];
  const glow = new THREE.MeshBasicMaterial({color: 0xf6d38a, transparent: true, opacity: .17, depthWrite: false});
  const rings: THREE.Mesh[] = [], ring = new THREE.RingGeometry(.47, .63, 24).rotateX(-Math.PI / 2);
  const count = low ? 64 : 100;
  const sparks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.065, 0), new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: .84, depthWrite: false}), count);
  sparks.name = 'gentle-drift-and-boost-sparks'; root.add(sparks);
  const points = Array.from({length: count}, () => ({position: new THREE.Vector3(), velocity: new THREE.Vector3(), life: 0, duration: 1}));
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  let next = 0, emission = 0, lastPickup = 0;
  const emit = (position: THREE.Vector3, velocity: THREE.Vector3, tint: number, duration: number) => {
    const i = next++ % count, p = points[i]!; p.position.copy(position); p.velocity.copy(velocity); p.life = p.duration = duration;
    sparks.setColorAt(i, color.set(tint));
  };
  return {
    update(state: KartState, dt: number, time: number, calm: boolean) {
      for (let i = 0; i < state.pickups.length; i++) {
        const pickup = state.pickups[i]!;
        if (!sweets[i]) {sweets[i] = new THREE.Mesh(source.geometry, candyMaterial); root.add(sweets[i]!); rings[i] = new THREE.Mesh(ring, glow); root.add(rings[i]!);}
        const point = route.sample(pickup.distance, pickup.lane).position, sweet = sweets[i]!, halo = rings[i]!;
        sweet.visible = halo.visible = pickup.active;
        sweet.position.copy(point); sweet.position.y += .92 + (calm ? 0 : Math.sin(time * 1.8 + i) * .11);
        sweet.rotation.set(.12, calm ? .35 : time * .55 + i, .12);
        halo.position.copy(point); halo.position.y += .075;
      }
      const player = state.player, road = route.sample(player.distance, player.lane), yaw = road.angle + player.heading;
      const tint = player.boostKind === 'blue' || player.driftTier === 'blue' ? 0x8fe0ee : 0xffd78d;
      if (!calm && dt > 0 && (player.drifting || player.boostTime > 0)) {
        emission += dt * (player.boostTime > 0 ? 36 : 24);
        while (emission >= 1) {
          emission--;
          const side = next % 2 ? -1 : 1, spread = side * .82, behind = -1.12;
          const p = road.position.clone().add(new THREE.Vector3(spread * Math.cos(yaw) + behind * Math.sin(yaw), .26, -spread * Math.sin(yaw) + behind * Math.cos(yaw)));
          emit(p, new THREE.Vector3(-Math.sin(yaw) * 1.8 + side * .3, .35 + (next % 3) * .12, -Math.cos(yaw) * 1.8), tint, .45 + next % 4 * .04);
        }
      }
      if (!calm && state.events.pickup > lastPickup) for (let i = 0; i < 12; i++) {
        const angle = i / 12 * Math.PI * 2;
        emit(road.position.clone().add(new THREE.Vector3(0, 1, 0)), new THREE.Vector3(Math.sin(angle) * 1.3, 1, Math.cos(angle) * 1.3), 0xffe6a2, .65);
      }
      lastPickup = state.events.pickup;
      for (let i = 0; i < count; i++) {
        const p = points[i]!; p.life = Math.max(0, p.life - dt);
        p.position.addScaledVector(p.velocity, dt); p.velocity.y -= dt * .8;
        dummy.position.copy(p.position); dummy.rotation.set(time + i, i, time * .6);
        dummy.scale.setScalar(p.life > 0 && !calm ? Math.sin(p.life / p.duration * Math.PI) * 1.2 : 0); dummy.updateMatrix(); sparks.setMatrixAt(i, dummy.matrix);
      }
      sparks.instanceMatrix.needsUpdate = true; if (sparks.instanceColor) sparks.instanceColor.needsUpdate = true;
      sparks.computeBoundingSphere();
    },
    reset() {for (const p of points) p.life = 0; lastPickup = emission = next = 0;},
  };
}
