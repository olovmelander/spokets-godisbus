# The visual upgrade

Olov, 4 November 2026: "en total visuell och grafisk uppgradering … behålla vår befintliga artstyle … men förbättra
grafiken och det visuella på alla plan". Every chapter of both adventures. This document is the brief: what is
built, within which budgets, and what may not change.

## Kort sammanfattning (på svenska)

- **Samma konststil, mer av allt.** Målat, mjukt och varmt som nu, men med mer liv, ljus, luft och djup.
- **Liv:**
  - ekorrar som kilar uppför stammar;
  - rävar i bakgrunden;
  - ugglor i träden;
  - småfåglar som lyfter när Elof kommer;
  - eldflugor, trollsländor och fjärilar;
  - små snälla skogsväsen och täljda träfigurer som tittar fram bakom stenar och rötter.
- **Växter:**
  - lummiga björkar och djupa tallskogar där solen lyser igenom löven;
  - tät mjuk mossa;
  - ormbunkar och högt gräs;
  - lysande svampar;
  - bäckar som speglar stranden;
  - våta ytor och daggdroppar.
- **Rörelse:**
  - gräs, ormbunkar och grenar böjer sig när Elof går igenom dem;
  - löv virvlar upp när han springer;
  - mer levande vilorörelser;
  - en enda gemensam vind som rör både trädkronor och karaktärernas detaljer.
- **Ljus och luft:**
  - ljusstrålar genom grenverket;
  - dammkorn och fallande löv i luften;
  - marknära morgondimma;
  - mjukt djupdis;
  - tydlig skillnad mellan matt täljt trä och blöt, glansig mossa.

## What must not change (art bible, plan)

- **The look:** painted and soft. The sun stands low and warm behind the scene, and shade is cool but never black.
  Each place keeps one palette (art bible §2.2–2.3). Nothing becomes photographic, and nothing becomes noisy.
- **The play plane stays readable:**
  - nothing in front covers his path (`ceilingAt`, `soft-cards.test.ts`);
  - candy stays the brightest, warmest thing;
  - **red, pink and gold are the candy's, the hooks' and the lingonberries'**, never fauna's, flora's or the
    light's.
- **Exciting, never scary (plan §3.7):**
  - nothing chases him;
  - the forest beings are small, round and friendly, with soft eyes that blink and no eye-shine or glare;
  - no spiders, wasps or snakes;
  - no darkness without a warm light near.
- **Candy is never next to a mushroom** (plan §4.3). Glowing mushrooms keep at least 1.5 EL from every candy.
- **Reduced motion** (`lessMotion()`): everything that moves by itself stands still; nothing flies or falls.
  Plants still bend under his own feet, gently, because that is his own action, but no leaves whirl up.
- **Flashes:** no flashing light. Fireflies and mushrooms glow and fade slowly, never more than once a second.
- **Nothing is compiled during play (gate 6).** Every new material is in the scene at warm-up. Counts change by
  `mesh.count` or `visible`, never by new materials.

## Plan exceptions Olov has now made

- **Light shafts and god rays** (plan §5.3 said "no ray-marched god rays, no volumetric fog"):
  - Mid and High: a **screen-space light-shaft pass**, a radial blur of a quarter-resolution occlusion mask from
    the sun's screen position, added inside the existing grade shader. No ray marching.
  - Low: better additive shaft cards.
  - "Volumetric" fog is layered soft mist cards and a height term in the haze, not a 3D volume.
- **Near life reacts to him.** Far life still "answers nothing" (far-scenery audit). The new near life behind the
  path (birds, squirrels, a fox) may notice him: birds lift, a squirrel runs up its trunk, a fox looks and trots
  off.
- **Character details in the wind** (plan §5.5 said "no cloth or hair simulation"): hair tips, a cap's brim and a
  scarf sway procedurally with the shared wind. This is secondary motion, not simulation.

## Budgets (widened 4 November 2026)

| Budget | Low | Mid | High | Where |
| --- | --- | --- | --- | --- |
| Draw calls a picture | **120** (unchanged) | **220** (was 160) | **300** (was 200) | `tests/browser/budget.mjs` |
| GPU memory | 100 MB | 150 MB | 220 MB | `src/render/gpu-memory.ts` |
| Render targets (High) | – | – | ≤ 80 MB | god rays at quarter resolution |
| Boot JS (gzipped) | 520 KB (was 450 KB) | | | `scripts/size-gate.mjs` |
| CPU busy (p95) | ≤ 10 ms | | | gate 5: animate on the GPU, not per instance on the CPU |

Low already draws 100–117 calls in its heaviest pictures, so almost everything new goes on the `rich` layer
(`userData.rich = true`, `src/render/rich.ts`), which Low does not draw, or is counted down on Low. Mid and High get
the full upgrade. Particles and plants scale with the tier: Low 30 %, Mid 60 %, High 100 % (plan §6.5's table,
now implemented).

## Architecture

- `src/render/lift/` holds the upgrade.
  - `index.ts` installs four areas: `atmosphere.ts`, `fauna.ts`, `flora.ts` and `materials.ts`. Each area may grow
    a folder of its own.
  - Each area registers its systems into `PACK.lifts` (`src/render/extensions.ts`). These are made for every
    chapter, A1 and A2, and updated each frame after the dressing, so `windAt()` is this frame's.
  - `ExtraContext` gives a system the chapter, scene, sky, hemisphere, sun, place look and the dressing's group.
  - `ExtraFrame` gives it dt, the clock, flags, Elof's x/y/vx/vy/facing/grounded/mode, the camera, `still`
    (reduced motion), the tier, whether he is riding, and how dark the place is.
- **The shared wind** (`src/render/wind.ts`) is the one source of motion: `windAt(x)` on the CPU, and the `wind-v1`
  chunk on the GPU. Bending as he passes is a player uniform in the same chunk, so it adds no program.
- **The post chain** (`view.ts` draw): scene → bloom → depth blur → *light shafts* → grade → output. The shafts are
  sampled by the grade shader like bloom.
- **Placement** reads the chapter's own data:
  - the ground (`heightAt`);
  - the water (`chapter.water`);
  - the dressing's trunks and stones (by name in the dressing group);
  - the candy, which life, mushrooms and peeking beings keep clear of.

## What each place gets

| Place | Life | Flora | Air and light |
| --- | --- | --- | --- |
| forest (Granskogen, Stormskogen, Älven) | squirrels on trunks, an owl, thrushes and tits that lift, a fox far back, beings and carved figures at roots | pines among the spruces, ferns, tall grass, moss on stones, glowing mushrooms in the dark | god rays through the crowns, motes in the shafts, needles and leaves falling, ground mist |
| garden (Gården, Stormgården, Olympia, Billsta) | small birds on the lawn, butterflies, a squirrel on the birch, fireflies at dusk | birch crowns with light through the leaves, tall grass at the edges, dew | sun through the birches, pollen motes, birch leaves falling |
| bog (Myren, Flärken, Stormens öga) | dragonflies over water, cranes far off, a fox at the forest edge | pines with crowns, cotton grass, moss | low morning mist, mist on water, soft distance haze |
| mountain and dusk (Berget, Norrsken) | ravens, a hare, an owl at dusk, fireflies at dusk | pines with crowns, moss and lichen | evening shafts, deep haze, the shining air at dusk |
| village (Byn, Byn i stormen) | sparrows that lift, a jackdaw on a roof | birch crowns over the yard | leaves falling, warm window light |
| home (Prolog, Stormkvällen, Morgonen efter, epilogue) | – | – | sun shafts through the window, dust in the light |

Äventyr 2's storm chapters keep their storm: the life hides (birds on branches, no butterflies), and the air is
rain. Fireflies and glowing mushrooms belong to the calm of the storm's eye and to the dusk.

## How it is checked

- **Unit tests:**
  - every lift system builds for every chapter of both adventures without error;
  - with reduced motion nothing moves by itself;
  - no fauna or flora tint is red, pink or gold;
  - mushrooms keep 1.5 EL from candy;
  - nothing new stands in front of the path.
- **Browser:** each chapter on Low, Mid and High is within its draw calls, compiles no program during play, and is
  within GPU memory. The existing suites must stay green.
- **Pictures:** review captures of every chapter before and after, with the stand-ins.

## As built (4 November 2026)

Built in one cloud session by five agents working side by side, one area each, from this brief. The main session
did the integration and the checks.

### Atmosphere and light (`src/render/light-shafts.ts`, `src/render/lift/atmosphere.ts`, `dressing/effects.ts`, `grade.ts`)

- **Light shafts on Mid and High.**
  - A mask is made at a quarter of each side from the HDR scene's colour and depth: light where nothing near wrote
    depth and the sky is bright.
  - Two 16-tap radial blurs follow, into two single-channel R8 targets, about 0.33 MB on High.
  - The grade adds the result before the LUT, in the place's colour, and only 10 % over the sky and far layers.
  - The shafts fan from above the picture along the sun's direction, from the painted sun on the bog and the
    mountain, and from the moon in the storm's eye.
  - Strength by place: forest 2.4, garden 1.3, bog 0.9, mountain 0.7, dusk 0.55, village 0.8.
  - None in a room, none in a raging storm, and none at night.
  - Where a place asks for none, the pass is skipped. It is drawn during warm-up, so its programs compile then.
- **Depth haze.** On Mid and High, the same grade program adds a distance term with a height falloff and a light
  sink for the far layers, in the live fog colour.
- **Shaft cards on every tier.** Each shaft is a broad card with a core and a glow where it lands. They stand in the
  forest, through the garden's birches, wide on the bog, and through each window at home onto the floor.
- **Motes.** 55–70 % of them gather inside the shafts and are lit warm there; the rest drift with the wind as dew,
  seed fluff or dust.
- **Falling leaves and needles.**
  - In every outdoor place: needles and birch leaves in the forest, birch leaves in the garden and the village, and
    dwarf-birch leaves on the bog.
  - They ride the shared wind, with more while it blows.
  - In the storm there are half as many, blown fast.
- **Ground mist.** Layered cards behind the path (z ≤ −2.5) in the forest, on the bog and as faint dew in the garden.
  Morgonen efter has a breath of mist outside each window, and the storm's eye has mist on the water once the calm
  comes.

### Fauna (`src/render/lift/fauna.ts`, `fauna/plan.ts`, `fauna/shapes.ts`)

- **How it is built.**
  - Everything is built in code, one `InstancedMesh` for each kind, all on the `rich` layer, so Low draws none of it.
  - Parts move in the vertex stage: one rig shader turns tails, heads, wings and lids from per-vertex pivots and a
    per-instance act.
  - Placement is seeded by the chapter id. It reads the dressing's trunks, birches, snags and dandelions.
- **The cast.**
  - Squirrels on the forest's spruces and the garden's birches dash up and round, flick their tails, and run higher
    when Elof comes near.
  - A fox far back in the forest (z −12…−24) steps out, trots, sits, looks and trots off, never towards him.
  - Great tits, blue tits, thrushes and sparrows hop behind the path. They lift and fly off when he comes within about
    3 EL, and come back later.
  - Butterflies (brimstone, wood white, a blue) settle on the garden's dandelions and over the bog's meadow.
  - Dragonflies dart over the bog's water and the brook pools.
  - An owl in Norrsken and in Äventyr 2's storms, never within 16 EL of the story owl.
  - Fireflies at dusk and in the storm's eye.
- **The little forest beings.** Round, made of moss and bark, with lichen caps and soft dark eyes. They peek over
  stones and stumps in the forest, on the bog and on the mountain.
- **The carvings.** Small figures in pale carved wood: a bird, a hare, a figure with a pointed cap. They sit quietly
  by stones in both adventures.
- **In the storm the life hides.** Only birds sheltering on branches remain, plus the owl.

### Flora and interaction (`src/render/lift/flora/`, `wind.ts`, the dressing's plant files)

- **Trees and their light.**
  - Birch crowns and hanging strands around every birch trunk, and young birches in the middle layer.
  - Spruce boughs on the forest's trunks, kept under the top of the picture, with pines and young spruces between
    the path and the far plates.
  - Leaves are lit by one shared `leaf-v1` program, a wrap-light and back-light term that follows the sun.
- **On the ground.**
  - A velvet moss sheen on cushions and stones.
  - Moss caps on the forest's and the mountain's stones.
  - More and larger ferns, and tall grass in the back rows.
- **Glowing mushrooms.** Blue-green or pale violet, glowing only in the dark, at least 1.8 EL from every candy.
- **Plants that bend.** They lean away from Elof and swing back, through a player uniform in the one `wind-v1`
  program: no new program. With reduced motion they lean at half strength and don't spring.
- **Whirling leaves.** Leaves whirl up when he runs, lands or turns. None with reduced motion, on Low or indoors.
- **The grass at night.** Its own glow drops to 40 % at night and in the storm; it had glowed neon there.

### Materials and water (`src/render/lift/materials/`, `water.ts`)

- **One scene-wide patch, on High only.** It is laid at warm-up under one key, `lift-surface-v1`, and what each
  material is (carved wood, planed wood, moss, ground, street) is a uniform.
  - It is laid only on a picture that starts on High. Low and Mid keep the place's own materials.
  - Moss means the kit's stones and bark, not every vertex-coloured material.
  - Measured in software rendering, the first version cost about a third of every frame on every tier.
- **Carved wood.** Matte, with grain and knife facets: the trägubbar, Klonk, the carvings and Pappa's shelf figures.
- **Planed wood.** Matte, with grain: the floors, decks and planks.
- **Moss.** Darker and glossy in its hollows, catching the low sun.
- **Wet surfaces.** Within 1.9 EL of water, everything outdoors in Äventyr 2's storm, and Byn's street, with slow
  glints.
- **Dew.** Beads on grass tips and leaves in the morning places, and drops on the window panes in Morgonen efter.
- **Water.**
  - On High, what stands on the banks is mirrored from the half-size copy of the picture, in screen space, with
    ripple wobble.
  - On Mid, the painted mirror draws the pools' banks, the nearest trunks and the bog's islands.
  - On both, a dark band where water meets a bank.

### Characters (`player-motion.ts`, `family-motion.ts`, `ghost-model.ts`, `rig.ts`)

- **Elof's idles while he waits,** from a shuffled bag: he looks around, rocks onto his toes, scratches his head,
  follows a falling leaf, taps a heel, and after a long wait stretches. In a strong wind he leans into it with his
  arm up. His feet never slide.
- **The family's waiting idles:** they shift their weight, glance about, fold their arms and look at the sky.
- **The ghost:** a bob, looking about, and a curious tilt towards Elof. Its tip now turns about its own side axis.
- **Wind in the characters' details.** Hair, fringes, caps' brims, scarves and hems sway as damped springs on
  `windAt(x)`. There is none indoors, more in the storm, and nothing moves with reduced motion.
  - A private Blender model's bones get the wind only if their names start with hair, braid, fringe, cap, brim,
    scarf, hem, coat, cloth or cape.

### Cost

- **Boot JS:** 487.7 KB of 520 KB gzipped (it was 450.8 KB with r187 before the upgrade).
- **Frame rate in software rendering (SwiftShader), measured against the build just before the upgrade, back to
  back on the same machine:**

  | Chapter, tier | Before | After |
  | --- | --- | --- |
  | Gården, Low | 9.0 fps | 8.8 fps |
  | Norrsken, Low | 8.8 fps | 8.5 fps |
  | Gården, Mid | 7.8 fps | 7.8 fps |
  | Granskogen, High | 4.5 fps | 2.5 fps |

  High carries the whole upgrade and is the heaviest. Software rendering exaggerates fragment work, so the
  devices decide (gate 5, `?bench`). On a slow device Auto and the dynamic resolution step down.
- **`?nolift=…`:** `atmosphere`, `fauna`, `flora`, `materials` (or its halves `surface` and `dew`) leaves an area
  out, so its cost can be compared on a device.
- **Draw calls at 1180×820, measured in the busiest pictures of every place:**
  - Low: 45–76 of 120. The upgrade adds at most +1 or +2 on Low.
  - Mid: 53–84 of 220.
  - High: 51–98 of 300.
- **Programs:** stable during play in every measured picture.
- **High's render targets:** about 34 MB at 1180×820.
