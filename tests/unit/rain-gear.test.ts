import {
  Bone, Box3, BoxGeometry, BufferGeometry, Float32BufferAttribute, Group, MeshStandardMaterial, Skeleton, SkinnedMesh, Uint16BufferAttribute, Vector3,
  type Object3D,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { describe, expect, it } from 'vitest';
import { stormkvall } from '../../src/content/aventyr2/chapters/stormkvall';
import { stormoga } from '../../src/content/aventyr2/chapters/stormoga';
import { stormskog } from '../../src/content/aventyr2/chapters/stormskog';
import { ELOF_COAT, PUT_ON, TAKE, TAKE_OFF } from '../../src/render/elof-coat';
import { holdsCoat } from '../../src/render/elof-coat-mesh';
import { CLIPS } from '../../src/render/motion-data';
import {
  bodyOf, buildShells, COAT_ORDER, DRESSING, dressingFrom, gearOnAt, LOOK, rainGearFor, wearShells, type GearRole,
} from '../../src/render/rain-gear';
import { createModelRig } from '../../src/render/rig';

/** Rain gear in Stormnatten, as the story has them put it on (src/render/rain-gear.ts, 6 November 2026). */
const storm = { rain: 0.8 } as never;
const chapter = (id: string, rain = true) => ({ id, storm: rain ? storm : undefined });

describe('the rain gear', () => {
  it('is not worn out of the storm, nor by anyone but the family', () => {
    expect(rainGearFor(chapter('granskog', false), 'mamma', new Set())).toBeNull();
    expect(rainGearFor(chapter('stormgard'), 'mormor', new Set())).toBeNull();
  });

  it('is put on in Stormkvällen when they get ready to go out together, and worn from then on', () => {
    expect(rainGearFor(chapter('stormkvall'), 'pappa', new Set())).toBeNull();
    expect(rainGearFor(chapter('stormkvall'), 'pappa', new Set(['scene:tillsammans']))).not.toBeNull();
    for (const id of ['stormgard', 'stormskog', 'stormbyn', 'flarken', 'alven', 'stormoga']) {
      for (const who of ['mamma', 'pappa', 'moa', 'bertil']) expect(rainGearFor(chapter(id), who, new Set())).not.toBeNull();
    }
  });

  it('each has a coat of their own colour', () => {
    const coats = ['mamma', 'pappa', 'moa', 'bertil'].map((who) => rainGearFor(chapter('stormskog'), who, new Set())!.coat);
    expect(new Set(coats).size).toBe(4);
  });

  it('Bertil takes off his right boot for Elof in Stormgården once he has been called, and only there', () => {
    expect(rainGearFor(chapter('stormgard'), 'bertil', new Set())!.bootOff).toBeNull();
    expect(rainGearFor(chapter('stormgard'), 'bertil', new Set(['sg:bertil']))!.bootOff).toBe(1);
    expect(rainGearFor(chapter('stormgard'), 'moa', new Set(['sg:bertil']))!.bootOff).toBeNull();
    expect(rainGearFor(chapter('stormskog'), 'bertil', new Set(['sg:bertil']))!.bootOff).toBeNull();
  });
});

describe('getting ready in Stormkvällen', () => {
  const FAMILY: GearRole[] = ['mamma', 'pappa', 'moa', 'bertil'];
  const at = (seconds: number) => ({ id: 'tillsammans', seconds });
  const scene = stormkvall.scenes!.find((one) => one.id === 'tillsammans')!;
  const on = (who: GearRole, seconds: number, calm = false) => {
    const gear = rainGearFor(stormkvall, who, new Set(), at(seconds), calm);
    return gear ? [gear.on?.coat ?? 1, gear.on?.boots[0] ?? 1, gear.on?.boots[1] ?? 1] : [0, 0, 0];
  };

  it('each puts their gear on in the scene, with the motion that puts it on: none before, all of it after', () => {
    for (const who of FAMILY) {
      const from = dressingFrom(stormkvall, 'tillsammans', who)!, clip = CLIPS[DRESSING[who]];
      // Their own act, in the scene, with the clip that keys how far each piece is on.
      expect(from, who).toBeGreaterThan(0);
      expect(from + clip.seconds, who).toBeLessThan(scene.seconds);
      expect(rainGearFor(stormkvall, who, new Set(), at(from - 0.01)), who).toBeNull();
      expect(on(who, from + clip.seconds + 0.01), who).toEqual([1, 1, 1]);
      expect(on(who, scene.seconds), who).toEqual([1, 1, 1]);
      // On a little at a time, never taken off again, and partly on for a good while: not in one frame.
      let last = [0, 0, 0], partly = 0;
      for (let t = from; t <= from + clip.seconds; t += 1 / 60) {
        const now = on(who, t);
        for (const k of [0, 1, 2]) expect(now[k]!, `${who} ${t}`).toBeGreaterThanOrEqual(last[k]! - 1e-9);
        if (now.some((share) => share > 0.02 && share < 0.98)) partly += 1 / 60;
        last = now;
      }
      expect(partly, who).toBeGreaterThan(1.5);
      // Once the scene is told they wear it, whatever else plays.
      expect(rainGearFor(stormkvall, who, new Set(['scene:tillsammans']), null)?.on, who).toBeUndefined();
    }
  });

  it('is the same at any moment however it is come to: played, sought back or paused', () => {
    const times = Array.from({ length: 120 }, (_, i) => i * scene.seconds / 119);
    for (const who of FAMILY) {
      const played = times.map((t) => on(who, t));
      const sought = [...times].reverse().map((t) => on(who, t)).reverse();
      expect(sought, who).toEqual(played);
      expect(on(who, 5.5), who).toEqual(on(who, 5.5));
    }
  });

  it('goes on in each one\'s own order: the coat first, but Bertil\'s boots', () => {
    const half = (who: GearRole, k: 0 | 1 | 2) => {
      const from = dressingFrom(stormkvall, 'tillsammans', who)!;
      let t = from;
      while (on(who, t)[k]! < 0.5) t += 0.01;
      return t;
    };
    for (const who of ['mamma', 'pappa', 'moa'] as const) expect(half(who, 0), who).toBeLessThan(half(who, 1));
    expect(half('bertil', 1)).toBeLessThan(half('bertil', 0));
    // A boot on each foot, one after the other.
    for (const who of FAMILY) expect(Math.abs(half(who, 1) - half(who, 2)), who).toBeGreaterThan(0.3);
  });

  it('in reduced motion is all on at once as they begin', () => {
    for (const who of FAMILY) {
      const from = dressingFrom(stormkvall, 'tillsammans', who)!;
      expect(rainGearFor(stormkvall, who, new Set(), at(from - 0.01), true), who).toBeNull();
      expect(on(who, from, true), who).toEqual([1, 1, 1]);
      expect(gearOnAt(who, 0, true), who).toEqual({ coat: 1, boots: [1, 1] });
    }
  });
});

/**
 * A small figure in the models' own bones, its parts boxes each on its bone, standing at rest: the hips 1 up, the arms
 * hanging at its sides, its own left along +x and its toes ahead along +z.
 */
function figure(): SkinnedMesh {
  const joints: [string, string | null, [number, number, number]][] = [
    ['pelvis', null, [0, 1, 0]], ['spine_01', 'pelvis', [0, 0.15, 0]], ['spine_02', 'spine_01', [0, 0.2, 0]],
    ['upperarm_l', 'spine_02', [0.22, 0.15, 0]], ['lowerarm_l', 'upperarm_l', [0, -0.3, 0]], ['hand_l', 'lowerarm_l', [0, -0.28, 0]],
    ['upperarm_r', 'spine_02', [-0.22, 0.15, 0]], ['lowerarm_r', 'upperarm_r', [0, -0.3, 0]], ['hand_r', 'lowerarm_r', [0, -0.28, 0]],
    ['thigh_l', 'pelvis', [0.1, 0, 0]], ['calf_l', 'thigh_l', [0, -0.45, 0]], ['foot_l', 'calf_l', [0, -0.45, 0]],
    ['thigh_r', 'pelvis', [-0.1, 0, 0]], ['calf_r', 'thigh_r', [0, -0.45, 0]], ['foot_r', 'calf_r', [0, -0.45, 0]],
  ];
  const bones = new Map<string, Bone>();
  for (const [name, parent, place] of joints) {
    const bone = new Bone();
    bone.name = name;
    bone.position.set(...place);
    bones.get(parent ?? '')?.add(bone);
    bones.set(name, bone);
  }
  const root = bones.get('pelvis')!;
  root.updateMatrixWorld(true);
  // Each part: its bone, its size and its middle from the bone's joint.
  const parts: [string, [number, number, number], [number, number, number]][] = [
    ['pelvis', [0.34, 0.15, 0.2], [0, 0.07, 0]], ['spine_01', [0.34, 0.2, 0.2], [0, 0.1, 0]], ['spine_02', [0.36, 0.2, 0.22], [0, 0.1, 0]],
    ['upperarm_l', [0.08, 0.3, 0.08], [0.02, -0.15, 0]], ['lowerarm_l', [0.07, 0.28, 0.07], [0, -0.14, 0]], ['hand_l', [0.06, 0.1, 0.06], [0, -0.05, 0]],
    ['upperarm_r', [0.08, 0.3, 0.08], [-0.02, -0.15, 0]], ['lowerarm_r', [0.07, 0.28, 0.07], [0, -0.14, 0]], ['hand_r', [0.06, 0.1, 0.06], [0, -0.05, 0]],
    ['thigh_l', [0.14, 0.45, 0.15], [0, -0.22, 0]], ['calf_l', [0.11, 0.45, 0.12], [0, -0.22, 0]], ['foot_l', [0.1, 0.06, 0.24], [0, -0.03, 0.06]],
    ['thigh_r', [0.14, 0.45, 0.15], [0, -0.22, 0]], ['calf_r', [0.11, 0.45, 0.12], [0, -0.22, 0]], ['foot_r', [0.1, 0.06, 0.24], [0, -0.03, 0.06]],
  ];
  const names = [...bones.keys()], positions: number[] = [], normals: number[] = [], index: number[] = [], weight: number[] = [];
  const joint = new Vector3();
  for (const [bone, size, middle] of parts) {
    const box = new BoxGeometry(...size, 4, 4, 2).toNonIndexed();
    bones.get(bone)!.getWorldPosition(joint);
    box.translate(joint.x + middle[0], joint.y + middle[1], joint.z + middle[2]);
    positions.push(...box.getAttribute('position').array);
    normals.push(...box.getAttribute('normal').array);
    for (let i = 0; i < box.getAttribute('position').count; i++) { index.push(names.indexOf(bone), 0, 0, 0); weight.push(1, 0, 0, 0); }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setAttribute('skinIndex', new Uint16BufferAttribute(index, 4));
  geometry.setAttribute('skinWeight', new Float32BufferAttribute(weight, 4));
  const body = new SkinnedMesh(geometry, new MeshStandardMaterial());
  body.add(root);
  body.updateMatrixWorld(true);
  body.bind(new Skeleton([...bones.values()]));
  new Group().add(body);
  return body;
}

describe('the gear going on, on a body', () => {
  /** Each corner of a piece: where it is at rest, its bone, and its order. */
  const corners = (mesh: SkinnedMesh) => {
    const p = mesh.geometry.getAttribute('position'), bone = mesh.geometry.getAttribute('skinIndex'), order = mesh.geometry.getAttribute('gearOrder');
    return Array.from({ length: p.count }, (_, i) => ({
      x: p.getX(i), y: p.getY(i), z: p.getZ(i), bone: mesh.skeleton.bones[bone.getX(i)]!.name, order: order.getX(i),
    }));
  };
  const range = (list: { order: number }[]) => [Math.min(...list.map((c) => c.order)), Math.max(...list.map((c) => c.order))];
  const gear = { coat: '#b8423a', boots: '#2c3a2c', bootOff: null };

  it('orders the coat: the first sleeve from the cuff up, its front, the back, the other sleeve and front, the zip last', () => {
    const shells = buildShells(figure(), 5.2)!;
    const coat = corners(shells.coat);
    const sleeve = (side: 'l' | 'r') => coat.filter((c) => /arm_/.test(c.bone) && c.bone.endsWith(side));
    const [firstLow, firstHigh] = range(sleeve('l')), [otherLow, otherHigh] = range(sleeve('r'));
    expect(firstLow).toBeCloseTo(COAT_ORDER.sleeve[0], 1);
    expect(firstHigh).toBeLessThanOrEqual(COAT_ORDER.sleeve[1] + 1e-6);
    expect(otherLow).toBeGreaterThanOrEqual(COAT_ORDER.otherSleeve[0] - 1e-6);
    expect(otherHigh).toBeLessThanOrEqual(COAT_ORDER.otherSleeve[1] + 1e-6);
    // Up the sleeve from the cuff: the lower a corner of the arm, the sooner it is covered.
    const forearm = coat.filter((c) => c.bone === 'lowerarm_l'), upper = coat.filter((c) => c.bone === 'upperarm_l');
    expect(range(forearm)[1]).toBeLessThanOrEqual(range(upper)[0] + 1e-6);
    // The back is behind (−z), the front ahead; the middle of the front is zipped last, from the hem up.
    const trunk = coat.filter((c) => !/arm_/.test(c.bone));
    const back = trunk.filter((c) => c.z < -0.09 && c.bone === 'spine_02'), zip = trunk.filter((c) => c.z > 0.09 && Math.abs(c.x) < 0.02);
    expect(range(back)[0]).toBeGreaterThanOrEqual(COAT_ORDER.back[0] - 1e-6);
    expect(range(back)[1]).toBeLessThanOrEqual(COAT_ORDER.back[1] + 1e-6);
    expect(range(zip)[0]).toBeGreaterThanOrEqual(COAT_ORDER.zip[0] - 1e-6);
    const hem = zip.reduce((a, b) => (b.y < a.y ? b : a)), collar = zip.reduce((a, b) => (b.y > a.y ? b : a));
    expect(hem.order).toBeLessThan(collar.order);
    // The front on the first arm's side falls open before the other's.
    const front = (side: number) => trunk.filter((c) => c.z > 0.09 && c.x * side > 0.15);
    expect(range(front(1))[1]).toBeLessThan(range(front(-1))[0]);
  });

  it('turns the order about for someone who puts the right arm in first', () => {
    const shells = buildShells(figure(), 5.2)!;
    wearShells(shells, { ...gear, first: 1 });
    const coat = corners(shells.coat);
    const sleeve = (side: 'l' | 'r') => range(coat.filter((c) => /arm_/.test(c.bone) && c.bone.endsWith(side)));
    expect(sleeve('r')[1]).toBeLessThan(sleeve('l')[0]);
    wearShells(shells, { ...gear, first: 0 });
    expect(range(corners(shells.coat).filter((c) => c.bone === 'lowerarm_l'))[1]).toBeLessThan(COAT_ORDER.sleeve[1] + 1e-6);
  });

  it('puts a boot on from the sole up', () => {
    const shells = buildShells(figure(), 5.2)!;
    for (const boot of shells.boots) {
      const all = corners(boot), sole = all.reduce((a, b) => (b.y < a.y ? b : a)), top = all.reduce((a, b) => (b.y > a.y ? b : a));
      expect(sole.order).toBeCloseTo(0, 5);
      expect(top.order).toBeCloseTo(1, 5);
      expect(range(all.filter((c) => c.bone.startsWith('foot')))[1]).toBeLessThan(range(all.filter((c) => c.bone.startsWith('calf')))[1]);
    }
  });

  it('draws each piece as far as it is on, and hides none of it once it is all on', () => {
    const shells = buildShells(figure(), 5.2)!;
    wearShells(shells, null);
    expect([shells.coat.visible, ...shells.boots.map((boot) => boot.visible)]).toEqual([false, false, false]);
    wearShells(shells, { ...gear, on: { coat: 0.3, boots: [1, 0] } });
    expect(shells.coat.visible).toBe(true);
    expect(shells.on.coat.value).toBeCloseTo(0.3, 9);
    expect(shells.boots[0].visible).toBe(true);
    expect(shells.on.boots[0].value).toBeGreaterThan(1);
    expect(shells.boots[1].visible).toBe(false);
    wearShells(shells, gear);
    expect([shells.coat.visible, ...shells.boots.map((boot) => boot.visible)]).toEqual([true, true, true]);
    // All on: no corner is left out.
    for (const piece of [shells.coat, ...shells.boots]) {
      const order = piece.geometry.getAttribute('gearOrder');
      for (let i = 0; i < order.count; i++) expect(order.getX(i)).toBeLessThanOrEqual(1);
    }
    expect(shells.on.coat.value).toBeGreaterThan(1);
    expect(shells.on.boots.map((one) => one.value > 1)).toEqual([true, true]);
  });
});

/** Elof in the doll's raincoat (src/render/elof-coat.ts; Olov, 9 November 2026). */
describe('Elof\'s raincoat', () => {
  const STORM = ['stormgard', 'stormskog', 'stormbyn', 'olympia', 'flarken', 'alven', 'billsta', 'stormoga'];
  const scene = (id: string, seconds: number) => ({ id, seconds });

  it('is the doll\'s small lemon-yellow coat, with his own shoes and no boots', () => {
    const gear = rainGearFor(chapter('stormskog'), 'elof', new Set())!;
    expect(gear.coat).toBe(ELOF_COAT);
    expect(gear.coat).not.toBe(LOOK.moa.coat);
    expect(gear.boots).toBeNull();
    expect(gear.on).toBeUndefined();
    // His left arm goes into its sleeve first: the coat's order is worked out for it, as the family's is for theirs.
    expect(gear.first).toBe(0);
  });

  it('is not his in Stormkvällen until he has taken it from the doll, after the family have put on theirs', () => {
    const ready = ['scene:krymper', 'scene:tillsammans'];
    expect(rainGearFor(chapter('stormkvall'), 'elof', new Set())).toBeNull();
    expect(rainGearFor(chapter('stormkvall'), 'elof', new Set(ready))).toBeNull();
    expect(rainGearFor(chapter('stormkvall'), 'elof', new Set(ready), scene('tillsammans', 8))).toBeNull();
    expect(rainGearFor(chapter('stormkvall'), 'elof', new Set([...ready, TAKE, `scene:${PUT_ON.scene}`]))!.on).toBeUndefined();
  });

  it('goes on in the family\'s order as he puts it on: in his hands first, his left sleeve, round his back, the right, the zip', () => {
    const at = (seconds: number, calm = false) => rainGearFor(chapter('stormkvall'), 'elof', new Set([TAKE]), scene(PUT_ON.scene, seconds), calm)!;
    expect(at(0.2).on).toEqual({ coat: 0, boots: [0, 0] });
    expect(at(PUT_ON.on).on!.coat).toBe(0);
    expect(at(1.45).on!.coat).toBeCloseTo(COAT_ORDER.sleeve[1]);
    expect(at(2.15).on!.coat).toBeCloseTo(COAT_ORDER.back[1]);
    expect(at(2.6).on!.coat).toBeCloseTo(COAT_ORDER.otherSleeve[1]);
    let last = 0;
    for (let t = 0; t < 3.5; t += 0.05) {
      const now = at(t).on?.coat ?? 1;
      expect(now).toBeGreaterThanOrEqual(last);
      last = now;
    }
    expect(at(3.6).on).toBeUndefined();
    // In reduced motion it is on at once.
    expect(at(0.1, true).on).toBeUndefined();
  });

  it('is worn through every chapter of the storm, and comes off in the storm\'s eye before he grows', () => {
    for (const id of STORM) expect(rainGearFor(chapter(id), 'elof', new Set()), id).not.toBeNull();
    expect(rainGearFor(chapter('stormoga'), 'elof', new Set(['eye']), scene('oga', 3))).not.toBeNull();
    const off = (seconds: number) => rainGearFor(chapter('stormoga'), 'elof', new Set(['eye', 'scene:oga']), scene(TAKE_OFF.scene, seconds));
    // The other way round: the zip, the right sleeve, off his back, the left sleeve, and then it is in his hands.
    expect(off(0.2)!.on).toBeUndefined();
    expect(off(0.65)!.on!.coat).toBeCloseTo(COAT_ORDER.zip[0]);
    expect(off(1.2)!.on!.coat).toBeCloseTo(COAT_ORDER.otherSleeve[0]);
    expect(off(1.6)!.on!.coat).toBeCloseTo(COAT_ORDER.back[0]);
    expect(off(TAKE_OFF.off + 0.1)!.on!.coat).toBe(0);
    expect(rainGearFor(chapter('stormoga'), 'elof', new Set(['eye', 'scene:oga']), scene(TAKE_OFF.scene, 0.1), true)!.on!.coat).toBe(0);
    for (const flag of [`scene:${TAKE_OFF.scene}`, 'scene:motet', 'taste']) expect(rainGearFor(chapter('stormoga'), 'elof', new Set(['eye', flag]))).toBeNull();
  });

  it('is never on him out of the storm, nor when he is big', () => {
    expect(rainGearFor(chapter('morgonen', false), 'elof', new Set())).toBeNull();
    expect(rainGearFor(chapter('granskog', false), 'elof', new Set())).toBeNull();
    for (const id of STORM) expect(rainGearFor(chapter(id), 'elof', new Set(), null, false, 3), id).toBeNull();
    expect(rainGearFor(chapter('stormkvall'), 'elof', new Set([TAKE, `scene:${PUT_ON.scene}`]), null, false, 3)).toBeNull();
  });

  it('is in his hands only where he takes it from the doll and where he takes it off', () => {
    expect(holdsCoat(stormkvall)).toBe(true);
    expect(holdsCoat(stormoga)).toBe(true);
    expect(holdsCoat(stormskog)).toBe(false);
    expect(stormkvall.spots!.find((spot) => spot.id === TAKE)!.look).toBe('doll');
  });

  it('is shells of his own body until a coat made in Blender for his model comes, and then that coat', () => {
    const model = elofFigure();
    const rig = createModelRig(model, 1);
    const coats = () => {
      const found: SkinnedMesh[] = [];
      model.traverse((node) => { if (node.name === 'rain-gear' && /raincoat$/.test(String(node.userData.wardrobe))) found.push(node as SkinnedMesh); });
      return found;
    };
    const gear = rainGearFor(chapter('stormskog'), 'elof', new Set())!;
    rig.dress!(gear);
    expect(coats().map((coat) => coat.userData.wardrobe)).toEqual(['shell raincoat']);
    expect(coats()[0]!.visible).toBe(true);
    // No boots: of the shells, only the coat is drawn.
    const drawn: SkinnedMesh[] = [];
    model.traverse((node) => { if (node.name === 'rain-gear' && node.visible) drawn.push(node as SkinnedMesh); });
    expect(drawn).toEqual(coats());
    // It lies close to him: as close, for his size, as a boy's would.
    const body = bodyOf(model)!.geometry;
    body.computeBoundingBox();
    const out = new Box3().setFromBufferAttribute(coats()[0]!.geometry.getAttribute('position') as Float32BufferAttribute).max.x - body.boundingBox!.max.x;
    expect(out).toBeGreaterThan(0);
    expect(out).toBeLessThan(0.025);
    // Going on, in the family's order: none of it before, part of it after.
    rig.dress!({ ...gear, on: { coat: 0, boots: [0, 0] } });
    expect(coats()[0]!.visible).toBe(false);
    rig.dress!({ ...gear, on: { coat: 0.3, boots: [0, 0] } });
    expect(coats()[0]!.visible).toBe(true);
    expect(coats()[0]!.geometry.getAttribute('gearOrder')).toBeDefined();
    rig.wear!(elofWardrobe(model));
    expect(coats().map((coat) => coat.userData.wardrobe)).toEqual(['elof_raincoat']);
    expect(coats()[0]!.visible).toBe(true);
    rig.dress!(null);
    expect(coats()[0]!.visible).toBe(false);
  });
});

/** A small skinned figure, 1 tall, its parts boxes each moved by one bone, named as the family's models' bones are. */
function elofFigure(): Group {
  const model = new Group();
  const bones: Bone[] = [];
  const bone = (name: string, parent: Object3D, x: number, y: number) => {
    const made = new Bone();
    made.name = name;
    made.position.set(x, y, 0);
    parent.add(made);
    bones.push(made);
    return made;
  };
  const pelvis = bone('pelvis', model, 0, 0.42);
  const chest = bone('spine_02', bone('spine_01', pelvis, 0, 0.1), 0, 0.12);
  bone('Head', chest, 0, 0.18);
  for (const [side, x] of [['l', 1], ['r', -1]] as const) {
    bone(`lowerarm_${side}`, bone(`upperarm_${side}`, chest, x * 0.12, 0.08), x * 0.02, -0.12);
    bone(`foot_${side}`, bone(`calf_${side}`, bone(`thigh_${side}`, pelvis, x * 0.06, -0.02), 0, -0.18), 0, -0.17);
  }
  model.updateMatrixWorld(true);
  const parts = bones.map((one, i) => {
    const at = one.getWorldPosition(new Vector3());
    const box = new BoxGeometry(0.1, 0.12, 0.1).translate(at.x, at.y - 0.04, at.z).toNonIndexed();
    const count = box.getAttribute('position').count;
    box.deleteAttribute('uv');
    box.setAttribute('skinIndex', new Uint16BufferAttribute(Array.from({ length: count * 4 }, (_, k) => (k % 4 === 0 ? i : 0)), 4));
    box.setAttribute('skinWeight', new Float32BufferAttribute(Array.from({ length: count * 4 }, (_, k) => (k % 4 === 0 ? 1 : 0)), 4));
    return box;
  });
  const body = new SkinnedMesh(mergeGeometries(parts), new MeshStandardMaterial());
  body.name = 'elof_painted';
  model.add(body);
  body.bind(new Skeleton(bones));
  return model;
}

/** What the private pack's elof-wardrobe.glb has: a raincoat skinned to bones of the same names. */
function elofWardrobe(model: Group): Group {
  const made = new Group();
  const source = bodyOf(model)!;
  const coat = new SkinnedMesh(source.geometry.clone(), new MeshStandardMaterial());
  coat.name = 'elof_raincoat';
  const bones = source.skeleton.bones.map((one) => { const copy = new Bone(); copy.name = one.name; return copy; });
  made.add(coat, ...bones);
  coat.bind(new Skeleton(bones, source.skeleton.boneInverses));
  return made;
}
