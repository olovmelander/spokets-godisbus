import { Color, InstancedMesh, MeshStandardMaterial, Object3D, SphereGeometry } from 'three';
import type { Vec } from '../sim/types';

/** The player's actual choices stay visible beside their recipients; the jay receives a berry. */
export function createSharedSweets() {
  const mesh = new InstancedMesh(new SphereGeometry(1, 10, 8), new MeshStandardMaterial({ roughness: .35 }), 3);
  mesh.name = 'shared-story-sweets'; mesh.frustumCulled = false;
  const friends = ['tragubbe', 'spoket', 'jay'] as const;
  const colours: Record<string, string> = { gelehallon: '#c73650', karamell: '#dfb65f', skumbanan: '#eed382', lingon: '#b22e3b' };
  const shape = new Object3D(), colour = new Color();
  for (let i = 0; i < 3; i++) mesh.setColorAt(i, colour.set('#c73650'));
  return {
    mesh,
    update(flags: ReadonlySet<string>, ghost: Vec | null, figure?: Vec) {
      for (const [i, friend] of friends.entries()) {
        const prefix = `gift:${friend}:`, gift = [...flags].find((flag) => flag.startsWith(prefix));
        const kind = gift?.slice(prefix.length);
        const shown = flags.has(`share:${friend}`);
        const x = friend === 'tragubbe' ? (figure?.x ?? 12.4) + .28 : friend === 'spoket' ? (ghost?.x ?? 19.4) + .26 : 23.18;
        const y = friend === 'tragubbe' ? (figure?.y ?? 0) + .4 : friend === 'spoket' ? (ghost?.y ?? 0) + .45 : 1.1;
        shape.position.set(x, y, .24);
        const size = shown ? (friend === 'jay' ? .075 : .12) : 0;
        shape.scale.set(size, size * (kind === 'skumbanan' ? .55 : 1.2), size);
        shape.updateMatrix(); mesh.setMatrixAt(i, shape.matrix);
        mesh.setColorAt(i, colour.set(colours[kind ?? (friend === 'jay' ? 'lingon' : 'gelehallon')] ?? '#c73650'));
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
  };
}
