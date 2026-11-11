import { BoxGeometry, BufferGeometry, CatmullRomCurve3, Color, CylinderGeometry, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial, SphereGeometry, TubeGeometry, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
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
  // Its highest edge stays below the picture's lower edge at 1.775 EL.
  add(new RoundedBoxGeometry(1.08, .24, .64, 2, .045).translate(-1.2, top + .125, .29), '#ede0be');
  add(new RoundedBoxGeometry(1.10, .045, .66, 2, .018).translate(-1.2, top + .0225, .29), '#3f6455');
  add(new BoxGeometry(.64, .012, .08).translate(-1.2, top + .242, .24), '#45574b');
  // A round power button and a small warm indicator, both on the visible front face.
  add(new CylinderGeometry(.068, .068, .016, 12).rotateX(Math.PI / 2).translate(-.85, top + .135, .616), '#3f6455');
  add(new CylinderGeometry(.046, .046, .019, 12).rotateX(Math.PI / 2).translate(-.85, top + .135, .626), '#bca16c');
  add(new CylinderGeometry(.033, .033, .014, 10).rotateX(Math.PI / 2).translate(-1.08, top + .135, .618), '#f5d572');
  // Two rounded grips, a cross and two coloured buttons make the controller readable without branding.
  add(new BoxGeometry(.63, .12, .38).translate(1.18, top + .065, .37), '#e6d8b3');
  for (const x of [.88, 1.48]) add(new SphereGeometry(.23, 10, 6).scale(1, .33, 1.12).translate(x, top + .076, .41), '#3f6455');
  add(new BoxGeometry(.19, .035, .06).translate(.96, top + .15, .35), '#253a33');
  add(new BoxGeometry(.06, .035, .19).translate(.96, top + .15, .35), '#253a33');
  for (const [x, z, hex] of [[1.37, .3, '#cd8057'], [1.48, .43, '#d5b551']] as const) {
    add(new CylinderGeometry(.06, .06, .045, 10).translate(x, top + .145, z), hex);
  }
  const cable = (points: number[][], radius = .022) => add(new TubeGeometry(new CatmullRomCurve3(points.map(p => new Vector3(...p as [number, number, number]))), 32, radius, 7, false), '#293e37');
  // A plug in each side makes the connection readable. The slack drops outside the cabinet's left
  // edge, then rises to the TV's side socket; it never runs behind the screen or through the cabinet.
  add(new BoxGeometry(.15, .12, .15).translate(-1.795, top + .135, .30), '#45574b');
  add(new CylinderGeometry(.048, .048, .06, 8).rotateZ(Math.PI / 2).translate(-1.885, top + .135, .30), '#293e37');
  add(new BoxGeometry(.18, .14, .16).translate(-2.025, top + .61, .025), '#45574b');
  add(new CylinderGeometry(.048, .048, .075, 8).rotateZ(Math.PI / 2).translate(-2.145, top + .61, .025), '#293e37');
  cable([[-1.91, top + .135, .30], [-2.08, top + .11, .36], [-2.24, top - .20, .43],
    [-2.37, top - .40, .44], [-2.48, top - .24, .36], [-2.46, top + .34, .16],
    [-2.32, top + .59, .04], [-2.18, top + .61, .025]], .044);
  cable([[-.87, top + .10, .59], [-.63, top + .03, .76], [-.14, top - .20, .79], [.40, top - .15, .78], [.77, top + .06, .49], [.96, top + .08, .28]]);
  const shape = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  const mesh = new Mesh(shape, new MeshStandardMaterial({ vertexColors: true, roughness: .72 }));
  mesh.name = 'home-game-console-and-controller'; mesh.castShadow = true; mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}
