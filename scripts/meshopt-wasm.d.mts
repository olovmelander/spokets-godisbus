/** The two builds of meshoptimizer's decoder that three carries inside a script, as WebAssembly bytes. */
export function meshoptBuilds(source?: string): { base: Uint8Array; simd: Uint8Array };
