# Art bible

How the game should look, and how each part of the look is made. The plan (`game-plan.md` §5) sets the
direction; this file holds the rules a session follows while building. It grows through Stage 0b and 0c.

Written so far: the characters (§1). Still to come, from plan §5.6: the scale chart, a palette and a grade per
place, the layer recipe, the two golden frames, the H1a board and the fallback look.

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

- **Sculpting by script** (what Elof's third model is, and the default until Olov decides). Rounded forms are
  fused into one surface with a voxel remesh, cut where the eyes and ears are, smoothed and thinned out. That
  gives eye sockets with lids, cheeks, a button nose, lips, ears, fingers and hair in swept tufts. The body is
  skinned on 15 bones named after the animation library's joints. Colour is painted on the vertices, with
  shadow baked into the creases; only the shirt's stripes are a texture. About 15,300 triangles and three
  materials. It reads as a stylized cartoon boy, which the second model (plain balls and tubes) did not. It is
  still short of the sheets: the face is made of simple rounded forms, and the cloth has no real folds.
- **A base body that an artist made,** reshaped and dressed in Blender. The steps are below. The free version of
  the base pack turned out to hold only two muscular adult bodies; the *Teen* and *Regular* bodies this needs are
  in its paid version (20 US dollars, still CC0).

§1.6 is the route that can reach the sheets, and it is Olov's decision.

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

### 1.6 The route that can reach the sheets: image-to-3D, if Olov says yes

The sheets Olov made are already stylized 3D pictures of the characters, with a front, a side and a back view of
each. An image-to-3D service turns such views into a model that looks like them: the sculpted face, the hair,
the folds. Nothing built by script or over a base gets as close.

- **Cost and consent.** About 20 US dollars for one month of a paid plan (Meshy Pro is the one the plan
  examined, Appendix B.4). Both parents have agreed to the sheets going to a paid Meshy plan (plan §2.6).
- **Before any sheet is uploaded** (plan §0 Q15): the plan must give Olov ownership of what it makes; uploads
  must not be used for training, or that must be switched off; nothing may land in a public gallery; and the
  uploads are deleted once the models are downloaded. A free tier is never used.
- **What happens then.** Olov generates each character from its views (Elof's three views are already cropped
  to 1024 px squares in `art/private/elof/image-to-3d/`). Claude does the rest in Blender: cleans the mesh,
  brings it down to 15,000 triangles, fits it to the animation library's skeleton, replaces the face with one
  that can change expression, and bakes one 1024² texture.
- **The ghost doesn't need it.** Carved facets are what scripted modelling does well (§1.5).

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
- Quaternius, *Universal Base Characters* and *Universal Animation Library* (CC0).
  <https://quaternius.com/packs/universalbasecharacters.html>,
  <https://quaternius.com/packs/universalanimationlibrary.html>
- Blender Studio, *Human Base Meshes* (CC0): stylized bodies and a planar head, as a second base to try.
  <https://www.blender.org/download/demo-files/>

The ArtStation page and the Pinterest board could not be read by the session that wrote this (one refused the
request, the other came back empty), so what is said about them here comes from descriptions of them elsewhere.
Olov has seen both, and his eye decides at H1b.
