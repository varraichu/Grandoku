import { create } from "zustand";
import type { WinPhase } from "./winSequence";
import type { Difficulty } from "sudoku-core";
import { nextPuzzle, takeReadyPuzzle, type Puzzle } from "./puzzles";
import { type Board, type HighlightMode, WAVE_RISE_MS, completionWave, nextMode, peersOf, usedDigits } from "./sudoku";

export type { Difficulty };
export type Notes = ReadonlyArray<ReadonlySet<number>>;

export const MAX_MISTAKES = 7;

interface Snapshot {
  board: Board;
  notes: Notes;
}

/** A running completion wave: per-cell delays (ms) from `start` (Date.now()). */
export interface Wave {
  id: number;
  start: number;
  delays: ReadonlyMap<number, number>;
}

/** The board split-flapping from the previous game's covers into a new puzzle's. */
export interface Intro {
  from: Board;
  phase: "armed" | "in";
}

interface GameState {
  difficulty: Difficulty;
  /** False on load until a level is picked: the board is empty and nothing runs. */
  started: boolean;
  intro: Intro | null;
  /** A new game whose puzzle is still being generated (in the background worker). */
  loading: Difficulty | null;
  /** While loading: random covers the board shuffles through (a new set every tick). */
  shuffle: Board | null;
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
  /** Split-flap win sequence progress; null until the game is won. */
  winPhase: WinPhase | null;
  mistakes: number; // wrong placements this attempt; undo doesn't refund them
  lost: boolean; // hit MAX_MISTAKES: board locked until restart
  /** The wrong placement to shake; `id` changes each time so repeats in one cell replay it. */
  shake: { cell: number; id: number } | null;
  /** Completion waves in flight. Several can run at once; each removes itself when done. */
  waves: Wave[];

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
  winPhase: null,
  mistakes: 0,
  lost: false,
  shake: null,
  waves: [],
  notesMode: false,
});

/** A board of random covers, for the shuffle shown while a puzzle is being generated. */
/** Covers per shuffle deal: about a third of the board, like a puzzle's clues. */
const SHUFFLE_COVERS = 27;

/** A shuffle deal: random covers in ~a third of the cells (random cells), the rest blank. */
export const randomBoard = (): Board => {
  const board: Board = Array(81).fill(null);
  const cells = [...board.keys()].sort(() => Math.random() - 0.5).slice(0, SHUFFLE_COVERS);
  for (const k of cells) board[k] = 1 + Math.floor(Math.random() * 9);
  return board;
};

/** Bumped by every newGame, so a slow puzzle for an abandoned request is ignored. */
let gameRequest = 0;

const EMPTY: Board = Array(81).fill(null);

let waveSeq = 0;

/** A cell is mid-swell if a running wave's animation hasn't reached the end for it yet. */
const isSwelling = (waves: Wave[], cell: number, now: number) =>
  waves.some((w) => w.delays.has(cell) && now < w.start + w.delays.get(cell)! + WAVE_RISE_MS);

export const useGame = create<GameState>()((set, get) => {
  /** Start a wave, leaving out covers still mid-swell from an earlier one so nothing snaps. */
  const addWave = (delays: Map<number, number> | null): Wave[] => {
    const { waves } = get();
    if (!delays) return waves;
    const now = Date.now();
    for (const cell of [...delays.keys()]) if (isSwelling(waves, cell, now)) delays.delete(cell);
    if (delays.size === 0) return waves;
    const wave: Wave = { id: ++waveSeq, start: now, delays };
    setTimeout(
      () => set((s) => ({ waves: s.waves.filter((w) => w.id !== wave.id) })),
      Math.max(...delays.values()) + WAVE_RISE_MS,
    );
    return [...waves, wave];
  };

  return {
    // Nothing is generated until a level is picked; the picker opens over an empty board.
    difficulty: "medium",
    puzzle: EMPTY,
    solution: EMPTY,
    ...freshAttempt(EMPTY),
    started: false,
    intro: null,
    loading: null,
    shuffle: null,
    highlightMode: "column",
    hintsOn: false,

    // New games and restarts flip the board from what's showing now into the fresh puzzle.
    // Puzzles come from background workers; usually one is ready, otherwise the board shuffles
    // until it arrives.
    newGame: (difficulty) => {
      const request = ++gameRequest;
      const begin = ({ puzzle, solution }: Puzzle) => {
        if (request !== gameRequest) return; // a newer game was asked for meanwhile
        const { shuffle, board } = get();
        const from = shuffle ?? board; // from the empty load-up board too: the clues flip in
        set({
          difficulty,
          puzzle,
          solution,
          ...freshAttempt(puzzle),
          started: true,
          loading: null,
          shuffle: null,
          intro: { from, phase: "armed" },
        });
      };
      const ready = takeReadyPuzzle(difficulty);
      if (ready) return begin(ready);
      set({ loading: difficulty, shuffle: randomBoard(), selectedCell: null, intro: null, waves: [] });
      nextPuzzle(difficulty).then(begin);
    },
    restart: () => set({ ...freshAttempt(get().puzzle), intro: { from: get().board, phase: "armed" } }),

    selectCell: (i) => {
      if (!get().started || get().intro || get().loading) return;
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
      if (!get().started || get().intro || get().loading || won || lost || i === null || puzzle[i] !== null) return;
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
      const solved = nextBoard.every((v, k) => v === solution[k]);
      set({
        board: nextBoard,
        notes: nextNotes,
        history: [...history, snapshot],
        won: solved,
        mistakes,
        lost: mistakes >= MAX_MISTAKES,
        shake: wrong ? { cell: i, id: (get().shake?.id ?? 0) + 1 } : null,
        // Placements that complete nothing leave a running wave alone. The winning move skips the
        // wave (the split-flap sequence takes over) and clears the selection.
        waves: solved ? [] : wrong ? get().waves : addWave(completionWave(i, nextBoard, solution)),
        ...(solved ? { selectedCell: null } : {}),
      });
    },

    erase: () => {
      const { selectedCell: i, puzzle, board, notes, history, won, lost } = get();
      if (get().intro || get().loading || won || lost || i === null || puzzle[i] !== null) return;
      const snapshot = { board, notes };
      if (board[i] !== null) {
        const nextBoard = [...board];
        nextBoard[i] = null;
        set({ board: nextBoard, history: [...history, snapshot], shake: null, waves: [] });
      } else if (notes[i].size > 0) {
        const nextNotes = [...notes];
        nextNotes[i] = new Set();
        set({ notes: nextNotes, history: [...history, snapshot] });
      }
    },

    undo: () => {
      const { history, won, lost } = get();
      if (get().intro || get().loading || won || lost || history.length === 0) return;
      const prev = history[history.length - 1];
      set({ board: prev.board, notes: prev.notes, history: history.slice(0, -1), shake: null, waves: [] });
    },

    tick: () => {
      const { started, intro, loading, won, lost, elapsed } = get();
      if (started && !intro && !loading && !won && !lost) set({ elapsed: elapsed + 1 });
    },
  };
});

export const isMistake = (s: Pick<GameState, "puzzle" | "board" | "solution">, i: number) =>
  s.puzzle[i] === null && s.board[i] !== null && s.board[i] !== s.solution[i];
