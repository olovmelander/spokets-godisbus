import { describe, expect, it } from 'vitest';
import { Group, Vector3 } from 'three';
import { Game } from '../../src/app/game';
import '../../src/content/aventyr2/aventyr2';
import { stormoga } from '../../src/content/aventyr2/chapters/stormoga';
import { A2 } from '../../src/content/aventyr2/sv';
import {
  GIFT_OFFERS, GIFT_OUT, GIFT_SCENE, GIFT_SPOT, GIFT_TAKEN, HELD_OUT, HOLDS, OLD_STANDS, OFFER_STEP, OFFER_TURN, TAKEN_AT, TAKES_FROM,
  giftTaken, offering, offerPose, takeReach,
} from '../../src/render/gift-handover';
import { spotProp } from '../../src/render/props';

const scene = (id: string) => stormoga.scenes!.find((one) => one.id === id)!;

/**
 * Stormens öga's opening on the jetty (Olov, 14 November 2026: "Mormor nämner att hon ser Elof innan han har tänt
 * lamporna för familjen … familjen ska undra vem det är som gör det"). Mormor said "Där ligger dom. Tänd dom, lille vän."
 * before a lamp was lit: she saw him and spoke to him, while the family was to wonder who lit them.
 */
describe('Stormens öga: nobody sees him on the jetty until the lamps are lit', () => {
  it('has nobody speak to him, or of him as there, before the lamps: he says himself what he will do', () => {
    const jetty = scene('bryggan');
    expect(jetty.lines!.map((line) => [line.who, line.line])).toEqual([
      ['pappa', 'soDark'], ['mamma', 'soCalling'], ['elof', 'soTooSmall'], ['elof', 'soLightThem'],
    ]);
    expect(A2.lines.soMormorSecret).toBeUndefined();
    expect(A2.lines.soLightThem).toMatch(/tänder/);
    // Mormor and morfar say nothing until he has grown and the family see him (`stor`), and nobody turns to them
    // on the jetty as if one of them had spoken: they stand at its head, past x 0.
    const before = stormoga.scenes!.slice(0, stormoga.scenes!.indexOf(scene('stor')));
    for (const one of before) for (const line of one.lines ?? []) expect(['mormor', 'morfar'], `${one.id}: ${line.line}`).not.toContain(line.who);
    for (const beat of stormoga.beats ?? []) expect(['mormor', 'morfar'], beat.id).not.toContain(beat.who);
    for (const [who, keys] of Object.entries(jetty.stage!.actors!)) for (const key of keys!) if (key.aim) expect(key.aim.x, who).toBeGreaterThan(0);
    // He points at the first lamp as he says it, and it is lit only after.
    const said = jetty.lines!.at(-1)!.at;
    const point = jetty.stage!.elof!.find((key) => key.act === 'point')!;
    expect(point.at).toBeLessThan(said);
    expect(point.at).toBeGreaterThan(jetty.lines!.at(-2)!.at);
    expect(stormoga.spots!.find((spot) => spot.id === 'so:mamma')!.needs).toBe('scene:bryggan');
  });

  it('has the family wonder who lit them, one by one, and know at the last that it was he', () => {
    const lamps = ['mamma', 'pappa', 'moa', 'bertil'].map((who) => scene(`lampa:${who}`));
    expect(lamps.map((one) => one.lines![0]!.line)).toEqual(['soLampMamma', 'soLampPappa', 'soLampMoa', 'soLampBertil']);
    expect(A2.lines.soLampMamma).toMatch(/vem tände/);
    expect(A2.lines.soLampPappa).toMatch(/\?/);
    expect(A2.lines.soLampBertil).toMatch(/Elof/);
    // And it is played so, in that order, the robot lighting them as fast as it may.
    const game = new Game({ ...stormoga, spawn: { x: 3.2, y: 0.01 } }, {});
    for (let frame = 0; frame < 60 * 60 && !game.sim.flags.has('scene:lampa:bertil'); frame++) {
      game.frame(1 / 60, { x: 1, hopHeld: false }, { hop: false, act: frame % 10 === 0, helper: false });
    }
    const order = ['bryggan:0', 'bryggan:1', 'bryggan:2', 'bryggan:3', 'lampa:mamma:0', 'lampa:pappa:0', 'lampa:moa:0', 'lampa:bertil:0'];
    expect(game.sim.said.filter((id) => order.includes(id))).toEqual(order);
  });
});

/**
 * The golden geléhallon (Olov, 14 November 2026: "Kan vi förtydliga vem som ger Elof geléhallonet i guldpapper? Är det
 * Klonk?"). It is the old trägubbe's: the last of the fistful his trail was laid with, saved for Elof (docs/aventyr-2.md).
 * It came out in the air in a glitter, with Klonk beside it; now the old one steps out and holds it out in his hands,
 * Elof takes it from them, and thanks him by name.
 */
describe('Stormens öga: the old one gives Elof the golden sweet, from his hands into Elof\'s', () => {
  it('has the old one step out and hold it out once the cap is back, and Klonk only look on', () => {
    const meeting = scene('motet');
    const at = (flag: string) => meeting.cues!.find((cue) => cue.flag === flag)!.at;
    expect(at('so:cap-returned')).toBeLessThan(at(GIFT_OFFERS));
    expect(at(GIFT_OFFERS) + 0.7).toBeLessThanOrEqual(at(GIFT_OUT));
    expect(at(GIFT_OUT)).toBeLessThan(meeting.seconds);
    const gift = stormoga.spots!.find((spot) => spot.id === GIFT_SPOT)!;
    expect(gift.after).toBe(GIFT_OUT);
    expect(gift.needs).toBe('scene:motet');
    // Klonk does nothing from when the old one steps out: a glad hop there read as Klonk giving it.
    expect(meeting.stage!.actors!.ghost!.filter((key) => key.at >= at(GIFT_OFFERS) - 1)).toEqual([]);
    // The picture is close on the old one holding it out, with Elof in it too.
    const close = meeting.stage!.shots!.find((shot) => shot.at > at('so:cap-returned'))!;
    const sweetX = gift.at.x + HELD_OUT.x;
    expect(Math.abs(close.x - sweetX)).toBeLessThan(close.width! / 2 - 0.3);
    const elof = meeting.stage!.elof!.at(-1)!;
    expect(elof.aim!.x).toBeCloseTo(sweetX, 5);
  });

  it('holds the sweet in the old one\'s hands, as he stands when he has stepped out, and lets it go when Elof has it', () => {
    // His hands, from where he stands beside the little one, stepped out and turned to Elof.
    const pose = offerPose(1, 0, -0.9);
    expect(pose.turn).toBeCloseTo(OFFER_TURN, 5);
    const hands = new Vector3(0, HOLDS.up, HOLDS.ahead).applyAxisAngle(new Vector3(0, 1, 0), pose.turn)
      .add(new Vector3(OLD_STANDS.x + pose.x, 0, OLD_STANDS.z + pose.z));
    expect(hands.distanceTo(new Vector3(HELD_OUT.x, HELD_OUT.y, HELD_OUT.z))).toBeLessThan(0.02);
    // Turned towards Elof, who comes from the left: facing away from the course, a little towards us.
    expect(Math.sin(OFFER_TURN)).toBeLessThan(-0.8);
    expect(OFFER_STEP.x).toBeLessThan(0);
    // The sweet on its paper is drawn there, still, not spinning in the air.
    const gift = stormoga.spots!.find((spot) => spot.id === GIFT_SPOT)!;
    const prop = spotProp(gift)!;
    const sweet = prop.group.getObjectByName('offered-sweet')!;
    const paper = prop.group.getObjectByName('gold-paper')!;
    const seen = (clock: number) => { prop.update(false, clock, 1 / 60); return sweet.position.clone(); };
    for (const clock of [0.2, 1.1, 2.7]) {
      const at = seen(clock);
      expect(Math.hypot(at.x - HELD_OUT.x, at.z - HELD_OUT.z), `at ${clock}`).toBeLessThan(1e-6);
      expect(Math.abs(at.y - HELD_OUT.y), `at ${clock}`).toBeLessThan(0.05);
      expect(sweet.rotation.y).toBe(0);
    }
    expect(paper.position.distanceTo(sweet.position)).toBeLessThan(0.05);
    // Taken, it goes from his hands.
    for (let frame = 0; frame < 30; frame++) prop.update(true, 3 + frame / 60, 1 / 60);
    expect(prop.group.visible && prop.group.scale.x > 0).toBe(false);
    // He steps out once it is offered, stays out until Elof's hand has it, and steps back.
    let out = 0;
    const flags = new Set<string>();
    const run = (seconds: number) => { for (let t = 0; t < seconds; t += 1 / 60) out = offering(out, flags, 1 / 60, false); };
    run(1);
    expect(out).toBe(0);
    flags.add(GIFT_OFFERS);
    run(1);
    expect(out).toBe(1);
    flags.add(GIFT_OUT).add(GIFT_SPOT);
    run(2);
    expect(out).toBe(1);
    expect(giftTaken(flags)).toBe(false);
    flags.add(GIFT_TAKEN);
    expect(giftTaken(flags)).toBe(true);
    run(1);
    expect(out).toBe(0);
    // A game saved after the old flags of the gift has it taken.
    expect(giftTaken(new Set([GIFT_SPOT, 'so:gift-held']))).toBe(true);
    expect(giftTaken(new Set([GIFT_SPOT, 'taste']))).toBe(true);
  });

  it('has Elof step up, take it with his hand, and thank the old one by name, before anything is said of it', () => {
    const taking = scene(GIFT_SCENE);
    expect(taking.on).toBe(GIFT_SPOT);
    expect(taking.hold).toBe(true);
    // He steps up to within his arm's reach of it, his hand goes out and is on it when it becomes his, and comes back.
    const to = taking.stage!.elof![0]!.to!;
    const gift = stormoga.spots!.find((spot) => spot.id === GIFT_SPOT)!;
    expect(to.x).toBeCloseTo(gift.at.x + TAKES_FROM.x, 5);
    expect(Math.hypot(HELD_OUT.x - TAKES_FROM.x, HELD_OUT.z - TAKES_FROM.z)).toBeLessThan(0.3);
    expect(taking.cues!.find((cue) => cue.flag === GIFT_TAKEN)!.at).toBe(TAKEN_AT);
    expect(takeReach(0)).toBe(0);
    expect(takeReach(TAKEN_AT - 0.05)).toBe(1);
    expect(takeReach(TAKEN_AT + 0.7)).toBe(0);
    // The words wait until it is in his hand.
    const held = taking.cues!.find((cue) => cue.flag === 'so:gift-held')!.at;
    expect(held).toBeGreaterThan(TAKEN_AT + 0.5);
    expect(stormoga.beats!.find((beat) => beat.id === 'soGold')!.needs).toBe('so:gift-held');
    // His thanks name the old one; nothing of it names Klonk.
    expect(taking.dialogue).toEqual(['soGold', 'soLast', 'soShare', 'soMagic']);
    const lines = taking.dialogue!.map((id) => A2.lines[stormoga.beats!.find((beat) => beat.id === id)!.line]!);
    expect(lines[1]).toMatch(/^Tack, gamla trägubben!/);
    for (const line of lines) {
      expect(line).not.toMatch(/Klonk/);
      expect(line.length).toBeLessThanOrEqual(42);
    }
    expect(A2.purposes.soGift!.purpose).toMatch(/gamla trägubben/);
  });

  it('is drawn: the old one\'s own figure turns and bows to Elof as he holds it out', () => {
    // The pack's old one on the stone (src/content/aventyr2/render.ts, `tragubbe` with the word `lifted`) is posed by
    // offerPose: stepped out, turned and bowed, and none of his rocking left.
    const pose = offerPose(1, 0.3, -0.9);
    expect(pose.bow).toBeGreaterThan(0.1);
    expect(pose.rock).toBe(0);
    expect(pose.x).toBeCloseTo(OFFER_STEP.x, 5);
    expect(pose.z).toBeCloseTo(OFFER_STEP.z, 5);
    const rest = offerPose(0, 0.3, -0.9);
    expect([rest.x, rest.z, rest.bow, rest.rock, rest.turn].map((n) => n + 0)).toEqual([0, 0, 0, 1, -0.9]);
    const old = stormoga.decor!.find((thing) => thing.look === 'tragubbe' && thing.word === 'lifted')!;
    const prop = spotProp({ id: 'decor:0', at: old.at, verb: 'take', look: old.look, word: old.word })!;
    expect(prop.group.children[0]).toBeInstanceOf(Group);
    // His place, beside the little one, is the gift's spot and his stand from it.
    expect(old.at.x).toBeCloseTo(stormoga.spots!.find((spot) => spot.id === GIFT_SPOT)!.at.x + OLD_STANDS.x, 5);
  });
});
