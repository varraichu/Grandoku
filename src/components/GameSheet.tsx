import { useEffect, useState } from "react";
// Imported (not in public/) so Vite inlines these small SVGs and the heading shows instantly.
import newGameArt from "../assets/new-game.svg";
import solvedArt from "../assets/solved.svg";
import gameOverArt from "../assets/game-over.svg";
import { MAX_MISTAKES, MISTAKE_PENALTY_S, HINT_PENALTY_S, resultOf, useGame, type Difficulty } from "../store";
import { renderResultImage, saveResultImage } from "../shareImage";
import { formatTime } from "./Header";
import { LEVELS } from "../puzzles";

const HEADINGS = {
  win: { art: solvedArt, alt: "Solved" },
  new: { art: newGameArt, alt: "New game" },
  lost: { art: gameOverArt, alt: "Game over" },
};

interface GameSheetProps {
  variant: "win" | "new" | "lost";
  /** New game only: offer Cancel (not on load, when there's no game of the player's to go back to). */
  cancellable?: boolean;
  onClose: () => void;
}

export function GameSheet({ variant, cancellable = true, onClose }: GameSheetProps) {
  const current = useGame((s) => s.difficulty);
  const elapsed = useGame((s) => s.elapsed);
  const newGame = useGame((s) => s.newGame);
  const restart = useGame((s) => s.restart);
  const mistakes = useGame((s) => s.mistakes);
  const hints = useGame((s) => s.hintedPlacements);
  const board = useGame((s) => s.board);
  const [difficulty, setDifficulty] = useState<Difficulty>(current);
  const [saving, setSaving] = useState<"idle" | "busy" | "failed">("idle");
  // The result image, rendered once when the summary opens: shown as the preview, and saved as is.
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);

  const result = resultOf({ elapsed, mistakes, hintedPlacements: hints, difficulty: current });
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  // How the score adds up: the time, then any penalties.
  const breakdown = [
    `Time ${formatTime(elapsed)}`,
    mistakes > 0 && `+${mistakes * MISTAKE_PENALTY_S}s mistakes`,
    hints > 0 && `+${hints * HINT_PENALTY_S}s hints`,
  ].filter(Boolean);

  useEffect(() => {
    if (variant !== "win") return;
    let url = "";
    let gone = false;
    renderResultImage(board, result)
      .then((blob) => {
        if (gone) return;
        url = URL.createObjectURL(blob);
        setImage({ blob, url });
      })
      .catch(() => !gone && setSaving("failed"));
    return () => {
      gone = true;
      if (url) URL.revokeObjectURL(url);
    };
    // Render once per win; the board and result don't change while the summary is open.
  }, [variant]);

  const save = async () => {
    if (!image) return;
    setSaving("busy");
    try {
      await saveResultImage(image.blob);
      setSaving("idle");
    } catch {
      setSaving("failed");
    }
  };

  return (
    <div className="sheet-backdrop">
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <h2 id="sheet-title">
          <img src={HEADINGS[variant].art} alt={HEADINGS[variant].alt} draggable={false} />
        </h2>
        {variant === "win" && (
          <div className="win-summary">
            {/* The preview carries the score and stats (they're drawn into the image). */}
            <div className="win-preview">
              {image && (
                <img
                  src={image.url}
                  alt={`Score ${formatTime(result.score)}. ${current} · ${plural(mistakes, "mistake")} · ${plural(hints, "hint")}`}
                  draggable={false}
                />
              )}
            </div>
            <p className="win-breakdown">{breakdown.join(" · ")}</p>
            <button className="win-save" onClick={save} disabled={!image || saving === "busy"}>
              {saving === "busy" ? "Saving…" : "Save image"}
            </button>
            {saving === "failed" && <p className="win-save-error">Couldn't save the image. Try again.</p>}
          </div>
        )}
        {variant === "lost" ? (
          <p className="sheet-time">{MAX_MISTAKES} mistakes · try this board again</p>
        ) : (
          <div className="difficulty-picker" role="radiogroup" aria-label="Difficulty">
            {LEVELS.map((d) => (
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
        )}
        <div className="sheet-actions">
          {variant === "new" && cancellable && (
            <button className="sheet-secondary" onClick={onClose}>
              Cancel
            </button>
          )}
          {variant === "lost" ? (
            <button className="sheet-primary" onClick={restart}>
              Restart
            </button>
          ) : (
            <button
              className="sheet-primary"
              onClick={() => {
                newGame(difficulty);
                onClose();
              }}
            >
              {variant === "win" ? "Play again" : "Start"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
