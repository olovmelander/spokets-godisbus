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
- **Settling after a fast target change:** a remembered target step could keep injecting a catch offset even after
  the desired pose stopped moving, leaving Pappa's offered arm hyperextended. This only appeared with the preceding
  morning/painting history. A stopped or slowly moving target now clears that stale step while real jumps still
  ease. Nine private reading/painting profiles reduce the later waking elbow step from 1.433 to .0485 radians;
  regressions cover 30/60/120 Hz, a sudden target change and Pause/resume.
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
  the four private Stage rigs. The post-catch replay at `b024d24` includes 98 reading stops, 102,044 finite-pose
  checks, 1,126,312 finite bone-matrix checks and 7,656 exact Pause comparisons. No nonfinite pose, Pause drift
  or full-3D head/chest angle above 85 degrees remains; the largest angle is 66.83 degrees.
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
- **Turning feet when a walk starts or stops:** fading a wrapped relative foot angle could turn a half-turn crossing
  into a 4.33-radian hip-yaw jump. The carried direction now stays continuous before fading, standing inherits the
  last ankle position, and optional hip turns release toward the nearest equivalent angle at the existing leg-rate
  bound. Full/partial-retention, standing, crouch, cut and Pause regressions cover the branch boundary. Private
  Bertil replay at waking 1.175 reduces the thigh step from 2.152 to .178 radians and foot travel from 1.542 to
  .0527 EL. The following standing handoff still has .336 EL of foot travel within the existing pose-rate limits;
  this is not presented as perfect planted-foot locking.
- **Setting Elof down:** Pappa's initial reach could straighten the supporting elbow completely before the palm
  solver bent it again, losing its bend direction. A two-percent reach reserve lasts only while Elof is supported
  and eases away with the existing ride weight. Real-game private replay at 9.708 seconds reduces the elbow step
  from .171 to .00121 EL while retaining the same palm attachment. The regression fails before the fix and covers
  normal/reduced motion, contact continuity and Pause.

- **Torch ownership and orientation:** helpers keep a stable carrying hand as Elof passes them. Complete lamp
  frames follow the authored aim and recover roll continuously, including targets directly below the hand.
  Generic speech, pointing and knee support cannot overwrite that hand. Bertil releases his left torch grip
  with the existing boot-pull blend instead of switching it off at a threshold.
- **Taking a torch and putting on a coat:** partial torch contact keeps its chosen rotation arc when the moving
  palm crosses 180 degrees. Pappa's hands meet at a reachable point during the two existing coat handoffs, with
  continuous contact weights. A prior flashlight-show act can no longer activate the drawing's two-hand contact.
  Private replay with the real preceding story and reading stops removes the three torch jumps at coat entry and
  hand changes; the largest remaining lamp step is .071 EL during standing up, and handoff steps stay near .045 EL.
  Socket error is below 1.8e-15 EL, with exact Pause. Focused tests include both handoffs at 30/60/120 Hz.
- **Boot-pull release:** actual built private traces found a remaining right-elbow snap when Bertil's hands left
  the boot. The practical gesture now starts and ends with a .55-second smooth transition on event time. The real
  call, pull and readiness timing is unchanged. Private replay reduces the first release hand step from .0509 to
  .00187 EL, with exact Pause and held-reading contact; the final built replay checks the full talk/gesture layering.
- **Eating the golden sweet:** in Stormens öga the sweet now stays in the same right hand through carrying,
  inspecting and eating. Contact eases into the scene and releases after swallowing, before growth changes the
  act. Private replay reduces the entry hand step from .23464 to .000495 EL and the later release from .10580 to
  .002022 EL. Norrsken's separate left-hand taste also eases both contact endpoints; its visibility cutoff no
  longer drops the arm in one frame (.34567 to .01980 EL in the private replay). Speech reserves the carrying hand.
- **Releasing the rescue rope before tasting:** Norrsken's independent right-hand rope contact and carrying pose
  now fade on the opening scene clock over .45 seconds. The cached actual contact stays in Elof's frame during
  growth, without moving the wood or changing the rope's existing visibility. The real approach and taste action
  reproduce the original 2.782-radian wrist step/.196 EL hand movement; the corrected private replay gives .0306
  radians/.0135 EL, with exact Pause and no stale grip on restore or after the scene ends.
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

The combined built private review at `b3b41d3` covers twelve sequences in both phone orientations: the boot,
cap, Myren log/braid, shoulder ride, scarf, brush offer, reunion lamps, drawing, shown paper, head turns,
torch acquisition and carrying the carvings home. Actual checkpoints include the exact reported Stormkvällen
line held for four seconds with unchanged event time, and knee support followed by Pappa's reach/lift.
The corrected phone set has 51 inspected stills. A landscape speech bubble covers the scarf helper's upper
body, while the portrait view shows it; the landscape hand/scarf contact remains visible. Moa is outside the
authored portrait frame just before returning to drawing, then visible in the following held shot.

A further immutable built review at `59bd00d` checks the corrected boot release, ordinary full morning dialogue
followed by the real painting UI and waking, the two tasting boundaries, and a separately labeled drawing
inspection view. Each phone orientation passes all sixteen inspected stills, 2,884 recorded pose frames, two exact
Pause checks and all runtime assertions, with no nonfinite poses or large joint-step candidates. At the boot-ready
boundary the actual right forearm step falls from 1.182 to .184 radians and hand travel from .171 to .00486 EL.
The drawing inspection shifts only the inspection camera by four EL to expose both hands; it is not presented
as the game's authored composition. Captures and scripts remain in ignored scratch.

The immutable `39fd232` followup passes torch acquisition, both coat handoffs and the foot-turn route in each
orientation: seventeen authored captures, 1,584 pose samples, three exact Pause checks, no nonfinite poses or
large local joint-step candidates. Thirteen captures show the torch contacts. The four authored foot-context
views have occluded boots; eight additional, explicitly labeled side-camera frames expose the feet. Independent
inspection shows a quick stopping shuffle in a consistent direction, settling by 1.75 seconds. The packed game's
left-foot measurements agree with the private replay; its separate right foot moves .539 EL during the standing
handoff. The record retains that residual motion rather than claiming completely locked or uniformly slow feet.

The final code build `4be5132` adds ten inspected authored captures in each orientation for the ordinary
approach/rope release/taste and the full family conversation followed by Pappa setting Elof down. Phone and
landscape record 3,746 and 3,383 pose frames respectively, with no nonfinite values or runtime errors and two
exact Pause checks each. The final actual Pappa forearm step at 9.708 seconds is .00103 radians; Elof's rope
release gives .03052 radians at the wrist and .01351 EL hand travel. The sampled contacts are visually coherent.
A separate tiny, occluded Elof forearm change at the same set-down boundary measures .700 radians with .058 EL
hand travel and zero local wrist rotation; the captures do not establish a visible defect. This diagnostic is
retained explicitly, and the full approach is not reported as having zero joint-threshold candidates.

## Final gates

Final code `4be5132` passes typecheck, all 2,529 unit/robot tests in 265 files, the production build and size
gates (645.9 KB gzipped JavaScript; 5,761.9 KB boot), and the built-in privacy scan (1,021 tracked files,
187 built files, 439 media files; local exiftool and the optional denylist are unavailable). The actual
collection-bag browser passes Swedish labels for every added sweet/find in both adventures and both phone
orientations. Private exports remain unchanged.

The first complete CI run, `42870590629` at documentation/integration head `9a45f0e`, passed all 14 jobs,
including all twelve registered browser shards. The later transition fixes require a fresh run on the final head;
that earlier green run is not substituted for the merge gate.

Final acceptance also requires the final scene-specific private contact checks, green CI for the exact PR head
including all registered chapter browser suites, and successful Pages deployment. Results from those gates are
recorded in [PR #256](https://github.com/olovmelander/spokets-godisbus/pull/256) before delivery; earlier passing
builds do not substitute for the exact-head merge gate.
