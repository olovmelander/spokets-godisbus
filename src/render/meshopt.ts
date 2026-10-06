import baseWasm from './meshopt/decoder-base.wasm?url';
import simdWasm from './meshopt/decoder-simd.wasm?url';

/**
 * The decoder for the packs' meshopt-compressed meshes (plan §6.6): meshoptimizer's own WebAssembly and the few lines
 * that drive it (MIT, by Arseny Kapoulkine; after three's examples/jsm/libs/meshopt_decoder.module.js). Three's copy
 * carries the WebAssembly inside its script, 16 KB of the game's 450 KB (plan §6.12, gate 2); here it is a file of its
 * own, fetched with the packs (scripts/meshopt-wasm.mjs writes it from three's copy).
 */
type Exports = Record<string, (...args: number[]) => number> & { memory: WebAssembly.Memory };

/** A tiny module that only validates where WebAssembly SIMD works: there the faster build is used. */
const SIMD_PROBE = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 3, 2, 0, 0, 5, 3, 1, 0, 1, 12, 1, 0,
  10, 22, 2, 12, 0, 65, 0, 65, 0, 65, 0, 252, 10, 0, 0, 11, 7, 0, 65, 0, 253, 15, 26, 11]);
const FILTERS: Record<string, string> = {
  NONE: '', OCTAHEDRAL: 'meshopt_decodeFilterOct', QUATERNION: 'meshopt_decodeFilterQuat',
  EXPONENTIAL: 'meshopt_decodeFilterExp', COLOR: 'meshopt_decodeFilterColor',
};
const DECODERS: Record<string, string> = {
  ATTRIBUTES: 'meshopt_decodeVertexBuffer', TRIANGLES: 'meshopt_decodeIndexBuffer', INDICES: 'meshopt_decodeIndexSequence',
};

/** Which build this browser fetches. */
export const meshoptUrl = () => (WebAssembly.validate(SIMD_PROBE) ? simdWasm : baseWasm);

function decode(exports: Exports, mode: string, filter: string | undefined, target: Uint8Array, count: number, size: number,
  source: Uint8Array): void {
  const sbrk = exports.sbrk!;
  const count4 = (count + 3) & ~3;
  const tp = sbrk(count4 * size);
  const sp = sbrk(source.length);
  const heap = new Uint8Array(exports.memory.buffer);
  heap.set(source, sp);
  const result = exports[DECODERS[mode]!]!(tp, count, size, sp, source.length);
  const filtered = FILTERS[filter ?? 'NONE'];
  if (result === 0 && filtered) exports[filtered]!(tp, count4, size);
  target.set(heap.subarray(tp, tp + count * size));
  sbrk(tp - sbrk(0));
  if (result !== 0) throw new Error(`Malformed buffer data: ${result}`);
}

/** For GLTFLoader.setMeshoptDecoder. `load` fetches the WebAssembly the first time a mesh needs it. */
export function createMeshoptDecoder(load: (url: string) => Promise<ArrayBuffer>) {
  let exports: Exports | null = null;
  let started: Promise<void> | null = null;
  const start = () => started ??= load(meshoptUrl())
    .then((bytes) => WebAssembly.instantiate(bytes, {}))
    .then(({ instance }) => {
      exports = instance.exports as unknown as Exports;
      exports.__wasm_call_ctors!();
    });
  return {
    supported: typeof WebAssembly === 'object',
    get ready() { return start(); },
    /** The packs are few and small: no workers. */
    useWorkers() {},
    decodeVertexBuffer(target: Uint8Array, count: number, size: number, source: Uint8Array, filter?: string) {
      decode(exports!, 'ATTRIBUTES', filter, target, count, size, source);
    },
    decodeIndexBuffer(target: Uint8Array, count: number, size: number, source: Uint8Array) {
      decode(exports!, 'TRIANGLES', undefined, target, count, size, source);
    },
    decodeIndexSequence(target: Uint8Array, count: number, size: number, source: Uint8Array) {
      decode(exports!, 'INDICES', undefined, target, count, size, source);
    },
    decodeGltfBuffer(target: Uint8Array, count: number, size: number, source: Uint8Array, mode: string, filter?: string) {
      decode(exports!, mode, filter, target, count, size, source);
    },
    decodeGltfBufferAsync(count: number, size: number, source: Uint8Array, mode: string, filter?: string) {
      return start().then(() => {
        const target = new Uint8Array(count * size);
        decode(exports!, mode, filter, target, count, size, source);
        return target;
      });
    },
  };
}
