# Walking during dialogue — 10 November 2026

Olov reported that the game stops completely whenever someone says something. He wants movement during
ordinary speech, fewer obligatory stops, and carefully chosen calmer scenes. He asked how strong AAA and indie
games handle this. This continuation starts from published PR #256, `3c74f2c`.

## Design and references

The starting inventory covers 18 chapters: 289 world beats, of which 116 requested a manual reading stop;
98 scene lines across 75 scenes, with 46 physical scene holds. These counts describe the old content metadata,
not distinct new defects. Every old scene line belongs to a held scene. Two further runtime rules also stopped
movement: a queued protected HUD line and a backlog of ordinary simulation lines.

The implementation separates playing a line, holding a physical scene, and completing a line:

| Situation | Controls and presentation |
| --- | --- |
| Remarks, hints, thanks and ordinary world conversations | Walk, jump and collect while one bubble plays at a time. Text advances automatically; no Continue overlay. |
| Catch, magic, rescue, supported handoff or deliberate close shot | Keep the authored physical/camera hold. Words finish automatically, with optional Continue after the recording ends. |
| A reveal during the owl ride | Keep the revealed figure and shot readable while flight and steering continue. |
| Pause, a hidden page or recoverable graphics interruption | Preserve the same line and playback position. No completion receipt while paused. |

Reading time remains `2.5 + 0.09 × characters` seconds, stretched by slower pace and larger text. A longer
recording keeps its bubble until the actual sound ends. Pause allows unhurried reading. Choices such as painting,
giving a sweet or tasting the star remain deliberate inputs.

Primary sources inform the pattern, rather than dictating this game's child-oriented timing:

- [*Do You Copy? Dialog System and Tools in Firewatch*, GDC 2017](https://media.gdcvault.com/gdc2017/Presentations/Armstrong_Do_you_copy.pdf),
  especially pages 36 and 50–58: stateful, interruptible conversation and the need to protect some critical exchanges.
- [Dean Rymer, *How God of War's seamless boat travel sequences were created*](https://blog.playstation.com/archive/2018/08/23/how-god-of-wars-seamless-boat-travel-sequences-were-created/):
  player-controlled travel, stories in small pieces, natural interruption and later continuation.
- [Anthony DiMento's account of God of War exploration design](https://blog.playstation.com/?p=206015):
  constrained movement for important quest information and optional additional background.

For Elof, ordinary traversal stays free and the accepted line is never cut. Existing authored holds are retained
where removing them would break a lift, landing, camera composition or coordinated action. They no longer imply
one required tap per sentence.

## Integration safeguards

- HUD completion carries the stable beat ID. The simulation preserves emission flags for the picture but gates
  causal requirements and timers on completion. Saves omit incomplete receipts; old saved IDs keep their meaning.
- An ordinary queue does not seize movement. A queued staged line does not turn the current ordinary line into a stop.
- Automatic recovery keeps the current line. A deliberate checkpoint restart discards and rearms incomplete speech.
- Explicit scene ownership keeps zero-line reveals with their matching world dialogue. Billsta's first strait
  line starts only after its close camera; Älven's reveal leaves the owl moving inside a wider shot.
- Story flybys use their own travel time while a reveal's words are queued or pending. Ambient rain and the owl remain live.
- A real Pause/save/reload during Älven's Lillgubben line exposed an early replay at checkpoint 132.6 with no
  matching picture. Owned lines now wait for their active scene and its cue, preserve their declared order, and
  hold the picture even when waiting behind another line. Unfinished saved reveals survive checkpoint and own
  terminal-cue recovery. Fresh and restored pictures enter a visible phase using the director's exact cue boundary;
  already completed historical flights stay hidden.
- If Elof walks out of a free-moving reveal's authored area, its camera returns smoothly to following him
  while the line and its completion rules stay intact. The release is latched for that scene so stepping back
  across the boundary does not snap the camera back. Held physical scenes retain their authored shot.
- A goal prerequisite unlocked after walking past it remains a valid return target for the helper. Optional distant
  activities retain their normal reach limit. This covers the carving knife and the morning cocoa.
- Automatic memories wait for the active line, and recoverable interruptions retain voice ownership and position.

No family model, voice recording, collection ID or chapter release boundary is changed.

## Verification

Baseline: typecheck-ready main, all 2,529 unit/robot tests passed; the dev build started and keyboard movement
worked with the private models. The old and new behavior is checked with real chapter data, not only isolated
HUD calls. The full-dialogue robot now completes lines automatically and uses the same protected-scene policy
as the app; its no-cut, no-lost-emitted-line, order and full-chapter-goal checks remain.

The following local browser results use the immutable production build at `027c069` (HTML SHA-256
`b70761d9995e6a1fb343b6fa1b2c7c9aabf1fe4aa9d4f9eb97ec7544f1056f96`), with the final test driver at `f9a2c83`:

- **Walk and talk: 30 checks**, 390×844 and 844×390. Real touch/keyboard movement and jumping continue through
  ordinary queued lines and a formerly mandatory `read: true` remark. Full text and ordered completion, true
  Pause/resume, four automatically completed protected Stormkvällen lines and restored movement all pass.
  This harness controls 60 Hz time and samples intermediate GPU draws; it does not measure native performance.
- **Large text:** unchanged 26 px font, 366 px bubble inside the 390 px viewport (12…378), and 446 px bubble
  inside the 844 px viewport (199…645). Visible play controls remain clear. The wider-than-screen box found
  during the diagnostic pass is corrected with the bubble's border-box sizing.
- **Godiskalaset: 12 native-browser checks.** All five exact thank-you lines play without mandatory Continue;
  Pappa's cobble memory, Klonk and naming complete in order, sharing choices persist and the next knife action remains.
- **Family story: 9 native-browser checks**, source `6528e5e`. The cap offer permits movement with its complete
  text; boarding still requires a separate deliberate action. Mamma places the stock before the ready line.
- **Dialogue UI suite:** automatic timing/receipts, optional Continue, Pause, touch and five larger-text layouts pass.
- **Full prologue: 83 native-browser checks**, production `310f8ed`: all four ordinary promises permit movement;
  the title waits for completion; transformation/reload and incomplete receipts remain correct; five reassurance
  layouts and four Low/High tableaux pass.

A subsequent continuous-Right test found Elof leaving the fixed owl-reveal camera after landing while his line
was pending. The registered walk-and-talk regression reproduces the exact failure on `310f8ed`; the camera
release above addresses it. The same registered production-browser regression passes all four checks on
`d32307c`: 123 samples during the pending line, zero outside the viewport (previously 28), actual boarding,
continued movement and automatic completion. A two-frame regression also covers a newly created flyby's visible glow when waiting
begins one update after its cue. These changes have focused before/after tests and do not add a movement hold.

The first CI run exposed an older garden-loop assertion that treated emission of Moa's thanks as completion.
The fixture now waits for and saves the completed receipt before asserting that the line is not replayed;
unfinished speech must remain replayable. The reward, checkpoint, sweets and found object already persisted. The corrected native 390×844 High
keyboard garden route passes all 12 checks, including the explicit saved completion receipt, reload and the
chosen plane landing, with no browser errors or shader recompiles.

The first integrated full run passed 2,580 tests in 269 files. Production revision `310f8ed` additionally includes
actual saved-reveal and queued-reveal regressions, including the two visible-phase defects that failed before
repair.

Two CI attempts on `601bd774` hit Playwright's default 30-second click deadline at Granskog's High→Low
switch; all 13 other jobs passed. The unchanged native GPU-memory first shard passed all 20 checks locally.
Quality changes synchronously release the old pipeline and perform two uncullled compile/render warmups.
The test now gives only those real UI clicks a bounded 120-second budget, logs duration and observed quality,
and explicitly asserts the requested tier. Every original memory, peak, allocation and release assertion remains.
The revised native first shard again passes all 20 checks; Granskog's switch measured 17.69 seconds locally.
This supports load sensitivity but does not prove the exact CI dispatch/GL blocking phase. The failure path
logs its cached previous tier and elapsed time and rethrows, without another browser call after a timeout.

Final production code `d32307c` is validated by the checks below:

- `npm run typecheck`;
- all **2,592 unit/robot tests in 271 files**, including every full-dialogue chapter and saved-reveal regressions;
- `npm run build` and size gates: **646.7 KB gzipped JS**, **5,762.7 KB boot**, **89.2 KB** deferred adventure pack;
- `npm run privacy-check`: **1,029 tracked / 187 built / 439 media** files, built-in rules and metadata scan.
  Local exiftool and the optional private denylist are unavailable; the CI check runs its configured tools.

The final immutable production HTML SHA-256 is
`c763e6b9cbbde8fe8f4cc3b1da4f707f44b206b844f9e3dd880cd45ac9b3b8fa`.
The local private-model phone review established the visible figure while steering the owl and a framed first
Billsta line before its automatic continuation; its actual saved-game failure led to the added recovery fixes.
The continuation's PR records the final private replay review, exact-head browser CI and Pages deployment
before delivery. All registered browser suites, including the new walk-and-talk suite, are part of that CI gate.

Browser viewport checks and controlled simulation clocks do not establish physical-phone frame rate. Private
model captures stay in ignored scratch and are never committed.
