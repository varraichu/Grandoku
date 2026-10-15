import { useEffect } from "react";
import { albums } from "./albums";
import { CYCLE_FLIP_MS, FLIP_MS, landsAfterMs, type FlapFace } from "./components/SplitFlap";
import { useGame } from "./store";

// ---- Tunable timings ----
/** Pause after the winning move before the board starts flipping. */
export const START_BEAT_MS = 350;
/** Ripple step: each cell waits (row + col) × this, so the flips sweep diagonally from top-left. */
export const RIPPLE_MS = 85;
/** Up to this much extra, fixed per cell: real flap boards are never perfectly in step. */
export const JITTER_MS = 25;
/** Covers each cell rattles through (quickly, like letters on a departures board) before landing on
 *  its slice of the reveal. More than nine repeats the albums in a reshuffled order. */
export const CYCLE_COUNT = 18;
/** Pause between the last reveal cell landing and the top-left cell flipping back. 0 = the board
 *  turns straight back the moment the full image completes. */
export const HOLD_MS = 0;
/** Pause after the board has flipped back, before the summary appears. */
export const END_BEAT_MS = 400;

/** One full diagonal sweep of single flips (new-board intro): the last cell starts at 16 steps (+ jitter), then flips. */
export const SWEEP_MS = 16 * RIPPLE_MS + JITTER_MS + FLIP_MS;

/**
 * Win sequence phases. `armed`: cells swap to flaps showing the solved board (no visual change).
 * `reveal`: flaps sweep to the box covers and hold. `back`: sweep back. `done`: show the summary.
 */
export type WinPhase = "armed" | "reveal" | "back" | "done";

// A fixed pseudo-random 0-1 per cell (so both sweeps use the same unevenness).
const jitter = (i: number) => ((i * 7919) % 97) / 96;

export const rippleDelay = (i: number) => (Math.floor(i / 9) + (i % 9)) * RIPPLE_MS + Math.round(jitter(i) * JITTER_MS);

/**
 * The covers a cell rattles through. Each pass over the nine albums uses a different stride
 * (coprime with 9, so every album appears once per pass) and each cell starts at a different
 * album, so repeats don't read as a loop and neighbours differ.
 */
export const cycleFaces = (i: number): FlapFace[] => {
  const strides = [1, 4, 2, 7, 5, 8];
  const order: number[] = [];
  for (let k = 0; k < CYCLE_COUNT; k++) {
    const pass = Math.floor(k / 9);
    let a = (i * 4 + pass * 5 + (k % 9) * strides[pass % strides.length]) % 9;
    if (a === order[order.length - 1]) a = (a + 1) % 9; // never the same cover twice in a row
    order.push(a);
  }
  return order.map((a) => ({ src: albums[a].coverBlur }));
};

const LAST_CELL = 80;
/** Rough sweep lengths, only used as safety timeouts (the phases advance when the cells report in). */
const REVEAL_LANDS_MS = rippleDelay(LAST_CELL) + CYCLE_COUNT * (CYCLE_FLIP_MS + 20) + landsAfterMs();
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

/** Load and decode the large and blurred covers so no flap ever shows a blank tile. */
const preloadLargeCovers = () =>
  Promise.all(
    albums.flatMap((a) =>
      [a.coverLarge, a.coverBlur].map((src) => {
        const img = new Image();
        img.src = src;
        return img.decode().catch(() => {});
      }),
    ),
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
