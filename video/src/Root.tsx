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
  { id: "V2-Vertical", format: "portrait", variant: "v2" },
  { id: "V2-Landscape", format: "landscape", variant: "v2" },
  { id: "V2-Vertical-Fast", format: "portrait", variant: "v2-fast" },
  { id: "V2-Landscape-Fast", format: "landscape", variant: "v2-fast" },
  { id: "V3-Vertical", format: "portrait", variant: "v3" },
  { id: "V3-Landscape", format: "landscape", variant: "v3" },
  // Style tests (vertical only).
  { id: "Test-1a-CardPlain", format: "portrait", variant: "test-cardPlain" },
  { id: "Test-1b-CardShrink", format: "portrait", variant: "test-cardShrink" },
  { id: "Test-2-Freeze", format: "portrait", variant: "test-freeze" },
  { id: "Test-3-Label", format: "portrait", variant: "test-label" },
  { id: "Test-4-Magnifier", format: "portrait", variant: "test-magnifier" },
  { id: "Test-5-SpeedRamp", format: "portrait", variant: "test-speedRamp" },
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
