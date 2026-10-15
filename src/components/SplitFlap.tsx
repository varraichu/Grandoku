import { useLayoutEffect, useRef, useState } from "react";
import "./SplitFlap.css";

// ---- Tunable timings (defaults; the demo page can override them per flip) ----
/** One whole flip: the tile turns over (0 → -180°), the new cover coming round on its back. */
export const FLIP_MS = 750;
/** How far (degrees) the tile bounces back after landing. 0 = no settle. */
export const SETTLE_DEG = 6;
/** Darkness (0-1) of the tile when edge-on (90°), to fake shading. */
export const SHADE_MAX = 0.45;
/** One flip while a cell runs through in-between covers before landing on its final one. */
export const CYCLE_FLIP_MS = 300;
/** Point in the flip where the tile first lands (before the settle bounce). */
const LAND_AT = 0.78;

/** Time from a flip's start until the new face first lands (the settle bounce comes after). */
export const landsAfterMs = (t: FlapTiming = DEFAULT_TIMING) => t.flipMs * (t.settleDeg ? LAND_AT : 1);

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

/** CSS cubic-bezier timing function as a JS function of progress (0-1), for frame-driven flips. */
const cubicBezier = (x1: number, y1: number, x2: number, y2: number) => {
  const at = (a: number, b: number, t: number) => 3 * a * (1 - t) ** 2 * t + 3 * b * (1 - t) * t ** 2 + t ** 3;
  return (x: number) => {
    let lo = 0;
    let hi = 1;
    for (let n = 0; n < 20; n++) {
      const mid = (lo + hi) / 2;
      if (at(x1, x2, mid) < x) lo = mid;
      else hi = mid;
    }
    return at(y1, y2, (lo + hi) / 2);
  };
};

// The turn's curve (starts gently, carries through, eases into place), shared by the animated
// landing flip and the frame-driven in-between flips.
const TURN_CURVE = "cubic-bezier(0.45, 0, 0.25, 1)";
const TURN_EASE = cubicBezier(0.45, 0, 0.25, 1);

/** Shading peaks when the tile is edge-on and fades as either side faces the viewer. */
const shadeAt = (angleDeg: number, shade: number) => shade * Math.abs(Math.sin((angleDeg * Math.PI) / 180));

const setFace = (el: HTMLElement, f: FlapFace) => {
  el.style.backgroundImage = el.style.backgroundSize = el.style.backgroundPosition = "";
  Object.assign(el.style, faceStyle(f));
};

/** One turn of the tile (0 → -180°): tips toward the viewer, lands, optional settle bounce. */
function turnAnimations(
  card: HTMLElement,
  shades: HTMLElement[],
  { flipMs, settleDeg, shade, delay }: FlapTiming & { delay: number },
): Animation[] {
  const fill = "both" as const;
  const landAt = settleDeg ? LAND_AT : 1;
  return [
    card.animate(
      [
        { transform: "rotateX(0deg)", easing: TURN_CURVE },
        { transform: "rotateX(-180deg)", offset: landAt, easing: "ease-out" },
        ...(settleDeg
          ? [
              {
                transform: `rotateX(${-180 + settleDeg}deg)`,
                offset: landAt + (1 - landAt) / 2,
                easing: "ease-in-out",
              },
              { transform: "rotateX(-180deg)" },
            ]
          : []),
      ],
      { fill, duration: flipMs, delay },
    ),
    ...shades.map((sh) =>
      sh.animate(
        [{ opacity: 0 }, { opacity: shade, offset: landAt / 2 }, { opacity: 0, offset: landAt }, { opacity: 0 }],
        {
          fill,
          duration: flipMs,
          delay,
          easing: "ease-in-out",
        },
      ),
    ),
  ];
}

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Side({ face, side }: { face: FlapFace; side: "front" | "back" }) {
  return (
    <div className={`flap-side flap-${side}`}>
      <div className="flap-face" style={faceStyle(face)} />
      <div className="flap-shade" />
    </div>
  );
}

interface SplitFlapProps {
  /** The face to show. Changing it flips from the face currently shown to this one. */
  face: FlapFace;
  /** Wait before this flip starts (ms), for rippling a whole board. */
  delay?: number;
  /** Faces to turn through (CYCLE_FLIP_MS each) before landing on `face`. */
  via?: FlapFace[];
  timing?: FlapTiming;
  /** Crossfade instead of flipping (defaults to the user's reduced-motion setting). */
  reducedMotion?: boolean;
  /** The final face has landed (before its settle bounce). */
  onLand?: () => void;
  /** The flip has fully finished. */
  onDone?: () => void;
}

/**
 * A flipping cell. On a face change the whole tile turns over around its horizontal middle,
 * tipping toward the viewer (0 → -180°): the old cover on its front, the new one coming round on
 * its back, with a small settle. Never shows two half-covers at once. Transforms only.
 */
export function SplitFlap({
  face,
  delay = 0,
  via,
  timing = DEFAULT_TIMING,
  reducedMotion,
  onLand,
  onDone,
}: SplitFlapProps) {
  const [shown, setShown] = useState(face);
  const [flip, setFlip] = useState<{ from: FlapFace; to: FlapFace; via: FlapFace[] } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const onLandRef = useRef(onLand);
  onLandRef.current = onLand;

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
    let raf = 0;
    let clearInline = () => {};

    let landTimer = 0;
    const landIn = (ms: number) => {
      landTimer = window.setTimeout(() => !cancelled && onLandRef.current?.(), ms);
    };
    const finish = () => {
      setShown(flip.to);
      setFlip(null);
      onDoneRef.current?.();
    };

    if (fade) {
      const top = stage.querySelector<HTMLElement>(".flap-fade")!;
      anims = [top.animate([{ opacity: 0 }, { opacity: 1 }], { duration: timing.flipMs, delay, fill: "both" })];
      landIn(delay + timing.flipMs);
      Promise.all(anims.map((a) => a.finished))
        .then(() => !cancelled && finish())
        .catch(() => {}); // cancelled by a newer flip
    } else {
      // The tile: its front shows the face turning away, its back the face coming round.
      const card = stage.querySelector<HTMLElement>(".flap-card")!;
      const [front, back] = card.querySelectorAll<HTMLElement>(".flap-face");
      const shades = [...card.querySelectorAll<HTMLElement>(".flap-shade")];
      const paint = (to: FlapFace, from: FlapFace) => {
        setFace(front, from);
        setFace(back, to);
      };

      /**
       * Turn through the in-between faces, driven per frame from elapsed time: the face and angle
       * are computed for "now", so each turn lasts exactly CYCLE_FLIP_MS on screen (awaiting one
       * animation before starting the next loses ~2 frames per turn). Each turn ends showing its new
       * face upright on the back, which is then repainted onto the front for the next turn from 0°.
       */
      const rattle = () =>
        new Promise<FlapFace>((resolve) => {
          const via = flip.via;
          const start = performance.now() + delay;
          let step = -1;
          const frame = (now: number) => {
            if (cancelled) return;
            const t = now - start;
            if (t < 0) return void (raf = requestAnimationFrame(frame));
            const k = Math.floor(t / CYCLE_FLIP_MS);
            if (k >= via.length) return resolve(via[via.length - 1]);
            if (k !== step) {
              step = k;
              paint(via[k], k === 0 ? flip.from : via[k - 1]);
            }
            const angle = -180 * TURN_EASE((t - k * CYCLE_FLIP_MS) / CYCLE_FLIP_MS);
            card.style.transform = `rotateX(${angle}deg)`;
            shades.forEach((sh) => (sh.style.opacity = String(shadeAt(angle, timing.shade))));
            raf = requestAnimationFrame(frame);
          };
          raf = requestAnimationFrame(frame);
        });

      (async () => {
        let from = flip.from;
        if (flip.via.length) {
          from = await rattle();
          if (cancelled) return;
          clearInline();
        }
        // The landing turn onto the final face, at normal speed with its settle.
        const lead = flip.via.length ? 0 : delay;
        paint(flip.to, from);
        landIn(lead + landsAfterMs(timing));
        anims = turnAnimations(card, shades, { ...timing, delay: lead });
        try {
          await Promise.all(anims.map((a) => a.finished));
        } catch {
          return; // cancelled by a newer flip
        }
        if (!cancelled) finish();
      })();

      clearInline = () => {
        card.style.transform = "";
        shades.forEach((sh) => (sh.style.opacity = ""));
      };
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(landTimer);
      clearInline();
      anims.forEach((a) => a.cancel());
    };
    // Only (re)start when the flip itself changes; timing/delay are read at its start.
  }, [flip]);

  const fade = flip && (reducedMotion ?? prefersReducedMotion());

  return (
    <div className="flap">
      <div ref={stageRef} className="flap-stage">
        {!flip ? (
          <div className="flap-full" style={faceStyle(shown)} />
        ) : fade ? (
          <>
            <div className="flap-full" style={faceStyle(flip.from)} />
            <div className="flap-full flap-fade" style={faceStyle(flip.to)} />
          </>
        ) : (
          <div className="flap-card">
            <Side face={flip.from} side="front" />
            <Side face={flip.to} side="back" />
          </div>
        )}
      </div>
    </div>
  );
}
