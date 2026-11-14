/** Everything in Godisracet that moves or sparkles and is not a kart: the item bags and sweets on the road,
 * pine cones, bumblebees and gum, rain clouds, and one pool of soft particles for sparks, flames, dust,
 * splashes, confetti and each place's own drifting air (fireflies, snow, petals, sugar).
 * It reads the race and its events; it decides nothing. Reduced motion keeps the objects and drops the particles.
 */
import * as THREE from 'three';
import type { Kart, KartEvent, KartState } from '../sim/race';
import { TOP_SPEED } from '../sim/kart';
import { CAVE, within, type Track } from '../sim/track';
import type { CameraMode } from './camera';
import { createBatch, randomFrom } from './kit';

const SPARK = [0xe9eef2, 0x4fc3ff, 0xffc93d, 0xff6fb5] as const;
const SWEETS = [0xffd45e, 0xff8fb8, 0x8fe3c0, 0x8fc7ff, 0xc9a7ff] as const;
const CONFETTI = [0xff5d6c, 0xffd23f, 0x4fd1a1, 0x5aa9ff, 0xc98bff, 0xffffff] as const;
const DUST: Readonly<Record<string, number>> = { rough: 0x9aa864, snow: 0xffffff, water: 0xcfefff, mud: 0x6a4f3a };

/** A pool of soft round points. `glow` adds its light to the picture; otherwise it is paint. */
function createParticles(capacity: number, glow: boolean) {
  const position = new Float32Array(capacity * 3), color = new Float32Array(capacity * 4), size = new Float32Array(capacity);
  const velocity = new Float32Array(capacity * 3), life = new Float32Array(capacity), span = new Float32Array(capacity), grow = new Float32Array(capacity), base = new Float32Array(capacity * 2), weight = new Float32Array(capacity);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('tint', new THREE.BufferAttribute(color, 4).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('size', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { scale: { value: 600 } },
    vertexShader: 'attribute vec4 tint; attribute float size; uniform float scale; varying vec4 vTint; void main() { vTint = tint; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_PointSize = min(380., size * scale / max(.5, -mv.z)); gl_Position = projectionMatrix * mv; }',
    fragmentShader: `varying vec4 vTint; void main() { float d = length(gl_PointCoord - .5) * 2.; float a = ${glow ? 'pow(max(0., 1. - d), 1.6)' : 'smoothstep(1., .55, d)'} * vTint.a; if (a < .004) discard; gl_FragColor = vec4(vTint.rgb, a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const points = new THREE.Points(geometry, material); points.frustumCulled = false; points.renderOrder = glow ? 6 : 5;
  const tint = new THREE.Color();
  let next = 0;
  return {
    points, material,
    emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, hue: number, opacity: number, from: number, to: number, seconds: number, gravity = 0) {
      const i = next++ % capacity;
      position[i * 3] = x; position[i * 3 + 1] = y; position[i * 3 + 2] = z; velocity[i * 3] = vx; velocity[i * 3 + 1] = vy; velocity[i * 3 + 2] = vz;
      tint.set(hue); color[i * 4] = tint.r; color[i * 4 + 1] = tint.g; color[i * 4 + 2] = tint.b; color[i * 4 + 3] = opacity;
      base[i * 2] = from; base[i * 2 + 1] = opacity; grow[i] = to; life[i] = span[i] = seconds; weight[i] = gravity; size[i] = from;
    },
    update(dt: number) {
      for (let i = 0; i < capacity; i++) {
        if (life[i]! <= 0) continue;
        life[i] = life[i]! - dt;
        if (life[i]! <= 0) { size[i] = 0; color[i * 4 + 3] = 0; continue; }
        const t = 1 - life[i]! / span[i]!;
        velocity[i * 3 + 1] = velocity[i * 3 + 1]! - weight[i]! * dt;
        for (let a = 0; a < 3; a++) position[i * 3 + a] = position[i * 3 + a]! + velocity[i * 3 + a]! * dt;
        size[i] = base[i * 2]! + (grow[i]! - base[i * 2]!) * t; color[i * 4 + 3] = base[i * 2 + 1]! * (1 - t * t);
      }
      for (const name of ['position', 'tint', 'size']) geometry.getAttribute(name).needsUpdate = true;
    },
    clear() { life.fill(0); size.fill(0); for (let i = 0; i < capacity; i++) color[i * 4 + 3] = 0; geometry.getAttribute('size').needsUpdate = true; geometry.getAttribute('tint').needsUpdate = true; },
  };
}

export function createEffects(track: Track, scene: THREE.Scene, { low, calm }: { low: boolean; calm: boolean }) {
  const group = new THREE.Group(); group.name = 'race-things'; scene.add(group);
  const solid = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: .02 });
  const box = new THREE.BoxGeometry(1, 1, 1), ball = new THREE.SphereGeometry(.5, 12, 9), cone = new THREE.ConeGeometry(.5, 1, 8), holder = new THREE.Group();
  const model = (build: (add: (geometry: THREE.BufferGeometry, at: number[], size: number[] | number, color: number, rotation?: number[]) => void) => void) => {
    const batch = createBatch(); build((geometry, at, size, color, rotation = [0, 0, 0]) => batch.add(geometry, solid, at, rotation, size, color));
    return batch.build(holder)[0]!.geometry;
  };
  // The item bag: a striped paper bag with a pinked top. The sweet: a wrapped toffee. Then the three things thrown.
  const bagGeometry = model(add => {
    for (let i = 0; i < 5; i++) add(box, [(i - 2) * .26, 0, 0], [.262, 1.15, .7], i % 2 ? 0xfff6e6 : 0xe5484d);
    for (let i = 0; i < 5; i++) add(cone, [(i - 2) * .26, .68, 0], [.26, .26, .7], i % 2 ? 0xfff6e6 : 0xe5484d);
  });
  const sweetGeometry = model(add => {
    add(ball, [0, 0, 0], [.78, .52, .5], 0xffffff);
    for (const side of [-1, 1]) add(cone, [side * .52, 0, 0], [.44, .4, .36], 0xfff3d0, [0, 0, side * Math.PI / 2]);
  });
  const coneGeometry = model(add => { for (let i = 0; i < 5; i++) add(cone, [0, 0, (i - 2) * .2], [.82 - Math.abs(i - 1.6) * .16, .42, .82 - Math.abs(i - 1.6) * .16], i % 2 ? 0x9a5f34 : 0x7d4a26, [Math.PI / 2, 0, 0]); });
  const beeGeometry = model(add => {
    add(ball, [0, 0, 0], [.95, .85, 1.35], 0xffd23f);
    for (const z of [-.22, .22]) add(ball, [0, 0, z], [1, .9, .22], 0x3b2c1c);
    for (const side of [-1, 1]) { add(ball, [side * .55, .5, 0], [.9, .1, .5], 0xeaf6ff, [0, 0, side * .5]); add(ball, [side * .2, .1, .6], .16, 0x2b2118); }
  });
  const gumGeometry = model(add => { add(ball, [0, .12, 0], [2, .34, 2], 0xff7fb2); add(ball, [.15, .55, -.1], .85, 0xffb7d6); add(ball, [-.5, .3, .35], .45, 0xff9cc6); });
  const cloudGeometry = model(add => { add(ball, [0, 0, 0], [1.9, 1, 1.3], 0x9aa6bb); add(ball, [-.75, -.1, .1], [1.2, .8, 1], 0x8794ab); add(ball, [.8, -.05, -.1], [1.3, .85, 1], 0xa8b3c6); add(ball, [.1, .35, 0], [1.1, .8, .9], 0xb8c2d3); });
  for (const geometry of [box, ball, cone]) geometry.dispose();
  const instanced = (geometry: THREE.BufferGeometry, count: number, name: string) => {
    const mesh = new THREE.InstancedMesh(geometry, solid, count); mesh.name = name; mesh.frustumCulled = false; mesh.castShadow = !low; mesh.count = 0; group.add(mesh); return mesh;
  };
  const bags = instanced(bagGeometry, track.boxes.length, 'item-bags'), sweets = instanced(sweetGeometry, track.candies.length, 'sweets');
  const cones = instanced(coneGeometry, 24, 'pine-cones'), bees = instanced(beeGeometry, 12, 'bumblebees'), gums = instanced(gumGeometry, 16, 'gum'), clouds = instanced(cloudGeometry, 8, 'rain-clouds');
  const tint = new THREE.Color();
  track.candies.forEach((_, i) => sweets.setColorAt(i, tint.set(SWEETS[i % SWEETS.length]!)));
  for (const mesh of [bags, cones, bees, gums, clouds]) for (let i = 0; i < mesh.instanceMatrix.count; i++) mesh.setColorAt(i, tint.set(0xffffff));

  const sparks = createParticles(low ? 320 : 700, true), paint = createParticles(low ? 240 : 520, false);
  group.add(paint.points, sparks.points);
  const random = randomFrom(4711), rnd = (spread = 1) => (random() - .5) * 2 * spread;
  const point = track.point(0), dummy = new THREE.Object3D(), at = new THREE.Vector3(), forward = new THREE.Vector3(), left = new THREE.Vector3();
  const emission = new Float32Array(8), wasBoosting = new Uint8Array(8);
  let ambient = 0, party = 0;
  const place = (kart: Kart) => {
    track.point(kart.distance, kart.lane, point);
    const yaw = point.angle + kart.heading + kart.slip;
    at.set(point.x, point.y + kart.y, point.z); forward.set(Math.sin(yaw), 0, Math.cos(yaw)); left.set(forward.z, 0, -forward.x);
  };
  const burst = (pool: ReturnType<typeof createParticles>, x: number, y: number, z: number, hues: readonly number[], count: number, speed: number, size: number, seconds: number, gravity = 0, up = 1) => {
    for (let i = 0; i < count; i++) {
      const angle = random() * Math.PI * 2, out = speed * (.4 + random() * .6);
      pool.emit(x, y, z, Math.sin(angle) * out, (random() * .9 + .2) * speed * up, Math.cos(angle) * out, hues[i % hues.length]!, 1, size, size * .4, seconds * (.6 + random() * .4), gravity);
    }
  };
  return {
    reset() { sparks.clear(); paint.clear(); emission.fill(0); wasBoosting.fill(0); ambient = party = 0; },
    update(state: KartState, events: readonly KartEvent[], dt: number, time: number, camera: THREE.Camera, mode: CameraMode) {
      const scale = (camera as THREE.PerspectiveCamera).isPerspectiveCamera ? 1 / Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov) / 2) : 1;
      sparks.material.uniforms.scale!.value = paint.material.uniforms.scale!.value = scale * 360;
      const moving = calm ? 0 : time;
      /* Item bags and sweets: turning and bobbing where they wait, gone while they are taken. */
      state.boxes.forEach((spot, i) => {
        track.point(spot.at, spot.lane, point);
        const grown = spot.active ? 1 : 0;
        dummy.position.set(point.x, point.y + 1.35 + Math.sin(moving * 2.2 + i) * .14, point.z); dummy.rotation.set(0, moving * 1.3 + i, Math.sin(moving * 1.7 + i) * .12);
        dummy.scale.setScalar(grown * 1.15); dummy.updateMatrix(); bags.setMatrixAt(i, dummy.matrix);
      });
      state.candies.forEach((spot, i) => {
        track.point(spot.at, spot.lane, point);
        dummy.position.set(point.x, point.y + .85 + spot.lift + Math.sin(moving * 2.6 + i * .7) * .1, point.z); dummy.rotation.set(.3, moving * 2.2 + i, .2);
        dummy.scale.setScalar(spot.active ? .82 : 0); dummy.updateMatrix(); sweets.setMatrixAt(i, dummy.matrix);
      });
      bags.count = state.boxes.length; sweets.count = state.candies.length;
      /* What has been thrown. */
      let c = 0, b = 0, g = 0;
      for (const shot of state.shots) {
        track.point(shot.distance, shot.lane, point);
        if (shot.kind === 'cone' && c < 24) {
          dummy.position.set(point.x, point.y + .55, point.z); dummy.rotation.set(time * 14, point.angle + shot.angle, 0, 'YXZ'); dummy.scale.setScalar(1.05); dummy.updateMatrix(); cones.setMatrixAt(c++, dummy.matrix);
          if (!calm) paint.emit(point.x, point.y + .5, point.z, rnd(.4), .4, rnd(.4), 0xe8d9c0, .5, .5, 1.1, .3);
        } else if (shot.kind === 'bee' && b < 12) {
          dummy.position.set(point.x, point.y + 1.5 + Math.sin(time * 9 + shot.id) * .22, point.z); dummy.rotation.set(Math.sin(time * 23) * .12, point.angle, Math.sin(time * 31) * .25, 'YXZ'); dummy.scale.setScalar(.95); dummy.updateMatrix(); bees.setMatrixAt(b++, dummy.matrix);
          if (!calm) sparks.emit(point.x + rnd(.3), point.y + 1.5, point.z + rnd(.3), 0, .2, 0, 0xffe07a, .7, .7, .1, .35);
        } else if (shot.kind === 'gum' && g < 16) {
          const wobble = 1 + Math.sin(moving * 3 + shot.id) * .06;
          dummy.position.set(point.x, point.y + .08, point.z); dummy.rotation.set(point.pitch, point.angle + shot.id, 0, 'YXZ'); dummy.scale.set(.62 * wobble, .62 / wobble, .62 * wobble); dummy.updateMatrix(); gums.setMatrixAt(g++, dummy.matrix);
        }
      }
      cones.count = c; bees.count = b; gums.count = g;
      /* Around each kart. */
      let rain = 0;
      state.karts.forEach((kart, i) => {
        place(kart);
        if (kart.cloud > 0 && rain < 8) {
          dummy.position.set(at.x, at.y + 3.1 + Math.sin(moving * 3 + i) * .12, at.z); dummy.rotation.set(0, moving * .4 + i, 0); dummy.scale.setScalar(Math.min(1, kart.cloud * 3) * .95); dummy.updateMatrix(); clouds.setMatrixAt(rain++, dummy.matrix);
          if (!calm) for (let n = 0; n < 2; n++) paint.emit(at.x + rnd(1.1), at.y + 2.6, at.z + rnd(.9), 0, -7, 0, 0x8fc7ff, .8, .16, .12, .32);
        }
        if (calm || dt <= 0) return;
        const mine = i === 0, fast = Math.abs(kart.speed) / TOP_SPEED, grounded = !kart.airborne, rear = -1.15;
        emission[i] = emission[i]! + dt;
        const every = mine || !low ? 1 / 70 : 1 / 28;
        while (emission[i]! >= every) {
          emission[i] = emission[i]! - every;
          const side = random() < .5 ? -1 : 1, x = at.x + left.x * side * .95 + forward.x * rear, z = at.z + left.z * side * .95 + forward.z * rear, y = at.y + .22;
          if (kart.drift && grounded) {
            // Sparks from the rear wheels in the colour of the turbo that is waiting.
            const hue = SPARK[kart.driftTier]!;
            if (kart.driftTier > 0) sparks.emit(x, y, z, -forward.x * 3 + left.x * side * 2 + rnd(1.5), 1.6 + random() * 2.4, -forward.z * 3 + left.z * side * 2 + rnd(1.5), hue, 1, .34 + kart.driftTier * .09, .06, .28 + random() * .2, 7);
            else if (random() < .5) paint.emit(x, y, z, rnd(.6), .7, rnd(.6), 0xf2f2f2, .3, .5, 1.5, .4);
          }
          if (kart.boostTime > 0) {
            const hue = kart.boostKind === 'turbo3' ? 0xff7fc0 : kart.boostKind === 'turbo1' ? 0x7fd6ff : random() < .5 ? 0xffb347 : 0xffe066;
            sparks.emit(at.x + left.x * side * .36 + forward.x * -1.7, at.y + .72, at.z + left.z * side * .36 + forward.z * -1.7, -forward.x * 5 + rnd(.8), rnd(.8), -forward.z * 5 + rnd(.8), hue, .9, .8, .1, .3);
          }
          if (grounded && fast > .25 && DUST[kart.surface] !== undefined && random() < .7) {
            const wet = kart.surface === 'water';
            paint.emit(x, y - .1, z, -forward.x * 2 + rnd(1.6), wet ? 3 + random() * 2.5 : .9 + random(), -forward.z * 2 + rnd(1.6), DUST[kart.surface]!, wet ? .8 : .55, wet ? .3 : .6, wet ? .2 : 1.9, wet ? .55 : .6, wet ? 9 : 0);
          }
          if (kart.spin > 0 && random() < .6) paint.emit(at.x + rnd(.8), at.y + .3, at.z + rnd(.8), rnd(1), 1, rnd(1), 0xf4f4f4, .45, .6, 1.8, .5);
          if (kart.star > 0) sparks.emit(at.x + rnd(1.3), at.y + .4 + random() * 1.4, at.z + rnd(1.3), rnd(.5), 1.2, rnd(.5), CONFETTI[Math.floor(random() * 5)]!, 1, .5, .05, .5);
        }
        // The first instant of a boost: a ring of light thrown back from the kart.
        if (kart.boostTime > 0 && !wasBoosting[i]) for (let n = 0; n < (mine ? 16 : 8); n++) {
          const angle = n / (mine ? 16 : 8) * Math.PI * 2;
          sparks.emit(at.x - forward.x * 1.4, at.y + .6, at.z - forward.z * 1.4, left.x * Math.cos(angle) * 4 - forward.x * 3, Math.sin(angle) * 4, left.z * Math.cos(angle) * 4 - forward.z * 3, 0xfff0a8, 1, .5, .1, .32);
        }
        wasBoosting[i] = kart.boostTime > 0 ? 1 : 0;
      });
      clouds.count = rain;
      /* One-off moments. */
      if (!calm) for (const event of events) {
        if (event.type === 'go') continue;
        if (event.type === 'shotEnd') {
          track.point(event.distance, event.lane, point);
          burst(paint, point.x, point.y + .6, point.z, event.kind === 'gum' ? [0xff9cc6, 0xffd3e6] : event.kind === 'bee' ? [0xffe07a, 0xffffff] : [0xb98a5e, 0xe8d9c0], 9, 3, .5, .45, 6);
          continue;
        }
        const kart = state.karts[event.kart]!;
        place(kart);
        if (event.type === 'box') { const spot = state.boxes[event.box]!; track.point(spot.at, spot.lane, point); burst(paint, point.x, point.y + 1.3, point.z, CONFETTI, 22, 6, .3, .7, 12); burst(sparks, point.x, point.y + 1.3, point.z, [0xfff0a8], 8, 3, .9, .3); }
        else if (event.type === 'candy') burst(sparks, at.x, at.y + .9, at.z, [0xfff0a8, 0xffffff], 6, 2.5, .4, .3);
        else if (event.type === 'hit') { burst(sparks, at.x, at.y + 1, at.z, [0xffffff, 0xffe066, 0xff8fb8], 20, 7, .6, .55, 6); burst(paint, at.x, at.y + .5, at.z, [0xf4f4f4], 10, 3, 1.2, .6); }
        else if (event.type === 'candyLost') burst(paint, at.x, at.y + 1, at.z, SWEETS, event.count * 4, 6, .42, .8, 14);
        else if (event.type === 'shieldPop') burst(paint, at.x, at.y + .9, at.z, [0xffb3d4, 0xffd9ea, 0xffffff], 22, 5, .9, .7, 2);
        else if (event.type === 'land' && event.air > .22) for (let n = 0; n < 14; n++) { const angle = n / 14 * Math.PI * 2; paint.emit(at.x + Math.sin(angle), at.y + .15, at.z + Math.cos(angle), Math.sin(angle) * 4, .6, Math.cos(angle) * 4, 0xf1ead8, .5, .5, 1.6, .45); }
        else if (event.type === 'trick') burst(sparks, at.x, at.y + 1, at.z, CONFETTI, 16, 5, .5, .5, 4);
        else if (event.type === 'wall') burst(sparks, at.x, at.y + .5, at.z, [0xfff0a8, 0xffffff], 6 + Math.round(event.force * 8), 4, .3, .3, 9);
        else if (event.type === 'bump') burst(sparks, at.x, at.y + .7, at.z, [0xffffff, 0xffe066], 6, 3, .35, .25);
        else if (event.type === 'tier') burst(sparks, at.x - forward.x, at.y + .4, at.z - forward.z, [SPARK[event.tier]!], 10, 4, .45, .3, 5);
        else if (event.type === 'use' && event.item === 'rainbow') burst(sparks, at.x, at.y + 1, at.z, CONFETTI, 26, 7, .6, .6);
        else if (event.type === 'finish' && event.kart === 0) party = 6;
      }
      /* The air of each place, near the camera: something small is always drifting by. */
      if (!calm && dt > 0) {
        const where = mode === 'menu' ? null : state.player, zone = where ? track.zone(where.distance) : -1, cave = !!where && within(where.distance, CAVE.from, CAVE.to);
        ambient += dt * (low ? 8 : 20);
        while (ambient >= 1) {
          ambient--;
          const x = camera.position.x + rnd(22), z = camera.position.z + rnd(22), y = camera.position.y - 1.5 + random() * 6;
          if (cave) sparks.emit(x, y, z, rnd(.2), .15, rnd(.2), random() < .5 ? 0x7ff3ff : 0xd49bff, .9, .2, .05, 1.6);
          else if (zone === 1) paint.emit(x, y + 4, z, rnd(.6) + .8, -1.1, rnd(.6), random() < .5 ? 0xf2a93b : 0xd9c24a, .9, .22, .2, 3.2);
          else if (zone === 2) sparks.emit(x, y - .5, z, rnd(.5), rnd(.3), rnd(.5), 0xd8ff8a, .9, .26, .05, 2.2);
          else if (zone === 3) paint.emit(x, y + 4, z, rnd(.8) - 1.2, -2.2, rnd(.8), 0xffffff, .9, .16, .14, 2.6);
          else if (zone === 4) sparks.emit(x, y, z, rnd(.3), .4, rnd(.3), CONFETTI[Math.floor(random() * 5)]!, .8, .22, .04, 1.8);
          else if (zone === 0 && random() < .4) paint.emit(x, y + 3, z, rnd(.5) + .6, -.8, rnd(.5), random() < .5 ? 0xffffff : 0xffc7dd, .9, .18, .16, 3);
        }
        if (party > 0 || mode === 'result') {
          party = Math.max(0, party - dt);
          for (let n = 0; n < (low ? 2 : 4); n++) paint.emit(camera.position.x + rnd(14), camera.position.y + 6 + random() * 3, camera.position.z + rnd(14), rnd(1.5), -3.5, rnd(1.5), CONFETTI[Math.floor(random() * 6)]!, 1, .3, .26, 2.6, 1);
        }
      }
      sparks.update(dt); paint.update(dt);
      for (const mesh of [bags, sweets, cones, bees, gums, clouds]) mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
