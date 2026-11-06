import { Box3, Float32BufferAttribute, Group, InstancedMesh, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, Vector3 } from 'three';
import type { Assets } from './assets';
import { forestKit } from './forest-kit';

/** Authored models shared by both adventures. Only files actually used in this scene are fetched. */
/** Which pack and file each model is in. What is mormor and morfar's own is in the private pack, and is only there on the site. */
const NATURE = ['gran-a', 'gran-b', 'gran-c', 'bjork-a', 'bjork-b', 'tall-a', 'block-a', 'block-b', 'block-c', 'block-d', 'hylla-a', 'hylla-b',
  'stubbe-sagad', 'stubbe-gnagd', 'gren-a', 'gren-b', 'lag-mossig', 'stock-flod', 'vass-a', 'vass-b', 'klippa-a', 'klippa-b'];
const PROPS = ['kruka', 'stovel', 'paraply', 'flotte', 'bryggstolpe', 'lykta', 'tunna', 'kanna', 'pumpa', 'bil', 'bil-gra'];
const BUILT = ['rutschkana', 'picknick', 'staket', 'bro', 'trappa', 'vedstapel', 'rabatt', 'roddbat'];
const ROOM = ['soffa', 'soffa-filt', 'golvlampa', 'krukvaxt', 'bord', 'stol', 'pall', 'holme'];
const CREATURES = ['uggla', 'uggla-flyger', 'uggla-vinge-n', 'uggla-vinge-f', 'utter', 'igelkott', 'snigel', 'groda', 'and', 'and-hona'];
/** Pappa's carvings are made after his own, so they are in the private pack with the family, and the stand-ins stay where it is not. */
const CARVINGS = ['tragubbe', 'lillgubbe', 'hylla-luva', 'hylla-kotte', 'hylla-svamp', 'hylla-gumma', 'hylla-fiskare', 'hylla-rock', 'hylla-keps', 'hylla-bjorn'];
const FILES: Record<string, readonly [pack: string, file: string]> = {
  ...Object.fromEntries(CREATURES.map((name) => [name, ['aventyr2', 'creatures'] as const])),
  ...Object.fromEntries(CARVINGS.map((name) => [name, ['private', 'tragubbar'] as const])),
  ...Object.fromEntries(PROPS.map((name) => [name, ['aventyr2', 'props'] as const])),
  ...Object.fromEntries(BUILT.map((name) => [name, ['aventyr2', 'built'] as const])),
  ...Object.fromEntries(ROOM.map((name) => [name, ['aventyr2', 'room'] as const])),
  ...Object.fromEntries(NATURE.map((name) => [name, ['aventyr2', 'nature'] as const])),
  'olympia-hall': ['aventyr2', 'olympia'],
  'olympia-stand': ['aventyr2', 'olympia'],
  'billsta-house': ['private', 'billsta-house'],
  'billsta-barn': ['private', 'billsta-house'],
  lekstuga: ['private', 'lekstuga'],
  'lekstuga-hus': ['private', 'lekstuga'],
};

const installed = new WeakSet<Object3D>();

/**
 * Replace rehearsal geometry before shader warm-up, keeping the scene's placement and interaction anchors.
 * Private carvings and buildings obey the same public-preview switch as the family. Missing exports leave
 * their fallback intact and can be retried; repeated calls never shift retained windows or reload a model.
 */
export async function installSharedModels(assets: Assets, scene: Object3D, standIns = false, onLoaded?: (file: string) => void): Promise<boolean> {
  const wanted: Object3D[] = [];
  scene.traverse(object => {
    if (!installed.has(object) && (typeof object.userData.model === 'string' || typeof object.userData.grandparent === 'string')) wanted.push(object);
  });
  const drops = scene.getObjectByName('rain-drops') as InstancedMesh | undefined;
  const cones = drops?.userData.cones && !installed.has(drops);
  if (wanted.length === 0 && !cones) return false;
  const manifest = await assets.manifest();
  const files = new Map<string, Promise<Group | null>>();
  const used = new Set<string>();
  const record = (pack: string, file: string) => {
    const key = `${pack}/${file}`;
    if (!used.has(key)) { used.add(key); onLoaded?.(key); }
  };
  const load = (pack: string, file: string): Promise<Group | null> => {
    if ((standIns && pack === 'private') || !manifest.packs[pack]?.files[`${file}.glb`]) return Promise.resolve(null);
    const key = `${pack}/${file}`;
    if (!files.has(key)) files.set(key, assets.model(pack, file).catch(error => {
      console.warn(`The ${key} models could not be loaded; their stand-ins stay.`, error);
      return null;
    }));
    return files.get(key)!;
  };
  // Start independent files together, then install them deterministically in scene order.
  for (const place of wanted) {
    const source = FILES[place.userData.model as string];
    if (source) void load(...source);
  }
  let arrived = false;
  for (const place of wanted) {
    const who = place.userData.grandparent as string | undefined;
    if (who && !standIns && manifest.packs.private?.files[`${who}.glb`]) {
      // Each actor needs its own skeleton; do not share the cached scene between grandparents.
      const model = await assets.model('private', who).catch(error => {
        console.warn(`The private/${who} model could not be loaded; its stand-in stays.`, error);
        return null;
      });
      // A failed optional actor must not prevent the rest of the room or family from arriving.
      if (!model) continue;
      (place.userData.dress as (model: Object3D) => void)(model);
      installed.add(place);
      record('private', who);
      arrived = true;
      continue;
    }
    const name = place.userData.model as string;
    const source = FILES[name];
    if (!source) continue;
    const model = await load(...source);
    const made = model?.getObjectByName(name);
    if (!made) continue;
    const kept = place.children.filter(child => typeof child.userData.keep === 'number');
    // Only holders that own their rehearsal resources opt in. Other scenery can share kit materials;
    // never dispose the loaded model's resources, which its instances deliberately share.
    if (place.userData.disposeFallback) {
      const geometries = new Set<Mesh['geometry']>();
      const materials = new Set<MeshStandardMaterial>();
      for (const child of place.children) if (!kept.includes(child)) child.traverse(object => {
        const mesh = object as Mesh;
        if (!mesh.isMesh) return;
        geometries.add(mesh.geometry);
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(material as MeshStandardMaterial);
      });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
    }
    place.clear();
    for (const child of kept) {
      child.position.z += child.userData.keep as number;
      place.add(child);
    }
    // Packed-node transforms encode quantisation. Fit and placement belong to a wrapper around that node.
    const copy = new Group();
    copy.add(made.clone());
    const fit = place.userData.fit as number | undefined;
    if (fit) copy.scale.setScalar(fit);
    if (typeof place.userData.turn === 'number') copy.rotation.y = place.userData.turn as number;
    if (typeof place.userData.lift === 'number') copy.position.y = place.userData.lift as number;
    if (typeof place.userData.shift === 'number') copy.position.x = place.userData.shift as number;
    if (typeof place.userData.back === 'number') copy.position.z = place.userData.back as number;
    const block = place.userData.block as { width: number; height: number; depth: number; x: number; y: number; z?: number } | undefined;
    if (block) {
      const size = new Box3().setFromObject(made).getSize(new Vector3());
      copy.scale.set(block.width / size.x, block.height / size.y, block.depth / size.z);
      copy.position.set(block.x, block.y - block.height / 2, block.z ?? 0);
    }
    place.add(copy);
    if (place.userData.warm) warmed(copy);
    // Clone these too: repeated houses must not steal each other's sign or lit windows.
    for (const [suffix, colour] of [['name', '#e8ecec'], ['glow', '#ffc870']] as const) {
      const source = model!.getObjectByName(`${name}-${suffix}`) as Mesh | undefined;
      if (!source) continue;
      const detail = source.clone();
      detail.material = new MeshBasicMaterial({ color: colour, fog: suffix !== 'glow' });
      copy.add(detail);
    }
    (place.userData.onModelInstalled as ((model: Group) => void) | undefined)?.(copy);
    installed.add(place);
    record(...source);
    arrived = true;
  }
  if (cones) {
    const model = await load('boot', 'forest-kit');
    const kit = model ? forestKit(model) : null;
    const shape = kit?.shape('kotte')?.clone();
    if (shape) {
      const size = new Box3().setFromBufferAttribute(shape.getAttribute('position') as Float32BufferAttribute).getSize(new Vector3());
      if (size.x > size.y && size.x >= size.z) shape.rotateZ(Math.PI / 2);
      else if (size.z > size.y) shape.rotateX(Math.PI / 2);
      shape.center();
      const scale = 0.7 / Math.max(size.x, size.y, size.z);
      shape.scale(scale, scale, scale);
      if (drops!.userData.disposeFallback) {
        drops!.geometry.dispose();
        for (const material of Array.isArray(drops!.material) ? drops!.material : [drops!.material]) material.dispose();
      }
      drops!.geometry = shape;
      drops!.material = kit!.material;
      installed.add(drops!);
      record('boot', 'forest-kit');
      arrived = true;
    }
  }
  return arrived;
}


/** The two of them at the meeting: a little warmth of their own, so that they are the warmest thing on the cold stone. */
function warmed(figure: Group): void {
  figure.traverse((object) => {
    const mesh = object as Mesh;
    const material = mesh.material as MeshStandardMaterial | undefined;
    if (!material?.isMeshStandardMaterial) return;
    mesh.material = material.clone();
    (mesh.material as MeshStandardMaterial).emissive.set('#5a3a1c');
    (mesh.material as MeshStandardMaterial).emissiveIntensity = 0.7;
  });
}

