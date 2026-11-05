// The cut list: which part of a recorded take each scene shows, and its caption.
// Times are seconds of the recorded take. A scene starts at a moment marked by scripts/record.mjs
// (`at` + `offset`) and covers `len` seconds of it, or runs until another mark (`until` + `untilOffset`).
// `rate` plays that stretch faster (1.5 = 1.5× speed), so it takes less time in the video.
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

export type Effect = "spotlight" | "cellZoom" | "ringZoom" | "tattoos" | "result";

export interface Scene {
  at: Mark;
  offset: number;
  len?: number;
  until?: Mark;
  untilOffset?: number;
  rate?: number;
  caption: string;
  effect?: Effect;
}

export interface Variant {
  scenes: Scene[];
  intro: number;
  outro: number;
  /** Multiplies every animation's timing (zooms, captions, overlays): below 1 is snappier. */
  pace: number;
}

const ALBUMS = "Sudoku, but the numbers are Ariana's albums";
const HINTS = "Hints light up a column, row or box";
const COLOURS = "Each note is an album's colour";
const SAVE = "Save your result to share";

// The full-length cut (~42s).
const SCENES: Scene[] = [
  { at: "flipIn", offset: 0.05, len: 2.2, caption: ALBUMS },
  { at: "play", offset: 0, len: 1.8, caption: ALBUMS },
  { at: "hints", offset: -0.1, until: "hintCol", caption: "Stuck? Turn on hints", effect: "spotlight" },
  { at: "hintCol", offset: 0, until: "hintTray", caption: HINTS, effect: "spotlight" },
  { at: "hintTray", offset: 0, len: 2.1, caption: "Covers already used there fade out", effect: "spotlight" },
  { at: "notes", offset: -0.3, until: "notesType", untilOffset: -0.1, caption: "Notes mode flips the board upside down" },
  { at: "notesType", offset: -0.1, until: "peek", caption: COLOURS, effect: "cellZoom" },
  { at: "peek", offset: 0, len: 2.6, caption: COLOURS },
  { at: "mistake", offset: 0.05, len: 3.0, caption: "7 mistakes and it's game over", effect: "ringZoom" },
  { at: "tattoos", offset: 0.1, len: 2.8, caption: "Filled with Easter eggs", effect: "tattoos" },
  { at: "win", offset: -0.2, until: "summary", untilOffset: 0.4, caption: "Solve it and the whole board flips" },
  { at: "summary", offset: 0.4, len: 2.0, caption: SAVE },
  { at: "export", offset: 0.3, len: 2.5, caption: SAVE, effect: "result" },
];

// The fast cut (~25s): same scenes, shorter holds, slow stretches sped up.
const FAST_SCENES: Scene[] = [
  { at: "flipIn", offset: 0.05, len: 1.6, rate: 1.2, caption: ALBUMS },
  { at: "play", offset: 0, len: 1.6, rate: 1.5, caption: ALBUMS },
  { at: "hints", offset: -0.1, until: "hintCol", rate: 1.3, caption: "Stuck? Turn on hints", effect: "spotlight" },
  { at: "hintCol", offset: 0, until: "hintTray", rate: 1.8, caption: HINTS, effect: "spotlight" },
  { at: "hintTray", offset: 0, len: 1.6, rate: 1.2, caption: "Covers already used there fade out", effect: "spotlight" },
  { at: "notes", offset: -0.3, until: "notesType", untilOffset: -0.1, rate: 1.4, caption: "Notes mode flips the board upside down" },
  { at: "notesType", offset: -0.1, until: "peek", rate: 1.4, caption: COLOURS, effect: "cellZoom" },
  { at: "peek", offset: 0, len: 1.6, caption: COLOURS },
  { at: "mistake", offset: 0.05, len: 2.3, rate: 1.3, caption: "7 mistakes and it's game over", effect: "ringZoom" },
  { at: "tattoos", offset: 0.1, len: 1.7, caption: "Filled with Easter eggs", effect: "tattoos" },
  { at: "win", offset: -0.2, until: "summary", untilOffset: 0.4, rate: 1.8, caption: "Solve it and the whole board flips" },
  { at: "summary", offset: 0.4, len: 1.1, caption: SAVE },
  { at: "export", offset: 0.3, len: 1.6, caption: SAVE, effect: "result" },
];

export const VARIANTS = {
  full: { scenes: SCENES, intro: 1.8, outro: 3.2, pace: 1 },
  fast: { scenes: FAST_SCENES, intro: 1.1, outro: 2.3, pace: 0.6 },
} satisfies Record<string, Variant>;

export type VariantName = keyof typeof VARIANTS;

type Marks = Record<Mark, number>;

/** Seconds of the take a scene covers. */
export const takeLen = (s: Scene, marks: Marks) =>
  s.until ? marks[s.until] + (s.untilOffset ?? 0) - (marks[s.at] + s.offset) : s.len!;

/** Seconds the scene lasts in the video (after any speed-up). */
export const sceneLen = (s: Scene, marks: Marks) => takeLen(s, marks) / (s.rate ?? 1);

export const totalSeconds = (v: Variant, marks: Marks) => v.intro + v.scenes.reduce((t, s) => t + sceneLen(s, marks), 0) + v.outro;
