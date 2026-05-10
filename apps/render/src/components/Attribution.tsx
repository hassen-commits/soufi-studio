import { useCurrentFrame, interpolate } from "remotion";
import { COLORS } from "../lib/theme";

interface Props {
  author: string;
  work?: string;
  appearAtFrame?: number;
  fontSize?: number;
  color?: string;
}

export const Attribution: React.FC<Props> = ({
  author,
  work,
  appearAtFrame = 60,
  fontSize = 32,
  color = COLORS.gold,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [appearAtFrame, appearAtFrame + 24],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <div
      style={{
        opacity,
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontStyle: "italic",
        fontSize,
        color,
        textAlign: "center",
      }}
    >
      <div>— {author}</div>
      {work ? (
        <div
          style={{
            fontSize: fontSize * 0.55,
            color: COLORS.parchment,
            opacity: 0.75,
            marginTop: 6,
            fontStyle: "normal",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          {work}
        </div>
      ) : null}
    </div>
  );
};
