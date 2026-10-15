export type Digit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface Album {
  digit: Digit;
  name: string;
  cover: string;
  /** 768px version for big uses: the win reveal (one cover per box) and the share image. */
  coverLarge: string;
  /** Vertically motion-blurred copy, used while win flaps rattle through covers. */
  coverBlur: string;
  color: string;
}

// Colors come from the updated album colors Figma frame (node 2406:1092).
export const albums: Album[] = [
  {
    digit: 1,
    name: "Yours Truly",
    cover: "/covers/1_Yours_Truly_Alt.webp",
    coverLarge: "/covers/large/1_Yours_Truly_Alt.webp",
    coverBlur: "/covers/blur/1_Yours_Truly_Alt.webp",
    color: "#d98e93",
  },
  {
    digit: 2,
    name: "My Everything",
    cover: "/covers/2_My_Everything_Alt.webp",
    coverLarge: "/covers/large/2_My_Everything_Alt.webp",
    coverBlur: "/covers/blur/2_My_Everything_Alt.webp",
    color: "#7a7fa7",
  },
  {
    digit: 3,
    name: "Dangerous Woman",
    cover: "/covers/3_Dangerous_Woman.webp",
    coverLarge: "/covers/large/3_Dangerous_Woman.webp",
    coverBlur: "/covers/blur/3_Dangerous_Woman.webp",
    color: "#979898",
  },
  {
    digit: 4,
    name: "Sweetener",
    cover: "/covers/4_Sweetener.webp",
    coverLarge: "/covers/large/4_Sweetener.webp",
    coverBlur: "/covers/blur/4_Sweetener.webp",
    color: "#f8d5b8",
  },
  {
    digit: 5,
    name: "thank u, next",
    cover: "/covers/5_Thank_U_Next.webp",
    coverLarge: "/covers/large/5_Thank_U_Next.webp",
    coverBlur: "/covers/blur/5_Thank_U_Next.webp",
    color: "#ae90a7",
  },
  {
    digit: 6,
    name: "Positions",
    cover: "/covers/6_Positions.webp",
    coverLarge: "/covers/large/6_Positions.webp",
    coverBlur: "/covers/blur/6_Positions.webp",
    color: "#99b0a6",
  },
  {
    digit: 7,
    name: "Eternal Sunshine",
    cover: "/covers/7_Eternal_Sunshine.webp",
    coverLarge: "/covers/large/7_Eternal_Sunshine.webp",
    coverBlur: "/covers/blur/7_Eternal_Sunshine.webp",
    color: "#46241e",
  },
  {
    digit: 8,
    name: "Brighter Days Ahead",
    cover: "/covers/8_BDA.webp",
    coverLarge: "/covers/large/8_BDA.webp",
    coverBlur: "/covers/blur/8_BDA.webp",
    color: "#538393",
  },
  {
    digit: 9,
    name: "Petal",
    cover: "/covers/9_Petal.webp",
    coverLarge: "/covers/large/9_Petal.webp",
    coverBlur: "/covers/blur/9_Petal.webp",
    color: "#101820",
  },
];

export const albumFor = (digit: number): Album => albums[digit - 1];

// Decode every cover once at startup and keep the images referenced, so a cover appearing
// for the first time on a phone is already decoded instead of flashing in.
const decodedCovers: HTMLImageElement[] = [];
for (const a of albums) {
  const img = new Image();
  img.src = a.cover;
  img.decode().catch(() => {});
  decodedCovers.push(img);
}
