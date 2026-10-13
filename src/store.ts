import { create } from "zustand";
import { generate, solve, type Difficulty } from "sudoku-core";
import { type Board, type HighlightMode, nextMode, peersOf, usedDigits } from "./sudoku";

export type { Difficulty };
export type Notes = ReadonlyArray<ReadonlySet<number>>;

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
  notesMode: boolean;
  history: Snapshot[];
  elapsed: number; // seconds
  won: boolean;

  newGame: (difficulty: Difficulty) => void;
  selectCell: (i: number) => void;
  moveSelection: (dRow: number, dCol: number) => void;
  setHighlightMode: (mode: HighlightMode) => void;
  cycleHighlightMode: () => void;
  toggleNotesMode: () => void;
  input: (digit: number) => void;
  erase: () => void;
  undo: () => void;
  tick: () => void;
}

const emptyNotes = (): Notes => Array.from({ length: 81 }, () => new Set<number>());

function createGame(difficulty: Difficulty) {
  const puzzle = generate(difficulty);
  const result = solve(puzzle);
  if (!result.solved || !result.board) throw new Error(result.error ?? "Generated puzzle has no solution");
  return {
    difficulty,
    puzzle,
    solution: result.board,
    board: [...puzzle],
    notes: emptyNotes(),
    selectedCell: null,
    history: [],
    elapsed: 0,
    won: false,
    notesMode: false,
  };
}

export const useGame = create<GameState>()((set, get) => ({
  ...createGame("medium"),
  highlightMode: "column",

  newGame: (difficulty) => set(createGame(difficulty)),

  selectCell: (i) => {
    const { selectedCell, highlightMode } = get();
    if (selectedCell !== i) return set({ selectedCell: i }); // mode is sticky across selections
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

  setHighlightMode: (highlightMode) => set({ highlightMode }),
  cycleHighlightMode: () => set({ highlightMode: nextMode(get().highlightMode) }),
  toggleNotesMode: () => set({ notesMode: !get().notesMode }),

  input: (digit) => {
    const { selectedCell: i, puzzle, board, notes, notesMode, highlightMode, history, solution, won } = get();
    if (won || i === null || puzzle[i] !== null) return;
    if (usedDigits(highlightMode, i, board).has(digit)) return; // faded in the tray
    const snapshot = { board, notes };

    if (notesMode) {
      if (board[i] !== null) return;
      const cellNotes = new Set(notes[i]);
      if (cellNotes.has(digit)) cellNotes.delete(digit);
      else cellNotes.add(digit);
      const nextNotes = [...notes];
      nextNotes[i] = cellNotes;
      return set({ notes: nextNotes, history: [...history, snapshot] });
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

    set({
      board: nextBoard,
      notes: nextNotes,
      history: [...history, snapshot],
      won: nextBoard.every((v, k) => v === solution[k]),
    });
  },

  erase: () => {
    const { selectedCell: i, puzzle, board, notes, history, won } = get();
    if (won || i === null || puzzle[i] !== null) return;
    const snapshot = { board, notes };
    if (board[i] !== null) {
      const nextBoard = [...board];
      nextBoard[i] = null;
      set({ board: nextBoard, history: [...history, snapshot] });
    } else if (notes[i].size > 0) {
      const nextNotes = [...notes];
      nextNotes[i] = new Set();
      set({ notes: nextNotes, history: [...history, snapshot] });
    }
  },

  undo: () => {
    const { history, won } = get();
    if (won || history.length === 0) return;
    const prev = history[history.length - 1];
    set({ board: prev.board, notes: prev.notes, history: history.slice(0, -1) });
  },

  tick: () => {
    if (!get().won) set({ elapsed: get().elapsed + 1 });
  },
}));

export const isMistake = (s: Pick<GameState, "puzzle" | "board" | "solution">, i: number) =>
  s.puzzle[i] === null && s.board[i] !== null && s.board[i] !== s.solution[i];
