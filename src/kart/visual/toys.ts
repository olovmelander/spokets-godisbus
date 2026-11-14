/** Eight carved toy racers: Elof's crown kart and seven animals from the forest. Original shapes, no numbers,
 * marks or likenesses. Each kart is two merged meshes; all thirty-two wheels are one instanced mesh in the view.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Kart, RacerId } from '../sim/kart';
import { TOP_SPEED } from '../sim/kart';
import { canvasTexture, createBatch, randomFrom } from './kit';

export function toyMaterial(): THREE.MeshStandardMaterial {
  const random = randomFrom(930);
  const map = canvasTexture(128, 128, (c, w, h) => {
    c.fillStyle = '#fff8ea'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 34; i++) {
      c.strokeStyle = i % 4 ? '#efe2cb' : '#dfcdb0'; c.lineWidth = i % 4 ? .7 : 1.1;
      const y = random() * h; c.beginPath(); c.moveTo(-4, y);
      c.bezierCurveTo(32, y - 2 + random() * 6, 76, y + random() * 6, 132, y); c.stroke();
    }
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshStandardMaterial({ map, vertexColors: true, roughness: .46, metalness: .04 });
}

/** A fat toy tyre with a bright hub, built once and drawn for every wheel. */
export function wheelGeometry(): THREE.BufferGeometry {
  const batch = createBatch(), holder = new THREE.Group(), material = new THREE.MeshStandardMaterial({ vertexColors: true });
  const tyre = new THREE.LatheGeometry([
    new THREE.Vector2(.17, -.17), new THREE.Vector2(.28, -.17), new THREE.Vector2(.33, -.12), new THREE.Vector2(.34, 0),
    new THREE.Vector2(.33, .12), new THREE.Vector2(.28, .17), new THREE.Vector2(.17, .17),
  ], 16).rotateZ(Math.PI / 2);
  const hub = new THREE.CylinderGeometry(.19, .19, .36, 10).rotateZ(Math.PI / 2), spoke = new THREE.BoxGeometry(.37, .07, .3);
  batch.add(tyre, material, [0, 0, 0], [0, 0, 0], 1, 0x30343a);
  batch.add(hub, material, [0, 0, 0], [0, 0, 0], 1, 0xffffff);
  for (let i = 0; i < 3; i++) batch.add(spoke, material, [0, 0, 0], [i * Math.PI / 3, 0, 0], 1, 0xd9dde2);
  const geometry = batch.build(holder)[0]!.geometry;
  tyre.dispose(); hub.dispose(); spoke.dispose(); material.dispose();
  return geometry;
}
/** Where each wheel sits on a kart: x, y, z, radius scale and whether it steers. */
export const WHEELS = [[.92, .34, .86, 1, 1], [-.92, .34, .86, 1, 1], [.98, .38, -.84, 1.14, 0], [-.98, .38, -.84, 1.14, 0]] as const;

const HEADS: Readonly<Record<RacerId, number>> = { player: 0xe9b97a, fox: 0xe08a45, hare: 0xe6d8b6, owl: 0xb89f78, squirrel: 0xc8683a, hedgehog: 0xcfae86, moose: 0x8a5a3c, bear: 0x9a6a48 };

export function toyKart(id: RacerId, colour: number, shared: THREE.MeshStandardMaterial) {
  const root = new THREE.Group(); root.name = `toy-kart:${id}`;
  const body = new THREE.Group(); root.add(body);
  // The rainbow lollipop lights a kart from within, so each kart has its own copy of the wooden material.
  const material = shared.clone();
  const rounded = new RoundedBoxGeometry(1, 1, 1, 2, .16), sphere = new THREE.SphereGeometry(1, 14, 10), cylinder = new THREE.CylinderGeometry(1, 1, 1, 12), cone = new THREE.ConeGeometry(1, 1, 8);
  const batch = createBatch(), tint = new THREE.Color(colour), dark = tint.clone().multiplyScalar(.72).getHex(), pale = tint.clone().lerp(new THREE.Color(0xffffff), .55).getHex();
  const add = (geometry: THREE.BufferGeometry, at: number[], size: number[] | number, color: number, rotation = [0, 0, 0]) => batch.add(geometry, material, at, rotation, size, color);
  add(rounded, [0, .46, -.02], [1.2, .34, 2.3], colour);                       // the tub
  add(rounded, [0, .52, 1.02], [.92, .3, .7], colour);                         // the nose
  add(rounded, [0, .36, 1.34], [1.56, .16, .2], 0xfdf3dc);                     // front bumper
  add(rounded, [0, .68, 1.0], [.5, .07, .56], pale);                           // a stripe down the nose
  for (const side of [-1, 1]) {
    add(rounded, [side * .78, .5, -.1], [.36, .34, 1.1], dark);                // side pods
    add(cylinder, [side * .36, .62, -1.26], [.09, .5, .09], 0x8d949c, [1.25, 0, 0]); // exhausts
    add(rounded, [side * .52, .98, -1.12], [.09, .6, .12], dark);              // wing posts
  }
  add(rounded, [0, 1.3, -1.16], [1.5, .1, .46], colour);                       // the wing
  add(rounded, [0, 1.36, -1.16], [1.5, .03, .14], 0xfdf3dc);
  add(rounded, [0, .84, -.62], [.8, .7, .2], 0x7a4b34, [-.16, 0, 0]);          // seat back
  add(cylinder, [0, .38, .86], [.06, 1.9, .06], 0x5d646c, [0, 0, Math.PI / 2]); // axles
  add(cylinder, [0, .4, -.84], [.07, 2, .07], 0x5d646c, [0, 0, Math.PI / 2]);
  add(cylinder, [0, .96, .34], [.24, .05, .24], 0x4c3a2c, [1.1, 0, 0]);        // the wheel in its hands
  add(cylinder, [0, .78, .46], [.04, .4, .04], 0x4c3a2c, [1.1, 0, 0]);
  const mesh = batch.build(body, { name: 'carved-kart' })[0]!;

  // The driver: a turned wooden figure with its animal's ears, snout or spikes.
  const puppet = new THREE.Group(); puppet.position.set(0, .7, -.3); body.add(puppet);
  const wood = HEADS[id], person = createBatch();
  const part = (geometry: THREE.BufferGeometry, at: number[], size: number[] | number, color: number, rotation = [0, 0, 0]) => person.add(geometry, material, at, rotation, size, color);
  part(sphere, [0, .3, 0], [.33, .4, .28], pale);
  part(cylinder, [0, .68, 0], [.12, .2, .12], wood);
  part(sphere, [0, .94, .03], id === 'owl' || id === 'bear' ? [.37, .36, .33] : [.32, .34, .3], wood);
  for (const side of [-1, 1]) {
    part(cylinder, [side * .3, .44, .3], [.07, .62, .07], wood, [1.05, 0, side * -.34]);          // arms to the wheel
    part(sphere, [side * .21, .28, .6], .085, wood);
    part(sphere, [side * .13, .99, .3], [.045, .055, .03], 0x33342c);                           // eyes
    part(sphere, [side * .13 + .01, 1.005, .325], .014, 0xfff5dd);
    if (id === 'fox') { part(cone, [side * .2, 1.28, 0], [.12, .32, .09], 0xa5542a, [0, 0, side * -.2]); part(sphere, [side * .1, .85, .29], [.13, .1, .13], 0xfbe3b4); }
    if (id === 'hare') { part(sphere, [side * .15, 1.42, -.02], [.09, .36, .07], wood, [0, 0, side * -.14]); part(sphere, [side * .15, 1.43, .03], [.045, .26, .03], 0xe2a59a, [0, 0, side * -.14]); }
    if (id === 'owl') { part(sphere, [side * .15, .98, .28], [.17, .18, .06], 0xfbe6b3); part(cone, [side * .25, 1.3, 0], [.07, .2, .06], 0x8d7654, [0, 0, side * -.5]); }
    if (id === 'squirrel') part(cone, [side * .19, 1.3, 0], [.09, .24, .07], 0xa8502b, [0, 0, side * -.12]);
    if (id === 'bear') { part(sphere, [side * .27, 1.25, 0], [.12, .12, .07], 0x7d5236); part(sphere, [side * .27, 1.25, .03], [.07, .07, .05], 0xd9a98a); }
    if (id === 'moose') {
      part(rounded, [side * .46, 1.34, 0], [.5, .08, .2], 0xe2cfa8, [0, 0, side * .35]);
      for (let i = 0; i < 3; i++) part(rounded, [side * (.36 + i * .14), 1.47 + i * .04, 0], [.07, .2, .07], 0xe2cfa8, [0, 0, side * -.2]);
    }
  }
  const nose = id === 'fox' ? .42 : id === 'moose' ? .46 : .35;
  if (id === 'moose') part(sphere, [0, .84, .3], [.19, .16, .22], 0x9c6c4a);
  if (id === 'bear') part(sphere, [0, .86, .28], [.15, .12, .13], 0xdcae8c);
  if (id === 'hare' || id === 'squirrel') part(sphere, [0, .85, .27], [.15, .1, .1], 0xf7e8cb);
  if (id === 'hedgehog') {
    part(sphere, [0, .86, .28], [.13, .1, .16], 0xf2dcbc);
    for (let i = 0; i < 14; i++) { const a = (i % 7 - 3) * .32, up = i < 7 ? 1.18 : 1.02; part(cone, [Math.sin(a) * .26, up + Math.cos(a) * .1, -.12 - (i < 7 ? 0 : .12)], [.055, .22, .055], 0x6b5444, [-.9, 0, -a * .8]); }
  }
  if (id === 'squirrel') for (let i = 0; i < 4; i++) part(sphere, [0, .3 + i * .26, -.42 - Math.sin(i * .9) * .16], [.17 + i * .02, .2, .17], 0xb85e33);
  if (id === 'player') {
    part(cylinder, [0, 1.24, .02], [.27, .1, .27], 0xf7c64e);
    for (let i = 0; i < 5; i++) part(cone, [Math.sin(i * Math.PI * .4) * .21, 1.38, .02 + Math.cos(i * Math.PI * .4) * .21], [.08, .22, .08], 0xfbdc75, [0, Math.PI / 4, 0]);
  }
  part(sphere, [0, .88, id === 'hedgehog' ? .45 : nose], [.05, .04, .045], id === 'owl' ? 0xe0a43f : 0x4a3a2c);
  const figure = person.build(puppet, { name: `driver:${id}` })[0]!;

  // Flames for a boost, and candy floss to hide in: both shown only when wanted.
  const fire = new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: .9, depthWrite: false });
  const flames = new THREE.Group(), flameGeometry = new THREE.ConeGeometry(.16, 1, 8).rotateX(-Math.PI / 2).translate(0, 0, -.5);
  for (const side of [-1, 1]) { const flame = new THREE.Mesh(flameGeometry, fire); flame.position.set(side * .36, .7, -1.5); flames.add(flame); }
  flames.visible = false; root.add(flames);
  const floss = new THREE.Mesh(new THREE.IcosahedronGeometry(1.75, 2), new THREE.MeshBasicMaterial({ color: 0xff9cc8, transparent: true, opacity: .34, depthWrite: false }));
  floss.position.y = .8; floss.visible = false; root.add(floss);
  for (const geometry of [rounded, sphere, cylinder, cone]) geometry.dispose();
  mesh.castShadow = figure.castShadow = true;
  const glow = new THREE.Color();
  let squash = 0, lean = 0, wasAir = false;
  return {
    root, material,
    /** The body's own little motions; the view places and turns the root. */
    update(kart: Kart, dt: number, time: number, calm: boolean) {
      const fast = Math.min(1.4, Math.abs(kart.speed) / TOP_SPEED), boosting = kart.boostTime > 0 || kart.rocket > 0;
      if (wasAir && !kart.airborne) squash = 1;
      wasAir = kart.airborne; squash = Math.max(0, squash - dt * 4.5);
      // Lean into the bend, and hard into a drift; settle after a landing; stretch a little under a boost.
      lean += ((kart.drift ? kart.drift * -.16 : kart.steer * -.07 * fast) - lean) * (1 - Math.exp(-8 * dt));
      body.rotation.z = calm ? 0 : lean;
      const press = calm ? 0 : Math.sin(squash * Math.PI) * .2;
      body.scale.set(1 + press * .5, 1 - press + (boosting && !calm ? .03 : 0), 1 + (boosting && !calm ? .08 : 0));
      body.position.y = calm ? 0 : Math.sin(time * 31 + kart.index) * .006 * fast;
      puppet.rotation.z = calm ? 0 : THREE.MathUtils.clamp(-kart.steer * .16 - kart.drift * .12, -.3, .3);
      puppet.rotation.x = calm ? 0 : (boosting ? -.14 : 0) + (kart.spin > 0 ? Math.sin(time * 18) * .15 : 0);
      flames.visible = boosting;
      if (boosting) {
        const length = (.9 + (kart.rocket > 0 ? .5 : kart.boostPower) * 3.4) * (calm ? 1 : .8 + .35 * Math.sin(time * 47 + kart.index));
        flames.children.forEach(flame => flame.scale.set(1, 1, length));
        fire.color.setHSL(kart.rocket > 0 || kart.boostKind === 'turbo3' ? .92 : kart.boostKind === 'turbo1' ? .55 : .09, 1, .62);
      }
      floss.visible = kart.shield > 0;
      if (floss.visible) { floss.rotation.y = calm ? 0 : time * .9; floss.scale.setScalar(kart.shield < 2 && !calm ? .9 + .1 * Math.sin(time * 14) : 1); }
      // The rainbow lollipop: the whole kart glows through the colours.
      if (kart.star > 0) material.emissive.copy(glow.setHSL((time * 1.4) % 1, 1, .5)).multiplyScalar(.55);
      else material.emissive.setRGB(0, 0, 0);
    },
    dispose() { material.dispose(); fire.dispose(); flameGeometry.dispose(); floss.geometry.dispose(); (floss.material as THREE.Material).dispose(); },
  };
}
