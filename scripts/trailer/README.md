# The trailer

A trailer of about 1 minute 40 seconds, cut from the game itself: every picture is drawn by the game's own renderer
from its own simulation, with the robot playing (`tests/robot/robot.ts`), and the sound is the game's own polska on
its own plucked string (`src/audio/music.ts`) under the recorded voices.

**The files show the family's own models.** Everything the tools write goes to `scratch/trailer/`, which git ignores.
Never commit a frame, sheet or video from there (CLAUDE.md, "Pictures"). On a computer without `art/private` the
game falls back to its public stand-ins, and so does the trailer.

## Making it

Needs Google Chrome (for H.264 and AAC in WebCodecs) and a GPU. Run from the repository's root:

```sh
npm run trailer                 # capture.mjs, then compose.mjs: scratch/trailer/out/trailer.mp4 and .wav
node scripts/trailer/compose.mjs --out elof-trailer-720p --size 1280x720 --bitrate 5000000
node scripts/trailer/compose.mjs --out elof-trailer-under-30mb --size 1280x720 --bitrate 2100000   # 28.9 MB, to send
node scripts/trailer/verify.mjs trailer              # plays it in Chrome, checks frames and LUFS
```

1. `capture.mjs` plays each shot's chapter with the robot and draws it at 1280×720 CSS pixels three times as dense
   (3840×2160: the game's camera keeps Elof about 140 px tall up to 720 px, so this is the in-game framing). Only
   for the trailer, the dev server lifts the High tier's 3.5 MP cap and the pixel ratio's cap of 2
   (`harness.mjs`). A virtual camera operator crops towards Elof and scales to 1080p JPEG frames.
2. `compose.mjs` (with `compose-page.js` in the page) mixes the sound offline, draws each frame with its
   dissolves and titles in Playpen Sans, encodes with WebCodecs, and `mp4.mjs` writes the MP4.

About 80 s to capture the 25 shots six at a time, and about a minute to encode, on an RTX 5080 laptop.

## Changing it

The cut is `cut.mjs`: four acts (Lördagsmorgon, the adventure, the heart and the title, Stormnatten), each in its
own tempo, so every cut lands on a bar line. A shot names its chapter, the robot's second in it, its length in bars,
its zoom and how much the crop follows Elof, and the voice lines over it (keys of `public/audio/voices`).

When the game changes, the seconds may move. To find moments again:

- `scout.mjs` runs the robot through every chapter and writes `scratch/trailer/timeline.json`: scenes, lines,
  rides and flags by second.
- `stills.mjs` draws contact sheets of chosen seconds per chapter into `scratch/trailer/sheets/`.
- `review.mjs [A1,B2]` puts four frames of each captured shot on a sheet; `compose.mjs --stills 4,70` draws single
  frames of the finished cut.
