import { Composition } from "remotion";
import { Demo, TAKES } from "./Demo";
import { totalSeconds } from "./scenes";

const FPS = 30;
// Each version's length follows its own take (they differ by a few frames).
const frames = (format: keyof typeof TAKES) => Math.round(totalSeconds(TAKES[format].marks) * FPS);

export const RemotionRoot = () => (
  <>
    <Composition id="Vertical" component={Demo} defaultProps={{ format: "portrait" as const }} width={1080} height={1920} fps={FPS} durationInFrames={frames("portrait")} />
    <Composition id="Landscape" component={Demo} defaultProps={{ format: "landscape" as const }} width={1920} height={1080} fps={FPS} durationInFrames={frames("landscape")} />
  </>
);
