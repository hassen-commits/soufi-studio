import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../lib/theme";
import { Background } from "../components/Background";
import { GoldDivider } from "../components/GoldDivider";

export type PodcastLongProps = {
  title: string;
  author?: string;
  brand?: string;
  themeFr?: string;
  audioUrl?: string;
} & Record<string, unknown>;

export const PodcastLong: React.FC<PodcastLongProps> = ({
  title,
  author,
  brand = "Passion_Coran",
  themeFr,
  audioUrl,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const subtitleOpacity = interpolate(frame, [25, 55], [0, 1], { extrapolateRight: "clamp" });

  // Waveform animée (12 barres)
  const barCount = 24;
  const barWidth = 8;
  const barGap = 12;
  const totalWaveformWidth = barCount * (barWidth + barGap);
  const waveformLeft = (width - totalWaveformWidth) / 2;

  return (
    <AbsoluteFill>
      <Background variant="cosmos" />
      {audioUrl ? <Audio src={audioUrl} /> : null}

      {/* Brand en haut */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "'Cormorant Garamond', serif",
          color: COLORS.gold,
          fontSize: 32,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          opacity: 0.7,
        }}
      >
        {brand}
      </div>

      {/* Bloc central : titre + auteur */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: 120,
          paddingRight: 120,
        }}
      >
        <h1
          style={{
            opacity: titleOpacity,
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontStyle: "italic",
            fontSize: 110,
            color: COLORS.parchment,
            textAlign: "center",
            margin: 0,
            lineHeight: 1.15,
            maxWidth: 1500,
            fontWeight: 400,
          }}
        >
          {title}
        </h1>

        {themeFr ? (
          <>
            <div style={{ height: 40 }} />
            <GoldDivider width={300} opacity={0.5} />
            <div style={{ height: 30 }} />
            <div
              style={{
                opacity: subtitleOpacity,
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: "italic",
                color: COLORS.gold,
                fontSize: 44,
              }}
            >
              {themeFr}
            </div>
          </>
        ) : null}

        {author ? (
          <div
            style={{
              opacity: subtitleOpacity,
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: "italic",
              color: COLORS.goldLight,
              fontSize: 38,
              marginTop: 30,
            }}
          >
            d'après {author}
          </div>
        ) : null}
      </AbsoluteFill>

      {/* Waveform animée en bas */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: waveformLeft,
          width: totalWaveformWidth,
          height: 80,
          display: "flex",
          alignItems: "center",
          gap: barGap,
        }}
      >
        {Array.from({ length: barCount }).map((_, i) => {
          const phase = (i / barCount) * Math.PI * 2;
          const t = (frame / fps) * 1.6 + phase;
          const h = 12 + Math.abs(Math.sin(t) * 50) + (i % 4 === 0 ? 8 : 0);
          return (
            <div
              key={i}
              style={{
                width: barWidth,
                height: h,
                backgroundColor: COLORS.gold,
                opacity: 0.55,
                borderRadius: 4,
              }}
            />
          );
        })}
      </div>

      {/* URL en bas */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "'Lato', sans-serif",
          color: COLORS.gold,
          fontSize: 20,
          opacity: 0.4,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
        }}
      >
        studio.iavance.fr
      </div>
    </AbsoluteFill>
  );
};
