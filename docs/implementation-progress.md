# Implementation progress

Technical progress for the implementation PR stack. Detailed historical handover edits remain local pending publication review.


## Add the optional shy-lights route in Myren

Myren gains the C3 shy-lights route, with sequential lights, clear reset rules and forgiving jumps. The return rejoins the chick and follower so choosing the optional path cannot bypass the story.

Validation: integrated typecheck and eight route tests; focused browser checks include reward persistence, three hints, Low/High, both orientations and continuation through the chapter ending.

## Add the optional cairn route above the old pine

Berget gains the C4 zigzag challenge above the old pine, with reward and downward return ledges. The shelves stay clear of the goal boundary so missed or coyote jumps cannot finish the chapter accidentally.

Validation: typecheck and all 513 integrated unit/robot tests pass. Source browser checks cover hints, saved rewards, return paths, both orientations and Low/High within the draw-call budget.

## Make the garden dew bells a replayable musical toy

The four dew bells play a fixed D–F–A–D phrase. Completing the tune adds visible lawn sparkles, and the bells can be played again without changing story progress.

Validation: integrated typecheck and nine focused tests; source unit/robot and browser checks passed. The sparkle objects are reused during play.

## Let the mountain cobbles play again

The shore cobbles now form a replayable musical toy with fixed notes. Playing them again leaves story and collectible progress unchanged.

Validation: both integrated cobble tests and source browser toy checks passed.

## Add the forest berry gift and return reward

The forest's tiny door accepts a berry gift. Leaving and returning reveals a saved keepsake, separate from the 16 candy types; the story ghost encounter remains intact.

Validation: integrated typecheck and all 524 unit/robot tests pass. Source browser checks cover the gift, departure, return and saved reward.

## Adapt graphics from measured busy work and sustained frame cost

Auto graphics measures CPU work at safe menus and selects a tier once. During play, sustained load adjusts pixel ratio in bounded steps with delays between allocations and reversals. Manual tiers and benchmark runs remain fixed; hidden pages stop drawing.

Validation: integrated typecheck and 19 quality tests; 16 source browser checks exercise injected CPU cost, target allocation counts and stable shaders. CPU measurements cannot diagnose GPU-only stalls.

## Add separate sound and music volume controls

Settings now offer separate effects and music levels in ten-percent steps, with accessible buttons for touch, keyboard and controller. Values are saved per player, clamped on load and preserved when changing play style; existing mute switches still work.

Validation: typecheck and 46 integrated settings/save tests pass. Source browser checks cover all input methods and persistence.

## Recover safely from loading failures and interrupted play

Required models and decoder loads now have bounded waits and retry controls. WebGL context loss saves and pauses the game, restores rendering in place, and returns to the prior menu state. Audio cancels scheduled sounds while blocked so resuming cannot play stale notes.

Validation: integrated typecheck and lifecycle/fetch tests pass. The source feature passed 30 browser checks covering context loss, failed model/decoder retries, saved progress and repeated audio suspension. Includes the separately verified slow-frame calibration repair from #72.

## Prevent old tabs from overwriting a recreated player

Deleting the final default player and starting fresh previously reused an empty save generation. An older tab could overwrite the new adventure. Freshly created players now receive a new generation while existing saves retain their migration behavior.

Validation: all 36 save tests and typecheck pass, including stale writers from legacy and newly created profiles and continued writes by the fresh profile.

## Choose candy and recipients at the summit

The summit sharing moment now lets the player choose a candy and recipient. The jay accepts its intended berry; canceling is safe and gifts do not deduct from the collection. Story panels join the shared pause, audio, photo and focus guards, including recovery states.

Validation: typecheck and 14 integrated story/summit tests pass. Source browser checks cover touch, keyboard, controller, saved gifts and continuation to the golden candy.

## Paint the prologue eyes with a forgiving brush gesture

The opening painting action now follows a real brush stroke. Short or wobbly strokes receive the planned assistance; keyboard and controller use the same guided shape. The simulation awards progress only when an eye is completed.

Validation: integrated typecheck and story tests pass. Source browser checks exercise pointer, touch and guided input, interruption and story continuation.

## Carve the epilogue figure with three outward strokes

The epilogue carving now uses three safe outward strokes, followed by painting the eyes. Inward or incomplete movement does not award progress. Keyboard and controller provide guided cuts, and interruption cancels pending completion safely.

Validation: typecheck and 28 integrated stroke/ending robot tests pass. Source browser checks cover touch, keyboard, controller, rejected strokes and saved completion.
