import { vi } from 'vitest';

/** Geometry tests need a canvas surface, not pixel rasterization. The browser art suite paints the real paths. */
export function stubCanvas(): void {
  const context = Object.fromEntries([
    'fillRect', 'clearRect', 'beginPath', 'lineTo', 'moveTo', 'closePath', 'fill', 'stroke',
    'arc', 'ellipse', 'translate', 'scale', 'rotate', 'save', 'restore', 'clip', 'quadraticCurveTo', 'bezierCurveTo',
  ].map(name => [name, () => {}]));
  context.createLinearGradient = () => ({ addColorStop() {} });
  vi.stubGlobal('Path2D', class {});
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => context }) });
}
