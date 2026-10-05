import { readFileSync } from 'node:fs';
import { BoxGeometry, BufferGeometry, Color, Float32BufferAttribute, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, SphereGeometry, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { STORY } from '../../src/content/chapters';
import { KINDS } from '../../src/content/kinds';
import { TRAIL_SHAPES, candyKit, candyPlaces, createTrail, installSweets, sweetSocket, trailColour, trailShape, type CandyKit } from '../../src/render/candy';

const generator = readFileSync(new URL('../../art/blender/candy.py', import.meta.url), 'utf8');
/** The names the generator gives its sweets. */
const built = [...generator.matchAll(/^(?:finish\(part, |raspberry\()'([a-z]+)'/gm)].map((match) => match[1]!);

/** A sweet as the kit holds one: corners with a colour and a UV. */
function sweet(): BufferGeometry {
  const geometry = new BoxGeometry(0.2, 0.2, 0.2);
  geometry.setAttribute('color', new Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 3).fill(1), 3));
  return geometry;
}
const kit = (...names: string[]): CandyKit => {
  const shapes = new Map(names.map((name) => [name, sweet()]));
  return { shape: (name) => shapes.get(name), material: new MeshStandardMaterial(), paper: new MeshStandardMaterial() };
};
const trail = Array.from({ length: 40 }, (_, i) => ({ x: i * 2, y: 1 }));
const meshes = (group: Group) => group.children as InstancedMesh[];
/** How big each candy is drawn and where, by its place in the chapter's trail. */
function drawn(group: Group): { size: number; x: number }[] {
  const matrix = new Matrix4(), size = new Vector3(), at = new Vector3();
  const all: { size: number; x: number }[] = [];
  for (const mesh of meshes(group)) {
    for (const [slot, index] of (mesh.userData.candies as number[]).entries()) {
      mesh.getMatrixAt(slot, matrix);
      all[index] = { size: size.setFromMatrixScale(matrix).x, x: at.setFromMatrixPosition(matrix).x };
    }
  }
  return all;
}

describe('the candy kit from Blender', () => {
  it('has a sweet for everything the game asks it for', () => {
    for (const shape of TRAIL_SHAPES) expect(built, shape).toContain(shape);
    for (const kind of Object.keys(KINDS)) expect(built, kind).toContain(kind);
    for (const other of ['burk', 'guldhallon', 'lysklubba', 'stjarna', 'lordagspase', 'reva']) expect(built, other).toContain(other);
    expect(new Set(built).size).toBe(built.length);
  });

  it('paints every hidden kind in the colours its sticker has', () => {
    for (const [kind, { colour, mark }] of Object.entries(KINDS)) {
      expect(generator, `${kind} ${colour}`).toContain(`'${colour}'`);
      expect(generator, `${kind} ${mark}`).toContain(`'${mark}'`);
    }
  });

  it('reads its sweets from a loaded model, each in the kit\'s own space', () => {
    const model = new Group();
    const mesh = new Mesh(sweet(), new MeshStandardMaterial());
    mesh.name = 'karamell';
    // The pack step puts a model's scale on its node.
    mesh.scale.setScalar(2);
    mesh.position.set(0, 1, 0);
    const plain = new Mesh(new SphereGeometry(1), new MeshStandardMaterial());
    plain.name = 'no-colours';
    model.add(mesh, plain);
    const read = candyKit(model);
    const shape = read.shape('karamell')!;
    expect(shape.boundingBox!.min.y).toBeCloseTo(0.8);
    expect(shape.boundingBox!.max.y).toBeCloseTo(1.2);
    expect(shape.getAttribute('color').itemSize).toBe(3);
    expect(read.shape('no-colours')).toBeUndefined();
    expect(candyKit(new Group()).shape('karamell')).toBeUndefined();
  });
});

describe('the trail candy', () => {
  it('is sweets in wrappers only: karameller, striped ones and a swirl now and then', () => {
    const count = [0, 0, 0, 0, 0];
    for (let i = 0; i < 78; i++) count[trailShape(i)]!++;
    // No heart and no lollipop: those are the side candy's voice.
    expect(count[3]! + count[4]!).toBe(0);
    expect(count[0]!).toBeGreaterThan(count[1]!);
    expect(count[1]!).toBeGreaterThan(count[2]!);
    expect(count[2]!).toBeGreaterThan(0);
    // A karamell comes in every colour.
    expect(new Set(Array.from({ length: 78 }, (_, i) => i).filter((i) => trailShape(i) === 0).map((i) => trailColour(i))).size).toBe(6);
  });

  it('side candy speaks in another voice: hearts and lollipops, and every heart is pink', () => {
    for (let i = 0; i < 40; i++) {
      expect(trailShape(i, 'side')).toBeGreaterThanOrEqual(3);
      if (trailShape(i, 'side') === 3) expect(trailColour(i, 'side')).toBe('#ef7fb0');
    }
    const made = createTrail(trail, 'side');
    expect(made.group.name).toBe('side-candy');
    expect(made.install(kit(...TRAIL_SHAPES))).toBe(true);
    expect(meshes(made.group)).toHaveLength(2);
    // Each place it lies in is drawn for itself, and only while it is in sight: two side ways far apart are
    // four meshes, and each holds its own candies and is as large as its place, with room for a sweet to fly.
    const two = [...trail.slice(0, 4), ...trail.slice(0, 5).map((c) => ({ x: c.x + 60, y: c.y + 3 }))];
    expect(candyPlaces(two, 'side')).toEqual([[0, 1, 2, 3], [4, 5, 6, 7, 8]]);
    expect(candyPlaces(two, 'trail')).toEqual([[0, 1, 2, 3, 4, 5, 6, 7, 8]]);
    const apart = createTrail(two, 'side');
    apart.install(kit(...TRAIL_SHAPES));
    expect(meshes(apart.group)).toHaveLength(4);
    for (const mesh of meshes(apart.group)) {
      const held = mesh.userData.candies as number[];
      expect(mesh.frustumCulled).toBe(true);
      expect(held.every((i) => i < 4) || held.every((i) => i >= 4)).toBe(true);
      for (const i of held) expect(mesh.boundingSphere!.center.distanceTo(new Vector3(two[i]!.x, two[i]!.y, 0))).toBeLessThan(mesh.boundingSphere!.radius - 2);
      expect(mesh.boundingSphere!.radius).toBeLessThan(12);
    }
    // The trail itself is never outside the picture as a whole.
    const whole = createTrail(two);
    whole.install(kit(...TRAIL_SHAPES));
    for (const mesh of meshes(whole.group)) expect(mesh.frustumCulled).toBe(false);
    // A chapter with no side candy draws nothing for it.
    const none = createTrail([], 'side');
    none.install(kit(...TRAIL_SHAPES));
    expect(meshes(none.group)).toHaveLength(0);
    // Every chapter's side candy lies off its trail: none of it is found by following the trail's candy.
    for (const chapter of STORY) {
      for (const extra of chapter.side ?? []) {
        const nearest = Math.min(...chapter.candy.map((c) => Math.hypot(c.x - extra.x, c.y - extra.y)));
        expect(nearest, `${chapter.id}: side candy at ${extra.x},${extra.y}`).toBeGreaterThan(0.9);
      }
    }
  });

  it('is one draw before the kit has come, and one for each kind of sweet after', () => {
    const made = createTrail(trail);
    expect(made.group.name).toBe('trail-candy');
    expect(meshes(made.group)).toHaveLength(1);
    expect(meshes(made.group)[0]!.count).toBe(40);
    expect(made.install(kit('karamell', 'randig'))).toBe(false);
    expect(meshes(made.group)).toHaveLength(1);
    expect(made.install(kit(...TRAIL_SHAPES))).toBe(true);
    expect(meshes(made.group)).toHaveLength(3);
    // Every candy is drawn by exactly one of them.
    const held = meshes(made.group).flatMap((mesh) => mesh.userData.candies as number[]).sort((a, b) => a - b);
    expect(held).toEqual(trail.map((_, i) => i));
    for (const mesh of meshes(made.group)) expect(mesh.count).toBe((mesh.userData.candies as number[]).length);
  });

  it('keeps what has happened to each candy when the kit takes over', () => {
    const made = createTrail(trail);
    const collected = trail.map((_, i) => i === 3);
    // Collected before the kit came: it has flown into him, and is gone.
    for (let i = 0; i < 30; i++) made.update(collected, new Set(), 0, 0, 1 / 60, i / 60);
    made.install(kit(...TRAIL_SHAPES));
    made.update(collected, new Set(), 0, 0, 1 / 60, 1);
    const now = drawn(made.group);
    expect(now[3]!.size).toBeCloseTo(0);
    expect(now[4]!.size).toBeCloseTo(1);
    expect(now[5]!.x).toBeCloseTo(10);
  });

  it('gives each candy its colour on the mesh that draws it', () => {
    const made = createTrail(trail);
    made.install(kit(...TRAIL_SHAPES));
    const colour = new Color();
    for (const mesh of meshes(made.group)) {
      for (const [slot, index] of (mesh.userData.candies as number[]).entries()) {
        mesh.getColorAt(slot, colour);
        expect(`#${colour.getHexString()}`).toBe(trailColour(index));
      }
    }
  });

  it('a candy that waits for a flag has no size until the flag is set', () => {
    const waiting = createTrail([{ x: 0, y: 1, after: 'bag:torn' }, { x: 2, y: 1 }]);
    waiting.install(kit(...TRAIL_SHAPES));
    waiting.update([false, false], new Set(), 0, 0, 1 / 60, 0);
    expect(drawn(waiting.group)[0]!.size).toBe(0);
    expect(drawn(waiting.group)[1]!.size).toBeCloseTo(1);
    for (let i = 0; i < 30; i++) waiting.update([false, false], new Set(['bag:torn']), 0, 0, 1 / 60, i / 60);
    expect(drawn(waiting.group)[0]!.size).toBeCloseTo(1);
  });

  it('a chapter without candy still has a trail to ask', () => {
    const none = createTrail([]);
    expect(none.install(kit(...TRAIL_SHAPES))).toBe(true);
    none.update([], new Set(), 0, 0, 1 / 60, 0);
    expect(meshes(none.group).reduce((sum, mesh) => sum + mesh.count, 0)).toBe(0);
  });
});

describe('a place for one of the kit\'s sweets', () => {
  it('holds its stand-in until the kit has the sweet, and the sweet after', () => {
    const scene = new Group();
    const standIn = new Mesh(new SphereGeometry(0.2), new MeshStandardMaterial());
    const holder = sweetSocket(new Group().add(standIn), { shape: 'gelehallon', scale: 0.5, y: 0.1 });
    scene.add(holder);
    expect(installSweets(scene, kit('polkagris'))).toBe(0);
    expect(holder.children).toEqual([standIn]);
    const has = kit('gelehallon');
    expect(installSweets(scene, has)).toBe(1);
    expect(holder.children).toHaveLength(1);
    const placed = holder.children[0] as Mesh;
    expect(placed.geometry).toBe(has.shape('gelehallon'));
    expect(placed.material).toBe(has.material);
    expect(placed.scale.x).toBe(0.5);
    expect(placed.position.y).toBe(0.1);
    // Once is enough: a second kit finds nothing left to place.
    expect(installSweets(scene, has)).toBe(0);
  });

  it('gives magic candy a glow of its own, and the lantern a light the mist does not dim', () => {
    const scene = new Group();
    const star = sweetSocket(new Group(), { shape: 'stjarna', glow: 0.8 });
    const lantern = sweetSocket(new Group(), { shape: 'lysklubba', lantern: true });
    scene.add(star, lantern);
    const has = kit('stjarna', 'lysklubba');
    installSweets(scene, has);
    const glowing = (star.children[0] as Mesh).material as MeshStandardMaterial;
    expect(glowing).not.toBe(has.material);
    expect(glowing.userData.candy.candyLift.value).toBe(0.8);
    expect(glowing.vertexColors).toBe(true);
    const light = (lantern.children[0] as Mesh).material as MeshStandardMaterial;
    expect(light.type).toBe('MeshBasicMaterial');
    expect(light.fog).toBe(false);
  });

  it('changes the shape of many sweets at once and keeps their places and colours', () => {
    const scene = new Group();
    const many = sweetSocket(new InstancedMesh(new SphereGeometry(0.3), new MeshStandardMaterial(), 4), { shape: 'burk', scale: 3 });
    const at = new Matrix4().makeTranslation(1, 2, 3);
    many.setMatrixAt(2, at);
    many.setColorAt(2, new Color('#de5161'));
    scene.add(many);
    const has = kit('burk');
    expect(installSweets(scene, has)).toBe(1);
    expect(many.material).toBe(has.material);
    many.geometry.computeBoundingBox();
    expect(many.geometry.boundingBox!.max.x).toBeCloseTo(0.3);
    // The kit's own shape is shared, and was not made bigger.
    has.shape('burk')!.computeBoundingBox();
    expect(has.shape('burk')!.boundingBox!.max.x).toBeCloseTo(0.1);
    const read = new Matrix4(), colour = new Color();
    many.getMatrixAt(2, read);
    expect(read.equals(at)).toBe(true);
    many.getColorAt(2, colour);
    expect(colour.getHexString()).toBe('de5161');
  });
});
