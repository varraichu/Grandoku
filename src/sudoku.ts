export type Board = Array<number | null>;
export type HighlightMode = "column" | "row" | "box";

export const MODES: HighlightMode[] = ["column", "row", "box"];
export const MODE_LABELS: Record<HighlightMode, string> = {
  column: "Col",
  row: "Row",
  box: "Box",
};

export const nextMode = (mode: HighlightMode): HighlightMode =>
  MODES[(MODES.indexOf(mode) + 1) % MODES.length];

export const rowOf = (i: number) => Math.floor(i / 9);
export const colOf = (i: number) => i % 9;
export const boxOf = (i: number) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

const range9 = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export const rowCells = (r: number) => range9.map((c) => r * 9 + c);
export const colCells = (c: number) => range9.map((r) => r * 9 + c);
export const boxCells = (b: number) => {
  const r0 = Math.floor(b / 3) * 3;
  const c0 = (b % 3) * 3;
  return range9.map((k) => (r0 + Math.floor(k / 3)) * 9 + c0 + (k % 3));
};

/** All cells sharing a row, column or box with `i`, excluding `i`. */
export const peersOf = (i: number): number[] => {
  const set = new Set([...rowCells(rowOf(i)), ...colCells(colOf(i)), ...boxCells(boxOf(i))]);
  set.delete(i);
  return [...set];
};

/** Cells lit up on the board: the hint mode's unit, or with hints off the cell's row, column and box. */
export const highlightedCells = (mode: HighlightMode | null, i: number): Set<number> => {
  if (mode === null) return new Set([i, ...peersOf(i)]);
  switch (mode) {
    case "column":
      return new Set(colCells(colOf(i)));
    case "row":
      return new Set(rowCells(rowOf(i)));
    case "box":
      return new Set(boxCells(boxOf(i)));
  }
};

// Each cover's swell lasts much longer than the gap to the next, so several move at once
// and the line reads as one flowing wave rather than covers hopping in turn.
const WAVE_STEP_MS = 70; // along a row or column
const WAVE_BOX_ROW_MS = 200; // box: between its rows
const WAVE_BOX_COL_MS = 60; // box: across a row
export const WAVE_RISE_MS = 750; // one cover's swell; keep in sync with .cell.is-waving

/**
 * Cascade delays (ms) for every unit that placing at `i` just completed correctly:
 * columns run top to bottom, rows left to right, boxes row by row (each row sweeping
 * left to right). A cell crossed by two waves takes the earlier delay so it only moves
 * once. Null when nothing completed.
 */
export const completionWave = (i: number, board: Board, solution: Board): Map<number, number> | null => {
  const lineDelay = (k: number) => k * WAVE_STEP_MS;
  const boxDelay = (k: number) => Math.floor(k / 3) * WAVE_BOX_ROW_MS + (k % 3) * WAVE_BOX_COL_MS;
  const units: [number[], (k: number) => number][] = [
    [colCells(colOf(i)), lineDelay],
    [rowCells(rowOf(i)), lineDelay],
    [boxCells(boxOf(i)), boxDelay],
  ];
  const delays = new Map<number, number>();
  for (const [cells, delayAt] of units) {
    if (!cells.every((c) => board[c] !== null && board[c] === solution[c])) continue;
    cells.forEach((c, k) => delays.set(c, Math.min(delays.get(c) ?? Infinity, delayAt(k))));
  }
  return delays.size > 0 ? delays : null;
};

/** Digits whose nine cells are all correctly filled: greyed out of the tray. */
export const completedDigits = (board: Board, solution: Board): Set<number> => {
  const counts = new Array(10).fill(0);
  board.forEach((v, k) => {
    if (v !== null && v === solution[k]) counts[v]++;
  });
  const done = new Set<number>();
  for (let d = 1; d <= 9; d++) if (counts[d] === 9) done.add(d);
  return done;
};

/** Digits faded out of the tray: those already placed in the active unit. */
export const usedDigits = (mode: HighlightMode, i: number | null, board: Board): Set<number> => {
  if (i === null) return new Set();
  const cells =
    mode === "column" ? colCells(colOf(i)) : mode === "row" ? rowCells(rowOf(i)) : boxCells(boxOf(i));
  const used = new Set<number>();
  for (const c of cells) {
    const v = board[c];
    if (v !== null) used.add(v);
  }
  return used;
};
