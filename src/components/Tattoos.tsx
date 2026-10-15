import { memo, useState } from "react";

// Aspect ratios (width / height) of the tightly cropped images in public/tattoos.
// `scale` is a per-tattoo visual tweak on top of the shared size.
export const TATTOOS = [
  { name: "clouds", aspect: 1.311, scale: 0.81 },
  { name: "h2gkmo", aspect: 0.228, scale: 1 },
  { name: "heart", aspect: 1.037, scale: 0.81 },
  { name: "japanese", aspect: 0.84, scale: 1 },
  { name: "leaves", aspect: 1.049, scale: 1 },
  { name: "moon", aspect: 0.981, scale: 1.21 },
  { name: "saturn", aspect: 1.25, scale: 0.81 },
  { name: "tears", aspect: 0.575, scale: 1 },
  { name: "toulouse", aspect: 3.441, scale: 1 },
  { name: "umbrella", aspect: 0.853, scale: 0.81 },
];

// Every tattoo gets the same visual weight: equal area (BASE²), with long shapes capped.
const BASE = 54; // design units (× --u)
const MAX_SIDE = BASE * 1.7;

/** A tattoo's size in design units (× --u). Shared with the share image. */
export const sizeFor = (aspect: number, tweak: number) => {
  let w = BASE * Math.sqrt(aspect);
  let h = BASE / Math.sqrt(aspect);
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h)) * tweak;
  w *= scale;
  h *= scale;
  return { w, h };
};

interface Placement {
  name: string;
  x: number; // % of viewport width
  y: number; // % of viewport height
  w: number; // design units (× --u)
  h: number;
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
  return names.map(({ name, aspect, scale }, k) => {
    const col = k % cols;
    const row = Math.floor(k / cols);
    return {
      name,
      x: ((col + rand(0.15, 0.85)) / cols) * 100,
      y: ((row + rand(0.15, 0.85)) / rows) * 100,
      ...sizeFor(aspect, scale),
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
              "--w": p.w,
              "--h": p.h,
              "--rotate": `${p.rotate}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
});
