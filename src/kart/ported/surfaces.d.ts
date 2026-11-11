import type { MeshStandardMaterial } from 'three';
import { createRoute } from './route.js';
export const KERB_INNER: number, KERB_OUTER: number;
export const EDGE_LINE: readonly [number, number];
export interface Kerb { start: number; end: number; side: number; kind: string; inner: number; outer: number; pieces: number }
export function trackLayout(route?: ReturnType<typeof createRoute> | null): {
 length: number; corners: {start: number; end: number; apex: number; sign: number; peak: number}[];
 kerbs: Kerb[]; curvature: number[];
 kerbAt(distance: number, side: number): boolean;
 racingLine(distance: number): number;
};
export function surfaceAt(distance: number, lane: number): 'asphalt' | 'kerb' | 'grass';
export function racingLine(distance: number): number;
export const GRID_SLOTS: readonly {distance: number; lane: number}[];
export function surfaceMaterial(kind: 'asphalt' | 'grass' | 'gravel', anisotropy?: number): MeshStandardMaterial;
export function asphaltMaterial(anisotropy?: number): MeshStandardMaterial;
export function paintMaterial(): MeshStandardMaterial;
