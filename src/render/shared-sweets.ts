import { AdditiveBlending, Color, Group, InstancedMesh, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry, SphereGeometry } from 'three';
import type { Vec } from '../sim/types';
import type { CandyKit } from './candy';
import { glowTexture } from './glow';
import { drawnWhile } from './idle';

const FRIENDS = ['tragubbe', 'spoket', 'jay'] as const;
/** The sweets he can give on the summit, as the kit's shapes: how big each is drawn, and the karamell's own colour. */
const SHAPED: Record<string, { shape: string; scale: number; tint?: string }> = {
  gelehallon: { shape: 'gelehallon', scale: 0.62 },
  karamell: { shape: 'karamell', scale: 0.72, tint: '#dfb65f' },
  skumbanan: { shape: 'skumbanan', scale: 0.7 },
};

/** The player's actual choices stay visible beside their recipients; the jay receives a berry. */
export function createSharedSweets() {
  const group = new Group();
  group.name = 'shared-story-sweets';
  // A ball for each friend: the stand-in for a sweet, and the jay's lingonberry.
  const balls = new InstancedMesh(new SphereGeometry(1, 10, 8), new MeshStandardMaterial({ roughness: .35 }), 3);
  balls.frustumCulled = false;
  group.add(balls);
  const colours: Record<string, string> = { gelehallon: '#c73650', karamell: '#dfb65f', skumbanan: '#eed382', lingon: '#b22e3b' };
  const shape = new Object3D(), colour = new Color();
  for (let i = 0; i < 3; i++) balls.setColorAt(i, colour.set('#c73650'));
  // Each gift glows a little where it is given: the only warm lights in the blue (visual audit,
  // berget-and-norrsken row 22). One draw for the three. A faint light added over whatever is there, so that the
  // ghost's own shape, beside its gift, does not hide it.
  const halos = new InstancedMesh(new PlaneGeometry(0.7, 0.7), new MeshBasicMaterial({
    map: glowTexture(), color: '#ffd9a0', transparent: true, opacity: 0.35, depthWrite: false, depthTest: false, blending: AdditiveBlending,
  }), 3);
  halos.name = 'shared-halos';
  halos.frustumCulled = false;
  halos.renderOrder = 6;
  group.add(halos);
  /** For each friend, the kit's sweets he may be given, all there from the start and shown one at a time. */
  const shaped: Record<string, Object3D>[] = [];
  return {
    group,
    /** The balls: one instanced draw, whatever is given. */
    mesh: balls,
    /** The gifts' warm glows: one instanced draw. */
    halos,
    /** The kit's sweets take the balls' place. All of them exist from now on, so giving one compiles nothing. */
    install(kit: CandyKit): boolean {
      if (shaped.length > 0 || Object.values(SHAPED).some((sweet) => !kit.shape(sweet.shape))) return false;
      for (const friend of FRIENDS) {
        const sweets: Record<string, Object3D> = {};
        for (const [kind, sweet] of Object.entries(SHAPED)) {
          const geometry = kit.shape(sweet.shape)!;
          // A sweet that takes a colour of the game's is drawn as an instance: that is where its colour comes from.
          const mesh = sweet.tint ? new InstancedMesh(geometry, kit.material, 1) : new Mesh(geometry, kit.material);
          if (sweet.tint) (mesh as InstancedMesh).setColorAt(0, colour.set(sweet.tint));
          mesh.name = `shared:${friend}:${kind}`;
          mesh.scale.setScalar(sweet.scale);
          mesh.rotation.z = 0.25;
          mesh.visible = false;
          mesh.frustumCulled = false;
          sweets[kind] = mesh;
          group.add(mesh);
        }
        shaped.push(sweets);
      }
      return true;
    },
    update(flags: ReadonlySet<string>, ghost: Vec | null, figure?: Vec) {
      let any = false;
      let given = false;
      for (const [i, friend] of FRIENDS.entries()) {
        const prefix = `gift:${friend}:`, gift = [...flags].find((flag) => flag.startsWith(prefix));
        const kind = gift?.slice(prefix.length) ?? (friend === 'jay' ? 'lingon' : 'gelehallon');
        const shown = flags.has(`share:${friend}`);
        const x = friend === 'tragubbe' ? (figure?.x ?? 12.4) + .28 : friend === 'spoket' ? (ghost?.x ?? 19.4) + .26 : 23.18;
        const y = friend === 'tragubbe' ? (figure?.y ?? 0) + .4 : friend === 'spoket' ? (ghost?.y ?? 0) + .45 : 1.1;
        const sweets = shaped[i];
        const model = sweets?.[kind];
        if (sweets) for (const name in sweets) sweets[name]!.visible = shown && name === kind;
        if (model) model.position.set(x, y, .24);
        shape.position.set(x, y, .24);
        const size = shown && !model ? (friend === 'jay' ? .075 : .12) : 0;
        any ||= size > 0;
        shape.scale.set(size, size * (kind === 'skumbanan' ? .55 : 1.2), size);
        shape.updateMatrix(); balls.setMatrixAt(i, shape.matrix);
        balls.setColorAt(i, colour.set(colours[kind] ?? '#c73650'));
        given ||= shown;
        shape.position.set(x, y, .2);
        shape.scale.setScalar(shown ? 1 : 0);
        shape.updateMatrix(); halos.setMatrixAt(i, shape.matrix);
      }
      drawnWhile(halos, given);
      halos.instanceMatrix.needsUpdate = true;
      // Before anything is given, and where the kit's sweets have taken their place, no ball has a size (./idle.ts).
      drawnWhile(balls, any);
      balls.instanceMatrix.needsUpdate = true;
      if (balls.instanceColor) balls.instanceColor.needsUpdate = true;
    },
  };
}
