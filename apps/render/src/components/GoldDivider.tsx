import { COLORS } from "../lib/theme";

export const GoldDivider: React.FC<{ width?: number; opacity?: number }> = ({
  width = 200,
  opacity = 0.6,
}) => (
  <div
    style={{
      width,
      height: 1,
      background: `linear-gradient(90deg, transparent, ${COLORS.gold}${Math.round(
        opacity * 255,
      )
        .toString(16)
        .padStart(2, "0")}, transparent)`,
      margin: "0 auto",
    }}
  />
);
