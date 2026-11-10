import { AdditiveBlending, Color, Group, InstancedMesh, type Mesh, MeshBasicMaterial, type MeshStandardMaterial, Object3D, PlaneGeometry } from 'three';
import type { ChapterData, Spot } from '../../sim/types';
import { glowTexture } from '../../render/glow';

/**
 * The beaver at its lodge in Älven (art/blender/a2-creatures.py, `baver`), and its life. It sits on the far bank by
 * its gnawed stumps with a birch stick in its paws, gnawing. As Elof comes along the bank it stops, and looks at him;
 * it thumps its tail on the ground, turns, and goes off behind its lodge. When he is up on the lodge's roof it comes
 * swimming home over the lake, low in the water with a wake behind it, slaps the water with its tail by the shore, and
 * dives in under its lodge. If he goes back along the bank, it is sitting there again.
 *
 * Its head turns on its neck (the kit's `kit-head`), its tail lifts and slaps on its hinge (`baver-svans`), and its stick
 * turns in its paws (`baver-pinne`). It is all the picture's business: nothing here touches the simulation.
 */

/** Where Elof is, and whether the picture keeps still: the storm's own, set every frame (./render.ts). */
interface Watcher { x: number; still: boolean }

/** When it notices him coming along the bank, how long it looks, and when the tail thumps and it goes. */
const NOTICE = 4;
const LOOK = 2.2;
const SLAP = 0.55;
const TURN = 0.7;
const WADDLE = 2.8;
/** Where it goes behind the lodge, from where it sat, and how far past it he must be for it to swim home. */
const BEHIND = { x: 4.8, z: -4.6 };
const HOME = 9;
/** Its swim over the lake to the shore by the lodge: from where, to where, and how long. */
const SWIM = 7;
const DIVE = 1.4;

const smooth = (t: number) => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k); };

type Phase = 'gnaw' | 'look' | 'slap' | 'go' | 'gone' | 'swim' | 'under';

export function beaverLife(spot: Spot, group: Group, model: Object3D, water: () => NonNullable<ChapterData['water']>, elof: Watcher): { group: Group; update(used: boolean, clock: number, dt: number): void } {
  const home = { x: spot.at.x, y: spot.at.y };
  // The lake it swims home over: the first open water past where it sits, known once the chapter's picture is built.
  let lake: NonNullable<ChapterData['water']>[number] | undefined;
  let swimFrom: { x: number; z: number } | null = null;
  let swimTo: { x: number; z: number } | null = null;
  const effects = splashes();
  group.add(effects.mesh);
  // The night's light comes from behind it, and its fur is as dark as the sticks of its lodge: a little warm light of
  // its own keeps it from going black there, as the owl's feathers have (./render.ts). Its own materials, so the kit's
  // other creatures are as they were.
  model.userData.onModelInstalled = (copy: Object3D) => {
    copy.traverse((object) => {
      const mesh = object as Mesh;
      const material = mesh.material as MeshStandardMaterial | undefined;
      if (!mesh.isMesh || !material?.isMeshStandardMaterial) return;
      mesh.material = material.clone();
      (mesh.material as MeshStandardMaterial).emissive.set('#4a3020');
      (mesh.material as MeshStandardMaterial).emissiveIntensity = 0.55;
    });
  };
  let phase: Phase = 'gnaw';
  let since = 0;
  // Facing: in its own frame its front is +z, towards us; turned, its front looks left along the bank, towards him.
  const SITS = -1.0;
  let facing = SITS;
  return {
    group,
    update(_used, clock, dt) {
      if (!lake) {
        lake = water().filter((w) => w.from > home.x).sort((a, b) => a.from - b.from)[0];
        if (lake) { swimFrom = { x: lake.from + 4.8, z: -9.5 }; swimTo = { x: lake.from + 0.9, z: -5.2 }; }
      }
      // The outer group stands where the chapter puts it, at its z: everything here moves `model` within it.
      const z0 = group.position.z;
      since += dt;
      const head = model.getObjectByName('kit-head');
      const tail = model.getObjectByName('baver-svans');
      const stick = model.getObjectByName('baver-pinne');
      const near = elof.x;
      // What it is doing now, from what it was doing and where he is.
      const next = (to: Phase) => { phase = to; since = 0; };
      if (phase === 'gnaw' && near > home.x - NOTICE && near < home.x + 2) next('look');
      else if (phase === 'look' && (since > LOOK || near > home.x - 2.6)) next('slap');
      else if (phase === 'slap' && since > SLAP + 0.35) next('go');
      else if (phase === 'go' && since > TURN + WADDLE) next('gone');
      else if (phase === 'gone' && swimFrom && near > home.x + HOME) next('swim');
      else if (phase === 'swim' && since > SWIM) next('under');
      // Back along the bank, far enough that it would not be seen coming back: it is sitting there again.
      if ((phase === 'gone' || phase === 'under' || phase === 'swim') && near < home.x - NOTICE - 6) next('gnaw');
      if (phase === 'look' && near < home.x - NOTICE - 2) next('gnaw');
      model.visible = phase !== 'gone' && !(phase === 'under' && since > DIVE);
      model.position.set(0, 0, 0);
      model.rotation.set(0, facing, 0);
      if (head) head.rotation.set(0, 0, 0);
      if (tail) tail.rotation.set(0, 0, 0);
      if (stick) { stick.rotation.set(0, 0, 0); stick.position.x = 0; }
      effects.clear();
      if (elof.still) {
        // With less motion it sits and gnaws without moving; it still goes as he comes, and is still home when he is past.
        model.visible = phase === 'gnaw' || phase === 'look';
        model.rotation.y = SITS;
        effects.done();
        return;
      }
      if (phase === 'gnaw' || phase === 'look') {
        facing = SITS;
        model.rotation.y = facing;
        // Breathing.
        model.scale.set(1, 1 + 0.012 * Math.sin(clock * 2.4), 1);
        if (phase === 'gnaw') {
          // In bursts: quick little nods as the teeth work, the stick shifted along them; between, it turns the stick.
          const burst = (clock * 0.55 + home.x) % 1;
          const working = burst < 0.68;
          if (head) head.rotation.x = 0.12 + (working ? 0.05 * Math.sin(clock * 30) : -0.06 * Math.sin(burst * Math.PI));
          if (stick) {
            stick.position.x = working ? 0.05 * Math.sin(clock * 2.1) : 0;
            stick.rotation.x = clock * 0.9 + (working ? 0 : 1.6 * smooth((burst - 0.68) / 0.32));
          }
        } else if (head) {
          // It has seen him: its head comes up and round to him, and holds there.
          const k = smooth(since / 0.45);
          const toward = Math.atan2(near - home.x, -z0) - facing;
          const lean = Math.max(-0.25, Math.min(0.25, toward)) * k;
          head.rotation.y = Math.max(-1, Math.min(1, toward * k - lean));
          head.rotation.x = -0.22 * k;
          model.rotation.y = facing + lean;
        }
      } else if (phase === 'slap') {
        // Up goes the tail, and down, thump: a little splash of wet earth and leaves.
        const lift = since < 0.3 ? smooth(since / 0.3) : since < 0.4 ? 1 : since < 0.48 ? 1 - (since - 0.4) / 0.08 : 0;
        if (tail) tail.rotation.x = 1.05 * lift;
        // Still looking at him as it does.
        const toward = Math.atan2(near - home.x, -z0) - facing;
        const lean = Math.max(-0.25, Math.min(0.25, toward));
        if (head) { head.rotation.y = Math.max(-1, Math.min(1, toward - lean)); head.rotation.x = -0.22 + 0.08 * lift; }
        model.rotation.y = facing + lean;
        // Where its tail's flat end meets the ground, behind it as it sits turned.
        if (since > 0.48) effects.burst(-1.6 * Math.sin(facing), 0.05, -1.6 * Math.cos(facing), since - 0.48, false);
      } else if (phase === 'go') {
        // It turns, drops forward onto all fours and waddles off, rocking, behind its lodge.
        const way = Math.atan2(BEHIND.x, BEHIND.z);
        const turned = smooth(since / TURN);
        facing = SITS + (way - SITS) * turned;
        const k = smooth((since - TURN) / WADDLE);
        const rock = since > TURN ? Math.sin((since - TURN) * 9) : 0;
        model.position.set(BEHIND.x * k, Math.abs(rock) * 0.06, BEHIND.z * k);
        model.rotation.set(0.55 * turned, facing, 0.1 * rock, 'YXZ');
        if (tail) tail.rotation.x = -0.55 * turned + 0.08 * rock;
        if (stick) stick.rotation.x = 0.4;
      } else if ((phase === 'swim' || phase === 'under') && swimFrom && swimTo && lake) {
        // Home over the lake: low in the water, its head up, its tail trailing and sculling, a wake opening behind it.
        const k = phase === 'swim' ? since / SWIM : 1;
        const ease = smooth(k * 1.08 - 0.04);
        const x = swimFrom.x + (swimTo.x - swimFrom.x) * ease;
        const z = swimFrom.z + (swimTo.z - swimFrom.z) * ease;
        const water = lake.y - home.y;
        facing = Math.atan2(swimTo.x - swimFrom.x, swimTo.z - swimFrom.z);
        let sink = 0;
        let tilt = 1.25;
        let tailUp = 0;
        if (phase === 'under') {
          // By the shore: the tail up and down on the water, a slap and a splash, and it dives in under its lodge.
          const t = since;
          tailUp = t < 0.25 ? smooth(t / 0.25) : t < 0.33 ? 1 - (t - 0.25) / 0.08 : 0;
          if (t > 0.33) {
            const down = smooth((t - 0.45) / 0.8);
            tilt = 1.25 + 0.7 * down;
            sink = 1.6 * down;
            effects.burst(x - group.position.x - 0.9 * Math.sin(facing), water, z - z0 - 0.9 * Math.cos(facing), t - 0.33, true);
          }
        }
        model.position.set(x - group.position.x, water - 0.62 - sink + 0.03 * Math.sin(clock * 2.2), z - z0);
        model.rotation.set(tilt, facing, 0.04 * Math.sin(clock * 1.7), 'YXZ');
        if (head) { head.rotation.x = -0.95; head.rotation.y = 0.12 * Math.sin(clock * 0.8); }
        if (tail) { tail.rotation.x = -1.2 + 1.4 * tailUp; tail.rotation.y = 0.32 * Math.sin(clock * 5.5); }
        if (phase === 'swim') effects.wake(group.position.x, z0, water, swimFrom, swimTo, since, SWIM);
      }
      effects.done();
    },
  };
}

/**
 * The splashes and the wake: soft drops and foam, one draw for all of them, each put where it is by the time alone.
 */
function splashes() {
  const COUNT = 40;
  const mesh = new InstancedMesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({
    color: '#ffffff', map: glowTexture(32), transparent: true, depthWrite: false, blending: AdditiveBlending,
  }), COUNT);
  mesh.name = 'beaver-splash';
  mesh.frustumCulled = false;
  const place = new Object3D();
  const tint = new Color();
  // Its colours exist from the start, so that the first frames' warm-up draws it as it will be drawn.
  for (let i = 0; i < COUNT; i++) mesh.setColorAt(i, tint.setRGB(0, 0, 0));
  let used = 0;
  const seed = (i: number, k: number) => { const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); };
  const put = (x: number, y: number, z: number, size: number, light: number) => {
    if (used >= COUNT || light <= 0.004) return;
    place.position.set(x, y, z);
    place.scale.set(size, size, 1);
    place.updateMatrix();
    mesh.setMatrixAt(used, place.matrix);
    mesh.setColorAt(used, tint.setRGB(light * 0.82, light * 0.9, light));
    used++;
  };
  return {
    mesh,
    clear() { used = 0; },
    /** A tail's slap, `age` seconds ago, at (x, y, z) in the group: drops thrown up and out, and on water a ring. */
    burst(x: number, y: number, z: number, age: number, water: boolean) {
      if (age > 1.1) return;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + seed(i, 1);
        const out = (0.8 + 1.4 * seed(i, 2)) * (water ? 1.2 : 0.7);
        const up = (2.2 + 2.4 * seed(i, 3)) * (water ? 1 : 0.55);
        const t = age;
        const h = up * t - 5.5 * t * t;
        if (h < -0.05) continue;
        put(x + Math.cos(a) * out * t, y + h, z + Math.sin(a) * out * t * 0.6, water ? 0.16 : 0.12, (water ? 0.6 : 0.3) * (1 - age / 1.1));
      }
      if (!water) return;
      // The ring, spreading on the water.
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const r = 0.3 + 2.2 * age;
        put(x + Math.cos(a) * r, y + 0.02, z + Math.sin(a) * r * 0.55, 0.5 + 0.4 * age, 0.28 * (1 - age / 1.1));
      }
    },
    /** The wake behind it as it swims: two lines of foam opening from where it has been. */
    wake(gx: number, gz: number, y: number, from: { x: number; z: number }, to: { x: number; z: number }, since: number, length: number) {
      for (let i = 0; i < 9; i++) {
        const back = i * 0.14;
        const t = since - back;
        if (t < 0) continue;
        const k = smooth((t / length) * 1.08 - 0.04);
        const x = from.x + (to.x - from.x) * k - gx;
        const z = from.z + (to.z - from.z) * k - gz;
        const spread = 0.15 + back * 1.1;
        const along = Math.atan2(to.x - from.x, to.z - from.z);
        for (const side of [-1, 1]) {
          put(x + Math.cos(along) * spread * side, y + 0.03, z - Math.sin(along) * spread * side, 0.35 + back * 0.9, 0.2 * (1 - i / 9));
        }
      }
    },
    done() {
      mesh.count = used;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
  };
}
