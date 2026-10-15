import { generate, solve, type Difficulty } from "sudoku-core";
import type { Board } from "./sudoku";

export interface Puzzle {
  puzzle: Board;
  solution: Board;
}

/** Levels offered in the picker. Expert is off for now (it can take up to a minute to generate);
 *  sudoku-core's "master" practically never generates. */
export const LEVELS: Difficulty[] = ["easy", "medium", "hard"];

/**
 * A head start on every level: one background worker per level keeps a puzzle ready, so Start is
 * usually instant. Separate workers so a slow Expert never holds up an Easy request.
 */
const ready = new Map<Difficulty, Puzzle>();
const waiting = new Map<Difficulty, ((p: Puzzle) => void)[]>();
const workers = new Map<Difficulty, Worker>();

function workerFor(level: Difficulty): Worker | null {
  if (workers.has(level)) return workers.get(level)!;
  if (typeof Worker === "undefined") return null;
  const worker = new Worker(new URL("./puzzleWorker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (e: MessageEvent<Puzzle>) => {
    const queue = waiting.get(level);
    const resolve = queue?.shift();
    if (resolve) {
      resolve(e.data);
      worker.postMessage(level); // used straight away: start on the next one
    } else {
      ready.set(level, e.data);
    }
  };
  workers.set(level, worker);
  worker.postMessage(level);
  return worker;
}

/** Start preparing a puzzle for every level (call once on load). */
export const prefetchPuzzles = () => LEVELS.forEach(workerFor);

/** A prepared puzzle for this level, if one is waiting (the worker then starts on the next). */
export function takeReadyPuzzle(level: Difficulty): Puzzle | undefined {
  const p = ready.get(level);
  if (p) {
    ready.delete(level);
    workerFor(level)?.postMessage(level);
  }
  return p;
}

/** The next puzzle for this level: immediately if prepared, otherwise when the worker finishes. */
export function nextPuzzle(level: Difficulty): Promise<Puzzle> {
  const p = takeReadyPuzzle(level);
  if (p) return Promise.resolve(p);
  if (!workerFor(level)) {
    // No worker support: generate here (blocks, but still works).
    const puzzle = generate(level);
    return Promise.resolve({ puzzle, solution: solve(puzzle).board! });
  }
  return new Promise((resolve) => {
    waiting.set(level, [...(waiting.get(level) ?? []), resolve]);
  });
}
