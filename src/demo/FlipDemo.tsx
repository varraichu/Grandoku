import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { albums } from "../albums";
import { DEFAULT_TIMING, SplitFlap, type FlapFace, type FlapTiming } from "../components/SplitFlap";
import "./FlipDemo.css";

// Solved-board face: the cell's own cover. Reveal face: its ninth of the box's album cover.
const CELL_COVER: FlapFace = { src: albums[3].cover }; // Sweetener
const SLICE: FlapFace = { src: albums[5].cover, slice: { col: 1, row: 1 } }; // centre ninth of Positions

const BOX_SOLVED = [4, 9, 2, 7, 1, 6, 3, 8, 5].map((d): FlapFace => ({ src: albums[d - 1].cover }));
const BOX_REVEAL = BOX_SOLVED.map((_, k): FlapFace => ({
  src: albums[0].cover,
  slice: { col: k % 3, row: Math.floor(k / 3) },
}));
const RIPPLE_MS = 40;

function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="demo-slider">
      <span>
        {props.label}{" "}
        <b>
          {props.value}
          {props.unit}
        </b>
      </span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Demo() {
  const [revealed, setRevealed] = useState(false);
  const [timing, setTiming] = useState<FlapTiming>(DEFAULT_TIMING);
  const [fade, setFade] = useState(false);
  const set = (k: keyof FlapTiming) => (v: number) => setTiming((t) => ({ ...t, [k]: v }));

  return (
    <main className="demo">
      <h1>Split-flap cell</h1>
      <p className="demo-lead">One board cell flipping between its solved cover and its slice of the reveal cover.</p>

      <div className="demo-stage">
        <figure>
          <div className="demo-cell demo-cell-real">
            <SplitFlap face={revealed ? SLICE : CELL_COVER} timing={timing} reducedMotion={fade} />
          </div>
          <figcaption>Phone size</figcaption>
        </figure>
        <figure>
          <div className="demo-cell demo-cell-big">
            <SplitFlap face={revealed ? SLICE : CELL_COVER} timing={timing} reducedMotion={fade} />
          </div>
          <figcaption>4× zoom</figcaption>
        </figure>
        <figure>
          <div className="demo-box">
            {BOX_SOLVED.map((f, k) => (
              <div key={k} className="demo-box-cell">
                <SplitFlap
                  face={revealed ? BOX_REVEAL[k] : f}
                  delay={(Math.floor(k / 3) + (k % 3)) * RIPPLE_MS}
                  timing={timing}
                  reducedMotion={fade}
                />
              </div>
            ))}
          </div>
          <figcaption>A 3×3 box, rippling</figcaption>
        </figure>
      </div>

      <button className="demo-flip" onClick={() => setRevealed((r) => !r)}>
        Flip
      </button>

      <div className="demo-controls">
        <Slider
          label="Flip length"
          value={timing.flipMs}
          min={120}
          max={800}
          step={10}
          unit="ms"
          onChange={set("flipMs")}
        />
        <Slider
          label="Settle bounce"
          value={timing.settleDeg}
          min={0}
          max={20}
          step={1}
          unit="°"
          onChange={set("settleDeg")}
        />
        <Slider label="Shading" value={timing.shade} min={0} max={0.9} step={0.05} unit="" onChange={set("shade")} />
        <label className="demo-check">
          <input type="checkbox" checked={fade} onChange={(e) => setFade(e.target.checked)} /> Reduced motion
          (crossfade)
        </label>
        <button className="demo-reset" onClick={() => setTiming(DEFAULT_TIMING)}>
          Reset to defaults
        </button>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
);
