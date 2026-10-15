import { useEffect, useRef, useState } from "react";
import { useGame } from "../store";
import { MODES, MODE_LABELS } from "../sudoku";

const MENU_LABELS = { column: "Column", row: "Row", box: "Box" } as const;

export function Controls() {
  const notesMode = useGame((s) => s.notesMode);
  const hintsOn = useGame((s) => s.hintsOn);
  const highlightMode = useGame((s) => s.highlightMode);
  const erase = useGame((s) => s.erase);
  const toggleNotesMode = useGame((s) => s.toggleNotesMode);
  const toggleHints = useGame((s) => s.toggleHints);
  const setHighlightMode = useGame((s) => s.setHighlightMode);

  const [menuOpen, setMenuOpen] = useState(false);
  const hintsRef = useRef<HTMLDivElement>(null);

  // Close the mode menu on a tap outside it or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!hintsRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <div className="controls">
      <button className="control control-erase" onClick={erase}>
        <img src="/icons/erase.webp" alt="" draggable={false} />
        <span>Erase</span>
      </button>
      <button
        className={`control control-notes${notesMode ? " is-on" : ""}`}
        onClick={toggleNotesMode}
        aria-pressed={notesMode}
      >
        <img src="/icons/notes.webp" alt="" draggable={false} />
        <span>Notes</span>
      </button>
      {/* Split button: the bulb turns hints on/off, the side segment picks the unit they cover. */}
      <div ref={hintsRef} className={`control control-hints${hintsOn ? " is-on" : ""}`}>
        <div className="hints-split">
          <button className="hints-toggle" onClick={toggleHints} aria-pressed={hintsOn} aria-label="Hints">
            <span aria-hidden>💡</span>
          </button>
          <button
            className="hints-mode"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Hint area: ${MENU_LABELS[highlightMode]}. Change.`}
          >
            {MODE_LABELS[highlightMode]}
            <svg viewBox="0 0 10 6" aria-hidden>
              <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <span aria-hidden>Hints</span>
        {menuOpen && (
          <div className="hints-menu" role="menu" aria-label="Hint area">
            {MODES.map((m) => (
              <button
                key={m}
                role="menuitemradio"
                aria-checked={hintsOn && highlightMode === m}
                className={hintsOn && highlightMode === m ? "is-active" : ""}
                onClick={() => {
                  setHighlightMode(m);
                  setMenuOpen(false);
                }}
              >
                {MENU_LABELS[m]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
