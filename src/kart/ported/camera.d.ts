import type { PerspectiveCamera, Vector3 } from 'three';
import { createRoute } from './route.js';
export const CAMERA_VIEWS: readonly string[];
export function chaseRig(aspect: number, speed?: number, reducedMotion?: boolean): {distance: number; height: number; ahead: number; fov: number; follow: number; peek: number; aim: number};
export interface CameraDriver {distance: number; lane: number; speed: number; heading: number; surface?: string; hit?: number; u?: number; longAccel?: number}
export function createKartCamera(camera: PerspectiveCamera, track: ReturnType<typeof createRoute>, options?: {reducedMotion?: boolean; view?: string}): {
 reset(): void; readonly view: string; setView(next: string): string; toggleView(): string; shake(amount: number): void;
 update(driver: CameraDriver, state: string, dt: number, time: number, shakeImpulse?: number): Vector3;
};
