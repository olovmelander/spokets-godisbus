import { Bone, Color, Group, Scene, SkinnedMesh, Vector3, type Mesh } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { HEIGHT, createGrandparent, ladderAngle } from '../../src/content/aventyr2/grandparents';
import { loadAdventure2 } from '../../src/content/chapters';
import { PACK } from '../../src/render/extensions';

vi.mock('../../src/platform/motion', () => ({ lessMotion: () => false }));

/** Mormor and Morfar (src/content/aventyr2/grandparents.ts): plain figures on the family's bones, who stay when called. */
describe('Äventyr 2: mormor and morfar', () => {
  const place = (who: 'mormor' | 'morfar', lantern: Group | null = null) => {
    const figure = createGrandparent(who, lantern);
    const scene = new Scene();
    scene.add(figure.group);
    return figure;
  };
  const skinned = (group: Group) => {
    const found: SkinnedMesh[] = [];
    group.traverse((object) => { if (object instanceof SkinnedMesh) found.push(object); });
    return found;
  };
  const run = (figure: ReturnType<typeof place>, used: boolean, seconds: number, elof = 0) => {
    for (let t = 0; t < seconds; t += 1 / 30) figure.update(used, t, 1 / 30, elof);
  };

  it.each(['mormor', 'morfar'] as const)('builds %s as one skinned mesh, on the bones the rig drives', (who) => {
    const figure = place(who);
    const meshes = skinned(figure.group);
    expect(meshes).toHaveLength(1);
    const names = meshes[0]!.skeleton.bones.map((bone: Bone) => bone.name);
    for (const name of ['spine_01', 'Head', 'upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r', 'hand_l', 'hand_r', 'thigh_l', 'thigh_r', 'calf_l', 'calf_r', 'foot_l', 'foot_r']) {
      expect(names, name).toContain(name);
    }
    expect(figure.rig.height).toBe(HEIGHT[who]);
  });

  it('stands where the chapter puts them, as a spot', async () => {
    await loadAdventure2();
    const prop = PACK.spots.get('morfar')!({ id: 'bi:morfar', look: 'morfar', at: { x: 13.2, y: 0.5 }, verb: 'call' });
    expect(prop!.group.position.x).toBe(13.2);
    expect(prop!.group.position.y).toBe(0.5);
  });

  it('keeps away from the colours of the candy and its hooks', () => {
    for (const who of ['mormor', 'morfar'] as const) {
      const colour = skinned(place(who).group)[0]!.geometry.getAttribute('color');
      const seen = new Color();
      for (let i = 0; i < colour.count; i += 40) {
        seen.setRGB(colour.getX(i), colour.getY(i), colour.getZ(i)).convertLinearToSRGB();
        const hsl = seen.getHSL({ h: 0, s: 0, l: 0 });
        // Skin, wood and hair are soft: only a strong red, pink or gold would be the candy's.
        if (hsl.s > 0.7) expect(hsl.l).toBeLessThan(0.3);
      }
    }
  });

  it.each(['mormor', 'morfar'] as const)('keeps %s standing in the picture when he calls: a person does not shrink away', (who) => {
    const figure = place(who);
    run(figure, true, 4);
    expect(figure.group.visible).toBe(true);
    expect(figure.group.scale.x).toBe(1);
    expect(skinned(figure.group)[0]!.visible).toBe(true);
  });

  it('goes down to his height when he comes near, and rises again when he goes', () => {
    const figure = place('mormor');
    const foot = () => figure.rig.group.getObjectByName('pelvis')!.getWorldPosition(new Vector3()).y;
    run(figure, false, 2, 30);
    figure.group.updateWorldMatrix(true, true);
    const standing = foot();
    run(figure, false, 3, 1);
    figure.group.updateWorldMatrix(true, true);
    const kneeling = foot();
    expect(kneeling).toBeLessThan(standing - 0.4);
    run(figure, false, 3, 30);
    figure.group.updateWorldMatrix(true, true);
    expect(foot()).toBeCloseTo(standing, 0);
  });

  it('follows him with its head before its body', () => {
    const figure = place('morfar');
    figure.update(false, 0, 0.1, 6);
    figure.update(false, 0.1, 0.1, 6);
    const head = figure.rig.group.getObjectByName('Head')!;
    expect(figure.rig.group.rotation.y).toBeGreaterThan(0);
    expect(figure.rig.group.rotation.y).toBeLessThan(0.3);
    expect(head.rotation.y + head.rotation.x + head.rotation.z).not.toBe(0);
  });

  it('lays morfar\'s ladder down flat over the ditch, with a small bounce, in the time the story holds him', () => {
    expect(ladderAngle(0)).toBe(0);
    expect(ladderAngle(0.5)).toBeLessThan(0.4);
    expect(ladderAngle(1.3)).toBeCloseTo(Math.PI / 2, 5);
    expect(ladderAngle(1.42)).toBeLessThan(Math.PI / 2);
    expect(ladderAngle(1.6)).toBeCloseTo(Math.PI / 2, 1);
    expect(ladderAngle(3)).toBeCloseTo(Math.PI / 2, 3);
    const figure = place('morfar');
    expect(figure.ladder).not.toBeNull();
    run(figure, true, 1.8);
    expect(figure.ladder!.rotation.z).toBeCloseTo(-Math.PI / 2, 1);
    expect(figure.ladder!.rotation.y).toBeCloseTo(0, 1);
    // It stays until the ledge is there, however long the story holds him first.
    run(figure, true, 6);
    expect(figure.ladder!.visible).toBe(true);
    figure.update(true, 9, 1 / 30, 0, true);
    expect((figure.ladder as Mesh).visible).toBe(false);
  });

  it('hangs mormor\'s lantern from her hand and lifts it when she is called', () => {
    const lantern = new Group();
    const figure = place('mormor', lantern);
    const height = () => { figure.group.updateWorldMatrix(true, true); return lantern.getWorldPosition(new Vector3()).y; };
    run(figure, false, 1, 30);
    const low = height();
    run(figure, true, 2, 30);
    expect(height()).toBeGreaterThan(low + 0.8);
  });
});
