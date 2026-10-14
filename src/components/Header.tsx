import { MAX_MISTAKES, useGame } from "../store";

const formatTime = (s: number) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
};

export { formatTime };

export function Header({ onHelpClick }: { onHelpClick: () => void }) {
  return (
    <header className="header">
      <button className="help-button" onClick={onHelpClick} aria-label="How to play">
        ?
      </button>
      <p className="notes-label" aria-hidden>
        Notes
      </p>
      <h1 className="title">
        {/* Outlined from the licensed fonts so no font files are shipped. */}
        <img className="title-art" src="/type/title.svg" alt="Ariana Grandoku" draggable={false} />
      </h1>
    </header>
  );
}

/** Mistakes · difficulty · time, sitting just above the board. */
export function Meta({ onDifficultyClick }: { onDifficultyClick: () => void }) {
  const elapsed = useGame((s) => s.elapsed);
  const difficulty = useGame((s) => s.difficulty);
  const mistakes = useGame((s) => s.mistakes);

  return (
    <div className="meta">
      <div
        className={`meta-stat mistakes flip${mistakes > 0 ? " has-mistakes" : ""}`}
        aria-label={`${mistakes} of ${MAX_MISTAKES} mistakes`}
      >
        <span className="meta-label">Mistakes</span>
        <span className="meta-value">
          {mistakes}/{MAX_MISTAKES}
          <img className="ring" src="/icons/Ring.svg" alt="" draggable={false} />
        </span>
      </div>
      <button className="difficulty flip" onClick={onDifficultyClick} aria-label="Change difficulty">
        {difficulty}
      </button>
      <div className="meta-stat timer flip" aria-label="Elapsed time">
        <span className="meta-label">Time</span>
        <span className="meta-value">{formatTime(elapsed)}</span>
      </div>
    </div>
  );
}
