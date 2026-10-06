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

Installed from npm, never copied into the repository. Three, planck and Workbox are part of the game that is
served; the rest are tools.

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
| vite-plugin-pwa | 1.3.0 | MIT | Web app manifest and service-worker build |
| workbox-core, workbox-precaching, workbox-routing, workbox-strategies, workbox-expiration | 7.4.1 | MIT | Offline shell, bounded chapter caches and safe updates |

Two tools are installed on the computer and never copied into the repository: **KTX-Software** 4.4.2
(Apache-2.0), whose `ktx` writes the KTX2 textures, and **Blender** 4.5 LTS (GPL, which covers the tool and not
the files made with it). three's Basis transcoder (Apache-2.0) is served with the game, from the three package.

## Code from Olov's other projects

- `src/input/input.ts` is ported from *Sköldhästen*'s `skoldhast/src/input.mjs` (`olovmelander/alva-10-birthday`
  at `5438e23`), which is Olov's own.

## Files

| File | What it is | Source and licence |
| --- | --- | --- |
| `src/render/meshopt/decoder-{base,simd}.wasm` | The meshes' decoder: meshoptimizer 1.1's WebAssembly, as files of their own, and the few lines that drive it in `src/render/meshopt.ts` | meshoptimizer by Arseny Kapoulkine, MIT. Written out by `scripts/meshopt-wasm.mjs` from the copy three 0.186.1 carries inside `examples/jsm/libs/meshopt_decoder.module.js` (MIT); a unit test holds them equal. |
| `public/icons/ghost-maskable-512.png` | Android's maskable icon | The same SVG ghost from `index.html`, on its cream background to the edges and inside the middle 80 %, rendered with sharp. Made in code for this game; no reference image or new likeness. |
| `public/icons/ghost-{180,192,512}.png` | Home Screen icons | Exact SVG ghost already drawn in `index.html`, rendered on its existing cream background with sharp. Made in code for this game; no reference image or new likeness. |
| In-memory thought pictures in `src/render/ghost-thought.ts` | Symbolic mountain, pine/crack and the existing pointed-cap first-figure icon | Plain canvas cutouts made in code for this game, in the existing story-card style. No reference picture, third-party art, character model or new likeness asset. |
| `art/baked/boot/big-candy.glb` | The big candy: a round swirl lollipop on a stick, with a bow | Made for this game in Blender by `art/blender/big-candy.py`, which also paints its texture. Nothing in it comes from anyone else. |
| `src/ui/kinds.webp` | The stickers of the sixteen hidden kinds, as one sheet of small pictures | Rendered in Blender by `art/blender/candy-stickers.py` from the candy kit's own models. Nothing in it comes from anyone else. |
| `art/baked/boot/candy.glb` | The candy kit: the trail's five sweets, the sixteen hidden kinds, the golden geléhallon, the glowing lollipop, the shrinking star, the jars' sweets, and Elof's Saturday bag with its tear | Made for this game in Blender by `art/blender/candy.py`: shapes built from numbers, colours painted on their corners, and their own shade baked in with Blender's Cycles. No texture. Plain sorts of candy, with no brand's shape or mark. Nothing in it comes from anyone else. |
| `art/baked/boot/jay.glb` | Lavskrikan, the Siberian jay: the helper, and the friend he shares a berry with | Made for this game in Blender by `art/blender/jay.py`: plain shapes in plain colours, with no texture. Nothing in it comes from anyone else. |
| `art/baked/boot/life.glb`, `art/baked/boot/life.json` | The pictures of the far scenery's life, as one atlas on a plane, and its numbers for the tests: a moose's walk, cranes and geese in flight, a puff of smoke, a far light, a shooting star | Made for this game in Blender by `art/blender/life.py`. The moose is built there from numbers and rendered with Blender's Cycles; the rest is drawn there from plain shapes. No model, picture or photograph of anyone else's is in it, and nothing was generated by an AI tool. |
| `art/baked/boot/forest-kit.glb` | The forest kit: a spruce cone in three makes (the ones he pushes and that roll, the ones on the floor, the one as big as a car), a moss cushion, three stones, a young spruce, a fern, chanterelles, a cep, a birch leaf, reindeer lichen; the fallen log, the anthill and the stone at the eddy; Bertil's cap, the leaf the ghost floats on, the twig, the seesaw's stick and stone, the vittra door, beard lichen and a root | Made for this game in Blender by `art/blender/forest-kit.py`: shapes built from numbers, colours painted on their corners, and their own shade baked in with Blender's Cycles. No texture, and no letter, numeral or mark on anything: the cap's badge is a plain round patch. The cap is built from the plan's words (plan §2.3), not from a picture. Nothing in it comes from anyone else. |
| `art/baked/boot/village.glb` | The village kit: the parts the street's houses are put together from (a stone foot with its drip board, upright and lying boards, a corner board, a downpipe, a door behind its step, a cellar window, the opening of a passage), a shop window for each of the four shops with its wares (yarn, boots, bread, sweets), two carved signs (a kringla, a boot), and a yard's low wall, fence, gatepost, hedge and birch | Made for this game in Blender by `art/blender/village.py`: shapes built from numbers, colours painted on their corners, and their own shade baked in with Blender's Cycles. No texture. The photos of Bredbyn's main street in `photos/landscape/` (never committed) were looked at for what a wooden house there is made of; no shape is taken from them, no front is a real shop's, and no part has a letter, a numeral or a mark. Nothing in it comes from anyone else. |
| `art/baked/boot/mountain-kit.glb` | The mountain kit: the old pine and two crooked pines for the rim, with the two shoots of needles they are set with, the seven rock shelves, the four boulders to shelter behind, the three stacks of the summit cairn, three stones, two cobbles and a cushion of reindeer lichen | Made for this game in Blender by `art/blender/mountain-kit.py`: shapes built from numbers, colours painted on their corners, and their own shade baked in with Blender's Cycles. No texture. Two photos in `photos/landscape/` (never committed) were looked at, of Gammtratten's summit and of a dead pine at Mossaträsk, for how pines stand on a mountain top there and how bare wood twists; no shape is taken from them. Nothing in it comes from anyone else. |

## Fonts

| File | What it is | Source and licence |
| --- | --- | --- |
| `public/fonts/andika-latin-400-normal.woff2`, `public/fonts/andika-latin-700-normal.woff2` | Andika, regular and bold, the game's typeface (plan §5.7): the Latin subset, with å, ä and ö | **Open:** SIL Open Font License 1.1, © 2004–2022 SIL International. Copied unchanged from the npm package `@fontsource/andika` 5.3.0 (`files/`). The licence is served beside them as `public/fonts/Andika-OFL.txt`. |
| `public/fonts/playpen-sans-700-sv.woff2` | Playpen Sans, bold: Moa's hand, for her words only (the time cards, the map's names, panel titles, section headings and the storybook page's title; `docs/ux-audit/style-and-sound.md` row 3) | **Open:** SIL Open Font License 1.1, © 2023 The Playpen Sans Project Authors (TypeTogether). Made from `files/playpen-sans-latin-700-normal.woff2` of the npm package `@fontsource/playpen-sans` 5.3.0 with fontTools' `pyftsubset`: kept to printable ASCII, the no-break space, · Ä Å É Ö Ü ä å é ö ü, – —, ‘ ’ “ ” and …, with its kerning and without its shuffled letter variants (`calt`). The licence names no Reserved Font Name, so the subset keeps its name. The licence is served beside it as `public/fonts/PlaypenSans-OFL.txt`. |

The test course, the stand-in Elof and the ghost on the loading card are made in code.
