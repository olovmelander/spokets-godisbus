import { LoadingManager, type Group, type WebGLRenderer } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import transcoderJS from 'three/examples/jsm/libs/basis/basis_transcoder.js?url';
import transcoderWASM from 'three/examples/jsm/libs/basis/basis_transcoder.wasm?url';
import { fetchAsset } from './fetch-asset';
import { createMeshoptDecoder } from './meshopt';
import { createTextureOwnership, type TextureOwnershipInfo } from './texture-ownership';

/** public/packs/manifest.json, as written by scripts/build-assets.mjs. */
export interface Manifest {
  version: number;
  packs: Record<string, { bytes: number; files: Record<string, number>; hashes?: Record<string, string> }>;
}

export interface Assets {
  /** Loads public/packs/<pack>/<name>.glb, as written by scripts/build-assets.mjs. */
  model(pack: string, name: string): Promise<Group>;
  /** Which packs and files this build has. A private pack is only there where its files are. */
  manifest(): Promise<Manifest>;
  restoreTextures(): Promise<void>;
  textureInfo(): TextureOwnershipInfo;
}

/**
 * Models come from Blender as glTF with meshopt-compressed meshes and KTX2 textures (plan §6.6).
 * The Basis transcoder that KTX2 needs is part of three; Vite emits it with the build.
 */
export function createAssets(renderer: WebGLRenderer): Assets {
  const manager = new LoadingManager();
  const ktx2 = new KTX2Loader(manager).setTranscoderPath('decoder/').detectSupport(renderer);
  // The meshes' decoder is a file of its own, fetched with the same retries as the packs (./meshopt.ts).
  const meshopt = createMeshoptDecoder((url) => fetchAsset(url, (response) => response.arrayBuffer()));
  const loader = new GLTFLoader().setKTX2Loader(ktx2).setMeshoptDecoder(meshopt);
  let decoder: Promise<void> | null = null;
  const initDecoder = () => decoder ??= (async () => {
    // The decoder is required too. Fetch its hashed Vite URLs with the same retry/deadline budget,
    // then give Three local blobs through its public LoadingManager API.
    const files = await Promise.all([transcoderJS, transcoderWASM].map((url) => fetchAsset(url, (r) => r.blob())));
    const urls = files.map((file) => URL.createObjectURL(file));
    manager.setURLModifier((url) => url === 'decoder/basis_transcoder.js' ? urls[0]! : url === 'decoder/basis_transcoder.wasm' ? urls[1]! : url);
    try { await Promise.all([ktx2.init(), meshopt.ready]); }
    finally { urls.forEach((url) => URL.revokeObjectURL(url)); }
  })();
  let manifest: Promise<Manifest> | null = null;
  const readManifest = () => manifest ??= fetchAsset(`${import.meta.env.BASE_URL}packs/manifest.json?v=${__ASSET_VERSION__}`,
    (response) => response.json() as Promise<Manifest>);
  const parse = async (url: string) => {
    const [bytes] = await Promise.all([fetchAsset(url, (response) => response.arrayBuffer()), initDecoder()]);
    return loader.parseAsync(bytes, url.slice(0, url.lastIndexOf('/') + 1));
  };
  const textures = createTextureOwnership(renderer, parse);
  renderer.domElement.addEventListener('webglcontextlost', () => textures.suspend());
  return {
    async model(pack, name) {
      const hash = (await readManifest()).packs[pack]?.hashes?.[`${name}.glb`];
      const url = `${import.meta.env.BASE_URL}packs/${pack}/${name}.glb${hash ? `?v=${hash}` : ''}`;
      const gltf = await parse(url);
      textures.track(url, gltf);
      return gltf.scene;
    },
    manifest() {
      return readManifest();
    },
    restoreTextures: () => textures.restore(),
    textureInfo: () => textures.info(),
  };
}
