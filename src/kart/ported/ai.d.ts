import type { Driver, DriverInput, Track, TrackEnvironment } from './physics.js';
export interface Difficulty { pace: number; power: number; consistency: number; reaction: number; catchup: number }
export interface RivalProfile { name: string; full: string; color: number; pace: number; aggression: number; consistency: number; reaction: number }
export interface RacingLine {
  length: number; spacing: number; lane: Float64Array; curvature: Float64Array; edge: number; env: TrackEnvironment;
  laneAt(distance: number): number; curvatureAt(distance: number): number;
}
export interface SpeedProfile { speeds: Float64Array; spacing: number; at(distance: number): number }
export interface Brain {
  profile: RivalProfile; level: Difficulty; random(): number; pace: number; consistency: number;
  aggression: number; power: number; speeds: SpeedProfile; reaction: number; phase: number;
  mistake: {kind: string; time: number; side: number} | null;
  mistakeClock: number; side: number; sideClock: number; defendClock: number; defend?: number; catchup: number;
}
export const DIFFICULTIES: Readonly<Record<'easy' | 'normal' | 'hard', Readonly<Difficulty>>>;
export const RIVAL_PROFILES: readonly Readonly<RivalProfile>[];
export function seededRandom(seed?: number): () => number;
export function buildRacingLine(track: Track, options?: {spacing?: number; edge?: number; iterations?: number; shortcut?: number}): RacingLine;
export function speedProfile(line: RacingLine, options?: {lateral?: number; brake?: number; top?: number}): SpeedProfile;
export function pursuitSteer(driver: Driver, targetLane: number, look: number, track: Track | TrackEnvironment): number;
export function createBrain(profile: RivalProfile, options: {line: RacingLine; difficulty?: 'easy' | 'normal' | 'hard'; seed?: number}): Brain;
export function catchupFactor(rivalDistance: number, playerDistance: number, strength?: number): number;
export function rivalInput(driver: Driver, brain: Brain, options: {line: RacingLine; track: Track | TrackEnvironment; drivers: readonly Driver[]; dt?: number; cooldown?: boolean}): DriverInput;
