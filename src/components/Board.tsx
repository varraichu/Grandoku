import { useMemo, useRef, type PointerEvent } from "react";
import { isMistake, useGame } from "../store";
import { boxCells, highlightedCells } from "../sudoku";
import { Cell } from "./Cell";

const LONG_PRESS_MS = 450;
const MOVE_TOLERANCE = 10;

interface BoardProps {
  onHover: (i: number | null) => void;
  /** Long-press peek: called with a cell index to open, null to close. */
  onPeek: (i: number | null) => void;
}

const indexFromEvent = (e: { target: EventTarget }): number | null => {
  const el = (e.target as HTMLElement).closest<HTMLElement>("[data-index]");
  return el ? Number(el.dataset.index) : null;
};

export function Board({ onHover, onPeek }: BoardProps) {
  const puzzle = useGame((s) => s.puzzle);
  const board = useGame((s) => s.board);
  const notes = useGame((s) => s.notes);
  const solution = useGame((s) => s.solution);
  const selectedCell = useGame((s) => s.selectedCell);
  const highlightMode = useGame((s) => s.highlightMode);
  const selectCell = useGame((s) => s.selectCell);

  const highlighted = useMemo(
    () => (selectedCell === null ? new Set<number>() : highlightedCells(highlightMode, selectedCell)),
    [highlightMode, selectedCell],
  );

  const press = useRef<{ timer: number; x: number; y: number } | null>(null);
  const suppressClick = useRef(false);

  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };

  const onPointerDown = (e: PointerEvent) => {
    suppressClick.current = false;
    const i = indexFromEvent(e);
    if (i === null) return;
    const s = useGame.getState();
    if (s.board[i] !== null || s.notes[i].size === 0) return;
    cancelPress();
    press.current = {
      x: e.clientX,
      y: e.clientY,
      timer: window.setTimeout(() => {
        press.current = null;
        suppressClick.current = true;
        onPeek(i);
        const close = () => {
          onPeek(null);
          window.removeEventListener("pointerup", close);
          window.removeEventListener("pointercancel", close);
        };
        window.addEventListener("pointerup", close);
        window.addEventListener("pointercancel", close);
      }, LONG_PRESS_MS),
    };
  };

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType === "mouse") onHover(indexFromEvent(e));
    const p = press.current;
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > MOVE_TOLERANCE) cancelPress();
  };

  const onClick = (e: React.MouseEvent) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    const i = indexFromEvent(e);
    if (i !== null) selectCell(i);
  };

  return (
    <div
      className="board"
      role="grid"
      aria-label="Sudoku board"
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={cancelPress}
      onPointerCancel={cancelPress}
      onPointerLeave={() => {
        cancelPress();
        onHover(null);
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {Array.from({ length: 9 }, (_, b) => (
        <div className="box" key={b}>
          {boxCells(b).map((i) => (
            <Cell
              key={i}
              index={i}
              value={board[i]}
              notes={notes[i]}
              clue={puzzle[i] !== null}
              mistake={isMistake({ puzzle, board, solution }, i)}
              selected={selectedCell === i}
              highlighted={highlighted.has(i)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
