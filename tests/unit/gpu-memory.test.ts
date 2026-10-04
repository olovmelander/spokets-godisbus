import { describe, expect, it } from 'vitest';
import { gpuFailures, levelBytes, observeGpu } from '../../src/render/gpu-memory';

// A GL storage fixture: native bindings and return/throw behaviour are independent of the observer.
function context() {
  const values: Record<number, unknown> = {};
  const calls: unknown[][] = [];
  const gl: any = {
    canvas: new EventTarget(), drawingBufferWidth: 10, drawingBufferHeight: 20,
    ARRAY_BUFFER: 1, ARRAY_BUFFER_BINDING: 2, ELEMENT_ARRAY_BUFFER: 3, ELEMENT_ARRAY_BUFFER_BINDING: 4,
    TEXTURE_2D: 10, TEXTURE_BINDING_2D: 11, TEXTURE_3D: 12, TEXTURE_BINDING_3D: 13,
    TEXTURE_2D_ARRAY: 14, TEXTURE_BINDING_2D_ARRAY: 15, TEXTURE_CUBE_MAP: 16, TEXTURE_BINDING_CUBE_MAP: 17,
    TEXTURE_CUBE_MAP_POSITIVE_X: 20, TEXTURE_CUBE_MAP_NEGATIVE_Z: 25,
    RENDERBUFFER_BINDING: 30, RGBA8: 40, RGBA16F: 41, DEPTH_COMPONENT24: 42,
    RGBA: 43, HALF_FLOAT: 44, RG: 45, R8: 46, FLOAT: 47,
    TEXTURE_BASE_LEVEL: 70, TEXTURE_MAX_LEVEL: 71,
    getParameter: (name: number) => values[name] ?? null,
    getContextAttributes: () => ({ depth: true, stencil: false }),
  };
  for (const name of ['bufferData', 'deleteBuffer', 'createTexture', 'deleteTexture', 'texImage2D', 'texImage3D',
    'texStorage2D', 'texStorage3D', 'compressedTexImage2D', 'compressedTexImage3D', 'copyTexImage2D',
    'generateMipmap', 'texParameteri', 'texParameterf', 'renderbufferStorage', 'renderbufferStorageMultisample', 'deleteRenderbuffer',
    'framebufferTexture2D', 'framebufferTextureLayer']) {
    gl[name] = function (...args: unknown[]) { expect(this).toBe(gl); calls.push([name, ...args]); return name === 'createTexture' ? {} : undefined; };
  }
  return { gl, calls, bind: (binding: number, key: object) => { values[binding] = key; }, observe: () => observeGpu(gl) };
}

describe('GPU allocation bytes', () => {
  it('rounds block-compressed storage, including tiny PVRTC levels', () => {
    expect(levelBytes({ bytes: 16, blockWidth: 4, blockHeight: 4 }, 7, 5)).toBe(64);
    expect(levelBytes({ bytes: 8, blockWidth: 8, blockHeight: 4, minWidth: 16, minHeight: 8 }, 1, 1)).toBe(32);
    expect(levelBytes({ bytes: 4 }, 0, 20)).toBe(0);
  });

  it('counts typed-array slices and replaces a buffer on reallocation', () => {
    const { gl, bind, observe } = context();
    const tracker = observe();
    const buffer = {};
    bind(gl.ARRAY_BUFFER_BINDING, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(10), 0, 2, 3);
    expect(tracker.snapshot().bufferBytes).toBe(12);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(10), 0, 2, 0);
    expect(tracker.snapshot().bufferBytes).toBe(32);
    gl.bufferData(gl.ARRAY_BUFFER, new DataView(new ArrayBuffer(16)), 0, 4, 0);
    expect(tracker.snapshot().bufferBytes).toBe(12);
    gl.bufferData(gl.ARRAY_BUFFER, 8, 0);
    expect(tracker.snapshot().bufferBytes).toBe(8);
    gl.deleteBuffer(buffer);
    expect(tracker.snapshot().bufferBytes).toBe(0);
  });

  it('captures transient allocations at allocation time, before any snapshot', () => {
    const { gl, bind, observe } = context();
    const tracker = observe();
    const buffer = {};
    bind(gl.ELEMENT_ARRAY_BUFFER_BINDING, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, 3000, 0);
    gl.deleteBuffer(buffer);
    expect(tracker.snapshot()).toMatchObject({ glBytes: 0, canvasBytes: 1600, peakBytes: 4600 });
  });
  it('gates transient peaks and starts the next tier at its live allocation baseline', () => {
    const { gl, bind, observe } = context();
    const tracker = observe();
    const buffer = {};
    bind(gl.ARRAY_BUFFER_BINDING, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, 101e6, 0);
    gl.deleteBuffer(buffer);
    expect(gpuFailures(tracker.snapshot(), 'low')).toHaveLength(1);
    tracker.resetPeaks();
    expect(tracker.snapshot().peakBytes).toBe(1600);
    expect(gpuFailures(tracker.snapshot(), 'low')).toEqual([]);
    const rb = {};
    bind(gl.RENDERBUFFER_BINDING, rb);
    gl.renderbufferStorage(0, gl.RGBA8, 5000, 5000);
    gl.deleteRenderbuffer(rb);
    expect(tracker.snapshot().targetBytes).toBe(0);
    expect(gpuFailures(tracker.snapshot(), 'high')).toEqual(['High target peak 100000000 > 80000000']);
  });

  it('counts all six cube faces and immutable mip levels once', () => {
    const { gl, bind, observe } = context();
    const tracker = observe();
    const tex = gl.createTexture();
    bind(gl.TEXTURE_BINDING_CUBE_MAP, tex);
    gl.texStorage2D(gl.TEXTURE_CUBE_MAP, 2, gl.RGBA8, 4, 4);
    expect(tracker.snapshot().textureBytes).toBe(6 * (16 + 4) * 4);
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    expect(tracker.snapshot().textureBytes).toBe(480);
    gl.deleteTexture(tex);
    expect(tracker.snapshot().textures).toBe(0);
  });

  it('shrinks 3D depth through mips but retains array layers', () => {
    const { gl, bind, observe } = context();
    const tracker = observe();
    bind(gl.TEXTURE_BINDING_3D, gl.createTexture());
    gl.texStorage3D(gl.TEXTURE_3D, 3, gl.R8, 4, 4, 4);
    bind(gl.TEXTURE_BINDING_2D_ARRAY, gl.createTexture());
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 3, gl.R8, 4, 4, 4);
    expect(tracker.snapshot().textureBytes).toBe(64 + 8 + 1 + (16 + 4 + 1) * 4);
  });

  it('uses compressed blocks rather than an upload buffer with offset padding', () => {
    const { gl, bind, observe } = context();
    const tracker = observe();
    bind(gl.TEXTURE_BINDING_2D, gl.createTexture());
    gl.compressedTexImage2D(gl.TEXTURE_2D, 0, 0x9278, 7, 5, 0, new Uint8Array(96), 32, 64);
    expect(tracker.snapshot()).toMatchObject({ textureBytes: 64, unknownFormats: [] });
  });

  it('counts unsized floating textures and generated mutable mips', () => {
    const { gl, bind, observe } = context();
    const tracker = observe();
    bind(gl.TEXTURE_BINDING_2D, gl.createTexture());
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 4, 4, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.generateMipmap(gl.TEXTURE_2D);
    expect(tracker.snapshot().textureBytes).toBe((16 + 4 + 1) * 8);
  });

  it('counts source-image dimensions and redefined texture levels', () => {
    const { gl, bind, observe } = context();
    const tracker = observe();
    bind(gl.TEXTURE_BINDING_2D, gl.createTexture());
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, 0, { naturalWidth: 16, naturalHeight: 8 });
    expect(tracker.snapshot().textureBytes).toBe(512);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 2, 2, 0, gl.RGBA, 0, null);
    expect(tracker.snapshot().textureBytes).toBe(16);
  });
  it('generates mutable mip storage within a nonzero base and maximum level', () => {
    const { gl, bind, observe } = context();
    const tracker = observe();
    bind(gl.TEXTURE_BINDING_2D, gl.createTexture());
    gl.texImage2D(gl.TEXTURE_2D, 2, gl.RGBA8, 8, 8, 0, gl.RGBA, 0, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_BASE_LEVEL, 2);
    gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, 4);
    gl.generateMipmap(gl.TEXTURE_2D);
    expect(tracker.snapshot().textureBytes).toBe((64 + 16 + 4) * 4);
  });

  it('counts shared FBO textures once and distinguishes targets from asset limits', () => {
    const { gl, bind, observe } = context();
    const tracker = observe();
    const target = gl.createTexture();
    bind(gl.TEXTURE_BINDING_2D, target);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 2500, 2, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.framebufferTexture2D(0, 0, gl.TEXTURE_2D, target, 0);
    gl.framebufferTextureLayer(0, 0, target, 0, 0);
    expect(tracker.snapshot()).toMatchObject({ targetBytes: 40000, assetBytes: 0, maxTextureSize: 0 });
    expect(gpuFailures(tracker.snapshot(), 'high')).toEqual([]);
  });

  it('counts multisample depth storage and releases it', () => {
    const { gl, bind, observe } = context();
    const tracker = observe();
    const target = {};
    bind(gl.RENDERBUFFER_BINDING, target);
    gl.renderbufferStorageMultisample(0, 4, gl.DEPTH_COMPONENT24, 100, 20);
    expect(tracker.snapshot()).toMatchObject({ renderbufferBytes: 32000, targetBytes: 32000 });
    gl.renderbufferStorage(0, gl.DEPTH_COMPONENT24, 10, 20);
    expect(tracker.snapshot().renderbufferBytes).toBe(800);
    gl.deleteRenderbuffer(target);
    expect(tracker.snapshot().targetBytes).toBe(0);
  });

  it('clears lost allocations and captures rebuilt resources on restore', () => {
    const { gl, bind, observe } = context();
    const tracker = observe();
    bind(gl.ARRAY_BUFFER_BINDING, {});
    gl.bufferData(gl.ARRAY_BUFFER, 128, 0);
    gl.canvas.dispatchEvent(new Event('webglcontextlost'));
    gl.bufferData(gl.ARRAY_BUFFER, 1024, 0);
    expect(tracker.snapshot()).toMatchObject({ glBytes: 0, canvasBytes: 0, lost: true });
    gl.canvas.addEventListener('webglcontextrestored', () => gl.bufferData(gl.ARRAY_BUFFER, 256, 0));
    gl.canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(tracker.snapshot()).toMatchObject({ glBytes: 256, canvasBytes: 1600, lost: false });
  });

  it('keeps native return values, arguments and exceptions, then restores methods on disposal', () => {
    const { gl, calls, observe } = context();
    const nativeCreate = gl.createTexture;
    const nativeDelete = gl.deleteTexture;
    const failure = new Error('native failure');
    gl.bufferData = () => { throw failure; };
    const receivers: unknown[] = [];
    gl.copyTexImage2D = function (this: unknown) { receivers.push(this); };
    const tracker = observe();
    const texture = gl.createTexture();
    gl.deleteTexture(texture);
    expect(calls).toEqual([['createTexture'], ['deleteTexture', texture]]);
    expect(() => gl.bufferData(1, 20, 0)).toThrow(failure);
    const foreign = {};
    gl.copyTexImage2D.call(foreign);
    expect(receivers).toEqual([foreign]);
    tracker.dispose();
    expect(gl.createTexture).toBe(nativeCreate);
    expect(gl.deleteTexture).toBe(nativeDelete);
  });

  it('fails closed for unknown formats, oversized assets, and each tier limit', () => {
    const { gl, bind, observe } = context();
    const tracker = observe();
    bind(gl.TEXTURE_BINDING_2D, gl.createTexture());
    gl.texStorage2D(gl.TEXTURE_2D, 1, 12345, 4096, 1);
    expect(gpuFailures(tracker.snapshot(), 'low')).toEqual(['Asset texture 4096 > 2048', 'Uncounted GL formats: 12345']);
    const info = tracker.snapshot();
    for (const [tier, limit] of [['low', 100e6], ['mid', 150e6], ['high', 220e6]] as const) {
      expect(gpuFailures({ ...info, maxTextureSize: 1, unknownFormats: [], totalBytes: limit }, tier)).toEqual([]);
      expect(gpuFailures({ ...info, maxTextureSize: 1, unknownFormats: [], totalBytes: limit + 1 }, tier)).toHaveLength(1);
    }
    expect(gpuFailures({ ...info, maxTextureSize: 1, unknownFormats: [], targetBytes: 80e6 + 1 }, 'high')).toHaveLength(1);
    expect(gpuFailures({ ...info, maxTextureSize: 1, unknownFormats: [], totalBytes: Number.NaN }, 'high')).toEqual(['GPU byte count is not finite']);
    expect(gpuFailures({ ...info, maxTextureSize: 1, unknownFormats: [], peakBytes: Number.NaN }, 'high')).toEqual(['GPU byte count is not finite']);
  });
});
