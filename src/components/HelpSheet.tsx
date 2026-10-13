import { useEffect, useRef } from "react";
import { albums } from "../albums";

const RULES_URL = "https://sudoku.com/sudoku-rules/";

export function HelpSheet({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Focus for keyboard users without drawing a focus ring on open.
    closeRef.current?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet help" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <button ref={closeRef} className="help-close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>

        <h2 id="help-title" className="help-title">
          How to play
        </h2>
        <p className="help-lead">
          Switchin' the sudoku for you! Numbers 1-9 are now Ariana Grande albums. Fill every row, column and 3×3 box
          with all nine albums, using each one once.{" "}
          <a href={RULES_URL} target="_blank" rel="noreferrer">
            Read the full sudoku rules
          </a>{" "}
          (Math class never was good)
        </p>

        <h3>The albums</h3>
        <ul className="help-albums">
          {albums.map((a) => (
            <li key={a.digit} style={{ "--album": a.color } as React.CSSProperties}>
              <span className="help-cover">
                <img src={a.cover} alt="" draggable={false} />
                <span className="help-digit">{a.digit}</span>
              </span>
              <span className="help-name">{a.name}</span>
              <span className="help-swatch" aria-label={`Note colour ${a.color}`} />
            </li>
          ))}
        </ul>
        <p className="help-note">
          Notes appear as small squares in the album's colour. Each album has its own spot in the cell: 1 top-left
          through 9 bottom-right.
        </p>

        <h3>Controls</h3>
        <ul className="help-controls">
          <li>
            <b>Tap a cell</b> to select it. Tap it again to switch between column, row and box, then to deselect.
          </li>
          <li>
            <b>Tap a cover</b> below the board to place it. Covers already used in the highlighted area fade out.
          </li>
          <li>
            <b>Notes</b> switches to pencil marks; the screen flips to show it's on.
          </li>
          <li>
            <b>Hold</b> a cell with notes (or press Shift/Space on a computer) to see them as covers.
          </li>
          <li>
            <b>Erase</b> clears a cell. Undo with Ctrl/⌘+Z.
          </li>
        </ul>
      </div>
    </div>
  );
}
