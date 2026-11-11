export type Surface = 'asphalt' | 'kerb' | 'grass';
export interface Track {
  length: number;
  curvature(distance: number): number;
  surfaceAt?(distance: number, lane: number): Surface;
}
export interface TrackEnvironment {
  readonly __isEnv?: true;
  length: number;
  curvature(distance: number): number;
  surface(distance: number, lane: number): Surface;
  track?: Track;
}
export interface DriverInput {
  steer?: number; throttle?: number | boolean; brake?: number | boolean;
  reverse?: boolean; slipstream?: number;
  /** Elof's optional arcade extension; omitted inputs retain the source handling. */
  drift?: boolean; boost?: number; recover?: boolean; arcade?: boolean;
}
export interface Driver {
  distance: number; lane: number; heading: number; yawRate: number; steerAngle: number;
  u: number; w: number; speed: number; lateral: number; slip: number; frontSlip: number;
  wheelspin: number; surface: Surface; skidding: boolean; hit: number; grip: number;
  slipstream: number; finishTime: number | null; rumble: number; bump: number;
  wallContact: boolean; held: boolean; launchPenalty: number; atWall: boolean;
  assist: number; mass: number; longAccel: number; latAccel: number;
  throttle: number; brake: number; contact: number; stuck: number;
  reverseWait: number; reversing: boolean; driftGrip: number; recoveryTime: number;
  frozen?: boolean; ghost?: boolean;
}
export type ContactEvent = { type: 'barrier'; driver: Driver; speed: number } | { type: 'contact'; a: Driver; b: Driver; speed: number };
export const LAPS: number, TRACK_HALF_WIDTH: number, WALL_LANE: number, TOP_SPEED: number, GRIP_ACCELERATION: number, GRAVITY: number;
export const WHEELBASE: number, SUBSTEP: number, ASSIST: number, REVERSE_TOP: number;
export const KART: Readonly<{ mass: number; inertia: number; front: number; rear: number; height: number; halfWidth: number; halfLength: number; axleTrack: number }>;
export const SURFACES: Readonly<Record<Surface, Readonly<{grip: number; roll: number; rollSpeed: number; bump: number; rumble: number}>>>;
export function clamp(value: number, min: number, max: number): number;
export function steeringFromButtons(left: boolean, right: boolean): number;
export function laneSurface(lane: number, curvature?: number): Surface;
export function newDriver(distance?: number, lane?: number, options?: {assist?: number; mass?: number}): Driver;
export function cornerSpeed(curvature: number): number;
export function trackGap(a: number, b: number, trackLength: number): number;
export function slipstreamFactor(driver: Driver, opponents: readonly Driver[], trackLength: number): number;
export function steerLimit(speed: number): number;
export function steerRate(speed: number): number;
export function slideAngle(driver: Driver): number;
export function trackEnv(track?: Track | TrackEnvironment | number): TrackEnvironment;
export function stepField(drivers: Driver[], inputs: DriverInput[], track: Track | TrackEnvironment | number, dt: number, options?: {contacts?: boolean}): ContactEvent[];
export function stepDriver(driver: Driver, input: DriverInput, track: Track | TrackEnvironment | number, dt: number): {barrier: boolean};
export function resolveContact(a: Driver, b: Driver, length: number, events?: ContactEvent[]): boolean;
export function markFinish(driver: Driver, previousDistance: number, totalDistance: number, elapsed: number, dt: number): void;
export function raceStandings<T extends Driver>(drivers: readonly T[]): T[];
export function racePosition(distance: number, opponents: readonly Driver[]): number;
export function raceScore(position: number, seconds: number, incidents?: number): number;
export function engineFeedback(speed: number, input?: {throttle?: boolean; brake?: boolean; active?: boolean}): {frequency: number; gain: number};
export function formatTime(seconds: number): string;
export function formatDelta(seconds: number): string;
