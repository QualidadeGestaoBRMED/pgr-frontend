import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

export const AuraHoverVideo: React.FC = () => {
  const frame = useCurrentFrame();

  const appear = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: "clamp",
  });

  const lift = interpolate(frame, [0, 18], [14, 0], {
    extrapolateRight: "clamp",
  });

  const cursorProgress = interpolate(frame, [30, 80], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const hoverMix = interpolate(frame, [85, 110], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cursorX = interpolate(cursorProgress, [0, 1], [300, 1010]);
  const cursorY = interpolate(cursorProgress, [0, 1], [640, 170]);

  const baseSrc = staticFile("home.png");
  const hoverSrc = staticFile("home-hover.png");

  return (
    <AbsoluteFill style={{ backgroundColor: "#e9eef1" }}>
      <AbsoluteFill
        style={{
          opacity: appear,
          transform: `translateY(${lift}px)`,
        }}
      >
        <Img
          src={baseSrc}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <Img
          src={hoverSrc}
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
