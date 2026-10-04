import {
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { ChapterData, PlaceId } from "../sim/types";

type Species = "spruce" | "birch" | "pine";
function random(seed: number) {
  let s = seed | 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}
function coloured(geometry: BufferGeometry, hex: string, lift = 0.2) {
  const p = geometry.getAttribute("position"),
    c = new Color(hex),
    colours = [];
  for (let i = 0; i < p.count; i++) {
    const bright = 0.82 + lift * Math.min(1, Math.max(0, p.getY(i) / 5));
    colours.push(c.r * bright, c.g * bright, c.b * bright);
  }
  geometry.setAttribute("color", new Float32BufferAttribute(colours, 3));
  geometry.deleteAttribute("uv");
  return geometry;
}
function merged(parts: BufferGeometry[]) {
  const g = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  return g;
}
function branch(a: Vector3, b: Vector3, r: number, hex: string) {
  const g = new CylinderGeometry(r * 0.55, r, a.distanceTo(b), 5);
  const turn = new Object3D();
  turn.quaternion.setFromUnitVectors(
    new Vector3(0, 1, 0),
    b.clone().sub(a).normalize(),
  );
  turn.position.copy(a).add(b).multiplyScalar(0.5);
  turn.updateMatrix();
  g.applyMatrix4(turn.matrix);
  return coloured(g, hex);
}

/** Sculpted species silhouettes, baked into two instanced batches. No tree is in the walking corridor. */
function tree(species: Species) {
  const next = random(
      species === "spruce" ? 71 : species === "birch" ? 93 : 105,
    ),
    wood = [],
    leaves = [];
  const bark =
    species === "birch"
      ? "#ded9cd"
      : species === "pine"
        ? "#87715e"
        : "#736552";
  const bent = species === "pine" ? 0.6 : 0.09;
  wood.push(
    branch(
      new Vector3(),
      new Vector3(bent, 6, 0),
      species === "birch" ? 0.09 : 0.15,
      bark,
    ),
  );
  if (species === "spruce") {
    for (let level = 0; level < 7; level++) {
      const y = 1.1 + level * 0.68,
        reach = 1.5 * (1 - level / 8);
      for (let arm = 0; arm < 7; arm++) {
        const a = (arm * Math.PI * 2) / 7 + level * 0.7,
          start = new Vector3(0.04, y, 0),
          end = new Vector3(Math.cos(a) * reach, y - 0.22, Math.sin(a) * reach);
        wood.push(branch(start, end, 0.028, bark));
        // Needle sprays are irregular drooping fans rather than stacked cones.
        const points = [];
        for (let feather = 0; feather < 5; feather++) {
          const t = 0.25 + feather * 0.17,
            x = Math.cos(a) * reach * t,
            z = Math.sin(a) * reach * t,
            w = (1 - t * 0.6) * 0.34;
          points.push(
            x,
            y - 0.18 * t,
            z,
            x + Math.cos(a + 1.4) * w,
            y - 0.27 - t * 0.2,
            z + Math.sin(a + 1.4) * w,
            end.x + (next() - 0.5) * 0.09,
            end.y - 0.16,
            end.z,
            x,
            y - 0.18 * t,
            z,
            end.x,
            end.y - 0.16,
            end.z,
            x + Math.cos(a - 1.4) * w,
            y - 0.27 - t * 0.2,
            z + Math.sin(a - 1.4) * w,
          );
        }
        const g = new BufferGeometry();
        g.setAttribute("position", new Float32BufferAttribute(points, 3));
        g.computeVertexNormals();
        leaves.push(coloured(g, level % 3 === 0 ? "#486451" : "#355b46", 0.38));
      }
    }
  } else {
    const count = species === "birch" ? 24 : 18;
    for (let i = 0; i < count; i++) {
      const a = i * 2.4,
        y = species === "birch" ? 2.4 + next() * 3.5 : 4 + next() * 1.7;
      const reach = species === "birch" ? 0.6 + next() * 0.7 : 1 + next() * 1.1;
      const tip = new Vector3(
        bent + Math.cos(a) * reach,
        y,
        Math.sin(a) * reach,
      );
      wood.push(
        branch(new Vector3(bent * (y / 6), y - 0.65, 0), tip, 0.025, bark),
      );
      const g = new SphereGeometry(1, 7, 5);
      const p = g.getAttribute("position");
      for (let v = 0; v < p.count; v++) {
        const factor = 0.83 + next() * 0.3;
        p.setXYZ(v, p.getX(v) * factor, p.getY(v) * factor, p.getZ(v) * factor);
      }
      g.scale(
        species === "birch" ? 0.45 : 0.7,
        species === "birch" ? 0.6 : 0.2,
        species === "birch" ? 0.38 : 0.55,
      ).translate(tip.x, tip.y, tip.z);
      g.computeVertexNormals();
      leaves.push(
        coloured(
          g,
          species === "birch"
            ? ["#a6aa55", "#d2b951", "#9aaf69"][i % 3]!
            : ["#365548", "#4c6952", "#61765b"][i % 3]!,
          0.3,
        ),
      );
    }
  }
  return { wood: merged(wood), leaves: merged(leaves) };
}
function heightAt(chapter: ChapterData, x: number) {
  for (let i = 0; i < chapter.ground.length - 1; i++) {
    const a = chapter.ground[i]!,
      b = chapter.ground[i + 1]!;
    if (a.x !== b.x && x >= a.x && x <= b.x)
      return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
  }
  return chapter.ground[0]!.y;
}

function fern(): BufferGeometry {
  const positions: number[] = [];
  for (let frond = 0; frond < 7; frond++) {
    const a = (frond * Math.PI * 2) / 7,
      tall = 0.72 + (frond % 3) * 0.19;
    for (let leaf = 1; leaf < 8; leaf++) {
      const t = leaf / 8,
        reach = t * 0.78,
        x = Math.cos(a) * reach,
        z = Math.sin(a) * reach;
      const y = Math.sin(t * Math.PI * 0.7) * tall,
        wide = 0.18 * Math.sin(t * Math.PI);
      for (const side of [-1, 1]) {
        positions.push(
          x,
          y,
          z,
          x + Math.cos(a + side * 1.3) * wide,
          y + 0.035,
          z + Math.sin(a + side * 1.3) * wide,
          x + Math.cos(a) * 0.15,
          y + 0.06,
          z + Math.sin(a) * 0.15,
        );
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return coloured(g, "#648848", 0.45);
}

export function vegetation(chapter: ChapterData, place: PlaceId) {
  const group = new Group();
  group.name = "chapter-vegetation";
  const time = { value: 0 },
    motion = { value: 1 };
  if (place === "home")
    return { group, update(_clock: number, _calm = false) {} };
  const species: Species =
    place === "forest"
      ? "spruce"
      : place === "garden" || place === "village"
        ? "birch"
        : "pine";
  const shape = tree(species),
    next = random(131 + chapter.ground.length),
    poses = [];
  const from = chapter.ground[0]!.x,
    to = chapter.shop?.door ?? chapter.ground[chapter.ground.length - 1]!.x;
  const spacing =
    place === "forest"
      ? 13
      : place === "village"
        ? 28
        : place === "garden"
          ? 30
          : 24;
  for (let x = from + 8; x < to; x += spacing + next() * 7) {
    const y = heightAt(chapter, x);
    if (
      Math.abs(heightAt(chapter, x + 0.5) - y) > 1 ||
      (chapter.water ?? []).some((w) => x >= w.from && x <= w.to && y < w.y)
    )
      continue;
    const at = new Object3D();
    at.position.set(x, y - 0.3, place === "village" ? -13.3 : -8 - next() * 9);
    at.rotation.y = next() * 6.28;
    at.rotation.z = (next() - 0.5) * (species === "pine" ? 0.19 : 0.055);
    const scale =
      place === "village"
        ? 3.8
        : place === "garden"
          ? 2.8
          : place === "forest"
            ? 1.2
            : 1.5;
    at.scale.setScalar(scale * (0.75 + next() * 0.5));
    at.updateMatrix();
    poses.push(at.matrix.clone());
  }
  const timber = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
  });
  const foliage = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.83,
    side: DoubleSide,
  });
  foliage.onBeforeCompile = (shader) => {
    shader.uniforms.foliageTime = time;
    shader.uniforms.foliageMotion = motion;
    shader.vertexShader =
      "uniform float foliageTime, foliageMotion;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        transformed.x += sin(foliageTime * .85 + instanceMatrix[3].x * .27 + position.y * .8)
          * smoothstep(1.0, 6.0, position.y) * .045 * foliageMotion;
      #endif`,
    );
  };
  foliage.customProgramCacheKey = () => "chapter-foliage-v1";
  for (const [geometry, material, name] of [
    [shape.wood, timber, "tree-branches"],
    [shape.leaves, foliage, "tree-crowns"],
  ] as const) {
    const mesh = new InstancedMesh(geometry, material, poses.length);
    mesh.name = name;
    poses.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  if (place === "forest") {
    const poses = [],
      next = random(391),
      at = new Object3D();
    for (let x = from + 3; x < to; x += 5 + next() * 5) {
      const y = heightAt(chapter, x);
      if (
        chapter.surfaces?.some((s) => x >= s.from && x <= s.to) ||
        Math.abs(heightAt(chapter, x + 0.4) - y) > 0.3 ||
        (chapter.water ?? []).some((w) => x >= w.from && x <= w.to && y < w.y)
      )
        continue;
      at.position.set(x, y, -1.3 - next() * 3);
      at.rotation.y = next() * 6.28;
      at.scale.setScalar(0.7 + next() * 0.6);
      at.updateMatrix();
      poses.push(at.matrix.clone());
    }
    const ferns = new InstancedMesh(fern(), foliage, poses.length);
    ferns.name = "forest-ferns";
    poses.forEach((m, i) => ferns.setMatrixAt(i, m));
    ferns.computeBoundingSphere();
    group.add(ferns);
  }
  return {
    group,
    update(clock: number, calm = false) {
      time.value = clock;
      motion.value = calm ? 0 : 1;
    },
  };
}
