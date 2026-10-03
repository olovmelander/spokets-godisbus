# Licences

Every third-party or generated file in this repository is listed here with its source and licence (plan §5.6,
§7.5). Three categories are allowed:

1. **Open:** CC0, CC-BY (credited), OFL, MIT, BSD, Apache-2.0.
2. **Owned by Olov:** paid-tool output and AI-painted plates. Record the tool, the plan, the date and a link to
   the terms, including what the service does with uploads.
3. **Made by the family, with consent:** scans and photos.

Never: Mixamo, ActorCore, Megascans/Fab, Textures.com, or output from a free tier of an AI tool. Assets fetched
or generated through *MCP for Blender* are listed here like any other file: Sketchfab and Poly Pizza models only
under CC0 or CC BY, and never anything from Hunyuan3D (plan §5.6).

## Libraries

Installed from npm, never copied into the repository. The first two are part of the game that is served; the
rest are tools.

| Library | Version | Licence | Used for |
| --- | --- | --- | --- |
| three | 0.186.1 | MIT | Rendering |
| planck | 1.5.0 | MIT | Physics |
| vite | 8.3.2 | MIT | Build and dev server |
| typescript | 7.0.2 | Apache-2.0 | Type checking |
| vitest | 5.0.3 | MIT | Tests |
| playwright | 1.56.1 | Apache-2.0 | Browser tests |
| @vitejs/plugin-basic-ssl | 2.3.0 | MIT | HTTPS for `npm run dev:lan` |
| @gltf-transform/cli | 4.5.1 | MIT | The asset build: KTX2 textures and meshopt |
| @types/three | 0.186.0 | MIT | Types |

Two tools are installed on the computer and never copied into the repository: **KTX-Software** 4.4.2
(Apache-2.0), whose `ktx` writes the KTX2 textures, and **Blender** 4.5 LTS (GPL, which covers the tool and not
the files made with it). three's Basis transcoder (Apache-2.0) is served with the game, from the three package.

## Code from Olov's other projects

- `src/input/input.ts` is ported from *Sköldhästen*'s `skoldhast/src/input.mjs` (`olovmelander/alva-10-birthday`
  at `5438e23`), which is Olov's own.

## Files

| File | What it is | Source and licence |
| --- | --- | --- |
| `art/baked/boot/big-candy.glb` | The big candy: a striped sweet on a stick | Made for this game in Blender by `art/blender/big-candy.py`, which also paints its texture. Nothing in it comes from anyone else. |

There are no third-party asset files yet. The test course, the stand-in Elof and the ghost on the loading card
are made in code.
