import { useState } from "react";
// Imported (not in public/) so Vite inlines these small SVGs and the heading shows instantly.
import newGameArt from "../assets/new-game.svg";
import solvedArt from "../assets/solved.svg";
import { useGame, type Difficulty } from "../store";
import { formatTime } from "./Header";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "expert", "master"];

export function GameSheet({ variant, onClose }: { variant: "win" | "new"; onClose: () => void }) {
  const current = useGame((s) => s.difficulty);
  const elapsed = useGame((s) => s.elapsed);
  const newGame = useGame((s) => s.newGame);
  const [difficulty, setDifficulty] = useState<Difficulty>(current);

  return (
    <div className="sheet-backdrop">
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <h2 id="sheet-title">
          <img
            src={variant === "win" ? solvedArt : newGameArt}
            alt={variant === "win" ? "Solved" : "New game"}
            draggable={false}
          />
        </h2>
        {variant === "win" && (
          <p className="sheet-time">
            {current[0].toUpperCase() + current.slice(1)} · {formatTime(elapsed)}
          </p>
        )}
        <div className="difficulty-picker" role="radiogroup" aria-label="Difficulty">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              role="radio"
              aria-checked={difficulty === d}
              className={difficulty === d ? "is-active" : ""}
              onClick={() => setDifficulty(d)}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="sheet-actions">
          {variant === "new" && (
            <button className="sheet-secondary" onClick={onClose}>
              Cancel
            </button>
          )}
          <button
            className="sheet-primary"
            onClick={() => {
              newGame(difficulty);
              onClose();
            }}
          >
            {variant === "win" ? "Play again" : "Start"}
          </button>
        </div>
      </div>
    </div>
  );
}
