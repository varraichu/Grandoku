import { Composition } from "remotion";
import { Demo, TAKES, type Format } from "./Demo";
import { totalSeconds, VARIANTS, type VariantName } from "./scenes";

const FPS = 30;
// Each video's length follows its cut and its own take (the takes differ by a few frames).
const frames = (format: Format, variant: VariantName) => Math.round(totalSeconds(VARIANTS[variant], TAKES[format].marks) * FPS);

const SIZES = { portrait: [1080, 1920], landscape: [1920, 1080] } as const;
const VIDEOS = [
  { id: "Vertical", format: "portrait", variant: "full" },
  { id: "Landscape", format: "landscape", variant: "full" },
  { id: "Vertical-Fast", format: "portrait", variant: "fast" },
  { id: "Landscape-Fast", format: "landscape", variant: "fast" },
] as const;

export const RemotionRoot = () => (
  <>
    {VIDEOS.map(({ id, format, variant }) => (
      <Composition
        key={id}
        id={id}
        component={Demo}
        defaultProps={{ format, variant }}
        width={SIZES[format][0]}
        height={SIZES[format][1]}
        fps={FPS}
        durationInFrames={frames(format, variant)}
      />
    ))}
  </>
);
