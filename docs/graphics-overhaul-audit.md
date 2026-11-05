# Graphics overhaul audit

5 November 2026 · branch `visual/adventure-1-overhaul`

This pass brings the first adventure's rooms and outdoor places up to the authored model library already used by
Stormnatten, and reviews the shared picture across both adventures. It follows [the art bible](art-bible.md) and
[the visual upgrade plan](visual-upgrade.md). This record distinguishes implementation, executable checks and
image review from the private-model and physical-device judgement that remains with Olov.
Implementation and local review are complete. Initial CI results and the resulting Byn correction are recorded
below; the corrected head must pass the full CI run before merge. No deployment result is claimed here.

## What the review found

| Finding | Change | Evidence and limits |
| --- | --- | --- |
| Tables and chairs in the first adventure named authored models, but their installer belonged to the second adventure's lazy story package. | `src/render/shared-models.ts` installs the named models for either adventure. `view.ready` waits for it; successful pack names appear in `view.info().models`. | Source-fixture checks confirm installed furniture without Adventure 2 source requests. The production lazy-chunk boundary remains a CI check. |
| The family's room had more complete furniture in Stormnatten than in the prologue and epilogue. | `home-room.ts` shares the sofa, lamp, plant, drawings and rug. The first adventure adds them behind the actors; the window joinery and public shelf figures gain shape. | Five-size opening, sofa and epilogue images, plus storm-evening and morning views, are in the reviewed gallery. Private-model contact remains a device check. |
| On a tall screen the home floor ended in a dark cutaway, and the prologue's lower outdoor ground also lowered its wall. | An indoor floor continues towards the camera. Room level comes from the fixed indoor ground, excluding the outdoor drop, so a debug or capture start cannot move the house. | Portrait views close the cutaway; the sofa-side rise is the authored door sill. Regression tests cover the fixed floor level across capture spawns. |
| Much of the first adventure's scenery relied on repeated small procedural forms. | `outdoor-models.ts` places authored trees, reeds, boulders, logs, garden objects and small animals in the garden, forest, bog, mountain, summit and village. | All eight first-adventure chapters are represented at five sizes. Review found no newly obscured route or missing geometry in the public views. |
| Two newly placed birches obscured Byn's street facade from the actual leaf-ride camera, outside the static gallery's sampled views. | The two Byn birches were removed; the new pots remain. Existing village landmarks and the ride's camera and route are unchanged. | All seven puddle configurations in `bredbyn.mjs` pass, 58 checks. At the failing 844×390 High view, visible east-facade rays recover from zero to four; church visibility improves and the belfry stays visible. |
| The mountain's evenly stepped front read as stacked masonry. | Wider, irregular fracture faces and surface-distance UVs change the ground below the playable lip. Authored rock supports retract below their walkable tops; outdoor rope posts become bent snags. | Collision-top and wall-clearance regressions pass. Snag branches attach to the actual trunk bend. The reviewed mountain is clearer, while its supports retain a stylised faceted look. |
| Warm key light, green bounce and the grade compounded the yellow-green cast. | More neutral tint and bounce, cooler camera fill, lower contrast and finer grain keep the places' different times of day while lifting the faces. Lawn colour and the mown edge are quieter. | The High gallery keeps candy and routes readable. Low/High home and forest browser checks pass; colour and comfort on actual displays remain Olov's judgement. |
| The garden's raised stone read as an extrusion of the lawn. | A continuous weathered stone skin joins the unchanged walking strip to irregular shoulders, with the existing boulder model fitted inside it by its actual bounds. | Three contact tests cover both boots across x 101–105, the skin's front at five heights and the actual model's grounded/enclosed bounds. Image review rejected an earlier separate shoulder because it read as a rectangular cap despite passing contact checks; the final surface is reviewed below. |
| Stormens öga's broad meeting stone showed overlapping slab edges, while its footprint exposed dry lakebed and incidental bog fauna below the lake. | `aventyr2/moonstone.ts` supplies one continuous worn surface, an exact flat walking strip and water across the broad footprint. Perch planning excludes submerged skerry trees and stumps. | Portrait and landscape review found clean granite/water joins and no stray fauna. Surface and perch regressions pass; physics and meeting triggers are unchanged. |
| Reusing the old installer could move a sign or lit-window object from one model instance into another. A file-only cache key also omitted its pack. | Cache keys include pack and filename. Signs and window details are cloned with their placement wrapper; an installed holder is not replaced twice. | The installer regression tests exercise repeated instances, retained children and packed transforms. |
| Clearing a fallback removes it from the scene but does not release resources already uploaded while the loading screen was visible. | Holders with locally owned fallback geometry and materials opt into `disposeFallback`. Kept children and shared loaded geometry remain intact. | Ownership regressions and the built Prolog checks pass. Initial CI's full eight-chapter memory sweep passed 51 checks; corrected-head CI remains pending. |
| The old shared scenery path could fetch private carvings and grandparents during a public stand-in preview. | The shared installer observes `standIns` for private buildings, carvings and actors. | All 56 final captures recorded zero private-pack requests or installed private models. |
| The epilogue's window figure used a different placeholder from the little carving that continues into Stormnatten. | The window names the same carving export. Its blink changes a cloned geometry's painted eye corners, retaining the shared kit and its other instances. | The actual local export yields 60 selected vertices per eye; the optional private browser check measures eye contraction and return to rest. |

## Implementation boundaries

The authored GLB kits remain in their existing `aventyr2` asset directory. The directory name is an asset address,
not a requirement to load the second adventure's story. The shared loader requests only files named by the current
scene and uses the normal manifest hashes, retry path and texture ownership machinery. Missing optional exports
leave their procedural fallback in place.

Copies share loaded geometry and materials. Unused geometry in a parsed kit is never added to the scene or uploaded
by rendering, and the loader's temporary cache does not retain it after installation. The current public scenery
kits use vertex colours rather than additional textures. The loader must not dispose a source GLB wholesale after
cloning it, because the visible copies still use its resources. Private actors retain separate skeletons.

The existing two-frame material warm-up, receiver setup and `rich` layers also cover installed models. Shared
scenery completes before `view.ready` permits play. The small outdoor animals breathe or bob in place; reduced
motion restores their resting pose. No scenery object changes a physics platform, clue, route or story trigger.

This work reuses the existing authored art and corrects the ground, garden boulder and meeting-stone surfaces in
code. It does not claim that every procedural shape has been replaced, or that the family and private architecture
have received a new modelling pass. Voices, the story's release boundary and save format stay outside this graphics
change. No new Blender work or access to Olov's computer was needed for this implementation.

## Budget and regression evidence

The executable gates are the authority where older plan prose differs:

| Gate | Limit | Current evidence |
| --- | --- | --- |
| Boot JavaScript, gzip | 520 KiB | Final build: 499.6 KiB. |
| Boot assets as served | 4 MiB | Final build, including this workspace's private assets: 3,588.9 KiB. |
| Each lazy JavaScript chunk, gzip | 160 KiB | Adventure 2: 64.4 KiB, still separate. |
| Draw calls | Low 120; Mid 220; High 300 | Forest regression views: Low 62–75, Mid 74–87, High 87–100. The 56 final High captures range from 45 to 104. |
| Logical GPU storage | Low 100 MB; Mid 150 MB; High 220 MB | Prolog: Low 15.96 MB, Mid 53.21 MB, warmed High 100.14 MB. Current and transient-peak gates passed, including High targets ≤80 MB. Exact peaks are not printed by the suite. |
| Shaders and retained resources | No new programs during ordinary play; stable warmed resource counts | Forest tier changes, delayed actor arrivals and the 16-check built Prolog memory run passed. Initial CI's eight-chapter memory suite passed 51 checks. |

Before the final Byn correction, **195 test files / 2,062 tests** passed both locally and in CI. The final
garden surface also passed its three focused contact tests and typecheck. After removing Byn's two birches,
typecheck, all seven puddle configurations and the production build passed again; build sizes are unchanged above.

The local built-in privacy scan passed again after the refreshed captures over **853 tracked files, 176 built files and 422 media files**, without
exiftool. Initial CI privacy also passed, using exiftool. **Neither run had a configured denylist.**

Initial CI also passed the build, the Adventure 2 browser suite's **42 checks** and the eight-chapter GPU suite's
**51 checks**. It found two failures: the Byn occlusion described above, and `nightfall.mjs` starting its shader
baseline before all models had arrived. Shared scenery makes the old fixed arrival count insufficient. The fixture
now awaits the production `view.ready` barrier and explicitly checks every required kit; its complete local run
passes all 52 assertions. All other initial CI suites passed. Full CI on the corrected head remains pending.

Completed local browser checks:

- `forest-shadows.mjs`: 18 checks passed. At 844×390, x 63, draws were Low 75 / Mid 87 / High 100;
  at 390×844, x 80, they were 62 / 74 / 87. Explicit trunk casters, baked shade, shadow-map release and
  repeated tier changes behaved correctly, without new play-time programs or WebGL/page errors.
- `model-installation.mjs`: 30 checks passed. Three delayed family model installations at each tier received
  grade, rim light and shadow-receiver setup; paused redraws kept program, geometry and texture counts stable
  and preserved simulation state.
- Public `shared-home.mjs`: 42 checks passed on Low and High in the opening and epilogue. This is a Vite source
  fixture: the room kit, separate furniture instances, ground contact, absence of Adventure 2 source-module requests,
  private-pack exclusion, paused resources and draw budgets passed. The built lazy-chunk boundary belongs to the
  separate CI `aventyr2.mjs` check. The prologue's continuous floor remains fixed when a capture starts elsewhere.
- The optional private-only `shared-home.mjs` check passed 12 assertions against the actual local carving export:
  both painted eyes contract, the face returns exactly to its original shape, and warmed resources stay stable.
  This produced no public capture of private models.
- The seven puddle viewport/tier configurations in `bredbyn.mjs` passed **58 checks** after the Byn birches were
  removed, including actual leaf-ride placement and facade/church/belfry visibility.
- `nightfall.mjs`: **52 checks** passed across portrait/landscape and Low/High after the loading-barrier correction.
  Shader stability, simulation state, family reveal, light transitions, pause and reversal assertions are unchanged.

The local built-page memory run, `GPU_COURSE=prolog`, passed **16 checks**: Low/Mid/High, repeated tier changes,
three viewport cycles, ten pause/resume cycles, context loss and restoration. Warmed High used 100.14 MB total /
71.10 MB targets; settled tablet High used 99.81 / 70.77 MB, portrait 58.77 / 39.99 MB, and restored High returned
exactly to 100.14 / 71.10 MB. The test distinguishes initial forced warm-up from settled resize state because
unused indoor shaft targets are correctly released after resizing; repeated settled comparisons remain exact.
This ran on the 499.2 KiB production build; subsequent garden, moonstone and Byn changes do not affect Prolog.
Initial CI's full eight-chapter memory suite passed **51 checks** before the Byn correction. The corrected head
still needs a complete green CI run before merge.

The existing browser suites cover distinct risks: `aventyr2.mjs` checks the lazy story chunk and all ten second
adventure starts; `gpu-memory.mjs` visits eight first-adventure chapters at all three tiers and exercises resize,
pause, tier changes and context restoration; `forest-shadows.mjs` checks explicit trunk casters and shader warm-up;
`model-installation.mjs` checks late actor arrivals during pause. The final home and outdoor images received a
separate direct review: resource counts alone do not establish a readable picture.

## Image evidence and remaining limits

The [public review gallery](shots/visual-overhaul/README.md) contains **56 individual WebP images and six contact
sheets**: all eight first-adventure chapters and the sofa area at 390×844, 844×390, 780×360, 1180×820 and 1440×900;
all ten second-adventure chapters at 844×390; and the corrected garden stone at 1440×900. The gallery's two JSON
records preserve image hashes, placements, flags, scene times, models, source and asset fingerprints. After the Byn
correction, all three refreshed capture runs used the same final source, asset manifest and capture script, with no
source change during a run. Their source fingerprint begins `fd6dd68e0a156fb7`; the full hashes are in the gallery.

The captures use `tests/browser/visual-overhaul.mjs`, High quality and public stand-ins. All 56 completed shader
warm-up and fit the draw gate: **45–104 draws and 19,987–245,237 triangles**. They recorded zero page errors, console
errors, missing responses, private-pack requests or installed private models. Each viewport settles through six
render steps of 0.4 seconds, recorded in the context; this is static image evidence, not a frame-rate measurement.
All six sheets and the stone detail were reviewed, with independent full-size review of the first adventure's
portrait/desktop views and all ten second-adventure images. The refresh leaves 51 images byte-identical to that
review; all five changed images and all five village views were reviewed and approved. No new visual blocker remained.

Direct image review confirmed that the portrait home floor closes the former cutaway; the small rise at the sofa
view's right edge is the chapter's authored door sill. Forest and bog routes keep the player and candy readable.
Mountain walkways remain clear, although their rock supports retain a stylised faceted look. Stormens öga's
continuous granite and water join remove the slab overlap and stray fauna. The final garden stone's middle view
shows grounded feet and continuous irregular shoulders without the earlier separate cap; its contact tests cover
both boots across the full plateau. Earlier approach and exit images preceded the final shape adjustment.

These direct renderer captures do not exercise title, dialogue and pause layout or the staged epilogue action;
the epilogue images document the room and window. Its actual blink has the separate browser check above. An actual
game-page check covered startup, keyboard play in the garden and the chapter selector at 780×360; this pass changes
no UI. SwiftShader results establish reproducible rendering, resource
accounting and regressions in this environment; they do not establish frame rate or CPU performance on family
devices. Final judgement of private-model contact, colour, acting and comfort remains a device review.
