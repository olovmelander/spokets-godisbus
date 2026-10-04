import type { CompressedTexture, Texture, WebGLRenderer } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

type Model = Pick<GLTF, 'parser'>;
interface Entry { texture: CompressedTexture; index: number; released: boolean; uploaded: boolean; shape: string }
export interface TextureOwnershipInfo { managed: number; released: number; cpuBytes: number; restores: number }

/** Only immutable 2D KTX2 pack textures. Procedural textures, bones, morphs and unknown sources stay intact. */
function supported(texture: Texture): texture is CompressedTexture {
  const candidate = texture as CompressedTexture & { isCompressedArrayTexture?: boolean; isCubeTexture?: boolean };
  return candidate.isCompressedTexture === true && !candidate.isCompressedArrayTexture && !candidate.isCubeTexture
    && candidate.mipmaps.length > 0 && candidate.mipmaps.every((level) => ArrayBuffer.isView(level.data)
      && level.data.byteLength > 0 && level.width > 0 && level.height > 0);
}
const shape = (texture: CompressedTexture) => `${texture.format}:${texture.type}:` + texture.mipmaps.map((m) => `${m.width}x${m.height}`).join(',');
function mapped(model: Model): Map<Texture, number> {
  const result = new Map<Texture, number>();
  // Typed GLTFLoader metadata covers texture-transform clones without depending on actor names or topology.
  for (const [object, reference] of model.parser.associations) {
    if ((object as Texture).isTexture && Number.isInteger(reference?.textures)) result.set(object as Texture, reference.textures!);
  }
  return result;
}

export function createTextureOwnership(
  renderer: Pick<WebGLRenderer, 'initTexture' | 'getContext'>,
  reload: (url: string) => Promise<Model>,
) {
  const packs = new Map<string, Entry[]>();
  const known = new WeakSet<Texture>();
  let suspended = false;
  let generation = 0;
  let restores = 0;
  const contextLost = () => renderer.getContext().isContextLost();

  function upload(entries: Entry[]): void {
    if (contextLost()) return;
    // Upload every alias before releasing any payload. Sampler/colour-space variants may share CPU
    // mip objects but own separate GL storage. A cache hit need not invoke onUpdate again.
    for (const entry of entries) {
      if (entry.released) continue;
      renderer.initTexture(entry.texture);
      if (contextLost()) return;
      entry.uploaded = true;
    }
    for (const entry of entries) if (entry.uploaded && !entry.released) {
      // Keep Texture/Source identities and image dimensions; do not mutate shared mip objects.
      entry.texture.mipmaps = [];
      entry.released = true;
    }
  }

  return {
    track(url: string, model: Model): void {
      const entries = packs.get(url) ?? [];
      packs.set(url, entries);
      const added: Entry[] = [];
      for (const [texture, index] of mapped(model)) {
        if (known.has(texture) || !supported(texture)) continue;
        known.add(texture);
        const entry: Entry = { texture, index, released: false, uploaded: false, shape: shape(texture) };
        const before = texture.onUpdate;
        texture.onUpdate = (one) => { before?.(one); if (!contextLost()) entry.uploaded = true; };
        entries.push(entry);
        added.push(entry);
      }
      if (!suspended) upload(added);
    },
    suspend(): void { suspended = true; generation++; },
    async restore(): Promise<void> {
      const ticket = generation;
      suspended = true;
      // Validate every re-fetched pack before touching live textures. Failures leave play paused and
      // retryable instead of drawing empty mip data. URLs are the original build's content versions.
      const staged = await Promise.all([...packs].map(async ([url, entries]) => {
        if (!entries.some((entry) => entry.released)) return [];
        const fresh = await reload(url);
        const sources = new Map<number, CompressedTexture>();
        for (const [texture, index] of mapped(fresh)) if (supported(texture)) sources.set(index, texture);
        return entries.map((entry) => {
          const source = sources.get(entry.index);
          if (!source || shape(source) !== entry.shape) throw new Error('Restored pack texture does not match its versioned source');
          return { entry, source };
        });
      }));
      if (ticket !== generation || contextLost()) throw new Error('Texture restoration was interrupted');
      for (const { entry, source } of staged.flat()) {
        entry.texture.image = { ...source.image };
        entry.texture.mipmaps = source.mipmaps.slice();
        entry.texture.needsUpdate = true;
        entry.uploaded = false;
        entry.released = false;
      }
      // Assets arriving during refetch retain their original data and are included here. No actors,
      // materials, skeletons or simulation objects are replaced by the temporary parsed model.
      upload([...packs.values()].flat());
      if (ticket !== generation || contextLost()) throw new Error('Texture restoration was interrupted');
      suspended = false;
      restores++;
    },
    info(): TextureOwnershipInfo {
      const entries = [...packs.values()].flat();
      const buffers = new Set<ArrayBufferLike>();
      for (const entry of entries) for (const level of entry.texture.mipmaps) buffers.add(level.data.buffer);
      return { managed: entries.length, released: entries.filter((entry) => entry.released).length,
        cpuBytes: [...buffers].reduce((bytes, buffer) => bytes + buffer.byteLength, 0), restores };
    },
  };
}
