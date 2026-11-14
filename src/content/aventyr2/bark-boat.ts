import { BufferGeometry, Float32BufferAttribute, Mesh, MeshStandardMaterial } from 'three';

/**
 * The piece of pine bark that carries Elof's little carving (Olov, 14 November 2026: at the lookout "sitter Lillgubben
 * på något. När Lillgubben sedan syns igen i slutet flyter den däremot direkt på vattnet. Kan vi göra detta
 * enhetligt?"). One thing in all three places: caught against a stone where the å begins, with the little one on it,
 * seen from Flärken's diving tower; taken by the current at the jetty's end; and bobbing down Älven ahead of Elof's
 * raft. Wherever the little one is on water it is on this (./render.ts, the storm's sightings and flybys): bark is
 * wood, and wood floats, which is what the chapter is about.
 *
 * A thick flake of an old pine's bark, as children make bark boats of: longer than the carving is tall, blunt at one
 * end and narrowing to the other, its top the bark's outside in grey-brown plates with dark furrows between them, its
 * broken edge the red-brown layers the bark is made of, palest lowest, and its rim curled up a little. Its top is at
 * its origin's height, where the carving stands; `BARK_BOAT.sunk` of it lies under the water.
 */
export const BARK_BOAT = { long: 1.16, wide: 0.6, thick: 0.15, sunk: 0.07 } as const;

/** A fixed number from 0 to 1 for a pair of numbers: the same bark every time. */
const hash = (a: number, b: number) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };
const mix = (a: readonly number[], b: readonly number[], t: number) => a.map((v, i) => v + (b[i]! - v) * Math.min(1, Math.max(0, t)));
const tone = (hex: string) => [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255) ** 2.2);

const PLATE = tone('#8a6648'), PLATE_GREY = tone('#9a9082'), FURROW = tone('#2e1c12');
const LAYERS = [tone('#d9b98c'), tone('#b9713c'), tone('#8e4a26'), tone('#6f4a34')];

/** How far out its edge is at an angle round it: blunt behind, narrowing ahead, and nibbled. */
function edge(angle: number): { x: number; z: number } {
  const c = Math.cos(angle), s = Math.sin(angle);
  const nibble = 1 + 0.07 * Math.sin(angle * 5 + 1.3) + 0.04 * Math.sin(angle * 11 + 0.4);
  return { x: (BARK_BOAT.long / 2) * c * (1 + 0.1 * c) * nibble, z: (BARK_BOAT.wide / 2) * s * (1 - 0.32 * Math.max(0, c)) * nibble };
}

let shape: BufferGeometry | null = null;
let wood: MeshStandardMaterial | null = null;

/** The bark, its top at y = 0 and its length along x. One geometry and one material, shared by every one drawn. */
export function barkBoat(): Mesh {
  if (!shape) {
    const AROUND = 28, RINGS = 4;
    const positions: number[] = [], colours: number[] = [], index: number[] = [];
    const put = (x: number, y: number, z: number, colour: readonly number[]) => { positions.push(x, y, z); colours.push(colour[0]!, colour[1]!, colour[2]!); return positions.length / 3 - 1; };
    // Its top: the bark's outside. Plates a little domed, each its own tone, a few gone grey with lichen, and three
    // furrows along it, dark and a little sunk.
    const top = (x: number, z: number, out: number) => {
      const lane = z / (BARK_BOAT.wide / 2) * 1.6 + 0.35 * Math.sin(x * 5.2);
      const inPlate = Math.abs(lane - Math.round(lane));
      const across = Math.abs(Math.sin(x * 7.4 + Math.round(lane) * 2.1));
      const furrow = Math.min(inPlate * 2.6, across * 1.5);
      const plate = Math.round(lane) * 7 + Math.floor((x * 7.4 + Math.round(lane) * 2.1) / Math.PI);
      const base = hash(plate, 3) < 0.3 ? PLATE_GREY : PLATE;
      const colour = mix(FURROW, base.map((v) => v * (0.8 + 0.4 * hash(plate, 5))), furrow * 1.4);
      // Curled up at its rim, as a flake of bark dries.
      return { y: -0.022 * (1 - Math.min(1, furrow * 1.4)) + 0.045 * out ** 3, colour };
    };
    const rings: number[][] = [];
    for (let r = 0; r <= RINGS; r++) {
      const out = r / RINGS;
      const ring: number[] = [];
      for (let i = 0; i < AROUND; i++) {
        const at = edge((i / AROUND) * Math.PI * 2);
        const x = at.x * out, z = at.z * out;
        const made = top(x, z, out);
        ring.push(r === 0 && i > 0 ? ring[0]! : put(x, made.y, z, made.colour));
      }
      rings.push(ring);
    }
    for (let r = 0; r < RINGS; r++) for (let i = 0; i < AROUND; i++) {
      const j = (i + 1) % AROUND;
      const [a, b, c, d] = [rings[r]![i]!, rings[r]![j]!, rings[r + 1]![j]!, rings[r + 1]![i]!];
      if (r > 0) index.push(a, b, c);
      index.push(a, c, d);
    }
    // Its broken edge: the bark's layers, each a band of its own tone, the lowest palest (the bark's inside), each a
    // little further in or out than the one over it.
    const bands = LAYERS.length;
    let over = rings[RINGS]!.map((_, i) => {
      const at = edge((i / AROUND) * Math.PI * 2);
      return put(at.x, 0.045, at.z, mix(PLATE, LAYERS[bands - 1]!, 0.5));
    });
    for (let b = 0; b < bands; b++) {
      const y = -BARK_BOAT.thick * ((b + 1) / bands);
      const inset = b === bands - 1 ? 0.86 : 1 + 0.035 * (b % 2 ? 1 : -1);
      const colour = LAYERS[bands - 1 - b]!;
      const under = over.map((_, i) => {
        const at = edge((i / AROUND) * Math.PI * 2);
        const jag = 1 + 0.03 * (hash(i, b) - 0.5);
        return put(at.x * inset * jag, y, at.z * inset * jag, colour.map((v) => v * (0.85 + 0.3 * hash(i * 3, b))));
      });
      for (let i = 0; i < AROUND; i++) {
        const j = (i + 1) % AROUND;
        index.push(over[i]!, under[j]!, under[i]!, over[i]!, over[j]!, under[j]!);
      }
      over = under;
    }
    // Its underside, the bark's pale inside: seen as it tips.
    const middle = put(0, -BARK_BOAT.thick, 0, LAYERS[0]!);
    for (let i = 0; i < AROUND; i++) index.push(middle, over[i]!, over[(i + 1) % AROUND]!);
    shape = new BufferGeometry();
    shape.setAttribute('position', new Float32BufferAttribute(positions, 3));
    shape.setAttribute('color', new Float32BufferAttribute(colours, 3));
    shape.setIndex(index);
    shape.computeVertexNormals();
  }
  // Wet, and a little warm of itself, as the carving on it is: it has to be told from the dark water it floats on.
  wood ??= new MeshStandardMaterial({ vertexColors: true, roughness: 0.62, flatShading: true, emissive: '#4a3018', emissiveIntensity: 0.55 });
  const mesh = new Mesh(shape, wood);
  mesh.name = 'bark-boat';
  // The family's carving takes its stand-in's place in the figure this lies under: the bark stays (shared-models.ts).
  mesh.userData.keep = 0;
  return mesh;
}
