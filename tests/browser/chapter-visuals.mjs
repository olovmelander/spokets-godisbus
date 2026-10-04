// Deterministic public scenery review. Uses the real renderer and simulation without private likeness assets.
import assert from "node:assert/strict";
import { mkdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";
const root = fileURLToPath(new URL("../../", import.meta.url));
const shots = join(
  root,
  "docs/shots/_work",
  process.env.VISUAL_SHOTS ?? "chapter-visuals",
);
mkdirSync(shots, { recursive: true });
const virtual = "\0chapter-visual-fixture";
const server = await createServer({
  root,
  optimizeDeps: {
    include: ["three/examples/jsm/utils/BufferGeometryUtils.js"],
  },
  server: {
    host: "127.0.0.1",
    port: 0,
    fs: { allow: [root, realpathSync(join(root, "node_modules"))] },
  },
  plugins: [
    {
      name: "chapter-visual-fixture",
      resolveId(id) {
        if (id === "/chapter-visual-fixture.js") return virtual;
      },
      load(id) {
        if (id !== virtual) return;
        return `
    import { Scene } from 'three';
    export { createView } from ${JSON.stringify(join(root, "src/render/view.ts"))};
    export { PLACES } from ${JSON.stringify(join(root, "src/render/dressing.ts"))};
    export { Sim } from ${JSON.stringify(join(root, "src/sim/sim.ts"))};
    export { COURSES } from ${JSON.stringify(join(root, "src/content/chapters/index.ts"))};
    let scene; const before = Scene.prototype.onBeforeRender;
    Scene.prototype.onBeforeRender = function (...args) { if (this.getObjectByName('chase-ghost')) scene = this; before.apply(this, args); };
    export const renderedScene = () => scene;
  `;
      },
    },
  ],
});
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({
  args: [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const samples = [
  ["garden", 186, "plane"],
  ["granskog", 166, "cap"],
  ["garden", 76],
  ["granskog", 48],
  ["myren", 38],
  ["berget", 55],
  ["norrsken", 19],
  ["byn", 6],
  ["byn", 65],
];
const layouts = process.env.VISUAL_ALL
  ? [
      [390, 844],
      [844, 390],
      [780, 360],
      [1180, 820],
      [1440, 900],
    ]
  : [[844, 390]];
let checks = 0;
try {
  for (const [width, height] of layouts)
    for (const tier of ["low", "high"])
      for (const [course, x, rideId] of samples) {
        const label = `${course}-${x}-${width}x${height}-${tier}`;
        if (process.env.VISUAL_CASE && !process.env.VISUAL_CASE.split(",").some((part) => label.includes(part)))
          continue;
        const page = await browser.newPage({
          viewport: { width, height },
          deviceScaleFactor: 1,
        });
        const errors = [];
        page.on("pageerror", (e) => errors.push(String(e)));
        page.on("console", (m) => {
          if (m.type() === "error") errors.push(m.text());
        });
        await page.route("**/visual-probe", (r) =>
          r.fulfill({
            contentType: "text/html",
            body: '<script type="module" src="/spokets-godisbus/@vite/client"></script><body style="margin:0"><canvas id="game" style="width:100vw;height:100vh;display:block"></canvas></body>',
          }),
        );
        await page.goto(`${origin}/spokets-godisbus/visual-probe`);
        const before = await page.evaluate(
          async ({ course, x, tier, rideId }) => {
            const f = await import(
              "/spokets-godisbus/chapter-visual-fixture.js"
            );
            const original = f.COURSES[course];
            // Existing HDR film grain intentionally changes per draw; exclude it to isolate scenery pause.
            f.PLACES[original.place].grade.grain = 0;
            const ground = original.ground;
            let y = ground[ground.length - 1].y;
            for (let i = 0; i < ground.length - 1; i++) {
              const a = ground[i],
                b = ground[i + 1];
              if (a.x !== b.x && x >= a.x && x <= b.x) {
                y = a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
                break;
              }
            }
            const chapter = { ...original, spawn: { x, y: y + 0.02 } };
            const sim = new f.Sim(chapter),
              view = f.createView(
                document.getElementById("game"),
                chapter,
                tier,
                true,
              );
            await view.ready;
            if (rideId) {
              const ride = chapter.rides.find((r) => r.id === rideId),
                t = 0.5;
              const pose = {
                ...sim.curr,
                mode: "ride",
                t,
                x: ride.from.x + (ride.to.x - ride.from.x) * 0.5,
                y: ride.from.y + (ride.to.y - ride.from.y) * 0.5 + ride.rise,
                vx: 1,
                vy: 0,
                grounded: false,
              };
              sim.curr = pose;
              sim.prev = { ...pose };
            }
            const draw = (dt = 0) =>
              view.render({
                prev: sim.prev,
                curr: sim.curr,
                alpha: 1,
                dt,
                atGoal: false,
                collected: sim.collected,
                checkpoint: sim.checkpoint,
                movers: sim.movers,
                drips: sim.drips,
                flags: sim.flags,
                ghost: sim.ghost,
                rollers: sim.rollers,
                tussocks: sim.tussocks,
                gusts: sim.gusts,
                help: sim.help,
                berries: sim.berries,
              });
            for (let i = 0; i < 4; i++) draw();
            // Ride fixtures start above terrain: settle the real follow camera at the staged craft.
            if (rideId) for (let i = 0; i < 10; i++) draw(0.3);
            const state = JSON.stringify(sim.curr);
            const scene = f.renderedScene();
            const crowns = scene.getObjectByName("tree-crowns");
            if (!crowns || !crowns.isInstancedMesh || crowns.count < 1)
              throw new Error("missing chapter trees");
            if (rideId) {
              const craft = scene.getObjectByName(
                rideId === "cap" ? "bertil-cap-boat" : "moa-paper-plane",
              );
              if (
                !craft ||
                Array.isArray(craft.material) ||
                !craft.material.vertexColors
              )
                throw new Error("craft must have one painted material");
            }
            window.probe = { sim, view, draw, scene, state };
            return view.info();
          },
          { course, x, tier, rideId },
        );
        await page.screenshot({ path: join(shots, `${label}.png`) });
        const result = await page.evaluate(async () => {
          const p = window.probe;
          for (let i = 0; i < 4; i++) p.draw(0.3);
          const after = p.view.info();
          const picture = async () => {
            p.draw(0);
            const blob = await p.view.capture();
            return Array.from(new Uint8Array(await blob.arrayBuffer()));
          };
          const first = await picture(),
            second = await picture();
          return {
            after,
            state: JSON.stringify(p.sim.curr),
            beforeState: p.state,
            paused:
              first.length === second.length &&
              first.every((v, i) => v === second[i]),
          };
        });
        assert.ok(
          before.drawCalls <= 120 && result.after.drawCalls <= 120,
          `${label}: draw budget ${before.drawCalls}/${result.after.drawCalls}`,
        );
        assert.equal(
          before.programs,
          result.after.programs,
          `${label}: no new shaders during animation`,
        );
        assert.equal(
          result.state,
          result.beforeState,
          `${label}: scenery never changes gameplay`,
        );
        assert.ok(result.paused, `${label}: paused scenery pixels are stable`);
        assert.deepEqual(errors, [], `${label}: WebGL errors`);
        console.log(
          `${label}: ${before.drawCalls} draws, ${before.triangles} triangles, stable shaders`,
        );
        checks += 5;
        await page.close();
      }
  console.log(`chapter visuals: ${checks} checks passed; ${shots}`);
} finally {
  await browser.close();
  await server.close();
}
