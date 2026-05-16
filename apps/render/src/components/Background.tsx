import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, random } from "remotion";
import { COLORS } from "../lib/theme";

interface BackgroundProps {
  variant?: "navy" | "parchment" | "cosmos";
}

export const Background: React.FC<BackgroundProps> = ({ variant = "navy" }) => {
  if (variant === "cosmos") return <CosmosBackground />;
  return <FlatBackground variant={variant} />;
};

// ───────────────────────────────────────────────────────────────
// COSMOS — nébuleuse navy/violet + étoiles scintillantes + particules or
// Inspiration : Coran 24:35 « Lumière sur Lumière »
// ───────────────────────────────────────────────────────────────

const STAR_COUNT = 70;
const PARTICLE_COUNT = 8;

const CosmosBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  // Respiration douce de la nébuleuse
  const breathe = 0.85 + Math.sin(frame / fps / 4) * 0.15;

  return (
    <AbsoluteFill style={{ backgroundColor: "#06061a", overflow: "hidden" }}>
      {/* Nébuleuse discrète : un seul gradient subtil, faible saturation */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(ellipse 70% 60% at 50% 40%, rgba(70, 55, 110, 0.22) 0%, transparent 70%),
            linear-gradient(180deg, #08081e 0%, #15152a 50%, #08081e 100%)
          `,
          opacity: breathe,
        }}
      />

      {/* Glow doré central très léger derrière le titre */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 30% 22% at 50% 50%, rgba(201, 169, 110, 0.10) 0%, transparent 70%)",
          opacity: breathe,
        }}
      />

      {/* Étoiles scintillantes (fond) */}
      {Array.from({ length: STAR_COUNT }).map((_, i) => (
        <Star key={`s-${i}`} index={i} frame={frame} fps={fps} width={width} height={height} />
      ))}

      {/* Particules dorées flottantes (montée lente) */}
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <Particle
          key={`p-${i}`}
          index={i}
          frame={frame}
          fps={fps}
          width={width}
          height={height}
        />
      ))}

      {/* Vignette : assombrit les bords pour faire ressortir le titre central */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* Ornements aux coins */}
      <Ornament x={width * 0.06} y={height * 0.07} size={56} opacity={0.25} />
      <Ornament x={width * 0.94} y={height * 0.93} size={56} opacity={0.25} />
    </AbsoluteFill>
  );
};

const Star: React.FC<{
  index: number;
  frame: number;
  fps: number;
  width: number;
  height: number;
}> = ({ index, frame, fps, width, height }) => {
  const x = random(`x-${index}`) * width;
  const y = random(`y-${index}`) * height;
  const baseSize = random(`size-${index}`);
  const size = 1 + baseSize * baseSize * 4; // distribution biaisée vers les petites
  const baseOpacity = 0.25 + random(`op-${index}`) * 0.45;
  const speed = 0.4 + random(`sp-${index}`) * 1.8;
  const phase = random(`ph-${index}`) * Math.PI * 2;

  const twinkle = 0.55 + Math.sin((frame / fps) * speed + phase) * 0.45;
  const opacity = baseOpacity * twinkle;
  const isBright = size > 3;

  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: isBright ? "#fff8e7" : "#ffffff",
        opacity,
        boxShadow: isBright
          ? `0 0 ${size * 5}px rgba(255, 240, 200, 0.9), 0 0 ${size * 10}px rgba(201, 169, 110, 0.4)`
          : size > 2
            ? `0 0 ${size * 3}px rgba(255, 255, 255, 0.6)`
            : "none",
      }}
    />
  );
};

const Particle: React.FC<{
  index: number;
  frame: number;
  fps: number;
  width: number;
  height: number;
}> = ({ index, frame, fps, width, height }) => {
  const x = random(`px-${index}`) * width;
  const size = 2 + random(`psize-${index}`) * 4;
  // Cycle complet : ~25s pour traverser l'écran de bas en haut
  const cycleFrames = fps * (20 + random(`pspeed-${index}`) * 15);
  const offset = random(`poff-${index}`) * cycleFrames;
  const t = ((frame + offset) % cycleFrames) / cycleFrames; // 0..1
  const y = height + 50 - t * (height + 100);
  // Drift latéral léger
  const drift = Math.sin(t * Math.PI * 2 + index) * 30;
  // Fade in/out aux extrémités
  const fade = interpolate(t, [0, 0.1, 0.85, 1], [0, 1, 1, 0]);

  return (
    <div
      style={{
        position: "absolute",
        left: x + drift - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: COLORS.gold,
        opacity: 0.55 * fade,
        boxShadow: `0 0 ${size * 4}px ${COLORS.gold}`,
      }}
    />
  );
};

// ───────────────────────────────────────────────────────────────
// FLAT — ancien fond navy / parchment (utilisé par ShortVertical)
// ───────────────────────────────────────────────────────────────

const FlatBackground: React.FC<{ variant: "navy" | "parchment" }> = ({ variant }) => {
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
      <Ornament x={width * 0.08} y={height * 0.06} size={isNavy ? 64 : 56} opacity={0.18} />
      <Ornament x={width * 0.92} y={height * 0.94} size={isNavy ? 64 : 56} opacity={0.18} />
    </AbsoluteFill>
  );
};

const Ornament: React.FC<{ x: number; y: number; size: number; opacity: number }> = ({
  x,
  y,
  size,
  opacity,
}) => (
  <div
    style={{
      position: "absolute",
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size,
      color: COLORS.gold,
      fontSize: size * 0.6,
      lineHeight: 1,
      opacity,
      fontFamily: "serif",
    }}
  >
    ۞
  </div>
);
