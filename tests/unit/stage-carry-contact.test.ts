import { Bone, Group, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Game } from '../../src/app/game';
import { prolog } from '../../src/content/chapters/ends';
import { createStage } from '../../src/render/stage';
import { createHandHold } from '../../src/render/arm-contact';
import { stubCanvas } from './canvas-stub';

beforeEach(stubCanvas);
afterEach(() => vi.unstubAllGlobals());

describe.each([false, true])('Elof stepping off Pappa’s supported palm (offset socket %s)', offsetSocket => {
  it.each([false, true])('retains the elbow side through lowering/release and Pause (reduced motion %s)', calm => {
    const chapter = { ...prolog, spawn: { x: 40.5, y: -.8 } };
    const flags = ['scene:morgon', 'eye', 'paint', 'woke', 'grab', 'blink', 'mamma:noticed', 'mamma:passed', 'bag:torn', 'scene:vaknar', 'scene:stjarnan', 'star'];
    const game = new Game(chapter, {}, { flags });
    const ground = (x: number) => {
      for (let i = 0; i < chapter.ground.length - 1; i++) {
        const a = chapter.ground[i]!, b = chapter.ground[i + 1]!;
        if (a.x !== b.x && x >= a.x && x <= b.x) return a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x);
      }
      return 0;
    };
    const stage = createStage(chapter, ground);
    if (offsetSocket) {
      // An imported-style two-bone arm with its actual support socket beyond the wrist. A socket-free rehearsal
      // palm does not exercise the second reach needed after turning a full hand flat under Elof's boots.
      const model = new Group();
      for (const [side, sign] of [['l', 1], ['r', -1]] as const) {
        const upper = new Bone(), lower = new Bone(), hand = new Bone();
        upper.name = `upperarm_${side}`; lower.name = `lowerarm_${side}`; hand.name = `hand_${side}`;
        upper.position.set(sign * .2, 1.35, 0); upper.rotation.z = Math.PI;
        lower.position.y = .31; hand.position.y = .27;
        upper.add(lower); lower.add(hand); model.add(upper);
      }
      stage.replace('pappa', model);
      const imported = stage.actors.get('pappa')!.rig;
      const socket = new Vector3(.025, .09, .015), axis = new Vector3(1, 0, 0);
      const holders = (['l', 'r'] as const).map((side, i) => createHandHold(model.getObjectByName(`lowerarm_${side}`)!, model.getObjectByName(`hand_${side}`)!, target => imported.reach(i as 0 | 1, target)));
      imported.grasp = (side, _grip, target, direction, out, weight) => holders[side]!(socket, axis, target, direction, out, weight);
      imported.socket = (side, _grip, out) => model.getObjectByName(side === 0 ? 'hand_l' : 'hand_r')!.localToWorld(out.copy(socket));
    }
    const rig = stage.actors.get('pappa')!.rig;
    const elbows = [new Vector3(), new Vector3()], hands = [new Vector3(), new Vector3()];
    let previous: Vector3[] | null = null, checked = 0, clock = 0;
    for (let frame = 0; frame < 2400 && !game.sim.flags.has('scene:handen'); frame++) {
      game.frame(1 / 60, { x: 0, hopHeld: false }, { hop: false, act: game.sim.curr.word === 'climbOn' && !game.sim.flags.has('hand'), helper: false });
      const scene = game.sim.sceneFrame, at = { x: game.sim.curr.x, y: game.sim.curr.y };
      const direction = stage.update(scene, game.sim.flags, at, clock += 1 / 60, 1 / 60, calm);
      if (scene?.id !== 'handen' || scene.seconds < 9.2) continue;
      for (const side of [0, 1] as const) rig.arm!(side, new Vector3(), elbows[side]!, hands[side]!);
      const current = [...elbows, ...hands].map(v => v.clone());
      if (previous && scene.seconds > 9.65) for (let i = 0; i < current.length; i++) expect(current[i]!.distanceTo(previous[i]!), `joint ${i} at ${scene.seconds}`).toBeLessThan(.09);
      previous = current; checked++;
      // His feet keep following the actual supporting palm until he is eased off it.
      if (direction.elof!.ontoWeight > .999) {
        const palm = rig.socket ? rig.socket(1, { kind: 'flat' }, new Vector3()) : rig.grip(1, new Vector3(), new Vector3(-1, 0, 0), new Vector3(), 0);
        expect(direction.elof!.onto.x).toBeCloseTo(palm.x, 6);
        expect(direction.elof!.onto.y).toBeGreaterThan(palm.y);
      }
      if (scene.seconds > 9.65 && scene.seconds < 9.76) {
        stage.update(scene, game.sim.flags, at, clock, 0, calm);
        for (const side of [0, 1] as const) {
          rig.arm!(side, new Vector3(), elbows[side]!, hands[side]!);
          expect(elbows[side]!.distanceTo(current[side]!)).toBeLessThan(1e-8);
          expect(hands[side]!.distanceTo(current[side + 2]!)).toBeLessThan(1e-8);
        }
      }
    }
    expect(checked).toBeGreaterThan(50);
    expect(game.sim.flags.has('scene:handen')).toBe(true);
  });
});
