import type { Group, Object3D } from 'three';
import type { ChapterData, Spot } from '../../sim/types';

/**
 * The otter on its stone out in Älven's lake (art/blender/a2-creatures.py, `utter`; ./render.ts draws it sitting). If
 * Elof goes out to it over the rolling logs, it does not wait for him (Olov, 12 November 2026: "om man går ut till
 * uttern så hoppar den ner i älven med ett plask"): it looks round at him, turns, and jumps off the far side of its
 * stone, head first into the water, with a splash; a moment later it comes up a little way off, on its back as otters
 * float, drifts away, and is gone. When he is back on the shore, or far on, it climbs up onto its stone again. It is
 * all the picture's business: nothing here touches the simulation.
 */

/** Where Elof is and how he goes: the storm's own, set every frame (./render.ts). */
export interface OtterWatcher { x: number; y: number; still: boolean; riding: boolean }

/** A splash where something goes into the water, `since` seconds after it did (./render.ts, `waterSplash`). */
export interface Splash { group: Group; update(since: number, still: boolean): void }

/** How near he comes before it goes: out on the second of the rolling logs, a hop or two from its stone. */
export const OTTER_REACH = 5;
/** How far away he must be, back along the shore or on beyond the lake, for it to come back to its stone. */
const BACK_AWAY = 9;
const BACK_ON = 14;
/** How long it looks at him, its leap, under the water, its swim away, and its climb back up. */
const ALERT = 0.5;
const LEAP = 0.62;
const UNDER = 0.9;
const SWIM = 2.8;
const CLIMB = 1.1;
/** Where it goes in, past its stone's far end, and how high its leap goes over the stone. */
const OUT = 2.2;
const HIGH = 0.75;
/** How far through its leap its head goes into the water, where the splash is. */
const IN = 0.72;
/** Where it swims away to, from where it went in: out into the lake and away behind the path. */
const AWAY = { x: 5.2, z: -2.6 };

const smooth = (t: number) => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k); };

type Phase = 'sit' | 'alert' | 'leap' | 'under' | 'swim' | 'away' | 'climb';

/**
 * The otter's life on its stone. `sit` moves it as it sits there (looking about, its back bobbing); `group` is the otter
 * itself in its stone's frame, and `splash` goes in that frame too, at the water where it goes in.
 */
export function otterLife(spot: Spot, group: Group, elof: OtterWatcher, splash: Splash, water: () => NonNullable<ChapterData['water']>, sit: (clock: number) => void): { alive(clock: number, dt: number): void; splash: Object3D; phase(): Phase } {
  let phase: Phase = 'sit';
  let since = 0;
  /** The water's surface beside its stone, from its stone's top. */
  let surface: number | null = null;
  const next = (to: Phase) => { phase = to; since = 0; };
  return {
    splash: splash.group,
    phase: () => phase,
    alive(clock, dt) {
      if (surface === null) {
        const lake = water().find((w) => w.from >= spot.at.x - 0.1);
        surface = (lake?.y ?? spot.at.y - 0.75) - spot.at.y;
      }
      since += dt;
      const dx = elof.x - spot.at.x;
      const coming = !elof.riding && dx > -OTTER_REACH && dx < 3;
      if (phase === 'sit' && coming) next('alert');
      else if (phase === 'alert' && since > ALERT) next('leap');
      else if (phase === 'leap' && since > LEAP) next('under');
      else if (phase === 'under' && since > UNDER) next('swim');
      else if (phase === 'swim' && since > SWIM) next('away');
      else if (phase === 'away' && (dx < -BACK_AWAY || dx > BACK_ON)) next('climb');
      else if (phase === 'climb' && since > CLIMB) next('sit');
      group.position.set(0, 0, 0);
      group.rotation.set(0, 0, 0);
      group.scale.y = group.scale.x;
      group.visible = true;
      splash.group.position.set(OUT, surface, 0);
      // Since it went in, for the splash; before that, none.
      const wentIn = phase === 'under' ? LEAP * (1 - IN) + since : phase === 'swim' ? LEAP * (1 - IN) + UNDER + since : phase === 'leap' && since > LEAP * IN ? since - LEAP * IN : -1;
      splash.update(wentIn, elof.still);
      if (elof.still) {
        // With less motion it is simply there, or gone, with only the rings where it went in.
        group.visible = phase === 'sit' || phase === 'alert';
        if (group.visible) sit(clock);
        return;
      }
      if (phase === 'sit') {
        sit(clock);
        return;
      }
      if (phase === 'alert') {
        // Its head up and round to him, and down it goes a little, ready.
        const k = smooth(since / 0.25);
        sit(clock);
        group.rotation.y = -0.9 * k;
        group.scale.y = group.scale.x * (1 - 0.12 * smooth((since - 0.2) / 0.3));
        return;
      }
      if (phase === 'leap') {
        // Turned away from him, off the stone's far end in an arc, head first, and in.
        const k = since / LEAP;
        const turn = smooth(k / 0.25);
        const x = OUT * smooth(k);
        const y = surface * k * k + HIGH * Math.sin(Math.PI * Math.min(1, k)) - 0.4 * Math.max(0, k - 0.82) / 0.18;
        group.position.set(x, y, 0);
        // Upright it faces us (+z); turned, its front is +x; tipped forward past lying flat, it goes in head first.
        group.rotation.set(-0.2 + 2.4 * smooth((k - 0.12) / 0.88), -0.9 + (Math.PI / 2 + 0.9) * turn, 0, 'YXZ');
        group.visible = y > surface - 0.6;
        return;
      }
      if (phase === 'climb') {
        // Back again: up out of the water at its stone's end, and a hop up onto it.
        const hop = smooth(since / CLIMB);
        const from = { x: OUT * 0.8, y: surface - 0.35 };
        group.position.set(from.x * (1 - hop), from.y * (1 - hop) + 0.5 * Math.sin(Math.PI * hop), 0);
        group.rotation.set(0.5 * (1 - hop), -Math.PI / 2 * (1 - hop), 0, 'YXZ');
        return;
      }
      if (phase === 'swim') {
        // Up again a little way off, as otters do on their backs: its belly and its face to the sky, its paws on its
        // chest, drifting away head first, rocking on the water; and under again.
        const k = smooth(since / SWIM);
        const rising = smooth(since / 0.4);
        const sinking = smooth((since - (SWIM - 0.5)) / 0.5);
        group.position.set(OUT + 1 + AWAY.x * k, surface - 0.18 - 0.4 * (1 - rising) - 0.5 * sinking + 0.03 * Math.sin(clock * 3), AWAY.z * k);
        // Tipped back past lying flat its head goes the way its back faced: so it is turned to face from where it goes.
        group.rotation.set(-1.45, Math.atan2(AWAY.x, AWAY.z) + Math.PI, 0.12 * Math.sin(clock * 2.4), 'YXZ');
        group.visible = sinking < 1;
        return;
      }
      // Under the water, and gone.
      group.visible = false;
    },
  };
}
