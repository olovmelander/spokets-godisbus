/**
 * Pictures and initial markup belong in the page, not executable JavaScript. Compile the same sources used
 * by the dev previews into inert templates. Reading their markup keeps SVG parts available for animation.
 */
export function staticPresentation(memories, shell) {
  const memoryHtml = Object.entries(memories).map(([chapter, pictures]) =>
    `<template data-memory-art="${chapter}">${pictures.join('')}</template>`).join('\n');
  const shellMarkup = ['jay', 'ghost'].map((helper) =>
    `<template id="game-shell-${helper}">${shell(helper)}</template>`).join('\n');
  return {
    name: 'static-presentation',
    apply: 'build',
    enforce: 'pre',
    transformIndexHtml(html) {
      return html.replace('</body>', `${memoryHtml}\n${shellMarkup}\n</body>`);
    },
    transform(_code, id) {
      const path = id.replaceAll('\\', '/');
      if (path.endsWith('/src/ui/memory-art.ts')) return `
        export const MEMORIES = Object.fromEntries(
          Array.from(document.querySelectorAll('template[data-memory-art]'), template => [
            template.dataset.memoryArt,
            Array.from(template.content.children, picture => picture.outerHTML),
          ]),
        );`;
      if (path.endsWith('/src/ui/shell-html.ts')) return `
        export function shellHtml(helper = 'jay') {
          return document.getElementById('game-shell-' + helper).innerHTML;
        }`;
      return null;
    },
  };
}
