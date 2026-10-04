# Chapter graphics review — 4 October 2026

Original procedural scenery and ride props rendered with the real game view and public rehearsal
figures. No private family model, likeness render or reference photograph is present.

High captures cover garden vegetation, spruce/fern forest, peat bog, summit pine, blue-hour finale,
Köpmangatan fronts, the folded plane and stitched cap boat. Low captures of both craft and the village
show the simpler material pipeline. Each subject is captured at 390×844, 844×390, 780×360, 1180×820
and 1440×900, with device scale factor 1. File names encode chapter/position/viewport/tier.

`tests/browser/chapter-visuals.mjs` stages existing simulation poses; craft captures are halfway along
their authored rides after the follow camera settles. These are visual fixtures, not new input routes.
The fixture disables existing per-draw HDR film grain to make paused scenery captures deterministic;
the running game keeps its established film grain. Initial scenery frames have picture time zero;
crafts use three seconds of picture time to settle their camera. The HUD is omitted for art inspection.

See [the saved implementation and follow-up plan](../../chapter-visual-upgrade.md) for references,
accepted scope and remaining Blender/device work. Pictures verify layout and procedural appearance,
not final likeness, close contact/acting or physical-device FPS.
