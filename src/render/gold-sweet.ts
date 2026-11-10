import { AdditiveBlending, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, SphereGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { sweetSocket } from './candy';

/**
 * The golden geléhallon as it is held (Stormens öga, docs/aventyr-2.md): a raspberry of golden beads, which the kit's own
 * `guldhallon` takes the place of (./candy.ts), in a soft glow of its own, so that it is seen in a small hand at night.
 * About a sixth of the small boy's height across, its middle at the group's origin: big for a sweet in his hand, smaller
 * than his face. The glow is the child named `glow`, for the holder to breathe.
 */
export function goldSweet(): Group {
  const group = new Group();
  group.name = 'gold-sweet';
  const sweet = new Group();
  const beads = Array.from({ length: 9 }, (_, i) => new SphereGeometry(0.042, 10, 7)
    .translate(Math.cos(i * 2.4) * 0.055 * (1 - i / 14), -0.06 + i * 0.015, Math.sin(i * 2.4) * 0.055 * (1 - i / 14)));
  sweet.add(new Mesh(mergeGeometries(beads), new MeshStandardMaterial({ color: '#ffcf3a', roughness: 0.25, emissive: '#d99a00', emissiveIntensity: 0.7 })));
  beads.forEach((bead) => bead.dispose());
  sweetSocket(sweet, { shape: 'guldhallon', scale: 0.52, glow: 0.65 });
  const glow = new Mesh(new SphereGeometry(0.2, 14, 10), new MeshBasicMaterial({
    color: '#ffd774', transparent: true, opacity: 0.18, depthWrite: false, blending: AdditiveBlending, fog: false,
  }));
  glow.name = 'glow';
  group.add(sweet, glow);
  return group;
}
