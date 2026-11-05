import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import portraitTake from "../public/takes/portrait.json";
import landscapeTake from "../public/takes/landscape.json";
import { INTRO_S, SCENES, type Scene } from "./scenes";

export type Format = "portrait" | "landscape";

type Take = typeof portraitTake;
const TAKES: Record<Format, Take> = { portrait: portraitTake, landscape: landscapeTake as Take };

const BG = "#f2c4d0";
const INK = "#101820";
const CREAM = "#eae5d9";

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

/** Scene start/length in frames, laid end to end after the intro. */
const timeline = (fps: number) => {
  let from = secs(INTRO_S, fps);
  return SCENES.map((scene) => {
    const len = secs(scene.len, fps);
    const item = { scene, from, len };
    from += len;
    return item;
  });
};

export const Demo: React.FC<{ format: Format }> = ({ format }) => {
  const { fps } = useVideoConfig();
  const items = timeline(fps);
  const scenesStart = items[0].from;
  const scenesEnd = items.at(-1)!.from + items.at(-1)!.len;

  // Consecutive scenes sharing a caption get one caption, so it doesn't re-animate on every cut.
  const captions: { text: string; from: number; len: number; ring: boolean }[] = [];
  for (const { scene, from, len } of items) {
    const last = captions.at(-1);
    if (last && last.text === scene.caption) last.len += len;
    else captions.push({ text: scene.caption, from, len, ring: scene.effect === "ringZoom" });
  }

  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 35%, #f8dde4 0%, ${BG} 70%)`, fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
      <Sequence durationInFrames={scenesStart + 6}>
        <Intro format={format} />
      </Sequence>
      <Sequence from={scenesStart} durationInFrames={scenesEnd - scenesStart + 6}>
        <GameWindow format={format} items={items.map((i) => ({ ...i, from: i.from - scenesStart }))} />
      </Sequence>
      {captions.map((c) => (
        <Sequence key={c.from} from={c.from} durationInFrames={c.len}>
          <Caption format={format} text={c.text} ring={c.ring} />
        </Sequence>
      ))}
      <Sequence from={scenesEnd}>
        <Outro format={format} />
      </Sequence>
    </AbsoluteFill>
  );
};

// ---------- Intro: the nine covers pop in, then the logo ----------

const Intro: React.FC<{ format: Format }> = ({ format }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const portrait = format === "portrait";
  const grid = portrait ? 600 : 560;
  const gap = 14;
  const cell = (grid - gap * 2) / 3;
  const logoIn = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const out = interpolate(frame, [secs(INTRO_S, fps) - 6, secs(INTRO_S, fps) + 4], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        flexDirection: portrait ? "column" : "row",
        alignItems: "center",
        justifyContent: "center",
        gap: portrait ? 110 : 120,
        opacity: out,
        transform: `scale(${interpolate(out, [0, 1], [0.94, 1])})`,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: `repeat(3, ${cell}px)`, gap }}>
        {COVERS.map((src, i) => {
          const s = spring({ frame: frame - i * 2, fps, config: { damping: 12, mass: 0.6 } });
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
                transform: `scale(${s}) rotate(${interpolate(s, [0, 1], [i % 2 ? 14 : -14, 0])}deg)`,
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
          transform: `translateY(${interpolate(logoIn, [0, 1], [60, 0])}px)`,
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
  const take = TAKES[format];
  const { scale, x, y } = LAYOUT[format];
  const enter = spring({ frame, fps, config: { damping: 16 } });
  const end = items.at(-1)!.from + items.at(-1)!.len;
  const exit = interpolate(frame, [end - 4, end + 6], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
        transform: `translateY(${interpolate(enter, [0, 1], [160, 0])}px) scale(${interpolate(exit, [0, 1], [0.94, 1])})`,
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

/** One scene: the take trimmed to its moment, plus any zoom or overlay. */
const Shot: React.FC<{ take: Take; format: Format; scene: Scene }> = ({ take, format, scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = take.marks[scene.at] + scene.offset;
  const W = take.width;
  const H = take.height;

  // Zoom toward a point, keeping the view inside the frame.
  let transform = "none";
  const zoomTo = (cx: number, cy: number, z: number, p: number) => {
    const s = interpolate(p, [0, 1], [1, z]);
    const fx = Math.min(Math.max(interpolate(p, [0, 1], [W / 2, cx]), W / (2 * s)), W - W / (2 * s));
    const fy = Math.min(Math.max(interpolate(p, [0, 1], [H / 2, cy]), H / (2 * s)), H - H / (2 * s));
    transform = `translate(${W / 2}px, ${H / 2}px) scale(${s}) translate(${-fx}px, ${-fy}px)`;
  };
  if (scene.effect === "ringZoom") {
    const r = take.rects.ring;
    const p = spring({ frame: frame - secs(0.55, fps), fps, config: { damping: 18 } });
    zoomTo(r.x + r.w / 2, r.y + r.h / 2, format === "portrait" ? 2.1 : 3, p);
  }
  if (scene.effect === "tattoos") {
    const p = interpolate(frame, [0, secs(scene.len, fps)], [0, 1], { easing: Easing.out(Easing.quad) });
    zoomTo(W / 2, H / 2, 1.06, p);
  }

  return (
    <AbsoluteFill style={{ transform, transformOrigin: "0 0" }}>
      <OffthreadVideo src={staticFile(`takes/${format}.mp4`)} trimBefore={secs(start, fps)} muted />
      {scene.effect === "tattoos" && <TattooHighlight take={take} />}
      {scene.effect === "result" && <ResultCard format={format} take={take} />}
    </AbsoluteFill>
  );
};

/** Wash the game back and bring the faint background tattoos up to full strength, one by one. */
const TattooHighlight: React.FC<{ take: Take }> = ({ take }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wash = interpolate(frame, [0, 8], [0, 0.6], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: CREAM, opacity: wash }} />
      {take.rects.tattoos.map((t, i) => {
        const s = spring({ frame: frame - 5 - i * 2, fps, config: { damping: 9, mass: 0.6 } });
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
              transform: `translate(-50%, -50%) rotate(${t.rotate}deg) scale(${interpolate(s, [0, 1], [1, 1.25])})`,
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
  const s = spring({ frame: frame - 3, fps, config: { damping: 15 } });
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
          transform: `translateY(${interpolate(s, [0, 1], [220, 0])}px) scale(${interpolate(s, [0, 1], [0.7, 1])}) rotate(${interpolate(s, [0, 1], [-6, -2])}deg)`,
        }}
      />
    </AbsoluteFill>
  );
};

// ---------- Caption ----------

const Caption: React.FC<{ format: Format; text: string; ring: boolean }> = ({ format, text, ring }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = LAYOUT[format].caption;
  const inP = spring({ frame, fps, config: { damping: 16 } });
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
        whiteSpace: "pre-line",
        opacity: inP,
        transform: `translateY(${interpolate(inP, [0, 1], [36, 0])}px)`,
      }}
    >
      <span>
        {format === "portrait" ? text : text.replace("\n", " ")}
        {ring && (
          <Img
            src={staticFile("Ring.svg")}
            style={{ height: c.size * 0.95, marginLeft: 16, verticalAlign: "-0.12em" }}
          />
        )}
      </span>
    </div>
  );
};

// ---------- Outro ----------

const Outro: React.FC<{ format: Format }> = ({ format }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const portrait = format === "portrait";
  const logo = spring({ frame: frame - 4, fps, config: { damping: 13 } });
  const size = portrait ? 96 : 104;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: portrait ? 90 : 70 }}>
      <Img
        src={staticFile("grandoku.svg")}
        style={{
          width: portrait ? 900 : 980,
          opacity: logo,
          transform: `scale(${interpolate(logo, [0, 1], [0.8, 1])})`,
        }}
      />
      <div style={{ display: "flex", gap: 12 }}>
        {COVERS.map((src, i) => {
          const s = spring({ frame: frame - 10 - i * 1.5, fps, config: { damping: 12, mass: 0.5 } });
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
                transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px)`,
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
