import { Composition } from "remotion";
import { Demo } from "./Demo";
import { totalSeconds } from "./scenes";

const FPS = 30;
const DURATION = Math.round(totalSeconds() * FPS);

export const RemotionRoot = () => (
  <>
    <Composition id="Vertical" component={Demo} defaultProps={{ format: "portrait" as const }} width={1080} height={1920} fps={FPS} durationInFrames={DURATION} />
    <Composition id="Landscape" component={Demo} defaultProps={{ format: "landscape" as const }} width={1920} height={1080} fps={FPS} durationInFrames={DURATION} />
  </>
);
