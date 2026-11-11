import type { Box3, CatmullRomCurve3, Vector3 } from 'three';
export interface RouteSample { position: Vector3; tangent: Vector3; right: Vector3; angle: number; pitch: number; roll: number }
export interface Route {
  sample(distance: number, lane?: number): RouteSample;
  curvature(distance: number): number;
  length: number;
  curve: CatmullRomCurve3;
  scale: number;
  planToWorld(x: number, y: number): Vector3;
  bounds: Box3;
  distanceToRoad(x: number, z: number): number;
  terrainHeight(x: number, z: number): number;
  surfaceAt?(distance: number, lane: number): 'asphalt' | 'kerb' | 'grass';
}
export const TRACK_SOURCE: string;
export const TRACK_LENGTH: number;
export const ROAD_HALF_WIDTH: number;
export const TRACK_PLAN: readonly (readonly [number, number])[];
export function terrainHeight(x: number, z: number): number;
export function createRoute(): Route;
