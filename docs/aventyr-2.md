# Äventyr 2: Stormnatten

Design for the game's second adventure (Olov, 4 November 2026: "skapa nästa del av äventyret för Elof … ett nytt
unikt kapitel bestående av flera världar … när man har klarat av spelet som det är idag … så öppnas denna nya
del"). The first adventure (prologue, Gården, Granskogen, Myren, Berget, the final, the epilogue and Byn) is
**Äventyr 1**. This document is the canon for Äventyr 2; `HANDOVER.md` records what is built.

## Kort sammanfattning (på svenska)

- **Stormnatten.** En lördagskväll i slutet av oktober drar höststormen in över Bredbyn. Strömmen går, Mamma
  tänder ljus och Pappa letar fram ficklampan. Elof säger godnatt till sin egen lilla trägubbe – den han täljde
  själv på godiskalaset, med ögon han målade själv – och till Pappas allra första trägubbe, som äntligen står
  hemma på hyllan igen.
- **Fönstret slår upp.** En vindil tar den lilla trägubben rakt ut i mörkret, och gamla trägubben hoppar efter
  den utan att tveka. Klonk har sparat en sista stjärna i sin snidade påse. POFF – Elof blir liten igen, och
  hela familjen drar på sig regnkläder och pannlampor: "Vi letar tillsammans!"
- **Godisspåret** är gamla trägubbens: den tog en näve lördagsgodis ur skålen när den hoppade, och lämnar en bit
  i taget så att Elof kan följa efter. Den minns att lilla Elof en gång delade sitt godis med den.
- **Världarna:** Stormgården (blåst, regntunna och Bertils stövelbåt), Stormskogen (gungande grenar, ugglan och
  Pappas ficklampa som får Klonk att stelna till en bro), Byn i stormen (rännstensforsen, gallret och Moas
  paraply) och Sjön (vass, gungfly, bryggan och Mammas båt). Finalen, Stormens öga, är en sten ute i sjön där
  stormen plötsligt tystnar och stjärnorna kommer fram. Epilogen är morgonen efter.
- **Frågan som drar framåt:** "Varför väntar gamla trägubben aldrig på oss?" Svaret kommer i bilder: den låg
  ensam i en mörk spricka i flera år. Den vet hur lång en enda natt ensam i mörkret känns.
- **Slutet vänder på Äventyr 1.** Där delade Elof med sin trägubbe. Nu är det trägubbens tur: den har sparat ett
  geléhallon i guldpapper åt honom, samma sort som lilla Elof delade med den. Elof växer, står i sjöns grunda
  vatten med båda trägubbarna i händerna, och familjens lampor lyser från stranden.
- **Morgonen efter** ställer Elof tillbaka dem på hyllan, lagar fönsterhaken med Pappa och ger sin lilla trägubbe
  ett namn: **Fjun** – för att den flög som ett fjun i stormen.
- **Temat:** ingen ska behöva vara ensam i mörkret.

## Canon and rules carried over

- Elof is seven, plays games for 11+, and has nothing to lose: the glitter bubble, no lives, help only when asked.
- Klonk is named and is Elof's friend. It has no mouth; it speaks in thought pictures and *klonk*. It freezes into
  plain wood when a grown-up looks (the Toy Story rule), which Stormskogen turns into a puzzle.
- The family helps as kind giants, one at each big crossing, each with something of their own.
- No surnames, no address, no house number, no school, no logotypes. Real places nearby may be named, but Äventyr
  2 names only "byn" and "sjön".
- Nothing frightening chases Elof. The storm is wild, loud and beautiful, never a monster. The family is out in
  it with him, in raincoats, with lamps.
- Every line is at most about 40 characters and is in `src/content/aventyr2/sv.ts`.

## Characters new to Äventyr 2

| Who | What they are | How they show |
| --- | --- | --- |
| **Gamla trägubben** | Pappa's very first trägubbe (Äventyr 1's secret), crowberry eyes painted by Elof on the summit | Grey old wood, pointed cap, crooked smile. Seen ahead in each world; never caught up with until the final |
| **Lillgubben → Fjun** | The figure Elof carved himself in Äventyr 1's epilogue, eyes he painted; it blinked in the last card | Pale, small, round. Seen blown past in lightning flashes; found on the stone in the lake |
| **Ugglan** | A tawny owl in Stormskogen whose nest hole a storm-blown twig has blocked | Brown and round; flies Elof across the windthrow, and out to the stone in the final |

## The structure

About the length of Äventyr 1 (about 940 EL of course): a prologue, four worlds, a final and an epilogue.

| Id | Name | Place (dressing) | Family help | Length |
| --- | --- | --- | --- | --- |
| `stormkvall` | Prolog: **Stormkvällen** | home, evening, candles | all four at the window | ~55 EL |
| `stormgard` | Kapitel 1: **Stormgården** | garden at night in the storm | **Bertil**'s rubber boot boat | ~190 EL |
| `stormskog` | Kapitel 2: **Stormskogen** | forest at night in the storm | **Pappa**'s flashlight | ~200 EL |
| `stormbyn` | Kapitel 3: **Byn i stormen** | the village street at night | **Moa**'s umbrella | ~170 EL |
| `sjon` | Kapitel 4: **Sjön** | the lake shore in the storm | **Mamma** steadies the boat | ~170 EL |
| `stormoga` | Finalen: **Stormens öga** | the lake under clearing sky | all four, with their lamps | ~80 EL |
| `morgonen` | Epilog: **Morgonen efter** | home, a still sunny morning | Pappa and the window latch | ~55 EL |

The ids are stable (they are in `CHAPTER_IDS` after `epilog`); the numbers ("Kapitel 1") are computed and never
stored. Äventyr 2 opens when Äventyr 1 is finished: Byn's last card leads on to it ("Nästa äventyr"), and
*Utforska vidare* lists its chapters once the epilogue has been played. Its chapters keep their own codes.

## The worlds, beat by beat

### Prolog: Stormkvällen (home)

1. **Lördagskväll.** The time card. Elof is a boy among small things. Rain lashes the windows; the lights go out.
   Mamma lights candles, Pappa finds the flashlight.
2. **Godnatt.** At Pappa's shelf Elof says goodnight to his own little trägubbe and the old one.
3. **Fönstret slår upp** (held scene). A gust bursts the window; the little one is swept out into the dark, and
   the old one leaps after it. Pappa sees only the open window and the empty places.
4. **Klonk's star.** Klonk (frozen while Pappa looks, awake when he turns away) shows its last star. *Smaka på
   stjärnan*: POFF, Elof is small.
5. **Vi letar tillsammans** (held scene): the family pull on raincoats and headlamps; each says what they will do.
   A first candy lies on the sill: the old one's trail. Out through the veranda door. Title: *Stormnatten*.

### Kapitel 1: Stormgården (garden at night)

1. **The veranda** in the rain: drops from the overflowing gutter (read their shadows, E1-style).
2. **The pumpkin lantern** on the steps: warm light, the first big candy. "Gamla trägubben lämnar godis åt oss!"
3. **Stormbyarna**, the exciting sequence: gusts across the open lawn; shelter behind upturned pots.
4. **Regntunnan** (puzzle): the ditch is too wide. Up the rain barrel's hose, *Vrid på kranen*: the water fills
   the ditch and the floating lid rises to become a bridge.
5. **Bertils stövelbåt:** "Ropa på Bertil". His rubber boot carries Elof over the flooded lawn.
6. **The playhouse**: ledges up its wall. The old trägubbe's thought picture waits on its roof (a lonely figure).
   Optional: the trampoline's bounces up to the roof ridge for a hidden candy.
7. **The hedge:** a lightning flash shows the little one tumbling over the hedge towards the forest.

### Kapitel 2: Stormskogen (forest at night)

1. **Kottregnet** (exciting sequence): cones shaken loose fall from the swaying spruces; read their shadows.
2. **Gungande grenar:** boughs swaying in the wind are moving platforms over a ravine.
3. **Ugglan** (puzzle): a storm-blown twig blocks the owl's hole. Pull it away with the lace.
4. **Vindfällen:** fallen spruces. The owl flies Elof over the widest gap.
5. **Pappas ficklampa** (puzzle, the Toy Story rule): "Ropa på Pappa". His beam falls on Klonk, who freezes stiff
   and topples across the gap like a plank. Elof walks over his friend; Pappa looks away and Klonk wakes.
6. **Gamla trägubbens minne:** at a dark hollow Klonk shows the old one's thought: the crack on the mountain.
   "Den var ensam i mörkret i flera år." "Därför väntar den inte."
7. **Lavskrikan** from Äventyr 1 shelters in a hollow; a lingonberry, and it shows the way up.
8. Down the hill towards the village, where every window is dark.

### Kapitel 3: Byn i stormen (village street at night)

1. **The flapping awning** bounces him like a trampoline.
2. **Rännstensforsen:** the gutter is a rushing river; a birch leaf rides it.
3. **Gallret:** the drain grate's bars over the deep dark.
4. **Moas paraply:** "Ropa på Moa". From a high wall he floats down under her umbrella over the flooded crossing.
5. **The swinging sign:** a moving platform.
6. **Fjun's cap:** the little one's carved cap lies in the gutter. "Rännstenen rinner ner till sjön!"
7. Down the steps to the shore path.

### Kapitel 4: Sjön (lake shore)

1. **The beach stones** and the reeds, climbed like stems.
2. **Gungflyet:** floating mats of reeds that sink while he stands on them.
3. **The jetty:** waves wash over it in gusts; shelter behind its posts.
4. **Mammas båt:** "Ropa på Mamma". She holds the rowing boat against the jetty; its gunwale is the way on.
5. **The bark raft** (puzzle): push a piece of bark into the water to make a step.
6. At the jetty's end, a flash: the little one and the old one on a stone far out. "Där! På stenen!"

### Finalen: Stormens öga

1. The owl comes back and flies Elof out over the waves.
2. **The storm's eye:** the wind drops, the clouds part, stars and the moon. On the stone the old trägubbe holds
   the little one. They are cold and still, and then they see him.
3. **The golden sweet:** the old one gives Elof a geléhallon in gold paper it saved for him. *Smaka*: he grows,
   standing in the shallows with both figures in his hands.
4. The family's lamps on the shore; the long walk home through the calm.

### Epilog: Morgonen efter

1. Sunday morning, sun, leaves on the floor. Elof puts both figures back on the shelf.
2. With Pappa he turns the new window latch: "Nu blåser ingen bort."
3. The naming: "Du ska heta Fjun!" Klonk: *klonk, klonk*. The last card: *Ingen ska behöva vara ensam i mörkret.*

## What is new to play

| Puzzle or sequence | Built from |
| --- | --- |
| The rain barrel fills the ditch, a lid floats up into a bridge | a *turn* spot and a mover that its flag lifts (`on`) |
| Pappa's beam freezes Klonk into a bridge | a *call* spot, a short held beat, a ledge that needs it |
| Swaying boughs, a swinging sign, bobbing jetty planks | movers with a `cycle` |
| The owl's twig, then the owl's flight | a *pull* mover and a ride |
| The gutter river, the umbrella, the boot boat | rides |
| Gusts on the lawn and the jetty | gusts with shelters |
| Falling cones, gutter drops | drips |
| Floating reed mats | tussocks |
| The flapping awning, the trampoline | bouncers |
| The bark raft | a *push* mover into the water |

## As built (4 November 2026)

The four worlds were authored from this design and keep its beats, with these details settled in play:

- **Stormgården:** two runs of gutter drops with a dry place between; six upturned flower pots in the gusts, one of
  which Klonk is blown into; a watering can beside the barrel leads back up to the tap; the trampoline is the only
  way up the playhouse wall to its lookout. The trail itself climbs the playhouse's front steps.
- **Stormskogen:** no rolling cones (the descent stays gentle); the owl's flight crosses a 10.5 EL windthrow; the
  frozen-Klonk plank stays for good once laid, so there is always a way back; the old trägubbe is seen in a flash
  going down the hill.
- **Byn i stormen:** the awning's flap is an optional bounce to the trestle stands; a 27 EL leaf ride down the
  gutter; five grate bars; four stone steps up the wall to Moa's umbrella.
- **Sjön:** a reed climbs the high stone; seven reed mats; six jetty posts against the waves; Mamma's boat is a
  gunwale level with the planks; the bark is pushed three times into a gap a running jump cannot clear ("Bark
  flyter, precis som Klonk!"). Wood floats: that is why the two figures survived the lake.

## Technical shape

- Äventyr 2 is its own **chapter pack**, a JavaScript chunk loaded only when it is needed: when the page is asked
  for one of its chapters, or when the save shows Äventyr 1 finished. The boot JavaScript stays under the plan's
  450 KB (gate 2); the pack has a gate of its own (`scripts/size-gate.mjs`).
- `src/content/aventyr2/` holds its chapters, its Swedish words (merged into `sv` when it loads) and its pictures
  (storm rain, lightning, the figures, the pumpkin, the owl, the boot and the umbrella), registered into the
  renderer's small extension points.
- The release boundary is unchanged: `RELEASED_CHAPTER` decides, and `?dev` shows unreleased work.
