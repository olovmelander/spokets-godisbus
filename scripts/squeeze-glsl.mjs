// Shader source as the GPU needs it, for the script's size gate (scripts/size-gate.mjs): without indentation,
// blank lines or line comments. Used by the build (vite.config.ts); the dev server serves shaders as written.

/**
 * Only whole lines are touched, so the preprocessor's lines stay lines; a line with a block comment keeps its
 * line comment too. Its ends stay as they were, a line break or a space: what it is joined to may need it
 * (`#include` must start a line).
 */
export function squeezeGlsl(glsl, comments = true) {
  const end = (gap, edge) => (gap.test(glsl) ? '\n' : edge.test(glsl) ? ' ' : '');
  const core = glsl.split('\n')
    .map((line) => (comments && !line.includes('/*') && !line.includes('*/') ? line.replace(/\/\/.*$/, '') : line).trim())
    .filter((line) => line !== '').join('\n');
  return core === '' ? end(/\n/, /\s/) : end(/^[ \t]*\n/, /^\s/) + core + end(/\n[ \t]*$/, /\s$/);
}

/**
 * A module's shaders squeezed, or null where it has none: three's shader chunks, which it ships as quoted
 * strings, and every template literal marked glsl, as three's add-ons and ours are. A literal with `${...}`
 * in it keeps its comments: what is inside the braces is script, not GLSL.
 */
export function squeezeShaders(code, id) {
  let out = code;
  if (/three\/build\/three\.module\.js$/.test(id)) {
    out = out.replace(/^((?:var|const) [\w$]+ = )("(?:[^"\\\n]|\\.)*");$/gm, (whole, head, quoted) => {
      const glsl = JSON.parse(quoted);
      return glsl.includes('\n') ? `${head}${JSON.stringify(squeezeGlsl(glsl))};` : whole;
    });
  }
  out = out.replace(/\/\* glsl \*\/\s*`((?:[^`\\]|\\.)*)`/g, (_, body) => `/* glsl */\`${squeezeGlsl(body, !body.includes('${'))}\``);
  return out === code ? null : out;
}
