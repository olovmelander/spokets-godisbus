import type { Group, WebGLRenderer } from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

/** public/packs/manifest.json, as written by scripts/build-assets.mjs. */
export interface Manifest {
  version: number;
  packs: Record<string, { bytes: number; files: Record<string, number> }>;
}

export interface Assets {
  /** Loads public/packs/<pack>/<name>.glb, as written by scripts/build-assets.mjs. */
  model(pack: string, name: string): Promise<Group>;
  /** Which packs and files this build has. A private pack is only there where its files are. */
  manifest(): Promise<Manifest>;
}

/**
 * Models come from Blender as glTF with meshopt-compressed meshes and KTX2 textures (plan §6.6).
 * The Basis transcoder that KTX2 needs is part of three; Vite emits it with the build.
 */
export function createAssets(renderer: WebGLRenderer): Assets {
  const ktx2 = new KTX2Loader().detectSupport(renderer);
  const loader = new GLTFLoader().setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);
  let manifest: Promise<Manifest> | null = null;
  return {
    async model(pack, name) {
      const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}packs/${pack}/${name}.glb`);
      return gltf.scene;
    },
    manifest() {
      manifest ??= fetch(`${import.meta.env.BASE_URL}packs/manifest.json`).then((response) => response.json() as Promise<Manifest>);
      return manifest;
    },
  };
}
