import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../lib/theme";

export interface SubtitleGroup {
  start: number;
  end: number;
  text: string;
}

interface Props {
  groups: SubtitleGroup[];
  fontSize?: number;
  bottom?: number;
  paddingHorizontal?: number;
  textColor?: string;
  highlightColor?: string;
}

export const Subtitles: React.FC<Props> = ({
  groups,
  fontSize = 72,
  bottom = 480,
  paddingHorizontal = 80,
  textColor = COLORS.parchment,
  highlightColor = COLORS.gold,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const time = frame / fps;

  // Trouver le groupe actif
  const active = groups.find((g) => time >= g.start && time < g.end);
  if (!active) return null;

  // Animation d'apparition (premier 1/4 du groupe)
  const groupDuration = active.end - active.start;
  const elapsed = time - active.start;
  const fadePhase = Math.min(elapsed / Math.min(0.15, groupDuration / 4), 1);
  const opacity = interpolate(fadePhase, [0, 1], [0.0, 1.0]);
  const scale = interpolate(fadePhase, [0, 1], [0.92, 1]);

  return (
    <div
      style={{
        position: "absolute",
        bottom,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        paddingLeft: paddingHorizontal,
        paddingRight: paddingHorizontal,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          fontFamily: "'Lato', sans-serif",
          fontWeight: 700,
          fontSize,
          lineHeight: 1.2,
          color: textColor,
          textAlign: "center",
          textShadow:
            "0 6px 24px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.5)",
          maxWidth: width - paddingHorizontal * 2,
          textTransform: "uppercase",
          letterSpacing: "0.02em",
        }}
      >
        <span style={{ borderBottom: `4px solid ${highlightColor}`, paddingBottom: 6 }}>
          {active.text}
        </span>
      </div>
    </div>
  );
};
