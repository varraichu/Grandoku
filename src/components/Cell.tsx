import { memo, useLayoutEffect, useRef } from "react";
import { albumFor, albums } from "../albums";
import { SplitFlap, type FlapFace, type FlapTiming } from "./SplitFlap";

interface CellProps {
  index: number;
  value: number | null;
  notes: ReadonlySet<number>;
  clue: boolean;
  mistake: boolean;
  selected: boolean;
  highlighted: boolean;
  /** Set on a just-made wrong placement; a new value replays the shake. */
  shakeId?: number;
  /** Set while a completion wave runs through this cell; a new `id` replays it. */
  wave?: { id: number; delay: number };
  /** Win sequence: the cell shows a split-flap with this face instead of its cover. */
  flap?: FlapFace;
  flapDelay?: number;
  /** Faces the flap rattles through before landing on `flap`. */
  flapVia?: FlapFace[];
  flapTiming?: FlapTiming;
  onFlapLand?: () => void;
  onFlapDone?: () => void;
}

export const Cell = memo(function Cell({
  index,
  value,
  notes,
  clue,
  mistake,
  selected,
  highlighted,
  shakeId,
  wave,
  flap,
  flapDelay,
  flapVia,
  flapTiming,
  onFlapLand,
  onFlapDone,
}: CellProps) {
  const cellRef = useRef<HTMLDivElement>(null);

  // Replay the shake/wave on the same elements (cover, tint, mistake ring). Remounting the
  // cover instead (e.g. via `key`) makes phones paint it blank for a frame, like a reload.
  useLayoutEffect(() => {
    cellRef.current?.getAnimations({ subtree: true }).forEach((a) => {
      a.cancel();
      a.play();
    });
  }, [shakeId, wave?.id]);

  const className = [
    "cell",
    highlighted && "is-highlighted",
    selected && "is-selected",
    value !== null && (clue ? "is-clue" : "is-entry"),
    mistake && "is-mistake",
    shakeId !== undefined && "is-shaking",
    wave && "is-waving",
  ]
    .filter(Boolean)
    .join(" ");

  const album = value !== null ? albumFor(value) : null;
  const label = `Row ${Math.floor(index / 9) + 1}, column ${(index % 9) + 1}: ${
    album ? `${album.name}${clue ? " (clue)" : ""}${mistake ? " (wrong)" : ""}` : "empty"
  }`;

  return (
    <div
      ref={cellRef}
      className={className}
      data-index={index}
      role="gridcell"
      aria-selected={selected}
      aria-label={label}
      style={wave ? ({ "--wave-delay": `${wave.delay}ms` } as React.CSSProperties) : undefined}
    >
      {flap ? (
        <SplitFlap
          face={flap}
          delay={flapDelay}
          via={flapVia}
          timing={flapTiming}
          onLand={onFlapLand}
          onDone={onFlapDone}
        />
      ) : album ? (
        <img className="cover" src={album.cover} alt="" draggable={false} />
      ) : notes.size > 0 ? (
        <div className="note-grid">
          {albums.map((a) => (
            <span
              key={a.digit}
              className={notes.has(a.digit) ? "is-on" : undefined}
              style={notes.has(a.digit) ? { background: a.color } : undefined}
            />
          ))}
        </div>
      ) : null}
      {mistake && <span className="mistake-ring" aria-hidden />}
    </div>
  );
});
