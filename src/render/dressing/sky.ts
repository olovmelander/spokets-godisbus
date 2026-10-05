import { BufferGeometry, Color, Float32BufferAttribute, Points, ShaderMaterial, type CanvasTexture } from 'three';
import { drawn, sequence, type PlaceLook } from './kit';

// --- L0: the backdrop ------------------------------------------------------------------------------------

export function backdrop(look: PlaceLook): CanvasTexture {
  return drawn(256, 256, (c) => {
    const down = c.createLinearGradient(0, 0, 0, 256);
    down.addColorStop(0, look.sky.top);
    down.addColorStop(0.42, look.sky.middle);
    down.addColorStop(0.7, look.sky.middle);
    down.addColorStop(1, look.sky.bottom);
    c.fillStyle = down;
    c.fillRect(0, 0, 256, 256);
    // Where the sun stands behind the trees: a wide soft glow, up to the left.
    const glow = c.createRadialGradient(70, 95, 4, 70, 95, 170);
    glow.addColorStop(0, look.sky.glow);
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = glow;
    c.fillRect(0, 0, 256, 256);
  });
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
