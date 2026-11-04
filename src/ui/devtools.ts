/**
 * What only ?debug and ?bench use: a chunk of its own, fetched only by a session that asks for it, so that the
 * players' first download does not carry it (scripts/size-gate.mjs counts it apart from the boot JavaScript).
 */
export { createBench } from './bench';
export { createDebug } from './debug';
