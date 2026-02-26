import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import layout from "../data/layout.json";

type Box = { x: number; y: number; width: number; height: number };

type Layout = {
  login?: {
    username?: Box;
    password?: Box;
    button?: Box;
  };
  home?: {
    aura?: Box;
  };
};

const fallbackLayout: Layout = {
  login: {
    username: { x: 140, y: 390, width: 520, height: 44 },
    password: { x: 140, y: 500, width: 520, height: 44 },
    button: { x: 140, y: 600, width: 520, height: 46 },
  },
  home: {
    aura: { x: 990, y: 150, width: 140, height: 36 },
  },
};

const getBox = (value?: Box, fallback?: Box) => value ?? fallback ?? { x: 0, y: 0, width: 0, height: 0 };

const typeText = (text: string, progress: number) => {
  const count = Math.max(0, Math.min(text.length, Math.round(text.length * progress)));
  return text.slice(0, count);
};

export const LoginToAuraVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const data = (layout as Layout) ?? fallbackLayout;
  const usernameBox = getBox(data.login?.username, fallbackLayout.login?.username);
  const passwordBox = getBox(data.login?.password, fallbackLayout.login?.password);
  const buttonBox = getBox(data.login?.button, fallbackLayout.login?.button);
  const auraBox = getBox(data.home?.aura, fallbackLayout.home?.aura);

  const appear = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  const usernameProgress = interpolate(frame, [30, 85], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const passwordProgress = interpolate(frame, [95, 145], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const clickPulse = spring({
    fps,
    frame: frame - 155,
    config: { damping: 14, mass: 0.8, stiffness: 120 },
  });

  const toHomeMix = interpolate(frame, [175, 205], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const hoverMix = interpolate(frame, [215, 245], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cursorTravel = interpolate(frame, [210, 245], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cursorStartX = buttonBox.x + buttonBox.width * 0.82;
  const cursorStartY = buttonBox.y + buttonBox.height * 0.5;
  const cursorEndX = auraBox.x + auraBox.width * 0.7;
  const cursorEndY = auraBox.y + auraBox.height * 0.65;

  const cursorX = interpolate(cursorTravel, [0, 1], [cursorStartX, cursorEndX]);
  const cursorY = interpolate(cursorTravel, [0, 1], [cursorStartY, cursorEndY]);

  const usernameText = typeText("admin", usernameProgress);
  const passwordText = "•".repeat(typeText("admin", passwordProgress).length);

  const caretVisible = frame % 24 < 12;
  const caretOpacity = caretVisible ? 1 : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "#e9eef1" }}>
      <AbsoluteFill style={{ opacity: appear }}>
        <Img
          src={staticFile("login.png")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />

        <div
          style={{
            position: "absolute",
            left: usernameBox.x + 44,
            top: usernameBox.y + usernameBox.height / 2 - 8,
            fontSize: 14,
            color: "#193B4F",
            fontWeight: 500,
          }}
        >
          {usernameText}
          {usernameProgress < 1 && (
            <span style={{ opacity: caretOpacity }}>│</span>
          )}
        </div>

        <div
          style={{
            position: "absolute",
            left: passwordBox.x + 44,
            top: passwordBox.y + passwordBox.height / 2 - 8,
            fontSize: 14,
            color: "#193B4F",
            fontWeight: 500,
          }}
        >
          {passwordText}
          {passwordProgress < 1 && (
            <span style={{ opacity: caretOpacity }}>│</span>
          )}
        </div>

        <div
          style={{
            position: "absolute",
            left: buttonBox.x,
            top: buttonBox.y,
            width: buttonBox.width,
            height: buttonBox.height,
            borderRadius: 10,
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            opacity: 0.2 + clickPulse * 0.4,
            transform: `scale(${1 + clickPulse * 0.02})`,
            background: "rgba(0, 120, 145, 0.4)",
          }}
        />
      </AbsoluteFill>

      <AbsoluteFill style={{ opacity: toHomeMix }}>
        <Img
          src={staticFile("home.png")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <Img
          src={staticFile("home-hover.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            position: "absolute",
            inset: 0,
            opacity: hoverMix,
          }}
        />
      </AbsoluteFill>

      <div
        style={{
          position: "absolute",
          left: cursorX,
          top: cursorY,
          width: 20,
          height: 20,
          borderRadius: 999,
          backgroundColor: "white",
          boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
          border: "1px solid rgba(0,0,0,0.1)",
          transform: "translate(-50%, -50%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: cursorX + 8,
          top: cursorY + 10,
          width: 0,
          height: 0,
          borderLeft: "10px solid white",
          borderTop: "10px solid transparent",
          borderBottom: "10px solid transparent",
          filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.25))",
          transform: "rotate(-10deg)",
        }}
      />
    </AbsoluteFill>
  );
};
