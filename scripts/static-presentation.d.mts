import type { Plugin } from 'vite';

export function staticPresentation(memories: Record<string, string[]>, shell: (helper: 'jay' | 'ghost') => string): Plugin;
