// The cut list: which part of a recorded take each scene shows, and its caption.
// Times are seconds. A scene starts at a moment marked by scripts/record.mjs (`at` + `offset`)
// and runs for `len` seconds, or until another mark (`until` + `untilOffset`).
export type Mark =
  | "flipIn"
  | "play"
  | "hints"
  | "hintCol"
  | "hintRow"
  | "hintBox"
  | "hintTray"
  | "notes"
  | "notesType"
  | "peek"
  | "mistake"
  | "tattoos"
  | "win"
  | "summary"
  | "export";

export type Effect = "spotlight" | "cellZoomIn" | "cellZoomOut" | "ringZoom" | "tattoos" | "result";

export interface Scene {
  at: Mark;
  offset: number;
  len?: number;
  until?: Mark;
  untilOffset?: number;
  caption: string;
  effect?: Effect;
}

export const INTRO_S = 1.8;
export const OUTRO_S = 3.2;

const ALBUMS = "Sudoku, but the numbers are Ariana's albums";
const HINTS = "Hints light up a column, row or box";
const COLOURS = "Each note is an album's colour";
const SAVE = "Save your result to share";

export const SCENES: Scene[] = [
  { at: "flipIn", offset: 0.05, len: 2.2, caption: ALBUMS },
  { at: "play", offset: 0, len: 1.8, caption: ALBUMS },
  { at: "hints", offset: -0.1, until: "hintCol", caption: "Stuck? Turn on hints", effect: "spotlight" },
  { at: "hintCol", offset: 0, until: "hintTray", caption: HINTS, effect: "spotlight" },
  { at: "hintTray", offset: 0, len: 2.1, caption: "Covers already used there fade out", effect: "spotlight" },
  { at: "notes", offset: -0.3, until: "notesType", untilOffset: -0.1, caption: "Notes mode flips the board upside down" },
  { at: "notesType", offset: -0.1, until: "peek", caption: COLOURS, effect: "cellZoomIn" },
  { at: "peek", offset: 0, len: 2.6, caption: COLOURS, effect: "cellZoomOut" },
  { at: "mistake", offset: 0.05, len: 3.0, caption: "7 mistakes and it's game over", effect: "ringZoom" },
  { at: "tattoos", offset: 0.1, len: 2.8, caption: "Filled with Easter eggs", effect: "tattoos" },
  { at: "win", offset: -0.2, until: "summary", untilOffset: 0.4, caption: "Solve it and the whole board flips" },
  { at: "summary", offset: 0.4, len: 2.0, caption: SAVE },
  { at: "export", offset: 0.3, len: 2.5, caption: SAVE, effect: "result" },
];

type Marks = Record<Mark, number>;

/** Scene length in seconds for a given take (scenes that run `until` a mark depend on its timing). */
export const sceneLen = (s: Scene, marks: Marks) =>
  s.until ? marks[s.until] + (s.untilOffset ?? 0) - (marks[s.at] + s.offset) : s.len!;

export const totalSeconds = (marks: Marks) => INTRO_S + SCENES.reduce((t, s) => t + sceneLen(s, marks), 0) + OUTRO_S;
