import { AdditiveBlending, DynamicDrawUsage, Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry } from 'three';
import type { ChapterData, PlaceId } from '../../sim/types';
import { drawn, grows, heightAt, sequence } from './kit';

// --- effects: shafts of light, and what floats in them ------------------------------------------------------

export function effects(chapter: ChapterData, from: number, to: number, where: PlaceId) {
  const group = new Group();
  const next = sequence(71);
  // The forest has shafts of light and dust high in them; the garden has dew that glitters near the ground.
  const garden = where === 'garden';
  const beam = drawn(64, 128, (c) => {
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
  });
  const shafts: { mesh: Mesh; material: MeshBasicMaterial; base: number; phase: number }[] = [];
  for (let x = from + next() * 6; x < to + 8 && where === 'forest'; x += 7 + next() * 8) {
    const material = new MeshBasicMaterial({ map: beam, color: '#ffeeb0', transparent: true, opacity: 0.3, blending: AdditiveBlending, fog: false, depthWrite: false });
    const wide = 2.4 + next() * 3;
    const mesh = new Mesh(new PlaneGeometry(wide, 26), material);
    const high = Math.max(heightAt(chapter, x - 6), heightAt(chapter, x), heightAt(chapter, x + 6));
    mesh.position.set(x, high + 10, -1.2 - next() * 4);
    mesh.rotation.z = 0.46 + next() * 0.08;
    mesh.renderOrder = 3;
    group.add(mesh);
    shafts.push({ mesh, material, base: 0.24 + next() * 0.14, phase: next() * 6.28 });
  }

  // Mist over the bog: long pale sheets that lie low over the water and drift.
  const sheets: Mesh[] = [];
  if (where === 'bog') {
    const band = drawn(64, 32, (c) => {
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
    });
    for (let i = 0; i < 6; i++) {
      const sheet = new Mesh(
        new PlaneGeometry(22 + next() * 14, 2.6 + next() * 1.8),
        new MeshBasicMaterial({ map: band, color: '#fff7e6', transparent: true, opacity: 0.2 + next() * 0.14, fog: false, depthWrite: false }),
      );
      sheet.userData = { x: next(), y: 0.5 + next() * 1.1, z: -2.5 - next() * 9, speed: 0.25 + next() * 0.4 };
      sheet.renderOrder = 2;
      sheets.push(sheet);
      group.add(sheet);
    }
  }

  // Dust and pollen in the light: they drift slowly, and stay with the camera.
  const MOTES = where === 'dusk' ? 1 : 70;
  const motes = new InstancedMesh(
    new PlaneGeometry(1, 1),
    new MeshBasicMaterial({ color: garden ? '#f2fbff' : '#fff6d0', transparent: true, opacity: garden ? 0.95 : 0.7, blending: AdditiveBlending, fog: false, depthWrite: false, map: drawn(32, 32, (c) => {
      const dot = c.createRadialGradient(16, 16, 1, 16, 16, 15);
      dot.addColorStop(0, 'rgba(255,255,255,1)');
      dot.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = dot;
      c.fillRect(0, 0, 32, 32);
    }) }),
    MOTES,
  );
  motes.instanceMatrix.setUsage(DynamicDrawUsage);
  motes.frustumCulled = false;
  motes.renderOrder = 4;
  group.add(motes);
  const seeds = Array.from({ length: MOTES }, () => ({ x: next(), y: next(), z: next(), speed: 0.3 + next() * 0.7, size: 0.03 + next() * 0.06 }));
  const place = new Object3D();
  const SPAN = 30;

  function update(cameraX: number, groundY: number, clock: number): void {
    for (const sheet of sheets) {
      const at = sheet.userData as { x: number; y: number; z: number; speed: number };
      const window = 70;
      const along = (((at.x * window + clock * at.speed - cameraX) % window) + window) % window;
      sheet.position.set(cameraX - window / 2 + along, groundY + at.y, at.z);
    }
    for (const shaft of shafts) shaft.material.opacity = shaft.base * (0.8 + 0.2 * Math.sin(clock * 0.6 + shaft.phase));
    for (const [i, mote] of seeds.entries()) {
      // Each keeps its place in a window that follows the camera, and wraps round at its ends.
      const along = (((mote.x * SPAN + (garden ? 0 : clock * 0.12 * mote.speed) - cameraX) % SPAN) + SPAN) % SPAN;
      place.position.set(
        cameraX - SPAN / 2 + along,
        garden ? heightAt(chapter, cameraX - SPAN / 2 + along) + 0.05 + mote.y * 1.3 : groundY + 0.3 + mote.y * 7 + Math.sin(clock * 0.5 * mote.speed + i) * 0.25,
        -5 + mote.z * 7.5,
      );
      // Dust drifts and swells slowly; dew flashes, and only where something grows.
      const twinkle = garden
        ? (grows(chapter, cameraX - SPAN / 2 + along) ? Math.max(0, Math.sin(clock * 3.1 * mote.speed + i * 2.3)) ** 6 * 2.2 : 0)
        : 0.6 + 0.4 * Math.sin(clock * 1.7 * mote.speed + i * 2.3);
      place.scale.setScalar(where === 'dusk' ? 0 : mote.size * twinkle);
      place.updateMatrix();
      motes.setMatrixAt(i, place.matrix);
    }
    motes.instanceMatrix.needsUpdate = true;
  }
  return { group, update };
}
