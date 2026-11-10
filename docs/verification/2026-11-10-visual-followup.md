# Visual details and character motion, 10 November 2026

This continues from `origin/main` at `1746342`, after the owl-tree fix in PR #255. The earlier 62-item
playthrough, aurora and bark requests are already delivered; their saved patches must not be reapplied.

## Request

Olov's latest screenshots and words ask for better windows on every car, better footballs, Swedish names
for the pictured sweets and found objects, and drawings whose family members look like their game models
and whose events fit the story. He also reports Pappa's unnatural flashlight arms in the first chapter.
The attached exact line, “Då hjälps vi åt. Ropa när du behöver oss.”, identifies Stormkvällen in Äventyr 2.

He then adds:

> Sedan måste vi se över alla karaktärer i olika delar i spelet så de inte har onaturliga rörelser med armar,
> att huvudet är bak och fram, att de rör sig konstigt eller stt kroppsdelar går rakt igenom sin egen kropp.
> Jag vill bara att det ska se naturligt och smooth ut!!!

## Visual changes

| Request | Result | Evidence |
| --- | --- | --- |
| Every car's orange windows | The two shared car models use cool reflective glass with subtle interior depth. Opaque orange covers are removed; glass clears the black surrounds. | Actual built Byn, Stormbyn, Flärken, Älven and Billsta: 20 inspected views across Low/High and 390×844/844×390. Twelve further views check the final glass separation and Älven before its lamp cue. No renderer errors. Geometry checks preserve the body, wheels, pillars and lights. |
| Footballs | Curved pentagons and hexagons with shallow seams replace smeared patches. Shared static, rolling and ride balls use the same geometry; the three small table balls also match. | 28 final built private captures across Low/High and both phone orientations: static balls, rollers, the table, puddle clue, four actual puzzle kicks and Bertil's kick through the goal. All input and resource checks passed; no renderer errors. The other eight objects in the public yard GLB keep their geometry/material hashes. |
| Swedish names | The actual bag already translated the internal IDs shown in the reference sheet. Remaining raw-ID fallbacks now use Swedish category names. Review captions also describe the pictures in Swedish. | The collection browser checks all eight storm sweets and twelve added finds, visible labels and badge titles, from both adventures in both phone orientations. Save identifiers are unchanged. |
| Family and story illustrations | One shared cast supplies the story pictures, memories and dialogue portraits. Hair, clothes, cap, glasses and raincoats match each character and scene; the two carvings remain distinct. Separate window-escape, forest-trail and cap-return scenes respect the reveal order. | All 18 story pictures, 13 memory pages, seven cast figures and two carving panels inspected. All 18 SVG/Canvas interiors agree exactly; six comparisons also test embedded HTML gradients. Memory presentation passed 52 browser checks. The built private album passed 39 selection/caption/layout views at `ce913c6`, before the gradient correction, then ten final colour views at `dfff6af` in both phone orientations. These paused album views do not test actor motion. |
| Pappa's flashlight | The grip uses the actual shoulder and arm lengths, a bent elbow outside the body and the finger socket. Speech and walking reserve the occupied hand. The raincoat transfer remains intact. | Private-model CPU checks: 48 poses across four relatives, six acts and both arms, plus 237 staged frames. Built quote/entry/rise/coat sequences at both phone orientations; a 245-second native-rendered portrait recording includes the preceding walk and held line. Outdoor forest/jetty holds inspected in both orientations. |

Elof wears his striped blue shirt in ordinary drawings and the yellow raincoat where the story calls for it.
Mamma has her blond braid, black sleeveless top and olive trousers; Pappa his black cap, glasses, black shirt
and denim shorts; Moa long blond hair, denim jacket and yellow dress; Bertil his red/white cap with the approved
blue/gold crest, white shirt and dark trousers. The grandparents retain their white hair and different glasses
positions, Morfar his navy diamond-band jersey and Mormor her pale-blue patterned blouse.
Pappa's memories show toddler Elof in light-blue pyjamas indoors and his jacket
and flat cap outdoors, with the parents as they look today, as the plan specifies.

## Motion findings

The review follows the final drawn poses, including prop attachments and speech, as well as the base rigs.
It found concrete defects that isolated still images had missed:

- **Repeated pose edits during reading:** family/player motion returned its cached pose, so practical gestures
  such as the scarf could add their lean again on every held redraw. Reusable output copies now protect the
  base pose on every return path. The regression failed before the fix.
- **Repeated helper turns:** lift/reach/hold directions blended against the previous rendered yaw even with
  zero event time. A single desired direction now turns once on event time; Pause and reading cannot accumulate it.
- **First walking frame:** at the exact prologue key, stride integration divided zero by a zero step length,
  contaminating the settling legs and body with NaN. A zero elapsed interval now produces zero steps. An actual
  scene regression covers that boundary, stationary moves and instantaneous moves.
- **Cap acquisition and release:** both the authored arms and their contact weights now ease onto the cap before
  it leaves Bertil's head, then ease off after it reaches the water. The previous one-frame contact switches
  produced a 102-degree upper-arm jump on entry and a 48-degree jump on release in the actual private game trace.
- **Lamp acquisition:** taking the lamp now blends on the scene clock while the lamp follows the actual socket.
  A private Bertil Stage check reduces the acquisition boundary from a roughly .8 EL hand jump to .00158 EL;
  the held contact remains exact. Pappa's already-held indoor lamp stays supported across later acts.
- **Free arms while walking:** walking beneath a gesture no longer disables both arms. Pointing, offering,
  painting, waving and shining retain their working hand while the genuinely free arm follows the stride.
  Actual held props reserve their hand; a drawing reserves both. Point-and-walk is a synthetic regression,
  not a claim that such a key is currently authored in a chapter.
- **Wrist and elbow singularities:** the grip solver no longer switches reference axes when the forearm aligns
  with a held object. The elbow's bend plane travels with the reach instead of flipping when a target crosses it.
  Mirrored regressions preserve segment lengths, socket contact and repeated-frame determinism. A private Elof
  walk with two held carvings went from 90 large joint steps to zero in 1,200 frames; the actual game trace is
  checked separately below. Torch aim/roll follows complete authored frames, including vertical targets and seeks.
- **Backwards heads:** Stage's inertial catch could exceed the intended gaze range, producing 100–132-degree
  head/chest angles on actual private models. Smooth offset bounds and a separate neck speed retain ordinary
  gaze without that overshoot. All 75 authored scenes were replayed across 174 staged actor/scene groups with
  the four private Stage rigs: no full-3D head/chest angle exceeds 85 degrees; the largest is 78.36 degrees.
- **Pause/resume:** Pause held the visible pose but erased the unfinished blend's velocity and offset. Retaining
  that state makes resumed authored reunion/bathroom paths match uninterrupted paths. Eight private scenes in
  Norrsken/epilog have no remaining joint-step candidates in that replay; exact Pause is checked independently.
- **Drawing and showing:** Moa's shown page follows her shoulder midpoint rather than the side-to-side motion of
  her mouth. Dense private replay of the show transition has no forearm/abdomen crossings and keeps palm/edge
  contact within 4.1e-8 EL. Returning to seated drawing now eases contact on the scene clock; quiet/restored draws
  retain complete contact. Pappa's offering reach limit also blends with each retained act's contact share.
- **Elof's feet:** the recovering ankle now clears the toe, the trailing ankle opens for landing, and the first
  grounded frame can actually resume the leading heel's stride. The public stand-in now applies the ankle pose.
  The 2,552-frame private simulation course keeps physics states identical: seven toe-scuff frames become zero,
  and measured contact-only running-landing slip falls from 1.351 to .743 EL. These are reductions, not perfect
  foot locking. A static-built lab with the private and public bodies was inspected in both phone orientations;
  short native RAF intervals use fixed 60 Hz pose/course steps, not the ordinary game's variable pose delta.
- **Pelvis and planted legs:** both rig implementations counter the pelvis's twist in descendant thighs, preserving
  body motion and authored leg turns. Actual private Billsta sole vertices sampled at 120 Hz reduce lateral slip
  from about 8% to 3%, and total horizontal slip from about 15% to 11%; fore/aft slip remains about 9–10%.
  The public slow-walk proxy's total improves from .20761 to .18386 while its along-course component rises from
  .06593 to .08218. The x bound changes from .08 to .085, alongside a stronger two-axis check of total slip below
  .19 and a z bound of .14. This tradeoff remains explicit.

- **Torch ownership and orientation:** helpers keep a stable carrying hand as Elof passes them. Complete lamp
  frames follow the authored aim and recover roll continuously, including targets directly below the hand.
  Generic speech, pointing and knee support cannot overwrite that hand. Bertil releases his left torch grip
  with the existing boot-pull blend instead of switching it off at a threshold.
- **Kneeling palms:** the old wrist target behind the knee put forearms through the abdomen. The contact solver
  now supports the palm on the visible knee surface with an outward elbow and a flat palm; private models use
  a small cached patch of the skinned knee. Repeated low stances ease into support instead of skipping the
  transition. Six private anatomy views and final integrated geometry checks show supported palms within
  .002 EL of the skin without the persistent forearm/abdomen crossings. The occupied torch hand remains reserved.

The built album review also found a colour defect invisible in standalone art: pre-rendered portraits and
runtime pictures could reuse the same SVG gradient ID. Separate namespaces fix that conflict. The actual
window picture previously differed over 48% of its interior; the mixed-document regression now matches
(zero difference for five sampled scenes, under .006% antialiasing variation for breakfast). Ten final native
browser album views verify the restored colours, correct figures and readable captions in both orientations.

## Review methods and limits

- The private repository remains linked at `art/private`, unchanged at `fd8c283`. No private model, reference
  image, likeness screenshot or video is committed. Captures and diagnostic scripts remain in ignored scratch.
- The inventory covers all 18 released chapters and 75 authored stage scenes. The seven actual private models
  were screened across 1,663 base/action/idle poses. Potential contacts from raw poses were checked against the
  actual scene overrides; a synthetic Moa reach warning disappeared under the proper two-hand scene IK and is
  not reported as an in-game defect.
- Built checkpoints use actual inputs and dialogue, reached with development spawn/prior flags. They are not
  uninterrupted playthroughs. The motion review records final private joint transforms at 60 Hz; some intermediate
  WebGL draws are skipped to keep the software-rendered review practical. Captured frames are fully rendered.
- The flashlight's native recording uses ordinary RAF and rendering. The separate car/football sampled reviews,
  static illustration sheets and paused album views do not establish continuous animation smoothness.
- These checks establish the sampled appearance, continuity, contacts and pause behavior. They do not measure
  physical-phone frame rate or claim that every possible moment of every chapter was inspected.

The registered `family-help` browser suite also passes all 55 checks on the isolated post-pelvis source `e372093`: Gården, both
Granskogen helpers, Myren, Norrsken and epilog, at Low 844×390 and High 390×844. These use the public articulated
helpers and verify real renderer grounding, composition, exact Pause, idle/greeting motion and resource budgets.
This precedes the final combined knee/lamp corrections; CI checks the final PR head separately.

## Final gates

Integration `b3b41d3` passes typecheck, all 2,497 unit/robot tests in 260 files, the production build and size
gates (644.9 KB gzipped JavaScript; 5,760.8 KB boot), and the built-in privacy scan (1,013 tracked files,
187 built files, 439 media files; local exiftool and the optional denylist are unavailable). The actual
collection-bag browser passes Swedish labels for every added sweet/find in both adventures and both phone
orientations. Private exports remain unchanged.

Final acceptance also requires the combined built private motion review in both phone orientations, followed
by green CI for the exact PR head, including all registered chapter browser suites, and successful Pages
deployment. Results from those gates are recorded in the pull request before delivery.
