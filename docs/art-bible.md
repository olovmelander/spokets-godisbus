# Art bible

How the game should look, and how each part of the look is made. The plan (`game-plan.md` §5) sets the
direction; this file holds the rules a session follows while building. It grows through Stage 0b and 0c.

Written so far: the characters (§1) and the look of a place (§2), with the first golden frame.

## 1. Characters

### 1.1 The decision (Olov, 3 October 2026)

- **Elof, the family and the other people are stylized cartoon characters.** In Olov's words: "designed like a
  Fortnite character, stylized 3D cartoon design", "more like in the reference character photos and the poster",
  "a Pixar, Unravel or Disney character". The target is the look of his own sheets and poster.
- **The ghost stays a carved wooden ghost:** "the ghost still needs to look like a carved ghost". It is stylized
  too, but as carved wood.
- The first models of 3 October (a ghost of plain facets, and an Elof put together from balls and tubes) were not
  good enough. They proved the route from Blender to the game; their design is replaced.

### 1.2 What makes a character read as a stylized game character

From the production notes of artists who worked in this style (sources in §1.7):

1. **Big shapes first.** A few large, clean volumes carry the character. Artists stay in the blockout "for as long
   as possible", because the primary forms decide the silhouette and how light falls. Detail comes last.
2. **Exaggerated proportions.** The head is large, the hands and feet are large, the limbs are thick and taper
   clearly from one end to the other. Nothing is the size it is on a real body.
3. **Soft volumes cut by planes.** Round forms with clear, slightly chamfered edges that catch a highlight.
   Straight lines against curves. No mushy in-between surfaces.
4. **Big, medium and small.** Large calm areas, a few medium shapes, and small details only where the eye should
   go: the face, the hands, one or two things on the clothes.
5. **Simplified, enlarged details.** A few large folds instead of many small ones. Thick seams and hems, oversized
   buttons and pockets. Hair as a handful of sculpted locks, never strands.
6. **A face built for expression.** Large eyes with a big iris and one strong highlight, clear brows, a simple
   nose, a mouth that reads from far away.
7. **Colour does the work.** Materials are matt, with almost no sharp reflections. The colour texture carries
   gradients, baked shadow in the creases and lighter edges, as if painted by hand.
8. **One silhouette test.** Filled with black at 75 px tall, the character must still be recognisable.

### 1.3 What that means for each kind of character

| Who | Style | What must stay |
| --- | --- | --- |
| **Elof** | Stylized cartoon boy: about 3.5 heads tall, large head, hands and boots, thick tapering limbs | Everything in plan §2.1: the spiky golden fringe, blue eyes, freckles, the pin-striped band-collar shirt with rolled sleeves, rolled jeans, brown laced boots, the olive backpack |
| **Mamma, Pappa, Moa, Bertil** | The same style, with an adult's or an older child's proportions | Plan §2.3, and every picture listed for them in plan §2 |
| **Little Elof** | Elof's own model at a three-year-old's proportions | Plan §2.4 |
| **The ghost** | **Carved wood, stylized:** fewer and bolder knife facets with clean ridges, a fuller draped sheet with sleeve folds and two fists as on the render and the poster, glossy black eyes, chunky shoes. Its wood is painted: grain that follows the form, darker cuts, lighter ridges. | It is unmistakably a wooden carving: rigid, faceted, pale lime wood, no mouth, the dotted bag, rainbow socks, red shoes with a plain ankle disc |
| **The first trägubbe and the shelf figures** | Carved and painted like Pappa's own, as in his picture | Plan §3.2 |
| **Animals** | Simple and stylized, with the same matt, painted materials | They are real Norrland animals |

The world around them stays photoreal (plan §5.1). The contrast is deliberate: Unravel's hero is a stylized
doll in a photographed world.

### 1.4 How a person is built

No one here sculpts by hand. Two routes were looked at on 3 October, and neither reaches the sheets by itself:

- **Sculpting by script** (what Elof's third model is; it stays in the game until a generated one replaces it). Rounded forms are
  fused into one surface with a voxel remesh, cut where the eyes and ears are, smoothed and thinned out. That
  gives eye sockets with lids, cheeks, a button nose, lips, ears, fingers and hair in swept tufts. The body is
  skinned on 15 bones named after the animation library's joints. Colour is painted on the vertices, with
  shadow baked into the creases; only the shirt's stripes are a texture. About 15,400 triangles (the budget is 15,000) and three
  materials. It reads as a stylized cartoon boy, which the second model (plain balls and tubes) did not. It is
  still short of the sheets: the face is made of simple rounded forms, and the cloth has no real folds.
- **A base body that an artist made,** reshaped and dressed in Blender. The steps are below. The free version of
  the base pack turned out to hold only two muscular adult bodies; the *Teen* and *Regular* bodies this needs are
  in its paid version (20 US dollars, still CC0).

§1.6 is the route that can reach the sheets. Olov chose it on 3 October.

1. **Base.** Quaternius' *Universal Base Characters* (CC0): game-ready stylized bodies of about 13,000
   triangles, with animation-friendly topology, rigged on the same 65-joint skeleton as his *Universal Animation
   Library*. The *Teen* body is the start for the children, the *Regular* body for the parents. Both are in the
   paid *Source* version only.
2. **Proportions.** Reshape the base to the character: head, hands and feet larger; legs shorter; a child's
   narrow shoulders. Every picture listed for the character in plan §2 stands beside the model.
3. **Clothes.** Shells grown from the body's own surface, with thickness, and with the few large folds and the
   oversized details of §1.2. They follow the body's topology, so they deform with it.
4. **Hair.** A handful of sculpted locks.
5. **Face.** Large eyes as real spheres with a painted iris; brows, nose and mouth modelled; expressions as
   shape keys or sticker meshes (plan §5.6), whichever reads better at 75 px.
6. **Texture.** One 1024² colour texture per character, baked in Blender from ambient occlusion, edge
   curvature and a top-to-bottom gradient over flat colours. No normal map (plan §6.6).
7. **Rig and clips.** The base is already skinned to the library's skeleton, so the library's clips play on it.
8. **Budget.** At most 15,000 triangles and one material per character in the game (plan §5.6).

### 1.5 How the ghost is built

1. Follow the render and the poster for the forms (the draped sheet, the sleeve folds, the fists), and the two
   photos of the real carving for the facts (plan §2.2).
2. Model in planes: every surface is a knife cut. Ridges are clean and slightly chamfered.
3. Bake one 1024² colour texture: pale lime wood, grain along the form, darker inside the cuts, lighter on the
   ridges. The eyes, the bag's dots, the socks and the shoes are painted on the wood, as on the carving.
4. Five rigid parts, moved in code. It never bends (plan §5.6).

### 1.6 Image-to-3D from the sheets (Olov's decision, 3 October 2026)

Olov, after seeing the third scripted Elof: "We need to go image to 3d way!" Elof and the family are generated
from his sheets and finished in Blender. The ghost is not: carved facets are what modelling by script does well
(§1.5).

**No sheet has been uploaded yet.** The service is not chosen, because the one the plan examined fails one of
the plan's own checks.

**The checks** (plan §0 Q15), read against Meshy's terms on 3 October 2026 (terms and privacy policy both last
revised 19 September 2026):

| Check | Meshy Pro, 20 US dollars a month |
| --- | --- |
| Olov owns what it makes | Yes. "Customers on a paid Meshy plan own their Customer Output." |
| Uploads are not used for training | **No.** Terms §2.9: "Meshy may use Customer Inputs and Customer Outputs [...] from non-Enterprise Customers to train, validate, test, or improve Services unless otherwise agreed to in the Order." No way to switch it off was found below the Enterprise plan. |
| Nothing lands in a public gallery | Yes. A paid plan has "the option to keep their User Content private". |
| Uploads are deleted after download | Through the API, yes: output is deleted three days after it is made, and a task can be deleted at once, "including all associated models and data". Deleting does not take back the right to train. |

**The ways forward.** Olov chooses, and the parents are asked first about anything they have not agreed to
(their yes was to a paid Meshy plan, plan §2.6):

1. **A service that does not train on paid users' uploads.** Tripo says so about its paid plans, by its help
   pages as a search engine summarised them; the session could not open the pages themselves, so this must be
   read on the site before anything is uploaded. It is a different company from the one the parents agreed to.
2. **Meshy Pro all the same,** if Olov and the parents accept that the uploaded pictures and the models may be
   used for training. The pictures are the AI-drawn sheets, not photos, and carry no names.
3. **A model that runs on Olov's own computer,** so that nothing is uploaded at all. Olov asked for an open
   one on 3 October, and it is the one to try first.
   - **TRELLIS** (Microsoft). Its code and models are under the MIT licence; two parts it builds on,
     diffoctreerast and FlexiCubes, carry licences of their own, which are read before a generated file is
     used. It takes one picture, or several views of the same thing, and gives a textured GLB.
   - Microsoft asks for 16 GB of graphics memory. The fork *trellis-stable-projectorz* (MIT) runs it in half
     precision on 8 GB, which is what Olov's RTX 3070 laptop card has. It has a Windows installer (a 327 MB
     download, which then fetches Python 3.11, PyTorch and the models), a local web page and a local API.
   - **Where it runs: Olov's other computer, which has an RTX 5080** (16 GB; he said so on 3 October).
   - **What to run there, in this order:**
     1. **TRELLIS.2** (Microsoft). MIT licence, open to download, 16 GB of model files. Finer than the first
        TRELLIS, with PBR textures, but one picture only. Microsoft asks for 24 GB of graphics memory and
        Linux. ComfyUI runs it on Windows in its own core, with its own replacement for the two parts whose
        licences forbid commercial use. Not checked: that it fits in 16 GB.
     2. **TRELLIS,** the first one, through the fork's Windows installer (CUDA 12.8 and PyTorch 2.7, which the
        50-series cards need). MIT, open to download, 3 GB of model files. 16 GB is what Microsoft asks for,
        and it takes several views.
   - **Pixal3D** (Tsinghua University and Tencent ARC Lab, SIGGRAPH 2026) **may be used, and is tried first if
     Olov says so.** (The session first put it at the top of the list, then held it back over an EU marker.
     The licence files, read on 3 October, settle it.)
     - **Licence:** the plain MIT licence, for the code and for the weights; its NOTICE says so in as many
       words. It was first released on 12 May 2026 under Tencent's own terms (academic use only, and "not
       intended for use within the European Union") and changed to MIT on 20 May 2026. The EU marker on its
       model card, and what a community integration says about it, are left over from those eight days.
     - **The parts it builds on,** by its NOTICE: DINOv2 (Apache-2.0); TRELLIS.2, Direct3D-S2 and MoGe (MIT).
       If the version that is installed uses DINOv3 instead, Meta's licence for that is read first.
     - **Its NOTICE also asks for responsible use.** Users answer for consent, and Tencent does "not support"
       using the model for, among other things, "content involving minors". The NOTICE says this "does not
       modify the license terms". Elof's model is a cartoon likeness of a child, made with his parents' yes;
       Olov has been told of the sentence.
     - **What speaks for it:** it is built on TRELLIS.2, follows the picture more closely by ComfyUI's
       account, takes several views since September 2026, and ComfyUI runs it in its core.
     - **It does not fit the laptop:** community figures give about 10 GB of graphics memory for a preview
       and 14 to 17 GB for a good model, and about 50 GB of disk.
   - **The laptop with the RTX 3070** could run the fork in 8 GB, but drive C: has 11 GB free of 953 and the
     install needs roughly 30 GB (an estimate).
   - **Getting the pictures there:** the three views, or the whole `photos/` folder, go from one computer to
     the other on a USB stick or over the home network. Never through git, and never through a service the
     parents have not agreed to. The finished GLB comes back the same way, into
     `art/private/elof/image-to-3d/`.
   - **Looked at and left out:** Hunyuan3D (its licence does not apply in the EU, and `CLAUDE.md` forbids it);
     Step1X-3D (Apache-2.0, but 24 GB or more); SAM 3D (32 GB recommended, and made for photos of real
     things); TripoSR (MIT, 6 GB, rough); Stable Fast 3D (Stability's community licence, 7 GB, soft).
   - **Not checked:** that it runs on this card, and how good the result is. It is likely to be rougher than
     the paid services', and it has no A-pose setting, so the model stands as the picture does.

**The pictures that go in.** `art/private/elof/image-to-3d/` holds Elof's front, side and back views, cut from
his sheet. On the sheet each view is only about 150 by 450 pixels, so they are enlarged three times and soft.
(The first cuts, made earlier the same day, were wrong and showed only his middle; they are replaced.) A
better result needs better pictures: each view alone, full height, 1024 by 1536, on a plain background and
standing with the arms a little out from the body, drawn again with the tool that made the sheet.

**Settings, whichever service:** all the views of one character in one job; an A-pose asked for where the
service offers it (Meshy's `pose_mode: "a-pose"`); a remeshed quad mesh of about 30,000 faces, which Blender
brings down to the 15,000 triangles of plan §5.6; a 2K colour texture, no PBR maps; GLB. Never a free tier.

**Then, in Blender:** clean the mesh, bring it down to 15,000 triangles, fit it to the skeleton Elof's third
model already has (15 bones named after the animation library's joints, which `src/render/view.ts` poses),
give the face eyes that can move and blink, and bake one 1024² texture. Every generated file gets a
`LICENSES.md` entry as *owned by Olov*, and stays in the private repository with the family's other files.

### 1.7 Sources

- Florian Neumann, *Tutorial: Stylized Game Character* (ArtStation): 44 videos, about 14.5 hours, from blockout
  through high poly, low poly, UVs, baking and texturing to posing and rendering, with Maya, ZBrush, Marmoset
  Toolbag and Substance Painter. Olov's reference for the workflow.
  <https://www.artstation.com/florianneumann/blog/N2qB/tutorial-stylized-game-character>
- *Stylized Character Production: Tips and Tricks* (80 Level): staying in the blockout, lining clothes up with
  the body's topology, colour from ambient occlusion and gradients, matt materials.
  <https://80.lv/articles/stylized-character-production-tips-and-tricks>
- Matt Berenty's board of stylized characters (Pinterest). Olov's reference for the look.
  <https://se.pinterest.com/mattberenty/stylized-characters/>
- Pixal3D, and ComfyUI's page on running it and TRELLIS.2. <https://github.com/TencentARC/Pixal3D>,
  <https://comfy.org/pixal3d-trellis2/>
- TRELLIS, the fork with the Windows installer, and TRELLIS.2. <https://github.com/microsoft/TRELLIS>,
  <https://github.com/IgorAherne/trellis-stable-projectorz>, <https://github.com/microsoft/TRELLIS.2>
- Meshy: terms of use, privacy policy, and the API page for several pictures to one model.
  <https://www.meshy.ai/terms-of-use>, <https://www.meshy.ai/privacy-policy>,
  <https://docs.meshy.ai/en/api/multi-image-to-3d>
- Quaternius, *Universal Base Characters* and *Universal Animation Library* (CC0).
  <https://quaternius.com/packs/universalbasecharacters.html>,
  <https://quaternius.com/packs/universalanimationlibrary.html>
- Blender Studio, *Human Base Meshes* (CC0): stylized bodies and a planar head, as a second base to try.
  <https://www.blender.org/download/demo-files/>

The ArtStation page and the Pinterest board could not be read by the session that wrote this (one refused the
request, the other came back empty), so what is said about them here comes from descriptions of them elsewhere.
Olov has seen both, and his eye decides at H1b.

## 2. The look of a place

A chapter names its place (`place` in its data), and the game dresses the chapter's ground in that place's
look: `src/render/dressing/`, a module for each place and each shared system. The rules of the chapter don't
change. A chapter without a place is greybox.

### 2.1 Scale

One unit is one Elof length (EL). In the macro chapters 1 EL is about 15 cm, so things are built at their real
size divided by 15 cm (plan §5.2):

| Thing | Real size | In the game |
| --- | --- | --- |
| Lingonberry | 8 mm | 0.05 EL |
| Lingonberry leaf | 1.5 cm | 0.09 EL |
| Spruce needle | 2–4 cm | 0.16–0.3 EL |
| Spruce cone | 7 cm | 0.5 EL |
| Moss cushion | 4–16 cm | 0.3–1.1 EL |
| Blade of grass | 25–40 cm | 0.7–2.3 EL |
| Spruce trunk | 40 cm across | 2–2.9 EL across |
| Deck step | 18 cm | 1.2 EL |

Keeping these is what makes the world read as seen from close. Where play needs something else, note it here.
So far:
- The moss cushions are kept low where Elof walks, so that his boots show.
- **The cones of the story are bigger than a cone is.** The ones that lie on the floor are 0.5 EL. The one
  he pushes is 1.5 EL and the ones that roll are 1.7 EL, three times a real cone, and the one he climbs
  over is 4 EL, "as big as a car": each is a thing in the game, and has to be seen and stood on. All are one
  cone from the forest kit, four times as long as it is thick, with its scales in spirals.

**At home Elof is a boy.** In the prologue, from the golden candy in the final, and in the epilogue he is
drawn three times his usual size (`size` in the chapter), beside a ghost that stays the size it is. The plan's
real ratio is about eight; three is what fits in the picture with the ghost still readable. When the star
shrinks him the picture closes in at the same time, so the world grows around him.

### 2.2 How a frame is built

The layers of plan §5.3, as they are built now. Everything is made in code, so a place costs no download.

The forest's layers, and after them the garden's:

| Layer | What it is in the forest | How it is made |
| --- | --- | --- |
| L0 Backdrop | Dark green above, a pale gold glow where the sun stands, moss green below | One small gradient picture behind everything |
| L1 Far scenery | Four depths of forest far out of focus: trunks as soft columns, thinner and paler the further in, young spruces at their feet, boughs that hang in from above, and round spots of light | Four pictures drawn on small canvases, blurred and stretched large, 32 to 78 EL behind the path. Each passes at its own speed: see *The far layers* below. |
| L2 Mid-ground | Spruce trunks 4 to 22 EL behind the path, soft low shrubs, stones | Trunks as one turned shape with roots, bark drawn in code, moss painted on its foot; shrubs as soft cards; the haze takes them with distance |
| L3 Play plane | The moss bank, cushions, grass, lingonberry sprigs, cones, needles | The ground is a floor that slopes on towards the camera in front of the path, with things lying on it, none higher than the path they lie under. At a wall's top it draws back to the path; where it is cut (a wall, the face under its lip) moss hangs over the edge, then humus, then rock. A pool has a near shore. Each kind of thing is one instanced mesh per 18 EL of chapter, drawn only while it is in the picture. |
| L4 Foreground | A fern, a lingonberry sprig, grass and a fallen spruce twig, out of focus along the bottom of the picture: dark, with a warm rim on the sun's side | Soft cards 2.6 to 5.6 EL in front of the path, which pass faster than the path does. Each is drawn with real outlines and then made soft; all of a chapter's are one draw call. **None rises over the line he walks on**, from wherever he stands: see the rules below |
| Effects | Shafts of light, the light each leaves on the moss where it lands, and dust in them; a needle or a leaf falling now and then; a dark at the foot of each trunk and stone | Additive cards and 70 small motes that stay with the camera, as one draw call; what falls is another; the dark at a foot is a card among the shrubs' |
| Post | The place's grade, a vignette and grain | The one grading pass of Mid and High (`src/render/grade.ts`) |

| Layer | What it is in the garden | How it is made |
| --- | --- | --- |
| L0 Backdrop | Morning blue above, pale at the horizon, a warm glow to the left | The same gradient picture, in the garden's colours |
| L1 Far scenery | White clouds that drift; blue hills of forest, one a long back with a knob; the valley's far side, with fields in strips, the river at their foot, the neighbours' roofs and a spruce forest on its crest; birches in their first yellow over a low hedge; the garden's own leaves far out of focus | Five pictures, made as the forest's |
| L2 Mid-ground | **The house's red wall** with its cover strips, a white corner board and white-framed windows; a birch now and then | The wall is a small drawn picture, repeated, 21 EL behind the path; a chapter says where the house stands (`house`) |
| L3 Play plane | **The deck:** boards 0.8 EL wide with dark gaps, each its own tone. What is built (a wooden floor: the deck, a room at home, the shop; and the village's street) is level where he walks, and in front of the path it is one flat plane that tilts away towards the camera (0.3 down for each length forward), a little darker the nearer it comes, and ends under the picture's lower edge. It never runs on level under the camera: where he stands at the foot of a step the camera is ahead of him, over the upper floor, and would be inside it. It never rolls away in a curve as moss does: boards on a curve are a barrel. At the top of a step of 0.6 EL or more it draws back to the path, so that he is in sight at the step's foot. Only the bog's walk of planks has a front edge: board ends, a rim board along the path, and the peat under it. **The lawn:** a jungle of grass behind the path, stubble where he walks, and in front of the path the lawn slopes on towards the camera as the forest's floor does, with grass growing down it, never higher than the path it stands under, dew, dandelions as tall as he is, clover, the birch's yellow leaves. Dry earth under the deck, a grey boulder, Pappa's pale shavings, the dark hedge. | A chapter marks what a stretch of ground is made of (`surfaces`); each kind has its tones and its edge. Nothing grows on what is built. |
| L3, overhead | **The lower deck above him:** boards and joists, with the sun falling through between the boards as stripes on the earth | A chapter says where (`roofs`) |
| L4 Foreground | Soft grass along the bottom, brighter than the forest's: broad blades, clover, a dandelion's leaves | The same cards, drawn brighter |
| Effects | Dew that flashes near the ground, only where something grows; a bumblebee that works the dandelions nearest him, and two brimstone butterflies far behind | The motes, kept low and made to twinkle; the bee and the butterflies are a few small cards behind the path |

The bog, the mountain and the summit at dusk use the same layers with their own things: sphagnum cushions,
sedge, dwarf birch, cloudberry leaves and cranberries; reindeer lichen, crowberry, dry grass and bare
boulders. Two things are different in the open:
- **The far scenery is the horizon.** Over the bog: long level clouds, the mountain in mist (a long back
  that rises to a knob), low hills of forest, a pine wood as a low band across the mire, and nearest one
  group of spruces, dark against the mist, with small crooked bog pines and silver dead ones. The middle of
  the nearest picture is open mire. From the mountain: the land lies under him. At its foot the nearer
  ridges stand high; as he climbs they sink, until thin ridges lie one behind the other close over the
  horizon, each paler, under a sky that fills half the picture, with one long back and its knob over them
  and the tops of the nearest spruces at the granite's edge. Under the crests the valley is painted, for
  the flight: a lake the colour of the sky, a mire, a river's thread, clear-cuts, and the slope falling
  away with its spruces. At dusk the same ridges are dark blue, and a few windows are lit far below.
- **The sun is a veiled disc** in its glow over the bog and from the mountain, kept round whatever shape
  the picture has; from the mountain the hour moves on after the flight, towards rose and a dimmer sky.
  Elsewhere the sun stands too high to be seen, and there is no moon.
- **The bog's ground is islands.** It goes down into the water behind the path, and the water lies as far
  back as the eye reaches. The soft tussocks are mounds of paler moss.

**Haze and sky** use one colour order on every tier: linear light, haze, the place's grade, then Neutral
and sRGB. Low grades inside each material; Mid and High grade the complete HDR picture. The sky is a
camera-locked triangle in the scene, outside the fog, so it receives that same grade on Low too. Nightfall
changes its brightness and the live haze colour together. This does not make whole frames identical:
High still has its depth blur, glow and shadows, and transparent layers blend in the tier's output space.

**Rim light** follows the sun around grazing edges of opaque figures, candy, grass and stone. It is
bounded by their pigment, so black eyes remain black. Native view-space normals and the actual camera
keep its direction through story shots, wind, instancing and skinning. It fades with evening and goes
out with nightfall, using shared uniforms and the existing warmup for models that arrive later. Water,
glow and transparent helper figures keep their own shading; the rim adds no draw or render target.

**Deck edges** keep a thin board end over a slightly recessed fascia, whose grain runs along the edge.
The trim follows the floor's pulled-back profile beside steps, where the leading camera sees it; it
never extends beyond the existing front or above the walking plane. The narrow bog boardwalk keeps its
own rim and peat underneath.

**Village edges** use laid granite on raised paving: one course at the kerb, two staggered courses at
the shop's physical riser, with recessed mortar and small chamfers. These join the existing house mesh
and stay below the authored walking height. The street's upper surface remains planar where it draws
back beside a step. Its separate forward stone cut has level granite courses with staggered joints,
painted on the existing surface using its own grain. This leaves the walking top unchanged and follows
the world when the camera turns. A physical riser is not seen through that cut from the upper side.

**Road cuts** show a thin wearing course, crushed stone beneath it, then earth fading into depth.
These bands live only on exposed asphalt/paving faces, measured below the local tilted top. They reuse
the existing grain, light and mesh; the walking surface and the drain's dark rear remain unchanged.

**Forest landmarks** supply their own raised shape. The bank, its plants and effects use the ground
under the cone, anthill, log and stone, while the game keeps the same playable top. The doorway remains
on the anthill and the spruce roots reach into it. If a kit shape is missing, its socket keeps a solid
stand-in support; loading or retrying replaces that support rather than stacking a second model.

**Forest shadows** follow the existing spruces and the place's sun. On High, only the marked trunks join
the characters in the existing 1024-pixel shadow map: their shade crosses the moss, the cut bank and the
figures. The light reaches far enough behind the path to include a tree outside the camera whose shadow
falls into view. Low and Mid use a softer shade sampled once into the bank's vertex colours from those
same trunk transforms, including slopes and the door's spruce. Extra rows on the moss keep the bands
smooth; the garden keeps its own mesh. Switching to High restores the original colours before the live
map is used, so the two kinds of shade never stack. Roofs, boulders and canopy shadows are still separate
work; this pass uses the trees already in the game and no new assets.

**Water** (`src/render/water.ts`) is one mesh in a chapter and one shader on every tier:
- **It mirrors its place.** The backdrop's sky, and the far layers' pictures standing on their heads, hinged
  where the nearest of them meets the water; a street puddle mirrors the house fronts behind it instead. The
  mirror is one small picture built at load. Its own colour is the place's, dimmed: the sky in the water is
  always darker than the sky.
- **It has no edge behind the path.** It thins out into the haze, or ends at a shore. The bog's lies in front
  of its tussocks and behind the whole chapter; the forest's pool fades into the forest; the village's puddle
  is a hand deep, with asphalt under it and a wet far shore.
- **In front it is cut,** as the ground is: the cut face is the water's own body, darker with depth, with a
  pale line at the surface and no caustic lines on it. Those lie on what is under water, on Mid and High.
- **Its ripples are small and die out with distance,** and all but stand with reduced motion. Mid adds the
  low sun's glitter under the sky's glow; High also shows what lies just under the surface.

**The far layers** (`src/render/backdrop.ts`). This is the parallax:
- A place outdoors has four or five, one behind the other, 32 to 90 EL behind the path. Each is one card that
  goes with the camera, and its picture slides across it by its own part of the camera's way (`hold`). The
  nearest holds 1 and stands still in the world; the next ones hold about 0.65, 0.4 and 0.2; the sky holds
  0.08, and its clouds drift by themselves. Seen from the path, the nearest passes at about a quarter of the
  path's speed and the farthest hills at about a fortieth.
- Every layer stays at the height of his eyes however high he climbs, and sinks by a part of the climb
  (`sink`), the nearer the more: nearer hills go down under farther ones. On the mountain the nearest slope
  sinks by a third of the climb and 9 EL at most, the farthest ridges by a twentieth. A chapter that begins
  on a height says how high (`outlook`): the finale stands on Berget's summit from its first step.
- A tree far away is one of four: a Norrland spruce, a narrow spire in tiers that droop, with a bough
  missing here and there; a pine with a bent stem, warm near the top, and a few flat plates for a crown; a
  dead pine, silver, with crooked hanging limbs; a birch, white with dark marks, in yellow. A forested
  ridge has spruce tops for a skyline, and a hill is a long back drawn by hand, not a wave.
- A picture is 512 by 256 pixels. Its shapes are drawn whole, in colours already mixed with the place's haze,
  and then blurred by halving the picture and doubling it again; a band of mist lies at its foot. Its top row
  is clear and its bottom row is its foot, and the card repeats both, so no layer has an edge.
- A house far away is a pale wall under a grey roof: nothing to read on it, and not red.
- At home the morning windows show the garden's far scenery as one still picture.
- A new place gets its layers in `LAYERS` there.

Rules that hold for every place:
- **The play plane is sharp and level.** Nothing of the dressing stands where he walks, and within 0.3 EL of the
  path the ground has no bumps.
- **The sun stands behind the scene,** low and warm, so that everything on the play plane has a bright rim. A
  faint cool light from the camera's side lifts the faces.
- **The shade is cool.** What the sun doesn't reach goes towards blue-green, not towards black.
- **The haze begins behind the play plane** and takes the mid-ground with distance. The far plates have their
  haze painted in.
- **No hard edge on anything out of focus.** Far plates, shrubs, foreground and beams fade at every side.
- **Nothing in front covers what he needs.** The top of a foreground card stays under the line he walks on,
  as the lens sees it from wherever he stands, on every screen (`ceilingAt` in
  `src/render/dressing/foreground.ts`, held by `tests/unit/soft-cards.test.ts`). So beside a step or a gap
  the cards are lower, and none stands tall. The bog has sedge and cotton grass there, and thin tips out of
  its water; the village has what grows in a kerb's joint: plantain, grass, a dandelion gone to seed. Bare
  rock and a floor indoors have nothing.
- **What grows moves, and little else does.** Grass, sedge and straw sway where they stand, a dandelion nods,
  and every six or seven seconds a breath of wind passes along the path (`src/render/wind.ts`). On the
  mountain the wind is the gusts': the grass and the lichen lean while one blows. What flies is a few pixels,
  slow, dull in colour and behind the path: midges over the bog's water, seed fluff low over the rock.
  With reduced motion asked for, all of it stands still and nothing flies.
- **Red is the candy's, the hook's and the lingonberries'.** Nothing else in a place is red, except what is
  red by nature and small: the ladybird, a crane's crown, the heart on Mamma's mug.
- **Nothing is compiled during play.** The first frames draw the whole chapter (gate 6).

### 2.3 One palette per place

From plan §5.4, and one more for the extra chapter. All are built, each as far as its row says.

| Place | Light | Ground | Accents | Built |
| --- | --- | --- | --- | --- |
| Gården, 10:00 | Low warm sun, dew sparkle, a blue morning sky | Lawn in four greens (`#3f6a22`, `#5c962b`, `#7fb238`, `#aecb52`), deck wood `#b49a78`, shavings `#e3cb9b` | The house in Falu red `#8f2d22` with white trim; dandelion yellow | **yes** |
| Granskogen, noon | Shafts of pale gold through cool blue-green shade | Moss in three greens and a gold (`#35521f`, `#587a27`, `#7f9a30`, `#b3ae45`), rust-brown needles | Red lingonberries; bark `#7d6753` | **yes** |
| Myren, late afternoon | Low gold sun, mist sheets over the water | Sphagnum in rust-red, green and gold (`#6e3226`, `#8f4d2b`, `#7d8a36`, `#bca94c`), straw sedge, dark peat water `#34423f` | Red dwarf birch, orange cloudberry leaves, cranberries, grey dead pines; the forest and the mountain in mist at the horizon | **yes**; Mamma's lamp not |
| Berget, golden hour | Pink-orange sky over blue-violet ridges, haze in the valley | Grey granite (`#8f939d` to `#d6d5d6`) with its own grain: pale and grey grains, dark mica, hairline cracks, rings of crust lichen. Cut hard, never rounded: a pale edge where he walks, then down in two ledges, in blocks with joints between them; walls in courses. Its shade is blue-violet (`#46527e`), and only the sun is warm. White reindeer lichen | Crowberry, dry grass, bare boulders; the old pine on the summit, and small crooked pines on the rim | **yes** |
| Final, blue hour to night | The first stars; then night and the green northern lights | The same granite and lichen, in blue | The candy and the ghost stay in their own colours | **yes**; the headlamps and the violet not |
| Byn (the extra chapter), a Saturday morning in October | A clear cool sky, a low sun along the street | Dark asphalt (`#4c4f56` to `#70727a`), pale paving slabs, the drain's iron; wooden boards inside the shop | Wooden houses in the village's own colours (ochre yellow, white, pale plaster, and one in Falu red on the far side of the crossing, in shade) with white trim, striped awnings, warm shop windows; a yard with a weathered grey fence, a hedge and a birch, and the far village over it: weathered tin roofs, birches, spruces, blue hills; a dark green lamp post; yellow birch leaves; a blue bicycle; on the shop's step a matchbox of plain blue paper. Red is the candy's and the hook's here too: the fence, the car and the far roofs are not red. **No shop is a real one: its wares in its window and a carved sign, no letters, no number.** | **a street of houses and a shop**: each house is put together from a kit of parts modelled in Blender (`art/blender/village.py`: a stone foot with a drip board, boards with cover strips, casings, a door behind its step, a downpipe, a shop window with its wares) where the chapter says it stands (`street`): a near wall 7 EL behind the path, or 20 EL off across the crossing. The walls are lit, and the shop windows give off light. The bakery has two striped awnings, built in code (`AWNING` in `src/render/village.ts`): green and pale cloth, a scalloped edge whose tips the drops hang from and fall, the wall cool in their shade, and a crank's rod left hanging. The matchbox on the shop's step is built in code too (`MATCHBOX` in `src/render/matchbox.ts`): it stands on its end, a drawn flame on its label, its tray pushed up with five match heads in it. The puddle lies in front of the yard and shows it upside down, as the street paints it (`paintStreetMirror` in `src/render/village.ts`), with birch leaves afloat on it (`src/render/afloat.ts`) and the road wet round it. Anonymous passing shoes/calves and an unmarked slow car go behind the houses and are seen on the crossing; an open doorway leads to a warm striped room with giant jars of sweets and a paper bag. Plain code stand-ins, with no collisions; detailed people/vehicle models still need Blender. |
| At home: the kitchen at 09:00, the veranda at 21:00 | Warm, low sun; in the evening dim and candle-warm, with the northern lights in the windows | Floor boards, a pale panelled wall close behind | White window frames; **Pappa's shelf of figures, with the first place in the row empty in the prologue and filled in the epilogue**; the Saturday bag; shavings | **a first room**: no table, candles or bowls, and no people |

### 2.4 The golden frames

Each holds Elof, a red hook ring and candy, and is drawn by the game itself.

1. **The moss under the spruces: built.** `?course=look-forest` (add `&debug` to start at once, and
   `&tier=high`). It is 48 EL of forest floor with a root, a hollow with a hook over it and a big candy.
   Kapitel 2 is dressed in the same look from end to end: `?dev&course=granskog`.
2. **The deck edge: built.** `?course=look-deck`. The deck with a step, the red wall and a window behind it,
   the hose down, the earth under the lower deck with a hook in the stripes of sun, and the lawn beyond.
   Kapitel 1 is dressed in the same look: `?dev`.
3. **The village street: built.** `?course=look-street`. It is 61 EL: the pavement under the yarn shop's
   window, the kerb, one bar of the drain, the crossing with a yard and the sky on its far side, and the
   bakery's wall close behind him: the bicycle with the hook on its pedal over the cellar window's well, the
   window where the drops fall, and the door behind its granite step. The extra chapter is dressed in the
   same look: `?dev&course=byn`.

### 2.5 The H1a board: what Olov judges

Look at the two golden frames on each device you test on, and at Kapitel 1 and 2 for a few minutes. For each of the five,
say yes or no (plan §5.6):

1. **The macro scale reads.** Does Elof look small in a big forest, or normal-sized among odd shapes?
2. **Layered focus.** Is the path sharp, and what is behind and in front of it soft?
3. **Warm, low light.**
4. **Elof and the candy are readable** at phone size, also with the colours taken away.
5. **It runs smoothly:** `?bench` on the device.

Two no's on the look itself mean the fallback below.

### 2.6 The fallback look

If H1a fails twice: more painted 2D plates and fewer 3D layers, flatter lighting, the same characters (plan
§5.6). In terms of §2.2: the mid-ground becomes plates too, the play plane keeps the bank and loses most of its
scatter, and the grade does more of the work.

### 2.7 Stand-ins for things and animals

Until the animals and the family are designed in Blender (plan §5.6), a chapter says what a thing is (`look`
on a thing on a rail, a thing to use, a ride), and `src/render/props.ts` builds a stand-in for it in code.
Each should be recognisable at phone size, and none is final.

- **Things on rails:** a plank, a block, a curl of shaving, a twig, the big spruce cone, a leaf, a dead pine
  as a log, the first trägubbe.
- **Things to use:** the ladybird on its back, kicking, which turns over and flies off; a lingonberry and a
  crowberry to pick; the jay, which hops when it gets its berry; the ants; Pappa's seesaw; the lollipop; the
  kneeling crane; the ringing cobbles; the bag; the golden geléhallon.
- **What carries him:** Bertil's cap as a boat, the crane with beating wings, the ants. Moa's paper plane was
  there before.
- **A person is a sign on a stick,** in a colour of their own: Moa's denim blue, Pappa's green, Bertil's
  orange, Mamma's white with a heart. No likeness: the family's hands and figures are theirs to approve.
- **In the forest the kit modelled in Blender takes their place** once it has loaded
  (`art/blender/forest-kit.py`, `art/baked/boot/forest-kit.glb`; `src/render/forest-kit.ts` lists its
  shapes): the cones, the twig, the leaf, the seesaw, the vittra door under its spruce, Bertil's cap (a
  red-and-white trucker cap with a plain round badge), the lichen and the roots he climbs, the floor's
  cushions, stones, young spruces, ferns and mushrooms, and the chapter's landmarks (`landmarks` in its
  data): the giant cone, the anthill, the fallen log and the stone at the eddy.

### 2.8 What the look still lacks

- Plates rendered in Blender after the landscape references, and scanned CC0 materials from Poly Haven for
  moss, bark and wood. What is there now is drawn in code and reads as stylized, not as photographed.
- On High: bloom on sparkles, and the half-resolution blur by depth. On Low: the grade inside the materials.
- The things on rails and the helpers in the place's style: they are still greybox boxes. The water mirrors
  the sky and the far scenery, and not yet what stands in it: a tussock, a trunk, him.
- In the bog: pines with crowns on the play plane (a bare trunk reads as a pole; the far scenery has them,
  and the mountain has its own from `art/blender/mountain-kit.py`), and Mamma's lamp. In the final: the
  headlamps.
- In the garden: long shadows, the hose and the lost things under the deck, the birch's crown, the workshop.
- What the windows show at home does not move. The finale's sky, distant layers and haze now share the
  same nightfall; its stars are separate round points, unaffected by the sky gradient's aspect ratio.

### 2.9 Candy

The candy is the game's trail, its checkpoints and its treasure, so it is drawn to be seen first and read at
once (plan §4.3; H1a asks whether Elof and the candy are readable at phone size). It looks like the candy on
Olov's poster: glossy karameller in twisted wrappers, striped ones, swirls, a heart and a lollipop.

**It is modelled in Blender,** by two generators that build everything from numbers, with nothing from
anyone else:

- `art/blender/candy.py` builds the kit, `art/baked/boot/candy.glb`: 25 sweets in one file, without a texture.
  - *The trail:* `karamell`, `randig` (striped), `polka` (a swirl in a wrapper), `hjarta` and `klubba` (a small
    swirl lollipop). Thirteen in a row and then again, mostly karameller, each in the poster's six colours.
  - *The sixteen hidden kinds,* each shaped as what it is, in the two colours its sticker has
    (`src/content/kinds.ts`; a test holds the generator to them): a geléhallon of round beads, a sitting
    gummy bear, a foam banana and a foam mushroom, a two-layer sockerbit, a ringed worm, a layered chokladkola,
    a cola bottle, a gold coin, a fried egg, a dummy, a striped lakritskonfekt, a polkagris, a wrapped
    gräddkola, a salmiak lozenge and a praline in its paper cup.
  - *The magic candy:* `guldhallon`, `lysklubba` (a golden swirl) and `stjarna` (the shrinking star).
  - `burk`, a wrapped sweet of 60 triangles, for the hundreds in the shop's jars.
  - *Elof's Saturday bag,* `lordagspase`: striped paper, pinked at its top and open, with five sweets looking
    out; and `reva`, the jagged tear the story shows at its hinge. Paper is dull and gives off less of its
    colour than sugar does (`paperMaterial`).
- `art/blender/big-candy.py` builds the checkpoint, `art/baked/boot/big-candy.glb`: a thick round swirl
  lollipop with a yellow bow, and the one painted texture (256², with the stick's and the bow's colours in
  its corners, so the whole model is one material).

**How a sweet gets its colours** (`src/render/candy.ts`):

- Its colours are painted on its corners, with the shade of its own creases baked into them in Blender
  (Cycles, ambient occlusion per point). Stripes follow the faces, so they stay crisp at any size.
- The first UV coordinate says how much of the game's colour a corner takes. A karamell's sweet takes all of
  it, its paper most of it, a white stripe none: one mesh draws a red, a yellow and a green karamell.
- **A sweet gives off a little of its own colour** (`CANDY_LIFT`), and its rim catches the sky. So it keeps
  its colours in the forest's shade, against the bog's low sun and at night, where everything else takes the
  place's light. Magic candy gives off most of its colours: it glows, and High's bloom spreads it.
- Until the kit has arrived, and wherever it is missing, each place draws the stand-in it builds in code.

**The stickers are pictures of the same models.** `art/blender/candy-stickers.py` renders the sixteen kinds
into one sheet, `src/ui/kinds.webp` (six across, three down, 96 pixels each, 24 KB), and the album, the bag
in the corner, the end card and Moa's map cut their stickers from it (`src/ui/sticker.ts`), with a pale
edge like a sticker's. One not found yet is still an empty ring. The end card's rows of ten are small wrapped
sweets, cut from plain colour.

**Rules:**

- **Red is the candy's** (§2.2). The big candy is red and white in every place.
- **No mark on anything** (plan §0): the coin's face is a plain raised round. The foam mushroom's cap has no
  dots: it is a sweet, and never looks like a fly agaric (plan §3.3).
- **A sweet keeps its best side to him.** Trail sweets sway instead of turning right round, so a wrapped one
  always has its bow-tie outline and a flat one shows its swirl; one in a wrapper rolls round its own length.
  A hidden sweet sways inside its golden ring. The big candy's swirl turns like a pinwheel, faster once reached.
- **Budgets.** The trail is at most five draw calls (one for each kind of sweet), about 450 triangles a
  sweet; a hidden sweet is one draw call and at most 1,300 triangles; the kit is 160 KB packed.

**To rebuild or change it,** on Olov's computer with Blender open and its MCP server started:

    node scripts/bake/send-to-blender.mjs art/blender/candy.py
    node scripts/bake/send-to-blender.mjs scripts/bake/export.py "OUT = r'<the repository>/art/baked/boot/candy.glb'"

and the same for `big-candy.py` and `big-candy.glb`. `send-to-blender.mjs` starts the server as `.mcp.json`
declares it, with safe mode on.
After a change to a hidden kind, send `candy.py` and then `candy-stickers.py` with `OUT` set to
`src/ui/kinds.webp`, so that its sticker follows. `art/blender/candy-sheet.py` renders the whole kit as one
picture for looking at. The server's safe mode
allows no classes and no functions passed as values, which is why the generators give shapes as tables.

**What Olov judges:** is each hidden kind recognisable as its sort, in the world and as a sticker; are the
trail's sweets bright enough and big enough on a phone; is the big candy's bow wanted; is the bag his bag. `docs/shots/_work/candy/` has the sheet and pictures
from the game.
