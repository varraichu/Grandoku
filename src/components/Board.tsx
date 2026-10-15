import { useEffect, useMemo, useRef, type PointerEvent } from "react";
import { isMistake, useGame } from "../store";
import { albumFor, albums } from "../albums";
import { WAVE_RISE_MS, boxCells, boxOf, highlightedCells } from "../sudoku";
import { rippleDelay, type WinPhase } from "../winSequence";
import type { FlapFace } from "./SplitFlap";
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

/**
 * What a cell's flap shows in each win phase: its own cover, or (in the reveal) its ninth of
 * the box's album cover. Box N shows album N. No flap outside the sequence.
 */
const flapFace = (phase: WinPhase | null, i: number, value: number | null): FlapFace | undefined => {
  if (!phase || phase === "done" || value === null) return undefined;
  if (phase !== "reveal") return { src: albumFor(value).cover };
  return {
    src: albums[boxOf(i)].coverLarge,
    slice: { col: (i % 9) % 3, row: Math.floor(i / 9) % 3 },
  };
};

export function Board({ onHover, onPeek }: BoardProps) {
  const puzzle = useGame((s) => s.puzzle);
  const board = useGame((s) => s.board);
  const notes = useGame((s) => s.notes);
  const solution = useGame((s) => s.solution);
  const selectedCell = useGame((s) => s.selectedCell);
  const highlightMode = useGame((s) => s.highlightMode);
  const hintsOn = useGame((s) => s.hintsOn);
  const selectCell = useGame((s) => s.selectCell);
  const shake = useGame((s) => s.shake);
  const wave = useGame((s) => s.wave);
  const winPhase = useGame((s) => s.winPhase);

  // Drop the wave once its last cover has landed, so waving cells stop sitting above the rest.
  useEffect(() => {
    if (!wave) return;
    const t = window.setTimeout(
      () => {
        if (useGame.getState().wave?.id === wave.id) useGame.setState({ wave: null });
      },
      Math.max(...wave.delays.values()) + WAVE_RISE_MS,
    );
    return () => window.clearTimeout(t);
  }, [wave]);

  const highlighted = useMemo(
    () => (selectedCell === null ? new Set<number>() : highlightedCells(hintsOn ? highlightMode : null, selectedCell)),
    [hintsOn, highlightMode, selectedCell],
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
    // Tapping the board during the win sequence skips to the end.
    if (winPhase && winPhase !== "done") return useGame.setState({ winPhase: "done" });
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
              shakeId={shake?.cell === i ? shake.id : undefined}
              wave={wave?.delays.has(i) ? { id: wave.id, delay: wave.delays.get(i)! } : undefined}
              flap={flapFace(winPhase, i, board[i])}
              flapDelay={rippleDelay(i)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
