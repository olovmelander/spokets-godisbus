import { BoxGeometry, CircleGeometry, Color, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, OctahedronGeometry, SphereGeometry } from 'three';
import type { ChapterData } from '../sim/types';
import { drawnWhile } from './idle';

/** Rehearsal carving: a crooked piece of wood with the two eyes Elof painted, never a likeness asset. */
export function createEpilogueStage(layout: ChapterData['epilogue']) {
  const group = new Group();
  if (!layout) return { group, update(_flags: ReadonlySet<string>, _seconds: number | null | undefined, _calm: boolean) {} };
  const wood = new MeshStandardMaterial({ color: '#c7b48d', roughness: 0.95 });
  const dark = new MeshStandardMaterial({ color: '#211e27', roughness: 0.9 });
  const figure = new Group();
  const body = new Mesh(new CylinderGeometry(0.13, 0.23, 0.55, 5), wood);
  body.position.set(0.025, 0.29, 0); body.rotation.z = -0.15;
  const head = new Mesh(new SphereGeometry(0.19, 7, 5), wood);
  head.position.set(0.09, 0.68, 0);
  figure.add(body, head);
  const eyes = new Group();
  for (const x of [-0.045, 0.145]) {
    const eye = new Mesh(new SphereGeometry(0.029, 8, 6), dark);
    eye.position.set(x, 0.69 + x * 0.12, 0.172);
    eyes.add(eye);
  }
  figure.add(eyes);
  const sill = new Mesh(new BoxGeometry(2.6, 0.13, 0.95), new MeshStandardMaterial({ color: '#c2b18e', roughness: 0.9 }));
  sill.position.y = -0.065;
  // A small moonlit patch and the blink's glint use existing basic/standard shader variants.
  const patch = new Mesh(new BoxGeometry(1.05, 0.014, 0.58), new MeshBasicMaterial({ color: '#a8c0d0' }));
  patch.position.set(0.06, 0.006, 0.06);
  const glint = new Mesh(new OctahedronGeometry(0.065), new MeshBasicMaterial({ color: new Color('#fff5d3') }));
  glint.position.set(0.3, 0.89, 0.04);
  const moon = new Mesh(new CircleGeometry(0.19, 20), new MeshBasicMaterial({ color: '#d7e5ea' }));
  moon.position.set(1.0, 1.5, -0.5);
  group.add(sill, patch, figure, glint, moon);
  group.position.set(layout.window.x, layout.window.y, layout.window.z);
  return {
    group,
    update(flags: ReadonlySet<string>, seconds: number | null | undefined, calm: boolean) {
      figure.visible = flags.has('dots');
      const time = seconds ?? -1;
      const blink = time >= 1.2 && time < 1.52 ? Math.sin((time - 1.2) / 0.32 * Math.PI) : 0;
      for (const eye of eyes.children) eye.scale.y = 1 - blink * 0.96;
      const size = calm ? (time >= 1.2 && time <= 1.7 ? 0.6 : 0) : time >= 1.05 && time <= 1.95 ? Math.sin((time - 1.05) / 0.9 * Math.PI) : 0;
      glint.scale.setScalar(size);
      drawnWhile(glint, size > 0);
      glint.rotation.z = calm ? 0 : time * 0.8;
    },
  };
}
