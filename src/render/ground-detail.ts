import { Color, type MeshStandardMaterial } from 'three';
import { CANOPY, CANOPY_LAYERS } from './canopy';

/** How wide a deck board is (./dressing/ground.ts keeps the same number). */
const BOARD = 0.8;

/** What the ground is, for the detail it is given: moss and soil, rock, a road, or a floor of boards. */
export type GroundDetail = 'soft' | 'rock' | 'road' | 'wood' | 'turf';

const patched = new WeakSet<MeshStandardMaterial>();

/**
 * Whether the close detail is drawn: on Mid and High, not on Low, which is what an older phone gets (the view sets
 * it by the tier). A uniform shared by every patched material, so that a change of tier compiles nothing.
 */
export const CLOSE_DETAIL = { value: 1 };

/**
 * Sunlight through the leaves on the forest floor and the lawn (Unravel's dappled light): how strong (the view sets
 * it by the place, the day and the storm; 0 is none) and the clock it drifts by, as the crowns move in the wind.
 */
export const DAPPLE = { value: 0 };
export const DAPPLE_CLOCK = { value: 0 };

/**
 * How wet the ground is out of doors (the view sets it by the place and the storm: 1 in rain, 0 dry), and the sky
 * that wet ground gives back where it is looked along. Wet, rock and the pitch's turf shine (Unravel's rain).
 */
export const GROUND_WET = { value: 0 };
export const GROUND_SKY = { value: new Color(0, 0, 0) };

/**
 * The ground seen close (the graphics pass of 6 November 2026). Its picture is a fine grain that tiles, and its
 * colours are set at the corners of a coarse mesh, so the ground in front of the camera, which fills the lower
 * third of every picture, was one smooth smear: "it looks stretched". Unravel's ground near the camera is full of
 * things a hand's breadth across. This adds them in the shader, from where on the ground a point is, at three
 * sizes, so that nothing repeats and nothing is stretched:
 * - moss and soil: darker damp hollows, sunlit tufts, and needles and bits of leaf lying about;
 * - rock: crust lichen in pale rings, darker weathered patches and hairline cracks;
 * - a road: the stones in the asphalt, tar patches and worn lighter tracks;
 * - boards (Unravel's porch floor, after Olov's pictures): each board its own tone and its own fine grain, a
 *   knot here and there, the joints where one board ends and the next begins, dirt in the gaps and the middle
 *   of the floor worn paler where feet go;
 * - artificial turf (Olympia's pitch): its two greens in broad bands across the pitch, the stitched rows of its
 *   fibres, black rubber crumbs between them, and paler flattened patches where it is played on most.
 * Far off it fades, so that nothing shimmers; on a steep face it fades too, for the faces have their own joints.
 */
export function groundDetail(material: MeshStandardMaterial, kind: GroundDetail): void {
  if (patched.has(material)) return;
  patched.add(material);
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}:ground-detail-v9-${kind}`;
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    shader.uniforms.closeDetail = CLOSE_DETAIL;
    shader.uniforms.dapple = DAPPLE;
    shader.uniforms.dappleClock = DAPPLE_CLOCK;
    shader.uniforms.groundWet = GROUND_WET;
    shader.uniforms.groundSky = GROUND_SKY;
    shader.uniforms.canopyOn = CANOPY.on;
    shader.uniforms.canopySheet = CANOPY.sheet;
    shader.uniforms.canopyLayers = CANOPY.layers;
    shader.uniforms.canopyHigh = CANOPY.high;
    shader.uniforms.canopyBeam = CANOPY.beam;
    shader.vertexShader = 'varying vec3 groundDetailAt;\n' + shader.vertexShader.replace('#include <project_vertex>', /* glsl */ `
      groundDetailAt = (modelMatrix * vec4(transformed, 1.0)).xyz;
      #include <project_vertex>`);
    shader.fragmentShader = /* glsl */ `varying vec3 groundDetailAt;
      uniform float closeDetail, dapple, dappleClock, canopyOn, groundWet;
      uniform vec3 groundSky;
      uniform sampler2D canopySheet;
      uniform mat3 canopyLayers[${CANOPY_LAYERS}];
      uniform float canopyHigh[${CANOPY_LAYERS}];
      uniform vec2 canopyBeam;
      float groundHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float groundNoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(groundHash(i), groundHash(i + vec2(1.0, 0.0)), u.x), mix(groundHash(i + vec2(0.0, 1.0)), groundHash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      ` + shader.fragmentShader.replace('#include <normal_fragment_maps>', /* glsl */ `
      #include <normal_fragment_maps>
      if (closeDetail > 0.5) {
        vec3 groundUp = normalize(normal * mat3(viewMatrix));
        // On what lies more or less level, or slopes towards the camera; not on the steep faces.
        float groundFlat = smoothstep(0.25, 0.6, groundUp.y + 0.35 * max(groundUp.z, 0.0));
        // Laid on from above on what lies level, and from the front on what faces the camera, so that nothing is
        // drawn long down a slope.
        vec2 at = abs(groundUp.z) > abs(groundUp.y) ? groundDetailAt.xy : groundDetailAt.xz;
        // How big a length is on screen here: the detail fades where it would be finer than a few pixels.
        float groundPixel = length(fwidth(at));
        float groundNear = 1.0 - smoothstep(0.05, 0.16, groundPixel);
        float groundMid = 1.0 - smoothstep(0.12, 0.45, groundPixel);
        float big = groundNoise(at * 0.55 + 3.1);
        float mid = groundNoise(at * 2.2 + vec2(7.3, 1.9));
        float fine = groundNoise(mat2(0.8, -0.6, 0.6, 0.8) * at * 7.5);
        vec3 groundColour = diffuseColor.rgb;
        ${kind === 'soft' ? /* glsl */ `
        // Damp hollows and sunlit tufts.
        float tuft = smoothstep(0.55, 0.85, mid) * groundMid;
        float hollow = smoothstep(0.6, 0.2, mid) * groundMid;
        groundColour *= 1.0 + (big - 0.5) * 0.34;
        groundColour = mix(groundColour, groundColour * vec3(1.22, 1.2, 0.8), 0.7 * tuft);
        groundColour *= 1.0 - 0.3 * hollow;
        // Needles and bits of leaf: short dark strokes lying every way.
        vec2 needleAt = mat2(0.6, 0.8, -0.8, 0.6) * at * vec2(14.0, 3.2);
        float needle = smoothstep(0.82, 0.93, groundNoise(needleAt)) * groundNear;
        groundColour = mix(groundColour, groundColour * vec3(0.55, 0.42, 0.3), 0.55 * needle);
        float speck = smoothstep(0.8, 0.92, fine) * groundNear;
        groundColour = mix(groundColour, groundColour * 1.25 + vec3(0.02, 0.02, 0.0), 0.5 * speck);
        // Sunlight through the leaves: soft warm patches that drift slowly as the crowns sway.
        if (dapple > 0.0) {
          vec2 drift = vec2(dappleClock * 0.05, dappleClock * 0.02);
          float leaves = groundNoise(at * 0.45 + drift) * 0.6 + groundNoise(at * 1.3 - drift * 1.7 + 4.0) * 0.4;
          float sun = smoothstep(0.58, 0.72, leaves);
          groundColour *= 1.0 + dapple * sun * vec3(0.42, 0.36, 0.2);
        }
        // On High, the crowns' own flecks (./canopy.ts): where the sun comes through the leaves, as the sun's shadow
        // map has them, and as far off as the ground is seen. Softened as the shadow map softens them.
        if (canopyOn > 0.0) {
          float through = 1.0;
          for (int layer = 0; layer < ${CANOPY_LAYERS}; layer++) {
            vec2 crown = groundDetailAt.xz + canopyBeam * (canopyHigh[layer] - groundDetailAt.y);
            vec2 sheetAt = (canopyLayers[layer] * vec3(crown, 1.0)).xy;
            through *= 1.0 - smoothstep(0.3, 0.7, textureLod(canopySheet, sheetAt, 2.0).a);
          }
          groundColour *= mix(vec3(1.0), vec3(mix(0.76, 1.0, through)) + through * vec3(0.6, 0.5, 0.28), canopyOn);
        }
        ` : kind === 'rock' ? /* glsl */ `
        // Weathered patches, crust lichen in pale rings, and hairline cracks on what lies level.
        groundColour *= 1.0 + (big - 0.5) * 0.24 + (mid - 0.5) * 0.14 * groundMid;
        float lichenAt = groundNoise(at * 3.4 + 11.0);
        float lichen = smoothstep(0.66, 0.74, lichenAt) * (1.0 - smoothstep(0.78, 0.86, lichenAt)) * groundMid;
        float lichenFill = smoothstep(0.72, 0.82, lichenAt) * groundMid;
        groundColour = mix(groundColour, vec3(0.62, 0.66, 0.52) * dot(groundColour, vec3(0.33)) * 2.2, 0.25 * lichenFill + 0.22 * lichen);
        // A face of the rock towards the camera has no network of cracks drawn on it (its relief is its own shape:
        // ./dressing/ground.ts, rockRelief). Short broken cracks lie on what is level, where a second pattern lets them.
        float rockFace = 1.0 - smoothstep(0.45, 0.8, groundUp.y);
        float crack = (1.0 - smoothstep(0.0, 0.03, abs(groundNoise(at * vec2(2.2, 4.6) + 5.0) - 0.5)))
          * smoothstep(0.55, 0.75, groundNoise(at * 1.3 + 17.0)) * (1.0 - rockFace);
        groundColour *= 1.0 - 0.45 * crack * groundNear;
        groundColour *= 1.0 + (fine - 0.5) * 0.22 * groundNear;
        // The grain of the rock in its light: a roughness of a few millimetres that the low sun rakes across.
        float rockHeight = (mid * 0.045 + fine * 0.016) * groundMid;
        vec3 grainX = dFdx(-vViewPosition), grainY = dFdy(-vViewPosition);
        vec3 grainR1 = cross(grainY, normal), grainR2 = cross(normal, grainX);
        float grainDet = dot(grainX, grainR1);
        normal = normalize(abs(grainDet) * normal - sign(grainDet) * (dFdx(rockHeight) * grainR1 + dFdy(rockHeight) * grainR2));
        // Wet, it shines a little and gives back the sky where it is looked along.
        roughnessFactor = mix(roughnessFactor, 0.45 + 0.3 * fine, groundWet);
        totalEmissiveRadiance += groundSky * groundWet * pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 5.0) * 0.1;
        ` : kind === 'wood' ? /* glsl */ `
        // Boards run front to back, ${BOARD.toFixed(2)} wide (./dressing/ground.ts): which one, and where across it.
        float board = floor(at.x / ${BOARD.toFixed(2)});
        float across = fract(at.x / ${BOARD.toFixed(2)});
        float boardTone = groundHash(vec2(board, 4.1));
        groundColour *= 0.9 + 0.2 * boardTone;
        // Its grain: fine lines along it, and the long waves of the growth rings.
        float grainAt = groundNoise(vec2(across * 34.0 + board * 13.7, at.y * 0.7 + board * 5.3));
        float rings = sin((across + 0.12 * groundNoise(vec2(board * 3.1, at.y * 0.35))) * 46.0 + board * 2.0);
        groundColour *= 1.0 + ((grainAt - 0.5) * 0.24 + rings * 0.05) * groundMid;
        // Where one board ends and the next begins, a different length along each.
        float run = 5.0 + 4.0 * groundHash(vec2(board, 9.2));
        float joint = fract((at.y + groundHash(vec2(board, 1.7)) * run) / run) * run;
        groundColour *= 1.0 - 0.5 * (1.0 - smoothstep(0.0, 0.05, min(joint, run - joint))) * groundNear;
        // A knot now and then: a dark eye with the grain swirled pale round it.
        vec2 knotCell = vec2(board, floor(at.y / 2.6));
        vec2 knotAt = vec2((0.25 + 0.5 * groundHash(knotCell + 0.3)) * ${BOARD.toFixed(2)}, (0.2 + 0.6 * groundHash(knotCell + 7.1)) * 2.6);
        vec2 fromKnot = (vec2(across * ${BOARD.toFixed(2)}, at.y - knotCell.y * 2.6) - knotAt) * vec2(1.0, 0.55);
        float knotFar = length(fromKnot) / 0.075;
        float knot = step(0.72, groundHash(knotCell + 2.9)) * groundNear;
        groundColour *= 1.0 - knot * (0.55 * (1.0 - smoothstep(0.6, 1.0, knotFar)) - 0.1 * smoothstep(1.0, 1.4, knotFar) * (1.0 - smoothstep(1.4, 2.4, knotFar)));
        // Dirt in the gaps, and the edges rounded darker into them.
        float edge = min(across, 1.0 - across);
        groundColour *= 1.0 - 0.28 * (1.0 - smoothstep(0.0, 0.07, edge)) * groundMid;
        // Worn: where he walks, the boards are paler and greyer, the paint of years gone.
        float worn = (1.0 - smoothstep(0.6, 2.4, abs(at.y))) * (0.6 + 0.4 * big);
        groundColour = mix(groundColour, vec3(dot(groundColour, vec3(0.3, 0.45, 0.25))) * 1.12, 0.22 * worn);
        ` : kind === 'turf' ? /* glsl */ `
        // Artificial turf seen close: at his size its fibres are a sward of flat blades as tall as his knee, in rows
        // stitched along the pitch. Each tuft is a little its own green; seen from the front, the blades stand as
        // short strokes towards the camera, pale at their tips and dark at their feet among black rubber crumbs; and
        // here and there a patch is flattened by play. Its painted lines are painted on the blades.
        // (Laid on the ground, a blade is long towards the camera and thin along the pitch: so it stands on screen.)
        float tuftTone = groundNoise(at * vec2(12.0, 1.4) + 4.0);
        groundColour *= 0.82 + 0.32 * tuftTone * groundMid;
        float blades = groundNoise(at * vec2(55.0, 2.2) + vec2(1.4 * groundNoise(at * vec2(4.0, 0.8)), 0.0));
        groundColour *= mix(1.0, 0.72 + 0.48 * smoothstep(0.2, 0.85, blades), groundNear);
        // The stitched rows show only where they are wider than a pixel: further off they would shimmer.
        float stitch = smoothstep(0.36, 0.5, abs(fract(at.y * 8.0) - 0.5)) * (1.0 - smoothstep(0.15, 0.4, fwidth(at.y) * 8.0));
        groundColour *= 1.0 - 0.32 * stitch * groundNear;
        float crumb = smoothstep(0.8, 0.92, groundNoise(at * 29.0 + 9.0)) * groundNear * (1.0 - blades * 0.6);
        groundColour = mix(groundColour, vec3(0.012, 0.013, 0.012), 0.7 * crumb);
        float trodden = smoothstep(0.58, 0.8, big) * groundMid;
        groundColour = mix(groundColour, vec3(dot(groundColour, vec3(0.3, 0.5, 0.2))) * vec3(1.05, 1.25, 0.95), 0.25 * trodden);
        // Wet, its blades shine: smooth plastic in a film of water, the sky given back where it is looked along.
        roughnessFactor = mix(roughnessFactor, 0.45 + 0.2 * blades, groundWet * groundFlat);
        float turfAlong = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 5.0);
        totalEmissiveRadiance += groundSky * groundWet * groundFlat * turfAlong * (0.3 + 0.7 * blades) * 0.12;
        ` : /* glsl */ `
        // The stones in the asphalt, tar patches and the lighter tracks worn into it.
        groundColour *= 1.0 + (big - 0.5) * 0.18;
        float tar = smoothstep(0.62, 0.7, groundNoise(at * vec2(0.9, 2.6) + 2.0)) * groundMid;
        groundColour *= 1.0 - 0.3 * tar;
        float stone = smoothstep(0.7, 0.86, fine) * groundNear;
        groundColour = mix(groundColour, groundColour * 1.6 + vec3(0.015), 0.45 * stone);
        groundColour *= 1.0 - 0.18 * smoothstep(0.75, 0.9, groundNoise(mat2(0.8, -0.6, 0.6, 0.8) * at * 11.0)) * groundNear;
        // At his size the asphalt's gravel is pebbles, each its own grey or rust, standing a little out of the tar
        // between them, so that the low light picks them out.
        float pebbleAt = groundNoise(at * 24.0 + 3.7);
        float pebble = smoothstep(0.64, 0.8, pebbleAt) * groundNear;
        float pebbleTone = groundHash(floor(at * 24.0 + 3.7));
        groundColour = mix(groundColour, groundColour * (1.4 + 0.8 * pebbleTone) * vec3(1.0, 0.98 - 0.06 * pebbleTone, 0.95 - 0.1 * pebbleTone), 0.45 * pebble);
        float roadHeight = pebble * 0.008 + fine * 0.004 * groundNear;
        vec3 gritX = dFdx(-vViewPosition), gritY = dFdy(-vViewPosition);
        vec3 gritR1 = cross(gritY, normal), gritR2 = cross(normal, gritX);
        float gritDet = dot(gritX, gritR1);
        normal = normalize(abs(gritDet) * normal - sign(gritDet) * (dFdx(roadHeight) * gritR1 + dFdy(roadHeight) * gritR2));
        // Wet, the tar shines between them and gives back the sky where it is looked along.
        roughnessFactor = mix(roughnessFactor, 0.42 + 0.3 * pebble, groundWet * groundFlat);
        float roadAlong = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 5.0);
        totalEmissiveRadiance += groundSky * groundWet * groundFlat * roadAlong * (1.0 - pebble) * 0.12;
        `}
        diffuseColor.rgb = mix(diffuseColor.rgb, groundColour, groundFlat);
        ${kind === 'rock' ? /* glsl */ `
        // A face of rock towards the camera, below the path (one that runs back from it is broken in courses: cliffJoints).
        float rockSteep = (1.0 - smoothstep(0.45, 0.8, groundUp.y)) * smoothstep(0.3, 0.6, abs(groundUp.z));
        if (rockSteep > 0.01) {
          vec2 faceAt = groundDetailAt.xy;
          vec3 faceColour = diffuseColor.rgb;
          // The granite's speckled picture is half as strong: seen from where he stands its grain is fine, and its
          // lichen, its stains and its streaks are what show.
          #ifdef USE_COLOR
            faceColour = mix(faceColour, vColor.rgb * diffuse * 0.84 * (1.0 + (big - 0.5) * 0.24), 0.45);
          #endif
          // Rain runs off in dark streaks, as it does down Nordic granite: long, narrow and nearly black where water
          // runs most, and a few broader grey ones.
          float runs = smoothstep(0.3, 0.62, groundNoise(faceAt * vec2(0.55, 0.32) + 8.0));
          float streak = smoothstep(0.58, 0.84, groundNoise(faceAt * vec2(3.4, 0.24) + 3.0)) * runs;
          float broad = smoothstep(0.6, 0.8, groundNoise(faceAt * vec2(1.1, 0.16) + 21.0)) * (1.0 - runs * 0.5);
          faceColour = mix(faceColour, faceColour * vec3(0.3, 0.32, 0.37), 0.75 * streak * groundMid);
          faceColour = mix(faceColour, faceColour * vec3(0.66, 0.68, 0.74), 0.5 * broad);
          // The sheets granite splits into: a dark, level, wavering joint every length or so, broken here and there.
          float sheetAt = faceAt.y * 0.92 + 0.55 * groundNoise(vec2(faceAt.x * 0.3, 3.0)) + 0.12 * groundNoise(faceAt * vec2(1.4, 0.7));
          float sheetEdge = abs(fract(sheetAt) - 0.5) * 2.0;
          float sheetLine = smoothstep(0.88 - fwidth(sheetAt) * 2.0, 0.97, sheetEdge) * smoothstep(0.35, 0.55, groundNoise(faceAt * vec2(0.45, 0.6) + 13.0));
          faceColour = mix(faceColour, faceColour * vec3(0.22, 0.23, 0.27), 0.85 * sheetLine * groundMid);
          // Rust where iron in the rock weathers out, in a few soft stains.
          float rust = smoothstep(0.66, 0.86, groundNoise(faceAt * vec2(0.9, 0.5) + 31.0));
          faceColour = mix(faceColour, faceColour * vec3(1.25, 0.95, 0.7), 0.4 * rust);
          diffuseColor.rgb = mix(diffuseColor.rgb, faceColour, rockSteep);
        }` : ''}
        ${kind === 'soft' ? /* glsl */ `
        // A steep bank of moss and soil, seen from the side or the front: the earth shows through the moss in
        // patches, small stones sit in it, roots run down it, and its foot is darker and damp.
        float groundSteep = 1.0 - groundFlat;
        if (groundSteep > 0.01) {
          vec2 bank = vec2(abs(groundUp.x) > abs(groundUp.z) ? groundDetailAt.z : groundDetailAt.x, groundDetailAt.y);
          float bankPixel = length(fwidth(bank));
          float bankNear = 1.0 - smoothstep(0.03, 0.12, bankPixel);
          vec3 bankColour = diffuseColor.rgb * (0.82 + 0.3 * groundNoise(bank * vec2(0.8, 1.6) + 2.0));
          // The earth is earth beside what it shows through: on a dark bank of peat or humus it is no paler than the
          // bank, or its patches stood out over it like a camouflage.
          float soil = smoothstep(0.45, 0.72, groundNoise(bank * vec2(1.1, 2.4) + 13.0));
          float bankLight = clamp(dot(bankColour, vec3(0.3, 0.6, 0.1)) / 0.1, 0.3, 1.0);
          bankColour = mix(bankColour, vec3(0.16, 0.11, 0.07) * bankLight * (0.8 + 0.4 * groundNoise(bank * 9.0)), 0.65 * soil);
          float stone = smoothstep(0.78, 0.86, groundNoise(bank * vec2(4.2, 5.0) + 31.0)) * bankNear;
          bankColour = mix(bankColour, bankColour * 1.35 + vec3(0.02), 0.5 * stone);
          float root = (1.0 - smoothstep(0.0, 0.04, abs(groundNoise(vec2(bank.x * 3.0, bank.y * 0.6) + 7.0) - 0.5)))
            * smoothstep(0.45, 0.7, groundNoise(bank * 0.9 + 21.0)) * bankNear;
          bankColour = mix(bankColour, vec3(0.2, 0.14, 0.09), 0.7 * root);
          bankColour *= 1.0 + (fine - 0.5) * 0.25 * bankNear;
          diffuseColor.rgb = mix(diffuseColor.rgb, bankColour, groundSteep);
        }` : ''}
      }`);
  };
  material.needsUpdate = true;
}
