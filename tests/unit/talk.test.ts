import { describe, expect, it } from 'vitest';
import { STANDING, type Pose } from '../../src/render/rig';
import { createConversation, createTalker, klonksIn, mouthAt, mouthTrack, type Mouth } from '../../src/render/talk';
import type { Speaker } from '../../src/sim/types';

const DT = 1 / 60;
const vowels = (text: string) => (text.toLowerCase().match(/[aeiouyåäö]+/g) ?? []).length;
/** The mouth through a whole line, a frame at a time. */
function said(text: string, who: Speaker = 'mamma'): number[] {
  const track = mouthTrack(text, who), mouth: Mouth = { open: 0, round: 0 }, out: number[] = [];
  for (let t = 0; t < track.length + 1; t += DT) out.push(mouthAt(track, t, mouth).open);
  return out;
}

describe('a line said', () => {
  it.each([
    'Strömmen gick! Jag tänder ljusen.',
    'Var är ficklampan? Jag ser ingenting!',
    'Jag lägger en stock över vattnet.',
    'Gör det ont?',
    'Lillebror?! Du är ju pytteliten!',
  ])('takes about the time a child is told it in: %s', (text) => {
    const track = mouthTrack(text, 'mamma');
    const pace = vowels(text) / track.length;
    // About three syllables a second, as the game's recorded lines have them (2.3 to 4 a second with their silences).
    expect(pace).toBeGreaterThan(2.6);
    expect(pace).toBeLessThan(5);
  });

  it('opens for a, rounds for u, closes for m, and ends shut', () => {
    const track = mouthTrack('Mamma, du!', 'moa'), mouth: Mouth = { open: 0, round: 0 };
    let open = 0, round = 0, shut = Infinity;
    const end = track.keys[(track.count - 1) * 3]!;
    for (let t = 0.12; t < end; t += DT / 2) {
      mouthAt(track, t, mouth);
      open = Math.max(open, mouth.open);
      round = Math.max(round, mouth.round);
      // Between the first two vowels the lips meet for the m.
      if (t > 0.2 && t < 0.4) shut = Math.min(shut, mouth.open);
    }
    expect(open).toBeGreaterThan(0.7);
    expect(round).toBeGreaterThan(0.8);
    expect(shut).toBeLessThan(0.15);
    expect(mouthAt(track, end + 0.01, mouth).open).toBe(0);
    expect(mouthAt(track, 0, mouth).open).toBe(0);
  });

  it('is said the same way each time, and each one says it at their own pace', () => {
    const text = 'Var är ficklampan? Jag ser ingenting!';
    expect(Array.from(mouthTrack(text, 'pappa').keys)).toEqual(Array.from(mouthTrack(text, 'pappa').keys));
    expect(mouthTrack(text, 'morfar').length).toBeGreaterThan(mouthTrack(text, 'bertil').length * 1.1);
  });

  it('moves smoothly: no jump from one frame to the next, and never past wide open or shut', () => {
    for (const text of ['Strömmen gick! Jag tänder ljusen.', 'Bra! Ställ dig på den låga änden.', 'Klonk, klonk!']) {
      const open = said(text);
      expect(open.every((o) => o >= 0 && o <= 1)).toBe(true);
      const steps = open.slice(1).map((o, i) => Math.abs(o - open[i]!));
      expect(Math.max(...steps)).toBeLessThan(0.3);
    }
  });

  it('knows how many times the ghost says klonk', () => {
    expect(klonksIn('Klonk!')).toBe(1);
    expect(klonksIn('Klonk, klonk!')).toBe(2);
    expect(klonksIn('Klonk klonk klonk.')).toBe(3);
  });
});

/** A short play: lines said in turn, each up for `up` seconds; each frame the talkers' poses on standing are kept. */
function play(lines: { who: Speaker; text: string; reading: boolean }[], bodies: Speaker[], up = 3, calm = false) {
  const talk = createConversation(), talkers = bodies.map((who, i) => createTalker(who, 11 + i));
  const frames: { pose: Pose[]; mouth: number[]; lids: number[]; t: number }[] = [];
  let t = 0;
  const run = (seconds: number, line: (typeof lines)[number] | null) => {
    for (let s = 0; s < seconds; s += DT) {
      t += DT;
      talk.hear(line ? { who: line.who, text: line.text, seconds: s, reading: line.reading } : null, DT);
      const pose: Pose[] = [], mouth: number[] = [], lids: number[] = [];
      talkers.forEach((talker, i) => {
        const self = bodies[i]!, other = talk.lookAt(self);
        // Each looks along the row of them: the one to look at is to its left the further along it is.
        const look = other ? { turn: 0.3 * (bodies.indexOf(other) - i), nod: 0 } : null;
        talker.update(talk, look, DT, calm);
        const p = { ...STANDING };
        talker.pose(p);
        pose.push(p); mouth.push(talker.mouth.open); lids.push(talker.lids);
      });
      frames.push({ pose, mouth, lids, t });
    }
  };
  run(0.5, null);
  for (const line of lines) { run(up, line); run(0.4, null); }
  run(1.5, null);
  return frames;
}

describe('talking and listening', () => {
  const LINES = [
    { who: 'mamma' as const, text: 'Strömmen gick! Jag tänder ljusen.', reading: true },
    { who: 'pappa' as const, text: 'Var är ficklampan? Jag ser ingenting!', reading: true },
    { who: 'elof' as const, text: 'Det blåser!', reading: false },
  ];
  const BODIES: Speaker[] = ['mamma', 'pappa', 'elof', 'moa'];

  it("moves the speaker's mouth with the line, and nobody else's", () => {
    const frames = play(LINES, BODIES);
    const most = BODIES.map((_, i) => Math.max(...frames.map((f) => f.mouth[i]!)));
    expect(most[0]).toBeGreaterThan(0.5);
    expect(most[1]).toBeGreaterThan(0.5);
    expect(most[2]).toBeGreaterThan(0.4);
    expect(most[3]).toBe(0);
    // Shut again once the lines are said.
    expect(frames.at(-1)!.mouth.every((o) => o === 0)).toBe(true);
  });

  it('turns the listeners to whoever speaks, and back, with no jolt', () => {
    const frames = play(LINES, BODIES);
    // Moa, last in the row, turns to Mamma (to her right) while she speaks, and to Pappa while he does.
    const moa = frames.map((f) => f.pose[3]!.turn);
    expect(Math.min(...moa)).toBeLessThan(-0.3);
    expect(Math.abs(moa.at(-1)!)).toBeLessThan(0.02);
    for (let i = 0; i < BODIES.length; i++) {
      const turn = frames.map((f) => f.pose[i]!);
      for (const joint of ['turn', 'nod', 'tilt', 'twist', 'elbowL', 'elbowR'] as const) {
        const speed = turn.slice(1).map((p, k) => (p[joint] - turn[k]![joint]) / DT);
        const accel = speed.slice(1).map((v, k) => Math.abs(v - speed[k]!) / DT);
        // A real head turns at several radians a second; no frame's change of speed is a jolt.
        expect(Math.max(...speed.map(Math.abs))).toBeLessThan(4);
        expect(Math.max(...accel)).toBeLessThan(120);
      }
    }
  });

  it('blinks every few seconds, and not with less motion', () => {
    const lines = Array.from({ length: 6 }, () => ({ who: 'pappa' as const, text: 'Var är ficklampan? Jag ser ingenting!', reading: true }));
    const count = (frames: ReturnType<typeof play>) => {
      let n = 0;
      for (let k = 1; k < frames.length; k++) if (frames[k]!.lids[0]! >= 0.99 && frames[k - 1]!.lids[0]! < 0.99) n++;
      return { n, seconds: frames.at(-1)!.t };
    };
    const { n, seconds } = count(play(lines, ['mamma', 'pappa']));
    expect(n).toBeGreaterThanOrEqual(seconds / 6);
    expect(n).toBeLessThanOrEqual(seconds / 1.5);
    expect(count(play(lines, ['mamma', 'pappa'], 3, true)).n).toBe(0);
  });

  it('says it smaller with less motion', () => {
    const lively = play(LINES.slice(0, 1), BODIES), calm = play(LINES.slice(0, 1), BODIES, 3, true);
    const most = (frames: ReturnType<typeof play>) => Math.max(...frames.map((f) => f.mouth[0]!));
    expect(most(calm)).toBeLessThan(most(lively) * 0.7);
    expect(most(calm)).toBeGreaterThan(0.2);
  });

  it('has the one speaking look at Elof, and Elof at whoever spoke to him', () => {
    const talk = createConversation();
    talk.hear({ who: 'mamma', text: 'Hej!', seconds: 0, reading: true }, DT);
    expect(talk.lookAt('mamma')).toBe('elof');
    expect(talk.lookAt('moa')).toBe('mamma');
    expect(talk.lookAt('elof')).toBe('mamma');
    talk.hear({ who: 'elof', text: 'Hej!', seconds: 0, reading: true }, DT);
    expect(talk.lookAt('elof')).toBe('mamma');
    expect(talk.lookAt('pappa')).toBe('elof');
    talk.hear(null, DT);
    expect(talk.lookAt('pappa')).toBeNull();
    // Where each face is, only while it was drawn a moment ago.
    talk.place('mamma', 1, 2, 3);
    expect(talk.face('mamma')).toEqual(expect.objectContaining({ x: 1, y: 2, z: 3 }));
    for (let i = 0; i < 4; i++) talk.hear(null, DT);
    expect(talk.face('mamma')).toBeNull();
  });

  it('bobs the ghost once for each klonk, as it has no mouth', () => {
    const talk = createConversation(), ghost = createTalker('spoket', 5);
    let bobs = 0, up = false;
    for (let s = 0; s < 1.6; s += DT) {
      talk.hear({ who: 'spoket', text: 'Klonk, klonk!', seconds: s, reading: false }, DT);
      ghost.update(talk, null, DT, false);
      if (ghost.klonk > 0.9 && !up) { bobs++; up = true; }
      if (ghost.klonk < 0.1) up = false;
      expect(ghost.mouth.open).toBeLessThanOrEqual(1);
    }
    expect(bobs).toBe(2);
  });
});


describe('a mouth following a recorded line', () => {
  it('waits for loading, follows playback instead of bubble age, and does not speak again after the recording', () => {
    const conversation = createConversation();
    const line = { who: 'elof' as const, text: 'Mamma, jag är här!', seconds: 2, reading: true };
    conversation.hear({ ...line, voice: { seconds: 0, duration: 0 } }, DT);
    expect(conversation.seconds).toBe(0);
    const track = conversation.track!, end = track.keys[(track.count - 1) * 3]!;
    conversation.hear({ ...line, seconds: 4, voice: { seconds: 3, duration: 12 } }, DT);
    expect(conversation.seconds).toBeCloseTo(end / 4);
    // A buffer stall or Pause holds the mouth's place in the words even while the bubble has been present longer.
    conversation.hear({ ...line, seconds: 7, voice: { seconds: 3, duration: 12 } }, 0);
    expect(conversation.seconds).toBeCloseTo(end / 4);
    conversation.hear({ ...line, seconds: 8, voice: null }, DT);
    const mouth = mouthAt(conversation.track, conversation.seconds, { open: 1, round: 1 });
    expect(mouth.open).toBe(0);
    // The same words said again are a fresh line, even with the same text and speaker.
    conversation.hear({ ...line, seconds: .4, voice: null }, DT);
    expect(conversation.seconds).toBe(.4);
    conversation.reset();
    expect(conversation.dt).toBe(0);
  });
});
