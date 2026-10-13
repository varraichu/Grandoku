import { useGame } from "../store";
import { MODE_LABELS } from "../sudoku";

export function Controls() {
  const notesMode = useGame((s) => s.notesMode);
  const highlightMode = useGame((s) => s.highlightMode);
  const erase = useGame((s) => s.erase);
  const toggleNotesMode = useGame((s) => s.toggleNotesMode);
  const cycleHighlightMode = useGame((s) => s.cycleHighlightMode);

  return (
    <div className="controls">
      <button className="control control-erase" onClick={erase}>
        <img src="/icons/Erase_icon.png" alt="" draggable={false} />
        <span>Erase</span>
      </button>
      <button
        className={`control control-notes${notesMode ? " is-on" : ""}`}
        onClick={toggleNotesMode}
        aria-pressed={notesMode}
      >
        <img src="/icons/Notes.webp" alt="" draggable={false} />
        <span>Notes</span>
      </button>
      <button
        className="control control-mode"
        onClick={cycleHighlightMode}
        aria-label={`Highlight mode: ${MODE_LABELS[highlightMode]}. Tap to change.`}
      >
        <span>{MODE_LABELS[highlightMode]}</span>
      </button>
    </div>
  );
}
