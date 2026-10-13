import { useGame } from "../store";

const today = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;
};

const formatTime = (s: number) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
};

export { formatTime };

export function Header({ onDifficultyClick }: { onDifficultyClick: () => void }) {
  const elapsed = useGame((s) => s.elapsed);
  const difficulty = useGame((s) => s.difficulty);

  return (
    <header className="header">
      <p className="notes-label" aria-hidden>
        Notes
      </p>
      <h1 className="title" aria-label="Ariana Grandoku">
        <span className="title-ariana">Ariana</span>
        <span className="title-g">G</span>
        <span className="title-randoku">randoku</span>
      </h1>
      <div className="meta">
        <span className="flip">{today()}</span>
        <button className="difficulty flip" onClick={onDifficultyClick} aria-label="Change difficulty">
          {difficulty}
        </button>
        <span className="flip timer" aria-label="Elapsed time">
          {formatTime(elapsed)}
        </span>
      </div>
    </header>
  );
}
