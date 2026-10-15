// The shareable result: a 1080×1350 PNG drawn straight onto a canvas (never a DOM screenshot), so
// it looks the same on every device. Every image is same-origin, so the canvas can be exported.
import { albumFor } from "./albums";
import { formatTime } from "./components/Header";
import { TATTOOS, sizeFor } from "./components/Tattoos";
import { MAX_MISTAKES, type GameResult } from "./store";
import type { Board } from "./sudoku";

const W = 1080;
const H = 1350;

const COLORS = {
  bg: "#eae5d9",
  ink: "#101820",
  line: "#fff",
  pink: "#dc658d",
  muted: "rgba(16, 24, 32, 0.55)",
};

const FONT = `"Helvetica Neue", Helvetica, Arial, sans-serif`;

// Layout (px).
const TITLE_W = 470;
const TITLE_Y = 44;
const META_Y = 300; // baseline of the small labels in the stats row under the logo
const BOARD = 860; // board square
const BOARD_X = (W - BOARD) / 2;
const BOARD_Y = 420;
const BOX_GAP = 14;
const BOX_BORDER = 8;
const BOX_RADIUS = 26;
const CELL_LINE = 4;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

function drawBoard(ctx: CanvasRenderingContext2D, board: Board, covers: Map<number, HTMLImageElement>) {
  const box = (BOARD - 2 * BOX_GAP) / 3;
  const inner = box - 2 * BOX_BORDER;
  const cell = (inner - 2 * CELL_LINE) / 3;
  for (let b = 0; b < 9; b++) {
    const bx = BOARD_X + (b % 3) * (box + BOX_GAP);
    const by = BOARD_Y + Math.floor(b / 3) * (box + BOX_GAP);
    // White box frame, then the cells clipped to its rounded inner edge.
    ctx.fillStyle = COLORS.line;
    ctx.beginPath();
    ctx.roundRect(bx, by, box, box, BOX_RADIUS);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(bx + BOX_BORDER, by + BOX_BORDER, inner, inner, BOX_RADIUS - BOX_BORDER);
    ctx.clip();
    for (let k = 0; k < 9; k++) {
      const row = Math.floor(b / 3) * 3 + Math.floor(k / 3);
      const col = (b % 3) * 3 + (k % 3);
      const value = board[row * 9 + col];
      const x = bx + BOX_BORDER + (k % 3) * (cell + CELL_LINE);
      const y = by + BOX_BORDER + Math.floor(k / 3) * (cell + CELL_LINE);
      const img = value === null ? undefined : covers.get(value);
      if (img) ctx.drawImage(img, x, y, cell, cell);
      else {
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(x, y, cell, cell);
      }
    }
    ctx.restore();
  }
}

/** Design units → image pixels: the app's 402-wide phone frame scaled to the 1080 image. */
const UNIT = W / 402;

/**
 * The background tattoos, scattered like the app's: one per cell of a 2×5 grid at a random spot,
 * random rotation, 20% strength. Drawn first, so the board sits on top.
 */
function drawTattoos(ctx: CanvasRenderingContext2D, images: HTMLImageElement[]) {
  const [cols, rows] = [2, 5];
  const order = TATTOOS.map((t, i) => ({ ...t, img: images[i] })).sort(() => Math.random() - 0.5);
  ctx.save();
  ctx.globalAlpha = 0.2;
  order.forEach(({ aspect, scale, img }, k) => {
    const { w, h } = sizeFor(aspect, scale);
    const x = ((k % cols) + 0.15 + Math.random() * 0.7) * (W / cols);
    const y = (Math.floor(k / cols) + 0.15 + Math.random() * 0.7) * (H / rows);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(((Math.random() * 360 - 180) * Math.PI) / 180);
    ctx.drawImage(img, (-w * UNIT) / 2, (-h * UNIT) / 2, w * UNIT, h * UNIT);
    ctx.restore();
  });
  ctx.restore();
}

/**
 * The stats row under the logo, laid out like the app's: Mistakes (with the ring) on the left,
 * the level in pink with the hints used under it in the middle, and the Score on the right.
 */
function drawMeta(ctx: CanvasRenderingContext2D, r: GameResult, ring: HTMLImageElement) {
  const left = BOARD_X + 6;
  const right = BOARD_X + BOARD - 6;
  const valueY = META_Y + 62;
  ctx.textBaseline = "alphabetic";

  const label = (text: string, x: number, align: CanvasTextAlign) => {
    ctx.textAlign = align;
    ctx.fillStyle = COLORS.ink;
    ctx.font = `500 30px ${FONT}`;
    ctx.fillText(text, x, META_Y);
  };
  const value = (text: string, x: number, align: CanvasTextAlign, color: string) => {
    ctx.textAlign = align;
    ctx.fillStyle = color;
    ctx.font = `700 64px ${FONT}`;
    ctx.fillText(text, x, valueY);
    return ctx.measureText(text).width;
  };

  // Mistakes: black at 0, pink from the first mistake (as in the app), then the ring.
  label("Mistakes", left, "left");
  const mistakesW = value(`${r.mistakes}/${MAX_MISTAKES}`, left, "left", r.mistakes > 0 ? COLORS.pink : COLORS.ink);
  // Sized and centred on the number as in the app (ring ~1.07× the number's font size).
  const ringH = 68;
  const ringW = ringH * (ring.naturalWidth / ring.naturalHeight || 28 / 19.3);
  const capMiddle = valueY - 64 * 0.36;
  ctx.drawImage(ring, left + mistakesW + 10, capMiddle - ringH / 2, ringW, ringH);

  // The level in pink, the hints used under it.
  const level = r.difficulty[0].toUpperCase() + r.difficulty.slice(1);
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.pink;
  ctx.font = `500 44px ${FONT}`;
  ctx.fillText(level, W / 2, valueY - 18);
  ctx.fillStyle = COLORS.muted;
  ctx.font = `500 28px ${FONT}`;
  ctx.fillText(`${r.hints} ${r.hints === 1 ? "hint" : "hints"}`, W / 2, valueY + 22);

  // Score (time plus penalties) where the app shows Time.
  label("Score", right, "right");
  value(formatTime(r.score), right, "right", COLORS.ink);
}

/** Draws the result image and returns it as a PNG blob. */
export async function renderResultImage(board: Board, result: GameResult): Promise<Blob> {
  const digits = [...new Set(board.filter((v): v is number => v !== null))];
  const [title, ring, ...images] = await Promise.all([
    loadImage("/type/title.svg"),
    loadImage("/icons/Ring.svg"),
    ...digits.map((d) => loadImage(albumFor(d).coverLarge)),
    ...TATTOOS.map((t) => loadImage(`/tattoos/${t.name}.webp`)),
  ]);
  const covers = new Map(digits.map((d, i) => [d, images[i]]));
  const tattoos = images.slice(digits.length);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  drawTattoos(ctx, tattoos);

  // Right-aligned with the board, as in the app.
  const titleH = TITLE_W * (title.naturalHeight / title.naturalWidth || 85 / 226);
  ctx.drawImage(title, BOARD_X + BOARD - TITLE_W, TITLE_Y, TITLE_W, titleH);

  drawBoard(ctx, board, covers);
  drawMeta(ctx, result, ring);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't create the image"))), "image/png"),
  );
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Saves a rendered result image: the share sheet on phones (so it can go to Photos or a chat),
 * otherwise a download named grandoku-<date>.png.
 */
export async function saveResultImage(blob: Blob) {
  const file = new File([blob], `grandoku-${today()}.png`, { type: "image/png" });
  const touch = window.matchMedia("(pointer: coarse)").matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Ariana Grandoku" });
      return;
    } catch (e) {
      if ((e as Error).name === "AbortError") return; // closed the share sheet
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
