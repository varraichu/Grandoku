// Autoplay panel for testing animations without playing. Lives on the `autoplay` branch only.
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { useGame } from "../store";
import { boxCells, colCells, rowCells, usedDigits } from "../sudoku";
import "./Autoplay.css";

type Unit = "row" | "column" | "box";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Cells that don't hold their correct cover yet, in reading order. */
const unsolved = (cells: number[]) => {
  const { board, solution } = useGame.getState();
  return cells.filter((k) => board[k] !== solution[k]);
};

/** The unit of this kind with the fewest unsolved cells (but at least one): quickest wave to watch. */
const nextUnit = (kind: Unit): number[] | null => {
  const of = kind === "row" ? rowCells : kind === "column" ? colCells : boxCells;
  let best: number[] | null = null;
  for (let n = 0; n < 9; n++) {
    const left = unsolved(of(n));
    if (left.length > 0 && (!best || left.length < unsolved(best).length)) best = of(n);
  }
  return best;
};

/** Place the correct cover in a cell the way a player would: select it, then tap the cover. */
const placeCorrect = (k: number) => {
  const s = useGame.getState();
  if (s.notesMode) s.toggleNotesMode();
  useGame.setState({ selectedCell: k });
  useGame.getState().input(s.solution[k]!);
};

function Panel() {
  const [open, setOpen] = useState(true);
  const [speed, setSpeed] = useState(150);
  const [running, setRunning] = useState<string | null>(null);
  const stopRef = useRef(false);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => () => void (stopRef.current = true), []);

  /** Place correct covers in `cells` one by one at the current speed, until done or stopped. */
  const run = async (label: string, cells: () => number[]) => {
    if (running) return;
    stopRef.current = false;
    setRunning(label);
    for (const k of cells()) {
      const s = useGame.getState();
      if (stopRef.current || s.won || s.lost) break;
      if (s.board[k] === s.solution[k]) continue;
      placeCorrect(k);
      await sleep(speedRef.current);
    }
    setRunning(null);
  };

  const fill = (kind: Unit) => run(`Filling a ${kind}`, () => unsolved(nextUnit(kind) ?? []));

  const solveToLast = () => {
    const s = useGame.getState();
    const left = s.board.map((v, k) => (v === s.solution[k] ? -1 : k)).filter((k) => k >= 0);
    if (left.length < 2) return;
    const last = left[left.length - 1];
    // Instant (no per-cell animations): everything correct except the last cell, which is selected for you.
    const board = s.solution.map((v, k) => (k === last ? null : v));
    useGame.setState({ board, selectedCell: last, notesMode: false, shake: null, wave: null });
  };

  const makeMistake = () => {
    const s = useGame.getState();
    if (s.won || s.lost) return;
    for (let k = 0; k < 81; k++) {
      if (s.puzzle[k] !== null || s.board[k] !== null) continue;
      const blocked = s.hintsOn ? usedDigits(s.highlightMode, k, s.board) : new Set<number>();
      const wrong = [1, 2, 3, 4, 5, 6, 7, 8, 9].find((d) => d !== s.solution[k] && !blocked.has(d));
      if (wrong === undefined) continue;
      if (s.notesMode) s.toggleNotesMode();
      useGame.setState({ selectedCell: k });
      useGame.getState().input(wrong);
      return;
    }
  };

  if (!open) {
    return (
      <button className="autoplay-tab" onClick={() => setOpen(true)}>
        Autoplay
      </button>
    );
  }

  return (
    <div className="autoplay" role="region" aria-label="Autoplay (testing)">
      <div className="autoplay-head">
        <b>Autoplay</b>
        <button className="autoplay-close" onClick={() => setOpen(false)} aria-label="Hide autoplay">
          ×
        </button>
      </div>
      <div className="autoplay-row">
        <button onClick={() => fill("row")} disabled={!!running}>
          Fill row
        </button>
        <button onClick={() => fill("column")} disabled={!!running}>
          Fill column
        </button>
        <button onClick={() => fill("box")} disabled={!!running}>
          Fill box
        </button>
      </div>
      <div className="autoplay-row">
        {running ? (
          <button className="is-primary" onClick={() => (stopRef.current = true)}>
            Stop
          </button>
        ) : (
          <button className="is-primary" onClick={() => run("Solving", () => unsolved([...Array(81).keys()]))}>
            Solve all
          </button>
        )}
        <button onClick={solveToLast} disabled={!!running}>
          Solve to last cell
        </button>
      </div>
      <div className="autoplay-row">
        <button onClick={makeMistake} disabled={!!running}>
          Make a mistake
        </button>
        <button onClick={() => useGame.getState().restart()} disabled={!!running}>
          Reset board
        </button>
      </div>
      <label className="autoplay-speed">
        <span>
          Speed <b>{speed}ms</b> per cover
        </span>
        <input
          type="range"
          min={30}
          max={800}
          step={10}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
        />
      </label>
      {running && <p className="autoplay-status">{running}…</p>}
    </div>
  );
}

export function mountAutoplay() {
  const host = document.createElement("div");
  host.id = "autoplay-root";
  document.body.appendChild(host);
  createRoot(host).render(<Panel />);
}
