import { BoxGeometry, CircleGeometry, Color, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, OctahedronGeometry, SphereGeometry, type BufferAttribute } from 'three';
import type { ChapterData } from '../sim/types';
import { drawnWhile } from './idle';

/** The carved model's dark painted eyes are part of one mesh. Animate only this copy's eye corners. */
function paintedBlink(model: Group): (blink: number) => void {
  const patches: { position: BufferAttribute; dots: { index: number; y: number; centre: number }[] }[] = [];
  model.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const colours = mesh.geometry.getAttribute('color');
    const position = mesh.geometry.getAttribute('position');
    if (!colours || !position) return;
    mesh.geometry.computeBoundingBox();
    const bounds = mesh.geometry.boundingBox!;
    const height = bounds.max.y - bounds.min.y;
    const depth = bounds.max.z - bounds.min.z;
    const middle = (bounds.min.x + bounds.max.x) / 2;
    const sides: { index: number; y: number }[][] = [[], []];
    for (let i = 0; i < position.count; i++) {
      // The mouth lies lower. Pale wood, cap and knife marks never enter these two upper-face patches.
      if (position.getY(i) < bounds.min.y + height * 0.73 || position.getZ(i) < bounds.min.z + depth * 0.75
        || Math.max(colours.getX(i), colours.getY(i), colours.getZ(i)) > 0.06) continue;
      sides[position.getX(i) < middle ? 0 : 1]!.push({ index: i, y: position.getY(i) });
    }
    if (sides.some((side) => side.length < 3)) return;
    // Loaded kit geometry is shared by the shelf and both adventures; only the window's copy may blink.
    mesh.geometry = mesh.geometry.clone();
    const dots = sides.flatMap((side) => {
      const centre = (Math.min(...side.map((dot) => dot.y)) + Math.max(...side.map((dot) => dot.y))) / 2;
      return side.map((dot) => ({ ...dot, centre }));
    });
    patches.push({ position: mesh.geometry.getAttribute('position') as BufferAttribute, dots });
  });
  let previous = -1;
  return (blink) => {
    if (blink === previous) return;
    previous = blink;
    for (const patch of patches) {
      for (const dot of patch.dots) patch.position.setY(dot.index, dot.centre + (dot.y - dot.centre) * (1 - blink * 0.96));
      patch.position.needsUpdate = true;
    }
  };
}

/** Elof's first carving, shared with Stormnatten: a faceted public stand-in until its authorised model loads. */
export function createEpilogueStage(layout: ChapterData['epilogue']) {
  const group = new Group();
  group.name = 'epilogue-window';
  if (!layout) return { group, update(_flags: ReadonlySet<string>, _seconds: number | null | undefined, _calm: boolean) {} };
  const wood = new MeshStandardMaterial({ color: '#e6cfa2', roughness: 0.95, flatShading: true });
  const dark = new MeshStandardMaterial({ color: '#211e27', roughness: 0.9 });
  const figure = new Group();
  figure.name = 'epilogue-lillgubbe';
  figure.userData.model = 'lillgubbe';
  figure.userData.disposeFallback = true;
  figure.scale.setScalar(1.5);
  let blinkModel: ((blink: number) => void) | null = null;
  figure.userData.onModelInstalled = (model: Group) => { blinkModel = paintedBlink(model); };
  const body = new Mesh(new CylinderGeometry(0.1, 0.14, 0.3, 9), wood);
  body.position.set(0, 0.15, 0);
  const head = new Mesh(new SphereGeometry(0.12, 10, 7), wood);
  head.position.set(0, 0.4, 0);
  figure.add(body, head);
  const eyes = new Group();
  for (const x of [-0.045, 0.045]) {
    const eye = new Mesh(new SphereGeometry(0.02, 8, 6), dark);
    eye.position.set(x, 0.42, 0.11);
    eyes.add(eye);
  }
  for (const [y, turn] of [[0.08, 0.3], [0.2, -0.4]] as const) {
    const cut = new Mesh(new BoxGeometry(0.2, 0.012, 0.012), new MeshStandardMaterial({ color: '#c9b07e', roughness: 1 }));
    cut.position.set(0, y, 0.135);
    cut.rotation.z = turn;
    figure.add(cut);
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
      blinkModel?.(blink);
      const size = calm ? (time >= 1.2 && time <= 1.7 ? 0.6 : 0) : time >= 1.05 && time <= 1.95 ? Math.sin((time - 1.05) / 0.9 * Math.PI) : 0;
      glint.scale.setScalar(size);
      drawnWhile(glint, size > 0);
      glint.rotation.z = calm ? 0 : time * 0.8;
    },
  };
}
