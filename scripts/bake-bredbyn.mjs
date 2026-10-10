// Rebuild the original public environment bank, then use the normal build-assets packing pipeline.
// Node 22.12+: node --experimental-strip-types scripts/bake-bredbyn.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Group } from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { bredbynLandmarks } from '../art/procedural/bredbyn-landmarks.ts';
import { bredbynStreet } from '../art/procedural/bredbyn-street.ts';

// GLTFExporter uses this browser interface for its binary buffer; no images or DOM are involved.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(buffer => { this.result = buffer; this.onloadend?.(); });
  }
};
const bank = new Group();
bank.name = 'bredbyn';
bank.add(bredbynLandmarks(), bredbynStreet());
const binary = await new GLTFExporter().parseAsync(bank, { binary: true });
const directory = fileURLToPath(new URL('../art/baked/boot/', import.meta.url));
mkdirSync(directory, { recursive: true });
writeFileSync(`${directory}/bredbyn.glb`, new Uint8Array(binary));
console.log(`Bredbyn: ${binary.byteLength} bytes; original church, belfry and street geometry.`);
