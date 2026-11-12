import { AdditiveBlending, Color, Group, InstancedMesh, type Mesh, MeshBasicMaterial, type MeshStandardMaterial, Object3D, PlaneGeometry } from 'three';
import type { ChapterData, Spot } from '../../sim/types';
import { glowTexture } from '../../render/glow';
import type { BuildingDef } from './buildings';

/**
 * The beaver at its lodge in Älven (art/blender/a2-creatures.py, `baver`), and its life. It sits on the far bank by
 * its gnawed stumps with a birch stick in its paws, gnawing. As Elof comes along the bank it stops, and looks at him;
 * it thumps its tail on the ground, turns, and goes off into its lodge at the foot of it. When he comes up onto the
 * lodge's roof it comes out once more at the very top of the lodge, through the lodge from below (Olov, 12 November
 * 2026: "Bävern kan synas en gång till högst uppe på hyddan, så den går där nerifrån, genom hyddan och kommer ut på
 * toppen"): it climbs out of the sticks, sits up, looks at him and thumps the roof with its tail. When he is down by
 * the lake it goes back in, out of its lodge under the water, and swims out over the lake, low in the water with a
 * wake behind it, slaps the water with its tail and dives. If he goes back along the bank, it is sitting there again.
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
/** Where it goes into its lodge, from where it sat. */
const BEHIND = { x: 4.8, z: -4.6 };
/**
 * The top of the lodge's mud, in the lodge model's own space at the size it is made (art/blender/a2-buildings.py,
 * `baverhydda`, 18 across): where its crest is highest, a little behind its middle. The lodge's roof where Elof walks
 * begins `ROOF` to the left of its middle, and he is past it, down by the lake, `PAST` to the right.
 */
const SUMMIT = { x: -0.25, y: 7.85, z: -1.2 };
const LODGE_SIZE = 18;
const ROOF = -2.6;
const PAST = 9;
/** How long it takes to climb out on top, the least it stays there, and how long it takes to go back in. */
const RISE = 0.9;
const STAYS = 1.6;
const DUCK = 0.6;
/** How long it is out of sight between going in at the top and coming up in the lake: through its lodge and out under the water. */
const THROUGH = 1.2;
/** When on the roof it thumps its tail, after it has sat up. */
const THUMP = 1.1;
/** Without a lodge: how far past where it sat he must be for it to swim. */
const HOME = 9;
/** Its swim out over the lake from the shore by its lodge: how long, how long it takes to come up, and the dive. */
const SWIM = 7;
const SURFACE = 0.6;
const DIVE = 1.4;

const smooth = (t: number) => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k); };

type Phase = 'gnaw' | 'look' | 'slap' | 'go' | 'gone' | 'rise' | 'top' | 'duck' | 'swim' | 'under';

export function beaverLife(spot: Spot, group: Group, model: Object3D, water: () => NonNullable<ChapterData['water']>, elof: Watcher, lodgeOf: () => BuildingDef | undefined = () => undefined): { group: Group; update(used: boolean, clock: number, dt: number): void } {
  const home = { x: spot.at.x, y: spot.at.y };
  // The lake it swims out over: the first open water past where it sits, known once the chapter's picture is built.
  let lake: NonNullable<ChapterData['water']>[number] | undefined;
  let swimFrom: { x: number; z: number } | null = null;
  let swimTo: { x: number; z: number } | null = null;
  // The lodge's top, in the chapter's own x, y and z, and where on the path he is on its roof and past it.
  let lodge: { top: { x: number; y: number; z: number }; roof: number; past: number } | null = null;
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
        // From the shore by its lodge, where its way out under the water comes up, out over the open lake.
        if (lake) { swimFrom = { x: lake.from + 0.9, z: -5.2 }; swimTo = { x: lake.from + 4.8, z: -9.5 }; }
      }
      if (!lodge) {
        const def = lodgeOf();
        const fit = (def?.width ?? LODGE_SIZE) / LODGE_SIZE;
        if (def) lodge = { top: { x: def.x + SUMMIT.x * fit, y: (def.y ?? 0) + SUMMIT.y * fit, z: def.z + SUMMIT.z * fit }, roof: def.x + ROOF * fit, past: def.x + PAST * fit };
      }
      // The outer group stands where the chapter puts it, at its z: everything here moves `model` within it.
      const x0 = group.position.x;
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
      else if (phase === 'gone' && lodge && near >= lodge.roof) next('rise');
      else if (phase === 'gone' && !lodge && swimFrom && near > home.x + HOME) next('swim');
      else if (phase === 'rise' && since > RISE) next('top');
      else if (phase === 'top' && since > STAYS && lodge && near > lodge.past) next('duck');
      else if (phase === 'duck' && since > DUCK + THROUGH && swimFrom) next('swim');
      else if (phase === 'swim' && since > SWIM) next('under');
      // Back along the bank, far enough that it would not be seen coming back: it is sitting there again.
      if (phase !== 'gnaw' && phase !== 'look' && phase !== 'slap' && phase !== 'go' && near < home.x - NOTICE - 6) next('gnaw');
      if (phase === 'look' && near < home.x - NOTICE - 2) next('gnaw');
      model.visible = phase !== 'gone' && !(phase === 'duck' && since > DUCK) && !(phase === 'under' && since > DIVE);
      model.position.set(0, 0, 0);
      model.scale.set(1, 1, 1);
      model.rotation.set(0, facing, 0);
      if (head) head.rotation.set(0, 0, 0);
      if (tail) tail.rotation.set(0, 0, 0);
      if (stick) { stick.rotation.set(0, 0, 0); stick.position.x = 0; }
      effects.clear();
      /** Where the lodge's top is from the group, and the way that faces him there. */
      const onTop = lodge ? { x: lodge.top.x - x0, y: lodge.top.y - home.y, z: lodge.top.z - z0 } : null;
      const towardHim = lodge ? Math.atan2(near - lodge.top.x, -lodge.top.z) : 0;
      if (elof.still) {
        // With less motion it sits and gnaws without moving; it still goes as he comes, and is on its lodge's top
        // while he is on the roof, sitting still there.
        model.visible = phase === 'gnaw' || phase === 'look' || ((phase === 'rise' || phase === 'top') && !!onTop);
        model.rotation.y = SITS;
        if ((phase === 'rise' || phase === 'top') && onTop) {
          model.position.set(onTop.x, onTop.y, onTop.z);
          model.rotation.y = towardHim;
        }
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
        // It turns, drops forward onto all fours and waddles off, rocking, into its lodge.
        const way = Math.atan2(BEHIND.x, BEHIND.z);
        const turned = smooth(since / TURN);
        facing = SITS + (way - SITS) * turned;
        const k = smooth((since - TURN) / WADDLE);
        const rock = since > TURN ? Math.sin((since - TURN) * 9) : 0;
        model.position.set(BEHIND.x * k, Math.abs(rock) * 0.06, BEHIND.z * k);
        model.rotation.set(0.55 * turned, facing, 0.1 * rock, 'YXZ');
        if (tail) tail.rotation.x = -0.55 * turned + 0.08 * rock;
        if (stick) stick.rotation.x = 0.4;
      } else if ((phase === 'rise' || phase === 'top' || phase === 'duck') && onTop) {
        // On the very top of its lodge, facing out over the roof towards him: it climbs up out of the sticks, nose
        // first, and sits up; it looks at him, sniffs, and thumps the roof once with its tail; and goes back in.
        facing = towardHim;
        const up = phase === 'rise' ? smooth(since / RISE) : phase === 'top' ? 1 : 1 - smooth(since / DUCK);
        const sunk = 1.15 * (1 - up);
        const tilt = 0.75 * (1 - up);
        model.position.set(onTop.x, onTop.y - sunk, onTop.z);
        model.rotation.set(tilt, facing, 0, 'YXZ');
        if (phase === 'top') model.scale.set(1, 1 + 0.012 * Math.sin(clock * 2.4), 1);
        if (head) {
          // Its head comes up and round to him as it sits up, and sniffs the air at him.
          const k = phase === 'top' ? 1 : up;
          head.rotation.x = -0.2 * k + (phase === 'top' ? 0.05 * Math.sin(clock * 9) * (Math.sin(clock * 0.7) > 0.3 ? 1 : 0) : 0);
          head.rotation.y = 0.1 * Math.sin(clock * 0.6) * k;
        }
        if (phase === 'top' && since > THUMP) {
          const t = since - THUMP;
          const lift = t < 0.3 ? smooth(t / 0.3) : t < 0.4 ? 1 : t < 0.48 ? 1 - (t - 0.4) / 0.08 : 0;
          if (tail) tail.rotation.x = 1.05 * lift;
          // Bits of dry mud off the sticks where it lands.
          if (t > 0.48) effects.burst(onTop.x - 1.6 * Math.sin(facing), onTop.y + 0.05, onTop.z - 1.6 * Math.cos(facing), t - 0.48, false);
        }
        if (stick) stick.rotation.x = 0.4;
      } else if ((phase === 'swim' || phase === 'under') && swimFrom && swimTo && lake) {
        // Out over the lake: low in the water, its head up, its tail trailing and sculling, a wake opening behind it.
        const k = phase === 'swim' ? since / SWIM : 1;
        const ease = smooth(k * 1.08 - 0.04);
        const x = swimFrom.x + (swimTo.x - swimFrom.x) * ease;
        const z = swimFrom.z + (swimTo.z - swimFrom.z) * ease;
        const surface = lake.y - home.y;
        facing = Math.atan2(swimTo.x - swimFrom.x, swimTo.z - swimFrom.z);
        // It comes up from its way out under the water, a ring spreading where it does.
        let sink = phase === 'swim' ? 1.2 * (1 - smooth(since / SURFACE)) : 0;
        let tilt = 1.25;
        let tailUp = 0;
        if (phase === 'swim' && since < SURFACE + 0.9) effects.burst(x - x0, surface, z - z0, since * 0.6, true, false);
        if (phase === 'under') {
          // Out on the lake: the tail up and down on the water, a slap and a splash, and it dives.
          const t = since;
          tailUp = t < 0.25 ? smooth(t / 0.25) : t < 0.33 ? 1 - (t - 0.25) / 0.08 : 0;
          if (t > 0.33) {
            const down = smooth((t - 0.45) / 0.8);
            tilt = 1.25 + 0.7 * down;
            sink = 1.6 * down;
            effects.burst(x - x0 - 0.9 * Math.sin(facing), surface, z - z0 - 0.9 * Math.cos(facing), t - 0.33, true);
          }
        }
        model.position.set(x - x0, surface - 0.62 - sink + 0.03 * Math.sin(clock * 2.2), z - z0);
        model.rotation.set(tilt, facing, 0.04 * Math.sin(clock * 1.7), 'YXZ');
        if (head) { head.rotation.x = -0.95; head.rotation.y = 0.12 * Math.sin(clock * 0.8); }
        if (tail) { tail.rotation.x = -1.2 + 1.4 * tailUp; tail.rotation.y = 0.32 * Math.sin(clock * 5.5); }
        if (phase === 'swim' && since > SURFACE) effects.wake(x0, z0, surface, swimFrom, swimTo, since, SWIM);
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
    /**
     * A tail's slap, `age` seconds ago, at (x, y, z) in the group: drops thrown up and out, and on water a ring. Without
     * `drops`, only the ring: where it comes up quietly.
     */
    burst(x: number, y: number, z: number, age: number, water: boolean, drops = true) {
      if (age > 1.1) return;
      for (let i = 0; drops && i < 16; i++) {
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
