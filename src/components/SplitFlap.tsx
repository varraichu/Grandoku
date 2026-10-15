import { useLayoutEffect, useRef, useState } from "react";
import "./SplitFlap.css";

// ---- Tunable timings (defaults; the demo page can override them per flip) ----
/** One whole flip: top flap falls, then bottom flap lands. */
export const FLIP_MS = 550;
/** Share of FLIP_MS spent on the top flap falling (the rest is the bottom flap landing). */
export const TOP_SHARE = 0.45;
/** How far (degrees) the bottom flap bounces back up after landing. 0 = no settle. */
export const SETTLE_DEG = 4;
/** Darkness (0-1) of a flap at 90°, to fake shading. */
export const SHADE_MAX = 0.45;

export interface FlapTiming {
  flipMs: number;
  settleDeg: number;
  shade: number;
}

export const DEFAULT_TIMING: FlapTiming = { flipMs: FLIP_MS, settleDeg: SETTLE_DEG, shade: SHADE_MAX };

/** What a cell shows: a whole cover, or one ninth of a cover sliced across a 3×3 box. */
export interface FlapFace {
  src: string;
  slice?: { col: number; row: number };
}

const faceKey = (f: FlapFace) => `${f.src}|${f.slice ? `${f.slice.col},${f.slice.row}` : ""}`;

/** An empty `src` is a blank face: the cell background shows through. */
const faceStyle = (f: FlapFace): React.CSSProperties =>
  !f.src
    ? {}
    : {
        backgroundImage: `url(${f.src})`,
        backgroundSize: f.slice ? "300% 300%" : "cover",
        backgroundPosition: f.slice ? `${f.slice.col * 50}% ${f.slice.row * 50}%` : "center",
      };

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Half({ face, part, leaf }: { face: FlapFace; part: "top" | "bottom"; leaf?: boolean }) {
  return (
    <div className={`flap-half flap-${part}${leaf ? " flap-leaf" : ""}`}>
      <div className="flap-face" style={faceStyle(face)} />
      {leaf && <div className="flap-shade" />}
    </div>
  );
}

interface SplitFlapProps {
  /** The face to show. Changing it flips from the face currently shown to this one. */
  face: FlapFace;
  /** Wait before this flip starts (ms), for rippling a whole board. */
  delay?: number;
  timing?: FlapTiming;
  /** Crossfade instead of flipping (defaults to the user's reduced-motion setting). */
  reducedMotion?: boolean;
  onDone?: () => void;
}

/**
 * A split-flap (Solari board) cell. On a face change the top half of the old face hinges
 * down at the midline (0 → -90°) uncovering the new top half, then the new bottom half
 * falls from 90° to 0 over the old bottom half, with a small settle. Transforms only.
 */
export function SplitFlap({ face, delay = 0, timing = DEFAULT_TIMING, reducedMotion, onDone }: SplitFlapProps) {
  const [shown, setShown] = useState(face);
  const [flip, setFlip] = useState<{ from: FlapFace; to: FlapFace } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // A new face arrives: flip from whatever is showing now.
  if (faceKey(face) !== faceKey(flip ? flip.to : shown)) {
    setFlip({ from: flip ? flip.to : shown, to: face });
  }

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!flip || !stage) return;
    const { flipMs, settleDeg, shade } = timing;
    const fade = reducedMotion ?? prefersReducedMotion();
    const finish = () => {
      setShown(flip.to);
      setFlip(null);
      onDoneRef.current?.();
    };

    let anims: Animation[];
    if (fade) {
      const top = stage.querySelector<HTMLElement>(".flap-fade")!;
      anims = [top.animate([{ opacity: 0 }, { opacity: 1 }], { duration: flipMs, delay, fill: "both" })];
    } else {
      const topMs = flipMs * TOP_SHARE;
      const bottomMs = flipMs - topMs;
      const [topLeaf, bottomLeaf] = stage.querySelectorAll<HTMLElement>(".flap-leaf");
      const ease = { fill: "both" as const };
      anims = [
        // Top flap: accelerates as it falls toward the viewer, darkening as it turns edge-on.
        topLeaf.animate([{ transform: "rotateX(0deg)" }, { transform: "rotateX(-90deg)" }], {
          ...ease,
          duration: topMs,
          delay,
          easing: "cubic-bezier(0.55, 0, 1, 0.45)",
        }),
        topLeaf.querySelector(".flap-shade")!.animate([{ opacity: 0 }, { opacity: shade }], {
          ...ease,
          duration: topMs,
          delay,
          easing: "ease-in",
        }),
        // Bottom flap: lands from edge-on, bounces up a touch, settles.
        bottomLeaf.animate(
          [
            { transform: "rotateX(90deg)", easing: "cubic-bezier(0.3, 0, 0.8, 0.4)" },
            { transform: "rotateX(0deg)", offset: settleDeg ? 0.72 : 1, easing: "ease-out" },
            ...(settleDeg
              ? [
                  { transform: `rotateX(${settleDeg}deg)`, offset: 0.86, easing: "ease-in" },
                  { transform: "rotateX(0deg)" },
                ]
              : []),
          ],
          { ...ease, duration: bottomMs, delay: delay + topMs },
        ),
        bottomLeaf
          .querySelector(".flap-shade")!
          .animate([{ opacity: shade }, { opacity: 0, offset: 0.72 }, { opacity: 0 }], {
            ...ease,
            duration: bottomMs,
            delay: delay + topMs,
          }),
      ];
    }

    let cancelled = false;
    Promise.all(anims.map((a) => a.finished))
      .then(() => !cancelled && finish())
      .catch(() => {}); // cancelled by a newer flip
    return () => {
      cancelled = true;
      anims.forEach((a) => a.cancel());
    };
    // Only (re)start when the flip itself changes; timing/delay are read at its start.
  }, [flip]);

  const fade = flip && (reducedMotion ?? prefersReducedMotion());

  return (
    <div className="flap">
      <div ref={stageRef} className={`flap-stage${flip && !fade ? " is-flipping" : ""}`}>
        {!flip ? (
          <div className="flap-full" style={faceStyle(shown)} />
        ) : fade ? (
          <>
            <div className="flap-full" style={faceStyle(flip.from)} />
            <div className="flap-full flap-fade" style={faceStyle(flip.to)} />
          </>
        ) : (
          <>
            <Half face={flip.to} part="top" />
            <Half face={flip.from} part="bottom" />
            <Half face={flip.from} part="top" leaf />
            <Half face={flip.to} part="bottom" leaf />
          </>
        )}
      </div>
    </div>
  );
}
