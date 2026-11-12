import {
  AdditiveBlending, BufferAttribute, Color, ConeGeometry, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  PlaneGeometry, SphereGeometry, type Object3D,
} from 'three';
import type { SceneFrame } from '../sim/scene';
import { electricLight } from '../content/home-power';
import { glowTexture } from './glow';

/**
 * The room's electric light on the evening of the storm, and the power cut that puts it out (../content/home-power.ts).
 * The lamp over the dining table hangs from its cord, its shade lit from within and a soft pool of its light on the
 * table under it; as the power goes it flickers and goes dark, and the room's own lights (the chapter's hemisphere and
 * key light, ../content/aventyr2/render.ts) come down to the candles' level with it. Plain shapes, no lettering.
 */
export interface PowerCut {
  group: Group;
  /** How much of the electric light is on this frame, 1 to 0, for the room's lights to follow. */
  update(flags: ReadonlySet<string>, scene: SceneFrame | null | undefined, still: boolean): number;
}

/** How much brighter the room is lit while its lamps are on than by candlelight. */
export const LAMPLIT = { hemisphere: 1.5, sun: 1.3, wall: 0.8 } as const;
/** The lamps' warm white, and the evening's candle-warm light that is left when they are out. */
export const LAMP_COLOUR = new Color('#ffe8c4');

/** `room`: the scene, whose painted back wall (lit by no light, ./dressing/built.ts) is brightened with the lamps. */
export function createPowerCut(chapter: string, at: { x: number; y: number; z: number }, room: Object3D): PowerCut {
  const group = new Group();
  group.name = 'power-cut-lamp';
  group.position.set(at.x, at.y, at.z);
  // A cord up out of the picture, a shallow metal shade and the bulb under it.
  const metal = new MeshStandardMaterial({ color: '#3d4a45', roughness: 0.45, metalness: 0.3 });
  const cord = new Mesh(new CylinderGeometry(0.025, 0.025, 12, 6).translate(0, 6.4, 0), new MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.8 }));
  const shade = new Mesh(new ConeGeometry(0.75, 0.62, 20, 1, true).translate(0, 0.08, 0), metal);
  const cap = new Mesh(new CylinderGeometry(0.12, 0.16, 0.18, 12).translate(0, 0.46, 0), metal);
  // The inside of the shade: it glows while the lamp is on.
  const inner = new MeshBasicMaterial({ color: '#fff4dc', side: DoubleSide, fog: false });
  const lining = new Mesh(new ConeGeometry(0.72, 0.58, 20, 1, true).translate(0, 0.07, 0), inner);
  const bulbMaterial = new MeshBasicMaterial({ color: '#fff8e8', fog: false });
  const bulb = new Mesh(new SphereGeometry(0.16, 12, 8).translate(0, -0.1, 0), bulbMaterial);
  // Its glow round the shade, and the pool of its light falling on the table: added light, faded at the edges.
  const halo = new Mesh(new PlaneGeometry(4.2, 4.2), new MeshBasicMaterial({
    color: '#ffdca0', map: glowTexture(32), transparent: true, opacity: 0.5, depthWrite: false, blending: AdditiveBlending, fog: false,
  }));
  halo.position.set(0, -0.25, 0.3);
  halo.renderOrder = 3;
  const LONG = at.y - 1.7;
  const cone = new ConeGeometry(1.7, LONG, 20, 4, true).translate(0, -LONG / 2 - 0.2, 0);
  const points = cone.getAttribute('position');
  const fade = new Float32Array(points.count * 3);
  for (let i = 0; i < points.count; i++) fade.fill(0.35 + 0.65 * Math.max(0, 1 + (points.getY(i) + 0.2) / LONG) ** 1.4, i * 3, i * 3 + 3);
  cone.setAttribute('color', new BufferAttribute(fade, 3));
  const pool = new Mesh(cone, new MeshBasicMaterial({
    color: '#ffe2b0', vertexColors: true, transparent: true, opacity: 0.07, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, fog: false,
  }));
  group.add(cord, shade, cap, lining, bulb, halo, pool);
  const dark = new Color('#4a4436'), lit = new Color('#fff4dc');
  let wall: { colour: Color; base: Color } | null | undefined;
  return {
    group,
    update(flags, scene, still) {
      const on = electricLight(chapter, flags, scene, still);
      inner.color.copy(dark).lerp(lit, on);
      bulbMaterial.color.copy(dark).lerp(lit, on);
      (halo.material as MeshBasicMaterial).opacity = 0.5 * on;
      (pool.material as MeshBasicMaterial).opacity = 0.07 * on;
      halo.visible = pool.visible = on > 0.01;
      if (wall === undefined) {
        const colour = ((room.getObjectByName('home-back-wall') as Mesh | undefined)?.material as MeshBasicMaterial | undefined)?.color;
        wall = colour ? { colour, base: colour.clone() } : null;
      }
      wall?.colour.copy(wall.base).multiplyScalar(1 + LAMPLIT.wall * on);
      return on;
    },
  };
}
