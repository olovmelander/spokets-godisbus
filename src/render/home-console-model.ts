import { BoxGeometry, BufferGeometry, CatmullRomCurve3, Color, CylinderGeometry, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial, SphereGeometry, TubeGeometry, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { HOME_LAYOUT } from '../content/home-layout';

/** Original cream-and-pine toy console. Local to the shared TV cabinet, with two visible cables. */
export function createHomeConsoleModel(): Group {
  const group = new Group(); group.name = 'home-game-console'; group.userData.keep = 0;
  const parts: BufferGeometry[] = [];
  const add = (geometry: BufferGeometry, hex: string) => {
    const shape = geometry.index ? geometry.toNonIndexed() : geometry;
    const colour = new Color(hex), rgb = new Float32Array(shape.getAttribute('position').count * 3);
    for (let i = 0; i < rgb.length; i += 3) rgb.set([colour.r, colour.g, colour.b], i);
    shape.setAttribute('color', new Float32BufferAttribute(rgb, 3)); shape.deleteAttribute('uv'); parts.push(shape);
  };
  const top = HOME_LAYOUT.television.consoleTop;
  add(new BoxGeometry(1.02, .20, .60).translate(-1.2, top + .10, .29), '#e6d8b3');
  add(new BoxGeometry(1.04, .055, .62).translate(-1.2, top + .028, .29), '#3f6455');
  add(new BoxGeometry(.64, .022, .09).translate(-1.2, top + .211, .24), '#45574b');
  add(new CylinderGeometry(.035, .035, .012, 8).rotateX(Math.PI / 2).translate(-.83, top + .12, .596), '#d5b551');
  // Two rounded grips, a cross and two coloured buttons make the controller readable without branding.
  add(new BoxGeometry(.63, .12, .38).translate(1.18, top + .065, .37), '#e6d8b3');
  for (const x of [.88, 1.48]) add(new SphereGeometry(.23, 10, 6).scale(1, .33, 1.12).translate(x, top + .076, .41), '#3f6455');
  add(new BoxGeometry(.19, .035, .06).translate(.96, top + .15, .35), '#253a33');
  add(new BoxGeometry(.06, .035, .19).translate(.96, top + .15, .35), '#253a33');
  for (const [x, z, hex] of [[1.37, .3, '#cd8057'], [1.48, .43, '#d5b551']] as const) {
    add(new CylinderGeometry(.06, .06, .045, 10).translate(x, top + .145, z), hex);
  }
  const cable = (points: number[][]) => add(new TubeGeometry(new CatmullRomCurve3(points.map(p => new Vector3(...p as [number, number, number]))), 24, .022, 5, false), '#293e37');
  cable([[-1.4, top + .12, .02], [-1.6, top + .10, -.20], [-1.79, top + .16, -.2], [-1.79, top + .43, -.06]]);
  cable([[-.87, top + .10, .59], [-.63, top + .03, .76], [-.14, top - .20, .79], [.40, top - .15, .78], [.77, top + .06, .49], [.96, top + .08, .28]]);
  const shape = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  const mesh = new Mesh(shape, new MeshStandardMaterial({ vertexColors: true, roughness: .72 }));
  mesh.name = 'home-game-console-and-controller'; mesh.castShadow = true; mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}
