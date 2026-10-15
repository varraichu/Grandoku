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
/** One quick flip while a cell rattles through in-between faces (like letters on a departures board). */
export const CYCLE_FLIP_MS = 80;
/** Point in the bottom flap's fall where it first lands (before the settle bounce). */
const LAND_AT = 0.72;

/** Time from a flip's start until the new face first lands (the settle bounce comes after). */
export const landsAfterMs = (t: FlapTiming = DEFAULT_TIMING) =>
  t.flipMs * TOP_SHARE + t.flipMs * (1 - TOP_SHARE) * (t.settleDeg ? LAND_AT : 1);

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

const setFace = (el: HTMLElement, f: FlapFace) => {
  el.style.backgroundImage = el.style.backgroundSize = el.style.backgroundPosition = "";
  Object.assign(el.style, faceStyle(f));
};

/** One flip: the old top half falls (0 → -90°), then the new bottom half lands (90° → 0), with optional settle. */
function flapAnimations(
  topLeaf: HTMLElement,
  bottomLeaf: HTMLElement,
  { flipMs, settleDeg, shade, delay }: FlapTiming & { delay: number },
): Animation[] {
  const topMs = flipMs * TOP_SHARE;
  const bottomMs = flipMs - topMs;
  const fill = "both" as const;
  return [
    // Top flap: accelerates as it falls toward the viewer, darkening as it turns edge-on.
    topLeaf.animate([{ transform: "rotateX(0deg)" }, { transform: "rotateX(-90deg)" }], {
      fill,
      duration: topMs,
      delay,
      easing: "cubic-bezier(0.55, 0, 1, 0.45)",
    }),
    topLeaf.querySelector(".flap-shade")!.animate([{ opacity: 0 }, { opacity: shade }], {
      fill,
      duration: topMs,
      delay,
      easing: "ease-in",
    }),
    // Bottom flap: lands from edge-on, bounces up a touch, settles.
    bottomLeaf.animate(
      [
        { transform: "rotateX(90deg)", easing: "cubic-bezier(0.3, 0, 0.8, 0.4)" },
        { transform: "rotateX(0deg)", offset: settleDeg ? LAND_AT : 1, easing: "ease-out" },
        ...(settleDeg
          ? [{ transform: `rotateX(${settleDeg}deg)`, offset: 0.86, easing: "ease-in" }, { transform: "rotateX(0deg)" }]
          : []),
      ],
      { fill, duration: bottomMs, delay: delay + topMs },
    ),
    bottomLeaf
      .querySelector(".flap-shade")!
      .animate([{ opacity: shade }, { opacity: 0, offset: LAND_AT }, { opacity: 0 }], {
        fill,
        duration: bottomMs,
        delay: delay + topMs,
      }),
  ];
}

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
  /** Faces to rattle through quickly (CYCLE_FLIP_MS each) before landing on `face`. */
  via?: FlapFace[];
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
export function SplitFlap({ face, delay = 0, via, timing = DEFAULT_TIMING, reducedMotion, onDone }: SplitFlapProps) {
  const [shown, setShown] = useState(face);
  const [flip, setFlip] = useState<{ from: FlapFace; to: FlapFace; via: FlapFace[] } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // A new face arrives: flip from whatever is showing now.
  if (faceKey(face) !== faceKey(flip ? flip.to : shown)) {
    setFlip({ from: flip ? flip.to : shown, to: face, via: via ?? [] });
  }

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!flip || !stage) return;
    const fade = reducedMotion ?? prefersReducedMotion();
    let anims: Animation[] = [];
    let cancelled = false;

    const finish = () => {
      setShown(flip.to);
      setFlip(null);
      onDoneRef.current?.();
    };

    if (fade) {
      const top = stage.querySelector<HTMLElement>(".flap-fade")!;
      anims = [top.animate([{ opacity: 0 }, { opacity: 1 }], { duration: timing.flipMs, delay, fill: "both" })];
      Promise.all(anims.map((a) => a.finished))
        .then(() => !cancelled && finish())
        .catch(() => {}); // cancelled by a newer flip
    } else {
      // [still top (new), still bottom (old), falling top (old), landing bottom (new)]
      const faces = stage.querySelectorAll<HTMLElement>(".flap-face");
      const [topLeaf, bottomLeaf] = stage.querySelectorAll<HTMLElement>(".flap-leaf");
      const steps = [...flip.via, flip.to];

      (async () => {
        let from = flip.from;
        for (let k = 0; k < steps.length; k++) {
          const to = steps[k];
          const landing = k === steps.length - 1;
          // Repaint the four halves for this step in place (no re-render), then flip.
          [to, from, from, to].forEach((f, n) => setFace(faces[n], f));
          const prev = anims;
          anims = flapAnimations(topLeaf, bottomLeaf, {
            flipMs: landing ? timing.flipMs : CYCLE_FLIP_MS,
            settleDeg: landing ? timing.settleDeg : 0,
            shade: landing ? timing.shade : timing.shade * 0.6,
            delay: k === 0 ? delay : 0,
          });
          prev.forEach((a) => a.cancel());
          try {
            await Promise.all(anims.map((a) => a.finished));
          } catch {
            return; // cancelled by a newer flip
          }
          if (cancelled) return;
          from = to;
        }
        finish();
      })();
    }

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
