import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../lib/theme";

interface BackgroundProps {
  variant?: "navy" | "parchment";
}

export const Background: React.FC<BackgroundProps> = ({ variant = "navy" }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const drift = interpolate(frame, [0, 600], [0, 80], { extrapolateRight: "extend" });
  const breathe = interpolate(frame % 240, [0, 120, 240], [0.92, 1, 0.92]);

  const isNavy = variant === "navy";
  const baseColor = isNavy ? COLORS.navy : COLORS.parchment;
  const glowColor = isNavy ? "rgba(201, 169, 110, 0.18)" : "rgba(26, 26, 46, 0.06)";

  return (
    <AbsoluteFill style={{ backgroundColor: baseColor, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at ${50 + drift / 4}% ${
            50 - drift / 6
          }%, ${glowColor} 0%, transparent 70%)`,
          opacity: breathe,
        }}
      />
      <Ornament
        x={width * 0.08}
        y={height * 0.06}
        size={isNavy ? 64 : 56}
        color={COLORS.gold}
        opacity={0.18}
      />
      <Ornament
        x={width * 0.92}
        y={height * 0.94}
        size={isNavy ? 64 : 56}
        color={COLORS.gold}
        opacity={0.18}
      />
    </AbsoluteFill>
  );
};

const Ornament: React.FC<{
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
}> = ({ x, y, size, color, opacity }) => (
  <div
    style={{
      position: "absolute",
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size,
      color,
      fontSize: size * 0.6,
      lineHeight: 1,
      opacity,
      fontFamily: "serif",
    }}
  >
    ۞
  </div>
);
