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
look: `src/render/dressing.ts`. The rules of the chapter don't change. A chapter without a place is greybox.

### 2.1 Scale

One unit is one Elof length (EL). In the macro chapters 1 EL is about 15 cm, so things are built at their real
size divided by 15 cm (plan §5.2):

| Thing | Real size | In the game |
| --- | --- | --- |
| Lingonberry | 8 mm | 0.05 EL |
| Lingonberry leaf | 1.5 cm | 0.09 EL |
| Spruce needle | 2–4 cm | 0.16–0.3 EL |
| Spruce cone | 7 cm | 0.5 EL |
| Moss cushion | 2–10 cm | 0.06–0.36 EL |
| Blade of grass | 25–40 cm | 0.7–2.3 EL |
| Spruce trunk | 40 cm across | 2–2.9 EL across |
| Deck step | 18 cm | 1.2 EL |

Keeping these is what makes the world read as seen from close. Where play needs something else, note it here.
So far: the moss cushions are kept low where Elof walks, so that his boots show.

### 2.2 How a frame is built

The layers of plan §5.3, as they are built now. Everything is made in code, so a place costs no download.

The forest's layers, and after them the garden's:

| Layer | What it is in the forest | How it is made |
| --- | --- | --- |
| L0 Backdrop | Dark green above, a pale gold glow where the sun stands, moss green below | One small gradient picture behind everything |
| L1 Far plates | Trunks far out of focus, as soft columns, with round spots of light | Two pictures drawn on small canvases and stretched large, at 30 and 62 EL behind the path. Drawn small, they are soft: that is the blur. |
| L2 Mid-ground | Spruce trunks 4 to 22 EL behind the path, soft low shrubs, stones | Trunks as one turned shape with roots, bark drawn in code, moss painted on its foot; shrubs as soft cards; the haze takes them with distance |
| L3 Play plane | The moss bank, cushions, grass, lingonberry sprigs, cones, needles | The ground is a bank that rounds off towards the camera, not a cut face. Each kind of thing is one instanced mesh per 18 EL of chapter, drawn only while it is in the picture. |
| L4 Foreground | Tufts of grass far out of focus along the bottom, now and then one that stands tall | Soft dark cards 4 to 7.5 EL in front of the path, which pass faster than the path does |
| Effects | Shafts of light, and dust in them | Additive cards; 70 small motes that stay with the camera |
| Post | The place's grade, a vignette and grain | The one grading pass of Mid and High (`src/render/grade.ts`) |

| Layer | What it is in the garden | How it is made |
| --- | --- | --- |
| L0 Backdrop | Morning blue above, pale at the horizon, a warm glow to the left | The same gradient picture, in the garden's colours |
| L1 Far plates | Leaves in the sun far out of focus: greens and the first yellow | Two drawn plates of soft blobs and spots of light |
| L2 Mid-ground | **The house's red wall** with its cover strips, a white corner board and white-framed windows; a birch now and then | The wall is a small drawn picture, repeated, 21 EL behind the path; a chapter says where the house stands (`house`) |
| L3 Play plane | **The deck:** boards 0.8 EL wide with dark gaps, each its own tone, a straight front edge and the dark under it. **The lawn:** a jungle of grass behind the path, stubble where he walks, dew, dandelions as tall as he is, clover, the birch's yellow leaves. Dry earth under the deck, a grey boulder, Pappa's pale shavings, the dark hedge. | A chapter marks what a stretch of ground is made of (`surfaces`); each kind has its tones and its edge. Nothing grows on what is built. |
| L3, overhead | **The lower deck above him:** boards and joists, with the sun falling through between the boards as stripes on the earth | A chapter says where (`roofs`) |
| L4 Foreground | Soft grass along the bottom, brighter than the forest's | The same cards, drawn brighter |
| Effects | Dew that flashes near the ground, only where something grows | The motes, kept low and made to twinkle |

The bog, the mountain and the summit at dusk use the same layers with their own things: sphagnum cushions,
sedge, dwarf birch, cloudberry leaves and cranberries; reindeer lichen, crowberry, dry grass and bare
boulders. Two things are different in the open:
- **The horizon is a picture that stays at the height of his eyes** however high he climbs: the distant
  forest and the mountain in mist, or the ridges and the hazy valley.
- **The bog's ground is islands.** It goes down into the water behind the path, and the water lies as far
  back as the eye reaches. The soft tussocks are mounds of paler moss.

Rules that hold for every place:
- **The play plane is sharp and level.** Nothing of the dressing stands where he walks, and within 0.3 EL of the
  path the ground has no bumps.
- **The sun stands behind the scene,** low and warm, so that everything on the play plane has a bright rim. A
  faint cool light from the camera's side lifts the faces.
- **The shade is cool.** What the sun doesn't reach goes towards blue-green, not towards black.
- **The haze begins behind the play plane** and takes the mid-ground with distance. The far plates have their
  haze painted in.
- **No hard edge on anything out of focus.** Far plates, shrubs, foreground and beams fade at every side.
- **Red is the candy's, the hook's and the lingonberries'.** Nothing else in a place is red, except what is
  red by nature and small: the ladybird, a crane's crown, the heart on Mamma's mug.
- **Nothing is compiled during play.** The first frames draw the whole chapter (gate 6).

### 2.3 One palette per place

From plan §5.4. All five are built, each as far as its row says.

| Place | Light | Ground | Accents | Built |
| --- | --- | --- | --- | --- |
| Gården, 10:00 | Low warm sun, dew sparkle, a blue morning sky | Lawn in four greens (`#3f6a22`, `#5c962b`, `#7fb238`, `#aecb52`), deck wood `#b49a78`, shavings `#e3cb9b` | The house in Falu red `#8f2d22` with white trim; dandelion yellow | **yes** |
| Granskogen, noon | Shafts of pale gold through cool blue-green shade | Moss in three greens and a gold (`#35521f`, `#587a27`, `#7f9a30`, `#b3ae45`), rust-brown needles | Red lingonberries; bark `#7d6753` | **yes** |
| Myren, late afternoon | Low gold sun, mist sheets over the water | Sphagnum in rust-red, green and gold (`#6e3226`, `#8f4d2b`, `#7d8a36`, `#bca94c`), straw sedge, dark peat water `#34423f` | Red dwarf birch, orange cloudberry leaves, cranberries, grey dead pines; the forest and the mountain in mist at the horizon | **yes**; Mamma's lamp not |
| Berget, golden hour | Pink-orange sky over blue-violet ridges, haze in the valley | Grey granite (`#8a8d94` to `#cfccc8`), white reindeer lichen | Crowberry, dry grass, bare boulders | **yes**; the crooked pines not |
| Final, blue hour to night | The first stars; then night and the green northern lights | The same granite and lichen, in blue | The candy and the ghost stay in their own colours | **yes**; the headlamps and the violet not |

### 2.4 The golden frames

Each holds Elof, a red hook ring and candy, and is drawn by the game itself.

1. **The moss under the spruces: built.** `?course=look-forest` (add `&debug` to start at once, and
   `&tier=high`). It is 48 EL of forest floor with a root, a hollow with a hook over it and a big candy.
   Kapitel 2 is dressed in the same look from end to end: `?dev&course=granskog`.
2. **The deck edge: built.** `?course=look-deck`. The deck with a step, the red wall and a window behind it,
   the hose down, the earth under the lower deck with a hook in the stripes of sun, and the lawn beyond.
   Kapitel 1 is dressed in the same look: `?dev`.

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

### 2.8 What the look still lacks

- Plates rendered in Blender after the landscape references, and scanned CC0 materials from Poly Haven for
  moss, bark and wood. What is there now is drawn in code and reads as stylized, not as photographed.
- On High: bloom on sparkles, and the half-resolution blur by depth. On Low: the grade inside the materials.
- Water with glitter, the things on rails and the helpers in the place's style: they are still greybox boxes.
- In the bog, the mountain and the final: pines with crowns (a bare trunk reads as a pole, so the mountain
  has none yet), the valley below the crane flight, Mamma's lamp, the headlamps.
- In the garden: long shadows, the hose and the lost things under the deck, the birch's crown, the workshop.

