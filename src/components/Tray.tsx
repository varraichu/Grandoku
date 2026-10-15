import { useMemo } from "react";
import { albums } from "../albums";
import { useGame } from "../store";
import { completedDigits, usedDigits } from "../sudoku";

export function Tray() {
  const board = useGame((s) => s.board);
  const solution = useGame((s) => s.solution);
  const selectedCell = useGame((s) => s.selectedCell);
  const highlightMode = useGame((s) => s.highlightMode);
  const hintsOn = useGame((s) => s.hintsOn);
  const input = useGame((s) => s.input);

  // Fading used covers is the hint; with hints off every cover stays available.
  const used = useMemo(
    () => (hintsOn ? usedDigits(highlightMode, selectedCell, board) : new Set<number>()),
    [hintsOn, highlightMode, selectedCell, board],
  );
  const done = useMemo(() => completedDigits(board, solution), [board, solution]);

  return (
    <div className="tray" role="toolbar" aria-label="Album covers">
      {albums.map((a) => {
        const complete = done.has(a.digit);
        const faded = !complete && used.has(a.digit);
        return (
          <button
            key={a.digit}
            className={`tray-slot${complete ? " is-done" : faded ? " is-faded" : ""}`}
            style={{ "--album": a.color } as React.CSSProperties}
            disabled={complete || faded}
            onClick={() => input(a.digit)}
            aria-label={complete ? `${a.name} (all placed)` : a.name}
          >
            <img src={a.cover} alt="" draggable={false} />
            <span className="tray-grey" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
