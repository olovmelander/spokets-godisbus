import type { Speaker } from '../sim/types';
import type { Pose } from './rig';

/**
 * Talk: how the bodies in the picture go on living while something is said (Olov, 9 November 2026: "Vi måste också fixa att
 * när någon säger någonting så blir allt helt stilla, karaktärerna kan fortsätta röra sig lite subtilt medans någon pratar",
 * and "Går det även lägga till lip-sync för den som pratar?").
 *
 * While a line waits for Fortsätt the story holds: the scene's clock, its flags and Elof's control wait with it, so the story
 * never runs ahead of the words. The picture does not. Each body goes on breathing and standing as it stands, on a clock of
 * its own (./stage.ts); whoever speaks moves the mouth with the line's own words and the head and shoulders with them, a
 * hand now and then; the others look at them, and everyone blinks. Nothing here moves the simulation, and nothing allocates
 * in a frame.
 *
 * Pure: no three, no page. The view tells it what is said each frame (`talk.hear`), and each body has a `Talker` that turns
 * that into a little more pose, a mouth and lids (./face.ts draws them).
 */

/** What is said now, as the page shows it: whose bubble is up, its words, how long it has been up (paused, it waits). */
export interface TalkFrame {
  who: Speaker | null;
  text: string;
  /** Seconds since this line came up. A paused game holds it. */
  seconds: number;
  /** The story waits for Fortsätt: the authored moment, its actors and its clock, hold until it is pressed. */
  reading: boolean;
  /** A matching recording's playback position; absent for unrecorded or muted lines. */
  voice?: { seconds: number; duration: number } | null;
}

/** A mouth: how far open (0 shut, 1 as wide as an "a"), and how round (0 spread, 1 the pursed round of an "u"). */
export interface Mouth { open: number; round: number }

/**
 * A line's mouth, worked out once when it comes up: the shapes (open, round) at their moments, and the stressed syllables
 * the head goes with. `length` is when its last sound is made; the mouth has shut a moment after.
 */
export interface Track {
  /** Each key is three numbers: seconds, open, round. */
  keys: Float32Array;
  count: number;
  /** When each word's first vowel peaks: Swedish stresses a word's first syllable, and the head nods with it. */
  beats: Float32Array;
  length: number;
  /** How many times it says "klonk": the ghost bobs once for each (`klonksIn`). */
  klonks: number;
}

/** The vowels: [open, round]. A, å and ä open the jaw; o, u, y and ö round the lips; e and i spread them, a little open. */
const VOWELS: Readonly<Record<string, readonly [number, number]>> = {
  a: [1, 0], 'á': [1, 0], 'à': [1, 0], 'å': [0.74, 0.5], 'ä': [0.8, 0], o: [0.56, 0.95], u: [0.42, 1], y: [0.36, 0.85],
  'ö': [0.52, 0.75], e: [0.56, 0], 'é': [0.56, 0], 'è': [0.56, 0], i: [0.38, 0],
};
/** The lips close for m, b and p; the lower lip comes up to the teeth for f and v; the rest leave the jaw a little open. */
const CLOSED = new Set(['m', 'b', 'p']), TEETH = new Set(['f', 'v', 'w']);
/** How long each sound takes, in seconds, at an easy pace: a syllable comes to about 0.3 s, three a second. */
const VOWEL = 0.15, CONSONANT = 0.055, LIPS = 0.075, WORD = 0.035;
/** A pause at a comma, at a sentence's end, and at a trailing "…". */
const COMMA = 0.22, STOP = 0.34, TRAIL = 0.48;
/** How long the mouth takes to start parting, and to shut after the last sound. */
const START = 0.1, CLOSE = 0.12;
/** Each one's own pace: the grandparents slower, the children quicker. */
const PACE: Partial<Record<Speaker, number>> = { mormor: 1.12, morfar: 1.15, pappa: 1.04, mamma: 1, moa: 0.95, bertil: 0.93, elof: 0.95 };

/** A small seeded random (mulberry32), so that the same line is said the same way every time. */
function random(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A whole number from a string, for a seed. */
export function hashOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * The mouth for a line of Swedish, at a natural speaking pace for its length (about three syllables a second): its vowels open
 * the jaw (a, å, ä) or round the lips (o, u, y, ö), m, b and p close them, f and v bring the lip to the teeth; the other
 * consonants leave it a little open between the vowels. Pauses at commas and full stops. Each word's first syllable is said
 * a little more, the others a little less, and each sound's length and size vary a little, the same way each time the line
 * is said. It ends shut.
 */
export function mouthTrack(text: string, who: Speaker | null = null): Track {
  const next = random(hashOf(`${who ?? ''}:${text}`));
  const pace = (who && PACE[who]) ?? 1;
  const vary = () => (0.86 + 0.28 * next()) * pace;
  const keys: number[] = [0, 0, 0];
  const beats: number[] = [];
  let t = START, round = 0, open = 0, inWord = false, first = true, last = 0;
  const key = (at: number, o: number, r: number) => { keys.push(at, o, r); last = at; };
  const words = text.toLowerCase().replace(/\.\.\./g, '…');
  for (let i = 0; i < words.length; i++) {
    const c = words[i]!;
    const vowel = VOWELS[c];
    if (vowel) {
      const length = VOWEL * vary();
      // The first vowel of a word carries its stress.
      const stress = first ? 1.08 : 0.84;
      open = Math.min(1, vowel[0] * stress * (0.84 + 0.16 * next()));
      round = vowel[1];
      // The mouth is at its shape a little before the middle of the sound: the lips go ahead of the voice.
      key(t + length * 0.4, open, round);
      if (first) beats.push(t + length * 0.4);
      first = false;
      t += length;
      inWord = true;
    } else if (/\p{L}/u.test(c)) {
      if (!inWord) first = true;
      inWord = true;
      if (CLOSED.has(c)) {
        const length = LIPS * vary();
        key(t + length * 0.45, 0, round * 0.5);
        t += length;
      } else if (TEETH.has(c)) {
        const length = LIPS * vary();
        key(t + length * 0.45, 0.1, 0);
        t += length;
      } else {
        const length = CONSONANT * vary();
        // The jaw comes up a little between the vowels, as far as the tongue needs; an s or a t closes it most.
        const up = c === 's' || c === 't' || c === 'd' || c === 'n' ? 0.16 : 0.24;
        key(t + length * 0.5, Math.min(open, up), round * 0.6);
        t += length;
      }
    } else {
      if (inWord) first = true;
      inWord = false;
      const pause = c === '…' ? TRAIL : c === '.' || c === '!' || c === '?' ? STOP
        : c === ',' || c === ';' || c === ':' || c === '–' || c === '-' ? COMMA : c === ' ' ? WORD : 0;
      if (pause <= 0) continue;
      // A real pause shuts the mouth; a word's gap only lets it come together a little.
      const rest = i < words.length - 1 && pause >= COMMA;
      if (rest) {
        key(t + 0.06 * pace, 0, 0);
        open = round = 0;
      }
      t += pause * pace * (rest ? 1 : 0.8 + 0.4 * next());
    }
  }
  const length = last;
  // Shut after the last sound.
  keys.push(Math.max(last + CLOSE, t), 0, 0);
  return { keys: Float32Array.from(keys), count: keys.length / 3, beats: Float32Array.from(beats), length, klonks: klonksIn(text) };
}

/** Catmull-Rom between keys, kept within 0 and 1. */
function curve(a: number, b: number, c: number, d: number, s: number): number {
  const s2 = s * s, s3 = s2 * s;
  const v = 0.5 * (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s2 + (-a + 3 * b - 3 * c + d) * s3);
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** The mouth at `seconds` into a line: smoothly through its keys, shut before and after. */
export function mouthAt(track: Track | null, seconds: number, out: Mouth): Mouth {
  out.open = 0; out.round = 0;
  if (!track || seconds <= 0 || seconds >= track.keys[(track.count - 1) * 3]!) return out;
  const k = track.keys, n = track.count;
  let i = 0;
  while (i < n - 2 && k[(i + 1) * 3]! <= seconds) i++;
  const t0 = k[i * 3]!, t1 = k[(i + 1) * 3]!;
  const s = t1 > t0 ? Math.min(1, Math.max(0, (seconds - t0) / (t1 - t0))) : 1;
  const a = Math.max(0, i - 1) * 3, b = i * 3, c = (i + 1) * 3, d = Math.min(n - 1, i + 2) * 3;
  out.open = curve(k[a + 1]!, k[b + 1]!, k[c + 1]!, k[d + 1]!, s);
  out.round = curve(k[a + 2]!, k[b + 2]!, k[c + 2]!, k[d + 2]!, s);
  return out;
}

/** How many times the ghost says "klonk" in a line: it has no mouth (plan §2.2), and bobs once for each instead. */
export function klonksIn(text: string): number {
  return Math.max(1, (text.toLowerCase().match(/klonk/g) ?? []).length);
}

/** The ghost's klonks: one every KLONK_GAP seconds, each a bob that takes KLONK_TIME. */
export const KLONK_GAP = 0.38, KLONK_TIME = 0.26;

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const pulse = (t: number, at: number, up: number, hold: number, down: number) => smooth((t - at) / up) * (1 - smooth((t - at - up - hold) / down));
/** A nod with a beat: up to its height `peak` seconds after it, and away again (a shape like x·e^(1-x)). */
const bump = (x: number, peak: number) => (x <= 0 ? 0 : (x / peak) * Math.exp(1 - x / peak));

/**
 * What the picture is told is said, each frame: one picture at a time, as the aventyr2 kit's `elof` is
 * (../content/aventyr2/render.ts). The view hears the page's words; each body that can say something tells where its face is
 * (`place`), so that the others can look at it the next frame.
 */
export interface Conversation {
  readonly who: Speaker | null;
  readonly seconds: number;
  /** The picture's elapsed time this frame: speech keeps living while an event waits. Zero on Pause. */
  readonly dt: number;
  readonly reading: boolean;
  /** How far the picture is into a held line, 0 to 1: eased in and out over about half a second. */
  readonly held: number;
  /** The line's mouth, while someone says something. */
  readonly track: Track | null;
  /** The words of the line. */
  readonly text: string;
  /**
   * Who the line is said to, for where the one speaking looks: Elof, when anyone else speaks; when he speaks, the last of the
   * others who spoke to him a moment ago.
   */
  readonly to: Speaker | null;
  /** Who someone should look at now: whoever speaks, or, for the one speaking, whoever they speak to. */
  lookAt(who: Speaker): Speaker | null;
  hear(frame: TalkFrame | null | undefined, dt: number): void;
  /** Where someone's face is now, in the world. */
  place(who: Speaker, x: number, y: number, z: number): void;
  /** Where someone's face was last drawn, if it was drawn a moment ago. */
  face(who: Speaker): { readonly x: number; readonly y: number; readonly z: number } | null;
  /** Forget everything: a new picture. */
  reset(): void;
}

export function createConversation(): Conversation {
  let who: Speaker | null = null, seconds = 0, reading = false, held = 0, track: Track | null = null, text = '';
  let saidBy: Speaker | null = null, saidText = '', rawSeconds = 0, recorded = false;
  // The last of the others who spoke, and how long ago their line ended: Elof answers them.
  let other: Speaker | null = null, since = Infinity;
  let frame = 0, elapsed = 0;
  const faces = new Map<Speaker, { x: number; y: number; z: number; frame: number }>();
  const addressee = () => (who === null ? null : who !== 'elof' ? 'elof' : since < 8 ? other : null);
  return {
    get who() { return who; },
    get seconds() { return seconds; },
    get dt() { return elapsed; },
    get reading() { return reading; },
    get held() { return held; },
    get track() { return track; },
    get text() { return text; },
    get to() { return addressee(); },
    lookAt(one) { return who === null ? null : who === one ? addressee() : who; },
    hear(heard, dt) {
      elapsed = dt;
      frame++;
      reading = heard?.reading ?? false;
      who = heard?.who ?? null;
      seconds = heard?.seconds ?? 0;
      text = heard?.text ?? '';
      if (who !== saidBy || text !== saidText || seconds + 1e-5 < rawSeconds) {
        saidBy = who; saidText = text; recorded = false;
        track = who && text ? mouthTrack(text, who) : null;
      }
      rawSeconds = seconds;
      if (track) {
        const end = track.keys[(track.count - 1) * 3]!;
        if (heard?.voice) {
          recorded = true;
          // The text supplies the shapes, the recording their pace. Buffering and Pause cannot leave the mouth
          // speaking ahead of the sound. Metadata may arrive a moment after the bubble.
          seconds = heard.voice.duration > 0 ? Math.min(1, heard.voice.seconds / heard.voice.duration) * end : 0;
        } else if (recorded) seconds = end; // A finished recording stays shut while its bubble is still being read.
      }
      if (who !== null && who !== 'elof') { other = who; since = 0; } else if (dt > 0) since += dt;
      // In and out over about half a second: no snap as the hold begins or ends.
      if (dt > 0) held += ((reading ? 1 : 0) - held) * (1 - Math.exp(-6 * dt));
    },
    place(one, x, y, z) {
      const at = faces.get(one);
      if (at) { at.x = x; at.y = y; at.z = z; at.frame = frame; } else faces.set(one, { x, y, z, frame });
    },
    face(one) {
      const at = faces.get(one);
      return at && frame - at.frame <= 2 ? at : null;
    },
    reset() {
      who = saidBy = other = null; seconds = elapsed = 0; reading = false; held = 0; track = null; text = saidText = ''; rawSeconds = 0; recorded = false; since = Infinity; faces.clear();
    },
  };
}

/** The picture's conversation: there is one picture at a time. */
export const talk = createConversation();

/** Where a body's head should turn to look at something, from its trunk: `turn` to its own left (+), `nod` down (+). */
export interface Look { turn: number; nod: number }

/** What a body may do with its hands while it speaks: whether each arm is free (left, right). */
export type Free = readonly [boolean, boolean];
const BOTH_FREE: Free = [true, true];

/**
 * One body's part in what is said: it speaks when the line is its own, and listens otherwise. Each frame `update` takes the
 * conversation, where its head would look to see the one speaking (or, speaking, the one spoken to), and its free hands;
 * `pose` then adds the head, the shoulders and a hand to a pose, and `mouth` and `lids` are its face's. `self` is who the
 * body is; `seed` makes each body's blinks, glances and gestures its own.
 */
export interface Talker {
  update(conversation: Conversation, look: Look | null, dt: number, calm: boolean, free?: Free): void;
  /** Adds what talking and listening do to a pose: drawn on top of what the scene or the play asks for. */
  pose(out: Pose): void;
  readonly mouth: Mouth;
  /** How far the lids are down, 0 open to 1 shut. */
  readonly lids: number;
  /** How much it is the one speaking now (its line, and a moment after), 0 to 1. */
  readonly speaking: number;
  /** For the ghost: how high it bobs with its klonks now, 0 to 1. */
  readonly klonk: number;
}

/** How long a blink takes: down, held shut, up again. */
const BLINK_DOWN = 0.07, BLINK_SHUT = 0.04, BLINK_UP = 0.1;
const BLINK = BLINK_DOWN + BLINK_SHUT + BLINK_UP;
/** A blink's lids at `x` seconds into it: 0 open, 1 shut. */
const blinkAt = (x: number) => (x < 0 || x > BLINK ? 0 : x < BLINK_DOWN ? smooth(x / BLINK_DOWN) : x < BLINK_DOWN + BLINK_SHUT ? 1
  : 1 - smooth((x - BLINK_DOWN - BLINK_SHUT) / BLINK_UP));

/** A critically damped follow: smooth, never past where it goes. */
interface Spring { at: number; speed: number }
function follow(s: Spring, to: number, rate: number, dt: number): number {
  const e = Math.exp(-rate * dt), k = (s.speed + rate * (s.at - to)) * dt;
  s.at = to + (s.at - to + k) * e;
  s.speed = (s.speed - rate * k) * e;
  return s.at;
}

export function createTalker(self: Speaker, seed: number): Talker {
  const next = random(seed);
  const mouth: Mouth = { open: 0, round: 0 }, said: Mouth = { open: 0, round: 0 };
  const opening: Spring = { at: 0, speed: 0 }, gaze: Spring = { at: 0, speed: 0 }, nodTo: Spring = { at: 0, speed: 0 };
  let clock = 0, lids = 0, nextBlink = 1 + next() * 3, blinkFrom = -9, twice = false;
  // How much the head looks where it is asked, and how much it is the one speaking: each comes and goes as a critically damped
  // spring, so that even the start of it has no jolt. Where it was asked to look last frame: a new place begins with a blink.
  const looks: Spring = { at: 0, speed: 0 }, speaks: Spring = { at: 0, speed: 0 };
  let looking = false;
  const lastLook: Look = { turn: 0, nod: 0 };
  let listening = 0, held = 0, calmNow = false, klonk = 0;
  // What speaking does to the head, the shoulders and a hand, and the nod a listener gives when a line has been said: each
  // followed softly, so that a new line, or a line cut short, never snaps them.
  const beat: Spring = { at: 0, speed: 0 }, gesture: Spring = { at: 0, speed: 0 }, ack: Spring = { at: 0, speed: 0 };
  let gestureSide: 0 | 1 = 1;
  // Each listener turns to the one speaking a moment after the words begin, each at their own moment; some nod after.
  const delay = 0.12 + next() * 0.35, nods = next() < 0.6, phase = next() * 6.3, hand: 0 | 1 = next() < 0.5 ? 0 : 1;
  const blink = () => { blinkFrom = clock; twice = next() < 0.16; nextBlink = clock + 2.2 + next() * 3.6; };
  return {
    get mouth() { return mouth; },
    get lids() { return lids; },
    get speaking() { return speaks.at; },
    get klonk() { return klonk; },
    update(c, at, dt, calm, free = BOTH_FREE) {
      calmNow = calm;
      if (dt <= 0) return;
      clock += dt;
      const own = c.who === self && c.track !== null;
      const track = c.track, seconds = c.seconds;
      held += ((c.reading ? 1 : 0) - held) * (1 - Math.exp(-6 * dt));
      // Speaking: the line's own mouth, a moment ahead (the lips go before the voice), followed softly. Smaller when calm.
      mouthAt(own ? track : null, seconds + 0.035, said);
      mouth.open = Math.max(0, follow(opening, said.open * (calm ? 0.55 : 1), 26, dt));
      if (mouth.open < 1e-4 && said.open === 0) mouth.open = opening.at = opening.speed = 0;
      mouth.round += (said.round - mouth.round) * (1 - Math.exp(-18 * dt));
      follow(speaks, own && seconds < (track?.length ?? 0) + 0.6 ? 1 : 0, 6, dt);
      // Listening: someone else speaks, and this body turns to them once their words have begun.
      const hearing = c.who !== null && c.who !== self && seconds > delay;
      listening += ((hearing ? 1 : 0) - listening) * (1 - Math.exp(-4 * dt));
      // The ghost has no mouth: it bobs once for each "klonk".
      klonk = 0;
      if (own && self === 'spoket' && track) {
        for (let i = 0; i < track.klonks; i++) klonk = Math.max(klonk, Math.sin(Math.PI * Math.min(1, Math.max(0, (seconds - 0.08 - i * KLONK_GAP) / KLONK_TIME))));
        if (calm) klonk *= 0.35;
      }
      // Where the head looks: at the one speaking, or, speaking, at the one spoken to. Far round behind it, it does not.
      const wanted = at && Math.abs(at.turn) < 1.9 ? at : null;
      const lookWanted = wanted ? (own ? 0.55 : listening * (0.42 + 0.43 * held)) : 0;
      follow(looks, lookWanted * (calm ? 0.7 : 1), calm ? 3 : 5, dt);
      if (wanted) {
        const turn = Math.max(-0.95, Math.min(0.95, wanted.turn)), nod = Math.max(-0.5, Math.min(0.5, wanted.nod));
        // A look that goes somewhere new begins with a blink, as people's do.
        const far = looking ? Math.abs(turn - lastLook.turn) > 0.32 : lookWanted > 0.2 && Math.abs(turn) > 0.25;
        if (far && clock - blinkFrom > 0.6) blink();
        if (!looking) { gaze.at = turn; nodTo.at = nod; gaze.speed = nodTo.speed = 0; }
        looking = true;
        lastLook.turn = turn; lastLook.nod = nod;
        follow(gaze, turn, calm ? 4 : 7, dt);
        follow(nodTo, nod, calm ? 4 : 7, dt);
      } else if (Math.abs(looks.at) < 1e-3 && Math.abs(looks.speed) < 1e-3) looking = false;
      // The head goes with the stressed syllables of its own line.
      let beats = 0;
      if (own && track) {
        for (let i = 0; i < track.beats.length; i++) {
          const x = seconds - track.beats[i]!;
          if (x < -0.05) break;
          if (x < 1) beats += bump(x, 0.16);
        }
        beats = Math.min(1.4, beats) * (1 - smooth((seconds - track.length) / 0.6));
      }
      follow(beat, beats, 30, dt);
      // A gesture with a free hand, once in a longer line: the forearm comes up a little, opens, and goes back.
      const long = own && track ? track.length : 0;
      const can = free[hand] ? hand : free[1 - hand] ? 1 - hand : -1;
      if (own && can >= 0 && gesture.at < 0.02) gestureSide = can as 0 | 1;
      const lifted = own && can === gestureSide && long > 1.5 && !calm ? pulse(seconds, 0.2 + 0.18 * long, 0.42, Math.min(1.1, long * 0.3), 0.6) : 0;
      follow(gesture, lifted, 9, dt);
      // When a line has been said, a listener who nods gives a small one.
      follow(ack, !own && nods && track && c.who !== null && !calm ? bump(seconds - track.length - 0.25, 0.22) : 0, 14, dt);
      // Blinks every few seconds, now and then twice; with less motion the eyes stay open, as everything stands still.
      if (clock >= nextBlink) blink();
      const b = clock - blinkFrom;
      lids = calm ? 0 : Math.max(blinkAt(b), twice ? blinkAt(b - BLINK - 0.08) : 0);
    },
    pose(out) {
      const w = Math.max(0, Math.min(1, looks.at));
      if (w > 1e-4 && looking) {
        // The head turns to look, and the shoulders turn a little with it.
        out.turn += (gaze.at - out.turn) * w;
        out.nod += (nodTo.at - out.nod) * w * 0.8;
        out.twist += Math.max(-0.5, Math.min(0.5, gaze.at)) * 0.14 * w;
      }
      const s = Math.max(0, Math.min(1, speaks.at));
      if (s > 1e-4) {
        // The head nods with the stressed syllables, tilts and turns a little as the words go, on the body's own clock; the
        // shoulders go with them.
        const t = clock, k = s * (calmNow ? 0.4 : 1);
        out.nod += k * (0.04 * beat.at + 0.012 * Math.sin(t * 2.3 + phase));
        out.tilt += k * 0.035 * Math.sin(t * 1.9 + phase);
        out.turn += k * 0.05 * Math.sin(t * 1.3 + phase * 0.7);
        out.twist += k * 0.03 * Math.sin(t * 1.6 + phase + 1);
        out.bendSide += k * 0.018 * Math.sin(t * 1.15 + phase + 2);
        out.lean += k * 0.012 * beat.at;
      }
      if (gesture.at > 1e-4) {
        // The hand comes up from the elbow and out a little, the palm opening: a "you see".
        const g = gesture.at;
        if (gestureSide === 1) { out.elbowR += 0.5 * g; out.armR += 0.2 * g; out.wristR -= 0.22 * g; out.outR += 0.12 * g; }
        else { out.elbowL += 0.5 * g; out.armL += 0.2 * g; out.wristL -= 0.22 * g; out.outL += 0.12 * g; }
      }
      if (Math.abs(ack.at) > 1e-4) out.nod += 0.05 * ack.at * Math.max(held, 0.4);
      // While the story waits on a line, everyone breathes where they stand or sit, a scene's still drawing too: the chest
      // lifts, and the head with it.
      if (held > 1e-3 && !calmNow) {
        const breath = Math.sin(clock * 1.7 + phase) + 0.3 * Math.sin(clock * 0.43 + 2 * phase);
        out.lean -= 0.009 * held * breath;
        out.nod += 0.007 * held * breath;
      }
    },
  };
}
