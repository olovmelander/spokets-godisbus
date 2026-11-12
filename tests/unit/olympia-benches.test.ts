import { Color, DirectionalLight, Group, HemisphereLight, Mesh, Scene } from 'three';
import { describe, expect, it } from 'vitest';
import { ballBag } from '../../src/content/aventyr2/ball-bag';
import { olympia, TEAM_BENCHES } from '../../src/content/aventyr2/chapters/olympia';
import { hood, SHELL, teamBenchesExtra } from '../../src/content/aventyr2/team-benches';
import { DROP } from '../../src/render/rain';
import { DROP_FROM } from '../../src/sim/constants';

/**
 * Olympia's team benches (src/content/aventyr2/team-benches.ts): "Spring förbi bänkarna mellan dropparna" was said where
 * no bench stood, and the drops fell out of the sky. Each run of three drips now pours off the lip of a bench's clear
 * roof, over the path; the dry place between them is under the open sky. And the ball bag at the fence is a bag of
 * small balls, not a second big ball to kick (src/content/aventyr2/ball-bag.ts).
 */
describe("Olympia's team benches and ball bag", () => {
  const drips = olympia.drips!;
  const dry = olympia.checkpoints!.find((c) => c.x > drips[2]!.at.x && c.x < drips[3]!.at.x)!;

  it('stand over every drip, each drip well inside one roof, and leave the dry place open', () => {
    expect(TEAM_BENCHES.length).toBe(2);
    for (const drip of drips) expect(TEAM_BENCHES.filter((b) => drip.at.x > b.from + 0.6 && drip.at.x < b.to - 0.6).length).toBe(1);
    for (const bench of TEAM_BENCHES) expect(dry.x < bench.from - 0.5 || dry.x > bench.to + 0.5).toBe(true);
  });

  it('reach over the path with their lip, just over where each drop is first drawn, and stand behind him on the ground', () => {
    // The lip is in front of the play plane, where the drops fall, and only a little over the top of a drop as it lets go.
    expect(SHELL.lip.z).toBeGreaterThan(0);
    const top = DROP_FROM + DROP.foot + DROP.top;
    expect(SHELL.lip.y).toBeGreaterThan(top);
    expect(SHELL.lip.y - top).toBeLessThan(0.6);
    // The roof never comes down over his head anywhere over the path, and the back wall is well behind it.
    for (let t = 0; t <= 1; t += 0.05) {
      const p = hood(t);
      if (p.z > -1) expect(p.y).toBeGreaterThan(5);
    }
    expect(SHELL.back).toBeLessThan(-2.5);
  });

  it('are drawn in two meshes for both benches, and only in Olympia', () => {
    const context = (chapter: typeof olympia) => ({ chapter, scene: new Scene(), sky: new Color(), hemisphere: new HemisphereLight(), sun: new DirectionalLight() });
    const here = context(olympia);
    expect(teamBenchesExtra(here)).not.toBeNull();
    const benches = here.scene.getObjectByName('team-benches') as Group;
    expect(benches.children.length).toBe(2);
    for (const mesh of benches.children as Mesh[]) {
      mesh.geometry.computeBoundingBox();
      const box = mesh.geometry.boundingBox!;
      expect(box.min.x).toBeGreaterThanOrEqual(TEAM_BENCHES[0]!.from - 0.2);
      expect(box.max.x).toBeLessThanOrEqual(TEAM_BENCHES[1]!.to + 0.2);
      expect(box.min.y).toBeGreaterThanOrEqual(-0.2);
      // Nothing of them stands in front of the path.
      expect(box.max.z).toBeLessThan(0.5);
    }
    expect(teamBenchesExtra(context({ ...olympia, id: 'flarken' }))).toBeNull();
  });

  it('has a bag of small balls at the fence, smaller than the ball of the puzzle and the size of the ones that roll', () => {
    const bag = olympia.decor!.find((d) => d.look === 'football')!;
    expect(bag.word).toBe('bag');
    const made = ballBag();
    expect(made.children.length).toBe(2);
    const roller = olympia.rollers![0]!;
    for (const mesh of made.children as Mesh[]) {
      mesh.geometry.computeBoundingBox();
      // Lying on the turf, lower than the puzzle's ball (1.5 high), and not much over the rollers' size.
      expect(mesh.geometry.boundingBox!.min.y).toBeGreaterThanOrEqual(-0.05);
      expect(mesh.geometry.boundingBox!.max.y).toBeLessThan(1.5);
    }
    expect(roller.radius).toBeGreaterThan(0.4);
  });
});
