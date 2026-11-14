/**
 * Sickan's life in the storm garden, without the picture (./sickan.ts draws her): where she is, which way she faces and
 * what she is doing, a frame at a time. Nothing here knows three or the page, so that it can be played through in a test.
 *
 * She keeps to shelter and waits for Elof at one place after another (`SickanPlace`, in the chapter). As he comes she
 * looks at him and greets him with a slow blink; as he reaches her she gets up and pads on ahead of him to the next
 * place along the way given (walked, trotted and leapt), faster than he runs, and settles there before he arrives. She
 * goes only forwards, as far as he has ever come: taken back by a gust or a fall, he finds her still ahead.
 *
 * She is never moved while she is seen. Where a place has no way on (she cannot cross the flooded lawn), she stays and
 * watches him go, and is put at the next place once he is well ahead and neither place is in the picture. With less
 * motion she rests at her places only, in each one's first pose, and changes place the same way.
 */

export type SickanPose = 'sit' | 'crouch' | 'stand';

/** One leg of her way: to this point, at a walk, a trot or in one leap. */
export interface SickanStep {
  x: number;
  z: number;
  /** Her feet's height there, where it is not the lawn's (a step, the deck). */
  y?: number;
  gait: 'walk' | 'trot' | 'leap';
}

export interface SickanPlace {
  id: string;
  x: number;
  /** Behind the path: he walks at 0, and nothing of her comes nearer than about 1.6. */
  z: number;
  /** Her feet's height, where it is not the lawn's. */
  y?: number;
  pose: SickanPose;
  /** The way she faces as she rests, about the world's up: 0 along +x, turning towards the back as it grows. */
  face: number;
  /** He has come to her once he is this far along the course: she leaves for the next place, if she has a way there. */
  go: number;
  /** The way to the next place. Left out: she stays until he is far ahead, and is put there unseen. */
  path?: readonly SickanStep[];
  /** She washes while he is far off. */
  wash?: boolean;
  /** She shakes the rain off as she arrives. */
  shake?: boolean;
  /** Too near the next place for the change to be made unseen: with less motion she is never put here. */
  passing?: boolean;
  /** Something she watches while it happens, in place of him: from the flag `on` until `until`. */
  watch?: { on: string; until: string; x: number; y: number; z: number };
}

/** How big she is drawn: the kit builds her 1 tall at the withers (art/blender/sickan.py), a cat's 25 cm to his 15. */
export const SICKAN_SIZE = 1.68;
/** As the kit builds them, in her own units (a test holds the two the same). */
export const WALK_STRIDE = 0.84;
export const TROT_STRIDE = 1.5;
export const LID_OPEN = 124;
export const JUMP = { frames: 36, lift: 8, land: 24 } as const;
export const FPS = 24;
/** Her clips' lengths in frames, those she plays to their end. */
export const FRAMES = { greet: 60, stretch: 56, shake: 34, wash: 120 } as const;

/** How fast she goes, in EL a second: he runs 3.5. */
export const WALK_SPEED = 2.4;
export const TROT_SPEED = 6.4;
/** How near he is when she looks at him, greets him, and stops washing. */
export const LOOK_RANGE = 12;
export const GREET_RANGE = 7;
const WASH_RANGE = 9.5;
/** How far ahead of her he is before she is put at her next place, unseen. */
const LEFT_BEHIND = 16;
const TURN = 7;
/** How far her feet go as she turns on the spot, in EL for each radian: they step round, and do not slide. */
export const TURN_STEP = 0.75;

export type SickanMode = 'rest' | 'rise' | 'go' | 'leap' | 'settle';

/** What she shows: a clip played on its own clock, or held at a phase the life works out (a stride, a leap). */
export interface SickanShow {
  clip: string;
  /** 0 to 1: the clip is scrubbed there. Left out: it plays. */
  phase?: number;
  once?: boolean;
  fade?: number;
}

export interface SickanState {
  /** The place she rests at, or is on her way to. */
  place: number;
  mode: SickanMode;
  x: number;
  y: number;
  z: number;
  heading: number;
  /** Shown as in a mirror: the side her tail lies on, and the paw she washes, are the camera's. */
  mirror: boolean;
  /** How far up her nose tips, in radians: down a slope, into a leap. */
  pitch: number;
  /** How long she has been in her mode, and at what she does there. */
  time: number;
  doing: 'idle' | 'greet' | 'wash' | 'shake' | 'stretch';
  since: number;
  greeted: boolean;
  /** Which step of her way she is on; and where she came from, for the leap's arc. */
  step: number;
  /** Straight out of one leap into the next: she is already down in her crouch. */
  bound: boolean;
  from: { x: number; y: number; z: number };
  /** Her stride's phase, counted by how far she has gone. */
  stride: number;
  gait: 'walk' | 'trot';
  show: SickanShow;
  /** How far he has ever come. */
  progress: number;
  /** His speed along the course, smoothed. */
  pace: number;
  lastElof: number | null;
}

export interface SickanInput {
  dt: number;
  elof: { x: number; y: number };
  still: boolean;
  flags: ReadonlySet<string>;
  /** The lawn's height at x (the land under the things he walks on). */
  ground(x: number): number;
  /** Whether a point is in the picture, with a margin: she is never moved there. */
  seen(x: number, y: number, z: number): boolean;
}

const smooth = (v: number) => { const k = Math.min(1, Math.max(0, v)); return k * k * (3 - 2 * k); };
const turnTo = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const toward = (from: number, to: number, most: number) => from + Math.max(-most, Math.min(most, turnTo(from, to)));

/** The place she is at, or bound for, once he has come as far as `progress`: the first he has not yet reached. */
export function placeFor(places: readonly SickanPlace[], progress: number, still = false): number {
  let index = 0;
  while (index < places.length - 1 && (progress >= places[index]!.go || (still && places[index]!.passing))) index++;
  return index;
}

/** Her feet's height at a place. */
const heightOf = (place: { x: number; y?: number }, ground: (x: number) => number) => place.y ?? ground(place.x);

export function createSickan(places: readonly SickanPlace[]): SickanState {
  const first = places[0]!;
  return {
    place: -1, mode: 'rest', x: first.x, y: first.y ?? 0, z: first.z, heading: first.face, mirror: Math.cos(first.face) < 0, pitch: 0,
    time: 0, doing: 'idle', since: 0, greeted: false, step: 0, bound: false, from: { x: first.x, y: first.y ?? 0, z: first.z },
    stride: 0, gait: 'trot', show: { clip: first.pose }, progress: -Infinity, pace: 0, lastElof: null,
  };
}

function rest(state: SickanState, places: readonly SickanPlace[], index: number, ground: (x: number) => number): void {
  const place = places[index]!;
  state.place = index;
  state.mode = 'rest';
  state.x = place.x;
  state.y = heightOf(place, ground);
  state.z = place.z;
  state.heading = place.face;
  state.mirror = Math.cos(place.face) < 0;
  state.pitch = 0;
  state.time = 0;
  state.doing = 'idle';
  state.since = 0;
  state.greeted = false;
  state.show = { clip: place.pose, fade: 0 };
}

/** How long a leap is in the air, by how far it goes. */
export function leapSeconds(from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }): number {
  const far = Math.hypot(to.x - from.x, to.z - from.z);
  return Math.min(0.85, Math.max(0.42, 0.3 + 0.075 * far + 0.04 * Math.max(0, from.y - to.y)));
}

/** How high over the straight line between its ends a leap rises. */
export function leapRise(from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }): number {
  const far = Math.hypot(to.x - from.x, to.z - from.z);
  return 0.35 + 0.2 * far + 0.5 * Math.max(0, to.y - from.y);
}

const CROUCH = JUMP.lift / FPS;
const LANDING = (JUMP.frames - JUMP.land) / FPS;
/** Between two leaps she does not stand up: the landing goes straight into the next crouch. */
const BOUND = { until: 28, from: 3 } as const;

/**
 * One frame of her life. It changes `state` and returns it: where she is, and what she shows (`show`).
 */
export function stepSickan(state: SickanState, places: readonly SickanPlace[], input: SickanInput): SickanState {
  const { dt, elof, still, ground, seen } = input;
  state.progress = Math.max(state.progress, elof.x);
  if (state.lastElof !== null && dt > 0) state.pace += (Math.abs(elof.x - state.lastElof) / dt - state.pace) * Math.min(1, dt * 6);
  state.lastElof = elof.x;
  const due = placeFor(places, state.progress, still);

  // The first frame, a game taken up in the middle of the chapter: she is where she would be by now.
  if (state.place < 0) {
    rest(state, places, due, ground);
    if (still) state.show = { clip: places[due]!.pose, phase: 0 };
    return state;
  }
  const at = (index: number) => { const p = places[index]!; return { x: p.x, y: heightOf(p, ground), z: p.z }; };
  const unseen = (p: { x: number; y: number; z: number }) => !seen(p.x, p.y + 0.8, p.z);
  const herself = { x: state.x, y: state.y, z: state.z };

  if (still) {
    // Less motion: she rests at her place, in its first pose, and is put at the next once neither is in the picture.
    if (state.place !== due || state.mode !== 'rest') {
      if (unseen(herself) && unseen(at(due))) rest(state, places, due, ground);
      else if (state.mode !== 'rest') { state.show = { clip: 'stand', phase: 0 }; state.pitch = 0; }
    }
    if (state.mode === 'rest') state.show = { clip: places[state.place]!.pose, phase: 0 };
    return state;
  }

  // Left far behind, out of the picture (he was carried, or she was held up): she is ahead of him again, unseen.
  if (state.place < due && state.x < elof.x - LEFT_BEHIND && unseen(herself) && unseen(at(due))) {
    rest(state, places, due, ground);
    return state;
  }

  state.time += dt;
  state.since += dt;
  const place = places[state.place]!;
  const near = Math.abs(elof.x - state.x);

  if (state.mode === 'rest') {
    state.pitch = 0;
    if (due > state.place && place.path) {
      // He has reached her: up she gets. At his run, quickly; if he dawdles, with a long stretch first.
      state.mode = 'rise';
      state.time = 0;
      const slow = place.pose === 'sit' && state.pace < 1.2;
      state.doing = slow ? 'stretch' : 'idle';
      state.show = slow ? { clip: 'stretch', once: true, fade: 0.2 } : { clip: 'stand', fade: 0.28 };
      return state;
    }
    if (state.doing === 'greet' && state.since >= FRAMES.greet / FPS) { state.doing = 'idle'; state.since = 0; }
    if (state.doing === 'shake' && state.since >= FRAMES.shake / FPS) { state.doing = 'idle'; state.since = 0; }
    // What she watches here (the tap's water, the lid coming up) has her whole attention while it happens.
    const watching = !!place.watch && input.flags.has(place.watch.on) && !input.flags.has(place.watch.until);
    if (state.doing === 'wash' && (near < WASH_RANGE || watching)) { state.doing = 'idle'; state.since = 0; }
    if (state.doing === 'idle') {
      if (!state.greeted && near < GREET_RANGE && place.pose === 'sit') {
        state.greeted = true;
        state.doing = 'greet';
        state.since = 0;
      } else if (place.wash && place.pose === 'sit' && near > WASH_RANGE + 1 && state.since > 1.5 && !watching) {
        state.doing = 'wash';
        state.since = 0;
      }
    }
    state.show = state.doing === 'greet' ? { clip: 'greet', once: true, fade: 0.3 }
      : state.doing === 'shake' ? { clip: 'shake', once: true, fade: 0.2 }
        : state.doing === 'wash' ? { clip: 'wash', fade: 0.45 }
          : { clip: place.pose, fade: 0.45 };
    return state;
  }

  if (state.mode === 'rise') {
    const length = state.doing === 'stretch' ? FRAMES.stretch / FPS : 0.3;
    if (state.time >= length) {
      // From here on `place` is where she is going.
      state.place += 1;
      state.mode = 'go';
      state.time = 0;
      state.step = 0;
      state.bound = false;
      state.doing = 'idle';
      state.from = herself;
    }
    return state;
  }

  if (state.mode === 'settle') {
    // Arrived: she turns to face the way she will sit, shakes the rain off where she does, and settles.
    state.pitch += (0 - state.pitch) * Math.min(1, dt * 8);
    const before = state.heading;
    state.heading = toward(state.heading, place.face, TURN * dt);
    const faced = Math.abs(turnTo(state.heading, place.face)) < 0.04;
    if (state.doing === 'shake') {
      state.show = { clip: 'shake', once: true, fade: 0.2 };
      if (state.since < FRAMES.shake / FPS) return state;
    } else {
      // Stepping round until she faces the way she will sit; then still.
      state.stride += (Math.abs(turnTo(before, state.heading)) * TURN_STEP) / (WALK_STRIDE * SICKAN_SIZE);
      state.show = faced ? { clip: 'stand', fade: 0.25 } : { clip: 'walk', phase: state.stride - Math.floor(state.stride), fade: 0.2 };
      if (!faced || state.time < 0.2) return state;
      // The rain shaken off, where she has come in under something; not with him already upon her.
      if (place.shake && elof.x < place.go - 5) { state.doing = 'shake'; state.since = 0; return state; }
    }
    const greeted = state.greeted;
    rest(state, places, state.place, ground);
    state.greeted = greeted;
    state.show = { clip: place.pose, fade: 0.5 };
    return state;
  }

  // On her way: the place she left has the way, and `place` is where it ends.
  const way = places[state.place - 1]?.path ?? [];
  const step = way[state.step];
  const arrive = () => {
    // Where the way ends she settles; unless he is already past this place too, and she pads straight on.
    if (due > state.place && place.path) {
      state.mode = 'go';
      state.place += 1;
      state.step = 0;
      state.time = 0;
      state.bound = false;
      state.from = { x: state.x, y: state.y, z: state.z };
      return;
    }
    state.mode = 'settle';
    state.time = 0;
    state.since = 0;
    state.doing = 'idle';
    state.greeted = false;
  };
  const to = step ? { x: step.x, y: heightOf(step, ground), z: step.z } : at(state.place);
  const gait = step?.gait ?? 'trot';

  if (state.mode === 'leap') {
    const air = leapSeconds(state.from, to);
    const bounding = way[state.step + 1]?.gait === 'leap';
    const crouch = state.bound ? (CROUCH * (JUMP.lift - BOUND.from)) / JUMP.lift : CROUCH;
    const landing = bounding ? (BOUND.until - JUMP.land) / FPS : LANDING;
    const want = Math.atan2(-(to.z - state.from.z), to.x - state.from.x);
    if (state.time < crouch) {
      // Gathering herself, turned the way she will leap.
      state.heading = toward(state.heading, want, TURN * 1.5 * dt);
      const first = state.bound ? BOUND.from : 0;
      state.show = { clip: 'jump', phase: (first + (JUMP.lift - first) * (state.time / crouch)) / JUMP.frames };
      state.pitch += (0 - state.pitch) * Math.min(1, dt * 10);
    } else if (state.time < crouch + air) {
      const k = (state.time - crouch) / air;
      state.heading = want;
      state.x = state.from.x + (to.x - state.from.x) * k;
      state.z = state.from.z + (to.z - state.from.z) * k;
      state.y = state.from.y + (to.y - state.from.y) * k + leapRise(state.from, to) * 4 * k * (1 - k);
      // Down a drop she tips nose down as she falls, on top of the clip's own arc.
      const fall = Math.max(0, state.from.y - to.y) / Math.max(1, Math.hypot(to.x - state.from.x, to.z - state.from.z));
      state.pitch = -Math.min(0.5, 0.7 * fall) * smooth((k - 0.3) / 0.5) * (1 - smooth((k - 0.9) / 0.1));
      state.show = { clip: 'jump', phase: (JUMP.lift + (JUMP.land - JUMP.lift) * k) / JUMP.frames };
    } else if (state.time < crouch + air + landing) {
      state.x = to.x;
      state.y = to.y;
      state.z = to.z;
      state.pitch = 0;
      const k = (state.time - crouch - air) / landing;
      state.show = { clip: 'jump', phase: (JUMP.land + ((bounding ? BOUND.until : JUMP.frames) - JUMP.land) * k) / JUMP.frames };
    } else {
      state.mode = 'go';
      state.time = 0;
      state.step += 1;
      state.from = { x: to.x, y: to.y, z: to.z };
      state.bound = bounding;
      if (state.step >= way.length && Math.hypot(at(state.place).x - state.x, at(state.place).z - state.z) < 0.2) arrive();
    }
    return state;
  }

  // Walking or trotting to the step's point (or, past the last step, to the place itself).
  if (gait === 'leap') {
    state.mode = 'leap';
    state.time = 0;
    state.from = { x: state.x, y: state.y, z: state.z };
    state.show = { clip: 'jump', phase: (state.bound ? BOUND.from : 0) / JUMP.frames, fade: 0.15 };
    return state;
  }
  state.bound = false;
  const dx = to.x - state.x, dz = to.z - state.z;
  const far = Math.hypot(dx, dz);
  const want = Math.atan2(-dz, dx);
  const before = state.heading;
  state.heading = toward(state.heading, want, TURN * dt);
  const turned = Math.abs(turnTo(before, state.heading));
  const facing = Math.max(0, Math.cos(turnTo(state.heading, want)));
  state.gait = gait === 'walk' ? 'walk' : 'trot';
  const speed = (state.gait === 'walk' ? WALK_SPEED : TROT_SPEED) * (0.15 + 0.85 * facing * facing);
  const pace = Math.min(far, speed * dt);
  if (far > 1e-6) {
    state.x += (dx / far) * pace;
    state.z += (dz / far) * pace;
  }
  // Her feet on the ground: between two heights given, straight from one to the other; else on the lawn.
  const span = Math.hypot(to.x - state.from.x, to.z - state.from.z);
  const k = span > 1e-6 ? 1 - Math.min(1, Math.hypot(to.x - state.x, to.z - state.z) / span) : 1;
  const lawn = (ground(state.x - 0.5) + ground(state.x) + ground(state.x + 0.5)) / 3;
  const givenFrom = state.step === 0 ? places[state.place - 1]?.y !== undefined : way[state.step - 1]?.y !== undefined;
  const givenTo = step ? step.y !== undefined : place.y !== undefined;
  const y = givenFrom && givenTo ? state.from.y + (to.y - state.from.y) * k : lawn;
  const slope = pace > 1e-6 ? (y - state.y) / pace : 0;
  state.y = y;
  state.pitch += (Math.max(-0.45, Math.min(0.45, Math.atan(slope))) * Math.cos(turnTo(state.heading, want)) - state.pitch) * Math.min(1, dt * 7);
  // Her stride by how far her feet have gone: along her way, and round as she turns.
  state.stride += (pace + turned * TURN_STEP) / ((state.gait === 'walk' ? WALK_STRIDE : TROT_STRIDE) * SICKAN_SIZE);
  state.show = { clip: state.gait, phase: state.stride - Math.floor(state.stride), fade: 0.22 };
  if (far - pace < 0.05) {
    if (!step) { arrive(); return state; }
    state.step += 1;
    state.from = { x: to.x, y: to.y, z: to.z };
    if (state.step >= way.length && Math.hypot(at(state.place).x - state.x, at(state.place).z - state.z) < 0.2) arrive();
  }
  return state;
}
