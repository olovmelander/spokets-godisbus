# Godisracet – Varggropen

An optional game at the television in Prolog, Godiskalaset, Stormkvällen and Morgonen. Walk near the TV and
choose **Spela på TV:n**. An existing story interaction keeps priority on the ordinary action button;
the TV has its own visible choice where the two overlap. Held story scenes finish before the console opens.

The console preserves the live adventure rather than loading another chapter. The house's simulation,
camera, speech, input, automatic photos and collection/save receipts wait while the console owns the screen.
Leaving returns to the same place, with no race input carried into Elof's controls. The game is a lazy local
bundle with its own disposable renderer, input listeners and sound graph. No network service is involved.

## What was ported

Source: `olovmelander/pekkas-pokal`, commit `776236004403fb18423cc078ba4a82a6324bde14`,
`src/games/kart/`. The 77-point Varggropen trace remains unchanged and uniformly scaled to 665 m. Its route
sampling, tyre/yaw model, road surface lookup, racing-line AI, contact solver, camera and road/material helpers
form the foundation. See [the source research](https://github.com/olovmelander/pekkas-pokal/blob/776236004403fb18423cc078ba4a82a6324bde14/src/games/kart/research.md)
for the trace's provenance and the limits of its interpreted terrain heights. The source app's shell,
participant identities, advertisements and large people-model dependency tree are not part of this port.

## The console's own game

- Three laps against the wooden fox, owl and hare. The player's kart has Elof's golden-crown motif; the toy
  figures are original game characters, not substitutes for the family's private models.
- Steering, tyre grip, grass/kerbs, gentle kart contact, braking/reverse and drafting use the source model.
  Deliberate sladding loosens rear grip. Sustained controlled cornering charges blue, then gold sparks;
  releasing the drift spends that charge as a short boost. Repeated straight-line taps do not earn it.
- Golden sweets along the track provide a single held boost. There are no weapons, lost lives or deductions
  from the adventure's candy bag. Race sweets and adventure collectibles are separate activities.
- Automatic gas is on initially, with manual gas available. **Lugnt** gives extra help and gentler rivals.
  Keyboard, multitouch and a standard gamepad can steer, brake, drift and use sweets.
- Forest light, wood grain, a crown, small animals, northern-light colours and a finish-line celebration
  bring the race into Elof's story without spoiling the ghost's later name.
- Optional best race/lap times are local to the current player and driving mode. They never modify the
  adventure save. Generation checks stop a stale tab from restoring records after a profile reset.

## Interruption and access

Pause freezes the countdown, lap clock, all drivers and effects. Page hiding, window blur and host recovery
also stop driving; resuming takes a deliberate action. Restart and return to the house are always available.
Held gamepad controls must be released before driving resumes. Reduced motion removes the camera's racing
shake and uses calmer decoration. Audio follows the player's existing effects/music settings.

The menu, HUD and controls are composed for both portrait and landscape phones. Browser viewport review
establishes appearance and interaction at those dimensions; physical-device performance is a separate check.
Final automated/browser/visual evidence and the exact published revision belong in the delivery PR.
