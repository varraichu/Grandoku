import React, { createContext, useContext } from "react";
import {
  AbsoluteFill,
  Easing,
  Freeze,
  Img,
  interpolateColors,
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
import { CARD_S, sceneLen, VARIANTS, type Scene, type Variant, type VariantName } from "./scenes";

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
  const items: Item[] = [];
  for (const scene of variant.scenes) {
    if (scene.card) {
      // A title card gets its own slot just before the scene.
      const len = secs(CARD_S[scene.card] * variant.pace, fps);
      items.push({ scene, from, len, card: true });
      from += len;
    }
    const len = secs(sceneLen(scene, take.marks), fps);
    items.push({ scene, from, len });
    from += len;
  }
  return items;
};

export const Demo: React.FC<{ format: Format; variant: VariantName }> = ({ format, variant: name }) => {
  const { fps } = useVideoConfig();
  const variant = VARIANTS[name];
  const items = timeline(variant, TAKES[format], fps);
  const scenesStart = items[0].from;
  const scenesEnd = items.at(-1)!.from + items.at(-1)!.len;

  // Consecutive scenes sharing a caption get one caption, so it doesn't re-animate on every cut.
  // Scenes with a title card show their words on the card instead.
  const captions: { text: string; from: number; len: number }[] = [];
  for (const { scene, from, len, card } of items) {
    if (card || scene.card || !scene.caption) continue;
    const last = captions.at(-1);
    if (last && last.text === scene.caption && last.from + last.len === from) last.len += len;
    else captions.push({ text: scene.caption, from, len });
  }
  const cards = items.flatMap((item, i) => (item.card ? [{ ...item, next: items[i + 1] }] : []));

  return (
    <VariantCtx.Provider value={variant}>
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 35%, #f8dde4 0%, ${BG} 70%)`,
        fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
      }}
    >
      {variant.intro > 0 && (
        <Sequence durationInFrames={scenesStart + 10}>
          <Intro format={format} />
        </Sequence>
      )}
      <Sequence from={scenesStart} durationInFrames={scenesEnd - scenesStart + 12}>
        <GameWindow format={format} items={items.map((i) => ({ ...i, from: i.from - scenesStart }))} />
      </Sequence>
      {captions.map((c) => (
        <Sequence key={c.from} from={c.from} durationInFrames={c.len}>
          <Caption format={format} text={c.text} />
        </Sequence>
      ))}
      {cards.map((c) =>
        c.scene.card === "plain" ? (
          <Sequence key={c.from} from={c.from} durationInFrames={c.len}>
            <PlainCard format={format} text={c.scene.caption} />
          </Sequence>
        ) : (
          <Sequence key={c.from} from={c.from} durationInFrames={c.len + c.next.len}>
            <ShrinkTitle format={format} text={c.scene.caption} hold={c.len} />
          </Sequence>
        ),
      )}
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

type Item = { scene: Scene; from: number; len: number; card?: boolean };

const GameWindow: React.FC<{ format: Format; items: Item[] }> = ({ format, items }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = useEase();
  const take = TAKES[format];
  const { centered } = useContext(VariantCtx);
  const { height } = useVideoConfig();
  const { scale, x } = LAYOUT[format];
  const y = centered ? (height - take.height * scale) / 2 : LAYOUT[format].y;
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
        {items.map(({ scene, from, len, card }) =>
          // Plain cards cover the window; a shrinking title sits over the scene's first frame.
          card && scene.card === "plain" ? null : (
            <Sequence key={from} from={from} durationInFrames={len}>
              <Shot take={take} format={format} scene={card ? { ...scene, still: true, effect: undefined } : scene} />
            </Sequence>
          ),
        )}
      </div>
    </div>
  );
};

const center = (r: Rect) => [r.x + r.w / 2, r.y + r.h / 2] as const;

/** The "2/7 + ring" part of the mistakes block (its left half, below the label). */
const ringValue = (r: Rect): Rect => ({ x: r.x, y: r.y + r.h * 0.35, w: r.w * 0.5, h: r.h * 0.65 });

const TakeVideo: React.FC<{ format: Format; start: number; rate: number }> = ({ format, start, rate }) => {
  const { fps } = useVideoConfig();
  return <OffthreadVideo src={staticFile(`takes/${format}.mp4`)} trimBefore={secs(start, fps)} playbackRate={rate} muted />;
};

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
  const cell = center(take.rects.notesCell);
  if (scene.effect === "cellZoomIn") zoomTo(...cell, cellZoom, e(0, 0.9));
  if (scene.effect === "noteLines") zoomTo(...cell, cellZoom, 1);
  if (scene.effect === "cellZoomOut") zoomTo(...cell, cellZoom, 1 - e(0, 0.8));
  if (scene.effect === "ringZoom") zoomTo(...center(take.rects.ring), portrait ? 2.1 : 3, e(0.8, 0.8));
  // In while the notes go in, then back out before the scene ends, so the peek opens on the full view.
  if (scene.effect === "cellZoom")
    zoomTo(...center(take.rects.notesCell), cellZoom, e(0, 0.9) * (1 - e(len / pace - 0.8, 0.7)));
  if (scene.effect === "tattoos") zoomTo(W / 2, H / 2, 1.06, e(0, len / pace));

  const video = <TakeVideo format={format} start={start} rate={rate} />;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform, transformOrigin: "0 0" }}>
        {scene.still ? <Freeze frame={0}>{video}</Freeze> : video}
        {scene.effect === "spotlight" && <Spotlight take={take} start={start} rate={rate} />}
        {scene.effect === "tattoos" && <TattooHighlight take={take} />}
        {scene.effect === "result" && <ResultCard format={format} take={take} />}
        {scene.effect === "ringLabel" && <RingLabel take={take} />}
        {scene.effect === "flipTag" && <FlipTag take={take} />}
      </AbsoluteFill>
      {scene.effect === "noteLines" && <NoteLines take={take} zoom={cellZoom} />}
      {scene.effect === "ringBubble" && (
        <Magnifier format={format} start={start} rate={rate} take={take} target={ringValue(take.rects.ring)} zoom={2.2} at={[760, 560]} radius={250} />
      )}
      {scene.effect === "cellBubble" && (
        <Magnifier format={format} start={start} rate={rate} take={take} target={take.rects.notesCell} zoom={3} at={[W / 2, 300]} radius={230} />
      )}
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
  const { spotLabels } = useContext(VariantCtx);
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
  const label = (spotLabels ?? SPOT_LABELS)[i];
  return (
    <>
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
    {label && cur && (
      <SpotLabel text={label} rect={cur} W={take.width} since={((t - spots[i].t) / rate) * fps} />
    )}
    </>
  );
};

// What each spotlight step is called, in the recorder's order: Hints button, column, row, box, tray.
const SPOT_LABELS: (string | null)[] = [null, "Column", "Row", "Box", null, null];

/** A word that pops in beside the spotlighted area, at the moment it lights up. */
const SpotLabel: React.FC<{ text: string; rect: Rect; W: number; since: number }> = ({ text, rect, W, since }) => {
  const { fps } = useVideoConfig();
  const s = spring({ frame: since, fps, config: { damping: 13, mass: 0.6 } });
  const tall = rect.h > rect.w * 1.6;
  const gap = 34;
  // Beside a column (whichever side has room); above a row or box (below if there's no room).
  const pos: React.CSSProperties = tall
    ? rect.x + rect.w + 360 < W
      ? { left: rect.x + rect.w + gap, top: rect.y + rect.h / 2, transform: `translateY(-50%) scale(${s})`, transformOrigin: "left center" }
      : { left: rect.x - gap, top: rect.y + rect.h / 2, transform: `translate(-100%, -50%) scale(${s})`, transformOrigin: "right center" }
    : rect.y > 160
      ? { left: rect.x + rect.w / 2, top: rect.y - gap, transform: `translate(-50%, -100%) scale(${s})`, transformOrigin: "center bottom" }
      : { left: rect.x + rect.w / 2, top: rect.y + rect.h + gap, transform: `translateX(-50%) scale(${s})`, transformOrigin: "center top" };
  return (
    <div
      style={{
        position: "absolute",
        ...pos,
        background: PINK,
        color: "#fff",
        fontSize: 72,
        fontWeight: 800,
        letterSpacing: -1,
        padding: "10px 34px 14px",
        borderRadius: 999,
        boxShadow: "0 12px 30px rgba(16,24,32,0.35)",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
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

// ---------- Style-test pieces ----------

const ALBUMS = [
  { name: "Yours Truly", color: "#d98e93" },
  { name: "My Everything", color: "#7a7fa7" },
  { name: "Dangerous Woman", color: "#979898" },
  { name: "Sweetener", color: "#f8d5b8" },
  { name: "thank u, next", color: "#ae90a7" },
  { name: "Positions", color: "#99b0a6" },
  { name: "Eternal Sunshine", color: "#46241e" },
  { name: "Brighter Days Ahead", color: "#538393" },
  { name: "Petal", color: "#101820" },
];

/** A caption on its own full-screen card, before the clip. */
const PlainCard: React.FC<{ format: Format; text: string }> = ({ format, text }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const e = useEase();
  const inP = e(0, 0.3);
  const out = interpolate(frame, [durationInFrames - secs(0.2, fps), durationInFrames], [1, 0], clamp);
  const portrait = format === "portrait";
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 45%, #f8dde4 0%, ${BG} 75%)`,
        alignItems: "center",
        justifyContent: "center",
        opacity: Math.min(1, inP * 2) * out,
      }}
    >
      <div
        style={{
          width: portrait ? 900 : 1500,
          textAlign: "center",
          color: INK,
          fontSize: portrait ? 112 : 104,
          fontWeight: 800,
          letterSpacing: -3,
          lineHeight: 1.02,
          textWrap: "balance",
          transform: `translateY(${interpolate(inP, [0, 1], [40, 0])}px)`,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

/** A big title over the paused first frame, which then shrinks up into the caption slot as the clip plays. */
const ShrinkTitle: React.FC<{ format: Format; text: string; hold: number }> = ({ format, text, hold }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { pace } = useContext(VariantCtx);
  const c = LAYOUT[format].caption;
  const inP = interpolate(frame, [0, secs(0.25 * pace, fps)], [0, 1], clamp);
  const p = interpolate(frame, [hold, hold + secs(0.55 * pace, fps)], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const big = format === "portrait" ? 112 : 104;
  const cy = interpolate(p, [0, 1], [height / 2, c.top + c.height / 2]);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "rgba(16,24,32,0.55)", opacity: inP * (1 - p) }} />
      <div
        style={{
          position: "absolute",
          left: (width - c.width) / 2,
          width: c.width,
          top: cy,
          transform: `translateY(-50%) scale(${interpolate(inP, [0, 1], [0.92, 1])})`,
          textAlign: "center",
          color: interpolateColors(p, [0, 1], ["#ffffff", INK]),
          fontSize: interpolate(p, [0, 1], [big, c.size]),
          fontWeight: 800,
          letterSpacing: interpolate(p, [0, 1], [-3, -1.5]),
          lineHeight: 1.04,
          textWrap: "balance",
          opacity: inP,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

/** Where a take point lands on screen when the view is zoomed `s`× toward (cx, cy), as zoomTo does. */
const zoomedPoint = (W: number, H: number, cx: number, cy: number, s: number) => {
  const fx = Math.min(Math.max(cx, W / (2 * s)), W - W / (2 * s));
  const fy = Math.min(Math.max(cy, H / (2 * s)), H - H / (2 * s));
  return (x: number, y: number) => [(x - fx) * s + W / 2, (y - fy) * s + H / 2] as const;
};

/** Freeze-frame callout: each note colour in the zoomed cell gets a line to its album cover. */
const NoteLines: React.FC<{ take: Take; zoom: number }> = ({ take, zoom }) => {
  const e = useEase();
  const W = take.width;
  const H = take.height;
  const cell = take.rects.notesCell;
  const [ccx, ccy] = center(cell);
  const toScreen = zoomedPoint(W, H, ccx, ccy, zoom);
  const u = Math.min(W / 402, H / 640); // the game's design unit at this size
  const digits = ((take.rects as { noteDigits?: number[] }).noteDigits ?? []) as number[];
  const cellBottom = toScreen(ccx, cell.y + cell.h)[1];
  const size = 200;
  const gap = 44;
  const rowW = digits.length * size + (digits.length - 1) * gap;
  const coverY = Math.min(cellBottom + 230, H - size - 140);
  const dim = e(0, 0.35);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "rgba(16,24,32,0.55)", opacity: dim }} />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {digits.map((d, i) => {
          const c = (d - 1) % 3;
          const r = Math.floor((d - 1) / 3);
          const [sx, sy] = toScreen(ccx + (c - 1) * 12 * u, ccy + (r - 1) * 12 * u);
          const tx = (W - rowW) / 2 + i * (size + gap) + size / 2;
          const ty = coverY - 14;
          const p = e(0.35 + i * 0.3, 0.5);
          const path = `M ${sx} ${sy} C ${sx} ${(sy + ty) / 2}, ${tx} ${(sy + ty) / 2}, ${tx} ${ty}`;
          return (
            <g key={d}>
              <path d={path} stroke="#fff" strokeWidth={14} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
              <path d={path} stroke={ALBUMS[d - 1].color} strokeWidth={7} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
            </g>
          );
        })}
      </svg>
      {/* The swatches, redrawn bright above the dim. */}
      {digits.map((d) => {
        const c = (d - 1) % 3;
        const r = Math.floor((d - 1) / 3);
        const [sx, sy] = toScreen(ccx + (c - 1) * 12 * u, ccy + (r - 1) * 12 * u);
        const side = 7 * u * zoom;
        return (
          <div
            key={d}
            style={{
              position: "absolute",
              left: sx - side / 2,
              top: sy - side / 2,
              width: side,
              height: side,
              background: ALBUMS[d - 1].color,
              border: "5px solid #fff",
              borderRadius: 10,
              opacity: dim,
            }}
          />
        );
      })}
      {digits.map((d, i) => {
        const p = e(0.7 + i * 0.3, 0.4);
        return (
          <div
            key={d}
            style={{
              position: "absolute",
              left: (W - rowW) / 2 + i * (size + gap),
              top: coverY,
              width: size,
              textAlign: "center",
              opacity: p,
              transform: `translateY(${interpolate(p, [0, 1], [30, 0])}px)`,
            }}
          >
            <Img
              src={COVERS[d - 1]}
              style={{ width: size, height: size, borderRadius: 18, border: `7px solid ${ALBUMS[d - 1].color}`, boxSizing: "border-box", boxShadow: "0 14px 30px rgba(0,0,0,0.4)" }}
            />
            <div style={{ marginTop: 14, color: "#fff", fontSize: 34, fontWeight: 700, lineHeight: 1.1 }}>{ALBUMS[d - 1].name}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** A label on the game itself, pointing at the mistakes counter. */
const RingLabel: React.FC<{ take: Take }> = ({ take }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = useEase();
  const r = take.rects.ring;
  const outline = e(0.3, 0.4);
  const s = spring({ frame: frame - secs(0.6, fps), fps, config: { damping: 14, mass: 0.7 } });
  const pad = 16;
  // Hang the label off the counter's left edge, or its right edge when there isn't room.
  const fromRight = r.x + 720 > take.width;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: r.x - pad,
          top: r.y - pad,
          width: r.w + pad * 2,
          height: r.h + pad * 2,
          border: `6px solid ${PINK}`,
          borderRadius: 24,
          boxShadow: `0 0 30px ${PINK}`,
          opacity: outline,
          transform: `scale(${interpolate(outline, [0, 1], [1.15, 1])})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          ...(fromRight ? { right: take.width - (r.x + r.w + pad) } : { left: r.x - pad }),
          top: r.y + r.h + pad + 34,
          transform: `scale(${s})`,
          transformOrigin: fromRight ? "calc(100% - 60px) -30px" : "60px -30px",
        }}
      >
        {/* Pointer up to the counter. */}
        <div
          style={{
            position: "absolute",
            ...(fromRight ? { right: 44 } : { left: 44 }),
            top: -26,
            width: 0,
            height: 0,
            borderLeft: "24px solid transparent",
            borderRight: "24px solid transparent",
            borderBottom: `28px solid ${PINK}`,
          }}
        />
        <div
          style={{
            background: PINK,
            color: "#fff",
            fontSize: 60,
            fontWeight: 800,
            letterSpacing: -1,
            padding: "16px 36px 20px",
            borderRadius: 28,
            whiteSpace: "nowrap",
            boxShadow: "0 16px 36px rgba(16,24,32,0.35)",
          }}
        >
          7 mistakes = game over
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** A round magnifier showing `target` enlarged, with the rest of the game still in view. */
const Magnifier: React.FC<{
  format: Format;
  take: Take;
  start: number;
  rate: number;
  target: Rect;
  zoom: number;
  at: [number, number];
  radius: number;
}> = ({ format, take, start, rate, target, zoom, at, radius: R }) => {
  const e = useEase();
  const p = e(0.4, 0.5);
  const [cx, cy] = center(target);
  const [bx, by] = at;
  const pad = 14;
  return (
    <AbsoluteFill>
      {/* Outline on the original spot, and a line out to the bubble. */}
      <div
        style={{
          position: "absolute",
          left: target.x - pad,
          top: target.y - pad,
          width: target.w + pad * 2,
          height: target.h + pad * 2,
          border: `6px solid ${PINK}`,
          borderRadius: 22,
          opacity: p,
        }}
      />
      <svg width={take.width} height={take.height} style={{ position: "absolute", inset: 0, opacity: p }}>
        <line x1={cx} y1={cy} x2={bx} y2={by} stroke={PINK} strokeWidth={8} strokeLinecap="round" />
      </svg>
      <div
        style={{
          position: "absolute",
          left: bx - R,
          top: by - R,
          width: R * 2,
          height: R * 2,
          borderRadius: "50%",
          overflow: "hidden",
          border: `10px solid #fff`,
          boxSizing: "border-box",
          boxShadow: `0 0 0 6px ${PINK}, 0 24px 60px rgba(16,24,32,0.45)`,
          background: CREAM,
          opacity: p,
          transform: `scale(${interpolate(p, [0, 1], [0.4, 1])})`,
        }}
      >
        <div
          style={{
            position: "absolute",
            width: take.width,
            height: take.height,
            transformOrigin: "0 0",
            transform: `translate(${R - 10}px, ${R - 10}px) scale(${zoom}) translate(${-cx}px, ${-cy}px)`,
          }}
        >
          <TakeVideo format={format} start={start} rate={rate} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** "Upside down!" pointing at the title once notes mode has flipped it. */
const FlipTag: React.FC<{ take: Take }> = ({ take }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { pace } = useContext(VariantCtx);
  const r = (take.rects as { title?: Rect }).title;
  if (!r) return null;
  const s = spring({ frame: frame - secs(1.0 * pace, fps), fps, config: { damping: 13, mass: 0.6 } });
  return (
    <div
      style={{
        position: "absolute",
        right: take.width - (r.x + r.w),
        top: r.y + r.h + 34,
        transform: `scale(${s})`,
        transformOrigin: "calc(100% - 70px) -30px",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: 46,
          top: -26,
          width: 0,
          height: 0,
          borderLeft: "24px solid transparent",
          borderRight: "24px solid transparent",
          borderBottom: `28px solid ${PINK}`,
        }}
      />
      <div
        style={{
          background: PINK,
          color: "#fff",
          fontSize: 60,
          fontWeight: 800,
          letterSpacing: -1,
          padding: "16px 36px 20px",
          borderRadius: 28,
          whiteSpace: "nowrap",
          boxShadow: "0 16px 36px rgba(16,24,32,0.35)",
        }}
      >
        Upside down!
      </div>
    </div>
  );
};
