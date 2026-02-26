import { Composition } from "remotion";
import { AuraHoverVideo } from "./scenes/aura-hover";
import { LoginToAuraVideo } from "./scenes/login-to-aura";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="AuraHover"
        component={AuraHoverVideo}
        durationInFrames={210}
        fps={30}
        width={1400}
        height={900}
      />
      <Composition
        id="LoginToAura"
        component={LoginToAuraVideo}
        durationInFrames={300}
        fps={30}
        width={1400}
        height={900}
      />
    </>
  );
};
