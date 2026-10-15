import { create } from "zustand";
import { generate, solve, type Difficulty } from "sudoku-core";
import { type Board, type HighlightMode, completionWave, nextMode, peersOf, usedDigits } from "./sudoku";

export type { Difficulty };
export type Notes = ReadonlyArray<ReadonlySet<number>>;

export const MAX_MISTAKES = 7;

interface Snapshot {
  board: Board;
  notes: Notes;
}

interface GameState {
  difficulty: Difficulty;
  puzzle: Board;
  solution: Board;
  board: Board;
  notes: Notes;
  selectedCell: number | null;
  highlightMode: HighlightMode;
  /** Hints on: highlight just the mode's unit and fade/block covers already used in it. Starts off every load. */
  hintsOn: boolean;
  notesMode: boolean;
  history: Snapshot[];
  elapsed: number; // seconds
  won: boolean;
  mistakes: number; // wrong placements this attempt; undo doesn't refund them
  lost: boolean; // hit MAX_MISTAKES: board locked until restart
  /** The wrong placement to shake; `id` changes each time so repeats in one cell replay it. */
  shake: { cell: number; id: number } | null;
  /** Completion wave: per-cell delays (ms); `id` changes each time so it replays. */
  wave: { delays: ReadonlyMap<number, number>; id: number } | null;

  newGame: (difficulty: Difficulty) => void;
  restart: () => void;
  selectCell: (i: number) => void;
  moveSelection: (dRow: number, dCol: number) => void;
  setHighlightMode: (mode: HighlightMode) => void;
  cycleHighlightMode: () => void;
  toggleHints: () => void;
  toggleNotesMode: () => void;
  input: (digit: number) => void;
  erase: () => void;
  undo: () => void;
  tick: () => void;
}

const emptyNotes = (): Notes => Array.from({ length: 81 }, () => new Set<number>());

/** A fresh attempt at `puzzle`: shared by new games and restarts. */
const freshAttempt = (puzzle: Board) => ({
  board: [...puzzle],
  notes: emptyNotes(),
  selectedCell: null,
  history: [],
  elapsed: 0,
  won: false,
  mistakes: 0,
  lost: false,
  shake: null,
  wave: null,
  notesMode: false,
});

function createGame(difficulty: Difficulty) {
  const puzzle = generate(difficulty);
  const result = solve(puzzle);
  if (!result.solved || !result.board) throw new Error(result.error ?? "Generated puzzle has no solution");
  return {
    difficulty,
    puzzle,
    solution: result.board,
    ...freshAttempt(puzzle),
  };
}

const waveFrom = (delays: Map<number, number> | null, prev: GameState["wave"]): GameState["wave"] =>
  delays ? { delays, id: (prev?.id ?? 0) + 1 } : prev;

export const useGame = create<GameState>()((set, get) => ({
  ...createGame("medium"),
  highlightMode: "column",
  hintsOn: false,

  newGame: (difficulty) => set(createGame(difficulty)),
  restart: () => set(freshAttempt(get().puzzle)),

  selectCell: (i) => {
    const { selectedCell, highlightMode, hintsOn } = get();
    if (selectedCell !== i) return set({ selectedCell: i }); // mode is sticky across selections
    if (!hintsOn) return set({ selectedCell: null }); // nothing to cycle: re-tapping deselects
    // Re-tapping cycles column → row → box → deselected.
    if (highlightMode === "box") set({ selectedCell: null, highlightMode: "column" });
    else set({ highlightMode: nextMode(highlightMode) });
  },

  moveSelection: (dRow, dCol) => {
    const { selectedCell } = get();
    if (selectedCell === null) return set({ selectedCell: 40 });
    const r = (Math.floor(selectedCell / 9) + dRow + 9) % 9;
    const c = ((selectedCell % 9) + dCol + 9) % 9;
    set({ selectedCell: r * 9 + c });
  },

  // Picking a mode is asking for hints, so it switches them on.
  setHighlightMode: (highlightMode) => set({ highlightMode, hintsOn: true }),
  cycleHighlightMode: () => set({ highlightMode: nextMode(get().highlightMode) }),
  toggleHints: () => set({ hintsOn: !get().hintsOn }),
  toggleNotesMode: () => set({ notesMode: !get().notesMode }),

  input: (digit) => {
    const {
      selectedCell: i,
      puzzle,
      board,
      notes,
      notesMode,
      highlightMode,
      hintsOn,
      history,
      solution,
      won,
      lost,
    } = get();
    if (won || lost || i === null || puzzle[i] !== null) return;
    if (hintsOn && usedDigits(highlightMode, i, board).has(digit)) return; // faded in the tray
    const snapshot = { board, notes };

    if (notesMode) {
      if (board[i] !== null) return;
      const cellNotes = new Set(notes[i]);
      if (cellNotes.has(digit)) cellNotes.delete(digit);
      else cellNotes.add(digit);
      const nextNotes = [...notes];
      nextNotes[i] = cellNotes;
      return set({ notes: nextNotes, history: [...history, snapshot], shake: null });
    }

    if (board[i] === digit) return;
    const nextBoard = [...board];
    nextBoard[i] = digit;

    // Placement clears this cell's notes and the digit from every peer, in the same undo step.
    const nextNotes = [...notes];
    nextNotes[i] = new Set();
    for (const p of peersOf(i)) {
      if (nextNotes[p].has(digit)) {
        const s = new Set(nextNotes[p]);
        s.delete(digit);
        nextNotes[p] = s;
      }
    }

    const wrong = digit !== solution[i];
    const mistakes = get().mistakes + (wrong ? 1 : 0);
    set({
      board: nextBoard,
      notes: nextNotes,
      history: [...history, snapshot],
      won: nextBoard.every((v, k) => v === solution[k]),
      mistakes,
      lost: mistakes >= MAX_MISTAKES,
      shake: wrong ? { cell: i, id: (get().shake?.id ?? 0) + 1 } : null,
      // Placements that complete nothing leave a running wave alone.
      wave: wrong ? get().wave : waveFrom(completionWave(i, nextBoard, solution), get().wave),
    });
  },

  erase: () => {
    const { selectedCell: i, puzzle, board, notes, history, won, lost } = get();
    if (won || lost || i === null || puzzle[i] !== null) return;
    const snapshot = { board, notes };
    if (board[i] !== null) {
      const nextBoard = [...board];
      nextBoard[i] = null;
      set({ board: nextBoard, history: [...history, snapshot], shake: null, wave: null });
    } else if (notes[i].size > 0) {
      const nextNotes = [...notes];
      nextNotes[i] = new Set();
      set({ notes: nextNotes, history: [...history, snapshot] });
    }
  },

  undo: () => {
    const { history, won, lost } = get();
    if (won || lost || history.length === 0) return;
    const prev = history[history.length - 1];
    set({ board: prev.board, notes: prev.notes, history: history.slice(0, -1), shake: null, wave: null });
  },

  tick: () => {
    if (!get().won && !get().lost) set({ elapsed: get().elapsed + 1 });
  },
}));

export const isMistake = (s: Pick<GameState, "puzzle" | "board" | "solution">, i: number) =>
  s.puzzle[i] === null && s.board[i] !== null && s.board[i] !== s.solution[i];
