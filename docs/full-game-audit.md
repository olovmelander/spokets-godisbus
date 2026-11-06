# Full game audit

6 November 2026 · branch `audit/full-game-polish`

Olov requested another broad audit and repairs throughout the game. This pass covers both adventures, the bonus
village, controls, saves, album photos, audio lifecycle, model installation and small-screen menus. An independent
review checked the combined changes, including resource ownership and a second path to the resume-loss defect.

## Findings and repairs

| Finding | Repair | Regression evidence |
| --- | --- | --- |
| A refused Adventure 2 JavaScript request could start Prolog and autosave over the saved chapter/checkpoint. Invalid or empty chapter links could also bypass the initial fix. | Resolve the effective available chapter before loading. A required pack failure shows the game's retry dialog before simulation or autosave is installed. Optional future chapters may still fail while Adventure 1 plays. | Production `lifecycle.mjs` refuses the pack, dispatches pagehide and checks byte-for-byte preservation of the save for normal, unknown and empty links; keyboard retry restores the chapter/checkpoint. |
| Reading `localStorage` itself could throw before the keyboard-help helper entered its try/catch. | Obtain default storage inside the guarded operation. Explicitly unavailable storage stays unavailable. | `keys.test.ts` exercises the throwing getter; `lifecycle.mjs` starts and plays with storage denied. |
| Storage could remain readable while refusing writes, so progress failed to save without the existing notice. | Show the existing Swedish save-unavailable notice once when a normal autosave fails. Avoid warnings for deliberate nonwriting preview/benchmark sessions. | Production `lifecycle.mjs` injects quota failure, pauses, checks the notice and resumes play. |
| Entering a chapter code reset its large candy and checkpoint but retained that chapter's side candy. | Reset its side collection too, retaining other chapters' collections. | The chapter-code case in `smoke.mjs` seeds both chapters and checks the resulting stored data. |
| An invalid photo record was hidden from the album but permanently prevented a fresh capture of that moment. | Only a valid first frame in the current generation blocks replacement. | Real IndexedDB cases in `photo-storage.mjs` cover corrupt, empty, oversized and wrong-type records. |
| A delayed old album reset or pending cleanup could erase photos captured after a newer reset. | Bind deletion and pending-marker completion to the reset generation; superseded cleanup stops. | Real IndexedDB tests delay database opening and interleave two resets plus a fresh capture. |
| Holding a destructive confirmation through window blur, a hidden page or a disappearing button could still confirm it. | Cancel on blur/visibility loss and recheck availability before completing the hold. | `hold.test.ts` and a real profile-dialog blur case in `profiles.mjs`. |
| A second finger releasing an action button cancelled the first finger's held jump; secondary mouse buttons also triggered actions. | Track the owning pointer and accept the primary button only. | Focused multi-pointer, cancellation and mouse-button input tests. |
| Gentle gamepad movement did not mark the pad active, so unplugging it could leave movement stuck. | Any movement outside the existing deadzone activates pad ownership and disconnect cleanup. | `input.test.ts` verifies gentle movement followed by disconnection. |
| Direction and confirm in one gamepad poll activated the previously focused menu item. | Read the selected element after navigation. | A simultaneous navigation/confirm regression in `input.test.ts`. |
| Muting, hiding the page or dismissing a blocked voice could leave it playing or revive it on the next gesture. An old rejected playback promise could also interrupt a newer line, and unrecorded dialogue fetched nonexistent MP3s. | Build a key inventory from the actual MP3 files so unrecorded lines stay silent; stop HTMLAudio on mute, hidden/pagehide and context loss; clear pending retries on stop and ignore rejected requests that no longer own playback. | `voice-player.test.ts` tests mute, dismissal, visibility/pagehide, delayed rejection, unrecorded dialogue and a positive current-line autoplay retry. No recordings changed. |
| One missing optional family model stopped later actors or scenery from installing. | Recover per actor while preserving its fallback, then continue the stage, help-point or grandparent loop. | Unit and source browser fixtures fail one actor and verify the remaining models, warm-up and shading. |
| Replaced fallback figures and falling cones retained graphics resources uploaded during loading. | Dispose each fallback's owned resources when its model takes over; retain shared rehearsal geometry and loaded model resources. | Ownership tests and `model-installation.mjs` measure actual GPU geometry reduction, retained shared geometry and stable paused rendering on all three tiers. |
| Asking for help during the final counterweight push accessed a nonexistent next stop and crashed. | While it moves, guide to the destination without offering another push. | Simulation and actual Game-input regressions cover the forest cone, Olympia football and Billsta seesaw stone. |
| The final home-ride candy at x 87.8 lay after Stormens öga's goal at x 86. | Move the goal to x 89 without renumbering saved candy. | The ending robot collects it at 30, 60 and 144 Hz before completion. |
| The final golden sweet was described as the same kind Elof shared, although the first adventure offers two different choices. | Use the choice-independent line “Förut delade jag. Nu delar du med mig.” and update the narrative record and voice-script text. | Dialogue/continuity checks and voice-script consistency tests. Existing audio files remain unchanged. |
| Larger text pushed pause-menu controls and Close off a portrait phone's right edge. | Use columns that adapt to the available width and place each tile's icon above its label. | Reviewed portrait/landscape images and `settings.mjs` bounds checks at phone and tablet widths. |

## Coverage and validation

The content review followed all **18 playable chapters**: seven first-adventure story chapters, Byn and the ten
Stormnatten chapters. It inspected dialogue order, objectives, prerequisites, flags, collectibles and handoffs.
A simulation sweep restored **130 actual checkpoint snapshots** and reached each chapter's goal. Counts by chapter:

| First adventure | Restored checkpoints | Stormnatten | Restored checkpoints |
| --- | ---: | --- | ---: |
| Prolog | 2 | Stormkväll | 4 |
| Trädgården | 11 | Stormgården | 8 |
| Granskogen | 12 | Stormskogen | 11 |
| Myren | 10 | Stormbyn | 9 |
| Berget | 5 | Olympia | 9 |
| Norrsken | 3 | Flärken | 10 |
| Epilog | 3 | Älven | 8 |
| Byn | 10 | Billsta | 9 |
| | | Stormens öga | 3 |
| | | Morgonen | 3 |

The baseline passed 195 files / 2,062 tests; the combined changes pass **197 files / 2,097 tests** and typecheck.
Targeted regressions reproduced the failures before their repairs.
Completed focused checks include 35 real IndexedDB checks, 47 model-installation browser checks, 19 profile
browser checks, 44 production lifecycle/recovery checks, 69 input/hold unit tests, 62 render unit tests and
22 voice/audio-lifecycle tests. The unchanged dialogue-reading suite and all 52 memory-presentation checks
also passed after the recording inventory change. The chapter-code regression passes with its save seeded before
the first page load; the earlier fixture mistakenly let pagehide overwrite its own seed. The complete
combined validation and delivery result are recorded in `HANDOVER.md` and the pull request. At this documentation
checkpoint, the final smoke run and full CI are pending. The initial built settings suite passed 64 checks;
after the final adaptive-column refinement, a DOM preview verified all four widths (320, 390, 780 and 1180 px).
The unchanged pointing suite also passed all 43 checks; the previously intermittent portrait tap failure did not reproduce.

The production build still keeps Adventure 2 lazy and enforces the existing size limits. There is no new save
format, chapter release, likeness asset or recording. Privacy checks apply to public source and generated assets;
private screenshots remain in ignored scratch. The local privacy scan passed with built-in rules; exiftool and
a custom denylist are not configured in this environment. No new Blender work was needed.

## Limits and remaining review

Automated checkpoint routes do not model every reading pause, arbitrary old/corrupt save shape or subjective
story timing. Desktop Chromium with software rendering does not establish performance, touch comfort or sound
behaviour on every family device. Existing physical-device and art judgements in `HANDOVER.md` remain relevant.
This audit fixes the reproduced defects above; it does not claim that every possible bug has been ruled out.
