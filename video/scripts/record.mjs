// Records one scripted take of the game per format, plus timestamps for each moment.
// Needs the game's dev server (on the autoplay-based branch) running: `npx vite --port 5199`.
// Usage: node scripts/record.mjs [portrait|landscape]   (both if omitted)
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const URL = "http://localhost:5199/";
const OUT = path.resolve("public/takes");
const FPS = 30;

const FORMATS = {
  // Rendered at full size (screencast frames come out at CSS pixels, so device scale wouldn't help).
  portrait: { viewport: { width: 1080, height: 1920 }, dpr: 1 },
  landscape: { viewport: { width: 1920, height: 1080 }, dpr: 1 },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function record(name) {
  const { viewport, dpr } = FORMATS[name];
  const size = { w: viewport.width * dpr, h: viewport.height * dpr };
  const frameDir = path.join(OUT, `${name}-frames`);
  fs.rmSync(frameDir, { recursive: true, force: true });
  fs.mkdirSync(frameDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport, deviceScaleFactor: dpr, acceptDownloads: true });
  await page.addInitScript(() => localStorage.setItem("grandoku:help-seen", "1"));
  await page.goto(URL);
  await page.addStyleTag({ content: "#autoplay-root{display:none!important}" });
  await page.evaluate(async () => {
    const { useGame } = await import("/src/store.ts");
    window.__g = useGame;
  });
  await page.waitForTimeout(1200); // fonts, covers, tattoos

  // Frame capture straight from the compositor (sharper than Playwright's built-in recorder).
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
    const file = path.join(frameDir, `${String(frames.length).padStart(5, "0")}.jpg`);
    fs.writeFileSync(file, Buffer.from(data, "base64"));
    frames.push({ file, t: metadata.timestamp });
    await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 95, maxWidth: size.w, maxHeight: size.h });
  const t0 = Date.now() / 1000;
  const marks = {};
  const mark = (key) => (marks[key] = Date.now() / 1000 - t0);

  const g = (fn, arg) => page.evaluate(fn, arg);
  // Click like a tap: no lingering keyboard-focus outline afterwards.
  const tap = async (role, name) => {
    await page.getByRole(role, { name }).click();
    await g(() => document.activeElement?.blur());
  };
  const state = () => g(() => {
    const s = window.__g.getState();
    return { puzzle: s.puzzle, board: s.board, solution: s.solution };
  });
  const select = (k) => g((k) => window.__g.setState({ selectedCell: k }), k);
  const emptyCells = async () => {
    const s = await state();
    return s.board.map((v, k) => (v === null ? k : -1)).filter((k) => k >= 0);
  };
  const placeCorrect = async (k) => {
    const s = await state();
    await select(k);
    await sleep(220);
    await page.keyboard.press(String(s.solution[k]));
  };

  // 1. New game picker → board flips in.
  await sleep(600);
  mark("picker");
  await tap("radio", "Easy");
  await sleep(350);
  await tap("button", "Start");
  mark("flipIn");
  await page.waitForFunction(() => !window.__g.getState().loading && !window.__g.getState().intro, null, { timeout: 30000 });
  await sleep(500);

  // 2. Plain play: a few correct covers along one row.
  mark("play");
  {
    const empty = await emptyCells();
    const row = Math.floor(empty[0] / 9);
    for (const k of empty.filter((k) => Math.floor(k / 9) === row).slice(0, 4)) {
      await placeCorrect(k);
      await sleep(380);
    }
  }
  await sleep(400);

  // Page-side rectangles: one element, or the bounding box of several.
  const rectOf = (sel) =>
    g((sel) => {
      const els = [...document.querySelectorAll(sel)];
      if (!els.length) return null;
      const bs = els.map((el) => el.getBoundingClientRect());
      const x = Math.min(...bs.map((b) => b.left));
      const y = Math.min(...bs.map((b) => b.top));
      return { x, y, w: Math.max(...bs.map((b) => b.right)) - x, h: Math.max(...bs.map((b) => b.bottom)) - y };
    }, sel);
  // Spotlight keyframes: from time t, the video highlights `rect` (null = no spotlight).
  const spots = [];
  const spot = async (sel) => spots.push({ t: Date.now() / 1000 - t0, rect: sel ? await rectOf(sel) : null });
  const UNIT = ".cell.is-highlighted, .cell.is-selected";
  const rects = {};

  // 3. Hints: spotlight the Hints button, then each highlighted unit, then the tray, then place.
  {
    const empty = await emptyCells();
    const k = empty[Math.floor(empty.length / 2)];
    await select(k);
    await sleep(500);
    mark("hints");
    await spot(".tile-hints");
    await sleep(700);
    await tap("button", "Hints");
    await sleep(900);
    mark("hintCol");
    await spot(UNIT);
    await sleep(1500);
    await tap("radio", "Row");
    mark("hintRow");
    await spot(UNIT);
    await sleep(1500);
    await tap("radio", "Box");
    mark("hintBox");
    await spot(UNIT);
    await sleep(1500);
    mark("hintTray");
    await spot(".tray");
    await sleep(1900);
    await spot(null);
    await page.keyboard.press(String((await state()).solution[k]));
    await sleep(700);
    await tap("button", "Hints"); // off again for the rest
    await g(() => window.__g.setState({ selectedCell: null }));
  }
  await sleep(300);

  // 4. Notes: the UI flips upside down. Pencil candidates into one cell (album-colour swatches), then peek.
  mark("notes");
  await tap("button", "Notes");
  await sleep(1400);
  {
    const s = await state();
    const empty = await emptyCells();
    const k = empty[Math.floor(empty.length / 3)];
    await select(k);
    await sleep(300);
    mark("notesType");
    rects.notesCell = await rectOf(".cell.is-selected");
    const wrong = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => d !== s.solution[k]).slice(0, 3);
    rects.noteDigits = [s.solution[k], ...wrong].sort();
    for (const d of rects.noteDigits) {
      await page.keyboard.press(String(d));
      await sleep(500);
    }
    await sleep(1000);
    mark("peek");
    await page.keyboard.down("Shift");
    await sleep(2400);
    await page.keyboard.up("Shift");
  }
  await sleep(300);
  await tap("button", "Notes");
  await sleep(900);

  // 5. Mistakes: a couple of wrong covers tick the mistake counter.
  mark("mistake");
  {
    const s = await state();
    const empty = await emptyCells();
    for (const k of empty.slice(-2)) {
      await select(k);
      await sleep(250);
      const wrong = [1, 2, 3, 4, 5, 6, 7, 8, 9].find((d) => d !== s.solution[k]);
      await page.keyboard.press(String(wrong));
      await sleep(900);
    }
  }
  await g(() => window.__g.setState({ selectedCell: null }));

  // 6. Tattoos: a quiet beat on the board so the background can be the focus.
  mark("tattoos");
  // Where things sit on screen, so the video can zoom into the ring and a tattoo.
  Object.assign(rects, await g(() => {
    const r = (el) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
    return {
      ring: r(document.querySelector(".mistakes")),
      title: r(document.querySelector(".title")),
      board: r(document.querySelector(".board")),
      tattoos: [...document.querySelectorAll(".tattoo")].map((el) => {
        const b = el.getBoundingClientRect();
        return {
          src: el.getAttribute("src"),
          cx: b.x + b.width / 2,
          cy: b.y + b.height / 2,
          w: el.offsetWidth,
          h: el.offsetHeight,
          rotate: parseFloat(el.style.getPropertyValue("--rotate")),
        };
      }),
    };
  }));
  await sleep(2800);

  // 7. Win: jump to one cell left (hidden by a cut), place it, watch the win sequence.
  await g(() => {
    const s = window.__g.getState();
    const left = s.board.map((v, k) => (v === s.solution[k] ? -1 : k)).filter((k) => k >= 0);
    const last = left[Math.floor(left.length / 2)];
    window.__g.setState({ board: s.solution.map((v, k) => (k === last ? null : v)), selectedCell: last, notesMode: false, shake: null, waves: [] });
  });
  await sleep(700);
  mark("win");
  {
    const s = await page.evaluate(() => {
      const s = window.__g.getState();
      return s.solution[s.selectedCell];
    });
    await page.keyboard.press(String(s));
  }
  await page.waitForSelector(".win-preview img", { timeout: 30000 });
  mark("summary");
  await sleep(2600);

  // 8. Export: save the result image.
  mark("export");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Save image" }).click()]);
  await download.saveAs(path.join(OUT, `${name}-result.png`));
  await sleep(1200);
  mark("end");

  await cdp.send("Page.stopScreencast");
  await browser.close();

  // Frames arrive only when the page repaints: hold each one until the next, then resample to a steady 30fps.
  const list = path.join(frameDir, "list.txt");
  const first = frames[0].t;
  const lines = frames.map((f, i) => {
    const next = frames[i + 1]?.t ?? f.t + 1 / FPS;
    return `file '${f.file}'\nduration ${(next - f.t).toFixed(4)}`;
  });
  fs.writeFileSync(list, lines.join("\n") + `\nfile '${frames.at(-1).file}'\n`);
  const video = path.join(OUT, `${name}.mp4`);
  execFileSync("npx", ["remotion", "ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list,
    "-fps_mode", "cfr", "-r", String(FPS), "-vf", `scale=${size.w}:${size.h},format=yuv420p`, "-c:v", "libx264", "-crf", "14", "-preset", "slow", video], { stdio: "inherit" });
  // Frame timestamps and marks are both epoch seconds: shift marks onto the video's clock (first frame = 0).
  const timed = Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, +(v - (first - t0)).toFixed(3)]));
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify({ fps: FPS, width: size.w, height: size.h, duration: frames.at(-1).t - first, marks: timed, rects, spots: spots.map((sp) => ({ ...sp, t: +(sp.t - (first - t0)).toFixed(3) })) }, null, 2));
  fs.rmSync(frameDir, { recursive: true, force: true });
  console.log(name, frames.length, "frames", timed);
}

for (const name of process.argv[2] ? [process.argv[2]] : Object.keys(FORMATS)) await record(name);
