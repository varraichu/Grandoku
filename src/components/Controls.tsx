import { useGame } from "../store";
import { MODES, type HighlightMode } from "../sudoku";

const MODE_NAMES: Record<HighlightMode, string> = { column: "Column", row: "Row", box: "Box" };

// Which squares of a 3×3 mini grid each mode fills (row-major).
const MODE_GLYPHS: Record<HighlightMode, number[]> = {
  column: [1, 4, 7],
  row: [3, 4, 5],
  box: [0, 1, 3, 4],
};

function ModeGlyph({ mode }: { mode: HighlightMode }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden>
      {Array.from({ length: 9 }, (_, k) => (
        <rect
          key={k}
          x={(k % 3) * 5.5 + 0.5}
          y={Math.floor(k / 3) * 5.5 + 0.5}
          width="4"
          height="4"
          rx="1"
          className={MODE_GLYPHS[mode].includes(k) ? "is-filled" : undefined}
        />
      ))}
    </svg>
  );
}

/** Controls are tiles on offset colour blocks, like the tray covers: press sinks a tile, toggles stay sunk. */
export function Controls() {
  const notesMode = useGame((s) => s.notesMode);
  const hintsOn = useGame((s) => s.hintsOn);
  const highlightMode = useGame((s) => s.highlightMode);
  const erase = useGame((s) => s.erase);
  const toggleNotesMode = useGame((s) => s.toggleNotesMode);
  const toggleHints = useGame((s) => s.toggleHints);
  const setHighlightMode = useGame((s) => s.setHighlightMode);

  return (
    <div className="controls">
      <button className="tile tile-erase" onClick={erase}>
        <img src="/icons/erase.webp" alt="" draggable={false} />
        <span>Erase</span>
      </button>
      <button
        className={`tile tile-notes${notesMode ? " is-on" : ""}`}
        onClick={toggleNotesMode}
        aria-pressed={notesMode}
      >
        <img src="/icons/notes.webp" alt="" draggable={false} />
        <span>Notes</span>
      </button>
      <div className={`tile tile-hints${hintsOn ? " is-on" : ""}`}>
        <button className="hints-toggle" onClick={toggleHints} aria-pressed={hintsOn}>
          <span className="hints-bulb" aria-hidden>
            💡
          </span>
          <span>Hints</span>
        </button>
        <div className="hints-modes" role="radiogroup" aria-label="Hint area">
          {MODES.map((m) => {
            const active = hintsOn && highlightMode === m;
            return (
              <button
                key={m}
                role="radio"
                aria-checked={active}
                aria-label={MODE_NAMES[m]}
                title={MODE_NAMES[m]}
                className={`hints-mode${active ? " is-active" : ""}${highlightMode === m ? " is-current" : ""}`}
                onClick={() => setHighlightMode(m)}
              >
                <ModeGlyph mode={m} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
