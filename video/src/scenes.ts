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
  | "result"
  | "resultHeld"; // the result image already in place (continues a "result" scene)

export interface Scene {
  at: Mark;
  offset: number;
  len?: number;
  until?: Mark;
  untilOffset?: number;
  rate?: number;
  /** Shown at the top while the scene plays ("" = none). */
  caption: string;
  /** A different caption for the landscape video. */
  captionLandscape?: string;
  /** Creator look: where the caption sits, per format (default: middle in vertical, bottom in landscape). */
  captionAt?: { portrait?: CaptionSpot; landscape?: CaptionSpot };
  effect?: Effect;
  /** Show the caption as a title card first: a full card, or a big title that shrinks into the caption. */
  card?: "plain" | "shrink";
  /** Freeze on the scene's first frame (overlays still animate). */
  still?: boolean;
}

export type CaptionSpot = "top" | "middle" | "bottom";

export interface Variant {
  scenes: Scene[];
  intro: number;
  outro: number;
  /** Multiplies every animation's timing (zooms, captions, overlays): below 1 is snappier. */
  pace: number;
  /** Words popped beside each hint spotlight, in the recorder's order: button, column, row, box, tray. */
  spotLabels?: (string | null)[];
  /** Centre the game window vertically (for cuts with no caption above it). */
  centered?: boolean;
  /** "creator": full-screen gameplay, casual caption boxes, a zoom bump on every cut. */
  look?: "creator";
}

const ALBUMS = "Sudoku, but the numbers are Ariana's albums";
const HINTS = "Hints light up a column, row or box";
const COLOURS = "Each note is an album's colour";
const SAVE = "Save your result to share";
const EGGS = "Easter eggs (if you know you know)";
const WIN = "Solve it and the whole board flips";

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

const WIN_END = 5.55; // seconds after the last cover: the board has flipped back, the Solved popup isn't up yet

const V2_SCENES: Scene[] = [
  { at: "flipIn", offset: 0.05, len: 2.2, caption: ALBUMS, card: "plain" },
  { at: "play", offset: 0, len: 1.8, caption: "" },
  { at: "hints", offset: -0.1, until: "hintCol", caption: "Stuck? Turn on hints", card: "plain", effect: "spotlight" },
  { at: "hintCol", offset: 0, until: "hintTray", caption: "", effect: "spotlight" },
  { at: "hintTray", offset: 0, len: 2.1, caption: "", effect: "spotlight" },
  { at: "notes", offset: -0.3, until: "notesType", untilOffset: -0.1, caption: "Notes mode", card: "plain", effect: "flipTag" },
  { at: "notesType", offset: -0.1, len: NOTES_FREEZE + 0.1, caption: "", effect: "cellZoomIn" },
  { at: "notesType", offset: NOTES_FREEZE, len: 3.4, caption: "", effect: "noteLines", still: true },
  { at: "notesType", offset: NOTES_FREEZE, until: "peek", caption: "", effect: "cellZoomOut" },
  { at: "peek", offset: 0, len: 2.2, caption: "" },
  { at: "mistake", offset: 0.05, len: 3.2, caption: "Careful with mistakes", card: "plain", effect: "ringLabel" },
  { at: "tattoos", offset: 0.1, len: 2.8, caption: EGGS, card: "plain", effect: "tattoos" },
  { at: "win", offset: -0.2, len: WIN_END + 0.2, caption: WIN, card: "plain" },
  { at: "summary", offset: 0.4, len: 2.0, caption: SAVE, card: "plain" },
  { at: "export", offset: 0.3, len: 2.5, caption: "", effect: "result" },
];

// Fast v2: key moments play at normal speed; only the waiting in between is sped up.
const V2_FAST_SCENES: Scene[] = [
  { at: "flipIn", offset: 0.05, len: 1.7, rate: 1.25, caption: ALBUMS, card: "plain" },
  { at: "play", offset: 0, len: 1.6, rate: 1.2, caption: "" },
  { at: "hints", offset: -0.1, until: "hintCol", rate: 1.2, caption: "Stuck? Turn on hints", card: "plain", effect: "spotlight" },
  // Each hint area lights up at 1×, then the rest of its hold is skimmed.
  { at: "hintCol", offset: 0, len: 0.8, caption: "", effect: "spotlight" },
  { at: "hintCol", offset: 0.8, until: "hintRow", rate: 2, caption: "", effect: "spotlight" },
  { at: "hintRow", offset: 0, len: 0.8, caption: "", effect: "spotlight" },
  { at: "hintRow", offset: 0.8, until: "hintBox", rate: 2, caption: "", effect: "spotlight" },
  { at: "hintBox", offset: 0, len: 0.8, caption: "", effect: "spotlight" },
  { at: "hintBox", offset: 0.8, until: "hintTray", rate: 2, caption: "", effect: "spotlight" },
  { at: "hintTray", offset: 0, len: 1.7, caption: "", effect: "spotlight" },
  { at: "notes", offset: -0.3, until: "notesType", untilOffset: -0.1, rate: 1.15, caption: "Notes mode", card: "plain", effect: "flipTag" },
  { at: "notesType", offset: -0.1, len: NOTES_FREEZE + 0.1, rate: 1.4, caption: "", effect: "cellZoomIn" },
  { at: "notesType", offset: NOTES_FREEZE, len: 2.9, caption: "", effect: "noteLines", still: true },
  { at: "notesType", offset: NOTES_FREEZE, until: "peek", caption: "", effect: "cellZoomOut" },
  { at: "peek", offset: 0, len: 1.7, caption: "" },
  { at: "mistake", offset: 0.05, len: 2.6, rate: 1.1, caption: "Careful with mistakes", card: "plain", effect: "ringLabel" },
  { at: "tattoos", offset: 0.1, len: 2.2, caption: EGGS, card: "plain", effect: "tattoos" },
  // Win: hurry the last cover and ripple, the big reveal at 1×, hurry the flip back.
  { at: "win", offset: -0.2, len: 2.0, rate: 1.6, caption: WIN, card: "plain" },
  { at: "win", offset: 1.8, len: 2.6, caption: "" },
  { at: "win", offset: 4.4, len: WIN_END - 4.4, rate: 1.4, caption: "" },
  { at: "summary", offset: 0.4, len: 1.5, caption: SAVE, card: "plain" },
  { at: "export", offset: 0.3, len: 2.0, caption: "", effect: "result" },
];
const V2_LABELS = [null, "Column", "Row", "Box", "Already used", null];

// ---------- v3: someone showing off a game they built (~20s) ----------

const V3_SCENES: Scene[] = [
  // Hook: open on the big reveal.
  { at: "win", offset: 1.8, len: 2.4, caption: "I spent way too long making this" },
  { at: "flipIn", offset: 0.05, len: 1.5, rate: 1.2, caption: "I made sudoku, but the numbers are Ariana's albums" },
  { at: "play", offset: 0, len: 1.2, rate: 1.4, caption: "I made sudoku, but the numbers are Ariana's albums" },
  // Jump cuts through the three hint areas.
  { at: "hintCol", offset: 0, len: 0.8, caption: "Hints if you're stuck" },
  { at: "hintRow", offset: 0, len: 0.8, caption: "Hints if you're stuck" },
  { at: "hintBox", offset: 0, len: 0.9, caption: "Hints if you're stuck" },
  { at: "notes", offset: 0.15, len: 1.3, caption: "Notes mode flips everything upside down" },
  { at: "notesType", offset: -0.1, len: NOTES_FREEZE + 0.1, rate: 1.6, caption: "Each note is an album's colour", effect: "cellZoomIn", captionAt: { portrait: "top", landscape: "top" } },
  { at: "notesType", offset: NOTES_FREEZE, len: 2.5, caption: "Each note is an album's colour", effect: "noteLines", still: true, captionAt: { portrait: "top", landscape: "top" } },
  { at: "mistake", offset: 0.05, len: 2.0, rate: 1.1, caption: "7 mistakes and you're out. Yes, that's a reference", effect: "ringZoom", captionAt: { portrait: "top" } },
  { at: "tattoos", offset: 0.1, len: 2.0, caption: "Her tattoos are hidden in the background", effect: "tattoos" },
  { at: "summary", offset: 0.4, len: 1.0, caption: "And you can share your score" },
  { at: "export", offset: 0.3, len: 1.5, caption: "And you can share your score", effect: "result" },
  {
    at: "export",
    offset: 1.8,
    len: 2.2,
    caption: "Link in bio. What should I add next?",
    captionLandscape: "grandoku.vercel.app. What should I add next?",
    effect: "resultHeld",
    captionAt: { portrait: "top" },
  },
];

export const VARIANTS = {
  full: { scenes: SCENES, intro: 1.8, outro: 3.2, pace: 1 },
  fast: { scenes: FAST_SCENES, intro: 1.1, outro: 2.3, pace: 0.6 },
  v2: { scenes: V2_SCENES, intro: 1.8, outro: 3.2, pace: 1, spotLabels: V2_LABELS, centered: true },
  v3: { scenes: V3_SCENES, intro: 0, outro: 0, pace: 0.75, look: "creator" },
  "v2-fast": { scenes: V2_FAST_SCENES, intro: 1.3, outro: 2.6, pace: 0.8, spotLabels: V2_LABELS, centered: true },
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
