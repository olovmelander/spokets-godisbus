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
