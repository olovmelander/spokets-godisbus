import { AdditiveBlending, Color, Group, MeshBasicMaterial, Vector3, type Object3D } from 'three';
import type { ChapterData, PlaceId } from '../../sim/types';
import { quadBatch } from '../quads';
import { windAt } from '../wind';
import { standing } from './foreground';
import { KIT, drawn, grows, heightAt, sequence } from './kit';

// --- effects: shafts of light, what floats in them, and what flies -------------------------------------------

/** What falls and flies is small, slow and in nobody's way: dull colours, behind the path, and never red or gold. */
export const LIFE = { needle: '#6b4a2a', leaf: '#a39a4c', birch: '#a8913f', wing: '#e6ecb4', gauze: '#f4f4ea', midge: '#3a3022', bee: '#2a2118', band: '#a08c46', tail: '#d9d6c6' };
/** The village's birch leaves as they fall (docs/visual-audit/byn.md row 16): how many are in the air, and how big. */
export const FALLING_BIRCH = { count: 9, long: 0.2, wide: 0.15 } as const;

export function effects(chapter: ChapterData, from: number, to: number, where: PlaceId, built: Object3D = new Group()) {
  const group = new Group();
  const next = sequence(71);
  // The forest has shafts of light and dust high in them; the garden has dew that glitters near the ground.
  const garden = where === 'garden';
  const bog = where === 'bog';
  const fell = where === 'mountain';
  const village = where === 'village';
  // Everything here is one picture: a shaft on the left; then a dot for a mote, a leaf and a bumblebee.
  const lights = drawn(128, 128, (c) => {
    const across = c.createLinearGradient(0, 0, 64, 0);
    across.addColorStop(0, 'rgba(255,255,255,0)');
    across.addColorStop(0.5, 'rgba(255,255,255,1)');
    across.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = across;
    c.fillRect(0, 0, 64, 128);
    // It fades towards the ground.
    c.globalCompositeOperation = 'destination-in';
    const down = c.createLinearGradient(0, 0, 0, 128);
    down.addColorStop(0, 'rgba(0,0,0,0)');
    down.addColorStop(0.2, 'rgba(0,0,0,1)');
    down.addColorStop(0.8, 'rgba(0,0,0,0.8)');
    down.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = down;
    c.fillRect(0, 0, 64, 128);
    c.globalCompositeOperation = 'source-over';
    const dot = c.createRadialGradient(96, 16, 1, 96, 16, 15);
    dot.addColorStop(0, 'rgba(255,255,255,1)');
    dot.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = dot;
    c.fillRect(80, 0, 32, 32);
    // A leaf, a wing, a needle: white, and coloured by its card.
    c.fillStyle = '#fff';
    c.beginPath();
    c.moveTo(66, 48);
    c.quadraticCurveTo(78, 37, 94, 48);
    c.quadraticCurveTo(78, 59, 66, 48);
    c.fill();
    // A bumblebee: dark, with two dull bands and a pale tail.
    for (const [ink, x, wide] of [[LIFE.tail, 104, 6], [LIFE.bee, 112, 11], [LIFE.band, 109, 2.5], [LIFE.band, 116, 2.5]] as const) {
      c.fillStyle = ink;
      c.beginPath();
      c.ellipse(x, 48, wide, wide > 10 ? 7 : 6, 0, 0, Math.PI * 2);
      c.fill();
    }
  });
  const DOT: readonly [number, number, number, number] = [0.625, 0, 0.25, 0.25];
  const LEAF: typeof DOT = [0.515, 0.28, 0.225, 0.19];
  const BEE: typeof DOT = [0.75, 0.305, 0.22, 0.14];

  const shafts: { x: number; y: number; z: number; wide: number; turn: number; base: number; phase: number; lands: number }[] = [];
  for (let x = from + next() * 6; x < to + 8 && where === 'forest'; x += 7 + next() * 8) {
    const wide = 2.4 + next() * 3;
    const high = Math.max(heightAt(chapter, x - 6), heightAt(chapter, x), heightAt(chapter, x + 6));
    const turn = 0.46 + next() * 0.08;
    // It comes down to the right, and lands about where a straight line from its middle meets the ground.
    shafts.push({ x, y: high + 10, z: -1.2 - next() * 4, wide, turn, base: 0.24 + next() * 0.14, phase: next() * 6.28, lands: x + Math.tan(turn) * (high + 10 - heightAt(chapter, x + 5)) });
  }

  // Mist over the bog: long pale sheets that lie low over the water and drift.
  const sheets: { wide: number; tall: number; opacity: number; x: number; y: number; z: number; speed: number }[] = [];
  for (let i = 0; i < 6 && bog; i++) {
    sheets.push({ wide: 22 + next() * 14, tall: 2.6 + next() * 1.8, opacity: 0.2 + next() * 0.14, x: next(), y: 0.5 + next() * 1.1, z: -2.5 - next() * 9, speed: 0.25 + next() * 0.4 });
  }
  // The farthest first: the sheets lie over one another.
  sheets.sort((a, b) => a.z - b.z);
  // A sheet is the shaft's picture laid on its side: densest along its middle, and gone at its ends.
  const mist = quadBatch(sheets.length, new MeshBasicMaterial({ color: '#fff7e6', map: lights, transparent: true, vertexColors: true, fog: false, depthWrite: false }), true);
  for (const [i, sheet] of sheets.entries()) {
    mist.cell(i, 0, 0, 0.5, 1);
    mist.tint(i, 1, 1, 1, sheet.opacity);
  }
  mist.mesh.renderOrder = 2;
  if (sheets.length) group.add(mist.mesh);

  // What floats in the light, and stays with the camera. In the forest it is dust, high in the shafts; in
  // the garden dew, near the ground; over the bog a few seeds of cotton grass, and on the mountain seed
  // fluff, both low and blown along. Nothing floats up into an open sky, where it would be a star by day.
  // In the village fewer: there the birches' leaves fall through the sun instead.
  const MOTES = where === 'dusk' ? 0 : fell ? 30 : bog ? 10 : village ? 24 : 70;
  const mote = () => ({ x: next(), y: next(), z: next(), speed: 0.3 + next() * 0.7, size: 0.03 + next() * 0.06 });
  const seeds = Array.from({ length: MOTES }, mote);
  const SPAN = 30;
  // Everything that adds light is one batch, shafts and motes: where light is added the order does not matter.
  const light = quadBatch(shafts.length * 2 + MOTES, new MeshBasicMaterial({ map: lights, transparent: true, vertexColors: true, blending: AdditiveBlending, fog: false, depthWrite: false }), true);
  const gold = new Color('#ffeeb0');
  const pale = new Color(garden ? '#f2fbff' : '#fff6d0');
  for (const [i, shaft] of shafts.entries()) {
    light.put(i, shaft.x, shaft.y, shaft.z, Math.cos(shaft.turn) * shaft.wide / 2, Math.sin(shaft.turn) * shaft.wide / 2, -Math.sin(shaft.turn) * 13, Math.cos(shaft.turn) * 13);
    light.cell(i, 0, 0, 0.5, 1);
    // Where it lands the moss and the grass are lit: a low wide glow on the ground, where things grow.
    if (grows(chapter, shaft.lands)) light.put(MOTES + shafts.length + i, shaft.lands, heightAt(chapter, shaft.lands) + 0.3, shaft.z + 0.2, shaft.wide * 0.35, 0, 0, 0.55);
    light.cell(MOTES + shafts.length + i, DOT[0], DOT[1], DOT[2], DOT[3]);
  }
  for (let i = 0; i < MOTES; i++) {
    light.cell(shafts.length + i, DOT[0], DOT[1], DOT[2], DOT[3]);
    light.tint(shafts.length + i, pale.r, pale.g, pale.b, garden ? 0.95 : fell || bog ? 0.45 : 0.7);
  }
  light.mesh.renderOrder = 3;
  if (light.count) group.add(light.mesh);

  // What falls and flies: needles and a leaf now and then in the forest; a bumblebee and two brimstone
  // butterflies in the garden; midges over the bog's water. All of it is behind the path, so that none of it
  // is ever in front of him, and dark or pale: a bright speck beside a sweet would be taken for its glitter.
  // In the village the yard's birches drop their leaves, out of doors only.
  const FALLING = where === 'forest' ? 5 : village ? FALLING_BIRCH.count : 0;
  const heads = garden ? standing(built, KIT.petal).map((head) => head.at).filter((head) => head.z > -3.6) : [];
  const FLYING = garden ? 7 : 0;
  // Where the midges dance: over the water, every dozen EL of it. Three clouds of twenty are in the air.
  const swarms: { x: number; y: number }[] = [];
  for (const w of chapter.water ?? []) for (let x = w.from + 6; x < w.to; x += 12) swarms.push({ x, y: w.y });
  const midges = Array.from({ length: bog && swarms.length ? 60 : 0 }, mote);
  const life = quadBatch(FALLING + FLYING + midges.length, new MeshBasicMaterial({ map: lights, transparent: true, vertexColors: true, fog: false, depthWrite: false }), true);
  const falling = Array.from({ length: FALLING }, (_, i) => ({ x: next(), z: -0.9 - next() * 3.2, every: 6 + next() * 4, phase: next(), leaf: village || i % 2 === 0 }));
  const tints = { needle: new Color(LIFE.needle), leaf: new Color(village ? LIFE.birch : LIFE.leaf), wing: new Color(LIFE.wing), gauze: new Color(LIFE.gauze), midge: new Color(LIFE.midge) };
  // The garden's first card is the bee and a midge is a dot; every other is a leaf, a needle or a wing.
  for (let i = 0; i < life.count; i++) {
    const cell = bog ? DOT : garden && i === 0 ? BEE : LEAF;
    life.cell(i, cell[0], cell[1], cell[2], cell[3]);
    if (bog) life.tint(i, tints.midge.r, tints.midge.g, tints.midge.b, 0.75);
  }
  // Under the shrubs' fringe and over what stands on the ground: before everything else that blends.
  life.mesh.renderOrder = -0.5;
  if (life.count) group.add(life.mesh);
  /** The bee: where it is, the flower it is on or on its way to, where it left from, and how long it stays. */
  const bee = { at: new Vector3(), on: -1, stay: 0, flown: 1, from: new Vector3(), far: 1 };
  const order = sequence(83);
  let before = 0;

  function update(cameraX: number, groundY: number, clock: number, still = false): void {
    // With reduced motion asked for, time stands still for all of it, and nothing flies.
    const time = still ? 0 : clock;
    const dt = Math.min(0.1, Math.max(0, clock - before));
    before = clock;
    for (const [i, sheet] of sheets.entries()) {
      const window = 70;
      const along = (((sheet.x * window + time * sheet.speed - cameraX) % window) + window) % window;
      mist.put(i, cameraX - window / 2 + along, groundY + sheet.y, sheet.z, 0, sheet.tall / 2, -sheet.wide / 2, 0);
    }
    for (const [i, shaft] of shafts.entries()) {
      // A shaft breathes, and the light it leaves on the ground with it.
      const bright = shaft.base * (0.8 + 0.2 * Math.sin(time * 0.6 + shaft.phase));
      light.tint(i, gold.r, gold.g, gold.b, bright);
      light.tint(MOTES + shafts.length + i, gold.r, gold.g, gold.b, bright * 1.5);
    }
    for (const [i, mote] of seeds.entries()) {
      // Each keeps its place in a window that follows the camera, and wraps round at its ends.
      const drift = garden ? 0 : fell ? -time * (0.4 + mote.speed * 0.8) : bog ? time * 0.4 : time * 0.12 * mote.speed;
      const x = cameraX - SPAN / 2 + (((mote.x * SPAN + drift - cameraX) % SPAN) + SPAN) % SPAN;
      const y = garden ? heightAt(chapter, x) + 0.05 + mote.y * 1.3 : groundY + 0.3 + mote.y * (fell || bog ? 1.5 : 7) + Math.sin(time * 0.5 * mote.speed + i) * 0.25;
      // Dust drifts and swells slowly; dew flashes, and only where something grows; fluff only drifts.
      const size = mote.size * (garden
        ? (grows(chapter, x) ? Math.max(0, Math.sin(time * 3.1 * mote.speed + i * 2.3)) ** 6 * 2.2 : 0)
        : fell || bog ? 1.1 : 0.6 + 0.4 * Math.sin(time * 1.7 * mote.speed + i * 2.3));
      light.put(shafts.length + i, x, y, -5 + mote.z * 7.5, size / 2, 0, 0, size / 2);
    }
    for (const [i, midge] of midges.entries()) {
      // Each cloud is 20 midges in a ball an EL wide, over the nearest water of every third place for one.
      const cloud = i % 3;
      let swarm = swarms[cloud] ?? swarms[0]!;
      for (let k = cloud; k < swarms.length; k += 3) if (Math.abs(swarms[k]!.x - cameraX) < Math.abs(swarm.x - cameraX)) swarm = swarms[k]!;
      life.put(
        i,
        swarm.x + (midge.x - 0.5) * 0.7 + Math.sin(time * (0.8 + midge.speed) + i) * 0.25,
        swarm.y + 0.55 + midge.y * 0.8 + Math.cos(time * (0.7 + midge.y) + i * 1.7) * 0.2,
        -1.6 - cloud * 0.9 + (midge.z - 0.5) * 0.7 + Math.sin(time * 0.9 * midge.speed + i * 2.1) * 0.25,
        midge.size * 0.55, 0, 0, midge.size * 0.55,
      );
    }

    for (const [i, one] of falling.entries()) {
      // From five EL up to the ground, over and over, each in its own time; it comes and goes softly.
      const fall = (time / one.every + one.phase) % 1;
      const x = cameraX - 13 + (((one.x * 26 - cameraX) % 26) + 26) % 26 + Math.sin(time * 1.3 + i) * 0.35 + windAt(cameraX) * 0.1;
      const turn = time * (one.leaf ? 1.9 : 0.6) + i;
      // A leaf tumbles, so it is seen now flat and now on edge; a needle is thin and only turns. A birch
      // leaf is as big as those that lie on the street.
      const [long, flat] = village ? [FALLING_BIRCH.long, FALLING_BIRCH.wide] : [one.leaf ? 0.07 : 0.065, 0.06];
      const wide = one.leaf ? flat / 6 + flat * Math.abs(Math.cos(time * 2.3 + i)) : 0.008;
      life.put(i, x, groundY + 5 - fall * 5.2, one.z, Math.cos(turn) * long, Math.sin(turn) * long, -Math.sin(turn) * wide, Math.cos(turn) * wide);
      const tint = one.leaf ? tints.leaf : tints.needle;
      // None falls indoors, in the shop.
      const out = !chapter.shop || x < chapter.shop.door - 1;
      life.tint(i, tint.r, tint.g, tint.b, still || !out ? 0 : Math.min(0.8, fall * 8, (1 - fall) * 12));
    }

    if (FLYING) {
      // The bee works the dandelions nearest him: two seconds on each, then on to another.
      const near = heads.filter((head) => Math.abs(head.x - cameraX) < 7);
      if (bee.on < 0 && near.length) {
        bee.on = heads.indexOf(near[0]!);
        bee.at.copy(near[0]!);
      }
      bee.stay -= still ? 0 : dt;
      const others = near.filter((head) => head !== heads[bee.on]);
      if (bee.on >= 0 && bee.stay < 0 && bee.flown >= 1 && others.length) {
        bee.on = heads.indexOf(others[Math.floor(order() * others.length)]!);
        bee.from.copy(bee.at);
        bee.far = Math.max(0.6, bee.at.distanceTo(heads[bee.on]!));
        bee.flown = 0;
      }
      const to = heads[bee.on];
      const wings = bee.flown < 1;
      if (to) {
        // The head it sits on nods in the wind, and the bee with it.
        const goal = to.x + windAt(to.x) * 0.045;
        if (wings) {
          // A little over an EL a second, and faster when its flowers are far behind him.
          bee.flown = Math.min(1, bee.flown + dt * (1.1 / bee.far + 0.2));
          const t = bee.flown * bee.flown * (3 - 2 * bee.flown);
          bee.at.lerpVectors(bee.from, to, t);
          bee.at.y += Math.sin(t * Math.PI) * 0.35;
          if (bee.flown >= 1) bee.stay = 2;
        } else bee.at.set(goal, to.y, to.z);
      }
      const size = to ? 0.085 : 0;
      life.put(0, bee.at.x, bee.at.y + 0.19, bee.at.z + 0.05, size, 0, 0, size * 0.62);
      // Its wings blur when it flies and lie folded when it sits.
      for (const side of [-1, 1]) {
        const beat = wings ? Math.sin(time * 38) * 0.5 : 0.75;
        life.put(1.5 + side / 2, bee.at.x - 0.02, bee.at.y + 0.25, bee.at.z + 0.05, size * 0.75, size * 0.5 * side * beat, -size * 0.2 * side * beat, size * 0.3);
        life.tint(1.5 + side / 2, tints.gauze.r, tints.gauze.g, tints.gauze.b, wings ? 0.35 : 0.55);
      }
      // Two brimstones cross far behind him now and then, each as two pale wings that open and close.
      for (let b = 0; b < 2; b++) {
        const x = cameraX - 26 + (((b * 23 + time * (0.9 + b * 0.25) - cameraX) % 52) + 52) % 52;
        const y = groundY + 1.7 + b * 0.5 + Math.sin(time * 0.7 + b * 2) * 0.45 + Math.sin(time * 4.6 + b) * 0.07;
        const open = Math.abs(Math.sin(time * 6.5 + b));
        for (const side of [-1, 1]) {
          const i = 4 + b * 2 + (side + 1) / 2 - 1;
          life.put(i, x + side * 0.07 * open, y + 0.06, -4.2 - b, 0.07 * open + 0.01, side * 0.05, -side * 0.03, 0.09);
          life.tint(i, tints.wing.r, tints.wing.g, tints.wing.b, still ? 0 : 0.9);
        }
      }
    }
  }
  return { group, update };
}
