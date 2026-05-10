import { AbsoluteFill, Audio, useCurrentFrame, interpolate } from "remotion";
import { COLORS } from "../lib/theme";
import { Background } from "../components/Background";
import { AnimatedQuote } from "../components/AnimatedQuote";
import { Attribution } from "../components/Attribution";
import { GoldDivider } from "../components/GoldDivider";
import { Subtitles, type SubtitleGroup } from "../components/Subtitles";

export type ShortVerticalProps = {
  citation: {
    text: string;
    author: string;
    work?: string;
  };
  brand?: string;
  audioUrl?: string;
  subtitles?: SubtitleGroup[];
} & Record<string, unknown>;

export const ShortVertical: React.FC<ShortVerticalProps> = ({
  citation,
  brand = "Passion_Coran",
  audioUrl,
  subtitles,
}) => {
  const frame = useCurrentFrame();

  // Hook visuel : ornement qui pulse dans les 0.5s premières
  const hookScale = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const hookOpacity = interpolate(frame, [0, 8, 30], [0, 1, 0.7], {
    extrapolateRight: "clamp",
  });

  // Citation entre frame 10 et fin
  // Attribution apparaît vers la fin
  const totalFrames = 180; // 6 secondes à 30fps - sera étendu via duration prop

  // Estimer la taille de police selon la longueur
  const len = citation.text.length;
  const fontSize = len < 80 ? 90 : len < 140 ? 76 : len < 220 ? 64 : 54;

  return (
    <AbsoluteFill>
      <Background variant="navy" />
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
          fontStyle: "italic",
          color: COLORS.gold,
          fontSize: 36,
          opacity: 0.7,
        }}
      >
        {brand}
      </div>

      {/* Hook ornement central qui se transforme en divider */}
      <div
        style={{
          position: "absolute",
          top: 200,
          left: 0,
          right: 0,
          textAlign: "center",
          color: COLORS.gold,
          fontSize: 80,
          opacity: hookOpacity,
          transform: `scale(${hookScale})`,
          fontFamily: "serif",
        }}
      >
        ۞
      </div>

      {/* Quand des sous-titres sont fournis : la citation animée s'efface au profit
          des sous-titres mot-par-mot (TikTok-friendly, lisible muet).
          Sinon : on garde l'AnimatedQuote au centre. */}
      {subtitles && subtitles.length > 0 ? (
        <Subtitles groups={subtitles} fontSize={70} bottom={620} />
      ) : (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            paddingLeft: 80,
            paddingRight: 80,
            paddingTop: 100,
          }}
        >
          <AnimatedQuote
            text={citation.text}
            fontSize={fontSize}
            color={COLORS.parchment}
            delayFrames={10}
            maxWidth={900}
          />
        </AbsoluteFill>
      )}

      {/* Attribution + divider en bas */}
      <div
        style={{
          position: "absolute",
          bottom: 200,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
        }}
      >
        <GoldDivider width={300} opacity={0.5} />
        <Attribution
          author={citation.author}
          work={citation.work}
          appearAtFrame={Math.min(75, totalFrames - 60)}
          fontSize={42}
        />
      </div>

      {/* Watermark URL en bas */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "'Lato', sans-serif",
          color: COLORS.gold,
          fontSize: 24,
          opacity: 0.5,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
        }}
      >
        studio.iavance.fr
      </div>
    </AbsoluteFill>
  );
};
