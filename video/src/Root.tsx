import { Composition } from "remotion";
import { Reel } from "./Reel";
import { DURATION, FPS } from "./tokens";

export function Root() {
  return (
    <Composition
      id="Reel"
      component={Reel}
      width={1920}
      height={1080}
      fps={FPS}
      durationInFrames={DURATION}
    />
  );
}
