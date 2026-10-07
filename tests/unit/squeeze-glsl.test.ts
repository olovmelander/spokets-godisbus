import { ShaderChunk, ShaderLib } from 'three';
import { describe, expect, it } from 'vitest';
import { squeezeGlsl, squeezeShaders } from '../../scripts/squeeze-glsl.mjs';

/** What the compiler reads: the tokens of each line, without comments, and which lines are the preprocessor's. */
function tokens(glsl: string): string[] {
  return glsl.replace(/\/\*[\s\S]*?\*\//g, ' ').split('\n').map((line) => line.replace(/\/\/.*$/, '').trim())
    .filter(Boolean).flatMap((line) => (line.startsWith('#') ? [`${line.replace(/\s+/g, ' ')}⏎`] : line.split(/\s+/)));
}

describe('shaders without padding', () => {
  it('leave every chunk and library shader of three with the same tokens and preprocessor lines', () => {
    const all = [...Object.values(ShaderChunk), ...Object.values(ShaderLib).flatMap((lib) => [lib.vertexShader, lib.fragmentShader])];
    expect(all.length).toBeGreaterThan(150);
    let before = 0, after = 0;
    for (const glsl of all as string[]) {
      const squeezed = squeezeGlsl(glsl);
      expect(tokens(squeezed)).toEqual(tokens(glsl));
      // An include is still found where three looks for it: at the start of a line.
      expect(squeezed.match(/^[ \t]*#include +<[\w\d./]+>/gm)?.length ?? 0).toBe(glsl.match(/^[ \t]*#include +<[\w\d./]+>/gm)?.length ?? 0);
      before += glsl.length; after += squeezed.length;
    }
    expect(after).toBeLessThan(before * 0.99);
  });

  it('keep the line break or space at each end, which what it is joined to may need', () => {
    expect(squeezeGlsl('\n      if (a) {\n        b(); // why\n      }\n      ') + '#include <x>').toBe('\nif (a) {\nb();\n}\n#include <x>');
    expect('uniform float' + squeezeGlsl(' x;  ')).toBe('uniform float x; ');
    expect(squeezeGlsl('a; /* see // here */\n  b; // gone')).toBe('a; /* see // here */\nb;');
    expect(squeezeGlsl('  \n  ')).toBe('\n');
  });

  it('keeps Windows shader literals on separate preprocessor lines when joined to an include', () => {
    const shader = '\r\n  #ifdef USE_INSTANCING\r\n    transformed.x += 1.0;\r\n  #endif\r\n  ';
    const joined = '#endif' + squeezeGlsl(shader) + '#include <project_vertex>';
    expect(joined).toBe('#endif\n#ifdef USE_INSTANCING\ntransformed.x += 1.0;\n#endif\n#include <project_vertex>');
    expect(tokens(joined)).toEqual(tokens('#endif' + shader + '#include <project_vertex>'));
  });

  it('squeeze three\'s quoted chunks and literals marked glsl, keeping the comments of one with script in it', () => {
    const three = 'var a_fragment = "#ifdef A\\n\\tfoo(); // c\\n#endif";\nvar name = "plain";';
    expect(squeezeShaders(three, '/x/node_modules/three/build/three.module.js')).toBe('var a_fragment = "#ifdef A\\nfoo();\\n#endif";\nvar name = "plain";');
    expect(squeezeShaders(three, '/x/src/other.js')).toBeNull();
    const ours = 'const s = /* glsl */ `\n    float f; // c\n    `;\nconst t = /* glsl */ `\n  a; // ${1}\n`;';
    expect(squeezeShaders(ours, '/x/src/render/a.ts')).toBe('const s = /* glsl */`\nfloat f;\n`;\nconst t = /* glsl */`\na; // ${1}\n`;');
  });
});
