import {
  BufferAttribute, BufferGeometry, CanvasTexture, ClampToEdgeWrapping, Color, DynamicDrawUsage, Group, LinearMipmapLinearFilter, Mesh,
  MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, Vector3,
} from 'three';
import { GRAVITY } from '../sim/constants';
import type { ChapterData, Ride, Spot } from '../sim/types';
import { drawnWhile } from './idle';

/**
 * A scarf held down to Elof from above while a ride carries him (`Storm.ropes`): Pappa's, from the bridge in Bredbyn in
 * Älven (Olov, 9 November 2026: "Pappas halsduk ser bara ut som ett streck när han sänker ner den från bron"). Knitted
 * wool as wide as Pappa's hand is long, its stitches in rows, pale stripes at its end and the fringe below them. It comes
 * down out of the holder's hands as he lowers it and hangs from them with its weight, swinging in the wind; while it
 * carries Elof, his weight pulls it straight from their hands to his; afterwards it is gathered in.
 *
 * A chain of points under gravity and the wind (Verlet, in fixed steps, so that it moves the same at any frame rate), drawn
 * as one flat band, its hem and its fringe: one draw, made in the warm-up. The chapter says whose call lowers it (`held`,
 * that spot's id) and where their hands go (`from`'s height, `z`); the view poses their hands and Elof's on it, and gives
 * this their places.
 */

/** Its measures, in EL: as wide as Pappa's hand is long, as thick as knitted wool. */
const WIDE = 0.56;
const THICK = 0.08;
/** The end below Elof's hands: its stripes and its hem; the fringe hangs under it. */
const END = 0.34;
const FRINGE = { count: 7, long: 0.5, wide: 0.06, parts: 3 };
/** Points along it, and corners round its flat section. */
const NODES = 18;
const SIDES = 10;
/** How long the lowering and the gathering in take, in seconds. */
const LOWER = 1.3;
const GATHER = 0.9;
/** How high over the ground where he takes hold its last point hangs, waiting: just over his raised hands. */
const HANGS_AT = 1.4;
/** How much longer than the straight line between the hands it is while it carries him: just short of taut. */
const SLACK = 1.015;
/** Its stitches and stripes cover this much of its length, from its end up: as long as it ever hangs. */
const TEXTURE_LONG = 10.24;
const STEP = 1 / 120;
/** How much of its speed each point keeps in a step: wool in the rain, heavy, settling. */
const KEEP = 0.986;

/** Its wool, and the pale stripes and fringe at its end. */
const WOOL = '#a8322b';
const PALE = '#ead9b8';
/** The stripes at its end, from the end up, in EL: pale, wool, pale; then the wool. */
const STRIPES: readonly (readonly [number, string])[] = [[0.16, PALE], [0.26, WOOL], [0.4, PALE]];

const smooth = (t: number) => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k); };

const knits = new Map<string, CanvasTexture>();

/**
 * Its stitches: stockinette's V's in columns, a groove between two columns and a shadow under each row, the wool's fluff,
 * and the stripes by its end. Across, once round its section (the front, then the back); along, from its end up.
 */
function knit(wool: string): CanvasTexture {
  const made = knits.get(wool);
  if (made) return made;
  // Chunky stitches: eight columns once round, so about four across its face, each a V of two plump legs.
  const columns = 8;
  const wide = 12;
  const high = 10;
  const width = columns * wide;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext('2d')!;
  const rowLong = (high * TEXTURE_LONG) / height;
  const shade = new Color(), lit = new Color();
  // A fixed scatter, the same in every picture.
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let row = 0; row * high < height; row++) {
    const along = (row + 0.5) * rowLong;
    const colour = STRIPES.find(([upTo]) => along < upTo)?.[1] ?? wool;
    // The canvas's rows go down, and its end is at the bottom (the band's v is 0 at its end).
    const y = height - (row + 1) * high;
    // Between the legs the wool is in shadow; the legs themselves are the wool, lit from above.
    c.fillStyle = `#${shade.set(colour).multiplyScalar(0.55).getHexString()}`;
    c.fillRect(0, y, width, high);
    for (let col = 0; col < columns; col++) {
      const x = col * wide + wide / 2;
      const tone = 0.92 + 0.16 * random();
      for (const side of [-1, 1]) {
        c.save();
        c.translate(x + side * wide * 0.2, y + high * 0.48);
        c.rotate(side * -0.62);
        c.fillStyle = `#${lit.set(colour).multiplyScalar(tone).getHexString()}`;
        c.beginPath();
        c.ellipse(0, 0, wide * 0.2, high * 0.56, 0, 0, Math.PI * 2);
        c.fill();
        // Its top catches the light, its foot goes into the next row.
        c.fillStyle = 'rgba(255, 255, 255, 0.2)';
        c.beginPath();
        c.ellipse(0, -high * 0.2, wide * 0.1, high * 0.22, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = 'rgba(0, 0, 0, 0.16)';
        c.beginPath();
        c.ellipse(0, high * 0.32, wide * 0.15, high * 0.16, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
      // The wool's fluff: a few lighter and darker specks.
      for (let k = 0; k < 4; k++) {
        c.fillStyle = random() < 0.5 ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.14)';
        c.fillRect(x - wide / 2 + 1 + Math.floor(random() * (wide - 2)), y + Math.floor(random() * (high - 1)), 1, 1);
      }
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.anisotropy = 4;
  knits.set(wool, texture);
  return texture;
}

/** The band, its hem and its fringe, drawn along a chain of points: one mesh. */
function band(wool: string) {
  const material = new MeshStandardMaterial({ color: '#ffffff', map: knit(wool), roughness: 0.96, metalness: 0 });
  const bandVerts = NODES * SIDES;
  const capVerts = SIDES + 1;
  const fringeFirst = bandVerts + capVerts;
  const count = fringeFirst + FRINGE.count * (FRINGE.parts + 1) * 2;
  const position = new BufferAttribute(new Float32Array(count * 3), 3).setUsage(DynamicDrawUsage);
  const normal = new BufferAttribute(new Float32Array(count * 3), 3).setUsage(DynamicDrawUsage);
  const uv = new BufferAttribute(new Float32Array(count * 2), 2).setUsage(DynamicDrawUsage);
  const index: number[] = [];
  for (let i = 0; i < NODES - 1; i++) {
    for (let k = 0; k < SIDES; k++) {
      const a = i * SIDES + k, b = i * SIDES + ((k + 1) % SIDES);
      index.push(a, a + SIDES, b, b, a + SIDES, b + SIDES);
    }
  }
  for (let k = 0; k < SIDES; k++) index.push(bandVerts + SIDES, bandVerts + ((k + 1) % SIDES), bandVerts + k);
  for (let f = 0; f < FRINGE.count; f++) {
    for (let p = 0; p < FRINGE.parts; p++) {
      const a = fringeFirst + (f * (FRINGE.parts + 1) + p) * 2;
      index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', position);
  geometry.setAttribute('normal', normal);
  geometry.setAttribute('uv', uv);
  geometry.setIndex(index);
  const mesh = new Mesh(geometry, material);
  mesh.name = 'scarf';
  mesh.frustumCulled = false;

  // Its section: a flat band with rounded edges; each corner's place across and through it, and how far round it is.
  const corners: { w: number; n: number }[] = [];
  for (let k = 0; k < SIDES; k++) {
    const a = (k / SIDES) * Math.PI * 2, cx = Math.cos(a), sx = Math.sin(a);
    corners.push({ w: Math.sign(cx) * Math.abs(cx) ** 0.35 * WIDE / 2, n: Math.sign(sx) * Math.abs(sx) ** 0.7 * THICK / 2 });
  }
  const edges = corners.map((p, k) => Math.hypot(corners[(k + 1) % SIDES]!.w - p.w, corners[(k + 1) % SIDES]!.n - p.n));
  const round = edges.reduce((sum, e) => sum + e, 0);
  const section = corners.map((p, k) => ({ ...p, u: edges.slice(0, k).reduce((sum, e) => sum + e, 0) / round }));

  const t = new Vector3(), w = new Vector3(), n = new Vector3(), v = new Vector3(), Z = new Vector3(0, 0, 1);
  const frames = Array.from({ length: NODES }, () => ({ w: new Vector3(), n: new Vector3(), t: new Vector3() }));
  return {
    mesh,
    /** Along `nodes` (its top first), each `along` EL from its end; the fringe swings against the end's speed `speed`. */
    draw(nodes: readonly Vector3[], along: readonly number[], clock: number, speed: Vector3, still: boolean) {
      const pos = position.array as Float32Array, nor = normal.array as Float32Array, tex = uv.array as Float32Array;
      for (let i = 0; i < NODES; i++) {
        t.subVectors(nodes[Math.min(NODES - 1, i + 1)]!, nodes[Math.max(0, i - 1)]!);
        if (t.lengthSq() < 1e-10) t.set(0, -1, 0);
        t.normalize();
        // Its broad face towards the picture, turned a little about its length as cloth hangs.
        w.crossVectors(t, Z);
        if (w.lengthSq() < 1e-6) w.set(1, 0, 0);
        w.normalize();
        n.crossVectors(w, t).normalize();
        const twist = still ? 0 : 0.28 * Math.sin(along[i]! * 0.9 + clock * 0.7) * Math.min(1, along[i]! / 1.5);
        const c = Math.cos(twist), s = Math.sin(twist);
        const f = frames[i]!;
        f.w.copy(w).multiplyScalar(c).addScaledVector(n, s);
        f.n.copy(n).multiplyScalar(c).addScaledVector(w, -s);
        f.t.copy(t);
      }
      for (let i = 0; i < NODES; i++) {
        const f = frames[i]!, p = nodes[i]!;
        for (let k = 0; k < SIDES; k++) {
          const corner = section[k]!, at = i * SIDES + k;
          v.copy(p).addScaledVector(f.w, corner.w).addScaledVector(f.n, corner.n);
          pos[at * 3] = v.x; pos[at * 3 + 1] = v.y; pos[at * 3 + 2] = v.z;
          // Mostly the face's normal, rounding over at the edges.
          const across = corner.w / (WIDE / 2), through = corner.n / (THICK / 2);
          v.copy(f.w).multiplyScalar(across ** 3).addScaledVector(f.n, through).normalize();
          nor[at * 3] = v.x; nor[at * 3 + 1] = v.y; nor[at * 3 + 2] = v.z;
          tex[at * 2] = corner.u; tex[at * 2 + 1] = along[i]! / TEXTURE_LONG;
        }
      }
      // Its hem, closed.
      const last = frames[NODES - 1]!, end = nodes[NODES - 1]!;
      for (let k = 0; k <= SIDES; k++) {
        const at = bandVerts + k;
        if (k < SIDES) v.copy(end).addScaledVector(last.w, section[k]!.w).addScaledVector(last.n, section[k]!.n);
        else v.copy(end);
        pos[at * 3] = v.x; pos[at * 3 + 1] = v.y; pos[at * 3 + 2] = v.z;
        nor[at * 3] = last.t.x; nor[at * 3 + 1] = last.t.y; nor[at * 3 + 2] = last.t.z;
        tex[at * 2] = k < SIDES ? section[k]!.u : 0.25; tex[at * 2 + 1] = 0.002;
      }
      // The fringe: pale strands from the hem across its width, bending from the end's way down to the ground's, each
      // swinging a little on its own and trailing the end as it moves.
      for (let f = 0; f < FRINGE.count; f++) {
        const across = (f + 0.5) / FRINGE.count - 0.5;
        const sway = still ? 0 : 0.16 * Math.sin(clock * 2.3 + f * 1.7);
        v.copy(end).addScaledVector(last.w, across * WIDE * 0.92);
        const part = (FRINGE.long / FRINGE.parts) * (1 - 0.15 * Math.abs(across) - 0.08 * (f % 2));
        for (let p = 0; p <= FRINGE.parts; p++) {
          const at = fringeFirst + (f * (FRINGE.parts + 1) + p) * 2;
          if (p > 0) {
            const k = p / FRINGE.parts;
            n.copy(last.t).multiplyScalar(1 - k).add(t.set(sway * k, -k, 0)).addScaledVector(speed, -0.05 * k).normalize();
            v.addScaledVector(n, part);
          }
          const half = FRINGE.wide / 2;
          pos[at * 3] = v.x - last.w.x * half; pos[at * 3 + 1] = v.y - last.w.y * half; pos[at * 3 + 2] = v.z - last.w.z * half + 0.005;
          pos[at * 3 + 3] = v.x + last.w.x * half; pos[at * 3 + 4] = v.y + last.w.y * half; pos[at * 3 + 5] = v.z + last.w.z * half + 0.005;
          for (let side = 0; side < 2; side++) { nor[at * 3 + side * 3] = last.n.x; nor[at * 3 + side * 3 + 1] = last.n.y; nor[at * 3 + side * 3 + 2] = last.n.z; }
          // The pale wool of the end's first stripe.
          const u = (f % 3) / 12 + 0.02;
          tex[at * 2] = u; tex[at * 2 + 1] = 0.004; tex[at * 2 + 2] = u + 0.03; tex[at * 2 + 3] = 0.004;
        }
      }
      position.needsUpdate = true;
      normal.needsUpdate = true;
      uv.needsUpdate = true;
    },
  };
}

/** What a scarf does now: nothing yet, coming down, hanging and waiting, carrying him, or being gathered in. */
export type RopePhase = 'none' | 'lowering' | 'hanging' | 'carrying' | 'gathering';

/** One of the family who holds a scarf: where their hands go on it, and how far out to it they are. */
export interface RopeHold {
  /** How far the hands have gone out to it, 0 to 1. */
  weight: number;
  /** While it carries him, where along the course they walk with him, so that it hangs straight down to him; else null. */
  walk: number | null;
  /** Where their lamp is set down to hold it, if the chapter says so: it stays there after. */
  lamp: { x: number; y: number; z: number } | null;
  /** Their hands' places on it, the lower and the upper, for them standing at `feet`: in the world. */
  hands(feet: Vector3, lower: Vector3, upper: Vector3): void;
}

export interface Scarves {
  readonly group: Group;
  /** Before anyone is posed, what each does now. `riding`: he is on a ride, at `x`. */
  frame(flags: ReadonlySet<string>, riding: boolean, x: number, dt: number): void;
  /** He hangs by his hands from one now. */
  readonly carrying: boolean;
  /** Where his two hands go on it now, his feet at (x, y). */
  grip(x: number, y: number, tall: number, lower: Vector3, upper: Vector3): void;
  /** For the one whose call lowers a scarf (that spot's id): what their hands do now; null if nothing. */
  holder(spot: string | undefined): RopeHold | null;
  /**
   * After the poses: from the holder's lower hand (`top`; null, the chapter's place) to his lower hand (`bottom`, while it
   * carries him). `wind`: the one wind where it hangs.
   */
  update(top: Vector3 | null, bottom: Vector3 | null, dt: number, clock: number, wind: number, still: boolean): void;
}

/** The scarves of a chapter's ropes, or null where it has none. */
export function createScarves(chapter: ChapterData): Scarves | null {
  const group = new Group();
  group.name = 'scarves';
  const made = (chapter.storm?.ropes ?? []).flatMap((rope) => {
    const ride: Ride | undefined = chapter.rides?.find((r) => r.id === rope.ride);
    // The spot that takes hold of it (once its need is met it is down and waiting), and the one whose call lowers it.
    const boarding: Spot | undefined = chapter.spots?.find((spot) => spot.ride === rope.ride);
    if (!ride || !boarding) return [];
    const drawn = band(rope.colour ?? WOOL);
    drawnWhile(drawn.mesh, false);
    group.add(drawn.mesh);
    return [{
      rope, ride, boarding, drawn,
      caller: rope.held !== undefined ? chapter.spots?.find((spot) => spot.id === rope.held) : undefined,
      nodes: Array.from({ length: NODES }, () => new Vector3()),
      last: Array.from({ length: NODES }, () => new Vector3()),
      along: new Array<number>(NODES).fill(0),
      top: new Vector3(), bottom: new Vector3(), speed: new Vector3(),
      phase: 'none' as RopePhase,
      /**
       * Seconds in the phase it is in; how much of it hangs below the hands; whether its points are laid out; time left
       * over; and whether he has taken hold of it (the holder's lamp then stays where it was set down).
       */
      since: 0, length: 0, laid: false, left: 0, taken: false,
    }];
  });
  if (made.length === 0) return null;
  type One = (typeof made)[number];
  let carrying = false;
  /** Where he is along the course, and how fast he goes along it, smoothed: for the holder walking with him. */
  let elofX = 0, elofSpeed = 0, seen = false;
  const toward = new Vector3(), taut = new Vector3();
  /** The one held now, as the last `holder` found it; what it tells the view, filled in again on each call. */
  let holding: One | null = null;
  const hold: RopeHold = {
    weight: 0, walk: null, lamp: null,
    hands(feet, lower, upper) {
      const rope = holding!.rope, z = rope.z ?? -1;
      lower.set(feet.x, rope.from.y - 0.12, z);
      upper.set(feet.x + 0.06, rope.from.y + 0.22, z - 0.1);
    },
  };

  const placeOf = (one: One, out: Vector3) => out.set(one.rope.from.x, one.rope.from.y, one.rope.z ?? -1);
  /** How long it hangs when lowered: from the hands to just over where he takes hold, and its end. */
  const fullFrom = (one: One, top: Vector3) => Math.max(1, top.y - (one.ride.from.y + HANGS_AT)) + END;

  return {
    group,
    get carrying() { return carrying; },
    frame(flags, riding, x, dt) {
      if (dt > 0 && seen) elofSpeed += ((x - elofX) / dt - elofSpeed) * Math.min(1, dt * 10);
      elofX = x;
      seen = true;
      carrying = false;
      for (const one of made) {
        const called = one.caller === undefined || flags.has(one.caller.id);
        const lowered = one.boarding.needs === undefined || flags.has(one.boarding.needs);
        const taken = flags.has(one.boarding.id);
        one.taken = taken;
        const on = riding && x >= Math.min(one.ride.from.x, one.ride.to.x) - 0.3 && x <= Math.max(one.ride.from.x, one.ride.to.x) + 0.3;
        let next: RopePhase = 'none';
        if (on) next = 'carrying';
        // Gathered in after it has carried him; a game taken up after that finds it put away.
        else if (taken) next = one.phase === 'carrying' || (one.phase === 'gathering' && one.since < GATHER) ? 'gathering' : 'none';
        else if (lowered) next = 'hanging';
        else if (called) next = 'lowering';
        if (next !== one.phase) { one.phase = next; one.since = 0; } else one.since += Math.max(0, dt);
        if (next === 'carrying') carrying = true;
      }
    },
    grip(x, y, tall, lower, upper) {
      lower.set(x, y + 1.15 * tall, 0.03);
      const one = made.find((m) => m.phase === 'carrying');
      if (one?.laid) toward.subVectors(one.nodes[0]!, lower);
      else toward.set(0, 1, 0);
      if (toward.lengthSq() < 1e-6) toward.set(0, 1, 0);
      upper.copy(lower).addScaledVector(toward.normalize(), 0.18 * tall);
    },
    holder(spot) {
      const one = made.find((m) => m.caller !== undefined && m.caller.id === spot);
      // Before it is lowered, nothing; after it has carried him and been gathered in, empty hands, the lamp where it was set.
      if (!one || (one.phase === 'none' && !one.taken)) return null;
      // Out over the railing, a hand over a hand, at the chapter's height and depth; back to the body as it is gathered in.
      hold.weight = one.phase === 'none' ? 0 : one.phase === 'lowering' ? smooth(one.since / 0.45) : one.phase === 'gathering' ? 1 - smooth(one.since / GATHER) : 1;
      // Walking with him, a little ahead of where he is, more so the faster he goes: the scarf hangs straight down to him.
      const way = Math.sign(one.ride.to.x - one.ride.from.x) || 1;
      hold.walk = one.phase === 'carrying' ? elofX + way * (0.25 + 0.3 * Math.max(0, elofSpeed * way)) : null;
      hold.lamp = one.rope.lamp ?? null;
      holding = one;
      return hold;
    },
    update(top, bottom, dt, clock, wind, still) {
      for (const one of made) {
        const show = one.phase !== 'none';
        drawnWhile(one.drawn.mesh, show);
        if (!show) { one.laid = false; continue; }
        if (top) one.top.copy(top); else placeOf(one, one.top);
        const pinned = one.phase === 'carrying' && bottom !== null;
        if (pinned) one.bottom.copy(bottom!);
        // How much of it hangs below the hands: let out as it is lowered, pulled straight by him, gathered in after.
        const full = fullFrom(one, one.top);
        let length = full;
        if (one.phase === 'lowering') length = 0.5 + (full - 0.5) * smooth(one.since / LOWER);
        else if (pinned) length = one.top.distanceTo(one.bottom) * SLACK + END;
        else if (one.phase === 'gathering') length = Math.max(0.4, one.length * (1 - smooth(one.since / GATHER)));
        if (one.phase !== 'gathering') one.length = length;
        // The end below his hands keeps its length; the rest is shared out over the points above it.
        const body = Math.max(0.04, length - END) / (NODES - 2);
        if (!one.laid || still) {
          // Laid out at once: straight down from the hands, or straight to his.
          for (let i = 0; i < NODES - 1; i++) {
            if (pinned) one.nodes[i]!.lerpVectors(one.top, one.bottom, i / (NODES - 2));
            else one.nodes[i]!.set(one.top.x, one.top.y - i * body, one.top.z);
          }
          one.nodes[NODES - 1]!.copy(one.nodes[NODES - 2]!).setY(one.nodes[NODES - 2]!.y - END);
          for (let i = 0; i < NODES; i++) one.last[i]!.copy(one.nodes[i]!);
          one.laid = true;
          one.left = 0;
        } else {
          // In fixed steps: gravity and the wind on each point, its own speed a little damped, then the lengths held.
          one.left = Math.min(one.left + Math.max(0, dt), 0.1);
          const fall = GRAVITY * STEP * STEP;
          for (; one.left >= STEP; one.left -= STEP) {
            for (let i = 1; i < NODES; i++) {
              const p = one.nodes[i]!, q = one.last[i]!;
              const vx = (p.x - q.x) * KEEP, vy = (p.y - q.y) * KEEP, vz = (p.z - q.z) * KEEP;
              q.copy(p);
              p.x += vx + wind * 1.3 * (i / (NODES - 1)) * STEP * STEP;
              p.y += vy - fall;
              p.z += vz;
            }
            for (let pass = 0; pass < 12; pass++) {
              one.nodes[0]!.copy(one.top);
              if (pinned) one.nodes[NODES - 2]!.copy(one.bottom);
              for (let i = 0; i < NODES - 1; i++) {
                const a = one.nodes[i]!, b = one.nodes[i + 1]!;
                toward.subVectors(b, a);
                const d = toward.length();
                if (d < 1e-6) continue;
                const off = (d - (i === NODES - 2 ? END : body)) / d;
                const holdA = i === 0 || (pinned && i === NODES - 2), holdB = pinned && i + 1 === NODES - 2;
                if (holdA && holdB) continue;
                if (holdA) b.addScaledVector(toward, -off);
                else if (holdB) a.addScaledVector(toward, off);
                else { a.addScaledVector(toward, off / 2); b.addScaledVector(toward, -off / 2); }
              }
            }
            one.nodes[0]!.copy(one.top);
            if (pinned) {
              one.nodes[NODES - 2]!.copy(one.bottom);
              // His weight pulls it taut: what is between the hands goes towards the straight line, sagging a little, and
              // keeps little of its swing (the hands at both ends move, and wool under a load does not wave).
              for (let i = 1; i < NODES - 2; i++) {
                const k = i / (NODES - 2);
                taut.lerpVectors(one.top, one.bottom, k);
                taut.y -= 0.03 * length * Math.sin(Math.PI * k);
                one.nodes[i]!.lerp(taut, 0.3);
                one.last[i]!.lerp(one.nodes[i]!, 0.3);
              }
            }
          }
        }
        // How far each point is from the end, for its stitches and stripes; and how fast its end goes, for the fringe.
        one.along[NODES - 1] = 0;
        for (let i = NODES - 2; i >= 0; i--) one.along[i] = one.along[i + 1]! + one.nodes[i]!.distanceTo(one.nodes[i + 1]!);
        one.speed.subVectors(one.nodes[NODES - 1]!, one.last[NODES - 1]!).divideScalar(STEP);
        one.drawn.draw(one.nodes, one.along, clock, one.speed, still);
      }
    },
  };
}
