# Album Cover Sudoku: Build Spec

Sudoku where the nine symbols are Ariana Grande album covers instead of digits. The game logic is standard sudoku; only the rendering changes.

## Stack and sources of truth

- Sudoku logic: `sudoku-core` (generate, solve, hint, analyze). Boards are a flat 81-item array of `1-9 | null`.
- Visual design: the Figma screens. Use the Figma MCP (`get_design_context`, `get_screenshot`) on the frames linked below before building each screen, and match them. Where this spec and Figma disagree on layout or styling, Figma wins. Where they disagree on behavior, this spec wins.
- Figma links:
  - Board screen: https://www.figma.com/design/pUmsye13Kxcpc60ntvfdpT/Ideas-and-Co?node-id=2393-543&t=gUaH5M6vtNoy3OeV-1
  - Notes mode: https://www.figma.com/design/pUmsye13Kxcpc60ntvfdpT/Ideas-and-Co?node-id=2397-924&t=gUaH5M6vtNoy3OeV-1
  - pick the album cover corresponding colors: https://www.figma.com/design/pUmsye13Kxcpc60ntvfdpT/Ideas-and-Co?node-id=2397-1085&t=gUaH5M6vtNoy3OeV-1

## Core data model

- Internally every value is a digit 1-9. Covers are mapped at render time only. Never store album names in board state.
- `albums.ts` config, one entry per digit:
  ```ts
  { digit: 1, name: "...", cover: "/covers/....jpg", color: "#......" }
  ```
  Nine entries. Colors are hand-picked, clearly distinct from each other, and loosely inspired by each era. Do not auto-extract colors from covers.
- Game state:
  - `puzzle`: the original clues (read-only cells)
  - `solution`: from `sudoku-core` `solve`
  - `board`: current values
  - `notes`: 81 sets of digits
  - `selectedCell`: index 0-80 or null
  - `highlightMode`: `"cell" | "column" | "row" | "box"`
  - `notesMode`: boolean
  - `history`: stack for undo (covers both placements and note changes)

## Feature 1: Hints, highlighting and filtered tray

### Hints
- Controls (Erase, Notes, Hints) are tiles on offset colour blocks, matching the tray covers: pressing sinks a tile onto its block, and Notes/Hints stay sunk and tinted while on.
- The Hints tile has two zones: 💡 Hints turns hints on/off, and three mini 3×3 grid icons pick Column / Row / Box in one tap (picking one also turns hints on). Everything is fixed-width, so the tile never shifts. Keyboard: `H` toggles hints, `M` cycles the mode.
- Hints start off on every load.
- Hints off: selecting a cell highlights the cell plus its whole row, column and box. Nothing in the tray is faded or blocked. Re-tapping the selected cell deselects it.
- Hints on: the board highlights only the active unit (column, row or box), and re-tapping the selected cell cycles column → row → box → deselected.
- The mode is sticky: selecting a different cell keeps the current mode.
- The selected cell is tinted more strongly (#65CADC at 60%) than the rest of the highlight (15%).

### Filtered tray
- The tray below the board always shows all nine covers in fixed slots, ordered by digit. Slots never move or reflow.
- With hints on, covers already placed in the active unit are faded (greyscale wash) and not tappable.
- A cover with all nine placed correctly on the board is greyed out and not tappable, whatever the selection or hint setting.
- Use placed values for filtering, not notes.

## Feature 2: Notes

### Notes mode
- A toggle button turns notes mode on and off.
- Notes mode must look clearly different from normal mode so it can't be missed: different background color for the screen (or board area), plus a visible "Notes" state on the toggle. Follow the Notes mode Figma frame.
- In notes mode, tapping a cover toggles that digit as a note in the selected cell instead of placing it.
- Notes can't be added to clue cells or filled cells.

### How notes render in a cell
- Notes are shown as small color swatches, not cover images, using each album's `color`.
- Each digit has a fixed position in a 3×3 mini grid inside the cell: digit 1 top-left through digit 9 bottom-right. Empty positions stay empty, so position and color both identify the album.
- Each cover in the tray gets a ring or underline in its album color so the mapping is learnable.

### Note peek popup
- Desktop: hold Shift or Space while a cell with notes is selected (or hovered) to open a popup showing that cell's notes as actual album covers at readable size. Release to close.
- Mobile: long-press a cell with notes to open the same popup. Release or tap outside to close.
- The popup is read-only.

### Auto-clearing notes
- When a cover is placed in a cell, remove that digit from the notes of every cell in the same row, column, and box.
- Placing a cover also clears all notes in that cell.
- Both clears are part of the same undo step as the placement.

## Other behavior

- Clue cells can't be edited. Correct entries fill the cell edge to edge like clues (and stay editable); wrong entries sit inset with rounded corners.
- Undo button (and Cmd/Ctrl+Z on desktop) reverts the last action, including auto-cleared notes.
- Mistakes: check-on-entry default to flagging a cell whose value doesn't match `solution`. A wrong placement shakes once as it lands, with the red outline.
- Mistake counter in the meta row just above the board (`n/7` with the ring icon; black at 0, pink `#dc658d` from the first mistake), with the difficulty centred and the timer on the right (Figma node 2408-1339). Every wrong placement counts; undo doesn't refund it. The 7th mistake locks the board and shows a Game over sheet whose Restart replays the same puzzle with placements, notes, undo history, mistakes and timer reset.
- Completion wave: when a placement makes a row, column or box all correct, its covers rise, grow and settle one after another (column top to bottom, row left to right, box row by row). Several units completed at once all wave together; a shared cell moves once. Waves can overlap in time: a new wave skips covers still mid-swell from an earlier one, so nothing snaps.
- Levels: Easy, Medium, Hard, Expert (sudoku-core's Master practically never finishes generating, so it's not offered). Puzzles are generated off the main thread, one background worker per level (`src/puzzleWorker.ts`, `src/puzzles.ts`), each keeping one puzzle ready from page load so Start is usually instant. If the chosen level isn't ready yet, the board shuffles (each deal puts random covers in ~27 random cells, the rest blank, flipping in the same diagonal sweep and 750ms flip as a board start; a new deal every ~2.3s; input locked, timer stopped) until it arrives, then flips into the puzzle. Expert can take from a few seconds to about a minute when nothing is prepared.
- Starting: on load the level picker opens over an empty board (no puzzle yet, timer stopped). Start flips the clue covers in from the empty board with a slower tile flip (~750ms per cell, same diagonal ripple). Later new games and restarts flip from whatever the board showed into the new puzzle. Tapping the board skips.
- Win state when `board` matches `solution`.
- Win sequence (tile-flip reveal, timings in `src/winSequence.ts` and `src/components/SplitFlap.tsx`): after the winning move every cell turns over as a whole tile (around its horizontal middle, tipping toward the viewer, old cover on the front and new on the back; never two half-covers), flipping through randomly shuffled covers (smooth ~240ms flips with the same easing as the landing flip; a fresh shuffle per cell and per win) before landing. Every cell does the same number of flips (4), so the image lands along the same diagonal it started on, rippling diagonally from top-left ((row + col) × 85ms plus a small fixed per-cell jitter; each flip ~550ms). Each 3×3 box becomes one large album cover (box N shows album N) sliced across its cells, flips back with a single flip per cell, starting from the top-left the moment the last cell lands (phases advance when every cell reports landing/finishing, not on timers) to the solved board, and the win summary appears. Large covers (768px, `public/covers/large/`) are preloaded first. Input is locked; tapping the board skips to the summary. Reduced motion crossfades instead.

## Build order

1. Albums config with placeholder covers and colors, game state store, `sudoku-core` integration, render board from a generated puzzle.
2. Cell selection, placing and erasing covers, clue locking, undo.
3. Hints (on/off split button with Column/Row/Box picker), cycle on re-tap, sticky mode.
4. Tray with fixed slots and fading per mode.
5. Notes mode toggle and visual state, note entry, color swatch rendering in fixed positions.
6. Auto-clearing notes on placement.
7. Note peek popup (desktop keys, mobile long-press).
8. Win state.
9. Match all screens against Figma.
