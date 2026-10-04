/** The optional mountain toy is remembered at the party (plan §4.8, O8). */
export function cobbleMemory(flags: Record<string, readonly string[]>): string[] {
  return flags.berget?.some((flag) => /^note:[1-5]$/.test(flag)) ? ['heard:cobbles'] : [];
}
