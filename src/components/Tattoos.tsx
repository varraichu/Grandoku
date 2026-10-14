import { memo, useState } from "react";

const TATTOOS = [
  "clouds",
  "h2gkmo",
  "heart",
  "japanese",
  "leaves",
  "moon",
  "saturn",
  "tears",
  "toulouse",
  "umbrella",
];

interface Placement {
  name: string;
  x: number; // % of viewport width
  y: number; // % of viewport height
  size: number; // design units (× --u)
  rotate: number; // degrees
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Jittered grid: one tattoo per grid cell, at a random spot inside it, so they scatter
 * across the whole screen without clumping. Fresh layout on every page load.
 */
function scatter(): Placement[] {
  const landscape = window.innerWidth > window.innerHeight;
  const [cols, rows] = landscape ? [5, 2] : [2, 5];
  const names = [...TATTOOS].sort(() => Math.random() - 0.5);
  return names.map((name, k) => {
    const col = k % cols;
    const row = Math.floor(k / cols);
    return {
      name,
      x: ((col + rand(0.15, 0.85)) / cols) * 100,
      y: ((row + rand(0.15, 0.85)) / rows) * 100,
      size: rand(55, 95),
      rotate: rand(-180, 180),
    };
  });
}

export const Tattoos = memo(function Tattoos() {
  const [placements] = useState(scatter);

  return (
    <div className="tattoos" aria-hidden>
      {placements.map((p) => (
        <img
          key={p.name}
          className="tattoo"
          src={`/tattoos/${p.name}.webp`}
          alt=""
          draggable={false}
          style={
            {
              left: `${p.x}%`,
              top: `${p.y}%`,
              "--size": p.size,
              "--rotate": `${p.rotate}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
});
