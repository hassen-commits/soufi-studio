import { Composition } from "remotion";
import { z } from "zod";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { ShortVertical, type ShortVerticalProps } from "./compositions/ShortVertical";
import { PodcastLong, type PodcastLongProps } from "./compositions/PodcastLong";
import { FPS, SHORT_DIMENSIONS, LONG_DIMENSIONS } from "./lib/theme";
import { loadFont as loadCormorant } from "@remotion/google-fonts/CormorantGaramond";
import { loadFont as loadLato } from "@remotion/google-fonts/Lato";

loadCormorant();
loadLato();

const shortSchema = z.object({
  citation: z.object({
    text: z.string(),
    author: z.string(),
    work: z.string().optional(),
  }),
  brand: z.string().optional(),
  audioUrl: z.string().optional(),
  subtitles: z
    .array(
      z.object({
        start: z.number(),
        end: z.number(),
        text: z.string(),
      }),
    )
    .optional(),
});

const longSchema = z.object({
  title: z.string(),
  author: z.string().optional(),
  brand: z.string().optional(),
  themeFr: z.string().optional(),
  audioUrl: z.string().optional(),
});

// Si audioUrl fourni → durée vidéo = durée audio (avec petit fade out)
// Sinon → durée par défaut
async function durationFromAudio(
  audioUrl: string | undefined,
  defaultSeconds: number,
): Promise<number> {
  if (!audioUrl) return defaultSeconds * FPS;
  try {
    const sec = await getAudioDurationInSeconds(audioUrl);
    return Math.ceil((sec + 0.5) * FPS);
  } catch {
    return defaultSeconds * FPS;
  }
}

export const Root: React.FC = () => {
  return (
    <>
      <Composition<typeof shortSchema, ShortVerticalProps>
        id="ShortVertical"
        component={ShortVertical}
        schema={shortSchema}
        durationInFrames={FPS * 12}
        fps={FPS}
        width={SHORT_DIMENSIONS.width}
        height={SHORT_DIMENSIONS.height}
        defaultProps={{
          citation: {
            text: "Le silence est la langue de Dieu, tout le reste est une mauvaise traduction.",
            author: "Rûmî",
            work: "Mathnawî",
          },
          brand: "Passion_Coran",
        }}
        calculateMetadata={async ({ props }) => ({
          durationInFrames: await durationFromAudio(props.audioUrl, 12),
        })}
      />

      <Composition<typeof longSchema, PodcastLongProps>
        id="PodcastLong"
        component={PodcastLong}
        schema={longSchema}
        durationInFrames={FPS * 10}
        fps={FPS}
        width={LONG_DIMENSIONS.width}
        height={LONG_DIMENSIONS.height}
        defaultProps={{
          title: "Le Voyage Intérieur",
          author: "Rûmî",
          brand: "Passion_Coran",
          themeFr: "L'âme et la lampe du cœur",
        }}
        calculateMetadata={async ({ props }) => ({
          durationInFrames: await durationFromAudio(props.audioUrl, 10),
        })}
      />
    </>
  );
};
