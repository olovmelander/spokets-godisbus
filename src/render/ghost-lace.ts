import { CylinderGeometry, DodecahedronGeometry, Group, Mesh, MeshStandardMaterial, TorusGeometry, Vector3, type Object3D } from 'three';
import type { SceneFrame } from '../sim/scene';
import type { ChapterData, Climb } from '../sim/types';
import { drawnWhile } from './idle';

/**
 * The lace the ghost lets down to him at Berget's last cliff, and holds while he climbs (Olov, 13 November 2026: "När
 * Elof säger tack för hjälpen, nu är jag uppe. Så måste det vara tydligt visuellt att det är spöket som fixar så att
 * Elof kan klättra upp"). Picture only: the simulation's climb is there from the flag, as before.
 *
 * - In the lift (`heldBy.scene`) the lace runs out from the top at its moment, from the ghost's hands at the edge, as it
 *   leans out over it: ./view.ts buildClimbs asks `letDown` how far.
 * - While he climbs, the ghost stands braced on top, leaning back, the lace's end in its hands and over a stone, and
 *   tugs in time with his climbing.
 * - Once he has thanked it (`heldBy.until`) it lets go, and the end lies tied round the stone.
 */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** How far the ghost has let the lace down, from 0 to 1; null where the climb's own flag decides (./view.ts). */
export function letDown(climb: Climb, flags: ReadonlySet<string>, scene: SceneFrame | null): number | null {
  const by = climb.heldBy;
  if (!by || flags.has(`scene:${by.scene}`)) return null;
  // Its flag is set when he presses, before the ghost is up: until the scene has let it down, it is not there.
  return scene?.id === by.scene ? clamp01((scene.seconds - by.at) / by.seconds) : 0;
}

export interface GhostLaceFrame {
  flags: ReadonlySet<string>;
  scene: SceneFrame | null;
  /** The ghost's own model or stand-in, already placed and turned this frame; null where there is none. */
  ghost: Object3D | null;
  /** The model from Blender faces its own +z; the stand-in its +x (./ghost-model.ts). */
  facesModel: boolean;
  /** Where Elof is, and whether he is on this lace. */
  elof: { x: number; y: number; climbing: boolean };
  clock: number;
  dt: number;
  calm: boolean;
}

export function buildGhostLace(chapter: ChapterData) {
  const group = new Group();
  group.name = 'ghost-lace';
  const climb = (chapter.climbs ?? []).find((one) => one.heldBy);
  const by = climb?.heldBy;
  if (!climb || !by) return { group, update: (_frame: GhostLaceFrame) => {} };
  const material = new MeshStandardMaterial({ color: '#d4b783', roughness: 0.9 });
  const piece = () => {
    const mesh = new Mesh(new CylinderGeometry(0.045, 0.045, 1, 8), material);
    group.add(mesh);
    return mesh;
  };
  // From the lace's top over the edge to the stone, and from the stone to the ghost's hands.
  const toStone = piece(), toHands = piece();
  // A knob of granite on top of the cliff, and the lace's turn round it.
  const stone = new Mesh(new DodecahedronGeometry(0.26, 0), new MeshStandardMaterial({ color: '#8e8f94', roughness: 0.95, flatShading: true }));
  stone.scale.set(1.25, 0.8, 1);
  stone.rotation.set(0.3, 0.6, 0.15);
  stone.position.set(by.tied.x, by.tied.y + 0.13, by.tied.z);
  const knot = new Mesh(new TorusGeometry(0.26, 0.045, 8, 20), material);
  knot.rotation.x = Math.PI / 2;
  knot.scale.set(1.2, 1, 0.9);
  knot.position.set(by.tied.x, by.tied.y + 0.18, by.tied.z);
  group.add(stone, knot);

  const top = new Vector3(climb.x, climb.top + 0.25, -0.16);
  const over = new Vector3(by.tied.x, by.tied.y + 0.27, by.tied.z);
  const hands = new Vector3(), end = new Vector3(), along = new Vector3(), up = new Vector3(0, 1, 0);
  const handLocal = new Vector3();
  let lean = 0, release = 1;

  function lay(mesh: Mesh, from: Vector3, to: Vector3, shown: boolean): void {
    const length = along.copy(to).sub(from).length();
    drawnWhile(mesh, shown && length > 0.01);
    if (!shown || length <= 0.01) { mesh.scale.setScalar(0); return; }
    mesh.position.copy(from).addScaledVector(along, 0.5);
    mesh.quaternion.setFromUnitVectors(up, along.normalize());
    mesh.scale.set(1, length, 1);
  }

  function update({ flags, scene, ghost, facesModel, elof, clock, dt, calm }: GhostLaceFrame): void {
    const down = letDown(climb!, flags, scene) ?? (climb!.needs === undefined || flags.has(climb!.needs) ? 1 : 0);
    const lowering = scene?.id === by!.scene && scene.seconds > by!.at - 0.25 && scene.seconds < by!.at + by!.seconds + 0.1;
    // It holds the end while it stands up there by the lace's top, and until it lets go.
    let near = false;
    if (ghost) {
      ghost.updateWorldMatrix(true, false);
      ghost.getWorldPosition(hands);
      near = hands.x > climb!.x - 0.3 && hands.x < climb!.x + 2.8 && Math.abs(hands.y - climb!.top) < 0.6;
    }
    const holding = down > 0 && near && !flags.has(by!.until);
    // Leaning out over the edge as it lets the lace down; braced back while it holds it, and more as he climbs, tugging.
    const want = lowering ? -0.32 + (calm ? 0 : 0.06 * Math.sin(clock * 13)) : holding ? (elof.climbing ? 0.3 + (calm ? 0 : 0.05 * Math.sin(clock * 6.5)) : 0.17) : 0;
    lean = calm ? want : lean + (want - lean) * (1 - Math.exp(-9 * dt));
    if (ghost && Math.abs(lean) > 1e-4) {
      // Back, away from the way it faces: about its own side, as its hop tips it forward (./view.ts).
      if (facesModel) ghost.rotation.x -= lean; else ghost.rotation.z += lean;
      ghost.updateWorldMatrix(true, false);
    }
    // Its hands: the front of its middle, over the bag it carries.
    if (ghost) ghost.localToWorld(facesModel ? handLocal.set(0, 0.52, 0.27) : handLocal.set(0.27, 0.52, 0));
    release = calm ? (holding ? 0 : 1) : clamp01(release + (holding ? -dt : dt) / 0.3);
    knot.scale.setScalar(down);
    drawnWhile(knot, down > 0 && release > 0.5);
    if (down <= 0) {
      lay(toStone, top, over, false);
      lay(toHands, over, over, false);
      return;
    }
    // In the lift it has the lace in its hands at the edge, before the stone; once it is behind the stone, the lace
    // goes over the stone to it. Let go, the end eases down onto the stone, where it is tied.
    end.copy(handLocal).lerp(over, release);
    const viaStone = !holding || end.x > over.x + 0.05;
    lay(toStone, top, viaStone ? over : end, true);
    lay(toHands, over, end, viaStone && release < 1);
  }
  return { group, update };
}
