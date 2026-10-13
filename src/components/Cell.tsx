import { memo } from "react";
import { albumFor, albums } from "../albums";

interface CellProps {
  index: number;
  value: number | null;
  notes: ReadonlySet<number>;
  clue: boolean;
  mistake: boolean;
  selected: boolean;
  highlighted: boolean;
}

export const Cell = memo(function Cell({ index, value, notes, clue, mistake, selected, highlighted }: CellProps) {
  const className = [
    "cell",
    highlighted && "is-highlighted",
    selected && "is-selected",
    value !== null && (clue ? "is-clue" : "is-entry"),
    mistake && "is-mistake",
  ]
    .filter(Boolean)
    .join(" ");

  const album = value !== null ? albumFor(value) : null;
  const label = `Row ${Math.floor(index / 9) + 1}, column ${(index % 9) + 1}: ${
    album ? `${album.name}${clue ? " (clue)" : ""}${mistake ? " (wrong)" : ""}` : "empty"
  }`;

  return (
    <div className={className} data-index={index} role="gridcell" aria-selected={selected} aria-label={label}>
      {album ? (
        <img className="cover" src={album.cover} alt="" draggable={false} />
      ) : notes.size > 0 ? (
        <div className="note-grid">
          {albums.map((a) => (
            <span key={a.digit} style={notes.has(a.digit) ? { background: a.color } : undefined} />
          ))}
        </div>
      ) : null}
    </div>
  );
});
