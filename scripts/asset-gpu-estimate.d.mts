export interface FileEstimate {
  geometryBytes: number; meshoptDecodedBytes: number; imageRgbaBytes: number; derivedTextureBytes: number;
  textureBytes: number; imageAllocations: number; maxTextureEdge: number; totalBytes: number;
}
export interface PackEstimate {
  geometryBytes: number; textureBytes: number; maxTextureEdge: number; totalBytes: number;
  files: Record<string, FileEstimate>;
}
export interface TierEstimate {
  width: number; height: number; assetBytes: number; canvasBytes: number; renderTargetBytes: number;
  knownProceduralTextureBytes: number; knownBytes: number; knownMB: number; knownMiB: number; budgetBytes: number;
}
export const PIXEL_CAPS: Record<'low' | 'mid' | 'high', number>;
export const GPU_BUDGETS: Record<'low' | 'mid' | 'high', number>;
export const HIGH_TARGET_BUDGET: number;
export const REFERENCE_VIEWPORT: { width: number; height: number; devicePixelRatio: number };
export function estimateKtx2(bytes: Buffer): { rgbaMipBytes: number; maxTextureEdge: number; declaredLevels: number; estimatedLevels: number };
export function estimateGlb(bytes: Buffer): FileEstimate;
export function totalEstimates(files: Record<string, FileEstimate>): PackEstimate;
export function estimateBuild(packs: Record<string, PackEstimate>): {
  kind: string; unit: string; referenceViewport: typeof REFERENCE_VIEWPORT; methodology: string; limitations: string;
  commonPacks: string[]; loadGroups: Record<string, { packs: string[]; assetBytes: number; tiers: Record<'low' | 'mid' | 'high', TierEstimate> }>;
};
