import { useMemo } from "react";
import { albums } from "../albums";
import { useGame } from "../store";
import { usedDigits } from "../sudoku";

export function Tray() {
  const board = useGame((s) => s.board);
  const selectedCell = useGame((s) => s.selectedCell);
  const highlightMode = useGame((s) => s.highlightMode);
  const input = useGame((s) => s.input);

  const used = useMemo(() => usedDigits(highlightMode, selectedCell, board), [highlightMode, selectedCell, board]);

  return (
    <div className="tray" role="toolbar" aria-label="Album covers">
      {albums.map((a) => {
        const faded = used.has(a.digit);
        return (
          <button
            key={a.digit}
            className={`tray-slot${faded ? " is-faded" : ""}`}
            style={{ "--album": a.color } as React.CSSProperties}
            disabled={faded}
            onClick={() => input(a.digit)}
            aria-label={a.name}
          >
            <img src={a.cover} alt="" draggable={false} />
          </button>
        );
      })}
    </div>
  );
}
