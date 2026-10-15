import { useEffect } from "react";
import { albums } from "./albums";
import { FLIP_MS } from "./components/SplitFlap";
import { useGame } from "./store";

// ---- Tunable timings ----
/** Pause after the winning move before the board starts flipping. */
export const START_BEAT_MS = 350;
/** Ripple step: each cell waits (row + col) × this, so the flips sweep diagonally from top-left. */
export const RIPPLE_MS = 40;
/** How long the reveal (one big cover per box) holds before flipping back. */
export const HOLD_MS = 2500;
/** Pause after the board has flipped back, before the summary appears. */
export const END_BEAT_MS = 400;

/** One full diagonal sweep: the last cell (row 8 + col 8) starts at 16 steps, then flips. */
export const SWEEP_MS = 16 * RIPPLE_MS + FLIP_MS;

/**
 * Win sequence phases. `armed`: cells swap to flaps showing the solved board (no visual change).
 * `reveal`: flaps sweep to the box covers and hold. `back`: sweep back. `done`: show the summary.
 */
export type WinPhase = "armed" | "reveal" | "back" | "done";

export const rippleDelay = (i: number) => (Math.floor(i / 9) + (i % 9)) * RIPPLE_MS;

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
      setPhase("reveal");
      await sleep(SWEEP_MS + HOLD_MS);
      if (skipped()) return;
      setPhase("back");
      await sleep(SWEEP_MS + END_BEAT_MS);
      if (skipped()) return;
      setPhase("done");
    })();

    return () => {
      cancelled = true;
    };
  }, [won]);
}
