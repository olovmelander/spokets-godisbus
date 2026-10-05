import { AdditiveBlending, Color, Group, MeshBasicMaterial } from 'three';
import type { ChapterData, PlaceId } from '../../sim/types';
import { quadBatch } from '../quads';
import { drawn, grows, heightAt, sequence } from './kit';

// --- effects: shafts of light, and what floats in them ------------------------------------------------------

export function effects(chapter: ChapterData, from: number, to: number, where: PlaceId) {
  const group = new Group();
  const next = sequence(71);
  // The forest has shafts of light and dust high in them; the garden has dew that glitters near the ground.
  const garden = where === 'garden';
  // What adds light, as one picture: a shaft on the left, and a dot for a mote on the right.
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
  });
  const shafts: { x: number; y: number; z: number; wide: number; turn: number; base: number; phase: number }[] = [];
  for (let x = from + next() * 6; x < to + 8 && where === 'forest'; x += 7 + next() * 8) {
    const wide = 2.4 + next() * 3;
    const high = Math.max(heightAt(chapter, x - 6), heightAt(chapter, x), heightAt(chapter, x + 6));
    shafts.push({ x, y: high + 10, z: -1.2 - next() * 4, wide, turn: 0.46 + next() * 0.08, base: 0.24 + next() * 0.14, phase: next() * 6.28 });
  }

  // Mist over the bog: long pale sheets that lie low over the water and drift.
  const sheets: { wide: number; tall: number; opacity: number; x: number; y: number; z: number; speed: number }[] = [];
  for (let i = 0; i < 6 && where === 'bog'; i++) {
    sheets.push({ wide: 22 + next() * 14, tall: 2.6 + next() * 1.8, opacity: 0.2 + next() * 0.14, x: next(), y: 0.5 + next() * 1.1, z: -2.5 - next() * 9, speed: 0.25 + next() * 0.4 });
  }
  // The farthest first: the sheets lie over one another.
  sheets.sort((a, b) => a.z - b.z);
  const mist = quadBatch(sheets.length, new MeshBasicMaterial({
    color: '#fff7e6', transparent: true, vertexColors: true, fog: false, depthWrite: false, map: drawn(64, 32, (c) => {
      const down = c.createLinearGradient(0, 0, 0, 32);
      down.addColorStop(0, 'rgba(255,255,255,0)');
      down.addColorStop(0.55, 'rgba(255,255,255,1)');
      down.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = down;
      c.fillRect(0, 0, 64, 32);
      c.globalCompositeOperation = 'destination-in';
      const across = c.createLinearGradient(0, 0, 64, 0);
      across.addColorStop(0, 'rgba(0,0,0,0)');
      across.addColorStop(0.3, 'rgba(0,0,0,1)');
      across.addColorStop(0.7, 'rgba(0,0,0,1)');
      across.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = across;
      c.fillRect(0, 0, 64, 32);
    }),
  }), true);
  for (const [i, sheet] of sheets.entries()) {
    mist.cell(i, 0, 0, 1, 1);
    mist.tint(i, 1, 1, 1, sheet.opacity);
  }
  mist.mesh.renderOrder = 2;
  if (sheets.length) group.add(mist.mesh);

  // Dust and pollen in the light: they drift slowly, and stay with the camera.
  const MOTES = where === 'dusk' ? 0 : 70;
  const seeds = Array.from({ length: MOTES }, () => ({ x: next(), y: next(), z: next(), speed: 0.3 + next() * 0.7, size: 0.03 + next() * 0.06 }));
  const SPAN = 30;
  // Everything that adds light is one batch, shafts and motes: where light is added the order does not matter.
  const light = quadBatch(shafts.length + MOTES, new MeshBasicMaterial({ map: lights, transparent: true, vertexColors: true, blending: AdditiveBlending, fog: false, depthWrite: false }), true);
  const gold = new Color('#ffeeb0');
  const pale = new Color(garden ? '#f2fbff' : '#fff6d0');
  for (const [i, shaft] of shafts.entries()) {
    light.put(i, shaft.x, shaft.y, shaft.z, Math.cos(shaft.turn) * shaft.wide / 2, Math.sin(shaft.turn) * shaft.wide / 2, -Math.sin(shaft.turn) * 13, Math.cos(shaft.turn) * 13);
    light.cell(i, 0, 0, 0.5, 1);
  }
  for (let i = 0; i < MOTES; i++) {
    light.cell(shafts.length + i, 0.625, 0, 0.25, 0.25);
    light.tint(shafts.length + i, pale.r, pale.g, pale.b, garden ? 0.95 : 0.7);
  }
  light.mesh.renderOrder = 3;
  if (light.count) group.add(light.mesh);

  function update(cameraX: number, groundY: number, clock: number): void {
    for (const [i, sheet] of sheets.entries()) {
      const window = 70;
      const along = (((sheet.x * window + clock * sheet.speed - cameraX) % window) + window) % window;
      mist.put(i, cameraX - window / 2 + along, groundY + sheet.y, sheet.z, sheet.wide / 2, 0, 0, sheet.tall / 2);
    }
    for (const [i, shaft] of shafts.entries()) light.tint(i, gold.r, gold.g, gold.b, shaft.base * (0.8 + 0.2 * Math.sin(clock * 0.6 + shaft.phase)));
    for (const [i, mote] of seeds.entries()) {
      // Each keeps its place in a window that follows the camera, and wraps round at its ends.
      const along = (((mote.x * SPAN + (garden ? 0 : clock * 0.12 * mote.speed) - cameraX) % SPAN) + SPAN) % SPAN;
      // Dust drifts and swells slowly; dew flashes, and only where something grows.
      const twinkle = garden
        ? (grows(chapter, cameraX - SPAN / 2 + along) ? Math.max(0, Math.sin(clock * 3.1 * mote.speed + i * 2.3)) ** 6 * 2.2 : 0)
        : 0.6 + 0.4 * Math.sin(clock * 1.7 * mote.speed + i * 2.3);
      const half = mote.size * twinkle / 2;
      light.put(
        shafts.length + i,
        cameraX - SPAN / 2 + along,
        garden ? heightAt(chapter, cameraX - SPAN / 2 + along) + 0.05 + mote.y * 1.3 : groundY + 0.3 + mote.y * 7 + Math.sin(clock * 0.5 * mote.speed + i) * 0.25,
        -5 + mote.z * 7.5,
        half, 0, 0, half,
      );
    }
  }
  return { group, update };
}
