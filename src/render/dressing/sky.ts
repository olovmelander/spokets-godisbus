import { BufferGeometry, Color, Float32BufferAttribute, Mesh, MeshBasicMaterial, Points, ShaderMaterial, type CanvasTexture, type Texture } from 'three';
import { drawn, sequence, type PlaceLook } from './kit';

// --- L0: the backdrop ------------------------------------------------------------------------------------

/**
 * A sky in the scene follows the same grade and output as everything under it. three's native background
 * bypasses the material patch on Low. This replaces its one draw, fills every camera/aspect, and leaves
 * the depth buffer at the far plane so stars and transparent distant layers still stand in front of it.
 */
export function createSky(map: Texture | null, colour: Color): Mesh<BufferGeometry, MeshBasicMaterial> {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  geometry.setAttribute('uv', new Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const material = new MeshBasicMaterial({ map, color: map ? 0xffffff : colour, fog: false, depthTest: false, depthWrite: false });
  material.customProgramCacheKey = () => 'place-sky-v1';
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
      #include <project_vertex>
      gl_Position = vec4(position.xy, 1.0, 1.0);
    `);
  };
  const sky = new Mesh(geometry, material);
  sky.name = 'place-sky';
  sky.frustumCulled = false;
  sky.renderOrder = -1000;
  return sky;
}

/**
 * Where the sun is in the picture at all, it is a veiled disc inside its glow: low over the bog in the late
 * afternoon, and lower still from the mountain at the golden hour, where the far ridges pass in front of it.
 * `x` and `y` are its place from the picture's left and top (0 to 1), `wide` its width as a part of the
 * picture's height (1.3 degrees of the camera's 30 is 0.043). Elsewhere the sun stands too high to be seen,
 * or has set, and there is no moon: it would fight the northern lights.
 */
const SUNS: Partial<Record<PlaceLook['id'], { x: number; y: number; wide: number; colour: [number, number, number] }>> = {
  bog: { x: 0.33, y: 0.325, wide: 0.05, colour: [255, 252, 238] },
  mountain: { x: 0.31, y: 0.37, wide: 0.055, colour: [255, 244, 214] },
};

/** The sky's picture: twice as wide as it is tall, as a screen is, so that a small sun has texels enough. */
const WIDE = 512;
const TALL = 256;

/** The sky that is up is drawn again when the window changes shape: the picture is stretched over it. */
let again: (() => void) | null = null;
if (typeof window !== 'undefined') window.addEventListener('resize', () => again?.());

export function backdrop(look: PlaceLook): CanvasTexture {
  const sun = SUNS[look.id];
  const paint = (c: CanvasRenderingContext2D) => {
    const down = c.createLinearGradient(0, 0, 0, TALL);
    down.addColorStop(0, look.sky.top);
    down.addColorStop(0.42, look.sky.middle);
    down.addColorStop(0.7, look.sky.middle);
    down.addColorStop(1, look.sky.bottom);
    c.fillStyle = down;
    c.fillRect(0, 0, WIDE, TALL);
    // Where the sun stands behind the trees: a wide soft glow, up to the left.
    c.save();
    c.scale(WIDE / 256, TALL / 256);
    const glow = c.createRadialGradient(70, 95, 4, 70, 95, 170);
    glow.addColorStop(0, look.sky.glow);
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = glow;
    c.fillRect(0, 0, 256, 256);
    c.restore();
    if (!sun) return;
    // The disc, squashed by the window's shape so that it is round on the screen. Its edge is soft, and a
    // little of its light lies round it: a sun seen through haze.
    const shape = window.innerWidth / Math.max(1, window.innerHeight);
    const r = (sun.wide / 2) * TALL;
    c.save();
    c.translate(sun.x * WIDE, sun.y * TALL);
    c.scale(WIDE / TALL / shape, 1);
    const [red, green, blue] = sun.colour;
    const disc = c.createRadialGradient(0, 0, 0, 0, 0, r * 3);
    disc.addColorStop(0, `rgba(${red},${green},${blue},1)`);
    disc.addColorStop(0.29, `rgba(${red},${green},${blue},1)`);
    disc.addColorStop(0.39, `rgba(${red},${green},${blue},0.4)`);
    disc.addColorStop(1, `rgba(${red},${green},${blue},0)`);
    c.fillStyle = disc;
    c.fillRect(-r * 3, -r * 3, r * 6, r * 6);
    c.restore();
  };
  const texture = drawn(WIDE, TALL, paint);
  again = sun ? () => {
    paint((texture.image as HTMLCanvasElement).getContext('2d')!);
    texture.needsUpdate = true;
  } : null;
  return texture;
}

/**
 * The first stars, separate from the stretched sky gradient. Point sprites are square in framebuffer
 * pixels, so each soft circle stays round in portrait, landscape and every graphics tier. They sit at
 * the far depth, before the transparent hills: rock, people, clouds and ridges still hide them.
 */
export function stars(): Points {
  const next = sequence(19);
  const positions: number[] = [];
  const sizes: number[] = [];
  const lights: number[] = [];
  for (let i = 0; i < 110; i++) {
    lights.push(0.35 + next() * 0.6);
    sizes.push(1.6 + next() * 1.5);
    positions.push(next() * 2 - 1, 1 - next() ** 1.6 * (300 / 256), 0);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('size', new Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('light', new Float32BufferAttribute(lights, 1));
  const material = new ShaderMaterial({
    uniforms: { pixelRatio: { value: 1 }, colour: { value: new Color('#fffcf0') } },
    vertexShader: /* glsl */ `
      attribute float size;
      attribute float light;
      uniform float pixelRatio;
      varying float brightness;
      void main() {
        gl_Position = vec4(position.xy, 1.0, 1.0);
        gl_PointSize = size * pixelRatio;
        brightness = light;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 colour;
      varying float brightness;
      void main() {
        float round = 1.0 - smoothstep(0.2, 0.5, length(gl_PointCoord - vec2(0.5)));
        if (round < 0.01) discard;
        gl_FragColor = vec4(colour, round * brightness);
        #include <colorspace_fragment>
      }
    `,
    transparent: true, depthWrite: false, toneMapped: false,
  });
  const points = new Points(geometry, material);
  points.name = 'dusk-stars';
  points.frustumCulled = false;
  points.renderOrder = -4;
  points.onBeforeRender = (renderer) => { material.uniforms.pixelRatio!.value = renderer.getPixelRatio(); };
  return points;
}
