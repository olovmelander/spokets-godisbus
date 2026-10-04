import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import { estimateBuild, estimateGlb, estimateKtx2, GPU_BUDGETS, HIGH_TARGET_BUDGET, PIXEL_CAPS, totalEstimates } from '../../scripts/asset-gpu-estimate.mjs';
import { GPU_LIMIT, HIGH_TARGET_LIMIT } from '../../src/render/gpu-memory';
import { PIXEL_CAP } from '../../src/render/quality';

function glb(json: object, binary: Buffer = Buffer.alloc(0)): Buffer {
  const text = Buffer.from(JSON.stringify({ asset: { version: '2.0' }, buffers: [{ byteLength: binary.length }], ...json }));
  const header = Buffer.alloc(20);
  const encoded = Buffer.alloc(Math.ceil(text.length / 4) * 4, 32); text.copy(encoded);
  const bin = Buffer.alloc(8 + Math.ceil(binary.length / 4) * 4);
  bin.writeUInt32LE(bin.length - 8); bin.writeUInt32LE(0x004e4942, 4); binary.copy(bin, 8);
  header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(20 + encoded.length + bin.length, 8);
  header.writeUInt32LE(encoded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  return Buffer.concat([header, encoded, bin]);
}
function ktx(width: number, height: number, options: { depth?: number; layers?: number; faces?: number; levels?: number; format?: number } = {}): Buffer {
  const levels = options.levels ?? 1;
  const entries = Math.max(1, levels);
  const dfd = 80 + entries * 24;
  const bytes = Buffer.alloc(dfd + 24 + entries);
  Buffer.from([0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes);
  bytes.writeUInt32LE(options.format ?? 0, 12); bytes.writeUInt32LE(1, 16);
  [width, height, options.depth ?? 0, options.layers ?? 0, options.faces ?? 1, levels].forEach((value, i) => bytes.writeUInt32LE(value, 20 + i * 4));
  bytes.writeUInt32LE(dfd, 48); bytes.writeUInt32LE(24, 52); bytes.writeUInt32LE(24, dfd); bytes[dfd + 12] = 163;
  for (let i = 0; i < entries; i++) {
    bytes.writeBigUInt64LE(BigInt(dfd + 24 + i), 80 + i * 24);
    bytes.writeBigUInt64LE(1n, 88 + i * 24);
  }
  return bytes;
}
function textured(image: Buffer, textures = [{ extensions: { KHR_texture_basisu: { source: 0 } } }]): Buffer {
  return glb({ bufferViews: [{ buffer: 0, byteLength: image.length }], images: [{ mimeType: 'image/ktx2', bufferView: 0 }], textures }, image);
}
const pack = (totalBytes: number) => totalEstimates({ 'model.glb': {
  geometryBytes: totalBytes, meshoptDecodedBytes: totalBytes, imageRgbaBytes: 0, derivedTextureBytes: 0,
  textureBytes: 0, imageAllocations: 0, maxTextureEdge: 0, totalBytes,
} });

describe('final GLB decoded geometry estimate', () => {
  it('counts meshopt decoded count×stride, never the compressed payload or virtual fallback buffer', () => {
    const bytes = glb({
      buffers: [{ byteLength: 8 }, { byteLength: 1200 }],
      bufferViews: [{ buffer: 1, byteLength: 1200, byteStride: 12, extensions: {
        EXT_meshopt_compression: { buffer: 0, byteLength: 8, count: 100, byteStride: 12, mode: 'ATTRIBUTES' },
      } }],
      accessors: [{ bufferView: 0, componentType: 5126, count: 100, type: 'VEC3' }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 } }, { attributes: { POSITION: 0 } }] }],
    }, Buffer.alloc(8));
    const estimate = estimateGlb(bytes);
    expect(estimate.geometryBytes).toBe(1200);
    expect(estimate.meshoptDecodedBytes).toBe(1200);
    expect(estimate.geometryBytes).toBeGreaterThan(bytes.length);
  });
  it('deduplicates shared interleaved uploads, including repeated primitive references', () => {
    const bytes = glb({
      bufferViews: [{ buffer: 0, byteLength: 240, byteStride: 24 }],
      accessors: [0, 12].map((byteOffset) => ({ bufferView: 0, byteOffset, componentType: 5126, count: 10, type: 'VEC3' })),
      meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 } }, { attributes: { POSITION: 0, NORMAL: 1 } }] }],
    }, Buffer.alloc(240));
    expect(estimateGlb(bytes).geometryBytes).toBe(240);
  });
  it('counts distinct overlapping non-interleaved accessors as separate uploads', () => {
    const bytes = glb({ bufferViews: [{ buffer: 0, byteLength: 120 }],
      accessors: [0, 1].map(() => ({ bufferView: 0, componentType: 5126, count: 10, type: 'VEC3' })),
      meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 } }] }],
    }, Buffer.alloc(120));
    expect(estimateGlb(bytes).geometryBytes).toBe(240);
  });
  it('allocates the full sparse accessor rather than only its sparse patch bytes', () => {
    const bytes = glb({ bufferViews: [{ buffer: 0, byteLength: 1 }, { buffer: 0, byteOffset: 4, byteLength: 12 }],
      accessors: [{ componentType: 5126, count: 100, type: 'VEC3', sparse: { count: 1, indices: { bufferView: 0, componentType: 5121 }, values: { bufferView: 1 } } }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    }, Buffer.alloc(16));
    expect(estimateGlb(bytes).geometryBytes).toBe(1200);
  });
  it('adds r186 bone and morph texture storage separately from geometry', () => {
    const bytes = glb({ bufferViews: [{ buffer: 0, byteLength: 120 }],
      accessors: [{ bufferView: 0, componentType: 5126, count: 10, type: 'VEC3' }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, targets: [{ POSITION: 0 }] }] }],
      skins: [{ joints: [0, 1, 2] }], nodes: [{ skin: 0 }, { skin: 0 }],
    }, Buffer.alloc(120));
    const estimate = estimateGlb(bytes);
    expect(estimate.derivedTextureBytes).toBe(2 * 256 + 320);
    expect(estimate.totalBytes).toBe(120 + 2 * 256 + 320);
  });
  it('includes triangle-strip index conversion and refuses unmodelled instance buffers', () => {
    const bytes = glb({ bufferViews: [{ buffer: 0, byteLength: 120 }],
      accessors: [{ bufferView: 0, componentType: 5126, count: 10, type: 'VEC3' }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, mode: 5 }] }],
    }, Buffer.alloc(120));
    expect(estimateGlb(bytes).geometryBytes).toBe(120 + 8 * 3 * 4);
    expect(() => estimateGlb(glb({ nodes: [{ extensions: { EXT_mesh_gpu_instancing: {} } }] }))).toThrow('instance-buffer');
  });
  it('rejects malformed buffers and unknown geometry compression', () => {
    expect(() => estimateGlb(Buffer.from('not glb'))).toThrow('GLB');
    expect(() => estimateGlb(glb({ bufferViews: [{ buffer: 0, byteLength: 120 }], accessors: [{ bufferView: 0, componentType: 5126, count: 10, type: 'VEC3' }], meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }] }))).toThrow('truncated');
    expect(() => estimateGlb(glb({ meshes: [{ primitives: [{ extensions: { KHR_draco_mesh_compression: {} } }] }] }))).toThrow('Draco');
  });
});

describe('KTX2 fallback inventory', () => {
  it('uses a full RGBA8 mip chain instead of compressed ETC1S bytes, including generated mips', () => {
    const value = estimateKtx2(ktx(256, 256));
    expect(value.rgbaMipBytes).toBe(349524);
    expect(value).toMatchObject({ declaredLevels: 1, estimatedLevels: 9, maxTextureEdge: 256 });
    expect(estimateKtx2(ktx(256, 256, { levels: 0 })).rgbaMipBytes).toBe(value.rgbaMipBytes);
  });
  it('keeps cube faces and array layers constant while shrinking volume depth', () => {
    expect(estimateKtx2(ktx(4, 4, { layers: 3, faces: 6, levels: 3 })).rgbaMipBytes).toBe((16 + 4 + 1) * 3 * 6 * 4);
    expect(estimateKtx2(ktx(4, 4, { depth: 4, layers: 2, levels: 3 })).rgbaMipBytes).toBe((64 + 8 + 1) * 2 * 4);
  });
  it('accounts for independent samplers and sRGB/linear copies of an image', () => {
    const image = ktx(4, 4);
    const estimate = estimateGlb(textured(image, [{ extensions: { KHR_texture_basisu: { source: 0 } } }, { extensions: { KHR_texture_basisu: { source: 0 } } }]));
    expect(estimate.imageAllocations).toBe(4);
    expect(estimate.imageRgbaBytes).toBe(4 * (16 + 4 + 1) * 4);
  });
  it('fails oversized, truncated, external and unknown-format images instead of estimating zero', () => {
    expect(() => estimateKtx2(ktx(2049, 1))).toThrow('2048');
    expect(() => estimateKtx2(ktx(4, 4, { format: 97 }))).toThrow('unsupported');
    expect(() => estimateKtx2(ktx(4, 4).subarray(0, 80))).toThrow('mip index');
    expect(() => estimateGlb(glb({ images: [{ uri: 'image.ktx2' }] }))).toThrow('embedded');
    expect(() => estimateGlb(glb({ images: [{ mimeType: 'image/png', bufferView: 0 }] }))).toThrow('KTX2');
  });
});

describe('build estimate load groups and tier budgets', () => {
  it('uses the same decimal MB boundaries as the live allocation gate', () => {
    expect(GPU_BUDGETS).toEqual(GPU_LIMIT);
    expect(HIGH_TARGET_BUDGET).toBe(HIGH_TARGET_LIMIT);
    const overhead = estimateBuild({ boot: pack(0) }).loadGroups.common.tiers.low.knownBytes;
    const assetBytes = 100e6 - overhead;
    const low = estimateBuild({ boot: pack(assetBytes) }).loadGroups.common.tiers.low;
    expect(low.knownBytes).toBe(100e6);
    expect(low.knownMB).toBe(100);
    expect(() => estimateBuild({ boot: pack(assetBytes + 1) })).toThrow('common/low known estimate exceeds 100 MB');
  });
  it('gates common/private plus a single chapter, not the sum of prefetched chapters', () => {
    const result = estimateBuild({ boot: pack(1 * 1024 ** 2), private: pack(1 * 1024 ** 2), garden: pack(80 * 1024 ** 2), granskog: pack(80 * 1024 ** 2) });
    expect(result.commonPacks).toEqual(['boot', 'private']);
    expect(result.loadGroups.garden.packs).toEqual(['boot', 'private', 'garden']);
    expect(result.loadGroups.garden.assetBytes).toBe(82 * 1024 ** 2);
    expect(result.loadGroups.granskog.assetBytes).toBe(result.loadGroups.garden.assetBytes);
    expect(result.kind).toBe('conservative-build-estimate');
  });
  it('counts canvas, High half-resolution effects and shadow storage separately and matches live pixel caps', () => {
    expect(PIXEL_CAPS).toEqual(PIXEL_CAP);
    const { low, mid, high } = estimateBuild({ boot: pack(1000) }).loadGroups.common.tiers;
    expect(low.renderTargetBytes).toBe(0);
    expect(mid.renderTargetBytes).toBe(mid.width * mid.height * 20);
    expect(high.renderTargetBytes).toBe(high.width * high.height * 20 + Math.ceil(high.width / 2) * Math.ceil(high.height / 2) * 24 + 1024 ** 2 * 8);
    expect(high.canvasBytes).toBe(high.width * high.height * 8);
    expect(high.knownBytes).toBe(1000 + high.canvasBytes + high.renderTargetBytes + high.knownProceduralTextureBytes);
    expect(high.renderTargetBytes).toBeLessThan(HIGH_TARGET_LIMIT);
  });
  it('counts unknown shared packs conservatively and rejects an over-budget load group', () => {
    expect(estimateBuild({ boot: pack(10), animals: pack(20), garden: pack(30) }).loadGroups.garden.assetBytes).toBe(60);
    expect(() => estimateBuild({ boot: pack(100 * 1024 ** 2) })).toThrow('common/low');
  });
});
