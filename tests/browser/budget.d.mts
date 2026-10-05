import type { Tier } from '../../src/render/quality';

export const DRAW_CALLS: Record<Tier, number>;
export function withinDraws(drawCalls: number, tier?: string): boolean;
