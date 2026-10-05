import { Group, Mesh, MeshBasicMaterial, PlaneGeometry, type CanvasTexture } from 'three';
import type { ChapterData } from '../../sim/types';
import { drawn, grows, heightAt, sequence, surfaceAt } from './kit';

// --- L4: the foreground ---------------------------------------------------------------------------------

/** A tuft of grass far out of focus, drawn small and dark: it frames the picture from below. */
/** What the soft growth in front and far behind is like: the forest's dark, the garden's bright, the bog's straw. */
export type Growth = 'dark' | 'bright' | 'straw';

function blurredTuft(seed: number, growth: Growth = 'dark'): CanvasTexture {
  const next = sequence(seed);
  const lift = growth === 'bright' ? 1.45 : 1;
  const straw = growth === 'straw';
  return drawn(96, 96, (c) => {
    for (let i = 0; i < 16; i++) {
      const x = 28 + next() * 40;
      const lean = (next() - 0.5) * 38;
      const tall = 30 + next() * 58;
      c.strokeStyle = straw
        ? `rgba(${92 + next() * 44},${76 + next() * 36},${30 + next() * 20},0.3)`
        : `rgba(${(22 + next() * 22) * lift},${(48 + next() * 30) * lift},${(22 + next() * 14) * lift},0.3)`;
      c.lineCap = 'round';
      // Each blade several times, thinner each time: soft at its edges, dark in its middle.
      for (const wide of [13, 9, 5]) {
        c.lineWidth = wide;
        c.beginPath();
        c.moveTo(x, 98);
        c.quadraticCurveTo(x + lean * 0.2, 96 - tall * 0.6, x + lean, 96 - tall);
        c.stroke();
      }
    }
    // No hard edge anywhere: it fades to nothing at its sides and at its foot.
    c.globalCompositeOperation = 'destination-in';
    const across = c.createLinearGradient(0, 0, 96, 0);
    across.addColorStop(0, 'rgba(0,0,0,0)');
    across.addColorStop(0.25, 'rgba(0,0,0,1)');
    across.addColorStop(0.75, 'rgba(0,0,0,1)');
    across.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = across;
    c.fillRect(0, 0, 96, 96);
    const down = c.createLinearGradient(0, 0, 0, 96);
    down.addColorStop(0, 'rgba(0,0,0,1)');
    down.addColorStop(0.7, 'rgba(0,0,0,1)');
    down.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = down;
    c.fillRect(0, 0, 96, 96);
  });
}

/** A low shrub far out of focus: a soft mound with a fringe of leaves. */
function blurredShrub(seed: number, growth: Growth = 'dark'): CanvasTexture {
  const next = sequence(seed);
  const lift = growth === 'bright' ? 1.9 : 1;
  // Dwarf birch in autumn: rust and orange.
  const [red, blue] = growth === 'straw' ? [1.7, 0.4] : [0.5, 0.56];
  return drawn(96, 64, (c) => {
    for (let i = 0; i < 46; i++) {
      const x = 12 + next() * 72;
      const y = 26 + next() * 30 + Math.abs(x - 48) * 0.35;
      const r = 5 + next() * 9;
      const blob = c.createRadialGradient(x, y, 0, x, y, r);
      const g = (52 + next() * 44) * lift;
      blob.addColorStop(0, `rgba(${g * red},${g},${g * blue},0.42)`);
      blob.addColorStop(1, `rgba(${g * red},${g},${g * blue},0)`);
      c.fillStyle = blob;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });
}

export function foreground(chapter: ChapterData, from: number, to: number, growth: Growth | null): Group {
  const group = new Group();
  // Bare rock has nothing soft in front of it.
  if (growth === null) return group;
  const next = sequence(59);
  const textures = [blurredTuft(1, growth), blurredTuft(2, growth), blurredTuft(3, growth)];
  const materials = textures.map((map) => new MeshBasicMaterial({ map, transparent: true, fog: false, depthWrite: false }));
  for (let x = from - 6 + next() * 4; x < to + 6; x += 3.5 + next() * 5.5) {
    const z = 4 + next() * 3.5;
    const wide = 4 + next() * 4;
    // Mostly low, along the bottom of the picture; now and then one stands tall and passes in front.
    const tall = next() < 0.2 ? 4.2 + next() * 1.6 : 2.4 + next() * 1.3;
    const card = new Mesh(new PlaneGeometry(wide, tall), materials[Math.floor(next() * materials.length)]!);
    // Grass grows from the ground, not from a deck's edge.
    if (surfaceAt(chapter, x) !== undefined) continue;
    if (!grows(chapter, x)) continue;
    card.position.set(x, heightAt(chapter, x) - 2.3 + tall / 2, z);
    card.renderOrder = 5;
    group.add(card);
  }
  // The undergrowth far behind the path: soft dark tufts that break the line where the moss ends.
  const far = [blurredShrub(7, growth), blurredShrub(8, growth), blurredShrub(9, growth)].map((map) => new MeshBasicMaterial({ map, transparent: true, opacity: 0.8, depthWrite: false }));
  for (let x = from - 10 + next() * 4; x < to + 10; x += 1.6 + next() * 2.6) {
    const z = -8 - next() * 8;
    const wide = 2.6 + next() * 3;
    const tall = 1.4 + next() * 2.2;
    const card = new Mesh(new PlaneGeometry(wide, tall), far[Math.floor(next() * far.length)]!);
    if (!grows(chapter, x)) continue;
    card.position.set(x, heightAt(chapter, x) - 0.3 + tall / 2, z);
    card.renderOrder = -1;
    group.add(card);
  }
  return group;
}
