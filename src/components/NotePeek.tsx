import { albums } from "../albums";
import { useGame } from "../store";

interface NotePeekProps {
  cell: number;
  /** Long-press peeks take the pointer so a tap outside closes them; key-held peeks let hover pass through. */
  capturePointer: boolean;
  onClose: () => void;
}

export function NotePeek({ cell, capturePointer, onClose }: NotePeekProps) {
  const notes = useGame((s) => s.notes[cell]);

  return (
    <div className={`peek-backdrop${capturePointer ? "" : " is-passive"}`} onPointerDown={onClose}>
      <div className="peek" role="dialog" aria-label="Notes in this cell">
        {albums.map((a) =>
          notes.has(a.digit) ? (
            <figure key={a.digit} className="peek-item" style={{ "--album": a.color } as React.CSSProperties}>
              <img src={a.cover} alt="" draggable={false} />
              <figcaption>{a.name}</figcaption>
            </figure>
          ) : (
            <div key={a.digit} className="peek-item is-empty" />
          ),
        )}
      </div>
    </div>
  );
}
