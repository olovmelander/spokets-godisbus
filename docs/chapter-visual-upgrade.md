# Chapter graphics upgrade — 4 October 2026

Requested by Olov: stronger assets and backgrounds, distinct chapter looks, a better Bredbyn/Köpmangatan
chapter researched from photographs, improved trees, grass, water, Moa's paper plane and Bertil's cap boat.
Built on `main` at `368a074` after PR #107. This is shared rendering work for existing chapters; it adds no
chapter, changes no puzzle/collision/save identity and leaves the release boundary and private family art intact.

## Visual direction implemented

| Place | What now identifies it |
| --- | --- |
| Gården | Morning lawn with blade colour gradients, gentle wind, actual dandelion petals, clover and autumn birch crowns. The prepared folded plane becomes visible at the existing boarding choice. |
| Granskogen | Giant mossy spruce trunks alongside smaller spruces with drooping needle fans and branching silhouettes; low fern fronds and cooler foliage against the gold light shafts. |
| Myren | Rust/gold sphagnum and sedge, sparse pine crowns against the open horizon, peat-water reflections and low mist. |
| Berget | Bent pines with broad, asymmetric crowns over granite and lichen, against the existing violet valley and warm sky. |
| Finalen | The mountain vegetation under the existing blue-hour/nightfall lighting and aurora. The nightfall timing stays unchanged. |
| Byn | Cooler October clouds and wooded blue-green hills, yellow horizontal timber, pale green vertical timber, red and cream fronts, shaped roof lines, chimneys, thicker window trim/sills, striped awnings and textured hedges. |

Moa's aircraft is an actual folded sheet with separate wing/crease planes, a keel, winglets and small blue
pencil marks. Bertil's boat is an inverted red-and-white six-panel cap with stitched seams, a curved peak,
a rim and a plain colour-block patch. Each craft uses one geometry/material draw. They follow the original
ride paths and timings. The active cap/leaf makes a shader wake; water also has broad sky reflections,
small shoreline glints and a second ripple scale. No extra water render pass was introduced.

New grass/tree motion and craft banking use the paused picture clock and stop when *Mindre rörelse* or
the OS reduced-motion preference is active. Existing ambient effects keep their established behavior.
Species geometry is shared within each chapter and rendered in two instanced tree batches, plus one
fern batch in the forest. Shapes and materials are allocated before the view warms its shaders.

## Photo research

Viewed on 4 October 2026. These are public street references, not the family's home. The photographs
were inspected in the session scratchpad and are not committed, used as texture plates or requested
by the running game. All new runtime drawings and meshes are original procedural work. Street layout
is an authored adventure interpretation, not a surveyed reproduction; shops remain fictional and unbranded.

| Reference | Observations used | Photographer / reference licence |
| --- | --- | --- |
| [Köpmangatan westward](https://commons.wikimedia.org/wiki/File:Bredbyn,_K%C3%B6pmangatan_v%C3%A4sterut.jpg) | Yellow horizontal timber and grey broken roof; pale green vertical timber, red tin gable roof, light window surrounds, hedges and wooded hills. | Speldosa, 29 July 2021; CC BY-SA 4.0 |
| [Köpmangatan eastward toward Olympiavägen](https://commons.wikimedia.org/wiki/File:Bredbyn,_K%C3%B6pmangatan_%C3%B6sterut_mot_Olympiav%C3%A4gen.jpg) | Cream/white and yellow buildings, striped storefront awnings, street trees and the low wooded horizon. | Speldosa, 29 July 2021; CC BY-SA 4.0 |
| [Köpmangatan reference collection](https://commons.wikimedia.org/wiki/Category:K%C3%B6pmangatan,_Bredbyn) | Other publicly documented street viewpoints for future reference review. | Individual licences listed on file pages. |

## Verification

`tests/browser/chapter-visuals.mjs` stages the real renderer/simulation with public rehearsal actors at
chapter landmarks and halfway through the existing plane/cap rides. It checks Low/High draw budgets,
warmed shader stability, unchanged simulation state and byte-identical paused scenery captures.
The fixture excludes the existing HDR film grain, whose seed deliberately advances per draw; the game
keeps that established effect. `VISUAL_ALL=1`
extends it to all five planned viewports; captures are ignored work evidence under `docs/shots/_work/`.
Ride staging here is a visual fixture, not a new end-to-end input playthrough.

The existing water/light, village, colour, GPU allocation and nightfall suites exercise the affected
rendering systems. The garden boarding/playthrough check still verifies the real interaction and old saves.
The final local record for this graphics pass is below; the PR records the full GitHub CI result.

| Check | Result |
| --- | --- |
| Typecheck and unit/robot suite | Passed; 774 tests in 76 files. |
| Chapter visual review | 90 Low/High chapter/ride views across all five sizes; 450 checks. Scenery ran in two viewport batches, and the twenty ride poses were refreshed after their follow camera settled. Maximum 112 draws of 120; stable shaders, unchanged simulation, identical paused scenery pixels with fixture grain disabled. |
| Affected browser systems | Water/light 14, village 64, colour pipeline 14, GPU memory 49, nightfall 44, garden departure/return 48; production smoke and development `?debug` keyboard movement pass. |
| Clean public build | 388.4 KB gzip JavaScript of 450 KB; 717.4 KB served boot of 3 MB. |
| Local privacy | Built-in rules pass; secret denylist and exiftool are unavailable in this cloud session. CI runs the repository's configured check. |
| Public art review | 55 WebPs under `docs/shots/chapter-visuals/`, using public rehearsal actors and original scenery. No reference photo or private model is included. |

Observed logical GPU storage for public-only High tablet Byn was 112.51 MB; warmed tier/resize/pause
and context-restoration cycles returned to their baseline. This file is the current graphics completion
record; the historical handover is unchanged by this pass.

Physical-device FPS and final private-character appearance still require Olov's own devices. This cloud
pass supplies original procedural scenery and props; it does not finish the planned Blender landscape
plates, scanned materials or family likeness/acting approvals.


## Work plan and acceptance

This is the saved plan for the requested visual pass. Finish this scope and merge through a green PR;
continue the remaining art work in separate follow-ups.

- [x] Inspect the merged story/gameplay renderer and preserve chapter, ride, puzzle and save identities.
- [x] Research public Bredbyn/Köpmangatan photographs and record observations and reference licences.
- [x] Give Byn its own cool October backdrop and original timber fronts, roofs, trim, awnings and hedges.
- [x] Add chapter-specific instanced spruce, birch and bent pine geometry; improve grass and forest ferns.
- [x] Replace Moa's placeholder aircraft and Bertil's bowl-shaped boat with original folded-paper and cap meshes.
- [x] Add water reflections, shoreline ripples and active cap/leaf wakes within the existing water passes.
- [x] Connect new motion to picture time and reduced-motion settings; warm materials before play.
- [x] Local final gate: typecheck, unit/robot tests, build/size/privacy, affected browser suites and the
      five-size Low/High visual matrix. Public rehearsal WebPs are saved in `docs/shots/chapter-visuals/`.

The authorized merge to `main` is gated by green GitHub CI on the published PR head. The PR records
that exact CI result and the resulting merge/deployment revision.

### Next art work, in order

1. **Review this pass on Olov's devices.** Check tree/roof silhouettes, the cap and plane in motion,
   path readability, pause and *Mindre rörelse*. Measure real-device frame time and GPU memory on Low,
   Mid and High. Headless software rendering verifies correctness and budgets, not physical-device FPS.
2. **Finish landscape art in Blender on Olov's computer.** Replace procedural far plates/materials
   place by place: dew-lit garden birches; moss and spruce forest; open sedge/peat bog; granite and
   wind-bent summit pine. Keep each chapter's palette, depth separation and accessible play-plane contrast.
3. **Refine Byn's architecture in a separate chapter pass.** Review additional public street viewpoints,
   then add original roof depth, timber joinery and appropriate street props. Keep the shops fictional
   and unbranded and preserve the existing shop-door alignment and gameplay routes.
4. **Integrate approved private family art and acting.** Review craft contact, hand/foot placement and
   chapter help poses beside the family's private models. This needs Olov's local private repository
   and Blender; public rehearsal figures do not approve likeness or replace those assets.

Each follow-up keeps the 120-draw ceiling, size gates, shader warmup and texture ownership checks,
records original/third-party sources in `LICENSES.md`, and captures the five planned viewports. H1a/H1b,
listening review and device checkpoints remain Olov's review; this merge does not declare a release.
