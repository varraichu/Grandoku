import { useEffect } from "react";
import { albums } from "./albums";
import {
  CYCLE_FLIP_MS,
  DEFAULT_TIMING,
  FLIP_MS,
  landsAfterMs,
  type FlapFace,
  type FlapTiming,
} from "./components/SplitFlap";
import { randomBoard, useGame } from "./store";

// ---- Tunable timings ----
/** Pause after the winning move before the board starts flipping. */
export const START_BEAT_MS = 350;
/** Ripple step: each cell waits (row + col) × this, so the flips sweep diagonally from top-left. */
export const RIPPLE_MS = 85;
/** Up to this much extra, fixed per cell: real flap boards are never perfectly in step. */
export const JITTER_MS = 25;
/** Covers each cell flips through (like letters on a departures board) before landing on its slice
 *  of the reveal. The same for every cell, so the image lands along the diagonal the flips started on. */
export const CYCLE_FLIPS = 4;
/** Pause between the last reveal cell landing and the top-left cell flipping back. 0 = the board
 *  turns straight back the moment the full image completes. */
export const HOLD_MS = 0;
/** Pause after the board has flipped back, before the summary appears. */
export const END_BEAT_MS = 400;

/** Starting a board (new game, restart, first Start): a slower, more deliberate flip than the win's. */
export const INTRO_FLIP_MS = 750;
export const INTRO_TIMING: FlapTiming = { ...DEFAULT_TIMING, flipMs: INTRO_FLIP_MS };

/** One full diagonal sweep of board-start flips: the last cell starts at 16 steps (+ jitter), then flips. */
export const SWEEP_MS = 16 * RIPPLE_MS + JITTER_MS + INTRO_FLIP_MS;

/**
 * Win sequence phases. `armed`: cells swap to flaps showing the solved board (no visual change).
 * `reveal`: flaps sweep to the box covers and hold. `back`: sweep back. `done`: show the summary.
 */
export type WinPhase = "armed" | "reveal" | "back" | "done";

// A fixed pseudo-random 0-1 per cell (so both sweeps use the same unevenness).
const jitter = (i: number) => ((i * 7919) % 97) / 96;

export const rippleDelay = (i: number) => (Math.floor(i / 9) + (i % 9)) * RIPPLE_MS + Math.round(jitter(i) * JITTER_MS);

/** Small seeded PRNG (mulberry32): the same cell gets the same sequence across re-renders. */
const random = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** New per win, so every reveal rattles differently. */
let winSeed = 1;

/**
 * The covers cell i rattles through: passes over all nine albums, each pass freshly shuffled per
 * cell (never the same cover twice in a row), so neighbouring cells show different covers.
 */
export const cycleFaces = (i: number): FlapFace[] => {
  const rand = random(winSeed * 131 + i);
  const order: number[] = [];
  while (order.length < CYCLE_FLIPS) {
    const pass = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    for (let k = 8; k > 0; k--) {
      const j = Math.floor(rand() * (k + 1));
      [pass[k], pass[j]] = [pass[j], pass[k]];
    }
    if (pass[0] === order[order.length - 1]) [pass[0], pass[1]] = [pass[1], pass[0]];
    order.push(...pass);
  }
  return order.slice(0, CYCLE_FLIPS).map((a) => ({ src: albums[a].cover }));
};

const LAST_CELL = 80;
/** Rough sweep lengths, only used as safety timeouts (the phases advance when the cells report in). */
const REVEAL_LANDS_MS = rippleDelay(LAST_CELL) + CYCLE_FLIPS * (CYCLE_FLIP_MS + 20) + landsAfterMs();
const BACK_ENDS_MS = rippleDelay(LAST_CELL) + FLIP_MS;
const SAFETY_MS = 1500;

/**
 * Cells report when their flap lands (reveal) or finishes (flip back). Each phase waits for every
 * cell, so frame timing on slow devices can never cut the last cells off mid-flip.
 */
let reports = new Set<number>();
let expected = 0;
let onAllReported: (() => void) | null = null;

export const reportFlap = (i: number) => {
  reports.add(i);
  if (reports.size >= expected) onAllReported?.();
};

const allCellsReport = (count: number, timeoutMs: number) =>
  new Promise<void>((resolve) => {
    reports = new Set();
    expected = count;
    const done = () => {
      onAllReported = null;
      window.clearTimeout(timer);
      resolve();
    };
    onAllReported = done;
    const timer = window.setTimeout(done, timeoutMs);
  });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Load and decode every large cover so no flap ever lands on a blank tile. */
const preloadLargeCovers = () =>
  Promise.all(
    albums.map((a) => {
      const img = new Image();
      img.src = a.coverLarge;
      return img.decode().catch(() => {});
    }),
  );

/** Runs the split-flap reveal when the game is won. Tapping the board skips to `done`. */
export function useWinSequence() {
  const won = useGame((s) => s.won);

  useEffect(() => {
    if (!won) return;
    let cancelled = false;
    const setPhase = (winPhase: WinPhase) => !cancelled && useGame.setState({ winPhase });
    const skipped = () => cancelled || useGame.getState().winPhase === "done";

    (async () => {
      await preloadLargeCovers();
      await sleep(START_BEAT_MS);
      if (skipped()) return;
      setPhase("armed");
      await sleep(50); // let the flaps mount on the solved faces before they flip
      if (skipped()) return;
      // Turn back as the image's last cell lands, so the board never pauses.
      winSeed = Math.floor(Math.random() * 1e9);
      const landed = allCellsReport(81, REVEAL_LANDS_MS + SAFETY_MS);
      setPhase("reveal");
      await landed;
      await sleep(HOLD_MS);
      if (skipped()) return;
      const finished = allCellsReport(81, BACK_ENDS_MS + SAFETY_MS);
      setPhase("back");
      await finished;
      await sleep(END_BEAT_MS);
      if (skipped()) return;
      setPhase("done");
    })();

    return () => {
      cancelled = true;
    };
  }, [won]);
}

/** New game / restart: flip the board from the previous covers into the new puzzle. Tapping skips. */
export function useBoardIntro() {
  const intro = useGame((s) => s.intro);

  useEffect(() => {
    if (!intro) return;
    const still = () => useGame.getState().intro === intro;
    let t: number;
    if (intro.phase === "armed") {
      // Mount the flaps on the old faces first, then flip them to the new ones.
      t = window.setTimeout(() => still() && useGame.setState({ intro: { ...intro, phase: "in" } }), 50);
    } else {
      t = window.setTimeout(() => still() && useGame.setState({ intro: null }), SWEEP_MS);
    }
    return () => window.clearTimeout(t);
  }, [intro]);
}

/** While a puzzle is generating, the board re-deals random covers this often (each cell flips once per deal). */
export const SHUFFLE_TICK_MS = 750;
/** Each cell's fixed offset within a deal (0-250ms), so a deal ripples unevenly like a real board. */
export const shuffleDelay = (i: number) => ((i * 37) % 11) * 25;

/** Shuffles the board while a new game's puzzle is being generated in the background. */
export function useShuffle() {
  const loading = useGame((s) => s.loading);

  useEffect(() => {
    if (!loading) return;
    const t = window.setInterval(() => {
      if (useGame.getState().loading) useGame.setState({ shuffle: randomBoard() });
    }, SHUFFLE_TICK_MS);
    return () => window.clearInterval(t);
  }, [loading]);
}
