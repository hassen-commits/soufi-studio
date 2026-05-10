import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS } from "../lib/theme";

interface Props {
  text: string;
  fontSize: number;
  color?: string;
  delayFrames?: number;
  maxWidth?: number;
}

export const AnimatedQuote: React.FC<Props> = ({
  text,
  fontSize,
  color = COLORS.parchment,
  delayFrames = 10,
  maxWidth,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(/\s+/);

  return (
    <div
      style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontStyle: "italic",
        fontSize,
        lineHeight: 1.45,
        color,
        textAlign: "center",
        maxWidth: maxWidth ?? "90%",
        margin: "0 auto",
      }}
    >
      <span style={{ color: COLORS.gold, opacity: 0.7, fontSize: fontSize * 0.9 }}>
        «{" "}
      </span>
      {words.map((word, i) => {
        const startFrame = delayFrames + i * 3;
        const opacity = interpolate(frame, [startFrame, startFrame + 8], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const translateY = spring({
          frame: frame - startFrame,
          fps,
          config: { damping: 14, stiffness: 90, mass: 0.6 },
          durationInFrames: 20,
        });
        return (
          <span
            key={`${word}-${i}`}
            style={{
              display: "inline-block",
              opacity,
              transform: `translateY(${(1 - translateY) * 18}px)`,
              marginRight: "0.28em",
            }}
          >
            {word}
          </span>
        );
      })}
      <span style={{ color: COLORS.gold, opacity: 0.7, fontSize: fontSize * 0.9 }}>
        {" "}»
      </span>
    </div>
  );
};
