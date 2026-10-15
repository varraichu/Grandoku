// Generates puzzles off the main thread. Each message (a difficulty) asks for one puzzle, which is
// posted back with its solution. Generation can take seconds (Expert up to a minute), so it must
// never run where it would freeze the page.
import { generate, solve, type Difficulty } from "sudoku-core";

self.onmessage = (e: MessageEvent<Difficulty>) => {
  const puzzle = generate(e.data);
  const result = solve(puzzle);
  if (!result.solved || !result.board) throw new Error(result.error ?? "Generated puzzle has no solution");
  self.postMessage({ puzzle, solution: result.board });
};
