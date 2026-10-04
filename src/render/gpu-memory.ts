import type { Tier } from './quality';

// Plan §6.5/6.12 uses MB. Decimal bytes make the gate slightly stricter than a MiB interpretation.
export const GPU_LIMIT: Readonly<Record<Tier, number>> = { low: 100e6, mid: 150e6, high: 220e6 };
export const HIGH_TARGET_LIMIT = 80e6;
export const TEXTURE_LIMIT = 2048;
export interface Format { bytes: number; blockWidth?: number; blockHeight?: number; minWidth?: number; minHeight?: number }
export function levelBytes(format: Format, width: number, height: number, depth = 1): number {
  if (width <= 0 || height <= 0 || depth <= 0) return 0;
  return Math.ceil(Math.max(format.minWidth ?? 1, width) / (format.blockWidth ?? 1))
    * Math.ceil(Math.max(format.minHeight ?? 1, height) / (format.blockHeight ?? 1)) * Math.max(1, depth) * format.bytes;
}

export interface GpuMemory {
  /** Bytes requested through GL storage calls, excluding opaque driver padding/caches. */
  glBytes: number;
  bufferBytes: number;
  textureBytes: number;
  renderbufferBytes: number;
  /** FBO-attached textures plus renderbuffers, counted once even with several attachments. */
  targetBytes: number;
  assetBytes: number;
  /** Logical canvas colour/depth/stencil estimate: browser/compositor buffering is not observable. */
  canvasBytes: number;
  totalBytes: number;
  /** Peaks since the current tier was selected; transient allocations count against its budget too. */
  peakBytes: number;
  targetPeakBytes: number;
  buffers: number;
  textures: number;
  renderbuffers: number;
  /** Assets only: drawing-buffer targets may be wider than the asset texture limit. */
  maxTextureSize: number;
  unknownFormats: number[];
  lost: boolean;
}
export function gpuFailures(info: GpuMemory, tier: Tier): string[] {
  return [
    ...(![info.totalBytes, info.targetBytes, info.peakBytes, info.targetPeakBytes].every(Number.isFinite) ? ['GPU byte count is not finite'] : []),
    ...(Math.max(info.totalBytes, info.peakBytes) > GPU_LIMIT[tier] ? [`${tier}: GPU peak ${Math.max(info.totalBytes, info.peakBytes)} > ${GPU_LIMIT[tier]}`] : []),
    ...(tier === 'high' && Math.max(info.targetBytes, info.targetPeakBytes) > HIGH_TARGET_LIMIT ? [`High target peak ${Math.max(info.targetBytes, info.targetPeakBytes)} > ${HIGH_TARGET_LIMIT}`] : []),
    ...(info.maxTextureSize > TEXTURE_LIMIT ? [`Asset texture ${info.maxTextureSize} > ${TEXTURE_LIMIT}`] : []),
    ...(info.unknownFormats.length ? [`Uncounted GL formats: ${info.unknownFormats.join(', ')}`] : []),
  ];
}

interface Level { width: number; height: number; depth: number; format: number; bytes: number }
interface Texture { levels: Map<string, Level>; target: boolean; immutable: boolean; base: number; max: number }
/**
 * Optional instance-only observer, installed before Three creates resources. Normal play does not call
 * this. Native methods keep their receiver, arguments, return values and exceptions; no prototype,
 * GL error state or draw/upload data is modified. Binding queries happen only at allocations, never per
 * draw. This also handles VAO element-buffer bindings and active texture units without mirroring GL state.
 */
export function observeGpu(gl: WebGL2RenderingContext): { snapshot(): GpuMemory; resetPeaks(): void; dispose(): void } {
  const buffers = new Map<WebGLBuffer, number>();
  const textures = new Map<WebGLTexture, Texture>();
  const renderbuffers = new Map<WebGLRenderbuffer, { bytes: number; format: number }>();
  const formats = new Map<number, Format>();
  const originals: (() => void)[] = [];
  let peakBytes = 0;
  let targetPeakBytes = 0;
  let lost = false;
  const formatGroup = (bytes: number, names: string[]) => {
    for (const name of names) {
      const value = (gl as unknown as Record<string, unknown>)[name];
      if (typeof value === 'number') formats.set(value, { bytes });
    }
  };
  formatGroup(1, ['ALPHA', 'LUMINANCE', 'RED', 'R8', 'R8_SNORM', 'R8UI', 'R8I', 'STENCIL_INDEX8']);
  formatGroup(2, ['LUMINANCE_ALPHA', 'RG', 'R16F', 'R16UI', 'R16I', 'RG8', 'RG8_SNORM', 'RG8UI', 'RG8I', 'RGB565', 'RGBA4', 'RGB5_A1', 'DEPTH_COMPONENT16']);
  formatGroup(3, ['RGB', 'RGB8', 'RGB8_SNORM', 'SRGB8', 'RGB8UI', 'RGB8I']);
  formatGroup(4, ['RGBA', 'RGBA8', 'RGBA8_SNORM', 'SRGB8_ALPHA8', 'RGBA8UI', 'RGBA8I', 'R32F', 'R32UI', 'R32I', 'RG16F', 'RG16UI', 'RG16I', 'RGB10_A2', 'RGB10_A2UI', 'R11F_G11F_B10F', 'RGB9_E5', 'DEPTH_COMPONENT', 'DEPTH_COMPONENT24', 'DEPTH_COMPONENT32F', 'DEPTH_STENCIL', 'DEPTH24_STENCIL8']);
  formatGroup(6, ['RGB16F', 'RGB16UI', 'RGB16I']);
  formatGroup(8, ['RGBA16F', 'RGBA16UI', 'RGBA16I', 'RG32F', 'RG32UI', 'RG32I', 'DEPTH32F_STENCIL8']);
  formatGroup(12, ['RGB32F', 'RGB32UI', 'RGB32I']);
  formatGroup(16, ['RGBA32F', 'RGBA32UI', 'RGBA32I']);
  // Compressed internal formats have fixed registry values, even when their constants live on an
  // extension instead of the WebGL2 context. Include every KTX2Loader transcode target.
  for (const value of [0x83f0, 0x83f1, 0x8c4c, 0x8c4d, 0x8dbb, 0x8dbc, 0x8d64, 0x9270, 0x9271, 0x9274, 0x9275, 0x9276, 0x9277]) formats.set(value, { bytes: 8, blockWidth: 4, blockHeight: 4 });
  for (const value of [0x83f2, 0x83f3, 0x8c4e, 0x8c4f, 0x8dbd, 0x8dbe, 0x8e8c, 0x8e8d, 0x8e8e, 0x8e8f, 0x9272, 0x9273, 0x9278, 0x9279]) formats.set(value, { bytes: 16, blockWidth: 4, blockHeight: 4 });
  const astc = [[4, 4], [5, 4], [5, 5], [6, 5], [6, 6], [8, 5], [8, 6], [8, 8], [10, 5], [10, 6], [10, 8], [10, 10], [12, 10], [12, 12]];
  for (const [i, [w, h]] of astc.entries()) for (const base of [0x93b0, 0x93d0]) formats.set(base + i, { bytes: 16, blockWidth: w, blockHeight: h });
  for (const value of [0x8c00, 0x8c02]) formats.set(value, { bytes: 8, blockWidth: 4, blockHeight: 4, minWidth: 8, minHeight: 8 });
  for (const value of [0x8c01, 0x8c03]) formats.set(value, { bytes: 8, blockWidth: 8, blockHeight: 4, minWidth: 16, minHeight: 8 });

  const nativeGet = gl.getParameter.bind(gl);
  const cubeFace = (target: number) => target >= gl.TEXTURE_CUBE_MAP_POSITIVE_X && target <= gl.TEXTURE_CUBE_MAP_NEGATIVE_Z;
  const boundTexture = (target: number): WebGLTexture | null => nativeGet(
    cubeFace(target) || target === gl.TEXTURE_CUBE_MAP ? gl.TEXTURE_BINDING_CUBE_MAP
      : target === gl.TEXTURE_3D ? gl.TEXTURE_BINDING_3D : target === gl.TEXTURE_2D_ARRAY ? gl.TEXTURE_BINDING_2D_ARRAY : gl.TEXTURE_BINDING_2D);
  const texture = (key: WebGLTexture) => {
    let found = textures.get(key);
    if (!found) textures.set(key, found = { levels: new Map(), target: false, immutable: false, base: 0, max: 1000 });
    return found;
  };
  const face = (target: number) => cubeFace(target) ? target - gl.TEXTURE_CUBE_MAP_POSITIVE_X : 0;
  const bytes = (format: number, w: number, h: number, d = 1) => formats.has(format) ? levelBytes(formats.get(format)!, w, h, d) : 0;
  const setLevel = (key: WebGLTexture, target: number, level: number, format: number, w: number, h: number, d = 1) => {
    texture(key).levels.set(`${face(target)}:${level}`, { width: w, height: h, depth: d, format, bytes: bytes(format, w, h, d) });
  };
  const unsized = (internal: number, type: number): number => {
    if (!(new Set<number>([gl.RGBA, gl.RGB, gl.RG, gl.RED, gl.ALPHA, gl.LUMINANCE, gl.LUMINANCE_ALPHA])).has(internal)) return internal;
    const channels = internal === gl.RGBA ? 4 : internal === gl.RGB ? 3 : internal === gl.RG || internal === gl.LUMINANCE_ALPHA ? 2 : 1;
    const packed = type === gl.UNSIGNED_SHORT_5_6_5 || type === gl.UNSIGNED_SHORT_4_4_4_4 || type === gl.UNSIGNED_SHORT_5_5_5_1 ? 2
      : type === gl.UNSIGNED_INT_2_10_10_10_REV || type === gl.UNSIGNED_INT_10F_11F_11F_REV || type === gl.UNSIGNED_INT_5_9_9_9_REV ? 4 : 0;
    const size = packed || channels * (type === gl.FLOAT || type === gl.UNSIGNED_INT || type === gl.INT ? 4 : type === gl.HALF_FLOAT || type === gl.UNSIGNED_SHORT || type === gl.SHORT ? 2 : 1);
    const synthetic = -(internal * 65536 + type);
    formats.set(synthetic, { bytes: size });
    return synthetic;
  };
  const hook = (name: keyof WebGL2RenderingContext, after: (args: any[], result: any) => void) => {
    const original = gl[name] as (...args: any[]) => any;
    const own = Object.getOwnPropertyDescriptor(gl, name);
    Object.defineProperty(gl, name, { configurable: true, writable: true, value: function (this: WebGL2RenderingContext, ...args: any[]) {
      const result = Reflect.apply(original, this, args);
      if (this === gl) {
        if (!lost) after(args, result);
        recordPeak();
      }
      return result;
    } });
    originals.push(() => { if (own) Object.defineProperty(gl, name, own); else delete (gl as any)[name]; });
  };
  hook('bufferData', ([target, source, _usage, offset = 0, length]) => {
    const binding = target === gl.ARRAY_BUFFER ? gl.ARRAY_BUFFER_BINDING : target === gl.ELEMENT_ARRAY_BUFFER ? gl.ELEMENT_ARRAY_BUFFER_BINDING
      : target === gl.COPY_READ_BUFFER ? gl.COPY_READ_BUFFER_BINDING : target === gl.COPY_WRITE_BUFFER ? gl.COPY_WRITE_BUFFER_BINDING
      : target === gl.PIXEL_PACK_BUFFER ? gl.PIXEL_PACK_BUFFER_BINDING : target === gl.PIXEL_UNPACK_BUFFER ? gl.PIXEL_UNPACK_BUFFER_BINDING
      : target === gl.TRANSFORM_FEEDBACK_BUFFER ? gl.TRANSFORM_FEEDBACK_BUFFER_BINDING : target === gl.UNIFORM_BUFFER ? gl.UNIFORM_BUFFER_BINDING : null;
    if (binding === null) return;
    const key = nativeGet(binding) as WebGLBuffer | null;
    if (key && source !== null) {
      const elementBytes = source.BYTES_PER_ELEMENT ?? 1;
      const remainder = source.byteLength - offset * elementBytes;
      buffers.set(key, typeof source === 'number' ? source : length ? length * elementBytes : remainder);
    }
  });
  hook('deleteBuffer', ([key]) => { buffers.delete(key); });
  hook('createTexture', (_args, key) => { if (key) texture(key); });
  hook('deleteTexture', ([key]) => { textures.delete(key); });
  hook('texImage2D', (args) => {
    const [target, level, internal] = args;
    const key = boundTexture(target);
    if (!key) return;
    const source = args[5];
    const explicit = args.length >= 9;
    const w = explicit ? args[3] : source?.videoWidth ?? source?.naturalWidth ?? source?.width;
    const h = explicit ? args[4] : source?.videoHeight ?? source?.naturalHeight ?? source?.height;
    setLevel(key, target, level, unsized(internal, args[explicit ? 7 : 4]), w, h);
  });
  hook('texImage3D', ([target, level, internal, w, h, d, _border, _format, type]) => {
    const key = boundTexture(target);
    if (key) setLevel(key, target, level, unsized(internal, type), w, h, d);
  });
  for (const dimensions of [2, 3] as const) {
    hook(dimensions === 2 ? 'texStorage2D' : 'texStorage3D', ([target, levels, format, width, height, depth = 1]) => {
      const key = boundTexture(target);
      if (!key) return;
      const tex = texture(key);
      tex.levels.clear();
      tex.immutable = true;
      for (let f = 0; f < (target === gl.TEXTURE_CUBE_MAP ? 6 : 1); f++) for (let l = 0; l < levels; l++) {
        setLevel(key, target === gl.TEXTURE_CUBE_MAP ? gl.TEXTURE_CUBE_MAP_POSITIVE_X + f : target, l, format,
          Math.max(1, width >> l), Math.max(1, height >> l), target === gl.TEXTURE_3D ? Math.max(1, depth >> l) : depth);
      }
    });
    hook(dimensions === 2 ? 'compressedTexImage2D' : 'compressedTexImage3D', (args) => {
      const [target, level, format, width, height] = args;
      const key = boundTexture(target);
      if (!key) return;
      // Storage depends on blocks, not the upload view (which may contain an offset/padding).
      setLevel(key, target, level, format, width, height, dimensions === 2 ? 1 : args[5]);
    });
  }
  hook('copyTexImage2D', ([target, level, internal, _x, _y, w, h]) => { const key = boundTexture(target); if (key) setLevel(key, target, level, internal, w, h); });
  for (const name of ['texParameteri', 'texParameterf'] as const) hook(name, ([target, parameter, value]) => {
    if (parameter !== gl.TEXTURE_BASE_LEVEL && parameter !== gl.TEXTURE_MAX_LEVEL) return;
    const key = boundTexture(target);
    if (!key) return;
    texture(key)[parameter === gl.TEXTURE_BASE_LEVEL ? 'base' : 'max'] = Math.trunc(value);
  });
  hook('generateMipmap', ([target]) => {
    const key = boundTexture(target);
    if (!key) return;
    const tex = texture(key);
    // Immutable storage already reserved exactly its declared levels; generation changes pixels only.
    if (tex.immutable) return;
    for (const [index, base] of [...tex.levels]) {
      if (!index.endsWith(`:${tex.base}`)) continue;
      const last = Math.min(tex.max, tex.base + Math.floor(Math.log2(Math.max(base.width, base.height, target === gl.TEXTURE_3D ? base.depth : 1))));
      for (let l = tex.base + 1; l <= last; l++) {
        const shift = l - tex.base;
        setLevel(key, target === gl.TEXTURE_CUBE_MAP ? gl.TEXTURE_CUBE_MAP_POSITIVE_X + Number(index.split(':')[0]) : target,
          l, base.format, Math.max(1, base.width >> shift), Math.max(1, base.height >> shift), target === gl.TEXTURE_3D ? Math.max(1, base.depth >> shift) : base.depth);
      }
    }
  });
  const renderbuffer = (format: number, w: number, h: number, samples = 1) => {
    const key = nativeGet(gl.RENDERBUFFER_BINDING) as WebGLRenderbuffer | null;
    if (key) renderbuffers.set(key, { bytes: bytes(format, w, h) * Math.max(1, samples), format });
  };
  hook('renderbufferStorage', ([_target, format, w, h]) => { renderbuffer(format, w, h); });
  hook('renderbufferStorageMultisample', ([_target, samples, format, w, h]) => { renderbuffer(format, w, h, samples); });
  hook('deleteRenderbuffer', ([key]) => { renderbuffers.delete(key); });
  hook('framebufferTexture2D', ([_target, _attachment, _textarget, key]) => { if (key) texture(key).target = true; });
  hook('framebufferTextureLayer', ([_target, _attachment, key]) => { if (key) texture(key).target = true; });

  const canvasBytes = () => {
    const attrs = gl.getContextAttributes();
    return lost ? 0 : gl.drawingBufferWidth * gl.drawingBufferHeight * (4 + (attrs?.depth || attrs?.stencil ? 4 : 0));
  };
  function recordPeak() {
    let total = canvasBytes();
    let targets = 0;
    for (const value of buffers.values()) total += value;
    for (const tex of textures.values()) for (const level of tex.levels.values()) {
      total += level.bytes;
      if (tex.target) targets += level.bytes;
    }
    for (const value of renderbuffers.values()) { total += value.bytes; targets += value.bytes; }
    peakBytes = Math.max(peakBytes, total);
    targetPeakBytes = Math.max(targetPeakBytes, targets);
  }

  const clear = () => { buffers.clear(); textures.clear(); renderbuffers.clear(); };
  const onLost = () => { lost = true; clear(); };
  const onRestore = () => { lost = false; clear(); };
  // Registered before WebGLRenderer's restore listener, so its new allocation calls are captured.
  gl.canvas.addEventListener('webglcontextlost', onLost);
  gl.canvas.addEventListener('webglcontextrestored', onRestore);
  return {
    snapshot() {
      let textureBytes = 0, targetBytes = 0, maxTextureSize = 0;
      const unknown = new Set<number>();
      for (const tex of textures.values()) for (const level of tex.levels.values()) {
        textureBytes += level.bytes;
        if (tex.target) targetBytes += level.bytes;
        else maxTextureSize = Math.max(maxTextureSize, level.width, level.height, level.depth);
        if (!formats.has(level.format)) unknown.add(level.format);
      }
      const bufferBytes = [...buffers.values()].reduce((a, b) => a + b, 0);
      const renderbufferBytes = [...renderbuffers.values()].reduce((a, b) => a + b.bytes, 0);
      for (const rb of renderbuffers.values()) if (!formats.has(rb.format)) unknown.add(rb.format);
      targetBytes += renderbufferBytes;
      const glBytes = textureBytes + bufferBytes + renderbufferBytes;
      const canvas = canvasBytes();
      const totalBytes = glBytes + canvas;
      peakBytes = Math.max(peakBytes, totalBytes);
      targetPeakBytes = Math.max(targetPeakBytes, targetBytes);
      return { glBytes, bufferBytes, textureBytes, renderbufferBytes, targetBytes, assetBytes: glBytes - targetBytes,
        canvasBytes: canvas, totalBytes, peakBytes, targetPeakBytes, buffers: buffers.size, textures: textures.size, renderbuffers: renderbuffers.size,
        maxTextureSize, unknownFormats: [...unknown], lost };
    },
    resetPeaks() { peakBytes = 0; targetPeakBytes = 0; recordPeak(); },
    dispose() {
      for (const restore of originals.reverse()) restore();
      gl.canvas.removeEventListener('webglcontextlost', onLost);
      gl.canvas.removeEventListener('webglcontextrestored', onRestore);
      clear();
    },
  };
}
