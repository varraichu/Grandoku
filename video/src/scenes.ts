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

export type Effect =
  | "spotlight" // dim all but the area being explained; Column / Row / Box pop in on cue
  | "cellZoom" // zoom into the noted cell, then back out
  | "cellZoomIn" // zoom in and stay (ends zoomed)
  | "noteLines" // (freeze) held zoom, lines from each note colour to its album
  | "cellZoomOut" // start zoomed, ease out
  | "ringZoom"
  | "ringLabel" // a label pointing at the mistakes counter
  | "flipTag" // a label pointing at the upside-down title
  | "ringBubble" // magnifier bubble over the mistakes counter
  | "cellBubble" // magnifier bubble over the noted cell
  | "tattoos"
  | "result";

export interface Scene {
  at: Mark;
  offset: number;
  len?: number;
  until?: Mark;
  untilOffset?: number;
  rate?: number;
  /** Shown at the top while the scene plays ("" = none). */
  caption: string;
  effect?: Effect;
  /** Show the caption as a title card first: a full card, or a big title that shrinks into the caption. */
  card?: "plain" | "shrink";
  /** Freeze on the scene's first frame (overlays still animate). */
  still?: boolean;
}

export interface Variant {
  scenes: Scene[];
  intro: number;
  outro: number;
  /** Multiplies every animation's timing (zooms, captions, overlays): below 1 is snappier. */
  pace: number;
  /** Words popped beside each hint spotlight, in the recorder's order: button, column, row, box, tray. */
  spotLabels?: (string | null)[];
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

// ---------- Style tests: short clips, each trying one idea on the scene it suits ----------

const HINT_SCENES = (card: "plain" | "shrink"): Scene[] => [
  { at: "hints", offset: -0.1, until: "hintCol", caption: "Stuck? Turn on hints", effect: "spotlight", card },
  { at: "hintCol", offset: 0, until: "hintTray", caption: HINTS, effect: "spotlight", card },
  { at: "hintTray", offset: 0, len: 2.1, caption: "Covers already used there fade out", effect: "spotlight", card },
];
const NOTES_FREEZE = 2.1; // seconds after notesType: all four notes are in

const TESTS = {
  // 1a. Caption card, then the clip (no text over gameplay).
  cardPlain: HINT_SCENES("plain"),
  // 1b. Big title that shrinks into the caption as the clip starts.
  cardShrink: HINT_SCENES("shrink"),
  // 2. Freeze on the zoomed cell and connect each note colour to its album.
  freeze: [
    { at: "notesType", offset: -0.1, len: NOTES_FREEZE + 0.1, caption: COLOURS, effect: "cellZoomIn" },
    { at: "notesType", offset: NOTES_FREEZE, len: 3.0, caption: COLOURS, effect: "noteLines", still: true },
    { at: "notesType", offset: NOTES_FREEZE, until: "peek", caption: COLOURS, effect: "cellZoomOut" },
    { at: "peek", offset: 0, len: 2.2, caption: COLOURS },
  ],
  // 3. The words sit on the game, pointing at what they describe.
  label: [{ at: "mistake", offset: 0.05, len: 3.4, caption: "", effect: "ringLabel" }],
  // 4. A magnifier bubble instead of zooming the whole view.
  magnifier: [
    { at: "mistake", offset: 0.05, len: 3.0, caption: "7 mistakes and it's game over", effect: "ringBubble" },
    { at: "notesType", offset: -0.1, until: "peek", caption: COLOURS, effect: "cellBubble" },
  ],
  // 5. Speed ramp: rush the lead-up, slow down for the big reveal, rush the flip back.
  speedRamp: [
    { at: "win", offset: -0.2, len: 2.0, rate: 2, caption: "Solve it and the whole board flips" },
    { at: "win", offset: 1.8, len: 2.6, rate: 0.75, caption: "Solve it and the whole board flips" },
    { at: "win", offset: 4.4, until: "summary", untilOffset: 0.4, rate: 2, caption: "Solve it and the whole board flips" },
  ],
} satisfies Record<string, Scene[]>;

// ---------- v2: a title card per feature, details as labels on the game, no text over clips ----------

const v2Scenes = (fast: boolean): Scene[] => {
  // Fast cut: shorter holds and sped-up gameplay; `f(full, quick)` picks per cut.
  const f = <T,>(full: T, quick: T) => (fast ? quick : full);
  return [
    { at: "flipIn", offset: 0.05, len: f(2.2, 1.6), rate: f(1, 1.2), caption: ALBUMS, card: "plain" },
    { at: "play", offset: 0, len: f(1.8, 1.6), rate: f(1, 1.5), caption: "" },
    { at: "hints", offset: -0.1, until: "hintCol", rate: f(1, 1.3), caption: "Stuck? Turn on hints", card: "plain", effect: "spotlight" },
    { at: "hintCol", offset: 0, until: "hintTray", rate: f(1, 1.8), caption: "", effect: "spotlight" },
    { at: "hintTray", offset: 0, len: f(2.1, 1.6), rate: f(1, 1.2), caption: "", effect: "spotlight" },
    { at: "notes", offset: -0.3, until: "notesType", untilOffset: -0.1, rate: f(1, 1.3), caption: "Notes mode", card: "plain", effect: "flipTag" },
    { at: "notesType", offset: -0.1, len: NOTES_FREEZE + 0.1, rate: f(1, 1.4), caption: "", effect: "cellZoomIn" },
    { at: "notesType", offset: NOTES_FREEZE, len: f(3.4, 2.6), caption: "", effect: "noteLines", still: true },
    { at: "notesType", offset: NOTES_FREEZE, until: "peek", caption: "", effect: "cellZoomOut" },
    { at: "peek", offset: 0, len: f(2.2, 1.5), caption: "" },
    { at: "mistake", offset: 0.05, len: f(3.2, 2.4), rate: f(1, 1.2), caption: "Careful with mistakes", card: "plain", effect: "ringLabel" },
    { at: "tattoos", offset: 0.1, len: f(2.8, 1.8), caption: "Filled with Easter eggs", card: "plain", effect: "tattoos" },
    { at: "win", offset: -0.2, until: "summary", untilOffset: 0.4, rate: f(1, 1.8), caption: "Solve it and the whole board flips", card: "plain" },
    { at: "summary", offset: 0.4, len: f(2.0, 1.1), caption: SAVE, card: "plain" },
    { at: "export", offset: 0.3, len: f(2.5, 1.6), caption: "", effect: "result" },
  ];
};
const V2_LABELS = [null, "Column", "Row", "Box", "Already used", null];

export const VARIANTS = {
  full: { scenes: SCENES, intro: 1.8, outro: 3.2, pace: 1 },
  fast: { scenes: FAST_SCENES, intro: 1.1, outro: 2.3, pace: 0.6 },
  v2: { scenes: v2Scenes(false), intro: 1.8, outro: 3.2, pace: 1, spotLabels: V2_LABELS },
  "v2-fast": { scenes: v2Scenes(true), intro: 1.1, outro: 2.3, pace: 0.6, spotLabels: V2_LABELS },
  ...(Object.fromEntries(
    Object.entries(TESTS).map(([k, scenes]) => [`test-${k}`, { scenes, intro: 0, outro: 0, pace: 1 }]),
  ) as Record<`test-${keyof typeof TESTS}`, Variant>),
} satisfies Record<string, Variant>;

/** Seconds a title card holds before its scene. */
export const CARD_S = { plain: 1.0, shrink: 0.8 };

export type VariantName = keyof typeof VARIANTS;

type Marks = Record<Mark, number>;

/** Seconds of the take a scene covers. */
export const takeLen = (s: Scene, marks: Marks) =>
  s.until ? marks[s.until] + (s.untilOffset ?? 0) - (marks[s.at] + s.offset) : s.len!;

/** Seconds the scene lasts in the video (after any speed-up). */
export const sceneLen = (s: Scene, marks: Marks) => takeLen(s, marks) / (s.rate ?? 1);

export const totalSeconds = (v: Variant, marks: Marks) =>
  v.intro + v.scenes.reduce((t, s) => t + sceneLen(s, marks) + (s.card ? CARD_S[s.card] * v.pace : 0), 0) + v.outro;
