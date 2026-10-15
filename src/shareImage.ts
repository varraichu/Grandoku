// The shareable result: a 1080×1350 PNG drawn straight onto a canvas (never a DOM screenshot), so
// it looks the same on every device. Every image is same-origin, so the canvas can be exported.
import { albumFor } from "./albums";
import { formatTime } from "./components/Header";
import type { GameResult } from "./store";
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
const BOARD = 820; // board square
const BOARD_X = (W - BOARD) / 2;
const BOARD_Y = 250;
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

function drawStats(ctx: CanvasRenderingContext2D, r: GameResult) {
  const cx = W / 2;
  const top = BOARD_Y + BOARD + 70;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = COLORS.muted;
  ctx.font = `500 30px ${FONT}`;
  ctx.fillText("Score", cx, top);

  ctx.fillStyle = COLORS.pink;
  ctx.font = `700 92px ${FONT}`;
  ctx.fillText(formatTime(r.score), cx, top + 90);

  const level = r.difficulty[0].toUpperCase() + r.difficulty.slice(1);
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  ctx.fillStyle = COLORS.ink;
  ctx.font = `500 32px ${FONT}`;
  ctx.fillText(
    `${level}  ·  ${formatTime(r.time)}  ·  ${plural(r.mistakes, "mistake")}  ·  ${plural(r.hints, "hint")}`,
    cx,
    top + 150,
  );
}

/** Draws the result image and returns it as a PNG blob. */
export async function renderResultImage(board: Board, result: GameResult): Promise<Blob> {
  const digits = [...new Set(board.filter((v): v is number => v !== null))];
  const [title, ...coverImgs] = await Promise.all([
    loadImage("/type/title.svg"),
    ...digits.map((d) => loadImage(albumFor(d).coverLarge)),
  ]);
  const covers = new Map(digits.map((d, i) => [d, coverImgs[i]]));

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  const titleH = TITLE_W * (title.naturalHeight / title.naturalWidth || 85 / 226);
  ctx.drawImage(title, (W - TITLE_W) / 2, TITLE_Y, TITLE_W, titleH);

  drawBoard(ctx, board, covers);
  drawStats(ctx, result);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't create the image"))), "image/png"),
  );
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Saves the result image: the share sheet on phones (so it can go to Photos or a chat),
 * otherwise a download named grandoku-<date>.png.
 */
export async function saveResultImage(board: Board, result: GameResult) {
  const blob = await renderResultImage(board, result);
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
