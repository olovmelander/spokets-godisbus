// Scout: the robot plays each chapter (simulation only) and logs a timeline of what happens when.
import { mkdirSync, writeFileSync } from 'node:fs';
import { start, WORK } from './harness.mjs';

const ids = (process.argv[2] ?? 'prolog,garden,granskog,myren,berget,norrsken,epilog,byn,stormkvall,stormgard,stormskog,stormbyn,olympia,flarken,alven,billsta,stormoga,morgonen').split(',');
const h = await start({ width: 320, height: 180 });
const timeline = {};
try {
  await Promise.all(ids.map(async (id) => {
    const { page, errors } = await h.page({ w: 320, h: 180 });
    timeline[id] = await page.evaluate(async (id) => {
      const f = window.f;
      if (!f.COURSES[id]) await f.loadAdventure2();
      const chapter = f.COURSES[id];
      if (!chapter) return { missing: true, keys: Object.keys(f.COURSES) };
      const game = new f.Game(chapter, {}, {});
      const fps = 30, dt = 1 / fps;
      const events = [];
      let flags = new Set(game.sim.flags), said = 0, mode = '', verb = '', scene = '', ahead = false, offered = false;
      let frames = 0;
      while (!game.sim.flags.has('goal') && frames < fps * 400) {
        const d = f.decide(game, chapter);
        game.frame(dt, { x: d.x, y: d.y, hopHeld: true }, { hop: d.ahead && !ahead, act: d.offered && !offered, helper: false });
        ahead = d.ahead; offered = d.offered; frames++;
        const t = +(frames * dt).toFixed(2), p = game.sim.curr;
        const at = `x=${p.x.toFixed(1)} y=${p.y.toFixed(1)}`;
        for (const fl of game.sim.flags) if (!flags.has(fl)) events.push(`${t} flag ${fl} ${at}`);
        flags = new Set(game.sim.flags);
        while (said < game.sim.said.length) events.push(`${t} said ${JSON.stringify(game.sim.said[said++])} ${at}`);
        if (p.mode !== mode) { events.push(`${t} mode ${p.mode} ${at}`); mode = p.mode; }
        if ((p.verb ?? '') !== verb) { events.push(`${t} verb ${p.verb} ${at}`); verb = p.verb ?? ''; }
        const s = game.sim.sceneFrame?.id ?? '';
        if (s !== scene) { events.push(`${t} scene ${s || '-'} ${at}`); scene = s; }
        if (frames % (fps * 5) === 0) events.push(`${t} pos ${at} candy=${game.sim.candyCount}`);
      }
      return { seconds: frames * dt, goal: game.sim.flags.has('goal'), spawn: chapter.spawn, events };
    }, id).catch(e => ({ error: String(e) }));
    if (errors.length) timeline[id].errors = errors.slice(0, 5);
    console.log(id, timeline[id].seconds, timeline[id].goal, timeline[id].error ?? '');
    await page.close();
  }));
} finally {
  await h.close();
}
mkdirSync(WORK, { recursive: true });
writeFileSync(new URL('timeline.json', WORK), JSON.stringify(timeline, null, 1));
