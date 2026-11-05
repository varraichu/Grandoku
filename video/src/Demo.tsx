import React, { createContext, useContext } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import portraitTake from "../public/takes/portrait.json";
import landscapeTake from "../public/takes/landscape.json";
import { sceneLen, VARIANTS, type Scene, type Variant, type VariantName } from "./scenes";

export type Format = "portrait" | "landscape";

type Take = typeof portraitTake;
type Rect = { x: number; y: number; w: number; h: number };
export const TAKES: Record<Format, Take> = { portrait: portraitTake, landscape: landscapeTake as Take };

const BG = "#f2c4d0";
const INK = "#101820";
const CREAM = "#eae5d9";
const PINK = "#dc658d";
const URL = "grandoku.vercel.app";

const COVERS = [
  "1_Yours_Truly_Alt",
  "2_My_Everything_Alt",
  "3_Dangerous_Woman",
  "4_Sweetener",
  "5_Thank_U_Next",
  "6_Positions",
  "7_Eternal_Sunshine",
  "8_BDA",
  "9_Petal",
].map((n) => staticFile(`covers/${n}.webp`));

// Where the gameplay window and the caption sit in each format.
const LAYOUT = {
  portrait: { scale: 0.8, x: 108, y: 330, caption: { top: 60, height: 250, size: 66, width: 940 } },
  landscape: { scale: 0.8, x: 192, y: 180, caption: { top: 22, height: 140, size: 58, width: 1700 } },
};

const secs = (s: number, fps: number) => Math.round(s * fps);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// The version being rendered (full or fast); its pace scales every animation below.
const VariantCtx = createContext<Variant>(VARIANTS.full);

/** A calm ease (no bounce) from 0 to 1 over `dur` seconds, starting `delay` seconds in, both scaled by the pace. */
const useEase = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { pace } = useContext(VariantCtx);
  return (delay: number, dur: number) =>
    interpolate(frame, [secs(delay * pace, fps), secs((delay + dur) * pace, fps)], [0, 1], {
      ...clamp,
      easing: Easing.inOut(Easing.cubic),
    });
};

/** Scene start/length in frames, laid end to end after the intro. */
const timeline = (variant: Variant, take: Take, fps: number) => {
  let from = secs(variant.intro, fps);
  return variant.scenes.map((scene) => {
    const len = secs(sceneLen(scene, take.marks), fps);
    const item = { scene, from, len };
    from += len;
    return item;
  });
};

export const Demo: React.FC<{ format: Format; variant: VariantName }> = ({ format, variant: name }) => {
  const { fps } = useVideoConfig();
  const variant = VARIANTS[name];
  const items = timeline(variant, TAKES[format], fps);
  const scenesStart = items[0].from;
  const scenesEnd = items.at(-1)!.from + items.at(-1)!.len;

  // Consecutive scenes sharing a caption get one caption, so it doesn't re-animate on every cut.
  const captions: { text: string; from: number; len: number }[] = [];
  for (const { scene, from, len } of items) {
    const last = captions.at(-1);
    if (last && last.text === scene.caption) last.len += len;
    else captions.push({ text: scene.caption, from, len });
  }

  return (
    <VariantCtx.Provider value={variant}>
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 35%, #f8dde4 0%, ${BG} 70%)`,
        fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
      }}
    >
      <Sequence durationInFrames={scenesStart + 10}>
        <Intro format={format} />
      </Sequence>
      <Sequence from={scenesStart} durationInFrames={scenesEnd - scenesStart + 12}>
        <GameWindow format={format} items={items.map((i) => ({ ...i, from: i.from - scenesStart }))} />
      </Sequence>
      {captions.map((c) => (
        <Sequence key={c.from} from={c.from} durationInFrames={c.len}>
          <Caption format={format} text={c.text} />
        </Sequence>
      ))}
      <Sequence from={scenesEnd}>
        <Outro format={format} />
      </Sequence>
    </AbsoluteFill>
    </VariantCtx.Provider>
  );
};

// ---------- Intro: the nine covers pop in, then the logo ----------

const Intro: React.FC<{ format: Format }> = ({ format }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = useEase();
  const portrait = format === "portrait";
  const grid = portrait ? 600 : 560;
  const gap = 14;
  const cell = (grid - gap * 2) / 3;
  const logoIn = e(0.5, 0.6);
  const { intro, pace } = useContext(VariantCtx);
  const out = interpolate(frame, [secs(intro - 0.25, fps), secs(intro + 0.25, fps)], [1, 0], clamp);

  return (
    <AbsoluteFill
      style={{
        flexDirection: portrait ? "column" : "row",
        alignItems: "center",
        justifyContent: "center",
        gap: portrait ? 110 : 120,
        opacity: out,
        transform: `scale(${interpolate(out, [0, 1], [0.95, 1])})`,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: `repeat(3, ${cell}px)`, gap }}>
        {COVERS.map((src, i) => {
          const s = spring({ frame: frame - i * 3 * pace, fps, config: { damping: 16, mass: 0.8 } });
          return (
            <Img
              key={src}
              src={src}
              style={{
                width: cell,
                height: cell,
                borderRadius: 14,
                objectFit: "cover",
                boxShadow: "0 10px 24px rgba(16,24,32,0.25)",
                transform: `scale(${s}) rotate(${interpolate(s, [0, 1], [i % 2 ? 10 : -10, 0])}deg)`,
              }}
            />
          );
        })}
      </div>
      <Img
        src={staticFile("title.svg")}
        style={{
          width: portrait ? 820 : 760,
          opacity: logoIn,
          transform: `translateY(${interpolate(logoIn, [0, 1], [50, 0])}px)`,
        }}
      />
    </AbsoluteFill>
  );
};

// ---------- The gameplay window ----------

type Item = { scene: Scene; from: number; len: number };

const GameWindow: React.FC<{ format: Format; items: Item[] }> = ({ format, items }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = useEase();
  const take = TAKES[format];
  const { scale, x, y } = LAYOUT[format];
  const enter = e(0, 0.7);
  const end = items.at(-1)!.from + items.at(-1)!.len;
  const exit = interpolate(frame, [end - 6, end + 10], [1, 0], clamp);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: take.width * scale,
        height: take.height * scale,
        borderRadius: 40,
        overflow: "hidden",
        background: CREAM,
        boxShadow: "0 30px 80px rgba(16,24,32,0.28), 0 0 0 6px rgba(255,255,255,0.7)",
        opacity: enter * exit,
        transform: `translateY(${interpolate(enter, [0, 1], [140, 0])}px) scale(${interpolate(exit, [0, 1], [0.95, 1])})`,
      }}
    >
      <div style={{ width: take.width, height: take.height, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
        {items.map(({ scene, from, len }) => (
          <Sequence key={from} from={from} durationInFrames={len}>
            <Shot take={take} format={format} scene={scene} />
          </Sequence>
        ))}
      </div>
    </div>
  );
};

const center = (r: Rect) => [r.x + r.w / 2, r.y + r.h / 2] as const;

/** One scene: the take trimmed to its moment, plus any zoom or overlay. */
const Shot: React.FC<{ take: Take; format: Format; scene: Scene }> = ({ take, format, scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = useEase();
  const start = take.marks[scene.at] + scene.offset;
  const rate = scene.rate ?? 1;
  const len = sceneLen(scene, take.marks); // seconds on screen
  const { pace } = useContext(VariantCtx);
  const W = take.width;
  const H = take.height;
  const portrait = format === "portrait";

  // Zoom toward a point (p: 0 = full view, 1 = zoomed), keeping the view inside the frame.
  let transform = "none";
  const zoomTo = (cx: number, cy: number, z: number, p: number) => {
    const s = interpolate(p, [0, 1], [1, z]);
    const fx = Math.min(Math.max(interpolate(p, [0, 1], [W / 2, cx]), W / (2 * s)), W - W / (2 * s));
    const fy = Math.min(Math.max(interpolate(p, [0, 1], [H / 2, cy]), H / (2 * s)), H - H / (2 * s));
    transform = `translate(${W / 2}px, ${H / 2}px) scale(${s}) translate(${-fx}px, ${-fy}px)`;
  };
  const cellZoom = portrait ? 3.4 : 4;
  if (scene.effect === "ringZoom") zoomTo(...center(take.rects.ring), portrait ? 2.1 : 3, e(0.8, 0.8));
  // In while the notes go in, then back out before the scene ends, so the peek opens on the full view.
  if (scene.effect === "cellZoom")
    zoomTo(...center(take.rects.notesCell), cellZoom, e(0, 0.9) * (1 - e(len / pace - 0.8, 0.7)));
  if (scene.effect === "tattoos") zoomTo(W / 2, H / 2, 1.06, e(0, len / pace));

  return (
    <AbsoluteFill style={{ transform, transformOrigin: "0 0" }}>
      <OffthreadVideo src={staticFile(`takes/${format}.mp4`)} trimBefore={secs(start, fps)} playbackRate={rate} muted />
      {scene.effect === "spotlight" && <Spotlight take={take} start={start} rate={rate} />}
      {scene.effect === "tattoos" && <TattooHighlight take={take} />}
      {scene.effect === "result" && <ResultCard format={format} take={take} />}
    </AbsoluteFill>
  );
};

/**
 * Dims everything but the area the recorder marked (the Hints button, then each highlighted
 * column / row / box, then the tray), gliding from one area to the next.
 */
const Spotlight: React.FC<{ take: Take; start: number; rate: number }> = ({ take, start, rate }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = start + (frame / fps) * rate; // time in the take
  const spots = take.spots as { t: number; rect: Rect | null }[];
  const i = spots.findLastIndex((s) => s.t <= t);
  if (i < 0) return null;
  const GLIDE = 0.45;
  const p = Easing.inOut(Easing.cubic)(Math.min(1, (t - spots[i].t) / GLIDE));
  const cur = spots[i].rect;
  const prev = i > 0 ? spots[i - 1].rect : null;
  const from = prev ?? cur;
  const to = cur ?? prev;
  if (!from || !to) return null;
  const lerp = (a: number, b: number) => a + (b - a) * p;
  const pad = 10;
  const r = { x: lerp(from.x, to.x) - pad, y: lerp(from.y, to.y) - pad, w: lerp(from.w, to.w) + pad * 2, h: lerp(from.h, to.h) + pad * 2 };
  // Fade in with the first spot, out when the spotlight ends (rect null).
  const opacity = cur === null ? 1 - p : prev === null ? p : 1;
  return (
    <div
      style={{
        position: "absolute",
        left: r.x,
        top: r.y,
        width: r.w,
        height: r.h,
        borderRadius: 26,
        border: `6px solid ${PINK}`,
        boxShadow: `0 0 0 4000px rgba(16,24,32,0.5), 0 0 40px ${PINK}`,
        opacity,
      }}
    />
  );
};

/** Wash the game back and bring the faint background tattoos up to full strength, one by one. */
const TattooHighlight: React.FC<{ take: Take }> = ({ take }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = useEase();
  const wash = e(0, 0.5) * 0.6;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: CREAM, opacity: wash }} />
      {take.rects.tattoos.map((t, i) => {
        const s = e(0.3 + i * 0.12, 0.5);
        return (
          <Img
            key={t.src}
            src={staticFile(t.src.slice(1))}
            style={{
              position: "absolute",
              left: t.cx,
              top: t.cy,
              width: t.w,
              height: t.h,
              opacity: interpolate(s, [0, 1], [0.2, 1]),
              transform: `translate(-50%, -50%) rotate(${t.rotate}deg) scale(${interpolate(s, [0, 1], [1, 1.2])})`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** The exported result image, lifted out of the summary so it fills the window. */
const ResultCard: React.FC<{ format: Format; take: Take }> = ({ format, take }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = useEase();
  const s = e(0.1, 0.7);
  const h = take.height * (format === "portrait" ? 0.66 : 0.84);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <AbsoluteFill style={{ background: "rgba(16,24,32,0.55)", opacity: s }} />
      <Img
        src={staticFile(`takes/${format}-result.png`)}
        style={{
          height: h,
          borderRadius: 28,
          boxShadow: "0 30px 90px rgba(0,0,0,0.45)",
          opacity: s,
          transform: `translateY(${interpolate(s, [0, 1], [200, 0])}px) scale(${interpolate(s, [0, 1], [0.75, 1])}) rotate(${interpolate(s, [0, 1], [-6, -2])}deg)`,
        }}
      />
    </AbsoluteFill>
  );
};

// ---------- Caption ----------

const Caption: React.FC<{ format: Format; text: string }> = ({ format, text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = useEase();
  const c = LAYOUT[format].caption;
  const inP = e(0, 0.45);
  return (
    <div
      style={{
        position: "absolute",
        top: c.top,
        left: "50%",
        width: c.width,
        height: c.height,
        marginLeft: -c.width / 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        color: INK,
        fontSize: c.size,
        fontWeight: 800,
        letterSpacing: -1.5,
        lineHeight: 1.08,
        textWrap: "balance",
        opacity: inP,
        transform: `translateY(${interpolate(inP, [0, 1], [30, 0])}px)`,
      }}
    >
      {text}
    </div>
  );
};

// ---------- Outro ----------

const Outro: React.FC<{ format: Format }> = ({ format }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = useEase();
  const portrait = format === "portrait";
  const logo = e(0.1, 0.7);
  const link = e(0.6, 0.6);
  const size = portrait ? 96 : 92;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: portrait ? 80 : 56 }}>
      <Img
        src={staticFile("grandoku.svg")}
        style={{
          width: portrait ? 900 : 900,
          opacity: logo,
          transform: `scale(${interpolate(logo, [0, 1], [0.85, 1])})`,
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 22,
          opacity: link,
          transform: `translateY(${interpolate(link, [0, 1], [30, 0])}px)`,
        }}
      >
        {portrait && <div style={{ fontSize: 84, fontWeight: 800, color: INK, letterSpacing: -2 }}>Link in bio</div>}
        <div
          style={{
            fontSize: portrait ? 46 : 54,
            fontWeight: 700,
            color: CREAM,
            background: INK,
            padding: portrait ? "16px 36px" : "18px 44px",
            borderRadius: 999,
          }}
        >
          {URL}
        </div>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        {COVERS.map((src, i) => {
          const s = e(0.9 + i * 0.06, 0.4);
          return (
            <Img
              key={src}
              src={src}
              style={{
                width: size,
                height: size,
                borderRadius: 12,
                objectFit: "cover",
                boxShadow: "0 8px 20px rgba(16,24,32,0.22)",
                opacity: s,
                transform: `translateY(${interpolate(s, [0, 1], [30, 0])}px)`,
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
