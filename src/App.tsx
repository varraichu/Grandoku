import { useCallback, useEffect, useState } from "react";
import { useGame } from "./store";
import { Header, Meta } from "./components/Header";
import { Board } from "./components/Board";
import { Controls } from "./components/Controls";
import { Tray } from "./components/Tray";
import { NotePeek } from "./components/NotePeek";
import { GameSheet } from "./components/GameSheet";
import { HelpSheet } from "./components/HelpSheet";
import { Tattoos } from "./components/Tattoos";
import { useBoardIntro, useWinSequence } from "./winSequence";

const HELP_SEEN_KEY = "grandoku:help-seen";

const hasSeenHelp = () => {
  try {
    return localStorage.getItem(HELP_SEEN_KEY) === "1";
  } catch {
    return false;
  }
};

const isPeekKey = (e: KeyboardEvent) => e.key === "Shift" || e.key === " ";

export function App() {
  const notesMode = useGame((s) => s.notesMode);
  const won = useGame((s) => s.won);
  const winPhase = useGame((s) => s.winPhase);

  useWinSequence();
  useBoardIntro();
  const lost = useGame((s) => s.lost);
  const selectedCell = useGame((s) => s.selectedCell);
  const notes = useGame((s) => s.notes);

  const [hoveredCell, setHoveredCell] = useState<number | null>(null);
  const [peekKeyHeld, setPeekKeyHeld] = useState(false);
  const [longPressCell, setLongPressCell] = useState<number | null>(null);
  // The level picker opens on every load (after the first-visit help, if that's showing).
  const [newGameOpen, setNewGameOpen] = useState(true);
  const [pickerOnLoad, setPickerOnLoad] = useState(true);
  const [helpOpen, setHelpOpen] = useState(() => !hasSeenHelp());

  const closeHelp = useCallback(() => {
    setHelpOpen(false);
    try {
      localStorage.setItem(HELP_SEEN_KEY, "1");
    } catch {
      // Private mode etc.: the popup just shows again next visit.
    }
  }, []);

  // Timer: ticks once a second while the tab is visible and the game is unsolved.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") useGame.getState().tick();
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Keyboard: covers 1-9, erase, arrows, notes toggle, undo, and hold-to-peek.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.querySelector('[aria-modal="true"]')) return; // a dialog owns the keyboard
      const s = useGame.getState();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        s.undo();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isPeekKey(e)) {
        if (e.key === " ") e.preventDefault();
        setPeekKeyHeld(true);
        return;
      }
      if (/^[1-9]$/.test(e.key)) s.input(Number(e.key));
      else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") s.erase();
      else if (e.key === "ArrowUp") s.moveSelection(-1, 0);
      else if (e.key === "ArrowDown") s.moveSelection(1, 0);
      else if (e.key === "ArrowLeft") s.moveSelection(0, -1);
      else if (e.key === "ArrowRight") s.moveSelection(0, 1);
      else if (e.key.toLowerCase() === "n") s.toggleNotesMode();
      else if (e.key.toLowerCase() === "m") s.cycleHighlightMode();
      else if (e.key.toLowerCase() === "h") s.toggleHints();
      else if (e.key === "Escape") useGame.setState({ selectedCell: null });
      else return;
      e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!isPeekKey(e)) return;
      if (e.key === " ") e.preventDefault(); // stop Space from activating a focused button
      setPeekKeyHeld(false);
    };
    const onBlur = () => setPeekKeyHeld(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const hasNotes = (i: number | null): i is number => i !== null && notes[i].size > 0;
  const keyPeekCell = !peekKeyHeld
    ? null
    : hasNotes(hoveredCell)
      ? hoveredCell
      : hasNotes(selectedCell)
        ? selectedCell
        : null;
  const peekCell = longPressCell ?? keyPeekCell;

  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", notesMode ? "#c9c3c1" : "#eae5d9");
  }, [notesMode]);

  return (
    <div className={`app${notesMode ? " notes-mode" : ""}`}>
      <Tattoos />
      <main className="screen">
        <Header onHelpClick={() => setHelpOpen(true)} />
        {/* Grouped so the screen's even spacing keeps the meta row hugging the board. */}
        <div className="play">
          <Meta
            onDifficultyClick={() => {
              setPickerOnLoad(false);
              setNewGameOpen(true);
            }}
          />
          <Board onHover={setHoveredCell} onPeek={setLongPressCell} />
        </div>
        <Controls />
        <Tray />
      </main>
      {peekCell !== null && (
        <NotePeek
          cell={peekCell}
          capturePointer={longPressCell !== null}
          onClose={() => {
            setLongPressCell(null);
            setPeekKeyHeld(false);
          }}
        />
      )}
      {won && winPhase === "done" && <GameSheet variant="win" onClose={() => {}} />}
      {lost && <GameSheet variant="lost" onClose={() => {}} />}
      {!won && !lost && !helpOpen && newGameOpen && (
        <GameSheet variant="new" cancellable={!pickerOnLoad} onClose={() => setNewGameOpen(false)} />
      )}
      {helpOpen && <HelpSheet onClose={closeHelp} />}
    </div>
  );
}
