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
