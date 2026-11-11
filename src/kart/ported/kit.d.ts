import type { BufferGeometry, Color, ColorRepresentation, Group, Material, Matrix4, Mesh, CanvasTexture } from 'three';
import { createRoute } from './route.js';
type Route = ReturnType<typeof createRoute>;
type XYZ = readonly [number, number, number] | number[];
export interface Batch {
  add(geometry: BufferGeometry, material: Material, at?: XYZ, rotation?: XYZ, size?: XYZ | number, color?: ColorRepresentation | null, parent?: Matrix4 | null): Batch;
  addMatrix(geometry: BufferGeometry, material: Material, matrix: Matrix4, color?: ColorRepresentation | null): Batch;
  build(parent: Group, options?: {castShadow?: boolean; receiveShadow?: boolean; name?: string}): Mesh[];
}
export function createBatch(): Batch;
export function trackRibbon(route: Route, options: {from: number; to: number; start?: number; end?: number; step?: number; columns?: number; lift?: number | ((distance: number, lane: number) => number); track?: ((distance: number, lane: number) => number) | null; color?: ((distance: number, lane: number) => number | Color) | null}): BufferGeometry;
export function createClearance(route: Route): (x: number, z: number, distance: number, min: number, skip?: number) => boolean;
export function faceTrack(sample: {angle: number}, lane: number): number;
export function canvasTexture(width: number, height: number, draw: (context: CanvasRenderingContext2D, width: number, height: number) => void, options?: {anisotropy?: number; srgb?: boolean}): CanvasTexture;
export function atlasPlane(width: number, height: number, rect: readonly [number, number, number, number]): BufferGeometry;
