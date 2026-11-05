// The cut list: which part of a recorded take each scene shows, and its caption.
// Times are seconds; `at` is a moment marked by scripts/record.mjs, `offset` shifts from it.
export type Mark = "flipIn" | "play" | "hints" | "notes" | "peek" | "mistake" | "tattoos" | "win" | "summary" | "export";

export type Effect = "none" | "ringZoom" | "tattoos" | "result";

export interface Scene {
  at: Mark;
  offset: number;
  len: number;
  caption: string;
  effect?: Effect;
}

export const INTRO_S = 1.4;
export const OUTRO_S = 1.8;

export const SCENES: Scene[] = [
  { at: "flipIn", offset: 0.05, len: 1.6, caption: "Sudoku, but the numbers are Ariana's albums" },
  { at: "play", offset: 0, len: 1.3, caption: "Sudoku, but the numbers are Ariana's albums" },
  { at: "hints", offset: 0.35, len: 2.3, caption: "Hints light up a column, row or box" },
  { at: "notes", offset: -0.1, len: 2.1, caption: "Notes mode flips everything upside down, a Sweetener nod" },
  { at: "peek", offset: 0.05, len: 1.0, caption: "Notes mode flips everything upside down, a Sweetener nod" },
  { at: "mistake", offset: 0.05, len: 2.2, caption: "7 mistakes and you're out.\n7 rings", effect: "ringZoom" },
  { at: "tattoos", offset: 0.1, len: 2.1, caption: "Her tattoos are hidden in the background", effect: "tattoos" },
  { at: "win", offset: -0.1, len: 2.7, caption: "Solve it and the whole board flips" },
  { at: "summary", offset: 0.15, len: 1.4, caption: "Save your result to share" },
  { at: "export", offset: 0.3, len: 1.7, caption: "Save your result to share", effect: "result" },
];

export const totalSeconds = () => INTRO_S + SCENES.reduce((t, s) => t + s.len, 0) + OUTRO_S;
