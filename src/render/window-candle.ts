import { AdditiveBlending, CylinderGeometry, Group, LatheGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, SphereGeometry, Vector2 } from 'three';
import { glowTexture } from './glow';

/**
 * A candle lit in a dark window, the night the storm cut the power (Byn i stormen): a white candle in a brass holder on
 * the window's sill, its flame, and the small bright halo round the flame. The warm light it throws on the window round
 * it is the chapter's glow (`storm.glows`), drawn with it. Its origin is the flame's heart; the candle stands under it.
 * Sizes in EL: a candle as a grown-up's shop has one, as tall as he is.
 */
export const WINDOW_CANDLE = {
  /** The wax: how wide across, and how far under the flame's heart its top is. */
  wax: { radius: 0.11, top: 0.16 },
  /** The holder under it: a dish and a short stem, brass. */
  holder: { dish: 0.3, tall: 0.26 },
  /** The flame: how tall and how wide, and the halo round it. */
  flame: { tall: 0.3, wide: 0.11, halo: 1.6 },
} as const;

/**
 * The candle, `tall` EL of wax. `update` makes the flame alive: it stretches and leans a little, and its halo breathes;
 * with `still` (less motion) it burns steady.
 */
export function windowCandle(tall: number): { group: Group; update(clock: number, still: boolean): void } {
  const { wax, holder, flame } = WINDOW_CANDLE;
  const group = new Group();
  group.name = 'window-candle';
  const stick = new Mesh(new CylinderGeometry(wax.radius, wax.radius * 1.04, tall, 12), new MeshStandardMaterial({ color: '#f3ead6', roughness: 0.55, emissive: '#ffcf8a', emissiveIntensity: 0.18 }));
  stick.position.y = -wax.top - tall / 2;
  // A drip of wax down its side, and the wick.
  const drip = new Mesh(new SphereGeometry(wax.radius * 0.45, 8, 6), stick.material);
  drip.scale.set(1, 2.4, 1);
  drip.position.set(wax.radius * 0.8, -wax.top - 0.22, wax.radius * 0.45);
  const wick = new Mesh(new CylinderGeometry(0.012, 0.012, 0.1, 5), new MeshBasicMaterial({ color: '#2a2018' }));
  wick.position.y = -wax.top + 0.03;
  // The brass holder: a dish on a short stem, turned.
  const base = -wax.top - tall;
  const brass = new MeshStandardMaterial({ color: '#b48a46', roughness: 0.35, metalness: 0.6 });
  const profile = [[0, 0], [holder.dish * 0.62, 0], [holder.dish * 0.66, 0.04], [0.07, 0.1], [0.06, holder.tall - 0.08], [holder.dish, holder.tall - 0.05], [holder.dish, holder.tall], [0, holder.tall]]
    .map(([r, y]) => new Vector2(r, y));
  const stand = new Mesh(new LatheGeometry(profile, 16), brass);
  stand.position.y = base - holder.tall;
  // The flame: a bright drop, white at its heart and gold round it, and its halo.
  const fire = new Group();
  const outer = new Mesh(new SphereGeometry(0.5, 12, 8), new MeshBasicMaterial({ color: '#ffb84a', fog: false }));
  outer.scale.set(flame.wide, flame.tall / 2, flame.wide);
  const inner = new Mesh(new SphereGeometry(0.5, 10, 6), new MeshBasicMaterial({ color: '#fff4d6', fog: false }));
  inner.scale.set(flame.wide * 0.5, flame.tall * 0.3, flame.wide * 0.5);
  inner.position.set(0, -flame.tall * 0.12, flame.wide * 0.35);
  fire.add(outer, inner);
  const halo = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({
    color: '#ffc06a', map: glowTexture(32), transparent: true, opacity: 0.9, depthWrite: false, blending: AdditiveBlending, fog: false,
  }));
  halo.scale.setScalar(flame.halo);
  halo.renderOrder = 3;
  group.add(stick, drip, wick, stand, fire, halo);
  return {
    group,
    update(clock, still) {
      // A candle's flame flickers in quick small steps, now and then a longer lick, and leans as the draught takes it.
      const flick = still ? 0 : 0.5 * Math.sin(clock * 11.3) * Math.sin(clock * 3.7) + 0.3 * Math.sin(clock * 23.1);
      fire.scale.set(1 - 0.08 * flick, 1 + 0.22 * flick, 1);
      fire.rotation.z = still ? 0 : 0.12 * Math.sin(clock * 1.9) * Math.sin(clock * 0.7);
      (halo.material as MeshBasicMaterial).opacity = 0.82 + 0.14 * flick;
    },
  };
}
