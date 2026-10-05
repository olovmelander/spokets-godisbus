# Visual audit: Granskogen (chapter `granskog`)

> One of seven audits made on 5 October 2026: see [the overview](../visual-audit.md). The auditor looked at
> 20 to 30 pictures of the running game at 1180×820 and 844×390, on High and on Low, with stand-in figures.
> Names in brackets such as `b03` or `p17` are the auditor's working pictures, which are not kept. File names
> are as they were that morning: `src/render/dressing.ts` has since become `src/render/dressing/`, a module
> for each place. Line numbers are of that day.

## The first second

A stranger sees a soft, luminous green forest: the far layers with their blurred spruces and round spots of light are already a picture, and the candy, the lingonberries and the jay read at once against them. Then the eye drops, and the lower 35 to 40 % of every picture is one olive slab with vertical smears (the front of the moss bank). Everything the chapter names (the cone "as big as a car", the high root, the anthill, the fallen log, the stone) is that same slab raised into a block. The newest things look most like placeholders: every bough stands on a flat brown board with a sawn-off top, and a cone is an egg, a ball or a nut depending on who draws it. The whole place is one yellow-green: no rust-brown needle floor, no cool shade, no pool of sun on the ground, and nothing on the floor moves.

Measured with stand-in figures (`shot.mjs`):

| Place | 1180x820 | 844x390 |
| --- | --- | --- |
| Start, x 4 | 79 | 91 |
| Far bough, x 29.6 | 109 | 117 |
| Ant road, x 56 | 116 | 117 |
| Ant road, x 52 | not measured | **123** |

Low is 7 lower.

## Findings

| # | Where (chapter, x, what) | What is wrong | The fix, concretely | How (three.js / Blender / canvas / data) | Files | Cost (S/M/L) | Draw calls (+/-/0) | Gain (1-5) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | granskog, everywhere: the bank's lip in front of the path (z 0.95 to 2.15), the lower 35-40 % of the picture | `stretchOfGround` maps the texture with `v = (z - drop) * 0.55`. Down the lip z and drop grow together and cancel: v runs 0.48, 0.61, 0.50 over rows z 0.95, 1.5, 2.1. So 31 texels go forward and 28 back over 1.6 EL of surface about 200 px tall: the speckles are pulled up to 4:1 into vertical streaks and mirrored. Nothing stands on it: scatter in front stops at z 0.95. It is the nearest, sharpest surface in the game and it is empty. | (a) Map by length: u = length along the ground outline, v = length along the profile (sum of sqrt(dz^2 + ddrop^2)). (b) A forest profile that slopes forward instead of rolling over: rows z 0.45/drop 0, 0.9/0.04, 1.5/0.22, 2.2/0.55, 3.0/1.0, 3.8/1.6, 4.6/2.6, 4.8/16. The picture's lower edge then cuts the slope between z 2.9 and 4.0 (zoom 1 to 1.45), so under his feet lie 2.7 EL of forest floor seen from above, not a face. (c) Scatter down it with the rule "nothing in front is taller than its drop minus 0.05": cushions and needles from z 0.5, sprigs and cones from z 1.2, ferns to 1.0 EL from z 2.6. (d) Shade towards `#1d3a3a` (cool), reaching 0.5 only at drop 1.6. | three.js: geometry and UV in `stretchOfGround`, a `PROFILE_FOREST`, the `depth()` rule in `stretch`. The same on Low. | `src/render/dressing.ts` (`PROFILE`, `stretchOfGround`, `stretch`) | S for (a), M with (b)-(d) | 0 | 5 |
| 2 | granskog x 20-23.5, 44-66, 132-137, 183-185.4; the gap 88-89.4, the ravine 118-126, the pool 156-176, the eddy 185.4-188.2: every raised front and every wall | Raised ground shows the bank's front face (z 2.6 to 2.9, 16 EL down) in moss tones with speckles: at x 42 a green wall fills 55 % of the picture. Moss does not grow down a 4 or 10 EL face. Walls (`p.wall`) are 82 % flat `#3d2f20`, and their u is `p.x * tile`, constant up a vertical wall, so the texture is one smeared line. The lip's rounding gives each wall top a brown "eave" (x 60). In deep shade walls go black (x 137), against art bible 2.2 "the shade is cool, not black". | Split the bank into top and front: rows below drop 1.6 become a second mesh with its own tiling picture. Its look, from the top down: moss hangs over the edge 0.3 to 0.8 EL (noise-cut, in vertex colours), then 1.2 EL of dark humus with pale fine roots (`#2b2018`, roots `#8a6a48`), then lichen-spotted granite (`#6f736f` to `#a3a59e`, lichen `#c9cdbf`, cracks `#3a3f3f`) fading to `#16302e` by drop 8. Walls take the same picture, mapped from the side (u = height, v = z). | three.js (second mesh, vertex colours). Texture from a CC0 Poly Haven rock and a soil, baked in Blender to one 512x512 KTX2 that tiles in u, 64 px to the EL; canvas-drawn until then. | `src/render/dressing.ts` (`bank`, `stretchOfGround`, `GROUNDS.moss.wall`), `art/baked/boot/`, `LICENSES.md` | M | +1 | 5 |
| 3 | granskog: the root x 9-15, the giant cone 20-23.5, the high root 44-60, the anthill 60-66, the log 132-137, the stone 183-185.4 | The chapter's landmarks exist only in its comments. Each is ground outline, so each is drawn as moss bank: "a cone as big as a car" is a mossy box (03), the fallen log where the ghost is nearly caught is a 0.8 EL mossy step (21), the anthill is a brown wall beside a green cliff (10), the stone is a lawn kerb (25). | A `landmarks` list in the chapter (`{ from, to, look, base }`): the bank draws flat floor at `base` there, and a model from the forest kit stands over the outline, its top within 0.06 EL of the outline's. Cone: lying, 3.5 x 1.2 EL, half sunk in moss, scales in 8 and 13 spirals. Log: 5 EL of spruce, bark `#7d6753`, moss along its top, three broken stubs, a torn end at x 137. Anthill: a dome of rust needles 7 EL wide over x 59.5-66.5 with a flattened top at y 10, holes, twigs in it. High root: a mossy granite shelf with a root as thick as he is tall laid over its edge at x 44. Stone: a grey boulder with a flat top, wet at the waterline. Root 9-15: a root's back breaking the moss. | Blender (`art/blender/forest-kit.py`: vertex colours with baked AO, no texture, as `candy.py`); data; three.js to place them | `src/content/chapters/granskog.ts`, `src/sim/types.ts`, `src/render/dressing.ts` (`bank`), `src/render/view.ts` (install, as `jay.glb`), `art/baked/boot/forest.glb` | L | +1 or +2 | 5 |
| 4 | granskog x 21-33, 81-87, 138-153: the boughs, the bark plates, the nest | `ledgeShape` scales the whole shape by the ledge's width, the stem with it: the 3.9 EL bough at x 29.65 stands on a board 1.25 to 2.0 EL wide and 0.3 to 0.5 deep that ends in a flat cut 2.6 EL above it, in plain `#6e5238` (05, 15, 16, 30). It is the largest thing in those pictures. The bough is a bare rod; a bark plate is a hexagonal tray; the "nest" at x 140 is a rod. Nothing is spruce. | Build stem and ledge apart. The stem is not scaled: radius 0.3 at the ledge and 0.42 at the ground, 9 sides, rising 16 EL (its top is never in a picture), bark tones per ring (`#5c4a3a` to `#8a735c`), two whorls of thin dead twigs. Bough: tapers 0.11 to 0.05 towards both ends, a collar at the stem, and needle sprays as flat fans of thin triangles (rib and 10 pairs, 20 triangles a spray, 8 sprays to the EL, `#234a2e` to tips `#6f9440`) hanging below and behind its top line, never above it. Bark plate becomes a bracket fungus: a half disc with a rounded lip, top `#6a5a4a`, a band of `#b9772e` (ochre, not red), rim and underside `#efe3c4`. A new look `nest`: a shallow bowl of twigs with moss, flat inside. | three.js: shapes in code, still one merged mesh per place; data for `look: 'nest'` at x 140.05. The same on Low. | `src/render/ledges.ts` (`LOOKS.branch`, `LOOKS.bark`, `upright`, `ledgeShape`), `src/sim/types.ts` (`LedgeLook`), `src/content/chapters/granskog.ts` | M | 0 | 5 |
| 5 | granskog, every picture: what carries him, while he is not riding | In `render`, every ride's prop is set to scale 0 and moved to his feet each frame, never hidden. three.js draws a mesh of no size whose centre is in the picture: the ants' ten balls and the cap's two parts are 12 draw calls in every frame of the chapter. Measured by changing the served `view.ts` in the browser only: 79 to 67 at x 4, 123 to 111 at x 52 on a phone. | `c.prop.visible = c === carrier` beside the scale. Hidden things are still compiled by `renderer.compile` in the warm-up, so nothing compiles when he first rides. | three.js, one line | `src/render/view.ts` (`render`, the loop over `carriers`) | S | -12 | 3 (it pays) |
| 6 | granskog, every picture: the soft cards | `foreground()` makes each far shrub and each foreground tuft its own `Mesh`, and `effects()` each shaft its own mesh and material. Counted from the game's own number sequences: 0 to 2 tufts + 5 to 11 shrubs + 1 to 4 shafts = 9 to 15 draw calls in a picture, most on a phone. | Three meshes for the chapter: the 66 shrub quads merged, sorted from z -16 to -8, with the three shrub pictures side by side in one 288x64 picture; the 29 foreground quads the same (288x96); the 20 shafts as one `InstancedMesh` whose instance colour carries each shaft's brightness (additive, so colour is opacity). | three.js | `src/render/dressing.ts` (`foreground`, `effects`) | S | -6 to -12 | 4 (it pays for rows 2, 3, 13, 17) |
| 7 | granskog x 46-66: the ants, the needle mats, the twigs, the berry, the door | Six ants at the lift are 18 meshes (`spotProp` 'ants': three `ball()` each). Each `ant-column` mover is 2 draw calls (six of them), each twig 4, the berry 5, the vittra door 5. And they are greybox: strings of black beads hanging under floating olive boxes (09). | One `InstancedMesh` of an ant from the kit (three segments, six legs, feelers, 140 triangles, `#2a1e18`) for every ant of the place: at the lift, on the columns, on the ride, and 30 more walking the road x 46-58 at z -0.5, which costs nothing. Needle mats: one instanced raft of crossed needles and a leaf, carried on the ants' backs. Each twig, the berry and the door one merged shape. | three.js (instancing, matrices written each frame); Blender for the ant | `src/render/props.ts` (`moverProp` 'ants' and 'twig'; `spotProp` 'ants', 'berry', 'vittra-door'; `rideProp` 'ants'), `src/render/view.ts` (`buildMovers`) | M | -25 to -30 at x 52, about -20 at x 56 | 4 |
| 8 | granskog: every cone (scatter; movers at x 103.4, 116 and 85.75; rollers x 70-104) | Four shapes for one thing, none a cone: a 9-sided spindle on the floor (`KIT.cone`), a faceted egg as tall as he is (`moverProp` 'cone', 18), a faceted ball on the bough, a smooth brown ball rolling (`buildCones`, 30). Art bible 2.7 asks that each be recognisable at phone size. The 1.1 x 1.5 EL cone and the 3.5 EL one are three and seven times the 0.5 EL of 2.1, which does not note it. | One spruce cone from Blender at two levels of detail: 400 triangles (110 scales in 8 and 13 spirals, each lifting at its tip) for movers and rollers, 110 triangles (a toothed outline, the spirals in vertex colours) for scatter. Colours `#8a5a30` on the scales, `#5c3a1e` between, `#b98a52` on lit tips. Rollers lie yawed 0.5 rad, so their length shows while they turn. Note the big cones in art bible 2.1. | Blender (kit); three.js swaps the geometry into `KIT.cone`, `moverProp`, `buildCones` | `art/blender/forest-kit.py`, `src/render/dressing.ts` (`kit`), `src/render/props.ts`, `src/render/view.ts` (`buildCones`), `docs/art-bible.md` | S once the kit exists | 0 | 4 |
| 9 | granskog, everywhere: the moss cushions (`stretch`, 22 to the EL) | Smooth spheres of 8 by 6, one plain material, lit lime: they read as green pebbles or clay (crop-01-floor). About 400 a stretch is 32,000 triangles: most of a picture's 170,000. | Three clumps from the kit, 60 to 90 triangles each: a cushion with a knobbly outline, a flat feathery mat with a ragged edge, a pale tuft of reindeer lichen (`#c9cdbf`). Baked AO in the vertex colours: base `#1f3318`, body from the palette's `#35521f` and `#587a27`, tips `#7f9a30`; the gold `#b3ae45` only where a shaft lands. 8 to the EL, and larger (0.2 to 0.6 EL). | Blender (kit); three.js: the three clumps merged into one geometry behind the one instanced mesh, or the cushion alone | `src/render/dressing.ts` (`kit`, `stretch`) | M | 0 | 4 |
| 10 | granskog, everywhere, and the slope x 70-104 | Art bible 2.3: "rust-brown needles", "cool blue-green shade". The needles are 0.012 EL boxes, 2 px wide: no colour mass. "The needle slope" is the same moss as everything else (13, 17). The place is one hue. | Paint needles into the ground instead of scattering boxes. A weight per vertex (1 on x 69-105; 1 within 1.3 trunk radii of a trunk, fading by 2.5; 0.35 along the path, z -0.3 to 0.45, as a trodden trail) blends two tiling pictures in the ground's material: moss, and needle litter (`#6b4424`, `#84552c`, `#9a6a36`, `#b4864a`). Drop the `needles` instanced mesh. Rust against green is the place's warm against cool, and the candy stays the brightest thing. | three.js: one `onBeforeCompile` on the ground's material, compiled in the warm-up, the same on Low. Two 512x512 KTX2 from Poly Haven (CC0) forest-floor scans, tiled 2 EL; canvas-drawn until then. | `src/render/dressing.ts` (`toneAt`, `stretchOfGround`, `stretch`) | M | -2 | 4 |
| 11 | granskog, every picture: L4, the foreground, and the top of the picture | Art bible 2.2: "tufts of grass far out of focus along the bottom". `blurredTuft` draws 16 strokes 13 px wide on 96 px at alpha 0.3: on screen they are dark green blotches on a dark green bank (08, 10, 13, 16, 25), like marks on the lens. Nothing frames the top: a spruce forest from below has boughs overhead. | Draw the silhouettes at 256 px with real outlines, blurred 3 px: a fern frond, a lingonberry sprig with five leaves, three grass blades, a spruce twig. Core `#10231c`, a 2 px warm rim `#4f6a26` on the sun's side. Add hanging spruce boughs at z 4 to 6 over the top 15 % of the picture, at the corners. A chapter says where a frame stands (`frames: [{ x, kind }]`): at x 4, 38, 63, 112, 134, 154, 186. All in row 6's one mesh. | canvas (or four small renders from Blender); data. The same on Low. | `src/render/dressing.ts` (`blurredTuft`, `foreground`), `src/content/chapters/granskog.ts` | M | 0 | 4 |
| 12 | granskog, everywhere | Nothing on the floor moves: grass, sprigs, boughs are still. Only the shafts' brightness and 70 motes change. | Wind in the vertex shader of grass, ferns, sprigs and bough sprays: tip offset 0.08 EL at 0.5 Hz, phase from world x, and a gust (0.2 EL) passing left to right every 6 s. A needle or a yellow birch leaf falling every 2 to 4 s: 8 instances. Still when reduced motion is asked for. | three.js: `onBeforeCompile` on `KIT.grass` and the kit's material, a sway weight per vertex (its height); compiled in the warm-up; the same on Low | `src/render/dressing.ts` (`kit`, `stretch`, `effects`) | S | +1 (the falling) | 4 |
| 13 | granskog, everywhere: where things meet the ground, and where the shafts land | Trunks, stones, cones and stems stand on evenly lit moss with no dark at their foot, and a shaft of light leaves no light on the ground: the floor has no light and shade of its own. | One instanced mesh of soft discs lying on the ground with premultiplied blending, so one material both darkens and lights: a skirt `#0f1f1c` at alpha 0.45 under each trunk (1.6 radii), stone, landmark and stem; a warm pool `#ffe9a8` at 0.35, 2 to 3 EL wide and stretched along the sun's direction, where each shaft meets the ground. 60 to 80 instances for the chapter. | three.js, as `character-blobs`. The same on Low. | `src/render/dressing.ts` (new, beside `effects`) | S | +1 | 4 |
| 14 | granskog, everywhere: 16 EL behind the path | The bank ends at z -16, rising 0.6 with bumps of 0.5, tilted towards the sun: a hard-edged mustard ridge against the soft far layers in nearly every picture (01, 05, 18, 19). The shrub cards meant to hide it do not. | Two more rows, z -22 and -30, their vertex colour going to the haze `#b4c79a` so the edge cannot be found; halve the bumps behind z -10; tones behind z -6 go towards `#5f7f6a`, paler and bluer with distance, not yellower. | three.js: `PROFILE_FOREST`, vertex colours | `src/render/dressing.ts` | S | 0 | 3 |
| 15 | granskog, everywhere: the undergrowth | Nothing on the play plane says spruce or autumn: no young spruce, no fern, no mushroom, no fallen leaf. Young spruces are only in the blurred far layers. | From the kit, merged with the stones and cones into one still shape per stretch: a spruce seedling 2 to 3 EL tall (a real tree at his scale, 300 triangles, four whorls), oak fern 1 to 1.5 EL (`#4f7f32`, tips `#b5a83e`), chanterelles 0.4 EL (`#e8a93a`) in threes, a cep (cap `#7a5230`, stem `#e6dcc4`), blueberry twigs with a few dark berries, yellow birch leaves lying flat (`#e6c53a`). No fly agaric: red stays the candy's. | Blender (kit); three.js: merged at load, vertex colours, one mesh per stretch in place of `cones` and `stones` | `art/blender/forest-kit.py`, `src/render/dressing.ts` (`stretch`) | M | -2 | 4 |
| 16 | granskog, everywhere: the trunks (`trunk`, `bark`, `stretch`) | Identical bare pillars: no dead twigs, no lichen, no stubs, a lean of 0.02 rad at most. The bark is 260 strokes on 128x256: fine when sharp (28, on Low), gone on High. Each trunk is 60 EL tall, so each stretch's bounding sphere is about 45 EL in radius; I estimate five stretches of trunks are drawn where two are seen. | Two trunks: an uneven root flare, 6 to 10 thin dead twigs in whorls from 3 EL up, beard lichen on some (`#9fb09a`), moss up one side. Bark from a CC0 Poly Haven spruce or pine bark, 256x512 with a normal map (none on Low), tiled 2 EL. Set each trunk mesh's bounding sphere by hand: centre at ground + 6, radius 16. | Blender or code for the shape; texture baked; three.js | `src/render/dressing.ts` (`trunk`, `bark`, `stretch`) | M | about -3 (estimated) | 3 |
| 17 | granskog x 153-179: the forest pool | The shore is a vertical cut (23). The bank is 16 EL deep and the water 46: beside the far wall a pale slab shows under water (31 at x 1097, y 420-575; 24 at the right edge). On the ride half the picture is the water's front face over a bare bumpy floor (31). Nothing floats, swims or grows at the edge. | Ground rows to z -46 where the chapter has water. The shore: the last 2 EL before x 156 and after x 176 slope 0.5 EL into the water, wet soil `#3a2f25`, five stones, sedge. In the water, in the stretch's still mesh: a sunken branch, stones, three water-lily stems rising to pads at the surface (z -1.5 to -6, never on the cap's way). Three perch as one instanced mesh, crossing the picture in 4 s. | three.js; Blender (kit: lily pad, perch) | `src/render/dressing.ts` (`bank`, `stretch`), `src/render/water.ts` (`back`) | M | +1 | 4 |
| 18 | granskog x 154.6-177.4: Bertil's cap (`rideProp` 'cap') | A navy half ball with a flat wedge: a bowl, not a cap (31). It is `#3f5f8f`, while Bertil's colour everywhere else is orange (`SIGNS.callBertil` `#d98a2c`, art bible 2.7). It leaves no ripple. | A six-panel cap from the kit, upside down: seams, the button under it, a sweatband inside, a curved peak forward, 350 triangles, no mark on it. Ask Olov which colour Bertil's cap is; until then orange. It noses down as it starts, and two rings spread from it (in the water's shader, from the ride's position). | Blender (kit); three.js | `src/render/props.ts` (`rideProp`), `src/render/view.ts`, `src/render/water.ts` | S | 0 | 3 |
| 19 | granskog x 185.4-188.2: the eddy, and the leaf (`moverProp` 'leaf') | "Spöket i virveln" is a straight canal 2.8 EL wide running to the horizon, with still water (26). The leaf is a flat yellow plate. | The whirl in the water's shader: a spiral of pale foam `#dfeee6` turning once in 3 s round (186.8, z -0.2), radius 1.3, the surface dipping 0.1 at its middle. Close the canal: ground at z -5 behind it, stones at its rim. The leaf: a birch leaf from the kit, toothed edge, veins, a curled rim, `#e8b63a`. | three.js (a uniform for the whirl's place, compiled with the water; plain flow on Low); Blender (leaf) | `src/render/water.ts`, `src/render/props.ts`, `src/render/dressing.ts` | S | 0 | 3 |
| 20 | granskog x 60-66, y 10: the hilltop and the vittra door (`spotProp` 'vittra-door') | The door is a brown crate with a stick across it (11, crop-11-door): five meshes, and not a door. The hilltop is a mossy cube in haze with a thin rod (the root climb) beside it. | From the kit: two roots of a trunk meeting in an arch 0.9 EL high, a plank door with a rounded top in it, an iron ring `#3a3a3a`, a moss roof, a step of bark, and a warm slit of light under the door (`#ffd27a`) once the ghost has been there. Stand a trunk at x 64.4, z -1.4 for it to belong to. No creature. | Blender (kit); three.js; data: a trunk's place | `src/render/props.ts`, `src/render/dressing.ts` (`stretch`: a chapter may fix a trunk) | S | -4 | 3 |
| 21 | granskog x 43.7, 59.7, 63.1, 66.3 (climbs); 57.2, 53.8, 62 (twigs); 113.2 (seesaw) | `buildClimbs` draws the beard lichen and the roots as plain rods of radius 0.06; the twig is a brown bar with three stubs (crop-10-twig); the seesaw is a sawn plank in a forest. | Lichen: seven hanging strands of different lengths, pale `#b9c4a6`, thinning, swaying. Root: a gnarled tube from 0.18 to 0.09, with knobs, pressed to the wall. Twig: a forked spruce twig with bark and a few needles, from the kit. Seesaw: a peeled round stick with a knot. | three.js (shapes in code); Blender (twig) | `src/render/view.ts` (`buildClimbs`), `src/render/props.ts` ('twig', 'seesaw') | S | counted in row 7 | 3 |
| 22 | granskog, everywhere: the stones (`boulder`) | The best of the stand-ins, but smooth, and with the sun behind them their near side falls to dark navy: at x 4 and x 90 a stone reads as a hole (crop-01-floor, 16). | Three shapes from the kit with planes and a crack, base `#9a9c97`, lichen spots `#c9cdbf` and `#b5a23c`, AO at the foot, the moss cap as now. In row 15's merged mesh. | Blender (kit) | `src/render/dressing.ts` (`boulder`, `stretch`) | S | 0 | 2 |
| 23 | granskog x 38: the jay | The trail's sweet at (38, 0.45) hangs in front of the jay at (38, 0), z -0.6, and hides its body (06, 07). Its idle is a slow turn. | Stand it on a stub 0.8 EL high from the kit, so its head is above the sweets' line, or let the row of sweets skip x 38. Idle: a head tilt, a tail flick, a hop every 4 s. | data or three.js | `src/content/chapters/granskog.ts`, `src/render/props.ts` ('jay') | S | 0 | 2 |
| 24 | granskog x 118-126: the ravine | The set piece where Pappa sends him flying is an empty slot 8 EL wide between two brown planes (20). | With row 2 its walls are rock and roots. Add, in the still mesh: ferns on ledges of the walls, a thin fallen spruce across it at z -4, and a sheet of mist low in it (one quad in row 6's mesh). | three.js; kit pieces | `src/render/dressing.ts` | S after rows 2 and 15 | 0 | 3 |
| 25 | For the other auditors | Pipeline: the grade turns every green yellow; High's blur softens every trunk from z -4.5, so Low has the better bark (28 against 01); nothing on the play plane has the bright rim of art bible 2.2; on Low the pool is flat turquoise (29). As row 5, in every chapter: the helper's three figures, the lace and the paper plane are drawn at no size or no opacity. Far scenery and life: no animal or bird anywhere behind the path. | | | | | | |

## The five to do first

**1. Clear the budget (rows 5, 6 and 7, and the trunks' bounds from row 16).**
- **Built, in this order:**
  1. The idle rides hidden (one line).
  2. The shrubs, the foreground tufts and the shafts as three meshes.
  3. The trunk meshes' bounding spheres set by hand.
  4. The ants as one instanced mesh, the mats as one, and each twig, the berry and the door merged.
- **Done when:** `shot.mjs` prints at most 80 at x 52 and at most 95 at x 29.65, y 2.41, both at 844x390, and at most 60 at x 4 at 1180x820. The pictures at x 4, 27 and 36 cannot be told from today's, except that the ants are ants.
- **Could go wrong:**
  - Merged cards no longer sort one by one against other transparent things: keep their render orders (-1, 5, 3) and sort the quads by z when merging.
  - Instance colour on the shafts is a new shader variant, so it must be in the warm-up.
  - The ants' shadow is registered on the spot's group: keep the group.
- **On Low:** the same.

**2. The ground (rows 1, 2, 10 and 14).**
- **Built, in this order:**
  1. The mapping by length (ten lines, and the smear is gone the same day).
  2. `PROFILE_FOREST` with the forward slope and the rows to z -30.
  3. Scatter down the slope.
  4. The needle weight.
  5. The two ground pictures and the front's picture.
  6. The second mesh for fronts and walls.
- **Done when:**
  - At x 4 the floor runs from his boots 2.7 EL towards the camera with clumps, needles, sprigs and a cone on it, sharp near him.
  - No vertical streak and no plain speckled face is in any picture.
  - At x 42 the high root's front is lichen-spotted rock with moss hanging over its edge and roots under it.
  - From x 70 to 104 the floor is rust-brown with islands of moss.
  - Behind the trunks the moss has no edge.
- **Could go wrong:**
  - The lawn, the bog and the mountain take their profiles from `PROFILE`, so the forest needs its own.
  - The cameras with `lift: -1.4` (the nest) see to about drop 3.4: carry the slope on to z 5.4/drop 3.6, or let the face below it go dark.
  - Anything standing in front must stay under his boots' line.
  - The golden frame `look-forest` changes and is shot again.
  - Within 0.3 EL of the path the ground stays level (art bible 2.2).
- **On Low:** the same pictures, no normal maps.

**3. The forest kit in Blender (rows 3, 8, 9, 15 and 22, and the pieces rows 17 to 21 use).**
- **Built:** `art/blender/forest-kit.py`, in the manner of `candy.py` (shapes from tables, colours on the corners, AO baked, no texture), to `art/baked/boot/forest.glb`. In this order:
  1. The cone at its two levels of detail.
  2. The three moss clumps.
  3. The three stones.
  4. The landmarks: the lying cone, the log, the anthill, the high root's shelf and root, the stone at the eddy.
  5. Seedling, fern, chanterelle, cep, birch leaf.
  6. Ant, twig, vittra door, cap, leaf boat.
  
  The game swaps each in where its stand-in is, as it does `jay.glb`, before `ready`.
- **Done when:**
  - At x 105 the cone is a cone at 844x390 with the colours taken away.
  - At x 21 he stands on a lying cone.
  - At x 134 he stands on a log with bark, moss along its top and broken stubs.
  - From x 56 the anthill is a dome of needles with ants on it.
  - The kit is at most 120 KB as served.
- **Could go wrong:**
  - The simulation's ground is boxes, so each landmark's top must lie within 0.06 EL of its outline, or his feet sink or float.
  - Swapped geometry must keep the stand-in's unit size and material class, so that no program is compiled after the warm-up.
  - Until the kit is made on Olov's computer the stand-ins stay: build nothing that needs it to run.

**4. The boughs (row 4).**
- **Built:** `upright` and the ledge apart in `ledgeShape`; the stem with bark tones and twigs; the bough with taper, collar and needle sprays; the bracket fungus; the nest.
- **Done when:**
  - In the picture at x 29.65, y 2.41 no flat brown board and no cut top is in the frame.
  - No stem is wider than 0.85 EL.
  - Each bough is spruce at a glance, with green below its top line and a clean line where he stands.
  - The plates at x 138-140 read as fungi on a stem.
  - At x 140 he stands in a nest.
- **Could go wrong:**
  - Sprays that hide hearts and lollipops: keep them under the top line and darker than any sweet.
  - `branch` and `bark` are used in other chapters: look at each afterwards.
  - The ledges that grow out on a flag use the same shapes as instances.
  - On the slope a stem's foot must still reach the ground.

**5. Light and life on the floor (rows 11, 12 and 13).**
- **Built, in this order:**
  1. The disc mesh with skirts and pools.
  2. The wind.
  3. The new foreground silhouettes and the boughs over the top, placed by the chapter.
- **Done when:**
  - Every trunk within 6 EL of the path stands in a soft dark skirt.
  - Under each shaft lies a warm pool the trail passes through, about 0.4 stops brighter than the moss beside it.
  - Grass tips move 0.08 EL and a gust crosses the picture every 6 s.
  - The first picture (x 4) has a bough across its top left corner and a fern at its bottom right, and both read as plants.
- **Could go wrong:**
  - A pool must not lift the moss to the candy's brightness: cap it at 0.35.
  - The discs need the blobs' polygon offset, or they flicker on the slope.
  - The sway reads the instance's place for its phase, and must be compiled in the warm-up.
  - Reduced motion turns the sway off.

## Keep

- The far layers: blurred spruces, soft columns and round spots of light. They are the best thing in the chapter (01, 20, 27).
- The lingonberry sprigs: dark glossy leaves and red berries read at phone size and are the place's own red.
- The jay from Blender, and the way it came (`art/blender/*.py`, a stand-in until the file arrives).
- The level, sharp play plane, with low cushions where he walks so that his boots show.
- Grass lit from behind (the emissive in `KIT.grass`): keep the idea, a little less yellow.
- A near trunk with its root flare, seen sharp (27, 28).
- The motes, and the rings hanging on cords from above.
- One mesh per place for ledges and for rings: the discipline rows 5 to 7 extend.
- The water's surface on Mid and High: the ripples and the sun's glints (23).
