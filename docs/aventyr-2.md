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
  honom utan att tveka. Klonk har sparat en sista stjärna i sin snidade påse. POFF – Elof blir liten igen, och
  hela familjen drar på sig regnkläder och pannlampor: "Vi letar tillsammans!"
- **Godisspåret** är gamla trägubbens: han tog en näve lördagsgodis ur skålen när han hoppade, och lämnar en bit
  i taget så att Elof kan följa efter. Han minns att lilla Elof en gång delade sitt godis med honom. Bertil undrar
  redan hemma om det räcker hela vägen.
- **Spåret tar slut.** Vid slutet av Älven ligger det sista godiset. Elof ser dem inte längre, och det är nattens
  lägsta punkt. Då säger Moa att de aldrig ger upp, Bertil har godis i fickan, och i Billsta springer de före och
  lägger ett nytt spår åt honom.
- **Världarna:** Stormgården (blåst, regntunna och Bertils stövelbåt), Stormskogen (gungande grenar, ugglan och
  Pappas ficklampa som får Klonk att stelna till en bro), Byn i stormen (rännstensforsen, gallret och Moas
  paraply), Olympia (fotbollsplanen i Bredbyn: bollen som flyter, nätet upp till ribban och Bertils frispark),
  Flärken (badplatsen: lekplatsen, hopptornet, bryggan och Mammas SUP), Älven (strömmen ner förbi Bredbyn och
  Moälven) och Billsta (mormor och morfars hus vid vägen intill skogen, ladan och Billaberget).
- **Vägen:** stormen blåser lillgubben norrut till Flärken. Där faller han i vattnet, och trä flyter: ån bär honom
  söderut förbi Bredbyn och nerför Moälven, som rinner ända till Billstasundet. Billsta ligger tre mil bort, så
  familjen tar bilen dit, till mormor och morfar, vars hus står vid vägen intill skogen. Bakom huset går Elof upp på
  Billaberget, och därifrån syns trägubbarna nere i sundet. Finalen, Stormens öga, är en sten ute i sundet där
  stormen plötsligt tystnar och stjärnorna kommer fram, och Själevads vita kyrka syns vid sjöns ände.
- **Frågan som drar framåt:** "Varför väntar gamla trägubben aldrig på oss?" Svaret kommer i bilder: han låg
  ensam i en mörk spricka i flera år. Han vet hur lång en enda natt ensam i mörkret känns.
- **Slutet vänder på Äventyr 1.** Där delade Elof med sin trägubbe. Nu är det trägubbens tur: hans allra sista bit,
  ett geléhallon i guldpapper, sparade han åt Elof. Förr delade Elof; nu delar trägubben tillbaka. Elof växer, står i det grunda vattnet
  med båda trägubbarna i händerna, och familjens lampor och mormors lykta lyser från stranden.
- **Morgonen efter** ställer Elof tillbaka dem på hyllan, lagar fönsterhaken med Pappa och ger sin lilla trägubbe
  ett namn: **Fjun** – för att han flög som ett fjun i stormen. Mormor och morfar är med på frukosten.
- **Temat:** ingen ska behöva vara ensam i mörkret.

## Canon and rules carried over

- Elof is seven, plays games for 11+, and has nothing to lose: the glitter bubble, no lives, help only when asked.
- Klonk is named and is Elof's friend. It has no mouth; it speaks in thought pictures and *klonk*. It freezes into
  plain wood when a grown-up looks (the Toy Story rule), which Stormskogen turns into a puzzle.
- The family helps as kind giants, one at each big crossing, each with something of their own.
- No surnames, no address, no house number, no school, no logotypes (the one exception is the name Olympia in white
  letters on the red hall, which Olov asked for). Real places nearby may be named, but Äventyr
  2 names its public places too: Olympia, Flärken and Billsta.
- Nothing frightening chases Elof. The storm is wild, loud and beautiful, never a monster. The family is out in
  it with him, in raincoats, with lamps.
- Every line is at most 42 characters and is authored in `src/content/aventyr2/lines/`, merged by `sv.ts`.

## Characters new to Äventyr 2

| Who | What they are | How they show |
| --- | --- | --- |
| **Gamla trägubben** | Pappa's very first trägubbe (Äventyr 1's secret), crowberry eyes painted by Elof on the summit | Grey old wood, pointed cap, crooked smile. Seen ahead in each world; never caught up with until the final |
| **Lillgubben → Fjun** | The figure Elof carved himself in Äventyr 1's epilogue, eyes he painted; it blinked in the last card | Pale, small, round. Seen blown past in lightning flashes; found on the stone in the lake |
| **Ugglan** | A tawny owl in Stormskogen whose nest hole a storm-blown twig has blocked | Brown and round; flies Elof across the windthrow, and out to the stone in the final |

## The structure

Version 2 (4 November 2026, Olov: "ännu fler miljöer, mer pussel och ett ännu mer episkt äventyr … Billsta,
Själevad där mormor och morfar bor … badplatsen Flärken … Olympia i Bredbyn … pussel med en fotboll"). Ten
chapters, about 1,500 EL, half as long again as Äventyr 1. The places and the water that ties them together are in
[the reference study](aventyr-2-reference-study.md): Flärken drains south down Norra Anundsjöån to Bredbyn, into
Anundsjösjön and Moälven, and Moälven runs through the narrow at Billsta into Själevadsfjärden, where Själevad's
white eight-sided church stands at the lake's end.

| Id | Name | Place (dressing) | Family help | Length |
| --- | --- | --- | --- | --- |
| `stormkvall` | Prolog: **Stormkvällen** | home, evening, candles | all four at the window | ~55 EL |
| `stormgard` | Kapitel 1: **Stormgården** | garden at night in the storm | **Bertil**'s rubber boot boat | ~190 EL |
| `stormskog` | Kapitel 2: **Stormskogen** | forest at night in the storm | **Pappa**'s flashlight | ~205 EL |
| `stormbyn` | Kapitel 3: **Byn i stormen** | the village street at night | **Moa**'s umbrella | ~180 EL |
| `olympia` | Kapitel 4: **Olympia** | Bredbyn's football ground at night | **Bertil** kicks the ball | ~175 EL |
| `flarken` | Kapitel 5: **Flärken** | Flärkenbadet, the bathing place | **Mamma** steadies the boat | ~185 EL |
| `alven` | Kapitel 6: **Älven** | down the river by night | **Pappa** on the bridge | ~180 EL |
| `billsta` | Kapitel 7: **Billsta** | mormor och morfar's house by the road, the forest, Billaberget | **Mormor** and **Morfar** | ~190 EL |
| `stormoga` | Finalen: **Stormens öga** | Själevadsfjärden, under clearing sky | everyone, with their lamps | ~85 EL |
| `morgonen` | Epilog: **Morgonen efter** | home, a still sunny morning | Pappa; mormor and morfar at breakfast | ~55 EL |

**The journey a child follows.** The storm carries the little one from the window over the garden and the forest
into the village; across Olympia's pitch; and on the strongest gust north up the valley to the lake at Flärken.
There he falls into the water, and wood floats: the river carries him back south past Bredbyn and down the big
river, which runs on all the way to the narrow at Billsta. The old trägubbe follows every step of the way, leaving
candy; the family follow by road with their lamps. Billsta is three mil (30 km) from Bredbyn, so at the end of the
river the family's car stops for Elof, and they drive to mormor and morfar, whose house stands by the road near the
forest (Olov, 4 November). From the house the way goes through the forest and up Billaberget, and from its brow a
flash shows both figures far below on a stone in the narrow. Lightning shows the little one far ahead, again and
again.

**Mormor and morfar.** Olov asked for them and for their home on 4 November. They are "Mormor" and "Morfar" only:
no personal names. The public code has plain stand-in figures; the approved models and house come from the private
pack described in `HANDOVER.md`. The house is white with two gables and a red barn beside it, a lawn and birches. No address, house
number, sign or coordinates appear anywhere, no real map shows it (Moa's crayon map may draw it: Olov, 8 November
2026), and the picture is never committed. Anything comes out again if they or Elof's parents ask.

## The worlds, beat by beat

### Prolog: Stormkvällen (home)

1. **Lördagskväll.** The time card. Elof is a boy among small things. Rain lashes the windows; the lights go out.
   Mamma lights candles, Pappa finds the flashlight.
2. **Godnatt.** At Pappa's shelf Elof says goodnight to his own little trägubbe and the old one.
3. **Fönstret slår upp** (held scene). The window by the shelf rattles on its hook all evening. A gust bursts it:
   its two halves fly outward, as Swedish windows open, and bang in the wind, the hook hanging loose (6 November
   2026; before, the window never moved). The little one is swept out into the dark, and the old one leaps after
   it. Pappa sees only the open window and the empty places, and in the next scene he pulls it to. The morning
   after, he and Elof mend its hook.
4. **Klonk's star** (held scene). Pappa shuts the burst window and Mamma looks out after the figures, their backs
   to the room. With no grown-up looking, Klonk wakes on the shelf, hops down to Elof's feet and opens its carved
   bag: the star rises out of it. Nothing lies waiting on the floor before this (5 November 2026: the star had lain
   glowing by the shelf from the first picture). *Smaka på stjärnan*: Elof holds it, eats it, and the POFF comes
   behind the grown-ups' backs. They turn at the sound, and Klonk is wood again while they look. Elof is small.
5. **Vi letar tillsammans** (held scene): the family pull on raincoats and headlamps; each says what they will do.
   Only now is the old one's trail there: a big candy under the window where he landed, then sweets one at a time
   to the veranda door. Out through the veranda door. Title: *Stormnatten*.

### Kapitel 1: Stormgården (garden at night)

1. **The veranda** in the rain: drops from the overflowing gutter (read their shadows, E1-style).
2. **The pumpkin lantern** on the steps: warm light, the first big candy. "Spåret fortsätter ut i trädgården!"
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
   All along the street the blinds are down. He pulls a shop's bell cord, someone wakes, and a blind goes up on a lit
   window: three times, the same thing he does for his own family at the end of the night.
4. **Moas paraply:** "Ropa på Moa". From a high wall he floats down under her umbrella over the flooded crossing.
5. **The swinging sign:** a moving platform.
6. **Fjun's cap:** the little one's carved cap lies in the gutter. "Rännstenen rinner ner till sjön!"
7. Down the steps to the shore path.

### Kapitel 4: Olympia (Bredbyn's football ground at night)

Anundsjö IF's ground near the centre: an artificial-turf pitch, a smaller pitch, the ski stadium's floodlit trails
and biathlon range, an arena "where time stood still". The floodlights are dark in the power cut; lightning shows
the pitch. A football is one and a half Elofs high: the puzzles are football puzzles.

1. **The ball-stop net** and the fence: a long climb in the wind.
2. **Rolling balls:** footballs bowled across the flooded pitch by the gusts (jump them, or shelter behind cones).
3. **Bollen i målet:** the goalmouth is flooded and too wide, and a small ball bobs in it. The answer is behind him: he
   ran under a table with a big football on it. He goes back, climbs up behind it, and kicks it down and on into the
   water, where it floats: a stepping stone.
4. **The net and the crossbar:** climb the goal's net up to the crossbar and walk along it.
5. **The corner flag** snapping in the gusts, and the benches' roofs dripping, with a dry way under them.
6. **Bertil's free kick:** "Ropa på Bertil". He kicks the ball, and Elof rides it in a great arc into the far goal.
7. **The biathlon range:** knock the targets white, one by one (optional), for side candy.
8. At the far end the strongest gust takes the little one north, up the valley towards the lake. Flärken is six
   kilometres off, so the family takes the car: Bertil, "Hoppa in i bilen! Vi åker till Flärken."

### Kapitel 5: Flärken (Flärkenbadet, the bathing place, Kubbe and Norrflärke)

The villages' bathing place, run by their club: a bay, jetties, a diving tower, changing rooms, barbecue and
picnic places, a volleyball court and a playground. In late October it is empty and wild.

1. **The playground:** swings as lace rings, the slide as a climb and slide.
2. **The volleyball net** as a bouncy way up; picnic tables to shelter under and climb.
3. **The changing rooms:** a door banging in the wind (a moving platform); their roof.
4. **The beach and the reeds**, floating reed mats; **the jetty** with waves washing over in gusts.
5. **Mammas SUP:** standing on the family's stand-up paddle board, she paddles up and holds it against the broken jetty (Olov, 6 November 2026: in place of the rowing boat).
6. **The diving tower:** up its ladder to the top, the lookout; a flash shows the little one far out.
7. **The bark raft** across the last gap; the lake's outlet takes the little one and the old one, who follows on a
   log, down the river: "Trä flyter!"

### Kapitel 6: Älven (down the river by night)

Norra Anundsjöån past Bredbyn and down Moälven: the long way home of the water.

1. Riding the current on a raft through white water, then **the eddies**: three logs turned to and fro, each a hop from the
   next only for a moment, so that he waits and goes. Anyone who falls in, or plays on Lugnt, is offered a birch leaf.
2. The bridge in Bredbyn: Pappa on the bridge lowers a rope (his scarf) to lift Elof past the rapids.
3. A beaver's lodge and its gnawed stumps; an otter slipping past.
4. The wide lake of Anundsjösjön under the storm; the owl comes back for the widest stretch.
5. Flashes show the little one ahead, always further down the river.
6. At the end the family's car stops on the road by the river. Pappa: "Älven rinner ända till Billsta." Mamma:
   "Hoppa in, Elof! Vi kör dit med bilen." Elof: "Mormor och morfar kan hjälpa oss leta!" Three mil, by car.

### Kapitel 7: Billsta (mormor and morfar's house by the road, near the forest)

The family arrive by car after three mil. Mormor and morfar's house stands by the road near the forest, not by the
water; behind it the forest climbs Billaberget, which rises above Billstasundet, where Moälven runs into
Själevadsfjärden.

1. **The road:** the car stops, its headlights in the rain; the lit window of the white house; the mailbox.
2. **Morfar** lays his long ladder across the flooded ditch by the road.
3. **Mormor and morfar's place:** the gravel drive, the lawn, birches, a woodshed and its stack of firewood, a
   rowing boat on trestles for the winter. **Mormor** lights the way with her lantern and opens the barn.
4. **The red barn** with its rusty roof: up the planks, through the hay loft and along the roof in the gusts.
5. **The forest behind the house:** a brook on stones, then **the lever**: Klonk jumps on the seesaw and it hardly stirs. Elof
   goes round the stone and pushes it back towards his own end, as Pappa sits near the middle, so that Klonk has the
   long arm and flings him over the deep brook. Then
   **Billaberget's boulders**, its granite face and October hazelnuts.
6. From the brow of Billaberget, a flash: both trägubbar far below on a stone in the narrow. Mormor: "Kom, vi går
   ner till sundet."

### Finalen: Stormens öga (in the narrow at Billsta, Själevadsfjärden beyond)

1. On a jetty below Billaberget (not mormor and morfar's: their house is up by the road) the wind has knocked down the family's
   lamps and they have gone out. They call for him over the water and cannot hear his voice at their feet; mormor points out
   the lamps. He lights them
   one by one, and each of them feels that he is near (Moa: "Det är Elof. Jag vet att det är Elof."). The row of light
   goes out over the water, and the owl comes to it and flies Elof out over the waves. Far down the lake, Själevad's
   white church stands in the flashes.
2. **The storm's eye:** the wind drops, the clouds part, stars and the moon. On the stone the old trägubbe holds
   the little one. They are cold and still, and then they see him.
3. **The golden sweet:** only after the meeting does the old one reveal the geléhallon in gold paper it saved for him.
   Elof recognises the glitter and remembers that this magic makes him big. *Smaka*: he grows,
   with both figures and the little one's returned cap carried in his hands through the walk home.
4. The family's lamps, and mormor's lantern, on the shore. Morfar: "Vi följer med hem och äter frukost!" They all
   drive home, and mormor and morfar stay for the Sunday breakfast.

### Epilog: Morgonen efter

1. Sunday morning at home, sun, leaves on the floor; mormor and morfar came home with them for breakfast. Elof
   puts both figures back on the shelf.
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
| Kicking the football into the flooded goalmouth, where it floats | a *push* mover with its own word, "Sparka" |
| Footballs bowled across the pitch by the wind | rollers, drawn as footballs |
| Bertil's free kick: riding the ball into the far goal | a *call* spot, a held beat and a ride |
| The goal's net up to the crossbar; the corner flag; the dripping benches | climbs, ledges, decor, drips |
| The playground's swings and slide; the volleyball net; the diving tower | hooks, climbs, bouncers, ledges |
| Down the river on bark and logs; Pappa's scarf from the bridge | rides, cycle movers, a call and a climb |
| Morfar's ladder across the ditch; mormor's lantern and the barn door | call spots, held beats, ledges and movers |
| Klonk's seesaw over the forest brook: too light, until Elof moves the stone | a *call* spot, a held beat, Klonk's perch on the high end, a *push* mover from the far side, and a ride |
| Moa's map of the whole journey | src/content/aventyr2/map.ts |

The audit of 4 November (`docs/aventyr-2-audit.md`) tightened the story's thread and gameplay; what it changed is
recorded there.

## As built (4 November 2026)

The worlds were authored from this design and keep its beats, with these details settled in play:

- **Stormkvällen:** before the goodnight, Pappa asks for his flashlight: take it from the hall, give it to him
  ("Ge till Pappa"). The lamp is what he freezes Klonk with in Stormskogen.
- **Stormgården:** two runs of gutter drops with a dry place between; six upturned flower pots in the gusts, one of
  which Klonk is blown into; a watering can beside the barrel leads back up to the tap; the trampoline is the only
  way up the playhouse wall to its lookout. The trail itself climbs the playhouse's front steps. The playhouse and
  the garden's birches stand behind (Äventyr 1's home landmarks only load in its own garden).
- **Stormskogen:** no rolling cones (the descent stays gentle); falling cones where the spruces drip; the owl's
  flight crosses a 10.5 EL windthrow; Klonk lies frozen across the gap as a plank, and stays for good once laid, so
  there is always a way back; the old trägubbe is seen in a flash going down the hill.
- **Byn i stormen:** the awning's striped flap is an optional bounce to the trestle stands; a 27 EL leaf ride down
  the gutter; five grate bars; four stone steps up the wall to Moa's umbrella. It now ends on the road to Olympia.
- **Olympia** (goal at 179 EL, 93 trail candies): down the steps from the street and over the high fence by the
  ball-stop net; footballs bowled across the small pitch from behind; *Bollen i målet*, the big ball fetched from its table
  and kicked four times ("Sparka") into the flooded goalmouth, where it floats as a stepping stone ("Mål! Fast det var jag som gick in!");
  a side way up the goal's net and along its white crossbar; the corner flag and the dripping benches; Bertil's
  free kick over the centre circle, which is a lake, into the far goal; five biathlon targets turned white with
  pine cones (optional); the dark floodlit trail, where the strongest gust takes the little one north.
- **Flärken** (reworked from "Sjön" into Flärkenbadet; goal at 188 EL, 111 trail candies): the playground's swings
  as lace rings and the slide; the picnic table, dry under its top; the torn volleyball net as a bounce up to the
  changing rooms' roofs, and a banging door; wet stones in the shallows with a reed up the high one; seven floating
  reed mats; six jetty posts against the waves; Mamma's SUP held against the broken jetty; up the diving tower to
  the lookout; the bark pushed three times into the last gap ("Bark flyter, precis som Klonk!"). The outlet takes
  both figures down the river: "Trä flyter!"
- **Älven** (goal at 186 EL, 92 candies): a little raft and a birch leaf down the current; stones and bobbing logs; the rapids
  under the bridge in Bredbyn, where Pappa lowers his scarf and lifts Elof over (the scarf is drawn from the
  bridge to his hands for the whole lift); the beaver's gnawed stumps and lodge, an otter; the owl from Stormskogen
  over the lake; Moälven widening; at the end the family's car on the road by the river, its headlights on, to
  drive the three mil to Billsta.
- **Billsta** (rebuilt after Olov's correction: the house is by the road near the forest, three mil from Bredbyn by
  car; goal at 194.6 EL, 113 trail candies, 12 side candies, 9 checkpoints): out of the family's car on the road
  ("Framme i Billsta, hos mormor och morfar!"), the lit window ahead and the spruces across the road; morfar lays his
  long ladder across the flooded ditch ("Gå på stegen, lilla vän"); the gravel drive, the rowing boat on its
  trestles and the woodshed's stack; mormor with her lantern opens the red barn; through the dark hay loft, over a
  bale and a hatch, and along the barn's long roof in the gusts, sheltering behind its ventilation hoods; into the
  forest behind the house: a brook crossed on stones, and where it runs deep, **Klonk's seesaw**: a dry spruce lies
  over a stone, "Ropa på Klonk", it hardly stirs, Elof pushes the stone back towards his own end, and Klonk's long arm
  flings him over the brook up onto Billaberget's bank ("Tack, Klonk! Du är min bästa vän."); then its boulders, a crack, rock shelves with
  hazelnuts against its granite face, and the slope in the gusts behind the boulders; at the brow a flash shows both
  figures far below on a stone in the narrow, the owl is heard, and mormor: "Kom, vi går ner till sundet."
- **Stormens öga** now lies in the narrow at Billsta, below Billaberget's granite and spruces, with Själevad's
  church far down the lake; mormor and morfar's house is not on the shore. Mormor and morfar come down with
  everyone and welcome them ("Hemma hos oss finns det varm choklad."), and come to breakfast in Morgonen efter.

The audit after version 2 also fixed the picture in several places: the `iron` surface (a street drain's grate)
had been used for Olympia's fence and Stormgården's watering can, and the ground's picture dug a drain's well
round each, which stood a dark wall in front of the camera over most of Olympia; a test now keeps `iron` to the
village. The biathlon range's wooden mat had the deck's front and is now paving. The bark is pale and rounded, the
crossbar is the goal's white bar, the targets are black discs on white plates, the gusts' lee on Billaberget is
faceted granite and on the barn roof red ventilation hoods, and the narrow's water is drawn past the eaves.

## Technical shape

- Äventyr 2 is its own **chapter pack**, a JavaScript chunk loaded only when it is needed: when the page is asked
  for one of its chapters, or when the save shows Äventyr 1 finished. The boot JavaScript stays under the plan's
  450 KB (gate 2); the pack has a gate of its own (`scripts/size-gate.mjs`).
- `src/content/aventyr2/` holds its chapters, its Swedish words (merged into `sv` when it loads) and its pictures
  (storm rain, lightning, the figures, the pumpkin, the owl, the boot and the umbrella), registered into the
  renderer's small extension points.
- The release boundary is unchanged: `RELEASED_CHAPTER` decides, and `?dev` shows unreleased work.
- The pictures a chapter asks of the pack are in its `storm` field (`src/sim/types.ts`): rain, lightning, the calm,
  flybys, glows, buildings (23 kinds, `src/content/aventyr2/buildings.ts`, with `turn` and `flip`), ropes, lakes,
  what the drips, the gusts' shelters (one for all, or one per gust), the rollers and the bouncers are, the goal's
  white bar, and the frozen-Klonk ledge. None of it is ground: the simulation never reads it.
