import { AdditiveBlending, Color, Group, MeshBasicMaterial, Vector3, type Object3D } from 'three';
import type { ChapterData, PlaceId } from '../../sim/types';
import { quadBatch } from '../quads';
import { windAt } from '../wind';
import { standing } from './foreground';
import { KIT, drawn, grows, heightAt, sequence } from './kit';

// --- effects: shafts of light, what floats in them, what falls and flies, and the mist on the ground ------------

/** What falls and flies is small, slow and in nobody's way: dull colours, behind the path, and never red or gold. */
export const LIFE = { needle: '#6b4a2a', leaf: '#a39a4c', birch: '#a8913f', dwarf: '#8e7a44', wing: '#e6ecb4', gauze: '#f4f4ea', midge: '#3a3022', bee: '#2a2118', band: '#a08c46', tail: '#d9d6c6' };
/** The light's own colours, pale: warm by day, cool on the washed morning and under the moon. Never red, pink or gold. */
export const GLOW = {
  sun: '#ffeeb0', garden: '#fff4d6', bog: '#fff0d8', home: '#fff1d2', morning: '#eef4fa', moon: '#d8e2ff',
  dew: '#f2fbff', dust: '#fff6d0', pollen: '#fff7d8', fluff: '#f2f0e6', forestMist: '#eef2dc', gardenMist: '#f2f7fc', bogMist: '#ffffff',
};
/** The village's birch leaves as they fall (docs/visual-audit/byn.md row 16): how many are in the air, and how big. */
export const FALLING_BIRCH = { count: 9, long: 0.2, wide: 0.15 } as const;
/** How many leaves, needles and mist sheets each place has on High; Low draws 30 % and Mid 60 % (plan §6.5). */
export const AIR_COUNTS: Record<PlaceId, { falling: number; motes: number; sheets: number }> = {
  forest: { falling: 12, motes: 80, sheets: 5 }, garden: { falling: 8, motes: 48, sheets: 4 }, bog: { falling: 4, motes: 18, sheets: 6 },
  mountain: { falling: 3, motes: 30, sheets: 0 }, dusk: { falling: 0, motes: 0, sheets: 0 }, village: { falling: FALLING_BIRCH.count, motes: 24, sheets: 0 },
  home: { falling: 0, motes: 44, sheets: 0 },
};

/**
 * What the atmosphere (../lift/atmosphere.ts) tells the effects each frame, which the dressing's own update does not
 * know: the share of each count the tier draws; how much daylight there is (none at night, nor while a storm rages:
 * in its eye the moon's); how much of it the shafts' cards show (less under the rays of Mid and High); how hard a
 * storm rages, and how far its eye has opened. It is read a frame late.
 */
export interface AirMood { share: number; day: number; light: number; storm: number; calm: number }

export function effects(chapter: ChapterData, from: number, to: number, where: PlaceId, built: Object3D = new Group()) {
  const group = new Group();
  group.name = 'air';
  const mood: AirMood = { share: 1, day: chapter.storm ? 0 : 1, light: chapter.storm ? 0 : 1, storm: chapter.storm ? 1 : 0, calm: 0 };
  group.userData.mood = mood;
  const next = sequence(71);
  const forest = where === 'forest';
  const garden = where === 'garden';
  const bog = where === 'bog';
  const fell = where === 'mountain';
  const village = where === 'village';
  const home = where === 'home';
  // The morning after the storm: a cool clear light in the windows, and a breath of mist outside them.
  const morning = home && chapter.id === 'morgonen';
  const counts = AIR_COUNTS[where];
  // Everything here is one picture: a shaft on the left; then a dot for a mote, a leaf and a bumblebee; and mist.
  const lights = drawn(128, 128, (c) => {
    // A shaft is a few soft beams side by side, so that it has a body and is not a flat band.
    for (const [middle, wide, alpha] of [[32, 30, 0.55], [22, 9, 0.5], [40, 12, 0.45], [31, 4, 0.35]] as const) {
      const across = c.createLinearGradient(middle - wide, 0, middle + wide, 0);
      across.addColorStop(0, 'rgba(255,255,255,0)');
      across.addColorStop(0.5, `rgba(255,255,255,${alpha})`);
      across.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = across;
      c.fillRect(middle - wide, 0, wide * 2, 128);
    }
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
    // Mist: a few soft round clouds in a row, gone at every side of the cell.
    for (const [x, y, r, a] of [[96, 98, 30, 0.5], [82, 101, 18, 0.4], [110, 100, 18, 0.4], [96, 93, 14, 0.3]] as const) {
      const puff = c.createRadialGradient(x, y, 0, x, y, r);
      puff.addColorStop(0, `rgba(255,255,255,${a})`);
      puff.addColorStop(0.55, `rgba(255,255,255,${a * 0.45})`);
      puff.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = puff;
      c.fillRect(64, 64, 64, 64);
    }
  });
  const DOT: readonly [number, number, number, number] = [0.625, 0, 0.25, 0.25];
  const LEAF: typeof DOT = [0.515, 0.28, 0.225, 0.19];
  const BEE: typeof DOT = [0.75, 0.305, 0.22, 0.14];
  const MIST: typeof DOT = [0.5, 0.5, 0.5, 0.5];

  // --- the shafts of light ------------------------------------------------------------------------------------
  // In the forest through the crowns; in the garden through the birches, fewer and paler; over the bog soft and wide
  // in the mist; at home through each window, down onto the floor. Each is a broad card with a narrower core.
  interface Shaft { x: number; y: number; z: number; wide: number; long: number; turn: number; base: number; phase: number; lands: number; floor: boolean }
  const shafts: Shaft[] = [];
  // In the garden none falls across the house's wall, where a band of light would stand like a pane of glass.
  const walled = (x: number) => garden && !!chapter.house && x > chapter.house.from - 4 && x < chapter.house.to + 4;
  const beams = (step: () => number, wide: () => number, z: () => number, turn: () => number, base: () => number, long: number) => {
    for (let x = from + next() * 6; x < to + 8; x += step()) {
      const w = wide(), t = turn();
      if (walled(x)) continue;
      const high = Math.max(heightAt(chapter, x - 6), heightAt(chapter, x), heightAt(chapter, x + 6));
      // It comes down to the right, and lands about where a straight line from its middle meets the ground.
      shafts.push({ x, y: high + long * 0.38, z: z(), wide: w, long, turn: t, base: base(), phase: next() * 6.28, lands: x + Math.tan(t) * (high + long * 0.38 - heightAt(chapter, x + 5)), floor: false });
    }
  };
  if (forest) beams(() => 7 + next() * 8, () => 2.4 + next() * 3, () => -1.2 - next() * 4, () => 0.46 + next() * 0.08, () => 0.24 + next() * 0.14, 26);
  if (garden) beams(() => 15 + next() * 10, () => 2 + next() * 1.6, () => -2.4 - next() * 4.6, () => 0.42 + next() * 0.08, () => 0.14 + next() * 0.08, 22);
  if (bog) beams(() => 18 + next() * 10, () => 4 + next() * 3, () => -3 - next() * 7, () => 0.5 + next() * 0.1, () => 0.08 + next() * 0.05, 22);
  if (home && chapter.house) {
    // Through the windows of the room, not out of doors: from the glass down onto the floor in front of the wall.
    for (const x of chapter.house.windows) {
      if (chapter.outdoors !== undefined && x > chapter.outdoors - 3) continue;
      const turn = 0.6, sill = heightAt(chapter, x) + 6, long = 6 / Math.cos(turn);
      shafts.push({ x: x + Math.sin(turn) * long / 2, y: sill - 3, z: -8.6, wide: 5.1, long, turn, base: morning ? 0.38 : 0.34, phase: next() * 6.28, lands: x + Math.tan(turn) * 6, floor: true });
    }
  }
  const S = shafts.length;
  // Motes, a share of them in the shafts: dust under the spruces and at home, pollen in the garden, seed fluff over the bog.
  const M = counts.motes;
  const inShafts = S ? Math.round(M * (home ? 0.7 : garden ? 0.5 : bog ? 0.4 : 0.55)) : 0;
  const motes = Array.from({ length: M }, () => ({ x: next(), y: next(), z: next(), speed: 0.3 + next() * 0.7, size: 0.03 + next() * 0.06, drift: 0 }));
  const SPAN = 30;
  // Everything that adds light is one batch, shafts, glows and motes: where light is added the order does not matter.
  const light = quadBatch(S * 3 + M, new MeshBasicMaterial({ map: lights, transparent: true, vertexColors: true, blending: AdditiveBlending, fog: false, depthWrite: false }), true);
  const shine = new Color(forest ? GLOW.sun : garden ? GLOW.garden : bog ? GLOW.bog : morning ? GLOW.morning : GLOW.home);
  const moon = new Color(GLOW.moon);
  const outside = new Color(garden ? GLOW.dew : fell || bog ? GLOW.fluff : GLOW.dust);
  const inside = new Color(garden ? GLOW.pollen : bog ? GLOW.fluff : GLOW.dust);
  const tint = new Color();
  for (const [i, shaft] of shafts.entries()) {
    const ux = Math.cos(shaft.turn), uy = Math.sin(shaft.turn), half = shaft.long / 2;
    // At a window the beam keeps the window's level edges, and is sheared down towards the floor.
    if (shaft.floor) {
      light.put(i, shaft.x, shaft.y, shaft.z, shaft.wide / 2, 0, -uy * half, ux * half);
      light.put(S + i, shaft.x + 0.4, shaft.y, shaft.z + 0.1, shaft.wide * 0.3, 0, -uy * half, ux * half);
      // Where it falls the floor is lit: a soft patch lying on the boards.
      light.put(2 * S + i, shaft.lands, heightAt(chapter, shaft.lands) + 0.03, -6.8, shaft.wide * 0.55, 0, 0, 0, 1.3);
    } else {
      light.put(i, shaft.x, shaft.y, shaft.z, ux * shaft.wide / 2, uy * shaft.wide / 2, -uy * half, ux * half);
      light.put(S + i, shaft.x - 0.2, shaft.y, shaft.z + 0.15, ux * shaft.wide * 0.17, uy * shaft.wide * 0.17, -uy * half * 0.92, ux * half * 0.92);
      // Where it lands the moss and the grass are lit: a low wide glow on the ground, where things grow.
      if (grows(chapter, shaft.lands)) light.put(2 * S + i, shaft.lands, heightAt(chapter, shaft.lands) + 0.3, shaft.z + 0.2, shaft.wide * 0.35, 0, 0, 0.55);
    }
    light.cell(i, 0, 0, 0.5, 1);
    light.cell(S + i, 0, 0, 0.5, 1);
    light.cell(2 * S + i, DOT[0], DOT[1], DOT[2], DOT[3]);
  }
  for (let i = 0; i < M; i++) light.cell(3 * S + i, DOT[0], DOT[1], DOT[2], DOT[3]);
  light.mesh.renderOrder = 3;
  if (light.count) group.add(light.mesh);

  // --- what falls and flies -----------------------------------------------------------------------------------
  // A bumblebee and two brimstone butterflies in the garden; midges over the bog's water; and leaves and needles
  // falling. All of it is behind the path, so that none of it is ever in front of him, and dark or pale: a bright
  // speck beside a sweet would be taken for its glitter. The village's leaves fall out of doors only.
  const heads = garden ? standing(built, KIT.petal).map((head) => head.at).filter((head) => head.z > -3.6) : [];
  const FLYING = garden ? 7 : 0;
  const L = counts.falling;
  // Where the midges dance: over the water, every dozen EL of it. Three clouds of twenty are in the air.
  const swarms: { x: number; y: number }[] = [];
  for (const w of chapter.water ?? []) for (let x = w.from + 6; x < w.to; x += 12) swarms.push({ x, y: w.y });
  const midges = Array.from({ length: bog && swarms.length ? 60 : 0 }, () => ({ x: next(), y: next(), z: next(), speed: 0.3 + next() * 0.7, size: 0.03 + next() * 0.06 }));
  const life = quadBatch(FLYING + L + midges.length, new MeshBasicMaterial({ map: lights, transparent: true, vertexColors: true, fog: false, depthWrite: false }), true);
  // In the forest needles and small leaves first, then the birches' bigger ones; elsewhere the place's own leaf.
  const falling = Array.from({ length: L }, (_, i) => {
    const birch = (forest && i >= 5) || garden || village;
    const kind = forest || fell ? (birch ? 'birch' : i % 2 === 0 ? 'leaf' : 'needle') : bog ? 'dwarf' : 'birch';
    const [long, wide] = village ? [FALLING_BIRCH.long, FALLING_BIRCH.wide] : kind === 'birch' ? [0.16, 0.12] : kind === 'dwarf' ? [0.08, 0.07] : [kind === 'leaf' ? 0.07 : 0.065, 0.06];
    return { x: next(), z: -0.9 - next() * 3.2, every: 6 + next() * 4, phase: next(), kind, long, wide, drift: 0, height: next(), speed: 5 + next() * 3 };
  });
  const tints = { needle: new Color(LIFE.needle), leaf: new Color(LIFE.leaf), birch: new Color(LIFE.birch), dwarf: new Color(LIFE.dwarf), wing: new Color(LIFE.wing), gauze: new Color(LIFE.gauze), midge: new Color(LIFE.midge) };
  // The garden's first card is the bee and a midge is a dot; every other is a leaf, a needle or a wing.
  for (let i = 0; i < life.count; i++) {
    const cell = i >= FLYING + L ? DOT : garden && i === 0 ? BEE : LEAF;
    life.cell(i, cell[0], cell[1], cell[2], cell[3]);
    if (i >= FLYING + L) life.tint(i, tints.midge.r, tints.midge.g, tints.midge.b, 0.75);
  }
  // Under the shrubs' fringe and over what stands on the ground: before everything else that blends.
  life.mesh.renderOrder = -0.5;
  if (life.count) group.add(life.mesh);
  /** The bee: where it is, the flower it is on or on its way to, where it left from, and how long it stays. */
  const bee = { at: new Vector3(), on: -1, stay: 0, flown: 1, from: new Vector3(), far: 1 };
  const order = sequence(83);

  // --- mist on the ground -------------------------------------------------------------------------------------
  // Long pale sheets that lie low behind the path, a little in front of the far scenery, and drift: over the bog's
  // water, in the forest's morning, and as dew in the garden. Indoors none, but on the washed morning a breath of
  // it outside each window. In the storm none, but on the water in its eye.
  const sheets: { wide: number; tall: number; opacity: number; x: number; y: number; z: number; speed: number }[] = [];
  // A storm that never calms has none at all, so that it costs no draw.
  for (let i = 0; i < (chapter.storm && !chapter.storm.calm ? 0 : counts.sheets); i++) {
    sheets.push(bog
      ? { wide: 22 + next() * 14, tall: 2.6 + next() * 1.8, opacity: 0.2 + next() * 0.14, x: next(), y: 0.5 + next() * 1.1, z: -2.5 - next() * 9, speed: 0.25 + next() * 0.4 }
      : forest
        ? { wide: 18 + next() * 12, tall: 1.6 + next() * 1.2, opacity: 0.13 + next() * 0.09, x: next(), y: 0.2 + next() * 0.6, z: -3.5 - next() * 14, speed: 0.12 + next() * 0.2 }
        : { wide: 20 + next() * 12, tall: 1 + next() * 0.7, opacity: 0.06 + next() * 0.05, x: next(), y: 0.05 + next() * 0.25, z: -4 - next() * 10, speed: 0.1 + next() * 0.15 });
  }
  // The farthest first: the sheets lie over one another.
  sheets.sort((a, b) => a.z - b.z);
  const panes = morning ? chapter.house?.windows ?? [] : [];
  const mist = quadBatch(sheets.length + panes.length, new MeshBasicMaterial({ color: '#fff7e6', map: lights, transparent: true, vertexColors: true, fog: false, depthWrite: false }), true);
  const haze = new Color(forest ? GLOW.forestMist : bog ? GLOW.bogMist : GLOW.gardenMist);
  // A bog sheet is the shaft's picture laid on its side, densest along its middle; the others are soft clouds.
  for (let i = 0; i < sheets.length; i++) {
    if (bog) mist.cell(i, 0, 0, 0.5, 1);
    else mist.cell(i, MIST[0], MIST[1], MIST[2], MIST[3]);
  }
  for (const [i, x] of panes.entries()) {
    const at = sheets.length + i;
    mist.cell(at, MIST[0], MIST[1], MIST[2], MIST[3]);
    mist.put(at, x, heightAt(chapter, x) + 4.3, -8.93, 2.7, 0, 0, 1.1);
  }
  mist.mesh.renderOrder = 2;
  if (mist.count) group.add(mist.mesh);

  let before = 0;
  let gust = 0;
  const wrap = (v: number, span: number) => ((v % span) + span) % span;
  /** Nothing drawn: a quad of no size. */
  const off = (batch: typeof light, i: number) => batch.put(i, 0, -999, 0, 0, 0, 0, 0);

  function update(cameraX: number, groundY: number, clock: number, still = false): void {
    // With reduced motion asked for, time stands still for all of it, and nothing flies.
    const time = still ? 0 : clock;
    const dt = still ? 0 : Math.min(0.1, Math.max(0, clock - before));
    before = clock;
    const share = Math.min(1, Math.max(0.3, mood.share));
    // The storm puts the sun out; in its eye the moon comes, cool. Under the moon an additive card is dimmed four
    // times by the storm's own tint (aventyr2/render.ts), so it is lifted again here.
    const raging = Math.min(1, Math.max(0, mood.storm));
    const day = Math.min(1, Math.max(0, mood.day));
    // A room has no rays over its cards: its windows' beams keep all their light on every tier.
    const lit = home ? day : Math.min(1, Math.max(0, mood.light));
    const glow = chapter.storm ? tint.copy(moon).multiplyScalar(3) : shine;
    // How hard the wind blows here, slowly followed: more leaves are in the air while it does.
    const blowing = Math.min(1, Math.max(0, (Math.abs(windAt(cameraX)) - 1.6) / 2));
    gust += (blowing - gust) * Math.min(1, dt * (blowing > gust ? 1.5 : 0.4));

    for (const [i, sheet] of sheets.entries()) {
      const window = 70;
      const active = i < Math.ceil(sheets.length * Math.max(0.5, share));
      sheet.x += still ? 0 : windAt(cameraX) * 0.04 * dt / window;
      const along = wrap(sheet.x * window + time * sheet.speed - cameraX, window);
      if (bog) mist.put(i, cameraX - window / 2 + along, groundY + sheet.y, sheet.z, 0, sheet.tall / 2, -sheet.wide / 2, 0);
      else mist.put(i, cameraX - window / 2 + along, groundY + sheet.y, sheet.z, sheet.wide / 2, 0, 0, sheet.tall / 2);
      // In a storm only in its eye, and only over the water; and soft at both ends of its window.
      const ends = Math.min(1, along / 8, (window - along) / 8);
      const alpha = active ? sheet.opacity * ends * (chapter.storm ? mood.calm : 1) : 0;
      mist.tint(i, haze.r, haze.g, haze.b, alpha);
    }
    for (const [i] of panes.entries()) {
      // The morning's mist breathes slowly in the windows.
      mist.tint(sheets.length + i, 1, 1, 1, 0.28 + 0.06 * Math.sin(time * 0.4 + i * 1.7));
    }

    for (const [i, shaft] of shafts.entries()) {
      // A shaft breathes, and the light it leaves on the ground with it.
      const bright = shaft.base * (0.8 + 0.2 * Math.sin(time * 0.6 + shaft.phase)) * lit;
      light.tint(i, glow.r, glow.g, glow.b, bright);
      light.tint(S + i, glow.r, glow.g, glow.b, bright * 0.7);
      light.tint(2 * S + i, glow.r, glow.g, glow.b, bright * (shaft.floor ? 1.1 : 1.5));
    }

    // The motes in the shafts are dealt among the shafts by turns, each to the nearest of its own turn, so that one
    // only changes shaft far out of the picture.
    const turns = Math.min(S, home ? 3 : 4);
    const nearest: number[] = [];
    for (let k = 0; k < turns; k++) {
      let best = -1;
      for (let j = k; j < S; j += turns) if (best < 0 || Math.abs(shafts[j]!.x - cameraX) < Math.abs(shafts[best]!.x - cameraX)) best = j;
      nearest.push(best);
    }
    const shown = Math.round(M * share);
    for (const [i, mote] of motes.entries()) {
      const at = 3 * S + i;
      if (i >= shown || day <= 0) { off(light, at); continue; }
      if (i < inShafts) {
        // In a shaft: it floats slowly down its length, sways across it as the wind does, and is lit warm by it. A
        // shaft far out of the picture keeps its motes unseen.
        const shaft = shafts[nearest[i % turns]!]!;
        const near = Math.min(1, Math.max(0, (18 - Math.abs(shaft.x - cameraX)) / 4));
        const along = wrap(mote.y - time * 0.006 * mote.speed, 1) * 0.76 + 0.12;
        const across = (mote.x - 0.5) * 0.8 + Math.sin(time * 0.3 * mote.speed + i) * 0.08 + Math.max(-0.25, Math.min(0.25, windAt(shaft.x) * 0.03));
        const ux = shaft.floor ? 1 : Math.cos(shaft.turn), uy = shaft.floor ? 0 : Math.sin(shaft.turn);
        const half = shaft.long / 2, t = (along - 0.5) * 2;
        const x = shaft.x + ux * across * shaft.wide / 2 - Math.sin(shaft.turn) * half * t;
        const y = shaft.y + uy * across * shaft.wide / 2 + Math.cos(shaft.turn) * half * t;
        const size = mote.size * (home ? 1.4 : 1) * (0.7 + 0.3 * Math.sin(time * 1.3 * mote.speed + i * 2.3));
        light.put(at, x, y, Math.min(-0.85, shaft.z + (mote.z - 0.5) * 0.6), size / 2, 0, 0, size / 2);
        const bright = day * near * Math.min(1, along * 5, (1 - along) * 5);
        light.tint(at, (inside.r + glow.r) / 2, (inside.g + glow.g) / 2, (inside.b + glow.b) / 2, (garden ? 0.9 : 0.75) * bright);
        continue;
      }
      // Each drifts on the wind, a little, and never by itself with reduced motion.
      mote.drift += windAt(cameraX + mote.x * 20) * 0.05 * dt;
      const drift = (garden ? 0 : fell ? -time * (0.4 + mote.speed * 0.8) : bog ? time * 0.4 : time * 0.12 * mote.speed) + mote.drift;
      // Each keeps its place in a window that follows the camera, and wraps round at its ends.
      const x = cameraX - SPAN / 2 + wrap(mote.x * SPAN + drift - cameraX, SPAN);
      const y = garden ? heightAt(chapter, x) + 0.05 + mote.y * 1.3 : groundY + 0.3 + mote.y * (fell || bog ? 1.5 : home ? 6 : 7) + Math.sin(time * 0.5 * mote.speed + i) * 0.25;
      // Dew flashes, and only where something grows; dust drifts and swells slowly; fluff only drifts.
      const size = mote.size * (garden
        ? (grows(chapter, x) ? Math.max(0, Math.sin(time * 3.1 * mote.speed + i * 2.3)) ** 6 * 2.2 : 0)
        : fell || bog ? 1.1 : 0.6 + 0.4 * Math.sin(time * 1.7 * mote.speed + i * 2.3));
      light.put(at, x, y, -1 - mote.z * 6, size / 2, 0, 0, size / 2);
      // Dust, dew and fluff show by day, and not in the dark.
      light.tint(at, outside.r, outside.g, outside.b, (garden ? 0.95 : fell || bog ? 0.45 : 0.7) * day);
    }

    for (const [i, midge] of midges.entries()) {
      // Each cloud is 20 midges in a ball an EL wide, over the nearest water of every third place for one.
      const cloud = i % 3;
      let swarm = swarms[cloud] ?? swarms[0]!;
      for (let k = cloud; k < swarms.length; k += 3) if (Math.abs(swarms[k]!.x - cameraX) < Math.abs(swarm.x - cameraX)) swarm = swarms[k]!;
      const at = FLYING + L + i;
      if (i >= Math.round(midges.length * share) || chapter.storm) { off(life, at); continue; }
      life.put(
        at,
        swarm.x + (midge.x - 0.5) * 0.7 + Math.sin(time * (0.8 + midge.speed) + i) * 0.25,
        swarm.y + 0.55 + midge.y * 0.8 + Math.cos(time * (0.7 + midge.y) + i * 1.7) * 0.2,
        -1.6 - cloud * 0.9 + (midge.z - 0.5) * 0.7 + Math.sin(time * 0.9 * midge.speed + i * 2.1) * 0.25,
        midge.size * 0.55, 0, 0, midge.size * 0.55,
      );
    }

    // In the storm fewer leaves, blown fast across the picture against the way he goes; else they fall and tumble.
    const blown = raging > 0.5;
    const shownLeaves = Math.round(L * share * (blown ? 0.5 : 1));
    for (const [i, one] of falling.entries()) {
      const at = FLYING + i;
      if (i >= Math.max(L ? 1 : 0, shownLeaves)) { off(life, at); continue; }
      const tint = tints[one.kind as keyof typeof tints];
      // They ride the shared wind: a breath carries them on, a gust far.
      one.drift += windAt(cameraX + one.x * 26 - 13) * (blown ? 0.1 : 0.22) * dt;
      let x: number, y: number, alpha: number, turn: number;
      if (blown) {
        const across = wrap(time * one.speed + one.phase * 34, 34);
        x = cameraX + 17 - across;
        y = groundY + 0.4 + one.height * 4 + Math.sin(time * 2.2 + i) * 0.35;
        turn = time * 7 + i;
        alpha = Math.min(0.8, across / 2, (34 - across) / 2) * (raging - 0.5) * 2;
      } else {
        // From five EL up to the ground, over and over, each in its own time; it comes and goes softly.
        const fall = (time / one.every + one.phase) % 1;
        x = cameraX - 13 + wrap(one.x * 26 + one.drift - cameraX, 26) + Math.sin(time * 1.3 + i) * 0.35;
        y = groundY + 5 - fall * 5.2;
        turn = time * (one.kind === 'needle' ? 0.6 : 1.9) + i;
        // The last of them come out only while the wind blows hard.
        const extra = L > 3 && i >= Math.round(L * share * 0.67) ? gust : 1;
        alpha = Math.min(0.8, fall * 8, (1 - fall) * 12) * extra * (chapter.storm ? Math.max(0, 1 - raging * 2) : 1);
      }
      // A leaf tumbles, so it is seen now flat and now on edge; a needle is thin and only turns. A birch
      // leaf is as big as those that lie on the street.
      const wide = one.kind === 'needle' ? 0.008 : one.wide / 6 + one.wide * Math.abs(Math.cos(time * 2.3 + i));
      life.put(at, x, y, one.z, Math.cos(turn) * one.long, Math.sin(turn) * one.long, -Math.sin(turn) * wide, Math.cos(turn) * wide);
      // None falls indoors, in the shop.
      const out = !chapter.shop || x < chapter.shop.door - 1;
      life.tint(at, tint.r, tint.g, tint.b, still || !out ? 0 : alpha);
    }

    if (FLYING) {
      // The bee works the dandelions nearest him: two seconds on each, then on to another. In a storm it is away.
      const near = chapter.storm ? [] : heads.filter((head) => Math.abs(head.x - cameraX) < 7);
      if (bee.on < 0 && near.length) {
        bee.on = heads.indexOf(near[0]!);
        bee.at.copy(near[0]!);
      }
      bee.stay -= dt;
      const others = near.filter((head) => head !== heads[bee.on]);
      if (bee.on >= 0 && bee.stay < 0 && bee.flown >= 1 && others.length) {
        bee.on = heads.indexOf(others[Math.floor(order() * others.length)]!);
        bee.from.copy(bee.at);
        bee.far = Math.max(0.6, bee.at.distanceTo(heads[bee.on]!));
        bee.flown = 0;
      }
      const to = chapter.storm ? undefined : heads[bee.on];
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
        const x = cameraX - 26 + wrap(b * 23 + time * (0.9 + b * 0.25) - cameraX, 52);
        const y = groundY + 1.7 + b * 0.5 + Math.sin(time * 0.7 + b * 2) * 0.45 + Math.sin(time * 4.6 + b) * 0.07;
        const open = Math.abs(Math.sin(time * 6.5 + b));
        for (const side of [-1, 1]) {
          const i = 4 + b * 2 + (side + 1) / 2 - 1;
          life.put(i, x + side * 0.07 * open, y + 0.06, -4.2 - b, 0.07 * open + 0.01, side * 0.05, -side * 0.03, 0.09);
          life.tint(i, tints.wing.r, tints.wing.g, tints.wing.b, still || chapter.storm ? 0 : 0.9);
        }
      }
    }
  }
  return { group, update, mood };
}
