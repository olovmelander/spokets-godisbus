// Build-time inventory, not a GL measurement. Layouts follow the pinned GLTFLoader and KTX2 header.
// glTF 2 / EXT_meshopt_compression and KTX 2 metadata are read after the final compression step.
const KTX2 = Buffer.from([0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a]);
const COMPONENT = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const MIB = 1024 * 1024;
const MB = 1e6;
export const PIXEL_CAPS = { low: 1e6, mid: 1.6e6, high: 2.6e6 };
export const GPU_BUDGETS = { low: 100 * MB, mid: 150 * MB, high: 220 * MB };
export const HIGH_TARGET_BUDGET = 80 * MB;
export const REFERENCE_VIEWPORT = { width: 1440, height: 900, devicePixelRatio: 2 };
const CHAPTER_PACKS = new Set(['prolog', 'garden', 'granskog', 'myr', 'myren', 'berg', 'berget', 'norrsken', 'epilog', 'byn', 'forsen']);
const fail = (message) => { throw new Error(`GPU estimate: ${message}`); };
function integer(value, label, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) fail(`invalid ${label}`);
  return value;
}
function sum(values) { return integer(values.reduce((a, b) => a + b, 0), 'byte total'); }
function product(...values) { return integer(values.reduce((a, b) => a * b, 1), 'byte product'); }

/** RGBA8 fallback including a complete mip chain, even when the file supplies fewer levels.
 * Array layers and cube faces stay constant; volume depth shrinks with each mip. */
export function estimateKtx2(bytes) {
  if (bytes.length < 80 || !bytes.subarray(0, 12).equals(KTX2)) fail('image is not a complete KTX2 header');
  const [format, width, height, depth, layers, faces, levels] = [12, 20, 24, 28, 32, 36, 40].map((at) => bytes.readUInt32LE(at));
  if (width < 1 || (faces !== 1 && faces !== 6) || (faces === 6 && (width !== height || depth > 0))) fail('invalid KTX2 dimensions/faces');
  const maxTextureEdge = Math.max(width, height, depth);
  if (maxTextureEdge > 2048) fail(`asset texture edge ${maxTextureEdge} exceeds 2048`);
  const completeLevels = 1 + Math.floor(Math.log2(maxTextureEdge));
  if (levels > completeLevels || bytes.length < 80 + Math.max(1, levels) * 24) fail('invalid KTX2 mip index');
  const dfdOffset = bytes.readUInt32LE(48), dfdLength = bytes.readUInt32LE(52);
  if (dfdLength < 24 || dfdOffset + dfdLength > bytes.length) fail('missing KTX2 format descriptor');
  // Only the build's ETC1S/UASTC LDR output or explicit RGBA8. HDR/unknown formats must get a new
  // estimate before shipping: treating them as four bytes per texel could undercount.
  const model = bytes[dfdOffset + 12];
  if (!(format === 0 && (model === 163 || model === 166)) && format !== 37 && format !== 43) fail(`unsupported KTX2 format ${format}/${model}`);
  // The game's KTX2Loader carries no Zstandard decoder (scripts/no-zstd.mjs): such an image would not load.
  if (bytes.readUInt32LE(44) === 2) fail('a KTX2 image is supercompressed with Zstandard, which the game cannot decode');
  for (let i = 0; i < Math.max(1, levels); i++) {
    const offset = Number(bytes.readBigUInt64LE(80 + i * 24));
    const length = Number(bytes.readBigUInt64LE(88 + i * 24));
    integer(offset, 'KTX2 level offset'); integer(length, 'KTX2 level length');
    if (offset + length > bytes.length) fail('KTX2 mip lies outside its image');
  }
  let texels = 0;
  for (let i = 0; i < completeLevels; i++) {
    texels += product(Math.max(1, Math.floor(width / 2 ** i)), Math.max(1, Math.floor(height / 2 ** i)), Math.max(1, Math.floor(depth / 2 ** i)), Math.max(1, layers), faces);
  }
  return { rgbaMipBytes: product(texels, 4), maxTextureEdge, declaredLevels: levels, estimatedLevels: completeLevels };
}

function parseGlb(bytes) {
  if (bytes.length < 20 || bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) fail('invalid GLB 2 header');
  let json, binary = Buffer.alloc(0);
  for (let at = 12; at < bytes.length;) {
    if (at + 8 > bytes.length) fail('truncated GLB chunk');
    const length = bytes.readUInt32LE(at), kind = bytes.readUInt32LE(at + 4);
    if (length % 4 || at + 8 + length > bytes.length) fail('invalid GLB chunk length');
    const content = bytes.subarray(at + 8, at + 8 + length);
    if (kind === 0x4e4f534a) { if (json) fail('duplicate GLB JSON'); json = JSON.parse(content.toString('utf8').trim()); }
    else if (kind === 0x004e4942) binary = content;
    at += 8 + length;
  }
  if (!json || json.asset?.version !== '2.0') fail('missing glTF 2 data');
  return { json, binary };
}

export function estimateGlb(bytes) {
  const { json, binary } = parseGlb(bytes);
  const views = json.bufferViews ?? [], accessors = json.accessors ?? [];
  function embedded(buffer, offset, length) {
    integer(offset, 'buffer offset'); integer(length, 'buffer length');
    if (buffer !== 0 || json.buffers?.[buffer]?.uri || offset + length > binary.length) fail('external or truncated GLB buffer');
    return binary.subarray(offset, offset + length);
  }
  function viewBytes(index) {
    const view = views[index];
    if (!view) fail(`missing bufferView ${index}`);
    const compressed = view.extensions?.EXT_meshopt_compression;
    if (compressed) {
      const decoded = product(integer(compressed.count, 'meshopt count', 1), integer(compressed.byteStride, 'meshopt stride', 1));
      if (decoded !== view.byteLength) fail('meshopt decoded size differs from bufferView length');
      embedded(compressed.buffer, compressed.byteOffset ?? 0, compressed.byteLength);
      return decoded;
    }
    embedded(view.buffer, view.byteOffset ?? 0, view.byteLength);
    return integer(view.byteLength, 'bufferView length');
  }
  const used = new Set();
  let derivedTextureBytes = 0, convertedIndexBytes = 0;
  for (const mesh of json.meshes ?? []) for (const primitive of mesh.primitives ?? []) {
    if (primitive.extensions?.KHR_draco_mesh_compression) fail('Draco has no decoded geometry estimate');
    for (const index of Object.values(primitive.attributes ?? {})) used.add(index);
    if (primitive.indices !== undefined) used.add(primitive.indices);
    for (const target of primitive.targets ?? []) for (const index of Object.values(target)) used.add(index);
    if (primitive.mode === 5 || primitive.mode === 6) {
      const source = accessors[primitive.indices ?? primitive.attributes?.POSITION];
      const count = integer(source?.count, 'strip/fan draw count');
      convertedIndexBytes += product(Math.max(0, count - 2), 3, 4); // r186 expands strips/fans; use Uint32 upper bound.
    }
    // r186 packs morph attributes into an RGBA32F texture array. At most twice the unpadded texels
    // covers row rounding for any maxTextureSize, without pretending to know the target device.
    if (primitive.targets?.length) {
      const count = integer(accessors[primitive.attributes?.POSITION]?.count, 'morph vertex count');
      const stride = primitive.targets.some((t) => t.COLOR_0 !== undefined) ? 3 : primitive.targets.some((t) => t.NORMAL !== undefined) ? 2 : 1;
      derivedTextureBytes += product(count, stride, primitive.targets.length, 16, 2);
    }
  }
  // A separate skeleton belongs to each skinned node. Bone matrices become RGBA32F in r186.
  for (const node of json.nodes ?? []) {
    if (node.extensions?.EXT_mesh_gpu_instancing) fail('GPU instancing requires an instance-buffer estimate');
    if (node.skin === undefined) continue;
    const skin = json.skins?.[node.skin];
    if (!skin) fail('missing skin');
    const side = Math.max(4, Math.ceil(Math.sqrt(skin.joints.length * 4) / 4) * 4);
    derivedTextureBytes += product(side, side, 16);
  }
  const groups = new Map();
  let standaloneBytes = 0;
  for (const index of used) {
    const accessor = accessors[index];
    if (!accessor || !COMPONENT[accessor.componentType] || !SIZE[accessor.type]) fail(`invalid GPU accessor ${index}`);
    const count = integer(accessor.count, 'accessor count');
    const itemBytes = product(COMPONENT[accessor.componentType], SIZE[accessor.type]);
    const ownBytes = product(count, itemBytes);
    if (accessor.bufferView === undefined) { standaloneBytes += ownBytes; continue; }
    const view = views[accessor.bufferView];
    const decoded = viewBytes(accessor.bufferView);
    const group = groups.get(accessor.bufferView) ?? { decoded, arrays: 0, interleaved: new Set(), meshopt: !!view.extensions?.EXT_meshopt_compression };
    const byteOffset = integer(accessor.byteOffset ?? 0, 'accessor offset');
    const stride = view.byteStride ?? itemBytes;
    if (count && byteOffset + (count - 1) * stride + itemBytes > decoded) fail('accessor lies outside decoded bufferView');
    if (accessor.sparse) {
      // Sparse data creates a private decoded array; the sparse source itself is CPU input only.
      standaloneBytes += ownBytes;
    } else if (stride !== itemBytes) {
      // Match the loader's shared interleaved-buffer key. Different slices/types/counts upload separately.
      group.interleaved.add(`${accessor.componentType}:${Math.floor(byteOffset / stride)}:${count}`);
    } else group.arrays += ownBytes;
    groups.set(accessor.bufferView, group);
  }
  const geometryBytes = sum([standaloneBytes, convertedIndexBytes, ...[...groups.values()].map((g) => Math.max(g.decoded, g.arrays + g.interleaved.size * g.decoded))]);
  const meshoptDecodedBytes = sum([...groups.values()].filter((g) => g.meshopt).map((g) => g.decoded));
  const images = json.images ?? [];
  const copies = images.map(() => 0);
  for (const texture of json.textures ?? []) {
    const source = texture.extensions?.KHR_texture_basisu?.source ?? texture.source;
    if (!Number.isInteger(source) || !images[source]) fail('missing texture source');
    // Each texture entry may have a distinct sampler; linear and sRGB use can allocate two copies.
    copies[source] += 2;
  }
  let imageRgbaBytes = 0, imageAllocations = 0, maxTextureEdge = 0;
  for (const [index, image] of images.entries()) {
    if (image.uri || image.mimeType !== 'image/ktx2' || image.bufferView === undefined) fail('image must be an embedded supported KTX2');
    const view = views[image.bufferView];
    if (!view || view.extensions?.EXT_meshopt_compression) fail('invalid image bufferView');
    const result = estimateKtx2(embedded(view.buffer, view.byteOffset ?? 0, view.byteLength));
    const allocations = Math.max(1, copies[index]);
    imageRgbaBytes += product(result.rgbaMipBytes, allocations);
    imageAllocations += allocations;
    maxTextureEdge = Math.max(maxTextureEdge, result.maxTextureEdge);
  }
  const textureBytes = sum([imageRgbaBytes, derivedTextureBytes]);
  return { geometryBytes, meshoptDecodedBytes, imageRgbaBytes, derivedTextureBytes, textureBytes, imageAllocations, maxTextureEdge, totalBytes: sum([geometryBytes, textureBytes]) };
}

export function totalEstimates(files) {
  const values = Object.values(files);
  return {
    geometryBytes: sum(values.map((v) => v.geometryBytes)), textureBytes: sum(values.map((v) => v.textureBytes)),
    totalBytes: sum(values.map((v) => v.totalBytes)), maxTextureEdge: Math.max(0, ...values.map((v) => v.maxTextureEdge)), files,
  };
}

export function estimateBuild(packs) {
  // The loader always uses boot, plus private models where present. Unknown future shared packs are
  // conservatively common. Chapter packs are mutually exclusive: prefetching bytes is not a GPU upload.
  const common = Object.keys(packs).filter((name) => !CHAPTER_PACKS.has(name)).sort();
  const chapters = Object.keys(packs).filter((name) => CHAPTER_PACKS.has(name)).sort();
  const groups = Object.fromEntries([['common', common], ...chapters.map((name) => [name, [...common, name]])].map(([name, names]) => {
    const assetBytes = sum(names.map((pack) => packs[pack].totalBytes));
    const tiers = Object.fromEntries(Object.entries(PIXEL_CAPS).map(([tier, cap]) => {
      const ratio = Math.min(REFERENCE_VIEWPORT.devicePixelRatio, Math.sqrt(cap / (REFERENCE_VIEWPORT.width * REFERENCE_VIEWPORT.height)));
      const width = Math.floor(REFERENCE_VIEWPORT.width * ratio), height = Math.floor(REFERENCE_VIEWPORT.height * ratio);
      const pixels = width * height;
      const canvasBytes = pixels * 8; // RGBA8 + a conservative four-byte depth allocation; no MSAA.
      const targets = tier === 'low' ? 0 : pixels * 20; // two RGBA16F colours + DEPTH24 (four bytes).
      const halfTargets = tier === 'high' ? Math.ceil(width / 2) * Math.ceil(height / 2) * 24 : 0; // blur, glow, water.
      const shadowBytes = tier === 'high' ? 1024 * 1024 * 8 : 0;
      const renderTargetBytes = targets + halfTargets + shadowBytes;
      const knownProceduralTextureBytes = tier === 'low' ? 0 : 32 ** 3 * 8 + 32 ** 2 * 4; // LUT + flow.
      const knownBytes = sum([assetBytes, canvasBytes, renderTargetBytes, knownProceduralTextureBytes]);
      if (knownBytes > GPU_BUDGETS[tier]) fail(`${name}/${tier} known estimate exceeds ${GPU_BUDGETS[tier] / MB} MB`);
      if (tier === 'high' && renderTargetBytes > HIGH_TARGET_BUDGET) fail('High offscreen targets exceed 80 MB');
      return [tier, { width, height, assetBytes, canvasBytes, renderTargetBytes, knownProceduralTextureBytes, knownBytes, knownMB: Number((knownBytes / MB).toFixed(3)), knownMiB: Number((knownBytes / MIB).toFixed(3)), budgetBytes: GPU_BUDGETS[tier] }];
    }));
    return [name, { packs: names, assetBytes, tiers }];
  }));
  return {
    kind: 'conservative-build-estimate', unit: 'bytes', referenceViewport: REFERENCE_VIEWPORT,
    methodology: 'Decoded meshopt/accessor allocations; full RGBA8 mip fallback per sampler and colour-space use; r186 bone/morph textures; known canvas and tier targets. Common packs plus one chapter at a time.',
    limitations: 'Not measured GL memory. Generated scene geometry/textures, additional runtime model copies and driver overhead are excluded. Runtime allocation/lifecycle gates and physical-device checks remain required.',
    commonPacks: common, loadGroups: groups,
  };
}
